import { Prisma, JobStatus, UserRole } from '@prisma/client';
import prisma from '../lib/prisma';
import { AuthenticatedUser } from '../middlewares/auth.middleware';

export interface CreateJobDto {
  title: string;
  department?: string | null;
  location?: string | null;
  employmentType?: string | null;
  description: string;
  requirements?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  status?: JobStatus;
  applicationDeadline?: string | Date | null;
}

export interface UpdateJobDto {
  title?: string;
  department?: string | null;
  location?: string | null;
  employmentType?: string | null;
  description?: string;
  requirements?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  status?: JobStatus;
  applicationDeadline?: string | Date | null;
}

export interface JobFilterParams {
  page?: number | string;
  limit?: number | string;
  search?: string;
  department?: string;
  location?: string;
  employmentType?: string;
  status?: JobStatus | string;
  myJobs?: boolean | string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ValidationErrorDetail {
  field: string;
  message: string;
}

export class ValidationError extends Error {
  code: string;
  details: ValidationErrorDetail[];

  constructor(message: string, details: ValidationErrorDetail[] = [], code = 'VALIDATION_ERROR') {
    super(message);
    this.name = 'ValidationError';
    this.code = code;
    this.details = details;
  }
}

export class NotFoundError extends Error {
  code: string;

  constructor(message = 'Không tìm thấy tin tuyển dụng', code = 'NOT_FOUND') {
    super(message);
    this.name = 'NotFoundError';
    this.code = code;
  }
}

export class ForbiddenError extends Error {
  code: string;

