'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { RoleGuard } from '@/components/auth/role-guard';
import {
  getMyApplicationsApi,
  ApplicationListItem,
  withdrawApplicationApi,
} from '@/lib/application-api';

const WITHDRAWABLE = new Set(['SUBMITTED', 'SCREENING']);

function CandidateApplicationsContent() {
  const [applications, setApplications] = useState<ApplicationListItem[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'screening' | 'interview' | 'offer' | 'withdrawn'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchApplications = useCallback(async () => {
    try {
      const data = await getMyApplicationsApi();
      setApplications(data);
    } catch {
      setToastMessage('Không thể tải danh sách đơn ứng tuyển');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchApplications();
  };

  const handleWithdraw = async (appId: string, jobTitle: string) => {
    if (!confirm(`Bạn có chắc chắn muốn rút đơn ứng tuyển vị trí "${jobTitle}" không?`)) return;

    setWithdrawingId(appId);
    try {
      await withdrawApplicationApi(appId);
      setToastMessage('Đã rút đơn ứng tuyển thành công');
      await fetchApplications();
    } catch (err: any) {
      setToastMessage(err.message || 'Không thể rút đơn. Vui lòng thử lại');
    } finally {
      setWithdrawingId(null);
    }
  };

  // Metrics
  const totalCount = applications.length;
  const screeningCount = applications.filter((a) => a.status === 'SUBMITTED' || a.status === 'SCREENING' || a.status === 'SHORTLISTED').length;
  const interviewCount = applications.filter((a) => a.status === 'INTERVIEW_SCHEDULED' || a.status === 'INTERVIEWED').length;
  const offerCount = applications.filter((a) => a.status === 'OFFERED' || a.status === 'HIRED').length;
  const withdrawnCount = applications.filter((a) => a.status === 'WITHDRAWN' || a.status === 'REJECTED').length;

  // Filtered List
  const filteredApps = useMemo(() => {
    return applications.filter((app) => {
      // 1. Status Filter
      if (activeFilter === 'screening' && !['SUBMITTED', 'SCREENING', 'SHORTLISTED'].includes(app.status)) return false;
      if (activeFilter === 'interview' && !['INTERVIEW_SCHEDULED', 'INTERVIEWED'].includes(app.status)) return false;
      if (activeFilter === 'offer' && !['OFFERED', 'HIRED'].includes(app.status)) return false;
      if (activeFilter === 'withdrawn' && !['WITHDRAWN', 'REJECTED'].includes(app.status)) return false;

      // 2. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const title = (app.jobPosting?.title || '').toLowerCase();
        const dept = (app.jobPosting?.department || '').toLowerCase();
        if (!title.includes(q) && !dept.includes(q)) return false;
      }

      return true;
    });
  }, [applications, activeFilter, searchQuery]);

  // Stage calculator
  const getStageInfo = (status: string) => {
    switch (status) {
      case 'SUBMITTED':
        return { stage: 1, label: '1/4: Đã nộp hồ sơ' };
      case 'SCREENING':
        return { stage: 2, label: '2/4: AI Sàng lọc' };
      case 'SHORTLISTED':
        return { stage: 2, label: '2/4: Đạt vòng CV' };
      case 'INTERVIEW_SCHEDULED':
      case 'INTERVIEWED':
        return { stage: 3, label: '3/4: Vòng Phỏng vấn' };
      case 'OFFERED':
      case 'HIRED':
        return { stage: 4, label: '4/4: Quyết định Tuyển dụng' };
      case 'REJECTED':
      case 'WITHDRAWN':
      default:
        return { stage: 0, label: 'Đã hoàn tất / Đóng' };
    }
  };

  return (
    <div className="w-full pt-16 bg-background flex-1 text-on-surface">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-space-md px-space-lg py-space-md bg-surface-container-lowest text-on-surface rounded-xl shadow-xl border border-outline-variant/30 animate-in fade-in slide-in-from-bottom-2">
          <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-[18px]">info</span>
          </div>
          <span className="font-body-sm-medium text-body-sm-medium">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="p-1 text-on-surface-variant hover:text-on-surface">
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      <div className="w-full max-w-7xl mx-auto px-gutter-desktop py-space-xl flex flex-col gap-space-xl">
        {/* Top Header Banner & Stats Overview */}
        <div className="flex flex-col gap-space-lg">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md">
            <div className="flex flex-col gap-space-xs">
              <div className="flex items-center gap-space-xs text-primary font-body-sm-medium text-body-sm-medium">
                <span className="material-symbols-outlined text-[18px]">verified_user</span>
                <span>Cổng ứng viên tự phục vụ</span>
                <span>•</span>
                <span className="text-on-surface-variant font-normal">Cập nhật thời gian thực</span>
              </div>
              <h1 className="font-headline-2xl text-headline-2xl text-on-surface tracking-tight font-bold">
                Lịch sử & Tiến trình Ứng tuyển
              </h1>
              <p className="font-body-base text-body-base text-on-surface-variant max-w-3xl">
                Theo dõi trực tiếp trạng thái duyệt hồ sơ, kết quả sàng lọc AI và tiến độ phỏng vấn của từng đơn tuyển dụng tại TalentPulse.
              </p>
            </div>

            <div className="flex items-center gap-space-sm self-start md:self-auto">
              <button
                type="button"
                onClick={handleRefresh}
                className="flex items-center gap-space-xs px-space-md py-2 rounded-xl bg-surface-container-lowest text-on-surface font-body-sm-medium text-body-sm-medium hover:bg-surface-container-low transition-all shadow-sm active:scale-95 border border-outline-variant/30"
              >
                <span
                  className={`material-symbols-outlined text-[18px] text-primary transition-transform duration-500 ${
                    isRefreshing ? 'animate-spin' : ''
                  }`}
                >
                  refresh
                </span>
                <span>Làm mới dữ liệu</span>
              </button>
            </div>
          </div>

          {/* 4 Summary Metric Bento Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
            {/* Metric 1 */}
            <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm border border-outline-variant/30 flex flex-col justify-between gap-space-sm group hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                  Tổng số đơn
                </span>
                <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[18px]">folder_shared</span>
                </div>
              </div>
              <div className="flex items-baseline gap-space-xs">
                <span className="font-headline-2xl text-headline-2xl font-bold text-on-surface">{totalCount}</span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">vị trí đã nộp</span>
              </div>
              <div className="flex items-center gap-space-xs font-label-xs text-label-xs text-tertiary">
                <span className="material-symbols-outlined text-[14px]">trending_up</span>
                <span>Hoạt động ứng tuyển thực tế</span>
              </div>
            </div>

            {/* Metric 2 */}
            <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm border border-outline-variant/30 flex flex-col justify-between gap-space-sm group hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                  Đang sàng lọc AI
                </span>
                <div className="w-8 h-8 rounded-lg bg-secondary-fixed flex items-center justify-center text-on-secondary-fixed">
                  <span className="material-symbols-outlined text-[18px]">psychology</span>
                </div>
              </div>
              <div className="flex items-baseline gap-space-xs">
                <span className="font-headline-2xl text-headline-2xl font-bold text-secondary">
                  {screeningCount}
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">đơn đang đối soát</span>
              </div>
              <div className="flex items-center gap-space-xs font-label-xs text-label-xs text-secondary">
                <span className="material-symbols-outlined text-[14px]">bolt</span>
                <span>FastAPI Microservice v2</span>
              </div>
            </div>

            {/* Metric 3 */}
            <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm border border-outline-variant/30 flex flex-col justify-between gap-space-sm group hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                  Đang phỏng vấn
                </span>
                <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[18px]">event_available</span>
                </div>
              </div>
              <div className="flex items-baseline gap-space-xs">
                <span className="font-headline-2xl text-headline-2xl font-bold text-primary">
                  {interviewCount}
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">vị trí vào vòng trong</span>
              </div>
              <div className="flex items-center gap-space-xs font-label-xs text-label-xs text-primary font-medium">
                <span className="material-symbols-outlined text-[14px]">schedule</span>
                <Link href="/candidate/interviews" className="hover:underline">
                  Xem chi tiết lịch hẹn
                </Link>
              </div>
            </div>

            {/* Metric 4 */}
            <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm border border-outline-variant/30 flex flex-col justify-between gap-space-sm group hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                  Rút đơn / Hoàn tất
                </span>
                <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-outline">
                  <span className="material-symbols-outlined text-[18px]">archive</span>
                </div>
              </div>
              <div className="flex items-baseline gap-space-xs">
                <span className="font-headline-2xl text-headline-2xl font-bold text-on-surface">
                  {withdrawnCount}
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">hồ sơ đóng</span>
              </div>
              <div className="flex items-center gap-space-xs font-label-xs text-label-xs text-outline">
                <span className="material-symbols-outlined text-[14px]">check_circle</span>
                <span>Dữ liệu đã lưu kho an toàn</span>
              </div>
            </div>
          </div>
        </div>

        {/* AI Transparency Callout Notice */}
        <div className="bg-surface-container-low p-space-lg rounded-xl flex items-start gap-space-md shadow-sm border border-outline-variant/20">
          <div className="w-9 h-9 rounded-xl bg-primary-container text-on-primary-container flex items-center justify-center shrink-0 shadow-sm">
            <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
          </div>
          <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">
            <div className="flex flex-col gap-0.5">
              <span className="font-body-base-medium text-body-base-medium text-on-surface font-bold">
                Cơ chế đối soát tự động TalentPulse AI
              </span>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Hệ thống đối soát kỹ năng trong CV của bạn cùng tiêu chuẩn tuyển dụng chi tiết. Điểm khớp năng lực và phản hồi được phân tích tự động từ 24 đến 48 giờ.
              </p>
            </div>
          </div>
        </div>

        {/* Search & Filters Toolstrip */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
          {/* Filter Tabs Group */}
          <div className="flex items-center gap-1.5 p-1 bg-surface-container-high/60 rounded-xl overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              className={`px-space-md py-1.5 rounded-lg font-body-sm-medium text-body-sm-medium transition-all whitespace-nowrap ${
                activeFilter === 'all'
                  ? 'bg-surface-container-lowest text-primary shadow-sm font-semibold'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Tất cả{' '}
              <span className="ml-1 px-1.5 py-0.5 text-[11px] rounded-full bg-primary-fixed text-on-primary-fixed font-bold">
                {totalCount}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('screening')}
              className={`px-space-md py-1.5 rounded-lg font-body-sm text-body-sm transition-all whitespace-nowrap ${
                activeFilter === 'screening'
                  ? 'bg-surface-container-lowest text-primary shadow-sm font-semibold'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Đang sàng lọc{' '}
              <span className="ml-1 px-1.5 py-0.5 text-[11px] rounded-full bg-surface-container text-on-surface-variant font-medium">
                {screeningCount}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('interview')}
              className={`px-space-md py-1.5 rounded-lg font-body-sm text-body-sm transition-all whitespace-nowrap ${
                activeFilter === 'interview'
                  ? 'bg-surface-container-lowest text-primary shadow-sm font-semibold'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Phỏng vấn{' '}
              <span className="ml-1 px-1.5 py-0.5 text-[11px] rounded-full bg-surface-container text-on-surface-variant font-medium">
                {interviewCount}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('offer')}
              className={`px-space-md py-1.5 rounded-lg font-body-sm text-body-sm transition-all whitespace-nowrap ${
                activeFilter === 'offer'
                  ? 'bg-surface-container-lowest text-primary shadow-sm font-semibold'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Nhận Offer{' '}
              <span className="ml-1 px-1.5 py-0.5 text-[11px] rounded-full bg-surface-container text-on-surface-variant font-medium">
                {offerCount}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('withdrawn')}
              className={`px-space-md py-1.5 rounded-lg font-body-sm text-body-sm transition-all whitespace-nowrap ${
                activeFilter === 'withdrawn'
                  ? 'bg-surface-container-lowest text-primary shadow-sm font-semibold'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Đã rút đơn{' '}
              <span className="ml-1 px-1.5 py-0.5 text-[11px] rounded-full bg-surface-container text-on-surface-variant font-medium">
                {withdrawnCount}
              </span>
            </button>
          </div>

          {/* Quick Search Bar */}
          <div className="relative w-full lg:w-80">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-[18px] text-outline">search</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên vị trí, phòng ban..."
              className="w-full h-9 pl-9 pr-8 bg-surface-container-lowest rounded-xl font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-1 focus:ring-primary shadow-sm border border-outline-variant/30"
            />
          </div>
        </div>

        {/* Application Pipeline Cards Stack */}
        <div className="flex flex-col gap-space-lg">
          {isLoading ? (
            <div className="space-y-4 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-44 bg-surface-container-low rounded-xl" />
              ))}
            </div>
          ) : filteredApps.length === 0 ? (
            <div className="bg-surface-container-lowest p-12 rounded-xl text-center space-y-3 border border-outline-variant/30">
              <span className="material-symbols-outlined text-[48px] text-outline">folder_open</span>
              <h3 className="font-headline-lg text-headline-lg font-bold text-on-surface">Chưa có đơn ứng tuyển nào</h3>
              <p className="font-body-base text-body-base text-on-surface-variant max-w-sm mx-auto">
                Khám phá các vị trí tuyển dụng công nghệ cao và bắt đầu nộp hồ sơ ngay hôm nay!
              </p>
              <Link
                href="/jobs"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-on-primary font-body-sm-medium text-body-sm-medium shadow-sm hover:bg-primary-container transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">search</span>
                <span>Tìm việc làm ngay</span>
              </Link>
            </div>
          ) : (
            filteredApps.map((app) => {
              const { stage, label } = getStageInfo(app.status);
              const canWithdraw = WITHDRAWABLE.has(app.status);

              return (
                <div
                  key={app.id}
                  className="bg-surface-container-lowest rounded-xl p-space-lg md:p-space-xl shadow-sm hover:shadow-md transition-shadow flex flex-col gap-space-lg border border-outline-variant/30"
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-space-md">
                    <div className="flex flex-col gap-space-xs">
                      <div className="flex flex-wrap items-center gap-space-xs">
                        <Link
                          href={`/candidate/applications/${app.id}`}
                          className="font-headline-lg text-headline-lg font-bold text-on-surface hover:text-primary transition-colors cursor-pointer"
                        >
                          {app.jobPosting?.title || 'Vị trí tuyển dụng'}
                        </Link>

                        {app.aiMatchScore !== null && app.aiMatchScore !== undefined && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed text-label-xs font-label-xs font-semibold">
                            <span className="material-symbols-outlined text-[13px] text-secondary">verified</span>
                            {app.aiMatchScore.toFixed(0)}% phù hợp AI
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-space-sm font-body-sm text-body-sm text-on-surface-variant">
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[16px]">apartment</span>
                          {app.jobPosting?.department || 'Khối Kỹ thuật Công nghệ'}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[16px]">location_on</span>
                          {app.jobPosting?.location || 'Hà Nội'}
                        </span>
                        <span>•</span>
                        <span className="px-2 py-0.5 rounded bg-surface-container text-on-surface font-body-sm-medium text-body-sm-medium text-[11px]">
                          {app.jobPosting?.employmentType || 'FULL_TIME'}
                        </span>
                        <span>•</span>
                        <span className="text-outline">
                          Nộp ngày: {new Date(app.appliedAt).toLocaleDateString('vi-VN')}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-space-sm self-start">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-high text-on-surface font-body-sm-medium text-body-sm-medium">
                        <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                        {app.status === 'SUBMITTED'
                          ? 'Đã nộp hồ sơ'
                          : app.status === 'SCREENING'
                          ? 'Đang sàng lọc AI'
                          : app.status === 'SHORTLISTED'
                          ? 'Đạt vòng CV'
                          : app.status === 'INTERVIEW_SCHEDULED'
                          ? 'Đã xếp lịch PV'
                          : app.status === 'INTERVIEWED'
                          ? 'Đã phỏng vấn'
                          : app.status === 'OFFERED'
                          ? 'Đã gửi Offer'
                          : app.status === 'HIRED'
                          ? 'Trúng tuyển'
                          : app.status === 'WITHDRAWN'
                          ? 'Đã rút đơn'
                          : app.status === 'REJECTED'
                          ? 'Không đạt'
                          : app.status}
                      </span>
                    </div>
                  </div>

                  {/* 4-Step Recruitment Process Visualizer */}
                  <div className="bg-surface-container-low p-space-md rounded-xl flex flex-col gap-space-sm">
                    <div className="flex items-center justify-between font-label-xs text-label-xs text-on-surface-variant uppercase tracking-wider mb-1">
                      <span>Tiến trình tuyển dụng trực tiếp</span>
                      <span className="text-primary font-bold">{label}</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {/* Step 1 */}
                      <div className="flex flex-col gap-1.5 p-2 rounded-lg bg-surface-container-lowest shadow-sm">
                        <div className="flex items-center justify-between">
                          <span
                            className={`font-label-xs text-label-xs font-semibold flex items-center gap-1 ${
                              stage >= 1 ? 'text-tertiary' : 'text-on-surface-variant'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[14px]">
                              {stage >= 1 ? 'check_circle' : 'radio_button_unchecked'}
                            </span>
                            1. Nộp hồ sơ
                          </span>
                        </div>
                        <div
                          className={`h-1.5 w-full rounded-full ${
                            stage >= 1 ? 'bg-tertiary' : 'bg-surface-container'
                          }`}
                        />
                      </div>

                      {/* Step 2 */}
                      <div className="flex flex-col gap-1.5 p-2 rounded-lg bg-surface-container-lowest shadow-sm">
                        <div className="flex items-center justify-between">
                          <span
                            className={`font-label-xs text-label-xs font-semibold flex items-center gap-1 ${
                              stage >= 2 ? 'text-primary' : 'text-on-surface-variant'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[14px]">
                              {stage >= 2 ? 'psychology' : 'radio_button_unchecked'}
                            </span>
                            2. AI Sàng lọc
                          </span>
                        </div>
                        <div
                          className={`h-1.5 w-full rounded-full ${
                            stage >= 2 ? 'bg-primary' : 'bg-surface-container'
                          }`}
                        />
                      </div>

                      {/* Step 3 */}
                      <div className="flex flex-col gap-1.5 p-2 rounded-lg bg-surface-container-lowest shadow-sm">
                        <div className="flex items-center justify-between">
                          <span
                            className={`font-label-xs text-label-xs font-semibold flex items-center gap-1 ${
                              stage >= 3 ? 'text-secondary' : 'text-on-surface-variant'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[14px]">
                              {stage >= 3 ? 'event_available' : 'radio_button_unchecked'}
                            </span>
                            3. Phỏng vấn
                          </span>
                        </div>
                        <div
                          className={`h-1.5 w-full rounded-full ${
                            stage >= 3 ? 'bg-secondary' : 'bg-surface-container'
                          }`}
                        />
                      </div>

                      {/* Step 4 */}
                      <div className="flex flex-col gap-1.5 p-2 rounded-lg bg-surface-container-lowest shadow-sm">
                        <div className="flex items-center justify-between">
                          <span
                            className={`font-label-xs text-label-xs font-semibold flex items-center gap-1 ${
                              stage >= 4 ? 'text-tertiary' : 'text-on-surface-variant'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[14px]">
                              {stage >= 4 ? 'task_alt' : 'radio_button_unchecked'}
                            </span>
                            4. Quyết định
                          </span>
                        </div>
                        <div
                          className={`h-1.5 w-full rounded-full ${
                            stage >= 4 ? 'bg-tertiary' : 'bg-surface-container'
                          }`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-space-sm pt-space-xs border-t border-outline-variant/20">
                    <span className="font-label-xs text-label-xs text-on-surface-variant font-tabular-mono">
                      Mã hồ sơ: #{app.id.slice(0, 8).toUpperCase()}
                    </span>

                    <div className="flex items-center gap-2">
                      {canWithdraw && (
                        <button
                          type="button"
                          disabled={withdrawingId === app.id}
                          onClick={() => handleWithdraw(app.id, app.jobPosting?.title || 'đơn này')}
                          className="px-3.5 py-1.5 rounded-lg border border-error/30 text-error hover:bg-error-container/30 text-body-sm font-body-sm-medium transition-colors disabled:opacity-50"
                        >
                          {withdrawingId === app.id ? 'Đang rút đơn...' : 'Rút đơn'}
                        </button>
                      )}

                      <Link
                        href={`/candidate/applications/${app.id}`}
                        className="inline-flex items-center gap-1 px-4 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-primary font-body-sm-medium text-body-sm-medium transition-colors"
                      >
                        <span>Xem chi tiết hồ sơ & kết quả AI</span>
                        <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default function CandidateApplicationsPage() {
  return (
    <RoleGuard allowedRoles={['CANDIDATE', 'ADMIN']}>
      <CandidateApplicationsContent />
    </RoleGuard>
  );
}
