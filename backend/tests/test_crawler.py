from backend.app import crawler


def test_crawl_site_respects_page_limit(monkeypatch):
    calls = []

    def fake_fetch_page(url):
        calls.append(url)
        class Response:
            text = "<html><body><a href='/child'>child</a></body></html>"
        return Response()

    def fake_extract_page_data(url, html):
        return {"url": url, "title": "Title", "content": "content"}

    monkeypatch.setattr(crawler, "fetch_page", fake_fetch_page)
    monkeypatch.setattr(crawler, "extract_page_data", fake_extract_page_data)
    monkeypatch.setattr(crawler, "save_pages", lambda pages: None)
    monkeypatch.setattr(crawler, "MAX_PAGES", 3)
    monkeypatch.setattr(crawler, "MAX_DEPTH", 3)

    pages = crawler.crawl_site("https://example.com")

    assert len(pages) <= 3
    assert pages[0]["url"] == "https://example.com"
