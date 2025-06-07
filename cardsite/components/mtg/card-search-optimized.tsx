'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { searchCards } from '@/lib/api/scryfall';
import type { MTGSet, MTGCard } from '@/lib/types/mtg';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Search, X } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

interface CardSearchOptimizedProps {
  initialSets: MTGSet[];
}

// Memoized card component for better performance
const CardItem = React.memo(({ card }: { card: MTGCard }) => {
  const imageUrl = card.image_uris?.normal || 
                  (card as any).card_faces?.[0]?.image_uris?.normal;
  
  return (
    <Link key={card.id} href={`/card/${card.id}`} className="block">
      <Card className="bg-black border-black cursor-pointer overflow-hidden hover:border-gray-600 transition-colors group">
        <CardContent className="p-0">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={card.name}
              width={312}
              height={445}
              className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-200"
              loading="lazy"
              sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 16vw"
            />
          ) : (
            <div className="aspect-[5/7] bg-gray-800 flex items-center justify-center">
              <span className="text-gray-400 text-xs text-center p-2">
                {card.name}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
});

CardItem.displayName = 'CardItem';

// Memoized set component
const SetItem = React.memo(({ set }: { set: MTGSet }) => {
  const upcoming = set.released_at ? new Date(set.released_at) > new Date() : true;
  
  return (
    <Link href={`/cards/${set.code.toLowerCase()}`} className="block">
      <Card className="bg-black border-black cursor-pointer hover:border-gray-600 transition-colors">
        <CardContent className="p-6 text-center space-y-3">
          {upcoming && (
            <span className="bg-gray-700 text-gray-300 text-xs font-semibold px-2 py-1 rounded-full uppercase">
              Upcoming
            </span>
          )}
          
          <div className="w-16 h-16 bg-gray-600 rounded-lg flex items-center justify-center mx-auto">
            {set.icon_svg_uri ? (
              <img 
                src={set.icon_svg_uri} 
                alt={set.name}
                className="w-12 h-12 invert"
                loading="lazy"
              />
            ) : (
              <span className="text-white font-bold text-lg">
                {set.code.substring(0, 2).toUpperCase()}
              </span>
            )}
          </div>
          
          <h3 className="text-white font-semibold text-sm">{set.name}</h3>
          <p className="text-gray-400 text-xs">
            {set.released_at ? new Date(set.released_at).toLocaleDateString() : 'TBA'}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
});

SetItem.displayName = 'SetItem';

export function CardSearchOptimized({ initialSets }: CardSearchOptimizedProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<'sets' | 'cards'>('sets');

  // Debounced search with useCallback for performance
  const debouncedSearch = useCallback((query: string) => {
    const timer = setTimeout(() => {
      if (query.trim().length > 0) {
        setSearchMode('cards');
      } else {
        setSearchMode('sets');
      }
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  React.useEffect(() => {
    const cleanup = debouncedSearch(searchQuery);
    return cleanup;
  }, [searchQuery, debouncedSearch]);

  // Card search query (only when needed)
  const { data: cardResults, isLoading: cardsLoading } = useQuery({
    queryKey: ['card-search', searchQuery],
    queryFn: () => searchCards({ q: searchQuery }),
    enabled: searchMode === 'cards' && searchQuery.trim().length > 0,
    staleTime: 1000 * 60 * 5,
  });

  // Filter sets efficiently
  const filteredSets = useMemo(() => {
    if (searchMode !== 'sets' || !searchQuery) return initialSets;
    
    const query = searchQuery.toLowerCase();
    return initialSets.filter(set => 
      set.name.toLowerCase().includes(query) || 
      set.code.toLowerCase().includes(query)
    );
  }, [initialSets, searchQuery, searchMode]);

  // Group sets by year efficiently
  const setsByYear = useMemo(() => {
    const grouped: Record<string, MTGSet[]> = {};
    
    filteredSets.forEach(set => {
      const year = set.released_at ? new Date(set.released_at).getFullYear().toString() : 'TBA';
      if (!grouped[year]) grouped[year] = [];
      grouped[year].push(set);
    });

    // Sort years
    const sortedYears = Object.keys(grouped).filter(year => year !== 'TBA').sort((a, b) => parseInt(b) - parseInt(a));
    if (grouped['TBA']) sortedYears.unshift('TBA');

    return { grouped, sortedYears };
  }, [filteredSets]);

  return (
    <div className="text-white min-h-screen">
      <div className="max-w-6xl mx-auto px-8 py-8">
        
        {/* Simplified Search Bar */}
        <div className="mb-8">
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search cards or sets..."
              className="bg-gray-800 border-gray-600 text-white pl-12 pr-12 py-3 rounded-full"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Card Results */}
        {searchMode === 'cards' && (
          <div>
            {cardsLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-400">Searching cards...</p>
              </div>
            ) : cardResults?.data.length ? (
              <>
                <h2 className="text-2xl font-bold mb-4">
                  Found {cardResults.total_cards} cards
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {cardResults.data.map(card => (
                    <CardItem key={card.id} card={card} />
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-400">No cards found for "{searchQuery}"</p>
              </div>
            )}
          </div>
        )}

        {/* Set Results */}
        {searchMode === 'sets' && (
          <div className="space-y-8">
            {setsByYear.sortedYears.map(year => (
              <div key={year}>
                <h2 className="text-2xl font-bold mb-4">{year}</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {setsByYear.grouped[year]?.map(set => (
                    <SetItem key={set.id} set={set} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 