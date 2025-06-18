'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAllSets, getAllCardsFromSet, getCardsFromSet } from '@/lib/api/scryfall';
import type { MTGSet, MTGCard } from '@/lib/types/mtg';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
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
        
        {/* Back Button */}
        <div className="mb-6">
          <Link href="/cards">
            <Button variant="outline" size="sm" className="bg-gray-800 border-gray-600 text-gray-300 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              All Sets
            </Button>
          </Link>
        </div>

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
                <div className="overflow-hidden w-full py-1 px-0" style={{ width: `${5 * 144 + 4 * 16}px`, height: '140px' }}>
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
                        className={`flex-shrink-0 text-center space-y-2 p-4 rounded-lg transition-all w-36 h-28 ${
                          isSelected 
                            ? 'bg-gray-800' 
                            : 'bg-black hover:bg-gray-900'
                        }`}
                      >
                        {/* Set Icon */}
                        <div className="flex justify-center">
                          <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center">
                            {set.icon_svg_uri ? (
                              <img 
                                src={set.icon_svg_uri} 
                                alt={set.name}
                                className="w-12 h-12 invert"
                              />
                            ) : (
                              <div className="w-12 h-12 bg-gray-600 rounded-lg flex items-center justify-center">
                                <span className="text-white font-bold text-lg">
                                  {set.code.substring(0, 2).toUpperCase()}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Set Name */}
                        <div className="min-w-0 max-w-32">
                          <h3 className={`font-semibold text-sm text-center leading-tight ${
                            isSelected ? 'text-blue-400' : 'text-white'
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

        {/* Set Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            {selectedSetInfo?.name || currentSet.name}
          </h1>
          <div className="flex items-center space-x-4 text-gray-400">
            <span>Released: {selectedSetInfo?.released_at ? new Date(selectedSetInfo.released_at).toLocaleDateString() : 'TBA'}</span>
            <span>•</span>
            <span>{selectedSetInfo?.card_count || 0} cards</span>
            <span>•</span>
            <span className="uppercase">{selectedSetInfo?.code}</span>
          </div>
        </div>

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
        {cardsData && cardsData.data.length > 0 && (
          <>
            <div className="mb-4 text-gray-400">
              Showing {cardsData.data.length} of {cardsData.total_cards} cards
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {cardsData.data.map((card: MTGCard) => (
              <Link key={card.id} href={`/card/${card.id}`}>
                <Card 
                  className="bg-black border-black cursor-pointer overflow-hidden"
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
        {cardsData && cardsData.data.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">
              No cards found in this set.
            </p>
          </div>
        )}


      </div>
    </div>
  );
} 