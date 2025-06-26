import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, friendRequests, friendships } from '@/lib/db/schema';
import { eq, and, or } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const userId = params.id;
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Fetch user profile data
    const userProfile = await db
      .select({
        id: users.id,
        name: users.name,
        username: users.username,
        email: users.email,
        image: users.image,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (userProfile.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let relationshipStatus = null;

    // If user is logged in, check relationship status
    if (session?.user?.id && session.user.id !== userId) {
      try {
        // Check if they're already friends
        const friendship = await db
          .select()
          .from(friendships)
          .where(
            or(
              and(eq(friendships.user1Id, session.user.id), eq(friendships.user2Id, userId)),
              and(eq(friendships.user1Id, userId), eq(friendships.user2Id, session.user.id))
            )
          )
          .limit(1);

        if (friendship.length > 0) {
          relationshipStatus = 'friends';
        } else {
          // Check for outgoing pending friend requests (you sent to them)
          const outgoingRequest = await db
            .select()
            .from(friendRequests)
            .where(
              and(
                eq(friendRequests.senderId, session.user.id),
                eq(friendRequests.receiverId, userId),
                eq(friendRequests.status, 'pending')
              )
            )
            .limit(1);

          if (outgoingRequest.length > 0) {
            relationshipStatus = 'pending';
          } else {
            // Check for incoming pending friend requests (they sent to you)
            const incomingRequest = await db
              .select({
                id: friendRequests.id
              })
              .from(friendRequests)
              .where(
                and(
                  eq(friendRequests.senderId, userId),
                  eq(friendRequests.receiverId, session.user.id),
                  eq(friendRequests.status, 'pending')
                )
              )
              .limit(1);

            if (incomingRequest.length > 0) {
              relationshipStatus = 'incoming_request';
            }
          }
        }
      } catch (error) {
        console.log('Error checking relationship status:', error);
      }
    }

    return NextResponse.json({ 
      user: {
        ...userProfile[0],
        relationshipStatus
      }
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 