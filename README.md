<div align="center">
  <img src="frontend/public/icon/icon.png" alt="DocAI Logo" width="200"/>
  
  # 🚀 DocAI - Intelligent Document Chat Application

  > **AI-Powered Document Processing & Chat System**  
  > Built with Next.js 14, FastAPI, OpenAI Assistants API, and Qdrant Vector Database

  [![Next.js](https://img.shields.io/badge/Next.js-14.0-black?logo=next.js)](https://nextjs.org/)
  [![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
  [![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python)](https://www.python.org/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?logo=typescript)](https://www.typescriptlang.org/)
  [![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev/)
  [![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql)](https://www.postgresql.org/)
  [![Qdrant](https://img.shields.io/badge/Qdrant-1.7+-DC382C?logo=qdrant)](https://qdrant.tech/)
  [![OpenAI](https://img.shields.io/badge/OpenAI-Assistants%20API-412991?logo=openai)](https://platform.openai.com/)
</div>

---

## 📋 Table of Contents

- [🎯 Overview](#-overview)
- [✨ Features](#-features)
  - [🔐 Authentication & User Management](#-authentication--user-management)
  - [💬 AI Chat Interface](#-ai-chat-interface)
  - [📄 Document Upload & Processing](#-document-upload--processing)
  - [🔍 Hybrid Retrieval System](#-hybrid-retrieval-system)
  - [👨‍💼 Admin Dashboard](#-admin-dashboard)
  - [🎨 UI/UX Features](#-uiux-features)
- [🏗️ System Architecture](#️-system-architecture)
- [🛠️ Tech Stack](#️-tech-stack)
- [📁 Project Structure](#-project-structure)
- [⚙️ Prerequisites](#️-prerequisites)
- [🚀 Quick Start](#-quick-start)
- [📦 Installation](#-installation)
- [⚙️ Configuration](#️-configuration)
- [▶️ Running the Application](#️-running-the-application)
- [👥 User Roles](#-user-roles)
- [📚 API Documentation](#-api-documentation)
- [📸 Screenshots](#-screenshots)
- [🚢 Deployment](#-deployment)
- [🔧 Troubleshooting](#-troubleshooting)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)

---

## 🎯 Overview

**DocAI** adalah aplikasi berbasis AI yang memungkinkan pengguna untuk:

- 📄 **Upload dokumen** (PDF, DOCX, TXT, CSV, JSON, XLSX)
- 💬 **Chat dengan AI** menggunakan OpenAI Assistants API
- 🔍 **Retrieval-Augmented Generation (RAG)** untuk menjawab pertanyaan berdasarkan dokumen yang diupload
- 👥 **Multi-user system** dengan role-based access control
- 📊 **Admin dashboard** untuk manajemen user dan monitoring sistem
- 🌙 **Dark mode** dengan system preference detection
- 📱 **Responsive design** untuk mobile, tablet, dan desktop
- 🔐 **Secure authentication** dengan JWT tokens dan multi-session management

### Why DocAI?

- ✅ **Advanced AI Reasoning** - OpenAI Assistants API dengan function calling
- ✅ **Hybrid Retrieval** - Kombinasi BM25 (sparse) + Dense embeddings (Qdrant)
- ✅ **Data Privacy** - Local vector database (Qdrant) tanpa data keluar
- ✅ **Date-Aware Search** - Automatic date parsing dan STRICT filtering
- ✅ **Smart Document Processing** - Metadata extraction dari filename
- ✅ **Modern UI/UX** - Next.js 14 App Router dengan Tailwind CSS
- ✅ **Production Ready** - Type-safe (TypeScript), async/await, error handling
- ✅ **Multi-session Support** - Track devices, IP addresses, locations

---

## ✨ Features

### 🔐 Authentication & User Management

- **Login/Register** dengan username & password
- **JWT Token Authentication** (7 days expiry)
- **Multi-Session Management**:
  - Track active sessions across devices
  - View device info, IP address, and location
  - Revoke specific sessions
  - Logout from all devices
- **Role-Based Access Control**:
  - **User**: Chat access only
  - **Uploader**: Upload documents + chat
  - **Admin**: Full access (upload, chat, user management)
- **Profile Management**:
  - Update profile (username, email, phone, location)
  - Upload profile image
  - Change password
- **Security Features**:
  - Two-factor authentication (2FA)
  - Session timeout
  - Password policy
  - Login attempts limit
  - IP whitelist
  - Audit logs

### 💬 AI Chat Interface

- **OpenAI Assistants API Integration**:
  - Advanced reasoning capabilities
  - Function calling for document retrieval
  - Thread continuity across conversation
- **Session Management**:
  - Multiple chat sessions
  - Smart session titles (auto-generated)
  - Session history with timestamps
  - Delete individual sessions or clear all
- **Message Features**:
  - Real-time AI responses
  - Message feedback (like/dislike)
  - Edit messages
  - Copy message content
  - Markdown rendering with:
    - GitHub Flavored Markdown (GFM)
    - Code syntax highlighting
    - Tables support
    - Line breaks
    - Links (auto-open in new tab)
- **UI Features**:
  - Responsive sidebar (collapsible on desktop, overlay on mobile)
  - Auto-scroll to latest message
  - Loading indicators
  - Empty state for new chats

### 📄 Document Upload & Processing

- **Drag & Drop Interface**:
  - Visual drag-over state
  - Multi-file upload support
- **Supported Formats**:
  - PDF, DOCX, TXT, CSV, JSON, XLSX
- **Smart Processing**:
  - Automatic text extraction
  - Metadata extraction from filename (date, unit, page)
  - Chunking (1000 characters with 200 overlap)
  - Embedding generation (Ollama bge-m3)
  - Vector storage (Qdrant)
  - BM25 index update
- **Upload Tracking**:
  - File name and size
  - Upload timestamp
  - Status (uploading, success, error)
  - Progress indication

### 🔍 Hybrid Retrieval System

- **BM25 (Sparse Retrieval)**:
  - Keyword-based search
  - Fast initial filtering
  - Customizable weights (k1=1.5, b=0.75)
- **Dense Vector Search (Qdrant)**:
  - Semantic similarity search
  - 1536-dimensional embeddings (bge-m3)
  - Cosine distance metric
- **Date-Aware Filtering**:
  - Automatic date extraction from queries
  - STRICT date filtering in Qdrant
  - Support for date ranges and specific dates
- **Smart Ranking**:
  - Combined BM25 + dense scores
  - Top-k retrieval (default: 10 documents)

### 👨‍💼 Admin Dashboard

- **User Management**:
  - View all users (table view)
  - Add/edit/delete users
  - Toggle user active/inactive status
  - Filter by role
  - Search users by username
- **Document Management**:
  - View uploaded documents
  - Document statistics
  - Delete documents
- **Session Monitoring**:
  - View active sessions
  - Session statistics
  - Device information
- **System Monitoring**:
  - Health checks
  - Performance metrics
  - Error logs

### 🎨 UI/UX Features

- **Theme Management**:
  - Light mode
  - Dark mode
  - System preference detection
- **Responsive Design**:
  - Mobile-first approach
  - Tablet optimization
  - Desktop enhancement
- **Personalization**:
  - Profile customization
  - Theme preferences
  - Settings modal
- **Location Services**:
  - Browser geolocation API
  - Reverse geocoding (coordinates → city, country)
  - Permission modal with opt-in/opt-out

---

## 🏗️ System Architecture

### High-Level Architecture

```
┌───────────────────────────────────────────────────────────────────┐
│                        Client Layer                                │
│                                                                     │
│  Next.js 14 Frontend (http://localhost:3000)                      │
│  - React 18 + TypeScript 5                                        │
│  - Tailwind CSS + Dark Mode                                       │
│  - Context API (Auth, Theme, Location)                            │
│  - React Hook Form + Axios                                        │
└─────────────────────────────┬─────────────────────────────────────┘
                              │
                              ↓ HTTP/REST API
                              │
┌─────────────────────────────┴─────────────────────────────────────┐
│                     Application Layer                              │
│                                                                     │
│  FastAPI Backend (http://localhost:8000)                          │
│  - Python 3.11+ async/await                                       │
│  - JWT Authentication                                              │
│  - Role-Based Access Control                                       │
│  - OpenAI Assistants API Integration                               │
│  - Document Processing Pipeline                                    │
└───────────┬─────────────┬─────────────┬──────────────┬────────────┘
            │             │             │              │
            ↓             ↓             ↓              ↓
    ┌───────────┐ ┌──────────┐ ┌──────────────┐ ┌──────────┐
    │PostgreSQL │ │  Qdrant  │ │ OpenAI API   │ │  Ollama  │
    │ Database  │ │  Vector  │ │ (Assistants) │ │  (bge-m3)│
    │(Port 5432)│ │(Port 6333)│ │              │ │(Port 11434)│
    └───────────┘ └──────────┘ └──────────────┘ └──────────┘
         │              │              │              │
    ┌────┴──────────────┴──────────────┴──────────────┴────┐
    │                  Data Layer                           │
    │                                                        │
    │  - User accounts & sessions                           │
    │  - Chat history & documents                           │
    │  - Vector embeddings (1536 dims)                      │
    │  - BM25 corpus & index                                │
    │  - Audit logs & metrics                               │
    └────────────────────────────────────────────────────────┘
```

### Request Flow

#### 1. **Document Upload Flow**

```
User (Frontend)
    │
    ├─► POST /upload (FormData: file)
    │
Backend (FastAPI)
    │
    ├─► Validate file format (PDF, DOCX, TXT, CSV, JSON, XLSX)
    ├─► Save file to disk
    ├─► Extract text (ThreadPoolExecutor)
    │   ├─► PDF: PyPDF2
    │   ├─► DOCX: python-docx
    │   ├─► XLSX: openpyxl
    │   └─► Others: direct read
    ├─► Extract metadata from filename
    │   ├─► Date: regex patterns (DD-MM-YYYY, DDMMYYYY, etc.)
    │   ├─► Unit: common patterns (Pusat, Wilayah, etc.)
    │   └─► Page: numeric patterns
    ├─► Chunk text (1000 chars, 200 overlap)
    ├─► Generate embeddings (Ollama bge-m3)
    ├─► Store in Qdrant vector DB
    ├─► Update BM25 index (rank_bm25)
    ├─► Save metadata to PostgreSQL
    │
    └─► Return success response
```

#### 2. **Chat Query Flow**

```
User (Frontend)
    │
    ├─► POST /chat/openai-assistant
    │   Body: { question: string, session_id: string, thread_id?: string }
    │
Backend (FastAPI)
    │
    ├─► Parse date from query (date_parser_service)
    │   ├─► Extract date entities (spaCy + regex)
    │   └─► Normalize to YYYY-MM-DD
    │
    ├─► Analyze query (query_analyzer)
    │   └─► Determine if retrieval needed
    │
    ├─► OpenAI Assistants API
    │   ├─► Create/retrieve thread
    │   ├─► Add user message
    │   ├─► Run assistant
    │   │   ├─► Function call: retrieve_documents
    │   │   │   ├─► Hybrid retrieval (BM25 + Qdrant)
    │   │   │   ├─► Date filtering (STRICT if date present)
    │   │   │   └─► Return top 10 documents
    │   │   └─► Generate response with documents
    │   └─► Stream response
    │
    ├─► Save to PostgreSQL
    │   ├─► history_chat (question, answer, session_id)
    │   └─► Update last_active
    │
    └─► Return { answer, session_id, thread_id }
```

#### 3. **Authentication Flow**

```
User (Frontend)
    │
    ├─► POST /auth/login
    │   Body: { username: string, password: string }
    │
Backend (FastAPI)
    │
    ├─► Validate credentials (bcrypt password hash)
    ├─► Create JWT token (7 days expiry)
    ├─► Create session record (device_info, ip_address, location)
    ├─► Update last_login timestamp
    │
    └─► Return { access_token, token_type, user, session_id }
    │
Frontend
    │
    ├─► Store token in cookie (7 days)
    ├─► Store session_id in cookie
    ├─► Fetch user data (GET /auth/me)
    ├─► Trigger location permission modal
    ├─► Redirect based on role:
    │   ├─► admin/uploader → /upload
    │   └─► user → /chat
    │
    └─► Update AuthContext state
```

### Data Models

#### PostgreSQL Schema

```sql
-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    profile_image VARCHAR(500),
    role VARCHAR(20) DEFAULT 'user',  -- user, admin, uploader
    location VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

-- Chat history
CREATE TABLE history_chat (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    session_id VARCHAR(100),
    thread_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Upload history
CREATE TABLE history_upload (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    filename VARCHAR(500) NOT NULL,
    file_path VARCHAR(1000) NOT NULL,
    file_size INTEGER,
    file_type VARCHAR(50),
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'processed'
);

-- Document chunks
CREATE TABLE document_chunks (
    id SERIAL PRIMARY KEY,
    upload_id INTEGER REFERENCES history_upload(id),
    chunk_text TEXT NOT NULL,
    chunk_index INTEGER,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User sessions
CREATE TABLE user_sessions (
    id VARCHAR(100) PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    device_info TEXT,
    ip_address VARCHAR(50),
    location VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

-- Audit logs
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100),
    resource_id VARCHAR(100),
    details JSONB,
    ip_address VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Qdrant Vector Collection

```python
# Collection: my_documents
{
    "vectors": {
        "size": 1536,  # bge-m3 embedding dimensions
        "distance": "Cosine"
    },
    "payload_schema": {
        "text": "text",          # Document chunk text
        "filename": "keyword",   # Original filename
        "date": "keyword",       # Extracted date (YYYY-MM-DD)
        "unit": "keyword",       # Extracted unit name
        "page": "integer",       # Page number
        "chunk_index": "integer" # Chunk sequence number
    }
}
```

---

## 🛠️ Tech Stack

### Frontend

| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| **Framework** | Next.js | 14.0.0 | React framework with App Router |
| **UI Library** | React | ^18 | Component-based UI |
| **Language** | TypeScript | ^5 | Type-safe JavaScript |
| **Styling** | Tailwind CSS | ^3.3.0 | Utility-first CSS framework |
| **HTTP Client** | Axios | ^1.6.2 | API requests |
| **State Management** | React Context | Built-in | Global state (Auth, Theme, Location) |
| **Form Handling** | React Hook Form | ^7.48.2 | Form validation |
| **Markdown** | react-markdown | ^9.0.1 | Markdown rendering |
| **Icons** | lucide-react | ^0.294.0 | Icon library |
| **Notifications** | react-hot-toast | ^2.4.1 | Toast messages |
| **Cookie Management** | js-cookie | ^3.0.5 | Client-side cookies |
| **Utilities** | clsx + tailwind-merge | Latest | Conditional classes |

### Backend

| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| **Framework** | FastAPI | ^0.104.0 | Async Python web framework |
| **Language** | Python | 3.11+ | Backend language |
| **Database** | PostgreSQL | 16 | Relational database |
| **Vector DB** | Qdrant | 1.7+ | Vector similarity search |
| **ORM** | SQLAlchemy | ^2.0.23 | Database ORM |
| **Authentication** | python-jose + passlib | Latest | JWT tokens + password hashing |
| **AI/ML** | OpenAI Python SDK | ^1.3.0 | OpenAI Assistants API |
| **Embeddings** | Ollama | Latest | Local embedding (bge-m3) |
| **Document Processing** | PyPDF2, python-docx, openpyxl | Latest | File parsing |
| **Search** | rank-bm25 | Latest | Keyword search |
| **NLP** | spaCy | ^3.7.2 | Date entity extraction |
| **HTTP Client** | httpx | ^0.25.1 | Async HTTP requests |
| **Validation** | Pydantic | ^2.4.0 | Data validation |

### DevOps & Tools

| Category | Technology | Purpose |
|----------|-----------|---------|
| **Version Control** | Git | Source code management |
| **Package Manager** | npm/pip | Dependency management |
| **Development Server** | Uvicorn | ASGI server |
| **API Documentation** | Swagger UI | Auto-generated API docs |
| **Environment** | python-dotenv | Environment variables |

---

## 📁 Project Structure

```
docai/
├── backend/                          # FastAPI backend
│   ├── main.py                       # Application entry point
│   ├── config.py                     # Configuration (DB, API keys, etc.)
│   ├── timezone_config.py            # Jakarta timezone settings
│   ├── requirements.txt              # Python dependencies
│   ├── Dockerfile                    # Docker configuration
│   ├── create_admin.py              # Script to create admin user
│   ├── clean_db.py                  # Database cleanup script
│   │
│   ├── db/                          # Database layer
│   │   ├── database.py              # Database connection
│   │   └── models.py                # SQLAlchemy models
│   │
│   ├── routes/                      # API routes
│   │   ├── auth.py                  # Authentication endpoints
│   │   ├── upload.py                # Document upload endpoints
│   │   ├── chat.py                  # Chat endpoints
│   │   ├── admin.py                 # Admin endpoints
│   │   └── monitoring.py            # Monitoring endpoints
│   │
│   ├── services/                    # Business logic
│   │   ├── document_loader.py       # Document processing
│   │   ├── embedding.py             # Embedding generation
│   │   ├── vectorstore.py           # Qdrant operations
│   │   ├── bm25_index.py            # BM25 search
│   │   ├── extractor.py             # Metadata extraction
│   │   ├── date_parser_service.py   # Date parsing
│   │   ├── query_analyzer.py        # Query analysis
│   │   └── openai_assistant_service.py  # OpenAI integration
│   │
│   ├── utils/                       # Utilities
│   │   ├── auth.py                  # Auth helpers (JWT, password)
│   │   ├── timezone.py              # Timezone utilities
│   │   └── language_detect.py       # Language detection
│   │
│   ├── data/                        # Data files
│   │   └── bm25_corpus.jsonl        # BM25 index corpus
│   │
│   ├── uploads/                     # Uploaded files
│   │   └── profile_images/          # User profile images
│   │
│   ├── docs/                        # Documentation
│   └── README.md                    # Backend documentation
│
├── frontend/                         # Next.js frontend
│   ├── src/
│   │   ├── app/                     # Next.js App Router
│   │   │   ├── layout.tsx           # Root layout
│   │   │   ├── page.tsx             # Homepage
│   │   │   ├── globals.css          # Global styles
│   │   │   ├── auth/                # Auth pages
│   │   │   │   ├── login/
│   │   │   │   └── register/
│   │   │   ├── chat/                # Chat page
│   │   │   ├── upload/              # Upload page
│   │   │   └── admin/               # Admin pages
│   │   │       ├── page.tsx         # User management
│   │   │       ├── docs/            # Document management
│   │   │       └── sessions/        # Session monitoring
│   │   │
│   │   ├── components/              # React components
│   │   │   ├── ChatPage.tsx         # Chat interface (880 lines)
│   │   │   ├── UploadPage.tsx       # Upload interface (280 lines)
│   │   │   ├── ChatSidebar.tsx      # Chat sidebar
│   │   │   ├── AdminSidebar.tsx     # Admin sidebar
│   │   │   ├── Navigation.tsx       # Top navigation
│   │   │   ├── ProtectedRoute.tsx   # Route protection
│   │   │   ├── SettingsModal.tsx    # Settings modal
│   │   │   └── ui/                  # UI components
│   │   │       ├── Badge.tsx
│   │   │       ├── Button.tsx
│   │   │       ├── Card.tsx
│   │   │       ├── Input.tsx
│   │   │       ├── Loading.tsx
│   │   │       └── ThemeToggle.tsx
│   │   │
│   │   ├── contexts/                # React contexts
│   │   │   ├── AuthContext.tsx      # Auth state (178 lines)
│   │   │   ├── LocationContext.tsx  # Location state
│   │   │   └── ThemeContext.tsx     # Theme state
│   │   │
│   │   ├── lib/                     # Services
│   │   │   ├── auth.ts              # Auth API (200+ lines)
│   │   │   ├── chatService.ts       # Chat API (351 lines)
│   │   │   ├── locationService.ts   # Location API
│   │   │   └── utils.ts             # Utilities
│   │   │
│   │   ├── hooks/                   # Custom hooks
│   │   │   ├── useKeyboardShortcuts.ts
│   │   │   └── useLocationPermission.ts
│   │   │
│   │   └── utils/                   # Additional utilities
│   │       ├── timezone.ts
│   │       └── settingsTest.ts
│   │
│   ├── public/                      # Static files
│   │   └── icon/                    # App icons
│   │
│   ├── next.config.js               # Next.js config
│   ├── tailwind.config.js           # Tailwind config
│   ├── tsconfig.json                # TypeScript config
│   ├── package.json                 # Dependencies
│   └── README.md                    # Frontend documentation
│
├── .gitignore                        # Git ignore rules
├── LICENSE                           # License file
└── README.md                         # This file (root documentation)
```

---

## 📋 Prerequisites

### Required Software

| Software | Version | Purpose | Download Link |
|----------|---------|---------|---------------|
| **Node.js** | 16.x or higher | Frontend runtime | [nodejs.org](https://nodejs.org/) |
| **Python** | 3.11 or higher | Backend runtime | [python.org](https://www.python.org/) |
| **PostgreSQL** | 16 or higher | Database | [postgresql.org](https://www.postgresql.org/) |
| **Qdrant** | 1.7 or higher | Vector database | [qdrant.tech](https://qdrant.tech/) |
| **Ollama** | Latest | Local LLM & embeddings | [ollama.ai](https://ollama.ai/) |

### API Keys Required

1. **OpenAI API Key**
   - Sign up at [platform.openai.com](https://platform.openai.com/)
   - Create API key
   - Minimum credits: $5 for testing

### System Requirements

- **OS**: Windows 10/11, macOS, or Linux
- **RAM**: Minimum 8GB (16GB recommended)
- **Storage**: 10GB free space
- **CPU**: Multi-core processor recommended for Ollama

---

## 🚀 Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/ardianwn/learnai.git
cd learnai
```

### 2. Install PostgreSQL

**Windows:**
```bash
# Download from https://www.postgresql.org/download/windows/
# Install and set password for postgres user
```

**macOS:**
```bash
brew install postgresql@16
brew services start postgresql@16
```

**Linux:**
```bash
sudo apt update
sudo apt install postgresql-16
sudo systemctl start postgresql
```

**Create Database:**
```bash
# Login as postgres user
psql -U postgres

# Create database
CREATE DATABASE docai;

# Create user (optional)
CREATE USER docai_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE docai TO docai_user;
```

### 3. Install Qdrant

**Docker (Recommended):**
```bash
docker run -p 6333:6333 -v $(pwd)/qdrant_storage:/qdrant/storage qdrant/qdrant
```

**Local Installation:**
```bash
# Download from https://qdrant.tech/documentation/quick-start/
# Run the binary
./qdrant
```

### 4. Install Ollama

**Windows/macOS/Linux:**
```bash
# Download from https://ollama.ai/download
# Install and run

# Pull bge-m3 model for embeddings
ollama pull bge-m3
```

### 5. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your settings:
# - DATABASE_URL
# - OPENAI_API_KEY
# - QDRANT_URL
# - OLLAMA_URL

# Create admin user
python create_admin.py

# Run migrations (if needed)
# alembic upgrade head

# Start backend server
python main.py
# or
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Backend will run on: `http://localhost:8000`

### 6. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local

# Start development server
npm run dev
```

Frontend will run on: `http://localhost:3000`

### 7. Access Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Qdrant Dashboard**: http://localhost:6333/dashboard

### 8. Default Admin Credentials

```
Username: admin
Password: admin123
```

**⚠️ IMPORTANT**: Change default password immediately after first login!

---

## ⚙️ Configuration

### Backend Configuration (.env)

Create `backend/.env` file:

```env
# Database Configuration
DATABASE_URL=postgresql://postgres:password@localhost:5432/docai

# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-api-key-here
OPENAI_MODEL=gpt-4-turbo-preview
OPENAI_ASSISTANT_ID=asst_your_assistant_id  # Optional, will auto-create

# Qdrant Vector Database
QDRANT_URL=http://localhost:6333
QDRANT_COLLECTION_NAME=my_documents

# Ollama Configuration (Local LLM)
OLLAMA_URL=http://localhost:11434
OLLAMA_EMBEDDING_MODEL=bge-m3

# JWT Configuration
SECRET_KEY=your-secret-key-change-this-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_DAYS=7

# File Upload Configuration
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760  # 10MB in bytes

# CORS Configuration
CORS_ORIGINS=["http://localhost:3000"]

# Timezone
TIMEZONE=Asia/Jakarta

# Logging
LOG_LEVEL=INFO
```

### Frontend Configuration (.env.local)

Create `frontend/.env.local` file:

```env
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:8000

# Optional: Enable debug mode
NEXT_PUBLIC_DEBUG=false
```

---

## 🏃 Running the Application

### Development Mode

**Terminal 1 - Backend:**
```bash
cd backend
venv\Scripts\activate  # Windows
# source venv/bin/activate  # macOS/Linux
python main.py
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

**Terminal 3 - Qdrant (if not using Docker):**
```bash
# If using Docker:
docker run -p 6333:6333 -v $(pwd)/qdrant_storage:/qdrant/storage qdrant/qdrant

# If using local binary:
./qdrant
```

**Terminal 4 - Ollama:**
```bash
# Ollama should run as a service
# Verify it's running:
curl http://localhost:11434/api/tags
```

### Production Mode

**Backend:**
```bash
cd backend
venv\Scripts\activate
pip install gunicorn  # Production WSGI server

# Run with Gunicorn
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8000

# Or with Uvicorn
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

**Frontend:**
```bash
cd frontend
npm run build
npm run start
```

### Docker Compose (Recommended for Production)

Create `docker-compose.yml` in root:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: docai
      POSTGRES_USER: docai_user
      POSTGRES_PASSWORD: secure_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  qdrant:
    image: qdrant/qdrant:latest
    ports:
      - "6333:6333"
    volumes:
      - qdrant_data:/qdrant/storage

  backend:
    build: ./backend
    environment:
      DATABASE_URL: postgresql://docai_user:secure_password@postgres:5432/docai
      QDRANT_URL: http://qdrant:6333
      OPENAI_API_KEY: ${OPENAI_API_KEY}
    ports:
      - "8000:8000"
    depends_on:
      - postgres
      - qdrant

  frontend:
    build: ./frontend
    environment:
      NEXT_PUBLIC_API_URL: http://backend:8000
    ports:
      - "3000:3000"
    depends_on:
      - backend

volumes:
  postgres_data:
  qdrant_data:
```

Run with:
```bash
docker-compose up -d
```

---

## 👥 User Roles

### 1. **User** Role

**Access:**
- ✅ Chat interface (`/chat`)
- ✅ View chat history
- ✅ Update profile settings
- ✅ Manage sessions
- ❌ Upload documents
- ❌ Admin dashboard

**Use Case:**
Regular users who want to chat with AI based on uploaded documents.

### 2. **Uploader** Role

**Access:**
- ✅ Upload documents (`/upload`)
- ✅ Chat interface (`/chat`)
- ✅ View upload history
- ✅ Update profile settings
- ✅ Manage sessions
- ❌ Admin dashboard
- ❌ User management

**Use Case:**
Users responsible for uploading and maintaining document library.

### 3. **Admin** Role

**Access:**
- ✅ Full access to all features
- ✅ User management (`/admin`)
- ✅ Document management (`/admin/docs`)
- ✅ Session monitoring (`/admin/sessions`)
- ✅ Upload documents
- ✅ Chat interface
- ✅ System monitoring

**Use Case:**
System administrators with full control over users, documents, and system settings.

---

## 📚 API Documentation

### Quick Reference

- **API Docs (Swagger UI)**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **OpenAPI JSON**: http://localhost:8000/openapi.json

### Main Endpoints

#### Authentication

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/login` | Login user | ❌ |
| POST | `/auth/register` | Register new user | ❌ |
| GET | `/auth/me` | Get current user | ✅ |
| GET | `/auth/sessions` | Get active sessions | ✅ |
| DELETE | `/auth/sessions/{id}` | Revoke session | ✅ |
| POST | `/auth/logout` | Logout current session | ✅ |
| POST | `/auth/logout-all` | Logout all devices | ✅ |
| PUT | `/auth/update-profile` | Update profile | ✅ |
| POST | `/auth/upload-profile-image` | Upload profile image | ✅ |
| POST | `/auth/change-password` | Change password | ✅ |

#### Chat

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/chat/openai-assistant` | Send message (OpenAI Assistants) | ✅ |
| POST | `/chat/openai-tools` | Send message (OpenAI Tools) | ✅ |
| GET | `/chat/history` | Get chat history | ✅ |
| DELETE | `/chat/history/{id}` | Delete message | ✅ |
| DELETE | `/chat/session/{session_id}` | Delete session | ✅ |
| DELETE | `/chat/history` | Clear all history | ✅ |

#### Upload

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/upload/` | Upload document | ✅ (admin/uploader) |
| GET | `/upload/history` | Get upload history | ✅ |
| DELETE | `/upload/{id}` | Delete document | ✅ (admin) |

#### Admin

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/admin/users` | Get all users | ✅ (admin) |
| POST | `/admin/users` | Create user | ✅ (admin) |
| PUT | `/admin/users/{id}` | Update user | ✅ (admin) |
| DELETE | `/admin/users/{id}` | Delete user | ✅ (admin) |
| PATCH | `/admin/users/{id}/toggle-status` | Toggle user status | ✅ (admin) |

#### Monitoring

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/monitoring/health` | Health check | ❌ |
| GET | `/monitoring/stats` | System statistics | ✅ (admin) |

For detailed API documentation with request/response schemas, visit: http://localhost:8000/docs

---

## 📸 Screenshots

### 🎨 Logo & Branding
<div align="center">
  <img src="frontend/public/icon/icon.png" alt="DocAI Logo" width="400"/>
  <p><em>DocAI - AI-Powered Document Intelligence Platform</em></p>
</div>

---

### 👨‍💼 Admin Dashboard - User Management
<div align="center">
  <img src="backend/uploads/profile_images/admin-preview.png" alt="User Management" width="100%"/>
</div>

**Features:**
- ✅ View all users with detailed information (ID, role, status, created date, last login)
- ✅ Search users by username
- ✅ Filter by role (Admin, User, Uploader)
- ✅ Add new users with role assignment
- ✅ Edit user information and toggle active status
- ✅ Delete users with confirmation
- ✅ Responsive design - mobile & desktop optimized
- ✅ Dark mode support

---

### 💬 AI Chat Interface
<div align="center">
  <img src="backend/uploads/profile_images/chat-preview.png" alt="Chat Interface" width="100%"/>
</div>

**Features:**
- ✅ **OpenAI Assistants API** integration with advanced reasoning
- ✅ **Date-aware queries** - automatic date extraction and filtering
- ✅ **Thread continuity** - maintains conversation context
- ✅ **Markdown rendering** - tables, lists, code blocks, bold text
- ✅ **Message actions** - copy, share, regenerate, read aloud (TTS)
- ✅ **Edit & regenerate** - edit user questions and get new responses
- ✅ **Multiple chat sessions** - organized by date
- ✅ **Voice input** - speech-to-text for hands-free interaction
- ✅ **Voice output** - text-to-speech to read AI responses
- ✅ **Dynamic loading indicators** - shows AI processing stages
- ✅ **Responsive sidebar** - collapsible on desktop, overlay on mobile

---

### ⚙️ Settings & Personalization
<div align="center">
  <img src="backend/uploads/profile_images/switch-theme.png" alt="Settings Modal" width="100%"/>
</div>

**Features:**
- ✅ **Theme selection** - Light, Dark, or System preference
- ✅ **Account settings** - update profile information
- ✅ **Privacy & Security** - password change, 2FA setup
- ✅ **Session management** - view and manage active sessions across devices
- ✅ **Contact support** - integrated support form
- ✅ **Location services** - geolocation for personalized experience

---

### 📤 Document Upload
<div align="center">
  <img src="backend\uploads\profile_images\upload-page.png" alt="Upload Documents" width="100%"/>
</div>

**Features:**
- ✅ **Drag & drop** interface with visual feedback
- ✅ **Multi-file upload** - upload multiple documents at once
- ✅ **Supported formats** - PDF, DOCX, TXT, CSV, JSON, XLSX
- ✅ **Format validation** - automatic file type checking
- ✅ **Smart processing** - automatic text extraction and chunking
- ✅ **Metadata extraction** - date extraction from filename (e.g., "Report 2025-03-01.pdf")
- ✅ **Vector embedding** - semantic search with Qdrant
- ✅ **BM25 indexing** - keyword-based search
- ✅ **Role-based access** - only Uploader and Admin roles can upload

---

## 🚢 Deployment

### Vercel (Frontend)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy frontend
cd frontend
vercel

# Set environment variables in Vercel dashboard:
# NEXT_PUBLIC_API_URL=https://your-backend-api.com
```

### Railway / Render (Backend)

**Using Docker:**

1. Push code to GitHub
2. Connect repository to Railway/Render
3. Set environment variables
4. Deploy

**Environment Variables:**
```
DATABASE_URL=postgresql://user:pass@host:5432/db
OPENAI_API_KEY=sk-...
QDRANT_URL=http://qdrant:6333
OLLAMA_URL=http://ollama:11434
SECRET_KEY=...
```

### VPS Deployment

**Prerequisites:**
- VPS with Ubuntu 22.04+
- Domain name (optional)
- SSL certificate (recommended)

**Steps:**

1. **Setup server:**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install dependencies
sudo apt install -y python3.11 python3.11-venv postgresql nginx

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install Docker (for Qdrant)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
```

2. **Clone repository:**
```bash
git clone https://github.com/ardianwn/learnai.git
cd learnai
```

3. **Setup backend:**
```bash
cd backend
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Configure .env
nano .env

# Create systemd service
sudo nano /etc/systemd/system/docai-backend.service
```

**docai-backend.service:**
```ini
[Unit]
Description=DocAI Backend
After=network.target postgresql.service

[Service]
User=your-user
WorkingDirectory=/path/to/docai/backend
Environment="PATH=/path/to/docai/backend/venv/bin"
ExecStart=/path/to/docai/backend/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable docai-backend
sudo systemctl start docai-backend
```

4. **Setup frontend:**
```bash
cd ../frontend
npm install
npm run build

# Create systemd service
sudo nano /etc/systemd/system/docai-frontend.service
```

**docai-frontend.service:**
```ini
[Unit]
Description=DocAI Frontend
After=network.target

[Service]
User=your-user
WorkingDirectory=/path/to/docai/frontend
Environment="NODE_ENV=production"
ExecStart=/usr/bin/npm start

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable docai-frontend
sudo systemctl start docai-frontend
```

5. **Configure Nginx:**
```bash
sudo nano /etc/nginx/sites-available/docai
```

**Nginx config:**
```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/docai /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

6. **Setup SSL (optional but recommended):**
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## 🐛 Troubleshooting

### Common Issues

#### 1. Backend Won't Start

**Error:** `Connection refused to PostgreSQL`

**Solution:**
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Start PostgreSQL
sudo systemctl start postgresql

# Verify connection
psql -U postgres -h localhost -p 5432
```

#### 2. Qdrant Connection Failed

**Error:** `Could not connect to Qdrant`

**Solution:**
```bash
# Check Qdrant is running
curl http://localhost:6333/health

# Start Qdrant (Docker)
docker run -p 6333:6333 qdrant/qdrant

# Check Qdrant logs
docker logs <container-id>
```

#### 3. Ollama Not Responding

**Error:** `Ollama connection timeout`

**Solution:**
```bash
# Verify Ollama is running
curl http://localhost:11434/api/tags

# Check bge-m3 model is installed
ollama list

# Pull model if missing
ollama pull bge-m3
```

#### 4. OpenAI API Errors

**Error:** `Invalid API key`

**Solution:**
```bash
# Verify API key is set in .env
cat backend/.env | grep OPENAI_API_KEY

# Test API key
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

#### 5. File Upload Fails

**Error:** `413 Request Entity Too Large`

**Solution:**
```python
# backend/config.py
MAX_FILE_SIZE = 10 * 1024 * 1024  # Increase to 10MB

# Also update Nginx if using reverse proxy
# client_max_body_size 10M;
```

#### 6. Dark Mode Not Working

**Solution:**
```bash
# Clear localStorage
# Open browser console:
localStorage.clear()
location.reload()
```

#### 7. Chat History Not Loading

**Solution:**
```bash
# Check backend logs
tail -f backend/logs/app.log

# Verify database connection
psql -U postgres -d docai -c "SELECT COUNT(*) FROM history_chat;"

# Clear frontend cache
# Browser console:
localStorage.removeItem('chatSessions')
```

### Debug Mode

**Backend:**
```python
# main.py
import logging
logging.basicConfig(level=logging.DEBUG)
```

**Frontend:**
```bash
# .env.local
NEXT_PUBLIC_DEBUG=true
```

### Getting Help

- **GitHub Issues**: [github.com/ardianwn/learnai/issues](https://github.com/ardianwn/learnai/issues)
- **Email**: support@docai.com
- **Documentation**: Check `backend/README.md` and `frontend/README.md`

---

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

### Development Workflow

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make your changes**
4. **Commit with conventional commits**
   ```bash
   git commit -m "feat: add amazing feature"
   ```
5. **Push to your fork**
   ```bash
   git push origin feature/amazing-feature
   ```
6. **Open a Pull Request**

### Commit Convention

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting)
- `refactor:` - Code refactoring
- `test:` - Adding tests
- `chore:` - Maintenance tasks

### Code Style

**Python (Backend):**
- Follow PEP 8
- Use type hints
- Document functions with docstrings

**TypeScript (Frontend):**
- Follow ESLint rules
- Use TypeScript types
- Document components with JSDoc

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

```
MIT License

Copyright (c) 2025 DocAI Team

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 📞 Contact & Support

### Project Maintainers

- **GitHub**: [@ardianwn](https://github.com/ardianwn)
- **Repository**: [github.com/ardianwn/learnai](https://github.com/ardianwn/learnai)

### Community

- **GitHub Discussions**: [Discussions](https://github.com/ardianwn/learnai/discussions)
- **Issues**: [Report Bug](https://github.com/ardianwn/learnai/issues)
- **Feature Requests**: [Request Feature](https://github.com/ardianwn/learnai/issues/new?template=feature_request.md)

---

## 🙏 Acknowledgments

### Technologies

- [Next.js](https://nextjs.org/) - React framework
- [FastAPI](https://fastapi.tiangolo.com/) - Python web framework
- [OpenAI](https://openai.com/) - AI/ML platform
- [Qdrant](https://qdrant.tech/) - Vector database
- [PostgreSQL](https://www.postgresql.org/) - Relational database
- [Ollama](https://ollama.ai/) - Local LLM runtime
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework

### Inspiration

- OpenAI's Assistants API documentation
- Qdrant's hybrid search examples
- Next.js App Router best practices

---

## 📊 Project Statistics

- **Total Lines of Code**: ~15,000+
- **Backend LOC**: ~5,000+ (Python)
- **Frontend LOC**: ~10,000+ (TypeScript/TSX)
- **Components**: 20+ React components
- **API Endpoints**: 40+ REST endpoints
- **Database Tables**: 6 tables
- **Dependencies**: 50+ packages

---

## 🗺️ Roadmap

### Version 1.1 (Planned)

- [ ] Multi-language support (English, Indonesian)
- [ ] Real-time collaboration
- [ ] Advanced analytics dashboard
- [ ] Export chat history (PDF, CSV)
- [ ] Custom embedding models
- [ ] Voice input/output
- [ ] Mobile app (React Native)

### Version 2.0 (Future)

- [ ] On-premise deployment option
- [ ] LDAP/Active Directory integration
- [ ] Advanced document preprocessing
- [ ] Custom AI model training
- [ ] API rate limiting
- [ ] Webhook support

---

## 📝 Changelog

### Version 1.0.0 (2025-01-XX)

**Initial Release**

- ✅ OpenAI Assistants API integration
- ✅ Hybrid retrieval (BM25 + Dense)
- ✅ Multi-session management
- ✅ Document upload & processing
- ✅ Role-based access control
- ✅ Dark mode support
- ✅ Admin dashboard
- ✅ Location services
- ✅ Profile management
- ✅ Security features (2FA, audit logs)

---

**Made with ❤️ by DocAI Team**

**Last Updated**: November 10, 2025  
**Version**: 1.0.0

---

*For detailed documentation:*
- **Backend**: [backend/README.md](backend/README.md)
- **Frontend**: [frontend/README.md](frontend/README.md)
