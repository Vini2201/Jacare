from abc import ABC, abstractmethod
from typing import Any, Dict, List
import openai
from app.core.config import settings

class BaseLLMProvider(ABC):
    @abstractmethod
    async def generate_json(self, system_prompt: str, user_prompt: str, response_model: Any) -> Any:
        pass
        
    @abstractmethod
    async def get_embeddings(self, text: str) -> List[float]:
        pass

class OpenAICompatibleProvider(BaseLLMProvider):
    def __init__(self, api_key: str, base_url: str, model_name: str, embedding_model: str = None):
        self.client = openai.AsyncClient(api_key=api_key, base_url=base_url)
        self.model_name = model_name
        self.embedding_model = embedding_model
        
    async def generate_json(self, system_prompt: str, user_prompt: str, response_model: Any) -> Any:
        # Utilizing Instructor for structured outputs
        import instructor
        instructor_client = instructor.patch(self.client)
        
        response = await instructor_client.chat.completions.create(
            model=self.model_name,
            response_model=response_model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ]
        )
        return response

    async def get_embeddings(self, text: str) -> List[float]:
        if not self.embedding_model:
            raise ValueError("Embedding model not configured for this provider")
        response = await self.client.embeddings.create(
            input=[text],
            model=self.embedding_model
        )
        return response.data[0].embedding

class LLMFactory:
    @staticmethod
    def get_provider(provider_name: str) -> BaseLLMProvider:
        # Try to get key from DB first
        import logging
        logger = logging.getLogger(__name__)
        from app.api.auth import get_supabase_client
        db_key = None
        try:
            supabase = get_supabase_client()
            db_key_resp = supabase.table("api_keys").select("key_value").ilike("provider", provider_name).eq("is_active", True).execute()
            db_key = db_key_resp.data[0].get("key_value") if db_key_resp.data else None
        except Exception as e:
            logger.warning(f"Não foi possível buscar a chave {provider_name} no DB: {e}")
            db_key = None

        if provider_name.lower() == "nvidia":
            return OpenAICompatibleProvider(
                api_key=(db_key or settings.NVIDIA_API_KEY or "dummy_key_for_init"),
                base_url="https://integrate.api.nvidia.com/v1",
                model_name="meta/llama3-70b-instruct",
                embedding_model="NV-Embed-QA"
            )
        elif provider_name.lower() == "openai":
            return OpenAICompatibleProvider(
                api_key=(db_key or settings.OPENAI_API_KEY or "dummy_key_for_init"),
                base_url="https://api.openai.com/v1",
                model_name="gpt-4o",
                embedding_model="text-embedding-3-small"
            )
        elif provider_name.lower() == "groq":
            return OpenAICompatibleProvider(
                api_key=(db_key or settings.GROQ_API_KEY or "dummy_key_for_init"),
                base_url="https://api.groq.com/openai/v1",
                model_name="llama-3.3-70b-versatile",
                embedding_model=None
            )
        else:
            raise ValueError(f"Provider {provider_name} not supported.")
