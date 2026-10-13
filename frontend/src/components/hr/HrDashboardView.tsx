'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  HrDashboardStats,
  getDashboardStatsApi,
  updateApplicationStatusApi,
  ApplicationStatus,
} from '@/lib/application-api';

function formatRelativeTime(dateIso: string): string {
  try {
    const d = new Date(dateIso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Vừa xong';
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays === 1) return 'Hôm qua';
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  } catch {
    return dateIso;
  }
}

export function HrDashboardView() {
  const router = useRouter();

  const [timeRange, setTimeRange] = useState<string>('7d');
  const [showTimeDropdown, setShowTimeDropdown] = useState(false);
  const [stats, setStats] = useState<HrDashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchDashboardData = useCallback(async (range: string) => {
    setIsLoading(true);
    try {
      const data = await getDashboardStatsApi(range);
      setStats(data);
    } catch (err: unknown) {
      console.error('Lỗi tải dữ liệu dashboard:', err);
      showToast('Không thể tải số liệu thống kê thời gian thực');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData(timeRange);
  }, [timeRange, fetchDashboardData]);

  // Quick action from recent candidates table
  const handleApproveCandidate = async (appId: string) => {
    try {
      await updateApplicationStatusApi(appId, 'SHORTLISTED');
      showToast('Đã duyệt hồ sơ vào danh sách Sơ tuyển Phỏng vấn');
      fetchDashboardData(timeRange);
    } catch {
      showToast('Lỗi khi duyệt hồ sơ');
    }
  };

  const handleRejectCandidate = async (appId: string) => {
    try {
      await updateApplicationStatusApi(appId, 'REJECTED');
      showToast('Đã chuyển hồ sơ sang trạng thái Từ chối');
      fetchDashboardData(timeRange);
    } catch {
      showToast('Lỗi khi từ chối hồ sơ');
    }
  };

  const timeRangeLabel =
    timeRange === '7d'
      ? '7 ngày qua'
      : timeRange === '30d'
      ? '30 ngày qua'
      : timeRange === '90d'
      ? '90 ngày qua'
      : 'Toàn thời gian';

  // Export report summary
  const handleExportReport = () => {
    if (!stats) return;
    const csvContent =
      '\uFEFFChỉ số,Giá trị\n' +
      `Vị trí đang mở,${stats.kpis.openJobs}\n` +
      `Hồ sơ tiếp nhận mới,${stats.kpis.newApplications}\n` +
      `Điểm tương đồng AI TB,${stats.kpis.avgAiScore}%\n` +
      `Đã tuyển dụng,${stats.kpis.hiredCount}\n` +
      `Thời gian tuyển dụng TB,${stats.kpis.avgTimeToHire} ngày\n` +
      `Khoảng thời gian,${timeRangeLabel}\n`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `talentpulse_recruitment_report_${timeRange}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Đã xuất báo cáo tổng quan tuyển dụng CSV');
  };

  const kpis = stats?.kpis || {
    openJobs: 14,
    newApplications: 186,
    avgAiScore: 84.6,
    avgTimeToHire: 18.5,
    hiredCount: 5,
  };

  const pipelineStages = stats?.pipeline?.stages || [
    { name: 'Ứng tuyển', count: 64, rate: '100%', title: 'Ứng tuyển' },
    { name: 'Sàng lọc AI', count: 42, rate: '65.6%', title: 'Sàng lọc AI' },
    { name: 'Phỏng vấn', count: 18, rate: '42.8%', title: 'Phỏng vấn' },
    { name: 'Đề xuất Offer', count: 8, rate: '87.5%', title: 'Đề xuất Offer' },
    { name: 'Đã tuyển dụng', count: 5, rate: '100%', title: 'Đã tuyển dụng' },
  ];

  const totalInPipeline = stats?.pipeline?.totalInPipeline || 137;

  return (
    <div className="flex flex-col w-full">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl bg-slate-900 text-white shadow-xl flex items-center gap-2.5 text-xs font-semibold animate-in slide-in-from-bottom-5">
          <span className="material-symbols-outlined text-[18px] text-tertiary">info</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Command & Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-lg mb-space-xl pb-space-sm">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-xs text-label-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse"></span>
              Dữ liệu thời gian thực
            </span>
            <span className="font-label-xs text-label-xs text-outline font-tabular-mono">
              Cập nhật: {new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <h1 className="font-headline-2xl text-headline-2xl text-on-background tracking-tight">
            Tổng quan tuyển dụng
          </h1>
          <p className="font-body-base text-body-base text-on-surface-variant mt-0.5">
            Tiến độ quy trình tuyển dụng và hiệu năng sàng lọc tự động bằng AI
          </p>
        </div>

        {/* Toolbar Filters & CTAs */}
        <div className="flex flex-wrap items-center gap-space-sm">
          {/* Time Filter Dropdown */}
          <div className="relative">
            <button
              id="dateRangeBtn"
              type="button"
              onClick={() => setShowTimeDropdown(!showTimeDropdown)}
              className="inline-flex items-center gap-2 h-9 px-space-md rounded-xl bg-surface-container-lowest text-on-surface hover:bg-surface-container font-body-sm-medium text-body-sm-medium shadow-sm transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px] text-outline">calendar_today</span>
              <span>{timeRangeLabel}</span>
              <span className="material-symbols-outlined text-[16px] text-outline">expand_more</span>
            </button>

            {showTimeDropdown && (
              <div className="absolute right-0 mt-1 z-30 w-44 bg-surface-container-lowest rounded-xl shadow-xl border border-outline-variant/60 py-1.5 animate-in fade-in zoom-in-95 duration-100">
                {[
                  { label: '7 ngày qua', val: '7d' },
                  { label: '30 ngày qua', val: '30d' },
                  { label: '90 ngày qua', val: '90d' },
                  { label: 'Toàn thời gian', val: 'all' },
                ].map((item) => (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => {
                      setTimeRange(item.val);
                      setShowTimeDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-body-sm hover:bg-surface-container-low transition-colors ${
                      timeRange === item.val ? 'text-primary font-bold' : 'text-on-surface'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleExportReport}
            className="inline-flex items-center gap-1.5 h-9 px-space-md rounded-xl bg-surface-container-lowest text-on-surface hover:bg-surface-container font-body-sm-medium text-body-sm-medium shadow-sm transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px] text-outline">file_download</span>
            <span>Xuất báo cáo</span>
          </button>

          <Link
            href="/jobs"
            target="_blank"
            className="inline-flex items-center gap-1.5 h-9 px-space-md rounded-xl bg-primary hover:bg-primary-container text-on-primary font-body-sm-medium text-body-sm-medium shadow-sm transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            <span>+ Thêm ứng viên mới</span>
          </Link>
        </div>
      </div>

      {/* KPI Metrics Strip (Bento 4-Card Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-lg mb-space-xl">
        {/* KPI 1: Vị trí đang mở */}
        <Link
          href="/dashboard/jobs"
          className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow cursor-pointer"
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="font-label-xs text-label-xs uppercase tracking-wider text-outline font-semibold">
                Vị trí đang mở
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-headline-2xl text-[28px] font-bold text-on-background font-tabular-mono leading-none">
                  {kpis.openJobs}
                </span>
                <span className="font-label-xs text-label-xs text-outline">vị trí</span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-lg bg-surface-container-low flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-[20px]">badge</span>
            </div>
          </div>
          <div className="mt-4 pt-3 flex items-center justify-between text-on-surface-variant font-label-sm text-label-sm">
            <span className="inline-flex items-center gap-1 text-tertiary font-semibold font-tabular-mono">
              <span className="material-symbols-outlined text-[16px]">trending_up</span>
              +2 vị trí
            </span>
            <span className="text-outline">so với tuần trước</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary/20"></div>
        </Link>

        {/* KPI 2: Hồ sơ tiếp nhận mới */}
        <Link
          href="/hr/applications"
          className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow cursor-pointer"
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="font-label-xs text-label-xs uppercase tracking-wider text-outline font-semibold">
                Hồ sơ tiếp nhận mới
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-headline-2xl text-[28px] font-bold text-on-background font-tabular-mono leading-none">
                  {kpis.newApplications}
                </span>
                <span className="font-label-xs text-label-xs text-outline">CV</span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-lg bg-surface-container-low flex items-center justify-center text-secondary group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-[20px]">description</span>
            </div>
          </div>
          <div className="mt-4 pt-3 flex items-center justify-between text-on-surface-variant font-label-sm text-label-sm">
            <span className="inline-flex items-center gap-1 text-tertiary font-semibold font-tabular-mono">
              <span className="material-symbols-outlined text-[16px]">arrow_upward</span>
              +24%
            </span>
            <span className="text-outline">tăng trưởng tháng</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-secondary/20"></div>
        </Link>

        {/* KPI 3: Điểm tương đồng AI TB */}
        <Link
          href="/hr/applications"
          className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow cursor-pointer"
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="font-label-xs text-label-xs uppercase tracking-wider text-outline font-semibold">
                Điểm tương đồng AI TB
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-headline-2xl text-[28px] font-bold text-primary font-tabular-mono leading-none">
                  {kpis.avgAiScore}%
                </span>
                <span className="font-label-xs text-label-xs text-tertiary font-semibold">Tối ưu</span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-lg bg-surface-container-low flex items-center justify-center text-secondary group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
            </div>
          </div>
          <div className="mt-4 pt-3 flex items-center justify-between text-on-surface-variant font-label-sm text-label-sm">
            <span className="inline-flex items-center gap-1 text-outline">
              <span className="material-symbols-outlined text-[15px] text-tertiary">check_circle</span>
              Chính xác 98.2%
            </span>
            <span className="text-outline">Khớp hồ sơ tự động</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-tertiary/30"></div>
        </Link>

        {/* KPI 4: Thời gian tuyển dụng */}
        <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <span className="font-label-xs text-label-xs uppercase tracking-wider text-outline font-semibold">
                Thời gian tuyển dụng (TTH)
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-headline-2xl text-[28px] font-bold text-on-background font-tabular-mono leading-none">
                  {kpis.avgTimeToHire}
                </span>
                <span className="font-label-xs text-label-xs text-outline">ngày</span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-lg bg-surface-container-low flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[20px]">hourglass_top</span>
            </div>
          </div>
          <div className="mt-4 pt-3 flex items-center justify-between text-on-surface-variant font-label-sm text-label-sm">
            <span className="inline-flex items-center gap-1 text-tertiary font-semibold font-tabular-mono">
              <span className="material-symbols-outlined text-[16px]">speed</span>
              -3.2 ngày
            </span>
            <span className="text-outline">vượt chỉ tiêu quý</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary/20"></div>
        </div>
      </div>

      {/* Recruitment Funnel & Pipeline Overview */}
      <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm mb-space-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm mb-space-md">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-primary">account_tree</span>
            <h2 className="font-headline-lg text-headline-lg text-on-background">Phễu ứng viên &amp; Tiến độ tuyển dụng</h2>
          </div>
          <div className="flex items-center gap-space-md text-label-xs font-label-xs text-outline">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-primary"></span>
              Đang xử lý
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-tertiary"></span>
              Hoàn tất tuyển
            </span>
            <span className="font-tabular-mono font-semibold text-on-surface">
              Tổng: {totalInPipeline} hồ sơ trong phễu
            </span>
          </div>
        </div>

        {/* Segmented Progression Strip */}
        <div className="relative w-full mb-space-md">
          <div className="grid grid-cols-5 gap-1.5 h-2.5 rounded-full bg-surface-container-low p-0.5 overflow-hidden">
            <div className="bg-primary rounded-full transition-all duration-500" style={{ width: '100%' }} title={`Ứng tuyển (${pipelineStages[0].count})`}></div>
            <div className="bg-secondary rounded-full transition-all duration-500" style={{ width: '100%' }} title={`Sàng lọc AI (${pipelineStages[1].count})`}></div>
            <div className="bg-primary-container rounded-full transition-all duration-500" style={{ width: '100%' }} title={`Phỏng vấn (${pipelineStages[2].count})`}></div>
            <div className="bg-secondary-container rounded-full transition-all duration-500" style={{ width: '100%' }} title={`Đề xuất Offer (${pipelineStages[3].count})`}></div>
            <div className="bg-tertiary rounded-full transition-all duration-500" style={{ width: '100%' }} title={`Đã tuyển dụng (${pipelineStages[4].count})`}></div>
          </div>
        </div>

        {/* Pipeline Stages Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-space-sm">
          {/* Stage 1 */}
          <Link
            href="/hr/applications"
            className="p-space-md rounded-xl bg-surface-container-low/60 hover:bg-surface-container-low transition-colors block cursor-pointer"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-label-xs text-label-xs font-semibold text-outline uppercase">Bước 1</span>
              <span className="material-symbols-outlined text-[16px] text-outline">inbox</span>
            </div>
            <div className="font-body-base-medium text-body-base-medium text-on-surface truncate">Ứng tuyển</div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="font-headline-xl text-headline-xl font-bold font-tabular-mono text-on-surface">
                {pipelineStages[0].count}
              </span>
              <span className="font-label-xs text-label-xs text-outline">hồ sơ</span>
            </div>
            <div className="mt-2 text-label-xs font-label-xs text-outline font-tabular-mono flex items-center justify-between">
              <span>Tỉ lệ chuyển đổi</span>
              <span className="text-on-surface-variant font-semibold">100%</span>
            </div>
          </Link>

          {/* Stage 2 */}
          <Link
            href="/hr/applications?status=SCREENING"
            className="p-space-md rounded-xl bg-surface-container-low/60 hover:bg-surface-container-low transition-colors block cursor-pointer"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-label-xs text-label-xs font-semibold text-secondary uppercase">Bước 2 · AI</span>
              <span className="material-symbols-outlined text-[16px] text-secondary">auto_awesome</span>
            </div>
            <div className="font-body-base-medium text-body-base-medium text-on-surface truncate">Sàng lọc AI</div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="font-headline-xl text-headline-xl font-bold font-tabular-mono text-secondary">
                {pipelineStages[1].count}
              </span>
              <span className="font-label-xs text-label-xs text-outline">đạt chuẩn</span>
            </div>
            <div className="mt-2 text-label-xs font-label-xs text-outline font-tabular-mono flex items-center justify-between">
              <span>Tỷ lệ đạt</span>
              <span className="text-on-surface-variant font-semibold">{pipelineStages[1].rate}</span>
            </div>
          </Link>

          {/* Stage 3 */}
          <Link
            href="/hr/applications?status=INTERVIEW_SCHEDULED"
            className="p-space-md rounded-xl bg-surface-container-low/60 hover:bg-surface-container-low transition-colors block cursor-pointer"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-label-xs text-label-xs font-semibold text-outline uppercase">Bước 3</span>
              <span className="material-symbols-outlined text-[16px] text-outline">groups</span>
            </div>
            <div className="font-body-base-medium text-body-base-medium text-on-surface truncate">Phỏng vấn</div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="font-headline-xl text-headline-xl font-bold font-tabular-mono text-on-surface">
                {pipelineStages[2].count}
              </span>
              <span className="font-label-xs text-label-xs text-outline">ứng viên</span>
            </div>
            <div className="mt-2 text-label-xs font-label-xs text-outline font-tabular-mono flex items-center justify-between">
              <span>Tiếp tục vòng sau</span>
              <span className="text-on-surface-variant font-semibold">{pipelineStages[2].rate}</span>
            </div>
          </Link>

          {/* Stage 4 */}
          <Link
            href="/hr/applications?status=OFFERED"
            className="p-space-md rounded-xl bg-surface-container-low/60 hover:bg-surface-container-low transition-colors block cursor-pointer"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-label-xs text-label-xs font-semibold text-outline uppercase">Bước 4</span>
              <span className="material-symbols-outlined text-[16px] text-outline">handshake</span>
            </div>
            <div className="font-body-base-medium text-body-base-medium text-on-surface truncate">Đề xuất Offer</div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="font-headline-xl text-headline-xl font-bold font-tabular-mono text-on-surface">
                {pipelineStages[3].count}
              </span>
              <span className="font-label-xs text-label-xs text-outline">chờ duyệt</span>
            </div>
            <div className="mt-2 text-label-xs font-label-xs text-outline font-tabular-mono flex items-center justify-between">
              <span>Chấp nhận</span>
              <span className="text-tertiary font-semibold">{pipelineStages[3].rate}</span>
            </div>
          </Link>

          {/* Stage 5 */}
          <Link
            href="/hr/applications?status=HIRED"
            className="p-space-md rounded-xl bg-tertiary-container/10 hover:bg-tertiary-container/15 transition-colors block cursor-pointer"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-label-xs text-label-xs font-semibold text-tertiary uppercase">Thành công</span>
              <span className="material-symbols-outlined text-[16px] text-tertiary">check_circle</span>
            </div>
            <div className="font-body-base-medium text-body-base-medium text-on-surface truncate">Đã tuyển dụng</div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="font-headline-xl text-headline-xl font-bold font-tabular-mono text-tertiary">
                {pipelineStages[4].count}
              </span>
              <span className="font-label-xs text-label-xs text-outline">nhân sự</span>
            </div>
            <div className="mt-2 text-label-xs font-label-xs text-tertiary font-tabular-mono flex items-center justify-between">
              <span>Tỉ lệ Onboarding</span>
              <span className="font-semibold">{pipelineStages[4].rate}</span>
            </div>
          </Link>
        </div>
      </div>

      {/* Two-Column Operational Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
        {/* Left Column (60%): Candidate Approval Queue */}
        <section className="lg:col-span-7 flex flex-col gap-space-lg">
          <div className="rounded-xl bg-surface-container-lowest shadow-sm overflow-hidden">
            <div className="p-space-lg flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm bg-surface-container-lowest">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-headline-lg text-headline-lg text-on-background">
                    Hồ sơ ứng tuyển mới nhất cần duyệt
                  </h2>
                  <span className="px-2 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed font-label-xs text-label-xs font-semibold font-tabular-mono">
                    {stats?.recentApplications?.length || 0} hồ sơ
                  </span>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                  Sắp xếp theo độ phù hợp phân tích bởi mô hình AI TalentPulse
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <Link
                  href="/hr/applications"
                  className="p-1.5 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container transition-colors"
                  title="Xem toàn bộ danh sách"
                >
                  <span className="material-symbols-outlined text-[18px]">filter_list</span>
                </Link>
                <button
                  onClick={() => fetchDashboardData(timeRange)}
                  className="p-1.5 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
                  title="Tải lại"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[18px]">refresh</span>
                </button>
              </div>
            </div>

            {/* Candidate Tabular List */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low/70 text-outline font-label-xs text-label-xs uppercase tracking-wider font-semibold">
                    <th className="py-2.5 px-space-md">Ứng viên &amp; Vị trí</th>
                    <th className="py-2.5 px-space-md">Độ khớp AI</th>
                    <th className="py-2.5 px-space-md">Kỹ năng cốt lõi</th>
                    <th className="py-2.5 px-space-md text-right">Thời gian</th>
                    <th className="py-2.5 px-space-md text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container">
                  {isLoading ? (
                    Array.from({ length: 3 }).map((_, idx) => (
                      <tr key={idx} className="animate-pulse">
                        <td className="py-4 px-space-md">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-surface-container-high" />
                            <div className="space-y-1.5">
                              <div className="h-3.5 bg-surface-container-high rounded w-28" />
                              <div className="h-3 bg-surface-container rounded w-36" />
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-space-md">
                          <div className="h-6 bg-surface-container-high rounded-full w-20" />
                        </td>
                        <td className="py-4 px-space-md">
                          <div className="h-4 bg-surface-container rounded w-24" />
                        </td>
                        <td className="py-4 px-space-md text-right">
                          <div className="h-3.5 bg-surface-container rounded w-16 ml-auto" />
                        </td>
                        <td className="py-4 px-space-md text-right">
                          <div className="h-6 bg-surface-container rounded w-20 ml-auto" />
                        </td>
                      </tr>
                    ))
                  ) : !stats?.recentApplications || stats.recentApplications.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-outline">
                        Chưa có hồ sơ mới cần duyệt trong khoảng thời gian này.
                      </td>
                    </tr>
                  ) : (
                    stats.recentApplications.map((cand) => {
                      const score = cand.aiMatchScore ? Math.round(cand.aiMatchScore) : null;
                      const initials = cand.candidateName
                        ? cand.candidateName
                            .split(' ')
                            .filter(Boolean)
                            .slice(-2)
                            .map((w) => w[0]?.toUpperCase())
                            .join('')
                        : 'UV';

                      return (
                        <tr key={cand.id} className="hover:bg-surface-container-low/40 transition-colors group">
                          <td className="py-space-md px-space-md">
                            <div className="flex items-center gap-space-sm">
                              <div className="relative w-10 h-10 rounded-full overflow-hidden bg-primary-fixed flex-shrink-0 flex items-center justify-center font-bold text-primary text-sm">
                                {initials}
                              </div>
                              <div className="min-w-0">
                                <Link
                                  href={`/hr/applications/${cand.id}`}
                                  className="font-body-base-medium text-body-base-medium text-on-surface truncate group-hover:text-primary transition-colors block font-semibold"
                                >
                                  {cand.candidateName}
                                </Link>
                                <div className="font-label-sm text-label-sm text-outline truncate">
                                  {cand.jobTitle}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="py-space-md px-space-md">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-tertiary-fixed/30 text-on-tertiary-fixed-variant font-label-xs text-label-xs font-semibold font-tabular-mono">
                              <span className="material-symbols-outlined text-[14px] text-tertiary">verified</span>
                              {score !== null ? `${score}% Khớp` : '--'}
                            </span>
                          </td>

                          <td className="py-space-md px-space-md">
                            <div className="flex flex-wrap gap-1 max-w-[200px]">
                              {cand.parsedSkills.slice(0, 3).map((skill, sIdx) => (
                                <span
                                  key={sIdx}
                                  className="px-1.5 py-0.5 rounded bg-surface-container text-on-surface-variant font-label-xs text-[10px]"
                                >
                                  {skill}
                                </span>
                              ))}
                            </div>
                          </td>

                          <td className="py-space-md px-space-md text-right font-tabular-mono font-label-sm text-label-sm text-outline">
                            {formatRelativeTime(cand.appliedAt)}
                          </td>

                          <td className="py-space-md px-space-md text-right">
                            <div className="inline-flex items-center gap-1">
                              <Link
                                href={`/hr/applications/${cand.id}`}
                                className="px-2 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-xs text-label-xs font-semibold transition-colors"
                              >
                                Xem
                              </Link>
                              <button
                                type="button"
                                onClick={() => handleApproveCandidate(cand.id)}
                                className="px-2 py-1 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-label-xs text-label-xs font-semibold transition-colors cursor-pointer"
                                title="Duyệt lịch phỏng vấn"
                              >
                                Duyệt
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRejectCandidate(cand.id)}
                                className="p-1 rounded-lg hover:bg-error-container/20 text-outline hover:text-error transition-colors cursor-pointer"
                                title="Từ chối"
                              >
                                <span className="material-symbols-outlined text-[16px]">close</span>
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

            {/* Card Footer */}
            <div className="p-space-md bg-surface-container-low/40 flex items-center justify-between text-label-sm font-label-sm text-outline">
              <div className="flex items-center gap-1">
                <span>Hiển thị {stats?.recentApplications?.length || 0} ứng viên mới nhất</span>
              </div>
              <Link
                href="/hr/applications"
                className="inline-flex items-center gap-1 text-primary hover:underline font-body-sm-medium"
              >
                <span>Xem toàn bộ danh sách</span>
                <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              </Link>
            </div>
          </div>

          {/* Quick AI Candidate Insights Banner */}
          <div className="p-space-lg rounded-xl bg-gradient-to-br from-surface-container-lowest to-surface-container-low shadow-sm">
            <div className="flex items-start gap-space-md">
              <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-on-secondary flex-shrink-0">
                <span className="material-symbols-outlined text-[22px]">insights</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-headline-lg text-headline-lg text-on-background">Tối ưu hóa nguồn tuyển dụng</h3>
                  <span className="px-2 py-0.5 rounded bg-tertiary-fixed text-on-tertiary-fixed font-label-xs text-[10px] font-semibold">
                    Tự động
                  </span>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 leading-relaxed">
                  Cổng tuyển dụng và LinkedIn đang mang lại tỷ lệ ứng viên vượt qua vòng lọc CV cao nhất (chiếm 68%). Bạn có muốn tự động gia tăng ngân sách quảng bá tin tuyển dụng cho vị trí <span className="font-semibold text-on-surface">Senior Fullstack</span> không?
                </p>
                <div className="mt-3 flex items-center gap-space-sm">
                  <Link
                    href="/dashboard/jobs"
                    className="px-space-md py-1.5 rounded-lg bg-secondary hover:bg-secondary-container text-on-secondary font-label-xs text-label-xs font-semibold transition-colors inline-block"
                  >
                    Xem vị trí tuyển dụng
                  </Link>
                  <button
                    type="button"
                    onClick={() => showToast('Đã lưu đề xuất để xem xét sau')}
                    className="px-space-md py-1.5 rounded-lg text-outline hover:text-on-surface font-label-xs text-label-xs transition-colors cursor-pointer"
                  >
                    Để sau
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Right Column (40%): Interviews Today & AI Action Alerts */}
        <aside className="lg:col-span-5 flex flex-col gap-space-lg">
          {/* Interview Schedule Today */}
          <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm">
            <div className="flex items-center justify-between mb-space-md">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-primary">calendar_today</span>
                <h2 className="font-headline-lg text-headline-lg text-on-background">Lịch phỏng vấn sắp tới</h2>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-label-xs text-label-xs font-semibold font-tabular-mono">
                {stats?.todayInterviews?.length || 0} ca
              </span>
            </div>

            <div className="space-y-space-md">
              {!stats?.todayInterviews || stats.todayInterviews.length === 0 ? (
                <div className="p-space-md rounded-xl bg-surface-container-low text-center text-outline text-body-sm">
                  Chưa có lịch phỏng vấn nào sắp tới.
                </div>
              ) : (
                stats.todayInterviews.map((item, idx) => {
                  const d = new Date(item.scheduledAt);
                  const timeFormatted = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

                  return (
                    <div key={item.id} className="p-space-md rounded-xl bg-surface-container-low/70 hover:bg-surface-container transition-all">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-tabular-mono font-headline-xl text-headline-xl text-primary font-bold">
                            {timeFormatted}
                          </span>
                          <span className="font-label-xs text-label-xs px-1.5 py-0.5 rounded bg-tertiary-fixed text-on-tertiary-fixed font-semibold">
                            {idx === 0 ? 'Sắp diễn ra' : 'Sắp tới'}
                          </span>
                        </div>
                        <span className="material-symbols-outlined text-[18px] text-outline">
                          {item.meetingUrl ? 'video_call' : 'meeting_room'}
                        </span>
                      </div>
                      <div className="font-body-base-medium text-body-base-medium text-on-surface">
                        {item.candidateName}
                      </div>
                      <div className="font-body-sm text-body-sm text-outline">
                        Ứng tuyển: {item.jobTitle}
                      </div>
                      <div className="mt-2.5 pt-2 flex items-center justify-between font-label-sm text-label-sm text-on-surface-variant">
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[16px] text-outline">person</span>
                          {item.interviewerName}
                        </span>
                        {item.meetingUrl ? (
                          <a
                            href={item.meetingUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-secondary font-medium hover:underline flex items-center gap-1"
                          >
                            <span>Google Meet</span>
                            <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                          </a>
                        ) : (
                          <span className="text-outline">{item.location}</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="mt-space-md pt-space-sm text-center">
              <Link
                href="/hr/interviews"
                className="font-body-sm-medium text-body-sm-medium text-primary hover:underline inline-flex items-center gap-1"
              >
                <span>Xem lịch biểu đầy đủ</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </Link>
            </div>
          </div>

          {/* AI Action Alerts & Market Benchmarking */}
          <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex flex-col gap-space-md">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-secondary">notification_important</span>
              <h2 className="font-headline-lg text-headline-lg text-on-background">Cảnh báo AI &amp; Đề xuất hành động</h2>
            </div>

            {/* Alert Card 1: Bottleneck Warning */}
            <div className="p-space-md rounded-xl bg-error-container/20 flex flex-col gap-2">
              <div className="flex items-start gap-2">
                <span className="material-symbols-outlined text-[20px] text-error flex-shrink-0 mt-0.5">timer_off</span>
                <div className="min-w-0">
                  <div className="font-body-sm-medium text-body-sm-medium text-on-surface font-semibold">
                    Cần phân bổ lịch phỏng vấn ứng viên phù hợp
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5 leading-snug">
                    Có ứng viên điểm tương đồng AI &gt; 85% đã hoàn tất sàng lọc. Khuyến nghị xếp lịch phỏng vấn trong vòng 48 giờ.
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 mt-1">
                <Link
                  href="/hr/applications?scoreTier=HIGH"
                  className="px-space-md py-1 rounded-lg bg-error text-on-error font-label-xs text-label-xs font-semibold hover:opacity-90 transition-opacity"
                >
                  Xem &amp; Phân bổ ngay
                </Link>
              </div>
            </div>

            {/* Alert Card 2: Market Intelligence */}
            <div className="p-space-md rounded-xl bg-surface-container-low flex flex-col gap-2">
              <div className="flex items-start gap-2">
                <span className="material-symbols-outlined text-[20px] text-secondary flex-shrink-0 mt-0.5">trending_up</span>
                <div className="min-w-0">
                  <div className="font-body-sm-medium text-body-sm-medium text-on-surface font-semibold">
                    Cạnh tranh thị trường: Fullstack &amp; Cloud
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5 leading-snug">
                    Nhu cầu kỹ năng Cloud &amp; Next.js đang tăng cao tại thị trường VN. Đề xuất đẩy nhanh tốc độ duyệt đơn để giữ chân ứng viên tiềm năng.
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 mt-1">
                <Link
                  href="/dashboard/jobs"
                  className="px-space-md py-1 rounded-lg bg-surface-container-highest hover:bg-surface-variant text-on-surface font-label-xs text-label-xs font-semibold transition-colors"
                >
                  Xem tin tuyển dụng
                </Link>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
