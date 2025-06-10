import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db/index'
import { users } from '@/lib/db/schema'
import bcrypt from 'bcryptjs'
import { eq, or, sql } from 'drizzle-orm'
import { z } from 'zod'
import { createHash } from 'crypto'
import { checkRateLimit, getClientIP, createRateLimitError, RATE_LIMITS } from '@/lib/simple-rate-limit'
// Monitoring temporarily disabled for testing
// import { 
//   trackSecurity, 
//   trackPerformance, 
//   trackError, 
//   withTiming
// } from '@/lib/monitoring'

// Server-side HIBP check with k-anonymity
async function checkPasswordBreach(password: string): Promise<{ isBreached: boolean; breachCount: number }> {
  try {
    // Generate SHA-1 hash using Node.js crypto
    const hash = createHash('sha1').update(password).digest('hex').toUpperCase()
    
    // Use k-anonymity: only send first 5 characters
    const prefix = hash.substring(0, 5)
    const suffix = hash.substring(5)
    
    // Call HIBP API
    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: {
        'User-Agent': 'CardSite-MTG-Community-Hub'
      }
    })
    
    if (!response.ok) {
      return { isBreached: false, breachCount: 0 } // Fail open for availability
    }
    
    const text = await response.text()
    const lines = text.split('\n')
    
    // Check if our password's suffix appears in the response
    for (const line of lines) {
      const [lineSuffix, countStr] = line.split(':')
      if (lineSuffix === suffix) {
        const breachCount = parseInt(countStr, 10)
        return { isBreached: true, breachCount }
      }
    }
    
    return { isBreached: false, breachCount: 0 }
    
  } catch (error) {
    // Fail open - don't block signups if HIBP is down
    return { isBreached: false, breachCount: 0 }
  }
}

// Only block universally terrible passwords - ones that appear on every "worst passwords" list
const universallyTerriblePasswords = [
  'password', '123456', 'qwerty', 'admin'
]

const signupSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be less than 30 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'),
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(64, 'Password must be less than 64 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
      'Password must contain: uppercase letter, lowercase letter, number, and special character (@$!%*?&)')
    .refine((password) => {
      // Only block the universally terrible passwords
      const lowerPassword = password.toLowerCase()
      return !universallyTerriblePasswords.some(terrible => lowerPassword === terrible)
    }, {
      message: 'Please choose a different password.'
    }),
})

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const clientIP = getClientIP(request)
  
  try {
    // Rate limiting - 3 signup attempts per minute per IP
    const rateLimitResult = checkRateLimit(clientIP, RATE_LIMITS.SIGNUP)
    
    if (!rateLimitResult.allowed) {
      console.log(`🚫 Rate limit exceeded for signup from IP: ${clientIP}`)
      
      // trackSecurity('rate_limit', {
      //   ipAddress: clientIP,
      //   endpoint: 'signup',
      //   retryAfter: rateLimitResult.retryAfter 
      // })
      
      // trackPerformance('signup', Date.now() - startTime, false)
      
      return NextResponse.json(
        createRateLimitError(rateLimitResult.retryAfter),
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': RATE_LIMITS.SIGNUP.requests.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString(),
            'Retry-After': rateLimitResult.retryAfter.toString(),
          }
        }
      )
    }

    const body = await request.json()
    
    // Validate input
    const result = signupSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      )
    }

    const { username, email, password } = result.data

    // Context-specific validation (prevent username/email in password)
    const lowerPassword = password.toLowerCase()
    const lowerUsername = username.toLowerCase()
    const lowerEmail = email.toLowerCase()
    
    if (lowerPassword.includes(lowerUsername) || lowerPassword.includes(lowerEmail.split('@')[0])) {
      return NextResponse.json(
        { error: 'Password cannot contain your username or email' },
        { status: 400 }
      )
    }

    // Check against HaveIBeenPwned database - use gentle language like GitHub/Microsoft
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

    // Check if username or email already exists (case-insensitive)
    // Prevent impersonation: "Apple" and "apple" should be the same username
    const existingUser = await db.select().from(users)
      .where(or(
        sql`lower(${users.email}) = lower(${email})`, 
        sql`lower(${users.username}) = lower(${username})`
      ))
      .limit(2)
    
    if (existingUser.length > 0) {
      // Case-insensitive comparison for existing users
      const emailExists = existingUser.some((user: any) => user.email.toLowerCase() === email.toLowerCase())
      const usernameExists = existingUser.some((user: any) => user.username.toLowerCase() === username.toLowerCase())
      
      if (emailExists && usernameExists) {
        return NextResponse.json(
          { error: 'Both email and username are already taken' },
          { status: 409 }
        )
      } else if (emailExists) {
        return NextResponse.json(
          { error: 'An account with this email already exists' },
          { status: 409 }
        )
      } else if (usernameExists) {
        return NextResponse.json(
          { error: 'This username is already taken' },
          { status: 409 }
        )
      }
    }

    // Hash password securely
    const saltRounds = 12
    const hashedPassword = await bcrypt.hash(password, saltRounds)

    // Create user
    const newUser = await db.insert(users).values({
      username,
      email,
      password: hashedPassword,
    }).returning({ id: users.id, username: users.username, email: users.email })

    // Send verification email automatically (GitHub-style delayed verification)
    try {
      const verificationResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/auth/send-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });
      
      if (!verificationResponse.ok) {
        console.warn('Failed to send verification email during signup');
      }
    } catch (emailError) {
      console.warn('Failed to send verification email during signup:', emailError);
      // Don't fail the signup if email sending fails
    }

    // Track successful signup
    // trackPerformance('signup', Date.now() - startTime, true)
    
    // trackSecurity('signup', {
    //   userId: newUser[0].id,
    //   email: newUser[0].email,
    //   username: newUser[0].username,
    //   ipAddress: clientIP
    // })

    return NextResponse.json(
      { 
        message: 'Account created successfully! Please check your email to verify your account.',
        user: newUser[0],
        emailSent: true
      },
      { status: 201 }
    )

  } catch (error) {
    // trackPerformance('signup', Date.now() - startTime, false)
    
    // trackSecurity('failed_login', {
    //   ipAddress: clientIP,
    //   error: error instanceof Error ? error.message : 'Unknown error'
    // })
    
    // trackError('Signup failed', error as Error, {
    //   endpoint: 'signup',
    //   ipAddress: clientIP
    // })
    
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    )
  }
} 