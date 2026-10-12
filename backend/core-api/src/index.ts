import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import prisma from './lib/prisma';
import authRoutes from './routes/auth.routes';
import jobRoutes from './routes/job.routes';
import applicationRoutes from './routes/application.routes';
import authController from './controllers/auth.controller';
import { authenticateJWT } from './middlewares/auth.middleware';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Phục vụ tệp tĩnh tải lên (CV, Avatar)
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Đăng ký các Routes
app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/applications', applicationRoutes);

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

// Chạy server
const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

export default app;