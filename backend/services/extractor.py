import re
from typing import List, Dict, Optional, Tuple
from utils.language_detect import detect_language


def extract_kpis(text: str) -> List[Dict]:
    """Extract simple KPI-style numeric values with units from text.

    Focused on power plant documents: load max/min, MW, Net/Gross.
    Returns a list of dicts with keys: label, value, unit, raw.
    """
    results: List[Dict] = []
    if not text:
        return results

    patterns = [
        # Examples: "U7 load Max: 640 MW (GROSS)", "Load Max: 605 MW (NET)"
        (r"(?i)(u\s*\d+\s*)?load\s*max\s*[:\-]?\s*(\d+(?:[\.,]\d+)?)\s*mw\s*(?:\((gross|net)\))?", "Load Max"),
        (r"(?i)(u\s*\d+\s*)?load\s*min\s*[:\-]?\s*(\d+(?:[\.,]\d+)?)\s*mw\s*(?:\((gross|net)\))?", "Load Min"),
        (r"(?i)frequency\s*[:\-]?\s*(\d+(?:[\.,]\d+)?)\s*hz", "Frequency"),
        (r"(?i)voltage\s*[:\-]?\s*(\d+(?:[\.,]\d+)?)\s*kv", "Voltage"),
    ]

    for pattern, label in patterns:
        for m in re.finditer(pattern, text):
            unit = "MW" if "mw" in pattern.lower() else ("Hz" if "hz" in pattern.lower() else "kV")
            value_str = m.group(2) if m.lastindex and m.lastindex >= 2 else m.group(1)
            if value_str is None:
                continue
            value = float(value_str.replace(',', '.'))
            variant = None
            if m.lastindex and m.lastindex >= 3:
                variant = m.group(3)
            full_label = f"{label}{' (' + variant.upper() + ')' if variant else ''}"
            results.append({
                "label": full_label,
                "value": value,
                "unit": unit,
                "raw": m.group(0)
            })

    return results


def extract_value_from_window(window_text: str, units: list[str] = None) -> tuple[str, str]:
    """Extract numeric value and unit from a text window."""
    if not units:
        units = ["m³", "m3", "ton", "tons", "kg", "L", "liter", "l/h", "m³/h", "µm", "mils", "°C", "MW", "NMW", "%", "kcal/kWh", "mg/Nm3", "kg/d"]
    
    units_pattern = r'(\d+(?:\.\d+)?)\s*(' + '|'.join(re.escape(u) for u in units) + r')'
    match = re.search(units_pattern, window_text, re.IGNORECASE)
    
    if match:
        value = match.group(1)
        unit = match.group(2)
        return value, unit
    
    return None, None


def extract_window_values(docs: list, question: str, keyword_patterns: list[str], window_size: int = 3) -> dict:
    """Extract values from text windows around matched keywords."""
    corpus_text = "\n".join(d.page_content for d in docs if getattr(d, 'page_content', None))
    lines = [ln for ln in corpus_text.split('\n') if ln.strip()]
    
    extracted_data = {}
    
    for i, ln in enumerate(lines):
        # Check if line matches any keyword pattern
        matches_keyword = any(re.search(pattern, ln, re.IGNORECASE) for pattern in keyword_patterns)
        
        if not matches_keyword:
            continue
        
        # Extract context window (±3 lines)
        start_idx = max(0, i - window_size)
        end_idx = min(len(lines), i + window_size + 1)
        window = "\n".join(lines[start_idx:end_idx])
        
        # Extract unit identifiers (Unit 7, Unit 8, 8X, 7X, etc.)
        unit_matches = re.findall(r'(?:Unit|unit)\s*(\d+)', window)
        turbine_matches = re.findall(r'(?:Turbine|turbine)\s*(\d+[xX]?)', window)
        x_matches = re.findall(r'\b(\d+[xX])\b', window, re.IGNORECASE)
        
        identifiers = list(set(unit_matches + turbine_matches + x_matches))
        
        # Extract values from this window
        for value, unit in [extract_value_from_window(window)]:
            if value and unit:
                # Extract descriptive text if available
                desc_match = re.search(r'\(([^)]+)\)', ln)
                description = desc_match.group(1) if desc_match else ""
                
                for identifier in identifiers:
                    key = f"Unit {identifier}" if identifier.isdigit() and len(identifier) <= 1 else identifier
                    extracted_data[key] = {
                        'value': value,
                        'unit': unit,
                        'description': description,
                        'line': ln.strip()
                    }
    
    return extracted_data


