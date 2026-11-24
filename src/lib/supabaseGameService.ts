import { supabase, isSupabaseConfigured, SupabaseGameRound, SupabaseGameBet, SupabaseArcadeHistory } from './supabaseClient';
import { SharedBoard, SharedBet } from './firestoreService';

/**
 * Full Supabase Game Service replacing Firestore for Fruit Manor & Golden Flower
 */

// Convert Supabase row to SharedBoard interface
export function mapSupabaseRoundToBoard(r: SupabaseGameRound): SharedBoard {
  const resultData = r.result_data || {};
  return {
    roundId: r.id,
    seq: r.seq,
    phase: r.phase as any,
    phaseEndsAt: r.ends_at ? new Date(r.ends_at).getTime() : Date.now() + 15000,
    resultFruitId: resultData.fruitId || null,
    recentResults: resultData.recentResults || [],
    leaderUid: r.leader_id || 'system',
    leaderLeaseUntil: r.leader_leased_until ? new Date(r.leader_leased_until).getTime() : Date.now() + 60000,
    configVersion: 'fm-v1',
    serverTimeOffsetMs: 0,
    updatedAt: new Date(r.created_at).getTime(),
  };
}

// Convert Supabase bet row to SharedBet interface
export function mapSupabaseBetToSharedBet(b: SupabaseGameBet): SharedBet {
  return {
    betId: b.id,
    roundId: b.round_id,
    uid: b.user_id,
    username: b.username,
    fruitId: b.bet_data?.fruitId || '',
    stake: b.stake,
    multiplier: b.bet_data?.multiplier || 1,
    status: b.status,
    payout: b.payout,
    debitRef: b.id,
    acceptedAt: new Date(b.created_at).getTime(),
  };
}

// --- Live Board Subscriptions ---

export function subscribeSupabaseLiveBoard(
  gameType: 'fruit_manor' | 'golden_flower',
  onBoard: (board: SharedBoard) => void,
  onError?: (err: string) => void
): () => void {
  if (!supabase || !isSupabaseConfigured) {
    onError?.('Supabase not configured');
    return () => {};
  }

  // 1. Fetch initial board
  supabase
    .from('game_rounds')
    .select('*')
    .eq('game_type', gameType)
    .order('seq', { ascending: false })
    .limit(1)
    .maybeSingle()
    .then(({ data, error }) => {
      if (error) {
        console.warn(`[Supabase ${gameType}] Fetch error:`, error.message);
      } else if (data) {
        onBoard(mapSupabaseRoundToBoard(data as SupabaseGameRound));
      }
    });

  // 2. Realtime subscription
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
          onBoard(mapSupabaseRoundToBoard(payload.new as SupabaseGameRound));
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// --- Live Bets Subscriptions ---

export function subscribeSupabaseLiveBets(
  roundId: string,
  onBets: (bets: SharedBet[]) => void,
  _onError?: (err: string) => void
): () => void {
  if (!supabase || !isSupabaseConfigured) return () => {};

  let currentBets: SharedBet[] = [];

  supabase
    .from('game_bets')
    .select('*')
    .eq('round_id', roundId)
    .then(({ data }) => {
      if (data) {
        currentBets = data.map(mapSupabaseBetToSharedBet);
        onBets(currentBets);
      }
    });

  const channel = supabase
    .channel(`public:game_bets:${roundId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'game_bets',
        filter: `round_id=eq.${roundId}`,
      },
      (payload) => {
        if (payload.new) {
          const mapped = mapSupabaseBetToSharedBet(payload.new as SupabaseGameBet);
          currentBets = [...currentBets.filter((b) => b.betId !== mapped.betId), mapped];
          onBets(currentBets);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// --- Board Leadership and State Transitions ---

export async function advanceSupabaseBoard(
  gameType: 'fruit_manor' | 'golden_flower',
  roundId: string,
  leaderUid: string,
  patch: {
    roundId?: string;
    seq?: number;
    phase: string;
    phaseEndsAt: number;
    resultFruitId?: string | null;
    recentResults?: any[];
    winnerSeat?: number | null;
    seatCats?: any;
    seatCards?: any;
  }
): Promise<void> {
  if (!supabase || !isSupabaseConfigured) return;

  const targetId = patch.roundId || roundId;
  const updateData: any = {
    id: targetId,
    game_type: gameType,
    seq: patch.seq ?? (parseInt(targetId.replace(/^[A-Z]+-/, ''), 10) || 1),
    phase: patch.phase,
    ends_at: new Date(patch.phaseEndsAt).toISOString(),
    leader_id: leaderUid,
    leader_leased_until: new Date(Date.now() + 30000).toISOString(),
    result_data: {
      fruitId: patch.resultFruitId,
      recentResults: patch.recentResults,
      winnerSeat: patch.winnerSeat,
      seatCats: patch.seatCats,
      seatCards: patch.seatCards,
    },
  };

  if (patch.seq !== undefined) updateData.seq = patch.seq;

  await supabase.from('game_rounds').upsert(updateData);
}

export async function claimSupabaseLeadership(
  gameType: 'fruit_manor' | 'golden_flower',
  leaderUid: string,
  initData: {
    roundId: string;
    seq: number;
    phaseEndsAtMs: number;
  }
): Promise<void> {
  if (!supabase || !isSupabaseConfigured) return;

  await supabase.from('game_rounds').upsert({
    id: initData.roundId,
    game_type: gameType,
    seq: initData.seq,
    phase: 'OPEN',
    started_at: new Date().toISOString(),
    ends_at: new Date(initData.phaseEndsAtMs).toISOString(),
    leader_id: leaderUid,
    leader_leased_until: new Date(Date.now() + 30000).toISOString(),
    result_data: { recentResults: [] },
  });
}

// --- Bets Placement & Resolution ---

export async function createSupabaseBetRecord(bet: {
  betId: string;
  roundId: string;
  gameType: string;
  uid: string;
  username: string;
  fruitId?: string;
  seat?: number;
  stake: number;
  multiplier?: number;
}): Promise<void> {
  if (!supabase || !isSupabaseConfigured) return;

  await supabase.from('game_bets').insert({
    id: bet.betId,
    round_id: bet.roundId,
    game_type: bet.gameType,
    user_id: bet.uid,
    username: bet.username,
    bet_data: { fruitId: bet.fruitId, seat: bet.seat, multiplier: bet.multiplier || 1 },
    stake: bet.stake,
    status: 'ACCEPTED',
    payout: 0,
    created_at: new Date().toISOString(),
  });
}

export async function resolveSupabaseBetRecord(
  betId: string,
  status: 'WON' | 'LOST' | 'REFUNDED',
  payout: number
): Promise<void> {
  if (!supabase || !isSupabaseConfigured) return;

  await supabase.from('game_bets').update({ status, payout }).eq('id', betId);
}

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
