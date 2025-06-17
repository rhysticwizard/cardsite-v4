'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { 
  DndContext, 
  DragEndEvent, 
  DragOverEvent, 
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  pointerWithin,
  DragOverlay,
} from '@dnd-kit/core';
import { useQuery, useMutation } from '@tanstack/react-query';
import { searchCards, getCardVariants, getRandomCard } from '@/lib/api/scryfall';
import type { MTGCard } from '@/lib/types/mtg';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Download, Upload, Play, Info, Save, Loader2, X as XIcon, Shuffle, Sliders, ChevronDown, Grid, List } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { CardSearchResults } from './card-search-results';
import { DeckColumn } from './deck-column';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

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
  const { data: session } = useSession();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [columnChildren, setColumnChildren] = useState<Record<string, string[]>>({});
  const [customColumns, setCustomColumns] = useState<Record<string, string>>({});
  const [deletedBaseColumns, setDeletedBaseColumns] = useState<Set<string>>(new Set());
  const [showingVariantsFor, setShowingVariantsFor] = useState<{cardName: string, cardId: string} | null>(null);
  const [previousSearchState, setPreviousSearchState] = useState<{
    input: string;
    query: string;
  } | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [importResults, setImportResults] = useState<{
    successful: { name: string; quantity: number; setCode?: string }[];
    failed: { name: string; quantity: number; setCode?: string; error: string }[];
    isImporting: boolean;
    hasImported: boolean;
  } | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewCard, setPreviewCard] = useState<MTGCard | null>(null);
  const [previewFaceIndex, setPreviewFaceIndex] = useState(0);
  const [isEditingDeckName, setIsEditingDeckName] = useState(false);
  const [tempDeckName, setTempDeckName] = useState('Untitled Deck');
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [viewMode, setViewMode] = useState<'visual' | 'text'>('visual');
  
  // Advanced search dropdown states
  const [showColorsDropdown, setShowColorsDropdown] = useState(false);
  const [showCommanderDropdown, setShowCommanderDropdown] = useState(false);
  const [showGameDropdown, setShowGameDropdown] = useState(false);
  const [showRarityDropdown, setShowRarityDropdown] = useState(false);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedCommander, setSelectedCommander] = useState<string[]>([]);
  const [selectedGame, setSelectedGame] = useState<string[]>([]);
  const [selectedRarity, setSelectedRarity] = useState<string[]>([]);
  
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
  const inputRef = useRef<HTMLInputElement>(null);

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

  // Search cards query - either regular search or variants
  const { data: searchResults, isLoading: searchLoading } = useQuery({
    queryKey: showingVariantsFor ? ['card-variants', showingVariantsFor.cardName] : ['card-search', searchQuery],
    queryFn: () => showingVariantsFor 
      ? getCardVariants(showingVariantsFor.cardName)
      : searchCards({ q: searchQuery }),
    enabled: showingVariantsFor ? true : searchQuery.trim().length > 2,
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
    },
    onError: (error) => {
      console.error('Failed to save deck:', error);
    },
  });

  // Calculate total card count
  const totalCards = (Object.keys(deck) as Array<keyof DeckState>).reduce((total, key) => {
    if (key === 'name') return total;
    const category = deck[key] as DeckCardData[];
    return total + category.reduce((sum, card) => sum + card.quantity, 0);
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
    
    setDeck(prev => {
      const categoryCards = prev[category as keyof DeckState] as DeckCardData[];
      // Safety check: ensure the category exists and is an array
      if (!Array.isArray(categoryCards)) {
        console.warn(`Category ${category} is not an array:`, categoryCards);
        return prev;
      }
      
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
        // Add new card with unique ID
        const uniqueCardId = `${card.id}-${category}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        return {
          ...prev,
          [category]: [...categoryCards, {
            id: uniqueCardId,
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
    setDeck(prev => {
      const categoryCards = prev[category as keyof DeckState] as DeckCardData[];
      // Safety check: ensure the category exists and is an array
      if (!Array.isArray(categoryCards)) {
        console.warn(`Category ${category} is not an array:`, categoryCards);
        return prev;
      }
      
      return {
      ...prev,
        [category]: categoryCards.filter(c => c.id !== cardId)
      };
    });
  }, []);

  // Update card quantity
  const updateCardQuantity = useCallback((cardId: string, category: keyof Omit<DeckState, 'name'>, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeCardFromDeck(cardId, category);
      return;
    }
    
    setDeck(prev => {
      const categoryCards = prev[category as keyof DeckState] as DeckCardData[];
      // Safety check: ensure the category exists and is an array
      if (!Array.isArray(categoryCards)) {
        console.warn(`Category ${category} is not an array:`, categoryCards);
        return prev;
      }
      
      return {
      ...prev,
        [category]: categoryCards.map(c => 
        c.id === cardId 
          ? { ...c, quantity: newQuantity }
          : c
      )
      };
    });
  }, [removeCardFromDeck]);

  // Change card face/variant
  const changeCardFace = useCallback((cardId: string, category: keyof Omit<DeckState, 'name'>, newCard: MTGCard) => {
    setDeck(prev => {
      const categoryCards = prev[category as keyof DeckState] as DeckCardData[];
      // Safety check: ensure the category exists and is an array
      if (!Array.isArray(categoryCards)) {
        console.warn(`Category ${category} is not an array:`, categoryCards);
        return prev;
      }
      
      return {
        ...prev,
        [category]: categoryCards.map(c => 
          c.id === cardId 
            ? { ...c, card: newCard }
            : c
        )
      };
    });
  }, []);

  // Show variants in search area
  const showCardVariants = useCallback((cardName: string, cardId: string) => {
    // Store current search state before showing variants
    setPreviousSearchState({
      input: searchInput,
      query: searchQuery
    });
    
    setShowingVariantsFor({ cardName, cardId });
    setSearchInput(`Variants of "${cardName}"`);
  }, [searchInput, searchQuery]);

  // Handle variant selection (click to replace)
  const handleVariantSelect = useCallback((card: MTGCard) => {
    if (showingVariantsFor) {
      console.log('Variant selected:', card.name, 'for card ID:', showingVariantsFor.cardId);
      
      // Search through all categories to find the card
      let foundCategory: keyof Omit<DeckState, 'name'> | null = null;
      let foundCardId: string | null = null;
      
      const categories: (keyof Omit<DeckState, 'name'>)[] = ['creatures', 'spells', 'artifacts', 'enchantments', 'lands', 'sideboard'];
      
      for (const category of categories) {
        const cards = deck[category];
        if (Array.isArray(cards)) {
          const foundCard = cards.find((c: DeckCardData) => c.id === showingVariantsFor.cardId);
          if (foundCard) {
            foundCategory = category;
            foundCardId = foundCard.id;
            break;
          }
        }
      }
      
      if (foundCategory && foundCardId) {
        console.log('Found card in category:', foundCategory, 'with ID:', foundCardId);
        changeCardFace(foundCardId, foundCategory, card);
      } else {
        console.warn('Could not find card with ID:', showingVariantsFor.cardId);
      }
      
      // Clear variants view first
      setShowingVariantsFor(null);
      
      // Restore previous search state
      if (previousSearchState) {
        setSearchInput(previousSearchState.input);
        // Use setTimeout to ensure the state update happens after clearing variants
        setTimeout(() => {
          setSearchQuery(previousSearchState.query);
        }, 0);
        setPreviousSearchState(null);
      } else {
        setSearchInput('');
        setSearchQuery('');
      }
    }
  }, [showingVariantsFor, changeCardFace, deck, previousSearchState]);

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

    const activeId = active.id as string;

    // If we're showing variants, ignore drag and drop - variants should only be clicked
    if (showingVariantsFor) {
      return;
    }

    // If dropped outside any drop zone (over is null), handle card removal
    if (!over) {
      // Check if this is a card being moved from an existing category (not from search)
      if (!activeId.startsWith('search-')) {
        const sourceCategory = Object.keys(allColumns).find(cat => {
          const categoryCards = deck[cat as keyof Omit<DeckState, 'name'>] || (deck as any)[cat] || [];
          return categoryCards.some && categoryCards.some((c: any) => c.id === activeId);
        });
        
        if (sourceCategory) {
          console.log('Card dropped in empty area, removing from deck:', activeId);
          removeCardFromDeck(activeId, sourceCategory as keyof Omit<DeckState, 'name'>);
        }
      }
      // If it's from search results and dropped in empty area, just ignore (card disappears)
      return;
    }

    const overId = over.id as string;

    // Only allow drops directly on valid drop zones (columns)
    if (!(overId in allColumns)) {
      // If dropped on something that's not a valid drop zone, treat as empty area drop
      if (!activeId.startsWith('search-')) {
        const sourceCategory = Object.keys(allColumns).find(cat => {
          const categoryCards = deck[cat as keyof Omit<DeckState, 'name'>] || (deck as any)[cat] || [];
          return categoryCards.some && categoryCards.some((c: any) => c.id === activeId);
        });
        
        if (sourceCategory) {
          console.log('Card dropped on invalid drop zone, removing from deck:', activeId);
          removeCardFromDeck(activeId, sourceCategory as keyof Omit<DeckState, 'name'>);
        }
      }
      return;
    }

    // Check if we're dropping from search results to deck
    if (activeId.startsWith('search-') && overId in allColumns) {
      const cardId = activeId.replace('search-', '');
      const card = searchResults?.data.find(c => c.id === cardId);
      
      if (card) {
        console.log('Adding card to deck:', { cardId, category: overId });
        
        // Normal card addition (variants are handled by click only)
        // For built-in categories, use the typed function
        if (overId in CARD_CATEGORIES) {
          addCardToDeck(card, overId as keyof Omit<DeckState, 'name'>);
        } else {
          // For custom columns, add directly to deck
          setDeck(prev => ({
            ...prev,
            [overId]: [...((prev as any)[overId] || []), {
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
    setShowingVariantsFor(null);
    inputRef.current?.focus();
  };

  // Handle random card button
  const handleRandomCard = async () => {
    try {
      const randomCard = await getRandomCard();
      setSearchInput(`"${randomCard.name}"`);
      setSearchQuery(`"${randomCard.name}"`);
    } catch (error) {
      console.error('Failed to get random card:', error);
    }
  };

  // Handle advanced search toggle
  const handleAdvancedSearch = () => {
    setShowAdvancedSearch(!showAdvancedSearch);
  };

  // Handle saving deck
  const handleSaveDeck = useCallback(() => {
    // Check if user is authenticated
    if (!session) {
      // Redirect to sign-in page
      router.push('/auth/signin');
      return;
    }

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
  }, [session, router, deck, deckDescription, deckFormat, saveDeckMutation]);

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
        const newDeck = { ...prev } as any;
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

  // Parse and import deck text
  const handleImportDeck = useCallback(async () => {
    console.log('Import deck clicked, text:', importText);
    if (!importText.trim()) {
      console.log('No import text provided');
      return;
    }
    
    // Set importing state
    setImportResults({
      successful: [],
      failed: [],
      isImporting: true,
      hasImported: false
    });
    
    const lines = importText.split('\n').filter(line => line.trim());
    const cardsToImport: { name: string; quantity: number; setCode?: string }[] = [];
    const results: { 
      successful: { name: string; quantity: number; setCode?: string }[];
      failed: { name: string; quantity: number; setCode?: string; error: string }[];
    } = { successful: [], failed: [] };
    
    console.log('Processing lines:', lines);
    
    // Parse each line
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;
      
      // Parse different formats with optional set codes:
      // "4 Lightning Bolt"
      // "4x Lightning Bolt"
      // "Lightning Bolt x4"
      // "Lightning Bolt"
      // "1 Nashi, Moon Sage's Scion (neo)"
      // "4x Lightning Bolt (m21)"
      
      // First, extract set code if present (in parentheses at the end)
      const setMatch = trimmedLine.match(/^(.+?)\s*\(([a-zA-Z0-9]{3,4})\)\s*$/);
      let cardPart = trimmedLine;
      let setCode: string | undefined;
      
      if (setMatch) {
        cardPart = setMatch[1].trim();
        setCode = setMatch[2].toLowerCase();
        console.log(`Found set code: ${setCode} for card part: ${cardPart}`);
      }
      
      // Now parse quantity and card name from the card part
      const quantityMatch = cardPart.match(/^(\d+)x?\s+(.+)$/) || 
                           cardPart.match(/^(.+)\s+x(\d+)$/) ||
                           [null, '1', cardPart];
      
      if (quantityMatch) {
        const quantity = parseInt(quantityMatch[1]) || 1;
        const cardName = (quantityMatch[2] || quantityMatch[1]).trim();
        
        if (cardName) {
          cardsToImport.push({ name: cardName, quantity, setCode });
          console.log(`Parsed: ${quantity}x ${cardName}${setCode ? ` (${setCode})` : ''}`);
        }
      }
    }
    
    console.log('Cards to import:', cardsToImport);
    
    // Search for each card and add to deck
    for (const { name, quantity, setCode } of cardsToImport) {
      try {
        console.log(`Searching for card: ${name}${setCode ? ` in set ${setCode}` : ''}`);
        
        // Build search query with set code if provided
        let searchQuery = `!"${name}"`;
        if (setCode) {
          searchQuery += ` set:${setCode}`;
        }
        
        const searchResult = await searchCards({ q: searchQuery });
        console.log(`Search result for ${name}${setCode ? ` (${setCode})` : ''}:`, searchResult);
        
        if (searchResult.data && searchResult.data.length > 0) {
          const card = searchResult.data[0]; // Take the first match
          console.log(`Found card: ${card.name}, adding ${quantity} copies`);
          
          // Add the card the specified number of times
          for (let i = 0; i < quantity; i++) {
            addCardToDeck(card);
          }
          
          results.successful.push({ name, quantity, setCode });
        } else {
          const errorMsg = setCode 
            ? `Card "${name}" not found in set "${setCode.toUpperCase()}"`
            : `Card "${name}" not found`;
          console.warn(errorMsg);
          results.failed.push({ name, quantity, setCode, error: errorMsg });
        }
      } catch (error) {
        const errorMsg = `Failed to search for card: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.warn(`Failed to import card: ${name}`, error);
        results.failed.push({ name, quantity, setCode, error: errorMsg });
      }
    }
    
    // Update results state
    setImportResults({
      successful: results.successful,
      failed: results.failed,
      isImporting: false,
      hasImported: true
    });
    
    console.log('Import completed:', {
      successful: results.successful.reduce((sum, card) => sum + card.quantity, 0),
      failed: results.failed.reduce((sum, card) => sum + card.quantity, 0),
      details: results
    });
  }, [importText, addCardToDeck]);

  // Handle closing import modal
  const handleCloseImportModal = useCallback(() => {
    setShowImportModal(false);
    setImportText('');
    setImportResults(null);
  }, []);

  // Handle card preview
  const handleCardPreview = useCallback((card: MTGCard) => {
    setPreviewCard(card);
    setPreviewFaceIndex(0); // Reset to front face when opening preview
    setShowPreviewModal(true);
  }, []);

  // Handle flipping in preview modal
  const handlePreviewFlip = useCallback(() => {
    if (previewCard && (previewCard as any).card_faces && (previewCard as any).card_faces.length >= 2) {
      setPreviewFaceIndex(prev => prev === 0 ? 1 : 0);
    }
  }, [previewCard]);

  // Handle deck name editing
  const handleStartEditingDeckName = useCallback(() => {
    setIsEditingDeckName(true);
    setTempDeckName(deck.name);
  }, [deck.name]);

  const handleSaveDeckName = useCallback(() => {
    if (tempDeckName.trim()) {
      setDeck(prev => ({
        ...prev,
        name: tempDeckName.trim()
      }));
    }
    setIsEditingDeckName(false);
  }, [tempDeckName]);

  const handleCancelEditingDeckName = useCallback(() => {
    setIsEditingDeckName(false);
    setTempDeckName(deck.name);
  }, [deck.name]);

  const handleDeckNameKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSaveDeckName();
    } else if (e.key === 'Escape') {
      handleCancelEditingDeckName();
    }
  }, [handleSaveDeckName, handleCancelEditingDeckName]);

  return (
    <div className="min-h-screen bg-black text-white">
      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
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
              <button
                onClick={handleRandomCard}
                className="absolute right-20 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                title="Random Card"
              >
                <Shuffle className="w-4 h-4" />
              </button>
              <button
                onClick={handleAdvancedSearch}
                className="absolute right-12 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                title="Advanced Search"
              >
                <Sliders className="w-4 h-4" />
              </button>
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
          <div 
            className={`transition-all duration-300 ease-in-out overflow-hidden ${
              (searchQuery.trim().length > 2 || showingVariantsFor) 
                ? 'max-h-96 opacity-100 mb-8' 
                : 'max-h-0 opacity-0 mb-0'
            }`}
          >
              <CardSearchResults 
                results={searchResults?.data || []}
                isLoading={searchLoading}
                onCardAdd={addCardToDeck}
              onVariantSelect={handleVariantSelect}
              isShowingVariants={!!showingVariantsFor}
                viewMode={viewMode}
              />
            </div>

          {/* Advanced Search Panel */}
          <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
            showAdvancedSearch ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
          }`}>
            <h3 className="text-white font-semibold mb-4 max-w-6xl mx-auto">Advanced Search</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-w-6xl mx-auto">
              {/* Basic Card Info */}
              <div>
                <label className="block text-gray-300 text-sm mb-2">Card Name</label>
                <input 
                  type="text" 
                  placeholder="Exact or partial name"
                  className="w-full bg-black border border-gray-600 text-white rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-gray-300 text-sm mb-2">Type Line</label>
                <input 
                  type="text" 
                  placeholder="Enter a type or choose from the list"
                  className="w-full bg-black border border-gray-600 text-white rounded px-3 py-2"
                />
                <div className="mt-1">
                  <label className="flex items-center text-gray-300 text-xs">
                    <input type="checkbox" className="mr-1 bg-black border-gray-600" />
                    Allow partial type matches
                  </label>
                </div>
              </div>

              {/* Colors */}
              <div>
                <label className="block text-gray-300 text-sm mb-2">Colors</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowColorsDropdown(!showColorsDropdown)}
                    className="w-full bg-black border border-gray-600 text-white rounded px-3 py-2 text-left flex items-center justify-between"
                  >
                    <span className="text-gray-400">
                      {selectedColors.length === 0 ? 'Select colors...' : `${selectedColors.length} Selected`}
                    </span>
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  
                  {showColorsDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-black border border-gray-600 rounded-lg shadow-xl z-50 p-3">
                      <div className="space-y-2">
                        {['White', 'Blue', 'Black', 'Red', 'Green', 'Colorless'].map((color) => (
                          <label key={color} className="flex items-center text-gray-300 text-sm cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="mr-2 bg-black border-gray-600"
                              checked={selectedColors.includes(color)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedColors([...selectedColors, color]);
                                } else {
                                  setSelectedColors(selectedColors.filter(c => c !== color));
                                }
                              }}
                            />
                            {color}
                          </label>
                        ))}
                        <hr className="border-gray-600 my-2" />
                        <label className="flex items-center text-gray-300 text-xs cursor-pointer">
                          <input type="checkbox" className="mr-1 bg-black border-gray-600" />
                          Exactly these colors
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-gray-300 text-sm mb-2">Commander</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowCommanderDropdown(!showCommanderDropdown)}
                    className="w-full bg-black border border-gray-600 text-white rounded px-3 py-2 text-left flex items-center justify-between"
                  >
                    <span className="text-gray-400">
                      {selectedCommander.length === 0 ? 'Select commander colors...' : `${selectedCommander.length} Selected`}
                    </span>
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  
                  {showCommanderDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-black border border-gray-600 rounded-lg shadow-xl z-50 p-3">
                      <div className="space-y-2">
                        {['White', 'Blue', 'Black', 'Red', 'Green', 'Colorless'].map((color) => (
                          <label key={color} className="flex items-center text-gray-300 text-sm cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="mr-2 bg-black border-gray-600"
                              checked={selectedCommander.includes(color)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedCommander([...selectedCommander, color]);
                                } else {
                                  setSelectedCommander(selectedCommander.filter(c => c !== color));
                                }
                              }}
                            />
                            {color}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-gray-300 text-sm mb-2">Mana Cost</label>
                <input 
                  type="text" 
                  placeholder="Any mana symbols, e.g. '{W}{U}'"
                  className="w-full bg-black border border-gray-600 text-white rounded px-3 py-2"
                />
                <div className="mt-1">
                  <label className="flex items-center text-gray-300 text-xs">
                    <input type="checkbox" className="mr-1 bg-black border-gray-600" />
                    Add symbol
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-gray-300 text-sm mb-2">Stats</label>
                <div className="flex space-x-1">
                  <select className="w-1/3 bg-black border border-gray-600 text-white rounded px-2 py-2 text-sm">
                    <option value="mv">Mana Value</option>
                    <option value="pow">Power</option>
                    <option value="tou">Toughness</option>
                    <option value="loy">Loyalty</option>
                  </select>
                  <select className="w-1/4 bg-black border border-gray-600 text-white rounded px-1 py-2 text-sm">
                    <option value="=">=</option>
                    <option value=">">&gt;</option>
                    <option value="<">&lt;</option>
                    <option value=">=">&ge;</option>
                    <option value="<=">&le;</option>
                  </select>
                  <input 
                    type="text" 
                    placeholder="Any value, e.g. '2'"
                    className="w-5/12 bg-black border border-gray-600 text-white rounded px-3 py-2"
                  />
                </div>
              </div>
              
              {/* Game Section */}
              <div>
                <label className="block text-gray-300 text-sm mb-2">Game</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowGameDropdown(!showGameDropdown)}
                    className="w-full bg-black border border-gray-600 text-white rounded px-3 py-2 text-left flex items-center justify-between"
                  >
                    <span className="text-gray-400">
                      {selectedGame.length === 0 ? 'Select game types...' : `${selectedGame.length} Selected`}
                    </span>
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  
                  {showGameDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-black border border-gray-600 rounded-lg shadow-xl z-50 p-3">
                      <div className="space-y-2">
                        {['Paper', 'Arena', 'Magic Online'].map((game) => (
                          <label key={game} className="flex items-center text-gray-300 text-sm cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="mr-2 bg-black border-gray-600"
                              checked={selectedGame.includes(game)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedGame([...selectedGame, game]);
                                } else {
                                  setSelectedGame(selectedGame.filter(g => g !== game));
                                }
                              }}
                            />
                            {game}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Sets */}
              <div>
                <label className="block text-gray-300 text-sm mb-2">Sets</label>
                <input 
                  type="text" 
                  placeholder="Enter a set name or choose from the list"
                  className="w-full bg-black border border-gray-600 text-white rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-gray-300 text-sm mb-2">Block</label>
                <input 
                  type="text" 
                  placeholder="Enter a block name or choose from the list"
                  className="w-full bg-black border border-gray-600 text-white rounded px-3 py-2"
                />
              </div>
              
              {/* Rarity */}
              <div>
                <label className="block text-gray-300 text-sm mb-2">Rarity</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowRarityDropdown(!showRarityDropdown)}
                    className="w-full bg-black border border-gray-600 text-white rounded px-3 py-2 text-left flex items-center justify-between"
                  >
                    <span className="text-gray-400">
                      {selectedRarity.length === 0 ? 'Select rarities...' : `${selectedRarity.length} Selected`}
                    </span>
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  
                  {showRarityDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-black border border-gray-600 rounded-lg shadow-xl z-50 p-3">
                      <div className="space-y-2">
                        {['Common', 'Uncommon', 'Rare', 'Mythic Rare'].map((rarity) => (
                          <label key={rarity} className="flex items-center text-gray-300 text-sm cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="mr-2 bg-black border-gray-600"
                              checked={selectedRarity.includes(rarity)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedRarity([...selectedRarity, rarity]);
                                } else {
                                  setSelectedRarity(selectedRarity.filter(r => r !== rarity));
                                }
                              }}
                            />
                            {rarity}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Criteria */}
              <div>
                <label className="block text-gray-300 text-sm mb-2">Criteria</label>
                <input 
                  type="text" 
                  placeholder="Enter a criterion or choose from the list"
                  className="w-full bg-black border border-gray-600 text-white rounded px-3 py-2"
                />
                <div className="mt-1">
                  <label className="flex items-center text-gray-300 text-xs">
                    <input type="checkbox" className="mr-1 bg-black border-gray-600" />
                    Allow partial criteria matches
                  </label>
                </div>
              </div>
              
              {/* Text Search */}
              <div>
                <label className="block text-gray-300 text-sm mb-2">Text</label>
                <input 
                  type="text" 
                  placeholder="Any text, e.g. 'draw a card'"
                  className="w-full bg-black border border-gray-600 text-white rounded px-3 py-2"
                />
                <div className="mt-1">
                  <label className="flex items-center text-gray-300 text-xs">
                    <input type="checkbox" className="mr-1 bg-black border-gray-600" />
                    Add symbol
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-gray-300 text-sm mb-2">Oracle Text</label>
                <input 
                  type="text" 
                  placeholder="Rules text to search"
                  className="w-full bg-black border border-gray-600 text-white rounded px-3 py-2"
                />
              </div>

              {/* Format */}
              <div>
                <label className="block text-gray-300 text-sm mb-2">Format</label>
                <div className="flex space-x-1">
                  <select className="w-1/2 bg-black border border-gray-600 text-white rounded px-3 py-2">
                    <option value="">Legal</option>
                    <option value="banned">Banned</option>
                    <option value="restricted">Restricted</option>
                    <option value="not_legal">Not Legal</option>
                  </select>
                  <select className="w-1/2 bg-black border border-gray-600 text-white rounded px-3 py-2">
                    <option value="">Choose format</option>
                    <option value="standard">Standard</option>
                    <option value="pioneer">Pioneer</option>
                    <option value="modern">Modern</option>
                    <option value="legacy">Legacy</option>
                    <option value="vintage">Vintage</option>
                    <option value="commander">Commander</option>
                    <option value="pauper">Pauper</option>
                    <option value="historic">Historic</option>
                    <option value="alchemy">Alchemy</option>
                    <option value="brawl">Brawl</option>
                    <option value="penny">Penny Dreadful</option>
                  </select>
                </div>
              </div>
              
              {/* Language */}
              <div>
                <label className="block text-gray-300 text-sm mb-2">Language</label>
                <select className="w-full bg-black border border-gray-600 text-white rounded px-3 py-2">
                  <option value="">Default</option>
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                  <option value="it">Italian</option>
                  <option value="pt">Portuguese</option>
                  <option value="ja">Japanese</option>
                  <option value="ko">Korean</option>
                  <option value="ru">Russian</option>
                  <option value="zhs">Chinese (Simplified)</option>
                  <option value="zht">Chinese (Traditional)</option>
                </select>
              </div>
              
              {/* Preferences */}
              <div>
                <label className="block text-gray-300 text-sm mb-2">Preferences</label>
                <div className="space-y-2">
                  <div className="flex space-x-1">
                    <select className="w-1/2 bg-black border border-gray-600 text-white rounded px-3 py-2">
                      <option value="">Display as Images</option>
                      <option value="text">Display as Text</option>
                      <option value="checklist">Display as Checklist</option>
                    </select>
                    <select className="w-1/2 bg-black border border-gray-600 text-white rounded px-3 py-2">
                      <option value="">Sort by Name</option>
                      <option value="set">Sort by Set</option>
                      <option value="rarity">Sort by Rarity</option>
                      <option value="cmc">Sort by CMC</option>
                      <option value="color">Sort by Color</option>
                      <option value="price">Sort by Price</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="flex items-center text-gray-300 text-xs">
                      <input type="checkbox" className="mr-1 bg-black border-gray-600" />
                      Show all card prints
                    </label>
                    <label className="flex items-center text-gray-300 text-xs">
                      <input type="checkbox" className="mr-1 bg-black border-gray-600" />
                      Include extra cards (tokens, planes, schemes, etc.)
                    </label>
                  </div>
                </div>
              </div>
              
              {/* Prices */}
              <div>
                <label className="block text-gray-300 text-sm mb-2">Prices</label>
                <div className="flex space-x-1">
                  <select className="w-1/3 bg-black border border-gray-600 text-white rounded px-2 py-2 text-sm">
                    <option value="usd">USD</option>
                    <option value="eur">EUR</option>
                    <option value="tix">TIX</option>
                  </select>
                  <select className="w-1/4 bg-black border border-gray-600 text-white rounded px-1 py-2 text-sm">
                    <option value="less">less than</option>
                    <option value="greater">greater than</option>
                    <option value="equal">equal to</option>
                  </select>
                  <input 
                    type="text" 
                    placeholder="Any value, e.g. '15.00'"
                    className="w-5/12 bg-black border border-gray-600 text-white rounded px-3 py-2"
                  />
                </div>
              </div>
              
              {/* Artist */}
              <div>
                <label className="block text-gray-300 text-sm mb-2">Artist</label>
                <input 
                  type="text" 
                  placeholder="Any artist name, e.g. 'Magali'"
                  className="w-full bg-black border border-gray-600 text-white rounded px-3 py-2"
                />
              </div>
              
              {/* Flavor Text */}
              <div>
                <label className="block text-gray-300 text-sm mb-2">Flavor Text</label>
                <input 
                  type="text" 
                  placeholder="Any flavor text, e.g. 'Kaldheim'"
                  className="w-full bg-black border border-gray-600 text-white rounded px-3 py-2"
                />
              </div>
              
              {/* Lore Finder */}
              <div>
                <label className="block text-gray-300 text-sm mb-2">Lore Finder™</label>
                <input 
                  type="text" 
                  placeholder="Any text, especially names, e.g. 'Jhoira'"
                  className="w-full bg-black border border-gray-600 text-white rounded px-3 py-2"
                />
              </div>
              
              {/* Special Properties */}
              <div className="xl:col-span-4">
                <label className="block text-gray-300 text-sm mb-2">Special Properties</label>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2">
                  <label className="flex items-center text-gray-300 text-sm">
                    <input type="checkbox" className="mr-2 bg-black border-gray-600" />
                    Foil
                  </label>
                  <label className="flex items-center text-gray-300 text-sm">
                    <input type="checkbox" className="mr-2 bg-black border-gray-600" />
                    Non-foil
                  </label>
                  <label className="flex items-center text-gray-300 text-sm">
                    <input type="checkbox" className="mr-2 bg-black border-gray-600" />
                    Reserved List
                  </label>
                  <label className="flex items-center text-gray-300 text-sm">
                    <input type="checkbox" className="mr-2 bg-black border-gray-600" />
                    Reprint
                  </label>
                  <label className="flex items-center text-gray-300 text-sm">
                    <input type="checkbox" className="mr-2 bg-black border-gray-600" />
                    First Printing
                  </label>
                  <label className="flex items-center text-gray-300 text-sm">
                    <input type="checkbox" className="mr-2 bg-black border-gray-600" />
                    Promo
                  </label>
                  <label className="flex items-center text-gray-300 text-sm">
                    <input type="checkbox" className="mr-2 bg-black border-gray-600" />
                    Digital
                  </label>
                  <label className="flex items-center text-gray-300 text-sm">
                    <input type="checkbox" className="mr-2 bg-black border-gray-600" />
                    Paper
                  </label>
                  <label className="flex items-center text-gray-300 text-sm">
                    <input type="checkbox" className="mr-2 bg-black border-gray-600" />
                    MTGO
                  </label>
                  <label className="flex items-center text-gray-300 text-sm">
                    <input type="checkbox" className="mr-2 bg-black border-gray-600" />
                    Arena
                  </label>
                  <label className="flex items-center text-gray-300 text-sm">
                    <input type="checkbox" className="mr-2 bg-black border-gray-600" />
                    Full Art
                  </label>
                  <label className="flex items-center text-gray-300 text-sm">
                    <input type="checkbox" className="mr-2 bg-black border-gray-600" />
                    Textless
                  </label>
                  <label className="flex items-center text-gray-300 text-sm">
                    <input type="checkbox" className="mr-2 bg-black border-gray-600" />
                    Story Spotlight
                  </label>
                  <label className="flex items-center text-gray-300 text-sm">
                    <input type="checkbox" className="mr-2 bg-black border-gray-600" />
                    Timeshifted
                  </label>
                  <label className="flex items-center text-gray-300 text-sm">
                    <input type="checkbox" className="mr-2 bg-black border-gray-600" />
                    Split Card
                  </label>
                  <label className="flex items-center text-gray-300 text-sm">
                    <input type="checkbox" className="mr-2 bg-black border-gray-600" />
                    Flip Card
                  </label>
                  <label className="flex items-center text-gray-300 text-sm">
                    <input type="checkbox" className="mr-2 bg-black border-gray-600" />
                    Transform
                  </label>
                  <label className="flex items-center text-gray-300 text-sm">
                    <input type="checkbox" className="mr-2 bg-black border-gray-600" />
                    Modal DFC
                  </label>
                  <label className="flex items-center text-gray-300 text-sm">
                    <input type="checkbox" className="mr-2 bg-black border-gray-600" />
                    Meld
                  </label>
                  <label className="flex items-center text-gray-300 text-sm">
                    <input type="checkbox" className="mr-2 bg-black border-gray-600" />
                    Level Up
                  </label>
                  <label className="flex items-center text-gray-300 text-sm">
                    <input type="checkbox" className="mr-2 bg-black border-gray-600" />
                    Saga
                  </label>
                  <label className="flex items-center text-gray-300 text-sm">
                    <input type="checkbox" className="mr-2 bg-black border-gray-600" />
                    Adventure
                  </label>
                  <label className="flex items-center text-gray-300 text-sm">
                    <input type="checkbox" className="mr-2 bg-black border-gray-600" />
                    Booster Fun
                  </label>
                  <label className="flex items-center text-gray-300 text-sm">
                    <input type="checkbox" className="mr-2 bg-black border-gray-600" />
                    Anime
                  </label>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end mt-4 space-x-2 max-w-4xl mx-auto">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowAdvancedSearch(false)}
                className="text-gray-400 hover:text-white"
              >
                Cancel
              </Button>
              <Button 
                variant="ghost"
                size="sm"
                className="text-gray-300 hover:text-white border border-transparent hover:border-gray-600 hover:bg-transparent transition-colors"
              >
                Search
              </Button>
            </div>
          </div>

          {/* Deck Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {isEditingDeckName ? (
                  <input
                    type="text"
                    value={tempDeckName}
                    onChange={(e) => setTempDeckName(e.target.value)}
                    onKeyDown={handleDeckNameKeyDown}
                    onBlur={handleSaveDeckName}
                    className="text-lg font-bold bg-transparent border-b border-gray-600 text-white focus:outline-none focus:border-white px-1 py-1"
                    autoFocus
                    placeholder="Enter deck name..."
                  />
                ) : (
                  <h1 
                    className="text-lg font-bold cursor-pointer hover:text-gray-300 transition-colors"
                    onClick={handleStartEditingDeckName}
                    title="Click to edit deck name"
                  >
                  {deck.name} · {totalCards} cards
                </h1>
                )}
              </div>
              
              <div className="flex items-center space-x-3">
                {/* View Mode Toggle */}
                <div className="flex items-center bg-black rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('visual')}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                      viewMode === 'visual'
                        ? 'bg-white text-black'
                        : 'text-gray-400 hover:text-white'
                    }`}
                    title="Visual View"
                  >
                    <Grid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('text')}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                      viewMode === 'text'
                        ? 'bg-white text-black'
                        : 'text-gray-400 hover:text-white'
                    }`}
                    title="Text View"
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
                
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
                  <Upload className="w-4 h-4 ml-1" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-white hover:text-gray-300"
                  onClick={() => setShowImportModal(true)}
                >
                  Import
                  <Download className="w-4 h-4 ml-1" />
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
                      onCardChange={changeCardFace}
                      onShowVariants={showCardVariants}
                      onShowPreview={handleCardPreview}
                        onColumnDelete={deleteColumn}
                        activeId={activeId}
                        viewMode={viewMode}
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
                          onCardChange={changeCardFace}
                          onShowVariants={showCardVariants}
                          onShowPreview={handleCardPreview}
                            onColumnDelete={deleteColumn}
                            activeId={activeId}
                            viewMode={viewMode}
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

      {/* Preview Modal */}
      {showPreviewModal && previewCard && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center">
          {/* Blurred Background Overlay */}
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            onClick={() => setShowPreviewModal(false)}
          />
          
          {/* Modal Content */}
          <div 
            className="relative z-10 flex items-center justify-center w-full h-full p-8"
            onClick={() => setShowPreviewModal(false)}
          >
            {/* Close Button */}
            <button
              onClick={() => setShowPreviewModal(false)}
              className="absolute top-4 right-4 z-20 w-8 h-8 flex items-center justify-center text-white hover:text-gray-300 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <div className="flex items-center justify-center gap-8 max-w-7xl w-full">
              {/* Giant Card Image */}
              <div className="flex-shrink-0">
                <div 
                  className="relative aspect-[5/7] w-96 lg:w-[500px] rounded-lg overflow-hidden shadow-2xl border-2 border-white/20"
                  onClick={(e) => e.stopPropagation()}
                >
                  {(() => {
                    const cardFaces = (previewCard as any).card_faces;
                    const isDoubleFaced = cardFaces && cardFaces.length >= 2;
                    const currentFace = isDoubleFaced ? cardFaces[previewFaceIndex] : previewCard;
                    const imageUrl = currentFace.image_uris?.normal || previewCard.image_uris?.normal;
                    
                    return (
                      <>
                        {/* Flip Button - only show for double-faced cards */}
                        {isDoubleFaced && (
                          <button
                            onClick={handlePreviewFlip}
                            className="absolute top-3 right-3 z-30 w-12 h-12 flex items-center justify-center bg-black/60 hover:bg-black/80 rounded-full text-white transition-colors"
                            title="Flip card"
                          >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          </button>
                        )}
                        
                        {imageUrl ? (
                          <Image
                            src={imageUrl}
                            alt={currentFace.name || previewCard.name}
                            fill
                            className="object-cover rounded-lg"
                            sizes="500px"
                            priority
                          />
                        ) : (
                          <div className="absolute inset-0 bg-gray-800 border border-gray-600 rounded-lg flex flex-col items-center justify-center p-6 text-center">
                            <p className="text-white text-2xl font-medium mb-3">{currentFace.name || previewCard.name}</p>
                            <p className="text-gray-400 text-xl mb-3">{currentFace.mana_cost || previewCard.mana_cost || ''}</p>
                            <p className="text-gray-500 text-lg">{currentFace.type_line || previewCard.type_line}</p>
                            {(currentFace.oracle_text || previewCard.oracle_text) && (
                              <p className="text-gray-300 text-base mt-6 leading-relaxed">{currentFace.oracle_text || previewCard.oracle_text}</p>
                            )}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
              
              {/* Card Details Panel */}
              <div 
                className="flex-1 max-w-md space-y-6"
                onClick={(e) => e.stopPropagation()}
              >
                {(() => {
                  const cardFaces = (previewCard as any).card_faces;
                  const isDoubleFaced = cardFaces && cardFaces.length >= 2;
                  const currentFace = isDoubleFaced ? cardFaces[previewFaceIndex] : previewCard;
                  
                  return (
                    <>
                      <div>
                        <h2 className="text-2xl font-bold text-white mb-4">{currentFace.name || previewCard.name}</h2>
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-400">Mana Cost:</span> 
                            <span className="text-white font-medium">{currentFace.mana_cost || previewCard.mana_cost || 'None'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-400">Type:</span> 
                            <span className="text-white font-medium">{currentFace.type_line || previewCard.type_line}</span>
                          </div>
                          {(currentFace.power || previewCard.power) && (currentFace.toughness || previewCard.toughness) && (
                            <div className="flex items-center gap-2">
                              <span className="text-gray-400">Power/Toughness:</span> 
                              <span className="text-white font-medium">{currentFace.power || previewCard.power}/{currentFace.toughness || previewCard.toughness}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <span className="text-gray-400">Set:</span> 
                            <span className="text-white font-medium">{previewCard.set_name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-400">Rarity:</span> 
                            <span className="text-white font-medium capitalize">{previewCard.rarity}</span>
                          </div>
                        </div>
                      </div>
                      
                      {(currentFace.oracle_text || previewCard.oracle_text) && (
                        <div>
                          <h3 className="text-lg font-semibold text-white mb-3">Oracle Text</h3>
                          <p className="text-gray-300 leading-relaxed">{currentFace.oracle_text || previewCard.oracle_text}</p>
                        </div>
                      )}
                      
                      {(currentFace.flavor_text || previewCard.flavor_text) && (
                        <div>
                          <h3 className="text-lg font-semibold text-white mb-3">Flavor Text</h3>
                          <p className="text-gray-400 italic leading-relaxed">{currentFace.flavor_text || previewCard.flavor_text}</p>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      <Dialog open={showImportModal} onOpenChange={setShowImportModal}>
        <DialogContent className="bg-black border-gray-600 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import Deck</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder={`Paste your deck list here.

