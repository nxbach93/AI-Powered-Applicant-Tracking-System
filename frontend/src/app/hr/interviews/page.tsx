'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiRequest } from '@/lib/api';
import { RoleGuard } from '@/components/auth/role-guard';

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

export default function HrInterviewsPage() {
  const { user } = useAuth();
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
  const [scheduleForm, setScheduleForm] = useState({
    applicationId: '',
    scheduledAt: '',
    durationMinutes: 60,
    location: '',
    meetingUrl: '',
    notes: ''
  });
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

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
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
        fetchInterviews();
      } else {
        setError(res.error?.message || 'Tạo lịch phỏng vấn thất bại');
      }
    } catch {
      setError('Lỗi khi gửi yêu cầu tạo lịch');
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
    try {
      const res = await apiRequest(`/interviews/${selectedInterview.id}/cancel`, {
        method: 'PATCH',
        body: JSON.stringify({ reason: cancelReason })
      });
      if (res.success) {
        setActionSuccess('Đã hủy lịch phỏng vấn');
        setShowCancelModal(false);
        fetchInterviews();
      } else {
        setError(res.error?.message || 'Không thể hủy lịch phỏng vấn');
      }
    } catch {
      setError('Lỗi kết nối khi hủy lịch');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 border border-blue-200">Đã xếp lịch</span>;
      case 'COMPLETED':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">Hoàn thành</span>;
      case 'CANCELLED':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-100 text-rose-800 border border-rose-200">Đã hủy</span>;
      case 'NO_SHOW':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 border border-amber-200">Vắng mặt</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-800">{status}</span>;
    }
  };

  return (
    <RoleGuard allowedRoles={['HR', 'ADMIN']}>
      <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Quản lý Lịch phỏng vấn & Kết quả</h1>
              <p className="text-sm text-slate-500 mt-1">
                Theo dõi tiến trình phỏng vấn ứng viên, xếp lịch và ghi nhận đánh giá của hội đồng tuyển dụng.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowScheduleModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-xl shadow-sm shadow-blue-500/20 transition-all cursor-pointer"
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
          <div className="flex flex-wrap items-center gap-2 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mr-2">Lọc trạng thái:</span>
            {['ALL', 'SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  statusFilter === st
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st === 'ALL' ? 'Tất cả' : st === 'SCHEDULED' ? 'Đã xếp lịch' : st === 'COMPLETED' ? 'Hoàn thành' : st === 'CANCELLED' ? 'Đã hủy' : 'Vắng mặt'}
              </button>
            ))}
          </div>

          {/* Danh sách thẻ Phỏng vấn */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-64 bg-slate-200 animate-pulse rounded-2xl" />
              ))}
            </div>
          ) : interviews.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
              <svg className="w-12 h-12 text-slate-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <h3 className="text-base font-semibold text-slate-800">Chưa có lịch phỏng vấn nào</h3>
              <p className="text-sm text-slate-500 mt-1">Bấm nút "Lên lịch phỏng vấn mới" ở trên để xếp lịch cho ứng viên.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {interviews.map((item) => {
                const candidate = item.application?.candidateProfile?.user;
                const job = item.application?.jobPosting;
                const dateObj = new Date(item.scheduledAt);

                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Status & Date */}
                      <div className="flex items-center justify-between mb-3">
                        {getStatusBadge(item.status)}
                        <span className="text-xs font-medium text-slate-500">
                          {dateObj.toLocaleDateString('vi-VN')} {dateObj.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {/* Candidate info */}
                      <div className="mb-4">
                        <h3 className="text-base font-bold text-slate-900">
                          {candidate ? `${candidate.firstName} ${candidate.lastName}` : 'Ứng viên'}
                        </h3>
                        <p className="text-xs text-slate-500">{candidate?.email || 'Chưa có email'}</p>
                        <div className="mt-2 text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md inline-block">
                          {job?.title || 'Vị trí tuyển dụng'}
                        </div>
                      </div>

                      {/* Meeting details */}
                      <div className="space-y-1.5 text-xs text-slate-600 border-t border-slate-100 pt-3 mb-4">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-700">Thời lượng:</span>
                          <span>{item.durationMinutes} phút</span>
                        </div>
                        {item.location && (
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-700">Địa điểm:</span>
                            <span>{item.location}</span>
                          </div>
                        )}
                        {item.meetingUrl && (
                          <div className="flex items-center gap-2 truncate">
                            <span className="font-semibold text-slate-700">Link họp:</span>
                            <a
                              href={item.meetingUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-600 underline truncate hover:text-blue-800"
                            >
                              {item.meetingUrl}
                            </a>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-700">Người PV:</span>
                          <span>{item.interviewer?.firstName} {item.interviewer?.lastName}</span>
                        </div>

                        {/* Rating & Feedback nếu có */}
                        {item.rating && (
                          <div className="mt-2 pt-2 border-t border-slate-100 bg-emerald-50/50 p-2 rounded-lg">
                            <div className="flex items-center gap-1 text-amber-500 font-bold">
                              {'★'.repeat(item.rating)}{'☆'.repeat(5 - item.rating)}
                              <span className="text-xs text-slate-700 ml-1">({item.rating}/5 sao)</span>
                            </div>
                            {item.feedback && (
                              <p className="text-xs text-slate-700 italic mt-1 line-clamp-2">
                                "{item.feedback}"
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                      {item.status === 'SCHEDULED' && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedInterview(item);
                              setShowFeedbackModal(true);
                            }}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all cursor-pointer"
                          >
                            Đánh giá kết quả
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedInterview(item);
                              setShowCancelModal(true);
                            }}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-lg text-xs font-semibold transition-all cursor-pointer"
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
            <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-xl border border-slate-200">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Lên lịch phỏng vấn ứng viên</h2>
              <form onSubmit={handleCreateSchedule} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ID Đơn ứng tuyển (Application ID) *</label>
                  <input
                    type="text"
                    required
                    placeholder="Nhập ID đơn ứng tuyển..."
                    value={scheduleForm.applicationId}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, applicationId: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">ID đơn ứng tuyển từ danh sách ứng viên (TV3).</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Thời gian phỏng vấn *</label>
                    <input
                      type="datetime-local"
                      required
                      value={scheduleForm.scheduledAt}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, scheduledAt: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Thời lượng (phút)</label>
                    <input
                      type="number"
                      min={15}
                      max={480}
                      value={scheduleForm.durationMinutes}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, durationMinutes: Number(e.target.value) })}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Link họp trực tuyến (Google Meet / Zoom)</label>
                  <input
                    type="url"
                    placeholder="https://meet.google.com/..."
                    value={scheduleForm.meetingUrl}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, meetingUrl: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Địa điểm phỏng vấn trực tiếp (nếu có)</label>
                  <input
                    type="text"
                    placeholder="Phòng họp 302, Tòa nhà A..."
                    value={scheduleForm.location}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, location: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Ghi chú phỏng vấn</label>
                  <textarea
                    rows={2}
                    placeholder="Nội dung cần tập trung trao đổi..."
                    value={scheduleForm.notes}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, notes: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowScheduleModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm disabled:opacity-50"
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
                Ứng viên: {selectedInterview.application?.candidateProfile?.user?.firstName} {selectedInterview.application?.candidateProfile?.user?.lastName}
              </p>

              <form onSubmit={handleFeedbackSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">Điểm đánh giá (Rating: 1 - 5 sao) *</label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setFeedbackForm({ ...feedbackForm, rating: star })}
                        className={`text-2xl transition-transform hover:scale-110 cursor-pointer ${
                          star <= feedbackForm.rating ? 'text-amber-500' : 'text-slate-300'
                        }`}
                      >
                        ★
                      </button>
                    ))}
                    <span className="text-sm font-bold text-slate-700 ml-2">{feedbackForm.rating}/5 sao</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nhận xét chi tiết (Feedback) *</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Nhận xét về năng lực chuyên môn, thái độ, tư duy phản biện..."
                    value={feedbackForm.feedback}
                    onChange={(e) => setFeedbackForm({ ...feedbackForm, feedback: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Ghi chú nội bộ bổ sung (Tùy chọn)</label>
                  <textarea
                    rows={2}
                    placeholder="Mức lương kỳ vọng, thời gian có thể onboard..."
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
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm disabled:opacity-50"
                  >
                    {isSubmitting ? 'Đang lưu...' : 'Lưu đánh giá'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Hủy lịch phỏng vấn */}
        {showCancelModal && selectedInterview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl border border-slate-200">
              <h2 className="text-lg font-bold text-slate-900 mb-2">Hủy lịch phỏng vấn</h2>
              <p className="text-xs text-slate-500 mb-4">
                Bạn có chắc chắn muốn hủy buổi phỏng vấn này không? Hành động này sẽ chuyển trạng thái lịch sang CANCELLED.
              </p>

              <div className="mb-4">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Lý do hủy lịch</label>
                <textarea
                  rows={2}
                  placeholder="Ứng viên bận việc đột xuất, đổi lịch..."
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
    </RoleGuard>
  );
}
