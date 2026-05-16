# parser/main.py
# FastAPI microservice — AI Resume Parser
# Endpoints: /health, /parse, /parse-text, /parse-and-score, /ats-score, /skills, /batch-parse

import os
import tempfile
import logging
from contextlib import asynccontextmanager
from typing import List, Optional

import spacy
import uvicorn
from fastapi import FastAPI, File, Form, HTTPException, UploadFile, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from parser_engine import parse_resume
from ats_scorer import calculate_ats_score

# ── Logging ────────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)s  %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)

# ── Allowed MIME types ─────────────────────────────────────────────────────────
ALLOWED_TYPES = {
    "application/pdf": ".pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
    "application/msword": ".doc",
}

MAX_FILE_SIZE_MB    = 5
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

# ── Allowed frontend origins ───────────────────────────────────────────────────
# Add your Render frontend URL here. The wildcard alone is fine for public APIs,
# but listing origins explicitly is required when allow_credentials=True.
ALLOWED_ORIGINS: List[str] = [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://ai-resume-frontend-35jw.onrender.com",
]


# ── Pydantic models ────────────────────────────────────────────────────────────

class ATSRequest(BaseModel):
    resume_text:     str
    job_description: str


class BatchParseRequest(BaseModel):
    texts: List[str]    # List[str] works on Python 3.8+; list[str] needs 3.9+


# ── Lifespan: load spaCy once at startup ──────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("Loading spaCy model...")
    try:
        app.state.nlp = spacy.load("en_core_web_sm")
        log.info("spaCy model loaded successfully.")
    except OSError:
        log.error(
            "spaCy model not found. "
            "Run: python -m spacy download en_core_web_sm"
        )
        app.state.nlp = None
    yield
    log.info("Shutting down parser service.")


# ── App init ───────────────────────────────────────────────────────────────────

app = FastAPI(
    title="AI Resume Parser",
    description="NLP microservice: parse resumes and calculate ATS scores.",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ───────────────────────────────────────────────────────────────────────
# FIX: allow_credentials=True is INCOMPATIBLE with allow_origins=["*"].
# Browsers will block the response with:
#   "Cannot use wildcard in Access-Control-Allow-Origin when credentials flag is true"
# Solution: list specific origins and set allow_credentials=False (we use no cookies).
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,   # we use Authorization header, not cookies
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)


# ── Helpers ────────────────────────────────────────────────────────────────────

def _save_upload_to_temp(file: UploadFile):
    """
    Write uploaded file to a secure temp path in chunks.
    Returns (temp_path: str, suffix: str).
    Raises HTTPException 415 on bad type, 413 on size exceeded.
    """
    content_type = file.content_type or ""

    # Resolve file extension
    if content_type in ALLOWED_TYPES:
        suffix = ALLOWED_TYPES[content_type]
    else:
        ext = os.path.splitext(file.filename or "")[-1].lower()
        if ext in (".pdf", ".docx"):
            suffix = ext
        else:
            raise HTTPException(
                status_code=415,
                detail=(
                    f"Unsupported file type '{content_type}'. "
                    "Upload a PDF or DOCX file."
                ),
            )

    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp_path   = tmp.name
            chunk_size = 64 * 1024   # 64 KB
            total      = 0
            while True:
                chunk = file.file.read(chunk_size)
                if not chunk:
                    break
                total += len(chunk)
                if total > MAX_FILE_SIZE_BYTES:
                    tmp.close()
                    _cleanup(tmp_path)
                    raise HTTPException(
                        status_code=413,
                        detail=f"File exceeds the {MAX_FILE_SIZE_MB} MB limit.",
                    )
                tmp.write(chunk)
    except HTTPException:
        raise
    except Exception as exc:
        _cleanup(tmp_path)
        raise HTTPException(status_code=500, detail=f"Failed to save upload: {exc}")

    return tmp_path, suffix


def _cleanup(path: Optional[str]) -> None:
    """Silently delete a temp file — never raises."""
    try:
        if path and os.path.exists(path):
            os.unlink(path)
    except OSError as exc:
        log.warning(f"Temp file cleanup failed: {exc}")


