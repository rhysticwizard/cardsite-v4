import { NextRequest, NextResponse } from 'next/server';
import { checkDatabaseHealth } from '@/lib/db';

export async function GET(request: NextRequest) {
  const start = Date.now();
  const checks: Record<string, any> = {};

  try {
    // Database health check
    try {
      const dbStart = Date.now();
      const dbResult = await checkDatabaseHealth();
      const dbResponseTime = Date.now() - dbStart;
      
      checks.database = {
        status: dbResult.healthy ? 'healthy' : 'unhealthy',
        responseTime: dbResponseTime,
        connections: dbResult.connectionCount || 0,
        error: dbResult.error
      };
    } catch (error) {
      checks.database = {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    // Memory usage check
    const memUsage = process.memoryUsage();
    checks.memory = {
      status: memUsage.heapUsed < 512 * 1024 * 1024 ? 'healthy' : 'warning', // 512MB threshold
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
      external: Math.round(memUsage.external / 1024 / 1024), // MB
    };

    // Environment check - FIXED: Added status field
    checks.environment = {
      status: 'healthy', // Added this missing field!
      nodeEnv: process.env.NODE_ENV,
      nodeVersion: process.version,
      platform: process.platform,
      uptime: Math.round(process.uptime()),
    };

    // Overall health status
    const allHealthy = Object.values(checks).every(
      check => check.status === 'healthy' || check.status === 'warning'
    );

    const response = {
      status: allHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      responseTime: Date.now() - start,
      version: process.env.npm_package_version || '1.0.0',
      checks
    };

    return NextResponse.json(response, {
      status: allHealthy ? 200 : 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      responseTime: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
      checks
    }, {
      status: 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  }
} 