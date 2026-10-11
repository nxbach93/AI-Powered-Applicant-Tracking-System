"""
AI Analysis Endpoints
Handles CV parsing, skill extraction, and JD-CV semantic matching.
"""

import random
from typing import Optional

from fastapi import APIRouter, File, Form, UploadFile, HTTPException
from pydantic import BaseModel

router = APIRouter()


# ---------------------------------------------------------------------------
# Response Models
# ---------------------------------------------------------------------------
class MatchScoreResponse(BaseModel):
    """Response schema for the CV analysis endpoint."""

    filename: str
    file_size_bytes: int
    match_score: float
    matched_skills: list[str]
    missing_skills: list[str]
    summary: str


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------
@router.post("/analyze-cv", response_model=MatchScoreResponse)
async def analyze_cv(
    cv_file: UploadFile = File(..., description="Candidate's CV file (PDF/DOCX)"),
    jd_text: str = Form(..., description="Job description text to match against"),
):
    """
    Analyze a CV against a Job Description and return a match score.

    This is currently a **dummy implementation** that returns randomized results.
    In production, this will:
    1. Parse the CV using pdfplumber / python-docx
    2. Extract skills using spaCy NER
    3. Compute semantic similarity using sentence-transformers

    - **cv_file**: The candidate's CV/resume file (PDF or DOCX format)
    - **jd_text**: The full job description text to match against
    """

    # Validate file type
    allowed_types = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ]
    if cv_file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {cv_file.content_type}. Please upload a PDF or DOCX file.",
        )

    # Read file content (for size calculation; actual parsing is TODO)
    file_content = await cv_file.read()
    file_size = len(file_content)

    if file_size == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    # -----------------------------------------------------------------------
    # DUMMY ANALYSIS (Replace with real AI pipeline)
    # -----------------------------------------------------------------------
    dummy_skill_pool = [
        "Python", "JavaScript", "TypeScript", "React", "Node.js",
        "SQL", "Docker", "AWS", "Git", "REST API",
        "Machine Learning", "Data Analysis", "Agile", "CI/CD",
        "Communication", "Leadership", "Problem Solving",
    ]

    num_matched = random.randint(3, 8)
    num_missing = random.randint(1, 4)

    matched_skills = random.sample(dummy_skill_pool, min(num_matched, len(dummy_skill_pool)))
    remaining = [s for s in dummy_skill_pool if s not in matched_skills]
    missing_skills = random.sample(remaining, min(num_missing, len(remaining)))

    match_score = round(random.uniform(0.45, 0.95), 2)

    return MatchScoreResponse(
        filename=cv_file.filename or "unknown",
        file_size_bytes=file_size,
        match_score=match_score,
        matched_skills=matched_skills,
        missing_skills=missing_skills,
        summary=(
            f"Dummy analysis complete. The CV '{cv_file.filename}' was evaluated against "
            f"the provided job description ({len(jd_text)} chars). "
            f"Match score: {match_score:.0%}. "
            f"Found {len(matched_skills)} matching skills and {len(missing_skills)} gaps."
        ),
    )
