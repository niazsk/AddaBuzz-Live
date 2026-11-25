import { arcadeDebit, capPayout, creditArcade, newRoundId, randomUnit } from './wallet';

export type CrashPhase = 'SCHEDULED' | 'RUNNING' | 'CRASHED';

export interface CrashBoard {
  roundId: string;
  seq: number;
  phase: CrashPhase;
  phaseStartsAt: number;
  phaseEndsAt: number;
  crashPoint: number;
  recentResults: number[];
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

const SCHEDULED_MS = 7000;
const CRASHED_MS = 4000;
const TICK_MS = 100;

export function rollCrashPoint(): number {
  const u = Math.max(randomUnit(), 0.000001);
  return Math.min(200, Math.max(1.01, Math.round((0.97 / u) * 100) / 100));
}

// Multiplier = e^(0.06 * seconds)
export function getMultiplierAtTime(elapsedMs: number): number {
  const seconds = Math.max(0, elapsedMs / 1000);
  return Math.round(Math.exp(0.06 * seconds) * 100) / 100;
}

export function getDurationForMultiplier(targetMultiplier: number): number {
  const seconds = Math.log(Math.max(1, targetMultiplier)) / 0.06;
  return Math.round(seconds * 1000);
}

export class SharedCrashEngine {
  private uid: string;
  private username: string;
  private board: CrashBoard | null = null;
  private bet: CrashBet | null = null;
  private seq = 0;
  private timer: number | null = null;
  private listeners = new Set<() => void>();

  constructor(uid: string, username: string) {
    this.uid = uid;
    this.username = username;
    this.startRound();
    this.timer = window.setInterval(() => this.tick(), TICK_MS);
  }

  private startRound() {
    const now = Date.now();
    this.seq += 1;
    this.board = {
      roundId: newRoundId('CR'),
      seq: this.seq,
      phase: 'SCHEDULED',
      phaseStartsAt: now,
      phaseEndsAt: now + SCHEDULED_MS,
      crashPoint: rollCrashPoint(),
      recentResults: this.board?.recentResults ?? [],
    };
  }

  private tick() {
    const board = this.board;
    if (!board) return;
    const now = Date.now();

    if (now >= board.phaseEndsAt) {
      if (board.phase === 'SCHEDULED') {
        board.phase = 'RUNNING';
        board.phaseStartsAt = now;
        board.phaseEndsAt = now + getDurationForMultiplier(board.crashPoint);
      } else if (board.phase === 'RUNNING') {
        board.phase = 'CRASHED';
        board.phaseStartsAt = now;
        board.phaseEndsAt = now + CRASHED_MS;
        board.recentResults = [board.crashPoint, ...board.recentResults].slice(0, 10);
        if (this.bet?.status === 'ACCEPTED') {
          this.bet.status = 'BUSTED';
          this.bet.payout = 0;
        }
      } else {
        this.startRound();
      }
    }
    this.emit();
  }

  async placeBet(stake: number): Promise<{ ok: boolean; reason?: string }> {
    const board = this.board;
    if (!board || board.phase !== 'SCHEDULED') {
      return { ok: false, reason: 'Betting is closed — wait for the next launch.' };
    }
    if (this.bet && this.bet.roundId === board.roundId) {
      return { ok: false, reason: 'You already have a bet in this round.' };
    }
    const betId = newRoundId('CRB');
    try {
      await arcadeDebit(this.uid, stake, `Crash Rocket bet ${board.roundId}`, `cr-${betId}-s`);
    } catch (err) {
      return { ok: false, reason: err instanceof Error ? err.message : 'Debit failed' };
    }
    this.bet = {
      betId,
      roundId: board.roundId,
      uid: this.uid,
      username: this.username,
      stake,
      status: 'ACCEPTED',
      payout: 0,
    };
    this.emit();
    return { ok: true };
  }

  async cashOut(): Promise<{ ok: boolean; payout?: number; multiplier?: number; reason?: string }> {
    const board = this.board;
    if (!board || board.phase !== 'RUNNING') {
      return { ok: false, reason: 'Flight is not running.' };
    }
    const bet = this.bet;
    if (!bet || bet.status !== 'ACCEPTED') {
      return { ok: false, reason: 'No active bet in this round.' };
    }
    const multiplier = Math.min(
      board.crashPoint,
      getMultiplierAtTime(Date.now() - board.phaseStartsAt)
    );
    const payout = capPayout(Math.round(bet.stake * multiplier));
    bet.status = 'CASHED';
    bet.cashedMultiplier = multiplier;
    bet.payout = payout;
    creditArcade(
      this.uid,
      payout,
      `Crash Rocket cashout ×${multiplier.toFixed(2)}`,
      `cr-${bet.betId}-w`,
      { gameName: 'Crash Rocket', stake: bet.stake, multiplier, outcome: 'WIN' }
    );
    this.emit();
    return { ok: true, payout, multiplier };
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
      } else {
        currentMultiplier = board.crashPoint;
      }
    }

    return {
      board,
      phase: board?.phase || 'SCHEDULED',
      currentMultiplier,
      countdownLeft,
      crashPoint: board?.crashPoint || 1.0,
      recentResults: board?.recentResults || [],
      bets: this.bet ? [this.bet] : [],
      myBet: this.bet,
    };
  }

  destroy() {
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
    const bet = this.bet;
    const board = this.board;
    if (bet && bet.status === 'ACCEPTED' && board) {
      if (board.phase === 'RUNNING') {
        void this.cashOut();
      } else if (board.phase === 'SCHEDULED') {
        bet.status = 'BUSTED';
        creditArcade(this.uid, bet.stake, `Crash Rocket refund ${bet.betId}`, `cr-${bet.betId}-r`);
      }
    }
    this.listeners.clear();
  }
}
