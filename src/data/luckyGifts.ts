import { GiftCatalogItem } from '../types/app';
import { randomUnit } from '../games/arcade/wallet';

/**
 * Poppo-style Lucky gifts: the sender buys a box at a fixed price and each
 * open reveals a random gift whose value is a multiplier of that price.
 * Most opens return a fraction, rare opens pay ×50 to ×520. The recipient
 * keeps 70% of the revealed value as Diamonds, like any other gift.
 */
export interface LuckyGiftBox extends GiftCatalogItem {
  tagline: string;
}

export const LUCKY_GIFTS: LuckyGiftBox[] = [
  {
    giftId: 'lucky_bag',
    name: 'Lucky Bag',
    currency: 'COIN',
    price: 200,
    accentHex: '#F0A92E',
    imageUrl: '/gifts/balloon_gift_box.png',
    effect: 'confetti',
    tagline: 'Up to ×520',
  },
  {
    giftId: 'lucky_egg',
    name: 'Lucky Egg',
    currency: 'COIN',
    price: 1000,
    accentHex: '#FBE14A',
    imageUrl: '/gifts/mystery_firework.png',
    effect: 'fireworks',
    tagline: 'Up to ×520',
  },
  {
    giftId: 'lucky_star',
    name: 'Lucky Star',
    currency: 'COIN',
    price: 5000,
    accentHex: '#7DD3FC',
    imageUrl: '/gifts/diamond_tree.png',
    effect: 'diamonds',
    tagline: 'Up to ×520',
  },
];

export const LUCKY_BY_ID = new Map(LUCKY_GIFTS.map((box) => [box.giftId, box]));

export const LUCKY_MAX_MULTIPLIER = 520;
export const LUCKY_MAX_VALUE = 1_000_000;

// Weighted ladder, ~95% expected value (5% house edge before the 70% Diamond
// yield). Values are percents and must add up to 100.
const LUCKY_LADDER: Array<{ mult: number; weight: number }> = [
  { mult: 0.1, weight: 35 },
  { mult: 0.3, weight: 30 },
  { mult: 0.6, weight: 18 },
  { mult: 1, weight: 10 },
  { mult: 2, weight: 3.5 },
  { mult: 5, weight: 2 },
  { mult: 10, weight: 0.8 },
  { mult: 20, weight: 0.4 },
  { mult: 50, weight: 0.2 },
  { mult: 100, weight: 0.08 },
  { mult: 520, weight: 0.02 },
];

export type LuckyTier = 'small' | 'nice' | 'big' | 'mega' | 'jackpot';

export interface LuckyRoll {
  multiplier: number;
  value: number;
  diamonds: number;
  tier: LuckyTier;
}

export function luckyTier(multiplier: number): LuckyTier {
  if (multiplier >= LUCKY_MAX_MULTIPLIER) return 'jackpot';
  if (multiplier >= 50) return 'mega';
  if (multiplier >= 10) return 'big';
  if (multiplier >= 2) return 'nice';
  return 'small';
}

export function rollLucky(box: LuckyGiftBox): LuckyRoll {
  const roll = randomUnit() * 100;
  let acc = 0;
  let multiplier = LUCKY_LADDER[0].mult;
  for (const step of LUCKY_LADDER) {
    acc += step.weight;
    if (roll < acc) {
      multiplier = step.mult;
      break;
    }
  }
  // Gift receipts stay whole coins in multiples of 10 so the 70% Diamond
  // split is always an exact integer.
  const value = Math.min(
    LUCKY_MAX_VALUE,
    Math.max(10, Math.round((box.price * multiplier) / 10) * 10)
  );
  return {
    multiplier,
    value,
    diamonds: Math.floor(value * 0.7),
    tier: luckyTier(multiplier),
  };
}
