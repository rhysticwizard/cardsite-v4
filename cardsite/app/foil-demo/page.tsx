'use client';

import React, { useState, Suspense } from 'react';
import { FoilCard3D } from '@/components/mtg/foil-card-3d';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// Sample cards for testing
const sampleCards = [
  {
    id: 'sample-1',
    oracle_id: '',
    name: 'Lightning Bolt',
    mana_cost: '{R}',
    cmc: 1,
    type_line: 'Instant',
    oracle_text: 'Lightning Bolt deals 3 damage to any target.',
    colors: ['R'],
    color_identity: ['R'],
    keywords: [],
    legalities: {},
    games: [],
    reserved: false,
    foil: true,
    nonfoil: true,
    finishes: ['foil'],
    oversized: false,
    promo: false,
    reprint: false,
    variation: false,
    set_id: '',
    set: 'lea',
    set_name: 'Limited Edition Alpha',
    set_type: 'core',
    set_uri: '',
    set_search_uri: '',
    scryfall_set_uri: '',
    rulings_uri: '',
    prints_search_uri: '',
    collector_number: '161',
    digital: false,
    rarity: 'common',
    card_back_id: '',
    artist_ids: [],
    border_color: 'black',
    frame: '1993',
    full_art: false,
    textless: false,
    booster: true,
    story_spotlight: false,
    image_uris: {
      small: 'https://cards.scryfall.io/small/front/c/e/ce711943-c1a1-43a0-8b89-8d169cfb8e06.jpg',
      normal: 'https://cards.scryfall.io/normal/front/c/e/ce711943-c1a1-43a0-8b89-8d169cfb8e06.jpg',
      large: 'https://cards.scryfall.io/large/front/c/e/ce711943-c1a1-43a0-8b89-8d169cfb8e06.jpg',
      png: 'https://cards.scryfall.io/png/front/c/e/ce711943-c1a1-43a0-8b89-8d169cfb8e06.png',
      art_crop: 'https://cards.scryfall.io/art_crop/front/c/e/ce711943-c1a1-43a0-8b89-8d169cfb8e06.jpg',
      border_crop: 'https://cards.scryfall.io/border_crop/front/c/e/ce711943-c1a1-43a0-8b89-8d169cfb8e06.jpg',
    },
    prices: {},
    related_uris: {},
  },
  {
    id: 'sample-2',
    oracle_id: '',
    name: 'Black Lotus',
    mana_cost: '{0}',
    cmc: 0,
    type_line: 'Artifact',
    oracle_text: '{T}, Sacrifice Black Lotus: Add three mana of any one color.',
    colors: [],
    color_identity: [],
    keywords: [],
    legalities: {},
    games: [],
    reserved: true,
    foil: false,
    nonfoil: true,
    finishes: [],
    oversized: false,
    promo: false,
    reprint: false,
    variation: false,
    set_id: '',
    set: 'lea',
    set_name: 'Limited Edition Alpha',
    set_type: 'core',
    set_uri: '',
    set_search_uri: '',
    scryfall_set_uri: '',
    rulings_uri: '',
    prints_search_uri: '',
    collector_number: '232',
    digital: false,
    rarity: 'rare',
    card_back_id: '',
    artist_ids: [],
    border_color: 'black',
    frame: '1993',
    full_art: false,
    textless: false,
    booster: true,
    story_spotlight: false,
    image_uris: {
      small: 'https://cards.scryfall.io/small/front/b/d/bd8fa327-dd41-4737-8f19-2cf5eb1f7cdd.jpg',
      normal: 'https://cards.scryfall.io/normal/front/b/d/bd8fa327-dd41-4737-8f19-2cf5eb1f7cdd.jpg',
      large: 'https://cards.scryfall.io/large/front/b/d/bd8fa327-dd41-4737-8f19-2cf5eb1f7cdd.jpg',
      png: 'https://cards.scryfall.io/png/front/b/d/bd8fa327-dd41-4737-8f19-2cf5eb1f7cdd.png',
      art_crop: 'https://cards.scryfall.io/art_crop/front/b/d/bd8fa327-dd41-4737-8f19-2cf5eb1f7cdd.jpg',
      border_crop: 'https://cards.scryfall.io/border_crop/front/b/d/bd8fa327-dd41-4737-8f19-2cf5eb1f7cdd.jpg',
    },
    prices: {},
    related_uris: {},
  },
  {
    id: 'sample-3',
    oracle_id: '',
    name: 'Serra Angel',
    mana_cost: '{3}{W}{W}',
    cmc: 5,
    type_line: 'Creature — Angel',
    oracle_text: 'Flying, vigilance',
    power: '4',
    toughness: '4',
    colors: ['W'],
    color_identity: ['W'],
    keywords: ['Flying', 'Vigilance'],
    legalities: {},
    games: [],
    reserved: false,
    foil: true,
    nonfoil: true,
    finishes: ['foil'],
    oversized: false,
    promo: false,
    reprint: false,
    variation: false,
    set_id: '',
    set: 'lea',
    set_name: 'Limited Edition Alpha',
    set_type: 'core',
    set_uri: '',
    set_search_uri: '',
    scryfall_set_uri: '',
    rulings_uri: '',
    prints_search_uri: '',
    collector_number: '044',
    digital: false,
    rarity: 'uncommon',
    card_back_id: '',
    artist_ids: [],
    border_color: 'black',
    frame: '1993',
    full_art: false,
    textless: false,
    booster: true,
    story_spotlight: false,
    image_uris: {
      small: 'https://cards.scryfall.io/small/front/9/f/9fcc3c57-faf0-42e5-b862-c7d43ab6e8a1.jpg',
      normal: 'https://cards.scryfall.io/normal/front/9/f/9fcc3c57-faf0-42e5-b862-c7d43ab6e8a1.jpg',
      large: 'https://cards.scryfall.io/large/front/9/f/9fcc3c57-faf0-42e5-b862-c7d43ab6e8a1.jpg',
      png: 'https://cards.scryfall.io/png/front/9/f/9fcc3c57-faf0-42e5-b862-c7d43ab6e8a1.png',
      art_crop: 'https://cards.scryfall.io/art_crop/front/9/f/9fcc3c57-faf0-42e5-b862-c7d43ab6e8a1.jpg',
      border_crop: 'https://cards.scryfall.io/border_crop/front/9/f/9fcc3c57-faf0-42e5-b862-c7d43ab6e8a1.jpg',
    },
    prices: {},
    related_uris: {},
  }
];

