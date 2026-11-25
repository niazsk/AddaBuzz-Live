import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  CircleArrowDown,
  Coins,
  LogIn,
  Sparkles,
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
  randomUnit,
  saveArcadeHistory,
} from '../../games/arcade/wallet';

const ROWS = 8;
const SLOT_MULTIPLIERS = [5, 2.2, 1.3, 0.8, 0.4, 0.8, 1.3, 2.2, 5];

type Phase = 'idle' | 'dropping' | 'result';

interface HistoryEntry {
  id: string;
  at: number;
  stake: number;
  slot: number;
  multiplier: number;
  payout: number;
}

interface DropResult {
  slot: number;
  multiplier: number;
  payout: number;
}

interface PlinkoViewProps {
  currentUser: UserProfile | null;
  coinBalance: number;
  isOffline: boolean;
  onBack: () => void;
  onOpenAuth: () => void;
}

function slotTone(multiplier: number): string {
  if (multiplier >= 5) return 'from-amber-300 to-orange-500 text-amber-950';
  if (multiplier >= 2) return 'from-emerald-300 to-teal-500 text-emerald-950';
  if (multiplier >= 1) return 'from-sky-300 to-blue-500 text-sky-950';
  if (multiplier >= 0.7) return 'from-slate-300 to-slate-500 text-slate-900';
  return 'from-rose-300 to-rose-500 text-rose-950';
}

