'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { apiRequest } from '@/lib/api';

interface AiSettings {
  skillWeight: number;
  expWeight: number;
  semanticWeight: number;
  highPriorityThreshold: number;
  qualifiedThreshold: number;
  autoRescreenOnUpload: boolean;
}

const DEFAULT_AI_SETTINGS: AiSettings = {
  skillWeight: 50,
  expWeight: 30,
  semanticWeight: 20,
  highPriorityThreshold: 80,
  qualifiedThreshold: 60,
  autoRescreenOnUpload: true,
};

function HrSettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, refreshUser } = useAuth();

  const [activeTab, setActiveTab] = useState<'ai' | 'account'>('ai');

  // AI Criteria State
  const [aiSettings, setAiSettings] = useState<AiSettings>(DEFAULT_AI_SETTINGS);
  const [isAiSaved, setIsAiSaved] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // HR Account Form State
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    avatarUrl: '',
    phone: '',
    department: 'Ban Tuyển dụng & Phát triển Nhân tài (Talent Acquisition)',
  });
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
  const [isUpdatingAccount, setIsUpdatingAccount] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);

  // Password Change State
  const [pwdData, setPwdData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [pwdErrors, setPwdErrors] = useState<Record<string, string>>({});
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [isUpdatingPwd, setIsUpdatingPwd] = useState(false);

  // Sync tab from URL query param
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'account') {
      setActiveTab('account');
    } else if (tabParam === 'ai') {
      setActiveTab('ai');
    }
  }, [searchParams]);

  // Load saved AI Settings from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('ats_ai_settings');
      if (saved) {
        setAiSettings(JSON.parse(saved));
      }
    } catch {
      // Ignore
    }
  }, []);

  // Pre-fill user data
  useEffect(() => {
    if (user) {
      setProfileData((prev) => ({
        ...prev,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        avatarUrl: user.avatarUrl || '',
        phone: user.candidateProfile?.phone || '',
      }));
    }
  }, [user]);

  // Clear toast after 4s
  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const switchTab = (tab: 'ai' | 'account') => {
    setActiveTab(tab);
    router.replace(`/hr/settings?tab=${tab}`);
  };

  const handleSaveAiSettings = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      localStorage.setItem('ats_ai_settings', JSON.stringify(aiSettings));
      setIsAiSaved(true);
      setToastMessage('Đã lưu cấu hình Tiêu chí AI & Trọng số sàng lọc thành công!');
      setTimeout(() => setIsAiSaved(false), 2500);
    } catch {
      setToastMessage('Không thể lưu cấu hình vào bộ nhớ trình duyệt');
    }
  };

  const validateProfileForm = () => {
    const errs: Record<string, string> = {};

    if (!profileData.firstName.trim()) {
      errs.firstName = 'Họ và tên đệm không được để trống';
    }

    if (!profileData.lastName.trim()) {
      errs.lastName = 'Tên không được để trống';
    }

    if (profileData.avatarUrl.trim()) {
      const urlRegex = /^(https?:\/\/|\/uploads\/)/i;
      if (!urlRegex.test(profileData.avatarUrl.trim())) {
        errs.avatarUrl = 'URL ảnh phải bắt đầu bằng http://, https:// hoặc /uploads/';
      }
    }

    if (profileData.phone.trim()) {
      const phoneRegex = /^[0-9]{10,11}$/;
      if (!phoneRegex.test(profileData.phone.trim())) {
        errs.phone = 'Số điện thoại phải từ 10 đến 11 chữ số';
      }
    }

    setProfileErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateProfileForm()) return;

    setIsUpdatingAccount(true);
    setAccountError(null);

    try {
      const res = await apiRequest('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({
          firstName: profileData.firstName.trim(),
          lastName: profileData.lastName.trim(),
          avatarUrl: profileData.avatarUrl.trim() || null,
          phone: profileData.phone.trim() || null,
        }),
      });

      if (res.success) {
        setToastMessage('Cập nhật thông tin tài khoản HR thành công!');
        await refreshUser();
      } else {
        if (res.error?.details && res.error.details.length > 0) {
          const fieldErrs: Record<string, string> = {};
          res.error.details.forEach((err) => {
            fieldErrs[err.field] = err.message;
          });
          setProfileErrors(fieldErrs);
        }
        setAccountError(res.error?.message || 'Cập nhật tài khoản thất bại');
      }
    } catch (err: any) {
      setAccountError(err.message || 'Lỗi hệ thống khi cập nhật tài khoản');
    } finally {
      setIsUpdatingAccount(false);
    }
  };

  const validatePasswordForm = () => {
    const errs: Record<string, string> = {};

    if (!pwdData.currentPassword) {
      errs.currentPassword = 'Vui lòng nhập mật khẩu hiện tại';
    }

    if (!pwdData.newPassword) {
      errs.newPassword = 'Vui lòng nhập mật khẩu mới';
    } else if (pwdData.newPassword.length < 6) {
      errs.newPassword = 'Mật khẩu mới phải có tối thiểu 6 ký tự';
    } else if (pwdData.currentPassword && pwdData.newPassword === pwdData.currentPassword) {
      errs.newPassword = 'Mật khẩu mới không được trùng với mật khẩu hiện tại';
    }

    if (!pwdData.confirmPassword) {
      errs.confirmPassword = 'Vui lòng xác nhận mật khẩu mới';
    } else if (pwdData.newPassword && pwdData.confirmPassword !== pwdData.newPassword) {
      errs.confirmPassword = 'Xác nhận mật khẩu mới không khớp';
    }

    setPwdErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatePasswordForm()) return;

    setIsUpdatingPwd(true);
    setPwdError(null);

    try {
      const res = await apiRequest('/auth/change-password', {
        method: 'PUT',
        body: JSON.stringify({
          currentPassword: pwdData.currentPassword,
          newPassword: pwdData.newPassword,
        }),
      });

      if (res.success) {
        setToastMessage('Đổi mật khẩu tài khoản HR thành công!');
        setPwdData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
        setPwdErrors({});
      } else {
        if (res.error?.details && res.error.details.length > 0) {
          const fieldErrs: Record<string, string> = {};
          res.error.details.forEach((err) => {
            fieldErrs[err.field] = err.message;
          });
          setPwdErrors(fieldErrs);
        }
        setPwdError(res.error?.message || 'Đổi mật khẩu thất bại. Vui lòng kiểm tra lại');
      }
    } catch (err: any) {
      setPwdError(err.message || 'Lỗi hệ thống khi đổi mật khẩu');
    } finally {
      setIsUpdatingPwd(false);
    }
  };

  const userDisplayName = user
    ? `${user.lastName || ''} ${user.firstName || ''}`.trim() || user.email.split('@')[0]
    : 'Chuyên viên Tuyển dụng';

  return (
    <div className="flex flex-col w-full space-y-6 max-w-5xl">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-tertiary text-on-tertiary px-4 py-3 rounded-xl shadow-lg font-body-sm-medium text-body-sm-medium animate-in fade-in slide-in-from-bottom-2">
          <span className="material-symbols-outlined text-[20px]">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-headline-2xl text-headline-2xl text-on-surface tracking-tight font-bold">
              Cài đặt & Tiêu chí AI
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-label-xs font-label-xs bg-secondary-fixed text-on-secondary-fixed font-semibold">
              Enterprise ATS
            </span>
          </div>
          <p className="font-body-sm text-body-sm text-outline mt-0.5">
            Cấu hình trọng số thuật toán so khớp CV, ngưỡng điểm thẩm định và hồ sơ chuyên viên phụ trách tuyển dụng.
          </p>
        </div>

        {/* Tab Toggle Buttons */}
        <div className="flex items-center bg-surface-container rounded-lg p-1 shadow-sm shrink-0">
          <button
            type="button"
            onClick={() => switchTab('ai')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-label-sm text-label-sm font-semibold transition-all ${
              activeTab === 'ai'
                ? 'bg-surface-container-lowest text-primary shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[17px]">auto_awesome</span>
            <span>Tiêu chí AI Sàng lọc</span>
          </button>
          <button
            type="button"
            onClick={() => switchTab('account')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-label-sm text-label-sm font-semibold transition-all ${
              activeTab === 'account'
                ? 'bg-surface-container-lowest text-primary shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[17px]">badge</span>
            <span>Tài khoản HR & Đơn vị</span>
          </button>
        </div>
      </div>

      {/* TAB 1: CÀI ĐẶT TIÊU CHÍ AI */}
      {activeTab === 'ai' && (
        <form onSubmit={handleSaveAiSettings} className="space-y-6">
          {/* Section: Weight Distribution */}
          <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-outline-variant/30 space-y-5">
            <div className="flex items-center justify-between border-b border-outline-variant/30 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[22px]">tune</span>
                <div>
                  <h2 className="font-headline-lg text-headline-lg text-on-surface font-semibold">
                    Trọng số Thuật toán So khớp (Hybrid Scoring v2)
                  </h2>
                  <p className="font-label-xs text-label-xs text-outline">
                    Tổng 3 trọng số chuẩn hóa về 100%. Áp dụng trực tiếp vào pipeline sàng lọc FastAPI AI Service.
                  </p>
                </div>
              </div>
              <span className="font-tabular-mono text-label-xs font-bold text-tertiary bg-tertiary-fixed/40 px-2.5 py-1 rounded-full">
                Tổng: {aiSettings.skillWeight + aiSettings.expWeight + aiSettings.semanticWeight}%
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Skill Weight */}
              <div className="p-4 rounded-xl bg-surface-container-low space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-body-sm-medium text-body-sm-medium text-on-surface font-semibold">
                    1. Kỹ năng chuyên môn
                  </span>
                  <span className="font-tabular-mono font-bold text-primary">{aiSettings.skillWeight}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="80"
                  step="5"
                  value={aiSettings.skillWeight}
                  onChange={(e) => setAiSettings({ ...aiSettings, skillWeight: Number(e.target.value) })}
                  className="w-full accent-primary cursor-pointer"
                />
                <p className="font-label-xs text-label-xs text-outline">
                  So khớp tập kỹ năng trích xuất từ CV so với yêu cầu bắt buộc và ưu tiên của JD.
                </p>
              </div>

              {/* Experience Weight */}
              <div className="p-4 rounded-xl bg-surface-container-low space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-body-sm-medium text-body-sm-medium text-on-surface font-semibold">
                    2. Kinh nghiệm thực chiến
                  </span>
                  <span className="font-tabular-mono font-bold text-secondary">{aiSettings.expWeight}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="80"
                  step="5"
                  value={aiSettings.expWeight}
                  onChange={(e) => setAiSettings({ ...aiSettings, expWeight: Number(e.target.value) })}
                  className="w-full accent-secondary cursor-pointer"
                />
                <p className="font-label-xs text-label-xs text-outline">
                  Đánh giá số năm kinh nghiệm tích lũy so với số năm tối thiểu vị trí yêu cầu.
                </p>
              </div>

              {/* Semantic Weight */}
              <div className="p-4 rounded-xl bg-surface-container-low space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-body-sm-medium text-body-sm-medium text-on-surface font-semibold">
                    3. Ngữ nghĩa & Lĩnh vực
                  </span>
                  <span className="font-tabular-mono font-bold text-tertiary">{aiSettings.semanticWeight}%</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="50"
                  step="5"
                  value={aiSettings.semanticWeight}
                  onChange={(e) => setAiSettings({ ...aiSettings, semanticWeight: Number(e.target.value) })}
                  className="w-full accent-tertiary cursor-pointer"
                />
                <p className="font-label-xs text-label-xs text-outline">
                  Đo lường Cosine Similarity qua Sentence-Transformers và kiểm tra mức độ khớp ngành nghề.
                </p>
              </div>
            </div>
          </div>

          {/* Section: Thresholds */}
          <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-outline-variant/30 space-y-5">
            <div className="flex items-center gap-2 border-b border-outline-variant/30 pb-3">
              <span className="material-symbols-outlined text-primary text-[22px]">speed</span>
              <div>
                <h2 className="font-headline-lg text-headline-lg text-on-surface font-semibold">
                  Ngưỡng Phân loại & Tự động Gắn nhãn
                </h2>
                <p className="font-label-xs text-label-xs text-outline">
                  Hệ thống tự động phân loại ứng viên vào các nhóm ưu tiên dựa trên ngưỡng điểm.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block font-body-sm-medium text-body-sm-medium text-on-surface font-semibold">
                  Ngưỡng Đề xuất Phỏng vấn ngay (Priority Tier 1)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="70"
                    max="99"
                    value={aiSettings.highPriorityThreshold}
                    onChange={(e) => setAiSettings({ ...aiSettings, highPriorityThreshold: Number(e.target.value) })}
                    className="w-28 h-10 px-3 rounded-lg bg-surface-container-low border border-outline-variant/60 font-tabular-mono font-bold text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <span className="text-body-sm text-outline">% điểm trở lên</span>
                </div>
                <p className="font-label-xs text-label-xs text-outline">
                  Ứng viên đạt ngưỡng này sẽ hiển thị huy hiệu xanh lá &ldquo;Đề xuất phỏng vấn ngay&rdquo;.
                </p>
              </div>

              <div className="space-y-2">
                <label className="block font-body-sm-medium text-body-sm-medium text-on-surface font-semibold">
                  Ngưỡng Sàng lọc Tối thiểu (Standard Pass)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="40"
                    max="79"
                    value={aiSettings.qualifiedThreshold}
                    onChange={(e) => setAiSettings({ ...aiSettings, qualifiedThreshold: Number(e.target.value) })}
                    className="w-28 h-10 px-3 rounded-lg bg-surface-container-low border border-outline-variant/60 font-tabular-mono font-bold text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <span className="text-body-sm text-outline">% điểm trở lên</span>
                </div>
                <p className="font-label-xs text-label-xs text-outline">
                  Dưới ngưỡng này ứng viên sẽ được chuyển vào danh sách &ldquo;Cần xem xét thêm&rdquo;.
                </p>
              </div>
            </div>
          </div>

          {/* Section: Engine Telemetry Info */}
          <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-outline-variant/30 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-tertiary text-[22px]">memory</span>
                <div>
                  <h3 className="font-headline-lg text-headline-lg text-on-surface font-semibold">
                    Thông tin Mô hình Trí tuệ Nhân tạo
                  </h3>
                  <p className="font-label-xs text-label-xs text-outline">Môi trường AI microservice đang hoạt động</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-label-xs text-label-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse" />
                Dịch vụ AI Sẵn sàng
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-body-sm pt-1">
              <div className="p-3 rounded-lg bg-surface-container-low">
                <span className="font-label-xs text-label-xs text-outline block">Mô hình Ngữ nghĩa:</span>
                <strong className="text-on-surface">SentenceTransformer (all-MiniLM-L6-v2)</strong>
              </div>
              <div className="p-3 rounded-lg bg-surface-container-low">
                <span className="font-label-xs text-label-xs text-outline block">Cơ chế Chống gian lận:</span>
                <strong className="text-on-surface">Cross-Domain Penalty (Giới hạn tối đa 22%)</strong>
              </div>
              <div className="p-3 rounded-lg bg-surface-container-low">
                <span className="font-label-xs text-label-xs text-outline block">Endpoint Kết nối:</span>
                <strong className="text-on-surface font-tabular-mono">http://localhost:8000/api/v1</strong>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => {
                setAiSettings(DEFAULT_AI_SETTINGS);
                setToastMessage('Đã khôi phục cài đặt mặc định của hệ thống!');
              }}
              className="text-primary hover:underline font-body-sm-medium text-body-sm-medium"
            >
              Khôi phục mặc định
            </button>

            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-body-sm-medium text-body-sm-medium shadow-sm transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">save</span>
              <span>{isAiSaved ? '✓ Đã lưu cài đặt' : 'Lưu cấu hình Tiêu chí AI'}</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: TÀI KHOẢN HR & ĐƠN VỊ */}
      {activeTab === 'account' && (
        <div className="space-y-6">
          {/* SECTION A: ĐƠN VỊ & PHÂN QUYỀN HỆ THỐNG */}
          <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-outline-variant/30 space-y-5">
            <div className="flex items-center justify-between border-b border-outline-variant/30 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[22px]">corporate_fare</span>
                <div>
                  <h2 className="font-headline-lg text-headline-lg text-on-surface font-semibold">
                    Đơn vị Doanh nghiệp & Quyền hạn Hệ thống
                  </h2>
                  <p className="font-label-xs text-label-xs text-outline">
                    Thông tin đơn vị tuyển dụng và cấp độ phân quyền trong tổ chức Enterprise ATS
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-label-xs font-label-xs bg-tertiary-fixed text-on-tertiary-fixed font-semibold">
                <span className="w-2 h-2 rounded-full bg-tertiary" />
                {user?.isActive ? 'Đang kích hoạt' : 'Tạm khóa'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-surface-container-low space-y-1">
                <span className="font-label-xs text-label-xs text-outline uppercase tracking-wider block">
                  Đơn vị chủ quản
                </span>
                <strong className="font-body-sm-medium text-body-sm-medium text-on-surface block">
                  TalentPulse Enterprise ATS
                </strong>
                <span className="font-label-xs text-label-xs text-on-surface-variant">Khối Nhân sự & Tuyển dụng</span>
              </div>

              <div className="p-4 rounded-xl bg-surface-container-low space-y-1">
                <span className="font-label-xs text-label-xs text-outline uppercase tracking-wider block">
                  Cấp độ vai trò
                </span>
                <strong className="font-body-sm-medium text-body-sm-medium text-primary block">
                  {user?.role === 'ADMIN' ? 'Quản trị viên (ADMIN)' : 'Chuyên viên Tuyển dụng (HR)'}
                </strong>
                <span className="font-label-xs text-label-xs text-outline">
                  {user?.role === 'ADMIN' ? 'Toàn quyền cấu hình & tuyển dụng' : 'Quản lý tin tuyển dụng & phỏng vấn'}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-surface-container-low space-y-1">
                <span className="font-label-xs text-label-xs text-outline uppercase tracking-wider block">
                  Mã định danh (ID)
                </span>
                <strong className="font-tabular-mono text-body-sm-medium text-body-sm-medium text-on-surface block">
                  #{user?.id ? user.id.slice(0, 8).toUpperCase() : 'HR-SYSTEM'}
                </strong>
                <span className="font-label-xs text-label-xs text-outline">Định danh nội bộ bảo mật</span>
              </div>

              <div className="p-4 rounded-xl bg-surface-container-low space-y-1">
                <span className="font-label-xs text-label-xs text-outline uppercase tracking-wider block">
                  Ngày tham gia
                </span>
                <strong className="font-body-sm-medium text-body-sm-medium text-on-surface block">
                  {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('vi-VN') : 'Đang hoạt động'}
                </strong>
                <span className="font-label-xs text-label-xs text-outline">Xác thực hệ thống nội bộ</span>
              </div>
            </div>
          </div>

          {/* SECTION B: HỒ SƠ CHUYÊN VIÊN & AVATAR */}
          <form onSubmit={handleSaveAccount} className="space-y-6">
            {accountError && (
              <div className="p-4 rounded-xl bg-error-container text-on-error-container text-body-sm flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px]">error</span>
                <span>{accountError}</span>
              </div>
            )}

            <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-outline-variant/30 space-y-5">
              <div className="flex items-center gap-2 border-b border-outline-variant/30 pb-3">
                <span className="material-symbols-outlined text-primary text-[22px]">manage_accounts</span>
                <div>
                  <h2 className="font-headline-lg text-headline-lg text-on-surface font-semibold">
                    Hồ sơ Chuyên viên Tuyển dụng
                  </h2>
                  <p className="font-label-xs text-label-xs text-outline">
                    Thông tin định danh hiển thị trên biên bản phỏng vấn, thư mời và các thông báo gửi đến ứng viên.
                  </p>
                </div>
              </div>

              {/* Avatar Selector & Preview */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-5 p-4 rounded-xl bg-surface-container-low/60 border border-outline-variant/30">
                <div className="relative shrink-0">
                  {profileData.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profileData.avatarUrl}
                      alt={userDisplayName}
                      className="w-16 h-16 rounded-full object-cover ring-2 ring-primary shadow-sm"
                      onError={() => {
                        setProfileErrors((prev) => ({
                          ...prev,
                          avatarUrl: 'Ảnh đại diện không thể tải từ URL đã nhập',
                        }));
                      }}
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-on-primary font-bold text-xl shadow-sm">
                      {userDisplayName
                        .split(' ')
                        .filter(Boolean)
                        .slice(-2)
                        .map((w) => w[0]?.toUpperCase())
                        .join('') || 'HR'}
                    </div>
                  )}
                  <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-tertiary ring-2 ring-surface-container-lowest" />
                </div>

                <div className="flex-1 space-y-2">
                  <label className="block font-body-sm-medium text-body-sm-medium text-on-surface font-semibold">
                    Đường dẫn ảnh đại diện (Avatar URL)
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      placeholder="https://images.unsplash.com/... hoặc /uploads/avatar.png"
                      value={profileData.avatarUrl}
                      onChange={(e) => {
                        setProfileData({ ...profileData, avatarUrl: e.target.value });
                        if (profileErrors.avatarUrl) {
                          setProfileErrors((prev) => {
                            const updated = { ...prev };
                            delete updated.avatarUrl;
                            return updated;
                          });
                        }
                      }}
                      className={`flex-1 h-10 px-3 rounded-lg bg-surface-container-lowest border font-body-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary ${
                        profileErrors.avatarUrl ? 'border-error' : 'border-outline-variant/60'
                      }`}
                    />
                    {profileData.avatarUrl && (
                      <button
                        type="button"
                        onClick={() => setProfileData({ ...profileData, avatarUrl: '' })}
                        className="px-3 h-10 rounded-lg text-outline hover:text-error hover:bg-error-container/30 border border-outline-variant/50 text-body-sm transition-colors shrink-0"
                      >
                        Gỡ ảnh
                      </button>
                    )}
                  </div>
                  {profileErrors.avatarUrl && (
                    <p className="text-label-xs font-label-xs text-error">{profileErrors.avatarUrl}</p>
                  )}
                  <p className="font-label-xs text-label-xs text-outline">
                    Hỗ trợ các đường dẫn ảnh công khai HTTPS hoặc ảnh trong thư mục /uploads/.
                  </p>
                </div>
              </div>

              {/* Form Input Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-body-sm-medium text-body-sm-medium text-on-surface mb-1">
                    Họ và tên đệm <span className="text-error">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={profileData.lastName}
                    onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                    placeholder="Ví dụ: Nguyễn Thị"
                    className={`w-full h-10 px-3 rounded-lg bg-surface-container-low border font-body-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary ${
                      profileErrors.lastName ? 'border-error' : 'border-outline-variant/60'
                    }`}
                  />
                  {profileErrors.lastName && (
                    <p className="mt-1 text-label-xs font-label-xs text-error">{profileErrors.lastName}</p>
                  )}
                </div>

                <div>
                  <label className="block font-body-sm-medium text-body-sm-medium text-on-surface mb-1">
                    Tên <span className="text-error">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={profileData.firstName}
                    onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                    placeholder="Ví dụ: Thu Trang"
                    className={`w-full h-10 px-3 rounded-lg bg-surface-container-low border font-body-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary ${
                      profileErrors.firstName ? 'border-error' : 'border-outline-variant/60'
                    }`}
                  />
                  {profileErrors.firstName && (
                    <p className="mt-1 text-label-xs font-label-xs text-error">{profileErrors.firstName}</p>
                  )}
                </div>

                <div>
                  <label className="block font-body-sm-medium text-body-sm-medium text-on-surface mb-1">
                    Địa chỉ Email đăng nhập (Hệ thống)
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      disabled
                      value={user?.email || ''}
                      className="w-full h-10 px-3 pr-20 rounded-lg bg-surface-container-low border border-outline-variant/40 font-body-sm text-outline cursor-not-allowed"
                    />
                    <span className="absolute right-2.5 top-2.5 px-2 py-0.5 rounded text-label-xs font-label-xs bg-surface-container text-outline">
                      Cố định
                    </span>
                  </div>
                  <span className="font-label-xs text-label-xs text-outline mt-1 block">
                    Định danh đăng nhập không thể thay đổi
                  </span>
                </div>

                <div>
                  <label className="block font-body-sm-medium text-body-sm-medium text-on-surface mb-1">
                    Số điện thoại liên hệ
                  </label>
                  <input
                    type="tel"
                    value={profileData.phone}
                    onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                    placeholder="Ví dụ: 0987654321"
                    className={`w-full h-10 px-3 rounded-lg bg-surface-container-low border font-body-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary ${
                      profileErrors.phone ? 'border-error' : 'border-outline-variant/60'
                    }`}
                  />
                  {profileErrors.phone && (
                    <p className="mt-1 text-label-xs font-label-xs text-error">{profileErrors.phone}</p>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-body-sm-medium text-body-sm-medium text-on-surface mb-1">
                    Phòng ban / Bộ phận tuyển dụng
                  </label>
                  <input
                    type="text"
                    value={profileData.department}
                    onChange={(e) => setProfileData({ ...profileData, department: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg bg-surface-container-low border border-outline-variant/60 font-body-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={isUpdatingAccount}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-body-sm-medium text-body-sm-medium shadow-sm transition-all disabled:opacity-60"
              >
                <span className={`material-symbols-outlined text-[18px] ${isUpdatingAccount ? 'animate-spin' : ''}`}>
                  {isUpdatingAccount ? 'sync' : 'save'}
                </span>
                <span>{isUpdatingAccount ? 'Đang cập nhật...' : 'Lưu thông tin hồ sơ HR'}</span>
              </button>
            </div>
          </form>

          {/* SECTION C: BẢO MẬT & ĐỔI MẬT KHẨU */}
          <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-outline-variant/30 space-y-5">
            <div className="flex items-center gap-2 border-b border-outline-variant/30 pb-3">
              <span className="material-symbols-outlined text-secondary text-[22px]">lock_reset</span>
              <div>
                <h2 className="font-headline-lg text-headline-lg text-on-surface font-semibold">
                  Bảo mật & Đổi mật khẩu HR
                </h2>
                <p className="font-label-xs text-label-xs text-outline">
                  Thay đổi mật khẩu đăng nhập định kỳ để đảm bảo an toàn truy cập dữ liệu tuyển dụng của tập đoàn.
                </p>
              </div>
            </div>

            {pwdError && (
              <div className="p-4 rounded-xl bg-error-container text-on-error-container text-body-sm flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px]">error</span>
                <span>{pwdError}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4 max-w-2xl">
              {/* Mật khẩu hiện tại */}
              <div>
                <label className="block font-body-sm-medium text-body-sm-medium text-on-surface mb-1">
                  Mật khẩu hiện tại <span className="text-error">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPwd ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Nhập mật khẩu hiện tại"
                    value={pwdData.currentPassword}
                    onChange={(e) => setPwdData({ ...pwdData, currentPassword: e.target.value })}
                    className={`w-full h-10 px-3 pr-10 rounded-lg bg-surface-container-low border font-body-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary ${
                      pwdErrors.currentPassword ? 'border-error' : 'border-outline-variant/60'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPwd(!showCurrentPwd)}
                    className="absolute right-3 top-2.5 text-outline hover:text-on-surface"
                    tabIndex={-1}
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {showCurrentPwd ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
                {pwdErrors.currentPassword && (
                  <p className="mt-1 text-label-xs font-label-xs text-error">{pwdErrors.currentPassword}</p>
                )}
              </div>

              {/* Mật khẩu mới */}
              <div>
                <label className="block font-body-sm-medium text-body-sm-medium text-on-surface mb-1">
                  Mật khẩu mới <span className="text-error">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showNewPwd ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Tối thiểu 6 ký tự"
                    value={pwdData.newPassword}
                    onChange={(e) => setPwdData({ ...pwdData, newPassword: e.target.value })}
                    className={`w-full h-10 px-3 pr-10 rounded-lg bg-surface-container-low border font-body-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary ${
                      pwdErrors.newPassword ? 'border-error' : 'border-outline-variant/60'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPwd(!showNewPwd)}
                    className="absolute right-3 top-2.5 text-outline hover:text-on-surface"
                    tabIndex={-1}
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {showNewPwd ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
                {pwdErrors.newPassword && (
                  <p className="mt-1 text-label-xs font-label-xs text-error">{pwdErrors.newPassword}</p>
                )}
              </div>

              {/* Xác nhận mật khẩu mới */}
              <div>
                <label className="block font-body-sm-medium text-body-sm-medium text-on-surface mb-1">
                  Xác nhận mật khẩu mới <span className="text-error">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPwd ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Nhập lại mật khẩu mới để xác nhận"
                    value={pwdData.confirmPassword}
                    onChange={(e) => setPwdData({ ...pwdData, confirmPassword: e.target.value })}
                    className={`w-full h-10 px-3 pr-10 rounded-lg bg-surface-container-low border font-body-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary ${
                      pwdErrors.confirmPassword ? 'border-error' : 'border-outline-variant/60'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPwd(!showConfirmPwd)}
                    className="absolute right-3 top-2.5 text-outline hover:text-on-surface"
                    tabIndex={-1}
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {showConfirmPwd ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
                {pwdErrors.confirmPassword && (
                  <p className="mt-1 text-label-xs font-label-xs text-error">{pwdErrors.confirmPassword}</p>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isUpdatingPwd}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-secondary hover:bg-secondary-container text-on-secondary font-body-sm-medium text-body-sm-medium shadow-sm transition-all disabled:opacity-60"
                >
                  <span className={`material-symbols-outlined text-[18px] ${isUpdatingPwd ? 'animate-spin' : ''}`}>
                    {isUpdatingPwd ? 'sync' : 'key'}
                  </span>
                  <span>{isUpdatingPwd ? 'Đang cập nhật mật khẩu...' : 'Cập nhật mật khẩu mới'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function HrSettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20 text-outline">
          <span className="material-symbols-outlined animate-spin text-[28px] mr-2">sync</span>
          <span>Đang tải cài đặt hệ thống...</span>
        </div>
      }
    >
      <HrSettingsContent />
    </Suspense>
  );
}
