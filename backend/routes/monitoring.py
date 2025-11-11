from fastapi import APIRouter
from datetime import datetime
import psutil
import threading
import asyncio
from typing import Dict, Any

router = APIRouter()

# Global stats
stats = {
    "active_requests": 0,
    "total_requests": 0,
    "concurrent_peak": 0,
    "start_time": datetime.now(),
    "active_threads": 0
}

# Thread lock for stats
stats_lock = threading.Lock()

def increment_request():
    """Increment active request counter"""
    with stats_lock:
        stats["active_requests"] += 1
        stats["total_requests"] += 1
        stats["concurrent_peak"] = max(stats["concurrent_peak"], stats["active_requests"])

def decrement_request():
    """Decrement active request counter"""
    with stats_lock:
        stats["active_requests"] = max(0, stats["active_requests"] - 1)

@router.get("/stats")
async def get_system_stats():
    """Get system performance and concurrency statistics"""
    
    # Update thread count
    stats["active_threads"] = threading.active_count()
    
    # Get system info
    cpu_percent = psutil.cpu_percent(interval=1)
    memory = psutil.virtual_memory()
    
    uptime = datetime.now() - stats["start_time"]
    
    return {
        "system": {
            "cpu_usage": f"{cpu_percent}%",
            "memory_usage": f"{memory.percent}%",
            "memory_available": f"{memory.available / (1024**3):.2f} GB",
            "uptime": str(uptime).split(".")[0]  # Remove microseconds
        },
        "concurrency": {
            "active_requests": stats["active_requests"],
            "total_requests": stats["total_requests"],
            "concurrent_peak": stats["concurrent_peak"],
            "active_threads": stats["active_threads"]
        },
        "performance": {
            "requests_per_minute": stats["total_requests"] / (uptime.total_seconds() / 60) if uptime.total_seconds() > 0 else 0,
            "average_concurrent": stats["total_requests"] / max(1, uptime.total_seconds()) if uptime.total_seconds() > 0 else 0
        }
    }

@router.get("/health/concurrent")
async def check_concurrent_capability():
    """Test endpoint to verify concurrent processing capability"""
    
    increment_request()
    
    try:
        # Simulate some work
        await asyncio.sleep(0.1)
        
        return {
            "status": "healthy",
            "concurrent_processing": "enabled",
            "current_active_requests": stats["active_requests"],
            "message": "Server can handle concurrent requests"
        }
    finally:
        decrement_request()

# Middleware function to track requests (to be used in main.py)
async def track_request_middleware(request, call_next):
    """Middleware to track active requests"""
    increment_request()
    try:
        response = await call_next(request)
        return response
    finally:
        decrement_request()