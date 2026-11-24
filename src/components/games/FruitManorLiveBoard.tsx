import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Coins, Loader2, RotateCcw } from 'lucide-react';
import { UserProfile } from '../../types/app';
import {
  FRUIT_MANOR_CONFIG,
  FRUIT_BY_ID,
  FruitId,
  formatCoins,
} from '../../games/fruitManor/config';
import { FmSnapshot, FruitManorEngine, RoundPhase } from '../../games/fruitManor/engine';
import { FruitIcon } from './FruitIcon';
import { FruitWheel } from './FruitWheel';

const CFG = FRUIT_MANOR_CONFIG;

const CHIP_STYLE: Record<number, { ring: string; face: string; text: string }> = {
  10: { ring: '#94A3B8', face: '#334155', text: '#E2E8F0' },
  100: { ring: '#38BDF8', face: '#0C4A6E', text: '#BAE6FD' },
  1000: { ring: '#A855F7', face: '#4C1D95', text: '#E9D5FF' },
  5000: { ring: '#F5B93F', face: '#78350F', text: '#FDE68A' },
  50000: { ring: '#FB7185', face: '#881337', text: '#FECDD3' },
};

const PHASE_META: Record<RoundPhase, { label: string; cls: string }> = {
  SCHEDULED: { label: 'Soon', cls: 'bg-slate-400/15 text-slate-300 border-slate-400/30' },
  OPEN: { label: 'Betting', cls: 'bg-emerald-400/15 text-emerald-300 border-emerald-400/40' },
  LOCKED: { label: 'Locked', cls: 'bg-amber-400/15 text-amber-300 border-amber-400/40' },
  DRAWN: { label: 'Drawing', cls: 'bg-sky-400/15 text-sky-300 border-sky-400/40' },
  SETTLING: { label: 'Settling', cls: 'bg-violet-400/15 text-violet-300 border-violet-400/40' },
  SETTLED: { label: 'Settled', cls: 'bg-amber-300/15 text-amber-200 border-amber-300/40' },
  VOIDED: { label: 'Voided', cls: 'bg-rose-400/15 text-rose-300 border-rose-400/40' },
};

interface FruitManorLiveBoardProps {
  currentUser: UserProfile;
  coinBalance: number;
  isOffline: boolean;
  onBack: () => void;
}

