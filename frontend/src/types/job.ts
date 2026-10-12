export type JobStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED' | 'ARCHIVED';

export type EmploymentType =
  | 'FULL_TIME'
  | 'PART_TIME'
  | 'CONTRACT'
  | 'INTERNSHIP'
  | 'REMOTE'
  | string;

export interface JobPosting {
  id: string;
  title: string;
  department?: string | null;
  location?: string | null;
  employmentType?: EmploymentType | null;
  description: string;
  requirements?: string | null;
  salaryMin?: number | string | null;
  salaryMax?: number | string | null;
  status: JobStatus;
  postedById: string;
  applicationDeadline?: string | null;
  createdAt: string;
  updatedAt: string;
  postedBy?: {
    id?: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  _count?: {
    applications: number;
  };
}

export interface CreateJobDto {
  title: string;
  department?: string | null;
  location?: string | null;
  employmentType?: string | null;
  description: string;
  requirements?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  status?: JobStatus;
  applicationDeadline?: string | null;
}

export interface UpdateJobDto extends Partial<CreateJobDto> {}

export interface JobFilterParams {
  page?: number;
  limit?: number;
  search?: string;
  department?: string;
  location?: string;
  employmentType?: string;
  status?: JobStatus | string;
  myJobs?: boolean | string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface JobListResponse {
  success: boolean;
  data?: JobPosting[];
  meta?: PaginationMeta;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: Array<{ field: string; message: string }>;
  };
}

export interface JobDetailResponse {
  success: boolean;
  data?: JobPosting;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: Array<{ field: string; message: string }>;
  };
}
