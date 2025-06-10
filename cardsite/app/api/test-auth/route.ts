import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db/index'
import { users } from '@/lib/db/schema'
import { sql } from 'drizzle-orm'
import bcrypt from 'bcryptjs'

/**
 * Development-only API endpoint to test database and authentication setup
 */
export async function GET(request: NextRequest) {
  // Only allow in development mode
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'This endpoint is only available in development mode' },
      { status: 403 }
    )
  }

  try {
    console.log('🧪 Testing database connection and user setup...')
    
    // Test 1: Database connection
    const testQuery = await db.select().from(users).limit(1)
    console.log('✅ Database connection successful')

    // Test 2: Check for test user
    const testUser = await db.select({
      id: users.id,
      email: users.email,
      name: users.name,
      password: users.password
    }).from(users)
    .where(sql`lower(${users.email}) = lower('test@test.com')`)
    .limit(1)

    if (testUser.length === 0) {
      console.log('❌ Test user not found')
      
      // Create test user
      const hashedPassword = await bcrypt.hash('TestPassword123!', 12)
      
      await db.insert(users).values({
        email: 'test@test.com',
        name: 'Test User',
        password: hashedPassword,
        username: 'testuser'
      })
      
      console.log('✅ Test user created')
      
      return NextResponse.json({
        success: true,
        message: 'Test user created successfully',
        user: {
          email: 'test@test.com',
          name: 'Test User'
        }
      })
    } else {
      console.log('✅ Test user found:', testUser[0].email)
      
      // Test password verification
      const passwordCheck = await bcrypt.compare('TestPassword123!', testUser[0].password!)
      console.log('✅ Password verification:', passwordCheck)
      
      return NextResponse.json({
        success: true,
        message: 'Test user exists and password verification successful',
        user: {
          id: testUser[0].id,
          email: testUser[0].email,
          name: testUser[0].name,
          passwordCheck
        }
      })
    }

  } catch (error) {
    console.error('❌ Database test failed:', error)
    return NextResponse.json(
      { 
        error: 'Database test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * Create test user manually
 */
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'This endpoint is only available in development mode' },
      { status: 403 }
    )
  }

  try {
    const hashedPassword = await bcrypt.hash('TestPassword123!', 12)
    
    // Delete existing test user first
    await db.delete(users).where(sql`lower(${users.email}) = lower('test@test.com')`)
    
    // Create new test user
    const newUser = await db.insert(users).values({
      email: 'test@test.com',
      name: 'Test User',
      password: hashedPassword,
      username: 'testuser'
    }).returning({
      id: users.id,
      email: users.email,
      name: users.name
    })

    return NextResponse.json({
      success: true,
      message: 'Test user created/updated successfully',
      user: newUser[0]
    })

  } catch (error) {
    console.error('❌ Failed to create test user:', error)
    return NextResponse.json(
      { 
        error: 'Failed to create test user',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 