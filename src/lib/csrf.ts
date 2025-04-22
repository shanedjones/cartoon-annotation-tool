/**
 * CSRF protection utilities
 * Provides functions for generating and validating CSRF tokens
 */

import { randomBytes } from 'crypto';
import { NextApiRequest, NextApiResponse } from 'next';
import { logger } from '../utils/logger';
import { AuthorizationError } from '../utils/errorHandling';

// CSRF token cookie name
const CSRF_COOKIE_NAME = 'csrfToken';
// Header name for CSRF token
const CSRF_HEADER_NAME = 'X-CSRF-Token';
// CSRF token expiration (in seconds)
const CSRF_EXPIRATION = 60 * 60; // 1 hour

/**
 * Generate a cryptographically secure random CSRF token
 */
export function generateCsrfToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Set CSRF token as a cookie
 * @returns The generated token
 */
export function setCsrfCookie(res: NextApiResponse): string {
  const token = generateCsrfToken();
  const expires = new Date(Date.now() + CSRF_EXPIRATION * 1000);
  
  res.setHeader('Set-Cookie', 
    `${CSRF_COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Expires=${expires.toUTCString()}`
  );
  
  return token;
}

/**
 * Get CSRF token from cookies
 */
export function getCsrfToken(req: NextApiRequest): string | null {
  return req.cookies[CSRF_COOKIE_NAME] || null;
}

/**
 * Validate CSRF token from request
 * Returns true if valid, throws an error if invalid
 */
export function validateCsrfToken(req: NextApiRequest): boolean {
  const csrfCookie = getCsrfToken(req);
  const csrfHeader = req.headers[CSRF_HEADER_NAME.toLowerCase()] as string;
  
  // Skip validation for methods that should not modify state
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method || '')) {
    return true;
  }
  
  // Check if both cookie and header exist
  if (!csrfCookie || !csrfHeader) {
    logger.warn('CSRF token validation failed: missing token', {
      hasCookie: !!csrfCookie,
      hasHeader: !!csrfHeader,
      path: req.url,
      method: req.method,
    });
    
    throw new AuthorizationError('CSRF token validation failed');
  }
  
  // Check if tokens match
  if (csrfCookie !== csrfHeader) {
    logger.warn('CSRF token validation failed: token mismatch', {
      path: req.url,
      method: req.method,
    });
    
    throw new AuthorizationError('CSRF token validation failed');
  }
  
  return true;
}

/**
 * CSRF protection middleware
 * Validates CSRF tokens for state-changing requests
 */
export function csrfProtection(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      // Skip validation for methods that should not modify state
      if (['GET', 'HEAD', 'OPTIONS'].includes(req.method || '')) {
        return await handler(req, res);
      }
      
      // Validate CSRF token
      validateCsrfToken(req);
      
      // If validation passes, call the handler
      return await handler(req, res);
    } catch (error) {
      if (error instanceof AuthorizationError) {
        return res.status(403).json({
          success: false,
          error: {
            message: error.message,
            code: 'FORBIDDEN',
          },
        });
      }
      
      // Pass other errors to the handler's error handling
      throw error;
    }
  };
}

/**
 * Generate and return CSRF token for use on the client side
 * This token should be included in a hidden form field
 * or sent as a header in subsequent requests
 */
export function getCsrfTokenForClient(req: NextApiRequest, res: NextApiResponse): string {
  // Check if a token already exists
  const existingToken = getCsrfToken(req);
  
  // If no token exists, create one
  if (!existingToken) {
    return setCsrfCookie(res);
  }
  
  return existingToken;
}

/**
 * Helper to add CSRF token to an HTML form
 * Adds both a hidden input field and a script to set the header
 */
export function getCsrfFormField(token: string): string {
  return `
    <input type="hidden" name="csrfToken" value="${token}" />
    <script>
      document.addEventListener('DOMContentLoaded', function() {
        const forms = document.querySelectorAll('form');
        forms.forEach(form => {
          form.addEventListener('submit', function(e) {
            const csrfToken = document.querySelector('input[name="csrfToken"]').value;
            const headers = new Headers();
            headers.append('${CSRF_HEADER_NAME}', csrfToken);
            
            // For fetch requests
            window.csrfToken = csrfToken;
          });
        });
      });
    </script>
  `;
}