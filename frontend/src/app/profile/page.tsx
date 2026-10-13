'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { RoleGuard } from '@/components/auth/role-guard';
import { apiRequest } from '@/lib/api';
import {
  getMyCvApi,
  uploadCvApi,
  deleteCvApi,
  getMyApplicationsApi,
  CvInfo,
  ApplicationListItem,
} from '@/lib/application-api';

function ProfileContent() {
  const router = useRouter();
  const { user, refreshUser, role, isLoading } = useAuth();

  // HR và ADMIN chuyển hướng sang trang Tài khoản HR & Đơn vị riêng biệt
  useEffect(() => {
    if (!isLoading && (role === 'HR' || role === 'ADMIN')) {
      router.replace('/hr/settings?tab=account');
    }
  }, [isLoading, role, router]);

  const [cvInfo, setCvInfo] = useState<CvInfo | null>(null);
  const [applications, setApplications] = useState<ApplicationListItem[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form State
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
    expectedSalary: '',
    portfolioUrl: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingCv, setIsUploadingCv] = useState(false);

  // Password Change State
  const [pwdData, setPwdData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [pwdErrors, setPwdErrors] = useState<Record<string, string>>({});
  const [isPwdSubmitting, setIsPwdSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load CV and applications data
  useEffect(() => {
    if (role === 'CANDIDATE') {
      getMyCvApi()
        .then(setCvInfo)
        .catch(() => setCvInfo({ hasCv: false }));

      getMyApplicationsApi()
        .then(setApplications)
        .catch(() => setApplications([]));
    }
  }, [role]);

  // Pre-fill form from user data
  useEffect(() => {
    if (user) {
      const profile = user.candidateProfile;
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        avatarUrl: user.avatarUrl || '',
        phone: profile?.phone || '',
        dateOfBirth: profile?.dateOfBirth
          ? new Date(profile.dateOfBirth).toISOString().split('T')[0]
          : '',
        address: profile?.address || '',
        summary: profile?.summary || '',
        experienceYears:
          profile?.experienceYears !== null && profile?.experienceYears !== undefined
            ? String(profile.experienceYears)
            : '',
        education: profile?.education || '',
        expectedSalary: '20,000,000 VNĐ',
        portfolioUrl: profile?.portfolioUrl || 'https://github.com/profile',
      });
    }
  }, [user]);

  // Toast auto-clear
  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  // Calculate profile completeness
  const completeness = useMemo(() => {
    let score = 0;
    if (formData.firstName.trim()) score += 15;
    if (formData.lastName.trim()) score += 15;
    if (formData.phone.trim()) score += 15;
    if (formData.education.trim()) score += 15;
    if (formData.experienceYears.trim()) score += 15;
    if (formData.summary.trim()) score += 10;
    if (cvInfo?.hasCv) score += 15;
    return Math.min(score, 100);
  }, [formData, cvInfo]);

  const validateProfile = () => {
    const errs: Record<string, string> = {};
    if (!formData.firstName.trim()) errs.firstName = 'Họ và tên đệm không được để trống';
    if (!formData.lastName.trim()) errs.lastName = 'Tên không được để trống';
    if (formData.phone.trim()) {
      const phoneRegex = /^[0-9]{10,11}$/;
      if (!phoneRegex.test(formData.phone.trim())) {
        errs.phone = 'Số điện thoại phải từ 10 đến 11 chữ số';
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!validateProfile()) return;

    setIsSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        avatarUrl: formData.avatarUrl.trim() || null,
        phone: formData.phone.trim() || null,
        dateOfBirth: formData.dateOfBirth || null,
        address: formData.address.trim() || null,
        summary: formData.summary.trim() || null,
        education: formData.education.trim() || null,
        experienceYears: formData.experienceYears.trim() ? Number(formData.experienceYears) : null,
      };

      const res = await apiRequest('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      if (res.success) {
        setToastMessage('Cập nhật hồ sơ cá nhân thành công!');
        await refreshUser();
      } else {
        setToastMessage(res.error?.message || 'Cập nhật thất bại. Vui lòng kiểm tra lại');
      }
    } catch {
      setToastMessage('Lỗi kết nối khi cập nhật hồ sơ');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingCv(true);
    try {
      const updatedCv = await uploadCvApi(file);
      setCvInfo({
        hasCv: true,
        candidateProfileId: updatedCv.candidateProfileId,
        cvFileUrl: updatedCv.cvFileUrl,
        updatedAt: updatedCv.uploadedAt,
      });
      setToastMessage('Tải lên CV thành công! AI đã phân tích hồ sơ của bạn.');
      await refreshUser();
    } catch (err: any) {
      setToastMessage(err.message || 'Không thể tải lên tệp CV');
    } finally {
      setIsUploadingCv(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteCv = async () => {
    if (!confirm('Bạn có chắc chắn muốn xóa tệp CV hiện tại?')) return;
    try {
      await deleteCvApi();
      setCvInfo({ hasCv: false });
      setToastMessage('Đã xóa tệp CV thành công');
      await refreshUser();
    } catch (err: any) {
      setToastMessage(err.message || 'Không thể xóa tệp CV');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};

    if (!pwdData.currentPassword) errs.currentPassword = 'Vui lòng nhập mật khẩu hiện tại';
    if (!pwdData.newPassword) errs.newPassword = 'Vui lòng nhập mật khẩu mới';
    else if (pwdData.newPassword.length < 6) errs.newPassword = 'Mật khẩu mới tối thiểu 6 ký tự';
    else if (pwdData.newPassword === pwdData.currentPassword) errs.newPassword = 'Mật khẩu mới không được trùng';

    if (pwdData.confirmPassword !== pwdData.newPassword) errs.confirmPassword = 'Xác nhận mật khẩu không khớp';

    setPwdErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setIsPwdSubmitting(true);
    try {
      const res = await apiRequest('/auth/change-password', {
        method: 'PUT',
        body: JSON.stringify({
          currentPassword: pwdData.currentPassword,
          newPassword: pwdData.newPassword,
        }),
      });

      if (res.success) {
        setToastMessage('Đổi mật khẩu thành công!');
        setPwdData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        setToastMessage(res.error?.message || 'Đổi mật khẩu thất bại');
      }
    } catch {
      setToastMessage('Lỗi hệ thống khi đổi mật khẩu');
    } finally {
      setIsPwdSubmitting(false);
    }
  };

  const fullName = `${formData.lastName} ${formData.firstName}`.trim() || user?.email.split('@')[0] || 'Ứng viên';

  return (
    <div className="w-full pt-16 bg-background flex-1 text-on-surface">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-space-md px-space-lg py-space-md bg-surface-container-lowest text-on-surface rounded-xl shadow-xl border border-outline-variant/30 animate-in fade-in slide-in-from-bottom-2">
          <div className="w-7 h-7 rounded-full bg-tertiary/10 text-tertiary flex items-center justify-center">
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
          </div>
          <div className="flex flex-col">
            <span className="font-body-sm-medium text-body-sm-medium text-on-surface">{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="p-1 text-on-surface-variant hover:text-on-surface">
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      <div className="w-full max-w-7xl mx-auto px-gutter md:px-gutter-desktop py-space-xl">
        {/* Top Context & Anchor Tabs */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md pb-space-lg">
          <div className="flex items-center gap-space-xs text-on-surface-variant font-label-sm text-label-sm">
            <Link href="/" className="hover:text-primary transition-colors">
              Trang chủ
            </Link>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-on-surface font-body-sm-medium">Hồ sơ cá nhân & Quản lý CV</span>
          </div>

          <div className="flex items-center gap-1 bg-surface-container-low p-1 rounded-xl border border-outline-variant/20 overflow-x-auto max-w-full">
            <a
              href="#section-cv"
              className="px-space-md py-1 rounded-lg text-primary font-body-sm-medium text-body-sm-medium bg-surface-container-lowest shadow-sm flex items-center gap-1.5 whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-[16px]">description</span>
              Hồ sơ CV
            </a>
            <a
              href="#section-personal"
              className="px-space-md py-1 rounded-lg text-on-surface-variant hover:text-on-surface font-body-sm text-body-sm transition-colors flex items-center gap-1.5 whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-[16px]">badge</span>
              Thông tin cá nhân
            </a>
            <a
              href="#section-security"
              className="px-space-md py-1 rounded-lg text-on-surface-variant hover:text-on-surface font-body-sm text-body-sm transition-colors flex items-center gap-1.5 whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-[16px]">lock</span>
              Bảo mật
            </a>
          </div>
        </div>

        {/* 1. PROFILE HEADER CARD */}
        <div className="bg-surface-container-lowest rounded-xl p-space-lg md:p-space-xl shadow-sm border border-outline-variant/30 mb-space-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-secondary to-primary-container" />

          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-space-xl pt-2">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-space-lg">
              <div className="relative group">
                <div className="w-20 h-20 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center text-primary font-headline-2xl text-headline-2xl font-bold shadow-inner overflow-hidden">
                  {user?.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.avatarUrl} alt={fullName} className="w-full h-full object-cover" />
                  ) : (
                    <span>
                      {fullName
                        .split(' ')
                        .filter(Boolean)
                        .slice(-2)
                        .map((w) => w[0]?.toUpperCase())
                        .join('') || 'CV'}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col">
                <div className="flex items-center gap-space-sm flex-wrap">
                  <h1 className="font-headline-2xl text-headline-2xl font-bold text-on-surface tracking-tight">
                    {fullName}
                  </h1>
                  <span className="inline-flex items-center gap-1 px-space-sm py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed text-label-xs font-label-xs font-semibold uppercase tracking-wider">
                    <span className="material-symbols-outlined text-[12px] text-secondary">verified</span>
                    ỨNG VIÊN XÁC THỰC
                  </span>
                </div>

                <div className="flex items-center gap-space-md text-on-surface-variant font-body-sm text-body-sm mt-1 flex-wrap">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px] text-outline">mail</span>
                    {user?.email}
                  </span>
                  <span className="hidden sm:inline text-outline-variant">•</span>
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px] text-outline">location_on</span>
                    {formData.address || 'Hà Nội, Việt Nam'}
                  </span>
                  <span className="hidden sm:inline text-outline-variant">•</span>
                  <span className="flex items-center gap-1 text-tertiary font-body-sm-medium">
                    <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse" />
                    Đang tìm việc công nghệ cao
                  </span>
                </div>
              </div>
            </div>

            {/* Profile Completion Meter */}
            <div className="w-full lg:w-96 flex flex-col p-space-md bg-surface-container-low rounded-xl border border-outline-variant/20">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-primary">auto_awesome</span>
                  <span className="font-body-sm-medium text-body-sm-medium text-on-surface">Độ hoàn thiện hồ sơ</span>
                </div>
                <span className="font-headline-lg text-headline-lg font-bold text-primary font-tabular-mono">
                  {completeness}%
                </span>
              </div>
              <div className="w-full h-2 bg-surface-container-high rounded-full overflow-hidden mb-2">
                <div
                  className="h-full bg-gradient-to-r from-primary to-secondary rounded-full transition-all duration-500"
                  style={{ width: `${completeness}%` }}
                />
              </div>
              <div className="flex items-start gap-1.5 text-on-surface-variant font-label-xs text-label-xs">
                <span className="material-symbols-outlined text-[14px] text-error shrink-0 mt-0.5">info</span>
                <span>
                  Gợi ý AI: Bổ sung <strong>số điện thoại</strong> & <strong>kỹ năng chuyên sâu</strong> để tối đa hóa điểm số Matching.
                </span>
              </div>
            </div>
          </div>

          <div className="mt-space-lg pt-space-md border-t border-outline-variant/20 flex flex-wrap items-center justify-between gap-space-md">
            <div className="flex items-center gap-space-sm text-label-sm font-label-sm text-on-surface-variant">
              <span className="material-symbols-outlined text-[16px] text-tertiary">check_circle</span>
              Hồ sơ công khai hiển thị với các nhà tuyển dụng hàng đầu qua TalentPulse AI
            </div>
            <div className="flex items-center gap-space-sm">
              <button
                type="button"
                onClick={() => handleSaveProfile()}
                disabled={isSubmitting}
                className="h-9 px-space-lg rounded-lg bg-primary text-on-primary hover:bg-primary-container transition-colors font-body-sm-medium text-body-sm-medium shadow-sm flex items-center gap-1.5 disabled:opacity-60"
              >
                <span className={`material-symbols-outlined text-[16px] ${isSubmitting ? 'animate-spin' : ''}`}>
                  {isSubmitting ? 'sync' : 'save'}
                </span>
                <span>{isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* MAIN TWO-COLUMN WORKSPACE */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl">
          {/* LEFT PRIMARY WORKSPACE (8 cols) */}
          <div className="lg:col-span-8 flex flex-col gap-space-xl">
            {/* SECTION 1: QUẢN LÝ HỒ SƠ CV CỦA BẠN */}
            <section
              className="bg-surface-container-lowest rounded-xl p-space-lg md:p-space-xl shadow-sm border border-outline-variant/30 flex flex-col gap-space-lg"
              id="section-cv"
            >
              <div className="flex items-center justify-between pb-space-sm border-b border-outline-variant/20">
                <div className="flex items-center gap-space-sm">
                  <div className="w-8 h-8 rounded-lg bg-primary-fixed flex items-center justify-center text-on-primary-fixed">
                    <span className="material-symbols-outlined text-[20px]">document_scanner</span>
                  </div>
                  <div>
                    <h2 className="font-headline-lg text-headline-lg font-bold text-on-surface">Hồ sơ CV của bạn</h2>
                    <p className="font-label-sm text-label-sm text-on-surface-variant">
                      Tệp tài liệu phục vụ phân tích hồ sơ và ứng tuyển tự động
                    </p>
                  </div>
                </div>
                <span className="text-label-xs font-label-xs px-2 py-0.5 rounded-full bg-surface-container-low text-on-surface-variant border border-outline-variant/30">
                  Hỗ trợ PDF, DOCX • Tối đa 5MB
                </span>
              </div>

              {cvInfo?.hasCv && cvInfo.cvFileUrl ? (
                <div className="p-space-lg bg-surface-container-low/70 rounded-xl border border-primary/20 relative group hover:bg-surface-container-low transition-all">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-md">
                    <div className="flex items-start gap-space-md min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-error-container text-on-error-container flex flex-col items-center justify-center shrink-0 shadow-sm">
                        <span className="material-symbols-outlined text-[22px]">picture_as_pdf</span>
                        <span className="text-[9px] font-bold tracking-wider leading-none mt-0.5">PDF</span>
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-space-xs flex-wrap">
                          <span
                            className="font-body-base-medium text-body-base-medium text-on-surface truncate max-w-xs md:max-w-md font-tabular-mono font-bold"
                            title={cvInfo.cvFileUrl}
                          >
                            {cvInfo.cvFileUrl.split('/').pop()}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed text-label-xs font-label-xs font-bold inline-flex items-center gap-1">
                            <span className="material-symbols-outlined text-[12px]">auto_fix_high</span>
                            Đã bóc tách AI
                          </span>
                        </div>
                        <div className="flex items-center gap-space-md text-on-surface-variant font-label-sm text-label-sm mt-1">
                          <span>
                            Cập nhật:{' '}
                            <strong className="text-on-surface font-tabular-mono">
                              {cvInfo.updatedAt ? new Date(cvInfo.updatedAt).toLocaleDateString('vi-VN') : 'Mới cập nhật'}
                            </strong>
                          </span>
                          <span>•</span>
                          <span className="text-tertiary flex items-center gap-1 font-body-sm-medium">
                            <span className="material-symbols-outlined text-[14px]">check</span>
                            Sẵn sàng ứng tuyển
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-space-xs shrink-0 self-end sm:self-center">
                      <a
                        href={`http://localhost:5000${cvInfo.cvFileUrl}`}
                        target="_blank"
                        rel="noreferrer"
                        className="h-8 px-space-md rounded-lg bg-surface-container-lowest text-primary hover:bg-primary hover:text-on-primary transition-all font-body-sm-medium text-body-sm-medium border border-outline-variant/30 flex items-center gap-1 shadow-xs"
                      >
                        <span className="material-symbols-outlined text-[16px]">visibility</span>
                        <span>Xem</span>
                      </a>
                      <a
                        href={`http://localhost:5000${cvInfo.cvFileUrl}`}
                        download
                        className="h-8 px-space-md rounded-lg bg-surface-container-lowest text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-all font-body-sm-medium text-body-sm-medium border border-outline-variant/30 flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[16px]">download</span>
                        <span>Tải về</span>
                      </a>
                      <button
                        type="button"
                        onClick={handleDeleteCv}
                        className="h-8 px-space-md rounded-lg bg-surface-container-lowest text-error hover:bg-error hover:text-on-error transition-all font-body-sm-medium text-body-sm-medium border border-error/20 flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                        <span>Xóa</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Upload Drop Zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-outline-variant hover:border-primary/60 rounded-xl p-space-xl flex flex-col items-center justify-center text-center bg-surface-container-lowest/50 hover:bg-surface-container-low/40 transition-all cursor-pointer group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-space-sm group-hover:scale-110 transition-transform">
                  <span className={`material-symbols-outlined text-[26px] ${isUploadingCv ? 'animate-spin' : ''}`}>
                    {isUploadingCv ? 'sync' : 'cloud_upload'}
                  </span>
                </div>
                <p className="font-body-base-medium text-body-base-medium text-on-surface">
                  {isUploadingCv ? 'Đang tải lên và phân tích CV...' : 'Kéo thả hoặc nhấn để tải lên tệp CV PDF mới'}
                </p>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 max-w-md">
                  Hệ thống AI sẽ tự động đọc kinh nghiệm, kỹ năng và đồng bộ hóa vào hồ sơ của bạn chỉ trong 3 giây.
                </p>
              </div>
            </section>

            {/* SECTION 2: THÔNG TIN CÁ NHÂN CƠ BẢN */}
            <section
              className="bg-surface-container-lowest rounded-xl p-space-lg md:p-space-xl shadow-sm border border-outline-variant/30 flex flex-col gap-space-lg"
              id="section-personal"
            >
              <div className="flex items-center justify-between pb-space-sm border-b border-outline-variant/20">
                <div className="flex items-center gap-space-sm">
                  <div className="w-8 h-8 rounded-lg bg-primary-fixed flex items-center justify-center text-on-primary-fixed">
                    <span className="material-symbols-outlined text-[20px]">person</span>
                  </div>
                  <div>
                    <h2 className="font-headline-lg text-headline-lg font-bold text-on-surface">
                      Thông tin cá nhân cơ bản
                    </h2>
                    <p className="font-label-sm text-label-sm text-on-surface-variant">
                      Chi tiết lý lịch được hiển thị cho nhà tuyển dụng khi duyệt ứng viên
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSaveProfile} className="grid grid-cols-1 md:grid-cols-2 gap-space-lg">
                <div className="flex flex-col gap-1.5">
                  <label className="font-body-sm-medium text-body-sm-medium text-on-surface">
                    Họ và tên đệm <span className="text-error">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="h-10 px-space-md rounded-lg bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none font-body-base text-on-surface"
                  />
                  {errors.lastName && <p className="text-label-xs text-error">{errors.lastName}</p>}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-body-sm-medium text-body-sm-medium text-on-surface">
                    Tên <span className="text-error">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="h-10 px-space-md rounded-lg bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none font-body-base text-on-surface"
                  />
                  {errors.firstName && <p className="text-label-xs text-error">{errors.firstName}</p>}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-body-sm-medium text-body-sm-medium text-on-surface">
                    Số điện thoại liên lạc
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="0987654321"
                    className="h-10 px-space-md rounded-lg bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none font-body-base text-on-surface"
                  />
                  {errors.phone && <p className="text-label-xs text-error">{errors.phone}</p>}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-body-sm-medium text-body-sm-medium text-on-surface">Ngày sinh</label>
                  <input
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    className="h-10 px-space-md rounded-lg bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none font-body-base text-on-surface"
                  />
                </div>

                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="font-body-sm-medium text-body-sm-medium text-on-surface">Địa chỉ hiện tại</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Quận Cầu Giấy, Hà Nội"
                    className="h-10 px-space-md rounded-lg bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none font-body-base text-on-surface"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-body-sm-medium text-body-sm-medium text-on-surface">
                    Học vấn / Bằng cấp
                  </label>
                  <input
                    type="text"
                    value={formData.education}
                    onChange={(e) => setFormData({ ...formData, education: e.target.value })}
                    placeholder="Đại học Bách Khoa Hà Nội"
                    className="h-10 px-space-md rounded-lg bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none font-body-base text-on-surface"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-body-sm-medium text-body-sm-medium text-on-surface">
                    Số năm kinh nghiệm
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.experienceYears}
                    onChange={(e) => setFormData({ ...formData, experienceYears: e.target.value })}
                    placeholder="Ví dụ: 3"
                    className="h-10 px-space-md rounded-lg bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none font-body-base text-on-surface"
                  />
                </div>

                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="font-body-sm-medium text-body-sm-medium text-on-surface">
                    Mục tiêu nghề nghiệp & Tóm tắt năng lực
                  </label>
                  <textarea
                    rows={4}
                    value={formData.summary}
                    onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                    placeholder="Tóm tắt kỹ năng chính và định hướng nghề nghiệp..."
                    className="p-space-md rounded-lg bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none font-body-base text-on-surface leading-relaxed"
                  />
                </div>

                <div className="md:col-span-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-body-sm-medium text-body-sm-medium shadow-sm transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? 'Đang lưu...' : 'Lưu thông tin cá nhân'}
                  </button>
                </div>
              </form>
            </section>

            {/* SECTION 4: BẢO MẬT & ĐỔI MẬT KHẨU */}
            <section
              className="bg-surface-container-lowest rounded-xl p-space-lg md:p-space-xl shadow-sm border border-outline-variant/30 flex flex-col gap-space-lg"
              id="section-security"
            >
              <div className="flex items-center justify-between pb-space-sm border-b border-outline-variant/20">
                <div className="flex items-center gap-space-sm">
                  <div className="w-8 h-8 rounded-lg bg-primary-fixed flex items-center justify-center text-on-primary-fixed">
                    <span className="material-symbols-outlined text-[20px]">security</span>
                  </div>
                  <div>
                    <h2 className="font-headline-lg text-headline-lg font-bold text-on-surface">
                      Bảo mật tài khoản & Đổi mật khẩu
                    </h2>
                    <p className="font-label-sm text-label-sm text-on-surface-variant">
                      Quản trị phiên làm việc, email định danh và an toàn xác thực
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-4 max-w-xl">
                <div className="flex flex-col gap-1.5">
                  <label className="font-body-sm text-body-sm text-on-surface">Mật khẩu hiện tại</label>
                  <input
                    type="password"
                    value={pwdData.currentPassword}
                    onChange={(e) => setPwdData({ ...pwdData, currentPassword: e.target.value })}
                    className="h-10 px-space-md rounded-lg bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none font-body-base text-on-surface"
                  />
                  {pwdErrors.currentPassword && (
                    <p className="text-label-xs text-error">{pwdErrors.currentPassword}</p>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-body-sm text-body-sm text-on-surface">Mật khẩu mới</label>
                  <input
                    type="password"
                    value={pwdData.newPassword}
                    onChange={(e) => setPwdData({ ...pwdData, newPassword: e.target.value })}
                    className="h-10 px-space-md rounded-lg bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none font-body-base text-on-surface"
                  />
                  {pwdErrors.newPassword && (
                    <p className="text-label-xs text-error">{pwdErrors.newPassword}</p>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-body-sm text-body-sm text-on-surface">Xác nhận mật khẩu mới</label>
                  <input
                    type="password"
                    value={pwdData.confirmPassword}
                    onChange={(e) => setPwdData({ ...pwdData, confirmPassword: e.target.value })}
                    className="h-10 px-space-md rounded-lg bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none font-body-base text-on-surface"
                  />
                  {pwdErrors.confirmPassword && (
                    <p className="text-label-xs text-error">{pwdErrors.confirmPassword}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isPwdSubmitting}
                  className="px-5 py-2.5 rounded-lg bg-secondary hover:bg-secondary-container text-on-secondary font-body-sm-medium text-body-sm-medium shadow-sm transition-all disabled:opacity-50"
                >
                  {isPwdSubmitting ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
                </button>
              </form>
            </section>
          </div>

          {/* RIGHT WIDGET RAIL (4 cols) */}
          <div className="lg:col-span-4 flex flex-col gap-space-xl">
            {/* Widget: AI Radar */}
            <div className="bg-gradient-to-br from-surface-container-lowest via-surface-container-low to-secondary-fixed/30 rounded-xl p-space-lg shadow-sm border border-secondary/20 flex flex-col gap-space-md">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded-full bg-secondary text-on-secondary text-label-xs font-bold uppercase tracking-wider flex items-center gap-1">
                  <span className="material-symbols-outlined text-[12px]">neurology</span>
                  AI RADAR
                </span>
                <span className="font-tabular-mono text-body-sm font-semibold text-secondary">
                  Hợp chuẩn {completeness}%
                </span>
              </div>
              <div>
                <h3 className="font-headline-lg text-headline-lg font-bold text-on-surface">
                  Độ sẵn sàng ứng tuyển
                </h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                  Hồ sơ của bạn đã được lập chỉ mục trên mạng lưới tìm kiếm tự động của TalentPulse ATS.
                </p>
              </div>

              <Link
                href="/jobs"
                className="w-full py-2.5 px-3 rounded-lg bg-surface-container-lowest text-primary font-body-sm-medium text-body-sm-medium text-center border border-primary/20 hover:bg-primary hover:text-on-primary transition-all flex items-center justify-center gap-1.5 shadow-xs"
              >
                <span className="material-symbols-outlined text-[16px]">work</span>
                Khám phá công việc phù hợp
              </Link>
            </div>

            {/* Widget: Lịch sử ứng tuyển nhanh */}
            <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm border border-outline-variant/30 flex flex-col gap-space-md">
              <div className="flex items-center justify-between pb-space-xs border-b border-outline-variant/20">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px] text-primary">history</span>
                  <h3 className="font-headline-lg text-headline-lg font-bold text-on-surface">Lịch sử ứng tuyển</h3>
                </div>
                <Link
                  href="/candidate/applications"
                  className="text-primary hover:text-primary-container font-label-sm text-label-sm font-semibold"
                >
                  Tất cả ({applications.length})
                </Link>
              </div>

              {applications.length === 0 ? (
                <p className="text-body-sm text-on-surface-variant">Chưa có đơn ứng tuyển nào.</p>
              ) : (
                <div className="space-y-2">
                  {applications.slice(0, 3).map((app) => (
                    <div
                      key={app.id}
                      className="p-space-sm rounded-lg bg-surface-container-low/60 border border-outline-variant/20 flex flex-col gap-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-body-sm-medium text-body-sm-medium text-on-surface truncate font-semibold">
                          {app.jobPosting?.title || 'Vị trí'}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed text-label-xs font-bold uppercase">
                          {app.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-label-xs text-on-surface-variant font-tabular-mono">
                        <span>TalentPulse Corp</span>
                        <span>{new Date(app.appliedAt).toLocaleDateString('vi-VN')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <Link
                href="/candidate/applications"
                className="h-9 px-space-md rounded-lg bg-primary-container text-on-primary-container hover:bg-primary hover:text-on-primary transition-all font-body-sm-medium text-body-sm-medium flex items-center justify-between"
              >
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px]">assignment_turned_in</span>
                  Theo dõi tiến trình hồ sơ
                </span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
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
