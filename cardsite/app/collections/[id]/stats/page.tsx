import { CollectionStatsView } from '@/components/mtg/collection-stats-view';

interface CollectionStatsPageProps {
  params: Promise<{ id: string }>;
}

export default async function CollectionStatsPage({ params }: CollectionStatsPageProps) {
  const { id } = await params;
  
  return <CollectionStatsView collectionId={id} />;
} 