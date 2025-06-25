import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { decks, deckCards, cards, gameParticipants } from '@/lib/db/schema';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { eq, and, or } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: deckId } = await params;
    if (!deckId) {
      return NextResponse.json({ error: 'Invalid deck ID' }, { status: 400 });
    }

    // Get deck details with user ownership check
    const [deck] = await db
      .select({
        id: decks.id,
        name: decks.name,
        description: decks.description,
        format: decks.format,
        isPublic: decks.isPublic,
        createdAt: decks.createdAt,
        updatedAt: decks.updatedAt,
        userId: decks.userId,
      })
      .from(decks)
      .where(eq(decks.id, deckId))
      .limit(1);

    if (!deck) {
      return NextResponse.json({ error: 'Deck not found' }, { status: 404 });
    }

    // Check if user owns the deck, if it's public, or if they're in the same game room
    let hasAccess = deck.userId === session.user.id || deck.isPublic;
    
    console.log(`🔍 Deck access check for deck ${deckId}:`, {
      requestingUserId: session.user.id,
      requestingUserEmail: session.user.email,
      deckOwnerId: deck.userId,
      isPublic: deck.isPublic,
      ownsDecK: deck.userId === session.user.id,
      hasAccess
    });
    
    if (!hasAccess) {
      console.log('🎮 Checking game room access...');
      
      // Check if both users are participants in the same active game room
      const sharedGameRooms = await db
        .select({ 
          gameId: gameParticipants.gameId,
          status: gameParticipants.status 
        })
        .from(gameParticipants)
        .where(eq(gameParticipants.userId, session.user.id));
      
      console.log(`👤 Requesting user's game participations:`, sharedGameRooms);
      
      if (sharedGameRooms.length > 0) {
        // Check all game rooms where both users are participants
        const gameIds = sharedGameRooms.map(room => room.gameId);
        
        // Check if deck owner is in any of the same game rooms
        const deckOwnerGameRooms = await db
          .select({ 
            gameId: gameParticipants.gameId,
            status: gameParticipants.status 
          })
          .from(gameParticipants)
          .where(eq(gameParticipants.userId, deck.userId));
        
        console.log(`🎯 Deck owner's game participations:`, deckOwnerGameRooms);
        
        // Check for any shared game rooms (both users are participants)
        const sharedGames = deckOwnerGameRooms.filter(ownerRoom => 
          gameIds.includes(ownerRoom.gameId)
        );
        
        console.log(`🤝 Shared game rooms:`, sharedGames);
        
        // Allow access if they're in the same game, regardless of status
        // (joined, active, etc. - as long as they're both participants)
        hasAccess = sharedGames.length > 0;
        
        if (hasAccess) {
          console.log(`✅ Allowing deck access: ${session.user.email} viewing deck of player in same game room`);
        } else {
          console.log(`❌ No shared game rooms found - access denied`);
        }
      } else {
        console.log(`❌ Requesting user not in any game rooms`);
      }
    }
    
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get all cards in the deck with their details
    const deckCardsData = await db
      .select({
        id: deckCards.id,
        quantity: deckCards.quantity,
        category: deckCards.category,
        card: {
          id: cards.id,
          scryfallId: cards.scryfallId,
          name: cards.name,
          manaCost: cards.manaCost,
          cmc: cards.cmc,
          typeLine: cards.typeLine,
          oracleText: cards.oracleText,
          power: cards.power,
          toughness: cards.toughness,
          colors: cards.colors,
          colorIdentity: cards.colorIdentity,
          rarity: cards.rarity,
          setCode: cards.setCode,
          setName: cards.setName,
          collectorNumber: cards.collectorNumber,
          imageUris: cards.imageUris,
          cardFaces: cards.cardFaces,
          prices: cards.prices,
          legalities: cards.legalities,
        }
      })
      .from(deckCards)
      .innerJoin(cards, eq(deckCards.cardId, cards.id))
      .where(eq(deckCards.deckId, deckId))
      .orderBy(deckCards.createdAt);

    // Group cards by category
    const cardsByCategory = deckCardsData.reduce((acc, deckCard) => {
      const category = deckCard.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push({
        id: deckCard.id,
        quantity: deckCard.quantity,
        category: deckCard.category,
        card: deckCard.card
      });
      return acc;
    }, {} as Record<string, typeof deckCardsData>);

    // Calculate total card count
    const totalCards = deckCardsData.reduce((sum, deckCard) => sum + deckCard.quantity, 0);

    return NextResponse.json({
      success: true,
      deck: {
        ...deck,
        cards: cardsByCategory,
        totalCards
      }
    });

  } catch (error) {
    console.error('Error fetching deck:', error);
    return NextResponse.json(
      { error: 'Failed to fetch deck' }, 
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: deckId } = await params;
    if (!deckId) {
      return NextResponse.json({ error: 'Invalid deck ID' }, { status: 400 });
    }

    // First check if deck exists and user owns it
    const [deck] = await db
      .select({
        id: decks.id,
        userId: decks.userId,
        name: decks.name,
      })
      .from(decks)
      .where(eq(decks.id, deckId))
      .limit(1);

    if (!deck) {
      return NextResponse.json({ error: 'Deck not found' }, { status: 404 });
    }

    // Check ownership
    if (deck.userId !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Delete deck cards first (foreign key constraint)
    await db.delete(deckCards).where(eq(deckCards.deckId, deckId));
    
    // Then delete the deck
    await db.delete(decks).where(eq(decks.id, deckId));

    return NextResponse.json({
      success: true,
      message: `Deck "${deck.name}" deleted successfully`
    });

  } catch (error) {
    console.error('Error deleting deck:', error);
    return NextResponse.json(
      { error: 'Failed to delete deck' }, 
      { status: 500 }
    );
  }
}