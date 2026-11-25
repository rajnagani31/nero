from fastapi import APIRouter, Depends, HTTPException

from ...config import SessionLocal
from ...dependencies.auth import get_current_user_from_db
from ...repository.chat_repository import ChatRepository
from ...schema.chat_schema import (
    CreateThreadRequest,
    MessageResponse,
    ThreadSummaryResponse,
)
from ...service.chat_service import ChatService

router = APIRouter(tags=["chat_history"])


def get_chat_service() -> ChatService:
    return ChatService(ChatRepository(SessionLocal))


@router.post("/threads", response_model=ThreadSummaryResponse)
def create_thread(
    request: CreateThreadRequest,
    current_user = Depends(get_current_user_from_db),
    chat_service: ChatService = Depends(get_chat_service),
):
    # print("[request]", request.url)
    """This api create a new thread when use click new chat then add title and content history"""
    thread = chat_service.create_thread(
        user_id=current_user.id,
        title=request.title,
        mode=request.mode,
        client_session_id=request.client_session_id,
    )
    return ThreadSummaryResponse(
        id=thread.id,
        title=thread.title,
        mode=thread.mode,
        updated_at=thread.updated_at,
        last_message_at=thread.last_message_at,
        preview="",
        message_count=0,
    )


@router.get("/threads", response_model=list[ThreadSummaryResponse])
def list_threads(
    current_user=Depends(get_current_user_from_db),
    chat_service: ChatService = Depends(get_chat_service),
):
    """ Look Thread content in sidebare"""
    
    return [ThreadSummaryResponse(**thread) for thread in chat_service.list_threads(user_id=current_user.id)]


@router.get("/threads/{thread_id}/messages", response_model=list[MessageResponse])
def list_messages(
    thread_id: int,
    current_user=Depends(get_current_user_from_db),
    chat_service: ChatService = Depends(get_chat_service),
):
    """ 
    This api will return chat data based on thred and user id.
    This data show as sequence using role(Frontend side Right - Left) and sequence no(Backend side DB)
    """
    thread = chat_service.repository.get_thread(user_id=current_user.id, thread_id=thread_id)
    if thread is None:
        raise HTTPException(status_code=404, detail="Thread not found")

    messages = chat_service.list_messages(user_id=current_user.id, thread_id=thread_id)
    return [
        MessageResponse(
            id=message.id,
            role=message.role,
            content=message.content,
            status=message.status,
            created_at=message.created_at,
            completed_at=message.completed_at,
            metadata_json=message.metadata_json,
        )
        for message in messages
    ]
