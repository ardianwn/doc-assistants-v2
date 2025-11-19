from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, SearchParams
from langchain_qdrant import QdrantVectorStore
from qdrant_client.models import Filter as QFilter, FieldCondition, MatchValue
import os
import threading
import asyncio
import logging
from typing import List, Optional
from .bm25_index import build_bm25_retriever, persist_corpus
from langchain_core.documents import Document

# Thread-local storage for Qdrant clients
local_storage = threading.local()
logger = logging.getLogger(__name__)

# ASYNC PATCH: Semaphore for concurrent retrieval throttling
retrieval_semaphore = asyncio.Semaphore(3)

def get_qdrant_client():
    """Get thread-local Qdrant client for better concurrency"""
    if not hasattr(local_storage, 'client'):
        qdrant_url = os.getenv("QDRANT_URL", "http://localhost:6333")
        qdrant_api_key = os.getenv("QDRANT_API_KEY", "")
        
        # Connect to Dockerized Qdrant service
        local_storage.client = QdrantClient(
            url=qdrant_url,
            api_key=qdrant_api_key if qdrant_api_key else None,
            timeout=120,
            prefer_grpc=False,
            check_compatibility=False,
        )
    return local_storage.client

def get_qdrant_vectorstore(embedding):
    """Get optimized Qdrant vectorstore for enhanced search accuracy"""
    # Use thread-local client
    client = get_qdrant_client()
    collection_name = "my_documents"

    # Check if collection exists - handle 404 as "not exists"
    try:
        collection_exists = client.collection_exists(collection_name)
    except Exception as e:
        # 404 or connection errors mean collection doesn't exist
        logger.warning(f"Error checking collection existence: {e}")
        collection_exists = False

    if not collection_exists:
        print("📦 Koleksi belum ada, membuat koleksi baru dengan konfigurasi optimal...")
        try:
            client.recreate_collection(
                collection_name=collection_name,
                vectors_config=VectorParams(
                    size=len(embedding.embed_query("test")),
                    distance=Distance.COSINE
                )
            )
            print("✅ Koleksi dibuat dengan konfigurasi search yang dioptimalkan")
        except Exception as e:
            logger.error(f"Failed to create collection: {e}")
            raise

    # Create vectorstore using langchain_qdrant.QdrantVectorStore
    vectorstore = QdrantVectorStore(
        client=client,
        collection_name=collection_name,
        embedding=embedding,
        content_payload_key="page_content",
        metadata_payload_key="metadata"
    )
    
    return vectorstore

def enhanced_similarity_search(vectorstore, query: str, k: int = 10, score_threshold: float = 0.3):
    """Enhanced similarity search with improved ranking"""
    try:
        # Multi-strategy search approach
        results = []
        
        # Strategy 1: Standard similarity search with scores, with higher ef_search
        try:
            client = get_qdrant_client()
            client.set_model_query_params(
                collection_name="my_documents",
                search_params=SearchParams(hnsw_ef=256)
            )
        except Exception:
            pass

        docs_with_scores = vectorstore.similarity_search_with_score(query, k=k*3)
        
        # Filter and rank results
        filtered_results = []
        for doc, score in docs_with_scores:
            # Lower score = better similarity in cosine distance
            if score <= (1.0 - score_threshold):  # Convert threshold for cosine distance
                filtered_results.append((doc, score))
        
        # Sort by score (lower is better for cosine distance)
        filtered_results.sort(key=lambda x: x[1])
        
        # Take top k results
        final_results = filtered_results[:k]
        
        print(f"📊 Enhanced search: {len(final_results)} docs (threshold: {score_threshold})")
        for i, (doc, score) in enumerate(final_results[:3]):
            similarity_pct = (1.0 - score) * 100  # Convert to similarity percentage
            content_preview = doc.page_content[:100].replace('\n', ' ')
            print(f"  [{i+1}] Similarity: {similarity_pct:.1f}% | {content_preview}...")
        
        return [doc for doc, score in final_results]
        
    except Exception as e:
        print(f"❌ Enhanced search failed: {e}")
        # Fallback to standard search
        return vectorstore.similarity_search(query, k=k)


def mmr_search(vectorstore, query: str, k: int = 8, fetch_k: int = 40):
    """Maximal Marginal Relevance search to diversify results."""
    try:
        return vectorstore.max_marginal_relevance_search(query, k=k, fetch_k=fetch_k)
    except Exception:
        return vectorstore.similarity_search(query, k=k)


def merge_results_unique(docs: List, max_k: int = 10):
    """Merge multiple doc lists while removing near duplicates by id/content prefix."""
    seen = set()
    merged = []
    for d in docs:
        for doc in d:
            key = getattr(doc, "id", None) or (doc.page_content[:120] if doc.page_content else "")
            if key in seen:
                continue
            seen.add(key)
            merged.append(doc)
            if len(merged) >= max_k:
                return merged
    return merged[:max_k]


