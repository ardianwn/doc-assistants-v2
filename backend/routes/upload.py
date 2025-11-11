from fastapi import APIRouter, UploadFile, File, Depends
from typing import List
from pathlib import Path
import json
import os
import pandas as pd
import time
import asyncio
from concurrent.futures import ThreadPoolExecutor
from sqlalchemy.orm import Session
from db.database import get_db, SessionLocal
from db import models
from utils.auth import get_current_user
from utils.timezone import jakarta_now_naive
import tiktoken

from config import vectorstore
from services.document_loader import load_document, chunk_documents
from services.bm25_index import persist_corpus

router = APIRouter()

# Thread pool for file processing - limit workers to avoid overwhelming the database
file_thread_pool = ThreadPoolExecutor(max_workers=3, thread_name_prefix="FileProcessor")

def count_tokens(text: str) -> int:
    """Count tokens using tiktoken"""
    try:
        encoding = tiktoken.get_encoding("cl100k_base")
        return len(encoding.encode(text))
    except:
        # Fallback: rough estimation
        return len(text) // 4

def get_page_count(filepath: str, ext: str) -> int:
    """Get page count for PDF and DOCX files"""
    try:
        if ext == ".pdf":
            import PyPDF2
            with open(filepath, 'rb') as f:
                reader = PyPDF2.PdfReader(f)
                return len(reader.pages)
        elif ext == ".docx":
            from docx import Document
            doc = Document(filepath)
            return len(doc.element.body)
        else:
            return 1
    except:
        return 1

from contextlib import contextmanager

@contextmanager
def get_thread_db_session():
    """Context manager for thread-safe database sessions"""
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception as e:
        session.rollback()
        raise e
    finally:
        session.close()

def process_single_file(filepath: str, filename: str, ext: str, doc_id: int):
    """Process a single file in separate thread"""
    try:
        with get_thread_db_session() as db_session:
            print(f"[THREAD] Memproses {filename} dengan session baru...")
            
            # Update status to processing
            doc = db_session.query(models.HistoryUpload).filter(models.HistoryUpload.id == doc_id).first()
            if doc:
                doc.status = "processing"
                print(f"[STATUS] Status {filename} diubah ke 'processing'")
            
            # Get page count
            page_count = get_page_count(filepath, ext)
            
            # Load document
            docs = load_document(filepath, ext)
            print(f"[LOAD] Berhasil memuat {len(docs)} dokumen dari {filename}")
            
            # Split into chunks with rich metadata (file, page, date, unit)
            chunks = chunk_documents(docs, filepath, chunk_size=1000, chunk_overlap=200)
            print(f"[SPLIT] Total chunks dari {filename}: {len(chunks)} (with metadata)")
            
            # Add to vectorstore
            vectorstore.add_documents(chunks)
            # Persist to BM25 corpus for keyword retrieval
            try:
                persist_corpus(chunks)
                print(f"[BM25] Persisted {len(chunks)} chunks to corpus.")
            except Exception as e:
                print(f"[BM25] Failed to persist corpus: {e}")
            print(f"[QDRANT] Embedding dari {filename} berhasil diindeks.")
            
            # Save chunk details
            for idx, chunk in enumerate(chunks):
                chunk_text = chunk.page_content
                token_count = count_tokens(chunk_text)
                
                chunk_record = models.DocumentChunk(
                    document_id=doc_id,
                    chunk_index=idx,
                    content=chunk_text,
                    token_count=token_count,
                    char_count=len(chunk_text)
                )
                db_session.add(chunk_record)
            
            # Update document record
            if doc:
                doc.status = "ready"
                doc.chunk_count = len(chunks)
                doc.vector_count = len(chunks)
                doc.page_count = page_count
                doc.processed_at = jakarta_now_naive()
                doc.embedding_model = "bge-m3:latest"
            
            return len(chunks)
            
    except Exception as e:
        print(f"[ERROR] Gagal memproses file {filename}: {e}")
        try:
            # Create a separate session for error handling
            with get_thread_db_session() as error_session:
                doc = error_session.query(models.HistoryUpload).filter(models.HistoryUpload.id == doc_id).first()
                if doc:
                    doc.status = "error"
                    doc.error_message = str(e)
        except Exception as commit_error:
            print(f"[ERROR] Gagal mengupdate status error untuk {filename}: {commit_error}")
        return 0

@router.post("/")
async def upload_files(
    files: List[UploadFile] = File(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    start = time.time()
    total_chunks = 0
    supported_extensions = [".pdf", ".docx", ".txt", ".csv", ".json", ".xlsx"]
    processed_files = []
    
    # Save files first and create DB records
    for file in files:
        print(f"\n[UPLOAD] Menerima file: {file.filename}")
        ext = Path(file.filename).suffix.lower()

        if ext not in supported_extensions:
            print(f"[SKIP] Format {ext} tidak didukung. Melewati file ini.")
            continue

        filepath = f"docs/{file.filename}"
        content = await file.read()
        
        with open(filepath, "wb") as f:
            f.write(content)
        print(f"[SAVE] File disimpan ke {filepath} ({len(content)} bytes)")
        
        # Create upload history record
        upload_record = models.HistoryUpload(
            user_id=current_user.id,
            filename=file.filename,
            file_size=len(content),
            file_type=ext,
            status="uploaded"
        )
        db.add(upload_record)
        db.commit()
        db.refresh(upload_record)
        
        processed_files.append((filepath, file.filename, ext, upload_record.id))
    
    # Process files concurrently using thread pool
    if processed_files:
        print(f"[CONCURRENT] Memproses {len(processed_files)} file secara bersamaan...")
        
        loop = asyncio.get_event_loop()
        tasks = []
        
        for filepath, filename, ext, doc_id in processed_files:
            task = loop.run_in_executor(
                file_thread_pool,
                process_single_file,
                filepath, filename, ext, doc_id
            )
            tasks.append(task)
        
        # Wait for all files to be processed
        chunk_counts = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Sum up successful results
        for count in chunk_counts:
            if isinstance(count, int):
                total_chunks += count
            else:
                print(f"[ERROR] Exception during processing: {count}")
    
    processing_time = round(time.time() - start, 2)
    print(f"\n✅ Semua file selesai diproses dalam {processing_time} detik.")
    return {
        "message": f"{len(processed_files)} file diproses secara concurrent. {total_chunks} chunks berhasil ditambahkan.",
        "processing_time": processing_time,
        "concurrent_processing": True
    }

# Optional: Cleanup function for graceful shutdown
def cleanup_upload_resources():
    """Cleanup thread pool resources"""
    file_thread_pool.shutdown(wait=True)
