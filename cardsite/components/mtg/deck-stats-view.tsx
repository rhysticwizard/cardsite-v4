'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Eye, EyeOff, Filter } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { secureApiRequest } from '@/lib/csrf';
import type { MTGCard } from '@/lib/types/mtg';

interface DeckCard {
  id: string;
  card: {
    id: string;
    scryfallId: string;
    name: string;
    manaCost?: string;
    cmc: number;
    typeLine: string;
    oracleText?: string;
    power?: string;
    toughness?: string;
    colors: string[];
    colorIdentity: string[];
    rarity: string;
    setCode: string;
    setName: string;
    collectorNumber: string;
    imageUris?: any;
    cardFaces?: any;
    prices?: any;
    legalities?: any;
  };
  quantity: number;
  category: string;
}

interface DeckData {
  id: string;
  name: string;
  format: string;
  isPublic: boolean;
  cards: Record<string, DeckCard[]>;
  totalCards: number;
}

interface DeckStatsViewProps {
  deckId: string;
}

// Color mapping for mana symbols
const COLOR_MAP = {
  W: { name: 'White', color: '#FFFBD5', count: 0 },
  U: { name: 'Blue', color: '#0E68AB', count: 0 },
  B: { name: 'Black', color: '#150B00', count: 0 },
  R: { name: 'Red', color: '#D3202A', count: 0 },
  G: { name: 'Green', color: '#00733E', count: 0 },
  C: { name: 'Colorless', color: '#CAC5C0', count: 0 },
};

