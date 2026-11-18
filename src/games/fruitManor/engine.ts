import { FRUIT_MANOR_CONFIG, FruitId, fruitProbability } from './config';
import {
  advanceFruitManorBoard,
  claimFruitManorLeadership,
  createFruitManorBet,
  FRUIT_MANOR_LEADER_LEASE_MS,
  gameCoinCredit,
  gameCoinDebit,
  resolveFruitManorBet,
  SharedBet,
  SharedBoard,
  SharedBoardPhase,
  subscribeFruitManorBets,
  subscribeFruitManorBoard,
} from '../../lib/firestoreService';

export type RoundPhase = SharedBoardPhase;

export interface FmBet {
  betId: string;
  roundId: string;
  uid: string;
  username: string;
  fruitId: FruitId;
  stake: number;
  multiplier: number;
  status: 'ACCEPTED' | 'WON' | 'LOST' | 'REFUNDED';
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
  /** Every bet placed on this shared round, from all players. */
  bets: FmBet[];
}

export interface FmRecentResult {
  roundId: string;
  seq: number;
  fruitId: FruitId;
}

export interface FmSnapshot {
  round: FmRound;
  phaseEndsAt: number;
  serverNow: number;
  recentResults: FmRecentResult[];
  history: FmHistoryEntry[];
  paused: boolean;
  connected: boolean;
  isLeader: boolean;
  /** This player's own bets on the current round. */
  myBets: FmBet[];
  poolByFruit: Record<string, number>;
  poolStake: number;
  myStake: number;
  players: number;
  /** Last shared-board error, if any (shown in the UI for quick diagnosis). */
  error: string | null;
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
  | { type: 'betsAccepted'; bets: FmBet[]; total: number }
  | { type: 'betsCancelled'; refunded: number }
  | { type: 'rejected'; reason: string };

export interface PlaceBetsResult {
  ok: boolean;
  reason?: string;
  bet?: FmBet;
}

interface PendingCredit {
  key: string;
  amount: number;
  reason: string;
}

const CFG = FRUIT_MANOR_CONFIG;
const HISTORY_CAP = 200;
const RESULTS_CAP = 30;
const SETTLED_TRACK_CAP = 600;
const FIRST_SEQ = 1041;

function randId(prefix: string): string {
  const buf = new Uint32Array(2);
  crypto.getRandomValues(buf);
  return `${prefix}${buf[0].toString(36)}${buf[1].toString(36)}`.toUpperCase();
}

// Server-style secure draw: uniform crypto random mapped through the
// versioned probability table. The leader draws, everyone sees the result.
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

export function loadFmHistory(uid: string): FmHistoryEntry[] {
  return readJson<FmHistoryEntry[]>(`fm_history_${uid}`, []);
}

function mapBet(b: SharedBet): FmBet {
  return {
    betId: b.betId,
    roundId: b.roundId,
    uid: b.uid,
    username: b.username,
    fruitId: b.fruitId as FruitId,
    stake: b.stake,
    multiplier: b.multiplier,
    status: b.status,
    payout: b.payout,
    debitRef: b.debitRef,
    creditRef: b.creditRef,
    acceptedAt: b.createdAt,
  };
}

export class FruitManorEngine {
  private uid: string;
  private username: string;
  private listeners = new Set<(snap: FmSnapshot) => void>();
  private eventListeners = new Set<(ev: FmEvent) => void>();
  private timer: number | null = null;
  private destroyed = false;
  private paused = false;
  private connected = false;

  private board: SharedBoard | null = null;
  private bets: SharedBet[] = [];
  private boardUnsub: (() => void) | null = null;
  private betsUnsub: (() => void) | null = null;
  private betsRoundId = '';

  private leaderBusy = false;
  private settleBusy = false;
  private pendingBusy = false;
  private lastAttempt = 0;
  private lastClaimAttempt = 0;
  private lastAdvanceAttempt = 0;

  private prevPhase: RoundPhase | null = null;
  private prevResult: FruitId | null = null;
  private settledRoundId = '';
  private lastError: string | null = null;

  private history: FmHistoryEntry[];
  private pending: PendingCredit[];
  private settledBetIds: string[];
  private idempotency = new Map<string, PlaceBetsResult>();

