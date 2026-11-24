import { supabase, isSupabaseConfigured, SupabaseGameRound, SupabaseGameBet, SupabaseArcadeHistory } from './supabaseClient';

/**
 * Service to interact with Supabase Game Backend
 */

// --- Arcade Game Sync ---
export async function recordSupabaseArcadeRound(record: SupabaseArcadeHistory): Promise<void> {
  if (!supabase || !isSupabaseConfigured) return;
  try {
    const { error } = await supabase.from('arcade_history').insert({
      user_id: record.user_id,
      game_name: record.game_name,
      stake: record.stake,
      multiplier: record.multiplier,
      outcome: record.outcome,
      payout: record.payout,
      details: record.details || {},
    });
    if (error) console.warn('[Supabase] Failed to record arcade round:', error.message);
  } catch (err) {
    console.warn('[Supabase] Error recording arcade round:', err);
  }
}

// --- Live Game Rounds (Fruit Manor & Golden Flower) ---

export async function fetchLatestSupabaseRound(gameType: 'fruit_manor' | 'golden_flower'): Promise<SupabaseGameRound | null> {
  if (!supabase || !isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase
      .from('game_rounds')
      .select('*')
      .eq('game_type', gameType)
      .order('seq', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn('[Supabase] Error fetching latest round:', error.message);
      return null;
    }
    return data as SupabaseGameRound;
  } catch (err) {
    console.warn('[Supabase] Unexpected error fetching round:', err);
    return null;
  }
}

export async function upsertSupabaseRound(round: Partial<SupabaseGameRound> & { id: string; game_type: string }): Promise<void> {
  if (!supabase || !isSupabaseConfigured) return;
  try {
    const { error } = await supabase.from('game_rounds').upsert(round);
    if (error) console.warn('[Supabase] Failed to upsert round:', error.message);
  } catch (err) {
    console.warn('[Supabase] Error upserting round:', err);
  }
}

export async function placeSupabaseBet(bet: SupabaseGameBet): Promise<void> {
  if (!supabase || !isSupabaseConfigured) return;
  try {
    const { error } = await supabase.from('game_bets').insert(bet);
    if (error) console.warn('[Supabase] Failed to insert bet:', error.message);
  } catch (err) {
    console.warn('[Supabase] Error inserting bet:', err);
  }
}

export async function updateSupabaseBetPayout(betId: string, status: 'WON' | 'LOST' | 'REFUNDED', payout: number): Promise<void> {
  if (!supabase || !isSupabaseConfigured) return;
  try {
    const { error } = await supabase
      .from('game_bets')
      .update({ status, payout })
      .eq('id', betId);
    if (error) console.warn('[Supabase] Failed to update bet:', error.message);
  } catch (err) {
    console.warn('[Supabase] Error updating bet:', err);
  }
}

/**
 * Subscribe to realtime round changes
 */
export function subscribeSupabaseRound(
  gameType: 'fruit_manor' | 'golden_flower',
  onRoundChange: (round: SupabaseGameRound) => void
): () => void {
  if (!supabase || !isSupabaseConfigured) return () => {};

  const channel = supabase
    .channel(`public:game_rounds:${gameType}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'game_rounds',
        filter: `game_type=eq.${gameType}`,
      },
      (payload) => {
        if (payload.new) {
          onRoundChange(payload.new as SupabaseGameRound);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Subscribe to realtime bets in a round
 */
export function subscribeSupabaseBets(
  roundId: string,
  onBetAdded: (bet: SupabaseGameBet) => void
): () => void {
  if (!supabase || !isSupabaseConfigured) return () => {};

  const channel = supabase
    .channel(`public:game_bets:${roundId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'game_bets',
        filter: `round_id=eq.${roundId}`,
      },
      (payload) => {
        if (payload.new) {
          onBetAdded(payload.new as SupabaseGameBet);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
