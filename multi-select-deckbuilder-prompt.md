# Multi-Select Implementation for Deckbuilder

## Overview
Implement desktop-style multi-select functionality for the deckbuilder component, similar to the playmat implementation. This should allow users to select multiple cards and perform batch operations.

## Core Requirements

### 1. Selection Behavior
- **Click and drag** to create selection rectangles around cards
- **Ctrl+Click** to toggle individual cards in/out of selection
- **Escape key** to clear all selections
- **Click empty space** to clear selections
- **Visual feedback** with blue outline/glow on selected cards

### 2. Multi-Select Features
- **Batch operations**: Remove all selected cards, move to sideboard, etc.
- **Selection persistence**: Cards stay selected until explicitly cleared
- **Visual indicators**: Selected cards maintain blue outline
- **Formation preservation**: When moving cards, maintain their relative positions

### 3. Technical Implementation

#### State Management
```typescript
// Add to deckbuilder component state
const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
const [isSelecting, setIsSelecting] = useState(false);
const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null);
const [selectionEnd, setSelectionEnd] = useState<{ x: number; y: number } | null>(null);
```

#### Global Mouse Event Handlers
```typescript
useEffect(() => {
  if (!isSelecting || !selectionStart) return;

  const handleGlobalMouseMove = (e: MouseEvent) => {
    const newEnd = { x: e.clientX, y: e.clientY };
    setSelectionEnd(newEnd);
    
    // Calculate selection rectangle and update selected cards
    const rect = {
      left: Math.min(selectionStart.x, e.clientX),
      top: Math.min(selectionStart.y, e.clientY),
      width: Math.abs(e.clientX - selectionStart.x),
      height: Math.abs(e.clientY - selectionStart.y)
    };
    
    if (rect.width > 5 || rect.height > 5) {
      const cardsInSelection = cards.filter(card => {
        // Check if card intersects with selection rectangle
        return isCardInSelection(card, rect);
      });
      setSelectedCards(new Set(cardsInSelection.map(card => card.id)));
    }
  };

  const handleGlobalMouseUp = () => {
    setIsSelecting(false);
    setSelectionStart(null);
    setSelectionEnd(null);
  };

  document.addEventListener('mousemove', handleGlobalMouseMove);
  document.addEventListener('mouseup', handleGlobalMouseUp);

  return () => {
    document.removeEventListener('mousemove', handleGlobalMouseMove);
    document.removeEventListener('mouseup', handleGlobalMouseUp);
  };
}, [isSelecting, selectionStart, selectionEnd, cards]);
```

#### Card Component Updates
```typescript
// Add isSelected prop to card components
interface CardProps {
  // ... existing props
  isSelected?: boolean;
  onCardClick?: (cardId: string, event: React.MouseEvent) => void;
}

// In card component styling
className={`
  ${isSelected ? 'ring-2 ring-blue-500 ring-opacity-75 shadow-lg shadow-blue-500/50' : ''}
  // ... other classes
`}
```

#### Selection Rectangle Rendering
```typescript
{/* Selection Rectangle Overlay */}
{isSelecting && selectionStart && selectionEnd && (() => {
  const rect = getSelectionRectangle();
  if (!rect || (rect.width < 5 && rect.height < 5)) return null;
  
  return (
    <div
      className="fixed pointer-events-none z-[999] border-2 border-blue-500 bg-blue-500/20"
      style={{
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height
      }}
    />
  );
})()}
```

## Specific Deckbuilder Adaptations

### 1. Card Grid Layout
- **Adapt intersection detection** for grid-based card layout
- **Account for card spacing** and container padding
- **Handle scrollable containers** (adjust coordinates for scroll position)

