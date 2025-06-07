import type { MTGCard, ScryfallSearchResponse, ScryfallSearchParams, MTGSet } from '@/lib/types/mtg';

const SCRYFALL_API_BASE = 'https://api.scryfall.com';

// Simple rate limiting without interceptors
let lastRequestTime = 0;
const rateLimit = async () => {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < 50) {
    await new Promise(resolve => setTimeout(resolve, 50 - timeSinceLastRequest));
  }
  
  lastRequestTime = Date.now();
};

// Fast fetch wrapper
async function fastFetch<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
  await rateLimit();
  
  let url = `${SCRYFALL_API_BASE}${endpoint}`;
  
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    
    if (searchParams.toString()) {
      url += `?${searchParams.toString()}`;
    }
  }
  
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'MTG-Community-Hub/1.0',
    },
  });
  
  if (!response.ok) {
    if (response.status === 404) {
      // Return empty result for 404s
      return {
        object: 'list',
        total_cards: 0,
        has_more: false,
        data: [],
      } as T;
    }
    throw new Error(`Scryfall API error: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * FAST: Search for MTG cards
 */
export async function fastSearchCards(params: ScryfallSearchParams): Promise<ScryfallSearchResponse> {
  return fastFetch<ScryfallSearchResponse>('/cards/search', {
    q: params.q,
    unique: params.unique || 'cards',
    order: params.order || 'name',
    dir: params.dir || 'auto',
    include_extras: params.include_extras || false,
    include_multilingual: params.include_multilingual || false,
    include_variations: params.include_variations || false,
    page: params.page || 1,
  });
}

/**
 * FAST: Get all MTG sets
 */
export async function fastGetAllSets(): Promise<MTGSet[]> {
  const response = await fastFetch<{ object: string; data: MTGSet[] }>('/sets');
  return response.data;
}

/**
 * FAST: Get cards from a specific set
 */
export async function fastGetCardsFromSet(setCode: string, page = 1): Promise<ScryfallSearchResponse> {
  return fastSearchCards({
    q: `set:${setCode}`,
    order: 'set',
    page,
    unique: 'prints', // Get all printings, not just unique cards
    include_extras: true, // Include art cards, tokens, etc.  
    include_variations: true, // Include card variations
  });
}

/**
 * FAST: Get a specific card by ID
 */
export async function fastGetCardById(id: string): Promise<MTGCard> {
  return fastFetch<MTGCard>(`/cards/${id}`);
}

/**
 * FAST: Get random card
 */
export async function fastGetRandomCard(): Promise<MTGCard> {
  return fastFetch<MTGCard>('/cards/random');
} 