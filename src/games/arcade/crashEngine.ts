import { supabase, isSupabaseConfigured, SupabaseGameRound, SupabaseGameBet } from '../../lib/supabaseClient';
import { arcadeDebit, creditArcade } from './wallet';

export type CrashPhase = 'SCHEDULED' | 'RUNNING' | 'CRASHED';

export interface CrashBoard {
  roundId: string;
  seq: number;
  phase: CrashPhase;
  phaseStartsAt: number;
  phaseEndsAt: number;
  crashPoint: number;
  recentResults: number[];
  leaderUid: string;
  leaderLeaseUntil: number;
}

export interface CrashBet {
  betId: string;
  roundId: string;
  uid: string;
  username: string;
  stake: number;
  status: 'ACCEPTED' | 'CASHED' | 'BUSTED';
  cashedMultiplier?: number;
  payout: number;
}

const SCHEDULED_MS = 6000;
const LEASE_MS = 30000;

export function rollCrashPoint(): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  const u = Math.max(buf[0] / 4294967296, 0.000001);
  return Math.min(200, Math.max(1.01, Math.round((0.97 / u) * 100) / 100));
}

// Convert flight duration to multiplier: multiplier = e^(0.06 * seconds)
export function getMultiplierAtTime(elapsedMs: number): number {
  const seconds = Math.max(0, elapsedMs / 1000);
  const m = Math.exp(0.06 * seconds);
  return Math.round(m * 100) / 100;
}

// Convert crash multiplier back to duration in ms
export function getDurationForMultiplier(targetMultiplier: number): number {
  const seconds = Math.log(Math.max(1, targetMultiplier)) / 0.06;
  return Math.round(seconds * 1000);
}

export class SharedCrashEngine {
  private uid: string;
  private username: string;
  private board: CrashBoard | null = null;
  private bets: CrashBet[] = [];
  private unsubBoard: (() => void) | null = null;
  private unsubBets: (() => void) | null = null;
  private timer: number | null = null;
  private listeners = new Set<() => void>();
  private leaderBusy = false;
  private lastAttempt = 0;

  constructor(uid: string, username: string) {
    this.uid = uid;
    this.username = username;
    this.init();
  }

