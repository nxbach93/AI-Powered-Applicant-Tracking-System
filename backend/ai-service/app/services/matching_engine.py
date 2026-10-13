"""
Dịch vụ So khớp & Chấm điểm Ứng viên (Matching Engine) — Hybrid Scoring Engine v2.

Nhiệm vụ:
- AI-05: So khớp Kỹ năng (Skill Matching) và Kinh nghiệm (Experience Matching).
- AI-06: Đo lường tương đồng ngữ nghĩa bằng Sentence-Transformers (all-MiniLM-L6-v2) / TF-IDF & Cosine Similarity.
- AI-07: Tính điểm tổng hợp 5 trụ cột (Domain 30% + Skill 25% + Experience 25% + Education 10% + Semantic 10%).
- AI-08: Tự động sinh danh sách cảnh báo (Warnings) và nhận xét tự nhiên chuẩn xác cho HR.
- Cơ chế phát hiện trái ngành (Cross-domain Detection) triệt tiêu việc CV IT chấm cao cho Job Kế toán.
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
from app.services.cv_parser import (
    DOMAIN_KEYWORD_SETS,
    detect_domain,
    extract_education_major,
    extract_jd_min_experience,
    extract_skills,
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
            _transformer_model = SentenceTransformer("all-MiniLM-L6-v2")
        except Exception as exc:
            print(f"⚠️ Không thể khởi tạo mô hình SentenceTransformer: {exc}")
            _transformer_model = None
    return _transformer_model


# ============================================================================
# NHÓM NGÀNH NGHỀ LIÊN QUAN (DOMAIN CATEGORY CLUSTERS)
# ============================================================================
DOMAIN_CLUSTERS = {
    "TECH": {"IT & Phần mềm", "Phân tích & Dữ liệu", "Kỹ thuật & Sản xuất"},
    "BUSINESS": {"Kế toán & Tài chính", "Kinh doanh & Bán hàng", "Marketing", "Phân tích & Dữ liệu"},
    "MANAGEMENT_HR": {"Nhân sự (HR)", "Pháp lý & Luật", "Kinh doanh & Bán hàng"},
}

DOMAIN_MAJOR_MAPPING: dict[str, set[str]] = {
    "IT & Phần mềm": {"IT & Khoa học máy tính", "Kỹ thuật"},
    "Kế toán & Tài chính": {"Kế toán", "Tài chính & Ngân hàng", "Kinh tế"},
    "Kinh doanh & Bán hàng": {"Quản trị kinh doanh", "Kinh tế", "Marketing"},
    "Marketing": {"Marketing", "Quản trị kinh doanh", "Kinh tế"},
    "Nhân sự (HR)": {"Quản trị kinh doanh", "Luật", "Kinh tế"},
    "Pháp lý & Luật": {"Luật"},
    "Kỹ thuật & Sản xuất": {"Kỹ thuật", "IT & Khoa học máy tính"},
    "Phân tích & Dữ liệu": {"IT & Khoa học máy tính", "Kinh tế", "Tài chính & Ngân hàng"},
}


# ============================================================================
# 1. TRỤ CỘT 1: ĐÁNH GIÁ CHUYÊN MÔN LĨNH VỰC (DOMAIN RELEVANCE)
# ============================================================================
def calculate_domain_match(
    cv_domain: Optional[str],
    jd_domain: Optional[str],
    cv_text: str = "",
    jd_text: str = "",
) -> tuple[float, bool]:
    """
    Đánh giá mức độ phù hợp về lĩnh vực ngành nghề giữa CV và JD.

    Returns:
        tuple (domain_score [0.0 - 100.0], is_cross_domain [bool])
    """
    # Nếu chưa xác định domain, cố gắng phát hiện từ text
    if not cv_domain and cv_text:
        cv_domain = detect_domain(cv_text)
    if not jd_domain and jd_text:
        jd_domain = detect_domain(jd_text)

    # Trường hợp cả hai đều xác định được domain
    if cv_domain and jd_domain:
        if cv_domain == jd_domain:
            return 95.0, False

        # Kiểm tra xem có cùng nhóm ngành lớn hay không
        same_cluster = False
        for cluster_domains in DOMAIN_CLUSTERS.values():
            if cv_domain in cluster_domains and jd_domain in cluster_domains:
                same_cluster = True
                break

        if same_cluster:
            # Thuộc các ngành có liên đới (v.d. Kế toán & Kinh doanh)
            return 45.0, False

        # Hoàn toàn khác nhóm (v.d. IT vs Kế toán, hoặc IT vs Nhân sự)
        return 5.0, True

    # Trường hợp JD xác định được domain nhưng CV chưa rõ
    if jd_domain and not cv_domain:
        if cv_text and jd_domain in DOMAIN_KEYWORD_SETS:
            keywords = DOMAIN_KEYWORD_SETS[jd_domain]
            text_lower = cv_text.lower()
            hit_count = sum(1 for kw in keywords if kw.lower() in text_lower)
            if hit_count == 0:
                # CV dài nhưng không có bất kỳ từ khóa nào của ngành yêu cầu
                return 10.0, True
            score = min(80.0, 20.0 + (hit_count * 10.0))
            return score, False
        return 50.0, False

    # Trường hợp CV xác định được domain nhưng JD tổng quát
    if cv_domain and not jd_domain:
        return 60.0, False

    # Không xác định được cả hai
    return 50.0, False


# ============================================================================
# 2. TRỤ CỘT 2: SO KHỚP KỸ NĂNG (SKILL MATCHING)
# ============================================================================
def calculate_skill_match(
    cv_skills: list[str],
    jd_required_skills: list[str],
    is_cross_domain: bool = False,
) -> tuple[float, list[str], list[str]]:
    """
    So khớp tập hợp kỹ năng giữa CV và JD.

    Returns:
        tuple (skill_score [0.0 - 100.0], matched_skills, missing_skills)
    """
    if not jd_required_skills:
        if is_cross_domain:
            return 10.0, [], []
        if cv_skills:
            return 70.0, cv_skills, []
        return 50.0, [], []

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

    if not jd_keys:
        score = 10.0 if is_cross_domain else 50.0
    else:
        score = (len(matched_keys) / len(jd_keys)) * 100.0

    skill_score = round(max(0.0, min(100.0, score)), 2)
    return skill_score, sorted(matched_skills), sorted(missing_skills)


# ============================================================================
# 3. TRỤ CỘT 3: SO KHỚP KINH NGHIỆM (EXPERIENCE MATCHING)
# ============================================================================
def calculate_experience_match(
    cv_exp: Optional[int],
    jd_min_exp: Optional[int],
    is_cross_domain: bool = False,
) -> tuple[float, Optional[int], bool]:
    """
    Đánh giá mức độ đáp ứng số năm kinh nghiệm so với yêu cầu JD.

    Args:
        cv_exp: Số năm kinh nghiệm của ứng viên.
        jd_min_exp: Số năm kinh nghiệm tối thiểu yêu cầu trong JD.
        is_cross_domain: Cờ đánh dấu ứng viên làm trái ngành hoàn toàn.

    Returns:
        tuple (experience_score [0.0 - 100.0], experience_gap [int/None], experience_known [bool])
    """
    experience_known = cv_exp is not None
    actual_exp = cv_exp if (cv_exp is not None and cv_exp > 0) else 0
    req_exp = jd_min_exp if (jd_min_exp is not None and jd_min_exp > 0) else 0

    gap: Optional[int] = None
    if experience_known:
        gap = actual_exp - req_exp

    # Nếu làm trái ngành hoàn toàn: kinh nghiệm không được tính cho chuyên môn này
    if is_cross_domain:
        exp_score = 0.0 if req_exp > 0 else 10.0
        return exp_score, gap, experience_known

    # Nếu JD không yêu cầu kinh nghiệm (Fresher/Intern)
    if req_exp <= 0:
        return 100.0, gap, experience_known

    if actual_exp >= req_exp:
        return 100.0, gap, experience_known

    if actual_exp == 0:
        return 0.0, gap, experience_known

    # Ứng viên có kinh nghiệm cùng ngành nhưng chưa đủ năm so với yêu cầu tối thiểu
    # Đánh giá theo tỷ lệ với cận trên 60% do chưa vượt qua ngưỡng tối thiểu của JD
    score = (actual_exp / req_exp) * 60.0
    return round(max(0.0, min(100.0, score)), 2), gap, experience_known


# ============================================================================
# 4. TRỤ CỘT 4: ĐÁNH GIÁ HỌC VẤN & CHUYÊN NGÀNH (EDUCATION MATCHING)
# ============================================================================
def calculate_education_match(
    cv_major: Optional[str],
    jd_domain: Optional[str],
    jd_required_major: Optional[str],
) -> float:
    """
    Đánh giá độ tương thích của chuyên ngành học vấn với yêu cầu công việc.

    Returns:
        Điểm học vấn từ 0.0 đến 100.0.
    """
    if jd_required_major:
        if cv_major and cv_major.strip().lower() == jd_required_major.strip().lower():
            return 100.0
        if cv_major:
            return 20.0
        return 50.0

    if jd_domain and jd_domain in DOMAIN_MAJOR_MAPPING:
        compatible_majors = DOMAIN_MAJOR_MAPPING[jd_domain]
        if cv_major:
            if cv_major in compatible_majors:
                return 90.0
            # Ngành học đối lập hoàn toàn
            return 15.0
        return 60.0

    return 60.0


# ============================================================================
# 5. TRỤ CỘT 5: SO SÁNH TƯƠNG ĐỒNG NGỮ NGHĨA (SEMANTIC SIMILARITY)
# ============================================================================
def calculate_semantic_similarity(cv_text: str, jd_text: str) -> float:
    """
    Tính độ tương đồng Cosine ngữ nghĩa giữa văn bản CV và văn bản JD.
    """
    clean_cv = (cv_text or "").strip()
    clean_jd = (jd_text or "").strip()

    if not clean_cv or not clean_jd:
        return 50.0

    # 1. Sentence-Transformers & Cosine Similarity
    model = get_transformer_model()
    if model is not None and np is not None:
        try:
            embeddings = model.encode([clean_cv[:2000], clean_jd[:2000]])
            vec_a, vec_b = embeddings[0], embeddings[1]
            norm_a = np.linalg.norm(vec_a)
            norm_b = np.linalg.norm(vec_b)

            if norm_a > 0 and norm_b > 0:
                cosine_val = float(np.dot(vec_a, vec_b) / (norm_a * norm_b))
                score = cosine_val * 100.0
                return round(max(0.0, min(100.0, score)), 2)
        except Exception as exc:
            print(f"⚠️ Lỗi Sentence-Transformers inference: {exc}. Chuyển sang fallback.")

    # 2. TF-IDF Vectorizer + Scikit-Learn Cosine Similarity
    if TfidfVectorizer is not None and sklearn_cosine_similarity is not None:
        try:
            vectorizer = TfidfVectorizer(max_features=1000, stop_words="english")
            tfidf_mat = vectorizer.fit_transform([clean_cv, clean_jd])
            sim_val = float(sklearn_cosine_similarity(tfidf_mat[0:1], tfidf_mat[1:2])[0][0])
            score = sim_val * 100.0
            return round(max(0.0, min(100.0, score)), 2)
        except Exception as exc:
            print(f"⚠️ Lỗi TF-IDF fallback: {exc}")

    # 3. Token Jaccard Fallback thuần Python (Zero-Crash)
    words_cv = set(re.findall(r"\w+", clean_cv.lower()))
    words_jd = set(re.findall(r"\w+", clean_jd.lower()))
    if words_jd:
        jaccard = len(words_cv & words_jd) / len(words_cv | words_jd)
        score = min(100.0, jaccard * 250.0)
        return round(score, 2)

    return 50.0


# ============================================================================
# 6. SINH CẢNH BÁO (WARNINGS GENERATOR) — v2
# ============================================================================
def generate_warnings(
    is_cross_domain: bool,
    cv_domain: Optional[str],
    jd_domain: Optional[str],
    experience_gap: Optional[int],
    cv_exp: Optional[int],
    jd_min_exp: Optional[int],
    missing_skills: list[str],
    education_score: float,
    cv_major: Optional[str],
) -> list[str]:
    """
    Sinh danh sách cảnh báo rõ ràng cho HR về các điểm thiếu hụt hoặc sai lệch của ứng viên.
    """
    warnings: list[str] = []

    if is_cross_domain:
        warnings.append(
            f"Chuyên môn khác ngành: Ứng viên thuộc lĩnh vực '{cv_domain or 'Không xác định'}', "
            f"trong khi vị trí tuyển dụng yêu cầu chuyên môn '{jd_domain or 'Không xác định'}."
        )
        warnings.append(
            f"Kinh nghiệm làm việc ({cv_exp or 0} năm) không thuộc lĩnh vực '{jd_domain or 'yêu cầu'}' "
            f"nên không được tính điểm chuyên môn liên quan."
        )

    if experience_gap is not None and experience_gap < 0:
        req = jd_min_exp or 0
        warnings.append(
            f"Thiếu {abs(experience_gap)} năm kinh nghiệm so với yêu cầu tối thiểu của vị trí ({req} năm)."
        )
    elif cv_exp is None and (jd_min_exp or 0) > 0:
        warnings.append("Chưa xác định được số năm kinh nghiệm cụ thể từ CV.")

    if missing_skills and len(missing_skills) >= 2:
        top_missing = ", ".join(missing_skills[:3])
        warnings.append(f"Chưa thể hiện các kỹ năng quan trọng trong JD: {top_missing}.")

    if education_score < 30.0 and cv_major:
        warnings.append(f"Chuyên ngành học vấn ({cv_major}) không khớp với yêu cầu của vị trí.")

    return warnings


# ============================================================================
# 7. SINH NHẬN XÉT TỰ NHIÊN CHO HR (NATURAL SUMMARY GENERATOR) — v2
# ============================================================================
def generate_match_summary(
    job_title: str,
    final_score: float,
    domain_score: float,
    skill_score: float,
    exp_score: float,
    edu_score: float,
    matched_skills: list[str],
    missing_skills: list[str],
    cv_exp: Optional[int],
    jd_min_exp: Optional[int],
    experience_gap: Optional[int],
    cv_domain: Optional[str],
    jd_domain: Optional[str],
    cv_major: Optional[str],
    is_cross_domain: bool,
    warnings: list[str],
) -> str:
    """
    Sinh nhận xét phân tích toàn diện, chi tiết và có cấu trúc cho HR.
    """
    if final_score >= 85.0:
        level = "rất phù hợp xuất sắc"
        rec = "Khuyến nghị ưu tiên mời phỏng vấn."
    elif final_score >= 70.0:
        level = "phù hợp tốt"
        rec = "Khuyến nghị xếp vào danh sách xem xét phỏng vấn."
    elif final_score >= 50.0:
        level = "đáp ứng mức cơ bản"
        rec = "Cần phỏng vấn kỹ về các kỹ năng và kinh nghiệm còn thiếu."
    elif final_score >= 25.0:
        level = "độ phù hợp thấp, còn nhiều thiếu sót"
        rec = "Chưa đáp ứng tốt tiêu chí, cần cân nhắc kỹ trước khi liên hệ."
    else:
        level = "không phù hợp / lệch chuyên môn nghiêm trọng"
        rec = "Không khuyến nghị phỏng vấn do trái ngành hoặc thiếu điều kiện tiên quyết."

    sections: list[str] = []

    # 1. Đánh giá tổng quan
    sections.append(
        f"Ứng viên đạt {final_score:.1f}% điểm phù hợp ({level}) cho vị trí '{job_title}'."
    )

    # 2. Đánh giá chuyên môn ngành
    if is_cross_domain:
        sections.append(
            f"Về chuyên môn: Hồ sơ thuộc lĩnh vực '{cv_domain or 'Khác'}', "
            f"lệch hoàn toàn so với yêu cầu '{jd_domain or 'công việc'}' (Điểm chuyên môn: {domain_score:.0f}%)."
        )
    elif cv_domain and jd_domain:
        sections.append(
            f"Về chuyên môn: Phù hợp đúng ngành '{cv_domain}' (Điểm chuyên môn: {domain_score:.0f}%)."
        )

    # 3. Đánh giá kỹ năng
    if matched_skills:
        sample = ", ".join(matched_skills[:4])
        if len(matched_skills) > 4:
            sample += f" và {len(matched_skills) - 4} kỹ năng khác"
        sections.append(f"Kỹ năng đạt {skill_score:.0f}%, đáp ứng tốt: {sample}.")
    else:
        sections.append(f"Kỹ năng đạt {skill_score:.0f}%, chưa tìm thấy kỹ năng yêu cầu nào phù hợp.")

    if missing_skills:
        sample_missing = ", ".join(missing_skills[:3])
        sections.append(f"Cần lưu ý thiếu: {sample_missing}.")

    # 4. Đánh giá kinh nghiệm
    req_exp = jd_min_exp or 0
    actual_exp = cv_exp if (cv_exp is not None) else 0

    if req_exp > 0:
        if is_cross_domain:
            sections.append(
                f"Kinh nghiệm: Ứng viên có {actual_exp} năm làm việc nhưng là kinh nghiệm trái ngành, "
                f"không đáp ứng yêu cầu {req_exp} năm kinh nghiệm chuyên môn."
            )
        elif experience_gap is not None and experience_gap < 0:
            sections.append(
                f"Kinh nghiệm: Có {actual_exp} năm kinh nghiệm, còn thiếu {abs(experience_gap)} năm "
                f"so với yêu cầu tối thiểu ({req_exp} năm)."
            )
        elif experience_gap is not None and experience_gap >= 0:
            sections.append(
                f"Kinh nghiệm: Đạt {actual_exp} năm, đáp ứng tốt yêu cầu tối thiểu ({req_exp} năm)."
            )

    # 5. Đánh giá học vấn
    if cv_major:
        sections.append(f"Học vấn: Chuyên ngành '{cv_major}' (Điểm học vấn: {edu_score:.0f}%).")

    # 6. Cảnh báo và khuyến nghị HR
    if warnings:
        warn_text = " | ".join(warnings[:2])
        sections.append(f"Lưu ý cho HR: {warn_text}")

    sections.append(f"Đề xuất: {rec}")

    return " ".join(sections)


# ============================================================================
# 8. HÀM ĐIỀU PHỐI MATCHING TỔNG HỢP (ORCHESTRATOR) — v2
# ============================================================================
def match_cv_with_jd(request: MatchCVRequest) -> MatchCVResponse:
    """
    Thực thi toàn bộ pipeline so khớp Hybrid Scoring Engine v2:
    - Trụ cột 1: Domain Relevance (30%)
    - Trụ cột 2: Skill Match (25%)
    - Trụ cột 3: Experience Match (25%)
    - Trụ cột 4: Education Match (10%)
    - Trụ cột 5: Semantic Similarity (10%)
    """
    cv = request.cv_data
    jd = request.jd_data

    # Chuẩn bị văn bản đầy đủ
    jd_full_text = f"{jd.title}\n{jd.description or ''}\n{jd.requirements or ''}".strip()
    cv_full_text = cv.raw_text or ", ".join(cv.skills)

    # 1. Phát hiện lĩnh vực (Domain)
    cv_domain = cv.domain or detect_domain(cv_full_text)
    jd_domain = jd.jd_domain or detect_domain(jd_full_text)

    # Tính điểm Domain Relevance & kiểm tra trái ngành
    domain_score, is_cross_domain = calculate_domain_match(
        cv_domain=cv_domain,
        jd_domain=jd_domain,
        cv_text=cv_full_text,
        jd_text=jd_full_text,
    )

    # 2. Bóc tách và so khớp Kỹ năng (Skill Match)
    required_skills = jd.required_skills
    if not required_skills and jd_full_text:
        required_skills = extract_skills(jd_full_text)

    cv_skills = cv.skills
    if not cv_skills and cv_full_text:
        cv_skills = extract_skills(cv_full_text)

    skill_score, matched_skills, missing_skills = calculate_skill_match(
        cv_skills=cv_skills,
        jd_required_skills=required_skills,
        is_cross_domain=is_cross_domain,
    )

    # 3. Bóc tách và so khớp Kinh nghiệm (Experience Match)
    jd_min_exp = jd.min_experience_years
    if (jd_min_exp is None or jd_min_exp == 0) and jd_full_text:
        extracted_min_exp = extract_jd_min_experience(jd_full_text)
        if extracted_min_exp is not None:
            jd_min_exp = extracted_min_exp

    exp_score, exp_gap, exp_known = calculate_experience_match(
        cv_exp=cv.experience_years,
        jd_min_exp=jd_min_exp,
        is_cross_domain=is_cross_domain,
    )

    # 4. Bóc tách và so khớp Học vấn (Education Match)
    cv_major = cv.education_major or extract_education_major(cv_full_text)
    jd_req_major = jd.required_education_major or extract_education_major(jd_full_text)

    edu_score = calculate_education_match(
        cv_major=cv_major,
        jd_domain=jd_domain,
        jd_required_major=jd_req_major,
    )

    # 5. So sánh Tương đồng Ngữ nghĩa (Semantic Similarity)
    semantic_score = calculate_semantic_similarity(
        cv_text=cv_full_text,
        jd_text=jd_full_text,
    )

    # 6. Tính điểm tổng hợp (Hybrid Scoring Formula v2)
    # Trọng số chuẩn: 0.30 Domain + 0.25 Skill + 0.25 Experience + 0.10 Education + 0.10 Semantic
    w_domain = 0.30
    w_skill = 0.25
    w_exp = 0.25
    w_edu = 0.10
    w_sem = 0.10

    raw_score = (
        (w_domain * domain_score)
        + (w_skill * skill_score)
        + (w_exp * exp_score)
        + (w_edu * edu_score)
        + (w_sem * semantic_score)
    )

    # Giảm trừ điểm nếu chưa đáp ứng đủ số năm kinh nghiệm tối thiểu yêu cầu
    if exp_gap is not None and exp_gap < 0 and not is_cross_domain:
        shortfall_penalty = min(20.0, abs(exp_gap) * 8.0)
        raw_score = max(0.0, raw_score - shortfall_penalty)

    # Hard cap đối với hồ sơ trái ngành hoàn toàn: không bao giờ vượt quá 25%
    if is_cross_domain:
        raw_score = min(22.0, raw_score)

    final_score = round(max(0.0, min(100.0, raw_score)), 2)

    # 7. Sinh cảnh báo
    warnings = generate_warnings(
        is_cross_domain=is_cross_domain,
        cv_domain=cv_domain,
        jd_domain=jd_domain,
        experience_gap=exp_gap,
        cv_exp=cv.experience_years,
        jd_min_exp=jd_min_exp,
        missing_skills=missing_skills,
        education_score=edu_score,
        cv_major=cv_major,
    )

    # 8. Sinh tóm tắt phân tích tự nhiên
    summary = generate_match_summary(
        job_title=jd.title,
        final_score=final_score,
        domain_score=domain_score,
        skill_score=skill_score,
        exp_score=exp_score,
        edu_score=edu_score,
        matched_skills=matched_skills,
        missing_skills=missing_skills,
        cv_exp=cv.experience_years,
        jd_min_exp=jd_min_exp,
        experience_gap=exp_gap,
        cv_domain=cv_domain,
        jd_domain=jd_domain,
        cv_major=cv_major,
        is_cross_domain=is_cross_domain,
        warnings=warnings,
    )

    # 9. Đóng gói kết quả
    return MatchCVResponse(
        success=True,
        match_score=final_score,
        score_breakdown=ScoreBreakdown(
            skill_score=skill_score,
            experience_score=exp_score,
            semantic_score=semantic_score,
            domain_score=domain_score,
            education_score=edu_score,
        ),
        parsed_skills=cv_skills,
        matched_skills=matched_skills,
        missing_skills=missing_skills,
        experience_years=cv.experience_years,
        summary=summary,
        experience_gap=exp_gap,
        experience_known=exp_known,
        domain_detected=cv_domain,
        jd_domain_detected=jd_domain,
        warnings=warnings,
        education_major=cv_major,
    )
