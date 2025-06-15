'use client';

import React from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { User, Settings, Archive, Trophy, Calendar, MapPin } from 'lucide-react';
import { redirect } from 'next/navigation';

export default function ProfilePage() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!session) {
    redirect('/auth/signin');
  }

  return (
    <div className="max-w-6xl mx-auto px-6 pb-8 space-y-6">
        {/* Header Profile Section */}
        <Card className="bg-gray-900/95 border-gray-800">
          <CardHeader>
            <div className="flex items-start space-x-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={session.user.image || ''} alt={session.user.name || ''} />
                <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-600 text-white text-2xl">
                  {session.user.name?.charAt(0) || session.user.email?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <CardTitle className="text-2xl text-white mb-2">
                  {session.user.name || 'MTG Player'}
                </CardTitle>
                <CardDescription className="text-gray-400 mb-4">
                  {session.user.email}
                </CardDescription>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="bg-blue-900/50 text-blue-300 border-blue-700">
                    <User className="w-3 h-3 mr-1" />
                    Planeswalker
                  </Badge>
                  <Badge variant="secondary" className="bg-green-900/50 text-green-300 border-green-700">
                    <Calendar className="w-3 h-3 mr-1" />
                    Joined {new Date(session.user.id || Date.now()).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </Badge>
                </div>
              </div>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Settings className="w-4 h-4 mr-2" />
                Edit Profile
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Profile Content Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-gray-800 border-gray-700">
            <TabsTrigger value="overview" className="text-gray-300 data-[state=active]:text-white">
              Overview
            </TabsTrigger>
            <TabsTrigger value="collection" className="text-gray-300 data-[state=active]:text-white">
              Collection
            </TabsTrigger>
            <TabsTrigger value="decks" className="text-gray-300 data-[state=active]:text-white">
              Decks
            </TabsTrigger>
            <TabsTrigger value="activity" className="text-gray-300 data-[state=active]:text-white">
              Activity
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
              {/* Collection Stats */}
              <Card className="bg-gray-900/95 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Archive className="w-5 h-5 mr-2 text-blue-400" />
                    Collection
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Total Cards</span>
                      <span className="text-white font-semibold">1,247</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Unique Cards</span>
                      <span className="text-white font-semibold">892</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Total Value</span>
                      <span className="text-green-400 font-semibold">$2,340</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Deck Stats */}
              <Card className="bg-gray-900/95 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Trophy className="w-5 h-5 mr-2 text-purple-400" />
                    Decks
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Total Decks</span>
                      <span className="text-white font-semibold">12</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Standard</span>
                      <span className="text-white font-semibold">4</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Commander</span>
                      <span className="text-white font-semibold">8</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Preferences */}
              <Card className="bg-gray-900/95 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <MapPin className="w-5 h-5 mr-2 text-red-400" />
                    Preferences
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <span className="text-gray-400 text-sm">Favorite Format</span>
                      <div className="mt-1">
                        <Badge className="bg-purple-900/50 text-purple-300 border-purple-700">
                          Commander
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-400 text-sm">Arena Username</span>
                      <p className="text-white mt-1">Not set</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="collection" className="space-y-6">
            <Card className="bg-gray-900/95 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white">Your Collection</CardTitle>
                <CardDescription className="text-gray-400">
                  Manage your Magic: The Gathering card collection
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Archive className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400 mb-4">Your collection will appear here</p>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    Add Cards to Collection
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="decks" className="space-y-6">
            <Card className="bg-gray-900/95 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white">Your Decks</CardTitle>
                <CardDescription className="text-gray-400">
                  Build and manage your competitive decks
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Trophy className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400 mb-4">Start building your first deck</p>
                  <Link href="/deckbuilder">
                  <Button className="bg-purple-600 hover:bg-purple-700">
                    Create New Deck
                  </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity" className="space-y-6">
            <Card className="bg-gray-900/95 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white">Recent Activity</CardTitle>
                <CardDescription className="text-gray-400">
                  Your recent trades, deck builds, and collection updates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No recent activity</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
    </div>
  );
} 