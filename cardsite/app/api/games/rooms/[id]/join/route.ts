import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { gameRooms, gameParticipants, decks } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';

// POST /api/games/rooms/[id]/join - Join a game room
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const gameId = resolvedParams.id;
    const body = await request.json();
    const { deckId } = body;

    // 🐛 DEBUG: Log the deck selection
    console.log('🃏 JOIN GAME API - Received request:', {
      gameId,
      userId: session.user.id,
      deckId,
      hasDeckId: !!deckId,
      bodyContent: body
    });

    // Validate deck ownership if provided
    if (deckId) {
      const deck = await db
        .select({ id: decks.id })
        .from(decks)
        .where(and(
          eq(decks.id, deckId),
          eq(decks.userId, session.user.id)
        ))
        .limit(1);

      if (deck.length === 0) {
        return NextResponse.json(
          { error: 'Deck not found or not owned by user' },
          { status: 400 }
        );
      }
    }

    // Check if game room exists and is joinable
    const [room] = await db
      .select({
        id: gameRooms.id,
        status: gameRooms.status,
        maxPlayers: gameRooms.maxPlayers,
        currentPlayers: gameRooms.currentPlayers,
        hostId: gameRooms.hostId,
      })
      .from(gameRooms)
      .where(eq(gameRooms.id, gameId))
      .limit(1);

    if (!room) {
      return NextResponse.json(
        { error: 'Game room not found' },
        { status: 404 }
      );
    }

    if (room.status !== 'waiting') {
      return NextResponse.json(
        { error: 'Game room is not accepting new players' },
        { status: 400 }
      );
    }

    if (room.currentPlayers >= room.maxPlayers) {
      return NextResponse.json(
        { error: 'Game room is full' },
        { status: 400 }
      );
    }

    // Check if user is already in this game
    const existingParticipant = await db
      .select({ 
        id: gameParticipants.id,
        seatPosition: gameParticipants.seatPosition 
      })
      .from(gameParticipants)
      .where(and(
        eq(gameParticipants.gameId, gameId),
        eq(gameParticipants.userId, session.user.id)
      ))
      .limit(1);

    if (existingParticipant.length > 0) {
      // CRITICAL FIX: If already joined, UPDATE the deckId if one is provided
      if (deckId) {
        console.log(`🔄 User already in game ${gameId}, UPDATING deckId to: ${deckId}`);
        await db
          .update(gameParticipants)
          .set({ 
            deckId: deckId
          })
          .where(eq(gameParticipants.id, existingParticipant[0].id));
        
        console.log(`✅ Updated participant ${existingParticipant[0].id} with deckId: ${deckId}`);
      } else {
        console.log(`✅ User already in game ${gameId}, no deckId to update`);
      }
      
      return NextResponse.json({
        success: true,
        message: deckId ? 'Already joined this game, deck updated' : 'Already joined this game',
        gameId: gameId,
        seatPosition: existingParticipant[0].seatPosition,
        deckId: deckId || null,
      });
    }

    // CRITICAL FIX: Auto-leave any other games instead of blocking
    // This prevents the "only one game at a time" error
    const otherGameParticipations = await db
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

    // Remove user from all other games
    for (const participation of otherGameParticipations) {
      console.log(`🚪 Auto-leaving previous game: ${participation.gameName} (${participation.gameId})`);
      
      // Remove participant
      await db
        .delete(gameParticipants)
        .where(eq(gameParticipants.id, participation.participantId));

      // If this was the last player or the host, delete the room
      if (participation.currentPlayers <= 1 || participation.hostId === session.user.id) {
        await db
          .delete(gameRooms)
          .where(eq(gameRooms.id, participation.gameId));
        console.log(`🗑️ Deleted empty game room: ${participation.gameName}`);
      } else {
        // Otherwise, just decrease player count
        await db
          .update(gameRooms)
          .set({
            currentPlayers: sql`${gameRooms.currentPlayers} - 1`,
            updatedAt: new Date(),
          })
          .where(eq(gameRooms.id, participation.gameId));
        console.log(`📉 Decreased player count for game: ${participation.gameName}`);
      }
    }

    // Find the next available seat position
    const existingSeats = await db
      .select({ seatPosition: gameParticipants.seatPosition })
      .from(gameParticipants)
      .where(eq(gameParticipants.gameId, gameId));

    const takenSeats = new Set(existingSeats.map(s => s.seatPosition));
    let nextSeat = 1;
    while (takenSeats.has(nextSeat)) {
      nextSeat++;
    }

    // Add user as participant
    await db
      .insert(gameParticipants)
      .values({
        id: nanoid(12),
        gameId: gameId,
        userId: session.user.id,
        deckId: deckId || null,
        seatPosition: nextSeat,
        status: 'joined',
      });

    // 🐛 DEBUG: Log what was actually stored
    console.log('✅ PARTICIPANT CREATED:', {
      gameId,
      userId: session.user.id,
      deckId: deckId || null,
      seatPosition: nextSeat,
      storedDeckId: deckId || 'NULL'
      });

    // Update room player count
    await db
      .update(gameRooms)
      .set({
        currentPlayers: sql`${gameRooms.currentPlayers} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(gameRooms.id, gameId));

    return NextResponse.json({
      success: true,
      message: 'Successfully joined game room',
      gameId: gameId,
      seatPosition: nextSeat,
    });

  } catch (error) {
    console.error('Error joining game room:', error);
    return NextResponse.json(
      { error: 'Failed to join game room' },
      { status: 500 }
    );
  }
}

// DELETE /api/games/rooms/[id]/join - Leave a game room
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const gameId = resolvedParams.id;

    // Find user's participation in this game
    const [participant] = await db
      .select({
        id: gameParticipants.id,
        userId: gameParticipants.userId,
      })
      .from(gameParticipants)
      .where(and(
        eq(gameParticipants.gameId, gameId),
        eq(gameParticipants.userId, session.user.id)
      ))
      .limit(1);

    if (!participant) {
      return NextResponse.json(
        { error: 'Not a participant in this game' },
        { status: 400 }
      );
    }

    // Check if user is the host
    const [room] = await db
      .select({ hostId: gameRooms.hostId, currentPlayers: gameRooms.currentPlayers })
      .from(gameRooms)
      .where(eq(gameRooms.id, gameId))
      .limit(1);

    if (!room) {
      return NextResponse.json(
        { error: 'Game room not found' },
        { status: 404 }
      );
    }

    // Remove participant
    await db
      .delete(gameParticipants)
      .where(eq(gameParticipants.id, participant.id));

    // If this was the last player or the host, delete the room
    if (room.currentPlayers <= 1 || room.hostId === session.user.id) {
      await db
        .delete(gameRooms)
        .where(eq(gameRooms.id, gameId));
    } else {
      // Otherwise, just decrease player count
      await db
        .update(gameRooms)
        .set({
          currentPlayers: sql`${gameRooms.currentPlayers} - 1`,
          updatedAt: new Date(),
        })
        .where(eq(gameRooms.id, gameId));
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully left game room',
    });

  } catch (error) {
    console.error('Error leaving game room:', error);
    return NextResponse.json(
      { error: 'Failed to leave game room' },
      { status: 500 }
    );
  }
} 