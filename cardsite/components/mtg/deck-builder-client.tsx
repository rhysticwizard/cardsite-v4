'use client';

import React, { useState, useCallback } from 'react';
import { 
  DndContext, 
  DragEndEvent, 
  DragOverEvent, 
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  DragOverlay,
} from '@dnd-kit/core';
import { 
  SortableContext, 
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { useQuery, useMutation } from '@tanstack/react-query';
import { searchCards } from '@/lib/api/scryfall';
import type { MTGCard } from '@/lib/types/mtg';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Download, Upload, Play, Info, Save, Loader2, X as XIcon } from 'lucide-react';
import { CardSearchResults } from './card-search-results';
import { DeckColumn } from './deck-column';
import { DraggableCard } from './draggable-card';
import Image from 'next/image';

interface DeckCardData {
  id: string;
  card: MTGCard;
  quantity: number;
  category: 'creatures' | 'spells' | 'artifacts' | 'enchantments' | 'lands' | 'sideboard';
}

interface DeckState {
  name: string;
  creatures: DeckCardData[];
  spells: DeckCardData[];
  artifacts: DeckCardData[];
  enchantments: DeckCardData[];
  lands: DeckCardData[];
  sideboard: DeckCardData[];
  [key: string]: string | DeckCardData[];
}

const CARD_CATEGORIES = {
  creatures: 'Creatures',
  spells: 'Spells', 
  artifacts: 'Artifacts',
  enchantments: 'Enchantments',
  lands: 'Lands',
  sideboard: 'Sideboard'
} as const;

