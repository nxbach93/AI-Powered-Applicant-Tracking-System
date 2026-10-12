"""
Dịch vụ bóc tách thực thể và thông tin ứng viên từ văn bản CV thô (CV Parser).

Tuân thủ:
- Bóc tách thông tin liên hệ: Email, Số điện thoại (chuẩn hóa đầu số Việt Nam / Quốc tế).
- Bóc tách kỹ năng (Skills): Kết hợp từ điển kỹ năng chuẩn hóa công nghệ + Regex biên từ + spaCy NER / NLP.
- Bóc tách số năm kinh nghiệm (Experience Years): Nhận diện mẫu câu tiếng Việt & tiếng Anh hoặc tính từ mốc thời gian.
- Bóc tách trình độ học vấn (Education): Nhận diện các trường đại học, học viện và văn bằng tiêu biểu.
- Hoàn toàn an toàn, tự động kích hoạt chế độ dự phòng nếu thư viện spaCy hoặc model chưa sẵn sàng trong môi trường.
"""

from __future__ import annotations

import re
from typing import Any, Optional

# Cố gắng nạp spaCy nếu môi trường đã cài đặt
try:
    import spacy

    _nlp = None

    def get_nlp():
        """Lazy load mô hình spaCy en_core_web_sm."""
        global _nlp
        if _nlp is None:
            try:
                _nlp = spacy.load("en_core_web_sm")
            except Exception:
                _nlp = None
        return _nlp

except ImportError:
    def get_nlp():
        return None


