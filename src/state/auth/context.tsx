'use client';

import React, { createContext, useReducer, ReactNode, useMemo, useEffect } from 'react';
import { AuthState } from '../types';
import { authReducer, initialAuthState, AuthAction, AUTH_ACTIONS } from './reducer';
import { useSession, SessionProvider, signIn, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { withDevTools } from '../utils';

// Context type includes both state and dispatch
type AuthContextType = {
  state: AuthState;
  dispatch: React.Dispatch<AuthAction>;
};

// Create the context
export const AuthContext = createContext<AuthContextType | null>(null);

/**
 * NextAuth Session Provider (separate from our reducer-based state)
 */
export function AuthSessionProvider({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}

// Provider props
interface AuthProviderProps {
  children: ReactNode;
  initialState?: Partial<AuthState>;
}

/**
 * Auth Provider component that uses our reducer pattern
 * and synchronizes with NextAuth session
 */
export function AuthProvider({ children, initialState }: AuthProviderProps) {
  const router = useRouter();
  const { data: session, status: nextAuthStatus } = useSession();
  
  // Initialize reducer with merged initial state and DevTools support
  const [state, dispatch] = useReducer(
    withDevTools(authReducer, 'auth'),
    { ...initialAuthState, ...initialState }
  );

  // Sync NextAuth session state with our reducer state
  useEffect(() => {
    if (nextAuthStatus === 'loading') {
      dispatch({ type: AUTH_ACTIONS.SET_STATUS, payload: { status: 'loading' } });
    } else if (nextAuthStatus === 'authenticated' && session?.user) {
      // Use type assertion to include id which is defined in next-auth.d.ts
      const user = session.user as any;
      dispatch({ 
        type: AUTH_ACTIONS.SET_USER, 
        payload: { 
          user: {
            id: user.id || 'unknown',
            name: session.user.name || undefined,
            email: session.user.email || undefined,
            image: session.user.image || undefined,
          } 
        } 
      });
    } else {
      dispatch({ type: AUTH_ACTIONS.SET_STATUS, payload: { status: 'unauthenticated' } });
    }
  }, [session, nextAuthStatus]);

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({ state, dispatch }), [state]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}