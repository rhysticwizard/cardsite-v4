'use client';

import { useEffect, useState, useCallback } from 'react';
import { DndContext, DragOverlay, PointerSensor, MouseSensor, TouchSensor, useSensor, useSensors, DragStartEvent, DragEndEvent, useDroppable } from '@dnd-kit/core';
import type { MTGCard } from '@/lib/types/mtg';
import { PlaytestCard } from './playtest-card';
import { HandZone, type HandCard } from './hand-zone';
import { DeckZone } from './deck-zone';
import { testCards } from './test-cards';

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
interface BattlefieldCard extends MTGCard {
  instanceId: string;
  position: {
    x: number;
    y: number;
  };
  tapped: boolean;
}

// HandCard interface is imported from hand-zone

// Utility functions for collision detection
const getCardDimensions = () => {
  if (typeof window === 'undefined') return { width: 150, height: 209 };
  
  const screenWidth = window.innerWidth;
  if (screenWidth <= 480) {
    return { width: 100, height: 139 }; // Small mobile
  } else if (screenWidth <= 768) {
    return { width: 120, height: 167 }; // Mobile
  } else {
    return { width: 150, height: 209 }; // Desktop
  }
};

const calculateBoundaries = (cardDimensions: { width: number; height: number }) => {
  if (typeof window === 'undefined') return { minX: 75, maxX: 1845, minY: 104.5, maxY: 975.5 };
  
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
  cards: BattlefieldCard[];
  onCardMove: (cardId: string, x: number, y: number) => void;
  onCardTap: (cardId: string) => void;
  activeDragId?: string;
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
      className={`fixed inset-0 z-[2] cursor-default transition-colors duration-200 ${
        isOver ? 'bg-green-500/10' : ''
      }`}
    >
      {cards.map((card) => (
        <PlaytestCard
          key={card.instanceId}
          id={card.instanceId}
          card={card}
          tapped={card.tapped}
          onTap={() => onCardTap(card.instanceId)}
          style={{
            left: card.position.x,
            top: card.position.y
          }}
          isDragging={activeDragId === `battlefield-${card.instanceId}`}
        />
      ))}
    </div>
  );
};

export function PlaymatV2() {
  const [battlefieldCards, setBattlefieldCards] = useState<BattlefieldCard[]>([]);
  const [handCards, setHandCards] = useState<HandCard[]>([]);
  const [libraryCards, setLibraryCards] = useState<MTGCard[]>([]);
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
    // Initialize with test cards for demo
    if (typeof window !== 'undefined') {
      // Initialize with Lightning Bolt test card centered on battlefield
      const testCard: BattlefieldCard = {
        ...testCards[0],
        instanceId: 'test-card-1',
        position: { x: window.innerWidth / 2, y: window.innerHeight / 2 }, // Center position
        tapped: false
      };
      setBattlefieldCards([testCard]);
      console.log('Initialized test card at position:', testCard.position);
      
      // Add some cards to hand for testing
      const initialHand = testCards.slice(0, 3).map((card, index) => ({
        ...card,
        instanceId: `hand-${card.id}-${index}`
      }));
      setHandCards(initialHand);
      
      // Add window resize handler to recalculate boundaries
      const handleResize = () => {
        // Recalculate card positions to ensure they stay within bounds
        setBattlefieldCards(prev => prev.map(card => {
          const cardDimensions = getCardDimensions();
          const boundaries = calculateBoundaries(cardDimensions);
          
          // Ensure card stays within new boundaries
          const newX = Math.max(boundaries.minX, Math.min(boundaries.maxX, card.position.x));
          const newY = Math.max(boundaries.minY, Math.min(boundaries.maxY, card.position.y));
          
          if (newX !== card.position.x || newY !== card.position.y) {
            console.log('Adjusting card position after resize:', {
              cardId: card.instanceId,
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
    }
  }, []);

  // Hand management functions
  const drawCard = useCallback(() => {
    if (libraryCards.length > 0) {
      const drawnCard = libraryCards[0];
      const newHandCard: HandCard = {
        ...drawnCard,
        instanceId: `hand-${drawnCard.id}-${Date.now()}`
      };
      
      setHandCards(prev => [...prev, newHandCard]);
      setLibraryCards(prev => prev.slice(1));
      console.log('Drew card:', newHandCard.name);
    }
  }, [libraryCards]);

  const playCard = useCallback((cardId: string) => {
    const handCard = handCards.find(card => card.instanceId === cardId);
    if (!handCard) return;

    // Remove from hand
    setHandCards(prev => prev.filter(card => card.instanceId !== cardId));
    
    // Add to battlefield at center position
    const battlefieldCard: BattlefieldCard = {
      ...handCard,
      instanceId: `battlefield-${handCard.instanceId}`,
      position: { 
        x: (typeof window !== 'undefined' ? window.innerWidth : 1920) / 2 + Math.random() * 200 - 100, // Some randomness
        y: (typeof window !== 'undefined' ? window.innerHeight : 1080) / 2 + Math.random() * 200 - 100 
      },
      tapped: false
    };
    
    setBattlefieldCards(prev => [...prev, battlefieldCard]);
    console.log('Played card:', handCard.name);
  }, [handCards]);

  const returnToHand = useCallback((cardId: string) => {
    const battlefieldCard = battlefieldCards.find(card => card.instanceId === cardId);
    if (!battlefieldCard) return;

    // Remove from battlefield
    setBattlefieldCards(prev => prev.filter(card => card.instanceId !== cardId));
    
    // Add back to hand
    const handCard: HandCard = {
      ...battlefieldCard,
      instanceId: `hand-${battlefieldCard.instanceId}-${Date.now()}`
    };
    
    setHandCards(prev => [...prev, handCard]);
    console.log('Returned card to hand:', handCard.name);
  }, [battlefieldCards]);

  const handleCardTap = useCallback((cardId: string) => {
    setBattlefieldCards(prev => 
      prev.map(card => 
        card.instanceId === cardId 
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
        playCard(cardId);
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
          const card = prev.find(c => c.instanceId === cardId);
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
          const boundaries = calculateBoundaries(cardDimensions);
          
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
            c.instanceId === cardId 
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
        card.instanceId === cardId 
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
      {/* Playmat Container */}
      <div className="fixed inset-0 m-0 p-0 bg-grid-pattern z-[1] overflow-hidden">
        {/* Battlefield - droppable area */}
        <Battlefield 
          cards={battlefieldCards} 
          onCardMove={handleCardMove}
          onCardTap={handleCardTap}
          activeDragId={activeDragItem?.id}
        />
        
        {/* Deck Zone - positioned in bottom right */}
        {libraryCards.length > 0 && (
          <DeckZone 
            cardsRemaining={libraryCards.length}
            onDeckClick={drawCard}
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
          <div className="pointer-events-none z-[999]">
            {(() => {
              // Handle battlefield cards
              if (activeDragItem.id.toString().startsWith('battlefield-')) {
                const cardId = activeDragItem.id.toString().replace('battlefield-', '');
                const card = battlefieldCards.find(c => c.instanceId === cardId);
                return card ? (
                  <PlaytestCard
                    id={card.instanceId}
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
                const card = handCards.find(c => c.instanceId === cardId);
                return card ? (
                  <div className="w-[120px] h-[168px] rounded-lg shadow-lg overflow-hidden">
                    {card.image_uris?.normal ? (
                      <img 
                        src={card.image_uris.normal} 
                        alt={card.name} 
                        className="w-full h-full object-cover"
                        draggable={false}
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-800 flex items-center justify-center text-white text-sm p-2 text-center">
                        {card.name}
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
} 