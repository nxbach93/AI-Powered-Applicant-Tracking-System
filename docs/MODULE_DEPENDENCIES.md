# TÀI LIỆU MA TRẬN PHỤ THUỘC MODULE (MODULE DEPENDENCIES)

---

## 1. CẤU TRÚC PHÂN RÃ HỆ THỐNG (SYSTEM DECOMPOSITION)

Dự án được cấu trúc theo dạng đa dịch vụ (Multi-service Monorepo) với ba khối thành phần độc lập:
```
AI-Powered-Applicant-Tracking-System/
├── frontend/                     # Phân hệ giao diện Next.js 16 + React 19
├── backend/
│   ├── core-api/                 # Phân hệ quản lý nghiệp vụ Express 5 + Prisma ORM
│   └── ai-service/               # Phân hệ AI/NLP Python 3.10+ FastAPI
└── docs/                         # Hồ sơ tài liệu kỹ thuật & báo cáo đồ án
```

---

## 2. PHÂN TÍCH CHI TIẾT CÁC MODULE THEO THÀNH PHẦN

### 2.1. Phân hệ Giao diện Người dùng (Frontend - `frontend/`)

| Thư mục / Tệp tin | Vai trò nghiệp vụ | Các phụ thuộc nội bộ & bên ngoài |
|---|---|---|
| `src/app/page.tsx` | Trang chủ hệ thống: Giới thiệu giải pháp ATS, cổng tìm kiếm việc làm cho ứng viên. | `lucide-react`, `src/lib/api-client.ts` |
| `src/app/layout.tsx` | Layout gốc toàn ứng dụng (Font Inter, Metadata SEO, Header/Footer chung). | `globals.css` |
| `src/app/auth/` | Màn hình Đăng nhập (`/login`) và Đăng ký tài khoản (`/register`). | `src/lib/api-client.ts`, Form State |
| `src/app/jobs/` | Danh sách tin tuyển dụng công khai (`/jobs`) & Chi tiết tin JD (`/jobs/[id]`). | `src/lib/api-client.ts`, UI Components |
| `src/app/candidate/` | Trang cá nhân Ứng viên: Cập nhật thông tin, Upload CV, Tra cứu đơn đã nộp. | `src/lib/api-client.ts`, File Upload Form |
| `src/app/dashboard/` | Trung tâm điều hành của Nhân sự (HR): Quản lý tin tuyển dụng, Hồ sơ CV, Lịch phỏng vấn. | `src/lib/api-client.ts`, Data Tables, Charts |
| `src/app/dashboard/ai-screening/` | Giao diện chạy sàng lọc AI: Chọn CV, chọn trọng số, xem bảng xếp hạng ứng viên. | `src/lib/api-client.ts`, Ranking UI |
| `src/lib/api-client.ts` | Axios instance cấu hình baseURL (`http://localhost:5000/api`), tự động gắn JWT Bearer Header. | `axios` |
| `src/components/ui/` | Các thành phần giao diện tái sử dụng: Button, Modal, Badge, Card, Table, Input. | Tailwind CSS |

### 2.2. Phân hệ Nghiệp vụ Cốt lõi (Core Backend - `backend/core-api/`)

