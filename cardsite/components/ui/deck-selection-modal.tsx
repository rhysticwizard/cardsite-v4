'use client';

import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

export interface UserDeck {
  id: string;
  name: string;
  format: string;
  cardCount: number;
  thumbnailImage?: any;
  thumbnailCardName?: string;
}

interface DeckSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  userDecks: UserDeck[];
  decksLoading: boolean;
  onDeckSelect: (deckId: string) => void;
  onWithoutDeck: () => void;
  onCancel: () => void;
  onBack?: () => void;
  withoutDeckLabel?: string;
}

export function DeckSelectionModal({
  open,
  onOpenChange,
  title,
  description,
  userDecks,
  decksLoading,
  onDeckSelect,
  onWithoutDeck,
  onCancel,
  onBack,
  withoutDeckLabel = "Join Without Deck"
}: DeckSelectionModalProps) {
  const router = useRouter();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-gray-700 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-white">{title}</DialogTitle>
          <DialogDescription className="text-gray-400">
            {description}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {decksLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-400">Loading your decks...</span>
            </div>
          ) : userDecks.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400 mb-4">You don't have any decks yet.</p>
              <Button 
                onClick={() => router.push('/deckbuilder')}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Build Your First Deck
              </Button>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto space-y-2">
              {userDecks.map((deck) => (
                <div
                  key={deck.id}
                  className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-colors cursor-pointer"
                  onClick={() => onDeckSelect(deck.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      {deck.thumbnailImage?.normal && (
                        <img
                          src={deck.thumbnailImage.normal}
                          alt={deck.thumbnailCardName || 'Deck thumbnail'}
                          className="w-12 h-16 object-cover rounded"
                        />
                      )}
                      <div>
                        <h3 className="text-white font-medium">{deck.name}</h3>
                        <div className="flex items-center space-x-2 text-sm">
                          <span className={`px-2 py-1 rounded text-xs capitalize ${
                            deck.format === 'commander' ? 'bg-green-900 text-green-300' :
                            deck.format === 'modern' ? 'bg-blue-900 text-blue-300' :
                            'bg-gray-700 text-gray-300'
                          }`}>
                            {deck.format}
                          </span>
                          <span className="text-gray-400">
                            {deck.cardCount} cards
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Select
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-between items-center pt-4 border-t border-gray-700">
            <Button 
              variant="outline" 
              onClick={onWithoutDeck}
              className="border-gray-600 text-gray-300"
            >
              {withoutDeckLabel}
            </Button>
            <div className="flex space-x-2">
              {onBack && (
                <Button 
                  variant="outline" 
                  onClick={onBack}
                  className="border-gray-600 text-gray-300"
                >
                  Back
                </Button>
              )}
              <Button 
                variant="outline" 
                onClick={onCancel}
                className="border-gray-600 text-gray-300"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 