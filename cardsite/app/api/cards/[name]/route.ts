import { NextRequest, NextResponse } from 'next/server';
import { withCache, CACHE_CONFIGS } from '@/lib/cache/api-cache';
import { getCachedCard } from '@/lib/cache/card-cache';

async function fetchCardFromScryfall(cardName: string) {
  const response = await fetch(
    `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(cardName)}`,
    {
      headers: {
        'User-Agent': 'CardSite/1.0',
      },
    }
  );

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Card not found');
    }
    throw new Error(`Scryfall API error: ${response.status}`);
  }

  return response.json();
}

async function handler(req: NextRequest): Promise<NextResponse> {
  try {
    const { pathname } = new URL(req.url);
    const cardName = decodeURIComponent(pathname.split('/').pop() || '');

    if (!cardName) {
      return NextResponse.json(
        { error: 'Card name is required' },
        { status: 400 }
      );
    }

    // Use our cache-or-fetch helper
    const cardData = await getCachedCard(cardName, () => fetchCardFromScryfall(cardName));

    return NextResponse.json({
      success: true,
      data: cardData,
      cached: true, // This will be set appropriately by the cache layer
    });

  } catch (error: any) {
    console.error('Card API error:', error);
    
    if (error.message === 'Card not found') {
      return NextResponse.json(
        { error: 'Card not found', cardName: req.url.split('/').pop() },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch card data' },
      { status: 500 }
    );
  }
}

// Apply caching middleware with card-specific configuration
export const GET = withCache(handler, CACHE_CONFIGS.CARD_DATA); 