Supported formats:
• 4 Lightning Bolt
• 4x Lightning Bolt
• Lightning Bolt x4
• Lightning Bolt (defaults to 1)
• 1 Nashi, Moon Sage's Scion (neo)
• 4x Lightning Bolt (m21)`}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              className="min-h-[200px] bg-black border-gray-600 text-white"
            />
            
            {/* Import Results */}
            {importResults && (
              <div className="rounded-lg p-4 bg-black">
                {importResults.isImporting ? (
                  null
                ) : importResults.hasImported ? (
                  <div className="space-y-3">
                    {/* Summary */}
                    <div className="flex items-center gap-4">
                      {importResults.successful.length > 0 && (
                        <div className="flex items-center gap-1 text-green-400">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span>
                            {importResults.successful.reduce((sum, card) => sum + card.quantity, 0)} cards imported
                          </span>
                        </div>
                      )}
                      {importResults.failed.length > 0 && (
                        <div className="flex items-center gap-1 text-red-400">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          <span>
                            {importResults.failed.reduce((sum, card) => sum + card.quantity, 0)} cards failed
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {/* Failed Cards Details */}
                    {importResults.failed.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-red-400">Failed to import:</h4>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {importResults.failed.map((card, index) => (
                            <div key={index} className="text-xs text-gray-300 bg-red-900/20 rounded px-2 py-1">
                              <span className="font-medium">
                                {card.quantity}x {card.name}
                                {card.setCode && ` (${card.setCode.toUpperCase()})`}
                              </span>
                              <span className="text-red-400 ml-2">- {card.error}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Success Message */}
                    {importResults.successful.length > 0 && importResults.failed.length === 0 && (
                      <div className="text-green-400 text-sm">
                        All cards imported successfully!
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            )}
            
            <div className="flex justify-end space-x-2">
              <Button
                variant="ghost"
                onClick={handleCloseImportModal}
                className="text-gray-400 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                onClick={handleImportDeck}
                disabled={!importText.trim() || (importResults?.isImporting ?? false)}
                variant="ghost"
                className="text-white hover:text-gray-300"
              >
                {importResults?.isImporting ? (
                  <>
                    Importing...
                    <Loader2 className="w-4 h-4 ml-1 animate-spin" />
                  </>
                ) : (
                  <>
                    Import Cards
                    <Download className="w-4 h-4 ml-1" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 