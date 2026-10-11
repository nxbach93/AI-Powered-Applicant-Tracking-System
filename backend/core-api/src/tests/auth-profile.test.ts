import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';
import authService, { ValidationError, UnauthorizedError } from '../services/auth.service';
import authController from '../controllers/auth.controller';
import prisma from '../lib/prisma';

// Màu console
const green = (text: string) => `\x1b[32m✔ ${text}\x1b[0m`;
const red = (text: string) => `\x1b[31m✖ ${text}\x1b[0m`;
const cyan = (text: string) => `\x1b[36mℹ ${text}\x1b[0m`;

async function runProfileTests() {
  console.log(cyan('BẮT ĐẦU KIỂM THỬ MODULE AUTH - QUẢN LÝ TÀI KHOẢN CÁ NHÂN (PROFILE)\n'));
  let passed = 0;
  let failed = 0;

  const originalFindUnique = prisma.user.findUnique;
  const originalUserUpdate = prisma.user.update;
  const originalProfileUpsert = prisma.candidateProfile.upsert;

  const secret = process.env.JWT_SECRET || 'ats-secret-jwt-key-2026-development';

  const mockUser: any = {
    id: 'candidate-uuid-profile-test',
    email: 'candidate.profile@example.com',
    password: '$2b$10$hashedPasswordHere',
    firstName: 'Nguyễn',
    lastName: 'Văn A',
    role: UserRole.CANDIDATE,
    avatarUrl: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    candidateProfile: {
      id: 'profile-uuid-1',
      phone: '0987654321',
      dateOfBirth: new Date('2000-01-01'),
      address: 'Hà Nội',
      summary: 'Kỹ sư phần mềm',
      cvFileUrl: null,
      parsedSkills: ['React', 'Node.js'],
      experienceYears: 2,
      education: 'ĐH Bách Khoa'
    }
  };

  // Test Case 1: Người dùng hợp lệ xem được hồ sơ của mình qua GET /api/auth/me
  try {
    prisma.user.findUnique = (async () => mockUser) as any;

    const userProfile = await authService.getMe(mockUser.id);

    if (
      userProfile.id === mockUser.id &&
      userProfile.email === mockUser.email &&
      !('password' in userProfile) &&
      userProfile.candidateProfile?.phone === '0987654321'
    ) {
      console.log(green('Test 1 Thành công: Người dùng xem được hồ sơ của mình, không lộ password'));
      passed++;
    } else {
      console.log(red('Test 1 Thất bại: Lỗi dữ liệu hồ sơ'));
      failed++;
    }
  } catch (err: any) {
    console.log(red(`Test 1 Thất bại: ${err.message}`));
    failed++;
  }

  // Test Case 2: Cập nhật thông tin hợp lệ thành công
  try {
    let capturedUserUpdate: any = null;
    let capturedProfileUpsert: any = null;

    prisma.user.findUnique = (async () => mockUser) as any;
    prisma.user.update = (async (args: any) => {
      capturedUserUpdate = args.data;
      return { ...mockUser, ...args.data };
    }) as any;
    prisma.candidateProfile.upsert = (async (args: any) => {
      capturedProfileUpsert = args.update;
      return { ...mockUser.candidateProfile, ...args.update };
    }) as any;

    const result = await authService.updateProfile(mockUser.id, {
      firstName: 'Nguyễn Hoàng',
      lastName: 'Nam',
      avatarUrl: 'https://example.com/avatar.png',
      phone: '0912345678',
      education: 'ĐH Quốc Gia Hà Nội',
      experienceYears: 4
    });

    const userUpdated =
      capturedUserUpdate.firstName === 'Nguyễn Hoàng' &&
      capturedUserUpdate.lastName === 'Nam' &&
      capturedUserUpdate.avatarUrl === 'https://example.com/avatar.png';

    const profileUpdated =
      capturedProfileUpsert.phone === '0912345678' &&
      capturedProfileUpsert.education === 'ĐH Quốc Gia Hà Nội' &&
      capturedProfileUpsert.experienceYears === 4;

    const noPasswordReturned = !('password' in result);

    if (userUpdated && profileUpdated && noPasswordReturned) {
      console.log(green('Test 2 Thành công: Cập nhật thông tin cá nhân và hồ sơ ứng viên hợp lệ thành công'));
      passed++;
    } else {
      console.log(red('Test 2 Thất bại: Cập nhật không đúng dữ liệu'));
      failed++;
    }
  } catch (err: any) {
    console.log(red(`Test 2 Thất bại: ${err.message}`));
    failed++;
  }

  // Test Case 3: Dữ liệu không hợp lệ bị từ chối (Tên rỗng, phone sai định dạng, exp âm)
  try {
    prisma.user.findUnique = (async () => mockUser) as any;

    await authService.updateProfile(mockUser.id, {
      firstName: '', // rỗng
      phone: '123',  // không đủ số
      experienceYears: -5 // số âm
    });

    console.log(red('Test 3 Thất bại: Đáng lẽ phải chặn dữ liệu không hợp lệ'));
    failed++;
  } catch (err: any) {
    if (
      err instanceof ValidationError &&
      err.details.some(d => d.field === 'firstName') &&
      err.details.some(d => d.field === 'phone') &&
      err.details.some(d => d.field === 'experienceYears')
    ) {
      console.log(green('Test 3 Thành công: Bắt đúng lỗi validation khi cập nhật (tên rỗng, phone sai, exp âm)'));
      passed++;
    } else {
      console.log(red(`Test 3 Thất bại: Lỗi không đúng mong muốn: ${err.message}`));
      failed++;
    }
  }

  // Test Case 4: Cố tình mass assignment sửa role, isActive, password, email -> bị bỏ qua an toàn
  try {
    let capturedUpdateData: any = null;
    prisma.user.findUnique = (async () => mockUser) as any;
    prisma.user.update = (async (args: any) => {
      capturedUpdateData = args.data;
      return mockUser;
    }) as any;

    await authService.updateProfile(mockUser.id, {
      firstName: 'Trần',
      lastName: 'Hải',
      role: 'ADMIN',         // cố tình sửa role
      isActive: false,       // cố tình sửa isActive
      password: 'Hacked123', // cố tình sửa password
      email: 'hacker@evil.com' // cố tình sửa email
    });

    const notAllowedKeys = ['role', 'isActive', 'password', 'email'];
    const keysInUpdate = Object.keys(capturedUpdateData);
    const hasForbiddenField = notAllowedKeys.some(k => keysInUpdate.includes(k));

    if (!hasForbiddenField && capturedUpdateData.firstName === 'Trần') {
      console.log(green('Test 4 Thành công: Ngăn chặn tuyệt đối Mass Assignment (role, isActive, password, email không bị sửa)'));
      passed++;
    } else {
      console.log(red(`Test 4 Thất bại: Xuất hiện trường cấm trong update: ${keysInUpdate.join(', ')}`));
      failed++;
    }
  } catch (err: any) {
    console.log(red(`Test 4 Thất bại: ${err.message}`));
    failed++;
  }

  // Test Case 5: Không có JWT trong Controller -> Trả về 401 UNAUTHORIZED
  try {
    let statusCode = 0;
    let resBody: any = null;

    const mockReqNoUser: any = { body: { firstName: 'Nam' } }; // không có req.user
    const mockRes: any = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(data: any) {
        resBody = data;
        return this;
      }
    };

    await authController.updateProfile(mockReqNoUser, mockRes);

    if (statusCode === 401 && resBody?.error?.code === 'UNAUTHORIZED') {
      console.log(green('Test 5 Thành công: Controller chặn request thiếu xác thực với HTTP 401 UNAUTHORIZED'));
      passed++;
    } else {
      console.log(red(`Test 5 Thất bại: Status code ${statusCode}`));
      failed++;
    }
  } catch (err: any) {
    console.log(red(`Test 5 Thất bại: ${err.message}`));
    failed++;
  }

  // Test Case 6: Không thể cập nhật tài khoản người khác (userId lấy hoàn toàn từ token đã xác thực)
  try {
    let updatedTargetId = '';
    prisma.user.findUnique = (async () => mockUser) as any;
    prisma.user.update = (async (args: any) => {
      updatedTargetId = args.where.id;
      return mockUser;
    }) as any;

    const mockReqAttacker: any = {
      user: { id: 'victim-id-from-jwt' }, // JWT thuộc về victim
      body: {
        userId: 'attacker-id-in-body',   // Kẻ tấn công cố tình truyền userId khác trong body
        firstName: 'Tên Mới'
      }
    };
    let status = 0;
    const mockRes: any = {
      status(c: number) { status = c; return this; },
      json() { return this; }
    };

    await authController.updateProfile(mockReqAttacker, mockRes);

    if (updatedTargetId === 'victim-id-from-jwt') {
      console.log(green('Test 6 Thành công: Bảo mật IDOR tuyệt đối: userId chỉ lấy từ JWT, bỏ qua hoàn toàn body'));
      passed++;
    } else {
      console.log(red(`Test 6 Thất bại: Target ID bị ghi đè: ${updatedTargetId}`));
      failed++;
    }
  } catch (err: any) {
    console.log(red(`Test 6 Thất bại: ${err.message}`));
    failed++;
  }

  // Test Case 7: Tài khoản isActive = false bị từ chối cập nhật
  try {
    const disabledUser = { ...mockUser, isActive: false };
    prisma.user.findUnique = (async () => disabledUser) as any;

    await authService.updateProfile(disabledUser.id, { firstName: 'Nam' });

    console.log(red('Test 7 Thất bại: Đáng lẽ phải chặn tài khoản bị vô hiệu hóa'));
    failed++;
  } catch (err: any) {
    if (err instanceof UnauthorizedError) {
      console.log(green('Test 7 Thành công: Tài khoản isActive=false bị chặn cập nhật hồ sơ với HTTP 401'));
      passed++;
    } else {
      console.log(red(`Test 7 Thất bại: ${err.message}`));
      failed++;
    }
  } finally {
    prisma.user.findUnique = originalFindUnique;
    prisma.user.update = originalUserUpdate;
    prisma.candidateProfile.upsert = originalProfileUpsert;
  }

  console.log(`\n${cyan('KẾT QUẢ TỔNG HỢP:')} ${passed}/${passed + failed} test cases đạt yêu cầu.`);
  if (failed > 0) {
    process.exit(1);
  }
}

runProfileTests();
