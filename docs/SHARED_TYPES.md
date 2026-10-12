# TÀI LIỆU CÁC KIỂU DỮ LIỆU DÙNG CHUNG (SHARED TYPES SPECIFICATION)

---

## 1. MỤC TIÊU & NGUYÊN TẮC THỐNG NHẤT KIỂU DỮ LIỆU

Tài liệu này là **Nguồn chân lý duy nhất (Single Source of Truth - SSOT)** quy định toàn bộ các kiểu dữ liệu, Enums, DTOs và Interfaces dùng chung giữa:
1. **Frontend**: Next.js 16 + React 19 + TypeScript.
2. **Core Backend**: Node.js + Express 5 + TypeScript + Prisma ORM.
3. **AI Microservice**: Python 3.10+ + FastAPI + Pydantic v2.

Việc chuẩn hóa đảm bảo sự đồng bộ 100% giữa các dịch vụ, triệt tiêu lỗi không khớp kiểu dữ liệu (`Type Mismatch`), đảm bảo tính Type-Safe từ giao diện người dùng tới truy vấn cơ sở dữ liệu.

---

## 2. BẢNG ÁNH XẠ KIỂU DỮ LIỆU LIÊN DỊCH VỤ (CROSS-SERVICE TYPE MAPPING)

| Kiểu dữ liệu thực tế | TypeScript (FE / BE) | Prisma ORM | MySQL (InnoDB) | Python (FastAPI / Pydantic) |
|---|---|---|---|---|
| Mã định danh (ID) | `string` | `String @id @default(uuid())` | `VARCHAR(36)` | `str` (UUID) |
| Chuỗi văn bản ngắn | `string` | `String` | `VARCHAR(191)` | `str` |
| Đoạn văn bản dài | `string` | `String @db.Text` / `@db.LongText`| `TEXT` / `LONGTEXT` | `str` |
| Số nguyên | `number` | `Int` | `INT` | `int` |
| Số thực (Điểm số) | `number` | `Float` | `DOUBLE` / `FLOAT` | `float` |
| Số tiền tệ / Lương | `number` | `Decimal @db.Decimal(12, 2)` | `DECIMAL(12,2)` | `Decimal` / `float` |
| Giá trị đúng/sai | `boolean` | `Boolean` | `TINYINT(1)` / `BOOLEAN` | `bool` |
| Ngày giờ | `string` (ISO 8601) / `Date`| `DateTime` | `DATETIME(3)` | `datetime` |
| Mảng chuỗi / Đối tượng | `string[]` / `Record<string, any>`| `Json` | `JSON` | `List[str]` / `Dict[str, Any]`|

---

## 3. THỐNG NHẤT CÁC TẬP HỢP GIÁ TRỊ CỐ ĐỊNH (UNIFIED ENUMS)

### 3.1. TypeScript Enums (Dùng cho Frontend & Backend)
```typescript
/** Vai trò người dùng */
export enum UserRole {
  ADMIN = 'ADMIN',
  HR = 'HR',
  CANDIDATE = 'CANDIDATE'
}

/** Trạng thái tin tuyển dụng */
export enum JobStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  CLOSED = 'CLOSED',
  ARCHIVED = 'ARCHIVED'
}

/** Hình thức làm việc */
export enum EmploymentType {
  FULL_TIME = 'FULL_TIME',
  PART_TIME = 'PART_TIME',
  CONTRACT = 'CONTRACT',
  INTERNSHIP = 'INTERNSHIP',
  REMOTE = 'REMOTE'
}

/** Trạng thái hồ sơ qua các vòng tuyển dụng */
export enum ApplicationStatus {
  SUBMITTED = 'SUBMITTED',                     // Vừa nộp hồ sơ
  SCREENING = 'SCREENING',                     // Đang trong vòng lọc CV / chạy AI
  SHORTLISTED = 'SHORTLISTED',                 // Qua vòng CV, chọn vào phỏng vấn
  INTERVIEW_SCHEDULED = 'INTERVIEW_SCHEDULED', // Đã lên lịch phỏng vấn
  INTERVIEWED = 'INTERVIEWED',                 // Đã phỏng vấn xong
  OFFERED = 'OFFERED',                         // Đã gửi thư mời nhận việc
  HIRED = 'HIRED',                             // Tuyển dụng thành công
  REJECTED = 'REJECTED',                       // Từ chối / loại hồ sơ
  WITHDRAWN = 'WITHDRAWN'                      // Ứng viên tự rút hồ sơ
}

/** Trạng thái xử lý tính toán của AI */
export enum AIStatus {
  IDLE = 'IDLE',                               // Chưa chạy AI
  PENDING = 'PENDING',                         // Đang trong hàng đợi
  PROCESSING = 'PROCESSING',                   // Đang bóc tách & tính vector
  COMPLETED = 'COMPLETED',                     // Đã tính toán xong thành công
  FAILED = 'FAILED'                            // Lỗi trích xuất hoặc timeout
}

/** Trạng thái lịch phỏng vấn */
export enum InterviewStatus {
  SCHEDULED = 'SCHEDULED',                     // Đã lên lịch hẹn
  COMPLETED = 'COMPLETED',                     // Phỏng vấn thành công, đã đánh giá
  CANCELLED = 'CANCELLED',                     // Hủy lịch trước giờ hẹn
  NO_SHOW = 'NO_SHOW'                          // Ứng viên không đến tham dự
}

/** Loại thông báo hệ thống */
export enum NotificationType {
  APPLICATION_STATUS_CHANGED = 'APPLICATION_STATUS_CHANGED',
  INTERVIEW_SCHEDULED = 'INTERVIEW_SCHEDULED',
  INTERVIEW_CANCELLED = 'INTERVIEW_CANCELLED',
  SYSTEM_ALERT = 'SYSTEM_ALERT'
}
```

