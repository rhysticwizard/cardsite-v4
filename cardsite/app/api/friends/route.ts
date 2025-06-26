import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { friendships, users } from '@/lib/db/schema'
import { eq, or, and } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
      // Get friends where current user is either user1 or user2
      const friendsAsUser1 = await db
        .select({
          id: friendships.id,
          createdAt: friendships.createdAt,
          friend: {
            id: users.id,
            name: users.name,
            username: users.username,
            image: users.image,
          },
        })
        .from(friendships)
        .innerJoin(users, eq(friendships.user2Id, users.id))
        .where(eq(friendships.user1Id, session.user.id))

      const friendsAsUser2 = await db
        .select({
          id: friendships.id,
          createdAt: friendships.createdAt,
          friend: {
            id: users.id,
            name: users.name,
            username: users.username,
            image: users.image,
          },
        })
        .from(friendships)
        .innerJoin(users, eq(friendships.user1Id, users.id))
        .where(eq(friendships.user2Id, session.user.id))

      // Combine and sort by creation date
      const allFriends = [...friendsAsUser1, ...friendsAsUser2].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )

      return NextResponse.json({ friends: allFriends })
    } catch (dbError) {
      // If friend tables don't exist, return empty array
      console.log('Friends table not found, returning empty array:', dbError)
      return NextResponse.json({ friends: [] })
    }
  } catch (error) {
    console.error('Error fetching friends:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { friendId } = await request.json()
    if (!friendId) {
      return NextResponse.json({ error: 'Friend ID is required' }, { status: 400 })
    }

    // Find and delete the friendship
    const result = await db
      .delete(friendships)
      .where(
        or(
          and(
            eq(friendships.user1Id, session.user.id),
            eq(friendships.user2Id, friendId)
          ),
          and(
            eq(friendships.user1Id, friendId),
            eq(friendships.user2Id, session.user.id)
          )
        )
      )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing friend:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 