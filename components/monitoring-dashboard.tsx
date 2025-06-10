'use client';

import React, { useState, useEffect } from 'react';
import { getMonitoringMetrics } from '@/lib/monitoring';

interface Metrics {
  errors: {
    total: number;
    recent: number;
    latest: Array<{
      id: string;
      message: string;
      timestamp: Date;
      userId?: string;
    }>;
  };
  performance: {
    total: number;
    recent: number;
    avgDuration: number;
    latest: Array<{
      id: string;
      operation: string;
      duration: number;
      success: boolean;
      timestamp: Date;
    }>;
  };
  security: {
    total: number;
    recent: number;
    latest: Array<{
      id: string;
      type: string;
      timestamp: Date;
      email?: string;
    }>;
  };
}

export function MonitoringDashboard() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only show in development
    if (process.env.NODE_ENV !== 'development') return;

    const updateMetrics = () => {
      setMetrics(getMonitoringMetrics());
    };

    updateMetrics();
    const interval = setInterval(updateMetrics, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  // Don't render in production
  if (process.env.NODE_ENV !== 'development' || !metrics) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="bg-blue-600 text-white px-3 py-2 rounded-md text-sm shadow-lg hover:bg-blue-700"
      >
        📊 Monitor ({metrics.errors.recent + metrics.performance.recent + metrics.security.recent})
      </button>

      {isVisible && (
        <div className="absolute bottom-12 right-0 bg-white border border-gray-200 rounded-lg shadow-xl p-4 w-80 max-h-96 overflow-y-auto">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-gray-900">Monitoring Dashboard</h3>
            <button
              onClick={() => setIsVisible(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          {/* Errors */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-medium text-red-600">Errors</h4>
              <span className="text-sm text-gray-500">
                {metrics.errors.recent}/{metrics.errors.total}
              </span>
            </div>
            {metrics.errors.latest.length > 0 ? (
              <div className="space-y-1">
                {metrics.errors.latest.slice(0, 3).map((error: any) => (
                  <div key={error.id} className="text-xs bg-red-50 p-2 rounded">
                    <div className="font-medium text-red-800">{error.message}</div>
                    <div className="text-red-600">
                      {error.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-gray-500">No recent errors</div>
            )}
          </div>

          {/* Performance */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-medium text-blue-600">Performance</h4>
              <span className="text-sm text-gray-500">
                {metrics.performance.avgDuration}ms avg
              </span>
            </div>
            {metrics.performance.latest.length > 0 ? (
              <div className="space-y-1">
                {metrics.performance.latest.slice(0, 3).map((perf) => (
                  <div key={perf.id} className="text-xs bg-blue-50 p-2 rounded">
                    <div className="flex justify-between">
                      <span className="font-medium text-blue-800">{perf.operation}</span>
                      <span className={`${perf.success ? 'text-green-600' : 'text-red-600'}`}>
                        {perf.duration}ms
                      </span>
                    </div>
                    <div className="text-blue-600">
                      {perf.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-gray-500">No recent operations</div>
            )}
          </div>

          {/* Security */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-medium text-green-600">Security</h4>
              <span className="text-sm text-gray-500">
                {metrics.security.recent}/{metrics.security.total}
              </span>
            </div>
            {metrics.security.latest.length > 0 ? (
              <div className="space-y-1">
                {metrics.security.latest.slice(0, 3).map((security) => (
                  <div key={security.id} className="text-xs bg-green-50 p-2 rounded">
                    <div className="font-medium text-green-800">{security.type}</div>
                    <div className="text-green-600">
                      {security.email && `${security.email} • `}
                      {security.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-gray-500">No recent security events</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 