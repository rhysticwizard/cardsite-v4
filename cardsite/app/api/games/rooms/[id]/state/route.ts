import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { gameRooms, gameParticipants, users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

interface GameStateParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: GameStateParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: gameId } = await params;
    const { searchParams } = new URL(request.url);
    const playerId = searchParams.get('playerId');

    if (!playerId) {
      return NextResponse.json({ error: 'Player ID required' }, { status: 400 });
    }

    // Verify the requesting user is a participant in this game
    const participant = await db
      .select()
      .from(gameParticipants)
      .where(
        and(
          eq(gameParticipants.gameId, gameId),
          eq(gameParticipants.userId, session.user.id)
        )
      )
      .limit(1);

    if (participant.length === 0) {
      return NextResponse.json({ error: 'Not a participant in this game' }, { status: 403 });
    }

    // Get player game state from global function (set by custom server)
    const getPlayerGameState = (global as any).getPlayerGameState;
    const playerState = getPlayerGameState ? getPlayerGameState(gameId, playerId) : {
      battlefieldCards: [],
      handCards: [],
      handCount: 0,
      libraryCards: [],
      libraryCount: 60,
      lastUpdated: Date.now()
    };
    
    const gameState = {
      playerId,
      battlefieldCards: playerState.battlefieldCards,
      handCards: playerState.handCards || [], // Return actual hand cards
      handCount: playerState.handCount,
      libraryCards: playerState.libraryCards || [],
      libraryCount: playerState.libraryCount,
      lastUpdated: new Date(playerState.lastUpdated).toISOString()
    };

    return NextResponse.json(gameState);

  } catch (error) {
    console.error('❌ Error fetching game state:', error);
    return NextResponse.json(
      { error: 'Failed to fetch game state' },
      { status: 500 }
    );
  }
} 