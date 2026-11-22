export const CHECK_IN_REWARDS = [50, 80, 120, 180, 250, 350, 500];

export type RewardTaskId = 'watch' | 'gift' | 'follow' | 'game';

export interface RewardTaskDef {
  id: RewardTaskId;
  title: string;
  description: string;
  goal: number;
  reward: number;
  field: 'watchSeconds' | 'giftsSent' | 'followsMade' | 'gamesPlayed';
}

export const REWARD_TASKS: RewardTaskDef[] = [
  {
    id: 'watch',
    title: 'Watch Live',
    description: 'Watch live streams for 10 minutes',
    goal: 600,
    reward: 100,
    field: 'watchSeconds',
  },
  {
    id: 'gift',
    title: 'Send Gifts',
    description: 'Send 3 gifts to hosts',
    goal: 3,
    reward: 150,
    field: 'giftsSent',
  },
  {
    id: 'follow',
    title: 'Follow Creators',
    description: 'Follow 2 new creators',
    goal: 2,
    reward: 80,
    field: 'followsMade',
  },
  {
    id: 'game',
    title: 'Play Games',
    description: 'Play 3 game rounds',
    goal: 3,
    reward: 100,
    field: 'gamesPlayed',
  },
];

export function rewardDayKey(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}