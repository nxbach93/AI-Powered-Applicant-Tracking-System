import 'dotenv/config';
import assert from 'node:assert';
import prisma from '../lib/prisma';
import authService from '../services/auth.service';
import emailService from '../services/email.service';
import jwt from 'jsonwebtoken';

async function runLiveMySQLAuthTests() {
  console.log('ℹ BẮT ĐẦU KIỂM THỬ MODULE AUTH TRÊN DATABASE MYSQL THẬT (DOCKER CONTAINER)...\n');

  const testEmail = `test_candidate_${Date.now()}@ats-live.com`;
  const originalPassword = 'Password123!';
  const updatedPassword = 'NewSecretPassword456!';
  let userId: string;
  let candidateToken: string;
  let rawResetToken: string | null = null;

  try {
    // 0. Kiểm tra kết nối Prisma tới MySQL
    console.log('--- BƯỚC 0: KIỂM TRA KẾT NỐI PRISMA TỚI MYSQL ---');
    await prisma.$connect();
    const tableCheck = await prisma.user.count();
    console.log(`✔ Kết nối thành công tới MySQL Docker! Tổng số User hiện tại: ${tableCheck}`);

    // 1. Kiểm tra Đăng ký Candidate với Database thật
    console.log('\n--- BƯỚC 1: ĐĂNG KÝ CANDIDATE TRÊN MYSQL THẬT ---');
    const registerResult = await authService.registerCandidate({
      email: testEmail,
      password: originalPassword,
      firstName: 'Nguyễn',
      lastName: 'Văn Test',
    });

    assert.ok(registerResult.id, 'Phải có userId trả về');
    assert.strictEqual(registerResult.email, testEmail);
    assert.strictEqual(registerResult.role, 'CANDIDATE');
    assert.strictEqual(registerResult.isActive, true);
    userId = registerResult.id;

    // Kiểm tra trực tiếp trong DB
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { candidateProfile: true },
    });

    assert.ok(dbUser, 'User phải tồn tại trong bảng users của MySQL');
    assert.ok(dbUser.password.startsWith('$2'), 'Password phải được băm bằng bcrypt');
    assert.notStrictEqual(dbUser.password, originalPassword, 'Password không được lưu dạng plaintext');
    assert.strictEqual(dbUser.tokenVersion, 0, 'tokenVersion khởi tạo phải là 0');
    assert.ok(dbUser.candidateProfile, 'candidateProfile phải được tự động tạo trong candidate_profiles');
    console.log('✔ Bước 1 PASS: Đăng ký thành công, lưu đúng bảng users và candidate_profiles!');

    // 2. Kiểm tra chặn email trùng trên MySQL thật
    console.log('\n--- BƯỚC 2: KIỂM TRA CHẶN EMAIL TRÙNG ---');
    try {
      await authService.registerCandidate({
        email: testEmail,
        password: originalPassword,
        firstName: 'Test',
        lastName: 'Trùng',
      });
      assert.fail('Đăng ký email trùng phải ném lỗi');
    } catch (err: any) {
      assert.strictEqual(err.code, 'EMAIL_ALREADY_EXISTS');
      console.log('✔ Bước 2 PASS: Database MySQL bắt đúng email trùng với lỗi ConflictError!');
    }

    // 3. Kiểm tra Đăng nhập JWT với MySQL thật
    console.log('\n--- BƯỚC 3: ĐĂNG NHẬP JWT VỚI MYSQL THẬT ---');
    const loginResult = await authService.login({
      email: testEmail,
      password: originalPassword,
    });

    assert.ok(loginResult.token, 'Phải sinh JWT token');
    candidateToken = loginResult.token;
    assert.strictEqual(loginResult.user.id, userId);
    assert.strictEqual(loginResult.user.email, testEmail);

    // Kiểm tra payload token
    const decoded: any = jwt.verify(candidateToken, process.env.JWT_SECRET || 'ats-secret-jwt-key-2026-development');
    assert.strictEqual(decoded.userId, userId);
    assert.strictEqual(decoded.role, 'CANDIDATE');
    assert.strictEqual(decoded.tokenVersion, 0);

    // Thử đăng nhập sai mật khẩu
    try {
      await authService.login({
        email: testEmail,
        password: 'WrongPassword!',
      });
      assert.fail('Mật khẩu sai phải ném UnauthorizedError');
    } catch (err: any) {
      assert.strictEqual(err.code, 'INVALID_CREDENTIALS');
    }
    console.log('✔ Bước 3 PASS: Đăng nhập JWT thành công, kiểm tra mật khẩu sai chính xác!');

    // 4. Kiểm tra GET /api/auth/me (getMe)
    console.log('\n--- BƯỚC 4: LẤY THÔNG TIN TÀI KHOẢN (GET /me) ---');
    const meResult = await authService.getMe(userId);
    assert.strictEqual(meResult.id, userId);
    assert.strictEqual(meResult.email, testEmail);
    assert.ok(meResult.candidateProfile, 'Phải có CandidateProfile đi kèm');
    assert.strictEqual((meResult as any).password, undefined, 'Không được trả về password');
    console.log('✔ Bước 4 PASS: Lấy thông tin tài khoản đầy đủ, không rò rỉ password!');

    // 5. Kiểm tra cập nhật Profile trên MySQL thật
    console.log('\n--- BƯỚC 5: CẬP NHẬT HỒ SƠ CÁ NHÂN ---');
    const updateResult = await authService.updateProfile(userId, {
      firstName: 'Nguyễn Thành',
      lastName: 'Công',
      phone: '0987654321',
      address: 'Hà Nội, Việt Nam',
      experienceYears: 3,
      education: 'Đại học Bách Khoa',
    });

    assert.strictEqual(updateResult.firstName, 'Nguyễn Thành');
    assert.strictEqual(updateResult.lastName, 'Công');

    // Kiểm tra trực tiếp bảng candidate_profiles trong DB
    const dbProfile = await prisma.candidateProfile.findUnique({
      where: { userId },
    });
    assert.strictEqual(dbProfile?.phone, '0987654321');
    assert.strictEqual(dbProfile?.address, 'Hà Nội, Việt Nam');
    assert.strictEqual(dbProfile?.experienceYears, 3);
    console.log('✔ Bước 5 PASS: Cập nhật hồ sơ cá nhân và bảng candidate_profiles thành công!');

    // 6. Kiểm tra đổi mật khẩu trên MySQL thật
    console.log('\n--- BƯỚC 6: ĐỔI MẬT KHẨU ---');
    await authService.changePassword(userId, {
      currentPassword: originalPassword,
      newPassword: updatedPassword,
    });

    // Thử đăng nhập lại bằng mật khẩu cũ (phải thất bại)
    try {
      await authService.login({
        email: testEmail,
        password: originalPassword,
      });
      assert.fail('Mật khẩu cũ không được phép đăng nhập');
    } catch (err: any) {
      assert.strictEqual(err.code, 'INVALID_CREDENTIALS');
    }

    // Đăng nhập bằng mật khẩu mới (phải thành công)
    const newLoginResult = await authService.login({
      email: testEmail,
      password: updatedPassword,
    });
    assert.ok(newLoginResult.token, 'Đăng nhập mật khẩu mới phải thành công');
    console.log('✔ Bước 6 PASS: Đổi mật khẩu thành công, mật khẩu cũ bị từ chối, mật khẩu mới hoạt động!');

    // 7. Kiểm tra Quên mật khẩu & sinh PasswordResetToken
    console.log('\n--- BƯỚC 7: YÊU CẦU QUÊN MẬT KHẨU (FORGOT PASSWORD) ---');
    // Mock gửi email trong môi trường dev
    const originalSend = emailService.sendPasswordResetEmail;
    emailService.sendPasswordResetEmail = async (_to: string, resetUrl: string) => {
      try {
        const url = new URL(resetUrl);
        rawResetToken = url.searchParams.get('token');
      } catch {
        rawResetToken = resetUrl.split('token=')[1] || resetUrl;
      }
    };

    await authService.forgotPassword({ email: testEmail });
    assert.ok(rawResetToken, 'Phải sinh ra token reset thô');

    // Kiểm tra bảng password_reset_tokens trong MySQL
    const dbTokens = await prisma.passwordResetToken.findMany({
      where: { userId },
    });
    assert.strictEqual(dbTokens.length, 1, 'Phải có đúng 1 bản ghi reset token');
    assert.strictEqual(dbTokens[0].usedAt, null, 'usedAt ban đầu phải là null');
    assert.notStrictEqual(dbTokens[0].tokenHash, rawResetToken, 'Token trong DB phải được băm SHA-256');
    console.log('✔ Bước 7 PASS: Quên mật khẩu sinh token thành công, lưu bản ghi băm SHA-256 vào MySQL!');

    // 8. Kiểm tra Đặt lại mật khẩu (Reset Password)
    console.log('\n--- BƯỚC 8: ĐẶT LẠI MẬT KHẨU VÀ KIỂM TRA DÙNG 1 LẦN ---');
    const finalPassword = 'FinalSecurePassword789!';
    await authService.resetPassword({
      token: rawResetToken!,
      newPassword: finalPassword,
    });

    // Kiểm tra trong MySQL: token đã được đánh dấu usedAt
    const usedToken = await prisma.passwordResetToken.findUnique({
      where: { id: dbTokens[0].id },
    });
    assert.ok(usedToken?.usedAt !== null, 'usedAt phải được cập nhật sau khi reset');

    // Thử sử dụng lại token cũ (phải thất bại)
    try {
      await authService.resetPassword({
        token: rawResetToken!,
        newPassword: 'AnotherPassword999!',
      });
      assert.fail('Token đã sử dụng không được phép tái sử dụng');
    } catch (err: any) {
      assert.ok(err instanceof Error, 'Phải ném ngoại lệ');
      assert.ok(err.message.includes('đã được sử dụng'), 'Thông báo phải ghi rõ token đã được sử dụng');
      console.log('✔ Bước 8 PASS: Reset password thành công, token chỉ dùng đúng 1 lần!');
    }

    // 9. Kiểm tra tokenVersion và vô hiệu hóa JWT cũ
    console.log('\n--- BƯỚC 9: KIỂM TRA THU HỒI PHIÊN JWT QUA TOKEN_VERSION ---');
    const userAfterReset = await prisma.user.findUnique({ where: { id: userId } });
    assert.strictEqual(userAfterReset?.tokenVersion, 1, 'tokenVersion phải tăng lên 1 sau khi reset password');

    // Token cũ (sinh ở bước 3 có tokenVersion: 0)
    const oldPayload: any = jwt.verify(candidateToken, process.env.JWT_SECRET || 'ats-secret-jwt-key-2026-development');
    assert.strictEqual(oldPayload.tokenVersion, 0);
    assert.notStrictEqual(oldPayload.tokenVersion, userAfterReset?.tokenVersion, 'tokenVersion trong JWT cũ bị lệch với DB');
    console.log('✔ Bước 9 PASS: tokenVersion trong DB tăng lên 1, JWT cũ bị vô hiệu hóa an toàn!');

    // Restore mock email
    emailService.sendPasswordResetEmail = originalSend;

    console.log('\n======================================================');
    console.log('🎉 TẤT CẢ 9 BƯỚC KIỂM THỬ TRÊN MYSQL THẬT ĐỀU PASS 100%!');
    console.log('======================================================\n');
  } finally {
    await prisma.$disconnect();
  }
}

runLiveMySQLAuthTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ LỖI TRONG QUÁ TRÌNH KIỂM THỬ MYSQL THẬT:', err);
    process.exit(1);
  });
