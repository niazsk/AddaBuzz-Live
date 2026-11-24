import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  CircleDot,
  Coins,
  Dices,
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

type BetKind = 'RED' | 'BLACK' | 'GREEN';
type Phase = 'idle' | 'spinning' | 'result';

const WHEEL_ORDER = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5,
  24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
];
const RED_NUMBERS = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
]);
const BET_MULTIPLIER: Record<BetKind, number> = { RED: 2, BLACK: 2, GREEN: 14 };

interface HistoryEntry {
  id: string;
  at: number;
  stake: number;
  bet: BetKind;
  number: number;
  payout: number;
}

interface Props {
  currentUser: UserProfile | null;
  coinBalance: number;
  isOffline: boolean;
  onBack: () => void;
  onOpenAuth: () => void;
}

function numberColor(n: number): 'green' | 'red' | 'black' {
  if (n === 0) return 'green';
  return RED_NUMBERS.has(n) ? 'red' : 'black';
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
  const [bet, setBet] = useState<BetKind>('RED');
  const [phase, setPhase] = useState<Phase>('idle');
  const [winningNumber, setWinningNumber] = useState<number | null>(null);
  const [rotation, setRotation] = useState(0);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const userRef = useRef(currentUser);
  userRef.current = currentUser;
  const roundRef = useRef<{
    id: string;
    stake: number;
    bet: BetKind;
    number: number;
    settled: boolean;
  } | null>(null);
  const spinTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!currentUser) return;
    setHistory(loadArcadeHistory<HistoryEntry>(`rl_history_${currentUser.uid}`));
    void flushArcadeCredits(currentUser.uid);
  }, [currentUser]);

  const settle = (onScreen: boolean) => {
    if (spinTimerRef.current !== null) {
      window.clearTimeout(spinTimerRef.current);
      spinTimerRef.current = null;
    }
    const info = roundRef.current;
    const uid = userRef.current?.uid;
    if (!info || !uid || info.settled) return;
    info.settled = true;
    const won =
      (info.bet === 'RED' && numberColor(info.number) === 'red') ||
      (info.bet === 'BLACK' && numberColor(info.number) === 'black') ||
      (info.bet === 'GREEN' && info.number === 0);
    const payout = won ? info.stake * BET_MULTIPLIER[info.bet] : 0;
    if (payout > 0) {
      creditArcade(
        uid,
        payout,
        `Roulette ${info.id} · ${info.bet} hit ${info.number}`,
        `rl-${info.id}-w`
      );
    }
    const entry: HistoryEntry = {
      id: info.id,
      at: Date.now(),
      stake: info.stake,
      bet: info.bet,
      number: info.number,
      payout,
    };
    if (onScreen) {
      setWinningNumber(info.number);
      setPhase('result');
      setHistory((prev) => {
        const next = [entry, ...prev].slice(0, 40);
        saveArcadeHistory(`rl_history_${uid}`, next);
        return next;
      });
    } else {
      const list = loadArcadeHistory<HistoryEntry>(`rl_history_${uid}`);
      saveArcadeHistory(`rl_history_${uid}`, [entry, ...list].slice(0, 40));
    }
  };

  // Leaving mid-spin still lands and pays the wheel result instantly.
  useEffect(
    () => () => {
      const info = roundRef.current;
      if (info && !info.settled) settle(false);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const spin = async () => {
    if (!currentUser || busy || phase === 'spinning' || isOffline) return;
    if (coinBalance < stake) {
      setError('Not enough Coins to place this bet.');
      return;
    }
    setBusy(true);
    setError(null);
    const id = newRoundId('RL');
    try {
      await arcadeDebit(
        currentUser.uid,
        stake,
        `Roulette ${bet} bet ${id}`,
        `rl-${id}-s`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not place the bet.');
      setBusy(false);
      return;
    }
    setBusy(false);
    const number = Math.floor(randomUnit() * 37);
    roundRef.current = { id, stake, bet, number, settled: false };
    setWinningNumber(null);
    setPhase('spinning');

    const index = WHEEL_ORDER.indexOf(number);
    const step = 360 / WHEEL_ORDER.length;
    const midAngle = index * step + step / 2;
    setRotation((prev) => {
      const base = Math.ceil(prev / 360) * 360;
      return base + 1440 + (360 - midAngle);
    });
    spinTimerRef.current = window.setTimeout(() => settle(true), 3900);
  };

  const reset = () => {
    roundRef.current = null;
    setPhase('idle');
    setError(null);
  };

  const resultColor = winningNumber !== null ? numberColor(winningNumber) : null;

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
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-rose-300 via-red-500 to-slate-800 ring-1 ring-white/25 shadow-lg shadow-rose-500/40">
              <CircleDot className="w-[18px] h-[18px] text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]" />
            </span>
            <span>Roulette</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Spin the European wheel — Red or Black pays ×2, the lone Zero pays ×14.
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
        <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-br from-rose-600/20 via-[#111420] to-slate-700/20 p-8 text-center space-y-4">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-400 to-slate-800 flex items-center justify-center shadow-lg shadow-rose-500/30">
            <CircleDot className="w-7 h-7 text-white" />
          </div>
          <h2 className="font-display text-xl font-bold text-white">Sign in to spin</h2>
          <p className="text-sm text-slate-400 max-w-sm mx-auto">
            Roulette runs on AddaBuzz Coins — sign in to place your first bet.
          </p>
          <button
            type="button"
            onClick={onOpenAuth}
            className="px-6 py-2.5 rounded-full bg-gradient-to-r from-rose-400 to-red-500 text-white text-sm font-semibold inline-flex items-center gap-2 shadow-lg shadow-rose-900/40"
          >
            <LogIn className="w-4 h-4" /> Sign In
          </button>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr] items-start">
          <section className="relative overflow-hidden rounded-3xl border border-rose-300/20 bg-[linear-gradient(160deg,rgba(46,10,22,0.95),rgba(10,10,20,0.98)_55%,rgba(24,12,18,0.98))] p-4 sm:p-5">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full bg-[radial-gradient(closest-side,rgba(244,63,94,0.26),transparent)] blur-2xl"
            />
            <div className="relative flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-300/25 bg-rose-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-rose-200">
                {phase === 'spinning' ? 'Wheel spinning' : phase === 'result' ? 'Result' : 'Place your bet'}
              </span>
              {phase === 'result' && winningNumber !== null && (
                <span
                  className={`grid h-7 min-w-7 place-items-center rounded-full px-2 font-mono text-xs font-black ${
                    resultColor === 'green'
                      ? 'bg-emerald-500 text-white'
                      : resultColor === 'red'
                      ? 'bg-rose-600 text-white'
                      : 'bg-slate-800 text-slate-100 ring-1 ring-white/20'
                  }`}
                >
                  {winningNumber}
                </span>
              )}
            </div>

            <div className="relative mt-4 flex justify-center">
              <div className="relative h-52 w-52">
                <div
                  className="absolute inset-0 rounded-full border-[6px] border-amber-300/80 shadow-[0_0_40px_rgba(251,191,36,0.25)]"
                  style={{
                    background: wheelGradient(),
                    transform: `rotate(${rotation}deg)`,
                    transition: 'transform 3.8s cubic-bezier(0.15, 0.85, 0.15, 1)',
                  }}
                />
                <div className="absolute inset-[38%] grid place-items-center rounded-full border border-white/20 bg-[#0B0D16] shadow-inner">
                  <Dices className="h-5 w-5 text-amber-300" />
                </div>
                <div className="absolute left-1/2 top-[-4px] h-0 w-0 -translate-x-1/2 border-x-[7px] border-t-[12px] border-x-transparent border-t-amber-300 drop-shadow" />
              </div>
            </div>

            {error && (
              <p className="relative mt-3 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-200">
                {error}
              </p>
            )}

            <div className="relative mt-4 space-y-3">
              {phase !== 'spinning' && (
                <>
                  <div className="flex gap-2">
                    {ARCADE_CHIPS.map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => setStake(chip)}
                        className={`flex-1 h-10 rounded-xl border font-mono text-xs font-bold tabular-nums transition-all ${
                          stake === chip
                            ? 'border-rose-300/60 bg-gradient-to-b from-rose-400/30 to-red-600/20 text-rose-100'
                            : 'border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]'
                        }`}
                      >
                        {fmtCoins(chip)}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        ['RED', 'Red ×2', 'bg-gradient-to-b from-rose-500 to-red-700', 'text-white'],
                        ['GREEN', 'Zero ×14', 'bg-gradient-to-b from-emerald-500 to-emerald-700', 'text-white'],
                        ['BLACK', 'Black ×2', 'bg-gradient-to-b from-slate-700 to-slate-950', 'text-slate-100'],
                      ] as const
                    ).map(([kind, label, classes, text]) => (
                      <button
                        key={kind}
                        type="button"
                        onClick={() => setBet(kind)}
                        className={`h-11 rounded-xl text-[11px] font-black uppercase tracking-wide ${classes} ${text} transition-all ${
                          bet === kind
                            ? 'ring-2 ring-amber-300 scale-[1.02] shadow-lg'
                            : 'opacity-70 hover:opacity-100'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </>
              )}
              {phase === 'spinning' ? (
                <button
                  type="button"
                  disabled
                  className="w-full h-12 rounded-2xl bg-gradient-to-r from-rose-400 via-red-500 to-rose-600 text-white text-sm font-bold inline-flex items-center justify-center gap-2 opacity-60 cursor-wait"
                >
                  <CircleDot className="w-4 h-4 animate-spin" /> Spinning…
                </button>
              ) : phase === 'idle' ? (
                <button
                  type="button"
                  onClick={() => void spin()}
                  disabled={busy || isOffline}
                  className="w-full h-12 rounded-2xl bg-gradient-to-r from-rose-400 via-red-500 to-rose-600 text-white text-sm font-bold inline-flex items-center justify-center gap-2 shadow-[0_16px_36px_-14px_rgba(244,63,94,0.9)] ring-1 ring-white/20 disabled:opacity-45 disabled:cursor-not-allowed active:scale-[0.99] transition-transform"
                >
                  <CircleDot className="w-4 h-4" />
                  {busy
                    ? 'Placing bet…'
                    : `Spin · ${fmtCoins(stake)} on ${bet.charAt(0) + bet.slice(1).toLowerCase()}`}
                </button>
              ) : (
                <div className="space-y-2">
                  <div
                    className={`rounded-xl px-3 py-2 text-center text-[11px] font-semibold ${
                      resultColor === bettingResultColor(bet)
                        ? 'border border-emerald-400/30 bg-emerald-500/10 text-emerald-200'
                        : 'border border-rose-400/30 bg-rose-500/10 text-rose-200'
                    }`}
                  >
                    {winningNumber !== null
                      ? `${winningNumber} ${resultColor} — ${
                          resultColor === bettingResultColor(bet)
                            ? `won ${fmtCoins(stake * BET_MULTIPLIER[bet])} Coins`
                            : 'bet lost'
                        }`
                      : ''}
                  </div>
                  <button
                    type="button"
                    onClick={reset}
                    className="w-full h-12 rounded-2xl border border-white/10 bg-white/[0.06] hover:bg-white/[0.1] text-slate-200 text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors"
                  >
                    <Sparkles className="w-4 h-4" /> Spin again
                  </button>
                </div>
              )}
              {isOffline && (
                <p className="text-center text-[10px] font-medium text-rose-300/80">
                  Offline — reconnecting before the next spin.
                </p>
              )}
            </div>
          </section>

          <aside className="space-y-4">
            <section className="rounded-3xl border border-white/[0.07] bg-[#111420] p-4 sm:p-5">
              <h2 className="font-display text-sm font-semibold text-white">Wheel odds</h2>
              <div className="mt-3 grid grid-cols-3 gap-1.5 text-center">
                {[
                  ['Red', '×2', 'text-rose-300'],
                  ['Black', '×2', 'text-slate-300'],
                  ['Zero', '×14', 'text-emerald-300'],
                ].map(([label, mult, tone]) => (
                  <div
                    key={label}
                    className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-2 py-1.5"
                  >
                    <p className="text-[9px] text-slate-400">{label}</p>
                    <p className={`font-mono text-[11px] font-bold ${tone}`}>{mult}</p>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[10px] leading-relaxed text-slate-500">
                European wheel: 18 red, 18 black, 1 green zero — 37 pockets total.
              </p>
            </section>

            <section className="rounded-3xl border border-white/[0.07] bg-[#111420] p-4 sm:p-5">
              <h2 className="font-display text-sm font-semibold text-white">Recent spins</h2>
              {history.length === 0 ? (
                <p className="mt-3 text-[11px] text-slate-500">
                  No spins yet — your numbers will show up here.
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
                          className={`grid h-4 min-w-4 place-items-center rounded-full px-1 font-mono text-[9px] font-black ${
                            numberColor(h.number) === 'green'
                              ? 'bg-emerald-500 text-white'
                              : numberColor(h.number) === 'red'
                              ? 'bg-rose-600 text-white'
                              : 'bg-slate-800 text-slate-100'
                          }`}
                        >
                          {h.number}
                        </span>
                        {h.bet.charAt(0) + h.bet.slice(1).toLowerCase()} · {fmtCoins(h.stake)}
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

function bettingResultColor(bet: BetKind): 'green' | 'red' | 'black' {
  if (bet === 'RED') return 'red';
  if (bet === 'BLACK') return 'black';
  return 'green';
}
