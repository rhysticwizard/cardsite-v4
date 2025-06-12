#!/usr/bin/env tsx

import { cardCache } from '../lib/cache/card-cache';
import { warmSetsCache } from '../lib/cache/sets-cache';
import { POPULAR_CARDS } from '../lib/cache/redis';

// Mock fetch function for popular cards (replace with your actual API calls)
async function fetchCardByName(cardName: string): Promise<any | null> {
  try {
    // Replace this with your actual Scryfall API call
    const response = await fetch(`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(cardName)}`);
    
    if (!response.ok) {
      console.error(`❌ Failed to fetch ${cardName}: ${response.status}`);
      return null;
    }
    
    const cardData = await response.json();
    return cardData;
  } catch (error) {
    console.error(`❌ Error fetching ${cardName}:`, error);
    return null;
  }
}

/**
 * Warm cache with essential MTG data
 */
async function warmCache() {
  console.log('🚀 Starting cache warming process...');
  const startTime = performance.now();

  try {
    // Run cache warming operations in parallel
    await Promise.allSettled([
      // Warm sets cache
      warmSetsCache(),
      
      // Warm popular cards cache
      cardCache.warmPopularCards(fetchCardByName),
    ]);

    const endTime = performance.now();
    const duration = Math.round(endTime - startTime);
    
    console.log(`✅ Cache warming completed in ${duration}ms`);
    
    // Display cache statistics
    const stats = await cardCache.getStats();
    console.log('📊 Cache Statistics:', stats);
    
  } catch (error) {
    console.error('❌ Cache warming failed:', error);
    process.exit(1);
  }
}

/**
 * Format-specific cache warming for competitive formats
 */
async function warmFormatSpecificCards() {
  console.log('🎯 Warming format-specific cards...');
  
  const formatStaples = {
    standard: [
      'Sheoldred, the Apocalypse',
      'Bloodthirsty Adversary',
      'Fable of the Mirror-Breaker',
      'Wandering Emperor',
      'Teferi, Hero of Dominaria',
    ],
    modern: [
      'Lightning Bolt',
      'Path to Exile',
      'Counterspell',
      'Tarmogoyf',
      'Snapcaster Mage',
      'Monastery Swiftspear',
      'Death\'s Shadow',
    ],
    commander: [
      'Sol Ring',
      'Command Tower',
      'Arcane Signet',
      'Swords to Plowshares',
      'Counterspell',
      'Lightning Bolt',
      'Cultivate',
      'Kodama\'s Reach',
    ],
    legacy: [
      'Lightning Bolt',
      'Brainstorm',
      'Ponder',
      'Force of Will',
      'Wasteland',
      'Daze',
    ],
  };

  // Warm cards for each format
  for (const [format, cards] of Object.entries(formatStaples)) {
    console.log(`🔥 Warming ${format} staples...`);
    
    const warmingPromises = cards.map(async (cardName) => {
      try {
        const cardData = await fetchCardByName(cardName);
        if (cardData) {
          await cardCache.setCard(cardName, cardData);
          console.log(`  ✅ ${cardName}`);
        }
      } catch (error) {
        console.error(`  ❌ Failed to cache ${cardName}:`, error);
      }
    });

    await Promise.allSettled(warmingPromises);
  }
}

/**
 * Warm cache with trending/seasonal cards
 */
async function warmTrendingCards() {
  console.log('📈 Warming trending cards...');
  
  // This could be dynamically fetched from MTGGoldfish, EDHREC, etc.
  const trendingCards = [
    'Orcish Bowmasters',
    'Oko, Thief of Crowns',
    'Ragavan, Nimble Pilferer',
    'Wrenn and Six',
    'Teferi, Time Raveler',
  ];

  const warmingPromises = trendingCards.map(async (cardName) => {
    try {
      const cardData = await fetchCardByName(cardName);
      if (cardData) {
        await cardCache.setCard(cardName, cardData);
        console.log(`📈 Cached trending card: ${cardName}`);
      }
    } catch (error) {
      console.error(`❌ Failed to cache trending card ${cardName}:`, error);
    }
  });

  await Promise.allSettled(warmingPromises);
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  const mode = args[0] || 'basic';

  switch (mode) {
    case 'basic':
      await warmCache();
      break;
      
    case 'full':
      await warmCache();
      await warmFormatSpecificCards();
      await warmTrendingCards();
      break;
      
    case 'formats':
      await warmFormatSpecificCards();
      break;
      
    case 'trending':
      await warmTrendingCards();
      break;
      
    default:
      console.log('Usage: tsx scripts/cache-warming.ts [basic|full|formats|trending]');
      console.log('  basic    - Warm popular cards and sets (default)');
      console.log('  full     - Warm all categories');
      console.log('  formats  - Warm format-specific staples');
      console.log('  trending - Warm trending cards');
      process.exit(1);
  }

  console.log('🎉 Cache warming process completed!');
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { warmCache, warmFormatSpecificCards, warmTrendingCards }; 