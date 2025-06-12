import { config } from 'dotenv'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

// Load environment variables from .env.local
config({ path: '.env.local' })

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set')
  }

  const client = postgres(process.env.DATABASE_URL, { max: 1 })
  const db = drizzle(client)

  console.log('Running migrations...')
  await migrate(db, { migrationsFolder: './lib/db/migrations' })
<<<<<<< HEAD
  console.log('✅ Migrations completed successfully!')
=======
  console.log('Migrations completed!')
>>>>>>> 6fed132e1ef977831009b8c87c029e7920eceadf
  
  await client.end()
}

main().catch((err) => {
<<<<<<< HEAD
  console.error('❌ Migration failed:', err)
=======
  console.error('Migration failed:', err)
>>>>>>> 6fed132e1ef977831009b8c87c029e7920eceadf
  process.exit(1)
}) 