from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from app.auth import verify_jwt, extract_center_id, extract_role, extract_admin_id
from app.graph.workflow import run_ai_workflow

router = APIRouter(prefix="/api/ai", tags=["AI Chat"])


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    conversation_id: str | None = None


class ChatResponse(BaseModel):
    message: str
    type: str = "text"
    data: list | dict | None = None
    columns: list[str] | None = None
    chart_type: str | None = None
    conversation_id: str | None = None


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest, payload: dict = Depends(verify_jwt)):
    center_id = extract_center_id(payload)
    role = extract_role(payload)
    admin_id = extract_admin_id(payload)

    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    result = await run_ai_workflow(
        user_query=request.message,
        center_id=center_id,
        role=role,
        admin_id=admin_id,
    )

    return ChatResponse(
        message=result.get("message", ""),
        type=result.get("type", "text"),
        data=result.get("data"),
        columns=result.get("columns"),
        chart_type=result.get("chart_type"),
        conversation_id=request.conversation_id,
    )
