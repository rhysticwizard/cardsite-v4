import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { gameRooms, gameParticipants, users } from '@/lib/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';

// GET /api/games/rooms - List available game rooms
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all rooms with host information
    const rooms = await db
      .select({
        id: gameRooms.id,
        name: gameRooms.name,
        format: gameRooms.format,
        status: gameRooms.status,
        maxPlayers: gameRooms.maxPlayers,
        currentPlayers: gameRooms.currentPlayers,
        hostId: gameRooms.hostId,
        createdAt: gameRooms.createdAt,
        hostUsername: users.username,
      })
      .from(gameRooms)
      .leftJoin(users, eq(gameRooms.hostId, users.id))
      .orderBy(desc(gameRooms.createdAt))
      .limit(20);

    // Get user's participations
    const userParticipations = await db
      .select({
        gameId: gameParticipants.gameId,
      })
      .from(gameParticipants)
      .where(eq(gameParticipants.userId, session.user.id));

    const userGameIds = new Set(userParticipations.map(p => p.gameId));

    return NextResponse.json({
      success: true,
      rooms: rooms.map(room => ({
        id: room.id,
        title: room.name,
        format: room.format,
        players: `${room.currentPlayers}/${room.maxPlayers} Players`,
        host: room.hostUsername || 'Unknown Host',
        tags: [],
        powerLevel: null,
        status: room.status === 'waiting' ? 'Join Game' : 'Playing',
        createdAt: room.createdAt,
        isParticipant: userGameIds.has(room.id),
        isHost: room.hostId === session.user.id,
      }))
    });

  } catch (error) {
    console.error('Error fetching game rooms:', error);
    return NextResponse.json(
      { error: 'Failed to fetch game rooms', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST /api/games/rooms - Create a new game room
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, format, maxPlayers, settings } = body;

    // Validate required fields
    if (!name || !format) {
      return NextResponse.json(
        { error: 'Name and format are required' },
        { status: 400 }
      );
    }

    // CRITICAL FIX: Auto-leave any other games instead of blocking
    // This prevents the "only one game at a time" error when creating games
    const existingParticipations = await db
      .select({ 
        participantId: gameParticipants.id,
        gameId: gameParticipants.gameId,
        gameName: gameRooms.name,
        hostId: gameRooms.hostId,
        currentPlayers: gameRooms.currentPlayers
      })
      .from(gameParticipants)
      .innerJoin(gameRooms, eq(gameParticipants.gameId, gameRooms.id))
      .where(eq(gameParticipants.userId, session.user.id));

    // Remove user from all other games before creating new one
    for (const participation of existingParticipations) {
      console.log(`🚪 Auto-leaving previous game during create: ${participation.gameName} (${participation.gameId})`);
      
      // Remove participant
      await db
        .delete(gameParticipants)
        .where(eq(gameParticipants.id, participation.participantId));

      // If this was the last player or the host, delete the room
      if (participation.currentPlayers <= 1 || participation.hostId === session.user.id) {
        await db
          .delete(gameRooms)
          .where(eq(gameRooms.id, participation.gameId));
        console.log(`🗑️ Deleted empty game room during create: ${participation.gameName}`);
      } else {
        // Otherwise, just decrease player count
        await db
          .update(gameRooms)
          .set({
            currentPlayers: sql`${gameRooms.currentPlayers} - 1`,
            updatedAt: new Date(),
          })
          .where(eq(gameRooms.id, participation.gameId));
        console.log(`📉 Decreased player count during create for game: ${participation.gameName}`);
      }
    }

    // Create the game room
    const roomId = nanoid(12);
    const [newRoom] = await db
      .insert(gameRooms)
      .values({
        id: roomId,
        hostId: session.user.id,
        name: name.trim(),
        format: format.toLowerCase(),
        maxPlayers: parseInt(maxPlayers) || 4,
        currentPlayers: 1,
        settings: settings || {},
        status: 'waiting',
      })
      .returning();

    // Automatically add the creator as the first participant
    await db
      .insert(gameParticipants)
      .values({
        id: nanoid(12),
        gameId: roomId,
        userId: session.user.id,
        deckId: null, // Host can select deck later
        seatPosition: 1,
        status: 'joined',
      });

    return NextResponse.json({
      success: true,
      room: {
        id: newRoom.id,
        name: newRoom.name,
        format: newRoom.format,
        maxPlayers: newRoom.maxPlayers,
        currentPlayers: newRoom.currentPlayers,
        status: newRoom.status,
      }
    });

  } catch (error) {
    console.error('Error creating game room:', error);
    return NextResponse.json(
      { error: 'Failed to create game room', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 