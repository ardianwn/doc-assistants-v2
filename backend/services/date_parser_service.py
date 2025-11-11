import re
from typing import Optional, List
from datetime import datetime

try:
    import dateparser
except Exception:
    dateparser = None

# Month name mappings (Indonesian + English)
MONTH_NAMES_ID = {
    "januari": "01", "februari": "02", "maret": "03", "april": "04",
    "mei": "05", "juni": "06", "juli": "07", "agustus": "08",
    "september": "09", "oktober": "10", "november": "11", "desember": "12"
}

MONTH_NAMES_EN = {
    "january": "01", "february": "02", "march": "03", "april": "04",
    "may": "05", "june": "06", "july": "07", "august": "08",
    "september": "09", "october": "10", "november": "11", "december": "12",
    "jan": "01", "feb": "02", "mar": "03", "apr": "04",
    "jun": "06", "jul": "07", "aug": "08", "sep": "09",
    "oct": "10", "nov": "11", "dec": "12"
}

# Combine all month names
ALL_MONTH_NAMES = {**MONTH_NAMES_ID, **MONTH_NAMES_EN}


def parse_date_from_question(question: str) -> Optional[str]:
    """Enhanced date parsing with FULL Indonesian/English month support"""
    
    question_lower = question.lower()
    
    # First try dateparser if available
    if dateparser is not None:
        try:
            dt = dateparser.parse(
                question, 
                languages=["id", "en"],
                settings={
                    'PREFER_DAY_OF_MONTH': 'first',
                    'PREFER_MONTH_OF_YEAR': 'first',
                    'RELATIVE_BASE': None,
                    'STRICT_PARSING': False
                }
            )
            if dt:
                return dt.strftime("%Y-%m-%d")
        except Exception:
            pass
    
    # Fallback regex: Match ANY month name + day + year
    # Pattern: (day) (month_name) (year)
    # Examples: "25 Agustus 2025", "1 Januari 2025", "15 June 2025"
    
    # Build regex pattern with all month names
    month_names_pattern = "|".join(ALL_MONTH_NAMES.keys())
    
    patterns = [
        # (day) (month) (year) - e.g., "25 Agustus 2025"
        rf"(\d{{1,2}})\s+({month_names_pattern})\s+(\d{{4}})",
        # tanggal (day) (month) (year) - e.g., "tanggal 25 Agustus 2025"
        rf"tanggal\s+(\d{{1,2}})\s+({month_names_pattern})\s+(\d{{4}})",
        # pada (day) (month) (year) - e.g., "pada 25 Agustus 2025"
        rf"pada\s+(\d{{1,2}})\s+({month_names_pattern})\s+(\d{{4}})",
        # (month) (day), (year) - English format: "August 25, 2025"
        rf"({month_names_pattern})\s+(\d{{1,2}}),?\s+(\d{{4}})",
    ]
    
    for pattern in patterns:
        match = re.search(pattern, question_lower)
        if match:
            groups = match.groups()
            
            # Handle different group orders
            if len(groups) == 3:
                # Check if first group is a month name
                if groups[0] in ALL_MONTH_NAMES:
                    # English format: (month) (day) (year)
                    month_name = groups[0]
                    day = groups[1]
                    year = groups[2]
                else:
                    # Indonesian format: (day) (month) (year)
                    day = groups[0]
                    month_name = groups[1]
                    year = groups[2]
                
                month_num = ALL_MONTH_NAMES.get(month_name)
                if month_num:
                    return f"{year}-{month_num}-{day.zfill(2)}"
    
    return None


