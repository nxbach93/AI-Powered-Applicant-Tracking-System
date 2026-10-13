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

    # --- Kế toán & Tài chính ---
    "Excel": [r"\bexcel\b"],
    "QuickBooks": [r"\bquickbooks?\b"],
    "SAP": [r"\bsap\b"],
    "MISA": [r"\bmisa\b"],
    "FAST Accounting": [r"\bfast\s*accounting\b", r"\bphần mềm fast\b"],
    "Power BI": [r"\bpower\s*bi\b"],
    "Tableau": [r"\btableau\b"],
    "Kế toán tổng hợp": [r"\bkế\s*toán\s*tổng\s*hợp\b"],
    "Kế toán thuế": [r"\bkế\s*toán\s*thuế\b", r"\bthuế\s*(?:gtgt|tndn|tncn)\b"],
    "Kiểm toán": [r"\bkiểm\s*toán\b", r"\baudit(?:ing)?\b"],
    "Báo cáo tài chính": [r"\bbáo\s*cáo\s*tài\s*chính\b", r"\bfinancial\s*(?:statement|report)\b"],
    "Phân tích tài chính": [r"\bphân\s*tích\s*tài\s*chính\b", r"\bfinancial\s*anal(?:ysis|yst)\b"],
    "Quản lý ngân sách": [r"\bngân\s*sách\b", r"\bbudget(?:ing)?\b"],

    # --- Marketing & Digital ---
    "Google Ads": [r"\bgoogle\s*ads?\b"],
    "Facebook Ads": [r"\bfacebook\s*ads?\b", r"\bmeta\s*ads?\b"],
    "SEO": [r"\bseo\b"],
    "SEM": [r"\bsem\b"],
    "Content Marketing": [r"\bcontent\s*marketing\b"],
    "Email Marketing": [r"\bemail\s*marketing\b"],
    "Social Media Marketing": [r"\bsocial\s*media\s*marketing\b", r"\bquản\s*lý\s*mạng\s*xã\s*hội\b"],

    # --- Nhân sự (HR) ---
    "Tuyển dụng": [r"\btuyển\s*dụng\b", r"\brecruitment\b", r"\brecruiting\b"],
    "C&B": [r"\bc\s*&\s*b\b", r"\bcompensation\s*(?:and|&)\s*benefit\b"],
    "Đào tạo nhân viên": [r"\bđào\s*tạo\s*nhân\s*viên\b", r"\btraining\s*(?:and|&)\s*development\b"],
    "HRIS": [r"\bhris\b", r"\bhr\s*information\s*system\b"],

    # --- Kinh doanh & Bán hàng ---
    "CRM": [r"\bcrm\b"],
    "Salesforce": [r"\bsalesforce\b"],
    "Bán hàng": [r"\bbán\s*hàng\b", r"\bsales(?:man|person|force)?\b"],

    # --- Dữ liệu & Phân tích ---
    "Data Analysis": [r"\bdata\s*anal(?:ysis|yst)\b", r"\bphân\s*tích\s*dữ\s*liệu\b"],
    "Business Intelligence": [r"\bbusiness\s*intelligence\b"],
    "Statistics": [r"\bstatistics\b", r"\bthống\s*kê\b"],
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
# 4. HỆ THỐNG PHÁT HIỆN DOMAIN (DOMAIN DETECTION SYSTEM) — v2
# ============================================================================

