import React from 'react';
import { Coins, Gem, MessageSquare, ChevronRight } from 'lucide-react';
import { UserProfile } from '../../types/app';
import { Avatar } from '../ui/Avatar';

interface RightRailProps {
  users: UserProfile[];
  coinBalance: number;
  diamondBalance: number;
  onOpenUserProfile: (user: UserProfile) => void;
  onStartDirectMessage: (user: UserProfile) => void;
  onOpenWallet: () => void;
  hideWallet?: boolean;
}

export const RightRail: React.FC<RightRailProps> = ({
  users,
  coinBalance,
  diamondBalance,
  onOpenUserProfile,
  onStartDirectMessage,
  onOpenWallet,
  hideWallet = false,
}) => {
  const onlineFriends = users.filter((u) => u.isOnline && u.showPresence).slice(0, 4);
  const recentlyActive = users.filter((u) => !u.isOnline || u.isNewCreator).slice(0, 4);

  return (
    <aside className="hidden xl:flex xl:flex-col xl:w-[300px] xl:shrink-0 xl:sticky xl:top-0 xl:h-screen border-l border-white/[0.07] bg-[#0A0C13] px-5 py-6 space-y-7 overflow-y-auto">
      {/* Wallet Snapshot — Strictly Coins & Diamonds, NO top-up or purchase UI */}
      {!hideWallet && (
      <section aria-label="Wallet balances">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-sm font-semibold text-white">Virtual Balances</h2>
          <button
            type="button"
            onClick={onOpenWallet}
            className="text-xs font-medium text-sky-400 hover:text-sky-300 transition-colors inline-flex items-center gap-0.5 whitespace-nowrap"
          >
            <span>Ledger</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={onOpenWallet}
            className="text-left rounded-xl bg-[#111420] border border-white/[0.08] hover:border-white/15 p-3.5 transition-colors"
          >
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
              <Coins className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
              <span>Coins</span>
            </div>
            <p className="font-mono text-lg font-semibold text-white tabular-nums">
              {coinBalance.toLocaleString()}
            </p>
          </button>

          <button
            type="button"
            onClick={onOpenWallet}
            className="text-left rounded-xl bg-[#111420] border border-white/[0.08] hover:border-white/15 p-3.5 transition-colors"
          >
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
              <Gem className="w-3.5 h-3.5 text-sky-400" aria-hidden="true" />
              <span>Diamonds</span>
            </div>
            <p className="font-mono text-lg font-semibold text-white tabular-nums">
              {diamondBalance.toLocaleString()}
            </p>
          </button>
        </div>
        <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
          Earned through community rewards & gifts. No top-up or purchase flow.
        </p>
      </section>
      )}

      {/* Online Friends */}
      <section aria-label="Online friends">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-sm font-semibold text-white">Online Friends</h2>
          <span className="text-xs font-mono tabular-nums text-slate-400">
            {onlineFriends.length} active
          </span>
        </div>

        <div className="space-y-1.5">
          {onlineFriends.map((user) => (
            <div
              key={user.uid}
              className="flex items-center justify-between gap-2 p-2 rounded-xl hover:bg-white/[0.04] transition-colors"
            >
              <button
                type="button"
                onClick={() => onOpenUserProfile(user)}
                className="flex items-center gap-2.5 min-w-0 text-left flex-1"
              >
                <Avatar
                  name={user.displayName}
                  color={user.avatarColor}
                  size="sm"
                  isLiveRing={user.lastActiveLabel === 'Live now'}
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-100 truncate">{user.displayName}</p>
                  <p className="text-xs text-slate-400 truncate">
                    @{user.username} · {user.lastActiveLabel}
                  </p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => onStartDirectMessage(user)}
                aria-label={`Message ${user.displayName}`}
                className="p-2 rounded-lg text-slate-400 hover:text-sky-400 hover:bg-white/[0.06] transition-colors shrink-0"
              >
                <MessageSquare className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Recently Active & New Creators */}
      <section aria-label="Recently active users">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-sm font-semibold text-white">Recently Active</h2>
          <span className="text-xs text-slate-500">Community</span>
        </div>

        <div className="divide-y divide-white/[0.06]">
          {recentlyActive.map((user) => (
            <button
              key={user.uid}
              type="button"
              onClick={() => onOpenUserProfile(user)}
              className="w-full flex items-center gap-3 py-2.5 text-left hover:opacity-90 transition-opacity"
            >
              <Avatar name={user.displayName} color={user.avatarColor} size="xs" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-slate-200 truncate">{user.displayName}</p>
                <p className="text-[11px] text-slate-500 truncate">
                  {user.country} · {user.lastActiveLabel}
                </p>
              </div>
              <span className="text-[11px] font-mono text-slate-400 shrink-0">
                {user.accountType === 'SUPER_AGENT'
                  ? 'BD AGENT'
                  : user.accountType === 'AGENT'
                  ? 'AGENT'
                  : 'USER'}
              </span>
            </button>
          ))}
        </div>
      </section>
    </aside>
  );
};
