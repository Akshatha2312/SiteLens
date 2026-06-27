from __future__ import annotations
from typing import List, Optional
from pydantic import BaseModel, HttpUrl


class CrawlRequest(BaseModel):
    """Request model for crawling a website."""
    url: HttpUrl


class CrawlResponse(BaseModel):
    """Response model returned after crawling."""
    status: str
    pages_crawled: int


class ProcessResponse(BaseModel):
    """Response model for process endpoint."""
    status: str
    documents: int
    chunks: int


class EmbedResponse(BaseModel):
    """Response model for embed endpoint."""
    status: str
    embeddings_created: int


class IndexResponse(BaseModel):
    """Response model for index endpoint."""
    status: str
    vectors_indexed: int


class SearchRequest(BaseModel):
    """Request model for semantic search."""
    query: str
    k: Optional[int] = 5


class SearchResult(BaseModel):
    """Result item from search."""
    chunk_id: str
    score: float
    text: str


class SearchResponse(BaseModel):
    """Response model for search endpoint."""
    status: str
    query: str
    results: List[SearchResult]


class AskRequest(BaseModel):
    """Request model for ask endpoint."""
    question: str


class Source(BaseModel):
    """Source reference from RAG results."""
    chunk_id: str
    score: float


class AskResponse(BaseModel):
    """Response model for ask endpoint."""
    status: str
    answer: str
    sources: List[Source]
