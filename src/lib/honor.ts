import { WalletTransaction } from '../types/app';

// Honor Level is derived transparently from data the account already owns:
// followers, profile visitors, current and lifetime balances. No hidden score
// is stored, so the level can never disagree with the visible numbers.

export interface HonorLevelDefinition {
  level: number;
  title: string;
  minPoints: number;
}

export const HONOR_LEVELS: HonorLevelDefinition[] = [
  { level: 1, title: 'Rookie', minPoints: 0 },
  { level: 2, title: 'Bronze', minPoints: 500 },
  { level: 3, title: 'Silver', minPoints: 1500 },
  { level: 4, title: 'Gold', minPoints: 3500 },
  { level: 5, title: 'Platinum', minPoints: 7500 },
  { level: 6, title: 'Diamond', minPoints: 15000 },
  { level: 7, title: 'Elite', minPoints: 30000 },
  { level: 8, title: 'Legend', minPoints: 60000 },
  { level: 9, title: 'Icon', minPoints: 120000 },
  { level: 10, title: 'Crown', minPoints: 250000 },
];

export const HONOR_WEIGHTS = {
  follower: 20,
  visitor: 5,
  diamond: 1,
  coinPerPoint: 100,
} as const;

export interface HonorInput {
  followers: number;
  visitors: number;
  diamonds: number;
  coins: number;
}

export function honorPoints(input: HonorInput): number {
  return (
    Math.max(0, Math.floor(input.followers)) * HONOR_WEIGHTS.follower +
    Math.max(0, Math.floor(input.visitors)) * HONOR_WEIGHTS.visitor +
    Math.max(0, Math.floor(input.diamonds)) +
    Math.floor(Math.max(0, Math.floor(input.coins)) / HONOR_WEIGHTS.coinPerPoint)
  );
}

export interface HonorProgress {
  points: number;
  level: number;
  title: string;
  nextLevel: number | null;
  nextTitle: string | null;
  pointsToNext: number;
  progressPercent: number;
}

export function computeHonor(input: HonorInput): HonorProgress {
  const points = honorPoints(input);
  let current = HONOR_LEVELS[0];
  for (const def of HONOR_LEVELS) {
    if (points >= def.minPoints) current = def;
  }
  const next = HONOR_LEVELS.find((def) => def.level === current.level + 1) ?? null;
  const span = next ? next.minPoints - current.minPoints : 0;
  const progressPercent = next
    ? Math.min(100, Math.round(((points - current.minPoints) / span) * 100))
    : 100;
  return {
    points,
    level: current.level,
    title: current.title,
    nextLevel: next?.level ?? null,
    nextTitle: next?.title ?? null,
    pointsToNext: next ? Math.max(0, next.minPoints - points) : 0,
    progressPercent,
  };
}

export interface HonorBadge {
  id: string;
  label: string;
  detail: string;
  unlocked: boolean;
}

export function honorBadges(input: HonorInput, isCreator: boolean): HonorBadge[] {
  return [
    {
      id: 'creator',
      label: 'Creator',
      detail: 'Agent, host or live room creator',
      unlocked: isCreator,
    },
    {
      id: 'follow_100',
      label: 'Rising Star',
      detail: '100 followers',
      unlocked: input.followers >= 100,
    },
    {
      id: 'follow_1000',
      label: 'Community Leader',
      detail: '1,000 followers',
      unlocked: input.followers >= 1000,
    },
    {
      id: 'follow_10000',
      label: 'Superstar',
      detail: '10,000 followers',
      unlocked: input.followers >= 10000,
    },
    {
      id: 'visitors_100',
      label: 'Popular Profile',
      detail: '100 profile visitors',
      unlocked: input.visitors >= 100,
    },
    {
      id: 'visitors_1000',
      label: 'Spotlight',
      detail: '1,000 profile visitors',
      unlocked: input.visitors >= 1000,
    },
    {
      id: 'diamonds_1000',
      label: 'Diamond Member',
      detail: '1,000 Diamonds in your wallet',
      unlocked: input.diamonds >= 1000,
    },
    {
      id: 'diamonds_10000',
      label: 'Diamond Elite',
      detail: '10,000 Diamonds in your wallet',
      unlocked: input.diamonds >= 10000,
    },
  ];
}

/** Ledger entries that moved diamonds or gift value — the real honor activity. */
export function honorActivity(transactions: WalletTransaction[]): WalletTransaction[] {
  return transactions.filter(
    (tx) =>
      tx.reason.startsWith('Received ') ||
      tx.reason.startsWith('Sent ') ||
      tx.reason.startsWith('Agency Commission')
  );
}
