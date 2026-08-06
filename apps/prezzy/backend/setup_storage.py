import os
import logging
from dotenv import load_dotenv
from supabase import create_client, Client
from app.services.storage import PDF_OUTPUT_BUCKET

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

def setup_storage():
    """
    Script de verificacao do bucket de outputs no Supabase Storage.
    A criacao do bucket deve ser manual pelo dashboard do Supabase.
    """
    url: str = os.getenv("SUPABASE_URL")
    key: str = os.getenv("SUPABASE_SERVICE_KEY")

    if not url or not key:
        logger.error("SUPABASE_URL ou SUPABASE_SERVICE_KEY nao configurados no ambiente.")
        raise SystemExit(1)

    supabase: Client = create_client(url, key)
    bucket_name = PDF_OUTPUT_BUCKET

    try:
        buckets = supabase.storage.list_buckets()
        if not any(b.name == bucket_name for b in buckets):
            logger.error(
                "Bucket '%s' NAO existe. Crie manualmente no dashboard do Supabase "
                "em Storage > New bucket antes de rodar render_pdf_task.",
                bucket_name,
            )
            raise SystemExit(1)

        logger.info(f"Bucket '{bucket_name}' existe.")

    except Exception as e:
        logger.error(f"Erro ao verificar o bucket '{bucket_name}': {e}")
        raise

if __name__ == "__main__":
    setup_storage()
