#!/usr/bin/env tsx

// Load environment variables first
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { db } from '../lib/db'
import { sql } from 'drizzle-orm'

async function testBasicConnection() {
  console.log('🔌 Testing Basic Database Connection...\n')
  
  try {
    console.log('1. Testing simple query...')
    const result = await db.execute(sql`SELECT 1 as test`)
    console.log('✅ Basic query successful:', result[0])
    
    console.log('\n2. Testing timestamp query...')
    const timeResult = await db.execute(sql`SELECT NOW() as current_time`)
    console.log('✅ Timestamp query successful:', timeResult[0])
    
    console.log('\n3. Testing connection info...')
    const connResult = await db.execute(sql`SELECT version() as pg_version, current_database() as db_name`)
    console.log('✅ Connection info:', connResult[0])
    
    console.log('\n🎉 All tests passed! Database connection is working.')
    
  } catch (error) {
    console.error('❌ Database connection failed:')
    console.error('Error:', error)
    
    if (error instanceof Error) {
      console.error('Message:', error.message)
      console.error('Stack:', error.stack)
    }
    
    console.log('\n🔍 Debug info:')
    console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL)
    console.log('DATABASE_URL starts with:', process.env.DATABASE_URL?.substring(0, 30) + '...')
  }
}

testBasicConnection().catch(console.error) 