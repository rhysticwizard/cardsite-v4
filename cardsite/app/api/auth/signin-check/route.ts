import { NextRequest, NextResponse } from 'next/server'
import { getClientIP } from '@/lib/simple-rate-limit'
import { checkGlobalRateLimit } from '@/lib/rate-limit-store'

export async function POST(request: NextRequest) {
  try {
    // Check rate limiting for signin attempts - 5 attempts per minute per IP
    const clientIP = getClientIP(request)
    const rateLimitInfo = checkGlobalRateLimit(`signin:${clientIP}`, 5, 60 * 1000)
    
    if (rateLimitInfo.isRateLimited) {
      console.log(`🚫 Rate limit exceeded for signin from IP: ${clientIP}`)
      return NextResponse.json(
        { 
          error: 'Too many requests',
          message: `Rate limit exceeded. Try again in ${rateLimitInfo.retryAfter} seconds.`,
          retryAfter: rateLimitInfo.retryAfter
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': '5',
            'X-RateLimit-Remaining': rateLimitInfo.remaining.toString(),
            'Retry-After': rateLimitInfo.retryAfter.toString(),
          }
        }
      )
    }

    // If not rate limited, return success
    return NextResponse.json(
      { allowed: true, remaining: rateLimitInfo.remaining },
      {
        headers: {
          'X-RateLimit-Limit': '5',
          'X-RateLimit-Remaining': rateLimitInfo.remaining.toString(),
        }
      }
    )

  } catch (error) {
    console.error('Signin check error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 