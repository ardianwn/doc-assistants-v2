from fastapi import APIRouter, Depends, HTTPException, status, Request, UploadFile, File
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from pydantic import BaseModel
from db import models, database
import base64
import os
import pyotp
import qrcode
import io
from utils.auth import (
    verify_password,
    get_password_hash,
    create_access_token,
    get_current_user,
    get_current_user_async,
    create_user_session,
    revoke_session,
    revoke_all_sessions,
    cleanup_expired_sessions,
    extract_device_info,
    extract_session_id_from_token,
    security,
)
from utils.timezone import jakarta_now_naive
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any

router = APIRouter()

# Pydantic Schemas
class RegisterUser(BaseModel):
    username: str
    password: str
    role: str = "user"  # Default to "user"

class LoginUser(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id: int
    username: str
    email: Optional[str] = None
    phone: Optional[str] = None
    profile_image: Optional[str] = None
    role: str
    location: Optional[str] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class SessionResponse(BaseModel):
    id: str
    device_info: Optional[str] = None
    ip_address: Optional[str] = None
    location: Optional[str] = None
    created_at: datetime
    last_active: datetime
    is_current: bool = False

    class Config:
        from_attributes = True

class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user: dict
    session_id: str

# Register endpoint
@router.post("/register")
async def register(user: RegisterUser, db: AsyncSession = Depends(database.get_async_db)):
    # Validate role
    if user.role not in ["user", "admin", "uploader"]:
        raise HTTPException(status_code=400, detail="Role harus 'user', 'admin', atau 'uploader'")
    
    # Check if user already exists
    result = await db.execute(select(models.User).where(models.User.username == user.username))
    existing_user = result.scalar_one_or_none()
    
    if existing_user:
        raise HTTPException(status_code=400, detail="Username sudah terdaftar.")

    hashed_pw = get_password_hash(user.password)
    new_user = models.User(
        username=user.username, 
        password=hashed_pw, 
        role=user.role
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    return {"message": "User berhasil didaftarkan."}

# Login endpoint
@router.post("/login", response_model=LoginResponse)
async def login(
    user: LoginUser, 
    request: Request,
    db: AsyncSession = Depends(database.get_async_db)
):
    # Check user credentials
    result = await db.execute(select(models.User).where(models.User.username == user.username))
    db_user = result.scalar_one_or_none()

    if not db_user or not verify_password(user.password, db_user.password):
        raise HTTPException(status_code=401, detail="Username atau password salah.")
    
    if not db_user.is_active:
        raise HTTPException(status_code=401, detail="User tidak aktif.")

    # Cleanup expired sessions
    await cleanup_expired_sessions(db)
    
    # Create new session - use Jakarta time for database storage
    token_expiry_utc = datetime.utcnow() + timedelta(minutes=30)
    token_expiry_jakarta = jakarta_now_naive() + timedelta(minutes=30)
    session_id = await create_user_session(
        db=db,
        user_id=db_user.id,
        request=request,
        expires_at=token_expiry_jakarta  # Store in Jakarta time for database
    )

    # Update last login time
    db_user.last_login = jakarta_now_naive()
    await db.commit()

    # Create token with session ID - use UTC expiry for JWT
    token, expires_at = create_access_token(
        data={"sub": db_user.username, "role": db_user.role},
        expires_delta=timedelta(minutes=30),
        session_id=session_id
    )
    
    return LoginResponse(
        access_token=token,
        token_type="bearer",
        user={
            "id": db_user.id,
            "username": db_user.username,
            "role": db_user.role
        },
        session_id=session_id
    )

# Protected endpoint
@router.get("/me", response_model=UserResponse)
async def get_me(current_user: models.User = Depends(get_current_user_async)):
    return current_user

# Debug endpoint to test token
@router.get("/debug-token")
async def debug_token(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(database.get_async_db)
):
    """Debug endpoint to check token validity"""
    from utils.auth import verify_token
    
    payload = verify_token(credentials.credentials)
    if payload is None:
        return {"error": "Invalid token", "token_preview": credentials.credentials[:20] + "..."}
    
    return {
        "token_valid": True,
        "payload": payload,
        "username": payload.get("sub"),
        "session_id": payload.get("session_id"),
        "exp": payload.get("exp")
    }

# Session management endpoints
@router.get("/sessions", response_model=List[SessionResponse])
async def get_active_sessions(
    current_user: models.User = Depends(get_current_user_async),
    db: AsyncSession = Depends(database.get_async_db)
):
    """Get all active sessions for current user"""
    result = await db.execute(
        select(models.UserSession).where(
            models.UserSession.user_id == current_user.id,
            models.UserSession.is_active == True,
            models.UserSession.expires_at > jakarta_now_naive()
        ).order_by(models.UserSession.last_active.desc())
    )
    sessions = result.scalars().all()
    
    # Mark current session (this is a bit tricky without current session ID)
    return [
        SessionResponse(
            id=session.id,
            device_info=session.device_info,
            ip_address=session.ip_address,
            location=session.location,
            created_at=session.created_at,
            last_active=session.last_active,
            is_current=False  # We'll update this in frontend
        )
        for session in sessions
    ]

@router.delete("/sessions/{session_id}")
async def revoke_session_endpoint(
    session_id: str,
    current_user: models.User = Depends(get_current_user_async),
    db: AsyncSession = Depends(database.get_async_db)
):
    """Revoke a specific session"""
    success = await revoke_session(db, session_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"message": "Session revoked successfully"}

@router.post("/logout")
async def logout(
    current_user: models.User = Depends(get_current_user_async),
    db: AsyncSession = Depends(database.get_async_db)
):
    """Logout from current session (revoke current session)"""
    # We need to get current session ID from token
    # For now, we'll implement a simple version
    return {"message": "Logged out successfully"}

@router.post("/logout-all")
async def logout_all_devices(
    current_user: models.User = Depends(get_current_user_async),
    db: AsyncSession = Depends(database.get_async_db)
):
    """Logout from all devices (revoke all sessions)"""
    revoked_count = await revoke_all_sessions(db, current_user.id)
    return {"message": f"Logged out from {revoked_count} devices"}

# Admin-only session management endpoints
@router.get("/admin/sessions")
async def get_all_active_sessions(
    current_user: models.User = Depends(get_current_user_async),
    db: AsyncSession = Depends(database.get_async_db)
):
    """Get all active sessions across all users (Admin only)"""
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.execute(
        select(models.UserSession, models.User).join(
            models.User, models.UserSession.user_id == models.User.id
        ).where(
            models.UserSession.is_active == True,
            models.UserSession.expires_at > jakarta_now_naive()
        ).order_by(models.UserSession.last_active.desc())
    )
    
    sessions_with_users = result.all()
    
    return {
        "sessions": [
            {
                "id": session.id,
                "user_id": session.user_id,
                "username": user.username,
                "role": user.role,
                "device_info": session.device_info,
                "ip_address": session.ip_address,
                "user_agent": session.user_agent,
                "created_at": session.created_at.isoformat(),
                "last_activity": session.last_active.isoformat(),
                "is_current": False
            }
            for session, user in sessions_with_users
        ]
    }

@router.post("/admin/revoke-session")
async def admin_revoke_session(
    request: dict,
    current_user: models.User = Depends(get_current_user_async),
    db: AsyncSession = Depends(database.get_async_db)
):
    """Revoke any user session (Admin only)"""
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    
    session_id = request.get("session_id")
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id is required")
    
    # Find the session
    result = await db.execute(
        select(models.UserSession).where(models.UserSession.id == session_id)
    )
    session = result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Revoke the session
    session.is_active = False
    session.revoked_at = jakarta_now_naive()
    await db.commit()
    
    return {"message": "Session revoked successfully"}

# Location Update Schema
class LocationUpdate(BaseModel):
    location: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    accuracy: Optional[float] = None

# Profile Update Schema
class ProfileUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    profile_image: Optional[str] = None
    location: Optional[str] = None

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str
    confirm_new_password: str

class SecuritySettingsRequest(BaseModel):
    two_factor_enabled: Optional[bool] = None
    session_timeout: Optional[int] = None
    password_policy: Optional[Dict[str, Any]] = None
    login_attempts_limit: Optional[int] = None
    data_retention_days: Optional[int] = None
    ip_whitelist: Optional[List[str]] = None

class TwoFactorSetupRequest(BaseModel):
    token: str

class DataExportRequest(BaseModel):
    format: str = "json"  # json, csv
    include_chat_history: bool = True
    include_upload_history: bool = True
    include_profile_data: bool = True

@router.post("/update-location")
async def update_location(
    location_data: LocationUpdate,
    current_user: models.User = Depends(get_current_user_async),
    db: AsyncSession = Depends(database.get_async_db),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Update the location for the current user's active session
    """
    try:
        # Get the current session ID from the token
        session_id = extract_session_id_from_token(credentials.credentials)
        print(f"DEBUG: Extracted session_id: {session_id}")
        print(f"DEBUG: Current user ID: {current_user.id}")
        print(f"DEBUG: Current user username: {current_user.username}")
        
        if not session_id:
            raise HTTPException(status_code=400, detail="No active session found")
        
        # Find the current session
        result = await db.execute(
            select(models.UserSession).where(
                models.UserSession.id == session_id,
                models.UserSession.user_id == current_user.id,
                models.UserSession.is_active == True
            )
        )
        session = result.scalar_one_or_none()
        print(f"DEBUG: Found session with specific ID: {session}")
        
        if not session:
            # Try to find any active session for this user if the specific session is not found
            print("DEBUG: Specific session not found, looking for any active session")
            result = await db.execute(
                select(models.UserSession).where(
                    models.UserSession.user_id == current_user.id,
                    models.UserSession.is_active == True
                ).order_by(models.UserSession.last_active.desc())
            )
            session = result.scalar_one_or_none()
            print(f"DEBUG: Found any active session: {session}")
            
            if not session:
                raise HTTPException(status_code=404, detail="No active session found for user")
        
        # Update the session location
        print(f"DEBUG: Updating session location to: {location_data.location}")
        session.location = location_data.location
        session.last_active = jakarta_now_naive()
        
        # Also persist to user record for cross-session fallback
        current_user.location = location_data.location

        await db.commit()
        print("DEBUG: Location update committed successfully")
        
        return {
            "message": "Location updated successfully",
            "location": location_data.location
        }
        
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update location: {str(e)}")

@router.put("/update-profile")
async def update_profile(
    profile_data: ProfileUpdate,
    current_user: models.User = Depends(get_current_user_async),
    db: AsyncSession = Depends(database.get_async_db)
):
    """
    Update the current user's profile information
    """
    try:
        # Check if username is being changed and if it's already taken
        if profile_data.username and profile_data.username != current_user.username:
            result = await db.execute(
                select(models.User).where(models.User.username == profile_data.username)
            )
            existing_user = result.scalar_one_or_none()
            if existing_user:
                raise HTTPException(status_code=400, detail="Username already taken")
            current_user.username = profile_data.username
        
        # Check if email is being changed and if it's already taken
        if profile_data.email and profile_data.email != current_user.email:
            result = await db.execute(
                select(models.User).where(models.User.email == profile_data.email)
            )
            existing_user = result.scalar_one_or_none()
            if existing_user:
                raise HTTPException(status_code=400, detail="Email already taken")
            current_user.email = profile_data.email
        
        # Update other fields
        if profile_data.phone is not None:
            current_user.phone = profile_data.phone
        
        if profile_data.profile_image is not None:
            current_user.profile_image = profile_data.profile_image
        
        if profile_data.location is not None:
            current_user.location = profile_data.location
        
        await db.commit()
        
        return {
            "message": "Profile updated successfully",
            "user": {
                "id": current_user.id,
                "username": current_user.username,
                "email": current_user.email,
                "phone": current_user.phone,
                "profile_image": current_user.profile_image,
                "role": current_user.role,
                "location": current_user.location
            }
        }
        
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update profile: {str(e)}")

@router.post("/upload-profile-image")
async def upload_profile_image(
    request: Request,
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user_async),
    db: AsyncSession = Depends(database.get_async_db)
):
    """
    Upload profile image for the current user (store on disk, save URL in DB)
    """
    try:
        # Validate file type
        if not file.content_type or not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")

        # Read file content (UploadFile does not expose size; validate after read)
        content = await file.read()

        # Validate file size (max 5MB)
        max_bytes = 5 * 1024 * 1024
        if len(content) > max_bytes:
            raise HTTPException(status_code=400, detail="File size must be less than 5MB")

        # Ensure upload directory exists
        upload_dir = os.path.join("uploads", "profile_images")
        os.makedirs(upload_dir, exist_ok=True)

        # Build safe filename
        ext = os.path.splitext(file.filename or "")[1].lower() or ".png"
        filename = f"user_{current_user.id}_{int(datetime.utcnow().timestamp())}{ext}"
        filepath = os.path.join(upload_dir, filename)

        # Write file to disk
        with open(filepath, "wb") as f:
            f.write(content)

        # Public URL (absolute)
        public_path = f"/uploads/profile_images/{filename}"
        base_url = str(request.base_url).rstrip('/')
        public_url = f"{base_url}{public_path}"

        # Update user profile image URL
        current_user.profile_image = public_url
        await db.commit()

        return {
            "message": "Profile image uploaded successfully",
            "profile_image": public_url
        }

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to upload profile image: {str(e)}")

@router.post("/change-password")
async def change_password(
    payload: ChangePasswordRequest,
    current_user: models.User = Depends(get_current_user_async),
    db: AsyncSession = Depends(database.get_async_db)
):
    """
    Change the current user's password after verifying the current password.
    """
    try:
        if payload.new_password != payload.confirm_new_password:
            raise HTTPException(status_code=400, detail="New passwords do not match")

        # Verify current password
        if not verify_password(payload.current_password, current_user.password):
            raise HTTPException(status_code=400, detail="Current password is incorrect")

        # Update to new password
        hashed = get_password_hash(payload.new_password)
        current_user.password = hashed
        await db.commit()

        # Update password change timestamp
        current_user.password_changed_at = jakarta_now_naive()
        await db.commit()

        # Log password change
        await log_audit_event(
            db=db,
            user_id=current_user.id,
            action="password_change",
            resource="user",
            details={"user_id": current_user.id, "username": current_user.username}
        )

        return {"message": "Password changed successfully"}
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to change password: {str(e)}")

# Security Settings Endpoints
@router.get("/security-settings")
async def get_security_settings(
    current_user: models.User = Depends(get_current_user_async),
    db: AsyncSession = Depends(database.get_async_db)
):
    """Get current user's security settings"""
    try:
        # Get default security settings
        default_settings = {
            "two_factor_enabled": current_user.two_factor_enabled or False,
            "session_timeout": 30,  # minutes
            "password_policy": {
                "min_length": 8,
                "require_uppercase": True,
                "require_lowercase": True,
                "require_numbers": True,
                "require_special": True
            },
            "login_attempts_limit": 5,
            "data_retention_days": 365,
            "ip_whitelist": current_user.ip_whitelist or []
        }

        # Get system-wide security settings
        settings_query = await db.execute(
            select(models.SecuritySettings)
        )
        system_settings = settings_query.scalars().all()
        
        for setting in system_settings:
            if setting.setting_name in default_settings:
                default_settings[setting.setting_name] = setting.setting_value

        return {"settings": default_settings}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get security settings: {str(e)}")

@router.put("/security-settings")
async def update_security_settings(
    settings: SecuritySettingsRequest,
    current_user: models.User = Depends(get_current_user_async),
    db: AsyncSession = Depends(database.get_async_db)
):
    """Update user's security settings"""
    try:
        # Update user-specific settings
        if settings.two_factor_enabled is not None:
            current_user.two_factor_enabled = settings.two_factor_enabled
        
        if settings.ip_whitelist is not None:
            current_user.ip_whitelist = settings.ip_whitelist

        # Update system-wide settings
        if settings.session_timeout is not None:
            await update_system_setting(db, "session_timeout", settings.session_timeout)
        
        if settings.password_policy is not None:
            await update_system_setting(db, "password_policy", settings.password_policy)
        
        if settings.login_attempts_limit is not None:
            await update_system_setting(db, "login_attempts_limit", settings.login_attempts_limit)
        
        if settings.data_retention_days is not None:
            await update_system_setting(db, "data_retention_days", settings.data_retention_days)

        await db.commit()

        # Log settings update
        await log_audit_event(
            db=db,
            user_id=current_user.id,
            action="security_settings_update",
            resource="user",
            details={"user_id": current_user.id, "settings_updated": settings.dict(exclude_unset=True)}
        )

        return {"message": "Security settings updated successfully"}
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update security settings: {str(e)}")

@router.post("/two-factor/setup")
async def setup_two_factor(
    current_user: models.User = Depends(get_current_user_async),
    db: AsyncSession = Depends(database.get_async_db)
):
    """Generate 2FA secret and QR code"""
    try:
        # Generate secret
        secret = pyotp.random_base32()
        
        # Create TOTP object
        totp = pyotp.TOTP(secret)
        
        # Generate QR code
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(totp.provisioning_uri(
            name=current_user.username,
            issuer_name="DocAI"
        ))
        qr.make(fit=True)
        
        # Convert to base64
        img = qr.make_image(fill_color="black", back_color="white")
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        qr_code = base64.b64encode(buffer.getvalue()).decode()
        
        # Store secret temporarily (not enabled yet)
        current_user.two_factor_secret = secret
        await db.commit()

        return {
            "secret": secret,
            "qr_code": f"data:image/png;base64,{qr_code}",
            "backup_codes": generate_backup_codes()
        }
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to setup 2FA: {str(e)}")

@router.post("/two-factor/verify")
async def verify_two_factor(
    request: TwoFactorSetupRequest,
    current_user: models.User = Depends(get_current_user_async),
    db: AsyncSession = Depends(database.get_async_db)
):
    """Verify 2FA token and enable 2FA"""
    try:
        if not current_user.two_factor_secret:
            raise HTTPException(status_code=400, detail="2FA not set up")
        
        # Verify token
        totp = pyotp.TOTP(current_user.two_factor_secret)
        if not totp.verify(request.token, valid_window=1):
            raise HTTPException(status_code=400, detail="Invalid 2FA token")
        
        # Enable 2FA
        current_user.two_factor_enabled = True
        await db.commit()

        # Log 2FA enablement
        await log_audit_event(
            db=db,
            user_id=current_user.id,
            action="two_factor_enabled",
            resource="user",
            details={"user_id": current_user.id}
        )

        return {"message": "2FA enabled successfully"}
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to verify 2FA: {str(e)}")

@router.post("/two-factor/disable")
async def disable_two_factor(
    request: TwoFactorSetupRequest,
    current_user: models.User = Depends(get_current_user_async),
    db: AsyncSession = Depends(database.get_async_db)
):
    """Disable 2FA"""
    try:
        if not current_user.two_factor_enabled:
            raise HTTPException(status_code=400, detail="2FA not enabled")
        
        # Verify token
        totp = pyotp.TOTP(current_user.two_factor_secret)
        if not totp.verify(request.token, valid_window=1):
            raise HTTPException(status_code=400, detail="Invalid 2FA token")
        
        # Disable 2FA
        current_user.two_factor_enabled = False
        current_user.two_factor_secret = None
        await db.commit()

        # Log 2FA disablement
        await log_audit_event(
            db=db,
            user_id=current_user.id,
            action="two_factor_disabled",
            resource="user",
            details={"user_id": current_user.id}
        )

        return {"message": "2FA disabled successfully"}
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to disable 2FA: {str(e)}")

@router.post("/data-export")
async def export_user_data(
    request: DataExportRequest,
    current_user: models.User = Depends(get_current_user_async),
    db: AsyncSession = Depends(database.get_async_db)
):
    """Export user data"""
    try:
        export_data = {}
        
        if request.include_profile_data:
            export_data["profile"] = {
                "id": current_user.id,
                "username": current_user.username,
                "email": current_user.email,
                "phone": current_user.phone,
                "role": current_user.role,
                "location": current_user.location,
                "created_at": current_user.created_at.isoformat(),
                "last_login": current_user.last_login.isoformat() if current_user.last_login else None
            }
        
        if request.include_chat_history:
            chat_query = await db.execute(
                select(models.HistoryChat)
                .where(models.HistoryChat.user_id == current_user.id)
                .order_by(models.HistoryChat.created_at.desc())
            )
            chat_history = chat_query.scalars().all()
            export_data["chat_history"] = [
                {
                    "id": chat.id,
                    "session_id": chat.session_id,
                    "question": chat.question,
                    "answer": chat.answer,
                    "created_at": chat.created_at.isoformat()
                }
                for chat in chat_history
            ]
        
        if request.include_upload_history:
            upload_query = await db.execute(
                select(models.HistoryUpload)
                .where(models.HistoryUpload.user_id == current_user.id)
                .order_by(models.HistoryUpload.uploaded_at.desc())
            )
            upload_history = upload_query.scalars().all()
            export_data["upload_history"] = [
                {
                    "id": upload.id,
                    "filename": upload.filename,
                    "file_type": upload.file_type,
                    "file_size": upload.file_size,
                    "status": upload.status,
                    "uploaded_at": upload.uploaded_at.isoformat(),
                    "vector_count": upload.vector_count
                }
                for upload in upload_history
            ]

        # Log data export
        await log_audit_event(
            db=db,
            user_id=current_user.id,
            action="data_export",
            resource="user",
            details={"format": request.format, "included_data": request.dict()}
        )

        return {"data": export_data, "exported_at": jakarta_now_naive().isoformat()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to export data: {str(e)}")

@router.get("/audit-logs")
async def get_audit_logs(
    current_user: models.User = Depends(get_current_user_async),
    db: AsyncSession = Depends(database.get_async_db),
    limit: int = 50,
    offset: int = 0
):
    """Get user's audit logs"""
    try:
        # Only admins can view audit logs
        if current_user.role != "admin":
            raise HTTPException(status_code=403, detail="Access denied")
        
        logs_query = await db.execute(
            select(models.AuditLog)
            .order_by(models.AuditLog.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        logs = logs_query.scalars().all()
        
        return {
            "logs": [
                {
                    "id": log.id,
                    "user_id": log.user_id,
                    "action": log.action,
                    "resource": log.resource,
                    "details": log.details,
                    "ip_address": log.ip_address,
                    "created_at": log.created_at.isoformat()
                }
                for log in logs
            ]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get audit logs: {str(e)}")

# Helper functions
async def update_system_setting(db: AsyncSession, setting_name: str, setting_value: Any):
    """Update or create system-wide security setting"""
    try:
        # Check if setting exists
        existing = await db.execute(
            select(models.SecuritySettings)
            .where(models.SecuritySettings.setting_name == setting_name)
        )
        setting = existing.scalar_one_or_none()
        
        if setting:
            setting.setting_value = setting_value
            setting.updated_at = jakarta_now_naive()
        else:
            new_setting = models.SecuritySettings(
                setting_name=setting_name,
                setting_value=setting_value,
                description=f"System setting for {setting_name}"
            )
            db.add(new_setting)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update system setting: {str(e)}")

async def log_audit_event(
    db: AsyncSession,
    user_id: int,
    action: str,
    resource: str,
    details: Dict[str, Any] = None,
    ip_address: str = None,
    user_agent: str = None
):
    """Log audit event"""
    try:
        audit_log = models.AuditLog(
            user_id=user_id,
            action=action,
            resource=resource,
            details=details or {},
            ip_address=ip_address,
            user_agent=user_agent
        )
        db.add(audit_log)
        await db.commit()
    except Exception as e:
        # Don't fail the main operation if audit logging fails
        print(f"Failed to log audit event: {str(e)}")

def generate_backup_codes() -> List[str]:
    """Generate backup codes for 2FA"""
    import secrets
    return [secrets.token_hex(4).upper() for _ in range(10)]