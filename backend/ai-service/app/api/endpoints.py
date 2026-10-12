"""
AI Analysis Endpoints
Cung cấp các API xử lý bóc tách thông tin CV và so khớp ngữ nghĩa JD - CV.
Tuân thủ API Contract (docs/API_CONTRACT.md).
"""

from fastapi import APIRouter, File, Form, UploadFile, status
from fastapi.responses import JSONResponse

from app.schemas.cv_schema import (
    ContactInfo,
    CVDataInput,
    ErrorResponse,
    JDDataInput,
    MatchCVRequest,
    MatchCVResponse,
    MatchWeightsInput,
    ParseCVResponse,
)
from app.services.cv_parser import parse_cv_text
from app.services.matching_engine import match_cv_with_jd
from app.services.text_extractor import (
    EmptyFileError,
    TextExtractionError,
    extract_text,
)

router = APIRouter()


# ============================================================================
# POST /api/v1/parse-cv — Bóc tách & Chuẩn hóa thông tin CV
# ============================================================================
@router.post(
    "/parse-cv",
    response_model=ParseCVResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Tệp rỗng hoặc lỗi phân tích cấu trúc"},
        415: {"model": ErrorResponse, "description": "Định dạng file không được hỗ trợ (chỉ nhận .pdf, .docx)"},
        422: {"model": ErrorResponse, "description": "PDF có mật khẩu mã hóa hoặc PDF dạng ảnh scan"},
        500: {"model": ErrorResponse, "description": "Lỗi hệ thống nội bộ"},
    },
    summary="Bóc tách thực thể CV (PDF & DOCX)",
    description=(
        "Tiếp nhận tệp CV nhị phân (.pdf hoặc .docx), trích xuất văn bản thô in-memory, "
        "bóc tách thông tin liên hệ (Email, SĐT), kỹ năng chuyên môn, kinh nghiệm và học vấn."
    ),
)
async def parse_cv(
    file: UploadFile = File(..., description="Tệp CV nhị phân (.pdf hoặc .docx)"),
):
    """
    Xử lý bóc tách thông tin ứng viên từ file CV thật:
    1. Đọc luồng bytes từ UploadFile.
    2. Trích xuất text thô bằng pdfplumber / python-docx (services.text_extractor).
    3. Bóc tách thực thể (Email, SĐT, Skills, Experience, Education) bằng NLP & Regex (services.cv_parser).
    4. Trả về kết quả JSON thật tuân thủ ParseCVResponse.
    """
    filename = file.filename or "unknown"

    try:
        # 1. Đọc dữ liệu nhị phân từ tệp
        file_bytes = await file.read()

        if not file_bytes or len(file_bytes) == 0:
            raise EmptyFileError("Tệp CV tải lên rỗng (0 bytes).")

        # 2. Trích xuất văn bản thô (in-memory, kiểm tra PDF scan / mã hóa / DOCX)
        extracted_text = extract_text(filename=filename, file_bytes=file_bytes)

        # 3. Bóc tách các thực thể và chuẩn hóa thông tin
        parsed_data = parse_cv_text(extracted_text)

        # 4. Đóng gói phản hồi theo DTO chuẩn API Contract
        return ParseCVResponse(
            success=True,
            filename=filename,
            text_length=len(extracted_text),
            contact_info=ContactInfo(
                email=parsed_data["contact_info"]["email"],
                phone=parsed_data["contact_info"]["phone"],
            ),
            parsed_skills=parsed_data["parsed_skills"],
            experience_years=parsed_data["experience_years"],
            education=parsed_data["education"],
        )

    except TextExtractionError as exc:
        # Bắt các Custom Exceptions nghiệp vụ từ tầng Text Extractor
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
    except Exception as exc:
        # Bắt các lỗi ngoại lệ không lường trước
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "error": {
                    "code": "INTERNAL_SERVER_ERROR",
                    "message": f"Đã xảy ra lỗi không xác định trong quá trình bóc tách CV: {str(exc)}",
                },
            },
        )


