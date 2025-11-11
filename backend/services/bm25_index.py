import json
import os
from typing import List, Dict
from langchain_community.retrievers import BM25Retriever
from langchain_core.documents import Document


CORPUS_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "bm25_corpus.jsonl")
CORPUS_PATH = os.path.abspath(CORPUS_PATH)


def persist_corpus(documents: List[Document]):
    os.makedirs(os.path.dirname(CORPUS_PATH), exist_ok=True)
    with open(CORPUS_PATH, "w", encoding="utf-8") as f:
        for d in documents:
            payload = {
                "text": d.page_content,
                "metadata": getattr(d, "metadata", {}) or {},
            }
            f.write(json.dumps(payload, ensure_ascii=False) + "\n")


def load_corpus() -> List[Document]:
    documents: List[Document] = []
    if not os.path.exists(CORPUS_PATH):
        return documents
    with open(CORPUS_PATH, "r", encoding="utf-8") as f:
        for line in f:
            obj = json.loads(line)
            documents.append(Document(page_content=obj.get("text", ""), metadata=obj.get("metadata", {})))
    return documents


def build_bm25_retriever(documents: List[Document], k: int = 50) -> BM25Retriever:
    if not documents:
        documents = load_corpus()
    retriever = BM25Retriever.from_documents(documents)
    retriever.k = k
    return retriever



