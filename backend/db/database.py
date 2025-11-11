from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import StaticPool
import os
from dotenv import load_dotenv

# Try to import async components, fall back to sync if not available
try:
    from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
    ASYNC_AVAILABLE = True
except ImportError:
    print("⚠️ Async SQLAlchemy components not available. Install 'asyncpg' for full async support.")
    ASYNC_AVAILABLE = False
    # Create dummy classes for type hints
    class AsyncSession:
        pass
    def async_sessionmaker(*args, **kwargs):
        return None

# Load environment variables from .env file
load_dotenv()

# Database configuration with environment variables
def get_database_url():
    """
    Construct database URL from environment variables.
    Supports both individual components and complete DATABASE_URL.
    """
    # Try to get complete DATABASE_URL first
    database_url = os.getenv("DATABASE_URL")
    
    if database_url:
        return database_url
    
    # If not found, construct from individual components
    db_host = os.getenv("DB_HOST", "localhost")
    db_port = os.getenv("DB_PORT", "5432")
    db_user = os.getenv("DB_USER", "postgres")
    db_password = os.getenv("DB_PASSWORD", "postgres")
    db_name = os.getenv("DB_NAME", "vectorchat")
    
    return f"postgresql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"

def get_async_database_url():
    """
    Get async version of database URL (postgresql+asyncpg://)
    """
    base_url = get_database_url()
    return base_url.replace("postgresql://", "postgresql+asyncpg://")

# Get the database URLs
DATABASE_URL = get_database_url()
ASYNC_DATABASE_URL = get_async_database_url()

# Create sync engine (always available)
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_size=10,  # Increase pool size for concurrent processing
    max_overflow=20,  # Allow additional connections
    pool_recycle=3600,  # Recycle connections every hour
    echo=os.getenv("DB_ECHO", "False").lower() == "true"  # Convert string to boolean
)

# Session makers
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create async engine only if async components are available
if ASYNC_AVAILABLE:
    async_engine = create_async_engine(
        ASYNC_DATABASE_URL,
        pool_pre_ping=True,
        echo=os.getenv("DB_ECHO", "False").lower() == "true"
    )
    
    AsyncSessionLocal = async_sessionmaker(
        async_engine,
        class_=AsyncSession,
        expire_on_commit=False
    )
else:
    async_engine = None
    AsyncSessionLocal = None

Base = declarative_base()

# Database dependencies
def get_db():
    """Synchronous database dependency (for backward compatibility)"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

async def get_async_db():
    """Async database dependency"""
    if not ASYNC_AVAILABLE or AsyncSessionLocal is None:
        raise RuntimeError("Async database not available. Install 'asyncpg' to use async features.")
    
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

# Test database connection
def test_db_connection():
    """
    Test the database connection and return connection status.
    """
    try:
        from sqlalchemy import text
        # Test connection
        with engine.connect() as connection:
            result = connection.execute(text("SELECT 1"))
            return True, "Database connection successful!"
    except Exception as e:
        return False, f"Database connection failed: {str(e)}"

# Initialize database tables
def init_db():
    """
    Initialize database tables and test connection first.
    """
    # Test connection before creating tables
    success, message = test_db_connection()
    if not success:
        raise Exception(f"Cannot initialize database: {message}")
    
    print(f"✅ {message}")
    
    from db.models import HistoryChat, User, UserSession, HistoryUpload
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created successfully!")

async def init_async_db():
    """
    Async version of database initialization
    """
    if not ASYNC_AVAILABLE or async_engine is None:
        print("⚠️ Async database initialization skipped - asyncpg not available")
        return
    
    from db.models import HistoryChat, User, UserSession, HistoryUpload
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✅ Async database tables created successfully!")

def get_available_dates():
    """
    Get all unique dates that have documents in the Qdrant vectorstore.
    
    Returns:
        List of date strings in YYYY-MM-DD format, sorted chronologically
    """
    try:
        from qdrant_client import QdrantClient
        import os
        
        # Connect to Qdrant
        qdrant_url = os.getenv("QDRANT_URL", "http://localhost:6333")
        qdrant_api_key = os.getenv("QDRANT_API_KEY", "")
        
        client = QdrantClient(
            url=qdrant_url,
            api_key=qdrant_api_key if qdrant_api_key else None,
            timeout=60
        )
        
        collection_name = "my_documents"
        
        # Check if collection exists
        if not client.collection_exists(collection_name):
            print(f"⚠️ Collection '{collection_name}' doesn't exist yet")
            return []
        
        # Get collection info to determine how many points exist
        collection_info = client.get_collection(collection_name)
        total_points = collection_info.points_count
        
        if total_points == 0:
            print(f"⚠️ Collection '{collection_name}' is empty")
            return []
        
        # Scroll through all points and extract unique dates
        unique_dates = set()
        offset = None
        batch_size = 100
        
        while True:
            # Scroll through points
            records, next_offset = client.scroll(
                collection_name=collection_name,
                limit=batch_size,
                offset=offset,
                with_payload=True,
                with_vectors=False  # We don't need vectors, only metadata
            )
            
            # Extract dates from metadata
            for record in records:
                payload = record.payload or {}
                metadata = payload.get("metadata", {})
                date_value = metadata.get("date")
                
                if date_value:
                    unique_dates.add(str(date_value))
            
            # Check if we've reached the end
            if next_offset is None:
                break
            
            offset = next_offset
        
        # Convert to sorted list
        available_dates = sorted(list(unique_dates))
        
        return available_dates
    
    except Exception as e:
        print(f"❌ Error getting available dates from Qdrant: {e}")
        return []

def get_date_range_info():
    """
    Get information about the date range of documents in the database.
    
    Returns:
        Dict with min_date, max_date, total_dates, and available_dates
    """
    dates = get_available_dates()
    
    if not dates:
        return {
            "min_date": None,
            "max_date": None,
            "total_dates": 0,
            "available_dates": []
        }
    
    return {
        "min_date": dates[0],
        "max_date": dates[-1],
        "total_dates": len(dates),
        "available_dates": dates
    }
