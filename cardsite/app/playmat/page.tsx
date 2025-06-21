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
  const [startsInHandCards, setStartsInHandCards] = useState<MTGCard[]>([]);
  const [startsInPlayCards, setStartsInPlayCards] = useState<MTGCard[]>([]);
  const [extraDeckCards, setExtraDeckCards] = useState<MTGCard[]>([]);
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
            // Parse column options from deck description
            let columnOptions: Record<string, string> = {};
            try {
              if (data.deck.description) {
                const parsed = JSON.parse(data.deck.description);
                if (parsed.columnStructure?.columnOptions) {
                  columnOptions = parsed.columnStructure.columnOptions;
                }
              }
            } catch {
              // If parsing fails, use empty column options
            }

            console.log('Loaded column options:', columnOptions);

            // Extract cards and separate by column options
            const libraryCards: MTGCard[] = [];
            const handCards: MTGCard[] = [];
            const battlefieldCards: MTGCard[] = [];
            const extraDeckCards: MTGCard[] = [];
            
            Object.entries(data.deck.cards).forEach(([categoryKey, categoryCards]: [string, any]) => {
              if (Array.isArray(categoryCards)) {
                const columnOption = columnOptions[categoryKey] || 'Starts in Deck';
                
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
                    
                    // Determine placement based on column option
                    let placement = 'library';
                    let facedown = false;
                    
                    if (columnOption === 'Starts in Hand') {
                      placement = 'hand';
                    } else if (columnOption === 'Faceup') {
                      placement = 'battlefield';
                    } else if (columnOption === 'Facedown') {
                      placement = 'battlefield';
                      facedown = true;
                    } else if (columnOption === 'Starts in Extra') {
                      placement = 'extra';
                    } else if (columnOption === 'Starts in Deck') {
                      placement = 'library'; // Explicitly handle "Starts in Deck"
                    } else {
                      // Default fallback for any unrecognized options
                      placement = 'library';
                    }
                    
                    console.log('Card placement:', {
                      name: card.name,
                      category: categoryKey,
                      columnOption: columnOption,
                      placement: placement
                    });
                    
                    // Place card based on column option
                    if (placement === 'hand') {
                      handCards.push(card);
                    } else if (placement === 'battlefield') {
                      // Add facedown property to cards going to battlefield
                      battlefieldCards.push({ ...card, facedown });
                    } else if (placement === 'extra') {
                      extraDeckCards.push(card);
                    } else {
                      libraryCards.push(card);
                    }
                  }
                });
              }
            });
            
            setDeckCards(libraryCards);
            setStartsInHandCards(handCards);
            setStartsInPlayCards(battlefieldCards);
            setExtraDeckCards(extraDeckCards);
            console.log(`Loaded deck: ${libraryCards.length} library cards, ${handCards.length} starts in hand, ${battlefieldCards.length} starts in play, ${extraDeckCards.length} starts in extra`);
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

  return <PlaymatV2 initialDeck={deckCards} initialHandCards={startsInHandCards} initialBattlefieldCards={startsInPlayCards} initialExtraDeckCards={extraDeckCards} />;
}

export default function PlaymatPage() {
  return (
    <Suspense fallback={<PlaymatLoading />}>
      <PlaymatContent />
    </Suspense>
  );
} 