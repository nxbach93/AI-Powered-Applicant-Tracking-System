'use client';

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { RoleGuard } from '@/components/auth/role-guard';
import { ApplicationStatusBadge } from '@/components/candidate/application-status-badge';
import {
  ApplicationStatus,
  HrApplicationItem,
  HrJobOverview,
  getHrJobsOverviewApi,
  getApplicationsByJobApi,
  updateApplicationStatusApi,
} from '@/lib/application-api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getScoreBadgeClass(score: number | null) {
  if (score === null || score === undefined) return 'bg-slate-100 text-slate-600 border-slate-200';
  if (score >= 80) return 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold';
  if (score >= 65) return 'bg-blue-50 text-blue-700 border-blue-200 font-semibold';
  if (score >= 50) return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-rose-50 text-rose-700 border-rose-200';
}

export default function HrApplicationsPage() {
  const [jobs, setJobs] = useState<HrJobOverview[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>('all');
  const [applications, setApplications] = useState<HrApplicationItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [minScore, setMinScore] = useState<number | undefined>(undefined);
  const [sortBy, setSortBy] = useState<'appliedAt' | 'aiMatchScore' | 'updatedAt'>('appliedAt');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // 1. Tải danh sách các Job khi mount
  useEffect(() => {
    let isMounted = true;
    getHrJobsOverviewApi()
      .then((data) => {
        if (isMounted) setJobs(data);
      })
      .catch((err) => {
        console.error('Lỗi lấy danh sách job:', err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Tải danh sách ứng viên
  const fetchApplications = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getApplicationsByJobApi(selectedJobId, {
        status: statusFilter || undefined,
        sortBy,
        order,
        minScore,
        page,
        limit: 10,
      });
      setApplications(res.data);
      setTotal(res.meta.total);
      setTotalPages(res.meta.totalPages || 1);
    } catch (err: any) {
      console.error('Lỗi tải danh sách ứng viên:', err);
      setActionMessage({ text: err.message || 'Không thể tải danh sách ứng viên', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, [selectedJobId, statusFilter, sortBy, order, minScore, page]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  // Xóa thông báo sau 4 giây
  useEffect(() => {
    if (actionMessage) {
      const timer = setTimeout(() => setActionMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [actionMessage]);

  // Đổi nhanh trạng thái ứng viên
  const handleQuickStatusChange = async (appId: string, newStatus: ApplicationStatus) => {
    setUpdatingId(appId);
    try {
      await updateApplicationStatusApi(appId, newStatus);
      setActionMessage({ text: `Đã cập nhật trạng thái sang "${newStatus}"`, type: 'success' });
      // Cập nhật state nội bộ
      setApplications((prev) =>
        prev.map((app) => (app.id === appId ? { ...app, status: newStatus } : app))
      );
    } catch (err: any) {
      setActionMessage({ text: err.message || 'Cập nhật trạng thái thất bại', type: 'error' });
    } finally {
      setUpdatingId(null);
    }
  };

  // Lọc tìm kiếm client-side theo tên hoặc email
  const filteredApps = useMemo(() => {
    if (!searchQuery.trim()) return applications;
    const q = searchQuery.toLowerCase().trim();
    return applications.filter(
      (app) =>
        app.candidate.fullName.toLowerCase().includes(q) ||
        app.candidate.email.toLowerCase().includes(q) ||
        app.jobPosting?.title.toLowerCase().includes(q)
    );
  }, [applications, searchQuery]);

  return (
    <RoleGuard allowedRoles={['HR', 'ADMIN']}>
      <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">
                  Cổng Tuyển Dụng & Đánh Giá Hồ Sơ
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
                Quản lý Ứng viên & Đơn Ứng tuyển
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Theo dõi, chấm điểm độ phù hợp qua AI và điều phối trạng thái hồ sơ tuyển dụng.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => fetchApplications()}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                title="Làm mới danh sách"
              >
                <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Làm mới
              </button>
            </div>
          </div>

          {/* Toast Notification */}
          {actionMessage && (
            <div
              className={`p-4 rounded-xl text-sm font-medium border flex items-center justify-between shadow-sm animate-fade-in ${
                actionMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
            >
              <span>{actionMessage.text}</span>
              <button
                type="button"
                onClick={() => setActionMessage(null)}
                className="text-xs underline hover:opacity-80"
              >
                Đóng
              </button>
            </div>
          )}

          {/* Thanh Chọn Vị Trí Tuyển Dụng (Job Selector) */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <label className="text-sm font-bold text-slate-800">
                Lọc theo Vị trí Tuyển dụng:
              </label>
              <span className="text-xs text-slate-500">
                Tìm thấy <span className="font-bold text-slate-900">{total}</span> hồ sơ
              </span>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
              <button
                type="button"
                onClick={() => {
                  setSelectedJobId('all');
                  setPage(1);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                  selectedJobId === 'all'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/20'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Tất cả vị trí ({total})
              </button>
              {jobs.map((j) => (
                <button
                  key={j.id}
                  type="button"
                  onClick={() => {
                    setSelectedJobId(j.id);
                    setPage(1);
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                    selectedJobId === j.id
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/20'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {j.title} ({j.totalApplications})
                </button>
              ))}
            </div>
          </div>

          {/* Bộ lọc chi tiết & Tìm kiếm */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Tìm kiếm */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Tìm ứng viên / Email
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Nhập tên hoặc email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                <svg className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* Trạng thái */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Trạng thái hồ sơ
              </label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              >
                <option value="">Tất cả trạng thái</option>
                <option value="SUBMITTED">Mới nộp (SUBMITTED)</option>
                <option value="SCREENING">Đang sàng lọc (SCREENING)</option>
                <option value="SHORTLISTED">Vào danh sách (SHORTLISTED)</option>
                <option value="INTERVIEW_SCHEDULED">Đã lên lịch PV (INTERVIEW_SCHEDULED)</option>
                <option value="INTERVIEWED">Đã phỏng vấn (INTERVIEWED)</option>
                <option value="OFFERED">Đã nhận offer (OFFERED)</option>
                <option value="HIRED">Đã tuyển dụng (HIRED)</option>
                <option value="REJECTED">Không phù hợp (REJECTED)</option>
                <option value="WITHDRAWN">Đã rút đơn (WITHDRAWN)</option>
              </select>
            </div>

            {/* Lọc điểm AI */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Điểm AI Match tối thiểu
              </label>
              <select
                value={minScore === undefined ? '' : String(minScore)}
                onChange={(e) => {
                  setMinScore(e.target.value === '' ? undefined : Number(e.target.value));
                  setPage(1);
                }}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              >
                <option value="">Tất cả mức điểm</option>
                <option value="80">&gt;= 80% (Xuất sắc)</option>
                <option value="70">&gt;= 70% (Phù hợp cao)</option>
                <option value="60">&gt;= 60% (Đạt tiêu chuẩn)</option>
                <option value="50">&gt;= 50% (Trung bình)</option>
              </select>
            </div>

            {/* Sắp xếp */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Sắp xếp theo
              </label>
              <div className="flex gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                >
                  <option value="appliedAt">Ngày nộp đơn</option>
                  <option value="aiMatchScore">Điểm AI Match</option>
                  <option value="updatedAt">Cập nhật gần nhất</option>
                </select>
                <button
                  type="button"
                  onClick={() => setOrder(order === 'desc' ? 'asc' : 'desc')}
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 text-xs font-bold"
                  title={order === 'desc' ? 'Giảm dần' : 'Tăng dần'}
                >
                  {order === 'desc' ? '↓' : '↑'}
                </button>
              </div>
            </div>
          </div>

          {/* Bảng Danh Sách Ứng Viên */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {isLoading ? (
              <div className="py-20 flex flex-col items-center justify-center">
                <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs font-semibold text-slate-500 mt-4">Đang tải danh sách hồ sơ ứng viên...</p>
              </div>
            ) : filteredApps.length === 0 ? (
              <div className="py-16 text-center px-4">
                <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-200">
                  <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-slate-800">Không tìm thấy ứng viên nào</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Chưa có đơn nộp nào khớp với điều kiện lọc hiện tại. Thử chọn vị trí khác hoặc làm mới bộ lọc.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="py-3.5 px-4 sm:px-6">Ứng viên</th>
                      <th className="py-3.5 px-4">Vị trí ứng tuyển</th>
                      <th className="py-3.5 px-4 text-center">AI Match</th>
                      <th className="py-3.5 px-4">Trạng thái</th>
                      <th className="py-3.5 px-4">Ngày nộp</th>
                      <th className="py-3.5 px-4 text-right">Hành động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredApps.map((app) => (
                      <tr
                        key={app.id}
                        className="hover:bg-slate-50/60 transition-colors group"
                      >
                        {/* Ứng viên */}
                        <td className="py-4 px-4 sm:px-6">
                          <div className="flex items-center gap-3">
                            {app.candidate.avatarUrl ? (
                              <img
                                src={app.candidate.avatarUrl}
                                alt={app.candidate.fullName}
                                className="w-10 h-10 rounded-full object-cover border border-slate-200"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm flex items-center justify-center shrink-0">
                                {app.candidate.fullName.charAt(0) || 'U'}
                              </div>
                            )}
                            <div className="min-w-0">
                              <Link
                                href={`/hr/applications/${app.id}`}
                                className="font-bold text-slate-900 hover:text-blue-600 transition-colors truncate block"
                              >
                                {app.candidate.fullName}
                              </Link>
                              <div className="text-xs text-slate-500 truncate">{app.candidate.email}</div>
                              {app.candidate.phone && (
                                <div className="text-[11px] text-slate-400 font-mono">{app.candidate.phone}</div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Vị trí */}
                        <td className="py-4 px-4">
                          <div className="font-semibold text-slate-800 text-xs">
                            {app.jobPosting?.title || 'Vị trí tuyển dụng'}
                          </div>
                          {app.jobPosting?.department && (
                            <div className="text-[11px] text-slate-500">{app.jobPosting.department}</div>
                          )}
                        </td>

                        {/* AI Match Score */}
                        <td className="py-4 px-4 text-center">
                          {app.aiMatchScore !== null && app.aiMatchScore !== undefined ? (
                            <div className="inline-flex flex-col items-center">
                              <span
                                className={`inline-block px-2.5 py-1 rounded-full text-xs border ${getScoreBadgeClass(
                                  app.aiMatchScore
                                )}`}
                              >
                                {app.aiMatchScore.toFixed(1)}%
                              </span>
                              {app.parsedSkills && app.parsedSkills.length > 0 && (
                                <span className="text-[10px] text-slate-400 mt-1">
                                  {app.parsedSkills.length} kỹ năng
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Chờ chấm điểm</span>
                          )}
                        </td>

                        {/* Trạng thái */}
                        <td className="py-4 px-4">
                          <ApplicationStatusBadge status={app.status} size="sm" />
                        </td>

                        {/* Ngày nộp */}
                        <td className="py-4 px-4 text-xs text-slate-500 whitespace-nowrap">
                          {formatDate(app.appliedAt)}
                        </td>

                        {/* Hành động */}
                        <td className="py-4 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            {/* Nút xem file CV */}
                            {app.cvFileUrl && (
                              <a
                                href={`${API_BASE}${app.cvFileUrl}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-slate-200"
                                title="Xem file CV"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              </a>
                            )}

                            {/* Duyệt nhanh SHORTLISTED */}
                            {app.status === 'SUBMITTED' || app.status === 'SCREENING' ? (
                              <button
                                type="button"
                                disabled={updatingId === app.id}
                                onClick={() => handleQuickStatusChange(app.id, 'SHORTLISTED')}
                                className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors disabled:opacity-50"
                                title="Đưa vào danh sách phỏng vấn"
                              >
                                Chọn (Shortlist)
                              </button>
                            ) : null}

                            {/* Xem chi tiết */}
                            <Link
                              href={`/hr/applications/${app.id}`}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-sm"
                            >
                              Chi tiết →
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Phân trang */}
            {totalPages > 1 && (
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  Trang {page} / {totalPages}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 disabled:opacity-40 hover:bg-slate-50"
                  >
                    Trang trước
                  </button>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 disabled:opacity-40 hover:bg-slate-50"
                  >
                    Trang sau
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}
