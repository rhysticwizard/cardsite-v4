import React from 'react'
import { io, Socket } from 'socket.io-client'
import { GameAction, GameEvent, GameId, PlayerId, GameResult, GameState } from './types'

export interface GameSyncEvents {
  onGameAction: (event: GameEvent) => void
  onPlayerJoined: (playerId: PlayerId, playerData: any) => void
  onPlayerLeft: (playerId: PlayerId) => void
  onGameStateSync: (state: Partial<GameState>) => void
  onError: (error: any) => void
}

export class GameSync {
  private socket: Socket | null = null
  private isConnected = false
  private eventHandlers: Partial<GameSyncEvents> = {}

  constructor(
    private gameId: GameId,
    private playerId: PlayerId,
    private socketUrl: string = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3010'
  ) {}

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.socket = io(this.socketUrl, {
          transports: ['websocket', 'polling'],
          timeout: 5000,
        })

        this.socket.on('connect', () => {
          console.log('🔌 Connected to game server')
          this.isConnected = true
          
          // Join the game room
          this.socket?.emit('join-game', {
            gameId: this.gameId,
            playerId: this.playerId
          })
          
          resolve()
        })

        this.socket.on('disconnect', () => {
          console.log('🔌 Disconnected from game server')
          this.isConnected = false
        })

        this.socket.on('connect_error', (error) => {
          console.error('🚫 Socket connection error:', error)
          this.isConnected = false
          reject(error)
        })

        // Game-specific event handlers
        this.setupGameEventHandlers()

      } catch (error) {
        reject(error)
      }
    })
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
      this.isConnected = false
    }
  }

  // Send action to other players
  broadcastAction(action: GameAction): void {
    if (!this.isConnected || !this.socket) {
      console.warn('Cannot broadcast action - not connected')
      return
    }

    const event: GameEvent = {
      ...action,
      timestamp: Date.now(),
      eventId: `${this.playerId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }

    this.socket.emit('game-action', {
      gameId: this.gameId,
      event
    })
  }

  // Subscribe to events
  on<K extends keyof GameSyncEvents>(event: K, handler: GameSyncEvents[K]): () => void {
    this.eventHandlers[event] = handler

    // Return unsubscribe function
    return () => {
      delete this.eventHandlers[event]
    }
  }

  private setupGameEventHandlers(): void {
    if (!this.socket) return

    // Receive actions from other players
    this.socket.on('game-action', (data: { event: GameEvent }) => {
      // Don't process our own actions (only for actions that have playerId)
      if ('playerId' in data.event && data.event.playerId === this.playerId) return
      
      this.eventHandlers.onGameAction?.(data.event)
    })

    // Player management
    this.socket.on('player-joined', (data: { playerId: PlayerId, playerData: any }) => {
      if (data.playerId !== this.playerId) {
        this.eventHandlers.onPlayerJoined?.(data.playerId, data.playerData)
      }
    })

    this.socket.on('player-left', (data: { playerId: PlayerId }) => {
      this.eventHandlers.onPlayerLeft?.(data.playerId)
    })

    // Full state synchronization (for conflict resolution)
    this.socket.on('game-state-sync', (data: { state: Partial<GameState> }) => {
      this.eventHandlers.onGameStateSync?.(data.state)
    })

    // Error handling
    this.socket.on('error', (error: any) => {
      console.error('🚫 Game sync error:', error)
      this.eventHandlers.onError?.(error)
    })
  }

  // Request full state sync (for conflict resolution)
  requestStateSync(): void {
    if (this.isConnected && this.socket) {
      this.socket.emit('request-state-sync', { gameId: this.gameId })
    }
  }

  // Check connection status
  get connected(): boolean {
    return this.isConnected && this.socket?.connected === true
  }
}

// Factory function for easier usage
export function createGameSync(
  gameId: string, 
  playerId: string,
  socketUrl?: string
): GameSync {
  return new GameSync(
    gameId as GameId,
    playerId as PlayerId,
    socketUrl
  )
}

// Hook for React integration
export function useGameSync(
  gameId: string,
  playerId: string,
  events: Partial<GameSyncEvents>
) {
  const syncRef = React.useRef<GameSync | null>(null)
  const [isConnected, setIsConnected] = React.useState(false)

  React.useEffect(() => {
    const sync = createGameSync(gameId, playerId)
    syncRef.current = sync

    // Set up event handlers
    const unsubscribers = Object.entries(events).map(([event, handler]) => {
      return sync.on(event as keyof GameSyncEvents, handler as any)
    })

    // Connect
    sync.connect()
      .then(() => setIsConnected(true))
      .catch(error => {
        console.error('Failed to connect to game sync:', error)
        events.onError?.(error)
      })

    return () => {
      // Cleanup
      unsubscribers.forEach(unsub => unsub())
      sync.disconnect()
      setIsConnected(false)
    }
  }, [gameId, playerId])

  return {
    sync: syncRef.current,
    isConnected,
    broadcastAction: (action: GameAction) => syncRef.current?.broadcastAction(action),
    requestStateSync: () => syncRef.current?.requestStateSync()
  }
} 