/**
 * Session management utilities
 * Handles session timeouts, activity tracking, and security features
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { getEnvAsInt } from './env';
import { logger } from './logger';
import { verifyAccessToken, clearAuthCookies, refreshAccessToken } from '../lib/jwt';

// Session configuration
const SESSION_TIMEOUT_MINUTES = getEnvAsInt('SESSION_TIMEOUT_MINUTES', 30);
const SESSION_ABSOLUTE_TIMEOUT_HOURS = 24; // Force re-login after 24 hours
const ACTIVITY_UPDATE_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

// Store sessions in memory (in production, use Redis or similar)
interface SessionData {
  userId: string;
  createdAt: number;
  lastActivity: number;
  ipAddress: string;
  userAgent: string;
  isActive: boolean;
}

// In-memory session store (replace with Redis in production)
const sessions: Map<string, SessionData> = new Map();

/**
 * Create a new session
 */
export function createSession(
  userId: string,
  req: NextApiRequest
): string {
  const sessionId = generateSessionId();
  const now = Date.now();
  
  // Store session data
  sessions.set(sessionId, {
    userId,
    createdAt: now,
    lastActivity: now,
    ipAddress: getClientIp(req),
    userAgent: req.headers['user-agent'] || 'unknown',
    isActive: true,
  });
  
  // Log session creation
  logger.info('Session created', {
    userId,
    sessionId,
    ipAddress: getClientIp(req),
  });
  
  return sessionId;
}

/**
 * Update session activity timestamp
 */
export function updateSessionActivity(sessionId: string): boolean {
  const session = sessions.get(sessionId);
  
  if (!session) {
    return false;
  }
  
  // Only update activity if enough time has passed since the last update
  // This prevents excessive updates
  const now = Date.now();
  if (now - session.lastActivity < ACTIVITY_UPDATE_INTERVAL_MS) {
    return true;
  }
  
  // Update last activity timestamp
  session.lastActivity = now;
  sessions.set(sessionId, session);
  
  return true;
}

/**
 * Validate session is active and not expired
 */
export function validateSession(sessionId: string, req: NextApiRequest): boolean {
  const session = sessions.get(sessionId);
  
  if (!session || !session.isActive) {
    return false;
  }
  
  const now = Date.now();
  
  // Check if session has expired due to inactivity
  const inactivityTime = now - session.lastActivity;
  const inactivityTimeoutMs = SESSION_TIMEOUT_MINUTES * 60 * 1000;
  
  if (inactivityTime > inactivityTimeoutMs) {
    invalidateSession(sessionId, 'timeout');
    return false;
  }
  
  // Check if session has reached absolute timeout
  const sessionAge = now - session.createdAt;
  const absoluteTimeoutMs = SESSION_ABSOLUTE_TIMEOUT_HOURS * 60 * 60 * 1000;
  
  if (sessionAge > absoluteTimeoutMs) {
    invalidateSession(sessionId, 'absolute-timeout');
    return false;
  }
  
  // Security checks: Validate IP and user agent to prevent session hijacking
  // This is a simple implementation - in production, you might want more sophisticated rules
  const ipAddress = getClientIp(req);
  const userAgent = req.headers['user-agent'] || 'unknown';
  
  if (session.ipAddress !== ipAddress || session.userAgent !== userAgent) {
    logger.warn('Session security check failed', {
      sessionId,
      userId: session.userId,
      expectedIp: session.ipAddress,
      actualIp: ipAddress,
      expectedUserAgent: session.userAgent,
      actualUserAgent: userAgent,
    });
    
    invalidateSession(sessionId, 'security-check');
    return false;
  }
  
  // Update session activity
  updateSessionActivity(sessionId);
  
  return true;
}

/**
 * Invalidate a session
 */
export function invalidateSession(sessionId: string, reason: string = 'logout'): void {
  const session = sessions.get(sessionId);
  
  if (!session) {
    return;
  }
  
  // Mark session as inactive
  session.isActive = false;
  sessions.set(sessionId, session);
  
  // Log session invalidation
  logger.info('Session invalidated', {
    sessionId,
    userId: session.userId,
    reason,
  });
  
  // In a real implementation, you might want to add the session to a blacklist
  // to prevent token reuse even if the token is still valid
}

/**
 * Get session data
 */
export function getSession(sessionId: string): SessionData | null {
  const session = sessions.get(sessionId);
  
  if (!session || !session.isActive) {
    return null;
  }
  
  return session;
}

/**
 * Clean up expired sessions
 * This should be run periodically (e.g., via a cron job)
 */
export function cleanupExpiredSessions(): void {
  const now = Date.now();
  const inactivityTimeoutMs = SESSION_TIMEOUT_MINUTES * 60 * 1000;
  const absoluteTimeoutMs = SESSION_ABSOLUTE_TIMEOUT_HOURS * 60 * 60 * 1000;
  
  let expiredCount = 0;
  
  sessions.forEach((session, sessionId) => {
    const inactivityTime = now - session.lastActivity;
    const sessionAge = now - session.createdAt;
    
    if (inactivityTime > inactivityTimeoutMs || sessionAge > absoluteTimeoutMs || !session.isActive) {
      sessions.delete(sessionId);
      expiredCount++;
    }
  });
  
  logger.info(`Cleaned up ${expiredCount} expired sessions. Remaining: ${sessions.size}`);
}

/**
 * Get all active sessions for a user
 */
export function getUserSessions(userId: string): string[] {
  const userSessions: string[] = [];
  
  sessions.forEach((session, sessionId) => {
    if (session.userId === userId && session.isActive) {
      userSessions.push(sessionId);
    }
  });
  
  return userSessions;
}

/**
 * Invalidate all sessions for a user
 * Used when changing password, etc.
 */
export function invalidateUserSessions(userId: string, reason: string = 'user-security'): void {
  const userSessions = getUserSessions(userId);
  
  userSessions.forEach(sessionId => {
    invalidateSession(sessionId, reason);
  });
  
  logger.info(`Invalidated ${userSessions.length} sessions for user ${userId}`, { reason });
}

/**
 * Session middleware
 * Validates the session from the access token and attaches the user to the request
 */
export function sessionMiddleware(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    // Skip validation for authentication routes
    if (req.url?.startsWith('/api/auth')) {
      return await handler(req, res);
    }
    
    // Get access token from cookie
    const accessToken = req.cookies.accessToken;
    
    if (!accessToken) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required',
          code: 'UNAUTHORIZED',
        },
      });
    }
    
    // Verify access token
    const tokenPayload = verifyAccessToken(accessToken);
    
    if (!tokenPayload) {
      // Clear invalid cookies
      clearAuthCookies(res);
      
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid or expired session',
          code: 'UNAUTHORIZED',
        },
      });
    }
    
    // Attach user information to request
    (req as any).user = {
      id: tokenPayload.userId,
      email: tokenPayload.email,
      role: tokenPayload.role,
    };
    
    // Continue to handler
    return await handler(req, res);
  };
}

/**
 * Generate a random session ID
 */
function generateSessionId(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Get client IP address from request
 */
function getClientIp(req: NextApiRequest): string {
  return (req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || 'unknown')
    .split(',')[0]
    .trim();
}