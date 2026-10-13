'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { JobPosting, PaginationMeta } from '@/types/job';
import jobApi from '@/lib/services/job-api';
import { useAuth } from '@/lib/auth-context';

function JobListContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  // State bộ lọc từ URL query params
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [department, setDepartment] = useState(searchParams.get('department') || '');
  const [location, setLocation] = useState(searchParams.get('location') || '');
  const [employmentType, setEmploymentType] = useState(searchParams.get('employmentType') || '');
  const [quickFilter, setQuickFilter] = useState<'all' | 'high_salary' | 'remote' | 'tech'>('all');
  const [sortBy, setSortBy] = useState('newest');
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1', 10) || 1);

  // State dữ liệu
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({
    page: 1,
    limit: 9,
    total: 0,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Đồng bộ params lên URL
  const updateUrlParams = useCallback(
    (newParams: Record<string, string | number | undefined>) => {
      const current = new URLSearchParams(searchParams.toString());

      Object.entries(newParams).forEach(([key, value]) => {
        if (value !== undefined && value !== '' && value !== null) {
          current.set(key, String(value));
        } else {
          current.delete(key);
        }
      });

      router.push(`${pathname}?${current.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  // Fetch danh sách tin tuyển dụng từ API
  const fetchJobs = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await jobApi.getJobs({
        page,
        limit: 9,
        search: search.trim() || undefined,
        department: department || undefined,
        location: location || undefined,
        employmentType: employmentType || undefined,
        status: 'PUBLISHED',
      });

      if (res.success && res.data) {
        let fetchedJobs = res.data;

        // Apply local quick filter if selected
        if (quickFilter === 'high_salary') {
          fetchedJobs = fetchedJobs.filter((j) => Number(j.salaryMin || 0) >= 20000000 || Number(j.salaryMax || 0) >= 25000000);
        } else if (quickFilter === 'remote') {
          fetchedJobs = fetchedJobs.filter((j) => (j.location || '').toLowerCase().includes('remote') || (j.employmentType || '').toLowerCase().includes('remote'));
        } else if (quickFilter === 'tech') {
          fetchedJobs = fetchedJobs.filter((j) => (j.department || '').toLowerCase().includes('kỹ thuật') || (j.department || '').toLowerCase().includes('it') || (j.title || '').toLowerCase().includes('developer'));
        }

        // Apply local sorting
        if (sortBy === 'salary_desc') {
          fetchedJobs = [...fetchedJobs].sort((a, b) => Number(b.salaryMax || 0) - Number(a.salaryMax || 0));
        } else if (sortBy === 'newest') {
          fetchedJobs = [...fetchedJobs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        }

        setJobs(fetchedJobs);
        if (res.meta) {
          setMeta(res.meta);
        }
      } else {
        setError(res.error?.message || 'Không thể tải danh sách việc làm');
      }
    } catch {
      setError('Đã xảy ra lỗi kết nối khi tải danh sách việc làm. Vui lòng thử lại sau.');
    } finally {
      setIsLoading(false);
    }
  }, [page, search, department, location, employmentType, quickFilter, sortBy]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleFilterSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setPage(1);
    updateUrlParams({
      search: search.trim() || undefined,
      department: department || undefined,
      location: location || undefined,
      employmentType: employmentType || undefined,
      page: 1,
    });
  };

  const handleFilterReset = () => {
    setSearch('');
    setDepartment('');
    setLocation('');
    setEmploymentType('');
    setQuickFilter('all');
    setSortBy('newest');
    setPage(1);
    router.push(pathname, { scroll: false });
  };

  const formatSalary = (min?: number | string | null, max?: number | string | null) => {
    const numMin = Number(min);
    const numMax = Number(max);
    if (!numMin && !numMax) return 'Thỏa thuận';
    if (numMin && numMax) return `${(numMin / 1000000).toFixed(0)} - ${(numMax / 1000000).toFixed(0)} triệu VNĐ`;
    if (numMin) return `Từ ${(numMin / 1000000).toFixed(0)} triệu VNĐ`;
    return `Đến ${(numMax / 1000000).toFixed(0)} triệu VNĐ`;
  };

  return (
    <div className="w-full pt-16 bg-background flex-1 text-on-surface">
      {/* Immersive AI Hero Banner Section */}
      <section className="relative w-full bg-gradient-to-b from-primary via-primary-container to-[#172554] text-on-primary px-gutter md:px-gutter-desktop pt-10 pb-20 overflow-hidden shadow-sm">
        <div className="absolute inset-0 opacity-15 pointer-events-none">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <radialGradient cx="50%" cy="30%" id="ai-glow" r="60%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
              </radialGradient>
            </defs>
            <rect fill="url(#ai-glow)" height="100%" width="100%" />
            <circle cx="15%" cy="30%" fill="currentColor" opacity="0.25" r="220" className="text-secondary" />
            <circle cx="85%" cy="60%" fill="currentColor" opacity="0.2" r="280" className="text-tertiary-fixed-dim" />
          </svg>
        </div>

        <div className="relative max-w-5xl mx-auto flex flex-col items-center text-center space-y-space-md z-10">
          <div className="inline-flex items-center gap-space-xs px-space-md py-1 rounded-full bg-surface-container-lowest/15 backdrop-blur-md text-surface-bright text-[12px] font-label-sm shadow-sm">
            <span className="w-2 h-2 rounded-full bg-tertiary-fixed animate-pulse" />
            <span className="tracking-wide">Nền tảng Tuyển dụng Thông minh ATS & Trí tuệ Nhân tạo</span>
          </div>

          <h1 className="font-headline-2xl text-[28px] md:text-[38px] lg:text-[44px] leading-tight font-bold text-surface-container-lowest tracking-tight">
            Khám phá cơ hội nghề nghiệp cùng{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-secondary-fixed via-primary-fixed to-tertiary-fixed">
              Trí tuệ Nhân tạo
            </span>
          </h1>

          <p className="max-w-2xl text-surface-bright/90 font-body-base text-body-base md:text-[15px] leading-relaxed">
            Hàng trăm vị trí việc làm chất lượng cao từ các doanh nghiệp hàng đầu. Hệ thống AI tự động phân tích và tính toán độ tương thích CV của bạn theo thời gian thực.
          </p>

          <div className="flex items-center gap-6 pt-2 text-surface-bright/80 font-body-sm text-body-sm flex-wrap justify-center">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px] text-tertiary-fixed">verified</span>
              <span>
                <strong>{meta.total || jobs.length}</strong> Việc làm đang mở
              </span>
            </div>
            <span className="w-1 h-1 rounded-full bg-surface-bright/40" />
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px] text-secondary-fixed">auto_awesome</span>
              <span>
                Khớp lệnh AI chính xác <strong>98%</strong>
              </span>
            </div>
            <span className="w-1 h-1 rounded-full bg-surface-bright/40 hidden sm:inline-block" />
            <div className="items-center gap-1.5 hidden sm:flex">
              <span className="material-symbols-outlined text-[18px] text-primary-fixed">schedule</span>
              <span>Cập nhật liên tục</span>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Floating Search & Filter Centerpiece */}
      <div className="w-full px-gutter md:px-gutter-desktop -mt-10 max-w-6xl mx-auto z-20 relative">
        <form
          onSubmit={handleFilterSubmit}
          className="bg-surface-container-lowest rounded-xl p-space-lg shadow-xl shadow-on-surface/5 flex flex-col gap-space-md border border-outline-variant/30"
        >
          {/* Main Search Row */}
          <div className="flex flex-col md:flex-row gap-space-sm items-center">
            <div className="relative flex-1 w-full flex items-center bg-surface-container-low rounded-xl px-space-md py-1.5 focus-within:bg-surface-container-lowest focus-within:ring-2 focus-within:ring-primary transition-all">
              <span className="material-symbols-outlined text-outline text-[22px] mr-space-sm">search</span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm kiếm vị trí công việc, kỹ năng, chuyên môn (vd: Java, React, Node.js, AI)..."
                className="w-full bg-transparent border-0 outline-none font-body-base text-body-base text-on-surface placeholder:text-outline"
              />
              <span className="hidden lg:inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-tabular-mono bg-surface-container-highest text-on-surface-variant font-semibold">
                ⌘K
              </span>
            </div>
            <button
              type="submit"
              className="w-full md:w-auto h-11 px-space-xl bg-primary hover:bg-primary-container active:scale-[0.99] text-on-primary font-body-base-medium text-body-base-medium rounded-xl flex items-center justify-center gap-space-xs transition-all shadow-md shadow-primary/20 shrink-0"
            >
              <span className="material-symbols-outlined text-[20px]">search</span>
              <span>Tìm kiếm</span>
            </button>
          </div>

          {/* Advanced Secondary Filters (Selectors) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-md pt-space-xs">
            {/* Dept Filter */}
            <div className="flex flex-col gap-1">
              <label className="font-label-xs text-label-xs text-outline font-semibold uppercase tracking-wider flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">domain</span>
                Phòng ban / Bộ phận
              </label>
              <div className="relative bg-surface-container-low rounded-lg hover:bg-surface-container transition-colors">
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full bg-transparent py-2.5 pl-3 pr-8 font-body-sm text-body-sm text-on-surface rounded-lg appearance-none outline-none cursor-pointer"
                >
                  <option value="">Tất cả phòng ban</option>
                  <option value="Kỹ thuật Công nghệ">Kỹ thuật Công nghệ (IT)</option>
                  <option value="Phát triển Phần mềm">Phát triển Phần mềm</option>
                  <option value="Trí tuệ Nhân tạo">Trung tâm Trí tuệ Nhân tạo</option>
                  <option value="Sản phẩm & Thiết kế">Sản phẩm & Thiết kế</option>
                  <option value="Marketing & Truyền thông">Marketing & Truyền thông</option>
                  <option value="Tài chính - Kế toán">Tài chính - Kế toán</option>
                </select>
                <span className="material-symbols-outlined text-[18px] text-outline absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                  expand_more
                </span>
              </div>
            </div>

            {/* Location Filter */}
            <div className="flex flex-col gap-1">
              <label className="font-label-xs text-label-xs text-outline font-semibold uppercase tracking-wider flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">location_on</span>
                Địa điểm làm việc
              </label>
              <div className="relative bg-surface-container-low rounded-lg hover:bg-surface-container transition-colors">
                <select
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full bg-transparent py-2.5 pl-3 pr-8 font-body-sm text-body-sm text-on-surface rounded-lg appearance-none outline-none cursor-pointer"
                >
                  <option value="">Tất cả địa điểm</option>
                  <option value="Hà Nội">Hà Nội</option>
                  <option value="Hồ Chí Minh">TP. Hồ Chí Minh</option>
                  <option value="Đà Nẵng">Đà Nẵng</option>
                  <option value="Remote">Remote (Từ xa)</option>
                  <option value="Hybrid">Hybrid linh hoạt</option>
                </select>
                <span className="material-symbols-outlined text-[18px] text-outline absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                  expand_more
                </span>
              </div>
            </div>

            {/* Employment Type Filter */}
            <div className="flex flex-col gap-1">
              <label className="font-label-xs text-label-xs text-outline font-semibold uppercase tracking-wider flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">work_history</span>
                Hình thức làm việc
              </label>
              <div className="relative bg-surface-container-low rounded-lg hover:bg-surface-container transition-colors">
                <select
                  value={employmentType}
                  onChange={(e) => setEmploymentType(e.target.value)}
                  className="w-full bg-transparent py-2.5 pl-3 pr-8 font-body-sm text-body-sm text-on-surface rounded-lg appearance-none outline-none cursor-pointer"
                >
                  <option value="">Tất cả hình thức</option>
                  <option value="FULL_TIME">Toàn thời gian (Full-time)</option>
                  <option value="PART_TIME">Bán thời gian (Part-time)</option>
                  <option value="CONTRACT">Hợp đồng ngắn hạn</option>
                  <option value="INTERNSHIP">Thực tập sinh (Intern)</option>
                </select>
                <span className="material-symbols-outlined text-[18px] text-outline absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                  expand_more
                </span>
              </div>
            </div>
          </div>

          {/* Quick AI Tags & Pill Shortcuts */}
          <div className="pt-2 flex flex-wrap items-center gap-space-xs">
            <span className="font-label-xs text-label-xs text-on-surface-variant font-medium mr-1 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px] text-secondary">tune</span>
              Bộ lọc nhanh:
            </span>
            <button
              type="button"
              onClick={() => setQuickFilter('all')}
              className={`flex items-center gap-1 px-3 py-1 rounded-full text-[12px] font-body-sm-medium transition-all ${
                quickFilter === 'all'
                  ? 'bg-secondary text-on-secondary shadow-sm'
                  : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              <span>Tất cả</span>
            </button>
            <button
              type="button"
              onClick={() => setQuickFilter('tech')}
              className={`flex items-center gap-1 px-3 py-1 rounded-full text-[12px] font-body-sm-medium transition-all ${
                quickFilter === 'tech'
                  ? 'bg-secondary text-on-secondary shadow-sm'
                  : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">terminal</span>
              <span>Kỹ thuật Công nghệ</span>
            </button>
            <button
              type="button"
              onClick={() => setQuickFilter('high_salary')}
              className={`flex items-center gap-1 px-3 py-1 rounded-full text-[12px] font-body-sm transition-all ${
                quickFilter === 'high_salary'
                  ? 'bg-secondary text-on-secondary shadow-sm'
                  : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              <span className="material-symbols-outlined text-[14px] text-tertiary">payments</span>
              <span>Lương trên 20 triệu</span>
            </button>
            <button
              type="button"
              onClick={() => setQuickFilter('remote')}
              className={`flex items-center gap-1 px-3 py-1 rounded-full text-[12px] font-body-sm transition-all ${
                quickFilter === 'remote'
                  ? 'bg-secondary text-on-secondary shadow-sm'
                  : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              <span className="material-symbols-outlined text-[14px] text-primary">home_work</span>
              <span>Remote / Linh hoạt</span>
            </button>

            <button
              type="button"
              onClick={handleFilterReset}
              className="ml-auto text-primary hover:text-primary-container font-label-sm text-label-sm flex items-center gap-0.5"
            >
              <span>Xóa bộ lọc</span>
              <span className="material-symbols-outlined text-[14px]">refresh</span>
            </button>
          </div>
        </form>
      </div>

      {/* Workspace & Results Header Area */}
      <div className="w-full max-w-6xl mx-auto px-gutter md:px-gutter-desktop mt-8 mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-space-md">
        <div className="flex items-center gap-space-sm">
          <div className="w-2.5 h-2.5 rounded-full bg-primary" />
          <p className="font-headline-lg text-headline-lg text-on-surface font-bold">
            Tìm thấy <span className="text-primary font-tabular-mono font-bold">{jobs.length}</span> vị trí phù hợp
          </p>
          {user && (
            <span className="px-2 py-0.5 rounded bg-surface-container-highest text-on-surface-variant text-[11px] font-tabular-mono hidden md:inline">
              Đồng bộ hồ sơ {user.firstName || user.email.split('@')[0]}
            </span>
          )}
        </div>

        {/* Sorting Toolbar */}
        <div className="flex items-center gap-space-xs text-on-surface-variant">
          <span className="font-body-sm text-body-sm shrink-0">Sắp xếp theo:</span>
          <div className="relative bg-surface-container-lowest rounded-lg shadow-sm border border-outline-variant/30">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-transparent pl-3 pr-8 py-1.5 font-body-sm-medium text-body-sm-medium text-on-surface rounded-lg appearance-none outline-none cursor-pointer"
            >
              <option value="newest">Mới đăng nhất</option>
              <option value="salary_desc">Mức lương cao nhất</option>
            </select>
            <span className="material-symbols-outlined text-[18px] text-outline absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
              unfold_more
            </span>
          </div>
        </div>
      </div>

      {/* Job Cards 3-Column Grid */}
      <main className="w-full max-w-6xl mx-auto px-gutter md:px-gutter-desktop pb-16">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter-desktop animate-pulse">
            {[1, 2, 3, 4, 5, 6].map((idx) => (
              <div key={idx} className="h-64 rounded-xl bg-surface-container-lowest p-6 border border-outline-variant/30 space-y-4">
                <div className="h-4 w-28 bg-surface-container-low rounded" />
                <div className="h-6 w-3/4 bg-surface-container-low rounded" />
                <div className="h-4 w-1/2 bg-surface-container-low rounded" />
                <div className="h-16 bg-surface-container-low rounded" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-8 rounded-xl bg-error-container text-on-error-container text-center space-y-3">
            <span className="material-symbols-outlined text-[36px]">error</span>
            <p className="font-body-base text-body-base">{error}</p>
            <button
              onClick={fetchJobs}
              className="px-4 py-2 rounded-lg bg-error text-on-error font-body-sm-medium text-body-sm-medium inline-flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">refresh</span>
              <span>Thử lại</span>
            </button>
          </div>
        ) : jobs.length === 0 ? (
          <div className="bg-surface-container-lowest rounded-xl p-12 text-center space-y-4 border border-outline-variant/30">
            <span className="material-symbols-outlined text-[48px] text-outline">search_off</span>
            <h3 className="font-headline-lg text-headline-lg font-bold text-on-surface">Không tìm thấy vị trí tuyển dụng phù hợp</h3>
            <p className="font-body-base text-body-base text-on-surface-variant max-w-md mx-auto">
              Hãy thử điều chỉnh từ khóa tìm kiếm hoặc xóa bớt các bộ lọc để xem toàn bộ danh sách việc làm.
            </p>
            <button
              type="button"
              onClick={handleFilterReset}
              className="px-5 py-2.5 rounded-xl bg-primary text-on-primary font-body-sm-medium text-body-sm-medium inline-flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">refresh</span>
              <span>Xóa bộ lọc tìm kiếm</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter-desktop">
            {jobs.map((job) => (
              <article
                key={job.id}
                className="bg-surface-container-lowest rounded-xl p-space-lg flex flex-col justify-between shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all group relative border border-outline-variant/30"
              >
                <div className="space-y-space-md">
                  {/* Top Metas & Department Badge */}
                  <div className="flex items-start justify-between gap-space-xs">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-body-sm-medium bg-primary-fixed text-on-primary-fixed">
                        {job.department || 'Công nghệ'}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-label-xs bg-surface-container text-on-surface-variant">
                        {job.employmentType || 'Toàn thời gian'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed text-[11px] font-tabular-mono font-semibold shadow-xs">
                      <span className="material-symbols-outlined text-[13px] text-secondary">auto_awesome</span>
                      <span>AI Ready</span>
                    </div>
                  </div>

                  {/* Title & Department */}
                  <div>
                    <h2 className="font-headline-lg text-headline-lg text-on-surface font-bold group-hover:text-primary transition-colors line-clamp-2">
                      <Link href={`/jobs/${job.id}`}>{job.title}</Link>
                    </h2>
                    <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px] text-outline">corporate_fare</span>
                      <span>TalentPulse Enterprise ATS</span>
                    </p>
                  </div>

                  {/* Location & Salary */}
                  <div className="flex items-center justify-between text-body-sm text-body-sm border-y border-outline-variant/20 py-2">
                    <div className="flex items-center gap-1 text-on-surface-variant">
                      <span className="material-symbols-outlined text-[16px] text-outline">location_on</span>
                      <span>{job.location || 'Hà Nội'}</span>
                    </div>
                    <div className="flex items-center gap-1 font-tabular-mono font-bold text-primary">
                      <span className="material-symbols-outlined text-[16px]">payments</span>
                      <span>{formatSalary(job.salaryMin, job.salaryMax)}</span>
                    </div>
                  </div>

                  {/* Requirements Snippet */}
                  <p className="font-body-sm text-body-sm text-outline line-clamp-3">
                    {job.description || job.requirements || 'Tham gia đội ngũ phát triển sản phẩm công nghệ cao với chế độ đãi ngộ cạnh tranh.'}
                  </p>
                </div>

                {/* Footer Action */}
                <div className="pt-4 mt-2 flex items-center justify-between border-t border-outline-variant/20">
                  <span className="font-label-xs text-label-xs text-outline">
                    Đăng {new Date(job.createdAt).toLocaleDateString('vi-VN')}
                  </span>
                  <Link
                    href={`/jobs/${job.id}`}
                    className="inline-flex items-center gap-1 text-primary font-body-sm-medium text-body-sm-medium hover:text-primary-container group/link"
                  >
                    <span>Xem chi tiết</span>
                    <span className="material-symbols-outlined text-[16px] group-hover/link:translate-x-0.5 transition-transform">
                      arrow_forward
                    </span>
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* Pagination Controls */}
        {meta.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-10">
            <button
              disabled={page <= 1}
              onClick={() => {
                setPage((p) => Math.max(1, p - 1));
                updateUrlParams({ page: Math.max(1, page - 1) });
              }}
              className="px-3.5 py-2 rounded-lg bg-surface-container-lowest border border-outline-variant/40 text-on-surface font-body-sm-medium text-body-sm-medium disabled:opacity-40 transition-colors"
            >
              Trang trước
            </button>
            <span className="px-3 py-2 font-tabular-mono text-body-sm text-body-sm text-on-surface">
              {page} / {meta.totalPages}
            </span>
            <button
              disabled={page >= meta.totalPages}
              onClick={() => {
                setPage((p) => Math.min(meta.totalPages, p + 1));
                updateUrlParams({ page: Math.min(meta.totalPages, page + 1) });
              }}
              className="px-3.5 py-2 rounded-lg bg-surface-container-lowest border border-outline-variant/40 text-on-surface font-body-sm-medium text-body-sm-medium disabled:opacity-40 transition-colors"
            >
              Trang sau
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

export default function JobsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-24 text-outline">
          <span className="material-symbols-outlined animate-spin text-[32px] mr-2">sync</span>
          <span>Đang tải danh sách việc làm...</span>
        </div>
      }
    >
      <JobListContent />
    </Suspense>
  );
}
