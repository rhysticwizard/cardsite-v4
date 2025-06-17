import React, { CSSProperties } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Card } from '../../../utils/ScryfallAPI';
import './PlaytestCard.css';

interface PlaytestCardProps {
  card: Card;
  style?: CSSProperties;
  tapped: boolean;
  onTap: () => void;
  id: string;
  isDragging?: boolean;
}

const PlaytestCard: React.FC<PlaytestCardProps> = ({
  card,
  style = {},
  tapped,
  onTap,
  id,
  isDragging = false
}) => {
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

  // Get card image URL with fallback
  const getCardImageUrl = (card: Card): string => {
    if (card.image_uris?.normal) {
      return card.image_uris.normal;
    }
    if (card.card_faces?.[0]?.image_uris?.normal) {
      return card.card_faces[0].image_uris.normal;
    }
    // Fallback to a Magic card back image
    return 'https://cards.scryfall.io/normal/back/0/0/0aeebaf5-8c7d-4636-9e82-8c27447861f7.jpg';
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

  // Combine container styles - ensure proper transform handling
  const containerStyle: CSSProperties = {
    ...style,
    ...(containerTransform ? { transform: `translate(-50%, -50%) ${containerTransform}` } : { transform: 'translate(-50%, -50%)' }),
  };

  return (
    <div
      ref={setNodeRef}
      className={`playtest-card-container ${isCurrentlyDragging ? 'dragging' : ''}`}
      style={containerStyle}
      {...attributes}
      {...listeners}
      onClick={handleClick}
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
        className={`playtest-card ${tapped ? 'tapped' : ''} ${isCurrentlyDragging ? 'dragging' : ''}`}
      >
        {/* Card image */}
        <img
          src={getCardImageUrl(card)}
          alt={card.name}
          className="playtest-card-image"
          draggable={false}
          onError={(e) => {
            // Fallback to card back on error
            const target = e.target as HTMLImageElement;
            target.src = 'https://cards.scryfall.io/normal/back/0/0/0aeebaf5-8c7d-4636-9e82-8c27447861f7.jpg';
          }}
        />
        

        
        {/* Power/Toughness label for creatures */}
        {hasPowerToughness && (
          <div className="playtest-card-label playtest-card-power-toughness">
            {card.power}/{card.toughness}
          </div>
        )}
      </div>
    </div>
  );
};

export default PlaytestCard; 