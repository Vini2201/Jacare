import logging
import os
from typing import Dict, Any
from app.models.domain import BriefingData, PresentationDraft, BrandKitModel
from app.services.rag import RAGService
from app.providers.llm_factory import LLMFactory
from app.agents.image_search import ImageSearchAgent
from app.templates.engine import TemplateEngine
from app.services.pdf.facade import PDFService
from app.services.storage import StorageService
from app.services.alerts import AlertService

logger = logging.getLogger(__name__)

async def generate_draft_task(ctx, project_id: str, briefing_dict: dict, provider_name: str = "nvidia", language: str = "pt-BR"):
    """
    Fase 1 (HITL): Gera o conteúdo da apresentação (JSON), busca imagens e salva o rascunho no banco.
    Muda o status para 'pending_approval' aguardando o Humano.
    """
    logger.info(f"Iniciando Fase 1 (Geração) para projeto {project_id} | Motor: {provider_name}")
    
    try:
        rag = RAGService()
        briefing = BriefingData(**briefing_dict)
        use_images = briefing_dict.get("use_images", True)
        
        # Atualiza status para gerando
        rag.supabase.table("projects").update({"status": "generating"}).eq("id", project_id).execute()
        
        # 1. Recuperar contexto do RAG
        logger.info("Realizando busca de contexto vetorial...")
        context = await rag.search_context(query=f"{briefing.title} {briefing.audience}", project_id=project_id)
        
        # 2. Iniciar o LLM
        llm = LLMFactory.get_provider(provider_name)
        
        system_prompt = f"""
        Você é o Agente Master do PREZZY. Especialista na metodologia 'Gabarito V4'.
        Sua missão é criar o conteúdo completo de uma apresentação.
        Idioma obrigatório: {language}
        
        Contexto extraído da base de conhecimento da empresa:
        {context}
        """
        
        user_prompt = f"""
        Tema: {briefing.title}
        Público-alvo: {briefing.audience}
        Tom de voz: {briefing.tone}
        Objetivos principais: {", ".join(briefing.objectives)}
        
        Crie a apresentação. Seja impecável no design instrucional.
        """
        
        logger.info("Chamando LLM (Agente Copywriter)...")
        draft_response = await llm.generate_json(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            response_model=PresentationDraft
        )
        
        draft_dict = draft_response.model_dump()
        
        # 3. Busca de Imagens
        if use_images:
            logger.info("Processando buscas de imagens para os slides...")
            for slide in draft_dict.get("slides", []):
                if slide.get("image_prompt"):
                    img_url = await ImageSearchAgent.search_image(slide["image_prompt"], use_images=use_images)
                    slide["image_prompt"] = img_url
        
        # 4. Salvar o rascunho em generations e no projeto
        # Como o banco do cliente pode não ter a coluna draft_data, vamos tentar salvar no generations.
        rag.supabase.table("generations").insert({
            "project_id": project_id,
            "briefing_data": briefing_dict,
            "draft_outline": draft_dict
        }).execute()

        # Atualiza status para pending_approval
        rag.supabase.table("projects").update({
            "status": "pending_approval"
        }).eq("id", project_id).execute()

        logger.info(f"Fase 1 concluída. Projeto {project_id} aguardando aprovação humana.")
        return {"status": "pending_approval", "project_id": project_id}
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        logger.error(f"Erro na geração de draft: {e}")
        try:
            from app.api.auth import get_supabase_client
            supabase = get_supabase_client()
            supabase.table("projects").update({"status": "failed"}).eq("id", project_id).execute()
        except:
            pass
            
        await AlertService.alert_admin(
            subject=f"Falha na Geração do Rascunho (Projeto {project_id})",
            message=str(e),
            level="ERROR"
        )
        return {"status": "failed", "error": str(e)}


async def render_pdf_task(ctx, project_id: str, final_draft_dict: dict, template_id: str = "template_infoproduct_dark"):
    """
    Fase 2 (HITL): Pega o JSON aprovado e renderiza o HTML e o PDF.
    """
    logger.info(f"Iniciando Fase 2 (Renderização PDF) para projeto {project_id} | Template: {template_id}")
    
    try:
        rag = RAGService()
        
        # Atualiza status
        rag.supabase.table("projects").update({"status": "generating"}).eq("id", project_id).execute()
        
        # Brand Kit
        proj_resp = rag.supabase.table("projects").select("brand_kit_id").eq("id", project_id).single().execute()
        brand_kit_id = proj_resp.data.get("brand_kit_id") if proj_resp.data else None
        
        if brand_kit_id:
            brand_resp = rag.supabase.table("brand_kits").select("*").eq("id", brand_kit_id).single().execute()
            brand = BrandKitModel(**brand_resp.data) if brand_resp.data else BrandKitModel(name="Default")
        else:
            brand = BrandKitModel(name="Default")

        # Configurar Template no Engine
        logger.info(f"Montando o HTML via Jinja2 usando {template_id}...")
        # (O Template Engine no futuro precisará aceitar o template_id, se já não aceita,
        # enviaremos pelo kwargs ou faremos uma pequena adaptação nele se necessário).
        # Para evitar erros de compatibilidade com código existente, assumimos que render_presentation aceita.
        html_content = TemplateEngine.render_presentation(PresentationDraft(**final_draft_dict), brand, template_id=template_id)
        
        logger.info("Iniciando Renderização em PDF (Engine Híbrida)...")
        pdf_path = await PDFService.generate_pdf(html_content, template_id=template_id)
        
        logger.info("Fazendo upload para o Storage...")
        public_url = await StorageService.upload_pdf(pdf_path, project_id)
        
        logger.info(f"Pipeline concluído com sucesso. URL: {public_url}")
        rag.supabase.table("projects").update({
            "status": "completed",
            "type": "presentation"
        }).eq("id", project_id).execute()
        
        rag.supabase.table("generations").update({
            "render_urls": {"pdf": public_url}
        }).eq("project_id", project_id).execute()
        
        try:
            os.remove(pdf_path)
        except Exception as e:
            pass

        return {"status": "completed", "project_id": project_id, "url": public_url}
        
    except Exception as e:
        logger.error(f"Erro no pipeline Fase 2: {e}")
        try:
            from app.api.auth import get_supabase_client
            supabase = get_supabase_client()
            supabase.table("projects").update({"status": "failed"}).eq("id", project_id).execute()
        except:
            pass
            
        await AlertService.alert_admin(
            subject=f"Falha na Renderização (Projeto {project_id})",
            message=str(e),
            level="ERROR"
        )
        return {"status": "failed", "error": str(e)}