DOMAIN_KEYWORD_SETS: dict[str, list[str]] = {
    "IT & Phần mềm": [
        "lập trình", "developer", "phần mềm", "software", "frontend", "backend",
        "code", "react", "python", "java", "javascript", "typescript", "nodejs",
        "api", "database", "web", "mobile", "devops", "docker", "cloud", "git",
        "framework", "microservice", "server", "application", "website", "ứng dụng",
    ],
    "Kế toán & Tài chính": [
        "kế toán", "accounting", "kiểm toán", "audit", "tài chính", "finance",
        "thuế", "tax", "sổ sách", "báo cáo tài chính", "financial", "misa",
        "ngân sách", "budget", "dòng tiền", "cash flow", "profit", "lợi nhuận",
        "chi phí", "bookkeeping", "invoice", "hóa đơn", "chứng từ", "kế khai",
    ],
    "Kinh doanh & Bán hàng": [
        "kinh doanh", "bán hàng", "sales", "doanh thu", "revenue", "khách hàng",
        "customer", "thị trường", "market", "đối tác", "hợp đồng thương mại",
        "business development", "account management", "b2b", "b2c",
    ],
    "Marketing": [
        "marketing", "seo", "sem", "quảng cáo", "advertising", "digital marketing",
        "content marketing", "branding", "brand", "campaign", "social media",
        "facebook ads", "google ads", "email marketing", "truyền thông",
    ],
    "Nhân sự (HR)": [
        "tuyển dụng", "nhân sự", "human resource", "recruitment", "lao động",
        "c&b", "compensation", "benefit", "đào tạo nhân viên", "labor",
        "performance management", "onboarding", "hợp đồng lao động",
    ],
    "Pháp lý & Luật": [
        "pháp lý", "legal", "luật", "law", "hợp đồng pháp lý", "contract",
        "quy định", "regulation", "tư vấn pháp luật", "compliance", "court",
    ],
    "Kỹ thuật & Sản xuất": [
        "kỹ thuật", "engineering", "sản xuất", "manufacturing", "cơ khí",
        "mechanical", "điện", "electrical", "tự động hóa", "automation",
        "quality control", "chất lượng", "iso", "production",
    ],
    "Phân tích & Dữ liệu": [
        "data analyst", "data science", "machine learning", "phân tích dữ liệu",
        "business intelligence", "tableau", "power bi", "statistics", "thống kê",
        "predictive analytics", "data mining", "visualization",
    ],
}


def detect_domain(text: str) -> Optional[str]:
    """
    Phát hiện lĩnh vực chuyên môn của văn bản (CV hoặc JD).

    Args:
        text: Văn bản CV hoặc JD cần phân tích.

    Returns:
        Tên domain phát hiện được hoặc None.
    """
    if not text or len(text.strip()) < 10:
        return None

    text_lower = text.lower()
    scores: dict[str, float] = {}

    for domain_name, keywords in DOMAIN_KEYWORD_SETS.items():
        hit_count = sum(1 for kw in keywords if kw.lower() in text_lower)
        if hit_count > 0:
            # Normalize: hit_count / len(keywords) to avoid bias from larger lists
            scores[domain_name] = hit_count / len(keywords)

    if not scores:
        return None

    best_domain = max(scores, key=lambda k: scores[k])
    best_score = scores[best_domain]

    # Return domain if at least 1 keyword hit for short text or >= 2 for longer text
    min_hits = best_score * len(DOMAIN_KEYWORD_SETS[best_domain])
    if min_hits >= 1 or best_score >= 0.04:
        return best_domain

    return None


def extract_jd_min_experience(jd_text: str) -> Optional[int]:
    """
    Trích xuất số năm kinh nghiệm tối thiểu từ văn bản Job Description.

    Args:
        jd_text: Văn bản JD (title + description + requirements).

    Returns:
        Số năm tối thiểu (int) hoặc None nếu không tìm thấy.
    """
    if not jd_text:
        return None

    # Pattern: "tối thiểu/ít nhất/minimum/at least X năm/year"
    priority_patterns = [
        r"(?:tối thiểu|it nhất|minimum|at least)\s*(\d+)\+?\s*(?:năm|year[s]?)",
        r"(\d+)\+?\s*(?:năm|year[s]?)\s*(?:kinh nghiệm|experience)\s*(?:thực tế|liên quan|relevant)?",
        r"(?:kinh nghiệm|experience)\s*[:\-]?\s*(\d+)\+?\s*(?:năm|year[s]?)",
    ]

    for pattern in priority_patterns:
        match = re.search(pattern, jd_text, re.IGNORECASE)
        if match:
            try:
                years = int(match.group(1))
                if 0 <= years <= 20:
                    return years
            except (ValueError, IndexError):
                continue

    # Pattern: range "X-Y năm" → return minimum
    range_match = re.search(
        r"(\d+)\s*[-–—]\s*(\d+)\s*(?:năm|year[s]?)\s*kinh nghiệm",
        jd_text, re.IGNORECASE
    )
    if range_match:
        try:
            return int(range_match.group(1))
        except (ValueError, IndexError):
            pass

    # Fallback to general extractor
    return extract_experience_years(jd_text)


