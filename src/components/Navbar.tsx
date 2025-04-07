'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';

export function Navbar() {
  const pathname = usePathname();
  const { user, status, signout } = useAuth();
  
  // Check if the path is active
  const isActive = (path: string) => pathname === path;

  // Skip rendering on auth pages
  if (pathname.startsWith('/auth/')) {
    return null;
  }

  return (
    <nav className="bg-gray-800 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex-shrink-0 flex items-center">
              <span className="text-xl font-bold">Cartoon Annotation Tool</span>
            </Link>
            <div className="ml-10 flex items-baseline space-x-4">
              <Link 
                href="/" 
                className={`px-3 py-2 rounded-md text-sm font-medium ${isActive('/') ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}
              >
                Home
              </Link>
              <Link 
                href="/inbox" 
                className={`px-3 py-2 rounded-md text-sm font-medium ${isActive('/inbox') ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}
              >
                Inbox
              </Link>
            </div>
          </div>
          <div className="flex items-center">
            {status === 'authenticated' && user ? (
              <div className="flex items-center space-x-4">
                <span className="text-sm font-medium">{user.name || user.email}</span>
                <button
                  onClick={() => signout()}
                  className="px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link 
                  href="/auth/signin" 
                  className="px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white"
                >
                  Sign in
                </Link>
                <Link 
                  href="/auth/register" 
                  className="px-3 py-2 rounded-md text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700"
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