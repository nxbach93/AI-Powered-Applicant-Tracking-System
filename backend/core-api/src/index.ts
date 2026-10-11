import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import prisma from './lib/prisma';
import authRoutes from './routes/auth.routes';

// Khởi tạo các biến môi trường từ file .env
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Đăng ký các Routes
app.use('/api/auth', authRoutes);

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
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});