'use client';

import { useState, useRef, useEffect } from 'react';
import type { MTGCard } from '@/lib/types/mtg';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

export interface HandCard extends MTGCard {
  instanceId: string;
}

interface HandZoneProps {
  cards: HandCard[];
  onCardPlay: (cardId: string) => void;
  onCardMouseEnter?: (card: HandCard, event: React.MouseEvent) => void;
  onCardMouseLeave?: () => void;
  onReturnToHand?: (cardId: string) => void;
}

// Create a draggable hand card component
function HandCardComponent({ 
  card, 
  index, 
  position, 
  isHovered, 
  zIndex, 
  onClick, 
  onMouseEnter, 
  onMouseLeave 
}: {
  card: HandCard;
  index: number;
  position: {
    x: number;
    y: number;
    rotation: number;
    scale: number;
  };
  isHovered: boolean;
  zIndex: number;
  onClick: () => void;
  onMouseEnter: (e: React.MouseEvent) => void;
  onMouseLeave: () => void;
}) {
  // Set up draggable
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `hand-${card.instanceId}`,
    data: {
      type: 'hand-card',
      card
    }
  });

  // Apply DND transforms and original transforms
  const baseTransform = `translate(-50%, 0) scale(${position.scale}) rotate(${position.rotation}deg)`;
  const style: React.CSSProperties = {
    left: `${position.x}px`,
    top: `${position.y}px`,
    transform: CSS.Translate.toString(transform) ? 
      `${baseTransform} ${CSS.Translate.toString(transform)}` : 
      baseTransform,
    zIndex: isDragging ? 1000 : zIndex, // Ensure dragged card is on top
    position: 'absolute',
    transition: isDragging ? 'none' : 'all 0.2s ease-out',
    opacity: isDragging ? 0 : 1, // Make completely invisible when dragging
    width: `${150 * position.scale}px`,
    height: `${209 * position.scale}px`,
    cursor: isDragging ? 'grabbing' : 'grab',
    visibility: isDragging ? 'hidden' : 'visible' // Hide the element completely
  };

  return (
    <div 
      ref={setNodeRef}
      className={`
        rounded-lg shadow-lg pointer-events-auto
        border-2 border-white/30 overflow-hidden
        transition-all duration-200 ease-out
        will-change-transform origin-bottom
        ${isHovered ? 'border-white/80 shadow-white/30' : ''}
        ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}
      `}
      style={style}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
      {...listeners}
      {...attributes}
    >
      {(() => {
        // Use the same double-faced card logic as other components
        const isDoubleFaced = (card as any).card_faces && (card as any).card_faces.length >= 2;
        const imageUrl = isDoubleFaced 
          ? (card as any).card_faces[0]?.image_uris?.normal
          : card.image_uris?.normal || (card as any).card_faces?.[0]?.image_uris?.normal;
        
        return imageUrl ? (
          <img 
            src={imageUrl} 
            alt={card.name} 
            className="w-full h-full object-cover"
            draggable={false} // Prevent image itself from being draggable
          />
        ) : (
          <div className="w-full h-full bg-gray-800 flex items-center justify-center text-white text-sm p-2 text-center">
            <p>{card.name}</p>
          </div>
        );
      })()}
    </div>
  );
}