# ============================================================================
# 1. TỪ ĐIỂN VÀ PATTERNS KỸ NĂNG CHUẨN HÓA (SKILL CANONICAL DICTIONARY)
# ============================================================================
SKILL_PATTERNS: dict[str, list[str]] = {
    # --- Ngôn ngữ lập trình (Programming Languages) ---
    "Python": [r"\bpython\b"],
    "Java": [r"\bjava\b(?!\s*script)"],
    "JavaScript": [r"\bjavascript\b", r"\bjs\b(?!\.)"],
    "TypeScript": [r"\btypescript\b", r"\bts\b(?!\.)"],
    "C++": [r"(?:\b|(?<=\s))c\+\+(?=\b|[.,;:!?\s\)]|$)"],
    "C#": [r"(?:\b|(?<=\s))c#(?=\b|[.,;:!?\s\)]|$)"],
    "C": [r"(?:\b|(?<=\s))c(?=\b|[.,;:!?\s\)]|$)"],
    "PHP": [r"\bphp\b"],
    "Go": [r"\bgolang\b", r"\bgo\s+language\b", r"\bgo\b(?=\s*(?:developer|backend|engineer))"],
    "Rust": [r"\brust\b"],
    "Swift": [r"\bswift\b"],
    "Kotlin": [r"\bkotlin\b"],
    "Dart": [r"\bdart\b"],
    "Ruby": [r"\bruby\b"],
    "HTML": [r"\bhtml5?\b"],
    "CSS": [r"\bcss3?\b", r"\bsass\b", r"\bscss\b"],
    "SQL": [r"\bsql\b"],

    # --- Frontend Frameworks & Libraries ---
    "React": [r"\breact(?:\.js|js)?\b"],
    "Next.js": [r"\bnext(?:\.js|js)?\b"],
    "Vue.js": [r"\bvue(?:\.js|js)?\b"],
    "Angular": [r"\bangular(?:\.js|js)?\b"],
    "Svelte": [r"\bsvelte\b"],
    "Tailwind CSS": [r"\btailwind(?:\s*css)?\b"],
    "Bootstrap": [r"\bbootstrap\b"],
    "Redux": [r"\bredux\b"],
    "Zustand": [r"\bzustand\b"],
    "jQuery": [r"\bjquery\b"],

    # --- Backend & APIs ---
    "Node.js": [r"\bnode(?:\.js|js)?\b"],
    "Express": [r"\bexpress(?:\.js|js)?\b"],
    "NestJS": [r"\bnest(?:\.js|js)?\b"],
    "FastAPI": [r"\bfastapi\b"],
    "Flask": [r"\bflask\b"],
    "Django": [r"\bdjango\b"],
    "Spring Boot": [r"\bspring\s*boot\b", r"\bspring\s*framework\b"],
    "ASP.NET": [r"\basp\.net\b", r"(?:\b|(?<=\s))\.net(?:\s*core)?(?=\b|[.,;:!?\s\)]|$)"],
    "Laravel": [r"\blaravel\b"],
    "GraphQL": [r"\bgraphql\b"],
    "RESTful API": [r"\brest(?:ful)?\s*api[s]?\b", r"\brest\s*api[s]?\b"],
    "gRPC": [r"\bgrpc\b"],
    "WebSocket": [r"\bwebsocket[s]?\b"],

    # --- Cơ sở dữ liệu & ORM (Databases & Storage) ---
    "MySQL": [r"\bmysql\b"],
    "PostgreSQL": [r"\bpostgres(?:ql)?\b"],
    "MongoDB": [r"\bmongodb\b", r"\bmongo\b"],
    "Redis": [r"\bredis\b"],
    "SQLite": [r"\bsqlite\b"],
    "SQL Server": [r"\bsql\s*server\b", r"\bmssql\b"],
    "Oracle": [r"\boracle(?:\s*database|\s*db)?\b"],
    "Elasticsearch": [r"\belasticsearch\b"],
    "Firebase": [r"\bfirebase\b"],
    "Prisma": [r"\bprisma\b"],

    # --- DevOps, Cloud & Hệ thống (DevOps & Infrastructure) ---
    "Docker": [r"\bdocker\b"],
    "Kubernetes": [r"\bkubernetes\b", r"\bk8s\b"],
    "AWS": [r"\baws\b", r"\bamazon\s*web\s*services\b"],
    "Azure": [r"\bazure\b"],
    "GCP": [r"\bgcp\b", r"\bgoogle\s*cloud(?:\s*platform)?\b"],
    "Git": [r"\bgit\b", r"\bgithub\b", r"\bgitlab\b"],
    "CI/CD": [r"\bci[/-]cd\b"],
    "Linux": [r"\blinux\b", r"\bubuntu\b"],
    "Nginx": [r"\bnginx\b"],

    # --- Trí tuệ nhân tạo & Khoa học dữ liệu (AI & Data Science) ---
    "Machine Learning": [r"\bmachine\s*learning\b", r"\bml\b(?=\s*(?:model|algorithm|engineer))"],
    "Deep Learning": [r"\bdeep\s*learning\b"],
    "NLP": [r"\bnlp\b", r"\bnatural\s*language\s*processing\b"],
    "Computer Vision": [r"\bcomputer\s*vision\b", r"\bcv\b(?=\s*(?:model|engineer))"],
    "TensorFlow": [r"\btensorflow\b"],
    "PyTorch": [r"\bpytorch\b"],
    "Scikit-Learn": [r"\bscikit[-_]learn\b", r"\bsklearn\b"],
    "Pandas": [r"\bpandas\b"],
    "NumPy": [r"\bnumpy\b"],
    "OpenCV": [r"\bopencv\b"],
    "spaCy": [r"\bspacy\b"],
    "Sentence-Transformers": [r"\bsentence[-_]transformers?\b"],

    # --- Quy trình, Phương pháp & Kỹ năng khác ---
    "Microservices": [r"\bmicroservices?\b"],
    "Unit Testing": [r"\bunit\s*test(?:ing)?\b"],
    "Jest": [r"\bjest\b"],
    "Agile": [r"\bagile\b"],
    "Scrum": [r"\bscrum\b"],
    "Jira": [r"\bjira\b"],
    "Figma": [r"\bfigma\b"],
}

# Tiền biên dịch (Pre-compile) các mẫu Regex kỹ năng để tối ưu hiệu năng
_COMPILED_SKILL_PATTERNS: list[tuple[str, list[re.Pattern[str]]]] = [
    (canonical_name, [re.compile(p, re.IGNORECASE) for p in patterns])
    for canonical_name, patterns in SKILL_PATTERNS.items()
]


# ============================================================================
# 2. CÁC HÀM TRÍCH XUẤT THÀNH PHẦN (EXTRACTORS)
# ============================================================================

def extract_email(text: str) -> Optional[str]:
    """
    Trích xuất địa chỉ email đầu tiên tìm thấy từ văn bản CV.

    Args:
        text: Chuỗi văn bản thô của CV.

    Returns:
        Địa chỉ email hợp lệ hoặc None nếu không tìm thấy.
    """
    if not text:
        return None

    email_regex = r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+"
    matches = re.findall(email_regex, text)
    if matches:
        # Chuẩn hóa loại bỏ các dấu chấm, phẩy hoặc ngoặc bám theo đuôi email
        clean_email = matches[0].rstrip(".,;:)")
        return clean_email.lower()
    return None


