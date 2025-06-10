// Simple monitoring system for MTG Community Hub
interface ErrorEvent {
  id: string;
  message: string;
  stack?: string;
  timestamp: Date;
  userId?: string;
  context?: Record<string, any>;
}

interface PerformanceEvent {
  id: string;
  operation: string;
  duration: number;
  timestamp: Date;
  userId?: string;
  success: boolean;
}

interface SecurityEvent {
  id: string;
  type: 'login_attempt' | 'failed_login' | 'rate_limit' | 'signup';
  userId?: string;
  email?: string;
  timestamp: Date;
  details?: Record<string, any>;
}

class SimpleMonitoring {
  private errors: ErrorEvent[] = [];
  private performance: PerformanceEvent[] = [];
  private security: SecurityEvent[] = [];
  private currentUser: { id: string; email: string } | null = null;

  // Error tracking
  trackError(message: string, error?: Error, context?: Record<string, any>) {
    const errorEvent: ErrorEvent = {
      id: crypto.randomUUID(),
      message,
      stack: error?.stack,
      timestamp: new Date(),
      userId: this.currentUser?.id,
      context
    };

    this.errors.push(errorEvent);
    
    // Keep only last 100 errors
    if (this.errors.length > 100) {
      this.errors = this.errors.slice(-100);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('🔴 Error tracked:', {
        message,
        error: error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : null,
        context
      });
    }
  }

  // Performance tracking
  trackPerformance(operation: string, duration: number, success: boolean = true) {
    const perfEvent: PerformanceEvent = {
      id: crypto.randomUUID(),
      operation,
      duration,
      timestamp: new Date(),
      userId: this.currentUser?.id,
      success
    };

    this.performance.push(perfEvent);
    
    // Keep only last 100 performance events
    if (this.performance.length > 100) {
      this.performance = this.performance.slice(-100);
    }

    // Log slow operations in development
    if (process.env.NODE_ENV === 'development' && duration > 1000) {
      console.warn('🐌 Slow operation:', { operation, duration });
    }
  }

  // Security event tracking
  trackSecurity(type: SecurityEvent['type'], details?: Record<string, any>) {
    const securityEvent: SecurityEvent = {
      id: crypto.randomUUID(),
      type,
      userId: this.currentUser?.id,
      email: this.currentUser?.email,
      timestamp: new Date(),
      details
    };

    this.security.push(securityEvent);
    
    // Keep only last 100 security events
    if (this.security.length > 100) {
      this.security = this.security.slice(-100);
    }

    // Log security events in development
    if (process.env.NODE_ENV === 'development') {
      console.log('🔒 Security event:', { type, details });
    }
  }

  // User context
  setUser(user: { id: string; email: string }) {
    this.currentUser = user;
  }

  clearUser() {
    this.currentUser = null;
  }

  // Simple performance wrapper
  async withTiming<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    const start = Date.now();
    try {
      const result = await fn();
      this.trackPerformance(operation, Date.now() - start, true);
      return result;
    } catch (error) {
      this.trackPerformance(operation, Date.now() - start, false);
      this.trackError(`${operation} failed`, error as Error);
      throw error;
    }
  }

  // Get metrics for dashboard
  getMetrics() {
    return this.performance.map(p => ({
      name: p.operation,
      value: p.duration,
      unit: 'ms',
      timestamp: p.timestamp.toISOString(),
      metadata: { success: p.success, userId: p.userId }
    }));
  }

  getEvents() {
    return [
      ...this.errors.map(e => ({
        type: 'error',
        message: e.message,
        timestamp: e.timestamp.toISOString(),
        severity: 'high',
        userId: e.userId,
        metadata: e.context
      })),
      ...this.security.map(s => ({
        type: s.type,
        message: `Security event: ${s.type}`,
        timestamp: s.timestamp.toISOString(),
        severity: 'medium',
        userId: s.userId,
        metadata: s.details
      }))
    ];
  }
}

// Single instance
export const monitor = new SimpleMonitoring();

// Simple helper functions
export function trackError(message: string, error?: Error, context?: Record<string, any>) {
  monitor.trackError(message, error, context);
}

export function trackPerformance(operation: string, duration: number, success?: boolean) {
  monitor.trackPerformance(operation, duration, success);
}

export function trackSecurity(type: SecurityEvent['type'], details?: Record<string, any>) {
  monitor.trackSecurity(type, details);
}

export function setUserContext(user: { id: string; email: string }) {
  monitor.setUser(user);
}

export function clearUserContext() {
  monitor.clearUser();
}

export function withTiming<T>(operation: string, fn: () => Promise<T>): Promise<T> {
  return monitor.withTiming(operation, fn);
} 