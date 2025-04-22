# Epic 5: Authentication and Security

**Description:** Enhance the authentication system and improve overall application security.

## Stories

### Story 5.1: Improve JWT Authentication

**Description:** Enhance the JWT authentication implementation for better security.

**Tasks:**
- Implement proper JWT token handling
- Add token refresh mechanism
- Set secure and HTTP-only cookies
- Add token rotation for security

**Acceptance Criteria:**
- Secure JWT implementation
- Token refresh mechanism
- Secure and HTTP-only cookies
- Token rotation for security

**Example Implementation:**
```typescript
// src/lib/auth.ts
import { sign, verify } from 'jsonwebtoken';
import { NextApiRequest, NextApiResponse } from 'next';
import { logger } from '@/utils/logger';

const JWT_SECRET = process.env.JWT_SECRET || '';
const JWT_EXPIRY = '15m';  // Short-lived token
const REFRESH_TOKEN_EXPIRY = '7d';  // Longer-lived refresh token

interface TokenPayload {
  userId: string;
  email: string;
}

export function generateTokens(payload: TokenPayload) {
  const token = sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
  const refreshToken = sign({ ...payload, type: 'refresh' }, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });
  
  return { token, refreshToken };
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = verify(token, JWT_SECRET) as TokenPayload & { type?: string };
    
    // Don't allow refresh tokens to be used as access tokens
    if (decoded.type === 'refresh') {
      return null;
    }
    
    return decoded;
  } catch (error) {
    logger.warn('Token verification failed', { error });
    return null;
  }
}

export function verifyRefreshToken(token: string): TokenPayload | null {
  try {
    const decoded = verify(token, JWT_SECRET) as TokenPayload & { type?: string };
    
    // Only allow refresh tokens
    if (decoded.type !== 'refresh') {
      return null;
    }
    
    return decoded;
  } catch (error) {
    logger.warn('Refresh token verification failed', { error });
    return null;
  }
}

export function setAuthCookies(res: NextApiResponse, tokens: { token: string; refreshToken: string }) {
  // Access token - HttpOnly to prevent XSS, but accessible to JS for auth header
  res.setHeader('Set-Cookie', [
    `token=${tokens.token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${15 * 60}`,
    `refreshToken=${tokens.refreshToken}; Path=/api/auth/refresh; HttpOnly; Secure; SameSite=Strict; Max-Age=${7 * 24 * 60 * 60}`
  ]);
}

export function clearAuthCookies(res: NextApiResponse) {
  res.setHeader('Set-Cookie', [
    'token=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0',
    'refreshToken=; Path=/api/auth/refresh; HttpOnly; Secure; SameSite=Strict; Max-Age=0'
  ]);
}
```

### Story 5.2: Implement CSRF Protection

**Description:** Add CSRF protection to secure forms and API endpoints.

**Tasks:**
- Generate CSRF tokens for forms
- Validate CSRF tokens on form submission
- Add CSRF protection middleware for API routes
- Add CSRF token to authentication flow

**Acceptance Criteria:**
- CSRF tokens generated for forms
- CSRF token validation on form submission
- CSRF protection middleware for API routes
- CSRF token included in authentication flow

**Example Implementation:**
```typescript
// src/lib/csrf.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { randomBytes } from 'crypto';
import { logger } from '@/utils/logger';

// Generate a CSRF token
export function generateCsrfToken(): string {
  return randomBytes(32).toString('hex');
}

// Set CSRF token cookie
export function setCsrfCookie(res: NextApiResponse): string {
  const token = generateCsrfToken();
  res.setHeader('Set-Cookie', `csrfToken=${token}; Path=/; HttpOnly; Secure; SameSite=Strict`);
  return token;
}

// CSRF protection middleware
export function csrfProtection(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    // Skip for GET, HEAD, OPTIONS
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method || '')) {
      return handler(req, res);
    }
    
    const csrfCookie = req.cookies.csrfToken;
    const csrfHeader = req.headers['x-csrf-token'];
    
    if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
      logger.warn('CSRF token validation failed', {
        hasCookie: !!csrfCookie,
        hasHeader: !!csrfHeader,
        match: csrfCookie === csrfHeader
      });
      
      res.status(403).json({ error: 'CSRF token validation failed' });
      return;
    }
    
    return handler(req, res);
  };
}
```

### Story 5.3: Secure Sensitive Environment Variables

**Description:** Improve handling of sensitive environment variables.

**Tasks:**
- Audit environment variable usage
- Implement secure environment variable loading
- Use Azure Key Vault for production secrets
- Add validation for required environment variables

**Acceptance Criteria:**
- Secure environment variable handling
- Azure Key Vault integration
- Validation for required environment variables
- Documentation on environment variable management

**Example Implementation:**
```typescript
// src/utils/env.ts
import { logger } from './logger';

interface EnvConfig {
  AZURE_STORAGE_CONNECTION_STRING: string;
  COSMOS_ENDPOINT: string;
  COSMOS_KEY: string;
  NEXTAUTH_SECRET: string;
  // Add other environment variables here
}

// Validate environment variables
export function validateEnv(): EnvConfig {
  const missingVars: string[] = [];
  
  const requiredVars = [
    'AZURE_STORAGE_CONNECTION_STRING',
    'COSMOS_ENDPOINT',
    'COSMOS_KEY',
    'NEXTAUTH_SECRET'
  ];
  
  requiredVars.forEach(varName => {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  });
  
  if (missingVars.length > 0) {
    const errorMessage = `Missing required environment variables: ${missingVars.join(', ')}`;
    logger.error(errorMessage);
    throw new Error(errorMessage);
  }
  
  return process.env as unknown as EnvConfig;
}

// Get a specific environment variable with validation
export function getEnv<K extends keyof EnvConfig>(key: K): EnvConfig[K] {
  const value = process.env[key];
  
  if (!value) {
    const errorMessage = `Missing required environment variable: ${key}`;
    logger.error(errorMessage);
    throw new Error(errorMessage);
  }
  
  return value as EnvConfig[K];
}
```

### Story 5.4: Implement Proper Session Management

**Description:** Enhance session management for better security and user experience.

**Tasks:**
- Implement session timeout
- Add session invalidation on password change
- Add session monitoring for suspicious activity
- Implement session persistence options

**Acceptance Criteria:**
- Session timeout functionality
- Session invalidation on password change
- Session monitoring for suspicious activity
- Session persistence options
