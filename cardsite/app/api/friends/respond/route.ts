import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { friendRequests, friendships } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { nanoid } from 'nanoid'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { requestId, action } = await request.json()
    if (!requestId || !action || !['accept', 'decline'].includes(action)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    try {
      // Find the friend request
      const friendRequest = await db
        .select()
        .from(friendRequests)
        .where(
          and(
            eq(friendRequests.id, requestId),
            eq(friendRequests.receiverId, session.user.id),
            eq(friendRequests.status, 'pending')
          )
        )
        .limit(1)

      if (friendRequest.length === 0) {
        return NextResponse.json({ error: 'Friend request not found' }, { status: 404 })
      }

      const request_data = friendRequest[0]

      if (action === 'accept') {
        // Create friendship (bidirectional relationship)
        // We store it once with user1Id < user2Id for consistency
        const user1Id = request_data.senderId < session.user.id ? request_data.senderId : session.user.id
        const user2Id = request_data.senderId < session.user.id ? session.user.id : request_data.senderId

        await db.insert(friendships).values({
          id: nanoid(12),
          user1Id,
          user2Id,
        })
      }

      // Update friend request status
      await db
        .update(friendRequests)
        .set({
          status: action === 'accept' ? 'accepted' : 'declined',
          respondedAt: new Date(),
        })
        .where(eq(friendRequests.id, requestId))

      return NextResponse.json({ success: true, action })
    } catch (dbError) {
      // If friend tables don't exist, return a helpful error
      console.error('Friend respond database error (tables may not exist):', dbError)
      return NextResponse.json({ error: 'Friend system not yet available. Please run database migrations first.' }, { status: 503 })
    }
  } catch (error) {
    console.error('Error responding to friend request:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 