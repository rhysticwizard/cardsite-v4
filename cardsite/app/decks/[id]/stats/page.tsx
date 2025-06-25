import { DeckStatsView } from '@/components/mtg/deck-stats-view';

interface DeckStatsPageProps {
  params: Promise<{ id: string }>;
}

export default async function DeckStatsPage({ params }: DeckStatsPageProps) {
  const { id } = await params;
  
  return <DeckStatsView deckId={id} />;
} 