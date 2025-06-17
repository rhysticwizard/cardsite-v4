'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useDraggable } from '@dnd-kit/core';
import type { MTGCard } from '@/lib/types/mtg';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import { createPortal } from 'react-dom';

interface CardSearchResultsProps {
  results: MTGCard[];
  isLoading: boolean;
  onCardAdd: (card: MTGCard) => void;
  onVariantSelect?: (card: MTGCard) => void;
  isShowingVariants?: boolean;
  viewMode?: 'visual' | 'text';
}

interface DraggableSearchCardProps {
  card: MTGCard;
  onCardAdd: (card: MTGCard) => void;
  onVariantSelect?: (card: MTGCard) => void;
  isShowingVariants?: boolean;
  viewMode?: 'visual' | 'text';
  showPreview: boolean;
  previewPosition: { x: number; y: number };
  onMouseEnter: (card: MTGCard, rect: DOMRect) => void;
  onMouseLeave: () => void;
}

function DraggableSearchCard({ card, onCardAdd, onVariantSelect, isShowingVariants, viewMode = 'visual', showPreview, previewPosition, onMouseEnter, onMouseLeave }: DraggableSearchCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: `search-${card.id}`,
    disabled: isShowingVariants,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    willChange: 'transform',
  } : undefined;

  const imageUrl = card.image_uris?.normal || 
                  (card as any).card_faces?.[0]?.image_uris?.normal;

  const handleMouseEnter = () => {
    // Disable hover preview during drag to prevent performance issues
    if (isDragging) return;
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      onMouseEnter(card, rect);
    }
  };

  const handleMouseLeave = () => {
    onMouseLeave();
  };

  if (viewMode === 'text') {
    return (
      <div
        ref={setNodeRef}
        style={style}
        {...(isShowingVariants ? {} : listeners)}
        {...(isShowingVariants ? {} : attributes)}
        className={`${
          isShowingVariants 
            ? 'cursor-pointer'
            : `cursor-grab active:cursor-grabbing ${isDragging ? 'opacity-50' : ''}`
        }`}
        onClick={() => {
          if (isShowingVariants && onVariantSelect) {
            onVariantSelect(card);
          } else {
            onCardAdd(card);
          }
        }}
      >
        <div 
          ref={cardRef}
          className="grid grid-cols-7 gap-2 px-3 py-2 bg-black hover:bg-gray-900 border border-gray-800 hover:border-gray-600 rounded cursor-grab active:cursor-grabbing transition-colors text-xs items-center"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {/* Set */}
          <span className="text-white font-medium truncate">{card.set.toUpperCase()}</span>
          
          {/* Name & Type */}
          <div className="col-span-2">
            <span className="text-white font-medium truncate block">{card.name}</span>
            <span className="text-gray-500 text-xs truncate block">{card.type_line}</span>
          </div>
          
          {/* Mana Cost */}
          <span className="text-blue-400 font-medium">{card.mana_cost || '—'}</span>
          
          {/* Rarity */}
          <span className={`font-medium capitalize ${
            card.rarity === 'mythic' ? 'text-orange-400' :
            card.rarity === 'rare' ? 'text-yellow-400' :
            card.rarity === 'uncommon' ? 'text-gray-300' :
            'text-gray-500'
          }`}>
            {card.rarity?.charAt(0).toUpperCase()}
          </span>
          
          {/* Artist */}
          <span className="text-gray-300 truncate">{card.artist || '—'}</span>
          
          {/* Price */}
          <span className="text-green-400 font-medium text-right">
              {card.prices.usd ? `$${card.prices.usd}` : 
               card.prices.eur ? `€${card.prices.eur}` : 
             card.prices.tix ? `${card.prices.tix}T` : 
             '—'}
            </span>
        </div>


      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(isShowingVariants ? {} : listeners)}
      {...(isShowingVariants ? {} : attributes)}
      className={`${
        isShowingVariants 
          ? 'cursor-pointer'
          : `cursor-grab active:cursor-grabbing ${isDragging ? 'opacity-0' : ''}`
      }`}
      onClick={() => {
        if (isShowingVariants && onVariantSelect) {
          onVariantSelect(card);
        } else {
          onCardAdd(card);
        }
      }}
    >
      <div 
        ref={cardRef}
        className={`relative aspect-[5/7] w-48 rounded-lg overflow-hidden border border-gray-600 ${
          isDragging 
            ? 'transform-gpu' 
            : 'hover:ring-2 hover:ring-white transition-all duration-200'
        }`}
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


    </div>
  );
}

