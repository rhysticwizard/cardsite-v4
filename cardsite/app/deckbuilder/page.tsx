'use client';

import { DeckBuilderClient } from '@/components/mtg/deck-builder-client'
import { DraftDeckStorage } from '@/lib/utils/draft-deck-storage'
import { useEffect, useState } from 'react'

export default function DeckBuilderPage() {
  const [draftId, setDraftId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Use a fixed draft ID for cleaner URLs - no URL changes
    const CURRENT_DRAFT_ID = 'current-draft'
    
    // Check if we have a current draft
    const existingDraft = DraftDeckStorage.loadDraft(CURRENT_DRAFT_ID)
    
    if (existingDraft) {
      // Continue with existing draft
      setDraftId(CURRENT_DRAFT_ID)
    } else {
      // Create a new draft with the fixed ID
      const newDraft = DraftDeckStorage.createDraft()
      // Store it with our fixed ID instead of the generated one
      DraftDeckStorage.deleteDraft(newDraft.id) // Remove the auto-generated one
      const fixedDraft = { ...newDraft, id: CURRENT_DRAFT_ID }
      DraftDeckStorage.saveDraft(fixedDraft)
      setDraftId(CURRENT_DRAFT_ID)
    }
    
    setIsLoading(false)
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading deck builder...</p>
        </div>
      </div>
    )
  }

  return (
    <DeckBuilderClient 
      isDraftMode={true}
      draftId={draftId || undefined}
    />
  )
} 