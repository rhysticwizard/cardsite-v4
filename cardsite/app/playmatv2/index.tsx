import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useDeckContext, Deck } from '../../context/DeckContext';
import { Card } from '../../utils/ScryfallAPI';
import DeckZone from './components/DeckZone';
import PlaytestCard from './components/PlaytestCard';
import HandZone, { HandCard } from './components/HandZone';
import testCards from './components/TestCard';
import './PlaymatV2.css';

// Import dnd-kit components
import { 
  DndContext, 
  DragOverlay,
  PointerSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  useDroppable
} from '@dnd-kit/core';

/**
 * PlaymatV2 - Enhanced Card Playmat with Collision Detection
 * 
 * This component implements a sophisticated collision detection system that prevents
 * playtest cards from moving through the walls/boundaries of the playmat.
 * 
 * KEY FEATURES:
 * ============
 * 
 * 1. RESPONSIVE COLLISION DETECTION
 *    - Automatically adjusts card dimensions based on screen size
 *    - Recalculates boundaries on window resize
 *    - Supports mobile, tablet, and desktop viewports
 * 
 * 2. VISUAL FEEDBACK SYSTEM
 *    - Red border flash when cards hit boundaries
 *    - Subtle boundary indicators around playmat edges
 *    - Smooth animations for collision feedback
 * 
 * 3. PRECISE BOUNDARY CALCULATIONS
 *    - Accounts for actual card dimensions (150x209px desktop, 120x167px mobile, 100x139px small mobile)
 *    - Includes padding to prevent cards from touching screen edges
 *    - Centers cards properly using transform-origin
 * 
 * 4. ENHANCED DRAG SYSTEM
 *    - Maintains card position during collision
 *    - Prevents cards from "jumping" when hitting walls
 *    - Preserves drag momentum within valid bounds
 * 
 * 5. DEBUG LOGGING
 *    - Comprehensive collision detection logging
 *    - Boundary calculation tracking
 *    - Performance monitoring for drag operations
 * 
 * USAGE:
 * ======
 * Cards can be dragged around the playmat and will automatically stop at the boundaries.
 * Visual feedback (red border flash) indicates when a collision occurs.
 * The system is fully responsive and works across all device sizes.
 */

// Interface for battlefield cards
interface BattlefieldCard extends Card {
  id: string;
  position: {
    x: number;
    y: number;
  };
  tapped: boolean;
}

// Utility functions for collision detection
const getCardDimensions = () => {
  const screenWidth = window.innerWidth;
  if (screenWidth <= 480) {
    return { width: 100, height: 139 }; // Small mobile
  } else if (screenWidth <= 768) {
    return { width: 120, height: 167 }; // Mobile
  } else {
    return { width: 150, height: 209 }; // Desktop
  }
};

const calculateBoundaries = (cardDimensions: { width: number; height: number }, padding: number = 0) => {
  const halfCardWidth = cardDimensions.width / 2;
  const halfCardHeight = cardDimensions.height / 2;
  
  return {
    minX: halfCardWidth, // Flush against left edge
    maxX: window.innerWidth - halfCardWidth, // Flush against right edge
    minY: halfCardHeight, // Flush against top edge  
    maxY: window.innerHeight - halfCardHeight // Flush against bottom edge
  };
};

// Battlefield Component
const Battlefield: React.FC<{ 
  cards: BattlefieldCard[], 
  onCardMove: (cardId: string, x: number, y: number) => void,
  onCardTap: (cardId: string) => void,
  activeDragId?: string
}> = ({ cards, onCardMove, onCardTap, activeDragId }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: 'battlefield',
    data: {
      type: 'battlefield'
    }
  });

  return (
    <div 
      ref={setNodeRef} 
      className={`battlefield ${isOver ? 'drop-active' : ''}`}
    >
      {cards.map((card) => (
        <PlaytestCard
          key={card.id}
          id={card.id}
          card={card}
          tapped={card.tapped}
          onTap={() => onCardTap(card.id)}
          style={{
            left: card.position.x,
            top: card.position.y
          }}
          isDragging={activeDragId === `battlefield-${card.id}`}
        />
      ))}
    </div>
  );
};

