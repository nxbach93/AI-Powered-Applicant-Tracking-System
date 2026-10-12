/**
 * Test Tích Hợp End-to-End Module Applications & Candidate CV (APP-10)
 * Kiểm thử toàn diện từ lúc Candidate nộp đơn -> HR sàng lọc, lọc điểm AI, xem chi tiết và đổi trạng thái
 */
import prisma from '../lib/prisma';
import applicationService from '../services/application.service';
import { UserRole, ApplicationStatus, JobStatus } from '@prisma/client';

async function runEndToEndTests() {
  console.log('================================================================');
  console.log('🚀 BẮT ĐẦU KIỂM THỬ END-TO-END: CANDIDATE CV & HR APPLICATIONS (APP-10)');
  console.log('================================================================\n');

  let passedCount = 0;
  let failedCount = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`✔ [PASS] ${testName}`);
      passedCount++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      failedCount++;
    }
  }

  // Dọn dẹp dữ liệu test cũ nếu có
  const testCandidateEmail = 'e2e_candidate_test@example.com';
  const testHrEmail = 'e2e_hr_test@example.com';

  await prisma.application.deleteMany({
    where: {
      candidateProfile: {
        user: { email: { in: [testCandidateEmail] } }
      }
    }
  });
  await prisma.jobPosting.deleteMany({
    where: { title: { contains: 'E2E Test Job' } }
  });
  await prisma.user.deleteMany({
    where: { email: { in: [testCandidateEmail, testHrEmail] } }
  });

  try {
    // ------------------------------------------------------------------------
    // SETUP: Tạo HR, Candidate và 2 Job Postings
    // ------------------------------------------------------------------------
    console.log('--- KHỞI TẠO DỮ LIỆU THỬ NGHIỆM ---');
    const hrUser = await prisma.user.create({
      data: {
        email: testHrEmail,
        password: 'hashed_password_123',
        firstName: 'Trưởng phòng',
        lastName: 'Nhân sự',
        role: UserRole.HR,
        isActive: true,
      }
    });

    const candidateUser = await prisma.user.create({
      data: {
        email: testCandidateEmail,
        password: 'hashed_password_123',
        firstName: 'Nguyễn Văn',
        lastName: 'Ứng Viên E2E',
        role: UserRole.CANDIDATE,
        isActive: true,
      }
    });

    const job1 = await prisma.jobPosting.create({
      data: {
        title: 'E2E Test Job: Senior Fullstack Engineer',
        department: 'Engineering',
        location: 'Hà Nội',
        employmentType: 'FULL_TIME',
        description: 'Phát triển kiến trúc ATS và AI integration',
        requirements: 'TypeScript, Node.js, Next.js, Python',
        salaryMin: 25000000,
        salaryMax: 40000000,
        status: JobStatus.PUBLISHED,
        postedById: hrUser.id,
      }
    });

    const job2 = await prisma.jobPosting.create({
      data: {
        title: 'E2E Test Job: AI & NLP Specialist',
        department: 'AI Research',
        location: 'Hồ Chí Minh',
        employmentType: 'FULL_TIME',
        description: 'Mô hình hóa ngôn ngữ và semantic matching',
        requirements: 'PyTorch, Transformers, FastAPI',
        status: JobStatus.PUBLISHED,
        postedById: hrUser.id,
      }
    });
    console.log('Khởi tạo thành công: HR, Candidate và 2 Job Postings.\n');

    // ------------------------------------------------------------------------
    // TEST 1: Candidate cập nhật CV
    // ------------------------------------------------------------------------
    console.log('--- PHẦN 1: CANDIDATE QUẢN LÝ CV & NỘP ĐƠN ---');
    const profile = await prisma.candidateProfile.upsert({
      where: { userId: candidateUser.id },
      create: {
        userId: candidateUser.id,
        phone: '0988776655',
        education: 'Đại học Bách Khoa',
        experienceYears: 4,
        summary: 'Kỹ sư Fullstack với 4 năm kinh nghiệm thực chiến',
        cvFileUrl: '/uploads/cv/e2e_candidate_cv.pdf',
        parsedSkills: ['TypeScript', 'Node.js', 'React', 'Docker'],
      },
      update: {
        cvFileUrl: '/uploads/cv/e2e_candidate_cv.pdf',
      }
    });

    const cvInfo = await applicationService.getMyCv(candidateUser.id);
    assert(cvInfo.hasCv === true && cvInfo.cvFileUrl === '/uploads/cv/e2e_candidate_cv.pdf', 'Test 1: Candidate lấy thông tin CV thành công');

    // ------------------------------------------------------------------------
    // TEST 2: Candidate nộp đơn ứng tuyển vào Job 1
    // ------------------------------------------------------------------------
    const submitResult = await applicationService.submitApplication(
      candidateUser.id,
      job1.id,
      'Kính gửi HR, tôi rất quan tâm đến vị trí Senior Fullstack Engineer và tin rằng kinh nghiệm của tôi phù hợp.'
    );
    assert(submitResult.status === ApplicationStatus.SUBMITTED, 'Test 2: Nộp đơn thành công với trạng thái ban đầu là SUBMITTED');

    // Giả lập AI service cập nhật điểm match score cho đơn này
    await prisma.application.update({
      where: { id: submitResult.applicationId },
      data: {
        aiMatchScore: 88.5,
        parsedSkills: ['TypeScript', 'Node.js', 'React', 'Docker'],
        aiAnalysisSummary: 'Ứng viên có kỹ năng kỹ thuật khớp 88.5% với JD, có kinh nghiệm Fullstack 4 năm phù hợp.',
      }
    });

    // ------------------------------------------------------------------------
    // TEST 3: Chặn nộp trùng vào Job 1
    // ------------------------------------------------------------------------
    let duplicateBlocked = false;
    try {
      await applicationService.submitApplication(candidateUser.id, job1.id);
    } catch (err: any) {
      if (err.statusCode === 409 && err.code === 'DUPLICATE_APPLICATION') {
        duplicateBlocked = true;
      }
    }
    assert(duplicateBlocked, 'Test 3: Hệ thống chặn thành công khi nộp trùng đơn vào cùng Job (409 Conflict)');

    // ------------------------------------------------------------------------
    // TEST 4: Candidate kiểm tra lịch sử ứng tuyển
    // ------------------------------------------------------------------------
    const myApps = await applicationService.getMyApplications(candidateUser.id);
    assert(myApps.length === 1 && myApps[0].jobPosting.id === job1.id, 'Test 4: Candidate xem đúng danh sách đơn đã nộp');

    // ------------------------------------------------------------------------
    // TEST 5: HR xem danh sách Job cùng số lượng đơn (getHrJobsOverview)
    // ------------------------------------------------------------------------
    console.log('\n--- PHẦN 2: HR QUẢN LÝ & SÀNG LỌC HỒ SƠ ---');
    const hrJobsOverview = await applicationService.getHrJobsOverview();
    const targetJobInOverview = hrJobsOverview.find(j => j.id === job1.id);
    assert(Boolean(targetJobInOverview && targetJobInOverview.totalApplications === 1), 'Test 5: HR xem danh sách Jobs kèm số lượng đơn ứng tuyển chính xác');

    // ------------------------------------------------------------------------
    // TEST 6: HR xem danh sách ứng viên theo Job cụ thể
    // ------------------------------------------------------------------------
    const hrAppsJob1 = await applicationService.getApplicationsByJob(job1.id, {});
    assert(hrAppsJob1.data.length === 1 && hrAppsJob1.data[0].candidate.email === testCandidateEmail, 'Test 6: HR lấy danh sách ứng viên theo Job 1 thành công');

    // ------------------------------------------------------------------------
    // TEST 7: HR xem danh sách ứng viên của 'all' (toàn bộ jobs)
    // ------------------------------------------------------------------------
    const hrAppsAll = await applicationService.getApplicationsByJob('all', {});
    const foundInAll = hrAppsAll.data.some(a => a.id === submitResult.applicationId);
    assert(foundInAll, 'Test 7: HR lọc danh sách với jobId="all" thành công, thấy hồ sơ');

    // ------------------------------------------------------------------------
    // TEST 8: HR lọc theo điểm AI tối thiểu (minScore)
    // ------------------------------------------------------------------------
    const hrFilterHigh = await applicationService.getApplicationsByJob(job1.id, { minScore: 80 });
    const hrFilterTooHigh = await applicationService.getApplicationsByJob(job1.id, { minScore: 95 });
    assert(hrFilterHigh.data.length === 1 && hrFilterTooHigh.data.length === 0, 'Test 8: HR lọc theo AI match score tối thiểu chính xác');

    // ------------------------------------------------------------------------
    // TEST 9: HR xem chi tiết toàn bộ hồ sơ (getApplicationDetailForHr)
    // ------------------------------------------------------------------------
    const hrDetail = await applicationService.getApplicationDetailForHr(submitResult.applicationId);
    assert(
      hrDetail.candidate.email === testCandidateEmail &&
      hrDetail.aiMatchScore === 88.5 &&
      hrDetail.cvFileUrl === '/uploads/cv/e2e_candidate_cv.pdf',
      'Test 9: HR xem chi tiết hồ sơ: đầy đủ CV, AI match score và thông tin liên hệ'
    );

    // ------------------------------------------------------------------------
    // TEST 10: HR chuyển trạng thái sang SCREENING
    // ------------------------------------------------------------------------
    console.log('\n--- PHẦN 3: ĐIỀU PHỐI TRẠNG THÁI & ĐỒNG BỘ HAI CHIỀU ---');
    const update1 = await applicationService.updateApplicationStatus(submitResult.applicationId, ApplicationStatus.SCREENING);
    assert(update1.status === ApplicationStatus.SCREENING, 'Test 10: HR đổi trạng thái sang SCREENING thành công');

    // ------------------------------------------------------------------------
    // TEST 11: HR chuyển trạng thái sang SHORTLISTED
    // ------------------------------------------------------------------------
    const update2 = await applicationService.updateApplicationStatus(submitResult.applicationId, ApplicationStatus.SHORTLISTED);
    assert(update2.status === ApplicationStatus.SHORTLISTED, 'Test 11: HR đưa ứng viên vào danh sách SHORTLISTED thành công');

    // ------------------------------------------------------------------------
    // TEST 12: Candidate kiểm tra lại chi tiết đơn và thấy trạng thái mới do HR cập nhật
    // ------------------------------------------------------------------------
    const candidateCheck = await applicationService.getMyApplicationById(candidateUser.id, submitResult.applicationId);
    assert(candidateCheck.status === ApplicationStatus.SHORTLISTED, 'Test 12: Candidate xem lại chi tiết đơn, trạng thái đã đồng bộ thành SHORTLISTED');

    // ------------------------------------------------------------------------
    // TEST 13: Chặn candidate rút đơn khi đã được SHORTLISTED
    // ------------------------------------------------------------------------
    let withdrawBlocked = false;
    try {
      await applicationService.withdrawApplication(candidateUser.id, submitResult.applicationId);
    } catch (err: any) {
      if (err.statusCode === 400 && err.code === 'WITHDRAW_NOT_ALLOWED') {
        withdrawBlocked = true;
      }
    }
    assert(withdrawBlocked, 'Test 13: Chặn đúng: Candidate không được rút đơn khi hồ sơ đã vào vòng phỏng vấn (SHORTLISTED)');

    // ------------------------------------------------------------------------
    // TEST 14: HR chuyển trạng thái sang OFFERED -> HIRED
    // ------------------------------------------------------------------------
    const updateHired = await applicationService.updateApplicationStatus(submitResult.applicationId, ApplicationStatus.HIRED);
    assert(updateHired.status === ApplicationStatus.HIRED, 'Test 14: HR xác nhận tuyển dụng ứng viên (HIRED)');

    // ------------------------------------------------------------------------
    // TEST 15: Chặn thay đổi trạng thái khi đơn đã HIRED
    // ------------------------------------------------------------------------
    let changeAfterHiredBlocked = false;
    try {
      await applicationService.updateApplicationStatus(submitResult.applicationId, ApplicationStatus.REJECTED);
    } catch (err: any) {
      if (err.statusCode === 400 && err.code === 'STATUS_TRANSITION_NOT_ALLOWED') {
        changeAfterHiredBlocked = true;
      }
    }
    assert(changeAfterHiredBlocked, 'Test 15: Chặn thay đổi trạng thái khi đơn đã ở vòng cuối HIRED');

  } catch (error) {
    console.error('LỖI KHÔNG MONG MUỐN TRONG KIỂM THỬ E2E:', error);
    failedCount++;
  } finally {
    // Dọn dẹp dữ liệu
    await prisma.application.deleteMany({
      where: {
        candidateProfile: {
          user: { email: { in: [testCandidateEmail] } }
        }
      }
    });
    await prisma.jobPosting.deleteMany({
      where: { title: { contains: 'E2E Test Job' } }
    });
    await prisma.user.deleteMany({
      where: { email: { in: [testCandidateEmail, testHrEmail] } }
    });
  }

  console.log('\n================================================================');
  console.log(`KẾT QUẢ KIỂM THỬ E2E PHASE 4: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('================================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runEndToEndTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