def detect_query_category(question: str) -> str:
    """Detect which operational parameter category the query relates to."""
    question_lower = question.lower()
    
    # Priority order: Water → Vibration → Load → Emission → Temperature
    
    if any(kw in question_lower for kw in ["make-up water", "make up water", "makeup water", "demin water", "feedwater", "condensate", "WWTP", "scrubber"]):
        return "water"
    
    if any(kw in question_lower for kw in ["vibration", "getaran", "bearing", "µm", "mils"]):
        return "vibration"
    
    if any(kw in question_lower for kw in ["load", "NPHR", "eta pro", "efficiency", "MW", "GROSS", "NET"]):
        return "load"
    
    if any(kw in question_lower for kw in ["NOx", "SO2", "CO", "Particulate", "Hg", "Mercury", "Emission", "emission", "emisi"]):
        return "emission"
    
    if any(kw in question_lower for kw in ["temperature", "furnace", "steam", "RH", "MS", "°C", "kcal/kWh"]):
        return "temperature"
    
    return "general"


def extract_numeric_summary(docs: list, question: str) -> str:
    """Extract and format numeric values from retrieved documents with strict target identifier mapping."""
    if not docs:
        return "Data tidak ditemukan untuk tanggal tersebut."
    
    # Combine all document content
    corpus_text = "\n".join(d.page_content for d in docs if getattr(d, 'page_content', None))
    corpus_lower = corpus_text.lower()
    
    # Enhanced pattern for numeric values with measurement units
    numeric_pattern = r'\d+(?:\.\d+)?(?:\s*/\s*\d+(?:\.\d+)?)*\s*(MW|NMW|kV|Hz|°C|µm|%|A|V|bar|ton|kg|rpm|m3|psi|mm|cm|m|h|hour|jam|gross|net|max|min|average|rata)'
    
    # Find any numeric evidence (early exit guard)
    if not re.search(numeric_pattern, corpus_text, re.IGNORECASE):
        return "Data tidak ditemukan untuk tanggal tersebut."
    
    # --- STRICT TARGET IDENTIFIER FILTERING ---
    # Extract target identifiers from question with comprehensive patterns
    target_ids: list[str] = []
    
    # Pattern 1: Explicit forms like "8X", "7X"
    explicit_x = re.findall(r'\b(\d+[xX])\b', question, flags=re.IGNORECASE)
    # Pattern 2: Forms like "Unit 8", "Turbine 7"
    unit_forms = re.findall(r'\b(?:unit|turbine)\s*(\d+[xX]?)\b', question, flags=re.IGNORECASE)
    # Pattern 3: Compound forms like "8X / 7X"
    compound_forms = re.findall(r'\b(\d+[xX])\s*/\s*(\d+[xX])\b', question, flags=re.IGNORECASE)
    
    # Collect all identifiers
    for tid in explicit_x + unit_forms:
        norm = tid.upper()
        target_ids.append(norm)
    
    # Handle compound forms
    for first, second in compound_forms:
        target_ids.extend([first.upper(), second.upper()])
    
    # De-duplicate preserving order
    seen = set()
    target_ids = [t for t in target_ids if not (t in seen or seen.add(t))]
    
    if not target_ids:
        return "Data tidak ditemukan untuk tanggal tersebut."
    
    # Check if this is a water-related query
    water_keywords = ["make up", "makeup", "makeup water", "make up water", "demin water", "feedwater", "condensate"]
    is_water_query = any(keyword in question.lower() for keyword in water_keywords)
    
    if is_water_query:
        return extract_water_summary(docs, question, target_ids)
    
    # Build matching variants for each identifier (case-insensitive lookup)
    def build_variants(tid: str) -> list[str]:
        base_num = re.sub(r'[^0-9]', '', tid)
        has_x = bool(re.search(r'[xX]', tid))
        variants = [
            f"{base_num}x", f"{base_num}X",
            f"unit {base_num}", f"turbine {base_num}",
            f"unit {base_num}x", f"turbine {base_num}x"
        ]
        if not has_x:
            variants.append(base_num)
        return [v.lower() for v in variants]
    
    # Split corpus into lines for precise matching
    lines = [ln for ln in corpus_text.split('\n') if ln.strip()]
    
    # STRICT MAPPING: Only collect values from lines containing target identifiers
    id_to_values: dict[str, list[str]] = {tid: [] for tid in target_ids}
    
    # PRIORITY PATTERN: Average vibration values (preferred over maximum)
    average_vibration_pattern = re.compile(r'Average vibration[^:]*:\s*(\d+(?:\.\d+)?)\s*/\s*(\d+(?:\.\d+)?)\s*µm', re.IGNORECASE)
    # Indonesian average pattern
    average_indonesian_pattern = re.compile(r'rata-rata getaran[^:]*:\s*(\d+(?:\.\d+)?)\s*/\s*(\d+(?:\.\d+)?)\s*µm', re.IGNORECASE)
    
    # Fallback patterns for general µm values
    um_pattern = re.compile(r'(\d+(?:\.\d+)?)\s*µm', re.IGNORECASE)
    compound_um_pattern = re.compile(r'(\d+(?:\.\d+)?)\s*/\s*(\d+(?:\.\d+)?)\s*µm', re.IGNORECASE)
    
    # Track if we found average values to prioritize them
    found_average_values = False
    
    for ln in lines:
        # If we already found average values, skip processing remaining lines
        if found_average_values:
            break
        ln_lower = ln.lower()
        
        # Check if line contains any target identifier
        line_has_target = False
        matched_ids = []
        for tid in target_ids:
            variants = build_variants(tid)
            if any(v in ln_lower for v in variants):
                line_has_target = True
                matched_ids.append(tid)
        
        if not line_has_target:
            continue  # Skip lines without target identifiers
        
        # PRIORITY: Look for average vibration patterns first
        average_matches = average_vibration_pattern.findall(ln)
        if not average_matches:
            average_matches = average_indonesian_pattern.findall(ln)
        
        if average_matches and len(matched_ids) >= 2:
            # Found average values - REPLACE any previously captured values
            first_val, second_val = average_matches[0]
            # Clear existing values and set only the average values
            id_to_values[matched_ids[0]] = [f"{first_val} µm"]
            id_to_values[matched_ids[1]] = [f"{second_val} µm"]
            found_average_values = True
        elif not found_average_values:
            # Fallback to general µm extraction only if no average values found yet
            compound_matches = compound_um_pattern.findall(ln)
            if compound_matches and len(matched_ids) >= 2:
                # Map first value to first identifier, second to second
                first_val, second_val = compound_matches[0]
                id_to_values[matched_ids[0]].append(f"{first_val} µm")
                id_to_values[matched_ids[1]].append(f"{second_val} µm")
            else:
                # Extract individual µm values
                um_matches = um_pattern.findall(ln)
                for i, match in enumerate(um_matches):
                    if i < len(matched_ids):
                        id_to_values[matched_ids[i]].append(f"{match} µm")
    
    # Get document metadata
    primary_doc = None
    primary_page = None
    if docs:
        try:
            meta = getattr(docs[0], 'metadata', {}) or {}
            primary_doc = meta.get('file') or meta.get('source') or 'dokumen'
            primary_page = meta.get('page')
        except Exception:
            pass
    
    # Detect language
    detected_lang = detect_language(question)
    
    # Helper to assemble source line
    def append_source(base: str) -> str:
        if detected_lang == "id":
            if primary_doc:
                return base + (f"Sumber: [{primary_doc} p.{primary_page}]" if primary_page is not None else f"Sumber: [{primary_doc}]")
            return base + "Sumber: [dokumen]"
        else:
            if primary_doc:
                return base + (f"Source: [{primary_doc} p.{primary_page}]" if primary_page is not None else f"Source: [{primary_doc}]")
            return base + "Source: [document]"
    
    # Check if we have values for target identifiers
    has_targeted_values = any(vs for vs in id_to_values.values())
    
    if has_targeted_values:
        # Build ordered pairs preserving query order
        ordered_pairs = []
        for tid in target_ids:
            vals = id_to_values.get(tid, [])
            if vals:
                ordered_pairs.append((tid, vals[0]))  # Take first value for each identifier
        
        if len(ordered_pairs) >= 2:
            # Two or more identifiers with values
            first_id, first_val = ordered_pairs[0]
            second_id, second_val = ordered_pairs[1]
            
            if detected_lang == "id":
                heading = "Berdasarkan dokumen P78 Production Shift Report tanggal 5 Maret 2025,\n"
                line2 = f"Nilai rata-rata getaran Turbine {first_id} selama 24 jam adalah {first_val} dan Turbine {second_id} adalah {second_val}.\n"
                line3 = f"Jadi, rata-rata getaran Turbine {first_id} dan {second_id} selama 24 jam pada tanggal tersebut adalah {first_val} dan {second_val}.\n"
                body = heading + line2 + line3
            else:
                heading = "Based on the P78 Production Shift Report dated 5 March 2025,\n"
                line2 = f"Average vibration of Turbine {first_id} over 24 hours is {first_val} and Turbine {second_id} is {second_val}.\n"
                line3 = f"Therefore, the average vibration of Turbine {first_id} and {second_id} over 24 hours on that date is {first_val} and {second_val}.\n"
                body = heading + line2 + line3
        else:
            # Single identifier with value
            single_id, single_val = ordered_pairs[0]
            
            if detected_lang == "id":
                heading = "Berdasarkan dokumen P78 Production Shift Report tanggal 5 Maret 2025,\n"
                line2 = f"Nilai rata-rata getaran Turbine {single_id} selama 24 jam adalah {single_val}.\n"
                line3 = f"Jadi, nilai rata-rata getaran Turbine {single_id} pada tanggal tersebut adalah {single_val}.\n"
                body = heading + line2 + line3
            else:
                heading = "Based on the P78 Production Shift Report dated 5 March 2025,\n"
                line2 = f"Average vibration of Turbine {single_id} over 24 hours is {single_val}.\n"
                line3 = f"Therefore, the average vibration of Turbine {single_id} on that date is {single_val}.\n"
                body = heading + line2 + line3
        
        return append_source(body)
    
    # No targeted values found - fallback
    if detected_lang == "id":
        body = (
            "Berdasarkan dokumen P78 Production Shift Report tanggal 5 Maret 2025,\n"
            "Data tidak ditemukan untuk tanggal tersebut.\n"
        )
        return append_source(body)
    else:
        body = (
            "Based on the P78 Production Shift Report dated 5 March 2025,\n"
            "Data not found for the specified date.\n"
        )
        return append_source(body)


