'use client';

import React from 'react';
import { ApplicationStatus } from '@/lib/application-api';

interface PipelineProgressionBarProps {
  currentStatus: ApplicationStatus;
  className?: string;
}

interface StageStep {
  id: string;
  name: string;
  statuses: ApplicationStatus[];
}

const STAGES: StageStep[] = [
  { id: 'submitted', name: 'Tiếp nhận', statuses: ['SUBMITTED'] },
  { id: 'screening', name: 'Sàng lọc AI', statuses: ['SCREENING'] },
  { id: 'shortlisted', name: 'Sơ tuyển', statuses: ['SHORTLISTED'] },
  { id: 'interview', name: 'Phỏng vấn', statuses: ['INTERVIEW_SCHEDULED', 'INTERVIEWED'] },
  { id: 'offered', name: 'Đề xuất Offer', statuses: ['OFFERED'] },
  { id: 'hired', name: 'Nhận việc', statuses: ['HIRED'] },
];

export function PipelineProgressionBar({
  currentStatus,
  className = '',
}: PipelineProgressionBarProps) {
  const isTerminalNegative =
    currentStatus === 'REJECTED' || currentStatus === 'WITHDRAWN';

  // Tìm index của stage hiện tại
  let currentStageIndex = STAGES.findIndex((s) =>
    s.statuses.includes(currentStatus)
  );

  if (currentStageIndex === -1) {
    currentStageIndex = 0;
  }

  return (
    <div className={`p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col gap-3 ${className}`}>
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-slate-700 flex items-center gap-1.5">
          <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          Tiến trình quy trình:
          <strong className="text-slate-900 font-bold ml-1">
            {isTerminalNegative
              ? currentStatus === 'REJECTED'
                ? 'Không phù hợp (Đã từ chối)'
                : 'Đã rút đơn ứng tuyển'
              : STAGES[currentStageIndex]?.name}
          </strong>
        </span>

        {!isTerminalNegative ? (
          <span className="font-tabular-mono text-slate-500 font-semibold text-[11px]">
            Chặng {currentStageIndex + 1}/{STAGES.length} (
            {Math.round(((currentStageIndex + 1) / STAGES.length) * 100)}%)
          </span>
        ) : (
          <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
            Hồ sơ dừng xử lý
          </span>
        )}
      </div>

      {/* Segmented Stepper Bar */}
      <div className="grid grid-cols-6 gap-1.5 sm:gap-2">
        {STAGES.map((stage, idx) => {
          let barClass = 'bg-slate-200';
          let isCompleted = false;
          let isCurrent = false;

          if (isTerminalNegative) {
            barClass = 'bg-slate-200 opacity-60';
          } else if (idx < currentStageIndex) {
            isCompleted = true;
            barClass = 'bg-emerald-500';
          } else if (idx === currentStageIndex) {
            isCurrent = true;
            barClass = 'bg-blue-600 relative ring-2 ring-blue-400/30';
          }

          return (
            <div key={stage.id} className="flex flex-col gap-1.5">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${barClass}`}
                title={`${stage.name} ${
                  isCompleted
                    ? '(Đã hoàn thành)'
                    : isCurrent
                    ? '(Hiện tại)'
                    : '(Chưa đến)'
                }`}
              />
              <span
                className={`text-[10px] sm:text-[11px] truncate text-center ${
                  isCurrent
                    ? 'font-bold text-blue-700'
                    : isCompleted
                    ? 'font-medium text-emerald-700'
                    : 'text-slate-400'
                }`}
              >
                {stage.name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