| Thành phần | Đường dẫn tệp tin | Trách nhiệm xử lý | Phụ thuộc |
|---|---|---|---|
| **Entry Point** | `src/index.ts` | Khởi tạo Express Server, thiết lập Middleware (CORS, JSON parser, static `/uploads`), đăng ký route. | `express`, `cors`, `dotenv` |
| **Auth Module** | `src/controllers/auth.controller.ts`<br>`src/services/auth.service.ts`<br>`src/routes/auth.routes.ts` | Đăng ký tài khoản, đăng nhập, mã hóa mật khẩu (bcrypt), sinh JWT Token, lấy thông tin cá nhân. | `bcryptjs`, `jsonwebtoken`, Prisma Client |
| **Job Module** | `src/controllers/jobs.controller.ts`<br>`src/services/job.service.ts`<br>`src/routes/job.routes.ts` | CRUD tin tuyển dụng (JobPosting), lọc theo phòng ban/vị trí, đóng/mở chiến dịch. | Prisma Client |
| **Candidate Module** | `src/controllers/candidate.controller.ts`<br>`src/services/candidate.service.ts`<br>`src/routes/candidate.routes.ts` | Quản lý hồ sơ ứng viên (CandidateProfile), cập nhật kỹ năng, học vấn, kinh nghiệm. | Prisma Client |
| **Application Module** | `src/controllers/application.controller.ts`<br>`src/services/application.service.ts`<br>`src/routes/application.routes.ts` | Tiếp nhận đơn ứng tuyển, lưu tệp CV tải lên, cập nhật trạng thái hồ sơ (Screening -> Interview -> Offer). | `multer`, Prisma Client |
| **AI Integration Module** | `src/controllers/ai.controller.ts`<br>`src/services/ai.service.ts`<br>`src/routes/ai.routes.ts` | Cầu nối giữa Core API và AI Microservice: Gọi API bóc tách CV, tính điểm tương đồng JD, lưu điểm vào DB. | `axios`, AI Service (Port 8000), Prisma Client |
| **Middlewares** | `src/middlewares/auth.middleware.ts`<br>`src/middlewares/upload.middleware.ts`<br>`src/middlewares/error.middleware.ts` | Kiểm tra JWT token, phân quyền theo Role (`HR`, `CANDIDATE`, `ADMIN`), validate dung lượng và loại file upload. | `jsonwebtoken`, `multer` |
| **Database ORM** | `prisma/schema.prisma` | Khai báo schema CSDL MySQL, quan hệ các bảng, migration và sinh mã type-safe Prisma Client. | `@prisma/client`, MySQL |

### 2.3. Phân hệ Trí tuệ Nhân tạo (AI Microservice - `backend/ai-service/`)

| Thành phần | Đường dẫn tệp tin | Trách nhiệm xử lý | Phụ thuộc |
|---|---|---|---|
| **Entry Point** | `main.py` | Bootstrap ứng dụng FastAPI, cấu hình CORS Middleware, nạp router API. | `fastapi`, `uvicorn` |
| **API Endpoints** | `app/api/endpoints.py` | Định nghĩa các REST API: `/health`, `/api/ai/parse-cv`, `/api/ai/match-cv`, `/api/ai/batch-screen`. | `fastapi`, Pydantic Schemas |
| **NLP Core Service** | `app/services/nlp.py` | - Trích xuất văn bản từ PDF/DOCX.<br>- spaCy NER: Bóc tách kỹ năng, học vấn.<br>- Sentence-Transformers: Vector hóa ngữ nghĩa.<br>- Scikit-learn: Tính điểm Cosine Similarity kết hợp trọng số. | `spacy`, `sentence-transformers`, `scikit-learn`, `PyPDF2`, `python-docx` |
| **Config Core** | `app/core/config.py` | Đọc biến môi trường, định cấu hình model path, host, port. | `pydantic-settings` |

---

## 3. MA TRẬN PHỤ THUỘC GIỮA CÁC DỊCH VỤ (SERVICE-TO-SERVICE DEPENDENCY MATRIX)

```mermaid
graph LR
    subgraph Frontend
        FE_APP[Next.js Client Components]
    end

    subgraph CoreBackend
        BE_AUTH[Auth Route / Controller]
        BE_JOB[Job Route / Controller]
        BE_APP[Application Route / Controller]
        BE_AI[AI Client Service]
        BE_PRISMA[Prisma ORM Client]
    end

    subgraph AIService
        AI_ROUTER[FastAPI Endpoints]
        AI_NLP[NLP & Matching Engine]
    end

    subgraph Storage
        MYSQL[(MySQL Database)]
        FS[(Local File Storage: /uploads)]
    end

    FE_APP -->|HTTP REST + Bearer JWT| BE_AUTH
    FE_APP -->|HTTP REST + Bearer JWT| BE_JOB
    FE_APP -->|HTTP REST + Bearer JWT (Multipart)| BE_APP
    FE_APP -->|HTTP REST + Bearer JWT| BE_AI

    BE_AUTH --> BE_PRISMA
    BE_JOB --> BE_PRISMA
    BE_APP --> BE_PRISMA
    BE_APP --> FS
    BE_AI --> BE_PRISMA
    BE_AI -->|HTTP POST JSON| AI_ROUTER

    AI_ROUTER --> AI_NLP
    AI_NLP -.->|Đọc tệp CV vật lý| FS

    BE_PRISMA -->|TCP Connection Pool :3306| MYSQL
```

### 3.1. Phân tích giao thức liên kết
1. **Frontend ➔ Core Backend**: 
   - Hoàn toàn phi trạng thái (Stateless) thông qua chuẩn RESTful.
   - Phiên làm việc được chứng thực thông qua Access Token (JWT) trong HTTP Authorization Header.
