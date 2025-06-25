'use client'

import React from 'react'
import { PlayerId } from '@/lib/game/types'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface DeckZoneProps {
  playerId: PlayerId
  librarySize: number
  onDrawCard: (playerId: PlayerId) => void
  disabled?: boolean
}

export function DeckZone({ playerId, librarySize, onDrawCard, disabled = false }: DeckZoneProps) {
  const handleDrawCard = () => {
    if (disabled || librarySize === 0) return
    onDrawCard(playerId)
  }

  return (
    <div className="flex flex-col items-center space-y-2">
      {/* Library */}
      <Card className="relative w-20 h-28 bg-gray-800 border-2 border-gray-600 overflow-hidden">
        <Button
          onClick={handleDrawCard}
          disabled={disabled || librarySize === 0}
          className="w-full h-full p-0 bg-transparent hover:bg-blue-600/20 border-0 rounded-lg"
        >
          {/* Card Back Image */}
          <img
            src="/MTG_CARD_BACK.webp"
            alt="MTG Card Back"
            className="w-full h-full object-cover"
            draggable={false}
          />
        </Button>
        
        {/* Stack Effect */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-gray-700 rounded-lg transform translate-x-0.5 translate-y-0.5 -z-10" />
          <div className="absolute inset-0 bg-gray-600 rounded-lg transform translate-x-1 translate-y-1 -z-20" />
        </div>

        {/* Count Badge */}
        <div className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
          {librarySize}
        </div>

        {/* Empty State */}
        {librarySize === 0 && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center rounded-lg">
            <span className="text-red-400 text-xs font-bold">EMPTY</span>
          </div>
        )}
      </Card>

      {/* Label */}
      <div className="text-white text-xs font-medium bg-black/50 px-2 py-1 rounded">
        Library
      </div>
    </div>
  )
} 