from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.projects import router as projects_router
from app.api.generate import router as generate_router
from app.api.render import router as render_router
from app.api.admin import router as admin_router
from app.api.brand_kits import router as brand_kits_router
from app.api.templates import router as templates_router
from app.api.assistant import router as assistant_router

app = FastAPI(title="PREZZY API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routers
app.include_router(projects_router)
app.include_router(generate_router)
app.include_router(render_router)
app.include_router(admin_router)
app.include_router(brand_kits_router)
app.include_router(templates_router)
app.include_router(assistant_router)

@app.get("/")
async def root():
    return {"message": "Welcome to PREZZY API"}

@app.get("/health")
async def health():
    status = {"api": "ok"}
    
    # Check Supabase
    try:
        from app.api.auth import get_supabase_client
        supabase = get_supabase_client()
        # Simple query to test connection
        supabase.table("projects").select("id").limit(1).execute()
        status["supabase"] = "ok"
    except Exception as e:
        status["supabase"] = f"error: {str(e)}"
        
    # Check Redis
    try:
        from app.services.queue import get_redis_pool
        redis = await get_redis_pool()
        await redis.info()
        status["redis"] = "ok"
    except Exception as e:
        status["redis"] = f"error: {str(e)}"
        
    return status
