"""
Project CRUD endpoints.
All routes require authentication via Supabase JWT.
"""
import os
import uuid
import logging
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from typing import Optional
from app.api.auth import get_current_user, get_supabase_client
from app.services.rag import RAGService
from app.services.event_dispatcher import EventDispatcher

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.post("")
async def create_project(
    title: str = Form(...),
    type: str = Form("presentation"),  # 'presentation' or 'ebook'
    language: str = Form("pt-BR"),
    audience: str = Form(""),
    tone: str = Form("profissional"),
    objectives: str = Form(""),  # comma-separated
    template_id: str = Form("template_infoproduct_dark"),
    use_images: str = Form("true"),
    file: Optional[UploadFile] = File(None),
    user: dict = Depends(get_current_user),
):
    """
    Creates a new project, optionally ingests an uploaded file into RAG,
    and returns the project record.
    """
    supabase = get_supabase_client()
    user_id = user["id"]

    # 1. Check credits
    profile_resp = supabase.table("user_profiles").select("credits").eq("id", user_id).single().execute()
    credits = profile_resp.data.get("credits", 0) if profile_resp.data else 0
    if credits <= 0:
        raise HTTPException(status_code=402, detail="Créditos insuficientes.")

    # 2. Create the project record
    project_data = {
        "user_id": user_id,
        "title": title,
        "type": type,
        "language": language,
        "status": "draft",
    }
    project_resp = supabase.table("projects").insert(project_data).execute()
    project = project_resp.data[0]
    project_id = project["id"]

    # 3. If a file was uploaded, ingest it into RAG
    if file and file.filename:
        logger.info(f"Ingerindo arquivo '{file.filename}' para projeto {project_id}")
        
        # Save file temporarily
        ext = os.path.splitext(file.filename)[1]
        temp_dir = os.path.join(os.getcwd(), "tmp")
        os.makedirs(temp_dir, exist_ok=True)
        temp_path = os.path.join(temp_dir, f"{uuid.uuid4()}{ext}")
        
        content = await file.read()
        with open(temp_path, "wb") as f:
            f.write(content)
        
        # Upload to Supabase Storage
        storage_path = f"{user_id}/{project_id}/{file.filename}"
        supabase.storage.from_("uploads").upload(storage_path, content)
        file_url = f"{supabase.supabase_url}/storage/v1/object/uploads/{storage_path}"

        # Create document record
        doc_resp = supabase.table("documents").insert({
            "project_id": project_id,
            "file_name": file.filename,
            "file_url": file_url,
        }).execute()
        document_id = doc_resp.data[0]["id"]

        # Ingest into RAG (parse → chunk → embed → store)
        try:
            rag = RAGService()
            await rag.ingest_file(temp_path, project_id, document_id)
            await EventDispatcher.dispatch(
                category="storage",
                severity="info",
                event_type="document_uploaded",
                message=f"Arquivo '{file.filename}' processado com sucesso no projeto {project_id}.",
                user_id=user_id
            )
        except Exception as e:
            logger.error(f"RAG ingestion failed: {e}")
            await EventDispatcher.dispatch(
                category="ai",
                severity="warning",
                event_type="rag_ingestion_failed",
                message=f"Falha ao processar arquivo '{file.filename}' no RAG. Projeto: {project_id}. Erro: {str(e)}",
                user_id=user_id
            )
            # Don't fail the project creation — just log it
        finally:
            # Clean up temp file
            if os.path.exists(temp_path):
                os.remove(temp_path)

    # 4. Store briefing data in a generation record
    objectives_list = [o.strip() for o in objectives.split(",") if o.strip()]
    briefing_data = {
        "title": title,
        "audience": audience,
        "tone": tone,
        "objectives": objectives_list,
        "template_id": template_id,
        "use_images": use_images.lower() == "true",
    }
    supabase.table("generations").insert({
        "project_id": project_id,
        "briefing_data": briefing_data,
    }).execute()

    return {"project": project, "message": "Projeto criado com sucesso."}


@router.get("")
async def list_projects(user: dict = Depends(get_current_user)):
    """List all projects for the authenticated user."""
    supabase = get_supabase_client()
    resp = supabase.table("projects") \
        .select("id, title, type, status, language, created_at") \
        .eq("user_id", user["id"]) \
        .order("created_at", desc=True) \
        .execute()
    return {"projects": resp.data}


@router.get("/{project_id}")
async def get_project(project_id: str, user: dict = Depends(get_current_user)):
    """Get project details and its latest generation data."""
    if project_id == "undefined" or len(project_id) < 10:
        raise HTTPException(status_code=400, detail="project_id inválido")
        
    supabase = get_supabase_client()
    
    # Verify ownership
    project_resp = supabase.table("projects") \
        .select("*") \
        .eq("id", project_id) \
        .eq("user_id", user["id"]) \
        .single() \
        .execute()
    
    if not project_resp.data:
        raise HTTPException(status_code=404, detail="Projeto não encontrado.")
    
    # Get generation data
    gen_resp = supabase.table("generations") \
        .select("*") \
        .eq("project_id", project_id) \
        .order("created_at", desc=True) \
        .limit(1) \
        .execute()
    generation = gen_resp.data[0] if gen_resp.data else None

    return {"project": project_resp.data, "generation": generation}


@router.delete("/{project_id}")
async def delete_project(project_id: str, user: dict = Depends(get_current_user)):
    """Delete a project and its associated data."""
    if project_id == "undefined" or len(project_id) < 10:
        raise HTTPException(status_code=400, detail="project_id inválido")
        
    supabase = get_supabase_client()
    
    # Verify ownership
    project_resp = supabase.table("projects") \
        .select("id") \
        .eq("id", project_id) \
        .eq("user_id", user["id"]) \
        .single() \
        .execute()
    
    if not project_resp.data:
        raise HTTPException(status_code=404, detail="Projeto não encontrado ou acesso negado.")
    
    # Delete the project (Supabase cascades to generations/documents if foreign keys are set up, 
    # but to be safe we just delete the project and rely on cascade or cleanup jobs)
    resp = supabase.table("projects").delete().eq("id", project_id).execute()
    
    return {"message": "Projeto deletado com sucesso."}