def extract_phone(text: str) -> Optional[str]:
    """
    Trích xuất số điện thoại (ưu tiên định dạng di động Việt Nam 10 chữ số).

    Hỗ trợ:
    - 0987654321, 0987.654.321, 0987 654 321, 098-765-4321
    - +84987654321, +84 987 654 321

    Args:
        text: Chuỗi văn bản thô của CV.

    Returns:
        Số điện thoại đã chuẩn hóa dạng chuỗi số hoặc None.
    """
    if not text:
        return None

    # Tìm các mẫu số điện thoại có tiền tố 0 hoặc +84 / 84
    phone_regex = r"(?:(?:\+?84)|0)(?:[.\-\s]?\d){9,10}\b"
    matches = re.finditer(phone_regex, text)

    for match in matches:
        raw_phone = match.group()
        # Giữ lại các chữ số và dấu +
        digits = re.sub(r"[^\d+]", "", raw_phone)

        # Chuẩn hóa về dạng 0xxxxxxxxx
        if digits.startswith("+84") and len(digits) == 12:
            return "0" + digits[3:]
        elif digits.startswith("84") and len(digits) == 11:
            return "0" + digits[2:]
        elif digits.startswith("0") and len(digits) == 10:
            return digits

    return None


def extract_skills(text: str) -> list[str]:
    """
    Trích xuất danh sách kỹ năng chuyên môn từ văn bản CV.

    Kết hợp đối soát với từ điển chuẩn hóa:
    - Nhận diện các biến thể cách viết (vd: 'reactjs', 'React.js' -> 'React').
    - Loại bỏ trùng lặp và giữ nguyên tên chuẩn.

    Args:
        text: Chuỗi văn bản thô của CV.

    Returns:
        Danh sách kỹ năng chuẩn hóa (vd: ['React', 'TypeScript', 'Node.js', 'SQL']).
    """
    if not text:
        return []

    found_skills: set[str] = set()

    for canonical_name, regex_list in _COMPILED_SKILL_PATTERNS:
        for regex in regex_list:
            if regex.search(text):
                found_skills.add(canonical_name)
                break

    # Trả về danh sách đã được sắp xếp để đảm bảo tính nhất quán (deterministic)
    return sorted(found_skills)


def extract_experience_years(text: str) -> Optional[int]:
    """
    Ước tính số năm kinh nghiệm làm việc từ văn bản CV.

    Nhận diện:
    - '3 năm kinh nghiệm', '3+ years of experience', '2 năm làm việc'
    - 'Experience: 4 years', 'Kinh nghiệm: 5 năm'
    - Phân tích khoảng năm làm việc (vd: 2019 - 2023)

    Args:
        text: Chuỗi văn bản thô của CV.

    Returns:
        Số năm kinh nghiệm (số nguyên) hoặc None nếu không xác định được.
    """
    if not text:
        return None

    # Mẫu 1: Nhận diện biểu thức trực tiếp: "X năm kinh nghiệm" hoặc "X years of experience"
    direct_patterns = [
        r"(\d+(?:\.\d+)?)\+?\s*(?:năm|year[s]?)\s*(?:kinh nghiệm|kinh nghiệm làm việc|of experience|experience|exp)",
        r"(?:kinh nghiệm|experience)\s*[:\-]?\s*(\d+(?:\.\d+)?)\+?\s*(?:năm|year[s]?)",
        r"(\d+)\+?\s*years?\s*in\s*(?:software|development|programming|it|web)",
    ]

    for pattern in direct_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            try:
                years = float(match.group(1))
                if 0 <= years <= 40:
                    return int(round(years))
            except (ValueError, TypeError):
                continue

    # Mẫu 2: Phân tích các khoảng thời gian năm làm việc (vd: 2020 - 2024, 2019 - Present)
    # Lấy năm hiện tại
    import datetime
    current_year = datetime.datetime.now().year

    date_range_regex = r"\b(20[0-2][0-9]|199[0-9])\s*[-–—tođến]+\s*(20[0-2][0-9]|present|hiện tại|now)\b"
    ranges = re.findall(date_range_regex, text, re.IGNORECASE)

    total_span_years = 0
    if ranges:
        for start_str, end_str in ranges:
            try:
                start_yr = int(start_str)
                end_lower = end_str.lower()
                if any(kw in end_lower for kw in ["present", "hiện tại", "now"]):
                    end_yr = current_year
                else:
                    end_yr = int(end_str)

                if end_yr >= start_yr and (end_yr - start_yr) <= 20:
                    total_span_years = max(total_span_years, end_yr - start_yr)
            except (ValueError, TypeError):
                continue

        if 0 < total_span_years <= 40:
            return total_span_years

    return None


