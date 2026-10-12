import React from 'react';
import { JobStatus } from '@/types/job';

interface JobStatusBadgeProps {
  status: JobStatus;
  className?: string;
}

export function JobStatusBadge({ status, className = '' }: JobStatusBadgeProps) {
  const getBadgeConfig = (st: JobStatus) => {
    switch (st) {
      case 'PUBLISHED':
        return {
          label: 'Đang mở tuyển',
          classes: 'bg-emerald-50 text-emerald-700 border-emerald-200/80 ring-emerald-500/20',
          dot: 'bg-emerald-500',
        };
      case 'DRAFT':
        return {
          label: 'Bản nháp',
          classes: 'bg-slate-100 text-slate-700 border-slate-200 ring-slate-400/20',
          dot: 'bg-slate-400',
        };
      case 'CLOSED':
        return {
          label: 'Đã đóng tuyển',
          classes: 'bg-amber-50 text-amber-700 border-amber-200/80 ring-amber-500/20',
          dot: 'bg-amber-500',
        };
      case 'ARCHIVED':
        return {
          label: 'Đã lưu trữ',
          classes: 'bg-rose-50 text-rose-700 border-rose-200/80 ring-rose-500/20',
          dot: 'bg-rose-500',
        };
      default:
        return {
          label: st,
          classes: 'bg-slate-100 text-slate-700 border-slate-200',
          dot: 'bg-slate-400',
        };
    }
  };

  const config = getBadgeConfig(status);

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border shadow-xs ${config.classes} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      <span>{config.label}</span>
    </span>
  );
}

export default JobStatusBadge;
