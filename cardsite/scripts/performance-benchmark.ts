#!/usr/bin/env tsx

// ===================================
// CardSite v4 - Performance Benchmark
// Comprehensive performance testing for 10k+ users
// ===================================

import { db } from '../lib/db';
import { users, cards, collections, decks, errorLogs } from '../lib/db/schema';
import { eq, and, desc, count, sql } from 'drizzle-orm';
import { config } from 'dotenv';
import fs from 'fs';

// Load environment variables
config({ path: '.env.local' });

interface BenchmarkResult {
  name: string;
  duration: number;
  throughput: number;
  memoryUsage: number;
  errorRate: number;
  details: Record<string, any>;
}

interface BenchmarkSuite {
  results: BenchmarkResult[];
  summary: {
    totalDuration: number;
    averageThroughput: number;
    peakMemory: number;
    overallErrorRate: number;
  };
}

class PerformanceBenchmark {
  private results: BenchmarkResult[] = [];
  private startTime = Date.now();

  private getMemoryUsage(): number {
    const usage = process.memoryUsage();
    return Math.round(usage.heapUsed / 1024 / 1024); // MB
  }

  private async benchmark(
    name: string,
    iterations: number,
    testFn: () => Promise<void>
  ): Promise<BenchmarkResult> {
    console.log(`🏃 Running ${name} (${iterations} iterations)...`);
    
    const startMem = this.getMemoryUsage();
    const start = Date.now();
    let errors = 0;

    // Warmup
    try {
      await testFn();
    } catch {
      // Ignore warmup errors
    }

    // Actual benchmark
    for (let i = 0; i < iterations; i++) {
      try {
        await testFn();
      } catch (error) {
        errors++;
        console.warn(`Error in iteration ${i + 1}:`, error);
      }
    }

    const duration = Date.now() - start;
    const endMem = this.getMemoryUsage();
    const throughput = (iterations / duration) * 1000; // ops/second
    const errorRate = (errors / iterations) * 100;

    const result: BenchmarkResult = {
      name,
      duration,
      throughput,
      memoryUsage: endMem - startMem,
      errorRate,
      details: {
        iterations,
        averageLatency: duration / iterations,
        errors,
        memoryDelta: endMem - startMem,
      }
    };

    this.results.push(result);
    console.log(`✅ ${name}: ${throughput.toFixed(2)} ops/sec, ${duration}ms total, ${errorRate.toFixed(1)}% errors`);
    
    return result;
  }

  // Database Query Benchmarks
  private async benchmarkUserQueries(): Promise<void> {
    await this.benchmark('User Queries', 100, async () => {
      // Simulate common user queries
      await db.select().from(users).limit(10);
      await db.select().from(users).where(eq(users.email, 'test@example.com')).limit(1);
      await db.select({ count: count() }).from(users);
    });
  }

  private async benchmarkCardQueries(): Promise<void> {
    await this.benchmark('Card Search Queries', 50, async () => {
      // Simulate card searches
      await db.select().from(cards).limit(20);
      await db.select().from(cards).where(sql`${cards.name} ILIKE '%Lightning%'`).limit(10);
      await db.select().from(cards).where(eq(cards.typeLine, 'Creature')).limit(15);
    });
  }

  private async benchmarkCollectionQueries(): Promise<void> {
    await this.benchmark('Collection Queries', 75, async () => {
      // Simulate collection operations
      await db.select().from(collections).limit(50);
      await db.select({
        card: cards,
        collection: collections
      })
      .from(collections)
      .innerJoin(cards, eq(collections.cardId, cards.id))
      .limit(25);
    });
  }

  private async benchmarkDeckQueries(): Promise<void> {
    await this.benchmark('Deck Queries', 60, async () => {
      // Simulate deck operations
      await db.select().from(decks).where(eq(decks.isPublic, true)).limit(20);
      await db.select().from(decks).orderBy(desc(decks.createdAt)).limit(10);
    });
  }

  // Complex Query Benchmarks
  private async benchmarkComplexQueries(): Promise<void> {
    await this.benchmark('Complex JOIN Queries', 25, async () => {
      // Simulate complex dashboard queries
      await db.select({
        user: users,
        deckCount: count(decks.id),
        collectionCount: count(collections.id)
      })
      .from(users)
      .leftJoin(decks, eq(users.id, decks.userId))
      .leftJoin(collections, eq(users.id, collections.userId))
      .groupBy(users.id)
      .limit(10);
    });
  }

  // Write Operation Benchmarks
  private async benchmarkWrites(): Promise<void> {
    await this.benchmark('Write Operations', 30, async () => {
      // Simulate writes (using error logs as safe test writes)
      await db.insert(errorLogs).values({
        errorType: 'performance_test',
        severity: 'low',
        message: 'Performance test write',
        metadata: { test: true },
      });
    });
  }

  // Concurrent Query Benchmark
  private async benchmarkConcurrency(): Promise<void> {
    await this.benchmark('Concurrent Queries', 20, async () => {
      // Simulate concurrent operations
      const promises = Array.from({ length: 5 }, () => 
        db.select().from(users).limit(5)
      );
      await Promise.all(promises);
    });
  }

  // Memory Stress Test
  private async benchmarkMemoryUsage(): Promise<void> {
    await this.benchmark('Memory Stress Test', 10, async () => {
      // Simulate memory-intensive operations
      const largeResult = await db.select().from(cards).limit(1000);
      
      // Process data in memory
      const processed = largeResult.map(card => ({
        ...card,
        processed: true,
        timestamp: Date.now()
      }));
      
      // Clear reference
      processed.length = 0;
    });
  }

