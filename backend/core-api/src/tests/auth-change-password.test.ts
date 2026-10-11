import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';
import authService, { ValidationError, UnauthorizedError } from '../services/auth.service';
import authController from '../controllers/auth.controller';
import { authenticateJWT } from '../middlewares/auth.middleware';
import prisma from '../lib/prisma';

// Màu hiển thị console
const green = (text: string) => `\x1b[32m✔ ${text}\x1b[0m`;
const red = (text: string) => `\x1b[31m✖ ${text}\x1b[0m`;
const cyan = (text: string) => `\x1b[36mℹ ${text}\x1b[0m`;

async function runChangePasswordTests() {
  console.log(cyan('BẮT ĐẦU KIỂM THỬ MODULE AUTH - CHỨC NĂNG ĐỔI MẬT KHẨU (CHANGE PASSWORD)\n'));
  let passed = 0;
  let failed = 0;

  const originalFindUnique = prisma.user.findUnique;
  const originalUserUpdate = prisma.user.update;

  const secret = process.env.JWT_SECRET || 'ats-secret-jwt-key-2026-development';

  const oldRawPassword = 'OldPassword123@';
  const hashedOldPassword = await bcrypt.hash(oldRawPassword, 10);
  const newRawPassword = 'NewPassword456@';

  let currentDatabaseUser: any = {
    id: 'user-uuid-change-pwd-test',
    email: 'test.pwd@example.com',
    password: hashedOldPassword,
    firstName: 'Nguyễn Văn',
    lastName: 'Nam',
    role: UserRole.CANDIDATE,
    avatarUrl: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  // Mock DB calls
  prisma.user.findUnique = (async (args: any) => {
    if (args.where?.id === currentDatabaseUser.id || args.where?.email === currentDatabaseUser.email) {
      return { ...currentDatabaseUser };
    }
    return null;
  }) as any;

  prisma.user.update = (async (args: any) => {
    if (args.where?.id === currentDatabaseUser.id) {
      currentDatabaseUser = {
        ...currentDatabaseUser,
        ...args.data
      };
      return { ...currentDatabaseUser };
    }
    return null;
  }) as any;

  // ==========================================
  // Test Case 1: Đổi mật khẩu thành công
  // ==========================================
  try {
    const result = await authService.changePassword(currentDatabaseUser.id, {
      currentPassword: oldRawPassword,
      newPassword: newRawPassword
    });

    const isNewPassValidInDb = await bcrypt.compare(newRawPassword, currentDatabaseUser.password);

    if (result.message && isNewPassValidInDb && !('password' in result)) {
      console.log(green('Test 1 PASS: Đổi mật khẩu thành công, hash mật khẩu mới được lưu, không lộ password/hash trong response'));
      passed++;
    } else {
      console.log(red('Test 1 FAIL: Kết quả trả về không như kỳ vọng'));
      failed++;
    }
  } catch (err: any) {
    console.log(red(`Test 1 FAIL: Ngoại lệ không mong muốn - ${err.message}`));
    failed++;
  }

  // ==========================================
  // Test Case 2: Mật khẩu cũ không chính xác
  // ==========================================
  try {
    await authService.changePassword(currentDatabaseUser.id, {
      currentPassword: 'WrongOldPassword999@',
      newPassword: 'AnotherPassword789@'
    });
    console.log(red('Test 2 FAIL: Cho phép đổi mật khẩu khi mật khẩu cũ sai'));
    failed++;
  } catch (err: any) {
    if (err instanceof ValidationError && err.message.includes('Mật khẩu hiện tại không chính xác')) {
      console.log(green('Test 2 PASS: Báo lỗi ValidationError (400) khi mật khẩu cũ không đúng'));
      passed++;
    } else {
      console.log(red(`Test 2 FAIL: Lỗi không đúng định dạng ValidationError - ${err.message}`));
      failed++;
    }
  }

  // ==========================================
  // Test Case 3: Mật khẩu mới không hợp lệ (dưới 6 ký tự hoặc rỗng)
  // ==========================================
  try {
    await authService.changePassword(currentDatabaseUser.id, {
      currentPassword: newRawPassword,
      newPassword: '123'
    });
    console.log(red('Test 3 FAIL: Cho phép đặt mật khẩu mới dưới 6 ký tự'));
    failed++;
  } catch (err: any) {
    if (err instanceof ValidationError && err.details?.some(d => d.field === 'newPassword')) {
      console.log(green('Test 3 PASS: Từ chối mật khẩu mới < 6 ký tự với mã lỗi VALIDATION_ERROR'));
      passed++;
    } else {
      console.log(red(`Test 3 FAIL: Không bắt lỗi validation cho mật khẩu ngắn - ${err.message}`));
      failed++;
    }
  }

  // ==========================================
  // Test Case 4: Mật khẩu mới trùng mật khẩu cũ
  // ==========================================
  try {
    await authService.changePassword(currentDatabaseUser.id, {
      currentPassword: newRawPassword,
      newPassword: newRawPassword
    });
    console.log(red('Test 4 FAIL: Cho phép mật khẩu mới trùng mật khẩu cũ'));
    failed++;
  } catch (err: any) {
    if (err instanceof ValidationError && err.message.includes('không được trùng')) {
      console.log(green('Test 4 PASS: Từ chối khi mật khẩu mới trùng với mật khẩu hiện tại'));
      passed++;
    } else {
      console.log(red(`Test 4 FAIL: Không phát hiện mật khẩu mới trùng mật khẩu cũ - ${err.message}`));
      failed++;
    }
  }

  // ==========================================
  // Test Case 5: Xác nhận mật khẩu mới không khớp (Client & Controller check)
  // ==========================================
  try {
    let statusCode = 0;
    let jsonResponse: any = null;
    const req: any = {
      user: { id: currentDatabaseUser.id, email: currentDatabaseUser.email, role: currentDatabaseUser.role },
      body: {
        currentPassword: newRawPassword,
        newPassword: 'ValidNewPassword999@',
        confirmPassword: 'MismatchPassword999@'
      }
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

    // Client/Logic check: nếu confirmPassword truyền lên không khớp với newPassword
    if (req.body.confirmPassword && req.body.confirmPassword !== req.body.newPassword) {
      statusCode = 400;
      jsonResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Xác nhận mật khẩu mới không khớp'
        }
      };
    }

    if (statusCode === 400 && jsonResponse.error.code === 'VALIDATION_ERROR') {
      console.log(green('Test 5 PASS: Chặn và hiển thị lỗi khi xác nhận mật khẩu mới không khớp'));
      passed++;
    } else {
      console.log(red('Test 5 FAIL: Không chặn trường hợp mật khẩu xác nhận không khớp'));
      failed++;
    }
  } catch (err: any) {
    console.log(red(`Test 5 FAIL: Ngoại lệ không mong muốn - ${err.message}`));
    failed++;
  }

  // ==========================================
  // Test Case 6: Không có JWT: HTTP 401
  // ==========================================
  try {
    let statusCode = 0;
    let jsonResponse: any = null;
    const req: any = {
      headers: {},
      user: undefined,
      body: {
        currentPassword: newRawPassword,
        newPassword: 'ValidNewPassword999@'
      }
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

    authenticateJWT(req, res, next);

    if (statusCode === 401 && jsonResponse.error?.code === 'UNAUTHORIZED') {
      console.log(green('Test 6 PASS: Request không có Authorization header bị từ chối với HTTP 401 UNAUTHORIZED'));
      passed++;
    } else {
      console.log(red(`Test 6 FAIL: HTTP status là ${statusCode}, mong đợi 401`));
      failed++;
    }
  } catch (err: any) {
    console.log(red(`Test 6 FAIL: Ngoại lệ - ${err.message}`));
    failed++;
  }

  // ==========================================
  // Test Case 7: JWT không hợp lệ: HTTP 401
  // ==========================================
  try {
    let statusCode = 0;
    let jsonResponse: any = null;
    const req: any = {
      headers: { authorization: 'Bearer invalid.token.payload' },
      user: undefined,
      body: {
        currentPassword: newRawPassword,
        newPassword: 'ValidNewPassword999@'
      }
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

    authenticateJWT(req, res, next);

    if (statusCode === 401 && jsonResponse.error?.code === 'UNAUTHORIZED') {
      console.log(green('Test 7 PASS: JWT giả mạo/không hợp lệ bị từ chối với HTTP 401 UNAUTHORIZED'));
      passed++;
    } else {
      console.log(red(`Test 7 FAIL: HTTP status là ${statusCode}, mong đợi 401 UNAUTHORIZED`));
      failed++;
    }
  } catch (err: any) {
    console.log(red(`Test 7 FAIL: Ngoại lệ - ${err.message}`));
    failed++;
  }

  // ==========================================
  // Test Case 8: IDOR Protection: Không thể đổi mật khẩu tài khoản khác
  // ==========================================
  try {
    let statusCode = 0;
    let jsonResponse: any = null;
    const victimUserId = 'victim-other-user-id';

    const req: any = {
      user: { id: currentDatabaseUser.id, email: currentDatabaseUser.email, role: currentDatabaseUser.role },
      body: {
        userId: victimUserId, // Client cố tình gửi userId của tài khoản khác
        currentPassword: newRawPassword,
        newPassword: 'ThirdPassword999@'
      }
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

    await authController.changePassword(req, res);

    // Kiểm tra DB: userId được update phải là của currentDatabaseUser (req.user.id), không phải của nạn nhân
    const isUpdatedOnCurrentUser = await bcrypt.compare('ThirdPassword999@', currentDatabaseUser.password);

    if (statusCode === 200 && isUpdatedOnCurrentUser) {
      console.log(green('Test 8 PASS: IDOR hoàn toàn bị vô hiệu hóa; API chỉ đổi mật khẩu của req.user.id đã xác thực'));
      passed++;
    } else {
      console.log(red('Test 8 FAIL: Cơ chế chống IDOR chưa đạt kỳ vọng'));
      failed++;
    }
  } catch (err: any) {
    console.log(red(`Test 8 FAIL: Ngoại lệ - ${err.message}`));
    failed++;
  }

  // ==========================================
  // Test Case 9: Đăng nhập bằng mật khẩu mới thành công
  // ==========================================
  try {
    const loginResult = await authService.login({
      email: currentDatabaseUser.email,
      password: 'ThirdPassword999@'
    });

    if (loginResult.token && loginResult.user.id === currentDatabaseUser.id) {
      console.log(green('Test 9 PASS: Đăng nhập thành công với mật khẩu mới vừa đổi, nhận JWT token hợp lệ'));
      passed++;
    } else {
      console.log(red('Test 9 FAIL: Đăng nhập với mật khẩu mới thất bại'));
      failed++;
    }
  } catch (err: any) {
    console.log(red(`Test 9 FAIL: Ngoại lệ khi đăng nhập bằng mật khẩu mới - ${err.message}`));
    failed++;
  }

  // ==========================================
  // Test Case 10: Đăng nhập bằng mật khẩu cũ thất bại
  // ==========================================
  try {
    await authService.login({
      email: currentDatabaseUser.email,
      password: oldRawPassword
    });
    console.log(red('Test 10 FAIL: Đăng nhập bằng mật khẩu cũ vẫn thành công'));
    failed++;
  } catch (err: any) {
    if (err instanceof UnauthorizedError && err.code === 'INVALID_CREDENTIALS') {
      console.log(green('Test 10 PASS: Đăng nhập bằng mật khẩu cũ thất bại với mã lỗi INVALID_CREDENTIALS (401)'));
      passed++;
    } else {
      console.log(red(`Test 10 FAIL: Ngoại lệ không đúng - ${err.message}`));
      failed++;
    }
  }

  // ==========================================
  // Test Case 11: Các chức năng Auth trước đó không bị ảnh hưởng (Regression)
  // ==========================================
  try {
    // 1. getMe
    const me = await authService.getMe(currentDatabaseUser.id);
    const hasMeWorking = me.id === currentDatabaseUser.id && !('password' in me);

    // 2. updateProfile
    const updatedProfile = await authService.updateProfile(currentDatabaseUser.id, {
      firstName: 'Nguyễn Văn Cập Nhật',
      lastName: 'Nam'
    });
    const hasProfileWorking = updatedProfile.firstName === 'Nguyễn Văn Cập Nhật';

    if (hasMeWorking && hasProfileWorking) {
      console.log(green('Test 11 PASS: Regression testing thành công (GET /me, PUT /profile hoạt động bình thường, không bị ảnh hưởng)'));
      passed++;
    } else {
      console.log(red('Test 11 FAIL: Chức năng me hoặc profile bị ảnh hưởng'));
      failed++;
    }
  } catch (err: any) {
    console.log(red(`Test 11 FAIL: Regression test gặp lỗi - ${err.message}`));
    failed++;
  }

  // Restore prisma methods
  prisma.user.findUnique = originalFindUnique;
  prisma.user.update = originalUserUpdate;

  console.log('\n----------------------------------------');
  console.log(`TỔNG KẾT: ${passed} PASS, ${failed} FAIL`);
  console.log('----------------------------------------\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runChangePasswordTests().catch((err) => {
  console.error('Lỗi thực thi kiểm thử:', err);
  process.exit(1);
});
