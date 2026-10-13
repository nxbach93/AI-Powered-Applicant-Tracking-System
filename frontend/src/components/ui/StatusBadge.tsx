import React from 'react';
import { ApplicationStatus } from '@/lib/application-api';

interface StatusBadgeProps {
  status: ApplicationStatus | string;
  size?: 'sm' | 'md';
  showDot?: boolean;
  className?: string;
}

interface StatusConfig {
  label: string;
  badgeClass: string;
  dotClass: string;
}

const statusMap: Record<string, StatusConfig> = {
  SUBMITTED: {
    label: 'Hồ sơ mới',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200/80',
    dotClass: 'bg-blue-600',
  },
  SCREENING: {
    label: 'Đang sàng lọc AI',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
    dotClass: 'bg-indigo-600',
  },
  SHORTLISTED: {
    label: 'Đạt sơ tuyển',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    dotClass: 'bg-emerald-600',
  },
  INTERVIEW_SCHEDULED: {
    label: 'Đã lên lịch PV',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200/80',
    dotClass: 'bg-amber-500',
  },
  INTERVIEWED: {
    label: 'Đã phỏng vấn',
    badgeClass: 'bg-amber-50/80 text-amber-800 border-amber-200',
    dotClass: 'bg-amber-600',
  },
  OFFERED: {
    label: 'Đề xuất việc làm',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    dotClass: 'bg-emerald-600',
  },
  HIRED: {
    label: 'Đã tuyển dụng',
    badgeClass: 'bg-teal-50 text-teal-800 border-teal-200 font-bold',
    dotClass: 'bg-teal-600',
  },
  REJECTED: {
    label: 'Không phù hợp',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200/80',
    dotClass: 'bg-rose-600',
  },
  WITHDRAWN: {
    label: 'Đã rút hồ sơ',
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
    dotClass: 'bg-slate-400',
  },
};

export function StatusBadge({
  status,
  size = 'sm',
  showDot = true,
  className = '',
}: StatusBadgeProps) {
  const config = statusMap[status] || {
    label: status,
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    dotClass: 'bg-slate-400',
  };

  const sizeClasses =
    size === 'sm'
      ? 'px-2.5 py-0.5 text-[11px] leading-4'
      : 'px-3 py-1 text-xs leading-5';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border transition-colors ${config.badgeClass} ${sizeClasses} ${className}`}
    >
      {showDot && (
        <span
          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${config.dotClass}`}
        />
      )}
      <span className="truncate">{config.label}</span>
    </span>
  );
}