export function CardSearchResults({ results, isLoading, onCardAdd, onVariantSelect, isShowingVariants, viewMode = 'visual' }: CardSearchResultsProps) {
  const [startIndex, setStartIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewPosition, setPreviewPosition] = useState({ x: 0, y: 0 });
  const [previewCard, setPreviewCard] = useState<MTGCard | null>(null);
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);
  const cardsPerPage = 5;

  // Reset carousel position when results change
  React.useEffect(() => {
    setStartIndex(0);
  }, [results]);

  const goToPrevious = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setStartIndex(prev => Math.max(0, prev - cardsPerPage));
    setTimeout(() => setIsTransitioning(false), 300);
  };

  const goToNext = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setStartIndex(prev => Math.min(results.length - cardsPerPage, prev + cardsPerPage));
    setTimeout(() => setIsTransitioning(false), 300);
  };

  const visibleCards = results.slice(startIndex, startIndex + cardsPerPage);
  const canGoBack = startIndex > 0;
  const canGoForward = startIndex + cardsPerPage < results.length;

  const handleMouseEnter = (card: MTGCard, rect: DOMRect) => {
    // Clear any existing timeout
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
    }
    
    // Calculate position
    const screenWidth = window.innerWidth;
    const cardCenterX = rect.left + rect.width / 2;
    const isOnRightSide = cardCenterX > screenWidth / 2;
    
    setPreviewPosition({
      x: isOnRightSide 
        ? rect.left - 288 - 16  // Show on left
        : rect.right + 16,      // Show on right
      y: rect.top
    });
    setPreviewCard(card);
    
    // Set timeout to show preview
    const timeout = setTimeout(() => {
      setShowPreview(true);
    }, 500);
    setHoverTimeout(timeout);
  };

  const handleMouseLeave = () => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      setHoverTimeout(null);
    }
    setShowPreview(false);
    setPreviewCard(null);
  };

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

  if (viewMode === 'text') {
    return (
      <div className="mb-8">
        {/* Text view - vertical list */}
        <div className="max-w-xl mx-auto mb-16">
          {/* Header Row */}
          <div className="grid grid-cols-7 gap-2 px-3 py-2 border-b border-gray-700 text-xs">
            <span className="text-gray-400 uppercase font-medium">SET</span>
            <span className="text-gray-400 uppercase font-medium col-span-2">NAME</span>
            <span className="text-gray-400 uppercase font-medium">COST</span>
            <span className="text-gray-400 uppercase font-medium">RARITY</span>
            <span className="text-gray-400 uppercase font-medium">ARTIST</span>
            <span className="text-gray-400 uppercase font-medium text-right">PRICE</span>
          </div>
          <div className="space-y-1 max-h-80 overflow-y-auto pr-3 pb-2 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-600 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb:hover]:bg-gray-500 [&>*]:-mr-3">
          {results.map((card) => (
            <DraggableSearchCard
              key={card.id}
              card={card}
              onCardAdd={onCardAdd}
              onVariantSelect={onVariantSelect}
              isShowingVariants={isShowingVariants}
              viewMode={viewMode}
              showPreview={showPreview && previewCard?.id === card.id}
              previewPosition={previewPosition}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            />
          )         )}
          </div>
        </div>
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
          disabled={!canGoBack || isTransitioning}
          className={`absolute left-0 z-10 p-2 transition-all duration-200 ${
            canGoBack && !isTransitioning
              ? 'text-white hover:text-gray-300 cursor-pointer' 
              : 'text-gray-600 cursor-not-allowed'
          }`}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Carousel */}
        <div className="overflow-hidden w-full py-1 px-1" style={{ width: `${cardsPerPage * (192 + 16) - 16 + 8}px`, height: '280px' }}>
          <div 
            className="flex gap-4 transition-transform duration-300 ease-in-out h-full"
            style={{
              transform: `translateX(-${startIndex * (192 + 16)}px)`, // 192px card width + 16px gap
              width: `${results.length * (192 + 16)}px`
            }}
          >
            {results.map((card) => (
              <div 
                key={card.id} 
                className="flex-shrink-0 w-48"
              >
              <DraggableSearchCard
                card={card}
                onCardAdd={onCardAdd}
                  onVariantSelect={onVariantSelect}
                  isShowingVariants={isShowingVariants}
                  viewMode={viewMode}
                showPreview={showPreview && previewCard?.id === card.id}
                previewPosition={previewPosition}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              />
            </div>
          ))}
          </div>
        </div>

        {/* Right arrow */}
        <button
          onClick={goToNext}
          disabled={!canGoForward || isTransitioning}
          className={`absolute right-0 z-10 p-2 transition-all duration-200 ${
            canGoForward && !isTransitioning
              ? 'text-white hover:text-gray-300 cursor-pointer' 
              : 'text-gray-600 cursor-not-allowed'
          }`}
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Single centralized preview portal */}
      {showPreview && previewCard && typeof window !== 'undefined' && createPortal(
        <div 
          className="fixed transition-opacity duration-200 z-[9999] pointer-events-none"
          style={{
            left: `${previewPosition.x}px`,
            top: `${previewPosition.y}px`,
            opacity: 1
          }}
        >
          <div className="relative aspect-[5/7] w-72 rounded-lg overflow-hidden shadow-2xl border-2 border-white">
            {(previewCard.image_uris?.normal || (previewCard as any).card_faces?.[0]?.image_uris?.normal) ? (
              <Image
                src={previewCard.image_uris?.normal || (previewCard as any).card_faces?.[0]?.image_uris?.normal}
                alt={previewCard.name}
                fill
                className="object-cover rounded-lg"
                sizes="288px"
              />
            ) : (
              <div className="absolute inset-0 bg-gray-800 border border-gray-600 rounded-lg flex flex-col items-center justify-center p-4 text-center">
                <p className="text-white text-lg font-medium mb-2 line-clamp-3">{previewCard.name}</p>
                <p className="text-gray-400 text-base mb-2">{previewCard.mana_cost || ''}</p>
                <p className="text-gray-500 text-sm">{previewCard.type_line}</p>
                {previewCard.oracle_text && (
                  <p className="text-gray-300 text-xs mt-2 line-clamp-4">{previewCard.oracle_text}</p>
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