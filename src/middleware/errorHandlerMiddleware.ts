/**
 * API error handling middleware for Next.js API routes
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { logger } from '../utils/logger';
import { ApiError, ValidationError, AuthorizationError, NotFoundError } from '../utils/errorHandling';

/**
 * Middleware function to wrap API handlers with consistent error handling
 */
export default function errorHandlerMiddleware(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      await handler(req, res);
    } catch (error) {
      // Log the error with context
      logger.error('API error', error instanceof Error ? error : new Error(String(error)), { 
        path: req.url, 
        method: req.method,
        query: req.query,
        headers: {
          'user-agent': req.headers['user-agent'],
          'content-type': req.headers['content-type'],
          'referer': req.headers['referer'],
        }
      });
      
      // Determine the appropriate error response based on error type
      if (error instanceof ValidationError) {
        res.status(400).json({
          success: false,
          error: {
            message: error.message,
            code: 'VALIDATION_ERROR',
            fields: error.fieldErrors
          }
        });
        return;
      }
      
      if (error instanceof AuthorizationError) {
        res.status(403).json({
          success: false,
          error: {
            message: error.message,
            code: 'FORBIDDEN'
          }
        });
        return;
      }
      
      if (error instanceof NotFoundError) {
        res.status(404).json({
          success: false,
          error: {
            message: error.message,
            code: 'NOT_FOUND',
            resource: {
              type: error.resourceType,
              id: error.resourceId
            }
          }
        });
        return;
      }
      
      if (error instanceof ApiError) {
        res.status(error.status || 500).json({
          success: false,
          error: {
            message: error.message,
            code: error.code || 'API_ERROR'
          }
        });
        return;
      }
      
      // Generic error handling for unexpected errors
      res.status(500).json({
        success: false,
        error: {
          message: process.env.NODE_ENV === 'production'
            ? 'An unexpected error occurred. Please try again later.'
            : error instanceof Error ? error.message : String(error),
          code: 'INTERNAL_SERVER_ERROR'
        }
      });
    }
  };
}

/**
 * Helper function to create a validated API handler
 */
export function createValidatedHandler<T>(
  schema: any,
  handler: (req: NextApiRequest, res: NextApiResponse, validData: T) => Promise<void>
) {
  return errorHandlerMiddleware(async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      // Parse the request body
      const data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      
      // Validate the data against the schema
      const validData = await schema.validate(data, { abortEarly: false }) as T;
      
      // Call the handler with the validated data
      await handler(req, res, validData);
    } catch (error) {
      // Handle validation errors from the schema
      if (error.name === 'ValidationError' && error.inner) {
        const fieldErrors: Record<string, string> = {};
        
        error.inner.forEach((validationError: any) => {
          fieldErrors[validationError.path] = validationError.message;
        });
        
        throw new ValidationError('Validation failed', fieldErrors);
      }
      
      throw error;
    }
  });
}