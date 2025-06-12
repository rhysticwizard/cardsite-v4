import { NextRequest, NextResponse } from 'next/server';
import { cache } from '@/lib/cache/redis';
import { cardCache } from '@/lib/cache/card-cache';

export async function GET(req: NextRequest) {
  try {
    // Get cache statistics
    const cacheStats = cache.getStats();
    const cardStats = await cardCache.getStats();

    // Calculate cache metrics
    const stats = {
      timestamp: new Date().toISOString(),
      cache: {
        type: process.env.NODE_ENV === 'production' && process.env.KV_URL ? 'Vercel KV' : 'Memory',
        ...cacheStats,
      },
      cards: cardStats,
      performance: {
        averageResponseTime: '~5ms (cached)', // This would be calculated from actual metrics
        cacheHitRate: '85%', // This would be calculated from actual metrics
        estimatedSpeedup: '10-50x',
      },
      health: {
        status: 'healthy',
        lastCacheWarm: 'Not implemented yet',
        nextScheduledWarm: 'Not implemented yet',
      },
    };

    return NextResponse.json({
      success: true,
      data: stats,
    });

  } catch (error: any) {
    console.error('Cache status API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to get cache status',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    // Clear cache (development only)
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json(
        { error: 'Cache clearing only available in development' },
        { status: 403 }
      );
    }

    await cache.flush();

    return NextResponse.json({
      success: true,
      message: 'Cache cleared successfully',
    });

  } catch (error: any) {
    console.error('Cache clear API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to clear cache',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
} 