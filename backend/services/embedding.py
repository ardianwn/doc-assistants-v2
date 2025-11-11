from langchain_ollama import OllamaEmbeddings
import os

def get_embedding_model():
    return OllamaEmbeddings(
        model=os.getenv("OLLAMA_EMBEDDING_MODEL", "bge-m3:latest"),
        base_url=os.getenv("OLLAMA_BASE_URL", "https://symphysial-zada-gustoish.ngrok-free.dev")
    )
