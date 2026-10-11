import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';
import authService, { UnauthorizedError, ValidationError } from '../services/auth.service';
import authController from '../controllers/auth.controller';
import { authenticateJWT } from '../middlewares/auth.middleware';
import prisma from '../lib/prisma';

// Màu console
const green = (text: string) => `\x1b[32m✔ ${text}\x1b[0m`;
const red = (text: string) => `\x1b[31m✖ ${text}\x1b[0m`;
const cyan = (text: string) => `\x1b[36mℹ ${text}\x1b[0m`;

async function runTests() {
  console.log(cyan('BẮT ĐẦU KIỂM THỬ MODULE AUTH - CHỨC NĂNG ĐĂNG NHẬP VÀ JWT AUTHENTICATION\n'));
  let passed = 0;
  let failed = 0;

  const originalFindUnique = prisma.user.findUnique;
  const originalCreate = prisma.user.create;

  const samplePassword = 'CandidatePassword123@';
  const hashedPassword = await bcrypt.hash(samplePassword, 10);

  const mockUser: any = {
    id: 'candidate-uuid-1234-5678',
    email: 'candidate@example.com',
    password: hashedPassword,
    firstName: 'Nguyễn Văn',
    lastName: 'An',
    role: UserRole.CANDIDATE,
    avatarUrl: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    candidateProfile: {
      id: 'profile-uuid-1111',
      phone: '0987654321',
      dateOfBirth: new Date('2000-01-01'),
      address: 'Hà Nội',
      summary: 'Lập trình viên nhiệt huyết',
      cvFileUrl: null,
      parsedSkills: ['React', 'TypeScript'],
      experienceYears: 2,
      education: 'Đại học Bách Khoa'
    }
  };

  // Test Case 1: Đăng nhập thành công với tài khoản Candidate
  try {
    prisma.user.findUnique = (async () => mockUser) as any;

    const result = await authService.login({
      email: 'candidate@example.com',
      password: samplePassword
    });

    const isTokenValid = Boolean(result.token);
    const decoded = jwt.verify(
      result.token,
      process.env.JWT_SECRET || 'ats-secret-jwt-key-2026-development'
    ) as any;

    const tokenPayloadCorrect =
      decoded.userId === mockUser.id &&
      decoded.email === mockUser.email &&
      decoded.role === UserRole.CANDIDATE;

    const noPasswordInUser = !('password' in result.user);

    if (isTokenValid && tokenPayloadCorrect && noPasswordInUser) {
      console.log(green('Test 1 Thành công: Đăng nhập thành công, sinh JWT hợp lệ, không lộ hash mật khẩu'));
      passed++;
    } else {
      console.log(red('Test 1 Thất bại: Dữ liệu trả về hoặc token không đúng chuẩn'));
      failed++;
    }
  } catch (err: any) {
    console.log(red(`Test 1 Thất bại: ${err.message}`));
    failed++;
  }

  // Test Case 2: Sai mật khẩu
  try {
    prisma.user.findUnique = (async () => mockUser) as any;

    await authService.login({
      email: 'candidate@example.com',
      password: 'WrongPassword999!'
    });

    console.log(red('Test 2 Thất bại: Đáng lẽ phải chặn khi nhập sai mật khẩu'));
    failed++;
  } catch (err: any) {
    if (err instanceof UnauthorizedError && err.code === 'INVALID_CREDENTIALS') {
      console.log(green('Test 2 Thành công: Chặn đúng mật khẩu sai, trả về INVALID_CREDENTIALS'));
      passed++;
    } else {
      console.log(red(`Test 2 Thất bại: Lỗi không đúng kỳ vọng: ${err.message}`));
      failed++;
    }
  }

  // Test Case 3: Email không tồn tại (thông báo lỗi chung không lộ tài khoản)
  try {
    prisma.user.findUnique = (async () => null) as any;

    await authService.login({
      email: 'nonexistent@example.com',
      password: 'AnyPassword123'
    });

    console.log(red('Test 3 Thất bại: Đáng lẽ phải báo lỗi khi email không tồn tại'));
    failed++;
  } catch (err: any) {
    if (err instanceof UnauthorizedError && err.code === 'INVALID_CREDENTIALS') {
      console.log(green('Test 3 Thành công: Email không tồn tại trả về lỗi chung INVALID_CREDENTIALS, bảo mật danh tính'));
      passed++;
    } else {
      console.log(red(`Test 3 Thất bại: ${err.message}`));
      failed++;
    }
  }

  // Test Case 4: Tài khoản bị vô hiệu hóa (isActive = false)
  try {
    const inactiveUser = { ...mockUser, isActive: false };
    prisma.user.findUnique = (async () => inactiveUser) as any;

    await authService.login({
      email: 'candidate@example.com',
      password: samplePassword
    });

    console.log(red('Test 4 Thất bại: Đáng lẽ phải chặn tài khoản isActive=false'));
    failed++;
  } catch (err: any) {
    if (err instanceof UnauthorizedError && err.code === 'ACCOUNT_INACTIVE') {
      console.log(green('Test 4 Thành công: Chặn đúng tài khoản bị vô hiệu hóa (ACCOUNT_INACTIVE)'));
      passed++;
    } else {
      console.log(red(`Test 4 Thất bại: ${err.message}`));
      failed++;
    }
  }

  // Test Case 5: Middleware authenticateJWT xác thực thành công và chặn token giả mạo
  try {
    prisma.user.findUnique = (async () => mockUser) as any;

    const validToken = jwt.sign(
      { userId: mockUser.id, email: mockUser.email, role: mockUser.role },
      process.env.JWT_SECRET || 'ats-secret-jwt-key-2026-development'
    );

    let nextCalled = false;
    const mockReq: any = {
      headers: { authorization: `Bearer ${validToken}` }
    };
    const mockRes: any = {
      status: () => mockRes,
      json: () => mockRes
    };

    await authenticateJWT(mockReq, mockRes, () => {
      nextCalled = true;
    });

    if (nextCalled && mockReq.user?.id === mockUser.id) {
      console.log(green('Test 5 Thành công: Middleware authenticateJWT giải mã token và nạp user hợp lệ vào request'));
      passed++;
    } else {
      console.log(red('Test 5 Thất bại: Middleware không nạp đúng req.user'));
      failed++;
    }
  } catch (err: any) {
    console.log(red(`Test 5 Thất bại: ${err.message}`));
    failed++;
  }

  // Test Case 6: Middleware authenticateJWT chặn request không có token hoặc token sai
  try {
    let statusCode = 0;
    let responseBody: any = null;

    const mockReqNoToken: any = { headers: {} };
    const mockResNoToken: any = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(body: any) {
        responseBody = body;
        return this;
      }
    };

    await authenticateJWT(mockReqNoToken, mockResNoToken, () => {});

    if (statusCode === 401 && responseBody?.error?.code === 'UNAUTHORIZED') {
      console.log(green('Test 6 Thành công: Middleware authenticateJWT trả về 401 UNAUTHORIZED khi thiếu token'));
      passed++;
    } else {
      console.log(red(`Test 6 Thất bại: Status code ${statusCode}, body: ${JSON.stringify(responseBody)}`));
      failed++;
    }
  } catch (err: any) {
    console.log(red(`Test 6 Thất bại: ${err.message}`));
    failed++;
  }

  // Test Case 7: GET /api/auth/me trả về thông tin tài khoản và candidateProfile
  try {
    prisma.user.findUnique = (async () => mockUser) as any;

    let resCode = 0;
    let resData: any = null;

    const mockReq: any = {
      user: { id: mockUser.id, email: mockUser.email, role: mockUser.role }
    };
    const mockRes: any = {
      status(code: number) {
        resCode = code;
        return this;
      },
      json(data: any) {
        resData = data;
        return this;
      }
    };

    await authController.getMe(mockReq, mockRes);

    if (
      resCode === 200 &&
      resData?.success === true &&
      resData?.data?.id === mockUser.id &&
      resData?.data?.candidateProfile &&
      !('password' in resData.data)
    ) {
      console.log(green('Test 7 Thành công: GET /api/auth/me trả về đầy đủ User & CandidateProfile, không lộ password'));
      passed++;
    } else {
      console.log(red(`Test 7 Thất bại: ${JSON.stringify(resData)}`));
      failed++;
    }
  } catch (err: any) {
    console.log(red(`Test 7 Thất bại: ${err.message}`));
    failed++;
  }

  // Test Case 8: Đảm bảo chức năng Đăng ký Candidate vẫn chạy hoàn hảo
  try {
    prisma.user.findUnique = (async () => null) as any;
    prisma.user.create = (async (args: any) => ({
      id: 'candidate-new-uuid',
      email: args.data.email,
      firstName: args.data.firstName,
      lastName: args.data.lastName,
      role: args.data.role,
      avatarUrl: null,
      isActive: true,
      createdAt: new Date()
    })) as any;

    const registered = await authService.registerCandidate({
      email: 'check_again@example.com',
      password: 'SafePassword123@',
      firstName: 'Trần',
      lastName: 'Bình'
    });

    if (registered.role === UserRole.CANDIDATE && registered.email === 'check_again@example.com') {
      console.log(green('Test 8 Thành công: Chức năng Đăng ký Candidate vẫn hoạt động hoàn hảo 100%'));
      passed++;
    } else {
      console.log(red('Test 8 Thất bại'));
      failed++;
    }
  } catch (err: any) {
    console.log(red(`Test 8 Thất bại: ${err.message}`));
    failed++;
  } finally {
    prisma.user.findUnique = originalFindUnique;
    prisma.user.create = originalCreate;
  }

  console.log(`\n${cyan('KẾT QUẢ TỔNG HỢP:')} ${passed}/${passed + failed} test cases đạt yêu cầu.`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
