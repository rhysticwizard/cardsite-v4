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

// User Collections (groups) - organized collections like decks but for collection management
export const userCollections = pgTable('user_collections', {
  id: varchar('id', { length: 12 }).primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  format: varchar('format', { length: 50 }).notNull().default('standard'),
  isPublic: boolean('is_public').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('user_collections_user_id_idx').on(table.userId),
  formatIdx: index('user_collections_format_idx').on(table.format),
  publicIdx: index('user_collections_public_idx').on(table.isPublic),
  createdAtIdx: index('user_collections_created_at_idx').on(table.createdAt),
  // Performance indexes for 1M+ scale
  userFormatIdx: index('user_collections_user_format_idx').on(table.userId, table.format),
  userCreatedIdx: index('user_collections_user_created_idx').on(table.userId, table.createdAt),
  userPublicCreatedIdx: index('user_collections_user_public_created_idx').on(table.userId, table.isPublic, table.createdAt),
  publicCreatedIdx: index('user_collections_public_created_idx').on(table.isPublic, table.createdAt).where(eq(table.isPublic, true)),
}))

// User Collection Cards - tracks cards in user collections
export const userCollectionCards = pgTable('user_collection_cards', {
  id: varchar('id', { length: 12 }).primaryKey(),
  collectionId: varchar('collection_id', { length: 12 }).notNull().references(() => userCollections.id, { onDelete: 'cascade' }),
  cardId: uuid('card_id').notNull().references(() => cards.id, { onDelete: 'cascade' }),
  quantity: integer('quantity').notNull().default(1),
  category: varchar('category', { length: 50 }).notNull().default('mainboard'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  collectionIdIdx: index('user_collection_cards_collection_id_idx').on(table.collectionId),
  cardIdIdx: index('user_collection_cards_card_id_idx').on(table.cardId),
  collectionCategoryIdx: index('user_collection_cards_collection_category_idx').on(table.collectionId, table.category),
}))

