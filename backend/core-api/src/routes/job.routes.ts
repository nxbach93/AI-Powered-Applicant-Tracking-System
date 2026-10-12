import { Router } from 'express';
import { UserRole } from '@prisma/client';
import jobController from '../controllers/job.controller';
import { authenticateJWT, authorizeRoles } from '../middlewares/auth.middleware';

const router = Router();

// ============================================================================
// 1. PUBLIC ROUTES (Khách vãng lai & Ứng viên)
// ============================================================================

/**
 * GET /api/jobs
 * Xem danh sách việc làm (Public: xem các tin tuyển dụng đang mở PUBLISHED)
 */
router.get('/', (req, res) => jobController.getJobs(req, res));

/**
 * GET /api/jobs/hr/my-jobs
 * Dành riêng cho HR lấy danh sách các tin tuyển dụng do chính mình tạo
 * (Khai báo trước /:id để tránh xung đột routing)
 */
router.get(
  '/hr/my-jobs',
  authenticateJWT,
  authorizeRoles(UserRole.HR, UserRole.ADMIN),
  (req, res) => jobController.getMyJobs(req, res)
);

/**
 * GET /api/jobs/:id
 * Xem chi tiết bản mô tả công việc (Public: chỉ xem được PUBLISHED)
 */
router.get('/:id', (req, res) => jobController.getJobById(req, res));

// ============================================================================
// 2. PROTECTED ROUTES (Chỉ HR & ADMIN)
// ============================================================================

/**
 * POST /api/jobs
 * Tạo tin tuyển dụng mới
 */
router.post(
  '/',
  authenticateJWT,
  authorizeRoles(UserRole.HR, UserRole.ADMIN),
  (req, res) => jobController.createJob(req, res)
);

/**
 * PUT /api/jobs/:id
 * Cập nhật thông tin tin tuyển dụng (Row-Level Security: HR chủ sở hữu hoặc ADMIN)
 */
router.put(
  '/:id',
  authenticateJWT,
  authorizeRoles(UserRole.HR, UserRole.ADMIN),
  (req, res) => jobController.updateJob(req, res)
);

/**
 * PATCH /api/jobs/:id/status
 * Đổi trạng thái tin tuyển dụng: DRAFT | PUBLISHED | CLOSED | ARCHIVED
 */
router.patch(
  '/:id/status',
  authenticateJWT,
  authorizeRoles(UserRole.HR, UserRole.ADMIN),
  (req, res) => jobController.updateJobStatus(req, res)
);

/**
 * DELETE /api/jobs/:id
 * Xóa tin tuyển dụng (Safe Delete: Chỉ xóa khi chưa có hồ sơ ứng tuyển)
 */
router.delete(
  '/:id',
  authenticateJWT,
  authorizeRoles(UserRole.HR, UserRole.ADMIN),
  (req, res) => jobController.deleteJob(req, res)
);

export default router;
