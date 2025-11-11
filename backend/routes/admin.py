from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, update
from pydantic import BaseModel
from typing import List, Optional
from db import models, database
from utils.auth import get_current_user, get_current_user_async, require_admin_role_async
# from services.audit_service import audit_service  # REMOVED - Not essential for core functionality
from datetime import datetime
import os

router = APIRouter()

# Pydantic Schemas
class UserCreate(BaseModel):
    username: str
    password: str
    role: str
    is_active: bool = True

class UserUpdate(BaseModel):
    username: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None

class UserResponse(BaseModel):
    id: int
    username: str
    role: str
    is_active: bool
    created_at: datetime
    last_login: Optional[datetime] = None

    class Config:
        from_attributes = True

class DocumentResponse(BaseModel):
    id: int
    filename: str
    file_size: int
    file_type: str
    uploaded_by: str
    uploaded_at: datetime
    status: str
    vector_count: Optional[int] = None
    chunk_count: Optional[int] = None
    page_count: Optional[int] = None
    processed_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class StatusToggle(BaseModel):
    is_active: bool

# Dependency to check if user is admin (backward compatibility)
def require_admin_role(current_user: models.User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin users can access this endpoint"
        )
    return current_user

# User Management Endpoints

@router.get("/users", response_model=List[UserResponse])
async def get_all_users(
    current_user: models.User = Depends(require_admin_role_async),
    db: AsyncSession = Depends(database.get_async_db)
):
    """Get all users (admin only)"""
    result = await db.execute(select(models.User))
    users = result.scalars().all()
    return users

@router.post("/users", response_model=dict)
async def create_user(
    user_data: UserCreate,
    current_user: models.User = Depends(require_admin_role_async),
    db: AsyncSession = Depends(database.get_async_db)
):
    """Create a new user (admin only)"""
    # Validate role
    if user_data.role not in ["user", "admin", "uploader"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role must be 'user', 'admin', or 'uploader'"
        )
    
    # Check if username already exists
    result = await db.execute(select(models.User).where(models.User.username == user_data.username))
    existing_user = result.scalar_one_or_none()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already exists"
        )
    
    # Create new user
    from utils.auth import get_password_hash
    hashed_password = get_password_hash(user_data.password)
    
    new_user = models.User(
        username=user_data.username,
        password=hashed_password,
        role=user_data.role,
        is_active=user_data.is_active
    )
    
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    
    return {"message": "User created successfully", "user_id": new_user.id}

@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    current_user: models.User = Depends(require_admin_role),
    db: Session = Depends(database.get_db)
):
    """Get a specific user by ID (admin only)"""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user

@router.put("/users/{user_id}", response_model=dict)
async def update_user(
    user_id: int,
    user_data: UserUpdate,
    current_user: models.User = Depends(require_admin_role),
    db: Session = Depends(database.get_db)
):
    """Update a user (admin only)"""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Update fields if provided
    if user_data.username is not None:
        # Check if new username already exists
        existing_user = db.query(models.User).filter(
            models.User.username == user_data.username,
            models.User.id != user_id
        ).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already exists"
            )
        user.username = user_data.username
    
    if user_data.password is not None and user_data.password.strip():
        from utils.auth import get_password_hash
        user.password = get_password_hash(user_data.password)
    
    if user_data.role is not None:
        if user_data.role not in ["user", "admin", "uploader"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid role"
            )
        user.role = user_data.role
    
    if user_data.is_active is not None:
        user.is_active = user_data.is_active
    
    db.commit()
    db.refresh(user)
    
    return {"message": "User updated successfully"}

@router.delete("/users/{user_id}", response_model=dict)
async def delete_user(
    user_id: int,
    current_user: models.User = Depends(require_admin_role),
    db: Session = Depends(database.get_db)
):
    """Delete a user (admin only)"""
    # Prevent admin from deleting themselves
    if current_user.id == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )
    
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    db.delete(user)
    db.commit()
    
    return {"message": "User deleted successfully"}

