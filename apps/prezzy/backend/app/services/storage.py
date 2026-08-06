import uuid
import logging
from app.api.auth import get_supabase_client

logger = logging.getLogger(__name__)

PDF_OUTPUT_BUCKET = "prezzy-outputs"


class StorageBucketMissingError(RuntimeError):
    pass


class StorageService:
    @staticmethod
    def _bucket_exists(supabase, bucket_name: str) -> bool:
        buckets = supabase.storage.list_buckets()
        return any(getattr(bucket, "name", None) == bucket_name for bucket in buckets)

    @staticmethod
    async def upload_pdf(file_path: str, project_id: str) -> str:
        """
        Faz o upload de um arquivo PDF gerado para o Supabase Storage.
        Retorna a URL publica do arquivo.
        """
        supabase = get_supabase_client()
        bucket_name = PDF_OUTPUT_BUCKET

        file_name = f"{project_id}_{uuid.uuid4().hex[:8]}.pdf"
        storage_path = f"projects/{project_id}/{file_name}"

        logger.info(f"Fazendo upload do arquivo {file_path} para {storage_path}...")

        try:
            if not StorageService._bucket_exists(supabase, bucket_name):
                message = (
                    f"Supabase Storage bucket '{bucket_name}' nao existe. "
                    "Crie este bucket manualmente no dashboard do Supabase antes de renderizar PDFs."
                )
                logger.critical(message)
                raise StorageBucketMissingError(message)

            with open(file_path, "rb") as f:
                supabase.storage.from_(bucket_name).upload(
                    file=f,
                    path=storage_path,
                    file_options={"content-type": "application/pdf"}
                )

            # Obtem URL publica
            public_url = supabase.storage.from_(bucket_name).get_public_url(storage_path)
            logger.info(f"Upload concluido: {public_url}")
            return public_url

        except StorageBucketMissingError:
            raise
        except Exception as e:
            logger.exception(
                "Erro no upload para o Supabase Storage. "
                "Bucket esperado: '%s'. Caminho: '%s'.",
                bucket_name,
                storage_path,
            )
            raise e
