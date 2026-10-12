# TÀI LIỆU MA TRẬN PHÂN QUYỀN HỆ THỐNG (ROLE-BASED ACCESS CONTROL - RBAC)

---

## 1. NGUYÊN TẮC PHÂN QUYỀN TRONG HỆ THỐNG

Hệ thống ATS áp dụng mô hình **Phân quyền dựa trên vai trò (Role-Based Access Control - RBAC)** kết hợp **Kiểm soát quyền sở hữu dữ liệu ở cấp độ dòng (Row-Level Ownership Validation)** nhằm đảm bảo an toàn thông tin, bảo mật dữ liệu ứng viên theo tiêu chuẩn bảo vệ dữ liệu cá nhân.

### 1.1. Các vai trò người dùng (Roles)
Hệ thống định nghĩa 3 vai trò chính trong enum `UserRole` của CSDL:
1. **ADMIN (Quản trị viên hệ thống)**:
   - Có thẩm quyền cao nhất trên toàn hệ thống.
   - Quản trị tài khoản người dùng, phân quyền, kích hoạt/vô hiệu hóa tài khoản (`isActive`).
   - Giám sát toàn bộ hoạt động tuyển dụng, xem tất cả báo cáo thống kê vĩ mô.
2. **HR (Chuyên viên tuyển dụng / Trưởng bộ phận nhân sự)**:
   - Quản lý chiến dịch tuyển dụng: tạo, chỉnh sửa, đóng/mở tin tuyển dụng (`JobPosting`).
   - Tiếp nhận và quản lý hồ sơ ứng viên nộp vào các vị trí tuyển dụng.
   - Kích hoạt phân hệ AI để sàng lọc, bóc tách kỹ năng và chấm điểm ứng viên.
   - Lên lịch phỏng vấn, chủ trì hoặc phân công người phỏng vấn, đánh giá kết quả tuyển dụng.
   - Xem báo cáo phân tích hiệu suất tuyển dụng của các chiến dịch.
3. **CANDIDATE (Ứng viên tìm việc)**:
   - Tạo và cập nhật thông tin hồ sơ cá nhân (`CandidateProfile`), tải lên tệp CV.
   - Tìm kiếm, tra cứu danh sách tin tuyển dụng đang công khai (`JobStatus.PUBLISHED`).
   - Nộp hồ sơ ứng tuyển kèm tệp CV và thư giới thiệu.
   - Theo dõi trạng thái hồ sơ qua từng vòng tuyển dụng, rút hồ sơ nếu cần.
   - Nhận thông báo kết quả và xem lịch hẹn phỏng vấn.
4. **GUEST (Khách vãng lai chưa đăng nhập)**:
   - Chỉ được xem trang chủ, tra cứu và đọc chi tiết các tin tuyển dụng đang mở (`PUBLISHED`).
   - Phải đăng ký tài khoản `CANDIDATE` để có thể nộp hồ sơ.

---

## 2. MA TRẬN PHÂN QUYỀN CHI TIẾT (RBAC MATRIX)

Ký hiệu:
- ✅ **ALLOWED**: Có toàn quyền thực hiện.
- 🟡 **OWNER ONLY**: Chỉ được thực hiện trên tài nguyên do chính mình tạo ra hoặc sở hữu (Row-Level Security).
- ❌ **DENIED**: Bị từ chối truy cập (Trả về mã lỗi `403 Forbidden`).
- 🌐 **PUBLIC**: Không yêu cầu đăng nhập.

