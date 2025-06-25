import { 
  GameState, 
  GameAction, 
  GameResult, 
  GameError, 
  PlayerId, 
  PlayerState, 
  HandCard, 
  BattlefieldCard,
  InstanceId,
  Position,
  MTGCard,
  CardId
} from './types'

// Pure game logic - no side effects
export class GameEngine {
  static reduce(state: GameState, action: GameAction): GameResult<GameState> {
    try {
      switch (action.type) {
        case 'DRAW_CARD':
          return GameEngine.drawCard(state, action.playerId)
        
        case 'PLAY_CARD':
          return GameEngine.playCard(state, action.playerId, action.cardId, action.position)
        
        case 'TAP_CARD':
          return GameEngine.tapCard(state, action.playerId, action.cardId, action.tapped)
        
        case 'MOVE_CARD':
          return GameEngine.moveCard(state, action.playerId, action.cardId, action.position)
        
        case 'RETURN_TO_HAND':
          return GameEngine.returnToHand(state, action.playerId, action.cardId)
        
        case 'PLAYER_JOINED':
          return GameEngine.addPlayer(state, action.playerId, action.playerData)
        
        case 'PLAYER_LEFT':
          return GameEngine.removePlayer(state, action.playerId)
        
        default:
          return { success: false, error: { code: 'INVALID_ACTION', message: 'Unknown action type' } }
      }
    } catch (error) {
      return { 
        success: false, 
        error: { 
          code: 'ENGINE_ERROR', 
          message: error instanceof Error ? error.message : 'Unknown error',
          details: error
        } 
      }
    }
  }

  private static drawCard(state: GameState, playerId: PlayerId): GameResult<GameState> {
    const player = state.players.get(playerId)
    if (!player) {
      return { success: false, error: { code: 'PLAYER_NOT_FOUND', message: 'Player not found' } }
    }

    if (player.library.length === 0) {
      return { success: false, error: { code: 'EMPTY_LIBRARY', message: 'Cannot draw from empty library' } }
    }

    const drawnCard = player.library[0]
    const newHandCard: HandCard = {
      ...drawnCard,
      instanceId: `hand-${drawnCard.id}-${Date.now()}-${playerId}` as InstanceId
    }

    const updatedPlayer: PlayerState = {
      ...player,
      hand: [...player.hand, newHandCard],
      library: player.library.slice(1)
    }

    const newPlayers = new Map(state.players)
    newPlayers.set(playerId, updatedPlayer)

    return {
      success: true,
      data: {
        ...state,
        players: newPlayers
      }
    }
  }

  private static playCard(state: GameState, playerId: PlayerId, cardId: InstanceId, position: Position): GameResult<GameState> {
    const player = state.players.get(playerId)
    if (!player) {
      return { success: false, error: { code: 'PLAYER_NOT_FOUND', message: 'Player not found' } }
    }

    const handCard = player.hand.find(card => card.instanceId === cardId)
    if (!handCard) {
      return { success: false, error: { code: 'CARD_NOT_IN_HAND', message: 'Card not found in hand' } }
    }

    const battlefieldCard: BattlefieldCard = {
      ...handCard,
      instanceId: `battlefield-${handCard.instanceId}` as InstanceId,
      position,
      tapped: false,
      zIndex: Math.max(...player.battlefield.map(c => c.zIndex), 0) + 1,
      playerId
    }

    const updatedPlayer: PlayerState = {
      ...player,
      hand: player.hand.filter(card => card.instanceId !== cardId),
      battlefield: [...player.battlefield, battlefieldCard]
    }

    const newPlayers = new Map(state.players)
    newPlayers.set(playerId, updatedPlayer)

    return {
      success: true,
      data: {
        ...state,
        players: newPlayers
      }
    }
  }

  private static tapCard(state: GameState, playerId: PlayerId, cardId: InstanceId, tapped: boolean): GameResult<GameState> {
    const player = state.players.get(playerId)
    if (!player) {
      return { success: false, error: { code: 'PLAYER_NOT_FOUND', message: 'Player not found' } }
    }

    const cardIndex = player.battlefield.findIndex(card => card.instanceId === cardId)
    if (cardIndex === -1) {
      return { success: false, error: { code: 'CARD_NOT_ON_BATTLEFIELD', message: 'Card not found on battlefield' } }
    }

    const updatedBattlefield = [...player.battlefield]
    updatedBattlefield[cardIndex] = {
      ...updatedBattlefield[cardIndex],
      tapped
    }

    const updatedPlayer: PlayerState = {
      ...player,
      battlefield: updatedBattlefield
    }

    const newPlayers = new Map(state.players)
    newPlayers.set(playerId, updatedPlayer)

    return {
      success: true,
      data: {
        ...state,
        players: newPlayers
      }
    }
  }

