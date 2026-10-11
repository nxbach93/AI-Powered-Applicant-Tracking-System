import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';
import { authenticateJWT, authorizeRoles } from '../middlewares/auth.middleware';
import prisma from '../lib/prisma';

// Màu console
const green = (text: string) => `\x1b[32m✔ ${text}\x1b[0m`;
const red = (text: string) => `\x1b[31m✖ ${text}\x1b[0m`;
const cyan = (text: string) => `\x1b[36mℹ ${text}\x1b[0m`;

async function runRBACTests() {
  console.log(cyan('BẮT ĐẦU KIỂM THỬ MODULE AUTH - ROLE-BASED ACCESS CONTROL (RBAC)\n'));
  let passed = 0;
  let failed = 0;

  const originalFindUnique = prisma.user.findUnique;
  const secret = process.env.JWT_SECRET || 'ats-secret-jwt-key-2026-development';

  // Helper tạo mock request & response
  const createMockContext = (authHeader?: string, body?: any) => {
    let statusCode = 200;
    let responseBody: any = null;

    const req: any = {
      headers: authHeader ? { authorization: authHeader } : {},
      body: body || {}
    };

    const res: any = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(data: any) {
        responseBody = data;
        return this;
      }
    };

    return {
      req,
      res,
      getStatus: () => statusCode,
      getBody: () => responseBody
    };
  };

  // Test Case 1: Không có token -> HTTP 401 UNAUTHORIZED
  try {
    const ctx = createMockContext();
    let nextCalled = false;

    await authenticateJWT(ctx.req, ctx.res, () => {
      nextCalled = true;
    });

    if (!nextCalled && ctx.getStatus() === 401 && ctx.getBody()?.error?.code === 'UNAUTHORIZED') {
      console.log(green('Test 1 Thành công: Request không có token bị chặn với HTTP 401 UNAUTHORIZED'));
      passed++;
    } else {
      console.log(red(`Test 1 Thất bại: Status ${ctx.getStatus()}`));
      failed++;
    }
  } catch (err: any) {
    console.log(red(`Test 1 Thất bại: ${err.message}`));
    failed++;
  }

  // Test Case 2: Token không hợp lệ (sai chữ ký hoặc format) -> HTTP 401 UNAUTHORIZED
  try {
    const ctx = createMockContext('Bearer invalid.token.payload');
    let nextCalled = false;

    await authenticateJWT(ctx.req, ctx.res, () => {
      nextCalled = true;
    });

    if (!nextCalled && ctx.getStatus() === 401 && ctx.getBody()?.error?.code === 'UNAUTHORIZED') {
      console.log(green('Test 2 Thành công: Token không hợp lệ bị từ chối với HTTP 401 UNAUTHORIZED'));
      passed++;
    } else {
      console.log(red(`Test 2 Thất bại: Status ${ctx.getStatus()}`));
      failed++;
    }
  } catch (err: any) {
    console.log(red(`Test 2 Thất bại: ${err.message}`));
    failed++;
  }

  // Test Case 3: Token hết hạn (Expired Token) -> HTTP 401 UNAUTHORIZED
  try {
    const expiredToken = jwt.sign(
      { userId: 'user-expired', email: 'test@example.com', role: UserRole.CANDIDATE },
      secret,
      { expiresIn: '-1s' }
    );

    const ctx = createMockContext(`Bearer ${expiredToken}`);
    let nextCalled = false;

    await authenticateJWT(ctx.req, ctx.res, () => {
      nextCalled = true;
    });

    if (!nextCalled && ctx.getStatus() === 401 && ctx.getBody()?.error?.message.includes('hết hạn')) {
      console.log(green('Test 3 Thành công: Token hết hạn bị từ chối với HTTP 401 và thông báo hết hạn rõ ràng'));
      passed++;
    } else {
      console.log(red(`Test 3 Thất bại: Status ${ctx.getStatus()}, body: ${JSON.stringify(ctx.getBody())}`));
      failed++;
    }
  } catch (err: any) {
    console.log(red(`Test 3 Thất bại: ${err.message}`));
    failed++;
  }

  // Test Case 4: Candidate truy cập route chỉ dành cho HR -> HTTP 403 FORBIDDEN
  try {
    prisma.user.findUnique = (async () => ({
      id: 'candidate-id',
      email: 'candidate@example.com',
      role: UserRole.CANDIDATE,
      isActive: true,
      firstName: 'Ứng viên',
      lastName: 'A'
    })) as any;

    const candidateToken = jwt.sign(
      { userId: 'candidate-id', email: 'candidate@example.com', role: UserRole.CANDIDATE },
      secret,
      { expiresIn: '1h' }
    );

    const ctx = createMockContext(`Bearer ${candidateToken}`);

    // Bước 1: Qua authenticateJWT
    let authenticated = false;
    await authenticateJWT(ctx.req, ctx.res, () => {
      authenticated = true;
    });

    // Bước 2: Qua authorizeRoles(HR)
    let authorized = false;
    const hrMiddleware = authorizeRoles(UserRole.HR);
    hrMiddleware(ctx.req, ctx.res, () => {
      authorized = true;
    });

    if (authenticated && !authorized && ctx.getStatus() === 403 && ctx.getBody()?.error?.code === 'FORBIDDEN') {
      console.log(green('Test 4 Thành công: CANDIDATE truy cập route HR bị chặn với HTTP 403 FORBIDDEN'));
      passed++;
    } else {
      console.log(red(`Test 4 Thất bại: Status ${ctx.getStatus()}`));
      failed++;
    }
  } catch (err: any) {
    console.log(red(`Test 4 Thất bại: ${err.message}`));
    failed++;
  }

  // Test Case 5: HR truy cập route được cấp quyền HR -> Thành công (next called)
  try {
    prisma.user.findUnique = (async () => ({
      id: 'hr-id',
      email: 'hr@example.com',
      role: UserRole.HR,
      isActive: true,
      firstName: 'Nhân sự',
      lastName: 'B'
    })) as any;

    const hrToken = jwt.sign(
      { userId: 'hr-id', email: 'hr@example.com', role: UserRole.HR },
      secret,
      { expiresIn: '1h' }
    );

    const ctx = createMockContext(`Bearer ${hrToken}`);
    let authenticated = false;
    await authenticateJWT(ctx.req, ctx.res, () => {
      authenticated = true;
    });

    let authorized = false;
    const hrMiddleware = authorizeRoles(UserRole.HR, UserRole.ADMIN);
    hrMiddleware(ctx.req, ctx.res, () => {
      authorized = true;
    });

    if (authenticated && authorized) {
      console.log(green('Test 5 Thành công: HR truy cập route HR/ADMIN được phê duyệt thành công'));
      passed++;
    } else {
      console.log(red('Test 5 Thất bại: HR không được cấp quyền hợp lệ'));
      failed++;
    }
  } catch (err: any) {
    console.log(red(`Test 5 Thất bại: ${err.message}`));
    failed++;
  }

  // Test Case 6: ADMIN truy cập route quản trị ADMIN -> Thành công
  try {
    prisma.user.findUnique = (async () => ({
      id: 'admin-id',
      email: 'admin@example.com',
      role: UserRole.ADMIN,
      isActive: true,
      firstName: 'Quản trị',
      lastName: 'Hệ thống'
    })) as any;

    const adminToken = jwt.sign(
      { userId: 'admin-id', email: 'admin@example.com', role: UserRole.ADMIN },
      secret,
      { expiresIn: '1h' }
    );

    const ctx = createMockContext(`Bearer ${adminToken}`);
    let authenticated = false;
    await authenticateJWT(ctx.req, ctx.res, () => {
      authenticated = true;
    });

    let authorized = false;
    const adminMiddleware = authorizeRoles(UserRole.ADMIN);
    adminMiddleware(ctx.req, ctx.res, () => {
      authorized = true;
    });

    if (authenticated && authorized) {
      console.log(green('Test 6 Thành công: ADMIN truy cập route ADMIN được phê duyệt thành công'));
      passed++;
    } else {
      console.log(red('Test 6 Thất bại: ADMIN không được cấp quyền'));
      failed++;
    }
  } catch (err: any) {
    console.log(red(`Test 6 Thất bại: ${err.message}`));
    failed++;
  }

  // Test Case 7: Tài khoản isActive = false bị từ chối ngay tại authenticateJWT
  try {
    prisma.user.findUnique = (async () => ({
      id: 'disabled-hr-id',
      email: 'disabled@example.com',
      role: UserRole.HR,
      isActive: false, // Tài khoản bị vô hiệu hóa
      firstName: 'Bị',
      lastName: 'Khóa'
    })) as any;

    const disabledToken = jwt.sign(
      { userId: 'disabled-hr-id', email: 'disabled@example.com', role: UserRole.HR },
      secret,
      { expiresIn: '1h' }
    );

    const ctx = createMockContext(`Bearer ${disabledToken}`);
    let nextCalled = false;
    await authenticateJWT(ctx.req, ctx.res, () => {
      nextCalled = true;
    });

    if (!nextCalled && ctx.getStatus() === 401 && ctx.getBody()?.error?.message.includes('vô hiệu hóa')) {
      console.log(green('Test 7 Thành công: Tài khoản isActive=false bị từ chối truy cập API bảo vệ'));
      passed++;
    } else {
      console.log(red(`Test 7 Thất bại: Status ${ctx.getStatus()}`));
      failed++;
    }
  } catch (err: any) {
    console.log(red(`Test 7 Thất bại: ${err.message}`));
    failed++;
  }

  // Test Case 8: Không thể giả mạo role từ request body (CANDIDATE gửi body { role: 'ADMIN' })
  try {
    prisma.user.findUnique = (async () => ({
      id: 'candidate-spoof',
      email: 'spoof@example.com',
      role: UserRole.CANDIDATE, // Role thật trong DB
      isActive: true,
      firstName: 'Spoofer',
      lastName: 'X'
    })) as any;

    const candidateToken = jwt.sign(
      { userId: 'candidate-spoof', email: 'spoof@example.com', role: UserRole.CANDIDATE },
      secret,
      { expiresIn: '1h' }
    );

    // Client cố tình gắn role: ADMIN vào body
    const ctx = createMockContext(`Bearer ${candidateToken}`, { role: 'ADMIN' });
    await authenticateJWT(ctx.req, ctx.res, () => {});

    let authorized = false;
    const adminOnly = authorizeRoles(UserRole.ADMIN);
    adminOnly(ctx.req, ctx.res, () => {
      authorized = true;
    });

    if (!authorized && ctx.getStatus() === 403) {
      console.log(green('Test 8 Thành công: Không thể giả mạo role từ request body (req.user.role bảo mật tuyệt đối)'));
      passed++;
    } else {
      console.log(red('Test 8 Thất bại: Bị lừa bởi body spoofing'));
      failed++;
    }
  } catch (err: any) {
    console.log(red(`Test 8 Thất bại: ${err.message}`));
    failed++;
  } finally {
    prisma.user.findUnique = originalFindUnique;
  }

  console.log(`\n${cyan('KẾT QUẢ TỔNG HỢP:')} ${passed}/${passed + failed} test cases đạt yêu cầu.`);
  if (failed > 0) {
    process.exit(1);
  }
}

runRBACTests();
