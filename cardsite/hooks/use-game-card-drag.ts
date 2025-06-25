import { useRef, useState, useCallback } from 'react'
import { useCollision } from './use-collision'

interface DragPosition {
  x: number
  y: number
}

interface UseCardDragOptions {
  disabled?: boolean
  type?: string
  onDragStart?: () => void
  onDragEnd?: () => void
}

export function useCardDrag(
  cardId: string,
  onDragEnd: (position: DragPosition) => void,
  options: UseCardDragOptions = {}
) {
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const dragRef = useRef<HTMLDivElement>(null)
  const { constrainPosition } = useCollision()

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (options.disabled) return
    
    e.preventDefault()
    e.stopPropagation()
    
    const rect = dragRef.current?.getBoundingClientRect()
    if (!rect) return
    
    // Calculate offset from mouse to card center
    const offset = {
      x: e.clientX - (rect.left + rect.width / 2),
      y: e.clientY - (rect.top + rect.height / 2)
    }
    
    setDragOffset(offset)
    setIsDragging(true)
    options.onDragStart?.()

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!dragRef.current) return
      
      // Calculate new position (mouse position minus offset)
      const newPosition = {
        x: moveEvent.clientX - offset.x,
        y: moveEvent.clientY - offset.y
      }
      
      // Apply visual transform during drag
      dragRef.current.style.transform = `translate(${newPosition.x - (rect.left + rect.width / 2)}px, ${newPosition.y - (rect.top + rect.height / 2)}px)`
      dragRef.current.style.zIndex = '9999'
    }

    const handleMouseUp = (upEvent: MouseEvent) => {
      setIsDragging(false)
      options.onDragEnd?.()
      
      if (dragRef.current) {
        dragRef.current.style.transform = ''
        dragRef.current.style.zIndex = ''
      }
      
      // Calculate final position
      const finalPosition = {
        x: upEvent.clientX - offset.x,
        y: upEvent.clientY - offset.y
      }
      
      // Constrain to boundaries and call onDragEnd
      const constrainedPosition = constrainPosition(finalPosition)
      onDragEnd(constrainedPosition)
      
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [options, constrainPosition, onDragEnd])

  return {
    isDragging,
    dragRef,
    handleMouseDown
  }
} 