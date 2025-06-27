import React from 'react';
import { notFound } from 'next/navigation';
import { CollectionBuilderClient } from '@/components/mtg/collection-builder-client';

interface CollectionDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function CollectionDetailPage({ params }: CollectionDetailPageProps) {
  const resolvedParams = await params;
  const collectionId = resolvedParams.id;
  
  if (!collectionId || collectionId.length === 0) {
    notFound();
  }

  return (
    <div className="container mx-auto py-6">
      <CollectionBuilderClient isViewMode={true} collectionId={collectionId} />
    </div>
  );
} 