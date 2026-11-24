import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Coins,
  Layers,
  LogIn,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { UserProfile } from '../../types/app';
import {
  ARCADE_CHIPS,
  arcadeDebit,
  capPayout,
  creditArcade,
  flushArcadeCredits,
  fmtCoins,
  loadArcadeHistory,
  newRoundId,
  randomUnit,
  saveArcadeHistory,
} from '../../games/arcade/wallet';

const RANK_LABELS: Record<number, string> = {
  2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9',
  10: '10', 11: 'J', 12: 'Q', 13: 'K', 14: 'A',
};
const SUITS = [
  { symbol: '♠', red: false },
  { symbol: '♥', red: true },
  { symbol: '♦', red: true },
  { symbol: '♣', red: false },
] as const;

const STEP_MULTIPLIER = 1.9;

type Phase = 'idle' | 'running' | 'lost' | 'cashed';

interface HistoryEntry {
  id: string;
  at: number;
  stake: number;
  streak: number;
  payout: number;
}

interface PlayingCard {
  rank: number;
  suit: number;
}

interface Props {
  currentUser: UserProfile | null;
  coinBalance: number;
  isOffline: boolean;
  onBack: () => void;
  onOpenAuth: () => void;
}

function drawCard(): PlayingCard {
  return {
    rank: 2 + Math.floor(randomUnit() * 13),
    suit: Math.floor(randomUnit() * 4),
  };
}

const CardFace: React.FC<{ card: PlayingCard; dealKey: number; dim?: boolean }> = ({
  card,
  dealKey,
  dim,
}) => {
  const suit = SUITS[card.suit];
  return (
    <div
      key={dealKey}
      className={`hl-card relative grid h-36 w-24 place-items-center rounded-2xl border shadow-xl ${
        dim
          ? 'border-white/10 bg-white/[0.05] opacity-60'
          : 'border-white/25 bg-gradient-to-br from-white to-slate-200 shadow-slate-900/50'
      }`}
    >
      <span
        className={`absolute left-2 top-1.5 font-display text-sm font-black ${
          dim ? 'text-slate-400' : suit.red ? 'text-rose-600' : 'text-slate-900'
        }`}
      >
        {RANK_LABELS[card.rank]}
        <span className="ml-0.5">{suit.symbol}</span>
      </span>
      <span
        className={`font-display text-5xl font-black ${
          dim ? 'text-slate-500' : suit.red ? 'text-rose-600' : 'text-slate-900'
        }`}
      >
        {RANK_LABELS[card.rank]}
      </span>
      <span
        className={`absolute bottom-1.5 right-2 text-lg ${
          dim ? 'text-slate-400' : suit.red ? 'text-rose-600' : 'text-slate-900'
        }`}
      >
        {suit.symbol}
      </span>
    </div>
  );
};

