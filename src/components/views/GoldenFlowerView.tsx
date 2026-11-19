import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Coins,
  History,
  Info,
  RotateCcw,
  Settings,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import {
  GF_CHIPS,
  GF_CHIP_LABEL,
  GF_CHIP_STYLE,
  GF_DRAW_MS,
  GF_LOCK_MS,
  GF_RULES_FLOW,
  GF_SEATS,
  GF_SETTLED_MS,
  HAND_RANKINGS,
  formatCoins,
} from '../../games/goldenFlower/config';
import {
  GF_DEFAULT_CONFIG,
  GfBoardEngine,
  GfEvent,
  GfRemoteConfig,
  GfSnapshot,
} from '../../games/goldenFlower/engine';
import { saveGfConfig } from '../../lib/firestoreService';
import { fmAudio, setMuted, unlockAudio } from '../../games/fruitManor/audio';
import { GfCardView } from '../games/GfCardView';

interface GoldenFlowerViewProps {
  currentUser: { uid: string; displayName: string };
  coinBalance: number;
  isOffline: boolean;
  isAdminUser: boolean;
  onBack: () => void;
  onOpenHistory: () => void;
}

interface Toast {
  msg: string;
  tone: 'info' | 'good' | 'bad';
}

const PHASE_LABEL: Record<string, string> = {
  OPEN: 'Place your bets',
  LOCKED: 'Dealing…',
  DRAWN: 'Reveal',
  SETTLED: 'Round over',
  VOIDED: 'Round voided',
};

