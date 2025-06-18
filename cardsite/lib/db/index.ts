import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

// Load environment variables if not already loaded
import { config } from 'dotenv'
config({ path: '.env.local' })

// Optimized database connection configuration
const connectionConfig = {
  max: 20,
  idle_timeout: 20,
  connect_timeout: 10,
  prepare: false,
}

// Create connection with pooling
const client = postgres(process.env.DATABASE_URL!, connectionConfig)

// Database instance with schema
export const db = drizzle(client, { schema })

// Connection health check utility
export async function checkDatabaseHealth(): Promise<{ healthy: boolean; connectionCount?: number; error?: string }> {
  try {
    const result = await client`SELECT 1 as health_check`
    
    // Simplified health check - just return healthy if basic query works
    return {
      healthy: true,
      connectionCount: 1 // Simplified for now
    }
  } catch (error) {
    return {
      healthy: false,
      error: error instanceof Error ? error.message : 'Unknown database error'
    }
  }
}

// Graceful shutdown handler
export async function closeDatabaseConnection(): Promise<void> {
  try {
    await client.end()
    console.log('Database connections closed gracefully')
  } catch (error) {
    console.error('Error closing database connections:', error)
  }
}

export { schema } 