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
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Lỗi kết nối khi gửi dữ liệu tạo tin.',
      };
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/70 pb-20">
      {/* Header thanh điều hướng */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <nav className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <Link href="/dashboard/jobs" className="hover:text-blue-600 transition-colors">
              Quản lý tuyển dụng
            </Link>
            <span>/</span>
            <span className="text-slate-900 font-semibold">Tạo tin tuyển dụng mới</span>
          </nav>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Tạo chiến dịch tuyển dụng mới
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Điền đầy đủ các thông tin mô tả công việc (JD), yêu cầu kỹ năng và chế độ đãi ngộ để bắt đầu tiếp nhận CV
          </p>
        </div>

        {/* Form soạn thảo */}
        <JobForm isEdit={false} onSubmit={handleCreateJob} />
      </div>
    </div>
  );
}
