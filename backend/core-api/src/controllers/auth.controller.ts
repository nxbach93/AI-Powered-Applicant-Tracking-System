import { Request, Response } from 'express';
import authService, { ValidationError, ConflictError, UnauthorizedError } from '../services/auth.service';

export class AuthController {
  /**
   * POST /api/auth/register
   * Đăng ký tài khoản Candidate
   */
  async register(req: Request, res: Response) {
    try {
      const user = await authService.registerCandidate(req.body);

      return res.status(201).json({
        success: true,
        message: 'Đăng ký tài khoản thành công',
        data: {
          user
        }
      });
    } catch (error: any) {
      if (error instanceof ValidationError) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message,
            details: error.details
          }
        });
      }

      if (error instanceof ConflictError) {
        return res.status(409).json({
          success: false,
          error: {
            code: error.code,
            message: error.message
          }
        });
      }

      console.error('Lỗi không xác định trong quá trình đăng ký:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Lỗi hệ thống khi xử lý đăng ký tài khoản'
        }
      });
    }
  }

  /**
   * POST /api/auth/login
   * Đăng nhập hệ thống (Candidate, HR, Admin)
   */
  async login(req: Request, res: Response) {
    try {
      const result = await authService.login(req.body);

      return res.status(200).json({
        success: true,
        message: 'Đăng nhập thành công',
        data: {
          user: result.user,
          token: result.token
        }
      });
    } catch (error: any) {
      if (error instanceof ValidationError) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message,
            details: error.details
          }
        });
      }

      if (error instanceof UnauthorizedError) {
        return res.status(401).json({
          success: false,
          error: {
            code: error.code,
            message: error.message
          }
        });
      }

      console.error('Lỗi không xác định trong quá trình đăng nhập:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Lỗi hệ thống khi xử lý đăng nhập'
        }
      });
    }
  }

  /**
   * GET /api/auth/me
   * Lấy thông tin tài khoản đang đăng nhập
   */
  async getMe(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Yêu cầu token xác thực hợp lệ'
          }
        });
      }

      const user = await authService.getMe(userId);

      return res.status(200).json({
        success: true,
        data: user
      });
    } catch (error: any) {
      if (error instanceof UnauthorizedError) {
        return res.status(401).json({
          success: false,
          error: {
            code: error.code,
            message: error.message
          }
        });
      }

      console.error('Lỗi khi lấy thông tin người dùng:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Lỗi hệ thống khi lấy thông tin người dùng'
        }
      });
    }
  }
}

export default new AuthController();
