import { cache, CACHE_TTL, CACHE_KEYS, cacheOrFetch, POPULAR_CARDS } from './redis';
import type { MTGCard, MTGSet } from '@/lib/types/mtg';

/**
 * Card-specific cache utilities with optimized TTL and key management
 */
export class CardCache {
  /**
   * Get a single card by exact name
   */
  async getCard(cardName: string): Promise<MTGCard | null> {
    const key = `${CACHE_KEYS.CARD}${cardName.toLowerCase()}`;
    return await cache.get<MTGCard>(key);
  }

  /**
   * Set a single card in cache
   */
  async setCard(cardName: string, cardData: MTGCard): Promise<void> {
    const key = `${CACHE_KEYS.CARD}${cardName.toLowerCase()}`;
    await cache.set(key, cardData, CACHE_TTL.CARD_DATA);
  }

  /**
   * Get multiple cards by name (batch operation)
   */
  async getCards(cardNames: string[]): Promise<(MTGCard | null)[]> {
    const keys = cardNames.map(name => `${CACHE_KEYS.CARD}${name.toLowerCase()}`);
    return await cache.mget<MTGCard>(...keys);
  }

  /**
   * Set multiple cards in cache (batch operation)
   */
  async setCards(cards: Array<{ name: string; data: MTGCard }>): Promise<void> {
    const pairs = cards.map(({ name, data }) => ({
      key: `${CACHE_KEYS.CARD}${name.toLowerCase()}`,
      value: data,
      ttl: CACHE_TTL.CARD_DATA,
    }));
    await cache.mset(pairs);
  }

  /**
   * Cache card search results
   */
  async cacheSearchResults(
    query: string,
    results: MTGCard[],
    options: {
      format?: string;
      colors?: string[];
      type?: string;
      cmc?: number;
    } = {}
  ): Promise<void> {
    const searchKey = this.generateSearchKey(query, options);
    await cache.set(searchKey, results, CACHE_TTL.CARD_SEARCH);
  }

  /**
   * Get cached search results
   */
  async getSearchResults(
    query: string,
    options: {
      format?: string;
      colors?: string[];
      type?: string;
      cmc?: number;
    } = {}
  ): Promise<MTGCard[] | null> {
    const searchKey = this.generateSearchKey(query, options);
    return await cache.get<MTGCard[]>(searchKey);
  }

  /**
   * Cache popular cards
   */
  async cachePopularCards(cards: MTGCard[]): Promise<void> {
    await cache.set(CACHE_KEYS.POPULAR_CARDS, cards, CACHE_TTL.POPULAR_CARDS);
  }

  /**
   * Get popular cards
   */
  async getPopularCards(): Promise<MTGCard[] | null> {
    return await cache.get<MTGCard[]>(CACHE_KEYS.POPULAR_CARDS);
  }

  /**
   * Warm cache with popular cards
   */
  async warmPopularCards(fetchFn: (cardName: string) => Promise<MTGCard | null>): Promise<void> {
    console.log('🔥 Warming cache with popular cards...');
    
    const warmingPromises = POPULAR_CARDS.map(async (cardName) => {
      try {
        const key = `${CACHE_KEYS.CARD}${cardName.toLowerCase()}`;
        const cached = await cache.get<MTGCard>(key);
        
        if (!cached) {
          console.log(`🔄 Fetching ${cardName}...`);
          const cardData = await fetchFn(cardName);
          if (cardData) {
            await this.setCard(cardName, cardData);
            console.log(`✅ Cached ${cardName}`);
          }
        } else {
          console.log(`⚡ ${cardName} already cached`);
        }
      } catch (error) {
        console.error(`❌ Failed to warm cache for ${cardName}:`, error);
      }
    });

    await Promise.allSettled(warmingPromises);
    console.log('🔥 Cache warming completed!');
  }

  /**
   * Cache deck data
   */
  async cacheDeck(deckId: string, deckData: any): Promise<void> {
    const key = `${CACHE_KEYS.DECK}${deckId}`;
    await cache.set(key, deckData, CACHE_TTL.DECK_DATA);
  }

