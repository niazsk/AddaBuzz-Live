import React, { useState } from 'react';
import { ArrowLeft, Trophy, Flame, Crown, Medal, TrendingUp, Sparkles } from 'lucide-react';
import { UserProfile } from '../../types/app';
import { Avatar } from '../ui/Avatar';

interface RankViewProps {
  currentUser: UserProfile | null;
  users: UserProfile[];
  onOpenUserProfile: (user: UserProfile) => void;
  onBack: () => void;
}

export const RankView: React.FC<RankViewProps> = ({
  currentUser,
  users,
  onOpenUserProfile,
  onBack,
}) => {
  const [tab, setTab] = useState<'creators' | 'users' | 'agents' | 'daily'>('creators');

  const pool = tab === 'agents' ? users.filter((u) => u.accountType !== 'USER') : users;

  // Sort users based on active tab criteria
  const rankedUsers = [...pool].sort((a, b) => {
    if (tab === 'creators' || tab === 'agents') {
      return (b.followersCount ?? 0) - (a.followersCount ?? 0);
    } else if (tab === 'users') {
      return (b.visitorsCount ?? 0) - (a.visitorsCount ?? 0);
    } else {
      return (b.followersCount ?? 0) + (b.visitorsCount ?? 0) - ((a.followersCount ?? 0) + (a.visitorsCount ?? 0));
    }
  });

  const metricText = (user: UserProfile): string => {
    if (tab === 'users') return `${user.visitorsCount.toLocaleString()} visits`;
    if (tab === 'agents') return `${user.followersCount.toLocaleString()} fans`;
    if (tab === 'daily') {
      return `${((user.followersCount ?? 0) + (user.visitorsCount ?? 0)).toLocaleString()} score`;
    }
    return `${user.followersCount.toLocaleString()} fans`;
  };

  const top3 = rankedUsers.slice(0, 3);
  const rest = rankedUsers.slice(3, 30);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to profile"
          className="w-9 h-9 rounded-full bg-white/[0.08] hover:bg-white/[0.15] border border-white/10 flex items-center justify-center text-white transition-colors shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-400" />
          <h1 className="font-display text-lg font-bold text-white">Leaderboard & Rank</h1>
        </div>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-4 rounded-2xl bg-[#111420] border border-white/[0.08] p-1.5 gap-1">
        {(
          [
            { id: 'creators', label: 'Creators', icon: Crown },
            { id: 'users', label: 'Users', icon: Flame },
            { id: 'agents', label: 'Agents', icon: Medal },
            { id: 'daily', label: 'Rising', icon: TrendingUp },
          ] as const
        ).map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`py-2.5 rounded-xl text-[11px] sm:text-xs font-semibold flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 transition-all ${
                active
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-[#111420] shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Podium (Top 3) */}
      {top3.length > 0 && (
        <div className="rounded-3xl bg-gradient-to-b from-amber-500/10 via-[#111420] to-[#111420] border border-amber-500/20 p-6">
          <div className="flex justify-center items-end gap-3 pt-6 pb-2">
            {/* Rank 2 */}
            {top3[1] && (
              <button
                type="button"
                onClick={() => onOpenUserProfile(top3[1])}
                className="flex flex-col items-center gap-2 group flex-1 max-w-[100px]"
              >
                <div className="relative">
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-slate-300 text-slate-900 font-bold text-xs flex items-center justify-center shadow-lg border-2 border-[#111420] z-10">
                    2
                  </span>
                  <Avatar name={top3[1].displayName} src={top3[1].avatarUrl} color={top3[1].avatarColor} size="lg" />
                </div>
                <p className="text-xs font-semibold text-white truncate max-w-full group-hover:text-amber-300 transition-colors">
                  {top3[1].displayName}
                </p>
                <div className="w-full h-20 rounded-t-2xl bg-white/[0.05] border-t-2 border-slate-300 flex flex-col items-center justify-center">
                  <span className="text-[11px] font-mono text-slate-300 font-semibold">
                    {metricText(top3[1])}
                  </span>
                </div>
              </button>
            )}

            {/* Rank 1 */}
            {top3[0] && (
              <button
                type="button"
                onClick={() => onOpenUserProfile(top3[0])}
                className="flex flex-col items-center gap-2 group flex-1 max-w-[110px] -mt-4"
              >
                <Crown className="w-6 h-6 text-amber-400 animate-bounce" />
                <div className="relative">
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-200 text-[#111420] font-black text-xs flex items-center justify-center shadow-lg border-2 border-[#111420] z-10">
                    1
                  </span>
                  <Avatar name={top3[0].displayName} src={top3[0].avatarUrl} color={top3[0].avatarColor} size="xl" className="ring-4 ring-amber-400/50" />
                </div>
                <p className="text-xs font-bold text-white truncate max-w-full group-hover:text-amber-300 transition-colors">
                  {top3[0].displayName}
                </p>
                <div className="w-full h-28 rounded-t-2xl bg-gradient-to-t from-amber-500/20 to-amber-500/40 border-t-2 border-amber-400 flex flex-col items-center justify-center">
                  <span className="text-xs font-mono text-amber-200 font-bold">
                    {metricText(top3[0])}
                  </span>
                  <span className="text-[10px] text-amber-300/80 font-medium mt-0.5">Top Champion</span>
                </div>
              </button>
            )}

            {/* Rank 3 */}
            {top3[2] && (
              <button
                type="button"
                onClick={() => onOpenUserProfile(top3[2])}
                className="flex flex-col items-center gap-2 group flex-1 max-w-[100px]"
              >
                <div className="relative">
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-amber-700 text-amber-100 font-bold text-xs flex items-center justify-center shadow-lg border-2 border-[#111420] z-10">
                    3
                  </span>
                  <Avatar name={top3[2].displayName} src={top3[2].avatarUrl} color={top3[2].avatarColor} size="lg" />
                </div>
                <p className="text-xs font-semibold text-white truncate max-w-full group-hover:text-amber-300 transition-colors">
                  {top3[2].displayName}
                </p>
                <div className="w-full h-16 rounded-t-2xl bg-white/[0.04] border-t-2 border-amber-700 flex flex-col items-center justify-center">
                  <span className="text-[11px] font-mono text-amber-200/80 font-semibold">
                    {metricText(top3[2])}
                  </span>
                </div>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Rank List (4 to 30) */}
      <section className="space-y-2">
        <h2 className="text-xs font-semibold text-slate-400 px-1 uppercase tracking-wider">
          Top Performers
        </h2>
        <div className="rounded-2xl bg-[#111420] border border-white/[0.08] divide-y divide-white/[0.06] overflow-hidden">
          {rankedUsers.length === 0 && (
            <p className="px-4 py-8 text-center text-xs text-slate-500">
              No agents are ranked yet. Promoted agents appear here automatically.
            </p>
          )}
          {rest.map((user, idx) => {
            const rankPos = idx + 4;
            const isMe = currentUser?.uid === user.uid;
            return (
              <button
                key={user.uid}
                type="button"
                onClick={() => onOpenUserProfile(user)}
                className={`w-full flex items-center gap-3.5 p-3.5 text-left hover:bg-white/[0.04] transition-colors ${
                  isMe ? 'bg-violet-500/10' : ''
                }`}
              >
                <span className="w-6 text-center font-mono text-xs font-bold text-slate-400">
                  {rankPos}
                </span>
                <Avatar name={user.displayName} src={user.avatarUrl} color={user.avatarColor} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate flex items-center gap-1.5">
                    <span>{user.displayName}</span>
                    {isMe && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-500/20 text-violet-300 font-mono">
                        You
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-slate-400 font-mono truncate">
                    ID: {user.platformId}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-mono font-bold text-amber-400">
                    {metricText(user)}
                  </p>
                  <span className="text-[10px] text-slate-500 flex items-center justify-end gap-1">
                    <Sparkles className="w-3 h-3 text-amber-400/70" />
                    <span>Active</span>
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
};
