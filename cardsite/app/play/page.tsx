'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Search, Calendar, Filter, ArrowUpDown, Settings, X, Plus, Loader2 } from 'lucide-react';
import { secureApiRequest } from '@/lib/csrf';

interface UserDeck {
  id: string;
  name: string;
  format: string;
  cardCount: number;
  thumbnailImage?: any;
  thumbnailCardName?: string;
}

interface GameRoom {
  id: string;
  title: string;
  format: string;
  players: string;
  host: string;
  tags: string[];
  powerLevel: number | null;
  status: string;
  createdAt: string;
  isParticipant?: boolean;
  isHost?: boolean;
}

// Fetch game rooms from API
async function fetchGameRooms(format?: string): Promise<GameRoom[]> {
  const params = new URLSearchParams();
  if (format) params.append('format', format);
  
  const response = await secureApiRequest(`/api/games/rooms?${params.toString()}`);
  if (!response.ok) {
    throw new Error('Failed to fetch game rooms');
  }
  
  const data = await response.json();
  return data.rooms || [];
}

// Fetch user's decks
async function fetchUserDecks(): Promise<UserDeck[]> {
  const response = await secureApiRequest('/api/decks');
  if (!response.ok) {
    throw new Error('Failed to fetch decks');
  }
  
  const data = await response.json();
  return data.decks || [];
}

// Create a new game room
async function createGameRoom(roomData: {
  name: string;
  format: string;
  maxPlayers: number;
  settings?: any;
}) {
  const response = await secureApiRequest('/api/games/rooms', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(roomData),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create game room');
  }
  
  return response.json();
}

// Create game room and join with deck
async function createAndJoinGameRoom(roomData: {
  name: string;
  format: string;
  maxPlayers: number;
  settings?: any;
}, deckId?: string) {
  // First create the room
  const createResponse = await createGameRoom(roomData);
  
  // Then join it with the selected deck
  if (createResponse.room?.id) {
    await joinGameRoom(createResponse.room.id, deckId);
  }
  
  return createResponse;
}

// Join a game room
async function joinGameRoom(gameId: string, deckId?: string) {
  const response = await secureApiRequest(`/api/games/rooms/${gameId}/join`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ deckId }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to join game room');
  }
  
  return response.json();
}

// Leave a game room
async function leaveGameRoom(gameId: string) {
  const response = await secureApiRequest(`/api/games/rooms/${gameId}/join`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to leave game room');
  }
  
  return response.json();
}

