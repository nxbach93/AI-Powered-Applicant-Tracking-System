'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiRequest } from '@/lib/api';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: '',
  });

  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (successMessage && countdown > 0) {
      timer = setTimeout(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (successMessage && countdown === 0) {
      router.push('/auth/login');
    }
    return () => clearTimeout(timer);
  }, [successMessage, countdown, router]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!token) {
      setGeneralError('Liên kết đặt lại mật khẩu không hợp lệ (thiếu mã token xác thực).');
      return false;
    }

    if (!formData.newPassword) {
      newErrors.newPassword = 'Vui lòng nhập mật khẩu mới';
    } else if (formData.newPassword.length < 6) {
      newErrors.newPassword = 'Mật khẩu mới phải có tối thiểu 6 ký tự';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Vui lòng xác nhận mật khẩu mới';
    } else if (formData.newPassword && formData.confirmPassword !== formData.newPassword) {
      newErrors.confirmPassword = 'Xác nhận mật khẩu mới không khớp';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

    setIsLoading(true);
    setGeneralError(null);
    setSuccessMessage(null);

    try {
      const res = await apiRequest('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          token: token!.trim(),
          newPassword: formData.newPassword,
        }),
      });

      if (res.success) {
        setSuccessMessage(res.message || 'Đặt lại mật khẩu thành công!');
        setFormData({ newPassword: '', confirmPassword: '' });
      } else {
        if (res.error?.details && res.error.details.length > 0) {
          const fieldErrors: Record<string, string> = {};
          res.error.details.forEach((err) => {
            fieldErrors[err.field] = err.message;
          });
          setErrors(fieldErrors);
          setGeneralError(res.error.message || 'Dữ liệu không hợp lệ');
        } else {
          setGeneralError(
            res.error?.message ||
              'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu lại.'
          );
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi hệ thống khi kết nối đến máy chủ';
      setGeneralError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white py-8 px-6 shadow-xl shadow-slate-200/50 sm:rounded-2xl sm:px-10 border border-slate-100">
      {/* Cảnh báo thiếu token trên URL */}
      {!token && (
        <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800 flex items-start gap-3">
          <svg className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="font-semibold">Thiếu mã token xác thực</p>
            <p className="mt-1 text-xs">
              Vui lòng sử dụng đúng liên kết đặt lại mật khẩu được gửi tới email của bạn.
            </p>
          </div>
        </div>
      )}

      {/* Thông báo lỗi */}
      {generalError && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-start gap-3">
          <svg className="w-5 h-5 text-red-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p>{generalError}</p>
            <Link
              href="/auth/forgot-password"
              className="mt-2 inline-block text-xs font-semibold text-red-800 underline hover:text-red-900"
            >
              Yêu cầu gửi lại liên kết mới →
            </Link>
          </div>
        </div>
      )}

      {/* Thông báo thành công */}
      {successMessage && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-800 flex items-start gap-3">
          <svg className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
          <div>
            <p className="font-semibold text-emerald-900">{successMessage}</p>
            <p className="text-xs text-emerald-700 mt-1">
              Đang tự động chuyển hướng về trang Đăng nhập sau <strong>{countdown}</strong> giây...
            </p>
            <Link
              href="/auth/login"
              className="mt-2 inline-block text-xs font-bold text-emerald-800 underline hover:text-emerald-900"
            >
              Đăng nhập ngay bây giờ →
            </Link>
          </div>
        </div>
      )}

      <form className="space-y-5" onSubmit={handleSubmit} noValidate>
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
              required
              disabled={!token || !!successMessage}
              value={formData.newPassword}
              onChange={handleChange}
              placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
              className={`block w-full px-3.5 py-2.5 pr-11 rounded-xl border text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 sm:text-sm transition-all disabled:bg-slate-100 disabled:text-slate-400 ${
                errors.newPassword ? 'border-red-300 bg-red-50/30' : 'border-slate-200 focus:border-blue-600'
              }`}
            />
            <button
              type="button"
              disabled={!token || !!successMessage}
              onClick={() => setShowNew(!showNew)}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none disabled:opacity-40"
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
          {errors.newPassword && <p className="mt-1.5 text-xs text-red-600">{errors.newPassword}</p>}
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
              required
              disabled={!token || !!successMessage}
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Nhập lại mật khẩu mới để xác nhận"
              className={`block w-full px-3.5 py-2.5 pr-11 rounded-xl border text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 sm:text-sm transition-all disabled:bg-slate-100 disabled:text-slate-400 ${
                errors.confirmPassword ? 'border-red-300 bg-red-50/30' : 'border-slate-200 focus:border-blue-600'
              }`}
            />
            <button
              type="button"
              disabled={!token || !!successMessage}
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none disabled:opacity-40"
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
          {errors.confirmPassword && <p className="mt-1.5 text-xs text-red-600">{errors.confirmPassword}</p>}
        </div>

        <div>
          <button
            type="submit"
            disabled={isLoading || !token || !!successMessage}
            className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-md shadow-blue-500/20 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2.5 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Đang cập nhật mật khẩu...
              </>
            ) : (
              'Đặt lại mật khẩu'
            )}
          </button>
        </div>
      </form>

      <div className="mt-6 text-center">
        <Link
          href="/auth/login"
          className="inline-flex items-center text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors"
        >
          <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Quay lại trang Đăng nhập
        </Link>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-xl shadow-md shadow-blue-500/20">
            AI
          </div>
          <span className="text-2xl font-bold tracking-tight text-slate-900">ATS Portal</span>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900 tracking-tight">
          Đặt lại mật khẩu
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Thiết lập mật khẩu bảo mật mới cho tài khoản của bạn
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Suspense
          fallback={
            <div className="bg-white py-12 px-6 shadow-xl sm:rounded-2xl text-center text-slate-500">
              <svg className="animate-spin h-6 w-6 text-blue-600 mx-auto mb-2" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Đang tải thông tin...
            </div>
          }
        >
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