// Game Rooms - for multiplayer MTG games
export const gameRooms = pgTable('game_rooms', {
  id: varchar('id', { length: 12 }).primaryKey(),
  hostId: varchar('host_id', { length: 255 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  format: varchar('format', { length: 50 }).notNull().default('commander'),
  status: varchar('status', { length: 20 }).notNull().default('waiting'), // waiting, playing, finished
  maxPlayers: integer('max_players').notNull().default(4),
  currentPlayers: integer('current_players').notNull().default(1),
  settings: jsonb('settings').$type<{
    powerLevel?: number;
    isPrivate?: boolean;
    password?: string;
    allowSpectators?: boolean;
    tags?: string[];
  }>(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  // Game room query indexes
  hostIdIdx: index('game_rooms_host_id_idx').on(table.hostId),
  statusIdx: index('game_rooms_status_idx').on(table.status),
  formatIdx: index('game_rooms_format_idx').on(table.format),
  createdAtIdx: index('game_rooms_created_at_idx').on(table.createdAt),
  // Composite indexes for game browsing
  statusFormatIdx: index('game_rooms_status_format_idx').on(table.status, table.format),
  publicGamesIdx: index('game_rooms_public_idx').on(table.status, table.createdAt).where(eq(table.status, 'waiting')),
}))

// Game Participants - tracks players in each game room
export const gameParticipants = pgTable('game_participants', {
  id: varchar('id', { length: 12 }).primaryKey(),
  gameId: varchar('game_id', { length: 12 }).notNull().references(() => gameRooms.id, { onDelete: 'cascade' }),
  userId: varchar('user_id', { length: 255 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  deckId: varchar('deck_id', { length: 12 }).references(() => decks.id, { onDelete: 'set null' }),
  seatPosition: integer('seat_position').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('joined'), // joined, ready, playing, disconnected
  joinedAt: timestamp('joined_at').notNull().defaultNow(),
}, (table) => ({
  // Participant query indexes
  gameIdIdx: index('game_participants_game_id_idx').on(table.gameId),
  userIdIdx: index('game_participants_user_id_idx').on(table.userId),
  deckIdIdx: index('game_participants_deck_id_idx').on(table.deckId),
  // Unique constraint: one user per game
  gameUserIdx: index('game_participants_game_user_idx').on(table.gameId, table.userId),
  // Unique constraint: one seat per game
  gameSeatIdx: index('game_participants_game_seat_idx').on(table.gameId, table.seatPosition),
}))

// Friend Requests - tracks pending friend requests
export const friendRequests = pgTable('friend_requests', {
  id: varchar('id', { length: 12 }).primaryKey(),
  senderId: varchar('sender_id', { length: 255 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  receiverId: varchar('receiver_id', { length: 255 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  status: varchar('status', { length: 20 }).notNull().default('pending'), // pending, accepted, declined
  createdAt: timestamp('created_at').notNull().defaultNow(),
  respondedAt: timestamp('responded_at'),
}, (table) => ({
  // Friend request query indexes
  senderIdIdx: index('friend_requests_sender_id_idx').on(table.senderId),
  receiverIdIdx: index('friend_requests_receiver_id_idx').on(table.receiverId),
  statusIdx: index('friend_requests_status_idx').on(table.status),
  // Unique constraint: one request per sender-receiver pair
  senderReceiverIdx: index('friend_requests_sender_receiver_idx').on(table.senderId, table.receiverId),
  // Index for pending requests
  receiverStatusIdx: index('friend_requests_receiver_status_idx').on(table.receiverId, table.status),
}))

// Friendships - tracks established friendships
export const friendships = pgTable('friendships', {
  id: varchar('id', { length: 12 }).primaryKey(),
  user1Id: varchar('user1_id', { length: 255 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  user2Id: varchar('user2_id', { length: 255 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  // Friendship query indexes
  user1IdIdx: index('friendships_user1_id_idx').on(table.user1Id),
  user2IdIdx: index('friendships_user2_id_idx').on(table.user2Id),
  // Unique constraint: one friendship per user pair (bidirectional)
  user1User2Idx: index('friendships_user1_user2_idx').on(table.user1Id, table.user2Id),
  user2User1Idx: index('friendships_user2_user1_idx').on(table.user2Id, table.user1Id),
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

// Forum Posts - tracks forum posts and discussions
export const forumPosts = pgTable('forum_posts', {
  id: varchar('id', { length: 12 }).primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content').notNull(),
  category: varchar('category', { length: 50 }).notNull(),
  subcategory: varchar('subcategory', { length: 100 }),
  isPinned: boolean('is_pinned').notNull().default(false),
  isLocked: boolean('is_locked').notNull().default(false),
  views: integer('views').notNull().default(0),
  replyCount: integer('reply_count').notNull().default(0),
  lastReplyAt: timestamp('last_reply_at'),
  lastReplyBy: varchar('last_reply_by', { length: 255 }).references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  // Forum post query indexes
  userIdIdx: index('forum_posts_user_id_idx').on(table.userId),
  categoryIdx: index('forum_posts_category_idx').on(table.category),
  subcategoryIdx: index('forum_posts_subcategory_idx').on(table.subcategory),
  createdAtIdx: index('forum_posts_created_at_idx').on(table.createdAt),
  lastReplyAtIdx: index('forum_posts_last_reply_at_idx').on(table.lastReplyAt),
  // Composite indexes for forum browsing
  categoryCreatedIdx: index('forum_posts_category_created_idx').on(table.category, table.createdAt),
  categoryLastReplyIdx: index('forum_posts_category_last_reply_idx').on(table.category, table.lastReplyAt),
  pinnedIdx: index('forum_posts_pinned_idx').on(table.isPinned, table.createdAt),
}))

// Forum Comments - tracks replies to forum posts
export const forumComments = pgTable('forum_comments', {
  id: varchar('id', { length: 12 }).primaryKey(),
  postId: varchar('post_id', { length: 12 }).notNull().references(() => forumPosts.id, { onDelete: 'cascade' }),
  userId: varchar('user_id', { length: 255 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  parentId: varchar('parent_id', { length: 12 }), // For nested replies - will add reference later
  isEdited: boolean('is_edited').notNull().default(false),
  editedAt: timestamp('edited_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  // Comment query indexes
  postIdIdx: index('forum_comments_post_id_idx').on(table.postId),
  userIdIdx: index('forum_comments_user_id_idx').on(table.userId),
  parentIdIdx: index('forum_comments_parent_id_idx').on(table.parentId),
  createdAtIdx: index('forum_comments_created_at_idx').on(table.createdAt),
  // Composite indexes for comment threading
  postCreatedIdx: index('forum_comments_post_created_idx').on(table.postId, table.createdAt),
  parentCreatedIdx: index('forum_comments_parent_created_idx').on(table.parentId, table.createdAt),
}))

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  collections: many(collections),
  decks: many(decks),
  accounts: many(accounts),
  sessions: many(sessions),
  errorLogs: many(errorLogs),
  resolvedErrors: many(errorLogs, { relationName: 'resolvedErrors' }),
  hostedGames: many(gameRooms),
  gameParticipations: many(gameParticipants),
  sentFriendRequests: many(friendRequests, { relationName: 'sentRequests' }),
  receivedFriendRequests: many(friendRequests, { relationName: 'receivedRequests' }),
  friendships1: many(friendships, { relationName: 'user1Friendships' }),
  friendships2: many(friendships, { relationName: 'user2Friendships' }),
  forumPosts: many(forumPosts),
  forumComments: many(forumComments),
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

export const gameRoomsRelations = relations(gameRooms, ({ one, many }) => ({
  host: one(users, {
    fields: [gameRooms.hostId],
    references: [users.id],
  }),
  participants: many(gameParticipants),
}))

export const gameParticipantsRelations = relations(gameParticipants, ({ one }) => ({
  game: one(gameRooms, {
    fields: [gameParticipants.gameId],
    references: [gameRooms.id],
  }),
  user: one(users, {
    fields: [gameParticipants.userId],
    references: [users.id],
  }),
  deck: one(decks, {
    fields: [gameParticipants.deckId],
    references: [decks.id],
  }),
}))

export const friendRequestsRelations = relations(friendRequests, ({ one }) => ({
  sender: one(users, {
    fields: [friendRequests.senderId],
    references: [users.id],
    relationName: 'sentRequests',
  }),
  receiver: one(users, {
    fields: [friendRequests.receiverId],
    references: [users.id],
    relationName: 'receivedRequests',
  }),
}))

export const friendshipsRelations = relations(friendships, ({ one }) => ({
  user1: one(users, {
    fields: [friendships.user1Id],
    references: [users.id],
    relationName: 'user1Friendships',
  }),
  user2: one(users, {
    fields: [friendships.user2Id],
    references: [users.id],
    relationName: 'user2Friendships',
  }),
}))

export const forumPostsRelations = relations(forumPosts, ({ one, many }) => ({
  user: one(users, {
    fields: [forumPosts.userId],
    references: [users.id],
  }),
  lastReplyUser: one(users, {
    fields: [forumPosts.lastReplyBy],
    references: [users.id],
  }),
  comments: many(forumComments),
}))

export const forumCommentsRelations = relations(forumComments, ({ one, many }) => ({
  post: one(forumPosts, {
    fields: [forumComments.postId],
    references: [forumPosts.id],
  }),
  user: one(users, {
    fields: [forumComments.userId],
    references: [users.id],
  }),
  parent: one(forumComments, {
    fields: [forumComments.parentId],
    references: [forumComments.id],
    relationName: 'parentComment',
  }),
  replies: many(forumComments, {
    relationName: 'parentComment',
  }),
})) 