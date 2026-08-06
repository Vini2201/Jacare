from fastapi import APIRouter
from app.templates.registry import TemplateLibrary

router = APIRouter(prefix="/api/templates", tags=["templates"])

@router.get("")
async def list_templates():
    return {"templates": TemplateLibrary.get_all_for_ui()}

@router.get("/catalog")
async def list_template_catalog():
    return {"templates": TemplateLibrary.REGISTRY}