// Clean up abandoned games
async function cleanupGames() {
  const response = await secureApiRequest('/api/games/cleanup', {
    method: 'POST',
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to cleanup games');
  }
  
  return response.json();
}

export default function PlayPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('quickplay');
  const [selectedFormat, setSelectedFormat] = useState<string>('');
  const [showNewGameModal, setShowNewGameModal] = useState(false);
  const [newGameData, setNewGameData] = useState({
    name: '',
    format: 'commander',
    maxPlayers: 4,
    powerLevel: '',
    tags: [] as string[],
  });
  const [showDeckSelectionModal, setShowDeckSelectionModal] = useState(false);
  const [showCreateGameDeckModal, setShowCreateGameDeckModal] = useState(false);
  const [selectedGameToJoin, setSelectedGameToJoin] = useState<string | null>(null);

  // Fetch game rooms - only when user is fully authenticated
  const { 
    data: gameRooms = [], 
    isLoading, 
    error,
    refetch 
  } = useQuery({
    queryKey: ['game-rooms', selectedFormat],
    queryFn: () => fetchGameRooms(selectedFormat || undefined),
    enabled: !!session?.user && session.user.id !== undefined, // Ensure session is fully loaded
    refetchInterval: 5000, // Refresh every 5 seconds
    retry: (failureCount, error) => {
      // Retry up to 3 times for authentication errors
      if (error.message.includes('Failed to fetch') && failureCount < 3) {
        return true;
      }
      return false;
    },
    retryDelay: 1000, // Wait 1 second between retries
  });

  // Fetch user's decks
  const { 
    data: userDecks = [], 
    isLoading: decksLoading 
  } = useQuery({
    queryKey: ['user-decks'],
    queryFn: fetchUserDecks,
    enabled: !!session?.user && session.user.id !== undefined,
  });

  // Get current game (if any)
  const currentGame = gameRooms.find(game => game.isParticipant);
  const hasCurrentGame = !!currentGame;

  // Auto-cleanup on page load
  useEffect(() => {
    if (session?.user?.id) {
      // Run cleanup silently in the background
      cleanupGames().catch(console.error);
    }
  }, [session?.user?.id]);

  // Create game room mutation (with deck selection)
  const createGameMutation = useMutation({
    mutationFn: ({ roomData, deckId }: { roomData: any, deckId?: string }) => 
      createAndJoinGameRoom(roomData, deckId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['game-rooms'] });
      setShowNewGameModal(false);
      setShowCreateGameDeckModal(false);
      // Navigate to the new game room
      router.push(`/game/${data.room.id}`);
    },
    onError: (error: Error) => {
      if (error.message.includes('only be in one game at a time')) {
        alert(`You can only be in one game at a time. Please leave your current game first.`);
      } else {
        alert(`Failed to create game: ${error.message}`);
      }
    },
  });

  // Join game mutation
  const joinGameMutation = useMutation({
    mutationFn: ({ gameId, deckId }: { gameId: string, deckId?: string }) => 
      joinGameRoom(gameId, deckId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['game-rooms'] });
      // Navigate to the game room
      router.push(`/game/${data.gameId}`);
    },
    onError: (error: Error) => {
      if (error.message.includes('only be in one game at a time')) {
        alert(`You can only be in one game at a time. Please leave your current game first.`);
      } else {
        alert(`Failed to join game: ${error.message}`);
      }
    },
  });

  // Leave game mutation
  const leaveGameMutation = useMutation({
    mutationFn: (gameId: string) => leaveGameRoom(gameId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['game-rooms'] });
    },
    onError: (error: Error) => {
      alert(`Failed to leave game: ${error.message}`);
    },
  });

  // Cleanup games mutation
  const cleanupMutation = useMutation({
    mutationFn: cleanupGames,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['game-rooms'] });
      if (data.cleanedCount > 0) {
        alert(`Cleaned up ${data.cleanedCount} abandoned games`);
      } else {
        alert('No abandoned games found to clean up');
      }
    },
    onError: (error: Error) => {
      alert(`Failed to cleanup games: ${error.message}`);
    },
  });

  const handleCreateGame = () => {
    if (!newGameData.name.trim()) {
      alert('Please enter a game name');
      return;
    }
    
    // Show deck selection modal instead of creating immediately
    setShowNewGameModal(false);
    setShowCreateGameDeckModal(true);
  };

  const handleCreateGameWithDeck = (deckId?: string) => {
    const settings: any = {};
    if (newGameData.powerLevel) {
      settings.powerLevel = parseInt(newGameData.powerLevel);
    }
    if (newGameData.tags.length > 0) {
      settings.tags = newGameData.tags;
    }

    const roomData = {
      name: newGameData.name.trim(),
      format: newGameData.format,
      maxPlayers: newGameData.maxPlayers,
      settings,
    };

    createGameMutation.mutate({ roomData, deckId });
  };

  const handleJoinGame = (gameId: string) => {
    setSelectedGameToJoin(gameId);
    setShowDeckSelectionModal(true);
  };

  const handleJoinWithDeck = (deckId: string) => {
    if (selectedGameToJoin) {
      joinGameMutation.mutate({ gameId: selectedGameToJoin, deckId });
      setShowDeckSelectionModal(false);
      setSelectedGameToJoin(null);
    }
  };

  const handleJoinWithoutDeck = () => {
    if (selectedGameToJoin) {
      joinGameMutation.mutate({ gameId: selectedGameToJoin });
      setShowDeckSelectionModal(false);
      setSelectedGameToJoin(null);
    }
  };

  const handleLeaveGame = (gameId: string) => {
    if (confirm('Are you sure you want to leave this game?')) {
      leaveGameMutation.mutate(gameId);
    }
  };

  const handleEnterGame = (gameId: string) => {
    router.push(`/game/${gameId}`);
  };

  if (!session?.user) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-20 text-center">
        <h2 className="text-2xl font-bold text-white mb-4">Sign In Required</h2>
        <p className="text-gray-400">
          You need to be signed in to view and join game rooms.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-6xl mx-auto px-6 pb-8">
        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Search game rooms..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 pr-16 py-3 bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-gray-500 rounded-lg"
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
              <X className="w-4 h-4 text-gray-400" />
              <Settings className="w-4 h-4 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Header with Year and Controls */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex flex-col">
            <h1 className="text-4xl font-bold text-white">MTG Online</h1>
            {hasCurrentGame && (
              <div className="flex items-center space-x-2 mt-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-green-400 text-sm">
                  Currently in: <span className="text-white font-medium">{currentGame.title}</span>
                </span>
                <Button
                  size="sm"
                  onClick={() => router.push(`/game/${currentGame.id}`)}
                  className="bg-green-600 hover:bg-green-700 text-xs px-2 py-1 h-6"
                >
                  Enter Game
                </Button>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={selectedFormat}
              onChange={(e) => setSelectedFormat(e.target.value)}
              className="bg-gray-800 border-gray-600 text-white rounded px-3 py-2 text-sm"
            >
              <option value="">All Formats</option>
              <option value="commander">Commander</option>
              <option value="modern">Modern</option>
              <option value="standard">Standard</option>
              <option value="legacy">Legacy</option>
              <option value="draft">Draft</option>
            </select>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => refetch()}
              className="bg-gray-800 border-gray-600 text-gray-300 hover:text-white"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Refresh'}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => cleanupMutation.mutate()}
              disabled={cleanupMutation.isPending}
              className="bg-red-900 border-red-600 text-red-300 hover:text-white hover:bg-red-800"
            >
              {cleanupMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Cleanup'}
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
          <Button 
            onClick={() => {
              if (hasCurrentGame) {
                alert(`You can only be in one game at a time. Please leave "${currentGame.title}" first.`);
              } else {
                setShowNewGameModal(true);
              }
            }}
            disabled={hasCurrentGame}
            className={`text-white border-0 ${
              hasCurrentGame 
                ? 'bg-gray-600 hover:bg-gray-600 cursor-not-allowed' 
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            <Plus className="w-4 h-4 mr-2" />
            {hasCurrentGame ? 'Already in Game' : 'New Game'}
          </Button>
        </div>

        {/* Game Lobbies */}
        {activeTab === 'quickplay' && (
          <div className="space-y-4">
            {isLoading ? (
              <div className="text-center py-20">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-400" />
                <p className="text-gray-400">Loading game rooms...</p>
              </div>
            ) : error ? (
              <div className="text-center py-20">
                <p className="text-red-400 mb-4">Failed to load game rooms</p>
                <div className="text-sm text-gray-400 mb-4">
                  <div>Error: {error.message}</div>
                  <div className="mt-2">Session: {session?.user ? '✅ Authenticated' : '❌ Not authenticated'}</div>
                  <div>User ID: {session?.user?.id || 'None'}</div>
                  {error.message.includes('Failed to fetch') && (
                    <div className="mt-2 text-yellow-400">
                      💡 This might be an authentication or CSRF token issue. Try refreshing the page.
                    </div>
                  )}
                </div>
                <div className="space-x-2">
                  <Button onClick={() => refetch()} variant="outline">
                    Try Again
                  </Button>
                  <Button 
                    onClick={() => {
                      console.log('=== DEBUG INFO ===');
                      console.log('Session state:', session);
                      console.log('User ID:', session?.user?.id);
                      console.log('Error:', error);
                      alert('Check console for debug info');
                    }} 
                    variant="outline"
                    size="sm"
                  >
                    Debug Info
                  </Button>
                </div>
              </div>
            ) : gameRooms.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-gray-400 mb-4">No game rooms available</p>
                <Button 
                  onClick={() => {
                    if (hasCurrentGame) {
                      alert(`You can only be in one game at a time. Please leave "${currentGame.title}" first.`);
                    } else {
                      setShowNewGameModal(true);
                    }
                  }}
                  disabled={hasCurrentGame}
                  className={hasCurrentGame ? "bg-gray-600 hover:bg-gray-600" : "bg-green-600 hover:bg-green-700"}
                >
                  {hasCurrentGame ? 'Already in Game' : 'Create the First Game'}
                </Button>
              </div>
            ) : (
              gameRooms
                .filter((game: GameRoom) => 
                  !searchQuery || 
                  game.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  game.host.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((game: GameRoom) => (
                  <div
                    key={game.id}
                    className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 hover:border-gray-700 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-6">
                        {/* Game Format Badge */}
                        <div className="flex flex-col items-center">
                          <span className="text-xs text-gray-400 mb-1">MTG</span>
                          <span className={`text-xs px-2 py-1 rounded font-medium capitalize ${
                            game.format === 'commander' ? 'bg-green-900 text-green-300' :
                            game.format === 'modern' ? 'bg-blue-900 text-blue-300' :
                            game.format === 'draft' ? 'bg-purple-900 text-purple-300' :
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
                              {game.tags.map((tag: string, index: number) => (
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

                      {/* Action Buttons */}
                      <div className="flex-shrink-0 flex space-x-2">
                        {game.isParticipant ? (
                          <>
                            <Button 
                              onClick={() => handleEnterGame(game.id)}
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              Enter Game
                            </Button>
                            <Button 
                              onClick={() => handleLeaveGame(game.id)}
                              disabled={leaveGameMutation.isPending}
                              variant="outline"
                              className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
                            >
                              {leaveGameMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Leave'}
                            </Button>
                          </>
                        ) : game.status === 'Playing' ? (
                          <span className="text-yellow-400 font-medium">Playing...</span>
                        ) : hasCurrentGame ? (
                          <span className="text-gray-500 text-sm">Can't join - already in a game</span>
                        ) : (
                          <Button 
                            onClick={() => handleJoinGame(game.id)}
                            disabled={joinGameMutation.isPending}
                            className="bg-gray-800 hover:bg-gray-700 text-white border border-gray-600"
                          >
                            {joinGameMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Join Game'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
            )}
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

      {/* New Game Modal */}
      <Dialog open={showNewGameModal} onOpenChange={setShowNewGameModal}>
        <DialogContent className="bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Create New Game Room</DialogTitle>
            <DialogDescription className="text-gray-400">
              Set up a new multiplayer game room for other players to join.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Game Name
              </label>
              <Input
                value={newGameData.name}
                onChange={(e) => setNewGameData({ ...newGameData, name: e.target.value })}
                placeholder="Enter game name..."
                className="bg-gray-800 border-gray-600 text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Format
              </label>
              <select
                value={newGameData.format}
                onChange={(e) => setNewGameData({ ...newGameData, format: e.target.value })}
                className="w-full bg-gray-800 border-gray-600 text-white rounded px-3 py-2"
              >
                <option value="commander">Commander</option>
                <option value="modern">Modern</option>
                <option value="standard">Standard</option>
                <option value="legacy">Legacy</option>
                <option value="draft">Draft</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Max Players
              </label>
              <select
                value={newGameData.maxPlayers}
                onChange={(e) => setNewGameData({ ...newGameData, maxPlayers: parseInt(e.target.value) })}
                className="w-full bg-gray-800 border-gray-600 text-white rounded px-3 py-2"
              >
                <option value={2}>2 Players</option>
                <option value={3}>3 Players</option>
                <option value={4}>4 Players</option>
                <option value={6}>6 Players</option>
                <option value={8}>8 Players</option>
              </select>
            </div>
            {newGameData.format === 'commander' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Power Level (Optional)
                </label>
                <select
                  value={newGameData.powerLevel}
                  onChange={(e) => setNewGameData({ ...newGameData, powerLevel: e.target.value })}
                  className="w-full bg-gray-800 border-gray-600 text-white rounded px-3 py-2"
                >
                  <option value="">Not specified</option>
                  <option value="1">1 - Jank/Fun</option>
                  <option value="2">2 - Casual</option>
                  <option value="3">3 - Casual+</option>
                  <option value="4">4 - Focused</option>
                  <option value="5">5 - Focused+</option>
                  <option value="6">6 - Optimized</option>
                  <option value="7">7 - Optimized+</option>
                  <option value="8">8 - High Power</option>
                  <option value="9">9 - cEDH-</option>
                  <option value="10">10 - cEDH</option>
                </select>
              </div>
            )}
            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={() => setShowNewGameModal(false)}
                className="border-gray-600 text-gray-300"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleCreateGame}
                disabled={createGameMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                {createGameMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Game'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Deck Selection Modal */}
      <Dialog open={showDeckSelectionModal} onOpenChange={setShowDeckSelectionModal}>
        <DialogContent className="bg-gray-900 border-gray-700 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">Select a Deck</DialogTitle>
            <DialogDescription className="text-gray-400">
              Choose a deck to bring into the game, or join without a deck.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {decksLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                <span className="ml-2 text-gray-400">Loading your decks...</span>
              </div>
            ) : userDecks.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400 mb-4">You don't have any decks yet.</p>
                <Button 
                  onClick={() => router.push('/deckbuilder')}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Build Your First Deck
                </Button>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto space-y-2">
                {userDecks.map((deck) => (
                  <div
                    key={deck.id}
                    className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-colors cursor-pointer"
                    onClick={() => handleJoinWithDeck(deck.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        {deck.thumbnailImage?.normal && (
                          <img
                            src={deck.thumbnailImage.normal}
                            alt={deck.thumbnailCardName || 'Deck thumbnail'}
                            className="w-12 h-16 object-cover rounded"
                          />
                        )}
                        <div>
                          <h3 className="text-white font-medium">{deck.name}</h3>
                          <div className="flex items-center space-x-2 text-sm">
                            <span className={`px-2 py-1 rounded text-xs capitalize ${
                              deck.format === 'commander' ? 'bg-green-900 text-green-300' :
                              deck.format === 'modern' ? 'bg-blue-900 text-blue-300' :
                              'bg-gray-700 text-gray-300'
                            }`}>
                              {deck.format}
                            </span>
                            <span className="text-gray-400">
                              {deck.cardCount} cards
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Select
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-between items-center pt-4 border-t border-gray-700">
              <Button 
                variant="outline" 
                onClick={handleJoinWithoutDeck}
                className="border-gray-600 text-gray-300"
              >
                Join Without Deck
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowDeckSelectionModal(false)}
                className="border-gray-600 text-gray-300"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Game Deck Selection Modal */}
      <Dialog open={showCreateGameDeckModal} onOpenChange={setShowCreateGameDeckModal}>
        <DialogContent className="bg-gray-900 border-gray-700 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">Select a Deck for Your Game</DialogTitle>
            <DialogDescription className="text-gray-400">
              Choose a deck to bring into your new game room, or create without a deck.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {decksLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                <span className="ml-2 text-gray-400">Loading your decks...</span>
              </div>
            ) : userDecks.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400 mb-4">You don't have any decks yet.</p>
                <Button 
                  onClick={() => router.push('/deckbuilder')}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Build Your First Deck
                </Button>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto space-y-2">
                {userDecks.map((deck) => (
                  <div
                    key={deck.id}
                    className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-colors cursor-pointer"
                    onClick={() => handleCreateGameWithDeck(deck.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        {deck.thumbnailImage?.normal && (
                          <img
                            src={deck.thumbnailImage.normal}
                            alt={deck.thumbnailCardName || 'Deck thumbnail'}
                            className="w-12 h-16 object-cover rounded"
                          />
                        )}
                        <div>
                          <h3 className="text-white font-medium">{deck.name}</h3>
                          <div className="flex items-center space-x-2 text-sm">
                            <span className={`px-2 py-1 rounded text-xs capitalize ${
                              deck.format === 'commander' ? 'bg-green-900 text-green-300' :
                              deck.format === 'modern' ? 'bg-blue-900 text-blue-300' :
                              'bg-gray-700 text-gray-300'
                            }`}>
                              {deck.format}
                            </span>
                            <span className="text-gray-400">
                              {deck.cardCount} cards
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Select
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-between items-center pt-4 border-t border-gray-700">
              <Button 
                variant="outline" 
                onClick={() => handleCreateGameWithDeck()}
                className="border-gray-600 text-gray-300"
              >
                Create Without Deck
              </Button>
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowCreateGameDeckModal(false);
                    setShowNewGameModal(true);
                  }}
                  className="border-gray-600 text-gray-300"
                >
                  Back
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowCreateGameDeckModal(false)}
                  className="border-gray-600 text-gray-300"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
} 