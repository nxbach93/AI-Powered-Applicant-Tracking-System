'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ApplicationStatus,
  HrApplicationDetail,
  getApplicationDetailForHrApi,
  updateApplicationStatusApi,
} from '@/lib/application-api';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { AiMatchGauge } from '@/components/ui/AiMatchGauge';
import { PipelineProgressionBar } from '@/components/ui/PipelineProgressionBar';
import { CriteriaComparisonPane } from '@/components/ui/CriteriaComparisonPane';
import { AiStrengthsAndGaps } from '@/components/ui/AiStrengthsAndGaps';

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

export default function HrApplicationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : '';

  const [detail, setDetail] = useState<HrApplicationDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<ApplicationStatus | ''>('');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [activeTab, setActiveTab] = useState<'screening' | 'cv_preview' | 'interviews' | 'profile'>('screening');

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const data = await getApplicationDetailForHrApi(id);
      setDetail(data);
      setSelectedStatus(data.status);
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

  const handleStatusUpdate = async (newStatus?: ApplicationStatus) => {
    const statusToApply = newStatus || selectedStatus;
    if (!statusToApply || statusToApply === detail?.status) return;

    if (!confirm(`Xác nhận đổi trạng thái hồ sơ của ứng viên thành "${statusToApply}"?`)) return;

    setIsUpdating(true);
    setMessage(null);
    try {
      await updateApplicationStatusApi(id, statusToApply as ApplicationStatus);
      setMessage({ text: `Đã cập nhật trạng thái hồ sơ thành công sang "${statusToApply}"!`, type: 'success' });
      await fetchDetail();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Cập nhật trạng thái thất bại';
      setMessage({ text: errorMsg, type: 'error' });
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold text-slate-500 mt-4">
          Đang tải dữ liệu hồ sơ và phân tích AI...
        </p>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-lg mx-auto shadow-2xs my-10">
        <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-100">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-slate-900">Không tìm thấy hồ sơ ứng viên</h3>
        <p className="text-xs text-slate-500 mt-1 mb-6">
          {message?.text || 'Hồ sơ không tồn tại hoặc bạn không có quyền truy cập.'}
        </p>
        <Link
          href="/hr/applications"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-2xs"
        >
          ← Quay lại danh sách ứng viên
        </Link>
      </div>
    );
  }

  const { candidate, jobPosting, aiMatchScore, parsedSkills, aiAnalysisSummary } = detail;
  const isPendingReview = detail.status === 'SUBMITTED' || detail.status === 'SCREENING';

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Top Navigation & Context Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/hr/applications"
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition-colors"
            title="Quay lại danh sách"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="h-4 w-px bg-slate-200" />
          <div className="flex items-center gap-2 text-xs truncate">
            <span className="font-tabular-mono font-semibold text-slate-500">
              Mã hồ sơ: #{detail.id.slice(0, 8)}
            </span>
            <span className="text-slate-300">•</span>
            <span className="font-semibold text-slate-800 truncate">
              {jobPosting?.title}
            </span>
            {jobPosting?.department && (
              <span className="hidden sm:inline-block text-slate-400">
                ({jobPosting.department})
              </span>
            )}
          </div>
        </div>

        {/* Quick Decision Action CTAs */}
        <div className="flex items-center gap-2 flex-wrap">
          {isPendingReview && (
            <button
              type="button"
              disabled={isUpdating}
              onClick={() => handleStatusUpdate('SHORTLISTED')}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs transition-all disabled:opacity-50"
            >
              <span>✓ Duyệt sơ tuyển</span>
            </button>
          )}

          {detail.status !== 'REJECTED' && detail.status !== 'WITHDRAWN' && (
            <Link
              href={`/hr/interviews?applicationId=${detail.id}`}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-2xs transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>Lên lịch phỏng vấn</span>
            </Link>
          )}

          {detail.status !== 'REJECTED' && (
            <button
              type="button"
              disabled={isUpdating}
              onClick={() => handleStatusUpdate('REJECTED')}
              className="inline-flex items-center gap-1 h-8 px-2.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition-colors disabled:opacity-50"
            >
              <span>Từ chối</span>
            </button>
          )}
        </div>
      </div>

      {/* Toast Notification */}
      {message && (
        <div
          className={`p-3.5 rounded-xl text-xs sm:text-sm font-medium border flex items-center justify-between shadow-2xs ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <span>{message.text}</span>
          <button type="button" onClick={() => setMessage(null)} className="text-xs underline hover:opacity-80 ml-2">
            Đóng
          </button>
        </div>
      )}

      {/* Candidate Profile Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative overflow-hidden">
        <div className="flex items-start sm:items-center gap-4 sm:gap-5 min-w-0">
          <div className="relative flex-shrink-0">
            {candidate.avatarUrl ? (
              <img
                src={candidate.avatarUrl}
                alt={candidate.fullName}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border border-slate-200 shadow-2xs"
              />
            ) : (
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-blue-600 text-white font-extrabold text-2xl flex items-center justify-center shadow-sm">
                {candidate.fullName.charAt(0).toUpperCase() || 'U'}
              </div>
            )}
            <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 ring-2 ring-white" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                {candidate.fullName}
              </h1>
              <StatusBadge status={detail.status} size="sm" />
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                AI Neural Match
              </span>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 font-medium">
              Vị trí ứng tuyển:{' '}
              <strong className="text-slate-900">{jobPosting?.title}</strong>
              {jobPosting?.department && (
                <span className="text-slate-400"> • {jobPosting.department}</span>
              )}
            </p>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500 mt-2">
              <span className="flex items-center gap-1.5 font-medium">
                <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                {candidate.email}
              </span>
              {candidate.phone && (
                <span className="flex items-center gap-1.5 font-tabular-mono">
                  <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  {candidate.phone}
                </span>
              )}
              <span className="font-tabular-mono text-slate-400">
                Nộp ngày: {formatDate(detail.appliedAt)}
              </span>
            </div>
          </div>
        </div>

        {/* Circular AI Match Gauge & File Action */}
        <div className="flex items-center gap-4 sm:gap-6 self-start lg:self-auto border-t lg:border-t-0 pt-4 lg:pt-0 border-slate-100">
          <div className="flex items-center gap-3">
            <AiMatchGauge score={aiMatchScore} variant="gauge" size="lg" />
            <div className="flex flex-col">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Tương thích AI
              </span>
              <span className="text-xs font-bold text-slate-800">
                {aiMatchScore !== null && aiMatchScore !== undefined
                  ? aiMatchScore >= 85
                    ? 'Rất phù hợp xuất sắc'
                    : aiMatchScore >= 70
                    ? 'Phù hợp tốt'
                    : aiMatchScore >= 50
                    ? 'Đạt mức cơ bản'
                    : 'Lệch chuyên môn'
                  : 'Chờ chấm điểm'}
              </span>
            </div>
          </div>

          {detail.cvFileUrl && (
            <a
              href={`${API_BASE}${detail.cvFileUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors"
            >
              <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Mở CV gốc</span>
            </a>
          )}
        </div>
      </div>

      {/* Recruitment Pipeline Progression Bar */}
      <PipelineProgressionBar currentStatus={detail.status} />

      {/* HR Workflow Status Transition Form */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h4 className="font-bold text-sm text-slate-900">
            Điều phối trạng thái vòng tuyển dụng (HR Workflow)
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Cập nhật trạng thái vòng ứng tuyển để đồng bộ vào dữ liệu tuyển dụng và thông báo.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as ApplicationStatus)}
            className="h-9 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="SUBMITTED">Mới nộp (SUBMITTED)</option>
            <option value="SCREENING">Đang sàng lọc (SCREENING)</option>
            <option value="SHORTLISTED">Vào danh sách phỏng vấn (SHORTLISTED)</option>
            <option value="INTERVIEW_SCHEDULED">Đã lên lịch PV (INTERVIEW_SCHEDULED)</option>
            <option value="INTERVIEWED">Đã phỏng vấn (INTERVIEWED)</option>
            <option value="OFFERED">Gửi thư mời nhận việc (OFFERED)</option>
            <option value="HIRED">Tuyển dụng chính thức (HIRED)</option>
            <option value="REJECTED">Không phù hợp (REJECTED)</option>
          </select>

          <button
            type="button"
            disabled={isUpdating || selectedStatus === detail.status}
            onClick={() => handleStatusUpdate()}
            className="h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-2xs transition-colors disabled:opacity-40"
          >
            {isUpdating ? 'Đang lưu...' : 'Lưu trạng thái'}
          </button>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="flex items-center gap-1 border-b border-slate-200 overflow-x-auto text-xs sm:text-sm font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab('screening')}
          className={`pb-3 px-4 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'screening'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <span>Sàng lọc AI & Đối sánh tiêu chí</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('cv_preview')}
          className={`pb-3 px-4 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'cv_preview'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span>Xem tài liệu CV</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('interviews')}
          className={`pb-3 px-4 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'interviews'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>Lịch phỏng vấn ({detail.interviews?.length || 0})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`pb-3 px-4 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'profile'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7 7z" />
          </svg>
          <span>Hồ sơ & Thư giới thiệu</span>
        </button>
      </div>

      {/* Tab 1: AI CV Screening & Criteria Comparison */}
      {activeTab === 'screening' && (
        <div className="space-y-6">
          {/* AI Natural Summary Card */}
          {aiAnalysisSummary ? (
            <div className="p-4 sm:p-5 rounded-2xl bg-white border border-indigo-200/90 shadow-2xs flex flex-col gap-3">
              <div className="flex items-center gap-2 text-indigo-900 font-bold text-sm">
                <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs">
                  ✨
                </span>
                <span>Nhận xét phân tích chuyên sâu từ AI</span>
              </div>
              <div className="text-xs sm:text-sm text-slate-700 leading-relaxed bg-slate-50/80 p-4 rounded-xl border border-slate-200/70 whitespace-pre-line">
                {aiAnalysisSummary}
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500 italic">
              Chưa có văn bản nhận xét AI cho đơn ứng tuyển này hoặc đang trong hàng đợi xử lý.
            </div>
          )}

          {/* Strengths & Gaps */}
          <AiStrengthsAndGaps detail={detail} />

          {/* Dual-Pane Criteria Comparison */}
          <CriteriaComparisonPane detail={detail} />
        </div>
      )}

      {/* Tab 2: CV PDF Preview */}
      {activeTab === 'cv_preview' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
          <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700 flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Tệp tài liệu: {detail.cvFileUrl?.split('/').pop() || 'CV Ứng viên'}
            </span>
            {detail.cvFileUrl && (
              <a
                href={`${API_BASE}${detail.cvFileUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-blue-600 hover:text-blue-700 hover:underline"
              >
                Mở trong tab mới ↗
              </a>
            )}
          </div>
          {detail.cvFileUrl ? (
            <div className="w-full h-[750px] bg-slate-100">
              <iframe
                src={`${API_BASE}${detail.cvFileUrl}#toolbar=1`}
                className="w-full h-full border-none"
                title="CV Document Preview"
              />
            </div>
          ) : (
            <div className="py-20 text-center text-slate-400 text-xs">
              Ứng viên chưa đính kèm tệp CV cho đơn ứng tuyển này.
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Interviews History & Timeline */}
      {activeTab === 'interviews' && (
        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                Lịch trình Phỏng vấn & Lịch sử Đánh giá
              </h3>
              <p className="text-xs text-slate-500">
                Các buổi phỏng vấn đã được xếp lịch với ứng viên này.
              </p>
            </div>
            <Link
              href={`/hr/interviews?applicationId=${detail.id}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors shadow-2xs"
            >
              + Tạo lịch phỏng vấn mới
            </Link>
          </div>

          {detail.interviews && detail.interviews.length > 0 ? (
            <div className="space-y-3">
              {detail.interviews.map((iv) => (
                <div
                  key={iv.id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">
                      {formatDate(iv.scheduledAt)} ({iv.durationMinutes} phút)
                    </span>
                    <span className="font-semibold text-[10px] px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {iv.status}
                    </span>
                  </div>

                  <div className="text-slate-600">
                    Người phỏng vấn: {iv.interviewer.firstName} {iv.interviewer.lastName} ({iv.interviewer.email})
                  </div>

                  {iv.meetingUrl && (
                    <div>
                      Link họp trực tuyến:{' '}
                      <a
                        href={iv.meetingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 underline font-mono text-[11px]"
                      >
                        {iv.meetingUrl}
                      </a>
                    </div>
                  )}

                  {iv.notes && (
                    <div className="text-slate-500 italic pt-1 border-t border-slate-200/50">
                      Ghi chú: {iv.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic py-6 text-center">
              Chưa có lịch phỏng vấn nào được thiết lập cho đơn ứng tuyển này.
            </p>
          )}
        </div>
      )}

      {/* Tab 4: Candidate Profile & Cover Letter */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Thông tin ứng viên */}
          <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
            <h3 className="font-bold text-sm text-slate-900 pb-2 border-b border-slate-100">
              Thông tin Cá nhân & Chuyên môn
            </h3>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase">Họ và tên</span>
                <div className="font-bold text-slate-800 mt-0.5">{candidate.fullName}</div>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase">Email</span>
                <div className="font-medium text-slate-800 mt-0.5">{candidate.email}</div>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase">Số điện thoại</span>
                <div className="font-medium text-slate-800 mt-0.5">{candidate.phone || 'Chưa cập nhật'}</div>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase">Ngày sinh</span>
                <div className="font-medium text-slate-800 mt-0.5">{formatSimpleDate(candidate.dateOfBirth)}</div>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase">Kinh nghiệm</span>
                <div className="font-medium text-slate-800 mt-0.5">
                  {candidate.experienceYears !== null && candidate.experienceYears !== undefined
                    ? `${candidate.experienceYears} năm`
                    : 'Chưa cập nhật'}
                </div>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase">Học vấn</span>
                <div className="font-medium text-slate-800 mt-0.5">{candidate.education || 'Chưa cập nhật'}</div>
              </div>
            </div>

            {candidate.summary && (
              <div className="pt-2 border-t border-slate-100">
                <span className="text-[11px] font-semibold text-slate-400 uppercase">Tóm tắt bản thân</span>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{candidate.summary}</p>
              </div>
            )}
          </div>

          {/* Thư giới thiệu (Cover letter) */}
          <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
            <h3 className="font-bold text-sm text-slate-900 pb-2 border-b border-slate-100">
              Thư xin việc (Cover Letter)
            </h3>
            {detail.coverLetter ? (
              <div className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200/70 whitespace-pre-wrap">
                {detail.coverLetter}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic py-6 text-center">
                Ứng viên không đính kèm thư giới thiệu.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
