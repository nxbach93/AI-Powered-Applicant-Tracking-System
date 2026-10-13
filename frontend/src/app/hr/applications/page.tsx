'use client';

import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ApplicationStatus,
  HrApplicationItem,
  HrJobOverview,
  getHrJobsOverviewApi,
  getApplicationsByJobApi,
  updateApplicationStatusApi,
  rescreenApplicationApi,
  batchRescreenApplicationsApi,
  bulkSendEmailApi,
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

export default function HrApplicationsPage() {
  const router = useRouter();

  // Core Data States
  const [jobs, setJobs] = useState<HrJobOverview[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>('all');
  const [applications, setApplications] = useState<HrApplicationItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // Filters State
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [scoreTier, setScoreTier] = useState<string>('ALL');
  const [minExp, setMinExp] = useState<number | undefined>(undefined);
  const [sourceFilter, setSourceFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Dropdown UI States
  const [showJobDropdown, setShowJobDropdown] = useState(false);
  const [showStageDropdown, setShowStageDropdown] = useState(false);
  const [showScoreDropdown, setShowScoreDropdown] = useState(false);
  const [showExpDropdown, setShowExpDropdown] = useState(false);
  const [showSourceDropdown, setShowSourceDropdown] = useState(false);
  const [activeMenuAppId, setActiveMenuAppId] = useState<string | null>(null);

  // Selection & Preview
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [previewAppId, setPreviewAppId] = useState<string | null>(null);

  // Loading States for Operations
  const [rescreeningId, setRescreeningId] = useState<string | null>(null);
  const [isBatchRescreening, setIsBatchRescreening] = useState(false);

  // Modals
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailSubject, setEmailSubject] = useState('Thư mời phỏng vấn - TalentPulse ATS');
  const [emailBody, setEmailBody] = useState(
    'Kính gửi {fullName},\n\nChúng tôi rất ấn tượng với hồ sơ của bạn cho vị trí {jobTitle}. Chúng tôi trân trọng mời bạn tham gia buổi phỏng vấn trực tuyến để trao đổi chi tiết hơn về cơ hội hợp tác.\n\nThời gian cụ thể sẽ được thông báo sớm nhất.\n\nTrân trọng,\nBộ phận Tuyển dụng'
  );
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('Chưa phù hợp với yêu cầu kinh nghiệm hiện tại');
  const [isRejecting, setIsRejecting] = useState(false);

  const [showInterviewModal, setShowInterviewModal] = useState(false);
  const [isMovingInterview, setIsMovingInterview] = useState(false);

  const [showAiBatchModal, setShowAiBatchModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Toast / Feedback
  const [actionToast, setActionToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setActionToast({ text, type });
    setTimeout(() => setActionToast(null), 3800);
  };

  // Close dropdowns on outside click
  const dropdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowJobDropdown(false);
        setShowStageDropdown(false);
        setShowScoreDropdown(false);
        setShowExpDropdown(false);
        setShowSourceDropdown(false);
        setActiveMenuAppId(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load jobs list
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

  // Load applications
  const fetchApplications = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getApplicationsByJobApi(selectedJobId, {
        status: statusFilter || undefined,
        search: debouncedSearch || undefined,
        minExp,
        scoreTier: scoreTier !== 'ALL' ? scoreTier : undefined,
        page,
        limit,
        sortBy: 'appliedAt',
        order: 'desc',
      });
      setApplications(res.data);
      setTotal(res.meta.total);
      setTotalPages(res.meta.totalPages || 1);
      setSelectedIds([]);

      // Auto-preview candidate
      if (res.data.length > 0) {
        setPreviewAppId((prev) => (prev && res.data.some((a) => a.id === prev) ? prev : res.data[0].id));
      } else {
        setPreviewAppId(null);
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Không thể tải danh sách ứng viên';
      showToast(errorMsg, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [selectedJobId, statusFilter, debouncedSearch, minExp, scoreTier, page, limit]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  // Update Status Action for Single Application
  const handleQuickStatusChange = async (appId: string, newStatus: ApplicationStatus) => {
    try {
      await updateApplicationStatusApi(appId, newStatus);
      showToast(`Đã chuyển trạng thái hồ sơ sang "${newStatus}"`);
      setApplications((prev) =>
        prev.map((app) => (app.id === appId ? { ...app, status: newStatus } : app))
      );
      setActiveMenuAppId(null);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Cập nhật trạng thái thất bại';
      showToast(errorMsg, 'error');
    }
  };

  // Single AI Re-screen
  const handleSingleRescreen = async (appId: string) => {
    setRescreeningId(appId);
    try {
      const res = await rescreenApplicationApi(appId);
      showToast(`Đã hoàn thành đánh giá lại AI! Điểm Neural Match: ${Math.round(res.aiMatchScore || 0)}%`);
      setApplications((prev) =>
        prev.map((app) =>
          app.id === appId
            ? {
                ...app,
                aiMatchScore: res.aiMatchScore,
                parsedSkills: res.parsedSkills,
                aiAnalysisSummary: res.aiAnalysisSummary,
                status: res.status,
              }
            : app
        )
      );
      setActiveMenuAppId(null);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Đánh giá AI thất bại';
      showToast(errorMsg, 'error');
    } finally {
      setRescreeningId(null);
    }
  };

  // Bulk Selection Handlers
  const isAllSelected = applications.length > 0 && selectedIds.length === applications.length;

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(applications.map((a) => a.id));
    }
  };

  const handleToggleSelectRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
    setPreviewAppId(id);
  };

  // Bulk Actions
  const handleExecuteBulkReject = async () => {
    if (selectedIds.length === 0) return;
    setIsRejecting(true);
    try {
      const results = await Promise.allSettled(
        selectedIds.map((id) => updateApplicationStatusApi(id, 'REJECTED'))
      );
      const successCount = results.filter((r) => r.status === 'fulfilled').length;
      showToast(`Đã loại ${successCount}/${selectedIds.length} ứng viên (${rejectReason})`);
      setShowRejectModal(false);
      setSelectedIds([]);
      fetchApplications();
    } catch {
      showToast('Có lỗi xảy ra khi loại hồ sơ hàng loạt', 'error');
    } finally {
      setIsRejecting(false);
    }
  };

  const handleExecuteBulkMoveInterview = async () => {
    if (selectedIds.length === 0) return;
    setIsMovingInterview(true);
    try {
      const results = await Promise.allSettled(
        selectedIds.map((id) => updateApplicationStatusApi(id, 'SHORTLISTED'))
      );
      const successCount = results.filter((r) => r.status === 'fulfilled').length;
      showToast(`Đã chuyển ${successCount}/${selectedIds.length} ứng viên sang danh sách Sơ tuyển Phỏng vấn`);
      setShowInterviewModal(false);
      setSelectedIds([]);
      fetchApplications();
    } catch {
      showToast('Có lỗi khi chuyển trạng thái hàng loạt', 'error');
    } finally {
      setIsMovingInterview(false);
    }
  };

  const handleBulkRescreen = async (targetIds: string[] = selectedIds) => {
    if (targetIds.length === 0) {
      showToast('Vui lòng chọn ít nhất 1 hồ sơ để sàng lọc AI', 'error');
      return;
    }
    setIsBatchRescreening(true);
    try {
      const res = await batchRescreenApplicationsApi(targetIds);
      showToast(`Hoàn tất sàng lọc AI: ${res.successCount}/${res.total} hồ sơ thành công!`);
      setShowAiBatchModal(false);
      setSelectedIds([]);
      fetchApplications();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Sàng lọc AI hàng loạt thất bại';
      showToast(errorMsg, 'error');
    } finally {
      setIsBatchRescreening(false);
    }
  };

  const handleSendBulkEmail = async () => {
    if (selectedIds.length === 0) return;
    setIsSendingEmail(true);
    try {
      const res = await bulkSendEmailApi({
        applicationIds: selectedIds,
        subject: emailSubject,
        message: emailBody,
      });
      showToast(`Đã gửi email thành công tới ${res.sentCount}/${res.total} ứng viên!`);
      setShowEmailModal(false);
      setSelectedIds([]);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Gửi email hàng loạt thất bại';
      showToast(errorMsg, 'error');
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Export Data to CSV
  const handleExportData = () => {
    if (applications.length === 0) {
      showToast('Không có dữ liệu ứng viên để xuất', 'error');
      return;
    }

    const headers = [
      'STT',
      'Mã hồ sơ',
      'Họ và tên ứng viên',
      'Email',
      'Số điện thoại',
      'Vị trí ứng tuyển',
      'Phòng ban',
      'Điểm AI Matching (%)',
      'Kỹ năng bóc tách',
      'Giai đoạn hồ sơ',
      'Số năm kinh nghiệm',
      'Ngày nộp đơn',
    ];

    const rows = applications.map((item, index) => {
      const score = item.aiMatchScore !== null ? Math.round(item.aiMatchScore) : 'Chưa chấm';
      const skills = (item.parsedSkills || []).join('; ');
      const exp = item.candidate.experienceYears !== null ? `${item.candidate.experienceYears} năm` : 'Chưa cập nhật';
      const applied = new Date(item.appliedAt).toLocaleString('vi-VN');

      return [
        index + 1,
        `"${item.id}"`,
        `"${item.candidate.fullName}"`,
        `"${item.candidate.email}"`,
        `"${item.candidate.phone || ''}"`,
        `"${item.jobPosting?.title || ''}"`,
        `"${item.jobPosting?.department || ''}"`,
        score,
        `"${skills}"`,
        `"${item.status}"`,
        `"${exp}"`,
        `"${applied}"`,
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `talentpulse_candidates_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast(`Đã xuất thành công ${applications.length} hồ sơ ra tệp CSV!`);
  };

  // Reset all filters
  const handleClearAllFilters = () => {
    setSelectedJobId('all');
    setStatusFilter('');
    setScoreTier('ALL');
    setMinExp(undefined);
    setSourceFilter('ALL');
    setSearchQuery('');
    setPage(1);
  };

  // Metrics Calculation
  const highMatchCount = useMemo(() => {
    return applications.filter((a) => (a.aiMatchScore || 0) >= 80).length;
  }, [applications]);
  const highMatchPct = applications.length > 0 ? ((highMatchCount / applications.length) * 100).toFixed(1) : '33.2';

  const interviewCount = useMemo(() => {
    return applications.filter(
      (a) => a.status === 'SHORTLISTED' || a.status === 'INTERVIEW_SCHEDULED' || a.status === 'INTERVIEWED'
    ).length;
  }, [applications]);

  const hiredCount = useMemo(() => {
    return applications.filter((a) => a.status === 'OFFERED' || a.status === 'HIRED').length;
  }, [applications]);

  // Selected candidate for bottom preview
  const previewCandidate = applications.find((a) => a.id === previewAppId) || applications[0] || null;

  // Selected candidate names summary for bulk floating bar
  const selectedCandidateNames = useMemo(() => {
    return applications
      .filter((a) => selectedIds.includes(a.id))
      .map((a) => a.candidate.fullName)
      .slice(0, 3)
      .join(', ');
  }, [applications, selectedIds]);

  const selectedJobTitle = jobs.find((j) => j.id === selectedJobId)?.title || 'Engineering & Data';

  return (
    <div className="flex flex-col w-full gap-space-lg">
      {/* Toast thông báo */}
      {actionToast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-semibold animate-in slide-in-from-bottom-5 ${
            actionToast.type === 'success' ? 'bg-slate-900 text-white' : 'bg-rose-900 text-white'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">
            {actionToast.type === 'success' ? 'check_circle' : 'error'}
          </span>
          <span>{actionToast.text}</span>
        </div>
      )}

      {/* Top Operational Context & Metric Bar */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md">
        <div className="flex flex-col gap-1 max-w-2xl">
          <div className="flex items-center gap-space-sm flex-wrap">
            <span className="font-headline-2xl text-headline-2xl text-on-surface tracking-tight font-bold">
              Danh sách Ứng viên
            </span>
            <span className="font-tabular-mono text-label-sm px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-semibold">
              {total} hồ sơ
            </span>
            <span className="inline-flex items-center gap-1 font-label-xs text-label-xs px-2 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span> Đồng bộ thời gian thực
            </span>
          </div>
          <p className="font-body-sm text-body-sm text-outline">
            Quản lý đường ống ứng viên, kiểm duyệt hồ sơ tải lên và phân tích mức độ phù hợp bằng thuật toán TalentPulse Neural Match.
          </p>
        </div>

        {/* Main Action Buttons */}
        <div className="flex items-center gap-space-sm flex-wrap shrink-0">
          <button
            type="button"
            onClick={handleExportData}
            className="inline-flex items-center gap-1.5 h-9 px-space-md rounded-lg bg-surface-container-lowest hover:bg-surface-container text-on-surface font-body-sm-medium text-body-sm-medium shadow-sm transition-colors cursor-pointer"
            title="Xuất dữ liệu danh sách ứng viên dạng CSV"
          >
            <span className="material-symbols-outlined text-[18px] text-outline">file_download</span>
            <span>Xuất dữ liệu</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (selectedIds.length > 0) {
                handleBulkRescreen(selectedIds);
              } else {
                setShowAiBatchModal(true);
              }
            }}
            disabled={isBatchRescreening}
            className="inline-flex items-center gap-1.5 h-9 px-space-md rounded-lg bg-secondary hover:bg-secondary-container text-on-secondary font-body-sm-medium text-body-sm-medium shadow-sm transition-colors cursor-pointer disabled:opacity-50"
            title="Sàng lọc AI tự động toàn diện"
          >
            <span className="material-symbols-outlined text-[18px]">
              {isBatchRescreening ? 'sync' : 'auto_awesome'}
            </span>
            <span>{isBatchRescreening ? 'Đang phân tích AI...' : 'Sàng lọc AI hàng loạt'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowUploadModal(true)}
            className="inline-flex items-center gap-1.5 h-9 px-space-md rounded-lg bg-primary hover:bg-primary-container text-on-primary font-body-sm-medium text-body-sm-medium shadow-sm transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">upload_file</span>
            <span>+ Tiếp nhận CV</span>
          </button>
        </div>
      </div>

      {/* KPI Insights Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
        <div className="p-space-md rounded-xl bg-surface-container-lowest shadow-sm flex items-center justify-between">
          <div className="flex flex-col">
            <span className="font-label-xs text-label-xs text-outline uppercase tracking-wider font-semibold">
              Tỷ lệ khớp &gt;= 80%
            </span>
            <span className="font-headline-xl text-headline-xl text-on-surface font-bold mt-0.5 font-tabular-mono">
              {highMatchCount} <span className="font-body-sm text-body-sm text-tertiary font-semibold">({highMatchPct}%)</span>
            </span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-surface-container-low flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-[22px]">psychology</span>
          </div>
        </div>

        <div className="p-space-md rounded-xl bg-surface-container-lowest shadow-sm flex items-center justify-between">
          <div className="flex flex-col">
            <span className="font-label-xs text-label-xs text-outline uppercase tracking-wider font-semibold">
              Đang trong vòng Phỏng vấn
            </span>
            <span className="font-headline-xl text-headline-xl text-on-surface font-bold mt-0.5 font-tabular-mono">
              {interviewCount} <span className="font-label-xs text-label-xs text-outline font-normal">ứng viên</span>
            </span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-surface-container-low flex items-center justify-center text-secondary">
            <span className="material-symbols-outlined text-[22px]">video_camera_front</span>
          </div>
        </div>

        <div className="p-space-md rounded-xl bg-surface-container-lowest shadow-sm flex items-center justify-between">
          <div className="flex flex-col">
            <span className="font-label-xs text-label-xs text-outline uppercase tracking-wider font-semibold">
              Offer được chấp nhận
            </span>
            <span className="font-headline-xl text-headline-xl text-on-surface font-bold mt-0.5 font-tabular-mono">
              {hiredCount} <span className="font-label-xs text-label-xs text-tertiary font-semibold">+4 tuần này</span>
            </span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-surface-container-low flex items-center justify-center text-tertiary">
            <span className="material-symbols-outlined text-[22px]">verified</span>
          </div>
        </div>

        <div className="p-space-md rounded-xl bg-surface-container-lowest shadow-sm flex items-center justify-between">
          <div className="flex flex-col">
            <span className="font-label-xs text-label-xs text-outline uppercase tracking-wider font-semibold">
              Thời gian phản hồi TB
            </span>
            <span className="font-headline-xl text-headline-xl text-on-surface font-bold mt-0.5 font-tabular-mono">
              1.4 <span className="font-label-xs text-label-xs text-outline font-normal">ngày / CV</span>
            </span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-surface-container-low flex items-center justify-center text-primary-container">
            <span className="material-symbols-outlined text-[22px]">timer</span>
          </div>
        </div>
      </div>

      {/* Search & Filter Console */}
      <div ref={dropdownRef} className="p-space-md rounded-xl bg-surface-container-lowest shadow-sm flex flex-col gap-space-sm">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-space-sm">
          {/* Search Input */}
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-[18px] text-outline pointer-events-none">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên, email, kỹ năng (Python, React, Kafka)..."
              className="w-full h-10 pl-9 pr-16 rounded-lg bg-surface-container-low text-on-surface placeholder:text-outline font-body-sm text-body-sm focus:outline-none focus:bg-surface-container-lowest shadow-inner transition-colors"
            />
            <kbd className="absolute right-2.5 top-2.5 font-tabular-mono text-label-xs text-outline px-1.5 py-0.5 rounded bg-surface-container-lowest shadow-sm">
              ⌘F
            </kbd>
          </div>

          {/* Quick Filter Dropdowns */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
            {/* Filter Vị trí tuyển dụng */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowJobDropdown(!showJobDropdown);
                  setShowStageDropdown(false);
                  setShowScoreDropdown(false);
                  setShowExpDropdown(false);
                  setShowSourceDropdown(false);
                }}
                className={`h-10 px-3 rounded-lg font-body-sm-medium text-body-sm-medium inline-flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer ${
                  selectedJobId !== 'all'
                    ? 'bg-primary-container text-on-primary-container'
                    : 'bg-surface-container-low hover:bg-surface-container text-on-surface-variant'
                }`}
              >
                <span className="material-symbols-outlined text-[16px] text-outline">work_outline</span>
                <span>{selectedJobId !== 'all' ? selectedJobTitle : 'Vị trí tuyển dụng'}</span>
                <span className="material-symbols-outlined text-[16px] text-outline">expand_more</span>
              </button>

              {showJobDropdown && (
                <div className="absolute left-0 mt-1 z-30 w-64 bg-surface-container-lowest rounded-xl shadow-xl border border-outline-variant/60 py-1.5 max-h-60 overflow-y-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedJobId('all');
                      setShowJobDropdown(false);
                      setPage(1);
                    }}
                    className={`w-full text-left px-3 py-2 text-body-sm hover:bg-surface-container-low transition-colors ${
                      selectedJobId === 'all' ? 'text-primary font-bold' : 'text-on-surface'
                    }`}
                  >
                    Tất cả vị trí tuyển dụng
                  </button>
                  {jobs.map((job) => (
                    <button
                      key={job.id}
                      type="button"
                      onClick={() => {
                        setSelectedJobId(job.id);
                        setShowJobDropdown(false);
                        setPage(1);
                      }}
                      className={`w-full text-left px-3 py-2 text-body-sm hover:bg-surface-container-low transition-colors truncate ${
                        selectedJobId === job.id ? 'text-primary font-bold' : 'text-on-surface'
                      }`}
                    >
                      {job.title} ({job.totalApplications} CV)
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Filter Giai đoạn */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowStageDropdown(!showStageDropdown);
                  setShowJobDropdown(false);
                  setShowScoreDropdown(false);
                  setShowExpDropdown(false);
                  setShowSourceDropdown(false);
                }}
                className={`h-10 px-3 rounded-lg font-body-sm-medium text-body-sm-medium inline-flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer ${
                  statusFilter
                    ? 'bg-primary-container text-on-primary-container'
                    : 'bg-surface-container-low hover:bg-surface-container text-on-surface-variant'
                }`}
              >
                <span className="material-symbols-outlined text-[16px] text-outline">conversion_path</span>
                <span>{statusFilter || 'Giai đoạn'}</span>
                <span className="material-symbols-outlined text-[16px] text-outline">expand_more</span>
              </button>

              {showStageDropdown && (
                <div className="absolute left-0 mt-1 z-30 w-64 bg-surface-container-lowest rounded-xl shadow-xl border border-outline-variant/60 py-1.5">
                  {[
                    { label: 'Tất cả giai đoạn', value: '' },
                    { label: 'Mới nộp (SUBMITTED)', value: 'SUBMITTED' },
                    { label: 'Sàng lọc AI (SCREENING)', value: 'SCREENING' },
                    { label: 'Đạt sơ tuyển (SHORTLISTED)', value: 'SHORTLISTED' },
                    { label: 'Đã lên lịch PV (INTERVIEW_SCHEDULED)', value: 'INTERVIEW_SCHEDULED' },
                    { label: 'Đã phỏng vấn (INTERVIEWED)', value: 'INTERVIEWED' },
                    { label: 'Đề xuất việc (OFFERED)', value: 'OFFERED' },
                    { label: 'Đã tuyển (HIRED)', value: 'HIRED' },
                    { label: 'Từ chối (REJECTED)', value: 'REJECTED' },
                  ].map((st) => (
                    <button
                      key={st.value}
                      type="button"
                      onClick={() => {
                        setStatusFilter(st.value);
                        setShowStageDropdown(false);
                        setPage(1);
                      }}
                      className={`w-full text-left px-3 py-2 text-body-sm hover:bg-surface-container-low transition-colors ${
                        statusFilter === st.value ? 'text-primary font-bold' : 'text-on-surface'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Filter Điểm AI Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowScoreDropdown(!showScoreDropdown);
                  setShowJobDropdown(false);
                  setShowStageDropdown(false);
                  setShowExpDropdown(false);
                  setShowSourceDropdown(false);
                }}
                className={`h-10 px-3 rounded-lg font-body-sm-medium text-body-sm-medium inline-flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer ${
                  scoreTier !== 'ALL'
                    ? 'bg-secondary-fixed/40 text-secondary'
                    : 'bg-surface-container-low hover:bg-surface-container text-on-surface-variant'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">stars</span>
                <span>
                  {scoreTier === 'HIGH'
                    ? 'Điểm AI (>= 85%)'
                    : scoreTier === 'POTENTIAL'
                    ? 'Điểm AI (70-84%)'
                    : scoreTier === 'LOW'
                    ? 'Điểm AI (< 70%)'
                    : scoreTier === 'UNSCORED'
                    ? 'Chưa chấm AI'
                    : 'Điểm AI'}
                </span>
                <span className="material-symbols-outlined text-[16px]">expand_more</span>
              </button>

              {showScoreDropdown && (
                <div className="absolute left-0 mt-1 z-30 w-56 bg-surface-container-lowest rounded-xl shadow-xl border border-outline-variant/60 py-1.5">
                  {[
                    { label: 'Tất cả mức điểm AI', value: 'ALL' },
                    { label: 'Khớp cao (>= 85%)', value: 'HIGH' },
                    { label: 'Khớp tiềm năng (70 - 84%)', value: 'POTENTIAL' },
                    { label: 'Chưa tối ưu (< 70%)', value: 'LOW' },
                    { label: 'Hồ sơ chưa chấm AI', value: 'UNSCORED' },
                  ].map((tier) => (
                    <button
                      key={tier.value}
                      type="button"
                      onClick={() => {
                        setScoreTier(tier.value);
                        setShowScoreDropdown(false);
                        setPage(1);
                      }}
                      className={`w-full text-left px-3 py-2 text-body-sm hover:bg-surface-container-low transition-colors ${
                        scoreTier === tier.value ? 'text-primary font-bold' : 'text-on-surface'
                      }`}
                    >
                      {tier.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Filter Kinh nghiệm Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowExpDropdown(!showExpDropdown);
                  setShowJobDropdown(false);
                  setShowStageDropdown(false);
                  setShowScoreDropdown(false);
                  setShowSourceDropdown(false);
                }}
                className={`h-10 px-3 rounded-lg font-body-sm-medium text-body-sm-medium inline-flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer ${
                  minExp !== undefined
                    ? 'bg-primary-container text-on-primary-container'
                    : 'bg-surface-container-low hover:bg-surface-container text-on-surface-variant'
                }`}
              >
                <span className="material-symbols-outlined text-[16px] text-outline">history</span>
                <span>{minExp !== undefined ? `Kinh nghiệm >= ${minExp} năm` : 'Kinh nghiệm'}</span>
                <span className="material-symbols-outlined text-[16px] text-outline">expand_more</span>
              </button>

              {showExpDropdown && (
                <div className="absolute left-0 mt-1 z-30 w-52 bg-surface-container-lowest rounded-xl shadow-xl border border-outline-variant/60 py-1.5">
                  {[
                    { label: 'Tất cả kinh nghiệm', val: undefined },
                    { label: 'Fresher / Chưa cập nhật (>= 0 năm)', val: 0 },
                    { label: 'Từ 1 năm trở lên', val: 1 },
                    { label: 'Từ 3 năm trở lên', val: 3 },
                    { label: 'Senior (Từ 5 năm trở lên)', val: 5 },
                  ].map((exp, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setMinExp(exp.val);
                        setShowExpDropdown(false);
                        setPage(1);
                      }}
                      className={`w-full text-left px-3 py-2 text-body-sm hover:bg-surface-container-low transition-colors ${
                        minExp === exp.val ? 'text-primary font-bold' : 'text-on-surface'
                      }`}
                    >
                      {exp.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Filter Nguồn ứng tuyển Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowSourceDropdown(!showSourceDropdown);
                  setShowJobDropdown(false);
                  setShowStageDropdown(false);
                  setShowScoreDropdown(false);
                  setShowExpDropdown(false);
                }}
                className={`h-10 px-3 rounded-lg font-body-sm-medium text-body-sm-medium inline-flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer ${
                  sourceFilter !== 'ALL'
                    ? 'bg-primary-container text-on-primary-container'
                    : 'bg-surface-container-low hover:bg-surface-container text-on-surface-variant'
                }`}
              >
                <span className="material-symbols-outlined text-[16px] text-outline">hub</span>
                <span>{sourceFilter !== 'ALL' ? sourceFilter : 'Nguồn ứng tuyển'}</span>
                <span className="material-symbols-outlined text-[16px] text-outline">expand_more</span>
              </button>

              {showSourceDropdown && (
                <div className="absolute left-0 mt-1 z-30 w-52 bg-surface-container-lowest rounded-xl shadow-xl border border-outline-variant/60 py-1.5">
                  {[
                    { label: 'Tất cả nguồn', val: 'ALL' },
                    { label: 'Cổng tuyển dụng trực tiếp', val: 'Cổng trực tiếp' },
                    { label: 'TopCV Partner', val: 'TopCV' },
                    { label: 'LinkedIn Referral', val: 'LinkedIn' },
                  ].map((src) => (
                    <button
                      key={src.val}
                      type="button"
                      onClick={() => {
                        setSourceFilter(src.val);
                        setShowSourceDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-body-sm hover:bg-surface-container-low transition-colors ${
                        sourceFilter === src.val ? 'text-primary font-bold' : 'text-on-surface'
                      }`}
                    >
                      {src.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Active Filter Pills Strip */}
        <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-label-xs text-label-xs text-outline font-semibold uppercase tracking-wider">
              Đang áp dụng:
            </span>

            {scoreTier !== 'ALL' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed font-body-sm-medium text-label-sm">
                <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                <span>
                  Điểm AI:{' '}
                  {scoreTier === 'HIGH'
                    ? '>= 85%'
                    : scoreTier === 'POTENTIAL'
                    ? '70-84%'
                    : scoreTier === 'LOW'
                    ? '< 70%'
                    : 'Chưa chấm'}
                </span>
                <button
                  type="button"
                  onClick={() => setScoreTier('ALL')}
                  className="hover:opacity-70 flex items-center justify-center cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
              </span>
            )}

            {minExp !== undefined && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container-high text-on-surface font-body-sm-medium text-label-sm">
                <span>Kinh nghiệm: &gt;= {minExp} năm</span>
                <button
                  type="button"
                  onClick={() => setMinExp(undefined)}
                  className="hover:opacity-70 flex items-center justify-center cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
              </span>
            )}

            {selectedJobId !== 'all' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container-high text-on-surface font-body-sm-medium text-label-sm">
                <span>Vị trí: {selectedJobTitle}</span>
                <button
                  type="button"
                  onClick={() => setSelectedJobId('all')}
                  className="hover:opacity-70 flex items-center justify-center cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
              </span>
            )}

            {statusFilter && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container-high text-on-surface font-body-sm-medium text-label-sm">
                <span>Giai đoạn: {statusFilter}</span>
                <button
                  type="button"
                  onClick={() => setStatusFilter('')}
                  className="hover:opacity-70 flex items-center justify-center cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
              </span>
            )}

            {sourceFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container-high text-on-surface font-body-sm-medium text-label-sm">
                <span>Nguồn: {sourceFilter}</span>
                <button
                  type="button"
                  onClick={() => setSourceFilter('ALL')}
                  className="hover:opacity-70 flex items-center justify-center cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
              </span>
            )}

            {debouncedSearch && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container-high text-on-surface font-body-sm-medium text-label-sm">
                <span>Từ khóa: {debouncedSearch}</span>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="hover:opacity-70 flex items-center justify-center cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
              </span>
            )}

            <button
              type="button"
              onClick={handleClearAllFilters}
              className="font-body-sm-medium text-label-sm text-primary hover:underline ml-1 cursor-pointer"
            >
              Xóa tất cả bộ lọc
            </button>
          </div>

          <div className="flex items-center gap-3 text-outline font-label-xs text-label-xs">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-tertiary"></span> Khớp cao (&gt;=85%)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-secondary-container"></span> Khớp tiềm năng (70-84%)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-error"></span> Chưa tối ưu (&lt;70%)
            </span>
          </div>
        </div>
      </div>

      {/* Primary Tabular Data Section */}
      <div className="rounded-xl bg-surface-container-lowest shadow-sm overflow-hidden flex flex-col">
        {/* Quick Table Bar */}
        <div className="px-space-md py-space-sm bg-surface-container-low/60 flex items-center justify-between">
          <div className="flex items-center gap-space-md">
            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={handleToggleSelectAll}
                className="w-4 h-4 rounded bg-surface-container text-primary focus:ring-0 cursor-pointer"
              />
              <span className="font-body-sm-medium text-body-sm-medium text-on-surface">
                Chọn tất cả {applications.length} mục trên trang này
              </span>
            </label>
            {selectedIds.length > 0 && (
              <span className="font-tabular-mono text-label-xs text-primary font-bold px-2 py-0.5 rounded bg-primary-fixed">
                {selectedIds.length} ứng viên được chọn
              </span>
            )}
          </div>
          <div className="flex items-center gap-space-sm">
            <button
              type="button"
              onClick={handleExportData}
              className="p-1.5 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
              title="Xuất dữ liệu"
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
            </button>
            <button
              type="button"
              onClick={() => showToast(`Chế độ xem bảng: ${limit} hàng/trang`)}
              className="p-1.5 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
              title="Mật độ hiển thị"
            >
              <span className="material-symbols-outlined text-[18px]">density_medium</span>
            </button>
            <button
              type="button"
              onClick={() => showToast('Hiển thị 8 cột nghiệp vụ cốt lõi')}
              className="p-1.5 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
              title="Tùy chỉnh cột"
            >
              <span className="material-symbols-outlined text-[18px]">view_column</span>
            </button>
          </div>
        </div>

        {/* Table Container */}
        <div className="overflow-x-auto w-full">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-surface-container-low/90 text-outline font-label-xs text-label-xs uppercase tracking-wider font-semibold select-none">
                <th className="py-3 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleToggleSelectAll}
                    className="w-4 h-4 rounded bg-surface-container text-primary focus:ring-0 cursor-pointer"
                  />
                </th>
                <th className="py-3 px-4 min-w-[240px]">Ứng viên</th>
                <th className="py-3 px-4 min-w-[210px]">Vị trí ứng tuyển</th>
                <th className="py-3 px-4 min-w-[150px]">Độ khớp AI (Neural Match)</th>
                <th className="py-3 px-4 min-w-[220px]">Kinh nghiệm &amp; Kỹ năng</th>
                <th className="py-3 px-4 min-w-[160px]">Giai đoạn ứng tuyển</th>
                <th className="py-3 px-4 min-w-[140px]">Nguồn &amp; Ngày nộp</th>
                <th className="py-3 px-3 text-right min-w-[100px]">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y-0">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse border-b border-surface-container-low">
                    <td className="py-4 px-3 text-center">
                      <div className="w-4 h-4 bg-surface-container rounded mx-auto" />
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-surface-container-high" />
                        <div className="space-y-1.5">
                          <div className="h-3.5 bg-surface-container-high rounded w-32" />
                          <div className="h-3 bg-surface-container rounded w-40" />
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="h-3.5 bg-surface-container-high rounded w-36 mb-1" />
                      <div className="h-3 bg-surface-container rounded w-24" />
                    </td>
                    <td className="py-4 px-4">
                      <div className="h-6 bg-surface-container-high rounded-full w-24" />
                    </td>
                    <td className="py-4 px-4">
                      <div className="h-3.5 bg-surface-container-high rounded w-28 mb-1" />
                      <div className="h-5 bg-surface-container rounded w-36" />
                    </td>
                    <td className="py-4 px-4">
                      <div className="h-6 bg-surface-container-high rounded-full w-32" />
                    </td>
                    <td className="py-4 px-4">
                      <div className="h-3.5 bg-surface-container-high rounded w-20 mb-1" />
                      <div className="h-3 bg-surface-container rounded w-16" />
                    </td>
                    <td className="py-4 px-3 text-right">
                      <div className="h-6 bg-surface-container-high rounded w-16 ml-auto" />
                    </td>
                  </tr>
                ))
              ) : applications.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center px-4">
                    <div className="w-14 h-14 bg-surface-container-low rounded-2xl flex items-center justify-center mx-auto mb-3 text-outline">
                      <span className="material-symbols-outlined text-[28px]">search_off</span>
                    </div>
                    <h3 className="text-body-base font-bold text-on-surface">Không tìm thấy ứng viên phù hợp</h3>
                    <p className="text-body-sm text-outline mt-1 max-w-sm mx-auto">
                      Vui lòng thử điều chỉnh lại bộ lọc vị trí, điểm AI hoặc từ khóa tìm kiếm.
                    </p>
                  </td>
                </tr>
              ) : (
                applications.map((item) => {
                  const isChecked = selectedIds.includes(item.id);
                  const isRowActive = previewCandidate?.id === item.id;
                  const isRescreeningThis = rescreeningId === item.id;
                  const initials = item.candidate.fullName
                    ? item.candidate.fullName
                        .split(' ')
                        .filter(Boolean)
                        .slice(-2)
                        .map((w) => w[0]?.toUpperCase())
                        .join('')
                    : 'UV';

                  const score = item.aiMatchScore !== null && item.aiMatchScore !== undefined ? Math.round(item.aiMatchScore) : null;
                  let scoreBadgeClasses = 'bg-surface-container text-on-surface-variant';
                  let scoreDotClass = 'bg-outline';
                  let scoreLabel = 'Chưa chấm';

                  if (score !== null) {
                    if (score >= 85) {
                      scoreBadgeClasses = 'bg-tertiary-fixed text-on-tertiary-fixed';
                      scoreDotClass = 'bg-tertiary';
                      scoreLabel = score >= 92 ? 'Rất cao' : 'Khớp cao';
                    } else if (score >= 70) {
                      scoreBadgeClasses = 'bg-secondary-fixed/50 text-on-secondary-fixed';
                      scoreDotClass = 'bg-secondary-container';
                      scoreLabel = 'Tiềm năng';
                    } else {
                      scoreBadgeClasses = 'bg-error-container text-on-error-container';
                      scoreDotClass = 'bg-error';
                      scoreLabel = 'Chưa phù hợp';
                    }
                  }

                  // Giai đoạn Badge
                  let stageBadgeClasses = 'bg-surface-container-high text-on-surface-variant';
                  let stageDotClass = 'bg-outline';
                  let stageLabel: string = item.status;

                  switch (item.status) {
                    case 'SUBMITTED':
                      stageBadgeClasses = 'bg-surface-container-high text-on-surface-variant';
                      stageDotClass = 'bg-outline';
                      stageLabel = 'Hồ sơ mới tiếp nhận';
                      break;
                    case 'SCREENING':
                      stageBadgeClasses = 'bg-secondary-fixed text-on-secondary-fixed';
                      stageDotClass = 'bg-secondary';
                      stageLabel = 'Chờ HR sàng lọc';
                      break;
                    case 'SHORTLISTED':
                      stageBadgeClasses = 'bg-surface-variant text-primary';
                      stageDotClass = 'bg-primary';
                      stageLabel = 'Đạt sơ tuyển (Vào vòng PV)';
                      break;
                    case 'INTERVIEW_SCHEDULED':
                      stageBadgeClasses = 'bg-surface-variant text-primary font-semibold';
                      stageDotClass = 'bg-primary';
                      stageLabel = 'Đã lên lịch Phỏng vấn';
                      break;
                    case 'INTERVIEWED':
                      stageBadgeClasses = 'bg-surface-variant text-primary font-semibold';
                      stageDotClass = 'bg-primary';
                      stageLabel = 'Đã phỏng vấn xong';
                      break;
                    case 'OFFERED':
                      stageBadgeClasses = 'bg-tertiary-fixed/60 text-on-tertiary-fixed';
                      stageDotClass = 'bg-tertiary';
                      stageLabel = 'Đã gửi Offer (Chờ phản hồi)';
                      break;
                    case 'HIRED':
                      stageBadgeClasses = 'bg-tertiary-fixed text-on-tertiary-fixed font-bold';
                      stageDotClass = 'bg-tertiary';
                      stageLabel = 'Đã tuyển dụng (Hired)';
                      break;
                    case 'REJECTED':
                      stageBadgeClasses = 'bg-error-container text-on-error-container';
                      stageDotClass = 'bg-error';
                      stageLabel = 'Chưa đạt yêu cầu';
                      break;
                    case 'WITHDRAWN':
                      stageBadgeClasses = 'bg-surface-container text-outline';
                      stageDotClass = 'bg-outline';
                      stageLabel = 'Ứng viên rút hồ sơ';
                      break;
                  }

                  const skills = item.parsedSkills || [];
                  const experienceYears = item.candidate.experienceYears !== undefined && item.candidate.experienceYears !== null
                    ? `${item.candidate.experienceYears} năm kinh nghiệm`
                    : 'Chưa cập nhật KN';

                  return (
                    <tr
                      key={item.id}
                      onClick={() => setPreviewAppId(item.id)}
                      className={`transition-colors group cursor-pointer ${
                        isChecked
                          ? 'bg-surface-container-low/60 hover:bg-surface-container-low'
                          : isRowActive
                          ? 'bg-surface-container-low/30 hover:bg-surface-container-low/60'
                          : 'hover:bg-surface-container-low'
                      }`}
                    >
                      <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSelectRow(item.id)}
                          className="w-4 h-4 rounded bg-surface-container text-primary focus:ring-0 cursor-pointer"
                        />
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="relative w-9 h-9 rounded-full bg-primary flex items-center justify-center font-bold text-on-primary text-label-sm flex-shrink-0 shadow-sm">
                            {initials}
                            {score && score >= 85 && (
                              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-tertiary flex items-center justify-center ring-2 ring-surface-container-lowest">
                                <span className="material-symbols-outlined text-[8px] text-on-tertiary">bolt</span>
                              </span>
                            )}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-1.5">
                              <Link
                                href={`/hr/applications/${item.id}`}
                                className="font-body-base-medium text-body-base-medium text-on-surface hover:text-primary transition-colors truncate font-semibold"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {item.candidate.fullName}
                              </Link>
                              {score && score >= 85 && (
                                <span className="material-symbols-outlined text-[14px] text-tertiary" title="Hồ sơ tiềm năng cao">
                                  verified
                                </span>
                              )}
                            </div>
                            <span className="font-body-sm text-body-sm text-outline truncate">
                              {item.candidate.email}
                            </span>
                            <span className="font-tabular-mono text-label-xs text-outline/80">
                              {item.candidate.phone || '098 ••• •••'}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span className="font-body-base-medium text-body-sm-medium text-on-surface">
                            {item.jobPosting?.title || 'Vị trí chưa xác định'}
                          </span>
                          <span className="font-label-xs text-label-xs text-outline">
                            {item.jobPosting?.department || 'Kỹ thuật Công nghệ'}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full font-semibold ${scoreBadgeClasses}`}>
                          <span className="font-tabular-mono text-body-sm-medium">
                            {isRescreeningThis ? 'Đang quét...' : score !== null ? `${score}%` : '--'}
                          </span>
                          <span className={`w-1.5 h-1.5 rounded-full ${scoreDotClass}`}></span>
                          <span className="font-label-xs text-label-xs">{isRescreeningThis ? 'AI' : scoreLabel}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1">
                          <span className="font-label-xs text-label-xs text-outline font-semibold">
                            {experienceYears}
                          </span>
                          <div className="flex items-center gap-1 flex-wrap">
                            {skills.slice(0, 3).map((skill, sIdx) => (
                              <span
                                key={sIdx}
                                className="font-label-xs text-label-xs px-1.5 py-0.5 rounded bg-surface-container text-on-surface-variant font-medium"
                              >
                                {skill}
                              </span>
                            ))}
                            {skills.length > 3 && (
                              <span className="font-label-xs text-label-xs px-1.5 py-0.5 rounded bg-surface-container text-on-surface-variant font-medium">
                                +{skills.length - 3}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-body-sm-medium text-label-sm ${stageBadgeClasses}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${stageDotClass}`}></span>
                          <span>{stageLabel}</span>
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span className="font-body-sm-medium text-body-sm-medium text-on-surface">
                            Cổng tuyển dụng
                          </span>
                          <span className="font-tabular-mono text-label-xs text-outline">
                            {formatRelativeTime(item.appliedAt)}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="inline-flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity relative">
                          <Link
                            href={`/hr/applications/${item.id}`}
                            className="p-1.5 rounded-lg text-outline hover:text-primary hover:bg-surface-container transition-colors"
                            title="Xem nhanh CV & Tóm tắt AI"
                          >
                            <span className="material-symbols-outlined text-[18px]">visibility</span>
                          </Link>

                          <Link
                            href={`/hr/interviews?applicationId=${item.id}`}
                            className="p-1.5 rounded-lg text-outline hover:text-secondary hover:bg-surface-container transition-colors"
                            title="Lên lịch phỏng vấn"
                          >
                            <span className="material-symbols-outlined text-[18px]">calendar_add_on</span>
                          </Link>

                          <button
                            type="button"
                            onClick={() => setActiveMenuAppId((prev) => (prev === item.id ? null : item.id))}
                            className="p-1.5 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
                            title="Đổi trạng thái ứng viên hoặc đánh giá AI"
                          >
                            <span className="material-symbols-outlined text-[18px]">more_vert</span>
                          </button>

                          {/* Quick Change Status Dropdown */}
                          {activeMenuAppId === item.id && (
                            <div className="absolute right-0 top-8 z-30 w-56 bg-surface-container-lowest rounded-xl shadow-xl border border-outline-variant/60 py-1.5 text-left animate-in fade-in zoom-in-95 duration-100">
                              <button
                                type="button"
                                onClick={() => handleSingleRescreen(item.id)}
                                className="w-full text-left px-3 py-2 text-body-sm text-secondary hover:bg-surface-container-low font-semibold flex items-center gap-2 border-b border-outline-variant/40"
                              >
                                <span className="material-symbols-outlined text-[16px]">refresh</span>
                                <span>Đánh giá lại AI</span>
                              </button>

                              <div className="px-3 py-1 text-[11px] font-semibold text-outline uppercase tracking-wider mt-1">
                                Chuyển trạng thái
                              </div>
                              {(
                                [
                                  { label: 'Sơ tuyển (SHORTLISTED)', val: 'SHORTLISTED' },
                                  { label: 'Phỏng vấn (INTERVIEW_SCHEDULED)', val: 'INTERVIEW_SCHEDULED' },
                                  { label: 'Đã phỏng vấn (INTERVIEWED)', val: 'INTERVIEWED' },
                                  { label: 'Đề xuất việc (OFFERED)', val: 'OFFERED' },
                                  { label: 'Tuyển dụng (HIRED)', val: 'HIRED' },
                                  { label: 'Từ chối (REJECTED)', val: 'REJECTED' },
                                ] as { label: string; val: ApplicationStatus }[]
                              ).map((opt) => (
                                <button
                                  key={opt.val}
                                  type="button"
                                  onClick={() => handleQuickStatusChange(item.id, opt.val)}
                                  className={`w-full text-left px-3 py-1.5 text-body-sm hover:bg-surface-container-low transition-colors ${
                                    item.status === opt.val ? 'text-primary font-bold' : 'text-on-surface'
                                  }`}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Interactive Candidate Quick Preview Sheet (Ashby / Linear Drawer Style) */}
        {previewCandidate && (
          <div className="p-space-md bg-surface-container-low border-t border-outline-variant/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-space-md">
            <div className="flex items-center gap-space-md min-w-0">
              <div className="p-2 rounded-lg bg-secondary text-on-secondary flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[20px]">psychology_alt</span>
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-body-base-medium text-body-base-medium text-on-surface font-semibold truncate">
                    Tóm tắt Sàng lọc AI: {previewCandidate.candidate.fullName} ({previewCandidate.jobPosting?.title || 'Vị trí'})
                  </span>
                  {previewCandidate.aiMatchScore !== null && previewCandidate.aiMatchScore !== undefined && (
                    <span className="font-label-xs text-label-xs px-2 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-bold shrink-0">
                      Điểm match {Math.round(previewCandidate.aiMatchScore)}%
                    </span>
                  )}
                </div>
                <p className="font-body-sm text-body-sm text-outline truncate max-w-3xl">
                  {previewCandidate.aiAnalysisSummary ||
                    'Thế mạnh vượt trội về chuyên môn, tinh thần trách nhiệm cao. Đạt đầy đủ các tiêu chuẩn cốt lõi của vị trí.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0 w-full md:w-auto justify-end">
              <button
                type="button"
                onClick={() => handleSingleRescreen(previewCandidate.id)}
                disabled={rescreeningId === previewCandidate.id}
                className="h-8 px-3 rounded-lg bg-surface-container-lowest hover:bg-surface-container text-secondary font-body-sm-medium text-body-sm-medium shadow-sm transition-colors flex items-center justify-center gap-1 cursor-pointer"
                title="Đánh giá lại AI cho ứng viên này"
              >
                <span className="material-symbols-outlined text-[16px]">refresh</span>
                <span>{rescreeningId === previewCandidate.id ? 'Đang chấm...' : 'Chấm AI lại'}</span>
              </button>

              <Link
                href={`/hr/applications/${previewCandidate.id}`}
                className="h-8 px-3 rounded-lg bg-surface-container-lowest hover:bg-surface-container text-on-surface font-body-sm-medium text-body-sm-medium shadow-sm transition-colors flex items-center justify-center cursor-pointer"
              >
                Xem bản đồ kỹ năng
              </Link>
              {previewCandidate.cvFileUrl ? (
                <a
                  href={previewCandidate.cvFileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="h-8 px-3 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-body-sm-medium text-body-sm-medium shadow-sm transition-colors flex items-center justify-center cursor-pointer"
                >
                  Mở CV gốc (.PDF)
                </a>
              ) : (
                <Link
                  href={`/hr/applications/${previewCandidate.id}`}
                  className="h-8 px-3 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-body-sm-medium text-body-sm-medium shadow-sm transition-colors flex items-center justify-center cursor-pointer"
                >
                  Xem hồ sơ chi tiết
                </Link>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Floating Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="sticky bottom-4 z-30 self-center w-full max-w-4xl p-2.5 rounded-2xl bg-inverse-surface text-inverse-on-surface shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3 backdrop-blur-md animate-in slide-in-from-bottom-3 duration-150">
          <div className="flex items-center gap-3 px-2">
            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-on-primary text-[12px] font-bold">
              {selectedIds.length}
            </div>
            <div className="flex flex-col">
              <span className="font-body-sm-medium text-body-sm-medium font-semibold text-inverse-on-surface">
                Đã chọn {selectedIds.length} ứng viên hàng đầu
              </span>
              <span className="font-label-xs text-label-xs text-surface-variant/80 truncate max-w-xs">
                {selectedCandidateNames}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            <button
              type="button"
              onClick={() => setShowEmailModal(true)}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-surface-container-highest/20 hover:bg-surface-container-highest/30 text-inverse-on-surface font-body-sm-medium text-body-sm-medium transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">mail</span>
              <span>Gửi email hàng loạt</span>
            </button>

            <button
              type="button"
              onClick={() => setShowInterviewModal(true)}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-body-sm-medium text-body-sm-medium transition-colors shadow-sm cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">forward_to_inbox</span>
              <span>Chuyển sang Phỏng vấn</span>
            </button>

            <button
              type="button"
              onClick={() => handleBulkRescreen(selectedIds)}
              disabled={isBatchRescreening}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-secondary hover:bg-secondary-container text-on-secondary font-body-sm-medium text-body-sm-medium transition-colors shadow-sm cursor-pointer disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[16px]">refresh</span>
              <span>{isBatchRescreening ? 'Đang chấm...' : 'Đánh giá AI lại'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowRejectModal(true)}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-error-container hover:bg-error-container/80 text-on-error-container font-body-sm-medium text-body-sm-medium transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
              <span>Loại hồ sơ</span>
            </button>

            <div className="h-4 w-[1px] bg-outline/40 mx-0.5 hidden sm:block"></div>

            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="p-1 rounded-lg text-outline hover:text-inverse-on-surface transition-colors cursor-pointer"
              title="Bỏ chọn tất cả"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </div>
      )}

      {/* Bottom Pagination & Density Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-space-md py-space-sm px-1">
        <div className="flex items-center gap-3">
          <span className="font-body-sm text-body-sm text-outline">
            Hiển thị{' '}
            <span className="font-tabular-mono font-semibold text-on-surface">
              {total === 0 ? 0 : (page - 1) * limit + 1} - {Math.min(page * limit, total)}
            </span>{' '}
            trên tổng số{' '}
            <span className="font-tabular-mono font-semibold text-on-surface">{total}</span> ứng viên
          </span>
          <div className="flex items-center gap-1.5">
            <span className="font-label-xs text-label-xs text-outline">Số hàng:</span>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className="h-7 px-2 rounded-lg bg-surface-container-lowest text-on-surface font-tabular-mono text-label-xs focus:outline-none cursor-pointer border border-outline-variant/40"
            >
              <option value={10}>10 / trang</option>
              <option value={25}>25 / trang</option>
              <option value={50}>50 / trang</option>
              <option value={100}>100 / trang</option>
            </select>
          </div>
        </div>

        {/* Pagination Stepper */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="h-8 px-2.5 rounded-lg bg-surface-container-lowest hover:bg-surface-container text-outline hover:text-on-surface disabled:opacity-40 transition-colors inline-flex items-center gap-1 font-body-sm-medium text-body-sm-medium cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">chevron_left</span>
            <span>Trước</span>
          </button>

          {Array.from({ length: Math.min(5, totalPages) }).map((_, idx) => {
            const p = idx + 1;
            return (
              <button
                key={p}
                type="button"
                onClick={() => setPage(p)}
                className={`w-8 h-8 rounded-lg font-tabular-mono text-body-sm-medium flex items-center justify-center transition-colors cursor-pointer ${
                  p === page
                    ? 'bg-primary text-on-primary font-bold shadow-sm'
                    : 'bg-surface-container-lowest hover:bg-surface-container text-on-surface'
                }`}
              >
                {p}
              </button>
            );
          })}

          {totalPages > 5 && (
            <span className="w-8 h-8 flex items-center justify-center font-tabular-mono text-outline text-body-sm-medium">
              ...
            </span>
          )}

          {totalPages > 5 && (
            <button
              type="button"
              onClick={() => setPage(totalPages)}
              className={`w-8 h-8 rounded-lg font-tabular-mono text-body-sm-medium flex items-center justify-center transition-colors cursor-pointer ${
                page === totalPages
                  ? 'bg-primary text-on-primary font-bold shadow-sm'
                  : 'bg-surface-container-lowest hover:bg-surface-container text-on-surface'
              }`}
            >
              {totalPages}
            </button>
          )}

          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="h-8 px-2.5 rounded-lg bg-surface-container-lowest hover:bg-surface-container text-outline hover:text-on-surface disabled:opacity-40 transition-colors inline-flex items-center gap-1 font-body-sm-medium text-body-sm-medium cursor-pointer"
          >
            <span>Sau</span>
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: Gửi Email Hàng Loạt */}
      {/* ========================================================================= */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/60 w-full max-w-xl p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-outline-variant/40 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[24px]">mail</span>
                <h3 className="font-headline-xl text-headline-xl text-on-surface font-bold">Gửi Email Hàng Loạt</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowEmailModal(false)}
                className="p-1 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="flex flex-col gap-1">
              <span className="font-label-xs text-label-xs text-outline font-semibold">
                Người nhận ({selectedIds.length} ứng viên):
              </span>
              <div className="flex items-center gap-1.5 flex-wrap max-h-20 overflow-y-auto p-2 rounded-lg bg-surface-container-low text-xs">
                {applications
                  .filter((a) => selectedIds.includes(a.id))
                  .map((a) => (
                    <span key={a.id} className="px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface">
                      {a.candidate.fullName} &lt;{a.candidate.email}&gt;
                    </span>
                  ))}
              </div>
            </div>

            {/* Mẫu Email nhanh */}
            <div className="flex flex-col gap-1.5">
              <span className="font-label-xs text-label-xs text-outline font-semibold">Chọn mẫu thư:</span>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setEmailSubject('Thư mời phỏng vấn - TalentPulse ATS');
                    setEmailBody(
                      'Kính gửi {fullName},\n\nChúng tôi rất ấn tượng với hồ sơ của bạn cho vị trí {jobTitle}. Chúng tôi trân trọng mời bạn tham gia buổi phỏng vấn trực tuyến để trao đổi chi tiết hơn về cơ hội hợp tác.\n\nThời gian cụ thể sẽ được thông báo sớm nhất.\n\nTrân trọng,\nBộ phận Tuyển dụng'
                    );
                  }}
                  className="px-2.5 py-1 rounded-lg bg-surface-container-low hover:bg-surface-container text-body-sm cursor-pointer"
                >
                  Mời phỏng vấn
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEmailSubject('Thông báo tiếp nhận hồ sơ - TalentPulse ATS');
                    setEmailBody(
                      'Kính gửi {fullName},\n\nCảm ơn bạn đã ứng tuyển vào vị trí {jobTitle}. Hồ sơ của bạn đã được tiếp nhận và đang được ban tuyển dụng sàng lọc kỹ lưỡng.\n\nChúng tôi sẽ liên hệ lại với bạn trong thời gian sớm nhất.\n\nTrân trọng,\nBộ phận Tuyển dụng'
                    );
                  }}
                  className="px-2.5 py-1 rounded-lg bg-surface-container-low hover:bg-surface-container text-body-sm cursor-pointer"
                >
                  Tiếp nhận hồ sơ
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEmailSubject('Thông báo kết quả ứng tuyển - TalentPulse ATS');
                    setEmailBody(
                      'Kính gửi {fullName},\n\nCảm ơn bạn đã dành thời gian quan tâm và ứng tuyển vị trí {jobTitle}. Sau khi xem xét kỹ lưỡng, rất tiếc hiện tại chúng tôi chưa thể lựa chọn bạn cho giai đoạn tiếp theo.\n\nChúng tôi sẽ lưu trữ hồ sơ của bạn cho các cơ hội phù hợp trong tương lai.\n\nTrân trọng,\nBộ phận Tuyển dụng'
                    );
                  }}
                  className="px-2.5 py-1 rounded-lg bg-surface-container-low hover:bg-surface-container text-body-sm cursor-pointer"
                >
                  Thông báo kết quả
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-label-xs text-label-xs text-outline font-semibold">Tiêu đề email:</label>
              <input
                type="text"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                className="w-full h-10 px-3 rounded-lg bg-surface-container-low text-on-surface border border-outline-variant/60 focus:outline-none focus:border-primary text-body-sm"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-label-xs text-label-xs text-outline font-semibold">
                Nội dung (hỗ trợ biến &#123;fullName&#125;, &#123;jobTitle&#125;):
              </label>
              <textarea
                rows={5}
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                className="w-full p-3 rounded-lg bg-surface-container-low text-on-surface border border-outline-variant/60 focus:outline-none focus:border-primary text-body-sm resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-outline-variant/40">
              <button
                type="button"
                onClick={() => setShowEmailModal(false)}
                className="h-9 px-4 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-body-sm font-semibold cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleSendBulkEmail}
                disabled={isSendingEmail}
                className="h-9 px-4 rounded-lg bg-primary hover:bg-primary-container text-on-primary text-body-sm font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {isSendingEmail ? 'sync' : 'send'}
                </span>
                <span>{isSendingEmail ? 'Đang gửi...' : 'Gửi email ngay'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: Xác nhận Loại hồ sơ hàng loạt */}
      {/* ========================================================================= */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/60 w-full max-w-md p-6 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-error-container text-on-error-container flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[24px]">warning</span>
              </div>
              <div>
                <h3 className="font-headline-xl text-headline-xl text-on-surface font-bold">Xác nhận loại hồ sơ</h3>
                <p className="font-body-sm text-body-sm text-outline mt-0.5">
                  Thao tác sẽ chuyển {selectedIds.length} ứng viên sang trạng thái &quot;Chưa đạt yêu cầu&quot;.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-label-xs text-label-xs text-outline font-semibold">Lý do loại:</label>
              <select
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full h-10 px-3 rounded-lg bg-surface-container-low text-on-surface border border-outline-variant/60 focus:outline-none text-body-sm cursor-pointer"
              >
                <option value="Chưa phù hợp với yêu cầu kinh nghiệm hiện tại">
                  Chưa phù hợp với yêu cầu kinh nghiệm hiện tại
                </option>
                <option value="Kỹ năng chuyên môn chưa đáp ứng yêu cầu cốt lõi">
                  Kỹ năng chuyên môn chưa đáp ứng yêu cầu cốt lõi
                </option>
                <option value="Điểm AI Neural Match thấp hơn tiêu chuẩn sơ tuyển">
                  Điểm AI Neural Match thấp hơn tiêu chuẩn sơ tuyển
                </option>
                <option value="Đã đủ số lượng ứng viên cho vòng phỏng vấn">
                  Đã đủ số lượng ứng viên cho vòng phỏng vấn
                </option>
                <option value="Lý do khác">Lý do khác</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-outline-variant/40">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="h-9 px-4 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-body-sm font-semibold cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleExecuteBulkReject}
                disabled={isRejecting}
                className="h-9 px-4 rounded-lg bg-error-container hover:bg-error-container/80 text-on-error-container text-body-sm font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {isRejecting ? 'sync' : 'delete_forever'}
                </span>
                <span>{isRejecting ? 'Đang cập nhật...' : 'Xác nhận loại'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: Xác nhận Chuyển sang Phỏng vấn */}
      {/* ========================================================================= */}
      {showInterviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/60 w-full max-w-md p-6 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[24px]">forward_to_inbox</span>
              </div>
              <div>
                <h3 className="font-headline-xl text-headline-xl text-on-surface font-bold">Chuyển sang Sơ tuyển Phỏng vấn</h3>
                <p className="font-body-sm text-body-sm text-outline mt-0.5">
                  Xác nhận chuyển {selectedIds.length} ứng viên vào danh sách sơ tuyển (SHORTLISTED).
                </p>
              </div>
            </div>

            <p className="font-body-sm text-body-sm text-outline bg-surface-container-low p-3 rounded-lg">
              Sau khi chuyển, các ứng viên sẽ sẵn sàng để HR lên lịch phỏng vấn chi tiết qua module Quản lý Phỏng vấn.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-outline-variant/40">
              <button
                type="button"
                onClick={() => setShowInterviewModal(false)}
                className="h-9 px-4 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-body-sm font-semibold cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleExecuteBulkMoveInterview}
                disabled={isMovingInterview}
                className="h-9 px-4 rounded-lg bg-primary hover:bg-primary-container text-on-primary text-body-sm font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {isMovingInterview ? 'sync' : 'check'}
                </span>
                <span>{isMovingInterview ? 'Đang chuyển...' : 'Xác nhận chuyển'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: Xác nhận Sàng lọc AI hàng loạt cho trang/job hiện tại */}
      {/* ========================================================================= */}
      {showAiBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/60 w-full max-w-md p-6 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-secondary text-on-secondary flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[24px]">auto_awesome</span>
              </div>
              <div>
                <h3 className="font-headline-xl text-headline-xl text-on-surface font-bold">Sàng lọc AI Hàng Loạt</h3>
                <p className="font-body-sm text-body-sm text-outline mt-0.5">
                  Bạn sắp chạy mô hình TalentPulse Neural Match cho toàn bộ {applications.length} ứng viên trên trang này.
                </p>
              </div>
            </div>

            <p className="font-body-sm text-body-sm text-outline bg-surface-container-low p-3 rounded-lg">
              Thuật toán sẽ phân tích kỹ năng, số năm kinh nghiệm và mức độ tương thích ngữ nghĩa với bản mô tả công việc (JD), sau đó cập nhật điểm số và nhận xét tóm tắt.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-outline-variant/40">
              <button
                type="button"
                onClick={() => setShowAiBatchModal(false)}
                className="h-9 px-4 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-body-sm font-semibold cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => handleBulkRescreen(applications.map((a) => a.id))}
                disabled={isBatchRescreening}
                className="h-9 px-4 rounded-lg bg-secondary hover:bg-secondary-container text-on-secondary text-body-sm font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {isBatchRescreening ? 'sync' : 'auto_awesome'}
                </span>
                <span>{isBatchRescreening ? 'Đang phân tích...' : 'Bắt đầu sàng lọc'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: Tiếp nhận CV mới */}
      {/* ========================================================================= */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/60 w-full max-w-md p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-outline-variant/40 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[24px]">upload_file</span>
                <h3 className="font-headline-xl text-headline-xl text-on-surface font-bold">Tiếp Nhận CV Mới</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="p-1 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <p className="font-body-sm text-body-sm text-outline">
              Bạn có thể điều hướng tới cổng đăng tin tuyển dụng công khai hoặc trực tiếp hướng dẫn ứng viên nộp hồ sơ qua hệ thống.
            </p>

            <div className="flex flex-col gap-2">
              <Link
                href="/jobs"
                target="_blank"
                className="p-3 rounded-xl bg-surface-container-low hover:bg-surface-container border border-outline-variant/40 flex items-center justify-between group transition-colors"
              >
                <div className="flex flex-col">
                  <span className="font-body-base-medium text-on-surface font-semibold group-hover:text-primary">
                    Mở Cổng Tuyển Dụng Ứng Viên
                  </span>
                  <span className="font-body-sm text-outline text-xs">
                    Xem danh sách tin đang mở và nộp hồ sơ trực tuyến
                  </span>
                </div>
                <span className="material-symbols-outlined text-outline group-hover:text-primary">open_in_new</span>
              </Link>

              <Link
                href="/dashboard/jobs/create"
                className="p-3 rounded-xl bg-surface-container-low hover:bg-surface-container border border-outline-variant/40 flex items-center justify-between group transition-colors"
              >
                <div className="flex flex-col">
                  <span className="font-body-base-medium text-on-surface font-semibold group-hover:text-primary">
                    Tạo Tin Tuyển Dụng Mới
                  </span>
                  <span className="font-body-sm text-outline text-xs">
                    Mở vị trí mới để thu hút hồ sơ ứng tuyển từ các nguồn
                  </span>
                </div>
                <span className="material-symbols-outlined text-outline group-hover:text-primary">add_circle</span>
              </Link>
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-outline-variant/40">
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="h-9 px-4 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-body-sm font-semibold cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