| Phân hệ / Tài nguyên | Hành động nghiệp vụ (Action) | Endpoint | Guest | Candidate | HR | Admin | Ghi chú kiểm soát |
|---|---|---|:---:|:---:|:---:|:---:|---|
| **Xác thực (Auth)** | Đăng ký tài khoản ứng viên | `POST /api/auth/register` | 🌐 | ❌ | ❌ | ❌ | Tự động gán role CANDIDATE |
| | Đăng ký tài khoản HR | `POST /api/auth/register` (role HR) | 🌐 | ❌ | ❌ | ✅ | Cần Admin duyệt hoặc mở đăng ký nội bộ |
| | Đăng nhập hệ thống | `POST /api/auth/login` | 🌐 | ✅ | ✅ | ✅ | Kiểm tra `isActive = true` |
| | Xem thông tin bản thân | `GET /api/auth/me` | ❌ | 🟡 | 🟡 | 🟡 | Lấy info theo Token |
| | Đổi mật khẩu | `PUT /api/auth/change-password`| ❌ | 🟡 | 🟡 | 🟡 | Phải cung cấp mật khẩu cũ |
| **Quản trị người dùng** | Xem danh sách User | `GET /api/users` | ❌ | ❌ | ❌ | ✅ | Quản trị tài khoản |
| | Khóa / Mở tài khoản | `PATCH /api/users/:id/status` | ❌ | ❌ | ❌ | ✅ | Thay đổi `is_active` |
| | Đổi vai trò người dùng | `PATCH /api/users/:id/role` | ❌ | ❌ | ❌ | ✅ | Cấp quyền HR hoặc Admin |
| **Hồ sơ ứng viên** | Xem hồ sơ cá nhân | `GET /api/candidates/profile` | ❌ | 🟡 | ❌ | ❌ | Chỉ xem profile của mình |
| | Cập nhật hồ sơ cá nhân | `PUT /api/candidates/profile` | ❌ | 🟡 | ❌ | ❌ | Cập nhật SĐT, học vấn, exp |
| | Xem hồ sơ ứng viên khác | `GET /api/candidates/:id` | ❌ | ❌ | ✅ | ✅ | HR xem khi ứng viên nộp đơn |
| **Tin tuyển dụng** | Xem danh sách tin mở | `GET /api/jobs` | 🌐 | 🌐 | ✅ | ✅ | Khách/Ứng viên chỉ thấy PUBLISHED |
| | Xem chi tiết tin tuyển dụng | `GET /api/jobs/:id` | 🌐 | 🌐 | ✅ | ✅ | Xem JD, yêu cầu, mức lương |
| | Tạo tin tuyển dụng mới | `POST /api/jobs` | ❌ | ❌ | ✅ | ✅ | HR tạo chiến dịch |
| | Chỉnh sửa tin tuyển dụng | `PUT /api/jobs/:id` | ❌ | ❌ | 🟡 | ✅ | HR chỉ sửa tin của mình |
| | Đóng / Mở / Lưu trữ tin | `PATCH /api/jobs/:id/status` | ❌ | ❌ | 🟡 | ✅ | Đổi DRAFT <-> PUBLISHED <-> CLOSED |
| | Xóa tin tuyển dụng | `DELETE /api/jobs/:id` | ❌ | ❌ | 🟡 | ✅ | Chỉ xóa khi chưa có ứng viên |
| | Xem tin do mình tạo | `GET /api/jobs/hr/my-jobs` | ❌ | ❌ | 🟡 | ✅ | Dashboard HR |
| **Hồ sơ ứng tuyển** | Nộp hồ sơ ứng tuyển | `POST /api/applications` | ❌ | ✅ | ❌ | ❌ | Chỉ ứng viên được nộp CV |
| | Xem lịch sử đơn đã nộp | `GET /api/applications/my-applications`| ❌ | 🟡 | ❌ | ❌ | Lịch sử nộp của ứng viên |
| | Rút đơn ứng tuyển | `PUT /api/applications/:id/withdraw` | ❌ | 🟡 | ❌ | ❌ | Khi đơn chưa chốt kết quả |
| | Xem danh sách đơn theo tin | `GET /api/applications/job/:jobId` | ❌ | ❌ | 🟡 | ✅ | HR xem ứng viên của Job mình |
| | Xem chi tiết đơn ứng tuyển | `GET /api/applications/:id` | ❌ | 🟡 | 🟡 | ✅ | Ứng viên xem đơn mình, HR xem đơn Job mình |
| | Cập nhật vòng tuyển dụng | `PATCH /api/applications/:id/status` | ❌ | ❌ | 🟡 | ✅ | Chuyển Screening -> Interview -> Offer |
| **Phân tích AI** | Chạy chấm điểm AI 1 đơn | `POST /api/ai/screen/:applicationId`| ❌ | ❌ | 🟡 | ✅ | HR kích hoạt phân tích |
| | Chạy xếp hạng AI cả Job | `POST /api/ai/batch-screen/:jobId` | ❌ | ❌ | 🟡 | ✅ | Cấu hình trọng số và xếp hạng |
| **Lịch phỏng vấn** | Tạo lịch phỏng vấn mới | `POST /api/interviews` | ❌ | ❌ | 🟡 | ✅ | HR xếp lịch cho ứng viên |
| | Xem danh sách lịch (HR) | `GET /api/interviews` | ❌ | ❌ | ✅ | ✅ | Lịch làm việc của phòng HR |
| | Xem lịch của mình (Candidate)| `GET /api/interviews/candidate` | ❌ | 🟡 | ❌ | ❌ | Ứng viên xem lịch hẹn của mình |
| | Đổi lịch phỏng vấn | `PUT /api/interviews/:id` | ❌ | ❌ | 🟡 | ✅ | Cập nhật ngày giờ, link họp |
| | Đánh giá & cho điểm PV | `PATCH /api/interviews/:id/feedback`| ❌ | ❌ | 🟡 | ✅ | Chấm điểm rating và nhận xét |
| | Cập nhật trạng thái PV | `PATCH /api/interviews/:id/status` | ❌ | ❌ | 🟡 | ✅ | COMPLETED, CANCELLED, NO_SHOW |
| **Báo cáo thống kê** | Xem tổng quan KPI tuyển dụng | `GET /api/analytics/overview` | ❌ | ❌ | ✅ | ✅ | HR/Admin xem số liệu toàn hệ thống |
| | Xem phễu tuyển dụng theo tin | `GET /api/analytics/job/:jobId` | ❌ | ❌ | 🟡 | ✅ | Báo cáo tỷ lệ chuyển đổi |
| **Thông báo** | Xem danh sách thông báo | `GET /api/notifications` | ❌ | 🟡 | 🟡 | 🟡 | Xem thông báo của chính mình |
| | Đánh dấu đã đọc | `PATCH /api/notifications/:id/read` | ❌ | 🟡 | 🟡 | 🟡 | Đánh dấu thông báo của mình |

