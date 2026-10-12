'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { CreateJobDto, JobPosting, JobStatus, EmploymentType } from '@/types/job';

interface JobFormProps {
  initialData?: Partial<JobPosting>;
  isEdit?: boolean;
  onSubmit: (data: CreateJobDto) => Promise<{ success: boolean; error?: string }>;
}

export function JobForm({ initialData, isEdit = false, onSubmit }: JobFormProps) {
  // Chuẩn hóa ngày deadline về định dạng YYYY-MM-DD cho input type="date"
  const getInitialDateStr = (dateVal?: string | null) => {
    if (!dateVal) return '';
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return '';
      return d.toISOString().split('T')[0];
    } catch {
      return '';
    }
  };

  const [formData, setFormData] = useState<CreateJobDto>({
    title: initialData?.title || '',
    department: initialData?.department || 'Kỹ thuật Công nghệ',
    location: initialData?.location || 'Hà Nội',
    employmentType: initialData?.employmentType || 'FULL_TIME',
    description: initialData?.description || '',
    requirements: initialData?.requirements || '',
    salaryMin: initialData?.salaryMin !== null && initialData?.salaryMin !== undefined ? Number(initialData.salaryMin) : undefined,
    salaryMax: initialData?.salaryMax !== null && initialData?.salaryMax !== undefined ? Number(initialData.salaryMax) : undefined,
    status: initialData?.status || 'DRAFT',
    applicationDeadline: getInitialDateStr(initialData?.applicationDeadline),
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Validate form client-side
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Tiêu đề tin tuyển dụng không được để trống';
    } else if (formData.title.trim().length < 3) {
      newErrors.title = 'Tiêu đề tin tuyển dụng phải có ít nhất 3 ký tự';
    } else if (formData.title.trim().length > 200) {
      newErrors.title = 'Tiêu đề không được vượt quá 200 ký tự';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Mô tả công việc không được để trống';
    } else if (formData.description.trim().length < 10) {
      newErrors.description = 'Mô tả công việc phải có ít nhất 10 ký tự';
    }

    const min = formData.salaryMin !== undefined && formData.salaryMin !== null ? Number(formData.salaryMin) : null;
    const max = formData.salaryMax !== undefined && formData.salaryMax !== null ? Number(formData.salaryMax) : null;

    if (min !== null && (isNaN(min) || min < 0)) {
      newErrors.salaryMin = 'Mức lương tối thiểu không được là số âm';
    }

    if (max !== null && (isNaN(max) || max < 0)) {
      newErrors.salaryMax = 'Mức lương tối đa không được là số âm';
    }

    if (min !== null && max !== null && min > max) {
      newErrors.salaryMin = 'Lương tối thiểu không được lớn hơn lương tối đa';
    }

    // Kiểm tra hạn nộp hồ sơ không được ở quá khứ
    if (formData.applicationDeadline) {
      const selectedDate = new Date(`${formData.applicationDeadline}T23:59:59`);
      const now = new Date();
      if (selectedDate.getTime() < now.getTime()) {
        newErrors.applicationDeadline = 'Hạn chót nộp hồ sơ không được nằm trong quá khứ';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: CreateJobDto = {
        ...formData,
        salaryMin: formData.salaryMin !== undefined && formData.salaryMin !== null ? Number(formData.salaryMin) : null,
        salaryMax: formData.salaryMax !== undefined && formData.salaryMax !== null ? Number(formData.salaryMax) : null,
        applicationDeadline: formData.applicationDeadline ? new Date(formData.applicationDeadline).toISOString() : null,
      };

      const res = await onSubmit(payload);
      if (!res.success) {
        setSubmitError(res.error || 'Đã xảy ra lỗi khi lưu thông tin tuyển dụng');
      }
    } catch (err: any) {
      setSubmitError(err.message || 'Lỗi kết nối khi gửi dữ liệu');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format hiển thị số tiền gợi ý trực quan
  const formatMoneyHint = (val?: number | null) => {
    if (val === undefined || val === null || isNaN(val) || val <= 0) return null;
    if (val >= 1_000_000) {
      const m = val / 1_000_000;
      return `~ ${Number.isInteger(m) ? m : m.toFixed(1)} triệu VNĐ`;
    }
    return `~ ${val.toLocaleString('vi-VN')} VNĐ`;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-4xl mx-auto">
      {/* Banner lỗi chung từ server nếu có */}
      {submitError && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-start gap-3">
          <svg className="w-5 h-5 text-red-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <strong className="font-semibold block mb-0.5">Không thể lưu tin tuyển dụng</strong>
            <span>{submitError}</span>
          </div>
        </div>
      )}

      {/* KHỐI 1: THÔNG TIN CƠ BẢN */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
        <div className="border-b border-slate-100 pb-4">
          <h2 className="text-lg font-bold text-slate-900">1. Thông tin vị trí tuyển dụng</h2>
          <p className="text-xs text-slate-500 mt-1">Các thông tin cơ bản giúp ứng viên tìm kiếm và nhận diện công việc</p>
        </div>

        {/* Tiêu đề vị trí */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-2">
            Tiêu đề công việc <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Ví dụ: Senior Frontend Developer (React / Next.js)"
            className={`w-full px-4 py-3 rounded-xl border text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 transition-all ${
              errors.title
                ? 'border-red-300 focus:ring-red-400 bg-red-50/20'
                : 'border-slate-200 focus:ring-blue-500 bg-slate-50/40 focus:bg-white'
            }`}
          />
          {errors.title && <p className="text-xs text-red-600 mt-1.5">{errors.title}</p>}
        </div>

        {/* 3 Cột: Phòng ban, Địa điểm, Hình thức */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">Phòng ban</label>
            <select
              value={formData.department || ''}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/40 text-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            >
              <option value="Kỹ thuật Công nghệ">Kỹ thuật Công nghệ</option>
              <option value="Phát triển Phần mềm">Phát triển Phần mềm</option>
              <option value="AI Research Lab">AI Research Lab</option>
              <option value="Sản phẩm & Thiết kế">Sản phẩm & Thiết kế</option>
              <option value="Marketing & Truyền thông">Marketing & Truyền thông</option>
              <option value="Nhân sự & Vận hành">Nhân sự & Vận hành</option>
              <option value="Kinh doanh">Kinh doanh</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">Địa điểm làm việc</label>
            <input
              type="text"
              value={formData.location || ''}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="Ví dụ: Hà Nội / Hybrid"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/40 text-slate-900 text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">Hình thức làm việc</label>
            <select
              value={formData.employmentType || 'FULL_TIME'}
              onChange={(e) => setFormData({ ...formData, employmentType: e.target.value as EmploymentType })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/40 text-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            >
              <option value="FULL_TIME">Toàn thời gian (Full-time)</option>
              <option value="PART_TIME">Bán thời gian (Part-time)</option>
              <option value="CONTRACT">Hợp đồng (Contract)</option>
              <option value="INTERNSHIP">Thực tập (Internship)</option>
              <option value="REMOTE">Làm việc từ xa (Remote)</option>
            </select>
          </div>
        </div>
      </div>

      {/* KHỐI 2: MÔ TẢ & YÊU CẦU NĂNG LỰC (DÀNH CHO AI PARSER) */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
        <div className="border-b border-slate-100 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">2. Bản mô tả & Yêu cầu công việc</h2>
              <p className="text-xs text-slate-500 mt-1">
                Nội dung chi tiết được mô hình AI NLP sử dụng để đối sánh kỹ năng và chấm điểm ứng viên
              </p>
            </div>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
              <span>Nạp vào AI Microservice</span>
            </span>
          </div>
        </div>

        {/* Mô tả chi tiết */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-2">
            Mô tả trách nhiệm công việc <span className="text-red-500">*</span>
          </label>
          <textarea
            rows={6}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Nêu rõ các nhiệm vụ, trách nhiệm chính của vị trí tuyển dụng..."
            className={`w-full px-4 py-3 rounded-xl border text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 transition-all ${
              errors.description
                ? 'border-red-300 focus:ring-red-400 bg-red-50/20'
                : 'border-slate-200 focus:ring-blue-500 bg-slate-50/40 focus:bg-white'
            }`}
          />
          {errors.description && <p className="text-xs text-red-600 mt-1.5">{errors.description}</p>}
        </div>

        {/* Yêu cầu năng lực & Kỹ năng */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-2">
            Yêu cầu năng lực, kỹ năng & kinh nghiệm
          </label>
          <textarea
            rows={5}
            value={formData.requirements || ''}
            onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
            placeholder="Ví dụ: - Thành thạo React, Next.js, TypeScript
- Có ít nhất 2 năm kinh nghiệm làm việc với REST API
- Tinh thần trách nhiệm cao, kỹ năng làm việc nhóm tốt"
            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/40 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* KHỐI 3: MỨC LƯƠNG & HẠN NỘP HỒ SƠ */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
        <div className="border-b border-slate-100 pb-4">
          <h2 className="text-lg font-bold text-slate-900">3. Chế độ đãi ngộ & Thời hạn</h2>
          <p className="text-xs text-slate-500 mt-1">Cài đặt khoảng lương và thời hạn đóng đợt nhận hồ sơ</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Lương tối thiểu */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-700">Lương tối thiểu (VNĐ)</label>
              {formatMoneyHint(formData.salaryMin) && (
                <span className="text-xs font-bold text-emerald-600">{formatMoneyHint(formData.salaryMin)}</span>
              )}
            </div>
            <input
              type="number"
              min="0"
              step="500000"
              value={formData.salaryMin !== undefined && formData.salaryMin !== null ? formData.salaryMin : ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  salaryMin: e.target.value === '' ? undefined : Number(e.target.value),
                })
              }
              placeholder="Ví dụ: 15000000"
              className={`w-full px-4 py-2.5 rounded-xl border text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 transition-all ${
                errors.salaryMin
                  ? 'border-red-300 focus:ring-red-400 bg-red-50/20'
                  : 'border-slate-200 focus:ring-blue-500 bg-slate-50/40 focus:bg-white'
              }`}
            />
            {errors.salaryMin && <p className="text-xs text-red-600 mt-1.5">{errors.salaryMin}</p>}
          </div>

          {/* Lương tối đa */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-700">Lương tối đa (VNĐ)</label>
              {formatMoneyHint(formData.salaryMax) && (
                <span className="text-xs font-bold text-emerald-600">{formatMoneyHint(formData.salaryMax)}</span>
              )}
            </div>
            <input
              type="number"
              min="0"
              step="500000"
              value={formData.salaryMax !== undefined && formData.salaryMax !== null ? formData.salaryMax : ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  salaryMax: e.target.value === '' ? undefined : Number(e.target.value),
                })
              }
              placeholder="Ví dụ: 30000000"
              className={`w-full px-4 py-2.5 rounded-xl border text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 transition-all ${
                errors.salaryMax
                  ? 'border-red-300 focus:ring-red-400 bg-red-50/20'
                  : 'border-slate-200 focus:ring-blue-500 bg-slate-50/40 focus:bg-white'
              }`}
            />
            {errors.salaryMax && <p className="text-xs text-red-600 mt-1.5">{errors.salaryMax}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
          {/* Hạn chót nộp hồ sơ */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">Hạn chót nhận hồ sơ</label>
            <input
              type="date"
              value={formData.applicationDeadline || ''}
              onChange={(e) => setFormData({ ...formData, applicationDeadline: e.target.value })}
              className={`w-full px-4 py-2.5 rounded-xl border text-sm text-slate-900 focus:outline-none focus:ring-2 transition-all ${
                errors.applicationDeadline
                  ? 'border-red-300 focus:ring-red-400 bg-red-50/20'
                  : 'border-slate-200 focus:ring-blue-500 bg-slate-50/40 focus:bg-white'
              }`}
            />
            {errors.applicationDeadline && (
              <p className="text-xs text-red-600 mt-1.5">{errors.applicationDeadline}</p>
            )}
          </div>

          {/* Trạng thái xuất bản */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">Trạng thái tin</label>
            <select
              value={formData.status || 'DRAFT'}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as JobStatus })}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/40 text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            >
              <option value="DRAFT">Bản nháp (DRAFT) - Chưa công khai</option>
              <option value="PUBLISHED">Xuất bản (PUBLISHED) - Đang nhận hồ sơ</option>
              <option value="CLOSED">Đã đóng (CLOSED) - Ngừng nhận hồ sơ</option>
              <option value="ARCHIVED">Lưu trữ (ARCHIVED) - Chiến dịch kết thúc</option>
            </select>
          </div>
        </div>
      </div>

      {/* THANH ĐIỀU KHIỂN NÚT HÀNH ĐỘNG */}
      <div className="flex items-center justify-end gap-3 pt-4">
        <Link
          href="/dashboard/jobs"
          className="px-6 py-3 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all"
        >
          Hủy bỏ
        </Link>

        <button
          type="submit"
          disabled={isSubmitting}
          className="px-8 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <svg className="w-4 h-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Đang lưu...</span>
            </>
          ) : (
            <span>{isEdit ? 'Lưu thay đổi' : 'Đăng tin tuyển dụng'}</span>
          )}
        </button>
      </div>
    </form>
  );
}

export default JobForm;
