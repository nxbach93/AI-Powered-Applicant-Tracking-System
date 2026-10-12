"""
CV Schema Definitions — Pydantic DTOs

Tuân thủ API Contract (docs/API_CONTRACT.md):
  - Section 4.1: Response schema cho /parse-cv (ParseCVResponse)
  - Section 4.2: Response schema cho /match-cv (MatchCVResponse)
  - Section 1.3: Error Response envelope chuẩn (ErrorDetail, ErrorResponse)
"""

from typing import Optional
# pyrefly: ignore [missing-import]
from pydantic import BaseModel, Field


# ============================================================================
# Shared / Common Schemas
# ============================================================================

class ContactInfo(BaseModel):
    """Thông tin liên hệ được trích xuất từ CV."""
    email: Optional[str] = Field(
        default=None,
        description="Địa chỉ email trích xuất từ CV",
        examples=["candidate@example.com"],
    )
    phone: Optional[str] = Field(
        default=None,
        description="Số điện thoại trích xuất từ CV (định dạng chuẩn hoặc thô)",
        examples=["0987654321"],
    )


class ErrorDetail(BaseModel):
    """Chi tiết lỗi tuân thủ chuẩn error envelope của API Contract."""
    code: str = Field(description="Mã lỗi dạng UPPER_SNAKE_CASE", examples=["UNSUPPORTED_MEDIA_TYPE"])
    message: str = Field(description="Thông báo lỗi mô tả rõ nguyên nhân", examples=["Định dạng file không được hỗ trợ."])


class ErrorResponse(BaseModel):
    """Wrapper phản hồi lỗi chuẩn, dùng cho mọi HTTP error trong AI service."""
    success: bool = Field(default=False)
    error: ErrorDetail


# ============================================================================
# /api/v1/parse-cv — AI-03 & AI-04 (Bóc tách & Chuẩn hóa CV)
# ============================================================================

class ParseCVResponse(BaseModel):
    """
    Response schema cho POST /api/v1/parse-cv.
    Khớp 100% với mục 4.1 của docs/API_CONTRACT.md.

    Trường này được Core API dùng để:
    1. Lưu `parsed_skills` và `experience_years` vào CandidateProfile.
    2. Làm đầu vào cho /match-cv khi chạy AI so khớp tiếp theo.
    """
    success: bool = Field(default=True)
    filename: str = Field(description="Tên file CV gốc được gửi lên", examples=["cv_nguyen_van_an.pdf"])
    text_length: int = Field(
        description="Tổng số ký tự văn bản trích xuất được từ file",
        examples=[3420],
        ge=0,
    )
    contact_info: ContactInfo = Field(description="Thông tin liên hệ trích xuất")
    parsed_skills: list[str] = Field(
        default_factory=list,
        description="Danh sách kỹ năng trích xuất được, đã loại trùng và chuẩn hóa chữ hoa/thường",
        examples=[["JavaScript", "TypeScript", "React", "Node.js", "Docker", "SQL"]],
    )
    experience_years: Optional[int] = Field(
        default=None,
        description="Số năm kinh nghiệm ước tính từ CV (None nếu không xác định được)",
        examples=[3],
        ge=0,
    )
    education: Optional[str] = Field(
        default=None,
        description="Thông tin học vấn cấp cao nhất trích xuất được",
        examples=["Đại học Bách Khoa Hà Nội"],
    )


# ============================================================================
# /api/v1/match-cv — AI-05, AI-06 & AI-07 (So khớp CV với JD)
# ============================================================================

class CVDataInput(BaseModel):
    """Dữ liệu CV của ứng viên đưa vào so khớp."""
    raw_text: Optional[str] = Field(
        default="",
        description="Văn bản thô đã trích xuất từ CV phục vụ so sánh ngữ nghĩa",
        examples=["Nguyễn Văn An. 3 năm kinh nghiệm phát triển Web với React, TypeScript, Node.js, Docker."],
    )
    skills: list[str] = Field(
        default_factory=list,
        description="Danh sách kỹ năng đã trích xuất từ CV",
        examples=[["React", "TypeScript", "Node.js", "Docker", "Tailwind CSS", "SQL"]],
    )
    experience_years: Optional[int] = Field(
        default=None,
        description="Số năm kinh nghiệm của ứng viên",
        examples=[3],
        ge=0,
    )


class JDDataInput(BaseModel):
    """Dữ liệu tin tuyển dụng (Job Description) đưa vào so khớp."""
    title: str = Field(
        description="Tiêu đề vị trí tuyển dụng",
        examples=["Senior Frontend Developer (React/Next.js)"],
    )
    description: Optional[str] = Field(
        default="",
        description="Mô tả công việc chi tiết",
        examples=["Tham gia phát triển hệ thống quản lý tuyển dụng nội bộ quy mô lớn với kiến trúc microservices."],
    )
    requirements: Optional[str] = Field(
        default="",
        description="Yêu cầu năng lực công việc",
        examples=["Thành thạo React, Next.js, TypeScript. Tối thiểu 3 năm kinh nghiệm. Ưu tiên có kiến thức về Docker."],
    )
    required_skills: list[str] = Field(
        default_factory=list,
        description="Danh sách kỹ năng yêu cầu trong JD",
        examples=[["React", "Next.js", "TypeScript", "GraphQL", "Docker"]],
    )
    min_experience_years: Optional[int] = Field(
        default=0,
        description="Số năm kinh nghiệm tối thiểu yêu cầu",
        examples=[3],
        ge=0,
    )