# ============================================================================
# 5. TRÌCH XUẤT CHUYÊN NGÀNH HỌC VẤN (EDUCATION MAJOR EXTRACTOR) — v2
# ============================================================================
EDUCATION_MAJOR_PATTERNS: dict[str, list[str]] = {
    "IT & Khoa học máy tính": [
        r"công nghệ thông tin",
        r"computer science",
        r"software engineering",
        r"kỹ thuật phần mềm",
        r"khoa học máy tính",
        r"information technology",
        r"hệ thống thông tin",
        r"information system",
        r"cntt",
    ],
    "Kế toán": [
        r"kế toán",
        r"(?<!kiểm )accounting",
        r"kế toán kiểm toán",
    ],
    "Tài chính & Ngân hàng": [
        r"tài chính",
        r"ngân hàng",
        r"banking",
        r"finance",
        r"tài chính ngân hàng",
        r"financial management",
    ],
    "Quản trị kinh doanh": [
        r"quản trị kinh doanh",
        r"business administration",
        r"\bmba\b",
        r"quản lý kinh doanh",
    ],
    "Marketing": [
        r"marketing",
        r"truyền thông",
        r"quảng cáo",
    ],
    "Luật": [
        r"\bluật\b",
        r"\blaw\b",
        r"pháp luật",
        r"khoa luật",
    ],
    "Kỹ thuật": [
        r"kỹ thuật(?!\s*phần mềm)",
        r"engineering",
        r"cơ khí",
        r"điện tử",
        r"xây dựng",
        r"civil engineering",
    ],
    "Kinh tế": [
        r"kinh tế(?! quốc)",
        r"economics",
        r"thương mại",
        r"commerce",
    ],
}

_COMPILED_MAJOR_PATTERNS: dict[str, list[re.Pattern[str]]] = {
    major: [re.compile(p, re.IGNORECASE) for p in patterns]
    for major, patterns in EDUCATION_MAJOR_PATTERNS.items()
}


def extract_education_major(text: str) -> Optional[str]:
    """
    Trích xuất chuyên ngành học vấn từ văn bản CV.
    Tìm kiếm trong ngữ cảnh của phần học vấn trước, sau đó mới tìm toàn văn bản.

    Args:
        text: Văn bản thô của CV.

    Returns:
        Tên chuyên ngành (str) hoặc None.
    """
    if not text:
        return None

    # Focus on education section first
    edu_match = re.search(
        r"(?:học vấn|giáo dục|education|trình độ|degree|bằng cấp|chuyên ngành)(.{0,600})",
        text,
        re.IGNORECASE | re.DOTALL,
    )
    search_text = edu_match.group(1) if edu_match else text

    for major_name, compiled_patterns in _COMPILED_MAJOR_PATTERNS.items():
        for pattern in compiled_patterns:
            if pattern.search(search_text):
                return major_name

    # If not found in education section, search full text (lower confidence)
    if edu_match:
        for major_name, compiled_patterns in _COMPILED_MAJOR_PATTERNS.items():
            for pattern in compiled_patterns:
                if pattern.search(text):
                    return major_name

    return None


# ============================================================================
# 6. HÀM ĐIỀU PHỐI BÓC TÁCH TỔNG HỢP (ORCHESTRATOR)
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
        - domain: str hoặc None (mới v2)
        - education_major: str hoặc None (mới v2)
    """
    email = extract_email(text)
    phone = extract_phone(text)
    skills = extract_skills(text)
    exp_years = extract_experience_years(text)
    education = extract_education(text)
    domain = detect_domain(text)
    edu_major = extract_education_major(text)

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
        "domain": domain,
        "education_major": edu_major,
    }