def parse_multiple_dates_from_question(question: str) -> List[str]:
    """
    Parse multiple dates from question - supports ALL months (Indonesian + English)
    
    Examples:
        "tanggal 1, 2, dan 3 Maret 2025" -> ["2025-03-01", "2025-03-02", "2025-03-03"]
        "antara tanggal 1 sampai 5 Maret" -> ["2025-03-01", "2025-03-02", ..., "2025-03-05"]
        "1 dan 5 Agustus 2025" -> ["2025-08-01", "2025-08-05"]
        "25 Agustus 2025" -> ["2025-08-25"]
    """
    dates = []
    question_lower = question.lower()
    
    # Build month pattern for regex
    month_pattern = "|".join(ALL_MONTH_NAMES.keys())
    
    # Pattern 0: Two separate dates with different months (PRIORITY CHECK)
    two_dates_pattern = rf"(\d{{1,2}})\s+({month_pattern})\s+(\d{{4}})\s+(?:dan|and)\s+(\d{{1,2}})\s+({month_pattern})\s+(\d{{4}})"
    match = re.search(two_dates_pattern, question_lower)
    if match:
        # First date
        day1 = match.group(1)
        month1 = ALL_MONTH_NAMES.get(match.group(2))
        year1 = match.group(3)
        
        # Second date
        day2 = match.group(4)
        month2 = ALL_MONTH_NAMES.get(match.group(5))
        year2 = match.group(6)
        
        if month1 and month2:
            dates.append(f"{year1}-{month1}-{day1.zfill(2)}")
            dates.append(f"{year2}-{month2}-{day2.zfill(2)}")
            return dates
    
    # Pattern 1: Date range (1 sampai 5, 1-5, 1–5, 1 to 5)
    range_patterns = [
        # With year: "1 sampai 5 Agustus 2025"
        (rf"(\d+)\s*(?:sampai|hingga|to|ke|[-–—])\s*(\d+)\s+({month_pattern})\s+(\d{{4}})", True),
        (rf"(?:antara|between|dari|sepanjang)\s+(?:tanggal\s+)?(\d+)\s*(?:sampai|hingga|to|ke|[-–—])\s*(\d+)\s+({month_pattern})\s+(\d{{4}})", True),
        # Without year: "1 sampai 5 Agustus" (assume current/recent year)
        (rf"(?:dari|sepanjang|antara)\s+(?:tanggal\s+)?(\d+)\s*(?:sampai|hingga|to|ke|[-–—])\s*(\d+)\s+({month_pattern})", False),
        (rf"(\d+)\s*(?:sampai|hingga|to|ke|[-–—])\s*(\d+)\s+({month_pattern})", False),
        # Very flexible: "1–3 Agustus" or "1-3 Agustus"
        (rf"(\d+)\s*[-–—]\s*(\d+)\s+({month_pattern})", False)
    ]
    
    for pattern, has_year in range_patterns:
        match = re.search(pattern, question_lower)
        if match:
            start_day = int(match.group(1))
            end_day = int(match.group(2))
            month_name = match.group(3)
            
            # Get month number
            month_num = ALL_MONTH_NAMES.get(month_name)
            if not month_num:
                continue
            
            # Get year
            if has_year and len(match.groups()) >= 4:
                year = match.group(4)
            else:
                year = "2025"  # Default to 2025
            
            # Generate all dates in range
            for day in range(start_day, end_day + 1):
                dates.append(f"{year}-{month_num}-{str(day).zfill(2)}")
            
            return dates
    
    # Pattern 2: Multiple individual dates (1, 2, dan 3 Agustus 2025)
    multi_date_patterns = [
        # "tanggal 1, 2, dan 3 Agustus 2025"
        rf"(?:tanggal\s+)?(\d+)\s*,\s*(\d+)\s*,?\s*(?:dan|and)?\s*(\d+)\s+({month_pattern})\s+(\d{{4}})",
        # "1, 2, 3 Agustus 2025"
        rf"(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s+({month_pattern})\s+(\d{{4}})",
        # "antara tanggal 1, 2, dan 3 Agustus"
        rf"(?:antara|between)\s+(?:tanggal\s+)?(\d+)\s*,\s*(\d+)\s*,?\s*(?:dan|and)?\s*(\d+)\s+({month_pattern})\s+(\d{{4}})",
    ]
    
    for pattern in multi_date_patterns:
        match = re.search(pattern, question_lower)
        if match:
            groups = match.groups()
            year = groups[-1]  # Last group is year
            month_name = groups[-2]  # Second to last is month
            month_num = ALL_MONTH_NAMES.get(month_name)
            
            if not month_num:
                continue
            
            days = [g for g in groups[:-2] if g]  # All except last 2 (month + year)
            
            for day in days:
                dates.append(f"{year}-{month_num}-{str(day).zfill(2)}")
            
            return dates
    
    # Pattern 3: Generic comma-separated dates (flexible)
    generic_pattern = rf"(?:tanggal\s+)?([\d\s,]+(?:dan|and)?\s*\d+)\s+({month_pattern})\s+(\d{{4}})"
    match = re.search(generic_pattern, question_lower)
    if match:
        dates_str = match.group(1)
        month_name = match.group(2)
        year = match.group(3)
        
        month_num = ALL_MONTH_NAMES.get(month_name)
        if not month_num:
            # Fallback to single date
            single_date = parse_date_from_question(question)
            if single_date:
                return [single_date]
            return []
        
        # Extract all numbers
        days = re.findall(r'\d+', dates_str)
        
        for day in days:
            dates.append(f"{year}-{month_num}-{str(day).zfill(2)}")
        
        return dates
    
    # Fallback: Try single date
    single_date = parse_date_from_question(question)
    if single_date:
        return [single_date]
    
    return []


def build_multi_queries(question: str) -> list[str]:
    """
    DISABLED: Multi-query expansion disabled for strict date filtering.
    Only return the original question to prevent date leakage.
    """
    # STRICT MODE: Only use original question, no expansion
    return [question.strip()]
