'use client';
import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import HomeContent from '../page';
import ErrorBoundary from '@/src/components/ErrorBoundary';
function ReviewContent() {
  const searchParams = useSearchParams();
  const videoId = searchParams.get('videoId');
  const router = useRouter();
  useEffect(() => {
    if (!videoId) {
      router.push('/');
    }
  }, [videoId, router]);
  return <HomeContent />;
}
export default function ReviewPage() {
  return (
    <ErrorBoundary
      fallback={
        <div className="flex flex-col items-center justify-center min-h-screen p-8">
          <div className="bg-red-50 p-8 rounded-lg border border-red-200 text-center max-w-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-red-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h2 className="text-xl font-bold text-red-800 mb-4">Something went wrong</h2>
            <p className="text-red-700 mb-6">We encountered an error while loading the review page.</p>
            <div className="flex space-x-4 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                Reload Page
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
              >
                Go to Home
              </button>
            </div>
          </div>
        </div>
      }
      onError={(error) => {
        console.error("Review page error:", error);
      }}
    >
      <Suspense fallback={<div>Loading...</div>}>
        <ReviewContent />
      </Suspense>
    </ErrorBoundary>
  );
}