'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { GameState, PlayerId, BattlefieldCard } from '@/lib/game/types'
import { PlayerHand } from './player-hand'
import { Battlefield } from './battlefield'
import { DeckZone } from './deck-zone'
import { OpponentAreas } from './opponent-areas'

interface EnhancedGameBoardProps {
  gameState: GameState
  currentPlayerId: PlayerId
  actions: {
    drawCard: (playerId: PlayerId) => void
    playCard: (playerId: PlayerId, cardId: string, position: { x: number, y: number }) => void
    tapCard: (playerId: PlayerId, cardId: string, tapped: boolean) => void
    moveCard: (playerId: PlayerId, cardId: string, position: { x: number, y: number }) => void
    returnToHand: (playerId: PlayerId, cardId: string) => void
  }
  disabled?: boolean
}

export function EnhancedGameBoard({ 
  gameState, 
  currentPlayerId, 
  actions, 
  disabled = false 
}: EnhancedGameBoardProps) {
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set())
  const [isSelecting, setIsSelecting] = useState(false)
  const [selectionStart, setSelectionStart] = useState<{ x: number, y: number } | null>(null)
  const [selectionEnd, setSelectionEnd] = useState<{ x: number, y: number } | null>(null)
  const battlefieldRef = useRef<HTMLDivElement>(null)

  const currentPlayer = gameState.players.get(currentPlayerId)
  const opponents = Array.from(gameState.players.values()).filter(p => p.id !== currentPlayerId)

  if (!currentPlayer) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-600 mb-2">Player Not Found</h2>
          <p className="text-gray-500">Unable to load player data</p>
        </div>
      </div>
    )
  }

  // Multi-select functionality (no conflicts with @dnd-kit)
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (disabled || e.button !== 0) return
    
    const rect = battlefieldRef.current?.getBoundingClientRect()
    if (!rect) return
    
    setIsSelecting(true)
    setSelectionStart({ 
      x: e.clientX - rect.left, 
      y: e.clientY - rect.top 
    })
    setSelectionEnd({ 
      x: e.clientX - rect.left, 
      y: e.clientY - rect.top 
    })

    if (!e.ctrlKey && !e.metaKey) {
      setSelectedCards(new Set())
    }
  }, [disabled])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isSelecting || !selectionStart) return
    
    const rect = battlefieldRef.current?.getBoundingClientRect()
    if (!rect) return
    
    setSelectionEnd({ 
      x: e.clientX - rect.left, 
      y: e.clientY - rect.top 
    })
  }, [isSelecting, selectionStart])

  const handleMouseUp = useCallback(() => {
    if (isSelecting && selectionStart && selectionEnd) {
      // Calculate selection rectangle
      const left = Math.min(selectionStart.x, selectionEnd.x)
      const top = Math.min(selectionStart.y, selectionEnd.y)
      const width = Math.abs(selectionEnd.x - selectionStart.x)
      const height = Math.abs(selectionEnd.y - selectionStart.y)

      if (width > 10 && height > 10) { // Only select if meaningful drag
        const allBattlefieldCards = getAllBattlefieldCards(gameState)
        const cardsInSelection = allBattlefieldCards.filter(card => {
          // Simple box collision detection
          const cardX = card.position.x
          const cardY = card.position.y
          const cardWidth = 120
          const cardHeight = 168
          
          return !(left > cardX + cardWidth/2 ||
                   left + width < cardX - cardWidth/2 ||
                   top > cardY + cardHeight/2 ||
                   top + height < cardY - cardHeight/2)
        })
        
        setSelectedCards(new Set(cardsInSelection.map(card => card.instanceId)))
      }
    }
    
    setIsSelecting(false)
    setSelectionStart(null)
    setSelectionEnd(null)
  }, [isSelecting, selectionStart, selectionEnd, gameState])

  // Enhanced tap function for multi-select
  const handleMultiTap = useCallback(() => {
    if (selectedCards.size === 0) return
    
    const allBattlefieldCards = getAllBattlefieldCards(gameState)
    const selectedCardsList = allBattlefieldCards.filter(card => 
      selectedCards.has(card.instanceId) && card.playerId === currentPlayerId
    )
    
    if (selectedCardsList.length > 0) {
      // Determine target state (if any are untapped, tap all; if all tapped, untap all)
      const hasUntapped = selectedCardsList.some(card => !card.tapped)
      const targetTapped = hasUntapped
      
      selectedCardsList.forEach(card => {
        actions.tapCard(currentPlayerId, card.instanceId, targetTapped)
      })
    }
  }, [selectedCards, gameState, currentPlayerId, actions])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (disabled) return
      
      switch (e.key) {
        case 'Escape':
          setSelectedCards(new Set())
          break
        case 't':
        case 'T':
          if (selectedCards.size > 0) {
            handleMultiTap()
          }
          break
        case 'd':
        case 'D':
          if (!e.ctrlKey && !e.metaKey) {
            actions.drawCard(currentPlayerId)
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [disabled, selectedCards, handleMultiTap, actions, currentPlayerId])

  const getSelectionRectangle = () => {
    if (!selectionStart || !selectionEnd) return null
    
    const left = Math.min(selectionStart.x, selectionEnd.x)
    const top = Math.min(selectionStart.y, selectionEnd.y)
    const width = Math.abs(selectionEnd.x - selectionStart.x)
    const height = Math.abs(selectionEnd.y - selectionStart.y)
    
    return { left, top, width, height }
  }

  return (
    <div className="relative w-full h-screen bg-gradient-to-br from-green-900 via-green-800 to-green-900 overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-[url('/pattern.svg')] bg-repeat" />
      </div>

      {/* Multi-select instructions */}
      {selectedCards.size > 0 && (
        <div className="absolute top-20 left-4 z-30 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg">
          <div className="text-sm font-medium">
            {selectedCards.size} cards selected
          </div>
          <div className="text-xs opacity-90">
            Press T to tap/untap • ESC to clear
          </div>
        </div>
      )}

      {/* Player Hand - Bottom */}
      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 z-20">
        <PlayerHand
          playerId={currentPlayerId}
          cards={currentPlayer.hand}
          onPlayCard={actions.playCard}
          disabled={disabled}
        />
      </div>

      {/* Enhanced Battlefield - Center */}
      <div 
        ref={battlefieldRef}
        className="absolute inset-0 z-10"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{ cursor: isSelecting ? 'crosshair' : 'default' }}
      >
        <EnhancedBattlefield
          cards={getAllBattlefieldCards(gameState)}
          selectedCards={selectedCards}
          onTapCard={actions.tapCard}
          onReturnToHand={actions.returnToHand}
          currentPlayerId={currentPlayerId}
          disabled={disabled}
        />
      </div>

      {/* Selection Rectangle */}
      {isSelecting && selectionStart && selectionEnd && (() => {
        const rect = getSelectionRectangle()
        if (!rect || rect.width < 10 || rect.height < 10) return null
        
        return (
          <div
            className="absolute pointer-events-none z-20 border-2 border-blue-500 bg-blue-500/20 rounded"
            style={{
              left: rect.left,
              top: rect.top,
              width: rect.width,
              height: rect.height
            }}
          />
        )
      })()}

      {/* Deck Zone - Bottom Right */}
      <div className="absolute bottom-4 right-4 z-20">
        <DeckZone
          playerId={currentPlayerId}
          librarySize={currentPlayer.library.length}
          onDrawCard={actions.drawCard}
          disabled={disabled}
        />
      </div>

      {/* Opponent Areas - Top */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20">
        <OpponentAreas
          opponents={opponents}
          gameState={gameState}
        />
      </div>

      {/* Game Status - Top Left */}
      <div className="absolute top-4 left-4 z-30">
        <div className="bg-black/70 text-white px-4 py-2 rounded-lg shadow-lg">
          <div className="text-sm font-medium">
            Turn {gameState.turn} • {gameState.phase}
          </div>
          <div className="text-xs text-gray-300">
            {gameState.status}
          </div>
        </div>
      </div>

      {/* Keyboard Shortcuts Help */}
      <div className="absolute bottom-4 left-4 z-30 bg-black/70 text-white px-3 py-2 rounded-lg text-xs">
        <div className="font-medium mb-1">Shortcuts:</div>
        <div>D - Draw card</div>
        <div>T - Tap selected</div>
        <div>Drag - Multi-select</div>
      </div>
    </div>
  )
}

