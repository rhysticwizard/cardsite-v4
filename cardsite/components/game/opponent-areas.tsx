'use client'

import React from 'react'
import { GameState, PlayerState } from '@/lib/game/types'
import { Card } from '@/components/ui/card'

interface OpponentAreasProps {
  opponents: PlayerState[]
  gameState: GameState
}

export function OpponentAreas({ opponents, gameState }: OpponentAreasProps) {
  if (opponents.length === 0) {
    return null
  }

  return (
    <div className="flex space-x-4">
      {opponents.map((opponent) => (
        <OpponentArea
          key={opponent.id}
          opponent={opponent}
          isCurrentPlayer={gameState.currentPlayer === opponent.id}
        />
      ))}
    </div>
  )
}

interface OpponentAreaProps {
  opponent: PlayerState
  isCurrentPlayer: boolean
}

function OpponentArea({ opponent, isCurrentPlayer }: OpponentAreaProps) {
  return (
    <Card className={`
      p-3 min-w-[200px] bg-black/50 backdrop-blur-sm
      ${isCurrentPlayer ? 'border-yellow-400 border-2' : 'border-gray-600'}
    `}>
      <div className="text-white">
        {/* Player Name */}
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium text-sm">
            {opponent.username}
          </span>
          {isCurrentPlayer && (
            <span className="text-yellow-400 text-xs bg-yellow-400/20 px-2 py-1 rounded">
              TURN
            </span>
          )}
        </div>

        {/* Connection Status */}
        <div className="flex items-center mb-3">
          <div className={`
            w-2 h-2 rounded-full mr-2
            ${opponent.isConnected ? 'bg-green-400' : 'bg-red-400'}
          `} />
          <span className="text-xs text-gray-300">
            {opponent.isConnected ? 'Online' : 'Offline'}
          </span>
        </div>

        {/* Game Stats */}
        <div className="grid grid-cols-3 gap-2 text-xs text-gray-300">
          <div className="text-center">
            <div className="font-bold text-white">{opponent.hand.length}</div>
            <div>Hand</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-white">{opponent.library.length}</div>
            <div>Library</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-white">{opponent.battlefield.length}</div>
            <div>Field</div>
          </div>
        </div>
      </div>
    </Card>
  )
} 