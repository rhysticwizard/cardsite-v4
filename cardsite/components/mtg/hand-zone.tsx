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
    width: `${120 * position.scale}px`,
    height: `${168 * position.scale}px`,
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
      {card.image_uris?.normal ? (
        <img 
          src={card.image_uris.normal} 
          alt={card.name} 
          className="w-full h-full object-cover"
          draggable={false} // Prevent image itself from being draggable
        />
      ) : (
        <div className="w-full h-full bg-gray-800 flex items-center justify-center text-white text-sm p-2 text-center">
          <p>{card.name}</p>
        </div>
      )}
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
  // State to track the currently hovered card and carousel offset
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);
  const [carouselOffset, setCarouselOffset] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Setup the hand zone as a droppable area
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
  
  console.log("HandZone rendered with", cards.length, "cards");
  
  // Set up measurement of container size
  useEffect(() => {
    console.log("Container ref set:", containerRef.current ? "yes" : "no");
    if (containerRef.current) {
      console.log("Container dimensions:", 
                 containerRef.current.clientWidth, 
                 "x", 
                 containerRef.current.clientHeight);
    }
  }, [cards.length]);
  
  // Constants for carousel
  const MAX_VISIBLE_CARDS = 14;
  const needsCarousel = cards.length > MAX_VISIBLE_CARDS;
  
  // Get visible cards based on carousel offset
  const getVisibleCards = () => {
    if (!needsCarousel) return cards;
    
    const startIndex = carouselOffset;
    const endIndex = startIndex + MAX_VISIBLE_CARDS;
    return cards.slice(startIndex, endIndex);
  };
  
  const visibleCards = getVisibleCards();
  
  // Reset carousel offset if it goes out of bounds
  useEffect(() => {
    if (needsCarousel && carouselOffset >= cards.length) {
      setCarouselOffset(Math.max(0, cards.length - MAX_VISIBLE_CARDS));
    }
  }, [cards.length, carouselOffset, needsCarousel]);
  
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
    
    console.log("Calculating positions for", visibleCardCount, "visible cards out of", cards.length, "total cards");
    
    // Card dimensions - always use base values (no scaling)
    const cardWidth = 120;
    const cardHeight = 168; // 5:7 aspect ratio
    const scale = 1.0; // Always keep cards at full size
    
    // Get container dimensions
    const containerWidth = containerRef.current?.clientWidth || (typeof window !== 'undefined' ? window.innerWidth : 1920);
    const containerHeight = containerRef.current?.clientHeight || 280;
    
    console.log("Using container dimensions:", containerWidth, "x", containerHeight);
    
    // Calculate available width, accounting for margins
    const availableWidth = containerWidth - 80; // 40px margin on each side
    
    // Always base arc calculations on the maximum possible cards (14)
    // This ensures cards maintain consistent arc positions as more are added
    const arcCardCount = Math.min(visibleCardCount, MAX_VISIBLE_CARDS);
    
    // Calculate the spacing between cards
    const maxCardSpacing = cardWidth + 20; // Preferred spacing between cards
    const totalPreferredWidth = arcCardCount * maxCardSpacing;
    const cardSpacing = totalPreferredWidth > availableWidth ? 
      Math.max(cardWidth * 0.6, availableWidth / arcCardCount) : // Overlap if needed, but maintain minimum
      maxCardSpacing;
    
    // Calculate the actual width used by all cards
    const actualHandWidth = (arcCardCount - 1) * cardSpacing + cardWidth;
    
    // Center the hand horizontally
    const startX = (containerWidth - actualHandWidth) / 2 + (cardWidth / 2);
    
    // Arc calculations for natural hand appearance
    const arcRadius = Math.max(600, actualHandWidth * 0.8); // Minimum radius of 600px
    const maxArcAngle = Math.min(30, arcCardCount * 2); // Maximum total arc angle
    const anglePerCard = maxArcAngle / Math.max(1, arcCardCount - 1);
    const startAngle = -maxArcAngle / 2;
    
    // Calculate Y position - cards should be at the bottom of the container
    const baseY = containerHeight - (cardHeight / 2) - 20; // 20px margin from bottom
    
    return visibleCards.map((card, index) => {
      // Linear X position
      const x = startX + (index * cardSpacing);
      
      // Arc calculations for Y position and rotation
      const angle = startAngle + (index * anglePerCard);
      const radians = (angle * Math.PI) / 180;
      
      // Y position follows an arc
      const arcY = Math.sin(radians) * (arcRadius / 10); // Subtle arc
      const y = baseY + arcY;
      
      // Rotation follows the arc tangent for natural feel
      const rotation = angle * 0.8; // Slightly less rotation than the angle
      
      console.log(`Card ${index}: x=${x}, y=${y}, rotation=${rotation}, angle=${angle}`);
      
      return {
        x,
        y,
        rotation,
        scale
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
        absolute bottom-0 left-0 right-0 h-[280px]
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
      {visibleCards.map((card, index) => {
        const position = cardPositions[index];
        if (!position) return null;
        
        const isHovered = hoveredCardId === card.instanceId;
        const zIndex = getZIndex(index, isHovered);
        
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