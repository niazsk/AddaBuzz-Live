import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Coins, RotateCcw, Users } from 'lucide-react';
import {
  GF_CHIPS,
  GF_CHIP_LABEL,
  GF_CHIP_STYLE,
  GF_SEATS,
  formatCoins,
} from '../../games/goldenFlower/config';
import { GfEvent, GfSnapshot, GfBoardEngine } from '../../games/goldenFlower/engine';
import { GfCardView } from './GfCardView';

interface GoldenFlowerLiveBoardProps {
  currentUser: { uid: string; displayName: string };
  coinBalance: number;
  isOffline: boolean;
  onBack: () => void;
}

const PHASE_LABEL: Record<string, string> = {
  OPEN: 'Betting',
  LOCKED: 'Dealing',
  DRAWN: 'Reveal',
  SETTLED: 'Settled',
  VOIDED: 'Voided',
};

export const GoldenFlowerLiveBoard: React.FC<GoldenFlowerLiveBoardProps> = ({
  currentUser,
  coinBalance,
  isOffline,
  onBack,
}) => {
  const engineRef = useRef<GfBoardEngine | null>(null);
  const [snap, setSnap] = useState<GfSnapshot | null>(null);
  const [chip, setChip] = useState<number>(10);
  const [error, setError] = useState<string | null>(null);
  const [lastSettled, setLastSettled] = useState<{ roundId: string; net: number } | null>(null);

  useEffect(() => {
    const engine = new GfBoardEngine(currentUser.uid, currentUser.displayName || 'Player');
    engineRef.current = engine;
    const unsub = engine.subscribe(setSnap);
    const off = engine.onEvent((ev: GfEvent) => {
      if (ev.type === 'settled') {
        setLastSettled({ roundId: ev.roundId, net: ev.net });
        setError(null);
      } else if (ev.type === 'betsAccepted' || ev.type === 'betCancelled') {
        setError(null);
      } else if (ev.type === 'rejected') {
        setError(ev.reason);
      }
    });
    return () => {
      unsub();
      off();
      engine.destroy();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser.uid]);

  const phase = snap?.round.phase ?? 'OPEN';
  const revealed = (phase === 'DRAWN' || phase === 'SETTLED') && !!snap?.round.seatCards;
  const bettingOpen = phase === 'OPEN' && !isOffline && (snap?.config.enabled ?? true);
  const secsLeft = Math.ceil(Math.max(0, (snap?.phaseEndsAt ?? 0) - Date.now()) / 1000);
  const winnerSeat = snap?.round.winnerSeat ?? null;
  const myStake = snap?.myBets.reduce((s, b) => s + b.stake, 0) ?? 0;
  const settledNet =
    lastSettled && snap && lastSettled.roundId === snap.round.roundId ? lastSettled.net : null;

  const tapSeat = async (seat: number) => {
    const engine = engineRef.current;
    if (!engine || !snap) return;
    if (!bettingOpen) {
      setError(!snap.config.enabled ? 'Golden Flower is paused.' : 'Betting is closed — next round soon.');
      return;
    }
    if (chip > coinBalance) {
      setError('Not enough Coins for this chip.');
      return;
    }
    const key = `gf-b-${snap.round.roundId}-${currentUser.uid}-${Date.now().toString(36)}${Math.random()
      .toString(36)
      .slice(2, 6)}`;
    await engine.placeBet(seat, chip, coinBalance, key);
  };

  const undo = () => {
    const res = engineRef.current?.cancelLastBet();
    if (res && !res.ok) setError(res.reason ?? 'Nothing to undo.');
    else setError(null);
  };

  return (
    <div className="flex h-full min-h-0 flex-col space-y-1 p-1.5 [&>*:last-child]:mt-auto" role="group" aria-label="Golden Flower live board">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to chat"
          className="grid h-5 w-5 shrink-0 place-items-center rounded-md border border-white/15 bg-white/[0.06] text-slate-200 hover:bg-white/[0.14]"
        >
          <ArrowLeft className="h-3 w-3" />
        </button>
        <span className="min-w-0 truncate font-mono text-[9px] font-bold text-slate-300">
          {snap?.round.roundId || 'Connecting…'}
        </span>
        {revealed && winnerSeat !== null ? (
          <span className="min-w-0 shrink-0 truncate text-[8px] font-bold text-amber-200">
            Seat {GF_SEATS[winnerSeat].letter} wins · {snap?.round.seatCats?.[String(winnerSeat)]}
          </span>
        ) : (
          <span
            className={`shrink-0 rounded-full px-1 py-px text-[7px] font-bold uppercase tracking-wide ${
              phase === 'OPEN'
                ? 'bg-emerald-400/15 text-emerald-300'
                : phase === 'VOIDED'
                ? 'bg-rose-400/15 text-rose-300'
                : 'bg-amber-400/15 text-amber-300'
            }`}
          >
            {PHASE_LABEL[phase] ?? phase}
          </span>
        )}
        <span
          className={`shrink-0 rounded-full px-1 py-px font-mono text-[9px] font-black tabular-nums ${
            phase === 'OPEN' && secsLeft <= 5 ? 'bg-rose-500/20 text-rose-300' : 'bg-white/[0.06] text-slate-200'
          }`}
        >
          {snap ? `${secsLeft}s` : '–'}
        </span>
        <span className="ml-auto flex shrink-0 items-center gap-0.5 rounded-full border border-amber-300/25 bg-amber-400/[0.08] px-1 py-px">
          <Coins className="h-2.5 w-2.5 text-amber-300" />
          <span className="font-mono text-[9px] font-black tabular-nums text-amber-300">
            {formatCoins(coinBalance)}
          </span>
        </span>
      </div>

      <div className="flex items-center gap-1.5 text-[8px] font-semibold text-slate-400">
        <span className="flex items-center gap-0.5 rounded-full bg-white/[0.06] px-1 py-px">
          <Users className="h-2.5 w-2.5" /> {snap?.players ?? 0}
        </span>
        <span className="rounded-full bg-amber-400/10 px-1 py-px text-amber-200/80">pays ×2.98</span>
        {settledNet !== null && (
          <span
            className={`ml-auto shrink-0 font-mono font-black tabular-nums ${
              settledNet >= 0 ? 'text-emerald-300' : 'text-rose-300'
            }`}
          >
            You {settledNet >= 0 ? '+' : '−'}
            {formatCoins(Math.abs(settledNet))}
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-1">
        {GF_SEATS.map((s) => {
          const cards = snap?.round.seatCards?.[String(s.seat)] ?? null;
          const isWinner = revealed && winnerSeat === s.seat;
          return (
            <button
              key={s.seat}
              type="button"
              onClick={() => void tapSeat(s.seat)}
              aria-label={`Bet ${GF_CHIP_LABEL[chip]} on seat ${s.letter}`}
              className={`relative flex flex-col items-center rounded-lg border px-0.5 py-0.5 transition-all ${
                isWinner
                  ? 'border-amber-300/70 bg-amber-400/[0.10] shadow-[0_0_16px_-6px_rgba(251,191,36,0.55)]'
                  : bettingOpen
                  ? 'border-cyan-300/20 bg-[#0A2233]/70 hover:border-cyan-300/50 active:scale-[0.97]'
                  : 'border-white/[0.07] bg-[#0A1626]/70'
              }`}
            >
              <div className="relative flex -space-x-4">
                {[0, 1, 2].map((i) => (
                  <GfCardView
                    key={i}
                    small
                    card={revealed ? cards?.[i] ?? null : null}
                    faceDown={!revealed}
                    delay={revealed ? i * 90 + s.seat * 40 : 0}
                  />
                ))}
              </div>
              <div className="mt-0.5 flex items-center gap-1">
                <span className="font-display text-xs font-black italic leading-none" style={{ color: s.color }}>
                  {s.letter}
                </span>
                <img
                  src={s.image}
                  alt={`Dealer ${s.dealer}`}
                  className="h-5 w-5 rounded-full border object-cover"
                  style={{ borderColor: s.color }}
                />
                <span className="font-mono text-[7px] font-black tabular-nums text-amber-300">
                  {formatCoins(snap?.potBySeat[s.seat] ?? 0)}
                </span>
              </div>
              <span className="h-2 text-[6px] font-semibold leading-none text-sky-300">
                {(snap?.myBySeat[s.seat] ?? 0) > 0 ? `Me ${formatCoins(snap?.myBySeat[s.seat] ?? 0)}` : ''}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={undo}
          disabled={!bettingOpen || myStake === 0}
          aria-label="Undo last bet"
          className="grid h-6 w-6 shrink-0 place-items-center rounded-md border border-white/[0.08] bg-white/[0.05] text-slate-300 hover:text-white disabled:opacity-35"
        >
          <RotateCcw className="h-3 w-3" />
        </button>
        {GF_CHIPS.map((c) => {
          const st = GF_CHIP_STYLE[c];
          const selected = chip === c;
          return (
            <button
              key={c}
              type="button"
              onClick={() => setChip(c)}
              aria-label={`Select ${GF_CHIP_LABEL[c]} chip`}
              aria-pressed={selected}
              className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 font-mono text-[6.5px] font-black transition-transform ${
                selected ? 'scale-105' : 'opacity-80'
              } ${coinBalance >= c ? '' : 'opacity-40 saturate-50'}`}
              style={{
                borderColor: st.ring,
                backgroundColor: st.face,
                color: st.text,
                boxShadow: selected ? `0 0 0 1.5px rgba(255,255,255,0.55), 0 0 12px -2px ${st.ring}` : undefined,
              }}
            >
              {GF_CHIP_LABEL[c]}
            </button>
          );
        })}
        <span className="ml-auto shrink-0 font-mono text-[9px] font-bold tabular-nums text-slate-200">
          {formatCoins(myStake)}
        </span>
      </div>

      {error && <p className="text-[8px] font-medium leading-tight text-rose-300">{error}</p>}
    </div>
  );
};
