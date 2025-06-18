/**
 * Session Security Utilities
 * Provides enhanced session management and security features
 */

export interface SessionSecurityConfig {
  maxSessionAge: number      // Maximum session lifetime (seconds)
  maxInactivity: number      // Maximum inactivity before forced logout (seconds)
  updateInterval: number     // How often to update session activity (seconds)
  sessionRotationTime: number // How often to rotate session tokens (seconds)
}

export interface SecurityEvent {
  type: 'SIGN_IN' | 'SIGN_OUT' | 'SESSION_EXPIRED' | 'FORCED_LOGOUT' | 'SESSION_ACTIVITY'
  userId?: string
  sessionId?: string
  provider?: string
  ipAddress?: string
  userAgent?: string
  timestamp: string
  metadata?: Record<string, any>
}

// Production vs Development session security configurations
export const SESSION_SECURITY_CONFIG: SessionSecurityConfig = {
  maxSessionAge: process.env.NODE_ENV === 'production' 
    ? 7 * 24 * 60 * 60    // 7 days in production
    : 30 * 24 * 60 * 60,  // 30 days in development
  maxInactivity: 24 * 60 * 60,  // 24 hours max inactivity
  updateInterval: 60 * 60,      // Update every hour
  sessionRotationTime: 6 * 60 * 60,  // Rotate session every 6 hours
}

/**
 * Validates if a session is still valid based on security policies
 */
export function validateSessionSecurity(token: any): {
  isValid: boolean
  reason?: string
  shouldRefresh?: boolean
} {
  const now = Math.floor(Date.now() / 1000)
  
  // Check if session is too old
  if (token.iat && (now - token.iat) > SESSION_SECURITY_CONFIG.maxSessionAge) {
    return {
      isValid: false,
      reason: 'Session expired (max age exceeded)'
    }
  }
  
  // Check for inactivity timeout
  if (token.lastActivity && (now - token.lastActivity) > SESSION_SECURITY_CONFIG.maxInactivity) {
    return {
      isValid: false,
      reason: 'Session expired (inactivity timeout)'
    }
  }
  
  // Check if session should be rotated
  if (token.iat && (now - token.iat) > SESSION_SECURITY_CONFIG.sessionRotationTime) {
    return {
      isValid: true,
      shouldRefresh: true,
      reason: 'Session should be rotated'
    }
  }
  
  return { isValid: true }
}

/**
 * Creates a security event log entry
 */
export function createSecurityEvent(
  type: SecurityEvent['type'],
  data: Partial<SecurityEvent>
): SecurityEvent {
  return {
    type,
    timestamp: new Date().toISOString(),
    ...data
  }
}

/**
 * Logs security events (in production, this would go to a logging service)
 */
export function logSecurityEvent(event: SecurityEvent): void {
  // In production, send to logging service
  // Examples:
  // - Sentry for error tracking
  // - CloudWatch Logs
  // - Datadog
  // - Custom security monitoring system
  
  // await securityLogger.log(event)
  // await sentry.addBreadcrumb({ category: 'security', data: event })
}

/**
 * Gets client information for security logging
 */
export function getClientSecurityInfo(request?: any): {
  ipAddress: string
  userAgent: string
} {
  if (!request) {
    return {
      ipAddress: '127.0.0.1',
      userAgent: 'Unknown'
    }
  }
  
  // Extract IP address
  const forwarded = request.headers?.get?.('x-forwarded-for') || request.headers?.['x-forwarded-for']
  const realIP = request.headers?.get?.('x-real-ip') || request.headers?.['x-real-ip']
  const cfConnectingIP = request.headers?.get?.('cf-connecting-ip') || request.headers?.['cf-connecting-ip']
  
  let ipAddress = '127.0.0.1'
  if (forwarded) {
    ipAddress = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0].trim()
  } else if (realIP) {
    ipAddress = Array.isArray(realIP) ? realIP[0] : realIP
  } else if (cfConnectingIP) {
    ipAddress = Array.isArray(cfConnectingIP) ? cfConnectingIP[0] : cfConnectingIP
  }
  
  // Extract User Agent
  const userAgent = request.headers?.get?.('user-agent') || request.headers?.['user-agent'] || 'Unknown'
  
  return {
    ipAddress,
    userAgent: Array.isArray(userAgent) ? userAgent[0] : userAgent
  }
}

/**
 * Generates secure session metadata
 */
export function generateSessionMetadata(): {
  sessionId: string
  issuedAt: number
  lastActivity: number
} {
  const now = Math.floor(Date.now() / 1000)
  
  return {
    sessionId: crypto.randomUUID(),
    issuedAt: now,
    lastActivity: now
  }
}

/**
 * Checks if session needs security refresh
 */
export function shouldRefreshSession(token: any): boolean {
  if (!token.iat) return false
  
  const now = Math.floor(Date.now() / 1000)
  const sessionAge = now - token.iat
  
  // Refresh if session is older than rotation time
  return sessionAge > SESSION_SECURITY_CONFIG.sessionRotationTime
}

/**
 * Production security headers for session cookies
 */
export function getSecureCookieOptions(isProduction: boolean) {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax' as const,
    path: '/',
    domain: isProduction ? process.env.NEXTAUTH_URL?.replace(/https?:\/\//, '') : undefined,
  }
}

/**
 * Session monitoring and analytics (for production)
 */
export class SessionMonitor {
  private static instance: SessionMonitor
  private events: SecurityEvent[] = []
  
  public static getInstance(): SessionMonitor {
    if (!SessionMonitor.instance) {
      SessionMonitor.instance = new SessionMonitor()
    }
    return SessionMonitor.instance
  }
  
  public recordEvent(event: SecurityEvent): void {
    this.events.push(event)
    logSecurityEvent(event)
    
    // Keep only last 1000 events in memory (for development)
    if (this.events.length > 1000) {
      this.events = this.events.slice(-1000)
    }
  }
  
  public getRecentEvents(limit: number = 100): SecurityEvent[] {
    return this.events.slice(-limit)
  }
  
  public getEventsByType(type: SecurityEvent['type']): SecurityEvent[] {
    return this.events.filter(event => event.type === type)
  }
  
  public getEventsByUser(userId: string): SecurityEvent[] {
    return this.events.filter(event => event.userId === userId)
  }
  
  // Security analytics methods
  public getFailedLoginAttempts(timeWindow: number = 3600): SecurityEvent[] {
    const cutoff = Date.now() - (timeWindow * 1000)
    return this.events.filter(event => 
      event.type === 'SIGN_IN' && 
      new Date(event.timestamp).getTime() > cutoff
    )
  }
  
  public getActiveSessionCount(): number {
    // In production, this would query the session store
    return this.getEventsByType('SIGN_IN').length - this.getEventsByType('SIGN_OUT').length
  }
}

// Export singleton instance
export const sessionMonitor = SessionMonitor.getInstance() 