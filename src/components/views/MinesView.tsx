import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Bomb,
  Coins,
  Gem,
  LogIn,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { UserProfile } from '../../types/app';
import {
  ARCADE_CHIPS,
  arcadeDebit,
  capPayout,
  creditArcade,
  flushArcadeCredits,
  fmtCoins,
  loadArcadeHistory,
  newRoundId,
  randomUnit,
  saveArcadeHistory,
} from '../../games/arcade/wallet';

const TILE_COUNT = 20;
const MINE_COUNT = 3;

type Phase = 'idle' | 'running' | 'busted' | 'cashed';

interface HistoryEntry {
  id: string;
  at: number;
  stake: number;
  revealed: number;
  payout: number;
}

interface Props {
  currentUser: UserProfile | null;
  coinBalance: number;
  isOffline: boolean;
  onBack: () => void;
  onOpenAuth: () => void;
}

/* Fair multi-step multiplier: product of remaining safe tiles, scaled by 0.97 house edge. */
function multiplierAt(revealed: number): number {
  let m = 1;
  for (let i = 0; i < revealed; i += 1) {
    m *= (TILE_COUNT - i) / (TILE_COUNT - MINE_COUNT - i);
  }
  return Math.round(m * 0.97 * 100) / 100;
}

function pickMines(): Set<number> {
  const mines = new Set<number>();
  while (mines.size < MINE_COUNT) {
    mines.add(Math.floor(randomUnit() * TILE_COUNT));
  }
  return mines;
}

