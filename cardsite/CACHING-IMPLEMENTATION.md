# Caching Layer Implementation - Phase 9 Complete

## 🎉 Overview

This implements a comprehensive 3-tier caching strategy for optimal MTG card site performance:

1. **Browser Cache** → React Query client-side caching
2. **Redis Cache** → Vercel KV/Redis server-side caching  
3. **External APIs** → Scryfall, etc.

**Expected Performance Gains:** 10-50x faster responses for cached data

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Browser       │ → │   React Query   │ → │   Redis Cache   │ → │   External API  │
│   Cache         │    │   (Client)      │    │   (Server)      │    │   (Scryfall)    │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ • HTTP Cache    │    │ • Smart TTL     │    │ • Vercel KV     │    │ • Rate Limited  │
│ • Service Worker│    │ • Background    │    │ • Auto-expire   │    │ • Slow Response │
│ • Local Storage │    │   Refetch       │    │ • Stale-while-  │    │ • High Latency  │
│                 │    │ • Optimistic    │    │   revalidate    │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📂 File Structure

```
cardsite/
├── lib/cache/
│   ├── redis.ts              # Core Redis cache manager
│   ├── card-cache.ts         # Card-specific cache utilities
│   ├── sets-cache.ts         # MTG sets caching (upgraded)
│   └── api-cache.ts          # API route caching middleware
├── hooks/
│   └── use-cached-cards.ts   # React Query hooks
├── app/api/
│   ├── cards/[name]/route.ts    # Cached card API
│   ├── cards/search/route.ts    # Cached search API
│   └── cache/status/route.ts    # Cache monitoring
├── scripts/
│   └── cache-warming.ts      # Cache warming utilities
└── app/providers.tsx         # Enhanced React Query config
```

## 🚀 Key Features

### ✅ Multi-Tier Caching Strategy
- **Client-side:** React Query with 2-24 hour TTL
- **Server-side:** Redis with smart TTL based on data type
- **API-level:** Response caching with stale-while-revalidate

### ✅ Smart TTL Configuration
```typescript
CACHE_TTL = {
  CARD_DATA: 24 hours,     // Cards rarely change
  SETS_DATA: 1 week,       // Sets are immutable once released
  CARD_SEARCH: 2 hours,    // Search results
  POPULAR_CARDS: 6 hours,  // Trending data
  USER_DECKS: 30 minutes,  // User-specific data
}
```

### ✅ Cache Warming
Popular MTG cards are pre-cached on deployment:
- Lightning Bolt, Sol Ring, Counterspell, etc.
- Format staples (Modern, Standard, Commander)
- Trending cards

### ✅ Background Revalidation
Implements stale-while-revalidate pattern for optimal UX:
- Serve cached data immediately
- Refresh cache in background
- Always fast, always fresh

### ✅ Development vs Production
- **Development:** Memory cache fallback (no Redis required)
- **Production:** Vercel KV Redis with persistence

## 🔧 Setup Instructions

### 1. Environment Variables
Add to your `.env.local`:
```bash
# Vercel KV Redis (get from Vercel Dashboard -> Storage -> KV)
KV_URL=your_kv_url_here
KV_REST_API_URL=your_kv_rest_api_url_here
KV_REST_API_TOKEN=your_kv_rest_api_token_here
KV_REST_API_READ_ONLY_TOKEN=your_kv_rest_api_read_only_token_here
```

### 2. Install Dependencies
Already installed:
- `@vercel/kv` - Vercel KV Redis client
- `@tanstack/react-query` - Client-side caching
- `@tanstack/react-query-devtools` - Development tools

### 3. Cache Warming
Run cache warming scripts:
```bash
npm run cache:warm          # Basic popular cards
npm run cache:warm:full     # All categories
npm run cache:warm:formats  # Format staples
```

## 📖 Usage Examples

