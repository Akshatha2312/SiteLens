import logging
from urllib.parse import urljoin
from typing import List, Set, Dict

from .utils import (
    fetch_page,
    extract_page_data,
    is_internal_link,
    save_pages,
    MAX_DEPTH,
    MAX_PAGES,
    MAX_LINKS_PER_PAGE,
)

logger = logging.getLogger("sitecrawler.crawler")

def crawl_site(start_url: str) -> List[Dict[str, str]]:
    """Crawl the website starting from ``start_url``.

    Args:
        start_url: The root URL to begin crawling.

    Returns:
        A list of dictionaries containing ``url``, ``title``, and ``content`` for each page.
    """
    visited: Set[str] = set()
    pages: List[Dict[str, str]] = []

    def _crawl(url: str, depth: int) -> None:
        if len(pages) >= MAX_PAGES:
            logger.info("Reached maximum page limit of %d", MAX_PAGES)
            return
        if depth > MAX_DEPTH:
            logger.debug("Maximum depth %d reached for %s", MAX_DEPTH, url)
            return
        if depth > 0 and not url.lower().startswith(start_url.lower()):
            return
        if url in visited:
            logger.debug("Already visited %s", url)
            return
        visited.add(url)
        try:
            response = fetch_page(url)
            page_data = extract_page_data(url, response.text)
            pages.append(page_data)
            logger.info("Crawled (%d) %s", len(pages), url)
        except Exception as e:
            logger.warning("Failed to fetch %s: %s", url, e)
            return
        # Parse links and recurse
        soup = response.text
        from bs4 import BeautifulSoup
        soup_obj = BeautifulSoup(soup, "html.parser")
        candidate_links = []
        for a_tag in soup_obj.find_all("a", href=True):
            href = a_tag.get("href")
            if not href or not isinstance(href, str):
                continue
            absolute = urljoin(url, href)
            if is_internal_link(start_url, absolute):
                candidate_links.append(absolute)

        seen_links = set()
        for absolute in candidate_links[:MAX_LINKS_PER_PAGE]:
            if absolute in seen_links:
                continue
            seen_links.add(absolute)
            if depth < MAX_DEPTH:
                _crawl(absolute, depth + 1)

    _crawl(start_url, 0)
    # Save after crawling completes
    logger.debug("Saving %d pages", len(pages))
    save_pages(pages)
    return pages
