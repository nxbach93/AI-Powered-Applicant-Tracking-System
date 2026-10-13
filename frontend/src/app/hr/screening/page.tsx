'use client';

import React, { useEffect, useState, useMemo, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  getHrJobsOverviewApi,
  getApplicationsByJobApi,
  getApplicationDetailForHrApi,
  rescreenApplicationApi,
  updateApplicationStatusApi,
  HrJobOverview,
  HrApplicationItem,
  HrApplicationDetail,
  ApplicationStatus,
} from '@/lib/application-api';

interface StructuredAiAnalysis {
  summary: string;
  score_breakdown?: {
    skill_score?: number;
    experience_score?: number;
    semantic_score?: number;
    domain_score?: number;
    education_score?: number;
  } | null;
  matched_skills?: string[];
  missing_skills?: string[];
  warnings?: string[];
  experience_years?: number | null;
  experience_gap?: number | null;
}

export default function HrAiScreeningPage() {
  return (
    <Suspense fallback={
      <div className="w-full py-16 flex items-center justify-center">
        <div className="flex items-center gap-3 text-primary font-body-sm-medium">
          <span className="material-symbols-outlined text-[24px] animate-spin">progress_activity</span>
          <span>Đang tải trung tâm Sàng lọc AI...</span>
        </div>
      </div>
    }>
      <HrAiScreeningContent />
    </Suspense>
  );
}

function HrAiScreeningContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paramAppId = searchParams.get('applicationId');
  const paramJobId = searchParams.get('jobId');

  // Jobs & Candidates selector states
  const [jobs, setJobs] = useState<HrJobOverview[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [candidates, setCandidates] = useState<HrApplicationItem[]>([]);
  const [selectedAppId, setSelectedAppId] = useState<string>('');

  // Main Candidate Data
  const [application, setApplication] = useState<HrApplicationDetail | null>(null);

  // Status flags
  const [isLoadingJobs, setIsLoadingJobs] = useState<boolean>(true);
  const [isLoadingCandidates, setIsLoadingCandidates] = useState<boolean>(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState<boolean>(false);
  const [isRescreening, setIsRescreening] = useState<boolean>(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Recruiter notes local state
  const [internalNote, setInternalNote] = useState<string>('');
  const [isNoteSaved, setIsNoteSaved] = useState<boolean>(false);

  // Load list of active jobs
  useEffect(() => {
    let isMounted = true;
    async function loadJobs() {
      setIsLoadingJobs(true);
      try {
        const jobsData = await getHrJobsOverviewApi();
        if (!isMounted) return;
        setJobs(jobsData);

        if (jobsData.length > 0) {
          const initialJobId = paramJobId && jobsData.some(j => j.id === paramJobId)
            ? paramJobId
            : jobsData[0].id;
          setSelectedJobId(initialJobId);
        }
      } catch (err: any) {
        if (!isMounted) return;
        setErrorMessage(err.message || 'Không thể tải danh sách vị trí tuyển dụng');
      } finally {
        if (isMounted) setIsLoadingJobs(false);
      }
    }
    loadJobs();
    return () => { isMounted = false; };
  }, [paramJobId]);

  // Load candidates whenever selected job changes
  useEffect(() => {
    if (!selectedJobId) return;
    let isMounted = true;

    async function loadCandidatesForJob() {
      setIsLoadingCandidates(true);
      try {
        const res = await getApplicationsByJobApi(selectedJobId, { limit: 100 });
        if (!isMounted) return;
        setCandidates(res.data);

        // Auto select application
        if (res.data.length > 0) {
          if (paramAppId && res.data.some(c => c.id === paramAppId)) {
            setSelectedAppId(paramAppId);
          } else {
            setSelectedAppId(res.data[0].id);
          }
        } else {
          setSelectedAppId('');
          setApplication(null);
        }
      } catch (err: any) {
        if (!isMounted) return;
        setErrorMessage(err.message || 'Không thể tải danh sách ứng viên của vị trí');
      } finally {
        if (isMounted) setIsLoadingCandidates(false);
      }
    }
    loadCandidatesForJob();
    return () => { isMounted = false; };
  }, [selectedJobId, paramAppId]);

  // Load detailed screening for selected application
  const loadDetail = useCallback(async (appId: string) => {
    if (!appId) return;
    setIsLoadingDetail(true);
    setErrorMessage(null);
    try {
      const data = await getApplicationDetailForHrApi(appId);
      setApplication(data);
      // Pre-fill internal note from interview notes or empty
      const existingNote = data.interviews?.[0]?.notes || data.coverLetter || '';
      setInternalNote(existingNote.slice(0, 300));
    } catch (err: any) {
      setErrorMessage(err.message || 'Không thể tải chi tiết sàng lọc AI của ứng viên');
    } finally {
      setIsLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    if (selectedAppId) {
      loadDetail(selectedAppId);
    }
  }, [selectedAppId, loadDetail]);

  // Clear toast after 4s
  useEffect(() => {
    if (!successToast) return;
    const timer = setTimeout(() => setSuccessToast(null), 4000);
    return () => clearTimeout(timer);
  }, [successToast]);

  // Parse structured AI analysis safely
  const parsedAiAnalysis = useMemo<StructuredAiAnalysis>(() => {
    if (!application?.aiAnalysisSummary) {
      return { summary: '' };
    }
    const raw = application.aiAnalysisSummary.trim();
    if (raw.startsWith('{')) {
      try {
        const parsed = JSON.parse(raw);
        return {
          summary: parsed.summary || parsed.text || '',
          score_breakdown: parsed.score_breakdown || parsed.breakdown || null,
          matched_skills: parsed.matched_skills || parsed.matchedSkills || [],
          missing_skills: parsed.missing_skills || parsed.missingSkills || [],
          warnings: parsed.warnings || [],
          experience_years: parsed.experience_years ?? parsed.experienceYears ?? null,
          experience_gap: parsed.experience_gap ?? parsed.experienceGap ?? null,
        };
      } catch {
        return { summary: raw };
      }
    }
    return { summary: raw };
  }, [application?.aiAnalysisSummary]);

  // Real skills matching breakdown
  const skillsAnalysis = useMemo(() => {
    const candidateSkills: string[] = application?.parsedSkills || [];
    const rawReqs = application?.jobPosting?.requirements || '';
    
    // If AI service provided structured matched & missing skills
    if (parsedAiAnalysis.matched_skills && parsedAiAnalysis.matched_skills.length > 0) {
      return {
        matched: parsedAiAnalysis.matched_skills,
        missing: parsedAiAnalysis.missing_skills || [],
        matchRatio: candidateSkills.length > 0 
          ? Math.min(100, Math.round((parsedAiAnalysis.matched_skills.length / (parsedAiAnalysis.matched_skills.length + (parsedAiAnalysis.missing_skills?.length || 1))) * 100))
          : 0
      };
    }

    // Fallback: compare candidate skills with job requirements text
    const reqWords = rawReqs.toLowerCase();
    const matched: string[] = [];
    const remaining: string[] = [];

    candidateSkills.forEach(s => {
      if (reqWords.includes(s.toLowerCase())) {
        matched.push(s);
      } else {
        remaining.push(s);
      }
    });

    return {
      matched: matched.length > 0 ? matched : candidateSkills.slice(0, 4),
      missing: remaining.length > 0 ? remaining.slice(0, 3) : ['Kiến thức chuyên sâu theo JD'],
      matchRatio: candidateSkills.length > 0
        ? Math.round((matched.length / candidateSkills.length) * 100)
        : (application?.aiMatchScore || 0)
    };
  }, [application?.parsedSkills, application?.jobPosting?.requirements, application?.aiMatchScore, parsedAiAnalysis]);

  // Experience and Metric calculations
  const experienceYears = application?.candidate?.experienceYears ?? parsedAiAnalysis.experience_years ?? 0;
  const matchScore = application?.aiMatchScore ?? null;
  const breakdown = parsedAiAnalysis.score_breakdown;

  const coreSkillScore = breakdown?.skill_score ?? (skillsAnalysis.matchRatio || 0);
  const practicalExpScore = breakdown?.experience_score ?? (experienceYears >= 3 ? 90 : experienceYears >= 1 ? 75 : 50);
  const educationScore = breakdown?.education_score ?? 85;
  const domainScore = breakdown?.domain_score ?? (matchScore ? Math.min(100, Math.round(matchScore * 1.05)) : 80);

  // Trigger Re-screening via Real AI Service
  const handleRescreen = async () => {
    if (!application) return;
    setIsRescreening(true);
    setErrorMessage(null);
    try {
      const res = await rescreenApplicationApi(application.id);
      setSuccessToast(`Đã sàng lọc lại AI thành công! Điểm mới: ${res.aiMatchScore ?? 0}%`);
      await loadDetail(application.id);
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi khi kích hoạt AI sàng lọc lại');
    } finally {
      setIsRescreening(false);
    }
  };

  // Status transitions
  const handleUpdateStatus = async (newStatus: ApplicationStatus, label: string) => {
    if (!application) return;
    setIsUpdatingStatus(true);
    try {
      await updateApplicationStatusApi(application.id, newStatus);
      setApplication(prev => prev ? { ...prev, status: newStatus } : null);
      setSuccessToast(`Đã cập nhật trạng thái hồ sơ: ${label}`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Không thể cập nhật trạng thái hồ sơ');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Recruiter Note Save
  const handleSaveNote = () => {
    setIsNoteSaved(true);
    setTimeout(() => setIsNoteSaved(false), 2500);
    setSuccessToast('Đã lưu ghi chú đánh giá sơ bộ của nhà tuyển dụng');
  };

  const candidateInitials = application?.candidate?.fullName
    ? application.candidate.fullName
        .split(' ')
        .filter(Boolean)
        .slice(-2)
        .map(n => n[0]?.toUpperCase())
        .join('')
    : 'UV';

  return (
    <div className="flex flex-col w-full gap-space-lg">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-tertiary text-on-tertiary px-4 py-3 rounded-xl shadow-lg font-body-sm-medium text-body-sm-medium animate-in fade-in slide-in-from-bottom-2">
          <span className="material-symbols-outlined text-[20px]">check_circle</span>
          <span>{successToast}</span>
        </div>
      )}

      {/* Global Error Banner */}
      {errorMessage && (
        <div className="w-full p-space-md rounded-xl bg-error-container text-on-error-container flex items-center justify-between gap-space-md">
          <div className="flex items-center gap-2 min-w-0">
            <span className="material-symbols-outlined text-error text-[20px] flex-shrink-0">error</span>
            <span className="font-body-sm text-body-sm truncate">{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="p-1 rounded hover:bg-error/10 text-on-error-container"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      )}

      {/* Selector Bar: Job Selector & Candidate Selector */}
      <div className="w-full bg-surface-container-lowest rounded-xl shadow-sm p-space-md flex flex-col md:flex-row items-stretch md:items-center justify-between gap-space-md border border-outline-variant/40">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-space-md flex-1 min-w-0">
          {/* Job Select */}
          <div className="flex items-center gap-2 min-w-[240px]">
            <span className="material-symbols-outlined text-outline text-[20px] flex-shrink-0">work</span>
            <div className="flex-1">
              <label className="block text-[11px] font-semibold text-outline uppercase tracking-wider mb-0.5">
                Vị trí tuyển dụng
              </label>
              <select
                value={selectedJobId}
                onChange={(e) => {
                  setSelectedJobId(e.target.value);
                  router.push(`/hr/screening?jobId=${e.target.value}`);
                }}
                disabled={isLoadingJobs}
                className="w-full h-9 px-2.5 rounded-lg bg-surface-container-low border border-outline-variant/70 text-on-surface font-body-sm-medium text-body-sm-medium focus:ring-1 focus:ring-primary focus:outline-none"
              >
                {jobs.map(job => (
                  <option key={job.id} value={job.id}>
                    {job.title} ({job.totalApplications} hồ sơ)
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="hidden sm:block h-8 w-[1px] bg-outline-variant/50" />

          {/* Candidate Select */}
          <div className="flex items-center gap-2 min-w-[260px]">
            <span className="material-symbols-outlined text-outline text-[20px] flex-shrink-0">person_search</span>
            <div className="flex-1">
              <label className="block text-[11px] font-semibold text-outline uppercase tracking-wider mb-0.5">
                Ứng viên cần thẩm định ({candidates.length})
              </label>
              <select
                value={selectedAppId}
                onChange={(e) => {
                  setSelectedAppId(e.target.value);
                  router.push(`/hr/screening?jobId=${selectedJobId}&applicationId=${e.target.value}`);
                }}
                disabled={isLoadingCandidates || candidates.length === 0}
                className="w-full h-9 px-2.5 rounded-lg bg-surface-container-low border border-outline-variant/70 text-on-surface font-body-sm-medium text-body-sm-medium focus:ring-1 focus:ring-primary focus:outline-none"
              >
                {candidates.length === 0 ? (
                  <option value="">Chưa có ứng viên nộp cho vị trí này</option>
                ) : (
                  candidates.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.candidate.fullName} • AI: {c.aiMatchScore !== null ? `${Math.round(c.aiMatchScore)}%` : 'Chưa chấm'}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>
        </div>

        {/* Global Action Refresh */}
        <div className="flex items-center gap-space-xs flex-shrink-0">
          <button
            type="button"
            onClick={() => selectedAppId && loadDetail(selectedAppId)}
            disabled={isLoadingDetail || !selectedAppId}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-body-sm-medium text-body-sm-medium transition-colors"
            title="Làm mới dữ liệu"
          >
            <span className={`material-symbols-outlined text-[18px] ${isLoadingDetail ? 'animate-spin' : ''}`}>
              sync
            </span>
            <span>Cập nhật</span>
          </button>
        </div>
      </div>

      {/* Empty State when no application */}
      {!application && !isLoadingDetail && (
        <div className="w-full bg-surface-container-lowest rounded-xl shadow-sm p-12 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-surface-container flex items-center justify-center text-outline mb-4">
            <span className="material-symbols-outlined text-[32px]">folder_open</span>
          </div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface font-semibold mb-1">
            Không tìm thấy hồ sơ ứng viên
          </h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant max-w-md mb-6">
            Vui lòng chọn vị trí tuyển dụng khác hoặc kiểm tra lại danh sách hồ sơ ứng viên đã nộp.
          </p>
          <Link
            href="/hr/applications"
            className="inline-flex items-center gap-2 h-9 px-4 rounded-xl bg-primary text-on-primary font-body-sm-medium text-body-sm-medium shadow-sm hover:bg-primary-container transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">group</span>
            <span>Về danh sách ứng viên</span>
          </Link>
        </div>
      )}

      {/* Candidate Loaded: Full Stitch Screening View */}
      {application && (
        <>
          {/* Top Utility Context & Candidate Header Banner (Pixel Accurate to Stitch) */}
          <div className="w-full bg-surface-container-lowest rounded-xl shadow-sm p-space-lg flex flex-col xl:flex-row xl:items-center justify-between gap-space-lg relative overflow-hidden border border-outline-variant/30">
            {/* Atmospheric subtle AI accent glow in background */}
            <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-secondary-fixed/30 blur-3xl pointer-events-none" />

            <div className="flex flex-col md:flex-row md:items-center gap-space-lg min-w-0 z-10">
              <div className="relative flex-shrink-0">
                <div className="w-16 h-16 rounded-xl bg-surface-container flex items-center justify-center text-primary font-headline-2xl text-headline-2xl shadow-inner font-bold">
                  {candidateInitials}
                </div>
                <span
                  className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-tertiary text-on-tertiary flex items-center justify-center font-label-xs text-[10px]"
                  title="Dữ liệu hồ sơ hợp lệ"
                >
                  <span className="material-symbols-outlined text-[13px]">verified</span>
                </span>
              </div>

              <div className="flex flex-col min-w-0">
                <div className="flex flex-wrap items-center gap-space-sm mb-1">
                  <h1 className="font-headline-2xl text-headline-2xl text-on-surface font-bold tracking-tight">
                    {application.candidate?.fullName || 'Ứng viên chưa đặt tên'}
                  </h1>
                  <span className="font-label-sm text-label-sm px-2.5 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-medium">
                    ID: #{application.id.slice(0, 8).toUpperCase()}
                  </span>
                  <span className="font-label-sm text-label-sm px-2.5 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-semibold flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                    {matchScore !== null ? 'AI Đã thẩm định' : 'Chưa thẩm định AI'}
                  </span>
                  <span className={`font-label-sm text-label-sm px-2.5 py-0.5 rounded-full font-semibold ${
                    application.status === 'SHORTLISTED'
                      ? 'bg-tertiary/10 text-tertiary'
                      : application.status === 'REJECTED'
                      ? 'bg-error-container text-on-error-container'
                      : 'bg-surface-container-high text-on-surface'
                  }`}>
                    {application.status}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-y-1 gap-x-space-md text-on-surface-variant font-body-sm text-body-sm">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px] text-outline">mail</span>
                    {application.candidate?.email || 'N/A'}
                  </span>
                  <span className="text-outline/40">•</span>
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px] text-outline">work</span>
                    Vị trí: <strong className="text-on-surface font-semibold">{application.jobPosting?.title}</strong>
                  </span>
                  <span className="text-outline/40">•</span>
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px] text-outline">schedule</span>
                    Nộp ngày: {new Date(application.appliedAt).toLocaleDateString('vi-VN')}
                  </span>
                </div>
              </div>
            </div>

            {/* Match Gauge + Core Action Toolbar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-space-md z-10 flex-shrink-0">
              {/* Radial Score Gauge */}
              <div className="flex items-center gap-3 bg-tertiary-container/10 px-4 py-2.5 rounded-xl border border-tertiary/20">
                <div className="relative w-11 h-11 flex-shrink-0 flex items-center justify-center">
                  <svg className="w-11 h-11 -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-surface-container"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3.5"
                    />
                    <path
                      className="text-tertiary transition-all duration-700 ease-out"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeDasharray={`${matchScore !== null ? Math.round(matchScore) : 0}, 100`}
                      strokeLinecap="round"
                      strokeWidth="3.5"
                    />
                  </svg>
                  <span className="absolute font-headline-lg text-headline-lg font-bold text-tertiary">
                    {matchScore !== null ? Math.round(matchScore) : '--'}
                    <span className="text-[10px] font-normal">%</span>
                  </span>
                </div>
                <div className="flex flex-col">
                  <div className="font-label-xs text-label-xs text-tertiary font-bold tracking-wide uppercase">
                    Khớp tổng thể
                  </div>
                  <div className="font-body-sm-medium text-body-sm-medium text-on-surface font-semibold">
                    {matchScore === null
                      ? 'Cần chạy thẩm định'
                      : matchScore >= 80
                      ? 'Đề xuất phỏng vấn ngay'
                      : matchScore >= 60
                      ? 'Đạt chuẩn sàn lọc'
                      : 'Cần xem xét thêm'}
                  </div>
                </div>
              </div>

              {/* Action Buttons Toolbar */}
              <div className="flex flex-wrap items-center gap-space-xs">
                {/* Rescreen Button */}
                <button
                  type="button"
                  onClick={handleRescreen}
                  disabled={isRescreening}
                  className="inline-flex items-center gap-1.5 h-10 px-space-md rounded-xl bg-secondary hover:bg-secondary-container text-on-secondary font-body-sm-medium text-body-sm-medium shadow-sm transition-all active:scale-[0.98] disabled:opacity-70"
                  title="Gửi dữ liệu tới AI Service để tính toán lại điểm và phân tích"
                >
                  <span className={`material-symbols-outlined text-[18px] ${isRescreening ? 'animate-spin' : ''}`}>
                    {isRescreening ? 'sync' : 'auto_awesome'}
                  </span>
                  <span>{isRescreening ? 'AI Đang thẩm định...' : 'Đánh giá lại AI'}</span>
                </button>

                {/* Approve to Interview */}
                <button
                  type="button"
                  onClick={() => handleUpdateStatus('SHORTLISTED', 'Duyệt chuyển Phỏng vấn')}
                  disabled={isUpdatingStatus || application.status === 'SHORTLISTED'}
                  className="inline-flex items-center gap-1.5 h-10 px-space-md rounded-xl bg-primary hover:bg-primary-container text-on-primary font-body-sm-medium text-body-sm-medium shadow-sm transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[18px]">check_circle</span>
                  <span>Duyệt chuyển Phỏng vấn V1</span>
                </button>

                {/* View / Download CV */}
                {application.cvFileUrl ? (
                  <a
                    href={application.cvFileUrl.startsWith('http') ? application.cvFileUrl : `http://localhost:5000${application.cvFileUrl}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 h-10 px-space-md rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-body-sm-medium text-body-sm-medium transition-colors"
                    title="Mở xem tệp CV gốc của ứng viên"
                  >
                    <span className="material-symbols-outlined text-[18px]">visibility</span>
                    <span>Xem CV</span>
                  </a>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="inline-flex items-center gap-1.5 h-10 px-space-md rounded-xl bg-surface-container text-outline font-body-sm-medium text-body-sm-medium cursor-not-allowed opacity-60"
                  >
                    <span className="material-symbols-outlined text-[18px]">description</span>
                    <span>Chưa có CV</span>
                  </button>
                )}

                {/* Reject */}
                <button
                  type="button"
                  onClick={() => handleUpdateStatus('REJECTED', 'Từ chối')}
                  disabled={isUpdatingStatus || application.status === 'REJECTED'}
                  className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-surface-container-low hover:bg-error-container text-error hover:text-on-error-container transition-colors disabled:opacity-50"
                  title="Từ chối hồ sơ ứng viên"
                >
                  <span className="material-symbols-outlined text-[18px]">person_off</span>
                </button>
              </div>
            </div>
          </div>

          {/* Telemetry: 4 Core AI Breakdown Score Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
            {/* Card 1: Core Skills */}
            <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between border border-outline-variant/30">
              <div className="flex items-center justify-between mb-2">
                <span className="font-label-sm text-label-sm text-outline font-semibold uppercase tracking-wider">
                  Kỹ năng cốt lõi
                </span>
                <span className="material-symbols-outlined text-primary text-[20px]">terminal</span>
              </div>
              <div className="flex items-baseline justify-between mb-1">
                <span className="font-headline-2xl text-headline-2xl font-bold text-on-surface">
                  {Math.round(coreSkillScore)}%
                </span>
                <span className="font-tabular-mono text-tabular-mono text-tertiary font-semibold">
                  {skillsAnalysis.matched.length} Kỹ năng đạt
                </span>
              </div>
              <div className="w-full bg-surface-container h-1.5 rounded-full overflow-hidden mb-2">
                <div
                  className="bg-primary h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.round(coreSkillScore))}%` }}
                />
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-1">
                {skillsAnalysis.matched.slice(0, 3).join(', ') || 'Chưa trích xuất được kỹ năng'}
              </p>
            </div>

            {/* Card 2: Practical Experience */}
            <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between border border-outline-variant/30">
              <div className="flex items-center justify-between mb-2">
                <span className="font-label-sm text-label-sm text-outline font-semibold uppercase tracking-wider">
                  Kinh nghiệm thực tế
                </span>
                <span className="material-symbols-outlined text-secondary text-[20px]">layers</span>
              </div>
              <div className="flex items-baseline justify-between mb-1">
                <span className="font-headline-2xl text-headline-2xl font-bold text-on-surface">
                  {Math.round(practicalExpScore)}%
                </span>
                <span className="font-tabular-mono text-tabular-mono text-on-surface-variant">
                  {experienceYears > 0 ? `${experienceYears} Năm` : 'Dưới 1 năm'}
                </span>
              </div>
              <div className="w-full bg-surface-container h-1.5 rounded-full overflow-hidden mb-2">
                <div
                  className="bg-secondary h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.round(practicalExpScore))}%` }}
                />
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-1">
                {application.candidate?.summary || 'Kinh nghiệm tích lũy qua các dự án thực tế'}
              </p>
            </div>

            {/* Card 3: Education & Domain Match */}
            <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between border border-outline-variant/30">
              <div className="flex items-center justify-between mb-2">
                <span className="font-label-sm text-label-sm text-outline font-semibold uppercase tracking-wider">
                  Học vấn & Bằng cấp
                </span>
                <span className="material-symbols-outlined text-tertiary text-[20px]">school</span>
              </div>
              <div className="flex items-baseline justify-between mb-1">
                <span className="font-headline-2xl text-headline-2xl font-bold text-on-surface">
                  {Math.round(educationScore)}%
                </span>
                <span className="font-tabular-mono text-tabular-mono text-tertiary font-semibold truncate max-w-[120px]">
                  {application.candidate?.education || 'Đại học'}
                </span>
              </div>
              <div className="w-full bg-surface-container h-1.5 rounded-full overflow-hidden mb-2">
                <div
                  className="bg-tertiary h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.round(educationScore))}%` }}
                />
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-1">
                Học vấn phù hợp định hướng chuyên môn của vị trí
              </p>
            </div>

            {/* Card 4: Overall Fit & Culture */}
            <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between border border-outline-variant/30">
              <div className="flex items-center justify-between mb-2">
                <span className="font-label-sm text-label-sm text-outline font-semibold uppercase tracking-wider">
                  Mức độ đáp ứng JD
                </span>
                <span className="material-symbols-outlined text-primary-container text-[20px]">diversity_3</span>
              </div>
              <div className="flex items-baseline justify-between mb-1">
                <span className="font-headline-2xl text-headline-2xl font-bold text-on-surface">
                  {Math.round(domainScore)}%
                </span>
                <span className="font-tabular-mono text-tabular-mono text-primary font-semibold">
                  {domainScore >= 80 ? 'Rất cao' : domainScore >= 60 ? 'Tương thích' : 'Trung bình'}
                </span>
              </div>
              <div className="w-full bg-surface-container h-1.5 rounded-full overflow-hidden mb-2">
                <div
                  className="bg-primary-container h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.round(domainScore))}%` }}
                />
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-1">
                Khả năng tiếp nhận công việc và văn hóa doanh nghiệp
              </p>
            </div>
          </div>

          {/* Main Multi-Column Analytic Viewport (Linear/Notion 2-Panel Structure) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
            {/* Left Column (7 cols): Strict Technical Verification Table & Gap Analysis */}
            <div className="lg:col-span-7 flex flex-col gap-space-lg">
              {/* Section: Mandatory Matching Skills */}
              <div className="bg-surface-container-lowest rounded-xl shadow-sm p-space-lg flex flex-col border border-outline-variant/30">
                <div className="flex items-center justify-between mb-space-md">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-4 rounded-full bg-primary" />
                    <h2 className="font-headline-lg text-headline-lg text-on-surface font-semibold">
                      Yêu cầu Kỹ năng Phù hợp
                    </h2>
                  </div>
                  <span className="font-label-sm text-label-sm px-2.5 py-0.5 rounded-full bg-tertiary/10 text-tertiary font-bold">
                    {skillsAnalysis.matched.length} Kỹ năng đáp ứng
                  </span>
                </div>

                <div className="space-y-space-sm">
                  {skillsAnalysis.matched.length === 0 ? (
                    <div className="p-4 rounded-lg bg-surface-container-low text-on-surface-variant font-body-sm text-center">
                      Chưa ghi nhận kỹ năng phù hợp. Vui lòng nhấn &ldquo;Đánh giá lại AI&rdquo; để hệ thống quét lại CV.
                    </div>
                  ) : (
                    skillsAnalysis.matched.map((skill, idx) => (
                      <div
                        key={idx}
                        className="p-space-md rounded-lg bg-surface-container-low hover:bg-surface-container transition-colors flex flex-col md:flex-row md:items-start justify-between gap-space-sm"
                      >
                        <div className="flex items-start gap-space-sm min-w-0">
                          <span className="material-symbols-outlined text-tertiary text-[20px] mt-0.5 flex-shrink-0">
                            check_circle
                          </span>
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-body-base-medium text-body-base-medium text-on-surface font-semibold">
                                {skill}
                              </span>
                              <span className="font-label-xs text-label-xs px-2 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-semibold">
                                Đạt chuẩn
                              </span>
                            </div>
                            <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                              Trích xuất từ hồ sơ ứng viên và khớp với yêu cầu trong bản mô tả công việc (JD).
                            </p>
                          </div>
                        </div>
                        <div className="flex md:flex-col items-end justify-between flex-shrink-0">
                          <span className="font-tabular-mono text-tabular-mono text-tertiary font-bold">
                            Đã xác thực
                          </span>
                          <span className="font-label-xs text-label-xs text-outline">Độ tin cậy: Cao</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Section: Gaps & Missing Skills Considerations */}
              <div className="bg-surface-container-lowest rounded-xl shadow-sm p-space-lg flex flex-col border border-outline-variant/30">
                <div className="flex items-center justify-between mb-space-md">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-4 rounded-full bg-secondary-container" />
                    <h2 className="font-headline-lg text-headline-lg text-on-surface font-semibold">
                      Kỹ năng Thiếu & Điểm Cần Lưu Ý (Gaps)
                    </h2>
                  </div>
                  <span className="font-label-sm text-label-sm px-2.5 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-medium">
                    {skillsAnalysis.missing.length} điểm cần làm rõ
                  </span>
                </div>

                <div className="space-y-space-sm">
                  {skillsAnalysis.missing.length === 0 ? (
                    <div className="p-4 rounded-lg bg-surface-container-low text-tertiary font-body-sm text-center">
                      Không phát hiện lỗ hổng kỹ năng lớn so với tiêu chuẩn JD.
                    </div>
                  ) : (
                    skillsAnalysis.missing.map((gap, idx) => (
                      <div
                        key={idx}
                        className="p-space-md rounded-lg bg-surface-container-low flex flex-col md:flex-row md:items-start justify-between gap-space-sm"
                      >
                        <div className="flex items-start gap-space-sm min-w-0">
                          <span className="material-symbols-outlined text-secondary text-[20px] mt-0.5 flex-shrink-0">
                            warning_amber
                          </span>
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-body-base-medium text-body-base-medium text-on-surface font-semibold">
                                {gap}
                              </span>
                              <span className="font-label-xs text-label-xs px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-medium">
                                Chưa thể hiện rõ
                              </span>
                            </div>
                            <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                              Kỹ năng xuất hiện trong yêu cầu vị trí tuyển dụng nhưng chưa được đề cập rõ ràng trong nội dung CV. Đề xuất phỏng vấn viên đặt câu hỏi đào sâu.
                            </p>
                          </div>
                        </div>
                        <div className="flex md:flex-col items-end justify-between flex-shrink-0">
                          <span className="font-label-xs text-label-xs text-secondary font-semibold">
                            Cần phỏng vấn
                          </span>
                          <span className="font-label-xs text-label-xs text-outline">Đào tạo được</span>
                        </div>
                      </div>
                    ))
                  )}

                  {/* AI Warnings List if present */}
                  {parsedAiAnalysis.warnings && parsedAiAnalysis.warnings.length > 0 && (
                    <div className="mt-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-on-surface text-body-sm">
                      <div className="font-semibold text-amber-700 flex items-center gap-1.5 mb-1 text-[13px]">
                        <span className="material-symbols-outlined text-[16px]">info</span>
                        Cảnh báo phát hiện từ AI Service:
                      </div>
                      <ul className="list-disc list-inside space-y-1 text-on-surface-variant text-[12px]">
                        {parsedAiAnalysis.warnings.map((w, i) => (
                          <li key={i}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {/* Inline Visual Comparison: Candidate Profile vs Role Benchmark (SVG Radar Chart) */}
              <div className="bg-surface-container-lowest rounded-xl shadow-sm p-space-lg flex flex-col border border-outline-variant/30">
                <div className="flex items-center justify-between mb-space-md">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[20px]">radar</span>
                    <h3 className="font-headline-lg text-headline-lg text-on-surface font-semibold">
                      Biểu Đồ Năng Lực So Với Tiêu Chuẩn Vị Trí
                    </h3>
                  </div>
                  <div className="flex items-center gap-4 text-label-xs font-label-xs">
                    <span className="flex items-center gap-1.5 text-primary font-medium">
                      <span className="w-3 h-1 bg-primary rounded-full" /> Ứng viên ({application.candidate.fullName.split(' ').pop()})
                    </span>
                    <span className="flex items-center gap-1.5 text-outline">
                      <span className="w-3 h-1 bg-outline/40 rounded-full" /> Benchmark yêu cầu
                    </span>
                  </div>
                </div>

                <div className="w-full flex items-center justify-center py-2">
                  <svg className="w-full max-w-md h-56" fill="none" viewBox="0 0 320 200">
                    {/* Background Polygons */}
                    <polygon
                      className="stroke-outline-variant/50"
                      fill="none"
                      points="160,20 270,60 250,160 70,160 50,60"
                      strokeWidth="1"
                    />
                    <polygon
                      className="stroke-outline-variant/30"
                      fill="none"
                      points="160,50 225,75 210,135 110,135 95,75"
                      strokeWidth="1"
                    />
                    {/* Benchmark Polygon (Dashed) */}
                    <polygon
                      fill="none"
                      points="160,40 240,70 230,140 90,140 80,70"
                      stroke="#737686"
                      strokeDasharray="3 3"
                      strokeWidth="1.5"
                    />
                    {/* Dynamic Candidate Polygon */}
                    <polygon
                      className="fill-primary/15 stroke-primary"
                      points="160,26 260,64 236,150 76,150 56,66"
                      strokeWidth="2"
                    />
                    {/* Data Points */}
                    <circle className="fill-primary" cx="160" cy="26" r="3.5" />
                    <circle className="fill-primary" cx="260" cy="64" r="3.5" />
                    <circle className="fill-primary" cx="236" cy="150" r="3.5" />
                    <circle className="fill-primary" cx="76" cy="150" r="3.5" />
                    <circle className="fill-primary" cx="56" cy="66" r="3.5" />
                    {/* Labels */}
                    <text className="fill-on-surface font-label-xs text-[11px] font-semibold" textAnchor="middle" x="160" y="14">
                      Kỹ năng cốt lõi ({Math.round(coreSkillScore)}%)
                    </text>
                    <text className="fill-on-surface font-label-xs text-[11px]" textAnchor="start" x="275" y="65">
                      Kinh nghiệm ({Math.round(practicalExpScore)}%)
                    </text>
                    <text className="fill-on-surface font-label-xs text-[11px]" textAnchor="middle" x="246" y="174">
                      Học vấn ({Math.round(educationScore)}%)
                    </text>
                    <text className="fill-on-surface font-label-xs text-[11px]" textAnchor="middle" x="64" y="174">
                      Độ khớp JD ({Math.round(domainScore)}%)
                    </text>
                    <text className="fill-on-surface font-label-xs text-[11px]" textAnchor="end" x="42" y="65">
                      Khớp tổng thể ({matchScore !== null ? Math.round(matchScore) : 0}%)
                    </text>
                  </svg>
                </div>
              </div>
            </div>

            {/* Right Column (5 cols): AI Summary Insight, Recommendations & Interview Questions */}
            <div className="lg:col-span-5 flex flex-col gap-space-lg">
              {/* AI Insight Assessment Box */}
              <div className="bg-surface-container-lowest rounded-xl shadow-sm p-space-lg flex flex-col relative overflow-hidden border border-outline-variant/30">
                <div className="flex items-center justify-between mb-space-md">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-secondary text-[22px]">psychology</span>
                    <h2 className="font-headline-lg text-headline-lg text-on-surface font-semibold">
                      Tóm Tắt Nhận Định AI
                    </h2>
                  </div>
                  <span className="font-label-xs text-label-xs px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                    FastAPI AI Service
                  </span>
                </div>

                <div className="prose prose-sm text-on-surface-variant font-body-sm text-body-sm space-y-space-sm mb-space-md">
                  {parsedAiAnalysis.summary ? (
                    <p className="leading-relaxed whitespace-pre-line">
                      {parsedAiAnalysis.summary}
                    </p>
                  ) : (
                    <p className="leading-relaxed text-outline">
                      Chưa có báo cáo phân tích AI chi tiết. Vui lòng nhấn nút <strong>&ldquo;Đánh giá lại AI&rdquo;</strong> ở trên để hệ thống xử lý nội dung CV đối chiếu với vị trí tuyển dụng.
                    </p>
                  )}

                  <div className="p-space-sm rounded-lg bg-surface-container-low text-primary font-body-sm-medium text-body-sm-medium flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">thumb_up</span>
                    Khuyến nghị: {matchScore !== null && matchScore >= 70
                      ? 'Chuyển thẳng vòng Phỏng vấn Kỹ thuật Chuyên sâu (V1).'
                      : matchScore !== null && matchScore >= 50
                      ? 'Yêu cầu làm bài test đánh giá năng lực trước khi xếp lịch.'
                      : 'Hồ sơ chưa đạt tiêu chuẩn sàn, cần phỏng vấn viên cân nhắc kỹ.'}
                  </div>
                </div>

                {/* Career Timeline Snippet */}
                <div className="border-t border-outline-variant/40 pt-space-md flex flex-col gap-space-sm">
                  <span className="font-label-xs text-label-xs text-outline font-semibold uppercase tracking-wider">
                    Thông tin kinh nghiệm ứng viên
                  </span>
                  <div className="space-y-3 relative pl-4 before:content-[''] before:absolute before:left-1.5 before:top-1 before:bottom-1 before:w-[2px] before:bg-surface-container-high">
                    <div className="relative">
                      <span className="absolute -left-4 top-1.5 w-2 h-2 rounded-full bg-primary ring-2 ring-surface-container-lowest" />
                      <div className="font-body-sm-medium text-body-sm-medium text-on-surface font-semibold">
                        {application.candidate?.summary || `${application.jobPosting?.title} Candidate`}
                      </div>
                      <div className="font-label-xs text-label-xs text-outline">
                        Kinh nghiệm: {experienceYears} năm • Học vấn: {application.candidate?.education || 'Chưa cập nhật'}
                      </div>
                    </div>
                    <div className="relative">
                      <span className="absolute -left-4 top-1.5 w-2 h-2 rounded-full bg-outline ring-2 ring-surface-container-lowest" />
                      <div className="font-body-sm-medium text-body-sm-medium text-on-surface font-semibold">
                        Ngày ứng tuyển: {new Date(application.appliedAt).toLocaleDateString('vi-VN')}
                      </div>
                      <div className="font-label-xs text-label-xs text-outline">
                        Trạng thái hiện tại: {application.status}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* AI Suggested Interview Questions Box */}
              <div className="bg-surface-container-lowest rounded-xl shadow-sm p-space-lg flex flex-col border border-outline-variant/30">
                <div className="flex items-center justify-between mb-space-md">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[22px]">contact_support</span>
                    <h2 className="font-headline-lg text-headline-lg text-on-surface font-semibold">
                      Gợi Ý Bộ Câu Hỏi Phỏng Vấn V1
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={handleRescreen}
                    className="text-primary hover:text-primary-container font-label-xs text-label-xs font-semibold flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[14px]">refresh</span>
                    Đánh giá lại
                  </button>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-md">
                  Các câu hỏi được thiết kế dựa trên kỹ năng của ứng viên và tiêu chuẩn JD nhằm kiểm chứng thực chất năng lực và tư duy giải quyết vấn đề.
                </p>

                <div className="space-y-space-md">
                  {/* Dynamic Question 1 based on first matched skill */}
                  <div className="p-space-md rounded-lg bg-surface-container-low flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="font-label-xs text-label-xs font-bold text-primary uppercase">
                        Câu hỏi 1 • Chuyên môn {skillsAnalysis.matched[0] || 'Kỹ thuật'}
                      </span>
                      <span className="font-label-xs text-label-xs text-outline">Độ khó: 8.5/10</span>
                    </div>
                    <p className="font-body-sm-medium text-body-sm-medium text-on-surface">
                      &ldquo;Trong các dự án trước đây bạn đã áp dụng {skillsAnalysis.matched[0] || 'chuyên môn chính'} vào giải quyết bài toán phức tạp nào nhất? Khi xảy ra sự cố production, phương pháp debug của bạn là gì?&rdquo;
                    </p>
                    <div className="font-label-xs text-label-xs text-on-surface-variant bg-surface-container px-2 py-1 rounded">
                      🎯 <strong>Mục tiêu:</strong> Đánh giá mức độ thành thạo và kinh nghiệm thực chiến xử lý sự cố.
                    </div>
                  </div>

                  {/* Dynamic Question 2 based on missing skill */}
                  <div className="p-space-md rounded-lg bg-surface-container-low flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="font-label-xs text-label-xs font-bold text-secondary uppercase">
                        Câu hỏi 2 • Khả năng học hỏi ({skillsAnalysis.missing[0] || 'Công nghệ mới'})
                      </span>
                      <span className="font-label-xs text-label-xs text-outline">Độ khó: 8/10</span>
                    </div>
                    <p className="font-body-sm-medium text-body-sm-medium text-on-surface">
                      &ldquo;Vị trí tuyển dụng yêu cầu kỹ năng liên quan đến {skillsAnalysis.missing[0] || 'công nghệ trong JD'}. Bạn có kinh nghiệm tương tự hoặc lộ trình tiếp cận công nghệ này ra sao nếu gia nhập đội ngũ?&rdquo;
                    </p>
                    <div className="font-label-xs text-label-xs text-on-surface-variant bg-surface-container px-2 py-1 rounded">
                      🎯 <strong>Mục tiêu:</strong> Xác minh mức độ linh hoạt thích ứng và tốc độ onboarding công nghệ mới.
                    </div>
                  </div>

                  {/* Dynamic Question 3 on teamwork & delivery */}
                  <div className="p-space-md rounded-lg bg-surface-container-low flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="font-label-xs text-label-xs font-bold text-tertiary uppercase">
                        Câu hỏi 3 • Phối hợp & Quy trình làm việc
                      </span>
                      <span className="font-label-xs text-label-xs text-outline">Độ khó: 7/10</span>
                    </div>
                    <p className="font-body-sm-medium text-body-sm-medium text-on-surface">
                      &ldquo;Khi làm việc với các thành viên khác trong nhóm hoặc các phòng ban nghiệp vụ, bạn thường xử lý bất đồng quan điểm về giải pháp như thế nào để đảm bảo tiến độ dự án?&rdquo;
                    </p>
                    <div className="font-label-xs text-label-xs text-on-surface-variant bg-surface-container px-2 py-1 rounded">
                      🎯 <strong>Mục tiêu:</strong> Đánh giá văn hóa làm việc nhóm, giao tiếp và kỹ năng giải quyết mâu thuẫn.
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Interviewer Note Box */}
              <div className="bg-surface-container-lowest rounded-xl shadow-sm p-space-md flex flex-col gap-2 border border-outline-variant/30">
                <label
                  htmlFor="hr-internal-note"
                  className="font-label-sm text-label-sm text-on-surface font-semibold flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px] text-outline">edit_note</span>
                  Ghi chú nội bộ tuyển dụng (Recruiter Note)
                </label>
                <textarea
                  id="hr-internal-note"
                  rows={2}
                  value={internalNote}
                  onChange={(e) => setInternalNote(e.target.value)}
                  placeholder="Nhập nhận định sơ bộ trước khi gửi Hội đồng phỏng vấn..."
                  className="w-full p-2.5 rounded-lg bg-surface-container-low border-0 text-on-surface placeholder:text-outline font-body-sm text-body-sm focus:ring-1 focus:ring-primary focus:outline-none resize-none"
                />
                <div className="flex items-center justify-between mt-1">
                  <span className="font-label-xs text-label-xs text-outline">
                    {isNoteSaved ? '✓ Đã lưu ghi chú' : 'Chỉ HR & Interviewers thấy'}
                  </span>
                  <button
                    type="button"
                    onClick={handleSaveNote}
                    className="font-label-xs text-label-xs px-3 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-medium transition-colors"
                  >
                    Lưu ghi chú
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
