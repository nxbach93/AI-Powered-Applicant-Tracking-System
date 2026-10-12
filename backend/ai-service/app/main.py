"""
AI-Powered ATS - AI Service
FastAPI application for CV parsing, skill extraction, and JD-CV semantic matching.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from fastapi.responses import JSONResponse

from app.api.endpoints import router as api_router
from app.services.text_extractor import TextExtractionError
from app.services.cv_parser import get_nlp

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
# Global Exception Handlers
# ---------------------------------------------------------------------------
@app.exception_handler(TextExtractionError)
async def text_extraction_exception_handler(request, exc: TextExtractionError):
    """Bắt các lỗi nghiệp vụ trích xuất CV và trả về định dạng JSON envelope chuẩn."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {
                "code": exc.code,
                "message": exc.message,
            },
        },
    )

# ---------------------------------------------------------------------------
# Register Routers
# ---------------------------------------------------------------------------
# Hỗ trợ cả 2 tiền tố: /api/v1 (phiên bản hóa) và /api/ai (gọi nội bộ theo API Contract)
app.include_router(api_router, prefix="/api/v1", tags=["AI Analysis"])
app.include_router(api_router, prefix="/api/ai", tags=["AI Internal"])


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
    """Load ML/NLP models on startup."""
    print("🚀 ATS AI Service started successfully")
    print("📄 API Docs available at http://localhost:8000/docs")

    # Khởi tạo mô hình spaCy NLP nếu có sẵn
    try:
        nlp = get_nlp()
        if nlp is not None:
            print("🧠 spaCy NER model 'en_core_web_sm' loaded successfully.")
        else:
            print("⚡ spaCy model not installed or unavailable. Using regex + rule-based NLP fallback.")
    except Exception as exc:
        print(f"⚠️ NLP model pre-load warning: {exc}")

    # Khởi tạo mô hình Sentence-Transformers nếu có sẵn
    try:
        from app.services.matching_engine import get_transformer_model
        t_model = get_transformer_model()
        if t_model is not None:
            print("🤖 Sentence-Transformers model 'all-MiniLM-L6-v2' loaded successfully.")
        else:
            print("⚡ Sentence-Transformers unavailable. Using TF-IDF / Cosine Similarity fallback.")
    except Exception as exc:
        print(f"⚠️ Transformer model pre-load warning: {exc}")



@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup resources on shutdown."""
    print("🛑 ATS AI Service shutting down...")

