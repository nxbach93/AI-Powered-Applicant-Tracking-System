'use client';

import React from 'react';
import Link from 'next/link';
import { ApplicationStatus, HrApplicationItem } from '@/lib/application-api';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { AiMatchGauge } from '@/components/ui/AiMatchGauge';

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

interface DataTableProps {
  data: HrApplicationItem[];
  isLoading: boolean;
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onQuickStatusChange: (id: string, status: ApplicationStatus) => void;
  updatingId: string | null;
  page: number;
  totalPages: number;
  totalCount: number;
  onPageChange: (newPage: number) => void;
}

export function DataTable({
  data,
  isLoading,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onQuickStatusChange,
  updatingId,
  page,
  totalPages,
  totalCount,
  onPageChange,
}: DataTableProps) {
  const isAllSelected = data.length > 0 && selectedIds.length === data.length;

  return (
    <div className="rounded-2xl bg-white border border-slate-200/90 shadow-2xs overflow-hidden flex flex-col">
      {/* Table Toolbar / Multi-Select Counter */}
      <div className="px-4 py-3 bg-slate-50/70 border-b border-slate-200/80 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <label className="inline-flex items-center gap-2 cursor-pointer select-none text-slate-700 font-medium">
            <input
              type="checkbox"
              checked={isAllSelected}
              onChange={onSelectAll}
              disabled={isLoading || data.length === 0}
              className="w-4 h-4 rounded text-blue-600 focus:ring-0 border-slate-300 cursor-pointer"
            />
            <span>Chọn tất cả trang này</span>
          </label>
          {selectedIds.length > 0 && (
            <span className="font-tabular-mono font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[11px]">
              {selectedIds.length} ứng viên đã chọn
            </span>
          )}
        </div>
        <div className="text-slate-500 font-medium">
          Tổng cộng: <span className="font-bold text-slate-800">{totalCount}</span> hồ sơ
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto w-full">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="bg-slate-50/90 text-slate-500 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200 select-none">
              <th className="py-3 px-3 w-10 text-center">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={onSelectAll}
                  disabled={isLoading || data.length === 0}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-0 border-slate-300 cursor-pointer"
                />
              </th>
              <th className="py-3 px-4 min-w-[220px]">Ứng viên</th>
              <th className="py-3 px-4 min-w-[180px]">Vị trí ứng tuyển</th>
              <th className="py-3 px-4 min-w-[150px]">Điểm AI Neural Match</th>
              <th className="py-3 px-4 min-w-[180px]">Kỹ năng nổi bật</th>
              <th className="py-3 px-4 min-w-[150px]">Trạng thái</th>
              <th className="py-3 px-4 min-w-[140px]">Ngày nộp</th>
              <th className="py-3 px-4 text-right min-w-[140px]">Hành động</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              // Loading Skeleton Rows
              Array.from({ length: 6 }).map((_, idx) => (
                <tr key={idx} className="animate-pulse">
                  <td className="py-4 px-3 text-center">
                    <div className="w-4 h-4 bg-slate-200 rounded mx-auto" />
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-slate-200 flex-shrink-0" />
                      <div className="space-y-1.5 flex-1">
                        <div className="h-3.5 bg-slate-200 rounded w-28" />
                        <div className="h-3 bg-slate-100 rounded w-40" />
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="h-3.5 bg-slate-200 rounded w-32 mb-1" />
                    <div className="h-3 bg-slate-100 rounded w-20" />
                  </td>
                  <td className="py-4 px-4">
                    <div className="h-6 bg-slate-200 rounded-full w-24" />
                  </td>
                  <td className="py-4 px-4">
                    <div className="h-5 bg-slate-200 rounded w-36" />
                  </td>
                  <td className="py-4 px-4">
                    <div className="h-5 bg-slate-200 rounded-full w-24" />
                  </td>
                  <td className="py-4 px-4">
                    <div className="h-3 bg-slate-200 rounded w-28" />
                  </td>
                  <td className="py-4 px-4 text-right">
                    <div className="h-7 bg-slate-200 rounded w-16 ml-auto" />
                  </td>
                </tr>
              ))
            ) : data.length === 0 ? (
              // Empty State
              <tr>
                <td colSpan={8} className="py-16 text-center px-4">
                  <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-slate-200 text-slate-400">
                    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">Không tìm thấy ứng viên nào</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    Không có hồ sơ nào phù hợp với các tiêu chí lọc hiện tại. Thử đổi từ khóa hoặc xóa bớt bộ lọc.
                  </p>
                </td>
              </tr>
            ) : (
              // Actual Data Rows
              data.map((app) => {
                const isSelected = selectedIds.includes(app.id);
                const isShortlistable =
                  app.status === 'SUBMITTED' || app.status === 'SCREENING';

                return (
                  <tr
                    key={app.id}
                    className={`transition-colors group ${
                      isSelected
                        ? 'bg-blue-50/50 hover:bg-blue-50/80'
                        : 'hover:bg-slate-50/80'
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="py-3.5 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleSelect(app.id)}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-0 border-slate-300 cursor-pointer"
                      />
                    </td>

                    {/* Candidate */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="relative flex-shrink-0">
                          {app.candidate.avatarUrl ? (
                            <img
                              src={app.candidate.avatarUrl}
                              alt={app.candidate.fullName}
                              className="w-9 h-9 rounded-full object-cover border border-slate-200"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center border border-blue-200">
                              {app.candidate.fullName.charAt(0).toUpperCase() || 'U'}
                            </div>
                          )}
                          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white"></span>
                        </div>
                        <div className="min-w-0">
                          <Link
                            href={`/hr/applications/${app.id}`}
                            className="font-bold text-slate-900 hover:text-blue-600 transition-colors truncate block"
                          >
                            {app.candidate.fullName}
                          </Link>
                          <div className="text-xs text-slate-500 truncate">
                            {app.candidate.email}
                          </div>
                          {app.candidate.phone && (
                            <div className="font-tabular-mono text-[11px] text-slate-400">
                              {app.candidate.phone}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Job Position */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800 text-xs">
                        {app.jobPosting?.title || 'Chưa gắn tin'}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {app.jobPosting?.department || 'Tuyển dụng'}
                      </div>
                    </td>

                    {/* AI Neural Match */}
                    <td className="py-3.5 px-4">
                      <AiMatchGauge score={app.aiMatchScore} variant="pill" />
                    </td>

                    {/* Skills */}
                    <td className="py-3.5 px-4">
                      {app.parsedSkills && app.parsedSkills.length > 0 ? (
                        <div className="flex items-center gap-1 flex-wrap max-w-xs">
                          {app.parsedSkills.slice(0, 3).map((skill, sIdx) => (
                            <span
                              key={sIdx}
                              className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200/80"
                            >
                              {skill}
                            </span>
                          ))}
                          {app.parsedSkills.length > 3 && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 font-tabular-mono">
                              +{app.parsedSkills.length - 3}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Đang trích xuất</span>
                      )}
                    </td>

                    {/* Stage Status */}
                    <td className="py-3.5 px-4">
                      <StatusBadge status={app.status} size="sm" />
                    </td>

                    {/* Applied Date */}
                    <td className="py-3.5 px-4">
                      <div className="font-tabular-mono text-xs text-slate-500 whitespace-nowrap">
                        {formatDate(app.appliedAt)}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        {/* CV PDF Link */}
                        {app.cvFileUrl && (
                          <a
                            href={`${API_BASE}${app.cvFileUrl}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-slate-200/80"
                            title="Mở file CV gốc"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </a>
                        )}

                        {/* Quick Shortlist Button */}
                        {isShortlistable && (
                          <button
                            type="button"
                            disabled={updatingId === app.id}
                            onClick={() => onQuickStatusChange(app.id, 'SHORTLISTED')}
                            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors disabled:opacity-50"
                            title="Duyệt nhanh vào danh sách sơ tuyển"
                          >
                            Duyệt
                          </button>
                        )}

                        {/* View Detail Link */}
                        <Link
                          href={`/hr/applications/${app.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-2xs"
                        >
                          Chi tiết →
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="p-3.5 bg-slate-50/80 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <span className="text-slate-500 font-medium">
            Trang <span className="font-tabular-mono font-bold text-slate-800">{page}</span> / <span className="font-tabular-mono font-bold text-slate-800">{totalPages}</span>
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1 || isLoading}
              onClick={() => onPageChange(Math.max(1, page - 1))}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-semibold disabled:opacity-40 hover:bg-slate-50 transition-colors"
            >
              ← Trang trước
            </button>
            <button
              type="button"
              disabled={page >= totalPages || isLoading}
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-semibold disabled:opacity-40 hover:bg-slate-50 transition-colors"
            >
              Trang sau →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
