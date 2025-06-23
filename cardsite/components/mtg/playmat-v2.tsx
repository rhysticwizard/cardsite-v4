'use client';

import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { DndContext, DragOverlay, PointerSensor, MouseSensor, TouchSensor, useSensor, useSensors, DragStartEvent, DragEndEvent, useDroppable, useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { MTGCard } from '@/lib/types/mtg';
import { PlaytestCard } from './playtest-card';
import { HandZone, type HandCard } from './hand-zone';
import { DeckZone } from './deck-zone';
import { testCards } from './test-cards';

/**
 * PlaymatV2 - Enhanced Card Playmat with Multi-Select and Collision Detection
 * 
 * Features:
 * - Responsive collision detection for card boundaries
 * - Desktop-style multi-select with drag selection
 * - Smart group tapping (normalizes mixed states)
 * - Multi-card drag and drop with formation preservation
 * - Card preview on hover
 */

// Interface for battlefield cards
interface BattlefieldCard extends MTGCard {
  instanceId: string;
  position: {
    x: number;
    y: number;
  };
  tapped: boolean;
  facedown?: boolean; // Add facedown state
  zIndex?: number; // Add z-index for layering
}

// HandCard interface is imported from hand-zone

// Utility functions for collision detection
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

// Draggable top card component for extra deck
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
      {/* Invisible overlay for dragging */}
      <div className="w-full h-full" />
    </div>
  );
}

// Extra Deck Zone Component
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
        {/* Magic card back */}
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
        
        {/* Purple overlay to distinguish from library */}
        <div className="absolute inset-0 bg-purple-900/60 rounded-lg" />
        
        {/* Content */}
        <div className="relative z-10 text-center">
          <div className="text-sm mb-2 text-shadow">EXTRA</div>
          <div className="text-2xl font-bold text-shadow">{cardsRemaining}</div>
        </div>
        
        {/* Disabled overlay */}
        {cardsRemaining === 0 && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
            <span className="text-red-400 text-xs font-bold">EMPTY</span>
          </div>
        )}
        
        {/* Draggable top card overlay - only when cards are available */}
        {cardsRemaining > 0 && topCard && (
          <DraggableExtraTopCard card={topCard} />
        )}
      </button>
    </div>
  );
};

// Battlefield Component
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
}> = ({ cards, onCardMove, onCardTap, activeDragId, onCardHover, onCardHoverEnd, selectedCards, onMouseDown, onBattlefieldClick }) => {
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
          style={{
            left: card.position.x,
            top: card.position.y,
          }}
          isDragging={activeDragId === `battlefield-${card.instanceId}` || (activeDragId?.startsWith('battlefield-') && selectedCards.has(card.instanceId) && selectedCards.size > 1 && selectedCards.has(activeDragId.replace('battlefield-', '')))}
          zIndex={card.zIndex || 10}
          onMouseEnter={onCardHover}
          onMouseLeave={onCardHoverEnd}
          isSelected={selectedCards.has(card.instanceId)}
        />
      ))}
    </div>
  );
};

interface PlaymatV2Props {
  initialDeck?: MTGCard[];
  initialHandCards?: MTGCard[];
  initialBattlefieldCards?: MTGCard[];
  initialExtraDeckCards?: MTGCard[];
}

