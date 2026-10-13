'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { JobForm } from '@/components/jobs/JobForm';
import { CreateJobDto } from '@/types/job';
import jobApi from '@/lib/services/job-api';

export default function CreateJobPage() {
  const router = useRouter();

  const handleCreateJob = async (data: CreateJobDto) => {
    try {
      const res = await jobApi.createJob(data);
      if (res.success && res.data) {
        router.push('/dashboard/jobs');
        return { success: true };
      }
      return {
        success: false,
        error: res.error?.message || 'Không thể tạo tin tuyển dụng. Vui lòng kiểm tra lại thông tin.',
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi kết nối khi gửi dữ liệu tạo tin.';
      return {
        success: false,
        error: msg,
      };
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto">
      {/* Breadcrumbs & Header */}
      <div className="flex flex-col gap-1.5">
        <nav className="flex items-center gap-2 text-xs font-medium text-slate-400">
          <Link href="/dashboard/jobs" className="hover:text-blue-600 transition-colors">
            Quản lý tin tuyển dụng
          </Link>
          <span>/</span>
          <span className="text-slate-700 font-semibold">Tạo tin mới</span>
        </nav>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Tạo chiến dịch tuyển dụng mới
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Điền đầy đủ bản mô tả công việc (JD), yêu cầu năng lực đầu vào cho mô hình AI CV Screening và chế độ đãi ngộ.
        </p>
      </div>

      {/* Form soạn thảo */}
      <JobForm isEdit={false} onSubmit={handleCreateJob} />
    </div>
  );
}
