import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Coins,
  Flame,
  LogIn,
  Rocket,
  TimerReset,
  TrendingUp,
  Users,
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

  const engine = useMemo(() => {
    if (!currentUser) return null;
    return new SharedCrashEngine(currentUser.uid, currentUser.displayName || currentUser.username || 'Player');
  }, [currentUser?.uid]);

  const [snap, setSnap] = useState(() => engine?.getSnapshot() ?? null);

  useEffect(() => {
    if (!engine) return;
    const unsub = engine.subscribe(() => {
      setSnap(engine.getSnapshot());
    });
    setSnap(engine.getSnapshot());
    return () => {
      unsub();
      engine.destroy();
    };
  }, [engine]);

  const handleBet = async () => {
    if (!currentUser) {
      onOpenAuth();
      return;
    }
    if (!engine) return;
    if (stake > coinBalance) {
      setError('Not enough Coins for this bet.');
      return;
    }
    setError(null);
    setBusy(true);
    const res = await engine.placeBet(stake);
    setBusy(false);
    if (!res.ok) {
      setError(res.reason || 'Could not place bet.');
    }
  };

  const handleCashout = async () => {
    if (!engine) return;
    setError(null);
    setBusy(true);
    const res = await engine.cashOut();
    setBusy(false);
    if (!res.ok) {
      setError(res.reason || 'Cashout failed.');
    }
  };

  const phase = snap?.phase || 'SCHEDULED';
  const multiplier = snap?.currentMultiplier || 1.0;
  const countdown = snap?.countdownLeft || 0;
  const myBet = snap?.myBet;
  const recent = snap?.recentResults || [];
  const bets = snap?.bets || [];

  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <button
          type="button"
          onClick={onBack}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/20 text-rose-400">
            <Rocket className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white">Crash Rocket</h1>
            <p className="text-[10px] text-emerald-400 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Shared Live Board · {snap?.board?.roundId || 'CR-LIVE'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">
          <Coins className="h-3.5 w-3.5 text-amber-400" />
          <span>{fmtCoins(coinBalance)}</span>
        </div>
      </div>

      {/* Recent History Strip */}
      <div className="flex items-center gap-2 border-b border-white/5 bg-black/40 px-4 py-2 overflow-x-auto text-[11px]">
        <span className="text-slate-400 shrink-0 font-medium">Recent:</span>
        {recent.map((r, i) => (
          <span
            key={i}
            className={`rounded px-1.5 py-0.5 font-bold ${
              r >= 2.0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
            }`}
          >
            {Number(r).toFixed(2)}x
          </span>
        ))}
      </div>

      {/* Main Rocket Flight Canvas Display */}
      <div className="relative flex flex-1 flex-col items-center justify-center p-6 select-none overflow-hidden">
        {/* Ambient starfield & grid */}
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:16px_16px]" />

        {phase === 'SCHEDULED' && (
          <div className="text-center z-10 animate-fade-in">
            <div className="mb-2 flex justify-center">
              <TimerReset className="h-10 w-10 text-amber-400 animate-spin" />
            </div>
            <p className="text-xs uppercase tracking-widest text-slate-400">Next Rocket Launch In</p>
            <p className="text-4xl font-extrabold text-amber-400 font-mono mt-1">{countdown}s</p>
            <p className="text-[11px] text-slate-500 mt-2">Place your bet before ignition!</p>
          </div>
        )}

        {phase === 'RUNNING' && (
          <div className="text-center z-10 animate-scale-up">
            <div className="flex justify-center mb-3">
              <Rocket className="h-12 w-12 text-rose-500 animate-bounce" />
            </div>
            <p className="text-6xl font-black font-mono tracking-tight text-white drop-shadow-[0_0_20px_rgba(244,63,94,0.6)]">
              {multiplier.toFixed(2)}
              <span className="text-2xl text-rose-400">x</span>
            </p>
            <p className="text-xs font-semibold text-emerald-400 mt-2 animate-pulse">
              Rocket in flight! Cash out before it explodes!
            </p>
          </div>
        )}

        {phase === 'CRASHED' && (
          <div className="text-center z-10 animate-shake">
            <div className="flex justify-center mb-2">
              <Flame className="h-14 w-14 text-rose-600 animate-pulse" />
            </div>
            <p className="text-xs uppercase font-bold tracking-widest text-rose-400">CRASHED AT</p>
            <p className="text-5xl font-black font-mono text-rose-500 mt-1">
              {snap?.crashPoint.toFixed(2)}x
            </p>
            <p className="text-[11px] text-slate-400 mt-2">Preparing next rocket...</p>
          </div>
        )}

        {/* Players List Overlay */}
        <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-[11px] text-slate-400 bg-white/5 backdrop-blur-md rounded-lg px-3 py-1.5 border border-white/5">
          <div className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-slate-300" />
            <span>{bets.length} Players in this round</span>
          </div>
          {myBet && (
            <div className="font-semibold">
              Your Bet: <span className="text-amber-400">{fmtCoins(myBet.stake)}</span> (
              <span className={myBet.status === 'CASHED' ? 'text-emerald-400' : 'text-slate-300'}>
                {myBet.status} {myBet.cashedMultiplier ? `@ ${myBet.cashedMultiplier.toFixed(2)}x` : ''}
              </span>
              )
            </div>
          )}
        </div>
      </div>

      {/* Betting Controls & Action Button */}
      <div className="border-t border-white/10 bg-black/60 backdrop-blur-xl p-4">
        {error && (
          <div className="mb-3 rounded-lg bg-rose-500/10 border border-rose-500/20 px-3 py-2 text-xs text-rose-400 text-center">
            {error}
          </div>
        )}

        {/* Chip Selection */}
        <div className="mb-3 flex items-center justify-between gap-2">
          {ARCADE_CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              disabled={busy || (phase === 'RUNNING' && myBet?.status === 'ACCEPTED')}
              onClick={() => setStake(chip)}
              className={`flex-1 rounded-xl py-2 text-xs font-bold transition ${
                stake === chip
                  ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-lg shadow-rose-500/25'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              {fmtCoins(chip)}
            </button>
          ))}
        </div>

        {/* Action Button */}
        {!currentUser ? (
          <button
            type="button"
            onClick={onOpenAuth}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-3.5 font-bold text-white shadow-lg"
          >
            <LogIn className="h-4 w-4" />
            Log in to Play
          </button>
        ) : phase === 'RUNNING' && myBet?.status === 'ACCEPTED' ? (
          <button
            type="button"
            disabled={busy}
            onClick={handleCashout}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-3.5 font-extrabold text-white shadow-lg shadow-emerald-500/25 hover:brightness-110 active:scale-[0.98] transition"
          >
            <TrendingUp className="h-5 w-5" />
            CASHOUT {fmtCoins(Math.round(myBet.stake * multiplier))} COINS ({multiplier.toFixed(2)}x)
          </button>
        ) : (
          <button
            type="button"
            disabled={busy || phase !== 'SCHEDULED' || myBet?.status === 'ACCEPTED'}
            onClick={handleBet}
            className={`flex w-full items-center justify-center gap-2 rounded-xl py-3.5 font-extrabold text-white shadow-lg transition ${
              phase === 'SCHEDULED' && !myBet
                ? 'bg-gradient-to-r from-rose-500 to-pink-600 hover:brightness-110 active:scale-[0.98]'
                : 'bg-white/10 text-slate-500 cursor-not-allowed'
            }`}
          >
            <Rocket className="h-5 w-5" />
            {myBet
              ? 'BET PLACED (WAITING FOR LAUNCH)'
              : phase === 'SCHEDULED'
              ? `LAUNCH WITH ${fmtCoins(stake)} COINS`
              : 'WAITING FOR NEXT ROUND'}
          </button>
        )}
      </div>
    </div>
  );
};
