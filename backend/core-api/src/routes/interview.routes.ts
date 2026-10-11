import { Router } from 'express';
import { UserRole } from '@prisma/client';
import interviewController from '../controllers/interview.controller';
import { authenticateJWT, authorizeRoles } from '../middlewares/auth.middleware';

const router = Router();

// ============================================================================
// Tuyến đường phỏng vấn và quy trình tuyển dụng (TV5 - Interviews & Workflow)
// ============================================================================

// 1. Tuyến đường lấy dữ liệu bổ trợ (Metadata / Kanban)
router.get(
  '/meta/interviewers',
  authenticateJWT,
  authorizeRoles(UserRole.HR, UserRole.ADMIN),
  (req, res) => interviewController.getInterviewers(req, res)
);

router.get(
  '/workflow/kanban',
  authenticateJWT,
  authorizeRoles(UserRole.HR, UserRole.ADMIN),
  (req, res) => interviewController.getKanban(req, res)
);

router.patch(
  '/workflow/application/:applicationId/status',
  authenticateJWT,
  authorizeRoles(UserRole.HR, UserRole.ADMIN),
  (req, res) => interviewController.updateWorkflowStatus(req, res)
);

// 2. Tuyến đường nghiệp vụ Lịch phỏng vấn
// Tạo lịch phỏng vấn mới (INT-03)
router.post(
  '/',
  authenticateJWT,
  authorizeRoles(UserRole.HR, UserRole.ADMIN),
  (req, res) => interviewController.create(req, res)
);

// Lấy danh sách lịch phỏng vấn (INT-05)
// Candidate chỉ xem lịch của chính mình, HR/Admin xem toàn bộ
router.get(
  '/',
  authenticateJWT,
  (req, res) => interviewController.getAll(req, res)
);

// Chi tiết buổi phỏng vấn (INT-05)
router.get(
  '/:id',
  authenticateJWT,
  (req, res) => interviewController.getById(req, res)
);

// Cập nhật thông tin lịch phỏng vấn (INT-04)
router.patch(
  '/:id',
  authenticateJWT,
  authorizeRoles(UserRole.HR, UserRole.ADMIN),
  (req, res) => interviewController.update(req, res)
);

// Hủy lịch phỏng vấn (INT-04)
router.patch(
  '/:id/cancel',
  authenticateJWT,
  authorizeRoles(UserRole.HR, UserRole.ADMIN),
  (req, res) => interviewController.cancel(req, res)
);

// Ghi nhận đánh giá / kết quả phỏng vấn (INT-06)
router.patch(
  '/:id/feedback',
  authenticateJWT,
  authorizeRoles(UserRole.HR, UserRole.ADMIN),
  (req, res) => interviewController.submitFeedback(req, res)
);

export default router;
