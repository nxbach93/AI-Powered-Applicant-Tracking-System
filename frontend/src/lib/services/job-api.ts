import { apiRequest } from '../api';
import {
  JobPosting,
  CreateJobDto,
  UpdateJobDto,
  JobStatus,
  JobFilterParams,
  JobListResponse,
  JobDetailResponse,
} from '../../types/job';

export class JobApiService {
  /**
   * Lấy danh sách việc làm có phân trang và bộ lọc (Public hoặc HR)
   */
  async getJobs(filters?: JobFilterParams): Promise<JobListResponse> {
    const params = new URLSearchParams();

    if (filters) {
      if (filters.page) params.append('page', String(filters.page));
      if (filters.limit) params.append('limit', String(filters.limit));
      if (filters.search) params.append('search', filters.search.trim());
      if (filters.department) params.append('department', filters.department.trim());
      if (filters.location) params.append('location', filters.location.trim());
      if (filters.employmentType) params.append('employmentType', filters.employmentType.trim());
      if (filters.status) params.append('status', String(filters.status));
      if (filters.myJobs !== undefined) params.append('myJobs', String(filters.myJobs));
    }

    const queryString = params.toString();
    const endpoint = queryString ? `/jobs?${queryString}` : '/jobs';

    const response = await apiRequest<JobPosting[]>(endpoint);
    return response as unknown as JobListResponse;
  }

  /**
   * HR lấy danh sách các tin do chính mình tạo
   */
  async getMyJobs(filters?: JobFilterParams): Promise<JobListResponse> {
    const params = new URLSearchParams();

    if (filters) {
      if (filters.page) params.append('page', String(filters.page));
      if (filters.limit) params.append('limit', String(filters.limit));
      if (filters.search) params.append('search', filters.search.trim());
      if (filters.department) params.append('department', filters.department.trim());
      if (filters.location) params.append('location', filters.location.trim());
      if (filters.status) params.append('status', String(filters.status));
    }

    const queryString = params.toString();
    const endpoint = queryString ? `/jobs/hr/my-jobs?${queryString}` : '/jobs/hr/my-jobs';

    const response = await apiRequest<JobPosting[]>(endpoint);
    return response as unknown as JobListResponse;
  }

  /**
   * Xem chi tiết 1 tin tuyển dụng theo ID
   */
  async getJobById(id: string): Promise<JobDetailResponse> {
    const response = await apiRequest<JobPosting>(`/jobs/${encodeURIComponent(id)}`);
    return response as unknown as JobDetailResponse;
  }

  /**
   * Tạo tin tuyển dụng mới (HR hoặc ADMIN)
   */
  async createJob(payload: CreateJobDto): Promise<JobDetailResponse> {
    const response = await apiRequest<JobPosting>('/jobs', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return response as unknown as JobDetailResponse;
  }

  /**
   * Cập nhật thông tin tin tuyển dụng (HR Owner hoặc ADMIN)
   */
  async updateJob(id: string, payload: UpdateJobDto): Promise<JobDetailResponse> {
    const response = await apiRequest<JobPosting>(`/jobs/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return response as unknown as JobDetailResponse;
  }

  /**
   * Thay đổi trạng thái tin tuyển dụng: DRAFT | PUBLISHED | CLOSED | ARCHIVED
   */
  async updateJobStatus(id: string, status: JobStatus): Promise<JobDetailResponse> {
    const response = await apiRequest<JobPosting>(`/jobs/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    return response as unknown as JobDetailResponse;
  }

  /**
   * Xóa tin tuyển dụng (Chỉ thành công khi có 0 ứng viên nộp hồ sơ)
   */
  async deleteJob(id: string): Promise<{ success: boolean; message?: string; data?: { id: string }; error?: any }> {
    const response = await apiRequest<{ id: string }>(`/jobs/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return response as unknown as { success: boolean; message?: string; data?: { id: string }; error?: any };
  }
}

export const jobApi = new JobApiService();
export default jobApi;
