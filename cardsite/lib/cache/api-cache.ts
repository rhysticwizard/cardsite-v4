import { NextRequest, NextResponse } from 'next/server';
import { cache, CACHE_TTL, CACHE_KEYS } from './redis';

export interface CacheConfig {
  ttl?: number;
  staleWhileRevalidate?: number;
  tags?: string[];
  vary?: string[];
}

/**
 * API Route caching wrapper with Redis backend
 */
export function withCache(
  handler: (req: NextRequest) => Promise<NextResponse>,
  config: CacheConfig = {}
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const {
      ttl = CACHE_TTL.API_RESPONSES,
      staleWhileRevalidate = ttl / 2,
      tags = [],
      vary = []
    } = config;

    // Generate cache key from URL and relevant headers
    const cacheKey = generateCacheKey(req, vary);
    
    try {
      // Try to get cached response
      const cachedResponse = await cache.get<{
        status: number;
        headers: Record<string, string>;
        body: any;
        timestamp: number;
      }>(cacheKey);

      const now = Date.now();
      
      if (cachedResponse) {
        const age = Math.floor((now - cachedResponse.timestamp) / 1000);
        const isStale = age > ttl;
        const shouldRevalidate = age > staleWhileRevalidate;

        // Return cached response with cache headers
        if (!isStale || !shouldRevalidate) {
          const response = NextResponse.json(cachedResponse.body, {
            status: cachedResponse.status,
            headers: {
              ...cachedResponse.headers,
              'Cache-Control': `max-age=${ttl}, stale-while-revalidate=${staleWhileRevalidate}`,
              'X-Cache': 'HIT',
              'X-Cache-Age': age.toString(),
            }
          });

          // Background revalidation if stale
          if (shouldRevalidate) {
            // Don't await - run in background
            revalidateInBackground(req, handler, cacheKey, ttl, tags).catch(console.error);
          }

          return response;
        }
      }

      // Cache miss or expired - fetch fresh data
      const startTime = performance.now();
      const freshResponse = await handler(req);
      const responseTime = Math.round(performance.now() - startTime);

      // Only cache successful responses
      if (freshResponse.status >= 200 && freshResponse.status < 300) {
        const responseBody = await freshResponse.json();
        
        // Store in cache
        await cache.set(cacheKey, {
          status: freshResponse.status,
          headers: Object.fromEntries(freshResponse.headers.entries()),
          body: responseBody,
          timestamp: now,
        }, ttl);

        // Return response with cache headers
        return NextResponse.json(responseBody, {
          status: freshResponse.status,
          headers: {
            'Cache-Control': `max-age=${ttl}, stale-while-revalidate=${staleWhileRevalidate}`,
            'X-Cache': 'MISS',
            'X-Response-Time': `${responseTime}ms`,
            ...Object.fromEntries(freshResponse.headers.entries()),
          }
        });
      }

      return freshResponse;
      
    } catch (error) {
      console.error('Cache middleware error:', error);
      // Fall back to handler on cache errors
      return handler(req);
    }
  };
}

/**
 * Background revalidation helper
 */
async function revalidateInBackground(
  req: NextRequest,
  handler: (req: NextRequest) => Promise<NextResponse>,
  cacheKey: string,
  ttl: number,
  tags: string[]
): Promise<void> {
  try {
    const freshResponse = await handler(req);
    
    if (freshResponse.status >= 200 && freshResponse.status < 300) {
      const responseBody = await freshResponse.json();
      
      await cache.set(cacheKey, {
        status: freshResponse.status,
        headers: Object.fromEntries(freshResponse.headers.entries()),
        body: responseBody,
        timestamp: Date.now(),
      }, ttl);
      
      console.log(`🔄 Background revalidation completed for ${cacheKey}`);
    }
  } catch (error) {
    console.error('Background revalidation failed:', error);
  }
}

/**
 * Generate consistent cache key for API requests
 */
function generateCacheKey(req: NextRequest, vary: string[] = []): string {
  const url = new URL(req.url);
  const method = req.method;
  
  // Include search params in key
  const searchParams = url.searchParams.toString();
  
  // Include specified headers in key for cache variance
  const varyHeaders = vary.map(header => 
    `${header}:${req.headers.get(header) || ''}`
  ).join('|');
  
  const keyParts = [
    `${CACHE_KEYS.API_RESPONSE}${method}`,
    url.pathname,
    searchParams,
    varyHeaders
  ].filter(Boolean);
  
  return keyParts.join('|');
}

/**
 * Cache invalidation helper for specific API endpoints
 */
export async function invalidateApiCache(pattern: string): Promise<void> {
  // Note: This is simplified. In production, you'd want to track cache keys
  console.log(`⚠️  API cache invalidation for pattern ${pattern} not fully implemented`);
}

/**
 * Popular API route configurations
 */
export const CACHE_CONFIGS = {
  // Card data - long cache since cards don't change
  CARD_DATA: {
    ttl: CACHE_TTL.CARD_DATA,
    staleWhileRevalidate: CACHE_TTL.CARD_DATA / 2,
    tags: ['cards'] as string[],
  },
  
  // Search results - medium cache
  CARD_SEARCH: {
    ttl: CACHE_TTL.CARD_SEARCH,
    staleWhileRevalidate: CACHE_TTL.CARD_SEARCH / 2,
    tags: ['search', 'cards'] as string[],
    vary: ['authorization'] as string[], // Cache per user for personalized results
  },
  
  // Sets data - very long cache
  SETS_DATA: {
    ttl: CACHE_TTL.SETS_DATA,
    staleWhileRevalidate: CACHE_TTL.SETS_DATA / 2,
    tags: ['sets'] as string[],
  },
  
  // Deck data - medium cache
  DECK_DATA: {
    ttl: CACHE_TTL.DECK_DATA,
    staleWhileRevalidate: CACHE_TTL.DECK_DATA / 2,
    tags: ['decks'] as string[],
  },
  
  // Popular/trending data - short cache for freshness
  POPULAR_DATA: {
    ttl: CACHE_TTL.POPULAR_CARDS,
    staleWhileRevalidate: CACHE_TTL.POPULAR_CARDS / 2,
    tags: ['popular'] as string[],
  },
}; 