def extract_education(text: str) -> Optional[str]:
    """
    Trích xuất tên trường đại học / học viện hoặc bằng cấp cao nhất từ CV.

    Args:
        text: Chuỗi văn bản thô của CV.

    Returns:
        Chuỗi tên trường / học vấn trích xuất được hoặc None.
    """
    if not text:
        return None

    # 1. Danh sách các trường tiêu biểu thường gặp trong CV CNTT tại Việt Nam
    prominent_schools = [
        "Đại học Bách Khoa Hà Nội",
        "Đại học Bách Khoa TP.HCM",
        "Đại học Bách Khoa",
        "Đại học Quốc Gia Hà Nội",
        "Đại học Quốc Gia TP.HCM",
        "Đại học Công nghệ - ĐHQGHN",
        "Đại học Công nghệ",
        "Học viện Công nghệ Bưu chính Viễn thông",
        "Học viện Bưu chính Viễn thông",
        "Đại học Công nghiệp Hà Nội",
        "Đại học Công nghiệp",
        "Đại học FPT",
        "Đại học Sư phạm Kỹ thuật TP.HCM",
        "Đại học Sư phạm Kỹ thuật",
        "Đại học Khoa học Tự nhiên",
        "Đại học Kinh tế Quốc dân",
        "Đại học Ngoại thương",
        "Đại học Công nghệ Giao thông Vận tải",
        "Đại học Giao thông Vận tải",
        "Đại học Xây dựng",
        "Đại học Thủy lợi",
        "Đại học Điện lực",
        "Đại học Thăng Long",
        "Đại học Mở Hà Nội",
        "Đại học Tôn Đức Thắng",
        "Hanoi University of Science and Technology",
        "Vietnam National University",
        "Posts and Telecommunications Institute of Technology",
    ]

    for school in prominent_schools:
        if re.search(r"\b" + re.escape(school) + r"\b", text, re.IGNORECASE):
            return school

    # 2. Nhận diện theo mẫu từ khóa trường đại học / học viện tổng quát
    edu_patterns = [
        r"(?:Đại học|Học viện|Cao đẳng|Trường Đại học)\s+[A-ZÀ-Ỹa-zà-ỹ0-9\s]+?(?=\n|\r|,|\.|\-|\(|\;|$)",
        r"(?:Bachelor|Master|Engineer|Degree)\s+(?:of|in)\s+[A-Za-z\s]+?(?=\n|\r|,|\.|\-|\(|\;|$)",
        r"[A-Za-z\s]+(?:University|Institute|College)(?=\n|\r|,|\.|\-|\(|\;|$)",
    ]

    for pattern in edu_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            found = match.group().strip()
            # Loại bỏ chuỗi quá ngắn hoặc quá dài bất thường
            if 10 <= len(found) <= 80:
                return found

    return None


# ============================================================================
# 3. HÀM ĐIỀU PHỐI BÓC TÁCH TỔNG HỢP (ORCHESTRATOR)
# ============================================================================

def parse_cv_text(text: str) -> dict[str, Any]:
    """
    Điều phối phân tích toàn bộ văn bản CV và bóc tách các thực thể cần thiết.

    Args:
        text: Văn bản thô đã trích xuất từ file CV (PDF / DOCX).

    Returns:
        Dict chứa đầy đủ thông tin:
        - contact_info: {'email': ..., 'phone': ...}
        - parsed_skills: [...]
        - experience_years: int hoặc None
        - education: str hoặc None
    """
    email = extract_email(text)
    phone = extract_phone(text)
    skills = extract_skills(text)
    exp_years = extract_experience_years(text)
    education = extract_education(text)

    # Có thể sử dụng spaCy để trích xuất thêm các thực thể bổ trợ nếu có model
    nlp = get_nlp()
    if nlp and text:
        try:
            # Chỉ xử lý 2000 ký tự đầu cho NER nhằm tối ưu thời gian phản hồi
            sample_text = text[:2000]
            doc = nlp(sample_text)

            # Nếu chưa tìm thấy education bằng Regex, tìm thực thể ORG qua spaCy
            if not education:
                for ent in doc.ents:
                    if ent.label_ == "ORG" and any(
                        w in ent.text.lower() for w in ["university", "college", "institute", "đại học", "học viện"]
                    ):
                        education = ent.text.strip()
                        break
        except Exception:
            pass

    return {
        "contact_info": {
            "email": email,
            "phone": phone,
        },
        "parsed_skills": skills,
        "experience_years": exp_years,
        "education": education,
    }
