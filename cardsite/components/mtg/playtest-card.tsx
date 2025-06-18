'use client';

import { CSSProperties } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { MTGCard } from '@/lib/types/mtg';

interface PlaytestCardProps {
  card: MTGCard;
  style?: CSSProperties;
  tapped: boolean;
  onTap: () => void;
  id: string;
  isDragging?: boolean;
  zIndex?: number;
  onMouseEnter?: (card: MTGCard, event: React.MouseEvent) => void;
  onMouseLeave?: () => void;
}

export function PlaytestCard({
  card,
  style = {},
  tapped,
  onTap,
  id,
  isDragging = false,
  zIndex = 10,
  onMouseEnter,
  onMouseLeave
}: PlaytestCardProps) {
  // Use draggable hook with proper configuration
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging: dndIsDragging
  } = useDraggable({
    id: `battlefield-${id}`,
    data: {
      type: 'battlefield-card',
      card,
      tapped
    }
  });

  // Debug logging
  console.log('PlaytestCard render:', { id, transform, isDragging: dndIsDragging, tapped });

  // Determine if card is being dragged
  const isCurrentlyDragging = isDragging || dndIsDragging;

  // Handle tap/untap click with proper event handling
  const handleClick = (event: React.MouseEvent) => {
    // Prevent click if we're dragging
    if (isCurrentlyDragging) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    
    // Only trigger tap if we didn't just finish dragging
    event.preventDefault();
    event.stopPropagation();
    console.log('Card clicked for tap/untap:', id);
    onTap();
  };

  // Get card image URL with fallback (using the same pattern as deck-card.tsx)
  const getCardImageUrl = (card: MTGCard): string => {
    // Check if card is double-faced
    const isDoubleFaced = (card as any).card_faces && (card as any).card_faces.length >= 2;
    
    // Get image URL using the same pattern as deck builder
    const imageUrl = isDoubleFaced 
      ? (card as any).card_faces[0]?.image_uris?.normal
      : card.image_uris?.normal || (card as any).card_faces?.[0]?.image_uris?.normal;
    
    // Debug logging for double-faced cards
    if (!imageUrl) {
      console.log('PlaytestCard: No image URL found for card:', {
        name: card.name,
        isDoubleFaced,
        hasImageUris: !!card.image_uris,
        hasCardFaces: !!(card as any).card_faces,
        cardFacesLength: (card as any).card_faces?.length || 0,
        firstFaceImageUris: (card as any).card_faces?.[0]?.image_uris,
        rawCard: card
      });
    }
    
    // Return the image URL or fallback
    return imageUrl || 'https://cards.scryfall.io/normal/back/0/0/0aeebaf5-8c7d-4636-9e82-8c27447861f7.jpg';
  };

  // Parse mana cost for display
  const formatManaCost = (manaCost?: string): string => {
    if (!manaCost) return '';
    // Remove braces and format for display
    return manaCost.replace(/[{}]/g, '');
  };

  // Check if card has power/toughness (creature)
  const hasPowerToughness = card.power !== undefined && card.toughness !== undefined;

  // Calculate container transform (drag positioning only)
  const containerTransform = transform ? CSS.Transform.toString(transform) : undefined;

  // Get responsive card dimensions
  const getCardClasses = () => {
    return `
      w-[100px] h-[139px] 
      sm:w-[120px] sm:h-[167px] 
      lg:w-[150px] lg:h-[209px]
    `.trim();
  };

  // Combine container styles - ensure proper transform handling
  const containerStyle: CSSProperties = {
    ...style,
    zIndex: isCurrentlyDragging ? 1000 : zIndex, // Higher z-index when dragging
    ...(containerTransform ? { 
      transform: `translate(-50%, -50%) ${containerTransform}` 
    } : { 
      transform: 'translate(-50%, -50%)' 
    }),
  };

  return (
    <div
      ref={setNodeRef}
      className={`absolute cursor-grab active:cursor-grabbing ${
        isCurrentlyDragging ? 'opacity-80' : ''
      }`}
      style={containerStyle}
      {...attributes}
      {...listeners}
      onClick={handleClick}
      onMouseEnter={(e) => onMouseEnter?.(card, e)}
      onMouseLeave={onMouseLeave}
      tabIndex={0}
      role="button"
      aria-label={`${card.name}${tapped ? ' (tapped)' : ''} - Click to ${tapped ? 'untap' : 'tap'}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick(e as any);
        }
      }}
    >
      {/* Inner card: handles visual styling and rotation only */}
      <div 
        className={`
          ${getCardClasses()}
          rounded-lg shadow-lg overflow-hidden
          border-2 border-white/30
          transition-all duration-200
          will-change-transform
          ${tapped ? 'rotate-90' : ''}
          ${isCurrentlyDragging ? 'scale-105 shadow-xl' : 'hover:border-white/50'}
          ${hasPowerToughness ? 'relative' : ''}
        `}
      >
        {/* Card image */}
        <img
          src={getCardImageUrl(card)}
          alt={card.name}
          className="w-full h-full object-cover"
          draggable={false}
          onError={(e) => {
            // Fallback to card back on error
            const target = e.target as HTMLImageElement;
            target.src = 'https://cards.scryfall.io/normal/back/0/0/0aeebaf5-8c7d-4636-9e82-8c27447861f7.jpg';
          }}
        />
        
        {/* Mana cost overlay */}
        {card.mana_cost && (
          <div className="absolute top-1 right-1 bg-black/70 text-white text-xs px-1 py-0.5 rounded">
            {formatManaCost(card.mana_cost)}
          </div>
        )}
        
        {/* Power/Toughness label for creatures */}
        {hasPowerToughness && (
          <div className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-1 py-0.5 rounded font-bold">
            {card.power}/{card.toughness}
          </div>
        )}
      </div>
    </div>
  );
} 