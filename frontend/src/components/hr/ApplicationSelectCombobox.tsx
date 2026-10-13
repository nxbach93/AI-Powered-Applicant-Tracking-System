'use client';

import React, { useState, useEffect, useRef, useTransition } from 'react';
import { getApplicationsByJobApi, HrApplicationItem } from '@/lib/application-api';

interface ApplicationSelectComboboxProps {
  value: string; // applicationId
  onChange: (applicationId: string, item?: HrApplicationItem | null) => void;
  preselectedItem?: HrApplicationItem | null;
  disabled?: boolean;
  required?: boolean;
  error?: string | null;
}

export function ApplicationSelectCombobox({
  value,
  onChange,
  preselectedItem = null,
  disabled = false,
  required = true,
  error = null
}: ApplicationSelectComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [items, setItems] = useState<HrApplicationItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<HrApplicationItem | null>(preselectedItem);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sync preselectedItem when it changes externally
  useEffect(() => {
    if (preselectedItem) {
      setSelectedItem(preselectedItem);
    }
  }, [preselectedItem]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Load eligible applications (excluding REJECTED, WITHDRAWN, HIRED)
  const fetchApplications = async (queryText = '') => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const res = await getApplicationsByJobApi('all', {
        search: queryText.trim() || undefined,
        excludeStatuses: 'REJECTED,WITHDRAWN,HIRED',
        limit: 50,
        sortBy: 'updatedAt',
        order: 'desc'
      });

      startTransition(() => {
        setItems(res.data);
        // If current value is set and selectedItem is not yet populated, find matching item
        if (value && !selectedItem) {
          const match = res.data.find((item) => item.id === value);
          if (match) setSelectedItem(match);
        }
      });
    } catch (err: any) {
      setFetchError(err.message || 'Không thể tải danh sách ứng viên');
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load when opened or mounted
  useEffect(() => {
    fetchApplications(debouncedSearch);
  }, [debouncedSearch]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (item: HrApplicationItem) => {
    setSelectedItem(item);
    onChange(item.id, item);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = () => {
    setSelectedItem(null);
    onChange('', null);
    setSearchTerm('');
    setTimeout(() => {
      searchInputRef.current?.focus();
      setIsOpen(true);
    }, 50);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SHORTLISTED':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-purple-100 text-purple-700 border border-purple-200">Vào vòng PV</span>;
      case 'INTERVIEW_SCHEDULED':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-blue-100 text-blue-700 border border-blue-200">Đã lên lịch</span>;
      case 'SCREENING':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-amber-100 text-amber-700 border border-amber-200">Đang sàng lọc</span>;
      case 'SUBMITTED':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-slate-100 text-slate-700 border border-slate-200">Mới nộp</span>;
      case 'INTERVIEWED':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-cyan-100 text-cyan-700 border border-cyan-200">Đã phỏng vấn</span>;
      default:
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-slate-100 text-slate-600 border border-slate-200">{status}</span>;
    }
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <label className="block text-xs font-semibold text-slate-700 mb-1">
        Chọn ứng viên ứng tuyển {required && <span className="text-rose-500">*</span>}
      </label>

      {/* Selected Application Card */}
      {selectedItem ? (
        <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center justify-between gap-3 transition-all">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-xs">
              {selectedItem.candidate.fullName ? selectedItem.candidate.fullName.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-slate-900 truncate">
                  {selectedItem.candidate.fullName}
                </span>
                {getStatusBadge(selectedItem.status)}
              </div>
              <div className="text-xs text-slate-500 truncate flex items-center gap-2 mt-0.5">
                <span>{selectedItem.candidate.email}</span>
                <span className="text-slate-300">•</span>
                <span className="font-medium text-blue-700">
                  {selectedItem.jobPosting?.title || 'Chưa rõ vị trí'}
                </span>
              </div>
            </div>
          </div>

          {!disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="text-xs font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg border border-transparent hover:border-rose-200 transition-all shrink-0"
              title="Đổi ứng viên khác"
            >
              Thay đổi
            </button>
          )}
        </div>
      ) : (
        /* Search Box Input */
        <div>
          <div className="relative">
            <input
              ref={searchInputRef}
              type="text"
              disabled={disabled}
              placeholder="Nhập tên ứng viên, email hoặc vị trí để tìm..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                if (!isOpen) setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              className={`w-full pl-9 pr-8 py-2.5 text-sm border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all ${
                error ? 'border-rose-300 bg-rose-50/30' : 'border-slate-300 bg-white'
              }`}
            />
            {/* Search Icon */}
            <div className="absolute left-3 top-3 text-slate-400 pointer-events-none">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Clear or Dropdown Chevron Icon */}
            {searchTerm ? (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            ) : (
              <div
                className="absolute right-3 top-3 text-slate-400 cursor-pointer"
                onClick={() => setIsOpen(!isOpen)}
              >
                <svg
                  className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Validation Error */}
      {error && <p className="text-xs text-rose-500 mt-1 font-medium">{error}</p>}

      {/* Dropdown Menu */}
      {isOpen && !selectedItem && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
            {isLoading ? (
              <div className="p-4 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                Đang tìm kiếm đơn ứng tuyển...
              </div>
            ) : fetchError ? (
              <div className="p-4 text-center text-xs text-rose-600">
                <p>{fetchError}</p>
                <button
                  type="button"
                  onClick={() => fetchApplications(debouncedSearch)}
                  className="mt-2 text-xs font-semibold text-blue-600 underline"
                >
                  Thử lại
                </button>
              </div>
            ) : items.length === 0 ? (
              <div className="p-5 text-center text-xs text-slate-500">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-2 text-slate-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <p className="font-semibold text-slate-700">Không tìm thấy đơn ứng tuyển nào</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Chỉ hiển thị các hồ sơ ứng viên hợp lệ chưa bị từ chối hoặc hủy.
                </p>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  className="p-3 hover:bg-blue-50/80 cursor-pointer flex items-center justify-between gap-3 transition-colors text-left"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs shrink-0 border border-slate-200">
                      {item.candidate.fullName ? item.candidate.fullName.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate">
                        {item.candidate.fullName}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {item.candidate.email}
                      </div>
                      <div className="text-[11px] text-blue-600 font-medium truncate mt-0.5">
                        💼 {item.jobPosting?.title || 'Vị trí chưa xác định'}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 flex flex-col items-end gap-1">
                    {getStatusBadge(item.status)}
                    {item.aiMatchScore !== null && item.aiMatchScore !== undefined && (
                      <span className="text-[10px] font-mono text-slate-400">
                        Match: {item.aiMatchScore.toFixed(0)}%
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
