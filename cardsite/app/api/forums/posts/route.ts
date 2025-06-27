import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { forumPosts, users } from '@/lib/db/schema'
import { nanoid } from 'nanoid'
import { eq, desc } from 'drizzle-orm'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { title, content, category, subcategory } = await request.json()

    // Validate required fields
    if (!title || !content || !category) {
      return NextResponse.json(
        { error: 'Title, content, and category are required' }, 
        { status: 400 }
      )
    }

    // Validate title length
    if (title.length > 255) {
      return NextResponse.json(
        { error: 'Title must be 255 characters or less' }, 
        { status: 400 }
      )
    }

    try {
      // Create the forum post
      const [newPost] = await db.insert(forumPosts).values({
        id: nanoid(12),
        userId: session.user.id,
        title: title.trim(),
        content: content.trim(),
        category: category,
        subcategory: subcategory || null,
      }).returning()

      return NextResponse.json({ 
        success: true, 
        post: {
          id: newPost.id,
          title: newPost.title,
          category: newPost.category,
          subcategory: newPost.subcategory,
          createdAt: newPost.createdAt
        }
      })
    } catch (dbError) {
      console.error('Forum post database error:', dbError)
      return NextResponse.json(
        { error: 'Database error. Forum tables may need to be created.' }, 
        { status: 503 }
      )
    }
  } catch (error) {
    console.error('Error creating forum post:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    try {
      const posts = category 
        ? await db.select({
            id: forumPosts.id,
            title: forumPosts.title,
            category: forumPosts.category,
            subcategory: forumPosts.subcategory,
            views: forumPosts.views,
            replyCount: forumPosts.replyCount,
            lastReplyAt: forumPosts.lastReplyAt,
            createdAt: forumPosts.createdAt,
            userId: forumPosts.userId,
            isPinned: forumPosts.isPinned,
            username: users.username,
            name: users.name,
            image: users.image,
          }).from(forumPosts)
            .leftJoin(users, eq(forumPosts.userId, users.id))
            .where(eq(forumPosts.category, category))
            .orderBy(desc(forumPosts.createdAt))
            .limit(limit)
            .offset(offset)
        : await db.select({
            id: forumPosts.id,
            title: forumPosts.title,
            category: forumPosts.category,
            subcategory: forumPosts.subcategory,
            views: forumPosts.views,
            replyCount: forumPosts.replyCount,
            lastReplyAt: forumPosts.lastReplyAt,
            createdAt: forumPosts.createdAt,
            userId: forumPosts.userId,
            isPinned: forumPosts.isPinned,
            username: users.username,
            name: users.name,
            image: users.image,
          }).from(forumPosts)
            .leftJoin(users, eq(forumPosts.userId, users.id))
            .orderBy(desc(forumPosts.createdAt))
            .limit(limit)
            .offset(offset)

      return NextResponse.json({ posts })
    } catch (dbError) {
      console.error('Forum posts fetch error:', dbError)
      return NextResponse.json({ posts: [] }) // Return empty array if tables don't exist
    }
  } catch (error) {
    console.error('Error fetching forum posts:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 