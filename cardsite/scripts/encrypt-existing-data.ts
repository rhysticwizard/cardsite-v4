#!/usr/bin/env tsx

/**
 * Data Encryption Migration Script
 * 
 * This script migrates existing plaintext PII data to encrypted format.
 * Run this once when implementing field-level encryption.
 */

import { config } from 'dotenv'
import { 
  migrateUsersToEncrypted, 
  migrateAccountsToEncrypted 
} from '../lib/db/encrypted-operations'
import { validateEncryptionSetup } from '../lib/crypto'

// Load environment variables
config({ path: '.env.local' })

async function main() {
  console.log('🔐 Starting PII Data Encryption Migration')
  console.log('=' .repeat(50))
  
  try {
    // Validate encryption setup first
    console.log('1. Validating encryption setup...')
    validateEncryptionSetup()
    console.log('✅ Encryption setup validated')
    
    // Migrate users table
    console.log('\n2. Migrating users table...')
    const userResults = await migrateUsersToEncrypted()
    console.log(`   • Processed: ${userResults.processed} users`)
    console.log(`   • Encrypted: ${userResults.encrypted} users`)
    
    // Migrate accounts table
    console.log('\n3. Migrating OAuth accounts table...')
    const accountResults = await migrateAccountsToEncrypted()
    console.log(`   • Processed: ${accountResults.processed} accounts`)
    console.log(`   • Encrypted: ${accountResults.encrypted} accounts`)
    
    console.log('\n🎉 Migration completed successfully!')
    console.log(`
Summary:
- Users: ${userResults.encrypted}/${userResults.processed} encrypted
- Accounts: ${accountResults.encrypted}/${accountResults.processed} encrypted
    `)
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
} 