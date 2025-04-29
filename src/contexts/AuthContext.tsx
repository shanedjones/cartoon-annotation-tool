'use client';
import { createContext, useContext, ReactNode } from 'react';
import { SessionProvider, useSession, signIn, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
export function AuthSessionProvider({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
interface AuthContextType {
  user: any;
  status: "loading" | "authenticated" | "unauthenticated";
  signin: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signout: () => Promise<void>;
}
const AuthContext = createContext<AuthContextType | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
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
  const signout = async () => {
    await signOut({ redirect: false });
    router.push('/auth/signin');
  };
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
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
export function useRequireAuth() {
  const { status } = useSession();
  const router = useRouter();
  if (status === 'unauthenticated') {
    router.push('/auth/signin');
    return { status: 'redirecting' };
  }
  return { status };
}
