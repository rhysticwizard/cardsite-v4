import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db/index'
import { users, verificationTokens } from '@/lib/db/schema'
import { eq, and, sql } from 'drizzle-orm'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { createHash } from 'crypto'

// Server-side HIBP check with k-anonymity (same as signup)
async function checkPasswordBreach(password: string): Promise<{ isBreached: boolean; breachCount: number }> {
  try {
    const hash = createHash('sha1').update(password).digest('hex').toUpperCase()
    const prefix = hash.substring(0, 5)
    const suffix = hash.substring(5)
    
    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: {
        'User-Agent': 'CardSite-MTG-Community-Hub'
      }
    })
    
    if (!response.ok) {
      return { isBreached: false, breachCount: 0 }
    }
    
    const text = await response.text()
    const lines = text.split('\n')
    
    for (const line of lines) {
      const [lineSuffix, countStr] = line.split(':')
      if (lineSuffix === suffix) {
        const breachCount = parseInt(countStr, 10)
        return { isBreached: true, breachCount }
      }
    }
    
    return { isBreached: false, breachCount: 0 }
    
  } catch (error) {
    return { isBreached: false, breachCount: 0 }
  }
}

const universallyTerriblePasswords = [
  'password', '123456', 'qwerty', 'admin'
]

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(64, 'Password must be less than 64 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
      'Password must contain: uppercase letter, lowercase letter, number, and special character (@$!%*?&)')
    .refine((password) => {
      const lowerPassword = password.toLowerCase()
      return !universallyTerriblePasswords.some(terrible => lowerPassword === terrible)
    }, {
      message: 'Please choose a different password.'
    }),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate input
    const result = resetPasswordSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      )
    }

    const { token, password } = result.data

    // Find valid reset token
    const resetToken = await db.select({
      identifier: verificationTokens.identifier,
      expires: verificationTokens.expires
    })
      .from(verificationTokens)
      .where(and(
        eq(verificationTokens.token, token),
        sql`${verificationTokens.expires} > NOW()`
      ))
      .limit(1)

    if (resetToken.length === 0) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token. Please request a new password reset.' },
        { status: 400 }
      )
    }

    const userEmail = resetToken[0].identifier

    // Get user details for context-specific validation
    const user = await db.select({
      id: users.id,
      email: users.email,
      username: users.username
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

    // Context-specific validation (prevent username/email in password)
    const lowerPassword = password.toLowerCase()
    const lowerUsername = foundUser.username?.toLowerCase() || ''
    const lowerEmail = foundUser.email.toLowerCase()
    
    if (lowerPassword.includes(lowerUsername) || lowerPassword.includes(lowerEmail.split('@')[0])) {
      return NextResponse.json(
        { error: 'Password cannot contain your username or email' },
        { status: 400 }
      )
    }

    // Check against HaveIBeenPwned database
    const breachCheck = await checkPasswordBreach(password)
    if (breachCheck.isBreached) {
      if (breachCheck.breachCount > 100000) {
        return NextResponse.json(
          { error: 'This password is commonly used. Please choose a different password.' },
          { status: 400 }
        )
      } else if (breachCheck.breachCount > 1000) {
        return NextResponse.json(
          { error: 'Choose a less common password.' },
          { status: 400 }
        )
      } else {
        return NextResponse.json(
          { error: 'Choose a less common password.' },
          { status: 400 }
        )
      }
    }

    // Hash new password
    const saltRounds = 12
    const hashedPassword = await bcrypt.hash(password, saltRounds)

    // Update user password
    await db.update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, foundUser.id))

    // Delete the used reset token
    await db.delete(verificationTokens)
      .where(eq(verificationTokens.token, token))

    return NextResponse.json(
      { message: 'Password reset successfully. You can now sign in with your new password.' },
      { status: 200 }
    )

  } catch (error) {
    console.error('Reset password error:', error)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again later.' },
      { status: 500 }
    )
  }
} 