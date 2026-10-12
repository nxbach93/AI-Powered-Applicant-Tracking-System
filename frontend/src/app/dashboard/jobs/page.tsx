'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { JobPosting, JobStatus } from '@/types/job';
import jobApi from '@/lib/services/job-api';
import { JobStatusBadge } from '@/components/jobs/JobStatusBadge';

export default function HRJobsManagementPage() {
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Bộ lọc
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

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
        search: searchQuery.trim() || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      });

      if (res.success && res.data) {
        setJobs(res.data);
      } else {
        setError(res.error?.message || 'Không thể tải danh sách tin tuyển dụng');
      }
    } catch {
      setError('Lỗi kết nối khi tải danh sách tin tuyển dụng');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, statusFilter]);

  useEffect(() => {
    fetchHRJobs();
  }, [fetchHRJobs]);

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
    } catch (err: any) {
      alert(err.message || 'Lỗi khi cập nhật trạng thái');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Xử lý Xóa tin tuyển dụng an toàn (Safe Delete Rule)
  const handleConfirmDelete = async () => {
    if (!deleteModalJob) return;

    // Kiểm tra nhanh phía client nếu đã có đơn nộp
    if (deleteModalJob._count && deleteModalJob._count.applications > 0) {
      setDeleteError(
        `Không thể xóa vì vị trí này đã có ${deleteModalJob._count.applications} hồ sơ nộp vào. Vui lòng chuyển trạng thái sang Đóng (CLOSED) hoặc Lưu trữ (ARCHIVED) để bảo toàn dữ liệu ứng viên.`
      );
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res = await jobApi.deleteJob(deleteModalJob.id);
      if (res.success) {
        setJobs((prev) => prev.filter((j) => j.id !== deleteModalJob.id));
        showToast('Đã xóa tin tuyển dụng thành công');
        setDeleteModalJob(null);
      } else {
        setDeleteError(
          res.error?.message ||
            'Không thể xóa tin tuyển dụng này do ràng buộc dữ liệu hồ sơ ứng tuyển.'
        );
      }
    } catch (err: any) {
      setDeleteError(err.message || 'Lỗi hệ thống khi xóa tin tuyển dụng');
    } finally {
      setIsDeleting(false);
    }
  };

  // Tính toán KPI Tổng quan
  const totalJobsCount = jobs.length;
  const activeJobsCount = jobs.filter((j) => j.status === 'PUBLISHED').length;
  const draftJobsCount = jobs.filter((j) => j.status === 'DRAFT').length;
  const closedJobsCount = jobs.filter((j) => j.status === 'CLOSED' || j.status === 'ARCHIVED').length;
  const totalApplicationsReceived = jobs.reduce((acc, curr) => acc + (curr._count?.applications || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50/70 pb-20">
      {/* Toast thông báo nổi */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 text-xs font-semibold animate-in slide-in-from-bottom-5">
          <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Quản trị Tuyển dụng */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
                  HR Management Portal
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Quản lý Chiến dịch & Tin tuyển dụng
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Tạo, chỉnh sửa bản mô tả JD và điều phối quy trình tiếp nhận hồ sơ ứng viên
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/jobs"
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-all flex items-center gap-1.5"
              >
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.124 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <span>Xem trang ứng viên</span>
              </Link>

              <Link
                href="/dashboard/jobs/create"
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                <span>Tạo tin mới</span>
              </Link>
            </div>
          </div>

          {/* Thẻ KPI Thống kê Nhanh */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8">
            <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4">
              <span className="text-xs text-slate-500 block mb-1">Tổng chiến dịch</span>
              <span className="text-2xl font-extrabold text-slate-900">{totalJobsCount}</span>
            </div>

            <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4">
              <span className="text-xs text-emerald-700 block mb-1">Đang mở tuyển (Active)</span>
              <span className="text-2xl font-extrabold text-emerald-700">{activeJobsCount}</span>
            </div>

            <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-4">
              <span className="text-xs text-amber-700 block mb-1">Bản nháp (Draft)</span>
              <span className="text-2xl font-extrabold text-amber-700">{draftJobsCount}</span>
            </div>

            <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4">
              <span className="text-xs text-indigo-700 block mb-1">Tổng hồ sơ tiếp nhận</span>
              <span className="text-2xl font-extrabold text-indigo-700">{totalApplicationsReceived}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Thân bảng điều khiển */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Bộ lọc trạng thái & Thanh tìm kiếm */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Tabs chuyển đổi trạng thái */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {[
              { key: 'ALL', label: 'Tất cả' },
              { key: 'PUBLISHED', label: 'Đang mở' },
              { key: 'DRAFT', label: 'Bản nháp' },
              { key: 'CLOSED', label: 'Đã đóng' },
              { key: 'ARCHIVED', label: 'Lưu trữ' },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  statusFilter === tab.key
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Ô tìm kiếm nhanh */}
          <div className="relative min-w-[260px]">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tiêu đề tin..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
            <svg className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Lỗi tải dữ liệu */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center text-red-800 text-xs font-semibold mb-6">
            {error}
          </div>
        )}

        {/* Trạng thái Đang tải */}
        {isLoading && (
          <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-slate-500 font-medium">Đang tải danh sách tin tuyển dụng...</p>
          </div>
        )}

        {/* Trạng thái Trống (Empty) */}
        {!isLoading && !error && jobs.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center max-w-lg mx-auto shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">Chưa có tin tuyển dụng nào</h3>
            <p className="text-xs text-slate-500 mb-6">
              Bạn chưa tạo tin tuyển dụng nào hoặc không có tin nào khớp với bộ lọc hiện tại.
            </p>
            <Link
              href="/dashboard/jobs/create"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              <span>Tạo tin tuyển dụng đầu tiên</span>
            </Link>
          </div>
        )}

        {/* Bảng Dữ liệu Tin Tuyển dụng (Data Table) */}
        {!isLoading && !error && jobs.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-4 px-6">Vị trí tuyển dụng</th>
                    <th className="py-4 px-4">Phòng ban</th>
                    <th className="py-4 px-4">Trạng thái</th>
                    <th className="py-4 px-4 text-center">Hồ sơ ứng tuyển</th>
                    <th className="py-4 px-4">Ngày tạo / Hạn chót</th>
                    <th className="py-4 px-6 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {jobs.map((job) => {
                    const appsCount = job._count?.applications || 0;
                    return (
                      <tr key={job.id} className="hover:bg-slate-50/60 transition-colors group">
                        {/* Cột 1: Tiêu đề */}
                        <td className="py-4 px-6">
                          <div className="font-bold text-slate-900 line-clamp-1 group-hover:text-blue-600 transition-colors">
                            <Link href={`/jobs/${job.id}`}>{job.title}</Link>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                            <span>{job.location || 'Hà Nội'}</span>
                            <span>•</span>
                            <span>{job.employmentType || 'FULL_TIME'}</span>
                          </div>
                        </td>

                        {/* Cột 2: Phòng ban */}
                        <td className="py-4 px-4">
                          <span className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-100 text-slate-700">
                            {job.department || 'Chung'}
                          </span>
                        </td>

                        {/* Cột 3: Trạng thái */}
                        <td className="py-4 px-4">
                          <JobStatusBadge status={job.status} />
                        </td>

                        {/* Cột 4: Số lượng CV */}
                        <td className="py-4 px-4 text-center">
                          <span
                            className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-bold ${
                              appsCount > 0
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-slate-100 text-slate-400'
                            }`}
                          >
                            {appsCount} CV
                          </span>
                        </td>

                        {/* Cột 5: Ngày tháng */}
                        <td className="py-4 px-4 text-slate-500 text-[11px]">
                          <div>
                            Tạo: {new Date(job.createdAt).toLocaleDateString('vi-VN')}
                          </div>
                          {job.applicationDeadline && (
                            <div className="text-slate-700 font-semibold mt-0.5">
                              Hạn: {new Date(job.applicationDeadline).toLocaleDateString('vi-VN')}
                            </div>
                          )}
                        </td>

                        {/* Cột 6: Nút thao tác */}
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Nút Xem chi tiết */}
                            <Link
                              href={`/jobs/${job.id}`}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                              title="Xem chi tiết JD"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.124 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </Link>

                            {/* Nút Đổi trạng thái nhanh */}
                            <button
                              type="button"
                              onClick={() => {
                                setStatusModalJob(job);
                                setSelectedNewStatus(job.status);
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                              title="Đổi trạng thái tin"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                            </button>

                            {/* Nút Sửa tin */}
                            <Link
                              href={`/dashboard/jobs/${job.id}/edit`}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                              title="Chỉnh sửa tin"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </Link>

                            {/* Nút Xóa tin */}
                            <button
                              type="button"
                              onClick={() => {
                                setDeleteModalJob(job);
                                setDeleteError(null);
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              title="Xóa tin tuyển dụng"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* ==================================================================== */}
      {/* MODAL 1: ĐỔI TRẠNG THÁI TIN TUYỂN DỤNG                              */}
      {/* ==================================================================== */}
      {statusModalJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-200 shadow-2xl space-y-5">
            <div>
              <h3 className="text-base font-bold text-slate-900">Thay đổi trạng thái chiến dịch</h3>
              <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                {statusModalJob.title}
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">Chọn trạng thái mới:</label>
              <div className="grid grid-cols-2 gap-2">
                {(['DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED'] as JobStatus[]).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setSelectedNewStatus(st)}
                    className={`p-3 rounded-xl border text-left text-xs font-semibold transition-all ${
                      selectedNewStatus === st
                        ? 'border-blue-600 bg-blue-50 text-blue-700 ring-2 ring-blue-500/20'
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

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setStatusModalJob(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-all"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmStatusChange}
                disabled={isUpdatingStatus}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-200 shadow-2xl space-y-5">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900">Xác nhận xóa tin tuyển dụng</h3>
              <p className="text-xs text-slate-600 mt-1">
                Bạn có chắc chắn muốn xóa tin tuyển dụng <strong>"{deleteModalJob.title}"</strong>?
              </p>
            </div>

            {/* Cảnh báo lỗi Safe Delete Rule nếu vi phạm */}
            {deleteError ? (
              <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs leading-relaxed space-y-1">
                <strong className="font-bold flex items-center gap-1.5 text-red-900">
                  <svg className="w-4 h-4 text-red-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>Chặn xóa an toàn (Safe Delete Rule)</span>
                </strong>
                <p>{deleteError}</p>
              </div>
            ) : (
              <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100">
                Thao tác này chỉ có thể thực hiện nếu tin chưa có bất kỳ ứng viên nào nộp hồ sơ. Dữ liệu sau khi xóa sẽ không thể khôi phục.
              </p>
            )}

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalJob(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-all"
              >
                Đóng
              </button>
              {!deleteError && (
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-sm disabled:opacity-50"
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
