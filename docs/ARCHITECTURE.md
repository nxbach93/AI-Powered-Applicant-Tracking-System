# TÀI LIỆU KIẾN TRÚC HỆ THỐNG (SYSTEM ARCHITECTURE)

---

## 1. TỔNG QUAN KIẾN TRÚC HỆ THỐNG

Hệ thống được thiết kế theo mô hình **Kiến trúc dịch vụ phân tách (Decoupled Services Architecture)** gồm 3 tầng thành phần chính:
1. **Frontend Presentation Layer**: Web App Next.js chịu trách nhiệm hiển thị giao diện người dùng, điều hướng trang (App Router) và gọi API.
2. **Core API Backend Layer**: Node.js/Express.js đóng vai trò trung tâm điều phối nghiệp vụ (Orchestrator), quản lý dữ liệu bền vững (MySQL qua Prisma ORM), xác thực JWT và xử lý lưu trữ tệp.
3. **AI Microservice Layer**: Python/FastAPI là service tính toán chuyên biệt (Stateless Compute Service) thực hiện bóc tách thực thể tự nhiên (NER) và đo độ tương đồng ngữ nghĩa giữa CV và JD.

```mermaid
graph TB
    subgraph Client [Tầng Trình Diễn - Presentation Layer]
        HR_UI[HR Portal / Dashboard\nNext.js + Tailwind CSS]
        CAN_UI[Candidate Portal\nNext.js + Tailwind CSS]
    end

    subgraph CoreBackend [Tầng Nghiệp Vụ - Core API Layer :5000]
        Router[Express HTTP Router\n/api/auth, /api/jobs, /api/applications]
        AuthMid[Auth & Role Middleware\nJWT Verification]
        Controllers[Business Controllers & Services]
        PrismaORM[Prisma ORM Client]
        FileStorage[Local File Storage\n/uploads/cv]
    end

    subgraph AIService [Tầng Trí Tuệ Nhân Tạo - AI Service :8000]
        FastAPI_App[FastAPI REST Endpoints]
        DocParser[Document Parser\nPyPDF2 / python-docx]
        SpacyNER[spaCy NER Model\nSkills, Education, Contact]
        SentTransformer[Sentence-Transformers\nVector Embeddings]
        CosineEngine[Scikit-learn\nCosine Similarity Engine]
    end

    subgraph DataStorage [Tầng Dữ Liệu Bền Vững]
        MySQL[(MySQL Database :3306\nInnoDB Engine)]
    end

    HR_UI -->|HTTPS / REST API + Bearer JWT| Router
    CAN_UI -->|HTTPS / REST API + Bearer JWT| Router

    Router --> AuthMid
    AuthMid --> Controllers
    Controllers --> PrismaORM
    Controllers --> FileStorage
    PrismaORM -->|SQL Queries / Connection Pool| MySQL

    Controllers -->|Internal HTTP POST / JSON| FastAPI_App
    FastAPI_App --> DocParser
    DocParser --> SpacyNER
    DocParser --> SentTransformer
    SentTransformer --> CosineEngine
    CosineEngine -->|Match Score & Parsed Data| FastAPI_App
    FastAPI_App -->|JSON Response| Controllers
```

---

## 2. CHI TIẾT CÁC TẦNG THÀNH PHẦN (SYSTEM LAYERS)

### 2.1. Presentation Layer (Frontend)
- **Công nghệ**: Next.js 16 (React 19), TypeScript, Tailwind CSS v4.
- **Port mặc định**: `3000`.
- **Cấu trúc phân hệ**:
  - `Candidate Portal`: Khách vãng lai và ứng viên xem tin tuyển dụng, tạo hồ sơ, tải lên CV và theo dõi trạng thái ứng tuyển.
  - `HR Management Portal`: Nhà tuyển dụng tạo tin, xem danh sách ứng viên nộp hồ sơ, kích hoạt chạy AI lọc ứng viên, chấm điểm và lên lịch phỏng vấn.
  - `Admin Dashboard`: Quản lý tài khoản và phân quyền hệ thống.
- **Giao tiếp**: Thư viện Axios / Fetch API được cấu hình trong `src/lib/api-client.ts`, gắn kèm Bearer Token trong Header `Authorization`.

### 2.2. Core Backend Layer (Express Core API)
- **Công nghệ**: Node.js, Express.js 5.x, TypeScript, Prisma ORM.
- **Port mặc định**: `5000`.
- **Vai trò**:
  - Xác thực người dùng (Authentication) và phân quyền dựa trên Role (`ADMIN`, `HR`, `CANDIDATE`).
  - Quản lý toàn bộ chu trình sống của dữ liệu (CRUD JobPosting, Application, Interview, User).
  - Tiếp nhận tệp tin CV từ ứng viên thông qua middleware Multer, lưu tệp an toàn vào hệ thống thư mục cục bộ `uploads/cv/`.
  - Gọi HTTP Request nội bộ sang AI Service để yêu cầu bóc tách và sàng lọc CV, sau đó lưu kết quả tính toán vào MySQL.