  constructor(uid: string, username: string) {
    this.uid = uid;
    this.username = username;
    this.history = loadFmHistory(uid);
    this.pending = readJson<PendingCredit[]>(this.key('pending'), []);
    this.settledBetIds = readJson<string[]>(this.key('settledBets'), []);

    // One-time migration: demo-era ledger entries carry fake refs, so they
    // never mix with real Coin transactions.
    if (!readJson<boolean>(this.key('liveMigrated'), false)) {
      this.history = [];
      writeJson(this.key('liveMigrated'), true);
      writeJson(this.key('history'), this.history);
      try {
        localStorage.removeItem(this.key('wallet'));
      } catch {
        // ignore
      }
    }

    this.boardUnsub = subscribeFruitManorBoard(
      (board) => {
        this.connected = true;
        const prev = this.board;
        this.board = board;
        if (board && board.roundId !== this.betsRoundId) {
          this.watchRound(board.roundId);
        }
        if (board && prev && prev.roundId !== board.roundId) {
          this.idempotency.clear();
        }
        this.detectEvents(prev, board);
        this.emit();
      },
      (message) => {
        this.lastError = this.describeError(message);
        this.emit();
      }
    );

    this.timer = window.setInterval(() => this.tick(), 400);
    void this.processPending();
  }

  private key(name: string): string {
    return `fm_${name}_${this.uid}`;
  }

  private watchRound(roundId: string) {
    this.betsUnsub?.();
    this.betsUnsub = null;
    this.betsRoundId = roundId;
    this.bets = [];
    if (!roundId) return;
    this.betsUnsub = subscribeFruitManorBets(
      roundId,
      (list) => {
        this.bets = list;
        this.emit();
        void this.settleMyBets();
      },
      (message) => {
        this.lastError = this.describeError(message);
        this.emit();
      }
    );
  }

  private myAcceptedBets(): FmBet[] {
    return this.bets
      .filter((b) => b.uid === this.uid && b.status === 'ACCEPTED')
      .map(mapBet);
  }

