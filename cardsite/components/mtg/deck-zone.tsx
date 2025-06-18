'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { MTGCard } from '@/lib/types/mtg';

interface DeckZoneProps {
  cardsRemaining: number;
  onDeckClick: () => void;
  topCard?: MTGCard; // Add top card for drag preview
}

// Draggable top card component
function DraggableTopCard({ card }: { card: MTGCard }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: 'library-deck',
    data: {
      type: 'library-card',
      card
    }
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0 : 1,
    width: '150px',
    height: '209px',
    position: 'absolute' as const,
    top: 0,
    left: 0,
    zIndex: 10
  };

  return (
    <div
      ref={setNodeRef}
      className="absolute inset-0 cursor-grab active:cursor-grabbing"
      style={style}
      {...listeners}
      {...attributes}
    >
      {/* Invisible overlay for dragging */}
      <div className="w-full h-full" />
    </div>
  );
}

export function DeckZone({ cardsRemaining, onDeckClick, topCard }: DeckZoneProps) {
  return (
    <div className="absolute bottom-4 right-4 z-30">
      <button
        onClick={onDeckClick}
        className="
          bg-gradient-to-br from-blue-900 to-blue-800
          border-2 border-blue-600
          rounded-lg shadow-lg
          hover:from-blue-800 hover:to-blue-700
          hover:border-blue-500
          active:scale-95
          transition-all duration-200
          cursor-pointer
          flex flex-col items-center justify-center
          text-white text-sm font-bold
          relative
          overflow-hidden
        "
        style={{
          width: '150px',
          height: '209px'
        }}
        disabled={cardsRemaining === 0}
        aria-label={`Library with ${cardsRemaining} cards remaining - Click to draw`}
      >
        {/* Card back pattern */}
        <div className="absolute inset-1 bg-gradient-to-br from-blue-800 to-blue-900 rounded border border-blue-500 opacity-50" />
        <div className="absolute inset-2 bg-gradient-to-br from-blue-700 to-blue-800 rounded border border-blue-400 opacity-30" />
        
        {/* Content */}
        <div className="relative z-10 text-center">
          <div className="text-sm mb-2">LIBRARY</div>
          <div className="text-2xl font-bold">{cardsRemaining}</div>
        </div>
        
        {/* Disabled overlay */}
        {cardsRemaining === 0 && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
            <span className="text-red-400 text-xs font-bold">EMPTY</span>
          </div>
        )}
        
        {/* Draggable top card overlay - only when cards are available */}
        {cardsRemaining > 0 && topCard && (
          <DraggableTopCard card={topCard} />
        )}
      </button>
    </div>
  );
} 