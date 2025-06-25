import { useRef, useCallback } from 'react'

interface DropPosition {
  x: number
  y: number
}

export function useDropZone(
  onDrop: (cardId: string, position: DropPosition) => void,
  acceptTypes: string[] = []
) {
  const dropZoneRef = useRef<HTMLDivElement>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    const cardId = e.dataTransfer.getData('text/plain')
    const cardType = e.dataTransfer.getData('application/card-type')
    
    // If acceptTypes is specified, check if the card type is accepted
    if (acceptTypes.length > 0 && !acceptTypes.includes(cardType)) {
      return
    }
    
    const rect = dropZoneRef.current?.getBoundingClientRect()
    if (!rect || !cardId) return
    
    const position = {
      x: e.clientX,
      y: e.clientY
    }
    
    onDrop(cardId, position)
  }, [onDrop, acceptTypes])

  // Alternative for mouse-based drag (not HTML5 drag)
  const handleMouseDrop = useCallback((cardId: string, position: DropPosition) => {
    onDrop(cardId, position)
  }, [onDrop])

  return {
    dropZoneRef,
    handleDragOver,
    handleDrop,
    handleMouseDrop
  }
} 