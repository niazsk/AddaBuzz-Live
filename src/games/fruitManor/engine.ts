import { FRUIT_MANOR_CONFIG, FruitId, fruitProbability } from './config';

export type RoundPhase =
  | 'SCHEDULED'
  | 'OPEN'
  | 'LOCKED'
  | 'DRAWN'
  | 'SETTLING'
  | 'SETTLED'
  | 'VOIDED';

export interface FmBet {
  betId: string;
  roundId: string;
  fruitId: FruitId;
  stake: number;
  multiplier: number;
  status: 'ACCEPTED' | 'SETTLED' | 'REFUNDED';
  payout: number;
  debitRef: string;
  creditRef?: string;
  acceptedAt: number;
}

export interface FmHistoryEntry {
  historyId: string;
  roundId: string;
  fruitId: FruitId;
  stake: number;
  multiplier: number;
  outcome: 'WIN' | 'LOSS' | 'REFUND';
  payout: number;
  txRef: string;
  at: number;
}

export interface FmRound {
  roundId: string;
  seq: number;
  configVersion: string;
  phase: RoundPhase;
  resultFruitId?: FruitId;
  bets: FmBet[];
}

export interface FmRecentResult {
  roundId: string;
  seq: number;
  fruitId: FruitId;
}

export interface FmSnapshot {
  balance: number;
  round: FmRound;
  phaseEndsAt: number;
  serverNow: number;
  recentResults: FmRecentResult[];
  history: FmHistoryEntry[];
  paused: boolean;
}

export type FmEvent =
  | { type: 'phase'; phase: RoundPhase; roundId: string }
  | { type: 'drawn'; fruitId: FruitId; roundId: string }
  | {
      type: 'settled';
      roundId: string;
      resultFruitId: FruitId;
      totalStake: number;
      totalPayout: number;
      net: number;
      wins: number;
      bets: FmBet[];
    }
  | { type: 'betsAccepted'; bets: FmBet[]; total: number; balance: number }
  | { type: 'betsCancelled'; refunded: number; balance: number }
  | { type: 'rejected'; reason: string };

export interface PlaceBetsResult {
  ok: boolean;
  reason?: string;
  bets?: FmBet[];
  balance?: number;
}

const CFG = FRUIT_MANOR_CONFIG;
const HISTORY_CAP = 200;
const RESULTS_CAP = 30;

function randId(prefix: string): string {
  const buf = new Uint32Array(2);
  crypto.getRandomValues(buf);
  return `${prefix}${buf[0].toString(36)}${buf[1].toString(36)}`.toUpperCase();
}

// Server-style secure draw: uniform crypto random mapped through the
// versioned probability table. The client never supplies or alters this.
function drawFruit(): FruitId {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  const r = buf[0] / 4294967296;
  let acc = 0;
  for (const f of CFG.fruits) {
    acc += fruitProbability(f.fruitId);
    if (r < acc) return f.fruitId;
  }
  return CFG.fruits[CFG.fruits.length - 1].fruitId;
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full/blocked — game continues in-memory for this session.
  }
}

export class FruitManorEngine {
  private uid: string;
  private listeners = new Set<(snap: FmSnapshot) => void>();
  private eventListeners = new Set<(ev: FmEvent) => void>();
  private timer: number | null = null;
  private lastTick = Date.now();
  private paused = false;
  private destroyed = false;
  private idempotency = new Map<string, PlaceBetsResult>();

  private balance: number;
  private history: FmHistoryEntry[];
  private recentResults: FmRecentResult[];
  private seq: number;
  private round: FmRound;
  private phaseEndsAt: number;

  constructor(uid: string) {
    this.uid = uid;
    this.balance = readJson<number>(this.key('wallet'), CFG.demoStartBalance);
    this.history = readJson<FmHistoryEntry[]>(this.key('history'), []);
    this.recentResults = readJson<FmRecentResult[]>(this.key('results'), []);
    this.seq = readJson<number>(this.key('seq'), 1041);

    // A round interrupted by reload/close is voided and every accepted bet
    // refunded exactly once, so no stake is ever silently lost or duplicated.
    const active = readJson<{ round: FmRound; phaseEndsAt: number } | null>(this.key('active'), null);
    if (active && active.round.phase !== 'SETTLED') {
      const refund = active.round.bets
        .filter((b) => b.status === 'ACCEPTED')
        .reduce((s, b) => s + b.stake, 0);
      if (refund > 0) {
        this.balance += refund;
        const at = Date.now();
        active.round.bets
          .filter((b) => b.status === 'ACCEPTED')
          .forEach((b) => {
            b.status = 'REFUNDED';
            this.history.unshift({
              historyId: randId('FM-H-'),
              roundId: b.roundId,
              fruitId: b.fruitId,
              stake: b.stake,
              multiplier: b.multiplier,
              outcome: 'REFUND',
              payout: b.stake,
              txRef: randId('FM-TX-R-'),
              at,
            });
          });
        this.history = this.history.slice(0, HISTORY_CAP);
      }
    }
    this.clearActive();
    this.persistWallet();

    this.seq += 1;
    this.round = this.newRound(this.seq);
    this.phaseEndsAt = Date.now() + CFG.scheduledMs;
    this.persistActive();
    this.lastTick = Date.now();
    this.timer = window.setInterval(() => this.tick(), 200);
  }

