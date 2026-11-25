import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Coins,
  Crown,
  Flame,
  LogIn,
  RotateCcw,
  Sparkles,
  Swords,
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

type Side = 'HEADS' | 'TAILS';
type Phase = 'idle' | 'flipping' | 'result';

interface HistoryEntry {
  id: string;
  at: number;
  stake: number;
  side: Side;
  result: Side;
  win: boolean;
  payout: number;
}

interface Result {
  result: Side;
  win: boolean;
  payout: number;
}

interface CoinFlipViewProps {
  currentUser: UserProfile | null;
  coinBalance: number;
  isOffline: boolean;
  onBack: () => void;
  onOpenAuth: () => void;
}

const WIN_MULTIPLIER = 1.96;

export const CoinFlipView: React.FC<CoinFlipViewProps> = ({
  currentUser,
  coinBalance,
  isOffline,
  onBack,
  onOpenAuth,
}) => {
  const [stake, setStake] = useState<number>(100);
  const [side, setSide] = useState<Side>('HEADS');
  const [phase, setPhase] = useState<Phase>('idle');
  const [round, setRound] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [streak, setStreak] = useState(0);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const timerRef = useRef<number | null>(null);
  const stakeRef = useRef(stake);
  const sideRef = useRef(side);
  stakeRef.current = stake;
  sideRef.current = side;
  const userRef = useRef(currentUser);
  userRef.current = currentUser;
  const flippingRef = useRef<{ id: string; stake: number; side: Side } | null>(null);

  useEffect(() => {
    if (!currentUser) return;
    setHistory(loadArcadeHistory<HistoryEntry>(`cf_history_${currentUser.uid}`));
    void flushArcadeCredits(currentUser.uid);
  }, [currentUser]);

  const recordHistory = (entry: HistoryEntry) => {
    if (!currentUser) return;
    const next = [entry, ...history].slice(0, 40);
    setHistory(next);
    saveArcadeHistory(`cf_history_${currentUser.uid}`, next);
  };

  // Resolves the flip even if the player leaves the page mid-spin.
  const completeFlip = (info: { id: string; stake: number; side: Side; onScreen: boolean }) => {
    const uid = userRef.current?.uid;
    if (!uid) return;
    const landing: Side = randomUnit() < 0.5 ? 'HEADS' : 'TAILS';
    const win = landing === info.side;
    const payout = win ? Math.round(info.stake * WIN_MULTIPLIER) : 0;
    if (win) {
      creditArcade(
        uid,
        payout,
        `Coin Flip Arena win ${info.id} · ${landing}`,
        `cf-${info.id}-w`
      );
    }
    const entry: HistoryEntry = {
      id: info.id,
      at: Date.now(),
      stake: info.stake,
      side: info.side,
      result: landing,
      win,
      payout,
    };
    if (info.onScreen) {
      setResult({ result: landing, win, payout });
      setPhase('result');
      setStreak((s) => (win ? s + 1 : 0));
      recordHistory(entry);
    } else {
      const list = loadArcadeHistory<HistoryEntry>(`cf_history_${uid}`);
      saveArcadeHistory(`cf_history_${uid}`, [entry, ...list].slice(0, 40));
    }
  };

  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      const info = flippingRef.current;
      if (info) {
        flippingRef.current = null;
        completeFlip({ ...info, onScreen: false });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const flip = async () => {
    if (!currentUser || busy || phase === 'flipping' || isOffline) return;
    if (coinBalance < stake) {
      setError('Not enough Coins for this stake.');
      return;
    }
    setBusy(true);
    setError(null);
    setResult(null);
    const id = newRoundId('CF');
    try {
      await arcadeDebit(currentUser.uid, stake, `Coin Flip Arena stake ${id}`, `cf-${id}-s`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not place the flip.');
      setBusy(false);
      return;
    }
    setBusy(false);
    setRound(id);
    setPhase('flipping');
    flippingRef.current = { id, stake: stakeRef.current, side: sideRef.current };

    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      const info = flippingRef.current;
      if (!info) return;
      flippingRef.current = null;
      completeFlip({ ...info, onScreen: true });
    }, 1350);
  };

  const reset = () => {
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
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-yellow-200 via-amber-400 to-orange-500 ring-1 ring-white/25 shadow-lg shadow-amber-400/40">
              <Swords className="w-[18px] h-[18px] text-amber-950" />
            </span>
            <span>Coin Flip Arena</span>
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
        <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-br from-amber-600/20 via-[#111420] to-sky-600/15 p-8 text-center space-y-4">
          <div className="mx-auto w-14 h-14 rounded-full bg-gradient-to-br from-yellow-200 via-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
            <Crown className="w-7 h-7 text-amber-950" />
          </div>
          <h2 className="font-display text-xl font-bold text-white">Sign in to flip</h2>
          <p className="text-sm text-slate-400 max-w-sm mx-auto">
            Coin Flip Arena runs on AddaBuzz Coins — sign in to call your first coin.
          </p>
          <button
            type="button"
            onClick={onOpenAuth}
            className="px-6 py-2.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-amber-950 text-sm font-semibold inline-flex items-center gap-2 shadow-lg shadow-amber-900/40"
          >
            <LogIn className="w-4 h-4" /> Sign In
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <section className="relative overflow-hidden rounded-3xl border border-amber-300/20 bg-[linear-gradient(160deg,rgba(46,32,8,0.95),rgba(18,13,7,0.98)_55%,rgba(24,16,10,0.98))] p-3.5 sm:p-4">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-[radial-gradient(closest-side,rgba(245,158,11,0.3),transparent)] blur-2xl"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -left-16 bottom-[-50px] h-44 w-44 rounded-full bg-[radial-gradient(closest-side,rgba(56,189,248,0.2),transparent)] blur-2xl"
            />

            <div className="relative flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/25 bg-amber-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-200">
                <Flame className="h-3 w-3" /> Streak {streak}
              </span>
              <span className="text-[10px] font-semibold text-slate-400">
                Your call:{' '}
                <span className={side === 'HEADS' ? 'text-amber-300' : 'text-sky-300'}>{side}</span>
              </span>
            </div>

            <div className="relative mt-3 flex flex-col items-center">
              <div
                className={`relative grid h-28 w-28 place-items-center rounded-full bg-gradient-to-br from-yellow-200 via-amber-400 to-orange-500 shadow-[0_24px_60px_-18px_rgba(245,158,11,0.75)] ring-4 ring-amber-200/30 ${
                  phase === 'flipping' ? 'cf-coin-flip' : ''
                }`}
              >
                <div className="absolute inset-2 rounded-full border-2 border-dashed border-amber-700/30" />
                <div className="absolute inset-5 rounded-full bg-gradient-to-br from-amber-300/60 to-orange-500/40 shadow-inner" />
                {result && phase === 'result' ? (
                  <div className="relative text-center">
                    <p className="font-display text-2xl font-black text-amber-950">
                      {result.result === 'HEADS' ? 'H' : 'T'}
                    </p>
                    <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-amber-900/80">
                      {result.result}
                    </p>
                  </div>
                ) : (
                  <Crown className="relative w-10 h-10 text-amber-950/90 drop-shadow" />
                )}
              </div>

              <p
                className={`mt-3 font-display text-base font-bold ${
                  phase === 'result'
                    ? result?.win
                      ? 'text-emerald-300'
                      : 'text-rose-300'
                    : 'text-slate-200'
                }`}
              >
                {phase === 'flipping'
                  ? 'Flipping…'
                  : phase === 'result' && result
                  ? result.win
                    ? `${result.result} — you won ${fmtCoins(result.payout)}`
                    : `${result.result} — better luck next flip`
                  : 'Pick a side and flip'}
              </p>
              {phase === 'result' && result && !result.win && (
                <p className="mt-1 text-[11px] text-slate-400">−{fmtCoins(stake)} coins</p>
              )}
              {phase === 'result' && result?.win && (
                <p className="mt-1 text-[11px] text-slate-400">
                  +{fmtCoins(result.payout - stake)} coins net
                </p>
              )}
            </div>

            {error && (
              <p className="relative mt-4 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-200">
                {error}
              </p>
            )}

            <div className="relative mt-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSide('HEADS')}
                  disabled={phase === 'flipping'}
                  className={`h-10 rounded-2xl border text-sm font-bold inline-flex items-center justify-center gap-2 transition-all disabled:opacity-50 ${
                    side === 'HEADS'
                      ? 'border-amber-300/60 bg-gradient-to-b from-amber-400/35 to-amber-600/20 text-amber-100 shadow-[0_10px_26px_-12px_rgba(245,158,11,0.9)]'
                      : 'border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]'
                  }`}
                >
                  <Crown className="w-4 h-4" /> Heads
                </button>
                <button
                  type="button"
                  onClick={() => setSide('TAILS')}
                  disabled={phase === 'flipping'}
                  className={`h-10 rounded-2xl border text-sm font-bold inline-flex items-center justify-center gap-2 transition-all disabled:opacity-50 ${
                    side === 'TAILS'
                      ? 'border-sky-300/60 bg-gradient-to-b from-sky-400/35 to-blue-600/20 text-sky-100 shadow-[0_10px_26px_-12px_rgba(56,189,248,0.9)]'
                      : 'border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]'
                  }`}
                >
                  <Sparkles className="w-4 h-4" /> Tails
                </button>
              </div>

              {phase !== 'result' ? (
                <>
                  <div className="flex gap-2">
                    {ARCADE_CHIPS.map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => setStake(chip)}
                        disabled={phase === 'flipping'}
                        className={`flex-1 h-8 rounded-xl border font-mono text-xs font-bold tabular-nums transition-all disabled:opacity-50 ${
                          stake === chip
                            ? 'border-amber-300/60 bg-gradient-to-b from-amber-400/30 to-amber-600/20 text-amber-100'
                            : 'border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]'
                        }`}
                      >
                        {fmtCoins(chip)}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => void flip()}
                    disabled={busy || phase === 'flipping' || isOffline}
                    className="w-full h-11 rounded-2xl bg-gradient-to-r from-yellow-300 via-amber-400 to-orange-500 text-amber-950 text-sm font-bold inline-flex items-center justify-center gap-2 shadow-[0_16px_36px_-14px_rgba(245,158,11,0.95)] ring-1 ring-white/25 disabled:opacity-45 disabled:cursor-not-allowed active:scale-[0.99] transition-transform"
                  >
                    <Coins className="w-4 h-4" />
                    {phase === 'flipping' ? 'Flipping…' : `Flip for ${fmtCoins(stake)}`}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={reset}
                  className="w-full h-11 rounded-2xl border border-white/10 bg-white/[0.06] hover:bg-white/[0.1] text-slate-200 text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" /> Flip again
                </button>
              )}

              {isOffline && (
                <p className="text-center text-[10px] font-medium text-amber-300/80">
                  Offline — reconnecting before the next flip.
                </p>
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-white/[0.07] bg-[#111420] p-3.5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xs font-semibold text-white">Recent flips</h2>
              {streak > 0 && (
                <span className="text-[10px] font-bold text-amber-300">Streak {streak}</span>
              )}
            </div>
            {history.length === 0 ? (
              <p className="mt-2 text-[11px] text-slate-500">
                No flips yet — your calls will show up here.
              </p>
            ) : (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {history.slice(0, 12).map((h) => (
                  <span
                    key={h.id + h.at}
                    className={`grid h-6 w-6 place-items-center rounded-full border text-[9px] font-black ${
                      h.win
                        ? 'border-emerald-300/40 bg-emerald-400/15 text-emerald-300'
                        : 'border-rose-300/40 bg-rose-500/15 text-rose-300'
                    }`}
                  >
                    {h.result === 'HEADS' ? 'H' : 'T'}
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
