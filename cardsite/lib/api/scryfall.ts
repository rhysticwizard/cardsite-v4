import axios from 'axios';
import type { MTGCard, ScryfallSearchResponse, ScryfallSearchParams, MTGSet } from '@/lib/types/mtg';

const SCRYFALL_API_BASE = 'https://api.scryfall.com';

// Create axios instance with rate limiting consideration
const scryfallApi = axios.create({
  baseURL: SCRYFALL_API_BASE,
  timeout: 10000,
  headers: {
    'User-Agent': 'MTG-Community-Hub/1.0',
  },
});

// Much lighter rate limiting - only 50ms, and only when needed
let lastRequestTime = 0;
scryfallApi.interceptors.request.use(async (config) => {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  // Only delay if we're making requests too quickly
  if (timeSinceLastRequest < 50) {
    await new Promise(resolve => setTimeout(resolve, 50 - timeSinceLastRequest));
  }
  
  lastRequestTime = Date.now();
  return config;
});

/**
 * Search for MTG cards using Scryfall's search API
 */
export async function searchCards(params: ScryfallSearchParams): Promise<ScryfallSearchResponse> {
  try {
    const response = await scryfallApi.get<ScryfallSearchResponse>('/cards/search', {
      params: {
        q: params.q,
        unique: params.unique || 'cards',
        order: params.order || 'name',
        dir: params.dir || 'auto',
        include_extras: params.include_extras || false,
        include_multilingual: params.include_multilingual || false,
        include_variations: params.include_variations || false,
        page: params.page || 1,
      },
    });
    
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        // No cards found - return empty result
        return {
          object: 'list',
          total_cards: 0,
          has_more: false,
          data: [],
        };
      }
      throw new Error(`Scryfall API error: ${error.response?.status} ${error.response?.statusText}`);
    }
    throw error;
  }
}

/**
 * Get a specific card by its Scryfall ID
 */
export async function getCardById(id: string): Promise<MTGCard> {
  try {
    const response = await scryfallApi.get<MTGCard>(`/cards/${id}`);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Scryfall API error: ${error.response?.status} ${error.response?.statusText}`);
    }
    throw error;
  }
}

/**
 * Get a random card from Scryfall
 */
export async function getRandomCard(): Promise<MTGCard> {
  try {
    const response = await scryfallApi.get<MTGCard>('/cards/random');
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Scryfall API error: ${error.response?.status} ${error.response?.statusText}`);
    }
    throw error;
  }
}

/**
 * Get card by exact name
 */
export async function getCardByName(name: string, set?: string): Promise<MTGCard> {
  try {
    const params: any = { exact: name };
    if (set) params.set = set;
    
    const response = await scryfallApi.get<MTGCard>('/cards/named', { params });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Scryfall API error: ${error.response?.status} ${error.response?.statusText}`);
    }
    throw error;
  }
}

/**
 * Get fuzzy card name match
 */
export async function getFuzzyCardByName(name: string): Promise<MTGCard> {
  try {
    const response = await scryfallApi.get<MTGCard>('/cards/named', {
      params: { fuzzy: name }
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Scryfall API error: ${error.response?.status} ${error.response?.statusText}`);
    }
    throw error;
  }
}

/**
 * Get autocomplete suggestions for card names
 */
export async function getCardNameSuggestions(query: string): Promise<string[]> {
  try {
    const response = await scryfallApi.get<{ object: string; data: string[] }>('/cards/autocomplete', {
      params: { q: query }
    });
    return response.data.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Scryfall API error: ${error.response?.status} ${error.response?.statusText}`);
    }
    throw error;
  }
}

/**
 * Get all MTG sets
 */
export async function getAllSets(): Promise<MTGSet[]> {
  try {
    const response = await scryfallApi.get<{ object: string; data: MTGSet[] }>('/sets');
    return response.data.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Scryfall API error: ${error.response?.status} ${error.response?.statusText}`);
    }
    throw error;
  }
}

/**
 * Get cards from a specific set
 */
export async function getCardsFromSet(setCode: string, page = 1): Promise<ScryfallSearchResponse> {
  return searchCards({
    q: `set:${setCode}`,
    order: 'set',
    page,
    unique: 'prints', // Get all printings, not just unique cards
    include_extras: true, // Include art cards, tokens, etc.
    include_variations: true, // Include card variations
  });
}

/**
 * Get all prints/variants of a card by name
 */
export async function getCardVariants(cardName: string): Promise<ScryfallSearchResponse> {
  return searchCards({
    q: `!"${cardName}"`,
    unique: 'prints', // Get all printings, not just unique cards
    order: 'released',
    dir: 'desc',
    include_extras: true,
    include_variations: true,
  });
}

// Common search queries
export const COMMON_SEARCHES = {
  // Popular formats
  STANDARD: 'format:standard',
  MODERN: 'format:modern', 
  LEGACY: 'format:legacy',
  VINTAGE: 'format:vintage',
  COMMANDER: 'format:commander',
  PIONEER: 'format:pioneer',
  
  // Card types
  CREATURES: 'type:creature',
  INSTANTS: 'type:instant',
  SORCERIES: 'type:sorcery',
  ENCHANTMENTS: 'type:enchantment',
  ARTIFACTS: 'type:artifact',
  PLANESWALKERS: 'type:planeswalker',
  LANDS: 'type:land',
  
  // Colors
  WHITE: 'color:w',
  BLUE: 'color:u',
  BLACK: 'color:b',
  RED: 'color:r',
  GREEN: 'color:g',
  MULTICOLOR: 'color>=2',
  COLORLESS: 'color:c',
  
  // Rarity
  COMMON: 'rarity:common',
  UNCOMMON: 'rarity:uncommon', 
  RARE: 'rarity:rare',
  MYTHIC: 'rarity:mythic',
} as const; 