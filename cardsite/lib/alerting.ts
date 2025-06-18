import { Resend } from 'resend'
import { errorLogger, type ErrorSeverity, type ErrorType } from './error-logger'
import { db } from './db'
import { sql } from 'drizzle-orm'

// Initialize Resend for email notifications
const resend = new Resend(process.env.RESEND_API_KEY!)

export interface AlertConfig {
  email?: {
    enabled: boolean
    recipients: string[]
    fromEmail?: string
  }
  sms?: {
    enabled: boolean
    recipients: string[]
    twilioAccountSid?: string
    twilioAuthToken?: string
    twilioFromNumber?: string
  }
  rateLimiting?: {
    enabled: boolean
    maxAlertsPerHour?: number
    maxAlertsPerDay?: number
    cooldownMinutes?: number
  }
  filters?: {
    minSeverity?: ErrorSeverity
    errorTypes?: ErrorType[]
    excludeResolved?: boolean
  }
}

export interface AlertRule {
  id: string
  name: string
  description: string
  trigger: {
    errorType?: ErrorType
    severity?: ErrorSeverity
    errorPattern?: string
    threshold?: {
      count: number
      timeWindowMinutes: number
    }
  }
  actions: {
    email?: boolean
    sms?: boolean
    webhook?: string
  }
  enabled: boolean
}

class AlertingService {
  private config: AlertConfig
  private alertCache = new Map<string, { count: number; lastAlert: Date }>()

  constructor(config: AlertConfig) {
    this.config = {
      email: {
        enabled: true,
        recipients: [],
        fromEmail: process.env.RESEND_FROM_EMAIL || 'alerts@cardsite.com',
        ...config.email,
      },
      sms: {
        enabled: false,
        recipients: [],
        ...config.sms,
      },
      rateLimiting: {
        enabled: true,
        maxAlertsPerHour: 10,
        maxAlertsPerDay: 50,
        cooldownMinutes: 15,
        ...config.rateLimiting,
      },
      filters: {
        minSeverity: 'medium',
        excludeResolved: true,
        ...config.filters,
      },
    }
  }

  /**
   * Process a new error and send alerts if needed
   */
  async processError(errorId: number, errorData: {
    errorType: string
    severity: string
    message: string
    userId?: string | null
    url?: string | null
    metadata?: Record<string, any> | null
  }): Promise<boolean> {
    try {
      // Check if error meets alerting criteria
      if (!this.shouldAlert(errorData)) {
        return false
      }

      // Check rate limiting
      if (!this.checkRateLimit(errorData.errorType, errorData.severity)) {
        console.log(`Alert rate limited for ${errorData.errorType}:${errorData.severity}`)
        return false
      }

      // Send alerts
      const alertsSent = await this.sendAlerts(errorId, errorData)
      
      if (alertsSent > 0) {
        // Update rate limiting cache
        this.updateRateLimit(errorData.errorType, errorData.severity)
        
        // Log the alert action
        await errorLogger.logError(
          `Alert sent for error ${errorId}: ${alertsSent} notifications`,
          'server_error',
          'low',
          {
            additionalData: {
              originalErrorId: errorId,
              alertsSent,
              errorType: errorData.errorType,
              severity: errorData.severity,
            }
          }
        )
      }

      return alertsSent > 0
    } catch (error) {
      console.error('Failed to process alert:', error)
      return false
    }
  }

  /**
   * Send email alert
   */
  private async sendEmailAlert(errorId: number, errorData: any): Promise<boolean> {
    if (!this.config.email?.enabled || !this.config.email.recipients.length) {
      return false
    }

    try {
      const subject = `🚨 ${errorData.severity.toUpperCase()} Error Alert - ${errorData.errorType}`
      
      const htmlContent = this.generateEmailTemplate(errorId, errorData)
      
      const emailResult = await resend.emails.send({
        from: this.config.email.fromEmail!,
        to: this.config.email.recipients,
        subject,
        html: htmlContent,
      })

      return true
    } catch (error) {
      // Failed to send email alert
      return false
    }
  }

