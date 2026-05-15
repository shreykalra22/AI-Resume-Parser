# parser/main.py
# FastAPI microservice — AI Resume Parser
# Endpoints: /parse, /ats-score, /health, /skills, /batch-parse

import os
import shutil
import tempfile
import logging
from contextlib import asynccontextmanager
from typing import Optional

import spacy
import uvicorn
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from parser_engine import parse_resume
from ats_scorer import calculate_ats_score

# ── Logging setup ──────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)s  %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)

# ── Allowed MIME types ─────────────────────────────────────────────────────────
ALLOWED_TYPES = {
    "application/pdf":                                                       ".pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
    "application/msword":                                                    ".doc",
}

MAX_FILE_SIZE_MB = 5
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024


# ── Pydantic request models ────────────────────────────────────────────────────
class ATSRequest(BaseModel):
    resume_text: str
    job_description: str


class BatchParseRequest(BaseModel):
    texts: list[str]             # list of raw resume text strings


# ── Lifespan: load spaCy model once at startup ─────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("Loading spaCy model...")
    try:
        app.state.nlp = spacy.load("en_core_web_sm")
        log.info("spaCy model loaded successfully.")
    except OSError:
        log.error("spaCy model not found. Run: python -m spacy download en_core_web_sm")
        app.state.nlp = None
    yield
    log.info("Shutting down parser service.")


