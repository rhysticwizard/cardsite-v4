import { Card } from '../../../utils/ScryfallAPI';

// Lightning Bolt test card with full Scryfall API structure
const lightningBolt: Card = {
  id: "test-lightning-bolt-001",
  name: "Lightning Bolt",
  oracle_id: "b4eadbb7-de8d-4691-8db8-c1b3fb15ac60",
  released_at: "1993-08-05",
  type_line: "Instant",
  rarity: "common",
  set: "lea",
  set_name: "Limited Edition Alpha",
  mana_cost: "{R}",
  oracle_text: "Lightning Bolt deals 3 damage to any target.",
  image_uris: {
    small: "https://cards.scryfall.io/small/front/a/e/ae5f9fb1-5a55-4db3-98a1-2628e3598c18.jpg",
    normal: "https://cards.scryfall.io/normal/front/a/e/ae5f9fb1-5a55-4db3-98a1-2628e3598c18.jpg",
    large: "https://cards.scryfall.io/large/front/a/e/ae5f9fb1-5a55-4db3-98a1-2628e3598c18.jpg",
    png: "https://cards.scryfall.io/png/front/a/e/ae5f9fb1-5a55-4db3-98a1-2628e3598c18.png",
    art_crop: "https://cards.scryfall.io/art_crop/front/a/e/ae5f9fb1-5a55-4db3-98a1-2628e3598c18.jpg",
    border_crop: "https://cards.scryfall.io/border_crop/front/a/e/ae5f9fb1-5a55-4db3-98a1-2628e3598c18.jpg"
  },
  legalities: {
    standard: "not_legal",
    future: "not_legal",
    historic: "legal",
    gladiator: "legal",
    pioneer: "not_legal",
    explorer: "not_legal",
    modern: "legal",
    legacy: "legal",
    pauper: "not_legal",
    vintage: "legal",
    penny: "not_legal",
    commander: "legal",
    oathbreaker: "legal",
    brawl: "not_legal",
    historicbrawl: "legal",
    alchemy: "not_legal",
    paupercommander: "not_legal",
    duel: "legal",
    oldschool: "legal",
    premodern: "legal",
    predh: "legal"
  },
  scryfall_uri: "https://scryfall.com/card/lea/161/lightning-bolt",
  cmc: 1,
  color_identity: ["R"],
  colors: ["R"]
};

// Export as array for easy expansion
export const testCards: Card[] = [lightningBolt];

export default testCards[0]; // Export default as Lightning Bolt 