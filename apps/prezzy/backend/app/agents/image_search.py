import logging
from typing import Optional

logger = logging.getLogger(__name__)

class ImageSearchAgent:
    """
    Agente responsável por buscar imagens baseadas nos prompts.
    Para o MVP, mocka imagens gratuitas usando a Unsplash Source API baseada em keywords,
    se a flag 'use_images' for verdadeira.
    """
    
    @staticmethod
    async def search_image(prompt: str, use_images: bool = True) -> Optional[str]:
        if not use_images or not prompt:
            return None
            
        logger.info(f"Buscando imagem para o prompt: {prompt}")
        
        # Extrai algumas palavras chave do prompt (simplificado para MVP)
        # Idealmente, o próprio prompt já viria limpo do LLM
        keywords = prompt.replace(" ", ",").replace("imagem de", "")
        
        # Mock de URL do Unsplash (random based on keywords)
        # Nota: Unsplash source API (source.unsplash.com) foi depreciada, 
        # mas para mock de front-end podemos usar images.unsplash.com com params ou picsum.
        # Vamos usar um placeholder fixo do picsum seed.
        
        seed = hash(prompt) % 10000
        mock_url = f"https://picsum.photos/seed/{seed}/1920/1080"
        
        logger.info(f"Imagem encontrada (Mock/Picsum): {mock_url}")
        return mock_url
