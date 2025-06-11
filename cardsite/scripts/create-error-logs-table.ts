#!/usr/bin/env tsx

// Load environment variables first
import { config } from 'dotenv'
config({ path: '.env.local' })

import { db } from '../lib/db'
import { sql } from 'drizzle-orm'

async function createErrorLogsTable() {
  console.log('🗄️ Creating Error Logs Table...\n')
  
  const commands = [
    // Create the error_logs table
    `CREATE TABLE IF NOT EXISTS "error_logs" (
      "id" serial PRIMARY KEY NOT NULL,
      "user_id" text,
      "error_type" text NOT NULL,
      "severity" text NOT NULL,
      "message" text NOT NULL,
      "stack" text,
      "url" text,
      "user_agent" text,
      "ip_address" text,
      "metadata" jsonb,
      "resolved" boolean DEFAULT false NOT NULL,
      "resolved_at" timestamp,
      "resolved_by" text,
      "created_at" timestamp DEFAULT now() NOT NULL
    )`,
    
    // Add foreign key constraints
    `ALTER TABLE "error_logs" ADD CONSTRAINT IF NOT EXISTS "error_logs_user_id_users_id_fk" 
     FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    
    `ALTER TABLE "error_logs" ADD CONSTRAINT IF NOT EXISTS "error_logs_resolved_by_users_id_fk" 
     FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    
    // Create indexes for performance
    'CREATE INDEX IF NOT EXISTS "error_logs_error_type_idx" ON "error_logs" USING btree ("error_type")',
    'CREATE INDEX IF NOT EXISTS "error_logs_severity_idx" ON "error_logs" USING btree ("severity")',
    'CREATE INDEX IF NOT EXISTS "error_logs_created_at_idx" ON "error_logs" USING btree ("created_at")',
    'CREATE INDEX IF NOT EXISTS "error_logs_resolved_idx" ON "error_logs" USING btree ("resolved")',
    'CREATE INDEX IF NOT EXISTS "error_logs_user_id_idx" ON "error_logs" USING btree ("user_id")',
    'CREATE INDEX IF NOT EXISTS "error_logs_type_severity_idx" ON "error_logs" USING btree ("error_type","severity")',
    'CREATE INDEX IF NOT EXISTS "error_logs_unresolved_idx" ON "error_logs" USING btree ("resolved","created_at")',
  ]
  
  let successCount = 0
  let errorCount = 0
  
  for (const [i, command] of commands.entries()) {
    try {
      console.log(`[${i + 1}/${commands.length}] Executing SQL command...`)
      await db.execute(sql.raw(command))
      successCount++
      console.log('✅ Success')
    } catch (error) {
      errorCount++
      console.log('⚠️  Error (may already exist):', error instanceof Error ? error.message.split('\n')[0] : 'Unknown error')
    }
  }
  
  console.log(`\n📊 Error Logs Table Creation Summary:`)
  console.log(`✅ Successful commands: ${successCount}`)
  console.log(`⚠️  Errors/Existing: ${errorCount}`)
  console.log(`📈 Total attempted: ${commands.length}`)
  
  // Test the error logging functionality
  console.log('\n🧪 Testing Error Logging...')
  
  try {
    // Import the error logger
    const { errorLogger } = await import('../lib/error-logger')
    
    // Test logging different types of errors
    console.log('📝 Testing error logging functionality...')
    
    const testErrorId = await errorLogger.logError(
      'Test error for monitoring setup',
      'server_error',
      'medium',
      {
        url: '/test',
        method: 'POST',
        statusCode: 500,
        additionalData: { test: 'monitoring setup' }
      }
    )
    
    console.log(`✅ Test error logged with ID: ${testErrorId}`)
    
    // Test getting recent errors
    const recentErrors = await errorLogger.getRecentErrors({ limit: 5 })
    console.log(`📋 Found ${recentErrors.length} recent errors`)
    
    // Test error stats
    const stats = await errorLogger.getErrorStats('24h')
    console.log(`📊 Error stats: ${stats.total} total errors in last 24h`)
    
    console.log('\n🎉 Error logging system is ready!')
    console.log('\n📋 Features available:')
    console.log('✅ Persistent error logging with context')
    console.log('✅ Error categorization by type and severity')
    console.log('✅ Error resolution tracking')
    console.log('✅ Error statistics and analytics')
    console.log('✅ Optimized database indexes for performance')
    
  } catch (error) {
    console.error('❌ Error testing functionality:', error)
  }
}

createErrorLogsTable().catch(console.error) 