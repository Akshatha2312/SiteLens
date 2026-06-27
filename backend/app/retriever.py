import os
import json
import logging
from typing import List, Dict, Any

import numpy as np
import faiss

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DATA_DIR = os.path.join(BASE_DIR, "data")
INDEX_FILE = os.path.join(DATA_DIR, "faiss_index.bin")
METADATA_FILE = os.path.join(DATA_DIR, "faiss_metadata.json")

def _load_index() -> faiss.Index:
    if not os.path.exists(INDEX_FILE):
        logger.error("FAISS index not found: %s", INDEX_FILE)
        raise FileNotFoundError(f"FAISS index not found: {INDEX_FILE}")
    return faiss.read_index(INDEX_FILE)

def _load_metadata() -> List[Dict[str, Any]]:
    if not os.path.exists(METADATA_FILE):
        logger.error("FAISS metadata not found: %s", METADATA_FILE)
        raise FileNotFoundError(f"FAISS metadata not found: {METADATA_FILE}")
    with open(METADATA_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

_model = None

def _get_model():
    global _model
    if _model is None:
        try:
            from sentence_transformers import SentenceTransformer
            logger.info("Initializing cached SentenceTransformer('all-MiniLM-L6-v2')...")
            _model = SentenceTransformer('all-MiniLM-L6-v2')
        except Exception as e:
            logger.warning("Failed to initialize SentenceTransformer: %s", e)
            _model = "fallback"
    return _model

def search_faiss(query: str, k: int = 5) -> List[Dict[str, Any]]:
    """Search FAISS index for the top‑k most similar chunks.
    Returns a list of dicts with keys: ``chunk_id``, ``score`` (L2 distance) and ``text``.
    """
    index = _load_index()
    metadata = _load_metadata()
    
    model = _get_model()
    if model != "fallback" and model is not None:
        try:
            query_vec = model.encode([query])
            query_vec = np.array(query_vec, dtype="float32")
        except Exception as e:
            logger.warning("Failed to encode query with SentenceTransformer, falling back to deterministic: %s", e)
            from .utils import get_deterministic_vector
            query_vec = np.array([get_deterministic_vector(query)], dtype="float32")
    else:
        from .utils import get_deterministic_vector
        query_vec = np.array([get_deterministic_vector(query)], dtype="float32")

    distances, indices = index.search(query_vec, k)
    results: List[Dict[str, Any]] = []
    for dist, idx in zip(distances[0], indices[0]):
        if idx == -1:
            continue
        entry = metadata[idx]
        results.append({
            "chunk_id": entry.get("id"),
            "score": float(dist),
            "text": entry.get("text", "")
        })
    return results
