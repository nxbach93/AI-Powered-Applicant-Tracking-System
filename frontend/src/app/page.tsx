'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

export default function HomePage() {
  const { user, isAuthenticated, isLoading } = useAuth();

  const getRoleDetails = (role?: string) => {
    switch (role) {
      case 'ADMIN':
        return {
          title: 'Quản trị viên Hệ thống (System Administrator)',
          badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
          desc: 'Quản trị toàn quyền hệ thống, phân quyền người dùng và quản lý dữ liệu toàn bộ nền tảng.',
        };
      case 'HR':
        return {
          title: 'Chuyên viên Tuyển dụng (Human Resources)',
          badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
          desc: 'Quản lý các hoạt động tuyển dụng, tương tác với ứng viên và quản trị hồ sơ nghiệp vụ.',
        };
      case 'CANDIDATE':
      default:
        return {
          title: 'Ứng viên (Candidate)',
          badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
          desc: 'Quản lý thông tin cá nhân, hồ sơ chuyên môn và trải nghiệm quy trình ứng tuyển.',
        };
    }
  };

  return (
    <main className="max-w-5xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      {isLoading ? (
        /* Trạng thái tải phiên đăng nhập */
        <div className="space-y-6 animate-pulse">
          <div className="h-44 bg-white rounded-2xl border border-slate-100 p-8 shadow-sm flex flex-col justify-center">
            <div className="h-6 w-32 bg-slate-200 rounded mb-4" />
            <div className="h-8 w-72 bg-slate-200 rounded mb-2" />
            <div className="h-4 w-96 bg-slate-200 rounded" />
          </div>
        </div>
      ) : isAuthenticated && user ? (
        /* Giao diện khi người dùng ĐÃ ĐĂNG NHẬP */
        <div className="space-y-8">
          {/* Khối lời chào cá nhân hóa */}
          <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8 sm:p-10 relative overflow-hidden">
            <div className="absolute top-0 right-0 -mt-8 -mr-8 w-44 h-44 bg-blue-50 rounded-full blur-2xl pointer-events-none" />

            <div className="relative">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/60 mb-4">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Phiên làm việc đang hoạt động
              </div>

              <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                Xin chào, {user.firstName} {user.lastName}!
              </h1>

              <p className="mt-2 text-base text-slate-600 max-w-2xl leading-relaxed">
                Chào mừng bạn quay trở lại với <span className="font-semibold text-slate-900">AI-Powered ATS Portal</span>. 
                Hệ thống xác thực và tài khoản của bạn đang ở trạng thái an toàn.
              </p>

              {/* Chi tiết vai trò & tài khoản */}
              <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
                  <div className="text-xs font-medium text-slate-500 mb-1">Vai trò trong hệ thống</div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`inline-block text-xs font-bold px-2.5 py-0.5 rounded border ${getRoleDetails(user.role).badgeColor}`}>
                      {user.role}
                    </span>
                    <span className="text-xs font-semibold text-slate-900">
                      {getRoleDetails(user.role).title}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 leading-normal">
                    {getRoleDetails(user.role).desc}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 flex flex-col justify-between">
                  <div>
                    <div className="text-xs font-medium text-slate-500 mb-1">Tài khoản định danh</div>
                    <div className="text-sm font-semibold text-slate-900 font-mono truncate">
                      {user.email}
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-emerald-600 font-medium flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    Đã xác thực JWT thành công
                  </div>
                </div>
              </div>

              {/* Đường dẫn hành động chính */}
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link
                  href="/profile"
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-all focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Quản lý Hồ sơ cá nhân
                </Link>

                <Link
                  href="/profile"
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors focus:outline-none"
                >
                  <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Bảo mật & Đổi mật khẩu
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Giao diện khi CHƯA ĐĂNG NHẬP */
        <div className="space-y-12">
          {/* Hero Section */}
          <div className="text-center sm:text-left bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8 sm:p-12 relative overflow-hidden">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/60 mb-5">
                <span className="w-2 h-2 rounded-full bg-blue-600" />
                AI-Powered Applicant Tracking System
              </div>

              <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
                Cổng thông tin Quản lý Tuyển dụng & Hồ sơ Ứng viên
              </h1>

              <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
                Chào mừng bạn đến với hệ thống ATS Portal. Nền tảng cung cấp cơ chế xác thực an toàn, 
                phân quyền theo vai trò (RBAC) và quản lý hồ sơ cá nhân bảo mật cho ứng viên và nhân sự.
              </p>

              <div className="mt-8 flex flex-wrap items-center justify-center sm:justify-start gap-4">
                <Link
                  href="/auth/login"
                  className="inline-flex items-center justify-center px-6 py-3 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/25 transition-all focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
                >
                  Đăng nhập hệ thống
                </Link>
                <Link
                  href="/auth/register"
                  className="inline-flex items-center justify-center px-6 py-3 rounded-xl text-sm font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-200/60 transition-all focus:outline-none"
                >
                  Đăng ký tài khoản Ứng viên
                </Link>
              </div>
            </div>
          </div>

          {/* 3 Trụ cột Kiến trúc & Bảo mật */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h2 className="text-base font-bold text-slate-900 mb-2">
                Xác thực Chuẩn JWT
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                Đăng nhập bảo mật với JSON Web Token, hỗ trợ xác thực không trạng thái (stateless) và kiểm soát phiên làm việc nghiêm ngặt.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h2 className="text-base font-bold text-slate-900 mb-2">
                Phân quyền Đa vai trò (RBAC)
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                Tách biệt phân quyền rõ ràng giữa Ứng viên (Candidate), Bộ phận Tuyển dụng (HR) và Quản trị viên (Admin) từ Backend đến Frontend.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h2 className="text-base font-bold text-slate-900 mb-2">
                Bảo vệ Hồ sơ Cá nhân
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                Tự quản lý thông tin liên hệ, kinh nghiệm chuyên môn, đổi mật khẩu định kỳ và khôi phục mật khẩu bảo mật qua Email.
              </p>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
