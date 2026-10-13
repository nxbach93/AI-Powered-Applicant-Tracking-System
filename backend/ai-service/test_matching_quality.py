"""
Script kiểm thử chất lượng thuật toán AI Screening (CV - Job Matching Engine v2).
Kiểm tra trực tiếp các kịch bản thực tế đã nêu trong báo cáo phân tích:
1. TEST 01: JD Kế toán 3 năm vs CV Web Developer 2 năm (Trái ngành -> Điểm thấp <= 22%, Cảnh báo rõ ràng)
2. TEST 02: JD Kế toán 3 năm vs CV Kế toán 2 năm (Đúng ngành, thiếu 1 năm -> Điểm ~55-68%, cảnh báo thiếu 1 năm)
3. TEST 03: JD Kế toán 3 năm vs CV Kế toán 5 năm (Đúng ngành, thừa năm -> Điểm ~80-92%, đạt xuất sắc)
4. TEST 04: JD Frontend 3 năm vs CV Frontend 3 năm (Cùng ngành IT -> Điểm cao >= 85%)
"""

import sys
import os

# Thêm đường dẫn gốc của ai-service vào sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

from app.schemas.cv_schema import CVDataInput, JDDataInput, MatchCVRequest
from app.services.matching_engine import match_cv_with_jd


def test_scenario_1_cross_domain():
    print("\n" + "=" * 70)
    print("▶️ TEST 01: JD Kế toán 3 năm VS CV Web Developer 2 năm (Trái ngành)")
    print("=" * 70)
    
    cv_data = CVDataInput(
        raw_text="""
        Nguyễn Văn B - Lập trình viên Web
        Học vấn: Đại học Bách Khoa Hà Nội, chuyên ngành Công nghệ thông tin
        Kinh nghiệm: 2 năm kinh nghiệm lập trình Frontend với React, TypeScript, HTML, CSS.
        Xây dựng giao diện website thương mại điện tử, tối ưu responsive.
        Kỹ năng: React, TypeScript, JavaScript, CSS, HTML, Git, Docker, Node.js
        """,
        skills=["React", "TypeScript", "JavaScript", "Docker", "Node.js", "Git"],
        experience_years=2,
        education_major="IT & Khoa học máy tính",
    )
    
    jd_data = JDDataInput(
        title="Nhân viên Kế toán tổng hợp",
        description="""
        Tuyển dụng Kế toán tổng hợp phụ trách lập báo cáo tài chính, quyết toán thuế,
        quản lý sổ sách kế toán, theo dõi dòng tiền doanh nghiệp.
        """,
        requirements="""
        - Tốt nghiệp Đại học chuyên ngành Kế toán, Kiểm toán, Tài chính.
        - Tối thiểu 3 năm kinh nghiệm làm việc ở vị trí tương đương.
        - Thành thạo phần mềm MISA, Excel, nắm vững quy định kế toán thuế.
        """,
        required_skills=["Kế toán tổng hợp", "Kế toán thuế", "Báo cáo tài chính", "MISA", "Excel"],
        min_experience_years=3,
        required_education_major="Kế toán",
        jd_domain="Kế toán & Tài chính",
    )
    
    res = match_cv_with_jd(MatchCVRequest(cv_data=cv_data, jd_data=jd_data))
    
    print(f"  Match Score: {res.match_score:.1f}%")
    print(f"  Domain Score: {res.score_breakdown.domain_score:.1f}%")
    print(f"  Skill Score: {res.score_breakdown.skill_score:.1f}%")
    print(f"  Experience Score: {res.score_breakdown.experience_score:.1f}%")
    print(f"  Education Score: {res.score_breakdown.education_score:.1f}%")
    print(f"  Semantic Score: {res.score_breakdown.semantic_score:.1f}%")
    print(f"  Domain Detected: CV={res.domain_detected} | JD={res.jd_domain_detected}")
    print(f"  Experience Gap: {res.experience_gap}")
    print(f"  Warnings: {res.warnings}")
    print(f"  Summary: {res.summary}")
    
    assert res.match_score <= 25.0, f"Expected match_score <= 25.0, got {res.match_score}"
    assert len(res.warnings) > 0, "Expected warnings for cross-domain"
    print("  ✅ PASS: Điểm thấp chính xác, phát hiện trái ngành và có cảnh báo!")


