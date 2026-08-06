from pydantic import BaseModel
from typing import List, Literal, Optional
from fastapi import APIRouter, Depends, HTTPException

from app.api.auth import get_current_user
from app.providers.llm_factory import LLMFactory

router = APIRouter(prefix="/api/assistant", tags=["assistant"])

class ChatMessage(BaseModel):
    role: Literal["system", "user", "assistant"]
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    provider: str = "groq"
    project_id: Optional[str] = None
    focus: Optional[str] = None

@router.post("/chat")
async def chat_with_assistant(body: ChatRequest, user: dict = Depends(get_current_user)):
    if not body.messages:
        raise HTTPException(status_code=400, detail="Nenhuma mensagem enviada.")

    provider = LLMFactory.get_provider(body.provider)
    system_prompt = (
        "You are PREZZY's product and refactoring assistant. "
        "Help the user improve UI, UX, architecture, copy, routes and workflows. "
        "Be direct, practical, and propose actionable changes. "
        "When asked for code changes, answer with clear steps and risks."
    )
    if body.project_id:
        system_prompt += f" Current project: {body.project_id}."
    if body.focus:
        system_prompt += f" Current focus: {body.focus}."

    conversation = []
    for message in body.messages:
        conversation.append({"role": message.role, "content": message.content})

    try:
        response = await provider.client.chat.completions.create(
            model=provider.model_name,
            messages=[{"role": "system", "content": system_prompt}] + conversation,
            temperature=0.4,
        )
        text = response.choices[0].message.content if response.choices else ""
        return {"reply": text or "I could not generate a response right now.", "provider": body.provider}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to talk to the AI: {str(exc)}")
