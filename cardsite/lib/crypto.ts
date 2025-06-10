/**
 * Field-Level Encryption for PII Data
 * 
 * Uses TweetNaCl (NaCl crypto library) for symmetric encryption of sensitive data.
 * This implements encryption at rest for personal identifiable information (PII).
 * 
 * Security Features:
 * - XSalsa20-Poly1305 authenticated encryption
 * - Random nonce per encryption (96-bit)
 * - Base64 encoding for database storage
 * - Constant-time operations to prevent timing attacks
 */

import { secretbox, randomBytes } from 'tweetnacl'
import { 
  decodeBase64, 
  encodeBase64, 
  decodeUTF8, 
  encodeUTF8 
} from 'tweetnacl-util'

// Load environment variables in non-Next.js environments
if (typeof window === 'undefined' && !process.env.NEXTAUTH_URL) {
  try {
    require('dotenv').config({ path: '.env.local' })
  } catch (error) {
    // dotenv might not be available in all environments
  }
}

// Environment validation
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY
if (!ENCRYPTION_KEY) {
  throw new Error(
    'ENCRYPTION_KEY is required for field-level encryption. ' +
    'Generate one with: node -e "console.log(require(\'tweetnacl\').randomBytes(32).toString(\'base64\'))"'
  )
}

// Convert base64 key to Uint8Array
const encryptionKey = decodeBase64(ENCRYPTION_KEY)
if (encryptionKey.length !== 32) {
  throw new Error('ENCRYPTION_KEY must be 32 bytes (256 bits) when base64 decoded')
}

// Constants
const NONCE_LENGTH = 24  // 192 bits for XSalsa20
const ENCRYPTED_PREFIX = 'enc:'  // Prefix to identify encrypted fields

/**
 * Encrypts a string value for secure database storage
 * 
 * @param plaintext - The string to encrypt
 * @returns Base64 encoded encrypted data with prefix, or null if input is null/undefined
 */
export function encryptField(plaintext: string | null | undefined): string | null {
  if (!plaintext) return null
  
  try {
    // Generate random nonce for this encryption
    const nonce = randomBytes(NONCE_LENGTH)
    
    // Convert plaintext to Uint8Array
    const plaintextBytes = decodeUTF8(plaintext)
    
    // Encrypt using XSalsa20-Poly1305
    const ciphertext = secretbox(plaintextBytes, nonce, encryptionKey)
    
    // Combine nonce + ciphertext
    const combined = new Uint8Array(nonce.length + ciphertext.length)
    combined.set(nonce)
    combined.set(ciphertext, nonce.length)
    
    // Encode to base64 with prefix
    return ENCRYPTED_PREFIX + encodeBase64(combined)
  } catch (error) {
    console.error('Encryption error:', error)
    throw new Error('Failed to encrypt field data')
  }
}

/**
 * Decrypts a string value from database storage
 * 
 * @param encryptedData - The encrypted string from database (with prefix)
 * @returns Decrypted plaintext string, or null if input is null/undefined
 */
export function decryptField(encryptedData: string | null | undefined): string | null {
  if (!encryptedData) return null
  
  try {
    // Check for encryption prefix
    if (!encryptedData.startsWith(ENCRYPTED_PREFIX)) {
      // If no prefix, assume it's legacy unencrypted data
      console.warn('Attempting to decrypt data without encryption prefix - treating as plaintext')
      return encryptedData
    }
    
    // Remove prefix and decode base64
    const base64Data = encryptedData.slice(ENCRYPTED_PREFIX.length)
    const combined = decodeBase64(base64Data)
    
    // Extract nonce and ciphertext
    const nonce = combined.slice(0, NONCE_LENGTH)
    const ciphertext = combined.slice(NONCE_LENGTH)
    
    // Decrypt using XSalsa20-Poly1305
    const plaintextBytes = secretbox.open(ciphertext, nonce, encryptionKey)
    
    if (!plaintextBytes) {
      throw new Error('Decryption failed - invalid ciphertext or key')
    }
    
    // Convert back to string
    return encodeUTF8(plaintextBytes)
  } catch (error) {
    console.error('Decryption error:', error)
    throw new Error('Failed to decrypt field data')
  }
}

/**
 * Checks if a field value is encrypted (has the encryption prefix)
 * 
 * @param value - The field value to check
 * @returns True if the value appears to be encrypted
 */
export function isFieldEncrypted(value: string | null | undefined): boolean {
  return !!(value && value.startsWith(ENCRYPTED_PREFIX))
}

/**
 * Migrates plaintext data to encrypted format
 * Used for gradually encrypting existing database records
 * 
 * @param plaintext - The plaintext value to encrypt if not already encrypted
 * @returns Encrypted value, or original if already encrypted
 */
export function migrateToEncrypted(plaintext: string | null | undefined): string | null {
  if (!plaintext) return null
  
  // If already encrypted, return as-is
  if (isFieldEncrypted(plaintext)) {
    return plaintext
  }
  
  // Otherwise, encrypt it
  return encryptField(plaintext)
}

/**
 * Safely decrypts data that might be plaintext (for migration compatibility)
 * 
 * @param data - The data that might be encrypted or plaintext
 * @returns Decrypted/plaintext string
 */
export function safeDecryptField(data: string | null | undefined): string | null {
  if (!data) return null
  
  // If not encrypted, return as plaintext
  if (!isFieldEncrypted(data)) {
    return data
  }
  
  // Otherwise decrypt it
  return decryptField(data)
}

/**
 * Generates a new encryption key for .env configuration
 * 
 * @returns Base64 encoded 256-bit encryption key
 */
export function generateEncryptionKey(): string {
  const key = randomBytes(32)  // 256 bits
  return encodeBase64(key)
}

/**
 * Validates the current encryption setup
 * 
 * @throws Error if encryption setup is invalid
 */
export function validateEncryptionSetup(): void {
  if (!ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY environment variable is not set')
  }
  
  if (encryptionKey.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be 32 bytes (256 bits) when base64 decoded')
  }
  
  // Test encryption/decryption cycle
  const testValue = 'test@example.com'
  const encrypted = encryptField(testValue)
  const decrypted = decryptField(encrypted)
  
  if (decrypted !== testValue) {
    throw new Error('Encryption/decryption test failed')
  }
}

// Field-specific encryption functions for type safety

/**
 * Encrypts an email address with additional validation
 */
export function encryptEmail(email: string | null | undefined): string | null {
  if (!email) return null
  
  // Basic email validation before encryption
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    throw new Error('Invalid email format for encryption')
  }
  
  return encryptField(email.toLowerCase().trim())
}

/**
 * Encrypts a user's name with length validation
 */
export function encryptName(name: string | null | undefined): string | null {
  if (!name) return null
  
  // Validate name length (reasonable limits)
  const trimmedName = name.trim()
  if (trimmedName.length === 0 || trimmedName.length > 100) {
    throw new Error('Invalid name length for encryption')
  }
  
  return encryptField(trimmedName)
}

/**
 * Encrypts OAuth tokens with validation
 */
export function encryptToken(token: string | null | undefined): string | null {
  if (!token) return null
  
  // Basic token validation - should be non-empty and reasonable length
  if (token.length < 10 || token.length > 10000) {
    throw new Error('Invalid token length for encryption')
  }
  
  return encryptField(token)
}

// Initialize and validate encryption on module load
validateEncryptionSetup()

export default {
  encryptField,
  decryptField,
  isFieldEncrypted,
  migrateToEncrypted,
  safeDecryptField,
  generateEncryptionKey,
  validateEncryptionSetup,
  encryptEmail,
  encryptName,
  encryptToken,
} 