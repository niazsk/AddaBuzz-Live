import { arcadeDebit, capPayout, creditArcade, newRoundId, randomUnit } from './wallet';

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

const OPEN_MS = 12000;
const SPIN_MS = 6000;
const SETTLED_MS = 4000;
const TICK_MS = 100;

export function rollRouletteNumber(): number {
  return WHEEL_ORDER[Math.floor(randomUnit() * WHEEL_ORDER.length)];
}

export class SharedRouletteEngine {
  private uid: string;
  private username: string;
  private board: RouletteBoard | null = null;
  private bets: RouletteBet[] = [];
  private history: number[] = [];
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
      roundId: newRoundId('RL'),
      seq: this.seq,
      phase: 'OPEN',
      phaseStartsAt: now,
      phaseEndsAt: now + OPEN_MS,
      winningNumber: rollRouletteNumber(),
      recentResults: this.history,
    };
  }

  private tick() {
    const board = this.board;
    if (!board) return;
    const now = Date.now();
    if (now < board.phaseEndsAt) return;

    if (board.phase === 'OPEN') {
      board.phase = 'SPINNING';
      board.phaseStartsAt = now;
      board.phaseEndsAt = now + SPIN_MS;
    } else if (board.phase === 'SPINNING') {
      board.phase = 'SETTLED';
      board.phaseStartsAt = now;
      board.phaseEndsAt = now + SETTLED_MS;
      this.history = [board.winningNumber, ...this.history].slice(0, 10);
      this.settleBets();
    } else {
      this.startRound();
    }
    this.emit();
  }

  private settleBets() {
    const board = this.board;
    if (!board) return;
    const winNumber = board.winningNumber;
    const winColor = numberColor(winNumber).toUpperCase();

    for (const bet of this.bets) {
      if (bet.status !== 'ACCEPTED' || bet.roundId !== board.roundId) continue;
      const isWin = bet.betKind === 'GREEN' ? winNumber === 0 : bet.betKind === winColor;
      if (isWin) {
        const multiplier = BET_MULTIPLIER[bet.betKind];
        const payout = capPayout(bet.stake * multiplier);
        bet.status = 'WON';
        bet.payout = payout;
        creditArcade(
          this.uid,
          payout,
          `Roulette win #${winNumber} (${winColor})`,
          `rl-${bet.betId}-w`
        );
      } else {
        bet.status = 'LOST';
        bet.payout = 0;
      }
    }
  }

  async placeBet(
    betKind: RouletteBetKind,
    stake: number
  ): Promise<{ ok: boolean; reason?: string }> {
    const board = this.board;
    if (!board || board.phase !== 'OPEN') {
      return { ok: false, reason: 'Betting is closed — wait for the next spin.' };
    }
    if (this.bets.some((b) => b.roundId === board.roundId)) {
      return { ok: false, reason: 'You already placed a bet this round.' };
    }
    const betId = newRoundId('RLB');
    try {
      await arcadeDebit(this.uid, stake, `Roulette bet ${board.roundId} · ${betKind}`, `rl-${betId}-s`);
    } catch (err) {
      return { ok: false, reason: err instanceof Error ? err.message : 'Debit failed' };
    }
    const bet: RouletteBet = {
      betId,
      roundId: board.roundId,
      uid: this.uid,
      username: this.username,
      betKind,
      stake,
      status: 'ACCEPTED',
      payout: 0,
    };
    this.bets = [bet, ...this.bets].slice(0, 40);
    this.emit();
    return { ok: true };
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
    const countdownLeft = board ? Math.max(0, Math.ceil((board.phaseEndsAt - now) / 1000)) : 0;
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
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
    const board = this.board;
    const pending = this.bets.filter(
      (b) => b.status === 'ACCEPTED' && b.roundId === board?.roundId
    );
    if (pending.length) {
      // The winning number is already locked for this round, so settle rather than drop the stake.
      this.settleBets();
    }
    this.listeners.clear();
  }
}
