'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { apiRequest } from '@/lib/api';
import { RoleGuard } from '@/components/auth/role-guard';

interface CandidateCard {
  id: string; // Application ID
  status: string;
  appliedAt: string;
  aiMatchScore: number | null;
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

const COLUMN_CONFIG = [
  { key: 'SHORTLISTED', title: 'Đạt vòng CV', color: 'border-blue-500 bg-blue-50/30' },
  { key: 'INTERVIEW_SCHEDULED', title: 'Đã xếp lịch PV', color: 'border-indigo-500 bg-indigo-50/30' },
  { key: 'INTERVIEWED', title: 'Đã phỏng vấn', color: 'border-purple-500 bg-purple-50/30' },
  { key: 'OFFERED', title: 'Đã gửi Offer', color: 'border-amber-500 bg-amber-50/30' },
  { key: 'HIRED', title: 'Tuyển dụng thành công', color: 'border-emerald-500 bg-emerald-50/30' },
  { key: 'REJECTED', title: 'Không đạt', color: 'border-rose-500 bg-rose-50/30' }
];

export default function HrWorkflowPage() {
  const [kanbanData, setKanbanData] = useState<KanbanData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchKanban = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiRequest<KanbanData>('/interviews/workflow/kanban');
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
    fetchKanban();
  }, [fetchKanban]);

  const handleUpdateStatus = async (applicationId: string, nextStatus: string) => {
    setIsUpdating(true);
    try {
      const res = await apiRequest(`/interviews/workflow/application/${applicationId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus })
      });
      if (res.success) {
        setActionMessage(`Đã chuyển ứng viên sang trạng thái ${nextStatus}`);
        fetchKanban();
      } else {
        setError(res.error?.message || 'Không thể cập nhật trạng thái');
      }
    } catch {
      setError('Lỗi kết nối khi cập nhật trạng thái');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <RoleGuard allowedRoles={['HR', 'ADMIN']}>
      <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1600px] mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Quy trình tuyển dụng (Recruitment Workflow)</h1>
              <p className="text-sm text-slate-500 mt-1">
                Theo dõi và điều phối ứng viên qua từng giai đoạn: Lọc CV $\rightarrow$ Phỏng vấn $\rightarrow$ Offer $\rightarrow$ Tuyển dụng.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/hr/interviews"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-sm rounded-xl transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Xem danh sách lịch phỏng vấn
              </Link>
            </div>
          </div>

          {/* Alert */}
          {actionMessage && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex justify-between items-center">
              <span>{actionMessage}</span>
              <button type="button" onClick={() => setActionMessage(null)} className="text-emerald-600 hover:text-emerald-900 font-bold">×</button>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex justify-between items-center">
              <span>{error}</span>
              <button type="button" onClick={() => setError(null)} className="text-rose-600 hover:text-rose-900 font-bold">×</button>
            </div>
          )}

          {/* Kanban Board Container */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-96 bg-slate-200 animate-pulse rounded-2xl" />
              ))}
            </div>
          ) : kanbanData ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 items-start">
              {COLUMN_CONFIG.map((col) => {
                const list = (kanbanData.columns as any)[col.key] || [];

                return (
                  <div
                    key={col.key}
                    className={`rounded-2xl border bg-white p-4 shadow-xs flex flex-col max-h-[800px] border-t-4 ${col.color}`}
                  >
                    {/* Column Header */}
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                      <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">{col.title}</h2>
                      <span className="px-2 py-0.5 text-xs font-bold bg-slate-100 text-slate-600 rounded-full">
                        {list.length}
                      </span>
                    </div>

                    {/* Cards Container */}
                    <div className="space-y-3 overflow-y-auto pr-1">
                      {list.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-400 italic">
                          Trống
                        </div>
                      ) : (
                        list.map((app: CandidateCard) => {
                          const candidate = app.candidateProfile?.user;
                          const latestInterview = app.interviews?.[0];

                          return (
                            <div
                              key={app.id}
                              className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs hover:shadow-md transition-all space-y-2"
                            >
                              <div>
                                <h3 className="text-xs font-bold text-slate-900">
                                  {candidate ? `${candidate.firstName} ${candidate.lastName}` : 'Ứng viên'}
                                </h3>
                                <p className="text-[11px] text-slate-500 truncate">{candidate?.email}</p>
                              </div>

                              <div className="text-[11px] text-blue-600 font-medium bg-blue-50/80 px-2 py-0.5 rounded-md truncate">
                                {app.jobPosting?.title || 'Chưa có vị trí'}
                              </div>

                              {/* AI match score badge nếu có */}
                              {app.aiMatchScore !== null && (
                                <div className="flex items-center justify-between text-[11px] bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                                  <span className="text-slate-500 font-medium">Điểm AI:</span>
                                  <span className="font-bold text-emerald-600">{Math.round(app.aiMatchScore)}%</span>
                                </div>
                              )}

                              {/* Latest interview info nếu có */}
                              {latestInterview && (
                                <div className="text-[10px] text-slate-600 bg-slate-50 p-1.5 rounded-lg space-y-0.5">
                                  <div className="font-semibold text-slate-700">PV: {new Date(latestInterview.scheduledAt).toLocaleDateString('vi-VN')}</div>
                                  {latestInterview.rating && (
                                    <div className="text-amber-500 font-bold">
                                      {'★'.repeat(latestInterview.rating)} ({latestInterview.rating}/5)
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Quick Actions per column */}
                              <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-1">
                                {col.key === 'SHORTLISTED' && (
                                  <Link
                                    href="/hr/interviews"
                                    className="w-full text-center py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-semibold rounded-lg transition-colors"
                                  >
                                    Lên lịch PV
                                  </Link>
                                )}

                                {col.key === 'INTERVIEWED' && (
                                  <>
                                    <button
                                      type="button"
                                      disabled={isUpdating}
                                      onClick={() => handleUpdateStatus(app.id, 'OFFERED')}
                                      className="flex-1 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 text-[10px] font-semibold rounded-lg transition-colors cursor-pointer"
                                    >
                                      Gửi Offer
                                    </button>
                                    <button
                                      type="button"
                                      disabled={isUpdating}
                                      onClick={() => handleUpdateStatus(app.id, 'REJECTED')}
                                      className="py-1 px-2 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 text-[10px] font-semibold rounded-lg transition-colors cursor-pointer"
                                    >
                                      Từ chối
                                    </button>
                                  </>
                                )}

                                {col.key === 'OFFERED' && (
                                  <>
                                    <button
                                      type="button"
                                      disabled={isUpdating}
                                      onClick={() => handleUpdateStatus(app.id, 'HIRED')}
                                      className="flex-1 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-semibold rounded-lg transition-colors cursor-pointer"
                                    >
                                      Nhận việc
                                    </button>
                                    <button
                                      type="button"
                                      disabled={isUpdating}
                                      onClick={() => handleUpdateStatus(app.id, 'REJECTED')}
                                      className="py-1 px-2 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 text-[10px] font-semibold rounded-lg transition-colors cursor-pointer"
                                    >
                                      Từ chối
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>
    </RoleGuard>
  );
}