def _nlp_or_503(app_state) -> spacy.language.Language:
    """Return loaded NLP model or raise 503."""
    if app_state.nlp is None:
        raise HTTPException(
            status_code=503,
            detail=(
                "NLP model not loaded. "
                "Run: python -m spacy download en_core_web_sm"
            ),
        )
    return app_state.nlp


# =============================================================================
# GET /
# Root — confirms the service is alive (useful for Render health checks).
# =============================================================================
@app.get("/", tags=["system"])
def root():
    return {
        "service": "AI Resume Parser",
        "version": "1.0.0",
        "docs":    "/docs",
        "health":  "/health",
    }


# =============================================================================
# GET /health
# Render uses this for uptime monitoring. Returns nlp model status.
# =============================================================================
@app.get("/health", tags=["system"])
def health_check():
    return {
        "status":    "ok",
        "service":   "AI Resume Parser",
        "version":   "1.0.0",
        "nlp_model": "loaded" if app.state.nlp is not None else "unavailable",
    }


# =============================================================================
# POST /parse
# Upload PDF or DOCX. Returns extracted resume fields.
# =============================================================================
@app.post("/parse", tags=["parsing"])
async def parse_endpoint(
    file:        UploadFile        = File(..., description="PDF or DOCX resume"),
    include_raw: Optional[bool]    = Form(False, description="Include raw text in response"),
):
    """
    Parse a resume file and return structured data:
    name, email, phone, skills, education, experience, projects.
    """
    log.info(f"[/parse] file='{file.filename}'  type='{file.content_type}'")
    nlp = _nlp_or_503(app.state)

    tmp_path = None
    try:
        tmp_path, suffix = _save_upload_to_temp(file)
        log.info(f"[/parse] temp='{tmp_path}'")

        result = parse_resume(tmp_path, suffix, nlp=nlp)
        log.info(
            f"[/parse] done  name='{result.get('name')}'  "
            f"skills={len(result.get('skills', []))}"
        )

        if not include_raw:
            result.pop("raw_text", None)

        return JSONResponse(content=result)

    except HTTPException:
        raise
    except Exception as exc:
        log.exception(f"[/parse] unexpected error: {exc}")
        raise HTTPException(status_code=500, detail=f"Parsing failed: {exc}")
    finally:
        _cleanup(tmp_path)


# =============================================================================
# POST /parse-text
# Parse resume from raw text string — no file upload needed.
# =============================================================================
@app.post("/parse-text", tags=["parsing"])
async def parse_text_endpoint(payload: dict):
    """
    Body: { "text": "...", "include_raw": false }
    """
    text = (payload.get("text") or "").strip()
    if not text:
        raise HTTPException(
            status_code=400,
            detail="Field 'text' is required and cannot be empty.",
        )

    nlp = _nlp_or_503(app.state)

    try:
        from parser_engine import parse_from_text
        result = parse_from_text(text, nlp=nlp)

        if not payload.get("include_raw", False):
            result.pop("raw_text", None)

        return JSONResponse(content=result)

    except HTTPException:
        raise
    except Exception as exc:
        log.exception(f"[/parse-text] error: {exc}")
        raise HTTPException(status_code=500, detail=f"Parsing failed: {exc}")


