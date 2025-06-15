'use client';

import React, { useState, useRef } from 'react';
import { useDraggable } from '@dnd-kit/core';
import type { MTGCard } from '@/lib/types/mtg';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import { createPortal } from 'react-dom';

interface CardSearchResultsProps {
  results: MTGCard[];
  isLoading: boolean;
  onCardAdd: (card: MTGCard) => void;
}

interface DraggableSearchCardProps {
  card: MTGCard;
  onCardAdd: (card: MTGCard) => void;
}

function DraggableSearchCard({ card, onCardAdd }: DraggableSearchCardProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);
  const [previewPosition, setPreviewPosition] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: `search-${card.id}`,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  const imageUrl = card.image_uris?.normal || 
                  (card as any).card_faces?.[0]?.image_uris?.normal;

  const handleMouseEnter = () => {
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
    
    const timeout = setTimeout(() => {
      setShowPreview(true);
    }, 500); // 500ms delay
    setHoverTimeout(timeout);
  };

  const handleMouseLeave = () => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      setHoverTimeout(null);
    }
    setShowPreview(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`cursor-grab active:cursor-grabbing ${
        isDragging ? 'opacity-0' : ''
      }`}
      onClick={() => onCardAdd(card)}
    >
      <div 
        ref={cardRef}
        className="relative aspect-[5/7] w-48 rounded-lg overflow-hidden hover:ring-2 hover:ring-white transition-all duration-200 border border-gray-600"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={card.name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
          />
        ) : (
          <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
            <div className="text-center text-gray-400 text-xs">
              No Image
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
                alt={card.name}
                fill
                className="object-cover rounded-lg"
                sizes="288px"
              />
            ) : (
              <div className="absolute inset-0 bg-gray-800 border border-gray-600 rounded-lg flex flex-col items-center justify-center p-4 text-center">
                <p className="text-white text-lg font-medium mb-2 line-clamp-3">{card.name}</p>
                <p className="text-gray-400 text-base mb-2">{card.mana_cost || ''}</p>
                <p className="text-gray-500 text-sm">{card.type_line}</p>
                {card.oracle_text && (
                  <p className="text-gray-300 text-xs mt-2 line-clamp-4">{card.oracle_text}</p>
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

export function CardSearchResults({ results, isLoading, onCardAdd }: CardSearchResultsProps) {
  const [startIndex, setStartIndex] = useState(0);
  const cardsPerPage = 5;

  const goToPrevious = () => {
    setStartIndex(prev => Math.max(0, prev - cardsPerPage));
  };

  const goToNext = () => {
    setStartIndex(prev => Math.min(results.length - cardsPerPage, prev + cardsPerPage));
  };

  const visibleCards = results.slice(startIndex, startIndex + cardsPerPage);
  const canGoBack = startIndex > 0;
  const canGoForward = startIndex + cardsPerPage < results.length;

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin w-6 h-6 border-2 border-white border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-gray-400">Searching cards...</p>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-400">No cards found. Try a different search term.</p>
      </div>
    );
  }

  return (
    <div className="mb-8">
      {/* Horizontal carousel container */}
      <div className="relative flex items-center justify-center">
        {/* Left arrow */}
        <button
          onClick={goToPrevious}
          disabled={!canGoBack}
          className={`absolute left-0 z-10 p-2 transition-all duration-200 ${
            canGoBack 
              ? 'text-white hover:text-gray-300 cursor-pointer' 
              : 'text-gray-600 cursor-not-allowed'
          }`}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Carousel */}
        <div className="flex gap-4 justify-center items-center">
          {visibleCards.map((card) => (
            <div key={card.id} className="flex-shrink-0 w-48">
              <DraggableSearchCard
                card={card}
                onCardAdd={onCardAdd}
              />
            </div>
          ))}
        </div>

        {/* Right arrow */}
        <button
          onClick={goToNext}
          disabled={!canGoForward}
          className={`absolute right-0 z-10 p-2 transition-all duration-200 ${
            canGoForward 
              ? 'text-white hover:text-gray-300 cursor-pointer' 
              : 'text-gray-600 cursor-not-allowed'
          }`}
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
} 