### 2.3. AI Microservice Layer (FastAPI AI Service)
- **Công nghệ**: Python 3.10+, FastAPI, Uvicorn.
- **Port mặc định**: `8000`.
- **Vai trò**:
  - Trích xuất văn bản thô từ tệp định dạng PDF và DOCX.
  - Thực hiện Named Entity Recognition (NER) bằng thư viện `spaCy` để nhận dạng các nhóm thực thể: Kỹ năng chuyên môn (Skills), Trình độ học vấn (Education), Thông tin liên hệ (Email, SĐT).
  - Sử dụng mô hình `sentence-transformers` (ví dụ: `all-MiniLM-L6-v2`) để chuyển đổi nội dung JD và CV thành các vector ngữ nghĩa đa chiều.
  - Áp dụng công thức Cosine Similarity từ `scikit-learn` kết hợp với trọng số tùy chỉnh (Kỹ năng vs Kinh nghiệm) để tính điểm phù hợp từ 0% đến 100%.

### 2.4. Data Storage Layer
- **Công nghệ**: MySQL Server (XAMPP hoặc Standalone), cổng kết nối `3306`.
- **Quản lý Schema**: Prisma ORM Client (`@prisma/client`), cơ chế migration tự động `prisma migrate`.

---

## 3. CÁC LUỒNG DỮ LIỆU CHÍNH (DATA FLOWS)

### 3.1. Luồng Xác thực & Phân quyền (Authentication & Authorization Flow)

```mermaid
sequenceDiagram
    autonumber
    actor User as Người dùng (HR / Ứng viên)
    participant FE as Frontend (Next.js)
    participant AuthAPI as Core API (/api/auth)
    participant DB as MySQL (User Table)

    User->>FE: Nhập Email & Mật khẩu
    FE->>AuthAPI: POST /api/auth/login { email, password }
    AuthAPI->>DB: Tìm User theo email
    DB-->>AuthAPI: Trả về bản ghi User (kèm password hash)
    AuthAPI->AuthAPI: Kiểm tra bcrypt.compare(password, hash)
    alt Mật khẩu đúng
        AuthAPI->AuthAPI: Sinh JWT (payload: userId, email, role)
        AuthAPI-->>FE: HTTP 200 { token, user: { id, email, role, ... } }
        FE->FE: Lưu token vào LocalStorage/Cookie
        FE-->>User: Điều hướng vào Dashboard tương ứng với Role
    else Sai thông tin
        AuthAPI-->>FE: HTTP 401 { message: "Invalid credentials" }
        FE-->>User: Hiển thị thông báo lỗi
    end
```

### 3.2. Luồng Nộp Hồ sơ CV & Xử lý tệp (Candidate Application & CV Upload Flow)

```mermaid
sequenceDiagram
    autonumber
    actor Can as Ứng viên (Candidate)
    participant FE as Frontend
    participant AppAPI as Core API (/api/applications)
    participant FS as Local File System (/uploads)
    participant DB as MySQL (Prisma)

    Can->>FE: Chọn JD -> Bấm "Ứng tuyển" -> Chọn file CV (PDF/DOCX)
    FE->>AppAPI: POST /api/applications (Multipart Form: file, jobId, coverLetter)
    AppAPI->AppAPI: Multer Middleware kiểm tra đuôi file & dung lượng (< 5MB)
    AppAPI->>FS: Ghi file vật lý vào uploads/cv/{unique_filename}
    AppAPI->>DB: Tạo bản ghi Application (Status: APPLIED, cvFileUrl)
    DB-->>AppAPI: Bản ghi Application mới tạo
    AppAPI-->>FE: HTTP 201 { success: true, applicationId }
    FE-->>Can: Thông báo "Nộp hồ sơ thành công"
```

### 3.3. Luồng Sàng lọc & Chấm điểm CV bằng AI (AI Screening Pipeline Flow)