export function DeckBuilderClient() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [columnChildren, setColumnChildren] = useState<Record<string, string[]>>({});
  const [customColumns, setCustomColumns] = useState<Record<string, string>>({});
  const [deletedBaseColumns, setDeletedBaseColumns] = useState<Set<string>>(new Set());
  const [deck, setDeck] = useState<DeckState>({
    name: 'Untitled Deck',
    creatures: [],
    spells: [],
    artifacts: [],
    enchantments: [],
    lands: [],
    sideboard: []
  });
  const [deckFormat, setDeckFormat] = useState<string>('Standard');
  const [deckDescription, setDeckDescription] = useState<string>('');
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Combine default and custom columns
  const allColumns = { ...CARD_CATEGORIES, ...customColumns };
  
  // Base columns (top level)
  const baseColumns = Object.keys(CARD_CATEGORIES);

  // Sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Search cards query
  const { data: searchResults, isLoading: searchLoading } = useQuery({
    queryKey: ['card-search', searchQuery],
    queryFn: () => searchCards({ q: searchQuery }),
    enabled: searchQuery.trim().length > 2,
    staleTime: 1000 * 60 * 5,
  });

  // Save deck mutation
  const saveDeckMutation = useMutation({
    mutationFn: async (deckData: any) => {
      const response = await fetch('/api/decks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(deckData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save deck');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      console.log('Deck saved successfully:', data);
      // You could add a toast notification here
    },
    onError: (error) => {
      console.error('Failed to save deck:', error);
      // You could add an error toast notification here
    },
  });

  // Calculate total card count
  const totalCards = Object.values(deck).reduce((total, category) => {
    if (Array.isArray(category)) {
      return total + category.reduce((sum, card) => sum + card.quantity, 0);
    }
    return total;
  }, 0);

  // Determine card category based on type line
  const determineCategory = (card: MTGCard): keyof Omit<DeckState, 'name'> => {
    const typeLine = card.type_line.toLowerCase();
    
    if (typeLine.includes('creature')) return 'creatures';
    if (typeLine.includes('artifact')) return 'artifacts';
    if (typeLine.includes('enchantment')) return 'enchantments';
    if (typeLine.includes('land')) return 'lands';
    return 'spells'; // Default for instants, sorceries, planeswalkers, etc.
  };

  // Add card to deck
  const addCardToDeck = useCallback((card: MTGCard, targetCategory?: keyof Omit<DeckState, 'name'>) => {
    const category = targetCategory || determineCategory(card);
    const cardId = `${card.id}-${category}`;
    
    setDeck(prev => {
      const categoryCards = prev[category];
      const existingCard = categoryCards.find(c => c.card.id === card.id);
      
      if (existingCard) {
        // Increment quantity
        return {
          ...prev,
          [category]: categoryCards.map(c => 
            c.card.id === card.id 
              ? { ...c, quantity: c.quantity + 1 }
              : c
          )
        };
      } else {
        // Add new card
        return {
          ...prev,
          [category]: [...categoryCards, {
            id: cardId,
            card,
            quantity: 1,
            category
          }]
        };
      }
    });
  }, []);

  // Remove card from deck
  const removeCardFromDeck = useCallback((cardId: string, category: keyof Omit<DeckState, 'name'>) => {
    setDeck(prev => ({
      ...prev,
      [category]: prev[category].filter(c => c.id !== cardId)
    }));
  }, []);

  // Update card quantity
  const updateCardQuantity = useCallback((cardId: string, category: keyof Omit<DeckState, 'name'>, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeCardFromDeck(cardId, category);
      return;
    }
    
    setDeck(prev => ({
      ...prev,
      [category]: prev[category].map(c => 
        c.id === cardId 
          ? { ...c, quantity: newQuantity }
          : c
      )
    }));
  }, [removeCardFromDeck]);

  // Drag handlers
  const handleDragStart = (event: DragStartEvent) => {
    console.log('Drag start:', event.active.id);
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Check if we're dropping on a droppable zone (category column)
    if (overId in allColumns) {
      // We're over a category column - this allows for proper visual feedback
      return;
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    console.log('Drag end:', { activeId: active.id, overId: over?.id });
    setActiveId(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Check if we're dropping from search results to deck
    if (activeId.startsWith('search-') && overId in allColumns) {
      const cardId = activeId.replace('search-', '');
      const card = searchResults?.data.find(c => c.id === cardId);
      
      if (card) {
        console.log('Adding card to deck:', { cardId, category: overId });
        // For built-in categories, use the typed function
        if (overId in CARD_CATEGORIES) {
          addCardToDeck(card, overId as keyof Omit<DeckState, 'name'>);
        } else {
          // For custom columns, add directly to deck
          setDeck(prev => ({
            ...prev,
            [overId]: [...(prev[overId] as any[] || []), {
              id: `${card.id}-${overId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              card,
              quantity: 1,
              category: overId
            }]
          }));
        }
      }
      return;
    }

    // Handle moving cards between categories - find the source category
    const sourceCategory = Object.keys(allColumns).find(cat => {
      const categoryCards = deck[cat as keyof Omit<DeckState, 'name'>] || (deck as any)[cat] || [];
      return categoryCards.some && categoryCards.some((c: any) => c.id === activeId);
    });

    // Check if we're dropping on a category column
    const targetCategory = overId in allColumns ? overId : null;

    if (sourceCategory && targetCategory && sourceCategory !== targetCategory) {
      const sourceCard = deck[sourceCategory as keyof Omit<DeckState, 'name'>].find(c => c.id === activeId);
      
      if (sourceCard) {
        console.log('Moving card between categories:', { from: sourceCategory, to: targetCategory });
        // Remove from source
        removeCardFromDeck(activeId, sourceCategory as keyof Omit<DeckState, 'name'>);
        
        // Add to target with updated category
        const newCard = {
          ...sourceCard,
          id: `${sourceCard.card.id}-${targetCategory}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // Ensure unique ID
          category: targetCategory as keyof Omit<DeckState, 'name'>
        };
        
        setDeck(prev => ({
          ...prev,
          [targetCategory]: [...prev[targetCategory as keyof Omit<DeckState, 'name'>], newCard]
        }));
      }
    }
  };

  // Handle search on Enter key press
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      setSearchQuery(searchInput);
    }
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setSearchQuery('');
    inputRef.current?.focus();
  };

  // Handle saving deck
  const handleSaveDeck = useCallback(() => {
    // Convert deck to API format
    const allCards = Object.entries(deck)
      .filter(([key]) => key !== 'name')
      .map(([, cards]) => cards)
      .flat();
    
    const deckCards = allCards.map(deckCard => ({
      cardId: deckCard.card.id,
      quantity: deckCard.quantity,
      category: deckCard.category,
    }));

    const deckData = {
      name: deck.name,
      description: deckDescription,
      format: deckFormat,
      isPublic: false,
      cards: deckCards,
    };

    saveDeckMutation.mutate(deckData);
  }, [deck, deckDescription, deckFormat, saveDeckMutation]);

  // Add new column
  const addNewColumn = useCallback((afterColumnKey: string) => {
    const newColumnKey = `custom_${Date.now()}`;
    const newColumnLabel = `Custom ${Object.keys(customColumns).length + 1}`;
    
    setCustomColumns(prev => ({
      ...prev,
      [newColumnKey]: newColumnLabel
    }));
    
    setDeck(prev => ({
      ...prev,
      [newColumnKey]: [] as any
    }));
  }, [customColumns]);

  // Delete column
  const deleteColumn = useCallback((columnId: string) => {
    if (baseColumns.includes(columnId)) {
      // For base columns, mark as deleted and clear their data
      setDeletedBaseColumns(prev => new Set([...prev, columnId]));
      setDeck(prev => ({
        ...prev,
        [columnId]: []
      }));
    } else {
      // For custom columns, remove completely
      setCustomColumns(prev => {
        const newCustomColumns = { ...prev };
        delete newCustomColumns[columnId];
        return newCustomColumns;
      });

      setDeck(prev => {
        const newDeck = { ...prev };
        delete newDeck[columnId];
        return newDeck;
      });
    }

    // Remove from column children relationships
    setColumnChildren(prev => {
      const newColumnChildren = { ...prev };
      
      // Remove the column from any parent's children array
      Object.keys(newColumnChildren).forEach(parentKey => {
        newColumnChildren[parentKey] = newColumnChildren[parentKey].filter(childKey => childKey !== columnId);
        // Clean up empty arrays
        if (newColumnChildren[parentKey].length === 0) {
          delete newColumnChildren[parentKey];
        }
      });
      
      // Remove the column as a parent (if it had children)
      delete newColumnChildren[columnId];
      
      return newColumnChildren;
    });
  }, [baseColumns]);

  // Restore deleted base column
  const restoreBaseColumn = useCallback((columnId: string) => {
    setDeletedBaseColumns(prev => {
      const newSet = new Set(prev);
      newSet.delete(columnId);
      return newSet;
    });
  }, []);

  return (
    <div className="min-h-screen bg-black text-white">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="max-w-[1400px] mx-auto px-6 py-4">
          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative max-w-xl mx-auto">
              <Input
                ref={inputRef}
                type="text"
                placeholder="Search for cards to add to your deck..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="bg-black border-gray-600 text-white pl-4 pr-12 py-3 rounded-md focus:ring-0 focus:ring-offset-0 focus:border-gray-600 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-gray-600"
              />
              {searchInput ? (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white cursor-pointer"
                  aria-label="Clear search"
                >
                  <XIcon className="w-4 h-4" />
                </button>
              ) : (
                <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400">
                  <Search className="w-4 h-4" />
                </span>
              )}
            </div>
          </div>

          {/* Search Results */}
          {searchQuery.trim().length > 2 && (
            <div className="mb-8">
              <CardSearchResults 
                results={searchResults?.data || []}
                isLoading={searchLoading}
                onCardAdd={addCardToDeck}
              />
            </div>
          )}

          {/* Deck Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <h1 className="text-lg font-bold">
                  {deck.name} · {totalCards} cards
                </h1>
              </div>
              
              <div className="flex items-center space-x-3">
                <Button variant="ghost" size="sm" className="text-white hover:text-gray-300">
                  Undo
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                </Button>
                <Button variant="ghost" size="sm" className="text-white hover:text-gray-300">
                  Redo
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6" />
                  </svg>
                </Button>
                <Button variant="ghost" size="sm" className="text-white hover:text-gray-300">
                  Export
                  <Download className="w-4 h-4 ml-1" />
                </Button>
                <Button variant="ghost" size="sm" className="text-white hover:text-gray-300">
                  Import
                  <Upload className="w-4 h-4 ml-1" />
                </Button>
                <Button variant="ghost" size="sm" className="text-white hover:text-gray-300">
                  Playtest
                  <Play className="w-4 h-4 ml-1" />
                </Button>
                <Button variant="ghost" size="sm" className="text-white hover:text-gray-300">
                  Details
                  <Info className="w-4 h-4 ml-1" />
                </Button>
                <Button 
                  variant="ghost"
                  size="sm" 
                  className="text-white hover:text-gray-300"
                  onClick={handleSaveDeck}
                  disabled={saveDeckMutation.isPending}
                >
                  {saveDeckMutation.isPending ? 'Saving...' : 'Save'}
                  {saveDeckMutation.isPending ? (
                    <Loader2 className="w-4 h-4 ml-1 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 ml-1" />
                  )}
                </Button>
              </div>
            </div>
            <hr className="border-gray-600 mt-4" />
          </div>

                      {/* Deck Columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                              {baseColumns.map((key) => {
                // If this base column is deleted, show just a small plus button
                if (deletedBaseColumns.has(key)) {
                  return (
                    <div key={key} className="flex flex-col space-y-4">
                      <button
                        type="button"
                        onClick={() => restoreBaseColumn(key)}
                        className="relative mt-2 w-8 h-8 mx-auto flex items-center justify-center bg-black hover:bg-gray-900 border border-black rounded-full text-gray-400 hover:text-white transition-colors cursor-pointer z-10"
                        style={{ pointerEvents: 'auto' }}
                        title={`Add ${CARD_CATEGORIES[key as keyof typeof CARD_CATEGORIES]}`}
                      >
                        <svg className="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                    </div>
                  );
                }
                
                // Normal column rendering
                return (
                  <div key={key} className="flex flex-col space-y-4">
                    {/* Main Column */}
                    <div className="flex flex-col">
                      <DeckColumn
                        id={key}
                        title={CARD_CATEGORIES[key as keyof typeof CARD_CATEGORIES]}
                        cards={deck[key as keyof Omit<DeckState, 'name'>] || []}
                        onCardRemove={removeCardFromDeck}
                        onQuantityChange={updateCardQuantity}
                        onColumnDelete={deleteColumn}
                        activeId={activeId}
                      />
                      {/* Plus button to add column below this one - only show if no children */}
                      {(!columnChildren[key] || columnChildren[key].length === 0) && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log('Plus button clicked for column:', key);
                            
                            // Create new column directly below the clicked column
                            const newColumnKey = `custom_${Date.now()}`;
                            const newColumnLabel = `Column`;
                            
                            console.log('Creating new column:', newColumnKey, newColumnLabel);
                            
                            // Add to custom columns
                            setCustomColumns(prev => ({
                              ...prev,
                              [newColumnKey]: newColumnLabel
                            }));
                            
                            // Add as child of the clicked column
                            setColumnChildren(prev => ({
                              ...prev,
                              [key]: [...(prev[key] || []), newColumnKey]
                            }));
                            
                            // Add to deck state
                            setDeck(prev => ({
                              ...prev,
                              [newColumnKey]: [] as any
                            }));
                          }}
                          className="relative mt-2 w-8 h-8 mx-auto flex items-center justify-center bg-black hover:bg-gray-900 border border-black rounded-full text-gray-400 hover:text-white transition-colors cursor-pointer z-10"
                          style={{ pointerEvents: 'auto' }}
                          title={`Add column below ${CARD_CATEGORIES[key as keyof typeof CARD_CATEGORIES]}`}
                        >
                          <svg className="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </button>
                      )}
                    </div>
                    
                    {/* Child Columns (vertically below) */}
                    {columnChildren[key]?.map((childKey, index) => {
                      const isLastChild = index === columnChildren[key].length - 1;
                      return (
                        <div key={childKey} className="flex flex-col">
                          <DeckColumn
                            id={childKey}
                            title={customColumns[childKey]}
                            cards={deck[childKey as keyof Omit<DeckState, 'name'>] || []}
                            onCardRemove={removeCardFromDeck}
                            onQuantityChange={updateCardQuantity}
                            onColumnDelete={deleteColumn}
                            activeId={activeId}
                          />
                          {/* Plus button only on the last child in the stack */}
                          {isLastChild && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                
                                const newColumnKey = `custom_${Date.now()}`;
                                const newColumnLabel = `Column`;
                                
                                setCustomColumns(prev => ({
                                  ...prev,
                                  [newColumnKey]: newColumnLabel
                                }));
                                
                                setColumnChildren(prev => ({
                                  ...prev,
                                  [key]: [...(prev[key] || []), newColumnKey]
                                }));
                                
                                setDeck(prev => ({
                                  ...prev,
                                  [newColumnKey]: [] as any
                                }));
                              }}
                              className="relative mt-2 w-8 h-8 mx-auto flex items-center justify-center bg-black hover:bg-gray-900 border border-black rounded-full text-gray-400 hover:text-white transition-colors cursor-pointer z-10"
                              style={{ pointerEvents: 'auto' }}
                              title={`Add column below ${customColumns[childKey]}`}
                            >
                              <svg className="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
        </div>

        {/* Drag Overlay */}
        <DragOverlay dropAnimation={null}>
          {activeId && (() => {
            const card = searchResults?.data.find(c => c.id === activeId.replace('search-', '')) ||
                        Object.values(deck).flat().find(c => Array.isArray(c) ? false : c.id === activeId)?.card;
            
            if (!card) return null;
            
            const imageUrl = card.image_uris?.normal || 
                           (card as any).card_faces?.[0]?.image_uris?.normal;
            
            return (
              <div className="relative w-48 aspect-[5/7] rounded-lg overflow-hidden shadow-2xl ring-2 ring-white">
                {imageUrl ? (
                  <Image
                    src={imageUrl}
                    alt={card.name}
                    fill
                    className="object-cover rounded-lg"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-800 border border-gray-600 rounded-lg flex flex-col items-center justify-center p-2 text-center">
                    <p className="text-white text-xs font-medium mb-1 line-clamp-2">{card.name}</p>
                    <p className="text-gray-400 text-xs">{card.mana_cost || ''}</p>
                  </div>
                )}
              </div>
            );
          })()}
        </DragOverlay>
      </DndContext>
    </div>
  );
} 