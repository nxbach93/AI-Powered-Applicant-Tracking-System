"""
Dịch vụ So khớp & Chấm điểm Ứng viên (Matching Engine).

Nhiệm vụ:
- AI-05: So khớp Kỹ năng (Skill Matching) và Kinh nghiệm (Experience Matching).
- AI-06: Đo lường tương đồng ngữ nghĩa bằng Sentence-Transformers (all-MiniLM-L6-v2) & Cosine Similarity.
- AI-07: Tính điểm tổng hợp đa trọng số và Tự động sinh nhận xét đánh giá tự nhiên cho HR.
- Tích hợp cơ chế Zero-Crash Dynamic Fallback (TF-IDF + Cosine Similarity) an toàn tuyệt đối.
"""

from __future__ import annotations

import re
from typing import Optional

# ---------------------------------------------------------------------------
# Nạp thư viện ML / NLP với cơ chế kiểm soát ngoại lệ (Safe Imports)
# ---------------------------------------------------------------------------
try:
    import numpy as np
    from sentence_transformers import SentenceTransformer
except ImportError:
    SentenceTransformer = None
    np = None

try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity as sklearn_cosine_similarity
except ImportError:
    TfidfVectorizer = None
    sklearn_cosine_similarity = None

from app.schemas.cv_schema import (
    MatchCVRequest,
    MatchCVResponse,
    ScoreBreakdown,
)

# ---------------------------------------------------------------------------
# Quản lý vòng đời mô hình Sentence-Transformers (Lazy Singleton)
# ---------------------------------------------------------------------------
_transformer_model: Optional[SentenceTransformer] = None


def get_transformer_model() -> Optional[SentenceTransformer]:
    """
    Tải hoặc lấy đối tượng mô hình SentenceTransformer ('all-MiniLM-L6-v2') đã nạp trong RAM.
    """
    global _transformer_model
    if _transformer_model is None and SentenceTransformer is not None:
        try:
            # Mô hình all-MiniLM-L6-v2: Vector 384 chiều, siêu nhẹ (~80MB), suy luận CPU nhanh
            _transformer_model = SentenceTransformer("all-MiniLM-L6-v2")
        except Exception as exc:
            print(f"⚠️ Không thể khởi tạo mô hình SentenceTransformer: {exc}")
            _transformer_model = None
    return _transformer_model


# ============================================================================
# 1. THUẬT TOÁN SO KHỚP KỸ NĂNG (SKILL MATCHING) — AI-05
# ============================================================================
def calculate_skill_match(
    cv_skills: list[str],
    jd_required_skills: list[str],
) -> tuple[float, list[str], list[str]]:
    """
    So khớp tập hợp kỹ năng giữa CV và JD.

    Args:
        cv_skills: Danh sách kỹ năng bóc tách từ CV.
        jd_required_skills: Danh sách kỹ năng yêu cầu trong JD.

    Returns:
        tuple (skill_score [0.0 - 100.0], matched_skills, missing_skills)
    """
    if not jd_required_skills:
        # Nếu JD không yêu cầu kỹ năng bắt buộc nào, mặc định ứng viên đạt 100%
        return 100.0, cv_skills, []

    # Bản đồ hóa chữ thường -> tên chuẩn để so sánh không phân biệt hoa thường
    cv_skill_map = {s.strip().lower(): s.strip() for s in cv_skills if s and s.strip()}
    jd_skill_map = {s.strip().lower(): s.strip() for s in jd_required_skills if s and s.strip()}

    cv_keys = set(cv_skill_map.keys())
    jd_keys = set(jd_skill_map.keys())

    # Kỹ năng khớp (Intersection)
    matched_keys = jd_keys.intersection(cv_keys)
    matched_skills = [jd_skill_map[k] for k in matched_keys]

    # Kỹ năng thiếu (Difference)
    missing_keys = jd_keys.difference(cv_keys)
    missing_skills = [jd_skill_map[k] for k in missing_keys]

    # Tính điểm tỷ lệ
    score = (len(matched_keys) / len(jd_keys)) * 100.0
    skill_score = round(max(0.0, min(100.0, score)), 2)

    return skill_score, sorted(matched_skills), sorted(missing_skills)


# ============================================================================
# 2. THUẬT TOÁN SO KHỚP KINH NGHIỆM (EXPERIENCE MATCHING) — AI-05
# ============================================================================
def calculate_experience_match(
    cv_exp: Optional[int],
    jd_min_exp: Optional[int],
) -> float:
    """
    Đánh giá mức độ đáp ứng số năm kinh nghiệm so với yêu cầu JD.

    Args:
        cv_exp: Số năm kinh nghiệm của ứng viên.
        jd_min_exp: Số năm kinh nghiệm tối thiểu yêu cầu trong JD.

    Returns:
        Điểm kinh nghiệm từ 0.0 đến 100.0.
    """
    if jd_min_exp is None or jd_min_exp <= 0:
        # Tin tuyển dụng không yêu cầu kinh nghiệm (Fresher/Intern)
        return 100.0

    actual_exp = cv_exp if (cv_exp is not None and cv_exp > 0) else 0

    if actual_exp >= jd_min_exp:
        # Đạt hoặc vượt quá số năm kinh nghiệm yêu cầu
        return 100.0

    if actual_exp == 0:
        # Chưa có kinh nghiệm thực tế
        return 20.0 if jd_min_exp <= 1 else 0.0

    # Ứng viên có kinh nghiệm nhưng ít hơn yêu cầu: Tính theo tỷ lệ %
    score = (actual_exp / jd_min_exp) * 100.0
    return round(max(0.0, min(100.0, score)), 2)


