'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  SubmitApplicationPayload,
  submitApplicationApi,
  CvInfo,
  getMyCvApi,
} from '@/lib/application-api';

interface ApplyModalProps {
  jobId: string;
  jobTitle: string;
  onClose: () => void;
  onSuccess: (applicationId: string) => void;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';
const ACCEPTED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const MAX_MB = 5;

export function ApplyModal({ jobId, jobTitle, onClose, onSuccess }: ApplyModalProps) {
  const [coverLetter, setCoverLetter] = useState('');
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [cvInfo, setCvInfo] = useState<CvInfo | null>(null);
  const [loadingCvInfo, setLoadingCvInfo] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getMyCvApi()
      .then(setCvInfo)
      .catch(() => setCvInfo({ hasCv: false }))
      .finally(() => setLoadingCvInfo(false));
  }, []);

  // Đóng modal khi nhấn Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) return 'Chỉ chấp nhận tệp PDF hoặc DOCX';
    if (file.size > MAX_MB * 1024 * 1024) return `Kích thước tệp vượt quá ${MAX_MB}MB`;
    return null;
  };

  const handleFileChange = (file: File) => {
    const err = validateFile(file);
    if (err) { setError(err); return; }
    setError(null);
    setCvFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileChange(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const usingExistingCv = cvInfo?.hasCv && !cvFile;
    if (!cvFile && !usingExistingCv) {
      setError('Vui lòng tải lên CV trước khi nộp đơn');
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const payload: SubmitApplicationPayload = {
        jobPostingId: jobId,
        coverLetter: coverLetter.trim() || undefined,
        cvFile: cvFile || undefined,
      };
      const result = await submitApplicationApi(payload);
      onSuccess(result.applicationId);
    } catch (e: any) {
      if (e.code === 'DUPLICATE_APPLICATION') {
        setError('Bạn đã nộp hồ sơ vào vị trí này rồi');
      } else if (e.code === 'JOB_NOT_AVAILABLE') {
        setError('Tin tuyển dụng này đã đóng hoặc không còn nhận đơn');
      } else {
        setError(e.message || 'Có lỗi xảy ra. Vui lòng thử lại');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      ref={backdropRef}
      onClick={(e) => { if (e.target === backdropRef.current) onClose(); }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-150"
    >
      <div className="w-full sm:max-w-xl bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl shadow-slate-900/20 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">Nộp đơn ứng tuyển</h2>
            <p className="text-sm text-slate-500 mt-0.5 truncate max-w-[320px]" title={jobTitle}>{jobTitle}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Đóng"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Nội dung form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* CV Section */}
          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-2">
              Tệp CV <span className="text-red-500">*</span>
            </label>

            {/* CV hiện tại */}
            {loadingCvInfo ? (
              <div className="h-14 bg-slate-100 animate-pulse rounded-xl" />
            ) : cvInfo?.hasCv && !cvFile ? (
              <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-xl mb-3">
                <div className="w-8 h-8 bg-white border border-blue-200 rounded-lg flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-blue-800 truncate">
                    {cvInfo.cvFileUrl?.split('/').pop()}
                  </p>
                  <p className="text-[10px] text-blue-600 mt-0.5">Sẽ dùng CV đang lưu trữ</p>
                </div>
                <a
                  href={`${API_BASE}${cvInfo.cvFileUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline shrink-0"
                >
                  Xem
                </a>
              </div>
            ) : cvFile ? (
              <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl mb-3">
                <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <p className="text-xs font-semibold text-emerald-800 flex-1 truncate">{cvFile.name}</p>
                <button
                  type="button"
                  onClick={() => setCvFile(null)}
                  className="text-[10px] text-red-500 hover:underline shrink-0"
                >
                  Bỏ chọn
                </button>
              </div>
            ) : null}

            {/* Upload zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all select-none ${
                dragOver ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:border-blue-300 hover:bg-blue-50/40'
              }`}
            >
              <svg className="w-7 h-7 text-slate-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <p className="text-sm text-slate-600 font-medium">
                {cvInfo?.hasCv ? 'Dùng CV khác' : 'Tải lên CV'}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">PDF / DOCX · Tối đa 5MB</p>
              <input
                ref={fileInputRef}
                id="apply-cv-input"
                type="file"
                className="hidden"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileChange(f); }}
              />
            </div>
          </div>

          {/* Thư xin việc */}
          <div>
            <label htmlFor="cover-letter" className="block text-sm font-semibold text-slate-800 mb-1.5">
              Thư xin việc <span className="text-slate-400 font-normal">(không bắt buộc)</span>
            </label>
            <textarea
              id="cover-letter"
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              rows={4}
              maxLength={2000}
              placeholder="Giới thiệu bản thân, động lực ứng tuyển, điểm mạnh phù hợp với vị trí..."
              className="w-full text-sm text-slate-900 placeholder:text-slate-400 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
            />
            <p className="text-xs text-slate-400 text-right mt-1">{coverLetter.length}/2000</p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              <svg className="w-4 h-4 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 bg-white">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            form="apply-form"
            type="submit"
            disabled={submitting || loadingCvInfo}
            onClick={handleSubmit}
            id="submit-application-btn"
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
          >
            {submitting ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Đang nộp đơn...
              </>
            ) : 'Nộp đơn ứng tuyển'}
          </button>
        </div>
      </div>
    </div>
  );
}
