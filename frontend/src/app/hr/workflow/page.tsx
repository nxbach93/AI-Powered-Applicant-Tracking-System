'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/api';
import { RoleGuard } from '@/components/auth/role-guard';
import { getHrJobsOverviewApi, HrJobOverview } from '@/lib/application-api';

interface CandidateCard {
  id: string; // Application ID
  status: string;
  appliedAt: string;
  updatedAt?: string;
  aiMatchScore: number | null;
  parsedSkills?: string[] | null;
  jobPostingId?: string;
  candidateProfile?: {
    user?: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
  };
  jobPosting?: {
    id: string;
    title: string;
    department: string | null;
  };
  interviews?: Array<{
    id: string;
    scheduledAt: string;
    status: string;
    rating: number | null;
    feedback: string | null;
    notes?: string | null;
    interviewer?: {
      firstName: string;
      lastName: string;
    };
  }>;
}

interface KanbanData {
  total: number;
  columns: {
    SHORTLISTED: CandidateCard[];
    INTERVIEW_SCHEDULED: CandidateCard[];
    INTERVIEWED: CandidateCard[];
    OFFERED: CandidateCard[];
    HIRED: CandidateCard[];
    REJECTED: CandidateCard[];
  };
}

type ColumnKey = 'SHORTLISTED' | 'INTERVIEW_SCHEDULED' | 'INTERVIEWED' | 'OFFERED' | 'HIRED' | 'REJECTED';

interface ColumnConfigItem {
  key: ColumnKey;
  title: string;
  dotColor: string;
  badgeBg: string;
  badgeText: string;
  description: string;
}

const COLUMN_CONFIG: ColumnConfigItem[] = [
  {
    key: 'SHORTLISTED',
    title: 'Đạt vòng CV',
    dotColor: 'bg-primary-container',
    badgeBg: 'bg-primary-fixed',
    badgeText: 'text-on-primary-fixed',
    description: 'Sàng lọc AI đạt chuẩn, chờ xếp lịch sơ bộ.'
  },
  {
    key: 'INTERVIEW_SCHEDULED',
    title: 'Đã xếp lịch PV',
    dotColor: 'bg-secondary',
    badgeBg: 'bg-secondary-fixed',
    badgeText: 'text-on-secondary-fixed',
    description: 'Đã chốt giờ và gửi link phỏng vấn trực tuyến.'
  },
  {
    key: 'INTERVIEWED',
    title: 'Đã phỏng vấn',
    dotColor: 'bg-secondary-container',
    badgeBg: 'bg-secondary-fixed',
    badgeText: 'text-on-secondary-fixed',
    description: 'Đang tổng hợp điểm và biên bản đánh giá từ hội đồng.'
  },
  {
    key: 'OFFERED',
    title: 'Đã gửi Offer',
    dotColor: 'bg-surface-tint',
    badgeBg: 'bg-primary-fixed',
    badgeText: 'text-on-primary-fixed',
    description: 'Đang chờ ứng viên phản hồi và ký thỏa thuận làm việc.'
  },
  {
    key: 'HIRED',
    title: 'Thành công',
    dotColor: 'bg-tertiary',
    badgeBg: 'bg-tertiary-fixed',
    badgeText: 'text-on-tertiary-fixed',
    description: 'Đã ký kết hợp đồng, chuẩn bị kế hoạch tiếp nhận Onboarding.'
  },
  {
    key: 'REJECTED',
    title: 'Không đạt',
    dotColor: 'bg-error',
    badgeBg: 'bg-error-container',
    badgeText: 'text-on-error-container',
    description: 'Lưu trữ hồ sơ dự phòng trong kho dữ liệu TalentPool.'
  }
];

// Helper to determine AI tier label
function getAiTier(score: number | null) {
  if (score === null || score === undefined) return { label: 'Chưa chấm', bg: 'bg-surface-container', text: 'text-outline' };
  if (score >= 95) return { label: `${Math.round(score)}% • Xuất sắc`, bg: 'bg-tertiary-fixed', text: 'text-on-tertiary-fixed' };
  if (score >= 85) return { label: `${Math.round(score)}% • Rất cao`, bg: 'bg-tertiary-fixed', text: 'text-on-tertiary-fixed' };
  if (score >= 70) return { label: `${Math.round(score)}% • Đạt chuẩn`, bg: 'bg-secondary-fixed', text: 'text-on-secondary-fixed' };
  if (score >= 50) return { label: `${Math.round(score)}% • Tiềm năng`, bg: 'bg-surface-container-highest', text: 'text-on-surface-variant' };
  return { label: `${Math.round(score)}% • Chưa phù hợp`, bg: 'bg-error-container', text: 'text-on-error-container' };
}

function formatDateShort(iso: string) {
  try {
    const d = new Date(iso);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  } catch {
    return iso;
  }
}

