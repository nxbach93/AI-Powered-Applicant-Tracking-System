import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';
import authService, { ValidationError, RateLimitError, UnauthorizedError } from '../services/auth.service';
import authController from '../controllers/auth.controller';
import emailService from '../services/email.service';
import { authenticateJWT } from '../middlewares/auth.middleware';
import prisma from '../lib/prisma';

// Màu hiển thị console
const green = (text: string) => `\x1b[32m✔ ${text}\x1b[0m`;
const red = (text: string) => `\x1b[31m✖ ${text}\x1b[0m`;
const cyan = (text: string) => `\x1b[36mℹ ${text}\x1b[0m`;

async function runForgotResetPasswordTests() {
  console.log(cyan('BẮT ĐẦU KIỂM THỬ MODULE AUTH - QUÊN & ĐẶT LẠI MẬT KHẨU QUA EMAIL\n'));
  let passed = 0;
  let failed = 0;

  const originalFindUnique = prisma.user.findUnique;
  const originalUserUpdate = prisma.user.update;
  const originalTokenCreate = (prisma as any).passwordResetToken?.create;
  const originalTokenFindUnique = (prisma as any).passwordResetToken?.findUnique;
  const originalTokenUpdateMany = (prisma as any).passwordResetToken?.updateMany;
  const originalTransaction = prisma.$transaction;

  const secret = process.env.JWT_SECRET || 'ats-secret-jwt-key-2026-development';

  const rawOldPassword = 'InitialPassword123@';
  const hashedOldPassword = await bcrypt.hash(rawOldPassword, 10);

  // Mock database in-memory state
  let currentDatabaseUser: any = {
    id: 'user-uuid-forgot-pwd-test',
    email: 'candidate.reset@example.com',
    password: hashedOldPassword,
    firstName: 'Trần Văn',
    lastName: 'Bình',
    role: UserRole.CANDIDATE,
    tokenVersion: 0,
    avatarUrl: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const tokensDb: any[] = [];
  const sentEmails: any[] = [];

  // Mock email transporter
  const mockTransporter = {
    sendMail: async (mailOpts: any) => {
      sentEmails.push(mailOpts);
      return { messageId: 'mock-mail-id-123', accepted: [mailOpts.to] };
    }
  };
  emailService.setTransporter(mockTransporter);

  // Mock Prisma methods
  prisma.user.findUnique = (async (args: any) => {
    if (args.where?.id === currentDatabaseUser.id || args.where?.email === currentDatabaseUser.email) {
      return { ...currentDatabaseUser };
    }
    return null;
  }) as any;

  prisma.user.update = (async (args: any) => {
    if (args.where?.id === currentDatabaseUser.id) {
      if (args.data.tokenVersion?.increment) {
        currentDatabaseUser.tokenVersion = (currentDatabaseUser.tokenVersion || 0) + args.data.tokenVersion.increment;
        delete args.data.tokenVersion;
      }
      currentDatabaseUser = {
        ...currentDatabaseUser,
        ...args.data
      };
      return { ...currentDatabaseUser };
    }
    return null;
  }) as any;

  (prisma as any).passwordResetToken = {
    create: async (args: any) => {
      const record = {
        id: `token-id-${Date.now()}-${Math.random()}`,
        ...args.data,
        usedAt: null,
        createdAt: new Date()
      };
      tokensDb.push(record);
      return record;
    },
    findUnique: async (args: any) => {
      const found = tokensDb.find(t => t.tokenHash === args.where.tokenHash);
      if (!found) return null;
      if (args.include?.user) {
        return {
          ...found,
          user: { ...currentDatabaseUser }
        };
      }
      return { ...found };
    },
    updateMany: async (args: any) => {
      const index = tokensDb.findIndex(
        t => t.id === args.where.id &&
             t.usedAt === args.where.usedAt &&
             t.expiresAt.getTime() > Date.now()
      );
      if (index !== -1) {
        tokensDb[index] = { ...tokensDb[index], ...args.data };
        return { count: 1 };
      }
      return { count: 0 };
    }
  };

  prisma.$transaction = (async (callback: any) => {
    return await callback(prisma);
  }) as any;

  // Tạo token JWT cũ cho user để test tính năng tokenVersion về sau
  const oldIssuedToken = jwt.sign(
    {
      userId: currentDatabaseUser.id,
      email: currentDatabaseUser.email,
      role: currentDatabaseUser.role,
      tokenVersion: currentDatabaseUser.tokenVersion
    },
    secret,
    { expiresIn: '7d' }
  );

  // ==========================================
  // Test Case 1: Yêu cầu quên mật khẩu với email hợp lệ có tài khoản
  // ==========================================
  let extractedRawToken = '';
  try {
    const res = await authService.forgotPassword({ email: currentDatabaseUser.email });

    if (
      res.message.includes('Nếu email tồn tại trong hệ thống') &&
      tokensDb.length === 1 &&
      sentEmails.length === 1
    ) {
      // Bóc tách rawToken từ resetUrl trong email
      const emailContent = sentEmails[0].html;
      const match = emailContent.match(/token=([a-f0-9]+)/);
      if (match && match[1]) {
        extractedRawToken = match[1];
      }

      console.log(green('Test 1 PASS: Yêu cầu quên mật khẩu thành công, gửi email có liên kết reset, lưu SHA-256 hash vào DB'));
      passed++;
    } else {
      console.log(red('Test 1 FAIL: Không lưu token hoặc không gửi email'));
      failed++;
    }
  } catch (err: any) {
    console.log(red(`Test 1 FAIL: Ngoại lệ - ${err.message}`));
    failed++;
  }

  // ==========================================
  // Test Case 2: Yêu cầu quên mật khẩu với email không tồn tại
  // ==========================================
  try {
    const countBefore = sentEmails.length;
    const res = await authService.forgotPassword({ email: 'nonexistent.user.999@example.com' });

    if (
      res.message.includes('Nếu email tồn tại trong hệ thống') &&
      sentEmails.length === countBefore
    ) {
      console.log(green('Test 2 PASS: Email không tồn tại trả về thông điệp trung lập, không gửi mail, chống rò rỉ danh tính'));
      passed++;
    } else {
      console.log(red('Test 2 FAIL: Không bảo đảm tính trung lập hoặc gửi mail sai'));
      failed++;
    }
  } catch (err: any) {
    console.log(red(`Test 2 FAIL: Ngoại lệ - ${err.message}`));
    failed++;
  }

  // ==========================================
  // Test Case 3: Email sai định dạng (Validation)
  // ==========================================
  try {
    await authService.forgotPassword({ email: 'invalid-email-format' });
    console.log(red('Test 3 FAIL: Không bắt lỗi email sai định dạng'));
    failed++;
  } catch (err: any) {
    if (err instanceof ValidationError && err.details?.some(d => d.field === 'email')) {
      console.log(green('Test 3 PASS: Từ chối email sai định dạng với mã lỗi VALIDATION_ERROR (400)'));
      passed++;
    } else {
      console.log(red(`Test 3 FAIL: Ngoại lệ không đúng kiểu - ${err.message}`));
      failed++;
    }
  }

  // ==========================================
  // Test Case 4: Giới hạn tần suất yêu cầu chống spam (Rate Limiting)
  // ==========================================
  try {
    const spamEmail = 'spam.check@example.com';
    // Gửi lần 1, 2, 3
    await authService.forgotPassword({ email: spamEmail });
    await authService.forgotPassword({ email: spamEmail });
    await authService.forgotPassword({ email: spamEmail });

    // Lần 4 phải bị chặn bởi RateLimitError
    await authService.forgotPassword({ email: spamEmail });
    console.log(red('Test 4 FAIL: Cho phép spam vượt quá 3 lần trong 15 phút'));
    failed++;
  } catch (err: any) {
    if (err instanceof RateLimitError) {
      console.log(green('Test 4 PASS: Chống spam thành công: Chặn yêu cầu lần thứ 4 với RateLimitError (429)'));
      passed++;
    } else {
      console.log(red(`Test 4 FAIL: Bắt lỗi không đúng RateLimitError - ${err.message}`));
      failed++;
    }
  }

  // ==========================================
  // Test Case 5: Dịch vụ gửi email thất bại không được báo thành công sai
  // ==========================================
  try {
    emailService.setTransporter({
      sendMail: async () => {
        throw new Error('SMTP Connection timeout to mail server');
      }
    });

    await authService.forgotPassword({ email: currentDatabaseUser.email });
    console.log(red('Test 5 FAIL: Báo thành công khi SMTP thực tế thất bại'));
    failed++;
  } catch (err: any) {
    if (err.message.includes('Không thể gửi email')) {
      console.log(green('Test 5 PASS: Ném ngoại lệ khi gửi email thất bại, bảo đảm tính toàn vẹn trạng thái'));
      passed++;
    } else {
      console.log(red(`Test 5 FAIL: Lỗi không như mong đợi - ${err.message}`));
      failed++;
    }
  } finally {
    emailService.setTransporter(mockTransporter);
  }

  // ==========================================
  // Test Case 6: Đặt lại mật khẩu với token hợp lệ
  // ==========================================
  const newPasswordTest = 'BrandNewPassword999@';
  try {
    const res = await authService.resetPassword({
      token: extractedRawToken,
      newPassword: newPasswordTest
    });

    const isPasswordUpdated = await bcrypt.compare(newPasswordTest, currentDatabaseUser.password);
    const tokenRecordInDb = tokensDb.find(t => t.tokenHash === crypto.createHash('sha256').update(extractedRawToken).digest('hex'));

    if (
      res.message.includes('Đặt lại mật khẩu thành công') &&
      isPasswordUpdated &&
      tokenRecordInDb?.usedAt !== null &&
      currentDatabaseUser.tokenVersion > 0
    ) {
      console.log(green('Test 6 PASS: Đặt lại mật khẩu thành công, hash mật khẩu mới được lưu, token đánh dấu usedAt, tăng tokenVersion'));
      passed++;
    } else {
      console.log(red('Test 6 FAIL: Không cập nhật mật khẩu hoặc không đánh dấu usedAt'));
      failed++;
    }
  } catch (err: any) {
    console.log(red(`Test 6 FAIL: Ngoại lệ - ${err.message}`));
    failed++;
  }

  // ==========================================
  // Test Case 7: Token đã sử dụng (Used Token)
  // ==========================================
  try {
    await authService.resetPassword({
      token: extractedRawToken,
      newPassword: 'AnotherPassword888@'
    });
    console.log(red('Test 7 FAIL: Cho phép sử dụng lại token đã dùng'));
    failed++;
  } catch (err: any) {
    if (err instanceof ValidationError && err.message.includes('đã được sử dụng')) {
      console.log(green('Test 7 PASS: Từ chối token đã sử dụng với lỗi ValidationError'));
      passed++;
    } else {
      console.log(red(`Test 7 FAIL: Không bắt đúng lỗi token đã sử dụng - ${err.message}`));
      failed++;
    }
  }

  // ==========================================
  // Test Case 8: Token đã hết hạn (Expired Token)
  // ==========================================
  try {
    // Tạo token đã hết hạn trong DB
    const expiredRawToken = crypto.randomBytes(32).toString('hex');
    const expiredHash = crypto.createHash('sha256').update(expiredRawToken).digest('hex');
    tokensDb.push({
      id: 'expired-token-id',
      userId: currentDatabaseUser.id,
      tokenHash: expiredHash,
      expiresAt: new Date(Date.now() - 60 * 1000), // hết hạn 1 phút trước
      usedAt: null,
      createdAt: new Date(Date.now() - 16 * 60 * 1000)
    });

    await authService.resetPassword({
      token: expiredRawToken,
      newPassword: 'AnotherPassword888@'
    });
    console.log(red('Test 8 FAIL: Cho phép sử dụng token đã hết hạn'));
    failed++;
  } catch (err: any) {
    if (err instanceof ValidationError && err.message.includes('hết hạn')) {
      console.log(green('Test 8 PASS: Từ chối token đã hết hạn với thông báo rõ ràng'));
      passed++;
    } else {
      console.log(red(`Test 8 FAIL: Không bắt đúng lỗi token hết hạn - ${err.message}`));
      failed++;
    }
  }

  // ==========================================
  // Test Case 9: Token sai hoặc bị chỉnh sửa
  // ==========================================
  try {
    await authService.resetPassword({
      token: 'tampered-invalid-hex-token-1234567890',
      newPassword: 'AnotherPassword888@'
    });
    console.log(red('Test 9 FAIL: Cho phép token giả mạo'));
    failed++;
  } catch (err: any) {
    if (err instanceof ValidationError && err.message.includes('không hợp lệ')) {
      console.log(green('Test 9 PASS: Từ chối token giả mạo/chỉnh sửa'));
      passed++;
    } else {
      console.log(red(`Test 9 FAIL: Lỗi không đúng - ${err.message}`));
      failed++;
    }
  }

  // ==========================================
  // Test Case 10: Mật khẩu mới không hợp lệ (< 6 ký tự)
  // ==========================================
  try {
    await authService.resetPassword({
      token: extractedRawToken,
      newPassword: '123'
    });
    console.log(red('Test 10 FAIL: Cho phép đặt mật khẩu mới < 6 ký tự'));
    failed++;
  } catch (err: any) {
    if (err instanceof ValidationError && err.details?.some(d => d.field === 'newPassword')) {
      console.log(green('Test 10 PASS: Bắt lỗi validation khi mật khẩu mới < 6 ký tự (đồng bộ với quy tắc Auth)'));
      passed++;
    } else {
      console.log(red(`Test 10 FAIL: Không bắt lỗi mật khẩu ngắn - ${err.message}`));
      failed++;
    }
  }

  // ==========================================
  // Test Case 11: Concurrency Test: 2 yêu cầu đồng thời dùng cùng token
  // ==========================================
  try {
    // Tạo 1 token mới hợp lệ
    const concurrentRawToken = crypto.randomBytes(32).toString('hex');
    const concurrentHash = crypto.createHash('sha256').update(concurrentRawToken).digest('hex');
    tokensDb.push({
      id: 'concurrent-token-id',
      userId: currentDatabaseUser.id,
      tokenHash: concurrentHash,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      usedAt: null,
      createdAt: new Date()
    });

    // Chạy đồng thời 2 yêu cầu
    const req1 = authService.resetPassword({ token: concurrentRawToken, newPassword: 'PasswordOne111@' });
    const req2 = authService.resetPassword({ token: concurrentRawToken, newPassword: 'PasswordTwo222@' });

    const results = await Promise.allSettled([req1, req2]);
    const fulfilled = results.filter(r => r.status === 'fulfilled');
    const rejected = results.filter(r => r.status === 'rejected');

    if (fulfilled.length === 1 && rejected.length === 1) {
      console.log(green('Test 11 PASS: Xử lý an toàn yêu cầu đồng thời: Chỉ 1 yêu cầu thành công, yêu cầu thứ 2 bị từ chối do thao tác atomic'));
      passed++;
    } else {
      console.log(red(`Test 11 FAIL: Kết quả concurrency bất thường: ${fulfilled.length} fulfilled, ${rejected.length} rejected`));
      failed++;
    }
  } catch (err: any) {
    console.log(red(`Test 11 FAIL: Ngoại lệ concurrency - ${err.message}`));
    failed++;
  }

  // ==========================================
  // Test Case 12: Đăng nhập bằng mật khẩu mới thành công
  // ==========================================
  try {
    const loginRes = await authService.login({
      email: currentDatabaseUser.email,
      password: 'PasswordOne111@'
    });

    if (loginRes.token && loginRes.user.id === currentDatabaseUser.id) {
      console.log(green('Test 12 PASS: Đăng nhập thành công với mật khẩu mới vừa đặt lại'));
      passed++;
    } else {
      console.log(red('Test 12 FAIL: Không đăng nhập được bằng mật khẩu mới'));
      failed++;
    }
  } catch (err: any) {
    console.log(red(`Test 12 FAIL: Ngoại lệ đăng nhập - ${err.message}`));
    failed++;
  }

  // ==========================================
  // Test Case 13: Đăng nhập bằng mật khẩu cũ thất bại
  // ==========================================
  try {
    await authService.login({
      email: currentDatabaseUser.email,
      password: rawOldPassword
    });
    console.log(red('Test 13 FAIL: Đăng nhập bằng mật khẩu cũ vẫn thành công'));
    failed++;
  } catch (err: any) {
    if (err instanceof UnauthorizedError && err.code === 'INVALID_CREDENTIALS') {
      console.log(green('Test 13 PASS: Đăng nhập bằng mật khẩu cũ thất bại với mã lỗi INVALID_CREDENTIALS'));
      passed++;
    } else {
      console.log(red(`Test 13 FAIL: Ngoại lệ không đúng - ${err.message}`));
      failed++;
    }
  }

  // ==========================================
  // Test Case 14: Thu hồi phiên: Token JWT cũ bị từ chối do tokenVersion
  // ==========================================
  try {
    let statusCode = 0;
    let jsonResponse: any = null;
    const req: any = {
      headers: { authorization: `Bearer ${oldIssuedToken}` }
    };
    const res: any = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(data: any) {
        jsonResponse = data;
        return this;
      }
    };
    const next = () => {};

    await authenticateJWT(req, res, next);

    if (statusCode === 401 && jsonResponse.error?.message.includes('Phiên đăng nhập đã hết hiệu lực')) {
      console.log(green('Test 14 PASS: JWT token cũ bị từ chối với HTTP 401 do tokenVersion đã thay đổi (thu hồi phiên thành công)'));
      passed++;
    } else {
      console.log(red(`Test 14 FAIL: JWT cũ vẫn được chấp nhận hoặc status là ${statusCode}`));
      failed++;
    }
  } catch (err: any) {
    console.log(red(`Test 14 FAIL: Ngoại lệ - ${err.message}`));
    failed++;
  }

  // Restore prisma and emailService
  prisma.user.findUnique = originalFindUnique;
  prisma.user.update = originalUserUpdate;
  if ((prisma as any).passwordResetToken) {
    (prisma as any).passwordResetToken.create = originalTokenCreate;
    (prisma as any).passwordResetToken.findUnique = originalTokenFindUnique;
    (prisma as any).passwordResetToken.updateMany = originalTokenUpdateMany;
  }
  prisma.$transaction = originalTransaction;
  emailService.resetTransporter();

  console.log('\n----------------------------------------');
  console.log(`TỔNG KẾT: ${passed} PASS, ${failed} FAIL`);
  console.log('----------------------------------------\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runForgotResetPasswordTests().catch((err) => {
  console.error('Lỗi thực thi kiểm thử:', err);
  process.exit(1);
});
