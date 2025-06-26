import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, friendships, friendRequests } from '@/lib/db/schema';
import { ilike, or, and, ne, eq, notInArray } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    
    if (!query || query.trim().length < 2) {
      return NextResponse.json({ error: 'Query must be at least 2 characters' }, { status: 400 });
    }

    let excludedUserIds = [session.user.id]; // Always exclude current user

    try {
      // Try to get existing friends (may fail if tables don't exist)
      const existingFriends = await db
        .select({
          friendId: friendships.user1Id,
        })
        .from(friendships)
        .where(eq(friendships.user2Id, session.user.id))
        .union(
          db
            .select({
              friendId: friendships.user2Id,
            })
            .from(friendships)
            .where(eq(friendships.user1Id, session.user.id))
        );

      // Only exclude actual friends, not pending requests
      // This allows users to still see people they've sent requests to
      excludedUserIds = [
        session.user.id,
        ...existingFriends.map(f => f.friendId),
      ];
    } catch (friendError) {
      // If friend tables don't exist, just exclude current user
      console.log('Friend tables not found, skipping friend filtering:', friendError);
    }

    // Search for users by name, username, or email
    const searchResults = await db
      .select({
        id: users.id,
        name: users.name,
        username: users.username,
        email: users.email,
        image: users.image,
      })
      .from(users)
      .where(
        and(
          excludedUserIds.length > 1 ? notInArray(users.id, excludedUserIds) : ne(users.id, session.user.id),
          or(
            ilike(users.name, `%${query}%`),
            ilike(users.username, `%${query}%`),
            ilike(users.email, `%${query}%`)
          )
        )
      )
      .limit(10); // Limit results to 10

    // Get pending friend requests for these users to show correct status
    let pendingRequestsMap = new Map();
    try {
      const pendingRequests = await db
        .select({
          receiverId: friendRequests.receiverId,
          status: friendRequests.status,
        })
        .from(friendRequests)
        .where(
          and(
            eq(friendRequests.senderId, session.user.id),
            eq(friendRequests.status, 'pending')
          )
        );

      pendingRequests.forEach(req => {
        pendingRequestsMap.set(req.receiverId, req.status);
      });
    } catch (error) {
      console.log('Error fetching pending requests:', error);
    }

    // Add friend request status to search results
    const usersWithStatus = searchResults.map(user => ({
      ...user,
      friendRequestStatus: pendingRequestsMap.get(user.id) || null
    }));

    return NextResponse.json({ users: usersWithStatus });
  } catch (error) {
    console.error('User search error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 