# ============================================================================
# POST /api/v1/match-cv — So khớp CV với JD (Matching Engine)
# ============================================================================
@router.post(
    "/match-cv",
    response_model=MatchCVResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Dữ liệu JSON không hợp lệ hoặc thiếu trường bắt buộc"},
        422: {"model": ErrorResponse, "description": "Lỗi định dạng dữ liệu (Validation Error)"},
        500: {"model": ErrorResponse, "description": "Lỗi tính toán hệ thống nội bộ"},
    },
    summary="So khớp hồ sơ CV với Job Description (Pure JSON)",
    description=(
        "Tiếp nhận dữ liệu CV đã bóc tách và dữ liệu JD dạng JSON thuần. "
        "Tính toán điểm khớp kỹ năng, điểm kinh nghiệm, tương đồng ngữ nghĩa bằng Sentence-Transformers "
        "và trả về Match Score tổng hợp kèm danh sách kỹ năng matched/missing cùng tóm tắt AI."
    ),
)
async def match_cv(request: MatchCVRequest):
    """
    Xử lý so khớp ứng viên và tin tuyển dụng độc lập:
    1. Kiểm tra validation logic (tiêu đề JD không được để trống).
    2. Gọi matching_engine.match_cv_with_jd tính toán 3 trụ cột điểm.
    3. Đóng gói kết quả trả về MatchCVResponse.
    """
    try:
        # Kiểm tra tính hợp lệ của dữ liệu đầu vào
        if not request.jd_data or not request.jd_data.title or not request.jd_data.title.strip():
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={
                    "success": False,
                    "error": {
                        "code": "VALIDATION_ERROR",
                        "message": "Trường 'jd_data.title' (Tiêu đề công việc) là bắt buộc và không được để trống.",
                    },
                },
            )

        if not request.cv_data:
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={
                    "success": False,
                    "error": {
                        "code": "VALIDATION_ERROR",
                        "message": "Trường 'cv_data' (Dữ liệu CV ứng viên) không được để trống.",
                    },
                },
            )

        # Thực thi pipeline so khớp toàn diện
        result = match_cv_with_jd(request)
        return result

    except Exception as exc:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "error": {
                    "code": "MATCHING_ENGINE_ERROR",
                    "message": f"Đã xảy ra lỗi trong quá trình phân tích so khớp CV - JD: {str(exc)}",
                },
            },
        )


# ============================================================================
# POST /api/v1/analyze-cv — Tích hợp Trực tiếp Core-API (CV File + JD Text)
# ============================================================================
@router.post(
    "/analyze-cv",
    summary="Phân tích & So khớp CV toàn diện từ tệp tải lên (Dùng cho Core API)",
    description="Nhận tệp CV vật lý cùng nội dung JD để bóc tách và tính điểm Match Score tự động.",
)
async def analyze_cv(
    cv_file: UploadFile = File(..., description="Tệp CV (.pdf hoặc .docx)"),
    jd_text: str = Form(..., description="Nội dung JD tổng hợp"),
    skill_weight: float = Form(0.5, description="Trọng số kỹ năng"),
    exp_weight: float = Form(0.3, description="Trọng số kinh nghiệm"),
    semantic_weight: float = Form(0.2, description="Trọng số ngữ nghĩa"),
):
    try:
        filename = cv_file.filename or "unknown"
        file_bytes = await cv_file.read()
        if not file_bytes:
            raise EmptyFileError("Tệp CV tải lên rỗng (0 bytes).")

        extracted_text = extract_text(filename=filename, file_bytes=file_bytes)
        parsed_data = parse_cv_text(extracted_text)

        jd_lines = [line.strip() for line in jd_text.strip().splitlines() if line.strip()]
        jd_title = jd_lines[0] if jd_lines else "Vị trí tuyển dụng"

        jd_input = JDDataInput(
            title=jd_title,
            description=jd_text,
            requirements="",
            required_skills=[],
            min_experience_years=0,
        )
        cv_input = CVDataInput(
            raw_text=extracted_text,
            skills=parsed_data.get("parsed_skills", []),
            experience_years=parsed_data.get("experience_years", 0),
        )
        weights = MatchWeightsInput(
            skill_weight=skill_weight,
            exp_weight=exp_weight,
            semantic_weight=semantic_weight,
        )

        match_result = match_cv_with_jd(MatchCVRequest(cv_data=cv_input, jd_data=jd_input, weights=weights))

        return {
            "success": True,
            "match_score": match_result.match_score,
            "parsed_skills": match_result.parsed_skills,
            "summary": match_result.summary,
            "score_breakdown": {
                "skill_score": match_result.score_breakdown.skill_score,
                "experience_score": match_result.score_breakdown.experience_score,
                "semantic_score": match_result.score_breakdown.semantic_score,
            },
            "matched_skills": match_result.matched_skills,
            "missing_skills": match_result.missing_skills,
        }
    except TextExtractionError as exc:
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
    except Exception as exc:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "error": {
                    "code": "ANALYSIS_ERROR",
                    "message": f"Lỗi phân tích CV: {str(exc)}",
                },
            },
        )



