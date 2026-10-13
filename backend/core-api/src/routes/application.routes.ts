import { Router } from 'express';
import { UserRole } from '@prisma/client';
import applicationController from '../controllers/application.controller';
import { authenticateJWT, authorizeRoles } from '../middlewares/auth.middleware';
import { uploadCvSingle } from '../middlewares/upload.middleware';

const router = Router();

// ============================================================================
// PHASE 1: CANDIDATE CV MANAGEMENT (APP-02, APP-03)
// ============================================================================

// POST /api/applications/upload-cv — Tải lên tệp CV cho ứng viên (standalone)
router.post(
  '/upload-cv',
  authenticateJWT,
  authorizeRoles(UserRole.CANDIDATE),
  uploadCvSingle('cvFile'),
  (req, res) => applicationController.uploadCv(req, res)
);

// GET /api/applications/cv — Lấy thông tin tệp CV hiện tại của ứng viên
router.get(
  '/cv',
  authenticateJWT,
  authorizeRoles(UserRole.CANDIDATE),
  (req, res) => applicationController.getMyCv(req, res)
);

// DELETE /api/applications/cv — Xóa tệp CV
router.delete(
  '/cv',
  authenticateJWT,
  authorizeRoles(UserRole.CANDIDATE),
  (req, res) => applicationController.deleteMyCv(req, res)
);

// ============================================================================
// PHASE 2: APPLICATION SUBMISSION (APP-04, APP-05)
// ============================================================================

// POST /api/applications — Nộp đơn ứng tuyển (kèm CV tùy chọn)
// Phải đặt TRƯỚC route GET /:id để tránh xung đột pattern
router.post(
  '/',
  authenticateJWT,
  authorizeRoles(UserRole.CANDIDATE),
  uploadCvSingle('cvFile'),
  (req, res) => applicationController.submitApplication(req, res)
);

// ============================================================================
// PHASE 2: CANDIDATE HISTORY & WITHDRAWAL (APP-06)
// ============================================================================

// GET /api/applications/my-applications — Lịch sử ứng tuyển của ứng viên
// Đặt TRƯỚC route /:id để Express khớp đúng pattern cụ thể trước
router.get(
  '/my-applications',
  authenticateJWT,
  authorizeRoles(UserRole.CANDIDATE),
  (req, res) => applicationController.getMyApplications(req, res)
);

// GET /api/applications/:id — Chi tiết 1 đơn của ứng viên (xem đơn của chính mình)
router.get(
  '/:id',
  authenticateJWT,
  authorizeRoles(UserRole.CANDIDATE),
  (req, res) => applicationController.getMyApplicationById(req, res)
);

// PUT /api/applications/:id/withdraw — Rút đơn ứng tuyển
router.put(
  '/:id/withdraw',
  authenticateJWT,
  authorizeRoles(UserRole.CANDIDATE),
  (req, res) => applicationController.withdrawApplication(req, res)
);

// ============================================================================
// PHASE 2 & 4: HR ENDPOINTS (APP-07, APP-09)
// ============================================================================

// GET /api/applications/hr/jobs — Lấy tổng hợp các Job cùng số lượng ứng tuyển cho HR
router.get(
  '/hr/jobs',
  authenticateJWT,
  authorizeRoles(UserRole.HR, UserRole.ADMIN),
  (req, res) => applicationController.getHrJobsOverview(req, res)
);

// GET /api/applications/hr/dashboard-stats — Lấy số liệu tổng quan Dashboard cho HR
router.get(
  '/hr/dashboard-stats',
  authenticateJWT,
  authorizeRoles(UserRole.HR, UserRole.ADMIN),
  (req, res) => applicationController.getDashboardStats(req, res)
);

// GET /api/applications/job/:jobId — HR xem danh sách ứng viên theo tin (hoặc jobId='all')
router.get(
  '/job/:jobId',
  authenticateJWT,
  authorizeRoles(UserRole.HR, UserRole.ADMIN),
  (req, res) => applicationController.getApplicationsByJob(req, res)
);

// POST /api/applications/batch-rescreen — HR sàng lọc AI hàng loạt cho danh sách hồ sơ
router.post(
  '/batch-rescreen',
  authenticateJWT,
  authorizeRoles(UserRole.HR, UserRole.ADMIN),
  (req, res) => applicationController.batchRescreenApplications(req, res)
);

// POST /api/applications/bulk-email — HR gửi email hàng loạt tới ứng viên được chọn
router.post(
  '/bulk-email',
  authenticateJWT,
  authorizeRoles(UserRole.HR, UserRole.ADMIN),
  (req, res) => applicationController.bulkSendEmail(req, res)
);

// GET /api/applications/:id/detail — HR xem chi tiết toàn bộ hồ sơ 1 ứng viên
router.get(
  '/:id/detail',
  authenticateJWT,
  authorizeRoles(UserRole.HR, UserRole.ADMIN),
  (req, res) => applicationController.getApplicationDetailForHr(req, res)
);

// PATCH /api/applications/:id/status — HR cập nhật trạng thái hồ sơ
router.patch(
  '/:id/status',
  authenticateJWT,
  authorizeRoles(UserRole.HR, UserRole.ADMIN),
  (req, res) => applicationController.updateApplicationStatus(req, res)
);

// POST /api/applications/:id/rescreen — HR đánh giá lại AI cho 1 hồ sơ
router.post(
  '/:id/rescreen',
  authenticateJWT,
  authorizeRoles(UserRole.HR, UserRole.ADMIN),
  (req, res) => applicationController.rescreenApplication(req, res)
);

export default router;
