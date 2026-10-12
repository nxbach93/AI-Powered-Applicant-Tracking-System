import { apiRequest, getAuthToken } from '@/lib/api';

// ============================================================================
// Types
// ============================================================================
export interface CvInfo {
  hasCv: boolean;
  candidateProfileId?: string;
  cvFileUrl?: string | null;
  updatedAt?: string;
}

export interface UploadCvResult {
  candidateProfileId: string;
  cvFileUrl: string | null;
  fileName: string;
  originalName: string;
  fileSizeBytes: number;
  mimeType: string;
  uploadedAt: string;
}

export interface SubmitApplicationPayload {
  jobPostingId: string;
  coverLetter?: string;
  cvFile?: File;
}

export interface ApplicationListItem {
  id: string;
  status: ApplicationStatus;
  coverLetter: string | null;
  appliedAt: string;
  updatedAt: string;
  aiMatchScore: number | null;
  jobPosting: {
    id: string;
    title: string;
    department: string | null;
    location: string | null;
    employmentType: string | null;
    status: string;
    postedBy: { firstName: string; lastName: string; email: string };
  };
  upcomingInterview: {
    id: string;
    scheduledAt: string;
    location: string | null;
    meetingUrl: string | null;
    status: string;
  } | null;
}

export interface ApplicationDetail extends ApplicationListItem {
  cvFileUrl?: string | null;
  parsedSkills: string[] | null;
  aiAnalysisSummary: string | null;
  jobPosting: ApplicationListItem['jobPosting'] & {
    description: string;
    requirements: string | null;
    salaryMin: number | null;
    salaryMax: number | null;
    applicationDeadline: string | null;
  };
  interviews: Array<{
    id: string;
    scheduledAt: string;
    durationMinutes: number;
    location: string | null;
    meetingUrl: string | null;
    status: string;
    notes: string | null;
  }>;
}

export type ApplicationStatus =
  | 'SUBMITTED'
  | 'SCREENING'
  | 'SHORTLISTED'
  | 'INTERVIEW_SCHEDULED'
  | 'INTERVIEWED'
  | 'OFFERED'
  | 'HIRED'
  | 'REJECTED'
  | 'WITHDRAWN';

// ============================================================================
// CV Management API
// ============================================================================
export async function getMyCvApi(): Promise<CvInfo> {
  const res = await apiRequest<CvInfo>('/applications/cv');
  if (!res.success || !res.data) {
    throw new Error(res.error?.message || 'Không thể lấy thông tin CV');
  }
  return res.data;
}

export async function uploadCvApi(file: File): Promise<UploadCvResult> {
  const token = getAuthToken();
  const formData = new FormData();
  formData.append('cvFile', file);

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/applications/upload-cv`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    }
  );
  const data = await res.json();
  if (!data.success) throw new Error(data.error?.message || 'Tải lên CV thất bại');
  return data.data;
}

export async function deleteCvApi(): Promise<void> {
  const res = await apiRequest('/applications/cv', { method: 'DELETE' });
  if (!res.success) throw new Error(res.error?.message || 'Xóa CV thất bại');
}

// ============================================================================
// Application Submission
// ============================================================================
export async function submitApplicationApi(payload: SubmitApplicationPayload) {
  const token = getAuthToken();
  const formData = new FormData();
  formData.append('jobPostingId', payload.jobPostingId);
  if (payload.coverLetter) formData.append('coverLetter', payload.coverLetter);
  if (payload.cvFile) formData.append('cvFile', payload.cvFile);

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/applications`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    }
  );
  const data = await res.json();
  if (!data.success) {
    const err = new Error(data.error?.message || 'Nộp đơn thất bại') as Error & { code?: string };
    err.code = data.error?.code;
    throw err;
  }
  return data.data;
}

// ============================================================================
// Candidate History
// ============================================================================
export async function getMyApplicationsApi(): Promise<ApplicationListItem[]> {
  const res = await apiRequest<ApplicationListItem[]>('/applications/my-applications');
  if (!res.success || !res.data) {
    throw new Error(res.error?.message || 'Không thể lấy lịch sử ứng tuyển');
  }
  return res.data;
}

export async function getMyApplicationByIdApi(id: string): Promise<ApplicationDetail> {
  const res = await apiRequest<ApplicationDetail>(`/applications/${id}`);
  if (!res.success || !res.data) {
    throw new Error(res.error?.message || 'Không tìm thấy đơn ứng tuyển');
  }
  return res.data;
}

export async function withdrawApplicationApi(id: string) {
  const res = await apiRequest(`/applications/${id}/withdraw`, { method: 'PUT' });
  if (!res.success) throw new Error(res.error?.message || 'Rút đơn thất bại');
  return res;
}

