'use client';
import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import HomeContent from '../page';
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
    <Suspense fallback={<div>Loading...</div>}>
      <ReviewContent />
    </Suspense>
  );
}