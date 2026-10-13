'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
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

function HrInterviewsContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const urlApplicationId = searchParams.get('applicationId');

  const [interviews, setInterviews] = useState<InterviewItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

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
    notes: ''
  });
  const [formErrors, setFormErrors] = useState<{
    applicationId?: string;
    scheduledAt?: string;
    durationMinutes?: string;
  }>({});

  const [feedbackForm, setFeedbackForm] = useState({
    rating: 5,
    feedback: '',
    notes: ''
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
              education: detail.candidate.education
            }
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
        body: JSON.stringify(scheduleForm)
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
          notes: ''
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
          status: 'COMPLETED'
        })
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
          notes: cancelReason || undefined
        })
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

  const getStatusBadge = (status: InterviewItem['status']) => {
    switch (status) {
      case 'SCHEDULED':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-200">Đã lên lịch</span>;
      case 'COMPLETED':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Hoàn thành</span>;
      case 'CANCELLED':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-50 text-rose-700 border border-rose-200">Đã hủy</span>;
      case 'NO_SHOW':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-200">Không đến</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Tiêu đề & Nút thêm mới */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Quản lý Lịch phỏng vấn</h1>
          <p className="text-xs text-slate-500 mt-1">
            Điều phối các phiên phỏng vấn, liên kết Google Meet/Zoom và đánh giá ứng viên.
          </p>
        </div>
        <div className="flex items-center gap-3">
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
                notes: ''
              });
              setFormErrors({});
              setShowScheduleModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-xl shadow-xs shadow-blue-500/20 transition-all cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Lên lịch phỏng vấn mới
          </button>
        </div>
      </div>

      {/* Thông báo Alert */}
      {actionSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex justify-between items-center">
          <span>{actionSuccess}</span>
          <button type="button" onClick={() => setActionSuccess(null)} className="text-emerald-600 hover:text-emerald-900 font-bold">×</button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex justify-between items-center">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} className="text-rose-600 hover:text-rose-900 font-bold">×</button>
        </div>
      )}

      {/* Bộ lọc trạng thái */}
      <div className="flex gap-2 overflow-x-auto pb-2 border-b border-slate-200">
        {[
          { label: 'Tất cả', value: 'ALL' },
          { label: 'Đã lên lịch', value: 'SCHEDULED' },
          { label: 'Hoàn thành', value: 'COMPLETED' },
          { label: 'Đã hủy', value: 'CANCELLED' },
          { label: 'Không tham gia', value: 'NO_SHOW' }
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all whitespace-nowrap ${
              statusFilter === tab.value
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Danh sách lịch phỏng vấn */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-slate-200 border-t-blue-600"></div>
            <p className="mt-2 text-xs text-slate-500">Đang tải lịch phỏng vấn...</p>
          </div>
        ) : interviews.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
            <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="mt-2 text-sm font-semibold text-slate-700">Chưa có lịch phỏng vấn nào</p>
            <p className="text-xs text-slate-400 mt-1">Bấm &quot;Lên lịch phỏng vấn mới&quot; để thiết lập lịch cho ứng viên.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {interviews.map((item) => {
              const candUser = item.application?.candidateProfile?.user;
              const job = item.application?.jobPosting;
              const dateObj = new Date(item.scheduledAt);

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="min-w-0 pr-2">
                        <h3 className="text-sm font-bold text-slate-900 truncate">
                          {candUser ? `${candUser.firstName} ${candUser.lastName}` : 'Ứng viên chưa rõ'}
                        </h3>
                        <p className="text-xs text-slate-500 truncate">{candUser?.email}</p>
                      </div>
                      {getStatusBadge(item.status)}
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 border border-slate-100">
                      <div className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <span className="truncate">{job?.title || 'Vị trí chưa rõ'}</span>
                      </div>
                      <div className="text-xs text-slate-600 flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>
                          {dateObj.toLocaleDateString('vi-VN')} {dateObj.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} ({item.durationMinutes}p)
                        </span>
                      </div>
                    </div>

                    {item.meetingUrl && (
                      <div className="flex items-center gap-1.5 text-xs text-blue-600 overflow-hidden">
                        <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        <a href={item.meetingUrl} target="_blank" rel="noreferrer" className="truncate hover:underline">
                          {item.meetingUrl}
                        </a>
                      </div>
                    )}

                    {item.location && (
                      <div className="text-xs text-slate-500 flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 shrink-0 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        </svg>
                        <span className="truncate">{item.location}</span>
                      </div>
                    )}

                    {item.rating && (
                      <div className="p-2 bg-emerald-50 rounded-lg text-xs text-emerald-800 border border-emerald-100 flex items-center justify-between">
                        <span>Đánh giá: <strong>{item.rating}/5 ⭐</strong></span>
                        <span className="truncate max-w-[150px] italic">{item.feedback}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                    {item.status === 'SCHEDULED' && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedInterview(item);
                            setFeedbackForm({ rating: 5, feedback: '', notes: item.notes || '' });
                            setShowFeedbackModal(true);
                          }}
                          className="px-3 py-1.5 text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg transition-colors"
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
                          className="px-3 py-1.5 text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg transition-colors"
                        >
                          Hủy lịch
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: Lên lịch phỏng vấn */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Lên lịch phỏng vấn ứng viên</h2>
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
                    className={`w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                      formErrors.scheduledAt ? 'border-rose-300 bg-rose-50/30' : 'border-slate-300'
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
                    className={`w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                      formErrors.durationMinutes ? 'border-rose-300 bg-rose-50/30' : 'border-slate-300'
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
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
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
                  className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs disabled:opacity-50 transition-colors cursor-pointer"
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
            <h2 className="text-lg font-bold text-slate-900 mb-1">Đánh giá kết quả phỏng vấn</h2>
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
                      className={`px-3.5 py-1.5 text-sm font-bold rounded-xl border transition-all ${
                        feedbackForm.rating >= star
                          ? 'bg-amber-500 border-amber-600 text-white shadow-xs'
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
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Ghi chú nội bộ</label>
                <input
                  type="text"
                  placeholder="Gợi ý mức lương hoặc lưu ý cho vòng tiếp theo..."
                  value={feedbackForm.notes}
                  onChange={(e) => setFeedbackForm({ ...feedbackForm, notes: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowFeedbackModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm disabled:opacity-50"
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
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Không
              </button>
              <button
                type="button"
                onClick={handleCancelInterview}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-sm disabled:opacity-50"
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
      <Suspense fallback={
        <div className="max-w-7xl mx-auto px-4 py-12 text-center text-xs text-slate-500">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-slate-200 border-t-blue-600"></div>
          <p className="mt-2">Đang tải trang quản lý phỏng vấn...</p>
        </div>
      }>
        <HrInterviewsContent />
      </Suspense>
    </RoleGuard>
  );
}
