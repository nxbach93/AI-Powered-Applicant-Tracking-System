import { InterviewStatus, ApplicationStatus, UserRole } from '@prisma/client';
import prisma from '../lib/prisma';

export interface CreateInterviewDto {
  applicationId: string;
  interviewerId?: string;
  scheduledAt: string | Date;
  durationMinutes?: number;
  location?: string;
  meetingUrl?: string;
  notes?: string;
}

export interface UpdateInterviewDto {
  scheduledAt?: string | Date;
  durationMinutes?: number;
  location?: string;
  meetingUrl?: string;
  notes?: string;
  interviewerId?: string;
}

export interface SubmitFeedbackDto {
  rating: number; // 1 to 5
  feedback: string;
  notes?: string;
  status?: InterviewStatus; // COMPLETED or NO_SHOW
}

export interface InterviewFilterOptions {
  status?: InterviewStatus;
  applicationId?: string;
  interviewerId?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export class ValidationError extends Error {
  details: { field: string; message: string }[];
  constructor(message: string, details: { field: string; message: string }[] = []) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
  }
}

export class NotFoundError extends Error {
  code: string;
  constructor(message: string, code = 'NOT_FOUND') {
    super(message);
    this.name = 'NotFoundError';
    this.code = code;
  }
}

export class ForbiddenError extends Error {
  code: string;
  constructor(message: string, code = 'FORBIDDEN') {
    super(message);
    this.name = 'ForbiddenError';
    this.code = code;
  }
}

export class ConflictError extends Error {
  code: string;
  constructor(message: string, code = 'CONFLICT') {
    super(message);
    this.name = 'ConflictError';
    this.code = code;
  }
}