```mermaid
sequenceDiagram
    autonumber
    actor HR as Nhân sự (HR)
    participant FE as Frontend
    participant CoreAPI as Core Backend (/api/applications/batch-screen)
    participant AI as AI Service (/api/ai/match-cv)
    participant DB as MySQL (Prisma)

    HR->>FE: Chọn danh sách CV cần lọc -> Chọn tỷ lệ trọng số (VD: Skill 70%, Exp 30%) -> Bấm "Phân tích AI"
    FE->>CoreAPI: POST /api/applications/batch-screen { jobPostingId, applicationIds, weights }
    CoreAPI->>DB: Lấy nội dung JobPosting (requirements, description) và file CV
    DB-->>CoreAPI: Trả về dữ liệu JD và đường dẫn tệp CV

    loop Lặp qua từng CV được chọn
        CoreAPI->>AI: POST /api/ai/match-cv { cv_path, jd_text, weights }
        AI->>AI: 1. Đọc văn bản thô từ tệp PDF/Word
        AI->>AI: 2. spaCy NER trích xuất Kỹ năng, Học vấn, Kinh nghiệm
        AI->>AI: 3. Chuyển CV và JD sang vector ngữ nghĩa (Sentence-Transformers)
        AI->>AI: 4. Tính toán Cosine Similarity + Trọng số điểm
        AI-->>CoreAPI: HTTP 200 { match_score, parsed_skills, summary }
        CoreAPI->>DB: Cập nhật aiMatchScore, parsedSkills, aiAnalysisSummary vào Application
    end

    CoreAPI-->>FE: HTTP 200 { results: [danh sách ứng viên kèm điểm % đã xếp hạng] }
    FE-->>HR: Hiển thị bảng xếp hạng ứng viên từ cao xuống thấp (Ranking)
```

---

## 4. THIẾT KẾ DỮ LIỆU & ĐỐI CHIẾU THỰC TẾ (DATABASE ARCHITECTURE & MAPPING)

### 4.1. Thực trạng Schema Prisma hiện hữu (`schema.prisma`)
Cơ sở dữ liệu của dự án được chuẩn hóa bằng Prisma ORM gồm các Entity cốt lõi sau:

```mermaid
erDiagram
    User ||--o| CandidateProfile : "has (1-1)"
    User ||--o{ JobPosting : "posts (1-N)"
    User ||--o{ Interview : "interviews (1-N)"
    CandidateProfile ||--o{ Application : "submits (1-N)"
    JobPosting ||--o{ Application : "receives (1-N)"
    Application ||--o{ Interview : "schedules (1-N)"

    User {
        int id PK
        string email UK
        string password
        string firstName
        string lastName
        Role role "ADMIN | HR | CANDIDATE"
        string avatarUrl
        boolean isActive
        datetime createdAt
        datetime updatedAt
    }

    CandidateProfile {
        int id PK
        int userId FK,UK
        string phone
        datetime dateOfBirth
        string address
        string summary
        string cvFileUrl
        json parsedSkills
        int experienceYears
        string education
        datetime createdAt
        datetime updatedAt
    }

    JobPosting {
        int id PK
        string title
        string department
        string location
        EmploymentType employmentType "FULL_TIME | PART_TIME | CONTRACT | INTERNSHIP"
        string description
        string requirements
        decimal salaryMin
        decimal salaryMax
        JobStatus status "DRAFT | PUBLISHED | CLOSED"
        int postedById FK
        datetime applicationDeadline
        datetime createdAt
        datetime updatedAt
    }

    Application {
        int id PK
        int candidateProfileId FK
        int jobPostingId FK
        ApplicationStatus status "APPLIED | SCREENING | INTERVIEW_SCHEDULED | OFFERED | REJECTED | WITHDRAWN"
        string coverLetter
        decimal aiMatchScore
        json parsedSkills
        string aiAnalysisSummary
        datetime appliedAt
        datetime updatedAt
    }

    Interview {
        int id PK
        int applicationId FK
        int interviewerId FK
        datetime scheduledAt
        int durationMinutes
        string location
        string meetingUrl
        InterviewStatus status "SCHEDULED | COMPLETED | CANCELLED | RESCHEDULED"
        string notes
        int rating
        string feedback
        datetime createdAt
        datetime updatedAt
    }
```

### 4.2. Bảng Đối Chiếu: Biểu đồ Lớp Báo Cáo (Chương 3) vs Database Schema Thực Tế

