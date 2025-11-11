from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base
from utils.timezone import jakarta_now_naive

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    password = Column(String(255), nullable=False)  # hashed
    email = Column(String(255), nullable=True, unique=True, index=True)  # Email address
    phone = Column(String(20), nullable=True)  # Phone number
    # Store profile image as data URL (base64). Needs TEXT due to size.
    profile_image = Column(Text, nullable=True)
    role = Column(String(20), default="user")  # "user" / "admin" / "uploader"
    location = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=jakarta_now_naive)
    last_login = Column(DateTime, nullable=True)  # Track last login time
    
    # Security settings
    two_factor_enabled = Column(Boolean, default=False)
    two_factor_secret = Column(String(255), nullable=True)
    password_changed_at = Column(DateTime, nullable=True)
    failed_login_attempts = Column(Integer, default=0)
    locked_until = Column(DateTime, nullable=True)
    ip_whitelist = Column(JSON, nullable=True)  # List of allowed IP addresses
    
    # Relationships
    chat_history = relationship("HistoryChat", back_populates="user", cascade="all, delete-orphan")
    upload_history = relationship("HistoryUpload", back_populates="user", cascade="all, delete-orphan")
    user_sessions = relationship("UserSession", back_populates="user", cascade="all, delete-orphan")

class UserSession(Base):
    __tablename__ = "user_sessions"
    id = Column(String(255), primary_key=True, index=True)  # session_id from JWT
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    device_info = Column(Text, nullable=True)  # Browser, OS, Device info
    ip_address = Column(String(45), nullable=True)  # Support IPv6
    user_agent = Column(Text, nullable=True)  # Full user agent string
    location = Column(String(255), nullable=True)  # City/Country if available
    created_at = Column(DateTime, default=jakarta_now_naive)
    last_active = Column(DateTime, default=jakarta_now_naive)
    expires_at = Column(DateTime, nullable=False)
    is_active = Column(Boolean, default=True)
    
    # Relationship
    user = relationship("User", back_populates="user_sessions")

class HistoryChat(Base):
    __tablename__ = "history_chat"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    session_id = Column(String(255), nullable=True, index=True)  # NEW: For grouping chat sessions
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)
    created_at = Column(DateTime, default=jakarta_now_naive)
    
    # Relationship
    user = relationship("User", back_populates="chat_history")

class HistoryUpload(Base):
    __tablename__ = "history_upload"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    filename = Column(String(255), nullable=False)
    file_type = Column(String(50), nullable=False)
    file_size = Column(Integer)  # in bytes
    status = Column(String(20), default="processing")  # uploaded, processing, ready, error
    uploaded_at = Column(DateTime, default=jakarta_now_naive)
    vector_count = Column(Integer, nullable=True)  # Number of vectors generated
    
    # Document processing details
    chunk_count = Column(Integer, nullable=True, default=0)  # Number of chunks
    page_count = Column(Integer, nullable=True)  # Number of pages (for PDF/DOCX)
    processed_at = Column(DateTime, nullable=True)  # Last processing time
    error_message = Column(Text, nullable=True)  # Error details if failed
    
    # Processing parameters
    chunk_size = Column(Integer, default=800)  # Chunking parameter
    chunk_overlap = Column(Integer, default=200)  # Chunking overlap
    embedding_model = Column(String(100), nullable=True)  # Model used for embedding
    
    # Relationship
    user = relationship("User", back_populates="upload_history")
    chunks = relationship("DocumentChunk", back_populates="document", cascade="all, delete-orphan")

class DocumentChunk(Base):
    __tablename__ = "document_chunks"
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("history_upload.id"), nullable=False)
    chunk_index = Column(Integer, nullable=False)  # Order of chunk
    content = Column(Text, nullable=False)  # Chunk text content
    token_count = Column(Integer, nullable=True)  # Number of tokens
    char_count = Column(Integer, nullable=True)  # Character count
    created_at = Column(DateTime, default=jakarta_now_naive)
    
    # Relationship
    document = relationship("HistoryUpload", back_populates="chunks")

class SecuritySettings(Base):
    __tablename__ = "security_settings"
    id = Column(Integer, primary_key=True, index=True)
    setting_name = Column(String(100), unique=True, nullable=False)
    setting_value = Column(JSON, nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=jakarta_now_naive)
    updated_at = Column(DateTime, default=jakarta_now_naive, onupdate=jakarta_now_naive)

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(100), nullable=False)  # login, logout, password_change, etc.
    resource = Column(String(100), nullable=True)  # user, settings, etc.
    details = Column(JSON, nullable=True)  # Additional details
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)
    created_at = Column(DateTime, default=jakarta_now_naive)
    
    # Relationship
    user = relationship("User")