export const FruitManorLiveBoard: React.FC<FruitManorLiveBoardProps> = ({
  currentUser,
  coinBalance,
  isOffline,
  onBack,
}) => {
  const [snap, setSnap] = useState<FmSnapshot | null>(null);
  const engineRef = useRef<FruitManorEngine | null>(null);
  const [chip, setChip] = useState<number>(100);
  const [placing, setPlacing] = useState<Partial<Record<FruitId, boolean>>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const engine = new FruitManorEngine(currentUser.uid, currentUser.username);
    engineRef.current = engine;
    const unsub = engine.subscribe(setSnap);
    const off = engine.onEvent((ev) => {
      if (ev.type === 'rejected') setError(ev.reason);
      else if (ev.type === 'betsAccepted' || (ev.type === 'phase' && ev.phase === 'OPEN')) {
        setError(null);
      }
    });
    return () => {
      unsub();
      off();
      engine.destroy();
      engineRef.current = null;
    };
  }, [currentUser.uid]);

  useEffect(() => {
    engineRef.current?.setPaused(isOffline);
  }, [isOffline]);

  const round = snap?.round;
  const phase = round?.phase ?? 'SCHEDULED';
  const remaining = snap ? Math.max(0, snap.phaseEndsAt - snap.serverNow) : 0;
  const sec = Math.ceil(remaining / 1000);
  const canBet = phase === 'OPEN' && !isOffline && !!snap?.connected && !snap?.paused;
  const myStake = snap?.myStake ?? 0;
  const players = snap?.players ?? 0;
  const poolStake = snap?.poolStake ?? 0;

  const poolByFruit = snap?.poolByFruit ?? {};
  const myByFruit = useMemo(() => {
    const map = new Map<FruitId, number>();
    (snap?.myBets ?? []).forEach((b) => map.set(b.fruitId, (map.get(b.fruitId) ?? 0) + b.stake));
    return map;
  }, [snap?.myBets]);

  const last = snap?.recentResults[0];
  const lastFruit = last ? FRUIT_BY_ID.get(last.fruitId) : undefined;

  const tapFruit = async (fruitId: FruitId) => {
    if (!canBet || placing[fruitId]) return;
    if (chip > coinBalance) {
      setError(`Not enough Coins — you have ${formatCoins(coinBalance)}.`);
      return;
    }
    setError(null);
    setPlacing((p) => ({ ...p, [fruitId]: true }));
    const key = `fm-d-${round?.roundId}-${fruitId}-${Date.now().toString(36)}${Math.random()
      .toString(36)
      .slice(2, 6)}`;
    const res = await engineRef.current?.placeBet(fruitId, chip, coinBalance, key);
    setPlacing((p) => {
      const next = { ...p };
      delete next[fruitId];
      return next;
    });
    if (res && !res.ok) setError(res.reason ?? 'Bet rejected.');
  };

  const cancelBets = () => {
    const res = engineRef.current?.cancelBets();
    if (res && !res.ok) setError(res.reason ?? 'Cancellation failed.');
    else setError(null);
  };

  const phaseMeta = PHASE_META[phase];

  return (
    <div className="space-y-1 p-1.5" role="group" aria-label="Fruit Manor live board">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to chat"
          className="grid h-5 w-5 shrink-0 place-items-center rounded-md border border-white/15 bg-white/[0.06] text-slate-200 hover:bg-white/[0.14]"
        >
          <ArrowLeft className="h-3 w-3" />
        </button>
        <span className="min-w-0 truncate font-mono text-[9px] font-bold text-[#F7F3E8]">
          {snap ? round?.roundId ?? 'FM-…' : 'Connecting…'}
        </span>
        <span className={`shrink-0 rounded-full border px-1 py-px text-[7px] font-bold uppercase tracking-wide ${phaseMeta.cls}`}>
          {phaseMeta.label}
        </span>
        <span
          className={`shrink-0 font-mono text-xs font-black tabular-nums ${
            phase === 'OPEN' && sec <= 3 ? 'text-rose-300' : 'text-amber-300'
          }`}
        >
          {phase === 'OPEN' || phase === 'SCHEDULED' ? `${sec}s` : '—'}
        </span>
        <span className="ml-auto flex shrink-0 items-center gap-0.5 rounded-full border border-amber-300/25 bg-amber-400/[0.08] px-1 py-px">
          <Coins className="h-2.5 w-2.5 text-amber-300" />
          <span className="font-mono text-[9px] font-black tabular-nums text-amber-300">
            {formatCoins(coinBalance)}
          </span>
        </span>
      </div>

      <div className="flex items-center gap-1 overflow-hidden text-[8px] font-semibold text-slate-400">
        <span className="rounded-full bg-emerald-400/10 px-1 py-px text-emerald-200/80">{players} playing</span>
        <span className="rounded-full bg-amber-400/10 px-1 py-px text-amber-200/80">pool {formatCoins(poolStake)}</span>
        {lastFruit && (
          <span className="ml-auto flex shrink-0 items-center gap-0.5 truncate">
            <span className="text-emerald-200/60">Last</span>
            <FruitIcon fruitId={lastFruit.fruitId} className="h-3 w-3" />
            <span className="text-[#EAF5EC]">×{lastFruit.multiplier}</span>
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <div className="w-[82px] shrink-0">
          <FruitWheel
            fruits={CFG.fruits}
            roundId={round?.roundId ?? ''}
            phase={phase}
            resultFruitId={round?.resultFruitId}
            lastFruitId={last?.fruitId}
            spinMs={CFG.spinMs}
            reducedMotion={false}
            burstKey={0}
            burstAccent={lastFruit?.accentHex ?? '#F5B93F'}
            burstBig={false}
            onPeg={() => {}}
            onSpinEnd={() => {}}
          />
        </div>

        <div className="grid flex-1 grid-cols-4 gap-0.5">
          {CFG.fruits.map((f) => {
            const st = poolByFruit[f.fruitId] ?? 0;
            const mine = myByFruit.get(f.fruitId) ?? 0;
            const isWinner = last?.fruitId === f.fruitId;
            const busy = !!placing[f.fruitId];
            return (
              <button
                key={f.fruitId}
                type="button"
                onClick={() => void tapFruit(f.fruitId)}
                disabled={!canBet || busy}
                aria-label={`Bet ${formatCoins(chip)} coins on ${f.label}, multiplier ${f.multiplier}`}
                className={`relative flex flex-col items-center rounded-md border px-0.5 py-0.5 transition-all ${
                  canBet && !busy ? 'hover:-translate-y-0.5 active:scale-[0.97]' : 'opacity-70'
                } ${isWinner ? 'fm-cell-winner' : ''}`}
                style={{
                  borderColor: isWinner ? f.accentHex : st > 0 ? `${f.accentHex}88` : 'rgba(255,255,255,0.09)',
                  background:
                    st > 0
                      ? `linear-gradient(165deg, ${f.accentHex}26, rgba(9,26,18,0.92) 62%)`
                      : 'linear-gradient(165deg, rgba(255,255,255,0.05), rgba(9,26,18,0.92) 62%)',
                  boxShadow: isWinner ? `0 0 0 1.5px ${f.accentHex}, 0 0 18px ${f.accentHex}55` : undefined,
                }}
              >
                <FruitIcon fruitId={f.fruitId} className="h-3.5 w-3.5" />
                <span className="text-[6.5px] font-black leading-tight tabular-nums" style={{ color: f.accentHex }}>
                  ×{f.multiplier}
                </span>
                <span className="w-full truncate text-center text-[6px] font-semibold leading-tight text-[#EAF5EC]/80">{f.label}</span>
                {st > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 rounded-full border border-amber-300/60 bg-gradient-to-r from-amber-400 to-amber-500 px-0.5 font-mono text-[5.5px] font-black leading-tight text-[#3B2A05] shadow">
                    {formatCoins(st)}
                  </span>
                )}
                {mine > 0 && (
                  <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 rounded-full border border-emerald-300/50 bg-emerald-500/90 px-0.5 font-mono text-[5px] font-black leading-tight text-emerald-950 shadow">
                    YOU
                  </span>
                )}
                {busy && (
                  <span className="absolute inset-0 grid place-items-center rounded-md bg-black/45">
                    <Loader2 className="h-2.5 w-2.5 animate-spin text-amber-300" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-1">
        {CFG.chips.map((c) => {
          const st = CHIP_STYLE[c];
          const selected = chip === c;
          return (
            <button
              key={c}
              type="button"
              onClick={() => setChip(c)}
              aria-label={`Select ${formatCoins(c)} coin chip`}
              aria-pressed={selected}
              className={`grid h-6 w-6 shrink-0 place-items-center rounded-full transition-transform ${
                selected ? '-translate-y-0.5 scale-105' : 'opacity-80'
              } ${coinBalance >= c ? '' : 'opacity-40 saturate-50'}`}
              style={{
                background: `radial-gradient(circle at 35% 30%, ${st.face}, #060D09 130%)`,
                border: `2px dashed ${st.ring}`,
                boxShadow: selected ? `0 0 0 1.5px ${st.ring}, 0 4px 12px ${st.ring}55` : undefined,
              }}
            >
              <span className="font-mono text-[6.5px] font-black" style={{ color: st.text }}>
                {c >= 1000 ? `${c / 1000}K` : c}
              </span>
            </button>
          );
        })}
        <span className="ml-auto shrink-0 font-mono text-[9px] font-bold tabular-nums text-[#F7F3E8]">
          {formatCoins(myStake)}
        </span>
        {myStake > 0 && canBet && (
          <button
            type="button"
            onClick={cancelBets}
            aria-label="Cancel my bets"
            className="grid h-6 w-6 shrink-0 place-items-center rounded-md border border-white/15 bg-white/[0.06] text-slate-200 hover:bg-white/[0.12]"
          >
            <RotateCcw className="h-3 w-3" />
          </button>
        )}
      </div>

      {error && <p className="text-[8px] font-medium leading-tight text-rose-300">{error}</p>}
    </div>
  );
};
