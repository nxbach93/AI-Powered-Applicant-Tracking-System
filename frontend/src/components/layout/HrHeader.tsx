'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

interface HrHeaderProps {
  isCollapsed: boolean;
  onOpenMobile: () => void;
}

export function HrHeader({ isCollapsed, onOpenMobile }: HrHeaderProps) {
  const pathname = usePathname();
  const { user } = useAuth();

  const userDisplayName = user
    ? `${user.lastName || ''} ${user.firstName || ''}`.trim() || user.email.split('@')[0]
    : 'TP';
  const userInitials = userDisplayName
    .split(' ')
    .filter(Boolean)
    .slice(-2)
    .map((w) => w[0]?.toUpperCase())
    .join('') || 'HR';

  return (
    <header className="fixed top-0 left-0 md:left-64 right-0 h-16 bg-surface-container-lowest/90 backdrop-blur-md z-40 border-b border-outline-variant/50 shadow-[0_1px_8px_rgba(0,0,0,0.02)]">
      <div className="h-16 w-full px-gutter-desktop flex items-center justify-between gap-space-lg">
        {/* Left Section */}
        <div className="flex items-center gap-space-md min-w-0">
          <button
            type="button"
            onClick={onOpenMobile}
            className="md:hidden p-1.5 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container-low transition-colors"
            aria-label="Mở menu điều hướng"
          >
            <span className="material-symbols-outlined text-[20px]">menu</span>
          </button>

          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-on-primary font-bold text-sm shadow-sm flex-shrink-0">
            TP
          </div>

          <span className="font-headline-lg text-headline-lg text-primary font-bold tracking-tight whitespace-nowrap">
            TalentPulse AI
          </span>

          <div className="h-4 w-[1px] bg-outline-variant/60 mx-1 hidden sm:block" />

          <nav className="hidden md:flex items-center gap-space-md text-on-surface-variant font-body-sm-medium text-body-sm-medium">
            <Link
              href="/hr"
              className={`transition-colors ${
                pathname === '/dashboard' || pathname === '/hr'
                  ? 'text-primary font-semibold'
                  : 'hover:text-on-surface'
              }`}
            >
              Tổng quan
            </Link>
            <Link
              href="/hr/applications"
              aria-current={pathname.startsWith('/hr/applications') ? 'page' : undefined}
              className={`transition-colors ${
                pathname.startsWith('/hr/applications')
                  ? 'text-primary font-semibold'
                  : 'hover:text-on-surface'
              }`}
            >
              Hồ sơ
            </Link>
            <Link
              href="/dashboard/jobs"
              className={`transition-colors ${
                pathname.startsWith('/dashboard/jobs')
                  ? 'text-primary font-semibold'
                  : 'hover:text-on-surface'
              }`}
            >
              Vị trí
            </Link>
            <Link
              href="/hr/interviews"
              className={`transition-colors ${
                pathname.startsWith('/hr/interviews')
                  ? 'text-primary font-semibold'
                  : 'hover:text-on-surface'
              }`}
            >
              AI Sàng lọc
            </Link>
          </nav>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-space-md">
          <div className="relative hidden sm:block w-64 md:w-80">
            <span className="material-symbols-outlined absolute left-3 top-2 text-[18px] text-outline pointer-events-none">
              search
            </span>
            <input
              type="text"
              placeholder="Tìm ứng viên, kỹ năng, vị trí..."
              className="w-full h-9 pl-9 pr-14 rounded-lg bg-surface-container-low border border-outline-variant/70 text-on-surface placeholder:text-outline font-body-sm text-body-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            />
            <kbd className="absolute right-2.5 top-1.5 font-tabular-mono text-label-xs text-outline px-1.5 py-0.5 rounded bg-surface-container-lowest border border-outline-variant">
              ⌘K
            </kbd>
          </div>

          <Link
            href="/dashboard/jobs/create"
            className="inline-flex items-center gap-1.5 h-9 px-space-md rounded-lg bg-primary hover:bg-primary-container text-on-primary font-body-sm-medium text-body-sm-medium transition-all shadow-sm flex-shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>+ Tạo tin tuyển dụng</span>
          </Link>

          <button
            aria-label="Thông báo hệ thống"
            type="button"
            className="relative p-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">notifications</span>
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-error" />
          </button>

          <Link
            href="/profile"
            className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0 ring-1 ring-outline-variant/60 text-on-primary font-bold text-xs hover:opacity-90 transition-opacity"
            title={userDisplayName}
          >
            {userInitials}
          </Link>
        </div>
      </div>
    </header>
  );
}

export default HrHeader;
