'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Eye, Edit, Share, Play, Download, Calendar, User, Hash, Layers } from 'lucide-react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { secureApiRequest } from '@/lib/csrf';
import Image from 'next/image';

interface DeckCard {
  id: number;
  quantity: number;
  category: string;
  card: {
    id: string;
    scryfallId: string;
    name: string;
    manaCost?: string;
    cmc?: string;
    typeLine: string;
    oracleText?: string;
    power?: string;
    toughness?: string;
    colors?: string[];
    colorIdentity?: string[];
    rarity: string;
    setCode: string;
    setName: string;
    collectorNumber: string;
    imageUris?: Record<string, string>;
    prices?: Record<string, string>;
    legalities?: Record<string, string>;
  };
}

interface DeckDetail {
  id: number;
  name: string;
  description?: string;
  format: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  userId: string;
  cards: Record<string, DeckCard[]>;
  totalCards: number;
}

interface DeckDetailResponse {
  success: boolean;
  deck: DeckDetail;
}

async function fetchDeckDetail(deckId: string): Promise<DeckDetailResponse> {
  const response = await secureApiRequest(`/api/decks/${deckId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch deck details');
  }
  return response.json();
}

interface DeckDetailViewProps {
  deckId: string;
}

export function DeckDetailView({ deckId }: DeckDetailViewProps) {
  const { data: session } = useSession();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  const { data: deckData, isLoading, error } = useQuery({
    queryKey: ['deck-detail', deckId],
    queryFn: () => fetchDeckDetail(deckId),
    enabled: !!session?.user,
  });

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-700 rounded w-64 mb-6"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array(6).fill(null).map((_, i) => (
            <div key={i} className="h-48 bg-gray-800 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 text-xl mb-4">Failed to load deck</div>
        <Link href="/decks">
          <Button variant="outline">← Back to Decks</Button>
        </Link>
      </div>
    );
  }

  if (!deckData?.success || !deckData.deck) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 text-xl mb-4">Deck not found</div>
        <Link href="/decks">
          <Button variant="outline">← Back to Decks</Button>
        </Link>
      </div>
    );
  }

  const deck = deckData.deck;
  const isOwner = session?.user?.id === deck.userId;
  const categories = Object.keys(deck.cards);

  // Get mana curve data
  const manaCurve = Object.values(deck.cards).flat().reduce((curve, deckCard) => {
    const cmc = parseInt(deckCard.card.cmc || '0');
    const cmcKey = cmc >= 7 ? '7+' : cmc.toString();
    curve[cmcKey] = (curve[cmcKey] || 0) + deckCard.quantity;
    return curve;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/decks">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Decks
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white">{deck.name}</h1>
            <div className="flex items-center space-x-4 text-gray-400 text-sm mt-1">
              <div className="flex items-center space-x-1">
                <Layers className="w-4 h-4" />
                <span>{deck.format}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Hash className="w-4 h-4" />
                <span>{deck.totalCards} cards</span>
              </div>
              <div className="flex items-center space-x-1">
                <Calendar className="w-4 h-4" />
                <span>{new Date(deck.updatedAt).toLocaleDateString()}</span>
              </div>
              {deck.isPublic && (
                <Badge variant="secondary">Public</Badge>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm">
            <Eye className="w-4 h-4 mr-2" />
            View
          </Button>
          {isOwner && (
            <Button variant="ghost" size="sm">
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          )}
          <Button variant="ghost" size="sm">
            <Share className="w-4 h-4 mr-2" />
            Share
          </Button>
          <Button variant="ghost" size="sm">
            <Play className="w-4 h-4 mr-2" />
            Playtest
          </Button>
          <Button variant="ghost" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Description */}
      {deck.description && (
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-4">
            <p className="text-gray-300">{deck.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Mana Curve */}
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="p-4">
          <h3 className="text-lg font-semibold text-white mb-3">Mana Curve</h3>
          <div className="flex items-end space-x-2 h-24">
            {['0', '1', '2', '3', '4', '5', '6', '7+'].map(cmc => (
              <div key={cmc} className="flex flex-col items-center">
                <div 
                  className="bg-blue-600 min-w-[20px] rounded-t"
                  style={{ 
                    height: `${Math.max(((manaCurve[cmc] || 0) / Math.max(...Object.values(manaCurve), 1)) * 80, 4)}px` 
                  }}
                ></div>
                <div className="text-xs text-gray-400 mt-1">{cmc}</div>
                <div className="text-xs text-white">{manaCurve[cmc] || 0}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={selectedCategory === null ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedCategory(null)}
        >
          All Categories
        </Button>
        {categories.map(category => (
          <Button
            key={category}
            variant={selectedCategory === category ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(category)}
          >
            {category.charAt(0).toUpperCase() + category.slice(1)} ({deck.cards[category].reduce((sum, c) => sum + c.quantity, 0)})
          </Button>
        ))}
      </div>

      {/* Cards by Category */}
      <div className="space-y-6">
        {categories.map(category => {
          if (selectedCategory && selectedCategory !== category) return null;
          
          const categoryCards = deck.cards[category];
          if (!categoryCards || categoryCards.length === 0) return null;

          return (
            <div key={category}>
              <h3 className="text-xl font-semibold text-white mb-4 capitalize">
                {category} ({categoryCards.reduce((sum, c) => sum + c.quantity, 0)} cards)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {categoryCards.map(deckCard => (
                  <Card key={deckCard.id} className="bg-gray-900 border-gray-800 hover:border-gray-700 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex space-x-3">
                        {/* Card Image */}
                        <div className="flex-shrink-0">
                          {deckCard.card.imageUris?.small ? (
                            <Image
                              src={deckCard.card.imageUris.small}
                              alt={deckCard.card.name}
                              width={60}
                              height={84}
                              className="rounded"
                            />
                          ) : (
                            <div className="w-[60px] h-[84px] bg-gray-700 rounded flex items-center justify-center">
                              <span className="text-xs text-gray-400">No Image</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Card Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-semibold text-white text-sm truncate">
                              {deckCard.card.name}
                            </h4>
                            <Badge variant="outline" className="text-xs">
                              {deckCard.quantity}x
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-400 mb-1">{deckCard.card.typeLine}</p>
                          {deckCard.card.manaCost && (
                            <p className="text-xs text-gray-300 mb-1">{deckCard.card.manaCost}</p>
                          )}
                          <p className="text-xs text-gray-500">{deckCard.card.setName}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
} 