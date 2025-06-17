'use client';

interface DeckZoneProps {
  cardsRemaining: number;
  onDeckClick: () => void;
}

export function DeckZone({ cardsRemaining, onDeckClick }: DeckZoneProps) {
  return (
    <div className="absolute bottom-4 right-4 z-30">
      <button
        onClick={onDeckClick}
        className="
          w-20 h-28 
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
        disabled={cardsRemaining === 0}
        aria-label={`Library with ${cardsRemaining} cards remaining - Click to draw`}
      >
        {/* Card back pattern */}
        <div className="absolute inset-1 bg-gradient-to-br from-blue-800 to-blue-900 rounded border border-blue-500 opacity-50" />
        <div className="absolute inset-2 bg-gradient-to-br from-blue-700 to-blue-800 rounded border border-blue-400 opacity-30" />
        
        {/* Content */}
        <div className="relative z-10 text-center">
          <div className="text-xs mb-1">LIBRARY</div>
          <div className="text-lg font-bold">{cardsRemaining}</div>
        </div>
        
        {/* Disabled overlay */}
        {cardsRemaining === 0 && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
            <span className="text-red-400 text-xs font-bold">EMPTY</span>
          </div>
        )}
      </button>
    </div>
  );
} 