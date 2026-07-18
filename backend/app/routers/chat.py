from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Dict, Any
import asyncio
import json

from app.core.database import get_db
from app.routers.auth import get_current_user
from app.models.user import User
from app.services.ai_factory import AIFactory

router = APIRouter(prefix="/chat", tags=["chat"])

class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str

class ChatPayload(BaseModel):
    messages: List[ChatMessage]

@router.post("/query")
async def chat_assistant(
    payload: ChatPayload,
    current_user: User = Depends(get_current_user)
):
    """
    Streams Career Assistant answers using word-by-word SSE buffers.
    """
    last_msg = payload.messages[-1].content if payload.messages else "Hello"
    
    # 1. Build contextual system guidelines
    role = current_user.target_role or "Software Engineer"
    company = current_user.target_company or "IBM Research"
    
    sys_prompt = f"""
    You are CareerPilot AI, an elite career development companion.
    The student is '{current_user.full_name}'.
    Target Career: '{role}' at '{company}'.
    Experience level: '{current_user.experience_level or "Internship"}'.
    
    Provide concise, highly actionable guidance in Markdown format. Use bold tags, lists, and bullet points.
    Keep answers under 3 paragraphs where possible.
    """

    async def sse_chat_generator():
        # Call AI factory to generate the complete text block
        # Then, stream it word by word to represent real-time streaming to the client
        try:
            ai_text = await AIFactory.generate_text(last_msg, sys_prompt)
        except Exception:
            ai_text = f"I am ready to help you prepare for your upcoming placement as a **{role}** at **{company}**. Let's review your resume to identify missing keywords!"

        # Stream words
        words = ai_text.split(" ")
        for i, word in enumerate(words):
            chunk = f"{word} "
            yield f"data: {json.dumps({'chunk': chunk, 'done': i == len(words) - 1})}\n\n"
            await asyncio.sleep(0.04) # 40ms typing speed simulation

    return StreamingResponse(sse_chat_generator(), media_type="text/event-stream")
