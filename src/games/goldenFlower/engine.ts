import {
  compareHands,
  createDeck,
  cryptoShuffle,
  evaluateHand,
  GF_CHIPS,
  GF_CONFIG_VERSION,
  GF_DRAW_MS,
  GF_FIRST_SEQ,
  GF_LOCK_MS,
  GF_SETTLED_MS,
  GF_VOID_MS,
  GfCard,
  HandEval,
  payoutFor,
} from './config';
import { classifySyncError } from '../../lib/sync';
import {
  advanceGfBoard,
  claimGfLeadership,
  createGfBet,
  gameCoinCredit,
  gameCoinDebit,
  GF_DEFAULT_CONFIG,
  GF_LEADER_LEASE_MS,
  GfBet,
  GfBoard,
  GfBoardPhase,
  GfRemoteConfig,
  resolveGfBet,
  subscribeGfBets,
  subscribeGfBoard,
  subscribeGfConfig,
} from '../../lib/firestoreService';
import {
  placeSupabaseBet,
  updateSupabaseBetPayout,
  upsertSupabaseRound,
} from '../../lib/supabaseGameService';

export type { GfRemoteConfig };
export { GF_DEFAULT_CONFIG };

export interface GfHistoryEntry {
  historyId: string;
  roundId: string;
  seat: number;
  stake: number;
  outcome: 'WIN' | 'LOSS' | 'REFUND';
  payout: number;
  txRef: string;
  at: number;
}

export interface GfRound {
  roundId: string;
  seq: number;
  configVersion: string;
  phase: GfBoardPhase;
  seatCards: Record<string, GfCard[]> | null;
  seatCats: Record<string, string> | null;
  winnerSeat: number | null;
  bets: GfBet[];
}

export interface GfSnapshot {
  round: GfRound;
  phaseEndsAt: number;
  serverNow: number;
  recentResults: { roundId: string; seq: number; seat: number }[];
  history: GfHistoryEntry[];
  connected: boolean;
  isLeader: boolean;
  myBets: GfBet[];
  potBySeat: number[];
  myBySeat: number[];
  players: number;
  config: GfRemoteConfig;
  error: string | null;
}

export type GfEvent =
  | { type: 'phase'; phase: GfBoardPhase; roundId: string }
  | { type: 'drawn'; winnerSeat: number; roundId: string }
  | {
      type: 'settled';
      roundId: string;
      winnerSeat: number;
      totalStake: number;
      totalPayout: number;
      net: number;
      wins: number;
    }
  | { type: 'betsAccepted'; bet: GfBet }
  | { type: 'betCancelled'; refunded: number }
  | { type: 'rejected'; reason: string };

export interface PlaceBetResult {
  ok: boolean;
  reason?: string;
  bet?: GfBet;
}

interface PendingCredit {
  key: string;
  amount: number;
  reason: string;
}

const HISTORY_CAP = 200;
const RESULTS_CAP = 30;
const SETTLED_TRACK_CAP = 600;

