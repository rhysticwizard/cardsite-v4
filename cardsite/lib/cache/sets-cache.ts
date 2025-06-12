import { getAllSets } from '@/lib/api/scryfall';
import { cache, CACHE_TTL, CACHE_KEYS, cacheOrFetch } from './redis';
import type { MTGSet } from '@/lib/types/mtg';

/**
 * Get all MTG sets with Redis caching (fallback to memory in dev)
 * This dramatically reduces API calls and improves performance
 */
export async function getCachedSets(): Promise<MTGSet[]> {
  return await cacheOrFetch(
    CACHE_KEYS.SETS,
    async () => {
      console.log('🔄 Fetching fresh MTG sets data...');
      const sets = await getAllSets();
      console.log(`✅ Cached ${sets.length} MTG sets`);
      return sets;
    },
    CACHE_TTL.SETS_DATA
  );
}

/**
 * Clear the sets cache (useful for development)
 */
export async function clearSetsCache(): Promise<void> {
  await cache.delete(CACHE_KEYS.SETS);
  console.log('🗑️  Sets cache cleared');
}

/**
 * Preload sets data into cache (for cache warming)
 */
export async function warmSetsCache(): Promise<void> {
  console.log('🔥 Warming sets cache...');
  await getCachedSets();
  console.log('🔥 Sets cache warmed!');
} 