import os
import logging
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv


dotenv_path = os.path.join(os.path.dirname(__file__), "..", ".env")
load_dotenv(dotenv_path)

from .crawler import crawl_site
from .processor import process_and_save
from .embeddings import generate_embeddings
from .indexer import build_faiss_index
from .models import CrawlRequest, CrawlResponse, ProcessResponse, EmbedResponse, IndexResponse, SearchRequest, SearchResponse, AskRequest, AskResponse, Source
from .rag import GeminiConfigurationError, generate_answer

# Configure structured logging
logger = logging.getLogger("sitecrawler")
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger.info("Loaded backend environment from %s", dotenv_path)

app = FastAPI(title="SiteLens API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(HTTPException)
async def http_exception_handler(_, exc: HTTPException):
    return JSONResponse(status_code=exc.status_code, content={"status": "error", "detail": exc.detail})

@app.exception_handler(Exception)
async def unhandled_exception_handler(_, exc: Exception):
    logger.exception("Unhandled server error: %s", exc)
    return JSONResponse(status_code=500, content={"status": "error", "detail": "Internal server error"})

@app.post("/crawl", response_model=CrawlResponse)
async def crawl(request: CrawlRequest) -> CrawlResponse:
    """Crawl the given URL recursively and store the results.

    Returns a status and the number of pages crawled.
    """
    try:
        result = crawl_site(str(request.url))
        return CrawlResponse(status="success", pages_crawled=len(result))
    except Exception as e:
        logger.exception("Crawl failed for %s", request.url)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/process", response_model=ProcessResponse)
async def process() -> ProcessResponse:
    """Process previously crawled data: clean, chunk, and persist.

    Returns counts of cleaned documents and generated chunks.
    """
    try:
        result = process_and_save()
        return ProcessResponse(status="success", documents=result["documents"], chunks=result["chunks"])
    except FileNotFoundError as fnf:
        logger.error("Processing failed: %s", fnf)
        raise HTTPException(status_code=500, detail=str(fnf))
    except Exception as e:
        logger.exception("Processing failed")
        raise HTTPException(status_code=500, detail=str(e))
@app.post("/embed", response_model=EmbedResponse)
async def embed() -> EmbedResponse:
    """Generate embeddings for chunks and return count."""
    try:
        count = generate_embeddings()
        return EmbedResponse(status="success", embeddings_created=count)
    except Exception as e:
        logger.exception("Embedding generation failed")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/index", response_model=IndexResponse)
async def index() -> IndexResponse:
    """Build FAISS index from embeddings and return count."""
    try:
        count = build_faiss_index()
        return IndexResponse(status="success", vectors_indexed=count)
    except Exception as e:
        logger.exception("FAISS index creation failed")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/search", response_model=SearchResponse)
async def search(request: SearchRequest) -> SearchResponse:
    """Search FAISS index for the top-k most similar chunks."""
    try:
        from .retriever import search_faiss
        results = search_faiss(request.query, k=request.k)
        from .models import SearchResult
        result_objs = [
            SearchResult(chunk_id=r["chunk_id"], score=r["score"], text=r["text"])
            for r in results
        ]
        return SearchResponse(status="success", query=request.query, results=result_objs)
    except FileNotFoundError as fnf:
        logger.error("Search failed: %s", fnf)
        raise HTTPException(status_code=500, detail=str(fnf))
    except Exception as e:
        logger.exception("Search endpoint failed")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/ask", response_model=AskResponse)
async def ask(request: AskRequest) -> AskResponse:
    """Answer a user question using retrieved context and Gemini."""
    try:
        answer, sources = generate_answer(request.question)
        source_objs = [Source(chunk_id=s["chunk_id"], score=s["score"]) for s in sources]
        return AskResponse(status="success", answer=answer, sources=source_objs)
    except GeminiConfigurationError as e:
        logger.warning("Ask endpoint failed due to Gemini configuration: %s", e)
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.exception("Ask endpoint failed")
        raise HTTPException(status_code=500, detail=str(e))
