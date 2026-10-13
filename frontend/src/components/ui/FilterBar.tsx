'use client';

import React from 'react';
import { HrJobOverview } from '@/lib/application-api';

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  jobs: HrJobOverview[];
  selectedJobId: string;
  onJobChange: (jobId: string) => void;
  statusFilter: string;
  onStatusChange: (status: string) => void;
  minScore: number | undefined;
  onMinScoreChange: (score: number | undefined) => void;
  sortBy: 'appliedAt' | 'aiMatchScore' | 'updatedAt';
  onSortByChange: (sortBy: 'appliedAt' | 'aiMatchScore' | 'updatedAt') => void;
  order: 'asc' | 'desc';
  onOrderToggle: () => void;
  onClearFilters: () => void;
  totalCount: number;
}

export function FilterBar({
  searchQuery,
  onSearchChange,
  jobs,
  selectedJobId,
  onJobChange,
  statusFilter,
  onStatusChange,
  minScore,
  onMinScoreChange,
  sortBy,
  onSortByChange,
  order,
  onOrderToggle,
  onClearFilters,
  totalCount,
}: FilterBarProps) {
  const selectedJob = jobs.find((j) => j.id === selectedJobId);

  const hasActiveFilters =
    Boolean(searchQuery) ||
    selectedJobId !== 'all' ||
    Boolean(statusFilter) ||
    minScore !== undefined;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 sm:p-5 flex flex-col gap-3.5">
      {/* Top Filter & Search Row */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <svg
            className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Tìm theo tên ứng viên, email hoặc kỹ năng..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full h-10 pl-10 pr-14 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 text-xs sm:text-sm focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600 p-0.5"
            >
              ✕
            </button>
          ) : (
            <kbd className="hidden sm:inline-flex absolute right-3 top-2.5 font-tabular-mono text-[10px] text-slate-400 px-1.5 py-0.5 rounded bg-white border border-slate-200 shadow-2xs">
              ⌘F
            </kbd>
          )}
        </div>

        {/* Quick Filter Selects */}
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
          {/* Job Filter */}
          <select
            value={selectedJobId}
            onChange={(e) => onJobChange(e.target.value)}
            className="h-10 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
          >
            <option value="all">Tất cả vị trí ({totalCount})</option>
            {jobs.map((job) => (
              <option key={job.id} value={job.id}>
                {job.title} ({job.totalApplications})
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => onStatusChange(e.target.value)}
            className="h-10 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="SUBMITTED">Hồ sơ mới</option>
            <option value="SCREENING">Đang sàng lọc AI</option>
            <option value="SHORTLISTED">Đạt sơ tuyển</option>
            <option value="INTERVIEW_SCHEDULED">Đã lên lịch PV</option>
            <option value="INTERVIEWED">Đã phỏng vấn</option>
            <option value="OFFERED">Đề xuất việc làm</option>
            <option value="HIRED">Đã nhận việc</option>
            <option value="REJECTED">Không phù hợp</option>
            <option value="WITHDRAWN">Đã rút hồ sơ</option>
          </select>

          {/* AI Match Filter */}
          <select
            value={minScore === undefined ? '' : String(minScore)}
            onChange={(e) => onMinScoreChange(e.target.value === '' ? undefined : Number(e.target.value))}
            className={`h-10 px-3 rounded-xl border text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors ${
              minScore !== undefined
                ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
            }`}
          >
            <option value="">Điểm AI: Tất cả</option>
            <option value="85">Điểm AI ≥ 85% (Rất cao)</option>
            <option value="70">Điểm AI ≥ 70% (Phù hợp)</option>
            <option value="50">Điểm AI ≥ 50% (Cân nhắc)</option>
          </select>

          {/* Sort Dropdown & Toggle */}
          <div className="flex items-center gap-1 col-span-2 sm:col-span-1">
            <select
              value={sortBy}
              onChange={(e) => onSortByChange(e.target.value as any)}
              className="h-10 px-3 flex-1 sm:flex-none rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
            >
              <option value="appliedAt">Ngày nộp đơn</option>
              <option value="aiMatchScore">Điểm AI Match</option>
              <option value="updatedAt">Cập nhật gần nhất</option>
            </select>
            <button
              type="button"
              onClick={onOrderToggle}
              title={order === 'desc' ? 'Thứ tự giảm dần' : 'Thứ tự tăng dần'}
              className="h-10 px-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors"
            >
              {order === 'desc' ? '↓ Giảm' : '↑ Tăng'}
            </button>
          </div>
        </div>
      </div>

      {/* Active Filter Chips Strip & Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100">
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Đang lọc:
          </span>

          {selectedJobId !== 'all' && selectedJob && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-medium">
              <span>Vị trí: {selectedJob.title}</span>
              <button
                type="button"
                onClick={() => onJobChange('all')}
                className="hover:text-blue-900 ml-0.5"
              >
                ✕
              </button>
            </span>
          )}

          {statusFilter && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-xs font-medium">
              <span>Trạng thái: {statusFilter}</span>
              <button
                type="button"
                onClick={() => onStatusChange('')}
                className="hover:text-slate-900 ml-0.5"
              >
                ✕
              </button>
            </span>
          )}

          {minScore !== undefined && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-medium">
              <span>Điểm AI ≥ {minScore}%</span>
              <button
                type="button"
                onClick={() => onMinScoreChange(undefined)}
                className="hover:text-indigo-900 ml-0.5"
              >
                ✕
              </button>
            </span>
          )}

          {searchQuery && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-xs font-medium">
              <span>Từ khóa: "{searchQuery}"</span>
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="hover:text-slate-900 ml-0.5"
              >
                ✕
              </button>
            </span>
          )}

          {hasActiveFilters && (
            <button
              type="button"
              onClick={onClearFilters}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline ml-1"
            >
              Xóa tất cả
            </button>
          )}

          {!hasActiveFilters && (
            <span className="text-xs text-slate-400 italic">Mặc định (Tất cả hồ sơ)</span>
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[11px] text-slate-500 font-medium">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Khớp cao (≥85%)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span> Phù hợp (70-84%)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span> Cân nhắc (&lt;70%)
          </span>
        </div>
      </div>
    </div>
  );
}
