"""
Package services — Chứa toàn bộ nghiệp vụ xử lý AI và xử lý tài liệu.
"""

from app.services.cv_parser import (
    extract_education,
    extract_email,
    extract_experience_years,
    extract_phone,
    extract_skills,
    get_nlp,
    parse_cv_text,
)
from app.services.matching_engine import (
    calculate_experience_match,
    calculate_semantic_similarity,
    calculate_skill_match,
    generate_match_summary,
    get_transformer_model,
    match_cv_with_jd,
)
from app.services.text_extractor import (
    EmptyFileError,
    EncryptedPDFError,
    ScannedPDFError,
    TextExtractionError,
    UnsupportedFileTypeError,
    extract_text,
    extract_text_from_docx,
    extract_text_from_pdf,
)

__all__ = [
    # Text Extractor
    "extract_text",
    "extract_text_from_pdf",
    "extract_text_from_docx",
    "TextExtractionError",
    "EmptyFileError",
    "UnsupportedFileTypeError",
    "EncryptedPDFError",
    "ScannedPDFError",
    # CV Parser
    "parse_cv_text",
    "extract_email",
    "extract_phone",
    "extract_skills",
    "extract_experience_years",
    "extract_education",
    "get_nlp",
    # Matching Engine
    "match_cv_with_jd",
    "calculate_skill_match",
    "calculate_experience_match",
    "calculate_semantic_similarity",
    "generate_match_summary",
    "get_transformer_model",
]

