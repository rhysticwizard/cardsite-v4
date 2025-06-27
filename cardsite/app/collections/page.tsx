'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { UserCollectionsDisplay } from '@/components/mtg/user-collections-display';

export default function CollectionsPage() {
  const topStandardCollections = Array(8).fill(null);
  const trendingCommanderCollections = Array(4).fill(null);
  const popularThemeCollections = Array(4).fill(null);

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto px-6 py-8">
        
        {/* Your Collections Section */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-800">
            <div className="flex items-center space-x-3">
              <h2 className="text-xl font-bold">Your Collections</h2>
            </div>
            <Link href="/collections?view=all" className="text-gray-400 hover:text-white transition-colors text-sm">
              View all →
            </Link>
          </div>
          
          <UserCollectionsDisplay />
        </div>

        {/* Top 8 Standard Collections */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-800">
            <div className="flex items-center space-x-3">
              <h2 className="text-xl font-bold">Top 8 Standard Collections</h2>
            </div>
            <Link href="/collections/standard" className="text-gray-400 hover:text-white transition-colors text-sm">
              View more →
            </Link>
          </div>
          
          <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-12 gap-2">
            {topStandardCollections.map((_, index) => (
              <Card key={index} className="bg-gray-900 border-gray-800 overflow-hidden cursor-pointer hover:border-gray-700 transition-colors w-16 h-16">
              </Card>
            ))}
          </div>
        </div>

        {/* Trending Commander Collections */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-800">
            <div className="flex items-center space-x-3">
              <h2 className="text-xl font-bold">Trending Commander Collections</h2>
            </div>
            <Link href="/collections/commander" className="text-gray-400 hover:text-white transition-colors text-sm">
              View more →
            </Link>
          </div>
          
          <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-12 gap-2">
            {trendingCommanderCollections.map((_, index) => (
              <Card key={index} className="bg-gray-900 border-gray-800 overflow-hidden cursor-pointer hover:border-gray-700 transition-colors w-16 h-16">
              </Card>
            ))}
          </div>
        </div>

        {/* Popular Theme Collections */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-800">
            <div className="flex items-center space-x-3">
              <h2 className="text-xl font-bold">Popular Theme Collections</h2>
            </div>
            <Link href="/collections/themes" className="text-gray-400 hover:text-white transition-colors text-sm">
              View more →
            </Link>
          </div>
          
          <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-12 gap-2">
            {popularThemeCollections.map((_, index) => (
              <Card key={index} className="bg-gray-900 border-gray-800 overflow-hidden cursor-pointer hover:border-gray-700 transition-colors w-16 h-16">
              </Card>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
} 