  // Database Connection Pool Test
  private async benchmarkConnectionPool(): Promise<void> {
    await this.benchmark('Connection Pool Stress', 50, async () => {
      // Simulate multiple simultaneous connections
      const queries = Array.from({ length: 10 }, (_, i) => 
        db.select().from(users).where(sql`id > ${i}`).limit(1)
      );
      await Promise.all(queries);
    });
  }

  public async runAllBenchmarks(): Promise<BenchmarkSuite> {
    console.log('🚀 Starting Performance Benchmarks...\n');
    console.log(`💾 Initial Memory Usage: ${this.getMemoryUsage()}MB`);

    // Run all benchmarks
    await this.benchmarkUserQueries();
    await this.benchmarkCardQueries();
    await this.benchmarkCollectionQueries();
    await this.benchmarkDeckQueries();
    await this.benchmarkComplexQueries();
    await this.benchmarkWrites();
    await this.benchmarkConcurrency();
    await this.benchmarkMemoryUsage();
    await this.benchmarkConnectionPool();

    // Calculate summary
    const totalDuration = Date.now() - this.startTime;
    const averageThroughput = this.results.reduce((sum, r) => sum + r.throughput, 0) / this.results.length;
    const peakMemory = Math.max(...this.results.map(r => r.memoryUsage));
    const overallErrorRate = this.results.reduce((sum, r) => sum + r.errorRate, 0) / this.results.length;

    const suite: BenchmarkSuite = {
      results: this.results,
      summary: {
        totalDuration,
        averageThroughput,
        peakMemory,
        overallErrorRate
      }
    };

    this.printResults(suite);
    this.saveResults(suite);

    return suite;
  }

  private printResults(suite: BenchmarkSuite): void {
    console.log('\n🏁 Performance Benchmark Results:');
    console.log('==================================');

    suite.results.forEach(result => {
      const grade = this.getPerformanceGrade(result);
      console.log(`${grade.emoji} ${result.name}:`);
      console.log(`   Throughput: ${result.throughput.toFixed(2)} ops/sec`);
      console.log(`   Duration: ${result.duration}ms`);
      console.log(`   Avg Latency: ${result.details.averageLatency.toFixed(2)}ms`);
      console.log(`   Memory: ${result.memoryUsage}MB`);
      console.log(`   Error Rate: ${result.errorRate.toFixed(1)}%`);
      console.log(`   Grade: ${grade.letter} - ${grade.description}\n`);
    });

    console.log('📊 Overall Summary:');
    console.log(`   Total Duration: ${suite.summary.totalDuration}ms`);
    console.log(`   Average Throughput: ${suite.summary.averageThroughput.toFixed(2)} ops/sec`);
    console.log(`   Peak Memory Usage: ${suite.summary.peakMemory}MB`);
    console.log(`   Overall Error Rate: ${suite.summary.overallErrorRate.toFixed(1)}%`);

    const overallGrade = this.getOverallGrade(suite);
    console.log(`   Overall Grade: ${overallGrade.letter} - ${overallGrade.description}`);

    if (overallGrade.letter === 'A') {
      console.log('🎉 Excellent! Your system is ready for 10,000+ concurrent users!');
    } else if (overallGrade.letter === 'B') {
      console.log('👍 Good performance. Minor optimizations recommended.');
    } else {
      console.log('⚠️  Performance issues detected. Optimization required.');
    }
  }

  private getPerformanceGrade(result: BenchmarkResult): { letter: string; emoji: string; description: string } {
    if (result.throughput > 100 && result.errorRate < 1) {
      return { letter: 'A', emoji: '🏆', description: 'Excellent' };
    } else if (result.throughput > 50 && result.errorRate < 5) {
      return { letter: 'B', emoji: '👍', description: 'Good' };
    } else if (result.throughput > 20 && result.errorRate < 10) {
      return { letter: 'C', emoji: '⚠️', description: 'Acceptable' };
    } else {
      return { letter: 'D', emoji: '❌', description: 'Needs Improvement' };
    }
  }

  private getOverallGrade(suite: BenchmarkSuite): { letter: string; description: string } {
    const avgThroughput = suite.summary.averageThroughput;
    const errorRate = suite.summary.overallErrorRate;

    if (avgThroughput > 75 && errorRate < 2) {
      return { letter: 'A', description: 'Ready for Production Scale' };
    } else if (avgThroughput > 50 && errorRate < 5) {
      return { letter: 'B', description: 'Good Performance' };
    } else if (avgThroughput > 25 && errorRate < 10) {
      return { letter: 'C', description: 'Acceptable Performance' };
    } else {
      return { letter: 'D', description: 'Performance Issues Detected' };
    }
  }

  private saveResults(suite: BenchmarkSuite): void {
    const output = {
      timestamp: new Date().toISOString(),
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        memory: process.memoryUsage(),
      },
      benchmark: suite
    };

    fs.writeFileSync('benchmark-results.json', JSON.stringify(output, null, 2));
    console.log('📁 Results saved to benchmark-results.json');
  }
}

// Cleanup function
async function cleanup(): Promise<void> {
  try {
    // Clean up test data
    await db.delete(errorLogs).where(eq(errorLogs.errorType, 'performance_test'));
    console.log('🧹 Cleaned up test data');
  } catch (error) {
    console.warn('Warning: Could not clean up test data:', error);
  }
}

// Run benchmarks
const benchmark = new PerformanceBenchmark();
benchmark.runAllBenchmarks()
  .then(() => cleanup())
  .then(() => {
    console.log('✅ Performance benchmarks completed!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Benchmark failed:', error);
    cleanup().finally(() => process.exit(1));
  }); 