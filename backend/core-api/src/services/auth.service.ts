import bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';
import prisma from '../lib/prisma';

export interface RegisterCandidateDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: string;
}

export interface ValidationErrorDetail {
  field: string;
  message: string;
}

export class ValidationError extends Error {
  details: ValidationErrorDetail[];
  constructor(message: string, details: ValidationErrorDetail[] = []) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
  }
}

export class ConflictError extends Error {
  code: string;
  constructor(message: string, code = 'EMAIL_ALREADY_EXISTS') {
    super(message);
    this.name = 'ConflictError';
    this.code = code;
  }
}

export class AuthService {
  /**
   * Đăng ký tài khoản cho ứng viên (CANDIDATE)
   */
  async registerCandidate(data: RegisterCandidateDto) {
    const { email, password, firstName, lastName, role } = data;
    const errors: ValidationErrorDetail[] = [];

    // 1. Kiểm tra trường bắt buộc
    if (!email || typeof email !== 'string' || !email.trim()) {
      errors.push({ field: 'email', message: 'Email không được để trống' });
    } else {
      // Validate định dạng email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        errors.push({ field: 'email', message: 'Định dạng email không hợp lệ' });
      }
    }

    if (!password || typeof password !== 'string') {
      errors.push({ field: 'password', message: 'Mật khẩu không được để trống' });
    } else if (password.length < 6) {
      errors.push({ field: 'password', message: 'Mật khẩu phải có độ dài tối thiểu 6 ký tự' });
    }

    if (!firstName || typeof firstName !== 'string' || !firstName.trim()) {
      errors.push({ field: 'firstName', message: 'Họ và tên đệm không được để trống' });
    }

    if (!lastName || typeof lastName !== 'string' || !lastName.trim()) {
      errors.push({ field: 'lastName', message: 'Tên không được để trống' });
    }

    // 2. Chặn việc client cố tình đăng ký với role ADMIN hoặc HR qua cổng ứng viên
    if (role && (role.toUpperCase() === UserRole.ADMIN || role.toUpperCase() === UserRole.HR)) {
      errors.push({
        field: 'role',
        message: 'Không được phép tự đăng ký tài khoản với quyền ADMIN hoặc HR'
      });
    }

    if (errors.length > 0) {
      throw new ValidationError('Dữ liệu đăng ký không hợp lệ', errors);
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 3. Kiểm tra email đã tồn tại hay chưa
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (existingUser) {
      throw new ConflictError('Email này đã được đăng ký trong hệ thống');
    }

    // 4. Hash mật khẩu bằng bcryptjs với salt rounds = 10
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 5. Tạo User mới trong DB với role CANDIDATE và kèm CandidateProfile rỗng
    const newUser = await prisma.user.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        role: UserRole.CANDIDATE,
        candidateProfile: {
          create: {}
        }
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        avatarUrl: true,
        isActive: true,
        createdAt: true
      }
    });

    return newUser;
  }
}

export default new AuthService();
