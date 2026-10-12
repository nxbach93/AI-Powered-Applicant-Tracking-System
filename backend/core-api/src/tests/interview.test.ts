import { InterviewStatus, ApplicationStatus, UserRole } from '@prisma/client';
import interviewService, { ValidationError, NotFoundError } from '../services/interview.service';
import prisma from '../lib/prisma';

// Màu console
const green = (text: string) => `\x1b[32m✔ ${text}\x1b[0m`;
const red = (text: string) => `\x1b[31m✖ ${text}\x1b[0m`;
const cyan = (text: string) => `\x1b[36mℹ ${text}\x1b[0m`;

async function runTests() {
  console.log(cyan('BẮT ĐẦU KIỂM THỬ MODULE TV5 — INTERVIEWS & RECRUITMENT WORKFLOW\n'));
  let passed = 0;
  let failed = 0;

  // Mock Data
  const mockHRUser: any = {
    id: 'hr-user-uuid-1',
    email: 'hr@ats.com',
    firstName: 'Trần',
    lastName: 'Hoa',
    role: UserRole.HR,
    isActive: true
  };

  const mockCandidateUser: any = {
    id: 'candidate-user-uuid-1',
    email: 'candidate@ats.com',
    firstName: 'Nguyễn',
    lastName: 'Văn A',
    role: UserRole.CANDIDATE,
    isActive: true
  };

  const mockApplication: any = {
    id: 'app-uuid-123',
    candidateProfileId: 'profile-uuid-1',
    jobPostingId: 'job-uuid-1',
    status: ApplicationStatus.SHORTLISTED,
    candidateProfile: {
      userId: 'candidate-user-uuid-1',
      user: mockCandidateUser
    },
    jobPosting: {
      id: 'job-uuid-1',
      title: 'Senior Frontend Developer',
      department: 'Kỹ thuật Công nghệ',
      location: 'Hà Nội'
    }
  };

  const mockInterview: any = {
    id: 'interview-uuid-999',
    applicationId: 'app-uuid-123',
    interviewerId: 'hr-user-uuid-1',
    scheduledAt: new Date('2026-10-25T14:00:00.000Z'),
    durationMinutes: 60,
    location: 'Phòng họp 302',
    meetingUrl: 'https://meet.google.com/xyz-ats-interview',
    status: InterviewStatus.SCHEDULED,
    notes: 'Phỏng vấn kỹ thuật React',
    rating: null,
    feedback: null,
    interviewer: mockHRUser,
    application: mockApplication
  };

  // Test 1: Tạo lịch phỏng vấn thành công (INT-03)
  try {
    (prisma.application.findUnique as any) = async () => mockApplication;
    (prisma.user.findUnique as any) = async () => mockHRUser;
    (prisma.interview.create as any) = async () => mockInterview;
    let updatedAppStatus: any = null;
    (prisma.application.update as any) = async ({ data }: any) => {
      updatedAppStatus = data.status;
      return { ...mockApplication, status: data.status };
    };

    const result = await interviewService.createInterview(
      {
        applicationId: 'app-uuid-123',
        interviewerId: 'hr-user-uuid-1',
        scheduledAt: '2026-10-25T14:00:00.000Z',
        durationMinutes: 60,
        location: 'Phòng họp 302',
        meetingUrl: 'https://meet.google.com/xyz-ats-interview'
      },
      mockHRUser.id
    );

    if (result && result.status === InterviewStatus.SCHEDULED && updatedAppStatus === ApplicationStatus.INTERVIEW_SCHEDULED) {
      console.log(green('TC1: Tạo lịch phỏng vấn thành công và tự động chuyển Application sang INTERVIEW_SCHEDULED'));
      passed++;
    } else {
      throw new Error('Dữ liệu trả về hoặc trạng thái application không khớp');
    }
  } catch (err: any) {
    console.log(red(`TC1 Thất bại: ${err.message}`));
    failed++;
  }

  // Test 2: Validation lỗi khi thiếu applicationId hoặc ngày giờ sai (INT-03)
  try {
    let threw = false;
    try {
      await interviewService.createInterview(
        {
          applicationId: '',
          scheduledAt: 'invalid-date'
        },
        mockHRUser.id
      );
    } catch (e: any) {
      if (e instanceof ValidationError && e.details.length >= 2) {
        threw = true;
      }
    }

    if (threw) {
      console.log(green('TC2: Bắt lỗi validation chính xác khi thiếu applicationId hoặc sai định dạng ngày'));
      passed++;
    } else {
      throw new Error('Không bắt được lỗi validation');
    }
  } catch (err: any) {
    console.log(red(`TC2 Thất bại: ${err.message}`));
    failed++;
  }

  // Test 3: Cập nhật thông tin lịch phỏng vấn (INT-04)
  try {
    (prisma.interview.findUnique as any) = async () => mockInterview;
    (prisma.interview.update as any) = async ({ data }: any) => ({
      ...mockInterview,
      location: data.location || mockInterview.location,
      durationMinutes: data.durationMinutes || mockInterview.durationMinutes
    });

    const updated = await interviewService.updateInterview('interview-uuid-999', {
      location: 'Phòng họp VIP 1',
      durationMinutes: 90
    });

    if (updated.location === 'Phòng họp VIP 1' && updated.durationMinutes === 90) {
      console.log(green('TC3: Cập nhật thông tin lịch phỏng vấn (phòng họp, thời lượng) thành công'));
      passed++;
    } else {
      throw new Error('Dữ liệu cập nhật không khớp');
    }
  } catch (err: any) {
    console.log(red(`TC3 Thất bại: ${err.message}`));
    failed++;
  }

  // Test 4: Hủy lịch phỏng vấn (INT-04)
  try {
    (prisma.interview.findUnique as any) = async () => mockInterview;
    (prisma.interview.update as any) = async ({ data }: any) => ({
      ...mockInterview,
      status: data.status,
      notes: data.notes
    });

    const cancelled = await interviewService.cancelInterview('interview-uuid-999', 'Ứng viên bận việc đột xuất');

    if (cancelled.status === InterviewStatus.CANCELLED && cancelled.notes?.includes('Ứng viên bận việc đột xuất')) {
      console.log(green('TC4: Hủy lịch phỏng vấn thành công và lưu lý do hủy'));
      passed++;
    } else {
      throw new Error('Trạng thái hủy hoặc lý do hủy không đúng');
    }
  } catch (err: any) {
    console.log(red(`TC4 Thất bại: ${err.message}`));
    failed++;
  }

  // Test 5: Ghi nhận kết quả đánh giá phỏng vấn (INT-06)
  try {
    (prisma.interview.findUnique as any) = async () => mockInterview;
    let appStatusUpdated: any = null;
    (prisma.interview.update as any) = async ({ data }: any) => ({
      ...mockInterview,
      rating: data.rating,
      feedback: data.feedback,
      status: data.status
    });
    (prisma.application.update as any) = async ({ data }: any) => {
      appStatusUpdated = data.status;
      return { ...mockApplication, status: data.status };
    };

    const feedbackResult = await interviewService.submitFeedback('interview-uuid-999', {
      rating: 5,
      feedback: 'Ứng viên xuất sắc về React và tư duy giải thuật. Đề xuất Offer.'
    });

    if (
      feedbackResult.rating === 5 &&
      feedbackResult.status === InterviewStatus.COMPLETED &&
      appStatusUpdated === ApplicationStatus.INTERVIEWED
    ) {
      console.log(green('TC5: Ghi nhận kết quả feedback thành công và tự động chuyển Application sang INTERVIEWED'));
      passed++;
    } else {
      throw new Error('Kết quả feedback hoặc trạng thái Application không đúng');
    }
  } catch (err: any) {
    console.log(red(`TC5 Thất bại: ${err.message}`));
    failed++;
  }

  // Test 6: Bắt lỗi validation rating phỏng vấn ngoài khoảng 1-5 (INT-06)
  try {
    let threw = false;
    try {
      await interviewService.submitFeedback('interview-uuid-999', {
        rating: 6, // Sai quy định
        feedback: 'Tốt'
      });
    } catch (e: any) {
      if (e instanceof ValidationError) {
        threw = true;
      }
    }

    if (threw) {
      console.log(green('TC6: Bắt lỗi rating không hợp lệ (ngoài khoảng 1-5) chính xác'));
      passed++;
    } else {
      throw new Error('Không bắt được lỗi rating');
    }
  } catch (err: any) {
    console.log(red(`TC6 Thất bại: ${err.message}`));
    failed++;
  }

  // Test 7: Cập nhật trạng thái tiến trình tuyển dụng Application (INT-07)
  try {
    (prisma.application.findUnique as any) = async () => ({ ...mockApplication, status: ApplicationStatus.INTERVIEWED });
    (prisma.application.update as any) = async ({ data }: any) => ({
      ...mockApplication,
      status: data.status
    });

    const offeredApp = await interviewService.updateApplicationWorkflowStatus('app-uuid-123', ApplicationStatus.OFFERED);
    const hiredApp = await interviewService.updateApplicationWorkflowStatus('app-uuid-123', ApplicationStatus.HIRED);

    if (offeredApp.status === ApplicationStatus.OFFERED && hiredApp.status === ApplicationStatus.HIRED) {
      console.log(green('TC7: Cập nhật trạng thái tiến trình tuyển dụng (OFFERED -> HIRED) thành công'));
      passed++;
    } else {
      throw new Error('Chuyển trạng thái tuyển dụng thất bại');
    }
  } catch (err: any) {
    console.log(red(`TC7 Thất bại: ${err.message}`));
    failed++;
  }

  // Test 8: Phân quyền xem lịch phỏng vấn (Candidate chỉ xem lịch của mình) (INT-05)
  try {
    (prisma.interview.count as any) = async () => 1;
    let whereCaptured: any = null;
    (prisma.interview.findMany as any) = async ({ where }: any) => {
      whereCaptured = where;
      return [mockInterview];
    };

    // Candidate gọi API
    await interviewService.getInterviews({}, mockCandidateUser.id, UserRole.CANDIDATE);

    if (whereCaptured?.application?.candidateProfile?.userId === mockCandidateUser.id) {
      console.log(green('TC8: Phân quyền chính xác — Candidate bị giới hạn truy vấn chỉ với lịch của tài khoản mình'));
      passed++;
    } else {
      throw new Error('Điều kiện truy vấn cho Candidate không bị giới hạn');
    }
  } catch (err: any) {
    console.log(red(`TC8 Thất bại: ${err.message}`));
    failed++;
  }

  // Test 9: Lấy dữ liệu Kanban Pipeline theo 6 cột trạng thái (INT-07 & INT-08)
  try {
    (prisma.application.findMany as any) = async () => [
      { ...mockApplication, status: ApplicationStatus.SHORTLISTED },
      { ...mockApplication, status: ApplicationStatus.INTERVIEW_SCHEDULED },
      { ...mockApplication, status: ApplicationStatus.INTERVIEWED },
      { ...mockApplication, status: ApplicationStatus.OFFERED }
    ];

    const kanban = await interviewService.getWorkflowKanban();

    if (
      kanban.columns.SHORTLISTED.length === 1 &&
      kanban.columns.INTERVIEW_SCHEDULED.length === 1 &&
      kanban.columns.INTERVIEWED.length === 1 &&
      kanban.columns.OFFERED.length === 1 &&
      kanban.total === 4
    ) {
      console.log(green('TC9: Lấy dữ liệu Kanban Pipeline gom nhóm đúng 6 cột trạng thái'));
      passed++;
    } else {
      throw new Error('Gom nhóm cột Kanban không chính xác');
    }
  } catch (err: any) {
    console.log(red(`TC9 Thất bại: ${err.message}`));
    failed++;
  }

  console.log(cyan(`\n================================================`));
  console.log(cyan(`KẾT QUẢ KIỂM THỬ: ${passed}/${passed + failed} TEST CASES ĐẠT CHUẨN (${Math.round((passed / (passed + failed)) * 100)}%)`));
  console.log(cyan(`================================================\n`));

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error(red('Lỗi thực thi test:'), err);
  process.exit(1);
});
