import { db } from '../lib/db/index'
import { users } from '../lib/db/schema'
import { and, like, ne } from 'drizzle-orm'

async function cleanupTestUsers() {
  try {
    console.log('🧹 Starting test user cleanup...')
    
    // First, let's see what test users we have
    const testUsers = await db
      .select({
        id: users.id,
        name: users.name,
        username: users.username,
        email: users.email,
      })
      .from(users)
      .where(
        like(users.email, '%test%')
      )
    
    console.log(`Found ${testUsers.length} test users:`)
    testUsers.forEach(user => {
      console.log(`- ${user.name || user.email} (@${user.username || 'no-username'}) - ${user.email}`)
    })
    
    // Find the main "Test User" to preserve (the one with @testuser username)
    const mainTestUser = testUsers.find(user => user.username === 'testuser')
    
    if (!mainTestUser) {
      console.log('❌ Could not find main Test User with @testuser username!')
      console.log('Available usernames:', testUsers.map(u => u.username))
      return
    }
    
    console.log(`✅ Preserving main Test User: ${mainTestUser.name} (@${mainTestUser.username})`)
    
    // Delete all test users EXCEPT the main one
    const result = await db
      .delete(users)
      .where(
        and(
          like(users.email, '%test%'),
          ne(users.id, mainTestUser.id)
        )
      )
    
    console.log(`🗑️ Deleted test users successfully`)
    console.log('✅ Cleanup complete! Only the main Test User remains.')
    
    // Verify the cleanup
    const remainingTestUsers = await db
      .select({
        id: users.id,
        name: users.name,
        username: users.username,
        email: users.email,
      })
      .from(users)
      .where(
        like(users.email, '%test%')
      )
    
    console.log(`\n📊 Remaining test users: ${remainingTestUsers.length}`)
    remainingTestUsers.forEach(user => {
      console.log(`- ${user.name || user.email} (@${user.username || 'no-username'}) - ${user.email}`)
    })
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error)
  }
}

// Run the cleanup
cleanupTestUsers()
  .then(() => {
    console.log('🎉 Script completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Script failed:', error)
    process.exit(1)
  }) 