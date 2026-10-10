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
