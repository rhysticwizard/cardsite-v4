'use client';

import React from 'react';
import { useDroppable } from '@dnd-kit/core';

interface PlusButtonDropZoneProps {
  colIndex: number;
  nextRow: number;
  onAddColumn: (row: number, col: number) => void;
  activeId: string | null;
}

export function PlusButtonDropZone({ colIndex, nextRow, onAddColumn, activeId }: PlusButtonDropZoneProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: `plus-${colIndex}-${nextRow}`,
  });

  return (
    <div className="flex justify-center">
      <button
        ref={setNodeRef}
        type="button"
        onClick={() => onAddColumn(nextRow, colIndex)}
        className={`w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-white transition-colors cursor-pointer ${
          isOver && activeId?.startsWith('column-') 
            ? 'bg-blue-500/20 border-2 border-blue-500 border-dashed' 
            : 'bg-black hover:bg-gray-900 border border-gray-600'
        }`}
        title="Add new column"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>
  );
} 