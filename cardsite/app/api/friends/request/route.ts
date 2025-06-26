import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { friendRequests, users } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { nanoid } from 'nanoid'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { receiverId } = await request.json()
    if (!receiverId) {
      return NextResponse.json({ error: 'Receiver ID is required' }, { status: 400 })
    }

    // Can't send friend request to yourself
    if (receiverId === session.user.id) {
      return NextResponse.json({ error: 'Cannot send friend request to yourself' }, { status: 400 })
    }

    // Check if receiver exists
    const receiver = await db.select().from(users).where(eq(users.id, receiverId)).limit(1)
    if (receiver.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    try {
      // Check if pending friend request already exists
      const existingRequest = await db
        .select()
        .from(friendRequests)
        .where(
          and(
            eq(friendRequests.senderId, session.user.id),
            eq(friendRequests.receiverId, receiverId),
            eq(friendRequests.status, 'pending')
          )
        )
        .limit(1)

      if (existingRequest.length > 0) {
        return NextResponse.json({ error: 'Friend request already sent' }, { status: 400 })
      }

      // Create friend request
      const newRequest = await db
        .insert(friendRequests)
        .values({
          id: nanoid(12),
          senderId: session.user.id,
          receiverId,
          status: 'pending',
        })
        .returning()

      return NextResponse.json({ success: true, request: newRequest[0] })
    } catch (dbError) {
      // If friend tables don't exist, return a helpful error
      console.error('Friend request database error (tables may not exist):', dbError)
      return NextResponse.json({ error: 'Friend system not yet available. Please run database migrations first.' }, { status: 503 })
    }
  } catch (error) {
    console.error('Error sending friend request:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 