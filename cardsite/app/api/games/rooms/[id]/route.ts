import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { gameRooms, gameParticipants, users, decks } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// GET /api/games/rooms/[id] - Get a specific game room (public for watching)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    // Allow non-authenticated users to view game rooms for watching

    const resolvedParams = await params;
    const gameId = resolvedParams.id;
    if (!gameId) {
      return NextResponse.json({ error: 'Game ID is required' }, { status: 400 });
    }

    // Get game room with participants
    const room = await db
      .select({
        id: gameRooms.id,
        name: gameRooms.name,
        format: gameRooms.format,
        status: gameRooms.status,
        maxPlayers: gameRooms.maxPlayers,
        currentPlayers: gameRooms.currentPlayers,
        hostId: gameRooms.hostId,
        createdAt: gameRooms.createdAt,
        settings: gameRooms.settings,
      })
      .from(gameRooms)
      .where(eq(gameRooms.id, gameId))
      .limit(1);

    if (room.length === 0) {
      return NextResponse.json({ error: 'Game room not found' }, { status: 404 });
    }

    // Get participants with user and deck info
    const participants = await db
      .select({
        id: gameParticipants.id,
        userId: gameParticipants.userId,
        deckId: gameParticipants.deckId,
        seatPosition: gameParticipants.seatPosition,
        status: gameParticipants.status,
        joinedAt: gameParticipants.joinedAt,
        username: users.username,
        deckName: decks.name,
        deckFormat: decks.format,
      })
      .from(gameParticipants)
      .leftJoin(users, eq(gameParticipants.userId, users.id))
      .leftJoin(decks, eq(gameParticipants.deckId, decks.id))
      .where(eq(gameParticipants.gameId, gameId))
      .orderBy(gameParticipants.seatPosition);

    // Format the response
    const gameRoom = {
      ...room[0],
      participants: participants.map(p => ({
        id: p.id,
        userId: p.userId,
        deckId: p.deckId,
        seatPosition: p.seatPosition,
        status: p.status,
        joinedAt: p.joinedAt,
        user: {
          id: p.userId,
          username: p.username,
        },
        deck: p.deckId ? {
          id: p.deckId,
          name: p.deckName,
          format: p.deckFormat,
        } : null,
      })),
    };

    // 🐛 DEBUG: Log participant data being returned
    console.log('🎮 GAME ROOM API - Returning participants:', participants.map(p => ({
      username: p.username,
      userId: p.userId,
      deckId: p.deckId,
      hasDeckId: !!p.deckId,
      deckName: p.deckName
    })));

    return NextResponse.json({
      success: true,
      room: gameRoom,
    });

  } catch (error) {
    console.error('Error fetching game room:', error);
    return NextResponse.json(
      { error: 'Failed to fetch game room', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 