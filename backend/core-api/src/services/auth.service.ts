import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';
import prisma from '../lib/prisma';
import emailService from './email.service';

export interface RegisterCandidateDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: string;
}

export interface LoginDto {
  email: string;
  password: string;
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

export class UnauthorizedError extends Error {
  code: string;
  constructor(message: string, code = 'INVALID_CREDENTIALS') {
    super(message);
    this.name = 'UnauthorizedError';
    this.code = code;
  }
}

export class RateLimitError extends Error {
  code: string;
  constructor(message: string, code = 'TOO_MANY_REQUESTS') {
    super(message);
    this.name = 'RateLimitError';
    this.code = code;
  }
}

export class AuthService {
  // Bộ nhớ đệm giới hạn tần suất gửi email reset password (in-memory rate limiter)
  private resetEmailRequestLog = new Map<string, number[]>();

  private checkRateLimit(email: string) {
    const now = Date.now();
    const windowMs = 15 * 60 * 1000; // Khung thời gian 15 phút
    const maxRequests = 3; // Tối đa 3 yêu cầu trong 15 phút

    const timestamps = this.resetEmailRequestLog.get(email) || [];
    const validTimestamps = timestamps.filter(ts => now - ts < windowMs);

    if (validTimestamps.length >= maxRequests) {
      throw new RateLimitError('Bạn đã gửi yêu cầu quá nhiều lần. Vui lòng thử lại sau 15 phút.');
    }

    validTimestamps.push(now);
    this.resetEmailRequestLog.set(email, validTimestamps);
  }
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

  /**
   * Đăng nhập hệ thống (POST /api/auth/login)
   */
  async login(data: LoginDto) {
    const { email, password } = data;
    const errors: ValidationErrorDetail[] = [];

    if (!email || typeof email !== 'string' || !email.trim()) {
      errors.push({ field: 'email', message: 'Vui lòng nhập địa chỉ email' });
    }

    if (!password || typeof password !== 'string') {
      errors.push({ field: 'password', message: 'Vui lòng nhập mật khẩu' });
    }

    if (errors.length > 0) {
      throw new ValidationError('Dữ liệu đăng nhập không hợp lệ', errors);
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 1. Tìm người dùng theo email
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    // 2. Kiểm tra nếu không tìm thấy user: thông báo lỗi chung không làm lộ email tồn tại hay không
    if (!user) {
      throw new UnauthorizedError('Email hoặc mật khẩu không chính xác', 'INVALID_CREDENTIALS');
    }

    // 3. Kiểm tra so khớp mật khẩu bằng bcryptjs
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Email hoặc mật khẩu không chính xác', 'INVALID_CREDENTIALS');
    }

    // 4. Kiểm tra trạng thái tài khoản
    if (!user.isActive) {
      throw new UnauthorizedError('Tài khoản đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên.', 'ACCOUNT_INACTIVE');
    }

    // 5. Tạo JWT Token với thời hạn cấu hình từ env (mặc định 7d)
    const jwtSecret = process.env.JWT_SECRET || 'ats-secret-jwt-key-2026-development';
    const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        tokenVersion: user.tokenVersion ?? 0
      },
      jwtSecret,
      { expiresIn: jwtExpiresIn as any }
    );