export const MinesView: React.FC<Props> = ({
  currentUser,
  coinBalance,
  isOffline,
  onBack,
  onOpenAuth,
}) => {
  const [stake, setStake] = useState<number>(100);
  const [phase, setPhase] = useState<Phase>('idle');
  const [revealed, setRevealed] = useState<number[]>([]);
  const [bustedTile, setBustedTile] = useState<number | null>(null);
  const [minesShown, setMinesShown] = useState<number[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const userRef = useRef(currentUser);
  userRef.current = currentUser;
  const roundRef = useRef<{
    id: string;
    stake: number;
    mines: Set<number>;
    revealed: number[];
    settled: boolean;
  } | null>(null);

  useEffect(() => {
    if (!currentUser) return;
    setHistory(loadArcadeHistory<HistoryEntry>(`mn_history_${currentUser.uid}`));
    void flushArcadeCredits(currentUser.uid);
  }, [currentUser]);

  const settle = (
    onScreen: boolean,
    outcome: 'busted' | 'cashed',
    bustTile: number | null = null
  ) => {
    const info = roundRef.current;
    const uid = userRef.current?.uid;
    if (!info || !uid || info.settled) return;
    info.settled = true;
    const payout =
      outcome === 'cashed' && info.revealed.length > 0
        ? capPayout(Math.round(info.stake * multiplierAt(info.revealed.length)))
        : 0;
    if (payout > 0) {
      creditArcade(
        uid,
        payout,
        `Mines ${info.id} · ${info.revealed.length} gems`,
        `mn-${info.id}-w`
      );
    }
    const entry: HistoryEntry = {
      id: info.id,
      at: Date.now(),
      stake: info.stake,
      revealed: info.revealed.length,
      payout,
    };
    if (onScreen) {
      setBustedTile(bustTile);
      setMinesShown(Array.from(info.mines));
      setPhase(outcome);
      setHistory((prev) => {
        const next = [entry, ...prev].slice(0, 40);
        saveArcadeHistory(`mn_history_${uid}`, next);
        return next;
      });
    } else {
      const list = loadArcadeHistory<HistoryEntry>(`mn_history_${uid}`);
      saveArcadeHistory(`mn_history_${uid}`, [entry, ...list].slice(0, 40));
    }
  };

  // Leaving mid-round: cash out whatever is already revealed; a fresh round refunds.
  useEffect(
    () => () => {
      const info = roundRef.current;
      const uid = userRef.current?.uid;
      if (!info || info.settled || !uid) return;
      if (info.revealed.length > 0) {
        settle(false, 'cashed');
      } else {
        info.settled = true;
        creditArcade(uid, info.stake, `Mines refund ${info.id}`, `mn-${info.id}-r`);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const start = async () => {
    if (!currentUser || busy || phase === 'running' || isOffline) return;
    if (coinBalance < stake) {
      setError('Not enough Coins to start.');
      return;
    }
    setBusy(true);
    setError(null);
    const id = newRoundId('MN');
    try {
      await arcadeDebit(currentUser.uid, stake, `Mines stake ${id}`, `mn-${id}-s`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start the round.');
      setBusy(false);
      return;
    }
    setBusy(false);
    roundRef.current = {
      id,
      stake,
      mines: pickMines(),
      revealed: [],
      settled: false,
    };
    setRevealed([]);
    setBustedTile(null);
    setMinesShown([]);
    setPhase('running');
  };

  const tapTile = (index: number) => {
    const info = roundRef.current;
    if (!info || phase !== 'running' || info.settled) return;
    if (info.revealed.includes(index)) return;
    if (info.mines.has(index)) {
      info.revealed = [...info.revealed, index];
      setRevealed(info.revealed);
      settle(true, 'busted', index);
      return;
    }
    info.revealed = [...info.revealed, index];
    setRevealed(info.revealed);
    setError(null);
  };

  const cashOut = () => {
    const info = roundRef.current;
    if (!info || phase !== 'running' || info.revealed.length === 0) return;
    settle(true, 'cashed');
  };

  const reset = () => {
    roundRef.current = null;
    setPhase('idle');
    setRevealed([]);
    setBustedTile(null);
    setMinesShown([]);
    setError(null);
  };

  const liveMultiplier = revealed.length > 0 ? multiplierAt(revealed.length) : 1;
  const livePayout = capPayout(Math.round(stake * liveMultiplier));
  const nextMultiplier =
    revealed.length < TILE_COUNT - MINE_COUNT ? multiplierAt(revealed.length + 1) : liveMultiplier;

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
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-lime-300 via-emerald-500 to-teal-600 ring-1 ring-white/25 shadow-lg shadow-emerald-500/40">
              <Bomb className="w-[18px] h-[18px] text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]" />
            </span>
            <span>Mines</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            20 tiles, 3 mines. Reveal gems and cash out before you hit one.
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
        <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-br from-emerald-600/20 via-[#111420] to-teal-600/15 p-8 text-center space-y-4">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-lime-300 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <Bomb className="w-7 h-7 text-white" />
          </div>
          <h2 className="font-display text-xl font-bold text-white">Sign in to play</h2>
          <p className="text-sm text-slate-400 max-w-sm mx-auto">
            Mines runs on AddaBuzz Coins — sign in to step onto the board.
          </p>
          <button
            type="button"
            onClick={onOpenAuth}
            className="px-6 py-2.5 rounded-full bg-gradient-to-r from-lime-400 to-teal-500 text-emerald-950 text-sm font-semibold inline-flex items-center gap-2 shadow-lg shadow-emerald-900/40"
          >
            <LogIn className="w-4 h-4" /> Sign In
          </button>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr] items-start">
          <section className="relative overflow-hidden rounded-3xl border border-emerald-300/20 bg-[linear-gradient(160deg,rgba(8,44,32,0.95),rgba(8,12,20,0.98)_55%,rgba(8,30,34,0.98))] p-4 sm:p-5">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full bg-[radial-gradient(closest-side,rgba(16,185,129,0.28),transparent)] blur-2xl"
            />
            <div className="relative flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/25 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-200">
                {phase === 'running'
                  ? `${revealed.length} gems found`
                  : phase === 'busted'
                  ? 'Mine hit'
                  : phase === 'cashed'
                  ? 'Cashed out'
                  : 'Ready'}
              </span>
              <span className="font-mono text-xs font-bold text-slate-300">
                Next ×{nextMultiplier.toFixed(2)}
              </span>
            </div>

            <div className="relative mt-4 grid grid-cols-5 gap-1.5 sm:gap-2">
              {Array.from({ length: TILE_COUNT }, (_, i) => {
                const isRevealed = revealed.includes(i);
                const isMine = minesShown.includes(i);
                const isBust = bustedTile === i;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => tapTile(i)}
                    disabled={phase !== 'running' || isRevealed}
                    className={`grid aspect-square place-items-center rounded-xl border transition-all duration-200 ${
                      isBust
                        ? 'border-rose-400/60 bg-gradient-to-br from-rose-500/40 to-rose-900/40'
                        : isMine
                        ? 'border-rose-400/30 bg-rose-500/10'
                        : isRevealed
                        ? 'border-emerald-300/40 bg-gradient-to-br from-emerald-400/25 to-teal-600/20'
                        : 'border-white/10 bg-white/[0.04] hover:bg-white/[0.09] hover:border-emerald-300/30 disabled:hover:bg-white/[0.04]'
                    }`}
                  >
                    {isBust ? (
                      <Bomb className="h-5 w-5 text-rose-200" />
                    ) : isMine ? (
                      <Bomb className="h-4 w-4 text-rose-300/60" />
                    ) : isRevealed ? (
                      <Gem className="h-5 w-5 text-emerald-200" />
                    ) : (
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-600" />
                    )}
                  </button>
                );
              })}
            </div>

            {error && (
              <p className="relative mt-3 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-200">
                {error}
              </p>
            )}

            <div className="relative mt-4 space-y-3">
              {phase !== 'running' && (
                <div className="flex gap-2">
                  {ARCADE_CHIPS.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setStake(chip)}
                      className={`flex-1 h-10 rounded-xl border font-mono text-xs font-bold tabular-nums transition-all ${
                        stake === chip
                          ? 'border-emerald-300/60 bg-gradient-to-b from-emerald-400/30 to-teal-600/20 text-emerald-100'
                          : 'border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]'
                      }`}
                    >
                      {fmtCoins(chip)}
                    </button>
                  ))}
                </div>
              )}
              {phase === 'running' ? (
                <button
                  type="button"
                  onClick={cashOut}
                  disabled={revealed.length === 0}
                  className="w-full h-12 rounded-2xl bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-600 text-emerald-950 text-sm font-black inline-flex items-center justify-center gap-2 shadow-[0_16px_36px_-14px_rgba(16,185,129,0.9)] ring-1 ring-white/25 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.99] transition-transform"
                >
                  <ShieldCheck className="w-4 h-4" />
                  {revealed.length === 0
                    ? 'Reveal a tile first'
                    : `Cash out ×${liveMultiplier.toFixed(2)} · ${fmtCoins(livePayout)}`}
                </button>
              ) : phase === 'idle' ? (
                <button
                  type="button"
                  onClick={() => void start()}
                  disabled={busy || isOffline}
                  className="w-full h-12 rounded-2xl bg-gradient-to-r from-lime-400 via-emerald-500 to-teal-600 text-emerald-950 text-sm font-bold inline-flex items-center justify-center gap-2 shadow-[0_16px_36px_-14px_rgba(16,185,129,0.9)] ring-1 ring-white/20 disabled:opacity-45 disabled:cursor-not-allowed active:scale-[0.99] transition-transform"
                >
                  <Bomb className="w-4 h-4" />
                  {busy ? 'Starting…' : `Start round · ${fmtCoins(stake)}`}
                </button>
              ) : (
                <div className="space-y-2">
                  <div
                    className={`rounded-xl px-3 py-2 text-center text-[11px] font-semibold ${
                      phase === 'cashed'
                        ? 'border border-emerald-400/30 bg-emerald-500/10 text-emerald-200'
                        : 'border border-rose-400/30 bg-rose-500/10 text-rose-200'
                    }`}
                  >
                    {phase === 'cashed'
                      ? `Cashed out ${fmtCoins(livePayout)} Coins with ${revealed.length} gems`
                      : `Boom! Stake lost after ${Math.max(0, revealed.length - 1)} safe gems`}
                  </div>
                  <button
                    type="button"
                    onClick={reset}
                    className="w-full h-12 rounded-2xl border border-white/10 bg-white/[0.06] hover:bg-white/[0.1] text-slate-200 text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors"
                  >
                    <Sparkles className="w-4 h-4" /> New board
                  </button>
                </div>
              )}
              {isOffline && (
                <p className="text-center text-[10px] font-medium text-emerald-300/80">
                  Offline — reconnecting before the next round.
                </p>
              )}
            </div>
          </section>

          <aside className="space-y-4">
            <section className="rounded-3xl border border-white/[0.07] bg-[#111420] p-4 sm:p-5">
              <h2 className="font-display text-sm font-semibold text-white">Gem payouts</h2>
              <div className="mt-3 grid grid-cols-4 gap-1.5 text-center">
                {[1, 2, 3, 4].map((n) => (
                  <div
                    key={n}
                    className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-1.5 py-1.5"
                  >
                    <p className="text-[9px] text-slate-400">{n} gems</p>
                    <p className="font-mono text-[11px] font-bold text-emerald-300">
                      ×{multiplierAt(n).toFixed(2)}
                    </p>
                  </div>
                ))}
                <div className="col-span-4 rounded-xl border border-white/[0.06] bg-white/[0.03] px-2 py-1.5">
                  <p className="text-[9px] text-slate-400">
                    10 gems pays ×{multiplierAt(10).toFixed(2)} · every gem pushes the multiplier higher
                  </p>
                </div>
              </div>
              <p className="mt-3 text-[10px] leading-relaxed text-slate-500">
                3 of 20 tiles hide mines. Cash out any time after the first gem.
              </p>
            </section>

            <section className="rounded-3xl border border-white/[0.07] bg-[#111420] p-4 sm:p-5">
              <h2 className="font-display text-sm font-semibold text-white">Recent rounds</h2>
              {history.length === 0 ? (
                <p className="mt-3 text-[11px] text-slate-500">
                  No rounds yet — your gem runs will show up here.
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
                        {h.revealed} gems · {fmtCoins(h.stake)}
                      </span>
                      <span
                        className={`font-mono font-bold tabular-nums ${
                          h.payout > 0 ? 'text-emerald-300' : 'text-rose-300'
                        }`}
                      >
                        {h.payout > 0 ? `+${fmtCoins(h.payout)}` : '0'}
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
