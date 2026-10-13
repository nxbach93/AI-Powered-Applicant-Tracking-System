'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

interface HrHeaderProps {
  isCollapsed: boolean;
  onOpenMobile: () => void;
}

export function HrHeader({ isCollapsed, onOpenMobile }: HrHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    router.replace('/auth/login');
  };

  // Tính toán Breadcrumbs thân thiện dựa trên pathname thực tế
  const getBreadcrumbs = () => {
    if (pathname.startsWith('/dashboard/jobs/create')) {
      return [
        { label: 'Tin tuyển dụng', href: '/dashboard/jobs' },
        { label: 'Tạo tin mới', href: '#' },
      ];
    }
    if (pathname.startsWith('/dashboard/jobs')) {
      return [
        { label: 'Quản lý tuyển dụng', href: '/dashboard/jobs' },
        { label: 'Danh sách tin', href: '/dashboard/jobs' },
      ];
    }
    if (pathname.startsWith('/hr/applications/') && pathname !== '/hr/applications') {
      return [
        { label: 'Ứng viên', href: '/hr/applications' },
        { label: 'Chi tiết hồ sơ & AI Match', href: '#' },
      ];
    }
    if (pathname.startsWith('/hr/applications')) {
      return [
        { label: 'Quản lý ứng viên', href: '/hr/applications' },
        { label: 'Danh sách hồ sơ', href: '/hr/applications' },
      ];
    }
    if (pathname.startsWith('/hr/interviews')) {
      return [
        { label: 'Tuyển dụng', href: '/dashboard/jobs' },
        { label: 'Lịch phỏng vấn', href: '/hr/interviews' },
      ];
    }
    if (pathname.startsWith('/hr/workflow')) {
      return [
        { label: 'Tuyển dụng', href: '/dashboard/jobs' },
        { label: 'Tiến trình tuyển dụng', href: '/hr/workflow' },
      ];
    }
    return [
      { label: 'HR Workspace', href: '/hr/applications' },
      { label: 'Tổng quan', href: '#' },
    ];
  };

  const breadcrumbs = getBreadcrumbs();
  const userDisplayName = user
    ? `${user.lastName || ''} ${user.firstName || ''}`.trim() || user.email.split('@')[0]
    : 'Chuyên viên HR';
  const userRole = user?.role || 'HR';

  return (
    <header
      className={`fixed top-0 right-0 h-16 z-20 bg-white/95 backdrop-blur-sm border-b border-slate-200/80 transition-all duration-200 ${
        isCollapsed ? 'md:left-[72px]' : 'md:left-64'
      } left-0`}
    >
      <div className="h-full px-4 sm:px-6 flex items-center justify-between gap-4">
        {/* Left: Mobile hamburger & Breadcrumbs */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onOpenMobile}
            className="md:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            title="Mở menu"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Breadcrumb nav */}
          <nav className="flex items-center text-xs sm:text-sm font-medium text-slate-500 overflow-hidden text-ellipsis whitespace-nowrap">
            <span className="text-slate-400 hidden sm:inline">Phân hệ HR</span>
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={idx}>
                <span className="mx-2 text-slate-300">/</span>
                {idx === breadcrumbs.length - 1 ? (
                  <span className="text-slate-900 font-semibold truncate">{crumb.label}</span>
                ) : (
                  <Link href={crumb.href} className="hover:text-blue-600 transition-colors truncate">
                    {crumb.label}
                  </Link>
                )}
              </React.Fragment>
            ))}
          </nav>
        </div>

        {/* Right: Primary action CTA, User Profile & Logout */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Quick Create Job Button */}
          <Link
            href="/dashboard/jobs/create"
            className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold transition-all shadow-xs"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>+ Tạo tin tuyển dụng</span>
          </Link>

          {/* User info pill */}
          <div className="hidden lg:flex items-center gap-2 pl-2 border-l border-slate-200">
            <div className="text-right">
              <div className="text-xs font-semibold text-slate-900 leading-tight">
                {userDisplayName}
              </div>
              <div className="text-[11px] text-slate-500 leading-tight">
                {userRole === 'ADMIN' ? 'Quản trị viên' : 'Chuyên viên Tuyển dụng'}
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-700 font-bold text-xs flex items-center justify-center border border-blue-200">
              {userDisplayName.charAt(0).toUpperCase()}
            </div>
          </div>

          {/* Logout Button */}
          <button
            type="button"
            onClick={handleLogout}
            title="Đăng xuất"
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border border-slate-200 text-slate-600 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 text-xs sm:text-sm font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="hidden sm:inline">Đăng xuất</span>
          </button>
        </div>
      </div>
    </header>
  );
}
