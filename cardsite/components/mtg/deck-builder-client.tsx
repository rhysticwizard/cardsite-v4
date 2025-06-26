'use client';

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
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
  useDraggable,
} from '@dnd-kit/core';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { searchCards, getCardVariants, getRandomCard } from '@/lib/api/scryfall';
import type { MTGCard } from '@/lib/types/mtg';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { secureApiRequest } from '@/lib/csrf';
import { Search, Download, Upload, Play, Info, Save, Loader2, X as XIcon, Shuffle, Sliders, ChevronDown, Grid, List } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { CardSearchResults } from './card-search-results';
import { DeckColumn } from './deck-column';
import { PlusButtonDropZone } from './plus-button-drop-zone';
import Image from 'next/image';
import { FoilCard3D } from './foil-card-3d';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { DraftDeckStorage, type DraftDeck, type DraftCard } from '@/lib/utils/draft-deck-storage';
import { UnsavedChangesBanner } from '@/components/ui/unsaved-changes-banner';
import { useMultiSelect } from '@/hooks/use-multi-select';

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

// Utility functions extracted for better performance
const getScrollOffset = () => ({
  x: window.pageXOffset || document.documentElement.scrollLeft,
  y: window.pageYOffset || document.documentElement.scrollTop
});

const throttle = <T extends (...args: any[]) => void>(func: T, delay: number): T => {
  let timeoutId: NodeJS.Timeout;
  return ((...args: any[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  }) as T;
};

interface DeckBuilderClientProps {
  isViewMode?: boolean;
  deckId?: string;
  isDraftMode?: boolean;
  draftId?: string;
}

export function DeckBuilderClient({ isViewMode = false, deckId, isDraftMode = false, draftId }: DeckBuilderClientProps = {}) {
  const { data: session } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [customColumns, setCustomColumns] = useState<Record<string, string>>({});
  const [columnPositions, setColumnPositions] = useState<Record<string, { row: number; col: number }>>({});
  const [deletedBaseColumns, setDeletedBaseColumns] = useState<Set<string>>(new Set());
  const [columnOptions, setColumnOptions] = useState<Record<string, string>>({});
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
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportOptions, setExportOptions] = useState({
    selectBy: 'All cards',
    includeOutOfDeck: false,
    exportType: 'Text',
    exportFormat: '1x Example Card (set) 123 *F* [Example category] ^Buy,#0066ff^',
    sectionHeader: 'No section header',
    useFrontNameOnly: true,
    includeQuantity: true,
    includeSetCode: true,
    includeCollectorNumber: true,
    includeFoilIndicator: true,
    includeCategories: true,
    includeColorTagData: true
  });
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

  // Draft-specific state
  const [currentDraft, setCurrentDraft] = useState<DraftDeck | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isDraftSaving, setIsDraftSaving] = useState(false);

  // Global hover management to prevent multiple previews
  const [activeHoverCard, setActiveHoverCard] = useState<string | null>(null);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (showPreviewModal) {
      document.body.style.overflow = 'hidden';
      document.body.style.pointerEvents = 'none';
    } else {
      document.body.style.overflow = '';
      document.body.style.pointerEvents = '';
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = '';
      document.body.style.pointerEvents = '';
    };
  }, [showPreviewModal]);

  // Memoized computed values
  const allDeckCards = useMemo(() => {
    return Object.values(deck).flat().filter((item): item is DeckCardData => !Array.isArray(item));
  }, [deck]);

  const allColumns = useMemo(() => ({ ...CARD_CATEGORIES, ...customColumns }), [customColumns]);
  const baseColumns = useMemo(() => Object.keys(CARD_CATEGORIES), []);

  // Cache card positions for better performance
  const cardPositionsRef = useRef<Map<string, DOMRect>>(new Map());
  
  // Optimized card position update function
  const updateCardPositions = useCallback(() => {
    const newPositions = new Map<string, DOMRect>();
    allDeckCards.forEach(card => {
      const cardElement = document.querySelector(`[data-card-id="${card.id}"]`);
      if (cardElement) {
        newPositions.set(card.id, cardElement.getBoundingClientRect());
      }
    });
    cardPositionsRef.current = newPositions;
  }, [allDeckCards]);

  // Throttled scroll handler
  const throttledScrollHandler = useMemo(
    () => throttle(() => {
      requestAnimationFrame(updateCardPositions);
    }, 16), // ~60fps
    [updateCardPositions]
  );

  // Update card positions when cards change
  useEffect(() => {
    requestAnimationFrame(updateCardPositions);
  }, [updateCardPositions, viewMode]);

  // Multi-select functionality with optimized intersection test
  const {
    selectedItems: selectedCards,
    setSelectedItems: setSelectedCards,
    isSelecting,
    selectionStart,
    selectionEnd,
    clearSelection,
    toggleItemSelection,
    startSelection,
    getSelectionRectangle,
    handleContainerClick,
    justCompletedSelection
  } = useMultiSelect({
    items: allDeckCards,
    getItemId: (card: DeckCardData) => card.id,
    intersectionTest: (card: DeckCardData, rect) => {
      const cardElement = document.querySelector(`[data-card-id="${card.id}"]`);
      if (!cardElement) return false;
      
      // Get fresh bounding rect in viewport coordinates
      const cardRect = cardElement.getBoundingClientRect();
      
      // Convert selection rect from document coordinates to viewport coordinates
      const scroll = getScrollOffset();
      const selectionViewportRect = {
        left: rect.left - scroll.x,
        top: rect.top - scroll.y,
        right: rect.left + rect.width - scroll.x,
        bottom: rect.top + rect.height - scroll.y
      };
      
      // Check intersection in viewport coordinates
      return !(selectionViewportRect.left > cardRect.right ||
               selectionViewportRect.right < cardRect.left ||
               selectionViewportRect.top > cardRect.bottom ||
               selectionViewportRect.bottom < cardRect.top);
    },
    enabled: !isViewMode
  });

  // Handle scroll updates during selection
  useEffect(() => {
    if (!isSelecting) return;

    window.addEventListener('scroll', throttledScrollHandler, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', throttledScrollHandler);
    };
  }, [isSelecting, throttledScrollHandler]);

  // Initialize default columns for new decks
  useEffect(() => {
    if (!deckId && !isDraftMode && Object.keys(columnPositions).length === 0) {
      const defaultPositions: Record<string, { row: number; col: number }> = {};
      const defaultCustomColumns: Record<string, string> = {};
      
      // Base columns in first row
      baseColumns.forEach((key, index) => {
        if (index < 6) {
          defaultPositions[key] = { row: 0, col: index };
        }
      });
      
      // Add placeholders to fill remaining positions
      const remainingPositions = 6 - Math.min(baseColumns.length, 6);
      for (let i = 0; i < remainingPositions; i++) {
        const columnKey = `custom-column-${i + 1}`;
        defaultCustomColumns[columnKey] = 'Column';
        defaultPositions[columnKey] = { row: 0, col: baseColumns.length + i };
      }
      
      setColumnPositions(defaultPositions);
      setCustomColumns(defaultCustomColumns);
    }
  }, [deckId, isDraftMode, columnPositions, baseColumns]);

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
    enabled: !isViewMode && (showingVariantsFor ? true : searchQuery.trim().length > 2),
    staleTime: 1000 * 60 * 5,
  });

  // Load existing deck when deckId is provided
  const { data: existingDeck, isLoading: deckLoading } = useQuery({
    queryKey: ['deck-detail', deckId],
    queryFn: async () => {
      const response = await secureApiRequest(`/api/decks/${deckId}`);
      if (!response.ok) throw new Error('Failed to fetch deck');
      return response.json();
    },
    enabled: !!deckId && !!session?.user,
  });

  // Load existing deck data when deckId is provided
  useEffect(() => {
    if (deckId && existingDeck?.success && existingDeck.deck) {
      const loadedDeck = existingDeck.deck;
      
      // Load basic deck info
      setDeck(prev => ({ ...prev, name: loadedDeck.name }));
      setDeckFormat(loadedDeck.format);
      
      // Parse description to extract user description and column structure
      let userDescription = '';
      let savedColumnStructure = null;
      
      try {
        if (loadedDeck.description) {
          const parsed = JSON.parse(loadedDeck.description);
          if (parsed.userDescription !== undefined && parsed.columnStructure) {
            // New format with column structure
            userDescription = parsed.userDescription || '';
            savedColumnStructure = parsed.columnStructure;
          } else {
            // Old format - just description text
            userDescription = loadedDeck.description;
          }
        }
      } catch {
        // If JSON parsing fails, treat as old format
        userDescription = loadedDeck.description || '';
      }
      
      setDeckDescription(userDescription);
      
      // Restore column structure if available
      if (savedColumnStructure) {
        setCustomColumns(savedColumnStructure.customColumns || {});
        setColumnPositions(savedColumnStructure.columnPositions || {});
        setDeletedBaseColumns(new Set(savedColumnStructure.deletedBaseColumns || []));
        setColumnOptions(savedColumnStructure.columnOptions || {});
      } else {
        // Initialize default positions for base columns (row 0)
        const defaultPositions: Record<string, { row: number; col: number }> = {};
        baseColumns.forEach((key, index) => {
          defaultPositions[key] = { row: 0, col: index };
        });
        setColumnPositions(defaultPositions);
      }
      
              // Load cards by category
        if (loadedDeck.cards) {
          const newDeckState: any = {
            name: loadedDeck.name,
            creatures: [],
            spells: [],
            artifacts: [],
            enchantments: [],
            lands: [],
            sideboard: [],
          };

          // Add custom columns to deck state
          if (savedColumnStructure?.customColumns) {
            Object.keys(savedColumnStructure.customColumns).forEach(columnKey => {
              newDeckState[columnKey] = [];
            });
          }

        // Process each category
        Object.entries(loadedDeck.cards).forEach(([category, categoryCards]: [string, any]) => {
          if (Array.isArray(categoryCards)) {
            const processedCards = categoryCards.map((deckCard: any) => ({
              id: `${deckCard.card.scryfallId || deckCard.card.id}-${category}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              card: {
                id: deckCard.card.scryfallId || deckCard.card.id,
                oracle_id: deckCard.card.scryfallId || deckCard.card.id,
                name: deckCard.card.name,
                mana_cost: deckCard.card.manaCost || '',
                cmc: deckCard.card.cmc || 0,
                type_line: deckCard.card.typeLine || '',
                oracle_text: deckCard.card.oracleText || '',
                power: deckCard.card.power,
                toughness: deckCard.card.toughness,
                colors: deckCard.card.colors || [],
                color_identity: deckCard.card.colorIdentity || [],
                keywords: [],
                legalities: deckCard.card.legalities || {},
                games: ['paper'],
                reserved: false,
                foil: true,
                nonfoil: true,
                finishes: ['nonfoil'],
                oversized: false,
                promo: false,
                reprint: false,
                variation: false,
                set_id: deckCard.card.setCode || '',
                set: deckCard.card.setCode || '',
                set_name: deckCard.card.setName || '',
                set_type: 'expansion',
                set_uri: '',
                set_search_uri: '',
                scryfall_set_uri: '',
                rulings_uri: '',
                prints_search_uri: '',
                collector_number: deckCard.card.collectorNumber || '',
                digital: false,
                rarity: deckCard.card.rarity || 'common',
                flavor_text: '',
                card_back_id: '',
                artist: '',
                artist_ids: [],
                illustration_id: '',
                border_color: 'black',
                frame: '2015',
                security_stamp: '',
                full_art: false,
                textless: false,
                booster: true,
                story_spotlight: false,
                edhrec_rank: 0,
                penny_rank: 0,
                image_uris: deckCard.card.imageUris,
                card_faces: deckCard.card.cardFaces,
                prices: deckCard.card.prices || {},
                related_uris: {},
                purchase_uris: {},
              } as MTGCard,
              quantity: deckCard.quantity,
              category: category as 'creatures' | 'spells' | 'artifacts' | 'enchantments' | 'lands' | 'sideboard',
            }));

            // Map category names to deck state keys
            const categoryKey = category as keyof Omit<DeckState, 'name'>;
            if (categoryKey in newDeckState) {
              newDeckState[categoryKey] = processedCards;
            }
          }
        });

        // Update the deck state with loaded cards
        setDeck(newDeckState);
      }
    }
  }, [deckId, existingDeck]);

  // Load draft data when in draft mode
  useEffect(() => {
    if (isDraftMode && draftId) {
      const draft = DraftDeckStorage.loadDraft(draftId);
      if (draft) {
        setCurrentDraft(draft);
        setDeck(prev => ({ ...prev, name: draft.name }));
        setDeckDescription(draft.description);
        setDeckFormat(draft.format);
        setCustomColumns(draft.customColumns);
        setColumnOptions(draft.columnOptions || {});
        
        // Convert draft cards back to deck format
        const newDeckState: any = {
          name: draft.name,
          creatures: [],
          spells: [],
          artifacts: [],
          enchantments: [],
          lands: [],
          sideboard: [],
        };

        // Add custom categories
        Object.keys(draft.customColumns).forEach(key => {
          newDeckState[key] = [];
        });

        // Group cards by category
        draft.cards.forEach(draftCard => {
          if (!newDeckState[draftCard.category]) {
            newDeckState[draftCard.category] = [];
          }
          
          // Convert draft card back to MTG card format
          const mtgCard: MTGCard = {
            id: draftCard.scryfallId,
            oracle_id: '',
            name: draftCard.name,
            mana_cost: draftCard.manaCost || '',
            cmc: 0,
            type_line: draftCard.typeLine || '',
            oracle_text: '',
            power: '',
            toughness: '',
            colors: [],
            color_identity: [],
            keywords: [],
            legalities: {},
            games: [],
            reserved: false,
            foil: false,
            nonfoil: true,
            finishes: [],
            oversized: false,
            promo: false,
            reprint: false,
            variation: false,
            set_id: '',
            set: '',
            set_name: '',
            set_type: '',
            set_uri: '',
            set_search_uri: '',
            scryfall_set_uri: '',
            rulings_uri: '',
            prints_search_uri: '',
            collector_number: '',
            digital: false,
            rarity: 'common',
            card_back_id: '',
            artist_ids: [],
            border_color: '',
            frame: '',
            full_art: false,
            textless: false,
            booster: false,
            story_spotlight: false,
            image_uris: {
              small: draftCard.imageUris?.normal || '',
              normal: draftCard.imageUris?.normal || '',
              large: draftCard.imageUris?.normal || '',
              png: draftCard.imageUris?.normal || '',
              art_crop: draftCard.imageUris?.normal || '',
              border_crop: draftCard.imageUris?.normal || '',
            },
            prices: {
              usd: '',
              usd_foil: '',
              usd_etched: '',
              eur: '',
              eur_foil: '',
              tix: '',
            },
            related_uris: {},
          };

          const deckCardData: DeckCardData = {
            id: `${draftCard.scryfallId}-${draftCard.category}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            card: mtgCard,
            quantity: draftCard.quantity,
            category: draftCard.category as any,
          };

          newDeckState[draftCard.category].push(deckCardData);
        });

        setDeck(newDeckState);
        setHasUnsavedChanges(true);
      }
    } else if (isDraftMode && !draftId) {
      // Create new draft
      const newDraft = DraftDeckStorage.createDraft();
      setCurrentDraft(newDraft);
      setHasUnsavedChanges(true);
    }
  }, [isDraftMode, draftId]);

  // Save deck mutation
  const saveDeckMutation = useMutation({
    mutationFn: async (deckData: any) => {
      // Determine if we're updating an existing deck or creating a new one
      const isEditing = !isDraftMode && deckId;
      
      const payload = isEditing 
        ? { ...deckData, deckId } // Include deckId for updates
        : deckData;
      
      const response = await secureApiRequest('/api/decks', {
        method: isEditing ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save deck');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      const isEditing = !isDraftMode && deckId;
      console.log(`Deck ${isEditing ? 'updated' : 'created'} successfully:`, data);
      
      // If we were in draft mode, clean up the draft
      if (isDraftMode && currentDraft) {
        DraftDeckStorage.deleteDraft(currentDraft.id);
        setHasUnsavedChanges(false);
        setIsDraftSaving(false);
      }
      
      // Log success message (removed alert popup)
      console.log(`Deck "${deck.name}" ${isEditing ? 'updated' : 'saved'} successfully!`);
      // Refresh user decks cache so the decks page updates
      queryClient.invalidateQueries({ queryKey: ['user-decks'] });
      
      // Clear the deck detail cache to force fresh load on view page
      if (isEditing && deckId) {
        queryClient.removeQueries({ queryKey: ['deck-detail', deckId] });
      }
      
      // Navigate to view mode 
      if (isEditing && deckId) {
        // If we were editing, stay on the same deck (just go back to view mode)
        router.push(`/decks/${deckId}`);
      } else if (data.deck?.id) {
        // If we were creating new (from draft), navigate to new deck
        router.push(`/decks/${data.deck.id}`);
      }
    },
    onError: (error) => {
      console.error('Failed to save deck:', error);
      alert(`Failed to save deck: ${error.message}`);
      if (isDraftMode) {
        setIsDraftSaving(false);
      }
    },
  });

  // Auto-save draft when deck changes (excluding currentDraft from dependencies to prevent infinite loop)
  useEffect(() => {
    if (isDraftMode && currentDraft) {
      const draftCards: DraftCard[] = [];
      
      // Convert current deck state to draft format
      Object.entries(deck).forEach(([category, cards]) => {
        if (category !== 'name' && Array.isArray(cards)) {
          cards.forEach((deckCard: DeckCardData) => {
            draftCards.push({
              scryfallId: deckCard.card.id,
              name: deckCard.card.name,
              quantity: deckCard.quantity,
              category: deckCard.category,
              manaCost: deckCard.card.mana_cost,
              typeLine: deckCard.card.type_line,
              imageUris: deckCard.card.image_uris,
            });
          });
        }
      });

      const updatedDraft: DraftDeck = {
        ...currentDraft,
        name: deck.name,
        description: deckDescription,
        format: deckFormat,
        cards: draftCards,
        customColumns: customColumns,
      columnOptions: columnOptions,
      };

      // Only auto-save, don't update the currentDraft state to prevent infinite loop
      DraftDeckStorage.autoSave(updatedDraft);
    }
  }, [isDraftMode, deck, deckDescription, deckFormat, customColumns]);

  // Mark as having unsaved changes when deck state changes (only after initial load)
  useEffect(() => {
    if (isDraftMode && currentDraft) {
      setHasUnsavedChanges(true);
    }
  }, [isDraftMode, deck, deckDescription, deckFormat, customColumns]);

  // Prevent text selection globally when multi-selecting
  useEffect(() => {
    if (isSelecting) {
      // Add CSS to prevent text selection on the entire page
      document.body.style.userSelect = 'none';
      (document.body.style as any).webkitUserSelect = 'none';
      (document.body.style as any).mozUserSelect = 'none';
      (document.body.style as any).msUserSelect = 'none';
    } else {
      // Restore text selection
      document.body.style.userSelect = '';
      (document.body.style as any).webkitUserSelect = '';
      (document.body.style as any).mozUserSelect = '';
      (document.body.style as any).msUserSelect = '';
    }

    // Cleanup on unmount
    return () => {
      document.body.style.userSelect = '';
      (document.body.style as any).webkitUserSelect = '';
      (document.body.style as any).mozUserSelect = '';
      (document.body.style as any).msUserSelect = '';
    };
  }, [isSelecting]);

  // Calculate total card count (excluding sideboard and extra deck)
  const totalCards = (Object.keys(deck) as Array<keyof DeckState>).reduce((total, key) => {
    if (key === 'name' || key === 'sideboard') return total; // Exclude sideboard from main deck count
    const category = deck[key] as DeckCardData[];
    
    // Exclude cards with column options that don't count toward main deck
    const mainDeckCards = category.filter(card => {
      const columnOption = columnOptions[card.category];
      return columnOption !== 'Sideboard' && columnOption !== 'Starts in Extra';
    });
    
    return total + mainDeckCards.reduce((sum, card) => sum + card.quantity, 0);
  }, 0);
  
  // Calculate sideboard count separately
  const sideboardCards = (Object.keys(deck) as Array<keyof DeckState>).reduce((total, key) => {
    if (key === 'name') return total;
    const category = deck[key] as DeckCardData[];
    
    // Count cards with sideboard column option
    const sideboardColumnCards = category.filter(card => {
      const columnOption = columnOptions[card.category];
      return columnOption === 'Sideboard';
    });
    
    return total + sideboardColumnCards.reduce((sum, card) => sum + card.quantity, 0);
  }, 0) + deck.sideboard.reduce((sum, card) => sum + card.quantity, 0);
  
  // Calculate extra deck count separately
  const extraDeckCards = (Object.keys(deck) as Array<keyof DeckState>).reduce((total, key) => {
    if (key === 'name') return total;
    const category = deck[key] as DeckCardData[];
    
    // Count cards with extra deck column option
    const extraColumnCards = category.filter(card => {
      const columnOption = columnOptions[card.category];
      return columnOption === 'Starts in Extra';
    });
    
    return total + extraColumnCards.reduce((sum, card) => sum + card.quantity, 0);
  }, 0);

  // Calculate total deck price (excluding sideboard cards)
  const totalDeckPrice = (Object.keys(deck) as Array<keyof DeckState>).reduce((total, key) => {
    if (key === 'name') return total;
    const category = deck[key] as DeckCardData[];
    
    // Exclude cards with sideboard column option from price calculation
    const mainDeckCards = category.filter(card => {
      const columnOption = columnOptions[card.category];
      return columnOption !== 'Sideboard';
    });
    
    return total + mainDeckCards.reduce((sum, card) => {
      const cardPrice = parseFloat(card.card.prices?.usd || '0');
      return sum + (cardPrice * card.quantity);
    }, 0);
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
  const changeCardFace = useCallback((cardId: string, category: string, newCard: MTGCard) => {
    setDeck(prev => {
      // Handle both built-in categories and custom columns
      const categoryCards = (prev as any)[category];
      // Safety check: ensure the category exists and is an array
      if (!Array.isArray(categoryCards)) {
        console.warn(`Category ${category} is not an array:`, categoryCards);
        return prev;
      }
      
      return {
        ...prev,
        [category]: categoryCards.map((c: DeckCardData) => 
          c.id === cardId 
            ? { ...c, card: newCard }
            : c
        )
      };
    });
  }, []);

  // Handle column option changes
  const handleColumnOptionChange = useCallback((columnId: string, option: string) => {
    setColumnOptions(prev => ({
      ...prev,
      [columnId]: option
    }));
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
      
      // Search through all categories (built-in and custom) to find the card
      let foundCategory: string | null = null;
      let foundCardId: string | null = null;
      
      // Use allColumns which includes both built-in categories and custom columns
      const allColumnKeys = Object.keys(allColumns);
      
      for (const category of allColumnKeys) {
        const cards = (deck as any)[category];
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
    const activeId = event.active.id as string;
    setActiveId(activeId);
    
    // If dragging a selected card with multiple selections, prepare for multi-card drag
    if (selectedCards.has(activeId) && selectedCards.size > 1) {
      console.log('🔄 Starting multi-card drag with', selectedCards.size, 'cards');
    }
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
    setActiveId(null);

    const activeId = active.id as string;

    // If we're showing variants, ignore drag and drop - variants should only be clicked
    if (showingVariantsFor) {
      return;
    }

    // Handle column drag and drop
    if (activeId.startsWith('column-')) {
      const activeColumnId = activeId.replace('column-', '');
      
      // Handle drop on plus button
      if (over && (over.id as string).startsWith('plus-')) {
        const [, col, row] = (over.id as string).split('-');
        const targetCol = parseInt(col);
        const targetRow = parseInt(row);
        

        
        // Move the column to the new position
        setColumnPositions(prev => ({
          ...prev,
          [activeColumnId]: { row: targetRow, col: targetCol }
        }));
        return;
      }
      
      // Handle drop on another column (swap)
      if (over && (over.id as string).startsWith('column-')) {
        const overColumnId = (over.id as string).replace('column-', '');
        
        if (activeColumnId === overColumnId) return;
        
        // Swap column positions
        const activePos = columnPositions[activeColumnId];
        const overPos = columnPositions[overColumnId];
        
        if (activePos && overPos) {

          
          setColumnPositions(prev => ({
            ...prev,
            [activeColumnId]: overPos,
            [overColumnId]: activePos
          }));
        }
        return;
      }
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

    // Handle moving cards between categories
    const targetCategory = overId in allColumns ? overId : null;
    
    if (!targetCategory) return;

    // Check if we're doing a multi-select drag
    const isMultiSelectDrag = selectedCards.has(activeId) && selectedCards.size > 1;
    
    if (isMultiSelectDrag) {
      console.log('🔄 Moving multiple selected cards:', selectedCards.size);
      
      // Get all selected cards with their source categories
      const cardsToMove: Array<{
        card: DeckCardData;
        sourceCategory: string;
      }> = [];
      
             Object.keys(allColumns).forEach(cat => {
         const categoryCards = deck[cat as keyof Omit<DeckState, 'name'>] || (deck as any)[cat] || [];
         if (Array.isArray(categoryCards)) {
           categoryCards.forEach((card: DeckCardData) => {
             if (selectedCards.has(card.id)) {
               cardsToMove.push({ card, sourceCategory: cat });
             }
           });
         }
       });
      
      // Remove all selected cards from their source categories
      setDeck(prev => {
        const newDeck = { ...prev };
        
        cardsToMove.forEach(({ sourceCategory }) => {
          const categoryKey = sourceCategory as keyof Omit<DeckState, 'name'>;
          newDeck[categoryKey] = newDeck[categoryKey].filter(card => !selectedCards.has(card.id));
        });
        
        // Add all cards to target category
        const newCards = cardsToMove.map(({ card }) => ({
          ...card,
          id: `${card.card.id}-${targetCategory}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          category: targetCategory as keyof Omit<DeckState, 'name'>
        }));
        
        newDeck[targetCategory as keyof Omit<DeckState, 'name'>] = [
          ...newDeck[targetCategory as keyof Omit<DeckState, 'name'>],
          ...newCards
        ];
        
        return newDeck;
      });
      
      // Clear selection after moving
      clearSelection();
      
    } else {
      // Single card move (existing logic)
      const sourceCategory = Object.keys(allColumns).find(cat => {
        const categoryCards = deck[cat as keyof Omit<DeckState, 'name'>] || (deck as any)[cat] || [];
        return categoryCards.some && categoryCards.some((c: any) => c.id === activeId);
      });

      if (sourceCategory && sourceCategory !== targetCategory) {
        const sourceCard = deck[sourceCategory as keyof Omit<DeckState, 'name'>].find(c => c.id === activeId);
        
        if (sourceCard) {
          // Remove from source
          removeCardFromDeck(activeId, sourceCategory as keyof Omit<DeckState, 'name'>);
          
          // Add to target with updated category
          const newCard = {
            ...sourceCard,
            id: `${sourceCard.card.id}-${targetCategory}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            category: targetCategory as keyof Omit<DeckState, 'name'>
          };
          
          setDeck(prev => ({
            ...prev,
            [targetCategory]: [...prev[targetCategory as keyof Omit<DeckState, 'name'>], newCard]
          }));
        }
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

  // Multi-select card click handler
  const handleCardClick = useCallback((cardId: string, event: React.MouseEvent) => {
    toggleItemSelection(cardId, event);
  }, [toggleItemSelection]);

  // Batch operations for multi-select
  // Utility function for batch operations
  const performBatchOperation = useCallback((operation: 'remove' | 'moveToSideboard' | 'moveToMainDeck') => {
    if (selectedCards.size === 0) return;
    
    setDeck(prev => {
      const newDeck = { ...prev };
      
      switch (operation) {
        case 'remove':
          // Remove all selected cards from their respective categories
          Object.keys(newDeck).forEach(category => {
            if (category !== 'name' && Array.isArray(newDeck[category as keyof DeckState])) {
              const categoryKey = category as keyof Omit<DeckState, 'name'>;
              newDeck[categoryKey] = (newDeck[categoryKey] as DeckCardData[])
                .filter(card => !selectedCards.has(card.id));
            }
          });
          break;
          
        case 'moveToSideboard':
          const cardsToMove: DeckCardData[] = [];
          // Remove selected cards from all categories except sideboard
          Object.keys(newDeck).forEach(category => {
            if (category !== 'name' && category !== 'sideboard' && Array.isArray(newDeck[category as keyof DeckState])) {
              const categoryKey = category as keyof Omit<DeckState, 'name'>;
              const categoryCards = newDeck[categoryKey] as DeckCardData[];
              const remainingCards = categoryCards.filter(card => {
                if (selectedCards.has(card.id)) {
                  cardsToMove.push({ ...card, category: 'sideboard' });
                  return false;
                }
                return true;
              });
              newDeck[categoryKey] = remainingCards;
            }
          });
          // Add cards to sideboard
          newDeck.sideboard = [...newDeck.sideboard, ...cardsToMove];
          break;
          
        case 'moveToMainDeck':
          // Find selected sideboard cards and move them to appropriate categories
          const selectedSideboardCards = newDeck.sideboard.filter(card => selectedCards.has(card.id));
          // Remove selected cards from sideboard
          newDeck.sideboard = newDeck.sideboard.filter(card => !selectedCards.has(card.id));
          // Add cards to their appropriate categories
          selectedSideboardCards.forEach(card => {
            const category = determineCategory(card.card);
            const updatedCard = { ...card, category };
            newDeck[category] = [...newDeck[category], updatedCard];
          });
          break;
      }
      
      return newDeck;
    });
    
    clearSelection();
    setHasUnsavedChanges(true);
  }, [selectedCards, clearSelection]);

  const handleBatchRemove = useCallback(() => performBatchOperation('remove'), [performBatchOperation]);
  const handleBatchMoveToSideboard = useCallback(() => performBatchOperation('moveToSideboard'), [performBatchOperation]);
  const handleBatchMoveToMainDeck = useCallback(() => performBatchOperation('moveToMainDeck'), [performBatchOperation]);

  // Handle saving deck
  const handleSaveDeck = useCallback(() => {
    // Check if user is authenticated
    if (!session) {
      // Redirect to sign-in page
      router.push('/auth/signin');
      return;
    }

    if (isDraftMode) {
      setIsDraftSaving(true);
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

    // Create enhanced description with custom column structure
    const columnStructure = {
      customColumns,
      columnPositions,
      deletedBaseColumns: Array.from(deletedBaseColumns),
      columnOptions,
    };

    const enhancedDescription = JSON.stringify({
      userDescription: deckDescription,
      columnStructure,
    });

    const deckData = {
      name: deck.name,
      description: enhancedDescription,
      format: deckFormat,
      isPublic: false,
      cards: deckCards,
    };

    saveDeckMutation.mutate(deckData);
  }, [session, router, deck, deckDescription, deckFormat, saveDeckMutation, queryClient, isDraftMode]);

  // Add new column at specific grid position
  const addNewColumnAt = useCallback((row: number, col: number) => {
    const newColumnKey = `custom_${Date.now()}`;
    const newColumnLabel = `Column`;
    
    setCustomColumns(prev => ({
      ...prev,
      [newColumnKey]: newColumnLabel
    }));
    
    setColumnPositions(prev => ({
      ...prev,
      [newColumnKey]: { row, col }
    }));
    
    setDeck(prev => ({
      ...prev,
      [newColumnKey]: [] as any
    }));
  }, []);

  // Rename column
  const renameColumn = useCallback((columnId: string, newTitle: string) => {
    console.log('Renaming column:', columnId, 'to:', newTitle);
    
    // Store the custom name in customColumns regardless of whether it's a base or custom column
    setCustomColumns(prev => ({
      ...prev,
      [columnId]: newTitle
    }));
  }, []);

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

    // Remove from column positions
    setColumnPositions(prev => {
      const newPositions = { ...prev };
      delete newPositions[columnId];
      return newPositions;
    });
  }, [baseColumns]);

  // Restore deleted base column at specified position
  const restoreBaseColumn = useCallback((columnId: string, row: number = 0, col: number = 0) => {
    setDeletedBaseColumns(prev => {
      const newSet = new Set(prev);
      newSet.delete(columnId);
      return newSet;
    });
    
    // Set position for restored base column
    setColumnPositions(prev => ({
      ...prev,
      [columnId]: { row, col }
    }));
  }, []);

  // Parse and import deck text
  const handleImportDeck = useCallback(async () => {
    console.log('Import deck clicked, text:', importText);
    if (!importText.trim()) {
      console.log('No import text provided');
      return;
    }
    
    // Ensure default columns are visible when importing
    const ensureDefaultColumns = () => {
      // Check if any base columns are visible
      const visibleBaseColumns = baseColumns.filter(key => 
        !deletedBaseColumns.has(key) && columnPositions[key]
      );
      
      if (visibleBaseColumns.length === 0) {
        console.log('No base columns visible, creating default column layout');
        
        // Create default positions for all base columns
        const defaultPositions: Record<string, { row: number; col: number }> = {};
        baseColumns.forEach((key, index) => {
          defaultPositions[key] = { row: 0, col: index };
        });
        
        // Update column positions
        setColumnPositions(prev => ({
          ...prev,
          ...defaultPositions
        }));
        
        // Clear deleted base columns to ensure they're all visible
        setDeletedBaseColumns(new Set());
      }
    };
    
    // Ensure columns are visible before importing
    ensureDefaultColumns();
    
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
  }, [importText, addCardToDeck, baseColumns, deletedBaseColumns, columnPositions]);

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

  // Utility function to collect and filter cards
  const getFilteredCards = useCallback((includeOutOfDeck: boolean = true) => {
    const allCards: DeckCardData[] = [];
    
    // Collect all cards from all categories
    Object.keys(deck).forEach(key => {
      if (key !== 'name') {
        const categoryCards = deck[key as keyof Omit<DeckState, 'name'>] as DeckCardData[];
        if (Array.isArray(categoryCards)) {
          allCards.push(...categoryCards);
        }
      }
    });

    // Apply filters based on export options
    if (!includeOutOfDeck) {
      return allCards.filter(card => {
        const columnOption = columnOptions[card.category];
        return columnOption !== 'Sideboard' && columnOption !== 'Starts in Extra';
      });
    }
    
    return allCards;
  }, [deck, columnOptions]);

  // Export functionality
  const generateExportText = useCallback(() => {
    const filteredCards = getFilteredCards(exportOptions.includeOutOfDeck);

    // Group cards by section if needed
    const sections: Record<string, DeckCardData[]> = {};
    
    if (exportOptions.sectionHeader === 'No section header') {
      sections[''] = filteredCards;
    } else if (exportOptions.sectionHeader === 'Primary category') {
      filteredCards.forEach(card => {
        const category = card.category;
        if (!sections[category]) sections[category] = [];
        sections[category].push(card);
      });
    } else if (exportOptions.sectionHeader === 'Card type') {
      filteredCards.forEach(card => {
        const cardType = card.card.type_line.split(' ')[0] || 'Other';
        if (!sections[cardType]) sections[cardType] = [];
        sections[cardType].push(card);
      });
    } else if (exportOptions.sectionHeader === 'Generic (eg: Commander, Mainboard, Sideboard)') {
      filteredCards.forEach(card => {
        const columnOption = columnOptions[card.category] || 'Starts in Deck';
        const section = columnOption === 'Sideboard' ? 'Sideboard' : 
                       columnOption === 'Starts in Extra' ? 'Extra' : 'Mainboard';
        if (!sections[section]) sections[section] = [];
        sections[section].push(card);
      });
    }

    // Generate export text
    let exportText = '';
    
    Object.keys(sections).forEach(sectionName => {
      if (sectionName && exportText) exportText += '\n';
      
      if (sectionName) {
        exportText += `\n// ${sectionName.charAt(0).toUpperCase() + sectionName.slice(1)}\n`;
      }
      
      sections[sectionName].forEach(card => {
        let line = '';
        
        // Quantity
        if (exportOptions.includeQuantity) {
          line += `${card.quantity}x `;
        }
        
        // Card name (use front face only for MDFC if enabled)
        const cardName = exportOptions.useFrontNameOnly && (card.card as any).card_faces?.[0]?.name 
          ? (card.card as any).card_faces[0].name 
          : card.card.name;
        line += cardName;
        
        // Set code
        if (exportOptions.includeSetCode && card.card.set) {
          line += ` (${card.card.set.toLowerCase()})`;
        }
        
        // Collector number
        if (exportOptions.includeCollectorNumber && card.card.collector_number) {
          line += ` ${card.card.collector_number}`;
        }
        
        // Foil indicator
        if (exportOptions.includeFoilIndicator) {
          line += ' *F*';
        }
        
        // Categories
        if (exportOptions.includeCategories) {
          line += ` [${card.category}]`;
        }
        
        // Color tag data (placeholder)
        if (exportOptions.includeColorTagData) {
          line += ' ^Buy,#0066ff^';
        }
        
        exportText += line + '\n';
      });
    });
    
    return exportText.trim();
  }, [getFilteredCards, exportOptions, columnOptions]);

  const handleExportCopy = useCallback(() => {
    const exportText = generateExportText();
    navigator.clipboard.writeText(exportText);
  }, [generateExportText]);

  const handleExportDownload = useCallback(() => {
    const exportText = generateExportText();
    const blob = new Blob([exportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${deck.name.replace(/[^a-zA-Z0-9]/g, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [generateExportText, deck.name]);

  const getSelectedCardCount = useCallback(() => {
    const filteredCards = getFilteredCards(exportOptions.includeOutOfDeck);
    const totalCards = filteredCards.reduce((sum, card) => sum + card.quantity, 0);
    const uniqueCards = filteredCards.length;
    
    return { total: totalCards, unique: uniqueCards };
  }, [getFilteredCards, exportOptions.includeOutOfDeck]);

  // Handle discarding draft
  const handleDiscardDraft = useCallback(() => {
    if (isDraftMode && currentDraft) {
      if (confirm('Are you sure you want to discard all changes? This cannot be undone.')) {
        DraftDeckStorage.deleteDraft(currentDraft.id);
        setHasUnsavedChanges(false);
        router.push('/deckbuilder'); // Navigate to fresh deck builder
      }
    }
  }, [isDraftMode, currentDraft, router]);

  // Global event handlers for document-level multi-select
  const globalMouseDownHandler = useCallback((e: MouseEvent) => {
    if (isViewMode || e.button !== 0) return;
    
    const target = e.target as HTMLElement;
    const isInteractive = target.closest('button, input, textarea, select, a, [role="button"], [tabindex]');
    
    if (!isInteractive) {
      startSelection(e as any);
    }
  }, [isViewMode, startSelection]);

  const globalClickHandler = useCallback((e: MouseEvent) => {
    if (!isViewMode) {
      handleContainerClick(e as any);
    }
  }, [isViewMode, handleContainerClick]);

  // Document-level event listeners for full-page multi-select
  useEffect(() => {
    document.addEventListener('mousedown', globalMouseDownHandler, { passive: false });
    document.addEventListener('click', globalClickHandler, { passive: true });

    return () => {
      document.removeEventListener('mousedown', globalMouseDownHandler);
      document.removeEventListener('click', globalClickHandler);
    };
  }, [globalMouseDownHandler, globalClickHandler]);

  return (
    <div className="min-h-screen bg-black text-white">
      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        {/* Selection Rectangle Overlay */}
        {isSelecting && selectionStart && selectionEnd && (() => {
          const rect = getSelectionRectangle();
          if (!rect || (rect.width < 5 && rect.height < 5)) return null;
          
          // Convert document coordinates back to viewport coordinates for display
          const scroll = getScrollOffset();
          
          return (
            <div
              className="fixed pointer-events-none z-[999] border-2 border-blue-500 bg-blue-500/20 select-none"
              style={{
                left: rect.left - scroll.x,
                top: rect.top - scroll.y,
                width: rect.width,
                height: rect.height,
                userSelect: 'none',
                WebkitUserSelect: 'none',
                MozUserSelect: 'none',
                msUserSelect: 'none'
              }}
            />
          );
        })()}
        <div className="max-w-[1400px] mx-auto px-6 py-4">
          {/* Search Bar - Hidden in view mode */}
          {!isViewMode && (
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
          )}

          {/* Search Results - Hidden in view mode */}
          {!isViewMode && (
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
          )}

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
                    className={`text-lg font-bold transition-colors ${
                      !isViewMode ? 'cursor-pointer hover:text-gray-300' : 'cursor-default'
                    }`}
                    onClick={!isViewMode ? handleStartEditingDeckName : undefined}
                    title={!isViewMode ? "Click to edit deck name" : undefined}
                  >
                  {deck.name} · {totalCards} cards{sideboardCards > 0 ? ` · ${sideboardCards} sideboard` : ''}{extraDeckCards > 0 ? ` · ${extraDeckCards} extra` : ''} · {totalDeckPrice > 0 ? `$${totalDeckPrice.toFixed(2)}` : '$0.00'}
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
                
                {!isViewMode && (
                  <>
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
                  </>
                )}
                {!isViewMode && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-white hover:text-gray-300"
                  onClick={() => setShowImportModal(true)}
                >
                  Import
                  <Download className="w-4 h-4 ml-1" />
                </Button>
                )}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-white hover:text-gray-300"
                  onClick={() => setShowExportModal(true)}
                >
                  Export
                  <Upload className="w-4 h-4 ml-1" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-white hover:text-gray-300"
                  onClick={() => router.push(`/playmat${deckId ? `?deckId=${deckId}` : ''}`)}
                >
                  Playtest
                  <Play className="w-4 h-4 ml-1" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-white hover:text-gray-300"
                  onClick={() => router.push(`/decks/${deckId}/stats`)}
                >
                  Details
                  <Info className="w-4 h-4 ml-1" />
                </Button>
                {isViewMode ? (
                  <Button 
                    variant="ghost"
                    size="sm" 
                    className="text-white hover:text-gray-300"
                    onClick={() => router.push(`/decks/${deckId}/edit`)}
                  >
                    Edit
                    <Save className="w-4 h-4 ml-1" />
                  </Button>
                ) : (
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
                )}
              </div>
            </div>
            <hr className="border-gray-600 mt-4" />
          </div>

                      {/* Deck Columns - Independent Column Positions */}
                          <div 
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 items-start select-none"
                style={{ userSelect: 'none', WebkitUserSelect: 'none', MozUserSelect: 'none', msUserSelect: 'none' }}
            >
              {(() => {
                // Build independent column stacks for each of the 6 positions
                const maxCol = 5; // 6 columns (0-5)
                
                // Group columns by column position
                const columnStacks: Record<number, string[]> = {};
                
                // Initialize empty stacks
                for (let col = 0; col <= maxCol; col++) {
                  columnStacks[col] = [];
                }
                
                // Populate stacks with columns
                const allColumns = [
                  ...baseColumns.filter(key => !deletedBaseColumns.has(key)),
                  ...Object.keys(customColumns)
                ];
                
                allColumns.forEach(columnKey => {
                  const position = columnPositions[columnKey];
                  if (position && position.col >= 0 && position.col <= maxCol) {
                    if (!columnStacks[position.col]) columnStacks[position.col] = [];
                    columnStacks[position.col].push(columnKey);
                  }
                });
                
                // Sort columns in each stack by row
                Object.keys(columnStacks).forEach(colKey => {
                  const col = parseInt(colKey);
                  columnStacks[col].sort((a, b) => {
                    const posA = columnPositions[a];
                    const posB = columnPositions[b];
                    return (posA?.row || 0) - (posB?.row || 0);
                  });
                });
                            
                // Render each column position as an independent stack
                return Array.from({ length: maxCol + 1 }, (_, colIndex) => (
                  <div key={colIndex} className="flex flex-col space-y-4">
                    {/* Render all columns in this column position */}
                    {columnStacks[colIndex].map(columnKey => (
                      <div key={columnKey} className="flex flex-col">
                          <DeckColumn
                          id={columnKey}
                          title={customColumns[columnKey] || CARD_CATEGORIES[columnKey as keyof typeof CARD_CATEGORIES] || 'Column'}
                          cards={deck[columnKey as keyof Omit<DeckState, 'name'>] || []}
                            onCardRemove={removeCardFromDeck}
                            onQuantityChange={updateCardQuantity}
                          onCardChange={changeCardFace}
                          onShowVariants={showCardVariants}
                          onShowPreview={handleCardPreview}
                            onColumnDelete={deleteColumn}
                            onColumnRename={renameColumn}
                            onColumnOptionChange={handleColumnOptionChange}
                          columnOption={columnOptions[columnKey] || 'Starts in Deck'}
                            activeId={activeId}
                            viewMode={viewMode}
                            isViewMode={isViewMode}
                            selectedCards={selectedCards}
                            onCardClick={handleCardClick}
                            activeHoverCard={activeHoverCard}
                            onHoverChange={setActiveHoverCard}
                          />
                      </div>
                    ))}
                    
                    {/* Plus button at the bottom of each column stack */}
                    {!isViewMode && (
                      <PlusButtonDropZone 
                        key={`plus-${colIndex}`}
                        colIndex={colIndex}
                        nextRow={columnStacks[colIndex].length > 0 ? 
                          Math.max(...columnStacks[colIndex].map(key => columnPositions[key]?.row || 0)) + 1 : 0}
                        onAddColumn={addNewColumnAt}
                        activeId={activeId}
                      />
                    )}
                        </div>
                ));
              })()}
            </div>
        </div>

        {/* Drag Overlay */}
        <DragOverlay dropAnimation={null}>
          {activeId && (() => {
            // Column drag overlay
            if (activeId.startsWith('column-')) {
              const columnId = activeId.replace('column-', '');
              const columnTitle = customColumns[columnId] || CARD_CATEGORIES[columnId as keyof typeof CARD_CATEGORIES] || 'Column';
              return (
                <div className="w-[220px] bg-black/80 border-2 border-blue-500 rounded-lg shadow-2xl opacity-90">
                  <div className="px-4 py-2 text-sm font-medium text-white bg-blue-900/80 rounded-t-lg border-b border-gray-600">
                    {columnTitle}
                  </div>
                  <div className="h-16 bg-black/80 rounded-b-lg flex items-center justify-center text-gray-400 text-sm">
                    Dragging column...
                  </div>
                </div>
              );
            }
            
            // Card drag overlay
            const isMultiSelectDrag = selectedCards.has(activeId) && selectedCards.size > 1;
            
            if (isMultiSelectDrag) {
              // Multi-select drag: show cards stacked exactly like in the deck columns
              const selectedDeckCards = Object.values(deck).flat().filter(c => Array.isArray(c) ? false : selectedCards.has(c.id));
              
              if (viewMode === 'visual') {
                // Visual mode: stack cards like in deck columns with proper offset
                const totalCards = selectedDeckCards.reduce((sum, card) => sum + card.quantity, 0);
                const stackHeight = Math.min(totalCards - 1, 10) * 60; // Max 10 cards visible in stack
                
                return (
                  <div className="relative" style={{ height: `${268 + stackHeight}px` }}>
                    {selectedDeckCards.map((deckCard, stackIndex) => {
                      const card = deckCard.card;
                      const imageUrl = card.image_uris?.normal || 
                                     (card as any).card_faces?.[0]?.image_uris?.normal;
                      
                      // Create multiple visual cards for quantity > 1
                      return Array.from({ length: deckCard.quantity }, (_, quantityIndex) => {
                        const cardIndex = stackIndex * deckCard.quantity + quantityIndex;
                        const yOffset = Math.min(cardIndex, 10) * 60; // Stack with 60px offset like in deck
                        const isTopCard = cardIndex === 0;
                        
                        return (
                          <div
                            key={`${deckCard.id}-${quantityIndex}`}
                            className="absolute w-48 aspect-[5/7] rounded-lg overflow-hidden transition-all duration-200 bg-gray-800 border border-gray-600"
                            style={{
                              top: `${yOffset}px`,
                              left: '0px',
                              zIndex: 1000 - cardIndex,
                              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
                            }}
                          >
                            {imageUrl ? (
                              <Image
                                src={imageUrl}
                                alt={card.name}
                                fill
                                className="object-cover rounded-lg"
                                sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                              />
                            ) : (
                              <div className="absolute inset-0 bg-gray-800 border border-gray-600 rounded-lg flex flex-col items-center justify-center p-2 text-center">
                                <p className="text-white text-xs font-medium mb-1 line-clamp-2">{card.name}</p>
                                <p className="text-gray-400 text-xs">{card.mana_cost || ''}</p>
                                <p className="text-gray-500 text-xs">{card.type_line}</p>
                              </div>
                            )}
                            
                            {/* Quantity Badge - only show on top card if quantity > 1 */}
                            {isTopCard && deckCard.quantity > 1 && (
                              <div className="absolute top-8 left-0 bg-gradient-to-r from-black to-transparent text-white text-xs font-bold rounded-r w-12 h-4 flex items-center justify-start pl-1 shadow-md z-30">
                                x{deckCard.quantity}
                              </div>
                            )}
                            
                            {/* Blue selection ring on all cards */}
                            <div className="absolute inset-0 ring-2 ring-blue-500 ring-opacity-75 rounded-lg pointer-events-none" />
                          </div>
                        );
                      });
                    })}
                  </div>
                );
              } else {
                // Text mode: show cards in a vertical list like in deck columns
                return (
                  <div className="w-80 space-y-2">
                    {selectedDeckCards.map((deckCard) => {
                      const card = deckCard.card;
                      
                      return (
                        <div
                          key={deckCard.id}
                          className="flex items-center justify-between w-full px-3 py-2 bg-black border border-blue-500 border-2 shadow-lg shadow-blue-500/50 rounded transition-colors"
                        >
                          {/* Left Side - Quantity and Card Name */}
                          <div className="flex items-center flex-1 min-w-0">
                            <div className="flex-shrink-0 mr-3">
                              <span className="text-gray-400 text-sm font-medium">
                                {deckCard.quantity}
                              </span>
                            </div>
                            
                            <div className="flex-1 min-w-0 overflow-hidden">
                              <span className="text-white text-sm font-medium truncate block">
                                {card.name}
                              </span>
                            </div>
                          </div>
                          
                          {/* Right Side - Mana Cost */}
                          <div className="flex-shrink-0 ml-3">
                            <span className="text-gray-300 text-sm font-mono">
                              {card.mana_cost || ''}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              }
            } else {
              // Single card drag
              const card = searchResults?.data.find(c => c.id === activeId.replace('search-', '')) ||
                          Object.values(deck).flat().find(c => Array.isArray(c) ? false : c.id === activeId)?.card;
              
              if (!card) return null;
              
              const imageUrl = card.image_uris?.normal || 
                             (card as any).card_faces?.[0]?.image_uris?.normal;
              
              return (
                <div className="relative w-48 aspect-[5/7] rounded-lg overflow-hidden shadow-2xl ring-2 ring-white opacity-90">
                  {imageUrl ? (
                    <Image
                      src={imageUrl}
                      alt={card.name}
                      fill
                      className="object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-800/80 border border-gray-600 rounded-lg flex flex-col items-center justify-center p-2 text-center">
                      <p className="text-white text-xs font-medium mb-1 line-clamp-2">{card.name}</p>
                      <p className="text-gray-400 text-xs">{card.mana_cost || ''}</p>
                    </div>
                  )}
                </div>
              );
            }
                     })()}
        </DragOverlay>
      </DndContext>



      {/* Preview Modal */}
      {showPreviewModal && previewCard && (
        <div 
          className="fixed inset-0 z-[99999] flex items-center justify-center"
          onMouseDown={(e) => e.stopPropagation()}
          onMouseUp={(e) => e.stopPropagation()}
          onMouseMove={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
          onPointerMove={(e) => e.stopPropagation()}
          style={{ pointerEvents: 'all' }}
        >
          {/* Blurred Background Overlay - Blocks all interactions */}
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            onClick={() => setShowPreviewModal(false)}
            style={{ pointerEvents: 'all' }}
          />
          
          {/* Modal Content */}
          <div 
            className="relative z-10 flex items-center justify-center w-full h-full p-8"
            onClick={() => setShowPreviewModal(false)}
            style={{ pointerEvents: 'all' }}
          >
            {/* Close Button - moved to bottom center */}
            <button
              onClick={() => setShowPreviewModal(false)}
              className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20 px-4 py-2 text-white hover:text-gray-300 rounded-lg transition-colors"
            >
              Close
            </button>
            
            <div className="flex items-center justify-center gap-8 max-w-7xl w-full">
              {/* Giant Card Image with 3D Foil */}
              <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                {(() => {
                  const cardFaces = (previewCard as any).card_faces;
                  const isDoubleFaced = cardFaces && cardFaces.length >= 2;
                  const currentFace = isDoubleFaced ? cardFaces[previewFaceIndex] : previewCard;
                  const imageUrl = currentFace.image_uris?.normal || previewCard.image_uris?.normal;
                  
                  return (
                    <div className="relative">
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
                        <FoilCard3D
                          card={{
                            name: currentFace.name || previewCard.name,
                            imageUrl: imageUrl
                          }}
                          width={700}
                          height={980}
                        />
                      ) : (
                        <div className="w-96 lg:w-[500px] aspect-[5/7] bg-gray-800 border border-gray-600 rounded-lg flex flex-col items-center justify-center p-6 text-center">
                          <p className="text-white text-2xl font-medium mb-3">{currentFace.name || previewCard.name}</p>
                          <p className="text-gray-400 text-xl mb-3">{currentFace.mana_cost || previewCard.mana_cost || ''}</p>
                          <p className="text-gray-500 text-lg">{currentFace.type_line || previewCard.type_line}</p>
                          {(currentFace.oracle_text || previewCard.oracle_text) && (
                            <p className="text-gray-300 text-base mt-6 leading-relaxed">{currentFace.oracle_text || previewCard.oracle_text}</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}
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

      {/* Export Modal */}
      <Dialog open={showExportModal} onOpenChange={setShowExportModal}>
        <DialogContent className="bg-black border-gray-600 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Export {deck.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Select cards by */}
            <div>
              <label className="block text-sm font-medium mb-2">Select cards by</label>
              <select 
                value={exportOptions.selectBy}
                onChange={(e) => setExportOptions(prev => ({ ...prev, selectBy: e.target.value }))}
                className="w-full px-3 py-2 bg-black border border-gray-600 rounded text-white"
              >
                <option value="All cards">All cards</option>
                <option value="Color tags">Color tags</option>
                <option value="Categories">Categories</option>
                <option value="Collection status">Collection status</option>
              </select>
            </div>

            {/* Include out of deck cards */}
            <div className="flex items-center space-x-2">
              <input 
                type="checkbox" 
                id="includeOutOfDeck"
                checked={exportOptions.includeOutOfDeck}
                onChange={(e) => setExportOptions(prev => ({ ...prev, includeOutOfDeck: e.target.checked }))}
                className="w-4 h-4"
              />
              <label htmlFor="includeOutOfDeck" className="text-sm">Include out of deck cards (eg: maybeboard)</label>
            </div>

            {/* Selected cards count */}
            <div className="text-sm text-gray-400">
              Selected cards: {getSelectedCardCount().total} ({getSelectedCardCount().unique} unique cards)
            </div>

            {/* Export type */}
            <div>
              <label className="block text-sm font-medium mb-2">Export type</label>
              <select 
                value={exportOptions.exportType}
                onChange={(e) => setExportOptions(prev => ({ ...prev, exportType: e.target.value }))}
                className="w-full px-3 py-2 bg-black border border-gray-600 rounded text-white"
              >
                <option value="Text">Text</option>
                <option value="CSV">CSV</option>
                <option value="Arena">Arena</option>
                <option value="MTGO.dek">MTGO.dek</option>
                <option value="Deck Registration PDF">Deck Registration PDF</option>
                <option value="EDHREC Article">EDHREC Article</option>
              </select>
            </div>

            {/* Export options */}
            <div>
              <label className="block text-sm font-medium mb-2">Export options</label>
              <select 
                value={exportOptions.exportFormat}
                onChange={(e) => setExportOptions(prev => ({ ...prev, exportFormat: e.target.value }))}
                className="w-full px-3 py-2 bg-black border border-gray-600 rounded text-white mb-2"
              >
                <option value="1x Example Card (set) 123 *F* [Example category] ^Buy,#0066ff^">1x Example Card (set) 123 *F* [Example category] ^Buy,#0066ff^</option>
              </select>

              {/* Check all / Uncheck all */}
              <div className="flex items-center space-x-4 mb-3">
                <label className="flex items-center space-x-2">
                  <input 
                    type="radio" 
                    name="checkOptions"
                    onChange={() => setExportOptions(prev => ({ 
                      ...prev, 
                      includeQuantity: true,
                      includeSetCode: true,
                      includeCollectorNumber: true,
                      includeFoilIndicator: true,
                      includeCategories: true,
                      includeColorTagData: true
                    }))}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Check all</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input 
                    type="radio" 
                    name="checkOptions"
                    onChange={() => setExportOptions(prev => ({ 
                      ...prev, 
                      includeQuantity: false,
                      includeSetCode: false,
                      includeCollectorNumber: false,
                      includeFoilIndicator: false,
                      includeCategories: false,
                      includeColorTagData: false
                    }))}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Uncheck all</span>
                </label>
              </div>

              {/* Individual checkboxes */}
              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input 
                    type="checkbox" 
                    checked={exportOptions.includeQuantity}
                    onChange={(e) => setExportOptions(prev => ({ ...prev, includeQuantity: e.target.checked }))}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Include x in quantity</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input 
                    type="checkbox" 
                    checked={exportOptions.includeSetCode}
                    onChange={(e) => setExportOptions(prev => ({ ...prev, includeSetCode: e.target.checked }))}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Include set code</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input 
                    type="checkbox" 
                    checked={exportOptions.includeCollectorNumber}
                    onChange={(e) => setExportOptions(prev => ({ ...prev, includeCollectorNumber: e.target.checked }))}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Include collector number</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input 
                    type="checkbox" 
                    checked={exportOptions.includeFoilIndicator}
                    onChange={(e) => setExportOptions(prev => ({ ...prev, includeFoilIndicator: e.target.checked }))}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Include foil indicator</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input 
                    type="checkbox" 
                    checked={exportOptions.includeCategories}
                    onChange={(e) => setExportOptions(prev => ({ ...prev, includeCategories: e.target.checked }))}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Include categories</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input 
                    type="checkbox" 
                    checked={exportOptions.includeColorTagData}
                    onChange={(e) => setExportOptions(prev => ({ ...prev, includeColorTagData: e.target.checked }))}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Include color tag data</span>
                </label>
              </div>
            </div>

            {/* Section header */}
            <div>
              <label className="block text-sm font-medium mb-2">Section header</label>
              <select 
                value={exportOptions.sectionHeader}
                onChange={(e) => setExportOptions(prev => ({ ...prev, sectionHeader: e.target.value }))}
                className="w-full px-3 py-2 bg-black border border-gray-600 rounded text-white"
              >
                <option value="No section header">No section header</option>
                <option value="Primary category">Primary category</option>
                <option value="Card type">Card type</option>
                <option value="Generic (eg: Commander, Mainboard, Sideboard)">Generic (eg: Commander, Mainboard, Sideboard)</option>
              </select>
            </div>

            {/* Use front name only for MDFC cards */}
            <div className="flex items-center space-x-2">
              <input 
                type="checkbox" 
                id="useFrontNameOnly"
                checked={exportOptions.useFrontNameOnly}
                onChange={(e) => setExportOptions(prev => ({ ...prev, useFrontNameOnly: e.target.checked }))}
                className="w-4 h-4"
              />
              <label htmlFor="useFrontNameOnly" className="text-sm">Use front name only for MDFC cards</label>
            </div>

            {/* Export example */}
            <div>
              <label className="block text-sm font-medium mb-2">Export example</label>
              <div className="bg-gray-800 border border-gray-600 rounded p-3 text-sm text-gray-300 max-h-32 overflow-y-auto">
                <pre className="whitespace-pre-wrap">{generateExportText()}</pre>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex justify-end space-x-2">
              <Button
                variant="ghost"
                onClick={() => setShowExportModal(false)}
                className="text-gray-400 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                onClick={handleExportCopy}
                variant="ghost"
                className="text-white hover:text-gray-300"
              >
                Copy
              </Button>
              <Button
                onClick={handleExportDownload}
                variant="ghost"
                className="text-white hover:text-gray-300 bg-green-600 hover:bg-green-700"
              >
                Download
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 