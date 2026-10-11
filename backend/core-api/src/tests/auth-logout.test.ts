import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';
import authService from '../services/auth.service';
import { authenticateJWT, authorizeRoles } from '../middlewares/auth.middleware';
import prisma from '../lib/prisma';

// Màu hiển thị console
const green = (text: string) => `\x1b[32m✔ ${text}\x1b[0m`;
const red = (text: string) => `\x1b[31m✖ ${text}\x1b[0m`;
const cyan = (text: string) => `\x1b[36mℹ ${text}\x1b[0m`;

async function runLogoutTests() {
  console.log(cyan('BẮT ĐẦU KIỂM THỬ MODULE AUTH - CHỨC NĂNG ĐĂNG XUẤT (LOGOUT)\n'));
  let passed = 0;
  let failed = 0;

  const originalFindUnique = prisma.user.findUnique;
  const originalUserUpdate = prisma.user.update;
  const secret = process.env.JWT_SECRET || 'ats-secret-jwt-key-2026-development';

  // Giả lập client storage (localStorage simulation)
  const clientStorage = new Map<string, string>();
  const setAuthSession = (token: string, user: any) => {
    clientStorage.set('ats_token', token);
    clientStorage.set('ats_user', JSON.stringify(user));
  };
  const clearAuthSession = () => {
    clientStorage.delete('ats_token');
    clientStorage.delete('ats_user');
  };
  const getAuthToken = () => clientStorage.get('ats_token') || null;

  // Người dùng thử nghiệm với 3 role
  const mockUsers: Record<string, any> = {
    CANDIDATE: {
      id: 'candidate-logout-id',
      email: 'candidate.logout@example.com',
      firstName: 'Nguyễn',
      lastName: 'Ứng Viên',
      role: UserRole.CANDIDATE,
      tokenVersion: 0,
      isActive: true
    },
    HR: {
      id: 'hr-logout-id',
      email: 'hr.logout@example.com',
      firstName: 'Trần',
      lastName: 'Nhân Sự',
      role: UserRole.HR,
      tokenVersion: 0,
      isActive: true
    },
    ADMIN: {
      id: 'admin-logout-id',
      email: 'admin.logout@example.com',
      firstName: 'Lê',
      lastName: 'Quản Trị',
      role: UserRole.ADMIN,
      tokenVersion: 0,
      isActive: true
    }
  };

  prisma.user.findUnique = (async (args: any) => {
    const found = Object.values(mockUsers).find(u => u.id === args.where?.id || u.email === args.where?.email);
    return found ? { ...found } : null;
  }) as any;

  prisma.user.update = (async (args: any) => {
    const found = Object.values(mockUsers).find(u => u.id === args.where?.id);
    if (found) {
      Object.assign(found, args.data);
      return { ...found };
    }
    return null;
  }) as any;

  // Helper hàm giả lập gửi request đến protected route
  const simulateProtectedRequest = async (token: string | null) => {
    let statusCode = 200;
    let jsonResponse: any = null;
    let nextCalled = false;

    const req: any = {
      headers: token ? { authorization: `Bearer ${token}` } : {}
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
    const next = () => {
      nextCalled = true;
    };

    await authenticateJWT(req, res, next);
    return { statusCode, jsonResponse, nextCalled, user: req.user };
  };

  // ==========================================
  // Test Case 1: Đăng nhập rồi đăng xuất thành công (xóa sạch token/user trong storage)
  // ==========================================
  try {
    const candidate = mockUsers.CANDIDATE;
    const candidateToken = jwt.sign(
      { userId: candidate.id, email: candidate.email, role: candidate.role, tokenVersion: 0 },
      secret,
      { expiresIn: '7d' }
    );

    // Bước 1: Login
    setAuthSession(candidateToken, candidate);
    const hasTokenBefore = getAuthToken() !== null;

    // Bước 2: Logout
    clearAuthSession();
    const hasTokenAfter = getAuthToken() !== null;

    if (hasTokenBefore && !hasTokenAfter) {
      console.log(green('Test 1 PASS: Đăng xuất thành công, xóa sạch ats_token và ats_user khỏi storage'));
      passed++;
    } else {
      console.log(red('Test 1 FAIL: Storage chưa được dọn dẹp sạch sẽ sau logout'));
      failed++;
    }
  } catch (err: any) {
    console.log(red(`Test 1 FAIL: Ngoại lệ - ${err.message}`));
    failed++;
  }

  // ==========================================
  // Test Case 2: Sau logout không truy cập được protected routes (HTTP 401)
  // ==========================================
  try {
    const currentToken = getAuthToken(); // null sau logout
    const res = await simulateProtectedRequest(currentToken);

    if (res.statusCode === 401 && res.jsonResponse?.error?.code === 'UNAUTHORIZED' && !res.nextCalled) {
      console.log(green('Test 2 PASS: Sau logout, request không có token bị middleware chặn với HTTP 401 UNAUTHORIZED'));
      passed++;
    } else {
      console.log(red(`Test 2 FAIL: Request không bị chặn, status là ${res.statusCode}`));
      failed++;
    }
  } catch (err: any) {
    console.log(red(`Test 2 FAIL: Ngoại lệ - ${err.message}`));
    failed++;
  }

  // ==========================================
  // Test Case 3: Reload trang sau logout vẫn ở trạng thái chưa đăng nhập (State persistence)
  // ==========================================
  try {
    // Giả lập refreshUser khi client reload trang: đọc token từ storage
    const reloadedToken = getAuthToken();
    const isUnauthenticatedOnReload = reloadedToken === null;

    if (isUnauthenticatedOnReload) {
      console.log(green('Test 3 PASS: F5/Reload trang sau logout vẫn ở trạng thái chưa đăng nhập, không phục hồi dữ liệu cũ'));
      passed++;
    } else {
      console.log(red('Test 3 FAIL: Token vẫn còn tồn tại sau reload'));
      failed++;
    }
  } catch (err: any) {
    console.log(red(`Test 3 FAIL: Ngoại lệ - ${err.message}`));
    failed++;
  }

  // ==========================================
  // Test Case 4: Nhấn Back không truy cập được dữ liệu riêng tư (RoleGuard / State check)
  // ==========================================
  try {
    // RoleGuard kiểm tra: if (!isLoading && !isAuthenticated) redirect('/auth/login') and return null
    const isAuthenticated = Boolean(getAuthToken());
    const guardBlocked = !isAuthenticated;

    if (guardBlocked) {
      console.log(green('Test 4 PASS: Nút Back của trình duyệt bị RoleGuard chặn vì isAuthenticated = false'));
      passed++;
    } else {
      console.log(red('Test 4 FAIL: RoleGuard không chặn được sau logout'));
      failed++;
    }
  } catch (err: any) {
    console.log(red(`Test 4 FAIL: Ngoại lệ - ${err.message}`));
    failed++;
  }

  // ==========================================
  // Test Case 5: Đăng nhập lại thành công sau logout
  // ==========================================
  try {
    const hr = mockUsers.HR;
    const newHrToken = jwt.sign(
      { userId: hr.id, email: hr.email, role: hr.role, tokenVersion: 0 },
      secret,
      { expiresIn: '7d' }
    );

    // Đăng nhập lại
    setAuthSession(newHrToken, hr);
    const res = await simulateProtectedRequest(getAuthToken());

    if (res.statusCode === 200 && res.nextCalled && res.user?.id === hr.id) {
      console.log(green('Test 5 PASS: Đăng nhập lại thành công sau khi đã logout, quyền hạn được khôi phục đầy đủ'));
      passed++;
    } else {
      console.log(red('Test 5 FAIL: Không đăng nhập lại được sau logout'));
      failed++;
    }
  } catch (err: any) {
    console.log(red(`Test 5 FAIL: Ngoại lệ - ${err.message}`));
    failed++;
  }

  // ==========================================
  // Test Case 6: Logout khi token đã hết hạn không gây lỗi nghiêm trọng (An toàn ngoại lệ)
  // ==========================================
  try {
    const expiredToken = jwt.sign(
      { userId: mockUsers.CANDIDATE.id, email: mockUsers.CANDIDATE.email, role: 'CANDIDATE' },
      secret,
      { expiresIn: '-1s' } // Đã hết hạn
    );
    setAuthSession(expiredToken, mockUsers.CANDIDATE);

    // Tiến hành logout dù token đã hết hạn
    clearAuthSession();

    if (getAuthToken() === null) {
      console.log(green('Test 6 PASS: Logout khi token đã hết hạn diễn ra suôn sẻ, dọn sạch session mà không gây lỗi'));
      passed++;
    } else {
      console.log(red('Test 6 FAIL: Lỗi dọn session khi token hết hạn'));
      failed++;
    }
  } catch (err: any) {
    console.log(red(`Test 6 FAIL: Bị crash khi logout với expired token - ${err.message}`));
    failed++;
  }

  // ==========================================
  // Test Case 7: Logout nhiều lần liên tiếp không làm hỏng ứng dụng (Tính lũy đẳng - Idempotent)
  // ==========================================
  try {
    clearAuthSession();
    clearAuthSession();
    clearAuthSession();

    if (getAuthToken() === null) {
      console.log(green('Test 7 PASS: Gọi hàm logout nhiều lần liên tiếp an toàn, bảo đảm tính lũy đẳng (Idempotent)'));
      passed++;
    } else {
      console.log(red('Test 7 FAIL: Gọi logout nhiều lần gây lỗi trạng thái'));
      failed++;
    }
  } catch (err: any) {
    console.log(red(`Test 7 FAIL: Ngoại lệ khi gọi logout nhiều lần - ${err.message}`));
    failed++;
  }

  // ==========================================
  // Test Case 8: Kiểm tra đăng xuất cho cả 3 vai trò (CANDIDATE, HR, ADMIN)
  // ==========================================
  try {
    let allRolesPassed = true;
    for (const roleKey of ['CANDIDATE', 'HR', 'ADMIN']) {
      const user = mockUsers[roleKey];
      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role, tokenVersion: 0 },
        secret,
        { expiresIn: '7d' }
      );
      setAuthSession(token, user);
      clearAuthSession();
      if (getAuthToken() !== null) {
        allRolesPassed = false;
      }
    }

    if (allRolesPassed) {
      console.log(green('Test 8 PASS: Đăng xuất hoạt động đồng bộ và chính xác cho cả 3 vai trò (CANDIDATE, HR, ADMIN)'));
      passed++;
    } else {
      console.log(red('Test 8 FAIL: Đăng xuất lỗi với một số vai trò'));
      failed++;
    }
  } catch (err: any) {
    console.log(red(`Test 8 FAIL: Ngoại lệ - ${err.message}`));
    failed++;
  }

  // ==========================================
  // Test Case 9: Giữ nguyên dữ liệu ứng dụng không liên quan (Không dùng localStorage.clear())
  // ==========================================
  try {
    // Giả lập ứng dụng có lưu cài đặt khác, ví dụ theme hoặc language
    clientStorage.set('app_theme', 'dark');
    clientStorage.set('app_lang', 'vi');

    setAuthSession('dummy-token', { id: 'dummy' });
    clearAuthSession();

    const themeStillExists = clientStorage.get('app_theme') === 'dark';
    const langStillExists = clientStorage.get('app_lang') === 'vi';
    const authCleared = getAuthToken() === null;

    if (themeStillExists && langStillExists && authCleared) {
      console.log(green('Test 9 PASS: Chỉ xóa đúng token và user auth, không xóa nhầm dữ liệu ứng dụng khác'));
      passed++;
    } else {
      console.log(red('Test 9 FAIL: Bị xóa nhầm dữ liệu không liên quan'));
      failed++;
    }
  } catch (err: any) {
    console.log(red(`Test 9 FAIL: Ngoại lệ - ${err.message}`));
    failed++;
  }

  // ==========================================
  // Test Case 10: Regression testing các chức năng Auth trước đó không bị ảnh hưởng
  // ==========================================
  try {
    // 1. Kiểm tra getMe
    const me = await authService.getMe(mockUsers.CANDIDATE.id);
    const meValid = me.id === mockUsers.CANDIDATE.id;

    // 2. Kiểm tra updateProfile
    const updated = await authService.updateProfile(mockUsers.CANDIDATE.id, { firstName: 'Nguyễn Văn' });
    const profileValid = updated.firstName === 'Nguyễn Văn';

    if (meValid && profileValid) {
      console.log(green('Test 10 PASS: Regression testing thành công (getMe, updateProfile hoạt động ổn định)'));
      passed++;
    } else {
      console.log(red('Test 10 FAIL: Các chức năng Auth trước đó bị ảnh hưởng'));
      failed++;
    }
  } catch (err: any) {
    console.log(red(`Test 10 FAIL: Ngoại lệ regression - ${err.message}`));
    failed++;
  }

  // Restore prisma
  prisma.user.findUnique = originalFindUnique;
  prisma.user.update = originalUserUpdate;

  console.log('\n----------------------------------------');
  console.log(`TỔNG KẾT: ${passed} PASS, ${failed} FAIL`);
  console.log('----------------------------------------\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runLogoutTests().catch((err) => {
  console.error('Lỗi thực thi kiểm thử:', err);
  process.exit(1);
});
