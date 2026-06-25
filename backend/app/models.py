from __future__ import annotations
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

from typing import List, Optional

class SearchRequest(BaseModel):
    """Request model for semantic search."""
    query: str
    k: Optional[int] = 5

class SearchResult(BaseModel):
    chunk_id: str
    score: float
    text: str

class SearchResponse(BaseModel):
    status: str
    query: str
    results: List[SearchResult]

class AskRequest(BaseModel):
    question: str

class Source(BaseModel):
    chunk_id: str
    score: float

class AskResponse(BaseModel):
    status: str
    answer: str
    sources: List[Source]
