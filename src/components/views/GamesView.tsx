import React from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpDown,
  Bomb,
  CircleArrowDown,
  CircleDot,
  Coins,
  Crown,
  Dices,
  Flame,
  Grid3x3,
  Joystick,
  Layers,
  Rocket,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react';
import { FRUIT_BY_ID, formatCoins } from '../../games/fruitManor/config';
import { FruitIcon } from '../games/FruitIcon';
import { GF_CHIPS } from '../../games/goldenFlower/config';
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
  tagline: string;
  stat: string;
  art: React.ReactNode;
  chip: string;
  border: string;
  background: string;
  glow: string;
  hoverBorder: string;
  hoverShadow: string;
  badgeCls: string;
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
      tagline: 'Call Heads or Tails — a correct call pays instantly, streaks build.',
      stat: '×1.96 payout',
      art: <Crown className="relative h-8 w-8 text-amber-950/90 drop-shadow" />,
      chip: 'from-yellow-200 via-amber-400 to-orange-500',
      border: 'border-yellow-300/20',
      background:
        'bg-[linear-gradient(160deg,rgba(58,40,8,0.92),rgba(18,14,8,0.98)_58%,rgba(24,18,10,0.98))]',
      glow: 'bg-[radial-gradient(closest-side,rgba(250,204,21,0.22),transparent)]',
      hoverBorder: 'hover:border-yellow-300/45',
      hoverShadow: 'hover:shadow-[0_26px_60px_-28px_rgba(250,204,21,0.5)]',
      badgeCls: 'border-yellow-300/25 bg-yellow-400/10 text-yellow-200',
      onOpen: onOpenCoinFlip,
    },
    {
      name: 'Bingo Bazaar',
      tagline: 'Buy a 3×3 card — 13 balls drop and every completed line pays.',
      stat: 'Full house ×40',
      art: (
        <Grid3x3 className="relative h-8 w-8 text-white drop-shadow-[0_6px_12px_rgba(0,0,0,0.45)]" />
      ),
      chip: 'from-fuchsia-300 via-pink-500 to-rose-600',
      border: 'border-fuchsia-300/20',
      background:
        'bg-[linear-gradient(160deg,rgba(84,12,58,0.92),rgba(22,8,19,0.98)_58%,rgba(32,10,26,0.98))]',
      glow: 'bg-[radial-gradient(closest-side,rgba(232,121,249,0.24),transparent)]',
      hoverBorder: 'hover:border-fuchsia-300/45',
      hoverShadow: 'hover:shadow-[0_26px_60px_-28px_rgba(232,121,249,0.55)]',
      badgeCls: 'border-fuchsia-300/25 bg-fuchsia-400/10 text-fuchsia-200',
      onOpen: onOpenBingoBazaar,
    },
    {
      name: 'Plinko Drop',
      tagline: 'Drop a ball through 8 peg rows — edge slots pay up to ×5.',
      stat: 'Up to ×5',
      art: (
        <CircleArrowDown className="relative h-8 w-8 text-white drop-shadow-[0_6px_12px_rgba(0,0,0,0.45)]" />
      ),
      chip: 'from-cyan-300 via-sky-500 to-indigo-600',
      border: 'border-sky-300/20',
      background:
        'bg-[linear-gradient(160deg,rgba(10,44,68,0.92),rgba(8,12,22,0.98)_58%,rgba(10,16,32,0.98))]',
      glow: 'bg-[radial-gradient(closest-side,rgba(56,189,248,0.26),transparent)]',
      hoverBorder: 'hover:border-sky-300/45',
      hoverShadow: 'hover:shadow-[0_26px_60px_-28px_rgba(56,189,248,0.55)]',
      badgeCls: 'border-sky-300/25 bg-sky-400/10 text-sky-200',
      onOpen: onOpenPlinko,
    },
    {
      name: 'Crash Rocket',
      tagline: 'Ride the multiplier as it climbs — cash out before the rocket blows.',
      stat: 'Up to ×200',
      art: (
        <Rocket className="relative h-8 w-8 text-white drop-shadow-[0_6px_12px_rgba(0,0,0,0.45)]" />
      ),
      chip: 'from-orange-300 via-rose-500 to-fuchsia-600',
      border: 'border-rose-300/20',
      background:
        'bg-[linear-gradient(160deg,rgba(66,14,36,0.92),rgba(18,10,18,0.98)_58%,rgba(34,10,32,0.98))]',
      glow: 'bg-[radial-gradient(closest-side,rgba(244,63,94,0.24),transparent)]',
      hoverBorder: 'hover:border-rose-300/45',
      hoverShadow: 'hover:shadow-[0_26px_60px_-28px_rgba(244,63,94,0.55)]',
      badgeCls: 'border-rose-300/25 bg-rose-400/10 text-rose-200',
      onOpen: onOpenCrash,
    },
    {
      name: 'Mines',
      tagline: '20 tiles, 3 mines — reveal gems and bank before you hit one.',
      stat: 'Instant cashout',
      art: (
        <Bomb className="relative h-8 w-8 text-white drop-shadow-[0_6px_12px_rgba(0,0,0,0.45)]" />
      ),
      chip: 'from-lime-300 via-emerald-500 to-teal-600',
      border: 'border-emerald-300/20',
      background:
        'bg-[linear-gradient(160deg,rgba(10,56,38,0.92),rgba(8,14,14,0.98)_58%,rgba(8,24,20,0.98))]',
      glow: 'bg-[radial-gradient(closest-side,rgba(16,185,129,0.24),transparent)]',
      hoverBorder: 'hover:border-emerald-300/45',
      hoverShadow: 'hover:shadow-[0_26px_60px_-28px_rgba(16,185,129,0.55)]',
      badgeCls: 'border-emerald-300/25 bg-emerald-400/10 text-emerald-200',
      onOpen: onOpenMines,
    },
    {
      name: 'Hi-Lo Cards',
      tagline: 'Call the next card higher or lower — each correct call adds ×1.9.',
      stat: '×1.9 per call',
      art: (
        <Layers className="relative h-8 w-8 text-white drop-shadow-[0_6px_12px_rgba(0,0,0,0.45)]" />
      ),
      chip: 'from-violet-300 via-purple-500 to-indigo-600',
      border: 'border-violet-300/20',
      background:
        'bg-[linear-gradient(160deg,rgba(40,20,80,0.92),rgba(12,10,24,0.98)_58%,rgba(20,14,40,0.98))]',
      glow: 'bg-[radial-gradient(closest-side,rgba(139,92,246,0.26),transparent)]',
      hoverBorder: 'hover:border-violet-300/45',
      hoverShadow: 'hover:shadow-[0_26px_60px_-28px_rgba(139,92,246,0.55)]',
      badgeCls: 'border-violet-300/25 bg-violet-400/10 text-violet-200',
      onOpen: onOpenHiLo,
    },
    {
      name: 'Roulette',
      tagline: 'Spin the European wheel — Red or Black ×2, the lone Zero ×14.',
      stat: 'Zero pays ×14',
      art: (
        <CircleDot className="relative h-8 w-8 text-white drop-shadow-[0_6px_12px_rgba(0,0,0,0.45)]" />
      ),
      chip: 'from-rose-300 via-red-500 to-slate-800',
      border: 'border-rose-300/20',
      background:
        'bg-[linear-gradient(160deg,rgba(58,12,26,0.92),rgba(14,10,16,0.98)_58%,rgba(26,12,16,0.98))]',
      glow: 'bg-[radial-gradient(closest-side,rgba(244,63,94,0.22),transparent)]',
      hoverBorder: 'hover:border-rose-300/45',
      hoverShadow: 'hover:shadow-[0_26px_60px_-28px_rgba(244,63,94,0.5)]',
      badgeCls: 'border-rose-300/25 bg-rose-400/10 text-rose-200',
      onOpen: onOpenRoulette,
    },
  ];

  return (
    <div className="space-y-6 pb-10">
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
          <h1 className="font-display text-2xl font-bold leading-tight inline-flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-violet-300 via-purple-500 to-fuchsia-600 ring-1 ring-white/25 shadow-lg shadow-violet-500/40">
              <Joystick className="w-[18px] h-[18px] text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]" />
            </span>
            <span>Games</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            AddaBuzz coin arcade — shared boards, instant rounds.
          </p>
        </div>
        <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-amber-300/25 bg-amber-400/[0.08] px-2.5 py-1.5">
          <Coins className="h-3.5 w-3.5 text-amber-300" />
          <span className="font-mono text-xs font-black tabular-nums text-amber-300">
            {formatCoins(coinBalance)}
          </span>
        </span>
      </div>

      {/* Hero */}
      <section className="relative overflow-hidden rounded-[26px] border border-white/[0.08] bg-[linear-gradient(135deg,rgba(76,29,149,0.55),rgba(17,20,32,0.96)_45%,rgba(14,165,233,0.16))] p-5 sm:p-6">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-[radial-gradient(closest-side,rgba(232,121,249,0.3),transparent)] blur-2xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-24 bottom-[-90px] h-56 w-56 rounded-full bg-[radial-gradient(closest-side,rgba(56,189,248,0.3),transparent)] blur-2xl"
        />
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-fuchsia-300/30 bg-fuchsia-400/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-fuchsia-200">
            <Sparkles className="h-3 w-3" /> Coin Arcade
          </span>
          <h2 className="mt-3 font-display text-2xl sm:text-3xl font-black leading-tight text-white">
            Nine games.{' '}
            <span className="bg-gradient-to-r from-fuchsia-300 via-sky-300 to-cyan-200 bg-clip-text text-transparent">
              One wallet.
            </span>
          </h2>
          <p className="mt-1.5 max-w-xl text-xs sm:text-sm leading-relaxed text-slate-300/85">
            Join the shared boards with everyone online, or jump into an instant round that
            settles the moment you play.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {[
              ['9', 'games'],
              ['2', 'shared boards'],
              ['7', 'instant rounds'],
            ].map(([value, label]) => (
              <span
                key={label}
                className="inline-flex items-baseline gap-1.5 rounded-full border border-white/[0.1] bg-white/[0.05] px-3 py-1.5"
              >
                <span className="font-display text-sm font-black text-white">{value}</span>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  {label}
                </span>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Shared boards */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-emerald-300" />
          <h3 className="font-display text-sm font-bold uppercase tracking-[0.14em] text-slate-300">
            Shared boards
          </h3>
          <span className="flex items-center gap-1 rounded-full border border-emerald-300/25 bg-emerald-400/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-200">
            <span className="live-dot h-1.5 w-1.5 rounded-full bg-emerald-400" /> Live now
          </span>
        </div>

        <div className="grid gap-3.5 lg:grid-cols-[1.35fr_1fr]">
          {/* Fruit Manor — flagship */}
          <button
            type="button"
            onClick={onOpenFruitManor}
            className="group relative overflow-hidden rounded-[24px] border border-emerald-300/20 bg-[linear-gradient(150deg,rgba(17,67,43,0.94),rgba(7,16,12,0.98)_55%,rgba(10,20,15,0.98))] p-5 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-300/45 hover:shadow-[0_30px_70px_-30px_rgba(16,185,129,0.6)] active:scale-[0.995]"
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-14 -top-14 h-52 w-52 rounded-full bg-[radial-gradient(closest-side,rgba(245,185,63,0.28),transparent)] blur-2xl"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -left-16 bottom-[-50px] h-48 w-48 rounded-full bg-[radial-gradient(closest-side,rgba(16,185,129,0.32),transparent)] blur-2xl"
            />
            <div className="relative flex items-start gap-4">
              <span className="relative grid h-[68px] w-[68px] shrink-0 place-items-center rounded-[18px] border border-emerald-300/30 bg-gradient-to-br from-emerald-400/30 to-teal-600/10">
                <span
                  aria-hidden="true"
                  className="absolute inset-0 rounded-[18px] bg-gradient-to-b from-white/20 to-transparent"
                />
                <FruitIcon
                  fruitId="watermelon"
                  className="relative h-11 w-11 drop-shadow-[0_8px_16px_rgba(0,0,0,0.5)]"
                />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="rounded-full border border-amber-300/40 bg-amber-400/15 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-amber-200">
                    Flagship
                  </span>
                  <h4 className="font-display text-lg font-extrabold text-[#F7F3E8]">
                    Fruit Manor
                  </h4>
                </div>
                <p className="mt-1.5 text-[11px] leading-relaxed text-emerald-100/75">
                  The shared wheel — every player joins the same round. Tap a fruit, watch the
                  draw, win up to ×{fruitMaxMultiplier}.
                </p>
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  <span className="flex items-center gap-1 rounded-full bg-white/[0.07] px-2 py-0.5 text-[9px] font-semibold text-slate-200">
                    <Users className="h-3 w-3" /> Shared board
                  </span>
                  <span className="flex items-center gap-1 rounded-full bg-white/[0.07] px-2 py-0.5 text-[9px] font-semibold text-slate-200">
                    <Sparkles className="h-3 w-3 text-amber-300" /> Up to ×{fruitMaxMultiplier}
                  </span>
                </div>
              </div>
              <span className="mt-1 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-emerald-950 shadow-[0_12px_26px_-10px_rgba(16,185,129,0.9)] transition-transform duration-200 group-hover:translate-x-0.5">
                <ArrowRight className="h-5 w-5" />
              </span>
            </div>
          </button>

          {/* Golden Flower */}
          <button
            type="button"
            onClick={onOpenGoldenFlower}
            className="group relative overflow-hidden rounded-[24px] border border-violet-300/20 bg-[linear-gradient(160deg,rgba(66,26,136,0.9),rgba(17,10,30,0.98)_58%,rgba(26,12,40,0.98))] p-5 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-violet-300/45 hover:shadow-[0_26px_60px_-28px_rgba(139,92,246,0.6)] active:scale-[0.995]"
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-[radial-gradient(closest-side,rgba(232,121,249,0.22),transparent)] blur-2xl"
            />
            <div className="relative flex items-start justify-between gap-2">
              <span className="relative grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-violet-300 via-purple-500 to-fuchsia-600 ring-1 ring-white/25 shadow-lg">
                <span
                  aria-hidden="true"
                  className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/30 to-transparent"
                />
                <GoldenFlowerIcon className="relative h-8 w-8 drop-shadow-[0_6px_12px_rgba(0,0,0,0.45)]" />
              </span>
              <span className="flex items-center gap-1 rounded-full border border-rose-400/40 bg-rose-500/15 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-rose-200">
                <span className="live-dot h-1.5 w-1.5 rounded-full bg-rose-400" /> Live
              </span>
            </div>
            <h4 className="relative mt-3 font-display text-base font-extrabold text-[#F7F3E8]">
              Golden Flower
            </h4>
            <p className="relative mt-1 text-[11px] leading-relaxed text-slate-300/75">
              Pick a chip, tap dealer seat A, B or C — best three-card hand pays.
            </p>
            <div className="relative mt-2.5 flex flex-wrap items-center gap-1.5">
              <span className="rounded-full border border-violet-300/25 bg-violet-400/10 px-2 py-0.5 text-[9px] font-semibold text-violet-200">
                3 dealer seats
              </span>
              <span className="rounded-full border border-violet-300/25 bg-violet-400/10 px-2 py-0.5 text-[9px] font-semibold text-violet-200">
                Win ×2.98
              </span>
            </div>
            <div className="relative mt-3 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 group-hover:text-white transition-colors">
                Play now
              </span>
              <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-violet-300 via-purple-500 to-fuchsia-600 text-white shadow-lg ring-1 ring-white/20 transition-transform duration-200 group-hover:translate-x-0.5">
                <ArrowRight className="h-4 w-4" />
              </span>
            </div>
          </button>
        </div>
      </section>

      {/* Instant arcade */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Flame className="h-4 w-4 text-amber-300" />
          <h3 className="font-display text-sm font-bold uppercase tracking-[0.14em] text-slate-300">
            Instant arcade
          </h3>
          <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-400">
            Solo rounds
          </span>
        </div>

        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {instantGames.map((g) => (
            <button
              key={g.name}
              type="button"
              onClick={g.onOpen}
              className={`group relative overflow-hidden rounded-[22px] border p-4 text-left transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.995] ${g.border} ${g.background} ${g.hoverBorder} ${g.hoverShadow}`}
            >
              <div
                aria-hidden="true"
                className={`pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full ${g.glow} blur-2xl`}
              />
              <div className="relative flex items-start justify-between gap-2">
                <span
                  className={`relative grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br ${g.chip} ring-1 ring-white/25 shadow-lg`}
                >
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/30 to-transparent"
                  />
                  {g.art}
                </span>
                <span
                  className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wide ${g.badgeCls}`}
                >
                  <Sparkles className="h-2.5 w-2.5" /> Instant
                </span>
              </div>
              <h4 className="relative mt-3 font-display text-base font-extrabold text-[#F7F3E8]">
                {g.name}
              </h4>
              <p className="relative mt-1 text-[11px] leading-relaxed text-slate-300/75">
                {g.tagline}
              </p>
              <div className="relative mt-2.5 flex flex-wrap items-center gap-1.5">
                <span
                  className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold ${g.badgeCls}`}
                >
                  {g.stat}
                </span>
                <span className="flex items-center gap-1 rounded-full border border-white/[0.07] bg-white/[0.04] px-2 py-0.5 text-[9px] font-semibold text-slate-300">
                  <Dices className="h-2.5 w-2.5" /> Coin bet
                </span>
              </div>
              <div className="relative mt-3 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 group-hover:text-white transition-colors">
                  Play now
                </span>
                <span
                  className={`grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br ${g.chip} text-white shadow-lg ring-1 ring-white/20 transition-transform duration-200 group-hover:translate-x-0.5`}
                >
                  <ArrowRight className="h-4 w-4" />
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[10px] font-semibold text-slate-300">
          <ArrowUpDown className="h-3 w-3 text-slate-400" /> Instant settle
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[10px] font-semibold text-slate-300">
          <TrendingUp className="h-3 w-3 text-emerald-300" /> Payouts straight to Coin balance
        </span>
      </div>

      <p className="text-[10px] leading-relaxed text-slate-500">
        All games use AddaBuzz Coins — no cash value, no purchases, no withdrawals. Golden Flower
        chips start at {formatCoins(GF_CHIPS[0])} coins.
      </p>
    </div>
  );
};
