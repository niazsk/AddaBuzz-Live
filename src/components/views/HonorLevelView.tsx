import React from 'react';
import {
  ArrowLeft,
  Award,
  Crown,
  Gem,
  Gift,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  Wallet,
} from 'lucide-react';
import { UserProfile, WalletTransaction } from '../../types/app';
import {
  computeHonor,
  HONOR_LEVELS,
  HONOR_WEIGHTS,
  honorActivity,
  honorBadges,
} from '../../lib/honor';

interface HonorLevelViewProps {
  currentUser: UserProfile;
  coinBalance: number;
  diamondBalance: number;
  transactions: WalletTransaction[];
  onBack: () => void;
}

export const HonorLevelView: React.FC<HonorLevelViewProps> = ({
  currentUser,
  coinBalance,
  diamondBalance,
  transactions,
  onBack,
}) => {
  const input = {
    followers: currentUser.followersCount ?? 0,
    visitors: currentUser.visitorsCount ?? 0,
    diamonds: diamondBalance,
    coins: coinBalance,
  };

  const progress = computeHonor(input);
  const badges = honorBadges(input, currentUser.accountType !== 'USER' || Boolean(currentUser.isHost));
  const activity = honorActivity(transactions).slice(0, 10);

  const breakdown = [
    {
      icon: Users,
      label: 'Followers',
      detail: `${input.followers.toLocaleString()} × ${HONOR_WEIGHTS.follower}`,
      points: input.followers * HONOR_WEIGHTS.follower,
      tone: 'text-sky-300',
    },
    {
      icon: Star,
      label: 'Profile visitors',
      detail: `${input.visitors.toLocaleString()} × ${HONOR_WEIGHTS.visitor}`,
      points: input.visitors * HONOR_WEIGHTS.visitor,
      tone: 'text-violet-300',
    },
    {
      icon: Gem,
      label: 'Diamonds',
      detail: '1 point each',
      points: Math.floor(input.diamonds),
      tone: 'text-cyan-300',
    },
    {
      icon: Wallet,
      label: 'Coins',
      detail: `1 point per ${HONOR_WEIGHTS.coinPerPoint} coins`,
      points: Math.floor(input.coins / HONOR_WEIGHTS.coinPerPoint),
      tone: 'text-amber-300',
    },
  ];

  return (
    <div className="space-y-5 pb-12">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to profile"
          className="w-9 h-9 rounded-xl bg-[#111420] border border-white/[0.08] hover:border-white/20 text-slate-300 hover:text-white flex items-center justify-center shrink-0 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="font-display text-xl font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-violet-400" />
            <span>Honor Level</span>
          </h1>
          <p className="text-[11px] text-slate-400">Calculated from your real activity</p>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-3xl border border-violet-500/25 bg-gradient-to-br from-violet-900/40 via-[#121522] to-fuchsia-900/20 p-5 sm:p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-400 via-purple-500 to-fuchsia-600 ring-1 ring-white/25 shadow-lg shadow-violet-500/40 flex items-center justify-center shrink-0">
            <Crown className="w-8 h-8 text-white drop-shadow" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-300">
              Level {progress.level}
            </p>
            <h2 className="font-display text-2xl font-black text-white">{progress.title}</h2>
            <p className="text-xs text-slate-300 mt-0.5">
              {progress.points.toLocaleString()} honor points
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-300">
              {progress.nextTitle ? `Next: ${progress.nextTitle}` : 'Highest level reached'}
            </span>
            <span className="text-violet-200 font-semibold tabular-nums">
              {progress.nextLevel
                ? `${progress.pointsToNext.toLocaleString()} pts to go`
                : 'Max'}
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-white/[0.08] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-amber-400 transition-all"
              style={{ width: `${progress.progressPercent}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-500">
            Honor points refresh automatically as followers, visits and balances change.
          </p>
        </div>
      </div>

      <section className="rounded-3xl bg-[#111420] border border-white/[0.08] p-4 sm:p-5 space-y-3">
        <h2 className="font-display text-sm font-semibold text-white flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-fuchsia-300" />
          How your points are calculated
        </h2>
        <div className="grid grid-cols-2 gap-2.5">
          {breakdown.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="rounded-2xl bg-white/[0.035] border border-white/[0.06] p-3"
              >
                <Icon className={`w-4 h-4 ${item.tone}`} />
                <p className="text-sm font-bold text-white mt-2 tabular-nums">
                  {item.points.toLocaleString()} pts
                </p>
                <p className="text-[11px] text-slate-300">{item.label}</p>
                <p className="text-[10px] text-slate-500">{item.detail}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-3xl bg-[#111420] border border-white/[0.08] p-4 sm:p-5 space-y-3">
        <h2 className="font-display text-sm font-semibold text-white flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-300" />
          Badges
        </h2>
        <div className="grid grid-cols-2 gap-2.5">
          {badges.map((badge) => (
            <div
              key={badge.id}
              className={`rounded-2xl border p-3 ${
                badge.unlocked
                  ? 'bg-amber-500/10 border-amber-500/30'
                  : 'bg-white/[0.02] border-white/[0.06] opacity-60'
              }`}
            >
              <Award
                className={`w-4 h-4 ${badge.unlocked ? 'text-amber-300' : 'text-slate-500'}`}
              />
              <p
                className={`text-xs font-semibold mt-1.5 ${
                  badge.unlocked ? 'text-white' : 'text-slate-400'
                }`}
              >
                {badge.label}
              </p>
              <p className="text-[10px] text-slate-500">{badge.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl bg-[#111420] border border-white/[0.08] p-4 sm:p-5 space-y-2">
        <h2 className="font-display text-sm font-semibold text-white">Level ladder</h2>
        <div className="space-y-1.5">
          {HONOR_LEVELS.map((def) => {
            const isCurrent = def.level === progress.level;
            return (
              <div
                key={def.level}
                className={`flex items-center justify-between rounded-xl px-3 py-2 border ${
                  isCurrent
                    ? 'bg-violet-600/20 border-violet-500/40'
                    : 'bg-white/[0.02] border-white/[0.05]'
                }`}
              >
                <span className="flex items-center gap-2 text-xs">
                  <span
                    className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold ${
                      isCurrent
                        ? 'bg-violet-500 text-white'
                        : progress.points >= def.minPoints
                        ? 'bg-white/[0.1] text-slate-200'
                        : 'bg-white/[0.04] text-slate-500'
                    }`}
                  >
                    {def.level}
                  </span>
                  <span className={isCurrent ? 'text-white font-semibold' : 'text-slate-300'}>
                    {def.title}
                  </span>
                </span>
                <span className="text-[11px] text-slate-500 tabular-nums">
                  {def.minPoints.toLocaleString()} pts
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-3xl bg-[#111420] border border-white/[0.08] p-4 sm:p-5 space-y-2">
        <h2 className="font-display text-sm font-semibold text-white flex items-center gap-2">
          <Gift className="w-4 h-4 text-rose-300" />
          Honor activity
        </h2>
        {activity.length === 0 ? (
          <p className="text-[11px] text-slate-500 py-4 text-center">
            No gift or diamond activity in your recent wallet history. Gifts you send and receive
            will appear here.
          </p>
        ) : (
          <div className="space-y-1.5">
            {activity.map((tx) => (
              <div
                key={tx.transactionId}
                className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.03] border border-white/[0.05] px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-xs text-slate-200 truncate">{tx.reason}</p>
                  <p className="text-[10px] text-slate-500">
                    {tx.counterparty ? `${tx.counterparty} · ` : ''}
                    {tx.timestampLabel}
                  </p>
                </div>
                <span
                  className={`text-xs font-semibold tabular-nums shrink-0 ${
                    tx.direction === 'CREDIT' ? 'text-emerald-300' : 'text-rose-300'
                  }`}
                >
                  {tx.direction === 'CREDIT' ? '+' : '-'}
                  {tx.amount.toLocaleString()} {tx.currency === 'COIN' ? '🪙' : '💎'}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
