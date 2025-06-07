'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { searchCards } from '@/lib/api/scryfall';
import type { MTGCard } from '@/lib/types/mtg';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function CardSearchTest() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearch, setActiveSearch] = useState('Lightning Bolt');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['cards', activeSearch],
    queryFn: () => searchCards({ q: activeSearch }),
    enabled: !!activeSearch,
  });

  const handleSearch = () => {
    if (searchQuery.trim()) {
      setActiveSearch(searchQuery.trim());
    }
  };

  const handleTestSearch = (query: string) => {
    setSearchQuery(query);
    setActiveSearch(query);
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">🧪 Scryfall API Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for MTG cards..."
              className="bg-gray-800 border-gray-600 text-white"
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button onClick={handleSearch} disabled={isLoading}>
              Search
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleTestSearch('Lightning Bolt')}
            >
              Lightning Bolt
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleTestSearch('Black Lotus')}
            >
              Black Lotus
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleTestSearch('format:standard')}
            >
              Standard Cards
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleTestSearch('type:creature color:blue')}
            >
              Blue Creatures
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading && (
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="py-8">
            <div className="text-center text-white">
              <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              Searching cards...
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="bg-red-900 border-red-700">
          <CardContent className="py-4">
            <p className="text-red-200">
              Error: {error instanceof Error ? error.message : 'Unknown error'}
            </p>
          </CardContent>
        </Card>
      )}

      {data && (
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">
              Results ({data.total_cards} cards found)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
              {data.data.slice(0, 12).map((card: MTGCard) => (
                <div
                  key={card.id}
                  className="bg-gray-800 rounded-lg p-4 border border-gray-600"
                >
                  {card.image_uris?.normal && (
                    <img
                      src={card.image_uris.normal}
                      alt={card.name}
                      className="w-full h-48 object-cover rounded mb-2"
                    />
                  )}
                  <h3 className="text-white font-semibold mb-1">{card.name}</h3>
                  <p className="text-gray-300 text-sm mb-1">{card.type_line}</p>
                  <p className="text-gray-400 text-xs">
                    {card.set_name} ({card.set.toUpperCase()})
                  </p>
                  <div className="flex justify-between items-center mt-2">
                    <span className={`text-xs px-2 py-1 rounded ${
                      card.rarity === 'mythic' ? 'bg-orange-600' :
                      card.rarity === 'rare' ? 'bg-yellow-600' :
                      card.rarity === 'uncommon' ? 'bg-gray-600' :
                      'bg-gray-700'
                    }`}>
                      {card.rarity}
                    </span>
                    {card.prices.usd && (
                      <span className="text-green-400 text-sm">
                        ${card.prices.usd}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {data.has_more && (
              <p className="text-gray-400 text-center mt-4">
                ... and {data.total_cards - 12} more cards
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
} 