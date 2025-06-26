'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../../../components/ui/avatar';
import { Badge } from '../../../components/ui/badge';
import { User, Calendar, Trophy, Users, UserPlus, MessageCircle, Check, X } from 'lucide-react';
import Link from 'next/link';

interface UserProfile {
  id: string;
  name: string | null;
  username: string | null;
  email: string;
  image: string | null;
  createdAt: string;
  relationshipStatus?: string | null;
}

export default function UserProfilePage() {
  const params = useParams();
  const userId = params.id as string;
  const [userProfile, setUserProfile] = React.useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [csrfToken, setCsrfToken] = React.useState<string>('');

  React.useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const response = await fetch(`/api/users/${userId}`);
        const data = await response.json();
        
        if (response.ok) {
          setUserProfile(data.user);
        } else {
          setError(data.error || 'User not found');
        }
      } catch (error) {
        setError('Failed to load user profile');
      } finally {
        setIsLoading(false);
      }
    };

    const getCsrfToken = async () => {
      try {
        const response = await fetch('/api/auth/session');
        const token = response.headers.get('X-CSRF-Token');
        if (token) {
          setCsrfToken(token);
        }
      } catch (error) {
        // Ignore CSRF token fetch errors
      }
    };

    if (userId) {
      fetchUserProfile();
      getCsrfToken();
    }
  }, [userId]);

  const respondToFriendRequest = async (action: 'accept' | 'decline') => {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (csrfToken) {
        headers['x-csrf-token'] = csrfToken;
      }

      // We need to find the friend request ID first
      const response = await fetch('/api/friends/requests');
      const data = await response.json();
      
      if (response.ok) {
        const request = data.requests.find((req: any) => req.senderId === userId);
        if (request) {
          const respondResponse = await fetch('/api/friends/respond', {
            method: 'POST',
            headers,
            body: JSON.stringify({ requestId: request.id, action }),
          });

          if (respondResponse.ok) {
            // Refresh the user profile to update the relationship status
            const profileResponse = await fetch(`/api/users/${userId}`);
            const profileData = await profileResponse.json();
            if (profileResponse.ok) {
              setUserProfile(profileData.user);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error responding to friend request:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !userProfile) {
    return (
      <div className="max-w-4xl mx-auto px-8 py-12">
        <Card className="bg-gray-900/95 border-gray-800">
          <CardContent className="text-center py-12">
            <User className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">User Not Found</h2>
            <p className="text-gray-400 mb-4">{error}</p>
            <Link href="/profile">
              <Button variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-700">
                Back to Profile
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-8 py-12">
      {/* User Profile Header */}
      <Card className="bg-gray-900/95 border-gray-800 mb-8">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-6">
            <Avatar className="h-24 w-24">
              <AvatarImage src={userProfile.image || ''} alt={userProfile.name || userProfile.email} />
              <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-600 text-white text-2xl">
                {(userProfile.name || userProfile.email).charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white mb-2">
                {userProfile.name || userProfile.email}
              </h1>
              <p className="text-gray-400 text-lg mb-3">
                {userProfile.username ? `@${userProfile.username}` : userProfile.email}
              </p>
              <div className="flex items-center space-x-4">
                <Badge variant="secondary" className="bg-green-900/50 text-green-300 border-green-700">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  Online
                </Badge>
                <p className="text-gray-400 text-sm">
                  Joined {new Date(userProfile.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex space-x-3">
              {userProfile.relationshipStatus === 'friends' ? (
                <Button variant="outline" className="border-green-600 text-green-400 cursor-default" disabled>
                  <Users className="w-4 h-4 mr-2" />
                  Friends
                </Button>
              ) : userProfile.relationshipStatus === 'pending' ? (
                <Button variant="outline" className="border-yellow-600 text-yellow-400 cursor-default" disabled>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Pending
                </Button>
              ) : userProfile.relationshipStatus === 'incoming_request' ? (
                <>
                  <Button 
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => respondToFriendRequest('accept')}
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Accept
                  </Button>
                  <Button 
                    variant="outline" 
                    className="border-red-600 text-red-400 hover:bg-red-900/20"
                    onClick={() => respondToFriendRequest('decline')}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Decline
                  </Button>
                </>
              ) : (
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Friend
                </Button>
              )}
              <Button variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-700">
                <MessageCircle className="w-4 h-4 mr-2" />
                Message
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="bg-gray-900/95 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Trophy className="w-5 h-5 mr-2 text-yellow-400" />
              Decks Built
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white mb-2">12</div>
            <p className="text-gray-400 text-sm">Public decks created</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/95 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Users className="w-5 h-5 mr-2 text-blue-400" />
              Friends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white mb-2">47</div>
            <p className="text-gray-400 text-sm">Connected players</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/95 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-green-400" />
              Games Played
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white mb-2">238</div>
            <p className="text-gray-400 text-sm">Total matches</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="bg-gray-900/95 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Recent Activity</CardTitle>
          <CardDescription className="text-gray-400">
            {userProfile.name || userProfile.email}'s recent deck builds and games
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No recent activity to display</p>
            <p className="text-gray-500 text-sm mt-1">
              This feature will show deck builds, games played, and other activity
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 