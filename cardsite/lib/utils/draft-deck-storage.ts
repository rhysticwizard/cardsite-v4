export interface DraftCard {
  scryfallId: string;
  name: string;
  quantity: number;
  category: string;
  // Store minimal card data for the draft
  manaCost?: string;
  typeLine?: string;
  imageUris?: { normal?: string };
}

export interface DraftDeck {
  id: string; // Temporary ID for localStorage (timestamp-based)
  name: string;
  description: string;
  format: string;
  isPublic: boolean;
  cards: DraftCard[];
  customColumns: Record<string, string>;
  columnOptions?: Record<string, string>;
  lastModified: number;
  created: number;
}

const DRAFT_KEY_PREFIX = 'cardsite-draft-deck-';
const MAX_DRAFTS = 1; // Keep only the current draft

export class DraftDeckStorage {
  
  /**
   * Create a new draft deck
   */
  static createDraft(): DraftDeck {
    const now = Date.now();
    const draft: DraftDeck = {
      id: `draft-${now}`,
      name: 'Untitled Deck',
      description: '',
      format: 'standard',
      isPublic: false,
      cards: [],
      customColumns: {},
      lastModified: now,
      created: now,
    };
    
    this.saveDraft(draft);
    return draft;
  }

  /**
   * Save draft to localStorage
   */
  static saveDraft(draft: DraftDeck): void {
    try {
      draft.lastModified = Date.now();
      const key = `${DRAFT_KEY_PREFIX}${draft.id}`;
      localStorage.setItem(key, JSON.stringify(draft));
      
      // Cleanup old drafts
      this.cleanupOldDrafts();
    } catch (error) {
      console.error('Failed to save draft:', error);
    }
  }

  /**
   * Load a specific draft
   */
  static loadDraft(draftId: string): DraftDeck | null {
    try {
      const key = `${DRAFT_KEY_PREFIX}${draftId}`;
      const stored = localStorage.getItem(key);
      if (!stored) return null;
      
      const draft = JSON.parse(stored) as DraftDeck;
      return draft;
    } catch (error) {
      console.error('Failed to load draft:', error);
      return null;
    }
  }

  /**
   * Get all available drafts
   */
  static getAllDrafts(): DraftDeck[] {
    const drafts: DraftDeck[] = [];
    
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(DRAFT_KEY_PREFIX)) {
          const stored = localStorage.getItem(key);
          if (stored) {
            const draft = JSON.parse(stored) as DraftDeck;
            drafts.push(draft);
          }
        }
      }
      
      // Sort by last modified (newest first)
      return drafts.sort((a, b) => b.lastModified - a.lastModified);
    } catch (error) {
      console.error('Failed to load drafts:', error);
      return [];
    }
  }

  /**
   * Delete a draft
   */
  static deleteDraft(draftId: string): void {
    try {
      const key = `${DRAFT_KEY_PREFIX}${draftId}`;
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Failed to delete draft:', error);
    }
  }

  /**
   * Check if there are any unsaved drafts
   */
  static hasUnsavedDrafts(): boolean {
    return this.getAllDrafts().length > 0;
  }

  /**
   * Get the most recent draft
   */
  static getMostRecentDraft(): DraftDeck | null {
    const drafts = this.getAllDrafts();
    return drafts.length > 0 ? drafts[0] : null;
  }

  /**
   * Auto-save functionality - call this when deck changes
   */
  static autoSave(draft: DraftDeck): void {
    // Debounce auto-save to avoid excessive localStorage writes
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }
    
    this.autoSaveTimeout = setTimeout(() => {
      this.saveDraft(draft);
    }, 1000); // Auto-save after 1 second of inactivity
  }

  private static autoSaveTimeout: NodeJS.Timeout | null = null;

  /**
   * Cleanup old drafts to prevent localStorage bloat
   */
  private static cleanupOldDrafts(): void {
    const drafts = this.getAllDrafts();
    
    // Keep only the most recent MAX_DRAFTS
    if (drafts.length > MAX_DRAFTS) {
      const toDelete = drafts.slice(MAX_DRAFTS);
      toDelete.forEach(draft => this.deleteDraft(draft.id));
    }
  }

  /**
   * Convert draft to format suitable for API save
   */
  static convertDraftToApiFormat(draft: DraftDeck) {
    return {
      name: draft.name,
      description: draft.description,
      format: draft.format,
      isPublic: draft.isPublic,
      cards: draft.cards.map(card => ({
        cardId: card.scryfallId,
        quantity: card.quantity,
        category: card.category,
      })),
      customColumns: draft.customColumns,
    };
  }
} 