---

## 3. THIẾT KẾ KIẾN TRÚC KIỂM SOÁT PHÂN QUYỀN (AUTHORIZATION ARCHITECTURE)

### 3.1. Cơ chế Middleware xác thực & phân quyền (Express Layer)

```typescript
// backend/core-api/src/middlewares/auth.middleware.ts

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/**
 * 1. Middleware Xác thực JWT (Authentication)
 */
export const authenticateJWT = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Yêu cầu token xác thực hợp lệ' }
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'ats_jwt_secret_key') as AuthenticatedUser;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Token không hợp lệ hoặc đã hết hạn' }
    });
  }
};

/**
 * 2. Middleware Kiểm tra Vai trò (Role-Based Authorization)
 */
export const authorizeRoles = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Người dùng chưa được xác thực' }
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Bạn không có quyền thực hiện thao tác này' }
      });
    }

    next();
  };
};
```

### 3.2. Kiểm soát quyền sở hữu dữ liệu (Row-Level Security Pattern)
Đối với các tài nguyên nhạy cảm (như sửa tin tuyển dụng, xem đơn ứng tuyển, đổi lịch phỏng vấn), Controller/Service bắt buộc kiểm tra xem người dùng hiện tại có phải là chủ sở hữu hoặc người chịu trách nhiệm không:

```typescript
// Ví dụ kiểm tra quyền sửa JobPosting
const job = await prisma.jobPosting.findUnique({ where: { id: jobId } });
if (!job) throw new NotFoundError('Không tìm thấy tin tuyển dụng');

// ADMIN có toàn quyền, HR chỉ sửa được tin do mình tạo
if (req.user.role !== 'ADMIN' && job.postedById !== req.user.id) {
  return res.status(403).json({
    success: false,
    error: { code: 'FORBIDDEN', message: 'Bạn chỉ có quyền chỉnh sửa tin tuyển dụng do chính bạn tạo' }
  });
}
```