export const GoldenFlowerView: React.FC<GoldenFlowerViewProps> = ({
  currentUser,
  coinBalance,
  isOffline,
  isAdminUser,
  onBack,
  onOpenHistory,
}) => {
  const engineRef = useRef<GfBoardEngine | null>(null);
  const [snap, setSnap] = useState<GfSnapshot | null>(null);
  const [chip, setChip] = useState<number>(10);
  const [toast, setToast] = useState<Toast | null>(null);
  const [showRules, setShowRules] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [soundOn, setSoundOn] = useState(() => localStorage.getItem('gf_sound') !== 'off');
  const [motionOn, setMotionOn] = useState(() => localStorage.getItem('gf_motion') !== 'off');
  const [adminCfg, setAdminCfg] = useState<GfRemoteConfig>(GF_DEFAULT_CONFIG);
  const [adminBusy, setAdminBusy] = useState(false);
  const [lastSettled, setLastSettled] = useState<{ roundId: string; net: number } | null>(null);
  const toastTimer = useRef<number | null>(null);

  const showToast = (msg: string, tone: Toast['tone'] = 'info') => {
    setToast({ msg, tone });
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  };

  useEffect(() => {
    setMuted(!soundOn);
  }, [soundOn]);

  useEffect(() => {
    const engine = new GfBoardEngine(currentUser.uid, currentUser.displayName || 'Player');
    engineRef.current = engine;
    const unsub = engine.subscribe(setSnap);
    const offEvents = engine.onEvent((ev: GfEvent) => {
      if (ev.type === 'phase') {
        if (ev.phase === 'LOCKED') fmAudio.lock();
        if (ev.phase === 'OPEN') fmAudio.roundStart();
      } else if (ev.type === 'drawn') {
        fmAudio.confirm();
      } else if (ev.type === 'settled') {
        setLastSettled({ roundId: ev.roundId, net: ev.net });
        if (ev.net > 0) (ev.net >= 5000 ? fmAudio.bigWin : fmAudio.win)();
        else if (ev.net < 0) fmAudio.lose();
      } else if (ev.type === 'betsAccepted') {
        fmAudio.place();
      } else if (ev.type === 'betCancelled') {
        fmAudio.cancel();
        showToast(`Undo — ${formatCoins(ev.refunded)} Coins returned`, 'good');
      } else if (ev.type === 'rejected') {
        fmAudio.reject();
        showToast(ev.reason, 'bad');
      }
    });
    return () => {
      unsub();
      offEvents();
      engine.destroy();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser.uid]);

  useEffect(() => {
    if (snap?.config) setAdminCfg(snap.config);
  }, [snap?.config.enabled, snap?.config.openMs]);

  const phase = snap?.round.phase ?? 'OPEN';
  const revealed = (phase === 'DRAWN' || phase === 'SETTLED') && !!snap?.round.seatCards;
  const bettingOpen = phase === 'OPEN' && !isOffline && (snap?.config.enabled ?? true);
  const msLeft = Math.max(0, (snap?.phaseEndsAt ?? 0) - Date.now());
  const secsLeft = Math.ceil(msLeft / 1000);
  const phaseTotal =
    phase === 'OPEN' ? snap?.config.openMs ?? 20000
    : phase === 'LOCKED' ? GF_LOCK_MS
    : phase === 'DRAWN' ? GF_DRAW_MS
    : GF_SETTLED_MS;
  const progress = Math.max(0, Math.min(1, msLeft / phaseTotal));

  const myStake = snap?.myBets.reduce((s, b) => s + b.stake, 0) ?? 0;
  const winnerSeat = snap?.round.winnerSeat ?? null;
  const settledNet =
    lastSettled && snap && lastSettled.roundId === snap.round.roundId ? lastSettled.net : null;

  const tapSeat = async (seat: number) => {
    unlockAudio();
    const engine = engineRef.current;
    if (!engine || !snap) return;
    if (!bettingOpen) {
      fmAudio.reject();
      showToast(
        !snap.config.enabled ? 'Golden Flower is paused right now.' : 'Betting is closed — wait for the next round.',
        'bad'
      );
      return;
    }
    if (chip > coinBalance) {
      fmAudio.reject();
      showToast('Not enough Coins for this chip.', 'bad');
      return;
    }
    fmAudio.chip();
    const key = `gf-b-${snap.round.roundId}-${currentUser.uid}-${Date.now().toString(36)}${Math.random()
      .toString(36)
      .slice(2, 6)}`;
    await engine.placeBet(seat, chip, coinBalance, key);
  };

  const undo = () => {
    unlockAudio();
    const res = engineRef.current?.cancelLastBet();
    if (res && !res.ok) showToast(res.reason ?? 'Nothing to undo.', 'bad');
  };

  const saveAdmin = async () => {
    setAdminBusy(true);
    try {
      await saveGfConfig(
        currentUser.uid,
        adminCfg,
        `GF config: enabled=${adminCfg.enabled} openMs=${adminCfg.openMs}`
      );
      showToast('Golden Flower config saved.', 'good');
      setShowAdmin(false);
    } catch {
      showToast('Config save failed — admin only.', 'bad');
    } finally {
      setAdminBusy(false);
    }
  };

  const recent = useMemo(() => (snap?.recentResults ?? []).slice(0, 14), [snap?.recentResults]);

  return (
    <div className={`relative space-y-1.5 pb-3 ${motionOn ? '' : 'gf-still'}`}>
      {/* Header */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to games"
          className="w-9 h-9 rounded-xl bg-[#111420] border border-white/[0.08] hover:border-white/20 text-slate-300 hover:text-white flex items-center justify-center shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="sr-only">Golden Flower</h1>
        <span className="flex shrink-0 items-center gap-1 rounded-full border border-amber-300/25 bg-amber-400/[0.08] px-2 py-1">
          <Coins className="h-3.5 w-3.5 text-amber-300" />
          <span className="font-mono text-xs font-black tabular-nums text-amber-300">
            {formatCoins(coinBalance)}
          </span>
        </span>
        <span className="min-w-0 flex-1" />
        <button
          type="button"
          onClick={onOpenHistory}
          aria-label="My bet history"
          className="w-9 h-9 rounded-xl bg-[#111420] border border-white/[0.08] text-slate-300 hover:text-white flex items-center justify-center shrink-0"
        >
          <History className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => setShowRules(true)}
          aria-label="Game rules"
          className="w-9 h-9 rounded-xl bg-[#111420] border border-white/[0.08] text-slate-300 hover:text-white flex items-center justify-center shrink-0"
        >
          <Info className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => setShowSettings(true)}
          aria-label="Settings"
          className="w-9 h-9 rounded-xl bg-[#111420] border border-white/[0.08] text-slate-300 hover:text-white flex items-center justify-center shrink-0"
        >
          <Settings className="w-4 h-4" />
        </button>
        {isAdminUser && (
          <button
            type="button"
            onClick={() => setShowAdmin(true)}
            aria-label="Admin config"
            className="w-9 h-9 rounded-xl bg-[#111420] border border-violet-400/30 text-violet-300 hover:text-violet-200 flex items-center justify-center shrink-0"
          >
            <ShieldCheck className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Banner */}
      <div className="relative h-14 overflow-hidden rounded-2xl border border-amber-300/20">
        <img
          src="/images/goldenFlower/banner.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-top"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,10,24,0.1),rgba(4,10,24,0.72))]" />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-2xl font-black italic leading-none bg-gradient-to-b from-yellow-100 via-amber-300 to-yellow-600 bg-clip-text text-transparent drop-shadow-[0_3px_10px_rgba(0,0,0,0.8)]">
            Golden Flower
          </span>
          <span className="mt-0.5 rounded-full bg-black/45 px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.18em] text-amber-200">
            Win ×2.98
          </span>
        </div>
      </div>

      {/* Round clock */}
      <div className="rounded-xl border border-white/[0.07] bg-[#0B1220]/80 px-3 py-1.5">
        <div className="flex items-center justify-between gap-2 text-[10px]">
          <span className="font-mono font-bold text-slate-400">
            {snap?.round.roundId || 'Connecting…'}
          </span>
          <span className="flex items-center gap-1 text-slate-400">
            <Users className="h-3 w-3" /> {snap?.players ?? 0}
          </span>
          {revealed && winnerSeat !== null ? (
            <span className="gf-result flex min-w-0 items-center gap-1.5 font-bold text-amber-200">
              <span className="truncate">
                Seat {GF_SEATS[winnerSeat].letter} wins · {snap?.round.seatCats?.[String(winnerSeat)]}
              </span>
              {settledNet !== null && (
                <span className={`shrink-0 ${settledNet >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                  You {settledNet >= 0 ? '+' : '−'}
                  {formatCoins(Math.abs(settledNet))}
                </span>
              )}
            </span>
          ) : phase === 'VOIDED' ? (
            <span className="gf-result font-bold text-rose-300">Voided — stakes refunded</span>
          ) : (
            <span
              className={`font-bold uppercase tracking-wide ${
                phase === 'OPEN' ? 'text-emerald-300' : 'text-amber-300'
              }`}
            >
              {PHASE_LABEL[phase]}
            </span>
          )}
          <span
            className={`min-w-[34px] rounded-full px-2 py-0.5 text-center font-mono text-[11px] font-black tabular-nums ${
              phase === 'OPEN' && secsLeft <= 5
                ? 'bg-rose-500/20 text-rose-300'
                : 'bg-white/[0.06] text-slate-200'
            }`}
          >
            {snap ? secsLeft : '–'}
          </span>
        </div>
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className={`h-full rounded-full transition-[width] duration-300 ${
              phase === 'OPEN' ? 'bg-emerald-400' : 'bg-amber-400'
            }`}
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>

      {!snap?.config.enabled && (
        <p className="rounded-xl border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-[11px] font-semibold text-rose-200">
          Golden Flower is paused by the admin. Accepted stakes are refunded automatically.
        </p>
      )}
      {isOffline && (
        <p className="rounded-xl border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-[11px] font-semibold text-amber-200">
          You are offline — the shared board reconnects automatically.
        </p>
      )}

      {/* Dealer seats */}
      <div className="grid grid-cols-3 gap-2">
        {GF_SEATS.map((s) => {
          const cards = snap?.round.seatCards?.[String(s.seat)] ?? null;
          const isWinner = revealed && winnerSeat === s.seat;
          const cat = snap?.round.seatCats?.[String(s.seat)];
          return (
            <button
              key={s.seat}
              type="button"
              onClick={() => void tapSeat(s.seat)}
              aria-label={`Bet ${GF_CHIP_LABEL[chip]} on seat ${s.letter}`}
              className={`relative flex flex-col items-center gap-1 rounded-2xl border p-1.5 pt-2.5 transition-all ${
                isWinner
                  ? 'border-amber-300/70 bg-amber-400/[0.10] shadow-[0_0_24px_-6px_rgba(251,191,36,0.55)]'
                  : bettingOpen
                  ? 'border-cyan-300/20 bg-[#0A2233]/70 hover:border-cyan-300/50 active:scale-[0.97]'
                  : 'border-white/[0.07] bg-[#0A1626]/70'
              }`}
            >
              <div className="relative flex -space-x-3">
                {[0, 1, 2].map((i) => (
                  <GfCardView
                    key={i}
                    small
                    card={revealed ? cards?.[i] ?? null : null}
                    faceDown={!revealed}
                    delay={revealed ? i * 120 + s.seat * 60 : 0}
                  />
                ))}
                <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-md border border-cyan-300/40 bg-[#062A3F]/95 px-1.5 py-px text-[9px] font-black text-cyan-200">
                  x2.98
                </span>
              </div>
              <div className="mt-1 flex items-center gap-1.5">
                <span
                  className="font-display text-lg font-black italic leading-none"
                  style={{ color: s.color }}
                >
                  {s.letter}
                </span>
                <img
                  src={s.image}
                  alt={`Dealer ${s.dealer}`}
                  className="h-10 w-10 rounded-full border-2 object-cover"
                  style={{ borderColor: s.color }}
                />
              </div>
              <span className="h-2.5 text-[8px] font-bold uppercase tracking-wide text-amber-200">
                {isWinner ? cat ?? '' : ''}
              </span>
              <div className="w-full rounded-lg border border-white/10 bg-[#050D18]/90 px-1.5 py-0.5 text-left">
                <p className="flex items-center justify-between text-[9px] font-semibold text-slate-400">
                  <span>Pot:</span>
                  <span className="font-mono font-bold tabular-nums text-amber-300">
                    {formatCoins(snap?.potBySeat[s.seat] ?? 0)}
                  </span>
                </p>
                <p className="flex items-center justify-between text-[9px] font-semibold text-slate-400">
                  <span>Me:</span>
                  <span className="font-mono font-bold tabular-nums text-sky-300">
                    {formatCoins(snap?.myBySeat[s.seat] ?? 0)}
                  </span>
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Recent winning seats */}
      <div className="flex items-center gap-1 overflow-hidden rounded-xl border border-white/[0.07] bg-[#0B1220]/80 px-2 py-1">
        <span className="mr-1 shrink-0 text-[8px] font-bold uppercase tracking-[0.14em] text-slate-500">
          Recent
        </span>
        {recent.length === 0 && (
          <span className="text-[10px] text-slate-500">First round in progress…</span>
        )}
        {recent.map((r) => (
          <span
            key={r.roundId}
            className="grid h-5 w-5 shrink-0 place-items-center rounded-full font-display text-[11px] font-black italic"
            style={{
              color: GF_SEATS[r.seat]?.color ?? '#fff',
              backgroundColor: `${GF_SEATS[r.seat]?.color ?? '#fff'}1a`,
            }}
          >
            {GF_SEATS[r.seat]?.letter ?? '?'}
          </span>
        ))}
        <span className="ml-auto shrink-0 pl-1 font-mono text-[9px] font-bold tabular-nums text-slate-400">
          {myStake > 0 ? `You: ${formatCoins(myStake)}` : '×2.98'}
        </span>
      </div>

      {/* Chip rail */}
      <div className="flex items-center justify-between gap-1.5 rounded-2xl border border-white/[0.07] bg-[#0B1220]/90 px-2 py-1.5">
        <button
          type="button"
          onClick={undo}
          disabled={!bettingOpen || myStake === 0}
          aria-label="Undo last bet"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-slate-300 hover:text-white disabled:opacity-35"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
        {GF_CHIPS.map((c) => {
          const st = GF_CHIP_STYLE[c];
          const selected = chip === c;
          return (
            <button
              key={c}
              type="button"
              onClick={() => {
                unlockAudio();
                fmAudio.chip();
                setChip(c);
              }}
              aria-label={`Select ${GF_CHIP_LABEL[c]} chip`}
              aria-pressed={selected}
              className={`grid h-11 w-11 shrink-0 place-items-center rounded-full border-4 font-mono text-[10px] font-black transition-transform ${
                selected ? 'scale-110 shadow-[0_0_16px_-2px_rgba(255,255,255,0.45)]' : 'opacity-80'
              }`}
              style={{
                borderColor: st.ring,
                backgroundColor: st.face,
                color: st.text,
                boxShadow: selected ? `0 0 0 2px rgba(255,255,255,0.65), 0 0 18px -2px ${st.ring}` : undefined,
              }}
            >
              {GF_CHIP_LABEL[c]}
            </button>
          );
        })}
      </div>

      {snap?.error && (
        <p className="rounded-xl border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-[10px] text-rose-200">
          {snap.error}
        </p>
      )}
      {toast && (
        <div
          className={`gf-sheet fixed bottom-20 left-1/2 z-40 -translate-x-1/2 rounded-xl border px-3 py-2 text-[11px] font-bold shadow-xl ${
            toast.tone === 'good'
              ? 'border-emerald-300/40 bg-emerald-950/95 text-emerald-200'
              : toast.tone === 'bad'
              ? 'border-rose-300/40 bg-rose-950/95 text-rose-200'
              : 'border-white/15 bg-[#111420]/95 text-slate-200'
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Rules modal */}
      {showRules && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" onClick={() => setShowRules(false)}>
          <div
            className="gf-sheet max-h-[80vh] w-full max-w-md overflow-y-auto rounded-2xl border border-white/10 bg-[#0D1120] p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-white">How to play</h2>
              <button type="button" onClick={() => setShowRules(false)} aria-label="Close rules" className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <ol className="mt-3 list-decimal space-y-2 pl-4 text-[11px] leading-relaxed text-slate-300">
              {GF_RULES_FLOW.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ol>
            <h3 className="mt-4 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
              Hand rankings (best first)
            </h3>
            <div className="mt-2 space-y-1">
              {HAND_RANKINGS.map((h) => (
                <p key={h.cat} className="flex justify-between gap-2 text-[11px]">
                  <span className="font-semibold text-amber-200">{h.name}</span>
                  <span className="text-right text-slate-400">{h.def}</span>
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Settings modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" onClick={() => setShowSettings(false)}>
          <div
            className="gf-sheet w-full max-w-xs rounded-2xl border border-white/10 bg-[#0D1120] p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-white">Settings</h2>
              <button type="button" onClick={() => setShowSettings(false)} aria-label="Close settings" className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <label className="mt-3 flex items-center justify-between text-[12px] font-semibold text-slate-200">
              Sound effects
              <input
                type="checkbox"
                checked={soundOn}
                onChange={(e) => {
                  setSoundOn(e.target.checked);
                  localStorage.setItem('gf_sound', e.target.checked ? 'on' : 'off');
                }}
                className="h-4 w-4 accent-amber-400"
              />
            </label>
            <label className="mt-3 flex items-center justify-between text-[12px] font-semibold text-slate-200">
              Animations
              <input
                type="checkbox"
                checked={motionOn}
                onChange={(e) => {
                  setMotionOn(e.target.checked);
                  localStorage.setItem('gf_motion', e.target.checked ? 'on' : 'off');
                }}
                className="h-4 w-4 accent-amber-400"
              />
            </label>
          </div>
        </div>
      )}

      {/* Admin config modal */}
      {showAdmin && isAdminUser && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" onClick={() => setShowAdmin(false)}>
          <div
            className="gf-sheet w-full max-w-xs rounded-2xl border border-violet-400/25 bg-[#0D1120] p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-white">GF admin</h2>
              <button type="button" onClick={() => setShowAdmin(false)} aria-label="Close admin config" className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <label className="mt-3 flex items-center justify-between text-[12px] font-semibold text-slate-200">
              Game enabled
              <input
                type="checkbox"
                checked={adminCfg.enabled}
                onChange={(e) => setAdminCfg({ ...adminCfg, enabled: e.target.checked })}
                className="h-4 w-4 accent-violet-400"
              />
            </label>
            <label className="mt-3 block text-[12px] font-semibold text-slate-200">
              Betting window
              <select
                value={adminCfg.openMs}
                onChange={(e) => setAdminCfg({ ...adminCfg, openMs: Number(e.target.value) })}
                className="mt-1 w-full rounded-lg border border-white/10 bg-[#111420] px-2 py-1.5 text-[12px] text-slate-200"
              >
                <option value={15000}>15 seconds</option>
                <option value={20000}>20 seconds</option>
                <option value={30000}>30 seconds</option>
              </select>
            </label>
            <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
              Disabling voids the live round and refunds every accepted stake.
            </p>
            <button
              type="button"
              onClick={() => void saveAdmin()}
              disabled={adminBusy}
              className="mt-3 w-full rounded-xl bg-violet-600 py-2 text-[12px] font-bold text-white hover:bg-violet-500 disabled:opacity-50"
            >
              {adminBusy ? 'Saving…' : 'Save config'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};