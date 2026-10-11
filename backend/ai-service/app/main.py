"""
AI-Powered ATS - AI Service
FastAPI application for CV parsing, skill extraction, and JD-CV semantic matching.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.endpoints import router as api_router

# ---------------------------------------------------------------------------
# Application Factory
# ---------------------------------------------------------------------------
app = FastAPI(
    title="ATS AI Service",
    description="AI microservice for CV parsing, skill extraction, and semantic matching.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ---------------------------------------------------------------------------
# CORS Middleware
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Register Routers
# ---------------------------------------------------------------------------
app.include_router(api_router, prefix="/api/v1", tags=["AI Analysis"])


# ---------------------------------------------------------------------------
# Health Check
# ---------------------------------------------------------------------------
@app.get("/health", tags=["System"])
async def health_check():
    """Service health check endpoint."""
    return {
        "status": "ok",
        "service": "ats-ai-service",
    }


# ---------------------------------------------------------------------------
# Startup / Shutdown Events
# ---------------------------------------------------------------------------
@app.on_event("startup")
async def startup_event():
    """Load ML models on startup (placeholder for future implementation)."""
    print("🚀 ATS AI Service started successfully")
    print("📄 API Docs available at http://localhost:8000/docs")
    # TODO: Pre-load spaCy model and sentence-transformer model here
    # import spacy
    # nlp = spacy.load("en_core_web_sm")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup resources on shutdown."""
    print("🛑 ATS AI Service shutting down...")
