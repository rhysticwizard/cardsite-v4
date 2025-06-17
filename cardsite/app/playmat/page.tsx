'use client';

import { Suspense } from 'react';
import { PlaymatV2 } from '@/components/mtg/playmat-v2';

function PlaymatLoading() {
  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center">
      <div className="text-white text-lg">Loading Playmat...</div>
    </div>
  );
}

export default function PlaymatPage() {
  return (
    <Suspense fallback={<PlaymatLoading />}>
      <PlaymatV2 />
    </Suspense>
  );
} 