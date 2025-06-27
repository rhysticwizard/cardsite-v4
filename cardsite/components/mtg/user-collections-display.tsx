'use client';

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Calendar, User, Trash2, Edit, Info, Play } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { secureApiRequest } from '@/lib/csrf';

interface Collection {
  id: string;
  name: string;
  description: string;
  format: string;
  isPublic: boolean;
  cardCount: number;
  createdAt: string;
  updatedAt: string;
  thumbnailImage?: {
    small: string;
    normal: string;
    large: string;
    png: string;
    art_crop: string;
    border_crop: string;
  } | null;
  thumbnailCardName?: string | null;
}

interface UserCollectionsResponse {
  success: boolean;
  collections: Collection[];
}

async function fetchUserCollections(): Promise<UserCollectionsResponse> {
  const response = await secureApiRequest('/api/collections');
  if (!response.ok) {
    throw new Error('Failed to fetch collections');
  }
  return response.json();
}

async function deleteCollection(collectionId: string): Promise<void> {
  const response = await secureApiRequest(`/api/collections/${collectionId}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to delete collection');
  }
}

export function UserCollectionsDisplay() {
  const { data: session, status } = useSession();
  const queryClient = useQueryClient();
  const router = useRouter();
  
  const { data: collectionsData, isLoading, error, refetch } = useQuery({
    queryKey: ['user-collections'],
    queryFn: fetchUserCollections,
    enabled: !!session?.user,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCollection,
    onSuccess: () => {
      // Refresh the collections list
      queryClient.invalidateQueries({ queryKey: ['user-collections'] });
    },
    onError: (error) => {
      console.error('Failed to delete collection:', error);
      alert('Failed to delete collection. Please try again.');
    },
  });

  const handleDeleteCollection = (collectionId: string, collectionName: string) => {
    if (confirm(`Are you sure you want to delete "${collectionName}"? This action cannot be undone.`)) {
      deleteMutation.mutate(collectionId);
    }
  };

  // Show loading state
  if (status === 'loading' || isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
        {Array(5).fill(null).map((_, index) => (
          <div key={index} className="relative group">
            <Card className="bg-gray-900 border-gray-800 animate-pulse p-0 overflow-hidden">
              {/* Image skeleton */}
              <div className="aspect-[4/3] bg-gray-700"></div>
              
              {/* Bottom overlay skeleton */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                <div className="h-4 bg-gray-600 rounded mb-1"></div>
                <div className="h-3 bg-gray-600 rounded w-2/3"></div>
              </div>
            </Card>
          </div>
        ))}
      </div>
    );
  }

  // Show sign-in prompt if not authenticated
  if (!session?.user) {
    return (
      <div className="text-center py-12">
        <div className="mb-4">
          <User className="w-16 h-16 mx-auto text-gray-400" />
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">Sign in to view your collections</h3>
        <p className="text-gray-400 mb-6">Create an account or sign in to save and manage your collection.</p>
        <Link href="/auth/signin">
          <Button className="bg-white text-black hover:bg-gray-200">
            Sign In
          </Button>
        </Link>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="text-center py-12">
        <div className="mb-4">
          <div className="w-16 h-16 mx-auto bg-red-600 rounded-full flex items-center justify-center">
            <span className="text-white text-2xl">!</span>
          </div>
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">Failed to load collections</h3>
        <p className="text-gray-400 mb-6">There was an error loading your collections.</p>
        <Button 
          onClick={() => refetch()} 
          variant="outline"
          className="border-gray-600 text-white hover:bg-gray-800"
        >
          Try Again
        </Button>
      </div>
    );
  }

  const collections = collectionsData?.collections || [];

  // Show empty state
  if (collections.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mb-4">
          <div className="w-16 h-16 mx-auto bg-gray-700 rounded-lg flex items-center justify-center">
            <Plus className="w-8 h-8 text-gray-400" />
          </div>
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">No collections yet</h3>
        <p className="text-gray-400 mb-6">Start building your first collection to see it here.</p>
        <Link href="/collections">
          <Button className="bg-white text-black hover:bg-gray-200">
            <Plus className="w-4 h-4 mr-2" />
            Create Your First Collection
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
      {collections.map((collection) => (
        <div key={collection.id} className="relative group">
          <Card className="bg-gray-900 border-gray-800 hover:border-gray-700 transition-all duration-200 cursor-pointer group p-0 overflow-hidden relative">
            {/* Card Image */}
              {collection.thumbnailImage?.art_crop ? (
                <Image 
                  src={collection.thumbnailImage.art_crop} 
                  alt={collection.thumbnailCardName || collection.name}
                  width={280}
                  height={200}
                className="aspect-[4/3] w-full object-cover"
                unoptimized
                />
              ) : (
              <div className="aspect-[4/3] bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-400 mb-1">{collection.name.charAt(0)}</div>
                  <div className="text-xs text-gray-500">{collection.format}</div>
                </div>
              </div>
            )}
            
            {/* Top gradient overlay on hover with action buttons - matches deckbuilder cards */}
            <div className="absolute top-0 left-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20">
              <div className="bg-gradient-to-b from-black via-black/80 to-transparent rounded-t-lg h-12 flex items-center justify-evenly px-2 py-2">
                {/* Info button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/collections/${collection.id}/stats`);
                  }}
                  className="w-6 h-6 p-0 hover:bg-gray-700 text-white hover:text-white rounded flex items-center justify-center transition-colors"
                  title="View Collection Stats"
                >
                  <Info className="w-4 h-4" />
                </button>

                {/* Edit button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/collections/${collection.id}/edit`);
                  }}
                  className="w-6 h-6 p-0 hover:bg-gray-700 text-white hover:text-white rounded flex items-center justify-center transition-colors"
                  title="Edit Collection"
                >
                  <Edit className="w-4 h-4" />
                </button>
                
                {/* Delete button */}
                <button
            onClick={(e) => {
              e.stopPropagation();
                    handleDeleteCollection(collection.id, collection.name);
            }}
                  className="w-6 h-6 p-0 hover:bg-red-600 text-white hover:text-white rounded flex items-center justify-center transition-colors"
                  title="Delete Collection"
          >
            <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            {/* Collection Info Overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
              <h3 className="text-white font-semibold text-sm truncate">{collection.name}</h3>
              <p className="text-gray-300 text-xs">{collection.cardCount} cards • {collection.format}</p>
            </div>
          </Card>
        </div>
      ))}
      
      {/* Add new collection card */}
      <Link href="/collections">
        <Card className="bg-gray-900 border-gray-800 hover:border-gray-600 transition-colors cursor-pointer border-dashed p-0 overflow-hidden">
          <div className="aspect-[4/3] bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
            <div className="text-center">
              <Plus className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <span className="text-sm text-gray-400">Create New Collection</span>
            </div>
          </div>
        </Card>
      </Link>
    </div>
  );
} 