2. **Core Backend ➔ AI Service**:
   - Giao tiếp Service-to-Service nội bộ thông qua HTTP REST.
   - Core Backend đóng vai trò Client gọi sang AI Service (Port 8000). Khi AI Service xử lý xong, Core Backend tiếp nhận kết quả JSON, thực hiện cập nhật CSDL và trả về cho Frontend.
3. **Core Backend ➔ MySQL Database**:
   - Kết nối trực tiếp qua Prisma Client, duy trì Connection Pool tối ưu, bảo đảm tính toàn vẹn giao dịch (ACID).
4. **AI Service ➔ Storage**:
   - AI Service có thể nhận đường dẫn tệp CV cục bộ từ Core Backend để đọc tệp trực tiếp hoặc nhận nội dung văn bản thô đã trích xuất sẵn.

---

## 4. MA TRẬN THƯ VIỆN & PHIÊN BẢN (PACKAGE DEPENDENCY MATRIX)

### 4.1. Phân hệ Frontend (`frontend/package.json`)
- `next`: `16.4.0` (Framework Full-stack React)
- `react`: `19.2.4` / `react-dom`: `19.2.4`
- `tailwindcss`: `@tailwindcss/postcss` v4.0.0
- `lucide-react`: `^1.16.0` (Bộ Icon giao diện hiện đại)
- `axios`: `^1.13.2` (HTTP Client gọi Backend)
- `typescript`: `^5` (Static Type Checker)

### 4.2. Phân hệ Core API (`backend/core-api/package.json`)
- `express`: `^5.2.1` (Framework Web Backend)
- `@prisma/client`: `^6.19.0` (Database Client ORM)
- `prisma`: `^6.19.0` (CLI Quản lý Migration và Schema)
- `dotenv`: `^17.2.3` (Quản lý biến môi trường `.env`)
- `cors`: `^2.8.5` / `@types/cors`: `^2.8.19` (Bảo mật Cross-Origin Resource Sharing)
- `ts-node-dev`: `^2.0.0` (Công cụ chạy dev server hot-reload)
- `typescript`: `^5.9.3`
- *Cần kích hoạt theo nghiệp vụ đã có trong mã*: `jsonwebtoken`, `bcryptjs`, `multer`.

### 4.3. Phân hệ AI Service (`backend/ai-service/requirements.txt`)
- `fastapi`: `^0.110.0` (Framework API tốc độ cao)
- `uvicorn`: `^0.28.0` (Máy chủ ASGI)
- `pydantic`: `^2.6.4` (Xác thực dữ liệu đầu vào/ra)
- `python-dotenv`: `^1.0.1` (Cấu hình môi trường)
- `spacy`: Thư viện xử lý ngôn ngữ tự nhiên công nghiệp (NER)
- `sentence-transformers`: Tạo vector nhúng ngữ nghĩa (Semantic Embeddings)
- `scikit-learn`: Tính toán độ tương đồng Cosine (Cosine Similarity)
- `PyPDF2` / `pdfplumber` / `python-docx`: Trích xuất text từ tệp CV định dạng PDF và DOCX.

---

## 5. ĐÁNH GIÁ ĐỘ GHÉP NỐI & TÍNH GẮN KẾT (COUPLING & COHESION)

1. **Độ gắn kết cao (High Cohesion)**:
   - Mỗi thành phần đảm nhiệm một miền nghiệp vụ riêng biệt: Frontend chỉ lo giao diện và trải nghiệm người dùng; Core API chỉ lo logic dữ liệu và xác thực; AI Service chỉ lo thuật toán NLP.
   - Bên trong Core API, kiến trúc Controller - Service - Data Access tách bạch rõ ràng giúp dễ kiểm thử và bảo trì.
2. **Độ ghép nối thấp (Loose Coupling)**:
   - AI Service hoàn toàn không phụ thuộc vào cơ sở dữ liệu MySQL hay Prisma ORM. Nếu nâng cấp mô hình AI (chuyển từ Sentence-Transformers sang mô hình lớn hơn hoặc API bên ngoài), Core Backend và Frontend không bị ảnh hưởng đến cấu trúc lưu trữ.
   - Core API giao tiếp với AI Service qua REST API chuẩn hóa, cho phép AI Service có thể triển khai trên môi trường có GPU riêng biệt khi cần mở rộng quy mô.
