import prisma from '../lib/prisma';
import applicationService, { AppError } from '../services/application.service';
import { UserRole, ApplicationStatus, JobStatus } from '@prisma/client';

const green = (text: string) => `\x1b[32m✔ ${text}\x1b[0m`;
const red = (text: string) => `\x1b[31m✖ ${text}\x1b[0m`;
const cyan = (text: string) => `\x1b[36mℹ ${text}\x1b[0m`;

async function run() {
  console.log(cyan('BẮT ĐẦU KIỂM THỬ: MODULE APPLICATION SUBMISSION (PHASE 2)\n'));
  let passed = 0, failed = 0;

  // -----------------------------------------------------------------------
  // Setup: Tạo dữ liệu kiểm thử
  // -----------------------------------------------------------------------
  const email1 = 'test_p2_candidate@example.com';
  const email2 = 'test_p2_hr@example.com';

  await prisma.user.deleteMany({ where: { email: { in: [email1, email2] } } });

  const candidate = await prisma.user.create({
    data: {
      email: email1, password: 'hashed', firstName: 'Ứng', lastName: 'Viên',
      role: UserRole.CANDIDATE, isActive: true,
      candidateProfile: { create: {} }
    },
    include: { candidateProfile: true }
  });

  const hrUser = await prisma.user.create({
    data: {
      email: email2, password: 'hashed', firstName: 'HR', lastName: 'Manager',
      role: UserRole.HR, isActive: true
    }
  });

  const jobPublished = await prisma.jobPosting.create({
    data: {
      title: 'Test Backend Developer',
      description: 'Mô tả công việc test',
      requirements: 'Node.js, TypeScript',
      status: JobStatus.PUBLISHED,
      postedById: hrUser.id
    }
  });

  const jobClosed = await prisma.jobPosting.create({
    data: {
      title: 'Test Closed Job',
      description: 'Mô tả',
      requirements: 'Yêu cầu',
      status: JobStatus.CLOSED,
      postedById: hrUser.id
    }
  });

  // -----------------------------------------------------------------------
  // Test 1: Nộp đơn khi thiếu jobPostingId => 404
  // -----------------------------------------------------------------------
  try {
    await applicationService.submitApplication(candidate.id, 'nonexistent-uuid-xxx');
    console.log(red('Test 1 Thất bại: Phải báo 404 khi jobPostingId không tồn tại')); failed++;
  } catch (e: any) {
    if (e instanceof AppError && e.statusCode === 404) {
      console.log(green('Test 1 Thành công: Chặn đúng jobPostingId không tồn tại (404)')); passed++;
    } else {
      console.log(red(`Test 1 Thất bại: ${e.message}`)); failed++;
    }
  }

  // -----------------------------------------------------------------------
  // Test 2: Nộp đơn vào tin đã đóng (CLOSED) => 400
  // -----------------------------------------------------------------------
  try {
    await applicationService.submitApplication(candidate.id, jobClosed.id);
    console.log(red('Test 2 Thất bại: Phải chặn nộp vào Job đã đóng')); failed++;
  } catch (e: any) {
    if (e instanceof AppError && e.statusCode === 400 && e.code === 'JOB_NOT_AVAILABLE') {
      console.log(green('Test 2 Thành công: Chặn nộp vào Job đã đóng (400 JOB_NOT_AVAILABLE)')); passed++;
    } else {
      console.log(red(`Test 2 Thất bại: ${e.message}`)); failed++;
    }
  }

  // -----------------------------------------------------------------------
  // Test 3: Nộp đơn hợp lệ vào Job PUBLISHED => 201 Created
  // -----------------------------------------------------------------------
  let applicationId = '';
  try {
    const result = await applicationService.submitApplication(
      candidate.id, jobPublished.id, 'Thư xin việc của tôi'
    );
    if (result.applicationId && result.status === ApplicationStatus.SUBMITTED) {
      applicationId = result.applicationId;
      console.log(green('Test 3 Thành công: Nộp đơn hợp lệ, trạng thái SUBMITTED')); passed++;
    } else {
      console.log(red('Test 3 Thất bại: Kết quả không đúng')); failed++;
    }
  } catch (e: any) {
    console.log(red(`Test 3 Thất bại: ${e.message}`)); failed++;
  }

  // -----------------------------------------------------------------------
  // Test 4: Nộp đơn trùng vào cùng Job => 409 Conflict
  // -----------------------------------------------------------------------
  try {
    await applicationService.submitApplication(candidate.id, jobPublished.id);
    console.log(red('Test 4 Thất bại: Phải chặn nộp trùng')); failed++;
  } catch (e: any) {
    if (e instanceof AppError && e.statusCode === 409 && e.code === 'DUPLICATE_APPLICATION') {
      console.log(green('Test 4 Thành công: Chặn nộp trùng đúng (409 DUPLICATE_APPLICATION)')); passed++;
    } else {
      console.log(red(`Test 4 Thất bại: ${e.message}`)); failed++;
    }
  }

  // -----------------------------------------------------------------------
  // Test 5: Xem danh sách đơn đã nộp (my-applications)
  // -----------------------------------------------------------------------
  try {
    const apps = await applicationService.getMyApplications(candidate.id);
    if (Array.isArray(apps) && apps.length === 1 && apps[0].id === applicationId) {
      console.log(green('Test 5 Thành công: getMyApplications trả đúng 1 đơn')); passed++;
    } else {
      console.log(red(`Test 5 Thất bại: Kỳ vọng 1 đơn, nhận ${apps.length}`)); failed++;
    }
  } catch (e: any) {
    console.log(red(`Test 5 Thất bại: ${e.message}`)); failed++;
  }

  // -----------------------------------------------------------------------
  // Test 6: Xem chi tiết đơn của chính mình
  // -----------------------------------------------------------------------
  try {
    const detail = await applicationService.getMyApplicationById(candidate.id, applicationId);
    if (detail.id === applicationId && detail.jobPosting?.id === jobPublished.id) {
      console.log(green('Test 6 Thành công: getMyApplicationById trả đúng chi tiết')); passed++;
    } else {
      console.log(red('Test 6 Thất bại: Chi tiết không khớp')); failed++;
    }
  } catch (e: any) {
    console.log(red(`Test 6 Thất bại: ${e.message}`)); failed++;
  }

  // -----------------------------------------------------------------------
  // Test 7: Rút đơn hợp lệ (status SUBMITTED => WITHDRAWN)
  // -----------------------------------------------------------------------
  try {
    const result = await applicationService.withdrawApplication(candidate.id, applicationId);
    if (result.status === ApplicationStatus.WITHDRAWN) {
      console.log(green('Test 7 Thành công: Rút đơn thành công, trạng thái WITHDRAWN')); passed++;
    } else {
      console.log(red(`Test 7 Thất bại: Trạng thái sau rút là ${result.status}`)); failed++;
    }
  } catch (e: any) {
    console.log(red(`Test 7 Thất bại: ${e.message}`)); failed++;
  }

  // -----------------------------------------------------------------------
  // Test 8: Rút đơn đã WITHDRAWN => 400 WITHDRAW_NOT_ALLOWED
  // -----------------------------------------------------------------------
  try {
    await applicationService.withdrawApplication(candidate.id, applicationId);
    console.log(red('Test 8 Thất bại: Phải chặn rút đơn đã WITHDRAWN')); failed++;
  } catch (e: any) {
    if (e instanceof AppError && e.statusCode === 400 && e.code === 'WITHDRAW_NOT_ALLOWED') {
      console.log(green('Test 8 Thành công: Chặn rút đơn đã WITHDRAWN (400 WITHDRAW_NOT_ALLOWED)')); passed++;
    } else {
      console.log(red(`Test 8 Thất bại: ${e.message}`)); failed++;
    }
  }

  // -----------------------------------------------------------------------
  // Chuẩn bị thêm: Tạo job mới và đơn mới để test HR APIs (tránh unique constraint)
  // -----------------------------------------------------------------------
  const jobForHr = await prisma.jobPosting.create({
    data: {
      title: 'Test HR Viewer Job',
      description: 'Mô tả HR test',
      requirements: 'Yêu cầu HR test',
      status: JobStatus.PUBLISHED,
      postedById: hrUser.id
    }
  });

  const newApp = await prisma.application.create({
    data: {
      candidateProfileId: candidate.candidateProfile!.id,
      jobPostingId: jobForHr.id,
      status: ApplicationStatus.SUBMITTED
    }
  });


  // -----------------------------------------------------------------------
  // Test 9: HR xem danh sách ứng viên theo job (pagination)
  // -----------------------------------------------------------------------
  try {
    const result = await applicationService.getApplicationsByJob(jobForHr.id, { page: 1, limit: 10 });
    if (result.meta.total >= 1 && Array.isArray(result.data) && result.data[0].candidate?.email) {
      console.log(green(`Test 9 Thành công: getApplicationsByJob trả ${result.meta.total} đơn, có thông tin ứng viên`)); passed++;
    } else {
      console.log(red(`Test 9 Thất bại: total=${result.meta.total}, data=${JSON.stringify(result.data[0])}`)); failed++;
    }
  } catch (e: any) {
    console.log(red(`Test 9 Thất bại: ${e.message}`)); failed++;
  }

  // -----------------------------------------------------------------------
  // Test 10: HR xem chi tiết hồ sơ
  // -----------------------------------------------------------------------
  try {
    const detail = await applicationService.getApplicationDetailForHr(newApp.id);
    if (detail.id === newApp.id && detail.candidate?.email === email1) {
      console.log(green('Test 10 Thành công: getApplicationDetailForHr trả đúng thông tin ứng viên')); passed++;
    } else {
      console.log(red('Test 10 Thất bại: Chi tiết không khớp')); failed++;
    }
  } catch (e: any) {
    console.log(red(`Test 10 Thất bại: ${e.message}`)); failed++;
  }

  // -----------------------------------------------------------------------
  // Test 11: HR đổi trạng thái hợp lệ => SHORTLISTED
  // -----------------------------------------------------------------------
  try {
    const result = await applicationService.updateApplicationStatus(newApp.id, 'SHORTLISTED');
    if (result.status === ApplicationStatus.SHORTLISTED) {
      console.log(green('Test 11 Thành công: HR đổi trạng thái => SHORTLISTED thành công')); passed++;
    } else {
      console.log(red(`Test 11 Thất bại: Status nhận được ${result.status}`)); failed++;
    }
  } catch (e: any) {
    console.log(red(`Test 11 Thất bại: ${e.message}`)); failed++;
  }

  // -----------------------------------------------------------------------
  // Test 12: HR gán trạng thái không hợp lệ => 400 VALIDATION_ERROR
  // -----------------------------------------------------------------------
  try {
    await applicationService.updateApplicationStatus(newApp.id, 'INVALID_STATUS_XYZ');
    console.log(red('Test 12 Thất bại: Phải chặn trạng thái không hợp lệ')); failed++;
  } catch (e: any) {
    if (e instanceof AppError && e.statusCode === 400) {
      console.log(green('Test 12 Thành công: Chặn trạng thái không hợp lệ (400)')); passed++;
    } else {
      console.log(red(`Test 12 Thất bại: ${e.message}`)); failed++;
    }
  }

  // -----------------------------------------------------------------------
  // Test 13: HR không được gán trạng thái SUBMITTED (không nằm trong HR_ALLOWED)
  // -----------------------------------------------------------------------
  try {
    await applicationService.updateApplicationStatus(newApp.id, 'SUBMITTED');
    console.log(red('Test 13 Thất bại: HR không được gán SUBMITTED')); failed++;
  } catch (e: any) {
    if (e instanceof AppError && e.statusCode === 400 && e.code === 'STATUS_TRANSITION_FORBIDDEN') {
      console.log(green('Test 13 Thành công: Chặn HR gán trạng thái SUBMITTED (400 STATUS_TRANSITION_FORBIDDEN)')); passed++;
    } else {
      console.log(red(`Test 13 Thất bại: ${e.message}`)); failed++;
    }
  }

  // -----------------------------------------------------------------------
  // Cleanup
  // -----------------------------------------------------------------------
  await prisma.application.deleteMany({ where: { jobPostingId: { in: [jobPublished.id, jobClosed.id, jobForHr.id] } } });
  await prisma.jobPosting.deleteMany({ where: { id: { in: [jobPublished.id, jobClosed.id, jobForHr.id] } } });

  await prisma.user.deleteMany({ where: { email: { in: [email1, email2] } } });

  console.log(`\n--------------------------------------------`);
  console.log(`KẾT QUẢ TEST PHASE 2: ${passed} PASSED, ${failed} FAILED`);
  console.log(`--------------------------------------------\n`);
  if (failed > 0) process.exit(1);
}

run().catch(e => {
  console.error('Lỗi khi chạy bộ test:', e);
  process.exit(1);
});
