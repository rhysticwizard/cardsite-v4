'use client';

import React, { useState, useMemo, useEffect, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { searchCards, getAllSets, getRandomCard } from '@/lib/api/scryfall';
import type { MTGSet, MTGCard } from '@/lib/types/mtg';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Calendar, Filter, ArrowUpDown, X, Settings, Sliders, Shuffle, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
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
                    <div className="animate-spin w-6 h-6 border-2 border-white border-t-transparent rounded-full mx-auto mb-4"></div>
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
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {cardResults.data.map((card: MTGCard) => {
          const imageUrl = card.image_uris?.normal || 
                          (card as any).card_faces?.[0]?.image_uris?.normal;
          
          return (
            <Link key={card.id} href={`/card/${card.id}`}>
              <Card className="bg-black border-black cursor-pointer overflow-hidden">
                <CardContent className="p-0">
                  {imageUrl ? (
                    <Image
                      src={imageUrl}
                      alt={card.name}
                      width={312}
                      height={445}
                      className="w-full h-auto object-cover"
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
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'a-z' | 'z-a'>('newest');
  const [filterBy, setFilterBy] = useState<'all' | 'upcoming' | 'released'>('all');
  const [setTypeFilter, setSetTypeFilter] = useState<string>('all');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [searchMode, setSearchMode] = useState<'sets' | 'cards'>('sets');
  
  // Debounced search query for card searches
  const [debouncedCardQuery, setDebouncedCardQuery] = useState('');

  // Sort dropdown state
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  
  // Advanced search state
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  
  // Multi-select dropdown states
  const [showColorsDropdown, setShowColorsDropdown] = useState(false);
  const [showCommanderDropdown, setShowCommanderDropdown] = useState(false);
  const [showGameDropdown, setShowGameDropdown] = useState(false);
  const [showRarityDropdown, setShowRarityDropdown] = useState(false);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedCommander, setSelectedCommander] = useState<string[]>([]);
  const [selectedGame, setSelectedGame] = useState<string[]>([]);
  const [selectedRarity, setSelectedRarity] = useState<string[]>([]);
  const [advancedSearchForm, setAdvancedSearchForm] = useState({
    cardType: '',
    subtype: '',
    set: '',
    colors: '',
    manaCost: '',
    cmcMin: '',
    cmcMax: '',
    powerMin: '',
    powerMax: '',
    toughnessMin: '',
    toughnessMax: '',
    rarity: '',
    rulesText: '',
    flavorText: '',
    artist: '',
    format: '',
    language: '',
    border: '',
    foil: false,
    nonFoil: false,
    reservedList: false,
    digitalOnly: false,
    watermark: false,
    fullArt: false
  });

  // FIXED: Controlled API call with proper error handling and fallback
  const { 
    data: allSets = [], 
    isLoading: isBackgroundLoading,
    isSuccess,
    error: setsError
  } = useQuery({
    queryKey: ['mtg-sets-all'],
    queryFn: async () => {
      console.log('🔄 Loading all Magic sets...');
      try {
        const allSetsData = await getAllSets();
        console.log(`✅ Loaded ${allSetsData.length} total sets`);
        return allSetsData;
      } catch (error) {
        console.error('❌ Failed to load sets from API:', error);
        // Return fallback empty array instead of crashing
        return [];
      }
    },
    staleTime: 1000 * 60 * 60, // 1 hour - longer cache to reduce API calls
    gcTime: 1000 * 60 * 60 * 24, // 24 hours - keep in cache longer
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnMount: false, // Don't refetch on mount if cached
    retry: (failureCount, error) => {
      // Don't retry API failures excessively - prevents crash loops
      if (failureCount >= 2) return false;
      return true;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000), // Exponential backoff
    enabled: true, // Always enabled but with proper error handling
  });

  // No suggestions needed for Enter-only search
  




  // Card search only triggers on Enter key press
  const [pendingCardSearch, setPendingCardSearch] = useState('');

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowSortDropdown(false);
      setShowColorsDropdown(false);
      setShowCommanderDropdown(false);
      setShowGameDropdown(false);
      setShowRarityDropdown(false);
      setShowFilterDropdown(false);
    };
    
    if (showSortDropdown || showColorsDropdown || showCommanderDropdown || showGameDropdown || showRarityDropdown || showFilterDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showSortDropdown, showColorsDropdown, showCommanderDropdown, showGameDropdown, showRarityDropdown, showFilterDropdown]);

  // Handle Enter key press for search
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (searchQuery.trim().length > 0) {
        // Trigger search (both sets and cards)
        setDebouncedCardQuery(searchQuery);
        setSearchMode('cards');
        setShowAdvancedSearch(false);
      } else {
        // Empty search - show all sets
        setDebouncedCardQuery('');
        setSearchMode('sets');
        setShowAdvancedSearch(false);
      }
    }
  };

  // Handle random card button click
  const handleRandomCard = async () => {
    try {
      const randomCard = await getRandomCard();
      // Set search mode to cards and display the random card
      setSearchQuery(`"${randomCard.name}"`);
      setDebouncedCardQuery(`"${randomCard.name}"`);
      setSearchMode('cards');
      setShowAdvancedSearch(false);
    } catch (error) {
      console.error('Failed to get random card:', error);
    }
  };

  // Handle advanced search
  const handleAdvancedSearch = () => {
    const queryParts = [];
    
    // Build Scryfall search query from form data
    if (advancedSearchForm.cardType) queryParts.push(`type:${advancedSearchForm.cardType}`);
    if (advancedSearchForm.subtype) queryParts.push(`type:${advancedSearchForm.subtype}`);
    if (advancedSearchForm.colors) queryParts.push(`color:${advancedSearchForm.colors}`);
    if (advancedSearchForm.manaCost) queryParts.push(`mana:${advancedSearchForm.manaCost}`);
    if (advancedSearchForm.cmcMin) queryParts.push(`cmc>=${advancedSearchForm.cmcMin}`);
    if (advancedSearchForm.cmcMax) queryParts.push(`cmc<=${advancedSearchForm.cmcMax}`);
    if (advancedSearchForm.powerMin) queryParts.push(`power>=${advancedSearchForm.powerMin}`);
    if (advancedSearchForm.powerMax) queryParts.push(`power<=${advancedSearchForm.powerMax}`);
    if (advancedSearchForm.toughnessMin) queryParts.push(`toughness>=${advancedSearchForm.toughnessMin}`);
    if (advancedSearchForm.toughnessMax) queryParts.push(`toughness<=${advancedSearchForm.toughnessMax}`);
    if (advancedSearchForm.rarity) queryParts.push(`rarity:${advancedSearchForm.rarity}`);
    if (advancedSearchForm.rulesText) queryParts.push(`oracle:"${advancedSearchForm.rulesText}"`);
    if (advancedSearchForm.flavorText) queryParts.push(`flavor:"${advancedSearchForm.flavorText}"`);
    if (advancedSearchForm.artist) queryParts.push(`artist:"${advancedSearchForm.artist}"`);
    if (advancedSearchForm.set) queryParts.push(`set:${advancedSearchForm.set}`);
    if (advancedSearchForm.format) queryParts.push(`legal:${advancedSearchForm.format}`);
    if (advancedSearchForm.border) queryParts.push(`border:${advancedSearchForm.border}`);
    if (advancedSearchForm.foil) queryParts.push('is:foil');
    if (advancedSearchForm.reservedList) queryParts.push('is:reserved');
    if (advancedSearchForm.digitalOnly) queryParts.push('is:digital');
    if (advancedSearchForm.fullArt) queryParts.push('is:fullart');
    
    const searchQuery = queryParts.join(' ');
    
    if (searchQuery) {
      setSearchQuery(searchQuery);
      setDebouncedCardQuery(searchQuery);
      setSearchMode('cards');
      setShowAdvancedSearch(false);
    }
  };

  // Only process sets when actually needed - not during typing
  const getFilteredAndSortedSets = () => {
    if (searchMode === 'cards') return [];
    
    // Filter to only show parent sets (sets without a parent_set_code)
    let sets = allSets.filter(set => 
      !set.parent_set_code
    );
    
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
     
     // Apply set type filter
     if (setTypeFilter !== 'all') {
       sets = sets.filter(set => {
         const setType = set.set_type?.toLowerCase() || '';
         return setType === setTypeFilter.toLowerCase();
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
  }, [searchMode, debouncedCardQuery, filterBy, sortBy, setTypeFilter, allSets]);

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
    <div className="max-w-6xl mx-auto px-8 pb-8 text-white">
        
        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative max-w-xl mx-auto">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for a Magic card or set"
              className="bg-black border-gray-600 text-white pl-4 pr-12 py-3 rounded-md focus:ring-0 focus:ring-offset-0 focus:border-gray-600 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-gray-600"
              onKeyDown={handleKeyDown}
            />
            <button 
              onClick={handleRandomCard}
              className="absolute right-20 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
            >
              <Shuffle className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
              className="absolute right-12 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
            >
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
          
          {/* Advanced Search Options */}
          <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
            showAdvancedSearch ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
          }`}>
            <h3 className="text-white font-semibold mb-4 max-w-6xl mx-auto">Advanced Search</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-w-6xl mx-auto">
              {/* Basic Card Info */}
              <div>
                <label className="block text-gray-300 text-sm mb-2">Card Name</label>
                <input 
                  type="text" 
                  placeholder="Exact or partial name"
                  className="w-full bg-black border border-gray-600 text-white rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-gray-300 text-sm mb-2">Type Line</label>
                <input 
                  type="text" 
                  placeholder="Enter a type or choose from the list"
                  className="w-full bg-black border border-gray-600 text-white rounded px-3 py-2"
                />
                <div className="mt-1">
                  <label className="flex items-center text-gray-300 text-xs">
                    <input type="checkbox" className="mr-1 bg-black border-gray-600" />
                    Allow partial type matches
                  </label>
                </div>
              </div>

              
              {/* Colors */}
              <div>
                <label className="block text-gray-300 text-sm mb-2">Colors</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowColorsDropdown(!showColorsDropdown)}
                    className="w-full bg-black border border-gray-600 text-white rounded px-3 py-2 text-left flex items-center justify-between"
                  >
                    <span className="text-gray-400">
                      {selectedColors.length === 0 ? 'Select colors...' : `${selectedColors.length} Selected`}
                    </span>
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  
                  {showColorsDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-black border border-gray-600 rounded-lg shadow-xl z-50 p-3">
                      <div className="space-y-2">
                        {['White', 'Blue', 'Black', 'Red', 'Green', 'Colorless'].map((color) => (
                          <label key={color} className="flex items-center text-gray-300 text-sm cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="mr-2 bg-black border-gray-600"
                              checked={selectedColors.includes(color)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedColors([...selectedColors, color]);
                                } else {
                                  setSelectedColors(selectedColors.filter(c => c !== color));
                                }
                              }}
                            />
                            {color}
                          </label>
                        ))}
                        <hr className="border-gray-600 my-2" />
                        <label className="flex items-center text-gray-300 text-xs cursor-pointer">
                          <input type="checkbox" className="mr-1 bg-black border-gray-600" />
                          Exactly these colors
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-gray-300 text-sm mb-2">Commander</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowCommanderDropdown(!showCommanderDropdown)}
                    className="w-full bg-black border border-gray-600 text-white rounded px-3 py-2 text-left flex items-center justify-between"
                  >
                    <span className="text-gray-400">
                      {selectedCommander.length === 0 ? 'Select commander colors...' : `${selectedCommander.length} Selected`}
                    </span>
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  
                  {showCommanderDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-black border border-gray-600 rounded-lg shadow-xl z-50 p-3">
                      <div className="space-y-2">
                        {['White', 'Blue', 'Black', 'Red', 'Green', 'Colorless'].map((color) => (
                          <label key={color} className="flex items-center text-gray-300 text-sm cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="mr-2 bg-black border-gray-600"
                              checked={selectedCommander.includes(color)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedCommander([...selectedCommander, color]);
                                } else {
                                  setSelectedCommander(selectedCommander.filter(c => c !== color));
                                }
                              }}
                            />
                            {color}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-gray-300 text-sm mb-2">Mana Cost</label>
                <input 
                  type="text" 
                  placeholder="Any mana symbols, e.g. '{W}{U}'"
                  className="w-full bg-black border border-gray-600 text-white rounded px-3 py-2"
                />
                <div className="mt-1">
                  <label className="flex items-center text-gray-300 text-xs">
                    <input type="checkbox" className="mr-1 bg-black border-gray-600" />
                    Add symbol
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-gray-300 text-sm mb-2">Stats</label>
                <div className="flex space-x-1">
                  <select className="w-1/3 bg-black border border-gray-600 text-white rounded px-2 py-2 text-sm">
                    <option value="mv">Mana Value</option>
                    <option value="pow">Power</option>
                    <option value="tou">Toughness</option>
                    <option value="loy">Loyalty</option>
                  </select>
                  <select className="w-1/4 bg-black border border-gray-600 text-white rounded px-1 py-2 text-sm">
                    <option value="=">=</option>
                    <option value=">">&gt;</option>
                    <option value="<">&lt;</option>
                    <option value=">=">&ge;</option>
                    <option value="<=">&le;</option>
                  </select>
                  <input 
                    type="text" 
                    placeholder="Any value, e.g. '2'"
                    className="w-5/12 bg-black border border-gray-600 text-white rounded px-3 py-2"
                  />
                </div>
              </div>
              
              {/* Game Section */}
              <div>
                <label className="block text-gray-300 text-sm mb-2">Game</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowGameDropdown(!showGameDropdown)}
                    className="w-full bg-black border border-gray-600 text-white rounded px-3 py-2 text-left flex items-center justify-between"
                  >
                    <span className="text-gray-400">
                      {selectedGame.length === 0 ? 'Select game types...' : `${selectedGame.length} Selected`}
                    </span>
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  
                  {showGameDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-black border border-gray-600 rounded-lg shadow-xl z-50 p-3">
                      <div className="space-y-2">
                        {['Paper', 'Arena', 'Magic Online'].map((game) => (
                          <label key={game} className="flex items-center text-gray-300 text-sm cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="mr-2 bg-black border-gray-600"
                              checked={selectedGame.includes(game)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedGame([...selectedGame, game]);
                                } else {
                                  setSelectedGame(selectedGame.filter(g => g !== game));
                                }
                              }}
                            />
                            {game}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Sets */}
              <div>
                <label className="block text-gray-300 text-sm mb-2">Sets</label>
                <input 
                  type="text" 
                  placeholder="Enter a set name or choose from the list"
                  className="w-full bg-black border border-gray-600 text-white rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-gray-300 text-sm mb-2">Block</label>
                <input 
                  type="text" 
                  placeholder="Enter a block name or choose from the list"
                  className="w-full bg-black border border-gray-600 text-white rounded px-3 py-2"
                />
              </div>
              
              {/* Rarity */}
              <div>
                <label className="block text-gray-300 text-sm mb-2">Rarity</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowRarityDropdown(!showRarityDropdown)}
                    className="w-full bg-black border border-gray-600 text-white rounded px-3 py-2 text-left flex items-center justify-between"
                  >
                    <span className="text-gray-400">
                      {selectedRarity.length === 0 ? 'Select rarities...' : `${selectedRarity.length} Selected`}
                    </span>
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  
                  {showRarityDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-black border border-gray-600 rounded-lg shadow-xl z-50 p-3">
                      <div className="space-y-2">
                        {['Common', 'Uncommon', 'Rare', 'Mythic Rare'].map((rarity) => (
                          <label key={rarity} className="flex items-center text-gray-300 text-sm cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="mr-2 bg-black border-gray-600"
                              checked={selectedRarity.includes(rarity)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedRarity([...selectedRarity, rarity]);
                                } else {
                                  setSelectedRarity(selectedRarity.filter(r => r !== rarity));
                                }
                              }}
                            />
                            {rarity}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Criteria */}
              <div>
                <label className="block text-gray-300 text-sm mb-2">Criteria</label>
                <input 
                  type="text" 
                  placeholder="Enter a criterion or choose from the list"
                  className="w-full bg-black border border-gray-600 text-white rounded px-3 py-2"
                />
                <div className="mt-1">
                  <label className="flex items-center text-gray-300 text-xs">
                    <input type="checkbox" className="mr-1 bg-black border-gray-600" />
                    Allow partial criteria matches
                  </label>
                </div>
              </div>
              
              {/* Text Search */}
              <div>
                <label className="block text-gray-300 text-sm mb-2">Text</label>
                <input 
                  type="text" 
                  placeholder="Any text, e.g. 'draw a card'"
                  className="w-full bg-black border border-gray-600 text-white rounded px-3 py-2"
                />
                <div className="mt-1">
                  <label className="flex items-center text-gray-300 text-xs">
                    <input type="checkbox" className="mr-1 bg-black border-gray-600" />
                    Add symbol
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-gray-300 text-sm mb-2">Oracle Text</label>
                <input 
                  type="text" 
                  placeholder="Rules text to search"
                  className="w-full bg-black border border-gray-600 text-white rounded px-3 py-2"
                />
              </div>

              
              {/* Format */}
              <div>
                <label className="block text-gray-300 text-sm mb-2">Format</label>
                <div className="flex space-x-1">
                  <select className="w-1/2 bg-black border border-gray-600 text-white rounded px-3 py-2">
                    <option value="">Legal</option>
                    <option value="banned">Banned</option>
                    <option value="restricted">Restricted</option>
                    <option value="not_legal">Not Legal</option>
                  </select>
                  <select className="w-1/2 bg-black border border-gray-600 text-white rounded px-3 py-2">
                    <option value="">Choose format</option>
                    <option value="standard">Standard</option>
                    <option value="pioneer">Pioneer</option>
                    <option value="modern">Modern</option>
                    <option value="legacy">Legacy</option>
                    <option value="vintage">Vintage</option>
                    <option value="commander">Commander</option>
                    <option value="pauper">Pauper</option>
                    <option value="historic">Historic</option>
                    <option value="alchemy">Alchemy</option>
                    <option value="brawl">Brawl</option>
                    <option value="penny">Penny Dreadful</option>
                  </select>
                </div>
              </div>
              
              {/* Language */}
              <div>
                <label className="block text-gray-300 text-sm mb-2">Language</label>
                <select className="w-full bg-black border border-gray-600 text-white rounded px-3 py-2">
                  <option value="">Default</option>
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                  <option value="it">Italian</option>
                  <option value="pt">Portuguese</option>
                  <option value="ja">Japanese</option>
                  <option value="ko">Korean</option>
                  <option value="ru">Russian</option>
                  <option value="zhs">Chinese (Simplified)</option>
                  <option value="zht">Chinese (Traditional)</option>
                </select>
              </div>
              
              {/* Preferences */}
              <div>
                <label className="block text-gray-300 text-sm mb-2">Preferences</label>
                <div className="space-y-2">
                  <div className="flex space-x-1">
                    <select className="w-1/2 bg-black border border-gray-600 text-white rounded px-3 py-2">
                      <option value="">Display as Images</option>
                      <option value="text">Display as Text</option>
                      <option value="checklist">Display as Checklist</option>
                    </select>
                    <select className="w-1/2 bg-black border border-gray-600 text-white rounded px-3 py-2">
                      <option value="">Sort by Name</option>
                      <option value="set">Sort by Set</option>
                      <option value="rarity">Sort by Rarity</option>
                      <option value="cmc">Sort by CMC</option>
                      <option value="color">Sort by Color</option>
                      <option value="price">Sort by Price</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="flex items-center text-gray-300 text-xs">
                      <input type="checkbox" className="mr-1 bg-black border-gray-600" />
                      Show all card prints
                    </label>
                    <label className="flex items-center text-gray-300 text-xs">
                      <input type="checkbox" className="mr-1 bg-black border-gray-600" />
                      Include extra cards (tokens, planes, schemes, etc.)
                    </label>
                  </div>
                </div>
              </div>
              
              
              {/* Prices */}
              <div>
                <label className="block text-gray-300 text-sm mb-2">Prices</label>
                <div className="flex space-x-1">
                  <select className="w-1/3 bg-black border border-gray-600 text-white rounded px-2 py-2 text-sm">
                    <option value="usd">USD</option>
                    <option value="eur">EUR</option>
                    <option value="tix">TIX</option>
                  </select>
                  <select className="w-1/4 bg-black border border-gray-600 text-white rounded px-1 py-2 text-sm">
                    <option value="less">less than</option>
                    <option value="greater">greater than</option>
                    <option value="equal">equal to</option>
                  </select>
                  <input 
                    type="text" 
                    placeholder="Any value, e.g. '15.00'"
                    className="w-5/12 bg-black border border-gray-600 text-white rounded px-3 py-2"
                  />
                </div>
              </div>
              
              {/* Artist */}
              <div>
                <label className="block text-gray-300 text-sm mb-2">Artist</label>
                <input 
                  type="text" 
                  placeholder="Any artist name, e.g. 'Magali'"
                  className="w-full bg-black border border-gray-600 text-white rounded px-3 py-2"
                />
              </div>
              
              {/* Flavor Text */}
              <div>
                <label className="block text-gray-300 text-sm mb-2">Flavor Text</label>
                <input 
                  type="text" 
                  placeholder="Any flavor text, e.g. 'Kaldheim'"
                  className="w-full bg-black border border-gray-600 text-white rounded px-3 py-2"
                />
              </div>
              
              {/* Lore Finder */}
              <div>
                <label className="block text-gray-300 text-sm mb-2">Lore Finder™</label>
                <input 
                  type="text" 
                  placeholder="Any text, especially names, e.g. 'Jhoira'"
                  className="w-full bg-black border border-gray-600 text-white rounded px-3 py-2"
                />
              </div>
              
              {/* Special Properties */}
              <div className="xl:col-span-4">
                <label className="block text-gray-300 text-sm mb-2">Special Properties</label>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2">
                  <label className="flex items-center text-gray-300 text-sm">
                    <input type="checkbox" className="mr-2 bg-black border-gray-600" />
                    Foil
                  </label>
                  <label className="flex items-center text-gray-300 text-sm">
                    <input type="checkbox" className="mr-2 bg-black border-gray-600" />
                    Non-foil
                  </label>
                  <label className="flex items-center text-gray-300 text-sm">
                    <input type="checkbox" className="mr-2 bg-black border-gray-600" />
                    Reserved List
                  </label>
                  <label className="flex items-center text-gray-300 text-sm">
                    <input type="checkbox" className="mr-2 bg-black border-gray-600" />
                    Reprint
                  </label>
                  <label className="flex items-center text-gray-300 text-sm">
                    <input type="checkbox" className="mr-2 bg-black border-gray-600" />
                    First Printing
                  </label>
                  <label className="flex items-center text-gray-300 text-sm">
                    <input type="checkbox" className="mr-2 bg-black border-gray-600" />
                    Promo
                  </label>
                  <label className="flex items-center text-gray-300 text-sm">
                    <input type="checkbox" className="mr-2 bg-black border-gray-600" />
                    Digital
                  </label>
                  <label className="flex items-center text-gray-300 text-sm">
                    <input type="checkbox" className="mr-2 bg-black border-gray-600" />
                    Paper
                  </label>
                  <label className="flex items-center text-gray-300 text-sm">
                    <input type="checkbox" className="mr-2 bg-black border-gray-600" />
                    MTGO
                  </label>
                  <label className="flex items-center text-gray-300 text-sm">
                    <input type="checkbox" className="mr-2 bg-black border-gray-600" />
                    Arena
                  </label>
                  <label className="flex items-center text-gray-300 text-sm">
                    <input type="checkbox" className="mr-2 bg-black border-gray-600" />
                    Full Art
                  </label>
                  <label className="flex items-center text-gray-300 text-sm">
                    <input type="checkbox" className="mr-2 bg-black border-gray-600" />
                    Textless
                  </label>
                  <label className="flex items-center text-gray-300 text-sm">
                    <input type="checkbox" className="mr-2 bg-black border-gray-600" />
                    Story Spotlight
                  </label>
                  <label className="flex items-center text-gray-300 text-sm">
                    <input type="checkbox" className="mr-2 bg-black border-gray-600" />
                    Timeshifted
                  </label>
                  <label className="flex items-center text-gray-300 text-sm">
                    <input type="checkbox" className="mr-2 bg-black border-gray-600" />
                    Split Card
                  </label>
                  <label className="flex items-center text-gray-300 text-sm">
                    <input type="checkbox" className="mr-2 bg-black border-gray-600" />
                    Flip Card
                  </label>
                  <label className="flex items-center text-gray-300 text-sm">
                    <input type="checkbox" className="mr-2 bg-black border-gray-600" />
                    Transform
                  </label>
                  <label className="flex items-center text-gray-300 text-sm">
                    <input type="checkbox" className="mr-2 bg-black border-gray-600" />
                    Modal DFC
                  </label>
                  <label className="flex items-center text-gray-300 text-sm">
                    <input type="checkbox" className="mr-2 bg-black border-gray-600" />
                    Meld
                  </label>
                  <label className="flex items-center text-gray-300 text-sm">
                    <input type="checkbox" className="mr-2 bg-black border-gray-600" />
                    Level Up
                  </label>
                  <label className="flex items-center text-gray-300 text-sm">
                    <input type="checkbox" className="mr-2 bg-black border-gray-600" />
                    Saga
                  </label>
                  <label className="flex items-center text-gray-300 text-sm">
                    <input type="checkbox" className="mr-2 bg-black border-gray-600" />
                    Adventure
                  </label>
                  <label className="flex items-center text-gray-300 text-sm">
                    <input type="checkbox" className="mr-2 bg-black border-gray-600" />
                    Booster Fun
                  </label>
                  <label className="flex items-center text-gray-300 text-sm">
                    <input type="checkbox" className="mr-2 bg-black border-gray-600" />
                    Anime
                  </label>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end mt-4 space-x-2 max-w-4xl mx-auto">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowAdvancedSearch(false)}
                className="text-gray-400 hover:text-white"
              >
                Cancel
              </Button>
                              <Button 
                variant="ghost"
                size="sm"
                onClick={handleAdvancedSearch}
                className="text-gray-300 hover:text-white border border-transparent hover:border-gray-600 hover:bg-transparent transition-colors"
              >
                Search
              </Button>
             </div>
         </div>
      </div>



      {/* Search Results Indicator */}


      {/* Card Search Results */}
      {searchMode === 'cards' && debouncedCardQuery && (
        <Suspense fallback={
          <div className="text-center">
            <div className="animate-spin w-6 h-6 border-2 border-white border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-400">Loading cards...</p>
          </div>
        }>
          <CardResults searchQuery={debouncedCardQuery} />
        </Suspense>
      )}

      {/* Loading State - show when still loading and no data yet */}
      {searchMode === 'sets' && isBackgroundLoading && sortedYears.length === 0 && (
        <div className="text-center py-20">
          <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-400 text-lg">Loading Magic sets...</p>
        </div>
      )}

      {/* Set Results - show when not searching cards and not loading */}
      {searchMode === 'sets' && !(isBackgroundLoading && sortedYears.length === 0) && (
        <div className="space-y-12">
          {/* Controls at top */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">
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
              
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                  className="text-gray-300 hover:text-white border border-transparent hover:border-gray-600 hover:bg-transparent transition-colors"
                >
                  Filter {setTypeFilter !== 'all' && '(active)'}
                  <Filter className="w-4 h-4 ml-1" />
                </Button>
                
                {showFilterDropdown && (
                  <div className="absolute top-full right-0 mt-2 bg-black border border-gray-600 rounded-lg shadow-xl z-50 min-w-48 max-h-80 overflow-y-auto">
                    <button
                      onClick={() => {
                        setSetTypeFilter('all');
                        setShowFilterDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-white hover:bg-gray-700 transition-colors rounded-t-lg ${
                        setTypeFilter === 'all' ? 'bg-gray-700' : ''
                      }`}
                    >
                      Any
                    </button>
                    <button
                      onClick={() => {
                        setSetTypeFilter('alchemy');
                        setShowFilterDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-white hover:bg-gray-700 transition-colors ${
                        setTypeFilter === 'alchemy' ? 'bg-gray-700' : ''
                      }`}
                    >
                      Alchemy
                    </button>
                    <button
                      onClick={() => {
                        setSetTypeFilter('archenemy');
                        setShowFilterDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-white hover:bg-gray-700 transition-colors ${
                        setTypeFilter === 'archenemy' ? 'bg-gray-700' : ''
                      }`}
                    >
                      Archenemy
                    </button>
                    <button
                      onClick={() => {
                        setSetTypeFilter('arsenal');
                        setShowFilterDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-white hover:bg-gray-700 transition-colors ${
                        setTypeFilter === 'arsenal' ? 'bg-gray-700' : ''
                      }`}
                    >
                      Arsenal
                    </button>
                    <button
                      onClick={() => {
                        setSetTypeFilter('box');
                        setShowFilterDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-white hover:bg-gray-700 transition-colors ${
                        setTypeFilter === 'box' ? 'bg-gray-700' : ''
                      }`}
                    >
                      Box
                    </button>
                    <button
                      onClick={() => {
                        setSetTypeFilter('commander');
                        setShowFilterDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-white hover:bg-gray-700 transition-colors ${
                        setTypeFilter === 'commander' ? 'bg-gray-700' : ''
                      }`}
                    >
                      Commander
                    </button>
                    <button
                      onClick={() => {
                        setSetTypeFilter('core');
                        setShowFilterDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-white hover:bg-gray-700 transition-colors ${
                        setTypeFilter === 'core' ? 'bg-gray-700' : ''
                      }`}
                    >
                      Core
                    </button>
                    <button
                      onClick={() => {
                        setSetTypeFilter('draft_innovation');
                        setShowFilterDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-white hover:bg-gray-700 transition-colors ${
                        setTypeFilter === 'draft_innovation' ? 'bg-gray-700' : ''
                      }`}
                    >
                      Draft Innovation
                    </button>
                    <button
                      onClick={() => {
                        setSetTypeFilter('duel_deck');
                        setShowFilterDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-white hover:bg-gray-700 transition-colors ${
                        setTypeFilter === 'duel_deck' ? 'bg-gray-700' : ''
                      }`}
                    >
                      Duel Deck
                    </button>
                    <button
                      onClick={() => {
                        setSetTypeFilter('expansion');
                        setShowFilterDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-white hover:bg-gray-700 transition-colors ${
                        setTypeFilter === 'expansion' ? 'bg-gray-700' : ''
                      }`}
                    >
                      Expansion
                    </button>
                    <button
                      onClick={() => {
                        setSetTypeFilter('from_the_vault');
                        setShowFilterDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-white hover:bg-gray-700 transition-colors ${
                        setTypeFilter === 'from_the_vault' ? 'bg-gray-700' : ''
                      }`}
                    >
                      From The Vault
                    </button>
                    <button
                      onClick={() => {
                        setSetTypeFilter('funny');
                        setShowFilterDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-white hover:bg-gray-700 transition-colors ${
                        setTypeFilter === 'funny' ? 'bg-gray-700' : ''
                      }`}
                    >
                      Funny
                    </button>
                    <button
                      onClick={() => {
                        setSetTypeFilter('masterpiece');
                        setShowFilterDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-white hover:bg-gray-700 transition-colors ${
                        setTypeFilter === 'masterpiece' ? 'bg-gray-700' : ''
                      }`}
                    >
                      Masterpiece
                    </button>
                    <button
                      onClick={() => {
                        setSetTypeFilter('masters');
                        setShowFilterDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-white hover:bg-gray-700 transition-colors ${
                        setTypeFilter === 'masters' ? 'bg-gray-700' : ''
                      }`}
                    >
                      Masters
                    </button>
                    <button
                      onClick={() => {
                        setSetTypeFilter('memorabilia');
                        setShowFilterDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-white hover:bg-gray-700 transition-colors ${
                        setTypeFilter === 'memorabilia' ? 'bg-gray-700' : ''
                      }`}
                    >
                      Memorabilia
                    </button>
                    <button
                      onClick={() => {
                        setSetTypeFilter('minigame');
                        setShowFilterDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-white hover:bg-gray-700 transition-colors ${
                        setTypeFilter === 'minigame' ? 'bg-gray-700' : ''
                      }`}
                    >
                      Minigame
                    </button>
                    <button
                      onClick={() => {
                        setSetTypeFilter('planechase');
                        setShowFilterDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-white hover:bg-gray-700 transition-colors ${
                        setTypeFilter === 'planechase' ? 'bg-gray-700' : ''
                      }`}
                    >
                      Planechase
                    </button>
                    <button
                      onClick={() => {
                        setSetTypeFilter('premium_deck');
                        setShowFilterDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-white hover:bg-gray-700 transition-colors ${
                        setTypeFilter === 'premium_deck' ? 'bg-gray-700' : ''
                      }`}
                    >
                      Premium Deck
                    </button>
                    <button
                      onClick={() => {
                        setSetTypeFilter('promo');
                        setShowFilterDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-white hover:bg-gray-700 transition-colors ${
                        setTypeFilter === 'promo' ? 'bg-gray-700' : ''
                      }`}
                    >
                      Promo
                    </button>
                    <button
                      onClick={() => {
                        setSetTypeFilter('spellbook');
                        setShowFilterDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-white hover:bg-gray-700 transition-colors ${
                        setTypeFilter === 'spellbook' ? 'bg-gray-700' : ''
                      }`}
                    >
                      Spellbook
                    </button>
                    <button
                      onClick={() => {
                        setSetTypeFilter('starter');
                        setShowFilterDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-white hover:bg-gray-700 transition-colors ${
                        setTypeFilter === 'starter' ? 'bg-gray-700' : ''
                      }`}
                    >
                      Starter
                    </button>
                    <button
                      onClick={() => {
                        setSetTypeFilter('token');
                        setShowFilterDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-white hover:bg-gray-700 transition-colors ${
                        setTypeFilter === 'token' ? 'bg-gray-700' : ''
                      }`}
                    >
                      Token
                    </button>
                    <button
                      onClick={() => {
                        setSetTypeFilter('treasure_chest');
                        setShowFilterDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-white hover:bg-gray-700 transition-colors ${
                        setTypeFilter === 'treasure_chest' ? 'bg-gray-700' : ''
                      }`}
                    >
                      Treasure Chest
                    </button>
                    <button
                      onClick={() => {
                        setSetTypeFilter('vanguard');
                        setShowFilterDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-white hover:bg-gray-700 transition-colors rounded-b-lg ${
                        setTypeFilter === 'vanguard' ? 'bg-gray-700' : ''
                      }`}
                    >
                      Vanguard
                    </button>
                  </div>
                )}
              </div>
              
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSortDropdown(!showSortDropdown)}
                  className="text-gray-300 hover:text-white border border-transparent hover:border-gray-600 hover:bg-transparent transition-colors"
                >
                  Sort
                  <ArrowUpDown className="w-4 h-4 ml-1" />
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
                      <Card className="bg-black border-black cursor-pointer">
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
                    <h2 className="text-xl font-bold text-white mb-4">
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
                        <Card className="bg-black border-black cursor-pointer">
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


    </div>
  );
} 