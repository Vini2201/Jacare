import os
import asyncio
import logging
from app.services.pdf.base import PDFRenderer
from app.core.config import settings

try:
    import cloudconvert
except ImportError:
    cloudconvert = None

import httpx

logger = logging.getLogger(__name__)

class CloudConvertRenderer(PDFRenderer):
    """
    Renderizador baseado na API do CloudConvert.
    Ideal para templates pesados, com JavaScript complexo e CSS Grid/Glassmorphism,
    retirando o peso de renderização (OOM) do nosso servidor.
    """

    async def render(self, html_content: str, output_path: str, **kwargs) -> str:
        if not settings.CLOUDCONVERT_API_KEY:
            raise ValueError("CLOUDCONVERT_API_KEY não está configurada no painel administrativo ou .env")
            
        if cloudconvert is None:
            raise ImportError("A biblioteca cloudconvert não está instalada. Execute: pip install cloudconvert")

        logger.info("Iniciando conversão via CloudConvert (Engine Pesada)")

        # Configura a chave
        cloudconvert.configure(api_key=settings.CLOUDCONVERT_API_KEY, sandbox=False)

        def _sync_cloudconvert_job():
            # 1. Cria o Job
            job = cloudconvert.Job.create(payload={
                "tasks": {
                    "import-html": {
                        "operation": "import/raw",
                        "file": html_content,
                        "filename": "index.html"
                    },
                    "convert-pdf": {
                        "operation": "convert",
                        "input": "import-html",
                        "input_format": "html",
                        "output_format": "pdf",
                        "engine": "chrome",  # Usa chromium no cloudconvert
                        "engine_version": "120",
                        "fit_window": False,
                        "print_background": True,
                        "screen_width": 1920,
                        "screen_height": 1080
                    },
                    "export-url": {
                        "operation": "export/url",
                        "input": "convert-pdf"
                    }
                }
            })

            # 2. Aguarda o Job terminar
            job = cloudconvert.Job.wait(id=job['id'])

            # 3. Pega o URL de exportação
            export_task = next(task for task in job['tasks'] if task['name'] == 'export-url')
            if export_task['status'] == 'error':
                raise Exception(f"Erro no CloudConvert: {export_task.get('message', 'Erro desconhecido')}")
                
            file_url = export_task['result']['files'][0]['url']
            return file_url

        # Como a lib python do cloudconvert é bloqueante, usamos to_thread
        download_url = await asyncio.to_thread(_sync_cloudconvert_job)

        # Baixa o PDF para o disco
        logger.info(f"Fazendo download do PDF gerado pelo CloudConvert para {output_path}")
        async with httpx.AsyncClient() as client:
            response = await client.get(download_url)
            response.raise_for_status()
            with open(output_path, 'wb') as f:
                f.write(response.content)

        logger.info("Renderização CloudConvert concluída com sucesso.")
        return output_path
