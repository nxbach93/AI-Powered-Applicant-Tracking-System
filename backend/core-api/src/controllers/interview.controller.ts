import { Request, Response } from 'express';
import interviewService, {
  ValidationError,
  NotFoundError,
  ForbiddenError,
  ConflictError
} from '../services/interview.service';

export class InterviewController {
  private getParam(param: string | string[] | undefined): string {
    if (Array.isArray(param)) return param[0];
    return param || '';
  }

  /**
   * POST /api/interviews
   * Tạo lịch phỏng vấn mới (INT-03)
   */
  async create(req: Request, res: Response) {
    try {
      const currentUserId = req.user!.id;
      const interview = await interviewService.createInterview(req.body, currentUserId);

      return res.status(201).json({
        success: true,
        message: 'Lên lịch phỏng vấn thành công',
        data: interview
      });
    } catch (error: any) {
      return this.handleError(res, error, 'Lỗi khi tạo lịch phỏng vấn');
    }
  }

  /**
   * GET /api/interviews
   * Lấy danh sách lịch phỏng vấn (INT-05)
   */
  async getAll(req: Request, res: Response) {
    try {
      const { status, applicationId, interviewerId, from, to, page, limit } = req.query;
      const user = req.user!;

      const result = await interviewService.getInterviews(
        {
          status: status as any,
          applicationId: applicationId as string,
          interviewerId: interviewerId as string,
          from: from as string,
          to: to as string,
          page: page ? Number(page) : undefined,
          limit: limit ? Number(limit) : undefined
        },
        user.id,
        user.role
      );

      return res.status(200).json({
        success: true,
        message: 'Lấy danh sách lịch phỏng vấn thành công',
        data: result.items,
        meta: result.pagination
      });
    } catch (error: any) {
      return this.handleError(res, error, 'Lỗi khi lấy danh sách phỏng vấn');
    }
  }

  /**
   * GET /api/interviews/:id
   * Chi tiết buổi phỏng vấn (INT-05)
   */
  async getById(req: Request, res: Response) {
    try {
      const id = this.getParam(req.params.id);
      const user = req.user!;

      const interview = await interviewService.getInterviewById(id, user.id, user.role);

      return res.status(200).json({
        success: true,
        message: 'Lấy thông tin buổi phỏng vấn thành công',
        data: interview
      });
    } catch (error: any) {
      return this.handleError(res, error, 'Lỗi khi lấy chi tiết phỏng vấn');
    }
  }

  /**
   * PATCH /api/interviews/:id
   * Cập nhật thông tin lịch phỏng vấn (INT-04)
   */
  async update(req: Request, res: Response) {
    try {
      const id = this.getParam(req.params.id);
      const updated = await interviewService.updateInterview(id, req.body);

      return res.status(200).json({
        success: true,
        message: 'Cập nhật lịch phỏng vấn thành công',
        data: updated
      });
    } catch (error: any) {
      return this.handleError(res, error, 'Lỗi khi cập nhật lịch phỏng vấn');
    }
  }

  /**
   * PATCH /api/interviews/:id/cancel
   * Hủy lịch phỏng vấn (INT-04)
   */
  async cancel(req: Request, res: Response) {
    try {
      const id = this.getParam(req.params.id);
      const { reason } = req.body;
      const cancelled = await interviewService.cancelInterview(id, reason);

      return res.status(200).json({
        success: true,
        message: 'Hủy lịch phỏng vấn thành công',
        data: cancelled
      });
    } catch (error: any) {
      return this.handleError(res, error, 'Lỗi khi hủy lịch phỏng vấn');
    }
  }

  /**
   * PATCH /api/interviews/:id/feedback
   * Ghi nhận đánh giá kết quả phỏng vấn (INT-06)
   */
  async submitFeedback(req: Request, res: Response) {
    try {
      const id = this.getParam(req.params.id);
      const result = await interviewService.submitFeedback(id, req.body);

      return res.status(200).json({
        success: true,
        message: 'Ghi nhận kết quả phỏng vấn thành công',
        data: result
      });
    } catch (error: any) {
      return this.handleError(res, error, 'Lỗi khi ghi nhận đánh giá phỏng vấn');
    }
  }

  /**
   * PATCH /api/interviews/workflow/application/:applicationId/status
   * Cập nhật trạng thái tiến trình tuyển dụng (INT-07)
   */
  async updateWorkflowStatus(req: Request, res: Response) {
    try {
      const applicationId = this.getParam(req.params.applicationId);
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Trạng thái chuyển tiếp (status) là bắt buộc'
          }
        });
      }

      const updated = await interviewService.updateApplicationWorkflowStatus(applicationId, status);

      return res.status(200).json({
        success: true,
        message: 'Cập nhật trạng thái tiến trình tuyển dụng thành công',
        data: updated
      });
    } catch (error: any) {
      return this.handleError(res, error, 'Lỗi khi cập nhật trạng thái tiến trình tuyển dụng');
    }
  }

  /**
   * GET /api/interviews/workflow/kanban
   * Lấy dữ liệu Kanban Pipeline (INT-07, INT-08)
   */
  async getKanban(req: Request, res: Response) {
    try {
      const { jobPostingId } = req.query;
      const kanban = await interviewService.getWorkflowKanban(jobPostingId as string);

      return res.status(200).json({
        success: true,
        message: 'Lấy dữ liệu Kanban thành công',
        data: kanban
      });
    } catch (error: any) {
      return this.handleError(res, error, 'Lỗi khi lấy dữ liệu Kanban');
    }
  }

  /**
   * GET /api/interviews/meta/interviewers
   * Danh sách người phỏng vấn khả dụng
   */
  async getInterviewers(req: Request, res: Response) {
    try {
      const interviewers = await interviewService.getAvailableInterviewers();

      return res.status(200).json({
        success: true,
        message: 'Lấy danh sách người phỏng vấn thành công',
        data: interviewers
      });
    } catch (error: any) {
      return this.handleError(res, error, 'Lỗi khi lấy danh sách người phỏng vấn');
    }
  }

  /**
   * Helper xử lý lỗi chuẩn hóa toàn bộ Controller
   */
  private handleError(res: Response, error: any, defaultMessage: string) {
    if (error instanceof ValidationError) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.message,
          details: error.details
        }
      });
    }

    if (error instanceof NotFoundError) {
      return res.status(404).json({
        success: false,
        error: {
          code: error.code || 'NOT_FOUND',
          message: error.message
        }
      });
    }

    if (error instanceof ForbiddenError) {
      return res.status(403).json({
        success: false,
        error: {
          code: error.code || 'FORBIDDEN',
          message: error.message
        }
      });
    }

    if (error instanceof ConflictError) {
      return res.status(409).json({
        success: false,
        error: {
          code: error.code || 'CONFLICT',
          message: error.message
        }
      });
    }

    console.error(defaultMessage, error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: defaultMessage
      }
    });
  }
}

export default new InterviewController();
