import path from 'path';
import fs from 'fs';
import http from 'http';
import https from 'https';
import prisma from '../lib/prisma';
import { UserRole, ApplicationStatus } from '@prisma/client';

// ============================================================================
// Danh sách trạng thái cho phép Candidate rút đơn (APP-05)
// ============================================================================
const WITHDRAWABLE_STATUSES: ApplicationStatus[] = [
  ApplicationStatus.SUBMITTED,
  ApplicationStatus.SCREENING
];

// ============================================================================
// Danh sách trạng thái HR được phép gán (APP-07)
// ============================================================================
const HR_ALLOWED_STATUS_TRANSITIONS: ApplicationStatus[] = [
  ApplicationStatus.SCREENING,
  ApplicationStatus.SHORTLISTED,
  ApplicationStatus.INTERVIEWED,
  ApplicationStatus.OFFERED,
  ApplicationStatus.HIRED,
  ApplicationStatus.REJECTED,
];

export class AppError extends Error {
  statusCode: number;
  code: string;
  details?: Array<{ field: string; message: string }>;

  constructor(message: string, statusCode: number, code: string, details?: Array<{ field: string; message: string }>) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export class ApplicationService {
  /**
   * Tải lên và cập nhật tệp CV cho hồ sơ ứng viên (CandidateProfile)
   * @param userId ID người dùng đang đăng nhập (Role: CANDIDATE)
   * @param file Tệp tin do Multer lưu trữ
   */
  async uploadCv(userId: string, file?: Express.Multer.File) {
    if (!file) {
      throw new AppError('Vui lòng chọn tệp tin CV (.pdf hoặc .docx) để tải lên', 400, 'VALIDATION_ERROR', [
        { field: 'cvFile', message: 'Tệp CV không được để trống' }
      ]);
    }

    // 1. Kiểm tra tài khoản người dùng
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { candidateProfile: true }
    });

    if (!user || !user.isActive) {
      this.safeDeletePhysicalFile(file.path);
      throw new AppError('Tài khoản không tồn tại hoặc đã bị khóa', 401, 'UNAUTHORIZED');
    }

    if (user.role !== UserRole.CANDIDATE) {
      this.safeDeletePhysicalFile(file.path);
      throw new AppError('Chỉ ứng viên (CANDIDATE) mới có quyền tải lên hồ sơ CV', 403, 'FORBIDDEN');
    }

    // 2. Đường dẫn truy cập tương đối phục vụ web
    const relativeUrl = `/uploads/cv/${file.filename}`;

    // 3. Xóa tệp CV cũ nếu có trên ổ đĩa để tránh rác dung lượng
    if (user.candidateProfile?.cvFileUrl && user.candidateProfile.cvFileUrl.startsWith('/uploads/cv/')) {
      const oldFilename = path.basename(user.candidateProfile.cvFileUrl);
      const oldFilePath = path.join(process.cwd(), 'uploads', 'cv', oldFilename);
      if (oldFilename !== file.filename) {
        this.safeDeletePhysicalFile(oldFilePath);
      }
    }

