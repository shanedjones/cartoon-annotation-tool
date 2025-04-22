'use client';

import { useCallback } from 'react';
import { createReducerContext } from './createReducerContext';
import { Session } from 'next-auth';

/**
 * Auth State Interface
 */
export interface AuthState {
  session: Session | null;
  status: 'loading' | 'authenticated' | 'unauthenticated';
  isAdmin: boolean;
  userMetadata: Record<string, any> | null;
  lastActivityTime: number | null;
}

/**
 * Auth Action Types
 */
export type AuthAction = 
  | { type: 'SET_SESSION'; payload: { session: Session | null } }
  | { type: 'SET_STATUS'; payload: { status: 'loading' | 'authenticated' | 'unauthenticated' } }
  | { type: 'SET_IS_ADMIN'; payload: { isAdmin: boolean } }
  | { type: 'SET_USER_METADATA'; payload: { metadata: Record<string, any> } }
  | { type: 'UPDATE_ACTIVITY_TIME' }
  | { type: 'RESET' };

// Initial state
const initialAuthState: AuthState = {
  session: null,
  status: 'loading',
  isAdmin: false,
  userMetadata: null,
  lastActivityTime: null,
};

// Auth reducer
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_SESSION':
      return {
        ...state,
        session: action.payload.session,
        // Update activity time when session changes
        lastActivityTime: Date.now(),
      };

    case 'SET_STATUS':
      return {
        ...state,
        status: action.payload.status,
      };

    case 'SET_IS_ADMIN':
      return {
        ...state,
        isAdmin: action.payload.isAdmin,
      };

    case 'SET_USER_METADATA':
      return {
        ...state,
        userMetadata: action.payload.metadata,
      };
      
    case 'UPDATE_ACTIVITY_TIME':
      return {
        ...state,
        lastActivityTime: Date.now(),
      };

    case 'RESET':
      return initialAuthState;

    default:
      return state;
  }
}

// Action creators
const authActionCreators = {
  setSession: (session: Session | null) => 
    ({ type: 'SET_SESSION', payload: { session } } as const),
  
  setStatus: (status: 'loading' | 'authenticated' | 'unauthenticated') => 
    ({ type: 'SET_STATUS', payload: { status } } as const),
  
  setIsAdmin: (isAdmin: boolean) => 
    ({ type: 'SET_IS_ADMIN', payload: { isAdmin } } as const),
  
  setUserMetadata: (metadata: Record<string, any>) => 
    ({ type: 'SET_USER_METADATA', payload: { metadata } } as const),
    
  updateActivityTime: () => 
    ({ type: 'UPDATE_ACTIVITY_TIME' } as const),
  
  reset: () => 
    ({ type: 'RESET' } as const),
};

// Define a middleware to log authentication events
const authLoggingMiddleware = (value: any) => {
  const { state } = value;
  
  // Log authentication events in development
  if (process.env.NODE_ENV === 'development') {
    if (state.status === 'authenticated' && state.session) {
      console.log(`[Auth] User authenticated: ${state.session.user?.email}`);
    } else if (state.status === 'unauthenticated') {
      console.log('[Auth] User not authenticated');
    }
  }
  
  return value;
};

// Create the context factory function
export function createAuthContext() {
  const context = createReducerContext<AuthState, AuthAction>(
    'Auth',
    authReducer,
    initialAuthState,
    authActionCreators,
    {
      // Enable logging in development
      actionLogging: process.env.NODE_ENV === 'development',
      // Additional middleware
      middleware: [authLoggingMiddleware],
      // Cache-busting transformer to ensure state is always fresh
      stateTransformers: [
        (state) => ({
          ...state,
          // Initialize lastActivityTime if not set
          lastActivityTime: state.lastActivityTime || Date.now(),
        }),
      ],
    }
  );

  // Extended hook with auth-specific functionality
  const useAuthExtended = () => {
    const contextValue = context.useContextHook();
    const { state, updateActivityTime } = contextValue;

    // Check if user is authenticated
    const isAuthenticated = useCallback(() => {
      return state.status === 'authenticated' && !!state.session;
    }, [state.status, state.session]);

    // Get user ID
    const getUserId = useCallback(() => {
      return state.session?.user?.id || null;
    }, [state.session]);

    // Get user name
    const getUserName = useCallback(() => {
      return state.session?.user?.name || null;
    }, [state.session]);

    // Get user email
    const getUserEmail = useCallback(() => {
      return state.session?.user?.email || null;
    }, [state.session]);
    
    // Check if the session has been inactive for too long
    const isSessionExpired = useCallback((inactivityLimit: number = 30 * 60 * 1000) => {
      if (!state.lastActivityTime) return false;
      
      const now = Date.now();
      const inactiveTime = now - state.lastActivityTime;
      return inactiveTime > inactivityLimit;
    }, [state.lastActivityTime]);
    
    // Record user activity to prevent session timeout
    const recordActivity = useCallback(() => {
      updateActivityTime();
    }, [updateActivityTime]);

    return {
      ...contextValue,
      isAuthenticated,
      getUserId,
      getUserName,
      getUserEmail,
      isSessionExpired,
      recordActivity,
    };
  };

  return {
    ...context,
    useAuth: useAuthExtended,
  };
}