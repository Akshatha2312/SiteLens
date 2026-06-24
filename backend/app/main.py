import logging
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, HttpUrl
from .crawler import crawl_site

app = FastAPI()

logger = logging.getLogger("sitecrawler")
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

class CrawlRequest(BaseModel):
    url: HttpUrl

class CrawlResponse(BaseModel):
    status: str
    pages_crawled: int

@app.post("/crawl", response_model=CrawlResponse)
async def crawl(request: CrawlRequest):
    try:
        result = crawl_site(request.url)
        return CrawlResponse(status="success", pages_crawled=len(result))
    except Exception as e:
        logger.exception("Crawl failed for %s", request.url)
        raise HTTPException(status_code=500, detail=str(e))
