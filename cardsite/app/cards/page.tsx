import React from 'react';
import { CardSearchPageClient } from '@/components/mtg/card-search-page-client';
import { getAllSets } from '@/lib/api/scryfall';
import type { MTGSet } from '@/lib/types/mtg';

// This runs on the server and caches the sets data
export default async function CardsPage() {
  // Pre-fetch sets on the server - Next.js will cache this automatically
  let initialSets: MTGSet[] = [];
  
  try {
    initialSets = await getAllSets();
  } catch (error) {
    console.error('Failed to fetch sets on server:', error);
    // Fallback to empty array - client can handle error state
  }

  // Pass pre-fetched data to client component
  return <CardSearchPageClient initialSets={initialSets} />;
}

// Enable ISR - revalidate every 30 minutes
export const revalidate = 1800; 