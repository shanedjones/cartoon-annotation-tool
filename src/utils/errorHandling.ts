/**
 * Error handling utilities for the application
 * Provides standardized error handling patterns and error boundary components
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logger } from './logger';

/**
 * Base application error class
 */
export class AppError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AppError';
    
    // Ensure the stack trace includes the correct prototype chain
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * Domain-specific errors
 */
export class ValidationError extends AppError {
  public fieldErrors: Record<string, string>;
  
  constructor(message: string, fieldErrors: Record<string, string> = {}) {
    super(message);
    this.name = 'ValidationError';
    this.fieldErrors = fieldErrors;
    
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export class AuthError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(message);
    this.name = 'AuthError';
    
    Object.setPrototypeOf(this, AuthError.prototype);
  }
}

export class NotFoundError extends AppError {
  public resourceType: string;
  public resourceId?: string;
  
  constructor(resourceType: string, resourceId?: string) {
    const message = resourceId 
      ? `${resourceType} with ID ${resourceId} not found` 
      : `${resourceType} not found`;
    
    super(message);
    this.name = 'NotFoundError';
    this.resourceType = resourceType;
    this.resourceId = resourceId;
    
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

export class NetworkError extends AppError {
  public statusCode?: number;
  
  constructor(message: string = 'Network request failed', statusCode?: number) {
    super(message);
    this.name = 'NetworkError';
    this.statusCode = statusCode;
    
    Object.setPrototypeOf(this, NetworkError.prototype);
  }
}

export class MediaError extends AppError {
  public mediaType: 'video' | 'audio' | 'image';
  
  constructor(message: string, mediaType: 'video' | 'audio' | 'image') {
    super(message);
    this.name = 'MediaError';
    this.mediaType = mediaType;
    
    Object.setPrototypeOf(this, MediaError.prototype);
  }
}

/**
 * Error boundary props
 */
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: React.FC<{ error: Error; resetError: () => void }>;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

/**
 * Error boundary state
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

/**
 * React error boundary component
 * Catches errors in child components and displays a fallback UI
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log the error
    logger.error('React component error', error, { 
      component: this.constructor.name,
      componentStack: errorInfo.componentStack
    });
    
    // Call the onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }
  
  resetError = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      // Use the provided fallback component if available
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return React.createElement(FallbackComponent, { error: this.state.error, resetError: this.resetError });
      }
      
      // Default fallback UI
      return React.createElement(
        'div',
        { className: 'error-boundary-fallback' },
        React.createElement('h2', null, 'Something went wrong.'),
        React.createElement(
          'details',
          null,
          React.createElement('summary', null, 'Error details'),
          React.createElement('p', null, this.state.error.message)
        ),
        React.createElement(
          'button',
          { onClick: this.resetError },
          'Try again'
        )
      );
    }

    return this.props.children;
  }
}

/**
 * Default error fallback component
 */
export const DefaultErrorFallback: React.FC<{ error: Error; resetError: () => void }> = ({ 
  error, 
  resetError 
}) => (
  React.createElement(
    'div',
    { className: 'error-fallback' },
    React.createElement('h2', null, 'Something went wrong'),
    React.createElement('pre', null, error.message),
    React.createElement('button', { onClick: resetError }, 'Try again')
  )
);

/**
 * Custom hook to create a try-catch wrapper with standardized error handling
 */
export function useErrorHandler<T>(
  handler: (...args: any[]) => Promise<T>,
  options?: {
    onError?: (error: Error) => void;
    transformError?: (error: unknown) => Error;
  }
): (...args: any[]) => Promise<T> {
  return async (...args: any[]): Promise<T> => {
    try {
      return await handler(...args);
    } catch (error) {
      // Transform the error if a transformer is provided
      const transformedError = options?.transformError 
        ? options.transformError(error)
        : error instanceof Error 
          ? error 
          : new AppError(String(error));
      
      // Log the error
      logger.error('Operation failed', transformedError as Error);
      
      // Call the onError callback if provided
      if (options?.onError) {
        options.onError(transformedError as Error);
      }
      
      // Re-throw the transformed error
      throw transformedError;
    }
  };
}