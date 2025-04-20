'use client';

import { useContext, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { signIn, signOut } from 'next-auth/react';
import { AuthContext } from './context';
import { AUTH_ACTIONS } from './reducer';
import { User } from '../types';

/**
 * Hook to access auth state
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context.state;
}

/**
 * Hook to access auth actions
 */
export function useAuthActions() {
  const context = useContext(AuthContext);
  const router = useRouter();
  
  if (!context) {
    throw new Error('useAuthActions must be used within an AuthProvider');
  }
  
  const { dispatch } = context;

  // Define all callbacks individually first
  const setUser = useCallback(
    (user: User | null) => 
      dispatch({ type: AUTH_ACTIONS.SET_USER, payload: { user } }),
    [dispatch]
  );

  const setStatus = useCallback(
    (status: 'loading' | 'authenticated' | 'unauthenticated' | 'error') => 
      dispatch({ type: AUTH_ACTIONS.SET_STATUS, payload: { status } }),
    [dispatch]
  );

  const setError = useCallback(
    (error: string) => 
      dispatch({ type: AUTH_ACTIONS.SET_ERROR, payload: { error } }),
    [dispatch]
  );

  const signin = useCallback(
    async (email: string, password: string) => {
      dispatch({ type: AUTH_ACTIONS.SIGN_IN_START });
      
      try {
        const result = await signIn('credentials', {
          redirect: false,
          email,
          password,
        });

        if (result?.error) {
          dispatch({ 
            type: AUTH_ACTIONS.SIGN_IN_FAILURE, 
            payload: { error: 'Invalid email or password' } 
          });
          return { success: false, error: 'Invalid email or password' };
        }

        // Auth state will be updated via the useSession effect in the provider
        return { success: true };
      } catch (error) {
        dispatch({ 
          type: AUTH_ACTIONS.SIGN_IN_FAILURE, 
          payload: { error: 'An error occurred. Please try again.' } 
        });
        return { success: false, error: 'An error occurred. Please try again.' };
      }
    },
    [dispatch]
  );

  const signout = useCallback(
    async () => {
      await signOut({ redirect: false });
      dispatch({ type: AUTH_ACTIONS.SIGN_OUT });
      router.push('/auth/signin');
    },
    [dispatch, router]
  );

  // Return an object with all the actions
  return {
    setUser,
    setStatus,
    setError,
    signin,
    signout
  };
}

/**
 * Convenience hook for checking if user is authenticated
 */
export function useIsAuthenticated() {
  const { user, status } = useAuth();
  return status === 'authenticated' && user !== null;
}

/**
 * Hook to require authentication and redirect if not authenticated
 */
export function useRequireAuth() {
  const { status } = useAuth();
  const router = useRouter();

  if (status === 'unauthenticated') {
    router.push('/auth/signin');
    return { status: 'redirecting' };
  }

  return { status };
}
