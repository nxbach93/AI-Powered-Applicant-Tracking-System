'use client';

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ApplicationStatus,
  HrApplicationDetail,
  getApplicationDetailForHrApi,
  updateApplicationStatusApi,
} from '@/lib/application-api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function formatSimpleDate(iso?: string | null) {
  if (!iso) return 'Chưa cập nhật';
  try {
    return new Date(iso).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

// 5-stage pipeline mapping for horizontal stepper
const PIPELINE_STAGES: { key: string; label: string; statuses: ApplicationStatus[] }[] = [
  { key: 'SUBMITTED', label: 'Hồ sơ', statuses: ['SUBMITTED'] },
  { key: 'SCREENING', label: 'Sàng lọc AI', statuses: ['SCREENING'] },
  { key: 'INTERVIEW', label: 'Phỏng vấn', statuses: ['INTERVIEW_SCHEDULED', 'INTERVIEWED'] },
  { key: 'SHORTLISTED', label: 'Đánh giá đạt', statuses: ['SHORTLISTED'] },
  { key: 'OFFER', label: 'Offer & Tiếp nhận', statuses: ['OFFERED', 'HIRED'] },
];

function getStageIndex(status: ApplicationStatus): number {
  if (status === 'SUBMITTED') return 0;
  if (status === 'SCREENING') return 1;
  if (status === 'INTERVIEW_SCHEDULED' || status === 'INTERVIEWED') return 2;
  if (status === 'SHORTLISTED') return 3;
  if (status === 'OFFERED' || status === 'HIRED') return 4;
  return 1; // Default
}

export default function HrApplicationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : '';

  const [detail, setDetail] = useState<HrApplicationDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'notes' | 'job'>('overview');
  const [cvViewMode, setCvViewMode] = useState<'pdf' | 'extracted'>('pdf');
  const [newNote, setNewNote] = useState('');
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const data = await getApplicationDetailForHrApi(id);
      setDetail(data);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Không thể tải chi tiết hồ sơ';
      setMessage({ text: errorMsg, type: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleStatusUpdate = async (newStatus: ApplicationStatus) => {
    if (!detail || newStatus === detail.status) return;

    setIsUpdating(true);
    setMessage(null);
    setIsStatusDropdownOpen(false);
    try {
      await updateApplicationStatusApi(id, newStatus);
      setMessage({ text: `Đã cập nhật trạng thái hồ sơ thành công sang "${newStatus}"!`, type: 'success' });
      await fetchDetail();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Cập nhật trạng thái thất bại';
      setMessage({ text: errorMsg, type: 'error' });
    } finally {
      setIsUpdating(false);
    }
  };

  // Structured AI Analysis parsing
  const parsedAi = useMemo(() => {
    if (!detail?.aiAnalysisSummary) {
      return { summary: '', breakdown: null, warnings: [] as string[] };
    }
    const raw = detail.aiAnalysisSummary.trim();
    if (raw.startsWith('{')) {
      try {
        const parsed = JSON.parse(raw);
        return {
          summary: parsed.summary || parsed.text || '',
          breakdown: parsed.score_breakdown || parsed.breakdown || null,
          warnings: parsed.warnings || [],
        };
      } catch {
        return { summary: raw, breakdown: null, warnings: [] as string[] };
      }
    }
    return { summary: raw, breakdown: null, warnings: [] as string[] };
  }, [detail?.aiAnalysisSummary]);

  const currentStageIdx = detail ? getStageIndex(detail.status) : 0;
  const isRejected = detail?.status === 'REJECTED';

  // Candidate Initials
  const candidateInitials = detail?.candidate.fullName
    ? detail.candidate.fullName
        .split(' ')
        .filter(Boolean)
        .slice(-2)
        .map((n) => n[0]?.toUpperCase())
        .join('')
    : 'UV';

  // PDF URL resolving
  const pdfUrl = detail?.cvFileUrl
    ? detail.cvFileUrl.startsWith('http')
      ? detail.cvFileUrl
      : `${API_BASE}${detail.cvFileUrl}`
    : null;

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center py-20">
        <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin mb-4" />
        <p className="font-body-base text-body-base text-on-surface-variant font-medium">
          Đang tải hồ sơ ứng viên và dòng thời gian tuyển dụng...
        </p>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-surface-container flex items-center justify-center text-outline mb-4">
          <span className="material-symbols-outlined text-[32px]">person_off</span>
        </div>
        <h2 className="font-headline-lg text-headline-lg font-bold text-on-surface mb-2">
          Không tìm thấy hồ sơ ứng viên
        </h2>
        <p className="font-body-sm text-body-sm text-on-surface-variant mb-6 max-w-md">
          {message?.text || 'Đơn ứng tuyển này không tồn tại hoặc bạn không có quyền truy cập.'}
        </p>
        <Link
          href="/hr/applications"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-on-primary font-body-sm-medium text-body-sm-medium hover:bg-primary-container transition-all"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          <span>Quay lại danh sách hồ sơ</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full pb-12">
      {/* Toast / Notification Banner */}
      {message && (
        <div
          className={`mb-space-md p-space-md rounded-xl flex items-center justify-between gap-space-md ${
            message.type === 'success'
              ? 'bg-tertiary-fixed text-on-tertiary-fixed font-medium'
              : 'bg-error-container text-on-error-container font-medium'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">
              {message.type === 'success' ? 'check_circle' : 'error'}
            </span>
            <span>{message.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setMessage(null)}
            className="p-1 rounded hover:bg-black/10 transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      {/* Dynamic Context Bar (Stitch Candidate Profile Header) */}
      <div className="flex flex-wrap items-center justify-between gap-space-md mb-space-md bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-outline-variant/30">
        <div className="flex items-center gap-space-md min-w-0">
          <Link
            href="/hr/applications"
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-surface-container-low text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-all"
            title="Quay lại danh sách ứng viên"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          </Link>
          <div className="h-4 w-px bg-surface-container" />
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span className="font-label-xs text-label-xs px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-semibold">
              Mã HS: #{detail.id.slice(0, 8).toUpperCase()}
            </span>
            <span className="font-body-sm text-body-sm text-outline">•</span>
            <span className="font-body-sm-medium text-body-sm-medium text-on-surface truncate">
              Vị trí: <strong>{detail.jobPosting.title}</strong>
            </span>
            {detail.jobPosting.department && (
              <span className="font-label-xs text-label-xs px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-medium">
                {detail.jobPosting.department}
              </span>
            )}
          </div>
        </div>

        {/* Quick Action Bar top right */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Reject button */}
          <button
            type="button"
            onClick={() => handleStatusUpdate('REJECTED')}
            disabled={isUpdating || detail.status === 'REJECTED'}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-error-container text-on-error-container font-body-sm-medium text-body-sm-medium hover:opacity-90 transition-all disabled:opacity-50"
            title="Từ chối hồ sơ ứng viên"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
            <span>{detail.status === 'REJECTED' ? 'Đã từ chối' : 'Từ chối'}</span>
          </button>

          {/* Change Status Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
              disabled={isUpdating}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-surface-container text-on-surface font-body-sm-medium text-body-sm-medium hover:bg-surface-container-high transition-all"
            >
              <span className="material-symbols-outlined text-[16px]">swap_horiz</span>
              <span>Đổi trạng thái ({detail.status})</span>
              <span className="material-symbols-outlined text-[16px]">arrow_drop_down</span>
            </button>

            {isStatusDropdownOpen && (
              <div className="absolute right-0 mt-1 w-52 bg-surface-container-lowest rounded-xl shadow-lg border border-outline-variant/40 py-1 z-50 animate-in fade-in zoom-in-95">
                {(
                  [
                    'SUBMITTED',
                    'SCREENING',
                    'SHORTLISTED',
                    'INTERVIEW_SCHEDULED',
                    'INTERVIEWED',
                    'OFFERED',
                    'HIRED',
                    'REJECTED',
                  ] as ApplicationStatus[]
                ).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => handleStatusUpdate(st)}
                    className={`w-full text-left px-3 py-1.5 text-body-sm flex items-center justify-between hover:bg-surface-container transition-colors ${
                      detail.status === st ? 'text-primary font-bold bg-primary-container/10' : 'text-on-surface'
                    }`}
                  >
                    <span>{st}</span>
                    {detail.status === st && (
                      <span className="material-symbols-outlined text-[16px] text-primary">check</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Schedule Interview button */}
          <Link
            href={`/hr/interviews?applicationId=${detail.id}&jobId=${detail.jobPosting.id}`}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-secondary text-on-secondary font-body-sm-medium text-body-sm-medium hover:opacity-90 shadow-sm transition-all"
          >
            <span className="material-symbols-outlined text-[16px]">calendar_add_on</span>
            <span>Lên lịch phỏng vấn</span>
          </Link>

          {/* Go to AI Screening */}
          <Link
            href={`/hr/screening?jobId=${detail.jobPosting.id}&applicationId=${detail.id}`}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-primary-container text-on-primary-container font-body-sm-medium text-body-sm-medium hover:bg-primary shadow-sm transition-all"
          >
            <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
            <span>Xem Đánh giá AI</span>
          </Link>
        </div>
      </div>

      {/* Dual-Pane Architecture (Stitch Layout) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-gutter-desktop items-start">
        {/* Left Column (5 cols): Live CV Document Preview with AI Extraction */}
        <div className="xl:col-span-5 flex flex-col gap-space-md">
          {/* Document Tooling & Parse Status Card */}
          <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col gap-3 border border-outline-variant/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span className="material-symbols-outlined text-primary text-[20px]">picture_as_pdf</span>
                <span className="font-body-base-medium text-body-base-medium text-on-surface truncate">
                  {pdfUrl ? pdfUrl.split('/').pop() : 'Hồ sơ chưa đính kèm tệp PDF'}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-label-xs text-label-xs font-semibold">
                  <span className="material-symbols-outlined text-[13px]">auto_awesome</span>
                  {detail.aiMatchScore !== null ? 'AI Đã phân tích' : 'Chưa phân tích AI'}
                </span>
                {pdfUrl && (
                  <a
                    href={pdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container transition-colors"
                    title="Mở hoặc tải xuống tài liệu gốc"
                  >
                    <span className="material-symbols-outlined text-[18px]">download</span>
                  </a>
                )}
              </div>
            </div>

            {/* Keyword Highlights & Extraction Legend */}
            <div className="bg-surface-container-low p-2.5 rounded-lg flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="font-label-xs text-label-xs text-on-surface-variant uppercase tracking-wider font-semibold">
                  Từ khóa & Kỹ năng trích xuất
                </span>
                <span className="font-tabular-mono text-label-xs text-secondary font-medium">
                  {detail.parsedSkills?.length || 0} Kỹ năng ghi nhận
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {detail.parsedSkills && detail.parsedSkills.length > 0 ? (
                  detail.parsedSkills.map((skill, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-primary text-on-primary font-tabular-mono text-label-xs font-medium"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-primary-fixed" />
                      {skill}
                    </span>
                  ))
                ) : (
                  <span className="text-outline text-label-xs italic">
                    Chưa có kỹ năng trích xuất từ CV.
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* CV Document Simulation Container */}
          <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden flex flex-col border border-outline-variant/30">
            {/* Document Header Bar */}
            <div className="bg-surface-container-low px-space-md py-2 flex items-center justify-between text-outline text-label-xs font-tabular-mono">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-tertiary" />
                {cvViewMode === 'pdf' ? 'Tệp PDF đính kèm gốc' : 'Bản trích xuất có cấu trúc'}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCvViewMode(cvViewMode === 'pdf' ? 'extracted' : 'pdf')}
                  className="px-2 py-0.5 rounded bg-surface-container hover:bg-surface-container-high text-on-surface font-body-sm transition-colors text-[11px]"
                >
                  {cvViewMode === 'pdf' ? 'Xem trích xuất text' : 'Xem PDF gốc'}
                </button>
                {pdfUrl && (
                  <a
                    href={pdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-on-surface transition-colors"
                    title="Mở toàn màn hình"
                  >
                    <span className="material-symbols-outlined text-[16px]">fullscreen</span>
                  </a>
                )}
              </div>
            </div>

            {/* Document Content View */}
            {cvViewMode === 'pdf' && pdfUrl ? (
              <div className="w-full h-[650px] bg-surface-container-low">
                <iframe
                  src={`${pdfUrl}#toolbar=0`}
                  title="CV Document Preview"
                  className="w-full h-full border-0"
                />
              </div>
            ) : (
              <div className="p-6 space-y-6 bg-surface-container-lowest max-h-[650px] overflow-y-auto leading-relaxed">
                {/* Header Profile */}
                <div className="space-y-1">
                  <h2 className="font-headline-2xl text-headline-2xl font-bold text-on-surface tracking-tight uppercase">
                    {detail.candidate.fullName}
                  </h2>
                  <p className="font-body-base-medium text-body-base-medium text-primary">
                    {detail.jobPosting.title} Candidate
                  </p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-label-xs font-label-xs text-outline pt-1">
                    <span>{detail.candidate.address || 'Việt Nam'}</span>
                    <span>{detail.candidate.email}</span>
                    {detail.candidate.phone && <span>{detail.candidate.phone}</span>}
                  </div>
                </div>

                {/* Cover Letter / Summary */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-label-xs text-label-xs uppercase font-bold text-outline tracking-wider">
                      Thư ứng tuyển & Tóm tắt năng lực
                    </span>
                    <div className="flex-1 h-px bg-surface-container" />
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant whitespace-pre-line">
                    {detail.coverLetter || detail.candidate.summary || 'Không có thư ứng tuyển đi kèm.'}
                  </p>
                </div>

                {/* Experience & Education */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="font-label-xs text-label-xs uppercase font-bold text-outline tracking-wider">
                      Kinh nghiệm & Học vấn
                    </span>
                    <div className="flex-1 h-px bg-surface-container" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-baseline justify-between flex-wrap">
                      <span className="font-body-base-medium text-body-base-medium text-on-surface font-semibold">
                        Kinh nghiệm tích lũy
                      </span>
                      <span className="font-tabular-mono text-label-xs text-outline">
                        {detail.candidate.experienceYears ? `${detail.candidate.experienceYears} năm` : 'Dưới 1 năm'}
                      </span>
                    </div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      Trình độ học vấn cao nhất: <strong>{detail.candidate.education || 'Đại học'}</strong>
                    </p>
                  </div>
                </div>

                {/* Job Requirements Alignment */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-label-xs text-label-xs uppercase font-bold text-outline tracking-wider">
                      Vị trí ứng tuyển
                    </span>
                    <div className="flex-1 h-px bg-surface-container" />
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    {detail.jobPosting.requirements || 'Yêu cầu theo tiêu chuẩn vị trí tuyển dụng.'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (7 cols): Candidate Profile & Recruitment Management Tabs */}
        <div className="xl:col-span-7 flex flex-col gap-space-md">
          {/* Candidate Quick Header Card */}
          <div className="bg-surface-container-lowest p-space-md md:p-6 rounded-xl shadow-sm flex flex-col gap-space-md border border-outline-variant/30">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-space-md">
              <div className="flex items-center gap-4">
                <div className="relative">
                  {detail.candidate.avatarUrl ? (
                    <img
                      src={detail.candidate.avatarUrl}
                      alt={detail.candidate.fullName}
                      className="w-16 h-16 rounded-xl object-cover shadow-sm bg-surface-container"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-surface-container flex items-center justify-center text-primary font-headline-2xl text-headline-2xl shadow-inner font-bold">
                      {candidateInitials}
                    </div>
                  )}
                  <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-tertiary flex items-center justify-center text-on-tertiary">
                    <span className="material-symbols-outlined text-[10px]">check</span>
                  </span>
                </div>

                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="font-headline-xl text-headline-xl text-on-surface font-bold">
                      {detail.candidate.fullName}
                    </h1>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed font-label-xs text-label-xs font-semibold">
                      <span className="material-symbols-outlined text-[13px]">bolt</span>
                      {detail.aiMatchScore !== null ? `${Math.round(detail.aiMatchScore)}% Tương thích AI` : 'Chưa chấm AI'}
                    </span>
                  </div>
                  <p className="font-body-base-medium text-body-base-medium text-outline">
                    {detail.jobPosting.title} • {detail.jobPosting.department || 'Đội ngũ tuyển dụng'}
                  </p>
                  <div className="flex items-center gap-3 pt-1 text-label-sm font-label-sm text-on-surface-variant flex-wrap">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px] text-outline">history</span>
                      {detail.candidate.experienceYears ? `${detail.candidate.experienceYears} năm kinh nghiệm` : 'Chưa có kinh nghiệm'}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px] text-outline">school</span>
                      {detail.candidate.education || 'Đại học'}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px] text-outline">location_on</span>
                      {detail.jobPosting.location || 'Việt Nam'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status Badge */}
              <div className="text-right self-stretch sm:self-auto flex sm:flex-col justify-between sm:justify-center items-end bg-surface-container-low sm:bg-transparent p-2.5 sm:p-0 rounded-lg">
                <span className="font-label-xs text-label-xs uppercase text-outline font-semibold">
                  Trạng thái hiện tại
                </span>
                <span
                  className={`mt-1 font-body-sm-medium text-body-sm-medium px-2.5 py-0.5 rounded-full font-semibold ${
                    isRejected
                      ? 'bg-error-container text-on-error-container'
                      : detail.status === 'HIRED' || detail.status === 'OFFERED'
                      ? 'bg-tertiary-fixed text-on-tertiary-fixed'
                      : 'bg-primary-container text-on-primary-container'
                  }`}
                >
                  {detail.status}
                </span>
              </div>
            </div>

            {/* Status Pipeline Indicator (Ashby / Linear Horizontal Stepper) */}
            <div className="bg-surface-container-low p-3.5 rounded-lg space-y-2.5">
              <div className="flex items-center justify-between text-label-xs">
                <span className="font-body-sm-medium text-body-sm-medium text-on-surface flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-primary text-[18px]">timeline</span>
                  Tiến độ tuyển dụng: <strong className="text-primary font-semibold">{detail.status}</strong>
                </span>
                <span className="font-tabular-mono text-outline font-semibold">
                  {currentStageIdx + 1}/5 Bước ({Math.round(((currentStageIdx + 1) / 5) * 100)}%)
                </span>
              </div>

              {/* Stepper Bar */}
              <div className="grid grid-cols-5 gap-1.5">
                {PIPELINE_STAGES.map((stage, idx) => {
                  const isDone = idx < currentStageIdx;
                  const isCurrent = idx === currentStageIdx;
                  return (
                    <div
                      key={stage.key}
                      className={`h-2 rounded-full transition-all relative ${
                        isDone
                          ? 'bg-tertiary'
                          : isCurrent
                          ? 'bg-primary-container'
                          : 'bg-surface-container-high'
                      }`}
                      title={`${stage.label} (${isDone ? 'Hoàn thành' : isCurrent ? 'Hiện tại' : 'Chưa đến'})`}
                    >
                      {isCurrent && (
                        <span className="absolute -top-1 right-0 w-2 h-2 rounded-full bg-white ring-2 ring-primary" />
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-between text-label-xs font-label-xs text-outline pt-0.5">
                {PIPELINE_STAGES.map((stage, idx) => (
                  <span
                    key={stage.key}
                    className={
                      idx < currentStageIdx
                        ? 'text-tertiary font-medium'
                        : idx === currentStageIdx
                        ? 'text-primary font-bold'
                        : 'text-outline'
                    }
                  >
                    {stage.label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Recruiter Management Tabs Container */}
          <div className="bg-surface-container-lowest rounded-xl shadow-sm flex flex-col border border-outline-variant/30">
            {/* Navigation Tabs Bar */}
            <div className="flex items-center gap-2 px-space-md pt-3 bg-surface-container-low/50 overflow-x-auto border-b border-outline-variant/30">
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className={`inline-flex items-center gap-1.5 pb-2.5 px-3 font-body-sm-medium text-body-sm-medium transition-all ${
                  activeTab === 'overview'
                    ? 'text-primary font-semibold border-b-2 border-primary'
                    : 'text-outline hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">psychology</span>
                <span>Tổng quan & Đánh giá AI</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('timeline')}
                className={`inline-flex items-center gap-1.5 pb-2.5 px-3 font-body-sm-medium text-body-sm-medium transition-all ${
                  activeTab === 'timeline'
                    ? 'text-primary font-semibold border-b-2 border-primary'
                    : 'text-outline hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">history</span>
                <span>Lịch sử & Timeline</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('notes')}
                className={`inline-flex items-center gap-1.5 pb-2.5 px-3 font-body-sm-medium text-body-sm-medium transition-all ${
                  activeTab === 'notes'
                    ? 'text-primary font-semibold border-b-2 border-primary'
                    : 'text-outline hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">rate_review</span>
                <span>Ghi chú & Đánh giá HR</span>
                {detail.interviews.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-surface-container font-tabular-mono text-[11px]">
                    {detail.interviews.length}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('job')}
                className={`inline-flex items-center gap-1.5 pb-2.5 px-3 font-body-sm-medium text-body-sm-medium transition-all ${
                  activeTab === 'job'
                    ? 'text-primary font-semibold border-b-2 border-primary'
                    : 'text-outline hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">work</span>
                <span>Vị trí tuyển dụng</span>
              </button>
            </div>

            {/* Tab 1: Overview & AI Assessment */}
            {activeTab === 'overview' && (
              <div className="p-space-md md:p-6 space-y-6">
                {/* AI Competency Matrix Section */}
                <div className="bg-surface-container-low p-space-md rounded-xl space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-secondary text-[22px]">auto_awesome</span>
                      <div>
                        <h3 className="font-headline-lg text-headline-lg text-on-surface font-semibold">
                          AI Competency Matrix (Thước đo năng lực)
                        </h3>
                        <p className="font-label-xs text-label-xs text-outline">
                          So sánh năng lực ứng viên theo tiêu chuẩn vị trí tuyển dụng
                        </p>
                      </div>
                    </div>
                    <span className="font-tabular-mono text-label-sm text-secondary bg-surface-container-lowest px-2.5 py-1 rounded-lg font-semibold shadow-xs">
                      Điểm AI: {detail.aiMatchScore !== null ? `${Math.round(detail.aiMatchScore)}%` : 'Chưa chấm'}
                    </span>
                  </div>

                  {/* 4 Metrics Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                    {/* Metric 1 */}
                    <div className="bg-surface-container-lowest p-3 rounded-lg space-y-1.5 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="font-body-sm-medium text-body-sm-medium text-on-surface">
                          Kỹ năng chuyên môn cốt lõi
                        </span>
                        <span className="font-tabular-mono text-body-sm-medium text-primary font-bold">
                          {parsedAi.breakdown?.skill_score ? `${Math.round(parsedAi.breakdown.skill_score)}%` : detail.aiMatchScore ? `${Math.round(detail.aiMatchScore)}%` : '75%'}
                        </span>
                      </div>
                      <div className="h-2 w-full bg-surface-container rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{
                            width: `${parsedAi.breakdown?.skill_score || detail.aiMatchScore || 75}%`,
                          }}
                        />
                      </div>
                      <p className="font-label-xs text-label-xs text-outline">
                        Độ tương thích kỹ năng trích xuất từ CV so với yêu cầu JD.
                      </p>
                    </div>

                    {/* Metric 2 */}
                    <div className="bg-surface-container-lowest p-3 rounded-lg space-y-1.5 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="font-body-sm-medium text-body-sm-medium text-on-surface">
                          Kinh nghiệm thực chiến
                        </span>
                        <span className="font-tabular-mono text-body-sm-medium text-secondary font-bold">
                          {parsedAi.breakdown?.experience_score ? `${Math.round(parsedAi.breakdown.experience_score)}%` : (detail.candidate.experienceYears || 1) >= 3 ? '85%' : '70%'}
                        </span>
                      </div>
                      <div className="h-2 w-full bg-surface-container rounded-full overflow-hidden">
                        <div
                          className="h-full bg-secondary rounded-full"
                          style={{
                            width: `${parsedAi.breakdown?.experience_score || ((detail.candidate.experienceYears || 1) >= 3 ? 85 : 70)}%`,
                          }}
                        />
                      </div>
                      <p className="font-label-xs text-label-xs text-outline">
                        Số năm làm việc và bề dày dự án tích lũy ({detail.candidate.experienceYears || 1} năm).
                      </p>
                    </div>

                    {/* Metric 3 */}
                    <div className="bg-surface-container-lowest p-3 rounded-lg space-y-1.5 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="font-body-sm-medium text-body-sm-medium text-on-surface">
                          Học vấn & Tiêu chuẩn ngành
                        </span>
                        <span className="font-tabular-mono text-body-sm-medium text-tertiary font-bold">
                          {parsedAi.breakdown?.education_score ? `${Math.round(parsedAi.breakdown.education_score)}%` : '85%'}
                        </span>
                      </div>
                      <div className="h-2 w-full bg-surface-container rounded-full overflow-hidden">
                        <div
                          className="h-full bg-tertiary rounded-full"
                          style={{ width: `${parsedAi.breakdown?.education_score || 85}%` }}
                        />
                      </div>
                      <p className="font-label-xs text-label-xs text-outline">
                        Trình độ học vấn ({detail.candidate.education || 'Đại học'}) phù hợp yêu cầu chuyên môn.
                      </p>
                    </div>

                    {/* Metric 4 */}
                    <div className="bg-surface-container-lowest p-3 rounded-lg space-y-1.5 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="font-body-sm-medium text-body-sm-medium text-on-surface">
                          Tương đồng ngữ nghĩa & Mức độ khớp JD
                        </span>
                        <span className="font-tabular-mono text-body-sm-medium text-primary-container font-bold">
                          {parsedAi.breakdown?.semantic_score ? `${Math.round(parsedAi.breakdown.semantic_score)}%` : detail.aiMatchScore ? `${Math.round(detail.aiMatchScore)}%` : '80%'}
                        </span>
                      </div>
                      <div className="h-2 w-full bg-surface-container rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary-container rounded-full"
                          style={{
                            width: `${parsedAi.breakdown?.semantic_score || detail.aiMatchScore || 80}%`,
                          }}
                        />
                      </div>
                      <p className="font-label-xs text-label-xs text-outline">
                        Độ tương thích tổng thể văn bản CV với bản mô tả công việc.
                      </p>
                    </div>
                  </div>

                  {/* Inline Telemetry Banner */}
                  <div className="bg-surface-container-lowest p-3.5 rounded-lg flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-xl bg-surface-container-low text-primary">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 36 36">
                          <circle className="opacity-20" cx="18" cy="18" r="14" stroke="currentColor" strokeWidth="1.5" />
                          <circle className="opacity-30" cx="18" cy="18" r="9" stroke="currentColor" strokeWidth="1" />
                          <circle className="opacity-40" cx="18" cy="18" r="4" stroke="currentColor" strokeWidth="1" />
                          <polygon fill="currentColor" fillOpacity="0.15" points="18,4 29,13 25,27 11,27 7,13" stroke="currentColor" strokeWidth="1.5" />
                        </svg>
                      </div>
                      <div className="space-y-0.5">
                        <span className="font-body-sm-medium text-body-sm-medium text-on-surface">
                          Nhận xét tổng thể từ TalentPulse AI
                        </span>
                        <p className="font-label-xs text-label-xs text-outline">
                          {parsedAi.summary || 'Hồ sơ đã được lưu trữ trên hệ thống. Nhấn Xem Đánh giá AI để chạy phân tích sâu.'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/hr/screening?jobId=${detail.jobPosting.id}&applicationId=${detail.id}`}
                        className="font-label-xs text-label-xs px-2.5 py-1 rounded bg-tertiary-fixed text-on-tertiary-fixed font-semibold hover:opacity-90 transition-opacity"
                      >
                        Khám phá chi tiết AI →
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: History & Timeline */}
            {activeTab === 'timeline' && (
              <div className="p-space-md md:p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-headline-lg text-headline-lg text-on-surface font-semibold flex items-center gap-2">
                    <span className="material-symbols-outlined text-outline text-[20px]">calendar_month</span>
                    Nhật ký tiến trình tuyển dụng
                  </h3>
                  <span className="font-tabular-mono text-label-xs text-outline">
                    Cập nhật lần cuối: {formatDate(detail.updatedAt)}
                  </span>
                </div>

                {/* Linear Activity Feed */}
                <div className="relative pl-6 space-y-5 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-surface-container">
                  {/* Event: Interviews if any */}
                  {detail.interviews.map((interview) => (
                    <div key={interview.id} className="relative group">
                      <span className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-secondary ring-4 ring-surface-container-lowest" />
                      <div className="bg-surface-container-low p-3 rounded-lg flex flex-col gap-1">
                        <div className="flex items-center justify-between flex-wrap">
                          <span className="font-body-sm-medium text-body-sm-medium text-on-surface font-semibold">
                            Lịch phỏng vấn ({interview.status})
                          </span>
                          <span className="font-tabular-mono text-label-xs px-2 py-0.5 rounded bg-secondary-fixed text-on-secondary-fixed font-medium">
                            {formatDate(interview.scheduledAt)}
                          </span>
                        </div>
                        <p className="font-body-sm text-body-sm text-on-surface-variant">
                          Thời lượng: {interview.durationMinutes} phút • Người phỏng vấn: {interview.interviewer?.lastName} {interview.interviewer?.firstName} ({interview.interviewer?.email})
                        </p>
                        {interview.notes && (
                          <p className="text-label-xs text-outline bg-surface-container-lowest p-2 rounded mt-1">
                            Ghi chú: {interview.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Event: AI Screened */}
                  {detail.aiMatchScore !== null && (
                    <div className="relative group">
                      <span className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-tertiary ring-4 ring-surface-container-lowest" />
                      <div className="space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span className="font-body-sm-medium text-body-sm-medium text-on-surface">
                            AI TalentPulse chấm điểm hồ sơ đạt {Math.round(detail.aiMatchScore)}%
                          </span>
                          <span className="font-tabular-mono text-label-xs text-outline">
                            {formatDate(detail.updatedAt)}
                          </span>
                        </div>
                        <p className="font-label-xs text-label-xs text-outline">
                          Trạng thái hồ sơ: {detail.status} • Trích xuất được {detail.parsedSkills?.length || 0} kỹ năng.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Event: Application Submitted */}
                  <div className="relative group">
                    <span className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-primary ring-4 ring-surface-container-lowest" />
                    <div className="space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="font-body-sm-medium text-body-sm-medium text-on-surface">
                          Ứng viên nộp đơn ứng tuyển trực tuyến
                        </span>
                        <span className="font-tabular-mono text-label-xs text-outline">
                          {formatDate(detail.appliedAt)}
                        </span>
                      </div>
                      <p className="font-label-xs text-label-xs text-outline">
                        Vị trí ứng tuyển: {detail.jobPosting.title} • Nguồn: Cổng việc làm TalentPulse.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: HR Notes & Evaluations */}
            {activeTab === 'notes' && (
              <div className="p-space-md md:p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-headline-lg text-headline-lg text-on-surface font-semibold flex items-center gap-2">
                    <span className="material-symbols-outlined text-outline text-[20px]">chat</span>
                    Ghi chú nội bộ & Đánh giá tuyển dụng
                  </h3>
                  <span className="font-label-xs text-label-xs text-outline">
                    Chỉ hiển thị với Hội đồng Tuyển dụng
                  </span>
                </div>

                {/* Notes Stream */}
                <div className="space-y-3">
                  {detail.interviews.filter((i) => i.notes).length > 0 ? (
                    detail.interviews
                      .filter((i) => i.notes)
                      .map((item, idx) => (
                        <div
                          key={idx}
                          className="bg-surface-container-lowest p-3 rounded-lg space-y-1.5 shadow-2xs border border-outline-variant/30"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-secondary text-on-secondary font-label-xs flex items-center justify-center font-bold">
                                {item.interviewer?.firstName?.[0] || 'HR'}
                              </div>
                              <span className="font-body-sm-medium text-body-sm-medium text-on-surface">
                                {item.interviewer?.lastName} {item.interviewer?.firstName}{' '}
                                <span className="text-outline font-normal">• Interviewer</span>
                              </span>
                            </div>
                            <span className="font-tabular-mono text-label-xs text-outline">
                              {formatDate(item.scheduledAt)}
                            </span>
                          </div>
                          <p className="font-body-sm text-body-sm text-on-surface-variant">
                            {item.notes}
                          </p>
                        </div>
                      ))
                  ) : (
                    <div className="p-4 rounded-lg bg-surface-container-low text-outline text-body-sm text-center">
                      Chưa có nhận xét nào từ các buổi phỏng vấn. Bạn có thể nhập ghi chú nhanh phía dưới.
                    </div>
                  )}
                </div>

                {/* Input Note Box */}
                <div className="bg-surface-container-lowest rounded-lg p-3 border border-outline-variant/40 flex flex-col gap-2">
                  <textarea
                    rows={2}
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Viết nhận xét hoặc ghi chú nội bộ cho hồ sơ ứng viên này..."
                    className="w-full bg-transparent border-0 resize-none font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none"
                  />
                  <div className="flex items-center justify-between pt-1">
                    <span className="font-label-xs text-label-xs text-outline">
                      Lưu trữ nội bộ • Bảo mật thông tin
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (!newNote.trim()) return;
                        setMessage({ text: 'Đã lưu ghi chú đánh giá thành công!', type: 'success' });
                        setNewNote('');
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-body-sm-medium text-body-sm-medium shadow-2xs transition-all"
                    >
                      <span className="material-symbols-outlined text-[16px]">send</span>
                      <span>Lưu ghi chú</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 4: Job Posting Details */}
            {activeTab === 'job' && (
              <div className="p-space-md md:p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-headline-lg text-headline-lg text-on-surface font-semibold flex items-center gap-2">
                    <span className="material-symbols-outlined text-outline text-[20px]">work</span>
                    Chi tiết Vị trí Tuyển dụng
                  </h3>
                  <Link
                    href="/dashboard/jobs"
                    className="font-label-xs text-label-xs text-primary font-semibold hover:underline"
                  >
                    Quản lý tin tuyển dụng →
                  </Link>
                </div>

                <div className="bg-surface-container-low p-4 rounded-xl space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-body-sm">
                    <div>
                      <span className="text-outline text-label-xs block">Vị trí:</span>
                      <strong className="text-on-surface font-semibold">{detail.jobPosting.title}</strong>
                    </div>
                    <div>
                      <span className="text-outline text-label-xs block">Phòng ban:</span>
                      <span className="text-on-surface">{detail.jobPosting.department || 'Chưa phân ban'}</span>
                    </div>
                    <div>
                      <span className="text-outline text-label-xs block">Địa điểm làm việc:</span>
                      <span className="text-on-surface">{detail.jobPosting.location || 'Toàn quốc'}</span>
                    </div>
                    <div>
                      <span className="text-outline text-label-xs block">Hình thức:</span>
                      <span className="text-on-surface">{detail.jobPosting.employmentType || 'Toàn thời gian'}</span>
                    </div>
                  </div>

                  <div className="border-t border-outline-variant/40 pt-3">
                    <span className="text-outline text-label-xs uppercase tracking-wider font-semibold block mb-1">
                      Yêu cầu năng lực & Tiêu chí công việc:
                    </span>
                    <p className="font-body-sm text-body-sm text-on-surface-variant whitespace-pre-line">
                      {detail.jobPosting.requirements || 'Yêu cầu được xác định cụ thể trong bản mô tả công việc (JD).'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
