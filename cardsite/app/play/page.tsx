'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Calendar, Filter, ArrowUpDown, Settings, X } from 'lucide-react';

// Mock game data matching the screenshot
const gameLobbies = [
  {
    id: 1,
    title: 'Casual Commander Pod - All Welcome!',
    format: 'Commander',
    players: '3/4 Players',
    host: 'MagicPlayer123',
    tags: ['Casual'],
    powerLevel: 7,
    status: 'Join Game'
  },
  {
    id: 2,
    title: 'Modern Tournament Practice',
    format: 'Modern', 
    players: '1/2 Players',
    host: 'CompetitiveGamer',
    tags: ['Competitive', 'Modern'],
    powerLevel: null,
    status: 'Join Game'
  },
  {
    id: 3,
    title: 'cEDH - High Power Only',
    format: 'Commander',
    players: '2/4 Players', 
    host: 'cEDHPlayer',
    tags: ['cEDH'],
    powerLevel: 10,
    status: 'Join Game'
  },
  {
    id: 4,
    title: 'Foundations Draft Pod',
    format: 'Draft',
    players: '6/8 Players',
    host: 'DraftMaster',
    tags: ['Draft', 'Foundations'],
    powerLevel: null,
    status: 'Starting...'
  },
  {
    id: 5,
    title: 'Beginner Friendly EDH',
    format: 'Commander',
    players: '1/4 Players',
    host: 'TeacherMage',
    tags: ['Beginner', 'Teaching Game'],
    powerLevel: null,
    status: 'Join Game'
  }
];

export default function PlayPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('quickplay');

  return (
    <>
      <div className="max-w-6xl mx-auto px-6 pb-8">
        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Search for a Magic card..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 pr-16 py-3 bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-gray-500 rounded-lg"
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
              <X className="w-4 h-4 text-gray-400" />
              <Settings className="w-4 h-4 text-gray-400" />
              <Search className="w-4 h-4 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Header with Year and Controls */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-white">2025</h1>
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="sm" className="bg-gray-800 border-gray-600 text-gray-300 hover:text-white">
              <Calendar className="w-4 h-4 mr-2" />
              Calendar
            </Button>
            <Button variant="outline" size="sm" className="bg-gray-800 border-gray-600 text-gray-300 hover:text-white">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
            <Button variant="outline" size="sm" className="bg-gray-800 border-gray-600 text-gray-300 hover:text-white">
              <ArrowUpDown className="w-4 h-4 mr-2" />
              Sort
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center justify-between mb-8 border-b border-gray-800">
          <div className="flex space-x-8">
            <Button
              variant="ghost"
              onClick={() => setActiveTab('quickplay')}
              className={`px-0 py-4 border-b-2 transition-colors hover:text-white font-medium ${
                activeTab === 'quickplay'
                  ? 'border-green-500 text-green-400'
                  : 'border-transparent text-gray-400 hover:border-gray-600'
              }`}
            >
              Quick Play
            </Button>
            <Button
              variant="ghost"
              onClick={() => setActiveTab('watch')}
              className={`px-0 py-4 border-b-2 transition-colors hover:text-white font-medium ${
                activeTab === 'watch'
                  ? 'border-green-500 text-green-400'
                  : 'border-transparent text-gray-400 hover:border-gray-600'
              }`}
            >
              Watch
            </Button>
          </div>
          <Button className="bg-gray-800 hover:bg-gray-700 text-white border border-gray-600">
            New Game
          </Button>
        </div>

        {/* Game Lobbies */}
        {activeTab === 'quickplay' && (
          <div className="space-y-4">
            {gameLobbies.map((game) => (
              <div
                key={game.id}
                className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 hover:border-gray-700 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-6">
                    {/* Game Format Badge */}
                    <div className="flex flex-col items-center">
                      <span className="text-xs text-gray-400 mb-1">MTG</span>
                      <span className={`text-xs px-2 py-1 rounded font-medium ${
                        game.format === 'Commander' ? 'bg-green-900 text-green-300' :
                        game.format === 'Modern' ? 'bg-blue-900 text-blue-300' :
                        game.format === 'Draft' ? 'bg-purple-900 text-purple-300' :
                        'bg-gray-800 text-gray-300'
                      }`}>
                        {game.format}
                      </span>
                    </div>

                    {/* Game Details */}
                    <div className="flex-1">
                      <h3 className="text-white font-semibold text-lg mb-2">
                        {game.title}
                      </h3>
                      <div className="flex items-center space-x-4 text-sm">
                        <span className="text-blue-400 font-medium">
                          {game.players}
                        </span>
                        <span className="text-gray-400">
                          Host: <span className="text-white">{game.host}</span>
                        </span>
                        <div className="flex items-center space-x-2">
                          {game.tags.map((tag, index) => (
                            <span
                              key={index}
                              className="bg-gray-800 text-gray-300 px-2 py-1 rounded text-xs"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                        {game.powerLevel && (
                          <span className="text-gray-400 text-xs">
                            Power Level {game.powerLevel}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Join Button */}
                  <div className="flex-shrink-0">
                    {game.status === 'Starting...' ? (
                      <span className="text-yellow-400 font-medium">Starting...</span>
                    ) : (
                      <Button className="bg-gray-800 hover:bg-gray-700 text-white border border-gray-600">
                        Join Game
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Watch Tab Placeholder */}
        {activeTab === 'watch' && (
          <div className="text-center py-20">
            <h2 className="text-2xl font-bold text-white mb-4">Watch Games</h2>
            <p className="text-gray-400">
              Watch live MTG games in progress.
            </p>
          </div>
        )}
      </div>
    </>
  );
} 