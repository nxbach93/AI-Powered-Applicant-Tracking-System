'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { RoleGuard } from '@/components/auth/role-guard';
import { ApplicationStatusBadge } from '@/components/candidate/application-status-badge';
import { getMyApplicationByIdApi, withdrawApplicationApi, ApplicationDetail } from '@/lib/application-api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';
const WITHDRAWABLE = new Set(['SUBMITTED', 'SCREENING']);

function formatDate(iso: string, withTime = false) {
  return new Date(iso).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {})
  });
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="text-xs text-slate-500 shrink-0 w-28">{label}</span>
      <span className="text-xs font-semibold text-slate-800 flex-1">{value || '—'}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm shadow-slate-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100">
        <h2 className="text-sm font-bold text-slate-900">{title}</h2>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

function PageContent({ id }: { id: string }) {
  const router = useRouter();
  const [app, setApp] = useState<ApplicationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [withdrawing, setWithdrawing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMyApplicationByIdApi(id);
      setApp(data);
    } catch (e: any) {
      setError(e.message || 'Không tìm thấy đơn ứng tuyển');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleWithdraw = async () => {
    if (!app) return;
    if (!confirm(`Bạn có chắc muốn rút đơn ứng tuyển vào "${app.jobPosting.title}" không?`)) return;
    setWithdrawing(true);
    try {
      await withdrawApplicationApi(id);
      setApp(prev => prev ? { ...prev, status: 'WITHDRAWN' } : null);
    } catch (e: any) {
      alert(e.message || 'Không thể rút đơn. Vui lòng thử lại');
    } finally {
      setWithdrawing(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-slate-200 rounded-xl w-1/2" />
        <div className="h-40 bg-white rounded-2xl border border-slate-200" />
        <div className="h-32 bg-white rounded-2xl border border-slate-200" />
      </div>
    );
  }

  if (error || !app) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
        <p className="text-sm text-red-700 font-medium mb-4">{error || 'Không tìm thấy đơn ứng tuyển'}</p>
        <button onClick={() => router.push('/candidate/applications')}
          className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700">
          Quay lại danh sách
        </button>
      </div>
    );
  }

  const canWithdraw = WITHDRAWABLE.has(app.status);

  return (
    <div className="space-y-5">
      {/* Status bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900">{app.jobPosting.title}</h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
            {app.jobPosting.department && (
              <span className="text-xs text-slate-500">{app.jobPosting.department}</span>
            )}
            {app.jobPosting.location && (
              <span className="text-xs text-slate-500">📍 {app.jobPosting.location}</span>
            )}
            {app.jobPosting.employmentType && (
              <span className="text-xs text-slate-500">{app.jobPosting.employmentType}</span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">Nộp ngày {formatDate(app.appliedAt)}</p>
        </div>
        <div className="flex items-center gap-3">
          <ApplicationStatusBadge status={app.status} size="md" />
          {canWithdraw && (
            <button
              onClick={handleWithdraw}
              disabled={withdrawing}
              id="withdraw-application-btn"
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors disabled:opacity-50"
            >
              {withdrawing ? 'Đang xử lý...' : 'Rút đơn'}
            </button>
          )}
        </div>
      </div>

      {/* AI Analysis */}
      {(app.aiMatchScore !== null || app.parsedSkills || app.aiAnalysisSummary) && (
        <Section title="🤖 Kết quả phân tích AI">
          <div className="space-y-4">
            {app.aiMatchScore !== null && (
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs font-semibold text-slate-700">Điểm phù hợp với vị trí</span>
                  <span className="text-sm font-bold text-amber-600">{app.aiMatchScore}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="h-2.5 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-700"
                    style={{ width: `${Math.min(100, app.aiMatchScore)}%` }}
                  />
                </div>
              </div>
            )}
            {app.aiAnalysisSummary && (
              <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 rounded-xl p-4 border border-slate-200">
                {app.aiAnalysisSummary}
              </p>
            )}
            {app.parsedSkills && app.parsedSkills.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-700 mb-2">Kỹ năng được nhận diện:</p>
                <div className="flex flex-wrap gap-1.5">
                  {app.parsedSkills.map((skill, i) => (
                    <span key={i} className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full border border-blue-100">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* Thư xin việc */}
      {app.coverLetter && (
        <Section title="Thư xin việc">
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{app.coverLetter}</p>
        </Section>
      )}

      {/* Thông tin việc làm */}
      <Section title="Thông tin vị trí tuyển dụng">
        <div className="space-y-3">
          <InfoRow label="Mã tin" value={app.jobPosting.id.slice(0, 8).toUpperCase()} />
          {app.jobPosting.salaryMin && (
            <InfoRow
              label="Mức lương"
              value={`${app.jobPosting.salaryMin?.toLocaleString('vi-VN')} – ${app.jobPosting.salaryMax?.toLocaleString('vi-VN')} VNĐ`}
            />
          )}
          {app.jobPosting.applicationDeadline && (
            <InfoRow label="Hạn nộp" value={formatDate(app.jobPosting.applicationDeadline)} />
          )}
          {app.jobPosting.requirements && (
            <div className="mt-3 pt-3 border-t border-slate-100">
              <p className="text-xs font-semibold text-slate-700 mb-2">Yêu cầu:</p>
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{app.jobPosting.requirements}</p>
            </div>
          )}
        </div>
      </Section>

      {/* CV đính kèm */}
      {app.cvFileUrl && (
        <Section title="CV đính kèm">
          <a
            href={`${API_BASE}${app.cvFileUrl}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2.5 px-4 py-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors"
          >
            <svg className="w-5 h-5 text-blue-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <div>
              <p className="text-xs font-semibold text-blue-800">{(app as any).cvFileUrl?.split('/').pop()}</p>
              <p className="text-[10px] text-blue-500">Nhấn để xem / tải về</p>
            </div>
          </a>
        </Section>
      )}

      {/* Lịch phỏng vấn */}
      {app.interviews && app.interviews.length > 0 && (
        <Section title={`Lịch phỏng vấn (${app.interviews.length})`}>
          <div className="space-y-3">
            {app.interviews.map((iv) => (
              <div key={iv.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3.5 bg-indigo-50/60 border border-indigo-200/70 rounded-xl">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-indigo-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-xs font-bold text-indigo-800">
                      {formatDate(iv.scheduledAt, true)}
                      {iv.durationMinutes && ` · ${iv.durationMinutes} phút`}
                    </p>
                  </div>
                  {iv.location && (
                    <p className="text-xs text-slate-600 ml-6">📍 {iv.location}</p>
                  )}
                  {iv.notes && (
                    <p className="text-xs text-slate-500 italic ml-6">{iv.notes}</p>
                  )}
                </div>
                {iv.meetingUrl && (
                  <a
                    href={iv.meetingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-700 bg-white border border-indigo-200 hover:bg-indigo-50 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.845v6.31a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Tham gia họp
                  </a>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function DetailParamsWrapper() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : '';
  return <PageContent id={id} />;
}

export default function ApplicationDetailPage() {
  return (
    <RoleGuard allowedRoles={['CANDIDATE']}>
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-2xl mx-auto px-4 py-8 sm:px-6">
          <nav className="text-xs text-slate-500 mb-5 flex items-center gap-1.5">
            <Link href="/" className="hover:text-slate-700">Trang chủ</Link>
            <span>/</span>
            <Link href="/candidate/applications" className="hover:text-slate-700">Hồ sơ ứng tuyển</Link>
            <span>/</span>
            <span className="text-slate-800 font-medium">Chi tiết đơn</span>
          </nav>
          <React.Suspense
            fallback={
              <div className="space-y-4">
                <div className="h-28 bg-white rounded-2xl border border-slate-100 animate-pulse" />
                <div className="h-44 bg-white rounded-2xl border border-slate-100 animate-pulse" />
              </div>
            }
          >
            <DetailParamsWrapper />
          </React.Suspense>
        </div>
      </div>
    </RoleGuard>
  );
}
