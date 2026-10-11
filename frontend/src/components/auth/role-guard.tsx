'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth, UserRole } from '@/lib/auth-context';

export interface RoleGuardProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Component bảo vệ trang hoặc khối giao diện theo vai trò người dùng (Role-Based Access Control)
 * - Người chưa đăng nhập: Tự động điều hướng về /auth/login
 * - Người dùng sai role: Hiển thị giao diện 403 Forbidden
 * - Người dùng đúng role: Hiển thị nội dung children
 */
export function RoleGuard({ allowedRoles, children, fallback }: RoleGuardProps) {
  const { user, role, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/auth/login');
    }
  }, [isLoading, isAuthenticated, router]);

  // 1. Trạng thái đang tải dữ liệu phiên làm việc
  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-8">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-sm text-slate-500 font-medium">Đang kiểm tra quyền truy cập...</p>
      </div>
    );
  }

  // 2. Chưa đăng nhập (đang chờ router chuyển hướng)
  if (!isAuthenticated || !user) {
    return null;
  }

  // 3. Sai quyền (Role không nằm trong allowedRoles)
  const hasPermission = role && allowedRoles.includes(role);

  if (!hasPermission) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-12">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8 text-center">
          <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-5 text-amber-600 border border-amber-200/60 shadow-inner">
            <svg
              className="w-8 h-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          <h2 className="text-xl font-bold text-slate-900 tracking-tight mb-2">
            Không có quyền truy cập
          </h2>
          <p className="text-sm text-slate-600 mb-6 leading-relaxed">
            Tài khoản của bạn có vai trò{' '}
            <span className="font-semibold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
              {role || 'N/A'}
            </span>
            , không đủ thẩm quyền để truy cập khu vực này.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/"
              className="inline-flex justify-center items-center px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-all"
            >
              Quay lại Trang chủ
            </Link>
            <Link
              href="/auth/login"
              className="inline-flex justify-center items-center px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all"
            >
              Đổi tài khoản khác
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 4. Đúng quyền -> Render nội dung
  return <>{children}</>;
}

/**
 * Hook kiểm tra quyền truy cập nhanh trong Functional Components
 */
export function useRequireRole(allowedRoles: UserRole[], redirectTo = '/auth/login') {
  const { user, role, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.replace(redirectTo);
      }
    }
  }, [isLoading, isAuthenticated, redirectTo, router]);

  const hasPermission = Boolean(role && allowedRoles.includes(role));

  return {
    user,
    role,
    isAuthenticated,
    isLoading,
    hasPermission,
  };
}
