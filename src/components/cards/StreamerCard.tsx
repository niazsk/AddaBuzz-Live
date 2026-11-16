import React from 'react';
import { UserProfile } from '../../types/app';
import { Avatar } from '../ui/Avatar';
import { isBdAgentProfile } from '../../lib/firestoreService';

interface StreamerCardProps {
  user: UserProfile;
  isFollowing: boolean;
  onToggleFollow: (uid: string) => void;
  onOpenProfile: (user: UserProfile) => void;
}

export const StreamerCard: React.FC<StreamerCardProps> = ({
  user,
  isFollowing,
  onToggleFollow,
  onOpenProfile,
}) => {
  return (
    <div className="rounded-2xl bg-[#111420] border border-white/[0.08] p-4 flex flex-col justify-between gap-4 hover:border-white/15 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={() => onOpenProfile(user)}
          className="flex items-center gap-3 min-w-0 text-left flex-1"
        >
          <Avatar
            name={user.displayName}
            color={user.avatarColor}
            size="md"
            isLiveRing={user.lastActiveLabel === 'Live now'}
          />
          <div className="min-w-0">
            <h3 className="font-display text-sm font-semibold text-white truncate">
              {user.displayName}
            </h3>
            <p className="text-xs text-slate-400 truncate">
              @{user.username} · {user.country}
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onToggleFollow(user.uid)}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 min-h-[34px] ${
            isFollowing
              ? 'bg-white/[0.08] text-slate-200 hover:bg-white/[0.14]'
              : 'bg-violet-600 text-white hover:bg-violet-500'
          }`}
        >
          {isFollowing ? 'Following' : 'Follow'}
        </button>
      </div>

      <p className="text-xs text-slate-300/90 line-clamp-2 leading-relaxed">{user.bio}</p>

      <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-white/[0.06]">
        <span className="font-mono tabular-nums text-slate-300">
          {user.followersCount.toLocaleString()} followers
        </span>
        <span>
          {user.accountType === 'SUPER_AGENT'
            ? isBdAgentProfile(user)
              ? 'BD Agent'
              : 'Super Agent'
            : user.accountType === 'AGENT'
            ? 'Agent Host'
            : 'Creator'}
        </span>
      </div>
    </div>
  );
};