    // 4. Lưu / Cập nhật CandidateProfile trong CSDL
    const updatedProfile = await prisma.candidateProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        cvFileUrl: relativeUrl
      },
      update: {
        cvFileUrl: relativeUrl
      }
    });

    return {
      candidateProfileId: updatedProfile.id,
      cvFileUrl: updatedProfile.cvFileUrl,
      fileName: file.filename,
      originalName: file.originalname,
      fileSizeBytes: file.size,
      mimeType: file.mimetype,
      uploadedAt: updatedProfile.updatedAt
    };
  }

  /**
   * Lấy thông tin tệp CV hiện tại của ứng viên
   */
  async getMyCv(userId: string) {
    const profile = await prisma.candidateProfile.findUnique({
      where: { userId }
    });

    if (!profile || !profile.cvFileUrl) {
      return {
        hasCv: false,
        cvFileUrl: null
      };
    }

    return {
      hasCv: true,
      candidateProfileId: profile.id,
      cvFileUrl: profile.cvFileUrl,
      updatedAt: profile.updatedAt
    };
  }

  /**
   * Xóa tệp CV trong hồ sơ ứng viên
   */
  async deleteMyCv(userId: string) {
    const profile = await prisma.candidateProfile.findUnique({
      where: { userId }
    });

    if (!profile || !profile.cvFileUrl) {
      throw new AppError('Hồ sơ chưa có tệp CV để xóa', 404, 'NOT_FOUND');
    }

    if (profile.cvFileUrl.startsWith('/uploads/cv/')) {
      const filename = path.basename(profile.cvFileUrl);
      const filePath = path.join(process.cwd(), 'uploads', 'cv', filename);
      this.safeDeletePhysicalFile(filePath);
    }

    await prisma.candidateProfile.update({
      where: { id: profile.id },
      data: { cvFileUrl: null }
    });

    return { message: 'Đã xóa tệp CV thành công' };
  }

  // ============================================================================
  // APP-04: Nộp đơn ứng tuyển
  // ============================================================================
  /**
   * Candidate nộp hồ sơ ứng tuyển vào một vị trí
   * Tự động trigger AI phân tích ngầm sau khi lưu đơn thành công
   */
  async submitApplication(
    userId: string,
    jobPostingId: string,
    coverLetter?: string,
    cvFile?: Express.Multer.File
  ) {
    // 1. Lấy thông tin user kèm candidateProfile
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { candidateProfile: true }
    });

    if (!user || !user.isActive) {
      if (cvFile) this.safeDeletePhysicalFile(cvFile.path);
      throw new AppError('Tài khoản không tồn tại hoặc đã bị vô hiệu hóa', 401, 'UNAUTHORIZED');
    }

    // 2. Kiểm tra user có CandidateProfile chưa (phải tạo trước)
    let candidateProfile = user.candidateProfile;
    if (!candidateProfile) {
      // Tự động tạo profile trống nếu chưa có
      candidateProfile = await prisma.candidateProfile.create({
        data: { userId: user.id }
      });
    }

    // 3. Cập nhật cvFileUrl nếu có tệp mới tải lên kèm đơn
    if (cvFile) {
      const relativeUrl = `/uploads/cv/${cvFile.filename}`;
      // Xóa file CV cũ nếu tồn tại
      if (candidateProfile.cvFileUrl?.startsWith('/uploads/cv/')) {
        const oldPath = path.join(process.cwd(), 'uploads', 'cv', path.basename(candidateProfile.cvFileUrl));
        this.safeDeletePhysicalFile(oldPath);
      }
      candidateProfile = await prisma.candidateProfile.update({
        where: { id: candidateProfile.id },
        data: { cvFileUrl: relativeUrl }
      });
    }

    // 4. Kiểm tra tin tuyển dụng tồn tại, đang PUBLISHED và chưa hết hạn
    const job = await prisma.jobPosting.findUnique({
      where: { id: jobPostingId }
    });

    if (!job) {
      if (cvFile) this.safeDeletePhysicalFile(cvFile.path);
      throw new AppError('Tin tuyển dụng không tồn tại', 404, 'NOT_FOUND');
    }

    if (job.status !== 'PUBLISHED') {
      if (cvFile) this.safeDeletePhysicalFile(cvFile.path);
      throw new AppError('Tin tuyển dụng đã đóng hoặc chưa được công bố', 400, 'JOB_NOT_AVAILABLE');
    }

    if (job.applicationDeadline && job.applicationDeadline < new Date()) {
      if (cvFile) this.safeDeletePhysicalFile(cvFile.path);
      throw new AppError('Tin tuyển dụng đã hết hạn nộp hồ sơ', 400, 'APPLICATION_DEADLINE_PASSED');
    }

    // 5. Kiểm tra ứng viên đã nộp vào Job này chưa (APP-05)
    const existingApplication = await prisma.application.findUnique({
      where: {
        candidateProfileId_jobPostingId: {
          candidateProfileId: candidateProfile.id,
          jobPostingId: job.id
        }
      }
    });

    if (existingApplication) {
      if (cvFile) this.safeDeletePhysicalFile(cvFile.path);
      throw new AppError(
        'Bạn đã nộp hồ sơ vào vị trí tuyển dụng này rồi',
        409,
        'DUPLICATE_APPLICATION'
      );
    }

    // 6. Tạo bản ghi Application với trạng thái SUBMITTED
    const application = await prisma.application.create({
      data: {
        candidateProfileId: candidateProfile.id,
        jobPostingId: job.id,
        status: ApplicationStatus.SUBMITTED,
        coverLetter: coverLetter?.trim() || null
      }
    });

    // 7. Trigger phân tích AI ngầm (non-blocking) — không làm crash đơn nếu AI lỗi
    this.triggerAiAnalysisBackground(application.id, candidateProfile, job).catch(err => {
      console.warn(`[AI Hook] Lỗi khi trigger AI cho application ${application.id}:`, err?.message || err);
    });

    return {
      applicationId: application.id,
      jobPostingId: application.jobPostingId,
      status: application.status,
      appliedAt: application.appliedAt
    };
  }

  // ============================================================================
  // APP-06: Candidate xem lịch sử ứng tuyển
  // ============================================================================
  async getMyApplications(userId: string) {
    const profile = await prisma.candidateProfile.findUnique({
      where: { userId }
    });

    if (!profile) {
      return [];
    }

    const applications = await prisma.application.findMany({
      where: { candidateProfileId: profile.id },
      orderBy: { appliedAt: 'desc' },
      include: {
        jobPosting: {
          select: {
            id: true,
            title: true,
            department: true,
            location: true,
            employmentType: true,
            status: true,
            postedBy: {
              select: { firstName: true, lastName: true, email: true }
            }
          }
        },
        interviews: {
          where: { status: 'SCHEDULED' },
          orderBy: { scheduledAt: 'asc' },
          take: 1,
          select: {
            id: true,
            scheduledAt: true,
            location: true,
            meetingUrl: true,
            status: true
          }
        }
      }
    });

    return applications.map(app => ({
      id: app.id,
      status: app.status,
      coverLetter: app.coverLetter,
      appliedAt: app.appliedAt,
      updatedAt: app.updatedAt,
      aiMatchScore: app.aiMatchScore,
      jobPosting: app.jobPosting,
      upcomingInterview: app.interviews[0] || null
    }));
  }

  /**
   * Candidate xem chi tiết 1 đơn ứng tuyển của chính mình
   */
  async getMyApplicationById(userId: string, applicationId: string) {
    const profile = await prisma.candidateProfile.findUnique({
      where: { userId }
    });

    if (!profile) {
      throw new AppError('Không tìm thấy hồ sơ ứng viên', 404, 'NOT_FOUND');
    }

    const application = await prisma.application.findFirst({
      where: {
        id: applicationId,
        candidateProfileId: profile.id
      },
      include: {
        jobPosting: {
          select: {
            id: true, title: true, department: true, location: true,
            employmentType: true, description: true, requirements: true,
            salaryMin: true, salaryMax: true, status: true, applicationDeadline: true
          }
        },
        interviews: {
          orderBy: { scheduledAt: 'desc' },
          select: {
            id: true, scheduledAt: true, durationMinutes: true,
            location: true, meetingUrl: true, status: true, notes: true
          }
        }
      }
    });

    if (!application) {
      throw new AppError('Đơn ứng tuyển không tồn tại hoặc bạn không có quyền xem', 404, 'NOT_FOUND');
    }

    return {
      id: application.id,
      status: application.status,
      coverLetter: application.coverLetter,
      appliedAt: application.appliedAt,
      updatedAt: application.updatedAt,
      aiMatchScore: application.aiMatchScore,
      parsedSkills: application.parsedSkills,
      aiAnalysisSummary: application.aiAnalysisSummary,
      cvFileUrl: profile.cvFileUrl,
      jobPosting: application.jobPosting,
      interviews: application.interviews
    };
  }

  /**
   * Candidate rút đơn ứng tuyển (APP-05)
   * Chỉ rút được khi status là SUBMITTED hoặc SCREENING
   */
  async withdrawApplication(userId: string, applicationId: string) {
    const profile = await prisma.candidateProfile.findUnique({
      where: { userId }
    });

    if (!profile) {
      throw new AppError('Không tìm thấy hồ sơ ứng viên', 404, 'NOT_FOUND');
    }

    const application = await prisma.application.findFirst({
      where: {
        id: applicationId,
        candidateProfileId: profile.id
      }
    });

    if (!application) {
      throw new AppError('Đơn ứng tuyển không tồn tại hoặc bạn không có quyền thao tác', 404, 'NOT_FOUND');
    }

    if (!WITHDRAWABLE_STATUSES.includes(application.status)) {
      throw new AppError(
        `Không thể rút đơn ở trạng thái hiện tại (${application.status}). Chỉ được rút khi hồ sơ đang ở trạng thái SUBMITTED hoặc SCREENING`,
        400,
        'WITHDRAW_NOT_ALLOWED'
      );
    }

    const updated = await prisma.application.update({
      where: { id: application.id },
      data: { status: ApplicationStatus.WITHDRAWN }
    });

    return {
      applicationId: updated.id,
      status: updated.status,
      message: 'Đã rút hồ sơ ứng tuyển thành công'
    };
  }

  // ============================================================================
  // APP-07: HR xem danh sách ứng viên theo tin tuyển dụng
  // ============================================================================
  async getApplicationsByJob(
    jobId: string,
    query: {
      status?: string;
      sortBy?: string;
      order?: string;
      minScore?: number;
      page?: number;
      limit?: number;
    }
  ) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 10));
    const skip = (page - 1) * limit;

    const where: any = {};

    // Nếu jobId !== 'all', xác thực job tồn tại và lọc theo job
    if (jobId !== 'all') {
      const job = await prisma.jobPosting.findUnique({
        where: { id: jobId },
        select: { id: true, title: true }
      });

      if (!job) {
        throw new AppError('Tin tuyển dụng không tồn tại', 404, 'NOT_FOUND');
      }
      where.jobPostingId = jobId;
    }

    // Xây dựng filter where
    if (query.status && Object.values(ApplicationStatus).includes(query.status as ApplicationStatus)) {
      where.status = query.status as ApplicationStatus;
    }
    if (query.minScore !== undefined && !isNaN(query.minScore)) {
      where.aiMatchScore = { gte: query.minScore };
    }

    // Xây dựng sắp xếp
    const validSortFields = ['appliedAt', 'aiMatchScore', 'updatedAt'];
    const sortField = validSortFields.includes(query.sortBy || '') ? query.sortBy! : 'appliedAt';
    const sortOrder = query.order === 'asc' ? 'asc' : 'desc';

    const [total, applications] = await prisma.$transaction([
      prisma.application.count({ where }),
      prisma.application.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortField]: sortOrder },
        include: {
          jobPosting: {
            select: {
              id: true,
              title: true,
              department: true,
              location: true
            }
          },
          candidateProfile: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true,
                  avatarUrl: true
                }
              }
            }
          }
        }
      })
    ]);

    const data = applications.map(app => ({
      id: app.id,
      status: app.status,
      appliedAt: app.appliedAt,
      updatedAt: app.updatedAt,
      coverLetter: app.coverLetter,
      aiMatchScore: app.aiMatchScore,
      parsedSkills: app.parsedSkills,
      aiAnalysisSummary: app.aiAnalysisSummary,
      cvFileUrl: app.candidateProfile.cvFileUrl,
      jobPosting: app.jobPosting,
      candidate: {
        candidateProfileId: app.candidateProfile.id,
        fullName: `${app.candidateProfile.user.firstName} ${app.candidateProfile.user.lastName}`.trim(),
        email: app.candidateProfile.user.email,
        avatarUrl: app.candidateProfile.user.avatarUrl,
        phone: app.candidateProfile.phone,
        experienceYears: app.candidateProfile.experienceYears,
        education: app.candidateProfile.education
      }
    }));

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Lấy danh sách tổng hợp các Job cùng số lượng đơn ứng tuyển cho HR
   */
  async getHrJobsOverview() {
    const jobs = await prisma.jobPosting.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        department: true,
        location: true,
        employmentType: true,
        status: true,
        applicationDeadline: true,
        _count: {
          select: { applications: true }
        }
      }
    });

    return jobs.map(j => ({
      id: j.id,
      title: j.title,
      department: j.department,
      location: j.location,
      employmentType: j.employmentType,
      status: j.status,
      applicationDeadline: j.applicationDeadline,
      totalApplications: j._count.applications
    }));
  }

  /**
   * HR xem chi tiết hồ sơ 1 ứng viên
   */
  async getApplicationDetailForHr(applicationId: string) {
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        candidateProfile: {
          include: {
            user: {
              select: {
                id: true, firstName: true, lastName: true,
                email: true, avatarUrl: true, createdAt: true
              }
            }
          }
        },
        jobPosting: {
          select: {
            id: true, title: true, department: true, location: true,
            employmentType: true, requirements: true
          }
        },
        interviews: {
          orderBy: { scheduledAt: 'desc' },
          include: {
            interviewer: {
              select: { firstName: true, lastName: true, email: true }
            }
          }
        }
      }
    });

    if (!application) {
      throw new AppError('Đơn ứng tuyển không tồn tại', 404, 'NOT_FOUND');
    }

    return {
      id: application.id,
      status: application.status,
      appliedAt: application.appliedAt,
      updatedAt: application.updatedAt,
      coverLetter: application.coverLetter,
      cvFileUrl: application.candidateProfile.cvFileUrl,
      aiMatchScore: application.aiMatchScore,
      parsedSkills: application.parsedSkills,
      aiAnalysisSummary: application.aiAnalysisSummary,
      candidate: {
        id: application.candidateProfile.user.id,
        fullName: `${application.candidateProfile.user.firstName} ${application.candidateProfile.user.lastName}`.trim(),
        email: application.candidateProfile.user.email,
        avatarUrl: application.candidateProfile.user.avatarUrl,
        phone: application.candidateProfile.phone,
        dateOfBirth: application.candidateProfile.dateOfBirth,
        address: application.candidateProfile.address,
        summary: application.candidateProfile.summary,
        experienceYears: application.candidateProfile.experienceYears,
        education: application.candidateProfile.education,
        joinedAt: application.candidateProfile.user.createdAt
      },
      jobPosting: application.jobPosting,
      interviews: application.interviews
    };
  }

  /**
   * HR cập nhật trạng thái hồ sơ ứng viên (APP-07)
   */
  async updateApplicationStatus(applicationId: string, newStatus: string) {
    if (!Object.values(ApplicationStatus).includes(newStatus as ApplicationStatus)) {
      throw new AppError(
        `Trạng thái không hợp lệ: "${newStatus}". Giá trị cho phép: ${Object.values(ApplicationStatus).join(', ')}`,
        400,
        'VALIDATION_ERROR',
        [{ field: 'status', message: 'Trạng thái không hợp lệ' }]
      );
    }

    const status = newStatus as ApplicationStatus;

    if (!HR_ALLOWED_STATUS_TRANSITIONS.includes(status)) {
      throw new AppError(
        `HR không được phép gán trạng thái "${status}" theo nghiệp vụ hệ thống`,
        400,
        'STATUS_TRANSITION_FORBIDDEN'
      );
    }

    const application = await prisma.application.findUnique({
      where: { id: applicationId }
    });

    if (!application) {
      throw new AppError('Đơn ứng tuyển không tồn tại', 404, 'NOT_FOUND');
    }

    // Không cho phép thay đổi đơn đã HIRED hoặc WITHDRAWN
    if (application.status === ApplicationStatus.HIRED || application.status === ApplicationStatus.WITHDRAWN) {
      throw new AppError(
        `Không thể thay đổi trạng thái đơn đã ở "${application.status}"`,
        400,
        'STATUS_TRANSITION_NOT_ALLOWED'
      );
    }

    const updated = await prisma.application.update({
      where: { id: applicationId },
      data: { status }
    });

    return {
      applicationId: updated.id,
      status: updated.status,
      updatedAt: updated.updatedAt
    };
  }

  // ============================================================================
  // AI Hook: Trigger phân tích AI ngầm (non-blocking background task)
  // ============================================================================
  private async triggerAiAnalysisBackground(
    applicationId: string,
    candidateProfile: { cvFileUrl: string | null },
    job: { title: string; description: string; requirements: string | null }
  ) {
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    const cvPath = candidateProfile.cvFileUrl
      ? path.join(process.cwd(), candidateProfile.cvFileUrl)
      : null;

    if (!cvPath || !fs.existsSync(cvPath)) {
      console.log(`[AI Hook] Bỏ qua: CV vật lý không tồn tại tại ${cvPath}`);
      return;
    }

    console.log(`[AI Hook] Kích hoạt phân tích AI ngầm cho application ${applicationId}...`);

    const fileContent = fs.readFileSync(cvPath);
    const boundary = `---ATS_BOUNDARY_${Date.now()}`;
    const filename = path.basename(cvPath);
    const ext = path.extname(filename).toLowerCase();
    const mimeType = ext === '.pdf' ? 'application/pdf'
      : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    // Xây dựng FormData thủ công theo chuẩn multipart/form-data
    const parts: Buffer[] = [];

    const addField = (name: string, value: string) => {
      parts.push(Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`
      ));
    };

    addField('jd_text', `${job.title}\n\n${job.description}\n\n${job.requirements || ''}`);
    addField('skill_weight', '0.5');
    addField('exp_weight', '0.3');
    addField('semantic_weight', '0.2');

    parts.push(Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="cv_file"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`
    ));
    parts.push(fileContent);
    parts.push(Buffer.from(`\r\n--${boundary}--\r\n`));

    const body = Buffer.concat(parts);

    // Gọi AI Service qua HTTP nội bộ với timeout 30 giây
    await new Promise<void>((resolve) => {
      const urlObj = new URL(`${aiServiceUrl}/api/v1/analyze-cv`);
      const transport = urlObj.protocol === 'https:' ? https : http;

      const timeout = setTimeout(() => {
        console.warn(`[AI Hook] Timeout 30s cho application ${applicationId}, bỏ qua`);
        req.destroy();
        resolve();
      }, 30000);

      const req = transport.request(
        {
          hostname: urlObj.hostname,
          port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
          path: urlObj.pathname,
          method: 'POST',
          headers: {
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
            'Content-Length': body.length
          }
        },
        async (res) => {
          clearTimeout(timeout);
          let rawData = '';
          res.on('data', chunk => rawData += chunk);
          res.on('end', async () => {
            try {
              const result = JSON.parse(rawData);
              if (res.statusCode === 200) {
                await prisma.application.update({
                  where: { id: applicationId },
                  data: {
                    aiMatchScore: typeof result.match_score === 'number'
                      ? Math.round(result.match_score * 100) / 100
                      : null,
                    parsedSkills: Array.isArray(result.parsed_skills) ? result.parsed_skills : undefined,
                    aiAnalysisSummary: typeof result.summary === 'string' ? result.summary : undefined,
                    status: ApplicationStatus.SCREENING
                  }
                });
                console.log(`[AI Hook] Đã lưu kết quả AI cho application ${applicationId}: score=${result.match_score}`);
              } else {
                console.warn(`[AI Hook] AI Service trả HTTP ${res.statusCode} cho application ${applicationId}`);
              }
            } catch (parseErr) {
              console.warn(`[AI Hook] Không parse được response AI cho application ${applicationId}`);
            }
            resolve();
          });
        }
      );

      req.on('error', (err) => {
        clearTimeout(timeout);
        console.warn(`[AI Hook] Lỗi kết nối AI Service cho application ${applicationId}:`, err.message);
        resolve();
      });

      req.write(body);
      req.end();
    });
  }

  /**
   * Hàm tiện ích xóa an toàn tệp tin trên ổ đĩa
   */
  private safeDeletePhysicalFile(filePath: string) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (err) {
      console.warn(`[ApplicationService] Không thể xóa tệp vật lý tại ${filePath}:`, err);
    }
  }
}

export default new ApplicationService();

