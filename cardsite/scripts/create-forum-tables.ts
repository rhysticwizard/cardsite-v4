import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

async function createForumTables() {
  try {
    console.log('Creating forum tables...')

    // Create forum_posts table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS forum_posts (
        id VARCHAR(12) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        category VARCHAR(50) NOT NULL,
        subcategory VARCHAR(100),
        is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
        is_locked BOOLEAN NOT NULL DEFAULT FALSE,
        views INTEGER NOT NULL DEFAULT 0,
        reply_count INTEGER NOT NULL DEFAULT 0,
        last_reply_at TIMESTAMP,
        last_reply_by VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `)

    console.log('Created forum_posts table')

    // Create forum_comments table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS forum_comments (
        id VARCHAR(12) PRIMARY KEY,
        post_id VARCHAR(12) NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
        user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        parent_id VARCHAR(12) REFERENCES forum_comments(id) ON DELETE CASCADE,
        is_edited BOOLEAN NOT NULL DEFAULT FALSE,
        edited_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `)

    console.log('Created forum_comments table')

    // Create indexes for forum_posts
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS forum_posts_user_id_idx ON forum_posts(user_id);
    `)
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS forum_posts_category_idx ON forum_posts(category);
    `)
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS forum_posts_subcategory_idx ON forum_posts(subcategory);
    `)
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS forum_posts_created_at_idx ON forum_posts(created_at);
    `)
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS forum_posts_last_reply_at_idx ON forum_posts(last_reply_at);
    `)
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS forum_posts_category_created_idx ON forum_posts(category, created_at);
    `)
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS forum_posts_category_last_reply_idx ON forum_posts(category, last_reply_at);
    `)
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS forum_posts_pinned_idx ON forum_posts(is_pinned, created_at);
    `)

    console.log('Created forum_posts indexes')

    // Create indexes for forum_comments
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS forum_comments_post_id_idx ON forum_comments(post_id);
    `)
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS forum_comments_user_id_idx ON forum_comments(user_id);
    `)
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS forum_comments_parent_id_idx ON forum_comments(parent_id);
    `)
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS forum_comments_created_at_idx ON forum_comments(created_at);
    `)
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS forum_comments_post_created_idx ON forum_comments(post_id, created_at);
    `)
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS forum_comments_parent_created_idx ON forum_comments(parent_id, created_at);
    `)

    console.log('Created forum_comments indexes')
    console.log('Forum tables created successfully!')

  } catch (error) {
    console.error('Error creating forum tables:', error)
    process.exit(1)
  }
}

// Run the script
createForumTables()
  .then(() => {
    console.log('Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Script failed:', error)
    process.exit(1)
  }) 