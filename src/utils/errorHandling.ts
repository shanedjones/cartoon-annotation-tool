/**
 * Error handling utilities for the application
 */

/**
 * Log an error to the console and any error tracking service
 * @param error The error object
 * @param context Additional context about where the error occurred
 */
export function logError(error: Error, context?: string): void {
  console.error(`[ERROR${context ? ` - ${context}` : ''}]`, error);
  
  // In the future, this could integrate with error tracking services like Sentry
  // if (typeof window !== 'undefined' && window.Sentry) {
  //   window.Sentry.captureException(error, { extra: { context } });
  // }
}

/**
 * Safely execute a function that might throw an error
 * @param fn The function to execute
 * @param fallback The fallback value to return if the function throws
 * @param errorContext Additional context about where the error occurred
 * @returns The result of the function or the fallback value
 */
export function trySafe<T>(
  fn: () => T,
  fallback: T,
  errorContext?: string
): T {
  try {
    return fn();
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), errorContext);
    return fallback;
  }
}

/**
 * Safely execute an async function that might throw an error
 * @param fn The async function to execute
 * @param fallback The fallback value to return if the function throws
 * @param errorContext Additional context about where the error occurred
 * @returns A promise that resolves to the result of the function or the fallback value
 */
export async function trySafeAsync<T>(
  fn: () => Promise<T>,
  fallback: T,
  errorContext?: string
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), errorContext);
    return fallback;
  }
}