export function HandZone({ 
  cards, 
  onCardPlay, 
  onCardMouseEnter,
  onCardMouseLeave,
  onReturnToHand
}: HandZoneProps) {
  const [carouselOffset, setCarouselOffset] = useState(0);
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Droppable setup
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: 'hand-zone',
    data: {
      type: 'hand-zone'
    }
  });
  
  // Use refs for both dropping and container size measurements
  const setRefs = (element: HTMLDivElement | null) => {
    containerRef.current = element;
    setDroppableRef(element);
  };
  
  // Only log when cards actually change, not on every render
  const prevCardsLength = useRef(cards.length);
  useEffect(() => {
    if (prevCardsLength.current !== cards.length) {
      console.log("HandZone cards changed:", prevCardsLength.current, "->", cards.length);
      prevCardsLength.current = cards.length;
    }
  }, [cards.length]);
  
  // Constants for carousel
  const MAX_VISIBLE_CARDS = 10;
  const needsCarousel = cards.length > MAX_VISIBLE_CARDS;
  
  // Get visible cards based on carousel offset
  const getVisibleCards = () => {
    if (!needsCarousel) return cards;
    
    const startIndex = carouselOffset;
    const endIndex = startIndex + MAX_VISIBLE_CARDS;
    return cards.slice(startIndex, endIndex);
  };
  
  const visibleCards = getVisibleCards();
  
  // Auto-scroll to show newest cards (rightmost) when hand grows beyond 10 cards
  useEffect(() => {
    if (needsCarousel) {
      // Always show the rightmost cards (newest cards)
      const maxOffset = Math.max(0, cards.length - MAX_VISIBLE_CARDS);
      setCarouselOffset(maxOffset);
    } else {
      // Reset offset when we don't need carousel
      setCarouselOffset(0);
    }
  }, [cards.length, needsCarousel]);
  
  // Reset carousel offset if it goes out of bounds (backup safety check)
  useEffect(() => {
    if (needsCarousel && carouselOffset >= cards.length) {
      setCarouselOffset(Math.max(0, cards.length - MAX_VISIBLE_CARDS));
    }
  }, [carouselOffset, needsCarousel, cards.length]);
  
  // Carousel navigation functions
  const goToPrevious = () => {
    if (!needsCarousel) return;
    setCarouselOffset(prev => Math.max(0, prev - 1));
  };
  
  const goToNext = () => {
    if (!needsCarousel) return;
    const maxOffset = Math.max(0, cards.length - MAX_VISIBLE_CARDS);
    setCarouselOffset(prev => Math.min(maxOffset, prev + 1));
  };
  
  // Calculate positions of visible cards in the hand
  const calculateCardPositions = () => {
    const visibleCardCount = visibleCards.length;
    if (visibleCardCount === 0) return [];
    
    // Card dimensions - match battlefield card size
    const cardWidth = 150;
    const cardHeight = 209; // 5:7 aspect ratio - same as battlefield cards
    const scale = 1.0; // Always keep cards at full size
    
    // Get container dimensions
    const containerWidth = containerRef.current?.clientWidth || (typeof window !== 'undefined' ? window.innerWidth : 1920);
    const containerHeight = containerRef.current?.clientHeight || 160;
    
    // Calculate available width, accounting for margins
    const availableWidth = containerWidth - 80; // 40px margin on each side
    
    // Always base arc calculations on the maximum possible cards (10)
    // This ensures cards maintain consistent arc positions as more are added
    const arcCardCount = Math.min(visibleCardCount, MAX_VISIBLE_CARDS);
    const arcMiddleIndex = (arcCardCount - 1) / 2;
    
    // Calculate spacing to fit all visible cards within available width
    let baseSpacing: number;
    
    if (visibleCardCount === 1) {
      // Single card - no spacing needed
      baseSpacing = 0;
    } else {
      // Start with ideal spacing and reduce as needed
      const idealSpacing = cardWidth * 0.7; // 70% of card width for good visibility
      
      // Calculate what spacing would be needed to fit all cards
      const requiredSpacing = availableWidth / (visibleCardCount - 1);
      
      // Use ideal spacing if we have room, otherwise use required spacing
      baseSpacing = Math.min(idealSpacing, requiredSpacing);
    
      // Ensure minimum spacing of at least 30px to prevent cards from being too close
      baseSpacing = Math.max(baseSpacing, 30);
    }
    
    // Calculate total width needed
    const totalWidth = baseSpacing * (visibleCardCount - 1);
    
    // Start x position to center the entire hand (center of first card)
    const startX = (containerWidth - totalWidth) / 2;
    
    // Calculate positions for each visible card
    return visibleCards.map((card, index) => {
      // Calculate horizontal position
      const x = startX + (index * baseSpacing);
      
      // Calculate vertical position with arc effect based on max card positions
      // Use the card's position in the full arc (not just visible cards)
      const arcPosition = index; // Position within the visible cards
      const distanceFromArcMiddle = Math.abs(arcPosition - arcMiddleIndex);
      
      // Maximum lift for arc effect (constant regardless of card count)
      const maxLift = 40;
      
      // Quadratic function for smoother arc: y = a * x^2
      const scaleFactor = maxLift / Math.pow(Math.max(arcMiddleIndex, 1), 2);
      const lift = maxLift - (scaleFactor * Math.pow(distanceFromArcMiddle, 2));
      
      // Final y position (bottom of container minus card height minus lift)
      const y = containerHeight - cardHeight - 20 - lift;
      
      // Calculate rotation for fan effect based on arc position
      // Cards on left rotate counterclockwise, cards on right rotate clockwise
      const maxRotation = 15; // Constant rotation regardless of card count
      const rotation = maxRotation * (arcPosition - arcMiddleIndex) / Math.max(arcMiddleIndex, 1);
      
      // Check if this card is currently hovered
      const isHovered = card.instanceId === hoveredCardId;
      
      return {
        x,
        y,
        rotation,
        scale, // Always 1.0 - no scaling
        isHovered
      };
    });
  };
  
  const cardPositions = calculateCardPositions();
  
  // Update positions when window resizes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleResize = () => {
      // Force re-render by updating state
      setCarouselOffset(prev => prev);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Get z-index for card (hovered card should be on top)
  const getZIndex = (index: number, isHovered: boolean) => {
    const baseZIndex = 20;
    return isHovered ? 100 : baseZIndex + index;
  };
  
  // Handle mouse events
  const handleMouseEnter = (e: React.MouseEvent, card: HandCard) => {
    setHoveredCardId(card.instanceId);
    if (onCardMouseEnter) {
      onCardMouseEnter(card, e);
    }
  };
  
  const handleMouseLeave = () => {
    setHoveredCardId(null);
    if (onCardMouseLeave) {
      onCardMouseLeave();
    }
  };

  return (
    <div 
      ref={setRefs}
      className={`
        absolute bottom-0 left-0 right-0 h-[160px]
        flex justify-center items-end
        pointer-events-none z-20
        px-10 transition-colors duration-200
        ${isOver ? 'bg-green-500/10' : ''}
      `}
    >
      {/* Empty hand message */}
      {cards.length === 0 && (
        <div className="text-gray-400 text-sm text-center p-5 pointer-events-auto">
          No cards in hand
        </div>
      )}
      

      
      {/* Hand cards */}
      {cardPositions.map((cardData, index) => {
        const { x, y, rotation, scale, isHovered } = cardData;
        const card = visibleCards[index];
        if (!card) return null;
        
        const zIndex = getZIndex(index, isHovered);
        const position = { x, y, rotation, scale };
        
        return (
          <HandCardComponent
            key={card.instanceId}
            card={card}
            index={index}
            position={position}
            isHovered={isHovered}
            zIndex={zIndex}
            onClick={() => onCardPlay(card.instanceId)}
            onMouseEnter={(e) => handleMouseEnter(e, card)}
            onMouseLeave={handleMouseLeave}
          />
        );
      })}
      
      {/* Carousel controls */}
      {needsCarousel && (
        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex items-center gap-4 bg-black/80 rounded-full px-4 py-2 pointer-events-auto z-30">
          <button
            onClick={goToPrevious}
            disabled={carouselOffset === 0}
            className="bg-white/20 hover:bg-white/30 disabled:opacity-40 disabled:cursor-not-allowed text-white border-none rounded-full w-8 h-8 flex items-center justify-center cursor-pointer text-lg font-bold transition-all duration-200 hover:scale-110 active:scale-95"
          >
            ‹
          </button>
          
          <div className="text-gray-300 text-xs font-medium min-w-[80px] text-center">
            {carouselOffset + 1}-{Math.min(carouselOffset + MAX_VISIBLE_CARDS, cards.length)} of {cards.length}
          </div>
          
          <button
            onClick={goToNext}
            disabled={carouselOffset >= cards.length - MAX_VISIBLE_CARDS}
            className="bg-white/20 hover:bg-white/30 disabled:opacity-40 disabled:cursor-not-allowed text-white border-none rounded-full w-8 h-8 flex items-center justify-center cursor-pointer text-lg font-bold transition-all duration-200 hover:scale-110 active:scale-95"
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
} 