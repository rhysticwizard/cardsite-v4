'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useDraggable } from '@dnd-kit/core';
import type { MTGCard } from '@/lib/types/mtg';
import { MoreVertical, Plus, Minus } from 'lucide-react';
import Image from 'next/image';
import { createPortal } from 'react-dom';


interface DeckCardTextProps {
  id: string;
  card: MTGCard;
  quantity: number;
  category: 'creatures' | 'spells' | 'artifacts' | 'enchantments' | 'lands' | 'sideboard';
  onRemove: () => void;
  onQuantityChange: (newQuantity: number) => void;
  onShowVariants?: (cardName: string, cardId: string) => void;
  onShowPreview?: (card: MTGCard) => void;
  activeId: string | null;
}

export function DeckCardText({ 
  id, 
  card, 
  quantity,
  category,
  onRemove,
  onQuantityChange,
  onShowVariants,
  onShowPreview,
  activeId 
}: DeckCardTextProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewPosition, setPreviewPosition] = useState({ x: 0, y: 0 });
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

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

  const handleIncrement = () => {
    onQuantityChange(quantity + 1);
  };

  const handleDecrement = () => {
    if (quantity > 1) {
      onQuantityChange(quantity - 1);
    }
  };

  const handleOptionsClick = () => {
    setShowOptions(!showOptions);
  };

  const handlePreview = () => {
    if (onShowPreview) {
      onShowPreview(card);
    }
    setShowOptions(false);
  };

  const handleVariants = () => {
    if (onShowVariants) {
      onShowVariants(card.name, id);
    }
    setShowOptions(false);
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
    
    // Clear any existing timeout first
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      setHoverTimeout(null);
    }
    
    // Clear any existing preview immediately
    setShowPreview(false);
    
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
      setShowPreview(true);
    }, 500); // 500ms delay for preview
    setHoverTimeout(previewTimeout);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setShowOptions(false);
    
    // Clear timeout immediately
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      setHoverTimeout(null);
    }
    
    // Hide preview immediately
    setShowPreview(false);
  };

  // Cleanup effect to clear timeouts on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeout) {
        clearTimeout(hoverTimeout);
      }
    };
  }, [hoverTimeout]);

  return (
    <div
      ref={(node) => {
        setNodeRef(node);
        cardRef.current = node;
      }}
      style={style}
      {...attributes}
      className={`${isDragging ? 'opacity-50' : ''} relative group`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        {...listeners}
        className="flex items-center px-3 py-2 bg-black hover:bg-gray-900 border border-gray-800 hover:border-gray-600 rounded cursor-grab active:cursor-grabbing transition-colors"
      >
        {isHovered ? (
          <div className="flex items-center w-full relative">
            {/* Options Button - Absolute positioned */}
            <div className="absolute left-0 z-10">
              <button
                onClick={handleOptionsClick}
                className="w-6 h-6 rounded hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              
              {showOptions && (
                <div className="absolute left-0 top-full mt-1 bg-black border border-gray-600 rounded-lg shadow-xl z-50 min-w-[120px]">
                  <div className="py-1">
                    <button
                      onClick={handlePreview}
                      className="w-full px-3 py-2 text-left text-sm text-white hover:bg-gray-800 transition-colors"
                    >
                      Preview
                    </button>
                    <button
                      onClick={handleVariants}
                      className="w-full px-3 py-2 text-left text-sm text-white hover:bg-gray-800 transition-colors"
                    >
                      Change Sets
                    </button>
                    <button
                      onClick={onRemove}
                      className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-gray-800 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Quantity Controls - Truly Centered */}
            <div className="flex items-center justify-center w-full">
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleDecrement}
                  className="w-6 h-6 rounded hover:bg-gray-700 flex items-center justify-center text-white hover:text-gray-300 transition-colors"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="text-white font-medium text-sm min-w-[2rem] text-center">
                  {quantity}
                </span>
                <button
                  onClick={handleIncrement}
                  className="w-6 h-6 rounded hover:bg-gray-700 flex items-center justify-center text-white hover:text-gray-300 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Normal View - Quantity */}
            <div className="flex-shrink-0 mr-3">
              <span className="text-gray-400 text-sm font-medium">
                {quantity}
              </span>
            </div>
            
            {/* Normal View - Card Name */}
            <div className="flex-1 min-w-0 overflow-hidden">
              <span className="text-white text-sm font-medium truncate block">
                {card.name}
              </span>
            </div>
          </>
        )}
      </div>
      
      {/* Card Preview Portal */}
      {showPreview && typeof window !== 'undefined' && createPortal(
        <div
          className="fixed z-50 pointer-events-none"
          style={{
            left: `${previewPosition.x}px`,
            top: `${previewPosition.y}px`,
          }}
        >
          <div className="relative w-72 h-auto bg-black border border-gray-600 rounded-lg overflow-hidden shadow-2xl">
            {(() => {
              const cardFaces = (card as any).card_faces;
              const isDoubleFaced = cardFaces && cardFaces.length >= 2;
              const currentFace = isDoubleFaced ? cardFaces[0] : card;
              const imageUrl = isDoubleFaced 
                ? currentFace?.image_uris?.normal
                : card.image_uris?.normal || (card as any).card_faces?.[0]?.image_uris?.normal;

              return imageUrl ? (
                <Image
                  src={imageUrl}
                  alt={currentFace.name || card.name}
                  width={288}
                  height={402}
                  className="object-cover rounded-lg"
                  priority
                />
              ) : (
                <div className="w-72 h-96 bg-gray-800 border border-gray-600 rounded-lg flex flex-col items-center justify-center p-6 text-center">
                  <p className="text-white text-xl font-medium mb-3">{currentFace.name || card.name}</p>
                  <p className="text-gray-400 text-lg mb-3">{currentFace.mana_cost || card.mana_cost || ''}</p>
                  <p className="text-gray-500 text-base">{currentFace.type_line || card.type_line}</p>
                  {(currentFace.oracle_text || card.oracle_text) && (
                    <p className="text-gray-300 text-sm mt-4 leading-relaxed">{currentFace.oracle_text || card.oracle_text}</p>
                  )}
                </div>
              );
            })()}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
} 