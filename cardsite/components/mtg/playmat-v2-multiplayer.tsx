'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { DndContext, DragOverlay, PointerSensor, MouseSensor, TouchSensor, useSensor, useSensors, DragStartEvent, DragEndEvent, useDroppable, useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { MTGCard } from '@/lib/types/mtg';
import { PlaytestCard } from './playtest-card';
import { HandZone, type HandCard } from './hand-zone';
import { DeckZone } from './deck-zone';
import { secureApiRequest } from '@/lib/csrf';
import { useSocket } from '@/hooks/use-socket';
import { PlayerSwitcher } from './player-switcher';

/**
 * PlaymatV2Multiplayer - Perfect 1:1 recreation of PlaymatV2 with minimal multiplayer support
 * 
 * Features (copied exactly from original):
 * - Responsive collision detection for card boundaries
 * - Desktop-style multi-select with drag selection
 * - Smart group tapping (normalizes mixed states)
 * - Multi-card drag and drop with formation preservation
 * - Card preview on hover
 * - ONLY multiplayer addition: playerId field and ownership checks
 */

// Interface for battlefield cards (copied exactly from original + playerId)
interface BattlefieldCard extends MTGCard {
  instanceId: string;
  position: {
    x: number;
    y: number;
  };
  tapped: boolean;
  facedown?: boolean;
  zIndex?: number;
  playerId?: string; // ONLY multiplayer addition
}

// Game room interfaces (multiplayer addition)
interface GameParticipant {
  id: string;
  userId: string;
  deckId?: string;
  seatPosition: number;
  status: string;
  user: {
    id: string;
    username: string;
  };
  deck?: {
    id: string;
    name: string;
    format: string;
  };
}

interface GameRoom {
  id: string;
  name: string;
  format: string;
  status: string;
  maxPlayers: number;
  currentPlayers: number;
  hostId: string;
  participants: GameParticipant[];
}

interface PlaymatV2MultiplayerProps {
  gameRoom: GameRoom;
  currentUser: GameParticipant;
  sessionUserId: string;
  spectatorUserId?: string; // User whose board state to display
  onPlayerSwitch?: (userId: string) => void; // Callback for switching views
}

// Utility functions (copied exactly from original PlaymatV2)
const getCardDimensions = () => {
  if (typeof window === 'undefined') return { width: 150, height: 209 };
  
  const screenWidth = window.innerWidth;
  if (screenWidth <= 480) {
    return { width: 100, height: 139 }; // Small mobile
  } else if (screenWidth <= 768) {
    return { width: 120, height: 167 }; // Mobile
  } else {
    return { width: 150, height: 209 }; // Desktop
  }
};

const calculateBoundaries = (cardDimensions: { width: number; height: number }) => {
  if (typeof window === 'undefined') return { minX: 75, maxX: 1845, minY: 104.5, maxY: 975.5 };
  
  const halfCardWidth = cardDimensions.width / 2;
  const halfCardHeight = cardDimensions.height / 2;
  
  return {
    minX: halfCardWidth, // Flush against left edge
    maxX: window.innerWidth - halfCardWidth, // Flush against right edge
    minY: halfCardHeight, // Flush against top edge  
    maxY: window.innerHeight - halfCardHeight // Flush against bottom edge
  };
};

// Draggable top card component for extra deck (copied from original)
function DraggableExtraTopCard({ card }: { card: MTGCard }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: 'extra-deck',
    data: {
      type: 'extra-card',
      card
    }
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0 : 1,
    width: '150px',
    height: '209px',
    position: 'absolute' as const,
    top: 0,
    left: 0,
    zIndex: 10
  };

  return (
    <div
      ref={setNodeRef}
      className="absolute inset-0 cursor-grab active:cursor-grabbing"
      style={style}
      {...listeners}
      {...attributes}
    >
      <div className="w-full h-full" />
    </div>
  );
}

// Extra Deck Zone Component (copied from original)
const ExtraDeckZone: React.FC<{
  cardsRemaining: number;
  onDeckClick: () => void;
  topCard?: MTGCard;
}> = ({ cardsRemaining, onDeckClick, topCard }) => {
  return (
    <div className="fixed bottom-4 left-4 z-[10]">
      <button
        onClick={onDeckClick}
        className="
          rounded-lg shadow-lg
          hover:scale-105
          active:scale-95
          transition-all duration-200
          cursor-pointer
          flex flex-col items-center justify-center
          text-white text-sm font-bold
          relative
          overflow-hidden
          border-2 border-purple-400/50
          hover:border-purple-400/70
        "
        style={{
          width: '150px',
          height: '209px'
        }}
        disabled={cardsRemaining === 0}
        aria-label={`Extra deck with ${cardsRemaining} cards remaining - Click to draw`}
      >
        <img
          src="https://cards.scryfall.io/large/back/0/0/0aeebaf5-8c7d-4636-9e82-8c27447861f7.jpg?1582037402"
          alt="Magic: The Gathering card back"
          className="absolute inset-0 w-full h-full object-cover rounded-lg"
          draggable={false}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = 'https://gatherer.wizards.com/Handlers/Image.ashx?type=card&name=Card+Back';
          }}
        />
        
        <div className="absolute inset-0 bg-purple-900/60 rounded-lg" />
        
        <div className="relative z-10 text-center">
          <div className="text-sm mb-2 text-shadow">EXTRA</div>
          <div className="text-2xl font-bold text-shadow">{cardsRemaining}</div>
        </div>
        
        {cardsRemaining === 0 && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
            <span className="text-red-400 text-xs font-bold">EMPTY</span>
          </div>
        )}
        
        {cardsRemaining > 0 && topCard && (
          <DraggableExtraTopCard card={topCard} />
        )}
      </button>
    </div>
  );
};

// Battlefield Component (copied from original + minimal multiplayer changes)
const Battlefield: React.FC<{ 
  cards: BattlefieldCard[];
  onCardMove: (cardId: string, x: number, y: number) => void;
  onCardTap: (cardId: string, event?: React.MouseEvent) => void;
  activeDragId?: string;
  onCardHover?: (card: MTGCard, event: React.MouseEvent) => void;
  onCardHoverEnd?: () => void;
  selectedCards: Set<string>;
  onMouseDown?: (e: React.MouseEvent) => void;
  onBattlefieldClick?: (e: React.MouseEvent) => void;
  sessionUserId: string; // ONLY multiplayer addition
}> = ({ cards, onCardMove, onCardTap, activeDragId, onCardHover, onCardHoverEnd, selectedCards, onMouseDown, onBattlefieldClick, sessionUserId }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: 'battlefield',
    data: {
      type: 'battlefield'
    }
  });

  return (
    <div 
      ref={setNodeRef} 
      className={`fixed inset-0 z-[2] cursor-default transition-colors duration-200 ${
        isOver ? 'bg-green-500/10' : ''
      }`}
      onMouseDown={onMouseDown}
      onClick={onBattlefieldClick}
    >
      {cards.map((card) => (
        <PlaytestCard
          key={card.instanceId}
          id={card.instanceId}
          card={card}
          tapped={card.tapped}
          facedown={card.facedown}
          onTap={(event) => onCardTap(card.instanceId, event)}
          isDragging={activeDragId === `battlefield-${card.instanceId}`}
          isSelected={selectedCards.has(card.instanceId)}
          onMouseEnter={onCardHover}
          onMouseLeave={onCardHoverEnd}
          zIndex={card.zIndex}
          style={{
            left: card.position.x,
            top: card.position.y,
          }}
        />
      ))}
    </div>
  );
};

