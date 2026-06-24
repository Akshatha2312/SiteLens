import os
import json
import logging
import re
import unicodedata
from typing import List, Dict

import textwrap

def split_text(text: str, chunk_size: int = 500, overlap: int = 100) -> list[str]:
    """Split text into chunks of given size with overlap."""
    if len(text) <= chunk_size:
        return [text]
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end]
        chunks.append(chunk)
        start = end - overlap if overlap < chunk_size else end
    return chunks

# Setup logger
logger = logging.getLogger("sitecrawler.processor")
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

# Paths relative to this file
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DATA_DIR = os.path.join(BASE_DIR, "data")

CRAWLED_FILE = os.path.join(DATA_DIR, "crawled_content.json")
CLEANED_FILE = os.path.join(DATA_DIR, "cleaned_content.json")
CHUNKS_FILE = os.path.join(DATA_DIR, "chunks.json")

# Cleaning utilities
def _normalize_text(text: str) -> str:
    """Normalize unicode and replace problematic characters."""
    text = unicodedata.normalize("NFKC", text)
    return text

def _collapse_whitespace(text: str) -> str:
    """Replace multiple whitespace characters with a single space and strip."""
    return re.sub(r"\s+", " ", text).strip()

def _remove_short_blocks(text: str, min_len: int = 30) -> str:
    """Remove lines or sections that are too short to be meaningful."""
    lines = text.split("\n")
    filtered = [ln for ln in lines if len(ln.strip()) >= min_len]
    return "\n".join(filtered)

def _remove_noise(text: str) -> str:
    """Very naive removal of navigation/footer style repetition.
    Looks for common patterns like "©", "All rights reserved", "Contact", etc.
    """
    noise_patterns = [
        r"©\s*\d{4}.*",
        r"All rights reserved",
        r"Privacy Policy",
        r"Terms of Service",
        r"Contact Us",
        r"\bHome\b",
        r"\bAbout\b",
        r"\bLogin\b",
        r"\bSearch\b",
    ]
    for pat in noise_patterns:
        text = re.sub(pat, "", text, flags=re.IGNORECASE)
    return text

def clean_content(pages: List[Dict[str, str]]) -> List[Dict[str, str]]:
    """Apply cleaning steps to a list of page dictionaries.
    Returns a new list with cleaned `content` fields.
    """
    cleaned_pages = []
    for page in pages:
        content = page.get("content", "")
        content = _normalize_text(content)
        content = _collapse_whitespace(content)
        content = _remove_noise(content)
        content = _remove_short_blocks(content)
        # Ensure no repeated blank lines
        content = re.sub(r"(\n\s*){2,}", "\n", content)
        cleaned_pages.append({
            "url": page.get("url", ""),
            "title": page.get("title", ""),
            "content": content,
        })
    return cleaned_pages

def chunk_pages(pages: List[Dict[str, str]]) -> List[Dict]:
    """Chunk cleaned pages using RecursiveCharacterTextSplitter.
    Returns a list of chunk metadata dictionaries.
    """
    chunks = []
    for idx, page in enumerate(pages, start=1):
        page_text = page["content"]
        page_chunks = split_text(page_text, chunk_size=500, overlap=100)
        for c_idx, chunk in enumerate(page_chunks, start=1):
            chunk_id = f"page_{idx}_chunk_{c_idx}"
            chunks.append({
                "chunk_id": chunk_id,
                "url": page["url"],
                "title": page["title"],
                "content": chunk,
                "chunk_index": c_idx,
            })
    return chunks

def process_and_save() -> Dict[str, int]:
    """Load crawled data, clean it, chunk it, and persist results.
    Returns a summary dict with counts.
    """
    if not os.path.exists(CRAWLED_FILE):
        logger.error("Crawled content file not found: %s", CRAWLED_FILE)
        raise FileNotFoundError(f"{CRAWLED_FILE} does not exist")

    with open(CRAWLED_FILE, "r", encoding="utf-8") as f:
        pages = json.load(f)

    cleaned = clean_content(pages)
    # Save cleaned content
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(CLEANED_FILE, "w", encoding="utf-8") as f:
        json.dump(cleaned, f, ensure_ascii=False, indent=2)
    logger.info("Saved cleaned content to %s", CLEANED_FILE)

    chunks = chunk_pages(cleaned)
    with open(CHUNKS_FILE, "w", encoding="utf-8") as f:
        json.dump(chunks, f, ensure_ascii=False, indent=2)
    logger.info("Saved %d chunks to %s", len(chunks), CHUNKS_FILE)

    return {"documents": len(cleaned), "chunks": len(chunks)}