---

## 4. MA TRẬN PHÂN QUYỀN TRÊN GIAO DIỆN FRONTEND (UI ACCESS CONTROL)

Frontend Next.js sử dụng Route Guard và Component Guard dựa vào thuộc tính `user.role` lưu trong Auth Context / Session:

| Tuyến đường (Route Path) | Vai trò được phép truy cập | Hành vi khi không đủ quyền |
|---|---|---|
| `/` (Trang chủ) | Mọi người dùng (Guest, Candidate, HR, Admin) | Hiển thị bình thường |
| `/jobs` (Tìm việc làm) | Mọi người dùng | Hiển thị tin `PUBLISHED` |
| `/jobs/[id]` (Chi tiết JD) | Mọi người dùng | Hiển thị chi tiết tin |
| `/auth/login`, `/auth/register` | Guest (Chưa đăng nhập) | Nếu đã đăng nhập -> Redirect về Dashboard tương ứng |
| `/candidate/profile` | `CANDIDATE` | Điều hướng về `/auth/login` nếu chưa đăng nhập |
| `/candidate/applications` | `CANDIDATE` | Điều hướng về `/auth/login` |
| `/dashboard` (HR Tổng quan) | `HR`, `ADMIN` | Ứng viên truy cập -> Redirect về `/` kèm Toast cảnh báo |
| `/dashboard/jobs` | `HR`, `ADMIN` | Hiển thị bảng quản lý tin tuyển dụng |
| `/dashboard/candidates` | `HR`, `ADMIN` | Hiển thị danh sách hồ sơ ứng viên |
| `/dashboard/ai-screening` | `HR`, `ADMIN` | Màn hình lọc CV và xem ranking AI |
| `/dashboard/interviews` | `HR`, `ADMIN` | Lịch phỏng vấn tuyển dụng |
| `/dashboard/analytics` | `HR`, `ADMIN` | Báo cáo biểu đồ KPI |
| `/admin/users` | `ADMIN` duy nhất | HR truy cập -> Bị chặn, redirect về `/dashboard` |

---

## 5. TÁC ĐỘNG CỦA CÁC QUY TẮC PHÂN QUYỀN TỚI CÁC PHÂN HỆ KHÁC (IMPACT ANALYSIS)

Khi triển khai các quy tắc phân quyền trên, các phân hệ kỹ thuật sẽ chịu những tác động cụ thể như sau:

1. **Tác động tới CSDL & Prisma Query**:
   - Mọi câu truy vấn danh sách (Select query) của HR đều phải tự động nối điều kiện `postedById = req.user.id` (nếu không phải ADMIN) để tránh rò rỉ dữ liệu giữa các HR.
   - Các bảng ghi ứng tuyển `Application` phải đảm bảo liên kết chính xác với `CandidateProfile.userId` để ứng viên chỉ xem được đơn của mình.
2. **Tác động tới Phân hệ AI**:
   - Chỉ HR phụ trách tin tuyển dụng hoặc ADMIN mới có quyền trigger gọi AI Service tính toán lại điểm.
   - Ứng viên không được quyền tự ý gọi API chạy AI hoặc xem trực tiếp các tiêu chí trọng số cấu hình nội bộ của HR.
3. **Tác động tới Phân hệ Thông báo & Email**:
   - Khi HR chuyển trạng thái hồ sơ ứng viên (ví dụ: sang `SHORTLISTED` hoặc `REJECTED`), hệ thống chỉ phát sinh thông báo tới tài khoản của ứng viên sở hữu đơn đó, không gửi thông báo nhầm lẫn tới các ứng viên khác.
4. **Tác động tới Quản lý Tệp tin (CV Storage)**:
   - Các tệp CV tải lên trong `uploads/cv/` phải được bảo vệ qua endpoint tải tệp có kiểm tra xác thực (Authenticated File Streaming), tránh để lộ đường dẫn tĩnh công khai cho phép ai cũng tải được CV của người khác.
