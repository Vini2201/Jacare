import os
import logging
from jinja2 import Environment, FileSystemLoader
from app.models.domain import PresentationDraft, BrandKitModel

logger = logging.getLogger(__name__)

class TemplateEngine:
    @staticmethod
    def render_presentation(draft: PresentationDraft, brand: BrandKitModel, template_id: str = "template_infoproduct_dark") -> str:
        """
        Renderiza o HTML usando Jinja2 baseado no template escolhido.
        """
        templates_dir = os.path.dirname(os.path.abspath(__file__))
        
        # Fallback se não enviar
        if not template_id:
            template_id = "template_infoproduct_dark"
            
        # Assegurar extensão html
        if not template_id.endswith(".html"):
            template_file = f"{template_id}.html"
        else:
            template_file = template_id

        # Configurar ambiente Jinja2
        env = FileSystemLoader(templates_dir)
        jinja_env = Environment(loader=env)

        try:
            template = jinja_env.get_template(template_file)
        except Exception as e:
            logger.error(f"Template {template_file} não encontrado. Usando fallback. Erro: {e}")
            template = jinja_env.get_template("template_infoproduct_dark.html")

        # Preparar dados para o template
        context = {
            "title": draft.title,
            "slides": [slide.model_dump() for slide in draft.slides],
            "brand": brand.model_dump() if hasattr(brand, 'model_dump') else brand,
        }

        # Renderizar
        html_content = template.render(context)
        
        return html_content
