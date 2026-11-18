export type FruitId =
  | 'strawberry'
  | 'apple'
  | 'banana'
  | 'orange'
  | 'grapes'
  | 'cherries'
  | 'watermelon'
  | 'plum';

export interface FruitCell {
  fruitId: FruitId;
  label: string;
  multiplier: number;
  accentHex: string;
  order: number;
}

export interface FruitManorConfig {
  configVersion: string;
  effectiveLabel: string;
  mode: 'LIVE_COINS';
  payoutBasis: 'GROSS_RETURN';
  fruits: FruitCell[];
  chips: number[];
  minStake: number;
  cancellationEnabled: boolean;
  multipleBetsEnabled: boolean;
  scheduledMs: number;
  openMs: number;
  lockedMs: number;
  spinMs: number;
  settlingMs: number;
  settledDisplayMs: number;
}

// Real Coin play approved by the product owner on 18 November 2026:
// stakes debit the app wallet atomically, wins credit it back.
export const FRUIT_MANOR_CONFIG: FruitManorConfig = {
  configVersion: 'fm-v1',
  effectiveLabel: '18 November 2026',
  mode: 'LIVE_COINS',
  payoutBasis: 'GROSS_RETURN',
  fruits: [
    { fruitId: 'strawberry', label: 'Strawberry', multiplier: 3, accentHex: '#FF4D6D', order: 0 },
    { fruitId: 'apple', label: 'Apple', multiplier: 5, accentHex: '#F43F5E', order: 1 },
    { fruitId: 'banana', label: 'Banana', multiplier: 6, accentHex: '#FACC15', order: 2 },
    { fruitId: 'orange', label: 'Orange', multiplier: 8, accentHex: '#FB923C', order: 3 },
    { fruitId: 'grapes', label: 'Grapes', multiplier: 10, accentHex: '#A855F7', order: 4 },
    { fruitId: 'cherries', label: 'Cherries', multiplier: 12, accentHex: '#E11D48', order: 5 },
    { fruitId: 'watermelon', label: 'Watermelon', multiplier: 18, accentHex: '#34D399', order: 6 },
    { fruitId: 'plum', label: 'Plum', multiplier: 38, accentHex: '#8B5CF6', order: 7 },
  ],
  chips: [10, 100, 1000, 5000, 50000],
  minStake: 10,
  maxStakePerBet: 50000,
  maxRoundStake: 100000,
  maxBetsPerRound: 12,
  cancellationEnabled: true,
  multipleBetsEnabled: true,
  scheduledMs: 3000,
  openMs: 20000,
  lockedMs: 1500,
  spinMs: 4200,
  settlingMs: 1200,
  settledDisplayMs: 5200,
};

export const FRUIT_BY_ID = new Map(FRUIT_MANOR_CONFIG.fruits.map((f) => [f.fruitId, f]));

// Outcome mapping: weight(fruit) = 1 / multiplier, normalized. Theoretical
// return per unit staked = 1 / sum(1 / multiplier) across all eight cells.
const INV_SUM = FRUIT_MANOR_CONFIG.fruits.reduce((s, f) => s + 1 / f.multiplier, 0);

export function fruitProbability(fruitId: FruitId): number {
  const f = FRUIT_BY_ID.get(fruitId);
  if (!f) return 0;
  return 1 / f.multiplier / INV_SUM;
}

export function theoreticalReturn(): number {
  return 1 / INV_SUM;
}

export function formatCoins(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}

export function chipLabel(n: number): string {
  if (n >= 1000) return `${n / 1000}K`;
  return String(n);
}