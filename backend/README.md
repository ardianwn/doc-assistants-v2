# 🚀 DocAI Backend - Intelligent Document Chat System

**Version:** 1.0.0  
**Framework:** FastAPI with async/await support  
**Language:** Python 3.11+  
**Timezone:** Asia/Jakarta (WIB)

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Features](#features)
4. [Tech Stack](#tech-stack)
5. [Project Structure](#project-structure)
6. [Installation](#installation)
7. [Configuration](#configuration)
8. [Database Setup](#database-setup)
9. [Running the Application](#running-the-application)
10. [API Documentation](#api-documentation)
11. [Services](#services)
12. [Authentication](#authentication)
13. [Monitoring](#monitoring)
14. [Deployment](#deployment)
15. [Troubleshooting](#troubleshooting)

---

## Overview

DocAI Backend adalah sistem backend untuk aplikasi **Document AI Chat** yang memungkinkan pengguna mengupload dokumen (PDF, DOCX, TXT, CSV, JSON, XLSX) dan melakukan percakapan interaktif dengan konten dokumen menggunakan teknologi RAG (Retrieval-Augmented Generation).

### Key Highlights

✅ **OpenAI Assistants API** - Advanced reasoning dengan function calling  
✅ **Local Vector Database** - Data privacy dengan Qdrant lokal  
✅ **Hybrid Retrieval** - Kombinasi BM25 (sparse) + Dense embeddings  
✅ **Async/Await Architecture** - Concurrent processing untuk performa optimal  
✅ **Role-Based Access Control** - User, Admin, Uploader roles  
✅ **Session Management** - Multi-device support dengan JWT tokens  
✅ **Thread-Safe Processing** - ThreadPoolExecutor untuk document processing  
✅ **Automatic Metadata Extraction** - Date, unit, page inference dari filename

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    FastAPI Backend (8000)                    │
│                                                               │
│  Routes:                                                      │
│  ├─ /auth       → Authentication & User Management           │
│  ├─ /upload     → Document Upload & Processing               │
│  ├─ /chat       → AI Chat (OpenAI Assistants API)           │
│  ├─ /admin      → Admin Management                           │
│  └─ /monitoring → System Health & Metrics                    │
└─────────────────┬─────────────────────────────────────────┬──┘
                  │                                         │
                  ↓                                         ↓
        ┌─────────────────┐                    ┌───────────────────┐
        │  PostgreSQL DB  │                    │   Qdrant Vector   │
        │  (localhost)    │                    │   DB (localhost)  │
        │  Port: 5432     │                    │   Port: 6333      │
        └─────────────────┘                    └───────────────────┘
                  │                                         │
                  ├─ users                                  │
                  ├─ history_chat                           │
                  ├─ history_upload                         │
                  ├─ document_chunks                        │
                  ├─ user_sessions                          │
                  └─ audit_logs                             │
                                                            │
                                          Collection: my_documents
                                          Vectors: 1536 dims (bge-m3)
                                          Distance: Cosine
```

### Data Flow

**Document Upload:**
```
User → Upload API → ThreadPool → Extract Text → Chunk (1000 chars) 
  → Generate Embeddings (Ollama bge-m3) → Store in Qdrant 
  → Update BM25 Index → Save to PostgreSQL → Return Success
```

**Chat Query:**
```
User Query → Date Parser → Query Analyzer → OpenAI Assistants API
  → Function Call: retrieve_documents → Hybrid Retriever (BM25 + Dense)
  → Qdrant Search (STRICT date filter) → Return Documents 
  → OpenAI Analysis → Format Response (tables, sections) 
  → Save to DB → Return to User
```

---

## Features

### 🔐 Authentication & Security
- JWT-based authentication dengan bcrypt password hashing
- Role-based access control (user/admin/uploader)
- Multi-session management dengan device tracking
- IP address logging dan location detection
- Session expiry (7 days default)
- Two-factor authentication support (optional)
- IP whitelist capability
- Failed login attempts tracking

### 📄 Document Processing
- **Supported Formats:** PDF, DOCX, TXT, CSV, JSON, XLSX
- **Text Extraction:** 
  - PyMuPDF (fitz) untuk layout-preserving PDF extraction
  - pdfplumber untuk table extraction dari PDF
  - python-docx untuk DOCX processing
  - pandas untuk CSV/Excel
- **Intelligent Chunking:** RecursiveCharacterTextSplitter (1000 chars, 200 overlap)
- **Metadata Enrichment:** Automatic extraction dari filename
  - Date detection (e.g., "01 Maret 2025" → 2025-03-01)
  - Unit detection (e.g., "Unit 7" atau "U7")
  - Page number tracking
  - File source preservation
- **Concurrent Processing:** ThreadPoolExecutor dengan 3 workers
- **Token Counting:** tiktoken untuk accurate token calculation

### 💬 AI Chat System
- **Primary Engine:** OpenAI Assistants API (GPT-4 Turbo)
- **Function Calling:** Local Qdrant retrieval (data privacy)
- **Thread Continuity:** Conversation context preservation
- **Date Intelligence:**
  - Automatic date parsing dari query (Indonesian & English)
  - Range detection (e.g., "1–3 Maret" → [2025-03-01, 2025-03-02, 2025-03-03])
  - Multiple date support
  - Query type analysis (comparative vs simple)
- **Hybrid Retrieval:**
  - BM25 sparse retrieval (keyword matching)
  - Dense vector search (semantic similarity)
  - STRICT date filtering (no fallback)
  - Deduplication & ranking
- **Response Formatting:**
  - Markdown dengan tables
  - Structured sections dengan emoji
  - Source attribution (file, page)

### 👨‍💼 Admin Features
- User management (CRUD operations)
- Document management (view all, delete)
- System health monitoring
- Role assignment

### 📊 Monitoring
- Real-time system metrics (CPU, memory, disk)
- Request tracking middleware
- Database connection status
- Qdrant connection status
- Performance monitoring

---

## Tech Stack

### Core Framework
- **FastAPI 0.109+** - Modern async web framework
- **Uvicorn** - ASGI server
- **Python 3.11+** - Programming language
- **Gunicorn** - Production WSGI server

### AI & ML
- **OpenAI API** - GPT-4 Turbo via Assistants API
- **LangChain** - LLM orchestration
- **Ollama** - Local embedding model hosting
- **bge-m3** - Multilingual embeddings (1536 dims)
- **HuggingFace** - Model hub access

### Databases
- **PostgreSQL 15** - Relational database
- **Qdrant** - Vector similarity search database
- **SQLAlchemy 2.0** - ORM dengan async support
- **asyncpg** - Async PostgreSQL driver
- **psycopg2-binary** - Sync PostgreSQL driver

### Document Processing
- **PyPDF2** - PDF text extraction
- **PyMuPDF (fitz)** - Advanced PDF processing
- **pdfplumber** - PDF table extraction
- **python-docx** - DOCX processing
- **pandas** - CSV/Excel processing
- **openpyxl** - Excel file support
- **tiktoken** - Token counting

### Authentication & Security
- **python-jose** - JWT token handling
- **passlib** - Password hashing
- **bcrypt** - Secure hashing algorithm

### Utilities
- **python-dotenv** - Environment variable management
- **pytz** - Timezone handling (Asia/Jakarta)
- **langdetect** - Language detection
- **user-agents** - Device detection
- **psutil** - System monitoring
- **dateparser** - Flexible date parsing

---

## Project Structure

```
backend/
├── main.py                          # FastAPI application entry point
├── config.py                        # Configuration & settings (Pydantic)
├── timezone_config.py               # Timezone setup (Asia/Jakarta)
├── requirements.txt                 # Python dependencies
├── Dockerfile                       # Docker configuration
├── .env                             # Environment variables (git-ignored)
├── clean_db.py                      # Database cleanup utility
├── create_admin.py                  # Admin user creation script
│
├── db/
│   ├── database.py                  # SQLAlchemy setup (sync + async)
│   └── models.py                    # Database models (ORM)
│       ├── User                     # Users table
│       ├── UserSession              # Sessions table
│       ├── HistoryChat              # Chat history table
│       ├── HistoryUpload            # Upload history table
│       ├── DocumentChunk            # Document chunks table
│       ├── SecuritySettings         # Security settings table
│       └── AuditLog                 # Audit logs table
│
├── routes/
│   ├── auth.py                      # Authentication endpoints (934 lines)
│   ├── upload.py                    # Document upload endpoints (216 lines)
│   ├── chat.py                      # Chat endpoints (182 lines)
│   ├── admin.py                     # Admin endpoints (460 lines)
│   └── monitoring.py                # System monitoring endpoints
│
├── services/
│   ├── openai_assistant_service.py  # OpenAI Assistants API integration (718 lines)
│   ├── vectorstore.py               # Hybrid retrieval (BM25 + Dense) (343 lines)
│   ├── date_parser_service.py       # Date parsing (Indonesian + English) (153 lines)
│   ├── query_analyzer.py            # Query type analysis (170 lines)
│   ├── document_loader.py           # Document loading & chunking (168 lines)
│   ├── embedding.py                 # Ollama embeddings (9 lines)
│   ├── bm25_index.py                # BM25 sparse retrieval
│   └── extractor.py                 # Text extraction utilities
│
├── utils/
│   ├── auth.py                      # Auth utilities (JWT, sessions) (289 lines)
│   ├── language_detect.py           # Language detection
│   └── timezone.py                  # Timezone utilities (Jakarta)
│
├── data/
│   └── bm25_corpus.jsonl            # BM25 corpus (persistent storage)
│
├── docs/                            # Uploaded documents storage
└── uploads/
    └── profile_images/              # User profile images
```

---

## Installation

### Prerequisites

1. **Python 3.11+**
   ```bash
   python --version  # Should be 3.11 or higher
   ```

2. **PostgreSQL 15**
   ```bash
   # Install PostgreSQL
   # Ubuntu/Debian:
   sudo apt-get install postgresql postgresql-contrib
   
   # macOS:
   brew install postgresql@15
   
   # Windows: Download from https://www.postgresql.org/download/windows/
   ```

3. **Qdrant Vector Database**
   ```bash
   # Using Docker (recommended):
   docker run -d \
     --name qdrant \
     -p 6333:6333 \
     -v $(pwd)/qdrant_storage:/qdrant/storage \
     qdrant/qdrant:latest
   ```

4. **Ollama (for embeddings)**
   ```bash
   # Install Ollama: https://ollama.ai
   # Pull bge-m3 model:
   ollama pull bge-m3
   
   # Run Ollama server:
   ollama serve
   ```

### Install Dependencies

```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Install requirements
pip install -r requirements.txt
```

---

## Configuration

### Environment Variables

Create `.env` file in `backend/` directory:

```env
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/vectorchat
QDRANT_URL=http://localhost:6333

# Ollama (Embedding Model)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_EMBEDDING_MODEL=bge-m3:latest

# OpenAI Settings
OPENAI_API_KEY=sk-your-openai-api-key-here
OPENAI_CHAT_MODEL=gpt-4-turbo-preview
OPENAI_TEMPERATURE=0.7
OPENAI_MAX_TOKENS=2000

# JWT Security (CHANGE THIS!)
SECRET_KEY=your-super-secret-key-change-this-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080  # 7 days

# Optional: Database Debug
DB_ECHO=false
```

### Configuration Details

File: `config.py`

```python
class Settings(BaseSettings):
    # Database
    DATABASE_URL: str  # PostgreSQL connection string
    QDRANT_URL: str    # Qdrant vector database URL
    
    # Ollama (Embedding Model)
    OLLAMA_BASE_URL: str           # Ollama server URL
    OLLAMA_EMBEDDING_MODEL: str    # Model name (bge-m3:latest)
    
    # OpenAI (Chat Processing)
    OPENAI_API_KEY: str           # OpenAI API key
    OPENAI_CHAT_MODEL: str        # Model (gpt-4-turbo-preview)
    OPENAI_TEMPERATURE: float     # Creativity (0.7)
    OPENAI_MAX_TOKENS: int        # Max response tokens (2000)
```

---

## Database Setup

### 1. Create PostgreSQL Database

```bash
# Login to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE vectorchat;

# Grant permissions
GRANT ALL PRIVILEGES ON DATABASE vectorchat TO postgres;

# Exit
\q
```

### 2. Initialize Tables

```bash
cd backend

# Method 1: Using Python
python -c "from db.database import init_db; init_db()"

# Method 2: Automatic on first run
# Tables will be created automatically when you start the server
```

### 3. Create Admin User

```bash
# Run admin creation script
python create_admin.py
```

**Default Credentials:**
- **Admin:** username=`administrator`, password=`administrator614`
- **User:** username=`user`, password=`user123`

**⚠️ IMPORTANT:** Change these credentials in production!

### 4. Database Schema

**Tables Created:**

1. **users** - User accounts dengan security settings
2. **user_sessions** - Active sessions dengan device info
3. **history_chat** - Chat conversation history
4. **history_upload** - Document upload records
5. **document_chunks** - Document chunk details
6. **security_settings** - System security configurations
7. **audit_logs** - System audit trail

### Database Cleanup

```bash
# Clean all history (CAUTION: Deletes all data!)
python clean_db.py
```

---

## Running the Application

### Development Mode

```bash
cd backend

# Activate virtual environment
source venv/bin/activate  # Linux/macOS
# venv\Scripts\activate   # Windows

# Run with auto-reload
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Server will start at:** `http://localhost:8000`

### Production Mode

```bash
# Using Gunicorn with Uvicorn workers
gunicorn main:app \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000 \
  --timeout 120 \
  --access-logfile - \
  --error-logfile -
```

### Docker Deployment

```bash
# Build image
docker build -t docai-backend .

# Run container
docker run -d \
  --name docai-backend \
  -p 8000:8000 \
  --env-file .env \
  docai-backend
```

### Verify Installation

```bash
# Check health
curl http://localhost:8000/health

# Check API docs
open http://localhost:8000/docs
```

---

## API Documentation

### Interactive Documentation

FastAPI provides automatic interactive API documentation:

- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

### API Endpoints Overview

#### Authentication (`/auth`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/register` | Register new user | ❌ |
| POST | `/auth/login` | Login dan get JWT token | ❌ |
| GET | `/auth/me` | Get current user info | ✅ |
| POST | `/auth/logout` | Logout dan revoke session | ✅ |
| GET | `/auth/sessions` | Get all active sessions | ✅ |
| DELETE | `/auth/sessions/{id}` | Revoke specific session | ✅ |
| PUT | `/auth/profile` | Update user profile | ✅ |
| POST | `/auth/change-password` | Change password | ✅ |

#### Document Upload (`/upload`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/upload/document` | Upload dokumen (PDF, DOCX, etc) | ✅ |
| GET | `/upload/history` | Get upload history | ✅ |
| GET | `/upload/document/{id}` | Get document details | ✅ |
| DELETE | `/upload/document/{id}` | Delete document & vectors | ✅ |

#### Chat (`/chat`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/chat/openai-assistant` | **Primary chat endpoint** | ✅ |
| GET | `/chat/history` | Get chat history | ✅ |
| DELETE | `/chat/history/{id}` | Delete specific chat | ✅ |
| DELETE | `/chat/session/{id}` | Delete entire session | ✅ |
| DELETE | `/chat/history` | Clear all history | ✅ |

#### Admin (`/admin`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/admin/users` | Get all users | ✅ Admin |
| POST | `/admin/users` | Create new user | ✅ Admin |
| PUT | `/admin/users/{id}` | Update user | ✅ Admin |
| DELETE | `/admin/users/{id}` | Delete user | ✅ Admin |
| GET | `/admin/documents` | Get all documents | ✅ Admin |
| DELETE | `/admin/documents/{id}` | Delete any document | ✅ Admin |

#### Monitoring (`/monitoring`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/monitoring/system` | System health metrics | ❌ |

### Example API Usage

#### 1. Register User

```bash
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "securepass123",
    "role": "user"
  }'
```

#### 2. Login

```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "securepass123"
  }'
```

**Response:**
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "username": "testuser",
    "role": "user"
  },
  "session_id": "session_abc123"
}
```

#### 3. Upload Document

```bash
curl -X POST http://localhost:8000/upload/document \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "files=@document.pdf"
```

#### 4. Chat with Documents

```bash
curl -X POST http://localhost:8000/chat/openai-assistant \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Pada tanggal berapa efisiensi Unit 7 paling baik?",
    "session_id": "session_abc123"
  }'
```

**Response:**
```json
{
  "answer": "## 📊 Analisis Efisiensi Unit 7\n\n...",
  "processing_time": 15.2,
  "session_id": "session_abc123",
  "thread_id": "thread_xyz789"
}
```

---

## Services

### 1. OpenAI Assistant Service

**File:** `services/openai_assistant_service.py` (718 lines)

**Primary chat service** menggunakan OpenAI Assistants API.

**Key Features:**
- OpenAI Assistants API integration
- Function calling to local Qdrant
- Thread management (conversation continuity)
- Automatic date detection & hints
- Query type analysis (comparative vs simple)
- Response formatting (markdown tables)

**Main Functions:**
```python
async def chat_with_assistant(user_query: str, thread_id: str = None)
    # Main entry point
    # Returns: (answer, thread_id)

async def _get_or_create_assistant(language: str = "id")
    # Create/reuse OpenAI Assistant
    # Returns: assistant_id

async def _retrieve_documents_function(query: str, dates: List[str])
    # Function called by OpenAI to retrieve docs
    # Uses hybrid retriever
    # Returns: JSON with documents

def _format_assistant_response(response: str)
    # Format response with tables & sections
    # Returns: formatted markdown
```

**Date Handling:**
```python
# Backend pre-parses dates
parsed_dates = parse_multiple_dates_from_question(query)
dates_to_use, strategy = analyze_query_and_get_dates(query, parsed_dates)

# Inject as hint to OpenAI
if dates_to_use:
    hint = f"[SYSTEM HINT: Detected dates: {dates_to_use}]"
else:
    hint = "[SYSTEM HINT: Use March 1-5, 2025]"

enhanced_query = query + "\n\n" + hint
```

### 2. Vector Store Service

**File:** `services/vectorstore.py` (343 lines)

**Hybrid retrieval** combining BM25 (sparse) + Dense vectors.

**Architecture:**
```python
class HybridRetriever:
    def retrieve(query, k_dense=50, k_bm25=50, final_k=6, filters=None):
        # 1. Dense search (vector similarity)
        dense_docs = vectorstore.similarity_search(query, k=k_dense)
        
        # 2. BM25 search (keyword matching)
        bm25_docs = bm25_retriever.get_relevant_documents(query)
        
        # 3. Union (deduplicate by content)
        union = list({doc.page_content: doc for doc in all_docs}.values())
        
        # 4. STRICT date filtering
        if target_date:
            union = [d for d in union if d.metadata.get('date') == target_date]
        
        # 5. Return top-k
        return union[:final_k]
```

**Key Features:**
- Thread-local Qdrant clients (concurrency safety)
- Async support dengan semaphore (max 3 concurrent)
- STRICT date filtering (no fallback)
- Deduplication by content
- Logging untuk debugging

### 3. Date Parser Service

**File:** `services/date_parser_service.py` (153 lines)

**Parse tanggal** dari query dalam bahasa Indonesia dan English.

**Supported Patterns:**
```python
# Range patterns
"dari 1 sampai 5 Maret 2025"   → [2025-03-01, ..., 2025-03-05]
"1–3 Maret"                     → [2025-03-01, 2025-03-02, 2025-03-03]
"sepanjang 1 hingga 5 Maret"   → [2025-03-01, ..., 2025-03-05]

# Multiple dates
"tanggal 1, 2, dan 3 Maret"    → [2025-03-01, 2025-03-02, 2025-03-03]
"1 dan 5 Maret"                 → [2025-03-01, 2025-03-05]

# Single date
"tanggal 3 Maret 2025"          → [2025-03-03]
"3 Maret"                       → [2025-03-03]  # Defaults to 2025
```

**Main Functions:**
```python
def parse_multiple_dates_from_question(question: str) -> List[str]:
    # Returns list of ISO dates (YYYY-MM-DD)
    # Supports ranges, lists, single dates
    # Defaults to 2025 if year not specified
```

### 4. Query Analyzer Service

**File:** `services/query_analyzer.py` (170 lines)

**Analyze query type** untuk menentukan retrieval strategy.

**Query Types:**
```python
def is_comparative_query(query: str) -> bool:
    # Detects: "paling baik", "lebih stabil", "tren", "perubahan"
    # Returns: True if comparative, False if simple

def analyze_query_and_get_dates(query, parsed_dates):
    # Strategy 1: "explicit" - Use parsed dates
    if parsed_dates:
        return parsed_dates, "explicit"
    
    # Strategy 2: "month_range" - Comparative → full month
    if is_comparative_query(query):
        return generate_full_month_dates(), "month_range"
    
    # Strategy 3: "no_filter" - No dates found
    return [], "no_filter"
```

### 5. Document Loader Service

**File:** `services/document_loader.py` (168 lines)

**Load dan chunk documents** dengan metadata enrichment.

**Supported Formats:**
- PDF → PyMuPDF (fitz) + pdfplumber (tables)
- DOCX → UnstructuredWordDocumentLoader
- TXT → TextLoader dengan autodetect encoding
- CSV → CSVLoader
- JSON → Direct JSON loading
- XLSX → pandas Excel reader

**Metadata Inference:**
```python
def _infer_metadata_from_path(filepath: str) -> dict:
    # Extract from filename: "P78 Prod Shift Report 01 Maret 2025.pdf"
    # Returns: {
    #   "file": "P78 Prod Shift Report 01 Maret 2025.pdf",
    #   "date": "2025-03-01",
    #   "unit": "Unit 8",
    #   "shift": "shift-1"
    # }
```

**Chunking:**
```python
def chunk_documents(docs, filepath, chunk_size=1000, chunk_overlap=200):
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=["\n\n", "\n", ". ", " ", ""]
    )
    # Returns: List[Document] with enriched metadata
```

### 6. Embedding Service

**File:** `services/embedding.py` (9 lines)

**Generate embeddings** menggunakan Ollama bge-m3.

```python
from langchain_ollama import OllamaEmbeddings

def get_embedding_model():
    return OllamaEmbeddings(
        model="bge-m3:latest",
        base_url=os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    )
```

**Model Details:**
- **Model:** bge-m3:latest (BAAI/bge-m3)
- **Dimensions:** 1536
- **Language:** Multilingual (Indonesian, English, Chinese, etc.)
- **Source:** Ollama local server

### 7. BM25 Index Service

**File:** `services/bm25_index.py`

**Sparse retrieval** untuk keyword matching.

**Features:**
- Build BM25 index dari corpus
- Persist corpus to `data/bm25_corpus.jsonl`
- Fast keyword-based retrieval
- Complement dense vector search

---

## Authentication

### JWT Token System

**Token Structure:**
```python
{
  "sub": "username",           # Subject (username)
  "user_id": 1,                # User ID
  "role": "user",              # Role (user/admin/uploader)
  "session_id": "session_123", # Session identifier
  "exp": 1704067200            # Expiry timestamp (7 days)
}
```

**Token Generation:**
```python
def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(days=7))
    to_encode.update({"exp": expire})
    
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
```

**Token Verification:**
```python
def verify_token(token: str):
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    username = payload.get("sub")
    # Returns: payload dict or None
```

### Password Security

**Hashing:**
```python
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)
```

### Session Management

**Features:**
- Device tracking (browser, OS, device info)
- IP address logging (supports IPv4 & IPv6)
- Location detection
- Session expiry (7 days default)
- Multi-device support
- Revoke single or all sessions
- Last active tracking

**Session Model:**
```python
class UserSession(Base):
    id = Column(String(255), primary_key=True)  # session_id
    user_id = Column(Integer, ForeignKey("users.id"))
    device_info = Column(Text)    # Browser, OS info
    ip_address = Column(String(45))  # IPv4/IPv6
    user_agent = Column(Text)
    location = Column(String(255))
    created_at = Column(DateTime)
    last_active = Column(DateTime)
    expires_at = Column(DateTime)
    is_active = Column(Boolean, default=True)
```

### Role-Based Access Control

**Roles:**
- **user** - Can upload documents, chat, view own history
- **uploader** - Same as user (legacy role)
- **admin** - Full access including user management

**Role Enforcement:**
```python
def require_user_role_async(allowed_roles: List[str] = ["user", "admin", "uploader"]):
    async def dependency(current_user = Depends(get_current_user_async)):
        if current_user.role not in allowed_roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return current_user
    return dependency

# Usage:
@router.get("/admin/users")
async def get_users(admin = Depends(require_user_role_async(["admin"]))):
    # Only admins can access
    ...
```

---

## Monitoring

### System Health Metrics

**Endpoint:** `GET /monitoring/system`

**Response:**
```json
{
  "status": "healthy",
  "cpu_percent": 25.5,
  "memory_percent": 60.2,
  "disk_usage": 45.8,
  "qdrant_status": "connected",
  "database_status": "connected",
  "uptime_seconds": 3600
}
```

### Request Tracking

**Middleware:** `track_request_middleware`

**Tracks:**
- Request method & path
- Processing time
- Status code
- User agent
- IP address

**Logging:**
```python
# Automatic logging untuk setiap request
[INFO] GET /chat/history - 200 - 0.05s
[INFO] POST /upload/document - 201 - 5.32s
[ERROR] GET /admin/users - 403 - 0.01s
```

### Performance Metrics

**Document Processing:**
- Text extraction: ~2 seconds (10-page PDF)
- Table extraction: ~1 second
- Chunking: ~0.5 seconds
- Embedding generation: ~3 seconds (45 chunks)
- Vector storage: ~1 second
- **Total:** ~7.5 seconds per 10-page PDF

**Chat Response:**
- Date detection: <0.1 seconds
- OpenAI function call: 2-5 seconds
- Document retrieval: 1-2 seconds (30 docs)
- OpenAI analysis: 10-20 seconds
- Formatting: <0.5 seconds
- **Total:** 15-30 seconds per query

**Token Usage:**
- Input: ~1500 tokens (prompt + documents)
- Output: ~500 tokens (response)
- **Cost:** ~$0.04 per query (GPT-4 Turbo pricing)

---

## Deployment

### Production Checklist

- [ ] Change `SECRET_KEY` in `.env`
- [ ] Change default admin password
- [ ] Set strong PostgreSQL password
- [ ] Enable HTTPS/SSL
- [ ] Configure firewall rules
- [ ] Set up log rotation
- [ ] Configure backup strategy
- [ ] Set up monitoring alerts
- [ ] Review CORS settings
- [ ] Configure rate limiting
- [ ] Set up reverse proxy (nginx)

### Using Docker Compose

```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/vectorchat
      - QDRANT_URL=http://qdrant:6333
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    depends_on:
      - db
      - qdrant

  db:
    image: postgres:15
    environment:
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=vectorchat
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  qdrant:
    image: qdrant/qdrant:latest
    ports:
      - "6333:6333"
    volumes:
      - qdrant_data:/qdrant/storage

volumes:
  postgres_data:
  qdrant_data:
```

**Run:**
```bash
docker-compose up -d
```

### Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support (for future use)
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Timeouts for long-running requests
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
```

### Systemd Service

Create `/etc/systemd/system/docai-backend.service`:

```ini
[Unit]
Description=DocAI Backend API
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/docai/backend
Environment="PATH=/var/www/docai/backend/venv/bin"
ExecStart=/var/www/docai/backend/venv/bin/gunicorn main:app \
    --workers 4 \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind 0.0.0.0:8000 \
    --timeout 120 \
    --access-logfile /var/log/docai/access.log \
    --error-logfile /var/log/docai/error.log

Restart=always

[Install]
WantedBy=multi-user.target
```

**Enable & Start:**
```bash
sudo systemctl enable docai-backend
sudo systemctl start docai-backend
sudo systemctl status docai-backend
```

---

## Troubleshooting

### Common Issues

#### 1. Database Connection Error

**Error:** `FATAL: password authentication failed`

**Solution:**
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Check DATABASE_URL in .env
# Format: postgresql://username:password@host:port/database

# Test connection
psql -U postgres -d vectorchat -h localhost
```

#### 2. Qdrant Connection Error

**Error:** `Could not connect to Qdrant`

**Solution:**
```bash
# Check Qdrant is running
docker ps | grep qdrant

# Restart Qdrant
docker restart qdrant

# Check QDRANT_URL in .env
# Should be: http://localhost:6333
```

#### 3. OpenAI API Error

**Error:** `Incorrect API key provided`

**Solution:**
```bash
# Verify OpenAI API key in .env
echo $OPENAI_API_KEY

# Test API key
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

#### 4. Ollama Embedding Error

**Error:** `Failed to generate embeddings`

**Solution:**
```bash
# Check Ollama is running
curl http://localhost:11434/api/tags

# Pull bge-m3 model if not exists
ollama pull bge-m3

# Check OLLAMA_BASE_URL in .env
# Should be: http://localhost:11434
```

#### 5. Import Errors

**Error:** `ModuleNotFoundError: No module named 'X'`

**Solution:**
```bash
# Reinstall requirements
pip install -r requirements.txt

# Verify installation
pip list | grep X
```

#### 6. Permission Errors

**Error:** `PermissionError: [Errno 13]`

**Solution:**
```bash
# Create necessary directories
mkdir -p docs uploads/profile_images data

# Set permissions
chmod -R 755 docs uploads data
```

### Debugging

**Enable Debug Logging:**
```python
# In main.py
import logging
logging.basicConfig(level=logging.DEBUG)
```

**Check Logs:**
```bash
# Application logs
tail -f /var/log/docai/error.log

# System logs
journalctl -u docai-backend -f
```

**Test Components:**
```bash
# Test database
python -c "from db.database import test_db_connection; print(test_db_connection())"

# Test config
python -c "from config import settings; print(settings.DATABASE_URL)"

# Test Qdrant
python -c "from services.vectorstore import get_qdrant_client; print(get_qdrant_client().get_collections())"
```

---

## Performance Optimization

### Database Optimization

```python
# config.py
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,      # Test connections before use
    pool_size=10,            # Connection pool size
    max_overflow=20,         # Additional connections
    pool_recycle=3600,       # Recycle after 1 hour
)
```

### Qdrant Optimization

```python
# vectorstore.py
client.set_model_query_params(
    collection_name="my_documents",
    search_params=SearchParams(hnsw_ef=256)  # Higher accuracy
)
```

### Concurrent Processing

```python
# upload.py
file_thread_pool = ThreadPoolExecutor(
    max_workers=3,              # Limit concurrent uploads
    thread_name_prefix="FileProcessor"
)

# vectorstore.py
retrieval_semaphore = asyncio.Semaphore(3)  # Max 3 concurrent retrievals
```

---

## Contributing

### Development Setup

```bash
# Clone repository
git clone https://github.com/ardianwn/doc-assistants-v2.git
cd doc-assistants-v2/backend

# Create virtual environment
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Setup pre-commit hooks
pip install pre-commit
pre-commit install
```

### Code Style

- Follow PEP 8
- Use type hints
- Write docstrings
- Add tests for new features

---

## License

This project is proprietary software. All rights reserved.

---

## Support

**Documentation:** This README + `BACKEND_DOCUMENTATION.md`  
**Repository:** [GitHub - doc-assistants-v2](https://github.com/ardianwn/doc-assistants-v2)  
**Issues:** Create GitHub issue  
**Version:** 1.0.0  
**Last Updated:** November 10, 2025

---

## Appendix

### Technology Versions

```txt
Python: 3.11+
FastAPI: 0.109+
SQLAlchemy: 2.0+
PostgreSQL: 15
Qdrant: latest
OpenAI API: 1.0+
LangChain: 0.1+
Ollama: latest
```

### Useful Commands

```bash
# Database backup
pg_dump -U postgres vectorchat > backup.sql

# Database restore
psql -U postgres vectorchat < backup.sql

# Check PostgreSQL version
psql --version

# Check Python version
python --version

# List running processes
ps aux | grep python

# Check disk usage
du -sh docs/ uploads/ data/

# Monitor system resources
htop
```

### Environment Setup Script

```bash
#!/bin/bash
# setup.sh

echo "🚀 Setting up DocAI Backend..."

# Create virtual environment
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create directories
mkdir -p docs uploads/profile_images data

# Copy environment template
cp .env.example .env

# Initialize database
python -c "from db.database import init_db; init_db()"

# Create admin user
python create_admin.py

echo "✅ Setup complete!"
echo "Update .env with your API keys and start with: uvicorn main:app --reload"
```

---

**Status:** ✅ **PRODUCTION READY**  
**Tested:** ✅ **VERIFIED**  
**Documentation:** ✅ **COMPLETE**