    // 6. Trả về thông tin an toàn (loại bỏ password) và token
    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        avatarUrl: user.avatarUrl
      },
      token
    };
  }

  /**
   * Lấy thông tin tài khoản hiện tại (GET /api/auth/me)
   */
  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        avatarUrl: true,
        isActive: true,
        createdAt: true,
        candidateProfile: {
          select: {
            id: true,
            phone: true,
            dateOfBirth: true,
            address: true,
            summary: true,
            cvFileUrl: true,
            parsedSkills: true,
            experienceYears: true,
            education: true
          }
        }
      }
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedError('Người dùng không tồn tại hoặc đã bị vô hiệu hóa', 'UNAUTHORIZED');
    }

    // Đảm bảo không bao giờ trả về password/hash (defense-in-depth)
    const { password, ...safeUser } = user as any;
    return safeUser;
  }

  /**
   * Cập nhật thông tin tài khoản cá nhân (PUT /api/auth/profile)
   */
  async updateProfile(userId: string, data: UpdateProfileDto) {
    const errors: ValidationErrorDetail[] = [];

    // 1. Kiểm tra tài khoản tồn tại và đang hoạt động
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { candidateProfile: true }
    });

    if (!existingUser || !existingUser.isActive) {
      throw new UnauthorizedError('Tài khoản không tồn tại hoặc đã bị vô hiệu hóa', 'UNAUTHORIZED');
    }

    // 2. Validate và lọc các trường User được phép cập nhật
    const userUpdateData: { firstName?: string; lastName?: string; avatarUrl?: string | null } = {};

    if (data.firstName !== undefined) {
      if (typeof data.firstName !== 'string' || !data.firstName.trim()) {
        errors.push({ field: 'firstName', message: 'Họ và tên đệm không được để trống' });
      } else {
        userUpdateData.firstName = data.firstName.trim();
      }
    }

    if (data.lastName !== undefined) {
      if (typeof data.lastName !== 'string' || !data.lastName.trim()) {
        errors.push({ field: 'lastName', message: 'Tên không được để trống' });
      } else {
        userUpdateData.lastName = data.lastName.trim();
      }
    }

    if (data.avatarUrl !== undefined && data.avatarUrl !== null && data.avatarUrl !== '') {
      if (typeof data.avatarUrl !== 'string') {
        errors.push({ field: 'avatarUrl', message: 'Định dạng đường dẫn ảnh đại diện không hợp lệ' });
      } else {
        const urlRegex = /^(https?:\/\/|\/uploads\/)/i;
        if (!urlRegex.test(data.avatarUrl.trim())) {
          errors.push({
            field: 'avatarUrl',
            message: 'Ảnh đại diện phải là URL hợp lệ (bắt đầu bằng http://, https:// hoặc /uploads/)'
          });
        } else {
          userUpdateData.avatarUrl = data.avatarUrl.trim();
        }
      }
    } else if (data.avatarUrl === null || data.avatarUrl === '') {
      userUpdateData.avatarUrl = null;
    }

    // 3. Validate và lọc các trường CandidateProfile nếu có
    const profileUpdateData: Record<string, any> = {};

    if (data.phone !== undefined) {
      if (data.phone === null || (typeof data.phone === 'string' && data.phone.trim() === '')) {
        profileUpdateData.phone = null;
      } else if (typeof data.phone === 'string') {
        const phoneRegex = /^[0-9]{10,11}$/;
        if (!phoneRegex.test(data.phone.trim())) {
          errors.push({ field: 'phone', message: 'Số điện thoại phải gồm 10 đến 11 chữ số' });
        } else {
          profileUpdateData.phone = data.phone.trim();
        }
      }
    }

    if (data.dateOfBirth !== undefined) {
      if (!data.dateOfBirth) {
        profileUpdateData.dateOfBirth = null;
      } else {
        const dob = new Date(data.dateOfBirth);
        if (isNaN(dob.getTime())) {
          errors.push({ field: 'dateOfBirth', message: 'Ngày sinh không đúng định dạng ngày tháng' });
        } else {
          profileUpdateData.dateOfBirth = dob;
        }
      }
    }

    if (data.address !== undefined) {
      profileUpdateData.address = typeof data.address === 'string' ? data.address.trim() : null;
    }

    if (data.summary !== undefined) {
      profileUpdateData.summary = typeof data.summary === 'string' ? data.summary.trim() : null;
    }

    if (data.education !== undefined) {
      profileUpdateData.education = typeof data.education === 'string' ? data.education.trim() : null;
    }

    if (data.experienceYears !== undefined && data.experienceYears !== null) {
      const exp = Number(data.experienceYears);
      if (isNaN(exp) || exp < 0) {
        errors.push({ field: 'experienceYears', message: 'Số năm kinh nghiệm phải là số không âm' });
      } else {
        profileUpdateData.experienceYears = Math.floor(exp);
      }
    } else if (data.experienceYears === null) {
      profileUpdateData.experienceYears = null;
    }

    if (errors.length > 0) {
      throw new ValidationError('Dữ liệu cập nhật hồ sơ không hợp lệ', errors);
    }

    // 4. Cập nhật User nếu có thay đổi
    if (Object.keys(userUpdateData).length > 0) {
      await prisma.user.update({
        where: { id: userId },
        data: userUpdateData
      });
    }

    // 5. Cập nhật CandidateProfile nếu là CANDIDATE và có trường profile được truyền
    if (existingUser.role === UserRole.CANDIDATE && Object.keys(profileUpdateData).length > 0) {
      await prisma.candidateProfile.upsert({
        where: { userId },
        create: {
          userId,
          ...profileUpdateData
        },
        update: profileUpdateData
      });
    }

    // 6. Trả về thông tin người dùng sau cập nhật (đã loại bỏ password)
    return await this.getMe(userId);
  }

  /**
   * Đổi mật khẩu tài khoản (PUT /api/auth/change-password)
   */
  async changePassword(userId: string, data: ChangePasswordDto) {
    const errors: ValidationErrorDetail[] = [];

    const currentPass = data.currentPassword || data.oldPassword;
    const newPass = data.newPassword;

    // 1. Kiểm tra trường bắt buộc
    if (!currentPass || typeof currentPass !== 'string') {
      errors.push({ field: 'currentPassword', message: 'Vui lòng nhập mật khẩu hiện tại' });
    }

    if (!newPass || typeof newPass !== 'string') {
      errors.push({ field: 'newPassword', message: 'Vui lòng nhập mật khẩu mới' });
    } else if (newPass.length < 6) {
      errors.push({ field: 'newPassword', message: 'Mật khẩu mới phải có độ dài tối thiểu 6 ký tự' });
    }

    if (errors.length > 0) {
      throw new ValidationError('Dữ liệu đổi mật khẩu không hợp lệ', errors);
    }

    // 2. Tìm tài khoản trong database
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedError('Tài khoản không tồn tại hoặc đã bị vô hiệu hóa', 'UNAUTHORIZED');
    }

    // 3. Kiểm tra mật khẩu hiện tại có khớp với hash trong CSDL không
    const isOldPasswordCorrect = await bcrypt.compare(currentPass!, user.password);
    if (!isOldPasswordCorrect) {
      throw new ValidationError('Mật khẩu hiện tại không chính xác', [
        { field: 'currentPassword', message: 'Mật khẩu hiện tại không chính xác' }
      ]);
    }

    // 4. Kiểm tra mật khẩu mới không được trùng mật khẩu cũ
    const isSameAsOld = await bcrypt.compare(newPass, user.password);
    if (isSameAsOld) {
      throw new ValidationError('Mật khẩu mới không được trùng với mật khẩu hiện tại', [
        { field: 'newPassword', message: 'Mật khẩu mới không được trùng với mật khẩu hiện tại' }
      ]);
    }

    // 5. Băm mật khẩu mới bằng bcryptjs với salt rounds = 10
    const saltRounds = 10;
    const hashedNewPassword = await bcrypt.hash(newPass, saltRounds);

    // 6. Cập nhật mật khẩu trong database
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedNewPassword
      }
    });

    return {
      message: 'Đổi mật khẩu thành công'
    };
  }

  /**
   * Yêu cầu đặt lại mật khẩu qua email (POST /api/auth/forgot-password)
   */
  async forgotPassword(data: ForgotPasswordDto) {
    const { email } = data;
    const errors: ValidationErrorDetail[] = [];

    if (!email || typeof email !== 'string' || !email.trim()) {
      errors.push({ field: 'email', message: 'Vui lòng nhập địa chỉ email' });
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        errors.push({ field: 'email', message: 'Định dạng email không hợp lệ' });
      }
    }

    if (errors.length > 0) {
      throw new ValidationError('Dữ liệu yêu cầu không hợp lệ', errors);
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Giới hạn tần suất yêu cầu chống spam
    this.checkRateLimit(normalizedEmail);

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    // Luôn trả thông điệp trung lập, không tiết lộ email có tồn tại hay không
    const neutralMessage = 'Nếu email tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu đã được gửi đến hộp thư của bạn.';

    if (!user || !user.isActive) {
      return { message: neutralMessage };
    }

    // Sinh reset token ngẫu nhiên bảo mật cao bằng crypto.randomBytes (32 bytes = 64 hex chars)
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const expiresMinutes = Number(process.env.PASSWORD_RESET_TOKEN_EXPIRES_MINUTES) || 15;
    const expiresAt = new Date(Date.now() + expiresMinutes * 60 * 1000);

    // Lưu token hash vào bảng password_reset_tokens
    const resetTokenRecord = await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt
      }
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/auth/reset-password?token=${rawToken}`;

    // Gửi email chứa đường dẫn đặt lại mật khẩu
    // Nếu gửi email thất bại, ném lỗi và hoàn tác token/rateLimit để không lưu token mồ côi
    try {
      await emailService.sendPasswordResetEmail(user.email, resetUrl, expiresMinutes);
    } catch (sendErr) {
      // Hoàn tác lượt tính rate limit nếu lỗi hệ thống
      const timestamps = this.resetEmailRequestLog.get(normalizedEmail) || [];
      timestamps.pop();
      this.resetEmailRequestLog.set(normalizedEmail, timestamps);

      // Dọn dẹp token mồ côi trong CSDL
      if (typeof (prisma.passwordResetToken as any)?.delete === 'function') {
        try {
          await prisma.passwordResetToken.delete({
            where: { id: resetTokenRecord.id }
          });
        } catch {
          // Bỏ qua lỗi dọn dẹp nếu có
        }
      }

      throw sendErr;
    }

    return {
      message: neutralMessage
    };
  }

  /**
   * Đặt lại mật khẩu mới bằng token (POST /api/auth/reset-password)
   */
  async resetPassword(data: ResetPasswordDto) {
    const { token, newPassword } = data;
    const errors: ValidationErrorDetail[] = [];

    if (!token || typeof token !== 'string' || !token.trim()) {
      errors.push({ field: 'token', message: 'Token đặt lại mật khẩu là bắt buộc' });
    }

    if (!newPassword || typeof newPassword !== 'string') {
      errors.push({ field: 'newPassword', message: 'Vui lòng nhập mật khẩu mới' });
    } else if (newPassword.length < 6) {
      errors.push({ field: 'newPassword', message: 'Mật khẩu mới phải có tối thiểu 6 ký tự' });
    }

    if (errors.length > 0) {
      throw new ValidationError('Dữ liệu đặt lại mật khẩu không hợp lệ', errors);
    }

    const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');

    const resetTokenRecord = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true }
    });

    if (!resetTokenRecord) {
      throw new ValidationError('Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn');
    }

    if (resetTokenRecord.usedAt !== null) {
      throw new ValidationError('Liên kết đặt lại mật khẩu này đã được sử dụng');
    }

    if (resetTokenRecord.expiresAt.getTime() < Date.now()) {
      throw new ValidationError('Liên kết đặt lại mật khẩu đã hết hạn. Vui lòng gửi yêu cầu mới.');
    }

    if (!resetTokenRecord.user || !resetTokenRecord.user.isActive) {
      throw new UnauthorizedError('Tài khoản không tồn tại hoặc đã bị vô hiệu hóa', 'UNAUTHORIZED');
    }

    // Xử lý nguyên tử transaction để tránh race condition khi 2 request dùng cùng token
    await prisma.$transaction(async (tx) => {
      const updateTokenResult = await tx.passwordResetToken.updateMany({
        where: {
          id: resetTokenRecord.id,
          usedAt: null,
          expiresAt: { gt: new Date() }
        },
        data: {
          usedAt: new Date()
        }
      });

      if (updateTokenResult.count === 0) {
        throw new ValidationError('Liên kết đặt lại mật khẩu này đã được sử dụng hoặc đã hết hạn');
      }

      // Hash mật khẩu mới bằng bcryptjs salt rounds = 10
      const saltRounds = 10;
      const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

      // Cập nhật mật khẩu và tăng tokenVersion để vô hiệu hóa toàn bộ JWT cũ
      await tx.user.update({
        where: { id: resetTokenRecord.userId },
        data: {
          password: hashedNewPassword,
          tokenVersion: { increment: 1 }
        }
      });
    });

    return {
      message: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập bằng mật khẩu mới.'
    };
  }
}

export interface ForgotPasswordDto {
  email: string;
}

export interface ResetPasswordDto {
  token: string;
  newPassword: string;
}

export interface ChangePasswordDto {
  oldPassword?: string;
  currentPassword?: string;
  newPassword: string;
}

export interface UpdateProfileDto {
  firstName?: string;
  lastName?: string;
  avatarUrl?: string | null;
  phone?: string | null;
  dateOfBirth?: string | Date | null;
  address?: string | null;
  summary?: string | null;
  experienceYears?: number | null;
  education?: string | null;
  [key: string]: any;
}

export default new AuthService();
