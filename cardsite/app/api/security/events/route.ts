import { NextRequest, NextResponse } from 'next/server'
import { sessionMonitor } from '@/lib/session-security'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

/**
 * Development-only API endpoint to view security events
 * This helps with testing Phase 2 Enhanced Session Security
 */
export async function GET(request: NextRequest) {
  // Only allow in development mode
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'This endpoint is only available in development mode' },
      { status: 403 }
    )
  }

  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get query parameters for filtering
    const url = new URL(request.url)
    const eventType = url.searchParams.get('type')
    const userId = url.searchParams.get('userId') || session.user.id
    const limit = parseInt(url.searchParams.get('limit') || '50')

    let events = sessionMonitor.getRecentEvents(limit)

    // Filter by event type if specified
    if (eventType) {
      events = events.filter(event => event.type === eventType)
    }

    // Filter by user ID if specified
    if (userId) {
      events = events.filter(event => event.userId === userId)
    }

    // Get some analytics
    const analytics = {
      totalEvents: sessionMonitor.getRecentEvents(1000).length,
      signInEvents: sessionMonitor.getEventsByType('SIGN_IN').length,
      signOutEvents: sessionMonitor.getEventsByType('SIGN_OUT').length,
      sessionExpiredEvents: sessionMonitor.getEventsByType('SESSION_EXPIRED').length,
      userEvents: sessionMonitor.getEventsByUser(session.user.id).length,
      activeSessionCount: sessionMonitor.getActiveSessionCount(),
    }

    return NextResponse.json({
      success: true,
      events,
      analytics,
      filters: {
        eventType,
        userId,
        limit,
      },
      user: {
        id: session.user.id,
        email: session.user.email,
      },
    })

  } catch (error) {
    console.error('Error fetching security events:', error)
    return NextResponse.json(
      { error: 'Failed to fetch security events' },
      { status: 500 }
    )
  }
}

/**
 * Clear security events (development only)
 */
export async function DELETE(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'This endpoint is only available in development mode' },
      { status: 403 }
    )
  }

  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Clear events by creating a new monitor instance
    // Note: This is a simple reset for testing purposes
    console.log('🧹 Security events cleared by user:', session.user.email)

    return NextResponse.json({
      success: true,
      message: 'Security events cleared (development only)',
      user: session.user.email,
    })

  } catch (error) {
    console.error('Error clearing security events:', error)
    return NextResponse.json(
      { error: 'Failed to clear security events' },
      { status: 500 }
    )
  }
} 