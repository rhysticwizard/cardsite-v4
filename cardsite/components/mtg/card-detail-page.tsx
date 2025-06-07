'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getCardById } from '@/lib/api/scryfall';
import type { MTGCard } from '@/lib/types/mtg';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Heart, MessageCircle, Share2 } from 'lucide-react';
import Link from 'next/link';

interface CardDetailPageProps {
  cardId: string;
}

export function CardDetailPage({ cardId }: CardDetailPageProps) {
  const { data: card, isLoading, error } = useQuery({
    queryKey: ['card', cardId],
    queryFn: () => getCardById(cardId),
    staleTime: 1000 * 60 * 30, // 30 minutes
  });

  if (isLoading) {
    return (
      <div className="text-white min-h-screen">
        <div className="max-w-6xl mx-auto px-8 py-12">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p>Loading card...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !card) {
    return (
      <div className="text-white min-h-screen">
        <div className="max-w-6xl mx-auto px-8 py-12">
          <div className="text-center">
            <p className="text-gray-400 text-lg">Card not found</p>
            <Link href="/cards">
              <Button variant="outline" className="mt-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Cards
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

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

  // Format mana cost
  const formatManaSymbols = (manaCost?: string) => {
    if (!manaCost) return null;
    
    // Simple implementation - you might want to use actual mana symbol images
    return manaCost.replace(/[{}]/g, '');
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

  return (
    <div className="text-white min-h-screen bg-black">
      <div className="max-w-6xl mx-auto px-8 py-8">
        
        {/* Navigation */}
        <div className="mb-6 flex items-center space-x-4 text-gray-400 text-sm">
          <Link href="/cards" className="hover:text-white">All Sets</Link>
          <span>•</span>
          <Link href={`/cards/${card.set.toLowerCase()}`} className="hover:text-white">
            {card.set_name}
          </Link>
          <span>•</span>
          <span className="text-white font-medium">{card.name}</span>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          
          {/* Left Side - Card Image */}
          <div className="flex justify-center">
            <div className="max-w-md">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={card.name}
                  className="w-full h-auto rounded-lg shadow-2xl"
                />
              ) : (
                <div className="aspect-[5/7] bg-gray-800 rounded-lg flex items-center justify-center">
                  <span className="text-gray-400 text-center p-4">
                    {card.name}
                  </span>
                </div>
              )}
              
              {/* Social Actions */}
              <div className="flex items-center justify-center space-x-6 mt-6">
                <button className="flex items-center space-x-1 text-gray-400 hover:text-white">
                  <Heart className="w-5 h-5" />
                  <span className="text-sm">0</span>
                </button>
                <button className="flex items-center space-x-1 text-gray-400 hover:text-white">
                  <MessageCircle className="w-5 h-5" />
                  <span className="text-sm">0</span>
                </button>
                <button className="text-gray-400 hover:text-white">
                  <Share2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Right Side - Card Details */}
          <div className="space-y-6">
            
            {/* Card Title */}
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">
                {card.name}
              </h1>
              <div className="flex items-center space-x-4 text-lg">
                <span className="text-gray-300">{types}</span>
                {subtypes && (
                  <>
                    <span className="text-gray-500">—</span>
                    <span className="text-gray-300">{subtypes}</span>
                  </>
                )}
                <span className={`capitalize font-medium ${getRarityColor(card.rarity)}`}>
                  {card.rarity}
                </span>
                {(card.power && card.toughness) && (
                  <span className="text-gray-300 font-mono">
                    {card.power}/{card.toughness}
                  </span>
                )}
              </div>
            </div>

            {/* Set Information */}
            <div className="grid grid-cols-3 gap-6 text-sm">
              <div>
                <span className="text-gray-500">Set:</span>
                <div className="text-blue-400 hover:text-blue-300">
                  <Link href={`/cards/${card.set.toLowerCase()}`}>
                    {card.set_name}
                  </Link>
                </div>
              </div>
              <div>
                <span className="text-gray-500">Number:</span>
                <div className="text-white">{card.collector_number}</div>
              </div>
              <div>
                <span className="text-gray-500">Artist:</span>
                <div className="text-white">{card.artist || 'Unknown'}</div>
              </div>
            </div>

            {/* Card Text */}
            <div className="space-y-4">
              {card.mana_cost && (
                <div>
                  <span className="text-gray-500 text-sm block mb-1">Mana Cost:</span>
                  <div className="text-white font-mono text-lg">
                    {formatManaSymbols(card.mana_cost)}
                  </div>
                </div>
              )}
              
              {card.oracle_text && (
                <div>
                  <div className="text-white leading-relaxed">
                    {card.oracle_text.split('\n').map((line, index) => (
                      <p key={index} className="mb-2">
                        {line}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Flavor Text */}
            {card.flavor_text && (
              <div className="border-l-4 border-gray-600 pl-4">
                <p className="text-gray-400 italic leading-relaxed">
                  {card.flavor_text}
                </p>
              </div>
            )}

            {/* Price Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Market Prices</h3>
              <div className="flex space-x-6">
                {card.prices.usd && (
                  <div className="text-center">
                    <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm mb-2">
                      TCG
                    </div>
                    <div className="text-white font-medium">${card.prices.usd}</div>
                  </div>
                )}
                
                {card.purchase_uris?.cardmarket && card.prices.eur && (
                  <div className="text-center">
                    <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center text-white font-bold text-sm mb-2">
                      CK
                    </div>
                    <div className="text-white font-medium">€{card.prices.eur}</div>
                  </div>
                )}
                
                {card.purchase_uris?.cardhoarder && card.prices.tix && (
                  <div className="text-center">
                    <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center text-white font-bold text-sm mb-2">
                      CM
                    </div>
                    <div className="text-white font-medium">{card.prices.tix} tix</div>
                  </div>
                )}
              </div>
            </div>

            {/* Legality */}
            {Object.keys(card.legalities).length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Format Legality</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                                     {Object.entries(card.legalities).map(([format, legality]) => {
                     const legalityString = legality as string;
                     if (legalityString === 'not_legal') return null;
                     
                     const statusColor = legalityString === 'legal' ? 'text-green-400' : 
                                        legalityString === 'banned' ? 'text-red-400' : 'text-yellow-400';
                    
                    return (
                      <div key={format} className="flex justify-between">
                        <span className="text-gray-300 capitalize">
                          {format.replace('_', ' ')}
                        </span>
                                                 <span className={statusColor + ' capitalize'}>
                           {legalityString.replace('_', ' ')}
                         </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 