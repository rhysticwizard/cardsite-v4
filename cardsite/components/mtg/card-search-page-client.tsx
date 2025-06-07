'use client';

import React, { useState, useMemo, useEffect, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { searchCards, getAllSets } from '@/lib/api/scryfall';
import type { MTGSet, MTGCard } from '@/lib/types/mtg';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Calendar, Filter, ArrowUpDown, X, Settings } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { formatReleaseDate, isUpcoming, getDaysLeft, getRarityColor } from '@/lib/utils/date-helpers';

interface CardSearchPageClientProps {
  initialSets: MTGSet[];
}

// Separate component for card results to improve performance
const CardResults = React.memo(({ searchQuery }: { searchQuery: string }) => {
  const { data: cardResults, isLoading: cardsLoading, error: cardsError } = useQuery({
    queryKey: ['card-search', searchQuery],
    queryFn: () => searchCards({ q: searchQuery }),
    enabled: searchQuery.trim().length > 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  if (cardsLoading) {
    return (
      <div className="text-center">
        <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-gray-400">Searching cards...</p>
      </div>
    );
  }

  if (cardsError) {
    return (
      <div className="text-center">
        <p className="text-red-400">Error searching cards</p>
      </div>
    );
  }

  if (!cardResults || cardResults.data.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400 text-lg">No cards found matching "{searchQuery}".</p>
        <p className="text-gray-500 text-sm mt-2">
          Try searching for card names, types, or use Scryfall syntax like "t:creature" or "c:red"
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Card Search Results</h2>
        <p className="text-gray-400">
          Found {cardResults.total_cards} card{cardResults.total_cards !== 1 ? 's' : ''}
        </p>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {cardResults.data.map((card: MTGCard) => {
          const imageUrl = card.image_uris?.normal || 
                          (card as any).card_faces?.[0]?.image_uris?.normal;
          
          return (
            <Link key={card.id} href={`/card/${card.id}`}>
              <Card className="bg-black border-black cursor-pointer overflow-hidden hover:border-gray-600 transition-colors group">
                <CardContent className="p-0">
                  {imageUrl ? (
                    <Image
                      src={imageUrl}
                      alt={card.name}
                      width={312}
                      height={445}
                      className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-200"
                      priority={false}
                      placeholder="blur"
                      blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyEQZrWjRZeKkt7i4t5JIYU3Yq7KurY4VRYaNh7D0TnXDuTc7YRRGgCooJDZ3Kq0Qdq1TJe0zFZRBbXW0R8bRQeZMJbkdZKuN3Y8aakMdSdZZnaDjJ6aFPTgNvAwzIXE6dGKGwzFhXnMhF2CtNKqnqdGhztBmMOZdPQIIxnZvnJKnWg4Iw/6KzJXNPNPKfOYtAj4zNXhvhyaD5NJHQ/qHRUF4Rg6KxX8PF2Pd/TTgRQ7/8A8WN1Py8OHjvuGKohtSWQ7wOvHfhTdVVVSVTClKZqRCT0g+t+W9vy8t7YUlGJI5n7V0hRSnXPlO3lUGzAYsXD7LjHfMNGhGYVFo+6H4Z3WH4wLy3+/cEHLMpSuLKUfONW3LHW3WmKKgqUPl9Z6jYRQEa0VTyT7OKnLu9HDjIgU0ZKvq3KqzLbbbgVZ0OKY1IfHWNJO9qsCtYlCRaZKjZOKhTJZP5ZMRuKpfhpbYpQvTLYzZ5ZKuNPP/Z"
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
                
                {/* Card info overlay on hover */}
                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-80 p-2 transform translate-y-full group-hover:translate-y-0 transition-transform duration-200">
                  <h3 className="text-white text-xs font-medium truncate">{card.name}</h3>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">{card.set_name}</span>
                    <span className={`capitalize ${getRarityColor(card.rarity)}`}>
                      {card.rarity}
                    </span>
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
});

CardResults.displayName = 'CardResults';

// Helper function moved to centralized utils

export function CardSearchPageClient({ initialSets }: CardSearchPageClientProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'name'>('date');
  const [filterBy, setFilterBy] = useState<'all' | 'upcoming' | 'released'>('all');
  const [searchMode, setSearchMode] = useState<'sets' | 'cards'>('sets');
  
  // Debounced search query for card searches
  const [debouncedCardQuery, setDebouncedCardQuery] = useState('');

  // USE REACT QUERY FOR CACHING - This is the key fix!
  const { data: allSets = initialSets, isLoading: setsLoading } = useQuery({
    queryKey: ['mtg-sets'],
    queryFn: getAllSets,
    initialData: initialSets,
    staleTime: 1000 * 60 * 30, // 30 minutes - same as your other pages
    gcTime: 1000 * 60 * 60, // 1 hour garbage collection
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedCardQuery(searchQuery);
      // Switch to card search mode when user types a query
      if (searchQuery.trim().length > 0) {
        setSearchMode('cards');
      } else {
        setSearchMode('sets');
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Group sets by year chronologically - using cached data
  const setsByYear = useMemo(() => {
    if (!allSets) return {};

    let filtered = allSets.filter((set) => {
      // Filter by search query (only when in sets mode)
      if (searchMode === 'sets' && searchQuery) {
        const query = searchQuery.toLowerCase();
        return set.name.toLowerCase().includes(query) || 
               set.code.toLowerCase().includes(query);
      }
      return true;
    });

    // Filter by status
    if (filterBy !== 'all') {
      const now = new Date();
      filtered = filtered.filter((set) => {
        if (!set.released_at) return filterBy === 'upcoming';
        const releaseDate = new Date(set.released_at);
        const isUpcoming = releaseDate > now;
        return filterBy === 'upcoming' ? isUpcoming : !isUpcoming;
      });
    }

    // Group by year
    const grouped: Record<string, MTGSet[]> = {};
    
    filtered.forEach((set) => {
      const year = set.released_at ? new Date(set.released_at).getFullYear().toString() : 'TBA';
      if (!grouped[year]) {
        grouped[year] = [];
      }
      grouped[year].push(set);
    });

    // Sort sets within each year
    Object.keys(grouped).forEach((year) => {
      grouped[year].sort((a, b) => {
        if (sortBy === 'name') {
          return a.name.localeCompare(b.name);
        } else {
          // Sort by date (newest first within year)
          const dateA = a.released_at ? new Date(a.released_at) : new Date('2099-01-01');
          const dateB = b.released_at ? new Date(b.released_at) : new Date('2099-01-01');
          return dateB.getTime() - dateA.getTime();
        }
      });
    });

    return grouped;
  }, [allSets, searchQuery, sortBy, filterBy, searchMode]);

  // Get sorted years (newest first)
  const sortedYears = useMemo(() => {
    const years = Object.keys(setsByYear).filter(year => year !== 'TBA');
    years.sort((a, b) => parseInt(b) - parseInt(a));
    
    // Add TBA at the beginning if it exists
    if (setsByYear['TBA']) {
      years.unshift('TBA');
    }
    
    return years;
  }, [setsByYear]);

  const formatReleaseDate = (dateString?: string) => {
    if (!dateString) return 'TBA';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const isUpcoming = (dateString?: string) => {
    if (!dateString) return true;
    return new Date(dateString) > new Date();
  };

  const getDaysLeft = (dateString?: string) => {
    if (!dateString) return null;
    const releaseDate = new Date(dateString);
    const now = new Date();
    const diffTime = releaseDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : null;
  };

  return (
    <div className="text-white min-h-screen">
      {/* Centered Container Layout */}
      <div className="max-w-6xl mx-auto px-8 py-8">
        
        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for a Magic card or set"
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
            <button className="absolute right-12 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white">
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search Mode Indicator */}
        {searchQuery && (
          <div className="text-center mb-6">
            <span className="text-gray-400 text-sm">
              Showing {searchMode === 'cards' ? 'cards' : 'sets'} for "{searchQuery}"
            </span>
          </div>
        )}

        {/* Controls - only show for sets mode */}
        {searchMode === 'sets' && (
          <div className="flex items-center justify-end mb-8 space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {/* Calendar view toggle */}}
              className="bg-gray-800 border-gray-600 text-gray-300 hover:text-white"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Calendar
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilterBy(filterBy === 'all' ? 'upcoming' : filterBy === 'upcoming' ? 'released' : 'all')}
              className="bg-gray-800 border-gray-600 text-gray-300 hover:text-white"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filter {filterBy !== 'all' && `(${filterBy})`}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortBy(sortBy === 'date' ? 'name' : 'date')}
              className="bg-gray-800 border-gray-600 text-gray-300 hover:text-white"
            >
              <ArrowUpDown className="w-4 h-4 mr-2" />
              Sort {sortBy === 'date' ? 'Date' : 'Name'}
            </Button>
          </div>
        )}

        {/* Card Search Results */}
        {searchMode === 'cards' && debouncedCardQuery && (
          <Suspense fallback={
            <div className="text-center">
              <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-400">Loading cards...</p>
            </div>
          }>
            <CardResults searchQuery={debouncedCardQuery} />
          </Suspense>
        )}

        {/* Set Results - show when not searching cards */}
        {searchMode === 'sets' && (
          <div className="space-y-12">
            {sortedYears.map((year) => (
              <div key={year} className="space-y-6">
                {/* Year Header */}
                <h2 className="text-3xl font-bold text-white">
                  {year}
                </h2>
                
                {/* Sets Grid for this year */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {setsByYear[year]?.map((set) => {
                    const upcoming = isUpcoming(set.released_at);
                    const daysLeft = getDaysLeft(set.released_at);
                    
                    return (
                      <Link 
                        key={set.id} 
                        href={`/cards/${set.code.toLowerCase()}`}
                      >
                        <Card className="bg-black border-black cursor-pointer hover:border-gray-600 transition-colors">
                          <CardContent className="p-8 text-center space-y-4">
                            {/* Upcoming Badge */}
                            {upcoming && (
                              <div className="inline-block">
                                <span className="bg-gray-700 text-gray-300 text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wide">
                                  Upcoming
                                </span>
                              </div>
                            )}
                            
                            {/* Set Icon */}
                            <div className="flex justify-center">
                              <div className="w-20 h-20 bg-black rounded-full flex items-center justify-center">
                                {set.icon_svg_uri ? (
                                  <img 
                                    src={set.icon_svg_uri} 
                                    alt={set.name}
                                    className="w-16 h-16 invert"
                                  />
                                ) : (
                                  <div className="w-16 h-16 bg-gray-600 rounded-lg flex items-center justify-center">
                                    <span className="text-white font-bold text-xl">
                                      {set.code.substring(0, 2).toUpperCase()}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {/* Set Name */}
                            <h3 className="text-white font-semibold text-lg">
                              {set.name}
                            </h3>
                            
                            {/* Release Date */}
                            <p className="text-gray-400 text-sm">
                              Releases: {formatReleaseDate(set.released_at)}
                            </p>
                            
                            {/* Days Left (for upcoming sets) */}
                            {daysLeft && daysLeft > 0 && (
                              <p className="text-blue-400 text-xs font-medium">
                                ({daysLeft} days left)
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* No Results for Sets */}
        {searchMode === 'sets' && sortedYears.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">
              No sets found matching your criteria.
            </p>
          </div>
        )}
      </div>
    </div>
  );
} 