  private key(name: string): string {
    return `fm_${name}_${this.uid}`;
  }

  private newRound(seq: number): FmRound {
    return {
      roundId: `FM-${seq}`,
      seq,
      configVersion: CFG.configVersion,
      phase: 'SCHEDULED',
      bets: [],
    };
  }

  private persistWallet() {
    writeJson(this.key('wallet'), this.balance);
    writeJson(this.key('history'), this.history);
    writeJson(this.key('results'), this.recentResults);
    writeJson(this.key('seq'), this.seq);
  }

  private persistActive() {
    writeJson(this.key('active'), { round: this.round, phaseEndsAt: this.phaseEndsAt });
  }

  private clearActive() {
    try {
      localStorage.removeItem(this.key('active'));
    } catch {
      // ignore
    }
  }

  subscribe(cb: (snap: FmSnapshot) => void): () => void {
    this.listeners.add(cb);
    cb(this.snapshot());
    return () => this.listeners.delete(cb);
  }

  onEvent(cb: (ev: FmEvent) => void): () => void {
    this.eventListeners.add(cb);
    return () => this.eventListeners.delete(cb);
  }

  snapshot(): FmSnapshot {
    return {
      balance: this.balance,
      round: this.round,
      phaseEndsAt: this.phaseEndsAt,
      serverNow: Date.now(),
      recentResults: this.recentResults,
      history: this.history,
      paused: this.paused,
    };
  }

  private emit() {
    const snap = this.snapshot();
    this.listeners.forEach((cb) => cb(snap));
  }

  private fire(ev: FmEvent) {
    this.eventListeners.forEach((cb) => cb(ev));
  }

  setPaused(paused: boolean) {
    if (this.paused === paused) return;
    this.paused = paused;
    this.lastTick = Date.now();
    this.emit();
  }

  private tick() {
    if (this.destroyed) return;
    const now = Date.now();
    const dt = now - this.lastTick;
    this.lastTick = now;
    if (this.paused) {
      this.phaseEndsAt += dt;
      this.emit();
      return;
    }
    let guard = 0;
    while (now >= this.phaseEndsAt && guard < 24) {
      guard += 1;
      this.advance(now);
    }
    this.emit();
  }

  private advance(now: number) {
    const phase = this.round.phase;
    if (phase === 'SCHEDULED') {
      this.round.phase = 'OPEN';
      this.phaseEndsAt = now + CFG.openMs;
    } else if (phase === 'OPEN') {
      this.round.phase = 'LOCKED';
      this.phaseEndsAt = now + CFG.lockedMs;
    } else if (phase === 'LOCKED') {
      this.round.phase = 'DRAWN';
      this.round.resultFruitId = drawFruit();
      this.phaseEndsAt = now + CFG.spinMs;
      this.fire({ type: 'drawn', fruitId: this.round.resultFruitId, roundId: this.round.roundId });
    } else if (phase === 'DRAWN') {
      this.round.phase = 'SETTLING';
      this.phaseEndsAt = now + CFG.settlingMs;
    } else if (phase === 'SETTLING') {
      this.settle(now);
      this.round.phase = 'SETTLED';
      this.phaseEndsAt = now + CFG.settledDisplayMs;
      this.clearActive();
    } else if (phase === 'SETTLED') {
      this.seq += 1;
      this.round = this.newRound(this.seq);
      this.phaseEndsAt = now + CFG.scheduledMs;
      this.idempotency.clear();
      this.persistActive();
    }
    this.persistActive();
    this.fire({ type: 'phase', phase: this.round.phase, roundId: this.round.roundId });
  }

  private settle(now: number) {
    const result = this.round.resultFruitId;
    if (!result) return;
    let totalStake = 0;
    let totalPayout = 0;
    let wins = 0;
    for (const bet of this.round.bets) {
      if (bet.status !== 'ACCEPTED') continue;
      totalStake += bet.stake;
      bet.status = 'SETTLED';
      if (bet.fruitId === result) {
        bet.payout = bet.stake * bet.multiplier;
        bet.creditRef = randId('FM-TX-W-');
        this.balance += bet.payout;
        totalPayout += bet.payout;
        wins += 1;
      } else {
        bet.payout = 0;
      }
      this.history.unshift({
        historyId: randId('FM-H-'),
        roundId: bet.roundId,
        fruitId: bet.fruitId,
        stake: bet.stake,
        multiplier: bet.multiplier,
        outcome: bet.payout > 0 ? 'WIN' : 'LOSS',
        payout: bet.payout,
        txRef: bet.creditRef ?? bet.debitRef,
        at: now,
      });
    }
    this.history = this.history.slice(0, HISTORY_CAP);
    this.recentResults = [
      { roundId: this.round.roundId, seq: this.round.seq, fruitId: result },
      ...this.recentResults,
    ].slice(0, RESULTS_CAP);
    this.persistWallet();
    this.fire({
      type: 'settled',
      roundId: this.round.roundId,
      resultFruitId: result,
      totalStake,
      totalPayout,
      net: totalPayout - totalStake,
      wins,
      bets: this.round.bets.filter((b) => b.status === 'SETTLED'),
    });
  }

