import { supabase, isSupabaseConfigured, SupabaseGameRound, SupabaseGameBet } from '../../lib/supabaseClient';
import { arcadeDebit, creditArcade } from './wallet';

export type RouletteBetKind = 'RED' | 'BLACK' | 'GREEN';
export type RoulettePhase = 'OPEN' | 'SPINNING' | 'SETTLED';

export const WHEEL_ORDER = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5,
  24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
];

export const RED_NUMBERS = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
]);

export const BET_MULTIPLIER: Record<RouletteBetKind, number> = { RED: 2, BLACK: 2, GREEN: 14 };

export function numberColor(n: number): 'green' | 'red' | 'black' {
  if (n === 0) return 'green';
  return RED_NUMBERS.has(n) ? 'red' : 'black';
}

export interface RouletteBoard {
  roundId: string;
  seq: number;
  phase: RoulettePhase;
  phaseStartsAt: number;
  phaseEndsAt: number;
  winningNumber: number;
  recentResults: number[];
  leaderUid: string;
  leaderLeaseUntil: number;
}

export interface RouletteBet {
  betId: string;
  roundId: string;
  uid: string;
  username: string;
  betKind: RouletteBetKind;
  stake: number;
  status: 'ACCEPTED' | 'WON' | 'LOST';
  payout: number;
}

const OPEN_MS = 15000;
const SPIN_MS = 5500;
const SETTLED_MS = 4000;
const LEASE_MS = 30000;

export function rollRouletteNumber(): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return WHEEL_ORDER[buf[0] % WHEEL_ORDER.length];
}

export class SharedRouletteEngine {
  private uid: string;
  private username: string;
  private board: RouletteBoard | null = null;
  private bets: RouletteBet[] = [];
  private unsubBoard: (() => void) | null = null;
  private unsubBets: (() => void) | null = null;
  private timer: number | null = null;
  private listeners = new Set<() => void>();
  private leaderBusy = false;
  private settleBusy = false;
  private lastAttempt = 0;

  constructor(uid: string, username: string) {
    this.uid = uid;
    this.username = username;
    this.init();
  }

