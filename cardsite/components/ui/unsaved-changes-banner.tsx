'use client';

import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Save, X, AlertTriangle } from 'lucide-react';

interface UnsavedChangesBannerProps {
  show: boolean;
  onSave: () => void;
  onDiscard: () => void;
  isSaving?: boolean;
  lastModified?: number;
}

export function UnsavedChangesBanner({ 
  show, 
  onSave, 
  onDiscard, 
  isSaving = false,
  lastModified 
}: UnsavedChangesBannerProps) {
  if (!show) return null;

  const formatLastModified = (timestamp?: number) => {
    if (!timestamp) return '';
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} minutes ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
    return `${Math.floor(diff / 86400000)} days ago`;
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-600/90 backdrop-blur-sm border-b border-yellow-500">
      <div className="container mx-auto px-4 py-3">
        <Alert className="bg-transparent border-none p-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-100" />
              <AlertDescription className="text-yellow-100 font-medium">
                You have unsaved changes to your deck.
                {lastModified && (
                  <span className="text-yellow-200 ml-2 text-sm">
                    Last modified {formatLastModified(lastModified)}
                  </span>
                )}
              </AlertDescription>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                onClick={onSave}
                disabled={isSaving}
                size="sm"
                className="bg-yellow-700 hover:bg-yellow-800 text-yellow-100 border-yellow-600"
              >
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save Deck'}
              </Button>
              
              <Button
                onClick={onDiscard}
                disabled={isSaving}
                variant="ghost"
                size="sm"
                className="text-yellow-100 hover:bg-yellow-700/50"
              >
                <X className="w-4 h-4 mr-2" />
                Discard
              </Button>
            </div>
          </div>
        </Alert>
      </div>
    </div>
  );
} 