import os
import json
import logging
from typing import List, Dict

import numpy as np
import faiss

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# Paths relative to this file
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DATA_DIR = os.path.join(BASE_DIR, "data")
EMBEDDINGS_FILE = os.path.join(DATA_DIR, "embeddings.json")
FAISS_INDEX_FILE = os.path.join(DATA_DIR, "faiss_index.bin")
FAISS_METADATA_FILE = os.path.join(DATA_DIR, "faiss_metadata.json")

def load_embeddings() -> List[Dict]:
    """Load embeddings from embeddings.json."""
    if not os.path.exists(EMBEDDINGS_FILE):
        logger.error("Embeddings file not found: %s", EMBEDDINGS_FILE)
        raise FileNotFoundError(f"{EMBEDDINGS_FILE} does not exist")
    with open(EMBEDDINGS_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data

def build_faiss_index() -> int:
    """Build a FAISS IndexFlatL2 from the embeddings and persist it.

    Returns
    -------
    int
        Number of vectors indexed.
    """
    embeddings = load_embeddings()
    if not embeddings:
        logger.warning("No embeddings to index.")
        return 0
    vectors = []
    metadata = []
    for entry in embeddings:
        vec = entry.get("embedding")
        if vec is None:
            continue
        vectors.append(np.array(vec, dtype=np.float32))
        metadata.append({"id": entry.get("chunk_id", ""), "text": entry.get("text", "")})
    if not vectors:
        logger.warning("Embeddings list contained no vectors.")
        return 0
    xb = np.vstack(vectors).astype(np.float32)
    dim = xb.shape[1]
    index = faiss.IndexFlatL2(dim)
    index.add(xb)
    os.makedirs(DATA_DIR, exist_ok=True)
    faiss.write_index(index, FAISS_INDEX_FILE)
    logger.info("FAISS index with %d vectors (dim=%d) saved to %s", xb.shape[0], dim, FAISS_INDEX_FILE)
    with open(FAISS_METADATA_FILE, "w", encoding="utf-8") as f:
        json.dump(metadata, f, ensure_ascii=False, indent=2)
    logger.info("FAISS metadata for %d vectors saved to %s", len(metadata), FAISS_METADATA_FILE)
    return xb.shape[0]
