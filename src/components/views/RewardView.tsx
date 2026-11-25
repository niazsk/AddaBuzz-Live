import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  CalendarCheck,
  CheckCircle2,
  Coins,
  Flame,
  Gamepad2,
  Gift,
  Heart,
  Radio,
} from 'lucide-react';
import { UserProfile, RewardProfile, WalletTransaction } from '../../types/app';
import {
  claimReward,
  ensureRewardProfile,
  subscribeRewardProfile,
} from '../../lib/firestoreService';
import { CHECK_IN_REWARDS, REWARD_TASKS, rewardDayKey } from '../../rewards/config';

interface RewardViewProps {
  currentUser: UserProfile;
  coinBalance: number;
  transactions?: WalletTransaction[];
  onBack: () => void;
  onToast?: (title: string, desc?: string, tone?: 'info' | 'success' | 'warning' | 'error') => void;
}

const TASK_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  watch: Radio,
  gift: Gift,
  follow: Heart,
  game: Gamepad2,
};

export const RewardView: React.FC<RewardViewProps> = ({
  currentUser,
  coinBalance,
  transactions = [],
  onBack,
  onToast,
}) => {
  const [profile, setProfile] = useState<RewardProfile | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void ensureRewardProfile(currentUser.uid).then(() => {
      if (cancelled) return;
    });
    const unsub = subscribeRewardProfile(currentUser.uid, setProfile);
    return () => {
      cancelled = true;
      unsub();
    };
  }, [currentUser.uid]);

  const today = rewardDayKey();
  const yesterday = rewardDayKey(new Date(Date.now() - 86400000));
  const sameDay = profile?.day === today;
  const claimed = sameDay ? profile?.claimed ?? [] : [];
  const checkedInToday = profile?.checkInDate === today;
  const streak = profile?.streak ?? 0;
  const nextStreak =
    profile?.checkInDate === yesterday ? (streak >= 7 ? 1 : streak + 1) : 1;
  const activeDay = checkedInToday ? streak : nextStreak;

  const progressOf = (field: 'watchSeconds' | 'giftsSent' | 'followsMade' | 'gamesPlayed') =>
    sameDay ? profile?.[field] ?? 0 : 0;

  const rewardHistory = transactions.filter(
    (tx) =>
      tx.reason.startsWith('Daily Check-In Reward') ||
      tx.reason.startsWith('Daily Task Reward')
  );

  const handleClaim = async (kind: 'checkin' | 'watch' | 'gift' | 'follow' | 'game') => {
    if (busy) return;
    setBusy(kind);
    try {
      const result = await claimReward(currentUser.uid, kind);
      if (result.amount > 0) {
        onToast?.(
          'Reward Claimed!',
          `+${result.amount.toLocaleString()} coins added to your Main Balance.`,
          'success'
        );
      }
    } catch (err) {
      onToast?.(
        'Claim Failed',
        err instanceof Error ? err.message : 'Unable to claim reward.',
        'warning'
      );
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-5 pb-12 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to profile"
          className="w-9 h-9 rounded-full bg-white/[0.08] hover:bg-white/[0.15] border border-white/10 flex items-center justify-center text-white transition-colors shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-lg font-bold text-white inline-flex items-center gap-2">
            <Gift className="w-5 h-5 text-violet-400" />
            <span>Reward Center</span>
          </h1>
          <p className="text-[11px] text-slate-400">Check in daily & finish tasks to earn coins.</p>
        </div>
        <span className="flex shrink-0 items-center gap-1 rounded-full border border-amber-300/25 bg-amber-400/[0.08] px-2 py-1">
          <Coins className="h-3.5 w-3.5 text-amber-300" />
          <span className="font-mono text-xs font-black tabular-nums text-amber-300">
            {coinBalance.toLocaleString()}
          </span>
        </span>
      </div>

      {/* Daily Check-In */}
      <section className="rounded-2xl bg-[#111420] border border-white/[0.08] p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-sm font-semibold text-white flex items-center gap-2">
            <CalendarCheck className="w-4 h-4 text-violet-400" />
            <span>Daily Check-In</span>
          </h2>
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-300">
            <Flame className="w-3.5 h-3.5" />
            <span>{streak} day streak</span>
          </span>
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {CHECK_IN_REWARDS.map((amount, i) => {
            const dayNum = i + 1;
            const isDone = checkedInToday ? dayNum <= streak : dayNum < activeDay;
            const isToday = dayNum === activeDay && !checkedInToday;
            return (
              <div
                key={dayNum}
                className={`rounded-xl border p-1.5 text-center space-y-1 ${
                  isDone
                    ? 'bg-emerald-500/10 border-emerald-500/30'
                    : isToday
                    ? 'bg-violet-500/15 border-violet-500/50'
                    : 'bg-white/[0.03] border-white/[0.06]'
                }`}
              >
                <p className="text-[9px] font-semibold text-slate-400">Day {dayNum}</p>
                {isDone ? (
                  <CheckCircle2 className="w-4 h-4 mx-auto text-emerald-400" />
                ) : (
                  <Coins className={`w-4 h-4 mx-auto ${isToday ? 'text-violet-300' : 'text-amber-300/70'}`} />
                )}
                <p className={`text-[9px] font-mono font-bold ${isDone ? 'text-emerald-300' : 'text-amber-300'}`}>
                  +{amount}
                </p>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => handleClaim('checkin')}
          disabled={checkedInToday || busy !== null}
          className="w-full h-11 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-50 text-sm font-bold text-white inline-flex items-center justify-center gap-2 transition-all"
        >
          {checkedInToday ? (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>Checked in today — come back tomorrow!</span>
            </>
          ) : (
            <span>
              {busy === 'checkin' ? 'Claiming…' : `Check In · +${CHECK_IN_REWARDS[activeDay - 1]} coins`}
            </span>
          )}
        </button>
        <p className="text-[10px] text-slate-500">
          Keep your streak to unlock bigger rewards. Missing a day resets it to Day 1.
        </p>
      </section>

      {/* Daily Tasks */}
      <section className="space-y-2">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
          Daily Tasks
        </h2>
        <div className="space-y-2">
          {REWARD_TASKS.map((task) => {
            const Icon = TASK_ICONS[task.id];
            const progress = Math.min(progressOf(task.field), task.goal);
            const done = progress >= task.goal;
            const isClaimed = claimed.includes(`reward_${task.id}_${today}`);
            const pct = Math.round((progress / task.goal) * 100);
            return (
              <div
                key={task.id}
                className="rounded-2xl bg-[#111420] border border-white/[0.08] p-3.5 flex items-center gap-3"
              >
                <span className="w-10 h-10 shrink-0 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                  <Icon className="w-4.5 h-4.5 text-violet-300" />
                </span>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-white truncate">{task.title}</p>
                    <span className="text-[10px] font-mono font-bold text-amber-300 shrink-0">
                      +{task.reward} coins
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400">{task.description}</p>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 flex-1 rounded-full bg-white/[0.06] overflow-hidden">
                      <div
                        className={`h-full rounded-full ${done ? 'bg-emerald-400' : 'bg-violet-500'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[9px] font-mono text-slate-400 shrink-0">
                      {task.id === 'watch'
                        ? `${Math.floor(progress / 60)}/${task.goal / 60} min`
                        : `${progress}/${task.goal}`}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleClaim(task.id)}
                  disabled={!done || isClaimed || busy !== null}
                  className={`shrink-0 px-3 py-2 rounded-xl text-[11px] font-bold transition-colors ${
                    isClaimed
                      ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                      : done
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-[#111420]'
                      : 'bg-white/[0.04] text-slate-500 border border-white/[0.06]'
                  }`}
                >
                  {isClaimed ? 'Claimed' : busy === task.id ? '…' : done ? 'Claim' : 'Go'}
                </button>
              </div>
            );
          })}
        </div>
        <p className="text-[10px] text-slate-500 px-1">
          Tasks reset daily at 00:00 UTC. Rewards are added to your Main Coin balance.
        </p>
      </section>

      {/* Reward history */}
      <section className="space-y-2">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
          Reward History
        </h2>
        <div className="rounded-2xl bg-[#111420] border border-white/[0.08] divide-y divide-white/[0.06] overflow-hidden">
          {rewardHistory.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-slate-500">
              No rewards claimed in the loaded wallet history yet. Check-in and task rewards will
              appear here.
            </p>
          ) : (
            rewardHistory.map((tx) => (
              <div
                key={tx.transactionId}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-200 truncate">{tx.reason}</p>
                  <p className="text-[10px] text-slate-500">{tx.timestampLabel}</p>
                </div>
                <span className="text-xs font-bold text-emerald-300 tabular-nums shrink-0">
                  +{tx.amount.toLocaleString()} 🪙
                </span>
              </div>
            ))
          )}
        </div>
        <p className="text-[10px] text-slate-500 px-1">
          Showing the latest claimed rewards from your audited wallet ledger.
        </p>
      </section>
    </div>
  );
};