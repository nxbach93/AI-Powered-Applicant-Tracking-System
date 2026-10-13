'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { apiRequest } from '@/lib/api';
import { RoleGuard } from '@/components/auth/role-guard';

interface CandidateInterview {
  id: string;
  roundName?: string;
  scheduledAt: string;
  durationMinutes: number;
  location: string | null;
  meetingLink?: string | null;
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  rating: number | null;
  feedback: string | null;
  notes: string | null;
  interviewer?: {
    firstName: string;
    lastName: string;
    email?: string;
  } | null;
  application?: {
    id: string;
    status: string;
    aiMatchScore?: number | null;
    jobPosting?: {
      id: string;
      title: string;
      department: string | null;
      location: string | null;
    } | null;
  } | null;
}

function CandidateInterviewsContent() {
  const [interviews, setInterviews] = useState<CandidateInterview[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'upcoming' | 'completed' | 'canceled'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMyInterviews() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await apiRequest<CandidateInterview[]>('/interviews');
        if (res.success && res.data) {
          setInterviews(Array.isArray(res.data) ? res.data : []);
        } else {
          setError(res.error?.message || 'Không thể tải danh sách lịch phỏng vấn');
        }
      } catch {
        setError('Lỗi kết nối khi tải dữ liệu lịch phỏng vấn');
      } finally {
        setIsLoading(false);
      }
    }

    fetchMyInterviews();
  }, []);

  // Nearest upcoming spotlight interview
  const upcomingSpotlight = useMemo(() => {
    return interviews.find(
      (i) => i.status === 'SCHEDULED'
    ) || interviews[0];
  }, [interviews]);

  // Filtered interviews list
  const filteredInterviews = useMemo(() => {
    return interviews.filter((item) => {
      if (activeFilter === 'upcoming') return item.status === 'SCHEDULED';
      if (activeFilter === 'completed') return item.status === 'COMPLETED';
      if (activeFilter === 'canceled') return item.status === 'CANCELLED' || item.status === 'NO_SHOW';
      return true;
    });
  }, [interviews, activeFilter]);

  const countUpcoming = interviews.filter((i) => i.status === 'SCHEDULED').length;
  const countCompleted = interviews.filter((i) => i.status === 'COMPLETED').length;
  const countCanceled = interviews.filter((i) => i.status === 'CANCELLED' || i.status === 'NO_SHOW').length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
        return (
          <span className="px-2.5 py-1 text-label-xs font-label-xs font-semibold rounded-full bg-primary-fixed text-on-primary-fixed border border-primary-fixed-dim/40 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            Sắp diễn ra
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="px-2.5 py-1 text-label-xs font-label-xs font-semibold rounded-full bg-tertiary-fixed text-on-tertiary-fixed border border-tertiary-fixed-dim/40 flex items-center gap-1">
            <span className="material-symbols-outlined text-[12px]">check_circle</span>
            Đã hoàn thành
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="px-2.5 py-1 text-label-xs font-label-xs font-semibold rounded-full bg-error-container text-on-error-container border border-error/20 flex items-center gap-1">
            <span className="material-symbols-outlined text-[12px]">cancel</span>
            Đã hủy
          </span>
        );
      case 'NO_SHOW':
        return (
          <span className="px-2.5 py-1 text-label-xs font-label-xs font-semibold rounded-full bg-surface-container-high text-on-surface-variant flex items-center gap-1">
            Vắng mặt
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 text-label-xs font-label-xs rounded-full bg-surface-container text-on-surface">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="w-full pt-16 bg-background flex-1 text-on-surface">
      <div className="w-full max-w-7xl mx-auto px-margin md:px-margin-desktop py-space-xl space-y-space-xl">
        {/* Page Header & High Precision Control Ribbon */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-lg bg-surface-container-lowest p-space-xl rounded-xl shadow-sm border border-outline-variant/30">
          <div className="space-y-space-xs max-w-2xl">
            <div className="inline-flex items-center gap-space-xs px-space-sm py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed-variant font-label-xs text-label-xs font-semibold">
              <span className="material-symbols-outlined text-[14px]">event_upcoming</span>
              <span>QUẢN LÝ LỊCH PHỎNG VẤN TRỰC TUYẾN</span>
            </div>
            <h1 className="font-headline-2xl text-headline-2xl text-on-surface tracking-tight font-bold">
              Lịch phỏng vấn của tôi
            </h1>
            <p className="font-body-base text-body-base text-on-surface-variant">
              Theo dõi lịch hẹn, tham gia phòng họp trực tuyến và cập nhật kết quả các vòng phỏng vấn tuyển dụng của bạn theo thời gian thực.
            </p>
          </div>

          {/* Quick Status Filter Tabs */}
          <div className="flex flex-wrap items-center gap-space-xs bg-surface-container-low p-1 rounded-lg border border-outline-variant/20">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-space-md py-1.5 rounded-lg font-body-sm-medium text-body-sm-medium transition-all ${
                activeFilter === 'all'
                  ? 'bg-surface-container-lowest text-primary shadow-sm font-semibold'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
              type="button"
            >
              Tất cả lịch hẹn{' '}
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-primary-fixed text-on-primary-fixed font-tabular-mono text-label-xs">
                {interviews.length}
              </span>
            </button>
            <button
              onClick={() => setActiveFilter('upcoming')}
              className={`px-space-md py-1.5 rounded-lg font-body-sm-medium text-body-sm-medium transition-all ${
                activeFilter === 'upcoming'
                  ? 'bg-surface-container-lowest text-primary shadow-sm font-semibold'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
              type="button"
            >
              Sắp diễn ra{' '}
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-secondary-fixed text-on-secondary-fixed font-tabular-mono text-label-xs">
                {countUpcoming}
              </span>
            </button>
            <button
              onClick={() => setActiveFilter('completed')}
              className={`px-space-md py-1.5 rounded-lg font-body-sm-medium text-body-sm-medium transition-all ${
                activeFilter === 'completed'
                  ? 'bg-surface-container-lowest text-primary shadow-sm font-semibold'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
              type="button"
            >
              Đã hoàn thành{' '}
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-surface-container-high text-on-surface-variant font-tabular-mono text-label-xs">
                {countCompleted}
              </span>
            </button>
            <button
              onClick={() => setActiveFilter('canceled')}
              className={`px-space-md py-1.5 rounded-lg font-body-sm-medium text-body-sm-medium transition-all ${
                activeFilter === 'canceled'
                  ? 'bg-surface-container-lowest text-primary shadow-sm font-semibold'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
              type="button"
            >
              Đã hủy{' '}
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-surface-container-high text-on-surface-variant font-tabular-mono text-label-xs">
                {countCanceled}
              </span>
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-error-container text-on-error-container text-body-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">error</span>
            <span>{error}</span>
          </div>
        )}

        {/* Active / Upcoming Spotlight Card */}
        {upcomingSpotlight && (
          <div className="relative overflow-hidden bg-surface-container-lowest rounded-xl shadow-md p-space-xl border border-outline-variant/30">
            <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-gradient-to-br from-primary-fixed/40 via-secondary-fixed/20 to-transparent blur-3xl pointer-events-none" />
            <div className="flex flex-col lg:flex-row gap-space-xl relative z-10">
              {/* Main Details Left */}
              <div className="flex-1 space-y-space-lg">
                <div className="flex flex-wrap items-center gap-space-sm">
                  {upcomingSpotlight.status === 'SCHEDULED' ? (
                    <span className="inline-flex items-center gap-1.5 px-space-md py-1 rounded-full bg-secondary text-on-secondary font-label-sm text-label-sm shadow-sm animate-pulse">
                      <span className="w-2 h-2 rounded-full bg-surface-container-lowest" />
                      Lịch hẹn sắp tới
                    </span>
                  ) : (
                    getStatusBadge(upcomingSpotlight.status)
                  )}

                  <span className="px-space-md py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-sm text-label-sm font-semibold">
                    {upcomingSpotlight.roundName || 'Phỏng vấn Tuyển dụng'}
                  </span>

                  <span className="inline-flex items-center gap-1 px-space-sm py-1 rounded-full bg-surface-container text-on-surface-variant font-label-xs text-label-xs">
                    <span className="material-symbols-outlined text-[14px]">videocam</span>
                    {upcomingSpotlight.location || 'Google Meet Trực tuyến'}
                  </span>
                </div>

                <div>
                  <h2 className="font-headline-xl text-headline-xl text-on-surface font-bold tracking-tight">
                    {upcomingSpotlight.application?.jobPosting?.title || 'Vị trí tuyển dụng'}
                  </h2>
                  <p className="font-body-base-medium text-body-base-medium text-primary mt-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[18px]">domain</span>
                    TalentPulse Tech Corp • {upcomingSpotlight.application?.jobPosting?.department || 'Khối Công nghệ'}
                  </p>
                </div>

                {/* Schedule & Context Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md bg-surface-container-low p-space-lg rounded-xl">
                  <div className="flex items-start gap-space-sm">
                    <div className="w-10 h-10 rounded-lg bg-primary-fixed flex items-center justify-center text-primary shrink-0">
                      <span className="material-symbols-outlined text-[20px]">calendar_clock</span>
                    </div>
                    <div>
                      <span className="font-label-xs text-label-xs uppercase tracking-wider text-on-surface-variant block">
                        Thời gian diễn ra
                      </span>
                      <span className="font-body-sm-medium text-body-sm-medium text-on-surface block font-bold font-tabular-mono">
                        {new Date(upcomingSpotlight.scheduledAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="font-body-sm text-body-sm text-on-surface-variant">
                        {new Date(upcomingSpotlight.scheduledAt).toLocaleDateString('vi-VN')} • {upcomingSpotlight.durationMinutes} phút
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-space-sm">
                    <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-secondary shrink-0">
                      <span className="material-symbols-outlined text-[20px]">groups</span>
                    </div>
                    <div>
                      <span className="font-label-xs text-label-xs uppercase tracking-wider text-on-surface-variant block">
                        Hội đồng phỏng vấn
                      </span>
                      <span className="font-body-sm-medium text-body-sm-medium text-on-surface block font-bold">
                        {upcomingSpotlight.interviewer
                          ? `${upcomingSpotlight.interviewer.lastName} ${upcomingSpotlight.interviewer.firstName}`
                          : 'Hội đồng chuyên môn'}
                      </span>
                      <span className="font-body-sm text-body-sm text-on-surface-variant">
                        Lead Interviewer & Talent Ops
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-space-sm">
                    <div className="w-10 h-10 rounded-lg bg-tertiary-fixed flex items-center justify-center text-tertiary shrink-0">
                      <span className="material-symbols-outlined text-[20px]">verified_user</span>
                    </div>
                    <div>
                      <span className="font-label-xs text-label-xs uppercase tracking-wider text-on-surface-variant block">
                        Đánh giá AI Sơ loại
                      </span>
                      <span className="font-body-sm-medium text-body-sm-medium text-tertiary block font-bold">
                        {upcomingSpotlight.application?.aiMatchScore !== null && upcomingSpotlight.application?.aiMatchScore !== undefined
                          ? `Khớp ${upcomingSpotlight.application.aiMatchScore.toFixed(0)}% hồ sơ`
                          : 'Đạt chuẩn sàng lọc'}
                      </span>
                      <span className="font-body-sm text-body-sm text-on-surface-variant">
                        Đã sẵn sàng phỏng vấn
                      </span>
                    </div>
                  </div>
                </div>

                {/* Readiness Notice */}
                <div className="flex items-center gap-space-sm p-space-md rounded-lg bg-surface-container text-on-surface-variant">
                  <span className="material-symbols-outlined text-secondary text-[20px] shrink-0">tips_and_updates</span>
                  <p className="font-body-sm text-body-sm">
                    {upcomingSpotlight.notes ||
                      'Vui lòng có mặt trước giờ phỏng vấn 5 phút để kiểm tra camera, micro và kết nối internet ổn định.'}
                  </p>
                </div>
              </div>

              {/* Action Buttons Right */}
              <div className="lg:w-72 flex flex-col justify-between gap-space-md border-t lg:border-t-0 lg:border-l border-outline-variant/30 pt-space-lg lg:pt-0 lg:pl-space-xl">
                <div className="space-y-space-sm">
                  <span className="font-label-xs text-label-xs uppercase tracking-wider text-on-surface-variant block">
                    Thao tác lịch hẹn
                  </span>

                  {upcomingSpotlight.meetingLink ? (
                    <a
                      href={upcomingSpotlight.meetingLink}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full py-3 px-space-lg rounded-xl bg-primary hover:bg-primary-container text-on-primary font-body-base-medium text-body-base-medium shadow-md flex items-center justify-center gap-2 transition-all"
                    >
                      <span className="material-symbols-outlined text-[20px]">videocam</span>
                      <span>Tham gia phòng họp</span>
                    </a>
                  ) : (
                    <div className="w-full py-3 px-space-lg rounded-xl bg-surface-container-low text-on-surface-variant font-body-sm text-body-sm text-center">
                      Đường dẫn phòng họp sẽ mở trước 15 phút
                    </div>
                  )}

                  <a
                    href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
                      upcomingSpotlight.application?.jobPosting?.title || 'Phỏng vấn'
                    )}&dates=${new Date(upcomingSpotlight.scheduledAt).toISOString().replace(/-|:|\.\d\d\d/g, '')}/${new Date(
                      new Date(upcomingSpotlight.scheduledAt).getTime() + upcomingSpotlight.durationMinutes * 60000
                    )
                      .toISOString()
                      .replace(/-|:|\.\d\d\d/g, '')}&details=${encodeURIComponent(
                      upcomingSpotlight.notes || 'Lịch phỏng vấn TalentPulse AI'
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2.5 px-space-md rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface font-body-sm-medium text-body-sm-medium flex items-center justify-center gap-2 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">calendar_add_on</span>
                    <span>Thêm vào Google Calendar</span>
                  </a>
                </div>

                <div className="p-space-md rounded-xl bg-surface-container-low/60 border border-outline-variant/20 text-on-surface-variant text-label-xs font-label-xs space-y-1">
                  <span className="font-bold text-on-surface block">Cần hỗ trợ đổi lịch?</span>
                  <p>Liên hệ hotline Talent Ops: 1800 6868 hoặc phản hồi qua email trước 24 giờ.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Interviews List */}
        <div className="bg-surface-container-lowest p-space-xl rounded-xl shadow-sm border border-outline-variant/30 space-y-space-lg">
          <div className="flex items-center justify-between border-b border-outline-variant/20 pb-space-md">
            <h3 className="font-headline-lg text-headline-lg text-on-surface font-bold">
              Danh sách chi tiết lịch hẹn
            </h3>
            <span className="font-label-sm text-label-sm text-outline">
              Hiển thị {filteredInterviews.length} lịch phỏng vấn
            </span>
          </div>

          {isLoading ? (
            <div className="space-y-4 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-surface-container-low rounded-xl" />
              ))}
            </div>
          ) : filteredInterviews.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <span className="material-symbols-outlined text-[48px] text-outline">event_busy</span>
              <p className="font-body-base text-body-base text-on-surface-variant">
                Không tìm thấy lịch phỏng vấn nào phù hợp với bộ lọc hiện tại.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredInterviews.map((item) => (
                <div
                  key={item.id}
                  className="p-space-lg rounded-xl bg-surface-container-low hover:bg-surface-container/70 border border-outline-variant/20 transition-all flex flex-col md:flex-row md:items-center justify-between gap-space-md"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-space-sm flex-wrap">
                      <strong className="font-body-base-medium text-body-base-medium text-on-surface font-bold">
                        {item.application?.jobPosting?.title || 'Phỏng vấn chuyên môn'}
                      </strong>
                      <span className="px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed text-label-xs font-label-xs font-semibold">
                        {item.roundName || 'Vòng Phỏng vấn'}
                      </span>
                      {getStatusBadge(item.status)}
                    </div>

                    <div className="flex items-center gap-space-md text-body-sm text-body-sm text-on-surface-variant flex-wrap pt-0.5">
                      <span className="flex items-center gap-1 font-tabular-mono font-semibold text-primary">
                        <span className="material-symbols-outlined text-[16px]">calendar_clock</span>
                        {new Date(item.scheduledAt).toLocaleString('vi-VN')} ({item.durationMinutes} phút)
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">person</span>
                        {item.interviewer
                          ? `${item.interviewer.lastName} ${item.interviewer.firstName}`
                          : 'Hội đồng phỏng vấn'}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">location_on</span>
                        {item.location || 'Google Meet Trực tuyến'}
                      </span>
                    </div>

                    {item.feedback && (
                      <div className="pt-2 text-body-sm text-on-surface bg-surface-container-lowest p-2 rounded-lg border border-outline-variant/20">
                        <strong>Phản hồi từ người phỏng vấn:</strong> {item.feedback}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 self-start md:self-center shrink-0">
                    {item.meetingLink && item.status === 'SCHEDULED' && (
                      <a
                        href={item.meetingLink}
                        target="_blank"
                        rel="noreferrer"
                        className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-body-sm-medium text-body-sm-medium shadow-xs transition-colors"
                      >
                        Vào phòng họp
                      </a>
                    )}
                    {item.application?.id && (
                      <Link
                        href={`/candidate/applications/${item.application.id}`}
                        className="px-3 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-body-sm text-body-sm transition-colors"
                      >
                        Xem đơn
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CandidateInterviewsPage() {
  return (
    <RoleGuard allowedRoles={['CANDIDATE', 'ADMIN']}>
      <CandidateInterviewsContent />
    </RoleGuard>
  );
}
