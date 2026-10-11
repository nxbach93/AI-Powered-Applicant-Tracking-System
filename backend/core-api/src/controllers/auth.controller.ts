import { Request, Response } from 'express';
import authService, { ValidationError, ConflictError } from '../services/auth.service';

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
}

export default new AuthController();