# ============================================================================
# 3. SO SÁNH TƯƠNG ĐỒNG NGỮ NGHĨA (SEMANTIC SIMILARITY) — AI-06
# ============================================================================
def calculate_semantic_similarity(cv_text: str, jd_text: str) -> float:
    """
    Tính độ tương đồng Cosine ngữ nghĩa giữa văn bản CV và văn bản JD.

    Ưu tiên: Sentence-Transformers (all-MiniLM-L6-v2) -> Vector 384 chiều.
    Fallback: TF-IDF Vectorizer + Scikit-Learn Cosine Similarity.
    Fallback cuối: Jaccard Token Similarity thuần Python.

    Args:
        cv_text: Văn bản CV thô.
        jd_text: Văn bản JD tổng hợp (Tiêu đề + Mô tả + Yêu cầu).

    Returns:
        Điểm tương đồng ngữ nghĩa từ 0.0 đến 100.0.
    """
    clean_cv = (cv_text or "").strip()
    clean_jd = (jd_text or "").strip()

    if not clean_cv or not clean_jd:
        return 50.0

    # -----------------------------------------------------------------------
    # Phương án 1: Sentence-Transformers & Cosine Similarity (Deep NLP)
    # -----------------------------------------------------------------------
    model = get_transformer_model()
    if model is not None and np is not None:
        try:
            # Rút gọn văn bản tối đa 2000 ký tự để tối ưu tốc độ encoding
            embeddings = model.encode([clean_cv[:2000], clean_jd[:2000]])
            vec_a = embeddings[0]
            vec_b = embeddings[1]

            norm_a = np.linalg.norm(vec_a)
            norm_b = np.linalg.norm(vec_b)

            if norm_a > 0 and norm_b > 0:
                cosine_val = float(np.dot(vec_a, vec_b) / (norm_a * norm_b))
                # Cosine similarity thường nằm trong khoảng [0.2, 0.9] với văn bản tuyển dụng
                # Chuẩn hóa linh hoạt sang thang điểm 100
                score = cosine_val * 100.0
                return round(max(0.0, min(100.0, score)), 2)
        except Exception as exc:
            print(f"⚠️ Lỗi khi chạy Sentence-Transformers inference: {exc}. Chuyển sang fallback.")

    # -----------------------------------------------------------------------
    # Phương án 2: TF-IDF Vectorizer + Scikit-Learn Cosine Similarity
    # -----------------------------------------------------------------------
    if TfidfVectorizer is not None and sklearn_cosine_similarity is not None:
        try:
            vectorizer = TfidfVectorizer(max_features=1000, stop_words="english")
            tfidf_mat = vectorizer.fit_transform([clean_cv, clean_jd])
            sim_val = float(sklearn_cosine_similarity(tfidf_mat[0:1], tfidf_mat[1:2])[0][0])
            score = sim_val * 100.0
            return round(max(0.0, min(100.0, score)), 2)
        except Exception as exc:
            print(f"⚠️ Lỗi khi chạy TF-IDF fallback: {exc}")

    # -----------------------------------------------------------------------
    # Phương án 3: Token Jaccard Fallback thuần Python (Zero-Crash)
    # -----------------------------------------------------------------------
    words_cv = set(re.findall(r"\w+", clean_cv.lower()))
    words_jd = set(re.findall(r"\w+", clean_jd.lower()))
    if words_jd:
        jaccard = len(words_cv & words_jd) / len(words_cv | words_jd)
        score = min(100.0, jaccard * 250.0)  # Tỷ lệ scale nhẹ cho Jaccard
        return round(score, 2)

    return 50.0


