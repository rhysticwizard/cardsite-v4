import { useReducer, useCallback, useRef } from 'react'
import { GameEngine } from '@/lib/game/engine'
import { GameState, GameAction, GameResult, PlayerId } from '@/lib/game/types'

interface UseGameStateOptions {
  initialState: GameState
  onAction?: (action: GameAction, result: GameResult<GameState>) => void
  onError?: (error: any) => void
}

interface GameStateActions {
  drawCard: (playerId: PlayerId) => GameResult<GameState>
  playCard: (playerId: PlayerId, cardId: string, position: { x: number, y: number }) => GameResult<GameState>
  tapCard: (playerId: PlayerId, cardId: string, tapped: boolean) => GameResult<GameState>
  moveCard: (playerId: PlayerId, cardId: string, position: { x: number, y: number }) => GameResult<GameState>
  returnToHand: (playerId: PlayerId, cardId: string) => GameResult<GameState>
  dispatch: (action: GameAction) => GameResult<GameState>
}

function gameReducer(state: GameState, action: GameAction): GameState {
  const result = GameEngine.reduce(state, action)
  
  if (result.success) {
    return result.data
  } else {
    // Log error but don't crash - return previous state
    console.error('Game action failed:', result.error)
    return state
  }
}

export function useGameState({ 
  initialState, 
  onAction, 
  onError 
}: UseGameStateOptions): [GameState, GameStateActions] {
  const [state, dispatchInternal] = useReducer(gameReducer, initialState)
  const stateRef = useRef(state)
  stateRef.current = state

  const dispatch = useCallback((action: GameAction): GameResult<GameState> => {
    try {
      // Validate action first
      const validation = GameEngine.validateAction(stateRef.current, action)
      if (!validation.success) {
        onError?.(validation.error)
        return validation as GameResult<GameState>
      }

      // Apply action
      const result = GameEngine.reduce(stateRef.current, action)
      
      if (result.success) {
        dispatchInternal(action)
        onAction?.(action, result)
      } else {
        onError?.(result.error)
      }

      return result
    } catch (error) {
      const gameError = {
        success: false as const,
        error: {
          code: 'DISPATCH_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          details: error
        }
      }
      onError?.(gameError.error)
      return gameError
    }
  }, [onAction, onError])

  const actions: GameStateActions = {
    drawCard: useCallback((playerId: PlayerId) => {
      return dispatch({ type: 'DRAW_CARD', playerId })
    }, [dispatch]),

    playCard: useCallback((playerId: PlayerId, cardId: string, position: { x: number, y: number }) => {
      return dispatch({ 
        type: 'PLAY_CARD', 
        playerId, 
        cardId: cardId as any, 
        position 
      })
    }, [dispatch]),

    tapCard: useCallback((playerId: PlayerId, cardId: string, tapped: boolean) => {
      return dispatch({ 
        type: 'TAP_CARD', 
        playerId, 
        cardId: cardId as any, 
        tapped 
      })
    }, [dispatch]),

    moveCard: useCallback((playerId: PlayerId, cardId: string, position: { x: number, y: number }) => {
      return dispatch({ 
        type: 'MOVE_CARD', 
        playerId, 
        cardId: cardId as any, 
        position 
      })
    }, [dispatch]),

    returnToHand: useCallback((playerId: PlayerId, cardId: string) => {
      return dispatch({ 
        type: 'RETURN_TO_HAND', 
        playerId, 
        cardId: cardId as any 
      })
    }, [dispatch]),

    dispatch
  }

  return [state, actions]
}

// Selector hooks for performance
export function usePlayerState(gameState: GameState, playerId: PlayerId) {
  return gameState.players.get(playerId)
}

export function useBattlefieldCards(gameState: GameState, playerId?: PlayerId) {
  const player = playerId ? gameState.players.get(playerId) : null
  return player?.battlefield || []
}

export function useHandCards(gameState: GameState, playerId: PlayerId) {
  const player = gameState.players.get(playerId)
  return player?.hand || []
}

export function useLibraryCards(gameState: GameState, playerId: PlayerId) {
  const player = gameState.players.get(playerId)
  return player?.library || []
} 