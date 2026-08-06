import os
import uuid
import logging
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from typing import Optional
from app.api.auth import get_current_user, get_supabase_client
from app.services.event_dispatcher import EventDispatcher

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/brand-kits", tags=["brand-kits"])

@router.get("")
async def get_brand_kits(user: dict = Depends(get_current_user)):
    """List all brand kits for the authenticated user."""
    supabase = get_supabase_client()
    resp = supabase.table("brand_kits").select("*").eq("user_id", user["id"]).execute()
    return {"brand_kits": resp.data}

@router.post("")
async def upsert_brand_kit(
    name: str = Form(...),
    primary_color: str = Form("#000000"),
    secondary_color: str = Form("#ffffff"),
    font_family: str = Form("Inter"),
    id: Optional[str] = Form(None),
    logo: Optional[UploadFile] = File(None),
    user: dict = Depends(get_current_user)
):
    """Create or update a brand kit, including optional logo upload."""
    supabase = get_supabase_client()
    user_id = user["id"]
    
    logo_url = None
    
    if logo and logo.filename:
        ext = os.path.splitext(logo.filename)[1]
        storage_path = f"{user_id}/brand-kits/{uuid.uuid4()}{ext}"
        
        content = await logo.read()
        try:
            supabase.storage.from_("uploads").upload(
                storage_path,
                content,
                file_options={"content-type": logo.content_type}
            )
            # Create public URL if bucket is public, else signed url is needed later. 
            # We'll store the path to be safe.
            logo_url = storage_path
        except Exception as e:
            logger.error(f"Logo upload failed: {e}")
            raise HTTPException(status_code=500, detail=f"Erro ao salvar logo: {str(e)}")

    data = {
        "user_id": user_id,
        "name": name,
        "primary_color": primary_color,
        "secondary_color": secondary_color,
        "font_family": font_family,
    }
    
    if logo_url:
        data["logo_url"] = logo_url

    if id:
        # Check ownership
        check = supabase.table("brand_kits").select("id").eq("id", id).eq("user_id", user_id).execute()
        if not check.data:
            raise HTTPException(status_code=403, detail="Não autorizado a editar este brand kit.")
            
        resp = supabase.table("brand_kits").update(data).eq("id", id).execute()
        action = "atualizou"
    else:
        resp = supabase.table("brand_kits").insert(data).execute()
        action = "criou"

    await EventDispatcher.dispatch(
        category="system",
        severity="info",
        event_type="brand_kit_updated",
        message=f"Usuário {user_id} {action} um brand kit ('{name}').",
        user_id=user_id
    )

    return {"message": "Brand kit salvo com sucesso.", "brand_kit": resp.data[0]}
