import { DeckBuilderClient } from '@/components/mtg/deck-builder-client'

interface EditDeckPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function EditDeckPage({ params }: EditDeckPageProps) {
  const resolvedParams = await params;
  const deckId = resolvedParams.id  // Use string ID directly (no parseInt needed)
  
  return (
    <div className="container mx-auto py-6">
      <DeckBuilderClient isViewMode={false} deckId={deckId} />
    </div>
  )
} 