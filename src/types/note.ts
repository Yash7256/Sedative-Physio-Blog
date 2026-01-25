export interface INote {
  id: string;
  title: string;
  description: string;
  filename: string;
  original_name: string;
  content_type: string;
  size: number;
  created_at: Date;
  category?: string;
  tags?: string[];
}

export interface INoteCreate {
  title: string;
  description?: string;
  filename: string;
  originalName: string;
  contentType: string;
  size: number;
  category?: string;
  tags?: string[];
}

export interface IPaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalNotes: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface IApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}