import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

// 🔒 SECURITY HEADERS CONFIGURATION
const securityHeaders = {
  // Prevents clickjacking attacks
  'X-Frame-Options': 'DENY',
  
  // Prevents MIME type sniffing
  'X-Content-Type-Options': 'nosniff',
  
  // Enables XSS filtering in browsers
  'X-XSS-Protection': '1; mode=block',
  
  // Controls referrer information
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  
  // Prevents browsers from inferring content type
  'X-DNS-Prefetch-Control': 'off',
  
  // Security policy for downloads
  'X-Download-Options': 'noopen',
  
  // Prevents content sniffing for IE
  'X-Permitted-Cross-Domain-Policies': 'none',
  
  // HSTS - Forces HTTPS (only in production)
  ...(process.env.NODE_ENV === 'production' && {
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload'
  }),
  
  // Content Security Policy
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://challenges.cloudflare.com https://www.google.com https://www.gstatic.com https://discord.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://rsms.me",
    "font-src 'self' https://fonts.gstatic.com https://rsms.me",
    "img-src 'self' data: https: blob:",
    "media-src 'self' https:",
    "connect-src 'self' https://api.scryfall.com https://cards.scryfall.io https://discord.com https://discordapp.com wss: ws:" + 
      (process.env.NODE_ENV === 'development' ? ' http://localhost:5746 http://localhost:5747 ws://localhost:5746 ws://localhost:5747' : ''),
    "frame-src 'self' https://www.google.com https://discord.com https://challenges.cloudflare.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests"
  ].join('; '),
  
  // Permissions Policy (Feature Policy)
  'Permissions-Policy': [
    'camera=()',
    'microphone=()',
    'geolocation=()',
    'interest-cohort=()',
    'payment=()',
    'usb=()',
    'magnetometer=()',
    'accelerometer=()',
    'gyroscope=()'
  ].join(', ')
}

// 🛡️ CSRF PROTECTION CONFIGURATION
const CSRF_SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS']
const CSRF_HEADER_NAME = 'x-csrf-token'

// Generate CSRF token
function generateCSRFToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

// Validate CSRF token
function validateCSRFToken(token: string, sessionToken: string): boolean {
  if (!token || !sessionToken) return false
  
  // Create expected token based on session
  const expected = Array.from(new TextEncoder().encode(sessionToken + process.env.NEXTAUTH_SECRET))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .substring(0, 64)
  
  return token === expected
}

// Create CSRF token based on session
function createCSRFToken(sessionToken: string): string {
  if (!sessionToken) return generateCSRFToken()
  
  return Array.from(new TextEncoder().encode(sessionToken + process.env.NEXTAUTH_SECRET))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .substring(0, 64)
}

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()
  
  // 🔒 Apply security headers to all responses
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value)
  })
  
  // 🛡️ CSRF Protection for state-changing requests
  if (!CSRF_SAFE_METHODS.includes(request.method)) {
    // Skip CSRF for NextAuth internal endpoints
    if (request.nextUrl.pathname.startsWith('/api/auth/')) {
      return response
    }
    
    // Get session token for CSRF validation
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET
    })
    
    if (token) {
      const sessionToken = request.cookies.get(
        process.env.NODE_ENV === 'production' 
          ? '__Secure-next-auth.session-token'
          : 'next-auth.session-token'
      )?.value
      
      if (sessionToken) {
        const csrfToken = request.headers.get(CSRF_HEADER_NAME)
        const expectedToken = createCSRFToken(sessionToken)
        
        if (!csrfToken || csrfToken !== expectedToken) {
          console.warn(`🚫 CSRF token validation failed for ${request.method} ${request.nextUrl.pathname}`)
          return new NextResponse('CSRF token mismatch', { 
            status: 403,
            headers: Object.fromEntries(Object.entries(securityHeaders))
          })
        }
      }
    }
  }
  
  // 🔐 Add CSRF token to response headers for authenticated users
  if (request.nextUrl.pathname.startsWith('/api/') || 
      request.nextUrl.pathname === '/' ||
      request.nextUrl.pathname.startsWith('/auth/') ||
      request.nextUrl.pathname.startsWith('/profile/')) {
    
    const sessionToken = request.cookies.get(
      process.env.NODE_ENV === 'production' 
        ? '__Secure-next-auth.session-token'
        : 'next-auth.session-token'
    )?.value
    
    if (sessionToken) {
      const csrfToken = createCSRFToken(sessionToken)
      response.headers.set('X-CSRF-Token', csrfToken)
    }
  }
  
  // 🔍 Security logging for sensitive endpoints
  if (request.nextUrl.pathname.startsWith('/api/auth/') ||
      request.nextUrl.pathname.startsWith('/api/security/')) {
    
    const userAgent = request.headers.get('user-agent') || 'unknown'
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
               request.headers.get('x-real-ip') || 
               'unknown'
    
    console.log(`🔍 Security Request: ${request.method} ${request.nextUrl.pathname} from ${ip}`)
  }
  
  return response
}

// 🎯 Configure middleware to run on specific paths
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
} 