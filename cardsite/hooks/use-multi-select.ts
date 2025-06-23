import { useState, useEffect, useCallback, useRef } from 'react';

interface UseMultiSelectOptions<T> {
  /**
   * Function to determine if an item intersects with the selection rectangle
   */
  intersectionTest: (item: T, rect: SelectionRect) => boolean;
  /**
   * Items that can be selected
   */
  items: T[];
  /**
   * Function to get the unique ID of an item
   */
  getItemId: (item: T) => string;
  /**
   * Whether multi-select is enabled
   */
  enabled?: boolean;
}

interface SelectionRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface Point {
  x: number;
  y: number;
}

// Utility functions moved outside component for better performance
const getScrollOffset = (): Point => ({
  x: window.pageXOffset || document.documentElement.scrollLeft,
  y: window.pageYOffset || document.documentElement.scrollTop
});

const calculateRect = (start: Point, end: Point): SelectionRect => ({
  left: Math.min(start.x, end.x),
  top: Math.min(start.y, end.y),
  width: Math.abs(end.x - start.x),
  height: Math.abs(end.y - start.y)
});

const isValidSelection = (rect: SelectionRect): boolean => rect.width > 5 || rect.height > 5;

export function useMultiSelect<T>({
  intersectionTest,
  items,
  getItemId,
  enabled = true
}: UseMultiSelectOptions<T>) {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<Point | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<Point | null>(null);
  const [justCompletedSelection, setJustCompletedSelection] = useState(false);
  
  const rafIdRef = useRef<number | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Memoized callbacks
  const clearSelection = useCallback(() => {
    setSelectedItems(new Set());
    setIsSelecting(false);
    setSelectionStart(null);
    setSelectionEnd(null);
  }, []);

  const toggleItemSelection = useCallback((itemId: string, event?: React.MouseEvent) => {
    if (!enabled) return;
    
    const isMultiSelect = event && (event.ctrlKey || event.metaKey);
    
    setSelectedItems(prev => {
      if (isMultiSelect) {
        const newSelection = new Set(prev);
        if (newSelection.has(itemId)) {
          newSelection.delete(itemId);
        } else {
          newSelection.add(itemId);
        }
        return newSelection;
      }
      return new Set([itemId]);
    });
  }, [enabled]);

  const startSelection = useCallback((e: React.MouseEvent) => {
    if (!enabled) return;
    
    const scroll = getScrollOffset();
    const point: Point = {
      x: e.clientX + scroll.x,
      y: e.clientY + scroll.y
    };
    
    setIsSelecting(true);
    setSelectionStart(point);
    setSelectionEnd(point);
    
    if (!e.ctrlKey && !e.metaKey) {
      setSelectedItems(new Set());
    }
  }, [enabled]);

  const getSelectionRectangle = useCallback((): SelectionRect | null => {
    if (!selectionStart || !selectionEnd) return null;
    return calculateRect(selectionStart, selectionEnd);
  }, [selectionStart, selectionEnd]);

  const handleContainerClick = useCallback((e: React.MouseEvent) => {
    if (!enabled || isSelecting) return;
    
    if (justCompletedSelection) {
      setJustCompletedSelection(false);
      return;
    }
    
    clearSelection();
  }, [enabled, isSelecting, justCompletedSelection, clearSelection]);

  // Optimized intersection testing
  const updateSelection = useCallback((rect: SelectionRect) => {
    if (!isValidSelection(rect)) return;
    
    const selectedIds = items
      .filter(item => intersectionTest(item, rect))
      .map(getItemId);
    
    setSelectedItems(new Set(selectedIds));
  }, [items, intersectionTest, getItemId]);

  // Global mouse handlers with optimizations
  useEffect(() => {
    if (!enabled || !isSelecting || !selectionStart) return;

    const handleMouseMove = (e: MouseEvent) => {
      const scroll = getScrollOffset();
      const newEnd: Point = {
        x: e.clientX + scroll.x,
        y: e.clientY + scroll.y
      };
      
      setSelectionEnd(newEnd);
      
      // Cancel previous frame
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
      
      // Throttle with RAF
      rafIdRef.current = requestAnimationFrame(() => {
        const rect = calculateRect(selectionStart, newEnd);
        updateSelection(rect);
      });
    };
    
    const handleMouseUp = () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      
      // Mark completion for valid selections
      if (selectionStart && selectionEnd) {
        const rect = calculateRect(selectionStart, selectionEnd);
        if (isValidSelection(rect)) {
          setJustCompletedSelection(true);
          timeoutRef.current = setTimeout(() => setJustCompletedSelection(false), 100);
        }
      }
      
      setIsSelecting(false);
      setSelectionStart(null);
      setSelectionEnd(null);
    };

    document.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [enabled, isSelecting, selectionStart, updateSelection]);

  // Keyboard handlers
  useEffect(() => {
    if (!enabled) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        clearSelection();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, clearSelection]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    selectedItems,
    setSelectedItems,
    isSelecting,
    selectionStart,
    selectionEnd,
    clearSelection,
    toggleItemSelection,
    startSelection,
    getSelectionRectangle,
    handleContainerClick,
    justCompletedSelection
  };
} 