export class InterviewService {
  /**
   * Tạo lịch phỏng vấn mới (INT-03)
   * Tự động chuyển Application.status = INTERVIEW_SCHEDULED
   */
  async createInterview(dto: CreateInterviewDto, currentUserId: string) {
    const details: { field: string; message: string }[] = [];

    if (!dto.applicationId) {
      details.push({ field: 'applicationId', message: 'ID đơn ứng tuyển (applicationId) là bắt buộc' });
    }

    if (!dto.scheduledAt) {
      details.push({ field: 'scheduledAt', message: 'Thời gian phỏng vấn (scheduledAt) là bắt buộc' });
    }

    const scheduledDate = new Date(dto.scheduledAt);
    if (isNaN(scheduledDate.getTime())) {
      details.push({ field: 'scheduledAt', message: 'Thời gian phỏng vấn không đúng định dạng ngày giờ hợp lệ' });
    } else if (scheduledDate <= new Date()) {
      details.push({ field: 'scheduledAt', message: 'Thời gian phỏng vấn phải là một thời điểm trong tương lai' });
    }

    if (dto.durationMinutes !== undefined && (dto.durationMinutes < 15 || dto.durationMinutes > 480)) {
      details.push({ field: 'durationMinutes', message: 'Thời lượng phỏng vấn phải từ 15 đến 480 phút' });
    }

    if (details.length > 0) {
      throw new ValidationError('Dữ liệu tạo lịch phỏng vấn không hợp lệ', details);
    }

    // 1. Kiểm tra Application có tồn tại không
    const application = await prisma.application.findUnique({
      where: { id: dto.applicationId },
      include: {
        candidateProfile: {
          include: {
            user: {
              select: { id: true, email: true, firstName: true, lastName: true }
            }
          }
        },
        jobPosting: {
          select: { id: true, title: true, department: true }
        }
      }
    });

    if (!application) {
      throw new NotFoundError('Không tìm thấy đơn ứng tuyển với ID tương ứng', 'APPLICATION_NOT_FOUND');
    }

    // Không thể lên lịch cho đơn đã bị từ chối, đã rút hoặc đã tuyển
    if (
      application.status === ApplicationStatus.REJECTED ||
      application.status === ApplicationStatus.WITHDRAWN ||
      application.status === ApplicationStatus.HIRED
    ) {
      throw new ValidationError('Không thể lên lịch phỏng vấn cho đơn đã kết thúc (từ chối, đã tuyển hoặc ứng viên đã rút đơn)');
    }

    // 2. Xác định Interviewer (mặc định là current user nếu không truyền)
    const interviewerId = dto.interviewerId || currentUserId;
    const interviewer = await prisma.user.findUnique({
      where: { id: interviewerId },
      select: { id: true, role: true, firstName: true, lastName: true, email: true }
    });

    if (!interviewer) {
      throw new NotFoundError('Người phỏng vấn không tồn tại trong hệ thống', 'INTERVIEWER_NOT_FOUND');
    }

    if (interviewer.role !== UserRole.HR && interviewer.role !== UserRole.ADMIN) {
      throw new ValidationError('Người phỏng vấn phải có vai trò HR hoặc ADMIN');
    }

    // 3. Tạo bản ghi Interview trong Database
    const interview = await prisma.interview.create({
      data: {
        applicationId: dto.applicationId,
        interviewerId,
        scheduledAt: scheduledDate,
        durationMinutes: dto.durationMinutes ?? 60,
        location: dto.location || null,
        meetingUrl: dto.meetingUrl || null,
        notes: dto.notes || null,
        status: InterviewStatus.SCHEDULED,
      },
      include: {
        interviewer: {
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        application: {
          include: {
            candidateProfile: {
              include: {
                user: {
                  select: { id: true, email: true, firstName: true, lastName: true }
                }
              }
            },
            jobPosting: {
              select: { id: true, title: true, department: true, location: true }
            }
          }
        }
      }
    });

    // 4. Cập nhật trạng thái đơn sang INTERVIEW_SCHEDULED
    await prisma.application.update({
      where: { id: dto.applicationId },
      data: { status: ApplicationStatus.INTERVIEW_SCHEDULED }
    });

    return interview;
  }

  /**
   * Lấy danh sách lịch phỏng vấn (INT-05)
   * Phân quyền: HR/Admin xem toàn bộ/lọc; Candidate chỉ xem lịch của chính mình
   */
  async getInterviews(filter: InterviewFilterOptions, userId: string, userRole: UserRole) {
    const page = Math.max(1, Number(filter.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(filter.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};

    // Phân quyền dữ liệu
    if (userRole === UserRole.CANDIDATE) {
      // Ứng viên chỉ xem lịch của chính mình
      where.application = {
        candidateProfile: {
          userId
        }
      };
    } else {
      // HR/Admin lọc theo interviewerId hoặc applicationId nếu có
      if (filter.interviewerId) {
        where.interviewerId = filter.interviewerId;
      }
      if (filter.applicationId) {
        where.applicationId = filter.applicationId;
      }
    }

    if (filter.status) {
      where.status = filter.status;
    }

    if (filter.from || filter.to) {
      where.scheduledAt = {};
      if (filter.from) {
        where.scheduledAt.gte = new Date(filter.from);
      }
      if (filter.to) {
        where.scheduledAt.lte = new Date(filter.to);
      }
    }

    const [total, items] = await Promise.all([
      prisma.interview.count({ where }),
      prisma.interview.findMany({
        where,
        skip,
        take: limit,
        orderBy: { scheduledAt: 'asc' },
        include: {
          interviewer: {
            select: { id: true, firstName: true, lastName: true, email: true }
          },
          application: {
            include: {
              candidateProfile: {
                include: {
                  user: {
                    select: { id: true, email: true, firstName: true, lastName: true }
                  }
                }
              },
              jobPosting: {
                select: { id: true, title: true, department: true, location: true }
              }
            }
          }
        }
      })
    ]);

    return {
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Lấy chi tiết buổi phỏng vấn theo ID (INT-05)
   */
  async getInterviewById(id: string, userId: string, userRole: UserRole) {
    const interview = await prisma.interview.findUnique({
      where: { id },
      include: {
        interviewer: {
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        application: {
          include: {
            candidateProfile: {
              include: {
                user: {
                  select: { id: true, email: true, firstName: true, lastName: true }
                }
              }
            },
            jobPosting: {
              select: { id: true, title: true, department: true, location: true }
            }
          }
        }
      }
    });

    if (!interview) {
      throw new NotFoundError('Không tìm thấy buổi phỏng vấn', 'INTERVIEW_NOT_FOUND');
    }

    // Kiểm tra quyền truy cập của Candidate
    if (userRole === UserRole.CANDIDATE) {
      if (interview.application.candidateProfile.userId !== userId) {
        throw new ForbiddenError('Bạn không có quyền xem thông tin buổi phỏng vấn này');
      }
    }

    return interview;
  }

  /**
   * Cập nhật thông tin lịch phỏng vấn (INT-04)
   * Cho phép đổi thời gian, địa điểm, link họp, ghi chú, interviewer
   */
  async updateInterview(id: string, dto: UpdateInterviewDto) {
    const interview = await prisma.interview.findUnique({ where: { id } });
    if (!interview) {
      throw new NotFoundError('Không tìm thấy buổi phỏng vấn để cập nhật', 'INTERVIEW_NOT_FOUND');
    }

    if (interview.status !== InterviewStatus.SCHEDULED) {
      throw new ValidationError(`Chỉ có thể cập nhật thông tin lịch phỏng vấn đang ở trạng thái SCHEDULED (trạng thái hiện tại: ${interview.status})`);
    }

    const updateData: any = {};

    if (dto.scheduledAt) {
      const date = new Date(dto.scheduledAt);
      if (isNaN(date.getTime())) {
        throw new ValidationError('Thời gian phỏng vấn không hợp lệ');
      }
      updateData.scheduledAt = date;
    }

    if (dto.durationMinutes !== undefined) {
      if (dto.durationMinutes < 15 || dto.durationMinutes > 480) {
        throw new ValidationError('Thời lượng phỏng vấn phải từ 15 đến 480 phút');
      }
      updateData.durationMinutes = dto.durationMinutes;
    }

    if (dto.location !== undefined) updateData.location = dto.location;
    if (dto.meetingUrl !== undefined) updateData.meetingUrl = dto.meetingUrl;
    if (dto.notes !== undefined) updateData.notes = dto.notes;

    if (dto.interviewerId) {
      const interviewer = await prisma.user.findUnique({ where: { id: dto.interviewerId } });
      if (!interviewer || (interviewer.role !== UserRole.HR && interviewer.role !== UserRole.ADMIN)) {
        throw new ValidationError('Người phỏng vấn mới không hợp lệ hoặc không có quyền HR/ADMIN');
      }
      updateData.interviewerId = dto.interviewerId;
    }

    return await prisma.interview.update({
      where: { id },
      data: updateData,
      include: {
        interviewer: {
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        application: {
          include: {
            candidateProfile: {
              include: {
                user: {
                  select: { id: true, email: true, firstName: true, lastName: true }
                }
              }
            },
            jobPosting: {
              select: { id: true, title: true }
            }
          }
        }
      }
    });
  }

  /**
   * Hủy lịch phỏng vấn (INT-04)
   */
  async cancelInterview(id: string, reason?: string) {
    const interview = await prisma.interview.findUnique({ where: { id } });
    if (!interview) {
      throw new NotFoundError('Không tìm thấy buổi phỏng vấn', 'INTERVIEW_NOT_FOUND');
    }

    if (interview.status === InterviewStatus.COMPLETED) {
      throw new ValidationError('Không thể hủy buổi phỏng vấn đã hoàn tất');
    }

    const updatedNotes = reason
      ? `${interview.notes || ''}\n[LÝ DO HỦY LỊCH]: ${reason}`.trim()
      : interview.notes;

    return await prisma.interview.update({
      where: { id },
      data: {
        status: InterviewStatus.CANCELLED,
        notes: updatedNotes
      }
    });
  }

  /**
   * Ghi nhận kết quả đánh giá phỏng vấn (INT-06)
   * Theo API Contract 3.5.2: PATCH /api/interviews/:id/feedback
   * Tự động chuyển Application.status = INTERVIEWED
   */
  async submitFeedback(id: string, dto: SubmitFeedbackDto) {
    const details: { field: string; message: string }[] = [];

    if (dto.rating === undefined || dto.rating === null) {
      details.push({ field: 'rating', message: 'Điểm đánh giá (rating) là bắt buộc' });
    } else if (!Number.isInteger(dto.rating) || dto.rating < 1 || dto.rating > 5) {
      details.push({ field: 'rating', message: 'Điểm đánh giá (rating) phải là số nguyên từ 1 đến 5' });
    }

    if (!dto.feedback || !dto.feedback.trim()) {
      details.push({ field: 'feedback', message: 'Nhận xét phỏng vấn (feedback) không được để trống' });
    }

    if (details.length > 0) {
      throw new ValidationError('Dữ liệu đánh giá phỏng vấn không hợp lệ', details);
    }

    const interview = await prisma.interview.findUnique({ where: { id } });
    if (!interview) {
      throw new NotFoundError('Không tìm thấy buổi phỏng vấn', 'INTERVIEW_NOT_FOUND');
    }

    if (interview.status === InterviewStatus.CANCELLED) {
      throw new ValidationError('Không thể đánh giá buổi phỏng vấn đã bị hủy');
    }

    const targetStatus = dto.status || InterviewStatus.COMPLETED;

    // Cập nhật Interview
    const updatedInterview = await prisma.interview.update({
      where: { id },
      data: {
        rating: dto.rating,
        feedback: dto.feedback.trim(),
        notes: dto.notes !== undefined ? dto.notes : interview.notes,
        status: targetStatus
      },
      include: {
        interviewer: {
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        application: {
          include: {
            candidateProfile: {
              include: {
                user: {
                  select: { id: true, email: true, firstName: true, lastName: true }
                }
              }
            },
            jobPosting: {
              select: { id: true, title: true }
            }
          }
        }
      }
    });

    // Nếu phỏng vấn COMPLETED, tự động chuyển Application sang INTERVIEWED
    if (targetStatus === InterviewStatus.COMPLETED) {
      await prisma.application.update({
        where: { id: interview.applicationId },
        data: { status: ApplicationStatus.INTERVIEWED }
      });
    }

    return updatedInterview;
  }

  /**
   * Cập nhật trạng thái quy trình tuyển dụng (INT-07)
   * Chuyển trạng thái Application trong State Machine
   */
  async updateApplicationWorkflowStatus(applicationId: string, nextStatus: ApplicationStatus) {
    const validStatuses: ApplicationStatus[] = [
      ApplicationStatus.SHORTLISTED,
      ApplicationStatus.INTERVIEW_SCHEDULED,
      ApplicationStatus.INTERVIEWED,
      ApplicationStatus.OFFERED,
      ApplicationStatus.HIRED,
      ApplicationStatus.REJECTED
    ];

    if (!validStatuses.includes(nextStatus)) {
      throw new ValidationError(`Trạng thái chuyển tiếp không hợp lệ trong quy trình: ${nextStatus}`);
    }

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        candidateProfile: {
          include: {
            user: {
              select: { id: true, email: true, firstName: true, lastName: true }
            }
          }
        },
        jobPosting: {
          select: { id: true, title: true }
        }
      }
    });

    if (!application) {
      throw new NotFoundError('Không tìm thấy đơn ứng tuyển', 'APPLICATION_NOT_FOUND');
    }

    const updated = await prisma.application.update({
      where: { id: applicationId },
      data: { status: nextStatus },
      include: {
        candidateProfile: {
          include: {
            user: {
              select: { id: true, email: true, firstName: true, lastName: true }
            }
          }
        },
        jobPosting: {
          select: { id: true, title: true }
        },
        interviews: {
          orderBy: { scheduledAt: 'desc' }
        }
      }
    });

    return updated;
  }

  /**
   * Lấy dữ liệu Kanban cho quy trình tuyển dụng Workflow (INT-07 & INT-08)
   * Gom nhóm danh sách ứng viên theo cột trạng thái
   */
  async getWorkflowKanban(jobPostingId?: string) {
    const where: any = {};
    if (jobPostingId) {
      where.jobPostingId = jobPostingId;
    }

    const applications = await prisma.application.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        candidateProfile: {
          include: {
            user: {
              select: { id: true, email: true, firstName: true, lastName: true }
            }
          }
        },
        jobPosting: {
          select: { id: true, title: true, department: true }
        },
        interviews: {
          orderBy: { scheduledAt: 'desc' },
          take: 1,
          include: {
            interviewer: {
              select: { id: true, firstName: true, lastName: true }
            }
          }
        }
      }
    });

    // Nhóm theo các cột chính của Pipeline
    const columns = {
      SHORTLISTED: applications.filter(a => a.status === ApplicationStatus.SHORTLISTED),
      INTERVIEW_SCHEDULED: applications.filter(a => a.status === ApplicationStatus.INTERVIEW_SCHEDULED),
      INTERVIEWED: applications.filter(a => a.status === ApplicationStatus.INTERVIEWED),
      OFFERED: applications.filter(a => a.status === ApplicationStatus.OFFERED),
      HIRED: applications.filter(a => a.status === ApplicationStatus.HIRED),
      REJECTED: applications.filter(a => a.status === ApplicationStatus.REJECTED)
    };

    return {
      total: applications.length,
      columns
    };
  }

  /**
   * Lấy danh sách Interviewers khả dụng (HR và ADMIN)
   */
  async getAvailableInterviewers() {
    return await prisma.user.findMany({
      where: {
        role: { in: [UserRole.HR, UserRole.ADMIN] },
        isActive: true
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true
      },
      orderBy: { firstName: 'asc' }
    });
  }
}

export default new InterviewService();
