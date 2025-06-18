import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { decks, deckCards, cards } from '@/lib/db/schema';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { eq, and } from 'drizzle-orm';

interface DeckCard {
  cardId: string; // This will be the Scryfall ID
  quantity: number;
  category: string;
}

interface DeckData {
  name: string;
  description?: string;
  format: string;
  isPublic?: boolean;
  cards: DeckCard[];
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const deckData: DeckData = await request.json();
    
    // Validate required fields
    if (!deckData.name || !deckData.format) {
      return NextResponse.json(
        { error: 'Deck name and format are required' }, 
        { status: 400 }
      );
    }

    // Create the deck
    const [newDeck] = await db.insert(decks).values({
      id: crypto.randomUUID().slice(0, 12),
      userId: session.user.id,
      name: deckData.name,
      description: deckData.description || '',
      format: deckData.format,
      isPublic: deckData.isPublic || false,
    }).returning();

    // Save deck cards properly to deckCards table
    if (deckData.cards && deckData.cards.length > 0) {
      // Find cards that don't exist in our database
      const missingCardIds: string[] = [];
      const existingCardMap = new Map<string, string>();

      for (const deckCard of deckData.cards) {
        const existingCard = await db
          .select()
          .from(cards)
          .where(eq(cards.scryfallId, deckCard.cardId))
          .limit(1);

        if (existingCard.length === 0) {
          missingCardIds.push(deckCard.cardId);
        } else {
          existingCardMap.set(deckCard.cardId, existingCard[0].id);
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

      // Insert deck cards for all cards we have
      const validDeckCards = deckData.cards.filter(deckCard => 
        existingCardMap.has(deckCard.cardId)
      );

      if (validDeckCards.length > 0) {
        const deckCardInserts = validDeckCards.map(deckCard => ({
          id: crypto.randomUUID().slice(0, 12),
          deckId: newDeck.id,
          cardId: existingCardMap.get(deckCard.cardId)!,
          quantity: deckCard.quantity,
          category: deckCard.category,
        }));

        await db.insert(deckCards).values(deckCardInserts);
      }

      console.log(`Saved deck "${newDeck.name}" with ${validDeckCards.length}/${deckData.cards.length} cards`);
    }

    return NextResponse.json({
      success: true,
      deck: newDeck,
      message: 'Deck saved successfully'
    });

  } catch (error) {
    console.error('Error saving deck:', error);
    return NextResponse.json(
      { error: 'Failed to save deck' }, 
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

    // Get user's decks with card counts
    const userDecks = await db
      .select({
        id: decks.id,
        name: decks.name,
        description: decks.description,
        format: decks.format,
        isPublic: decks.isPublic,
        createdAt: decks.createdAt,
        updatedAt: decks.updatedAt,
      })
      .from(decks)
      .where(eq(decks.userId, session.user.id))
      .orderBy(decks.updatedAt);

    // Get card counts and thumbnail images for each deck
    const decksWithCounts = await Promise.all(
      userDecks.map(async (deck) => {
        const cardCounts = await db
          .select({
            quantity: deckCards.quantity
          })
          .from(deckCards)
          .where(eq(deckCards.deckId, deck.id));

        const totalCards = cardCounts.reduce((sum, { quantity }) => sum + quantity, 0);

        // Get the first card for thumbnail
        const firstCard = await db
          .select({
            name: cards.name,
            imageUris: cards.imageUris,
          })
          .from(deckCards)
          .innerJoin(cards, eq(deckCards.cardId, cards.id))
          .where(eq(deckCards.deckId, deck.id))
          .limit(1);

        const thumbnailData = firstCard.length > 0 ? {
          thumbnailImage: firstCard[0].imageUris as any,
          thumbnailCardName: firstCard[0].name
        } : {
          thumbnailImage: null,
          thumbnailCardName: null
        };

        return {
          ...deck,
          cardCount: totalCards,
          ...thumbnailData
        };
      })
    );

    return NextResponse.json({
      success: true,
      decks: decksWithCounts
    });

  } catch (error) {
    console.error('Error fetching decks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch decks' }, 
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

    const deckData = await request.json();
    const { deckId, ...updateData } = deckData;
    
    // Validate required fields
    if (!deckId) {
      return NextResponse.json(
        { error: 'Deck ID is required for updates' }, 
        { status: 400 }
      );
    }

    if (!updateData.name || !updateData.format) {
      return NextResponse.json(
        { error: 'Deck name and format are required' }, 
        { status: 400 }
      );
    }

    // Check if deck exists and user owns it
    const [existingDeck] = await db
      .select()
      .from(decks)
      .where(and(eq(decks.id, deckId), eq(decks.userId, session.user.id)))
      .limit(1);

    if (!existingDeck) {
      return NextResponse.json(
        { error: 'Deck not found or access denied' }, 
        { status: 404 }
      );
    }

    // Update the deck
    const [updatedDeck] = await db
      .update(decks)
      .set({
        name: updateData.name,
        description: updateData.description || '',
        format: updateData.format,
        isPublic: updateData.isPublic || false,
        updatedAt: new Date(),
      })
      .where(eq(decks.id, deckId))
      .returning();

    // Handle deck cards update
    if (updateData.cards && Array.isArray(updateData.cards)) {
      // Delete existing deck cards
      await db.delete(deckCards).where(eq(deckCards.deckId, deckId));

      // Add new deck cards (same logic as POST)
      if (updateData.cards.length > 0) {
        const missingCardIds: string[] = [];
        const existingCardMap = new Map<string, string>();

        for (const deckCard of updateData.cards) {
          const existingCard = await db
            .select()
            .from(cards)
            .where(eq(cards.scryfallId, deckCard.cardId))
            .limit(1);

          if (existingCard.length === 0) {
            missingCardIds.push(deckCard.cardId);
          } else {
            existingCardMap.set(deckCard.cardId, existingCard[0].id);
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

        // Insert deck cards for all cards we have
        const validDeckCards = updateData.cards.filter((deckCard: any) => 
          existingCardMap.has(deckCard.cardId)
        );

        if (validDeckCards.length > 0) {
          const deckCardInserts = validDeckCards.map((deckCard: any) => ({
            id: crypto.randomUUID().slice(0, 12),
            deckId: deckId,
            cardId: existingCardMap.get(deckCard.cardId)!,
            quantity: deckCard.quantity,
            category: deckCard.category,
          }));

          await db.insert(deckCards).values(deckCardInserts);
        }

        console.log(`Updated deck "${updatedDeck.name}" with ${validDeckCards.length}/${updateData.cards.length} cards`);
      }
    }

    return NextResponse.json({
      success: true,
      deck: updatedDeck,
      message: 'Deck updated successfully'
    });

  } catch (error) {
    console.error('Error updating deck:', error);
    return NextResponse.json(
      { error: 'Failed to update deck' }, 
      { status: 500 }
    );
  }
}