'use client'

import React from 'react'
import { useGameState } from '@/hooks/use-game-state'
import { useSocket } from '@/hooks/use-socket'
import { GameEngine } from '@/lib/game/engine'
import { PlayerId, GameId, MTGCard, CardId, GameAction } from '@/lib/game/types'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { GameBoard } from './game-board'
import { EnhancedGameBoard } from './enhanced-game-board'

// Demo component showing the new architecture with real-time sync
export function GameStateDemo() {
  const [useEnhanced, setUseEnhanced] = React.useState(true)
  const [gameId] = React.useState('demo-game-' + Math.random().toString(36).substr(2, 9))
  const [userId] = React.useState('user-' + Math.random().toString(36).substr(2, 9))
  const [username] = React.useState('DemoPlayer')
  
  // Initialize game state with proper types
  const initialState = GameEngine.createInitialState(gameId as GameId)
  
  const [gameState, actions] = useGameState({
    initialState,
    onAction: (action, result) => {
      console.log('✅ Local Action succeeded:', action.type, result.success)
      // Emit the action to other players via socket
      if (result.success) {
        emitGameAction(action)
      }
    },
    onError: (error) => {
      console.error('❌ Action failed:', error)
    }
  })

  // Socket integration for real-time sync
  const {
    isConnected,
    connectionError,
    subscribeToEvents,
    emitCardMoved,
    emitCardTapped,
    emitCardPlayed,
    emitCardReturned
  } = useSocket({
    gameId,
    userId,
    username
  })

  // Subscribe to socket events for real-time updates
  React.useEffect(() => {
    if (!isConnected) return

    const unsubscribe = subscribeToEvents({
      onCardMoved: ({ cardId, position, playerId }) => {
        console.log('🔄 Received card moved:', { cardId, position, playerId })
        // Apply the move action from remote player
        actions.moveCard(playerId as PlayerId, cardId, position)
      },
      
      onCardTapped: ({ cardId, tapped, playerId }) => {
        console.log('🔄 Received card tapped:', { cardId, tapped, playerId })
        // Apply the tap action from remote player
        actions.tapCard(playerId as PlayerId, cardId, tapped)
      },
      
      onCardPlayed: ({ card, position, playerId }) => {
        console.log('🔄 Received card played:', { cardName: card.name, position, playerId })
        // Apply the play card action from remote player
        actions.playCard(playerId as PlayerId, card.instanceId, position)
      },
      
      onCardReturned: ({ cardId, playerId }) => {
        console.log('🔄 Received card returned:', { cardId, playerId })
        // Apply the return to hand action from remote player
        actions.returnToHand(playerId as PlayerId, cardId)
      },
      
      onPlayerJoined: ({ userId: newUserId, username: newUsername, socketId }) => {
        console.log('🔄 Player joined:', { newUserId, newUsername, socketId })
        // Add the new player to our game state
        actions.dispatch({
          type: 'PLAYER_JOINED',
          playerId: newUserId as PlayerId,
          playerData: {
            username: newUsername,
            hand: [],
            library: demoCards,
            battlefield: [],
            isConnected: true
          }
        })
      },
      
      onGameState: (remoteGameState) => {
        console.log('🔄 Received full game state:', remoteGameState)
        // Could implement full state sync here if needed
      }
    })

    return unsubscribe
  }, [isConnected, subscribeToEvents, actions])

  // Helper function to emit game actions via socket
  const emitGameAction = React.useCallback((action: GameAction) => {
    switch (action.type) {
      case 'MOVE_CARD':
        emitCardMoved(action.cardId, action.position)
        break
      case 'TAP_CARD':
        emitCardTapped(action.cardId, action.tapped)
        break
      case 'PLAY_CARD':
        const player = gameState.players.get(action.playerId)
        const card = player?.hand.find(c => c.instanceId === action.cardId)
        if (card) {
          emitCardPlayed(card, action.position)
        }
        break
      case 'RETURN_TO_HAND':
        emitCardReturned(action.cardId)
        break
    }
  }, [emitCardMoved, emitCardTapped, emitCardPlayed, emitCardReturned, gameState])

  // Demo player data
  const playerId = userId as PlayerId
  const demoCards: MTGCard[] = [
    {
      id: 'lightning-bolt' as CardId,
      name: 'Lightning Bolt',
      manaCost: '{R}',
      cmc: 1,
      typeLine: 'Instant',
      oracleText: 'Lightning Bolt deals 3 damage to any target.',
      imageUris: {
        normal: 'https://cards.scryfall.io/normal/front/f/2/f29ba16f-c8fb-42fe-aabf-87089cb214a7.jpg?1673147852'
      }
    },
    {
      id: 'counterspell' as CardId,
      name: 'Counterspell',
      manaCost: '{U}{U}',
      cmc: 2,
      typeLine: 'Instant',
      oracleText: 'Counter target spell.',
      imageUris: {
        normal: 'https://cards.scryfall.io/normal/front/a/4/a457f404-ddf1-40fa-b0f0-94319d3e0dad.jpg?1645328634'
      }
    },
    {
      id: 'giant-growth' as CardId,
      name: 'Giant Growth',
      manaCost: '{G}',
      cmc: 1,
      typeLine: 'Instant',
      oracleText: 'Target creature gets +3/+3 until end of turn.',
      imageUris: {
        normal: 'https://cards.scryfall.io/normal/front/0/6/06ec9e8b-4bd8-4caf-a559-6514b7ab4ca4.jpg?1557576917'
      }
    },
    {
      id: 'sol-ring' as CardId,
      name: 'Sol Ring',
      manaCost: '{1}',
      cmc: 1,
      typeLine: 'Artifact',
      oracleText: '{T}: Add {C}{C}.',
      imageUris: {
        normal: 'https://cards.scryfall.io/normal/front/1/9/199cde21-5bc3-49cd-acd4-bae3af6e5881.jpg?1654118835'
      }
    },
    {
      id: 'dark-ritual' as CardId,
      name: 'Dark Ritual',
      manaCost: '{B}',
      cmc: 1,
      typeLine: 'Instant',
      oracleText: 'Add {B}{B}{B}.',
      imageUris: {
        normal: 'https://cards.scryfall.io/normal/front/9/5/95f27eeb-6f14-4db3-adb9-9be5ed76b34b.jpg?1628801678'
      }
    }
  ]

  // Add player if not exists
  React.useEffect(() => {
    if (!gameState.players.has(playerId)) {
      actions.dispatch({
        type: 'PLAYER_JOINED',
        playerId,
        playerData: {
          username: username,
          hand: [],
          library: demoCards,
          battlefield: [],
          isConnected: true
        }
      })
    }
  }, [gameState.players, playerId, actions, demoCards, username])

  const player = gameState.players.get(playerId)
  if (!player) return <div>Loading player...</div>

  // Create actions object for the GameBoard
  const gameActions = {
    drawCard: actions.drawCard,
    playCard: actions.playCard,
    tapCard: actions.tapCard,
    moveCard: actions.moveCard,
    returnToHand: actions.returnToHand
  }

  return (
    <div className="min-h-screen">
      {/* New Architecture Demo - Full Game Board */}
      <div className="mb-8">
        <div className="bg-black/80 text-white p-4 mb-4">
          <h2 className="text-2xl font-bold mb-2">🎮 Real-Time Multiplayer Game Architecture Demo</h2>
          <p className="text-sm text-gray-300 mb-2">
            This demonstrates the new composed component architecture with real-time socket synchronization.
          </p>
          <div className="flex items-center gap-4 mb-4">
            <div className={`flex items-center gap-2 ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
              {isConnected ? 'Connected' : 'Disconnected'}
            </div>
            <div className="text-xs text-gray-400">
              Game ID: {gameId} | User: {username}
            </div>
            {connectionError && (
              <div className="text-xs text-red-400">
                Error: {connectionError}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setUseEnhanced(false)}
              className={`px-3 py-1 rounded text-sm ${!useEnhanced ? 'bg-blue-600' : 'bg-gray-600'}`}
            >
              Basic Version
            </button>
            <button
              onClick={() => setUseEnhanced(true)}
              className={`px-3 py-1 rounded text-sm ${useEnhanced ? 'bg-blue-600' : 'bg-gray-600'}`}
            >
              Enhanced (Multi-select)
            </button>
          </div>
        </div>
        
        {/* Full Game Board */}
        {useEnhanced ? (
          <EnhancedGameBoard
            gameState={gameState}
            currentPlayerId={playerId}
            actions={gameActions}
          />
        ) : (
          <GameBoard
            gameState={gameState}
            currentPlayerId={playerId}
            actions={gameActions}
          />
        )}
      </div>

      {/* Original Demo UI - For comparison */}
      <div className="p-6 space-y-4 fixed top-4 right-4 w-96 bg-white/95 backdrop-blur-sm rounded-lg shadow-xl z-50 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-bold">🔧 Debug Panel</h3>
      
      {/* Connection Status */}
      <Card className={`p-4 border-2 ${isConnected ? 'border-green-500' : 'border-red-500'}`}>
        <h3 className="font-semibold mb-2">🔌 Real-Time Connection</h3>
        <div className="text-sm space-y-1">
          <div>
            <strong>Status:</strong> 
            <span className={isConnected ? 'text-green-600' : 'text-red-600'}>
              {isConnected ? ' Connected' : ' Disconnected'}
            </span>
          </div>
          <div><strong>Game ID:</strong> {gameId}</div>
          <div><strong>Players:</strong> {gameState.players.size}</div>
          {connectionError && (
            <div className="text-red-600 text-xs">
              <strong>Error:</strong> {connectionError}
            </div>
          )}
        </div>
      </Card>

      {/* Game State Display */}
      <Card className="p-4">
        <h3 className="font-semibold mb-2">Game State</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <strong>Game ID:</strong> {gameState.id.slice(0, 12)}...
          </div>
          <div>
            <strong>Status:</strong> {gameState.status}
          </div>
          <div>
            <strong>Phase:</strong> {gameState.phase}
          </div>
          <div>
            <strong>Turn:</strong> {gameState.turn}
          </div>
        </div>
      </Card>

      {/* Player State Display */}
      <Card className="p-4">
        <h3 className="font-semibold mb-2">👤 Player: {player.username}</h3>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <strong>Hand:</strong> {player.hand.length} cards
          </div>
          <div>
            <strong>Library:</strong> {player.library.length} cards
          </div>
          <div>
            <strong>Battlefield:</strong> {player.battlefield.length} cards
          </div>
        </div>
      </Card>

      {/* All Players Display */}
      <Card className="p-4">
        <h3 className="font-semibold mb-2">👥 All Players ({gameState.players.size})</h3>
        <div className="space-y-2 text-xs">
          {Array.from(gameState.players.values()).map(p => (
            <div key={p.id} className={`p-2 rounded ${p.id === playerId ? 'bg-blue-100' : 'bg-gray-100'}`}>
              <div><strong>{p.username}</strong> {p.id === playerId && '(You)'}</div>
              <div>Hand: {p.hand.length} | Library: {p.library.length} | Battlefield: {p.battlefield.length}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Action Buttons */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3">🎯 Real-Time Actions</h3>
        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={() => actions.drawCard(playerId)}
            disabled={player.library.length === 0 || !isConnected}
          >
            Draw Card ({player.library.length} left)
          </Button>

          <Button
            onClick={() => {
              if (player.hand.length > 0) {
                const card = player.hand[0]
                actions.playCard(playerId, card.instanceId, { x: 400 + Math.random() * 200, y: 300 + Math.random() * 200 })
              }
            }}
            disabled={player.hand.length === 0 || !isConnected}
          >
            Play First Card
          </Button>

          <Button
            onClick={() => {
              if (player.battlefield.length > 0) {
                const card = player.battlefield[0]
                actions.tapCard(playerId, card.instanceId, !card.tapped)
              }
            }}
            disabled={player.battlefield.length === 0 || !isConnected}
          >
            Toggle Tap First Card
          </Button>

          <Button
            onClick={() => {
              if (player.battlefield.length > 0) {
                const card = player.battlefield[0]
                actions.returnToHand(playerId, card.instanceId)
              }
            }}
            disabled={player.battlefield.length === 0 || !isConnected}
          >
            Return First Card
          </Button>
        </div>
        
        {!isConnected && (
          <div className="text-xs text-red-600 mt-2">
            ⚠️ Real-time sync disabled - not connected to server
          </div>
        )}
      </Card>
      
      {/* Instructions */}
      <Card className="p-4 bg-blue-50">
        <h3 className="font-semibold mb-2">📝 How to Test Real-Time Sync</h3>
        <div className="text-xs space-y-1">
          <p>1. Open this page in multiple browser tabs/windows</p>
          <p>2. Each tab gets a unique player ID automatically</p>
          <p>3. Play cards in one tab - watch other tabs update instantly!</p>
          <p>4. Hand zones sync in real-time between all connected players</p>
          <p>5. Try the enhanced multi-select features (drag selection, keyboard shortcuts)</p>
        </div>
      </Card>
    </div>
    </div>
  )
} 