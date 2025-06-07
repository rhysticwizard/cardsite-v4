import React from 'react';
import { CardDetailPage } from '@/components/mtg/card-detail-page';

interface CardPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function CardPage({ params }: CardPageProps) {
  const { id } = await params;
  return <CardDetailPage cardId={id} />;
} 