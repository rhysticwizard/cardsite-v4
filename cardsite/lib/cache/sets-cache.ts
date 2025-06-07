import { getAllSets } from '@/lib/api/scryfall';
import type { MTGSet } from '@/lib/types/mtg';

// In-memory cache for sets data
let setsCache: {
  data: MTGSet[] | null;
  timestamp: number;
  ttl: number; // 30 minutes
} = {
  data: null,
  timestamp: 0,
  ttl: 30 * 60 * 1000, // 30 minutes in milliseconds
};

/**
 * Get all MTG sets with server-side caching
 * This dramatically reduces API calls and improves performance
 */
export async function getCachedSets(): Promise<MTGSet[]> {
  const now = Date.now();
  
  // Return cached data if it's still fresh
  if (setsCache.data && (now - setsCache.timestamp) < setsCache.ttl) {
    return setsCache.data;
  }
  
  try {
    // Fetch fresh data
    const sets = await getAllSets();
    
    // Update cache
    setsCache = {
      data: sets,
      timestamp: now,
      ttl: setsCache.ttl,
    };
    
    return sets;
  } catch (error) {
    // If fetch fails but we have stale cache, return it
    if (setsCache.data) {
      console.warn('Using stale cache due to API error:', error);
      return setsCache.data;
    }
    throw error;
  }
}

/**
 * Clear the sets cache (useful for development)
 */
export function clearSetsCache(): void {
  setsCache.data = null;
  setsCache.timestamp = 0;
} 