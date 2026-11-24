import React, { useState } from 'react';
import { ArrowLeft, BadgeCheck, Search, Users } from 'lucide-react';
import { AccountType, UserProfile } from '../../types/app';
import { Avatar } from '../ui/Avatar';

interface AgentDirectoryViewProps {
  kind: AccountType;
  users: UserProfile[];
  onOpenUserProfile: (user: UserProfile) => void;
  onBack: () => void;
}

export const AgentDirectoryView: React.FC<AgentDirectoryViewProps> = ({
  kind,
  users,
  onOpenUserProfile,
  onBack,
}) => {
  const [query, setQuery] = useState('');

  const isSuper = kind === 'SUPER_AGENT';
  const title = isSuper ? 'BD Agent List' : 'Agent List';
  const normalized = query.trim().toLowerCase();

  const members = users
    .filter((u) => u.accountType === kind && !u.isSuspended)
    .filter(
      (u) =>
        !normalized ||
        u.displayName.toLowerCase().includes(normalized) ||
        u.username.toLowerCase().includes(normalized) ||
        u.platformId.includes(normalized)
    );

  return (
    <div className="space-y-5 pb-8">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to profile"
          className="w-9 h-9 rounded-xl bg-[#111420] border border-white/[0.08] hover:border-white/20 text-slate-300 hover:text-white flex items-center justify-center shrink-0 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold text-white leading-tight inline-flex items-center gap-2">
            {isSuper ? (
              <BadgeCheck className="w-5 h-5 text-violet-400" aria-hidden="true" />
            ) : (
              <Users className="w-5 h-5 text-sky-400" aria-hidden="true" />
            )}
            <span>{title}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {members.length} {isSuper ? 'BD Agent' : 'Agent'} account{members.length === 1 ? '' : 's'}
          </p>
        </div>
      </div>

      <div className="relative">
        <Search
          className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
          aria-hidden="true"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${title.toLowerCase()} by name, username or ID…`}
          aria-label={`Search ${title}`}
          className="w-full h-11 pl-10 pr-4 rounded-xl bg-[#111420] border border-white/[0.08] focus:border-sky-500/60 focus:outline-none text-sm text-white placeholder:text-slate-500 transition-colors"
        />
      </div>

      {members.length === 0 ? (
        <div className="rounded-2xl bg-[#111420] border border-white/[0.08] p-10 text-center space-y-2">
          <p className="font-display text-base font-semibold text-white">
            No {isSuper ? 'BD Agent' : 'Agent'} accounts found
          </p>
          <p className="text-sm text-slate-400">
            {normalized
              ? 'Try a different name, username or ID.'
              : `No ${isSuper ? 'BD Agent' : 'Agent'} accounts exist yet.`}
          </p>
        </div>
      ) : (
        <div className="rounded-2xl bg-[#111420] border border-white/[0.08] divide-y divide-white/[0.06] overflow-hidden">
          {members.map((u) => (
            <button
              key={u.uid}
              type="button"
              onClick={() => onOpenUserProfile(u)}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-white/[0.03] transition-colors"
            >
              <Avatar name={u.displayName} color={u.avatarColor} src={u.avatarUrl} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white truncate">{u.displayName}</p>
                <p className="text-xs text-slate-400 truncate">
                  @{u.username} · {u.country}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-mono text-xs text-sky-300 tabular-nums">{u.platformId}</p>
                <p className="text-[11px] text-slate-500 font-mono tabular-nums">
                  {u.followersCount.toLocaleString()} followers
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold border ${
                  isSuper
                    ? 'bg-violet-600/20 border-violet-500/30 text-violet-200'
                    : 'bg-sky-600/20 border-sky-500/30 text-sky-200'
                }`}
              >
                {isSuper ? 'BD Agent' : 'Agent'}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};