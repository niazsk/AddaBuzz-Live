import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  CalendarCheck,
  CheckCircle2,
  Crown,
  Gem,
  Gift,
  Heart,
  Radio,
  Sparkles,
} from 'lucide-react';
import { UserProfile, HostRewardProfile } from '../../types/app';
import {
  claimHostReward,
  ensureHostRewardProfile,
  subscribeHostRewardProfile,
} from '../../lib/firestoreService';
import {
  HOST_NEWBIE_REWARD,
  HOST_NEWBIE_SECONDS,
  HOST_TASKS,
  HOST_VALID_DAYS_GOAL,
  HOST_VALID_DAYS_REWARD,
  HOST_VALID_DAY_SECONDS,
  rewardDayKey,
} from '../../rewards/hostConfig';

interface HostRewardViewProps {
  currentUser: UserProfile;
  diamondBalance: number;
  onBack: () => void;
  onToast?: (title: string, desc?: string, tone?: 'info' | 'success' | 'warning' | 'error') => void;
}

const TASK_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  live30: Radio,
  live60: Radio,
  gift: Gift,
  follow: Heart,
};

export const HostRewardView: React.FC<HostRewardViewProps> = ({
  currentUser,
  diamondBalance,
  onBack,
  onToast,
}) => {
  const [profile, setProfile] = useState<HostRewardProfile | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const isFemale = currentUser.gender === 'Female';

  useEffect(() => {
    if (!isFemale) return;
    void ensureHostRewardProfile(currentUser.uid);
    const unsub = subscribeHostRewardProfile(currentUser.uid, setProfile);
    return () => unsub();
  }, [currentUser.uid, isFemale]);

  const today = rewardDayKey();
  const sameDay = profile?.day === today;
  const claimed = sameDay ? profile?.claimed ?? [] : [];
  const liveSeconds = sameDay ? profile?.liveSeconds ?? 0 : 0;
  const validDays =
    (profile?.validDays ?? 0) +
    (!sameDay && (profile?.liveSeconds ?? 0) >= HOST_VALID_DAY_SECONDS ? 1 : 0);
  const newbieDone = profile?.firstLiveDone ?? false;

  const handleClaim = async (kind: 'newbie' | 'valid' | 'live30' | 'live60' | 'gift' | 'follow') => {
    if (busy) return;
    setBusy(kind);
    try {
      const result = await claimHostReward(currentUser.uid, kind);
      if (result.amount > 0) {
        onToast?.(
          'Host Reward Claimed!',
          `+${result.amount.toLocaleString()} diamonds added to your balance.`,
          'success'
        );
      }
    } catch (err) {
      onToast?.(
        'Claim Failed',
        err instanceof Error ? err.message : 'Unable to claim host reward.',
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
            <Crown className="w-5 h-5 text-pink-400" />
            <span>Host Rewards</span>
          </h1>
          <p className="text-[11px] text-slate-400">
            Exclusive rewards for female hosts — earn diamonds by going live.
          </p>
        </div>
        <span className="flex shrink-0 items-center gap-1 rounded-full border border-sky-300/25 bg-sky-400/[0.08] px-2 py-1">
          <Gem className="h-3.5 w-3.5 text-sky-300" />
          <span className="font-mono text-xs font-black tabular-nums text-sky-300">
            {diamondBalance.toLocaleString()}
          </span>
        </span>
      </div>

      {!isFemale ? (
        <section className="rounded-2xl bg-[#111420] border border-white/[0.08] p-6 text-center space-y-2">
          <Crown className="w-8 h-8 mx-auto text-pink-400/60" />
          <p className="text-sm font-semibold text-white">Female hosts only</p>
          <p className="text-xs text-slate-400 leading-relaxed">
            Host Rewards are exclusive to female hosts. Set your gender to Female in
            your profile settings to unlock live streaming rewards.
          </p>
        </section>
      ) : (
        <>
          {/* New Host Bonus */}
          <section className="rounded-2xl bg-gradient-to-br from-pink-600/20 via-[#111420] to-[#111420] border border-pink-500/25 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-sm font-semibold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-pink-400" />
                <span>New Host Bonus</span>
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300">
                One-time
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Complete your first live stream (at least 1 minute) to earn{' '}
              <span className="font-mono font-bold text-sky-300">
                +{HOST_NEWBIE_REWARD.toLocaleString()} diamonds
              </span>
              .
            </p>
            <button
              type="button"
              onClick={() => handleClaim('newbie')}
              disabled={newbieDone || liveSeconds < HOST_NEWBIE_SECONDS || busy !== null}
              className="w-full h-11 rounded-xl bg-gradient-to-r from-pink-600 to-rose-500 hover:from-pink-500 hover:to-rose-400 disabled:opacity-50 text-sm font-bold text-white inline-flex items-center justify-center gap-2 transition-all"
            >
              {newbieDone ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Bonus claimed</span>
                </>
              ) : (
                <span>
                  {busy === 'newbie'
                    ? 'Claiming…'
                    : liveSeconds >= HOST_NEWBIE_SECONDS
                    ? `Claim +${HOST_NEWBIE_REWARD.toLocaleString()} diamonds`
                    : `Go live first · ${Math.min(liveSeconds, HOST_NEWBIE_SECONDS)}/${HOST_NEWBIE_SECONDS}s`}
                </span>
              )}
            </button>
          </section>

          {/* Daily Host Tasks */}
          <section className="space-y-2">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
              Daily Host Tasks
            </h2>
            <div className="space-y-2">
              {HOST_TASKS.map((task) => {
                const Icon = TASK_ICONS[task.id];
                const raw = sameDay ? profile?.[task.field] ?? 0 : 0;
                const progress = Math.min(raw, task.goal);
                const done = progress >= task.goal;
                const isClaimed = claimed.includes(`host_${task.id}_${today}`);
                const pct = Math.round((progress / task.goal) * 100);
                return (
                  <div
                    key={task.id}
                    className="rounded-2xl bg-[#111420] border border-white/[0.08] p-3.5 flex items-center gap-3"
                  >
                    <span className="w-10 h-10 shrink-0 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center">
                      <Icon className="w-4.5 h-4.5 text-pink-300" />
                    </span>
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-white truncate">{task.title}</p>
                        <span className="text-[10px] font-mono font-bold text-sky-300 shrink-0">
                          +{task.reward} 💎
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400">{task.description}</p>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 flex-1 rounded-full bg-white/[0.06] overflow-hidden">
                          <div
                            className={`h-full rounded-full ${done ? 'bg-emerald-400' : 'bg-pink-500'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-[9px] font-mono text-slate-400 shrink-0">
                          {task.field === 'liveSeconds'
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
                          ? 'bg-gradient-to-r from-sky-500 to-cyan-400 text-[#111420]'
                          : 'bg-white/[0.04] text-slate-500 border border-white/[0.06]'
                      }`}
                    >
                      {isClaimed ? 'Claimed' : busy === task.id ? '…' : done ? 'Claim' : 'Go'}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Valid Day Bonus */}
          <section className="rounded-2xl bg-[#111420] border border-white/[0.08] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-sm font-semibold text-white flex items-center gap-2">
                <CalendarCheck className="w-4 h-4 text-sky-400" />
                <span>Valid Day Bonus</span>
              </h2>
              <span className="text-[10px] font-mono font-bold text-sky-300">
                +{HOST_VALID_DAYS_REWARD.toLocaleString()} 💎
              </span>
            </div>
            <p className="text-xs text-slate-400">
              A day with 60+ minutes of live streaming counts as a valid day. Collect{' '}
              {HOST_VALID_DAYS_GOAL} valid days to claim the bonus — repeatable.
            </p>
            <div className="flex items-center gap-2">
              <div className="h-1.5 flex-1 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    validDays >= HOST_VALID_DAYS_GOAL ? 'bg-emerald-400' : 'bg-sky-500'
                  }`}
                  style={{
                    width: `${Math.min(100, Math.round((validDays / HOST_VALID_DAYS_GOAL) * 100))}%`,
                  }}
                />
              </div>
              <span className="text-[10px] font-mono text-slate-400 shrink-0">
                {Math.min(validDays, HOST_VALID_DAYS_GOAL)}/{HOST_VALID_DAYS_GOAL} days
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleClaim('valid')}
              disabled={
                validDays < HOST_VALID_DAYS_GOAL ||
                claimed.includes(`host_valid_${today}`) ||
                busy !== null
              }
              className="w-full h-11 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-500 hover:from-sky-500 hover:to-cyan-400 disabled:opacity-50 text-sm font-bold text-white inline-flex items-center justify-center gap-2 transition-all"
            >
              {claimed.includes(`host_valid_${today}`) ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Claimed today — come back tomorrow!</span>
                </>
              ) : (
                <span>
                  {busy === 'valid'
                    ? 'Claiming…'
                    : `Claim +${HOST_VALID_DAYS_REWARD.toLocaleString()} diamonds`}
                </span>
              )}
            </button>
          </section>

          <p className="text-[10px] text-slate-500 px-1">
            Tasks reset daily at 00:00 UTC. Rewards are added to your Diamond balance and
            can be withdrawn through your agent. Gift income (70% of every gift) is paid
            instantly on top of these rewards.
          </p>
        </>
      )}
    </div>
  );
};