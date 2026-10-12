# BÁO CÁO PHÂN TÍCH KHOẢNG TRỐNG KỸ THUẬT (GAP ANALYSIS)

---

## 1. MỤC TIÊU PHÂN TÍCH

Tài liệu này đối chiếu toàn diện giữa:
- **Tài liệu Báo cáo Đồ án** (Chương 3: Phân tích & Thiết kế Hệ thống, đặc tả Use Case, biểu đồ lớp, biểu đồ hoạt động, biểu đồ trình tự).
- **Thực trạng Source Code trong Repository** (Frontend Next.js, Backend Express Core API, AI Service FastAPI, Cơ sở dữ liệu Prisma MySQL).

Mục tiêu là phát hiện tất cả các khoảng trống (Gaps), đánh giá mức độ ảnh hưởng và đề xuất giải pháp xử lý tương thích mà **không phá vỡ kiến trúc, không sửa database bừa bãi và không thay đổi công nghệ**.

---

## 2. MA TRẬN ĐỐI CHIẾU CHỨC NĂNG & HIỆN TRẠNG (GAP MATRIX)

| Mã Use Case | Tên chức năng (Theo Báo cáo Ch.3) | Đặc tả trong Báo cáo (UML / Flow) | Hiện trạng thực tế trong Source Code | Mức độ Gap | Đề xuất giải pháp kỹ thuật |
|---|---|---|---|:---:|---|
| **UC01** | **Đăng nhập, đăng ký** | Bảng 5, H.3.2, Activity 3.2.5.3-4, Sequence 3.2.7.1, State 3.2.7.1. Hỗ trợ HR và Ứng viên, đăng ký, đăng nhập JWT, quên mật khẩu. | - `backend/core-api/src/controllers/auth.controller.ts` là file rỗng/placeholder.<br>- `frontend/src/app` chưa có trang `/auth/login` hay `/auth/register`.<br>- Bảng `User` trong Prisma đã sẵn sàng (`email`, `password`, `role`). | 🔴 **CRITICAL** | Triển khai `auth.controller.ts` & `auth.service.ts` với `bcryptjs` và `jsonwebtoken`. Dựng trang Login/Register trên Next.js kết nối API. |
| **UC02** | **Quản lý tài khoản** | Bảng 6, H.3.3, Activity 3.2.5.5, Sequence 3.2.7.2, State 3.2.7.2. Cập nhật thông tin cá nhân, đổi mật khẩu, đăng xuất. | - Controller/service tài khoản chưa có logic.<br>- Frontend chưa có màn hình Profile. | 🟡 **HIGH** | Bổ sung endpoint `GET /api/auth/me` và `PUT /api/auth/profile`. Tạo giao diện User Profile cho cả HR và Ứng viên. |
| **UC03** | **Quản lý tin tuyển dụng** | Bảng 7, H.3.4, Activity 3.2.5.6, Sequence 3.2.7.3, State 3.2.7.3. HR tạo, sửa, xóa, đóng/mở tin JD, tìm kiếm tin. | - `src/controllers/jobs.controller.ts` là placeholder.<br>- `JobPosting` model trong Prisma đã có đầy đủ trường nghiệp vụ (`title`, `description`, `requirements`, `salaryMin/Max`, `status`).<br>- Frontend chưa có giao diện CRUD Job cho HR. | 🔴 **CRITICAL** | Triển khai CRUD API `/api/jobs` qua Prisma. Xây dựng trang Quản lý tin tuyển dụng trong HR Dashboard và trang xem tin công khai cho Ứng viên. |
| **UC04** | **Tiếp nhận hồ sơ CV** | Bảng 8, H.3.5, Activity 3.2.5.7, Sequence 3.2.7.5. HR xem danh sách CV, mở file chi tiết, cập nhật trạng thái qua từng vòng. | - `application.controller.ts` là placeholder.<br>- Chưa cấu hình upload file Multer để lưu file CV vật lý.<br>- Model `Application` đã có enum `ApplicationStatus`. | 🔴 **CRITICAL** | Cấu hình middleware Multer lưu tệp vào `uploads/cv/`. Triển khai API `/api/applications` và màn hình Application List cho HR. |
| **UC05** | **Phân tích & sàng lọc CV bằng AI** | Bảng 9, H.3.6, Activity 3.2.5.2, Sequence 3.2.7.7. Trích xuất NLP (Tên, Kỹ năng, Học vấn), tính Cosine Similarity giữa CV và JD, cấu hình trọng số (Extend), xếp hạng Ranking. | - `ai-service/app/services/nlp.py` và `endpoints.py` đang trả dữ liệu giả lập (mock dummy JSON).<br>- Chưa nạp mô hình `spaCy` và `sentence-transformers` thật.<br>- Chưa có module đọc PDF/DOCX.<br>- `core-api/src/controllers/ai.controller.ts` là placeholder. | 🔴 **CRITICAL** | Hoàn thiện pipeline NLP: Trích xuất text từ tệp CV -> spaCy NER -> Sentence-Transformers embedding -> Cosine Similarity -> Trọng số điểm. Nối Core API sang AI Service qua REST. |
| **UC06** | **Lên lịch phỏng vấn & gửi thông báo** | Bảng 10, H.3.7, Activity 3.2.5.8, Sequence 3.2.7.8. HR lên lịch phỏng vấn (Ngày giờ, Địa điểm, Online meeting), tự động gửi email thông báo cho ứng viên. | - Model `Interview` trong Prisma đã có đầy đủ trường.<br>- Chưa có controller/service xử lý Interview.<br>- Chưa có module gửi Email (Nodemailer). | 🟡 **HIGH** | Triển khai API CRUD `/api/interviews`. Tích hợp gửi email thông báo tự động (Nodemailer hoặc email log/notification feed). |
| **UC07** | **Báo cáo thống kê** | Bảng 11, H.3.8, Activity 3.2.5.9, Sequence 3.2.7.9. Dashboard trực quan: số lượng CV theo chiến dịch, tỷ lệ chuyển đổi, xuất báo cáo. | - Chưa có API tổng hợp thống kê.<br>- Chưa có giao diện Chart/Dashboard phía Frontend. | 🟡 **HIGH** | Xây dựng API `/api/analytics/overview` tổng hợp số liệu từ `JobPosting`, `Application`, `Interview`. Dựng trang Dashboard với biểu đồ trực quan. |
| **UC08** | **Quản lý CV (Ứng viên)** | Bảng 12, H.3.9, Activity 3.2.5.1, Sequence 3.2.7.4. Ứng viên tải lên CV (PDF/DOCX), nộp hồ sơ vào JD, tra cứu hồ sơ đã nộp, hủy nộp hồ sơ. | - Chưa có endpoint cho Ứng viên nộp CV và xem lịch sử ứng tuyển.<br>- `ApplicationStatus` có giá trị `WITHDRAWN` nhưng chưa có API kích hoạt. | 🔴 **CRITICAL** | Triển khai API `POST /api/applications` (kèm upload file) và `GET /api/applications/my-applications`, API hủy đơn `PUT /api/applications/:id/withdraw`. |
| **UC09** | **Xem thông báo, lịch phỏng vấn (Ứng viên)** | Bảng 13, H.3.10, Activity 3.2.5.10, Sequence 3.2.7.6. Ứng viên nhận thông báo kết quả (Trúng/Trượt), xem thời gian/địa điểm phỏng vấn. | - Chưa có bảng `Notification` trong CSDL Prisma.<br>- Chưa có API lấy lịch phỏng vấn của ứng viên. | 🟡 **HIGH** | Tổng hợp lịch phỏng vấn và trạng thái hồ sơ của ứng viên thành nguồn thông báo động (Virtual Notification Feed) trả về qua API. |