# =============================================================================
# POST /parse-and-score
# FIX: job_description is now Optional — frontend may omit it.
# When omitted, the ats_score block is returned as an empty dict.
# =============================================================================
@app.post("/parse-and-score", tags=["parsing", "ats"])
async def parse_and_score_endpoint(
    file:            UploadFile         = File(..., description="PDF or DOCX resume"),
    job_description: Optional[str]      = Form(None, description="Job description for ATS scoring"),
    include_raw:     Optional[bool]     = Form(False, description="Include raw text preview"),
):
    """
    Full pipeline in one request:
    Upload resume → extract text → parse fields → (optionally) ATS score.

    If job_description is omitted, ats_score is returned as {}.
    """
    log.info(f"[/parse-and-score] file='{file.filename}'  jd={'yes' if job_description else 'no'}")
    nlp = _nlp_or_503(app.state)

    tmp_path = None
    try:
        tmp_path, suffix = _save_upload_to_temp(file)

        parsed   = parse_resume(tmp_path, suffix, nlp=nlp)
        raw_text = parsed.get("raw_text", "")

        # ATS scoring is optional — only run when a job description is provided
        ats: dict = {}
        if job_description and job_description.strip() and raw_text:
            ats = calculate_ats_score(raw_text, job_description.strip())
            log.info(f"[/parse-and-score] ATS score: {ats.get('ats_score')}%")
        else:
            log.info("[/parse-and-score] No job description — skipping ATS scoring")

        parsed.pop("raw_text", None)

        response: dict = {
            "parsed":    parsed,
            "ats_score": ats,
        }

        # Only include raw_text preview when explicitly requested
        if include_raw:
            response["raw_text"] = raw_text[:3000]

        return JSONResponse(content=response)

    except HTTPException:
        raise
    except Exception as exc:
        log.exception(f"[/parse-and-score] error: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))
    finally:
        _cleanup(tmp_path)


# =============================================================================
# POST /ats-score
# Score existing resume text against a job description.
# =============================================================================
@app.post("/ats-score", tags=["ats"])
async def ats_score_endpoint(payload: ATSRequest):
    """
    Body: { "resume_text": "...", "job_description": "..." }
    Returns score (0–100), matched keywords, missing keywords.
    """
    resume_text = payload.resume_text.strip()
    job_desc    = payload.job_description.strip()

    if not resume_text:
        raise HTTPException(status_code=400, detail="'resume_text' cannot be empty.")
    if not job_desc:
        raise HTTPException(status_code=400, detail="'job_description' cannot be empty.")

    log.info(
        f"[/ats-score] resume={len(resume_text)} chars  "
        f"jd={len(job_desc)} chars"
    )

    try:
        result = calculate_ats_score(resume_text, job_desc)
        log.info(f"[/ats-score] score={result.get('ats_score')}%")
        return JSONResponse(content=result)

    except Exception as exc:
        log.exception(f"[/ats-score] error: {exc}")
        raise HTTPException(status_code=500, detail=f"ATS scoring failed: {exc}")


# =============================================================================
# GET /skills
# Returns the master skill keyword list — used by the frontend dropdown.
# =============================================================================
@app.get("/skills", tags=["reference"])
def list_skills():
    """Return all detectable skill keywords."""
    from parser_engine import SKILL_KEYWORDS
    return {
        "total":  len(SKILL_KEYWORDS),
        "skills": sorted(SKILL_KEYWORDS),
    }


# =============================================================================
# POST /batch-parse
# Parse up to 10 resume texts in one request.
# =============================================================================
@app.post("/batch-parse", tags=["parsing"])
async def batch_parse_endpoint(payload: BatchParseRequest):
    """
    Body: { "texts": ["resume text 1", "resume text 2", ...] }
    Maximum 10 items per request.
    """
    if not payload.texts:
        raise HTTPException(status_code=400, detail="'texts' list cannot be empty.")
    if len(payload.texts) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 resumes per batch.")

    nlp = _nlp_or_503(app.state)

    from parser_engine import parse_from_text

    results = []
    for i, text in enumerate(payload.texts):
        try:
            parsed = parse_from_text((text or "").strip(), nlp=nlp)
            parsed.pop("raw_text", None)
            results.append({"index": i, "status": "ok",    "data":   parsed})
        except Exception as exc:
            log.warning(f"[/batch-parse] item {i} failed: {exc}")
            results.append({"index": i, "status": "error", "detail": str(exc)})

    return JSONResponse(content={
        "total":     len(payload.texts),
        "processed": sum(1 for r in results if r["status"] == "ok"),
        "results":   results,
    })


# =============================================================================
# Global exception handler
# Returns clean JSON instead of HTML tracebacks in production.
# =============================================================================
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    log.exception(f"Unhandled exception on {request.url.path}: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "detail": "An unexpected server error occurred.",
            "path":   str(request.url.path),
        },
    )


# =============================================================================
# Entry point
# Production: uvicorn main:app --host 0.0.0.0 --port $PORT
# Dev:        python main.py   (reload=True only in development)
# =============================================================================
if __name__ == "__main__":
    is_dev = os.getenv("RENDER") is None   # Render sets RENDER=true automatically

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8000)),
        reload=is_dev,      # FIX: never reload in production
        log_level="info",
    )