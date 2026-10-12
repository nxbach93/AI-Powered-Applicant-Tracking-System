import dotenv from 'dotenv';
dotenv.config();

import bcrypt from 'bcryptjs';
import { UserRole, JobStatus, ApplicationStatus, InterviewStatus } from '@prisma/client';
import prisma from '../src/lib/prisma';

async function main() {
  console.log('🌱 Bắt đầu tạo dữ liệu mẫu cho TV5 (Interviews & Workflow)...');

  const defaultPassword = await bcrypt.hash('Password123@', 10);

  // 1. Tạo tài khoản HR mẫu
  const hrUser = await prisma.user.upsert({
    where: { email: 'hr.kien@ats.com' },
    update: {},
    create: {
      email: 'hr.kien@ats.com',
      password: defaultPassword,
      firstName: 'Kiên',
      lastName: 'Nguyễn (HR)',
      role: UserRole.HR,
      isActive: true
    }
  });
  console.log(`✔ Tài khoản HR: ${hrUser.email}`);

  // 2. Tạo tài khoản Candidate mẫu 1
  const candidateUser1 = await prisma.user.upsert({
    where: { email: 'candidate.an@example.com' },
    update: {},
    create: {
      email: 'candidate.an@example.com',
      password: defaultPassword,
      firstName: 'An',
      lastName: 'Nguyễn Văn',
      role: UserRole.CANDIDATE,
      isActive: true,
      candidateProfile: {
        create: {
          phone: '0912345678',
          address: 'Cầu Giấy, Hà Nội',
          summary: 'Frontend Developer 3 năm kinh nghiệm React, Next.js, Tailwind CSS.',
          experienceYears: 3,
          education: 'Đại học Bách Khoa Hà Nội'
        }
      }
    },
    include: { candidateProfile: true }
  });
  console.log(`✔ Tài khoản Candidate 1: ${candidateUser1.email}`);

  // 3. Tạo tài khoản Candidate mẫu 2
  const candidateUser2 = await prisma.user.upsert({
    where: { email: 'candidate.binh@example.com' },
    update: {},
    create: {
      email: 'candidate.binh@example.com',
      password: defaultPassword,
      firstName: 'Bình',
      lastName: 'Trần Thị',
      role: UserRole.CANDIDATE,
      isActive: true,
      candidateProfile: {
        create: {
          phone: '0987654321',
          address: 'Thanh Xuân, Hà Nội',
          summary: 'Fullstack Developer thạo Node.js, Express, MySQL và Docker.',
          experienceYears: 2,
          education: 'Đại học Công Nghệ - ĐHQGHN'
        }
      }
    },
    include: { candidateProfile: true }
  });
  console.log(`✔ Tài khoản Candidate 2: ${candidateUser2.email}`);

  // 4. Tạo Tin tuyển dụng mẫu
  let job = await prisma.jobPosting.findFirst({
    where: { title: 'Senior Frontend Developer (React/Next.js)' }
  });
  if (!job) {
    job = await prisma.jobPosting.create({
      data: {
        title: 'Senior Frontend Developer (React/Next.js)',
        department: 'Trung tâm Phát triển Phần mềm',
        location: 'Hà Nội (Hybrid)',
        employmentType: 'Full-time',
        description: 'Phát triển giao diện web ứng dụng công nghệ Next.js 16 và Tailwind CSS.',
        requirements: 'Ít nhất 2 năm kinh nghiệm React, Next.js, TypeScript.',
        status: JobStatus.PUBLISHED,
        postedById: hrUser.id
      }
    });
  }
  console.log(`✔ Tin tuyển dụng: ${job.title}`);

  // 5. Tạo Application mẫu 1 (Đã xếp lịch phỏng vấn)
  let app1 = await prisma.application.findFirst({
    where: { candidateProfileId: candidateUser1.candidateProfile!.id, jobPostingId: job.id }
  });
  if (!app1) {
    app1 = await prisma.application.create({
      data: {
        candidateProfileId: candidateUser1.candidateProfile!.id,
        jobPostingId: job.id,
        status: ApplicationStatus.INTERVIEW_SCHEDULED,
        aiMatchScore: 88.5,
        coverLetter: 'Tôi rất mong muốn được đóng góp cho dự án ATS của công ty.'
      }
    });
  }

  // 6. Tạo Application mẫu 2 (Đã phỏng vấn xong - COMPLETED)
  let app2 = await prisma.application.findFirst({
    where: { candidateProfileId: candidateUser2.candidateProfile!.id, jobPostingId: job.id }
  });
  if (!app2) {
    app2 = await prisma.application.create({
      data: {
        candidateProfileId: candidateUser2.candidateProfile!.id,
        jobPostingId: job.id,
        status: ApplicationStatus.INTERVIEWED,
        aiMatchScore: 92.0,
        coverLetter: 'Kinh nghiệm Fullstack của tôi hoàn toàn phù hợp với vị trí này.'
      }
    });
  }

  // 7. Tạo Interview mẫu cho App 1 (SCHEDULED)
  const interview1 = await prisma.interview.findFirst({
    where: { applicationId: app1.id }
  });
  if (!interview1) {
    await prisma.interview.create({
      data: {
        applicationId: app1.id,
        interviewerId: hrUser.id,
        scheduledAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 ngày sau
        durationMinutes: 60,
        location: 'Phòng họp 302, Tòa nhà Innovation',
        meetingUrl: 'https://meet.google.com/xyz-ats-interview',
        notes: 'Phỏng vấn chuyên sâu kiến trúc Component và Next.js App Router',
        status: InterviewStatus.SCHEDULED
      }
    });
  }

  // 8. Tạo Interview mẫu cho App 2 (COMPLETED với rating & feedback)
  const interview2 = await prisma.interview.findFirst({
    where: { applicationId: app2.id }
  });
  if (!interview2) {
    await prisma.interview.create({
      data: {
        applicationId: app2.id,
        interviewerId: hrUser.id,
        scheduledAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 ngày trước
        durationMinutes: 45,
        location: 'Trực tuyến',
        meetingUrl: 'https://meet.google.com/abc-ats-interview',
        notes: 'Phỏng vấn kỹ thuật Backend & Database',
        status: InterviewStatus.COMPLETED,
        rating: 5,
        feedback: 'Ứng viên nắm chắc kiến thức cơ sở dữ liệu, tư duy hệ thống mạch lạc, giao tiếp tự tin. Đề xuất gửi Offer ngay.'
      }
    });
  }

  console.log('🎉 Hoàn thành seed dữ liệu mẫu cho TV5!');
  console.log('\n--- Thông tin đăng nhập thử nghiệm ---');
  console.log('HR: hr.kien@ats.com / Password123@');
  console.log('Candidate 1: candidate.an@example.com / Password123@');
  console.log('Candidate 2: candidate.binh@example.com / Password123@');
}

main()
  .catch((e) => {
    console.error('Lỗi seed data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
