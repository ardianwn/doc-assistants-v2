"""
Timezone utilities for Jakarta timezone handling
"""
from datetime import datetime
import pytz

# Jakarta timezone
JAKARTA_TZ = pytz.timezone('Asia/Jakarta')

def get_jakarta_time() -> datetime:
    """Get current time in Jakarta timezone"""
    return datetime.now(JAKARTA_TZ)

def convert_to_jakarta(utc_datetime: datetime) -> datetime:
    """Convert UTC datetime to Jakarta timezone"""
    if utc_datetime.tzinfo is None:
        # If timezone-naive, assume it's UTC
        utc_datetime = pytz.utc.localize(utc_datetime)
    return utc_datetime.astimezone(JAKARTA_TZ)

def convert_to_utc(jakarta_datetime: datetime) -> datetime:
    """Convert Jakarta datetime to UTC"""
    if jakarta_datetime.tzinfo is None:
        # If timezone-naive, assume it's Jakarta time
        jakarta_datetime = JAKARTA_TZ.localize(jakarta_datetime)
    return jakarta_datetime.astimezone(pytz.utc)

def jakarta_now_naive() -> datetime:
    """Get current Jakarta time as timezone-naive datetime (for database)"""
    return get_jakarta_time().replace(tzinfo=None)

def format_jakarta_time(dt: datetime, format_str: str = "%Y-%m-%d %H:%M:%S") -> str:
    """Format datetime in Jakarta timezone"""
    if dt.tzinfo is None:
        # Assume UTC if no timezone info
        dt = pytz.utc.localize(dt)
    jakarta_dt = dt.astimezone(JAKARTA_TZ)
    return jakarta_dt.strftime(format_str)
