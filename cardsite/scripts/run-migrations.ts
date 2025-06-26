import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'

// This will be used for migrations
const migrationClient = postgres(process.env.DATABASE_URL!, { max: 1 })

async function main() {
  try {
    console.log('Running migrations...')
    await migrate(drizzle(migrationClient), { migrationsFolder: './lib/db/migrations' })
    console.log('Migrations completed successfully!')
  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  } finally {
    await migrationClient.end()
  }
}

main() 