'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, status, signout } = useAuth();
  
  // Check if the path is active
  const isActive = (path: string) => pathname === path;

  // Skip rendering on auth pages
  if (pathname.startsWith('/auth/')) {
    return null;
  }

  return (
    <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <span className="text-xl font-bold text-gray-900 dark:text-white">Golf Swing Analysis</span>
            </div>
            <div className="ml-10 flex items-baseline space-x-4">
              <button 
                onClick={() => router.push('/inbox')}
                className="px-3 py-1 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
              >
                Inbox
              </button>
            </div>
          </div>
          <div className="flex items-center">
            {status === 'authenticated' && user ? (
              <div className="flex items-center space-x-4">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{user.name || user.email}</span>
                <button
                  onClick={() => signout()}
                  className="px-3 py-1 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link 
                  href="/auth/signin" 
                  className="px-3 py-1 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
                >
                  Sign in
                </Link>
                <Link 
                  href="/auth/register" 
                  className="px-3 py-1 rounded-md bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-900 dark:text-indigo-200 dark:hover:bg-indigo-800 transition-colors text-sm font-medium"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}