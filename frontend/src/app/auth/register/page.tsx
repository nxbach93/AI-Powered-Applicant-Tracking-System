'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/api';

export default function RegisterPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'Vui lòng nhập họ và tên đệm';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Vui lòng nhập tên';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Vui lòng nhập địa chỉ email';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        newErrors.email = 'Định dạng email không hợp lệ';
      }
    }

    if (!formData.password) {
      newErrors.password = 'Vui lòng nhập mật khẩu';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Mật khẩu phải có độ dài tối thiểu 6 ký tự';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Mật khẩu xác nhận không khớp';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Xóa lỗi của trường tương ứng khi người dùng nhập lại
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

    if (!validateForm()) return;

    setIsLoading(true);
    setGeneralError(null);
    setSuccessMessage(null);

    try {
      const res = await apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
          role: 'CANDIDATE',
        }),
      });

      if (res.success) {
        setSuccessMessage(
          res.message || 'Đăng ký tài khoản thành công! Đang chuyển hướng đến trang đăng nhập...'
        );
        // Tự động điều hướng sau 2 giây
        setTimeout(() => {
          router.push('/auth/login');
        }, 2000);
      } else {
        if (res.error?.details && res.error.details.length > 0) {
          const backendFieldErrors: Record<string, string> = {};
          res.error.details.forEach((err) => {
            backendFieldErrors[err.field] = err.message;
          });
          setErrors(backendFieldErrors);
          setGeneralError(res.error.message || 'Dữ liệu đăng ký không hợp lệ');
        } else {
          setGeneralError(res.error?.message || 'Đăng ký thất bại. Vui lòng thử lại sau.');
        }
      }
    } catch (err: any) {
      setGeneralError(err.message || 'Lỗi hệ thống khi kết nối với máy chủ');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Logo / Brand Header */}
        <div className="flex justify-center items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-xl shadow-md shadow-blue-500/20">
            AI
          </div>
          <span className="text-2xl font-bold tracking-tight text-slate-900">ATS Portal</span>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900 tracking-tight">
          Đăng ký tài khoản ứng viên
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Tạo tài khoản để khám phá cơ hội việc làm và tối ưu hồ sơ CV bằng Trí tuệ Nhân tạo
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl shadow-slate-200/50 sm:rounded-2xl sm:px-10 border border-slate-100">
          {/* Thông báo lỗi chung */}
          {generalError && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-start gap-3 animate-shake">
              <svg
                className="w-5 h-5 text-red-500 mt-0.5 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>{generalError}</span>
            </div>
          )}

          {/* Thông báo thành công */}
          {successMessage && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-800 flex items-start gap-3">
              <svg
                className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <div className="flex-1">
                <p className="font-medium">{successMessage}</p>
                <Link
                  href="/auth/login"
                  className="mt-2 inline-block text-xs font-semibold text-emerald-700 underline hover:text-emerald-900"
                >
                  Bấm vào đây để chuyển đến trang Đăng nhập ngay
                </Link>
              </div>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit} noValidate>
            {/* Họ & Tên */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="firstName"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  Họ và tên đệm <span className="text-red-500">*</span>
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  autoComplete="given-name"
                  required
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="Nguyễn Văn"
                  className={`block w-full px-3.5 py-2.5 rounded-xl border text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 sm:text-sm transition-all ${
                    errors.firstName
                      ? 'border-red-300 bg-red-50/30'
                      : 'border-slate-200 focus:border-blue-600'
                  }`}
                />
                {errors.firstName && (
                  <p className="mt-1.5 text-xs text-red-600">{errors.firstName}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="lastName"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  Tên <span className="text-red-500">*</span>
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  autoComplete="family-name"
                  required
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="An"
                  className={`block w-full px-3.5 py-2.5 rounded-xl border text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 sm:text-sm transition-all ${
                    errors.lastName
                      ? 'border-red-300 bg-red-50/30'
                      : 'border-slate-200 focus:border-blue-600'
                  }`}
                />
                {errors.lastName && (
                  <p className="mt-1.5 text-xs text-red-600">{errors.lastName}</p>
                )}
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
                Địa chỉ Email <span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="candidate@example.com"
                className={`block w-full px-3.5 py-2.5 rounded-xl border text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 sm:text-sm transition-all ${
                  errors.email
                    ? 'border-red-300 bg-red-50/30'
                    : 'border-slate-200 focus:border-blue-600'
                }`}
              />
              {errors.email && <p className="mt-1.5 text-xs text-red-600">{errors.email}</p>}
            </div>

            {/* Mật khẩu */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
                Mật khẩu <span className="text-red-500">*</span>
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={formData.password}
                onChange={handleChange}
                placeholder="Tối thiểu 6 ký tự"
                className={`block w-full px-3.5 py-2.5 rounded-xl border text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 sm:text-sm transition-all ${
                  errors.password
                    ? 'border-red-300 bg-red-50/30'
                    : 'border-slate-200 focus:border-blue-600'
                }`}
              />
              {errors.password && (
                <p className="mt-1.5 text-xs text-red-600">{errors.password}</p>
              )}
            </div>

            {/* Xác nhận mật khẩu */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Xác nhận mật khẩu <span className="text-red-500">*</span>
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Nhập lại mật khẩu"
                className={`block w-full px-3.5 py-2.5 rounded-xl border text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 sm:text-sm transition-all ${
                  errors.confirmPassword
                    ? 'border-red-300 bg-red-50/30'
                    : 'border-slate-200 focus:border-blue-600'
                }`}
              />
              {errors.confirmPassword && (
                <p className="mt-1.5 text-xs text-red-600">{errors.confirmPassword}</p>
              )}
            </div>

            {/* Nút gửi */}
            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-md shadow-blue-500/20 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isLoading ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2.5 h-4 w-4 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Đang xử lý đăng ký...
                  </>
                ) : (
                  'Đăng ký tài khoản'
                )}
              </button>
            </div>
          </form>

          {/* Điều hướng đăng nhập */}
          <div className="mt-6 text-center">
            <p className="text-sm text-slate-600">
              Đã có tài khoản?{' '}
              <Link
                href="/auth/login"
                className="font-semibold text-blue-600 hover:text-blue-500 transition-colors"
              >
                Đăng nhập tại đây
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
