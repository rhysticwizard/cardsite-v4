import { DeckBuilderClient } from '@/components/mtg/deck-builder-client'

interface EditDeckPageProps {
  params: {
    id: string
  }
}

export default function EditDeckPage({ params }: EditDeckPageProps) {
  const deckId = params.id  // Use string ID directly (no parseInt needed)
  
  return (
    <div className="container mx-auto py-6">
      <DeckBuilderClient isViewMode={false} deckId={deckId} />
    </div>
  )
} 