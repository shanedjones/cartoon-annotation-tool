'use client';

import { createContext, useContext, ReactNode } from 'react';
import { SessionProvider, useSession, signIn, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

/**
 * Auth Session Provider Component
 */
export function AuthSessionProvider({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}

/**
 * Auth Context Interface
 */
interface AuthContextType {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  } | null;
  status: "loading" | "authenticated" | "unauthenticated";
  signin: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signout: () => Promise<void>;
}

// Create the context
const AuthContext = createContext<AuthContextType | null>(null);

/**
 * Auth Provider Component
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
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
    } catch {
      return { success: false, error: 'An error occurred. Please try again.' };
    }
  };

  // Sign out function
  const signout = async () => {
    await signOut({ redirect: false });
    router.push('/auth/signin');
  };

  // Context value
  const contextValue = {
    user: session?.user,
    status,
    signin,
    signout,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Custom hook to use the auth context
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

/**
 * Custom hook to check if a user is authenticated and redirect if not
 */
export function useRequireAuth() {
  const { status } = useSession();
  const router = useRouter();

  if (status === 'unauthenticated') {
    router.push('/auth/signin');
    return { status: 'redirecting' };
  }

  return { status };
}
