import json
import logging
import os
from typing import List, Dict
from urllib.parse import urlparse, urljoin

import requests
from bs4 import BeautifulSoup

# Constants
MAX_DEPTH = 3
MAX_PAGES = 100
REQUEST_TIMEOUT = 10  # seconds

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
    """Check whether ``link`` is internal to ``base_url``.

    Args:
        base_url: The original URL from which crawling started.
        link: URL to evaluate.

    Returns:
        True if the link shares the same netloc as the base URL.
    """
    try:
        if not isinstance(link, str):
            return False
        base_netloc = urlparse(base_url).netloc
        parsed = urlparse(urljoin(base_url, link))
        return parsed.netloc == base_netloc
    except Exception:
        return False

def fetch_page(url: str) -> requests.Response:
    """Fetch the page content with timeout handling.

    Raises:
        requests.RequestException for network‑related errors.
    """
    logger.debug("Fetching URL: %s", url)
    response = requests.get(url, timeout=REQUEST_TIMEOUT)
    response.raise_for_status()
    return response

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
