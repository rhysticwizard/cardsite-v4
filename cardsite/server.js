const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3010;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Game state storage (in production, this would be Redis or database)
const gameStates = new Map();
const playerGameStates = new Map();

// Process-level error handlers (for debugging only - root causes are fixed)
process.on('uncaughtException', (error) => {
  console.error('🚨 Uncaught Exception (this should not happen with fixes):', error);
  console.error('Stack:', error.stack);
  process.exit(1); // Exit immediately - this indicates a real bug
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 Unhandled Rejection (this should not happen with fixes):', promise, 'reason:', reason);
  process.exit(1); // Exit immediately - this indicates a real bug
});

// Enhanced memory management and cleanup (FIXES MEMORY LEAKS)
const CLEANUP_INTERVALS = {
  GAME_STATE_CLEANUP: 30 * 60 * 1000, // 30 minutes
  MEMORY_CHECK: 10 * 60 * 1000, // 10 minutes
  INACTIVE_CLEANUP: 5 * 60 * 1000, // 5 minutes for inactive states
};

const MAX_AGES = {
  GAME_STATE: 2 * 60 * 60 * 1000, // 2 hours (reduced from 24)
  PLAYER_STATE: 1 * 60 * 60 * 1000, // 1 hour
  INACTIVE_STATE: 30 * 60 * 1000, // 30 minutes for completely inactive
};

// More aggressive cleanup for development stability
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  let cleanedGames = 0;
  let cleanedPlayers = 0;
  
  // Clean up old game states
  for (const [gameId, gameState] of gameStates.entries()) {
    const age = now - gameState.lastUpdated;
    const maxAge = gameState.participants.length === 0 ? MAX_AGES.INACTIVE_STATE : MAX_AGES.GAME_STATE;
    
    if (age > maxAge) {
      gameStates.delete(gameId);
      cleanedGames++;
    }
  }
  
  // Clean up old player states
  for (const [playerKey, playerState] of playerGameStates.entries()) {
    const age = now - playerState.lastUpdated;
    const maxAge = playerState.battlefieldCards.length === 0 && playerState.handCards.length === 0 
      ? MAX_AGES.INACTIVE_STATE 
      : MAX_AGES.PLAYER_STATE;
    
    if (age > maxAge) {
      playerGameStates.delete(playerKey);
      cleanedPlayers++;
    }
  }
  
  if (cleanedGames > 0 || cleanedPlayers > 0) {
    console.log(`🧹 Cleanup: ${cleanedGames} games, ${cleanedPlayers} player states | Active: ${gameStates.size} games, ${playerGameStates.size} players`);
  }
}, CLEANUP_INTERVALS.GAME_STATE_CLEANUP);

// Memory monitoring and alerts
const memoryMonitor = setInterval(() => {
  const usage = process.memoryUsage();
  const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(usage.heapTotal / 1024 / 1024);
  
  // Alert if memory usage is high
  if (heapUsedMB > 200) { // Alert at 200MB in development
    console.warn(`⚠️ High memory usage: ${heapUsedMB}MB / ${heapTotalMB}MB | Games: ${gameStates.size} | Players: ${playerGameStates.size}`);
    
    // Force aggressive cleanup if memory is critically high
    if (heapUsedMB > 300) {
      console.warn('🚨 Critical memory usage - forcing cleanup');
      gameStates.clear();
      playerGameStates.clear();
      if (global.gc) {
        global.gc();
      }
    }
  }
}, CLEANUP_INTERVALS.MEMORY_CHECK);

// Graceful cleanup on shutdown
process.on('SIGINT', () => {
  console.log('\n🔄 Shutting down server...');
  clearInterval(cleanupInterval);
  clearInterval(memoryMonitor);
  gameStates.clear();
  playerGameStates.clear();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🔄 Shutting down server...');
  clearInterval(cleanupInterval);
  clearInterval(memoryMonitor);
  gameStates.clear();
  playerGameStates.clear();
  process.exit(0);
});

function getPlayerStateKey(gameId, playerId) {
  return `${gameId}:${playerId}`;
}

