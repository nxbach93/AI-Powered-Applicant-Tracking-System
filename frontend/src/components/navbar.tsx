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

  // Không hiển thị Navbar trên các trang xác thực để giữ giao diện tập trung
  if (pathname.startsWith('/auth/')) {
    return null;
  }

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      logout();
      setIsMobileMenuOpen(false);
      // Sử dụng router.replace để thay thế lịch sử duyệt, ngăn nút Back hiển thị lại dữ liệu phiên
      router.replace('/auth/login');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const getRoleBadge = (role?: string) => {
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

  const isHrOrAdmin = user?.role === 'HR' || user?.role === 'ADMIN';
  const isCandidate = user?.role === 'CANDIDATE';

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm shadow-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo & Tên dự án */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-blue-500/20 group-hover:bg-blue-700 transition-colors">
                AI
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors">
                ATS Portal
              </span>
            </Link>

            {/* Menu điều hướng chính trên Desktop */}
            <nav className="hidden md:flex items-center gap-2 text-sm font-medium">
              <Link
                href="/"
                className={`px-3 py-2 rounded-lg transition-colors ${
                  pathname === '/'
                    ? 'text-blue-600 bg-blue-50/70 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Trang chủ
              </Link>

              {/* Điều hướng dành cho HR & Admin (TV5) */}
              {isAuthenticated && isHrOrAdmin && (
                <>
                  <Link
                    href="/hr/interviews"
                    className={`px-3 py-2 rounded-lg transition-colors ${
                      pathname === '/hr/interviews'
                        ? 'text-blue-600 bg-blue-50/70 font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    Lịch phỏng vấn
                  </Link>
                  <Link
                    href="/hr/workflow"
                    className={`px-3 py-2 rounded-lg transition-colors ${
                      pathname === '/hr/workflow'
                        ? 'text-blue-600 bg-blue-50/70 font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    Tiến trình tuyển dụng
                  </Link>
                </>
              )}

              {/* Điều hướng dành cho Candidate (TV5) */}
              {isAuthenticated && isCandidate && (
                <Link
                  href="/candidate/interviews"
                  className={`px-3 py-2 rounded-lg transition-colors ${
                    pathname === '/candidate/interviews'
                      ? 'text-blue-600 bg-blue-50/70 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  Lịch phỏng vấn
                </Link>
              )}

              {isAuthenticated && (
                <Link
                  href="/profile"
                  className={`px-3 py-2 rounded-lg transition-colors ${
                    pathname === '/profile' || pathname === '/candidate/profile'
                      ? 'text-blue-600 bg-blue-50/70 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  Hồ sơ cá nhân
                </Link>
              )}
            </nav>
          </div>

          {/* Khu vực trạng thái tài khoản & Đăng xuất trên Desktop */}
          <div className="hidden md:flex items-center gap-4">
            {isLoading ? (
              <div className="h-9 w-28 bg-slate-100 animate-pulse rounded-lg" />
            ) : isAuthenticated && user ? (
              <div className="flex items-center gap-3">
                {/* Thông tin người dùng */}
                <Link
                  href="/profile"
                  className="flex items-center gap-2.5 p-1.5 pr-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all text-left"
                >
                  {user.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.avatarUrl}
                      alt={user.firstName}
                      className="w-8 h-8 rounded-full object-cover border border-slate-200"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs uppercase">
                      {user.firstName?.charAt(0) || 'U'}
                    </div>
                  )}
                  <div>
                    <div className="text-xs font-semibold text-slate-900 truncate max-w-[140px]">
                      {user.firstName} {user.lastName}
                    </div>
                    <span className={`inline-block text-[10px] font-bold px-1.5 py-0.2 rounded border ${getRoleBadge(user.role)}`}>
                      {user.role}
                    </span>
                  </div>
                </Link>

                {/* Nút Đăng xuất */}
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100/80 border border-red-200/60 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Đăng xuất khỏi hệ thống"
                  aria-label="Đăng xuất"
                >
                  {isLoggingOut ? (
                    <>
                      <svg className="animate-spin h-3.5 w-3.5 text-red-600" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Đang thoát...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      <span>Đăng xuất</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/auth/login"
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-blue-600 hover:bg-slate-50 transition-colors"
                >
                  Đăng nhập
                </Link>
                <Link
                  href="/auth/register"
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-500/20 transition-all"
                >
                  Đăng ký
                </Link>
              </div>
            )}
          </div>

          {/* Nút Hamburger trên Mobile */}
          <div className="flex md:hidden items-center">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Menu thả xuống trên Mobile */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-slate-100 bg-white px-4 pt-3 pb-4 space-y-3">
          <Link
            href="/"
            onClick={() => setIsMobileMenuOpen(false)}
            className={`block px-3 py-2 rounded-lg text-sm font-medium ${
              pathname === '/' ? 'text-blue-600 bg-blue-50 font-semibold' : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            Trang chủ
          </Link>

          {isAuthenticated && isHrOrAdmin && (
            <>
              <Link
                href="/hr/interviews"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-lg text-sm font-medium ${
                  pathname === '/hr/interviews' ? 'text-blue-600 bg-blue-50 font-semibold' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                Lịch phỏng vấn
              </Link>
              <Link
                href="/hr/workflow"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-lg text-sm font-medium ${
                  pathname === '/hr/workflow' ? 'text-blue-600 bg-blue-50 font-semibold' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                Tiến trình tuyển dụng
              </Link>
            </>
          )}

          {isAuthenticated && isCandidate && (
            <Link
              href="/candidate/interviews"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`block px-3 py-2 rounded-lg text-sm font-medium ${
                pathname === '/candidate/interviews' ? 'text-blue-600 bg-blue-50 font-semibold' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              Lịch phỏng vấn của tôi
            </Link>
          )}

          {isAuthenticated && (
            <Link
              href="/profile"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`block px-3 py-2 rounded-lg text-sm font-medium ${
                pathname === '/profile' || pathname === '/candidate/profile'
                  ? 'text-blue-600 bg-blue-50 font-semibold'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              Hồ sơ cá nhân
            </Link>
          )}

          <div className="pt-3 border-t border-slate-100">
            {isAuthenticated && user ? (
              <div className="space-y-3">
                <div className="px-3 text-xs text-slate-500">
                  Đăng nhập với: <span className="font-semibold text-slate-900">{user.email}</span> ({user.role})
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-red-600 bg-red-50 border border-red-200/60 hover:bg-red-100 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>{isLoggingOut ? 'Đang thoát...' : 'Đăng xuất'}</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/auth/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-center px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200"
                >
                  Đăng nhập
                </Link>
                <Link
                  href="/auth/register"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-center px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700"
                >
                  Đăng ký
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
