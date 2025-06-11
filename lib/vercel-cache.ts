// Simple caching layer for Vercel + Supabase setup
// Uses Next.js built-in caching and can be extended with Vercel KV

export type CacheOptions = {
  revalidate?: number // Next.js ISR revalidation time in seconds
  tags?: string[] // Next.js cache tags for revalidation
}

// Next.js API route caching helper
export function withCache<T>(
  fetchFn: () => Promise<T>,
  options: CacheOptions = {}
) {
  const { revalidate = 3600, tags = [] } = options
  
  return fetchFn() // Next.js will handle caching based on route configuration
}

// Client-side caching strategies using React Query (which you already have)
export const cacheConfig = {
  // Card data - changes rarely
  cards: {
    staleTime: 1000 * 60 * 30, // 30 minutes
    cacheTime: 1000 * 60 * 60 * 2, // 2 hours
  },
  
  // User decks - personal data, shorter cache
  userDecks: {
    staleTime: 1000 * 60 * 5, // 5 minutes
    cacheTime: 1000 * 60 * 15, // 15 minutes
  },
  
  // Search results - medium cache
  search: {
    staleTime: 1000 * 60 * 10, // 10 minutes
    cacheTime: 1000 * 60 * 30, // 30 minutes
  },
  
  // Popular/trending data - frequent updates
  trending: {
    staleTime: 1000 * 60 * 2, // 2 minutes
    cacheTime: 1000 * 60 * 10, // 10 minutes
  }
}

// Simple memory cache for server-side (development only)
class SimpleCache<T> {
  private cache = new Map<string, { data: T; expires: number }>()
  
  get(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry || Date.now() > entry.expires) {
      this.cache.delete(key)
      return null
    }
    return entry.data
  }
  
  set(key: string, data: T, ttlSeconds: number = 300): void {
    this.cache.set(key, {
      data,
      expires: Date.now() + (ttlSeconds * 1000)
    })
  }
  
  delete(key: string): void {
    this.cache.delete(key)
  }
  
  clear(): void {
    this.cache.clear()
  }
}

// Export singleton for development
export const devCache = new SimpleCache()

// Vercel KV setup (add when you need it for production scaling)
/*
For production scaling to 200k users, you'd add:

1. Install Vercel KV:
   npm install @vercel/kv

2. Set up environment variables in Vercel dashboard:
   KV_REST_API_URL
   KV_REST_API_TOKEN

3. Use like this:

import { kv } from '@vercel/kv'

export async function getCachedData<T>(
  key: string, 
  fetchFn: () => Promise<T>,
  ttlSeconds: number = 300
): Promise<T> {
  // Try cache first
  const cached = await kv.get<T>(key)
  if (cached) return cached
  
  // Fetch fresh data
  const fresh = await fetchFn()
  await kv.setex(key, ttlSeconds, fresh)
  return fresh
}
*/

// Cache warming for popular content
export async function warmCache() {
  // This would run during deployment or on a schedule
  const popularSearches = [
    'Lightning Bolt',
    'Counterspell', 
    'Sol Ring',
    'Black Lotus'
  ]
  
  // In production, you'd pre-load these into your cache
  console.log('Cache warming would pre-load:', popularSearches)
}

// Performance monitoring
export function logCacheMetrics(operation: string, hit: boolean, duration: number) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`Cache ${hit ? 'HIT' : 'MISS'}: ${operation} (${duration}ms)`)
  }
  
  // In production, you'd send this to your monitoring service
  // (Vercel Analytics, Sentry, etc.)
} 