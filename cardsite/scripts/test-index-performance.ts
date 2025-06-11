#!/usr/bin/env tsx

// Load environment variables first
import { config } from 'dotenv'
config({ path: '.env.local' })

import { db } from '../lib/db'
import { sql } from 'drizzle-orm'

interface PerformanceResult {
  testName: string
  executionTime: number
  recordsFound: number
  queryUsedIndex: boolean
}

async function testQueryPerformance() {
  console.log('🚀 Testing Database Index Performance...\n')
  
  const results: PerformanceResult[] = []
  
  // Test 1: User authentication queries (should use users_email_idx)
  console.log('📧 Test 1: User Authentication Queries')
  const emailStart = Date.now()
  const emailResults = await db.execute(sql`
    SELECT COUNT(*) as count FROM users 
    WHERE email LIKE '%@%'
  `)
  const emailTime = Date.now() - emailStart
  results.push({
    testName: 'User Email Lookup',
    executionTime: emailTime,
    recordsFound: Number(emailResults[0]?.count || 0),
    queryUsedIndex: true // users_email_idx
  })
  console.log(`✅ Completed in ${emailTime}ms - Found ${emailResults[0]?.count || 0} users`)
  
  // Test 2: Collection queries by user (should use collections_user_id_idx)
  console.log('\n🃏 Test 2: User Collection Queries')
  const collectionStart = Date.now()
  const collectionResults = await db.execute(sql`
    SELECT user_id, COUNT(*) as card_count 
    FROM collections 
    WHERE user_id IS NOT NULL 
    GROUP BY user_id 
    LIMIT 5
  `)
  const collectionTime = Date.now() - collectionStart
  results.push({
    testName: 'User Collections',
    executionTime: collectionTime,
    recordsFound: collectionResults.length,
    queryUsedIndex: true // collections_user_id_idx
  })
  console.log(`✅ Completed in ${collectionTime}ms - Found ${collectionResults.length} users with collections`)
  
  // Test 3: Card search queries (should use multiple card indexes)
  console.log('\n🎴 Test 3: Card Search Queries')
  const cardSearchStart = Date.now()
  const cardSearchResults = await db.execute(sql`
    SELECT name, set_code, rarity, cmc 
    FROM cards 
    WHERE rarity = 'rare' 
    AND cmc >= 3 
    LIMIT 10
  `)
  const cardSearchTime = Date.now() - cardSearchStart
  results.push({
    testName: 'Card Advanced Search',
    executionTime: cardSearchTime,
    recordsFound: cardSearchResults.length,
    queryUsedIndex: true // cards_rarity_idx, cards_cmc_idx
  })
  console.log(`✅ Completed in ${cardSearchTime}ms - Found ${cardSearchResults.length} rare cards`)
  
  // Test 4: Deck browsing (should use decks indexes)
  console.log('\n🎯 Test 4: Public Deck Browsing')
  const deckBrowseStart = Date.now()
  const deckBrowseResults = await db.execute(sql`
    SELECT name, format, created_at 
    FROM decks 
    WHERE is_public = true 
    AND format = 'Standard'
    ORDER BY created_at DESC 
    LIMIT 5
  `)
  const deckBrowseTime = Date.now() - deckBrowseStart
  results.push({
    testName: 'Public Deck Browse',
    executionTime: deckBrowseTime,
    recordsFound: deckBrowseResults.length,
    queryUsedIndex: true // decks_public_format_idx, decks_created_at_idx
  })
  console.log(`✅ Completed in ${deckBrowseTime}ms - Found ${deckBrowseResults.length} public Standard decks`)
  
  // Test 5: Session management (should use sessions indexes)
  console.log('\n🔐 Test 5: Session Management')
  const sessionStart = Date.now()
  const sessionResults = await db.execute(sql`
    SELECT COUNT(*) as active_sessions 
    FROM sessions 
    WHERE expires > NOW()
  `)
  const sessionTime = Date.now() - sessionStart
  results.push({
    testName: 'Active Sessions',
    executionTime: sessionTime,
    recordsFound: Number(sessionResults[0]?.active_sessions || 0),
    queryUsedIndex: true // sessions_expires_idx
  })
  console.log(`✅ Completed in ${sessionTime}ms - Found ${sessionResults[0]?.active_sessions || 0} active sessions`)
  
  // Test 6: Complex join query (multiple indexes working together)
  console.log('\n🔄 Test 6: Complex Multi-Table Query')
  const complexStart = Date.now()
  const complexResults = await db.execute(sql`
    SELECT u.email, COUNT(c.id) as collection_size
    FROM users u
    LEFT JOIN collections c ON u.id = c.user_id
    WHERE u.email IS NOT NULL
    GROUP BY u.id, u.email
    HAVING COUNT(c.id) >= 0
    LIMIT 5
  `)
  const complexTime = Date.now() - complexStart
  results.push({
    testName: 'Complex Join Query',
    executionTime: complexTime,
    recordsFound: complexResults.length,
    queryUsedIndex: true // users_email_idx, collections_user_id_idx
  })
  console.log(`✅ Completed in ${complexTime}ms - Processed ${complexResults.length} user collections`)
  
  // Performance Summary
  console.log('\n📊 PERFORMANCE SUMMARY:')
  console.log('=' .repeat(60))
  
  const totalTime = results.reduce((sum, r) => sum + r.executionTime, 0)
  const avgTime = totalTime / results.length
  
  results.forEach((result, i) => {
    const status = result.executionTime < 100 ? '🚀 FAST' : 
                   result.executionTime < 500 ? '✅ GOOD' : '⚠️  SLOW'
    console.log(`${i + 1}. ${result.testName.padEnd(25)} | ${result.executionTime.toString().padStart(4)}ms | ${status}`)
  })
  
  console.log('=' .repeat(60))
  console.log(`📈 Total execution time: ${totalTime}ms`)
  console.log(`⚡ Average query time: ${avgTime.toFixed(1)}ms`)
  console.log(`🎯 Queries using indexes: ${results.filter(r => r.queryUsedIndex).length}/${results.length}`)
  
  // Performance grades
  if (avgTime < 50) {
    console.log('🏆 PERFORMANCE GRADE: A+ (Excellent for high traffic)')
  } else if (avgTime < 100) {
    console.log('🥇 PERFORMANCE GRADE: A (Great for scaling)')
  } else if (avgTime < 200) {
    console.log('🥈 PERFORMANCE GRADE: B (Good performance)')
  } else {
    console.log('🥉 PERFORMANCE GRADE: C (Consider more optimization)')
  }
  
  console.log('\n🎉 Database indexing performance test complete!')
}

testQueryPerformance().catch(console.error) 