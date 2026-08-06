"""
Generation endpoint — enqueues a job in Redis (Arq) to run the AI pipeline.
"""
import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.api.auth import get_current_user, get_supabase_client
from app.services.queue import get_redis_pool
from app.services.event_dispatcher import EventDispatcher
from app.api.render import _approve_and_render_impl

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/generate", tags=["generate"])


class GenerateRequest(BaseModel):
    project_id: str
    provider: str = "nvidia"  # nvidia, groq, openai


class ApproveRequest(BaseModel):
    project_id: str
    final_draft_dict: Optional[dict] = None


@router.post("")
async def start_generation(
    body: GenerateRequest,
    user: dict = Depends(get_current_user),
):
    """
    Starts the AI generation pipeline for a project.
    1. Validates ownership and credits.
    2. Reads the briefing_data from the generations table.
    3. Enqueues `run_pipeline` in the Arq/Redis worker.
    4. Deducts 1 credit.
    5. Updates project status to 'generating'.
    """
    supabase = get_supabase_client()
    user_id = user["id"]

    project_resp = supabase.table("projects") \
        .select("id, status, language") \
        .eq("id", body.project_id) \
        .eq("user_id", user_id) \
        .single() \
        .execute()

    if not project_resp.data:
        raise HTTPException(status_code=404, detail="Projeto não encontrado.")

    project = project_resp.data
    if project["status"] not in ("draft", "failed"):
        raise HTTPException(
            status_code=400,
            detail=f"Projeto já está em status '{project['status']}'. Não é possível gerar novamente.",
        )

    profile_resp = supabase.table("user_profiles") \
        .select("credits") \
        .eq("id", user_id) \
        .single() \
        .execute()
    
    credits = profile_resp.data.get("credits", 0) if profile_resp.data else 0
    if credits <= 0:
        await EventDispatcher.dispatch(
            category="billing",
            severity="warning",
            event_type="generation_denied_no_credits",
            message=f"Usuário {user_id} tentou iniciar geração do projeto {body.project_id} sem créditos suficientes.",
            user_id=user_id
        )
        raise HTTPException(status_code=402, detail="Créditos insuficientes.")

    gen_resp = supabase.table("generations") \
        .select("briefing_data") \
        .eq("project_id", body.project_id) \
        .order("created_at", desc=True) \
        .limit(1) \
        .execute()

    if not gen_resp.data or not gen_resp.data[0].get("briefing_data"):
        raise HTTPException(status_code=400, detail="Briefing não encontrado para este projeto.")

    briefing_data = gen_resp.data[0]["briefing_data"]

    try:
        redis_pool = await get_redis_pool()
        job = await redis_pool.enqueue_job(
            "generate_draft_task",
            body.project_id,
            briefing_data,
            body.provider,
            project.get("language", "pt-BR"),
        )
        logger.info(f"Job enqueued: {job.job_id} for project {body.project_id}")
    except Exception as e:
        logger.error(f"Failed to enqueue job: {e}")
        await EventDispatcher.dispatch(
            category="system",
            severity="critical",
            event_type="redis_enqueue_failed",
            message=f"Falha ao enfileirar job no Redis para o projeto {body.project_id}. Erro: {str(e)}",
            user_id=user_id
        )
        raise HTTPException(status_code=503, detail=f"Fila indisponível: {str(e)}")

    supabase.rpc("deduct_credit", {"p_user_id": user_id}).execute()
    
    await EventDispatcher.dispatch(
        category="billing",
        severity="info",
        event_type="credit_deducted",
        message=f"Usuário {user_id} gastou 1 crédito. Projeto: {body.project_id}",
        user_id=user_id
    )

    await EventDispatcher.dispatch(
        category="ai",
        severity="info",
        event_type="generation_started",
        message=f"Pipeline iniciado para o projeto {body.project_id}. Provedor: {body.provider}",
        user_id=user_id
    )

    supabase.table("projects") \
        .update({"status": "generating"}) \
        .eq("id", body.project_id) \
        .execute()

    return {
        "message": "Geração de rascunho iniciada!",
        "job_id": job.job_id if job else None,
        "project_id": body.project_id,
    }


@router.post("/approve")
async def approve_draft(
    body: ApproveRequest,
    user: dict = Depends(get_current_user),
):
    return await _approve_and_render_impl(body.project_id, user)