  constructor(message = 'Bạn không có quyền thực hiện thao tác này', code = 'FORBIDDEN') {
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

export class JobService {
  /**
   * Kiểm tra tính hợp lệ của dữ liệu đầu vào cho Job Posting
   */
  private validateJobPayload(data: Partial<CreateJobDto>, isUpdate = false): void {
    const details: ValidationErrorDetail[] = [];

    // Title validation
    if (!isUpdate || data.title !== undefined) {
      if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
        details.push({ field: 'title', message: 'Tiêu đề tin tuyển dụng không được để trống' });
      } else if (data.title.trim().length < 3) {
        details.push({ field: 'title', message: 'Tiêu đề tin tuyển dụng phải có ít nhất 3 ký tự' });
      } else if (data.title.trim().length > 200) {
        details.push({ field: 'title', message: 'Tiêu đề tin tuyển dụng không được vượt quá 200 ký tự' });
      }
    }

    // Description validation
    if (!isUpdate || data.description !== undefined) {
      if (!data.description || typeof data.description !== 'string' || data.description.trim().length === 0) {
        details.push({ field: 'description', message: 'Mô tả công việc không được để trống' });
      } else if (data.description.trim().length < 10) {
        details.push({ field: 'description', message: 'Mô tả công việc phải có ít nhất 10 ký tự' });
      }
    }

    // Status validation
    if (data.status !== undefined) {
      const validStatuses = Object.values(JobStatus);
      if (!validStatuses.includes(data.status)) {
        details.push({
          field: 'status',
          message: `Trạng thái không hợp lệ. Cho phép: ${validStatuses.join(', ')}`
        });
      }
    }

    // Salary validation
    const hasMin = data.salaryMin !== undefined && data.salaryMin !== null;
    const hasMax = data.salaryMax !== undefined && data.salaryMax !== null;

    if (hasMin && (isNaN(Number(data.salaryMin)) || Number(data.salaryMin) < 0)) {
      details.push({ field: 'salaryMin', message: 'Mức lương tối thiểu phải là số không âm' });
    }

    if (hasMax && (isNaN(Number(data.salaryMax)) || Number(data.salaryMax) < 0)) {
      details.push({ field: 'salaryMax', message: 'Mức lương tối đa phải là số không âm' });
    }

    if (hasMin && hasMax && Number(data.salaryMin) > Number(data.salaryMax)) {
      details.push({
        field: 'salaryMin',
        message: 'Mức lương tối thiểu (salaryMin) không được lớn hơn mức lương tối đa (salaryMax)'
      });
    }

    // Application deadline validation
    if (data.applicationDeadline !== undefined && data.applicationDeadline !== null) {
      const deadlineDate = new Date(data.applicationDeadline);
      if (isNaN(deadlineDate.getTime())) {
        details.push({ field: 'applicationDeadline', message: 'Hạn nộp hồ sơ không đúng định dạng ngày tháng hợp lệ' });
      }
    }

    if (details.length > 0) {
      throw new ValidationError('Dữ liệu tin tuyển dụng không hợp lệ', details);
    }
  }

  /**
   * Tạo tin tuyển dụng mới (HR hoặc ADMIN)
   */
  async createJob(userId: string, data: CreateJobDto) {
    this.validateJobPayload(data, false);

    const deadline = data.applicationDeadline ? new Date(data.applicationDeadline) : null;

    const job = await prisma.jobPosting.create({
      data: {
        title: data.title.trim(),
        department: data.department ? data.department.trim() : null,
        location: data.location ? data.location.trim() : null,
        employmentType: data.employmentType ? data.employmentType.trim() : null,
        description: data.description.trim(),
        requirements: data.requirements ? data.requirements.trim() : null,
        salaryMin: data.salaryMin !== undefined && data.salaryMin !== null ? new Prisma.Decimal(data.salaryMin) : null,
        salaryMax: data.salaryMax !== undefined && data.salaryMax !== null ? new Prisma.Decimal(data.salaryMax) : null,
        status: data.status || JobStatus.DRAFT,
        applicationDeadline: deadline,
        postedById: userId,
      },
      include: {
        postedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        _count: {
          select: {
            applications: true,
          },
        },
      },
    });

    return job;
  }

  /**
   * Cập nhật thông tin tin tuyển dụng (Kiểm tra quyền sở hữu Row-Level Security)
   */
  async updateJob(id: string, userId: string, userRole: UserRole, data: UpdateJobDto) {
    const existingJob = await prisma.jobPosting.findUnique({
      where: { id },
      include: { _count: { select: { applications: true } } },
    });

    if (!existingJob) {
      throw new NotFoundError('Không tìm thấy tin tuyển dụng');
    }

    // Row-Level Security: ADMIN có toàn quyền, HR chỉ sửa được tin do mình tạo
    if (userRole !== UserRole.ADMIN && existingJob.postedById !== userId) {
      throw new ForbiddenError('Bạn chỉ có quyền chỉnh sửa tin tuyển dụng do chính bạn tạo');
    }

    this.validateJobPayload(data, true);

    // Kiểm tra chéo mức lương giữa dữ liệu cập nhật và dữ liệu hiện tại trong DB
    const effectiveMin = data.salaryMin !== undefined
      ? data.salaryMin
      : (existingJob.salaryMin !== null ? Number(existingJob.salaryMin) : null);

    const effectiveMax = data.salaryMax !== undefined
      ? data.salaryMax
      : (existingJob.salaryMax !== null ? Number(existingJob.salaryMax) : null);

    if (effectiveMin !== null && effectiveMax !== null && Number(effectiveMin) > Number(effectiveMax)) {
      throw new ValidationError(
        'Mức lương tối thiểu (salaryMin) không được lớn hơn mức lương tối đa (salaryMax)',
        [{ field: 'salaryMin', message: 'Mức lương tối thiểu không được lớn hơn mức lương tối đa' }]
      );
    }

    const updateData: Prisma.JobPostingUpdateInput = {};

    if (data.title !== undefined) updateData.title = data.title.trim();
    if (data.department !== undefined) updateData.department = data.department ? data.department.trim() : null;
    if (data.location !== undefined) updateData.location = data.location ? data.location.trim() : null;
    if (data.employmentType !== undefined) updateData.employmentType = data.employmentType ? data.employmentType.trim() : null;
    if (data.description !== undefined) updateData.description = data.description.trim();
    if (data.requirements !== undefined) updateData.requirements = data.requirements ? data.requirements.trim() : null;
    if (data.salaryMin !== undefined) {
      updateData.salaryMin = data.salaryMin !== null ? new Prisma.Decimal(data.salaryMin) : null;
    }
    if (data.salaryMax !== undefined) {
      updateData.salaryMax = data.salaryMax !== null ? new Prisma.Decimal(data.salaryMax) : null;
    }
    if (data.status !== undefined) updateData.status = data.status;
    if (data.applicationDeadline !== undefined) {
      updateData.applicationDeadline = data.applicationDeadline ? new Date(data.applicationDeadline) : null;
    }

    const updatedJob = await prisma.jobPosting.update({
      where: { id },
      data: updateData,
      include: {
        postedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        _count: {
          select: {
            applications: true,
          },
        },
      },
    });

    return updatedJob;
  }

  /**
   * Cập nhật trạng thái tin tuyển dụng (PATCH /api/jobs/:id/status)
   */
  async updateJobStatus(id: string, userId: string, userRole: UserRole, status: JobStatus) {
    const existingJob = await prisma.jobPosting.findUnique({
      where: { id },
    });

    if (!existingJob) {
      throw new NotFoundError('Không tìm thấy tin tuyển dụng');
    }

    // Row-Level Security
    if (userRole !== UserRole.ADMIN && existingJob.postedById !== userId) {
      throw new ForbiddenError('Bạn chỉ có quyền thay đổi trạng thái tin tuyển dụng do chính bạn tạo');
    }

    const validStatuses = Object.values(JobStatus);
    if (!validStatuses.includes(status)) {
      throw new ValidationError('Trạng thái không hợp lệ', [
        { field: 'status', message: `Trạng thái phải thuộc: ${validStatuses.join(', ')}` }
      ]);
    }

    const updatedJob = await prisma.jobPosting.update({
      where: { id },
      data: { status },
      include: {
        postedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        _count: {
          select: {
            applications: true,
          },
        },
      },
    });

    return updatedJob;
  }

  /**
   * Xóa tin tuyển dụng (Safe Delete Rule: Ngăn xóa nếu đã có hồ sơ ứng tuyển)
   */
  async deleteJob(id: string, userId: string, userRole: UserRole) {
    const existingJob = await prisma.jobPosting.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            applications: true,
          },
        },
      },
    });

    if (!existingJob) {
      throw new NotFoundError('Không tìm thấy tin tuyển dụng');
    }

    // Row-Level Security
    if (userRole !== UserRole.ADMIN && existingJob.postedById !== userId) {
      throw new ForbiddenError('Bạn chỉ có quyền xóa tin tuyển dụng do chính bạn tạo');
    }

    // Safe Delete Rule: Bảo vệ toàn vẹn dữ liệu hồ sơ ứng tuyển (Module TV3)
    if (existingJob._count.applications > 0) {
      throw new ConflictError(
        `Không thể xóa tin tuyển dụng đã tiếp nhận ${existingJob._count.applications} hồ sơ ứng tuyển. Vui lòng chuyển trạng thái sang Đã đóng (CLOSED) hoặc Lưu trữ (ARCHIVED).`,
        'JOB_HAS_APPLICATIONS'
      );
    }

    await prisma.jobPosting.delete({
      where: { id },
    });

    return {
      id,
      message: 'Đã xóa tin tuyển dụng thành công',
    };
  }

  /**
   * Lấy chi tiết một tin tuyển dụng theo ID
   * Khách vãng lai và Candidate chỉ xem được tin PUBLISHED
   * HR và ADMIN được phép xem mọi trạng thái (DRAFT, CLOSED, ARCHIVED)
   */
  async getJobById(id: string, user?: AuthenticatedUser) {
    const job = await prisma.jobPosting.findUnique({
      where: { id },
      include: {
        postedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        _count: {
          select: {
            applications: true,
          },
        },
      },
    });

    if (!job) {
      throw new NotFoundError('Không tìm thấy tin tuyển dụng');
    }

    const isStaff = user && (user.role === UserRole.HR || user.role === UserRole.ADMIN);

    // Nếu không phải nhân sự (Guest hoặc Candidate) và tin không ở trạng thái PUBLISHED
    if (!isStaff && job.status !== JobStatus.PUBLISHED) {
      throw new NotFoundError('Tin tuyển dụng không tồn tại hoặc đã ngừng tiếp nhận hồ sơ');
    }

    return job;
  }

  /**
   * Lấy danh sách tin tuyển dụng có phân trang, tìm kiếm và bộ lọc
   */
  async getJobs(filters: JobFilterParams, user?: AuthenticatedUser) {
    const page = Math.max(1, parseInt(String(filters.page || 1), 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(String(filters.limit || 10), 10) || 1));
    const skip = (page - 1) * limit;

    const isStaff = user && (user.role === UserRole.HR || user.role === UserRole.ADMIN);

    const where: Prisma.JobPostingWhereInput = {};

    // 1. Phân quyền lọc trạng thái:
    if (!isStaff) {
      // Khách vãng lai và Ứng viên luôn chỉ thấy tin PUBLISHED
      where.status = JobStatus.PUBLISHED;
    } else {
      // HR hoặc ADMIN có thể lọc theo status cụ thể nếu truyền vào
      if (filters.status && Object.values(JobStatus).includes(filters.status as JobStatus)) {
        where.status = filters.status as JobStatus;
      }

      // HR có thể lọc riêng các tin do chính mình tạo (myJobs=true)
      if (filters.myJobs === true || filters.myJobs === 'true') {
        where.postedById = user.id;
      }
    }

    // 2. Tìm kiếm từ khóa theo Tiêu đề (Search)
    if (filters.search && typeof filters.search === 'string' && filters.search.trim().length > 0) {
      const searchTerm = filters.search.trim();
      where.OR = [
        { title: { contains: searchTerm } },
        { department: { contains: searchTerm } },
      ];
    }

    // 3. Lọc theo Phòng ban (Department)
    if (filters.department && typeof filters.department === 'string' && filters.department.trim().length > 0) {
      where.department = { contains: filters.department.trim() };
    }

    // 4. Lọc theo Địa điểm (Location)
    if (filters.location && typeof filters.location === 'string' && filters.location.trim().length > 0) {
      where.location = { contains: filters.location.trim() };
    }

    // 5. Lọc theo Hình thức làm việc (EmploymentType)
    if (filters.employmentType && typeof filters.employmentType === 'string' && filters.employmentType.trim().length > 0) {
      where.employmentType = filters.employmentType.trim();
    }

    const [total, jobs] = await Promise.all([
      prisma.jobPosting.count({ where }),
      prisma.jobPosting.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          postedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          _count: {
            select: {
              applications: true,
            },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    const meta: PaginationMeta = {
      page,
      limit,
      total,
      totalPages,
    };

    return {
      jobs,
      meta,
    };
  }
}

export const jobService = new JobService();
export default jobService;
