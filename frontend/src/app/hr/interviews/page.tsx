'use client';

import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { apiRequest } from '@/lib/api';
import { RoleGuard } from '@/components/auth/role-guard';
import { ApplicationSelectCombobox } from '@/components/hr/ApplicationSelectCombobox';
import { HrApplicationItem, getApplicationDetailForHrApi } from '@/lib/application-api';

interface InterviewItem {
  id: string;
  applicationId: string;
  interviewerId: string;
  scheduledAt: string;
  durationMinutes: number;
  location: string | null;
  meetingUrl: string | null;
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  notes: string | null;
  rating: number | null;
  feedback: string | null;
  createdAt: string;
  interviewer?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  application?: {
    id: string;
    status: string;
    candidateProfile?: {
      user?: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        avatarUrl?: string | null;
      };
    };
    jobPosting?: {
      id: string;
      title: string;
      department: string | null;
      location: string | null;
    };
  };
}

function formatDateDisplay(iso: string) {
  try {
    const d = new Date(iso);
    return {
      date: d.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }),
      time: d.toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      isToday: d.toDateString() === new Date().toDateString(),
    };
  } catch {
    return { date: iso, time: '', isToday: false };
  }
}

function HrInterviewsContent() {
  const searchParams = useSearchParams();
  const urlApplicationId = searchParams.get('applicationId');

  const [interviews, setInterviews] = useState<InterviewItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals state
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedInterview, setSelectedInterview] = useState<InterviewItem | null>(null);

  // Form states
  const [selectedApplicationItem, setSelectedApplicationItem] = useState<HrApplicationItem | null>(null);
  const [scheduleForm, setScheduleForm] = useState({
    applicationId: '',
    scheduledAt: '',
    durationMinutes: 60,
    location: '',
    meetingUrl: '',
    notes: '',
  });
  const [formErrors, setFormErrors] = useState<{
    applicationId?: string;
    scheduledAt?: string;
    durationMinutes?: string;
  }>({});

  const [feedbackForm, setFeedbackForm] = useState({
    rating: 5,
    feedback: '',
    notes: '',
  });
  const [cancelReason, setCancelReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchInterviews = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      let endpoint = '/interviews';
      if (statusFilter !== 'ALL') {
        endpoint += `?status=${statusFilter}`;
      }
      const res = await apiRequest<InterviewItem[]>(endpoint);
      if (res.success && res.data) {
        setInterviews(res.data);
      } else {
        setError(res.error?.message || 'Không thể tải danh sách phỏng vấn');
      }
    } catch {
      setError('Lỗi kết nối khi tải danh sách lịch phỏng vấn');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchInterviews();
  }, [fetchInterviews]);

  // Luồng tự động khi truy cập từ trang chi tiết hồ sơ với ?applicationId=...
  useEffect(() => {
    if (urlApplicationId) {
      setScheduleForm((prev) => ({ ...prev, applicationId: urlApplicationId }));
      setShowScheduleModal(true);

      getApplicationDetailForHrApi(urlApplicationId)
        .then((detail) => {
          setSelectedApplicationItem({
            id: detail.id,
            status: detail.status,
            appliedAt: detail.appliedAt,
            updatedAt: detail.updatedAt,
            coverLetter: detail.coverLetter,
            aiMatchScore: detail.aiMatchScore,
            parsedSkills: detail.parsedSkills,
            aiAnalysisSummary: detail.aiAnalysisSummary,
            cvFileUrl: detail.cvFileUrl,
            jobPosting: detail.jobPosting,
            candidate: {
              candidateProfileId: detail.candidate.id,
              fullName: detail.candidate.fullName,
              email: detail.candidate.email,
              avatarUrl: detail.candidate.avatarUrl,
              phone: detail.candidate.phone,
              experienceYears: detail.candidate.experienceYears,
              education: detail.candidate.education,
            },
          });
        })
        .catch((err) => {
          console.warn('Không thể tải chi tiết hồ sơ từ URL param:', err);
        });
    }
  }, [urlApplicationId]);

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: {
      applicationId?: string;
      scheduledAt?: string;
      durationMinutes?: string;
    } = {};

    // 1. Kiểm tra đơn ứng tuyển
    if (!scheduleForm.applicationId) {
      errors.applicationId = 'Vui lòng chọn ứng viên ứng tuyển từ danh sách';
    }

    // 2. Kiểm tra thời gian phỏng vấn
    if (!scheduleForm.scheduledAt) {
      errors.scheduledAt = 'Vui lòng chọn thời gian phỏng vấn';
    } else {
      const scheduledDate = new Date(scheduleForm.scheduledAt);
      if (isNaN(scheduledDate.getTime())) {
        errors.scheduledAt = 'Thời gian phỏng vấn không đúng định dạng hợp lệ';
      } else if (scheduledDate <= new Date()) {
        errors.scheduledAt = 'Thời gian phỏng vấn phải là một thời điểm trong tương lai';
      }
    }

    // 3. Kiểm tra thời lượng
    if (
      scheduleForm.durationMinutes === undefined ||
      isNaN(scheduleForm.durationMinutes) ||
      scheduleForm.durationMinutes < 15 ||
      scheduleForm.durationMinutes > 480
    ) {
      errors.durationMinutes = 'Thời lượng phỏng vấn phải từ 15 đến 480 phút';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await apiRequest('/interviews', {
        method: 'POST',
        body: JSON.stringify(scheduleForm),
      });
      if (res.success) {
        setActionSuccess('Tạo lịch phỏng vấn thành công!');
        setShowScheduleModal(false);
        setScheduleForm({
          applicationId: '',
          scheduledAt: '',
          durationMinutes: 60,
          location: '',
          meetingUrl: '',
          notes: '',
        });
        setSelectedApplicationItem(null);
        fetchInterviews();
      } else {
        setError(res.error?.message || 'Tạo lịch phỏng vấn thất bại');
      }
    } catch {
      setError('Lỗi khi gửi yêu cầu tạo lịch phỏng vấn');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInterview) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await apiRequest(`/interviews/${selectedInterview.id}/feedback`, {
        method: 'PATCH',
        body: JSON.stringify({
          rating: feedbackForm.rating,
          feedback: feedbackForm.feedback,
          notes: feedbackForm.notes || undefined,
          status: 'COMPLETED',
        }),
      });
      if (res.success) {
        setActionSuccess('Đã lưu kết quả đánh giá phỏng vấn thành công!');
        setShowFeedbackModal(false);
        fetchInterviews();
      } else {
        setError(res.error?.message || 'Lỗi khi lưu kết quả đánh giá');
      }
    } catch {
      setError('Lỗi kết nối khi gửi đánh giá');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelInterview = async () => {
    if (!selectedInterview) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await apiRequest(`/interviews/${selectedInterview.id}/cancel`, {
        method: 'PATCH',
        body: JSON.stringify({
          notes: cancelReason || undefined,
        }),
      });
      if (res.success) {
        setActionSuccess('Đã hủy lịch phỏng vấn thành công');
        setShowCancelModal(false);
        setCancelReason('');
        fetchInterviews();
      } else {
        setError(res.error?.message || 'Lỗi khi hủy lịch phỏng vấn');
      }
    } catch {
      setError('Lỗi kết nối khi gửi yêu cầu hủy lịch');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Tính toán Bento Summary Metrics
  const summaryMetrics = useMemo(() => {
    const todayStr = new Date().toDateString();
    const scheduled = interviews.filter((i) => i.status === 'SCHEDULED');
    const today = interviews.filter((i) => {
      try {
        return new Date(i.scheduledAt).toDateString() === todayStr;
      } catch {
        return false;
      }
    });
    const completed = interviews.filter((i) => i.status === 'COMPLETED');
    const cancelled = interviews.filter((i) => i.status === 'CANCELLED' || i.status === 'NO_SHOW');

    return {
      total: interviews.length,
      scheduledCount: scheduled.length,
      todayCount: today.length,
      completedCount: completed.length,
      cancelledCount: cancelled.length,
    };
  }, [interviews]);

  // Lọc client-side theo query tìm kiếm
  const filteredInterviews = useMemo(() => {
    if (!searchQuery.trim()) return interviews;
    const q = searchQuery.toLowerCase().trim();
    return interviews.filter((item) => {
      const candUser = item.application?.candidateProfile?.user;
      const fullName = candUser ? `${candUser.firstName} ${candUser.lastName}`.toLowerCase() : '';
      const email = candUser?.email?.toLowerCase() || '';
      const jobTitle = item.application?.jobPosting?.title?.toLowerCase() || '';
      const interviewerName = item.interviewer ? `${item.interviewer.firstName} ${item.interviewer.lastName}`.toLowerCase() : '';

      return (
        fullName.includes(q) ||
        email.includes(q) ||
        jobTitle.includes(q) ||
        interviewerName.includes(q)
      );
    });
  }, [interviews, searchQuery]);

  const getStatusBadge = (status: InterviewItem['status']) => {
    switch (status) {
      case 'SCHEDULED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
            Đã lên lịch
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
            Hoàn thành
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
            Đã hủy
          </span>
        );
      case 'NO_SHOW':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            Không tham gia
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Quản lý Lịch phỏng vấn
            </h1>
            <span className="font-tabular-mono text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
              {interviews.length} phiên phỏng vấn
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Điều phối các phiên phỏng vấn ứng viên, chia sẻ liên kết Google Meet / Zoom và ghi nhận đánh giá năng lực.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setSelectedApplicationItem(null);
            setScheduleForm({
              applicationId: '',
              scheduledAt: '',
              durationMinutes: 60,
              location: '',
              meetingUrl: '',
              notes: '',
            });
            setFormErrors({});
            setShowScheduleModal(true);
          }}
          className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold shadow-2xs transition-all cursor-pointer shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>+ Lên lịch phỏng vấn mới</span>
        </button>
      </div>

      {/* Thông báo Alert */}
      {actionSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex justify-between items-center shadow-2xs">
          <span>{actionSuccess}</span>
          <button type="button" onClick={() => setActionSuccess(null)} className="text-emerald-700 hover:text-emerald-950 font-bold ml-2">
            ✕
          </button>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex justify-between items-center shadow-2xs">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} className="text-rose-700 hover:text-rose-950 font-bold ml-2">
            ✕
          </button>
        </div>
      )}

      {/* Summary Bento KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Sắp tới */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-center justify-between relative overflow-hidden">
          <div className="flex flex-col">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
              Lịch sắp tới
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="font-tabular-mono text-2xl font-extrabold text-blue-600 leading-none">
                {summaryMetrics.scheduledCount}
              </span>
              <span className="text-xs text-slate-500">phiên</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500/30" />
        </div>

        {/* KPI 2: Diễn ra hôm nay */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-center justify-between relative overflow-hidden">
          <div className="flex flex-col">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
              Diễn ra hôm nay
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="font-tabular-mono text-2xl font-extrabold text-amber-600 leading-none">
                {summaryMetrics.todayCount}
              </span>
              <span className="text-xs text-amber-700 font-medium">hôm nay</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500/30" />
        </div>

        {/* KPI 3: Đã hoàn thành */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-center justify-between relative overflow-hidden">
          <div className="flex flex-col">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
              Đã hoàn thành
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="font-tabular-mono text-2xl font-extrabold text-emerald-700 leading-none">
                {summaryMetrics.completedCount}
              </span>
              <span className="text-xs text-emerald-600 font-medium">đã đánh giá</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500/30" />
        </div>

        {/* KPI 4: Đã hủy / vắng mặt */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-center justify-between relative overflow-hidden">
          <div className="flex flex-col">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
              Đã hủy / Vắng mặt
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="font-tabular-mono text-2xl font-extrabold text-slate-700 leading-none">
                {summaryMetrics.cancelledCount}
              </span>
              <span className="text-xs text-slate-400">phiên</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-300" />
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
            placeholder="Tìm ứng viên, email, vị trí tuyển dụng..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-10 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 text-xs sm:text-sm focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600 p-0.5"
            >
              ✕
            </button>
          )}
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {[
            { label: 'Tất cả', value: 'ALL' },
            { label: 'Đã lên lịch', value: 'SCHEDULED' },
            { label: 'Hoàn thành', value: 'COMPLETED' },
            { label: 'Đã hủy', value: 'CANCELLED' },
            { label: 'Vắng mặt', value: 'NO_SHOW' },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
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

      {/* Danh sách lịch phỏng vấn dạng DataTable */}
      <div className="rounded-2xl bg-white border border-slate-200/90 shadow-2xs overflow-hidden flex flex-col">
        <div className="overflow-x-auto w-full">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="bg-slate-50/90 text-slate-500 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200 select-none">
                <th className="py-3 px-4 min-w-[220px]">Ứng viên</th>
                <th className="py-3 px-4 min-w-[180px]">Vị trí tuyển dụng</th>
                <th className="py-3 px-4 min-w-[170px]">Thời gian & Thời lượng</th>
                <th className="py-3 px-4 min-w-[180px]">Hình thức phỏng vấn</th>
                <th className="py-3 px-4 min-w-[150px]">Người phỏng vấn</th>
                <th className="py-3 px-4 min-w-[130px]">Trạng thái</th>
                <th className="py-3 px-4 text-right min-w-[140px]">Thao tác</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-200" />
                        <div className="space-y-1.5 flex-1">
                          <div className="h-3.5 bg-slate-200 rounded w-28" />
                          <div className="h-3 bg-slate-100 rounded w-36" />
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="h-3.5 bg-slate-200 rounded w-32" />
                    </td>
                    <td className="py-4 px-4">
                      <div className="h-3.5 bg-slate-200 rounded w-28" />
                    </td>
                    <td className="py-4 px-4">
                      <div className="h-3.5 bg-slate-200 rounded w-32" />
                    </td>
                    <td className="py-4 px-4">
                      <div className="h-3.5 bg-slate-200 rounded w-24" />
                    </td>
                    <td className="py-4 px-4">
                      <div className="h-5 bg-slate-200 rounded-full w-20" />
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="h-7 bg-slate-200 rounded w-16 ml-auto" />
                    </td>
                  </tr>
                ))
              ) : filteredInterviews.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center px-4">
                    <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-slate-200 text-slate-400">
                      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">Không có lịch phỏng vấn nào</h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      Chưa có lịch nào khớp với trạng thái hoặc từ khóa tìm kiếm hiện tại. Bấm &quot;+ Lên lịch phỏng vấn mới&quot; để thiết lập.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredInterviews.map((item) => {
                  const candUser = item.application?.candidateProfile?.user;
                  const candName = candUser ? `${candUser.firstName} ${candUser.lastName}` : 'Ứng viên chưa rõ';
                  const job = item.application?.jobPosting;
                  const dateInfo = formatDateDisplay(item.scheduledAt);

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Candidate */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center border border-blue-200 shrink-0">
                            {candName.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 truncate">
                              {candName}
                            </div>
                            <div className="text-xs text-slate-500 truncate">
                              {candUser?.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Job Position */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800 text-xs">
                          {job?.title || 'Vị trí chưa rõ'}
                        </div>
                        {job?.department && (
                          <div className="text-[11px] text-slate-500 truncate">
                            {job.department}
                          </div>
                        )}
                      </td>

                      {/* Schedule Time */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 font-tabular-mono text-xs font-semibold text-slate-800">
                          <span>{dateInfo.time}</span>
                          <span>•</span>
                          <span>{dateInfo.date}</span>
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-[11px] text-slate-500 font-tabular-mono">
                            {item.durationMinutes} phút
                          </span>
                          {dateInfo.isToday && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">
                              Hôm nay
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Method (Meeting URL or Location) */}
                      <td className="py-3.5 px-4">
                        {item.meetingUrl ? (
                          <div className="flex items-center gap-1.5 text-xs text-blue-600">
                            <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            <a
                              href={item.meetingUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="truncate hover:underline max-w-[150px]"
                            >
                              Mở phòng họp ↗
                            </a>
                          </div>
                        ) : item.location ? (
                          <div className="text-xs text-slate-600 flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            </svg>
                            <span className="truncate max-w-[150px]">{item.location}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Chưa xác định</span>
                        )}
                      </td>

                      {/* Interviewer */}
                      <td className="py-3.5 px-4">
                        <div className="text-xs font-medium text-slate-800">
                          {item.interviewer
                            ? `${item.interviewer.firstName} ${item.interviewer.lastName}`
                            : 'HR Phụ trách'}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[140px]">
                          {item.interviewer?.email}
                        </div>
                      </td>

                      {/* Status & Rating */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1">
                          {getStatusBadge(item.status)}
                          {item.rating && (
                            <span className="text-[11px] font-bold text-amber-600 font-tabular-mono">
                              ⭐ {item.rating}/5
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          {item.status === 'SCHEDULED' && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedInterview(item);
                                  setFeedbackForm({ rating: 5, feedback: '', notes: item.notes || '' });
                                  setShowFeedbackModal(true);
                                }}
                                className="px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
                              >
                                Đánh giá
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedInterview(item);
                                  setCancelReason('');
                                  setShowCancelModal(true);
                                }}
                                className="px-2 py-1 text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer"
                              >
                                Hủy
                              </button>
                            </>
                          )}

                          <Link
                            href={`/hr/applications/${item.applicationId}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                            title="Xem chi tiết hồ sơ ứng viên"
                          >
                            Hồ sơ →
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
      </div>

      {/* Modal: Lên lịch phỏng vấn */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">Lên lịch phỏng vấn ứng viên</h2>
                <p className="text-xs text-slate-500">Thiết lập thời gian và phương thức gặp mặt ứng viên.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowScheduleModal(false);
                  setSelectedApplicationItem(null);
                  setFormErrors({});
                }}
                className="text-slate-400 hover:text-slate-700 p-1 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSchedule} className="space-y-4">
              {/* Component Combobox Tìm kiếm & Chọn ứng viên */}
              <div>
                <ApplicationSelectCombobox
                  value={scheduleForm.applicationId}
                  onChange={(appId, item) => {
                    setScheduleForm((prev) => ({ ...prev, applicationId: appId }));
                    setSelectedApplicationItem(item || null);
                    if (formErrors.applicationId) {
                      setFormErrors((prev) => ({ ...prev, applicationId: undefined }));
                    }
                  }}
                  preselectedItem={selectedApplicationItem}
                  error={formErrors.applicationId}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Thời gian phỏng vấn <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    required
                    min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
                    value={scheduleForm.scheduledAt}
                    onChange={(e) => {
                      setScheduleForm({ ...scheduleForm, scheduledAt: e.target.value });
                      if (formErrors.scheduledAt) {
                        setFormErrors((prev) => ({ ...prev, scheduledAt: undefined }));
                      }
                    }}
                    className={`w-full px-3 py-2 text-xs sm:text-sm border rounded-xl focus:ring-1 focus:ring-blue-500 focus:outline-none ${
                      formErrors.scheduledAt ? 'border-rose-300 bg-rose-50/30' : 'border-slate-300 bg-slate-50/50'
                    }`}
                  />
                  {formErrors.scheduledAt && (
                    <p className="text-xs text-rose-500 mt-1 font-medium">{formErrors.scheduledAt}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Thời lượng (phút) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={15}
                    max={480}
                    required
                    value={scheduleForm.durationMinutes}
                    onChange={(e) => {
                      setScheduleForm({ ...scheduleForm, durationMinutes: Number(e.target.value) });
                      if (formErrors.durationMinutes) {
                        setFormErrors((prev) => ({ ...prev, durationMinutes: undefined }));
                      }
                    }}
                    className={`w-full px-3 py-2 text-xs sm:text-sm border rounded-xl focus:ring-1 focus:ring-blue-500 focus:outline-none ${
                      formErrors.durationMinutes ? 'border-rose-300 bg-rose-50/30' : 'border-slate-300 bg-slate-50/50'
                    }`}
                  />
                  {formErrors.durationMinutes && (
                    <p className="text-xs text-rose-500 mt-1 font-medium">{formErrors.durationMinutes}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Link họp trực tuyến (Google Meet / Zoom)
                </label>
                <input
                  type="url"
                  placeholder="https://meet.google.com/..."
                  value={scheduleForm.meetingUrl}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, meetingUrl: e.target.value })}
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 bg-slate-50/50 rounded-xl focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Địa điểm phỏng vấn trực tiếp (nếu có)
                </label>
                <input
                  type="text"
                  placeholder="Phòng họp 302, Tòa nhà A..."
                  value={scheduleForm.location}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, location: e.target.value })}
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 bg-slate-50/50 rounded-xl focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ghi chú phỏng vấn
                </label>
                <textarea
                  rows={2}
                  placeholder="Nội dung cần tập trung trao đổi với ứng viên..."
                  value={scheduleForm.notes}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, notes: e.target.value })}
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 bg-slate-50/50 rounded-xl focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowScheduleModal(false);
                    setSelectedApplicationItem(null);
                    setFormErrors({});
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-2xs disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {isSubmitting ? 'Đang tạo...' : 'Xác nhận tạo lịch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Đánh giá kết quả phỏng vấn */}
      {showFeedbackModal && selectedInterview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-xl border border-slate-200">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 mb-1">Đánh giá kết quả phỏng vấn</h2>
            <p className="text-xs text-slate-500 mb-4">
              Ứng viên: <strong>{selectedInterview.application?.candidateProfile?.user?.firstName} {selectedInterview.application?.candidateProfile?.user?.lastName}</strong> ({selectedInterview.application?.jobPosting?.title})
            </p>

            <form onSubmit={handleFeedbackSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Điểm đánh giá (1 - 5 Sao) *</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setFeedbackForm({ ...feedbackForm, rating: star })}
                      className={`px-3.5 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                        feedbackForm.rating >= star
                          ? 'bg-amber-500 border-amber-600 text-white shadow-2xs'
                          : 'bg-slate-50 border-slate-200 text-slate-400'
                      }`}
                    >
                      {star} ⭐
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nhận xét chi tiết (Feedback) *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Đánh giá năng lực chuyên môn, thái độ, kỹ năng mềm..."
                  value={feedbackForm.feedback}
                  onChange={(e) => setFeedbackForm({ ...feedbackForm, feedback: e.target.value })}
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Ghi chú nội bộ</label>
                <input
                  type="text"
                  placeholder="Gợi ý mức lương hoặc lưu ý cho vòng tiếp theo..."
                  value={feedbackForm.notes}
                  onChange={(e) => setFeedbackForm({ ...feedbackForm, notes: e.target.value })}
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowFeedbackModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-2xs disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Đang lưu...' : 'Lưu kết quả đánh giá'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Xác nhận hủy phỏng vấn */}
      {showCancelModal && selectedInterview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl border border-slate-200">
            <h2 className="text-base font-bold text-slate-900 mb-2">Xác nhận hủy buổi phỏng vấn</h2>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Buổi phỏng vấn với ứng viên{' '}
              <strong>
                {selectedInterview.application?.candidateProfile?.user?.firstName}{' '}
                {selectedInterview.application?.candidateProfile?.user?.lastName}
              </strong>{' '}
              sẽ được đánh dấu là ĐÃ HỦY.
            </p>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Lý do hủy (tùy chọn)</label>
              <textarea
                rows={2}
                placeholder="Ứng viên đổi lịch, bận việc đột xuất..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-1 focus:ring-rose-500 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Không
              </button>
              <button
                type="button"
                onClick={handleCancelInterview}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-2xs disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? 'Đang hủy...' : 'Xác nhận hủy'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function HrInterviewsPage() {
  return (
    <RoleGuard allowedRoles={['HR', 'ADMIN']}>
      <Suspense
        fallback={
          <div className="max-w-7xl mx-auto px-4 py-12 text-center text-xs text-slate-500">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-slate-200 border-t-blue-600" />
            <p className="mt-2">Đang tải trang quản lý phỏng vấn...</p>
          </div>
        }
      >
        <HrInterviewsContent />
      </Suspense>
    </RoleGuard>
  );
}
