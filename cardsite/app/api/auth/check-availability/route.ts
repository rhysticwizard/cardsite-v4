import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db/index'
import { users } from '@/lib/db/schema'
import { eq, sql } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const username = searchParams.get('username')
    const email = searchParams.get('email')

    if (!username && !email) {
      return NextResponse.json(
        { error: 'Username or email parameter is required' },
        { status: 400 }
      )
    }

    const result: { usernameAvailable?: boolean; emailAvailable?: boolean } = {}

    if (username) {
      // Case-insensitive username check to prevent impersonation
      // "Apple" and "apple" should be treated as the same username
      const existingUsername = await db.select({ id: users.id })
        .from(users)
        .where(sql`lower(${users.username}) = lower(${username})`)
        .limit(1)
      
      result.usernameAvailable = existingUsername.length === 0
    }

    if (email) {
      // Emails are always case-insensitive by RFC standards
      const existingEmail = await db.select({ id: users.id })
        .from(users)
        .where(sql`lower(${users.email}) = lower(${email})`)
        .limit(1)
      
      result.emailAvailable = existingEmail.length === 0
    }

    return NextResponse.json(result)

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to check availability' },
      { status: 500 }
    )
  }
} 