/**
 * Centralized logging service for the application
 * Provides consistent logging across both client and server environments
 * with support for remote logging in production
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LoggerOptions {
  level: LogLevel;
  enableConsole: boolean;
  enableRemote: boolean;
  remoteEndpoint?: string;
  appName?: string;
  environment?: string;
}

export interface LogContext extends Record<string, any> {
  timestamp?: string;
  sessionId?: string;
  userId?: string;
  page?: string;
  component?: string;
}

/**
 * Main Logger class
 */
export class Logger {
  private static instance: Logger;
  private options: LoggerOptions;
  
  private constructor(options: LoggerOptions) {
    this.options = options;
  }
  
  /**
   * Get the singleton logger instance
   */
  public static getInstance(options?: Partial<LoggerOptions>): Logger {
    if (!Logger.instance) {
      const defaultOptions: LoggerOptions = {
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        enableConsole: process.env.NODE_ENV !== 'production',
        enableRemote: process.env.NODE_ENV === 'production',
        remoteEndpoint: process.env.NEXT_PUBLIC_LOGGING_ENDPOINT,
        appName: 'cartoon-annotation-tool',
        environment: process.env.NODE_ENV || 'development'
      };
      
      Logger.instance = new Logger({
        ...defaultOptions,
        ...options
      });
    }
    
    return Logger.instance;
  }
  
  /**
   * Debug level logging
   */
  public debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }
  
  /**
   * Info level logging
   */
  public info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }
  
  /**
   * Warning level logging
   */
  public warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }
  
  /**
   * Error level logging
   */
  public error(message: string, error?: Error, context?: LogContext): void {
    this.log('error', message, { 
      ...context, 
      error: error?.message, 
      stack: error?.stack,
      name: error?.name
    });
  }
  
  /**
   * Internal log method that handles all logging
   */
  private log(level: LogLevel, message: string, context?: Record<string, any>): void {
    // Skip if log level is not enabled
    if (!this.isLevelEnabled(level)) {
      return;
    }
    
    const timestamp = new Date().toISOString();
    const logEntry = {
      level,
      message,
      timestamp,
      app: this.options.appName,
      env: this.options.environment,
      ...context
    };
    
    // Console logging (for development)
    if (this.options.enableConsole) {
      this.logToConsole(level, message, logEntry);
    }
    
    // Remote logging (for production)
    if (this.options.enableRemote && this.options.remoteEndpoint) {
      this.logToRemote(logEntry);
    }
  }
  
  /**
   * Check if the given log level is enabled
   */
  private isLevelEnabled(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    };
    
    return levels[level] >= levels[this.options.level];
  }
  
  /**
   * Log to the browser/node console with appropriate formatting
   */
  private logToConsole(level: LogLevel, message: string, data: Record<string, any>): void {
    const { timestamp, ...rest } = data;
    
    // Format: [LEVEL] [Timestamp] Message { Context }
    const formattedMessage = `[${level.toUpperCase()}] [${timestamp}] ${message}`;
    
    switch (level) {
      case 'debug':
        console.debug(formattedMessage, rest);
        break;
      case 'info':
        console.info(formattedMessage, rest);
        break;
      case 'warn':
        console.warn(formattedMessage, rest);
        break;
      case 'error':
        console.error(formattedMessage, rest);
        break;
    }
  }
  
  /**
   * Send log to a remote endpoint (Azure Monitor, etc.)
   */
  private logToRemote(data: Record<string, any>): void {
    // Skip remote logging if in browser and endpoint is not set
    if (typeof window !== 'undefined' && !this.options.remoteEndpoint) {
      return;
    }
    
    // Ensure we only log appropriate data that can be serialized
    const sanitizedData = this.sanitizeDataForRemote(data);
    
    // In the browser, use navigator.sendBeacon for non-blocking logging
    if (typeof window !== 'undefined' && navigator.sendBeacon) {
      try {
        navigator.sendBeacon(
          this.options.remoteEndpoint as string, 
          JSON.stringify(sanitizedData)
        );
      } catch (e) {
        // If sendBeacon fails, fall back to fetch
        this.sendRemoteLogWithFetch(sanitizedData);
      }
    } else {
      // In Node.js or if sendBeacon is not available
      this.sendRemoteLogWithFetch(sanitizedData);
    }
  }
  
  /**
   * Send log data using fetch API
   */
  private sendRemoteLogWithFetch(data: Record<string, any>): void {
    if (!this.options.remoteEndpoint) return;
    
    fetch(this.options.remoteEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data),
      // Use keepalive to ensure the request completes even on page transitions
      keepalive: typeof window !== 'undefined'
    }).catch(() => {
      // Silently fail if remote logging fails - no need to log errors about logging
    });
  }
  
  /**
   * Sanitize data for remote logging
   * Removes circular references and ensures data can be serialized
   */
  private sanitizeDataForRemote(data: Record<string, any>): Record<string, any> {
    const seen = new WeakSet();
    
    return JSON.parse(JSON.stringify(data, (key, value) => {
      // Handle undefined values
      if (value === undefined) {
        return null;
      }
      
      // Handle circular references
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular Reference]';
        }
        seen.add(value);
      }
      
      // Handle Error objects
      if (value instanceof Error) {
        return {
          message: value.message,
          name: value.name,
          stack: value.stack
        };
      }
      
      return value;
    }));
  }
}

// Export the singleton instance
export const logger = Logger.getInstance();