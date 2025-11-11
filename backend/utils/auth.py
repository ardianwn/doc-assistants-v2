from passlib.context import CryptContext
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from db import models, database
from utils.timezone import get_jakarta_time, jakarta_now_naive
import os
import uuid
import user_agents
import traceback

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT settings
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-this")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Security scheme
security = HTTPBearer()

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None, session_id: Optional[str] = None):
    to_encode = data.copy()
    if expires_delta:
        # Use UTC time for JWT standard compliance
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    # Add session ID to token payload
    if session_id:
        to_encode.update({"session_id": session_id})
    
    to_encode.update({"exp": expire})  # JWT expects datetime, not timestamp
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt, expire

def verify_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            return None
        return payload
    except JWTError as e:
        print(f"JWT Error: {e}")
        return None
    except Exception as e:
        print(f"Token verification error: {e}")
        traceback.print_exc()
        return None

async def get_current_user_async(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(database.get_async_db)
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    payload = verify_token(credentials.credentials)
    if payload is None:
        raise credentials_exception
    
    username: str = payload.get("sub")
    session_id: str = payload.get("session_id")
    
    if username is None:
        raise credentials_exception
    
    # Check user exists
    result = await db.execute(select(models.User).where(models.User.username == username))
    user = result.scalar_one_or_none()
    
    if user is None:
        raise credentials_exception
    
    # Check if session is still valid (if session_id exists in token)
    if session_id:
        session_result = await db.execute(
            select(models.UserSession).where(
                models.UserSession.id == session_id,
                models.UserSession.user_id == user.id,
                models.UserSession.is_active == True,
                models.UserSession.expires_at > jakarta_now_naive()
            )
        )
        session = session_result.scalar_one_or_none()
        
        if session is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session expired or invalid",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Update last active time
        session.last_active = jakarta_now_naive()
        await db.commit()
    
    return user

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(database.get_db)
):
    """Backward compatibility for sync operations"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    payload = verify_token(credentials.credentials)
    if payload is None:
        raise credentials_exception
    
    username: str = payload.get("sub")
    if username is None:
        raise credentials_exception
    
    user = db.query(models.User).filter(models.User.username == username).first()
    if user is None:
        raise credentials_exception
    
    return user

def require_role(required_role: str):
    """Decorator to require specific role"""
    def role_checker(current_user: models.User = Depends(get_current_user)):
        if current_user.role != required_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role: {required_role}"
            )
        return current_user
    return role_checker

def require_user_role():
    """Require user role (for chat functionality)"""
    return require_role("user")

def require_admin_role():
    """Require admin role (for upload functionality)"""
    return require_role("admin")

def require_user_role_async():
    """Require user role (async version)"""
    return require_role_async("user")

def require_admin_role_async():
    """Require admin role (async version)"""
    return require_role_async("admin")

def require_role_async(required_role: str):
    """Async decorator to require specific role"""
    async def role_checker(current_user: models.User = Depends(get_current_user_async)):
        if current_user.role != required_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role: {required_role}"
            )
        return current_user
    return role_checker

def extract_device_info(request: Request) -> Dict[str, Any]:
    """Extract device information from request"""
    user_agent_string = request.headers.get("user-agent", "Unknown")
    user_agent = user_agents.parse(user_agent_string)
    
    # Get client IP (handle proxy headers)
    client_ip = request.client.host
    if "x-forwarded-for" in request.headers:
        client_ip = request.headers["x-forwarded-for"].split(",")[0].strip()
    elif "x-real-ip" in request.headers:
        client_ip = request.headers["x-real-ip"]
    
    device_info = {
        "browser": f"{user_agent.browser.family} {user_agent.browser.version_string}",
        "os": f"{user_agent.os.family} {user_agent.os.version_string}",
        "device": user_agent.device.family if user_agent.device.family != "Other" else "Desktop",
        "is_mobile": user_agent.is_mobile,
        "is_tablet": user_agent.is_tablet,
        "is_bot": user_agent.is_bot
    }
    
    return {
        "device_info": f"{device_info['browser']} on {device_info['os']} ({device_info['device']})",
        "ip_address": client_ip,
        "user_agent": user_agent_string,
        "is_mobile": device_info["is_mobile"]
    }

async def create_user_session(
    db: AsyncSession,
    user_id: int,
    request: Request,
    expires_at: datetime
) -> str:
    """Create a new user session"""
    session_id = str(uuid.uuid4())
    device_data = extract_device_info(request)
    
    user_session = models.UserSession(
        id=session_id,
        user_id=user_id,
        device_info=device_data["device_info"],
        ip_address=device_data["ip_address"],
        user_agent=device_data["user_agent"],
        expires_at=expires_at,
        created_at=jakarta_now_naive(),
        last_active=jakarta_now_naive(),
        is_active=True
    )
    
    db.add(user_session)
    await db.commit()
    
    return session_id

async def revoke_session(db: AsyncSession, session_id: str, user_id: int) -> bool:
    """Revoke a specific user session"""
    result = await db.execute(
        update(models.UserSession)
        .where(
            models.UserSession.id == session_id,
            models.UserSession.user_id == user_id
        )
        .values(is_active=False)
    )
    await db.commit()
    return result.rowcount > 0

async def revoke_all_sessions(db: AsyncSession, user_id: int, exclude_session_id: Optional[str] = None) -> int:
    """Revoke all sessions for a user (optionally excluding current session)"""
    query = update(models.UserSession).where(
        models.UserSession.user_id == user_id,
        models.UserSession.is_active == True
    ).values(is_active=False)
    
    if exclude_session_id:
        query = query.where(models.UserSession.id != exclude_session_id)
    
    result = await db.execute(query)
    await db.commit()
    return result.rowcount

async def cleanup_expired_sessions(db: AsyncSession) -> int:
    """Clean up expired sessions"""
    current_time = jakarta_now_naive()
    result = await db.execute(
        update(models.UserSession)
        .where(models.UserSession.expires_at < current_time)
        .values(is_active=False)
    )
    await db.commit()
    return result.rowcount

def get_current_session_id(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Optional[str]:
    """Extract session ID from JWT token"""
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        session_id: str = payload.get("session_id")
        return session_id
    except JWTError:
        return None

def extract_session_id_from_token(token: str) -> Optional[str]:
    """Extract session ID from JWT token string"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        session_id: str = payload.get("session_id")
        return session_id
    except JWTError:
        return None