'use client';

import React from 'react';
import type { MTGCard } from '@/lib/types/mtg';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, ExternalLink, Heart, Share2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

interface CardDetailPageClientProps {
  card: MTGCard;
}

export function CardDetailPageClient({ card }: CardDetailPageClientProps) {
  // Get the card image URL
  const imageUrl = card.image_uris?.large || 
                   card.image_uris?.normal || 
                   (card as any).card_faces?.[0]?.image_uris?.large ||
                   (card as any).card_faces?.[0]?.image_uris?.normal;

  // Format the type line
  const formatTypeLine = (typeLine: string) => {
    const parts = typeLine.split(' — ');
    if (parts.length === 2) {
      return { types: parts[0], subtypes: parts[1] };
    }
    return { types: typeLine, subtypes: null };
  };

  const { types, subtypes } = formatTypeLine(card.type_line);

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

  // Format mana cost
  const formatManaCost = (manaCost?: string) => {
    if (!manaCost) return null;
    
    // Simple mana cost formatting - replace symbols with text for now
    return manaCost.replace(/{([^}]+)}/g, '($1)');
  };

  return (
    <div className="text-white min-h-screen">
      <div className="max-w-6xl mx-auto px-8 py-8">
        
        {/* Back Button */}
        <div className="mb-8">
          <Link href="/cards">
            <Button variant="outline" className="bg-gray-800 border-gray-600 text-gray-300 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Cards
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          
          {/* Card Image */}
          <div className="flex justify-center">
            <div className="relative">
              {imageUrl ? (
                <Image
                  src={imageUrl}
                  alt={card.name}
                  width={488}
                  height={680}
                  className="rounded-lg shadow-2xl max-w-full h-auto"
                  priority
                  placeholder="blur"
                  blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyEQZrWjRZeKkt7i4t5JIYU3Yq7KurY4VRYaNh7D0TnXDuTc7YRRGgCooJDZ3Kq0Qdq1TJe0zFZRBbXW0R8bRQeZMJbkdZKuN3Y8aakMdSdZZnaDjJ6aFPTgNvAwzIXE6dGKGwzFhXnMhF2CtNKqnqdGhztBmMOZdPQIIxnZvnJKnWg4Iw/6KzJXNPNPKfOYtAj4zNXhvhyaD5NJHQ/qHRUF4Rg6KxX8PF2Pd/TTgRQ7/8A8WN1Py8OHjvuGKohtSWQ7wOvHfhTdVVVSVTClKZqRCT0g+t+W9vy8t7YUlGJI5n7V0hRSnXPlO3lUGzAYsXD7LjHfMNGhGYVFo+6H4Z3WH4wLy3+/cEHLMpSuLKUfONW3LHW3WmKKgqUPl9Z6jYRQEa0VTyT7OKnLu9HDjIgU0ZKvq3KqzLbbbgVZ0OKY1IfHWNJO9qsCtYlCRaZKjZOKhTJZP5ZMRuKpfhpbYpQvTLYzZ5ZKuNPP/Z"
                />
              ) : (
                <div className="w-96 h-[560px] bg-gray-800 rounded-lg flex items-center justify-center">
                  <span className="text-gray-400 text-center p-4">
                    {card.name}
                  </span>
                </div>
              )}
              
              {/* Action buttons overlay */}
              <div className="absolute top-4 right-4 flex flex-col space-y-2">
                <Button size="icon" variant="outline" className="bg-black/50 border-gray-600 hover:bg-black/70">
                  <Heart className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="outline" className="bg-black/50 border-gray-600 hover:bg-black/70">
                  <Share2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Card Details */}
          <div className="space-y-6">
            
            {/* Card Name and Mana Cost */}
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">{card.name}</h1>
              {card.mana_cost && (
                <p className="text-xl text-gray-300 font-mono">
                  {formatManaCost(card.mana_cost)}
                </p>
              )}
            </div>

            {/* Type Line */}
            <div>
              <h3 className="text-lg font-semibold text-gray-300 mb-2">Type</h3>
              <div className="space-y-1">
                <p className="text-white">{types}</p>
                {subtypes && (
                  <p className="text-gray-400 text-sm">— {subtypes}</p>
                )}
              </div>
            </div>

            {/* Oracle Text */}
            {card.oracle_text && (
              <div>
                <h3 className="text-lg font-semibold text-gray-300 mb-2">Oracle Text</h3>
                <div className="bg-gray-800 rounded-lg p-4">
                  <p className="text-white whitespace-pre-line leading-relaxed">
                    {card.oracle_text}
                  </p>
                </div>
              </div>
            )}

            {/* Power/Toughness */}
            {(card.power || card.toughness) && (
              <div>
                <h3 className="text-lg font-semibold text-gray-300 mb-2">Power / Toughness</h3>
                <p className="text-white text-xl font-mono">
                  {card.power || '—'} / {card.toughness || '—'}
                </p>
              </div>
            )}

            {/* Set Information */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-300 mb-2">Set</h3>
                <Link href={`/cards/${card.set.toLowerCase()}`}>
                  <p className="text-blue-400 hover:text-blue-300 cursor-pointer">
                    {card.set_name}
                  </p>
                </Link>
                <p className="text-gray-400 text-sm">
                  {card.set.toUpperCase()} #{card.collector_number}
                </p>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-gray-300 mb-2">Rarity</h3>
                <p className={`capitalize font-semibold ${getRarityColor(card.rarity)}`}>
                  {card.rarity}
                </p>
              </div>
            </div>

            {/* Artist */}
            {card.artist && (
              <div>
                <h3 className="text-lg font-semibold text-gray-300 mb-2">Artist</h3>
                <p className="text-white">{card.artist}</p>
              </div>
            )}

            {/* Flavor Text */}
            {card.flavor_text && (
              <div>
                <h3 className="text-lg font-semibold text-gray-300 mb-2">Flavor Text</h3>
                <div className="bg-gray-800 rounded-lg p-4">
                  <p className="text-gray-300 italic leading-relaxed">
                    {card.flavor_text}
                  </p>
                </div>
              </div>
            )}

            {/* Prices */}
            {(card.prices.usd || card.prices.usd_foil) && (
              <div>
                <h3 className="text-lg font-semibold text-gray-300 mb-2">Prices</h3>
                <div className="grid grid-cols-2 gap-4">
                  {card.prices.usd && (
                    <div className="bg-gray-800 rounded-lg p-3">
                      <p className="text-gray-400 text-sm">Regular</p>
                      <p className="text-green-400 font-semibold">${card.prices.usd}</p>
                    </div>
                  )}
                  {card.prices.usd_foil && (
                    <div className="bg-gray-800 rounded-lg p-3">
                      <p className="text-gray-400 text-sm">Foil</p>
                      <p className="text-green-400 font-semibold">${card.prices.usd_foil}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* External Links */}
            <div className="flex space-x-4">
              {card.related_uris.gatherer && (
                <Button variant="outline" asChild className="bg-gray-800 border-gray-600 text-gray-300 hover:text-white">
                  <a href={card.related_uris.gatherer} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Gatherer
                  </a>
                </Button>
              )}
              {card.related_uris.edhrec && (
                <Button variant="outline" asChild className="bg-gray-800 border-gray-600 text-gray-300 hover:text-white">
                  <a href={card.related_uris.edhrec} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    EDHREC
                  </a>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 