import os
from dotenv import load_dotenv
from pydantic_settings import BaseSettings

# Load environment variables
load_dotenv()

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/vectorchat")
    QDRANT_URL: str = os.getenv("QDRANT_URL", "http://localhost:6333")
    
    # Ollama (Embedding Model)
    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "")
    OLLAMA_EMBEDDING_MODEL: str = os.getenv("OLLAMA_EMBEDDING_MODEL", "bge-m3:latest")
    
    # OpenAI (Chat Processing)
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    OPENAI_CHAT_MODEL: str = os.getenv("OPENAI_CHAT_MODEL", "gpt-4o")
    OPENAI_TEMPERATURE: float = float(os.getenv("OPENAI_TEMPERATURE", "0.7"))
    OPENAI_MAX_TOKENS: int = int(os.getenv("OPENAI_MAX_TOKENS", "2000"))
    
    class Config:
        env_file = ".env"

settings = Settings()

# Initialize services
from services.embedding import get_embedding_model
from services.vectorstore import get_qdrant_vectorstore

print("🔧 Inisialisasi embedding model (bge-m3:latest)...")
embedding = get_embedding_model()

print("🔧 Menggunakan Qdrant embedded di docker...")
vectorstore = get_qdrant_vectorstore(embedding)
