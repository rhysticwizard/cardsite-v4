import { pgTable, text, serial, timestamp, integer, boolean, jsonb, uuid, varchar, decimal, primaryKey } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// Users table for NextAuth.js authentication
export const users = pgTable('users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name'),
  username: text('username').unique(), // Unique username for the platform
  email: text('email').notNull().unique(),
  emailVerified: timestamp('emailVerified', { mode: 'date' }),
  image: text('image'),
  password: text('password'), // For email/password authentication
})

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
  prices: jsonb('prices').$type<Record<string, string>>(),
  legalities: jsonb('legalities').$type<Record<string, string>>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

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
})

// Decks table
export const decks = pgTable('decks', {
  id: serial('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  description: text('description'),
  format: text('format').notNull(), // Standard, Modern, Commander, etc.
  isPublic: boolean('is_public').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Deck Cards - tracks cards in decks
export const deckCards = pgTable('deck_cards', {
  id: serial('id').primaryKey(),
  deckId: integer('deck_id').references(() => decks.id, { onDelete: 'cascade' }).notNull(),
  cardId: uuid('card_id').references(() => cards.id, { onDelete: 'cascade' }).notNull(),
  quantity: integer('quantity').default(1).notNull(),
  category: text('category').default('mainboard').notNull(), // mainboard, sideboard, commander
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

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
  // Composite primary key for NextAuth compatibility
  pk: primaryKey({ columns: [table.provider, table.providerAccountId] }),
}))

export const sessions = pgTable('sessions', {
  sessionToken: text('sessionToken').primaryKey(),
  userId: text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
})

export const verificationTokens = pgTable('verificationTokens', {
  identifier: text('identifier').notNull(),
  token: text('token').notNull(),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
})

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  collections: many(collections),
  decks: many(decks),
  accounts: many(accounts),
  sessions: many(sessions),
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