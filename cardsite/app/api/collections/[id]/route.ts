import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { userCollections, userCollectionCards, cards, gameParticipants } from '@/lib/db/schema';
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

    const { id: collectionId } = await params;
    if (!collectionId) {
      return NextResponse.json({ error: 'Invalid collection ID' }, { status: 400 });
    }

    // Get collection details with user ownership check
    const [collection] = await db
      .select({
        id: userCollections.id,
        name: userCollections.name,
        description: userCollections.description,
        format: userCollections.format,
        isPublic: userCollections.isPublic,
        createdAt: userCollections.createdAt,
        updatedAt: userCollections.updatedAt,
        userId: userCollections.userId,
      })
      .from(userCollections)
      .where(eq(userCollections.id, collectionId))
      .limit(1);

    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    // Check if user owns the collection, if it's public, or if they're in the same game room
    let hasAccess = collection.userId === session.user.id || collection.isPublic;
    
    console.log(`🔍 Collection access check for collection ${collectionId}:`, {
      requestingUserId: session.user.id,
      requestingUserEmail: session.user.email,
      collectionOwnerId: collection.userId,
      isPublic: collection.isPublic,
      ownsCollection: collection.userId === session.user.id,
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
        
        // Check if collection owner is in any of the same game rooms
        const collectionOwnerGameRooms = await db
          .select({ 
            gameId: gameParticipants.gameId,
            status: gameParticipants.status 
          })
          .from(gameParticipants)
          .where(eq(gameParticipants.userId, collection.userId));
        
        console.log(`🎯 Collection owner's game participations:`, collectionOwnerGameRooms);
        
        // Check for any shared game rooms (both users are participants)
        const sharedGames = collectionOwnerGameRooms.filter(ownerRoom => 
          gameIds.includes(ownerRoom.gameId)
        );
        
        console.log(`🤝 Shared game rooms:`, sharedGames);
        
        // Allow access if they're in the same game, regardless of status
        // (joined, active, etc. - as long as they're both participants)
        hasAccess = sharedGames.length > 0;
        
        if (hasAccess) {
          console.log(`✅ Allowing collection access: ${session.user.email} viewing collection of player in same game room`);
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

    // Get all cards in the collection with their details
    const collectionCardsData = await db
      .select({
        id: userCollectionCards.id,
        quantity: userCollectionCards.quantity,
        category: userCollectionCards.category,
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
      .from(userCollectionCards)
      .innerJoin(cards, eq(userCollectionCards.cardId, cards.id))
      .where(eq(userCollectionCards.collectionId, collectionId))
      .orderBy(userCollectionCards.createdAt);

    // Group cards by category
    const cardsByCategory = collectionCardsData.reduce((acc, collectionCard) => {
      const category = collectionCard.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push({
        id: collectionCard.id,
        quantity: collectionCard.quantity,
        category: collectionCard.category,
        card: collectionCard.card
      });
      return acc;
    }, {} as Record<string, typeof collectionCardsData>);

    // Calculate total card count
    const totalCards = collectionCardsData.reduce((sum, collectionCard) => sum + collectionCard.quantity, 0);

    return NextResponse.json({
      success: true,
      collection: {
        ...collection,
        cards: cardsByCategory,
        totalCards
      }
    });

  } catch (error) {
    console.error('Error fetching collection:', error);
    return NextResponse.json(
      { error: 'Failed to fetch collection' }, 
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

    const { id: collectionId } = await params;
    if (!collectionId) {
      return NextResponse.json({ error: 'Invalid collection ID' }, { status: 400 });
    }

    // First check if collection exists and user owns it
    const [collection] = await db
      .select({
        id: userCollections.id,
        userId: userCollections.userId,
        name: userCollections.name,
      })
      .from(userCollections)
      .where(eq(userCollections.id, collectionId))
      .limit(1);

    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    // Check ownership
    if (collection.userId !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Delete collection cards first (foreign key constraint)
    await db.delete(userCollectionCards).where(eq(userCollectionCards.collectionId, collectionId));
    
    // Then delete the collection
    await db.delete(userCollections).where(eq(userCollections.id, collectionId));

    return NextResponse.json({
      success: true,
      message: `Collection "${collection.name}" deleted successfully`
    });

  } catch (error) {
    console.error('Error deleting collection:', error);
    return NextResponse.json(
      { error: 'Failed to delete collection' }, 
      { status: 500 }
    );
  }
} 