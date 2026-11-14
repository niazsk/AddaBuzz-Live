import React from 'react';
import { MessageSquare, ShieldAlert, ShieldBan, X } from 'lucide-react';
import { UserProfile } from '../../types/app';
import { Avatar } from '../ui/Avatar';

interface UserProfileModalProps {
  user: UserProfile | null;
  isFollowing: boolean;
  isBlocked: boolean;
  onClose: () => void;
  onToggleFollow: (uid: string) => void;
  onStartMessage: (user: UserProfile) => void;
  onToggleBlock: (uid: string) => void;
  onReportUser: (user: UserProfile) => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  user,
  isFollowing,
  isBlocked,
  onClose,
  onToggleFollow,
  onStartMessage,
  onToggleBlock,
  onReportUser,
}) => {
  if (!user) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="user-profile-modal-title"
    >
      <div className="w-full max-w-md rounded-2xl bg-[#111420] border border-white/12 overflow-hidden shadow-2xl">
        <div
          className="h-24 relative"
          style={{ background: user.coverGradient }}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Close profile"
            className="absolute top-3 right-3 p-2 rounded-lg bg-black/50 text-white hover:bg-black/75"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 pb-6">
          <div className="-mt-10 flex items-end justify-between gap-3">
            <Avatar
              name={user.displayName}
              color={user.avatarColor}
              size="xl"
              className="ring-4 ring-[#111420]"
            />
            <span className="text-xs font-mono text-sky-300 pb-1">
              {user.platformId} · {user.accountType}
            </span>
          </div>

          <div className="mt-3 space-y-1">
            <h2 id="user-profile-modal-title" className="font-display text-lg font-bold text-white">
              {user.displayName}
            </h2>
            <p className="text-xs text-slate-400">
              @{user.username} · {user.country} · {user.lastActiveLabel}
            </p>
          </div>

          <p className="text-sm text-slate-300 mt-3 leading-relaxed">{user.bio}</p>

          <div className="flex items-center gap-5 mt-4 pt-4 border-t border-white/[0.07] text-xs text-slate-400">
            <span>
              <strong className="font-mono text-sm text-white tabular-nums">
                {user.followersCount.toLocaleString()}
              </strong>{' '}
              Followers
            </span>
            <span>
              <strong className="font-mono text-sm text-white tabular-nums">
                {user.followingCount.toLocaleString()}
              </strong>{' '}
              Following
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5 mt-5">
            <button
              type="button"
              onClick={() => onToggleFollow(user.uid)}
              className={`h-10 rounded-xl text-xs font-semibold transition-colors ${
                isFollowing
                  ? 'bg-white/[0.08] text-white hover:bg-white/[0.14]'
                  : 'bg-violet-600 text-white hover:bg-violet-500'
              }`}
            >
              {isFollowing ? 'Following' : 'Follow'}
            </button>

            <button
              type="button"
              onClick={() => onStartMessage(user)}
              className="h-10 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-xs font-medium text-white inline-flex items-center justify-center gap-1.5"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Message</span>
            </button>
          </div>

          <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-white/[0.07]">
            <button
              type="button"
              onClick={() => onToggleBlock(user.uid)}
              className="text-xs text-slate-400 hover:text-rose-300 inline-flex items-center gap-1.5"
            >
              <ShieldBan className="w-3.5 h-3.5" />
              <span>{isBlocked ? 'Unblock User' : 'Block User'}</span>
            </button>

            <button
              type="button"
              onClick={() => onReportUser(user)}
              className="text-xs text-slate-400 hover:text-amber-300 inline-flex items-center gap-1.5"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Report</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
