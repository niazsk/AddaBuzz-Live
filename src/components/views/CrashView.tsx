import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Coins,
  Flame,
  LogIn,
  Rocket,
  TrendingUp,
} from 'lucide-react';
import { UserProfile } from '../../types/app';
import { ARCADE_CHIPS, fmtCoins } from '../../games/arcade/wallet';
import { SharedCrashEngine } from '../../games/arcade/crashEngine';

interface Props {
  currentUser: UserProfile | null;
  coinBalance: number;
  isOffline: boolean;
  onBack: () => void;
  onOpenAuth: () => void;
}

export const CrashView: React.FC<Props> = ({
  currentUser,
  coinBalance,
  isOffline,
  onBack,
  onOpenAuth,
}) => {
  const [stake, setStake] = useState<number>(100);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const engineRef = useRef<SharedCrashEngine | null>(null);
  const [snap, setSnap] = useState<ReturnType<SharedCrashEngine['getSnapshot']> | null>(null);

  const uid = currentUser?.uid ?? null;
  const username = currentUser?.displayName || currentUser?.username || 'Player';

  useEffect(() => {
    if (!uid) return;
    const engine = new SharedCrashEngine(uid, username);
    engineRef.current = engine;
    setSnap(engine.getSnapshot());
    const unsub = engine.subscribe(() => setSnap(engine.getSnapshot()));
    return () => {
      unsub();
      engine.destroy();
      if (engineRef.current === engine) engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  const phase = snap?.phase || 'SCHEDULED';
  const multiplier = snap?.currentMultiplier || 1.0;
  const countdown = snap?.countdownLeft || 0;
  const recent = snap?.recentResults || [];
  const myBet = snap?.myBet && snap.myBet.roundId === snap.board?.roundId ? snap.myBet : null;
  const roundSeq = snap?.board?.seq || 1;

  const handleBet = async () => {
    if (!currentUser) {
      onOpenAuth();
      return;
    }
    const engine = engineRef.current;
    if (!engine) return;
    if (stake > coinBalance) {
      setError('Not enough Coins for this bet.');
      return;
    }
    setError(null);
    setBusy(true);
    const res = await engine.placeBet(stake);
    setBusy(false);
    if (!res.ok) setError(res.reason || 'Could not place bet.');
  };

  const handleCashout = async () => {
    const engine = engineRef.current;
    if (!engine) return;
    setError(null);
    setBusy(true);
    const res = await engine.cashOut();
    setBusy(false);
    if (!res.ok) setError(res.reason || 'Cashout failed.');
  };

  const canBet = phase === 'SCHEDULED' && !myBet;
  const canCash = phase === 'RUNNING' && myBet?.status === 'ACCEPTED';

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
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-rose-300 via-pink-500 to-fuchsia-600 ring-1 ring-white/25 shadow-lg shadow-rose-500/40">
              <Rocket className="w-[18px] h-[18px] text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]" />
            </span>
            <span>Crash Rocket</span>
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
        <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-br from-rose-600/20 via-[#111420] to-fuchsia-600/15 p-8 text-center space-y-4">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-300 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-rose-500/30">
            <Rocket className="w-7 h-7 text-white" />
          </div>
          <h2 className="font-display text-xl font-bold text-white">Sign in to launch</h2>
          <p className="text-sm text-slate-400 max-w-sm mx-auto">
            Crash Rocket runs on AddaBuzz Coins — sign in to board the next flight.
          </p>
          <button
            type="button"
            onClick={onOpenAuth}
            className="px-6 py-2.5 rounded-full bg-gradient-to-r from-rose-400 to-fuchsia-500 text-white text-sm font-semibold inline-flex items-center gap-2 shadow-lg shadow-rose-900/40"
          >
            <LogIn className="w-4 h-4" /> Sign In
          </button>
        </div>
      ) : (
        <section className="theme-dark-stage relative overflow-hidden rounded-3xl border border-rose-300/20 bg-[linear-gradient(160deg,rgba(52,8,28,0.95),rgba(12,10,22,0.98)_55%,rgba(34,8,30,0.98))] p-4 sm:p-5">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-14 -top-14 h-44 w-44 rounded-full bg-[radial-gradient(closest-side,rgba(244,63,94,0.28),transparent)] blur-2xl"
          />

          <div className="relative flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-300/25 bg-rose-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-rose-200">
              {phase === 'SCHEDULED'
                ? `Launching · ${countdown}s`
                : phase === 'RUNNING'
                ? 'In flight'
                : 'Crashed'}
            </span>
            <span className="font-mono text-[10px] font-bold text-slate-400">
              Round #{roundSeq}
            </span>
          </div>

          {recent.length > 0 && (
            <div className="relative mt-3 flex items-center gap-1.5 overflow-x-auto pb-0.5">
              <span className="shrink-0 text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                Recent
              </span>
              {recent.slice(0, 8).map((r, i) => (
                <span
                  key={`${r}-${i}`}
                  className={`shrink-0 rounded border px-1.5 py-0.5 font-mono text-[9px] font-bold ${
                    r >= 2
                      ? 'border-emerald-400/30 bg-emerald-500/20 text-emerald-300'
                      : 'border-rose-400/30 bg-rose-500/20 text-rose-300'
                  }`}
                >
                  {r.toFixed(2)}x
                </span>
              ))}
            </div>
          )}

          <div className="relative mt-4 flex h-40 flex-col items-center justify-center overflow-hidden rounded-2xl border border-white/[0.07] bg-[#070B14] select-none">
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:16px_16px]"
            />
            {phase === 'SCHEDULED' && (
              <div className="relative z-10 text-center">
                <Rocket className="mx-auto h-9 w-9 text-rose-400 animate-bounce" />
                <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Ignition in
                </p>
                <p className="font-mono text-4xl font-extrabold text-amber-300">{countdown}s</p>
              </div>
            )}
            {phase === 'RUNNING' && (
              <div className="relative z-10 text-center">
                <p className="font-mono text-5xl font-black tracking-tight text-white drop-shadow-[0_0_20px_rgba(244,63,94,0.6)]">
                  {multiplier.toFixed(2)}
                  <span className="text-2xl text-rose-400">x</span>
                </p>
                <p className="mt-1.5 text-[11px] font-semibold text-emerald-300 animate-pulse">
                  In flight — cash out any time
                </p>
              </div>
            )}
            {phase === 'CRASHED' && (
              <div className="relative z-10 text-center">
                <Flame className="mx-auto h-10 w-10 text-rose-500 animate-pulse" />
                <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-rose-400">
                  Crashed at
                </p>
                <p className="font-mono text-4xl font-black text-rose-400">
                  {(snap?.crashPoint || 0).toFixed(2)}x
                </p>
              </div>
            )}
          </div>

          {error && (
            <p className="relative mt-3 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-200">
              {error}
            </p>
          )}

          <div className="relative mt-4 space-y-2.5">
            <div className="flex gap-1.5">
              {ARCADE_CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setStake(chip)}
                  disabled={busy || !canBet}
                  className={`flex-1 h-9 rounded-xl border font-mono text-[11px] font-bold tabular-nums transition-all disabled:opacity-50 ${
                    stake === chip
                      ? 'border-rose-300/60 bg-gradient-to-b from-rose-400/30 to-pink-600/20 text-rose-100'
                      : 'border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]'
                  }`}
                >
                  {fmtCoins(chip)}
                </button>
              ))}
            </div>

            {myBet && (
              <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 text-[11px]">
                <span className="text-slate-400">
                  Your bet: <span className="font-bold text-slate-200">{fmtCoins(myBet.stake)}</span>
                </span>
                <span
                  className={`font-bold ${
                    myBet.status === 'CASHED'
                      ? 'text-emerald-300'
                      : myBet.status === 'BUSTED'
                      ? 'text-rose-300'
                      : 'text-amber-300'
                  }`}
                >
                  {myBet.status === 'CASHED'
                    ? `+${fmtCoins(myBet.payout)} @ ${myBet.cashedMultiplier?.toFixed(2)}x`
                    : myBet.status === 'BUSTED'
                    ? `−${fmtCoins(myBet.stake)}`
                    : 'On board'}
                </span>
              </div>
            )}

            {canCash ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleCashout()}
                className="w-full h-12 rounded-2xl bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-600 text-emerald-950 text-sm font-black inline-flex items-center justify-center gap-2 shadow-[0_16px_36px_-14px_rgba(16,185,129,0.9)] ring-1 ring-white/20 disabled:opacity-50 active:scale-[0.99] transition-transform"
              >
                <TrendingUp className="w-4 h-4" />
                {busy
                  ? 'Cashing out…'
                  : `Cash out ${fmtCoins(Math.round((myBet?.stake || 0) * multiplier))} · ${multiplier.toFixed(2)}x`}
              </button>
            ) : canBet ? (
              <button
                type="button"
                onClick={() => void handleBet()}
                disabled={busy || isOffline}
                className="w-full h-12 rounded-2xl bg-gradient-to-r from-rose-400 via-pink-500 to-fuchsia-600 text-white text-sm font-black inline-flex items-center justify-center gap-2 shadow-[0_16px_36px_-14px_rgba(244,63,94,0.9)] ring-1 ring-white/20 disabled:opacity-45 disabled:cursor-not-allowed active:scale-[0.99] transition-transform"
              >
                <Rocket className="w-4 h-4" />
                {busy ? 'Boarding…' : `Board with ${fmtCoins(stake)}`}
              </button>
            ) : (
              <div className="grid h-12 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] text-center text-xs font-semibold text-slate-400">
                {phase === 'RUNNING'
                  ? 'No bet this flight — wait for the next launch'
                  : phase === 'CRASHED'
                  ? 'Next round starting…'
                  : `Launching in ${Math.max(1, countdown)}s`}
              </div>
            )}

            {isOffline && (
              <p className="text-center text-[10px] font-medium text-rose-300/80">
                Offline — reconnecting before the next launch.
              </p>
            )}
          </div>
        </section>
      )}
    </div>
  );
};