@router.patch("/users/{user_id}/toggle-status", response_model=dict)
async def toggle_user_status(
    user_id: int,
    status_data: StatusToggle,
    current_user: models.User = Depends(require_admin_role),
    db: Session = Depends(database.get_db)
):
    """Toggle user active status (admin only)"""
    # Prevent admin from deactivating themselves
    if current_user.id == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot deactivate your own account"
        )
    
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    user.is_active = status_data.is_active
    db.commit()
    db.refresh(user)
    
    return {"message": f"User status updated to {'active' if user.is_active else 'inactive'}"}

# Document Management Endpoints

class DocumentDetailResponse(BaseModel):
    id: int
    filename: str
    file_size: int
    file_type: str
    uploaded_by: str
    uploaded_at: datetime
    status: str
    vector_count: Optional[int] = None
    chunk_count: Optional[int] = None
    page_count: Optional[int] = None
    processed_at: Optional[datetime] = None
    error_message: Optional[str] = None
    chunk_size: Optional[int] = None
    chunk_overlap: Optional[int] = None
    embedding_model: Optional[str] = None
    chunks: List[dict] = []

    class Config:
        from_attributes = True

@router.get("/documents", response_model=List[DocumentResponse])
async def get_all_documents(
    current_user: models.User = Depends(require_admin_role_async),
    db: AsyncSession = Depends(database.get_async_db)
):
    """Get all documents (admin only)"""
    result = await db.execute(
        select(models.HistoryUpload)
        .order_by(models.HistoryUpload.uploaded_at.desc())
    )
    documents = result.scalars().all()
    
    # Convert to DocumentResponse format
    doc_responses = []
    for doc in documents:
        # Get username of uploader
        user_result = await db.execute(select(models.User).where(models.User.id == doc.user_id))
        uploader = user_result.scalar_one_or_none()
        uploader_username = uploader.username if uploader else "Unknown"
        
        doc_responses.append(DocumentResponse(
            id=doc.id,
            filename=doc.filename,
            file_size=doc.file_size or 0,
            file_type=doc.file_type or "unknown",
            uploaded_by=uploader_username,
            uploaded_at=doc.uploaded_at,
            status=doc.status or "unknown",
            vector_count=getattr(doc, 'vector_count', None),
            chunk_count=getattr(doc, 'chunk_count', None),
            page_count=getattr(doc, 'page_count', None),
            processed_at=getattr(doc, 'processed_at', None)
        ))
    
    return doc_responses

@router.get("/documents/{doc_id}", response_model=DocumentDetailResponse)
async def get_document_detail(
    doc_id: int,
    current_user: models.User = Depends(require_admin_role_async),
    db: AsyncSession = Depends(database.get_async_db)
):
    """Get detailed document information including chunks (admin only)"""
    result = await db.execute(
        select(models.HistoryUpload).where(models.HistoryUpload.id == doc_id)
    )
    document = result.scalar_one_or_none()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Get username of uploader
    user_result = await db.execute(select(models.User).where(models.User.id == document.user_id))
    uploader = user_result.scalar_one_or_none()
    uploader_username = uploader.username if uploader else "Unknown"
    
    # Get chunks
    chunks_result = await db.execute(
        select(models.DocumentChunk)
        .where(models.DocumentChunk.document_id == doc_id)
        .order_by(models.DocumentChunk.chunk_index)
    )
    chunks = chunks_result.scalars().all()
    
    chunks_list = [
        {
            "id": chunk.id,
            "chunk_index": chunk.chunk_index,
            "content": chunk.content[:200] + "..." if len(chunk.content) > 200 else chunk.content,
            "full_content": chunk.content,
            "token_count": chunk.token_count,
            "char_count": chunk.char_count,
            "created_at": chunk.created_at
        }
        for chunk in chunks
    ]
    
    return DocumentDetailResponse(
        id=document.id,
        filename=document.filename,
        file_size=document.file_size or 0,
        file_type=document.file_type or "unknown",
        uploaded_by=uploader_username,
        uploaded_at=document.uploaded_at,
        status=document.status or "unknown",
        vector_count=getattr(document, 'vector_count', None),
        chunk_count=getattr(document, 'chunk_count', None),
        page_count=getattr(document, 'page_count', None),
        processed_at=getattr(document, 'processed_at', None),
        error_message=getattr(document, 'error_message', None),
        chunk_size=getattr(document, 'chunk_size', None),
        chunk_overlap=getattr(document, 'chunk_overlap', None),
        embedding_model=getattr(document, 'embedding_model', None),
        chunks=chunks_list
    )

