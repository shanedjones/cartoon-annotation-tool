'use client';

import { ReactNode, useEffect } from 'react';
import { SessionProvider, useSession, signIn, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { createAuthContext } from './factory/authFactory';

/**
 * Auth Session Provider Component
 */
export function AuthSessionProvider({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}

// Create the auth context using the factory
const { 
  Provider: AuthContextProvider, 
  useAuth: useAuthFactory
} = createAuthContext();

/**
 * Enhanced Auth Provider Component that integrates with NextAuth
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { setSession, setStatus, recordActivity } = useAuthFactory();

  // Keep our context in sync with NextAuth session
  useEffect(() => {
    setSession(session || null);
    setStatus(status);
  }, [session, status, setSession, setStatus]);

  // Record user activity on interactions
  useEffect(() => {
    const handleActivity = () => {
      recordActivity();
    };

    // Add activity listeners
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);
    window.addEventListener('scroll', handleActivity);

    return () => {
      // Clean up listeners
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('scroll', handleActivity);
    };
  }, [recordActivity]);

  return (
    <AuthContextProvider>
      {children}
    </AuthContextProvider>
  );
}

/**
 * Custom hook to use the auth context with NextAuth integration
 */
export function useAuth() {
  const auth = useAuthFactory();
  const router = useRouter();
  
  // Sign in function
  const signin = async (email: string, password: string) => {
    try {
      const result = await signIn('credentials', {
        redirect: false,
        email,
        password,
      });

      if (result?.error) {
        return { success: false, error: 'Invalid email or password' };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'An error occurred. Please try again.' };
    }
  };

  // Sign out function
  const signout = async () => {
    await signOut({ redirect: false });
    router.push('/auth/signin');
  };
  
  return {
    // Pass through all factory auth values
    ...auth,
    // Add NextAuth specific functionality
    user: auth.state.session?.user,
    status: auth.state.status,
    signin,
    signout,
  };
}

/**
 * Custom hook to check if a user is authenticated and redirect if not
 */
export function useRequireAuth() {
  const { status, isSessionExpired } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated' && isSessionExpired()) {
      // Handle session timeout
      signOut({ redirect: false });
      router.push('/auth/signin?expired=true');
    }
  }, [status, isSessionExpired, router]);

  return { 
    status: status === 'unauthenticated' ? 'redirecting' : status 
  };
}