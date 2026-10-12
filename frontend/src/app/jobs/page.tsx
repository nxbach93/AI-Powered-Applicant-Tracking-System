'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { JobPosting, PaginationMeta } from '@/types/job';
import jobApi from '@/lib/services/job-api';
import { JobCard } from '@/components/jobs/JobCard';
import { JobFilterBar } from '@/components/jobs/JobFilterBar';

function JobListContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // State bộ lọc khởi tạo từ URL query params
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [department, setDepartment] = useState(searchParams.get('department') || '');
  const [location, setLocation] = useState(searchParams.get('location') || '');
  const [employmentType, setEmploymentType] = useState(searchParams.get('employmentType') || '');
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1', 10) || 1);

  // State dữ liệu & trạng thái tải
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
      });

      if (res.success && res.data) {
        setJobs(res.data);
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
  }, [page, search, department, location, employmentType]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleFilterSubmit = () => {
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
    setPage(1);
    router.push(pathname, { scroll: false });
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > meta.totalPages) return;
    setPage(newPage);
    updateUrlParams({ page: newPage });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16">
      {/* Banner Hero */}
      <section className="bg-gradient-to-b from-blue-900 via-blue-800 to-slate-900 text-white py-14 sm:py-20 px-4 sm:px-6 lg:px-8 border-b border-blue-950">
        <div className="max-w-7xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-400/30 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Nền tảng Tuyển dụng Thông minh ATS</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white max-w-3xl mx-auto leading-tight">
            Khám phá cơ hội nghề nghiệp cùng <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-sky-300 to-indigo-300">Trí tuệ Nhân tạo</span>
          </h1>

          <p className="text-sm sm:text-base text-blue-100/80 max-w-2xl mx-auto leading-relaxed">
            Hàng trăm vị trí việc làm chất lượng cao từ các doanh nghiệp hàng đầu. Ứng tuyển ngay để được hệ thống tự động bóc tách kỹ năng và xếp hạng CV chính xác.
          </p>
        </div>
      </section>

      {/* Thân trang: Bộ lọc & Lưới việc làm */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6">
        {/* Thanh tìm kiếm & bộ lọc */}
        <JobFilterBar
          search={search}
          department={department}
          location={location}
          employmentType={employmentType}
          onSearchChange={setSearch}
          onDepartmentChange={(val) => {
            setDepartment(val);
            setPage(1);
            updateUrlParams({ department: val || undefined, page: 1 });
          }}
          onLocationChange={(val) => {
            setLocation(val);
            setPage(1);
            updateUrlParams({ location: val || undefined, page: 1 });
          }}
          onEmploymentTypeChange={(val) => {
            setEmploymentType(val);
            setPage(1);
            updateUrlParams({ employmentType: val || undefined, page: 1 });
          }}
          onSubmit={handleFilterSubmit}
          onReset={handleFilterReset}
          totalResults={meta.total}
        />

        {/* Trạng thái Lỗi */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center mb-8">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-red-900 mb-1">Không thể tải dữ liệu</h3>
            <p className="text-sm text-red-700 max-w-md mx-auto mb-4">{error}</p>
            <button
              onClick={fetchJobs}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all"
            >
              Thử lại
            </button>
          </div>
        )}

        {/* Trạng thái Đang tải (Skeletons) */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="bg-white border border-slate-200/80 rounded-2xl p-6 animate-pulse space-y-4"
              >
                <div className="flex gap-2">
                  <div className="h-5 w-24 bg-slate-200 rounded-md" />
                  <div className="h-5 w-20 bg-slate-200 rounded-md" />
                </div>
                <div className="h-6 w-3/4 bg-slate-200 rounded-md" />
                <div className="space-y-2">
                  <div className="h-4 w-full bg-slate-100 rounded" />
                  <div className="h-4 w-5/6 bg-slate-100 rounded" />
                </div>
                <div className="pt-4 border-t border-slate-100 flex justify-between">
                  <div className="h-4 w-28 bg-slate-200 rounded" />
                  <div className="h-4 w-16 bg-slate-200 rounded" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Trạng thái Không có kết quả (Empty State) */}
        {!isLoading && !error && jobs.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center max-w-lg mx-auto shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              Không tìm thấy vị trí tuyển dụng phù hợp
            </h3>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              Hãy thử thay đổi từ khóa tìm kiếm hoặc chọn lại các tiêu chí lọc phòng ban và địa điểm để tìm kiếm cơ hội khác.
            </p>
            <button
              onClick={handleFilterReset}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-all"
            >
              Xem tất cả việc làm
            </button>
          </div>
        )}

        {/* Danh sách Thẻ Việc làm (Job Grid) */}
        {!isLoading && !error && jobs.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {jobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>

            {/* Phân trang (Pagination) */}
            {meta.totalPages > 1 && (
              <div className="mt-12 flex items-center justify-center gap-2">
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page <= 1}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium text-xs hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  aria-label="Trang trước"
                >
                  &larr; Trước
                </button>

                <div className="flex items-center gap-1.5">
                  {Array.from({ length: meta.totalPages }, (_, index) => index + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => handlePageChange(p)}
                      className={`w-9 h-9 rounded-xl text-xs font-semibold transition-all ${
                        p === page
                          ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page >= meta.totalPages}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium text-xs hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  aria-label="Trang kế tiếp"
                >
                  Sau &rarr;
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default function JobsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <JobListContent />
    </Suspense>
  );
}
