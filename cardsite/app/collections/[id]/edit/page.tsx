import { CollectionBuilderClient } from '@/components/mtg/collection-builder-client'

interface EditCollectionPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function EditCollectionPage({ params }: EditCollectionPageProps) {
  const resolvedParams = await params;
  const collectionId = resolvedParams.id  // Use string ID directly (no parseInt needed)
  
  return (
    <div className="container mx-auto py-6">
      <CollectionBuilderClient isViewMode={false} collectionId={collectionId} />
    </div>
  )
} 