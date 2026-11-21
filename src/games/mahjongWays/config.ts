// Exact Configuration and Paytable from Official Mahjong Phoenix screenshots
// Base bet in screenshot is BDT 0.20 (so 5 Green Dragon = 0.50 means 2.5x total bet!)
// Multipliers on Total Bet (Stake):
// Green Dragon (發): 5 = 2.5x, 4 = 1.25x, 3 = 0.5x
// Red Dragon (中): 5 = 2.0x, 4 = 1.0x, 3 = 0.4x
// White Board (白板): 5 = 1.5x, 4 = 0.75x, 3 = 0.3x
// 8 Wan (八萬): 5 = 0.75x, 4 = 0.5x, 3 = 0.25x
// 5 Dots (五筒): 5 = 0.6x, 4 = 0.25x, 3 = 0.15x
// 5 Bamboo (五條): 5 = 0.6x, 4 = 0.25x, 3 = 0.15x
// 3 Dots (三筒): 5 = 0.5x, 4 = 0.2x, 3 = 0.1x
// 2 Dots (二筒): 5 = 0.3x, 4 = 0.15x, 3 = 0.05x
// 2 Bamboo (二條): 5 = 0.3x, 4 = 0.15x, 3 = 0.05x

export interface TileSymbolDef {
  id: string;
  name: string;
  chineseChar?: string;
  subText?: string;
  category: 'dragon' | 'wind' | 'bamboo' | 'dot' | 'character' | 'special';
  baseColor: string;
  payoutMultipliers: Record<number, number>; // exact multiplier on total stake
  weight: number;
  isWild?: boolean;
  isScatter?: boolean;
}

