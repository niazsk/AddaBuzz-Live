import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  CircleHelp,
  Coins,
  History,
  Loader2,
  Sparkles,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  X,
  ZapOff,
} from 'lucide-react';
import { UserProfile } from '../../types/app';
import {
  FRUIT_MANOR_CONFIG,
  FRUIT_BY_ID,
  FruitId,
  chipLabel,
  formatCoins,
  fruitProbability,
  theoreticalReturn,
} from '../../games/fruitManor/config';
import {
  FmEvent,
  FmSnapshot,
  FruitManorEngine,
  RoundPhase,
} from '../../games/fruitManor/engine';
import { fmAudio, setMuted, unlockAudio } from '../../games/fruitManor/audio';
import { FruitIcon } from '../games/FruitIcon';
import { FruitWheel } from '../games/FruitWheel';

const CFG = FRUIT_MANOR_CONFIG;

interface FruitManorViewProps {
  currentUser: UserProfile;
  coinBalance: number;
  isOffline: boolean;
  onBack: () => void;
  onOpenHistory: () => void;
}

const PHASE_META: Record<RoundPhase, { label: string; cls: string }> = {
  SCHEDULED: { label: 'Starting soon', cls: 'bg-slate-400/15 text-slate-300 border-slate-400/30' },
  OPEN: { label: 'Betting open', cls: 'bg-emerald-400/15 text-emerald-300 border-emerald-400/40' },
  LOCKED: { label: 'Bets locked', cls: 'bg-amber-400/15 text-amber-300 border-amber-400/40' },
  DRAWN: { label: 'Drawing result', cls: 'bg-sky-400/15 text-sky-300 border-sky-400/40' },
  SETTLING: { label: 'Settling', cls: 'bg-violet-400/15 text-violet-300 border-violet-400/40' },
  SETTLED: { label: 'Round settled', cls: 'bg-amber-300/15 text-amber-200 border-amber-300/40' },
  VOIDED: { label: 'Voided — refunded', cls: 'bg-rose-400/15 text-rose-300 border-rose-400/40' },
};

const UNLIMITED_CHIP = Infinity;

const CHIP_STYLES: Record<number, { ring: string; face: string; text: string }> = {
  10: { ring: '#94A3B8', face: '#334155', text: '#E2E8F0' },
  100: { ring: '#38BDF8', face: '#0C4A6E', text: '#BAE6FD' },
  1000: { ring: '#A855F7', face: '#4C1D95', text: '#E9D5FF' },
  5000: { ring: '#F5B93F', face: '#78350F', text: '#FDE68A' },
  50000: { ring: '#FB7185', face: '#881337', text: '#FECDD3' },
  [UNLIMITED_CHIP]: { ring: '#22D3EE', face: '#082F49', text: '#A5F3FC' },
};

function readPref(key: string, fallback: boolean): boolean {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : raw === '1';
  } catch {
    return fallback;
  }
}

function writePref(key: string, value: boolean) {
  try {
    localStorage.setItem(key, value ? '1' : '0');
  } catch {
    // ignore
  }
}

