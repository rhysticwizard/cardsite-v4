import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { friendRequests, users } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
      // Get pending friend requests received by the current user
      const requests = await db
        .select({
          id: friendRequests.id,
          senderId: friendRequests.senderId,
          status: friendRequests.status,
          createdAt: friendRequests.createdAt,
          sender: {
            id: users.id,
            name: users.name,
            username: users.username,
            image: users.image,
          },
        })
        .from(friendRequests)
        .innerJoin(users, eq(friendRequests.senderId, users.id))
        .where(
          and(
            eq(friendRequests.receiverId, session.user.id),
            eq(friendRequests.status, 'pending')
          )
        )
        .orderBy(friendRequests.createdAt)

      return NextResponse.json({ requests })
    } catch (dbError) {
      // If friend tables don't exist, return empty array
      console.log('Friend requests table not found, returning empty array:', dbError)
      return NextResponse.json({ requests: [] })
    }
  } catch (error) {
    console.error('Error fetching friend requests:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 