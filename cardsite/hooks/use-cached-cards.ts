import { useQuery, useQueries, UseQueryOptions, useQueryClient } from '@tanstack/react-query';
import type { MTGCard } from '@/lib/types/mtg';

// Query key factories for consistent caching
export const cardKeys = {
  all: ['cards'] as const,
  card: (name: string) => [...cardKeys.all, 'single', name] as const,
  search: (query: string, options?: Record<string, any>) => 
    [...cardKeys.all, 'search', query, options] as const,
  popular: () => [...cardKeys.all, 'popular'] as const,
} as const;

/**
 * Fetch a single card by name with aggressive caching
 */
export function useCachedCard(
  cardName: string, 
  options?: UseQueryOptions<MTGCard, Error>
) {
  return useQuery({
    queryKey: cardKeys.card(cardName),
    queryFn: async () => {
      if (!cardName?.trim()) {
        throw new Error('Card name is required');
      }

      const response = await fetch(`/api/cards/${encodeURIComponent(cardName)}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`Card "${cardName}" not found`);
        }
        throw new Error(`Failed to fetch card: ${response.status}`);
      }

      const result = await response.json();
      return result.data;
    },
    enabled: !!cardName?.trim(),
    staleTime: 1000 * 60 * 60 * 24, // 24 hours - cards rarely change
    gcTime: 1000 * 60 * 60 * 48, // 48 hours - keep in memory longer
    retry: (failureCount, error) => {
      // Don't retry 404s
      if (error.message.includes('not found')) return false;
      return failureCount < 2;
    },
    ...options,
  });
}

/**
 * Fetch multiple cards with batch optimization
 */
export function useCachedCards(cardNames: string[]) {
  return useQueries({
    queries: cardNames.map((cardName) => ({
      queryKey: cardKeys.card(cardName),
      queryFn: async () => {
        const response = await fetch(`/api/cards/${encodeURIComponent(cardName)}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            return null; // Return null for not found cards
          }
          throw new Error(`Failed to fetch ${cardName}: ${response.status}`);
        }

        const result = await response.json();
        return result.data;
      },
      enabled: !!cardName?.trim(),
      staleTime: 1000 * 60 * 60 * 24, // 24 hours
      gcTime: 1000 * 60 * 60 * 48, // 48 hours
           retry: (failureCount: number, error: any) => {
       if (error.message.includes('not found')) return false;
       return failureCount < 2;
     },
    })),
  });
}

/**
 * Search cards with smart caching based on query complexity
 */
export function useCachedCardSearch(
  query: string,
  options: {
    format?: string;
    colors?: string[];
    type?: string;
    cmc?: number;
    page?: number;
  } = {},
  queryOptions?: UseQueryOptions<any, Error>
) {
  // Calculate stale time based on query specificity
  const getStaleTime = () => {
    // More specific queries can be cached longer
    let staleTime = 1000 * 60 * 15; // 15 minutes base
    
    if (options.format) staleTime *= 2; // Format-specific queries
    if (options.colors) staleTime *= 1.5; // Color-specific queries
    if (options.type) staleTime *= 1.5; // Type-specific queries
    if (options.cmc !== undefined) staleTime *= 2; // CMC-specific queries
    
    return Math.min(staleTime, 1000 * 60 * 60 * 2); // Max 2 hours
  };

  return useQuery({
    queryKey: cardKeys.search(query, options),
    queryFn: async () => {
      if (!query?.trim()) {
        return { results: [], total: 0, has_more: false };
      }

      const searchParams = new URLSearchParams({
        q: query,
        ...(options.format && { format: options.format }),
        ...(options.colors && { colors: options.colors.join(',') }),
        ...(options.type && { type: options.type }),
        ...(options.cmc !== undefined && { cmc: options.cmc.toString() }),
        ...(options.page && { page: options.page.toString() }),
      });

      const response = await fetch(`/api/cards/search?${searchParams}`);
      
      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }

      return response.json();
    },
    enabled: !!query?.trim(),
    staleTime: getStaleTime(),
    gcTime: 1000 * 60 * 60 * 2, // 2 hours
    retry: 2,
    ...queryOptions,
  });
}

/**
 * Get popular/trending cards
 */
export function useCachedPopularCards(options?: UseQueryOptions<MTGCard[], Error>) {
  return useQuery({
    queryKey: cardKeys.popular(),
    queryFn: async () => {
      const response = await fetch('/api/cards/popular');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch popular cards: ${response.status}`);
      }

      const result = await response.json();
      return result.data;
    },
    staleTime: 1000 * 60 * 60 * 6, // 6 hours - popular cards change slowly
    gcTime: 1000 * 60 * 60 * 12, // 12 hours
    retry: 2,
    ...options,
  });
}

/**
 * Prefetch a card for better UX (e.g., on hover)
 */
export function usePrefetchCard() {
  const queryClient = useQueryClient();

  return (cardName: string) => {
    if (!queryClient || !cardName?.trim()) return;

    queryClient.prefetchQuery({
      queryKey: cardKeys.card(cardName),
      queryFn: async () => {
        const response = await fetch(`/api/cards/${encodeURIComponent(cardName)}`);
        if (!response.ok) throw new Error(`Failed to fetch ${cardName}`);
        const result = await response.json();
        return result.data;
      },
      staleTime: 1000 * 60 * 60 * 24, // 24 hours
    });
  };
}

/**
 * Cache invalidation helpers
 */
export function useInvalidateCardCache() {
  const queryClient = useQueryClient();

  return {
    invalidateCard: (cardName: string) => {
      queryClient?.invalidateQueries({ queryKey: cardKeys.card(cardName) });
    },
    invalidateAllCards: () => {
      queryClient?.invalidateQueries({ queryKey: cardKeys.all });
    },
    invalidateSearch: (query: string, options?: Record<string, any>) => {
      queryClient?.invalidateQueries({ queryKey: cardKeys.search(query, options) });
    },
    invalidatePopular: () => {
      queryClient?.invalidateQueries({ queryKey: cardKeys.popular() });
    },
  };
} 