export const TILE_SYMBOLS: Record<string, TileSymbolDef> = {
  // 1. Green Dragon (發) - 5: 2.5x, 4: 1.25x, 3: 0.5x
  green_dragon: {
    id: 'green_dragon',
    name: 'Green Dragon (發)',
    chineseChar: '發',
    category: 'dragon',
    baseColor: '#15803d',
    payoutMultipliers: { 3: 0.5, 4: 1.25, 5: 2.5 },
    weight: 18,
  },
  // 2. Red Dragon (中) - 5: 2.0x, 4: 1.0x, 3: 0.4x
  red_dragon: {
    id: 'red_dragon',
    name: 'Red Dragon (中)',
    chineseChar: '中',
    category: 'dragon',
    baseColor: '#dc2626',
    payoutMultipliers: { 3: 0.4, 4: 1.0, 5: 2.0 },
    weight: 22,
  },
  // 3. White Dragon / Bai Ban (白板) - 5: 1.5x, 4: 0.75x, 3: 0.3x
  white_board: {
    id: 'white_board',
    name: 'White Dragon (白板)',
    chineseChar: '🀫',
    category: 'wind',
    baseColor: '#2563eb',
    payoutMultipliers: { 3: 0.3, 4: 0.75, 5: 1.5 },
    weight: 26,
  },
  // 4. 8 Wan (八萬) - 5: 0.75x, 4: 0.5x, 3: 0.25x
  char_8: {
    id: 'char_8',
    name: '8 Wan (八萬)',
    chineseChar: '八',
    subText: '萬',
    category: 'character',
    baseColor: '#dc2626',
    payoutMultipliers: { 3: 0.25, 4: 0.5, 5: 0.75 },
    weight: 30,
  },
  // 5. 5 Dots (五筒) - 5: 0.6x, 4: 0.25x, 3: 0.15x
  dot_5: {
    id: 'dot_5',
    name: '5 Dots (五筒)',
    chineseChar: '⁙',
    category: 'dot',
    baseColor: '#0284c7',
    payoutMultipliers: { 3: 0.15, 4: 0.25, 5: 0.6 },
    weight: 34,
  },
  // 6. 5 Bamboo (五條) - 5: 0.6x, 4: 0.25x, 3: 0.15x
  bamboo_5: {
    id: 'bamboo_5',
    name: '5 Bamboo (五條)',
    chineseChar: '🀘',
    category: 'bamboo',
    baseColor: '#16a34a',
    payoutMultipliers: { 3: 0.15, 4: 0.25, 5: 0.6 },
    weight: 34,
  },
  // 7. 3 Dots (三筒) - 5: 0.5x, 4: 0.2x, 3: 0.1x
  dot_3: {
    id: 'dot_3',
    name: '3 Dots (三筒)',
    chineseChar: '∴',
    category: 'dot',
    baseColor: '#3b82f6',
    payoutMultipliers: { 3: 0.1, 4: 0.2, 5: 0.5 },
    weight: 38,
  },
  // 8. 2 Dots (二筒) - 5: 0.3x, 4: 0.15x, 3: 0.05x
  dot_2: {
    id: 'dot_2',
    name: '2 Dots (二筒)',
    chineseChar: '‥',
    category: 'dot',
    baseColor: '#3b82f6',
    payoutMultipliers: { 3: 0.05, 4: 0.15, 5: 0.3 },
    weight: 42,
  },
  // 9. 2 Bamboo (二條) - 5: 0.3x, 4: 0.15x, 3: 0.05x
  bamboo_2: {
    id: 'bamboo_2',
    name: '2 Bamboo (二條)',
    chineseChar: '🀕',
    category: 'bamboo',
    baseColor: '#15803d',
    payoutMultipliers: { 3: 0.05, 4: 0.15, 5: 0.3 },
    weight: 42,
  },
  // 10. Golden Sycee / Ingot Wild (WILD) - Only appears on reels 2, 3, 4
  wild: {
    id: 'wild',
    name: 'Golden Sycee Wild',
    chineseChar: '金',
    subText: 'WILD',
    category: 'special',
    baseColor: '#f59e0b',
    payoutMultipliers: {},
    weight: 12,
    isWild: true,
  },
  // 11. Flaming Hu Scatter (胡) - Landing 3 awards 10 Free Spins
  scatter: {
    id: 'scatter',
    name: 'Flaming Hu Scatter (胡)',
    chineseChar: '胡',
    subText: 'SCATTER',
    category: 'special',
    baseColor: '#ef4444',
    payoutMultipliers: {},
    weight: 6,
    isScatter: true,
  },
};

export const MAHJONG_CONFIG = {
  gameId: 'mahjong_phoenix',
  name: 'Mahjong Phoenix',
  tagline: 'Authentic Nextspin 2,000 Ways Rules',
  cols: 5,
  // Exact 4-5-5-5-4 reel height configuration:
  // Reel 1: 4 rows, Reel 2: 5 rows, Reel 3: 5 rows, Reel 4: 5 rows, Reel 5: 4 rows
  // Total Ways: 4 * 5 * 5 * 5 * 4 = 2,000 Ways!
  rowCounts: [4, 5, 5, 5, 4],
  waysToWinText: '2,000 WAYS',
  // Base Game Cascade Multipliers: x1 -> x2 -> x3 -> x5
  baseMultipliers: [1, 2, 3, 5],
  // Free Spins Cascade Multipliers: x2 -> x4 -> x6 -> x10
  freeSpinMultipliers: [2, 4, 6, 10],
  // 3 Scatters trigger 10 Free Spins (+2 per additional scatter)
  scattersForBonus: 3,
  freeSpinsAwarded: 10,
  extraFreeSpinsPerScatter: 2,
  // Base game chance of gold-plated tile appearing on reels 2, 3, 4
  baseGoldTileChance: 0.25,
  betPresets: [10, 20, 50, 100, 200, 500, 1000, 2000, 5000],
  defaultBet: 50,
  minBet: 10,
  maxBet: 10000,
};

export function formatCoins(amount: number): string {
  if (!amount && amount !== 0) return '0';
  return Math.floor(amount).toLocaleString('en-US');
}
