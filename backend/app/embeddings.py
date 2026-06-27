import os
import json
import logging
try:
    from sentence_transformers import SentenceTransformer
except Exception as e:  # pragma: no cover
    logger = logging.getLogger(__name__)
    logger.warning("Failed to import SentenceTransformer: %s", e)
    SentenceTransformer = None  # type: ignore
from typing import List, Dict


# Configure logger
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# Paths relative to this file
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DATA_DIR = os.path.join(BASE_DIR, "data")
CHUNKS_FILE = os.path.join(DATA_DIR, "chunks.json")
EMBEDDINGS_FILE = os.path.join(DATA_DIR, "embeddings.json")

def load_chunks() -> List[Dict]:
    """Load chunks from chunks.json.

    Returns:
        List of chunk dictionaries with at least an "id" or "text" key.
    """
    if not os.path.exists(CHUNKS_FILE):
        logger.error("Chunks file not found: %s", CHUNKS_FILE)
        raise FileNotFoundError(f"Chunks file not found: {CHUNKS_FILE}")
    with open(CHUNKS_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data

def save_embeddings(embeddings: List[Dict]):
    """Save embeddings list to embeddings.json."""
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(EMBEDDINGS_FILE, "w", encoding="utf-8") as f:
        json.dump(embeddings, f, ensure_ascii=False, indent=2)
    logger.info("Saved %d embeddings to %s", len(embeddings), EMBEDDINGS_FILE)

def generate_embeddings() -> int:
    """Generate embeddings for each chunk and persist them.

    Uses SentenceTransformer if available, otherwise falls back to deterministic.

    Returns:
        Number of embeddings created.
    """
    logger.info("Loading chunks from %s", CHUNKS_FILE)
    chunks = load_chunks()
    if not isinstance(chunks, list):
        logger.error("Unexpected chunks format: %s", type(chunks))
        raise ValueError("Chunks file must contain a list of objects")

    texts = [chunk.get("content", "") for chunk in chunks]
    
    vectors = None
    if len(texts) == 0:
        vectors = []
    else:
        try:
            from sentence_transformers import SentenceTransformer
            logger.info("Initializing SentenceTransformer('all-MiniLM-L6-v2')...")
            model = SentenceTransformer('all-MiniLM-L6-v2')
            vectors = model.encode(texts)
            logger.info("Generated SentenceTransformer embeddings for %d chunks (dim=384)", len(texts))
        except Exception as e:
            logger.warning("SentenceTransformer failed to encode, falling back to deterministic: %s", e)
            from .utils import get_deterministic_vector
            vectors = [get_deterministic_vector(t) for t in texts]
            logger.info("Generated deterministic embeddings for %d chunks (dim=384)", len(texts))

    embeddings = []
    for chunk, vector in zip(chunks, vectors):
        embeddings.append({
            "chunk_id": str(chunk.get("chunk_id", "")),
            "text": chunk.get("content", ""),
            "embedding": vector.tolist() if hasattr(vector, "tolist") else vector,
        })
    save_embeddings(embeddings)
    return len(embeddings)

if __name__ == "__main__":
    count = generate_embeddings()
    print(f"Generated {count} embeddings")