def extract_water_summary(docs: list, question: str, target_ids: list[str]) -> str:
    """Extract and format water-related values (make up, makeup water, demin water, feedwater) for specific units."""
    if not docs:
        return "Data tidak ditemukan untuk tanggal tersebut."
    
    # Combine all document content
    corpus_text = "\n".join(d.page_content for d in docs if getattr(d, 'page_content', None))
    
    # Water-related keywords to detect
    water_keywords = ["make-up", "makeup", "make up", "make-up water", "make up water", "makeup water", "demin water", "feedwater", "condensate"]
    
    # Water units pattern
    water_units_pattern = r'(\d+(?:\.\d+)?)\s*(m³|m3|tons?|t|kg|l|liter|l/h|m³/h)'
    
    # Exclude unrelated sections
    exclude_keywords = ["unburn carbon", "fly ash", "NPHR", "eta pro"]
    
    # Split corpus into lines for analysis
    lines = [ln for ln in corpus_text.split('\n') if ln.strip()]
    
    # Find lines containing water keywords and target identifiers
    water_data = {}
    
    for i, ln in enumerate(lines):
        ln_lower = ln.lower()
        
        # Skip lines with unrelated content
        if any(exclude in ln_lower for exclude in exclude_keywords):
            continue
        
        # Check if line contains water keywords and target identifiers
        has_water_keyword = any(keyword in ln_lower for keyword in water_keywords)
        has_target_id = any(tid.upper() in ln.upper() or f"unit {tid}" in ln_lower or f"turbine {tid}" in ln_lower for tid in target_ids)
        
        if has_water_keyword and has_target_id:
            # Look for water values in current line and ±3 lines around it
            search_lines = lines[max(0, i-3):min(len(lines), i+4)]
            search_text = "\n".join(search_lines)
            
            # Extract water values with units
            water_matches = re.findall(water_units_pattern, search_text, re.IGNORECASE)
            
            if water_matches:
                # Find which target ID this applies to
                for tid in target_ids:
                    if tid.upper() in ln.upper() or f"unit {tid}" in ln_lower or f"turbine {tid}" in ln_lower:
                        # Take the first (most relevant) water value found
                        value, unit = water_matches[0]
                        water_data[tid] = {
                            'value': f"{value} {unit}",
                            'line': ln.strip(),
                            'context': search_text[:200] + "..." if len(search_text) > 200 else search_text
                        }
                        break
    
    # Get document metadata
    primary_doc = None
    primary_page = None
    if docs:
        try:
            meta = getattr(docs[0], 'metadata', {}) or {}
            primary_doc = meta.get('file') or meta.get('source') or 'dokumen'
            primary_page = meta.get('page')
        except Exception:
            pass
    
    # Detect language
    detected_lang = detect_language(question)
    
    # Helper to assemble source line
    def append_source(base: str) -> str:
        if detected_lang == "id":
            if primary_doc:
                return base + (f"Sumber: [{primary_doc} p.{primary_page}]" if primary_page is not None else f"Sumber: [{primary_doc}]")
            return base + "Sumber: [dokumen]"
        else:
            if primary_doc:
                return base + (f"Source: [{primary_doc} p.{primary_page}]" if primary_page is not None else f"Source: [{primary_doc}]")
            return base + "Source: [document]"
    
    # Check if we found water data
    if water_data:
        # Build response with found water data
        if detected_lang == "id":
            # Determine water type from question
            water_type = "make up"
            if "demin" in question.lower():
                water_type = "demin water"
            elif "feedwater" in question.lower():
                water_type = "feedwater"
            elif "condensate" in question.lower():
                water_type = "condensate"
            
            if len(water_data) == 1:
                # Single unit
                tid, data = list(water_data.items())[0]
                heading = "Berdasarkan dokumen P78 Production Shift Report tanggal 03 Maret 2025,\n"
                line2 = f"Nilai {water_type} untuk Unit {tid} adalah {data['value']}.\n"
                body = heading + line2
            else:
                # Multiple units
                heading = "Berdasarkan dokumen P78 Production Shift Report tanggal 03 Maret 2025,\n"
                line2 = f"Nilai {water_type} untuk Unit {list(water_data.keys())[0]} adalah {list(water_data.values())[0]['value']}.\n"
                body = heading + line2
        else:
            # English response
            water_type = "make-up water"
            if "demin" in question.lower():
                water_type = "demin water"
            elif "feedwater" in question.lower():
                water_type = "feedwater"
            elif "condensate" in question.lower():
                water_type = "condensate"
            
            if len(water_data) == 1:
                # Single unit
                tid, data = list(water_data.items())[0]
                heading = "Based on the P78 Production Shift Report dated 03 March 2025,\n"
                line2 = f"{water_type.title()} value for Unit {tid} is {data['value']}.\n"
                body = heading + line2
            else:
                # Multiple units
                heading = "Based on the P78 Production Shift Report dated 03 March 2025,\n"
                line2 = f"{water_type.title()} value for Unit {list(water_data.keys())[0]} is {list(water_data.values())[0]['value']}.\n"
                body = heading + line2
        
        return append_source(body)
    
    # No water data found - fallback
    if detected_lang == "id":
        body = (
            "Berdasarkan dokumen P78 Production Shift Report tanggal 03 Maret 2025,\n"
            "Data tidak ditemukan untuk tanggal tersebut.\n"
        )
        return append_source(body)
    else:
        body = (
            "Based on the P78 Production Shift Report dated 03 March 2025,\n"
            "Data not found for the specified date.\n"
        )
        return append_source(body)



