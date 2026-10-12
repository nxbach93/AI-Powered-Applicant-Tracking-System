import path from 'path';
import fs from 'fs';
import prisma from '../lib/prisma';
import applicationService, { AppError } from '../services/application.service';
import { UserRole } from '@prisma/client';

const green = (text: string) => `\x1b[32m✔ ${text}\x1b[0m`;
const red = (text: string) => `\x1b[31m✖ ${text}\x1b[0m`;
const cyan = (text: string) => `\x1b[36mℹ ${text}\x1b[0m`;

async function runCvUploadTests() {
  console.log(cyan('BẮT ĐẦU KIỂM THỬ: MODULE CANDIDATE CV UPLOAD & STORAGE (PHASE 1)\n'));
  let passed = 0;
  let failed = 0;

  // Dọn dẹp dữ liệu test cũ nếu có
  const testCandidateEmail = 'test_candidate_cv@example.com';
  const testHrEmail = 'test_hr_cv@example.com';

  await prisma.user.deleteMany({
    where: {
      email: { in: [testCandidateEmail, testHrEmail] }
    }
  });

  // Tạo mock users cho việc test
  const candidateUser = await prisma.user.create({
    data: {
      email: testCandidateEmail,
      password: 'HashedPassword123@',
      firstName: 'Nguyễn',
      lastName: 'Ứng Viên',
      role: UserRole.CANDIDATE,
      isActive: true,
      candidateProfile: {
        create: {
          phone: '0987654321',
          education: 'Đại học Bách Khoa'
        }
      }
    },
    include: { candidateProfile: true }
  });

  const hrUser = await prisma.user.create({
    data: {
      email: testHrEmail,
      password: 'HashedPassword123@',
      firstName: 'Trần',
      lastName: 'Tuyển Dụng',
      role: UserRole.HR,
      isActive: true
    }
  });

  const uploadDir = path.join(process.cwd(), 'uploads', 'cv');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  // -------------------------------------------------------------------------
  // Test Case 1: Tải lên không có tệp tin (undefined) -> Báo lỗi 400
  // -------------------------------------------------------------------------
  try {
    await applicationService.uploadCv(candidateUser.id, undefined);
    console.log(red('Test 1 Thất bại: Không chặn khi thiếu tệp tin CV'));
    failed++;
  } catch (err: any) {
    if (err instanceof AppError && err.statusCode === 400 && err.code === 'VALIDATION_ERROR') {
      console.log(green('Test 1 Thành công: Chặn đúng khi thiếu file tải lên (400 VALIDATION_ERROR)'));
      passed++;
    } else {
      console.log(red(`Test 1 Thất bại: Lỗi không đúng mong đợi: ${err.message}`));
      failed++;
    }
  }

  // -------------------------------------------------------------------------
  // Test Case 2: User không phải CANDIDATE (Role: HR) -> Chặn 403 FORBIDDEN
  // -------------------------------------------------------------------------
  const dummyFile1: Express.Multer.File = {
    fieldname: 'cvFile',
    originalname: 'my_resume.pdf',
    encoding: '7bit',
    mimetype: 'application/pdf',
    size: 1024 * 50,
    destination: uploadDir,
    filename: `test_hr_${Date.now()}.pdf`,
    path: path.join(uploadDir, `test_hr_${Date.now()}.pdf`),
    buffer: Buffer.from('dummy pdf'),
    stream: null as any
  };
  fs.writeFileSync(dummyFile1.path, 'dummy content for hr');

  try {
    await applicationService.uploadCv(hrUser.id, dummyFile1);
    console.log(red('Test 2 Thất bại: Đáng lẽ phải chặn HR tải lên CV'));
    failed++;
  } catch (err: any) {
    if (err instanceof AppError && err.statusCode === 403 && err.code === 'FORBIDDEN') {
      console.log(green('Test 2 Thành công: Phân quyền chặn đúng role HR tải CV ứng viên (403 FORBIDDEN)'));
      passed++;
    } else {
      console.log(red(`Test 2 Thất bại: ${err.message}`));
      failed++;
    }
  }

  // -------------------------------------------------------------------------
  // Test Case 3: Ứng viên tải lên tệp CV hợp lệ (.pdf)
  // -------------------------------------------------------------------------
  const testFileName1 = `cv_${candidateUser.id}_${Date.now()}.pdf`;
  const testFilePath1 = path.join(uploadDir, testFileName1);
  fs.writeFileSync(testFilePath1, '%PDF-1.4 dummy valid resume content');

  const dummyFile2: Express.Multer.File = {
    fieldname: 'cvFile',
    originalname: 'NguyenVanAn_CV.pdf',
    encoding: '7bit',
    mimetype: 'application/pdf',
    size: 1024 * 120,
    destination: uploadDir,
    filename: testFileName1,
    path: testFilePath1,
    buffer: Buffer.from('%PDF-1.4 dummy valid resume content'),
    stream: null as any
  };

  try {
    const uploadResult = await applicationService.uploadCv(candidateUser.id, dummyFile2);
    if (
      uploadResult.cvFileUrl === `/uploads/cv/${testFileName1}` &&
      fs.existsSync(testFilePath1)
    ) {
      console.log(green('Test 3 Thành công: Lưu trữ tệp và cập nhật CandidateProfile.cvFileUrl'));
      passed++;
    } else {
      console.log(red('Test 3 Thất bại: Đường dẫn CV hoặc file vật lý không khớp'));
      failed++;
    }
  } catch (err: any) {
    console.log(red(`Test 3 Thất bại: Ngoại lệ không mong đợi: ${err.message}`));
    failed++;
  }

  // -------------------------------------------------------------------------
  // Test Case 4: Lấy thông tin CV của ứng viên (getMyCv)
  // -------------------------------------------------------------------------
  try {
    const myCv = await applicationService.getMyCv(candidateUser.id);
    if (myCv.hasCv && myCv.cvFileUrl === `/uploads/cv/${testFileName1}`) {
      console.log(green('Test 4 Thành công: getMyCv trả về đúng thông tin tệp đã tải'));
      passed++;
    } else {
      console.log(red('Test 4 Thất bại: Dữ liệu getMyCv không khớp'));
      failed++;
    }
  } catch (err: any) {
    console.log(red(`Test 4 Thất bại: ${err.message}`));
    failed++;
  }

  // -------------------------------------------------------------------------
  // Test Case 5: Tải đè CV mới -> Tự động dọn dẹp tệp cũ trên ổ đĩa
  // -------------------------------------------------------------------------
  const testFileName2 = `cv_${candidateUser.id}_${Date.now()}_v2.docx`;
  const testFilePath2 = path.join(uploadDir, testFileName2);
  fs.writeFileSync(testFilePath2, 'PK dummy docx resume content');

  const dummyFile3: Express.Multer.File = {
    fieldname: 'cvFile',
    originalname: 'NguyenVanAn_CV_v2.docx',
    encoding: '7bit',
    mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    size: 1024 * 80,
    destination: uploadDir,
    filename: testFileName2,
    path: testFilePath2,
    buffer: Buffer.from('PK dummy docx resume content'),
    stream: null as any
  };

  try {
    const updateResult = await applicationService.uploadCv(candidateUser.id, dummyFile3);
    const oldFileStillExists = fs.existsSync(testFilePath1);
    const newFileExists = fs.existsSync(testFilePath2);

    if (
      updateResult.cvFileUrl === `/uploads/cv/${testFileName2}` &&
      !oldFileStillExists &&
      newFileExists
    ) {
      console.log(green('Test 5 Thành công: Tải CV mới tự động dọn dẹp file cũ trên ổ đĩa'));
      passed++;
    } else {
      console.log(red(`Test 5 Thất bại: File cũ vẫn còn (${oldFileStillExists}) hoặc file mới thiếu (${newFileExists})`));
      failed++;
    }
  } catch (err: any) {
    console.log(red(`Test 5 Thất bại: ${err.message}`));
    failed++;
  }

  // -------------------------------------------------------------------------
  // Test Case 6: Xóa tệp CV (deleteMyCv)
  // -------------------------------------------------------------------------
  try {
    await applicationService.deleteMyCv(candidateUser.id);
    const afterDelete = await applicationService.getMyCv(candidateUser.id);
    const physicalDeleted = !fs.existsSync(testFilePath2);

    if (!afterDelete.hasCv && afterDelete.cvFileUrl === null && physicalDeleted) {
      console.log(green('Test 6 Thành công: Xóa CV thành công trong DB và dọn sạch file vật lý'));
      passed++;
    } else {
      console.log(red('Test 6 Thất bại: Chưa xóa triệt để DB hoặc file vật lý'));
      failed++;
    }
  } catch (err: any) {
    console.log(red(`Test 6 Thất bại: ${err.message}`));
    failed++;
  }

  // -------------------------------------------------------------------------
  // Test Case 7: Xóa CV khi chưa có file -> Báo lỗi 404 NOT_FOUND
  // -------------------------------------------------------------------------
  try {
    await applicationService.deleteMyCv(candidateUser.id);
    console.log(red('Test 7 Thất bại: Đáng lẽ phải báo 404 khi không có CV để xóa'));
    failed++;
  } catch (err: any) {
    if (err instanceof AppError && err.statusCode === 404) {
      console.log(green('Test 7 Thành công: Báo lỗi đúng 404 khi xóa CV rỗng'));
      passed++;
    } else {
      console.log(red(`Test 7 Thất bại: ${err.message}`));
      failed++;
    }
  }

  // Dọn dẹp dữ liệu test
  await prisma.user.deleteMany({
    where: {
      email: { in: [testCandidateEmail, testHrEmail] }
    }
  });

  console.log(`\n--------------------------------------------`);
  console.log(`KẾT QUẢ TEST PHASE 1: ${passed} PASSED, ${failed} FAILED`);
  console.log(`--------------------------------------------\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runCvUploadTests().catch((e) => {
  console.error('Lỗi khi chạy bộ test:', e);
  process.exit(1);
});