### 2. Batch Operations
```typescript
const handleBatchRemove = useCallback(() => {
  if (selectedCards.size === 0) return;
  
  // Remove all selected cards from deck
  setDeckCards(prev => prev.filter(card => !selectedCards.has(card.id)));
  setSelectedCards(new Set()); // Clear selection after operation
}, [selectedCards]);

const handleBatchMoveToSideboard = useCallback(() => {
  if (selectedCards.size === 0) return;
  
  const cardsToMove = deckCards.filter(card => selectedCards.has(card.id));
  setDeckCards(prev => prev.filter(card => !selectedCards.has(card.id)));
  setSideboardCards(prev => [...prev, ...cardsToMove]);
  setSelectedCards(new Set());
}, [selectedCards, deckCards]);
```

### 3. UI Controls
```typescript
{/* Batch Operation Controls - Show when cards are selected */}
{selectedCards.size > 0 && (
  <div className="fixed bottom-4 right-4 bg-white border rounded-lg shadow-lg p-4 z-50">
    <div className="flex items-center gap-2 mb-2">
      <span className="text-sm font-medium">{selectedCards.size} cards selected</span>
    </div>
    <div className="flex gap-2">
      <button 
        onClick={handleBatchRemove}
        className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
      >
        Remove All
      </button>
      <button 
        onClick={handleBatchMoveToSideboard}
        className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
      >
        To Sideboard
      </button>
      <button 
        onClick={() => setSelectedCards(new Set())}
        className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
      >
        Clear Selection
      </button>
    </div>
  </div>
)}
```

## Implementation Steps

### Phase 1: Basic Selection
1. Add selection state to deckbuilder component
2. Implement mouse down handler for starting selection
3. Add global mouse move/up handlers for drag selection
4. Create selection rectangle rendering
5. Add visual feedback to selected cards

### Phase 2: Card Interaction
1. Update card click handlers for Ctrl+Click selection
2. Implement card intersection detection for grid layout
3. Add keyboard handlers (Escape to clear)
4. Handle selection clearing on empty space click

### Phase 3: Batch Operations
1. Create batch operation functions (remove, move to sideboard, etc.)
2. Add UI controls for batch operations
3. Implement selection persistence across operations
4. Add confirmation dialogs for destructive operations

### Phase 4: Polish & Optimization
1. Add smooth animations for selection changes
2. Optimize performance for large card collections
3. Add accessibility features (keyboard navigation)
4. Test across different screen sizes and browsers

## Key Differences from Playmat Implementation

### 1. Layout Considerations
- **Grid vs Free-form**: Deckbuilder uses grid layout vs playmat's free positioning
- **Scrolling**: Deckbuilder may have scrollable areas that need coordinate adjustment
- **Container bounds**: Different boundary calculations for card containers

### 2. Card Operations
- **Quantity management**: Deckbuilder cards have quantities (4x Lightning Bolt)
- **Category organization**: Cards are in different sections (main deck, sideboard)
- **Validation rules**: Deck building rules may affect batch operations

### 3. Performance
- **Larger datasets**: Deckbuilder may show hundreds of cards vs dozens on playmat
- **Virtualization**: May need virtual scrolling for large collections
- **Debouncing**: Selection updates may need debouncing for performance

## Files to Modify
- `components/mtg/deck-builder-client.tsx` - Main deckbuilder component
- `components/mtg/deck-card.tsx` - Individual card component
- Add new hook: `hooks/use-multi-select.ts` - Reusable multi-select logic

## Testing Checklist
- [ ] Selection rectangle appears on drag
- [ ] Cards highlight when selected
- [ ] Ctrl+Click toggles individual cards
- [ ] Escape clears selection
- [ ] Batch operations work correctly
- [ ] Selection persists across UI updates
- [ ] Performance is smooth with 100+ cards
- [ ] Works on mobile/touch devices
- [ ] Keyboard accessibility
- [ ] Screen reader compatibility

## Future Enhancements
- **Select All/None buttons**
- **Selection by card type/color filters**
- **Copy/paste selected cards between decks**
- **Bulk quantity adjustments**
- **Selection history/undo** 