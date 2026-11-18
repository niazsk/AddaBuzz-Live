import React from 'react';
import { ArrowLeft, ChevronRight, Coins, Gamepad2, Sparkles, Users } from 'lucide-react';
import { FRUIT_BY_ID, formatCoins } from '../../games/fruitManor/config';
import { FruitIcon } from '../games/FruitIcon';

interface GamesViewProps {
  coinBalance: number;
  onBack: () => void;
  onOpenFruitManor: () => void;
}

const SOON_GAMES: { name: string; tagline: string }[] = [
  { name: 'Lucky Ladder', tagline: 'Climb the ladder, bank every step' },
  { name: 'Coin Flip Arena', tagline: 'Head-to-head coin duels' },
  { name: 'Bingo Bazaar', tagline: 'Room-wide bingo nights' },
];

export const GamesView: React.FC<GamesViewProps> = ({
  coinBalance,
  onBack,
  onOpenFruitManor,
}) => {
  return (
    <div className="space-y-5 pb-10">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to profile"
          className="w-9 h-9 rounded-xl bg-[#111420] border border-white/[0.08] hover:border-white/20 text-slate-300 hover:text-white flex items-center justify-center shrink-0 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl font-bold text-white leading-tight inline-flex items-center gap-2">
            <Gamepad2 className="w-5 h-5 text-violet-400" aria-hidden="true" />
            <span>Games</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Play with your AddaBuzz Coins — one shared board for the whole platform.
          </p>
        </div>
        <span className="flex shrink-0 items-center gap-1 rounded-full border border-amber-300/25 bg-amber-400/[0.08] px-2 py-1">
          <Coins className="h-3.5 w-3.5 text-amber-300" />
          <span className="font-mono text-xs font-black tabular-nums text-amber-300">
            {formatCoins(coinBalance)}
          </span>
        </span>
      </div>

      {/* Fruit Manor — the live shared board */}
      <button
        type="button"
        onClick={onOpenFruitManor}
        className="group relative w-full overflow-hidden rounded-2xl border border-emerald-300/25 bg-[linear-gradient(150deg,rgba(16,66,42,0.9),rgba(9,20,15,0.95))] p-4 text-left transition-all hover:border-emerald-300/50 hover:shadow-[0_12px_40px_-12px_rgba(16,185,129,0.45)] active:scale-[0.995]"
      >
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[radial-gradient(closest-side,rgba(245,185,63,0.22),transparent)] blur-xl" aria-hidden="true" />
        <div className="relative flex items-start gap-3">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-emerald-300/30 bg-emerald-400/10">
            <FruitIcon fruitId="watermelon" className="h-9 w-9" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <h2 className="font-display text-lg font-extrabold text-[#F7F3E8]">Fruit Manor</h2>
              <span className="flex items-center gap-1 rounded-full border border-rose-400/40 bg-rose-500/15 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-rose-200">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-400" /> Live
              </span>
              <span className="rounded-full border border-emerald-300/30 bg-emerald-400/10 px-1.5 py-0.5 text-[9px] font-bold text-emerald-200">
                Shared board
              </span>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-emerald-100/70">
              Tap a fruit, watch the wheel. Round clock, pool and result are identical for
              every player — you join automatically when you open it.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="flex items-center gap-1 rounded-full bg-white/[0.06] px-2 py-0.5 text-[9px] font-semibold text-slate-300">
                <Users className="h-3 w-3" /> Everyone, one board
              </span>
              <span className="flex items-center gap-1 rounded-full bg-white/[0.06] px-2 py-0.5 text-[9px] font-semibold text-slate-300">
                <Sparkles className="h-3 w-3" /> Up to ×{Math.max(...Array.from(FRUIT_BY_ID.values()).map((f) => f.multiplier))}
              </span>
            </div>
          </div>
          <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-emerald-200/70 transition-transform group-hover:translate-x-0.5" />
        </div>
      </button>

      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          Coming soon
        </p>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {SOON_GAMES.map((g) => (
            <div
              key={g.name}
              className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3 opacity-70"
            >
              <p className="text-sm font-bold text-slate-200">{g.name}</p>
              <p className="mt-0.5 text-[10px] leading-relaxed text-slate-400">{g.tagline}</p>
              <p className="mt-2 text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                In development
              </p>
            </div>
          ))}
        </div>
      </div>

      <p className="text-[10px] leading-relaxed text-slate-500">
        All games use AddaBuzz Coins — no cash value, no purchases, no withdrawals.
      </p>
    </div>
  );
};
