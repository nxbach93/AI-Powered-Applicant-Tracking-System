'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { JobPosting, CreateJobDto } from '@/types/job';
import jobApi from '@/lib/services/job-api';
import { JobForm } from '@/components/jobs/JobForm';

export default function EditJobPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params.id);

  const [job, setJob] = useState<JobPosting | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    async function loadJobForEdit() {
      setIsLoading(true);
      setLoadError(null);
      try {
        const res = await jobApi.getJobById(id);
        if (res.success && res.data) {
          setJob(res.data);
        } else {
          setLoadError(res.error?.message || 'Không tìm thấy thông tin tin tuyển dụng');
        }
      } catch {
        setLoadError('Lỗi kết nối khi tải dữ liệu tin tuyển dụng');
      } finally {
        setIsLoading(false);
      }
    }

    if (id) {
      loadJobForEdit();
    }
  }, [id]);

  const handleUpdateJob = async (data: CreateJobDto) => {
    try {
      const res = await jobApi.updateJob(id, data);
      if (res.success && res.data) {
        router.push('/dashboard/jobs');
        return { success: true };
      }
      return {
        success: false,
        error: res.error?.message || 'Không thể cập nhật tin tuyển dụng. Vui lòng kiểm tra lại.',
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Lỗi hệ thống khi cập nhật tin tuyển dụng.',
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
            <span className="text-slate-900 font-semibold truncate max-w-xs">
              Chỉnh sửa: {job?.title || id}
            </span>
          </nav>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Chỉnh sửa tin tuyển dụng
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Cập nhật nội dung mô tả, kỹ năng yêu cầu và điều chỉnh mức lương hoặc trạng thái tuyển dụng
          </p>
        </div>

        {/* Trạng thái Đang tải dữ liệu */}
        {isLoading && (
          <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-slate-500 font-medium">Đang tải thông tin tin tuyển dụng...</p>
          </div>
        )}

        {/* Trạng thái Lỗi không tìm thấy */}
        {loadError && !isLoading && (
          <div className="bg-white rounded-3xl p-8 border border-red-200 text-center max-w-md mx-auto space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-slate-900">Không tìm thấy tin tuyển dụng</h3>
            <p className="text-xs text-slate-600">{loadError}</p>
            <Link
              href="/dashboard/jobs"
              className="inline-block px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-all"
            >
              Quay lại danh sách
            </Link>
          </div>
        )}

        {/* Form Chỉnh sửa */}
        {!isLoading && !loadError && job && (
          <JobForm initialData={job} isEdit={true} onSubmit={handleUpdateJob} />
        )}
      </div>
    </div>
  );
}
