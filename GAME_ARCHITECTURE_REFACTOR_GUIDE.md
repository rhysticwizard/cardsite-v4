# 🎮 Game Architecture Refactor Guide

## Overview
This guide outlines a complete refactoring of the MTG multiplayer game system from the current monolithic approach to a clean, scalable architecture following domain-driven design principles.

## Current Problems
- **Massive components**: 1000+ line components that are hard to maintain
- **State management chaos**: Multiple useState hooks with complex interdependencies
- **No separation of concerns**: UI, game logic, and networking all mixed together
- **Poor type safety**: Generic types that allow ID mixups
- **Hard to test**: Side effects everywhere make unit testing difficult
- **Performance issues**: Unnecessary re-renders due to poor state structure
- **Networking bugs**: Race conditions and sync issues

## Architecture Goals
1. **Domain-Driven Design**: Clear separation between game logic and UI
2. **Type Safety**: Branded types prevent ID confusion
3. **Immutable State**: Predictable state transitions
4. **Pure Functions**: Testable game logic with no side effects
5. **Component Composition**: Small, focused components instead of monoliths
6. **Performance**: Optimized re-rendering and state updates
7. **Error Handling**: Graceful failure with Result types instead of exceptions

---

## Phase 1: Foundation (Week 1-2) ✅ COMPLETED

### 1. Domain Types (`lib/game/types.ts`)
```typescript
// Branded types prevent ID mixups
export type CardId = string & { __brand: 'CardId' }
export type PlayerId = string & { __brand: 'PlayerId' }
export type GameId = string & { __brand: 'GameId' }
export type InstanceId = string & { __brand: 'InstanceId' }

// Immutable state interfaces
export interface GameState {
  readonly id: GameId
  readonly players: ReadonlyMap<PlayerId, PlayerState>
  readonly currentPlayer: PlayerId
  readonly phase: GamePhase
  readonly turn: number
  readonly status: GameStatus
}

// Action-based state changes
export type GameAction = 
  | { type: 'DRAW_CARD', playerId: PlayerId }
  | { type: 'PLAY_CARD', playerId: PlayerId, cardId: InstanceId, position: Position }
  | { type: 'TAP_CARD', playerId: PlayerId, cardId: InstanceId, tapped: boolean }
  // ... more actions

// Result types instead of exceptions
export type GameResult<T> = 
  | { readonly success: true, readonly data: T }
  | { readonly success: false, readonly error: GameError }
```

### 2. Pure Game Engine (`lib/game/engine.ts`)
```typescript
export class GameEngine {
  // Pure reducer - no side effects
  static reduce(state: GameState, action: GameAction): GameResult<GameState> {
    switch (action.type) {
      case 'DRAW_CARD':
        return GameEngine.drawCard(state, action.playerId)
      // ... handle all actions
    }
  }

  // All game logic is pure functions
  private static drawCard(state: GameState, playerId: PlayerId): GameResult<GameState> {
    // Immutable state updates
    // Proper error handling
    // No side effects
  }
}
```

### 3. React State Hook (`hooks/use-game-state.ts`)
```typescript
export function useGameState({ initialState, onAction, onError }: UseGameStateOptions) {
  const [state, dispatchInternal] = useReducer(gameReducer, initialState)
  
  const actions = {
    drawCard: (playerId: PlayerId) => dispatch({ type: 'DRAW_CARD', playerId }),
    playCard: (playerId: PlayerId, cardId: string, position: Position) => 
      dispatch({ type: 'PLAY_CARD', playerId, cardId: cardId as InstanceId, position }),
    // ... more typed actions
  }

  return [state, actions]
}
```

### 4. Network Sync Layer (`lib/game/sync.ts`)
```typescript
export class GameSync {
  broadcastAction(action: GameAction): void {
    const event: GameEvent = {
      ...action,
      timestamp: Date.now(),
      eventId: generateEventId()
    }
    this.socket.emit('game-action', { gameId: this.gameId, event })
  }
}
```

---

## Phase 2: Component Composition (Week 2-3)

### Current Problem
```typescript
// 1000+ line monolithic component
function PlaymatV2Multiplayer() {
  const [handCards, setHandCards] = useState([])
  const [battlefieldCards, setBattlefieldCards] = useState([])
  const [libraryCards, setLibraryCards] = useState([])
  // ... 50+ more state variables
  
  // 500+ lines of mixed UI and game logic
  return <div>{/* massive JSX */}</div>
}
```

