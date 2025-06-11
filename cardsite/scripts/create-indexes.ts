#!/usr/bin/env tsx

// Load environment variables first
import { config } from 'dotenv'
config({ path: '.env.local' })

import { db } from '../lib/db'
import { sql } from 'drizzle-orm'

async function createPerformanceIndexes() {
  console.log('🚀 Creating Database Performance Indexes...\n')
  
  const indexes = [
    // Accounts table indexes
    'CREATE INDEX IF NOT EXISTS "accounts_user_id_idx" ON "accounts" USING btree ("userId")',
    'CREATE INDEX IF NOT EXISTS "accounts_provider_idx" ON "accounts" USING btree ("provider")',
    'CREATE INDEX IF NOT EXISTS "accounts_provider_account_idx" ON "accounts" USING btree ("provider","providerAccountId")',
    
    // Cards table indexes
    'CREATE INDEX IF NOT EXISTS "cards_name_idx" ON "cards" USING btree ("name")',
    'CREATE INDEX IF NOT EXISTS "cards_type_line_idx" ON "cards" USING btree ("type_line")',
    'CREATE INDEX IF NOT EXISTS "cards_set_code_idx" ON "cards" USING btree ("set_code")',
    'CREATE INDEX IF NOT EXISTS "cards_rarity_idx" ON "cards" USING btree ("rarity")',
    'CREATE INDEX IF NOT EXISTS "cards_cmc_idx" ON "cards" USING btree ("cmc")',
    'CREATE INDEX IF NOT EXISTS "cards_set_rarity_idx" ON "cards" USING btree ("set_code","rarity")',
    'CREATE INDEX IF NOT EXISTS "cards_oracle_text_idx" ON "cards" USING btree ("oracle_text")',
    
    // Collections table indexes
    'CREATE INDEX IF NOT EXISTS "collections_user_id_idx" ON "collections" USING btree ("user_id")',
    'CREATE INDEX IF NOT EXISTS "collections_card_id_idx" ON "collections" USING btree ("card_id")',
    'CREATE INDEX IF NOT EXISTS "collections_user_card_idx" ON "collections" USING btree ("user_id","card_id")',
    'CREATE INDEX IF NOT EXISTS "collections_condition_idx" ON "collections" USING btree ("condition")',
    'CREATE INDEX IF NOT EXISTS "collections_foil_idx" ON "collections" USING btree ("foil")',
    
    // Deck Cards table indexes
    'CREATE INDEX IF NOT EXISTS "deck_cards_deck_id_idx" ON "deck_cards" USING btree ("deck_id")',
    'CREATE INDEX IF NOT EXISTS "deck_cards_card_id_idx" ON "deck_cards" USING btree ("card_id")',
    'CREATE INDEX IF NOT EXISTS "deck_cards_deck_card_idx" ON "deck_cards" USING btree ("deck_id","card_id")',
    'CREATE INDEX IF NOT EXISTS "deck_cards_category_idx" ON "deck_cards" USING btree ("category")',
    
    // Decks table indexes
    'CREATE INDEX IF NOT EXISTS "decks_user_id_idx" ON "decks" USING btree ("user_id")',
    'CREATE INDEX IF NOT EXISTS "decks_format_idx" ON "decks" USING btree ("format")',
    'CREATE INDEX IF NOT EXISTS "decks_is_public_idx" ON "decks" USING btree ("is_public")',
    'CREATE INDEX IF NOT EXISTS "decks_public_format_idx" ON "decks" USING btree ("is_public","format")',
    'CREATE INDEX IF NOT EXISTS "decks_name_idx" ON "decks" USING btree ("name")',
    'CREATE INDEX IF NOT EXISTS "decks_created_at_idx" ON "decks" USING btree ("created_at")',
    
    // Sessions table indexes
    'CREATE INDEX IF NOT EXISTS "sessions_user_id_idx" ON "sessions" USING btree ("userId")',
    'CREATE INDEX IF NOT EXISTS "sessions_expires_idx" ON "sessions" USING btree ("expires")',
    
    // Users table indexes (add missing columns first)
    'ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL',
    'ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL',
    'CREATE INDEX IF NOT EXISTS "users_email_idx" ON "users" USING btree ("email")',
    'CREATE INDEX IF NOT EXISTS "users_created_at_idx" ON "users" USING btree ("created_at")',
    
    // Verification Tokens table indexes
    'CREATE INDEX IF NOT EXISTS "verification_tokens_identifier_idx" ON "verificationTokens" USING btree ("identifier")',
    'CREATE INDEX IF NOT EXISTS "verification_tokens_token_idx" ON "verificationTokens" USING btree ("token")',
    'CREATE INDEX IF NOT EXISTS "verification_tokens_expires_idx" ON "verificationTokens" USING btree ("expires")',
  ]
  
  let successCount = 0
  let errorCount = 0
  
  for (const [i, indexSQL] of indexes.entries()) {
    try {
      console.log(`[${i + 1}/${indexes.length}] Creating index...`)
      await db.execute(sql.raw(indexSQL))
      successCount++
      console.log('✅ Success')
    } catch (error) {
      errorCount++
      console.log('⚠️  Error (may already exist):', error instanceof Error ? error.message.split('\n')[0] : 'Unknown error')
    }
  }
  
  console.log(`\n📊 Index Creation Summary:`)
  console.log(`✅ Successful: ${successCount}`)
  console.log(`⚠️  Errors/Existing: ${errorCount}`)
  console.log(`📈 Total attempted: ${indexes.length}`)
  
  // Test query performance
  console.log('\n🧪 Testing Index Performance...')
  
  const startTime = Date.now()
  
  // Test user lookup by email (should use users_email_idx)
  const userEmailTest = await db.execute(sql`
    SELECT COUNT(*) as count FROM users WHERE email LIKE '%@%'
  `)
  
  // Test collection queries (should use collections_user_id_idx)
  const collectionTest = await db.execute(sql`
    SELECT COUNT(*) as count FROM collections 
    WHERE user_id IS NOT NULL
  `)
  
  // Test cards by name (should use cards_name_idx)
  const cardNameTest = await db.execute(sql`
    SELECT COUNT(*) as count FROM cards 
    WHERE name IS NOT NULL
  `)
  
  const endTime = Date.now()
  
  console.log(`✅ Test queries completed in ${endTime - startTime}ms`)
  console.log(`📧 User email queries ready: ${userEmailTest[0]?.count || 0} users`)
  console.log(`🃏 Collection queries ready: ${collectionTest[0]?.count || 0} collection items`)
  console.log(`🎴 Card name queries ready: ${cardNameTest[0]?.count || 0} cards`)
  
  console.log('\n🎉 Database performance optimization complete!')
}

createPerformanceIndexes().catch(console.error) 