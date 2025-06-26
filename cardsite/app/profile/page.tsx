'use client';

import React from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { User, Settings, Archive, Trophy, Calendar, MapPin, Users, UserPlus, Search, X } from 'lucide-react';
import { redirect } from 'next/navigation';

interface User {
  id: string;
  name: string | null;
  username: string | null;
  email: string;
  image: string | null;
  friendRequestStatus?: string | null;
}

interface Friend extends User {
  status: 'online' | 'offline';
}

interface FriendRequest {
  id: string;
  senderId: string;
  status: string;
  createdAt: string;
  sender: User;
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [friends, setFriends] = React.useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = React.useState<FriendRequest[]>([]);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [searchResults, setSearchResults] = React.useState<User[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [csrfToken, setCsrfToken] = React.useState<string>('');
  const [sentRequests, setSentRequests] = React.useState<Set<string>>(new Set());
  const [userDecks, setUserDecks] = React.useState<any[]>([]);

  // Load friends and friend requests on component mount
  React.useEffect(() => {
    if (session?.user?.id) {
      loadFriends();
      loadFriendRequests();
      loadUserDecks();
      // Get CSRF token from response headers
      fetch('/api/auth/session')
        .then(response => {
          const token = response.headers.get('X-CSRF-Token');
          if (token) {
            setCsrfToken(token);
          }
        })
        .catch(() => {
          // Ignore CSRF token fetch errors
        });
    }
  }, [session?.user?.id]);

  const loadFriends = async () => {
    try {
      const response = await fetch('/api/friends');
      const data = await response.json();
      
      if (response.ok) {
        // Add mock online/offline status to friends
        const friendsWithStatus = (data.friends || []).map((friendship: any) => ({
          ...friendship.friend,
          status: Math.random() > 0.5 ? 'online' : 'offline'
        }));
        setFriends(friendsWithStatus);
      }
    } catch (error) {
      console.error('Error loading friends:', error);
      setFriends([]); // Set empty array on error
    } finally {
      setIsLoading(false);
    }
  };

  const loadFriendRequests = async () => {
    try {
      const response = await fetch('/api/friends/requests');
      const data = await response.json();
      
      if (response.ok) {
        setFriendRequests(data.requests || []);
      }
    } catch (error) {
      console.error('Error loading friend requests:', error);
      setFriendRequests([]); // Set empty array on error
    }
  };

  const loadUserDecks = async () => {
    try {
      const response = await fetch('/api/decks');
      const data = await response.json();
      
      if (response.ok) {
        setUserDecks(data.decks || []);
      }
    } catch (error) {
      console.error('Error loading user decks:', error);
      setUserDecks([]); // Set empty array on error
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) return;
    
    setIsSearching(true);
    
    try {
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      
      if (response.ok) {
        setSearchResults(data.users);
      } else {
        console.error('Search error:', data.error);
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Search request failed:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const sendFriendRequest = async (user: User) => {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      // Add CSRF token if available
      if (csrfToken) {
        headers['x-csrf-token'] = csrfToken;
      }

      const response = await fetch('/api/friends/request', {
        method: 'POST',
        headers,
        body: JSON.stringify({ receiverId: user.id }),
      });

      if (response.ok) {
        // Add to sent requests set
        setSentRequests(prev => new Set([...prev, user.id]));
        // Keep user in search results (don't remove them)
      } else {
        const data = await response.json();
        
        // Handle already sent requests gracefully
        if (data.error?.includes('already sent')) {
          // Just mark as sent in the UI
          setSentRequests(prev => new Set([...prev, user.id]));
          console.log('Friend request was already sent to this user');
        } else if (data.error?.includes('database migrations')) {
          alert('Friend system is not yet set up. Please contact an administrator to run database migrations.');
        } else {
          console.error('Error sending friend request:', data.error);
        }
      }
    } catch (error) {
      console.error('Error sending friend request:', error);
    }
  };

  const respondToFriendRequest = async (requestId: string, action: 'accept' | 'decline') => {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      // Add CSRF token if available
      if (csrfToken) {
        headers['x-csrf-token'] = csrfToken;
      }

      const response = await fetch('/api/friends/respond', {
        method: 'POST',
        headers,
        body: JSON.stringify({ requestId, action }),
      });

      if (response.ok) {
        // Remove the request from the list
        setFriendRequests(friendRequests.filter(r => r.id !== requestId));
        
        // If accepted, reload friends list
        if (action === 'accept') {
          loadFriends();
        }
      } else {
        const data = await response.json();
        console.error('Error responding to friend request:', data.error);
      }
    } catch (error) {
      console.error('Error responding to friend request:', error);
    }
  };

  const removeFriend = async (friendId: string) => {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      // Add CSRF token if available
      if (csrfToken) {
        headers['x-csrf-token'] = csrfToken;
      }

      const response = await fetch('/api/friends', {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ friendId }),
      });

      if (response.ok) {
        setFriends(friends.filter(f => f.id !== friendId));
      } else {
        const data = await response.json();
        console.error('Error removing friend:', data.error);
      }
    } catch (error) {
      console.error('Error removing friend:', error);
    }
  };

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
        <Card className="bg-black border-gray-800">
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
          <TabsList className="grid w-full grid-cols-5 bg-black border-gray-700">
            <TabsTrigger value="overview" className="text-gray-300 data-[state=active]:text-white">
              Overview
            </TabsTrigger>
            <TabsTrigger value="collection" className="text-gray-300 data-[state=active]:text-white">
              Collection
            </TabsTrigger>
            <TabsTrigger value="decks" className="text-gray-300 data-[state=active]:text-white">
              Decks
            </TabsTrigger>
            <TabsTrigger value="friends" className="text-gray-300 data-[state=active]:text-white">
              Friends
            </TabsTrigger>
            <TabsTrigger value="activity" className="text-gray-300 data-[state=active]:text-white">
              Activity
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
              {/* Collection Stats */}
              <Card className="bg-black border-gray-800">
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
              <Card className="bg-black border-gray-800">
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
              <Card className="bg-black border-gray-800">
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
              <CardContent>
                {userDecks.length === 0 ? (
                  <div className="text-center py-12">
                    <Trophy className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400 mb-4">Start building your first deck</p>
                    <Link href="/deckbuilder">
                      <Button className="bg-purple-600 hover:bg-purple-700">
                        Create New Deck
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <p className="text-gray-400">Your deck collection</p>
                      <Link href="/deckbuilder">
                        <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                          Create New Deck
                        </Button>
                      </Link>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                      {userDecks.map((deck: any) => (
                        <div key={deck.id} className="relative group">
                          <Card className="bg-gray-900 border-gray-800 hover:border-gray-700 transition-all duration-200 cursor-pointer group p-0 overflow-hidden relative">
                            {/* Card Image */}
                            {deck.thumbnailImage?.art_crop ? (
                              <img 
                                src={deck.thumbnailImage.art_crop} 
                                alt={deck.thumbnailCardName || deck.name}
                                className="aspect-[4/3] w-full object-cover"
                              />
                            ) : (
                              <div className="aspect-[4/3] bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                                <div className="text-center">
                                  <div className="text-2xl font-bold text-gray-400 mb-1">{deck.name.charAt(0)}</div>
                                  <div className="text-xs text-gray-500">{deck.format}</div>
                                </div>
                              </div>
                            )}
                            
                            {/* Top gradient overlay on hover with action buttons */}
                            <div className="absolute top-0 left-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20">
                              <div className="bg-gradient-to-b from-black via-black/80 to-transparent rounded-t-lg h-12 flex items-center justify-evenly px-2 py-2">
                                {/* View button */}
                                <Link href={`/decks/${deck.id}`}>
                                  <button className="w-6 h-6 p-0 hover:bg-gray-700 text-white hover:text-white rounded flex items-center justify-center transition-colors" title="View Deck">
                                    <User className="w-4 h-4" />
                                  </button>
                                </Link>

                                {/* Edit button */}
                                <Link href={`/decks/${deck.id}/edit`}>
                                  <button className="w-6 h-6 p-0 hover:bg-gray-700 text-white hover:text-white rounded flex items-center justify-center transition-colors" title="Edit Deck">
                                    <Settings className="w-4 h-4" />
                                  </button>
                                </Link>
                                
                                {/* Stats button */}
                                <Link href={`/decks/${deck.id}/stats`}>
                                  <button className="w-6 h-6 p-0 hover:bg-gray-700 text-white hover:text-white rounded flex items-center justify-center transition-colors" title="View Stats">
                                    <Trophy className="w-4 h-4" />
                                  </button>
                                </Link>
                              </div>
                            </div>
                            
                            {/* Deck Info Overlay */}
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                              <h3 className="text-white font-semibold text-sm truncate">{deck.name}</h3>
                              <p className="text-gray-300 text-xs">{deck.cardCount || 0} cards • {deck.format}</p>
                            </div>
                          </Card>
                        </div>
                      ))}
                      
                      {/* Add new deck card */}
                      <Link href="/deckbuilder">
                        <Card className="bg-gray-900 border-gray-800 hover:border-gray-600 transition-colors cursor-pointer border-dashed p-0 overflow-hidden">
                          <div className="aspect-[4/3] bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                            <div className="text-center">
                              <Trophy className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                              <span className="text-sm text-gray-400">Create New Deck</span>
                            </div>
                          </div>
                        </Card>
                      </Link>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="friends" className="space-y-6">
            <Card className="bg-gray-900/95 border-gray-800">
              <CardContent className="space-y-6">
                {/* Search Users Section */}
                <div>
                  <h3 className="text-white font-medium mb-3 flex items-center">
                    <Search className="w-4 h-4 mr-2 text-blue-400" />
                    Search Users
                  </h3>
                  <div className="flex space-x-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        placeholder="Search for players by name, username, or email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                        className="pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-400"
                      />
                    </div>
                    <Button 
                      className="bg-green-600 hover:bg-green-700 disabled:opacity-50"
                      onClick={handleSearch}
                      disabled={isSearching || !searchQuery.trim()}
                    >
                      {isSearching ? 'Searching...' : 'Search'}
                    </Button>
                  </div>
                  
                  {/* Search Results */}
                  {searchResults.length > 0 && (
                    <div className="mt-4 space-y-3">
                      <h4 className="text-white font-medium">Players Found</h4>
                      {searchResults.map((user) => (
                        <div key={user.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={user.image || ''} alt={user.name || user.email} />
                              <AvatarFallback className="bg-gradient-to-r from-green-500 to-blue-600 text-white">
                                {(user.name || user.email).charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-white font-medium">{user.name || user.email}</p>
                              <p className="text-gray-400 text-sm">
                                {user.username ? `@${user.username}` : user.email}
                              </p>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="border-gray-600 text-gray-300 hover:bg-gray-700"
                              onClick={() => {
                                router.push(`/profile/${user.id}`);
                              }}
                            >
                              <User className="w-4 h-4 mr-1" />
                              View Profile
                            </Button>
                            {sentRequests.has(user.id) || user.friendRequestStatus === 'pending' ? (
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="border-yellow-600 text-yellow-400 cursor-default"
                                disabled
                              >
                                <UserPlus className="w-4 h-4 mr-1" />
                                Pending
                              </Button>
                            ) : (
                              <Button 
                                size="sm" 
                                className="bg-blue-600 hover:bg-blue-700"
                                onClick={() => sendFriendRequest(user)}
                              >
                                <UserPlus className="w-4 h-4 mr-1" />
                                Add Friend
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* No Results Message */}
                  {searchQuery && searchResults.length === 0 && !isSearching && (
                    <div className="mt-4 p-3 bg-gray-800 rounded-lg">
                      <p className="text-gray-400 text-sm">No players found matching "{searchQuery}"</p>
                      <p className="text-gray-500 text-xs mt-1">Search requires at least 2 characters. Try searching by name, username, or email.</p>
                    </div>
                  )}
                  
                  {/* Loading State */}
                  {isSearching && (
                    <div className="mt-4 p-3 bg-gray-800 rounded-lg flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                      <p className="text-gray-400 text-sm">Searching for players...</p>
                    </div>
                  )}
                </div>

                {/* Friend Requests */}
                {friendRequests.length > 0 && (
                  <div>
                    <h3 className="text-white font-medium mb-3 flex items-center">
                      <Users className="w-4 h-4 mr-2 text-yellow-400" />
                      Friend Requests ({friendRequests.length})
                    </h3>
                    <div className="space-y-3">
                      {friendRequests.map((request) => (
                        <div key={request.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={request.sender.image || ''} alt={request.sender.name || request.sender.email} />
                              <AvatarFallback className="bg-gradient-to-r from-purple-500 to-pink-600 text-white">
                                {(request.sender.name || request.sender.email).charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-white font-medium">{request.sender.name || request.sender.email}</p>
                              <p className="text-gray-400 text-sm">
                                {request.sender.username ? `@${request.sender.username}` : request.sender.email}
                              </p>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="border-gray-600 text-gray-300 hover:bg-gray-700"
                              onClick={() => router.push(`/profile/${request.sender.id}`)}
                            >
                              <User className="w-4 h-4 mr-1" />
                              View Profile
                            </Button>
                            <Button 
                              size="sm" 
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => respondToFriendRequest(request.id, 'accept')}
                            >
                              Accept
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="border-gray-600 text-gray-300 hover:bg-gray-800"
                              onClick={() => respondToFriendRequest(request.id, 'decline')}
                            >
                              Decline
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Friends List */}
                <div>
                  <h3 className="text-white font-medium mb-3 flex items-center">
                    <Users className="w-4 h-4 mr-2 text-blue-400" />
                    Your Friends ({friends.length})
                  </h3>
                  {friends.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-400">No friends yet</p>
                      <p className="text-gray-500 text-sm mt-1">Use "Search Users" above to find players and connect with the community</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {friends.map((friend) => (
                        <div key={friend.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg hover:bg-gray-750 transition-colors">
                          <div className="flex items-center space-x-3">
                            <div className="relative">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={friend.image || ''} alt={friend.name || friend.email} />
                                <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                                  {(friend.name || friend.email).charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-gray-800 ${
                                friend.status === 'online' ? 'bg-green-500' : 'bg-gray-500'
                              }`}></div>
                            </div>
                            <div>
                              <p className="text-white font-medium">{friend.name || friend.email}</p>
                              <p className="text-gray-400 text-sm">
                                {friend.username ? `@${friend.username}` : friend.email}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant="secondary" className={`${
                              friend.status === 'online' 
                                ? 'bg-green-900/50 text-green-300 border-green-700' 
                                : 'bg-gray-700 text-gray-300 border-gray-600'
                            }`}>
                              {friend.status}
                            </Badge>
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="border-gray-600 text-gray-300 hover:bg-gray-700"
                              onClick={() => router.push(`/profile/${friend.id}`)}
                            >
                              <User className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="border-gray-600 text-gray-300 hover:bg-gray-800"
                              onClick={() => removeFriend(friend.id)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
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