### Solution: Composed Architecture
```typescript
// Clean component composition
function GameBoard({ gameState, actions }: GameBoardProps) {
  return (
    <div className="game-board">
      <PlayerHand 
        playerId={gameState.currentPlayer} 
        cards={useHandCards(gameState, gameState.currentPlayer)}
        onPlayCard={actions.playCard}
      />
      <Battlefield 
        cards={useBattlefieldCards(gameState)}
        onMoveCard={actions.moveCard}
        onTapCard={actions.tapCard}
      />
      <DeckZone 
        playerId={gameState.currentPlayer}
        librarySize={useLibraryCards(gameState, gameState.currentPlayer).length}
        onDrawCard={actions.drawCard}
      />
      <OpponentAreas 
        opponents={getOpponents(gameState, gameState.currentPlayer)}
      />
    </div>
  )
}
```

### Implementation Steps

#### 2.1 Create Base Components
```typescript
// components/game/player-hand.tsx
interface PlayerHandProps {
  playerId: PlayerId
  cards: HandCard[]
  onPlayCard: (playerId: PlayerId, cardId: string, position: Position) => void
  disabled?: boolean
}

// components/game/battlefield.tsx  
interface BattlefieldProps {
  cards: BattlefieldCard[]
  onMoveCard: (playerId: PlayerId, cardId: string, position: Position) => void
  onTapCard: (playerId: PlayerId, cardId: string, tapped: boolean) => void
  boundaries: BoundaryConfig
}

// components/game/deck-zone.tsx
interface DeckZoneProps {
  playerId: PlayerId
  librarySize: number
  onDrawCard: (playerId: PlayerId) => void
  disabled?: boolean
}
```

#### 2.2 Extract Drag & Drop Logic
```typescript
// hooks/use-card-drag.ts
export function useCardDrag(
  cardId: string,
  onDragEnd: (position: Position) => void,
  boundaries?: BoundaryConfig
) {
  // Extract all drag logic from components
  // Reusable across hand, battlefield, etc.
}

// hooks/use-drop-zone.ts
export function useDropZone(
  onDrop: (cardId: string, position: Position) => void,
  acceptTypes: string[]
) {
  // Reusable drop zone logic
}
```

#### 2.3 Collision Detection Service
```typescript
// lib/game/collision.ts
export class CollisionDetector {
  static checkBoundaries(position: Position, boundaries: BoundaryConfig): Position {
    // Pure function for boundary checking
  }
  
  static findNearestSnapPosition(position: Position, snapPoints: Position[]): Position {
    // Pure function for snapping
  }
}
```

---

## Phase 3: Advanced Features (Week 3-4)

### 3.1 Conflict Resolution
```typescript
// lib/game/conflict-resolution.ts
export class ConflictResolver {
  static resolveSimultaneousActions(
    action1: GameEvent,
    action2: GameEvent,
    currentState: GameState
  ): GameResult<GameState> {
    // Handle when two players act at the same time
    // Use timestamps and player priority
  }
}
```

### 3.2 Undo/Redo System
```typescript
// lib/game/history.ts
export class GameHistory {
  private events: GameEvent[] = []
  
  addEvent(event: GameEvent): void {
    this.events.push(event)
  }
  
  undo(): GameEvent | null {
    return this.events.pop() || null
  }
  
  replayTo(eventId: string): GameState {
    // Replay events to reconstruct state
  }
}
```

### 3.3 Game Rules Engine
```typescript
// lib/game/rules.ts
export class MTGRulesEngine {
  static validateCardPlay(
    card: MTGCard,
    gameState: GameState,
    playerId: PlayerId
  ): GameResult<true> {
    // Validate mana costs, timing restrictions, etc.
  }
  
  static checkStateBasedActions(state: GameState): GameAction[] {
    // Auto-trigger rules like creature death
  }
}
```

### 3.4 Performance Optimizations
```typescript
// components/game/virtual-battlefield.tsx
export function VirtualBattlefield({ cards }: VirtualBattlefieldProps) {
  // Only render visible cards
  // Card pooling for performance
  // Intersection observer for lazy loading
}

// hooks/use-optimized-state.ts
export function useOptimizedState<T>(
  selector: (state: GameState) => T,
  gameState: GameState
): T {
  // Memoized selectors to prevent unnecessary re-renders
}
```

