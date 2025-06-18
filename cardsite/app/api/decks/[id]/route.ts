import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { decks, deckCards, cards } from '@/lib/db/schema';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { eq, and } from 'drizzle-orm';

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

    // Check if user owns the deck or if it's public
    if (deck.userId !== session.user.id && !deck.isPublic) {
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