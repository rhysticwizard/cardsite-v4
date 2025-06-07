'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAllSets, searchCards } from '@/lib/api/scryfall';
import type { MTGSet, MTGCard } from '@/lib/types/mtg';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Calendar, Filter, ArrowUpDown, X, Settings } from 'lucide-react';
import Link from 'next/link';

export function CardSearchPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'name'>('date');
  const [filterBy, setFilterBy] = useState<'all' | 'upcoming' | 'released'>('all');
  const [searchMode, setSearchMode] = useState<'sets' | 'cards'>('sets');

  // Debounced search query for card searches
  const [debouncedCardQuery, setDebouncedCardQuery] = useState('');

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

  // Query for all sets
  const { data: allSets, isLoading: setsLoading, error: setsError } = useQuery({
    queryKey: ['mtg-sets'],
    queryFn: getAllSets,
    staleTime: 1000 * 60 * 30, // 30 minutes
  });

  // Query for card search results
  const { data: cardResults, isLoading: cardsLoading, error: cardsError } = useQuery({
    queryKey: ['card-search', debouncedCardQuery],
    queryFn: () => searchCards({ q: debouncedCardQuery }),
    enabled: debouncedCardQuery.trim().length > 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Group sets by year chronologically
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

  // Get rarity color
  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'text-gray-400';
      case 'uncommon': return 'text-gray-300';
      case 'rare': return 'text-yellow-400';
      case 'mythic': return 'text-orange-500';
      default: return 'text-gray-400';
    }
  };

  const isLoading = setsLoading || (searchMode === 'cards' && cardsLoading);
  const error = setsError || cardsError;

  if (isLoading) {
    return (
      <div className="text-white min-h-screen">
        <div className="max-w-6xl mx-auto px-8 py-12">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p>Loading{searchMode === 'cards' ? ' cards' : ' MTG sets'}...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-white min-h-screen">
        <div className="max-w-6xl mx-auto px-8 py-12">
          <div className="bg-red-900 border border-red-700 rounded-lg p-6 text-center">
            <p className="text-red-200">
              Error loading {searchMode === 'cards' ? 'cards' : 'MTG sets'}: {error instanceof Error ? error.message : 'Unknown error'}
            </p>
          </div>
        </div>
      </div>
    );
  }

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
        {searchMode === 'cards' && cardResults && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">
                Card Search Results
              </h2>
              <p className="text-gray-400">
                Found {cardResults.total_cards} card{cardResults.total_cards !== 1 ? 's' : ''}
              </p>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {cardResults.data.map((card: MTGCard) => {
                // Handle double-sided cards
                const imageUrl = card.image_uris?.normal || 
                               (card as any).card_faces?.[0]?.image_uris?.normal;
                
                return (
                  <Link key={card.id} href={`/card/${card.id}`}>
                    <Card className="bg-black border-black cursor-pointer overflow-hidden hover:border-gray-600 transition-colors group">
                      <CardContent className="p-0">
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={card.name}
                            className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-200"
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

            {/* Load More Cards */}
            {cardResults.has_more && (
              <div className="text-center mt-8">
                <Button
                  variant="outline"
                  className="bg-gray-800 border-gray-600 text-gray-300 hover:text-white"
                  onClick={() => {
                    // TODO: Implement pagination for card results
                    console.log('Load more cards');
                  }}
                >
                  Load More Cards
                </Button>
              </div>
            )}
          </div>
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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

        {/* No Results for Cards */}
        {searchMode === 'cards' && cardResults && cardResults.data.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">
              No cards found matching "{searchQuery}".
            </p>
            <p className="text-gray-500 text-sm mt-2">
              Try searching for card names, types, or use Scryfall syntax like "t:creature" or "c:red"
            </p>
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