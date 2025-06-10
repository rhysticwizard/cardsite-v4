'use client'

import { useState, useEffect } from 'react'
import { monitor } from '@/lib/monitoring'

interface MetricDisplay {
  name: string
  value: number
  unit: string
  timestamp?: string
  metadata?: Record<string, any>
}

interface EventDisplay {
  type: string
  message: string
  timestamp?: string
  severity?: string
  userId?: string
  metadata?: Record<string, any>
}

export function MonitoringDashboard() {
  const [metrics, setMetrics] = useState<MetricDisplay[]>([])
  const [events, setEvents] = useState<EventDisplay[]>([])
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Only show in development
    if (process.env.NODE_ENV !== 'development') return

    const updateData = () => {
      const currentMetrics = monitor.getMetrics()
      const currentEvents = monitor.getEvents()
      
      setMetrics(currentMetrics.slice(-20)) // Show last 20 metrics
      setEvents(currentEvents.slice(-20))   // Show last 20 events
    }

    updateData()
    const interval = setInterval(updateData, 2000) // Update every 2 seconds

    return () => clearInterval(interval)
  }, [])

  // Don't render in production
  if (process.env.NODE_ENV !== 'development') return null

  const errorCount = events.filter(e => e.type === 'error').length
  const totalRecent = metrics.length + events.length

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setIsVisible(!isVisible)}
        className={`text-white px-3 py-2 rounded-md text-sm shadow-lg transition-colors ${
          errorCount > 0 ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
        }`}
      >
        📊 Monitor {totalRecent > 0 && `(${totalRecent})`}
        {errorCount > 0 && ` ⚠️`}
      </button>

      {isVisible && (
        <div className="absolute bottom-12 right-0 bg-white border border-gray-200 rounded-lg shadow-xl p-4 w-80 max-h-96 overflow-y-auto">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-gray-900">Dev Monitoring</h3>
            <button
              onClick={() => setIsVisible(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          {/* Performance Metrics */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-medium text-blue-600">Performance</h4>
              <span className="text-sm text-gray-500">{metrics.length}</span>
            </div>
            {metrics.length > 0 ? (
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {metrics.slice(-5).reverse().map((metric, index) => (
                  <div key={index} className="text-xs bg-blue-50 p-2 rounded">
                    <div className="flex justify-between">
                      <span className="font-medium text-blue-800">{metric.name}</span>
                      <span className="text-blue-600">{metric.value}{metric.unit}</span>
                    </div>
                    {metric.metadata && (
                      <div className="text-gray-500 mt-1">
                        {Object.entries(metric.metadata).slice(0, 2).map(([key, value]) => (
                          <span key={key} className="mr-2">
                            {key}: {String(value).substring(0, 15)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-gray-500">No metrics yet</div>
            )}
          </div>

          {/* Security Events */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-medium text-green-600">Security Events</h4>
              <span className="text-sm text-gray-500">{events.length}</span>
            </div>
            {events.length > 0 ? (
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {events.slice(-5).reverse().map((event, index) => (
                  <div key={index} className="text-xs bg-green-50 p-2 rounded">
                    <div className="flex justify-between">
                      <span className="font-medium text-green-800">{event.type}</span>
                      <span className="text-green-600">
                        {event.timestamp ? new Date(event.timestamp).toLocaleTimeString() : 'now'}
                      </span>
                    </div>
                    <div className="text-gray-600 mt-1">{event.message}</div>
                    {event.userId && (
                      <div className="text-gray-500">User: {event.userId}</div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-gray-500">No events yet</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
} 