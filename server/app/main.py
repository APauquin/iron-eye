"""Iron Eye API: keeps the Anthropic key on the server and analyses lifting form."""

import logging
import os

import anthropic
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .claude_client import AnalysisError, ConfigError, analyze_frames
from .models import AnalysisResult, AnalyzeRequest
from .usage import UsageSummary, summarize

load_dotenv()
logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("iron_eye")

app = FastAPI(title="Iron Eye API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(","),
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


@app.get("/api/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/analyze", response_model=AnalysisResult)
async def analyze(request: AnalyzeRequest) -> AnalysisResult:
    try:
        return await analyze_frames(request.frames, request.lift)
    except ConfigError as exc:
        logger.error("Config error: %s", exc)
        raise HTTPException(status_code=500, detail="Server is not configured. Check the API key.") from exc
    except anthropic.AuthenticationError as exc:
        raise HTTPException(status_code=500, detail="Server API key is invalid.") from exc
    except anthropic.RateLimitError as exc:
        raise HTTPException(status_code=429, detail="Too many requests. Wait a moment and retry.") from exc
    except anthropic.APIError as exc:
        logger.error("Anthropic API error: %s", exc)
        raise HTTPException(status_code=502, detail="The AI service failed. Please try again.") from exc
    except AnalysisError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@app.get("/api/usage", response_model=UsageSummary)
async def usage_summary() -> UsageSummary:
    """Running totals of analyses, tokens and estimated cost (local tracking)."""
    return summarize()
