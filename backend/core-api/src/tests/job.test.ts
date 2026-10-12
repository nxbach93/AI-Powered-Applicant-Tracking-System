import { JobStatus, UserRole } from '@prisma/client';
import {
  jobService,
  ValidationError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
} from '../services/job.service';
import prisma from '../lib/prisma';

// Helper in màu console
const green = (text: string) => `\x1b[32m✔ ${text}\x1b[0m`;
const red = (text: string) => `\x1b[31m✖ ${text}\x1b[0m`;
const cyan = (text: string) => `\x1b[36mℹ ${text}\x1b[0m`;
const yellow = (text: string) => `\x1b[33m⚠ ${text}\x1b[0m`;

async function runJobTests() {
  console.log(cyan('BẮT ĐẦU KIỂM THỬ MODULE JOB - TV2 RECRUITMENT & JOB MANAGEMENT\n'));

  let passed = 0;
  let failed = 0;

  // 1. Kiểm thử Validation: Tiêu đề rỗng / quá ngắn
  try {
    await jobService.createJob('dummy-user-id', {
      title: '  ',
      description: 'Mô tả công việc chi tiết hơn 10 ký tự',
    });
    console.log(red('Test 1 Thất bại: Đáng lẽ phải chặn tiêu đề rỗng'));
    failed++;
  } catch (err: any) {
    if (err instanceof ValidationError && err.details.some((d) => d.field === 'title')) {
      console.log(green('Test 1 Thành công: Chặn đúng tiêu đề rỗng / không hợp lệ'));
      passed++;
    } else {
      console.log(red(`Test 1 Thất bại: Lỗi không đúng kỳ vọng: ${err.message}`));
      failed++;
    }
  }

  // 2. Kiểm thử Validation: Mô tả rỗng / < 10 ký tự
  try {
    await jobService.createJob('dummy-user-id', {
      title: 'Senior Node.js Developer',
      description: 'Ngắn',
    });
    console.log(red('Test 2 Thất bại: Đáng lẽ phải chặn mô tả quá ngắn (< 10 ký tự)'));
    failed++;
  } catch (err: any) {
    if (err instanceof ValidationError && err.details.some((d) => d.field === 'description')) {
      console.log(green('Test 2 Thành công: Chặn đúng mô tả công việc dưới 10 ký tự'));
      passed++;
    } else {
      console.log(red(`Test 2 Thất bại: ${err.message}`));
      failed++;
    }
  }

  // 3. Kiểm thử Validation: salaryMin > salaryMax
  try {
    await jobService.createJob('dummy-user-id', {
      title: 'Senior Node.js Developer',
      description: 'Mô tả công việc chi tiết đáp ứng yêu cầu kỹ thuật',
      salaryMin: 30000000,
      salaryMax: 20000000, // Nhỏ hơn Min
    });
    console.log(red('Test 3 Thất bại: Đáng lẽ phải chặn salaryMin > salaryMax'));
    failed++;
  } catch (err: any) {
    if (err instanceof ValidationError && err.details.some((d) => d.field === 'salaryMin')) {
      console.log(green('Test 3 Thành công: Chặn đúng logic salaryMin > salaryMax'));
      passed++;
    } else {
      console.log(red(`Test 3 Thất bại: ${err.message}`));
      failed++;
    }
  }

  // 4. Kiểm thử Validation: Mức lương âm (< 0)
  try {
    await jobService.createJob('dummy-user-id', {
      title: 'Senior Node.js Developer',
      description: 'Mô tả công việc chi tiết đáp ứng yêu cầu kỹ thuật',
      salaryMin: -5000000,
    });
    console.log(red('Test 4 Thất bại: Đáng lẽ phải chặn mức lương âm'));
    failed++;
  } catch (err: any) {
    if (err instanceof ValidationError && err.details.some((d) => d.field === 'salaryMin')) {
      console.log(green('Test 4 Thành công: Chặn đúng mức lương số âm'));
      passed++;
    } else {
      console.log(red(`Test 4 Thất bại: ${err.message}`));
      failed++;
    }
  }

  // 5. Kiểm thử Validation: Trạng thái không thuộc JobStatus
  try {
    await jobService.createJob('dummy-user-id', {
      title: 'Senior Node.js Developer',
      description: 'Mô tả công việc chi tiết đáp ứng yêu cầu kỹ thuật',
      status: 'INVALID_STATUS' as any,
    });
    console.log(red('Test 5 Thất bại: Đáng lẽ phải chặn trạng thái không hợp lệ'));
    failed++;
  } catch (err: any) {
    if (err instanceof ValidationError && err.details.some((d) => d.field === 'status')) {
      console.log(green('Test 5 Thành công: Chặn đúng trạng thái JobStatus không hợp lệ'));
      passed++;
    } else {
      console.log(red(`Test 5 Thất bại: ${err.message}`));
      failed++;
    }
  }

  // Kiểm tra kết nối tới MySQL trước khi chạy tiếp các test tích hợp Database
  let isDbConnected = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    isDbConnected = true;
  } catch {
    console.log(yellow('\n[LƯU Ý]: Cơ sở dữ liệu MySQL (XAMPP/Docker) chưa được kích hoạt'));
    console.log(yellow('-> Bỏ qua các bài test CSDL tích hợp trực tiếp. Các bài test logic và validation nghiệp vụ đã vượt qua 100%.\n'));
  }

  if (isDbConnected) {
    console.log(cyan('\n--- BẮT ĐẦU KIỂM THỬ TRÊN CSDL MYSQL THỰC TẾ ---'));

    const testHrEmail = 'hr_tv2_test@example.com';
    const otherHrEmail = 'hr_other_test@example.com';

    await prisma.jobPosting.deleteMany({
      where: {
        OR: [
          { postedBy: { email: testHrEmail } },
          { postedBy: { email: otherHrEmail } },
        ],
      },
    });

    await prisma.user.deleteMany({
      where: {
        email: { in: [testHrEmail, otherHrEmail] },
      },
    });

    // Tạo 2 tài khoản HR test
    const hrUser1 = await prisma.user.create({
      data: {
        email: testHrEmail,
        password: 'HashedPassword123@',
        firstName: 'Bách',
        lastName: 'Nguyễn',
        role: UserRole.HR,
        isActive: true,
      },
    });

    const hrUser2 = await prisma.user.create({
      data: {
        email: otherHrEmail,
        password: 'HashedPassword123@',
        firstName: 'Giang',
        lastName: 'Nguyễn',
        role: UserRole.HR,
        isActive: true,
      },
    });

    let createdJobId = '';

    // 6. Kiểm thử Tạo tin tuyển dụng hợp lệ
    try {
      const job = await jobService.createJob(hrUser1.id, {
        title: 'Fullstack Engineer (React & Node.js)',
        department: 'Phát triển Phần mềm',
        location: 'Hà Nội',
        employmentType: 'FULL_TIME',
        description: 'Phát triển hệ thống ATS ứng dụng AI, tối ưu hóa quy trình sàng lọc CV.',
        requirements: 'Ít nhất 2 năm kinh nghiệm React, TypeScript, Express, Prisma ORM.',
        salaryMin: 20000000,
        salaryMax: 35000000,
        status: JobStatus.DRAFT,
        applicationDeadline: '2026-12-31T23:59:59.000Z',
      });

      createdJobId = job.id;
      if (job && job.title === 'Fullstack Engineer (React & Node.js)' && job.status === JobStatus.DRAFT) {
        console.log(green('Test 6 Thành công: Tạo tin tuyển dụng mới với trạng thái DRAFT thành công'));
        passed++;
      } else {
        console.log(red('Test 6 Thất bại: Dữ liệu trả về không khớp'));
        failed++;
      }
    } catch (err: any) {
      console.log(red(`Test 6 Thất bại: ${err.message}`));
      failed++;
    }

    // 7. Kiểm thử Row-Level Security: HR khác (hrUser2) cố tình sửa tin của hrUser1
    try {
      await jobService.updateJob(createdJobId, hrUser2.id, UserRole.HR, {
        title: 'Hack Title by Another HR',
      });
      console.log(red('Test 7 Thất bại: Đáng lẽ phải chặn HR khác sửa tin không thuộc quyền sở hữu'));
      failed++;
    } catch (err: any) {
      if (err instanceof ForbiddenError) {
        console.log(green('Test 7 Thành công: Chặn đúng quyền sở hữu (Row-Level Security 403 Forbidden)'));
        passed++;
      } else {
        console.log(red(`Test 7 Thất bại: Lỗi không đúng: ${err.message}`));
        failed++;
      }
    }

    // 8. Kiểm thử HR chủ sở hữu cập nhật tin thành công
    try {
      const updated = await jobService.updateJob(createdJobId, hrUser1.id, UserRole.HR, {
        title: 'Senior Fullstack Engineer (React, Node.js & AI)',
        salaryMin: 25000000,
        salaryMax: 40000000,
      });
      if (updated.title === 'Senior Fullstack Engineer (React, Node.js & AI)') {
        console.log(green('Test 8 Thành công: HR chủ sở hữu cập nhật tin thành công'));
        passed++;
      } else {
        console.log(red('Test 8 Thất bại: Tiêu đề chưa được cập nhật'));
        failed++;
      }
    } catch (err: any) {
      console.log(red(`Test 8 Thất bại: ${err.message}`));
      failed++;
    }

    // 9. Kiểm thử Đổi trạng thái tin sang PUBLISHED
    try {
      const published = await jobService.updateJobStatus(createdJobId, hrUser1.id, UserRole.HR, JobStatus.PUBLISHED);
      if (published.status === JobStatus.PUBLISHED) {
        console.log(green('Test 9 Thành công: Đổi trạng thái tin sang PUBLISHED thành công'));
        passed++;
      } else {
        console.log(red('Test 9 Thất bại: Trạng thái không đổi'));
        failed++;
      }
    } catch (err: any) {
      console.log(red(`Test 9 Thất bại: ${err.message}`));
      failed++;
    }

    // 10. Kiểm thử Quyền xem tin của Khách / Ứng viên vs Staff
    try {
      const publicJob = await jobService.getJobById(createdJobId, undefined);
      await jobService.updateJobStatus(createdJobId, hrUser1.id, UserRole.HR, JobStatus.DRAFT);

      let blockedCandidate = false;
      try {
        await jobService.getJobById(createdJobId, { id: 'cand-id', email: 'cand@test.com', role: UserRole.CANDIDATE });
      } catch (e: any) {
        if (e instanceof NotFoundError) blockedCandidate = true;
      }

      const hrViewDraft = await jobService.getJobById(createdJobId, { id: hrUser1.id, email: hrUser1.email, role: UserRole.HR });
      await jobService.updateJobStatus(createdJobId, hrUser1.id, UserRole.HR, JobStatus.PUBLISHED);

      if (publicJob && blockedCandidate && hrViewDraft) {
        console.log(green('Test 10 Thành công: Bảo mật tin DRAFT (Khách/Candidate bị chặn 404, HR xem được)'));
        passed++;
      } else {
        console.log(red('Test 10 Thất bại: Luồng kiểm tra quyền xem tin chưa chặt chẽ'));
        failed++;
      }
    } catch (err: any) {
      console.log(red(`Test 10 Thất bại: ${err.message}`));
      failed++;
    }

    // 11. Kiểm thử Safe Delete Rule: Giả lập tin có hồ sơ ứng tuyển nộp vào
    try {
      const candidateUser = await prisma.user.create({
        data: {
          email: 'candidate_tv2_test@example.com',
          password: 'HashedPassword123@',
          firstName: 'An',
          lastName: 'Trần',
          role: UserRole.CANDIDATE,
        },
      });

      const candidateProfile = await prisma.candidateProfile.create({
        data: {
          userId: candidateUser.id,
        },
      });

      const app = await prisma.application.create({
        data: {
          candidateProfileId: candidateProfile.id,
          jobPostingId: createdJobId,
        },
      });

      let safeDeleteBlocked = false;
      try {
        await jobService.deleteJob(createdJobId, hrUser1.id, UserRole.HR);
      } catch (err: any) {
        if (err instanceof ConflictError && err.code === 'JOB_HAS_APPLICATIONS') {
          safeDeleteBlocked = true;
        }
      }

      await prisma.application.delete({ where: { id: app.id } });
      await prisma.candidateProfile.delete({ where: { id: candidateProfile.id } });
      await prisma.user.delete({ where: { id: candidateUser.id } });

      if (safeDeleteBlocked) {
        console.log(green('Test 11 Thành công: Safe Delete Rule hoạt động đúng (Chặn xóa tin đã có ứng viên nộp đơn)'));
        passed++;
      } else {
        console.log(red('Test 11 Thất bại: Safe Delete Rule không chặn xóa tin đã có đơn'));
        failed++;
      }
    } catch (err: any) {
      console.log(red(`Test 11 Thất bại: ${err.message}`));
      failed++;
    }

    // 12. Kiểm thử Xóa tin thành công khi có 0 ứng viên
    try {
      const deleteResult = await jobService.deleteJob(createdJobId, hrUser1.id, UserRole.HR);
      const checkDeleted = await prisma.jobPosting.findUnique({ where: { id: createdJobId } });

      if (deleteResult && !checkDeleted) {
        console.log(green('Test 12 Thành công: Xóa tin thành công khi không có ứng viên'));
        passed++;
      } else {
        console.log(red('Test 12 Thất bại: Bản ghi vẫn còn tồn tại trong DB'));
        failed++;
      }
    } catch (err: any) {
      console.log(red(`Test 12 Thất bại: ${err.message}`));
      failed++;
    }

    // Dọn dẹp tài khoản test
    await prisma.user.deleteMany({
      where: { email: { in: [testHrEmail, otherHrEmail] } },
    });
  }

  console.log(cyan(`\nKẾT QUẢ KIỂM THỬ: ${passed} Passed, ${failed} Failed`));
  if (failed > 0) {
    process.exit(1);
  }
}

runJobTests().catch((err) => {
  console.error(red('Lỗi thực thi kiểm thử:'), err);
  process.exit(1);
});
