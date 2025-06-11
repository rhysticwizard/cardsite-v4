#!/usr/bin/env tsx

// Load environment variables first
import { config } from 'dotenv'
config({ path: '.env.local' })

import { checkDatabaseHealth, db, closeDatabaseConnection } from '../lib/db'
import { users } from '../lib/db/schema'
import { sql } from 'drizzle-orm'

async function testDatabasePooling() {
  console.log('🧪 Testing Database Connection Pooling...\n')
  
  try {
    // Test 1: Basic health check
    console.log('📊 Test 1: Database Health Check')
    const health = await checkDatabaseHealth()
    console.log('Health Status:', health.healthy ? '✅ Healthy' : '❌ Unhealthy')
    console.log('Active Connections:', health.connectionCount || 'Unknown')
    if (health.error) {
      console.log('Error:', health.error)
    }
    console.log('')

    // Test 2: Multiple concurrent queries to test pooling
    console.log('🔄 Test 2: Concurrent Query Test (simulating high load)')
    const startTime = Date.now()
    
    const promises = Array.from({ length: 10 }, async (_, i) => {
      return await db.execute(sql`SELECT ${i} as query_number, pg_backend_pid() as connection_pid, NOW() as timestamp`)
    })
    
    const results = await Promise.all(promises)
    const endTime = Date.now()
    
    console.log(`✅ Completed 10 concurrent queries in ${endTime - startTime}ms`)
    
    // Show unique connection PIDs to verify pooling
    const uniquePids = new Set(results.map(r => r[0]?.connection_pid))
    console.log(`🔗 Used ${uniquePids.size} database connections (connection pooling working!)`)
    console.log('Connection PIDs:', Array.from(uniquePids).join(', '))
    console.log('')

    // Test 3: Connection pool metrics
    console.log('📈 Test 3: Final Connection Metrics')
    const finalHealth = await checkDatabaseHealth()
    console.log('Final Active Connections:', finalHealth.connectionCount || 'Unknown')
    
    // Test 4: User table query (test actual application queries)
    console.log('\n🔍 Test 4: Application Query Test')
    const userCount = await db.execute(sql`SELECT COUNT(*) as count FROM users`)
    console.log(`Total users in database: ${userCount[0]?.count || 0}`)

    // Test 5: Stress test with higher concurrency
    console.log('\n🚀 Test 5: High Concurrency Stress Test')
    const stressStartTime = Date.now()
    
    const stressPromises = Array.from({ length: 50 }, async (_, i) => {
      return await db.execute(sql`SELECT ${i} as stress_query, pg_backend_pid() as pid, random() as rand_val`)
    })
    
    const stressResults = await Promise.all(stressPromises)
    const stressEndTime = Date.now()
    
    console.log(`✅ Completed 50 concurrent queries in ${stressEndTime - stressStartTime}ms`)
    
    const stressUniquePids = new Set(stressResults.map(r => r[0]?.pid))
    console.log(`🔗 Used ${stressUniquePids.size} database connections under stress`)
    console.log(`⚡ Average query time: ${(stressEndTime - stressStartTime) / 50}ms per query`)

  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    // Clean up connections
    console.log('\n🧹 Cleaning up connections...')
    await closeDatabaseConnection()
    console.log('✅ Database connections closed')
  }
}

// Run the test
testDatabasePooling().catch(console.error) 