'use client';

import React, { useRef, useState } from 'react';
import { CvInfo, uploadCvApi, deleteCvApi } from '@/lib/application-api';

interface CvUploadCardProps {
  cvInfo: CvInfo | null;
  onUploadSuccess: (newCvInfo: CvInfo) => void;
  onDeleteSuccess: () => void;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';

export function CvUploadCard({ cvInfo, onUploadSuccess, onDeleteSuccess }: CvUploadCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const ACCEPTED_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  const MAX_SIZE_MB = 5;

  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return 'Chỉ chấp nhận tệp định dạng PDF hoặc DOCX';
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return `Kích thước tệp vượt quá giới hạn ${MAX_SIZE_MB}MB`;
    }
    return null;
  };

  const handleFile = async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setSuccessMsg(null);
    setIsUploading(true);
    try {
      const result = await uploadCvApi(file);
      setSuccessMsg('Tải lên CV thành công!');
      onUploadSuccess({ hasCv: true, cvFileUrl: result.cvFileUrl, updatedAt: result.uploadedAt });
    } catch (e: any) {
      setError(e.message || 'Có lỗi xảy ra khi tải lên tệp CV');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleDelete = async () => {
    if (!confirm('Bạn có chắc chắn muốn xóa tệp CV hiện tại không?')) return;
    setIsDeleting(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await deleteCvApi();
      setSuccessMsg('Đã xóa CV thành công');
      onDeleteSuccess();
    } catch (e: any) {
      setError(e.message || 'Không thể xóa CV');
    } finally {
      setIsDeleting(false);
    }
  };

  const cvFileName = cvInfo?.cvFileUrl ? cvInfo.cvFileUrl.split('/').pop() : null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm shadow-slate-100 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
        <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center border border-blue-100">
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Hồ sơ CV của bạn</h3>
          <p className="text-xs text-slate-500">Hỗ trợ PDF, DOCX · Tối đa 5MB</p>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {/* Alert khu vực */}
        {error && (
          <div className="flex items-start gap-2.5 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            <svg className="w-4 h-4 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="flex items-center gap-2.5 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700">
            <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>{successMsg}</span>
          </div>
        )}

        {/* CV hiện tại */}
        {cvInfo?.hasCv && cvFileName ? (
          <div className="flex items-center gap-3 p-3.5 bg-blue-50/60 border border-blue-200/70 rounded-xl">
            <div className="w-10 h-10 bg-white border border-blue-200 rounded-lg flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">{cvFileName}</p>
              {cvInfo.updatedAt && (
                <p className="text-xs text-slate-500 mt-0.5">
                  Cập nhật: {new Date(cvInfo.updatedAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href={`${API_BASE}${cvInfo.cvFileUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-blue-700 bg-white hover:bg-blue-100 border border-blue-200 transition-colors"
                title="Xem CV"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Xem
              </a>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-600 bg-white hover:bg-red-50 border border-red-200 transition-colors disabled:opacity-50"
                title="Xóa CV"
              >
                {isDeleting ? (
                  <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                )}
                Xóa
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-2">
            <p className="text-xs text-slate-500">Bạn chưa tải lên CV nào. Hãy thêm CV để ứng tuyển nhanh hơn.</p>
          </div>
        )}

        {/* Khu vực kéo thả / chọn file */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all select-none ${
            dragOver
              ? 'border-blue-400 bg-blue-50'
              : 'border-slate-200 hover:border-blue-300 hover:bg-blue-50/40'
          } ${isUploading ? 'cursor-not-allowed opacity-60' : ''}`}
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-2">
              <svg className="animate-spin w-7 h-7 text-blue-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-sm text-slate-600 font-medium">Đang tải lên...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center mx-auto">
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700">
                  {cvInfo?.hasCv ? 'Thay thế CV' : 'Tải lên CV'}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">Kéo thả hoặc nhấn để chọn tệp PDF/DOCX</p>
              </div>
            </div>
          )}
          <input
            ref={fileInputRef}
            id="cv-file-input"
            type="file"
            className="hidden"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={handleInputChange}
            disabled={isUploading}
          />
        </div>
      </div>
    </div>
  );
}
