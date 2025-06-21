'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import type { MTGCard } from '@/lib/types/mtg';
import { ChevronDown, ChevronRight, Check } from 'lucide-react';
import { DeckCard } from './deck-card';
import { DeckCardText } from './deck-card-text';

interface DeckCardData {
  id: string;
  card: MTGCard;
  quantity: number;
  category: 'creatures' | 'spells' | 'artifacts' | 'enchantments' | 'lands' | 'sideboard';
}

type DeckCategory = 'creatures' | 'spells' | 'artifacts' | 'enchantments' | 'lands' | 'sideboard';

interface DeckColumnProps {
  id: string;
  title: string;
  cards: DeckCardData[];
  onCardRemove: (cardId: string, category: DeckCategory) => void;
  onQuantityChange: (cardId: string, category: DeckCategory, newQuantity: number) => void;
  onCardChange?: (cardId: string, category: DeckCategory, newCard: MTGCard) => void;
  onShowVariants?: (cardName: string, cardId: string) => void;
  onShowPreview?: (card: MTGCard) => void;
  onColumnDelete?: (columnId: string) => void;
  onColumnRename?: (columnId: string, newTitle: string) => void;
  onColumnOptionChange?: (columnId: string, option: string) => void;
  columnOption?: string;
  activeId: string | null;
  viewMode?: 'visual' | 'text';
  isViewMode?: boolean;
}

