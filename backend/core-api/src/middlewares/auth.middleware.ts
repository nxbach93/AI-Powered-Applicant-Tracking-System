import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';
import prisma from '../lib/prisma';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  firstName?: string;
  lastName?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/**
 * Middleware xác thực JSON Web Token (JWT)
 * Kiểm tra header Authorization: Bearer <token>
 * Giải mã token và xác nhận tài khoản người dùng đang hoạt động
 */
export const authenticateJWT = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Yêu cầu token xác thực hợp lệ'
      }
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const secret = process.env.JWT_SECRET || 'ats-secret-jwt-key-2026-development';
    const decoded = jwt.verify(token, secret) as {
      userId: string;
      email: string;
      role: UserRole;
      tokenVersion?: number;
    };

    // Kiểm tra người dùng còn tồn tại và đang hoạt động trong database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        tokenVersion: true,
        firstName: true,
        lastName: true
      }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Tài khoản không tồn tại hoặc đã bị vô hiệu hóa'
        }
      });
    }

    // Kiểm tra tokenVersion để thu hồi các JWT token cũ sau khi mật khẩu được đặt lại
    const currentTokenVersion = user.tokenVersion ?? 0;
    const tokenVersionInJwt = decoded.tokenVersion ?? 0;
    if (tokenVersionInJwt !== currentTokenVersion) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Phiên đăng nhập đã hết hiệu lực do mật khẩu đã thay đổi. Vui lòng đăng nhập lại.'
        }
      });
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName
    };

    next();
  } catch (error: any) {
    const isExpired = error.name === 'TokenExpiredError';
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: isExpired
          ? 'Token đã hết hạn. Vui lòng đăng nhập lại.'
          : 'Token xác thực không hợp lệ'
      }
    });
  }
};

/**
 * Middleware phân quyền dựa trên vai trò (Role-Based Authorization)
 * Cho phép khai báo một hoặc nhiều UserRole được phép truy cập
 * Ví dụ: authorizeRoles(UserRole.HR, UserRole.ADMIN)
 */
export const authorizeRoles = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // 1. Kiểm tra xem người dùng đã được xác thực qua authenticateJWT hay chưa
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Yêu cầu token xác thực hợp lệ trước khi kiểm tra quyền'
        }
      });
    }

    // 2. Kiểm tra xem vai trò của user có nằm trong danh sách được phép hay không
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Bạn không có quyền truy cập tài nguyên này'
        }
      });
    }

    next();
  };
};
