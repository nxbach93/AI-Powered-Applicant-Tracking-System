import React from 'react';

interface JobFilterBarProps {
  search: string;
  department: string;
  location: string;
  employmentType: string;
  onSearchChange: (value: string) => void;
  onDepartmentChange: (value: string) => void;
  onLocationChange: (value: string) => void;
  onEmploymentTypeChange: (value: string) => void;
  onSubmit: (e?: React.FormEvent) => void;
  onReset: () => void;
  totalResults?: number;
}

export function JobFilterBar({
  search,
  department,
  location,
  employmentType,
  onSearchChange,
  onDepartmentChange,
  onLocationChange,
  onEmploymentTypeChange,
  onSubmit,
  onReset,
  totalResults,
}: JobFilterBarProps) {
  const hasActiveFilters = Boolean(
    search.trim() || department || location || employmentType
  );

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-sm shadow-slate-100 mb-8">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(e);
        }}
        className="space-y-4"
      >
        {/* Hàng 1: Ô tìm kiếm chính */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Tìm kiếm vị trí công việc, kỹ năng, chuyên môn..."
            className="w-full pl-11 pr-24 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-transparent transition-all"
          />
          <button
            type="submit"
            className="absolute right-2 top-2 bottom-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-sm shadow-blue-500/20 transition-all flex items-center gap-1.5"
          >
            <span>Tìm kiếm</span>
          </button>
        </div>

        {/* Hàng 2: Các bộ lọc dropdown */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Lọc theo Phòng ban */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Phòng ban / Bộ phận
            </label>
            <select
              value={department}
              onChange={(e) => onDepartmentChange(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            >
              <option value="">Tất cả phòng ban</option>
              <option value="Kỹ thuật Công nghệ">Kỹ thuật Công nghệ</option>
              <option value="Phát triển Phần mềm">Phát triển Phần mềm</option>
              <option value="AI Research Lab">AI Research Lab</option>
              <option value="Sản phẩm & Thiết kế">Sản phẩm & Thiết kế</option>
              <option value="Marketing & Truyền thông">Marketing & Truyền thông</option>
              <option value="Nhân sự & Vận hành">Nhân sự & Vận hành</option>
            </select>
          </div>

          {/* Lọc theo Địa điểm */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Địa điểm làm việc
            </label>
            <select
              value={location}
              onChange={(e) => onLocationChange(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            >
              <option value="">Tất cả địa điểm</option>
              <option value="Hà Nội">Hà Nội</option>
              <option value="TP. Hồ Chí Minh">TP. Hồ Chí Minh</option>
              <option value="Đà Nẵng">Đà Nẵng</option>
              <option value="Remote">Từ xa (Remote)</option>
              <option value="Hybrid">Hybrid (Linh hoạt)</option>
            </select>
          </div>

          {/* Lọc theo Hình thức làm việc */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Hình thức làm việc
            </label>
            <select
              value={employmentType}
              onChange={(e) => onEmploymentTypeChange(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            >
              <option value="">Tất cả hình thức</option>
              <option value="FULL_TIME">Toàn thời gian (Full-time)</option>
              <option value="PART_TIME">Bán thời gian (Part-time)</option>
              <option value="CONTRACT">Hợp đồng (Contract)</option>
              <option value="INTERNSHIP">Thực tập (Internship)</option>
              <option value="REMOTE">Làm việc từ xa (Remote)</option>
            </select>
          </div>
        </div>

        {/* Thanh trạng thái bộ lọc & nút reset */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
          <div className="text-slate-500">
            {totalResults !== undefined ? (
              <span>
                Tìm thấy <strong className="text-slate-900 font-bold">{totalResults}</strong> vị trí phù hợp
              </span>
            ) : (
              <span>Lọc việc làm phù hợp với năng lực của bạn</span>
            )}
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1 text-slate-600 hover:text-red-600 font-medium transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span>Xóa bộ lọc</span>
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

export default JobFilterBar;
