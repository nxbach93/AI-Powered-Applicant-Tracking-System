"""
Dịch vụ trích xuất văn bản thô từ file CV (PDF & DOCX).
Tuân thủ:
- Xử lý in-memory (io.BytesIO) từ luồng bytes, hoàn toàn stateless, không ghi file đệm ra đĩa.
- Phân tách module rõ ràng: extract_text_from_pdf (pdfplumber) & extract_text_from_docx (python-docx).
- Bắt lỗi & ném Custom Exception chuẩn (EmptyFile, EncryptedPDF, ScannedPDF, UnsupportedFileType).
"""

from __future__ import annotations

import io
import os
from typing import Optional

import docx
import pdfplumber
from pdfminer.pdfdocument import PDFEncryptionError, PDFPasswordIncorrect
from pdfminer.pdfparser import PDFSyntaxError


# ============================================================================
# Cấu hình ngưỡng (Thresholds)
# ============================================================================
MIN_TEXT_LENGTH_THRESHOLD = 50  # Ngưỡng ký tự tối thiểu để nhận diện PDF scan ảnh


# ============================================================================
# Custom Exceptions cho tầng Text Extractor
# ============================================================================
class TextExtractionError(Exception):
    """Lớp ngoại lệ cơ sở cho các lỗi trích xuất văn bản."""

    def __init__(
        self,
        message: str,
        code: str = "EXTRACTION_FAILED",
        status_code: int = 400,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code


class EmptyFileError(TextExtractionError):
    """Ngoại lệ khi file rỗng (0 bytes hoặc nội dung hoàn toàn trắng)."""

    def __init__(
        self,
        message: str = "Tệp CV tải lên rỗng (0 bytes hoặc không có nội dung).",
        code: str = "EMPTY_FILE",
        status_code: int = 400,
    ) -> None:
        super().__init__(message=message, code=code, status_code=status_code)


class UnsupportedFileTypeError(TextExtractionError):
    """Ngoại lệ khi định dạng tệp không được hỗ trợ."""

    def __init__(
        self,
        message: str = "Định dạng file không được hỗ trợ. Hệ thống chỉ chấp nhận tệp .pdf hoặc .docx.",
        code: str = "UNSUPPORTED_MEDIA_TYPE",
        status_code: int = 415,
    ) -> None:
        super().__init__(message=message, code=code, status_code=status_code)


class EncryptedPDFError(TextExtractionError):
    """Ngoại lệ khi tệp PDF bị khóa mật khẩu."""

    def __init__(
        self,
        message: str = "Tệp PDF được bảo vệ bằng mật khẩu mã hóa. Vui lòng gỡ mật khẩu trước khi tải lên.",
        code: str = "ENCRYPTED_PDF",
        status_code: int = 422,
    ) -> None:
        super().__init__(message=message, code=code, status_code=status_code)


class ScannedPDFError(TextExtractionError):
    """Ngoại lệ khi tệp PDF là dạng ảnh scan không chứa lớp text số."""

    def __init__(
        self,
        message: str = (
            "Tệp PDF dạng ảnh scan hoặc không chứa văn bản có thể trích xuất. "
            "Vui lòng tải lên CV có chứa văn bản kỹ thuật số."
        ),
        code: str = "SCANNED_PDF",
        status_code: int = 422,
    ) -> None:
        super().__init__(message=message, code=code, status_code=status_code)


# ============================================================================
# Core Extraction Functions
# ============================================================================
def extract_text_from_pdf(file_bytes: bytes) -> str:
    """
    Trích xuất toàn bộ văn bản từ luồng bytes của file PDF sử dụng pdfplumber.

    Xử lý:
    - Đọc hoàn toàn in-memory qua io.BytesIO.
    - Phát hiện PDF bị khóa mật khẩu / mã hóa.
    - Duyệt qua từng trang và trích xuất text.
    - Phát hiện PDF dạng ảnh scan (độ dài văn bản dưới ngưỡng tối thiểu).

    Args:
        file_bytes: Chuỗi bytes nhị phân của tệp PDF.

    Returns:
        Chuỗi văn bản thô đã được chuẩn hóa khoảng trắng thừa.

    Raises:
        EmptyFileError: Khi file_bytes rỗng.
        EncryptedPDFError: Khi file PDF có mật khẩu.
        ScannedPDFError: Khi file PDF không có text (ảnh scan).
        TextExtractionError: Khi file bị hỏng hoặc lỗi định dạng.
    """
    if not file_bytes or len(file_bytes) == 0:
        raise EmptyFileError("Tệp PDF có dung lượng 0 bytes.")

    buffer = io.BytesIO(file_bytes)

    try:
        extracted_pages: list[str] = []

        with pdfplumber.open(buffer) as pdf:
            if not pdf.pages:
                raise EmptyFileError("Tệp PDF không chứa trang nào.")

            for page_num, page in enumerate(pdf.pages, start=1):
                try:
                    page_text = page.extract_text()
                    if page_text:
                        extracted_pages.append(page_text.strip())
                except Exception as page_err:
                    err_msg = str(page_err).lower()
                    if "password" in err_msg or "encrypt" in err_msg:
                        raise EncryptedPDFError() from page_err
                    # Bỏ qua lỗi trang đơn lẻ nếu trang khác vẫn đọc được
                    continue

        full_text = "\n\n".join(extracted_pages).strip()

        # Kiểm tra ngưỡng văn bản trích xuất được
        if len(full_text) < MIN_TEXT_LENGTH_THRESHOLD:
            raise ScannedPDFError()

        return full_text

    except (PDFPasswordIncorrect, PDFEncryptionError) as exc:
        raise EncryptedPDFError() from exc
    except (PDFSyntaxError, Exception) as exc:
        if isinstance(exc, (EmptyFileError, EncryptedPDFError, ScannedPDFError)):
            raise
        err_str = str(exc).lower()
        if "password" in err_str or "encrypt" in err_str:
            raise EncryptedPDFError() from exc
        raise TextExtractionError(
            message=f"Lỗi khi đọc cấu trúc tệp PDF: {str(exc)}",
            code="PDF_PARSE_FAILED",
            status_code=400,
        ) from exc


def extract_text_from_docx(file_bytes: bytes) -> str:
    """
    Trích xuất toàn bộ văn bản từ luồng bytes của file DOCX sử dụng python-docx.

    Xử lý:
    - Đọc hoàn toàn in-memory qua io.BytesIO.
    - Trích xuất toàn bộ các đoạn văn bản (paragraphs).
    - Trích xuất toàn bộ các ô trong bảng biểu (tables) — quan trọng vì nhiều CV
      dùng layout bảng 2 cột cho kỹ năng và kinh nghiệm.
    - Loại bỏ các ô bị trùng lặp khi bảng có merge cell.

    Args:
        file_bytes: Chuỗi bytes nhị phân của tệp DOCX.

    Returns:
        Chuỗi văn bản thô đã được ghép và chuẩn hóa.

    Raises:
        EmptyFileError: Khi file_bytes rỗng hoặc không có chữ nào.
        TextExtractionError: Khi file DOCX bị hỏng hoặc không đúng chuẩn OOXML.
    """
    if not file_bytes or len(file_bytes) == 0:
        raise EmptyFileError("Tệp DOCX có dung lượng 0 bytes.")

    buffer = io.BytesIO(file_bytes)

    try:
        doc = docx.Document(buffer)
    except Exception as exc:
        raise TextExtractionError(
            message=f"Không thể mở tệp DOCX (tệp có thể bị hỏng hoặc sai định dạng): {str(exc)}",
            code="DOCX_PARSE_FAILED",
            status_code=400,
        ) from exc

    extracted_parts: list[str] = []

    # 1. Trích xuất paragraphs thông thường
    for para in doc.paragraphs:
        text = para.text.strip()
        if text:
            extracted_parts.append(text)

    # 2. Trích xuất text từ các bảng (tables)
    seen_cells: set[str] = set()
    for table in doc.tables:
        for row in table.rows:
            for cell in row.cells:
                # Ngăn ngừa đọc lặp lại cell bị merged trong docx
                cell_id = id(cell._tc)
                if cell_id in seen_cells:
                    continue
                seen_cells.add(cell_id)

                cell_text = cell.text.strip()
                if cell_text:
                    extracted_parts.append(cell_text)

    full_text = "\n\n".join(extracted_parts).strip()

    if len(full_text) < MIN_TEXT_LENGTH_THRESHOLD:
        raise EmptyFileError("Tệp DOCX không chứa đủ nội dung văn bản (dưới 50 ký tự).")

    return full_text


def extract_text(filename: str, file_bytes: bytes) -> str:
    """
    Điều phối trích xuất văn bản thô dựa trên phần mở rộng file (Extension).

    Định dạng hỗ trợ:
    - PDF (.pdf) -> extract_text_from_pdf
    - DOCX (.docx) -> extract_text_from_docx

    Args:
        filename: Tên file gốc người dùng tải lên (ví dụ: cv_nguyen_van_a.pdf)
        file_bytes: Dữ liệu nhị phân của file (UploadFile.file.read())

    Returns:
        Chuỗi văn bản thô sau khi bóc tách.

    Raises:
        UnsupportedFileTypeError: Khi đuôi file không phải .pdf hoặc .docx.
        EmptyFileError, EncryptedPDFError, ScannedPDFError, TextExtractionError.
    """
    if not filename:
        raise UnsupportedFileTypeError("Tên file không hợp lệ hoặc bị trống.")

    _, ext = os.path.splitext(filename.lower())

    if ext == ".pdf":
        return extract_text_from_pdf(file_bytes)
    elif ext == ".docx":
        return extract_text_from_docx(file_bytes)
    else:
        raise UnsupportedFileTypeError(
            f"Phần mở rộng '{ext}' không được hỗ trợ. Vui lòng chỉ tải file .pdf hoặc .docx."
        )
