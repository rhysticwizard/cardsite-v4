'use client'

import React from 'react'
import { GameState, PlayerId } from '@/lib/game/types'
import { PlayerHand } from './player-hand'
import { Battlefield } from './battlefield'
import { DeckZone } from './deck-zone'
import { OpponentAreas } from './opponent-areas'

interface GameBoardProps {
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

export function GameBoard({ gameState, currentPlayerId, actions, disabled = false }: GameBoardProps) {
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

  return (
    <div className="relative w-full h-screen bg-gradient-to-br from-green-900 via-green-800 to-green-900 overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-[url('/pattern.svg')] bg-repeat" />
      </div>

      {/* Player Hand - Bottom */}
      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 z-20">
        <PlayerHand
          playerId={currentPlayerId}
          cards={currentPlayer.hand}
          onPlayCard={actions.playCard}
          disabled={disabled}
        />
      </div>

      {/* Battlefield - Center */}
      <div className="absolute inset-0 z-10">
        <Battlefield
          cards={getAllBattlefieldCards(gameState)}
          onMoveCard={actions.moveCard}
          onTapCard={actions.tapCard}
          onReturnToHand={actions.returnToHand}
          currentPlayerId={currentPlayerId}
          disabled={disabled}
        />
      </div>

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