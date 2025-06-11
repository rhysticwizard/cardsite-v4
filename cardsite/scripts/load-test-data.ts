#!/usr/bin/env tsx

// ===================================
// CardSite v4 - Load Test Data
// Generate realistic test data for performance testing
// ===================================

import { db } from '../lib/db';
import { users, cards, collections, decks, deckCards, errorLogs } from '../lib/db/schema';
import { like } from 'drizzle-orm';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

interface TestDataStats {
  users: number;
  cards: number;
  collections: number;
  decks: number;
  deckCards: number;
  errorLogs: number;
}

class TestDataLoader {
  private stats: TestDataStats = {
    users: 0,
    cards: 0,
    collections: 0,
    decks: 0,
    deckCards: 0,
    errorLogs: 0,
  };

  private generateRandomString(length: number): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private generateRandomEmail(): string {
    const domains = ['example.com', 'test.org', 'demo.net', 'sample.co'];
    const name = this.generateRandomString(8).toLowerCase();
    const domain = domains[Math.floor(Math.random() * domains.length)];
    return `${name}@${domain}`;
  }

  private async loadUsers(count: number): Promise<string[]> {
    console.log(`📝 Creating ${count} test users...`);
    
    const userIds: string[] = [];
    const batch = [];

    for (let i = 0; i < count; i++) {
      const userId = `test-user-${i}-${this.generateRandomString(8)}`;
      userIds.push(userId);
      
      batch.push({
        id: userId,
        name: `Test User ${i + 1}`,
        username: `testuser${i + 1}`,
        email: this.generateRandomEmail(),
      });

      // Insert in batches of 100
      if (batch.length === 100 || i === count - 1) {
        await db.insert(users).values(batch);
        batch.length = 0;
      }
    }

    this.stats.users = count;
    console.log(`✅ Created ${count} users`);
    return userIds;
  }

  private async loadCards(count: number): Promise<string[]> {
    console.log(`🎴 Creating ${count} test cards...`);
    
    const cardIds: string[] = [];
    const cardTypes = ['Creature', 'Instant', 'Sorcery', 'Enchantment', 'Artifact', 'Land', 'Planeswalker'];
    const rarities = ['common', 'uncommon', 'rare', 'mythic'];
    const sets = ['STX', 'AFR', 'MID', 'VOW', 'NEO', 'SNC', 'DMU', 'BRO'];
    const batch = [];

    for (let i = 0; i < count; i++) {
      const cardId = `test-card-${i}-${this.generateRandomString(8)}`;
      cardIds.push(cardId);
      
      batch.push({
        id: cardId,
        scryfallId: `scryfall-${i}-${this.generateRandomString(12)}`,
        name: `Test Card ${i + 1}`,
        typeLine: cardTypes[Math.floor(Math.random() * cardTypes.length)],
        cmc: Math.floor(Math.random() * 8).toString(),
        rarity: rarities[Math.floor(Math.random() * rarities.length)],
        setCode: sets[Math.floor(Math.random() * sets.length)],
        setName: `Test Set ${Math.floor(i / 100) + 1}`,
        collectorNumber: (i + 1).toString(),
        oracleText: `Test oracle text for card ${i + 1}`,
        colors: ['R', 'B'][Math.floor(Math.random() * 2)] as any,
        legalities: { standard: 'legal', modern: 'legal' } as any,
      });

      // Insert in batches of 100
      if (batch.length === 100 || i === count - 1) {
        await db.insert(cards).values(batch);
        batch.length = 0;
      }
    }

    this.stats.cards = count;
    console.log(`✅ Created ${count} cards`);
    return cardIds;
  }

  private async loadCollections(userIds: string[], cardIds: string[], entriesPerUser: number): Promise<void> {
    console.log(`📚 Creating collections (${entriesPerUser} entries per user)...`);
    
    const batch = [];
    let totalEntries = 0;

    for (const userId of userIds) {
      // Each user gets random cards in their collection
      const userCardCount = Math.floor(Math.random() * entriesPerUser) + 1;
      const shuffledCards = [...cardIds].sort(() => 0.5 - Math.random());
      
      for (let i = 0; i < userCardCount && i < shuffledCards.length; i++) {
        batch.push({
          userId,
          cardId: shuffledCards[i],
          quantity: Math.floor(Math.random() * 4) + 1,
          condition: ['near_mint', 'lightly_played', 'moderately_played'][Math.floor(Math.random() * 3)],
          foil: Math.random() > 0.8, // 20% chance of foil
        });

        totalEntries++;

        // Insert in batches of 200
        if (batch.length === 200) {
          await db.insert(collections).values(batch);
          batch.length = 0;
        }
      }
    }

    // Insert remaining batch
    if (batch.length > 0) {
      await db.insert(collections).values(batch);
    }

    this.stats.collections = totalEntries;
    console.log(`✅ Created ${totalEntries} collection entries`);
  }