export function DeckColumn({ id, title, cards, onCardRemove, onQuantityChange, onCardChange, onShowVariants, onShowPreview, onColumnDelete, onColumnRename, onColumnOptionChange, columnOption = 'Starts in Deck', activeId, viewMode = 'visual', isViewMode = false }: DeckColumnProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showColumnOptions, setShowColumnOptions] = useState(false);
  const [showStartsInPlay, setShowStartsInPlay] = useState(false);
  // Use the columnOption prop instead of local state
  const [isRenaming, setIsRenaming] = useState(false);
  const [newTitle, setNewTitle] = useState(title);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { isOver, setNodeRef } = useDroppable({
    id: id,
  });

  // Make column header draggable for reordering
  const {
    attributes,
    listeners,
    setNodeRef: setDragNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: `column-${id}`,
    disabled: isViewMode || isRenaming || showDropdown,
  });

  // Make entire column a drop target for other columns
  const { isOver: isColumnOver, setNodeRef: setColumnDropRef } = useDroppable({
    id: `column-${id}`,
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
        setShowColumnOptions(false);
        setShowStartsInPlay(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  const handleOptionSelect = (option: string) => {
    if (option === 'rename') {
      setIsRenaming(true);
      setShowDropdown(false);
      setShowColumnOptions(false);
      setShowStartsInPlay(false);
      return;
    }
    if (option === 'delete') {
      if (onColumnDelete) {
        onColumnDelete(id);
      }
      setShowDropdown(false);
      setShowColumnOptions(false);
      setShowStartsInPlay(false);
      return;
    }
    // Notify parent of column option change
    if (onColumnOptionChange) {
      onColumnOptionChange(id, option);
    }
    setShowDropdown(false);
    setShowColumnOptions(false);
    setShowStartsInPlay(false);
  };

  const handleRenameSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      setIsRenaming(false);
      if (onColumnRename && newTitle !== title) {
        onColumnRename(id, newTitle);
      }
    }
  };

  const handleRenameBlur = () => {
    setIsRenaming(false);
    if (onColumnRename && newTitle !== title) {
      onColumnRename(id, newTitle);
    }
  };

  // Calculate the minimum height needed for cards based on view mode
  const calculateMinHeight = () => {
    if (cards.length === 0) return 300; // min height for empty column
    
    if (viewMode === 'text') {
      // Header(40) + topPadding(16) + cardHeight(40) * cards + gap(8) * (cards-1) + bottomPadding(16)
      return 40 + 16 + (40 * cards.length) + (8 * Math.max(0, cards.length - 1)) + 16;
    } else {
      // Visual mode: Header(40) + topPadding(16) + cardHeight(268) + stackingOffset + bottomPadding(16)
      return 40 + 16 + 268 + (cards.length - 1) * 60 + 16;
    }
  };

  return (
    <div className="relative">
      {/* Column drop zone overlay - only active when dragging columns */}
      {activeId?.startsWith('column-') && (
        <div
          ref={setColumnDropRef}
          className="absolute inset-0 z-10 pointer-events-auto"
          style={{ minHeight: `${calculateMinHeight()}px` }}
        />
      )}
      
      {/* Main column for card drops */}
      <div 
        ref={setNodeRef}
        className={`w-[220px] rounded-lg overflow-visible transition-colors duration-200 ${
          isDragging 
            ? 'opacity-0' // Completely hide when dragging to prevent ghosting
            : isColumnOver 
              ? 'bg-blue-900/40 border-2 border-blue-500 border-dashed' // Column drop styling
              : isViewMode 
                ? 'bg-black border-2 border-transparent' 
                : cards.length === 0 
                  ? (isOver ? 'bg-black border-2 border-white border-dashed' : 'bg-black border-2 border-gray-600 border-dashed')
                  : (isOver ? 'bg-black border-2 border-white border-dashed' : 'bg-black border-2 border-transparent')
        }`}
        style={{ minHeight: `${calculateMinHeight()}px` }}
      >
        {/* Column Header */}
        <div className="relative" ref={dropdownRef}>
          {isRenaming ? (
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={handleRenameSubmit}
              onBlur={handleRenameBlur}
              className="w-full px-4 py-2 text-sm font-medium text-white bg-black border-b border-gray-600 focus:outline-none focus:border-blue-500"
              autoFocus
            />
          ) : (
            <button
              ref={setDragNodeRef}
              {...attributes}
              {...(!isViewMode ? listeners : {})}
              onClick={!isViewMode ? () => setShowDropdown(!showDropdown) : undefined}
              className={`w-full flex items-center justify-between px-4 py-2 text-sm font-medium text-white transition-colors border-b border-gray-600 bg-black rounded-t-lg ${
                !isViewMode ? 'hover:text-gray-300 cursor-pointer' : 'cursor-default'
              } ${isColumnOver ? 'bg-blue-800 border-blue-500' : ''}`}
            >
              <span>{newTitle}</span>
              {!isViewMode && <ChevronDown className="w-4 h-4" />}
            </button>
          )}
              
          {showDropdown && !isViewMode && (
            <div className="absolute left-0 top-full w-full bg-black border border-gray-600 shadow-xl z-50">
              <div className="py-1">
                <button
                  onClick={() => setShowColumnOptions(!showColumnOptions)}
                  className="w-full px-3 py-2 text-left text-sm text-white hover:bg-gray-800 transition-colors flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center">
                    {showColumnOptions ? <ChevronDown className="w-3 h-3 mr-2" /> : <ChevronRight className="w-3 h-3 mr-2" />}
                    Column Options
                  </span>
                </button>
                
                {showColumnOptions && (
                  <>
                    <button
                      onClick={() => handleOptionSelect('Starts in Deck')}
                      className="w-full px-6 py-2 text-left text-sm text-white hover:bg-gray-800 transition-colors flex items-center justify-between cursor-pointer"
                    >
                      <span className="flex items-center">
                        <span className="w-3 h-3 mr-2"></span>
                        Starts in Deck
                      </span>
                      {columnOption === 'Starts in Deck' && <Check className="w-3 h-3" />}
                    </button>
                    <button
                      onClick={() => handleOptionSelect('Starts in Extra')}
                      className="w-full px-6 py-2 text-left text-sm text-white hover:bg-gray-800 transition-colors flex items-center justify-between cursor-pointer"
                    >
                      <span className="flex items-center">
                        <span className="w-3 h-3 mr-2"></span>
                        Starts in Extra
                      </span>
                      {columnOption === 'Starts in Extra' && <Check className="w-3 h-3" />}
                    </button>
                    <button
                      onClick={() => handleOptionSelect('Starts in Hand')}
                      className="w-full px-6 py-2 text-left text-sm text-white hover:bg-gray-800 transition-colors flex items-center justify-between cursor-pointer"
                    >
                      <span className="flex items-center">
                        <span className="w-3 h-3 mr-2"></span>
                        Starts in Hand
                      </span>
                      {columnOption === 'Starts in Hand' && <Check className="w-3 h-3" />}
                    </button>
                    
                    <button
                      onClick={() => setShowStartsInPlay(!showStartsInPlay)}
                      className="w-full px-6 py-2 text-left text-sm text-white hover:bg-gray-800 transition-colors flex items-center cursor-pointer"
                    >
                      {showStartsInPlay ? <ChevronDown className="w-3 h-3 mr-2" /> : <ChevronRight className="w-3 h-3 mr-2" />}
                      Starts in Play
                    </button>
                    
                    {showStartsInPlay && (
                      <>
                        <button
                          onClick={() => handleOptionSelect('Faceup')}
                          className="w-full pl-16 pr-3 py-2 text-left text-sm text-white hover:bg-gray-800 transition-colors cursor-pointer"
                        >
                          Faceup
                        </button>
                        <button
                          onClick={() => handleOptionSelect('Facedown')}
                          className="w-full pl-16 pr-3 py-2 text-left text-sm text-white hover:bg-gray-800 transition-colors cursor-pointer"
                        >
                          Facedown
                        </button>
                      </>
                    )}
                    
                    <button
                      onClick={() => handleOptionSelect('Sideboard')}
                      className="w-full px-6 py-2 text-left text-sm text-white hover:bg-gray-800 transition-colors flex items-center justify-between cursor-pointer"
                    >
                      <span className="flex items-center">
                        <span className="w-3 h-3 mr-2"></span>
                        Sideboard
                      </span>
                      {columnOption === 'Sideboard' && <Check className="w-3 h-3" />}
                    </button>
                  </>
                )}
                
                <button
                  onClick={() => handleOptionSelect('rename')}
                  className="w-full px-3 py-2 text-left text-sm text-white hover:bg-gray-800 transition-colors cursor-pointer"
                >
                  Rename
                </button>
                
                <button
                  onClick={() => handleOptionSelect('delete')}
                  className="w-full px-3 py-2 text-left text-sm text-white hover:bg-gray-800 transition-colors cursor-pointer"
                >
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Cards Container - MTG Arena style stacking */}
        <div className="relative px-0 py-4 flex-1">
          {/* Invisible drop overlay - ensures drop zone is always accessible */}
          <div 
            className="absolute inset-0 z-0 pointer-events-none"
            style={{ 
              pointerEvents: activeId ? 'auto' : 'none' // Only active during drag
            }}
          />
          
          {cards.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center text-gray-500">
              {!isViewMode && <p className="text-sm">Drag cards here</p>}
            </div>
          ) : viewMode === 'text' ? (
            <div className="space-y-2">
              {cards.map((cardData) => (
                <DeckCardText
                  key={cardData.id}
                  id={cardData.id}
                  card={cardData.card}
                  quantity={cardData.quantity}
                  category={cardData.category}
                  onRemove={() => onCardRemove(cardData.id, cardData.category)}
                  onQuantityChange={(newQuantity) => onQuantityChange(cardData.id, cardData.category, newQuantity)}
                  onShowVariants={onShowVariants}
                  onShowPreview={onShowPreview}
                  activeId={activeId}
                  isViewMode={isViewMode}
                />
              ))}
            </div>
          ) : (
            <div className="relative">
              {cards.map((cardData, index) => (
                <div
                  key={cardData.id}
                  className="absolute transition-all duration-200 ease-out"
                  style={{
                    top: `${index * 60}px`,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: index + 1, // Fixed: newer cards on top
                  }}
                >
                  <DeckCard
                    id={cardData.id}
                    card={cardData.card}
                    quantity={cardData.quantity}
                    category={cardData.category}
                    onRemove={() => onCardRemove(cardData.id, cardData.category)}
                    onQuantityChange={(newQuantity) => onQuantityChange(cardData.id, cardData.category, newQuantity)}
                    onCardChange={(newCard) => onCardChange?.(cardData.id, cardData.category, newCard)}
                    onShowVariants={onShowVariants}
                    onShowPreview={onShowPreview}
                    isTopCard={index === cards.length - 1}
                    activeId={activeId}
                    isViewMode={isViewMode}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 