# ── App init ───────────────────────────────────────────────────────────────────
app = FastAPI(
    title="AI Resume Parser",
    description="NLP microservice for parsing resumes and calculating ATS scores.",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Helpers ────────────────────────────────────────────────────────────────────
def _save_upload_to_temp(file: UploadFile) -> tuple[str, str]:
    """
    Save an uploaded file to a secure temp path.
    Returns (temp_path, file_extension).
    Raises HTTPException on bad MIME type or oversized file.
    """
    content_type = file.content_type or ""

    # Determine extension — fall back to filename if content_type is generic
    if content_type in ALLOWED_TYPES:
        suffix = ALLOWED_TYPES[content_type]
    else:
        ext = os.path.splitext(file.filename or "")[-1].lower()
        if ext in (".pdf", ".docx"):
            suffix = ext
        else:
            raise HTTPException(
                status_code=415,
                detail=f"Unsupported file type '{content_type}'. Upload PDF or DOCX only.",
            )

    # Write to temp file and check size
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        chunk_size = 1024 * 64          # 64 KB chunks
        total = 0
        while chunk := file.file.read(chunk_size):
            total += len(chunk)
            if total > MAX_FILE_SIZE_BYTES:
                tmp.close()
                os.unlink(tmp.name)
                raise HTTPException(
                    status_code=413,
                    detail=f"File exceeds {MAX_FILE_SIZE_MB} MB limit.",
                )
            tmp.write(chunk)
        tmp_path = tmp.name

    return tmp_path, suffix


def _cleanup(path: str) -> None:
    """Silently remove a temp file."""
    try:
        if path and os.path.exists(path):
            os.unlink(path)
    except OSError as e:
        log.warning(f"Temp file cleanup failed: {e}")


# =============================================================================
# GET /health
# Simple health check — Node.js backend pings this before sending files.
# =============================================================================
@app.get("/health", tags=["system"])
def health_check():
    nlp_status = "loaded" if app.state.nlp is not None else "unavailable"
    return {
        "status":     "ok",
        "service":    "AI Resume Parser",
        "version":    "1.0.0",
        "nlp_model":  nlp_status,
    }


# =============================================================================
# POST /parse
# Upload a PDF or DOCX file. Returns all extracted resume fields.
# =============================================================================
@app.post("/parse", tags=["parsing"])
async def parse_endpoint(
    file: UploadFile = File(..., description="PDF or DOCX resume file"),
    include_raw: Optional[bool] = Form(False, description="Include raw extracted text"),
):
    """
    Parse a resume file and extract structured information:
    name, email, phone, skills, education, experience, projects.
    """
    log.info(f"[/parse] Received: {file.filename}  ({file.content_type})")

    if app.state.nlp is None:
        raise HTTPException(
            status_code=503,
            detail="NLP model not loaded. Run: python -m spacy download en_core_web_sm",
        )

    tmp_path = None
    try:
        tmp_path, suffix = _save_upload_to_temp(file)
        log.info(f"[/parse] Saved to temp: {tmp_path}")

        result = parse_resume(tmp_path, suffix, nlp=app.state.nlp)
        log.info(f"[/parse] Done — name='{result.get('name')}' skills={len(result.get('skills', []))}")

        # Strip raw text from response unless caller explicitly wants it
        if not include_raw:
            result.pop("raw_text", None)

        return JSONResponse(content=result)

    except HTTPException:
        raise
    except Exception as e:
        log.exception(f"[/parse] Unexpected error: {e}")
        raise HTTPException(status_code=500, detail=f"Parsing failed: {str(e)}")
    finally:
        _cleanup(tmp_path)


# =============================================================================
# POST /parse-text
# Parse raw text directly (no file upload needed).
# Useful for testing or when Node.js already extracted text.
# =============================================================================
@app.post("/parse-text", tags=["parsing"])
async def parse_text_endpoint(payload: dict):
    """
    Parse a resume from raw text string.
    Body: { "text": "...", "include_raw": false }
    """
    text = payload.get("text", "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Field 'text' is required and cannot be empty.")

    if app.state.nlp is None:
        raise HTTPException(status_code=503, detail="NLP model not loaded.")

    try:
        from parser_engine import parse_from_text
        result = parse_from_text(text, nlp=app.state.nlp)

        if not payload.get("include_raw", False):
            result.pop("raw_text", None)

        return JSONResponse(content=result)

    except Exception as e:
        log.exception(f"[/parse-text] Error: {e}")
        raise HTTPException(status_code=500, detail=f"Parsing failed: {str(e)}")


# =============================================================================
# POST /ats-score
# Score a resume's raw text against a job description.
# =============================================================================
@app.post("/ats-score", tags=["ats"])
async def ats_score_endpoint(payload: ATSRequest):
    """
    Calculate an ATS score for a resume against a job description.
    Returns score (0-100), matched keywords, and missing keywords.
    """
    resume_text = payload.resume_text.strip()
    job_desc    = payload.job_description.strip()

    if not resume_text:
        raise HTTPException(status_code=400, detail="'resume_text' cannot be empty.")
    if not job_desc:
        raise HTTPException(status_code=400, detail="'job_description' cannot be empty.")

    log.info(f"[/ats-score] resume={len(resume_text)} chars  jd={len(job_desc)} chars")

    try:
        result = calculate_ats_score(resume_text, job_desc)
        log.info(f"[/ats-score] Score: {result.get('ats_score')}%")
        return JSONResponse(content=result)

    except Exception as e:
        log.exception(f"[/ats-score] Error: {e}")
        raise HTTPException(status_code=500, detail=f"ATS scoring failed: {str(e)}")


# =============================================================================
# POST /parse-and-score
# Convenience endpoint: parse a file AND score it in one request.
# Accepts multipart/form-data with both file and job_description.
# =============================================================================
@app.post("/parse-and-score", tags=["parsing", "ats"])
async def parse_and_score_endpoint(
    file:            UploadFile = File(...),
    job_description: str        = Form(...),
):
    """
    Single endpoint for the full pipeline:
    Upload resume → extract text → parse fields → ATS score.
    """
    log.info(f"[/parse-and-score] {file.filename}")

    if app.state.nlp is None:
        raise HTTPException(status_code=503, detail="NLP model not loaded.")

    tmp_path = None
    try:
        tmp_path, suffix = _save_upload_to_temp(file)

        parsed = parse_resume(tmp_path, suffix, nlp=app.state.nlp)
        raw_text = parsed.get("raw_text", "")

        ats = {}
        if job_description.strip() and raw_text:
            ats = calculate_ats_score(raw_text, job_description)

        # Remove raw_text from the parsed section to keep response lean
        parsed.pop("raw_text", None)

        return JSONResponse(content={
            "parsed":    parsed,
            "ats_score": ats,
            "raw_text":  raw_text[:3000],    # return a preview only
        })

    except HTTPException:
        raise
    except Exception as e:
        log.exception(f"[/parse-and-score] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        _cleanup(tmp_path)


# =============================================================================
# GET /skills
# Returns the full list of skills the parser knows how to detect.
# Useful for the frontend skill filter dropdown.
# =============================================================================
@app.get("/skills", tags=["reference"])
def list_skills():
    """Return the master skills list used by the NLP parser."""
    from parser_engine import SKILL_KEYWORDS
    return {
        "total":  len(SKILL_KEYWORDS),
        "skills": sorted(SKILL_KEYWORDS),
    }


# =============================================================================
# POST /batch-parse
# Parse multiple raw text strings in one request.
# Useful for bulk-importing resumes already converted to text.
# =============================================================================
@app.post("/batch-parse", tags=["parsing"])
async def batch_parse_endpoint(payload: BatchParseRequest):
    """
    Parse up to 10 resume texts in a single request.
    Body: { "texts": ["resume text 1", "resume text 2", ...] }
    """
    if not payload.texts:
        raise HTTPException(status_code=400, detail="'texts' list cannot be empty.")
    if len(payload.texts) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 resumes per batch.")

    if app.state.nlp is None:
        raise HTTPException(status_code=503, detail="NLP model not loaded.")

    from parser_engine import parse_from_text

    results = []
    for i, text in enumerate(payload.texts):
        try:
            parsed = parse_from_text(text.strip(), nlp=app.state.nlp)
            parsed.pop("raw_text", None)
            results.append({ "index": i, "status": "ok", "data": parsed })
        except Exception as e:
            log.warning(f"[/batch-parse] Item {i} failed: {e}")
            results.append({ "index": i, "status": "error", "detail": str(e) })

    return JSONResponse(content={
        "total":     len(payload.texts),
        "processed": sum(1 for r in results if r["status"] == "ok"),
        "results":   results,
    })


# =============================================================================
# Global exception handler — returns clean JSON instead of HTML tracebacks
# =============================================================================
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    log.exception(f"Unhandled exception on {request.url}: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected server error occurred.", "error": str(exc)},
    )


# =============================================================================
# Entry point — run directly with: python main.py
# Or with uvicorn: uvicorn main:app --reload --port 8000
# =============================================================================
if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8000)),
        reload=True,
        log_level="info",
    )