import asyncio
import os
import sys
from unittest.mock import MagicMock, patch, AsyncMock

os.environ["SUPABASE_URL"] = "http://localhost:8000"
os.environ["SUPABASE_SERVICE_KEY"] = "mock_key"

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

mock_supabase_module = MagicMock()
sys.modules['supabase'] = mock_supabase_module
mock_get_client = MagicMock(side_effect=Exception("Sem BD local"))
sys.modules['app.api.auth'] = MagicMock(get_supabase_client=mock_get_client)
sys.modules['app.api.auth.get_supabase_client'] = mock_get_client

# Removido mock do playwright pois não usamos mais
from app.core.config import settings
settings.GROQ_API_KEY = os.getenv("GROQ_API_KEY", "mock_groq_key")
from app.agents.orchestrator import run_pipeline

async def test_generation():
    print("Iniciando teste local isolado...")
    
    with patch("app.agents.orchestrator.RAGService") as MockRAG, \
         patch("app.agents.orchestrator.StorageService") as MockStorage, \
         patch("app.agents.orchestrator.AlertService") as MockAlert, \
         patch("app.agents.orchestrator.PDFService") as MockPDFService:
        
        # O mock do RAG é o objeto retornado por RAGService()
        rag_instance = MockRAG.return_value
        rag_instance.search_context = AsyncMock(return_value="Contexto mockado de teste local.")
        MockAlert.alert_admin = AsyncMock()
        
        mock_execute = MagicMock()
        mock_execute.return_value = MagicMock(data=None)
        
        class FakeBuilder:
            def select(self, *args, **kwargs): return self
            def update(self, *args, **kwargs): return self
            def insert(self, *args, **kwargs): return self
            def eq(self, *args, **kwargs): return self
            def single(self, *args, **kwargs): return self
            def execute(self):
                mock = MagicMock()
                mock.data = {"brand_kit_id": None} 
                return mock
                
        rag_instance.supabase.table.return_value = FakeBuilder()
        
        MockStorage.upload_pdf = AsyncMock(return_value="http://localhost/fake_url.pdf")
        def save_fake_pdf(html_content, *args, **kwargs):
            with open("resultado_teste.html", "w", encoding="utf-8") as f:
                f.write(html_content)
            return "local_fake_path.pdf"
            
        MockPDFService.generate_pdf = AsyncMock(side_effect=save_fake_pdf)
        
        briefing = {
            "title": "Apresentação de Vendas - Nova Plataforma",
            "audience": "Diretores de TI",
            "tone": "Profissional, direto e inovador",
            "objectives": ["Apresentar o produto", "Mostrar os benefícios", "Call to action para reunião"],
            "use_images": True
        }
        
        print(f"Executando run_pipeline com provedor GROQ...")
        
        try:
            result = await run_pipeline(
                ctx={},
                project_id="test_project_123",
                briefing_dict=briefing,
                provider_name="groq",
                language="pt-BR"
            )
            print(f"Resultado do Pipeline: {result}")
        except Exception as e:
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_generation())
