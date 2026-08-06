import sys
import os

# Adiciona o diretório atual ao sys.path para importações absolutas
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from arq import Worker
from arq.connections import RedisSettings
from app.core.config import settings
from app.agents.orchestrator import generate_draft_task, render_pdf_task

async def startup(ctx):
    print("Worker PREZZY starting up... Conectado ao Redis.")

async def shutdown(ctx):
    print("Worker shutting down...")

class WorkerSettings:
    functions = [generate_draft_task, render_pdf_task]
    redis_settings = RedisSettings.from_dsn(settings.REDIS_URL)
    on_startup = startup
    on_shutdown = shutdown
    job_timeout = 3600  # IA takes time, allow up to 1 hour per job
