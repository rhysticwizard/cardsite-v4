import React from 'react';
import { Deck } from '../../../context/DeckContext';
import './DeckZone.css';

interface DeckZoneProps {
  deck: Deck | null;
  onDeckClick?: () => void;
}

const DeckZone: React.FC<DeckZoneProps> = ({ deck, onDeckClick }) => {
  const totalCards = deck ? deck.cards.reduce((sum, card) => sum + card.count, 0) : 0;

  return (
    <div className="deck-zone" onClick={onDeckClick}>
      <div className="deck-card-back">
        <div className="deck-count">
          {totalCards}
        </div>
      </div>
    </div>
  );
};

export default DeckZone; 