'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { RoleGuard } from '@/components/auth/role-guard';
import { ApplicationStatusBadge } from '@/components/candidate/application-status-badge';
import { getMyApplicationsApi, ApplicationListItem, withdrawApplicationApi } from '@/lib/application-api';

const WITHDRAWABLE = new Set(['SUBMITTED', 'SCREENING']);

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-4">
      <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center mb-5 border border-slate-200">
        <svg className="w-9 h-9 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      </div>
      <h3 className="text-base font-bold text-slate-800 mb-2">Chưa có đơn ứng tuyển nào</h3>
      <p className="text-sm text-slate-500 mb-6 max-w-xs">
        Bạn chưa nộp hồ sơ vào vị trí nào. Khám phá các tin tuyển dụng và bắt đầu ứng tuyển ngay!
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-all"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        Tìm việc làm
      </Link>
    </div>
  );
}

function ApplicationCard({ app, onWithdraw }: { app: ApplicationListItem; onWithdraw: (id: string) => void }) {
  const [withdrawing, setWithdrawing] = useState(false);
  const canWithdraw = WITHDRAWABLE.has(app.status);

  const handleWithdraw = async () => {
    if (!confirm(`Bạn có chắc muốn rút đơn ứng tuyển vào "${app.jobPosting.title}" không?`)) return;
    setWithdrawing(true);
    try {
      await withdrawApplicationApi(app.id);
      onWithdraw(app.id);
    } catch (e: any) {
      alert(e.message || 'Không thể rút đơn. Vui lòng thử lại');
    } finally {
      setWithdrawing(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm shadow-slate-100 p-5 hover:shadow-md hover:border-slate-300 transition-all">
      <div className="flex items-start justify-between gap-3">
        {/* Thông tin công việc */}
        <div className="flex-1 min-w-0">
          <Link
            href={`/candidate/applications/${app.id}`}
            className="block group"
          >
            <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
              {app.jobPosting.title}
            </h3>
          </Link>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
            {app.jobPosting.department && (
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                {app.jobPosting.department}
              </span>
            )}
            {app.jobPosting.location && (
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {app.jobPosting.location}
              </span>
            )}
            {app.jobPosting.employmentType && (
              <span className="text-xs text-slate-500">{app.jobPosting.employmentType}</span>
            )}
          </div>
        </div>
        <ApplicationStatusBadge status={app.status} />
      </div>

      {/* AI Score + Interview */}
      <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-slate-100">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-400">Nộp ngày:</span>
          <span className="text-[11px] font-semibold text-slate-600">{formatDate(app.appliedAt)}</span>
        </div>

        {app.aiMatchScore !== null && (
          <div className="flex items-center gap-1.5">
            <div className="w-1 h-1 bg-slate-300 rounded-full" />
            <div className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="text-[11px] font-bold text-amber-600">{app.aiMatchScore}% phù hợp</span>
            </div>
          </div>
        )}

        {app.upcomingInterview && (
          <div className="flex items-center gap-1.5 ml-auto">
            <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
            <span className="text-[11px] font-semibold text-indigo-600">
              Phỏng vấn: {formatDate(app.upcomingInterview.scheduledAt)}
            </span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between mt-3">
        <Link
          href={`/candidate/applications/${app.id}`}
          className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
        >
          Xem chi tiết →
        </Link>
        {canWithdraw && (
          <button
            onClick={handleWithdraw}
            disabled={withdrawing}
            className="text-xs font-medium text-red-500 hover:text-red-700 hover:underline disabled:opacity-50 transition-colors"
          >
            {withdrawing ? 'Đang xử lý...' : 'Rút đơn'}
          </button>
        )}
      </div>
    </div>
  );
}

export default function MyApplicationsPage() {
  const [applications, setApplications] = useState<ApplicationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMyApplicationsApi();
      setApplications(data);
    } catch (e: any) {
      setError(e.message || 'Không thể tải dữ liệu ứng tuyển');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleWithdraw = (id: string) => {
    setApplications(prev => prev.map(a => a.id === id ? { ...a, status: 'WITHDRAWN' as const } : a));
  };

  const STATUS_OPTIONS = [
    { value: 'ALL', label: 'Tất cả' },
    { value: 'SUBMITTED', label: 'Đã nộp' },
    { value: 'SCREENING', label: 'Sàng lọc' },
    { value: 'SHORTLISTED', label: 'Danh sách ngắn' },
    { value: 'INTERVIEWED', label: 'Đã phỏng vấn' },
    { value: 'OFFERED', label: 'Nhận Offer' },
    { value: 'HIRED', label: 'Đã tuyển' },
    { value: 'REJECTED', label: 'Từ chối' },
    { value: 'WITHDRAWN', label: 'Đã rút' },
  ];

  const filtered = statusFilter === 'ALL'
    ? applications
    : applications.filter(a => a.status === statusFilter);

  return (
    <RoleGuard allowedRoles={['CANDIDATE']}>
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-3xl mx-auto px-4 py-8 sm:px-6">
          {/* Header */}
          <div className="mb-6">
            <nav className="text-xs text-slate-500 mb-3 flex items-center gap-1.5">
              <Link href="/" className="hover:text-slate-700">Trang chủ</Link>
              <span>/</span>
              <span className="text-slate-800 font-medium">Hồ sơ ứng tuyển</span>
            </nav>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold text-slate-900">Lịch sử ứng tuyển</h1>
                <p className="text-sm text-slate-500 mt-0.5">
                  {applications.length > 0
                    ? `${applications.length} đơn ứng tuyển`
                    : 'Theo dõi trạng thái các hồ sơ của bạn'}
                </p>
              </div>
              <button
                onClick={load}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50 shadow-sm"
              >
                <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Làm mới
              </button>
            </div>
          </div>

          {/* Filter tabs */}
          {applications.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1 mb-5 scrollbar-hide">
              {STATUS_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  id={`filter-${opt.value.toLowerCase()}`}
                  onClick={() => setStatusFilter(opt.value)}
                  className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    statusFilter === opt.value
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {opt.label}
                  {opt.value !== 'ALL' && (
                    <span className="ml-1 opacity-70">
                      ({applications.filter(a => a.status === opt.value).length})
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Content */}
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 animate-pulse">
                  <div className="h-5 bg-slate-200 rounded w-2/3 mb-2" />
                  <div className="h-3.5 bg-slate-100 rounded w-1/3 mb-4" />
                  <div className="h-3 bg-slate-100 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
              <p className="text-sm text-red-600 font-medium mb-3">{error}</p>
              <button
                onClick={load}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-red-500 hover:bg-red-600"
              >
                Thử lại
              </button>
            </div>
          ) : filtered.length === 0 ? (
            applications.length > 0 ? (
              <div className="text-center py-12 text-slate-500">
                <p className="text-sm">Không có đơn nào ở trạng thái này</p>
              </div>
            ) : (
              <EmptyState />
            )
          ) : (
            <div className="space-y-4">
              {filtered.map(app => (
                <ApplicationCard key={app.id} app={app} onWithdraw={handleWithdraw} />
              ))}
            </div>
          )}
        </div>
      </div>
    </RoleGuard>
  );
}
