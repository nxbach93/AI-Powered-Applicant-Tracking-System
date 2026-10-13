'use client';

import React, { useState, useEffect } from 'react';
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

export default function HrSettingsPage() {
  const { user, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'ai' | 'account'>('ai');

  // AI Criteria State
  const [aiSettings, setAiSettings] = useState<AiSettings>(DEFAULT_AI_SETTINGS);
  const [isAiSaved, setIsAiSaved] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // HR Account Form State
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    department: 'Ban Tuyển dụng & Phát triển Nhân tài (Talent Acquisition)',
  });
  const [isUpdatingAccount, setIsUpdatingAccount] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);

  // Load saved AI Settings from localStorage if available
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
      setFormData((prev) => ({
        ...prev,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
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

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingAccount(true);
    setAccountError(null);

    try {
      const res = await apiRequest('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          phone: formData.phone.trim() || null,
        }),
      });

      if (res.success) {
        setToastMessage('Cập nhật thông tin tài khoản HR thành công!');
        await refreshUser();
      } else {
        setAccountError(res.error?.message || 'Cập nhật tài khoản thất bại');
      }
    } catch (err: any) {
      setAccountError(err.message || 'Lỗi hệ thống khi cập nhật tài khoản');
    } finally {
      setIsUpdatingAccount(false);
    }
  };

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
            Cấu hình trọng số thuật toán so khớp CV, ngưỡng điểm thẩm định và thông tin chuyên viên phụ trách tuyển dụng.
          </p>
        </div>

        {/* Tab Toggle Buttons */}
        <div className="flex items-center bg-surface-container rounded-lg p-1 shadow-sm shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('ai')}
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
            onClick={() => setActiveTab('account')}
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
                  Thông tin định danh hiển thị trên biên bản phỏng vấn và các email gửi đến ứng viên.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-body-sm-medium text-body-sm-medium text-on-surface mb-1">
                  Họ và tên đệm <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder="Ví dụ: Nguyễn Thị"
                  className="w-full h-10 px-3 rounded-lg bg-surface-container-low border border-outline-variant/60 font-body-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block font-body-sm-medium text-body-sm-medium text-on-surface mb-1">
                  Tên <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="Ví dụ: Thu Trang"
                  className="w-full h-10 px-3 rounded-lg bg-surface-container-low border border-outline-variant/60 font-body-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block font-body-sm-medium text-body-sm-medium text-on-surface mb-1">
                  Địa chỉ Email đăng nhập
                </label>
                <input
                  type="email"
                  disabled
                  value={user?.email || ''}
                  className="w-full h-10 px-3 rounded-lg bg-surface-container-low border border-outline-variant/40 font-body-sm text-outline cursor-not-allowed"
                />
                <span className="font-label-xs text-label-xs text-outline">Email hệ thống không thể thay đổi</span>
              </div>

              <div>
                <label className="block font-body-sm-medium text-body-sm-medium text-on-surface mb-1">
                  Số điện thoại liên hệ
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Ví dụ: 0987654321"
                  className="w-full h-10 px-3 rounded-lg bg-surface-container-low border border-outline-variant/60 font-body-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-body-sm-medium text-body-sm-medium text-on-surface mb-1">
                  Phòng ban phụ trách
                </label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg bg-surface-container-low border border-outline-variant/60 font-body-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isUpdatingAccount}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-body-sm-medium text-body-sm-medium shadow-sm transition-all disabled:opacity-60"
            >
              <span className={`material-symbols-outlined text-[18px] ${isUpdatingAccount ? 'animate-spin' : ''}`}>
                {isUpdatingAccount ? 'sync' : 'save'}
              </span>
              <span>{isUpdatingAccount ? 'Đang cập nhật...' : 'Cập nhật thông tin tài khoản'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