export const HiLoView: React.FC<Props> = ({
  currentUser,
  coinBalance,
  isOffline,
  onBack,
  onOpenAuth,
}) => {
  const [stake, setStake] = useState<number>(100);
  const [phase, setPhase] = useState<Phase>('idle');
  const [card, setCard] = useState<PlayingCard>({ rank: 8, suit: 0 });
  const [nextCard, setNextCard] = useState<PlayingCard | null>(null);
  const [dealKey, setDealKey] = useState(0);
  const [streak, setStreak] = useState(0);
  const [wonAmount, setWonAmount] = useState(0);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [flipping, setFlipping] = useState(false);
  const userRef = useRef(currentUser);
  userRef.current = currentUser;
  const roundRef = useRef<{
    id: string;
    stake: number;
    current: PlayingCard;
    streak: number;
    settled: boolean;
  } | null>(null);

  useEffect(() => {
    if (!currentUser) return;
    setHistory(loadArcadeHistory<HistoryEntry>(`hl_history_${currentUser.uid}`));
    void flushArcadeCredits(currentUser.uid);
  }, [currentUser]);

  const settle = (onScreen: boolean, won: boolean) => {
    const info = roundRef.current;
    const uid = userRef.current?.uid;
    if (!info || !uid || info.settled) return;
    info.settled = true;
    const payout = won
      ? capPayout(Math.round(info.stake * Math.pow(STEP_MULTIPLIER, info.streak)))
      : 0;
    if (payout > 0) {
      creditArcade(
        uid,
        payout,
        `Hi-Lo ${info.id} · ${info.streak} correct`,
        `hl-${info.id}-w`
      );
    }
    const entry: HistoryEntry = {
      id: info.id,
      at: Date.now(),
      stake: info.stake,
      streak: info.streak,
      payout,
    };
    if (onScreen) {
      setWonAmount(payout);
      setPhase(won ? 'cashed' : 'lost');
      setHistory((prev) => {
        const next = [entry, ...prev].slice(0, 40);
        saveArcadeHistory(`hl_history_${uid}`, next);
        return next;
      });
    } else {
      const list = loadArcadeHistory<HistoryEntry>(`hl_history_${uid}`);
      saveArcadeHistory(`hl_history_${uid}`, [entry, ...list].slice(0, 40));
    }
  };

  // Leaving mid-round: bank a running streak; a fresh deal refunds the stake.
  useEffect(
    () => () => {
      const info = roundRef.current;
      const uid = userRef.current?.uid;
      if (!info || info.settled || !uid) return;
      if (info.streak > 0) {
        settle(false, true);
      } else {
        info.settled = true;
        creditArcade(uid, info.stake, `Hi-Lo refund ${info.id}`, `hl-${info.id}-r`);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const start = async () => {
    if (!currentUser || busy || phase === 'running' || isOffline) return;
    if (coinBalance < stake) {
      setError('Not enough Coins to deal in.');
      return;
    }
    setBusy(true);
    setError(null);
    const id = newRoundId('HL');
    try {
      await arcadeDebit(currentUser.uid, stake, `Hi-Lo stake ${id}`, `hl-${id}-s`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not deal the cards.');
      setBusy(false);
      return;
    }
    setBusy(false);
    const first = drawCard();
    roundRef.current = { id, stake, current: first, streak: 0, settled: false };
    setCard(first);
    setNextCard(null);
    setStreak(0);
    setWonAmount(0);
    setPhase('running');
  };

  const guess = (higher: boolean) => {
    const info = roundRef.current;
    if (!info || phase !== 'running' || info.settled || flipping) return;
    const drawn = drawCard();
    const current = info.current;
    const correct =
      higher ? drawn.rank > current.rank : drawn.rank < current.rank;

    setFlipping(true);
    setNextCard(drawn);
    setDealKey((k) => k + 1);

    window.setTimeout(() => {
      setFlipping(false);
      if (correct) {
        info.current = drawn;
        info.streak += 1;
        setCard(drawn);
        setNextCard(null);
        setStreak(info.streak);
        setError(null);
      } else {
        settle(true, false);
      }
    }, 620);
  };

  const cashOut = () => {
    const info = roundRef.current;
    if (!info || phase !== 'running' || info.streak === 0) return;
    settle(true, true);
  };

  const reset = () => {
    roundRef.current = null;
    setPhase('idle');
    setStreak(0);
    setNextCard(null);
    setError(null);
  };

  const liveMultiplier = Math.pow(STEP_MULTIPLIER, streak);
  const livePayout = capPayout(Math.round(stake * liveMultiplier));

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
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-violet-300 via-purple-500 to-indigo-600 ring-1 ring-white/25 shadow-lg shadow-violet-500/40">
              <Layers className="w-[18px] h-[18px] text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]" />
            </span>
            <span>Hi-Lo Cards</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Call the next card higher or lower — every correct call multiplies ×1.9.
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
        <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-br from-violet-600/20 via-[#111420] to-indigo-600/15 p-8 text-center space-y-4">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-300 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
            <Layers className="w-7 h-7 text-white" />
          </div>
          <h2 className="font-display text-xl font-bold text-white">Sign in to deal in</h2>
          <p className="text-sm text-slate-400 max-w-sm mx-auto">
            Hi-Lo Cards runs on AddaBuzz Coins — sign in to sit at the table.
          </p>
          <button
            type="button"
            onClick={onOpenAuth}
            className="px-6 py-2.5 rounded-full bg-gradient-to-r from-violet-400 to-indigo-500 text-white text-sm font-semibold inline-flex items-center gap-2 shadow-lg shadow-violet-900/40"
          >
            <LogIn className="w-4 h-4" /> Sign In
          </button>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr] items-start">
          <section className="relative overflow-hidden rounded-3xl border border-violet-300/20 bg-[linear-gradient(160deg,rgba(30,16,58,0.95),rgba(10,10,22,0.98)_55%,rgba(22,14,44,0.98))] p-4 sm:p-5">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-[radial-gradient(closest-side,rgba(139,92,246,0.3),transparent)] blur-2xl"
            />
            <div className="relative flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-300/25 bg-violet-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-violet-200">
                {phase === 'running'
                  ? streak > 0
                    ? `Streak ${streak}`
                    : 'Pick higher or lower'
                  : phase === 'lost'
                  ? 'Round lost'
                  : phase === 'cashed'
                  ? 'Cashed out'
                  : 'Ready'}
              </span>
              {phase === 'running' && (
                <span className="font-mono text-xs font-bold text-slate-300">
                  ×{liveMultiplier.toFixed(2)}
                </span>
              )}
            </div>

            <div className="relative mt-4 flex min-h-[11rem] items-center justify-center gap-4">
              <CardFace card={card} dealKey={dealKey} dim={phase === 'idle'} />
              <span className="font-display text-2xl font-black text-slate-600">→</span>
              {nextCard ? (
                <CardFace card={nextCard} dealKey={dealKey + 1000} />
              ) : (
                <div className="grid h-36 w-24 place-items-center rounded-2xl border-2 border-dashed border-white/15 bg-white/[0.03]">
                  <Sparkles className="h-6 w-6 text-slate-600" />
                </div>
              )}
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
                          ? 'border-violet-300/60 bg-gradient-to-b from-violet-400/30 to-indigo-600/20 text-violet-100'
                          : 'border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]'
                      }`}
                    >
                      {fmtCoins(chip)}
                    </button>
                  ))}
                </div>
              )}
              {phase === 'running' ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => guess(true)}
                      disabled={flipping}
                      className="h-12 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-500 text-emerald-950 text-sm font-black inline-flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-900/40 disabled:opacity-50 active:scale-[0.99] transition-transform"
                    >
                      <ArrowUp className="w-4 h-4" /> Higher
                    </button>
                    <button
                      type="button"
                      onClick={() => guess(false)}
                      disabled={flipping}
                      className="h-12 rounded-2xl bg-gradient-to-r from-rose-400 to-pink-500 text-rose-950 text-sm font-black inline-flex items-center justify-center gap-1.5 shadow-lg shadow-rose-900/40 disabled:opacity-50 active:scale-[0.99] transition-transform"
                    >
                      <ArrowDown className="w-4 h-4" /> Lower
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={cashOut}
                    disabled={streak === 0 || flipping}
                    className="w-full h-11 rounded-2xl border border-violet-300/30 bg-violet-500/10 hover:bg-violet-500/20 text-violet-100 text-sm font-bold inline-flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    {streak === 0
                      ? 'Win one call to unlock the bank'
                      : `Bank ×${liveMultiplier.toFixed(2)} · ${fmtCoins(livePayout)}`}
                  </button>
                </div>
              ) : phase === 'idle' ? (
                <button
                  type="button"
                  onClick={() => void start()}
                  disabled={busy || isOffline}
                  className="w-full h-12 rounded-2xl bg-gradient-to-r from-violet-400 via-purple-500 to-indigo-600 text-white text-sm font-bold inline-flex items-center justify-center gap-2 shadow-[0_16px_36px_-14px_rgba(139,92,246,0.9)] ring-1 ring-white/20 disabled:opacity-45 disabled:cursor-not-allowed active:scale-[0.99] transition-transform"
                >
                  <Layers className="w-4 h-4" />
                  {busy ? 'Dealing…' : `Deal in · ${fmtCoins(stake)}`}
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
                      ? `Banked ${fmtCoins(wonAmount)} Coins after ${streak} correct call${streak === 1 ? '' : 's'}`
                      : 'Wrong call — the round stake is gone.'}
                  </div>
                  <button
                    type="button"
                    onClick={reset}
                    className="w-full h-12 rounded-2xl border border-white/10 bg-white/[0.06] hover:bg-white/[0.1] text-slate-200 text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors"
                  >
                    <Sparkles className="w-4 h-4" /> New deal
                  </button>
                </div>
              )}
              {isOffline && (
                <p className="text-center text-[10px] font-medium text-violet-300/80">
                  Offline — reconnecting before the next deal.
                </p>
              )}
            </div>
          </section>

          <aside className="space-y-4">
            <section className="rounded-3xl border border-white/[0.07] bg-[#111420] p-4 sm:p-5">
              <h2 className="font-display text-sm font-semibold text-white">Streak payouts</h2>
              <div className="mt-3 grid grid-cols-3 gap-1.5 text-center">
                {[1, 2, 3, 4, 5].map((n) => (
                  <div
                    key={n}
                    className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-1.5 py-1.5"
                  >
                    <p className="text-[9px] text-slate-400">{n} in a row</p>
                    <p className="font-mono text-[11px] font-bold text-violet-300">
                      ×{Math.pow(STEP_MULTIPLIER, n).toFixed(2)}
                    </p>
                  </div>
                ))}
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-1.5 py-1.5">
                  <p className="text-[9px] text-slate-400">Tie</p>
                  <p className="font-mono text-[11px] font-bold text-rose-300">loses</p>
                </div>
              </div>
              <p className="mt-3 text-[10px] leading-relaxed text-slate-500">
                Aces play high. Equal ranks count as a wrong call — bank before you feel lucky.
              </p>
            </section>

            <section className="rounded-3xl border border-white/[0.07] bg-[#111420] p-4 sm:p-5">
              <h2 className="font-display text-sm font-semibold text-white">Recent rounds</h2>
              {history.length === 0 ? (
                <p className="mt-3 text-[11px] text-slate-500">
                  No rounds yet — your calls will show up here.
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
                            h.payout > 0 ? 'bg-emerald-400' : 'bg-rose-400'
                          }`}
                        />
                        {h.streak} correct · {fmtCoins(h.stake)}
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
