import { rewardDayKey } from './config';

export { rewardDayKey };

// Poppo-style female host rewards, paid in Diamonds.
export const HOST_NEWBIE_SECONDS = 60;
export const HOST_NEWBIE_REWARD = 2000;
export const HOST_VALID_DAY_SECONDS = 3600;
export const HOST_VALID_DAYS_GOAL = 5;
export const HOST_VALID_DAYS_REWARD = 5000;

export type HostTaskId = 'live30' | 'live60' | 'gift' | 'follow';

export interface HostTaskDef {
  id: HostTaskId;
  title: string;
  description: string;
  goal: number;
  reward: number;
  field: 'liveSeconds' | 'giftsReceived' | 'newFollowers';
}

export const HOST_TASKS: HostTaskDef[] = [
  {
    id: 'live30',
    title: 'Go Live 30 min',
    description: 'Stream live for 30 minutes today',
    goal: 1800,
    reward: 500,
    field: 'liveSeconds',
  },
  {
    id: 'live60',
    title: 'Go Live 60 min',
    description: 'Stream live for 60 minutes today',
    goal: 3600,
    reward: 1000,
    field: 'liveSeconds',
  },
  {
    id: 'gift',
    title: 'Receive 5 Gifts',
    description: 'Receive 5 gifts from viewers today',
    goal: 5,
    reward: 500,
    field: 'giftsReceived',
  },
  {
    id: 'follow',
    title: 'Gain 3 Followers',
    description: 'Get 3 new followers today',
    goal: 3,
    reward: 300,
    field: 'newFollowers',
  },
];