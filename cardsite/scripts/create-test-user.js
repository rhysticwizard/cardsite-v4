const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');
const bcrypt = require('bcryptjs');

// Import schema
const schema = require('../lib/db/schema');

require('dotenv').config({ path: '.env.local' });

async function createTestUser() {
  const client = postgres(process.env.DATABASE_URL, { prepare: false });
  const db = drizzle(client, { schema });

  try {
    console.log('🔐 Creating test user...');
    
    // Hash the password
    const hashedPassword = await bcrypt.hash('TestPassword123!', 12);
    
    // Create test user
    const testUser = {
      username: 'testuser',
      email: 'test@test.com',
      password: hashedPassword,
      name: 'Test User',
      emailVerified: new Date(), // Mark as verified for testing
    };

    // Check if user already exists
    const existingUser = await db.select()
      .from(schema.users)
      .where(schema.users.email.ilike('test@test.com'))
      .limit(1);

    if (existingUser.length > 0) {
      console.log('✅ Test user already exists!');
      console.log('   Email: test@test.com');
      console.log('   Password: TestPassword123!');
      return;
    }

    // Insert test user
    const newUser = await db.insert(schema.users).values(testUser).returning();
    
    console.log('✅ Test user created successfully!');
    console.log('   Email: test@test.com');
    console.log('   Password: TestPassword123!');
    console.log('   User ID:', newUser[0].id);
    
  } catch (error) {
    console.error('❌ Error creating test user:', error);
  } finally {
    process.exit(0);
  }
}

createTestUser(); 