function getPlayerGameState(gameId, playerId) {
  const playerStateKey = getPlayerStateKey(gameId, playerId);
  return playerGameStates.get(playerStateKey) || {
    battlefieldCards: [],
    handCards: [], // Store actual hand cards, not just count
    handCount: 0, // Keep count for backward compatibility
    libraryCards: [], // Store actual library cards
    libraryCount: 60,
    lastUpdated: Date.now()
  };
}

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Initialize Socket.IO
  const io = new Server(server, {
    cors: {
      origin: dev ? '*' : process.env.NEXTAUTH_URL,
      methods: ['GET', 'POST']
    },
    path: '/socket.io'
  });

  io.on('connection', (socket) => {
    console.log('🔌 Player connected:', socket.id);

    // Handle joining a game room
    socket.on('join-game', (data) => {
      try {
        const { gameId, userId, username } = data;
        
        if (!gameId || !userId || !username) {
          console.error('❌ Invalid join-game data:', data);
          socket.emit('error', { message: 'Invalid game data' });
          return;
        }
        
        console.log(`🎮 ${username} (${userId}) joining game ${gameId}`);
        
        // Join the socket room
        socket.join(gameId);
        
        // Initialize game state if it doesn't exist
        if (!gameStates.has(gameId)) {
          gameStates.set(gameId, {
            battlefieldCards: [],
            participants: [],
            lastUpdated: Date.now()
          });
        }
        
        const gameState = gameStates.get(gameId);
        
        // Add participant if not already present
        if (!gameState.participants.includes(userId)) {
          gameState.participants.push(userId);
        }
        
        // Send current game state to the joining player
        socket.emit('game-state', {
          battlefieldCards: gameState.battlefieldCards,
          participants: gameState.participants
        });
        
        // Notify other players in the room
        socket.to(gameId).emit('player-joined', {
          userId,
          username,
          socketId: socket.id
        });
        
        console.log(`✅ ${username} joined game ${gameId}. Total participants: ${gameState.participants.length}`);
      } catch (error) {
        console.error('❌ Error in join-game handler:', error);
        socket.emit('error', { message: 'Failed to join game' });
      }
    });

    // Handle card movement
    socket.on('card-moved', (data) => {
      const { gameId, cardId, position, playerId } = data;
      
      console.log(`🃏 Card moved in game ${gameId}:`, { cardId, position, playerId });
      
      // Update global game state
      const gameState = gameStates.get(gameId);
      if (gameState) {
        const cardIndex = gameState.battlefieldCards.findIndex(card => card.instanceId === cardId);
        if (cardIndex !== -1) {
          gameState.battlefieldCards[cardIndex].position = position;
          gameState.lastUpdated = Date.now();
        }
      }
      
      // Update player-specific game state
      const playerStateKey = getPlayerStateKey(gameId, playerId);
      const playerState = playerGameStates.get(playerStateKey);
      if (playerState) {
        const cardIndex = playerState.battlefieldCards.findIndex(card => card.instanceId === cardId);
        if (cardIndex !== -1) {
          playerState.battlefieldCards[cardIndex].position = position;
          playerState.lastUpdated = Date.now();
        }
      }
      
      // Broadcast to other players in the room (not the sender)
      socket.to(gameId).emit('card-moved', data);
    });

    // Handle card tap/untap
    socket.on('card-tapped', (data) => {
      const { gameId, cardId, tapped, playerId } = data;
      
      console.log(`👆 Card tapped in game ${gameId}:`, { cardId, tapped, playerId });
      
      // Update global game state
      const gameState = gameStates.get(gameId);
      if (gameState) {
        const cardIndex = gameState.battlefieldCards.findIndex(card => card.instanceId === cardId);
        if (cardIndex !== -1) {
          gameState.battlefieldCards[cardIndex].tapped = tapped;
          gameState.lastUpdated = Date.now();
        }
      }
      
      // Update player-specific game state
      const playerStateKey = getPlayerStateKey(gameId, playerId);
      const playerState = playerGameStates.get(playerStateKey);
      if (playerState) {
        const cardIndex = playerState.battlefieldCards.findIndex(card => card.instanceId === cardId);
        if (cardIndex !== -1) {
          playerState.battlefieldCards[cardIndex].tapped = tapped;
          playerState.lastUpdated = Date.now();
        }
      }
      
      // Broadcast to other players in the room
      socket.to(gameId).emit('card-tapped', data);
    });

    // Handle card played from hand
    socket.on('card-played', (data) => {
      const { gameId, card, position, playerId } = data;
      
      console.log(`🎴 Card played in game ${gameId}:`, { cardName: card.name, position, playerId });
      
      // Update global game state
      const gameState = gameStates.get(gameId);
      if (gameState) {
        gameState.battlefieldCards.push({
          ...card,
          position,
          playerId,
          tapped: false
        });
        gameState.lastUpdated = Date.now();
      }
      
      // Update player-specific game state
      const playerStateKey = getPlayerStateKey(gameId, playerId);
      let playerState = playerGameStates.get(playerStateKey);
      if (!playerState) {
        playerState = {
          battlefieldCards: [],
          handCards: [],
          handCount: 0,
          libraryCards: [],
          libraryCount: 60,
          lastUpdated: Date.now()
        };
        playerGameStates.set(playerStateKey, playerState);
      }
      
      playerState.battlefieldCards.push({
        ...card,
        position,
        playerId,
        tapped: false
      });
      // Remove the played card from hand cards
      playerState.handCards = playerState.handCards.filter(handCard => 
        handCard.instanceId !== card.instanceId
      );
      playerState.handCount = playerState.handCards.length;
      playerState.lastUpdated = Date.now();
      
      // Broadcast to other players in the room
      socket.to(gameId).emit('card-played', data);
    });

    // Handle card returned to hand
    socket.on('card-returned', (data) => {
      const { gameId, cardId, playerId } = data;
      
      console.log(`↩️ Card returned in game ${gameId}:`, { cardId, playerId });
      
      // Update global game state
      const gameState = gameStates.get(gameId);
      if (gameState) {
        gameState.battlefieldCards = gameState.battlefieldCards.filter(
          card => card.instanceId !== cardId
        );
        gameState.lastUpdated = Date.now();
      }
      
      // Update player-specific game state
      const playerStateKey = getPlayerStateKey(gameId, playerId);
      let playerState = playerGameStates.get(playerStateKey);
      if (!playerState) {
        playerState = {
          battlefieldCards: [],
          handCards: [],
          handCount: 0,
          libraryCards: [],
          libraryCount: 60,
          lastUpdated: Date.now()
        };
        playerGameStates.set(playerStateKey, playerState);
      }
      
      // Find the card being returned and add it back to hand
      const returnedCard = playerState.battlefieldCards.find(card => card.instanceId === cardId);
      if (returnedCard) {
        // Remove from battlefield
        playerState.battlefieldCards = playerState.battlefieldCards.filter(
          card => card.instanceId !== cardId
        );
        // Add back to hand
        playerState.handCards.push(returnedCard);
        playerState.handCount = playerState.handCards.length;
        playerState.lastUpdated = Date.now();
      }
      
      // Broadcast to other players in the room
      socket.to(gameId).emit('card-returned', data);
    });

    // Handle hand state changes
    socket.on('hand-state-changed', (data) => {
      const { gameId, handCards, libraryCards, playerId } = data;
      
      console.log(`🃏 Hand state changed for ${playerId} in game ${gameId}: ${handCards.length} hand cards, ${libraryCards?.length || 'unknown'} library cards`);
      
      // Update player-specific game state
      const playerStateKey = getPlayerStateKey(gameId, playerId);
      let playerState = playerGameStates.get(playerStateKey);
      if (!playerState) {
        playerState = {
          battlefieldCards: [],
          handCards: [],
          libraryCards: [],
          handCount: 0,
          libraryCount: 0,
          lastUpdated: Date.now()
        };
        playerGameStates.set(playerStateKey, playerState);
      }
      
      // Store actual card arrays for persistence
      playerState.handCards = [...handCards];
        playerState.handCount = handCards.length;
      
      // Also update library cards if provided
      if (libraryCards) {
        playerState.libraryCards = [...libraryCards];
        playerState.libraryCount = libraryCards.length;
      }
      
      playerState.lastUpdated = Date.now();
      
      console.log(`✅ Persisted game state for ${playerId}: ${playerState.handCards.length} hand, ${playerState.libraryCards.length} library`);
      
      // Broadcast to other players in the room (so they can see hand count changes)
      socket.to(gameId).emit('hand-state-changed', {
        playerId,
        handCards, // Send actual cards for spectators/opponents
        handCount: handCards.length
      });
    });

    // Handle player disconnect
    socket.on('disconnect', () => {
      console.log('🔌 Player disconnected:', socket.id);
      
      // Could implement cleanup logic here
      // For now, we'll keep the game state persistent
    });
  });

  // Expose getPlayerGameState function for API routes
  global.getPlayerGameState = getPlayerGameState;

  server
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`🚀 Server ready on http://${hostname}:${port}`);
      console.log('🎮 Socket.IO server ready for multiplayer gaming');
    });
}); 