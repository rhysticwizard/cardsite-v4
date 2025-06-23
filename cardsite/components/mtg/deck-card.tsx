'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useDraggable } from '@dnd-kit/core';
import type { MTGCard } from '@/lib/types/mtg';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Plus, Minus } from 'lucide-react';
import Image from 'next/image';
import { createPortal } from 'react-dom';

interface DeckCardProps {
  id: string;
  card: MTGCard;
  quantity: number;
  category: 'creatures' | 'spells' | 'artifacts' | 'enchantments' | 'lands' | 'sideboard';
  onRemove: () => void;
  onQuantityChange: (newQuantity: number) => void;
  onCardChange?: (newCard: MTGCard) => void;
  onShowVariants?: (cardName: string, cardId: string) => void;
  onShowPreview?: (card: MTGCard) => void;
  isTopCard?: boolean;
  activeId: string | null;
  isViewMode?: boolean;
  isSelected?: boolean;
  onCardClick?: (cardId: string, event: React.MouseEvent) => void;
  activeHoverCard?: string | null;
  onHoverChange?: (cardId: string | null) => void;
}

export function DeckCard({ id, card, quantity, category, onRemove, onQuantityChange, onCardChange, onShowVariants, onShowPreview, isTopCard = true, activeId, isViewMode = false, isSelected = false, onCardClick, activeHoverCard, onHoverChange }: DeckCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editQuantity, setEditQuantity] = useState(quantity.toString());
  const [showPreview, setShowPreview] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [showOptionsDropdown, setShowOptionsDropdown] = useState(false);
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);
  const [controlsTimeout, setControlsTimeout] = useState<NodeJS.Timeout | null>(null);
  const [previewPosition, setPreviewPosition] = useState({ x: 0, y: 0 });
  const [currentFaceIndex, setCurrentFaceIndex] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({ id });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  // Check if card is double-faced
  const isDoubleFaced = (card as any).card_faces && (card as any).card_faces.length >= 2;
  
  // Get current face data
  const currentFace = isDoubleFaced ? (card as any).card_faces[currentFaceIndex] : card;
  
  // Get image URL for current face
  const imageUrl = isDoubleFaced 
    ? currentFace?.image_uris?.normal
    : card.image_uris?.normal || (card as any).card_faces?.[0]?.image_uris?.normal;

  const handleQuantitySubmit = () => {
    const newQuantity = parseInt(editQuantity);
    if (!isNaN(newQuantity) && newQuantity > 0) {
      onQuantityChange(newQuantity);
    }
    setIsEditing(false);
  };

  const handleQuantityKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleQuantitySubmit();
    } else if (e.key === 'Escape') {
      setEditQuantity(quantity.toString());
      setIsEditing(false);
    }
  };

  const handleMouseEnter = () => {
    // Only allow one hover preview at a time
    if (onHoverChange) {
      onHoverChange(id);
    }
    
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      const screenWidth = window.innerWidth;
      const cardCenterX = rect.left + rect.width / 2;
      const isOnRightSide = cardCenterX > screenWidth / 2;
      
      setPreviewPosition({
        x: isOnRightSide 
          ? rect.left - 288 - 16  // Show on left: card left - preview width (288px) - margin
          : rect.right + 16,      // Show on right: card right + margin
        y: rect.top
      });
    }
    
    const previewTimeout = setTimeout(() => {
      // Always show preview after timeout, the global state should be updated by now
      setShowPreview(true);
    }, 500); // 500ms delay for preview
    setHoverTimeout(previewTimeout);

    // Show controls instantly
    setShowControls(true);
  };

  const handleMouseLeave = () => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      setHoverTimeout(null);
    }
    if (controlsTimeout) {
      clearTimeout(controlsTimeout);
      setControlsTimeout(null);
    }
    setShowPreview(false);
    setShowControls(false);
    
    // Clear global hover state if this card was active
    if (onHoverChange && activeHoverCard === id) {
      onHoverChange(null);
    }
  };

  // Effect to handle when another card becomes the active hover card
  useEffect(() => {
    if (activeHoverCard !== id && showPreview) {
      setShowPreview(false);
      if (hoverTimeout) {
        clearTimeout(hoverTimeout);
        setHoverTimeout(null);
      }
    }
  }, [activeHoverCard, id, showPreview, hoverTimeout]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      
      // Check if click is outside both the options button and the dropdown
      const isOutsideButton = optionsRef.current && !optionsRef.current.contains(target);
      const isOutsideDropdown = !target.closest('[data-dropdown="options"]');
      
      if (isOutsideButton && isOutsideDropdown) {
        setShowOptionsDropdown(false);
      }
    };

    if (showOptionsDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showOptionsDropdown]);

  const handleOptionsClick = () => {
    setShowOptionsDropdown(!showOptionsDropdown);
  };

  const handleChangeSets = () => {
    if (onShowVariants) {
      onShowVariants(card.name, id);
    }
    setShowOptionsDropdown(false);
    
    // Reset hover states when showing variants to prevent stuck preview/controls
    setShowPreview(false);
    setShowControls(false);
    
    // Clear any pending timeouts
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      setHoverTimeout(null);
    }
    if (controlsTimeout) {
      clearTimeout(controlsTimeout);
      setControlsTimeout(null);
    }
  };

  const handleFlip = () => {
    if (isDoubleFaced) {
      setCurrentFaceIndex(prev => prev === 0 ? 1 : 0);
    }
    setShowOptionsDropdown(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={`${isDragging || (isSelected && activeId && activeId !== id) ? 'opacity-0' : ''} relative`}
    >
      <div 
        ref={cardRef}
        className={`relative group hover:ring-2 hover:ring-white rounded-lg transition-all duration-200 ${
          isSelected ? 'ring-2 ring-blue-500 ring-opacity-75 shadow-lg shadow-blue-500/50' : ''
        }`}
        data-card-id={id}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={(e) => {
          if (onCardClick) {
            e.stopPropagation();
            onCardClick(id, e);
          }
        }}
      >
        {/* Card */}
        <div
          {...(!isViewMode ? listeners : {})}
          className={`relative aspect-[5/7] w-48 rounded-lg overflow-hidden transition-all duration-200 bg-gray-800 border border-gray-600 ${
            !isViewMode ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
          } hover:shadow-xl hover:shadow-white/20`}
          style={{
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
          }}
        >
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={card.name}
              fill
              className="object-cover rounded-lg"
              sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
            />
          ) : (
            <div className="absolute inset-0 bg-gray-800 border border-gray-600 rounded-lg flex flex-col items-center justify-center p-2 text-center">
              <p className="text-white text-xs font-medium mb-1 line-clamp-2 select-none">{currentFace.name || card.name}</p>
              <p className="text-gray-400 text-xs select-none">{currentFace.mana_cost || card.mana_cost || ''}</p>
              <p className="text-gray-500 text-xs select-none">{currentFace.type_line || card.type_line}</p>
            </div>
          )}
        </div>
        
        {/* Quantity Badge - consistent size and format for all cards */}
        {quantity > 1 && (
          <div className="absolute top-8 left-0 bg-gradient-to-r from-black to-transparent text-white text-xs font-bold rounded-r w-12 h-4 flex items-center justify-start pl-1 shadow-md z-30 group-hover:opacity-0 transition-opacity duration-200">
            x{quantity}
          </div>
        )}



        {/* Combined Control Bar - all controls in one horizontal bar at top */}
        {!isViewMode && (
          <div className={`absolute top-0 left-0 right-0 transition-opacity duration-200 z-20 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
            <div 
              {...listeners}
              {...attributes}
              className="flex items-center justify-between bg-gradient-to-b from-black via-black/80 to-transparent rounded-t-lg px-2 py-2 cursor-grab active:cursor-grabbing">
              {/* Options Button - left */}
              <div className="relative" ref={optionsRef}>
                <Button
                  size="sm"
                  variant="ghost"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOptionsClick();
                  }}
                  className="w-6 h-6 p-0 hover:bg-gray-700 text-white hover:text-white"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                </Button>

                {/* Options Dropdown */}
                {showOptionsDropdown && typeof window !== 'undefined' && createPortal(
                  <div 
                    data-dropdown="options"
                    className="fixed bg-black border border-gray-600 rounded-lg shadow-xl z-[9999] min-w-40"
                    style={{
                      left: `${cardRef.current?.getBoundingClientRect().left || 0}px`,
                      top: `${(cardRef.current?.getBoundingClientRect().top || 0) + 32}px`,
                    }}
                  >
                    <div className="py-1">
                      <button
                        onClick={() => {
                          if (onShowPreview) {
                            onShowPreview(card);
                          }
                          // Clean up all hover states when opening preview modal
                          setShowOptionsDropdown(false);
                          setShowPreview(false);
                          setShowControls(false);
                          
                          // Clear any pending timeouts
                          if (hoverTimeout) {
                            clearTimeout(hoverTimeout);
                            setHoverTimeout(null);
                          }
                          if (controlsTimeout) {
                            clearTimeout(controlsTimeout);
                            setControlsTimeout(null);
                          }
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-white hover:bg-gray-800 transition-colors flex items-center"
                      >
                        Preview
                      </button>
                      <button
                        onClick={handleChangeSets}
                        className="w-full text-left px-3 py-2 text-sm text-white hover:bg-gray-800 transition-colors flex items-center"
                      >
                        Change Set
                      </button>
                      <button
                        onClick={() => {
                          // TODO: Implement foil treatment functionality
                          console.log('Change foil treatment for:', card.name);
                          setShowOptionsDropdown(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-white hover:bg-gray-800 transition-colors flex items-center"
                      >
                        Change Treatment
                      </button>
                      <button
                        onClick={() => {
                          // Navigate to internal card page using card ID
                          window.open(`/card/${card.id}`, '_blank');
                          setShowOptionsDropdown(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-white hover:bg-gray-800 transition-colors flex items-center"
                      >
                        Go to Card Page
                      </button>
                      {isDoubleFaced && (
                        <button
                          onClick={handleFlip}
                          className="w-full text-left px-3 py-2 text-sm text-white hover:bg-gray-800 transition-colors flex items-center"
                        >
                          Flip
                        </button>
                      )}
                    </div>
                  </div>,
                  document.body
                )}
              </div>

              {/* Quantity Controls - center */}
              <div className="flex items-center space-x-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    onQuantityChange(quantity - 1);
                  }}
                  className="w-6 h-6 p-0 hover:bg-gray-700 text-white"
                >
                  <Minus className="w-3 h-3" />
                </Button>
                
                <span className="text-white text-sm font-medium min-w-[16px] text-center px-2">
                  {quantity}
                </span>
                
                <Button
                  size="sm"
                  variant="ghost"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    onQuantityChange(quantity + 1);
                  }}
                  className="w-6 h-6 p-0 hover:bg-gray-700 text-white"
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </div>

              {/* Remove Button - right */}
              <Button
                size="sm"
                variant="ghost"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
                className="w-6 h-6 p-0 hover:bg-red-600 text-white hover:text-white"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

      </div>
      
      {/* Large Card Preview - rendered as portal to appear above everything */}
      {showPreview && typeof window !== 'undefined' && createPortal(
        <div 
          className="fixed transition-opacity duration-200 z-[9999] pointer-events-none"
          style={{
            left: `${previewPosition.x}px`,
            top: `${previewPosition.y}px`,
            opacity: showPreview ? 1 : 0
          }}
        >
          <div className="relative aspect-[5/7] w-72 rounded-lg overflow-hidden shadow-2xl border-2 border-white">
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt={currentFace.name || card.name}
                fill
                className="object-cover rounded-lg"
                sizes="288px"
              />
            ) : (
              <div className="absolute inset-0 bg-gray-800 border border-gray-600 rounded-lg flex flex-col items-center justify-center p-4 text-center">
                <p className="text-white text-lg font-medium mb-2 line-clamp-3">{currentFace.name || card.name}</p>
                <p className="text-gray-400 text-base mb-2">{currentFace.mana_cost || card.mana_cost || ''}</p>
                <p className="text-gray-500 text-sm">{currentFace.type_line || card.type_line}</p>
                {(currentFace.oracle_text || card.oracle_text) && (
                  <p className="text-gray-300 text-xs mt-2 line-clamp-4">{currentFace.oracle_text || card.oracle_text}</p>
                )}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}


    </div>
  );
} 