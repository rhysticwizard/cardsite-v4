'use client';

import React, { useState, useMemo, useEffect, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { searchCards, getAllSets } from '@/lib/api/scryfall';
import type { MTGSet, MTGCard } from '@/lib/types/mtg';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Calendar, Filter, ArrowUpDown, X, Settings, Sliders, Shuffle, ChevronDown } from 'lucide-react';
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
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'a-z' | 'z-a'>('newest');
  const [filterBy, setFilterBy] = useState<'all' | 'upcoming' | 'released'>('all');
  const [searchMode, setSearchMode] = useState<'sets' | 'cards'>('sets');
  
  // Debounced search query for card searches
  const [debouncedCardQuery, setDebouncedCardQuery] = useState('');

  // Sort dropdown state
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  // Simple single API call to load all sets
  const { 
    data: allSets = [], 
    isLoading: isBackgroundLoading,
    isSuccess
  } = useQuery({
    queryKey: ['mtg-sets-all'],
    queryFn: async () => {
      console.log('🔄 Loading all Magic sets...');
      const allSetsData = await getAllSets();
      console.log(`✅ Loaded ${allSetsData.length} total sets`);
      return allSetsData;
    },
    staleTime: 1000 * 60 * 30, // 30 minutes - data stays fresh
    gcTime: 1000 * 60 * 60 * 24, // 24 hours - keep in cache longer
    refetchOnWindowFocus: false, // Don't refetch on window focus
    enabled: true, // Always enabled
  });


  
  // No suggestions needed for Enter-only search
  




  // Card search only triggers on Enter key press
  const [pendingCardSearch, setPendingCardSearch] = useState('');

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setShowSortDropdown(false);
    if (showSortDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showSortDropdown]);

  // Handle Enter key press for search
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (searchQuery.trim().length > 0) {
        // Trigger search (both sets and cards)
        setDebouncedCardQuery(searchQuery);
        setSearchMode('cards');
      } else {
        // Empty search - show all sets
        setDebouncedCardQuery('');
        setSearchMode('sets');
      }
    }
  };

  // Only process sets when actually needed - not during typing
  const getFilteredAndSortedSets = () => {
    if (searchMode === 'cards') return [];
    
    let sets = allSets;
    
    // Apply search filter only if there's a search query
    if (debouncedCardQuery) {
      const query = debouncedCardQuery.toLowerCase();
      sets = sets.filter(set => 
      set.name.toLowerCase().includes(query) ||
      set.code.toLowerCase().includes(query) ||
      (set.block && set.block.toLowerCase().includes(query))
    );
    }
    
         // Apply filter
     if (filterBy !== 'all') {
       const now = new Date();
       sets = sets.filter(set => {
         if (!set.released_at) return filterBy === 'upcoming';
         const releaseDate = new Date(set.released_at);
         if (filterBy === 'upcoming') {
           return releaseDate > now;
         } else {
           return releaseDate <= now;
         }
       });
     }
     
     // Apply sort
     return sets.sort((a, b) => {
      if (sortBy === 'a-z') {
         return a.name.localeCompare(b.name);
      } else if (sortBy === 'z-a') {
        return b.name.localeCompare(a.name);
      } else if (sortBy === 'oldest') {
        if (!a.released_at || !b.released_at) {
          if (!a.released_at && !b.released_at) return 0;
          return !a.released_at ? 1 : -1;
        }
        return new Date(a.released_at).getTime() - new Date(b.released_at).getTime();
      } else { // newest
         if (!a.released_at || !b.released_at) {
           if (!a.released_at && !b.released_at) return 0;
           return !a.released_at ? 1 : -1;
         }
         return new Date(b.released_at).getTime() - new Date(a.released_at).getTime();
       }
     });
  };

  // Only calculate when actually displaying sets (not during typing)
  const filteredAndSortedSets = useMemo(() => {
    if (searchMode === 'cards') return [];
    return getFilteredAndSortedSets();
  }, [searchMode, debouncedCardQuery, filterBy, sortBy, allSets]);

  // Group sets by year for display - memoized
   const groupedSets = useMemo(() => {
    if (searchMode === 'cards') return {};
    
     const groups: { [year: string]: MTGSet[] } = {};
     filteredAndSortedSets.forEach(set => {
       const year = set.released_at ? new Date(set.released_at).getFullYear().toString() : 'TBA';
       if (!groups[year]) {
         groups[year] = [];
       }
       groups[year].push(set);
     });
     return groups;
  }, [filteredAndSortedSets, searchMode]);

  const sortedYears = useMemo(() => {
    if (searchMode === 'cards') return [];
    return Object.keys(groupedSets).sort((a, b) => {
      if (sortBy === 'a-z') return a.localeCompare(b);
      if (sortBy === 'z-a') return b.localeCompare(a);
      if (sortBy === 'oldest') return parseInt(a) - parseInt(b);
      return parseInt(b) - parseInt(a); // newest
    });
  }, [groupedSets, sortBy, searchMode]);

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
    /* Centered Container Layout */
    <div className="max-w-6xl mx-auto px-8 pb-8 text-white">
        
        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative max-w-xl mx-auto">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for a Magic card or set"
              className="bg-black border-gray-600 text-white pl-4 pr-12 py-3 rounded-md"
              onKeyDown={handleKeyDown}
            />
            <button className="absolute right-20 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white">
              <Shuffle className="w-4 h-4" />
            </button>
            <button className="absolute right-12 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white">
              <Sliders className="w-4 h-4" />
            </button>
            <button 
              onClick={searchQuery ? () => {
                setSearchQuery('');
                setDebouncedCardQuery('');
                setSearchMode('sets');
              } : undefined}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
            >
              {searchQuery ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
            </button>
            
          </div>
        </div>



        {/* Search Results Indicator */}
        {debouncedCardQuery && (
          <div className="text-center mb-6">
            <span className="text-gray-400 text-sm">
              {searchMode === 'sets' ? (
                `Found ${filteredAndSortedSets.length} set${filteredAndSortedSets.length !== 1 ? 's' : ''} for "${debouncedCardQuery}"`
              ) : (
                `Showing cards for "${debouncedCardQuery}"`
              )}
            </span>
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

        {/* Loading State - show when still loading and no data yet */}
        {searchMode === 'sets' && isBackgroundLoading && sortedYears.length === 0 && (
          <div className="text-center py-20">
            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-400 text-lg mb-2">Loading Magic sets...</p>
            <p className="text-gray-500 text-sm">This may take a moment on first visit</p>
          </div>
        )}

        {/* Set Results - show when not searching cards */}
        {searchMode === 'sets' && (
          <div className="space-y-12">
            {/* Controls at top */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-3xl font-bold text-white">
                {sortBy === 'a-z' ? 'A to Z' : 
                 sortBy === 'z-a' ? 'Z to A' : 
                 sortedYears[0]}
              </h2>
              <div className="flex items-center space-x-4">
                <Link href="/calendar">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-300 hover:text-white border border-transparent hover:border-gray-600 hover:bg-transparent transition-colors"
                  >
                    Calendar
                    <Calendar className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFilterBy(filterBy === 'all' ? 'upcoming' : filterBy === 'upcoming' ? 'released' : 'all')}
                  className="text-gray-300 hover:text-white border border-transparent hover:border-gray-600 hover:bg-transparent transition-colors"
                >
                  Filter {filterBy !== 'all' && `(${filterBy})`}
                  <Filter className="w-4 h-4 ml-1" />
                </Button>
                
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSortDropdown(!showSortDropdown)}
                    className="text-gray-300 hover:text-white border border-transparent hover:border-gray-600 hover:bg-transparent transition-colors"
                  >
                    Sort
                    <ChevronDown className="w-4 h-4 ml-1" />
                  </Button>
                  
                  {showSortDropdown && (
                    <div className="absolute top-full right-0 mt-2 bg-black border border-gray-600 rounded-lg shadow-xl z-50 min-w-32">
                                             <button
                         onClick={() => {
                           setSortBy('newest');
                           setShowSortDropdown(false);
                         }}
                         className={`w-full text-left px-3 py-2 text-white hover:bg-gray-700 transition-colors rounded-t-lg ${
                           sortBy === 'newest' ? 'bg-gray-700' : ''
                         }`}
                       >
                         New to Old
                       </button>
                       <button
                         onClick={() => {
                           setSortBy('oldest');
                           setShowSortDropdown(false);
                         }}
                         className={`w-full text-left px-3 py-2 text-white hover:bg-gray-700 transition-colors ${
                           sortBy === 'oldest' ? 'bg-gray-700' : ''
                         }`}
                       >
                         Old to New
                       </button>
                      <button
                        onClick={() => {
                          setSortBy('a-z');
                          setShowSortDropdown(false);
                        }}
                                                 className={`w-full text-left px-3 py-2 text-white hover:bg-gray-700 transition-colors ${
                           sortBy === 'a-z' ? 'bg-gray-700' : ''
                         }`}
                      >
                        A to Z
                      </button>
                      <button
                        onClick={() => {
                          setSortBy('z-a');
                          setShowSortDropdown(false);
                        }}
                                                 className={`w-full text-left px-3 py-2 text-white hover:bg-gray-700 transition-colors rounded-b-lg ${
                          sortBy === 'z-a' ? 'bg-gray-700' : ''
                        }`}
                      >
                        Z to A
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <hr className="border-gray-600 mb-6" />

            {/* Alphabetical Layout */}
            {(sortBy === 'a-z' || sortBy === 'z-a') && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {filteredAndSortedSets.map((set) => {
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
                              <span className="bg-white text-black text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wide">
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
                            <p className="text-white text-xs font-medium">
                              ({daysLeft} days left)
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            )}

            {/* Chronological Layout by Year */}
            {(sortBy === 'newest' || sortBy === 'oldest') && sortedYears.map((year, yearIndex) => (
              <div key={year} className="space-y-6">
                {/* Year Header (only show for subsequent years) */}
                {yearIndex > 0 && (
                  <div>
                    <h2 className="text-3xl font-bold text-white mb-4">
                  {year}
                </h2>
                    <hr className="border-gray-600 mb-6" />
                  </div>
                )}
                
                {/* Sets Grid for this year */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {groupedSets[year]?.map((set) => {
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
                                <span className="bg-white text-black text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wide">
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
                              <p className="text-white text-xs font-medium">
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
  );
} 