  placeBets(entries: { fruitId: FruitId; stake: number }[], idempotencyKey: string): PlaceBetsResult {
    const cached = this.idempotency.get(idempotencyKey);
    if (cached) return cached;

    const fail = (reason: string): PlaceBetsResult => {
      const res = { ok: false, reason };
      this.fire({ type: 'rejected', reason });
      return res;
    };

    if (this.paused) return fail('Connection lost — wait to reconnect.');
    if (this.round.phase !== 'OPEN' || Date.now() >= this.phaseEndsAt) {
      return fail('Betting is closed for this round.');
    }
    if (!entries.length) return fail('Add at least one fruit bet.');
    if (entries.length + this.round.bets.length > CFG.maxBetsPerRound) {
      return fail(`Maximum ${CFG.maxBetsPerRound} bets per round.`);
    }
    const roundStake = this.round.bets.reduce((s, b) => s + (b.status === 'ACCEPTED' ? b.stake : 0), 0);
    let total = 0;
    for (const e of entries) {
      const fruit = CFG.fruits.find((f) => f.fruitId === e.fruitId);
      if (!fruit) return fail('Unknown fruit selection.');
      if (!Number.isInteger(e.stake) || e.stake < CFG.minStake) {
        return fail(`Minimum stake is ${CFG.minStake} coins.`);
      }
      if (e.stake > CFG.maxStakePerBet) {
        return fail(`Maximum ${CFG.maxStakePerBet.toLocaleString()} coins per bet.`);
      }
      total += e.stake;
    }
    if (roundStake + total > CFG.maxRoundStake) {
      return fail(`Round limit is ${CFG.maxRoundStake.toLocaleString()} coins.`);
    }
    if (total > this.balance) return fail('Not enough demo coins for this bet.');

    const acceptedAt = Date.now();
    const bets: FmBet[] = entries.map((e) => {
      const fruit = CFG.fruits.find((f) => f.fruitId === e.fruitId)!;
      return {
        betId: randId('FM-B-'),
        roundId: this.round.roundId,
        fruitId: e.fruitId,
        stake: e.stake,
        multiplier: fruit.multiplier,
        status: 'ACCEPTED',
        payout: 0,
        debitRef: randId('FM-TX-D-'),
        acceptedAt,
      };
    });
    this.balance -= total;
    this.round.bets.push(...bets);
    this.persistWallet();
    this.persistActive();
    const res: PlaceBetsResult = { ok: true, bets, balance: this.balance };
    this.idempotency.set(idempotencyKey, res);
    this.fire({ type: 'betsAccepted', bets, total, balance: this.balance });
    this.emit();
    return res;
  }

  cancelBets(): { ok: boolean; refunded: number; reason?: string } {
    if (this.round.phase !== 'OPEN' || Date.now() >= this.phaseEndsAt) {
      return { ok: false, refunded: 0, reason: 'Cancellation is only allowed while betting is open.' };
    }
    const accepted = this.round.bets.filter((b) => b.status === 'ACCEPTED');
    if (!accepted.length) return { ok: false, refunded: 0, reason: 'No accepted bets to cancel.' };
    const refunded = accepted.reduce((s, b) => s + b.stake, 0);
    const at = Date.now();
    accepted.forEach((b) => {
      b.status = 'REFUNDED';
      this.history.unshift({
        historyId: randId('FM-H-'),
        roundId: b.roundId,
        fruitId: b.fruitId,
        stake: b.stake,
        multiplier: b.multiplier,
        outcome: 'REFUND',
        payout: b.stake,
        txRef: randId('FM-TX-R-'),
        at,
      });
    });
    this.history = this.history.slice(0, HISTORY_CAP);
    this.balance += refunded;
    this.persistWallet();
    this.persistActive();
    this.fire({ type: 'betsCancelled', refunded, balance: this.balance });
    this.emit();
    return { ok: true, refunded };
  }

  resetDemo(): number {
    const accepted = this.round.bets.filter((b) => b.status === 'ACCEPTED');
    this.balance += accepted.reduce((s, b) => s + b.stake, 0);
    accepted.forEach((b) => (b.status = 'REFUNDED'));
    this.balance = CFG.demoStartBalance;
    this.history = [];
    this.recentResults = [];
    this.persistWallet();
    this.persistActive();
    this.emit();
    return this.balance;
  }

  destroy() {
    this.destroyed = true;
    if (this.timer !== null) window.clearInterval(this.timer);
    this.persistActive();
    this.listeners.clear();
    this.eventListeners.clear();
  }
}