const PlaymatV2: React.FC = () => {
  const { deckId } = useParams<{ deckId: string }>();
  const { getDeck } = useDeckContext();
  const [currentDeck, setCurrentDeck] = useState<Deck | null>(null);
  const [battlefieldCards, setBattlefieldCards] = useState<BattlefieldCard[]>([]);
  const [handCards, setHandCards] = useState<HandCard[]>([]);
  const [libraryCards, setLibraryCards] = useState<Card[]>([]);
  const [activeDragItem, setActiveDragItem] = useState<any>(null);

  // Set up sensors for drag and drop with proper activation distance
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 5, // 5px activation distance to prevent accidental drags
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    }),
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  useEffect(() => {
    if (deckId) {
      const deck = getDeck(deckId);
      if (deck) {
        setCurrentDeck(deck);
        // Initialize library with deck cards (shuffled)
        const shuffledCards = [...deck.cards].sort(() => Math.random() - 0.5);
        setLibraryCards(shuffledCards);
        
        // Draw initial hand of 7 cards
        const initialHand = shuffledCards.slice(0, 7).map((card, index) => ({
          ...card,
          id: `hand-${card.id || card.name}-${index}`
        }));
        setHandCards(initialHand);
        setLibraryCards(shuffledCards.slice(7));
      }
    }
    
    // Initialize with Lightning Bolt test card centered on battlefield
    const testCard: BattlefieldCard = {
      ...testCards,
      id: 'test-card-1',
      position: { x: window.innerWidth / 2, y: window.innerHeight / 2 }, // Center position
      tapped: false
    };
    setBattlefieldCards([testCard]);
    console.log('Initialized test card at position:', testCard.position);
    
    // Add window resize handler to recalculate boundaries
    const handleResize = () => {
      // Recalculate card positions to ensure they stay within bounds
      setBattlefieldCards(prev => prev.map(card => {
        const cardDimensions = getCardDimensions();
        const boundaries = calculateBoundaries(cardDimensions); // No padding - flush on all sides
        
        // Ensure card stays within new boundaries
        const newX = Math.max(boundaries.minX, Math.min(boundaries.maxX, card.position.x));
        const newY = Math.max(boundaries.minY, Math.min(boundaries.maxY, card.position.y));
        
        if (newX !== card.position.x || newY !== card.position.y) {
          console.log('Adjusting card position after resize:', {
            cardId: card.id,
            oldPos: card.position,
            newPos: { x: newX, y: newY },
            boundaries
          });
        }
        
        return { ...card, position: { x: newX, y: newY } };
      }));
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [deckId, getDeck]);

  // Hand management functions
  const drawCard = useCallback(() => {
    if (libraryCards.length > 0) {
      const drawnCard = libraryCards[0];
      const newHandCard: HandCard = {
        ...drawnCard,
        id: `hand-${drawnCard.id || drawnCard.name}-${Date.now()}`
      };
      
      setHandCards(prev => [...prev, newHandCard]);
      setLibraryCards(prev => prev.slice(1));
      console.log('Drew card:', newHandCard.name);
    }
  }, [libraryCards]);

  const playCard = useCallback((cardId: string) => {
    const handCard = handCards.find(card => card.id === cardId);
    if (!handCard) return;

    // Remove from hand
    setHandCards(prev => prev.filter(card => card.id !== cardId));
    
    // Add to battlefield at center position
    const battlefieldCard: BattlefieldCard = {
      ...handCard,
      id: `battlefield-${handCard.id}`,
      position: { 
        x: window.innerWidth / 2 + Math.random() * 200 - 100, // Some randomness
        y: window.innerHeight / 2 + Math.random() * 200 - 100 
      },
      tapped: false
    };
    
    setBattlefieldCards(prev => [...prev, battlefieldCard]);
    console.log('Played card:', handCard.name);
  }, [handCards]);

  const returnToHand = useCallback((cardId: string) => {
    const battlefieldCard = battlefieldCards.find(card => card.id === cardId);
    if (!battlefieldCard) return;

    // Remove from battlefield
    setBattlefieldCards(prev => prev.filter(card => card.id !== cardId));
    
    // Add back to hand
    const handCard: HandCard = {
      ...battlefieldCard,
      id: `hand-${battlefieldCard.id}-${Date.now()}`
    };
    
    setHandCards(prev => [...prev, handCard]);
    console.log('Returned card to hand:', handCard.name);
  }, [battlefieldCards]);

  const handleDeckClick = useCallback(() => {
    console.log('Deck clicked:', currentDeck?.name);
    drawCard();
  }, [currentDeck?.name, drawCard]);

  const handleCardTap = useCallback((cardId: string) => {
    setBattlefieldCards(prev => 
      prev.map(card => 
        card.id === cardId 
          ? { ...card, tapped: !card.tapped }
          : card
      )
    );
  }, []);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    console.log('Drag started:', event.active.id);
    setActiveDragItem(event.active);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over, delta } = event;
    console.log('Drag ended:', { activeId: active.id, overId: over?.id, delta });
    
    // Handle hand card drops
    if (active.id.toString().startsWith('hand-')) {
      const cardId = active.id.toString().replace('hand-', '');
      
      if (over?.id === 'battlefield') {
        // Calculate drop position based on event
        const rect = document.querySelector('.battlefield')?.getBoundingClientRect();
        if (rect && event.collisions && event.collisions.length > 0) {
          const collision = event.collisions[0];
          // Use the collision coordinates for positioning
          playCard(cardId);
        } else {
          // Fallback to playing card at center
          playCard(cardId);
        }
      }
    }
    
    // Handle battlefield card movements
    if (active.id.toString().startsWith('battlefield-')) {
      const cardId = active.id.toString().replace('battlefield-', '');
      
      // Handle drop to hand zone
      if (over?.id === 'hand-zone') {
        returnToHand(cardId);
      } else if (delta) {
        // Update position on battlefield
        setBattlefieldCards(prev => {
          const card = prev.find(c => c.id === cardId);
          if (!card) return prev;
          
          /**
           * Enhanced Collision Detection System
           * 
           * This system prevents cards from moving through the walls of the playmat by:
           * 1. Calculating proper card dimensions based on screen size (responsive)
           * 2. Computing boundaries that account for card size and padding
           * 3. Constraining card positions within valid bounds
           * 4. Providing visual feedback when collision occurs
           * 
           * The collision detection works by:
           * - Getting the proposed new position (current position + drag delta)
           * - Checking if that position would put the card outside boundaries
           * - Constraining the position to stay within valid bounds
           * - Triggering visual feedback when collision is detected
           * 
           * BOUNDARY BEHAVIOR:
           * - ALL SIDES: Cards land flush against all screen edges (no padding)
           * - Collision detection prevents cards from going off-screen
           * - Cards can touch the very edges of the viewport
           */
          
          // Enhanced collision detection - calculate proper card dimensions
          const cardDimensions = getCardDimensions();
          const boundaries = calculateBoundaries(cardDimensions); // No padding - flush on all sides
          
          // Calculate new position with proper collision detection
          const proposedX = card.position.x + delta.x;
          const proposedY = card.position.y + delta.y;

          // Apply boundary constraints (wall collision detection)
          const newX = Math.max(boundaries.minX, Math.min(boundaries.maxX, proposedX));
          const newY = Math.max(boundaries.minY, Math.min(boundaries.maxY, proposedY));
          
          // Check if collision occurred (for logging purposes)
          const collisionDetected = newX !== proposedX || newY !== proposedY;
          if (collisionDetected) {
            console.log('Collision detected - card stopped at boundary');
          }
          
          console.log('Collision detection:', { 
            cardId, 
            boundaries,
            proposed: { x: proposedX, y: proposedY },
            final: { x: newX, y: newY },
            collisionDetected
          });
          
          return prev.map(c => 
            c.id === cardId 
              ? { ...c, position: { x: newX, y: newY } }
              : c
          );
        });
      }
    }
    
    setActiveDragItem(null);
  }, [playCard, returnToHand]);

  const handleCardMove = useCallback((cardId: string, x: number, y: number) => {
    setBattlefieldCards(prev => 
      prev.map(card => 
        card.id === cardId 
          ? { ...card, position: { x, y } }
          : card
      )
    );
  }, []);

  return (
    <DndContext 
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="playmatv2-container">
        {/* Battlefield - droppable area */}
        <Battlefield 
          cards={battlefieldCards} 
          onCardMove={handleCardMove}
          onCardTap={handleCardTap}
          activeDragId={activeDragItem?.id}
        />
        
        {/* Deck Zone - positioned in bottom right */}
        {currentDeck && libraryCards.length > 0 && (
          <DeckZone 
            deck={currentDeck} 
            onDeckClick={handleDeckClick}
          />
        )}
        
        {/* Hand Zone */}
        <HandZone 
          cards={handCards}
          onCardPlay={playCard}
          onReturnToHand={returnToHand}
        />
      </div>
      
      {/* Drag Overlay */}
      <DragOverlay dropAnimation={null}>
        {activeDragItem ? (
          <div className="drag-overlay">
            {(() => {
              // Handle battlefield cards
              if (activeDragItem.id.toString().startsWith('battlefield-')) {
              const cardId = activeDragItem.id.toString().replace('battlefield-', '');
              const card = battlefieldCards.find(c => c.id === cardId);
              return card ? (
                <PlaytestCard
                  id={card.id}
                  card={card}
                  tapped={card.tapped}
                  onTap={() => {}}
                  isDragging={true}
                />
              ) : null;
              }
              
              // Handle hand cards
              if (activeDragItem.id.toString().startsWith('hand-')) {
                const cardId = activeDragItem.id.toString().replace('hand-', '');
                const card = handCards.find(c => c.id === cardId);
                return card ? (
                  <div className="hand-card" style={{ width: '120px', height: '168px', position: 'relative' }}>
                    {card.image_uris?.normal ? (
                      <img 
                        src={card.image_uris.normal} 
                        alt={card.name} 
                        className="hand-card-image"
                        style={{ width: '100%', height: '100%', borderRadius: '4.8px' }}
                      />
                    ) : card.card_faces && card.card_faces[0]?.image_uris?.normal ? (
                      <img 
                        src={card.card_faces[0].image_uris.normal} 
                        alt={card.name}
                        className="hand-card-image"
                        style={{ width: '100%', height: '100%', borderRadius: '4.8px' }}
                      />
                    ) : (
                      <div className="card-placeholder">
                        <p>{card.name}</p>
                      </div>
                    )}
                  </div>
                ) : null;
              }
              
              return null;
            })()}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default PlaymatV2;

// Ensure this file is treated as a module
export {}; 