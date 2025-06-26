'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { DeckSelectionModal, type UserDeck } from '@/components/ui/deck-selection-modal';
import { Search, Calendar, Filter, ArrowUpDown, Settings, X, Plus, Loader2 } from 'lucide-react';
import { secureApiRequest } from '@/lib/csrf';

// UserDeck interface moved to deck-selection-modal.tsx

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
  const [showFormatDropdown, setShowFormatDropdown] = useState(false);
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

  // Fetch game rooms - available to all users for watching
  const { 
    data: gameRooms = [], 
    isLoading, 
    error,
    refetch 
  } = useQuery({
    queryKey: ['game-rooms', selectedFormat],
    queryFn: () => fetchGameRooms(selectedFormat || undefined),
    enabled: true, // Always enabled for viewing games
    refetchInterval: 5000, // Refresh every 5 seconds
    retry: (failureCount, error) => {
      // Retry up to 3 times for fetch errors
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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowFormatDropdown(false);
    };
    
    if (showFormatDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showFormatDropdown]);

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
    if (!session?.user) {
      alert('You must be signed in to join a game');
      return;
    }
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

  // Allow viewing without authentication, but require auth for actions

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
              className="pl-12 pr-16 py-3 bg-black border-gray-600 text-white placeholder-gray-400 focus:border-gray-500 rounded-lg"
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
              <X className="w-4 h-4 text-gray-400" />
              <Settings className="w-4 h-4 text-gray-400" />
            </div>
          </div>
        </div>



        {/* Tabs */}
        <div className="flex items-center justify-between mb-8 border-b border-gray-800">
          <div className="flex space-x-8 items-center">


          </div>
          <div className="flex items-center space-x-4">
            <div className="relative">
            <Button 
                variant="ghost"
              size="sm" 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowFormatDropdown(!showFormatDropdown);
                }}
                className="text-gray-300 hover:text-white border border-transparent hover:border-gray-600 hover:bg-transparent transition-colors"
            >
                Format {selectedFormat && '(active)'}
                <Filter className="w-4 h-4 ml-1" />
            </Button>
              
              {showFormatDropdown && (
                <div className="absolute top-full right-0 mt-2 bg-black border border-gray-600 rounded-lg shadow-xl z-50 min-w-48">
                  <button
                    onClick={() => {
                      setSelectedFormat('');
                      setShowFormatDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-white hover:bg-gray-700 transition-colors rounded-t-lg ${
                      selectedFormat === '' ? 'bg-gray-700' : ''
                    }`}
                  >
                    All Formats
                  </button>
                  <button
                    onClick={() => {
                      setSelectedFormat('commander');
                      setShowFormatDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-white hover:bg-gray-700 transition-colors ${
                      selectedFormat === 'commander' ? 'bg-gray-700' : ''
                    }`}
                  >
                    Commander
                  </button>
                  <button
                    onClick={() => {
                      setSelectedFormat('modern');
                      setShowFormatDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-white hover:bg-gray-700 transition-colors ${
                      selectedFormat === 'modern' ? 'bg-gray-700' : ''
                    }`}
                  >
                    Modern
                  </button>
                  <button
                    onClick={() => {
                      setSelectedFormat('standard');
                      setShowFormatDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-white hover:bg-gray-700 transition-colors ${
                      selectedFormat === 'standard' ? 'bg-gray-700' : ''
              }`}
            >
                    Standard
                  </button>
                  <button
                    onClick={() => {
                      setSelectedFormat('legacy');
                      setShowFormatDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-white hover:bg-gray-700 transition-colors ${
                      selectedFormat === 'legacy' ? 'bg-gray-700' : ''
                    }`}
                  >
                    Legacy
                  </button>
                  <button
                    onClick={() => {
                      setSelectedFormat('draft');
                      setShowFormatDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-white hover:bg-gray-700 transition-colors rounded-b-lg ${
                      selectedFormat === 'draft' ? 'bg-gray-700' : ''
              }`}
            >
                    Draft
                  </button>
                </div>
              )}
          </div>
          <Button 
            onClick={() => {
                if (!session?.user) {
                  alert('You must be signed in to create a game');
                  return;
                }
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
                    className="bg-black border border-gray-800 rounded-lg p-6 hover:border-gray-700 transition-colors"
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
                              className="text-white"
                            >
                              Spectate
                            </Button>
                            <Button 
                              onClick={() => handleEnterGame(game.id)}
                              className="text-white"
                            >
                              Enter Game
                            </Button>
                            <Button 
                              onClick={() => handleLeaveGame(game.id)}
                              disabled={leaveGameMutation.isPending}
                              variant="outline"
                              className="border-red-600 text-red-400"
                            >
                              {leaveGameMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Leave'}
                            </Button>
                          </>
                        ) : game.status === 'Playing' ? (
                          <div className="flex space-x-2">
                            <Button 
                              onClick={() => handleEnterGame(game.id)}
                              className="text-white"
                            >
                              Watch
                            </Button>
                          </div>
                        ) : hasCurrentGame ? (
                          <div className="flex space-x-2">
                            <Button 
                              onClick={() => handleEnterGame(game.id)}
                              className="text-white"
                            >
                              Watch
                            </Button>
                            <span className="text-gray-500 text-sm self-center">Can't join - already in a game</span>
                          </div>
                        ) : (
                          <div className="flex space-x-2">
                            <Button 
                              onClick={() => handleEnterGame(game.id)}
                              className="text-white"
                            >
                              Watch
                            </Button>
                          <Button 
                            onClick={() => handleJoinGame(game.id)}
                            disabled={joinGameMutation.isPending}
                              className="text-white border border-gray-600"
                          >
                            {joinGameMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Join Game'}
                          </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
            )}
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
      <DeckSelectionModal
        open={showDeckSelectionModal}
        onOpenChange={setShowDeckSelectionModal}
        title="Select a Deck"
        description="Choose a deck to bring into the game, or join without a deck."
        userDecks={userDecks}
        decksLoading={decksLoading}
        onDeckSelect={handleJoinWithDeck}
        onWithoutDeck={handleJoinWithoutDeck}
        onCancel={() => setShowDeckSelectionModal(false)}
      />

      {/* Create Game Deck Selection Modal */}
      <DeckSelectionModal
        open={showCreateGameDeckModal}
        onOpenChange={setShowCreateGameDeckModal}
        title="Select a Deck for Your Game"
        description="Choose a deck to bring into your new game room, or create without a deck."
        userDecks={userDecks}
        decksLoading={decksLoading}
        onDeckSelect={handleCreateGameWithDeck}
        onWithoutDeck={() => handleCreateGameWithDeck()}
        onCancel={() => setShowCreateGameDeckModal(false)}
        onBack={() => {
                    setShowCreateGameDeckModal(false);
                    setShowNewGameModal(true);
                  }}
        withoutDeckLabel="Create Without Deck"
      />
    </>
  );
} 