  private watchBetsFor(roundId: string): FmBet[] {
    return this.bets.filter((b) => b.roundId === roundId && b.uid === this.uid).map(mapBet);
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

  private phase(): RoundPhase {
    return this.board?.phase ?? 'SCHEDULED';
  }

  snapshot(): FmSnapshot {
    const board = this.board;
    const allBets = this.bets.map(mapBet);
    const accepted = allBets.filter((b) => b.status === 'ACCEPTED');
    const myBets = accepted.filter((b) => b.uid === this.uid);
    const poolByFruit: Record<string, number> = {};
    CFG.fruits.forEach((f) => {
      poolByFruit[f.fruitId] = 0;
    });
    accepted.forEach((b) => {
      poolByFruit[b.fruitId] = (poolByFruit[b.fruitId] ?? 0) + b.stake;
    });
    const players = new Set(allBets.map((b) => b.uid)).size;

    return {
      round: {
        roundId: board?.roundId ?? '',
        seq: board?.seq ?? 0,
        configVersion: board?.configVersion ?? CFG.configVersion,
        phase: board?.phase ?? 'SCHEDULED',
        resultFruitId: (board?.resultFruitId as FruitId | null) ?? undefined,
        bets: accepted,
      },
      phaseEndsAt: board?.phaseEndsAt ?? 0,
      serverNow: Date.now(),
      recentResults: (board?.recentResults ?? []).map((r) => ({
        roundId: r.roundId,
        seq: r.seq,
        fruitId: r.fruitId as FruitId,
      })),
      history: this.history,
      paused: this.paused,
      connected: this.connected,
      isLeader: board?.leaderUid === this.uid,
      myBets,
      poolByFruit,
      poolStake: accepted.reduce((s, b) => s + b.stake, 0),
      myStake: myBets.reduce((s, b) => s + b.stake, 0),
      players,
      error: this.lastError,
    };
  }

  private describeError(raw: unknown): string {
    const text = (raw instanceof Error ? raw.message : String(raw)).replace(
      /^Firebase(Error)?:\s*/i,
      ''
    );
    try {
      const info = JSON.parse(text) as {
        error?: string;
        authInfo?: { emailVerified?: boolean };
      };
      const message = info.error ?? text;
      if (/permission|insufficient/i.test(message)) {
        return info.authInfo?.emailVerified === false
          ? 'Your email is not verified — the shared board rejected the write. Verify your email and reload.'
          : 'Shared board permission denied — the security rules rejected the write.';
      }
      return message.slice(0, 200);
    } catch {
      return text.slice(0, 200);
    }
  }

  private emit() {
    const snap = this.snapshot();
    this.listeners.forEach((cb) => cb(snap));
  }

  private fire(ev: FmEvent) {
    this.eventListeners.forEach((cb) => cb(ev));
  }

  private detectEvents(prev: SharedBoard | null, next: SharedBoard | null) {
    if (!next) return;
    if (next.phase !== this.prevPhase) {
      this.prevPhase = next.phase;
      this.fire({ type: 'phase', phase: next.phase, roundId: next.roundId });
    }
    const result = (next.resultFruitId as FruitId | null) ?? null;
    if (result && result !== this.prevResult) {
      this.prevResult = result;
      this.fire({ type: 'drawn', fruitId: result, roundId: next.roundId });
    }
    if (prev && prev.roundId !== next.roundId && next.seq > prev.seq) {
      this.prevResult = null;
      this.settledRoundId = '';
    }
  }

  setPaused(paused: boolean) {
    if (this.paused === paused) return;
    this.paused = paused;
    this.emit();
  }

  private async tick() {
    if (this.destroyed) return;
    const now = Date.now();
    this.emit();

    if (this.paused) return;

    if (!this.board) {
      if (now - this.lastAttempt > 1500) {
        this.lastAttempt = now;
        void this.claimLeadership();
      }
      return;
    }

    if (this.board.leaderUid === this.uid) {
      const leaseLeft = this.board.leaderLeaseUntil - now;
      if (leaseLeft < FRUIT_MANOR_LEADER_LEASE_MS / 2) {
        void this.claimLeadership();
      }
      if (now >= this.board.phaseEndsAt + 250) {
        void this.advancePhase();
      }
    } else if (this.board.leaderLeaseUntil <= now) {
      void this.claimLeadership();
    }

    if (this.board.resultFruitId || this.board.phase === 'VOIDED') {
      void this.settleMyBets();
    }

    if (this.pending.length && now - this.lastAttempt > 5000) {
      this.lastAttempt = now;
      void this.processPending();
    }
  }

  private async claimLeadership() {
    if (this.leaderBusy || this.destroyed) return;
    const now = Date.now();
    if (now - this.lastClaimAttempt < 2500) return;
    this.lastClaimAttempt = now;
    this.leaderBusy = true;
    try {
      await claimFruitManorLeadership(this.uid, {
        roundId: `FM-${FIRST_SEQ}`,
        seq: FIRST_SEQ,
        configVersion: CFG.configVersion,
        phaseEndsAtMs: Date.now() + CFG.scheduledMs,
      });
      this.lastError = null;
    } catch (error) {
      this.lastError = this.describeError(error);
      this.emit();
      // Another client holds the lease or the write was rejected — retry later.
    } finally {
      this.leaderBusy = false;
    }
  }

  private async advancePhase() {
    if (this.leaderBusy || this.destroyed) return;
    const now = Date.now();
    if (now - this.lastAdvanceAttempt < 700) return;
    const board = this.board;
    if (!board || board.leaderUid !== this.uid) return;
    const phase = board.phase;
    let patch: Parameters<typeof advanceFruitManorBoard>[3] | null = null;

    if (phase === 'SCHEDULED') {
      patch = { phase: 'OPEN', phaseEndsAt: now + CFG.openMs };
    } else if (phase === 'OPEN') {
      patch = { phase: 'LOCKED', phaseEndsAt: now + CFG.lockedMs };
    } else if (phase === 'LOCKED') {
      const result = drawFruit();
      patch = {
        phase: 'DRAWN',
        resultFruitId: result,
        phaseEndsAt: now + CFG.spinMs,
      };
    } else if (phase === 'DRAWN') {
      patch = { phase: 'SETTLING', phaseEndsAt: now + CFG.settlingMs };
    } else if (phase === 'SETTLING') {
      patch = { phase: 'SETTLED', phaseEndsAt: now + CFG.settledDisplayMs };
    } else if (phase === 'SETTLED' || phase === 'VOIDED') {
      const recent = board.recentResults.slice();
      if (phase === 'SETTLED' && board.resultFruitId) {
        recent.unshift({
          roundId: board.roundId,
          seq: board.seq,
          fruitId: board.resultFruitId,
        });
      }
      const seq = board.seq + 1;
      patch = {
        roundId: `FM-${seq}`,
        seq,
        phase: 'SCHEDULED',
        phaseEndsAt: now + CFG.scheduledMs,
        resultFruitId: null,
        recentResults: recent.slice(0, RESULTS_CAP),
      };
    }

    if (!patch) return;
    this.lastAdvanceAttempt = now;
    this.leaderBusy = true;
    try {
      await advanceFruitManorBoard(this.uid, board.roundId, phase, patch);
      this.lastError = null;
    } catch (error) {
      this.lastError = this.describeError(error);
      this.emit();
      // Phase write rejected (locked / stale) — the next tick retries.
    } finally {
      this.leaderBusy = false;
    }
  }

  private async settleMyBets() {
    const board = this.board;
    if (!board || this.settleBusy || this.destroyed) return;
    const roundId = board.roundId;
    const mine = this.watchBetsFor(roundId).filter((b) => b.status === 'ACCEPTED');
    if (!mine.length) return;

    const voided = board.phase === 'VOIDED';
    const result = (board.resultFruitId as FruitId | null) ?? null;
    if (!voided && !result) return;

    this.settleBusy = true;
    try {
      let totalStake = 0;
      let totalPayout = 0;
      let wins = 0;
      const settled: FmBet[] = [];

      for (const bet of mine) {
        totalStake += bet.stake;
        const at = Date.now();
        if (voided) {
          const key = `fm-r-${bet.betId}`;
          this.creditOrQueue(bet.stake, `Fruit Manor refund ${roundId} (round voided)`, key);
          this.recordHistory({
            historyId: randId('FM-H-'),
            roundId,
            fruitId: bet.fruitId,
            stake: bet.stake,
            multiplier: bet.multiplier,
            outcome: 'REFUND',
            payout: bet.stake,
            txRef: key,
            at,
          });
          this.markSettled(bet.betId);
          await this.safeResolve(bet.betId, 'REFUNDED', bet.stake, key);
          continue;
        }
        if (bet.fruitId === result) {
          const payout = bet.stake * bet.multiplier;
          const key = `fm-w-${bet.betId}`;
          this.creditOrQueue(
            payout,
            `Fruit Manor win ${roundId} · ${bet.fruitId} x${bet.multiplier}`,
            key
          );
          totalPayout += payout;
          wins += 1;
          this.recordHistory({
            historyId: randId('FM-H-'),
            roundId,
            fruitId: bet.fruitId,
            stake: bet.stake,
            multiplier: bet.multiplier,
            outcome: 'WIN',
            payout,
            txRef: key,
            at,
          });
          this.markSettled(bet.betId);
          await this.safeResolve(bet.betId, 'WON', payout, key);
          settled.push({ ...bet, status: 'WON', payout, creditRef: key });
        } else {
          this.recordHistory({
            historyId: randId('FM-H-'),
            roundId,
            fruitId: bet.fruitId,
            stake: bet.stake,
            multiplier: bet.multiplier,
            outcome: 'LOSS',
            payout: 0,
            txRef: bet.debitRef,
            at,
          });
          this.markSettled(bet.betId);
          await this.safeResolve(bet.betId, 'LOST', 0);
          settled.push({ ...bet, status: 'LOST', payout: 0 });
        }
        if (this.destroyed) return;
      }

      if (!voided && settled.length && this.settledRoundId !== roundId) {
        this.settledRoundId = roundId;
        this.fire({
          type: 'settled',
          roundId,
          resultFruitId: result as FruitId,
          totalStake,
          totalPayout,
          net: totalPayout - totalStake,
          wins,
          bets: settled,
        });
      }
      this.emit();
    } finally {
      this.settleBusy = false;
    }
  }

  private async safeResolve(
    betId: string,
    status: 'WON' | 'LOST' | 'REFUNDED',
    payout: number,
    creditRef?: string
  ) {
    try {
      await resolveFruitManorBet(betId, status, payout, creditRef);
    } catch {
      // Bet document update failed; the wallet move is already idempotent and
      // the bet stays ACCEPTED, so the next pass retries it.
    }
  }

  private recordHistory(entry: FmHistoryEntry) {
    if (this.history.some((h) => h.txRef === entry.txRef && h.roundId === entry.roundId)) return;
    this.history = [entry, ...this.history].slice(0, HISTORY_CAP);
    writeJson(this.key('history'), this.history);
  }

  private markSettled(betId: string) {
    if (this.settledBetIds.includes(betId)) return;
    this.settledBetIds = [betId, ...this.settledBetIds].slice(0, SETTLED_TRACK_CAP);
    writeJson(this.key('settledBets'), this.settledBetIds);
  }

  private creditOrQueue(amount: number, reason: string, key: string) {
    void gameCoinCredit(this.uid, amount, reason, key).catch(() => {
      this.pending.push({ key, amount, reason });
      this.persistLedger();
    });
  }

  private persistLedger() {
    writeJson(this.key('pending'), this.pending);
    writeJson(this.key('history'), this.history);
  }

  private async processPending() {
    if (this.pendingBusy || this.destroyed || !this.pending.length) return;
    this.pendingBusy = true;
    try {
      while (this.pending.length && !this.destroyed) {
        const item = this.pending[0];
        try {
          await gameCoinCredit(this.uid, item.amount, item.reason, item.key);
        } catch {
          break;
        }
        this.pending.shift();
        this.persistLedger();
      }
    } finally {
      this.pendingBusy = false;
    }
  }

  async placeBet(
    fruitId: FruitId,
    stake: number,
    availableBalance: number,
    idempotencyKey: string
  ): Promise<PlaceBetsResult> {
    const cached = this.idempotency.get(idempotencyKey);
    if (cached) return cached;

    const fail = (reason: string): PlaceBetsResult => {
      const res = { ok: false, reason };
      this.fire({ type: 'rejected', reason });
      return res;
    };

    const board = this.board;
    if (!board) return fail('Connecting to the shared board — try again in a moment.');
    if (this.paused) return fail('Connection lost — wait to reconnect.');
    if (board.phase !== 'OPEN' || Date.now() >= board.phaseEndsAt) {
      return fail('Betting is closed for this round.');
    }
    const fruit = CFG.fruits.find((f) => f.fruitId === fruitId);
    if (!fruit) return fail('Unknown fruit selection.');
    if (!Number.isInteger(stake) || stake < CFG.minStake) {
      return fail(`Minimum stake is ${CFG.minStake} coins.`);
    }
    if (stake > CFG.maxStakePerBet) {
      return fail(`Maximum ${CFG.maxStakePerBet.toLocaleString('en-US')} coins per bet.`);
    }
    if (stake > availableBalance) return fail('Not enough Coins for this bet.');

    const roundId = board.roundId;
    let debitRef: string;
    try {
      debitRef = await gameCoinDebit(
        this.uid,
        stake,
        `Fruit Manor bet ${roundId} · ${fruit.label}`,
        idempotencyKey
      );
    } catch (error) {
      return fail(error instanceof Error ? error.message : 'Bet failed — try again.');
    }
    if (this.destroyed) return { ok: false, reason: 'Game closed.' };

    const betId = randId('FM-B-');
    try {
      await createFruitManorBet({
        betId,
        roundId,
        uid: this.uid,
        username: this.username,
        fruitId,
        stake,
        multiplier: fruit.multiplier,
        debitRef,
      });
    } catch {
      // The debit went through but the shared bet could not be recorded —
      // return the stake so no Coins are silently lost.
      const refundKey = `fm-r-${idempotencyKey}`;
      this.pending.push({
        key: refundKey,
        amount: stake,
        reason: `Fruit Manor refund ${roundId} (bet not registered)`,
      });
      this.persistLedger();
      void this.processPending();
      return fail('Betting closed while your bet was processing — Coins refunded.');
    }

    const bet: FmBet = {
      betId,
      roundId,
      uid: this.uid,
      username: this.username,
      fruitId,
      stake,
      multiplier: fruit.multiplier,
      status: 'ACCEPTED',
      payout: 0,
      debitRef,
      acceptedAt: Date.now(),
    };
    const res: PlaceBetsResult = { ok: true, bet };
    this.idempotency.set(idempotencyKey, res);
    this.fire({ type: 'betsAccepted', bets: [bet], total: stake });
    this.emit();
    return res;
  }

  cancelBets(): { ok: boolean; refunded: number; reason?: string } {
    const board = this.board;
    if (!board || board.phase !== 'OPEN' || Date.now() >= board.phaseEndsAt) {
      return { ok: false, refunded: 0, reason: 'Cancellation is only allowed while betting is open.' };
    }
    const accepted = this.myAcceptedBets();
    if (!accepted.length) return { ok: false, refunded: 0, reason: 'No accepted bets to cancel.' };
    const refunded = accepted.reduce((s, b) => s + b.stake, 0);
    const at = Date.now();
    accepted.forEach((b) => {
      const key = `fm-r-${b.betId}`;
      this.pending.push({ key, amount: b.stake, reason: `Fruit Manor refund ${b.roundId} (cancelled)` });
      this.recordHistory({
        historyId: randId('FM-H-'),
        roundId: b.roundId,
        fruitId: b.fruitId,
        stake: b.stake,
        multiplier: b.multiplier,
        outcome: 'REFUND',
        payout: b.stake,
        txRef: key,
        at,
      });
      this.markSettled(b.betId);
      void this.safeResolve(b.betId, 'REFUNDED', b.stake, key);
    });
    this.persistLedger();
    void this.processPending();
    this.fire({ type: 'betsCancelled', refunded });
    this.emit();
    return { ok: true, refunded };
  }

  destroy() {
    this.destroyed = true;
    if (this.timer !== null) window.clearInterval(this.timer);
    this.boardUnsub?.();
    this.betsUnsub?.();
    this.persistLedger();
    this.listeners.clear();
    this.eventListeners.clear();
  }
}
