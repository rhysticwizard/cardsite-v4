#!/usr/bin/env tsx

/**
 * Field-Level Encryption Test Suite
 * 
 * Tests all encryption/decryption functionality and database operations
 */

import { config } from 'dotenv'
import {
  encryptField,
  decryptField,
  encryptEmail,
  encryptName,
  encryptToken,
  safeDecryptField,
  isFieldEncrypted,
  generateEncryptionKey,
  validateEncryptionSetup
} from '../lib/crypto'
import {
  createEncryptedUser,
  findUserByEmail,
  findUserById,
  updateUserPII
} from '../lib/db/encrypted-operations'

// Load environment variables
config({ path: '.env.local' })

interface TestResult {
  name: string
  success: boolean
  error?: string
  duration: number
}

class EncryptionTester {
  private results: TestResult[] = []

  async runTest(name: string, testFn: () => Promise<void>): Promise<void> {
    const start = Date.now()
    
    try {
      await testFn()
      this.results.push({
        name,
        success: true,
        duration: Date.now() - start
      })
      console.log(`✅ ${name}`)
    } catch (error) {
      this.results.push({
        name,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - start
      })
      console.log(`❌ ${name}: ${error}`)
    }
  }

  // Basic encryption/decryption tests
  async testBasicEncryption(): Promise<void> {
    const testData = [
      'test@example.com',
      'John Doe',
      'A very long string with special characters !@#$%^&*()',
      '中文测试', // Unicode test
      'token_1234567890abcdef'
    ]

    for (const data of testData) {
      const encrypted = encryptField(data)
      if (!encrypted) throw new Error('Encryption returned null')
      
      const decrypted = decryptField(encrypted)
      if (decrypted !== data) {
        throw new Error(`Decryption mismatch: expected "${data}", got "${decrypted}"`)
      }

      if (!isFieldEncrypted(encrypted)) {
        throw new Error('isFieldEncrypted returned false for encrypted data')
      }
    }
  }

  // Test null/undefined handling
  async testNullHandling(): Promise<void> {
    if (encryptField(null) !== null) throw new Error('encryptField(null) should return null')
    if (encryptField(undefined) !== null) throw new Error('encryptField(undefined) should return null')
    if (decryptField(null) !== null) throw new Error('decryptField(null) should return null')
    if (decryptField(undefined) !== null) throw new Error('decryptField(undefined) should return null')
  }

  // Test field-specific encryption functions
  async testFieldSpecificEncryption(): Promise<void> {
    // Email encryption
    const email = 'test@example.com'
    const encryptedEmail = encryptEmail(email)
    if (!encryptedEmail) throw new Error('Email encryption failed')
    
    const decryptedEmail = decryptField(encryptedEmail)
    if (decryptedEmail !== email.toLowerCase()) {
      throw new Error('Email encryption/decryption failed')
    }

    // Name encryption
    const name = '  John Doe  '
    const encryptedName = encryptName(name)
    if (!encryptedName) throw new Error('Name encryption failed')
    
    const decryptedName = decryptField(encryptedName)
    if (decryptedName !== name.trim()) {
      throw new Error('Name encryption/decryption failed')
    }

    // Token encryption
    const token = 'oauth_token_1234567890'
    const encryptedToken = encryptToken(token)
    if (!encryptedToken) throw new Error('Token encryption failed')
    
    const decryptedToken = decryptField(encryptedToken)
    if (decryptedToken !== token) {
      throw new Error('Token encryption/decryption failed')
    }
  }

  // Test safe decryption (for migration compatibility)
  async testSafeDecryption(): Promise<void> {
    const plaintext = 'test@example.com'
    const encrypted = encryptField(plaintext)!
    
    // Should decrypt encrypted data
    if (safeDecryptField(encrypted) !== plaintext) {
      throw new Error('Safe decryption of encrypted data failed')
    }
    
    // Should return plaintext data as-is
    if (safeDecryptField(plaintext) !== plaintext) {
      throw new Error('Safe decryption of plaintext data failed')
    }
  }

  // Test validation functions
  async testValidation(): Promise<void> {
    // Test invalid email
    try {
      encryptEmail('invalid-email')
      throw new Error('Should have thrown error for invalid email')
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes('Invalid email format')) {
        throw error
      }
    }

