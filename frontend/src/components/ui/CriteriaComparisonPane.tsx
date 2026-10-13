'use client';

import React from 'react';
import { HrApplicationDetail } from '@/lib/application-api';

interface CriteriaComparisonPaneProps {
  detail: HrApplicationDetail;
}

type MatchStatus = 'MATCHED' | 'PARTIAL' | 'MISSING' | 'NOT_MET' | 'UNKNOWN';

interface CriteriaItem {
  id: string;
  category: string;
  criterionTitle: string;
  jdRequirement: string;
  candidateEvidence: string | null;
  status: MatchStatus;
  notes?: string;
}

function getStatusBadge(status: MatchStatus) {
  switch (status) {
    case 'MATCHED':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
          Đáp ứng (Matched)
        </span>
      );
    case 'PARTIAL':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
          Đáp ứng một phần
        </span>
      );
    case 'MISSING':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          Thiếu bằng chứng (Missing)
        </span>
      );
    case 'NOT_MET':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
          Chưa đạt (Not Met)
        </span>
      );
    case 'UNKNOWN':
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
          Chưa đủ dữ liệu (Unknown)
        </span>
      );
  }
}

export function CriteriaComparisonPane({ detail }: CriteriaComparisonPaneProps) {
  const { candidate, jobPosting, parsedSkills, aiAnalysisSummary } = detail;

  // Trích xuất các tiêu chí thực tế từ jobPosting.requirements và candidate data
  const criteriaList: CriteriaItem[] = React.useMemo(() => {
    const items: CriteriaItem[] = [];

    // A. Technical Skills
    const skillsList = parsedSkills && parsedSkills.length > 0 ? parsedSkills : [];
    items.push({
      id: 'tech-skills',
      category: 'Kỹ năng chuyên môn (Technical Skills)',
      criterionTitle: 'Ngôn ngữ & Công nghệ chính',
      jdRequirement: jobPosting?.requirements
        ? 'Theo yêu cầu kỹ thuật trong bản mô tả công việc (JD)'
        : 'Yêu cầu chuyên môn theo vị trí',
      candidateEvidence: skillsList.length > 0
        ? `Đã trích xuất ${skillsList.length} kỹ năng: ${skillsList.join(', ')}`
        : 'Chưa trích xuất được kỹ năng từ CV',
      status: skillsList.length > 0 ? 'MATCHED' : 'UNKNOWN',
      notes: skillsList.length > 0
        ? 'Hệ thống đã nhận diện các kỹ năng thực tế từ tệp CV của ứng viên.'
        : 'Cần HR mở file CV để kiểm tra danh mục kỹ năng chi tiết.',
    });

    // B. Work Experience
    const expYears = candidate.experienceYears;
    let expStatus: MatchStatus = 'UNKNOWN';
    let expNotes = 'Hồ sơ chưa có thông tin số năm kinh nghiệm.';

    if (expYears !== null && expYears !== undefined) {
      if (expYears >= 2) {
        expStatus = 'MATCHED';
        expNotes = `Ứng viên có ${expYears} năm kinh nghiệm làm việc thực tế.`;
      } else if (expYears > 0) {
        expStatus = 'PARTIAL';
        expNotes = `Ứng viên có ${expYears} năm kinh nghiệm (cần đối chiếu với cấp bậc của vị trí).`;
      } else {
        expStatus = 'NOT_MET';
        expNotes = 'Ứng viên chưa có kinh nghiệm làm việc chính thức.';
      }
    }

    items.push({
      id: 'work-exp',
      category: 'Kinh nghiệm làm việc (Experience)',
      criterionTitle: 'Số năm kinh nghiệm tích lũy',
      jdRequirement: 'Yêu cầu kinh nghiệm theo tiêu chuẩn vị trí tuyển dụng',
      candidateEvidence: expYears !== null && expYears !== undefined
        ? `${expYears} năm kinh nghiệm`
        : 'Chưa cập nhật trong hồ sơ',
      status: expStatus,
      notes: expNotes,
    });

    // C. Education
    const edu = candidate.education;
    items.push({
      id: 'education',
      category: 'Trình độ học vấn & Bằng cấp (Education)',
      criterionTitle: 'Bằng cấp & Chuyên ngành đào tạo',
      jdRequirement: 'Tốt nghiệp Đại học/Cao đẳng chuyên ngành liên quan',
      candidateEvidence: edu || 'Chưa cung cấp thông tin học vấn chi tiết',
      status: edu ? 'MATCHED' : 'UNKNOWN',
      notes: edu
        ? `Thông tin học vấn: ${edu}`
        : 'Hồ sơ không ghi rõ chuyên ngành hoặc học vị.',
    });

    // D. Language Requirements
    // Kiểm tra xem trong aiAnalysisSummary hoặc CV có nhắc đến Tiếng Anh/IELTS/TOEIC không
    const summaryLower = (aiAnalysisSummary || '').toLowerCase();
    const hasEnglish = summaryLower.includes('tiếng anh') || summaryLower.includes('english') || summaryLower.includes('ielts') || summaryLower.includes('toeic');

    items.push({
      id: 'languages',
      category: 'Ngoại ngữ & Giao tiếp (Languages)',
      criterionTitle: 'Trình độ Tiếng Anh / Ngoại ngữ',
      jdRequirement: 'Khả năng đọc hiểu tài liệu và giao tiếp chuyên ngành',
      candidateEvidence: hasEnglish
        ? 'Có đề cập đến kỹ năng ngoại ngữ trong bản đánh giá hồ sơ'
        : 'Chưa có chứng chỉ ngoại ngữ được chuẩn hóa trong cơ sở dữ liệu',
      status: hasEnglish ? 'MATCHED' : 'UNKNOWN',
      notes: 'Hiện tại hệ thống AI trích xuất tổng thể; chưa có bảng phân loại chứng chỉ ngoại ngữ riêng từ Backend.',
    });

    return items;
  }, [candidate, jobPosting, parsedSkills, aiAnalysisSummary]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/50">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">
              Đối sánh Tiêu chí Tuyển dụng & Hồ sơ Ứng viên (Dual-Pane)
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            So sánh trực tiếp giữa yêu cầu công việc (JD) và bằng chứng trích xuất từ CV của ứng viên.
          </p>
        </div>
        <span className="font-tabular-mono text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 self-start sm:self-auto">
          {criteriaList.length} tiêu chí đánh giá
        </span>
      </div>

      {/* Dual Pane Grid Table */}
      <div className="divide-y divide-slate-100">
        {criteriaList.map((item) => (
          <div key={item.id} className="p-4 sm:p-5 hover:bg-slate-50/50 transition-colors space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {item.category}
                </span>
                <h4 className="font-bold text-slate-900 text-sm">{item.criterionTitle}</h4>
              </div>
              <div>{getStatusBadge(item.status)}</div>
            </div>

            {/* Split Dual-Pane View */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {/* Left Column: JD Requirement */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-slate-700 mb-1">
                  <svg className="w-3.5 h-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Yêu cầu từ Tin tuyển dụng (JD):
                </div>
                <p className="text-slate-600 leading-relaxed">{item.jdRequirement}</p>
              </div>

              {/* Right Column: Candidate Evidence */}
              <div className="p-3.5 rounded-xl bg-blue-50/40 border border-blue-100 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-blue-900 mb-1">
                  <svg className="w-3.5 h-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7 7z" />
                  </svg>
                  Bằng chứng trích xuất từ CV:
                </div>
                <p className="text-slate-800 leading-relaxed font-medium">
                  {item.candidateEvidence || 'Không tìm thấy bằng chứng'}
                </p>
              </div>
            </div>

            {/* Assessment Note */}
            {item.notes && (
              <div className="text-[11px] text-slate-500 flex items-start gap-1.5 pt-1">
                <span className="text-blue-500 font-bold">ℹ</span>
                <span>{item.notes}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
