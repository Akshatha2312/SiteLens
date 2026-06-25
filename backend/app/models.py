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

class EmbedResponse(BaseModel):
    """Response model for embed endpoint."""
    status: str
    embeddings_created: int

class IndexResponse(BaseModel):
    """Response model for index endpoint"""
    status: str
    vectors_indexed: int

