# Epic 3: Error Handling and Logging

**Description:** Implement a consistent, robust error handling and logging system.

## Stories

### Story 3.1: Create Centralized Logging Service

**Description:** Develop a centralized logging service for consistent logging throughout the application.

**Tasks:**
- Create a Logger class with different log levels
- Implement console logging for development
- Set up remote logging for production (Azure Monitor)
- Add context to log messages (user, session, etc.)

**Acceptance Criteria:**
- Centralized Logger implementation
- Support for different log levels (debug, info, warn, error)
- Remote logging configuration for production
- Context information in log messages

**Example Implementation:**
```typescript
// src/utils/logger.ts
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerOptions {
  level: LogLevel;
  enableConsole: boolean;
  enableRemote: boolean;
  remoteEndpoint?: string;
}

export class Logger {
  private static instance: Logger;
  private options: LoggerOptions;
  
  private constructor(options: LoggerOptions) {
    this.options = options;
  }
  
  public static getInstance(options?: Partial<LoggerOptions>): Logger {
    if (!Logger.instance) {
      const defaultOptions: LoggerOptions = {
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        enableConsole: process.env.NODE_ENV !== 'production',
        enableRemote: process.env.NODE_ENV === 'production',
      };
      
      Logger.instance = new Logger({
        ...defaultOptions,
        ...options
      });
    }
    
    return Logger.instance;
  }
  
  // Methods for each log level
  public debug(message: string, context?: Record<string, any>): void {
    this.log('debug', message, context);
  }
  
  public info(message: string, context?: Record<string, any>): void {
    this.log('info', message, context);
  }
  
  public warn(message: string, context?: Record<string, any>): void {
    this.log('warn', message, context);
  }
  
  public error(message: string, error?: Error, context?: Record<string, any>): void {
    this.log('error', message, { ...context, error: error?.message, stack: error?.stack });
  }
  
  private log(level: LogLevel, message: string, context?: Record<string, any>): void {
    // Implementation details
  }
}

export const logger = Logger.getInstance();
```

### Story 3.2: Standardize Error Handling

**Description:** Create standardized error handling patterns for the application.

**Tasks:**
- Create domain-specific error classes
- Implement consistent try/catch patterns
- Add error boundary components for React
- Create error handling HOCs or hooks

**Acceptance Criteria:**
- Domain-specific error classes (ApiError, AuthError, etc.)
- Consistent try/catch patterns throughout codebase
- Error boundary components for React
- Error handling HOCs or hooks for reuse

**Example Implementation:**
```typescript
// src/utils/errors.ts
export class AppError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AppError';
  }
}

export class ApiError extends AppError {
  public status: number;
  
  constructor(message: string, status: number = 500) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export class AuthError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(message);
    this.name = 'AuthError';
  }
}

// Error boundary component
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error('React error boundary caught error', error, { errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <div>Something went wrong. Please try again.</div>;
    }

    return this.props.children;
  }
}
```

### Story 3.3: Replace Console Logs with Logger

**Description:** Replace all console.log statements with the centralized logger.

**Tasks:**
- Identify all console.log statements in the codebase
- Replace with appropriate logger methods
- Add meaningful context to log messages
- Configure log levels based on importance

**Acceptance Criteria:**
- No direct console.log calls in the codebase
- Appropriate log levels used for different messages
- Meaningful context added to log messages
- Configurable log levels based on environment

### Story 3.4: Implement API Error Handling

**Description:** Standardize error handling in API routes.

**Tasks:**
- Create consistent error response format
- Implement centralized error handling middleware
- Add request validation with detailed error messages
- Map database errors to user-friendly messages

**Acceptance Criteria:**
- Consistent error response format
- Centralized error handling middleware
- Request validation with detailed error messages
- User-friendly error messages for database errors

**Example Implementation:**
```typescript
// src/pages/api/_middleware.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { ApiError, AppError } from '@/utils/errors';
import { logger } from '@/utils/logger';

export default function errorHandlerMiddleware(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      await handler(req, res);
    } catch (error) {
      logger.error('API error', error as Error, { path: req.url, method: req.method });
      
      if (error instanceof ApiError) {
        res.status(error.status).json({
          success: false,
          error: error.message,
          code: error.name
        });
        return;
      }
      
      if (error instanceof AppError) {
        res.status(400).json({
          success: false,
          error: error.message,
          code: error.name
        });
        return;
      }
      
      res.status(500).json({
        success: false,
        error: 'An unexpected error occurred',
        code: 'InternalServerError'
      });
    }
  };
}
```
