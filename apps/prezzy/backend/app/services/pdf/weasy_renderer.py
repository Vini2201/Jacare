import asyncio
import logging
from app.services.pdf.base import PDFRenderer

try:
    import weasyprint
except ImportError:
    weasyprint = None

logger = logging.getLogger(__name__)

class WeasyPrintRenderer(PDFRenderer):
    """
    Renderizador super leve e nativo em Python, ideal para templates
    sem dependência de JavaScript ou layouts complexos.
    Evita OOM (Out of Memory) em servidores pequenos.
    """

    async def render(self, html_content: str, output_path: str, **kwargs) -> str:
        if weasyprint is None:
            raise ImportError("A biblioteca WeasyPrint não está instalada. Execute: pip install weasyprint")

        logger.info(f"Renderizando PDF usando WeasyPrint (Engine Leve) para: {output_path}")

        def _sync_render():
            weasyprint.HTML(string=html_content).write_pdf(output_path)
        
        # Como WeasyPrint é síncrono, rodamos em uma thread separada para não bloquear o event loop
        await asyncio.to_thread(_sync_render)
        
        logger.info("Renderização WeasyPrint concluída com sucesso.")
        return output_path
