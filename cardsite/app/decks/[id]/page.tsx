import React from 'react';
import { notFound } from 'next/navigation';
import { DeckBuilderClient } from '@/components/mtg/deck-builder-client';

interface DeckDetailPageProps {
  params: {
    id: string;
  };
}

export default function DeckDetailPage({ params }: DeckDetailPageProps) {
  const deckId = params.id;
  
  if (!deckId || deckId.length === 0) {
    notFound();
  }

  return (
    <div className="container mx-auto py-6">
      <DeckBuilderClient isViewMode={true} deckId={deckId} />
    </div>
  );
} 