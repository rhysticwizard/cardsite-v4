import { pgTable, text, serial, timestamp, integer, boolean, jsonb, uuid, varchar, decimal, primaryKey, index } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { eq } from 'drizzle-orm'

// Users table for NextAuth.js authentication
export const users = pgTable('users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name'),
  username: text('username').unique(), // Unique username for the platform
  email: text('email').notNull().unique(),
  emailVerified: timestamp('emailVerified', { mode: 'date' }),
  image: text('image'),
  password: text('password'), // For email/password authentication
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  // Index for authentication queries
  emailIdx: index('users_email_idx').on(table.email),
  // Index for user listings and pagination
  createdAtIdx: index('users_created_at_idx').on(table.createdAt),
}))

// Error Logs table for persistent error tracking
export const errorLogs = pgTable('error_logs', {
  id: serial('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'set null' }), // Optional user context
  errorType: text('error_type').notNull(), // 'server_error', 'client_error', 'auth_error', etc.
  severity: text('severity').notNull(), // 'low', 'medium', 'high', 'critical'
  message: text('message').notNull(),
  stack: text('stack'), // Stack trace
  url: text('url'), // URL where error occurred
  userAgent: text('user_agent'), // Browser/client info
  ip: text('ip_address'), // IP address
  metadata: jsonb('metadata').$type<Record<string, any>>(), // Additional context
  resolved: boolean('resolved').default(false).notNull(),
  resolvedAt: timestamp('resolved_at'),
  resolvedBy: text('resolved_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  // Performance indexes for error monitoring
  errorTypeIdx: index('error_logs_error_type_idx').on(table.errorType),
  severityIdx: index('error_logs_severity_idx').on(table.severity),
  createdAtIdx: index('error_logs_created_at_idx').on(table.createdAt),
  resolvedIdx: index('error_logs_resolved_idx').on(table.resolved),
  userIdIdx: index('error_logs_user_id_idx').on(table.userId),
  // Composite index for error analysis
  typeSeverityIdx: index('error_logs_type_severity_idx').on(table.errorType, table.severity),
  unresolvedIdx: index('error_logs_unresolved_idx').on(table.resolved, table.createdAt),
}))

// MTG Cards table - stores card information from Scryfall
export const cards = pgTable('cards', {
  id: uuid('id').primaryKey(),
  scryfallId: text('scryfall_id').unique().notNull(),
  name: text('name').notNull(),
  manaCost: text('mana_cost'),
  cmc: decimal('cmc', { precision: 3, scale: 1 }),
  typeLine: text('type_line').notNull(),
  oracleText: text('oracle_text'),
  power: text('power'),
  toughness: text('toughness'),
  colors: jsonb('colors').$type<string[]>(),
  colorIdentity: jsonb('color_identity').$type<string[]>(),
  rarity: text('rarity').notNull(),
  setCode: text('set_code').notNull(),
  setName: text('set_name').notNull(),
  collectorNumber: text('collector_number').notNull(),
  imageUris: jsonb('image_uris').$type<Record<string, string>>(),
  cardFaces: jsonb('card_faces').$type<any[]>(),
  prices: jsonb('prices').$type<Record<string, string>>(),
  legalities: jsonb('legalities').$type<Record<string, string>>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  // Card search indexes (most critical for performance)
  nameIdx: index('cards_name_idx').on(table.name),
  typeLineIdx: index('cards_type_line_idx').on(table.typeLine),
  setCodeIdx: index('cards_set_code_idx').on(table.setCode),
  rarityIdx: index('cards_rarity_idx').on(table.rarity),
  cmcIdx: index('cards_cmc_idx').on(table.cmc),
  // Composite index for advanced card filtering
  setRarityIdx: index('cards_set_rarity_idx').on(table.setCode, table.rarity),
  // Text search index for oracle text
  oracleTextIdx: index('cards_oracle_text_idx').on(table.oracleText),
}))

// User Collections - tracks which cards users own
export const collections = pgTable('collections', {
  id: serial('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  cardId: uuid('card_id').references(() => cards.id, { onDelete: 'cascade' }).notNull(),
  quantity: integer('quantity').default(1).notNull(),
  condition: text('condition').default('near_mint').notNull(),
  foil: boolean('foil').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  // Critical indexes for user collection queries
  userIdIdx: index('collections_user_id_idx').on(table.userId),
  cardIdIdx: index('collections_card_id_idx').on(table.cardId),
  // Composite index for user's specific card lookups
  userCardIdx: index('collections_user_card_idx').on(table.userId, table.cardId),
  // Index for condition-based queries
  conditionIdx: index('collections_condition_idx').on(table.condition),
  // Index for foil card queries
  foilIdx: index('collections_foil_idx').on(table.foil),
}))