  /**
   * Get cached deck
   */
  async getDeck(deckId: string): Promise<any | null> {
    const key = `${CACHE_KEYS.DECK}${deckId}`;
    return await cache.get(key);
  }

  /**
   * Cache user's decks
   */
  async cacheUserDecks(userId: string, decks: any[]): Promise<void> {
    const key = `${CACHE_KEYS.USER_DECKS}${userId}`;
    await cache.set(key, decks, CACHE_TTL.USER_DECKS);
  }

  /**
   * Get user's cached decks
   */
  async getUserDecks(userId: string): Promise<any[] | null> {
    const key = `${CACHE_KEYS.USER_DECKS}${userId}`;
    return await cache.get(key);
  }

  /**
   * Cache popular decks
   */
  async cachePopularDecks(decks: any[]): Promise<void> {
    await cache.set(CACHE_KEYS.POPULAR_DECKS, decks, CACHE_TTL.POPULAR_DECKS);
  }

  /**
   * Get popular decks
   */
  async getPopularDecks(): Promise<any[] | null> {
    return await cache.get(CACHE_KEYS.POPULAR_DECKS);
  }

  /**
   * Invalidate cache for a specific card
   */
  async invalidateCard(cardName: string): Promise<void> {
    const key = `${CACHE_KEYS.CARD}${cardName.toLowerCase()}`;
    await cache.delete(key);
  }

  /**
   * Invalidate all search results (useful when card data changes)
   */
  async invalidateSearchResults(): Promise<void> {
    // Note: This is a simplified approach. In production, you'd want to track search keys
    console.log('⚠️  Search result invalidation not fully implemented');
  }

  /**
   * Generate consistent search key for caching
   */
  private generateSearchKey(
    query: string,
    options: {
      format?: string;
      colors?: string[];
      type?: string;
      cmc?: number;
    }
  ): string {
    const optionsStr = JSON.stringify(options);
    const hash = Buffer.from(query + optionsStr).toString('base64');
    return `${CACHE_KEYS.CARD_SEARCH}${hash}`;
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    totalCards: number;
    popularCards: number;
    searchResults: number;
  }> {
    const stats = cache.getStats();
    
    if ('keys' in stats) {
      const keys = stats.keys as string[];
      return {
        totalCards: keys.filter(key => key.startsWith(CACHE_KEYS.CARD)).length,
        popularCards: keys.filter(key => key === CACHE_KEYS.POPULAR_CARDS).length,
        searchResults: keys.filter(key => key.startsWith(CACHE_KEYS.CARD_SEARCH)).length,
      };
    }
    
    return { totalCards: 0, popularCards: 0, searchResults: 0 };
  }
}

// Singleton instance
export const cardCache = new CardCache();

/**
 * High-level cache-or-fetch helpers for common operations
 */
export async function getCachedCard(
  cardName: string,
  fetchFn: () => Promise<MTGCard | null>
): Promise<MTGCard | null> {
  const key = `${CACHE_KEYS.CARD}${cardName.toLowerCase()}`;
  return await cacheOrFetch(key, fetchFn, CACHE_TTL.CARD_DATA);
}

export async function getCachedSearchResults(
  query: string,
  fetchFn: () => Promise<MTGCard[]>,
  options: {
    format?: string;
    colors?: string[];
    type?: string;
    cmc?: number;
  } = {}
): Promise<MTGCard[]> {
  const searchKey = `${CACHE_KEYS.CARD_SEARCH}${Buffer.from(query + JSON.stringify(options)).toString('base64')}`;
  return await cacheOrFetch(searchKey, fetchFn, CACHE_TTL.CARD_SEARCH);
}

export async function getCachedPopularCards(
  fetchFn: () => Promise<MTGCard[]>
): Promise<MTGCard[]> {
  return await cacheOrFetch(CACHE_KEYS.POPULAR_CARDS, fetchFn, CACHE_TTL.POPULAR_CARDS);
} 