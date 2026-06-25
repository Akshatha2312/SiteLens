import os
import json
import logging
try:
    from sentence_transformers import SentenceTransformer
except ImportError:  # pragma: no cover
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

    Returns:
        Number of embeddings created.
    """
    logger.info("Loading chunks from %s", CHUNKS_FILE)
    chunks = load_chunks()
    if not isinstance(chunks, list):
        logger.error("Unexpected chunks format: %s", type(chunks))
        raise ValueError("Chunks file must contain a list of objects")

    texts = [chunk.get("text", "") for chunk in chunks]
    # Initialize model (cached on first call)
    if SentenceTransformer:
        model = SentenceTransformer("all-MiniLM-L6-v2")
        logger.info("Generating embeddings for %d chunks", len(texts))
        vectors = model.encode(texts, show_progress_bar=False)
    else:
        # Fallback: generate deterministic dummy embeddings
        import random
        dim = 384  # typical dimension for the model
        random.seed(42)
        def _dummy_vector(_: str) -> list:
            return [random.random() for _ in range(dim)]
        vectors = [_dummy_vector(t) for t in texts]
        logger.info("Generated dummy embeddings for %d chunks (dim=%d)", len(texts), dim)
    embeddings = []
    for chunk, vector in zip(chunks, vectors):
        embeddings.append({
            "chunk_id": str(chunk.get("id", "")),
            "text": chunk.get("text", ""),
            "embedding": vector.tolist() if hasattr(vector, "tolist") else vector,
        })
    save_embeddings(embeddings)
    return len(embeddings)

if __name__ == "__main__":
    count = generate_embeddings()
    print(f"Generated {count} embeddings")
