import { NextResponse } from 'next/server';

// API Error Codes
export type ApiErrorCode = 
  | 'BAD_REQUEST' 
  | 'UNAUTHORIZED' 
  | 'FORBIDDEN' 
  | 'NOT_FOUND' 
  | 'INTERNAL_SERVER_ERROR'
  | 'SERVICE_UNAVAILABLE'
  | 'VALIDATION_ERROR'
  | 'CONFLICT_ERROR'
  | 'RATE_LIMIT_ERROR';

export interface ApiErrorOptions {
  code?: ApiErrorCode;
  status?: number;
  cause?: unknown;
  details?: Record<string, any>;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    message: string;
    code: ApiErrorCode;
    details?: Record<string, any>;
  };
  timestamp?: string;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  timestamp?: string;
}

export type ApiResponseType<T> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Standard API error with consistent structure
 */
export class ApiError extends Error {
  code: ApiErrorCode;
  status: number;
  cause?: unknown;
  details?: Record<string, any>;

  constructor(message: string, options: ApiErrorOptions = {}) {
    super(message);
    this.name = 'ApiError';
    this.code = options.code || 'INTERNAL_SERVER_ERROR';
    this.status = options.status || this.getStatusFromCode(this.code);
    this.cause = options.cause;
    this.details = options.details;
  }

  private getStatusFromCode(code: ApiErrorCode): number {
    switch (code) {
      case 'BAD_REQUEST':
        return 400;
      case 'UNAUTHORIZED':
        return 401;
      case 'FORBIDDEN':
        return 403;
      case 'NOT_FOUND':
        return 404;
      case 'VALIDATION_ERROR':
        return 422;
      case 'CONFLICT_ERROR':
        return 409;
      case 'RATE_LIMIT_ERROR':
        return 429;
      case 'INTERNAL_SERVER_ERROR':
        return 500;
      case 'SERVICE_UNAVAILABLE':
        return 503;
      default:
        return 500;
    }
  }
}

/**
 * Validation error for form validation failures
 */
export class ValidationError extends ApiError {
  constructor(message: string, fieldErrors: Record<string, string>) {
    super(message, {
      code: 'VALIDATION_ERROR',
      status: 422,
      details: { fieldErrors }
    });
    this.name = 'ValidationError';
  }
}

/**
 * Authorization error for permission issues
 */
export class AuthorizationError extends ApiError {
  constructor(message: string = 'You do not have permission to perform this action') {
    super(message, {
      code: 'FORBIDDEN',
      status: 403
    });
    this.name = 'AuthorizationError';
  }
}

/**
 * Resource not found error
 */
export class NotFoundError extends ApiError {
  constructor(resource: string = 'Resource', id?: string) {
    const message = id ? `${resource} with ID ${id} not found` : `${resource} not found`;
    super(message, {
      code: 'NOT_FOUND',
      status: 404
    });
    this.name = 'NotFoundError';
  }
}

/**
 * API response wrapper for successful responses
 */
export function apiResponse<T>(data: T, status: number = 200): NextResponse<ApiSuccessResponse<T>> {
  const timestamp = new Date().toISOString();
  return NextResponse.json(
    { success: true, data, timestamp }, 
    { status }
  );
}

/**
 * API response wrapper for error responses
 */
export function apiErrorResponse(
  error: unknown, 
  status: number = 500
): NextResponse<ApiErrorResponse> {
  const timestamp = new Date().toISOString();
  
  // If it's already an ApiError, use its status and code
  if (error instanceof ApiError) {
    return NextResponse.json(
      { 
        success: false, 
        error: {
          message: error.message,
          code: error.code,
          details: error.details
        },
        timestamp
      }, 
      { status: error.status }
    );
  }

  // Format other errors consistently
  let errorMessage = 'An unknown error occurred';
  let errorCode: ApiErrorCode = 'INTERNAL_SERVER_ERROR';
  
  if (error instanceof Error) {
    errorMessage = error.message;
    if (status < 500) {
      errorCode = 'BAD_REQUEST';
    }
  } else if (typeof error === 'string') {
    errorMessage = error;
    if (status < 500) {
      errorCode = 'BAD_REQUEST';
    }
  }

  return NextResponse.json(
    { 
      success: false, 
      error: {
        message: errorMessage,
        code: errorCode
      },
      timestamp
    }, 
    { status }
  );
}

/**
 * API request handler wrapper to consistently handle errors
 */
export function withErrorHandling<T>(
  handler: () => Promise<T>,
  errorLogger?: (error: unknown) => void
): Promise<T> {
  return handler().catch(error => {
    if (errorLogger) {
      errorLogger(error);
    } else {
      console.error('[API Error]:', error);
    }
    throw error;
  });
}

/**
 * Create type-safe API handler with route logic and error handling for server-side
 */
export function createApiHandler<TRequest, TResponse>(
  routeHandler: (req: TRequest) => Promise<TResponse>,
  options?: {
    errorHandler?: (error: unknown) => ApiErrorResponse;
    logger?: (error: unknown) => void;
  }
) {
  return async (request: TRequest) => {
    try {
      const result = await withErrorHandling(
        () => routeHandler(request),
        options?.logger
      );
      return apiResponse(result);
    } catch (error) {
      if (options?.errorHandler) {
        const customError = options.errorHandler(error);
        return apiErrorResponse(new ApiError(customError.error.message, {
          code: customError.error.code,
          details: customError.error.details
        }));
      }
      return apiErrorResponse(error);
    }
  };
}

/**
 * Type-safe API request function for client-side
 * Makes a fetch request to the specified endpoint with proper error handling
 * 
 * @param url - The API endpoint URL
 * @param method - The HTTP method
 * @param data - The request data (for POST, PUT, PATCH)
 * @returns A Promise with the API response
 */
export async function fetchApi<TResponse = unknown, TRequest = unknown>(
  url: string,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET',
  data?: TRequest,
  options?: RequestInit
): Promise<ApiResponseType<TResponse>> {
  try {
    const requestOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      credentials: 'include',
      ...options,
    };

    // Add the request body for non-GET requests
    if (data && ['POST', 'PUT', 'PATCH'].includes(method)) {
      requestOptions.body = JSON.stringify(data);
    }

    const response = await fetch(url, requestOptions);
    const responseData = await response.json() as ApiResponseType<TResponse>;

    if (!response.ok) {
      throw new ApiError((responseData as ApiErrorResponse).error?.message || 'API request failed', {
        status: response.status,
        code: (responseData as ApiErrorResponse).error?.code as ApiErrorCode || 'INTERNAL_SERVER_ERROR',
        details: (responseData as ApiErrorResponse).error?.details
      });
    }

    return responseData;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    
    console.error('[API Request Error]:', error);
    
    // Generic error response for fetch/network errors
    return {
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Network error occurred',
        code: 'SERVICE_UNAVAILABLE',
      },
      timestamp: new Date().toISOString()
    };
  }
}