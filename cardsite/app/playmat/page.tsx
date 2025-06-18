'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { PlaymatV2 } from '@/components/mtg/playmat-v2';
import type { MTGCard } from '@/lib/types/mtg';

function PlaymatLoading() {
  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center">
      <div className="text-white text-lg">Loading Playmat...</div>
    </div>
  );
}

function PlaymatContent() {
  const searchParams = useSearchParams();
  const deckId = searchParams.get('deckId');
  const [deckCards, setDeckCards] = useState<MTGCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDeck() {
      if (!deckId) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/decks/${deckId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.deck.cards) {
            // Extract all cards from all categories
            const allCards: MTGCard[] = [];
            Object.values(data.deck.cards).forEach((categoryCards: any) => {
              if (Array.isArray(categoryCards)) {
                categoryCards.forEach((deckCard: any) => {
                  // Add multiple copies based on quantity
                  for (let i = 0; i < deckCard.quantity; i++) {
                    // Ensure the card has the correct image structure
                    const card = {
                      ...deckCard.card,
                      // Handle both single-faced and double-faced cards
                      image_uris: deckCard.card.imageUris || deckCard.card.image_uris,
                      // Ensure card_faces is properly structured for double-faced cards
                      card_faces: deckCard.card.cardFaces || deckCard.card.card_faces
                    };
                    
                    // If it's a double-faced card without top-level image_uris, 
                    // make sure the faces have proper image data
                    if (card.card_faces && Array.isArray(card.card_faces) && !card.image_uris) {
                      card.card_faces = card.card_faces.map((face: any) => ({
                        ...face,
                        image_uris: face.imageUris || face.image_uris
                      }));
                    }
                    
                    console.log('Card image data:', {
                      name: card.name,
                      hasImageUris: !!card.image_uris,
                      hasCardFaces: !!card.card_faces,
                      cardFacesCount: card.card_faces?.length || 0,
                      firstFaceHasImage: card.card_faces?.[0]?.image_uris?.normal ? true : false,
                      imageUrl: card.image_uris?.normal || card.card_faces?.[0]?.image_uris?.normal,
                      rawCard: deckCard.card // Show the raw card data from DB
                    });
                    allCards.push(card);
                  }
                });
              }
            });
            setDeckCards(allCards);
          }
        }
      } catch (error) {
        console.error('Failed to load deck:', error);
      } finally {
        setLoading(false);
      }
    }

    loadDeck();
  }, [deckId]);

  if (loading) {
    return <PlaymatLoading />;
  }

  return <PlaymatV2 initialDeck={deckCards} />;
}

export default function PlaymatPage() {
  return (
    <Suspense fallback={<PlaymatLoading />}>
      <PlaymatContent />
    </Suspense>
  );
} 