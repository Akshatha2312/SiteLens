import os
import json
import logging
from typing import List, Dict, Tuple

from dotenv import load_dotenv
load_dotenv()

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

from .retriever import search_faiss

try:
    import google.generativeai as genai
except ImportError:
    genai = None

def _get_gemini_client():
    """Configure Gemini client and return model object.
    Raises:
        RuntimeError: if API key missing or library not installed.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not set in environment")
    if genai is None:
        raise RuntimeError("google-generativeai library is not installed")
    model_name = os.getenv("MODEL_NAME", "gemini-2.5-flash")
    genai.configure(api_key=api_key)
    return genai.GenerativeModel(model_name)

def _build_prompt(context_chunks: List[Dict], question: str) -> str:
    system_msg = (
        "You are SiteLens. Answer ONLY using the provided website context. "
        "If the answer cannot be found in the context, reply: "
        "'I could not find that information on the website.' Never invent facts."
    )
    context_text = "\n\n".join([f"Chunk {i+1}: {c['text']}" for i, c in enumerate(context_chunks)])
    return f"{system_msg}\n\nContext:\n{context_text}\n\nQuestion:\n{question}"

def generate_answer(question: str, top_k: int = 5) -> Tuple[str, List[Dict]]:
    """Generate an answer for a user question using retrieval and Gemini.
    Returns a tuple (answer, sources) where sources is a list of dicts with ``chunk_id`` and ``score``.
    """
    try:
        results = search_faiss(question, k=top_k)
    except Exception as e:
        logger.error("Search failed: %s", e)
        raise
    if not results:
        return "I could not find that information on the website.", []
    prompt = _build_prompt(results, question)
    model = _get_gemini_client()
    try:
        response = model.generate_content(prompt)
        answer_text = response.text.strip()
    except Exception as e:
        logger.exception("Gemini request failed")
        raise RuntimeError(f"Gemini request failed: {e}")
    sources = [{"chunk_id": r.get("chunk_id"), "score": r.get("score")} for r in results]
    return answer_text, sources