# ============================================================================
# 4. BỘ SINH NHẬN XÉT TỰ NHIÊN (SUMMARY GENERATOR) — AI-07
# ============================================================================
def generate_match_summary(
    job_title: str,
    final_score: float,
    skill_score: float,
    exp_score: float,
    semantic_score: float,
    matched_skills: list[str],
    missing_skills: list[str],
    cv_exp: Optional[int],
    jd_min_exp: Optional[int],
) -> str:
    """
    Sinh câu tóm tắt đánh giá tự động bằng tiếng Việt cho HR.
    """
    # 1. Đánh giá tổng quan
    if final_score >= 85.0:
        level = "rất phù hợp xuất sắc"
    elif final_score >= 70.0:
        level = "phù hợp tốt"
    elif final_score >= 50.0:
        level = "đáp ứng mức cơ bản"
    else:
        level = "chưa đạt yêu cầu kỳ vọng"

    parts: list[str] = [
        f"Ứng viên {level} với vị trí '{job_title}' (Điểm tổng hợp: {final_score:.1f}%)."
    ]

    # 2. Chi tiết kỹ năng
    if matched_skills:
        skill_sample = ", ".join(matched_skills[:4])
        if len(matched_skills) > 4:
            skill_sample += f" và {len(matched_skills) - 4} kỹ năng khác"
        parts.append(f"Kỹ năng đạt {skill_score:.0f}%, sở hữu các năng lực cốt lõi: {skill_sample}.")
    else:
        parts.append(f"Điểm kỹ năng đạt {skill_score:.0f}%, chưa thể hiện rõ các kỹ năng trọng yếu trong JD.")

    # 3. Kỹ năng thiếu
    if missing_skills:
        missing_sample = ", ".join(missing_skills[:3])
        parts.append(f"Cần bồi dưỡng hoặc kiểm tra phỏng vấn thêm về: {missing_sample}.")

    # 4. Kinh nghiệm
    actual_exp = cv_exp or 0
    req_exp = jd_min_exp or 0
    if req_exp > 0:
        if actual_exp >= req_exp:
            parts.append(f"Kinh nghiệm ({actual_exp} năm) thỏa mãn yêu cầu của vị trí ({req_exp} năm).")
        else:
            parts.append(f"Kinh nghiệm ({actual_exp} năm) hiện tại chưa đủ so với yêu cầu ({req_exp} năm).")

    return " ".join(parts)


# ============================================================================
# 5. HÀM ĐIỀU PHỐI MATCHING TỔNG HỢP (ORCHESTRATOR) — AI-07 & AI-08
# ============================================================================
def match_cv_with_jd(request: MatchCVRequest) -> MatchCVResponse:
    """
    Thực thi toàn bộ pipeline so khớp giữa CVDataInput và JDDataInput.

    Quy trình:
    1. So khớp kỹ năng -> skill_score, matched_skills, missing_skills.
    2. So khớp kinh nghiệm -> experience_score.
    3. Tính độ tương đồng ngữ nghĩa -> semantic_score.
    4. Chuẩn hóa trọng số và tính điểm FinalScore.
    5. Tạo câu nhận xét tóm tắt bằng ngôn ngữ tự nhiên.
    6. Trả về đối tượng MatchCVResponse chuẩn.
    """
    cv = request.cv_data
    jd = request.jd_data
    weights = request.weights

    # Chuẩn hóa trọng số (Tổng trọng số luôn là 1.0)
    w_skill = weights.skill_weight
    w_exp = weights.exp_weight
    w_sem = weights.semantic_weight
    total_w = w_skill + w_exp + w_sem

    if total_w > 0:
        w_skill /= total_w
        w_exp /= total_w
        w_sem /= total_w
    else:
        w_skill, w_exp, w_sem = 0.5, 0.3, 0.2

    # 1. Tính điểm kỹ năng
    skill_score, matched_skills, missing_skills = calculate_skill_match(
        cv_skills=cv.skills,
        jd_required_skills=jd.required_skills,
    )

    # 2. Tính điểm kinh nghiệm
    exp_score = calculate_experience_match(
        cv_exp=cv.experience_years,
        jd_min_exp=jd.min_experience_years,
    )

    # 3. Tính điểm ngữ nghĩa
    jd_full_text = f"{jd.title}\n{jd.description or ''}\n{jd.requirements or ''}".strip()
    cv_full_text = cv.raw_text or ", ".join(cv.skills)

    semantic_score = calculate_semantic_similarity(
        cv_text=cv_full_text,
        jd_text=jd_full_text,
    )

    # 4. Tính điểm tổng hợp (Weighted Score)
    final_score = (w_skill * skill_score) + (w_exp * exp_score) + (w_sem * semantic_score)
    final_score = round(max(0.0, min(100.0, final_score)), 2)

    # 5. Sinh tóm tắt nhận xét
    summary = generate_match_summary(
        job_title=jd.title,
        final_score=final_score,
        skill_score=skill_score,
        exp_score=exp_score,
        semantic_score=semantic_score,
        matched_skills=matched_skills,
        missing_skills=missing_skills,
        cv_exp=cv.experience_years,
        jd_min_exp=jd.min_experience_years,
    )

    # 6. Đóng gói kết quả theo Schema chuẩn
    return MatchCVResponse(
        success=True,
        match_score=final_score,
        score_breakdown=ScoreBreakdown(
            skill_score=skill_score,
            experience_score=exp_score,
            semantic_score=semantic_score,
        ),
        parsed_skills=cv.skills,
        matched_skills=matched_skills,
        missing_skills=missing_skills,
        experience_years=cv.experience_years,
        summary=summary,
    )
