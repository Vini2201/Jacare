import os
import uuid
import logging
from app.services.pdf.selector import RendererSelector

logger = logging.getLogger(__name__)

class PDFService:
    """
    Facade para geração de PDF. Ouve a aplicação (Orchestrator) e 
    delega o trabalho pesado para a Engine apropriada.
    """

    @staticmethod
    async def generate_pdf(html_content: str, template_id: str) -> str:
        """
        Gera um PDF usando a melhor engine disponível para o template.
        """
        # Define output path num diretorio temporario
        temp_dir = os.path.join(os.getcwd(), "tmp")
        os.makedirs(temp_dir, exist_ok=True)
        output_path = os.path.join(temp_dir, f"{uuid.uuid4()}.pdf")
        
        # Pega a engine apropriada baseada nas capacidades do template
        renderer = RendererSelector.get_renderer(template_id)
        
        logger.info(f"PDFService: Iniciando renderização usando {renderer.__class__.__name__}")
        
        # Executa a renderização
        try:
            final_path = await renderer.render(html_content, output_path)
            return final_path
        except Exception as e:
            logger.error(f"Falha na renderização de PDF com {renderer.__class__.__name__}: {e}")
            raise e