  private init() {
    if (!supabase || !isSupabaseConfigured) return;

    supabase
      .from('game_rounds')
      .select('*')
      .eq('game_type', 'roulette')
      .order('seq', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          this.handleBoardUpdate(data as SupabaseGameRound);
        }
      });

    const channel = supabase
      .channel('public:game_rounds:roulette')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_rounds',
          filter: 'game_type=eq.roulette',
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
    const endsAt = r.ends_at ? new Date(r.ends_at).getTime() : Date.now() + 15000;
    const winningNumber = Number(res.winningNumber) || 0;
    const recent = Array.isArray(res.recentResults) ? res.recentResults : [17, 32, 0];

    this.board = {
      roundId: r.id,
      seq: r.seq,
      phase: r.phase as RoulettePhase,
      phaseStartsAt: startsAt,
      phaseEndsAt: endsAt,
      winningNumber,
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
            betKind: b.bet_data?.betKind || 'RED',
            stake: b.stake,
            status: b.status as any,
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
            const mapped: RouletteBet = {
              betId: b.id,
              roundId: b.round_id,
              uid: b.user_id,
              username: b.username,
              betKind: b.bet_data?.betKind || 'RED',
              stake: b.stake,
              status: b.status,
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

    if (this.board.phase === 'SETTLED' && !this.settleBusy) {
      void this.settleMyBets();
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
      const num = rollRouletteNumber();
      await supabase.from('game_rounds').upsert({
        id: `RL-${seq}`,
        game_type: 'roulette',
        seq,
        phase: 'OPEN',
        started_at: new Date(now).toISOString(),
        ends_at: new Date(now + OPEN_MS).toISOString(),
        leader_id: this.uid,
        leader_leased_until: new Date(now + LEASE_MS).toISOString(),
        result_data: { winningNumber: num, recentResults: this.board?.recentResults || [17, 32, 0] },
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
      const { phase, seq, winningNumber, recentResults } = this.board;

      if (phase === 'OPEN') {
        // Spin the wheel
        await supabase.from('game_rounds').upsert({
          id: this.board.roundId,
          game_type: 'roulette',
          seq,
          phase: 'SPINNING',
          started_at: new Date(now).toISOString(),
          ends_at: new Date(now + SPIN_MS).toISOString(),
          leader_id: this.uid,
          leader_leased_until: new Date(now + LEASE_MS).toISOString(),
          result_data: { winningNumber, recentResults },
        });
      } else if (phase === 'SPINNING') {
        // Settled
        const nextRecent = [winningNumber, ...(recentResults || [])].slice(0, 10);
        await supabase.from('game_rounds').upsert({
          id: this.board.roundId,
          game_type: 'roulette',
          seq,
          phase: 'SETTLED',
          started_at: new Date(now).toISOString(),
          ends_at: new Date(now + SETTLED_MS).toISOString(),
          leader_id: this.uid,
          leader_leased_until: new Date(now + LEASE_MS).toISOString(),
          result_data: { winningNumber, recentResults: nextRecent },
        });
      } else if (phase === 'SETTLED') {
        // Next round
        const nextSeq = seq + 1;
        const nextNum = rollRouletteNumber();
        await supabase.from('game_rounds').upsert({
          id: `RL-${nextSeq}`,
          game_type: 'roulette',
          seq: nextSeq,
          phase: 'OPEN',
          started_at: new Date(now).toISOString(),
          ends_at: new Date(now + OPEN_MS).toISOString(),
          leader_id: this.uid,
          leader_leased_until: new Date(now + LEASE_MS).toISOString(),
          result_data: { winningNumber: nextNum, recentResults },
        });
      }
    } finally {
      this.leaderBusy = false;
    }
  }

  private async settleMyBets() {
    if (!this.board || this.board.phase !== 'SETTLED' || this.settleBusy) return;
    const myAccepted = this.bets.filter((b) => b.uid === this.uid && b.status === 'ACCEPTED');
    if (!myAccepted.length) return;

    this.settleBusy = true;
    try {
      const winNum = this.board.winningNumber;
      const winColor = numberColor(winNum).toUpperCase();

      for (const bet of myAccepted) {
        let isWin = false;
        if (bet.betKind === 'GREEN' && winNum === 0) isWin = true;
        else if (bet.betKind === winColor) isWin = true;

        const multiplier = isWin ? BET_MULTIPLIER[bet.betKind] : 0;
        const payout = isWin ? bet.stake * multiplier : 0;
        const status = isWin ? 'WON' : 'LOST';

        await supabase
          .from('game_bets')
          .update({ status, payout })
          .eq('id', bet.betId);

        if (isWin) {
          creditArcade(this.uid, payout, `Roulette win #${winNum} (${winColor})`, `rl-w-${bet.betId}`, {
            gameName: 'Roulette',
            stake: bet.stake,
            multiplier,
            outcome: 'WIN',
          });
        }
      }
    } finally {
      this.settleBusy = false;
    }
  }

  async placeBet(betKind: RouletteBetKind, stake: number): Promise<{ ok: boolean; reason?: string }> {
    if (!this.board || this.board.phase !== 'OPEN') {
      return { ok: false, reason: 'Betting closed for this round!' };
    }
    const betId = `RL-B-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    try {
      await arcadeDebit(this.uid, stake, `Roulette bet ${this.board.roundId} · ${betKind}`, betId);
      await supabase.from('game_bets').insert({
        id: betId,
        round_id: this.board.roundId,
        game_type: 'roulette',
        user_id: this.uid,
        username: this.username,
        stake,
        bet_data: { betKind },
        status: 'ACCEPTED',
        payout: 0,
        created_at: new Date().toISOString(),
      });
      return { ok: true };
    } catch (err: any) {
      return { ok: false, reason: err?.message || 'Debit failed' };
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
    let countdownLeft = 0;

    if (board) {
      countdownLeft = Math.max(0, Math.ceil((board.phaseEndsAt - now) / 1000));
    }

    const myBets = this.bets.filter((b) => b.uid === this.uid);

    return {
      board,
      phase: board?.phase || 'OPEN',
      countdownLeft,
      winningNumber: board?.winningNumber ?? null,
      recentResults: board?.recentResults || [],
      bets: this.bets,
      myBets,
    };
  }

  destroy() {
    if (this.timer) clearInterval(this.timer);
    this.unsubBoard?.();
    this.unsubBets?.();
    this.listeners.clear();
  }
}