async function fetchDeck(deckId: string): Promise<DeckData> {
  const response = await secureApiRequest(`/api/decks/${deckId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch deck');
  }
  const data = await response.json();
  if (!data.success) {
    throw new Error('Failed to fetch deck');
  }
  return data.deck;
}

export function DeckStatsView({ deckId }: DeckStatsViewProps) {
  const router = useRouter();
  const [isPublic, setIsPublic] = useState(false);
  const [enabledColors, setEnabledColors] = useState<Set<string>>(new Set(['W', 'U', 'B', 'R', 'G']));
  const [showMulti, setShowMulti] = useState(true);
  const [showColorless, setShowColorless] = useState(true);
  const [showLands, setShowLands] = useState(false);

  const { data: deck, isLoading, error } = useQuery({
    queryKey: ['deck-stats', deckId],
    queryFn: () => fetchDeck(deckId),
    enabled: !!deckId,
  });

  // Calculate statistics
  const stats = useMemo(() => {
    if (!deck?.cards) return null;

    const totalCards = deck.totalCards || 0;
    
    // Flatten all cards from all categories
    const allCards: DeckCard[] = Object.values(deck.cards).flat();
    
    // Count cards by type for display
    let colorlessCount = 0;
    let landCount = 0;
    let multiCount = 0;
    
    // Mana curve calculation with color distribution
    const manaCurve = Array(8).fill(0).map(() => ({
      total: 0,
      W: 0, // White
      U: 0, // Blue
      B: 0, // Black
      R: 0, // Red
      G: 0, // Green
      M: 0, // Multi
      C: 0, // Colorless
      L: 0  // Lands
    }));
    
    allCards.forEach(deckCard => {
      const { card, quantity } = deckCard;
      
      // Categorize the card
      const isLand = card.typeLine.toLowerCase().includes('land');
      const isColored = card.colors && card.colors.length > 0;
      const isMulticolored = card.colors && card.colors.length > 1;
      
      // Count for display
      if (isLand) {
        landCount += quantity;
      } else if (isMulticolored) {
        multiCount += quantity;
      } else if (!isColored) {
        colorlessCount += quantity;
      }
      
      // Check if card should be included based on color filters
      let includeCard = false;
      let colorCategory = '';
      
      if (isLand) {
        includeCard = showLands;
        colorCategory = 'L';
      } else if (isMulticolored) {
        includeCard = showMulti;
        colorCategory = 'M';
      } else if (isColored) {
        includeCard = card.colors.some(color => enabledColors.has(color));
        // For single-colored cards, use the primary color
        colorCategory = card.colors[0] || 'C';
      } else {
        includeCard = showColorless;
        colorCategory = 'C';
      }
      
      if (includeCard) {
        const cmc = card.cmc || 0;
        const index = Math.min(cmc, 7);
        manaCurve[index].total += quantity;
        manaCurve[index][colorCategory as keyof typeof manaCurve[0]] += quantity;
      }
    });

    // Card types breakdown
    const cardTypes = {
      creatures: 0,
      nonCreatures: 0,
      instants: 0,
      sorceries: 0,
      artifacts: 0,
      enchantments: 0,
      planeswalkers: 0,
      lands: 0,
    };

    allCards.forEach(deckCard => {
      const { card, quantity } = deckCard;
      const typeLine = card.typeLine.toLowerCase();
      
      if (typeLine.includes('creature')) {
        cardTypes.creatures += quantity;
      } else {
        cardTypes.nonCreatures += quantity;
      }
      
      if (typeLine.includes('instant')) {
        cardTypes.instants += quantity;
      }
      if (typeLine.includes('sorcery')) {
        cardTypes.sorceries += quantity;
      }
      if (typeLine.includes('artifact')) {
        cardTypes.artifacts += quantity;
      }
      if (typeLine.includes('enchantment')) {
        cardTypes.enchantments += quantity;
      }
      if (typeLine.includes('planeswalker')) {
        cardTypes.planeswalkers += quantity;
      }
      if (typeLine.includes('land')) {
        cardTypes.lands += quantity;
      }
    });

    // Mana costs distribution - properly reset counts
    const manaCosts = {
      W: { name: 'White', color: '#FFFBD5', count: 0 },
      U: { name: 'Blue', color: '#0E68AB', count: 0 },
      B: { name: 'Black', color: '#150B00', count: 0 },
      R: { name: 'Red', color: '#D3202A', count: 0 },
      G: { name: 'Green', color: '#00733E', count: 0 },
      C: { name: 'Colorless', color: '#CAC5C0', count: 0 },
    };
    
    allCards.forEach(deckCard => {
      const { card, quantity } = deckCard;
      if (card.manaCost) {
        const cost = card.manaCost;
        // Count each color symbol
        Object.keys(manaCosts).forEach(color => {
          const regex = new RegExp(`{${color}}`, 'g');
          const matches = cost.match(regex);
          if (matches) {
            manaCosts[color as keyof typeof manaCosts].count += matches.length * quantity;
          }
        });
      }
    });

    // Mana production (lands that produce mana) - properly reset counts
    const manaProduction = {
      W: { name: 'White', color: '#FFFBD5', count: 0 },
      U: { name: 'Blue', color: '#0E68AB', count: 0 },
      B: { name: 'Black', color: '#150B00', count: 0 },
      R: { name: 'Red', color: '#D3202A', count: 0 },
      G: { name: 'Green', color: '#00733E', count: 0 },
      C: { name: 'Colorless', color: '#CAC5C0', count: 0 },
    };
    
    allCards.forEach(deckCard => {
      const { card, quantity } = deckCard;
      if (card.typeLine.toLowerCase().includes('land')) {
        const text = card.oracleText?.toLowerCase() || '';
        Object.keys(manaProduction).forEach(color => {
          const colorName = manaProduction[color as keyof typeof manaProduction].name.toLowerCase();
          if (text.includes(`add {${color}}`) || text.includes(`${colorName} mana`)) {
            manaProduction[color as keyof typeof manaProduction].count += quantity;
          }
        });
      }
    });

    const maxManaValue = Math.max(...manaCurve.map(curve => curve.total));
    const avgManaValue = totalCards > 0 ? manaCurve.reduce((sum, curve, index) => sum + (curve.total * index), 0) / totalCards : 0;

    return {
      totalCards,
      manaCurve,
      maxManaValue,
      avgManaValue,
      cardTypes,
      manaCosts,
      manaProduction,
      multiCount,
      colorlessCount,
      landCount,
    };
  }, [deck, enabledColors, showMulti, showColorless, showLands]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div>Loading deck stats...</div>
      </div>
    );
  }

  if (error || !deck || !stats) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div>Failed to load deck stats</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="text-white hover:text-gray-300"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-white">{deck.name}</h1>
              <p className="text-gray-400">{deck.format} • {stats.totalCards} cards</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsPublic(!isPublic)}
              className="text-white hover:text-gray-300"
            >
              {isPublic ? <Eye className="w-4 h-4 mr-2" /> : <EyeOff className="w-4 h-4 mr-2" />}
              {isPublic ? 'Public' : 'Private'}
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="flex flex-col items-center gap-6 max-w-4xl mx-auto">
          {/* Mana Value */}
          <Card className="bg-black border-black w-full">
            <CardContent className="p-6">
              <div className="mb-12">
                <h3 className="text-white font-semibold">Mana value</h3>
              </div>

              {/* Mana Curve Chart */}
              <div className="mb-6">
                <div className="flex items-end gap-2 h-40 pt-16 relative">
                  {/* Baseline - positioned right under the bars, full width */}
                  <div className="absolute bottom-5 -left-6 -right-6 h-px bg-gray-600"></div>
                  {stats.manaCurve.map((curveData, index) => {
                    const totalCount = curveData.total;
                    const heightPx = stats.maxManaValue > 0 ? (totalCount / stats.maxManaValue) * 160 : 0; // 160px = h-40
                    
                    // Color mapping for visualization - matching pip colors exactly
                    const colorMap = {
                      W: '#ffffff', // White (bg-white)
                      U: '#3b82f6', // Blue (bg-blue-500)
                      B: '#a855f7', // Purple (bg-purple-500)
                      R: '#ef4444', // Red (bg-red-500)
                      G: '#22c55e', // Green (bg-green-500)
                      M: '#eab308', // Yellow (bg-yellow-500)
                      C: '#6b7280', // Gray (bg-gray-500)
                      L: '#374151'  // Dark Gray (bg-gray-700)
                    };
                    
                    return (
                      <div key={index} className="flex flex-col items-center flex-1">
                        <div className="text-white text-sm mb-1">{totalCount}</div>
                        <div 
                          className="w-full rounded-t relative"
                          style={{ 
                            height: totalCount > 0 ? `${Math.max(heightPx, 4)}px` : '2px',
                            opacity: totalCount > 0 ? 1 : 0.3
                          }}
                        >
                          {totalCount > 0 ? (
                            <div className="w-full h-full flex flex-col">
                              {Object.entries(curveData).map(([colorKey, count]) => {
                                if (colorKey === 'total' || count === 0) return null;
                                const percentage = (count / totalCount) * 100;
                                const segmentHeight = (percentage / 100) * heightPx;
                                
                                return (
                                  <div
                                    key={colorKey}
                                    className="w-full"
                                    style={{
                                      height: `${segmentHeight}px`,
                                      backgroundColor: colorMap[colorKey as keyof typeof colorMap],
                                      borderTop: colorKey !== 'W' ? '1px solid rgba(0,0,0,0.2)' : undefined
                                    }}
                                  />
                                );
                              })}
                            </div>
                          ) : (
                            <div className="w-full h-full bg-gray-600 opacity-30 rounded-t" />
                          )}
                        </div>
                        <div className="text-gray-400 text-xs mt-1">
                          {index === 7 ? '7+' : index}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Color info and indicators on same line */}
              <div className="flex items-center justify-between text-sm">
                <div></div>
                <div className="flex items-center gap-4">
                  <div 
                    className={`flex items-center gap-1 cursor-pointer ${!enabledColors.has('W') ? 'opacity-30' : ''}`}
                    onClick={() => setEnabledColors(prev => {
                      const newSet = new Set(prev);
                      if (newSet.has('W')) newSet.delete('W'); else newSet.add('W');
                      return newSet;
                    })}
                  >
                    <div className="w-3 h-3 rounded-full bg-white"></div>
                    <span className="text-gray-400">White {stats.manaCosts.W.count}</span>
                  </div>
                  <div 
                    className={`flex items-center gap-1 cursor-pointer ${!enabledColors.has('U') ? 'opacity-30' : ''}`}
                    onClick={() => setEnabledColors(prev => {
                      const newSet = new Set(prev);
                      if (newSet.has('U')) newSet.delete('U'); else newSet.add('U');
                      return newSet;
                    })}
                  >
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <span className="text-gray-400">Blue {stats.manaCosts.U.count}</span>
                  </div>
                  <div 
                    className={`flex items-center gap-1 cursor-pointer ${!enabledColors.has('B') ? 'opacity-30' : ''}`}
                    onClick={() => setEnabledColors(prev => {
                      const newSet = new Set(prev);
                      if (newSet.has('B')) newSet.delete('B'); else newSet.add('B');
                      return newSet;
                    })}
                  >
                    <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                    <span className="text-gray-400">Black {stats.manaCosts.B.count}</span>
                  </div>
                  <div 
                    className={`flex items-center gap-1 cursor-pointer ${!enabledColors.has('R') ? 'opacity-30' : ''}`}
                    onClick={() => setEnabledColors(prev => {
                      const newSet = new Set(prev);
                      if (newSet.has('R')) newSet.delete('R'); else newSet.add('R');
                      return newSet;
                    })}
                  >
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span className="text-gray-400">Red {stats.manaCosts.R.count}</span>
                  </div>
                  <div 
                    className={`flex items-center gap-1 cursor-pointer ${!enabledColors.has('G') ? 'opacity-30' : ''}`}
                    onClick={() => setEnabledColors(prev => {
                      const newSet = new Set(prev);
                      if (newSet.has('G')) newSet.delete('G'); else newSet.add('G');
                      return newSet;
                    })}
                  >
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="text-gray-400">Green {stats.manaCosts.G.count}</span>
                  </div>
                  <div 
                    className={`flex items-center gap-1 cursor-pointer ${!showMulti ? 'opacity-30' : ''}`}
                    onClick={() => setShowMulti(!showMulti)}
                  >
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <span className="text-gray-400">Multi {stats.multiCount}</span>
                  </div>
                  <div 
                    className={`flex items-center gap-1 cursor-pointer ${!showColorless ? 'opacity-30' : ''}`}
                    onClick={() => setShowColorless(!showColorless)}
                  >
                    <div className="w-3 h-3 rounded border border-gray-400 bg-gray-500"></div>
                    <span className="text-gray-400">Colorless {stats.colorlessCount}</span>
                  </div>
                  <div 
                    className={`flex items-center gap-1 cursor-pointer ${!showLands ? 'opacity-30' : ''}`}
                    onClick={() => setShowLands(!showLands)}
                  >
                    <div className="w-3 h-3 rounded border border-gray-600 bg-gray-700"></div>
                    <span className="text-gray-400">Lands {stats.landCount}</span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-300 hover:text-white border border-transparent hover:border-gray-600 hover:bg-transparent transition-colors"
                >
                  Filter
                  <Filter className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Card Types */}
          <Card className="bg-black border-black w-full">
            <CardContent className="p-6">
              <h3 className="text-white font-semibold mb-4">Card Types</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Creatures</span>
                  <span className="text-white">{stats.cardTypes.creatures}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Non-Creatures</span>
                  <span className="text-white">{stats.cardTypes.nonCreatures}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Instants</span>
                  <span className="text-white">{stats.cardTypes.instants}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Sorceries</span>
                  <span className="text-white">{stats.cardTypes.sorceries}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Artifacts</span>
                  <span className="text-white">{stats.cardTypes.artifacts}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Enchantments</span>
                  <span className="text-white">{stats.cardTypes.enchantments}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Planeswalkers</span>
                  <span className="text-white">{stats.cardTypes.planeswalkers}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Lands</span>
                  <span className="text-white">{stats.cardTypes.lands}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 