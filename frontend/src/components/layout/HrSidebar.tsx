'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

interface HrSidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export function HrSidebar({
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
}: HrSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    onCloseMobile();
    router.replace('/auth/login');
  };

  const userDisplayName = user
    ? `${user.lastName || ''} ${user.firstName || ''}`.trim() || user.email.split('@')[0]
    : 'Nguyễn Thu Trang';
  const userRole = user?.role || 'HR';

  const isRouteActive = (href: string) => {
    if (href === '/hr/applications') {
      return pathname.startsWith('/hr/applications');
    }
    if (href === '/dashboard/jobs') {
      return pathname.startsWith('/dashboard/jobs');
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs md:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed left-0 top-0 h-full w-64 bg-surface-container-lowest z-50 flex flex-col justify-between border-r border-outline-variant/50 transition-transform duration-200 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="flex flex-col min-h-0">
          {/* Org Header */}
          <div className="p-space-md border-b border-outline-variant/40">
            <div className="flex items-center justify-between p-space-xs rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors cursor-pointer">
              <div className="flex items-center gap-space-sm min-w-0">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-on-primary font-bold text-sm flex-shrink-0 shadow-sm">
                  TP
                </div>
                <div className="min-w-0">
                  <div className="font-body-base-medium text-body-sm-medium text-on-surface truncate">
                    TalentPulse Tech Corp
                  </div>
                  <div className="font-label-xs text-label-xs text-outline flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span>
                    Enterprise Pro
                  </div>
                </div>
              </div>
              <kbd className="hidden sm:inline-flex items-center font-tabular-mono text-label-xs text-outline px-1.5 py-0.5 rounded bg-surface-container-lowest border border-outline-variant">
                ⌘K
              </kbd>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="px-space-md py-space-sm overflow-y-auto flex-1">
            <div className="font-label-xs text-label-xs uppercase tracking-wider text-outline px-space-sm py-space-xs font-semibold">
              Điều hướng chính
            </div>
            <nav className="space-y-1 mb-space-lg">
              <Link
                href="/hr"
                onClick={onCloseMobile}
                className={`flex items-center gap-space-md px-space-sm py-2 rounded-xl transition-colors font-body-sm-medium text-body-sm-medium ${
                  pathname === '/dashboard' || pathname === '/hr'
                    ? 'bg-primary-container text-on-primary-container font-semibold rounded-xl'
                    : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">dashboard</span>
                <span>Tổng quan</span>
              </Link>

              <Link
                href="/hr/applications"
                onClick={onCloseMobile}
                aria-current={isRouteActive('/hr/applications') ? 'page' : undefined}
                className={`flex items-center gap-space-md px-space-sm py-2 transition-colors font-body-sm-medium text-body-sm-medium ${
                  isRouteActive('/hr/applications')
                    ? 'bg-primary-container text-on-primary-container font-semibold rounded-xl'
                    : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface rounded-xl'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">group</span>
                <span>Ứng viên</span>
              </Link>

              <Link
                href="/dashboard/jobs"
                onClick={onCloseMobile}
                className={`flex items-center gap-space-md px-space-sm py-2 rounded-xl transition-colors font-body-sm-medium text-body-sm-medium ${
                  isRouteActive('/dashboard/jobs')
                    ? 'bg-primary-container text-on-primary-container font-semibold rounded-xl'
                    : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">work</span>
                <span>Tin tuyển dụng</span>
              </Link>

              <Link
                href="/hr/interviews"
                onClick={onCloseMobile}
                className={`flex items-center gap-space-md px-space-sm py-2 rounded-xl transition-colors font-body-sm-medium text-body-sm-medium ${
                  pathname.startsWith('/hr/interviews')
                    ? 'bg-primary-container text-on-primary-container font-semibold rounded-xl'
                    : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">calendar_today</span>
                <span>Phỏng vấn</span>
              </Link>

              <Link
                href="/hr/screening"
                onClick={onCloseMobile}
                className={`flex items-center justify-between px-space-sm py-2 rounded-xl transition-colors font-body-sm-medium text-body-sm-medium ${
                  pathname.startsWith('/hr/screening')
                    ? 'bg-primary-container text-on-primary-container font-semibold'
                    : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                }`}
              >
                <div className="flex items-center gap-space-md">
                  <span className={`material-symbols-outlined text-[20px] ${
                    pathname.startsWith('/hr/screening') ? 'text-on-primary-container' : 'text-secondary'
                  }`}>
                    auto_awesome
                  </span>
                  <span>Sàng lọc AI</span>
                </div>
                <span className="font-label-xs text-label-xs px-1.5 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-semibold">
                  Mới
                </span>
              </Link>

              <Link
                href="/hr/workflow"
                onClick={onCloseMobile}
                className={`flex items-center gap-space-md px-space-sm py-2 rounded-xl transition-colors font-body-sm-medium text-body-sm-medium ${
                  pathname.startsWith('/hr/workflow')
                    ? 'bg-primary-container text-on-primary-container font-semibold rounded-xl'
                    : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">bar_chart</span>
                <span>Tiến trình tuyển dụng</span>
              </Link>
            </nav>

            <div className="font-label-xs text-label-xs uppercase tracking-wider text-outline px-space-sm py-space-xs font-semibold">
              Không gian tuyển dụng
            </div>
            <nav className="space-y-1">
              <Link
                href="/jobs"
                target="_blank"
                className="flex items-center justify-between px-space-sm py-2 rounded-xl text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors font-body-sm-medium text-body-sm-medium"
              >
                <div className="flex items-center gap-space-md">
                  <span className="material-symbols-outlined text-[20px]">open_in_new</span>
                  <span>Cổng ứng viên</span>
                </div>
                <span className="material-symbols-outlined text-[16px] text-outline">north_east</span>
              </Link>

              <Link
                href="/hr/settings"
                onClick={onCloseMobile}
                className={`flex items-center gap-space-md px-space-sm py-2 rounded-xl transition-colors font-body-sm-medium text-body-sm-medium ${
                  pathname.startsWith('/hr/settings')
                    ? 'bg-primary-container text-on-primary-container font-semibold'
                    : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                }`}
              >
                <span className={`material-symbols-outlined text-[20px] ${
                  pathname.startsWith('/hr/settings') ? 'text-on-primary-container' : 'text-outline'
                }`}>
                  settings
                </span>
                <span>Cài đặt & Tiêu chí AI</span>
              </Link>
            </nav>
          </div>
        </div>

        {/* User Card & Logout Footer */}
        <div className="p-space-md border-t border-outline-variant/40 bg-surface-container-lowest">
          <div className="flex items-center justify-between p-space-xs rounded-xl bg-surface-container-low/60 hover:bg-surface-container transition-colors">
            <Link
              href="/hr/settings?tab=account"
              onClick={onCloseMobile}
              className="flex items-center gap-space-sm min-w-0 hover:opacity-80 transition-opacity cursor-pointer group"
              title="Tài khoản HR & Đơn vị"
            >
              <div className="relative flex-shrink-0">
                {user?.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.avatarUrl}
                    alt={userDisplayName}
                    className="w-8 h-8 rounded-full object-cover ring-1 ring-outline-variant/60"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                    <span className="material-symbols-outlined text-on-primary text-[18px]">person</span>
                  </div>
                )}
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-tertiary ring-2 ring-surface-container-lowest" />
              </div>
              <div className="min-w-0">
                <div className="font-body-sm-medium text-body-sm-medium text-on-surface truncate leading-tight font-semibold group-hover:text-primary transition-colors">
                  {userDisplayName}
                </div>
                <div className="font-label-xs text-label-xs text-outline leading-tight">
                  {userRole} Lead & Talent Ops
                </div>
              </div>
            </Link>

            <div className="relative flex items-center gap-1">
              <button
                type="button"
                onClick={handleLogout}
                aria-label="Đăng xuất"
                className="p-1 rounded-lg text-on-surface-variant hover:text-error hover:bg-error-container/40 transition-colors"
                title="Đăng xuất"
              >
                <span className="material-symbols-outlined text-[18px]">logout</span>
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

export default HrSidebar;
