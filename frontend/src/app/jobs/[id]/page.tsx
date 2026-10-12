'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { JobPosting } from '@/types/job';
import jobApi from '@/lib/services/job-api';
import { JobStatusBadge } from '@/components/jobs/JobStatusBadge';

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params.id);

  const [job, setJob] = useState<JobPosting | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    async function fetchJobDetail() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await jobApi.getJobById(id);
        if (res.success && res.data) {
          setJob(res.data);
        } else {
          setError(res.error?.message || 'Không tìm thấy thông tin tin tuyển dụng');
        }
      } catch {
        setError('Đã xảy ra lỗi khi tải thông tin việc làm');
      } finally {
        setIsLoading(false);
      }
    }

    if (id) {
      fetchJobDetail();
    }
  }, [id]);

  const formatSalary = (min?: number | string | null, max?: number | string | null) => {
    const numMin = min !== null && min !== undefined ? Number(min) : null;
    const numMax = max !== null && max !== undefined ? Number(max) : null;

    const toMillions = (val: number) => {
      if (val >= 1_000_000) {
        const m = val / 1_000_000;
        return Number.isInteger(m) ? `${m} triệu` : `${m.toFixed(1)} triệu`;
      }
      return `${val.toLocaleString('vi-VN')} đ`;
    };

    if (numMin && numMax) {
      return `${toMillions(numMin)} - ${toMillions(numMax)} VNĐ`;
    }
    if (numMin) {
      return `Từ ${toMillions(numMin)} VNĐ`;
    }
    if (numMax) {
      return `Lên đến ${toMillions(numMax)} VNĐ`;
    }
    return 'Lương thỏa thuận';
  };

  const formatDeadline = (deadlineStr?: string | null) => {
    if (!deadlineStr) return null;
    try {
      const d = new Date(deadlineStr);
      if (isNaN(d.getTime())) return null;
      return d.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return null;
    }
  };

  const formatEmploymentType = (type?: string | null) => {
    switch (type) {
      case 'FULL_TIME':
        return 'Toàn thời gian (Full-time)';
      case 'PART_TIME':
        return 'Bán thời gian (Part-time)';
      case 'CONTRACT':
        return 'Hợp đồng (Contract)';
      case 'INTERNSHIP':
        return 'Thực tập sinh (Internship)';
      case 'REMOTE':
        return 'Làm việc từ xa (Remote)';
      default:
        return type || 'Toàn thời gian';
    }
  };

  const handleCopyShareLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto space-y-6 animate-pulse">
          <div className="h-4 w-40 bg-slate-200 rounded" />
          <div className="bg-white rounded-3xl p-8 border border-slate-200 space-y-4">
            <div className="h-8 w-2/3 bg-slate-200 rounded" />
            <div className="h-4 w-1/3 bg-slate-200 rounded" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
              <div className="h-20 bg-slate-100 rounded-xl" />
              <div className="h-20 bg-slate-100 rounded-xl" />
              <div className="h-20 bg-slate-100 rounded-xl" />
            </div>
          </div>
          <div className="bg-white rounded-3xl p-8 border border-slate-200 space-y-6">
            <div className="h-6 w-48 bg-slate-200 rounded" />
            <div className="space-y-3">
              <div className="h-4 w-full bg-slate-100 rounded" />
              <div className="h-4 w-5/6 bg-slate-100 rounded" />
              <div className="h-4 w-4/6 bg-slate-100 rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-12 text-center max-w-md shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Không tìm thấy vị trí tuyển dụng</h2>
          <p className="text-sm text-slate-600 mb-6 leading-relaxed">
            {error || 'Tin tuyển dụng không tồn tại, đã hết hạn hoặc tạm thời ngừng nhận hồ sơ.'}
          </p>
          <button
            onClick={() => router.push('/jobs')}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition-all shadow-sm"
          >
            Quay lại danh sách việc làm
          </button>
        </div>
      </div>
    );
  }

  const deadlineFormatted = formatDeadline(job.applicationDeadline);

  return (
    <div className="min-h-screen bg-slate-50/70 pb-20">
      {/* Thanh điều hướng Breadcrumb */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
          <nav className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <Link href="/" className="hover:text-blue-600 transition-colors">
              Trang chủ
            </Link>
            <span>/</span>
            <Link href="/jobs" className="hover:text-blue-600 transition-colors">
              Việc làm
            </Link>
            <span>/</span>
            <span className="text-slate-900 truncate max-w-[260px] sm:max-w-md">
              {job.title}
            </span>
          </nav>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* Khối Header Chi tiết Công việc */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2.5 flex-wrap">
                {job.department && (
                  <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                    {job.department}
                  </span>
                )}
                {job.employmentType && (
                  <span className="px-3 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                    {formatEmploymentType(job.employmentType)}
                  </span>
                )}
                <JobStatusBadge status={job.status} />
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">
                {job.title}
              </h1>

              {job.postedBy && (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px]">
                    {job.postedBy.firstName?.charAt(0) || 'H'}
                  </div>
                  <span>
                    Đăng bởi: <strong className="text-slate-700">{job.postedBy.firstName} {job.postedBy.lastName}</strong>
                  </span>
                </div>
              )}
            </div>

            {/* Các nút hành động chính (CTA) */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={handleCopyShareLink}
                className="px-4 py-3 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-2 transition-all"
                title="Sao chép đường dẫn chia sẻ"
              >
                {isCopied ? (
                  <>
                    <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-emerald-700">Đã sao chép!</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                    <span>Chia sẻ</span>
                  </>
                )}
              </button>

              <button
                type="button"
                id="apply-job-btn"
                onClick={() => setIsApplyModalOpen(true)}
                className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-bold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/35 transition-all flex items-center justify-center gap-2 transform active:scale-95"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Ứng tuyển ngay</span>
              </button>
            </div>
          </div>

          {/* Hộp Thông số Nhanh (Salary, Location, Deadline) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 pt-6 border-t border-slate-100">
            <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100">
              <span className="text-xs text-slate-500 block mb-1">Mức thu nhập</span>
              <span className="text-base font-bold text-emerald-600">
                {formatSalary(job.salaryMin, job.salaryMax)}
              </span>
            </div>

            <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100">
              <span className="text-xs text-slate-500 block mb-1">Địa điểm làm việc</span>
              <span className="text-base font-semibold text-slate-900 truncate block">
                {job.location || 'Tại văn phòng'}
              </span>
            </div>

            <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100">
              <span className="text-xs text-slate-500 block mb-1">Hạn nộp hồ sơ</span>
              <span className="text-base font-semibold text-slate-900">
                {deadlineFormatted ? deadlineFormatted : 'Tuyển liên tục'}
              </span>
            </div>
          </div>
        </div>

        {/* Nội dung chi tiết Bản mô tả công việc (JD) */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-8 shadow-xs">
          {/* Mô tả công việc */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="w-2 h-5 bg-blue-600 rounded-full" />
              <span>Mô tả công việc (Job Description)</span>
            </h2>
            <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-line pl-4 border-l-2 border-slate-100">
              {job.description}
            </div>
          </section>

          {/* Yêu cầu ứng viên */}
          {job.requirements && (
            <section className="space-y-3 pt-6 border-t border-slate-100">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span className="w-2 h-5 bg-indigo-600 rounded-full" />
                <span>Yêu cầu ứng viên (Requirements & Skills)</span>
              </h2>
              <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-line pl-4 border-l-2 border-slate-100">
                {job.requirements}
              </div>
            </section>
          )}

          {/* Chân trang JD: Lời mời ứng tuyển */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100/80 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 mb-1">
                Bạn đã sẵn sàng ứng tuyển vị trí này?
              </h3>
              <p className="text-xs text-slate-600">
                CV của bạn sẽ được hệ thống AI tự động phân tích và so khớp với JD để HR phản hồi sớm nhất.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsApplyModalOpen(true)}
              className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all shrink-0"
            >
              Nộp hồ sơ ngay
            </button>
          </div>
        </div>
      </div>

      {/* Modal Ứng tuyển: Điểm cắm sẵn (Hook Point) cho TV3 */}
      {isApplyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 border border-slate-200 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setIsApplyModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-colors"
              aria-label="Đóng"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">
                  Ứng tuyển vị trí {job.title}
                </h3>
                <p className="text-xs text-slate-500">
                  Mã tin tuyển dụng: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-[11px] font-mono text-slate-700">{job.id}</code>
                </p>
              </div>

              {/* Thông báo thông tin tích hợp TV3 */}
              <div className="bg-blue-50/70 border border-blue-200/60 rounded-2xl p-4 text-left space-y-2 text-xs text-blue-900">
                <div className="font-semibold flex items-center gap-1.5 text-blue-800">
                  <svg className="w-4 h-4 text-blue-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Cổng tích hợp Module Ứng tuyển (TV3)</span>
                </div>
                <p className="text-blue-700/90 leading-relaxed">
                  Tính năng tiếp nhận tệp CV vật lý (PDF/DOCX) và phân tích NLP đang được kết nối với module của <strong>TV3 (Nguyễn Quốc Anh)</strong>.
                </p>
                <div className="text-[11px] text-blue-600/80 pt-1 border-t border-blue-200/50">
                  Endpoint nộp hồ sơ chuẩn: <code className="font-mono font-semibold">POST /api/applications</code> (multipart/form-data: <span className="font-semibold">jobPostingId</span>, <span className="font-semibold">cvFile</span>).
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsApplyModalOpen(false)}
                  className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-all"
                >
                  Đóng lại
                </button>
                <Link
                  href="/candidate/profile"
                  className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all flex items-center justify-center shadow-sm shadow-blue-500/20"
                >
                  Xem hồ sơ CV của tôi
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