def test_scenario_2_matching_domain_under_experience():
    print("\n" + "=" * 70)
    print("▶️ TEST 02: JD Kế toán 3 năm VS CV Kế toán 2 năm (Cùng ngành, thiếu 1 năm)")
    print("=" * 70)
    
    cv_data = CVDataInput(
        raw_text="""
        Trần Thị Mai - Kế toán viên
        Học vấn: Đại học Kinh tế Quốc dân, Khoa Kế toán
        Kinh nghiệm: 2 năm làm kế toán tại Công ty ABC.
        Nhiệm vụ: Lập báo cáo tài chính hàng tháng, thực hiện kê khai thuế GTGT,
        sử dụng phần mềm kế toán MISA và bảng tính Excel.
        Kỹ năng: Kế toán tổng hợp, Kế toán thuế, Báo cáo tài chính, MISA, Excel
        """,
        skills=["Kế toán tổng hợp", "Kế toán thuế", "Báo cáo tài chính", "MISA", "Excel"],
        experience_years=2,
        education_major="Kế toán",
    )
    
    jd_data = JDDataInput(
        title="Nhân viên Kế toán tổng hợp",
        description="""
        Tuyển dụng Kế toán tổng hợp phụ trách lập báo cáo tài chính, quyết toán thuế,
        quản lý sổ sách kế toán.
        """,
        requirements="""
        - Tốt nghiệp Đại học chuyên ngành Kế toán, Kiểm toán, Tài chính.
        - Tối thiểu 3 năm kinh nghiệm làm việc ở vị trí tương đương.
        - Thành thạo phần mềm MISA, Excel, nắm vững quy định kế toán thuế.
        """,
        required_skills=["Kế toán tổng hợp", "Kế toán thuế", "Báo cáo tài chính", "MISA", "Excel"],
        min_experience_years=3,
        required_education_major="Kế toán",
        jd_domain="Kế toán & Tài chính",
    )
    
    res = match_cv_with_jd(MatchCVRequest(cv_data=cv_data, jd_data=jd_data))
    
    print(f"  Match Score: {res.match_score:.1f}%")
    print(f"  Domain Score: {res.score_breakdown.domain_score:.1f}%")
    print(f"  Skill Score: {res.score_breakdown.skill_score:.1f}%")
    print(f"  Experience Score: {res.score_breakdown.experience_score:.1f}%")
    print(f"  Education Score: {res.score_breakdown.education_score:.1f}%")
    print(f"  Experience Gap: {res.experience_gap}")
    print(f"  Warnings: {res.warnings}")
    print(f"  Summary: {res.summary}")
    
    assert 50.0 <= res.match_score <= 80.0, f"Expected 50-80%, got {res.match_score}"
    assert res.experience_gap == -1, f"Expected gap -1, got {res.experience_gap}"
    assert any("Thiếu 1 năm kinh nghiệm" in w for w in res.warnings), "Expected warning about 1 year gap"
    print("  ✅ PASS: Điểm hợp lý, cảnh báo thiếu 1 năm kinh nghiệm chính xác!")


