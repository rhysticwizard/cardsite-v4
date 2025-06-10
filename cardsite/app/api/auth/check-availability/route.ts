import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db/index'
import { users } from '@/lib/db/schema'
import { eq, sql } from 'drizzle-orm'
import { checkRateLimit, getClientIP, createRateLimitError, RATE_LIMITS } from '@/lib/simple-rate-limit'

export async function GET(request: NextRequest) {
  try {
    // Simple rate limiting - 10 requests per minute per IP
    const clientIP = getClientIP(request)
    const rateLimitResult = checkRateLimit(clientIP, RATE_LIMITS.AVAILABILITY)
    
    if (!rateLimitResult.allowed) {
      console.log(`🚫 Rate limit exceeded for availability check from IP: ${clientIP}`)
      return NextResponse.json(
        createRateLimitError(rateLimitResult.retryAfter),
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': RATE_LIMITS.AVAILABILITY.requests.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString(),
            'Retry-After': rateLimitResult.retryAfter.toString(),
          }
        }
      )
    }

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