export const FruitManorView: React.FC<FruitManorViewProps> = ({
  currentUser,
  coinBalance,
  isOffline,
  onBack,
  onOpenHistory,
}) => {
  const [snap, setSnap] = useState<FmSnapshot | null>(null);
  const engineRef = useRef<FruitManorEngine | null>(null);
  const [selectedChip, setSelectedChip] = useState<number>(100);
  const [placing, setPlacing] = useState<Partial<Record<FruitId, boolean>>>({});
  const [betError, setBetError] = useState<string | null>(null);
  const [burstKey, setBurstKey] = useState(0);
  const [burstAccent, setBurstAccent] = useState('#F5B93F');
  const [burstBig, setBurstBig] = useState(false);
  const [shake, setShake] = useState(false);
  const [soundOn, setSoundOn] = useState(() => readPref('fm_sound', true));
  const [reducedMotion, setReducedMotion] = useState(() =>
    readPref('fm_motion', typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  );
  const [rulesOpen, setRulesOpen] = useState(false);
  const lastUrgentRef = useRef(-1);
  const eventsRef = useRef<(ev: FmEvent) => void>(() => {});

  useEffect(() => {
    setMuted(!soundOn);
  }, [soundOn]);

  useEffect(() => {
    const engine = new FruitManorEngine(currentUser.uid, currentUser.username);
    engineRef.current = engine;
    const unsub = engine.subscribe(setSnap);
    const unsubEv = engine.onEvent((ev) => eventsRef.current(ev));
    return () => {
      unsub();
      unsubEv();
      engine.destroy();
      engineRef.current = null;
    };
  }, [currentUser.uid]);

  useEffect(() => {
    engineRef.current?.setPaused(isOffline);
  }, [isOffline]);

  eventsRef.current = (ev: FmEvent) => {
    if (ev.type === 'phase') {
      if (ev.phase === 'OPEN') {
        fmAudio.roundStart();
        setBetError(null);
        lastUrgentRef.current = -1;
      } else if (ev.phase === 'LOCKED') {
        fmAudio.lock();
        if (!reducedMotion) {
          setShake(true);
          window.setTimeout(() => setShake(false), 450);
        }
      } else if (ev.phase === 'DRAWN') {
        fmAudio.spinStart();
      }
    } else if (ev.type === 'settled') {
      if (ev.totalStake > 0) {
        const fruit = FRUIT_BY_ID.get(ev.resultFruitId);
        if (ev.net > 0) {
          const big = ev.totalPayout >= 10000 || ev.net >= ev.totalStake * 4;
          setBurstAccent(fruit?.accentHex ?? '#F5B93F');
          setBurstBig(big);
          setBurstKey((k) => k + 1);
          if (big) fmAudio.bigWin();
          else fmAudio.win();
        } else {
          fmAudio.lose();
        }
      }
    } else if (ev.type === 'betsAccepted') {
      fmAudio.confirm();
      setBetError(null);
    } else if (ev.type === 'betsCancelled') {
      fmAudio.refund();
    } else if (ev.type === 'rejected') {
      fmAudio.reject();
      setBetError(ev.reason);
    }
  };

  // Countdown urgency ticks in the final 3 seconds of betting.
  useEffect(() => {
    if (!snap || snap.round.phase !== 'OPEN' || snap.paused) return;
    const remaining = snap.phaseEndsAt - snap.serverNow;
    const sec = Math.ceil(remaining / 1000);
    if (remaining <= 3200 && sec !== lastUrgentRef.current) {
      lastUrgentRef.current = sec;
      fmAudio.urgent();
    }
  }, [snap]);

  const round = snap?.round;
  const phase = round?.phase ?? 'SCHEDULED';
  const remainingMs = snap ? Math.max(0, snap.phaseEndsAt - snap.serverNow) : 0;
  const remainingSec = Math.ceil(remainingMs / 1000);
  const openProgress = phase === 'OPEN' ? Math.max(0, Math.min(1, remainingMs / CFG.openMs)) : 0;
  const acceptedBets = useMemo(() => snap?.myBets ?? [], [snap]);
  const acceptedStake = snap?.myStake ?? 0;
  const poolStake = snap?.poolStake ?? 0;
  const players = snap?.players ?? 0;
  const canBet = phase === 'OPEN' && !isOffline && !!snap?.connected && !snap?.paused;

  const lastResult = snap?.recentResults[0];
  const lastResultFruit = lastResult ? FRUIT_BY_ID.get(lastResult.fruitId) : undefined;
  const lastRoundNet = useMemo(() => {
    if (!lastResult || !snap) return null;
    const rows = snap.history.filter((h) => h.roundId === lastResult.roundId && h.outcome !== 'REFUND');
    if (!rows.length) return null;
    return rows.reduce((s, h) => s + h.payout - h.stake, 0);
  }, [snap, lastResult]);

  const stakeByFruit = useMemo(() => {
    const map = new Map<FruitId, number>();
    CFG.fruits.forEach((f) => map.set(f.fruitId, snap?.poolByFruit?.[f.fruitId] ?? 0));
    return map;
  }, [snap]);

  const myStakeByFruit = useMemo(() => {
    const map = new Map<FruitId, number>();
    CFG.fruits.forEach((f) => map.set(f.fruitId, 0));
    acceptedBets.forEach((b) => map.set(b.fruitId, (map.get(b.fruitId) ?? 0) + b.stake));
    return map;
  }, [acceptedBets]);

  const tapFruit = async (fruitId: FruitId) => {
    unlockAudio();
    if (!canBet || placing[fruitId]) return;
    const stake = selectedChip === UNLIMITED_CHIP ? coinBalance : selectedChip;
    if (stake > coinBalance) {
      setBetError(`Not enough Coins — you have ${formatCoins(coinBalance)}.`);
      fmAudio.reject();
      return;
    }
    fmAudio.place();
    setBetError(null);
    setPlacing((p) => ({ ...p, [fruitId]: true }));
    const key = `fm-d-${round?.roundId}-${fruitId}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const res = await engineRef.current?.placeBet(fruitId, stake, coinBalance, key, selectedChip === UNLIMITED_CHIP);
    setPlacing((p) => {
      const next = { ...p };
      delete next[fruitId];
      return next;
    });
    if (res && !res.ok) setBetError(res.reason ?? 'Bet rejected.');
  };

  const cancelAccepted = () => {
    const res = engineRef.current?.cancelBets();
    if (res && !res.ok) setBetError(res.reason ?? 'Cancellation failed.');
    else setBetError(null);
  };

  const toggleSound = () => {
    unlockAudio();
    setSoundOn((s) => {
      writePref('fm_sound', !s);
      if (!s) fmAudio.chip();
      return !s;
    });
  };

  const toggleMotion = () => {
    setReducedMotion((m) => {
      writePref('fm_motion', !m);
      return !m;
    });
  };

  const phaseMeta = PHASE_META[phase];

  return (
    <div
      className="fm-root relative -mx-4 -mt-6 min-h-[calc(100vh-52px)] overflow-x-hidden px-3 pb-24 pt-2 sm:-mx-6 sm:px-4 lg:-mx-8 lg:px-6 lg:pb-10"
      onPointerDownCapture={unlockAudio}
    >
      {/* Layered orchard backdrop */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute inset-0 bg-[#07130D]" />
        <div className="fm-glow-a absolute -top-32 left-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(20,83,45,0.55),transparent)] blur-2xl" />
        <div className="absolute -bottom-40 -left-24 h-[380px] w-[380px] rounded-full bg-[radial-gradient(closest-side,rgba(245,185,63,0.10),transparent)] blur-2xl" />
        <div className="absolute -right-24 top-1/3 h-[360px] w-[360px] rounded-full bg-[radial-gradient(closest-side,rgba(168,85,247,0.10),transparent)] blur-2xl" />
        <div className="fm-grain absolute inset-0 opacity-[0.05]" />
      </div>

      <div className="relative mx-auto w-full max-w-[980px]">
        {/* Header */}
        <header className="flex items-center justify-between gap-2 py-1">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={onBack}
              aria-label="Back to profile"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.05] text-slate-200 transition-colors hover:bg-white/[0.1]"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-emerald-500/30 to-amber-500/20 border border-emerald-300/25">
              <FruitIcon fruitId="grapes" className="h-6 w-6" />
            </div>
            <h1 className="font-display truncate text-base font-extrabold tracking-tight text-[#F7F3E8]">
              Fruit Manor
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <span
              className={`mr-0.5 hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold sm:flex ${
                isOffline ? 'border-amber-400/40 bg-amber-400/10 text-amber-300' : 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
              }`}
            >
              {isOffline ? <WifiOff className="h-3 w-3" /> : <Wifi className="h-3 w-3" />}
              {isOffline ? 'Offline' : 'Online'}
            </span>
            <button
              type="button"
              onClick={onOpenHistory}
              aria-label="Open my game history"
              className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/[0.05] text-slate-200 transition-colors hover:bg-white/[0.1]"
            >
              <History className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={toggleSound}
              aria-label={soundOn ? 'Mute sound' : 'Unmute sound'}
              aria-pressed={soundOn}
              className={`grid h-9 w-9 place-items-center rounded-xl border transition-colors ${
                soundOn ? 'border-amber-300/30 bg-amber-400/10 text-amber-300' : 'border-white/10 bg-white/[0.05] text-slate-400'
              }`}
            >
              {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={toggleMotion}
              aria-label={reducedMotion ? 'Enable full motion' : 'Reduce motion'}
              aria-pressed={reducedMotion}
              className={`grid h-9 w-9 place-items-center rounded-xl border transition-colors ${
                !reducedMotion ? 'border-emerald-300/30 bg-emerald-400/10 text-emerald-300' : 'border-white/10 bg-white/[0.05] text-slate-400'
              }`}
            >
              {reducedMotion ? <ZapOff className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={() => setRulesOpen(true)}
              aria-label="Game rules and help"
              className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/[0.05] text-slate-200 transition-colors hover:bg-white/[0.1]"
            >
              <CircleHelp className="h-4 w-4" />
            </button>
          </div>
        </header>

        {isOffline && (
          <div className="mt-2 flex items-center gap-2 rounded-xl border border-amber-400/40 bg-amber-950/70 px-3 py-2.5 text-xs text-amber-100">
            <WifiOff className="h-4 w-4 shrink-0 text-amber-300" />
            <span>Connection lost — rounds are paused. Betting resumes automatically when you reconnect.</span>
          </div>
        )}

        {snap?.error && (
          <div className="mt-2 flex items-start gap-2 rounded-xl border border-rose-400/40 bg-rose-950/70 px-3 py-2.5 text-xs text-rose-100">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" />
            <span className="leading-relaxed">{snap.error}</span>
          </div>
        )}

        <div className="mt-2 grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-2 [grid-template-areas:'status_status'_'wheel_board'_'recent_board'_'chips_chips'] lg:grid-cols-[minmax(0,300px)_minmax(0,1fr)] lg:gap-4 lg:[grid-template-areas:'status_board'_'wheel_chips'_'recent_chips']">
          {/* Round status + wallet + always-visible last result */}
          <div className="[grid-area:status] rounded-2xl border border-white/[0.08] bg-[#0B1F16]/85 px-3 py-1.5 backdrop-blur lg:self-start">
            <div className="flex items-center justify-between gap-2">
              <span className="min-w-0 truncate font-mono text-xs font-bold text-[#F7F3E8]">{round?.roundId ?? 'FM-…'}</span>
              <span className="flex shrink-0 items-center gap-1 rounded-full border border-amber-300/25 bg-amber-400/[0.08] px-1.5 py-0.5" title="Your AddaBuzz Coin balance">
                <Coins className="h-3 w-3 text-amber-300" />
                <span className="font-mono text-[11px] font-black tabular-nums text-amber-300">{formatCoins(coinBalance)}</span>
              </span>
              <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${phaseMeta.cls}`}>
                {phaseMeta.label}
              </span>
              <span className={`shrink-0 font-mono text-base font-black tabular-nums ${phase === 'OPEN' && remainingSec <= 3 ? 'text-rose-300' : 'text-amber-300'}`}>
                {phase === 'OPEN' || phase === 'SCHEDULED' ? `${remainingSec}s` : '—'}
              </span>
            </div>
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/[0.07]">
              <div
                className={`h-full rounded-full transition-[width] duration-200 ${
                  phase === 'OPEN' && remainingSec <= 3
                    ? 'bg-gradient-to-r from-rose-500 to-amber-400'
                    : 'bg-gradient-to-r from-emerald-400 to-amber-300'
                }`}
                style={{ width: phase === 'OPEN' ? `${openProgress * 100}%` : phase === 'SCHEDULED' ? '100%' : '0%' }}
              />
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-[9px] font-semibold">
              <span className="rounded-full bg-emerald-400/10 px-1.5 py-px text-emerald-200/80">
                {players} playing
              </span>
              <span className="rounded-full bg-amber-400/10 px-1.5 py-px text-amber-200/80">
                shared pool {formatCoins(poolStake)}
              </span>
            </div>
            <div className="mt-1.5 flex items-center gap-1.5">
              <span className="shrink-0 text-[8px] font-semibold uppercase tracking-[0.14em] text-emerald-200/60">Last result</span>
              {lastResultFruit && lastResult ? (
                <>
                  <span
                    key={lastResult.roundId}
                    className="fm-result-pop flex min-w-0 items-center gap-1 rounded-full border bg-black/30 px-1.5 py-0.5"
                    style={{ borderColor: `${lastResultFruit.accentHex}66` }}
                    title={lastResult.roundId}
                  >
                    <FruitIcon fruitId={lastResultFruit.fruitId} className="h-4 w-4 shrink-0" />
                    <span className="truncate text-[10px] font-bold text-[#EAF5EC]">{lastResultFruit.label}</span>
                    <span className="shrink-0 font-mono text-[9px] font-black" style={{ color: lastResultFruit.accentHex }}>×{lastResultFruit.multiplier}</span>
                  </span>
                  {lastRoundNet !== null ? (
                    <span
                      className={`shrink-0 rounded-full px-1.5 py-0.5 font-mono text-[10px] font-black tabular-nums ${
                        lastRoundNet > 0 ? 'bg-emerald-400/15 text-emerald-300' : lastRoundNet === 0 ? 'bg-slate-400/15 text-slate-300' : 'bg-rose-400/15 text-rose-300'
                      }`}
                    >
                      {lastRoundNet > 0 ? `+${formatCoins(lastRoundNet)}` : lastRoundNet === 0 ? '±0' : `−${formatCoins(-lastRoundNet)}`}
                    </span>
                  ) : (
                    <span className="shrink-0 text-[9px] text-slate-500">no bet that round</span>
                  )}
                  <span className="ml-auto hidden shrink-0 font-mono text-[8px] text-slate-500 sm:block">{lastResult.roundId}</span>
                </>
              ) : (
                <span className="text-[10px] text-slate-400">First round is on its way — the result stays here.</span>
              )}
            </div>
          </div>

          <div className={`[grid-area:wheel] mx-auto w-full max-w-[140px] lg:max-w-[280px] ${shake ? 'fm-shake' : ''}`}>
            <FruitWheel
              fruits={CFG.fruits}
              roundId={round?.roundId ?? ''}
              phase={phase}
              resultFruitId={round?.resultFruitId}
              lastFruitId={lastResult?.fruitId}
              spinMs={CFG.spinMs}
              reducedMotion={reducedMotion}
              burstKey={burstKey}
              burstAccent={burstAccent}
              burstBig={burstBig}
              onPeg={() => fmAudio.peg()}
              onSpinEnd={() => {}}
            />
          </div>

          <div className="[grid-area:recent] rounded-2xl border border-white/[0.08] bg-[#0B1F16]/85 px-2.5 py-1.5">
            {(snap?.recentResults.length ?? 0) === 0 ? (
              <p className="py-0.5 text-[10px] text-slate-400">Results land here after every round.</p>
            ) : (
              <div className="fm-recent flex items-center gap-1 overflow-x-auto">
                <span className="mr-0.5 shrink-0 text-[8px] font-semibold uppercase tracking-[0.14em] text-emerald-200/60">Recent</span>
                {snap?.recentResults.slice(0, 12).map((r) => {
                  const f = FRUIT_BY_ID.get(r.fruitId);
                  return (
                    <span
                      key={r.roundId}
                      title={`${r.roundId}: ${f?.label ?? r.fruitId} ×${f?.multiplier ?? ''}`}
                      className="grid h-6.5 w-6.5 shrink-0 place-items-center rounded-full border bg-black/30"
                      style={{ borderColor: `${f?.accentHex ?? '#fff'}66` }}
                    >
                      <FruitIcon fruitId={r.fruitId} className="h-4.5 w-4.5" />
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {/* Eight-cell board — tap = instant bet */}
          <div className="[grid-area:board] grid grid-cols-4 grid-rows-2 gap-1.5 self-stretch" role="group" aria-label="Fruit betting board">
            {CFG.fruits.map((f) => {
              const st = stakeByFruit.get(f.fruitId) ?? 0;
              const mine = myStakeByFruit.get(f.fruitId) ?? 0;
              const isWinner = lastResult?.fruitId === f.fruitId;
              const active = st > 0;
              const busy = !!placing[f.fruitId];
              return (
                <button
                  key={f.fruitId}
                  type="button"
                  onClick={() => void tapFruit(f.fruitId)}
                  disabled={!canBet || busy}
                  aria-label={`Bet ${formatCoins(selectedChip)} coins on ${f.label}, multiplier ${f.multiplier}${st ? `, ${st} coins on the shared board` : ''}${mine ? `, ${mine} of them yours` : ''}`}
                  className={`fm-cell group relative flex flex-col items-center justify-center gap-0.5 rounded-xl border px-1 pb-1.5 pt-1.5 transition-all duration-150 ${
                    canBet && !busy ? 'hover:-translate-y-0.5 active:scale-[0.97]' : 'cursor-not-allowed opacity-70'
                  } ${isWinner ? 'fm-cell-winner' : ''}`}
                  style={{
                    borderColor: isWinner ? f.accentHex : active ? `${f.accentHex}88` : 'rgba(255,255,255,0.09)',
                    background: active
                      ? `linear-gradient(165deg, ${f.accentHex}26, rgba(9,26,18,0.92) 62%)`
                      : 'linear-gradient(165deg, rgba(255,255,255,0.045), rgba(9,26,18,0.92) 62%)',
                    boxShadow: isWinner ? `0 0 0 1.5px ${f.accentHex}, 0 0 24px ${f.accentHex}55` : active ? `0 4px 16px ${f.accentHex}22` : undefined,
                  }}
                >
                  <FruitIcon fruitId={f.fruitId} className={`w-8 sm:w-9 ${canBet && !busy ? 'group-hover:scale-110' : ''} transition-transform drop-shadow-[0_3px_5px_rgba(0,0,0,0.45)]`} />
                  <span className="w-full truncate text-center text-[9px] font-semibold text-[#EAF5EC]">{f.label}</span>
                  <span
                    className="rounded-full px-1 py-px text-[9px] font-black tabular-nums"
                    style={{ background: `${f.accentHex}22`, color: f.accentHex, border: `1px solid ${f.accentHex}44` }}
                  >
                    ×{f.multiplier}
                  </span>
                  {st > 0 && (
                    <span className="fm-chip-badge absolute -right-1.5 -top-1.5 flex items-center gap-0.5 rounded-full border border-amber-300/60 bg-gradient-to-r from-amber-400 to-amber-500 px-1 py-px font-mono text-[8px] font-black text-[#3B2A05] shadow">
                      {formatCoins(st)}
                    </span>
                  )}
                  {mine > 0 && (
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full border border-emerald-300/50 bg-emerald-500/90 px-1 py-px font-mono text-[7px] font-black text-emerald-950 shadow">
                      YOU {formatCoins(mine)}
                    </span>
                  )}
                  {busy && (
                    <span className="absolute inset-0 grid place-items-center rounded-xl bg-black/45">
                      <Loader2 className="h-4 w-4 animate-spin text-amber-300" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Chips + round stake + cancel */}
          <div className="[grid-area:chips] rounded-2xl border border-white/[0.08] bg-[#0B1F16]/85 px-2.5 py-1.5 lg:self-start">
            <div className="flex items-center justify-between gap-1.5 sm:justify-start sm:gap-2.5">
              {[...CFG.chips, UNLIMITED_CHIP].map((c) => {
                const st = CHIP_STYLES[c];
                const selected = selectedChip === c;
                const affordable = c === UNLIMITED_CHIP ? true : coinBalance >= c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      unlockAudio();
                      fmAudio.chip();
                      setSelectedChip(c);
                    }}
                    aria-label={`Select ${chipLabel(c)} chip (${c === UNLIMITED_CHIP ? 'all your Coins' : `${formatCoins(c)} coins`})`}
                    aria-pressed={selected}
                    className={`fm-chip relative grid h-9 w-9 shrink-0 place-items-center rounded-full transition-all duration-150 sm:h-11 sm:w-11 ${
                      selected ? '-translate-y-1' : 'hover:-translate-y-0.5'
                    } ${affordable ? '' : 'opacity-45 saturate-50'}`}
                    style={{
                      background: `radial-gradient(circle at 35% 30%, ${st.face}, #060D09 130%)`,
                      border: `3px dashed ${st.ring}`,
                      boxShadow: selected ? `0 0 0 2px ${st.ring}, 0 6px 18px ${st.ring}55` : `0 3px 8px rgba(0,0,0,0.5)`,
                    }}
                  >
                    <span className="font-mono text-[10px] font-black" style={{ color: st.text }}>
                      {chipLabel(c)}
                    </span>
                  </button>
                );
              })}
              <p className="ml-auto hidden text-right text-[9px] leading-snug text-slate-400 sm:block">
                Tap a fruit — the selected chip is bet instantly.
              </p>
            </div>

            <div className="mt-1.5 flex items-center justify-between gap-2 border-t border-white/[0.07] pt-1">
              <div className="leading-tight">
                <p className="text-[9px] uppercase tracking-wide text-slate-400">
                  Your stake{acceptedBets.length > 0 ? ` · ${acceptedBets.length} bet${acceptedBets.length > 1 ? 's' : ''}` : ''}
                </p>
                <p className="font-mono text-sm font-black tabular-nums text-[#F7F3E8]">
                  {formatCoins(acceptedStake)}
                  <span className="ml-1 text-[9px] font-semibold text-slate-400">coins</span>
                </p>
              </div>
              {CFG.cancellationEnabled && acceptedBets.length > 0 && canBet ? (
                <button
                  type="button"
                  onClick={cancelAccepted}
                  className="h-9 rounded-xl border border-white/15 bg-white/[0.05] px-2.5 text-[11px] font-bold text-slate-200 transition-colors hover:bg-white/[0.1]"
                >
                  Cancel bets
                </button>
              ) : (
                <p className="truncate text-[10px] text-slate-500">
                  {canBet ? 'Tap a fruit to bet instantly' : 'Waiting for next window…'}
                </p>
              )}
            </div>
            {betError && <p className="mt-1.5 text-[10px] font-medium text-rose-300">{betError}</p>}
          </div>
        </div>

        <p className="mt-2 pb-1 text-center text-[9px] leading-relaxed text-emerald-200/40">
          Bets use your AddaBuzz Coins — platform points with no cash value. Config {CFG.configVersion}.
        </p>
      </div>

      {/* Rules modal */}
      {rulesOpen && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true" aria-label="Fruit Manor rules">
          <div className="fm-rules-panel max-h-[86vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-white/10 bg-[#0A1C13] p-4 sm:rounded-2xl">
            <div className="flex items-center justify-between">
              <h2 className="font-display flex items-center gap-2 text-base font-extrabold text-[#F7F3E8]">
                <CircleHelp className="h-4.5 w-4.5 text-amber-300" /> How to play
              </h2>
              <button
                type="button"
                aria-label="Close rules"
                onClick={() => setRulesOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-white/[0.08] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <ol className="mt-3 space-y-2 text-xs leading-relaxed text-slate-300">
              <li className="flex gap-2"><span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-amber-400/15 font-mono text-[10px] font-black text-amber-300">1</span>Fruit Manor runs one shared board for everybody — you join automatically when you open it, and everyone sees the same round, the same timer and the same result.</li>
              <li className="flex gap-2"><span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-amber-400/15 font-mono text-[10px] font-black text-amber-300">2</span>While betting is open, pick a chip value and tap a fruit cell — the bet is confirmed instantly and your Coins are debited once. The badge shows the whole shared pool on that fruit, the green tag shows your own stake.</li>
              <li className="flex gap-2"><span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-amber-400/15 font-mono text-[10px] font-black text-amber-300">3</span>Tap more fruits to spread stakes, or Cancel bets any time before lock for a full refund.</li>
              <li className="flex gap-2"><span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-amber-400/15 font-mono text-[10px] font-black text-amber-300">4</span>Betting locks, the wheel spins and the result is revealed. Winning bets pay stake × multiplier straight back to your Coin balance; every debit, payout and refund is recorded in My game history.</li>
            </ol>

            <div className="mt-3 rounded-xl border border-amber-300/25 bg-amber-400/[0.07] p-2.5 text-[11px] leading-relaxed text-amber-100/90">
              <strong className="font-bold text-amber-300">Payout basis:</strong> the multiplier is the <strong>gross return including your stake</strong>. Example: 100 coins on Watermelon ×18 returns 1,800 coins (1,700 profit). All amounts are whole coins.
            </div>

            <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-200/60">Odds — config {CFG.configVersion}</p>
            <div className="mt-1.5 overflow-hidden rounded-xl border border-white/[0.08]">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-white/[0.05] text-[9px] uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-2 py-1.5 font-semibold">Fruit</th>
                    <th className="px-2 py-1.5 font-semibold">Multiplier</th>
                    <th className="px-2 py-1.5 text-right font-semibold">Chance</th>
                  </tr>
                </thead>
                <tbody>
                  {CFG.fruits.map((f) => (
                    <tr key={f.fruitId} className="border-t border-white/[0.05]">
                      <td className="px-2 py-1.5">
                        <span className="flex items-center gap-1.5 font-semibold text-slate-200">
                          <FruitIcon fruitId={f.fruitId} className="h-4 w-4" /> {f.label}
                        </span>
                      </td>
                      <td className="px-2 py-1.5 font-mono font-bold" style={{ color: f.accentHex }}>×{f.multiplier}</td>
                      <td className="px-2 py-1.5 text-right font-mono tabular-nums text-slate-300">{(fruitProbability(f.fruitId) * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-1.5 text-[10px] text-slate-400">
              Theoretical return ≈ {(theoreticalReturn() * 100).toFixed(1)}% of total stakes over time. One shared board runs for every player at once — the round clock, the pool and the result are identical for everybody. Results are drawn with a cryptographically secure RNG, never by the wheel animation.
            </p>

            <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] text-slate-300">
              <div className="rounded-lg border border-white/[0.07] bg-white/[0.03] p-2">
                <p className="font-bold text-slate-200">Stake limits</p>
                <p className="mt-0.5">Min {formatCoins(CFG.minStake)} · Max {formatCoins(CFG.maxStakePerBet)} per bet</p>
                <p>Unlimited bets & round stake — only your Coin balance limits you</p>
              </div>
              <div className="rounded-lg border border-white/[0.07] bg-white/[0.03] p-2">
                <p className="font-bold text-slate-200">Round timing</p>
                <p className="mt-0.5">{CFG.openMs / 1000}s betting window</p>
                <p>{(CFG.lockedMs + CFG.spinMs + CFG.settlingMs) / 1000}s lock, draw & settle</p>
              </div>
            </div>

            <div className="mt-3 rounded-xl border border-white/[0.08] bg-white/[0.03] p-2.5 text-[11px] leading-relaxed text-slate-300">
              <p className="font-bold text-slate-200">Your Coins</p>
              <p className="mt-1">
                Fruit Manor plays with your real AddaBuzz Coin balance ({formatCoins(coinBalance)} coins). Every bet debits your wallet atomically and every win or refund credits it back — the same ledger as gifts and transfers. Diamonds are never used. Coins are platform points: no cash value, no purchases, no withdrawals.
              </p>
              <p className="mt-1 text-slate-400">Config {CFG.configVersion} · effective {CFG.effectiveLabel} · interrupted rounds are voided and stakes refunded automatically.</p>
            </div>
          </div>
        </div>
      )}

      {/* Loading state before first snapshot */}
      {!snap && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-[#07130D]">
          <div className="flex items-center gap-2.5 text-sm text-emerald-200">
            <Loader2 className="h-5 w-5 animate-spin text-amber-300" />
            Connecting to Fruit Manor…
          </div>
        </div>
      )}
    </div>
  );
};