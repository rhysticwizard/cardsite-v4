/**
 * Encrypted Database Operations
 * 
 * This module provides database operations that automatically handle
 * encryption/decryption of PII fields in the users and accounts tables.
 */

import { db } from './index'
import { users, accounts } from './schema'
import { eq, sql } from 'drizzle-orm'
import { 
  encryptEmail, 
  encryptName, 
  encryptToken,
  safeDecryptField,
  decryptField,
  migrateToEncrypted,
  isFieldEncrypted
} from '../crypto'

// User-related encrypted operations

export interface SafeUser {
  id: string
  email: string
  name?: string | null
  username?: string | null
  image?: string | null
  emailVerified?: Date | null
  password?: string | null
}

export interface CreateUserData {
  email: string
  name?: string | null
  username?: string | null
  password?: string | null
  image?: string | null
}

/**
 * Creates a new user with encrypted PII fields
 */
export async function createEncryptedUser(userData: CreateUserData): Promise<SafeUser> {
  const encryptedEmail = encryptEmail(userData.email)
  if (!encryptedEmail) {
    throw new Error('Failed to encrypt user email')
  }

  const encryptedData = {
    id: crypto.randomUUID(),
    email: encryptedEmail,
    name: encryptName(userData.name),
    username: userData.username, // Username is not PII, kept as plaintext for uniqueness constraints
    password: userData.password, // Already hashed by bcrypt
    image: userData.image, // Image URLs are not PII
  }

  const [insertedUser] = await db.insert(users)
    .values(encryptedData)
    .returning({
      id: users.id,
      email: users.email,
      name: users.name,
      username: users.username,
      image: users.image,
      emailVerified: users.emailVerified,
      password: users.password,
    })

  // Return decrypted data for application use
  return {
    id: insertedUser.id,
    email: safeDecryptField(insertedUser.email)!,
    name: safeDecryptField(insertedUser.name),
    username: insertedUser.username,
    image: insertedUser.image,
    emailVerified: insertedUser.emailVerified,
    password: insertedUser.password,
  }
}

/**
 * Finds a user by email (handles encrypted email search)
 * Note: For encrypted fields, we need to scan and decrypt due to random nonces
 */
export async function findUserByEmail(email: string): Promise<SafeUser | null> {
  const normalizedEmail = email.toLowerCase().trim()
  
  // Get all users (in production, we'd implement email hash indexing for better performance)
  const allUsers = await db.select({
    id: users.id,
    email: users.email,
    name: users.name,
    username: users.username,
    image: users.image,
    emailVerified: users.emailVerified,
    password: users.password,
  }).from(users)

  // Search through users and decrypt emails to find match
  for (const user of allUsers) {
    try {
      const decryptedEmail = safeDecryptField(user.email)
      if (decryptedEmail && decryptedEmail.toLowerCase() === normalizedEmail) {
        // Return decrypted data
        return {
          id: user.id,
          email: decryptedEmail,
          name: safeDecryptField(user.name),
          username: user.username,
          image: user.image,
          emailVerified: user.emailVerified,
          password: user.password,
        }
      }
    } catch (error) {
      // Skip users with corrupted email data
      console.warn('Failed to decrypt email for user:', user.id)
      continue
    }
  }

  return null
}

/**
 * Finds a user by ID with decrypted PII
 */
export async function findUserById(userId: string): Promise<SafeUser | null> {
  const userResults = await db.select({
    id: users.id,
    email: users.email,
    name: users.name,
    username: users.username,
    image: users.image,
    emailVerified: users.emailVerified,
    password: users.password,
  }).from(users)
  .where(eq(users.id, userId))
  .limit(1)

  if (userResults.length === 0) {
    return null
  }

  const user = userResults[0]
  
  return {
    id: user.id,
    email: safeDecryptField(user.email)!,
    name: safeDecryptField(user.name),
    username: user.username,
    image: user.image,
    emailVerified: user.emailVerified,
    password: user.password,
  }
}

/**
 * Updates user PII with encryption
 */
export async function updateUserPII(
  userId: string, 
  updates: { email?: string; name?: string }
): Promise<SafeUser | null> {
  const encryptedUpdates: any = {}
  
  if (updates.email !== undefined) {
    encryptedUpdates.email = encryptEmail(updates.email)
  }
  
  if (updates.name !== undefined) {
    encryptedUpdates.name = encryptName(updates.name)
  }

  const updatedUsers = await db.update(users)
    .set(encryptedUpdates)
    .where(eq(users.id, userId))
    .returning({
      id: users.id,
      email: users.email,
      name: users.name,
      username: users.username,
      image: users.image,
      emailVerified: users.emailVerified,
      password: users.password,
    })

  if (updatedUsers.length === 0) {
    return null
  }

  const user = updatedUsers[0]
  
  return {
    id: user.id,
    email: safeDecryptField(user.email)!,
    name: safeDecryptField(user.name),
    username: user.username,
    image: user.image,
    emailVerified: user.emailVerified,
    password: user.password,
  }
}

