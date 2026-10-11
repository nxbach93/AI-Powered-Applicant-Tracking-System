import bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';
import { AuthService, ValidationError, ConflictError } from '../services/auth.service';
import authController from '../controllers/auth.controller';
import prisma from '../lib/prisma';

// Màu console
const green = (text: string) => `\x1b[32m✔ ${text}\x1b[0m`;
const red = (text: string) => `\x1b[31m✖ ${text}\x1b[0m`;
const cyan = (text: string) => `\x1b[36mℹ ${text}\x1b[0m`;

async function runTests() {
  console.log(cyan('BẮT ĐẦU KIỂM THỬ MODULE AUTH - CHỨC NĂNG ĐĂNG KÝ CANDIDATE\n'));
  let passed = 0;
  let failed = 0;

  const authService = new AuthService();

  // Test Case 1: Validate Email không hợp lệ
  try {
    await authService.registerCandidate({
      email: 'invalid-email-format',
      password: 'Password123@',
      firstName: 'Nguyễn Văn',
      lastName: 'An'
    });
    console.log(red('Test 1 Thất bại: Đáng lẽ phải chặn email không hợp lệ'));
    failed++;
  } catch (err: any) {
    if (err instanceof ValidationError && err.details.some(d => d.field === 'email')) {
      console.log(green('Test 1 Thành công: Chặn đúng định dạng email không hợp lệ'));
      passed++;
    } else {
      console.log(red(`Test 1 Thất bại: Lỗi không đúng kỳ vọng: ${err.message}`));
      failed++;
    }
  }

  // Test Case 2: Validate Mật khẩu không hợp lệ (< 6 ký tự)
  try {
    await authService.registerCandidate({
      email: 'candidate@example.com',
      password: '123',
      firstName: 'Nguyễn Văn',
      lastName: 'An'
    });
    console.log(red('Test 2 Thất bại: Đáng lẽ phải chặn mật khẩu < 6 ký tự'));
    failed++;
  } catch (err: any) {
    if (err instanceof ValidationError && err.details.some(d => d.field === 'password')) {
      console.log(green('Test 2 Thành công: Chặn đúng mật khẩu ngắn (< 6 ký tự)'));
      passed++;
    } else {
      console.log(red(`Test 2 Thất bại: ${err.message}`));
      failed++;
    }
  }

  // Test Case 3: Client cố tình gửi role ADMIN / HR
  try {
    await authService.registerCandidate({
      email: 'candidate@example.com',
      password: 'Password123@',
      firstName: 'Nguyễn Văn',
      lastName: 'An',
      role: 'ADMIN'
    });
    console.log(red('Test 3 Thất bại: Đáng lẽ phải chặn client đăng ký role ADMIN'));
    failed++;
  } catch (err: any) {
    if (err instanceof ValidationError && err.details.some(d => d.field === 'role')) {
      console.log(green('Test 3 Thành công: Chặn client tự gán role ADMIN/HR'));
      passed++;
    } else {
      console.log(red(`Test 3 Thất bại: ${err.message}`));
      failed++;
    }
  }

  // Test Case 4: Email đã tồn tại (Giả lập Prisma trả về user đã có)
  const originalFindUnique = prisma.user.findUnique;
  try {
    // Mock findUnique tìm thấy user
    prisma.user.findUnique = (async () => ({
      id: 'existing-id',
      email: 'candidate@example.com',
      password: 'hash',
      firstName: 'Đã',
      lastName: 'Có',
      role: UserRole.CANDIDATE,
      avatarUrl: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    })) as any;

    await authService.registerCandidate({
      email: 'candidate@example.com',
      password: 'Password123@',
      firstName: 'Nguyễn Văn',
      lastName: 'An'
    });
    console.log(red('Test 4 Thất bại: Đáng lẽ phải báo email đã tồn tại'));
    failed++;
  } catch (err: any) {
    if (err instanceof ConflictError && err.code === 'EMAIL_ALREADY_EXISTS') {
      console.log(green('Test 4 Thành công: Báo lỗi Conflict khi email đã tồn tại'));
      passed++;
    } else {
      console.log(red(`Test 4 Thất bại: ${err.message}`));
      failed++;
    }
  } finally {
    prisma.user.findUnique = originalFindUnique;
  }

  // Test Case 5: Đăng ký thành công (Giả lập Prisma)
  const originalCreate = prisma.user.create;
  try {
    let capturedCreateData: any = null;
    prisma.user.findUnique = (async () => null) as any;
    prisma.user.create = (async (args: any) => {
      capturedCreateData = args.data;
      return {
        id: 'new-candidate-uuid-1234',
        email: args.data.email,
        firstName: args.data.firstName,
        lastName: args.data.lastName,
        role: args.data.role,
        avatarUrl: null,
        isActive: true,
        createdAt: new Date()
      };
    }) as any;

    const result = await authService.registerCandidate({
      email: '   NewCandidate@Example.COM  ',
      password: 'Password123@',
      firstName: '  Nguyễn Văn  ',
      lastName: '  An  '
    });

    const isBcrypt = await bcrypt.compare('Password123@', capturedCreateData.password);
    const emailNormalized = capturedCreateData.email === 'newcandidate@example.com';
    const roleIsCandidate = capturedCreateData.role === UserRole.CANDIDATE;
    const hasCandidateProfile = Boolean(capturedCreateData.candidateProfile?.create);
    const passwordNotExposed = !('password' in result);

    if (isBcrypt && emailNormalized && roleIsCandidate && hasCandidateProfile && passwordNotExposed) {
      console.log(green('Test 5 Thành công: Đăng ký thành công, hash password bcrypt, chuẩn hóa email, gán role CANDIDATE, không lộ hash'));
      passed++;
    } else {
      console.log(red('Test 5 Thất bại: Dữ liệu tạo không đúng chuẩn'));
      failed++;
    }
  } catch (err: any) {
    console.log(red(`Test 5 Ngoại lệ: ${err.message}`));
    failed++;
  } finally {
    prisma.user.findUnique = originalFindUnique;
    prisma.user.create = originalCreate;
  }

  // Test Case 6: Xử lý lỗi Database / Hệ thống trong Controller (Trả về 500)
  try {
    prisma.user.findUnique = (() => {
      throw new Error('Database connection failed');
    }) as any;

    let responseStatus = 0;
    let responseBody: any = null;

    const mockReq: any = {
      body: {
        email: 'candidate@example.com',
        password: 'Password123@',
        firstName: 'Nguyễn Văn',
        lastName: 'An'
      }
    };

    const mockRes: any = {
      status(code: number) {
        responseStatus = code;
        return this;
      },
      json(body: any) {
        responseBody = body;
        return this;
      }
    };

    await authController.register(mockReq, mockRes);

    if (responseStatus === 500 && responseBody?.error?.code === 'INTERNAL_SERVER_ERROR') {
      console.log(green('Test 6 Thành công: Controller bắt đúng lỗi Database/Hệ thống và trả về HTTP 500'));
      passed++;
    } else {
      console.log(red(`Test 6 Thất bại: Status code ${responseStatus}, body: ${JSON.stringify(responseBody)}`));
      failed++;
    }
  } finally {
    prisma.user.findUnique = originalFindUnique;
  }

  console.log(`\n${cyan('KẾT QUẢ TỔNG HỢP:')} ${passed}/${passed + failed} test cases đạt yêu cầu.`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
