import { db } from './db'
import { errorLogs } from './db/schema'
import { eq, desc, and, count, sql } from 'drizzle-orm'

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical'
export type ErrorType = 
  | 'server_error' 
  | 'client_error' 
  | 'auth_error' 
  | 'database_error' 
  | 'api_error'
  | 'validation_error'
  | 'rate_limit_error'
  | 'external_service_error'

export interface ErrorContext {
  userId?: string
  url?: string
  userAgent?: string
  ip?: string
  method?: string
  statusCode?: number
  requestId?: string
  userEmail?: string
  additionalData?: Record<string, any>
}

export interface PerformanceMetric {
  operation: string
  duration: number
  success: boolean
  timestamp: Date
  userId?: string
  metadata?: Record<string, any>
}

export interface ErrorLogEntry {
  id: number
  userId: string | null
  errorType: string
  severity: string
  message: string
  stack: string | null
  url: string | null
  userAgent: string | null
  ip: string | null
  metadata: Record<string, any> | null
  resolved: boolean
  resolvedAt: Date | null
  resolvedBy: string | null
  createdAt: Date
}

class ErrorLogger {
  private performanceMetrics: PerformanceMetric[] = []

  /**
   * Track performance metrics with automatic slow operation detection
   */
  async trackPerformance(operation: string, fn: () => Promise<any>, context: ErrorContext = {}): Promise<any> {
    const start = Date.now()
    try {
      const result = await fn()
      const duration = Date.now() - start
      
      // Log slow operations as warnings
      if (duration > 1000) {
        await this.logError(
          `Slow operation detected: ${operation} took ${duration}ms`,
          'server_error',
          'medium',
          { ...context, additionalData: { operation, duration } }
        )
      }

      // Store performance metric
      this.performanceMetrics.push({
        operation,
        duration,
        success: true,
        timestamp: new Date(),
        userId: context.userId,
        metadata: context.additionalData
      })

      // Keep only last 100 metrics
      if (this.performanceMetrics.length > 100) {
        this.performanceMetrics = this.performanceMetrics.slice(-100)
      }

      return result
    } catch (error) {
      const duration = Date.now() - start
      
      await this.logError(
        `Operation failed: ${operation}`,
        'server_error',
        'high',
        { ...context, additionalData: { operation, duration, error: error instanceof Error ? error.message : String(error) } }
      )

      this.performanceMetrics.push({
        operation,
        duration,
        success: false,
        timestamp: new Date(),
        userId: context.userId,
        metadata: { ...context.additionalData, error: error instanceof Error ? error.message : String(error) }
      })

      if (this.performanceMetrics.length > 100) {
        this.performanceMetrics = this.performanceMetrics.slice(-100)
      }

      throw error
    }
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats() {
    if (this.performanceMetrics.length === 0) return null

    const recent = this.performanceMetrics.filter(m => 
      Date.now() - m.timestamp.getTime() < 60 * 60 * 1000 // Last hour
    )

    return {
      total: this.performanceMetrics.length,
      recent: recent.length,
      averageDuration: recent.length > 0 
        ? Math.round(recent.reduce((sum, m) => sum + m.duration, 0) / recent.length)
        : 0,
      successRate: recent.length > 0
        ? Math.round((recent.filter(m => m.success).length / recent.length) * 100)
        : 100,
      slowOperations: recent.filter(m => m.duration > 1000).length
    }
  }

  /**
   * Log an error with context information
   */
  async logError(
    error: Error | string,
    errorType: ErrorType,
    severity: ErrorSeverity,
    context: ErrorContext = {}
  ): Promise<number> {
    try {
      const errorMessage = error instanceof Error ? error.message : error
      const errorStack = error instanceof Error ? error.stack : undefined

      const metadata = {
        method: context.method,
        statusCode: context.statusCode,
        requestId: context.requestId,
        userEmail: context.userEmail,
        timestamp: new Date().toISOString(),
        ...context.additionalData,
      }

      const [result] = await db.insert(errorLogs).values({
        userId: context.userId || null,
        errorType,
        severity,
        message: errorMessage,
        stack: errorStack || null,
        url: context.url || null,
        userAgent: context.userAgent || null,
        ip: context.ip || null,
        metadata,
      }).returning({ id: errorLogs.id })

      // Log to console for immediate visibility
      const logMethod = severity === 'critical' ? console.error : 
                       severity === 'high' ? console.warn : console.log
      
      logMethod(`[${severity.toUpperCase()}] ${errorType}: ${errorMessage}`, {
        errorId: result.id,
        userId: context.userId,
        url: context.url,
      })

      return result.id
    } catch (logError) {
      // Fallback to console if database logging fails
      console.error('Failed to log error to database:', logError)
      console.error('Original error:', error)
      return -1
    }
  }

  /**
   * Log critical errors that need immediate attention
   */
  async logCritical(error: Error | string, context: ErrorContext = {}): Promise<number> {
    return this.logError(error, 'server_error', 'critical', context)
  }

  /**
   * Log authentication-related errors
   */
  async logAuthError(error: Error | string, context: ErrorContext = {}): Promise<number> {
    return this.logError(error, 'auth_error', 'medium', context)
  }

  /**
   * Log database errors
   */
  async logDatabaseError(error: Error | string, context: ErrorContext = {}): Promise<number> {
    return this.logError(error, 'database_error', 'high', context)
  }

  /**
   * Log API errors
   */
  async logApiError(error: Error | string, context: ErrorContext = {}): Promise<number> {
    return this.logError(error, 'api_error', 'medium', context)
  }

  /**
   * Log client-side errors
   */
  async logClientError(error: Error | string, context: ErrorContext = {}): Promise<number> {
    return this.logError(error, 'client_error', 'low', context)
  }

  /**
   * Get recent errors with filters
   */
  async getRecentErrors(options: {
    limit?: number
    severity?: ErrorSeverity
    errorType?: ErrorType
    resolved?: boolean
    userId?: string
  } = {}): Promise<any[]> {
    const {
      limit = 50,
      severity,
      errorType,
      resolved,
      userId,
    } = options

    const conditions = []
    if (severity) conditions.push(eq(errorLogs.severity, severity))
    if (errorType) conditions.push(eq(errorLogs.errorType, errorType))
    if (resolved !== undefined) conditions.push(eq(errorLogs.resolved, resolved))
    if (userId) conditions.push(eq(errorLogs.userId, userId))

    if (conditions.length > 0) {
      return await db
        .select()
        .from(errorLogs)
        .where(and(...conditions))
        .orderBy(desc(errorLogs.createdAt))
        .limit(limit)
    } else {
      return await db
        .select()
        .from(errorLogs)
        .orderBy(desc(errorLogs.createdAt))
        .limit(limit)
    }
  }

  /**
   * Get error statistics
   */
  async getErrorStats(timeframe: '1h' | '24h' | '7d' | '30d' = '24h'): Promise<{
    total: number
    critical: number
    high: number
    medium: number
    low: number
    resolved: number
    unresolved: number
    topErrorTypes: Array<{ type: string; count: number }>
  }> {
    const timeframes = {
      '1h': '1 hour',
      '24h': '24 hours',
      '7d': '7 days',
      '30d': '30 days',
    }

         // Get total counts by severity (use SQL for date comparison)
     const severityCounts = await db
       .select({
         severity: errorLogs.severity,
         count: count(errorLogs.id),
       })
       .from(errorLogs)
       .where(sql`${errorLogs.createdAt} >= NOW() - INTERVAL '${timeframes[timeframe]}'`)
       .groupBy(errorLogs.severity)

         // Get resolved vs unresolved
     const resolutionCounts = await db
       .select({
         resolved: errorLogs.resolved,
         count: count(errorLogs.id),
       })
       .from(errorLogs)
       .where(sql`${errorLogs.createdAt} >= NOW() - INTERVAL '${timeframes[timeframe]}'`)
       .groupBy(errorLogs.resolved)

     // Get top error types
     const topErrorTypes = await db
       .select({
         type: errorLogs.errorType,
         count: count(errorLogs.id),
       })
       .from(errorLogs)
       .where(sql`${errorLogs.createdAt} >= NOW() - INTERVAL '${timeframes[timeframe]}'`)
       .groupBy(errorLogs.errorType)
       .orderBy(desc(count(errorLogs.id)))
       .limit(10)

    const stats = {
      total: 0,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      resolved: 0,
      unresolved: 0,
      topErrorTypes: topErrorTypes.map(t => ({ type: t.type, count: Number(t.count) })),
    }

    // Process severity counts
    severityCounts.forEach(item => {
      const countNum = Number(item.count)
      stats.total += countNum
      switch (item.severity) {
        case 'critical': stats.critical = countNum; break
        case 'high': stats.high = countNum; break
        case 'medium': stats.medium = countNum; break
        case 'low': stats.low = countNum; break
      }
    })

    // Process resolution counts
    resolutionCounts.forEach(item => {
      const countNum = Number(item.count)
      if (item.resolved) {
        stats.resolved = countNum
      } else {
        stats.unresolved = countNum
      }
    })

    return stats
  }

  /**
   * Mark an error as resolved
   */
  async resolveError(errorId: number, resolvedBy?: string): Promise<boolean> {
    try {
      await db
        .update(errorLogs)
        .set({
          resolved: true,
          resolvedAt: new Date(),
          resolvedBy: resolvedBy || null,
        })
        .where(eq(errorLogs.id, errorId))

      return true
    } catch (error) {
      console.error('Failed to resolve error:', error)
      return false
    }
  }

  /**
   * Get unresolved critical errors (for alerting)
   */
  async getCriticalUnresolvedErrors(): Promise<ErrorLogEntry[]> {
    return await db
      .select()
      .from(errorLogs)
      .where(
        and(
          eq(errorLogs.severity, 'critical'),
          eq(errorLogs.resolved, false)
        )
      )
      .orderBy(desc(errorLogs.createdAt))
      .limit(10)
  }
}

// Export singleton instance
export const errorLogger = new ErrorLogger() 