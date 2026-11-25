import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  CircleDot,
  Coins,
  Dices,
  LogIn,
  Sparkles,
  Users,
} from 'lucide-react';
import { UserProfile } from '../../types/app';
import { ARCADE_CHIPS, fmtCoins } from '../../games/arcade/wallet';
import {
  BET_MULTIPLIER,
  numberColor,
  RouletteBetKind,
  SharedRouletteEngine,
  WHEEL_ORDER,
} from '../../games/arcade/rouletteEngine';

interface Props {
  currentUser: UserProfile | null;
  coinBalance: number;
  isOffline: boolean;
  onBack: () => void;
  onOpenAuth: () => void;
}

function wheelGradient(): string {
  const step = 360 / WHEEL_ORDER.length;
  const stops = WHEEL_ORDER.map((n, i) => {
    const c = numberColor(n);
    const color =
      c === 'green' ? '#059669' : c === 'red' ? '#dc2626' : '#1f2937';
    return `${color} ${i * step}deg ${(i + 1) * step}deg`;
  });
  return `conic-gradient(from 0deg, ${stops.join(', ')})`;
}

export const RouletteView: React.FC<Props> = ({
  currentUser,
  coinBalance,
  isOffline,
  onBack,
  onOpenAuth,
}) => {
  const [stake, setStake] = useState<number>(100);
  const [bet, setBet] = useState<RouletteBetKind>('RED');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const engine = useMemo(() => {
    if (!currentUser) return null;
    return new SharedRouletteEngine(currentUser.uid, currentUser.displayName || currentUser.username || 'Player');
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
    const res = await engine.placeBet(bet, stake);
    setBusy(false);
    if (!res.ok) {
      setError(res.reason || 'Could not place bet.');
    }
  };

  const phase = snap?.phase || 'OPEN';
  const countdown = snap?.countdownLeft || 0;
  const winningNumber = snap?.winningNumber;
  const recent = snap?.recentResults || [];
  const bets = snap?.bets || [];
  const myBets = snap?.myBets || [];

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
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
            <CircleDot className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white">Roulette Live</h1>
            <p className="text-[10px] text-emerald-400 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Shared Live Board · {snap?.board?.roundId || 'RL-LIVE'}
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
        {recent.map((n, i) => {
          const c = numberColor(Number(n));
          return (
            <span
              key={i}
              className={`rounded px-2 py-0.5 font-bold ${
                c === 'green'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : c === 'red'
                  ? 'bg-rose-500/20 text-rose-400'
                  : 'bg-slate-700/50 text-slate-200'
              }`}
            >
              {n}
            </span>
          );
        })}
      </div>

      {/* Main Wheel View */}
      <div className="relative flex flex-1 flex-col items-center justify-center p-6 select-none overflow-hidden">
        {/* Pointer */}
        <div className="relative flex items-center justify-center">
          <div className="absolute -top-3 z-20 h-0 w-0 border-x-8 border-x-transparent border-t-[14px] border-t-amber-400 filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" />

          {/* Rotating Roulette Wheel */}
          <div
            className={`relative flex h-56 w-56 items-center justify-center rounded-full border-4 border-amber-500/30 shadow-[0_0_40px_rgba(0,0,0,0.8)] transition-transform ${
              phase === 'SPINNING' ? 'animate-spin' : ''
            }`}
            style={{
              background: wheelGradient(),
              animationDuration: phase === 'SPINNING' ? '1.5s' : undefined,
            }}
          >
            {/* Center Hub */}
            <div className="flex h-24 w-24 flex-col items-center justify-center rounded-full bg-slate-950 border-4 border-amber-500/40 shadow-inner text-center z-10">
              {phase === 'OPEN' && (
                <>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Betting</p>
                  <p className="text-xl font-extrabold text-amber-400 font-mono">{countdown}s</p>
                </>
              )}
              {phase === 'SPINNING' && (
                <>
                  <Dices className="h-6 w-6 text-amber-400 animate-spin" />
                  <p className="text-[9px] uppercase font-bold text-amber-300 mt-1">Spinning</p>
                </>
              )}
              {phase === 'SETTLED' && winningNumber !== null && (
                <>
                  <p
                    className={`text-2xl font-black ${
                      numberColor(winningNumber) === 'green'
                        ? 'text-emerald-400'
                        : numberColor(winningNumber) === 'red'
                        ? 'text-rose-400'
                        : 'text-slate-200'
                    }`}
                  >
                    #{winningNumber}
                  </p>
                  <p className="text-[9px] uppercase font-bold text-slate-400">
                    {numberColor(winningNumber).toUpperCase()}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Players in Round Indicator */}
        <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-[11px] text-slate-400 bg-white/5 backdrop-blur-md rounded-lg px-3 py-1.5 border border-white/5">
          <div className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-slate-300" />
            <span>{bets.length} Bets in this round</span>
          </div>
          {myBets.length > 0 && (
            <div className="font-semibold text-amber-400">
              Your bets: {myBets.map((b) => `${b.betKind} (${fmtCoins(b.stake)})`).join(', ')}
            </div>
          )}
        </div>
      </div>

      {/* Betting Options & Chip Selector */}
      <div className="border-t border-white/10 bg-black/60 backdrop-blur-xl p-4">
        {error && (
          <div className="mb-3 rounded-lg bg-rose-500/10 border border-rose-500/20 px-3 py-2 text-xs text-rose-400 text-center">
            {error}
          </div>
        )}

        {/* Color Choices: RED (2x), GREEN (14x), BLACK (2x) */}
        <div className="mb-3 grid grid-cols-3 gap-2">
          <button
            type="button"
            disabled={busy || phase !== 'OPEN'}
            onClick={() => setBet('RED')}
            className={`rounded-xl py-2.5 text-center font-bold transition border ${
              bet === 'RED'
                ? 'bg-rose-600 border-rose-400 text-white shadow-lg shadow-rose-600/30'
                : 'bg-rose-950/40 border-rose-500/30 text-rose-300 hover:bg-rose-900/50'
            }`}
          >
            <p className="text-xs">RED</p>
            <p className="text-[10px] text-rose-200">2x Payout</p>
          </button>
          <button
            type="button"
            disabled={busy || phase !== 'OPEN'}
            onClick={() => setBet('GREEN')}
            className={`rounded-xl py-2.5 text-center font-bold transition border ${
              bet === 'GREEN'
                ? 'bg-emerald-600 border-emerald-400 text-white shadow-lg shadow-emerald-600/30'
                : 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300 hover:bg-emerald-900/50'
            }`}
          >
            <p className="text-xs">GREEN (0)</p>
            <p className="text-[10px] text-emerald-200">14x Payout</p>
          </button>
          <button
            type="button"
            disabled={busy || phase !== 'OPEN'}
            onClick={() => setBet('BLACK')}
            className={`rounded-xl py-2.5 text-center font-bold transition border ${
              bet === 'BLACK'
                ? 'bg-slate-800 border-slate-500 text-white shadow-lg shadow-slate-700/30'
                : 'bg-slate-900/60 border-slate-700 text-slate-300 hover:bg-slate-800/60'
            }`}
          >
            <p className="text-xs">BLACK</p>
            <p className="text-[10px] text-slate-400">2x Payout</p>
          </button>
        </div>

        {/* Chip Selectors */}
        <div className="mb-3 flex items-center justify-between gap-2">
          {ARCADE_CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              disabled={busy || phase !== 'OPEN'}
              onClick={() => setStake(chip)}
              className={`flex-1 rounded-xl py-2 text-xs font-bold transition ${
                stake === chip
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25'
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
        ) : (
          <button
            type="button"
            disabled={busy || phase !== 'OPEN'}
            onClick={handleBet}
            className={`flex w-full items-center justify-center gap-2 rounded-xl py-3.5 font-extrabold text-white shadow-lg transition ${
              phase === 'OPEN'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:brightness-110 active:scale-[0.98]'
                : 'bg-white/10 text-slate-500 cursor-not-allowed'
            }`}
          >
            <CircleDot className="h-5 w-5" />
            {phase === 'OPEN'
              ? `PLACE ${fmtCoins(stake)} ON ${bet} (${BET_MULTIPLIER[bet]}x)`
              : 'WHEEL SPINNING · WAIT FOR NEXT ROUND'}
          </button>
        )}
      </div>
    </div>
  );
};
