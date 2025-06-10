import { NextRequest } from 'next/server'

interface RateLimitData {
  count: number
  resetTime: number
}

// In-memory storage for rate limiting
const rateLimitStore = new Map<string, RateLimitData>()

// Rate limit configurations - Relaxed for development
export const RATE_LIMITS = {
  SIGNUP: { requests: 20, windowMs: 60 * 1000 }, // 20 requests per minute (dev-friendly)
  SIGNIN: { requests: 20, windowMs: 60 * 1000 }, // 20 requests per minute
  AVAILABILITY: { requests: 50, windowMs: 60 * 1000 }, // 50 requests per minute
  FORGOT_PASSWORD: { requests: 10, windowMs: 60 * 1000 }, // 10 requests per minute
}

// Get client IP
export function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  if (realIP) {
    return realIP
  }
  
  return '127.0.0.1'
}

// Check rate limit
export function checkRateLimit(
  identifier: string, 
  config: { requests: number; windowMs: number }
): { 
  allowed: boolean; 
  remaining: number; 
  resetTime: number;
  retryAfter: number;
} {
  const now = Date.now()
  const key = identifier
  
  // Clean up expired entries
  for (const [k, v] of rateLimitStore.entries()) {
    if (now > v.resetTime) {
      rateLimitStore.delete(k)
    }
  }
  
  let data = rateLimitStore.get(key)
  
  if (!data || now > data.resetTime) {
    // Create new entry
    data = {
      count: 0,
      resetTime: now + config.windowMs
    }
  }
  
  data.count++
  rateLimitStore.set(key, data)
  
  const allowed = data.count <= config.requests
  const remaining = Math.max(0, config.requests - data.count)
  const retryAfter = allowed ? 0 : Math.ceil((data.resetTime - now) / 1000)
  
  console.log(`🔍 Rate limit check: ${identifier} - ${data.count}/${config.requests} (allowed: ${allowed})`)
  
  return {
    allowed,
    remaining,
    resetTime: data.resetTime,
    retryAfter
  }
}

// Create rate limit error response
export function createRateLimitError(retryAfter: number) {
  return {
    error: 'Too many requests',
    message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
    retryAfter
  }
} 