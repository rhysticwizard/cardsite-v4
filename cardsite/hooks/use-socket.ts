import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseSocketProps {
  gameId: string;
  userId: string;
  username: string;
}

interface GameState {
  battlefieldCards: any[];
  participants: string[];
}

interface SocketEvents {
  onCardMoved: (data: { cardId: string; position: { x: number; y: number }; playerId: string }) => void;
  onCardTapped: (data: { cardId: string; tapped: boolean; playerId: string }) => void;
  onCardPlayed: (data: { card: any; position: { x: number; y: number }; playerId: string }) => void;
  onCardReturned: (data: { cardId: string; playerId: string }) => void;
  onHandStateChanged: (data: { handCards: any[]; playerId: string }) => void;
  onPlayerJoined: (data: { userId: string; username: string; socketId: string }) => void;
  onGameState: (data: GameState) => void;
}

export function useSocket({ gameId, userId, username }: UseSocketProps) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Initialize real Socket.IO connection
  useEffect(() => {
    console.log('🔌 Initializing Socket.IO connection for game:', gameId);
    
    // Create socket connection
    const socket = io(process.env.NODE_ENV === 'development' ? 'http://localhost:3010' : '', {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true
    });

    socketRef.current = socket;

    // Connection event handlers
    socket.on('connect', () => {
      console.log('✅ Socket.IO connected:', socket.id);
      setIsConnected(true);
      setConnectionError(null);
      
      // Join the game room
      socket.emit('join-game', { gameId, userId, username });
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ Socket.IO disconnected:', reason);
      setIsConnected(false);
      setConnectionError(`Disconnected: ${reason}`);
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Socket.IO connection error:', error);
      setIsConnected(false);
      setConnectionError(error.message);
    });

    // Cleanup on unmount
    return () => {
      console.log('🧹 Cleaning up Socket.IO connection');
      if (socket) {
        socket.disconnect();
      }
      setIsConnected(false);
    };
  }, [gameId, userId, username]);

  // Socket event subscription with real events
  const subscribeToEvents = useCallback((events: SocketEvents) => {
    const socket = socketRef.current;
    if (!socket || !isConnected) {
      console.warn('⚠️ Cannot subscribe to events: socket not connected');
      return () => {};
    }

    console.log('📡 Subscribing to Socket.IO events');

    // Subscribe to all events
    socket.on('card-moved', events.onCardMoved);
    socket.on('card-tapped', events.onCardTapped);
    socket.on('card-played', events.onCardPlayed);
    socket.on('card-returned', events.onCardReturned);
    socket.on('hand-state-changed', events.onHandStateChanged);
    socket.on('player-joined', events.onPlayerJoined);
    socket.on('game-state', events.onGameState);

    // Return cleanup function
    return () => {
      console.log('🧹 Unsubscribing from Socket.IO events');
      socket.off('card-moved', events.onCardMoved);
      socket.off('card-tapped', events.onCardTapped);
      socket.off('card-played', events.onCardPlayed);
      socket.off('card-returned', events.onCardReturned);
      socket.off('hand-state-changed', events.onHandStateChanged);
      socket.off('player-joined', events.onPlayerJoined);
      socket.off('game-state', events.onGameState);
    };
  }, [isConnected]);

  // Emit card movement
  const emitCardMoved = useCallback((cardId: string, position: { x: number; y: number }) => {
    const socket = socketRef.current;
    if (!socket || !isConnected) {
      console.warn('⚠️ Cannot emit card-moved: socket not connected');
      return;
    }

    console.log('📤 Emitting card-moved:', { cardId, position });
    socket.emit('card-moved', { 
      gameId, 
      cardId, 
      position, 
      playerId: userId 
    });
  }, [isConnected, gameId, userId]);

  // Emit card tap/untap
  const emitCardTapped = useCallback((cardId: string, tapped: boolean) => {
    const socket = socketRef.current;
    if (!socket || !isConnected) {
      console.warn('⚠️ Cannot emit card-tapped: socket not connected');
      return;
    }

    console.log('📤 Emitting card-tapped:', { cardId, tapped });
    socket.emit('card-tapped', { 
      gameId, 
      cardId, 
      tapped, 
      playerId: userId 
    });
  }, [isConnected, gameId, userId]);

  // Emit card played from hand
  const emitCardPlayed = useCallback((card: any, position: { x: number; y: number }) => {
    const socket = socketRef.current;
    if (!socket || !isConnected) {
      console.warn('⚠️ Cannot emit card-played: socket not connected');
      return;
    }

    console.log('📤 Emitting card-played:', { cardName: card.name, position });
    socket.emit('card-played', { 
      gameId, 
      card, 
      position, 
      playerId: userId 
    });
  }, [isConnected, gameId, userId]);

  // Emit card returned to hand
  const emitCardReturned = useCallback((cardId: string) => {
    const socket = socketRef.current;
    if (!socket || !isConnected) {
      console.warn('⚠️ Cannot emit card-returned: socket not connected');
      return;
    }

    console.log('📤 Emitting card-returned:', { cardId });
    socket.emit('card-returned', { 
      gameId, 
      cardId, 
      playerId: userId 
    });
  }, [isConnected, gameId, userId]);

  // Emit hand state change
  const emitHandStateChanged = useCallback((handCards: any[], libraryCards?: any[]) => {
    const socket = socketRef.current;
    if (!socket || !isConnected) {
      console.warn('⚠️ Cannot emit hand-state-changed: socket not connected');
      return;
    }

    console.log('📤 Emitting hand-state-changed:', { 
      handCount: handCards.length, 
      libraryCount: libraryCards?.length || 'not provided' 
    });
    socket.emit('hand-state-changed', { 
      gameId, 
      handCards, 
      libraryCards,
      playerId: userId 
    });
  }, [isConnected, gameId, userId]);

  return {
    isConnected,
    connectionError,
    subscribeToEvents,
    emitCardMoved,
    emitCardTapped,
    emitCardPlayed,
    emitCardReturned,
    emitHandStateChanged
  };
} 