class MatchWeightsInput(BaseModel):
    """Tùy chỉnh trọng số tính điểm tổng hợp (Tổng trọng số chuẩn hóa về 1.0)."""
    skill_weight: float = Field(
        default=0.5,
        description="Trọng số kỹ năng (0.0 - 1.0)",
        examples=[0.5],
        ge=0.0,
        le=1.0,
    )
    exp_weight: float = Field(
        default=0.3,
        description="Trọng số kinh nghiệm (0.0 - 1.0)",
        examples=[0.3],
        ge=0.0,
        le=1.0,
    )
    semantic_weight: float = Field(
        default=0.2,
        description="Trọng số tương đồng ngữ nghĩa (0.0 - 1.0)",
        examples=[0.2],
        ge=0.0,
        le=1.0,
    )


class MatchCVRequest(BaseModel):
    """
    Request payload chuẩn cho POST /api/v1/match-cv.
    Thiết kế decoupled: nhận trực tiếp CV Data và JD Data để test độc lập mà không cần chờ TV2.
    """
    cv_data: CVDataInput = Field(description="Dữ liệu CV đã trích xuất của ứng viên")
    jd_data: JDDataInput = Field(description="Dữ liệu tin tuyển dụng (JD)")
    weights: MatchWeightsInput = Field(
        default_factory=MatchWeightsInput,
        description="Cấu hình trọng số (tùy chọn, mặc định 0.5 - 0.3 - 0.2)",
    )



class ScoreBreakdown(BaseModel):
    """
    Chi tiết điểm thành phần theo công thức trọng số.
    FinalScore = (skill_weight × skill_score) + (exp_weight × exp_score) + (semantic_weight × semantic_score)
    """
    skill_score: float = Field(
        description="Điểm khớp kỹ năng (0.0 – 100.0): Tỷ lệ % kỹ năng CV đáp ứng yêu cầu JD",
        examples=[90.0],
        ge=0.0,
        le=100.0,
    )
    experience_score: float = Field(
        description="Điểm kinh nghiệm (0.0 – 100.0): Đánh giá dựa trên số năm kinh nghiệm yêu cầu",
        examples=[85.0],
        ge=0.0,
        le=100.0,
    )
    semantic_score: float = Field(
        description="Điểm tương đồng ngữ nghĩa (0.0 – 100.0): Cosine similarity giữa embedding CV và JD",
        examples=[89.2],
        ge=0.0,
        le=100.0,
    )


class MatchCVResponse(BaseModel):
    """
    Response schema cho POST /api/v1/match-cv.
    Khớp 100% với mục 4.2 của docs/API_CONTRACT.md.

    Trường này được Core API dùng để:
    - Lưu `ai_match_score` vào Application.aiMatchScore
    - Lưu `parsed_skills` vào Application.parsedSkills
    - Lưu `summary` vào Application.aiAnalysisSummary
    """
    success: bool = Field(default=True)
    match_score: float = Field(
        description="Điểm tổng hợp cuối cùng (0.0 – 100.0), tính theo công thức trọng số",
        examples=[88.5],
        ge=0.0,
        le=100.0,
    )
    score_breakdown: ScoreBreakdown = Field(description="Chi tiết điểm từng thành phần")
    parsed_skills: list[str] = Field(
        default_factory=list,
        description="Kỹ năng trích xuất được từ CV ứng viên",
        examples=[["React", "Next.js", "TypeScript", "Node.js", "Tailwind CSS"]],
    )
    matched_skills: list[str] = Field(
        default_factory=list,
        description="Kỹ năng CV khớp với yêu cầu JD",
        examples=[["React", "Next.js", "TypeScript"]],
    )
    missing_skills: list[str] = Field(
        default_factory=list,
        description="Kỹ năng JD yêu cầu nhưng CV chưa thể hiện",
        examples=[["GraphQL", "Docker"]],
    )
    experience_years: Optional[int] = Field(
        default=None,
        description="Số năm kinh nghiệm trích xuất được từ CV",
        examples=[3],
        ge=0,
    )
    summary: str = Field(
        description="Tóm tắt phân tích AI bằng ngôn ngữ tự nhiên để HR đọc",
        examples=["Ứng viên phù hợp tốt với vị trí Senior Frontend. Điểm kỹ năng đạt 90%, sở hữu kinh nghiệm thực chiến với React và TypeScript."],
    )
