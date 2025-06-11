import { useQuery } from '@tanstack/react-query'
import { cacheConfig } from '@/lib/vercel-cache'

// Example hook for fetching cards with optimized caching
export function useCards(filters?: any) {
  return useQuery({
    queryKey: ['cards', filters],
    queryFn: async () => {
      const params = new URLSearchParams(filters)
      const response = await fetch(`/api/cards?${params}`)
      if (!response.ok) throw new Error('Failed to fetch cards')
      return response.json()
    },
    ...cacheConfig.cards, // Uses 30min stale time, 2hr cache time
  })
}

// Example hook for user's decks
export function useUserDecks(userId: string) {
  return useQuery({
    queryKey: ['user-decks', userId],
    queryFn: async () => {
      const response = await fetch(`/api/users/${userId}/decks`)
      if (!response.ok) throw new Error('Failed to fetch user decks')
      return response.json()
    },
    ...cacheConfig.userDecks, // Uses 5min stale time, 15min cache time
    enabled: !!userId, // Only run if userId exists
  })
}

// Example hook for card search with caching
export function useCardSearch(query: string, filters?: any) {
  return useQuery({
    queryKey: ['card-search', query, filters],
    queryFn: async () => {
      const params = new URLSearchParams({ 
        q: query, 
        ...filters 
      })
      const response = await fetch(`/api/cards/search?${params}`)
      if (!response.ok) throw new Error('Search failed')
      return response.json()
    },
    ...cacheConfig.search, // Uses 10min stale time, 30min cache time
    enabled: query.length > 2, // Only search if query is meaningful
  })
}

// Example hook for trending/popular cards
export function useTrendingCards() {
  return useQuery({
    queryKey: ['trending-cards'],
    queryFn: async () => {
      const response = await fetch('/api/cards/trending')
      if (!response.ok) throw new Error('Failed to fetch trending cards')
      return response.json()
    },
    ...cacheConfig.trending, // Uses 2min stale time, 10min cache time
  })
} 