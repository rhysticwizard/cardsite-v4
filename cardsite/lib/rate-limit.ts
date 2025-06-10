import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { NextRequest } from 'next/server'

// Initialize Redis client - using memory store for development
// In production, you'd use Upstash Redis with environment variables
const redis = process.env.UPSTASH_REDIS_REST_URL 
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : undefined

// Rate limit configurations for different endpoints
export const rateLimits = {
  // Authentication endpoints
  signin: new Ratelimit({
    redis: redis as any || new Map(), // Type assertion for development fallback
    limiter: Ratelimit.slidingWindow(5, '1 m'), // 5 attempts per minute
    analytics: true,
    prefix: 'ratelimit:signin',
  }),
  
  signup: new Ratelimit({
    redis: redis as any || new Map(),
    limiter: Ratelimit.slidingWindow(3, '1 m'), // 3 signups per minute
    analytics: true,
    prefix: 'ratelimit:signup',
  }),
  
  forgotPassword: new Ratelimit({
    redis: redis as any || new Map(),
    limiter: Ratelimit.slidingWindow(2, '1 m'), // 2 forgot password per minute
    analytics: true,
    prefix: 'ratelimit:forgot',
  }),
  
  checkAvailability: new Ratelimit({
    redis: redis as any || new Map(),
    limiter: Ratelimit.slidingWindow(10, '1 m'), // 10 availability checks per minute
    analytics: true,
    prefix: 'ratelimit:availability',
  }),
  
  // Email endpoints
  sendVerification: new Ratelimit({
    redis: redis as any || new Map(),
    limiter: Ratelimit.slidingWindow(3, '5 m'), // 3 verification emails per 5 minutes
    analytics: true,
    prefix: 'ratelimit:verify',
  }),
}

// Helper function to get client IP address
export function getClientIP(request: NextRequest): string {
  // Check various headers for the real IP
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  const cfConnectingIP = request.headers.get('cf-connecting-ip')
  
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  if (realIP) {
    return realIP
  }
  
  if (cfConnectingIP) {
    return cfConnectingIP
  }
  
  // Fallback to localhost for development
  return '127.0.0.1'
}

// Rate limit check function
export async function checkRateLimit(rateLimit: Ratelimit, identifier: string) {
  console.log(`🔍 Checking rate limit for identifier: ${identifier}`);
  
  try {
    const result = await rateLimit.limit(identifier)
    
    console.log(`📊 Rate limit result:`, {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: new Date(result.reset),
    });
    
    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: new Date(result.reset),
      retryAfter: Math.ceil((result.reset - Date.now()) / 1000), // seconds until reset
    }
  } catch (error) {
    console.error('❌ Rate limit check failed:', error)
    // Fail open - allow request if rate limiting fails
    return {
      success: true,
      limit: 0,
      remaining: 0,
      reset: new Date(),
      retryAfter: 0,
    }
  }
}

// Helper function to create consistent rate limit error responses
export function createRateLimitResponse(rateLimitResult: any) {
  return {
    error: 'Too many requests',
    message: `Rate limit exceeded. Try again in ${rateLimitResult.retryAfter} seconds.`,
    retryAfter: rateLimitResult.retryAfter,
    limit: rateLimitResult.limit,
    remaining: rateLimitResult.remaining,
  }
} 