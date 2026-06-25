import logging
from fastapi import FastAPI, HTTPException
from .models import CrawlRequest, CrawlResponse, ProcessResponse
from .crawler import crawl_site
from .processor import process_and_save
from .embeddings import generate_embeddings
from .models import CrawlRequest, CrawlResponse, ProcessResponse, EmbedResponse

# Configure structured logging
logger = logging.getLogger("sitecrawler")
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

app = FastAPI()

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
