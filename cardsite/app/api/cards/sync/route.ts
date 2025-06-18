import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cards } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

interface ScryfallCard {
  id: string;
  name: string;
  mana_cost?: string;
  cmc: number;
  type_line: string;
  oracle_text?: string;
  power?: string;
  toughness?: string;
  colors?: string[];
  color_identity?: string[];
  rarity: string;
  set: string;
  set_name: string;
  collector_number: string;
  image_uris?: Record<string, string>;
  card_faces?: any[];
  prices?: Record<string, string>;
  legalities?: Record<string, string>;
}

async function fetchCardFromScryfall(cardId: string): Promise<ScryfallCard | null> {
  try {
    const response = await fetch(`https://api.scryfall.com/cards/${cardId}`);
    if (!response.ok) {
      console.error(`Failed to fetch card ${cardId} from Scryfall:`, response.statusText);
      return null;
    }
    return response.json();
  } catch (error) {
    console.error(`Error fetching card ${cardId} from Scryfall:`, error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { cardIds } = await request.json();
    
    if (!Array.isArray(cardIds)) {
      return NextResponse.json({ error: 'cardIds must be an array' }, { status: 400 });
    }

    const results: {
      synced: string[];
      failed: { cardId: string; error: string }[];
      existing: string[];
    } = {
      synced: [],
      failed: [],
      existing: []
    };

    for (const cardId of cardIds) {
      try {
        // Check if card already exists
        const existingCard = await db
          .select()
          .from(cards)
          .where(eq(cards.scryfallId, cardId))
          .limit(1);

        if (existingCard.length > 0) {
          results.existing.push(cardId);
          continue;
        }

        // Fetch from Scryfall
        const scryfallCard = await fetchCardFromScryfall(cardId);
        if (!scryfallCard) {
          results.failed.push({ cardId, error: 'Failed to fetch from Scryfall' });
          continue;
        }

        // Insert into database
        await db.insert(cards).values({
          id: crypto.randomUUID(),
          scryfallId: scryfallCard.id,
          name: scryfallCard.name,
          manaCost: scryfallCard.mana_cost || null,
          cmc: scryfallCard.cmc.toString(),
          typeLine: scryfallCard.type_line,
          oracleText: scryfallCard.oracle_text || null,
          power: scryfallCard.power || null,
          toughness: scryfallCard.toughness || null,
          colors: scryfallCard.colors || [],
          colorIdentity: scryfallCard.color_identity || [],
          rarity: scryfallCard.rarity,
          setCode: scryfallCard.set,
          setName: scryfallCard.set_name,
          collectorNumber: scryfallCard.collector_number,
          imageUris: scryfallCard.image_uris || {},
          cardFaces: scryfallCard.card_faces || null,
          prices: scryfallCard.prices || {},
          legalities: scryfallCard.legalities || {}
        });

        results.synced.push(cardId);
        
        // Add delay to respect Scryfall rate limits
        await new Promise(resolve => setTimeout(resolve, 50));
        
      } catch (error) {
        console.error(`Error syncing card ${cardId}:`, error);
        results.failed.push({ 
          cardId, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    return NextResponse.json({
      success: true,
      results
    });

  } catch (error) {
    console.error('Error syncing cards:', error);
    return NextResponse.json(
      { error: 'Failed to sync cards' }, 
      { status: 500 }
    );
  }
} 