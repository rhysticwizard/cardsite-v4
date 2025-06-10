import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import DiscordProvider from 'next-auth/providers/discord'
import CredentialsProvider from 'next-auth/providers/credentials'
import { db } from './db/index'
import { users } from './db/schema'
import bcrypt from 'bcryptjs'
import { eq, sql } from 'drizzle-orm'
import { checkGlobalRateLimit } from './rate-limit-store'
import { 
  createSecurityEvent, 
  sessionMonitor
} from './session-security'
import { findUserByEmail } from './db/encrypted-operations'
// Simple monitoring integration
import { setUserContext, clearUserContext } from '@/lib/monitoring'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      emailVerified?: Date | null
    }
  }
  
  interface User {
    id: string
    email: string
    name?: string | null
    image?: string | null
    emailVerified?: Date | null
  }
}

// Enhanced session security configuration
const isProduction = process.env.NODE_ENV === 'production'

export const authOptions: NextAuthOptions = {
  // Remove adapter to avoid conflicts with JWT + credentials
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          console.log('Missing email or password')

          return null
        }

        // const authTimer = createPerformanceTimer(MetricType.AUTH_LOGIN_TIME)
        
        try {
          console.log('🔍 NextAuth authorize function called with email:', credentials.email)
          
          // Rate limiting for signin attempts - 5 attempts per minute per IP
          // We need to get IP from the request context
          let clientIP = '127.0.0.1'
          if (req && req.headers) {
            const forwarded = req.headers['x-forwarded-for']
            const realIP = req.headers['x-real-ip']
            
            if (forwarded) {
              clientIP = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0].trim()
            } else if (realIP) {
              clientIP = Array.isArray(realIP) ? realIP[0] : realIP
            }
          }
          
          console.log(`🔍 Rate limiting check for IP: ${clientIP}`)
          const rateLimitInfo = checkGlobalRateLimit(`signin:${clientIP}`, 5, 60 * 1000)
          console.log(`🔍 Rate limit info:`, rateLimitInfo)
          
          if (rateLimitInfo.isRateLimited) {
            console.log(`🚫 Rate limit exceeded for signin from IP: ${clientIP}`)
            // trackSecurityEvent(SecurityEventType.RATE_LIMIT_EXCEEDED, {
            //   ipAddress: clientIP,
            //   metadata: { 
            //     endpoint: 'signin',
            //     retryAfter: rateLimitInfo.retryAfter 
            //   },
            //   severity: ErrorSeverity.HIGH
            // })
            // authTimer.end({ success: false, reason: 'rate_limited' })
            throw new Error(`Rate limit exceeded. Please wait ${rateLimitInfo.retryAfter} seconds before trying again.`)
          }

          // Use encrypted user lookup
          const foundUser = await findUserByEmail(credentials.email)
          
          if (!foundUser || !foundUser.password) {
            console.log('User not found or no password set')
            // trackSecurityEvent(SecurityEventType.SIGN_IN_FAILED, {
            //   metadata: { 
            //     reason: 'user_not_found',
            //     email: credentials.email 
            //   },
            //   ipAddress: clientIP
            // })
            // authTimer.end({ success: false, reason: 'user_not_found' })
            return null
          }
          
          // const passwordCheckTimer = createPerformanceTimer(MetricType.PASSWORD_CHECK_TIME)
          const passwordMatch = await bcrypt.compare(credentials.password, foundUser.password!)
          // passwordCheckTimer.end({ userId: foundUser.id })

          if (!passwordMatch) {
            console.log('Password does not match')
            // trackSecurityEvent(SecurityEventType.SIGN_IN_FAILED, {
            //   userId: foundUser.id,
            //   metadata: { 
            //     reason: 'password_mismatch',
            //     email: credentials.email 
            //   },
            //   ipAddress: clientIP,
            //   severity: ErrorSeverity.MEDIUM
            // })
            // authTimer.end({ success: false, reason: 'password_mismatch' })
            return null
          }

          console.log('Authentication successful for user:', foundUser.email)
          
          // Track successful auth metrics (commented out for now)
          // const authDuration = authTimer.end({ success: true })
          // trackAuthMetrics('login', authDuration, true)
          
          // Track successful security event (commented out for now)
          // trackSecurityEvent(SecurityEventType.SIGN_IN_SUCCESS, {
          //   userId: foundUser.id,
          //   metadata: {
          //     email: foundUser.email,
          //     provider: 'credentials'
          //   },
          //   ipAddress: clientIP
          // })
          
          return {
            id: foundUser.id,
            email: foundUser.email,
            name: foundUser.name,
            image: foundUser.image,
            emailVerified: foundUser.emailVerified,
          }
        } catch (error) {
          console.error('Authentication error:', error)
          
          // Capture error for monitoring (commented out for now)
          // captureError(error as Error, {
          //   severity: ErrorSeverity.HIGH,
          //   metadata: {
          //     endpoint: 'auth.authorize',
          //     email: credentials.email
          //   }
          // })
          
          // Re-throw rate limit errors to be caught by NextAuth
          if (error instanceof Error && error.message.includes('Rate limit exceeded')) {
            throw error
          }
          
          // End auth timer with error (commented out for now)
          // authTimer.end({ success: false, reason: 'auth_error' })
          // trackAuthMetrics('login', undefined, false)
          
          return null
        }
      }
    }),
    // OAuth Providers
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID || '',
      clientSecret: process.env.DISCORD_CLIENT_SECRET || '',
      authorization: {
        params: {
          scope: 'identify email',
        },
      },
    }),
  ],
  // 🔒 ENHANCED SESSION SECURITY CONFIGURATION
  session: {
    strategy: 'jwt',
    // Shorter session duration for production security
    maxAge: isProduction 
      ? 7 * 24 * 60 * 60    // 7 days in production
      : 30 * 24 * 60 * 60,  // 30 days in development
    // Update session activity
    updateAge: 60 * 60,     // Update session every hour (3600 seconds)
  },
  
  // 🍪 SECURE COOKIE CONFIGURATION
  cookies: {
    sessionToken: {
      name: isProduction ? '__Secure-next-auth.session-token' : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: isProduction,      // HTTPS only in production
        domain: isProduction ? process.env.NEXTAUTH_URL?.replace(/https?:\/\//, '') : undefined,
        maxAge: isProduction ? 7 * 24 * 60 * 60 : 30 * 24 * 60 * 60,
      },
    },
    callbackUrl: {
      name: isProduction ? '__Secure-next-auth.callback-url' : 'next-auth.callback-url',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: isProduction,
        maxAge: 60 * 60,  // 1 hour for callback URLs
      },
    },
    csrfToken: {
      name: isProduction ? '__Host-next-auth.csrf-token' : 'next-auth.csrf-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: isProduction,
        maxAge: 60 * 60,  // 1 hour for CSRF tokens
      },
    },
  },
  
  // 🔐 ENHANCED JWT SECURITY
  jwt: {
    // Custom JWT encoding for additional security
    maxAge: isProduction ? 7 * 24 * 60 * 60 : 30 * 24 * 60 * 60,
    // Use environment secret for JWT signing
    secret: process.env.NEXTAUTH_SECRET,
  },
  
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // Enhanced JWT setup with Phase 2 security features
        token.id = user.id
        token.email = user.email
        token.name = user.name
        token.image = user.image
        token.emailVerified = user.emailVerified
        
        // Add session security metadata
        token.sessionId = crypto.randomUUID()
        token.lastActivity = Math.floor(Date.now() / 1000)
        token.iat = Math.floor(Date.now() / 1000)
        
        // Set user context for monitoring
        setUserContext({
          id: user.id,
          email: user.email
        })
        
        // Record security event for sign-in
        sessionMonitor.recordEvent(createSecurityEvent('SIGN_IN', {
          userId: user.id,
          sessionId: token.sessionId as string,
          timestamp: new Date().toISOString(),
          metadata: { email: user.email, provider: 'credentials' }
        }))
        
        console.log('🔐 JWT created for user:', user.email)
        console.log('🛡️ Security event recorded: SIGN_IN')
      }
      
      return token
    },
    
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.email = token.email as string
        session.user.name = token.name as string | null
        session.user.image = token.image as string | null
        session.user.emailVerified = token.emailVerified as Date | null
        
        // Add security metadata to session (but don't expose sensitive data)
        ;(session as any).sessionId = token.sessionId as string
        ;(session as any).lastActivity = token.lastActivity as number
      }
      return session
    },
    
    // 🛡️ ENHANCED SECURITY CALLBACKS
    async signIn({ user, account, profile, email, credentials }) {
      // Allow sign in for all valid authentications
      // Additional security checks can be added here
      
      // Log successful sign-ins for monitoring
      console.log('🔐 Successful sign-in:', {
        userId: user.id,
        email: user.email,
        provider: account?.provider,
        timestamp: new Date().toISOString(),
      })
      
      return true
    },
    
    async redirect({ url, baseUrl }) {
      // Security: Only allow redirects to same origin
      if (url.startsWith('/')) {
        return `${baseUrl}${url}`
      }
      // Allow redirects to the same origin
      if (new URL(url).origin === baseUrl) {
        return url
      }
      // Default fallback
      return baseUrl
    },
  },
  
  // 📊 ENHANCED SECURITY EVENTS (Phase 2 Complete)
  events: {
    async signIn({ user, account, profile, isNewUser }) {
      // Record detailed sign-in event
      sessionMonitor.recordEvent(createSecurityEvent('SIGN_IN', {
        userId: user.id,
        provider: account?.provider,
        timestamp: new Date().toISOString(),
        metadata: { 
          isNewUser,
          email: user.email,
          provider: account?.provider 
        },
      }))
      
      console.log('🔐 Sign-in event recorded:', { 
        user: user.email, 
        provider: account?.provider,
        isNewUser 
      })
    },
    
    async signOut({ session, token }) {
      const userId = (token?.id as string) || (session?.user?.id as string)
      
            // Clear user context for monitoring
      clearUserContext()
      
      // Record sign-out event
      sessionMonitor.recordEvent(createSecurityEvent('SIGN_OUT', {
        userId,
        sessionId: (token as any)?.sessionId,
        timestamp: new Date().toISOString(),
      }))
      
      console.log('🚪 Sign-out event recorded:', { userId })
    },
  },
  
  // 🐛 DEBUG & SECURITY LOGGING
  debug: process.env.NODE_ENV === 'development',
  
  // 🔒 PRODUCTION SECURITY SETTINGS
  useSecureCookies: isProduction,
  
  logger: {
    error(code, metadata) {
      console.error('NextAuth Error:', code, metadata)
      

    },
    warn(code) {
      console.warn('NextAuth Warning:', code)
    },
    debug(code, metadata) {
      if (!isProduction) {
        console.log('NextAuth Debug:', code, metadata)
      }
    },
  },
} 