// ============================================================================
// HR Management APIs (APP-07, APP-09)
// ============================================================================

export interface HrJobOverview {
  id: string;
  title: string;
  department: string | null;
  location: string | null;
  employmentType: string | null;
  status: string;
  applicationDeadline: string | null;
  totalApplications: number;
}

export interface HrApplicationItem {
  id: string;
  status: ApplicationStatus;
  appliedAt: string;
  updatedAt: string;
  coverLetter: string | null;
  aiMatchScore: number | null;
  parsedSkills: string[] | null;
  aiAnalysisSummary: string | null;
  cvFileUrl: string | null;
  jobPosting?: {
    id: string;
    title: string;
    department: string | null;
    location: string | null;
  };
  candidate: {
    candidateProfileId: string;
    fullName: string;
    email: string;
    avatarUrl: string | null;
    phone: string | null;
    experienceYears: number | null;
    education: string | null;
  };
}

export interface HrApplicationListResponse {
  data: HrApplicationItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface HrApplicationDetail {
  id: string;
  status: ApplicationStatus;
  appliedAt: string;
  updatedAt: string;
  coverLetter: string | null;
  cvFileUrl: string | null;
  aiMatchScore: number | null;
  parsedSkills: string[] | null;
  aiAnalysisSummary: string | null;
  candidate: {
    id: string;
    fullName: string;
    email: string;
    avatarUrl: string | null;
    phone: string | null;
    dateOfBirth: string | null;
    address: string | null;
    summary: string | null;
    experienceYears: number | null;
    education: string | null;
    joinedAt: string;
  };
  jobPosting: {
    id: string;
    title: string;
    department: string | null;
    location: string | null;
    employmentType: string | null;
    requirements: string | null;
  };
  interviews: Array<{
    id: string;
    scheduledAt: string;
    durationMinutes: number;
    location: string | null;
    meetingUrl: string | null;
    status: string;
    notes: string | null;
    interviewer: {
      firstName: string;
      lastName: string;
      email: string;
    };
  }>;
}

export interface HrApplicationFilters {
  status?: string;
  sortBy?: 'appliedAt' | 'aiMatchScore' | 'updatedAt';
  order?: 'asc' | 'desc';
  minScore?: number;
  page?: number;
  limit?: number;
}

export async function getHrJobsOverviewApi(): Promise<HrJobOverview[]> {
  const res = await apiRequest<HrJobOverview[]>('/applications/hr/jobs');
  if (!res.success || !res.data) {
    throw new Error(res.error?.message || 'Không thể lấy danh sách vị trí tuyển dụng');
  }
  return res.data;
}

export async function getApplicationsByJobApi(
  jobId: string,
  filters: HrApplicationFilters = {}
): Promise<HrApplicationListResponse> {
  const query = new URLSearchParams();
  if (filters.status) query.append('status', filters.status);
  if (filters.sortBy) query.append('sortBy', filters.sortBy);
  if (filters.order) query.append('order', filters.order);
  if (filters.minScore !== undefined) query.append('minScore', String(filters.minScore));
  if (filters.page) query.append('page', String(filters.page));
  if (filters.limit) query.append('limit', String(filters.limit));

  const url = `/applications/job/${jobId}${query.toString() ? `?${query.toString()}` : ''}`;
  const res = await apiRequest<HrApplicationItem[]>(url);
  if (!res.success) {
    throw new Error(res.error?.message || 'Không thể lấy danh sách ứng viên');
  }

  return {
    data: res.data || [],
    meta: (res as any).meta || {
      page: filters.page || 1,
      limit: filters.limit || 10,
      total: (res.data || []).length,
      totalPages: 1
    }
  };
}

export async function getApplicationDetailForHrApi(applicationId: string): Promise<HrApplicationDetail> {
  const res = await apiRequest<HrApplicationDetail>(`/applications/${applicationId}/detail`);
  if (!res.success || !res.data) {
    throw new Error(res.error?.message || 'Không thể tải chi tiết hồ sơ ứng viên');
  }
  return res.data;
}

export async function updateApplicationStatusApi(
  applicationId: string,
  status: ApplicationStatus
): Promise<{ applicationId: string; status: ApplicationStatus; updatedAt: string }> {
  const res = await apiRequest<{ applicationId: string; status: ApplicationStatus; updatedAt: string }>(
    `/applications/${applicationId}/status`,
    {
      method: 'PATCH',
      body: JSON.stringify({ status })
    }
  );
  if (!res.success || !res.data) {
    throw new Error(res.error?.message || 'Cập nhật trạng thái thất bại');
  }
  return res.data;
}
