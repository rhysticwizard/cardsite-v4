import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { userCollections, userCollectionCards, cards } from '@/lib/db/schema';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { eq, and } from 'drizzle-orm';

interface CollectionCard {
  cardId: string; // This will be the Scryfall ID
  quantity: number;
  category: string;
}

interface CollectionData {
  name: string;
  description?: string;
  format: string;
  isPublic?: boolean;
  cards: CollectionCard[];
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const collectionData: CollectionData = await request.json();
    
    // Validate required fields
    if (!collectionData.name || !collectionData.format) {
      return NextResponse.json(
        { error: 'Collection name and format are required' }, 
        { status: 400 }
      );
    }

    // Create the collection
    const [newCollection] = await db.insert(userCollections).values({
      id: crypto.randomUUID().slice(0, 12),
      userId: session.user.id,
      name: collectionData.name,
      description: collectionData.description || '',
      format: collectionData.format,
      isPublic: collectionData.isPublic || false,
    }).returning();

    // Save collection cards properly to collectionCards table
    if (collectionData.cards && collectionData.cards.length > 0) {
      // Find cards that don't exist in our database
      const missingCardIds: string[] = [];
      const existingCardMap = new Map<string, string>();

      for (const collectionCard of collectionData.cards) {
        const existingCard = await db
          .select()
          .from(cards)
          .where(eq(cards.scryfallId, collectionCard.cardId))
          .limit(1);

        if (existingCard.length === 0) {
          missingCardIds.push(collectionCard.cardId);
        } else {
          existingCardMap.set(collectionCard.cardId, existingCard[0].id);
        }
      }

      // Sync missing cards from Scryfall
      if (missingCardIds.length > 0) {
        console.log(`Syncing ${missingCardIds.length} missing cards from Scryfall`);
        try {
          const syncResponse = await fetch(`${request.nextUrl.origin}/api/cards/sync`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              // Skip CSRF for internal server-to-server requests
              'x-internal-request': 'true',
            },
            body: JSON.stringify({ cardIds: missingCardIds }),
          });

          if (syncResponse.ok) {
            // Refresh card mappings after sync
            for (const cardId of missingCardIds) {
              const existingCard = await db
                .select()
                .from(cards)
                .where(eq(cards.scryfallId, cardId))
                .limit(1);

              if (existingCard.length > 0) {
                existingCardMap.set(cardId, existingCard[0].id);
              }
            }
          }
        } catch (error) {
          console.error('Failed to sync cards:', error);
        }
      }

      // Insert collection cards for all cards we have
      const validCollectionCards = collectionData.cards.filter(collectionCard => 
        existingCardMap.has(collectionCard.cardId)
      );

      if (validCollectionCards.length > 0) {
        const collectionCardInserts = validCollectionCards.map(collectionCard => ({
          id: crypto.randomUUID().slice(0, 12),
          collectionId: newCollection.id,
          cardId: existingCardMap.get(collectionCard.cardId)!,
          quantity: collectionCard.quantity,
          category: collectionCard.category,
        }));

        await db.insert(userCollectionCards).values(collectionCardInserts);
      }

      console.log(`Saved collection "${newCollection.name}" with ${validCollectionCards.length}/${collectionData.cards.length} cards`);
    }

    return NextResponse.json({
      success: true,
      collection: newCollection,
      message: 'Collection saved successfully'
    });

  } catch (error) {
    console.error('Error saving collection:', error);
    return NextResponse.json(
      { error: 'Failed to save collection' }, 
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's collections with card counts
    const userCollectionsData = await db
      .select({
        id: userCollections.id,
        name: userCollections.name,
        description: userCollections.description,
        format: userCollections.format,
        isPublic: userCollections.isPublic,
        createdAt: userCollections.createdAt,
        updatedAt: userCollections.updatedAt,
      })
      .from(userCollections)
      .where(eq(userCollections.userId, session.user.id))
      .orderBy(userCollections.updatedAt);

    // Get card counts and thumbnail images for each collection
    const collectionsWithCounts = await Promise.all(
      userCollectionsData.map(async (collection) => {
        const cardCounts = await db
          .select({
            quantity: userCollectionCards.quantity
          })
          .from(userCollectionCards)
          .where(eq(userCollectionCards.collectionId, collection.id));

        const totalCards = cardCounts.reduce((sum, { quantity }) => sum + quantity, 0);

        // Get the first card for thumbnail
        const firstCard = await db
          .select({
            name: cards.name,
            imageUris: cards.imageUris,
          })
          .from(userCollectionCards)
          .innerJoin(cards, eq(userCollectionCards.cardId, cards.id))
          .where(eq(userCollectionCards.collectionId, collection.id))
          .limit(1);

        const thumbnailData = firstCard.length > 0 ? {
          thumbnailImage: firstCard[0].imageUris as any,
          thumbnailCardName: firstCard[0].name
        } : {
          thumbnailImage: null,
          thumbnailCardName: null
        };

        return {
          ...collection,
          cardCount: totalCards,
          ...thumbnailData
        };
      })
    );

    return NextResponse.json({
      success: true,
      collections: collectionsWithCounts
    });

  } catch (error) {
    console.error('Error fetching collections:', error);
    return NextResponse.json(
      { error: 'Failed to fetch collections' }, 
      { status: 500 }
    );
  }
} 

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const collectionData = await request.json();
    const { collectionId, ...updateData } = collectionData;
    
    // Validate required fields
    if (!collectionId) {
      return NextResponse.json(
        { error: 'Collection ID is required for updates' }, 
        { status: 400 }
      );
    }

    if (!updateData.name || !updateData.format) {
      return NextResponse.json(
        { error: 'Collection name and format are required' }, 
        { status: 400 }
      );
    }

    // Check if collection exists and user owns it
    const [existingCollection] = await db
      .select()
      .from(userCollections)
      .where(and(eq(userCollections.id, collectionId), eq(userCollections.userId, session.user.id)))
      .limit(1);

    if (!existingCollection) {
      return NextResponse.json(
        { error: 'Collection not found or access denied' }, 
        { status: 404 }
      );
    }

    // Update the collection
    const [updatedCollection] = await db
      .update(userCollections)
      .set({
        name: updateData.name,
        description: updateData.description || '',
        format: updateData.format,
        isPublic: updateData.isPublic || false,
        updatedAt: new Date(),
      })
      .where(eq(userCollections.id, collectionId))
      .returning();

    // Handle collection cards update
    if (updateData.cards && Array.isArray(updateData.cards)) {
      // Delete existing collection cards
      await db.delete(userCollectionCards).where(eq(userCollectionCards.collectionId, collectionId));

      // Add new collection cards (same logic as POST)
      if (updateData.cards.length > 0) {
        const missingCardIds: string[] = [];
        const existingCardMap = new Map<string, string>();

        for (const collectionCard of updateData.cards) {
          const existingCard = await db
            .select()
            .from(cards)
            .where(eq(cards.scryfallId, collectionCard.cardId))
            .limit(1);

          if (existingCard.length === 0) {
            missingCardIds.push(collectionCard.cardId);
          } else {
            existingCardMap.set(collectionCard.cardId, existingCard[0].id);
          }
        }

        // Sync missing cards from Scryfall
        if (missingCardIds.length > 0) {
          console.log(`Syncing ${missingCardIds.length} missing cards from Scryfall`);
          try {
            const syncResponse = await fetch(`${request.nextUrl.origin}/api/cards/sync`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-internal-request': 'true',
              },
              body: JSON.stringify({ cardIds: missingCardIds }),
            });

            if (syncResponse.ok) {
              // Refresh card mappings after sync
              for (const cardId of missingCardIds) {
                const existingCard = await db
                  .select()
                  .from(cards)
                  .where(eq(cards.scryfallId, cardId))
                  .limit(1);

                if (existingCard.length > 0) {
                  existingCardMap.set(cardId, existingCard[0].id);
                }
              }
            }
          } catch (error) {
            console.error('Failed to sync cards:', error);
          }
        }

        // Insert collection cards for all cards we have
        const validCollectionCards = updateData.cards.filter((collectionCard: any) => 
          existingCardMap.has(collectionCard.cardId)
        );

        if (validCollectionCards.length > 0) {
          const collectionCardInserts = validCollectionCards.map((collectionCard: any) => ({
            id: crypto.randomUUID().slice(0, 12),
            collectionId: collectionId,
            cardId: existingCardMap.get(collectionCard.cardId)!,
            quantity: collectionCard.quantity,
            category: collectionCard.category,
          }));

          await db.insert(userCollectionCards).values(collectionCardInserts);
        }

        console.log(`Updated collection "${updatedCollection.name}" with ${validCollectionCards.length}/${updateData.cards.length} cards`);
      }
    }

    return NextResponse.json({
      success: true,
      collection: updatedCollection,
      message: 'Collection updated successfully'
    });

  } catch (error) {
    console.error('Error updating collection:', error);
    return NextResponse.json(
      { error: 'Failed to update collection' }, 
      { status: 500 }
    );
  }
} 