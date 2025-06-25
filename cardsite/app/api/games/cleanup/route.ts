import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { gameRooms, gameParticipants } from '@/lib/db/schema';
import { eq, lt, and } from 'drizzle-orm';

// POST /api/games/cleanup - Clean up old empty or abandoned games
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete games older than 1 hour with 0 or 1 players (abandoned)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    // Find abandoned games
    const abandonedGames = await db
      .select({ id: gameRooms.id })
      .from(gameRooms)
      .where(and(
        lt(gameRooms.createdAt, oneHourAgo),
        eq(gameRooms.currentPlayers, 1)
      ));

    let cleanedCount = 0;

    // Clean up each abandoned game
    for (const game of abandonedGames) {
      // Remove participants first
      await db
        .delete(gameParticipants)
        .where(eq(gameParticipants.gameId, game.id));
      
      // Remove the game room
      await db
        .delete(gameRooms)
        .where(eq(gameRooms.id, game.id));
      
      cleanedCount++;
    }

    // Also clean up games with 0 players (shouldn't happen but just in case)
    const emptyGames = await db
      .delete(gameRooms)
      .where(eq(gameRooms.currentPlayers, 0))
      .returning({ id: gameRooms.id });

    cleanedCount += emptyGames.length;

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${cleanedCount} abandoned game rooms`,
      cleanedCount
    });

  } catch (error) {
    console.error('Error cleaning up games:', error);
    return NextResponse.json(
      { error: 'Failed to cleanup games' },
      { status: 500 }
    );
  }
} 