  private async loadDecks(userIds: string[], cardIds: string[], decksPerUser: number): Promise<void> {
    console.log(`🃏 Creating decks (${decksPerUser} decks per user)...`);
    
    const formats = ['Standard', 'Modern', 'Commander', 'Pioneer', 'Legacy'];
    const deckBatch = [];
    const cardBatch = [];
    let totalDecks = 0;
    let totalDeckCards = 0;

    for (const userId of userIds) {
      const userDeckCount = Math.floor(Math.random() * decksPerUser) + 1;
      
      for (let i = 0; i < userDeckCount; i++) {
        const deckId = totalDecks + 1;
        
        deckBatch.push({
          id: deckId,
          userId,
          name: `Test Deck ${deckId}`,
          description: `Test deck description for deck ${deckId}`,
          format: formats[Math.floor(Math.random() * formats.length)],
          isPublic: Math.random() > 0.5, // 50% public
        });

        // Add cards to deck (40-100 cards per deck)
        const deckSize = Math.floor(Math.random() * 60) + 40;
        const shuffledCards = [...cardIds].sort(() => 0.5 - Math.random());
        
        for (let j = 0; j < Math.min(deckSize, shuffledCards.length); j++) {
          cardBatch.push({
            deckId,
            cardId: shuffledCards[j],
            quantity: Math.floor(Math.random() * 4) + 1,
            category: j < deckSize - 15 ? 'mainboard' : 'sideboard',
          });
          totalDeckCards++;
        }

        totalDecks++;

        // Insert deck batches
        if (deckBatch.length === 50) {
          await db.insert(decks).values(deckBatch);
          deckBatch.length = 0;
        }

        // Insert deck card batches
        if (cardBatch.length >= 1000) {
          await db.insert(deckCards).values(cardBatch);
          cardBatch.length = 0;
        }
      }
    }

    // Insert remaining batches
    if (deckBatch.length > 0) {
      await db.insert(decks).values(deckBatch);
    }
    if (cardBatch.length > 0) {
      await db.insert(deckCards).values(cardBatch);
    }

    this.stats.decks = totalDecks;
    this.stats.deckCards = totalDeckCards;
    console.log(`✅ Created ${totalDecks} decks with ${totalDeckCards} deck cards`);
  }

  private async loadErrorLogs(count: number): Promise<void> {
    console.log(`🚨 Creating ${count} test error logs...`);
    
    const errorTypes = ['server_error', 'client_error', 'auth_error', 'database_error', 'api_error'];
    const severities = ['low', 'medium', 'high', 'critical'];
    const batch = [];

    for (let i = 0; i < count; i++) {
      batch.push({
        errorType: errorTypes[Math.floor(Math.random() * errorTypes.length)],
        severity: severities[Math.floor(Math.random() * severities.length)],
        message: `Test error message ${i + 1}`,
        stack: `Test stack trace ${i + 1}`,
        url: `/test/path/${i + 1}`,
        userAgent: 'Test User Agent',
        ip: `192.168.1.${Math.floor(Math.random() * 255)}`,
        metadata: { test: true, errorId: i + 1 },
        resolved: Math.random() > 0.7, // 30% resolved
      });

      // Insert in batches of 100
      if (batch.length === 100 || i === count - 1) {
        await db.insert(errorLogs).values(batch);
        batch.length = 0;
      }
    }

    this.stats.errorLogs = count;
    console.log(`✅ Created ${count} error logs`);
  }

  public async loadTestData(): Promise<TestDataStats> {
    console.log('🚀 Loading test data for performance benchmarks...\n');

    const startTime = Date.now();

    try {
      // Load base data
      const userIds = await this.loadUsers(100);
      const cardIds = await this.loadCards(1000);

      // Load relationship data
      await this.loadCollections(userIds, cardIds, 50);
      await this.loadDecks(userIds, cardIds, 5);
      await this.loadErrorLogs(500);

      const duration = Date.now() - startTime;
      
      console.log('\n🏁 Test Data Loading Complete!');
      console.log('================================');
      console.log(`Users: ${this.stats.users}`);
      console.log(`Cards: ${this.stats.cards}`);
      console.log(`Collections: ${this.stats.collections}`);
      console.log(`Decks: ${this.stats.decks}`);
      console.log(`Deck Cards: ${this.stats.deckCards}`);
      console.log(`Error Logs: ${this.stats.errorLogs}`);
      console.log(`Total Duration: ${duration}ms`);
      console.log('✅ Ready for performance testing!');

      return this.stats;

    } catch (error) {
      console.error('❌ Failed to load test data:', error);
      throw error;
    }
  }

  public async cleanupTestData(): Promise<void> {
    console.log('🧹 Cleaning up test data...');

    try {
      // Clean up in reverse dependency order
      await db.delete(deckCards);
      await db.delete(decks).where(like(decks.name, 'Test Deck %'));
      await db.delete(collections).where(like(collections.userId, 'test-user-%'));
      await db.delete(cards).where(like(cards.id, 'test-card-%'));
      await db.delete(users).where(like(users.id, 'test-user-%'));
      await db.delete(errorLogs).where(like(errorLogs.message, 'Test error message %'));

      console.log('✅ Test data cleaned up successfully');
    } catch (error) {
      console.warn('⚠️  Error during cleanup:', error);
    }
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const loader = new TestDataLoader();
  
  loader.loadTestData()
    .then(() => {
      console.log('\n🎉 Test data loading completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Test data loading failed:', error);
      process.exit(1);
    });
}

export { TestDataLoader }; 