"""
Approval + Render + Download endpoints.
Handles the final leg of the pipeline: approve draft → render PDF → store → download.
"""
import os
import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.api.auth import get_current_user, get_supabase_client
from app.models.domain import PresentationDraft, BrandKitModel
from app.templates.engine import TemplateEngine
from app.services.pdf.facade import PDFService
from app.services.storage import StorageService
from app.services.event_dispatcher import EventDispatcher

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/projects", tags=["render"])


class ApproveRequest(BaseModel):
    project_id: str


async def _approve_and_render_impl(project_id: str, user: dict):
    """
    Shared implementation for approval + render.
    Keeps backward compatibility across router paths.
    """
    supabase = get_supabase_client()
    user_id = user["id"]

    # 1. Verify project ownership
    project_resp = supabase.table("projects") \
        .select("id, status, brand_kit_id") \
        .eq("id", project_id) \
        .eq("user_id", user_id) \
        .single() \
        .execute()

    if not project_resp.data:
        raise HTTPException(status_code=404, detail="Projeto não encontrado.")

    project = project_resp.data
    if project["status"] != "pending_approval":
        raise HTTPException(
            status_code=400,
            detail=f"Projeto não está aguardando aprovação (status: {project['status']}).",
        )

    # 2. Get the latest generation draft
    gen_resp = supabase.table("generations") \
        .select("id, draft_outline") \
        .eq("project_id", project_id) \
        .order("created_at", desc=True) \
        .limit(1) \
        .execute()

    if not gen_resp.data or not gen_resp.data[0].get("draft_outline"):
        raise HTTPException(status_code=400, detail="Rascunho não encontrado.")

    generation = gen_resp.data[0]
    draft = PresentationDraft(**generation["draft_outline"])

    # 3. Get brand kit (or defaults)
    brand = BrandKitModel(name="Default")
    if project.get("brand_kit_id"):
        brand_resp = supabase.table("brand_kits") \
            .select("name, primary_color, secondary_color, font_family") \
            .eq("id", project["brand_kit_id"]) \
            .single() \
            .execute()
        if brand_resp.data:
            brand = BrandKitModel(**brand_resp.data)

    # 4. Render HTML via TemplateEngine
    logger.info(f"Renderizando HTML para projeto {project_id}")
    html_content = TemplateEngine.render_presentation(draft, brand)

    # 5. Generate PDF via Engine Híbrida
    logger.info("Gerando PDF via Engine Híbrida...")
    try:
        pdf_path = await PDFService.generate_pdf(html_content, template_id="template_infoproduct_dark")
    except Exception as e:
        logger.error(f"Render Engine failed: {e}")
        supabase.table("projects").update({"status": "failed"}).eq("id", project_id).execute()
        await EventDispatcher.dispatch(
            category="ai",
            severity="critical",
            event_type="pdf_render_failed",
            message=f"Falha na renderização via Playwright para o projeto {project_id}. Erro: {str(e)}",
            user_id=user_id
        )
        raise HTTPException(status_code=500, detail=f"Erro na renderização: {str(e)}")

    # 6. Upload PDF to Supabase Storage
    try:
        public_url = await StorageService.upload_pdf(pdf_path, project_id)
        await EventDispatcher.dispatch(
            category="storage",
            severity="info",
            event_type="pdf_uploaded",
            message=f"PDF gerado com sucesso e salvo em {public_url}.",
            user_id=user_id
        )
    except Exception as e:
        logger.error(f"Storage upload failed: {e}")
        await EventDispatcher.dispatch(
            category="storage",
            severity="critical",
            event_type="pdf_storage_failed",
            message=f"Falha ao salvar o PDF gerado no Supabase Storage. Projeto: {project_id}. Erro: {str(e)}",
            user_id=user_id
        )
        raise HTTPException(status_code=500, detail=f"Erro ao salvar PDF: {str(e)}")
    finally:
        if os.path.exists(pdf_path):
            os.remove(pdf_path)

    # 7. Save render URL in generations table
    supabase.table("generations") \
        .update({"render_urls": {"pdf": public_url}}) \
        .eq("id", generation["id"]) \
        .execute()

    # 8. Update project status
    supabase.table("projects") \
        .update({"status": "completed"}) \
        .eq("id", project_id) \
        .execute()

    logger.info(f"Projeto {project_id} concluído com sucesso!")
    return {"message": "PDF gerado com sucesso!", "project_id": project_id}


@router.post("/approve")
async def approve_and_render(
    body: ApproveRequest,
    user: dict = Depends(get_current_user),
):
    return await _approve_and_render_impl(body.project_id, user)


@router.get("/{project_id}/download")
async def download_pdf(project_id: str, user: dict = Depends(get_current_user)):
    """
    Generates a signed URL for the PDF and returns it.
    The signed URL is valid for 1 hour.
    """
    supabase = get_supabase_client()

    # Verify ownership
    project_resp = supabase.table("projects") \
        .select("id, status") \
        .eq("id", project_id) \
        .eq("user_id", user["id"]) \
        .single() \
        .execute()

    if not project_resp.data:
        raise HTTPException(status_code=404, detail="Projeto não encontrado.")

    if project_resp.data["status"] != "completed":
        raise HTTPException(status_code=400, detail="PDF ainda não está pronto.")

    # Get the storage path from generations
    gen_resp = supabase.table("generations") \
        .select("render_urls") \
        .eq("project_id", project_id) \
        .order("created_at", desc=True) \
        .limit(1) \
        .execute()

    if not gen_resp.data or not gen_resp.data[0].get("render_urls"):
        raise HTTPException(status_code=404, detail="PDF não encontrado.")

    pdf_url = gen_resp.data[0]["render_urls"].get("pdf")
    if not pdf_url:
        raise HTTPException(status_code=404, detail="URL do PDF nao encontrada.")

    return {"download_url": pdf_url}
