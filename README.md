# AI-Powered Applicant Tracking System (ATS)

An advanced Applicant Tracking System integrated with Artificial Intelligence to automate CV parsing, skill extraction, and JD-CV semantic matching.

## 🚀 Tech Stack

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Zustand, TanStack Query.
- **Backend Core:** Node.js (Express), TypeScript, Prisma ORM, MySQL (XAMPP).
- **Backend AI Service:** Python, FastAPI, Spacy, Sentence-Transformers.

## 📂 Project Structure

```text
XD&PTPM/
├── frontend/                        # Next.js Application
│   ├── src/app/                     # App Router (Pages: Admin, HR, Candidate)
│   ├── src/components/              # Reusable UI components
│   └── ...
├── backend/                         # Microservices Workspace
│   ├── core-api/                    # Node.js + Express + Prisma (Port: 5000)
│   │   ├── src/controllers/
│   │   ├── src/routes/
│   │   └── prisma/schema.prisma
│   └── ai-service/                  # Python + FastAPI (Port: 8000)
│       ├── app/api/
│       ├── app/services/
│       └── requirements.txt
└── README.md
```

## 🐳 Local Development Database (Docker Compose)

Khởi chạy cơ sở dữ liệu MySQL 8.0.41 bằng Docker cho môi trường lập trình nhóm:

1. **Chuẩn bị cấu hình môi trường Docker**:
   ```bash
   cp .env.example .env
   ```

2. **Khởi động MySQL Container**:
   ```bash
   docker compose up -d
   ```

3. **Kiểm tra trạng thái sẵn sàng (Healthcheck)**:
   ```bash
   docker compose ps
   ```

4. **Cấu hình Backend Core API kết nối CSDL**:
   ```bash
   cd backend/core-api
   cp .env.example .env
   ```
   Chuỗi `DATABASE_URL` kết nối tới MySQL container:
   ```env
   DATABASE_URL="mysql://ats_app_user:ats_dev_password_change_me@127.0.0.1:3306/ats_database"
   ```

5. **Dừng container khi nghỉ làm việc**:
   ```bash
   docker compose down
   ```
   *(Dữ liệu được lưu an toàn trong named volume `ats_mysql_data`, không bị mất khi hạ container)*
