import logging
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware


from .crawler import crawl_site
from .processor import process_and_save
from .embeddings import generate_embeddings
from .indexer import build_faiss_index
from .models import CrawlRequest, CrawlResponse, ProcessResponse, EmbedResponse, IndexResponse, SearchRequest, SearchResponse, AskRequest, AskResponse, Source
from .rag import generate_answer
# Configure structured logging
logger = logging.getLogger("sitecrawler")
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

app = FastAPI(title="SiteLens API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

@app.post("/ask", response_model=AskResponse)
async def ask(request: AskRequest) -> AskResponse:
    """Answer a user question using retrieved context and Gemini."""
    try:
        answer, sources = generate_answer(request.question)
        source_objs = [Source(chunk_id=s["chunk_id"], score=s["score"]) for s in sources]
        return AskResponse(status="success", answer=answer, sources=source_objs)
    except Exception as e:
        logger.exception("Ask endpoint failed")
        raise HTTPException(status_code=500, detail=str(e))