class HybridRetriever:
    """Hybrid retriever: BM25 + Qdrant dense → union → MMR."""

    def __init__(self, vectorstore):
        self.vectorstore = vectorstore
        self._bm25 = None

    def _ensure_bm25(self):
        if self._bm25 is None:
            # Attempt to build BM25 from persisted corpus; if empty, skip
            try:
                self._bm25 = build_bm25_retriever([])
            except Exception:
                self._bm25 = None

    def add_to_corpus(self, documents: List[Document]):
        try:
            persist_corpus(documents)
            # Refresh BM25 with latest corpus
            self._bm25 = build_bm25_retriever(documents)
        except Exception:
            pass

    def retrieve(self, query: str, k_dense: int = 50, k_bm25: int = 50, final_k: int = 8, filters: Optional[dict] = None) -> List[Document]:
        """
        STRICT DATE FILTERING: Only retrieve documents that exactly match the target date.
        No fallback to other dates - if no exact match, return empty results.
        """
        self._ensure_bm25()
        candidates: List[List[Document]] = []
        
        target_date = filters.get("date") if filters else None
        logger.info(f"🔍 STRICT DATE FILTERING: Target date = {target_date}")
        
        # Step 1: Dense search with STRICT date filter
        if target_date:
            try:
                # Apply Qdrant payload filter by date
                qf = QFilter(must=[FieldCondition(key="metadata.date", match=MatchValue(value=target_date))])
                dense_filtered = self.vectorstore.similarity_search(query, k=k_dense, filter=qf)
                logger.info(f"📊 Dense search with date filter: {len(dense_filtered)} documents for {target_date}")
                
                # STRICT VERIFICATION: Only accept documents that exactly match the target date
                if dense_filtered:
                    actual_dates = [(getattr(doc, 'metadata', {}) or {}).get('date') for doc in dense_filtered]
                    matching_dates = [d for d in actual_dates if d == target_date]
                    logger.info(f"📊 Date filter verification: {len(matching_dates)}/{len(dense_filtered)} match {target_date}")
                    
                    if len(matching_dates) == len(dense_filtered):
                        # Filter worked perfectly - all documents match target date
                        candidates.append(dense_filtered)
                        logger.info(f"✅ STRICT COMPLIANCE: All {len(dense_filtered)} documents match {target_date}")
                    else:
                        # Filter didn't work perfectly - manually filter to ensure strict compliance
                        logger.warning(f"⚠️  Qdrant filter incomplete - found dates: {set(actual_dates)}")
                        dense_manual = [doc for doc in dense_filtered if (getattr(doc, 'metadata', {}) or {}).get('date') == target_date]
                        logger.info(f"📊 Manual strict filter: {len(dense_manual)} documents remain for {target_date}")
                        candidates.append(dense_manual)
                else:
                    logger.info(f"📊 No documents found with date filter for {target_date}")
                    
            except Exception as e:
                logger.error(f"❌ Dense search with filter failed: {e}")
        
        # Step 2: BM25 search with STRICT date filtering
        if target_date:
            try:
                if self._bm25 is not None:
                    bm25_docs = self._bm25.get_relevant_documents(query)
                    logger.info(f"📊 BM25 retrieved {len(bm25_docs)} documents")
                    
                    # STRICT filtering by date - only exact matches
                    bm25_filtered = [c for c in bm25_docs if (getattr(c, 'metadata', {}) or {}).get('date') == target_date]
                    logger.info(f"📊 BM25 strict date filter: {len(bm25_filtered)} documents match {target_date}")
                    candidates.append(bm25_filtered[:k_bm25])
            except Exception as e:
                logger.error(f"❌ BM25 search failed: {e}")
                pass
        else:
            # No date filter - use BM25 normally
            try:
                if self._bm25 is not None:
                    bm25_docs = self._bm25.get_relevant_documents(query)
                    logger.info(f"📊 BM25 retrieved {len(bm25_docs)} documents")
                    candidates.append(bm25_docs[:k_bm25])
            except Exception as e:
                logger.error(f"❌ BM25 search failed: {e}")
                pass
            
        # Step 3: Merge and STRICT final filtering
        union = merge_results_unique(candidates, max_k=max(k_dense, k_bm25))
        logger.info(f"📊 Union before final filter: {len(union)} documents")

        # STRICT Final date enforcement - NO FALLBACK
        if target_date and union:
            original_count = len(union)
            union = [d for d in union if (getattr(d, 'metadata', {}) or {}).get('date') == target_date]
            filtered_count = len(union)
            if original_count != filtered_count:
                logger.warning(f"⚠️  STRICT FILTER: Removed {original_count - filtered_count} documents with wrong dates")
            logger.info(f"✅ STRICT FILTER: {filtered_count} documents for {target_date}")

        # STRICT COMPLIANCE: If target_date specified but no exact matches, return empty
        if target_date and not union:
            logger.warning(f"❌ STRICT COMPLIANCE: No documents found for exact date {target_date}")
            return []

        # Return final results (already ranked by hybrid retrieval)
        final_results = union[:final_k]
        logger.info(f"🎯 Final results: {len(final_results)} documents")
        return final_results

    # ASYNC PATCH: Async version of retrieve method
    async def retrieve_async(self, query: str, k_dense: int = 50, k_bm25: int = 50, final_k: int = 8, filters: Optional[dict] = None) -> List[Document]:
        """
        STRICT DATE FILTERING: Only retrieve documents that exactly match the target date.
        No fallback to other dates - if no exact match, return empty results.
        """
        # ASYNC PATCH: Use semaphore to throttle concurrent retrievals
        async with retrieval_semaphore:
            self._ensure_bm25()
            candidates: List[List[Document]] = []
            
            target_date = filters.get("date") if filters else None
            logger.info(f"[ASYNC RETRIEVAL] Target date = {target_date}")
            
            # Step 1: Dense search with STRICT date filter (async)
            if target_date:
                try:
                    # Apply Qdrant payload filter by date
                    qf = QFilter(must=[FieldCondition(key="metadata.date", match=MatchValue(value=target_date))])

                    # Run similarity_search in thread pool (it's blocking)
                    dense_filtered = await asyncio.to_thread(
                        self.vectorstore.similarity_search,
                        query,
                        k=k_dense,
                        filter=qf
                    )

                    logger.info(f"[ASYNC] Dense search with date filter: {len(dense_filtered)} documents for {target_date}")

                    # STRICT VERIFICATION: Only accept documents that exactly match the target date
                    if dense_filtered:
                        actual_dates = [(getattr(doc, 'metadata', {}) or {}).get('date') for doc in dense_filtered]
                        matching_dates = [d for d in actual_dates if d == target_date]
                        logger.info(f"[ASYNC] Date filter verification: {len(matching_dates)}/{len(dense_filtered)} match {target_date}")

                        if len(matching_dates) == len(dense_filtered):
                            # Filter worked perfectly - all documents match target date
                            candidates.append(dense_filtered)
                            logger.info(f"✅ ASYNC STRICT COMPLIANCE: All {len(dense_filtered)} documents match {target_date}")
                        else:
                            # Filter didn't work perfectly - manually filter to ensure strict compliance
                            logger.warning(f"⚠️  ASYNC Qdrant filter incomplete - found dates: {set(actual_dates)}")
                            dense_manual = [doc for doc in dense_filtered if (getattr(doc, 'metadata', {}) or {}).get('date') == target_date]
                            logger.info(f"[ASYNC] Manual strict filter: {len(dense_manual)} documents remain for {target_date}")
                            candidates.append(dense_manual)
                    else:
                        logger.info(f"[ASYNC] No documents found with date filter for {target_date}")

                except Exception as e:
                    logger.error(f"❌ ASYNC Dense search with filter failed: {e}")
            
            # Step 2: BM25 search with STRICT date filtering (async)
            if target_date:
                try:
                    if self._bm25 is not None:
                        # Run BM25 retrieval in thread pool (it's blocking)
                        bm25_docs = await asyncio.to_thread(self._bm25.get_relevant_documents, query)
                        logger.info(f"[ASYNC] BM25 retrieved {len(bm25_docs)} documents")
                        
                        # STRICT filtering by date - only exact matches
                        bm25_filtered = [c for c in bm25_docs if (getattr(c, 'metadata', {}) or {}).get('date') == target_date]
                        logger.info(f"[ASYNC] BM25 strict date filter: {len(bm25_filtered)} documents match {target_date}")
                        candidates.append(bm25_filtered[:k_bm25])
                except Exception as e:
                    logger.error(f"❌ ASYNC BM25 search failed: {e}")
            else:
                # No date filter - use BM25 normally (async)
                try:
                    if self._bm25 is not None:
                        # Run BM25 retrieval in thread pool (it's blocking)
                        bm25_docs = await asyncio.to_thread(self._bm25.get_relevant_documents, query)
                        logger.info(f"[ASYNC] BM25 retrieved {len(bm25_docs)} documents")
                        candidates.append(bm25_docs[:k_bm25])
                except Exception as e:
                    logger.error(f"❌ ASYNC BM25 search failed: {e}")
            
            # Step 3: Merge and STRICT final filtering
            union = merge_results_unique(candidates, max_k=max(k_dense, k_bm25))
            logger.info(f"[ASYNC] Union before final filter: {len(union)} documents")

            # STRICT Final date enforcement - NO FALLBACK
            if target_date and union:
                original_count = len(union)
                union = [d for d in union if (getattr(d, 'metadata', {}) or {}).get('date') == target_date]
                filtered_count = len(union)
                if original_count != filtered_count:
                    logger.warning(f"⚠️  ASYNC STRICT FILTER: Removed {original_count - filtered_count} documents with wrong dates")
                logger.info(f"✅ ASYNC STRICT FILTER: {filtered_count} documents for {target_date}")

            # STRICT COMPLIANCE: If target_date specified but no exact matches, return empty
            if target_date and not union:
                logger.warning(f"❌ ASYNC STRICT COMPLIANCE: No documents found for exact date {target_date}")
                return []

            # Return final results (already ranked by hybrid retrieval)
            final_results = union[:final_k]
            logger.info(f"🎯 ASYNC Final results: {len(final_results)} documents")
            return final_results