@router.post("/documents/upload", response_model=dict)
async def upload_document(
    files: List[UploadFile] = File(...),
    current_user: models.User = Depends(require_admin_role),
    db: Session = Depends(database.get_db)
):
    """Upload documents (admin only)"""
    if not files:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No files provided"
        )
    
    uploaded_files = []
    
    for file in files:
        # Validate file type
        allowed_types = ['.pdf', '.docx', '.txt', '.md']
        file_ext = os.path.splitext(file.filename)[1].lower()
        
        if file_ext not in allowed_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File type {file_ext} not allowed. Allowed types: {', '.join(allowed_types)}"
            )
        
        # Read file content
        content = await file.read()
        file_size = len(content)
        
        # Create upload history record
        upload_record = models.HistoryUpload(
            user_id=current_user.id,
            filename=file.filename,
            file_size=file_size,
            file_type=file.content_type or "unknown",
            status="processing"  # Will be updated by processing service
        )
        
        db.add(upload_record)
        db.commit()
        db.refresh(upload_record)
        
        uploaded_files.append({
            "filename": file.filename,
            "id": upload_record.id,
            "size": file_size
        })
    
    return {
        "message": f"Successfully uploaded {len(uploaded_files)} files",
        "files": uploaded_files
    }

@router.delete("/documents/{doc_id}", response_model=dict)
async def delete_document(
    doc_id: int,
    current_user: models.User = Depends(require_admin_role_async),
    db: AsyncSession = Depends(database.get_async_db)
):
    """Delete a document and its chunks (admin only)"""
    result = await db.execute(
        select(models.HistoryUpload).where(models.HistoryUpload.id == doc_id)
    )
    document = result.scalar_one_or_none()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Delete file from disk if exists
    filepath = f"docs/{document.filename}"
    if os.path.exists(filepath):
        os.remove(filepath)
    
    # Delete from database (chunks will be deleted automatically due to cascade)
    await db.delete(document)
    await db.commit()
    
    return {"message": "Document deleted successfully"}

@router.post("/documents/{doc_id}/retry", response_model=dict)
async def retry_document_processing(
    doc_id: int,
    current_user: models.User = Depends(require_admin_role_async),
    db: AsyncSession = Depends(database.get_async_db)
):
    """Retry document processing (admin only)"""
    result = await db.execute(
        select(models.HistoryUpload).where(models.HistoryUpload.id == doc_id)
    )
    document = result.scalar_one_or_none()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Reset status to processing and clear error
    document.status = "processing"
    document.error_message = None
    await db.commit()
    
    # Here you would typically trigger the document processing service
    # For now, we'll just return success
    
    return {"message": "Document processing restarted"}


# DISABLED - Audit service endpoints (audit_service removed)
# These endpoints can be re-enabled if audit_service is needed in the future

# @router.get("/audit/logs")
# async def get_audit_logs(
#     user_id: Optional[int] = None,
#     action: Optional[str] = None,
#     limit: int = 100,
#     current_user: models.User = Depends(require_admin_role_async())
# ):
#     """Get audit logs (Admin only)"""
#     return {"message": "Audit service temporarily disabled"}

# @router.get("/audit/openai-usage")
# async def get_openai_usage(
#     user_id: Optional[int] = None,
#     current_user: models.User = Depends(require_admin_role_async())
# ):
#     """Get OpenAI API usage statistics (Admin only)"""
#     return {"message": "Audit service temporarily disabled"}

# @router.get("/audit/user/{user_id}/activity")
# async def get_user_activity(
#     user_id: int,
#     limit: int = 50,
#     current_user: models.User = Depends(require_admin_role_async())
# ):
#     """Get detailed activity for a specific user (Admin only)"""
#     return {"message": "Audit service temporarily disabled"}


# Health check endpoint
@router.get("/health")
async def admin_health_check():
    """Admin service health check"""
    return {"status": "healthy", "service": "admin"} 