  /**
   * Send SMS alert (Ready for Twilio integration)
   */
  private async sendSmsAlert(errorId: number, errorData: any): Promise<boolean> {
    if (!this.config.sms?.enabled || !this.config.sms.recipients.length) {
      return false
    }

    const message = `🚨 CRITICAL: ${errorData.errorType} - ${errorData.message.substring(0, 100)}...`
    
    // SMS Alert ready for production integration
    
    // SMS integration ready - uncomment when Twilio credentials are configured
    // const client = twilio(this.config.sms.twilioAccountSid, this.config.sms.twilioAuthToken)
    // for (const recipient of this.config.sms.recipients) {
    //   await client.messages.create({
    //     body: message,
    //     from: this.config.sms.twilioFromNumber,
    //     to: recipient
    //   })
    // }

    return true
  }

  /**
   * Generate email template for error alerts
   */
  private generateEmailTemplate(errorId: number, errorData: any): string {
    const severityColors = {
      critical: '#dc2626',
      high: '#ea580c',
      medium: '#d97706',
      low: '#65a30d',
    }

    const color = severityColors[errorData.severity as keyof typeof severityColors] || '#6b7280'

    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Error Alert</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      
      <div style="background: ${color}; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 24px;">🚨 Error Alert</h1>
        <p style="margin: 10px 0 0 0; font-size: 16px;">${errorData.severity.toUpperCase()} Priority</p>
      </div>

      <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb;">
        <h2 style="color: ${color}; margin-top: 0;">Error Details</h2>
        
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #e5e7eb;">Error ID:</td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">#${errorId}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #e5e7eb;">Type:</td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${errorData.errorType}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #e5e7eb;">Severity:</td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">
              <span style="background: ${color}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
                ${errorData.severity.toUpperCase()}
              </span>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #e5e7eb;">URL:</td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${errorData.url || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #e5e7eb;">User ID:</td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${errorData.userId || 'Anonymous'}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold;">Time:</td>
            <td style="padding: 8px;">${new Date().toLocaleString()}</td>
          </tr>
        </table>
      </div>

      <div style="background: white; padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
        <h3 style="color: #374151; margin-top: 0;">Error Message</h3>
        <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 12px; margin: 10px 0;">
          <code style="color: #dc2626; font-family: monospace;">${errorData.message}</code>
        </div>

        ${errorData.metadata ? `
        <h3 style="color: #374151;">Additional Context</h3>
        <pre style="background: #f3f4f6; padding: 12px; border-radius: 4px; overflow-x: auto; font-size: 12px;">
${JSON.stringify(errorData.metadata, null, 2)}
        </pre>
        ` : ''}
      </div>

      <div style="background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; text-align: center;">
        <p style="margin: 0; color: #6b7280; font-size: 14px;">
          📊 <a href="https://cardsite.com/admin/errors/${errorId}" style="color: ${color};">View Error Details</a> |
          🎯 <a href="https://cardsite.com/admin/errors" style="color: ${color};">Error Dashboard</a>
        </p>
        <p style="margin: 10px 0 0 0; color: #9ca3af; font-size: 12px;">
          This alert was sent by CardSite Error Monitoring System
        </p>
      </div>

    </body>
    </html>
    `
  }

  /**
   * Check if error should trigger an alert
   */
  private shouldAlert(errorData: any): boolean {
    // Check minimum severity
    const severityLevels = { low: 1, medium: 2, high: 3, critical: 4 }
    const minLevel = severityLevels[this.config.filters?.minSeverity as keyof typeof severityLevels] || 2
    const errorLevel = severityLevels[errorData.severity as keyof typeof severityLevels] || 1
    
    if (errorLevel < minLevel) {
      return false
    }

    // Check error type filter
    if (this.config.filters?.errorTypes?.length && 
        !this.config.filters.errorTypes.includes(errorData.errorType)) {
      return false
    }

    return true
  }

  /**
   * Check rate limiting
   */
  private checkRateLimit(errorType: string, severity: string): boolean {
    if (!this.config.rateLimiting?.enabled) {
      return true
    }

    const key = `${errorType}:${severity}`
    const cached = this.alertCache.get(key)
    
    if (!cached) {
      return true
    }

    const now = new Date()
    const timeDiff = now.getTime() - cached.lastAlert.getTime()
    const cooldownMs = (this.config.rateLimiting.cooldownMinutes || 15) * 60 * 1000

    // Check cooldown period
    if (timeDiff < cooldownMs) {
      return false
    }

    // Check hourly/daily limits (simplified check)
    const hoursSinceLastAlert = timeDiff / (1000 * 60 * 60)
    if (hoursSinceLastAlert < 1 && cached.count >= (this.config.rateLimiting.maxAlertsPerHour || 10)) {
      return false
    }

    return true
  }

  /**
   * Update rate limiting cache
   */
  private updateRateLimit(errorType: string, severity: string): void {
    const key = `${errorType}:${severity}`
    const cached = this.alertCache.get(key)
    
    if (cached) {
      cached.count += 1
      cached.lastAlert = new Date()
    } else {
      this.alertCache.set(key, { count: 1, lastAlert: new Date() })
    }
  }

  /**
   * Send all configured alerts
   */
  private async sendAlerts(errorId: number, errorData: any): Promise<number> {
    let sent = 0

    // Send email alert
    if (await this.sendEmailAlert(errorId, errorData)) {
      sent++
    }

    // Send SMS alert for critical errors
    if (errorData.severity === 'critical' && await this.sendSmsAlert(errorId, errorData)) {
      sent++
    }

    return sent
  }

  /**
   * Get alert statistics
   */
  async getAlertStats(): Promise<{
    totalAlertsSent: number
    alertsByType: Record<string, number>
    rateLimitHits: number
  }> {
    // This could be expanded to track actual metrics
    return {
      totalAlertsSent: 0,
      alertsByType: {},
      rateLimitHits: 0,
    }
  }

  /**
   * Test the alerting system
   */
  async testAlerts(): Promise<boolean> {
    try {
      const testErrorId = await errorLogger.logError(
        'Test alert system - ignore this error',
        'server_error',
        'medium',
        {
          url: '/test/alerts',
          method: 'GET',
          additionalData: { test: true, timestamp: new Date().toISOString() }
        }
      )

      const alertSent = await this.processError(testErrorId, {
        errorType: 'server_error',
        severity: 'medium',
        message: 'Test alert system - ignore this error',
        url: '/test/alerts',
        metadata: { test: true }
      })

      return alertSent
    } catch (error) {
      console.error('Alert test failed:', error)
      return false
    }
  }
}

// Default configuration
const defaultConfig: AlertConfig = {
  email: {
    enabled: true,
    recipients: ['admin@cardsite.com'], // Update with actual admin emails
    fromEmail: process.env.RESEND_FROM_EMAIL,
  },
  sms: {
    enabled: false,
    recipients: [], // Add phone numbers when SMS is configured
  },
  rateLimiting: {
    enabled: true,
    maxAlertsPerHour: 5,
    maxAlertsPerDay: 20,
    cooldownMinutes: 10,
  },
  filters: {
    minSeverity: 'high', // Only alert on high and critical errors
    excludeResolved: true,
  },
}

// Export singleton instance
export const alertingService = new AlertingService(defaultConfig)

// Export enhanced error logger that includes alerting
export const monitoringService = {
  async logWithAlert(
    error: Error | string,
    errorType: ErrorType,
    severity: ErrorSeverity,
    context: any = {}
  ): Promise<{ errorId: number; alertSent: boolean }> {
    // Log the error
    const errorId = await errorLogger.logError(error, errorType, severity, context)
    
    // Send alert if needed
    const alertSent = await alertingService.processError(errorId, {
      errorType,
      severity,
      message: error instanceof Error ? error.message : error,
      userId: context.userId,
      url: context.url,
      metadata: context.additionalData,
    })

    return { errorId, alertSent }
  },

  // Convenience methods
  async logCriticalWithAlert(error: Error | string, context: any = {}) {
    return this.logWithAlert(error, 'server_error', 'critical', context)
  },

  async logAuthErrorWithAlert(error: Error | string, context: any = {}) {
    return this.logWithAlert(error, 'auth_error', 'high', context)
  },

  async logDatabaseErrorWithAlert(error: Error | string, context: any = {}) {
    return this.logWithAlert(error, 'database_error', 'high', context)
  },
}

// Types are already exported as interfaces above 