### 3.2. Python Enums (Dùng cho FastAPI AI Service)
```python
from enum import Enum

class AIStatusEnum(str, Enum):
    IDLE = "IDLE"
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
```

---

## 4. CHI TIẾT INTERFACES & DTOs TYPESCRIPT (FRONTEND & CORE API)

### 4.1. Cấu trúc Response chuẩn (API Envelopes)
```typescript
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  meta?: PaginationMeta;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Array<{ field: string; message: string }>;
  };
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
```

---

### 4.2. User & Authentication Types
```typescript
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  avatarUrl?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CandidateProfile {
  id: string;
  userId: string;
  phone?: string | null;
  dateOfBirth?: string | null;
  address?: string | null;
  summary?: string | null;
  cvFileUrl?: string | null;
  parsedSkills?: string[] | null;
  experienceYears?: number | null;
  education?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: UserRole;
}

export interface AuthResponseData {
  user: User;
  token: string;
}
```

---

### 4.3. Job Posting Types
```typescript
export interface JobPosting {
  id: string;
  title: string;
  department?: string | null;
  location?: string | null;
  employmentType?: string | null;
  description: string;
  requirements?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  status: JobStatus;
  postedById: string;
  applicationDeadline?: string | null;
  createdAt: string;
  updatedAt: string;
  postedBy?: {
    firstName: string;
    lastName: string;
    email: string;
  };
  _count?: {
    applications: number;
  };
}

export interface CreateJobDto {
  title: string;
  department?: string;
  location?: string;
  employmentType?: string;
  description: string;
  requirements?: string;
  salaryMin?: number;
  salaryMax?: number;
  status?: JobStatus;
  applicationDeadline?: string;
}

export interface UpdateJobDto extends Partial<CreateJobDto> {}

export interface JobFilterParams {
  page?: number;
  limit?: number;
  search?: string;
  department?: string;
  location?: string;
  status?: JobStatus;
}
```

---

### 4.4. Application & AI Analysis Types
```typescript
export interface AIScoreDetails {
  skillScore: number;
  expScore: number;
  semanticScore: number;
}

export interface Application {
  id: string;
  candidateProfileId: string;
  jobPostingId: string;
  status: ApplicationStatus;
  coverLetter?: string | null;
  cvFileUrl?: string | null;
  aiMatchScore?: number | null;
  parsedSkills?: string[] | null;
  aiAnalysisSummary?: string | null;
  aiStatus?: AIStatus;
  scoreDetails?: AIScoreDetails | null;
  matchedSkills?: string[] | null;
  missingSkills?: string[] | null;
  appliedAt: string;
  updatedAt: string;
  jobPosting?: JobPosting;
  candidateProfile?: CandidateProfile & {
    user: {
      firstName: string;
      lastName: string;
      email: string;
    };
  };
  interviews?: Interview[];
}

export interface AIWeights {
  skillWeight: number;      // Ví dụ: 0.5 (50%)
  expWeight: number;        // Ví dụ: 0.3 (30%)
  semanticWeight: number;   // Ví dụ: 0.2 (20%)
}

export interface AIScreeningRequest {
  weights?: AIWeights;
}

export interface AIScreeningResponse {
  applicationId: string;
  aiMatchScore: number;
  scoreDetails: AIScoreDetails;
  parsedSkills: string[];
  matchedSkills: string[];
  missingSkills: string[];
  aiAnalysisSummary: string;
}

export interface BatchScreeningResponse {
  totalProcessed: number;
  averageScore: number;
  topCandidates: Array<{
    applicationId: string;
    candidateName: string;
    aiMatchScore: number;
  }>;
}
```

