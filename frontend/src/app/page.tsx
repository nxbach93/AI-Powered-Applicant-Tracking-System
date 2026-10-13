'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { apiRequest } from '@/lib/api';
import { getMyApplicationsApi, getMyCvApi, ApplicationListItem, CvInfo } from '@/lib/application-api';

interface JobItem {
  id: string;
  title: string;
  department?: string | null;
  location?: string | null;
  employmentType?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  status: string;
  createdAt: string;
}

interface InterviewItem {
  id: string;
  roundName?: string;
  scheduledAt: string;
  durationMinutes: number;
  meetingLink?: string;
  location?: string;
  status: string;
  notes?: string;
  jobPosting?: {
    title: string;
    department?: string;
  };
}

export default function HomePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();

  const [applications, setApplications] = useState<ApplicationListItem[]>([]);
  const [interviews, setInterviews] = useState<InterviewItem[]>([]);
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [cvInfo, setCvInfo] = useState<CvInfo | null>(null);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [todayStr, setTodayStr] = useState<string>('');

  useEffect(() => {
    setTodayStr(new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit' }));
  }, []);

  // Khi HR hoặc Admin vào trang chủ chung, tự động chuyển về Tổng quan HR
  useEffect(() => {
    if (!isLoading && isAuthenticated && user && (user.role === 'HR' || user.role === 'ADMIN')) {
      router.replace('/hr');
    }
  }, [isLoading, isAuthenticated, user, router]);

  // Tải dữ liệu thật cho Candidate
  useEffect(() => {
    let isMounted = true;

    async function loadCandidateDashboardData() {
      setIsDataLoading(true);
      try {
        // 1. Tải danh sách việc làm đang mở (public hoặc auth)
        const jobsRes = await apiRequest<JobItem[]>('/jobs?status=PUBLISHED');
        if (isMounted && jobsRes.success && jobsRes.data) {
          setJobs(Array.isArray(jobsRes.data) ? jobsRes.data : []);
        }

        // 2. Nếu đã đăng nhập, tải đơn ứng tuyển, CV và lịch phỏng vấn
        if (isAuthenticated && user?.role === 'CANDIDATE') {
          const [appsData, myCv, interviewsRes] = await Promise.all([
            getMyApplicationsApi().catch(() => []),
            getMyCvApi().catch(() => ({ hasCv: false })),
            apiRequest<InterviewItem[]>('/interviews').catch(() => ({ success: false, data: [] })),
          ]);

          if (isMounted) {
            setApplications(appsData);
            setCvInfo(myCv);
            if (interviewsRes.success && Array.isArray(interviewsRes.data)) {
              setInterviews(interviewsRes.data);
            }
          }
        }
      } catch {
        // Ignore fallback
      } finally {
        if (isMounted) setIsDataLoading(false);
      }
    }

    if (!isLoading) {
      loadCandidateDashboardData();
    }

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, user, isLoading]);

  // Tính toán độ hoàn thiện hồ sơ thật
  const profileCompleteness = useMemo(() => {
    if (!user) return 0;
    let score = 0;
    if (user.firstName) score += 15;
    if (user.lastName) score += 15;
    if (user.candidateProfile?.phone) score += 15;
    if (user.candidateProfile?.education) score += 15;
    if (user.candidateProfile?.experienceYears !== null && user.candidateProfile?.experienceYears !== undefined) score += 15;
    if (user.candidateProfile?.summary) score += 10;
    if (cvInfo?.hasCv) score += 15;
    return Math.min(score, 100);
  }, [user, cvInfo]);

  // Lịch phỏng vấn sắp tới gần nhất
  const upcomingInterview = useMemo(() => {
    return interviews.find(
      (item) => item.status === 'SCHEDULED' || item.status === 'CONFIRMED'
    );
  }, [interviews]);

  const candidateDisplayName = user
    ? `${user.lastName || ''} ${user.firstName || ''}`.trim() || user.email.split('@')[0]
    : 'Ứng viên';

  const formatSalary = (min?: number | null, max?: number | null) => {
    if (!min && !max) return 'Thỏa thuận';
    if (min && max) return `${(min / 1000000).toFixed(0)} - ${(max / 1000000).toFixed(0)} triệu VNĐ`;
    if (min) return `Từ ${(min / 1000000).toFixed(0)} triệu VNĐ`;
    return `Đến ${(max! / 1000000).toFixed(0)} triệu VNĐ`;
  };

  return (
    <main className="w-full pt-16 bg-background flex-1 text-on-surface">
      <div className="w-full max-w-[1440px] mx-auto px-gutter md:px-gutter-desktop py-space-xl flex flex-col gap-space-xl">
        {/* TOP NOTIFICATION BANNER / SESSION ALERT */}
        <div className="w-full bg-surface-container-low rounded-xl p-space-md flex flex-wrap items-center justify-between gap-space-md shadow-sm border border-outline-variant/20">
          <div className="flex items-center gap-space-sm">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-tertiary-container text-on-tertiary-container">
              <span className="material-symbols-outlined text-[18px]">verified_user</span>
            </span>
            <div className="flex items-center gap-space-xs flex-wrap">
              <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse" />
              <span className="font-body-sm-medium text-body-sm-medium text-on-surface">
                {isAuthenticated ? 'Phiên làm việc an toàn (JWT Verified)' : 'Cổng thông tin Việc làm & Tuyển dụng TalentPulse'}
              </span>
              {user && (
                <span className="text-on-surface-variant font-body-sm text-body-sm hidden sm:inline">
                  • {user.email}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-space-sm">
            <span className="px-space-xs py-0.5 rounded-full bg-surface-container text-on-surface text-label-xs font-label-xs font-semibold tracking-wide uppercase">
              Candidate Portal v2.6
            </span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              {todayStr || 'Hôm nay'}
            </span>
          </div>
        </div>

        {/* HERO HEADER: WELCOME & PROFILE HEALTH BENTO */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-stretch">
          {/* Left Welcome Statement */}
          <div className="lg:col-span-7 bg-surface-container-lowest rounded-xl p-space-xl shadow-sm border border-outline-variant/30 flex flex-col justify-between gap-space-lg relative overflow-hidden">
            <div className="absolute -right-10 -bottom-10 w-44 h-44 rounded-full bg-primary-fixed/30 pointer-events-none blur-2xl" />
            <div className="flex flex-col gap-space-sm relative z-10">
              <div className="inline-flex items-center gap-space-xs px-2.5 py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed text-label-xs font-label-xs font-semibold w-fit">
                <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                <span>HỆ THỐNG TUYỂN DỤNG THÔNG MINH TALENTPULSE</span>
              </div>
              <h1 className="font-headline-2xl text-headline-2xl text-on-surface font-bold tracking-tight">
                Xin chào, {candidateDisplayName}!
              </h1>
              <p className="font-body-base text-body-base text-on-surface-variant max-w-xl">
                Chào mừng bạn đến với TalentPulse AI Portal. Hồ sơ của bạn đang được kết nối với{' '}
                <strong className="text-primary font-bold">{jobs.length}</strong> cơ hội việc làm công nghệ cao phù hợp tiêu chuẩn tuyển dụng tự động.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-space-sm pt-space-xs relative z-10">
              <Link
                href="/jobs"
                className="inline-flex items-center gap-space-xs px-space-lg py-2.5 rounded-lg bg-primary text-on-primary font-body-base-medium text-body-base-medium shadow-sm hover:bg-primary-container transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">search</span>
                <span>Tìm việc ngay</span>
              </Link>
              <Link
                href="/profile"
                className="inline-flex items-center gap-space-xs px-space-lg py-2.5 rounded-lg bg-surface-container-low text-on-surface font-body-base-medium text-body-base-medium hover:bg-surface-container transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">manage_accounts</span>
                <span>Cập nhật hồ sơ</span>
              </Link>
              <Link
                href="/candidate/applications"
                className="inline-flex items-center gap-space-xs px-space-lg py-2.5 rounded-lg bg-surface-container-lowest border border-outline-variant/40 text-on-surface-variant font-body-base-medium text-body-base-medium hover:text-on-surface hover:bg-surface-container-low transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">assignment_turned_in</span>
                <span>Theo dõi đơn ứng tuyển</span>
              </Link>
            </div>
          </div>

          {/* Right: Profile Completeness Score Engine */}
          <div className="lg:col-span-5 bg-surface-container-lowest rounded-xl p-space-xl shadow-sm border border-outline-variant/30 flex flex-col justify-between gap-space-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-space-sm">
                <div className="w-9 h-9 rounded-xl bg-primary-fixed flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[20px]">badge</span>
                </div>
                <div>
                  <h2 className="font-headline-lg text-headline-lg text-on-surface font-semibold">
                    Độ hoàn thiện hồ sơ
                  </h2>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">Chuẩn hóa theo tiêu chí AI ATS 2026</p>
                </div>
              </div>
              <span className="font-tabular-mono text-headline-xl text-primary font-bold">
                {profileCompleteness}%
              </span>
            </div>

            <div className="flex flex-col gap-space-xs">
              <div className="w-full bg-surface-container-low h-3 rounded-full overflow-hidden p-0.5">
                <div
                  className="bg-primary h-full rounded-full transition-all duration-500"
                  style={{ width: `${profileCompleteness}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-label-xs font-label-xs text-on-surface-variant pt-1">
                <span>Cơ bản: {user ? 'Hoàn tất' : 'Chưa nhập'}</span>
                <span>Kinh nghiệm: {user?.candidateProfile?.experienceYears ? 'Tối ưu' : 'Cần bổ sung'}</span>
                <span className="text-tertiary font-semibold">
                  CV: {cvInfo?.hasCv ? 'Đã tải lên' : 'Chưa có CV'}
                </span>
              </div>
            </div>

            <div className="bg-surface-container-low rounded-lg p-space-md flex items-center justify-between gap-space-sm">
              <div className="flex items-start gap-space-xs">
                <span className="material-symbols-outlined text-secondary text-[18px] shrink-0 mt-0.5">
                  tips_and_updates
                </span>
                <div className="flex flex-col">
                  <span className="font-body-sm-medium text-body-sm-medium text-on-surface">
                    {!cvInfo?.hasCv
                      ? 'Tải lên CV PDF để kích hoạt AI Matching'
                      : 'Cập nhật kỹ năng & chứng chỉ chuyên môn'}
                  </span>
                  <span className="font-label-xs text-label-xs text-on-surface-variant">
                    Tăng tỷ lệ tiếp cận doanh nghiệp công nghệ hàng đầu
                  </span>
                </div>
              </div>
              <Link
                href="/profile"
                className="px-space-xs py-1 rounded bg-secondary-fixed text-on-secondary-fixed text-label-xs font-label-xs font-bold whitespace-nowrap hover:opacity-90"
              >
                +15%
              </Link>
            </div>
          </div>
        </div>

        {/* SECTION 2: METRICS TELEMETRY CARDS (4-COLUMN GRID) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-space-md">
          {/* Metric 1: Applications */}
          <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm border border-outline-variant/30 flex flex-col justify-between gap-space-md hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">Đơn ứng tuyển</span>
              <div className="w-8 h-8 rounded-lg bg-surface-container-low text-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">description</span>
              </div>
            </div>
            <div className="flex items-baseline gap-space-xs">
              <span className="font-tabular-mono text-headline-2xl text-on-surface font-bold">
                {applications.length}
              </span>
              <span className="font-body-sm text-body-sm text-on-surface-variant">hồ sơ đã nộp</span>
            </div>
            <div className="flex items-center gap-space-xs text-label-xs font-label-xs text-on-surface-variant pt-space-xs flex-wrap">
              <span className="px-1.5 py-0.5 rounded bg-surface-container text-on-surface font-semibold">
                {applications.filter((a) => a.status === 'SUBMITTED' || a.status === 'SCREENING' || a.status === 'SHORTLISTED').length} Đang duyệt
              </span>
              <span className="px-1.5 py-0.5 rounded bg-primary-fixed text-on-primary-fixed font-semibold">
                {applications.filter((a) => a.status === 'INTERVIEW_SCHEDULED' || a.status === 'INTERVIEWED').length} Phỏng vấn
              </span>
            </div>
          </div>

          {/* Metric 2: Upcoming Interview */}
          <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm border border-outline-variant/30 flex flex-col justify-between gap-space-md hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">Lịch phỏng vấn sắp tới</span>
              <div className="w-8 h-8 rounded-lg bg-tertiary-container text-on-tertiary-container flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">calendar_clock</span>
              </div>
            </div>
            <div className="flex items-baseline gap-space-xs">
              <span className="font-tabular-mono text-headline-2xl text-tertiary font-bold">
                {interviews.filter((i) => i.status === 'SCHEDULED' || i.status === 'CONFIRMED').length}
              </span>
              <span className="font-body-sm text-body-sm text-on-surface-variant">buổi phỏng vấn</span>
            </div>
            <div className="flex items-center gap-space-xs text-label-xs font-label-xs text-tertiary font-medium">
              <span className="material-symbols-outlined text-[15px]">event</span>
              <span className="truncate">
                {upcomingInterview
                  ? `${new Date(upcomingInterview.scheduledAt).toLocaleDateString('vi-VN')} • ${upcomingInterview.roundName || 'Vòng Chuyên môn'}`
                  : 'Chưa có lịch mới'}
              </span>
            </div>
          </div>

          {/* Metric 3: AI Compatibility Average */}
          <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm border border-outline-variant/30 flex flex-col justify-between gap-space-md hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">Vị trí công việc đang mở</span>
              <div className="w-8 h-8 rounded-lg bg-secondary-fixed text-on-secondary-fixed flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">work</span>
              </div>
            </div>
            <div className="flex items-baseline gap-space-xs">
              <span className="font-tabular-mono text-headline-2xl text-secondary font-bold">
                {jobs.length}
              </span>
              <span className="font-label-xs text-label-xs text-tertiary font-semibold">Cập nhật hôm nay</span>
            </div>
            <div className="w-full bg-surface-container-low h-1.5 rounded-full overflow-hidden">
              <div className="bg-secondary h-full rounded-full" style={{ width: '85%' }} />
            </div>
          </div>

          {/* Metric 4: Active CV Quick-Action */}
          <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm border border-outline-variant/30 flex flex-col justify-between gap-space-md hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">CV ứng tuyển chính thức</span>
              <div className="w-8 h-8 rounded-lg bg-surface-container-low text-on-surface-variant flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
              </div>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-body-sm-medium text-body-sm-medium text-on-surface truncate font-semibold">
                {cvInfo?.hasCv && cvInfo.cvFileUrl
                  ? cvInfo.cvFileUrl.split('/').pop() || 'Hồ sơ đã tải lên'
                  : 'Chưa tải lên CV'}
              </span>
              <span className="font-label-xs text-label-xs text-on-surface-variant">
                {cvInfo?.hasCv ? 'Sẵn sàng ứng tuyển' : 'Nhấn cập nhật để tải file'}
              </span>
            </div>
            <div className="flex items-center gap-space-xs pt-space-xs">
              {cvInfo?.hasCv && cvInfo.cvFileUrl ? (
                <a
                  href={`http://localhost:5000${cvInfo.cvFileUrl}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 py-1 px-2 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface font-label-xs text-label-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                >
                  <span className="material-symbols-outlined text-[14px]">visibility</span>
                  <span>Xem CV</span>
                </a>
              ) : null}
              <Link
                href="/profile"
                className="flex-1 py-1 px-2 rounded-lg bg-primary-fixed hover:bg-primary-fixed/80 text-on-primary-fixed font-label-xs text-label-xs font-semibold flex items-center justify-center gap-1 transition-colors"
              >
                <span className="material-symbols-outlined text-[14px]">upload_file</span>
                <span>{cvInfo?.hasCv ? 'Đổi CV' : 'Tải CV'}</span>
              </Link>
            </div>
          </div>
        </div>

        {/* MAIN TWO-COLUMN CONTENT AREA (Ratio: 7:5 Desktop) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl items-start">
          {/* LEFT COLUMN: Pipeline tracking & Recommended Jobs */}
          <div className="lg:col-span-7 flex flex-col gap-space-xl">
            {/* SECTION 3A: APPLICATION PROGRESS UPDATES */}
            <div className="bg-surface-container-lowest rounded-xl p-space-xl shadow-sm border border-outline-variant/30 flex flex-col gap-space-lg">
              <div className="flex items-center justify-between flex-wrap gap-space-sm">
                <div className="flex items-center gap-space-sm">
                  <span className="w-3 h-3 rounded-full bg-primary" />
                  <h2 className="font-headline-lg text-headline-lg text-on-surface font-semibold">
                    Cập nhật tiến độ ứng tuyển mới nhất
                  </h2>
                </div>
                <Link
                  href="/candidate/applications"
                  className="inline-flex items-center gap-space-xs font-body-sm-medium text-body-sm-medium text-primary hover:text-primary-container transition-colors"
                >
                  <span>Xem tất cả {applications.length} đơn</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </Link>
              </div>

              {applications.length === 0 ? (
                <div className="p-8 rounded-xl bg-surface-container-low text-center space-y-2">
                  <span className="material-symbols-outlined text-[36px] text-outline">description</span>
                  <p className="font-body-base text-body-base text-on-surface-variant">
                    Bạn chưa nộp đơn ứng tuyển nào. Hãy khám phá các cơ hội nghề nghiệp ngay!
                  </p>
                  <Link
                    href="/jobs"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-on-primary font-body-sm-medium text-body-sm-medium hover:bg-primary-container transition-all"
                  >
                    <span>Khám phá việc làm</span>
                  </Link>
                </div>
              ) : (
                applications.slice(0, 3).map((app) => (
                  <div
                    key={app.id}
                    className="bg-surface-container-low rounded-xl p-space-lg flex flex-col gap-space-md transition-all hover:bg-surface-container/60"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">
                      <div className="flex items-center gap-space-md">
                        <div className="w-12 h-12 rounded-xl bg-surface-container-lowest flex items-center justify-center shadow-xs text-primary font-bold text-headline-lg">
                          <span className="material-symbols-outlined text-[26px]">terminal</span>
                        </div>
                        <div className="flex flex-col">
                          <h3 className="font-body-base-medium text-body-base-medium text-on-surface font-bold">
                            {app.jobPosting?.title || 'Vị trí tuyển dụng'}
                          </h3>
                          <span className="font-body-sm text-body-sm text-on-surface-variant">
                            {app.jobPosting?.department || 'Khối Công nghệ'} • {app.jobPosting?.location || 'Hà Nội / TP.HCM'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-space-xs self-start sm:self-center">
                        {app.aiMatchScore !== null && app.aiMatchScore !== undefined && (
                          <span className="px-2.5 py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed text-label-xs font-label-xs font-bold flex items-center gap-1">
                            <span className="material-symbols-outlined text-[13px]">bolt</span>
                            <span>Match {app.aiMatchScore.toFixed(0)}%</span>
                          </span>
                        )}
                        <span className="px-2.5 py-1 rounded-full bg-surface-container-high text-on-surface text-label-xs font-label-xs font-semibold">
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

                    <div className="flex items-center justify-between pt-space-xs text-label-xs font-label-xs text-on-surface-variant">
                      <span>
                        Nộp ngày: {new Date(app.appliedAt).toLocaleDateString('vi-VN')} • Mã hồ sơ: #{app.id.slice(0, 8).toUpperCase()}
                      </span>
                      <Link
                        href={`/candidate/applications/${app.id}`}
                        className="text-primary hover:underline font-semibold"
                      >
                        Chi tiết quy trình &gt;
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* SECTION 3B: AI RECOMMENDED JOBS */}
            <div className="bg-surface-container-lowest rounded-xl p-space-xl shadow-sm border border-outline-variant/30 flex flex-col gap-space-lg">
              <div className="flex items-center justify-between flex-wrap gap-space-sm">
                <div className="flex items-center gap-space-sm">
                  <span className="w-3 h-3 rounded-full bg-secondary" />
                  <h2 className="font-headline-lg text-headline-lg text-on-surface font-semibold">
                    Cơ hội việc làm đang tuyển dụng
                  </h2>
                </div>
                <Link
                  href="/jobs"
                  className="inline-flex items-center gap-space-xs font-body-sm-medium text-body-sm-medium text-primary hover:text-primary-container transition-colors"
                >
                  <span>Xem tất cả vị trí</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </Link>
              </div>

              <div className="space-y-3">
                {jobs.slice(0, 4).map((job) => (
                  <div
                    key={job.id}
                    className="p-4 rounded-xl bg-surface-container-low hover:bg-surface-container transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-body-base-medium text-body-base-medium text-on-surface font-bold">
                          {job.title}
                        </h4>
                        <span className="px-2 py-0.5 rounded-full bg-surface-container-lowest text-outline text-label-xs font-label-xs">
                          {job.employmentType || 'Toàn thời gian'}
                        </span>
                      </div>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">
                        {job.department || 'Phòng Kỹ thuật'} • {job.location || 'Hà Nội'} •{' '}
                        <span className="text-primary font-semibold">{formatSalary(job.salaryMin, job.salaryMax)}</span>
                      </p>
                    </div>

                    <Link
                      href={`/jobs/${job.id}`}
                      className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-body-sm-medium text-body-sm-medium text-center shadow-xs transition-colors shrink-0"
                    >
                      Ứng tuyển ngay
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: SPOTLIGHT UPCOMING INTERVIEW & TIPS */}
          <div className="lg:col-span-5 flex flex-col gap-space-xl">
            {/* Spotlight Upcoming Interview Card */}
            <div className="bg-surface-container-lowest rounded-xl p-space-xl shadow-sm border border-outline-variant/30 flex flex-col gap-space-md relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 px-space-md py-1 rounded-full bg-secondary text-on-secondary font-label-sm text-label-sm shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-surface-container-lowest animate-pulse" />
                  Lịch phỏng vấn tiêu điểm
                </span>
                <Link
                  href="/candidate/interviews"
                  className="font-label-sm text-label-sm text-primary hover:underline"
                >
                  Xem tất cả
                </Link>
              </div>

              {upcomingInterview ? (
                <div className="space-y-3 pt-2">
                  <h3 className="font-headline-lg text-headline-lg text-on-surface font-bold">
                    {upcomingInterview.jobPosting?.title || 'Phỏng vấn chuyên môn'}
                  </h3>
                  <div className="p-3 rounded-lg bg-surface-container-low space-y-1">
                    <div className="flex items-center gap-2 text-body-sm text-on-surface">
                      <span className="material-symbols-outlined text-[18px] text-primary">calendar_clock</span>
                      <strong className="font-tabular-mono">
                        {new Date(upcomingInterview.scheduledAt).toLocaleString('vi-VN')}
                      </strong>
                    </div>
                    <div className="flex items-center gap-2 text-body-sm text-on-surface-variant">
                      <span className="material-symbols-outlined text-[18px] text-secondary">videocam</span>
                      <span>
                        {upcomingInterview.location || 'Google Meet Trực tuyến'} • {upcomingInterview.durationMinutes} phút
                      </span>
                    </div>
                  </div>

                  {upcomingInterview.meetingLink && (
                    <a
                      href={upcomingInterview.meetingLink}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-body-sm-medium text-body-sm-medium text-center shadow-sm flex items-center justify-center gap-2 transition-all"
                    >
                      <span className="material-symbols-outlined text-[18px]">videocam</span>
                      <span>Tham gia phòng phỏng vấn</span>
                    </a>
                  )}
                </div>
              ) : (
                <div className="p-6 rounded-xl bg-surface-container-low text-center space-y-2">
                  <span className="material-symbols-outlined text-[32px] text-outline">event_available</span>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Hiện bạn chưa có lịch phỏng vấn sắp tới. Kết quả duyệt hồ sơ sẽ được cập nhật sớm nhất!
                  </p>
                </div>
              )}
            </div>

            {/* AI ATS Tips Box */}
            <div className="bg-surface-container-low rounded-xl p-space-xl border border-outline-variant/20 flex flex-col gap-space-md">
              <div className="flex items-center gap-2 text-secondary">
                <span className="material-symbols-outlined text-[22px]">psychology</span>
                <h3 className="font-headline-lg text-headline-lg font-bold text-on-surface">
                  Bí quyết vượt qua AI Screening
                </h3>
              </div>
              <ul className="space-y-2.5 font-body-sm text-body-sm text-on-surface-variant">
                <li className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-tertiary text-[18px] shrink-0 mt-0.5">check_circle</span>
                  <span>Trình bày các kỹ năng trọng tâm theo đúng từ khóa công nghệ trong bản mô tả công việc (JD).</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-tertiary text-[18px] shrink-0 mt-0.5">check_circle</span>
                  <span>Định dạng tệp CV dạng PDF chuẩn text, không lồng ghép văn bản vào ảnh đồ họa phức tạp.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-tertiary text-[18px] shrink-0 mt-0.5">check_circle</span>
                  <span>Mô tả kinh nghiệm thực tế kèm số liệu định lượng (e.g. tăng 30% hiệu năng, tối ưu 40% chi phí).</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
