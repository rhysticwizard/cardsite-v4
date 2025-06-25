import { useState, useCallback, useRef, useEffect } from 'react'
import { useCollision } from './use-collision'

interface SelectionRect {
  x: number
  y: number
  width: number
  height: number
}

interface UseMultiSelectOptions {
  disabled?: boolean
  onSelectionChange?: (selectedIds: Set<string>) => void
}

export function useMultiSelect(options: UseMultiSelectOptions = {}) {
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set())
  const [isSelecting, setIsSelecting] = useState(false)
  const [selectionStart, setSelectionStart] = useState<{ x: number, y: number } | null>(null)
  const [selectionEnd, setSelectionEnd] = useState<{ x: number, y: number } | null>(null)
  const [justCompletedSelection, setJustCompletedSelection] = useState(false)
  
  const { getCardBounds } = useCollision()

  // Selection rectangle calculation
  const getSelectionRect = useCallback((): SelectionRect | null => {
    if (!selectionStart || !selectionEnd) return null
    
    const left = Math.min(selectionStart.x, selectionEnd.x)
    const top = Math.min(selectionStart.y, selectionEnd.y)
    const width = Math.abs(selectionEnd.x - selectionStart.x)
    const height = Math.abs(selectionEnd.y - selectionStart.y)
    
    return { x: left, y: top, width, height }
  }, [selectionStart, selectionEnd])

  // Check if cards intersect with selection rectangle
  const getCardsInSelection = useCallback((cards: Array<{ instanceId: string, position: { x: number, y: number } }>) => {
    const rect = getSelectionRect()
    if (!rect || rect.width < 5 || rect.height < 5) return []
    
    return cards.filter(card => {
      const cardBounds = getCardBounds(card.position)
      
      // Check if rectangles intersect
      return !(
        rect.x > cardBounds.x + cardBounds.width ||
        rect.x + rect.width < cardBounds.x ||
        rect.y > cardBounds.y + cardBounds.height ||
        rect.y + rect.height < cardBounds.y
      )
    })
  }, [getSelectionRect, getCardBounds])

  // Handle mouse down for selection start
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (options.disabled) return
    
    // Only start selection on left click and when clicking the background
    if (e.button !== 0 || e.target !== e.currentTarget) return
    
    setIsSelecting(true)
    setSelectionStart({ x: e.clientX, y: e.clientY })
    setSelectionEnd({ x: e.clientX, y: e.clientY })
    
    // Clear selection if not holding Ctrl/Cmd
    if (!e.ctrlKey && !e.metaKey) {
      setSelectedCards(new Set())
    }
    
    e.preventDefault()
    e.stopPropagation()
  }, [options.disabled])

  // Handle card click for individual selection
  const handleCardClick = useCallback((cardId: string, event?: React.MouseEvent) => {
    if (options.disabled) return
    
    // Prevent selection if just finished a multi-select
    if (justCompletedSelection) {
      setJustCompletedSelection(false)
      return
    }
    
    setSelectedCards(prev => {
      const newSelection = new Set(prev)
      
      if (event?.ctrlKey || event?.metaKey) {
        // Toggle selection with Ctrl/Cmd
        if (newSelection.has(cardId)) {
          newSelection.delete(cardId)
        } else {
          newSelection.add(cardId)
        }
      } else if (event?.shiftKey && prev.size > 0) {
        // TODO: Implement shift-click range selection
        newSelection.add(cardId)
      } else {
        // Single selection
        newSelection.clear()
        newSelection.add(cardId)
      }
      
      options.onSelectionChange?.(newSelection)
      return newSelection
    })
  }, [options, justCompletedSelection])

  // Global mouse handlers for selection rectangle
  useEffect(() => {
    if (!isSelecting || !selectionStart) return

    const handleGlobalMouseMove = (e: MouseEvent) => {
      setSelectionEnd({ x: e.clientX, y: e.clientY })
    }

    const handleGlobalMouseUp = () => {
      if (selectionStart && selectionEnd) {
        const rect = getSelectionRect()
        if (rect && (rect.width > 5 || rect.height > 5)) {
          setJustCompletedSelection(true)
          setTimeout(() => setJustCompletedSelection(false), 100)
        }
      }
      
      setIsSelecting(false)
      setSelectionStart(null)
      setSelectionEnd(null)
    }

    document.addEventListener('mousemove', handleGlobalMouseMove)
    document.addEventListener('mouseup', handleGlobalMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove)
      document.removeEventListener('mouseup', handleGlobalMouseUp)
    }
  }, [isSelecting, selectionStart, selectionEnd, getSelectionRect])

  // Keyboard handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedCards(new Set())
        setIsSelecting(false)
        setSelectionStart(null)
        setSelectionEnd(null)
        options.onSelectionChange?.(new Set())
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [options])

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedCards(new Set())
    options.onSelectionChange?.(new Set())
  }, [options])

  return {
    selectedCards,
    isSelecting,
    selectionRect: getSelectionRect(),
    handleMouseDown,
    handleCardClick,
    getCardsInSelection,
    clearSelection
  }
} 