---

## 3. PHÂN TÍCH CHI TIẾT CÁC KHOẢNG TRỐNG KIẾN TRÚC & DỮ LIỆU

### 3.1. Khoảng trống CSDL: Báo cáo Word vs Prisma Schema thực tế
1. **Mục 3.2.8 "Thiết kế cơ sở dữ liệu vật lý" trong Báo cáo đang bị BỎ TRỐNG**:
   - Trong file `.docx` nộp duyệt, mục 3.2.8 hoàn toàn không có bảng dữ liệu và không có văn bản nào.
   - **Tác động**: Đây là thiếu sót lớn của tài liệu báo cáo học thuật.
   - **Giải pháp**: Cơ sở dữ liệu vật lý thực tế đã được xây dựng hoàn chỉnh và chuẩn hóa trong `schema.prisma`. Cần lấy cấu trúc từ `schema.prisma` để cập nhật bổ sung vào mục 3.2.8 của Báo cáo đồ án.
2. **Khác biệt về Tên gọi & Mô hình Quan hệ**:
   - *Báo cáo*: Sử dụng mô hình thực thể tiếng Việt gồm 10 lớp: `User`, `ThongBao`, `CongTy`, `Hr`, `NganhNghe`, `TinTuyenDung`, `UngVien`, `HoSoCv`, `UngTuyen`, `LichPhongVan`.
   - *Codebase (`schema.prisma`)*: Chuẩn hóa bằng tiếng Anh theo chuẩn công nghiệp: `User`, `CandidateProfile`, `JobPosting`, `Application`, `Interview`.
   - *Giải pháp*: **GIỮ NGUYÊN `schema.prisma`**. Không sửa tên bảng hay cấu trúc database hiện có vì schema Prisma đang rất tối ưu, có quan hệ khóa ngoại chặt chẽ và đã tích hợp sẵn các trường dữ liệu AI (`aiMatchScore`, `parsedSkills`, `aiAnalysisSummary`).

