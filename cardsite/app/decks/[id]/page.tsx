import React from 'react';
import { notFound } from 'next/navigation';
import { DeckBuilderClient } from '@/components/mtg/deck-builder-client';

interface DeckDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function DeckDetailPage({ params }: DeckDetailPageProps) {
  const resolvedParams = await params;
  const deckId = resolvedParams.id;
  
  if (!deckId || deckId.length === 0) {
    notFound();
  }

  return (
    <div className="container mx-auto py-6">
      <DeckBuilderClient isViewMode={true} deckId={deckId} />
    </div>
  );
} 