// Enhanced battlefield with selection support
interface EnhancedBattlefieldProps {
  cards: BattlefieldCard[]
  selectedCards: Set<string>
  onTapCard: (playerId: PlayerId, cardId: string, tapped: boolean) => void
  onReturnToHand: (playerId: PlayerId, cardId: string) => void
  currentPlayerId: PlayerId
  disabled?: boolean
}

function EnhancedBattlefield({ 
  cards, 
  selectedCards,
  onTapCard, 
  onReturnToHand, 
  currentPlayerId, 
  disabled = false 
}: EnhancedBattlefieldProps) {
  const handleCardClick = useCallback((card: BattlefieldCard, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent battlefield selection
    
    if (disabled) return
    
    // Only allow interaction with your own cards
    if (card.playerId !== currentPlayerId) return

    onTapCard(currentPlayerId, card.instanceId, !card.tapped)
  }, [disabled, currentPlayerId, onTapCard])

  return (
    <div className="relative w-full h-full">
      {cards.map((card) => (
        <div
          key={card.instanceId}
          className={`
            absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer
            transition-all duration-200
            ${card.tapped ? 'rotate-90' : 'rotate-0'}
            ${card.playerId === currentPlayerId ? 'hover:scale-105' : 'opacity-80'}
            ${selectedCards.has(card.instanceId) ? 'ring-4 ring-blue-400 ring-opacity-75' : ''}
            ${disabled ? 'cursor-not-allowed' : ''}
          `}
          style={{
            left: card.position.x,
            top: card.position.y,
            zIndex: card.zIndex || 1,
            width: '120px',
            height: '168px'
          }}
          onClick={(e) => handleCardClick(card, e)}
        >
          {/* Card Image */}
          {card.imageUris?.normal ? (
            <img
              src={card.imageUris.normal}
              alt={card.name}
              className={`
                w-full h-full object-cover rounded-lg shadow-lg
                border-2 ${card.playerId === currentPlayerId ? 'border-blue-400' : 'border-red-400'}
              `}
              draggable={false}
            />
          ) : (
            <div className={`
              w-full h-full flex flex-col items-center justify-center
              bg-gray-800 text-white rounded-lg shadow-lg
              border-2 ${card.playerId === currentPlayerId ? 'border-blue-400' : 'border-red-400'}
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

          {/* Selection Indicator */}
          {selectedCards.has(card.instanceId) && (
            <div className="absolute -top-2 -left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full shadow-lg">
              SELECTED
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
            ${card.playerId === currentPlayerId ? 'bg-blue-400' : 'bg-red-400'}
          `} />
        </div>
      ))}
    </div>
  )
}

// Helper function to get all battlefield cards from all players
function getAllBattlefieldCards(gameState: GameState) {
  const allCards = []
  for (const player of gameState.players.values()) {
    allCards.push(...player.battlefield)
  }
  return allCards
} 