export default function HrWorkflowPage() {
  const router = useRouter();

  // Kanban & Jobs state
  const [kanbanData, setKanbanData] = useState<KanbanData | null>(null);
  const [jobs, setJobs] = useState<HrJobOverview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJobId, setSelectedJobId] = useState<string>('ALL');
  const [selectedAiFilter, setSelectedAiFilter] = useState<string>('ALL'); // 'ALL' | '90' | '80' | '60'
  const [isAiSorted, setIsAiSorted] = useState<boolean>(false);

  // Drag & drop state
  const [draggedAppId, setDraggedAppId] = useState<string | null>(null);
  const [dragSourceCol, setDragSourceCol] = useState<ColumnKey | null>(null);
  const [dragOverCol, setDragOverCol] = useState<ColumnKey | null>(null);

  // Active Card Menu Open ID
  const [openMenuCardId, setOpenMenuCardId] = useState<string | null>(null);

  // Load jobs overview for filter
  useEffect(() => {
    async function loadJobs() {
      try {
        const jList = await getHrJobsOverviewApi();
        setJobs(jList);
      } catch {
        // Fallback silently
      }
    }
    loadJobs();
  }, []);

  // Fetch Kanban data
  const fetchKanban = useCallback(async (jobId?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const url = jobId && jobId !== 'ALL'
        ? `/interviews/workflow/kanban?jobPostingId=${encodeURIComponent(jobId)}`
        : '/interviews/workflow/kanban';
      const res = await apiRequest<KanbanData>(url);
      if (res.success && res.data) {
        setKanbanData(res.data);
      } else {
        setError(res.error?.message || 'Không thể tải quy trình tuyển dụng');
      }
    } catch {
      setError('Lỗi kết nối khi tải bảng Kanban');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKanban(selectedJobId);
  }, [selectedJobId, fetchKanban]);

  // Clear toast after 4s
  useEffect(() => {
    if (!actionMessage) return;
    const t = setTimeout(() => setActionMessage(null), 4000);
    return () => clearTimeout(t);
  }, [actionMessage]);

  // Handle Drag Start
  const handleDragStart = (e: React.DragEvent, appId: string, fromCol: ColumnKey) => {
    e.dataTransfer.setData('text/plain', appId);
    setDraggedAppId(appId);
    setDragSourceCol(fromCol);
  };

  // Handle Drag Over
  const handleDragOver = (e: React.DragEvent, targetCol: ColumnKey) => {
    e.preventDefault();
    if (dragOverCol !== targetCol) {
      setDragOverCol(targetCol);
    }
  };

  const handleDragLeave = () => {
    setDragOverCol(null);
  };

  // Execute Status Transition
  const executeStatusUpdate = async (appId: string, fromCol: ColumnKey, targetCol: ColumnKey) => {
    if (fromCol === targetCol || !kanbanData) return;

    // Workflow validation rules
    if (fromCol === 'HIRED' && targetCol !== 'HIRED') {
      setError('Hồ sơ đã tuyển dụng thành công không thể chuyển ngược lại.');
      return;
    }

    if (targetCol === 'HIRED') {
      if (!confirm('Xác nhận ứng viên này đã trúng tuyển và hoàn tất quy trình Tuyển dụng thành công?')) {
        return;
      }
    }

    if (targetCol === 'REJECTED') {
      if (!confirm('Xác nhận chuyển ứng viên sang trạng thái "Không đạt"?')) {
        return;
      }
    }

    // Find card to move
    const movingCard = kanbanData.columns[fromCol]?.find(c => c.id === appId);
    if (!movingCard) return;

    // Optimistic UI Update
    const prevData = { ...kanbanData };
    const updatedColumns = { ...kanbanData.columns };

    updatedColumns[fromCol] = updatedColumns[fromCol].filter(c => c.id !== appId);
    updatedColumns[targetCol] = [{ ...movingCard, status: targetCol }, ...updatedColumns[targetCol]];

    setKanbanData({
      ...kanbanData,
      columns: updatedColumns
    });

    setIsUpdating(true);
    setError(null);

    try {
      const res = await apiRequest(`/interviews/workflow/application/${appId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: targetCol })
      });

      if (res.success) {
        setActionMessage(`Đã chuyển ứng viên sang cột "${COLUMN_CONFIG.find(c => c.key === targetCol)?.title}"`);
      } else {
        // Rollback
        setKanbanData(prevData);
        setError(res.error?.message || 'Cập nhật trạng thái thất bại. Đã khôi phục vị trí thẻ.');
      }
    } catch {
      // Rollback
      setKanbanData(prevData);
      setError('Lỗi kết nối khi cập nhật trạng thái. Đã khôi phục vị trí thẻ.');
    } finally {
      setIsUpdating(false);
      setDraggedAppId(null);
      setDragSourceCol(null);
      setDragOverCol(null);
    }
  };

  // Handle Drop
  const handleDrop = async (e: React.DragEvent, targetCol: ColumnKey) => {
    e.preventDefault();
    const appId = e.dataTransfer.getData('text/plain') || draggedAppId;
    if (!appId || !dragSourceCol) return;

    await executeStatusUpdate(appId, dragSourceCol, targetCol);
  };

  // Filtered & Sorted Columns
  const processedColumns = useMemo(() => {
    if (!kanbanData) return null;

    const result: Record<ColumnKey, CandidateCard[]> = {
      SHORTLISTED: [],
      INTERVIEW_SCHEDULED: [],
      INTERVIEWED: [],
      OFFERED: [],
      HIRED: [],
      REJECTED: []
    };

    const query = searchQuery.trim().toLowerCase();

    (Object.keys(kanbanData.columns) as ColumnKey[]).forEach(colKey => {
      let list = kanbanData.columns[colKey] || [];

      // Filter by text search
      if (query) {
        list = list.filter(card => {
          const fullName = `${card.candidateProfile?.user?.lastName || ''} ${card.candidateProfile?.user?.firstName || ''}`.toLowerCase();
          const email = (card.candidateProfile?.user?.email || '').toLowerCase();
          const title = (card.jobPosting?.title || '').toLowerCase();
          const skills = (card.parsedSkills || []).join(' ').toLowerCase();
          return fullName.includes(query) || email.includes(query) || title.includes(query) || skills.includes(query);
        });
      }

      // Filter by AI score
      if (selectedAiFilter === '90') {
        list = list.filter(c => (c.aiMatchScore || 0) >= 90);
      } else if (selectedAiFilter === '80') {
        list = list.filter(c => (c.aiMatchScore || 0) >= 80);
      } else if (selectedAiFilter === '60') {
        list = list.filter(c => (c.aiMatchScore || 0) >= 60);
      }

      // Sort by AI score if enabled
      if (isAiSorted) {
        list = [...list].sort((a, b) => (b.aiMatchScore || 0) - (a.aiMatchScore || 0));
      }

      result[colKey] = list;
    });

    return result;
  }, [kanbanData, searchQuery, selectedAiFilter, isAiSorted]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    if (!kanbanData) {
      return { total: 0, shortlisted: 0, interviewing: 0, offered: 0, hired: 0, conversionRate: '0.0%' };
    }
    const cols = kanbanData.columns;
    const total = kanbanData.total || 0;
    const shortlisted = cols.SHORTLISTED.length;
    const interviewing = cols.INTERVIEW_SCHEDULED.length + cols.INTERVIEWED.length;
    const offered = cols.OFFERED.length;
    const hired = cols.HIRED.length;
    const conversionRate = total > 0 ? `${((hired / total) * 100).toFixed(1)}%` : '0.0%';

    return { total, shortlisted, interviewing, offered, hired, conversionRate };
  }, [kanbanData]);

  // Reset Filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedJobId('ALL');
    setSelectedAiFilter('ALL');
    setIsAiSorted(false);
  };

  return (
    <RoleGuard allowedRoles={['HR', 'ADMIN']}>
      <div className="flex flex-col w-full space-y-5" onClick={() => openMenuCardId && setOpenMenuCardId(null)}>
        {/* Toast Notification */}
        {actionMessage && (
          <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-tertiary text-on-tertiary px-4 py-3 rounded-xl shadow-lg font-body-sm-medium text-body-sm-medium animate-in fade-in slide-in-from-bottom-2">
            <span className="material-symbols-outlined text-[20px]">check_circle</span>
            <span>{actionMessage}</span>
          </div>
        )}

        {/* Global Error Banner */}
        {error && (
          <div className="w-full p-space-md rounded-xl bg-error-container text-on-error-container flex items-center justify-between gap-space-md">
            <div className="flex items-center gap-2 min-w-0">
              <span className="material-symbols-outlined text-error text-[20px] flex-shrink-0">error</span>
              <span className="font-body-sm text-body-sm truncate">{error}</span>
            </div>
            <button
              type="button"
              onClick={() => setError(null)}
              className="p-1 rounded hover:bg-error/10 text-on-error-container"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        )}

        {/* PAGE HEADER & ACTIONS */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-headline-2xl text-headline-2xl text-on-surface tracking-tight font-bold">
                Tiến trình tuyển dụng
              </h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-label-xs font-label-xs bg-tertiary-fixed text-on-tertiary-fixed font-semibold">
                Pipeline Live
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-outline mt-0.5">
              Quản lý và theo dõi ứng viên xuyên suốt quy trình tuyển dụng thông minh với TalentPulse AI.
            </p>
          </div>

          <div className="flex items-center flex-wrap gap-2.5 shrink-0">
            {/* View mode toggle */}
            <div className="flex items-center bg-surface-container rounded-lg p-0.5 shadow-sm">
              <button
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-surface-container-lowest text-primary shadow-xs font-label-sm text-label-sm font-semibold transition-all"
                title="Chế độ Kanban"
                type="button"
              >
                <span className="material-symbols-outlined text-[17px]">view_kanban</span>
                <span>Kanban</span>
              </button>
              <Link
                href="/hr/applications"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-on-surface-variant hover:text-on-surface font-label-sm text-label-sm transition-all"
                title="Chế độ Danh sách"
              >
                <span className="material-symbols-outlined text-[17px]">table_rows</span>
                <span>Danh sách</span>
              </Link>
            </div>

            {/* Action buttons */}
            <Link
              href="/hr/interviews"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-surface-container-lowest hover:bg-surface-container-low text-on-surface-variant hover:text-on-surface font-body-sm-medium text-body-sm-medium shadow-sm transition-all border border-outline-variant/30"
            >
              <span className="material-symbols-outlined text-[18px] text-outline">calendar_month</span>
              <span>Xem lịch phỏng vấn</span>
            </Link>

            <Link
              href="/hr/applications"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-container hover:bg-primary text-on-primary font-body-sm-medium text-body-sm-medium shadow-sm transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">person_add</span>
              <span>+ Thêm ứng viên vào quy trình</span>
            </Link>
          </div>
        </div>

        {/* FILTER & SEARCH TOOLBAR */}
        <div className="bg-surface-container-lowest rounded-xl p-3.5 shadow-sm space-y-3 border border-outline-variant/30">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Search bar */}
            <div className="relative flex-1 min-w-[280px] max-w-md">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-[18px] text-outline pointer-events-none">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm ứng viên theo tên, email, kỹ năng..."
                className="w-full h-9 pl-9 pr-14 rounded-lg bg-surface-container-low text-on-surface placeholder:text-outline font-body-sm text-body-sm focus:outline-none focus:bg-surface-container-lowest border border-outline-variant/50 transition-all"
              />
              <kbd className="absolute right-2.5 top-2 font-tabular-mono text-label-xs text-outline px-1.5 py-0.5 rounded bg-surface-container-lowest border border-outline-variant/40">
                ⌘K
              </kbd>
            </div>

            {/* Filter Dropdowns */}
            <div className="flex items-center flex-wrap gap-2">
              {/* Vị trí tuyển dụng */}
              <div className="relative">
                <select
                  value={selectedJobId}
                  onChange={(e) => setSelectedJobId(e.target.value)}
                  className="h-9 px-3 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface font-body-sm-medium text-body-sm-medium border border-outline-variant/50 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">Tất cả vị trí ({jobs.length})</option>
                  {jobs.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.title} ({j.totalApplications})
                    </option>
                  ))}
                </select>
              </div>

              {/* Điểm AI */}
              <div className="relative">
                <select
                  value={selectedAiFilter}
                  onChange={(e) => setSelectedAiFilter(e.target.value)}
                  className="h-9 px-3 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface font-body-sm-medium text-body-sm-medium border border-outline-variant/50 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">Điểm AI: Tất cả</option>
                  <option value="90">Điểm AI: ≥ 90% (Xuất sắc)</option>
                  <option value="80">Điểm AI: ≥ 80% (Rất cao)</option>
                  <option value="60">Điểm AI: ≥ 60% (Đạt chuẩn)</option>
                </select>
              </div>

              {/* AI Auto Sort */}
              <button
                type="button"
                onClick={() => setIsAiSorted(!isAiSorted)}
                className={`h-9 px-3.5 rounded-lg font-body-sm-medium text-body-sm-medium inline-flex items-center gap-1.5 shadow-sm transition-all ${
                  isAiSorted
                    ? 'bg-primary text-on-primary font-semibold ring-2 ring-primary/30'
                    : 'bg-secondary hover:bg-secondary-container text-on-secondary'
                }`}
                title="Tự động sắp xếp các thẻ theo điểm số AI khớp cao nhất"
              >
                <span className="material-symbols-outlined text-[17px]">auto_awesome</span>
                <span>{isAiSorted ? 'Đã sắp xếp AI' : 'Tự động sắp xếp AI'}</span>
              </button>
            </div>
          </div>

          {/* Active Filters & Meta indicators */}
          <div className="flex items-center justify-between pt-2 text-label-xs font-label-xs text-outline border-t border-outline-variant/30">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-on-surface-variant font-medium">Bộ lọc đang áp dụng:</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container text-on-surface">
                <span>Vị trí: {selectedJobId === 'ALL' ? 'Tất cả vị trí' : jobs.find(j => j.id === selectedJobId)?.title || selectedJobId}</span>
              </span>
              {selectedAiFilter !== 'ALL' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-semibold">
                  <span>Điểm AI: ≥ {selectedAiFilter}%</span>
                </span>
              )}
              {isAiSorted && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed font-semibold">
                  <span>Sắp xếp AI Match</span>
                </span>
              )}
              {(searchQuery || selectedJobId !== 'ALL' || selectedAiFilter !== 'ALL' || isAiSorted) && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-primary hover:underline ml-1 font-semibold"
                >
                  Đặt lại mặc định
                </button>
              )}
            </div>

            <div className="hidden sm:flex items-center gap-2 text-outline">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-tertiary" />
                Dữ liệu thời gian thực
              </span>
              <span>•</span>
              <button
                type="button"
                onClick={() => fetchKanban(selectedJobId)}
                className="hover:text-primary transition-colors flex items-center gap-1"
                title="Tải lại bảng"
              >
                <span className={`material-symbols-outlined text-[14px] ${isLoading ? 'animate-spin' : ''}`}>sync</span>
                <span>Làm mới</span>
              </button>
            </div>
          </div>
        </div>

        {/* SUMMARY METRICS ROW (6 Compact KPIs) */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {/* Metric 1 */}
          <div className="bg-surface-container-lowest rounded-xl p-3.5 shadow-xs flex flex-col justify-between border border-outline-variant/30">
            <div className="flex items-center justify-between text-outline">
              <span className="font-label-xs text-label-xs uppercase tracking-wider font-semibold">Tổng hồ sơ</span>
              <span className="material-symbols-outlined text-[18px] text-primary">groups</span>
            </div>
            <div className="mt-2">
              <div className="font-headline-2xl text-headline-2xl text-on-surface font-bold leading-none">
                {metrics.total}
              </div>
              <div className="font-label-xs text-label-xs text-tertiary flex items-center gap-1 mt-1 font-medium">
                <span className="material-symbols-outlined text-[14px]">trending_up</span>
                <span>Hồ sơ đang xử lý</span>
              </div>
            </div>
          </div>

          {/* Metric 2 */}
          <div className="bg-surface-container-lowest rounded-xl p-3.5 shadow-xs flex flex-col justify-between border border-outline-variant/30">
            <div className="flex items-center justify-between text-outline">
              <span className="font-label-xs text-label-xs uppercase tracking-wider font-semibold">Đạt vòng CV</span>
              <div className="w-5 h-5 rounded-md bg-primary-fixed flex items-center justify-center">
                <span className="material-symbols-outlined text-[14px] text-primary">description</span>
              </div>
            </div>
            <div className="mt-2">
              <div className="font-headline-2xl text-headline-2xl text-on-surface font-bold leading-none">
                {metrics.shortlisted} <span className="font-body-sm text-body-sm text-outline font-normal">hồ sơ</span>
              </div>
              <div className="font-label-xs text-label-xs text-outline mt-1">
                {metrics.total > 0 ? `${Math.round((metrics.shortlisted / metrics.total) * 100)}% trong quy trình` : '0%'}
              </div>
            </div>
          </div>

          {/* Metric 3 */}
          <div className="bg-surface-container-lowest rounded-xl p-3.5 shadow-xs flex flex-col justify-between border border-outline-variant/30">
            <div className="flex items-center justify-between text-outline">
              <span className="font-label-xs text-label-xs uppercase tracking-wider font-semibold">Đang phỏng vấn</span>
              <div className="w-5 h-5 rounded-md bg-secondary-fixed flex items-center justify-center">
                <span className="material-symbols-outlined text-[14px] text-secondary">forum</span>
              </div>
            </div>
            <div className="mt-2">
              <div className="font-headline-2xl text-headline-2xl text-on-surface font-bold leading-none">
                {metrics.interviewing} <span className="font-body-sm text-body-sm text-outline font-normal">hồ sơ</span>
              </div>
              <div className="font-label-xs text-label-xs text-outline mt-1">Giai đoạn đánh giá sâu</div>
            </div>
          </div>

          {/* Metric 4 */}
          <div className="bg-surface-container-lowest rounded-xl p-3.5 shadow-xs flex flex-col justify-between border border-outline-variant/30">
            <div className="flex items-center justify-between text-outline">
              <span className="font-label-xs text-label-xs uppercase tracking-wider font-semibold">Đã gửi Offer</span>
              <div className="w-5 h-5 rounded-md bg-surface-container-high flex items-center justify-center">
                <span className="material-symbols-outlined text-[14px] text-on-surface-variant">outgoing_mail</span>
              </div>
            </div>
            <div className="mt-2">
              <div className="font-headline-2xl text-headline-2xl text-on-surface font-bold leading-none">
                {metrics.offered} <span className="font-body-sm text-body-sm text-outline font-normal">hồ sơ</span>
              </div>
              <div className="font-label-xs text-label-xs text-on-surface-variant mt-1">Đang chờ phản hồi</div>
            </div>
          </div>

          {/* Metric 5 */}
          <div className="bg-surface-container-lowest rounded-xl p-3.5 shadow-xs flex flex-col justify-between border border-outline-variant/30">
            <div className="flex items-center justify-between text-outline">
              <span className="font-label-xs text-label-xs uppercase tracking-wider font-semibold">Thành công</span>
              <div className="w-5 h-5 rounded-md bg-tertiary-fixed flex items-center justify-center">
                <span className="material-symbols-outlined text-[14px] text-tertiary">verified</span>
              </div>
            </div>
            <div className="mt-2">
              <div className="font-headline-2xl text-headline-2xl text-on-surface font-bold leading-none">
                {metrics.hired} <span className="font-body-sm text-body-sm text-outline font-normal">người</span>
              </div>
              <div className="font-label-xs text-label-xs text-tertiary mt-1 font-medium">Trúng tuyển chính thức</div>
            </div>
          </div>

          {/* Metric 6 */}
          <div className="bg-surface-container-lowest rounded-xl p-3.5 shadow-xs flex flex-col justify-between border border-outline-variant/30">
            <div className="flex items-center justify-between text-outline">
              <span className="font-label-xs text-label-xs uppercase tracking-wider font-semibold">Tỷ lệ chuyển đổi</span>
              <div className="w-5 h-5 rounded-md bg-tertiary-fixed-dim flex items-center justify-center">
                <span className="material-symbols-outlined text-[14px] text-on-tertiary-fixed">trending_up</span>
              </div>
            </div>
            <div className="mt-2">
              <div className="font-headline-2xl text-headline-2xl text-tertiary font-bold leading-none">
                {metrics.conversionRate}
              </div>
              <div className="font-label-xs text-label-xs text-tertiary flex items-center gap-1 mt-1 font-medium">
                <span className="material-symbols-outlined text-[14px]">arrow_upward</span>
                <span>Tỷ lệ trúng tuyển</span>
              </div>
            </div>
          </div>
        </div>

        {/* MAIN KANBAN PIPELINE BOARD (6 Columns, Horizontal Scrollable) */}
        <div className="w-full overflow-x-auto pb-6">
          <div className="flex items-start gap-4 min-w-[1720px]">
            {COLUMN_CONFIG.map((col) => {
              const cards = processedColumns ? processedColumns[col.key] : [];
              const isOver = dragOverCol === col.key;

              return (
                <div
                  key={col.key}
                  onDragOver={(e) => handleDragOver(e, col.key)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, col.key)}
                  className={`flex-1 flex flex-col rounded-xl p-2.5 min-w-[275px] transition-colors border ${
                    isOver
                      ? 'bg-primary-fixed/30 border-primary ring-2 ring-primary/30'
                      : 'bg-surface-container-low/70 border-outline-variant/30'
                  }`}
                >
                  {/* Column Header */}
                  <div className="bg-surface-container-lowest rounded-lg p-2.5 shadow-xs mb-3 border border-outline-variant/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${col.dotColor}`} />
                        <span className="font-label-sm text-label-sm font-bold uppercase tracking-wider text-on-surface">
                          {col.title}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded-full ${col.badgeBg} ${col.badgeText} font-label-xs text-label-xs font-bold`}>
                          {cards.length}
                        </span>
                      </div>
                      <div className="flex items-center gap-0.5 text-outline">
                        <Link
                          href="/hr/applications"
                          className="p-1 hover:text-on-surface hover:bg-surface-container rounded transition-colors"
                          title="Thêm hồ sơ"
                        >
                          <span className="material-symbols-outlined text-[17px]">add</span>
                        </Link>
                      </div>
                    </div>
                    <p className="font-label-xs text-label-xs text-outline mt-1">
                      {col.description}
                    </p>
                  </div>

                  {/* Dropzone Hint for Column 3 */}
                  {col.key === 'INTERVIEWED' && (
                    <div className="bg-secondary-fixed/30 rounded-xl p-2 text-center text-label-xs font-label-xs text-secondary font-semibold flex items-center justify-center gap-1.5 mb-2.5 shadow-inner">
                      <span className="material-symbols-outlined text-[16px]">file_download</span>
                      <span>Thả vào đây sau khi hoàn tất phỏng vấn</span>
                    </div>
                  )}

                  {/* Cards Container */}
                  <div className="space-y-2.5 flex-1 min-h-[140px]">
                    {isLoading ? (
                      <div className="space-y-2">
                        <div className="h-28 bg-surface-container-lowest/60 rounded-xl animate-pulse" />
                        <div className="h-28 bg-surface-container-lowest/60 rounded-xl animate-pulse" />
                      </div>
                    ) : cards.length === 0 ? (
                      <div className="h-28 rounded-xl border border-dashed border-outline-variant/60 flex flex-col items-center justify-center text-center p-3 text-outline text-label-xs">
                        <span className="material-symbols-outlined text-[20px] mb-1 opacity-60">move_to_inbox</span>
                        <span>Kéo thả ứng viên vào đây</span>
                      </div>
                    ) : (
                      cards.map((card) => {
                        const candidateName = card.candidateProfile?.user
                          ? `${card.candidateProfile.user.lastName || ''} ${card.candidateProfile.user.firstName || ''}`.trim() || 'Ứng viên'
                          : 'Ứng viên';
                        const candidateEmail = card.candidateProfile?.user?.email || '';
                        const initials = candidateName
                          .split(' ')
                          .filter(Boolean)
                          .slice(-2)
                          .map((n) => n[0]?.toUpperCase())
                          .join('') || 'UV';

                        const aiTier = getAiTier(card.aiMatchScore);
                        const skills = card.parsedSkills?.slice(0, 2) || [];
                        const latestInterview = card.interviews?.[0];
                        const isMenuOpen = openMenuCardId === card.id;

                        return (
                          <div
                            key={card.id}
                            draggable={true}
                            onDragStart={(e) => handleDragStart(e, card.id, col.key)}
                            className="bg-surface-container-lowest rounded-xl p-3 shadow-sm hover:shadow-md transition-all duration-150 cursor-pointer group border border-outline-variant/30 relative"
                            onClick={(e) => {
                              // If not clicking interactive buttons, navigate to detail
                              if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('a')) {
                                return;
                              }
                              router.push(`/hr/applications/${card.id}`);
                            }}
                          >
                            {/* Card Top: Avatar, Name, Job */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-8 h-8 rounded-full bg-primary-fixed text-on-primary-fixed font-bold font-label-xs text-label-xs flex items-center justify-center shrink-0">
                                  {initials}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1">
                                    <span className="font-body-base-medium text-body-sm-medium text-on-surface truncate font-semibold hover:text-primary transition-colors">
                                      {candidateName}
                                    </span>
                                    {card.aiMatchScore !== null && card.aiMatchScore >= 80 && (
                                      <span className="material-symbols-outlined text-[15px] text-primary" title="Hồ sơ điểm cao">
                                        verified
                                      </span>
                                    )}
                                  </div>
                                  <div className="font-label-xs text-label-xs text-outline truncate">
                                    {card.jobPosting?.title || 'Chưa gắn vị trí'}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-0.5">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenMenuCardId(isMenuOpen ? null : card.id);
                                  }}
                                  className="p-1 rounded text-outline hover:text-on-surface hover:bg-surface-container transition-colors"
                                  title="Thao tác nhanh"
                                >
                                  <span className="material-symbols-outlined text-[18px]">more_vert</span>
                                </button>
                                <span className="material-symbols-outlined text-[18px] text-outline/40 group-hover:text-outline cursor-grab">
                                  drag_indicator
                                </span>
                              </div>
                            </div>

                            {/* Tags: AI Score & Skills */}
                            <div className="mt-2.5 flex items-center flex-wrap gap-1.5">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${aiTier.bg} ${aiTier.text} font-label-xs text-label-xs font-semibold`}>
                                <span className="material-symbols-outlined text-[12px]">auto_awesome</span>
                                <span>{aiTier.label}</span>
                              </span>
                              {skills.map((skill, sIdx) => (
                                <span
                                  key={sIdx}
                                  className="px-1.5 py-0.5 rounded bg-surface-container text-on-surface-variant font-label-xs text-label-xs font-medium truncate max-w-[90px]"
                                >
                                  {skill}
                                </span>
                              ))}
                            </div>

                            {/* Schedule info if in interview column */}
                            {(col.key === 'INTERVIEW_SCHEDULED' || col.key === 'INTERVIEWED') && latestInterview && (
                              <div className="mt-2.5 p-2 rounded-lg bg-secondary-fixed/30 text-on-secondary-fixed-variant text-label-xs font-label-xs space-y-0.5">
                                <div className="flex items-center gap-1.5 font-semibold text-secondary">
                                  <span className="material-symbols-outlined text-[15px]">event</span>
                                  <span className="truncate">
                                    {new Date(latestInterview.scheduledAt).toLocaleDateString('vi-VN')} {new Date(latestInterview.scheduledAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                {latestInterview.interviewer && (
                                  <div className="text-outline text-[11px] truncate">
                                    PV: {latestInterview.interviewer.lastName} {latestInterview.interviewer.firstName}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Offer or Hired summary note */}
                            {col.key === 'HIRED' && (
                              <div className="mt-2 p-1.5 rounded bg-tertiary-fixed/30 text-label-xs font-label-xs text-tertiary font-semibold flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">task_alt</span>
                                <span>Tuyển dụng thành công</span>
                              </div>
                            )}

                            {/* Card Footer: Date & Quick Actions */}
                            <div className="mt-2.5 pt-2 flex items-center justify-between text-label-xs font-label-xs text-outline border-t border-outline-variant/20">
                              <span className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">schedule</span>
                                <span>{formatDateShort(card.appliedAt)}</span>
                              </span>

                              <div className="flex items-center gap-1">
                                <Link
                                  href={`/hr/interviews?applicationId=${card.id}&jobId=${card.jobPostingId || card.jobPosting?.id}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="p-1 text-outline hover:text-primary rounded transition-colors"
                                  title="Lên lịch phỏng vấn"
                                >
                                  <span className="material-symbols-outlined text-[16px]">calendar_add_on</span>
                                </Link>

                                <Link
                                  href={`/hr/applications/${card.id}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-primary hover:underline font-medium text-[11px]"
                                >
                                  Xem hồ sơ
                                </Link>
                              </div>
                            </div>

                            {/* Dropdown Quick Action Menu */}
                            {isMenuOpen && (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className="absolute right-2 top-9 w-52 bg-surface-container-lowest rounded-xl shadow-xl p-1.5 z-30 space-y-0.5 text-left text-body-sm border border-outline-variant/40 animate-in fade-in zoom-in-95"
                              >
                                <Link
                                  href={`/hr/applications/${card.id}`}
                                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-surface-container text-on-surface text-left transition-colors font-medium"
                                >
                                  <span className="material-symbols-outlined text-[16px] text-outline">visibility</span>
                                  <span>Xem chi tiết hồ sơ</span>
                                </Link>

                                <Link
                                  href={`/hr/interviews?applicationId=${card.id}&jobId=${card.jobPostingId || card.jobPosting?.id}`}
                                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-surface-container text-on-surface text-left transition-colors font-medium"
                                >
                                  <span className="material-symbols-outlined text-[16px] text-secondary">calendar_add_on</span>
                                  <span>Lên lịch phỏng vấn</span>
                                </Link>

                                <Link
                                  href={`/hr/screening?applicationId=${card.id}&jobId=${card.jobPostingId || card.jobPosting?.id}`}
                                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-surface-container text-on-surface text-left transition-colors font-medium"
                                >
                                  <span className="material-symbols-outlined text-[16px] text-primary">auto_awesome</span>
                                  <span>Đánh giá AI Sàng lọc</span>
                                </Link>

                                <div className="h-[1px] bg-outline-variant/40 my-1" />

                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuCardId(null);
                                    executeStatusUpdate(card.id, col.key, 'REJECTED');
                                  }}
                                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-error-container text-error text-left transition-colors font-medium"
                                >
                                  <span className="material-symbols-outlined text-[16px]">close</span>
                                  <span>Đánh dấu không đạt</span>
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}

                    {/* TalentPool Sub-box in Column 6 */}
                    {col.key === 'REJECTED' && (
                      <div className="p-3 rounded-xl bg-surface-container-lowest shadow-xs text-center space-y-2 border border-outline-variant/30 mt-3">
                        <div className="w-8 h-8 rounded-full bg-surface-container mx-auto flex items-center justify-center text-outline">
                          <span className="material-symbols-outlined text-[18px]">inventory_2</span>
                        </div>
                        <div className="font-body-sm-medium text-body-sm-medium text-on-surface font-semibold">
                          Kho hồ sơ TalentPool
                        </div>
                        <p className="font-label-xs text-label-xs text-outline">
                          Lưu trữ ứng viên tiềm năng cho các chiến dịch tuyển dụng tiếp theo.
                        </p>
                        <Link
                          href="/hr/applications"
                          className="w-full py-1.5 px-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-sm text-label-sm font-semibold transition-colors flex items-center justify-center gap-1"
                        >
                          <span>Mở danh sách ứng viên</span>
                          <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* FLOATING QUICK HELP & PIPELINE VALIDATION NOTIFICATION */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-surface-container text-on-surface shadow-xs border border-outline-variant/30">
          <div className="flex items-center gap-2.5 text-body-sm text-body-sm">
            <span className="material-symbols-outlined text-[20px] text-primary shrink-0">info</span>
            <span>
              <strong>Gợi ý AI Workflow:</strong> Kéo thả trực tiếp ứng viên giữa 6 cột trạng thái. Hệ thống sẽ tự động cập nhật tiến độ và đồng bộ với Hội đồng Tuyển dụng.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/hr/interviews"
              className="px-3 py-1.5 rounded-md bg-surface-container-lowest hover:bg-surface-bright text-on-surface font-label-sm text-label-sm font-semibold transition-colors shadow-xs"
            >
              Quản lý phỏng vấn
            </Link>
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}
