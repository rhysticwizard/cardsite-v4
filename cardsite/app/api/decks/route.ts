import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { decks, deckCards, cards } from '@/lib/db/schema';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { eq } from 'drizzle-orm';

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
      userId: session.user.id,
      name: deckData.name,
      description: deckData.description || '',
      format: deckData.format,
      isPublic: deckData.isPublic || false,
    }).returning();

    // Add cards to the deck - temporarily skip foreign key constraints
    if (deckData.cards && deckData.cards.length > 0) {
      // For now, let's store the cards as JSON in the deck description
      // This is a temporary solution until we implement proper card syncing
      console.log('Deck cards to save:', deckData.cards);
      
      // Update the deck with card information in description for now
      await db.update(decks)
        .set({ 
          description: `${deckData.description || ''}\n\nCards: ${JSON.stringify(deckData.cards)}` 
        })
        .where(eq(decks.id, newDeck.id));
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

    return NextResponse.json({
      success: true,
      decks: userDecks
    });

  } catch (error) {
    console.error('Error fetching decks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch decks' }, 
      { status: 500 }
    );
  }
} 