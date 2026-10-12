'use client';

import React from 'react';
import { ApplicationStatus } from '@/lib/application-api';

const STATUS_CONFIG: Record<ApplicationStatus, { label: string; bg: string; text: string; dot: string }> = {
  SUBMITTED:           { label: 'Đã nộp',          bg: 'bg-slate-100',   text: 'text-slate-700',  dot: 'bg-slate-400' },
  SCREENING:           { label: 'Đang sàng lọc',   bg: 'bg-amber-50',    text: 'text-amber-700',  dot: 'bg-amber-400' },
  SHORTLISTED:         { label: 'Vào danh sách',   bg: 'bg-blue-50',     text: 'text-blue-700',   dot: 'bg-blue-500' },
  INTERVIEW_SCHEDULED: { label: 'Có lịch PV',      bg: 'bg-indigo-50',   text: 'text-indigo-700', dot: 'bg-indigo-500' },
  INTERVIEWED:         { label: 'Đã phỏng vấn',    bg: 'bg-purple-50',   text: 'text-purple-700', dot: 'bg-purple-500' },
  OFFERED:             { label: 'Nhận Offer',       bg: 'bg-emerald-50',  text: 'text-emerald-700',dot: 'bg-emerald-500' },
  HIRED:               { label: 'Đã tuyển',         bg: 'bg-green-50',    text: 'text-green-700',  dot: 'bg-green-500' },
  REJECTED:            { label: 'Không phù hợp',   bg: 'bg-red-50',      text: 'text-red-700',    dot: 'bg-red-400' },
  WITHDRAWN:           { label: 'Đã rút đơn',       bg: 'bg-slate-50',    text: 'text-slate-500',  dot: 'bg-slate-300' },
};

interface ApplicationStatusBadgeProps {
  status: ApplicationStatus;
  size?: 'sm' | 'md';
}

export function ApplicationStatusBadge({ status, size = 'md' }: ApplicationStatusBadgeProps) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG['SUBMITTED'];
  const paddingClass = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold border border-transparent ${cfg.bg} ${cfg.text} ${paddingClass}`}
      title={`Trạng thái: ${cfg.label}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} ${status === 'SCREENING' ? 'animate-pulse' : ''}`} />
      {cfg.label}
    </span>
  );
}