### 3.2. Khoảng trống Phân hệ AI Microservice
1. **Code hiện tại chỉ là Dummy Mock**:
   - File `backend/ai-service/app/services/nlp.py` và `app/api/endpoints.py` hiện trả về dữ liệu giả lập cố định (hardcoded score 85%, danh sách kỹ năng fix cứng).
   - Chưa tích hợp thư viện đọc văn bản từ file PDF (`PyPDF2`/`pdfplumber`) hoặc DOCX (`python-docx`).
2. **Thiếu hỗ trợ Cấu hình Trọng số (Criteria Weights)**:
   - Theo Use Case mở rộng (Extend) trong Báo cáo và Activity Diagram 3.2.5.2, HR có quyền điều chỉnh tỷ lệ ưu tiên giữa Kỹ năng (Skills) và Kinh nghiệm (Experience).
   - API của AI Service hiện chưa nhận tham số `weights` (ví dụ: `skill_weight: 0.7, exp_weight: 0.3`).
   - *Giải pháp*: Mở rộng schema Pydantic trong `ai-service` để tiếp nhận `weights` và tính điểm tổng hợp theo công thức:
     $$\text{FinalScore} = (w_{\text{skill}} \times \text{SkillMatch}) + (w_{\text{exp}} \times \text{ExpMatch}) + (w_{\text{sem}} \times \text{CosineSimilarity})$$

### 3.3. Khoảng trống Phân hệ Core API Backend
1. **Các Controllers và Services đang là Placeholder rỗng**:
   - Thư mục `src/controllers/`, `src/services/`, `src/routes/` đã có file khung nhưng chưa được viết mã thực thi.
   - `src/index.ts` mới chỉ lắng nghe cổng 5000 và có duy nhất route `/health`.
2. **Chưa có Middleware Upload File**:
   - Cần cấu hình `multer` để xử lý upload tệp CV từ multipart form, kiểm tra định dạng (`.pdf`, `.docx`) và giới hạn dung lượng (tối đa 5MB theo Bảng 12).
3. **Chưa có cấu hình kết nối AI Service**:
   - Cần service client (Axios HTTP) từ Core API gọi sang `http://localhost:8000/api/ai/...` để gửi CV/JD và nhận kết quả phân tích.

### 3.4. Khoảng trống Phân hệ Giao diện Frontend
1. **Mới chỉ có trang Landing Page tĩnh**:
   - Trang `src/app/page.tsx` hiện tại chỉ kiểm tra trạng thái Backend `/health`.
2. **Thiếu toàn bộ các phân hệ giao diện nghiệp vụ**:
   - *Phân hệ Xác thực*: Màn hình Đăng nhập, Đăng ký (phân tách luồng HR vs Ứng viên).
   - *Phân hệ Ứng viên*: Xem tin tuyển dụng, Form nộp hồ sơ upload CV, Xem hồ sơ cá nhân và theo dõi trạng thái ứng tuyển.
   - *Phân hệ HR*: Dashboard quản lý tin tuyển dụng, Danh sách hồ sơ CV, Màn hình AI Screening & Ranking, Popup lên lịch phỏng vấn, Dashboard báo cáo thống kê.

---

## 4. MA TRẬN ĐÁNH GIÁ RỦI RO & BIỆN PHÁP PHÒNG NGỪA

| Rủi ro kỹ thuật | Mức độ | Biện pháp phòng ngừa |
|---|:---:|---|
| **Mô hình AI Sentence-Transformers tốn tài nguyên và thời gian tải lần đầu** | Cao | Sử dụng mô hình nhẹ, hiệu quả cao như `all-MiniLM-L6-v2` (dung lượng ~80MB, tốc độ suy luận nhanh trên CPU) và nạp mô hình vào bộ nhớ (Preload) khi khởi động FastAPI service. |
| **Định dạng CV ứng viên quá đa dạng (PDF scan, hình ảnh, bảng biểu phức tạp)** | Trung bình | Sử dụng kết hợp `pdfplumber` / `PyPDF2` để bóc tách văn bản thô, áp dụng tiền xử lý chuỗi (Regex làm sạch ký tự lạ) trước khi đưa vào mô hình NLP. |
| **Xung đột phiên bản thư viện hoặc môi trường Node/Python** | Trung bình | Khóa phiên bản rõ ràng trong `package.json` và `requirements.txt`. Cung cấp file hướng dẫn thiết lập môi trường `.env.example` đầy đủ. |
| **Lỗi kết nối liên dịch vụ (Core API không gọi được AI Service)** | Thấp | Thiết lập cơ chế Timeout, Retry và Fallback an toàn trong Core API: Nếu AI Service tạm thời không phản hồi, ứng dụng vẫn lưu CV thành công và đưa vào hàng đợi chờ xử lý sau. |
