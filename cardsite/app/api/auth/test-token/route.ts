import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db/index'
import { verificationTokens } from '@/lib/db/schema'
import { nanoid } from 'nanoid'

// DEVELOPMENT ONLY - Remove in production
export async function GET(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'This endpoint is only available in development' },
      { status: 403 }
    )
  }

  try {
    // Generate a test token
    const testToken = nanoid(32)
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour from now

    // Store test token with a test email
    await db.insert(verificationTokens).values({
      identifier: 'test@example.com',
      token: testToken,
      expires: expiresAt,
    })

    const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${testToken}`

    return NextResponse.json({
      message: 'Test token generated successfully',
      token: testToken,
      resetUrl: resetUrl,
      expires: expiresAt,
      note: 'This is for development testing only. Use this URL to test the reset password page.'
    })

  } catch (error) {
    console.error('Test token generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate test token' },
      { status: 500 }
    )
  }
} 