function randId(prefix: string): string {
  const buf = new Uint32Array(2);
  crypto.getRandomValues(buf);
  return `${prefix}${buf[0].toString(36)}${buf[1].toString(36)}`.toUpperCase();
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

export function loadGfHistory(uid: string): GfHistoryEntry[] {
  return readJson<GfHistoryEntry[]>(`gf_history_${uid}`, []);
}

// The leader deals one shuffled deck across the three seats and picks the
// best hand. Identical hands tie to the earliest seat (disclosed in rules).
function dealRound(): {
  seatCards: Record<string, GfCard[]>;
  seatCats: Record<string, string>;
  winnerSeat: number;
} {
  const deck = cryptoShuffle(createDeck());
  const seatCards: Record<string, GfCard[]> = {};
  const seatCats: Record<string, string> = {};
  const evals: HandEval[] = [];
  for (let s = 0; s < 3; s++) {
    const cards = deck.slice(s * 3, s * 3 + 3);
    seatCards[String(s)] = cards;
    const ev = evaluateHand(cards);
    evals.push(ev);
    seatCats[String(s)] = ev.name;
  }
  let winnerSeat = 0;
  for (let s = 1; s < 3; s++) {
    if (compareHands(evals[s], evals[winnerSeat]) < 0) winnerSeat = s;
  }
  return { seatCards, seatCats, winnerSeat };
}

export class GfBoardEngine {
  private uid: string;
  private username: string;
  private listeners = new Set<(snap: GfSnapshot) => void>();
  private eventListeners = new Set<(ev: GfEvent) => void>();
  private timer: number | null = null;
  private destroyed = false;
  private connected = false;

  private board: GfBoard | null = null;
  private bets: GfBet[] = [];
  private config: GfRemoteConfig = GF_DEFAULT_CONFIG;
  private boardUnsub: (() => void) | null = null;
  private betsUnsub: (() => void) | null = null;
  private configUnsub: (() => void) | null = null;
  private betsRoundId = '';

  private leaderBusy = false;
  private settleBusy = false;
  private pendingBusy = false;
  private lastAttempt = 0;
  private lastClaimAttempt = 0;
  private lastAdvanceAttempt = 0;
  private syncFailures = 0;
  private syncBackoffUntil = 0;

  private prevPhase: GfBoardPhase | null = null;
  private prevWinner: number | null = null;
  private settledRoundId = '';
  private lastError: string | null = null;

  private history: GfHistoryEntry[];
  private pending: PendingCredit[];
  private settledBetIds: string[];
  private idempotency = new Map<string, PlaceBetResult>();

  constructor(uid: string, username: string) {
    this.uid = uid;
    this.username = username;
    this.history = loadGfHistory(uid);
    this.pending = readJson<PendingCredit[]>(this.key('pending'), []);
    this.settledBetIds = readJson<string[]>(this.key('settledBets'), []);

    this.boardUnsub = subscribeGfBoard(
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

    this.configUnsub = subscribeGfConfig((config) => {
      this.config = config;
      this.emit();
    });

    this.timer = window.setInterval(() => this.tick(), 400);
    void this.processPending();
  }

  private key(name: string): string {
    return `gf_${name}_${this.uid}`;
  }

  private watchRound(roundId: string) {
    this.betsUnsub?.();
    this.betsUnsub = null;
    this.betsRoundId = roundId;
    this.bets = [];
    if (!roundId) return;
    this.betsUnsub = subscribeGfBets(
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

  subscribe(cb: (snap: GfSnapshot) => void): () => void {
    this.listeners.add(cb);
    cb(this.snapshot());
    return () => this.listeners.delete(cb);
  }

  onEvent(cb: (ev: GfEvent) => void): () => void {
    this.eventListeners.add(cb);
    return () => this.eventListeners.delete(cb);
  }

  snapshot(): GfSnapshot {
    const board = this.board;
    const accepted = this.bets.filter((b) => b.status === 'ACCEPTED');
    const myBets = accepted.filter((b) => b.uid === this.uid);
    const potBySeat = [0, 0, 0];
    const myBySeat = [0, 0, 0];
    accepted.forEach((b) => {
      if (b.seat >= 0 && b.seat <= 2) potBySeat[b.seat] += b.stake;
    });
    myBets.forEach((b) => {
      if (b.seat >= 0 && b.seat <= 2) myBySeat[b.seat] += b.stake;
    });
    const players = new Set(this.bets.map((b) => b.uid)).size;

    return {
      round: {
        roundId: board?.roundId ?? '',
        seq: board?.seq ?? 0,
        configVersion: board?.configVersion ?? GF_CONFIG_VERSION,
        phase: board?.phase ?? 'OPEN',
        seatCards: (board?.seatCards as Record<string, GfCard[]> | null) ?? null,
        seatCats: board?.seatCats ?? null,
        winnerSeat: board?.winnerSeat ?? null,
        bets: accepted,
      },
      phaseEndsAt: board?.phaseEndsAt ?? 0,
      serverNow: Date.now(),
      recentResults: board?.recentResults ?? [],
      history: this.history,
      connected: this.connected,
      isLeader: board?.leaderUid === this.uid,
      myBets,
      potBySeat,
      myBySeat,
      players,
      config: this.config,
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

  private fire(ev: GfEvent) {
    this.eventListeners.forEach((cb) => cb(ev));
  }

  private detectEvents(prev: GfBoard | null, next: GfBoard | null) {
    if (!next) return;
    if (next.phase !== this.prevPhase) {
      this.prevPhase = next.phase;
      this.fire({ type: 'phase', phase: next.phase, roundId: next.roundId });
    }
    if (next.winnerSeat !== null && next.winnerSeat !== this.prevWinner) {
      this.prevWinner = next.winnerSeat;
      this.fire({ type: 'drawn', winnerSeat: next.winnerSeat, roundId: next.roundId });
    }
    if (prev && prev.roundId !== next.roundId && next.seq > prev.seq) {
      this.prevWinner = null;
      this.settledRoundId = '';
    }
  }

  private noteSyncResult(error?: unknown) {
    if (error === undefined) {
      this.syncFailures = 0;
      this.syncBackoffUntil = 0;
      return;
    }
    if (classifySyncError(error) === 'fatal') return;
    this.syncFailures += 1;
    this.syncBackoffUntil =
      Date.now() + Math.min(10000 * 2 ** (this.syncFailures - 1), 120000);
  }

  private async tick() {
    if (this.destroyed) return;
    const now = Date.now();
    this.emit();
    if (now < this.syncBackoffUntil) return;

    if (!this.board) {
      if (this.config.enabled && now - this.lastAttempt > 1500) {
        this.lastAttempt = now;
        void this.claimLeadership();
      }
      return;
    }

    if (this.board.leaderUid === this.uid) {
      const leaseLeft = this.board.leaderLeaseUntil - now;
      if (leaseLeft < GF_LEADER_LEASE_MS / 2) {
        void this.claimLeadership();
      }
      if (now >= this.board.phaseEndsAt + 250) {
        void this.advancePhase();
      }
    } else if (this.board.leaderLeaseUntil <= now) {
      void this.claimLeadership();
    }

    if (this.board.winnerSeat !== null || this.board.phase === 'VOIDED') {
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
      await claimGfLeadership(this.uid, {
        roundId: `GF-${GF_FIRST_SEQ}`,
        seq: GF_FIRST_SEQ,
        configVersion: GF_CONFIG_VERSION,
        phaseEndsAtMs: Date.now() + this.config.openMs,
      });
      this.lastError = null;
      this.noteSyncResult();
    } catch (error) {
      this.lastError = this.describeError(error);
      this.noteSyncResult(error);
      this.emit();
    } finally {
      this.leaderBusy = false;
    }
  }

  private nextRoundPatch(now: number, board: GfBoard, pushResult: boolean) {
    const recent = board.recentResults.slice();
    if (pushResult && board.winnerSeat !== null) {
      recent.unshift({ roundId: board.roundId, seq: board.seq, seat: board.winnerSeat });
    }
    const seq = board.seq + 1;
    return {
      roundId: `GF-${seq}`,
      seq,
      phase: 'OPEN' as GfBoardPhase,
      phaseEndsAt: now + this.config.openMs,
      seatCards: null,
      seatCats: null,
      winnerSeat: null,
      recentResults: recent.slice(0, RESULTS_CAP),
    };
  }

  private async advancePhase() {
    if (this.leaderBusy || this.destroyed) return;
    const now = Date.now();
    if (now - this.lastAdvanceAttempt < 700) return;
    const board = this.board;
    if (!board || board.leaderUid !== this.uid) return;
    const phase = board.phase;
    let patch: Parameters<typeof advanceGfBoard>[3] | null = null;

    if (!this.config.enabled) {
      // Admin pause: void any round that has not produced a result yet, and
      // stop the clock after the current round settles. Clients refund their
      // own ACCEPTED bets when they see VOIDED.
      if (phase === 'OPEN' || phase === 'LOCKED') {
        patch = { phase: 'VOIDED', phaseEndsAt: now + GF_VOID_MS, winnerSeat: null };
      } else if (phase === 'SETTLED') {
        patch = { phase: 'VOIDED', phaseEndsAt: now + GF_VOID_MS };
      } else if (phase === 'DRAWN') {
        patch = { phase: 'SETTLED', phaseEndsAt: now + GF_SETTLED_MS };
      }
    } else if (phase === 'OPEN') {
      patch = { phase: 'LOCKED', phaseEndsAt: now + GF_LOCK_MS };
    } else if (phase === 'LOCKED') {
      const deal = dealRound();
      patch = {
        phase: 'DRAWN',
        seatCards: deal.seatCards,
        seatCats: deal.seatCats,
        winnerSeat: deal.winnerSeat,
        phaseEndsAt: now + GF_DRAW_MS,
      };
    } else if (phase === 'DRAWN') {
      patch = { phase: 'SETTLED', phaseEndsAt: now + GF_SETTLED_MS };
    } else if (phase === 'SETTLED') {
      patch = this.nextRoundPatch(now, board, true);
    } else if (phase === 'VOIDED') {
      patch = this.nextRoundPatch(now, board, false);
    }

    if (!patch) return;
    this.lastAdvanceAttempt = now;
    this.leaderBusy = true;
    try {
      await advanceGfBoard(this.uid, board.roundId, phase, patch);
      void upsertSupabaseRound({
        id: board.roundId,
        game_type: 'golden_flower',
        seq: patch.seq ?? board.seq,
        phase: (patch.phase as any) ?? board.phase,
        result_data: patch.winnerSeat !== undefined ? { winnerSeat: patch.winnerSeat, seatCats: patch.seatCats } : (board.winnerSeat !== null ? { winnerSeat: board.winnerSeat, seatCats: board.seatCats } : {}),
        started_at: new Date().toISOString(),
        ends_at: new Date(patch.phaseEndsAt ?? board.phaseEndsAt).toISOString(),
        leader_id: this.uid,
      });
      this.lastError = null;
      this.noteSyncResult();
    } catch (error) {
      this.lastError = this.describeError(error);
      this.noteSyncResult(error);
      this.emit();
    } finally {
      this.leaderBusy = false;
    }
  }

  private async settleMyBets() {
    const board = this.board;
    if (!board || this.settleBusy || this.destroyed) return;
    const roundId = board.roundId;
    const mine = this.bets.filter(
      (b) => b.roundId === roundId && b.uid === this.uid && b.status === 'ACCEPTED'
    );
    if (!mine.length) return;

    const voided = board.phase === 'VOIDED';
    const winner = board.winnerSeat;
    if (!voided && winner === null) return;

    this.settleBusy = true;
    try {
      let totalStake = 0;
      let totalPayout = 0;
      let wins = 0;

      for (const bet of mine) {
        totalStake += bet.stake;
        const at = Date.now();
        if (voided) {
          const key = `gf-r-${bet.betId}`;
          this.creditOrQueue(bet.stake, `Golden Flower refund ${roundId} (round voided)`, key);
          this.recordHistory({
            historyId: randId('GF-H-'),
            roundId,
            seat: bet.seat,
            stake: bet.stake,
            outcome: 'REFUND',
            payout: bet.stake,
            txRef: key,
            at,
          });
          this.markSettled(bet.betId);
          await this.safeResolve(bet.betId, 'REFUNDED', bet.stake, key);
          continue;
        }
        if (bet.seat === winner) {
          const payout = payoutFor(bet.stake);
          const key = `gf-w-${bet.betId}`;
          this.creditOrQueue(payout, `Golden Flower win ${roundId} · seat ${bet.seat} x2.98`, key);
          totalPayout += payout;
          wins += 1;
          this.recordHistory({
            historyId: randId('GF-H-'),
            roundId,
            seat: bet.seat,
            stake: bet.stake,
            outcome: 'WIN',
            payout,
            txRef: key,
            at,
          });
          this.markSettled(bet.betId);
          await this.safeResolve(bet.betId, 'WON', payout, key);
        } else {
          this.recordHistory({
            historyId: randId('GF-H-'),
            roundId,
            seat: bet.seat,
            stake: bet.stake,
            outcome: 'LOSS',
            payout: 0,
            txRef: bet.debitRef,
            at,
          });
          this.markSettled(bet.betId);
          await this.safeResolve(bet.betId, 'LOST', 0);
        }
        if (this.destroyed) return;
      }

      if (!voided && winner !== null && this.settledRoundId !== roundId) {
        this.settledRoundId = roundId;
        this.fire({
          type: 'settled',
          roundId,
          winnerSeat: winner,
          totalStake,
          totalPayout,
          net: totalPayout - totalStake,
          wins,
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
      await resolveGfBet(betId, status, payout, creditRef);
      void updateSupabaseBetPayout(betId, status, payout);
    } catch {
      // Wallet move is already idempotent; the bet stays ACCEPTED and the
      // next pass retries the document update.
    }
  }

  private recordHistory(entry: GfHistoryEntry) {
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
    seat: number,
    stake: number,
    availableBalance: number,
    idempotencyKey: string
  ): Promise<PlaceBetResult> {
    const cached = this.idempotency.get(idempotencyKey);
    if (cached) return cached;

    const fail = (reason: string): PlaceBetResult => {
      const res = { ok: false, reason };
      this.fire({ type: 'rejected', reason });
      return res;
    };

    const board = this.board;
    if (!board) return fail('Connecting to the shared board — try again in a moment.');
    if (!this.config.enabled) return fail('Golden Flower is paused by the admin right now.');
    if (board.phase !== 'OPEN' || Date.now() >= board.phaseEndsAt) {
      return fail('Betting is closed for this round.');
    }
    if (!Number.isInteger(seat) || seat < 0 || seat > 2) return fail('Pick seat A, B or C.');
    if (!(GF_CHIPS as readonly number[]).includes(stake)) {
      return fail('Pick a chip from the rail.');
    }
    if (stake > availableBalance) return fail('Not enough Coins for this chip.');

    const roundId = board.roundId;
    let debitRef: string;
    try {
      debitRef = await gameCoinDebit(
        this.uid,
        stake,
        `Golden Flower bet ${roundId} · seat ${'ABC'[seat]}`,
        idempotencyKey
      );
    } catch (error) {
      return fail(error instanceof Error ? error.message : 'Bet failed — try again.');
    }
    if (this.destroyed) return { ok: false, reason: 'Game closed.' };

    const betId = randId('GF-B-');
    try {
      await createGfBet({
        betId,
        roundId,
        uid: this.uid,
        username: this.username,
        seat,
        stake,
        debitRef,
      });
      void placeSupabaseBet({
        id: betId,
        round_id: roundId,
        game_type: 'golden_flower',
        user_id: this.uid,
        username: this.username,
        bet_data: { seat },
        stake,
        status: 'ACCEPTED',
        payout: 0,
        created_at: new Date().toISOString(),
      });
    } catch {
      // Debit went through but the bet slip could not be recorded — refund so
      // no Coins are silently lost.
      const refundKey = `gf-r-${idempotencyKey}`;
      this.pending.push({
        key: refundKey,
        amount: stake,
        reason: `Golden Flower refund ${roundId} (bet not registered)`,
      });
      this.persistLedger();
      void this.processPending();
      return fail('Betting closed while your bet was processing — Coins refunded.');
    }

    const bet: GfBet = {
      betId,
      roundId,
      uid: this.uid,
      username: this.username,
      seat,
      stake,
      status: 'ACCEPTED',
      payout: 0,
      debitRef,
      createdAt: Date.now(),
    };
    const res: PlaceBetResult = { ok: true, bet };
    this.idempotency.set(idempotencyKey, res);
    this.fire({ type: 'betsAccepted', bet });
    this.emit();
    return res;
  }

  cancelLastBet(): { ok: boolean; refunded: number; reason?: string } {
    const board = this.board;
    if (!board || board.phase !== 'OPEN' || Date.now() >= board.phaseEndsAt) {
      return { ok: false, refunded: 0, reason: 'Undo is only allowed while betting is open.' };
    }
    const mine = this.bets.filter(
      (b) => b.roundId === board.roundId && b.uid === this.uid && b.status === 'ACCEPTED'
    );
    if (!mine.length) return { ok: false, refunded: 0, reason: 'No bet to undo.' };
    const bet = mine[mine.length - 1];
    const key = `gf-r-${bet.betId}`;
    this.pending.push({
      key,
      amount: bet.stake,
      reason: `Golden Flower refund ${bet.roundId} (cancelled)`,
    });
    this.recordHistory({
      historyId: randId('GF-H-'),
      roundId: bet.roundId,
      seat: bet.seat,
      stake: bet.stake,
      outcome: 'REFUND',
      payout: bet.stake,
      txRef: key,
      at: Date.now(),
    });
    this.markSettled(bet.betId);
    void this.safeResolve(bet.betId, 'REFUNDED', bet.stake, key);
    this.persistLedger();
    void this.processPending();
    this.fire({ type: 'betCancelled', refunded: bet.stake });
    this.emit();
    return { ok: true, refunded: bet.stake };
  }

  destroy() {
    this.destroyed = true;
    if (this.timer !== null) window.clearInterval(this.timer);
    this.boardUnsub?.();
    this.betsUnsub?.();
    this.configUnsub?.();
    this.persistLedger();
    this.listeners.clear();
    this.eventListeners.clear();
  }
}