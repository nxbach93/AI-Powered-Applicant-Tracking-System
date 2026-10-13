'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { JobPosting, JobStatus } from '@/types/job';
import jobApi from '@/lib/services/job-api';
import { JobStatusBadge } from '@/components/jobs/JobStatusBadge';

export default function HRJobsManagementPage() {
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Bộ lọc & Tìm kiếm
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalJobs, setTotalJobs] = useState<number>(0);

  // Modal Đổi trạng thái
  const [statusModalJob, setStatusModalJob] = useState<JobPosting | null>(null);
  const [selectedNewStatus, setSelectedNewStatus] = useState<JobStatus>('PUBLISHED');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Modal Xóa tin tuyển dụng
  const [deleteModalJob, setDeleteModalJob] = useState<JobPosting | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Thông báo Toast thành công
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchHRJobs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await jobApi.getMyJobs({
        page,
        limit,
        search: searchQuery.trim() || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      });

      if (res.success && res.data) {
        setJobs(res.data);
        if (res.meta) {
          setTotalPages(res.meta.totalPages || 1);
          setTotalJobs(res.meta.total || res.data.length);
        } else {
          setTotalJobs(res.data.length);
          setTotalPages(1);
        }
      } else {
        setError(res.error?.message || 'Không thể tải danh sách tin tuyển dụng');
      }
    } catch {
      setError('Lỗi kết nối máy chủ khi tải danh sách tin tuyển dụng');
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, searchQuery, statusFilter]);

  useEffect(() => {
    fetchHRJobs();
  }, [fetchHRJobs]);

  // Reset trang về 1 khi đổi bộ lọc
  const handleStatusFilterChange = (newStatus: string) => {
    setStatusFilter(newStatus);
    setPage(1);
  };

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setPage(1);
  };

  // Xử lý Cập nhật trạng thái
  const handleConfirmStatusChange = async () => {
    if (!statusModalJob) return;
    setIsUpdatingStatus(true);
    try {
      const res = await jobApi.updateJobStatus(statusModalJob.id, selectedNewStatus);
      if (res.success && res.data) {
        setJobs((prev) =>
          prev.map((j) => (j.id === statusModalJob.id ? { ...j, status: selectedNewStatus } : j))
        );
        showToast(`Đã chuyển trạng thái tin sang "${selectedNewStatus}" thành công`);
        setStatusModalJob(null);
      } else {
        alert(res.error?.message || 'Không thể cập nhật trạng thái');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi cập nhật trạng thái';
      alert(msg);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Xử lý Xóa tin tuyển dụng an toàn (Safe Delete Rule)
  const handleConfirmDelete = async () => {
    if (!deleteModalJob) return;

    if (deleteModalJob._count && deleteModalJob._count.applications > 0) {
      setDeleteError(
        `Không thể xóa vì vị trí này đã tiếp nhận ${deleteModalJob._count.applications} hồ sơ ứng tuyển. Vui lòng chuyển trạng thái sang Đã đóng (CLOSED) hoặc Lưu trữ (ARCHIVED) để bảo toàn dữ liệu đánh giá của ứng viên.`
      );
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res = await jobApi.deleteJob(deleteModalJob.id);
      if (res.success) {
        setJobs((prev) => prev.filter((j) => j.id !== deleteModalJob.id));
        setTotalJobs((prev) => Math.max(0, prev - 1));
        showToast('Đã xóa tin tuyển dụng thành công');
        setDeleteModalJob(null);
      } else {
        setDeleteError(
          res.error?.message ||
            'Không thể xóa tin tuyển dụng này do ràng buộc dữ liệu hồ sơ ứng tuyển.'
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi hệ thống khi xóa tin tuyển dụng';
      setDeleteError(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  // Tính toán KPI Tổng quan
  const summaryMetrics = useMemo(() => {
    const total = totalJobs;
    const active = jobs.filter((j) => j.status === 'PUBLISHED').length;
    const draft = jobs.filter((j) => j.status === 'DRAFT').length;
    const closed = jobs.filter((j) => j.status === 'CLOSED' || j.status === 'ARCHIVED').length;
    const totalApps = jobs.reduce((acc, curr) => acc + (curr._count?.applications || 0), 0);

    return {
      total,
      active,
      draft,
      closed,
      totalApps,
    };
  }, [jobs, totalJobs]);

  // Format mức lương dự kiến
  const formatSalaryDisplay = (min?: number | string | null, max?: number | string | null) => {
    const numMin = min !== null && min !== undefined ? Number(min) : null;
    const numMax = max !== null && max !== undefined ? Number(max) : null;

    if (!numMin && !numMax) return 'Thỏa thuận';

    const toMillions = (val: number) => {
      const m = val / 1_000_000;
      return Number.isInteger(m) ? `${m} tr` : `${m.toFixed(1)} tr`;
    };

    if (numMin && numMax) {
      return `${toMillions(numMin)} - ${toMillions(numMax)} VNĐ`;
    }
    if (numMin) return `Từ ${toMillions(numMin)} VNĐ`;
    if (numMax) return `Tới ${toMillions(numMax)} VNĐ`;
    return 'Thỏa thuận';
  };

  // Format ngày và kiểm tra hết hạn
  const formatDeadlineDisplay = (deadlineIso?: string | null) => {
    if (!deadlineIso) return { text: 'Không thời hạn', isExpired: false, isUrgent: false };
    try {
      const d = new Date(deadlineIso);
      const now = new Date();
      const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const text = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

      return {
        text,
        isExpired: diffDays < 0,
        isUrgent: diffDays >= 0 && diffDays <= 3,
      };
    } catch {
      return { text: deadlineIso, isExpired: false, isUrgent: false };
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Toast thông báo nổi */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-semibold animate-in slide-in-from-bottom-5">
          <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Quản lý Tin tuyển dụng
            </h1>
            <span className="font-tabular-mono text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
              {totalJobs} tin tuyển dụng
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Thiết lập bản mô tả công việc (JD), tiêu chí đánh giá cho AI Screening và quản trị vòng đời chiến dịch tuyển dụng.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <Link
            href="/jobs"
            target="_blank"
            className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-2xs transition-all cursor-pointer"
          >
            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            <span>Trang tìm việc ↗</span>
          </Link>

          <Link
            href="/dashboard/jobs/create"
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold shadow-2xs transition-all cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>+ Tạo tin mới</span>
          </Link>
        </div>
      </div>

      {/* Summary Bento KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* KPI 1: Tổng chiến dịch */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-center justify-between relative overflow-hidden">
          <div className="flex flex-col">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
              Tổng chiến dịch
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="font-tabular-mono text-2xl font-extrabold text-slate-900 leading-none">
                {summaryMetrics.total}
              </span>
              <span className="text-xs text-slate-500">vị trí</span>
            </div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
            <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-300" />
        </div>

        {/* KPI 2: Đang mở tuyển */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-center justify-between relative overflow-hidden">
          <div className="flex flex-col">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
              Đang mở tuyển
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="font-tabular-mono text-2xl font-extrabold text-emerald-600 leading-none">
                {summaryMetrics.active}
              </span>
              <span className="text-xs text-emerald-700 font-medium">active</span>
            </div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500/40" />
        </div>

        {/* KPI 3: Bản nháp */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-center justify-between relative overflow-hidden">
          <div className="flex flex-col">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
              Bản nháp (Draft)
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="font-tabular-mono text-2xl font-extrabold text-amber-600 leading-none">
                {summaryMetrics.draft}
              </span>
              <span className="text-xs text-amber-700 font-medium">nội bộ</span>
            </div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500/40" />
        </div>

        {/* KPI 4: Đã đóng / Lưu trữ */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-center justify-between relative overflow-hidden">
          <div className="flex flex-col">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
              Đã đóng / Lưu trữ
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="font-tabular-mono text-2xl font-extrabold text-slate-700 leading-none">
                {summaryMetrics.closed}
              </span>
              <span className="text-xs text-slate-400">closed</span>
            </div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center">
            <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-400/40" />
        </div>

        {/* KPI 5: Tổng hồ sơ tiếp nhận */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-center justify-between relative overflow-hidden col-span-2 sm:col-span-1">
          <div className="flex flex-col">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
              Tổng hồ sơ đã nhận
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="font-tabular-mono text-2xl font-extrabold text-blue-600 leading-none">
                {summaryMetrics.totalApps}
              </span>
              <span className="text-xs text-blue-700 font-medium">CVs</span>
            </div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500/40" />
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
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
            placeholder="Tìm theo tiêu đề tin, phòng ban..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full h-10 pl-10 pr-10 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 text-xs sm:text-sm focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => handleSearchChange('')}
              className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {[
            { label: 'Tất cả', value: 'ALL' },
            { label: 'Đang mở tuyển', value: 'PUBLISHED' },
            { label: 'Bản nháp', value: 'DRAFT' },
            { label: 'Đã đóng', value: 'CLOSED' },
            { label: 'Lưu trữ', value: 'ARCHIVED' },
          ].map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => handleStatusFilterChange(tab.value)}
              className={`h-9 px-3.5 text-xs font-semibold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                statusFilter === tab.value
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lỗi tải dữ liệu */}
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex justify-between items-center shadow-2xs">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} className="text-rose-700 hover:text-rose-950 font-bold ml-2">
            ✕
          </button>
        </div>
      )}

      {/* Bảng Dữ liệu Tin Tuyển dụng (DataTable) */}
      <div className="rounded-2xl bg-white border border-slate-200/90 shadow-2xs overflow-hidden flex flex-col">
        <div className="overflow-x-auto w-full">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="bg-slate-50/90 text-slate-500 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200 select-none">
                <th className="py-3 px-4 min-w-[240px]">Vị trí tuyển dụng</th>
                <th className="py-3 px-4 min-w-[140px]">Phòng ban</th>
                <th className="py-3 px-4 min-w-[150px]">Mức lương</th>
                <th className="py-3 px-4 min-w-[130px]">Trạng thái</th>
                <th className="py-3 px-4 text-center min-w-[130px]">Hồ sơ ứng tuyển</th>
                <th className="py-3 px-4 min-w-[150px]">Ngày tạo / Hạn chót</th>
                <th className="py-3 px-4 text-right min-w-[140px]">Thao tác</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="py-4 px-4">
                      <div className="space-y-1.5">
                        <div className="h-4 bg-slate-200 rounded w-48" />
                        <div className="h-3 bg-slate-100 rounded w-32" />
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="h-4 bg-slate-200 rounded w-24" />
                    </td>
                    <td className="py-4 px-4">
                      <div className="h-4 bg-slate-200 rounded w-28" />
                    </td>
                    <td className="py-4 px-4">
                      <div className="h-5 bg-slate-200 rounded-full w-24" />
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="h-6 bg-slate-200 rounded-full w-16 mx-auto" />
                    </td>
                    <td className="py-4 px-4">
                      <div className="h-3 bg-slate-200 rounded w-24 mb-1" />
                      <div className="h-3 bg-slate-100 rounded w-20" />
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="h-7 bg-slate-200 rounded w-20 ml-auto" />
                    </td>
                  </tr>
                ))
              ) : jobs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center px-4">
                    <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-slate-200 text-slate-400">
                      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">Không tìm thấy tin tuyển dụng nào</h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      Bạn chưa tạo tin tuyển dụng nào hoặc không có tin nào khớp với bộ lọc hiện tại.
                    </p>
                    <Link
                      href="/dashboard/jobs/create"
                      className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-2xs transition-all"
                    >
                      <span>+ Tạo tin tuyển dụng mới</span>
                    </Link>
                  </td>
                </tr>
              ) : (
                jobs.map((job) => {
                  const appsCount = job._count?.applications || 0;
                  const deadlineInfo = formatDeadlineDisplay(job.applicationDeadline);

                  return (
                    <tr key={job.id} className="hover:bg-slate-50/80 transition-colors group">
                      {/* Vị trí tuyển dụng */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                          <Link href={`/jobs/${job.id}`} target="_blank" className="hover:underline">
                            {job.title}
                          </Link>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                          <span>📍 {job.location || 'Hà Nội'}</span>
                          <span>•</span>
                          <span className="font-medium text-slate-600">{job.employmentType || 'FULL_TIME'}</span>
                        </div>
                      </td>

                      {/* Phòng ban */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200/60">
                          {job.department || 'Chung'}
                        </span>
                      </td>

                      {/* Mức lương */}
                      <td className="py-3.5 px-4">
                        <span className="text-xs font-semibold text-slate-800 font-tabular-mono">
                          {formatSalaryDisplay(job.salaryMin, job.salaryMax)}
                        </span>
                      </td>

                      {/* Trạng thái */}
                      <td className="py-3.5 px-4">
                        <JobStatusBadge status={job.status} />
                      </td>

                      {/* Hồ sơ ứng tuyển */}
                      <td className="py-3.5 px-4 text-center">
                        <Link
                          href={`/hr/applications?jobId=${job.id}`}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold font-tabular-mono transition-all ${
                            appsCount > 0
                              ? 'bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200'
                              : 'bg-slate-100 text-slate-400 border border-slate-200 hover:text-slate-600'
                          }`}
                          title={`Xem danh sách ${appsCount} hồ sơ ứng tuyển`}
                        >
                          <span>{appsCount} CV</span>
                          <span className="text-[10px]">↗</span>
                        </Link>
                      </td>

                      {/* Ngày tạo / Hạn chót */}
                      <td className="py-3.5 px-4 text-xs text-slate-500">
                        <div className="font-tabular-mono">
                          Tạo: {new Date(job.createdAt).toLocaleDateString('vi-VN')}
                        </div>
                        <div className="mt-0.5 flex items-center gap-1.5 font-tabular-mono">
                          <span className={deadlineInfo.isExpired ? 'text-rose-600 font-bold' : 'text-slate-700 font-medium'}>
                            Hạn: {deadlineInfo.text}
                          </span>
                          {deadlineInfo.isExpired && job.status === 'PUBLISHED' && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 font-bold">
                              Hết hạn
                            </span>
                          )}
                          {deadlineInfo.isUrgent && job.status === 'PUBLISHED' && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-bold">
                              Gấp
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Thao tác */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          {/* Xem JD public */}
                          <Link
                            href={`/jobs/${job.id}`}
                            target="_blank"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-200 transition-colors"
                            title="Xem trang JD công khai"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.124 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </Link>

                          {/* Đổi trạng thái */}
                          <button
                            type="button"
                            onClick={() => {
                              setStatusModalJob(job);
                              setSelectedNewStatus(job.status);
                            }}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 border border-transparent hover:border-amber-200 transition-colors cursor-pointer"
                            title="Đổi trạng thái chiến dịch"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          </button>

                          {/* Chỉnh sửa JD */}
                          <Link
                            href={`/dashboard/jobs/${job.id}/edit`}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-200 transition-colors"
                            title="Chỉnh sửa nội dung tin tuyển dụng"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </Link>

                          {/* Xóa tin */}
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteModalJob(job);
                              setDeleteError(null);
                            }}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
                            title="Xóa tin tuyển dụng"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Phân trang (Pagination) */}
        {!isLoading && totalJobs > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-slate-100 bg-slate-50/50">
            <span className="text-xs text-slate-500">
              Hiển thị <span className="font-semibold text-slate-800">{(page - 1) * limit + 1}</span> -{' '}
              <span className="font-semibold text-slate-800">{Math.min(page * limit, totalJobs)}</span> trên tổng số{' '}
              <span className="font-semibold text-slate-800">{totalJobs}</span> tin tuyển dụng
            </span>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                className="h-8 px-3 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                ← Trước
              </button>

              <span className="px-2 text-xs font-semibold text-slate-600 font-tabular-mono">
                {page} / {totalPages}
              </span>

              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                className="h-8 px-3 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Sau →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ==================================================================== */}
      {/* MODAL 1: ĐỔI TRẠNG THÁI CHIẾN DỊCH                                  */}
      {/* ==================================================================== */}
      {statusModalJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-200 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Thay đổi trạng thái chiến dịch</h3>
                <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                  {statusModalJob.title}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStatusModalJob(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">Chọn trạng thái mới:</label>
              <div className="grid grid-cols-2 gap-2">
                {(['DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED'] as JobStatus[]).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setSelectedNewStatus(st)}
                    className={`p-3 rounded-xl border text-left text-xs font-semibold transition-all cursor-pointer ${
                      selectedNewStatus === st
                        ? 'border-blue-600 bg-blue-50 text-blue-700 ring-1 ring-blue-500/30'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div>{st}</div>
                    <div className="text-[10px] font-normal text-slate-500 mt-0.5">
                      {st === 'PUBLISHED' && 'Công khai nhận CV'}
                      {st === 'DRAFT' && 'Lưu nháp nội bộ'}
                      {st === 'CLOSED' && 'Tạm dừng nhận CV'}
                      {st === 'ARCHIVED' && 'Kết thúc đợt'}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStatusModalJob(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmStatusChange}
                disabled={isUpdatingStatus}
                className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-2xs disabled:opacity-50 cursor-pointer"
              >
                {isUpdatingStatus ? 'Đang cập nhật...' : 'Xác nhận đổi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 2: XÓA TIN TUYỂN DỤNG & SAFE DELETE RULE                       */}
      {/* ==================================================================== */}
      {deleteModalJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-200 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Xác nhận xóa tin tuyển dụng</h3>
                <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                  "{deleteModalJob.title}"
                </p>
              </div>
            </div>

            {/* Cảnh báo Safe Delete Rule nếu vi phạm */}
            {deleteError ? (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs leading-relaxed space-y-1">
                <strong className="font-bold flex items-center gap-1.5 text-rose-900">
                  <svg className="w-4 h-4 text-rose-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>Chặn xóa an toàn (Safe Delete Rule)</span>
                </strong>
                <p>{deleteError}</p>
              </div>
            ) : (
              <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                Thao tác này chỉ có thể thực hiện nếu tin chưa có bất kỳ ứng viên nào nộp hồ sơ. Dữ liệu sau khi xóa sẽ không thể khôi phục.
              </p>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteModalJob(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Đóng
              </button>
              {!deleteError && (
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-2xs disabled:opacity-50 cursor-pointer"
                >
                  {isDeleting ? 'Đang xóa...' : 'Xác nhận xóa'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
