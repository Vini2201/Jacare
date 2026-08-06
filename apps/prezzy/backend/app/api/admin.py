import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from app.api.auth import require_superuser, get_supabase_client
from app.services.event_dispatcher import EventDispatcher

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/admin", tags=["admin"])


# --- Metrics ---

@router.get("/metrics")
async def get_admin_metrics(user: dict = Depends(require_superuser)):
    """
    Returns global metrics for the Admin Dashboard.
    """
    supabase = get_supabase_client()
    
    # Active Users (count)
    users_resp = supabase.table("user_profiles").select("id", count="exact").execute()
    total_users = users_resp.count if users_resp.count else 0
    
    # Generations Today (count projects created today)
    # Simple count for demonstration
    gens_resp = supabase.table("projects").select("id", count="exact").execute()
    total_projects = gens_resp.count if gens_resp.count else 0
    
    # We don't have token counts yet, so we mock or use credit consumption
    tokens_consumed = total_projects * 15000  # Fake metric
    estimated_cost = total_projects * 0.02    # Fake metric
    
    return {
        "active_users": total_users,
        "generations_today": total_projects,
        "tokens_consumed": tokens_consumed,
        "estimated_cost": estimated_cost
    }

# --- API Providers Management ---

class ProviderModel(BaseModel):
    provider: str
    key_value: str
    is_active: bool = True

@router.get("/providers")
async def list_providers(user: dict = Depends(require_superuser)):
    """List all API keys configured."""
    supabase = get_supabase_client()
    resp = supabase.table("api_keys").select("*").execute()
    return {"providers": resp.data}

@router.post("/providers")
async def upsert_provider(body: ProviderModel, user: dict = Depends(require_superuser)):
    """Add or update an API provider."""
    supabase = get_supabase_client()
    provider_lower = body.provider.lower()
    
    # Check if provider exists
    existing = supabase.table("api_keys").select("id").eq("provider", provider_lower).execute()
    
    if existing.data:
        # Update
        supabase.table("api_keys").update({
            "key_value": body.key_value,
            "is_active": body.is_active
        }).eq("provider", provider_lower).execute()
        action = "atualizou"
    else:
        # Insert
        supabase.table("api_keys").insert({
            "provider": provider_lower,
            "key_value": body.key_value,
            "is_active": body.is_active
        }).execute()
        action = "adicionou"

    await EventDispatcher.dispatch(
        category="system",
        severity="warning",
        event_type="api_key_updated",
        message=f"Superuser {user['email']} {action} as credenciais do provedor {body.provider}.",
        user_id=user["id"]
    )

    return {"message": f"Provedor {body.provider} configurado com sucesso."}
