/**
 * JWT token handling utilities with enhanced security features
 */

import { sign, verify, JwtPayload } from 'jsonwebtoken';
import { NextApiResponse } from 'next';
import { logger } from '../utils/logger';
import { ApiError } from '../utils/errorHandling';

// JWT configuration constants
const JWT_SECRET = process.env.JWT_SECRET || '';
const JWT_EXPIRY = '15m';  // Short-lived access token
const REFRESH_TOKEN_EXPIRY = '7d';  // Longer-lived refresh token
const TOKEN_ISSUER = 'cartoon-annotation-tool';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
};

// Token types
export interface TokenPayload extends JwtPayload {
  userId: string;
  email: string;
  role: string;
  tokenVersion?: number;
  type?: string;
}

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * Generate both access and refresh tokens
 */
export function generateTokens(payload: Omit<TokenPayload, 'type' | 'iat' | 'exp'>): Tokens {
  if (!JWT_SECRET) {
    logger.error('JWT_SECRET environment variable is not set');
    throw new ApiError('Authentication configuration error', {
      code: 'INTERNAL_SERVER_ERROR',
      status: 500,
    });
  }

  try {
    // Create the access token
    const accessToken = sign(
      { ...payload, type: 'access' },
      JWT_SECRET,
      { 
        expiresIn: JWT_EXPIRY,
        issuer: TOKEN_ISSUER,
        audience: 'api',
      }
    );
    
    // Create the refresh token with a different type
    const refreshToken = sign(
      { ...payload, type: 'refresh' },
      JWT_SECRET,
      { 
        expiresIn: REFRESH_TOKEN_EXPIRY,
        issuer: TOKEN_ISSUER,
        audience: 'refresh',
      }
    );
    
    return { accessToken, refreshToken };
  } catch (error) {
    logger.error('Failed to generate JWT tokens', error instanceof Error ? error : new Error(String(error)));
    throw new ApiError('Authentication failed', {
      code: 'INTERNAL_SERVER_ERROR',
      status: 500,
    });
  }
}

/**
 * Verify an access token
 */
export function verifyAccessToken(token: string): TokenPayload | null {
  if (!JWT_SECRET) {
    logger.error('JWT_SECRET environment variable is not set');
    return null;
  }
  
  try {
    const decoded = verify(token, JWT_SECRET, {
      issuer: TOKEN_ISSUER,
      audience: 'api',
    }) as TokenPayload;
    
    // Don't allow refresh tokens to be used as access tokens
    if (decoded.type !== 'access') {
      logger.warn('Attempted to use a non-access token as an access token', {
        tokenType: decoded.type,
        userId: decoded.userId,
      });
      return null;
    }
    
    return decoded;
  } catch (error) {
    logger.warn('Access token verification failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Verify a refresh token
 */
export function verifyRefreshToken(token: string): TokenPayload | null {
  if (!JWT_SECRET) {
    logger.error('JWT_SECRET environment variable is not set');
    return null;
  }
  
  try {
    const decoded = verify(token, JWT_SECRET, {
      issuer: TOKEN_ISSUER,
      audience: 'refresh',
    }) as TokenPayload;
    
    // Only allow refresh tokens
    if (decoded.type !== 'refresh') {
      logger.warn('Attempted to use a non-refresh token as a refresh token', {
        tokenType: decoded.type,
        userId: decoded.userId,
      });
      return null;
    }
    
    return decoded;
  } catch (error) {
    logger.warn('Refresh token verification failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Set authentication cookies on the response
 */
export function setAuthCookies(res: NextApiResponse, tokens: Tokens): void {
  // Set the access token with a short expiry
  res.setHeader('Set-Cookie', [
    // Access token - shorter lifetime
    `accessToken=${tokens.accessToken}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${parseInt(JWT_EXPIRY) * 60}`,
    
    // Refresh token - longer lifetime, only accessible by refresh endpoint
    `refreshToken=${tokens.refreshToken}; Path=/api/auth/refresh; HttpOnly; Secure; SameSite=Strict; Max-Age=${parseInt(REFRESH_TOKEN_EXPIRY) * 24 * 60 * 60}`
  ]);
}

/**
 * Clear authentication cookies
 */
export function clearAuthCookies(res: NextApiResponse): void {
  res.setHeader('Set-Cookie', [
    'accessToken=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0',
    'refreshToken=; Path=/api/auth/refresh; HttpOnly; Secure; SameSite=Strict; Max-Age=0'
  ]);
}

/**
 * Refresh access token using a valid refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  const payload = verifyRefreshToken(refreshToken);
  
  if (!payload) {
    return null;
  }
  
  // You would typically check if the refresh token is revoked in a database
  // For now, we'll just create a new access token
  try {
    const { accessToken } = generateTokens({
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      tokenVersion: payload.tokenVersion,
    });
    
    return accessToken;
  } catch (error) {
    logger.error('Failed to refresh access token', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

/**
 * Rotate refresh token (used after suspicious activity or regular rotations)
 * Returns both a new access token and refresh token
 */
export async function rotateTokens(refreshToken: string): Promise<Tokens | null> {
  const payload = verifyRefreshToken(refreshToken);
  
  if (!payload) {
    return null;
  }
  
  // Increment token version to invalidate other refresh tokens
  const tokenVersion = (payload.tokenVersion || 0) + 1;
  
  try {
    return generateTokens({
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      tokenVersion,
    });
  } catch (error) {
    logger.error('Failed to rotate tokens', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}