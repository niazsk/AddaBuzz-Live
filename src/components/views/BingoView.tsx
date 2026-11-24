import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  CircleDot,
  Coins,
  Grid3x3,
  LogIn,
  RotateCcw,
  Sparkles,
  Ticket,
} from 'lucide-react';
import { UserProfile } from '../../types/app';
import {
  ARCADE_CHIPS,
  arcadeDebit,
  creditArcade,
  flushArcadeCredits,
  fmtCoins,
  loadArcadeHistory,
  newRoundId,
  saveArcadeHistory,
} from '../../games/arcade/wallet';

const DRAW_COUNT = 13;
const POOL_SIZE = 30;
const PLAYER_NUMBERS = 9;

const LINES: number[][] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

type Phase = 'idle' | 'drawing' | 'result';

interface HistoryEntry {
  id: string;
  at: number;
  stake: number;
  lines: number;
  fullHouse: boolean;
  payout: number;
}

interface RoundResult {
  lines: number;
  fullHouse: boolean;
  payout: number;
}

interface BingoViewProps {
  currentUser: UserProfile | null;
  coinBalance: number;
  isOffline: boolean;
  onBack: () => void;
  onOpenAuth: () => void;
}

function shuffle<T>(list: T[]): T[] {
  const arr = list.slice();
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function payoutMultiplier(lines: number, fullHouse: boolean): number {
  if (fullHouse) return 40;
  if (lines >= 3) return 12;
  if (lines === 2) return 5;
  if (lines === 1) return 2;
  return 0;
}

function resultLineText(lines: number, fullHouse: boolean): string {
  if (fullHouse) return 'Full house!';
  if (lines >= 3) return `${lines} lines — huge hit!`;
  if (lines === 2) return '2 lines!';
  if (lines === 1) return '1 line!';
  return 'No line this round';
}

export const BingoView: React.FC<BingoViewProps> = ({
  currentUser,
  coinBalance,
  isOffline,
  onBack,
  onOpenAuth,
}) => {
  const [stake, setStake] = useState<number>(100);
  const [phase, setPhase] = useState<Phase>('idle');
  const [card, setCard] = useState<number[]>([]);
  const [draws, setDraws] = useState<number[]>([]);
  const [round, setRound] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RoundResult | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const intervalRef = useRef<number | null>(null);
  const settleRef = useRef<number | null>(null);
  const stakeRef = useRef(stake);
  stakeRef.current = stake;
  const userRef = useRef(currentUser);
  userRef.current = currentUser;
  const drawingRef = useRef<{
    id: string;
    card: number[];
    draws: number[];
    stake: number;
  } | null>(null);

  useEffect(() => {
    if (!currentUser) return;
    setHistory(loadArcadeHistory<HistoryEntry>(`bb_history_${currentUser.uid}`));
    void flushArcadeCredits(currentUser.uid);
  }, [currentUser]);

  const recordHistory = (entry: HistoryEntry) => {
    if (!currentUser) return;
    const next = [entry, ...history].slice(0, 40);
    setHistory(next);
    saveArcadeHistory(`bb_history_${currentUser.uid}`, next);
  };

  // Settles the card even if the player leaves while balls are still dropping.
  const finalizeBingo = (info: {
    id: string;
    card: number[];
    draws: number[];
    stake: number;
    onScreen: boolean;
  }) => {
    const uid = userRef.current?.uid;
    if (!uid) return;
    const marked = new Set(info.draws);
    const lines = LINES.filter((line) => line.every((i) => marked.has(info.card[i]))).length;
    const fullHouse = info.card.every((n) => marked.has(n));
    const multiplier = payoutMultiplier(lines, fullHouse);
    const payout = Math.round(info.stake * multiplier);
    if (payout > 0) {
      creditArcade(
        uid,
        payout,
        `Bingo Bazaar win ${info.id} · ${fullHouse ? 'full house' : `${lines} line(s)`}`,
        `bb-${info.id}-w`
      );
    }
    const entry: HistoryEntry = {
      id: info.id,
      at: Date.now(),
      stake: info.stake,
      lines,
      fullHouse,
      payout,
    };
    if (info.onScreen) {
      setResult({ lines, fullHouse, payout });
      setPhase('result');
      recordHistory(entry);
    } else {
      const list = loadArcadeHistory<HistoryEntry>(`bb_history_${uid}`);
      saveArcadeHistory(`bb_history_${uid}`, [entry, ...list].slice(0, 40));
    }
  };

  useEffect(
    () => () => {
      if (intervalRef.current !== null) window.clearInterval(intervalRef.current);
      if (settleRef.current !== null) window.clearTimeout(settleRef.current);
      const info = drawingRef.current;
      if (info) {
        drawingRef.current = null;
        finalizeBingo({ ...info, onScreen: false });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const settle = (finalDraws: number[], finalCard: number[], id: string, roundStake: number) => {
    drawingRef.current = null;
    finalizeBingo({ id, card: finalCard, draws: finalDraws, stake: roundStake, onScreen: true });
  };

  const buyCard = async () => {
    if (!currentUser || busy || isOffline) return;
    if (coinBalance < stake) {
      setError('Not enough Coins for this card.');
      return;
    }
    setBusy(true);
    setError(null);
    setResult(null);
    const id = newRoundId('BB');
    try {
      await arcadeDebit(currentUser.uid, stake, `Bingo Bazaar card ${id}`, `bb-${id}-s`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not buy the card.');
      setBusy(false);
      return;
    }
    setBusy(false);

    const nextCard = shuffle(Array.from({ length: POOL_SIZE }, (_, i) => i + 1)).slice(
      0,
      PLAYER_NUMBERS
    );
    const drawSequence = shuffle(Array.from({ length: POOL_SIZE }, (_, i) => i + 1)).slice(
      0,
      DRAW_COUNT
    );
    setRound(id);
    setCard(nextCard);
    setDraws([]);
    setPhase('drawing');
    drawingRef.current = { id, card: nextCard, draws: [], stake: stakeRef.current };

    let cursor = 0;
    intervalRef.current = window.setInterval(() => {
      cursor += 1;
      const visible = drawSequence.slice(0, cursor);
      if (drawingRef.current && drawingRef.current.id === id) {
        drawingRef.current.draws = visible;
      }
      setDraws(visible);
      if (cursor >= DRAW_COUNT) {
        if (intervalRef.current !== null) window.clearInterval(intervalRef.current);
        intervalRef.current = null;
        settleRef.current = window.setTimeout(
          () => settle(visible, nextCard, id, stakeRef.current),
          750
        );
      }
    }, 520);
  };

  const reset = () => {
    setPhase('idle');
    setResult(null);
    setCard([]);
    setDraws([]);
    setError(null);
  };

  const markedSet = new Set(draws);
  const completedLines = new Set(
    LINES.reduce<number[]>((acc, line, idx) => {
      if (card.length && line.every((i) => markedSet.has(card[i]))) acc.push(idx);
      return acc;
    }, [])
  );
  const lineTiles = new Set<number>();
  completedLines.forEach((idx) => LINES[idx].forEach((t) => lineTiles.add(t)));

  return (
    <div className="space-y-4 pb-10">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to games"
          className="w-9 h-9 rounded-xl bg-[#111420] border border-white/[0.08] hover:border-white/20 text-slate-300 hover:text-white flex items-center justify-center shrink-0 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl font-bold leading-tight inline-flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-fuchsia-300 via-pink-500 to-rose-600 ring-1 ring-white/25 shadow-lg shadow-fuchsia-500/40">
              <Grid3x3 className="w-[18px] h-[18px] text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]" />
            </span>
            <span>Bingo Bazaar</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Buy a 3×3 card — {DRAW_COUNT} balls drop, every completed line pays.
          </p>
        </div>
        <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-amber-300/25 bg-amber-400/[0.08] px-2.5 py-1.5">
          <Coins className="h-3.5 w-3.5 text-amber-300" />
          <span className="font-mono text-xs font-black tabular-nums text-amber-300">
            {fmtCoins(coinBalance)}
          </span>
        </span>
      </div>

      {!currentUser ? (
        <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-br from-fuchsia-600/20 via-[#111420] to-amber-600/15 p-8 text-center space-y-4">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-fuchsia-400 to-rose-500 flex items-center justify-center shadow-lg shadow-fuchsia-500/30">
            <Ticket className="w-7 h-7 text-white" />
          </div>
          <h2 className="font-display text-xl font-bold text-white">Sign in for bingo night</h2>
          <p className="text-sm text-slate-400 max-w-sm mx-auto">
            Bingo Bazaar runs on AddaBuzz Coins — sign in to grab a card.
          </p>
          <button
            type="button"
            onClick={onOpenAuth}
            className="px-6 py-2.5 rounded-full bg-gradient-to-r from-fuchsia-400 to-rose-500 text-white text-sm font-semibold inline-flex items-center gap-2 shadow-lg shadow-fuchsia-900/40"
          >
            <LogIn className="w-4 h-4" /> Sign In
          </button>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr] items-start">
          <section className="relative overflow-hidden rounded-3xl border border-fuchsia-300/20 bg-[linear-gradient(160deg,rgba(58,10,42,0.95),rgba(20,8,18,0.98)_55%,rgba(30,10,26,0.98))] p-4 sm:p-6">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-14 -top-14 h-48 w-48 rounded-full bg-[radial-gradient(closest-side,rgba(232,121,249,0.28),transparent)] blur-2xl"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -left-16 bottom-[-50px] h-44 w-44 rounded-full bg-[radial-gradient(closest-side,rgba(245,158,11,0.2),transparent)] blur-2xl"
            />

            <div className="relative flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-fuchsia-300/25 bg-fuchsia-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-fuchsia-200">
                <CircleDot className="h-3 w-3" />
                {phase === 'drawing'
                  ? `Ball ${Math.min(draws.length, DRAW_COUNT)} of ${DRAW_COUNT}`
                  : phase === 'result'
                  ? 'Round complete'
                  : 'Ready to deal'}
              </span>
              <span className="text-[10px] font-semibold text-slate-400">
                Your card
              </span>
            </div>

            <div className="relative mt-4 grid grid-cols-3 gap-2">
              {(card.length ? card : Array.from({ length: PLAYER_NUMBERS }, () => 0)).map(
                (num, idx) => {
                  const isMarked = num > 0 && markedSet.has(num);
                  const onLine = isMarked && lineTiles.has(idx);
                  return (
                    <div
                      key={`${num}-${idx}`}
                      className={`grid h-16 sm:h-20 place-items-center rounded-2xl border font-mono text-xl font-black tabular-nums transition-all duration-300 ${
                        num === 0
                          ? 'border-white/[0.06] bg-white/[0.03] text-slate-700'
                          : onLine
                          ? 'bb-tile-marked border-emerald-300/50 bg-gradient-to-b from-emerald-400/30 to-teal-600/15 text-emerald-100 shadow-[0_0_24px_-6px_rgba(16,185,129,0.7)]'
                          : isMarked
                          ? 'border-fuchsia-300/50 bg-gradient-to-b from-fuchsia-400/25 to-rose-600/10 text-white'
                          : 'border-white/[0.08] bg-white/[0.04] text-slate-200'
                      }`}
                    >
                      {num > 0 ? (
                        <span className="relative">
                          {num}
                          {isMarked && (
                            <span className="absolute -right-2.5 -top-2 h-2 w-2 rounded-full bg-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.9)]" />
                          )}
                        </span>
                      ) : (
                        '·'
                      )}
                    </div>
                  );
                }
              )}
            </div>

            <div className="relative mt-4 rounded-2xl border border-white/10 bg-black/25 px-3 py-2.5">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none]">
                {Array.from({ length: DRAW_COUNT }).map((_, i) => {
                  const ball = draws[i];
                  const isLast = i === draws.length - 1 && phase !== 'idle';
                  return (
                    <span
                      key={i}
                      className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border font-mono text-[11px] font-bold tabular-nums ${
                        ball
                          ? isLast
                            ? 'bb-ball border-amber-300/60 bg-gradient-to-br from-amber-300 to-orange-500 text-amber-950 shadow-[0_0_16px_rgba(245,158,11,0.8)]'
                            : 'border-fuchsia-300/40 bg-fuchsia-500/20 text-fuchsia-100'
                          : 'border-white/[0.08] bg-white/[0.03] text-slate-600'
                      }`}
                    >
                      {ball ?? '·'}
                    </span>
                  );
                })}
              </div>
            </div>

            {error && (
              <p className="relative mt-3 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-200">
                {error}
              </p>
            )}

            {phase === 'result' && result && (
              <div
                className={`gf-result relative mt-3 rounded-2xl border px-4 py-3 text-center ${
                  result.payout > 0
                    ? 'border-emerald-300/35 bg-emerald-400/10'
                    : 'border-rose-300/35 bg-rose-500/10'
                }`}
              >
                <p
                  className={`font-display text-sm font-bold ${
                    result.payout > 0 ? 'text-emerald-200' : 'text-rose-200'
                  }`}
                >
                  {resultLineText(result.lines, result.fullHouse)}
                  {result.payout > 0
                    ? ` +${fmtCoins(result.payout)} coins`
                    : ` −${fmtCoins(stake)} coins`}
                </p>
              </div>
            )}

            <div className="relative mt-4 space-y-3">
              {phase === 'idle' && (
                <>
                  <div className="flex gap-2">
                    {ARCADE_CHIPS.map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => setStake(chip)}
                        className={`flex-1 h-11 rounded-xl border font-mono text-xs font-bold tabular-nums transition-all ${
                          stake === chip
                            ? 'border-fuchsia-300/60 bg-gradient-to-b from-fuchsia-400/30 to-rose-600/15 text-fuchsia-100 shadow-[0_8px_22px_-10px_rgba(232,121,249,0.8)]'
                            : 'border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]'
                        }`}
                      >
                        {fmtCoins(chip)}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => void buyCard()}
                    disabled={busy || isOffline}
                    className="w-full h-12 rounded-2xl bg-gradient-to-r from-fuchsia-400 via-pink-500 to-rose-500 text-white text-sm font-bold inline-flex items-center justify-center gap-2 shadow-[0_16px_36px_-14px_rgba(232,121,249,0.9)] ring-1 ring-white/20 disabled:opacity-45 disabled:cursor-not-allowed active:scale-[0.99] transition-transform"
                  >
                    <Ticket className="w-4 h-4" />
                    {busy ? 'Buying card…' : `Buy card · ${fmtCoins(stake)}`}
                  </button>
                </>
              )}

              {phase === 'drawing' && (
                <button
                  type="button"
                  disabled
                  className="w-full h-12 rounded-2xl border border-white/10 bg-white/[0.05] text-slate-300 text-sm font-semibold inline-flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-fuchsia-300 animate-pulse" />
                  Drawing balls… {Math.min(draws.length, DRAW_COUNT)}/{DRAW_COUNT}
                </button>
              )}

              {phase === 'result' && (
                <button
                  type="button"
                  onClick={reset}
                  className="w-full h-12 rounded-2xl border border-white/10 bg-white/[0.06] hover:bg-white/[0.1] text-slate-200 text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" /> New card
                </button>
              )}

              {isOffline && (
                <p className="text-center text-[10px] font-medium text-fuchsia-300/80">
                  Offline — reconnecting before the next card.
                </p>
              )}
            </div>
          </section>

          <aside className="space-y-4">
            <section className="rounded-3xl border border-white/[0.07] bg-[#111420] p-4 sm:p-5">
              <h2 className="font-display text-sm font-semibold text-white inline-flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-fuchsia-300" /> Payouts
              </h2>
              <div className="mt-3 space-y-1.5 text-[11px]">
                {[
                  ['1 line', 'x2'],
                  ['2 lines', 'x5'],
                  ['3+ lines', 'x12'],
                  ['Full house', 'x40'],
                ].map(([label, mult]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between rounded-xl border border-white/[0.05] bg-white/[0.03] px-3 py-1.5"
                  >
                    <span className="text-slate-400">{label}</span>
                    <span className="font-mono font-bold tabular-nums text-fuchsia-300">
                      {mult}
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[10px] leading-relaxed text-slate-500">
                Lines = rows, columns and diagonals. {DRAW_COUNT} balls are drawn from 1–{POOL_SIZE}
                {' '}per round.
              </p>
            </section>

            <section className="rounded-3xl border border-white/[0.07] bg-[#111420] p-4 sm:p-5">
              <h2 className="font-display text-sm font-semibold text-white">Recent cards</h2>
              {history.length === 0 ? (
                <p className="mt-3 text-[11px] text-slate-500">
                  No cards yet — your bingo nights will show up here.
                </p>
              ) : (
                <div className="mt-3 space-y-1.5">
                  {history.slice(0, 6).map((h) => (
                    <div
                      key={h.id + h.at}
                      className="flex items-center justify-between rounded-xl border border-white/[0.05] bg-white/[0.03] px-3 py-1.5 text-[11px]"
                    >
                      <span className="inline-flex items-center gap-1.5 text-slate-400">
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            h.payout > 0 ? 'bg-emerald-400' : 'bg-rose-400'
                          }`}
                        />
                        {h.fullHouse ? 'Full house' : `${h.lines} line(s)`} · {fmtCoins(h.stake)}
                      </span>
                      <span
                        className={`font-mono font-bold tabular-nums ${
                          h.payout > 0 ? 'text-emerald-300' : 'text-rose-300'
                        }`}
                      >
                        {h.payout > 0 ? `+${fmtCoins(h.payout)}` : `−${fmtCoins(h.stake)}`}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </aside>
        </div>
      )}
    </div>
  );
};