export const PlinkoView: React.FC<PlinkoViewProps> = ({
  currentUser,
  coinBalance,
  isOffline,
  onBack,
  onOpenAuth,
}) => {
  const [stake, setStake] = useState<number>(100);
  const [phase, setPhase] = useState<Phase>('idle');
  const [result, setResult] = useState<DropResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const ballRef = useRef<HTMLDivElement>(null);
  const userRef = useRef(currentUser);
  userRef.current = currentUser;
  const roundRef = useRef<{
    id: string;
    stake: number;
    slot: number;
    payout: number;
    settled: boolean;
  } | null>(null);

  useEffect(() => {
    if (!currentUser) return;
    setHistory(loadArcadeHistory<HistoryEntry>(`pl_history_${currentUser.uid}`));
    void flushArcadeCredits(currentUser.uid);
  }, [currentUser]);

  const finalize = (onScreen: boolean) => {
    const info = roundRef.current;
    const uid = userRef.current?.uid;
    if (!info || !uid || info.settled) return;
    info.settled = true;
    const multiplier = SLOT_MULTIPLIERS[info.slot];
    if (info.payout > 0) {
      creditArcade(
        uid,
        info.payout,
        `Plinko Drop ${info.id} · slot x${multiplier}`,
        `pl-${info.id}-w`
      );
    }
    const entry: HistoryEntry = {
      id: info.id,
      at: Date.now(),
      stake: info.stake,
      slot: info.slot,
      multiplier,
      payout: info.payout,
    };
    if (onScreen) {
      setResult({ slot: info.slot, multiplier, payout: info.payout });
      setPhase('result');
      setHistory((prev) => {
        const next = [entry, ...prev].slice(0, 40);
        saveArcadeHistory(`pl_history_${uid}`, next);
        return next;
      });
    } else {
      const list = loadArcadeHistory<HistoryEntry>(`pl_history_${uid}`);
      saveArcadeHistory(`pl_history_${uid}`, [entry, ...list].slice(0, 40));
    }
  };

  // Leaving mid-drop still settles the ball, so the stake is never lost silently.
  useEffect(
    () => () => {
      const info = roundRef.current;
      if (info && !info.settled) finalize(false);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const drop = async () => {
    if (!currentUser || busy || phase === 'dropping' || isOffline) return;
    if (coinBalance < stake) {
      setError('Not enough Coins for this drop.');
      return;
    }
    setBusy(true);
    setError(null);
    setResult(null);
    const id = newRoundId('PL');
    try {
      await arcadeDebit(currentUser.uid, stake, `Plinko Drop stake ${id}`, `pl-${id}-s`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not drop the ball.');
      setBusy(false);
      return;
    }
    setBusy(false);

    let rights = 0;
    for (let i = 0; i < ROWS; i += 1) {
      if (randomUnit() < 0.5) rights += 1;
    }
    const slot = rights;
    const multiplier = SLOT_MULTIPLIERS[slot];
    roundRef.current = {
      id,
      stake,
      slot,
      payout: Math.round(stake * multiplier),
      settled: false,
    };
    setPhase('dropping');

    window.requestAnimationFrame(() => {
      const ball = ballRef.current;
      if (!ball) {
        finalize(true);
        return;
      }
      let pathRights = 0;
      const keyframes: Keyframe[] = [{ left: '50%', top: '0%' }];
      const targetRights: number[] = [];
      let remaining = slot;
      for (let r = 0; r < ROWS; r += 1) {
        targetRights.push(remaining > 0 ? 1 : 0);
        if (remaining > 0) remaining -= 1;
      }
      for (let r = 1; r <= ROWS; r += 1) {
        pathRights += targetRights[r - 1];
        const x = 50 + (pathRights - r / 2) * 11;
        const y = (r / ROWS) * 88;
        keyframes.push({ left: `${x}%`, top: `${y}%` });
      }
      const animation = ball.animate(keyframes, {
        duration: 150 + ROWS * 120,
        easing: 'cubic-bezier(0.35, 0.6, 0.45, 1)',
        fill: 'forwards',
      });
      animation.finished
        .then(() => {
          window.setTimeout(() => finalize(true), 120);
        })
        .catch(() => finalize(true));
    });
  };

  const reset = () => {
    roundRef.current = null;
    setPhase('idle');
    setResult(null);
    setError(null);
  };

  return (
    <div className="mx-auto w-full max-w-md space-y-3 pb-10">
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
          <h1 className="font-display text-xl font-bold leading-tight inline-flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-cyan-300 via-sky-500 to-indigo-600 ring-1 ring-white/25 shadow-lg shadow-sky-500/40">
              <CircleArrowDown className="w-[18px] h-[18px] text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]" />
            </span>
            <span>Plinko Drop</span>
          </h1>
        </div>
        <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-amber-300/25 bg-amber-400/[0.08] px-2.5 py-1.5">
          <Coins className="h-3.5 w-3.5 text-amber-300" />
          <span className="font-mono text-xs font-black tabular-nums text-amber-300">
            {fmtCoins(coinBalance)}
          </span>
        </span>
      </div>

      {!currentUser ? (
        <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-br from-sky-600/20 via-[#111420] to-indigo-600/15 p-8 text-center space-y-4">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-300 to-indigo-500 flex items-center justify-center shadow-lg shadow-sky-500/30">
            <CircleArrowDown className="w-7 h-7 text-white" />
          </div>
          <h2 className="font-display text-xl font-bold text-white">Sign in to drop</h2>
          <p className="text-sm text-slate-400 max-w-sm mx-auto">
            Plinko Drop runs on AddaBuzz Coins — sign in to release your first ball.
          </p>
          <button
            type="button"
            onClick={onOpenAuth}
            className="px-6 py-2.5 rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500 text-white text-sm font-semibold inline-flex items-center gap-2 shadow-lg shadow-sky-900/40"
          >
            <LogIn className="w-4 h-4" /> Sign In
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <section className="relative overflow-hidden rounded-3xl border border-sky-300/20 bg-[linear-gradient(160deg,rgba(10,40,64,0.95),rgba(8,12,24,0.98)_55%,rgba(12,14,30,0.98))] p-4">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-14 -top-14 h-48 w-48 rounded-full bg-[radial-gradient(closest-side,rgba(56,189,248,0.28),transparent)] blur-2xl"
            />
            <div className="relative flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-300/25 bg-sky-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-sky-200">
                {phase === 'dropping' ? 'Ball in play' : phase === 'result' ? 'Landed' : 'Ready'}
              </span>
              {result && phase === 'result' && (
                <span className="font-mono text-xs font-bold text-slate-300">
                  x{result.multiplier} · {result.payout > 0 ? `+${fmtCoins(result.payout)}` : '0'}
                </span>
              )}
            </div>

            <div className="relative mt-3 h-40 overflow-hidden rounded-2xl border border-white/[0.07] bg-[#070B14]">
              <div
                aria-hidden="true"
                className="absolute inset-0 opacity-50"
                style={{
                  backgroundImage:
                    'radial-gradient(circle, rgba(148,163,184,0.45) 1.6px, transparent 2.4px)',
                  backgroundSize: '30px 26px',
                  backgroundPosition: '15px 26px',
                }}
              />
              <div
                ref={ballRef}
                className={`absolute z-10 h-4 w-4 -translate-x-1/2 rounded-full bg-gradient-to-br from-cyan-200 via-sky-400 to-indigo-600 shadow-[0_0_14px_rgba(56,189,248,0.9)] ring-1 ring-white/50 ${
                  phase === 'idle' ? 'opacity-0' : 'opacity-100'
                }`}
                style={{ left: '50%', top: '0%' }}
              />
            </div>

            <div className="relative mt-1.5 grid grid-cols-9 gap-1">
              {SLOT_MULTIPLIERS.map((m, idx) => (
                <div
                  key={idx}
                  className={`grid h-6 place-items-center rounded-lg bg-gradient-to-b text-[9px] font-black ${
                    slotTone(m)
                  } ${
                    phase === 'result' && result?.slot === idx
                      ? 'ring-2 ring-white/70 scale-105'
                      : 'opacity-90'
                  } transition-transform`}
                >
                  {m}
                </div>
              ))}
            </div>

            {error && (
              <p className="relative mt-3 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-200">
                {error}
              </p>
            )}

            <div className="relative mt-3 space-y-2.5">
              <div className="flex gap-2">
                {ARCADE_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setStake(chip)}
                    disabled={phase === 'dropping'}
                    className={`flex-1 h-8 rounded-xl border font-mono text-xs font-bold tabular-nums transition-all disabled:opacity-50 ${
                      stake === chip
                        ? 'border-sky-300/60 bg-gradient-to-b from-sky-400/30 to-indigo-600/20 text-sky-100'
                        : 'border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]'
                    }`}
                  >
                    {fmtCoins(chip)}
                  </button>
                ))}
              </div>
              {phase !== 'result' ? (
                <button
                  type="button"
                  onClick={() => void drop()}
                  disabled={busy || phase === 'dropping' || isOffline}
                  className="w-full h-11 rounded-2xl bg-gradient-to-r from-cyan-400 via-sky-500 to-indigo-600 text-white text-sm font-bold inline-flex items-center justify-center gap-2 shadow-[0_16px_36px_-14px_rgba(56,189,248,0.9)] ring-1 ring-white/20 disabled:opacity-45 disabled:cursor-not-allowed active:scale-[0.99] transition-transform"
                >
                  <CircleArrowDown className="w-4 h-4" />
                  {phase === 'dropping' ? 'Dropping…' : `Drop ball · ${fmtCoins(stake)}`}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={reset}
                  className="w-full h-11 rounded-2xl border border-white/10 bg-white/[0.06] hover:bg-white/[0.1] text-slate-200 text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors"
                >
                  <Sparkles className="w-4 h-4" /> Drop again
                </button>
              )}
              {isOffline && (
                <p className="text-center text-[10px] font-medium text-sky-300/80">
                  Offline — reconnecting before the next drop.
                </p>
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-white/[0.07] bg-[#111420] p-3.5">
            <h2 className="font-display text-xs font-semibold text-white">Recent drops</h2>
            {history.length === 0 ? (
              <p className="mt-2 text-[11px] text-slate-500">
                No drops yet — your landings will show up here.
              </p>
            ) : (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {history.slice(0, 10).map((h) => (
                  <span
                    key={h.id + h.at}
                    className={`rounded-lg border px-1.5 py-1 font-mono text-[10px] font-bold ${
                      h.multiplier >= 1
                        ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300'
                        : 'border-rose-400/30 bg-rose-500/10 text-rose-300'
                    }`}
                  >
                    x{h.multiplier}
                  </span>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
};