  private init() {
    if (!supabase || !isSupabaseConfigured) return;

    // 1. Initial fetch
    supabase
      .from('game_rounds')
      .select('*')
      .eq('game_type', 'crash')
      .order('seq', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          this.handleBoardUpdate(data as SupabaseGameRound);
        }
      });

    // 2. Realtime Board
    const channel = supabase
      .channel('public:game_rounds:crash')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_rounds',
          filter: 'game_type=eq.crash',
        },
        (payload) => {
          if (payload.new) {
            this.handleBoardUpdate(payload.new as SupabaseGameRound);
          }
        }
      )
      .subscribe();

    this.unsubBoard = () => {
      supabase.removeChannel(channel);
    };

    this.timer = window.setInterval(() => this.tick(), 300);
  }

  private handleBoardUpdate(r: SupabaseGameRound) {
    const res = r.result_data || {};
    const prev = this.board;
    const startsAt = r.started_at ? new Date(r.started_at).getTime() : Date.now();
    const endsAt = r.ends_at ? new Date(r.ends_at).getTime() : Date.now() + 6000;
    const crashPoint = Number(res.crashPoint) || 2.0;
    const recent = Array.isArray(res.recentResults) ? res.recentResults : [1.5, 2.1, 1.2];

    this.board = {
      roundId: r.id,
      seq: r.seq,
      phase: r.phase as CrashPhase,
      phaseStartsAt: startsAt,
      phaseEndsAt: endsAt,
      crashPoint,
      recentResults: recent,
      leaderUid: r.leader_id || 'system',
      leaderLeaseUntil: r.leader_leased_until ? new Date(r.leader_leased_until).getTime() : Date.now() + 30000,
    };

    if (prev?.roundId !== r.id) {
      this.watchBets(r.id);
    }
    this.emit();
  }

  private watchBets(roundId: string) {
    this.unsubBets?.();
    this.bets = [];

    supabase
      .from('game_bets')
      .select('*')
      .eq('round_id', roundId)
      .then(({ data }) => {
        if (data) {
          this.bets = data.map((b) => ({
            betId: b.id,
            roundId: b.round_id,
            uid: b.user_id,
            username: b.username,
            stake: b.stake,
            status: b.status as any,
            cashedMultiplier: b.bet_data?.cashedMultiplier,
            payout: b.payout,
          }));
          this.emit();
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
            const b = payload.new as any;
            const mapped: CrashBet = {
              betId: b.id,
              roundId: b.round_id,
              uid: b.user_id,
              username: b.username,
              stake: b.stake,
              status: b.status,
              cashedMultiplier: b.bet_data?.cashedMultiplier,
              payout: b.payout,
            };
            this.bets = [...this.bets.filter((item) => item.betId !== mapped.betId), mapped];
            this.emit();
          }
        }
      )
      .subscribe();

    this.unsubBets = () => {
      supabase.removeChannel(channel);
    };
  }

  private async tick() {
    const now = Date.now();
    this.emit();

    if (!this.board) {
      if (now - this.lastAttempt > 2000) {
        this.lastAttempt = now;
        void this.claimLeadership(1);
      }
      return;
    }

    const isLeader = this.board.leaderUid === this.uid || this.board.leaderLeaseUntil <= now;
    if (!isLeader) return;

    if (now >= this.board.phaseEndsAt) {
      void this.advancePhase();
    }
  }

  private async claimLeadership(seq: number) {
    if (this.leaderBusy) return;
    this.leaderBusy = true;
    try {
      const now = Date.now();
      const crashPoint = rollCrashPoint();
      await supabase.from('game_rounds').upsert({
        id: `CR-${seq}`,
        game_type: 'crash',
        seq,
        phase: 'SCHEDULED',
        started_at: new Date(now).toISOString(),
        ends_at: new Date(now + SCHEDULED_MS).toISOString(),
        leader_id: this.uid,
        leader_leased_until: new Date(now + LEASE_MS).toISOString(),
        result_data: { crashPoint, recentResults: this.board?.recentResults || [1.5, 2.0] },
      });
    } finally {
      this.leaderBusy = false;
    }
  }

  private async advancePhase() {
    if (this.leaderBusy || !this.board) return;
    this.leaderBusy = true;
    try {
      const now = Date.now();
      const { phase, seq, crashPoint, recentResults } = this.board;

      if (phase === 'SCHEDULED') {
        const flightMs = getDurationForMultiplier(crashPoint);
        await supabase.from('game_rounds').upsert({
          id: this.board.roundId,
          game_type: 'crash',
          seq,
          phase: 'RUNNING',
          started_at: new Date(now).toISOString(),
          ends_at: new Date(now + flightMs).toISOString(),
          leader_id: this.uid,
          leader_leased_until: new Date(now + LEASE_MS).toISOString(),
          result_data: { crashPoint, recentResults },
        });
      } else if (phase === 'RUNNING') {
        // Crashed!
        const nextRecent = [crashPoint, ...(recentResults || [])].slice(0, 10);
        await supabase.from('game_rounds').upsert({
          id: this.board.roundId,
          game_type: 'crash',
          seq,
          phase: 'CRASHED',
          started_at: new Date(now).toISOString(),
          ends_at: new Date(now + 4000).toISOString(),
          leader_id: this.uid,
          leader_leased_until: new Date(now + LEASE_MS).toISOString(),
          result_data: { crashPoint, recentResults: nextRecent },
        });
      } else if (phase === 'CRASHED') {
        // Start next round
        const nextSeq = seq + 1;
        const nextCrash = rollCrashPoint();
        await supabase.from('game_rounds').upsert({
          id: `CR-${nextSeq}`,
          game_type: 'crash',
          seq: nextSeq,
          phase: 'SCHEDULED',
          started_at: new Date(now).toISOString(),
          ends_at: new Date(now + SCHEDULED_MS).toISOString(),
          leader_id: this.uid,
          leader_leased_until: new Date(now + LEASE_MS).toISOString(),
          result_data: { crashPoint: nextCrash, recentResults },
        });
      }
    } finally {
      this.leaderBusy = false;
    }
  }

  async placeBet(stake: number): Promise<{ ok: boolean; reason?: string }> {
    if (!this.board || this.board.phase !== 'SCHEDULED') {
      return { ok: false, reason: 'Wait for next round to place bet!' };
    }
    const betId = `CR-B-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    try {
      await arcadeDebit(this.uid, stake, `Crash Rocket bet ${this.board.roundId}`, betId);
      await supabase.from('game_bets').insert({
        id: betId,
        round_id: this.board.roundId,
        game_type: 'crash',
        user_id: this.uid,
        username: this.username,
        stake,
        bet_data: {},
        status: 'ACCEPTED',
        payout: 0,
        created_at: new Date().toISOString(),
      });
      return { ok: true };
    } catch (err: any) {
      return { ok: false, reason: err?.message || 'Debit failed' };
    }
  }

  async cashOut(): Promise<{ ok: boolean; payout?: number; multiplier?: number; reason?: string }> {
    if (!this.board || this.board.phase !== 'RUNNING') {
      return { ok: false, reason: 'Flight not running!' };
    }
    const myBet = this.bets.find((b) => b.uid === this.uid && b.status === 'ACCEPTED');
    if (!myBet) {
      return { ok: false, reason: 'No active bet in this round' };
    }

    const elapsed = Date.now() - this.board.phaseStartsAt;
    const currentMultiplier = Math.min(this.board.crashPoint, getMultiplierAtTime(elapsed));
    const payout = Math.round(myBet.stake * currentMultiplier);

    try {
      await supabase
        .from('game_bets')
        .update({
          status: 'CASHED',
          payout,
          bet_data: { cashedMultiplier: currentMultiplier },
        })
        .eq('id', myBet.betId);

      creditArcade(this.uid, payout, `Crash Rocket cashout ×${currentMultiplier}`, `cr-w-${myBet.betId}`, {
        gameName: 'Crash Rocket',
        stake: myBet.stake,
        multiplier: currentMultiplier,
        outcome: 'WIN',
      });

      return { ok: true, payout, multiplier: currentMultiplier };
    } catch (err: any) {
      return { ok: false, reason: err?.message || 'Cashout error' };
    }
  }

  subscribe(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private emit() {
    this.listeners.forEach((cb) => cb());
  }

  getSnapshot() {
    const board = this.board;
    const now = Date.now();
    let currentMultiplier = 1.0;
    let countdownLeft = 0;

    if (board) {
      if (board.phase === 'SCHEDULED') {
        countdownLeft = Math.max(0, Math.ceil((board.phaseEndsAt - now) / 1000));
      } else if (board.phase === 'RUNNING') {
        const elapsed = Math.max(0, now - board.phaseStartsAt);
        currentMultiplier = Math.min(board.crashPoint, getMultiplierAtTime(elapsed));
      } else if (board.phase === 'CRASHED') {
        currentMultiplier = board.crashPoint;
      }
    }

    const myBet = this.bets.find((b) => b.uid === this.uid);

    return {
      board,
      phase: board?.phase || 'SCHEDULED',
      currentMultiplier,
      countdownLeft,
      crashPoint: board?.crashPoint || 1.0,
      recentResults: board?.recentResults || [],
      bets: this.bets,
      myBet,
    };
  }

  destroy() {
    if (this.timer) clearInterval(this.timer);
    this.unsubBoard?.();
    this.unsubBets?.();
    this.listeners.clear();
  }
}