function CardLoader() {
  return (
    <div className="w-60 h-84 bg-gray-800 rounded-lg flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
    </div>
  );
}

export default function FoilDemo() {
  const [selectedCard, setSelectedCard] = useState(sampleCards[0]);
  const [showControls, setShowControls] = useState(true);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">WebGL Foil Card Demo</h1>
          <p className="text-gray-300">Experience the magic of holographic trading cards</p>
        </div>

        {/* Controls */}
        {showControls && (
          <Card className="bg-gray-800/50 border-gray-700 mb-8">
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Card Selection</h2>
              <div className="flex flex-wrap gap-4">
                {sampleCards.map((card) => (
                  <Button
                    key={card.id}
                    variant={selectedCard.id === card.id ? "default" : "outline"}
                    onClick={() => setSelectedCard(card)}
                    className="text-sm"
                  >
                    {card.name}
                  </Button>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-600">
                <p className="text-gray-400 text-sm">
                  <strong>3D Instructions:</strong> Move your mouse around the card to see it tilt in 3D space! 
                  The foil effects now respond to real perspective changes and viewing angles.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Demo */}
        <div className="flex flex-col lg:flex-row gap-8 items-center justify-center">
          {/* Foil Card Display */}
          <div className="flex-1 flex justify-center">
            <Suspense fallback={<CardLoader />}>
              <FoilCard3D
                card={{
                  name: selectedCard.name,
                  imageUrl: selectedCard.image_uris?.normal
                }}
                width={300}
                height={420}
                className="shadow-2xl transition-all duration-300 cursor-pointer"
                onCardClick={() => {
                  console.log('3D Foil card clicked:', selectedCard.name);
                }}
              />
            </Suspense>
          </div>

          {/* Card Info */}
          <div className="flex-1 max-w-md">
            <Card className="bg-gray-800/50 border-gray-700">
              <CardContent className="p-6">
                <h3 className="text-2xl font-bold text-white mb-4">{selectedCard.name}</h3>
                
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Mana Cost:</span>
                    <span className="text-white font-mono">{selectedCard.mana_cost || 'None'}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-400">Type:</span>
                    <span className="text-white">{selectedCard.type_line}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-400">Rarity:</span>
                    <span className={`capitalize font-semibold ${
                      selectedCard.rarity === 'mythic' ? 'text-orange-400' :
                      selectedCard.rarity === 'rare' ? 'text-yellow-400' :
                      selectedCard.rarity === 'uncommon' ? 'text-gray-300' :
                      'text-gray-400'
                    }`}>
                      {selectedCard.rarity}
                    </span>
                  </div>

                  {selectedCard.power && selectedCard.toughness && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Power/Toughness:</span>
                      <span className="text-white font-mono">
                        {selectedCard.power}/{selectedCard.toughness}
                      </span>
                    </div>
                  )}
                </div>

                {selectedCard.oracle_text && (
                  <div className="mt-4 pt-4 border-t border-gray-600">
                    <p className="text-gray-300 text-sm leading-relaxed">
                      {selectedCard.oracle_text}
                    </p>
                  </div>
                )}

                <div className="mt-6 pt-4 border-t border-gray-600">
                  <h4 className="text-white font-semibold mb-2">3D Foil Effects:</h4>
                  <ul className="text-gray-300 text-xs space-y-1">
                    <li>• Interactive 3D card tilting</li>
                    <li>• Mouse-driven perspective changes</li>
                    <li>• Real-time Fresnel calculations</li>
                    <li>• View-dependent rainbow reflections</li>
                    <li>• 3D world-space glitter positioning</li>
                  </ul>
                  <div className="mt-3 p-2 bg-blue-900/30 rounded text-xs">
                    <strong className="text-blue-300">Try it:</strong> Move your mouse around the card to see true 3D perspective!
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Technical Info */}
        <Card className="bg-gray-800/30 border-gray-700 mt-8">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-white mb-3">Technical Implementation</h3>
            <div className="grid md:grid-cols-2 gap-6 text-sm">
              <div>
                <h4 className="text-white font-medium mb-2">Shader Features:</h4>
                <ul className="text-gray-300 space-y-1">
                  <li>• Custom WebGL fragment shader</li>
                  <li>• HSV to RGB color space conversion</li>
                  <li>• Procedural noise for glitter</li>
                  <li>• Time-based animations</li>
                  <li>• View-direction calculations</li>
                </ul>
              </div>
              <div>
                <h4 className="text-white font-medium mb-2">Performance:</h4>
                <ul className="text-gray-300 space-y-1">
                  <li>• 60fps on modern devices</li>
                  <li>• GPU-accelerated rendering</li>
                  <li>• Optimized texture handling</li>
                  <li>• Efficient shader operations</li>
                  <li>• Low memory footprint</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Toggle Controls Button */}
        <div className="text-center mt-6">
          <Button
            variant="outline"
            onClick={() => setShowControls(!showControls)}
            className="text-sm"
          >
            {showControls ? 'Hide' : 'Show'} Controls
          </Button>
        </div>
      </div>
    </div>
  );
} 