| Lớp trong Báo cáo (Chương 3) | Model tương ứng trong Prisma Schema | Đánh giá mức độ tương thích & Giải pháp kiến trúc |
|---|---|---|
| **User** (`id`, `mail`, `password`, `userName`, `role`, `trangThai`) | **User** (`id`, `email`, `password`, `firstName`, `lastName`, `role`, `isActive`) | **Hoàn toàn tương thích**: Thuộc tính tương đồng 100%, chỉ khác biệt về ngôn ngữ (Anh - Việt). |
| **Hr** (`idHr`, `idUser`, `idCongTy`, `hoTen`, `soDienThoai`, `phongBan`) | **User** (role: `HR`) & **JobPosting** (`department`, `postedById`) | **Tương thích nghiệp vụ**: Prisma quản lý HR thông qua `User.role = HR`. Thông tin phòng ban được gắn trực tiếp vào từng tin tuyển dụng. |
| **UngVien** (`idUngVien`, `idUser`, `hoTen`, `soDienThoai`, `ngaySinh`, `gioiTinh`) | **CandidateProfile** (`id`, `userId`, `phone`, `dateOfBirth`, `address`) | **Hoàn toàn tương thích**: Gắn kết 1-1 với `User` có `role = CANDIDATE`. |
| **TinTuyenDung** (`idTin`, `idHr`, `idNganh`, `tieuDe`, `viTri`, `mucLuong`, `hanNop`) | **JobPosting** (`id`, `postedById`, `title`, `department`, `salaryMin`, `salaryMax`, `applicationDeadline`) | **Hoàn toàn tương thích**: Đáp ứng trọn vẹn thông tin chiến dịch tuyển dụng. |
| **HoSoCv** (`idCv`, `idUngVien`, `tieuDeCv`, `fileCv`, `ngayTao`, `trangThai`) | **CandidateProfile.cvFileUrl** & **Application** (tệp CV theo từng đơn ứng tuyển) | **Tương thích**: Trong schema thực tế, mỗi lần nộp đơn ứng tuyển, tệp CV được gắn kết trực tiếp với bản ghi `Application` hoặc hồ sơ mặc định của ứng viên. |
| **UngTuyen** (`idUngTuyen`, `idTin`, `idCv`, `ngayNop`, `trangThai`, `ghiChu`) | **Application** (`id`, `jobPostingId`, `candidateProfileId`, `appliedAt`, `status`, `coverLetter`) | **Tương thích nâng cao**: Schema Prisma bổ sung sẵn các trường AI (`aiMatchScore`, `parsedSkills`, `aiAnalysisSummary`) mà biểu đồ lớp báo cáo chưa có. |
| **LichPhongVan** (`idLich`, `idUngTuyen`, `thoiGian`, `diaDiem`, `hinhThuc`, `ketQua`) | **Interview** (`id`, `applicationId`, `scheduledAt`, `location`, `meetingUrl`, `status`, `rating`, `feedback`) | **Hoàn toàn tương thích**: Hỗ trợ đầy đủ phỏng vấn trực tiếp (`location`) và trực tuyến (`meetingUrl`), ghi nhận đánh giá và kết quả. |
| **ThongBao** (`idThongBao`, `idUser`, `tieuDe`, `noiDung`, `ngayTao`, `trangThai`) | *Chưa có bảng độc lập trong Prisma* | **Giải pháp kiến trúc**: Thông báo ứng viên được tổng hợp động từ trạng thái của `Application` và `Interview` (Notification polling / Virtual notification feed). |
| **CongTy** (`idCongTy`, `tenCongTy`, `diaChi`, `maSoThue`, `moTa`, `logo`) | *Chưa có bảng độc lập trong Prisma* | **Giải pháp kiến trúc**: Hệ thống ATS này phục vụ nội bộ một doanh nghiệp cụ thể (In-house ATS) nên thông tin công ty được quản trị ở cấp cấu hình hệ thống (System Settings / Brand config). |
| **NganhNghe** (`idNganh`, `tenNganh`, `moTa`) | **JobPosting.department** | **Tương thích nghiệp vụ**: Thay vì bảng quan hệ phụ, phân loại ngành nghề được lưu dưới dạng trường `department` trong bản tin tuyển dụng. |

---

## 5. GIAO THỨC TRUYỀN THÔNG & API SPECIFICATION

### 5.1. Giữa Client và Core Backend (Port 3000 -> Port 5000)
- **Giao thức**: HTTP/1.1 RESTful API over JSON.
- **Bảo mật**: Bearer JWT Token đặt trong Header `Authorization: Bearer <token>`.
- **Định dạng dữ liệu**: `Content-Type: application/json` hoặc `multipart/form-data` đối với các API upload tệp CV.

### 5.2. Giữa Core Backend và AI Service (Port 5000 -> Port 8000)
- **Giao thức**: HTTP REST (Internal Service-to-Service communication).
- **Endpoint cốt lõi**:
  - `POST /api/ai/parse-cv`: Nhận đường dẫn tệp CV hoặc file nhị phân -> Trả về JSON bóc tách thông tin (họ tên, kỹ năng, học vấn, năm kinh nghiệm).
  - `POST /api/ai/match-cv`: Nhận văn bản JD và CV -> Trả về điểm tương đồng Cosine Similarity và tóm tắt đánh giá.
  - `POST /api/ai/batch-screen`: Nhận danh sách CV và thông tin JD kèm trọng số -> Trả về danh sách xếp hạng ứng viên.
