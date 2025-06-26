'use client';

import React, { useEffect, useState } from 'react';
import { notFound, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { secureApiRequest } from '@/lib/csrf';
import { PlaymatV2Multiplayer } from '@/components/mtg/playmat-v2-multiplayer';

interface GamePageProps {
  params: Promise<{
    id: string;
  }>;
}

interface GameRoom {
  id: string;
  name: string;
  format: string;
  status: string;
  maxPlayers: number;
  currentPlayers: number;
  hostId: string;
  participants: Array<{
    id: string;
    userId: string;
    deckId?: string;
    seatPosition: number;
    status: string;
    user: {
      id: string;
      username: string;
    };
    deck?: {
      id: string;
      name: string;
      format: string;
    };
  }>;
}

export default function GamePage({ params }: GamePageProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [gameRoom, setGameRoom] = useState<GameRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);
  const [spectatorUserId, setSpectatorUserId] = useState<string | null>(null);

  // Unwrap params properly for Next.js
  React.useEffect(() => {
    async function unwrapParams() {
      const resolvedParams = await params;
      setGameId(resolvedParams.id);
    }
    unwrapParams();
  }, [params]);

  // Load game room data
  useEffect(() => {
    async function loadGameRoom() {
      if (!gameId) return;

      // Add a small delay to ensure session is fully loaded if present
      await new Promise(resolve => setTimeout(resolve, 100));

      try {
        const response = await secureApiRequest(`/api/games/rooms/${gameId}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            setError('Game room not found');
            return;
          }
          const errorText = await response.text();
          throw new Error(`Failed to load game room: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        setGameRoom(data.room);
      } catch (err) {
        console.error('Error loading game room:', err);
        setError(`Failed to load game room: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    }

    loadGameRoom();
  }, [gameId]); // Removed session dependency to allow unauthenticated access

  // Allow non-authenticated users to watch games

  // Don't call notFound() until we've tried to load the gameId
  if (!loading && (!gameId || gameId.length === 0)) {
    notFound();
  }

  // Allow non-authenticated users to continue watching

  if (loading) {
    return (
      <div className="h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-white text-xl mb-4">Loading game room...</div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
        </div>
      </div>
    );
  }

  if (error || (!loading && !gameRoom)) {
    return (
      <div className="h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md">
          <h1 className="text-4xl font-bold text-red-400 mb-4">Error</h1>
          <p className="text-xl text-gray-400 mb-4">{error || 'Game room not found'}</p>
          <div className="text-sm text-gray-500 mb-8">
            <div>Game ID: {gameId}</div>
            <div>Session: {session?.user ? '✅ Authenticated' : '❌ Not authenticated'}</div>
            <div>User ID: {session?.user?.id || 'None'}</div>
          </div>
          <div className="space-x-2">
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              🔄 Refresh Page
            </button>
            <button 
              onClick={() => router.push('/play')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              ← Back to Lobby
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Ensure gameRoom is loaded before proceeding
  if (!gameRoom) {
    return null; // This should not happen due to earlier checks, but satisfies TypeScript
  }

  // Check if user is a participant (allow spectators)
  const currentUser = session?.user?.id ? gameRoom.participants.find(p => p.userId === session.user.id) : null;
  const isSpectator = !currentUser;

  // Create a mock participant for spectators
  const spectatorUser: typeof currentUser = isSpectator ? {
    id: 'spectator',
    userId: 'spectator',
    deckId: undefined,
    seatPosition: 0,
    status: 'watching',
    user: {
      id: 'spectator',
      username: 'Spectator'
    }
  } : currentUser!;

  return (
    <div className="h-screen w-screen overflow-hidden">
      {isSpectator && (
        <div className="absolute top-4 left-4 z-50 bg-purple-600 text-white px-3 py-1 rounded-lg text-sm font-medium">
          👁️ Spectating
        </div>
      )}
      <PlaymatV2Multiplayer 
        gameRoom={gameRoom}
        currentUser={spectatorUser}
        sessionUserId={session?.user?.id || 'spectator'}
        spectatorUserId={spectatorUserId || (gameRoom.participants[0]?.userId)}
        onPlayerSwitch={setSpectatorUserId}
      />
    </div>
  );
} 