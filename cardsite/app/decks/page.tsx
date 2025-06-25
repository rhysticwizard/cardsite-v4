import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Users, Crown, Flame } from 'lucide-react';
import Link from 'next/link';
import { UserDecksDisplay } from '@/components/mtg/user-decks-display';

export default function DecksPage() {
  const topStandardDecks = Array(8).fill(null);
  const trendingCommanderDecks = Array(4).fill(null);
  const popularThemeDecks = Array(4).fill(null);

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto px-6 py-8">
        
        {/* Your Decks Section */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-800">
            <div className="flex items-center space-x-3">
              <Users className="w-6 h-6" />
              <h2 className="text-2xl font-bold">Your Decks</h2>
            </div>
            <div className="flex items-center space-x-6">
              <Link href="/decks?view=all" className="text-gray-400 hover:text-white transition-colors text-sm">
                View all →
              </Link>
              <Link href="/deckbuilder">
              <Button className="bg-white text-black hover:bg-gray-200 transition-colors px-4 py-2 text-sm font-medium">
                <Plus className="w-4 h-4 mr-2" />
                Create New Deck
              </Button>
              </Link>
            </div>
          </div>
          
          <UserDecksDisplay />
        </div>

        {/* Top 8 Standard Decks */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-800">
            <div className="flex items-center space-x-3">
              <Crown className="w-6 h-6" />
              <h2 className="text-2xl font-bold">Top 8 Standard Decks</h2>
            </div>
            <Link href="/decks/standard" className="text-gray-400 hover:text-white transition-colors text-sm">
              View more →
            </Link>
          </div>
          
          <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-12 gap-2">
            {topStandardDecks.map((_, index) => (
              <Card key={index} className="bg-gray-900 border-gray-800 overflow-hidden cursor-pointer hover:border-gray-700 transition-colors w-16 h-16">
              </Card>
            ))}
          </div>
        </div>

        {/* Trending Commander Decks */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-800">
            <div className="flex items-center space-x-3">
              <Flame className="w-6 h-6" />
              <h2 className="text-2xl font-bold">Trending Commander Decks</h2>
            </div>
            <Link href="/decks/commander" className="text-gray-400 hover:text-white transition-colors text-sm">
              View more →
            </Link>
          </div>
          
          <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-12 gap-2">
            {trendingCommanderDecks.map((_, index) => (
              <Card key={index} className="bg-gray-900 border-gray-800 overflow-hidden cursor-pointer hover:border-gray-700 transition-colors w-16 h-16">
              </Card>
            ))}
          </div>
        </div>

        {/* Popular Theme Decks */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-800">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">🎭</span>
              <h2 className="text-2xl font-bold">Popular Theme Decks</h2>
            </div>
            <Link href="/decks/themes" className="text-gray-400 hover:text-white transition-colors text-sm">
              View more →
            </Link>
          </div>
          
          <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-12 gap-2">
            {popularThemeDecks.map((_, index) => (
              <Card key={index} className="bg-gray-900 border-gray-800 overflow-hidden cursor-pointer hover:border-gray-700 transition-colors w-16 h-16">
              </Card>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
} 