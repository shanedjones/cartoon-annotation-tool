'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import HomeContent from '../page';

export default function ReviewPage() {
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