"""
Supabase JWT verification for FastAPI.
Extracts user_id from the Authorization header by calling Supabase Auth.
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client
from app.core.config import settings

security = HTTPBearer()

def get_supabase_client():
    """Reusable Supabase admin client (service_role key)."""
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """
    FastAPI dependency that verifies the Supabase JWT from the Authorization header.
    Returns the user dict if valid, raises 401 otherwise.
    """
    token = credentials.credentials
    supabase = get_supabase_client()
    
    try:
        # Use the service_role client to verify the JWT and get user info
        user_response = supabase.auth.get_user(token)
        user = user_response.user
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token inválido ou expirado.",
            )
            
        # Get custom role from user_profiles
        profile_resp = supabase.table("user_profiles").select("role").eq("id", user.id).single().execute()
        role = profile_resp.data.get("role", "user") if profile_resp.data else "user"
            
        return {
            "id": user.id,
            "email": user.email,
            "role": role,
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Falha na autenticação: {str(e)}",
        )

async def require_superuser(user: dict = Depends(get_current_user)) -> dict:
    """
    FastAPI dependency that ensures the authenticated user has the 'superuser' role.
    """
    if user.get("role") != "superuser":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado. Requer privilégios de Superuser."
        )
    return user

