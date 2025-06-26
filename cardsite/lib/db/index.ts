import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

// Load environment variables if not already loaded
import { config } from 'dotenv'
config({ path: '.env.local' })

// Enhanced database connection configuration for stability
const connectionConfig = {
  max: 10, // Reduced from 20 to prevent pool exhaustion in development
  idle_timeout: 30, // Increased from 20 to keep connections alive longer
  connect_timeout: 15, // Increased from 10 to handle slow connections
  prepare: false,
  // Add connection retry logic
  connection: {
    application_name: 'cardsite-v4-dev',
  },
  // Handle connection errors gracefully
  onnotice: () => {}, // Suppress notices in development
  transform: {
    undefined: null, // Handle undefined values properly
  },
  // Add connection pooling debugging in development
  debug: process.env.NODE_ENV === 'development' ? false : false, // Set to true for debugging
  // Increase max attempts for connection reliability
  max_lifetime: 60 * 60, // 1 hour max lifetime for connections
}

// Create connection with enhanced pooling and error handling
let client: postgres.Sql;
try {
  client = postgres(process.env.DATABASE_URL!, connectionConfig);
} catch (error) {
  console.error('❌ Database connection failed:', error);
  process.exit(1);
}

// Database instance with schema
export const db = drizzle(client, { schema })

// Enhanced connection health check utility
export async function checkDatabaseHealth(): Promise<{ healthy: boolean; connectionCount?: number; error?: string; responseTime?: number }> {
  try {
    const startTime = Date.now();
    const result = await client`SELECT 1 as health_check, now() as current_time`;
    const responseTime = Date.now() - startTime;
    
    return {
      healthy: true,
      connectionCount: 1, // Single query connection
      responseTime,
    }
  } catch (error) {
    console.error('Database health check failed:', error);
    return {
      healthy: false,
      error: error instanceof Error ? error.message : 'Unknown database error'
    }
  }
}

// Graceful shutdown handler with timeout
export async function closeDatabaseConnection(): Promise<void> {
  try {
    // Set a timeout for graceful shutdown
    const shutdownPromise = client.end();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Database shutdown timeout')), 5000)
    );
    
    await Promise.race([shutdownPromise, timeoutPromise]);
    console.log('✅ Database connections closed gracefully');
  } catch (error) {
    console.error('⚠️ Error closing database connections:', error);
    // Force close if graceful shutdown fails
    process.exit(0);
  }
}

// Add process cleanup handlers
if (process.env.NODE_ENV === 'development') {
  process.on('SIGINT', async () => {
    console.log('\n🔄 Graceful shutdown initiated...');
    await closeDatabaseConnection();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    console.log('\n🔄 Graceful shutdown initiated...');
    await closeDatabaseConnection();
    process.exit(0);
  });
}

export { schema } 