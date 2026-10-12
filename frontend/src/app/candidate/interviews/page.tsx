'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiRequest } from '@/lib/api';
import { RoleGuard } from '@/components/auth/role-guard';

interface CandidateInterview {
  id: string;
  scheduledAt: string;
  durationMinutes: number;
  location: string | null;
  meetingUrl: string | null;
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  rating: number | null;
  feedback: string | null;
  notes: string | null;
  interviewer?: {
    firstName: string;
    lastName: string;
  };
  application?: {
    id: string;
    status: string;
    jobPosting?: {
      id: string;
      title: string;
      department: string | null;
      location: string | null;
    };
  };
}

export default function CandidateInterviewsPage() {
  const [interviews, setInterviews] = useState<CandidateInterview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMyInterviews() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await apiRequest<CandidateInterview[]>('/interviews');
        if (res.success && res.data) {
          setInterviews(res.data);
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
        return <span className="px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 border border-blue-200">Sắp diễn ra</span>;
      case 'COMPLETED':
        return <span className="px-3 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">Đã hoàn thành</span>;
      case 'CANCELLED':
        return <span className="px-3 py-1 text-xs font-semibold rounded-full bg-rose-100 text-rose-800 border border-rose-200">Đã hủy</span>;
      case 'NO_SHOW':
        return <span className="px-3 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 border border-amber-200">Vắng mặt</span>;
      default:
        return <span className="px-3 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-800">{status}</span>;
    }
  };

  return (
    <RoleGuard allowedRoles={['CANDIDATE', 'ADMIN']}>
      <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h1 className="text-2xl font-bold text-slate-900">Lịch phỏng vấn của tôi</h1>
            <p className="text-sm text-slate-500 mt-1">
              Theo dõi lịch hẹn, phòng họp trực tuyến và kết quả phỏng vấn tuyển dụng của bạn.
            </p>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm">
              {error}
            </div>
          )}

          {/* Danh sách */}
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="h-44 bg-slate-200 animate-pulse rounded-2xl" />
              ))}
            </div>
          ) : interviews.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
              <svg className="w-12 h-12 text-slate-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <h3 className="text-base font-semibold text-slate-800">Bạn chưa có lịch phỏng vấn nào</h3>
              <p className="text-sm text-slate-500 mt-1">
                Khi hồ sơ của bạn được duyệt qua vòng sàng lọc, nhà tuyển dụng sẽ gửi lịch phỏng vấn đến đây.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {interviews.map((item) => {
                const job = item.application?.jobPosting;
                const dateObj = new Date(item.scheduledAt);

                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-4">
                      <div>
                        <h2 className="text-lg font-bold text-slate-900">{job?.title || 'Vị trí tuyển dụng'}</h2>
                        <p className="text-xs text-slate-500">{job?.department || 'Phòng ban chuyên môn'}</p>
                      </div>
                      <div>{getStatusBadge(item.status)}</div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <div>
                          <div className="text-xs text-slate-400">Thời gian</div>
                          <div className="font-semibold text-slate-800">
                            {dateObj.toLocaleDateString('vi-VN')} lúc {dateObj.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} ({item.durationMinutes} phút)
                          </div>
                        </div>
                      </div>

                      {item.location && (
                        <div className="flex items-center gap-2">
                          <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <div>
                            <div className="text-xs text-slate-400">Địa điểm trực tiếp</div>
                            <div className="font-semibold text-slate-800">{item.location}</div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Link họp trực tuyến */}
                    {item.meetingUrl && item.status === 'SCHEDULED' && (
                      <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <svg className="w-6 h-6 text-blue-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          <div>
                            <div className="text-xs font-semibold text-blue-900">Phòng phỏng vấn trực tuyến</div>
                            <div className="text-xs text-blue-700 truncate max-w-sm">{item.meetingUrl}</div>
                          </div>
                        </div>
                        <a
                          href={item.meetingUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-all"
                        >
                          Tham gia ngay
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      </div>
                    )}

                    {/* Kết quả phỏng vấn nếu COMPLETED */}
                    {item.status === 'COMPLETED' && item.rating && (
                      <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-emerald-900 uppercase">Kết quả đánh giá:</span>
                          <span className="text-amber-500 font-bold">
                            {'★'.repeat(item.rating)}{'☆'.repeat(5 - item.rating)}
                          </span>
                        </div>
                        {item.feedback && (
                          <p className="text-xs text-emerald-800 italic">
                            "{item.feedback}"
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </RoleGuard>
  );
}
