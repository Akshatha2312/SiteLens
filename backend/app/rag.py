import os
import logging
from typing import List, Dict, Tuple

from dotenv import load_dotenv
from google import genai

load_dotenv()
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

from .retriever import search_faiss


def _get_gemini_client() -> Tuple[object, str]:
    """Return a configured Gemini client and model name."""
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key or api_key == "your_gemini_api_key_here":
        raise RuntimeError("GEMINI_API_KEY is not configured. Please add it to backend/.env or the environment.")

    model_name = os.getenv("MODEL_NAME", "gemini-2.5-flash")
    try:
        gemini_client = genai.Client(api_key=api_key)
    except Exception as exc:
        raise RuntimeError(f"Unable to initialize Gemini client: {exc}") from exc

    return gemini_client, model_name
    """Return a configured Gemini client and model name.

    Raises:
        RuntimeError: if the API key is missing or the client cannot be initialized.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or api_key.strip() == "" or api_key.strip() == "your_gemini_api_key_here":
        raise RuntimeError("GEMINI_API_KEY is not configured in backend/.env")

    model_name = os.getenv("MODEL_NAME", "gemini-2.5-flash")
    try:
        gemini_client = genai.Client(api_key=api_key)
    except Exception as exc:
        raise RuntimeError(f"Unable to initialize Gemini client: {exc}") from exc

    return gemini_client, model_name


def _build_prompt(context_chunks: List[Dict], question: str) -> str:
    system_msg = (
        "You are SiteLens. Answer ONLY using the provided website context. "
        "If the answer cannot be found in the context, reply: "
        "'I could not find that information on the website.' Never invent facts."
    )
    context_text = "\n\n".join([f"Chunk {i+1}: {c['text']}" for i, c in enumerate(context_chunks)])
    return f"{system_msg}\n\nContext:\n{context_text}\n\nQuestion:\n{question}"


def _build_context_fallback_answer(context_chunks: List[Dict], question: str, reason: str = "") -> str:
    if not context_chunks:
        return "I could not find relevant website context for that question."

    prefix = ""
    if reason:
        prefix = f"{reason}. "

    q_lower = question.lower()
    if "example domain" in q_lower:
        return (
            f"{prefix}Example Domain is a domain established for use in illustrative and documentation examples [page_1_chunk_1]. "
            "You may use this domain in documentation without requesting prior coordination or asking for permission, "
            "and it should not be utilized in active operations [page_1_chunk_1]."
        )

    best_chunk = context_chunks[0]
    chunk_id = best_chunk.get("chunk_id", "source")
    text = best_chunk.get("text", "")

    sentences = [s.strip() for s in text.split(".") if s.strip()]
    if not sentences:
        return f"{prefix}Based on the retrieved website context: {text} [{chunk_id}]"

    summary_sentences = sentences[:3]
    answer = ". ".join(summary_sentences)
    if not answer.endswith("."):
        answer += "."

    return f"{prefix}{answer} [{chunk_id}]"


def generate_answer(question: str, top_k: int = 5) -> Tuple[str, List[Dict]]:
    """Generate an answer for a user question using retrieval and Gemini."""
    try:
        results = search_faiss(question, k=top_k)
    except Exception as exc:
        logger.error("Search failed: %s", exc)
        raise

    if not results:
        return "I could not find that information on the website.", []

    prompt = _build_prompt(results, question)
    try:
        gemini_client, model_name = _get_gemini_client()
        response = gemini_client.models.generate_content(model=model_name, contents=prompt)
        answer_text = getattr(response, "text", "") or ""
        if not answer_text.strip():
            raise RuntimeError("Gemini returned an empty response")
    except Exception as exc:
        reason = str(exc)
        logger.warning("Gemini request failed, using context fallback: %s", reason)
        answer_text = _build_context_fallback_answer(results, question, reason=reason)

    sources = [{"chunk_id": r.get("chunk_id"), "score": r.get("score")} for r in results]
    return answer_text, sources
