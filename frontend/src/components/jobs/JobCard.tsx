import React from 'react';
import Link from 'next/link';
import { JobPosting } from '@/types/job';
import { JobStatusBadge } from './JobStatusBadge';

interface JobCardProps {
  job: JobPosting;
  showStatus?: boolean;
}

export function JobCard({ job, showStatus = false }: JobCardProps) {
  // Định dạng mức lương thân thiện
  const formatSalary = (min?: number | string | null, max?: number | string | null) => {
    const numMin = min !== null && min !== undefined ? Number(min) : null;
    const numMax = max !== null && max !== undefined ? Number(max) : null;

    const toMillions = (val: number) => {
      if (val >= 1_000_000) {
        const m = val / 1_000_000;
        return Number.isInteger(m) ? `${m} tr` : `${m.toFixed(1)} tr`;
      }
      return val.toLocaleString('vi-VN');
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

  // Định dạng hạn nộp hồ sơ
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

  const deadlineFormatted = formatDeadline(job.applicationDeadline);

  // Nhãn hình thức làm việc
  const formatEmploymentType = (type?: string | null) => {
    switch (type) {
      case 'FULL_TIME':
        return 'Toàn thời gian';
      case 'PART_TIME':
        return 'Bán thời gian';
      case 'CONTRACT':
        return 'Hợp đồng';
      case 'INTERNSHIP':
        return 'Thực tập sinh';
      case 'REMOTE':
        return 'Làm từ xa (Remote)';
      default:
        return type || 'Toàn thời gian';
    }
  };

  return (
    <div className="group relative bg-white border border-slate-200/80 rounded-2xl p-6 hover:shadow-xl hover:shadow-blue-500/5 hover:border-blue-300 transition-all duration-300 flex flex-col justify-between">
      <div>
        {/* Header thẻ: Phòng ban & Huy hiệu trạng thái */}
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            {job.department && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                {job.department}
              </span>
            )}
            {job.employmentType && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-50 text-slate-600 border border-slate-200">
                {formatEmploymentType(job.employmentType)}
              </span>
            )}
          </div>
          {showStatus && <JobStatusBadge status={job.status} />}
        </div>

        {/* Tiêu đề tin tuyển dụng */}
        <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2 mb-2">
          <Link href={`/jobs/${job.id}`} className="focus:outline-none focus:underline">
            {job.title}
          </Link>
        </h3>

        {/* Mô tả tóm tắt */}
        <p className="text-sm text-slate-600 line-clamp-2 mb-4 leading-relaxed">
          {job.description}
        </p>
      </div>

      {/* Thông số phụ: Mức lương, Địa điểm, Hạn nộp */}
      <div className="pt-4 border-t border-slate-100 space-y-2.5">
        <div className="flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-1.5 font-semibold text-emerald-700">
            {/* Icon Tiền lương */}
            <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{formatSalary(job.salaryMin, job.salaryMax)}</span>
          </div>

          {job.location && (
            <div className="flex items-center gap-1 text-slate-500">
              {/* Icon Địa điểm */}
              <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span className="truncate max-w-[120px]">{job.location}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between text-xs pt-1">
          {deadlineFormatted ? (
            <div className="flex items-center gap-1.5 text-slate-500">
              {/* Icon Lịch hạn nộp */}
              <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <span>Hạn nộp: <strong className="text-slate-700">{deadlineFormatted}</strong></span>
            </div>
          ) : (
            <span className="text-slate-400 italic">Đang nhận hồ sơ</span>
          )}

          <Link
            href={`/jobs/${job.id}`}
            className="inline-flex items-center gap-1 text-blue-600 font-semibold hover:text-blue-700 hover:gap-1.5 transition-all text-xs"
          >
            <span>Chi tiết</span>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default JobCard;
