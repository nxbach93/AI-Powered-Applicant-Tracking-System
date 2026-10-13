'use client';

import React from 'react';
import { HrApplicationDetail } from '@/lib/application-api';

interface AiStrengthsAndGapsProps {
  detail: HrApplicationDetail;
}

export function AiStrengthsAndGaps({ detail }: AiStrengthsAndGapsProps) {
  const { candidate, parsedSkills, aiAnalysisSummary, aiMatchScore } = detail;

  // Trích xuất điểm mạnh từ parsedSkills, experience và education
  const strengths: string[] = React.useMemo(() => {
    const list: string[] = [];

    if (parsedSkills && parsedSkills.length > 0) {
      list.push(`Sở hữu ${parsedSkills.length} kỹ năng chuyên môn: ${parsedSkills.slice(0, 5).join(', ')}${parsedSkills.length > 5 ? '...' : ''}.`);
    }

    if (candidate.experienceYears && candidate.experienceYears > 0) {
      list.push(`Đã có ${candidate.experienceYears} năm kinh nghiệm làm việc thực tế.`);
    }

    if (candidate.education) {
      list.push(`Học vấn: ${candidate.education}.`);
    }

    if (aiMatchScore !== null && aiMatchScore >= 70) {
      list.push(`Điểm tương thích tổng thể đạt ${aiMatchScore}%, mức độ phù hợp cao với yêu cầu tuyển dụng.`);
    }

    return list;
  }, [candidate, parsedSkills, aiMatchScore]);

  // Trích xuất các điểm cần lưu ý từ aiAnalysisSummary và các trường dữ liệu còn thiếu
  const gaps: string[] = React.useMemo(() => {
    const list: string[] = [];

    // Kiểm tra cảnh báo từ summary nếu có
    if (aiAnalysisSummary) {
      if (aiAnalysisSummary.includes('Lưu ý cho HR:')) {
        const warningPart = aiAnalysisSummary.split('Lưu ý cho HR:')[1]?.split('Đề xuất:')[0]?.trim();
        if (warningPart) {
          list.push(`Lưu ý từ mô hình AI: ${warningPart}`);
        }
      }
      if (aiAnalysisSummary.includes('Cần lưu ý thiếu:')) {
        const missingPart = aiAnalysisSummary.split('Cần lưu ý thiếu:')[1]?.split('.')[0]?.trim();
        if (missingPart) {
          list.push(`Thiếu một số kỹ năng yêu cầu: ${missingPart}.`);
        }
      }
    }

    if (aiMatchScore !== null && aiMatchScore < 50) {
      list.push('Điểm số tương thích dưới 50%: Lệch chuyên môn hoặc thiếu nhiều tiêu chí cốt lõi.');
    }

    if (candidate.experienceYears === null || candidate.experienceYears === undefined) {
      list.push('Chưa xác định rõ số năm kinh nghiệm từ hồ sơ; cần HR phỏng vấn xác minh.');
    }

    if (!candidate.education) {
      list.push('Chưa có thông tin bằng cấp / chuyên ngành đào tạo chính quy.');
    }

    return list;
  }, [candidate, aiAnalysisSummary, aiMatchScore]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Cột Điểm Mạnh (Strengths) */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-emerald-200/90 shadow-2xs flex flex-col gap-3">
        <div className="flex items-center gap-2 text-emerald-800">
          <span className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center font-bold text-sm">
            ✓
          </span>
          <div>
            <h4 className="font-bold text-sm">Điểm Mạnh Nổi Bật (Strengths)</h4>
            <span className="text-[11px] text-emerald-600 font-medium">
              Bằng chứng xác thực từ hồ sơ
            </span>
          </div>
        </div>

        {strengths.length > 0 ? (
          <ul className="space-y-2 text-xs text-slate-700">
            {strengths.map((str, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-emerald-500 font-bold mt-0.5">•</span>
                <span className="leading-relaxed">{str}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-slate-400 italic">
            Chưa phát hiện điểm mạnh đặc thù từ dữ liệu hiện tại.
          </p>
        )}
      </div>

      {/* Cột Điểm Cần Lưu Ý & Lỗ Hổng (Gaps & Considerations) */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-amber-200/90 shadow-2xs flex flex-col gap-3">
        <div className="flex items-center gap-2 text-amber-800">
          <span className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center font-bold text-sm">
            !
          </span>
          <div>
            <h4 className="font-bold text-sm">Điểm Cần Xác Minh (Gaps & Risks)</h4>
            <span className="text-[11px] text-amber-600 font-medium">
              Tiêu chí thiếu hụt hoặc cần HR làm rõ
            </span>
          </div>
        </div>

        {gaps.length > 0 ? (
          <ul className="space-y-2 text-xs text-slate-700">
            {gaps.map((gap, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-amber-500 font-bold mt-0.5">•</span>
                <span className="leading-relaxed">{gap}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-emerald-700 font-medium">
            Không có lỗ hổng hoặc cảnh báo nghiêm trọng nào được ghi nhận.
          </p>
        )}
      </div>
    </div>
  );
}
