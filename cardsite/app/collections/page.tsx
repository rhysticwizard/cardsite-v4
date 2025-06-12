'use client';

import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default function CollectionsPage() {
  return (
    <>
      {/* Header with Create New Collection button */}
      <div className="max-w-6xl mx-auto px-6 pb-8">
        <div className="flex justify-end mb-8">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white font-medium">
            <Plus className="w-4 h-4 mr-2" />
            Create New Collection
          </Button>
        </div>

        {/* Empty State */}
        <div className="bg-gray-800 rounded-lg p-16 text-center">
          <p className="text-gray-300 text-lg mb-6">
            You haven't created any collections yet.
          </p>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white font-medium">
            <Plus className="w-4 h-4 mr-2" />
            Create Your First Collection
          </Button>
        </div>
      </div>
    </>
  );
} 