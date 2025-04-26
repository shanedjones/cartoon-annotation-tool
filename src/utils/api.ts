import { NextResponse } from 'next/server';

/**
 * Centralized error handling helper for API routes
 * 
 * @param error The error object caught in the try/catch
 * @param context Additional context about where the error occurred
 * @param customMessage Optional custom message to override the default
 * @param status Optional HTTP status code (defaults to 500)
 * @returns NextResponse with error details and appropriate status
 */
export function handleRouteError(
  error: unknown,
  context: string,
  customMessage?: string,
  status: number = 500
): NextResponse {
  // Log the error with context for debugging
  console.error(`Error in ${context}:`, error);
  
  // Create user-friendly error message
  const userMessage = customMessage || `Failed to process ${context}`;
  
  // Return formatted error response
  return NextResponse.json(
    { error: userMessage },
    { status }
  );
}

/**
 * Handles 400 Bad Request errors
 * 
 * @param message The error message to return to the client
 * @returns NextResponse with error message and 400 status
 */
export function handleBadRequest(message: string): NextResponse {
  return NextResponse.json(
    { error: message },
    { status: 400 }
  );
}

/**
 * Handles 404 Not Found errors
 * 
 * @param resource The type of resource that was not found
 * @returns NextResponse with error message and 404 status
 */
export function handleNotFound(resource: string): NextResponse {
  return NextResponse.json(
    { error: `${resource} not found` },
    { status: 404 }
  );
}

/**
 * Handles 409 Conflict errors
 * 
 * @param message The error message to return to the client
 * @returns NextResponse with error message and 409 status
 */
export function handleConflict(message: string): NextResponse {
  return NextResponse.json(
    { error: message },
    { status: 409 }
  );
}