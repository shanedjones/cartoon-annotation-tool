'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import HomeContent from '../page';

// Create a client component that uses search params
function ReviewContent() {
  const searchParams = useSearchParams();
  const videoId = searchParams.get('videoId');
  const router = useRouter();
  
  // If no videoId is provided, redirect to home
  useEffect(() => {
    if (!videoId) {
      router.push('/');
    }
  }, [videoId, router]);

  // Use the same HomeContent component from app/page.tsx
  return <HomeContent />;
}

// Main page component with Suspense boundary
export default function ReviewPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ReviewContent />
    </Suspense>
  );
}