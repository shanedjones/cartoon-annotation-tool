/**
 * API-specific type definitions for the application
 */
import { NextApiRequest } from 'next';
import { User, Session, Video, Annotation } from '../domain';

// Generic API response type
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  timestamp?: string;
}

// API response with pagination
export interface PaginatedApiResponse<T = any> extends ApiResponse<T[]> {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

// Request with authentication
export interface AuthenticatedRequest extends NextApiRequest {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

// Common API parameters
export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface FilterParams {
  search?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  category?: string;
}

// Specific API request/response types
export namespace UserApi {
  export interface CreateUserRequest {
    email: string;
    password: string;
    name: string;
    role?: string;
  }
  
  export interface UpdateUserRequest {
    name?: string;
    role?: string;
    isActive?: boolean;
    preferences?: {
      theme?: 'light' | 'dark' | 'system';
      notifications?: boolean;
      language?: string;
    };
  }
  
  export type GetUserResponse = User;
  export type CreateUserResponse = User;
  export type UpdateUserResponse = User;
  export type GetUsersResponse = User[];
}

export namespace SessionApi {
  export interface CreateSessionRequest {
    videoId: string;
    categories?: string[];
  }
  
  export interface UpdateSessionRequest {
    status?: string;
    feedback?: string;
    categories?: string[];
  }
  
  export type GetSessionResponse = Session;
  export type CreateSessionResponse = Session;
  export type UpdateSessionResponse = Session;
  export type GetSessionsResponse = Session[];
}

export namespace VideoApi {
  export interface CreateVideoRequest {
    title: string;
    description?: string;
    url: string;
    duration: number;
    thumbnail?: string;
    visibility?: 'private' | 'team' | 'public';
    tags?: string[];
  }
  
  export interface UpdateVideoRequest {
    title?: string;
    description?: string;
    thumbnail?: string;
    visibility?: 'private' | 'team' | 'public';
    tags?: string[];
  }
  
  export type GetVideoResponse = Video;
  export type CreateVideoResponse = Video;
  export type UpdateVideoResponse = Video;
  export type GetVideosResponse = Video[];
}

export namespace AnnotationApi {
  export interface CreateAnnotationRequest {
    sessionId: string;
    videoTime: number;
    type: string;
    content: any;
  }
  
  export interface UpdateAnnotationRequest {
    content?: any;
  }
  
  export type GetAnnotationResponse = Annotation;
  export type CreateAnnotationResponse = Annotation;
  export type UpdateAnnotationResponse = Annotation;
  export type GetAnnotationsResponse = Annotation[];
}