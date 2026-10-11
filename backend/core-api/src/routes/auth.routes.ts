import { Router } from 'express';
import authController from '../controllers/auth.controller';
import { authenticateJWT } from '../middlewares/auth.middleware';

const router = Router();

// POST /api/auth/register - Đăng ký tài khoản ứng viên
router.post('/register', (req, res) => authController.register(req, res));

// POST /api/auth/login - Đăng nhập hệ thống
router.post('/login', (req, res) => authController.login(req, res));

// GET /api/auth/me - Lấy thông tin tài khoản hiện tại (Yêu cầu JWT)
router.get('/me', authenticateJWT, (req, res) => authController.getMe(req, res));

// PUT /api/auth/profile - Cập nhật thông tin tài khoản cá nhân (Yêu cầu JWT)
router.put('/profile', authenticateJWT, (req, res) => authController.updateProfile(req, res));

// PUT /api/auth/change-password - Đổi mật khẩu tài khoản (Yêu cầu JWT)
router.put('/change-password', authenticateJWT, (req, res) => authController.changePassword(req, res));

export default router;