    // Test name length validation
    try {
      encryptName('x'.repeat(101))
      throw new Error('Should have thrown error for long name')
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes('Invalid name length')) {
        throw error
      }
    }

    // Test token length validation
    try {
      encryptToken('short')
      throw new Error('Should have thrown error for short token')
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes('Invalid token length')) {
        throw error
      }
    }
  }

  // Test database operations (requires database connection)
  async testDatabaseOperations(): Promise<void> {
    const testEmail = `test-${Date.now()}@encryption-test.com`
    const testName = 'Encryption Test User'
    
    // Create user with encrypted data
    const newUser = await createEncryptedUser({
      email: testEmail,
      name: testName,
      username: `testuser${Date.now()}`,
      password: 'hashedpassword123'
    })

    if (newUser.email !== testEmail.toLowerCase()) {
      throw new Error('Created user email mismatch')
    }
    if (newUser.name !== testName) {
      throw new Error('Created user name mismatch')
    }

    // Find user by email
    const foundUser = await findUserByEmail(testEmail)
    if (!foundUser) throw new Error('User not found by email')
    if (foundUser.email !== testEmail.toLowerCase()) {
      throw new Error('Found user email mismatch')
    }

    // Find user by ID
    const foundUserById = await findUserById(newUser.id)
    if (!foundUserById) throw new Error('User not found by ID')
    if (foundUserById.email !== testEmail.toLowerCase()) {
      throw new Error('Found user by ID email mismatch')
    }

    // Update user PII
    const newName = 'Updated Test Name'
    const updatedUser = await updateUserPII(newUser.id, { name: newName })
    if (!updatedUser) throw new Error('User update failed')
    if (updatedUser.name !== newName) {
      throw new Error('Updated user name mismatch')
    }

    console.log(`   • Created and tested user: ${newUser.id}`)
  }

  // Test key generation
  async testKeyGeneration(): Promise<void> {
    const key = generateEncryptionKey()
    if (key.length !== 44) { // Base64 encoded 32 bytes = 44 characters
      throw new Error(`Generated key has wrong length: ${key.length}`)
    }
    
    // Should be valid base64
    try {
      const decoded = Buffer.from(key, 'base64')
      if (decoded.length !== 32) {
        throw new Error(`Decoded key has wrong length: ${decoded.length}`)
      }
    } catch (error) {
      throw new Error('Generated key is not valid base64')
    }
  }

  // Test encryption setup validation
  async testEncryptionSetupValidation(): Promise<void> {
    validateEncryptionSetup()
  }

  // Run all tests
  async runAllTests(): Promise<void> {
    console.log('🔐 Running Field-Level Encryption Tests')
    console.log('=' .repeat(50))

    await this.runTest('Encryption Setup Validation', () => this.testEncryptionSetupValidation())
    await this.runTest('Basic Encryption/Decryption', () => this.testBasicEncryption())
    await this.runTest('Null/Undefined Handling', () => this.testNullHandling())
    await this.runTest('Field-Specific Encryption', () => this.testFieldSpecificEncryption())
    await this.runTest('Safe Decryption', () => this.testSafeDecryption())
    await this.runTest('Input Validation', () => this.testValidation())
    await this.runTest('Key Generation', () => this.testKeyGeneration())
    await this.runTest('Database Operations', () => this.testDatabaseOperations())

    // Print summary
    console.log('\n' + '=' .repeat(50))
    console.log('TEST SUMMARY')
    console.log('=' .repeat(50))

    const passed = this.results.filter(r => r.success).length
    const failed = this.results.filter(r => !r.success).length
    const totalTime = this.results.reduce((sum, r) => sum + r.duration, 0)

    console.log(`Total Tests: ${this.results.length}`)
    console.log(`Passed: ${passed}`)
    console.log(`Failed: ${failed}`)
    console.log(`Total Time: ${totalTime}ms`)

    if (failed > 0) {
      console.log('\nFAILED TESTS:')
      this.results.filter(r => !r.success).forEach(result => {
        console.log(`❌ ${result.name}: ${result.error}`)
      })
      process.exit(1)
    } else {
      console.log('\n🎉 All tests passed!')
    }
  }
}

async function main() {
  const tester = new EncryptionTester()
  await tester.runAllTests()
}

if (require.main === module) {
  main()
} 