// OAuth account encrypted operations

export interface SafeAccount {
  userId: string
  type: string
  provider: string
  providerAccountId: string
  refresh_token?: string | null
  access_token?: string | null
  expires_at?: number | null
  token_type?: string | null
  scope?: string | null
  id_token?: string | null
  session_state?: string | null
}

/**
 * Creates OAuth account with encrypted tokens
 */
export async function createEncryptedAccount(accountData: {
  userId: string
  type: string
  provider: string
  providerAccountId: string
  refresh_token?: string | null
  access_token?: string | null
  expires_at?: number | null
  token_type?: string | null
  scope?: string | null
  id_token?: string | null
  session_state?: string | null
}): Promise<SafeAccount> {
  const encryptedData = {
    ...accountData,
    refresh_token: encryptToken(accountData.refresh_token),
    access_token: encryptToken(accountData.access_token),
    id_token: encryptToken(accountData.id_token),
  }

  await db.insert(accounts).values(encryptedData)

  // Return decrypted data
  return {
    ...accountData,
    refresh_token: accountData.refresh_token,
    access_token: accountData.access_token,
    id_token: accountData.id_token,
  }
}

/**
 * Finds OAuth account with decrypted tokens
 */
export async function findAccountByProvider(
  provider: string, 
  providerAccountId: string
): Promise<SafeAccount | null> {
  const accountResults = await db.select()
    .from(accounts)
    .where(
      sql`${accounts.provider} = ${provider} AND ${accounts.providerAccountId} = ${providerAccountId}`
    )
    .limit(1)

  if (accountResults.length === 0) {
    return null
  }

  const account = accountResults[0]
  
  return {
    userId: account.userId,
    type: account.type,
    provider: account.provider,
    providerAccountId: account.providerAccountId,
    refresh_token: safeDecryptField(account.refresh_token),
    access_token: safeDecryptField(account.access_token),
    expires_at: account.expires_at,
    token_type: account.token_type,
    scope: account.scope,
    id_token: safeDecryptField(account.id_token),
    session_state: account.session_state,
  }
}

// Migration functions for existing data

/**
 * Migrates existing users to encrypted format
 */
export async function migrateUsersToEncrypted(): Promise<{ processed: number; encrypted: number }> {
  const allUsers = await db.select().from(users)
  
  let processed = 0
  let encrypted = 0
  
  for (const user of allUsers) {
    let needsUpdate = false
    const updates: any = {}
    
    // Check if email needs encryption
    if (user.email && !isFieldEncrypted(user.email)) {
      updates.email = encryptEmail(user.email)
      needsUpdate = true
    }
    
    // Check if name needs encryption
    if (user.name && !isFieldEncrypted(user.name)) {
      updates.name = encryptName(user.name)
      needsUpdate = true
    }
    
    if (needsUpdate) {
      await db.update(users)
        .set(updates)
        .where(eq(users.id, user.id))
      encrypted++
    }
    
    processed++
  }
  
  return { processed, encrypted }
}

/**
 * Migrates existing OAuth accounts to encrypted format
 */
export async function migrateAccountsToEncrypted(): Promise<{ processed: number; encrypted: number }> {
  const allAccounts = await db.select().from(accounts)
  
  let processed = 0
  let encrypted = 0
  
  for (const account of allAccounts) {
    let needsUpdate = false
    const updates: any = {}
    
    // Check tokens that need encryption
    if (account.refresh_token && !isFieldEncrypted(account.refresh_token)) {
      updates.refresh_token = encryptToken(account.refresh_token)
      needsUpdate = true
    }
    
    if (account.access_token && !isFieldEncrypted(account.access_token)) {
      updates.access_token = encryptToken(account.access_token)
      needsUpdate = true
    }
    
    if (account.id_token && !isFieldEncrypted(account.id_token)) {
      updates.id_token = encryptToken(account.id_token)
      needsUpdate = true
    }
    
    if (needsUpdate) {
      await db.update(accounts)
        .set(updates)
        .where(
          sql`${accounts.provider} = ${account.provider} AND ${accounts.providerAccountId} = ${account.providerAccountId}`
        )
      encrypted++
    }
    
    processed++
  }
  
  return { processed, encrypted }
}

export default {
  createEncryptedUser,
  findUserByEmail,
  findUserById,
  updateUserPII,
  createEncryptedAccount,
  findAccountByProvider,
  migrateUsersToEncrypted,
  migrateAccountsToEncrypted,
} 