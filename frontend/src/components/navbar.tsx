'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Không hiển thị Candidate Navbar trên các trang xác thực hoặc phân hệ HR (sử dụng Enterprise HrLayout riêng)
  if (
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/hr') ||
    pathname.startsWith('/dashboard') ||
    ((user?.role === 'HR' || user?.role === 'ADMIN') && pathname === '/')
  ) {
    return null;
  }

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      logout();
      setIsMobileMenuOpen(false);
      router.replace('/auth/login');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const displayName = user
    ? `${user.lastName || ''} ${user.firstName || ''}`.trim() || user.email.split('@')[0]
    : 'Ứng viên';

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-surface-container-lowest z-50 shadow-[0_1px_8px_rgba(0,0,0,0.04)] border-b border-outline-variant/30">
      <div className="h-16 w-full max-w-[1440px] px-gutter md:px-gutter-desktop mx-auto flex items-center justify-between gap-space-lg">
        {/* Left Section: Brand Logo & Navigation */}
        <div className="flex items-center gap-space-xl">
          <Link href="/" className="flex items-center gap-space-sm group">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-on-primary shadow-sm group-hover:bg-primary-container transition-colors">
              <span className="material-symbols-outlined text-[20px]">neurology</span>
            </div>
            <div className="flex items-center gap-space-xs">
              <span className="font-headline-lg text-headline-lg text-on-surface tracking-tight font-bold">
                TalentPulse
              </span>
              <span className="px-space-xs py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed text-[10px] font-bold tracking-wider uppercase border border-secondary-fixed-dim/40">
                AI
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-space-lg h-16">
            <Link
              href="/"
              className={`h-16 flex items-center px-space-xs font-body-base text-body-base transition-colors ${
                pathname === '/'
                  ? 'text-primary font-body-base-medium border-b-2 border-primary'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Trang chủ
            </Link>
            <Link
              href="/jobs"
              className={`h-16 flex items-center px-space-xs font-body-base text-body-base transition-colors ${
                pathname.startsWith('/jobs')
                  ? 'text-primary font-body-base-medium border-b-2 border-primary'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Việc làm
            </Link>
            <Link
              href="/candidate/interviews"
              className={`h-16 flex items-center px-space-xs font-body-base text-body-base transition-colors ${
                pathname.startsWith('/candidate/interviews')
                  ? 'text-primary font-body-base-medium border-b-2 border-primary'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Lịch phỏng vấn
            </Link>
            <Link
              href="/profile"
              className={`h-16 flex items-center px-space-xs font-body-base text-body-base transition-colors ${
                pathname === '/profile' || pathname === '/candidate/profile'
                  ? 'text-primary font-body-base-medium border-b-2 border-primary'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Hồ sơ cá nhân
            </Link>
            <Link
              href="/candidate/applications"
              className={`h-16 flex items-center px-space-xs font-body-base text-body-base transition-colors ${
                pathname.startsWith('/candidate/applications')
                  ? 'text-primary font-body-base-medium border-b-2 border-primary'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Đơn ứng tuyển
            </Link>
          </nav>
        </div>

        {/* Right Section: Notification, User Chip & Logout */}
        <div className="flex items-center gap-space-md">
          {isLoading ? (
            <div className="h-8 w-28 bg-surface-container animate-pulse rounded-lg" />
          ) : isAuthenticated && user ? (
            <>
              <button
                aria-label="Thông báo"
                className="relative w-9 h-9 rounded-xl flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface transition-colors"
                type="button"
              >
                <span className="material-symbols-outlined text-[22px]">notifications</span>
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-error ring-2 ring-surface-container-lowest" />
              </button>

              <div className="h-6 w-[1px] bg-outline-variant/40 hidden sm:block" />

              <Link
                href={user.role === 'CANDIDATE' ? '/profile' : '/hr/settings?tab=account'}
                className="flex items-center gap-space-sm pl-space-xs hover:opacity-85 transition-opacity"
              >
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center overflow-hidden shrink-0">
                  {user.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.avatarUrl}
                      alt={displayName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="material-symbols-outlined text-on-primary text-[18px]">person</span>
                  )}
                </div>
                <div className="hidden sm:flex flex-col text-left">
                  <div className="flex items-center gap-space-xs">
                    <span className="font-body-sm-medium text-body-sm-medium text-on-surface leading-tight max-w-[130px] truncate font-semibold">
                      {displayName}
                    </span>
                    <span className="material-symbols-outlined text-[16px] text-on-surface-variant">expand_more</span>
                  </div>
                  <span className="font-label-xs text-label-xs text-secondary leading-tight uppercase font-bold tracking-wider">
                    {user.role}
                  </span>
                </div>
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="flex items-center gap-space-xs px-space-md py-1.5 rounded-lg text-on-surface-variant hover:bg-error-container hover:text-on-error-container transition-colors disabled:opacity-50"
                title="Đăng xuất"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {isLoggingOut ? 'sync' : 'logout'}
                </span>
                <span className="hidden md:inline font-body-sm-medium text-body-sm-medium">
                  {isLoggingOut ? 'Đang thoát...' : 'Đăng xuất'}
                </span>
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/auth/login"
                className="px-3.5 py-1.5 rounded-lg text-on-surface-variant hover:text-primary font-body-sm-medium text-body-sm-medium transition-colors"
              >
                Đăng nhập
              </Link>
              <Link
                href="/auth/register"
                className="px-3.5 py-1.5 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-body-sm-medium text-body-sm-medium shadow-sm transition-colors"
              >
                Đăng ký
              </Link>
            </div>
          )}

          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-low transition-colors"
            aria-label="Toggle navigation menu"
          >
            <span className="material-symbols-outlined text-[24px]">
              {isMobileMenuOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden bg-surface-container-lowest border-t border-outline-variant/30 px-gutter py-space-md shadow-lg space-y-1">
          <Link
            href="/"
            onClick={() => setIsMobileMenuOpen(false)}
            className={`block px-space-md py-2.5 rounded-lg font-body-sm-medium text-body-sm-medium ${
              pathname === '/'
                ? 'bg-primary-fixed text-on-primary-fixed font-semibold'
                : 'text-on-surface-variant hover:bg-surface-container-low'
            }`}
          >
            Trang chủ
          </Link>
          <Link
            href="/jobs"
            onClick={() => setIsMobileMenuOpen(false)}
            className={`block px-space-md py-2.5 rounded-lg font-body-sm-medium text-body-sm-medium ${
              pathname.startsWith('/jobs')
                ? 'bg-primary-fixed text-on-primary-fixed font-semibold'
                : 'text-on-surface-variant hover:bg-surface-container-low'
            }`}
          >
            Việc làm
          </Link>
          <Link
            href="/candidate/interviews"
            onClick={() => setIsMobileMenuOpen(false)}
            className={`block px-space-md py-2.5 rounded-lg font-body-sm-medium text-body-sm-medium ${
              pathname.startsWith('/candidate/interviews')
                ? 'bg-primary-fixed text-on-primary-fixed font-semibold'
                : 'text-on-surface-variant hover:bg-surface-container-low'
            }`}
          >
            Lịch phỏng vấn
          </Link>
          <Link
            href="/profile"
            onClick={() => setIsMobileMenuOpen(false)}
            className={`block px-space-md py-2.5 rounded-lg font-body-sm-medium text-body-sm-medium ${
              pathname === '/profile' || pathname === '/candidate/profile'
                ? 'bg-primary-fixed text-on-primary-fixed font-semibold'
                : 'text-on-surface-variant hover:bg-surface-container-low'
            }`}
          >
            Hồ sơ cá nhân
          </Link>
          <Link
            href="/candidate/applications"
            onClick={() => setIsMobileMenuOpen(false)}
            className={`block px-space-md py-2.5 rounded-lg font-body-sm-medium text-body-sm-medium ${
              pathname.startsWith('/candidate/applications')
                ? 'bg-primary-fixed text-on-primary-fixed font-semibold'
                : 'text-on-surface-variant hover:bg-surface-container-low'
            }`}
          >
            Đơn ứng tuyển
          </Link>
        </div>
      )}
    </header>
  );
}

export default Navbar;
