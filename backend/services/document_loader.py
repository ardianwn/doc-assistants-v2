from langchain_community.document_loaders import (
    PyPDFLoader,
    TextLoader,
    CSVLoader,
    UnstructuredWordDocumentLoader,
)
from langchain_core.documents import Document
from langchain.text_splitter import RecursiveCharacterTextSplitter
import json
import pandas as pd
import os
import re
from datetime import datetime

try:
    import fitz  # PyMuPDF
except Exception:
    fitz = None

try:
    import pdfplumber
except Exception:
    pdfplumber = None

def load_document(filepath: str, ext: str):
    if ext == ".pdf":
        # Prefer layout-preserving extraction if available
        if fitz is not None:
            try:
                docs = []
                with fitz.open(filepath) as doc:
                    for page_index in range(len(doc)):
                        page = doc.load_page(page_index)
                        text = page.get_text("text")  # keep reading order
                        meta = {"page": page_index + 1, "source": filepath}
                        docs.append(Document(page_content=text, metadata=meta))
                # Table extraction fallback
                if pdfplumber is not None:
                    try:
                        with pdfplumber.open(filepath) as pdf:
                            for p_index, page in enumerate(pdf.pages):
                                tables = page.extract_tables()
                                for t_idx, rows in enumerate(tables or []):
                                    # Serialize table into a TSV-like block
                                    lines = ["\t".join([c if c is not None else "" for c in row]) for row in rows]
                                    table_text = "\n".join(lines)
                                    docs.append(Document(
                                        page_content=table_text,
                                        metadata={
                                            "page": p_index + 1,
                                            "source": filepath,
                                            "section": "table",
                                            "table_id": f"{p_index+1}-{t_idx+1}"
                                        }
                                    ))
                    except Exception:
                        pass
                return docs
            except Exception:
                pass
        # Fallback loader
        return PyPDFLoader(filepath).load()
    elif ext == ".docx":
        return UnstructuredWordDocumentLoader(filepath).load()
    elif ext == ".txt":
        return TextLoader(filepath, autodetect_encoding=True).load()
    elif ext == ".csv":
        return CSVLoader(file_path=filepath).load()
    elif ext == ".json":
        with open(filepath, "r", encoding="utf-8") as jf:
            data = json.load(jf)
        return [Document(page_content=json.dumps(data, indent=2))]
    elif ext == ".xlsx":
        df = pd.read_excel(filepath)
        return [Document(page_content=df.to_string(index=False))]
    else:
        raise ValueError(f"Tipe file {ext} tidak didukung.")


def _infer_metadata_from_path(filepath: str) -> dict:
    """Infer structured metadata such as file name, date, and unit from the path.

    Heuristics kept simple and robust:
    - Extract date tokens like '01 Maret 2025', '1 Maret 2025', or '2025-03-01'
    - Extract unit label like 'Unit 7' or 'U7'
    """
    filename = os.path.basename(filepath)
    metadata = {
        "file": filename,
        "path": filepath,
    }

    # Date patterns: 1) DD Mmm YYYY (ID/EN) 2) YYYY-MM-DD 3) DD-MM-YYYY
    # Support both Indonesian and English month names
    bulan_map = {
        # Indonesian
        "januari": 1,
        "februari": 2,
        "maret": 3,
        "april": 4,
        "mei": 5,
        "juni": 6,
        "juli": 7,
        "agustus": 8,
        "september": 9,
        "oktober": 10,
        "november": 11,
        "desember": 12,
        # English (full names)
        "january": 1,
        "february": 2,
        "march": 3,
        "april": 4,  # Same as Indonesian
        "may": 5,
        "june": 6,
        "july": 7,
        "august": 8,
        "september": 9,  # Same as Indonesian
        "october": 10,
        "november": 11,  # Same as Indonesian
        "december": 12,
        # English (short forms)
        "jan": 1,
        "feb": 2,
        "mar": 3,
        "apr": 4,
        "jun": 6,
        "jul": 7,
        "aug": 8,
        "sep": 9,
        "oct": 10,
        "nov": 11,
        "dec": 12,
    }

    # Try Indonesian format: "3 Maret 2025"
    m = re.search(r"(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})", filename, re.IGNORECASE)
    if m:
        try:
            day = int(m.group(1))
            month = bulan_map.get(m.group(2).lower())
            year = int(m.group(3))
            if month:
                metadata["date"] = datetime(year, month, day).date().isoformat()
        except Exception:
            pass

    # ISO date
    if "date" not in metadata:
        m = re.search(r"(20\d{2})[-_/](\d{1,2})[-_/](\d{1,2})", filename)
        if m:
            try:
                metadata["date"] = datetime(int(m.group(1)), int(m.group(2)), int(m.group(3))).date().isoformat()
            except Exception:
                pass

    # Unit pattern
    m = re.search(r"(unit\s*\d+|u\s*\d+)", filename, re.IGNORECASE)
    if m:
        metadata["unit"] = re.sub(r"\s+", " ", m.group(1).title())

    return metadata


def chunk_documents(documents: list[Document], source_path: str, *, chunk_size: int = 1000, chunk_overlap: int = 200) -> list[Document]:
    """Split documents into overlapping chunks and attach rich metadata.

    Each output chunk carries: file, path, page (if present), inferred date, unit.
    """
    base_meta = _infer_metadata_from_path(source_path)
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=["\n\n", "\n", ". ", ".", " "]
    )

    chunked: list[Document] = []
    for doc in documents:
        text = doc.page_content or ""
        # Preserve page number if available from loader
        page = None
        if isinstance(doc.metadata, dict):
            page = doc.metadata.get("page") or doc.metadata.get("page_number")

        for i, chunk in enumerate(splitter.split_text(text)):
            meta = {
                **(doc.metadata or {}),
                **base_meta,
                "page": page,
                "chunk": i,
            }
            chunked.append(Document(page_content=chunk, metadata=meta))

    return chunked
