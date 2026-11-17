import React from 'react';
import { ChevronRight, Gamepad2, Wifi, WifiOff } from 'lucide-react';
import { FruitIcon } from '../games/FruitIcon';
import { FruitId } from '../../games/fruitManor/config';

interface GameCenterViewProps {
  isOffline: boolean;
  onOpenFruitManor: () => void;
}

const CARD_FRUITS: FruitId[] = ['strawberry', 'grapes', 'watermelon', 'orange', 'cherries'];

export const GameCenterView: React.FC<GameCenterViewProps> = ({ isOffline, onOpenFruitManor }) => {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-xl border border-violet-400/30 bg-violet-500/15">
            <Gamepad2 className="h-5 w-5 text-violet-300" />
          </span>
          <div className="leading-tight">
            <h1 className="font-display text-xl font-extrabold tracking-tight text-white">Game Center</h1>
            <p className="text-xs text-slate-400">Play with your AddaBuzz account</p>
          </div>
        </div>
        <span
          className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
            isOffline ? 'border-amber-400/40 bg-amber-400/10 text-amber-300' : 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
          }`}
        >
          {isOffline ? <WifiOff className="h-3 w-3" /> : <Wifi className="h-3 w-3" />}
          {isOffline ? 'Offline' : 'Online'}
        </span>
      </header>

      <button
        type="button"
        onClick={onOpenFruitManor}
        disabled={isOffline}
        aria-label="Open Fruit Manor game"
        className="group relative mt-5 block w-full overflow-hidden rounded-3xl border border-emerald-300/20 text-left transition-all enabled:hover:-translate-y-0.5 enabled:hover:border-emerald-300/40 enabled:hover:shadow-[0_16px_48px_rgba(16,185,129,0.15)] disabled:cursor-not-allowed disabled:opacity-55"
      >
        <div className="absolute inset-0 bg-[linear-gradient(140deg,#0E3B24_0%,#0A2418_45%,#1A2E12_100%)]" />
        <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-[radial-gradient(closest-side,rgba(245,185,63,0.22),transparent)] blur-xl" />
        <div className="absolute -bottom-24 -left-10 h-56 w-56 rounded-full bg-[radial-gradient(closest-side,rgba(168,85,247,0.16),transparent)] blur-xl" />

        <div className="relative flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:gap-6 sm:p-6">
          <div className="flex shrink-0 items-end justify-center -space-x-3 sm:w-44">
            {CARD_FRUITS.map((f, i) => (
              <FruitIcon
                key={f}
                fruitId={f}
                className={`w-12 drop-shadow-[0_6px_10px_rgba(0,0,0,0.5)] transition-transform duration-300 group-hover:-translate-y-1 sm:w-14 ${i % 2 ? 'translate-y-1.5' : ''}`}
              />
            ))}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-2xl font-black tracking-tight text-[#F7F3E8]">Fruit Manor</h2>
              <span className="rounded-md border border-amber-300/40 bg-amber-400/15 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-amber-300">
                Demo
              </span>
              <span className="rounded-md border border-emerald-300/30 bg-emerald-400/10 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-emerald-300">
                {isOffline ? 'Unavailable offline' : 'Available'}
              </span>
            </div>
            <p className="mt-1.5 text-sm leading-relaxed text-emerald-100/70">
              Spin the orchard wheel. Pick your fruit, stack your chips and win up to ×38 — fast rounds, instant payouts.
            </p>
            <p className="mt-2 text-[10px] font-medium uppercase tracking-[0.14em] text-emerald-200/45">
              Virtual coins only · No real wallet impact
            </p>
          </div>
          <span className="flex h-11 shrink-0 items-center gap-1.5 self-start rounded-xl bg-gradient-to-r from-amber-300 to-orange-500 px-4 text-sm font-extrabold text-[#3B2A05] shadow-[0_6px_20px_rgba(245,185,63,0.35)] transition-transform group-hover:scale-[1.03] sm:self-center">
            Play <ChevronRight className="h-4 w-4" />
          </span>
        </div>
      </button>
    </div>
  );
};