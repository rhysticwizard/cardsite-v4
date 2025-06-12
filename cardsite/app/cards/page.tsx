import React from 'react';
import { CardSearchPageClient } from '@/components/mtg/card-search-page-client';

// This runs on the server and renders immediately for instant page load
export default function CardsPage() {
  // Render immediately with empty initial sets - client will handle all loading
  return <CardSearchPageClient initialSets={[]} />;
}

// Enable ISR - revalidate every 30 minutes
export const revalidate = 1800; 