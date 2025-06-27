'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAllSets, getAllCardsFromSet, getCardsFromSet } from '@/lib/api/scryfall';
import type { MTGSet, MTGCard } from '@/lib/types/mtg';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, ArrowLeft, ArrowUpDown, Filter } from 'lucide-react';
import Link from 'next/link';

interface SetDetailPageProps {
  setCode: string;
}

export function SetDetailPage({ setCode }: SetDetailPageProps) {
  const [selectedSubSet, setSelectedSubSet] = useState<string>(setCode);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [startIndex, setStartIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [sortBy, setSortBy] = useState<'collector_number' | 'name' | 'rarity' | 'cmc' | 'price_high' | 'price_low'>('collector_number');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [rarityFilter, setRarityFilter] = useState<string>('all');
  const [colorFilter, setColorFilter] = useState<string>('all');
  const carouselRef = React.useRef<HTMLDivElement>(null);

  // Get all sets to find related sets
  const { data: allSets } = useQuery({
    queryKey: ['mtg-sets'],
    queryFn: getAllSets,
    staleTime: 1000 * 60 * 30,
  });

  // Get the main set info
  const currentSet = useMemo(() => {
    return allSets?.find(set => set.code.toLowerCase() === setCode.toLowerCase());
  }, [allSets, setCode]);

  // Find related sets (same base name or block)
  const relatedSets = useMemo(() => {
    if (!allSets || !currentSet) return [];
    
    const baseName = currentSet.name
      .replace(/:\s.*/, '') // Remove everything after ":"
      .replace(/\s+(Art Series|Promos|Commander|Alchemy|Tokens).*/, '') // Remove common suffixes
      .trim();
    
    return allSets.filter(set => {
      const setBaseName = set.name
        .replace(/:\s.*/, '')
        .replace(/\s+(Art Series|Promos|Commander|Alchemy|Tokens).*/, '')
        .trim();
      
      return setBaseName === baseName || 
             set.parent_set_code === currentSet.code ||
             currentSet.parent_set_code === set.code ||
             set.block === currentSet.block && currentSet.block;
    }).sort((a, b) => {
      // Sort main set first, then by release date
      if (a.code === currentSet.code) return -1;
      if (b.code === currentSet.code) return 1;
      
      const dateA = a.released_at ? new Date(a.released_at) : new Date('2099-01-01');
      const dateB = b.released_at ? new Date(b.released_at) : new Date('2099-01-01');
      return dateA.getTime() - dateB.getTime();
    });
  }, [allSets, currentSet]);

  // Get ALL cards from the selected subset
  const { data: cardsData, isLoading: cardsLoading, error } = useQuery({
    queryKey: ['set-cards-all', selectedSubSet],
    queryFn: () => getAllCardsFromSet(selectedSubSet),
    enabled: !!selectedSubSet,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });



  // Get the selected subset info
  const selectedSetInfo = useMemo(() => {
    return allSets?.find(set => set.code.toLowerCase() === selectedSubSet.toLowerCase());
  }, [allSets, selectedSubSet]);

  // Filter and sort cards
  const filteredAndSortedCards = useMemo(() => {
    if (!cardsData?.data) return [];
    
    let cards = [...cardsData.data];
    
    // Apply rarity filter
    if (rarityFilter !== 'all') {
      cards = cards.filter(card => card.rarity === rarityFilter);
    }
    
    // Apply color filter
    if (colorFilter !== 'all') {
      cards = cards.filter(card => {
        const colors = card.colors || [];
        
        switch (colorFilter) {
          case 'white':
            return colors.includes('W') && colors.length === 1;
          case 'blue':
            return colors.includes('U') && colors.length === 1;
          case 'black':
            return colors.includes('B') && colors.length === 1;
          case 'red':
            return colors.includes('R') && colors.length === 1;
          case 'green':
            return colors.includes('G') && colors.length === 1;
          case 'colorless':
            return colors.length === 0;
          case 'multicolor':
            return colors.length > 1;
          default:
            return true;
        }
      });
    }
    
    // Apply sorting
    cards.sort((a, b) => {
      switch (sortBy) {
        case 'collector_number':
          const aNum = parseFloat(a.collector_number) || 0;
          const bNum = parseFloat(b.collector_number) || 0;
          return aNum - bNum;
        case 'name':
          return a.name.localeCompare(b.name);
        case 'rarity':
          const rarityOrder = { common: 1, uncommon: 2, rare: 3, mythic: 4 };
          return (rarityOrder[a.rarity as keyof typeof rarityOrder] || 0) - 
                 (rarityOrder[b.rarity as keyof typeof rarityOrder] || 0);
        case 'cmc':
          return (a.cmc || 0) - (b.cmc || 0);
        case 'price_high':
          const aPriceHigh = parseFloat(a.prices?.usd || '0') || 0;
          const bPriceHigh = parseFloat(b.prices?.usd || '0') || 0;
          return bPriceHigh - aPriceHigh; // High to low
        case 'price_low':
          const aPriceLow = parseFloat(a.prices?.usd || '0') || 0;
          const bPriceLow = parseFloat(b.prices?.usd || '0') || 0;
          return aPriceLow - bPriceLow; // Low to high
        default:
          return 0;
      }
    });
    
    return cards;
  }, [cardsData?.data, rarityFilter, colorFilter, sortBy]);

  // Carousel scroll functions
  const updateScrollButtons = () => {
    setCanScrollLeft(startIndex > 0);
    setCanScrollRight(startIndex + 5 < relatedSets.length);
  };

  const scrollLeft = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setStartIndex(prev => Math.max(0, prev - 5));
    setTimeout(() => setIsTransitioning(false), 300);
  };

  const scrollRight = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setStartIndex(prev => Math.min(relatedSets.length - 5, prev + 5));
    setTimeout(() => setIsTransitioning(false), 300);
  };

  // Update scroll buttons when related sets or start index change
  React.useEffect(() => {
    updateScrollButtons();
  }, [relatedSets, startIndex]);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = () => {
      setShowSortDropdown(false);
      setShowFilterDropdown(false);
    };
    
    if (showSortDropdown || showFilterDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showSortDropdown, showFilterDropdown]);

  if (!currentSet) {
    return (
      <div className="text-white min-h-screen">
        <div className="max-w-6xl mx-auto px-8 py-12">
          <div className="text-center">
            <p className="text-gray-400 text-lg">Set not found</p>
            <Link href="/cards">
              <Button variant="outline" className="mt-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to All Sets
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="text-white min-h-screen">
      <div className="max-w-6xl mx-auto px-8 py-8">
        
        {/* Breadcrumb Navigation */}
        <div className="mb-6 flex items-center justify-between text-gray-400 text-sm">
          <div className="flex items-center space-x-4">
            <Link href="/cards" className="hover:text-white">All Sets</Link>
            <span>/</span>
            <span className="text-white font-medium">{selectedSetInfo?.name || currentSet.name}</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowFilterDropdown(!showFilterDropdown);
                }}
                className="text-gray-300 hover:text-white border border-transparent hover:border-gray-600 hover:bg-transparent transition-colors"
              >
                Filter {(rarityFilter !== 'all' || colorFilter !== 'all') && '(active)'}
                <Filter className="w-4 h-4 ml-1" />
              </Button>
              
              {showFilterDropdown && (
                <div 
                  className="absolute top-full right-0 mt-2 bg-black border border-gray-600 rounded-lg shadow-xl z-50 min-w-48"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-3 border-b border-gray-600">
                    <h4 className="text-white font-medium text-sm mb-2">Rarity</h4>
                    <div className="space-y-1">
                      <button
                        onClick={() => {
                          setRarityFilter('all');
                          setShowFilterDropdown(false);
                        }}
                        className={`w-full text-left px-2 py-1 text-sm rounded transition-colors ${
                          rarityFilter === 'all' ? 'bg-gray-700 text-white' : 'text-gray-300 hover:text-white hover:bg-gray-700'
                        }`}
                      >
                        All
                      </button>
                      <button
                        onClick={() => {
                          setRarityFilter('common');
                          setShowFilterDropdown(false);
                        }}
                        className={`w-full text-left px-2 py-1 text-sm rounded transition-colors ${
                          rarityFilter === 'common' ? 'bg-gray-700 text-white' : 'text-gray-300 hover:text-white hover:bg-gray-700'
                        }`}
                      >
                        Common
                      </button>
                      <button
                        onClick={() => {
                          setRarityFilter('uncommon');
                          setShowFilterDropdown(false);
                        }}
                        className={`w-full text-left px-2 py-1 text-sm rounded transition-colors ${
                          rarityFilter === 'uncommon' ? 'bg-gray-700 text-white' : 'text-gray-300 hover:text-white hover:bg-gray-700'
                        }`}
                      >
                        Uncommon
                      </button>
                      <button
                        onClick={() => {
                          setRarityFilter('rare');
                          setShowFilterDropdown(false);
                        }}
                        className={`w-full text-left px-2 py-1 text-sm rounded transition-colors ${
                          rarityFilter === 'rare' ? 'bg-gray-700 text-white' : 'text-gray-300 hover:text-white hover:bg-gray-700'
                        }`}
                      >
                        Rare
                      </button>
                      <button
                        onClick={() => {
                          setRarityFilter('mythic');
                          setShowFilterDropdown(false);
                        }}
                        className={`w-full text-left px-2 py-1 text-sm rounded transition-colors ${
                          rarityFilter === 'mythic' ? 'bg-gray-700 text-white' : 'text-gray-300 hover:text-white hover:bg-gray-700'
                        }`}
                      >
                        Mythic
                      </button>
                    </div>
                  </div>
                  
                  <div className="p-3">
                    <h4 className="text-white font-medium text-sm mb-2">Color</h4>
                    <div className="space-y-1">
                      <button
                        onClick={() => {
                          setColorFilter('all');
                          setShowFilterDropdown(false);
                        }}
                        className={`w-full text-left px-2 py-1 text-sm rounded transition-colors ${
                          colorFilter === 'all' ? 'bg-gray-700 text-white' : 'text-gray-300 hover:text-white hover:bg-gray-700'
                        }`}
                      >
                        All
                      </button>
                      <button
                        onClick={() => {
                          setColorFilter('white');
                          setShowFilterDropdown(false);
                        }}
                        className={`w-full text-left px-2 py-1 text-sm rounded transition-colors ${
                          colorFilter === 'white' ? 'bg-gray-700 text-white' : 'text-gray-300 hover:text-white hover:bg-gray-700'
                        }`}
                      >
                        White
                      </button>
                      <button
                        onClick={() => {
                          setColorFilter('blue');
                          setShowFilterDropdown(false);
                        }}
                        className={`w-full text-left px-2 py-1 text-sm rounded transition-colors ${
                          colorFilter === 'blue' ? 'bg-gray-700 text-white' : 'text-gray-300 hover:text-white hover:bg-gray-700'
                        }`}
                      >
                        Blue
                      </button>
                      <button
                        onClick={() => {
                          setColorFilter('black');
                          setShowFilterDropdown(false);
                        }}
                        className={`w-full text-left px-2 py-1 text-sm rounded transition-colors ${
                          colorFilter === 'black' ? 'bg-gray-700 text-white' : 'text-gray-300 hover:text-white hover:bg-gray-700'
                        }`}
                      >
                        Black
                      </button>
                      <button
                        onClick={() => {
                          setColorFilter('red');
                          setShowFilterDropdown(false);
                        }}
                        className={`w-full text-left px-2 py-1 text-sm rounded transition-colors ${
                          colorFilter === 'red' ? 'bg-gray-700 text-white' : 'text-gray-300 hover:text-white hover:bg-gray-700'
                        }`}
                      >
                        Red
                      </button>
                      <button
                        onClick={() => {
                          setColorFilter('green');
                          setShowFilterDropdown(false);
                        }}
                        className={`w-full text-left px-2 py-1 text-sm rounded transition-colors ${
                          colorFilter === 'green' ? 'bg-gray-700 text-white' : 'text-gray-300 hover:text-white hover:bg-gray-700'
                        }`}
                      >
                        Green
                      </button>
                      <button
                        onClick={() => {
                          setColorFilter('colorless');
                          setShowFilterDropdown(false);
                        }}
                        className={`w-full text-left px-2 py-1 text-sm rounded transition-colors ${
                          colorFilter === 'colorless' ? 'bg-gray-700 text-white' : 'text-gray-300 hover:text-white hover:bg-gray-700'
                        }`}
                      >
                        Colorless
                      </button>
                      <button
                        onClick={() => {
                          setColorFilter('multicolor');
                          setShowFilterDropdown(false);
                        }}
                        className={`w-full text-left px-2 py-1 text-sm rounded transition-colors ${
                          colorFilter === 'multicolor' ? 'bg-gray-700 text-white' : 'text-gray-300 hover:text-white hover:bg-gray-700'
                        }`}
                      >
                        Multicolor
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="relative">
             <Button
               variant="ghost"
               size="sm"
               onClick={(e) => {
                 e.stopPropagation();
                 setShowSortDropdown(!showSortDropdown);
               }}
               className="text-gray-300 hover:text-white border border-transparent hover:border-gray-600 hover:bg-transparent transition-colors"
             >
               Sort
               <ArrowUpDown className="w-4 h-4 ml-1" />
             </Button>
             {showSortDropdown && (
               <div 
                 className="absolute top-full right-0 mt-2 bg-black border border-gray-600 rounded-lg shadow-xl z-50 min-w-32"
                 onClick={(e) => e.stopPropagation()}
               >
                 <button
                   onClick={() => {
                     setSortBy('collector_number');
                     setShowSortDropdown(false);
                   }}
                   className={`w-full text-left px-3 py-2 text-white hover:bg-gray-700 transition-colors rounded-t-lg ${
                     sortBy === 'collector_number' ? 'bg-gray-700' : ''
                   }`}
                 >
                   Collector Number
                 </button>
                 <button
                   onClick={() => {
                     setSortBy('name');
                     setShowSortDropdown(false);
                   }}
                   className={`w-full text-left px-3 py-2 text-white hover:bg-gray-700 transition-colors ${
                     sortBy === 'name' ? 'bg-gray-700' : ''
                   }`}
                 >
                   Name (A-Z)
                 </button>
                 <button
                   onClick={() => {
                     setSortBy('rarity');
                     setShowSortDropdown(false);
                   }}
                   className={`w-full text-left px-3 py-2 text-white hover:bg-gray-700 transition-colors ${
                     sortBy === 'rarity' ? 'bg-gray-700' : ''
                   }`}
                 >
                   Rarity
                 </button>
                 <button
                   onClick={() => {
                     setSortBy('cmc');
                     setShowSortDropdown(false);
                   }}
                   className={`w-full text-left px-3 py-2 text-white hover:bg-gray-700 transition-colors ${
                     sortBy === 'cmc' ? 'bg-gray-700' : ''
                   }`}
                 >
                   Mana Cost
                 </button>
                 <button
                   onClick={() => {
                     setSortBy('price_high');
                     setShowSortDropdown(false);
                   }}
                   className={`w-full text-left px-3 py-2 text-white hover:bg-gray-700 transition-colors ${
                     sortBy === 'price_high' ? 'bg-gray-700' : ''
                   }`}
                 >
                   Price (High to Low)
                 </button>
                 <button
                   onClick={() => {
                     setSortBy('price_low');
                     setShowSortDropdown(false);
                   }}
                   className={`w-full text-left px-3 py-2 text-white hover:bg-gray-700 transition-colors rounded-b-lg ${
                     sortBy === 'price_low' ? 'bg-gray-700' : ''
                   }`}
                 >
                   Price (Low to High)
                 </button>
               </div>
             )}
           </div>
         </div>
        </div>

        {/* Break Line */}
        <hr className="border-gray-600 mb-6" />

        {/* Sub-sets Carousel */}
        {relatedSets.length > 1 && (
          <div className="mb-8">
            <div className="relative">
              {/* Left Arrow */}
              <button
                onClick={scrollLeft}
                disabled={!canScrollLeft || isTransitioning}
                className={`absolute left-0 top-1/2 transform -translate-y-1/2 z-10 rounded-full p-2 transition-all ${
                  (!canScrollLeft || isTransitioning) ? 'opacity-50 cursor-not-allowed' : 'opacity-90 hover:opacity-100'
                }`}
              >
                <ChevronLeft className="w-5 h-5 text-white" />
              </button>

              {/* Right Arrow */}
              <button
                onClick={scrollRight}
                disabled={!canScrollRight || isTransitioning}
                className={`absolute right-0 top-1/2 transform -translate-y-1/2 z-10 rounded-full p-2 transition-all ${
                  (!canScrollRight || isTransitioning) ? 'opacity-50 cursor-not-allowed' : 'opacity-90 hover:opacity-100'
                }`}
              >
                <ChevronRight className="w-5 h-5 text-white" />
              </button>

              {/* Carousel Container */}
              <div className="relative flex items-center justify-center">
                <div className="overflow-hidden w-full py-1 px-0" style={{ width: `${5 * 144 + 4 * 16}px`, height: '160px' }}>
                  <div 
                    className="flex gap-4 transition-transform duration-300 ease-in-out h-full"
                    style={{
                      transform: `translateX(-${startIndex * (144 + 16)}px)`,
                      width: `${relatedSets.length * (144 + 16)}px`
                    }}
                  >
                    {relatedSets.map((set) => {
                    const isSelected = set.code.toLowerCase() === selectedSubSet.toLowerCase();
                    
                    return (
                      <button
                        key={set.id}
                        onClick={() => setSelectedSubSet(set.code)}
                        className={`flex-shrink-0 text-center space-y-2 p-4 rounded-lg transition-all w-36 h-32 bg-transparent hover:bg-gray-900`}
                      >
                        {/* Set Icon */}
                        <div className="flex justify-center">
                          <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center">
                            {set.icon_svg_uri ? (
                              <img 
                                src={set.icon_svg_uri} 
                                alt={set.name}
                                className={`w-12 h-12 ${isSelected ? 'invert' : 'invert opacity-50'}`}
                              />
                            ) : (
                              <div className="w-12 h-12 bg-gray-600 rounded-lg flex items-center justify-center">
                                <span className={`font-bold text-lg ${
                                  isSelected ? 'text-white' : 'text-gray-500'
                                }`}>
                                  {set.code.substring(0, 2).toUpperCase()}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Set Name */}
                        <div className="min-w-0 max-w-32">
                          <h3 className={`font-semibold text-sm text-center leading-tight ${
                            isSelected ? 'text-white' : 'text-gray-500'
                          }`}>
                            {set.name}
                          </h3>
                        </div>
                      </button>
                    );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}



        {/* Loading State */}
        {cardsLoading && (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p>Loading all cards...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-12">
            <p className="text-red-400 text-lg">
              Error loading cards: {error.message}
            </p>
          </div>
        )}

        {/* Cards Grid */}
        {filteredAndSortedCards.length > 0 && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredAndSortedCards.map((card: MTGCard) => (
              <Link key={card.id} href={`/card/${card.id}`}>
                <Card 
                  className="bg-black border-black cursor-pointer overflow-hidden p-0"
                >
                  <CardContent className="p-0">
                    {(() => {
                      // Handle double-sided cards (they have card_faces instead of image_uris)
                      const imageUrl = card.image_uris?.normal || 
                                     (card as any).card_faces?.[0]?.image_uris?.normal;
                      
                      return imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={card.name}
                          className="w-full h-auto object-cover"
                        />
                      ) : (
                        <div className="aspect-[5/7] bg-gray-800 flex items-center justify-center">
                          <span className="text-gray-400 text-xs text-center p-2">
                            {card.name}
                          </span>
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              </Link>
            ))}
            </div>
          </>
        )}

        {/* No Cards */}
        {cardsData && filteredAndSortedCards.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">
              {cardsData.data.length === 0 
                ? "No cards found in this set."
                : "No cards match the selected filters."
              }
            </p>
          </div>
        )}


      </div>
    </div>
  );
} 