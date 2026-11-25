import React from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Bomb,
  ChevronRight,
  CircleArrowDown,
  CircleDot,
  Coins,
  Crown,
  Flame,
  Grid3x3,
  Joystick,
  Layers,
  Rocket,
  Users,
} from 'lucide-react';
import { FRUIT_BY_ID, formatCoins } from '../../games/fruitManor/config';
import { FruitIcon } from '../games/FruitIcon';
import { GoldenFlowerIcon } from '../games/GoldenFlowerIcon';

interface GamesViewProps {
  coinBalance: number;
  onBack: () => void;
  onOpenFruitManor: () => void;
  onOpenGoldenFlower: () => void;
  onOpenCoinFlip: () => void;
  onOpenBingoBazaar: () => void;
  onOpenPlinko: () => void;
  onOpenCrash: () => void;
  onOpenMines: () => void;
  onOpenHiLo: () => void;
  onOpenRoulette: () => void;
}

interface ArcadeGame {
  name: string;
  stat: string;
  art: React.ReactNode;
  chip: string;
  onOpen: () => void;
}

export const GamesView: React.FC<GamesViewProps> = ({
  coinBalance,
  onBack,
  onOpenFruitManor,
  onOpenGoldenFlower,
  onOpenCoinFlip,
  onOpenBingoBazaar,
  onOpenPlinko,
  onOpenCrash,
  onOpenMines,
  onOpenHiLo,
  onOpenRoulette,
}) => {
  const fruitMaxMultiplier = Math.max(
    ...Array.from(FRUIT_BY_ID.values()).map((f) => f.multiplier)
  );

  const instantGames: ArcadeGame[] = [
    {
      name: 'Coin Flip Arena',
      stat: '×1.96 payout',
      art: <Crown className="relative h-5 w-5 text-amber-950/90 drop-shadow" />,
      chip: 'from-yellow-200 via-amber-400 to-orange-500',
      onOpen: onOpenCoinFlip,
    },
    {
      name: 'Bingo Bazaar',
      stat: 'Full house ×40',
      art: (
        <Grid3x3 className="relative h-5 w-5 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.45)]" />
      ),
      chip: 'from-fuchsia-300 via-pink-500 to-rose-600',
      onOpen: onOpenBingoBazaar,
    },
    {
      name: 'Plinko Drop',
      stat: 'Up to ×5',
      art: (
        <CircleArrowDown className="relative h-5 w-5 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.45)]" />
      ),
      chip: 'from-cyan-300 via-sky-500 to-indigo-600',
      onOpen: onOpenPlinko,
    },
    {
      name: 'Crash Rocket',
      stat: 'Up to ×200',
      art: (
        <Rocket className="relative h-5 w-5 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.45)]" />
      ),
      chip: 'from-orange-300 via-rose-500 to-fuchsia-600',
      onOpen: onOpenCrash,
    },
    {
      name: 'Mines',
      stat: 'Instant cashout',
      art: (
        <Bomb className="relative h-5 w-5 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.45)]" />
      ),
      chip: 'from-lime-300 via-emerald-500 to-teal-600',
      onOpen: onOpenMines,
    },
    {
      name: 'Hi-Lo Cards',
      stat: '×1.9 per call',
      art: (
        <Layers className="relative h-5 w-5 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.45)]" />
      ),
      chip: 'from-violet-300 via-purple-500 to-indigo-600',
      onOpen: onOpenHiLo,
    },
    {
      name: 'Roulette',
      stat: 'Zero pays ×14',
      art: (
        <CircleDot className="relative h-5 w-5 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.45)]" />
      ),
      chip: 'from-rose-300 via-red-500 to-slate-800',
      onOpen: onOpenRoulette,
    },
  ];

  return (
    <div className="space-y-5 pb-10">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to profile"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-[#111420] text-slate-300 transition-colors hover:border-white/20 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="flex min-w-0 flex-1 items-center gap-2.5 font-display text-xl font-bold text-white">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-violet-300 via-purple-500 to-fuchsia-600 ring-1 ring-white/25 shadow-lg shadow-violet-500/40">
            <Joystick className="w-[18px] h-[18px] text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]" />
          </span>
          <span className="truncate">Games</span>
        </h1>
        <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-amber-300/25 bg-amber-400/[0.08] px-2.5 py-1.5">
          <Coins className="h-3.5 w-3.5 text-amber-300" />
          <span className="font-mono text-xs font-black tabular-nums text-amber-300">
            {formatCoins(coinBalance)}
          </span>
        </span>
      </div>

      {/* Shared boards */}
      <section className="space-y-2.5">
        <div className="flex items-center gap-2 px-1">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-emerald-400 to-teal-500" />
          <h2 className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
            Shared boards
          </h2>
          <span className="flex items-center gap-1 rounded-full border border-emerald-300/25 bg-emerald-400/10 px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-wide text-emerald-200">
            <span className="live-dot h-1 w-1 rounded-full bg-emerald-400" /> Live
          </span>
          <span aria-hidden="true" className="h-px flex-1 bg-gradient-to-r from-white/[0.08] to-transparent" />
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2">
          <button
            type="button"
            onClick={onOpenFruitManor}
            className="group flex items-center gap-3 overflow-hidden rounded-[22px] border border-emerald-300/20 bg-[linear-gradient(150deg,rgba(17,67,43,0.5),rgba(10,14,20,0.92))] p-3.5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-300/45 hover:shadow-[0_22px_50px_-26px_rgba(16,185,129,0.55)] active:scale-[0.99]"
          >
            <span className="relative grid h-11 w-11 shrink-0 place-items-center rounded-[14px] border border-emerald-300/30 bg-gradient-to-br from-emerald-400/30 to-teal-600/10">
              <span
                aria-hidden="true"
                className="absolute inset-0 rounded-[14px] bg-gradient-to-b from-white/20 to-transparent"
              />
              <FruitIcon fruitId="watermelon" className="relative h-7 w-7 drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)]" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5">
                <span className="truncate font-display text-[14px] font-extrabold text-white">
                  Fruit Manor
                </span>
                <span className="shrink-0 rounded-full border border-amber-300/40 bg-amber-400/15 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.12em] text-amber-200">
                  Flagship
                </span>
              </span>
              <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] font-medium text-emerald-100/70">
                <span className="inline-flex items-center gap-1">
                  <Users className="h-2.5 w-2.5" />
                  Shared wheel
                </span>
                <span aria-hidden="true" className="text-emerald-100/40">·</span>
                <span>Win up to ×{fruitMaxMultiplier}</span>
              </span>
            </span>
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-emerald-950 shadow-[0_10px_22px_-10px_rgba(16,185,129,0.9)] transition-transform duration-200 group-hover:translate-x-0.5">
              <ArrowRight className="h-4 w-4" />
            </span>
          </button>

          <button
            type="button"
            onClick={onOpenGoldenFlower}
            className="group flex items-center gap-3 overflow-hidden rounded-[22px] border border-violet-300/20 bg-[linear-gradient(150deg,rgba(66,26,136,0.5),rgba(12,10,22,0.92))] p-3.5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-300/45 hover:shadow-[0_22px_50px_-26px_rgba(139,92,246,0.55)] active:scale-[0.99]"
          >
            <span className="relative grid h-11 w-11 shrink-0 place-items-center rounded-[14px] bg-gradient-to-br from-violet-300 via-purple-500 to-fuchsia-600 ring-1 ring-white/25 shadow-lg">
              <span
                aria-hidden="true"
                className="absolute inset-0 rounded-[14px] bg-gradient-to-b from-white/30 to-transparent"
              />
              <GoldenFlowerIcon className="relative h-6 w-6 drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)]" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5">
                <span className="truncate font-display text-[14px] font-extrabold text-white">
                  Golden Flower
                </span>
                <span className="flex shrink-0 items-center gap-1 rounded-full border border-rose-400/40 bg-rose-500/15 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide text-rose-200">
                  <span className="live-dot h-1 w-1 rounded-full bg-rose-400" /> Live
                </span>
              </span>
              <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] font-medium text-violet-100/70">
                <span>3 dealer seats</span>
                <span aria-hidden="true" className="text-violet-100/40">·</span>
                <span>Win ×2.98</span>
              </span>
            </span>
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-violet-300 via-purple-500 to-fuchsia-600 text-white shadow-lg ring-1 ring-white/20 transition-transform duration-200 group-hover:translate-x-0.5">
              <ArrowRight className="h-4 w-4" />
            </span>
          </button>
        </div>
      </section>

      {/* Instant arcade */}
      <section className="space-y-2.5">
        <div className="flex items-center gap-2 px-1">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-amber-300 to-rose-500" />
          <h2 className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
            Instant arcade
          </h2>
          <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-1.5 py-0.5 text-[8.5px] font-semibold uppercase tracking-wide text-slate-400">
            7 solo rounds
          </span>
          <span aria-hidden="true" className="h-px flex-1 bg-gradient-to-r from-white/[0.08] to-transparent" />
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {instantGames.map((g) => (
            <button
              key={g.name}
              type="button"
              onClick={g.onOpen}
              className="group flex items-center gap-2.5 overflow-hidden rounded-2xl border border-white/[0.055] bg-white/[0.018] p-2.5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-white/[0.14] hover:bg-white/[0.05] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
            >
              <span
                className={`relative grid h-10 w-10 shrink-0 place-items-center rounded-[13px] bg-gradient-to-br ${g.chip} ring-1 ring-white/25 shadow-md transition-transform duration-200 group-hover:scale-105`}
              >
                <span
                  aria-hidden="true"
                  className="absolute inset-0 rounded-[13px] bg-gradient-to-b from-white/30 via-white/0 to-black/15"
                />
                {g.art}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[11.5px] font-semibold text-slate-100 transition-colors group-hover:text-white">
                  {g.name}
                </span>
                <span className="mt-0.5 block truncate text-[9px] font-medium uppercase tracking-[0.1em] text-slate-400">
                  {g.stat}
                </span>
              </span>
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-600 transition-all group-hover:translate-x-0.5 group-hover:text-slate-300" />
            </button>
          ))}
        </div>
      </section>

      <div className="flex items-center gap-1.5 px-1 text-[10px] font-medium text-slate-500">
        <Flame className="h-3 w-3 text-amber-300/80" />
        <span>Bets settle instantly to your Coin balance</span>
      </div>
    </div>
  );
};
