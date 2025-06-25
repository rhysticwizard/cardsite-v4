// Domain Types - The foundation of our clean architecture
export type CardId = string & { __brand: 'CardId' }
export type PlayerId = string & { __brand: 'PlayerId' }
export type GameId = string & { __brand: 'GameId' }
export type InstanceId = string & { __brand: 'InstanceId' }

export interface Position {
  readonly x: number
  readonly y: number
}

export interface MTGCard {
  readonly id: CardId
  readonly name: string
  readonly manaCost?: string
  readonly cmc?: number
  readonly typeLine?: string
  readonly oracleText?: string
  readonly power?: string
  readonly toughness?: string
  readonly colors?: string[]
  readonly colorIdentity?: string[]
  readonly rarity?: string
  readonly setCode?: string
  readonly setName?: string
  readonly imageUris?: {
    readonly small?: string
    readonly normal?: string
    readonly large?: string
  }
  readonly prices?: {
    readonly usd?: string
    readonly usdFoil?: string
  }
}

export interface HandCard extends MTGCard {
  readonly instanceId: InstanceId
}

export interface BattlefieldCard extends MTGCard {
  readonly instanceId: InstanceId
  readonly position: Position
  readonly tapped: boolean
  readonly facedown?: boolean
  readonly zIndex: number
  readonly playerId: PlayerId
}

export interface PlayerState {
  readonly id: PlayerId
  readonly username: string
  readonly hand: readonly HandCard[]
  readonly library: readonly MTGCard[]
  readonly battlefield: readonly BattlefieldCard[]
  readonly isConnected: boolean
}

export interface GameState {
  readonly id: GameId
  readonly players: ReadonlyMap<PlayerId, PlayerState>
  readonly currentPlayer: PlayerId
  readonly phase: GamePhase
  readonly turn: number
  readonly status: GameStatus
}

export type GamePhase = 
  | 'untap'
  | 'upkeep' 
  | 'draw'
  | 'main1'
  | 'combat'
  | 'main2'
  | 'end'

export type GameStatus = 
  | 'waiting'
  | 'active'
  | 'paused'
  | 'ended'

// Game Actions - All possible state changes
export type GameAction = 
  | { type: 'DRAW_CARD', playerId: PlayerId }
  | { type: 'PLAY_CARD', playerId: PlayerId, cardId: InstanceId, position: Position }
  | { type: 'TAP_CARD', playerId: PlayerId, cardId: InstanceId, tapped: boolean }
  | { type: 'MOVE_CARD', playerId: PlayerId, cardId: InstanceId, position: Position }
  | { type: 'RETURN_TO_HAND', playerId: PlayerId, cardId: InstanceId }
  | { type: 'SHUFFLE_LIBRARY', playerId: PlayerId }
  | { type: 'PLAYER_JOINED', playerId: PlayerId, playerData: Omit<PlayerState, 'id'> }
  | { type: 'PLAYER_LEFT', playerId: PlayerId }
  | { type: 'NEXT_PHASE' }
  | { type: 'NEXT_TURN' }

// Game Events - What happened (for networking)
export type GameEvent = GameAction & {
  readonly timestamp: number
  readonly eventId: string
}

// Results instead of exceptions
export type GameResult<T> = 
  | { readonly success: true, readonly data: T }
  | { readonly success: false, readonly error: GameError }

export interface GameError {
  readonly code: string
  readonly message: string
  readonly details?: unknown
}

// Configuration
export interface GameConfig {
  readonly maxPlayers: number
  readonly startingHandSize: number
  readonly enableSpectators: boolean
  readonly enableRealTimeSync: boolean
  readonly socketUrl: string
} 