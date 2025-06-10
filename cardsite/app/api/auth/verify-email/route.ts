import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db/index'
import { users, verificationTokens } from '@/lib/db/schema'
import { eq, and, sql } from 'drizzle-orm'
import { z } from 'zod'
import { checkRateLimit, getClientIP, createRateLimitError, RATE_LIMITS } from '@/lib/simple-rate-limit'

const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
})

export async function POST(request: NextRequest) {
  try {
    // Rate limiting - 5 email verification attempts per minute per IP
    const clientIP = getClientIP(request)
    const rateLimitResult = checkRateLimit(`verify-email:${clientIP}`, RATE_LIMITS.SIGNIN)
    
    if (!rateLimitResult.allowed) {
      console.log(`🚫 Rate limit exceeded for email verification from IP: ${clientIP}`)
      return NextResponse.json(
        createRateLimitError(rateLimitResult.retryAfter),
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': RATE_LIMITS.SIGNIN.requests.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString(),
            'Retry-After': rateLimitResult.retryAfter.toString(),
          }
        }
      )
    }

    const body = await request.json()
    
    // Validate input
    const result = verifyEmailSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      )
    }

    const { token } = result.data

    // Find valid verification token
    const verificationToken = await db.select({
      identifier: verificationTokens.identifier,
      expires: verificationTokens.expires
    })
      .from(verificationTokens)
      .where(and(
        eq(verificationTokens.token, token),
        sql`${verificationTokens.expires} > NOW()`
      ))
      .limit(1)

    if (verificationToken.length === 0) {
      return NextResponse.json(
        { error: 'Invalid or expired verification token. Please request a new verification email.' },
        { status: 400 }
      )
    }

    const userEmail = verificationToken[0].identifier

    // Get user details
    const user = await db.select({
      id: users.id,
      email: users.email,
      emailVerified: users.emailVerified
    })
      .from(users)
      .where(sql`lower(${users.email}) = lower(${userEmail})`)
      .limit(1)

    if (user.length === 0) {
      return NextResponse.json(
        { error: 'User not found.' },
        { status: 400 }
      )
    }

    const foundUser = user[0]

    // Check if already verified
    if (foundUser.emailVerified) {
      // Delete the token since it's no longer needed
      await db.delete(verificationTokens)
        .where(eq(verificationTokens.token, token))

      return NextResponse.json(
        { message: 'Email address is already verified.' },
        { status: 200 }
      )
    }

    // Mark email as verified
    await db.update(users)
      .set({ emailVerified: new Date() })
      .where(eq(users.id, foundUser.id))

    // Delete the used verification token
    await db.delete(verificationTokens)
      .where(eq(verificationTokens.token, token))

    return NextResponse.json(
      { message: 'Email verified successfully! You can now access all features of your account.' },
      { status: 200 }
    )

  } catch (error) {
    console.error('Verify email error:', error)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again later.' },
      { status: 500 }
    )
  }
} 