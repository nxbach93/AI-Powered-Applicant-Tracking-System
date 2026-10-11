import { Router } from 'express';
import authController from '../controllers/auth.controller';

const router = Router();

// POST /api/auth/register - Đăng ký tài khoản ứng viên
router.post('/register', (req, res) => authController.register(req, res));

export default router;