---

### 4.5. Interview Types
```typescript
export interface Interview {
  id: string;
  applicationId: string;
  interviewerId: string;
  scheduledAt: string;
  durationMinutes: number;
  location?: string | null;
  meetingUrl?: string | null;
  status: InterviewStatus;
  notes?: string | null;
  rating?: number | null;
  feedback?: string | null;
  createdAt: string;
  updatedAt: string;
  interviewer?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  application?: Application;
}

export interface CreateInterviewDto {
  applicationId: string;
  interviewerId: string;
  scheduledAt: string;
  durationMinutes?: number;
  location?: string;
  meetingUrl?: string;
  notes?: string;
}

export interface UpdateInterviewFeedbackDto {
  rating: number;           // 1 đến 5
  feedback: string;
  status?: InterviewStatus; // Mặc định chuyển sang COMPLETED
}
```

---

### 4.6. Analytics & Notification Types
```typescript
export interface AnalyticsOverview {
  totalJobs: number;
  activeJobs: number;
  totalApplications: number;
  totalInterviews: number;
  totalHired: number;
  conversionRate: number;   // Tỷ lệ % tuyển dụng thành công
  averageAiScore: number;
}

export interface RecruitmentFunnel {
  jobId: string;
  jobTitle: string;
  funnel: {
    applied: number;
    screening: number;
    shortlisted: number;
    interviewed: number;
    offered: number;
    hired: number;
    rejected: number;
  };
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  metadata?: Record<string, any>;
  createdAt: string;
}
```

---

## 5. CHI TIẾT PYDANTIC MODELS (FASTAPI AI SERVICE)

Dưới đây là các định nghĩa Schema Pydantic sử dụng trong `backend/ai-service/app/schemas/`:

```python
# backend/ai-service/app/schemas/ai_schemas.py

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class AIWeightsSchema(BaseModel):
    skill_weight: float = Field(0.5, ge=0.0, le=1.0, description="Trọng số kỹ năng")
    exp_weight: float = Field(0.3, ge=0.0, le=1.0, description="Trọng số năm kinh nghiệm")
    semantic_weight: float = Field(0.2, ge=0.0, le=1.0, description="Trọng số tương đồng ngữ nghĩa")

class ScoreBreakdownSchema(BaseModel):
    skill_score: float = Field(..., ge=0.0, le=100.0)
    experience_score: float = Field(..., ge=0.0, le=100.0)
    semantic_score: float = Field(..., ge=0.0, le=100.0)

class ContactInfoSchema(BaseModel):
    email: Optional[str] = None
    phone: Optional[str] = None

class ParseCVResponse(BaseModel):
    success: bool = True
    filename: str
    text_length: int
    contact_info: ContactInfoSchema
    parsed_skills: List[str]
    experience_years: Optional[int] = None
    education: Optional[str] = None

class MatchCVResponse(BaseModel):
    success: bool = True
    match_score: float = Field(..., ge=0.0, le=100.0, description="Điểm số tương đồng tổng hợp 0-100")
    score_breakdown: ScoreBreakdownSchema
    parsed_skills: List[str]
    matched_skills: List[str]
    missing_skills: List[str]
    experience_years: Optional[int] = None
    summary: str

class BatchMatchItem(BaseModel):
    application_id: str
    candidate_name: str
    match_score: float
    matched_skills: List[str]
    missing_skills: List[str]

class BatchMatchResponse(BaseModel):
    success: bool = True
    total_processed: int
    average_score: float
    rankings: List[BatchMatchItem]
```

---

## 6. QUY TẮC BẢO TRÌ & NÂNG CẤP KIỂU DỮ LIỆU

1. **Bất biến đối với Enums đã lưu CSDL**: Không được tùy tiện xóa các giá trị Enum đã tồn tại trong CSDL MySQL (`SUBMITTED`, `SCREENING`, `INTERVIEW_SCHEDULED`...) để tránh làm hỏng dữ liệu lịch sử.
2. **Khả năng tương thích ngược (Backward Compatibility)**: Khi mở rộng thêm trường dữ liệu trong DTOs hoặc Responses, luôn đặt trường mới ở dạng tùy chọn (`optional` / `?` / `None`) để không làm gãy các thành phần Client đang chạy phiên bản cũ.
3. **Validation nhất quán giữa Client & Server**: Quy tắc kiểm tra tính hợp lệ (ví dụ: độ dài mật khẩu $\ge 6$, dung lượng file CV $\le 5\text{MB}$, đuôi file `.pdf`/`.docx`) phải được áp dụng song song cả trên form Frontend và Middleware Backend.
