'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { RoleGuard } from '@/components/auth/role-guard';
import { ApplicationStatusBadge } from '@/components/candidate/application-status-badge';
import {
  ApplicationStatus,
  HrApplicationDetail,
  getApplicationDetailForHrApi,
  updateApplicationStatusApi,
} from '@/lib/application-api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatSimpleDate(iso?: string | null) {
  if (!iso) return 'Chưa cập nhật';
  return new Date(iso).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function Section({ title, children, badge }: { title: string; children: React.ReactNode; badge?: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <h2 className="text-sm font-bold text-slate-900 tracking-tight">{title}</h2>
        {badge}
      </div>
      {children}
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">{label}</div>
      <div className="text-sm font-medium text-slate-800">{value || 'Chưa cập nhật'}</div>
    </div>
  );
}

function HrApplicationDetailContent({ id }: { id: string }) {
  const router = useRouter();
  const [detail, setDetail] = useState<HrApplicationDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<ApplicationStatus | ''>('');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const data = await getApplicationDetailForHrApi(id);
      setDetail(data);
      setSelectedStatus(data.status);
    } catch (err: any) {
      setMessage({ text: err.message || 'Không thể tải chi tiết hồ sơ', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleStatusUpdate = async () => {
    if (!selectedStatus || selectedStatus === detail?.status) return;
    if (!confirm(`Xác nhận đổi trạng thái hồ sơ của ứng viên thành "${selectedStatus}"?`)) return;

    setIsUpdating(true);
    setMessage(null);
    try {
      await updateApplicationStatusApi(id, selectedStatus);
      setMessage({ text: 'Cập nhật trạng thái hồ sơ thành công!', type: 'success' });
      await fetchDetail();
    } catch (err: any) {
      setMessage({ text: err.message || 'Cập nhật trạng thái thất bại', type: 'error' });
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold text-slate-500 mt-4">Đang tải chi tiết hồ sơ ứng viên...</p>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-lg mx-auto">
        <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-100">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-slate-900">Không tìm thấy hồ sơ</h3>
        <p className="text-xs text-slate-500 mt-1 mb-6">
          {message?.text || 'Đơn ứng tuyển không tồn tại hoặc đã bị xóa.'}
        </p>
        <Link
          href="/hr/applications"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors"
        >
          Quay lại danh sách
        </Link>
      </div>
    );
  }

  const { candidate, jobPosting, aiMatchScore, parsedSkills, aiAnalysisSummary } = detail;

  return (
    <div className="space-y-6">
      {/* Thông báo cập nhật */}
      {message && (
        <div
          className={`p-4 rounded-xl text-sm font-medium border flex items-center justify-between ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <span>{message.text}</span>
          <button type="button" onClick={() => setMessage(null)} className="text-xs underline hover:opacity-80">
            Đóng
          </button>
        </div>
      )}

      {/* Profile Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start sm:items-center gap-4">
          {candidate.avatarUrl ? (
            <img
              src={candidate.avatarUrl}
              alt={candidate.fullName}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border border-slate-200 shadow-sm shrink-0"
            />
          ) : (
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-indigo-600 text-white font-extrabold text-2xl flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
              {candidate.fullName.charAt(0) || 'U'}
            </div>
          )}

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                {candidate.fullName}
              </h1>
              <ApplicationStatusBadge status={detail.status} />
            </div>

            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              Ứng tuyển vị trí:{' '}
              <span className="font-semibold text-slate-800">{jobPosting?.title}</span>
              {jobPosting?.department && (
                <span className="text-slate-400"> ({jobPosting.department})</span>
              )}
            </p>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-2 font-mono">
              <span className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                {candidate.email}
              </span>
              {candidate.phone && (
                <span className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  {candidate.phone}
                </span>
              )}
              <span className="text-slate-400">
                Nộp ngày: {formatDate(detail.appliedAt)}
              </span>
            </div>
          </div>
        </div>

        {/* Nút xem CV nhanh */}
        {detail.cvFileUrl && (
          <a
            href={`${API_BASE}${detail.cvFileUrl}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Tải / Xem File CV Gốc
          </a>
        )}
      </div>

      {/* Điều khiển Trạng Thái (HR Workflow Status Control) */}
      <div className="bg-slate-900 text-white rounded-2xl shadow-xl p-6 sm:p-7">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-blue-400">
              Quy trình Xét duyệt & Tuyển dụng (HR Actions)
            </div>
            <h3 className="text-base sm:text-lg font-extrabold mt-1">
              Cập nhật trạng thái vòng ứng tuyển
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-lg">
              Chuyển trạng thái ứng viên để đồng bộ dữ liệu với bộ phận phỏng vấn và gửi thông báo hệ thống.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as ApplicationStatus)}
              className="px-3.5 py-2.5 bg-slate-800 border border-slate-700 text-white text-xs font-semibold rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="SCREENING">Đang sàng lọc (SCREENING)</option>
              <option value="SHORTLISTED">Vào danh sách phỏng vấn (SHORTLISTED)</option>
              <option value="INTERVIEWED">Đã hoàn thành phỏng vấn (INTERVIEWED)</option>
              <option value="OFFERED">Gửi thư mời nhận việc (OFFERED)</option>
              <option value="HIRED">Tuyển dụng chính thức (HIRED)</option>
              <option value="REJECTED">Không phù hợp (REJECTED)</option>
            </select>

            <button
              type="button"
              disabled={isUpdating || selectedStatus === detail.status}
              onClick={handleStatusUpdate}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-blue-500/20 transition-all"
            >
              {isUpdating ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Đang lưu...
                </>
              ) : (
                'Cập nhật trạng thái'
              )}
            </button>

            {detail.status !== 'REJECTED' && detail.status !== 'WITHDRAWN' && detail.status !== 'HIRED' && (
              <Link
                href={`/hr/interviews?applicationId=${detail.id}`}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-500/20 transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Lên lịch phỏng vấn
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CỘT TRÁI (2/3): AI Analysis + Cover letter + JD Requirements */}
        <div className="lg:col-span-2 space-y-6">
          {/* Khối AI Evaluation */}
          <Section
            title="Đánh giá & Khớp nối thông minh qua AI"
            badge={
              aiMatchScore !== null && aiMatchScore !== undefined ? (
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  Semantic Matching Đã Xong
                </span>
              ) : (
                <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                  Chờ xử lý AI
                </span>
              )
            }
          >
            {aiMatchScore !== null && aiMatchScore !== undefined ? (
              <div className="space-y-5">
                {/* Score bar */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-700">Điểm số tương đồng với JD (Match Score):</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        aiMatchScore >= 80
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                          : aiMatchScore >= 50
                          ? "bg-blue-100 text-blue-800 border border-blue-200"
                          : "bg-rose-100 text-rose-800 border border-rose-200"
                      }`}>
                        {aiMatchScore >= 80 ? "Phù hợp xuất sắc" : aiMatchScore >= 50 ? "Phù hợp cơ bản" : "Lệch chuyên môn / Chưa đạt"}
                      </span>
                      <span className={`text-base font-extrabold font-mono ${
                        aiMatchScore >= 80 ? "text-emerald-600" : aiMatchScore >= 50 ? "text-blue-600" : "text-rose-600"
                      }`}>
                        {aiMatchScore.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 bg-gradient-to-r ${
                        aiMatchScore >= 80
                          ? "from-emerald-500 to-teal-600"
                          : aiMatchScore >= 50
                          ? "from-blue-500 to-indigo-600"
                          : "from-rose-500 to-red-600"
                      }`}
                      style={{ width: `${Math.min(100, Math.max(0, aiMatchScore))}%` }}
                    />
                  </div>
                </div>

                {/* AI Summary */}
                {aiAnalysisSummary && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                      Nhận xét tóm tắt từ mô hình AI (Hybrid Scoring v2):
                    </h4>
                    <div className={`text-xs leading-relaxed p-4 rounded-xl border ${
                      aiMatchScore < 50
                        ? "bg-rose-50/60 border-rose-200 text-rose-900"
                        : "bg-indigo-50/50 border-indigo-100 text-slate-700"
                    }`}>
                      {aiAnalysisSummary.includes("Lưu ý cho HR:") && (
                        <div className="mb-3 pb-3 border-b border-rose-200/60 flex items-start gap-2 text-rose-800 font-medium">
                          <span className="text-sm">⚠️</span>
                          <div>
                            <span className="font-bold">Cảnh báo tuyển dụng: </span>
                            {aiAnalysisSummary.split("Lưu ý cho HR:")[1]?.split("Đề xuất:")[0]?.trim()}
                          </div>
                        </div>
                      )}
                      <p>{aiAnalysisSummary}</p>
                    </div>
                  </div>
                )}

                {/* Parsed skills */}
                {parsedSkills && parsedSkills.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                      Kỹ năng trích xuất & đối sánh:
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {parsedSkills.map((skill, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 border border-blue-200"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic py-4">
                Hồ sơ đang chờ luồng phân tích nền của AI Microservice. Khi hoàn tất, điểm số và kỹ năng sẽ tự động hiển thị tại đây.
              </p>
            )}
          </Section>

          {/* Khối Thư xin việc (Cover letter) */}
          <Section title="Thư xin việc (Cover Letter)">
            {detail.coverLetter ? (
              <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-4 text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                {detail.coverLetter}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">Ứng viên không đính kèm thư giới thiệu.</p>
            )}
          </Section>

          {/* Lịch sử Phỏng vấn (Interviews) */}
          <Section title="Lịch trình Phỏng vấn & Đánh giá">
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
                      <span className="font-semibold text-[10px] px-2 py-0.5 rounded bg-indigo-100 text-indigo-700">
                        {iv.status}
                      </span>
                    </div>

                    <div className="text-slate-600">
                      Người phỏng vấn: {iv.interviewer.firstName} {iv.interviewer.lastName} ({iv.interviewer.email})
                    </div>

                    {iv.meetingUrl && (
                      <div>
                        Link họp:{' '}
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
              <p className="text-xs text-slate-400 italic">Chưa có lịch phỏng vấn nào được thiết lập cho đơn này.</p>
            )}
          </Section>
        </div>

        {/* CỘT PHẢI (1/3): Chi tiết ứng viên & File CV */}
        <div className="space-y-6">
          {/* Chi tiết ứng viên */}
          <Section title="Thông tin cá nhân & Chuyên môn">
            <div className="space-y-4">
              <InfoItem label="Họ và tên" value={candidate.fullName} />
              <InfoItem label="Email" value={candidate.email} />
              <InfoItem label="Số điện thoại" value={candidate.phone} />
              <InfoItem label="Ngày sinh" value={formatSimpleDate(candidate.dateOfBirth)} />
              <InfoItem label="Địa chỉ" value={candidate.address} />
              <InfoItem
                label="Kinh nghiệm"
                value={
                  candidate.experienceYears !== null && candidate.experienceYears !== undefined
                    ? `${candidate.experienceYears} năm kinh nghiệm`
                    : null
                }
              />
              <InfoItem label="Học vấn / Bằng cấp" value={candidate.education} />
              <InfoItem label="Ngày tạo tài khoản" value={formatSimpleDate(candidate.joinedAt)} />
              {candidate.summary && (
                <div className="pt-2 border-t border-slate-100">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Tóm tắt bản thân
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{candidate.summary}</p>
                </div>
              )}
            </div>
          </Section>

          {/* Tệp CV đính kèm */}
          <Section title="Tệp CV lưu trữ">
            {detail.cvFileUrl ? (
              <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/60 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 truncate">
                      {detail.cvFileUrl.split('/').pop()}
                    </div>
                    <div className="text-[10px] text-blue-700">Định dạng PDF/DOCX</div>
                  </div>
                </div>

                <a
                  href={`${API_BASE}${detail.cvFileUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-center w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
                >
                  Mở tệp CV trong tab mới ↗
                </a>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">Không có tệp CV nào được liên kết.</p>
            )}
          </Section>

          {/* Vị trí tuyển dụng (JD) */}
          <Section title="Vị trí tuyển dụng ứng tuyển">
            <div className="space-y-3">
              <InfoItem label="Tiêu đề Job" value={jobPosting?.title} />
              <InfoItem label="Phòng ban" value={jobPosting?.department} />
              <InfoItem label="Địa điểm làm việc" value={jobPosting?.location} />
              <InfoItem label="Hình thức làm việc" value={jobPosting?.employmentType} />
              {jobPosting?.requirements && (
                <div className="pt-2 border-t border-slate-100">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Yêu cầu tuyển dụng
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                    {jobPosting.requirements}
                  </p>
                </div>
              )}
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

function DetailParamsWrapper() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : '';
  return <HrApplicationDetailContent id={id} />;
}

export default function HrApplicationDetailPage() {
  return (
    <RoleGuard allowedRoles={['HR', 'ADMIN']}>
      <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Breadcrumbs */}
          <nav className="text-xs text-slate-500 flex items-center gap-2">
            <Link href="/" className="hover:text-slate-800 transition-colors">
              Trang chủ
            </Link>
            <span>/</span>
            <Link href="/hr/applications" className="hover:text-slate-800 transition-colors">
              Quản lý Ứng viên
            </Link>
            <span>/</span>
            <span className="font-semibold text-slate-900">Chi tiết hồ sơ</span>
          </nav>

          <React.Suspense
            fallback={
              <div className="space-y-6 animate-pulse">
                <div className="h-28 bg-white rounded-2xl border border-slate-200" />
                <div className="h-64 bg-white rounded-2xl border border-slate-200" />
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