export function PlaymatV2Multiplayer({ gameRoom, currentUser, sessionUserId, spectatorUserId, onPlayerSwitch }: PlaymatV2MultiplayerProps) {
  // Determine which user's board state to display
  const activeViewUserId = spectatorUserId || sessionUserId;
  const isSpectating = activeViewUserId !== sessionUserId;
  const viewingUser = gameRoom.participants.find(p => p.userId === activeViewUserId) || currentUser;
  
  // CRITICAL FIX: Use useRef to prevent multiple initializations
  const hasInitialized = useRef(false);
  const currentViewUserId = useRef(activeViewUserId);
  
  // Debug logging - only log when actually initializing
  if (!hasInitialized.current || currentViewUserId.current !== activeViewUserId) {
    console.log('🎮 PlaymatV2Multiplayer initialized:', {
      activeViewUserId,
      isSpectating,
      sessionUserId,
      spectatorUserId,
      currentUser: {
        username: currentUser.user.username,
        userId: currentUser.userId,
        deckId: currentUser.deckId
      },
      viewingUser: {
        username: viewingUser.user.username,
        userId: viewingUser.userId,
        deckId: viewingUser.deckId
      },
      allParticipants: gameRoom.participants.map(p => ({
        username: p.user.username,
        userId: p.userId,
        deckId: p.deckId
      })),
      deckLoadingStrategy: !isSpectating ? 'LOAD_YOUR_DECK' : 'LOAD_OPPONENT_DECK_OR_FALLBACK'
    });
  }
  
  // State (copied exactly from original)
  const [battlefieldCards, setBattlefieldCards] = useState<BattlefieldCard[]>([]);
  const [handCards, setHandCards] = useState<HandCard[]>([]);
  const [libraryCards, setLibraryCards] = useState<MTGCard[]>([]);
  const [extraDeckCards, setExtraDeckCards] = useState<MTGCard[]>([]);
  const [activeDragItem, setActiveDragItem] = useState<any>(null);
  const [nextZIndex, setNextZIndex] = useState<number>(1);
  
  // Socket.IO for real-time multiplayer sync
  const {
    isConnected,
    connectionError,
    subscribeToEvents,
    emitCardMoved,
    emitCardTapped,
    emitCardPlayed,
    emitCardReturned,
    emitHandStateChanged
  } = useSocket({
    gameId: gameRoom.id,
    userId: sessionUserId,
    username: currentUser.user.username
  });
  
  // Hover preview state (copied from original)
  const [showPreview, setShowPreview] = useState(false);
  const [previewCard, setPreviewCard] = useState<MTGCard | null>(null);
  const [previewPosition, setPreviewPosition] = useState({ x: 0, y: 0 });
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);

  // Multi-select state (copied from original)
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<{ x: number; y: number } | null>(null);
  const [justCompletedSelection, setJustCompletedSelection] = useState(false);

  // Set up sensors (copied from original)
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    }),
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  // Load the deck and game state for the currently viewed player
  useEffect(() => {
    // CRITICAL FIX: Only initialize once per user view change
    if (hasInitialized.current && currentViewUserId.current === activeViewUserId) {
      console.log('🚫 Skipping re-initialization for same user:', activeViewUserId);
      return;
    }
    
    hasInitialized.current = true;
    currentViewUserId.current = activeViewUserId;
    
    async function loadDeckAndGameState() {
      console.log(`🔄 Loading deck and game state for: ${viewingUser.user.username} (${isSpectating ? 'spectating' : 'your board'})`);
      
      // Clear current state when switching players
      setBattlefieldCards([]);
      setHandCards([]);
      setLibraryCards([]);
      
      // CRITICAL FIX: Check for persisted game state FIRST
      const hasPersistedHandState = await loadGameState(viewingUser.userId);
      
      // CRITICAL FIX: Also check if we already have cards loaded for this player
      const currentPlayerState = handCards.length > 0 || libraryCards.length > 0;
      
      // Only generate new hand if no persisted state exists AND no current state
      if (!hasPersistedHandState && !currentPlayerState) {
        console.log('🆕 No persisted hand state found - generating new hand from deck');
        
        // Load deck data - try your own deck first, then fall back to test cards for opponents
        console.log('🔍 Deck loading decision:', {
          isSpectating,
          currentUserDeckId: currentUser.deckId,
          viewingUserDeckId: viewingUser.deckId,
          sessionUserId,
          currentUserId: currentUser.userId,
          viewingUserId: viewingUser.userId
        });

        if (!isSpectating && currentUser.deckId) {
          // Loading your own deck (should work)
          console.log('🃏 Loading YOUR deck:', currentUser.deckId);
          try {
            await loadUserDeck(currentUser.deckId, currentUser.userId);
          } catch (error) {
            console.error('❌ Failed to load your deck:', error);
            console.log('🔄 Setting empty game state');
            handleNoDeckAvailable();
          }
        } else if (isSpectating && viewingUser.deckId) {
          // Trying to load opponent deck (will likely fail with 403, so fall back to test cards)
          console.log('👁️ Attempting to load opponent deck for', viewingUser.user.username, ':', viewingUser.deckId);
          try {
            await loadUserDeck(viewingUser.deckId, viewingUser.userId);
          } catch (error) {
            console.log('🔐 Cannot access opponent deck (expected) - setting empty game state');
            handleNoDeckAvailable();
          }
        } else {
          console.warn('🚨 No deck ID found, setting empty game state');
          console.warn('   Reason: isSpectating =', isSpectating, ', currentUser.deckId =', currentUser.deckId, ', viewingUser.deckId =', viewingUser.deckId);
          handleNoDeckAvailable();
        }
      } else {
        console.log('♻️ Using persisted hand state - skipping deck generation');
      }
    }

    async function loadUserDeck(deckId: string, playerId: string) {
      if (!deckId || deckId === 'undefined' || deckId === 'null') {
        console.warn('⚠️ Invalid deck ID provided for player:', playerId, 'deckId:', deckId);
        handleNoDeckAvailable();
        return;
      }

      try {
        const isOwnDeck = playerId === sessionUserId;
        const context = isOwnDeck ? 'LOADING_YOUR_OWN_DECK' : 'LOADING_OPPONENT_DECK';
        
        console.log(`🔍 ${context}:`, {
          deckId,
          playerId,
          sessionUserId,
          isSpectating,
          expectedResult: isOwnDeck ? 'Should succeed' : 'Should succeed (same game room)'
        });
        
        // Load the deck for the specified player
        console.log('🌐 Making API request to:', `/api/decks/${deckId}`);
        const response = await secureApiRequest(`/api/decks/${deckId}`);
        
        console.log('📡 API Response:', {
          ok: response.ok,
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries())
        });
        
        if (!response.ok) {
          const isOwnDeck = playerId === sessionUserId;
          
          // Log the error details
          console.error('❌ Deck fetch failed:');
          console.error('   Status:', response.status, response.statusText);
          console.error('   Context: deckId=' + deckId, 'playerId=' + playerId, 'sessionUserId=' + sessionUserId);
          console.error('   Is spectating:', isSpectating, 'Is own deck:', isOwnDeck);
          
          // Try to get error details
          try {
            const errorText = await response.text();
            console.error('   Response body:', errorText);
          } catch (e) {
            console.error('   Could not read response body');
          }
          
          if (response.status === 403) {
            if (isOwnDeck) {
              console.error('🚨 CRITICAL: Access denied to your own deck - possible auth issue');
            } else {
              console.log('🔐 Opponent deck access denied - this should now work with the API update');
              console.log('💡 If you still see this, the game room participants might not be set up correctly');
            }
          }
          
          console.log('🎲 Setting empty game state');
          handleNoDeckAvailable();
          return;
        }
        
        const data = await response.json();
        console.log('🔍 Raw deck API response:', data);
        
        if (data.success && data.deck) {
          const allCards = Object.values(data.deck.cards).flat() as any[];
          console.log('🔍 All cards from deck:', allCards);
          
          const deckCards: MTGCard[] = [];
          
          allCards.forEach(deckCard => {
            for (let i = 0; i < deckCard.quantity; i++) {
              deckCards.push({
                ...deckCard.card,
                id: `${deckCard.card.id}-${i}`,
              });
            }
          });
          
          const shuffledCards = [...deckCards].sort(() => Math.random() - 0.5);
          
          // CRITICAL FIX: Check if we already have hand cards (from previous session)
          // If so, preserve them and adjust the library accordingly
          const existingHandCards = handCards.length > 0 ? handCards : [];
          
          if (existingHandCards.length > 0) {
            console.log('🔄 Preserving existing hand cards:', existingHandCards.length, 'cards');
            // Remove the cards that are in hand from the library
            const cardsInHand = existingHandCards.map(card => card.name);
            const adjustedLibrary = shuffledCards.filter(card => {
              const cardInHandIndex = cardsInHand.indexOf(card.name);
              if (cardInHandIndex !== -1) {
                cardsInHand.splice(cardInHandIndex, 1); // Remove one instance
                return false; // Exclude from library
              }
              return true; // Keep in library
            });
            
            setLibraryCards(adjustedLibrary);
            console.log('🃏 Reloaded deck for', playerId, '- Preserved hand:', existingHandCards.length, 'cards, Adjusted library:', adjustedLibrary.length, 'cards');
            
            // Emit the preserved hand state with new library
            if (playerId === sessionUserId) {
              emitHandStateChanged(existingHandCards, adjustedLibrary);
            }
          } else {
            // No existing hand cards - start fresh
            const initialHand: HandCard[] = []; // Empty hand
            
            setHandCards(initialHand);
            setLibraryCards(shuffledCards); // Full deck goes to library
            console.log('🃏 Loaded fresh deck for', playerId, '- Hand:', initialHand.length, 'cards, Library:', shuffledCards.length, 'cards');
            
            // Emit the initial empty hand state to persist it
            if (playerId === sessionUserId) {
              emitHandStateChanged(initialHand, shuffledCards);
            }
          }
          
        } else {
          console.warn('🚨 No deck data found in API response, setting empty game state');
          handleNoDeckAvailable();
        }
        
      } catch (error) {
        console.error('❌ Error loading deck for player', playerId, ':', error);
        console.log('🔄 Setting empty game state due to deck loading error');
        handleNoDeckAvailable();
      }
    }

    async function loadGameState(playerId: string) {
      try {
        console.log('🎮 Fetching game state for player:', playerId);
        const gameStateResponse = await secureApiRequest(`/api/games/rooms/${gameRoom.id}/state?playerId=${playerId}`, {
          method: 'GET'
        });

        if (gameStateResponse.ok) {
          const gameState = await gameStateResponse.json();
          console.log('✅ Loaded game state for', playerId, ':', gameState);
          
          // 🐛 DEBUG: Log the actual contents of the game state
          console.log('🔍 Game state contents:', {
            hasHandCards: !!(gameState.handCards && gameState.handCards.length > 0),
            handCardsLength: gameState.handCards?.length || 0,
            hasLibraryCards: !!(gameState.libraryCards && gameState.libraryCards.length > 0),
            libraryCardsLength: gameState.libraryCards?.length || 0,
            hasBattlefieldCards: !!(gameState.battlefieldCards && gameState.battlefieldCards.length > 0),
            battlefieldCardsLength: gameState.battlefieldCards?.length || 0
          });
          
          // Set battlefield cards from this player's game state
          if (gameState.battlefieldCards && gameState.battlefieldCards.length > 0) {
            setBattlefieldCards(gameState.battlefieldCards);
            console.log('🃏 Loaded', gameState.battlefieldCards.length, 'battlefield cards for player', playerId);
          } else {
            console.log('📋 No battlefield cards found for player', playerId);
            setBattlefieldCards([]);
          }
          
          // CRITICAL FIX: Always set hand cards for the viewed player (even if empty)
          if (gameState.handCards && gameState.handCards.length > 0) {
            const restoredHandCards: HandCard[] = gameState.handCards.map((card: any, index: number) => ({
              ...card,
              instanceId: `hand-${card.id}-${index}-${playerId}-restored`
            }));
            setHandCards(restoredHandCards);
            console.log('🃏 Restored', restoredHandCards.length, 'hand cards for player', playerId);
          } else {
            // Clear hand if this player has no cards
            setHandCards([]);
            console.log('🃏 No hand cards found for player', playerId, '- clearing hand view');
          }
          
          // CRITICAL FIX: Always set library cards for the viewed player (even if empty)
          if (gameState.libraryCards && gameState.libraryCards.length > 0) {
            setLibraryCards(gameState.libraryCards);
            console.log('📚 Loaded', gameState.libraryCards.length, 'library cards for player', playerId);
          } else {
            // Clear library if this player has no cards
            setLibraryCards([]);
            console.log('📚 No library cards found for player', playerId, '- clearing library view');
          }
          
          // CRITICAL FIX: Only skip deck loading if we have BOTH hand AND library cards
          // If we only have hand cards but no library, we need to reload the deck
          const hasPersistedHandCards = gameState.handCards && gameState.handCards.length > 0;
          const hasPersistedLibraryCards = gameState.libraryCards && gameState.libraryCards.length > 0;
          
          if (hasPersistedHandCards && hasPersistedLibraryCards) {
            console.log('✅ Found complete persisted state (hand + library) - skipping deck generation');
            return true; // Signal that we loaded complete persisted state
          } else if (hasPersistedHandCards && !hasPersistedLibraryCards) {
            console.log('⚠️ Found hand cards but missing library - will reload deck to restore library');
            return false; // Need to reload deck to get library cards back
          } else {
            console.log('📋 No persisted cards found - will generate deck from scratch');
            return false; // Signal that we need to load the deck
          }
        } else {
          console.log('⚠️ Could not load game state for player', playerId);
          setBattlefieldCards([]);
        }
        
        return false; // Signal that we didn't load persisted hand state
      } catch (gameStateError) {
        console.error('❌ Error loading game state for player', playerId, ':', gameStateError);
        setBattlefieldCards([]);
        return false; // Signal that we didn't load persisted hand state
      }
    }

    // Function to handle no deck available case
    function handleNoDeckAvailable() {
      console.warn('⚠️ No deck available - setting empty game state');
      
      // Set empty state for everything
      const initialHand: HandCard[] = []; // Empty hand
      
      setHandCards(initialHand);
      setLibraryCards([]); // Empty library
      
      console.log('🚫 No deck loaded for', viewingUser.user.username, '- Hand:', initialHand.length, 'cards, Library: 0 cards');
      
      // Emit the initial empty hand state to persist it
      if (viewingUser.userId === sessionUserId) {
        emitHandStateChanged(initialHand, []);
      }
    }

    loadDeckAndGameState();
  }, [activeViewUserId, gameRoom.id]); // Removed isSpectating to reduce re-renders

  // Socket.IO event handlers for real-time sync
  useEffect(() => {
    if (!isConnected) return;

    const cleanup = subscribeToEvents({
      onCardMoved: (data) => {
        // Only apply events when viewing the player who made the action
        if (data.playerId === activeViewUserId && data.playerId !== sessionUserId) {
          setBattlefieldCards(prev => prev.map(card => 
            card.instanceId === data.cardId 
              ? { ...card, position: data.position }
              : card
          ));
        }
      },
      
      onCardTapped: (data) => {
        // Only apply events when viewing the player who made the action
        if (data.playerId === activeViewUserId && data.playerId !== sessionUserId) {
          setBattlefieldCards(prev => prev.map(card => 
            card.instanceId === data.cardId 
              ? { ...card, tapped: data.tapped }
              : card
          ));
        }
      },
      
      onCardPlayed: (data) => {
        // Only apply events when viewing the player who made the action
        if (data.playerId === activeViewUserId && data.playerId !== sessionUserId) {
          const newCard: BattlefieldCard = {
            ...data.card,
            position: data.position,
            tapped: false,
            zIndex: nextZIndex,
            playerId: data.playerId
          };
          setBattlefieldCards(prev => [...prev, newCard]);
          setNextZIndex(prev => prev + 1);
          
          // CRITICAL FIX: Also remove the card from hand when viewing the player who played it
          // This ensures hand zones sync in real-time between players
          setHandCards(prev => prev.filter(card => 
            // Remove any card with the same base ID (handles different instanceId formats)
            card.id !== data.card.id || 
            // Or exact instanceId match if it exists
            card.instanceId === data.card.instanceId
          ));
          
          console.log('🔄 Real-time sync: Card played by', data.playerId, 'added to battlefield and removed from hand view');
        }
      },
      
      onCardReturned: (data) => {
        // Only apply events when viewing the player who made the action
        if (data.playerId === activeViewUserId && data.playerId !== sessionUserId) {
          // Use functional update to access current battlefield state
          setBattlefieldCards(prev => {
            // Find the card being returned to get its details
            const returningCard = prev.find(card => card.instanceId === data.cardId);
            
            // CRITICAL FIX: Also add the card back to hand when viewing the player who returned it
            if (returningCard) {
              const handCard: HandCard = {
                ...returningCard,
                instanceId: `hand-${returningCard.id}-${Date.now()}-returned`
              };
              setHandCards(prevHand => [...prevHand, handCard]);
              
              console.log('🔄 Real-time sync: Card returned by', data.playerId, 'removed from battlefield and added to hand view');
            }
            
            // Return filtered battlefield cards
            return prev.filter(card => card.instanceId !== data.cardId);
          });
        }
      },
      
      onHandStateChanged: (data) => {
        // Only apply events when viewing the player who made the action
        if (data.playerId === activeViewUserId && data.playerId !== sessionUserId) {
          console.log('🔄 Real-time sync: Hand state changed for', data.playerId, 'new hand:', data.handCards.length, 'cards');
          
          // Update the hand cards for the player being viewed
          const newHandCards: HandCard[] = data.handCards.map((card: any, index: number) => ({
            ...card,
            instanceId: `hand-${card.id}-${index}-${data.playerId}-synced`
          }));
          
          setHandCards(newHandCards);
          console.log('🃏 Updated hand view for', data.playerId, '- now showing', newHandCards.length, 'cards');
        }
      },
      
      onPlayerJoined: (data) => {
        console.log('🔄 Player joined:', data);
      },
      
      onGameState: (data) => {
        console.log('🔄 Received game state:', data);
        if (data.battlefieldCards) {
          setBattlefieldCards(data.battlefieldCards);
        }
      }
    });

    return cleanup;
  }, [isConnected, sessionUserId, activeViewUserId, subscribeToEvents]); // Remove nextZIndex from dependencies to prevent loops

  // NOTE: Removed automatic state emission useEffect to prevent duplicate draws
  // State changes are now emitted manually in each action (drawCard, playCard, etc.)

  // All the original PlaymatV2 functions (copied exactly)
  const drawCard = useCallback(() => {
    if (isSpectating) return; // Can't draw cards when spectating
    
    console.log('🎯 Draw attempt - Library has', libraryCards.length, 'cards');
    console.log('🔍 Current library first card:', libraryCards[0]?.name);
    
    if (libraryCards.length > 0) {
      const drawnCard = libraryCards[0];
      const newHandCard: HandCard = {
        ...drawnCard,
        instanceId: `hand-${drawnCard.id}-${Date.now()}-${sessionUserId}` // More unique ID
      };
      
      console.log('🃏 Drawing card:', drawnCard.name, 'New hand card ID:', newHandCard.instanceId);
      
      // CRITICAL FIX: Update both states synchronously, then emit once
      const newHand = [...handCards, newHandCard];
      const newLibrary = libraryCards.slice(1);
      
      setHandCards(newHand);
      setLibraryCards(newLibrary);
      
      console.log('📋 Hand updated - now has', newHand.length, 'cards');
      console.log('📚 Library updated - now has', newLibrary.length, 'cards');
      console.log('📚 Next card will be:', newLibrary[0]?.name || 'NONE');
      console.log('✅ Successfully drew:', newHandCard.name);
      
      // CRITICAL FIX: Emit hand state change ONCE after both states are updated
      emitHandStateChanged(newHand, newLibrary);
    } else {
      console.log('❌ Cannot draw - library is empty');
    }
  }, [isSpectating, sessionUserId, handCards, libraryCards, emitHandStateChanged]);

  const drawFromExtra = useCallback(() => {
    if (extraDeckCards.length > 0) {
      const drawnCard = extraDeckCards[0];
      const newHandCard: HandCard = {
        ...drawnCard,
        instanceId: `hand-${drawnCard.id}-${Date.now()}`
      };
      
      setHandCards(prev => [...prev, newHandCard]);
      setExtraDeckCards(prev => prev.slice(1));
      console.log('Drew card from extra deck:', newHandCard.name);
    }
  }, [extraDeckCards]);

  const playCard = useCallback((cardId: string, position?: { x: number; y: number }) => {
    if (isSpectating) return; // Can't play cards when spectating
    
    const handCard = handCards.find(card => card.instanceId === cardId);
    if (!handCard) return;

    console.log('🃏 Playing card from hand:', handCard.name, 'Hand size before:', handCards.length);
    
    // CRITICAL FIX: Update state and emit once
    const newHand = handCards.filter(card => card.instanceId !== cardId);
    setHandCards(newHand);
    
    console.log('📋 Hand size after playing card:', newHand.length);
    
    // CRITICAL FIX: Emit hand state change ONCE after state is updated
    emitHandStateChanged(newHand, libraryCards);
    
    const dropPosition = position || { 
      x: (typeof window !== 'undefined' ? window.innerWidth : 1920) / 2,
      y: (typeof window !== 'undefined' ? window.innerHeight : 1080) / 2
    };
    
    const battlefieldCard: BattlefieldCard = {
      ...handCard,
      instanceId: `battlefield-${handCard.instanceId}`,
      position: dropPosition,
      tapped: false,
      zIndex: nextZIndex,
      playerId: sessionUserId // Mark as owned by current player
    };
    
    console.log('🃏 Playing card to battlefield:', {
      cardName: handCard.name,
      position: dropPosition,
      hasImageUris: !!handCard.image_uris,
      imageUrl: handCard.image_uris?.normal,
      battlefieldCard
    });
    
    setNextZIndex(prev => prev + 1);
    setBattlefieldCards(prev => [...prev, battlefieldCard]);
    
    // Emit socket event for real-time sync
    emitCardPlayed(battlefieldCard, dropPosition);
    
    console.log('Played card:', handCard.name, 'at position:', dropPosition);
  }, [handCards, libraryCards, nextZIndex, sessionUserId, emitCardPlayed, emitHandStateChanged]);

  const playFromLibrary = useCallback((card: MTGCard, position?: { x: number; y: number }) => {
    if (isSpectating) return; // Can't play cards when spectating
    
    const dropPosition = position || { 
      x: (typeof window !== 'undefined' ? window.innerWidth : 1920) / 2,
      y: (typeof window !== 'undefined' ? window.innerHeight : 1080) / 2
    };
    
    const battlefieldCard: BattlefieldCard = {
      ...card,
      instanceId: `battlefield-library-${card.id}-${Date.now()}`,
      position: dropPosition,
      tapped: false,
      zIndex: nextZIndex,
      playerId: sessionUserId
    };
    
    // Remove the card from library (same logic as drawCard)
    setLibraryCards(prevLibrary => {
      const cardIndex = prevLibrary.findIndex(libCard => libCard.id === card.id);
      if (cardIndex !== -1) {
        const newLibrary = [...prevLibrary];
        newLibrary.splice(cardIndex, 1); // Remove the specific card
        console.log('📚 Removed card from library:', card.name, '- Library now has', newLibrary.length, 'cards');
        return newLibrary;
      }
      return prevLibrary;
    });
    
    setNextZIndex(prev => prev + 1);
    setBattlefieldCards(prev => [...prev, battlefieldCard]);
    
    emitCardPlayed(battlefieldCard, dropPosition);
    
    console.log('Played from library:', card.name, 'at position:', dropPosition);
  }, [nextZIndex, sessionUserId, emitCardPlayed, isSpectating]);

  const returnToHand = useCallback((cardId: string) => {
    const battlefieldCard = battlefieldCards.find(card => card.instanceId === cardId);
    if (!battlefieldCard) return;

    setBattlefieldCards(prev => prev.filter(card => card.instanceId !== cardId));
    
    const handCard: HandCard = {
      ...battlefieldCard,
      instanceId: `hand-${battlefieldCard.id}-${Date.now()}`
    };
    
    // CRITICAL FIX: Update state and emit once
    const newHand = [...handCards, handCard];
    setHandCards(newHand);
    
    // CRITICAL FIX: Emit hand state change ONCE after state is updated
    emitHandStateChanged(newHand, libraryCards);
    
    emitCardReturned(cardId);
    
    console.log('Returned to hand:', battlefieldCard.name);
  }, [battlefieldCards, handCards, libraryCards, emitCardReturned, emitHandStateChanged]);

  const handleCardMove = useCallback((cardId: string, x: number, y: number) => {
    if (isSpectating) return; // Can't move cards when spectating
    
    const cardDimensions = getCardDimensions();
    const boundaries = calculateBoundaries(cardDimensions);
    
    const newX = Math.max(boundaries.minX, Math.min(boundaries.maxX, x));
    const newY = Math.max(boundaries.minY, Math.min(boundaries.maxY, y));
    
    setBattlefieldCards(prev => prev.map(card => 
      card.instanceId === cardId 
        ? { ...card, position: { x: newX, y: newY }, zIndex: nextZIndex }
        : card
    ));
    
    setNextZIndex(prev => prev + 1);
    
    emitCardMoved(cardId, { x: newX, y: newY });
    
    console.log('Moved card:', cardId, 'to:', { x: newX, y: newY });
  }, [nextZIndex, emitCardMoved, isSpectating]);

  const handleCardTap = useCallback((cardId: string, event?: React.MouseEvent) => {
    if (isSpectating) return; // Disable interactions in spectator mode
    
    // If Ctrl/Cmd is pressed, toggle individual card selection
    if (event && (event.ctrlKey || event.metaKey)) {
      setSelectedCards(prev => {
        const newSelection = new Set(prev);
        if (newSelection.has(cardId)) {
          newSelection.delete(cardId);
        } else {
          newSelection.add(cardId);
        }
        return newSelection;
      });
      return;
    }

    // If card is selected and multiple cards are selected, use smart group tapping
    if (selectedCards.has(cardId) && selectedCards.size > 1) {
      setBattlefieldCards(prev => {
        // Get all selected cards
        const selectedCardsList = prev.filter(c => selectedCards.has(c.instanceId));
        
        // Check tap states
        const hasAnyTapped = selectedCardsList.some(c => c.tapped);
        const hasAnyUntapped = selectedCardsList.some(c => !c.tapped);
        
        // Smart tapping logic:
        // If mixed states (some tapped, some untapped) -> untap all first
        // If all same state -> toggle all
        let targetState: boolean;
        if (hasAnyTapped && hasAnyUntapped) {
          // Mixed states - untap all first
          targetState = false;
        } else {
          // All same state - toggle all
          targetState = !selectedCardsList[0].tapped;
        }
        
        // Apply the change and emit events
        const updatedCards = prev.map(c => {
          if (selectedCards.has(c.instanceId)) {
            emitCardTapped(c.instanceId, targetState);
            return { ...c, tapped: targetState };
          }
          return c;
        });
        
        return updatedCards;
      });
    } else {
      // Normal single card tap - clear selection and tap card
      setSelectedCards(new Set());
      setBattlefieldCards(prev => {
        const updatedCards = prev.map(card => 
          card.instanceId === cardId 
            ? { ...card, tapped: !card.tapped }
            : card
        );
        
        const card = prev.find(c => c.instanceId === cardId);
        if (card) {
          emitCardTapped(cardId, !card.tapped);
        }
        
        return updatedCards;
      });
    }
    
    console.log('Tapped card:', cardId);
  }, [selectedCards, battlefieldCards, emitCardTapped, isSpectating]);

  const handleCardHover = useCallback((card: MTGCard, event: React.MouseEvent) => {
    if (activeDragItem) return; // Don't show preview while dragging
    
    // Clear any existing timeout first
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      setHoverTimeout(null);
    }
    
    // Clear any existing preview immediately
    setShowPreview(false);
    
    // Get the card element's position
    const cardElement = event.currentTarget as HTMLElement;
    const rect = cardElement.getBoundingClientRect();
    const screenWidth = window.innerWidth;
    const cardCenterX = rect.left + rect.width / 2;
    const isOnRightSide = cardCenterX > screenWidth / 2;
    
    setPreviewPosition({
      x: isOnRightSide 
        ? rect.left - 288 - 16  // Show on left: card left - preview width (288px) - margin
        : rect.right + 16,      // Show on right: card right + margin
      y: rect.top
    });
    
    setPreviewCard(card);
    
    // Set timeout for preview
    const previewTimeout = setTimeout(() => {
      setShowPreview(true);
    }, 500); // 500ms delay for preview
    setHoverTimeout(previewTimeout);
  }, [activeDragItem, hoverTimeout]);

  const handleCardHoverEnd = useCallback(() => {
    // Clear timeout immediately
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      setHoverTimeout(null);
    }
    
    // Hide preview immediately
    setShowPreview(false);
    setPreviewCard(null);
  }, [hoverTimeout]);

  // Global mouse event handlers for selection (copied from original)
  useEffect(() => {
    if (!isSelecting || !selectionStart) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      const newEnd = { x: e.clientX, y: e.clientY };
      setSelectionEnd(newEnd);
      
      const left = Math.min(selectionStart.x, e.clientX);
      const top = Math.min(selectionStart.y, e.clientY);
      const width = Math.abs(e.clientX - selectionStart.x);
      const height = Math.abs(e.clientY - selectionStart.y);
      
      const rect = { left, top, width, height };
      
      if (rect.width > 5 || rect.height > 5) {
        const cardsInSelection = battlefieldCards.filter(card => {
          const cardDimensions = getCardDimensions();
          const cardBounds = {
            left: card.position.x - cardDimensions.width / 2,
            top: card.position.y - cardDimensions.height / 2,
            width: cardDimensions.width,
            height: cardDimensions.height
          };
          
          return !(rect.left > cardBounds.left + cardBounds.width ||
                   rect.left + rect.width < cardBounds.left ||
                   rect.top > cardBounds.top + cardBounds.height ||
                   rect.top + rect.height < cardBounds.top);
        });
        
        setSelectedCards(new Set(cardsInSelection.map(card => card.instanceId)));
      }
    };
    
    const handleGlobalMouseUp = () => {
      if (selectionStart && selectionEnd) {
        const rect = {
          left: Math.min(selectionStart.x, selectionEnd.x),
          top: Math.min(selectionStart.y, selectionEnd.y),
          width: Math.abs(selectionEnd.x - selectionStart.x),
          height: Math.abs(selectionEnd.y - selectionStart.y)
        };
        
        if (rect.width > 5 || rect.height > 5) {
          setJustCompletedSelection(true);
          setTimeout(() => setJustCompletedSelection(false), 100);
        }
      }
      
      setIsSelecting(false);
      setSelectionStart(null);
      setSelectionEnd(null);
    };

    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isSelecting, selectionStart, selectionEnd, battlefieldCards]);

  // Keyboard event handlers (copied from original)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedCards(new Set());
        setIsSelecting(false);
        setSelectionStart(null);
        setSelectionEnd(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Multi-select functions (copied from original)
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!activeDragItem && e.button === 0 && e.target === e.currentTarget) {
      setIsSelecting(true);
      setSelectionStart({ x: e.clientX, y: e.clientY });
      setSelectionEnd({ x: e.clientX, y: e.clientY });
      
      if (!e.ctrlKey && !e.metaKey) {
        setSelectedCards(new Set());
      }
      
      e.preventDefault();
      e.stopPropagation();
    }
  }, [activeDragItem]);

  const getSelectionRectangle = useCallback(() => {
    if (!selectionStart || !selectionEnd) return null;
    
    const left = Math.min(selectionStart.x, selectionEnd.x);
    const top = Math.min(selectionStart.y, selectionEnd.y);
    const width = Math.abs(selectionEnd.x - selectionStart.x);
    const height = Math.abs(selectionEnd.y - selectionStart.y);
    
    return { left, top, width, height };
  }, [selectionStart, selectionEnd]);

  const handleBattlefieldClick = useCallback((e: React.MouseEvent) => {
    if (justCompletedSelection) {
      setJustCompletedSelection(false);
      return;
    }
    
    if (!isSelecting && e.target === e.currentTarget) {
      setSelectedCards(new Set());
    }
  }, [isSelecting, justCompletedSelection]);

  // Drag handlers (copied from original with multiplayer sync)
  const handleDragStart = useCallback((event: DragStartEvent) => {
    if (isSpectating) return; // Can't drag when spectating
    
    setActiveDragItem(event.active);
    console.log('Drag started:', event.active.id);
  }, [isSpectating]);

  const handleDragCancel = useCallback(() => {
    setActiveDragItem(null);
    console.log('Drag cancelled');
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over, delta } = event;
    console.log('Drag ended:', { activeId: active.id, overId: over?.id, delta });
    
    setActiveDragItem(null);
    
    if (isSpectating) return; // Can't interact when spectating
    
    // Handle hand card drops
    if (active.id.toString().startsWith('hand-')) {
      const cardId = active.id.toString().replace('hand-', '');
      
      if (over?.id === 'battlefield') {
        const dropPosition = {
          x: (active.rect.current.translated?.left || 0) + 75,
          y: (active.rect.current.translated?.top || 0) + 104.5
        };
        
        playCard(cardId, dropPosition);
      }
    }
    
    // Handle library card drops
    if (active.id === 'library-deck') {
      const draggedCard = active.data.current?.card;
      
      if (over?.id === 'battlefield' && draggedCard) {
        const dropPosition = {
          x: (active.rect.current.translated?.left || 0) + 75,
          y: (active.rect.current.translated?.top || 0) + 104.5
        };
        
        playFromLibrary(draggedCard, dropPosition);
      } else if (draggedCard) {
        setLibraryCards(prev => [draggedCard, ...prev]);
      }
    }
    
    // Handle battlefield card movements
    if (active.id.toString().startsWith('battlefield-')) {
      const cardId = active.id.toString().replace('battlefield-', '');
      
      if (over?.id === 'hand-zone') {
        returnToHand(cardId);
      } else if (delta) {
        const isCardSelected = selectedCards.has(cardId);
        const shouldMoveMultiple = isCardSelected && selectedCards.size > 1;
        
        if (shouldMoveMultiple) {
          setBattlefieldCards(prev => {
            const cardDimensions = getCardDimensions();
            const boundaries = calculateBoundaries(cardDimensions);
            
            return prev.map(c => {
              if (selectedCards.has(c.instanceId)) {
                const proposedX = c.position.x + delta.x;
                const proposedY = c.position.y + delta.y;
                
                const newX = Math.max(boundaries.minX, Math.min(boundaries.maxX, proposedX));
                const newY = Math.max(boundaries.minY, Math.min(boundaries.maxY, proposedY));
                
                emitCardMoved(c.instanceId, { x: newX, y: newY });
                
                return { ...c, position: { x: newX, y: newY }, zIndex: nextZIndex + selectedCards.size };
              }
              return c;
            });
          });
          
          setNextZIndex(prev => prev + selectedCards.size);
        } else {
          const card = battlefieldCards.find(c => c.instanceId === cardId);
          if (card) {
            const cardDimensions = getCardDimensions();
            const boundaries = calculateBoundaries(cardDimensions);
            
            const proposedX = card.position.x + delta.x;
            const proposedY = card.position.y + delta.y;
            
            const newX = Math.max(boundaries.minX, Math.min(boundaries.maxX, proposedX));
            const newY = Math.max(boundaries.minY, Math.min(boundaries.maxY, proposedY));
            
            handleCardMove(cardId, newX, newY);
          }
        }
      }
    }
    
    // Handle extra deck drops
    if (active.id === 'extra-deck') {
      const draggedCard = active.data.current?.card;
      
      if (over?.id === 'battlefield' && draggedCard) {
        const dropPosition = {
          x: (active.rect.current.translated?.left || 0) + 75,
          y: (active.rect.current.translated?.top || 0) + 104.5
        };
        
        playFromLibrary(draggedCard, dropPosition);
        setExtraDeckCards(prev => prev.slice(1));
      }
    }
  }, [selectedCards, battlefieldCards, nextZIndex, playCard, playFromLibrary, returnToHand, handleCardMove, emitCardMoved, isSpectating]);

  return (
    <DndContext 
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      {/* Player Switcher */}
      {onPlayerSwitch && (
        <PlayerSwitcher
          participants={gameRoom.participants}
          currentUserId={sessionUserId}
          activeViewUserId={activeViewUserId}
          onPlayerSwitch={onPlayerSwitch}
        />
      )}
      
      {/* Status indicators */}
      <div className="fixed top-4 right-4 z-[1000] space-y-2">
        {/* Board owner indicator */}
        <div className={`bg-black/80 text-white px-3 py-2 rounded-lg shadow-lg text-sm ${
          isSpectating ? 'border-2 border-yellow-500' : 'border-2 border-blue-500'
        }`}>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isSpectating ? 'bg-yellow-500' : 'bg-blue-500'}`}></div>
            <span className="font-medium">
              {isSpectating ? `Viewing ${viewingUser.user.username}'s Board` : 'Your Board'}
            </span>
          </div>
        </div>
        
        {/* Connection status */}
        <div className="bg-black/80 text-white px-3 py-2 rounded-lg shadow-lg">
          <div className="flex items-center gap-2 text-sm">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            {isConnected ? 'Live Sync Active' : 'Connecting...'}
            {connectionError && <span className="text-red-400">({connectionError})</span>}
          </div>
        </div>
      </div>

      {/* Multi-select mode indicator */}
      {isSelecting && (
        <div className="fixed top-4 left-4 z-[1000] bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            Selecting Cards - Drag to select multiple
          </div>
        </div>
      )}

      {/* Playmat Container */}
      <div className="fixed inset-0 m-0 p-0 bg-grid-pattern z-[1] overflow-hidden">


        {/* Battlefield - droppable area */}
        <Battlefield 
          cards={battlefieldCards} 
          onCardMove={handleCardMove}
          onCardTap={handleCardTap}
          activeDragId={activeDragItem?.id}
          onCardHover={handleCardHover}
          onCardHoverEnd={handleCardHoverEnd}
          selectedCards={selectedCards}
          onMouseDown={handleMouseDown}
          onBattlefieldClick={handleBattlefieldClick}
          sessionUserId={sessionUserId}
        />
        
        {/* Deck Zone - positioned in bottom right */}
        {libraryCards.length > 0 && (
          <DeckZone 
            cardsRemaining={libraryCards.length}
            onDeckClick={isSpectating ? () => {} : drawCard} // Disable drawing when spectating but show deck
            topCard={libraryCards[0]}
          />
        )}
        
        {/* Extra Deck Zone - positioned in bottom left */}
        {extraDeckCards.length > 0 && (
          <ExtraDeckZone 
            cardsRemaining={extraDeckCards.length}
            onDeckClick={drawFromExtra}
            topCard={extraDeckCards[0]}
          />
        )}
        
        {/* Hand Zone - Show the hand of the player whose board you're viewing */}
        <HandZone 
          cards={handCards} // Show the hand of the currently viewed player
          onCardPlay={isSpectating ? () => {} : playCard} // Disable playing when spectating
          onReturnToHand={returnToHand}
          onCardMouseEnter={handleCardHover}
          onCardMouseLeave={handleCardHoverEnd}
        />
      </div>
      
      {/* Selection Rectangle */}
      {isSelecting && selectionStart && selectionEnd && (() => {
        const rect = getSelectionRectangle();
        
        if (!rect || (rect.width < 5 && rect.height < 5)) {
          return null;
        }
        
        return (
          <div
            className="fixed pointer-events-none z-[999] border-2 border-blue-500 bg-blue-500/20"
            style={{
              left: rect.left,
              top: rect.top,
              width: rect.width,
              height: rect.height
            }}
          />
        );
      })()}
      
      {/* Drag Overlay */}
      <DragOverlay dropAnimation={null}>
        {activeDragItem ? (
          <div className="pointer-events-none z-[999]">
            {(() => {
              // Handle battlefield cards
              if (activeDragItem.id.toString().startsWith('battlefield-')) {
                const cardId = activeDragItem.id.toString().replace('battlefield-', '');
                const draggedCard = battlefieldCards.find(c => c.instanceId === cardId);
                
                if (!draggedCard) return null;
                
                const isCardSelected = selectedCards.has(cardId);
                const shouldShowMultiple = isCardSelected && selectedCards.size > 1;
                
                if (shouldShowMultiple) {
                  const selectedCardsList = battlefieldCards.filter(c => selectedCards.has(c.instanceId));
                  
                  const minX = Math.min(...selectedCardsList.map(c => c.position.x));
                  const minY = Math.min(...selectedCardsList.map(c => c.position.y));
                  const maxX = Math.max(...selectedCardsList.map(c => c.position.x));
                  const maxY = Math.max(...selectedCardsList.map(c => c.position.y));
                  
                  const centerX = (minX + maxX) / 2;
                  const centerY = (minY + maxY) / 2;
                  
                  return (
                    <div className="relative">
                      {selectedCardsList.map((card) => {
                        const relativeX = card.position.x - draggedCard.position.x;
                        const relativeY = card.position.y - draggedCard.position.y;
                        
                        return (
                          <div
                            key={card.instanceId}
                            className="absolute"
                            style={{
                              left: relativeX,
                              top: relativeY,
                              transform: 'translate(-50%, -50%)'
                            }}
                          >
                            <PlaytestCard
                              id={card.instanceId}
                              card={card}
                              tapped={card.tapped}
                              facedown={card.facedown}
                              onTap={() => {}}
                              isDragging={false}
                              isSelected={true}
                              style={{
                                opacity: 1
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  );
                }
                
                return (
                  <PlaytestCard
                    id={draggedCard.instanceId}
                    card={draggedCard}
                    tapped={draggedCard.tapped}
                    facedown={draggedCard.facedown}
                    onTap={() => {}}
                    isDragging={false}
                    isSelected={isCardSelected}
                  />
                );
              }
              
              // Handle hand cards
              if (activeDragItem.id.toString().startsWith('hand-')) {
                const cardId = activeDragItem.id.toString().replace('hand-', '');
                const card = handCards.find(c => c.instanceId === cardId);
                return card ? (
                  <div className="w-[150px] h-[209px] rounded-lg shadow-lg overflow-hidden">
                    {(() => {
                      // Enhanced image URL logic - handle both snake_case and camelCase field names
                      const isDoubleFaced = ((card as any).card_faces && (card as any).card_faces.length >= 2) ||
                                            ((card as any).cardFaces && (card as any).cardFaces.length >= 2);
                      
                      // Handle both snake_case (API) and camelCase (database) field names
                      const imageUris = card.image_uris || (card as any).imageUris;
                      const cardFaces = (card as any).card_faces || (card as any).cardFaces;
                      
                      // Get image URL with comprehensive fallback chain
                      const imageUrl = isDoubleFaced 
                        ? cardFaces?.[0]?.image_uris?.normal || cardFaces?.[0]?.imageUris?.normal
                        : imageUris?.normal || cardFaces?.[0]?.image_uris?.normal || cardFaces?.[0]?.imageUris?.normal;
                      
                      return imageUrl ? (
                        <img 
                          src={imageUrl} 
                          alt={card.name} 
                          className="w-full h-full object-cover"
                          draggable={false}
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-800 flex items-center justify-center text-white text-sm p-2 text-center">
                          {card.name}
                        </div>
                      );
                    })()}
                  </div>
                ) : null;
              }
              
              // Handle library deck
              if (activeDragItem.id === 'library-deck') {
                const card = activeDragItem.data.current?.card;
                return card ? (
                  <div className="w-[150px] h-[209px] rounded-lg shadow-lg overflow-hidden">
                    {(() => {
                      // Enhanced image URL logic - handle both snake_case and camelCase field names
                      const isDoubleFaced = ((card as any).card_faces && (card as any).card_faces.length >= 2) ||
                                            ((card as any).cardFaces && (card as any).cardFaces.length >= 2);
                      
                      // Handle both snake_case (API) and camelCase (database) field names
                      const imageUris = card.image_uris || (card as any).imageUris;
                      const cardFaces = (card as any).card_faces || (card as any).cardFaces;
                      
                      // Get image URL with comprehensive fallback chain
                      const imageUrl = isDoubleFaced 
                        ? cardFaces?.[0]?.image_uris?.normal || cardFaces?.[0]?.imageUris?.normal
                        : imageUris?.normal || cardFaces?.[0]?.image_uris?.normal || cardFaces?.[0]?.imageUris?.normal;
                      
                      return imageUrl ? (
                        <img 
                          src={imageUrl} 
                          alt={card.name} 
                          className="w-full h-full object-cover"
                          draggable={false}
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-800 flex items-center justify-center text-white text-sm p-2 text-center">
                          {card.name}
                        </div>
                      );
                    })()}
                  </div>
                ) : null;
              }
              
              // Handle extra deck
              if (activeDragItem.id === 'extra-deck') {
                const card = activeDragItem.data.current?.card;
                return card ? (
                  <div className="w-[150px] h-[209px] rounded-lg shadow-lg overflow-hidden">
                    {(() => {
                      // Enhanced image URL logic - handle both snake_case and camelCase field names
                      const isDoubleFaced = ((card as any).card_faces && (card as any).card_faces.length >= 2) ||
                                            ((card as any).cardFaces && (card as any).cardFaces.length >= 2);
                      
                      // Handle both snake_case (API) and camelCase (database) field names
                      const imageUris = card.image_uris || (card as any).imageUris;
                      const cardFaces = (card as any).card_faces || (card as any).cardFaces;
                      
                      // Get image URL with comprehensive fallback chain
                      const imageUrl = isDoubleFaced 
                        ? cardFaces?.[0]?.image_uris?.normal || cardFaces?.[0]?.imageUris?.normal
                        : imageUris?.normal || cardFaces?.[0]?.image_uris?.normal || cardFaces?.[0]?.imageUris?.normal;
                      
                      return imageUrl ? (
                        <img 
                          src={imageUrl} 
                          alt={card.name} 
                          className="w-full h-full object-cover"
                          draggable={false}
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-800 flex items-center justify-center text-white text-sm p-2 text-center">
                          {card.name}
                        </div>
                      );
                    })()}
                  </div>
                ) : null;
              }
              
              return null;
            })()}
          </div>
        ) : null}
      </DragOverlay>
      
      {/* Card Preview */}
      {showPreview && previewCard && typeof window !== 'undefined' && createPortal(
        <div
          className="fixed pointer-events-none z-[10000] transition-opacity duration-200"
          style={{
            left: `${previewPosition.x}px`,
            top: `${previewPosition.y}px`,
            opacity: showPreview ? 1 : 0
          }}
        >
          <div className="relative aspect-[5/7] w-72 rounded-lg overflow-hidden shadow-2xl border-2 border-white">
            {(() => {
              // Enhanced image URL logic - handle both snake_case and camelCase field names
              const isDoubleFaced = ((previewCard as any).card_faces && (previewCard as any).card_faces.length >= 2) ||
                                    ((previewCard as any).cardFaces && (previewCard as any).cardFaces.length >= 2);
              
              // Handle both snake_case (API) and camelCase (database) field names
              const imageUris = previewCard.image_uris || (previewCard as any).imageUris;
              const cardFaces = (previewCard as any).card_faces || (previewCard as any).cardFaces;
              
              // Get image URL with comprehensive fallback chain
              const imageUrl = isDoubleFaced 
                ? cardFaces?.[0]?.image_uris?.normal || cardFaces?.[0]?.imageUris?.normal
                : imageUris?.normal || cardFaces?.[0]?.image_uris?.normal || cardFaces?.[0]?.imageUris?.normal;
              
              return imageUrl ? (
                <img 
                  src={imageUrl} 
                  alt={previewCard.name} 
                  className="w-full h-full object-cover"
                  draggable={false}
                />
              ) : (
                <div className="w-full h-full bg-gray-800 flex items-center justify-center text-white p-4 text-center">
                  <div>
                    <h3 className="font-bold mb-2">{previewCard.name}</h3>
                    <p className="text-sm">{previewCard.type_line}</p>
                    {previewCard.mana_cost && (
                      <p className="text-xs mt-2">{previewCard.mana_cost}</p>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>,
        document.body
      )}
    </DndContext>
  );
} 