'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getCardById, getCardVariants } from '@/lib/api/scryfall';
import type { MTGCard } from '@/lib/types/mtg';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Heart, MessageCircle, Share2, Info, Scale, Copy, MessageSquare } from 'lucide-react';
import { FoilCard3D } from './foil-card-3d';
import Link from 'next/link';

interface CardDetailPageProps {
  cardId: string;
}

export function CardDetailPage({ cardId }: CardDetailPageProps) {
  const [activeTab, setActiveTab] = React.useState<string>('info');
  
  const { data: card, isLoading, error } = useQuery({
    queryKey: ['card', cardId],
    queryFn: () => getCardById(cardId),
    staleTime: 1000 * 60 * 30, // 30 minutes
  });

  // Fetch card printings when printings tab is active
  const { data: printings, isLoading: printingsLoading } = useQuery({
    queryKey: ['card-printings', card?.name],
    queryFn: () => getCardVariants(card!.name),
    enabled: !!card?.name && activeTab === 'printings',
    staleTime: 1000 * 60 * 10, // 10 minutes
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
        <div className="mb-6 flex items-center justify-between text-gray-400 text-sm">
          <div className="flex items-center space-x-4">
            <Link href="/cards" className="hover:text-white">All Sets</Link>
            <span>/</span>
            <Link href={`/cards/${card.set.toLowerCase()}`} className="hover:text-white">
              {card.set_name}
            </Link>
            <span>/</span>
            <span className="text-white font-medium">{card.name}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className={`text-xs bg-transparent hover:bg-gray-800 ${activeTab === 'info' ? 'text-white' : 'text-gray-400'}`}
              onClick={() => setActiveTab('info')}
            >
              Info <Info className="w-3 h-3 ml-1" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className={`text-xs bg-transparent hover:bg-gray-800 ${activeTab === 'legality' ? 'text-white' : 'text-gray-400'}`}
              onClick={() => setActiveTab('legality')}
            >
              Legality <Scale className="w-3 h-3 ml-1" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className={`text-xs bg-transparent hover:bg-gray-800 ${activeTab === 'printings' ? 'text-white' : 'text-gray-400'}`}
              onClick={() => setActiveTab('printings')}
            >
              Printings <Copy className="w-3 h-3 ml-1" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className={`text-xs bg-transparent hover:bg-gray-800 ${activeTab === 'comments' ? 'text-white' : 'text-gray-400'}`}
              onClick={() => setActiveTab('comments')}
            >
              Comments <MessageSquare className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </div>

        {/* Break Line */}
        <hr className="border-gray-600 mb-6" />

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          
          {/* Left Side - Card Image */}
          <div>
              {imageUrl ? (
              <FoilCard3D
                card={{
                  name: card.name,
                  imageUrl: imageUrl
                }}
                width={360}
                height={504}
                />
              ) : (
              <div className="w-[360px] h-[504px] bg-gray-800 rounded-lg flex items-center justify-center">
                  <span className="text-gray-400 text-center p-4">
                    {card.name}
                  </span>
                </div>
              )}
          </div>

          {/* Right Side - Tab Content */}
          <div className="space-y-6">
            {/* Info Tab Content */}
            {activeTab === 'info' && (
              <>
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
              </>
            )}

            {/* Legality Tab Content */}
            {activeTab === 'legality' && Object.keys(card.legalities).length > 0 && (
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

            {/* Printings Tab Content */}
            {activeTab === 'printings' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">All Printings</h3>
                {printingsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                    <p className="text-gray-400">Loading printings...</p>
                  </div>
                ) : printings && printings.data.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4">
                    {printings.data.map((printing) => (
                      <Link key={printing.id} href={`/card/${printing.id}`}>
                        <div className="flex items-center space-x-4 p-3 bg-gray-900 hover:bg-gray-800 rounded-lg transition-colors cursor-pointer">
                          <div className="w-16 h-22 flex-shrink-0">
                            {printing.image_uris?.small ? (
                              <img
                                src={printing.image_uris.small}
                                alt={printing.name}
                                className="w-full h-full object-cover rounded"
                              />
                            ) : (
                              <div className="w-full h-full bg-gray-700 rounded flex items-center justify-center">
                                <span className="text-xs text-gray-400 text-center p-1">
                                  {printing.name}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-white font-medium truncate">{printing.name}</h4>
                            <p className="text-gray-400 text-sm">{printing.set_name}</p>
                            <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
                              <span>{printing.set.toUpperCase()}</span>
                              <span>•</span>
                              <span>#{printing.collector_number}</span>
                              <span>•</span>
                              <span className="capitalize">{printing.rarity}</span>
                            </div>
                          </div>
                          {printing.prices?.usd && (
                            <div className="text-right">
                              <p className="text-white font-medium">${printing.prices.usd}</p>
                              <p className="text-xs text-gray-400">USD</p>
                            </div>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                                 ) : (
                   <p className="text-gray-400 text-center py-8">No other printings found for this card.</p>
                 )}
               </div>
             )}

            {/* Comments Tab Content */}
            {activeTab === 'comments' && (
              <div className="space-y-4">
                {/* Existing Comments */}
                <div className="space-y-1">
                  {/* Sample Comment 1 */}
                  <div className="flex items-start space-x-3 py-2">
                    <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center text-white font-medium text-sm flex-shrink-0">
                      A
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="bg-gray-800 rounded-2xl px-3 py-2">
                        <div className="text-white font-medium text-sm">Anonymous Player</div>
                        <div className="text-gray-300 text-sm">Omg!! This card is so ridiculously powerful!!</div>
                      </div>
                      <div className="flex items-center space-x-4 mt-1 ml-3">
                        <button className="text-xs text-gray-500 hover:text-white">Like</button>
                        <button className="text-xs text-gray-500 hover:text-white">Reply</button>
                        <span className="text-xs text-gray-500">2h</span>
                      </div>
                      {/* Reply */}
                      <div className="flex items-start space-x-2 mt-2 ml-4">
                        <div className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center text-white font-medium text-xs flex-shrink-0">
                          C
                        </div>
                        <div className="flex-1">
                          <div className="bg-gray-800 rounded-2xl px-3 py-2">
                            <div className="text-white font-medium text-sm">CardMaster</div>
                            <div className="text-gray-300 text-sm">replied • 1 Reply</div>
                          </div>
                          <div className="text-xs text-gray-500 mt-1 ml-3">23m</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Sample Comment 2 */}
                  <div className="flex items-start space-x-3 py-2">
                    <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white font-medium text-sm flex-shrink-0">
                      M
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="bg-gray-800 rounded-2xl px-3 py-2">
                        <div className="text-white font-medium text-sm">MythicCollector</div>
                        <div className="text-gray-300 text-sm">Great artwork! Perfect for my space-themed Commander deck.</div>
                      </div>
                      <div className="flex items-center space-x-4 mt-1 ml-3">
                        <button className="text-xs text-gray-500 hover:text-white">Like</button>
                        <button className="text-xs text-gray-500 hover:text-white">Reply</button>
                        <span className="text-xs text-gray-500">1d</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Comment Input */}
                <div className="flex items-start space-x-3 pt-2">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium text-sm flex-shrink-0">
                    Y
                  </div>
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      placeholder="Write a comment..."
                      className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-full text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 pr-20"
                    />
                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
                      <button className="text-gray-400 hover:text-white">
                        <MessageCircle className="w-4 h-4" />
                      </button>
                      <button className="text-gray-400 hover:text-white text-xs">😊</button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 