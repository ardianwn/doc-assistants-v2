"""
Chat Routes - Cleaned Version
Only active endpoints using OpenAI Assistants API
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from pydantic import BaseModel
import time
import logging

logger = logging.getLogger(__name__)

from utils.auth import require_user_role_async
from db import models, database
from services.openai_assistant_service import openai_assistant_service

router = APIRouter()


class ChatRequest(BaseModel):
    question: str
    session_id: str = None
    thread_id: str = None  # For OpenAI Assistants continuity


class ChatResponse(BaseModel):
    answer: str
    processing_time: float
    session_id: str
    thread_id: str = None


@router.post("/openai-assistant", response_model=ChatResponse)
async def ask_openai_assistant(
    chat_request: ChatRequest,
    current_user: models.User = Depends(require_user_role_async()),
    db: AsyncSession = Depends(database.get_async_db)
):
    """
    Primary chat endpoint using OpenAI Assistants API with local Qdrant
    Best reasoning + local data privacy
    """
    start = time.time()
    question = chat_request.question
    session_id = chat_request.session_id
    thread_id = chat_request.thread_id
    
    # Generate session_id if not provided
    if not session_id:
        import uuid
        session_id = f"session_{int(time.time())}_{str(uuid.uuid4())[:8]}"
    
    logger.info(f"\n[ASSISTANT] Question from {current_user.username}: {question}")
    logger.info(f"[SESSION] Session ID: {session_id}, Thread ID: {thread_id}")

    try:
        # Use OpenAI Assistants API
        answer, returned_thread_id = await openai_assistant_service.chat_with_assistant(
            user_query=question,
            thread_id=thread_id
        )
        
        processing_time = round(time.time() - start, 2)
        
        # Save to database
        chat_history = models.HistoryChat(
            user_id=current_user.id,
            session_id=session_id,
            question=question,
            answer=answer
        )
        db.add(chat_history)
        await db.commit()
        
        logger.info(f"[DONE] Completed in {processing_time}s")
        
        return ChatResponse(
            answer=answer,
            processing_time=processing_time,
            session_id=session_id,
            thread_id=returned_thread_id
        )
        
    except Exception as e:
        logger.error(f"[ERROR] {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/openai-tools", response_model=ChatResponse)
async def ask_openai_tools(
    chat_request: ChatRequest,
    current_user: models.User = Depends(require_user_role_async()),
    db: AsyncSession = Depends(database.get_async_db)
):
    """
    Compatibility endpoint for older frontend code that posts to /chat/openai-tools.
    This proxies the request to the same assistant service used by /openai-assistant so
    the frontend does not receive a 404 when calling the legacy route.
    """
    start = time.time()
    question = chat_request.question
    session_id = chat_request.session_id

    # Generate session_id if not provided
    if not session_id:
        import uuid
        session_id = f"session_{int(time.time())}_{str(uuid.uuid4())[:8]}"

    logger.info(f"[TOOLS COMPAT] Question from {current_user.username}: {question}")
    logger.info(f"[TOOLS COMPAT] Session ID: {session_id}")

    try:
        # Reuse the assistants chat implementation for compatibility
        answer, returned_thread_id = await openai_assistant_service.chat_with_assistant(
            user_query=question,
            thread_id=None
        )

        processing_time = round(time.time() - start, 2)

        # Save to database (same as other endpoint)
        chat_history = models.HistoryChat(
            user_id=current_user.id,
            session_id=session_id,
            question=question,
            answer=answer
        )
        db.add(chat_history)
        await db.commit()

        return ChatResponse(
            answer=answer,
            processing_time=processing_time,
            session_id=session_id,
            thread_id=returned_thread_id
        )

    except Exception as e:
        logger.error(f"[TOOLS COMPAT ERROR] {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history")
async def get_chat_history(
    current_user: models.User = Depends(require_user_role_async()),
    db: AsyncSession = Depends(database.get_async_db),
    limit: int = 50
):
    """Get chat history for current user"""
    result = await db.execute(
        select(models.HistoryChat)
        .where(models.HistoryChat.user_id == current_user.id)
        .order_by(models.HistoryChat.created_at.desc())
        .limit(limit)
    )
    history = result.scalars().all()
    
    return {
        "history": [
            {
                "id": chat.id,
                "question": chat.question,
                "answer": chat.answer,
                "created_at": chat.created_at.isoformat(),
                "session_id": chat.session_id
            }
            for chat in history
        ]
    }


@router.delete("/history/{chat_id}")
async def delete_chat_history(
    chat_id: int,
    current_user: models.User = Depends(require_user_role_async()),
    db: AsyncSession = Depends(database.get_async_db)
):
    """Delete specific chat history item"""
    result = await db.execute(
        select(models.HistoryChat)
        .where(
            models.HistoryChat.id == chat_id,
            models.HistoryChat.user_id == current_user.id
        )
    )
    chat_item = result.scalar_one_or_none()
    
    if not chat_item:
        raise HTTPException(status_code=404, detail="Chat history not found")
    
    await db.delete(chat_item)
    await db.commit()
    
    return {"message": "Chat history deleted successfully"}


@router.delete("/session/{session_id}")
async def delete_session(
    session_id: str,
    current_user: models.User = Depends(require_user_role_async()),
    db: AsyncSession = Depends(database.get_async_db)
):
    """Delete entire chat session"""
    result = await db.execute(
        delete(models.HistoryChat)
        .where(
            models.HistoryChat.session_id == session_id,
            models.HistoryChat.user_id == current_user.id
        )
    )
    
    await db.commit()
    
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return {"message": f"Deleted session with {result.rowcount} messages"}


@router.delete("/history")
async def clear_all_chat_history(
    current_user: models.User = Depends(require_user_role_async()),
    db: AsyncSession = Depends(database.get_async_db)
):
    """Clear all chat history for current user"""
    result = await db.execute(
        delete(models.HistoryChat)
        .where(models.HistoryChat.user_id == current_user.id)
    )
    
    await db.commit()
    
    return {"message": f"Deleted {result.rowcount} chat messages"}
