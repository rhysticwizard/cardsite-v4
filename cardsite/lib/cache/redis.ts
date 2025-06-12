import { kv } from '@vercel/kv';

// Cache TTL configurations (in seconds)
export const CACHE_TTL = {
  // Card data - longer TTL since card data rarely changes
  CARD_DATA: 60 * 60 * 24, // 24 hours
  CARD_SEARCH: 60 * 60 * 2, // 2 hours
  POPULAR_CARDS: 60 * 60 * 6, // 6 hours
  
  // Set data - very long TTL since sets are immutable once released
  SETS_DATA: 60 * 60 * 24 * 7, // 1 week
  
  // Deck data - medium TTL
  DECK_DATA: 60 * 60 * 4, // 4 hours
  POPULAR_DECKS: 60 * 60 * 2, // 2 hours
  
  // User-specific data - shorter TTL
  USER_DECKS: 60 * 30, // 30 minutes
  SEARCH_RESULTS: 60 * 15, // 15 minutes
  
  // API responses - very short TTL for dynamic content
  API_RESPONSES: 60 * 5, // 5 minutes
} as const;

// Cache key prefixes for organization
export const CACHE_KEYS = {
  CARD: 'card:',
  CARD_SEARCH: 'search:cards:',
  POPULAR_CARDS: 'popular:cards',
  SETS: 'sets:all',
  DECK: 'deck:',
  POPULAR_DECKS: 'popular:decks',
  USER_DECKS: 'user:decks:',
  SEARCH_RESULTS: 'search:results:',
  API_RESPONSE: 'api:',
} as const;

/**
 * Generic cache utility with fallback to memory for development
 */
export class CacheManager {
  private useVercelKV: boolean;
  private memoryCache = new Map<string, { data: any; expires: number }>();

  constructor() {
    // Use Vercel KV in production, memory cache in development
    this.useVercelKV = process.env.NODE_ENV === 'production' && !!process.env.KV_URL;
  }

  /**
   * Get data from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      if (this.useVercelKV) {
        return await kv.get<T>(key);
      } else {
        // Memory cache fallback for development
        const cached = this.memoryCache.get(key);
        if (cached && cached.expires > Date.now()) {
          return cached.data;
        }
        return null;
      }
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set data in cache with TTL
   */
  async set<T>(key: string, data: T, ttlSeconds: number = CACHE_TTL.API_RESPONSES): Promise<void> {
    try {
      if (this.useVercelKV) {
        await kv.setex(key, ttlSeconds, data);
      } else {
        // Memory cache fallback for development
        this.memoryCache.set(key, {
          data,
          expires: Date.now() + (ttlSeconds * 1000)
        });
      }
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
    }
  }

  /**
   * Delete data from cache
   */
  async delete(key: string): Promise<void> {
    try {
      if (this.useVercelKV) {
        await kv.del(key);
      } else {
        this.memoryCache.delete(key);
      }
    } catch (error) {
      console.error(`Cache delete error for key ${key}:`, error);
    }
  }

  /**
   * Get multiple keys at once
   */
  async mget<T>(...keys: string[]): Promise<(T | null)[]> {
    try {
      if (this.useVercelKV) {
        const result = await kv.mget(...keys);
        return result as (T | null)[];
      } else {
        return keys.map(key => {
          const cached = this.memoryCache.get(key);
          return (cached && cached.expires > Date.now()) ? cached.data : null;
        });
      }
    } catch (error) {
      console.error(`Cache mget error for keys ${keys.join(', ')}:`, error);
      return keys.map(() => null);
    }
  }

  /**
   * Set multiple key-value pairs
   */
  async mset(pairs: Array<{ key: string; value: any; ttl?: number }>): Promise<void> {
    try {
      if (this.useVercelKV) {
        // Vercel KV doesn't have msetex, so we'll do individual sets
        await Promise.all(pairs.map(({ key, value, ttl = CACHE_TTL.API_RESPONSES }) => 
          kv.setex(key, ttl, value)
        ));
      } else {
        pairs.forEach(({ key, value, ttl = CACHE_TTL.API_RESPONSES }) => {
          this.memoryCache.set(key, {
            data: value,
            expires: Date.now() + (ttl * 1000)
          });
        });
      }
    } catch (error) {
      console.error(`Cache mset error:`, error);
    }
  }

  /**
   * Clear all cache (useful for development)
   */
  async flush(): Promise<void> {
    try {
      if (this.useVercelKV) {
        // Note: Vercel KV doesn't have flushall, would need to track keys
        console.warn('Flush not implemented for Vercel KV');
      } else {
        this.memoryCache.clear();
      }
    } catch (error) {
      console.error(`Cache flush error:`, error);
    }
  }

  /**
   * Get cache statistics (development only)
   */
  getStats() {
    if (!this.useVercelKV) {
      return {
        size: this.memoryCache.size,
        keys: Array.from(this.memoryCache.keys()),
      };
    }
    return { message: 'Stats not available for Vercel KV' };
  }
}

// Singleton instance
export const cache = new CacheManager();

/**
 * Cache-or-fetch pattern helper
 */
export async function cacheOrFetch<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttlSeconds: number = CACHE_TTL.API_RESPONSES
): Promise<T> {
  // Try to get from cache first
  const cached = await cache.get<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Cache miss - fetch fresh data
  try {
    const freshData = await fetchFn();
    
    // Store in cache for next time
    await cache.set(key, freshData, ttlSeconds);
    
    return freshData;
  } catch (error) {
    console.error(`Cache-or-fetch error for key ${key}:`, error);
    throw error;
  }
}

/**
 * Popular MTG cards for cache warming
 */
export const POPULAR_CARDS = [
  'Lightning Bolt',
  'Sol Ring',
  'Counterspell',
  'Path to Exile',
  'Swords to Plowshares',
  'Lightning Strike',
  'Llanowar Elves',
  'Birds of Paradise',
  'Brainstorm',
  'Ponder',
  'Dark Ritual',
  'Giant Growth',
  'Shock',
  'Duress',
  'Negate',
] as const; 