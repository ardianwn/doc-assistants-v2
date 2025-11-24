from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.upload import router as upload_router
from routes.chat import router as chat_router
from routes.auth import router as auth_router
from routes.admin import router as admin_router
from db.database import init_db, init_async_db, ASYNC_AVAILABLE
import timezone_config  # Import timezone configuration
import os
import atexit
from fastapi.staticfiles import StaticFiles

app = FastAPI(
    title="DocAI Backend",
    description="Backend API untuk sistem chat dan upload dokumen dengan role-based access control dan concurrent processing",
    version="1.0.0"
)

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Buat folder untuk simpan dokumen
os.makedirs("docs", exist_ok=True)

@app.on_event("startup")
async def startup_event():
    """Initialize database and warm up models on startup"""
    print("🚀 Starting DocAI Backend with Concurrent Processing...")
    print("🌏 Timezone configured to Asia/Jakarta")
    print("📊 Initializing database...")
    print("⚡ Concurrent processing enabled for chat and upload operations")
    
    # Always initialize sync database
    init_db()  # Create tables with sync engine for compatibility
    
    # Initialize async database if available
    if ASYNC_AVAILABLE:
        await init_async_db()  # Ensure async engine is ready
        print("✅ Database initialized successfully with async support!")
    else:
        print("⚠️ Running in sync-only mode. Install 'asyncpg' for full async support.")
        print("✅ Database initialized successfully (sync mode)!")

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup resources on shutdown"""
    print("🛑 Shutting down DocAI Backend...")
    
    # Cleanup thread pools
    try:
        from routes.upload import cleanup_upload_resources
        cleanup_upload_resources()
        print("✅ Upload resources cleaned up")
    except Exception as e:
        print(f"⚠️ Error cleaning upload resources: {e}")
    
    # Cleanup chat thread pool - DISABLED (thread_pool no longer exists in routes.chat)
    # The chat processing now uses async/await instead of thread pools
    # try:
    #     from routes.chat import thread_pool
    #     thread_pool.shutdown(wait=True)
    #     print("✅ Chat processing resources cleaned up")
    # except Exception as e:
    #     print(f"⚠️ Error cleaning chat resources: {e}")
    
    print("✅ Shutdown complete")

# Include Routes
app.include_router(auth_router, prefix="/auth", tags=["Authentication"])
app.include_router(upload_router, prefix="/upload", tags=["Upload"])
app.include_router(chat_router, prefix="/chat", tags=["Chat"])
app.include_router(admin_router, prefix="/admin", tags=["Admin"])

# Serve uploaded files
os.makedirs("uploads/profile_images", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

@app.get("/")
async def root():
    return {
        "message": "DocAI Backend API",
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
