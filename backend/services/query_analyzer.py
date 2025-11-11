"""
Query Analyzer Service
Menganalisis jenis query untuk menentukan strategi retrieval
"""

import re
from typing import List, Optional


def is_comparative_query(query: str) -> bool:
    """
    Detect if query requires comparing data across multiple dates
    
    Examples:
        "paling baik/buruk" → True
        "lebih stabil" → True
        "tren" → True
        "perubahan" → True
        "bandingkan" → True
    """
    query_lower = query.lower()
    
    comparative_keywords = [
        # Indonesian
        r"paling\s+(baik|buruk|tinggi|rendah|efisien|stabil)",
        r"lebih\s+(baik|buruk|tinggi|rendah|efisien|stabil)",
        r"tren\s+",
        r"perubahan\s+",
        r"bandingkan",
        r"perbandingan",
        r"mana\s+yang\s+(lebih|paling)",
        r"tertinggi",
        r"terendah",
        r"terbaik",
        r"terburuk",
        # English
        r"best|worst|highest|lowest",
        r"better|worse|more|less",
        r"trend",
        r"change|changes",
        r"compare|comparison",
        r"which\s+(?:is|was)\s+(?:better|worse|more|less)",
    ]
    
    for pattern in comparative_keywords:
        if re.search(pattern, query_lower):
            return True
    
    return False


def extract_month_year_context(query: str) -> Optional[dict]:
    """
    Extract month and year from query to generate date range
    
    Examples:
        "... di Maret 2025" → {"month": 3, "year": 2025}
        "... pada March" → {"month": 3, "year": 2025}  # assume current year
        "laporan tanggal berapa" without month → {"month": 3, "year": 2025}  # assume March 2025
    """
    query_lower = query.lower()
    
    # Patterns for month + year
    patterns = [
        # Indonesian
        r"(?:di|pada|bulan)\s+(januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember)\s+(\d{4})",
        r"(januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember)\s+(\d{4})",
        # English
        r"(?:in|on)\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})",
        r"(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})",
        # Month only (assume 2025)
        r"(?:di|pada|bulan)\s+(januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember)(?!\s+\d{4})",
        r"(?:in|on)\s+(january|february|march|april|may|june|july|august|september|october|november|december)(?!\s+\d{4})"
    ]
    
    month_map_id = {
        "januari": 1, "februari": 2, "maret": 3, "april": 4,
        "mei": 5, "juni": 6, "juli": 7, "agustus": 8,
        "september": 9, "oktober": 10, "november": 11, "desember": 12
    }
    
    month_map_en = {
        "january": 1, "february": 2, "march": 3, "april": 4,
        "may": 5, "june": 6, "july": 7, "august": 8,
        "september": 9, "october": 10, "november": 11, "december": 12
    }
    
    for pattern in patterns:
        match = re.search(pattern, query_lower)
        if match:
            month_str = match.group(1)
            
            # Get year if exists
            try:
                year = int(match.group(2))
            except (IndexError, ValueError):
                year = 2025  # Default to 2025
            
            # Get month number
            month = month_map_id.get(month_str) or month_map_en.get(month_str)
            
            if month:
                return {"month": month, "year": year}
    
    # If query mentions "laporan" or "report" but no specific month/date
    # Assume March 2025 (common context based on user queries)
    if re.search(r"laporan|report|shift", query_lower):
        # Check if there's any year mentioned
        year_match = re.search(r"20\d{2}", query_lower)
        if year_match:
            year = int(year_match.group(0))
        else:
            year = 2025
        
        # Default to March (month 3) based on context
        return {"month": 3, "year": year}
    
    return None


def generate_full_month_dates(month: int, year: int) -> List[str]:
    """
    Generate all dates for a given month
    
    Args:
        month: Month number (1-12)
        year: Year (e.g., 2025)
    
    Returns:
        List of date strings in YYYY-MM-DD format
    """
    import calendar
    
    # Get number of days in month
    num_days = calendar.monthrange(year, month)[1]
    
    # Generate all dates
    dates = []
    for day in range(1, num_days + 1):
        date_str = f"{year}-{str(month).zfill(2)}-{str(day).zfill(2)}"
        dates.append(date_str)
    
    return dates


def analyze_query_and_get_dates(query: str, parsed_dates: List[str]) -> tuple[List[str], str]:
    """
    Analyze query and determine which dates to retrieve
    
    Returns:
        (dates_to_retrieve, retrieval_strategy)
        
    Strategies:
        - "explicit": Use explicitly parsed dates from query
        - "month_range": Query is comparative, use full month range
        - "all_available": Comparative query without period - use all available dates from DB
        - "latest": Query asks for latest/last/most recent data
        - "no_filter": No dates, retrieve without filter
    """
    
    query_lower = query.lower()
    
    # If dates already parsed, use them
    if parsed_dates and len(parsed_dates) > 0:
        return parsed_dates, "explicit"
    
    # Check if query asks for LATEST/LAST/MOST RECENT data
    latest_keywords = [
        r"\bterakhir\b",
        r"\bterbaru\b",
        r"\blast\b",
        r"\blatest\b",
        r"\bmost recent\b",
        r"\brecent\b",
        r"\bpaling baru\b",
        r"last sync",
        r"sync terakhir",
        r"sinkronisasi terakhir"
    ]
    
    for pattern in latest_keywords:
        if re.search(pattern, query_lower):
            # Return empty with "latest" strategy
            # Backend will provide the most recent date(s) from database
            return [], "latest"
    
    # Check if query is comparative/analytical
    if is_comparative_query(query):
        # Try to extract month context
        month_context = extract_month_year_context(query)
        
        if month_context:
            # Generate full month dates
            full_month_dates = generate_full_month_dates(
                month_context["month"], 
                month_context["year"]
            )
            return full_month_dates, "month_range"
        else:
            # Comparative query without specific period
            # Return empty list with special strategy "all_available"
            # Backend will inject ALL available dates from database
            return [], "all_available"
    
    # No dates found
    return [], "no_filter"