export function PlaymatV2({ initialDeck = [], initialHandCards = [], initialBattlefieldCards = [], initialExtraDeckCards = [] }: PlaymatV2Props) {
  const [battlefieldCards, setBattlefieldCards] = useState<BattlefieldCard[]>([]);
  const [handCards, setHandCards] = useState<HandCard[]>([]);
  const [libraryCards, setLibraryCards] = useState<MTGCard[]>([]);
  const [extraDeckCards, setExtraDeckCards] = useState<MTGCard[]>([]);
  const [activeDragItem, setActiveDragItem] = useState<any>(null);
  const [nextZIndex, setNextZIndex] = useState<number>(1); // Track the next available z-index
  
  // Hover preview state
  const [showPreview, setShowPreview] = useState(false);
  const [previewCard, setPreviewCard] = useState<MTGCard | null>(null);
  const [previewPosition, setPreviewPosition] = useState({ x: 0, y: 0 });
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);

  // Multi-select state
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<{ x: number; y: number } | null>(null);

  // Set up sensors for drag and drop with proper activation distance
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 5, // 5px activation distance to prevent accidental drags
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

  // Global mouse event handlers for selection
  useEffect(() => {
    if (!isSelecting || !selectionStart) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      const newEnd = { x: e.clientX, y: e.clientY };
      setSelectionEnd(newEnd);
      
      // Calculate selection rectangle
      const left = Math.min(selectionStart.x, e.clientX);
      const top = Math.min(selectionStart.y, e.clientY);
      const width = Math.abs(e.clientX - selectionStart.x);
      const height = Math.abs(e.clientY - selectionStart.y);
      
      const rect = { left, top, width, height };
      
      if (rect.width > 5 || rect.height > 5) {
        // Update selected cards
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
      // If we had a valid selection, mark that we just completed one
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

  // Keyboard event handlers
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

  useEffect(() => {
    // Initialize with deck cards or test cards for demo
    if (typeof window !== 'undefined') {
      // Use provided deck or fall back to test cards
      const cardsToUse = initialDeck.length > 0 ? initialDeck : testCards;
      
      // Set library cards (shuffle the deck)
      const shuffledDeck = [...cardsToUse].sort(() => Math.random() - 0.5);
      
      // Initialize hand with cards that should start in hand
      const initialHand: HandCard[] = initialHandCards.map((card, index) => ({
        ...card,
        instanceId: `initial-hand-${card.id}-${index}-${Date.now()}`
      }));
      
      // Initialize battlefield with cards that should start in play
      const initialBattlefield: BattlefieldCard[] = initialBattlefieldCards.map((card, index) => ({
        ...card,
        instanceId: `initial-battlefield-${card.id}-${index}-${Date.now()}`,
        position: {
          // Spread cards out on the battlefield in a grid pattern
          x: (window.innerWidth / 2) + ((index % 4) - 1.5) * 200, // Grid columns
          y: (window.innerHeight / 2) + Math.floor(index / 4) * 250  // Grid rows
        },
        tapped: false,
        facedown: (card as any).facedown || false, // Preserve facedown state from initial cards
        zIndex: index + 1
      }));
      
      setHandCards(initialHand);
      setLibraryCards(shuffledDeck);
      setExtraDeckCards(initialExtraDeckCards);
      
      // If no deck provided, add a test card to battlefield for demo
      let finalBattlefield = initialBattlefield;
      if (initialDeck.length === 0 && initialBattlefield.length === 0) {
        const testCard: BattlefieldCard = {
          ...testCards[0],
          instanceId: 'test-card-1',
          position: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
          tapped: false,
          zIndex: 1
        };
        
        // Add a second test card for multi-select testing
        const testCard2: BattlefieldCard = {
          ...testCards[1] || testCards[0], // Use second card or fallback to first
          instanceId: 'test-card-2',
          position: { x: window.innerWidth / 2 + 200, y: window.innerHeight / 2 + 100 },
          tapped: false,
          zIndex: 2
        };
        
        finalBattlefield = [testCard, testCard2];
        console.log('🎯 Added test cards to battlefield:', testCard.name, 'at', testCard.position, 'and', testCard2.name, 'at', testCard2.position);
      }
      
      setBattlefieldCards(finalBattlefield);
      
      console.log(`Playmat initialized: ${shuffledDeck.length} library cards, ${initialHand.length} starting hand cards, ${finalBattlefield.length} starting battlefield cards, ${initialExtraDeckCards.length} extra deck cards`);
      
      // Add window resize handler to recalculate boundaries
      const handleResize = () => {
        // Recalculate card positions to ensure they stay within bounds
        setBattlefieldCards(prev => prev.map(card => {
          const cardDimensions = getCardDimensions();
          const boundaries = calculateBoundaries(cardDimensions);
          
          // Ensure card stays within new boundaries
          const newX = Math.max(boundaries.minX, Math.min(boundaries.maxX, card.position.x));
          const newY = Math.max(boundaries.minY, Math.min(boundaries.maxY, card.position.y));
          
          if (newX !== card.position.x || newY !== card.position.y) {
            console.log('Adjusting card position after resize:', {
              cardId: card.instanceId,
              oldPos: card.position,
              newPos: { x: newX, y: newY },
              boundaries
            });
          }
          
          return { ...card, position: { x: newX, y: newY } };
        }));
      };
      
      window.addEventListener('resize', handleResize);
      
      return () => {
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [initialDeck, initialHandCards, initialBattlefieldCards, initialExtraDeckCards]);

  // Cleanup effect to clear timeouts on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeout) {
        clearTimeout(hoverTimeout);
      }
    };
  }, [hoverTimeout]);

  // Hand management functions
  const drawCard = useCallback(() => {
    if (libraryCards.length > 0) {
      const drawnCard = libraryCards[0];
      const newHandCard: HandCard = {
        ...drawnCard,
        instanceId: `hand-${drawnCard.id}-${Date.now()}`
      };
      
      setHandCards(prev => [...prev, newHandCard]);
      setLibraryCards(prev => prev.slice(1));
      console.log('Drew card:', newHandCard.name);
    }
  }, [libraryCards]);

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
    const handCard = handCards.find(card => card.instanceId === cardId);
    if (!handCard) return;

    // Remove from hand
    setHandCards(prev => prev.filter(card => card.instanceId !== cardId));
    
    // Use provided position or default to center
    const dropPosition = position || { 
      x: (typeof window !== 'undefined' ? window.innerWidth : 1920) / 2,
      y: (typeof window !== 'undefined' ? window.innerHeight : 1080) / 2
    };
    
    // Add to battlefield at drop position
    const battlefieldCard: BattlefieldCard = {
      ...handCard,
      instanceId: `battlefield-${handCard.instanceId}`,
      position: dropPosition,
      tapped: false,
      zIndex: nextZIndex
    };
    
    // Increment z-index for next card
    setNextZIndex(prev => prev + 1);
    
    setBattlefieldCards(prev => [...prev, battlefieldCard]);
    console.log('Played card:', handCard.name, 'at position:', dropPosition);
  }, [handCards, nextZIndex]);

  const playFromLibrary = useCallback((card: MTGCard, position?: { x: number; y: number }) => {
    // Use provided position or default to center
    const dropPosition = position || { 
      x: (typeof window !== 'undefined' ? window.innerWidth : 1920) / 2,
      y: (typeof window !== 'undefined' ? window.innerHeight : 1080) / 2
    };
    
    // Add to battlefield at drop position
    const battlefieldCard: BattlefieldCard = {
      ...card,
      instanceId: `battlefield-library-${card.id}-${Date.now()}`,
      position: dropPosition,
      tapped: false,
      zIndex: nextZIndex
    };
    
    // Increment z-index for next card
    setNextZIndex(prev => prev + 1);
    
    setBattlefieldCards(prev => [...prev, battlefieldCard]);
    console.log('Played card from library:', card.name, 'at position:', dropPosition);
  }, [nextZIndex]);

  const returnToHand = useCallback((cardId: string) => {
    const battlefieldCard = battlefieldCards.find(card => card.instanceId === cardId);
    if (!battlefieldCard) return;

    // Remove from battlefield
    setBattlefieldCards(prev => prev.filter(card => card.instanceId !== cardId));
    
    // Add back to hand
    const handCard: HandCard = {
      ...battlefieldCard,
      instanceId: `hand-${battlefieldCard.instanceId}-${Date.now()}`
    };
    
    setHandCards(prev => [...prev, handCard]);
    console.log('Returned card to hand:', handCard.name);
  }, [battlefieldCards]);

  const handleCardTap = useCallback((cardId: string, event?: React.MouseEvent) => {
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
        
        // Check if any selected cards are tapped
        const hasAnyTapped = selectedCardsList.some(c => c.tapped);
        const hasAnyUntapped = selectedCardsList.some(c => !c.tapped);
        
        // Smart tapping logic:
        // If mixed states (some tapped, some untapped) -> untap all
        // If all same state -> toggle all
        const targetState = hasAnyTapped && hasAnyUntapped 
          ? false // Mixed states - normalize to untapped
          : !selectedCardsList[0].tapped; // All same state - toggle all
        
        return prev.map(c => 
          selectedCards.has(c.instanceId)
            ? { ...c, tapped: targetState }
            : c
        );
      });
    } else {
      // Normal single card tap - clear selection and tap card
      setSelectedCards(new Set());
      setBattlefieldCards(prev => 
        prev.map(card => 
          card.instanceId === cardId 
            ? { ...card, tapped: !card.tapped }
            : card
        )
      );
    }
  }, [selectedCards]);

  // Multi-select functions - works like desktop file selection
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Start selection on any left click in empty space (not on a card)
    if (!activeDragItem && e.button === 0 && e.target === e.currentTarget) {
      setIsSelecting(true);
      setSelectionStart({ x: e.clientX, y: e.clientY });
      setSelectionEnd({ x: e.clientX, y: e.clientY });
      
      // Clear existing selection unless Ctrl/Cmd is held
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



  // Clear selection when clicking on empty space (but not after completing a selection)
  const [justCompletedSelection, setJustCompletedSelection] = useState(false);
  
  const handleBattlefieldClick = useCallback((e: React.MouseEvent) => {
    // Don't clear selection if we just completed a selection
    if (justCompletedSelection) {
      setJustCompletedSelection(false);
      return;
    }
    
    if (!isSelecting && e.target === e.currentTarget) {
      setSelectedCards(new Set());
    }
  }, [isSelecting, justCompletedSelection]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    console.log('Drag started:', event.active.id);
    setActiveDragItem(event.active);
    
    // Clear hover preview immediately when drag starts
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      setHoverTimeout(null);
    }
    setShowPreview(false);
    setPreviewCard(null);
    
    // If dragging from library, immediately remove the card from library
    if (event.active.id === 'library-deck') {
      setLibraryCards(prev => prev.slice(1));
      console.log('Removed card from library during drag start');
    }
    
    // If dragging from extra deck, immediately remove the card from extra deck
    if (event.active.id === 'extra-deck') {
      setExtraDeckCards(prev => prev.slice(1));
      console.log('Removed card from extra deck during drag start');
    }
  }, [hoverTimeout]);

  const handleDragCancel = useCallback(() => {
    console.log('Drag cancelled');
    
    // If library card drag was cancelled, return the card to the library
    if (activeDragItem?.id === 'library-deck') {
      const draggedCard = activeDragItem.data.current?.card;
      if (draggedCard) {
        setLibraryCards(prev => [draggedCard, ...prev]);
        console.log('Returned card to library after drag cancel');
      }
    }
    
    // If extra deck card drag was cancelled, return the card to the extra deck
    if (activeDragItem?.id === 'extra-deck') {
      const draggedCard = activeDragItem.data.current?.card;
      if (draggedCard) {
        setExtraDeckCards(prev => [draggedCard, ...prev]);
        console.log('Returned card to extra deck after drag cancel');
      }
    }
    
    // Clear drag state and allow hover previews to work again
    setActiveDragItem(null);
  }, [activeDragItem]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over, delta } = event;
    console.log('Drag ended:', { activeId: active.id, overId: over?.id, delta });
    
    // After drag ends, clear drag state and allow hover previews to work again
    setActiveDragItem(null);
    
    // Handle hand card drops
    if (active.id.toString().startsWith('hand-')) {
      const cardId = active.id.toString().replace('hand-', '');
      
      if (over?.id === 'battlefield') {
        // Calculate drop position based on the drag event
        const dropPosition = {
          x: (active.rect.current.translated?.left || 0) + 75, // Add half card width for center
          y: (active.rect.current.translated?.top || 0) + 104.5 // Add half card height for center
        };
        
        console.log('Dropping card at calculated position:', dropPosition);
        playCard(cardId, dropPosition);
      }
    }
    
    // Handle library card drops
    if (active.id === 'library-deck') {
      const draggedCard = active.data.current?.card;
      
      if (over?.id === 'battlefield' && draggedCard) {
        // Calculate drop position based on the drag event
        const dropPosition = {
          x: (active.rect.current.translated?.left || 0) + 75, // Add half card width for center
          y: (active.rect.current.translated?.top || 0) + 104.5 // Add half card height for center
        };
        
        console.log('Dropping library card at calculated position:', dropPosition);
        playFromLibrary(draggedCard, dropPosition);
      } else if (draggedCard) {
        // Card was not dropped on battlefield, return it to library
        setLibraryCards(prev => [draggedCard, ...prev]);
        console.log('Returned card to library - not dropped on battlefield');
      }
    }
    
    // Handle extra deck card drops
    if (active.id === 'extra-deck') {
      const draggedCard = active.data.current?.card;
      
      if (over?.id === 'battlefield' && draggedCard) {
        // Calculate drop position based on the drag event
        const dropPosition = {
          x: (active.rect.current.translated?.left || 0) + 75, // Add half card width for center
          y: (active.rect.current.translated?.top || 0) + 104.5 // Add half card height for center
        };
        
        console.log('Dropping extra deck card at calculated position:', dropPosition);
        playFromLibrary(draggedCard, dropPosition);
      } else if (draggedCard) {
        // Card was not dropped on battlefield, return it to extra deck
        setExtraDeckCards(prev => [draggedCard, ...prev]);
        console.log('Returned card to extra deck - not dropped on battlefield');
      }
    }
    
    // Handle battlefield card movements
    if (active.id.toString().startsWith('battlefield-')) {
      const cardId = active.id.toString().replace('battlefield-', '');
      
      // Handle drop to hand zone
      if (over?.id === 'hand-zone') {
        returnToHand(cardId);
      } else if (delta) {
        // Check if the dragged card is selected and there are multiple selected cards
        const isCardSelected = selectedCards.has(cardId);
        const shouldMoveMultiple = isCardSelected && selectedCards.size > 1;
        
        if (shouldMoveMultiple) {
          console.log('🔄 Moving multiple selected cards:', selectedCards.size);
          // Move all selected cards together
          setBattlefieldCards(prev => {
            const cardDimensions = getCardDimensions();
            const boundaries = calculateBoundaries(cardDimensions);
            
            return prev.map(c => {
              if (selectedCards.has(c.instanceId)) {
                // Calculate new position with collision detection for each selected card
                const proposedX = c.position.x + delta.x;
                const proposedY = c.position.y + delta.y;
                
                const newX = Math.max(boundaries.minX, Math.min(boundaries.maxX, proposedX));
                const newY = Math.max(boundaries.minY, Math.min(boundaries.maxY, proposedY));
                
                return { ...c, position: { x: newX, y: newY }, zIndex: nextZIndex + selectedCards.size };
              }
              return c;
            });
          });
          
          // Increment z-index for next operation
          setNextZIndex(prev => prev + selectedCards.size);
        } else {
          // Move single card (original behavior)
          setBattlefieldCards(prev => {
            const card = prev.find(c => c.instanceId === cardId);
            if (!card) return prev;
            
            /**
             * Enhanced Collision Detection System
             * 
             * This system prevents cards from moving through the walls of the playmat by:
             * 1. Calculating proper card dimensions based on screen size (responsive)
             * 2. Computing boundaries that account for card size and padding
             * 3. Constraining card positions within valid bounds
             * 4. Providing visual feedback when collision occurs
             * 
             * The collision detection works by:
             * - Getting the proposed new position (current position + drag delta)
             * - Checking if that position would put the card outside boundaries
             * - Constraining the position to stay within valid bounds
             * - Triggering visual feedback when collision is detected
             * 
             * BOUNDARY BEHAVIOR:
             * - ALL SIDES: Cards land flush against all screen edges (no padding)
             * - Collision detection prevents cards from going off-screen
             * - Cards can touch the very edges of the viewport
             */
            
            // Enhanced collision detection - calculate proper card dimensions
            const cardDimensions = getCardDimensions();
            const boundaries = calculateBoundaries(cardDimensions);
            
            // Calculate new position with proper collision detection
            const proposedX = card.position.x + delta.x;
            const proposedY = card.position.y + delta.y;

            // Apply boundary constraints (wall collision detection)
            const newX = Math.max(boundaries.minX, Math.min(boundaries.maxX, proposedX));
            const newY = Math.max(boundaries.minY, Math.min(boundaries.maxY, proposedY));
            
            // Check if collision occurred (for logging purposes)
            const collisionDetected = newX !== proposedX || newY !== proposedY;
            if (collisionDetected) {
              console.log('Collision detected - card stopped at boundary');
            }
            
            console.log('Collision detection:', { 
              cardId, 
              boundaries,
              proposed: { x: proposedX, y: proposedY },
              final: { x: newX, y: newY },
              collisionDetected
            });
            
            return prev.map(c => 
              c.instanceId === cardId 
                ? { ...c, position: { x: newX, y: newY }, zIndex: nextZIndex }
                : c
            );
          });
          
          // Increment z-index for next operation
          setNextZIndex(prev => prev + 1);
        }
      }
    }
    
    setActiveDragItem(null);
  }, [playCard, returnToHand, playFromLibrary, nextZIndex, selectedCards]);

  const handleCardMove = useCallback((cardId: string, x: number, y: number) => {
    setBattlefieldCards(prev => 
      prev.map(card => 
        card.instanceId === cardId 
          ? { ...card, position: { x, y } }
          : card
      )
    );
  }, []);

  // Hover handlers for card preview
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

  return (
    <DndContext 
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
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
        />
        
        {/* Deck Zone - positioned in bottom right */}
        {libraryCards.length > 0 && (
          <DeckZone 
            cardsRemaining={libraryCards.length}
            onDeckClick={drawCard}
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
        
        {/* Hand Zone */}
        <HandZone 
          cards={handCards}
          onCardPlay={playCard}
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
                
                // Check if we're dragging multiple selected cards
                const isCardSelected = selectedCards.has(cardId);
                const shouldShowMultiple = isCardSelected && selectedCards.size > 1;
                
                if (shouldShowMultiple) {
                  // Show all selected cards in their relative positions
                  const selectedCardsList = battlefieldCards.filter(c => selectedCards.has(c.instanceId));
                  
                  // Calculate the bounds of all selected cards to center the group
                  const minX = Math.min(...selectedCardsList.map(c => c.position.x));
                  const minY = Math.min(...selectedCardsList.map(c => c.position.y));
                  const maxX = Math.max(...selectedCardsList.map(c => c.position.x));
                  const maxY = Math.max(...selectedCardsList.map(c => c.position.y));
                  
                  // Calculate center point of the selection
                  const centerX = (minX + maxX) / 2;
                  const centerY = (minY + maxY) / 2;
                  
                  // Find the dragged card's offset from center
                  const draggedOffsetX = draggedCard.position.x - centerX;
                  const draggedOffsetY = draggedCard.position.y - centerY;
                  
                  console.log('🎯 Drag overlay - showing multiple cards:', {
                    selectedCount: selectedCards.size,
                    bounds: { minX, minY, maxX, maxY },
                    center: { centerX, centerY },
                    draggedOffset: { draggedOffsetX, draggedOffsetY }
                  });
                  
                  return (
                    <div className="relative">
                      {selectedCardsList.map((card) => {
                        // Calculate each card's position relative to the dragged card
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
                                opacity: 1 // All cards at full opacity in drag preview
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  );
                } else {
                  // Show single card (original behavior)

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
              }
              
              // Handle hand cards
              if (activeDragItem.id.toString().startsWith('hand-')) {
                const cardId = activeDragItem.id.toString().replace('hand-', '');
                const card = handCards.find(c => c.instanceId === cardId);
                return card ? (
                  <div className="w-[150px] h-[209px] rounded-lg shadow-lg overflow-hidden">
                    {card.image_uris?.normal ? (
                      <img 
                        src={card.image_uris.normal} 
                        alt={card.name} 
                        className="w-full h-full object-cover"
                        draggable={false}
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-800 flex items-center justify-center text-white text-sm p-2 text-center">
                        {card.name}
                      </div>
                    )}
                  </div>
                ) : null;
              }
              
              // Handle library cards
              if (activeDragItem.id === 'library-deck') {
                const topCard = libraryCards[0];
                return topCard ? (
                  <div className="w-[150px] h-[209px] rounded-lg shadow-lg overflow-hidden">
                    {topCard.image_uris?.normal ? (
                      <img 
                        src={topCard.image_uris.normal} 
                        alt={topCard.name} 
                        className="w-full h-full object-cover"
                        draggable={false}
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-800 flex items-center justify-center text-white text-sm p-2 text-center">
                        {topCard.name}
                      </div>
                    )}
                  </div>
                ) : null;
              }
              
              // Handle extra deck cards
              if (activeDragItem.id === 'extra-deck') {
                const topCard = extraDeckCards[0];
                return topCard ? (
                  <div className="w-[150px] h-[209px] rounded-lg shadow-lg overflow-hidden">
                    {topCard.image_uris?.normal ? (
                      <img 
                        src={topCard.image_uris.normal} 
                        alt={topCard.name} 
                        className="w-full h-full object-cover"
                        draggable={false}
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-800 flex items-center justify-center text-white text-sm p-2 text-center">
                        {topCard.name}
                      </div>
                    )}
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
          className="fixed pointer-events-none z-[9999] transition-opacity duration-200"
          style={{
            left: `${previewPosition.x}px`,
            top: `${previewPosition.y}px`,
            opacity: showPreview ? 1 : 0
          }}
        >
          <div className="relative aspect-[5/7] w-72 rounded-lg overflow-hidden shadow-2xl border-2 border-white">
            {(() => {
              const cardFaces = (previewCard as any).card_faces;
              const isDoubleFaced = cardFaces && cardFaces.length >= 2;
              const currentFace = isDoubleFaced ? cardFaces[0] : previewCard;
              const imageUrl = isDoubleFaced 
                ? currentFace?.image_uris?.normal
                : previewCard.image_uris?.normal || (previewCard as any).card_faces?.[0]?.image_uris?.normal;

              return imageUrl ? (
                <img
                  src={imageUrl}
                  alt={currentFace.name || previewCard.name}
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                <div className="w-72 h-96 bg-gray-800 border border-gray-600 rounded-lg flex flex-col items-center justify-center p-6 text-center">
                  <p className="text-white text-xl font-medium mb-3">{currentFace.name || previewCard.name}</p>
                  <p className="text-gray-400 text-lg mb-3">{currentFace.mana_cost || previewCard.mana_cost || ''}</p>
                  <p className="text-gray-500 text-base">{currentFace.type_line || previewCard.type_line}</p>
                  {(currentFace.oracle_text || previewCard.oracle_text) && (
                    <p className="text-gray-300 text-sm mt-4 leading-relaxed">{currentFace.oracle_text || previewCard.oracle_text}</p>
                  )}
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