  private static moveCard(state: GameState, playerId: PlayerId, cardId: InstanceId, position: Position): GameResult<GameState> {
    const player = state.players.get(playerId)
    if (!player) {
      return { success: false, error: { code: 'PLAYER_NOT_FOUND', message: 'Player not found' } }
    }

    const cardIndex = player.battlefield.findIndex(card => card.instanceId === cardId)
    if (cardIndex === -1) {
      return { success: false, error: { code: 'CARD_NOT_ON_BATTLEFIELD', message: 'Card not found on battlefield' } }
    }

    const updatedBattlefield = [...player.battlefield]
    updatedBattlefield[cardIndex] = {
      ...updatedBattlefield[cardIndex],
      position,
      zIndex: Math.max(...player.battlefield.map(c => c.zIndex), 0) + 1
    }

    const updatedPlayer: PlayerState = {
      ...player,
      battlefield: updatedBattlefield
    }

    const newPlayers = new Map(state.players)
    newPlayers.set(playerId, updatedPlayer)

    return {
      success: true,
      data: {
        ...state,
        players: newPlayers
      }
    }
  }

  private static returnToHand(state: GameState, playerId: PlayerId, cardId: InstanceId): GameResult<GameState> {
    const player = state.players.get(playerId)
    if (!player) {
      return { success: false, error: { code: 'PLAYER_NOT_FOUND', message: 'Player not found' } }
    }

    const battlefieldCard = player.battlefield.find(card => card.instanceId === cardId)
    if (!battlefieldCard) {
      return { success: false, error: { code: 'CARD_NOT_ON_BATTLEFIELD', message: 'Card not found on battlefield' } }
    }

    const handCard: HandCard = {
      ...battlefieldCard,
      instanceId: `hand-${battlefieldCard.id}-${Date.now()}` as InstanceId
    }

    const updatedPlayer: PlayerState = {
      ...player,
      hand: [...player.hand, handCard],
      battlefield: player.battlefield.filter(card => card.instanceId !== cardId)
    }

    const newPlayers = new Map(state.players)
    newPlayers.set(playerId, updatedPlayer)

    return {
      success: true,
      data: {
        ...state,
        players: newPlayers
      }
    }
  }

  private static addPlayer(state: GameState, playerId: PlayerId, playerData: Omit<PlayerState, 'id'>): GameResult<GameState> {
    if (state.players.has(playerId)) {
      return { success: false, error: { code: 'PLAYER_ALREADY_EXISTS', message: 'Player already in game' } }
    }

    const newPlayer: PlayerState = {
      id: playerId,
      ...playerData
    }

    const newPlayers = new Map(state.players)
    newPlayers.set(playerId, newPlayer)

    return {
      success: true,
      data: {
        ...state,
        players: newPlayers
      }
    }
  }

  private static removePlayer(state: GameState, playerId: PlayerId): GameResult<GameState> {
    if (!state.players.has(playerId)) {
      return { success: false, error: { code: 'PLAYER_NOT_FOUND', message: 'Player not found' } }
    }

    const newPlayers = new Map(state.players)
    newPlayers.delete(playerId)

    return {
      success: true,
      data: {
        ...state,
        players: newPlayers
      }
    }
  }

  // Utility functions
  static createInitialState(gameId: string): GameState {
    return {
      id: gameId as any,
      players: new Map(),
      currentPlayer: '' as PlayerId,
      phase: 'main1',
      turn: 1,
      status: 'waiting'
    }
  }

  static validateAction(state: GameState, action: GameAction): GameResult<true> {
    // Add validation logic here
    switch (action.type) {
      case 'DRAW_CARD':
        const player = state.players.get(action.playerId)
        if (!player) {
          return { success: false, error: { code: 'PLAYER_NOT_FOUND', message: 'Player not found' } }
        }
        if (player.library.length === 0) {
          return { success: false, error: { code: 'EMPTY_LIBRARY', message: 'Cannot draw from empty library' } }
        }
        break
      
      // Add more validation as needed
    }
    
    return { success: true, data: true }
  }
} 