import { useCallback, useMemo } from 'react'
import { CollisionDetector, BoundaryConfig, CardDimensions, Position } from '@/lib/game/collision'

export function useCollision() {
  // Get current card dimensions
  const cardDimensions = useMemo(() => {
    return CollisionDetector.getCardDimensions()
  }, [])

  // Calculate boundaries
  const boundaries = useMemo(() => {
    return CollisionDetector.calculateBoundaries(cardDimensions)
  }, [cardDimensions])

  // Constrain position to boundaries
  const constrainPosition = useCallback((position: Position): Position => {
    return CollisionDetector.constrainToBoundaries(position, boundaries)
  }, [boundaries])

  // Check if position is valid
  const isValidPosition = useCallback((position: Position): boolean => {
    return CollisionDetector.isWithinBoundaries(position, boundaries)
  }, [boundaries])

  // Get card bounds for a position
  const getCardBounds = useCallback((position: Position) => {
    return CollisionDetector.getCardBounds(position, cardDimensions)
  }, [cardDimensions])

  return {
    cardDimensions,
    boundaries,
    constrainPosition,
    isValidPosition,
    getCardBounds
  }
} 