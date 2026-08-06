from app.services.file_parser import FileParserService
from app.providers.llm_factory import LLMFactory
from supabase import create_client, Client
from app.core.config import settings

class RAGService:
    def __init__(self):
        self.supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
        # Use Nvidia as the default embedding provider as requested by the user
        self.llm = LLMFactory.get_provider("nvidia")

    async def ingest_file(self, file_path: str, project_id: str, document_id: str):
        # 1. Parse text
        text = FileParserService.extract_text(file_path)
        
        # 2. Chunk text
        chunks = FileParserService.chunk_text(text, chunk_size=500, overlap=50)
        
        # 3. Embed and store
        for chunk in chunks:
            if not chunk.strip():
                continue
                
            embedding = await self.llm.get_embeddings(chunk)
            
            # Store in Supabase using pgvector
            self.supabase.table("document_chunks").insert({
                "document_id": document_id,
                "content": chunk,
                "embedding": embedding
            }).execute()
            
        # 4. Mark document as processed
        self.supabase.table("documents").update({"processed": True}).eq("id", document_id).execute()

    async def search_context(self, query: str, project_id: str, top_k: int = 5) -> str:
        try:
            # Embed the query
            query_embedding = await self.llm.get_embeddings(query)
            
            # Call the Supabase RPC function we created in SQL
            response = self.supabase.rpc('match_document_chunks', {
                'query_embedding': query_embedding,
                'match_threshold': 0.7,
                'match_count': top_k,
                'p_project_id': project_id
            }).execute()
            
            # Combine the results into a single context string
            context_parts = []
            if response.data:
                for item in response.data:
                    context_parts.append(item.get("content", ""))
                    
            return "\n\n---\n\n".join(context_parts)
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"RAG search_context failed (likely missing/invalid embedding API key). Skipping RAG. Error: {e}")
            return ""
