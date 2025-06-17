import React, { useState, useRef, useEffect } from 'react';
import { Card } from '../../../utils/ScryfallAPI';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

export interface HandCard extends Card {
  id: string;
}

interface HandZoneProps {
  cards: HandCard[];
  onCardPlay: (cardId: string) => void;
  onCardMouseEnter?: (card: HandCard, event: React.MouseEvent) => void;
  onCardMouseLeave?: () => void;
  onReturnToHand?: (cardId: string) => void;
}

// Create a draggable hand card component
const HandCardComponent: React.FC<{
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
}> = ({ 
  card, 
  index, 
  position, 
  isHovered, 
  zIndex, 
  onClick, 
  onMouseEnter, 
  onMouseLeave 
}) => {
  // Set up draggable
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `hand-${card.id}`,
    data: {
      type: 'hand-card',
      card
    }
  });

  // Apply DND transforms and original transforms
  const baseTransform = `translate(-50%, 0) scale(${position.scale}) rotate(${position.rotation}deg)`;
  const style = {
    left: `${position.x}px`,
    top: `${position.y}px`,
    transform: CSS.Translate.toString(transform) ? 
      `${baseTransform} ${CSS.Translate.toString(transform)}` : 
      baseTransform,
    zIndex: isDragging ? 1000 : zIndex, // Ensure dragged card is on top
    position: 'absolute' as const,
    transition: isDragging ? 'none' : 'all 0.2s ease-out',
    opacity: isDragging ? 0 : 1, // Make completely invisible when dragging
    width: `${120 * position.scale}px`,
    height: `${168 * position.scale}px`,
    cursor: isDragging ? 'grabbing' : 'grab',
    visibility: isDragging ? 'hidden' as const : 'visible' as const // Hide the element completely
  };

  return (
    <div 
      ref={setNodeRef}
      className={`hand-card ${isHovered ? 'hovered' : ''}`}
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
          className="hand-card-image"
          draggable={false} // Prevent image itself from being draggable
        />
      ) : card.card_faces && card.card_faces[0]?.image_uris?.normal ? (
        <img 
          src={card.card_faces[0].image_uris.normal} 
          alt={card.name}
          className="hand-card-image"
          draggable={false} // Prevent image itself from being draggable
        />
      ) : (
        <div className="card-placeholder">
          <p>{card.name}</p>
        </div>
      )}
    </div>
  );
};

const HandZone: React.FC<HandZoneProps> = ({ 
  cards, 
  onCardPlay, 
  onCardMouseEnter,
  onCardMouseLeave,
  onReturnToHand
}) => {
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
    const containerWidth = containerRef.current?.clientWidth || window.innerWidth;
    const containerHeight = containerRef.current?.clientHeight || 280;
    
    console.log("Using container dimensions:", containerWidth, "x", containerHeight);
    
    // Calculate available width, accounting for margins
    const availableWidth = containerWidth - 80; // 40px margin on each side
    
    // Always base arc calculations on the maximum possible cards (14)
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
    
    console.log("Start X position:", startX, "Total width:", totalWidth, "Available width:", availableWidth, "Spacing:", baseSpacing);
    
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
      const isHovered = card.id === hoveredCardId;
      
      return {
        card,
        x,
        y,
        rotation,
        isHovered,
        scale, // Always 1.0 - no scaling
        position: {
          x,
          y,
          rotation,
          scale
        }
      };
    });
  };
  
  // Handle window resize to recalculate positions
  useEffect(() => {
    const handleResize = () => {
      // Force a re-render to recalculate positions
      setHoveredCardId(prev => prev);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const cardPositions = calculateCardPositions();
  
  // Calculate z-index based on cascade order (left to right)
  // Cards on the right appear on top of cards on the left
  const getZIndex = (index: number, isHovered: boolean) => {
    if (isHovered) return 100;
    
    // Cascade order: higher index = higher z-index (rightmost cards on top)
    return 10 + index;
  };
  
  // Handle mouse enter on a card with preview functionality
  const handleMouseEnter = (e: React.MouseEvent, card: HandCard) => {
    setHoveredCardId(card.id);
    
    // Call parent component's mouse enter handler if provided
    if (onCardMouseEnter) {
      // Use the current target element for accurate positioning
      onCardMouseEnter(card, e as React.MouseEvent<HTMLDivElement>);
    }
  };
  
  // Handle mouse leave on a card with preview functionality
  const handleMouseLeave = () => {
    setHoveredCardId(null);
    
    // Call parent component's mouse leave handler if provided
    if (onCardMouseLeave) {
      onCardMouseLeave();
    }
  };
  
  return (
    <div 
      ref={setRefs} 
      className={`hand-zone ${isOver ? 'hand-zone-drop-active' : ''}`}
    >
      {cards.length === 0 && (
        <div className="hand-empty-message">Your hand is empty. Click the deck to draw a card.</div>
      )}
      {cardPositions.map(({ card, position, isHovered }, index) => (
        <HandCardComponent
          key={card.id}
          card={card}
          index={index}
          position={position}
          isHovered={isHovered}
          zIndex={getZIndex(index, isHovered)}
          onClick={() => onCardPlay(card.id)}
          onMouseEnter={(e) => handleMouseEnter(e, card)}
          onMouseLeave={handleMouseLeave}
        />
      ))}
      
      {/* Carousel navigation buttons */}
      {needsCarousel && (
        <div className="hand-carousel-controls">
          <button 
            className="carousel-btn carousel-btn-prev"
            onClick={goToPrevious}
            disabled={carouselOffset === 0}
            title="Previous cards"
          >
            ‹
          </button>
          <div className="carousel-indicator">
            {carouselOffset + 1}-{Math.min(carouselOffset + MAX_VISIBLE_CARDS, cards.length)} of {cards.length}
          </div>
          <button 
            className="carousel-btn carousel-btn-next"
            onClick={goToNext}
            disabled={carouselOffset >= cards.length - MAX_VISIBLE_CARDS}
            title="Next cards"
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
};

export default HandZone; 