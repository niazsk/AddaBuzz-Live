import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, CircleDot, Coins, LogIn, Sparkles } from 'lucide-react';
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

const SECTOR = 360 / WHEEL_ORDER.length;

function wheelGradient(): string {
  const stops = WHEEL_ORDER.map((n, i) => {
    const c = numberColor(n);
    const color = c === 'green' ? '#059669' : c === 'red' ? '#dc2626' : '#1f2937';
    return `${color} ${i * SECTOR}deg ${(i + 1) * SECTOR}deg`;
  });
  return `conic-gradient(from 0deg, ${stops.join(', ')})`;
}

function numberTone(n: number): string {
  const c = numberColor(n);
  if (c === 'green') return 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30';
  if (c === 'red') return 'bg-rose-500/20 text-rose-300 border-rose-400/30';
  return 'bg-slate-700/40 text-slate-200 border-slate-500/30';
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
  const [rotation, setRotation] = useState(0);

  const engineRef = useRef<SharedRouletteEngine | null>(null);
  const [snap, setSnap] = useState<ReturnType<SharedRouletteEngine['getSnapshot']> | null>(null);
  const rotationRef = useRef(0);
  const spunRound = useRef<string | null>(null);

  const uid = currentUser?.uid ?? null;
  const username = currentUser?.displayName || currentUser?.username || 'Player';

  useEffect(() => {
    if (!uid) return;
    const engine = new SharedRouletteEngine(uid, username);
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

  const phase = snap?.phase || 'OPEN';
  const countdown = snap?.countdownLeft || 0;
  const winningNumber = snap?.winningNumber ?? null;
  const recent = snap?.recentResults || [];
  const myBet = snap?.myBets.find((b) => b.roundId === snap?.board?.roundId);
  const roundSeq = snap?.board?.seq || 1;

  // Rotate so the settled sector lands under the top pointer.
  useEffect(() => {
    if (phase !== 'SPINNING' || !snap?.board) return;
    if (spunRound.current === snap.board.roundId) return;
    spunRound.current = snap.board.roundId;
    const idx = Math.max(0, WHEEL_ORDER.indexOf(snap.board.winningNumber));
    const target = -(idx * SECTOR + SECTOR / 2);
    const norm = (v: number) => ((v % 360) + 360) % 360;
    let delta = norm(target) - norm(rotationRef.current);
    if (delta <= 0.5) delta += 360;
    rotationRef.current += delta + 360 * 5;
    setRotation(rotationRef.current);
  }, [phase, snap?.board]);

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
    const res = await engine.placeBet(bet, stake);
    setBusy(false);
    if (!res.ok) setError(res.reason || 'Could not place bet.');
  };

  const canBet = phase === 'OPEN' && !myBet;

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
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-emerald-300 via-teal-500 to-cyan-600 ring-1 ring-white/25 shadow-lg shadow-emerald-500/40">
              <CircleDot className="w-[18px] h-[18px] text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]" />
            </span>
            <span>Roulette</span>
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
        <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-br from-emerald-600/20 via-[#111420] to-teal-600/15 p-8 text-center space-y-4">
          <div className="mx-auto w-14 h-14 rounded-full bg-gradient-to-br from-emerald-300 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <CircleDot className="w-7 h-7 text-white" />
          </div>
          <h2 className="font-display text-xl font-bold text-white">Sign in to spin</h2>
          <p className="text-sm text-slate-400 max-w-sm mx-auto">
            Roulette runs on AddaBuzz Coins — sign in to join the table.
          </p>
          <button
            type="button"
            onClick={onOpenAuth}
            className="px-6 py-2.5 rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 text-emerald-950 text-sm font-semibold inline-flex items-center gap-2 shadow-lg shadow-emerald-900/40"
          >
            <LogIn className="w-4 h-4" /> Sign In
          </button>
        </div>
      ) : (
        <>
          <section className="relative overflow-hidden rounded-3xl border border-emerald-300/20 bg-[linear-gradient(160deg,rgba(6,42,34,0.95),rgba(8,12,20,0.98)_55%,rgba(8,28,32,0.98))] p-3 sm:p-4">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-14 -top-14 h-44 w-44 rounded-full bg-[radial-gradient(closest-side,rgba(16,185,129,0.28),transparent)] blur-2xl"
            />

            <div className="relative flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/25 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-200">
                {phase === 'OPEN' ? `Betting · ${countdown}s` : phase === 'SPINNING' ? 'Spinning' : 'Result'}
              </span>
              {myBet ? (
                <span
                  className={`text-[10px] font-bold ${
                    myBet.status === 'WON'
                      ? 'text-emerald-300'
                      : myBet.status === 'LOST'
                      ? 'text-rose-300'
                      : 'text-amber-300'
                  }`}
                >
                  {myBet.betKind} · {fmtCoins(myBet.stake)}
                  {myBet.status === 'WON'
                    ? ` · +${fmtCoins(myBet.payout)}`
                    : myBet.status === 'LOST'
                    ? ` · −${fmtCoins(myBet.stake)}`
                    : ''}
                </span>
              ) : (
                <span className="font-mono text-[10px] font-bold text-slate-400">
                  Round #{roundSeq}
                </span>
              )}
            </div>

            <div className="relative mt-2 flex justify-center select-none">
              <div
                aria-hidden="true"
                className="absolute -top-2 z-20 h-0 w-0 border-x-[7px] border-x-transparent border-t-[12px] border-t-amber-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
              />
              <div className="relative h-[168px] w-[168px]">
                <div
                  aria-hidden="true"
                  className="absolute -inset-[5px] rounded-full bg-[conic-gradient(from_0deg,#b45309,#fbbf24,#d97706,#fbbf24,#b45309)] opacity-70 blur-[1px]"
                />
                <div className="absolute inset-0 overflow-hidden rounded-full border-[3px] border-amber-200/30 shadow-[0_18px_44px_-18px_rgba(0,0,0,0.95)]">
                  <div
                    className="absolute inset-0"
                    style={{
                      background: wheelGradient(),
                      transform: `rotate(${rotation}deg)`,
                      transition:
                        phase === 'SPINNING'
                          ? 'transform 5.6s cubic-bezier(0.15, 0.55, 0.1, 1)'
                          : 'none',
                    }}
                  >
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 rounded-full"
                      style={{
                        backgroundImage:
                          'repeating-conic-gradient(from 0deg, rgba(0,0,0,0.35) 0deg 0.5deg, transparent 0.5deg ' +
                          SECTOR +
                          'deg)',
                      }}
                    />
                    {WHEEL_ORDER.map((n, i) => (
                      <span
                        key={n}
                        className={`absolute left-1/2 top-1/2 -ml-2 -mt-[5px] w-4 text-center font-mono text-[7px] font-black leading-none ${
                          n === 0
                            ? 'text-emerald-100'
                            : numberColor(n) === 'red'
                            ? 'text-rose-50'
                            : 'text-slate-100'
                        }`}
                        style={{ transform: `rotate(${(i + 0.5) * SECTOR}deg) translateY(-70px)` }}
                      >
                        {n}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="absolute inset-0 grid place-items-center">
                  <div className="flex h-[80px] w-[80px] flex-col items-center justify-center rounded-full border-[3px] border-amber-300/40 bg-[radial-gradient(circle_at_35%_30%,#1e293b,#020617_72%)] text-center shadow-[0_10px_28px_-8px_rgba(0,0,0,0.9)]">
                    {phase === 'OPEN' && (
                      <>
                        <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                          Betting
                        </p>
                        <p className="font-mono text-xl font-extrabold text-amber-300">
                          {countdown}s
                        </p>
                      </>
                    )}
                    {phase === 'SPINNING' && (
                      <>
                        <Sparkles className="h-5 w-5 animate-pulse text-amber-300" />
                        <p className="mt-1 text-[9px] font-bold uppercase tracking-wide text-amber-200">
                          Spinning
                        </p>
                      </>
                    )}
                    {phase === 'SETTLED' && winningNumber !== null && (
                      <>
                        <p
                          className={`font-mono text-xl font-black ${
                            numberColor(winningNumber) === 'green'
                              ? 'text-emerald-400'
                              : numberColor(winningNumber) === 'red'
                              ? 'text-rose-400'
                              : 'text-slate-100'
                          }`}
                        >
                          {winningNumber}
                        </p>
                        <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                          {numberColor(winningNumber)}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <p className="relative mt-3 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-200">
                {error}
              </p>
            )}

            <div className="relative mt-2 space-y-1.5">
              <div className="grid grid-cols-3 gap-1.5">
                {(
                  [
                    ['RED', 'bg-rose-600 border-rose-300/60 text-white', 'text-rose-100', 'bg-rose-950/40 border-rose-500/25 text-rose-300'],
                    ['GREEN', 'bg-emerald-600 border-emerald-300/60 text-white', 'text-emerald-100', 'bg-emerald-950/40 border-emerald-500/25 text-emerald-300'],
                    ['BLACK', 'bg-slate-700 border-slate-400/60 text-white', 'text-slate-100', 'bg-slate-900/60 border-slate-600/60 text-slate-300'],
                  ] as const
                ).map(([kind, active, activeSub, idle]) => (
                  <button
                    key={kind}
                    type="button"
                    disabled={busy || !canBet}
                    onClick={() => setBet(kind)}
                    className={`rounded-xl border py-1.5 text-center transition disabled:opacity-60 ${
                      bet === kind ? active : idle
                    }`}
                  >
                    <p className="text-[11px] font-extrabold">
                      {kind === 'GREEN' ? 'ZERO' : kind}
                      <span className={`ml-1 text-[9px] font-bold ${bet === kind ? activeSub : 'opacity-70'}`}>
                        ×{BET_MULTIPLIER[kind]}
                      </span>
                    </p>
                  </button>
                ))}
              </div>

              <div className="flex gap-1.5">
                {ARCADE_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setStake(chip)}
                    disabled={busy || !canBet}
                    className={`flex-1 h-8 rounded-xl border font-mono text-[11px] font-bold tabular-nums transition-all disabled:opacity-50 ${
                      stake === chip
                        ? 'border-emerald-300/60 bg-gradient-to-b from-emerald-400/30 to-teal-600/20 text-emerald-100'
                        : 'border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]'
                    }`}
                  >
                    {fmtCoins(chip)}
                  </button>
                ))}
              </div>

              {canBet ? (
                <button
                  type="button"
                  onClick={() => void handleBet()}
                  disabled={busy || isOffline}
                  className="w-full h-11 rounded-2xl bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-600 text-emerald-950 text-sm font-black inline-flex items-center justify-center gap-2 shadow-[0_16px_36px_-14px_rgba(16,185,129,0.9)] ring-1 ring-white/20 disabled:opacity-45 disabled:cursor-not-allowed active:scale-[0.99] transition-transform"
                >
                  <CircleDot className="w-4 h-4" />
                  {busy ? 'Placing…' : `Bet ${fmtCoins(stake)} on ${bet === 'GREEN' ? 'ZERO' : bet}`}
                </button>
              ) : (
                <div className="grid h-11 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] text-center text-xs font-semibold text-slate-400">
                  {phase === 'OPEN'
                    ? `Bet placed · spin in ${countdown}s`
                    : phase === 'SPINNING'
                    ? 'Wheel spinning…'
                    : `Next round in ${countdown}s`}
                </div>
              )}

              {isOffline && (
                <p className="text-center text-[10px] font-medium text-emerald-300/80">
                  Offline — reconnecting before the next spin.
                </p>
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-white/[0.07] bg-[#111420] p-3">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <span className="shrink-0 text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                Recent spins
              </span>
              {recent.length === 0 ? (
                <span className="text-[10px] text-slate-500">No spins yet</span>
              ) : (
                recent.slice(0, 10).map((n, i) => (
                  <span
                    key={`${n}-${i}`}
                    className={`grid h-5 min-w-5 shrink-0 place-items-center rounded border px-1 font-mono text-[9px] font-bold ${numberTone(n)}`}
                  >
                    {n}
                  </span>
                ))
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
};
