// MTG Card interfaces based on Scryfall API
export interface MTGCard {
  id: string;
  oracle_id: string;
  name: string;
  mana_cost?: string;
  cmc: number;
  type_line: string;
  oracle_text?: string;
  power?: string;
  toughness?: string;
  colors: string[];
  color_identity: string[];
  keywords: string[];
  legalities: Record<string, string>;
  games: string[];
  reserved: boolean;
  foil: boolean;
  nonfoil: boolean;
  finishes: string[];
  oversized: boolean;
  promo: boolean;
  reprint: boolean;
  variation: boolean;
  set_id: string;
  set: string;
  set_name: string;
  set_type: string;
  set_uri: string;
  set_search_uri: string;
  scryfall_set_uri: string;
  rulings_uri: string;
  prints_search_uri: string;
  collector_number: string;
  digital: boolean;
  rarity: 'common' | 'uncommon' | 'rare' | 'mythic';
  flavor_text?: string;
  card_back_id: string;
  artist?: string;
  artist_ids: string[];
  illustration_id?: string;
  border_color: string;
  frame: string;
  security_stamp?: string;
  full_art: boolean;
  textless: boolean;
  booster: boolean;
  story_spotlight: boolean;
  edhrec_rank?: number;
  penny_rank?: number;
  image_uris?: {
    small: string;
    normal: string;
    large: string;
    png: string;
    art_crop: string;
    border_crop: string;
  };
  card_faces?: Array<{
    name: string;
    mana_cost?: string;
    type_line: string;
    oracle_text?: string;
    power?: string;
    toughness?: string;
    colors?: string[];
    image_uris?: {
      small: string;
      normal: string;
      large: string;
      png: string;
      art_crop: string;
      border_crop: string;
    };
  }>;
  prices: {
    usd?: string;
    usd_foil?: string;
    usd_etched?: string;
    eur?: string;
    eur_foil?: string;
    tix?: string;
  };
  related_uris: {
    gatherer?: string;
    tcgplayer_infinite_articles?: string;
    tcgplayer_infinite_decks?: string;
    edhrec?: string;
  };
  purchase_uris?: {
    tcgplayer?: string;
    cardmarket?: string;
    cardhoarder?: string;
  };
}

export interface ScryfallSearchResponse {
  object: 'list';
  total_cards: number;
  has_more: boolean;
  next_page?: string;
  data: MTGCard[];
}

export interface ScryfallSearchParams {
  q: string;
  unique?: 'cards' | 'art' | 'prints';
  order?: 'name' | 'set' | 'released' | 'rarity' | 'color' | 'usd' | 'tix' | 'eur' | 'cmc' | 'power' | 'toughness' | 'edhrec' | 'penny' | 'artist' | 'review';
  dir?: 'auto' | 'asc' | 'desc';
  include_extras?: boolean;
  include_multilingual?: boolean;
  include_variations?: boolean;
  page?: number;
}

export interface MTGSet {
  id: string;
  code: string;
  name: string;
  set_type: string;
  released_at?: string;
  block_code?: string;
  block?: string;
  parent_set_code?: string;
  card_count: number;
  printed_size?: number;
  digital: boolean;
  foil_only: boolean;
  nonfoil_only: boolean;
  scryfall_uri: string;
  uri: string;
  icon_svg_uri: string;
  search_uri: string;
}

// Color constants
export const MTG_COLORS = {
  W: 'white',
  U: 'blue', 
  B: 'black',
  R: 'red',
  G: 'green'
} as const;

export type MTGColor = keyof typeof MTG_COLORS;

// Rarity colors for UI
export const RARITY_COLORS = {
  common: '#1f2937',     // gray-800
  uncommon: '#374151',   // gray-700  
  rare: '#fbbf24',       // amber-400
  mythic: '#f97316'      // orange-500
} as const; 