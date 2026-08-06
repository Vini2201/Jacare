import logging
from app.services.pdf.base import PDFRenderer
from app.services.pdf.cloudconvert_renderer import CloudConvertRenderer
from app.templates.registry import TemplateLibrary

logger = logging.getLogger(__name__)

class RendererSelector:
    """
    Decide qual engine de PDF usar baseado nas capacidades requeridas pelo template.
    """

    @staticmethod
    def get_renderer(template_id: str) -> PDFRenderer:
        template_info = TemplateLibrary.get_template(template_id)
        config = template_info.get("render_config", {})
        
        # Strategy of decision
        if config.get("requires_js") or config.get("complex_layout"):
            logger.info(f"Template {template_id} classified as COMPLEX. Selecting CloudConvert.")
            return CloudConvertRenderer()
        
        if config.get("engine_preference") == "cloudconvert":
            logger.info(f"Template {template_id} forced CloudConvert. Selecting CloudConvert.")
            return CloudConvertRenderer()
            
        logger.info(f"Template {template_id} classified as SIMPLE. Selecting WeasyPrint if available.")
        try:
            from app.services.pdf.weasy_renderer import WeasyPrintRenderer
            return WeasyPrintRenderer()
        except Exception as exc:
            logger.warning(f"WeasyPrint unavailable on this machine, falling back to CloudConvert: {exc}")
            return CloudConvertRenderer()
