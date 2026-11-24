import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Coins,
  Flame,
  LogIn,
  Rocket,
  TimerReset,
  TrendingUp,
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

type Phase = 'idle' | 'running' | 'cashed' | 'crashed';

interface HistoryEntry {
  id: string;
  at: number;
  stake: number;
  cashoutAt: number | null;
  crashAt: number;
  payout: number;
}

interface Props {
  currentUser: UserProfile | null;
  coinBalance: number;
  isOffline: boolean;
  onBack: () => void;
  onOpenAuth: () => void;
}

/* Crash point from uniform u: heavy-tail so big multipliers stay rare. */
function rollCrashPoint(): number {
  const u = Math.max(randomUnit(), 0.000001);
  return Math.min(200, Math.max(1.01, Math.round((0.97 / u) * 100) / 100));
}

export const CrashView: React.FC<Props> = ({
  currentUser,
  coinBalance,
  isOffline,
  onBack,
  onOpenAuth,
}) => {
  const [stake, setStake] = useState<number>(100);
  const [phase, setPhase] = useState<Phase>('idle');
  const [multiplier, setMultiplier] = useState(1);
  const [crashPoint, setCrashPoint] = useState<number | null>(null);
  const [cashedAt, setCashedAt] = useState<number | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const userRef = useRef(currentUser);
  userRef.current = currentUser;
  const roundRef = useRef<{
    id: string;
    stake: number;
    crashAt: number;
    startedAt: number;
    cashedAt: number | null;
    settled: boolean;
  } | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!currentUser) return;
    setHistory(loadArcadeHistory<HistoryEntry>(`cr_history_${currentUser.uid}`));
    void flushArcadeCredits(currentUser.uid);
  }, [currentUser]);

  const settle = (onScreen: boolean) => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const info = roundRef.current;
    const uid = userRef.current?.uid;
    if (!info || !uid || info.settled) return;
    info.settled = true;
    const payout =
      info.cashedAt !== null ? Math.round(info.stake * info.cashedAt) : 0;
    if (payout > 0) {
      creditArcade(
        uid,
        payout,
        `Crash Rocket ${info.id} · ×${info.cashedAt?.toFixed(2)}`,
        `cr-${info.id}-w`
      );
    }
    const entry: HistoryEntry = {
      id: info.id,
      at: Date.now(),
      stake: info.stake,
      cashoutAt: info.cashedAt,
      crashAt: info.crashAt,
      payout,
    };
    if (onScreen) {
      setCashedAt(info.cashedAt);
      setCrashPoint(info.crashAt);
      setPhase(info.cashedAt !== null ? 'cashed' : 'crashed');
      setHistory((prev) => {
        const next = [entry, ...prev].slice(0, 40);
        saveArcadeHistory(`cr_history_${uid}`, next);
        return next;
      });
    } else {
      const list = loadArcadeHistory<HistoryEntry>(`cr_history_${uid}`);
      saveArcadeHistory(`cr_history_${uid}`, [entry, ...list].slice(0, 40));
    }
  };

  // Leaving mid-round: keep any unlocked cashout; otherwise the round busts as it would.
  useEffect(
    () => () => {
      const info = roundRef.current;
      if (!info || info.settled) return;
      const elapsed = (Date.now() - info.startedAt) / 1000;
      const live = Math.exp(0.32 * elapsed);
      if (info.cashedAt === null && live < info.crashAt) {
        info.cashedAt = Math.round(live * 100) / 100;
      }
      settle(false);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const start = async () => {
    if (!currentUser || busy || phase === 'running' || isOffline) return;
    if (coinBalance < stake) {
      setError('Not enough Coins to launch.');
      return;
    }
    setBusy(true);
    setError(null);
    const id = newRoundId('CR');
    try {
      await arcadeDebit(currentUser.uid, stake, `Crash Rocket stake ${id}`, `cr-${id}-s`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not launch the rocket.');
      setBusy(false);
      return;
    }
    setBusy(false);
    const crashAt = rollCrashPoint();
    roundRef.current = {
      id,
      stake,
      crashAt,
      startedAt: Date.now(),
      cashedAt: null,
      settled: false,
    };
    setMultiplier(1);
    setCrashPoint(null);
    setCashedAt(null);
    setPhase('running');

    timerRef.current = window.setInterval(() => {
      const info = roundRef.current;
      if (!info) return;
      const elapsed = (Date.now() - info.startedAt) / 1000;
      const live = Math.exp(0.32 * elapsed);
      if (live >= info.crashAt) {
        setMultiplier(info.crashAt);
        settle(true);
        return;
      }
      setMultiplier(Math.round(live * 100) / 100);
    }, 70);
  };

  const cashOut = () => {
    const info = roundRef.current;
    if (!info || phase !== 'running' || info.cashedAt !== null) return;
    info.cashedAt = Math.round(multiplier * 100) / 100;
    settle(true);
  };

  const reset = () => {
    setPhase('idle');
    setMultiplier(1);
    setCrashPoint(null);
    setCashedAt(null);
    setError(null);
    roundRef.current = null;
  };

  const payoutPreview = Math.round(stake * multiplier);
  const tone =
    phase === 'crashed'
      ? 'text-rose-300'
      : phase === 'cashed'
      ? 'text-emerald-300'
      : 'text-white';

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
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-orange-300 via-rose-500 to-fuchsia-600 ring-1 ring-white/25 shadow-lg shadow-rose-500/40">
              <Rocket className="w-[18px] h-[18px] text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]" />
            </span>
            <span>Crash Rocket</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Cash out before the rocket crashes — the longer you ride, the bigger the multiplier.
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
        <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-br from-rose-600/20 via-[#111420] to-fuchsia-600/15 p-8 text-center space-y-4">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-300 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-rose-500/30">
            <Rocket className="w-7 h-7 text-white" />
          </div>
          <h2 className="font-display text-xl font-bold text-white">Sign in to launch</h2>
          <p className="text-sm text-slate-400 max-w-sm mx-auto">
            Crash Rocket runs on AddaBuzz Coins — sign in to board the next rocket.
          </p>
          <button
            type="button"
            onClick={onOpenAuth}
            className="px-6 py-2.5 rounded-full bg-gradient-to-r from-orange-400 to-fuchsia-500 text-white text-sm font-semibold inline-flex items-center gap-2 shadow-lg shadow-rose-900/40"
          >
            <LogIn className="w-4 h-4" /> Sign In
          </button>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr] items-start">
          <section className="relative overflow-hidden rounded-3xl border border-rose-300/20 bg-[linear-gradient(160deg,rgba(46,10,32,0.95),rgba(10,10,20,0.98)_55%,rgba(26,10,40,0.98))] p-4 sm:p-5">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-[radial-gradient(closest-side,rgba(244,63,94,0.3),transparent)] blur-2xl"
            />
            <div className="relative h-56 overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0A0710]">
              <div
                aria-hidden="true"
                className="absolute inset-0 opacity-40"
                style={{
                  backgroundImage:
                    'linear-gradient(rgba(148,163,184,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.12) 1px, transparent 1px)',
                  backgroundSize: '36px 36px',
                }}
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                {phase === 'running' ? (
                  <Rocket className="crash-rocket h-10 w-10 rotate-45 text-orange-300 drop-shadow-[0_0_18px_rgba(251,146,60,0.8)]" />
                ) : (
                  <Flame
                    className={`h-9 w-9 ${
                      phase === 'crashed' ? 'text-rose-400' : 'text-slate-600'
                    }`}
                  />
                )}
                <p className={`font-display text-5xl font-black tabular-nums ${tone}`}>
                  ×{multiplier.toFixed(2)}
                </p>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                  {phase === 'running'
                    ? 'Live multiplier'
                    : phase === 'cashed'
                    ? `Cashed out at ×${cashedAt?.toFixed(2)}`
                    : phase === 'crashed'
                    ? `Crashed at ×${crashPoint?.toFixed(2)}`
                    : 'Board the next rocket'}
                </p>
              </div>
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
                          ? 'border-rose-300/60 bg-gradient-to-b from-rose-400/30 to-fuchsia-600/20 text-rose-100'
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
                  className="w-full h-12 rounded-2xl bg-gradient-to-r from-emerald-400 via-teal-500 to-emerald-600 text-emerald-950 text-sm font-black inline-flex items-center justify-center gap-2 shadow-[0_16px_36px_-14px_rgba(16,185,129,0.9)] ring-1 ring-white/25 active:scale-[0.99] transition-transform"
                >
                  <TrendingUp className="w-4 h-4" />
                  Cash out ×{multiplier.toFixed(2)} · {fmtCoins(payoutPreview)}
                </button>
              ) : phase === 'idle' ? (
                <button
                  type="button"
                  onClick={() => void start()}
                  disabled={busy || isOffline}
                  className="w-full h-12 rounded-2xl bg-gradient-to-r from-orange-400 via-rose-500 to-fuchsia-600 text-white text-sm font-bold inline-flex items-center justify-center gap-2 shadow-[0_16px_36px_-14px_rgba(244,63,94,0.9)] ring-1 ring-white/20 disabled:opacity-45 disabled:cursor-not-allowed active:scale-[0.99] transition-transform"
                >
                  <Rocket className="w-4 h-4" />
                  {busy ? 'Launching…' : `Launch · ${fmtCoins(stake)}`}
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
                      ? `Cashed out at ×${cashedAt?.toFixed(2)} — ${fmtCoins(
                          Math.round(stake * (cashedAt ?? 0))
                        )} Coins`
                      : `Rocket crashed at ×${crashPoint?.toFixed(2)} — stake lost`}
                  </div>
                  <button
                    type="button"
                    onClick={reset}
                    className="w-full h-12 rounded-2xl border border-white/10 bg-white/[0.06] hover:bg-white/[0.1] text-slate-200 text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors"
                  >
                    <TimerReset className="w-4 h-4" /> Play again
                  </button>
                </div>
              )}
              {isOffline && (
                <p className="text-center text-[10px] font-medium text-rose-300/80">
                  Offline — reconnecting before the next launch.
                </p>
              )}
            </div>
          </section>

          <aside className="space-y-4">
            <section className="rounded-3xl border border-white/[0.07] bg-[#111420] p-4 sm:p-5">
              <h2 className="font-display text-sm font-semibold text-white">How it works</h2>
              <ul className="mt-3 space-y-2 text-[11px] leading-relaxed text-slate-400">
                <li>Ride the multiplier as it climbs, then tap cash out.</li>
                <li>If the rocket crashes first, the round's stake is gone.</li>
                <li>Cash out any time while the multiplier is still rising.</li>
              </ul>
              <div className="mt-3 grid grid-cols-3 gap-1.5 text-center">
                {[
                  ['×1.5', '~66%'],
                  ['×2', '~49%'],
                  ['×5', '~19%'],
                ].map(([mult, chance]) => (
                  <div
                    key={mult}
                    className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-2 py-1.5"
                  >
                    <p className="font-mono text-[11px] font-bold text-rose-300">{mult}</p>
                    <p className="text-[9px] text-slate-500">{chance} reach</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-white/[0.07] bg-[#111420] p-4 sm:p-5">
              <h2 className="font-display text-sm font-semibold text-white">Recent rounds</h2>
              {history.length === 0 ? (
                <p className="mt-3 text-[11px] text-slate-500">
                  No rounds yet — your rides will show up here.
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
                            h.cashoutAt !== null ? 'bg-emerald-400' : 'bg-rose-400'
                          }`}
                        />
                        {h.cashoutAt !== null
                          ? `Out ×${h.cashoutAt.toFixed(2)}`
                          : `Crash ×${h.crashAt.toFixed(2)}`}
                      </span>
                      <span
                        className={`font-mono font-bold tabular-nums ${
                          h.payout >= h.stake ? 'text-emerald-300' : 'text-rose-300'
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
