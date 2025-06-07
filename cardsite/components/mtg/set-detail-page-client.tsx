'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getCardsFromSet } from '@/lib/api/scryfall';
import type { MTGSet, MTGCard, ScryfallSearchResponse } from '@/lib/types/mtg';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

interface SetDetailPageClientProps {
  set: MTGSet;
  initialCards: ScryfallSearchResponse | null;
  setCode: string;
}

export function SetDetailPageClient({ set, initialCards, setCode }: SetDetailPageClientProps) {
  const [currentPage, setCurrentPage] = useState(1);

  // Query for additional pages of cards (only when needed)
  const { data: cardsData } = useQuery({
    queryKey: ['set-cards', setCode, currentPage],
    queryFn: () => getCardsFromSet(setCode, currentPage),
    initialData: currentPage === 1 ? initialCards : undefined,
    staleTime: 1000 * 60 * 30, // 30 minutes
  });

  const formatReleaseDate = (dateString?: string) => {
    if (!dateString) return 'TBA';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'long', 
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

  const upcoming = isUpcoming(set.released_at);
  const daysLeft = getDaysLeft(set.released_at);

  return (
    <div className="text-white min-h-screen">
      <div className="max-w-6xl mx-auto px-8 py-8">
        
        {/* Back Button */}
        <div className="mb-8">
          <Link href="/cards">
            <Button variant="outline" className="bg-gray-800 border-gray-600 text-gray-300 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Sets
            </Button>
          </Link>
        </div>

        {/* Set Header */}
        <div className="text-center mb-12">
          {/* Upcoming Badge */}
          {upcoming && (
            <div className="mb-4">
              <span className="bg-gray-700 text-gray-300 text-sm font-semibold px-4 py-2 rounded-full uppercase tracking-wide">
                Upcoming Set
              </span>
            </div>
          )}
          
          {/* Set Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-32 h-32 bg-black rounded-full flex items-center justify-center">
              {set.icon_svg_uri ? (
                <img 
                  src={set.icon_svg_uri} 
                  alt={set.name}
                  className="w-24 h-24 invert"
                />
              ) : (
                <div className="w-24 h-24 bg-gray-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-3xl">
                    {set.code.substring(0, 2).toUpperCase()}
                  </span>
                </div>
              )}
            </div>
          </div>
          
          {/* Set Name */}
          <h1 className="text-5xl font-bold text-white mb-4">{set.name}</h1>
          
          {/* Set Details */}
          <div className="space-y-2">
            <p className="text-gray-300 text-lg">
              {set.card_count} cards • {set.set_type}
            </p>
            <p className="text-gray-400">
              Released: {formatReleaseDate(set.released_at)}
            </p>
            {daysLeft && daysLeft > 0 && (
              <p className="text-blue-400 font-medium">
                ({daysLeft} days left)
              </p>
            )}
          </div>
        </div>

        {/* Cards Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-6">Cards in this Set</h2>
          
          {/* Cards Count */}
          {cardsData && (
            <p className="text-gray-400 mb-6">
              Showing {cardsData.data.length} of {cardsData.total_cards} cards
            </p>
          )}
        </div>

        {/* Loading State */}
        {!cardsData && (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-400">Loading cards...</p>
          </div>
        )}

        {/* Cards Grid */}
        {cardsData && cardsData.data.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {cardsData.data.map((card: MTGCard) => (
              <Link key={card.id} href={`/card/${card.id}`}>
                <Card 
                  className="bg-black border-black cursor-pointer overflow-hidden hover:border-gray-600 transition-colors"
                >
                  <CardContent className="p-0">
                    {(() => {
                      // Handle double-sided cards (they have card_faces instead of image_uris)
                      const imageUrl = card.image_uris?.normal || 
                                     (card as any).card_faces?.[0]?.image_uris?.normal;
                      
                      return imageUrl ? (
                        <Image
                          src={imageUrl}
                          alt={card.name}
                          width={312}
                          height={445}
                          className="w-full h-auto object-cover"
                          priority={false}
                          placeholder="blur"
                          blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyEQZrWjRZeKkt7i4t5JIYU3Yq7KurY4VRYaNh7D0TnXDuTc7YRRGgCooJDZ3Kq0Qdq1TJe0zFZRBbXW0R8bRQeZMJbkdZKuN3Y8aakMdSdZZnaDjJ6aFPTgNvAwzIXE6dGKGwzFhXnMhF2CtNKqnqdGhztBmMOZdPQIIxnZvnJKnWg4Iw/6KzJXNPNPKfOYtAj4zNXhvhyaD5NJHQ/qHRUF4Rg6KxX8PF2Pd/TTgRQ7/8A8WN1Py8OHjvuGKohtSWQ7wOvHfhTdVVVSVTClKZqRCT0g+t+W9vy8t7YUlGJI5n7V0hRSnXPlO3lUGzAYsXD7LjHfMNGhGYVFo+6H4Z3WH4wLy3+/cEHLMpSuLKUfONW3LHW3WmKKgqUPl9Z6jYRQEa0VTyT7OKnLu9HDjIgU0ZKvq3KqzLbbbgVZ0OKY1IfHWNJO9qsCtYlCRaZKjZOKhTJZP5ZMRuKpfhpbYpQvTLYzZ5ZKuNPP/Z"
                          sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
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
        )}

        {/* No Cards */}
        {cardsData && cardsData.data.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">
              No cards found in this set.
            </p>
          </div>
        )}

        {/* Load More Button (if there are more cards) */}
        {cardsData && cardsData.has_more && (
          <div className="text-center mt-12">
            <Button
              onClick={() => setCurrentPage(prev => prev + 1)}
              variant="outline"
              className="bg-gray-800 border-gray-600 text-gray-300 hover:text-white"
            >
              Load More Cards
            </Button>
          </div>
        )}

        {/* Pagination */}
        {cardsData && cardsData.total_cards > 175 && (
          <div className="flex items-center justify-center space-x-4 mt-8">
            <Button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              variant="outline"
              size="sm"
              className="bg-gray-800 border-gray-600 text-gray-300 hover:text-white disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>
            
            <span className="text-gray-400">
              Page {currentPage}
            </span>
            
            <Button
              onClick={() => setCurrentPage(prev => prev + 1)}
              disabled={!cardsData.has_more}
              variant="outline"
              size="sm"
              className="bg-gray-800 border-gray-600 text-gray-300 hover:text-white disabled:opacity-50"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
} 