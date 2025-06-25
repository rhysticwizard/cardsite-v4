'use client'

import React, { useState, useCallback } from 'react'
import { BattlefieldCard, PlayerId } from '@/lib/game/types'

interface BattlefieldProps {
  cards: BattlefieldCard[]
  onMoveCard: (playerId: PlayerId, cardId: string, position: { x: number, y: number }) => void
  onTapCard: (playerId: PlayerId, cardId: string, tapped: boolean) => void
  onReturnToHand: (playerId: PlayerId, cardId: string) => void
  currentPlayerId: PlayerId
  disabled?: boolean
}

export function Battlefield({ 
  cards, 
  onMoveCard, 
  onTapCard, 
  onReturnToHand, 
  currentPlayerId, 
  disabled = false 
}: BattlefieldProps) {
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set())

  const handleCardClick = useCallback((card: BattlefieldCard) => {
    if (disabled) return
    
    // Only allow interaction with your own cards
    if (card.playerId !== currentPlayerId) return

    onTapCard(currentPlayerId, card.instanceId, !card.tapped)
  }, [disabled, currentPlayerId, onTapCard])

  return (
    <div className="relative w-full h-full bg-transparent" style={{ minHeight: '100vh' }}>
      {cards.map((card) => (
        <BattlefieldCardComponent
          key={card.instanceId}
          card={card}
          isOwned={card.playerId === currentPlayerId}
          onTap={() => handleCardClick(card)}
          disabled={disabled}
        />
      ))}
    </div>
  )
}

interface BattlefieldCardComponentProps {
  card: BattlefieldCard
  isOwned: boolean
  onTap: () => void
  disabled: boolean
}

function BattlefieldCardComponent({ 
  card, 
  isOwned, 
  onTap, 
  disabled 
}: BattlefieldCardComponentProps) {
  return (
    <div
      className={`
        absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer
        transition-all duration-200
        ${card.tapped ? 'rotate-90' : 'rotate-0'}
        ${isOwned ? 'hover:scale-105' : 'opacity-80'}
        ${disabled ? 'cursor-not-allowed' : ''}
      `}
      style={{
        left: card.position.x,
        top: card.position.y,
        zIndex: card.zIndex || 1,
        width: '120px',
        height: '168px'
      }}
      onClick={onTap}
    >
      {/* Card Image */}
      {card.imageUris?.normal ? (
        <img
          src={card.imageUris.normal}
          alt={card.name}
          className={`
            w-full h-full object-cover rounded-lg shadow-lg
            border-2 ${isOwned ? 'border-blue-400' : 'border-red-400'}
          `}
          draggable={false}
        />
      ) : (
        <div className={`
          w-full h-full flex flex-col items-center justify-center
          bg-gray-800 text-white rounded-lg shadow-lg
          border-2 ${isOwned ? 'border-blue-400' : 'border-red-400'}
        `}>
          <div className="font-bold text-center text-sm mb-2 px-2">
            {card.name}
          </div>
          {card.manaCost && (
            <div className="text-xs text-gray-300">
              {card.manaCost}
            </div>
          )}
        </div>
      )}

      {/* Tap Indicator */}
      {card.tapped && (
        <div className="absolute top-1 left-1 bg-red-500 text-white text-xs px-1 rounded">
          TAPPED
        </div>
      )}

      {/* Owner Indicator */}
      <div className={`
        absolute bottom-1 right-1 w-3 h-3 rounded-full
        ${isOwned ? 'bg-blue-400' : 'bg-red-400'}
      `} />
    </div>
  )
} 