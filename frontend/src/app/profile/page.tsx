'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { RoleGuard } from '@/components/auth/role-guard';
import { apiRequest } from '@/lib/api';

function ProfileContent() {
  const { user, refreshUser } = useAuth();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    avatarUrl: '',
    phone: '',
    dateOfBirth: '',
    address: '',
    summary: '',
    experienceYears: '',
    education: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  useEffect(() => {
    if (user) {
      const profile = user.candidateProfile;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        avatarUrl: user.avatarUrl || '',
        phone: profile?.phone || '',
        dateOfBirth: profile?.dateOfBirth ? new Date(profile.dateOfBirth).toISOString().split('T')[0] : '',
        address: profile?.address || '',
        summary: profile?.summary || '',
        experienceYears: profile?.experienceYears !== null && profile?.experienceYears !== undefined ? String(profile.experienceYears) : '',
        education: profile?.education || '',
      });
    }
  }, [user]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'Họ và tên đệm không được để trống';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Tên không được để trống';
    }

    if (formData.avatarUrl.trim()) {
      const urlRegex = /^(https?:\/\/|\/uploads\/)/i;
      if (!urlRegex.test(formData.avatarUrl.trim())) {
        newErrors.avatarUrl = 'URL ảnh phải bắt đầu bằng http://, https:// hoặc /uploads/';
      }
    }

    if (formData.phone.trim()) {
      const phoneRegex = /^[0-9]{10,11}$/;
      if (!phoneRegex.test(formData.phone.trim())) {
        newErrors.phone = 'Số điện thoại phải từ 10 đến 11 chữ số';
      }
    }

    if (formData.experienceYears.trim()) {
      const exp = Number(formData.experienceYears);
      if (isNaN(exp) || exp < 0) {
        newErrors.experienceYears = 'Số năm kinh nghiệm phải là số không âm';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (errors[name]) {
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated[name];
        return updated;
      });
    }
    if (generalError) setGeneralError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setIsSubmitting(true);
    setGeneralError(null);
    setSuccessMessage(null);

    try {
      const payload: Record<string, unknown> = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        avatarUrl: formData.avatarUrl.trim() || null,
      };

      if (user?.role === 'CANDIDATE') {
        payload.phone = formData.phone.trim() || null;
        payload.dateOfBirth = formData.dateOfBirth || null;
        payload.address = formData.address.trim() || null;
        payload.summary = formData.summary.trim() || null;
        payload.education = formData.education.trim() || null;
        payload.experienceYears = formData.experienceYears.trim() ? Number(formData.experienceYears) : null;
      }

      const res = await apiRequest('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      if (res.success) {
        setSuccessMessage('Cập nhật thông tin tài khoản thành công!');
        await refreshUser();
      } else {
        if (res.error?.details && res.error.details.length > 0) {
          const fieldErrors: Record<string, string> = {};
          res.error.details.forEach((err) => {
            fieldErrors[err.field] = err.message;
          });
          setErrors(fieldErrors);
          setGeneralError(res.error.message || 'Dữ liệu không hợp lệ');
        } else {
          setGeneralError(res.error?.message || 'Cập nhật thất bại. Vui lòng thử lại.');
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi hệ thống khi cập nhật hồ sơ';
      setGeneralError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleBadgeColor = (role?: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'HR':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'CANDIDATE':
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
      {/* Tiêu đề & Breadcrumb */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
          <Link href="/" className="hover:text-blue-600 transition-colors">
            Trang chủ
          </Link>
          <span>/</span>
          <span className="text-slate-900 font-medium">Hồ sơ cá nhân</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Quản lý tài khoản cá nhân
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Cập nhật thông tin cá nhân và hồ sơ chuyên môn của bạn
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
        {/* Banner thông báo */}
        {generalError && (
          <div className="m-6 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-start gap-3">
            <svg className="w-5 h-5 text-red-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{generalError}</span>
          </div>
        )}

        {successMessage && (
          <div className="m-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-800 flex items-start gap-3">
            <svg className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-medium">{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="p-6 sm:p-8 space-y-6">
          {/* Nhóm 1: Thông tin hệ thống (Read-only) */}
          <div className="bg-slate-50 p-5 rounded-xl border border-slate-200/70">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">
              Thông tin hệ thống
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Địa chỉ Email (Định danh đăng nhập)
                </label>
                <div className="px-3.5 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 text-sm font-mono flex items-center justify-between">
                  <span>{user?.email}</span>
                  <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-sans">
                    Cố định
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Vai trò tài khoản (Role)
                </label>
                <div className="px-3.5 py-2.5 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-between">
                  <span className={`inline-flex text-xs px-2.5 py-1 rounded-full font-bold border ${getRoleBadgeColor(user?.role)}`}>
                    {user?.role}
                  </span>
                  <span className="text-xs text-slate-400">Do hệ thống quản lý</span>
                </div>
              </div>
            </div>
          </div>

          {/* Nhóm 2: Thông tin cơ bản */}
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">
              Thông tin cá nhân cơ bản
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-slate-700 mb-1">
                  Họ và tên đệm <span className="text-red-500">*</span>
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={handleChange}
                  className={`block w-full px-3.5 py-2.5 rounded-xl border text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 sm:text-sm transition-all ${
                    errors.firstName ? 'border-red-300 bg-red-50/30' : 'border-slate-200 focus:border-blue-600'
                  }`}
                />
                {errors.firstName && <p className="mt-1.5 text-xs text-red-600">{errors.firstName}</p>}
              </div>

              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-slate-700 mb-1">
                  Tên <span className="text-red-500">*</span>
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={handleChange}
                  className={`block w-full px-3.5 py-2.5 rounded-xl border text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 sm:text-sm transition-all ${
                    errors.lastName ? 'border-red-300 bg-red-50/30' : 'border-slate-200 focus:border-blue-600'
                  }`}
                />
                {errors.lastName && <p className="mt-1.5 text-xs text-red-600">{errors.lastName}</p>}
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="avatarUrl" className="block text-sm font-medium text-slate-700 mb-1">
                  Đường dẫn ảnh đại diện (Avatar URL)
                </label>
                <input
                  id="avatarUrl"
                  name="avatarUrl"
                  type="text"
                  placeholder="https://example.com/avatar.jpg"
                  value={formData.avatarUrl}
                  onChange={handleChange}
                  className={`block w-full px-3.5 py-2.5 rounded-xl border text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 sm:text-sm transition-all ${
                    errors.avatarUrl ? 'border-red-300 bg-red-50/30' : 'border-slate-200 focus:border-blue-600'
                  }`}
                />
                {errors.avatarUrl && <p className="mt-1.5 text-xs text-red-600">{errors.avatarUrl}</p>}
              </div>
            </div>
          </div>

          {/* Nhóm 3: Thông tin hồ sơ ứng viên (chỉ dành cho CANDIDATE) */}
          {user?.role === 'CANDIDATE' && (
            <div className="pt-4 border-t border-slate-100">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">
                Thông tin chuyên môn ứng viên
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-1">
                    Số điện thoại
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="0987654321"
                    value={formData.phone}
                    onChange={handleChange}
                    className={`block w-full px-3.5 py-2.5 rounded-xl border text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 sm:text-sm transition-all ${
                      errors.phone ? 'border-red-300 bg-red-50/30' : 'border-slate-200 focus:border-blue-600'
                    }`}
                  />
                  {errors.phone && <p className="mt-1.5 text-xs text-red-600">{errors.phone}</p>}
                </div>

                <div>
                  <label htmlFor="dateOfBirth" className="block text-sm font-medium text-slate-700 mb-1">
                    Ngày sinh
                  </label>
                  <input
                    id="dateOfBirth"
                    name="dateOfBirth"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={handleChange}
                    className="block w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 sm:text-sm transition-all"
                  />
                </div>

                <div>
                  <label htmlFor="experienceYears" className="block text-sm font-medium text-slate-700 mb-1">
                    Số năm kinh nghiệm
                  </label>
                  <input
                    id="experienceYears"
                    name="experienceYears"
                    type="number"
                    min="0"
                    placeholder="Ví dụ: 3"
                    value={formData.experienceYears}
                    onChange={handleChange}
                    className={`block w-full px-3.5 py-2.5 rounded-xl border text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 sm:text-sm transition-all ${
                      errors.experienceYears ? 'border-red-300 bg-red-50/30' : 'border-slate-200 focus:border-blue-600'
                    }`}
                  />
                  {errors.experienceYears && <p className="mt-1.5 text-xs text-red-600">{errors.experienceYears}</p>}
                </div>

                <div>
                  <label htmlFor="education" className="block text-sm font-medium text-slate-700 mb-1">
                    Học vấn / Bằng cấp
                  </label>
                  <input
                    id="education"
                    name="education"
                    type="text"
                    placeholder="Ví dụ: Đại học Bách Khoa Hà Nội"
                    value={formData.education}
                    onChange={handleChange}
                    className="block w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 sm:text-sm transition-all"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="address" className="block text-sm font-medium text-slate-700 mb-1">
                    Địa chỉ hiện tại
                  </label>
                  <input
                    id="address"
                    name="address"
                    type="text"
                    placeholder="Quận Cầu Giấy, Hà Nội"
                    value={formData.address}
                    onChange={handleChange}
                    className="block w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 sm:text-sm transition-all"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="summary" className="block text-sm font-medium text-slate-700 mb-1">
                    Mục tiêu nghề nghiệp / Giới thiệu bản thân
                  </label>
                  <textarea
                    id="summary"
                    name="summary"
                    rows={3}
                    placeholder="Tóm tắt kỹ năng chính và định hướng nghề nghiệp..."
                    value={formData.summary}
                    onChange={handleChange}
                    className="block w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 sm:text-sm transition-all"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Nút hành động */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <Link
              href="/"
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all"
            >
              Hủy bỏ
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex justify-center items-center py-2.5 px-6 border border-transparent rounded-xl shadow-md shadow-blue-500/20 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Đang lưu...
                </>
              ) : (
                'Lưu thay đổi'
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Khối Đổi Mật Khẩu */}
      <ChangePasswordCard />
    </div>
  );
}

function ChangePasswordCard() {
  const [pwdData, setPwdData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [pwdErrors, setPwdErrors] = useState<Record<string, string>>({});
  const [pwdGeneralError, setPwdGeneralError] = useState<string | null>(null);
  const [pwdSuccessMessage, setPwdSuccessMessage] = useState<string | null>(null);
  const [isPwdSubmitting, setIsPwdSubmitting] = useState(false);

  const handlePwdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPwdData((prev) => ({ ...prev, [name]: value }));

    if (pwdErrors[name]) {
      setPwdErrors((prev) => {
        const updated = { ...prev };
        delete updated[name];
        return updated;
      });
    }
    if (pwdGeneralError) setPwdGeneralError(null);
  };

  const validatePwd = () => {
    const errors: Record<string, string> = {};

    if (!pwdData.currentPassword) {
      errors.currentPassword = 'Vui lòng nhập mật khẩu hiện tại';
    }

    if (!pwdData.newPassword) {
      errors.newPassword = 'Vui lòng nhập mật khẩu mới';
    } else if (pwdData.newPassword.length < 6) {
      errors.newPassword = 'Mật khẩu mới phải có tối thiểu 6 ký tự';
    } else if (pwdData.currentPassword && pwdData.newPassword === pwdData.currentPassword) {
      errors.newPassword = 'Mật khẩu mới không được trùng với mật khẩu hiện tại';
    }

    if (!pwdData.confirmPassword) {
      errors.confirmPassword = 'Vui lòng xác nhận mật khẩu mới';
    } else if (pwdData.newPassword && pwdData.confirmPassword !== pwdData.newPassword) {
      errors.confirmPassword = 'Xác nhận mật khẩu mới không khớp';
    }

    setPwdErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handlePwdSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validatePwd()) return;

    setIsPwdSubmitting(true);
    setPwdGeneralError(null);
    setPwdSuccessMessage(null);

    try {
      const res = await apiRequest('/auth/change-password', {
        method: 'PUT',
        body: JSON.stringify({
          currentPassword: pwdData.currentPassword,
          newPassword: pwdData.newPassword,
        }),
      });

      if (res.success) {
        setPwdSuccessMessage(res.message || 'Đổi mật khẩu thành công!');
        setPwdData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
        setPwdErrors({});
      } else {
        if (res.error?.details && res.error.details.length > 0) {
          const fieldErrors: Record<string, string> = {};
          res.error.details.forEach((err) => {
            fieldErrors[err.field] = err.message;
          });
          setPwdErrors(fieldErrors);
          setPwdGeneralError(res.error.message || 'Đổi mật khẩu thất bại');
        } else {
          setPwdGeneralError(res.error?.message || 'Đổi mật khẩu thất bại. Vui lòng kiểm tra lại.');
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi hệ thống khi đổi mật khẩu';
      setPwdGeneralError(msg);
    } finally {
      setIsPwdSubmitting(false);
    }
  };

  return (
    <div className="mt-8 bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
      <div className="p-6 sm:p-8 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Bảo mật & Đổi mật khẩu</h2>
            <p className="text-sm text-slate-600">Thay đổi mật khẩu đăng nhập định kỳ để tăng cường bảo vệ an toàn cho tài khoản</p>
          </div>
        </div>
      </div>

      {pwdGeneralError && (
        <div className="m-6 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-start gap-3">
          <svg className="w-5 h-5 text-red-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{pwdGeneralError}</span>
        </div>
      )}

      {pwdSuccessMessage && (
        <div className="m-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-800 flex items-start gap-3">
          <svg className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
          <span className="font-medium">{pwdSuccessMessage}</span>
        </div>
      )}

      <form onSubmit={handlePwdSubmit} noValidate className="p-6 sm:p-8 space-y-5">
        {/* Mật khẩu hiện tại */}
        <div>
          <label htmlFor="currentPassword" className="block text-sm font-medium text-slate-700 mb-1">
            Mật khẩu hiện tại <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              id="currentPassword"
              name="currentPassword"
              type={showCurrent ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Nhập mật khẩu hiện tại của bạn"
              value={pwdData.currentPassword}
              onChange={handlePwdChange}
              className={`block w-full px-3.5 py-2.5 pr-11 rounded-xl border text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 sm:text-sm transition-all ${
                pwdErrors.currentPassword ? 'border-red-300 bg-red-50/30' : 'border-slate-200 focus:border-blue-600'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
              tabIndex={-1}
              aria-label={showCurrent ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            >
              {showCurrent ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
          {pwdErrors.currentPassword && <p className="mt-1.5 text-xs text-red-600">{pwdErrors.currentPassword}</p>}
        </div>

        {/* Mật khẩu mới */}
        <div>
          <label htmlFor="newPassword" className="block text-sm font-medium text-slate-700 mb-1">
            Mật khẩu mới <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              id="newPassword"
              name="newPassword"
              type={showNew ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
              value={pwdData.newPassword}
              onChange={handlePwdChange}
              className={`block w-full px-3.5 py-2.5 pr-11 rounded-xl border text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 sm:text-sm transition-all ${
                pwdErrors.newPassword ? 'border-red-300 bg-red-50/30' : 'border-slate-200 focus:border-blue-600'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
              tabIndex={-1}
              aria-label={showNew ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            >
              {showNew ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
          {pwdErrors.newPassword && <p className="mt-1.5 text-xs text-red-600">{pwdErrors.newPassword}</p>}
        </div>

        {/* Xác nhận mật khẩu mới */}
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-1">
            Xác nhận mật khẩu mới <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirm ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Nhập lại mật khẩu mới để xác nhận"
              value={pwdData.confirmPassword}
              onChange={handlePwdChange}
              className={`block w-full px-3.5 py-2.5 pr-11 rounded-xl border text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 sm:text-sm transition-all ${
                pwdErrors.confirmPassword ? 'border-red-300 bg-red-50/30' : 'border-slate-200 focus:border-blue-600'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
              tabIndex={-1}
              aria-label={showConfirm ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            >
              {showConfirm ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
          {pwdErrors.confirmPassword && <p className="mt-1.5 text-xs text-red-600">{pwdErrors.confirmPassword}</p>}
        </div>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
          <button
            type="submit"
            disabled={isPwdSubmitting}
            className="inline-flex justify-center items-center py-2.5 px-6 border border-transparent rounded-xl shadow-md shadow-amber-500/20 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isPwdSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Đang xử lý...
              </>
            ) : (
              'Cập nhật mật khẩu mới'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <RoleGuard allowedRoles={['CANDIDATE', 'HR', 'ADMIN']}>
      <ProfileContent />
    </RoleGuard>
  );
}
