import { NextRequest, NextResponse } from 'next/server';
import { withCache, CACHE_CONFIGS } from '@/lib/cache/api-cache';
import { getCachedSearchResults } from '@/lib/cache/card-cache';

interface SearchOptions {
  query: string;
  format?: string;
  colors?: string[];
  type?: string;
  cmc?: number;
  page?: number;
}

async function searchCardsFromScryfall(options: SearchOptions) {
  const { query, format, colors, type, cmc, page = 1 } = options;
  
  // Build Scryfall search query
  let searchQuery = query;
  
  if (format) {
    searchQuery += ` f:${format}`;
  }
  
  if (colors && colors.length > 0) {
    searchQuery += ` c:${colors.join('')}`;
  }
  
  if (type) {
    searchQuery += ` t:${type}`;
  }
  
  if (cmc !== undefined) {
    searchQuery += ` cmc:${cmc}`;
  }

  const url = new URL('https://api.scryfall.com/cards/search');
  url.searchParams.set('q', searchQuery);
  url.searchParams.set('page', page.toString());
  url.searchParams.set('order', 'name');

  const response = await fetch(url.toString(), {
    headers: {
      'User-Agent': 'CardSite/1.0',
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      return { data: [], total_cards: 0, has_more: false };
    }
    throw new Error(`Scryfall API error: ${response.status}`);
  }

  return response.json();
}

async function handler(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    
    const query = searchParams.get('q');
    if (!query) {
      return NextResponse.json(
        { error: 'Search query parameter "q" is required' },
        { status: 400 }
      );
    }

    const searchOptions: SearchOptions = {
      query,
      format: searchParams.get('format') || undefined,
      colors: searchParams.get('colors')?.split(',') || undefined,
      type: searchParams.get('type') || undefined,
      cmc: searchParams.get('cmc') ? parseInt(searchParams.get('cmc')!) : undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
    };

    // Use our cached search helper
    const searchResults = await getCachedSearchResults(
      query,
      () => searchCardsFromScryfall(searchOptions),
      {
        format: searchOptions.format,
        colors: searchOptions.colors,
        type: searchOptions.type,
        cmc: searchOptions.cmc,
      }
    );

    // Handle both cached MTGCard[] and fresh Scryfall API response
    const isScryfall = searchResults && typeof searchResults === 'object' && 'data' in searchResults;
    
    return NextResponse.json({
      success: true,
      query: searchOptions,
      results: isScryfall ? (searchResults as any).data : searchResults,
      total: isScryfall ? (searchResults as any).total_cards : searchResults.length,
      has_more: isScryfall ? (searchResults as any).has_more : false,
    });

  } catch (error: any) {
    console.error('Card search API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to search cards',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

// Apply caching middleware with search-specific configuration
export const GET = withCache(handler, CACHE_CONFIGS.CARD_SEARCH); 