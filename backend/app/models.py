from pydantic import BaseModel, HttpUrl

class CrawlRequest(BaseModel):
    """Request model for crawling a website."""
    url: HttpUrl

class CrawlResponse(BaseModel):
    """Response model returned after crawling."""
    status: str
    pages_crawled: int

class ProcessResponse(BaseModel):
    status: str
    documents: int
    chunks: int

class PageData(BaseModel):
    """Data stored for each crawled page."""
    url: str
    title: str
    content: str