---

## Phase 4: Production Ready (Week 4-5)

### 4.1 Error Boundaries
```typescript
// components/game/game-error-boundary.tsx
export class GameErrorBoundary extends React.Component {
  static getDerivedStateFromError(error: Error) {
    // Graceful error handling
    // Fallback UI for game crashes
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log errors to monitoring system
    // Attempt recovery strategies
  }
}
```

### 4.2 Offline Support
```typescript
// lib/game/offline-manager.ts
export class OfflineManager {
  private actionQueue: GameAction[] = []
  
  queueAction(action: GameAction): void {
    // Queue actions when offline
  }
  
  syncWhenOnline(): Promise<void> {
    // Replay queued actions when reconnected
    // Handle conflicts with server state
  }
}
```

### 4.3 Testing Suite
```typescript
// tests/game-engine.test.ts
describe('GameEngine', () => {
  test('drawCard updates state correctly', () => {
    const initialState = GameEngine.createInitialState('test-game')
    const result = GameEngine.reduce(initialState, {
      type: 'DRAW_CARD',
      playerId: 'player-1' as PlayerId
    })
    
    expect(result.success).toBe(true)
    // Pure functions are easy to test!
  })
})

// tests/components/player-hand.test.tsx
describe('PlayerHand', () => {
  test('renders cards correctly', () => {
    // Component testing with mock game state
  })
})
```

### 4.4 Monitoring & Analytics
```typescript
// lib/monitoring/game-metrics.ts
export class GameMetrics {
  static trackAction(action: GameAction, duration: number): void {
    // Track performance metrics
  }
  
  static trackError(error: GameError, context: any): void {
    // Error tracking and alerting
  }
}
```

---

## Migration Strategy

### Step 1: Parallel Implementation
- Keep existing PlaymatV2Multiplayer working
- Build new architecture alongside
- Create feature flags to switch between versions

### Step 2: Component-by-Component Migration
```typescript
// Start with smallest components first
1. DeckZone → use new architecture
2. PlayerHand → use new architecture  
3. Battlefield → use new architecture
4. Full GameBoard → combine all new components
5. Remove old PlaymatV2Multiplayer
```

### Step 3: Data Migration
```typescript
// lib/migration/state-converter.ts
export function convertOldStateToNew(oldState: any): GameState {
  // Convert existing state format to new architecture
}
```

---

## Benefits Summary

### Before (Current)
- ❌ 1000+ line components
- ❌ State bugs and race conditions
- ❌ Hard to test and maintain
- ❌ Poor performance
- ❌ Mixed concerns (UI + logic + networking)

### After (New Architecture)
- ✅ Small, focused components (50-100 lines each)
- ✅ Predictable, immutable state
- ✅ 100% testable pure functions
- ✅ Optimized performance
- ✅ Clean separation of concerns
- ✅ Type-safe throughout
- ✅ Easy to add new features
- ✅ Graceful error handling

---

## File Structure
```
lib/
  game/
    types.ts          # Domain types and interfaces
    engine.ts         # Pure game logic
    sync.ts          # Network synchronization
    collision.ts     # Collision detection
    rules.ts         # MTG rules engine
    history.ts       # Undo/redo system
    
components/
  game/
    game-board.tsx           # Main composed component
    player-hand.tsx          # Hand management
    battlefield.tsx          # Battlefield rendering
    deck-zone.tsx           # Library/deck interactions
    opponent-areas.tsx      # Other players' areas
    game-error-boundary.tsx # Error handling
    
hooks/
  use-game-state.ts    # Main state management
  use-card-drag.ts     # Drag and drop
  use-drop-zone.ts     # Drop zones
  use-collision.ts     # Boundary detection
```

---

## Getting Started

1. **Review Phase 1**: The foundation is already implemented
2. **Test the demo**: Visit `/architecture-demo` to see it in action
3. **Start Phase 2**: Begin with creating the smallest component (DeckZone)
4. **Iterate quickly**: Build one component at a time
5. **Maintain compatibility**: Keep old system working during migration

The new architecture will make your codebase **10x more maintainable** and eliminate the classes of bugs you've been dealing with. Each phase builds on the previous one, so you can implement incrementally without breaking existing functionality. 