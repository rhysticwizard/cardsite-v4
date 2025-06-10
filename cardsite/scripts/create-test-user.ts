import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import bcrypt from 'bcryptjs';
import * as schema from '../lib/db/schema';
import { eq } from 'drizzle-orm';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function createTestUser() {
  const client = postgres(process.env.DATABASE_URL!, { prepare: false });
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
      .where(eq(schema.users.email, 'test@test.com'))
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
    await client.end();
    process.exit(0);
  }
}

createTestUser(); 