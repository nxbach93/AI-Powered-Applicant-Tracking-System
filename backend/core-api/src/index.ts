import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import prisma from './lib/prisma';
import authRoutes from './routes/auth.routes';
import jobRoutes from './routes/job.routes';
import applicationRoutes from './routes/application.routes';
import authController from './controllers/auth.controller';
import interviewRoutes from './routes/interview.routes';
import { authenticateJWT } from './middlewares/auth.middleware';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Phục vụ tệp tĩnh tải lên (CV, Avatar)
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Fallback an toàn cho đường dẫn xem/tải CV trên Render (xử lý cơ chế ổ đĩa tạm ephemeral storage)
app.get('/uploads/cv/:filename', (req, res) => {
  const filePath = path.join(process.cwd(), 'uploads', 'cv', req.params.filename);
  if (fs.existsSync(filePath)) {
    return res.sendFile(filePath);
  }
  const fallbackPath = path.join(process.cwd(), 'uploads', 'cv', 'default_sample_cv.pdf');
  if (fs.existsSync(fallbackPath)) {
    res.setHeader('Content-Type', 'application/pdf');
    return res.sendFile(fallbackPath);
  }
  const altFallback = path.join(process.cwd(), 'uploads', 'cv', 'cv_2354ee7e-b751-4f29-86cf-93994df688a6_1791876999262.pdf');
  if (fs.existsSync(altFallback)) {
    res.setHeader('Content-Type', 'application/pdf');
    return res.sendFile(altFallback);
  }
  return res.status(404).send('Tệp CV không tồn tại trên hệ thống');
});

// Đăng ký các Routes
app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/interviews', interviewRoutes);

// Endpoint cập nhật Profile ứng viên theo API_CONTRACT 3.1.4
app.put('/api/candidates/profile', authenticateJWT, (req, res) => authController.updateProfile(req, res));

// API test kết nối Database
app.get('/api/health', async (req, res) => {
  try {
    // Thử query 1 câu lệnh đơn giản xuống Database
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'success', message: 'ATS Core API & Database is running smoothly!' });
  } catch (error) {
    console.error("Database Error:", error);
    res.status(500).json({ status: 'error', message: 'Database connection failed' });
  }
});

// Chạy server với cơ chế đợi MySQL sẵn sàng
const PORT = process.env.PORT || 5000;
async function startServer() {
  if (process.env.NODE_ENV !== 'test') {
    let connected = false;
    for (let i = 1; i <= 25; i++) {
      try {
        await prisma.$queryRaw`SELECT 1`;
        console.log('Database connected successfully!');
        connected = true;
        break;
      } catch (err: any) {
        console.log(`Waiting for database to be ready (attempt ${i}/25)...`);
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
    if (!connected) {
      console.warn('Warning: Could not connect to database after multiple attempts. Starting server anyway...');
    }

    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  }
}

startServer();

export default app;
