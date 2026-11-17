import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  CircleHelp,
  Coins,
  History,
  Loader2,
  RotateCcw,
  Sparkles,
  Trash2,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  X,
  Zap,
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
}

interface SlipEntry {
  fruitId: FruitId;
  stake: number;
}

interface OutcomeSummary {
  roundId: string;
  resultFruitId: FruitId;
  totalStake: number;
  totalPayout: number;
  net: number;
  wins: number;
  bets: { betId: string; fruitId: FruitId; stake: number; multiplier: number; payout: number; debitRef: string; creditRef?: string }[];
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

const CHIP_STYLES: Record<number, { ring: string; face: string; text: string }> = {
  10: { ring: '#94A3B8', face: '#334155', text: '#E2E8F0' },
  100: { ring: '#38BDF8', face: '#0C4A6E', text: '#BAE6FD' },
  1000: { ring: '#A855F7', face: '#4C1D95', text: '#E9D5FF' },
  5000: { ring: '#F5B93F', face: '#78350F', text: '#FDE68A' },
  50000: { ring: '#FB7185', face: '#881337', text: '#FECDD3' },
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
}) => {
  const [snap, setSnap] = useState<FmSnapshot | null>(null);
  const engineRef = useRef<FruitManorEngine | null>(null);
  const [selectedChip, setSelectedChip] = useState<number>(100);
  const [slip, setSlip] = useState<SlipEntry[]>([]);
  const [slipError, setSlipError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<OutcomeSummary | null>(null);
  const [burstKey, setBurstKey] = useState(0);
  const [burstAccent, setBurstAccent] = useState('#F5B93F');
  const [burstBig, setBurstBig] = useState(false);
  const [shake, setShake] = useState(false);
  const [soundOn, setSoundOn] = useState(() => readPref('fm_sound', true));
  const [reducedMotion, setReducedMotion] = useState(() =>
    readPref('fm_motion', typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  );
  const [rulesOpen, setRulesOpen] = useState(false);
  const [resetArmed, setResetArmed] = useState(false);
  const [historyPage, setHistoryPage] = useState(0);
  const lastUrgentRef = useRef(-1);
  const eventsRef = useRef<(ev: FmEvent) => void>(() => {});

  useEffect(() => {
    setMuted(!soundOn);
  }, [soundOn]);

  useEffect(() => {
    const engine = new FruitManorEngine(currentUser.uid);
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
        setOutcome(null);
        setSlip([]);
        setSlipError(null);
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
        const summary: OutcomeSummary = {
          roundId: ev.roundId,
          resultFruitId: ev.resultFruitId,
          totalStake: ev.totalStake,
          totalPayout: ev.totalPayout,
          net: ev.net,
          wins: ev.wins,
          bets: ev.bets.map((b) => ({
            betId: b.betId,
            fruitId: b.fruitId,
            stake: b.stake,
            multiplier: b.multiplier,
            payout: b.payout,
            debitRef: b.debitRef,
            creditRef: b.creditRef,
          })),
        };
        setOutcome(summary);
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
      setSlipError(null);
    } else if (ev.type === 'betsCancelled') {
      fmAudio.refund();
    } else if (ev.type === 'rejected') {
      fmAudio.reject();
      setSlipError(ev.reason);
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
  const balance = snap?.balance ?? CFG.demoStartBalance;
  const acceptedBets = useMemo(() => round?.bets.filter((b) => b.status === 'ACCEPTED') ?? [], [snap, round]);
  const acceptedStake = acceptedBets.reduce((s, b) => s + b.stake, 0);
  const slipTotal = slip.reduce((s, e) => s + e.stake, 0);
  const canBet = phase === 'OPEN' && !isOffline && !snap?.paused;
  const winnerFruit = phase === 'SETTLED' && round?.resultFruitId ? FRUIT_BY_ID.get(round.resultFruitId) : undefined;

  const stakeByFruit = useMemo(() => {
    const map = new Map<FruitId, { accepted: number; pending: number }>();
    CFG.fruits.forEach((f) => map.set(f.fruitId, { accepted: 0, pending: 0 }));
    acceptedBets.forEach((b) => {
      const e = map.get(b.fruitId);
      if (e) e.accepted += b.stake;
    });
    slip.forEach((e) => {
      const cur = map.get(e.fruitId);
      if (cur) cur.pending += e.stake;
    });
    return map;
  }, [acceptedBets, slip]);

  const addChipToFruit = (fruitId: FruitId) => {
    unlockAudio();
    if (!canBet) return;
    if (acceptedBets.length + slip.length >= CFG.maxBetsPerRound) {
      setSlipError(`Maximum ${CFG.maxBetsPerRound} bets per round.`);
      fmAudio.reject();
      return;
    }
    if (acceptedStake + slipTotal + selectedChip > CFG.maxRoundStake) {
      setSlipError(`Round limit is ${formatCoins(CFG.maxRoundStake)} coins.`);
      fmAudio.reject();
      return;
    }
    fmAudio.place();
    setSlipError(null);
    setSlip((prev) => [...prev, { fruitId, stake: selectedChip }]);
  };

  const confirmSlip = () => {
    unlockAudio();
    const engine = engineRef.current;
    if (!engine || !slip.length || !canBet) return;
    const key = `fm-${round?.roundId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const res = engine.placeBets(slip, key);
    if (res.ok) {
      setSlip([]);
      setSlipError(null);
    } else {
      setSlipError(res.reason ?? 'Bet rejected.');
    }
  };

  const cancelAccepted = () => {
    const res = engineRef.current?.cancelBets();
    if (res && !res.ok) setSlipError(res.reason ?? 'Cancellation failed.');
    else setSlipError(null);
  };

  const history = snap?.history ?? [];
  const pageSize = 5;
  const pageCount = Math.max(1, Math.ceil(history.length / pageSize));
  const safePage = Math.min(historyPage, pageCount - 1);
  const historyRows = history.slice(safePage * pageSize, safePage * pageSize + pageSize);

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

  const resetDemo = () => {
    if (!resetArmed) {
      setResetArmed(true);
      return;
    }
    engineRef.current?.resetDemo();
    setResetArmed(false);
    setSlip([]);
    setOutcome(null);
    setHistoryPage(0);
    fmAudio.refund();
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
              aria-label="Back to Game Center"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.05] text-slate-200 transition-colors hover:bg-white/[0.1]"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-emerald-500/30 to-amber-500/20 border border-emerald-300/25">
              <FruitIcon fruitId="grapes" className="h-6 w-6" />
            </div>
            <div className="flex min-w-0 items-center gap-1.5">
              <h1 className="font-display truncate text-base font-extrabold tracking-tight text-[#F7F3E8]">
                Fruit Manor
              </h1>
              <span className="rounded bg-amber-400/15 px-1 py-px text-[8px] font-black text-amber-300 border border-amber-300/30">DEMO</span>
            </div>
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

        <div className="mt-2 grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-2 [grid-template-areas:'status_status'_'wheel_board'_'recent_board'_'slip_slip'] lg:grid-cols-[minmax(0,300px)_minmax(0,1fr)] lg:gap-4 lg:[grid-template-areas:'status_board'_'wheel_slip'_'recent_slip']">
          {/* Round status + balance */}
          <div className="[grid-area:status] rounded-2xl border border-white/[0.08] bg-[#0B1F16]/85 px-3 py-1.5 backdrop-blur lg:self-start">
              <div className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate font-mono text-xs font-bold text-[#F7F3E8]">{round?.roundId ?? 'FM-…'}</span>
                <span className="flex shrink-0 items-center gap-1 rounded-full border border-amber-300/25 bg-amber-400/[0.08] px-1.5 py-0.5">
                  <Coins className="h-3 w-3 text-amber-300" />
                  <span className="font-mono text-[11px] font-black tabular-nums text-amber-300">{formatCoins(balance)}</span>
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
              {winnerFruit && (
                <div className="mt-1.5 flex items-center justify-end gap-1 text-[11px] font-bold text-amber-200">
                  <FruitIcon fruitId={winnerFruit.fruitId} className="h-4.5 w-4.5" />
                  Result: {winnerFruit.label} ×{winnerFruit.multiplier}
                </div>
              )}
            </div>

            <div className={`[grid-area:wheel] mx-auto w-full max-w-[168px] lg:max-w-[280px] ${shake ? 'fm-shake' : ''}`}>
              <FruitWheel
                fruits={CFG.fruits}
                roundId={round?.roundId ?? ''}
                phase={phase}
                resultFruitId={round?.resultFruitId}
                spinMs={CFG.spinMs}
                reducedMotion={reducedMotion}
                burstKey={burstKey}
                burstAccent={burstAccent}
                burstBig={burstBig}
                onPeg={() => fmAudio.peg()}
                onSpinEnd={() => {}}
              />
            </div>

            <div className="[grid-area:recent] rounded-2xl border border-white/[0.08] bg-[#0B1F16]/85 px-2.5 py-1.5 [@media(max-height:620px)]:hidden">
              {(snap?.recentResults.length ?? 0) === 0 ? (
                <p className="py-0.5 text-[10px] text-slate-400">First round is on its way — results land here.</p>
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
          {/* Eight-cell board */}
          <div className="[grid-area:board] grid grid-cols-4 grid-rows-2 gap-1.5 self-stretch" role="group" aria-label="Fruit betting board">
              {CFG.fruits.map((f) => {
                const st = stakeByFruit.get(f.fruitId) ?? { accepted: 0, pending: 0 };
                const isWinner = winnerFruit?.fruitId === f.fruitId;
                const active = st.accepted > 0 || st.pending > 0;
                return (
                  <button
                    key={f.fruitId}
                    type="button"
                    onClick={() => addChipToFruit(f.fruitId)}
                    disabled={!canBet}
                    aria-label={`Bet on ${f.label}, multiplier ${f.multiplier}${st.accepted ? `, ${st.accepted} coins accepted` : ''}`}
                    className={`fm-cell group relative flex flex-col items-center justify-center gap-0.5 rounded-xl border px-1 pb-1.5 pt-1.5 transition-all duration-150 ${
                      canBet ? 'hover:-translate-y-0.5 active:scale-[0.97]' : 'cursor-not-allowed opacity-70'
                    } ${isWinner ? 'fm-cell-winner' : ''}`}
                    style={{
                      borderColor: isWinner ? f.accentHex : active ? `${f.accentHex}88` : 'rgba(255,255,255,0.09)',
                      background: active
                        ? `linear-gradient(165deg, ${f.accentHex}26, rgba(9,26,18,0.92) 62%)`
                        : 'linear-gradient(165deg, rgba(255,255,255,0.045), rgba(9,26,18,0.92) 62%)',
                      boxShadow: isWinner ? `0 0 0 1.5px ${f.accentHex}, 0 0 24px ${f.accentHex}55` : active ? `0 4px 16px ${f.accentHex}22` : undefined,
                    }}
                  >
                    <FruitIcon fruitId={f.fruitId} className={`w-8 sm:w-9 ${canBet ? 'group-hover:scale-110' : ''} transition-transform drop-shadow-[0_3px_5px_rgba(0,0,0,0.45)]`} />
                    <span className="w-full truncate text-center text-[9px] font-semibold text-[#EAF5EC]">{f.label}</span>
                    <span
                      className="rounded-full px-1 py-px text-[9px] font-black tabular-nums"
                      style={{ background: `${f.accentHex}22`, color: f.accentHex, border: `1px solid ${f.accentHex}44` }}
                    >
                      ×{f.multiplier}
                    </span>
                    {st.accepted > 0 && (
                      <span className="fm-chip-badge absolute -right-1.5 -top-1.5 flex items-center gap-0.5 rounded-full border border-amber-300/60 bg-gradient-to-r from-amber-400 to-amber-500 px-1 py-px font-mono text-[8px] font-black text-[#3B2A05] shadow">
                        {formatCoins(st.accepted)}
                      </span>
                    )}
                    {st.pending > 0 && (
                      <span className="absolute -left-1.5 -top-1.5 rounded-full border border-dashed border-white/50 bg-black/70 px-1 py-px font-mono text-[8px] font-bold text-white">
                        +{formatCoins(st.pending)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Chips + bet slip */}
            <div className="[grid-area:slip] rounded-2xl border border-white/[0.08] bg-[#0B1F16]/85 px-2.5 py-2 lg:self-start">
              <div className="flex items-center justify-between gap-1.5 sm:justify-start sm:gap-2.5">
                {CFG.chips.map((c) => {
                  const st = CHIP_STYLES[c];
                  const selected = selectedChip === c;
                  const affordable = balance >= c;
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        unlockAudio();
                        fmAudio.chip();
                        setSelectedChip(c);
                      }}
                      aria-label={`Select ${formatCoins(c)} coin chip`}
                      aria-pressed={selected}
                      className={`fm-chip relative grid h-10 w-10 shrink-0 place-items-center rounded-full transition-all duration-150 sm:h-11 sm:w-11 ${
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
                  Tap a fruit to stack the selected chip.
                </p>
              </div>

              <div className="mt-2 border-t border-white/[0.07] pt-1.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="shrink-0 text-[9px] font-semibold uppercase tracking-[0.16em] text-emerald-200/60">Bet slip</p>
                  {slip.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => {
                        fmAudio.remove();
                        setSlip([]);
                        setSlipError(null);
                      }}
                      className="flex items-center gap-1 rounded-lg px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-rose-300"
                    >
                      <Trash2 className="h-3 w-3" /> Clear
                    </button>
                  ) : acceptedBets.length === 0 ? (
                    <p className="truncate text-[10px] text-slate-500">
                      {canBet ? 'Tap a fruit to add chips' : 'Waiting for next window…'}
                    </p>
                  ) : null}
                </div>

                {(slip.length > 0 || acceptedBets.length > 0) && (
                  <div className="mt-1 space-y-1">
                    {slip.map((e, i) => {
                      const f = FRUIT_BY_ID.get(e.fruitId)!;
                      return (
                        <div key={`${e.fruitId}-${i}`} className="fm-slip-row flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.03] px-2 py-1">
                          <FruitIcon fruitId={e.fruitId} className="h-4 w-4" />
                          <span className="text-[11px] font-semibold text-[#EAF5EC]">{f.label}</span>
                          <span className="text-[9px] font-bold" style={{ color: f.accentHex }}>×{f.multiplier}</span>
                          <span className="ml-auto font-mono text-[11px] font-bold tabular-nums text-amber-300">{formatCoins(e.stake)}</span>
                          <button
                            type="button"
                            aria-label={`Remove ${f.label} bet`}
                            onClick={() => {
                              fmAudio.remove();
                              setSlip((prev) => prev.filter((_, idx) => idx !== i));
                            }}
                            className="grid h-5 w-5 place-items-center rounded-md text-slate-500 transition-colors hover:bg-white/[0.08] hover:text-rose-300"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      );
                    })}
                    {acceptedBets.map((b) => {
                      const f = FRUIT_BY_ID.get(b.fruitId)!;
                      return (
                        <div key={b.betId} className="flex items-center gap-1.5 rounded-lg border border-emerald-400/20 bg-emerald-400/[0.06] px-2 py-1">
                          <FruitIcon fruitId={b.fruitId} className="h-4 w-4" />
                          <span className="text-[11px] font-semibold text-[#EAF5EC]">{f.label}</span>
                          <span className="rounded bg-emerald-400/15 px-1 py-px text-[8px] font-black uppercase text-emerald-300">Accepted</span>
                          <span className="ml-auto font-mono text-[11px] font-bold tabular-nums text-amber-300">{formatCoins(b.stake)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {slipError && <p className="mt-1.5 text-[10px] font-medium text-rose-300">{slipError}</p>}

                <div className="mt-1.5 flex items-center justify-between border-t border-white/[0.07] pt-1.5">
                  <div className="leading-tight">
                    <p className="text-[9px] uppercase tracking-wide text-slate-400">Total stake</p>
                    <p className="font-mono text-sm font-black tabular-nums text-[#F7F3E8]">
                      {formatCoins(slipTotal + acceptedStake)}
                      <span className="ml-1 text-[9px] font-semibold text-slate-400">coins</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {CFG.cancellationEnabled && acceptedBets.length > 0 && canBet && (
                      <button
                        type="button"
                        onClick={cancelAccepted}
                        className="h-9 rounded-xl border border-white/15 bg-white/[0.05] px-2.5 text-[11px] font-bold text-slate-200 transition-colors hover:bg-white/[0.1]"
                      >
                        Cancel bets
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={confirmSlip}
                      disabled={!canBet || slip.length === 0 || slipTotal > balance}
                      className="fm-confirm relative h-9 overflow-hidden rounded-xl bg-gradient-to-r from-amber-300 via-amber-400 to-orange-500 px-3.5 text-[11px] font-extrabold text-[#3B2A05] shadow-[0_4px_16px_rgba(245,185,63,0.35)] transition-all enabled:hover:brightness-110 enabled:active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <span className="relative z-10">
                        {slipTotal > balance && slip.length > 0 ? 'Insufficient coins' : `Confirm bet${slip.length > 1 ? 's' : ''}`}
                      </span>
                      <span className="fm-shine-loop pointer-events-none absolute inset-0" aria-hidden="true" />
                    </button>
                  </div>
                </div>
                {slipTotal > balance && slip.length > 0 && (
                  <p className="mt-1 text-[10px] text-rose-300">
                    Need {formatCoins(slipTotal - balance)} more demo coins. Lower the stake or reset the demo wallet in Rules.
                  </p>
                )}
              </div>
            </div>
        </div>

        {/* History */}
        <section className="mt-2.5 rounded-2xl border border-white/[0.08] bg-[#0B1F16]/85 px-3 py-2">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-emerald-200/60">
              <History className="h-3 w-3" /> My game history
            </p>
            {history.length > 0 && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  aria-label="Previous history page"
                  disabled={safePage === 0}
                  onClick={() => setHistoryPage((p) => Math.max(0, p - 1))}
                  className="grid h-6 w-6 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-300 disabled:opacity-35"
                >
                  <ArrowLeft className="h-3 w-3" />
                </button>
                <span className="font-mono text-[10px] tabular-nums text-slate-400">
                  {safePage + 1}/{pageCount}
                </span>
                <button
                  type="button"
                  aria-label="Next history page"
                  disabled={safePage >= pageCount - 1}
                  onClick={() => setHistoryPage((p) => Math.min(pageCount - 1, p + 1))}
                  className="grid h-6 w-6 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-300 disabled:opacity-35"
                >
                  <ArrowLeft className="h-3 w-3 rotate-180" />
                </button>
              </div>
            )}
          </div>
          {history.length === 0 ? (
            <p className="py-2 text-[11px] text-slate-400">No settled bets yet. Your wins, losses and refunds will appear here with ledger references.</p>
          ) : (
            <div className="mt-1.5 space-y-1">
              {historyRows.map((h) => {
                const f = FRUIT_BY_ID.get(h.fruitId)!;
                return (
                  <div key={h.historyId} className="flex items-center gap-2 rounded-lg border border-white/[0.05] bg-white/[0.02] px-2 py-1">
                    <FruitIcon fruitId={h.fruitId} className="h-4 w-4 shrink-0" />
                    <div className="min-w-0 leading-tight">
                      <p className="truncate text-[11px] font-semibold text-[#EAF5EC]">
                        {f.label} ×{h.multiplier}
                        <span className="ml-1.5 font-mono text-[8px] font-normal text-slate-500">{h.roundId}</span>
                      </p>
                      <p className="truncate font-mono text-[8px] text-slate-500">{h.txRef}</p>
                    </div>
                    <span
                      className={`ml-auto shrink-0 rounded px-1.5 py-px text-[8px] font-black uppercase ${
                        h.outcome === 'WIN'
                          ? 'bg-emerald-400/15 text-emerald-300'
                          : h.outcome === 'REFUND'
                            ? 'bg-sky-400/15 text-sky-300'
                            : 'bg-rose-400/15 text-rose-300'
                      }`}
                    >
                      {h.outcome}
                    </span>
                    <div className="w-16 shrink-0 text-right leading-tight">
                      <p className={`font-mono text-[11px] font-bold tabular-nums ${h.outcome === 'LOSS' ? 'text-rose-300' : 'text-emerald-300'}`}>
                        {h.outcome === 'LOSS' ? `−${formatCoins(h.stake)}` : `+${formatCoins(h.payout)}`}
                      </p>
                      <p className="font-mono text-[8px] tabular-nums text-slate-500">stake {formatCoins(h.stake)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <p className="mt-2 pb-1 text-center text-[9px] leading-relaxed text-emerald-200/40">
          Coins are virtual platform points — no cash value, no purchases, no withdrawals. Demo config {CFG.configVersion}.
        </p>
      </div>

      {/* Outcome banner */}
      {outcome && phase === 'SETTLED' && (
        <div className="fm-outcome fixed inset-x-3 bottom-[76px] z-40 mx-auto max-w-md lg:bottom-8">
          <div
            className="rounded-2xl border bg-[#0A1C13]/95 p-3 backdrop-blur-xl"
            style={{
              borderColor: outcome.net > 0 ? '#F5B93F66' : 'rgba(255,255,255,0.12)',
              boxShadow: outcome.net > 0 ? '0 12px 48px rgba(245,185,63,0.22)' : '0 12px 40px rgba(0,0,0,0.6)',
            }}
          >
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-black/30">
                <FruitIcon fruitId={outcome.resultFruitId} className="h-6.5 w-6.5" />
              </span>
              <div className="min-w-0 leading-tight">
                <p className={`font-display text-sm font-extrabold ${outcome.net > 0 ? 'text-amber-300' : outcome.net === 0 ? 'text-slate-200' : 'text-slate-300'}`}>
                  {outcome.net > 0 ? `You won ${formatCoins(outcome.net)} coins!` : outcome.net === 0 ? 'Break even' : 'No win this round'}
                </p>
                <p className="truncate text-[10px] text-slate-400">
                  {FRUIT_BY_ID.get(outcome.resultFruitId)?.label} ×{FRUIT_BY_ID.get(outcome.resultFruitId)?.multiplier} · {outcome.roundId} · {outcome.wins}/{outcome.bets.length} bets won
                </p>
              </div>
              <button
                type="button"
                aria-label="Dismiss result"
                onClick={() => setOutcome(null)}
                className="ml-auto grid h-7 w-7 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-white/[0.08] hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="mt-2 max-h-24 space-y-1 overflow-y-auto">
              {outcome.bets.map((b) => (
                <div key={b.betId} className="flex items-center gap-2 rounded-lg bg-white/[0.04] px-2 py-0.5">
                  <FruitIcon fruitId={b.fruitId} className="h-4 w-4" />
                  <span className="text-[10px] font-semibold text-slate-300">{FRUIT_BY_ID.get(b.fruitId)?.label}</span>
                  <span className="font-mono text-[9px] text-slate-500">stake {formatCoins(b.stake)}</span>
                  <span className={`ml-auto font-mono text-[10px] font-bold tabular-nums ${b.payout > 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                    {b.payout > 0 ? `+${formatCoins(b.payout)}` : `−${formatCoins(b.stake)}`}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-1.5 font-mono text-[8px] text-slate-500">
              Ledger: {outcome.bets.map((b) => b.creditRef ?? b.debitRef).join(' · ')}
            </p>
          </div>
        </div>
      )}

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
                onClick={() => {
                  setRulesOpen(false);
                  setResetArmed(false);
                }}
                className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-white/[0.08] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <ol className="mt-3 space-y-2 text-xs leading-relaxed text-slate-300">
              <li className="flex gap-2"><span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-amber-400/15 font-mono text-[10px] font-black text-amber-300">1</span>While betting is open, pick a chip value and tap one or more fruit cells to stack stakes.</li>
              <li className="flex gap-2"><span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-amber-400/15 font-mono text-[10px] font-black text-amber-300">2</span>Review the bet slip and press Confirm. Stakes are debited once and accepted bets show a reference.</li>
              <li className="flex gap-2"><span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-amber-400/15 font-mono text-[10px] font-black text-amber-300">3</span>Betting locks, the wheel spins and the committed result is revealed. You can cancel accepted bets any time before lock for a full refund.</li>
              <li className="flex gap-2"><span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-amber-400/15 font-mono text-[10px] font-black text-amber-300">4</span>Winning bets pay stake × multiplier automatically; every payout and refund is recorded in your history.</li>
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
              Theoretical return ≈ {(theoreticalReturn() * 100).toFixed(1)}% of total stakes over time. Results are drawn with a cryptographically secure RNG — never by the animation or your device.
            </p>

            <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] text-slate-300">
              <div className="rounded-lg border border-white/[0.07] bg-white/[0.03] p-2">
                <p className="font-bold text-slate-200">Stake limits</p>
                <p className="mt-0.5">Min {formatCoins(CFG.minStake)} · Max {formatCoins(CFG.maxStakePerBet)} per bet</p>
                <p>{formatCoins(CFG.maxRoundStake)} per round · {CFG.maxBetsPerRound} bets max</p>
              </div>
              <div className="rounded-lg border border-white/[0.07] bg-white/[0.03] p-2">
                <p className="font-bold text-slate-200">Round timing</p>
                <p className="mt-0.5">{CFG.openMs / 1000}s betting window</p>
                <p>{(CFG.lockedMs + CFG.spinMs + CFG.settlingMs) / 1000}s lock, draw & settle</p>
              </div>
            </div>

            <div className="mt-3 rounded-xl border border-white/[0.08] bg-white/[0.03] p-2.5 text-[11px] leading-relaxed text-slate-300">
              <p className="font-bold text-slate-200">Demo mode disclosure</p>
              <p className="mt-1">
                Fruit Manor currently runs on virtual demo coins only. Real Coin betting is disabled until the payout rules are approved. Your AddaBuzz wallet ({formatCoins(coinBalance)} coins) and Diamonds are never touched by this game. Coins have no cash value — there are no purchases, top-ups, withdrawals or prizes.
              </p>
              <p className="mt-1 text-slate-400">Config {CFG.configVersion} · effective {CFG.effectiveLabel} · demo rounds settle locally and reset on reload-safe refunds.</p>
            </div>

            <button
              type="button"
              onClick={resetDemo}
              className={`mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-xl border text-xs font-bold transition-colors ${
                resetArmed
                  ? 'border-rose-400/50 bg-rose-500/15 text-rose-200 hover:bg-rose-500/25'
                  : 'border-white/12 bg-white/[0.05] text-slate-200 hover:bg-white/[0.1]'
              }`}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {resetArmed ? 'Tap again to confirm reset' : `Reset demo wallet to ${formatCoins(CFG.demoStartBalance)} coins`}
            </button>
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