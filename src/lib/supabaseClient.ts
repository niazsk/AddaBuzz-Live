import { createClient } from '@supabase/supabase-js';

// Supabase environment variables from Vite
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// Create Supabase client instance (or null fallback when unconfigured)
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  : null;

/**
 * Types for game backend tables
 */
export interface SupabaseGameRound {
  id: string;
  game_type: 'fruit_manor' | 'golden_flower' | 'arcade';
  seq: number;
  phase: 'BETTING' | 'REVEALING' | 'SETTLED';
  result_data?: Record<string, any>;
  started_at: string;
  ends_at?: string;
  leader_id?: string;
  leader_leased_until?: string;
  created_at: string;
}

export interface SupabaseGameBet {
  id: string;
  round_id: string;
  game_type: string;
  user_id: string;
  username: string;
  bet_data: Record<string, any>;
  stake: number;
  status: 'ACCEPTED' | 'WON' | 'LOST' | 'REFUNDED';
  payout: number;
  created_at: string;
}

export interface SupabaseArcadeHistory {
  id?: string;
  user_id: string;
  game_name: string;
  stake: number;
  multiplier: number;
  outcome: 'WIN' | 'LOSS';
  payout: number;
  details?: Record<string, any>;
  created_at?: string;
}
