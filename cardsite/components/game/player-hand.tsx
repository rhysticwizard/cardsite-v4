'use client'

import React, { useState } from 'react'
import { HandCard, PlayerId } from '@/lib/game/types'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface PlayerHandProps {
  playerId: PlayerId
  cards: HandCard[]
  onPlayCard: (playerId: PlayerId, cardId: string, position: { x: number, y: number }) => void
  disabled?: boolean
}

export function PlayerHand({ playerId, cards, onPlayCard, disabled = false }: PlayerHandProps) {
  const [selectedCard, setSelectedCard] = useState<string | null>(null)

  const handleCardClick = (card: HandCard) => {
    if (disabled) return
    
    if (selectedCard === card.instanceId) {
      // Play the selected card to the center of the battlefield
      const centerPosition = {
        x: typeof window !== 'undefined' ? window.innerWidth / 2 : 960,
        y: typeof window !== 'undefined' ? window.innerHeight / 2 : 540
      }
      onPlayCard(playerId, card.instanceId, centerPosition)
      setSelectedCard(null)
    } else {
      setSelectedCard(card.instanceId)
    }
  }

  if (cards.length === 0) {
    return (
      <div className="flex items-center justify-center h-20 w-full">
        <div className="text-gray-400 text-sm">No cards in hand</div>
      </div>
    )
  }

  return (
    <div className="flex items-end justify-center space-x-2 p-4 bg-black/20 rounded-t-xl backdrop-blur-sm">
      <div className="text-white text-sm mb-2 mr-4">
        Hand ({cards.length})
      </div>
      
      <div className="flex space-x-1 max-w-full overflow-x-auto pb-2">
        {cards.map((card, index) => (
          <HandCardComponent
            key={card.instanceId}
            card={card}
            isSelected={selectedCard === card.instanceId}
            onClick={() => handleCardClick(card)}
            disabled={disabled}
            style={{
              transform: `translateY(${selectedCard === card.instanceId ? '-20px' : '0'})`,
              zIndex: selectedCard === card.instanceId ? 10 : cards.length - index
            }}
          />
        ))}
      </div>
      
      {selectedCard && (
        <div className="text-white text-xs ml-4 self-center">
          Click again to play
        </div>
      )}
    </div>
  )
}

interface HandCardComponentProps {
  card: HandCard
  isSelected: boolean
  onClick: () => void
  disabled: boolean
  style?: React.CSSProperties
}

function HandCardComponent({ card, isSelected, onClick, disabled, style }: HandCardComponentProps) {
  return (
    <Card
      className={`
        relative w-16 h-22 bg-gray-800 border-2 cursor-pointer
        transition-all duration-200 hover:scale-105 flex-shrink-0
        ${isSelected ? 'border-blue-400 shadow-lg shadow-blue-400/50' : 'border-gray-600'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-gray-400'}
      `}
      style={style}
      onClick={onClick}
    >
      {/* Card Image */}
      {card.imageUris?.normal ? (
        <img
          src={card.imageUris.normal}
          alt={card.name}
          className="w-full h-full object-cover rounded-sm"
          draggable={false}
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center text-white text-xs p-1">
          <div className="font-bold text-center leading-tight mb-1">
            {card.name}
          </div>
          {card.manaCost && (
            <div className="text-xs text-gray-300 text-center">
              {card.manaCost}
            </div>
          )}
        </div>
      )}
      
      {/* Mana Cost Overlay */}
      {card.manaCost && (
        <div className="absolute top-1 right-1 bg-black/70 text-white text-xs px-1 rounded">
          {card.cmc || 0}
        </div>
      )}
    </Card>
  )
} 