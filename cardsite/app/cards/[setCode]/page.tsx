import React from 'react';
import { SetDetailPage } from '@/components/mtg/set-detail-page';

interface SetPageProps {
  params: Promise<{
    setCode: string;
  }>;
}

export default async function SetPage({ params }: SetPageProps) {
  const { setCode } = await params;
  return <SetDetailPage setCode={setCode} />;
} 