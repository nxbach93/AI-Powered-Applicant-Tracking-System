# Schemas package — Pydantic DTOs cho AI service
from app.schemas.cv_schema import (
    ContactInfo,
    CVDataInput,
    ErrorDetail,
    ErrorResponse,
    JDDataInput,
    MatchCVRequest,
    MatchCVResponse,
    MatchWeightsInput,
    ParseCVResponse,
    ScoreBreakdown,
)

__all__ = [
    "ContactInfo",
    "CVDataInput",
    "ErrorDetail",
    "ErrorResponse",
    "JDDataInput",
    "MatchCVRequest",
    "MatchCVResponse",
    "MatchWeightsInput",
    "ParseCVResponse",
    "ScoreBreakdown",
]