// Decks table - optimized for 1M+ decks
export const decks = pgTable('decks', {
  id: varchar('id', { length: 12 }).primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  format: varchar('format', { length: 50 }).notNull().default('standard'),
  isPublic: boolean('is_public').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('decks_user_id_idx').on(table.userId),
  formatIdx: index('decks_format_idx').on(table.format),
  publicIdx: index('decks_public_idx').on(table.isPublic),
  createdAtIdx: index('decks_created_at_idx').on(table.createdAt),
  // Performance indexes for 1M+ scale
  userFormatIdx: index('decks_user_format_idx').on(table.userId, table.format),
  userCreatedIdx: index('decks_user_created_idx').on(table.userId, table.createdAt),
  userPublicCreatedIdx: index('decks_user_public_created_idx').on(table.userId, table.isPublic, table.createdAt),
  publicCreatedIdx: index('decks_public_created_idx').on(table.isPublic, table.createdAt).where(eq(table.isPublic, true)),
}))

// Deck Cards - tracks cards in decks (optimized for 1M+ decks)
export const deckCards = pgTable('deck_cards', {
  id: varchar('id', { length: 12 }).primaryKey(),
  deckId: varchar('deck_id', { length: 12 }).notNull().references(() => decks.id, { onDelete: 'cascade' }),
  cardId: uuid('card_id').notNull().references(() => cards.id, { onDelete: 'cascade' }),
  quantity: integer('quantity').notNull().default(1),
  category: varchar('category', { length: 50 }).notNull().default('mainboard'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  deckIdIdx: index('deck_cards_deck_id_idx').on(table.deckId),
  cardIdIdx: index('deck_cards_card_id_idx').on(table.cardId),
  deckCategoryIdx: index('deck_cards_deck_category_idx').on(table.deckId, table.category),
}))

// Next Auth tables
export const accounts = pgTable('accounts', {
  userId: text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  provider: text('provider').notNull(),
  providerAccountId: text('providerAccountId').notNull(),
  refresh_token: text('refresh_token'),
  access_token: text('access_token'),
  expires_at: integer('expires_at'),
  token_type: text('token_type'),
  scope: text('scope'),
  id_token: text('id_token'),
  session_state: text('session_state'),
}, (table) => ({
  // Authentication optimization indexes
  userIdIdx: index('accounts_user_id_idx').on(table.userId),
  providerIdx: index('accounts_provider_idx').on(table.provider),
  providerAccountIdx: index('accounts_provider_account_idx').on(table.provider, table.providerAccountId),
}))

export const sessions = pgTable('sessions', {
  sessionToken: text('sessionToken').primaryKey(),
  userId: text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
}, (table) => ({
  // Session management indexes
  userIdIdx: index('sessions_user_id_idx').on(table.userId),
  expiresIdx: index('sessions_expires_idx').on(table.expires),
}))

export const verificationTokens = pgTable('verificationTokens', {
  identifier: text('identifier').notNull(),
  token: text('token').notNull(),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
}, (table) => ({
  // Verification token cleanup indexes
  identifierIdx: index('verification_tokens_identifier_idx').on(table.identifier),
  tokenIdx: index('verification_tokens_token_idx').on(table.token),
  expiresIdx: index('verification_tokens_expires_idx').on(table.expires),
}))

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  collections: many(collections),
  decks: many(decks),
  accounts: many(accounts),
  sessions: many(sessions),
  errorLogs: many(errorLogs),
  resolvedErrors: many(errorLogs, { relationName: 'resolvedErrors' }),
}))

export const errorLogsRelations = relations(errorLogs, ({ one }) => ({
  user: one(users, {
    fields: [errorLogs.userId],
    references: [users.id],
  }),
  resolver: one(users, {
    fields: [errorLogs.resolvedBy],
    references: [users.id],
    relationName: 'resolvedErrors',
  }),
}))

export const cardsRelations = relations(cards, ({ many }) => ({
  collections: many(collections),
  deckCards: many(deckCards),
}))

export const collectionsRelations = relations(collections, ({ one }) => ({
  user: one(users, {
    fields: [collections.userId],
    references: [users.id],
  }),
  card: one(cards, {
    fields: [collections.cardId],
    references: [cards.id],
  }),
}))

export const decksRelations = relations(decks, ({ one, many }) => ({
  user: one(users, {
    fields: [decks.userId],
    references: [users.id],
  }),
  cards: many(deckCards),
}))

export const deckCardsRelations = relations(deckCards, ({ one }) => ({
  deck: one(decks, {
    fields: [deckCards.deckId],
    references: [decks.id],
  }),
  card: one(cards, {
    fields: [deckCards.cardId],
    references: [cards.id],
  }),
}))

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}))

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
})) 