def test_scenario_3_matching_domain_qualified():
    print("\n" + "=" * 70)
    print("▶️ TEST 03: JD Kế toán 3 năm VS CV Kế toán 5 năm (Cùng ngành, thừa năm KN)")
    print("=" * 70)
    
    cv_data = CVDataInput(
        raw_text="""
        Lê Hoàng Long - Kế toán trưởng
        Học vấn: Đại học Kinh tế Quốc dân, Chuyên ngành Kế toán - Kiểm toán
        Kinh nghiệm: 5 năm kinh nghiệm làm kế toán tổng hợp và phân tích tài chính.
        Thành thạo lập báo cáo tài chính, quản lý ngân sách, kiểm toán nội bộ,
        kê khai và quyết toán thuế với chi cục thuế. Sử dụng thành thạo MISA, SAP, Excel nâng cao.
        Kỹ năng: Kế toán tổng hợp, Kế toán thuế, Báo cáo tài chính, Kiểm toán, MISA, SAP, Excel
        """,
        skills=["Kế toán tổng hợp", "Kế toán thuế", "Báo cáo tài chính", "Kiểm toán", "MISA", "SAP", "Excel"],
        experience_years=5,
        education_major="Kế toán",
    )
    
    jd_data = JDDataInput(
        title="Nhân viên Kế toán tổng hợp",
        description="Tuyển dụng Kế toán tổng hợp phụ trách lập báo cáo tài chính, quyết toán thuế.",
        requirements="Tối thiểu 3 năm kinh nghiệm kế toán, thành thạo MISA, Excel, báo cáo tài chính.",
        required_skills=["Kế toán tổng hợp", "Kế toán thuế", "Báo cáo tài chính", "MISA", "Excel"],
        min_experience_years=3,
        required_education_major="Kế toán",
        jd_domain="Kế toán & Tài chính",
    )
    
    res = match_cv_with_jd(MatchCVRequest(cv_data=cv_data, jd_data=jd_data))
    
    print(f"  Match Score: {res.match_score:.1f}%")
    print(f"  Domain Score: {res.score_breakdown.domain_score:.1f}%")
    print(f"  Skill Score: {res.score_breakdown.skill_score:.1f}%")
    print(f"  Experience Score: {res.score_breakdown.experience_score:.1f}%")
    print(f"  Education Score: {res.score_breakdown.education_score:.1f}%")
    print(f"  Experience Gap: {res.experience_gap}")
    print(f"  Warnings: {res.warnings}")
    
    assert res.match_score >= 80.0, f"Expected >= 80%, got {res.match_score}"
    assert res.experience_gap == 2, f"Expected gap +2, got {res.experience_gap}"
    assert len(res.warnings) == 0, f"Expected 0 warnings, got {res.warnings}"
    print("  ✅ PASS: Điểm xuất sắc >= 80%, kinh nghiệm vượt yêu cầu (+2 năm), 0 cảnh báo!")


def test_scenario_4_it_job_it_cv():
    print("\n" + "=" * 70)
    print("▶️ TEST 04: JD Frontend 3 năm VS CV Frontend 3 năm (Chuẩn ngành IT)")
    print("=" * 70)
    
    cv_data = CVDataInput(
        raw_text="""
        Nguyễn Văn An - Senior Frontend Developer
        Đại học Bách Khoa Hà Nội - Công nghệ thông tin
        3 năm kinh nghiệm phát triển hệ thống Web với React, TypeScript, Next.js.
        Kỹ năng: React, Next.js, TypeScript, Docker, SQL, Tailwind CSS
        """,
        skills=["React", "Next.js", "TypeScript", "Docker", "SQL", "Tailwind CSS"],
        experience_years=3,
        education_major="IT & Khoa học máy tính",
    )
    
    jd_data = JDDataInput(
        title="Senior Frontend Developer (React/Next.js)",
        description="Tuyển dụng lập trình viên Frontend phát triển website nội bộ.",
        requirements="Tối thiểu 3 năm kinh nghiệm với React, Next.js, TypeScript.",
        required_skills=["React", "Next.js", "TypeScript", "Docker"],
        min_experience_years=3,
        required_education_major="IT & Khoa học máy tính",
        jd_domain="IT & Phần mềm",
    )
    
    res = match_cv_with_jd(MatchCVRequest(cv_data=cv_data, jd_data=jd_data))
    
    print(f"  Match Score: {res.match_score:.1f}%")
    print(f"  Domain Score: {res.score_breakdown.domain_score:.1f}%")
    print(f"  Skill Score: {res.score_breakdown.skill_score:.1f}%")
    print(f"  Experience Score: {res.score_breakdown.experience_score:.1f}%")
    print(f"  Education Score: {res.score_breakdown.education_score:.1f}%")
    
    assert res.match_score >= 85.0, f"Expected >= 85%, got {res.match_score}"
    print("  ✅ PASS: Ứng viên IT đúng chuyên môn đạt điểm xuất sắc >= 85%!")


if __name__ == "__main__":
    test_scenario_1_cross_domain()
    test_scenario_2_matching_domain_under_experience()
    test_scenario_3_matching_domain_qualified()
    test_scenario_4_it_job_it_cv()
    print("\n" + "=" * 70)
    print("🎉 TẤT CẢ 4 KỊCH BẢN KIỂM THỬ ĐÃ PASS HOÀN TOÀN!")
    print("=" * 70)
