import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { forumPosts, users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'Post ID is required' }, { status: 400 })
    }

    try {
      // Fetch the post with user information
      const post = await db.select({
        id: forumPosts.id,
        title: forumPosts.title,
        content: forumPosts.content,
        category: forumPosts.category,
        subcategory: forumPosts.subcategory,
        views: forumPosts.views,
        replyCount: forumPosts.replyCount,
        isPinned: forumPosts.isPinned,
        isLocked: forumPosts.isLocked,
        createdAt: forumPosts.createdAt,
        updatedAt: forumPosts.updatedAt,
        userId: forumPosts.userId,
        username: users.username,
        name: users.name,
        image: users.image,
      }).from(forumPosts)
        .leftJoin(users, eq(forumPosts.userId, users.id))
        .where(eq(forumPosts.id, id))
        .limit(1)

      if (post.length === 0) {
        return NextResponse.json({ error: 'Post not found' }, { status: 404 })
      }

      // Optionally increment view count
      await db.update(forumPosts)
        .set({ views: (post[0].views || 0) + 1 })
        .where(eq(forumPosts.id, id))

      return NextResponse.json({ post: post[0] })
    } catch (dbError) {
      console.error('Database error fetching post:', dbError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }
  } catch (error) {
    console.error('Error fetching post:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 