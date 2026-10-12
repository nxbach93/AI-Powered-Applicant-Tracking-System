import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request, Response, NextFunction } from 'express';

// Đường dẫn lưu trữ tệp CV
const UPLOAD_BASE_DIR = path.join(process.cwd(), 'uploads', 'cv');

// Đảm bảo thư mục lưu trữ luôn tồn tại
if (!fs.existsSync(UPLOAD_BASE_DIR)) {
  fs.mkdirSync(UPLOAD_BASE_DIR, { recursive: true });
}

// Cấu hình lưu trữ tệp trên ổ đĩa (DiskStorage)
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_BASE_DIR);
  },
  filename: (req: Request, file, cb) => {
    const userId = req.user?.id || 'anon';
    const timestamp = Date.now();
    const ext = path.extname(file.originalname).toLowerCase();
    const safeFilename = `cv_${userId}_${timestamp}${ext}`;
    cb(null, safeFilename);
  }
});

// Bộ lọc định dạng tệp tin cho phép (.pdf, .docx)
const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedExtensions = ['.pdf', '.docx'];
  const ext = path.extname(file.originalname).toLowerCase();

  const allowedMimeTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword'
  ];

  if (!allowedExtensions.includes(ext) || !allowedMimeTypes.includes(file.mimetype)) {
    const error = new Error('UNSUPPORTED_MEDIA_TYPE');
    return cb(error as any, false);
  }

  cb(null, true);
};

// Khởi tạo multer instance với giới hạn 5MB
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 Megabytes
  },
  fileFilter
});

/**
 * Middleware bọc multer single upload với xử lý lỗi chuẩn API Contract
 * (HTTP 413 cho Payload Too Large, HTTP 415 cho Unsupported Media Type)
 */
export const uploadCvSingle = (fieldName: string = 'cvFile') => {
  const uploader = upload.single(fieldName);

  return (req: Request, res: Response, next: NextFunction): void => {
    uploader(req, res, (err: any) => {
      if (!err) {
        return next();
      }

      // Xử lý lỗi dung lượng vượt quá 5MB
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        res.status(413).json({
          success: false,
          error: {
            code: 'PAYLOAD_TOO_LARGE',
            message: 'Tệp CV tải lên vượt quá giới hạn cho phép (tối đa 5MB)'
          }
        });
        return;
      }

      // Xử lý lỗi sai định dạng tệp
      if (err.message === 'UNSUPPORTED_MEDIA_TYPE') {
        res.status(415).json({
          success: false,
          error: {
            code: 'UNSUPPORTED_MEDIA_TYPE',
            message: 'Tệp CV không hợp lệ. Hệ thống chỉ chấp nhận định dạng .pdf hoặc .docx'
          }
        });
        return;
      }

      // Các lỗi upload khác
      res.status(400).json({
        success: false,
        error: {
          code: 'UPLOAD_ERROR',
          message: err.message || 'Lỗi trong quá trình tải tệp tin lên máy chủ'
        }
      });
    });
  };
};

export default upload;
