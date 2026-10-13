'use client';

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  ApplicationStatus,
  HrApplicationItem,
  HrJobOverview,
  getHrJobsOverviewApi,
  getApplicationsByJobApi,
  updateApplicationStatusApi,
} from '@/lib/application-api';
import { FilterBar } from '@/components/ui/FilterBar';
import { DataTable } from '@/components/ui/DataTable';

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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
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
      // Reset chọn khi đổi trang hoặc filter
      setSelectedIds([]);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Không thể tải danh sách ứng viên';
      console.error('Lỗi tải danh sách ứng viên:', err);
      setActionMessage({ text: errorMsg, type: 'error' });
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
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Cập nhật trạng thái thất bại';
      setActionMessage({ text: errorMsg, type: 'error' });
    } finally {
      setUpdatingId(null);
    }
  };

  // Chọn/Bỏ chọn một ứng viên
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Chọn tất cả / Bỏ chọn tất cả trang này
  const handleSelectAll = () => {
    if (selectedIds.length === filteredApps.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredApps.map((a) => a.id));
    }
  };

  // Lọc tìm kiếm client-side theo tên, email hoặc tên job
  const filteredApps = useMemo(() => {
    if (!searchQuery.trim()) return applications;
    const q = searchQuery.toLowerCase().trim();
    return applications.filter(
      (app) =>
        app.candidate.fullName.toLowerCase().includes(q) ||
        app.candidate.email.toLowerCase().includes(q) ||
        (app.jobPosting?.title && app.jobPosting.title.toLowerCase().includes(q))
    );
  }, [applications, searchQuery]);

  // Tính toán KPI thực tế từ tập dữ liệu hiện tại
  const kpiStats = useMemo(() => {
    const highMatchCount = applications.filter(
      (a) => a.aiMatchScore !== null && a.aiMatchScore !== undefined && a.aiMatchScore >= 80
    ).length;
    const interviewCount = applications.filter(
      (a) =>
        a.status === 'INTERVIEW_SCHEDULED' ||
        a.status === 'INTERVIEWED' ||
        a.status === 'SHORTLISTED'
    ).length;
    const offerHiredCount = applications.filter(
      (a) => a.status === 'OFFERED' || a.status === 'HIRED'
    ).length;

    return {
      highMatchCount,
      interviewCount,
      offerHiredCount,
      highMatchPercentage: applications.length > 0
        ? Math.round((highMatchCount / applications.length) * 100)
        : 0,
    };
  }, [applications]);

  const handleClearFilters = () => {
    setSelectedJobId('all');
    setStatusFilter('');
    setMinScore(undefined);
    setSearchQuery('');
    setPage(1);
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Top Operational Context & Metric Bar */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Danh sách Ứng viên
            </h1>
            <span className="font-tabular-mono text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold border border-slate-200">
              {total} hồ sơ
            </span>
            <span className="inline-flex items-center gap-1.5 font-medium text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
              Đồng bộ thời gian thực
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Quản lý đường ống ứng viên, kiểm duyệt hồ sơ tải lên và phân tích mức độ phù hợp bằng thuật toán TalentPulse AI Match.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => fetchApplications()}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs sm:text-sm font-semibold shadow-2xs transition-colors disabled:opacity-60"
            title="Tải lại dữ liệu"
          >
            <svg
              className={`w-4 h-4 text-slate-500 ${isLoading ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Làm mới</span>
          </button>

          <Link
            href="/dashboard/jobs/create"
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold shadow-2xs transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>+ Tạo tin tuyển dụng</span>
          </Link>
        </div>
      </div>

      {/* Toast Notification */}
      {actionMessage && (
        <div
          className={`p-3.5 rounded-xl text-xs sm:text-sm font-medium border flex items-center justify-between shadow-2xs ${
            actionMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <span>{actionMessage.text}</span>
          <button
            type="button"
            onClick={() => setActionMessage(null)}
            className="text-xs underline hover:opacity-80 ml-2"
          >
            Đóng
          </button>
        </div>
      )}

      {/* KPI Insights Ribbon (Bento 4-Card Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-center justify-between relative overflow-hidden">
          <div className="flex flex-col">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
              Tổng số hồ sơ
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="font-tabular-mono text-2xl font-extrabold text-slate-900 leading-none">
                {total}
              </span>
              <span className="text-xs text-slate-500">CV</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500/30" />
        </div>

        {/* KPI 2 */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-center justify-between relative overflow-hidden">
          <div className="flex flex-col">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
              Tỷ lệ khớp ≥ 80%
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="font-tabular-mono text-2xl font-extrabold text-emerald-700 leading-none">
                {kpiStats.highMatchCount}
              </span>
              <span className="text-xs text-emerald-600 font-semibold font-tabular-mono">
                ({kpiStats.highMatchPercentage}%)
              </span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500/30" />
        </div>

        {/* KPI 3 */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-center justify-between relative overflow-hidden">
          <div className="flex flex-col">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
              Đang xét / Phỏng vấn
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="font-tabular-mono text-2xl font-extrabold text-amber-700 leading-none">
                {kpiStats.interviewCount}
              </span>
              <span className="text-xs text-slate-500">ứng viên</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500/30" />
        </div>

        {/* KPI 4 */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-center justify-between relative overflow-hidden">
          <div className="flex flex-col">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
              Offer / Tuyển dụng
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="font-tabular-mono text-2xl font-extrabold text-indigo-700 leading-none">
                {kpiStats.offerHiredCount}
              </span>
              <span className="text-xs text-indigo-600 font-semibold">thành công</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500/30" />
        </div>
      </div>

      {/* Filter Bar */}
      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        jobs={jobs}
        selectedJobId={selectedJobId}
        onJobChange={(jobId) => {
          setSelectedJobId(jobId);
          setPage(1);
        }}
        statusFilter={statusFilter}
        onStatusChange={(status) => {
          setStatusFilter(status);
          setPage(1);
        }}
        minScore={minScore}
        onMinScoreChange={(score) => {
          setMinScore(score);
          setPage(1);
        }}
        sortBy={sortBy}
        onSortByChange={(sb) => {
          setSortBy(sb);
          setPage(1);
        }}
        order={order}
        onOrderToggle={() => {
          setOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'));
          setPage(1);
        }}
        onClearFilters={handleClearFilters}
        totalCount={total}
      />

      {/* Candidate Data Table */}
      <DataTable
        data={filteredApps}
        isLoading={isLoading}
        selectedIds={selectedIds}
        onToggleSelect={handleToggleSelect}
        onSelectAll={handleSelectAll}
        onQuickStatusChange={handleQuickStatusChange}
        updatingId={updatingId}
        page={page}
        totalPages={totalPages}
        totalCount={total}
        onPageChange={setPage}
      />
    </div>
  );
}