### Client-Side Hooks
```typescript
import { useCachedCard, useCachedCardSearch } from '@/hooks/use-cached-cards';

// Single card with aggressive caching
const { data: card, isLoading } = useCachedCard('Lightning Bolt');

// Search with smart TTL
const { data: results } = useCachedCardSearch('lightning', {
  format: 'modern',
  colors: ['R'],
});
```

### API Routes with Caching
```typescript
import { withCache, CACHE_CONFIGS } from '@/lib/cache/api-cache';

// Apply caching to any API route
export const GET = withCache(handler, CACHE_CONFIGS.CARD_DATA);
```

### Direct Cache Access
```typescript
import { cardCache } from '@/lib/cache/card-cache';

// Manual cache operations
await cardCache.setCard('Lightning Bolt', cardData);
const cached = await cardCache.getCard('Lightning Bolt');
```

## 📊 Monitoring & Debugging

### Cache Status API
```bash
GET /api/cache/status    # View cache statistics
DELETE /api/cache/status # Clear cache (dev only)
```

### React Query DevTools
Available in development mode - see cache hit/miss rates, query states, etc.

### Console Logging
Cache operations are logged with emojis for easy identification:
- 🔥 Cache warming
- ⚡ Cache hit
- 🔄 Cache miss/fetching
- ✅ Successful cache
- ❌ Cache error

## 🎯 Performance Optimizations

### 1. Query Key Factories
Consistent query keys prevent cache fragmentation:
```typescript
cardKeys = {
  card: (name) => ['cards', 'single', name],
  search: (query, options) => ['cards', 'search', query, options],
}
```

### 2. Batch Operations
Multiple cards fetched efficiently:
```typescript
const results = useCachedCards(['Lightning Bolt', 'Sol Ring', 'Counterspell']);
```

### 3. Prefetching
Cards prefetched on hover for instant loading:
```typescript
const prefetch = usePrefetchCard();
<CardLink onMouseEnter={() => prefetch('Lightning Bolt')} />
```

### 4. Background Refetch
Disabled aggressive refetching for card data:
- No refetch on window focus
- No refetch on component mount (if cached)
- No refetch on reconnect

## 🛠️ Cache Invalidation

### Automatic Invalidation
- TTL-based expiration
- Stale-while-revalidate pattern

### Manual Invalidation
```typescript
const { invalidateCard, invalidateAllCards } = useInvalidateCardCache();

// Invalidate specific card
invalidateCard('Lightning Bolt');

// Invalidate all cards (rare)
invalidateAllCards();
```

## 📈 Expected Performance Impact

### Before Caching
- Card API calls: ~500-2000ms (Scryfall latency)
- Search queries: ~1000-3000ms
- Popular cards: Fetched every time

### After Caching
- Cached cards: ~5-20ms (Redis lookup)
- Cached searches: ~10-50ms
- Popular cards: Instant (pre-warmed)

**Overall Speedup: 10-50x for cached content**

## 🚨 Production Considerations

### 1. Vercel KV Setup
- Create KV database in Vercel Dashboard
- Add environment variables to Vercel project
- Free tier: 3,000 requests/day, 256MB storage

### 2. Cache Warming Strategy
- Run cache warming on deployment
- Consider cron jobs for periodic warming
- Monitor cache hit rates

### 3. Monitoring
- Track cache hit/miss ratios
- Monitor Redis memory usage
- Set up alerts for cache failures

### 4. Graceful Degradation
All cache layers fail gracefully:
- Redis failure → Memory cache
- Memory cache failure → Direct API calls
- API failure → Stale cache (if available)

## 🎉 What's Complete

✅ **Vercel KV/Redis Setup** - Production-ready with dev fallback  
✅ **React Query Optimization** - Smart TTL and background refetch  
✅ **API Route Caching** - Middleware with stale-while-revalidate  
✅ **Cache Warming Scripts** - Popular cards pre-cached  
✅ **Performance Monitoring** - Cache status API and dev tools  

The caching layer is now fully implemented and ready for your MTG card site! 🚀 