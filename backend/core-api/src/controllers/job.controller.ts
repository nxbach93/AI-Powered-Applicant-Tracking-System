import { Request, Response } from 'express';
import jobService, {
  ValidationError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
} from '../services/job.service';

export class JobController {
  /**
   * Helper xử lý lỗi tập trung theo đúng chuẩn JSON Envelope
   */
  private handleError(res: Response, error: any, defaultMessage: string) {
    if (error instanceof ValidationError) {
      return res.status(400).json({
        success: false,
        error: {
          code: error.code || 'VALIDATION_ERROR',
          message: error.message,
          details: error.details,
        },
      });
    }

    if (error instanceof NotFoundError) {
      return res.status(404).json({
        success: false,
        error: {
          code: error.code || 'NOT_FOUND',
          message: error.message,
        },
      });
    }

    if (error instanceof ForbiddenError) {
      return res.status(403).json({
        success: false,
        error: {
          code: error.code || 'FORBIDDEN',
          message: error.message,
        },
      });
    }

    if (error instanceof ConflictError) {
      return res.status(409).json({
        success: false,
        error: {
          code: error.code || 'CONFLICT',
          message: error.message,
        },
      });
    }

    console.error(`[JobController] Unexpected error:`, error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: defaultMessage || 'Đã xảy ra lỗi máy chủ nội bộ khi xử lý tin tuyển dụng',
      },
    });
  }

  /**
   * GET /api/jobs
   * Lấy danh sách tin tuyển dụng có phân trang và bộ lọc
   */
  async getJobs(req: Request, res: Response) {
    try {
      const result = await jobService.getJobs(req.query, req.user);
      return res.status(200).json({
        success: true,
        data: result.jobs,
        meta: result.meta,
      });
    } catch (error: any) {
      return this.handleError(res, error, 'Lỗi khi truy vấn danh sách tin tuyển dụng');
    }
  }

  /**
   * GET /api/jobs/hr/my-jobs
   * HR lấy danh sách các tin do chính mình đăng tuyển
   */
  async getMyJobs(req: Request, res: Response) {
    try {
      const queryWithMyJobs = {
        ...req.query,
        myJobs: true,
      };
      const result = await jobService.getJobs(queryWithMyJobs, req.user);
      return res.status(200).json({
        success: true,
        data: result.jobs,
        meta: result.meta,
      });
    } catch (error: any) {
      return this.handleError(res, error, 'Lỗi khi truy vấn danh sách tin tuyển dụng của bạn');
    }
  }

  /**
   * GET /api/jobs/:id
   * Xem chi tiết 1 tin tuyển dụng
   */
  async getJobById(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const job = await jobService.getJobById(id, req.user);
      return res.status(200).json({
        success: true,
        data: job,
      });
    } catch (error: any) {
      return this.handleError(res, error, 'Lỗi khi xem chi tiết tin tuyển dụng');
    }
  }

  /**
   * POST /api/jobs
   * Tạo tin tuyển dụng mới (HR hoặc ADMIN)
   */
  async createJob(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Yêu cầu đăng nhập để thực hiện chức năng này',
          },
        });
      }

      const job = await jobService.createJob(req.user.id, req.body);
      return res.status(201).json({
        success: true,
        message: 'Tạo tin tuyển dụng thành công',
        data: job,
      });
    } catch (error: any) {
      return this.handleError(res, error, 'Lỗi khi tạo tin tuyển dụng');
    }
  }

  /**
   * PUT /api/jobs/:id
   * Cập nhật thông tin tin tuyển dụng (HR Owner hoặc ADMIN)
   */
  async updateJob(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Yêu cầu đăng nhập để thực hiện chức năng này',
          },
        });
      }

      const id = String(req.params.id);
      const updatedJob = await jobService.updateJob(id, req.user.id, req.user.role, req.body);
      return res.status(200).json({
        success: true,
        message: 'Cập nhật tin tuyển dụng thành công',
        data: updatedJob,
      });
    } catch (error: any) {
      return this.handleError(res, error, 'Lỗi khi cập nhật tin tuyển dụng');
    }
  }

  /**
   * PATCH /api/jobs/:id/status
   * Cập nhật trạng thái tin tuyển dụng (HR Owner hoặc ADMIN)
   */
  async updateJobStatus(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Yêu cầu đăng nhập để thực hiện chức năng này',
          },
        });
      }

      const id = String(req.params.id);
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Thiếu trường status trong request body',
            details: [{ field: 'status', message: 'Trạng thái là bắt buộc' }],
          },
        });
      }

      const updatedJob = await jobService.updateJobStatus(id, req.user.id, req.user.role, status);
      return res.status(200).json({
        success: true,
        message: 'Cập nhật trạng thái tin tuyển dụng thành công',
        data: updatedJob,
      });
    } catch (error: any) {
      return this.handleError(res, error, 'Lỗi khi cập nhật trạng thái tin tuyển dụng');
    }
  }

  /**
   * DELETE /api/jobs/:id
   * Xóa tin tuyển dụng (HR Owner hoặc ADMIN, an toàn dữ liệu)
   */
  async deleteJob(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Yêu cầu đăng nhập để thực hiện chức năng này',
          },
        });
      }

      const id = String(req.params.id);
      const result = await jobService.deleteJob(id, req.user.id, req.user.role);
      return res.status(200).json({
        success: true,
        message: result.message,
        data: { id: result.id },
      });
    } catch (error: any) {
      return this.handleError(res, error, 'Lỗi khi xóa tin tuyển dụng');
    }
  }
}

export const jobController = new JobController();
export default jobController;
