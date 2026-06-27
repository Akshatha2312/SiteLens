import json
import logging
import os
from typing import List, Dict
from urllib.parse import urlparse, urljoin

import requests
from bs4 import BeautifulSoup

# Constants
MAX_DEPTH = 1
MAX_PAGES = 6
MAX_LINKS_PER_PAGE = 3
REQUEST_TIMEOUT = 10  # seconds
MAX_RETRIES = 2

# Correct DATA_DIR path
DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data"))
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
OUTPUT_FILE = os.path.join(DATA_DIR, "crawled_content.json")
logger = logging.getLogger("sitecrawler.utils")

def ensure_data_dir() -> None:
    """Create the data directory if it does not exist."""
    os.makedirs(DATA_DIR, exist_ok=True)

def save_pages(pages: List[Dict[str, str]]) -> None:
    """Save the list of page dictionaries to JSON file.

    Args:
        pages: List of page data dictionaries with keys `url`, `title`, `content`.
    """
    ensure_data_dir()
    try:
        with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
            json.dump(pages, f, ensure_ascii=False, indent=2)
        logger.info("Saved %d pages to %s", len(pages), OUTPUT_FILE)
    except Exception as e:
        logger.exception("Failed to write crawled data to %s", OUTPUT_FILE)
        raise

def is_internal_link(base_url: str, link: str) -> bool:
    """Check whether ``link`` is internal to ``base_url`` and likely worth crawling."""
    try:
        if not isinstance(link, str):
            return False
        if link.startswith(("mailto:", "tel:", "javascript:", "data:")):
            return False
        if link.startswith("#"):
            return False

        base_netloc = urlparse(base_url).netloc
        parsed = urlparse(urljoin(base_url, link))
        if parsed.netloc != base_netloc:
            return False
        if not parsed.path:
            return False

        lower_path = parsed.path.lower()
        blocked_suffixes = (".pdf", ".jpg", ".jpeg", ".png", ".gif", ".svg", ".zip", ".mp4", ".mp3", ".css", ".js", ".xml", ".json")
        if lower_path.endswith(blocked_suffixes):
            return False
        blocked_tokens = ("/search", "/login", "/logout", "/signup", "/contact", "/privacy", "/terms", "/wp-admin")
        if any(token in lower_path for token in blocked_tokens):
            return False
        return True
    except Exception:
        return False

def fetch_page(url: str) -> requests.Response:
    """Fetch the page content with timeout handling and retries.

    Raises:
        requests.RequestException for network‑related errors.
    """
    logger.debug("Fetching URL: %s", url)
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/124.0.0.0 Safari/537.36"
        ),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
    }
    last_error = None
    for attempt in range(MAX_RETRIES):
        try:
            response = requests.get(url, timeout=(5, REQUEST_TIMEOUT), headers=headers)
            response.raise_for_status()
            return response
        except requests.RequestException as exc:
            last_error = exc
            if attempt < MAX_RETRIES - 1:
                logger.warning("Fetch attempt %d for %s failed: %s", attempt + 1, url, exc)
    if last_error is not None:
        raise last_error
    raise requests.RequestException(f"Failed to fetch {url}")

def extract_page_data(url: str, html: str) -> Dict[str, str]:
    """Extract title and cleaned text from HTML content.

    Returns:
        Dictionary with keys ``url``, ``title``, ``content``.
    """
    soup = BeautifulSoup(html, "html.parser")
    title_tag = soup.find("title")
    title = title_tag.get_text(strip=True) if title_tag else ""
    # Get visible text while stripping excessive whitespace
    text = soup.get_text(separator=" ", strip=True)
    return {"url": url, "title": title, "content": text}

def get_deterministic_vector(text: str, dim: int = 384) -> List[float]:
    """Fallback function to generate a deterministic L2-normalized vector for a string."""
    import hashlib
    import numpy as np
    h = hashlib.sha256(text.encode("utf-8")).digest()
    seed = int.from_bytes(h[:8], byteorder="big")
    rng = np.random.default_rng(seed)
    vec = rng.normal(size=dim).astype(np.float32)
    norm = np.linalg.norm(vec)
    if norm > 0:
        vec = vec / norm
    return vec.tolist()

