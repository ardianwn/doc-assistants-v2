"""
Timezone configuration for the entire application
Sets up Jakarta timezone as the default timezone for the application
"""
import os
import pytz
from datetime import datetime

# Set Jakarta timezone as the application default
JAKARTA_TZ = pytz.timezone('Asia/Jakarta')
os.environ['TZ'] = 'Asia/Jakarta'

def set_jakarta_timezone():
    """
    Set Jakarta timezone as the default for the application
    Call this function early in your application startup
    """
    # This will affect the default timezone for the entire application
    os.environ['TZ'] = 'Asia/Jakarta'
    
    # Print confirmation
    now_jakarta = datetime.now(JAKARTA_TZ)
    print(f"🌏 Timezone set to Asia/Jakarta - Current time: {now_jakarta.strftime('%Y-%m-%d %H:%M:%S %Z')}")
    
    return JAKARTA_TZ

# Auto-initialize when module is imported
set_jakarta_timezone()
