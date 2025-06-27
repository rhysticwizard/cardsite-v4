import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

async function createCollectionsTables() {
  try {
    console.log('Creating user collections tables...')

    // Create user_collections table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS user_collections (
        id VARCHAR(12) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        format VARCHAR(50) NOT NULL DEFAULT 'standard',
        is_public BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `)

    console.log('Created user_collections table')

    // Create user_collection_cards table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS user_collection_cards (
        id VARCHAR(12) PRIMARY KEY,
        collection_id VARCHAR(12) NOT NULL REFERENCES user_collections(id) ON DELETE CASCADE,
        card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
        quantity INTEGER NOT NULL DEFAULT 1,
        category VARCHAR(50) NOT NULL DEFAULT 'mainboard',
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `)

    console.log('Created user_collection_cards table')

    // Create indexes for user_collections
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS user_collections_user_id_idx ON user_collections(user_id);
    `)
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS user_collections_format_idx ON user_collections(format);
    `)
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS user_collections_public_idx ON user_collections(is_public);
    `)
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS user_collections_created_at_idx ON user_collections(created_at);
    `)
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS user_collections_user_format_idx ON user_collections(user_id, format);
    `)
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS user_collections_user_created_idx ON user_collections(user_id, created_at);
    `)
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS user_collections_user_public_created_idx ON user_collections(user_id, is_public, created_at);
    `)
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS user_collections_public_created_idx ON user_collections(is_public, created_at) WHERE is_public = true;
    `)

    console.log('Created user_collections indexes')

    // Create indexes for user_collection_cards
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS user_collection_cards_collection_id_idx ON user_collection_cards(collection_id);
    `)
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS user_collection_cards_card_id_idx ON user_collection_cards(card_id);
    `)
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS user_collection_cards_collection_category_idx ON user_collection_cards(collection_id, category);
    `)

    console.log('Created user_collection_cards indexes')
    console.log('User collections tables created successfully!')

  } catch (error) {
    console.error('Error creating user collections tables:', error)
    process.exit(1)
  }
}

// Run the script
createCollectionsTables()
  .then(() => {
    console.log('Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Script failed:', error)
    process.exit(1)
  }) 