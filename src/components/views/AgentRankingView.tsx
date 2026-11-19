import React, { useState } from 'react';
import { ArrowLeft, TrendingUp, Trophy, Award, ShieldCheck, Users, Search } from 'lucide-react';
import { UserProfile } from '../../types/app';
import { Avatar } from '../ui/Avatar';

interface AgentRankingViewProps {
  currentUser: UserProfile | null;
  users: UserProfile[];
  onOpenUserProfile: (user: UserProfile) => void;
  onBack: () => void;
}

export const AgentRankingView: React.FC<AgentRankingViewProps> = ({
  currentUser,
  users,
  onOpenUserProfile,
  onBack,
}) => {
  const [filterType, setFilterType] = useState<'ALL' | 'SUPER_AGENT' | 'AGENT'>('ALL');
  const [search, setSearch] = useState('');

  // Agents & Super Agents only
  const agents = users.filter((u) => u.accountType === 'AGENT' || u.accountType === 'SUPER_AGENT');

  const filtered = agents
    .filter((a) => (filterType === 'ALL' ? true : a.accountType === filterType))
    .filter((a) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        a.displayName.toLowerCase().includes(q) ||
        a.username.toLowerCase().includes(q) ||
        a.platformId.includes(q)
      );
    })
    .sort((a, b) => {
      // Prioritize Super Agents, then followers / agency network score
      const scoreA = (a.accountType === 'SUPER_AGENT' ? 10000 : 0) + (a.followersCount * 2) + a.visitorsCount;
      const scoreB = (b.accountType === 'SUPER_AGENT' ? 10000 : 0) + (b.followersCount * 2) + b.visitorsCount;
      return scoreB - scoreA;
    });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
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
          <TrendingUp className="w-5 h-5 text-violet-400" />
          <h1 className="font-display text-lg font-bold text-white">Agency & Agent Ranking</h1>
        </div>
      </div>

      {/* Overview Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-violet-600/20 via-fuchsia-600/10 to-[#111420] border border-violet-500/20 p-5 space-y-2">
        <div className="flex items-center gap-2 text-violet-300">
          <Award className="w-5 h-5 text-violet-400" />
          <span className="font-display text-sm font-semibold">Official Agency Leaderboard</span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          Rankings are calculated based on agency network performance, host recruitment, and active monthly streaming points.
        </p>
      </div>

      {/* Filters and Search */}
      <div className="space-y-3">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#111420] border border-white/[0.08]">
          <button
            type="button"
            onClick={() => setFilterType('ALL')}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${
              filterType === 'ALL' ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            All Agencies
          </button>
          <button
            type="button"
            onClick={() => setFilterType('SUPER_AGENT')}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${
              filterType === 'SUPER_AGENT' ? 'bg-amber-500 text-[#111420] shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Super Agents
          </button>
          <button
            type="button"
            onClick={() => setFilterType('AGENT')}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${
              filterType === 'AGENT' ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            General Agents
          </button>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by agent name or ID..."
            className="w-full h-11 pl-10 pr-4 rounded-xl bg-[#111420] border border-white/[0.08] focus:border-violet-500/60 focus:outline-none text-xs text-white placeholder:text-slate-500"
          />
        </div>
      </div>

      {/* Rankings Table */}
      <div className="space-y-2">
        <div className="rounded-2xl bg-[#111420] border border-white/[0.08] divide-y divide-white/[0.06] overflow-hidden">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No agents matching current filter.
            </div>
          ) : (
            filtered.map((agent, idx) => {
              const rankPos = idx + 1;
              const isSuper = agent.accountType === 'SUPER_AGENT';
              return (
                <button
                  key={agent.uid}
                  type="button"
                  onClick={() => onOpenUserProfile(agent)}
                  className="w-full flex items-center gap-3.5 p-3.5 text-left hover:bg-white/[0.04] transition-colors"
                >
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center font-mono text-xs font-bold shrink-0 ${
                      rankPos === 1
                        ? 'bg-amber-400 text-slate-900'
                        : rankPos === 2
                        ? 'bg-slate-300 text-slate-900'
                        : rankPos === 3
                        ? 'bg-amber-700 text-amber-100'
                        : 'text-slate-400'
                    }`}
                  >
                    {rankPos}
                  </span>
                  <Avatar name={agent.displayName} src={agent.avatarUrl} color={agent.avatarColor} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate flex items-center gap-1.5">
                      <span>{agent.displayName}</span>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase ${
                          isSuper ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-violet-500/20 text-violet-300'
                        }`}
                      >
                        {isSuper ? 'Super Agent' : 'Agent'}
                      </span>
                    </p>
                    <p className="text-xs text-slate-400 font-mono">
                      ID: {agent.platformId} • @{agent.username}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-mono font-bold text-violet-400">
                      Tier {Math.max(1, 10 - rankPos)}
                    </span>
                    <p className="text-[10px] text-slate-500">
                      {agent.followersCount} Managed Hosts
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
