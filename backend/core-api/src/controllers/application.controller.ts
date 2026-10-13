import { Request, Response } from 'express';
import applicationService, { AppError } from '../services/application.service';

/**
 * Hàm helper chuẩn hóa gửi lỗi AppError ra HTTP response
 */
function handleError(res: Response, error: unknown) {
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        ...(error.details ? { details: error.details } : {})
      }
    });
  }
  console.error('[ApplicationController] Lỗi hệ thống:', error);
  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Đã có lỗi xảy ra tại máy chủ'
    }
  });
}

export class ApplicationController {
  // ============================================================================
  // PHASE 1: CV Management
  // ============================================================================

  /**
   * POST /api/applications/upload-cv
   * Ứng viên tải lên tệp CV cá nhân
   */
  async uploadCv(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Yêu cầu đăng nhập' } });

      const result = await applicationService.uploadCv(userId, req.file);
      return res.status(200).json({
        success: true,
        message: 'Tải lên và lưu trữ CV thành công',
        data: result
      });
    } catch (error) {
      return handleError(res, error);
    }
  }

  /**
   * GET /api/applications/cv
   * Lấy thông tin tệp CV hiện tại của ứng viên
   */
  async getMyCv(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Yêu cầu đăng nhập' } });

      const result = await applicationService.getMyCv(userId);
      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      return handleError(res, error);
    }
  }

  /**
   * DELETE /api/applications/cv
   * Xóa tệp CV hiện tại của ứng viên
   */
  async deleteMyCv(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Yêu cầu đăng nhập' } });

      const result = await applicationService.deleteMyCv(userId);
      return res.status(200).json({ success: true, message: result.message });
    } catch (error) {
      return handleError(res, error);
    }
  }

  // ============================================================================
  // PHASE 2: Application Submission & Management
  // ============================================================================

  /**
   * POST /api/applications
   * Ứng viên nộp đơn ứng tuyển (multipart/form-data)
   * Fields: jobPostingId (string), coverLetter (string, optional), cvFile (file, optional)
   */
  async submitApplication(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Yêu cầu đăng nhập' } });

      const { jobPostingId, coverLetter } = req.body;

      if (!jobPostingId || typeof jobPostingId !== 'string' || !jobPostingId.trim()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Thiếu thông tin tin tuyển dụng',
            details: [{ field: 'jobPostingId', message: 'Mã tin tuyển dụng (jobPostingId) là bắt buộc' }]
          }
        });
      }

      const result = await applicationService.submitApplication(
        userId,
        jobPostingId.trim(),
        coverLetter,
        req.file
      );

      return res.status(201).json({
        success: true,
        message: 'Nộp hồ sơ ứng tuyển thành công',
        data: result
      });
    } catch (error) {
      return handleError(res, error);
    }
  }

  /**
   * GET /api/applications/my-applications
   * Ứng viên xem danh sách các đơn đã nộp
   */
  async getMyApplications(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Yêu cầu đăng nhập' } });

      const data = await applicationService.getMyApplications(userId);
      return res.status(200).json({ success: true, data });
    } catch (error) {
      return handleError(res, error);
    }
  }

  /**
   * GET /api/applications/:id
   * Ứng viên xem chi tiết 1 đơn ứng tuyển của chính mình
   */
  async getMyApplicationById(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Yêu cầu đăng nhập' } });

      const id = req.params.id as string;
      const data = await applicationService.getMyApplicationById(userId, id);
      return res.status(200).json({ success: true, data });
    } catch (error) {
      return handleError(res, error);
    }
  }

  /**
   * PUT /api/applications/:id/withdraw
   * Ứng viên rút đơn ứng tuyển (chỉ được rút khi SUBMITTED hoặc SCREENING)
   */
  async withdrawApplication(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Yêu cầu đăng nhập' } });

      const id = req.params.id as string;
      const result = await applicationService.withdrawApplication(userId, id);
      return res.status(200).json({
        success: true,
        message: result.message,
        data: { applicationId: result.applicationId, status: result.status }
      });
    } catch (error) {
      return handleError(res, error);
    }
  }

  // ============================================================================
  // PHASE 2 & 4: HR Endpoints
  // ============================================================================

  /**
   * GET /api/applications/hr/jobs
   * Lấy danh sách tổng hợp Job và số lượng ứng viên cho HR
   */
  async getHrJobsOverview(req: Request, res: Response) {
    try {
      const data = await applicationService.getHrJobsOverview();
      return res.status(200).json({ success: true, data });
    } catch (error) {
      return handleError(res, error);
    }
  }

  /**
   * GET /api/applications/job/:jobId
   * HR xem danh sách ứng viên theo tin tuyển dụng
   * Query: status, sortBy, order, minScore, minExp, scoreTier, page, limit
   */
  async getApplicationsByJob(req: Request, res: Response) {
    try {
      const jobId = req.params.jobId as string;
      const { status, sortBy, order, minScore, minExp, scoreTier, page, limit, search, excludeStatuses } = req.query;

      const result = await applicationService.getApplicationsByJob(jobId, {
        status: status as string,
        sortBy: sortBy as string,
        order: order as string,
        minScore: minScore ? parseFloat(minScore as string) : undefined,
        minExp: minExp ? parseInt(minExp as string, 10) : undefined,
        scoreTier: scoreTier as string,
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 10,
        search: search as string,
        excludeStatuses: excludeStatuses as string,
      });

      return res.status(200).json({
        success: true,
        data: result.data,
        meta: result.meta
      });
    } catch (error) {
      return handleError(res, error);
    }
  }

  /**
   * GET /api/applications/:id/detail
   * HR xem toàn bộ thông tin chi tiết hồ sơ ứng viên
   */
  async getApplicationDetailForHr(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const data = await applicationService.getApplicationDetailForHr(id);
      return res.status(200).json({ success: true, data });
    } catch (error) {
      return handleError(res, error);
    }
  }

  /**
   * PATCH /api/applications/:id/status
   * HR cập nhật trạng thái hồ sơ ứng viên
   */
  async updateApplicationStatus(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const { status } = req.body;

      if (!status || typeof status !== 'string') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Thiếu trường status',
            details: [{ field: 'status', message: 'Trường status là bắt buộc' }]
          }
        });
      }

      const result = await applicationService.updateApplicationStatus(id, status.trim());
      return res.status(200).json({
        success: true,
        message: 'Cập nhật trạng thái hồ sơ thành công',
        data: result
      });
    } catch (error) {
      return handleError(res, error);
    }
  }

  /**
   * POST /api/applications/:id/rescreen
   * HR kích hoạt đánh giá lại AI cho 1 hồ sơ
   */
  async rescreenApplication(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const result = await applicationService.rescreenApplication(id);
      return res.status(200).json({
        success: true,
        message: 'Đã hoàn thành đánh giá lại AI cho hồ sơ',
        data: result
      });
    } catch (error) {
      return handleError(res, error);
    }
  }

  /**
   * POST /api/applications/batch-rescreen
   * HR sàng lọc AI hàng loạt cho danh sách hồ sơ được chọn
   */
  async batchRescreenApplications(req: Request, res: Response) {
    try {
      const { applicationIds } = req.body;
      if (!Array.isArray(applicationIds) || applicationIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Trường applicationIds phải là mảng không rỗng'
          }
        });
      }

      const result = await applicationService.batchRescreenApplications(applicationIds);
      return res.status(200).json({
        success: true,
        message: `Hoàn tất sàng lọc AI: ${result.successCount}/${result.total} thành công`,
        data: result
      });
    } catch (error) {
      return handleError(res, error);
    }
  }

  /**
   * POST /api/applications/bulk-email
   * HR gửi email hàng loạt tới các ứng viên được chọn
   */
  async bulkSendEmail(req: Request, res: Response) {
    try {
      const { applicationIds, subject, message } = req.body;
      if (!Array.isArray(applicationIds) || applicationIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Trường applicationIds phải là mảng không rỗng'
          }
        });
      }

      const result = await applicationService.bulkSendEmail(applicationIds, subject, message);
      return res.status(200).json({
        success: true,
        message: `Đã gửi email: ${result.sentCount}/${result.total} người nhận`,
        data: result
      });
    } catch (error) {
      return handleError(res, error);
    }
  }
}

export default new ApplicationController();
