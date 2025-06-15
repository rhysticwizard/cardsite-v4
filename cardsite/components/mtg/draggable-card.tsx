'use client';

import React from 'react';
import type { MTGCard } from '@/lib/types/mtg';
import Image from 'next/image';

interface DraggableCardProps {
  id: string;
  card?: MTGCard;
  isDragging?: boolean;
}

export function DraggableCard({ id, card, isDragging = false }: DraggableCardProps) {
  if (!card) {
    return (
      <div className="relative aspect-[5/7] w-48 rounded-lg overflow-hidden bg-gray-800 border border-gray-600 opacity-80">
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-gray-400 text-xs">Dragging...</span>
        </div>
      </div>
    );
  }

  const imageUrl = card.image_uris?.normal || 
                  (card as any).card_faces?.[0]?.image_uris?.normal;

  return (
    <div className={`relative aspect-[5/7] w-48 rounded-lg overflow-hidden shadow-lg ${
      isDragging ? 'opacity-80 rotate-3 scale-105' : ''
    } transition-all duration-200`}>
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={card.name}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
        />
      ) : (
        <div className="absolute inset-0 bg-gray-800 border border-gray-600 flex flex-col items-center justify-center p-2 text-center">
          <p className="text-white text-xs font-medium mb-1 line-clamp-2">{card.name}</p>
          <p className="text-gray-400 text-xs">{card.mana_cost || ''}</p>
          <p className="text-gray-500 text-xs">{card.type_line}</p>
        </div>
      )}
    </div>
  );
} 