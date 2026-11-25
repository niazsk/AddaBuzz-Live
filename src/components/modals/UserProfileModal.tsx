import React, { useEffect, useState } from 'react';
import { Copy, MessageSquare, ShieldAlert, ShieldBan, X } from 'lucide-react';
import { UserProfile } from '../../types/app';
import { Avatar } from '../ui/Avatar';
import { accountRoleLabel, fetchCoverImage } from '../../lib/firestoreService';
import { visibleBio } from '../../lib/profileBio';

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
  const [coverImage, setCoverImage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!user?.uid) {
      setCoverImage(null);
      return;
    }
    fetchCoverImage(user.uid).then((dataUrl) => {
      if (!cancelled) setCoverImage(dataUrl);
    });
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  if (!user) return null;

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(user.platformId);
    } catch {
      // Clipboard can be blocked by the browser; the ID stays visible.
    }
  };

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
          style={{
            background: coverImage
              ? `center / cover no-repeat url(${coverImage})`
              : user.coverUrl
              ? `center / cover no-repeat url(${user.coverUrl})`
              : user.coverGradient,
          }}
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
              src={user.avatarUrl}
              size="xl"
              className="ring-4 ring-[#111420]"
            />
            <button
              type="button"
              onClick={() => void copyId()}
              className="text-xs font-mono text-sky-300 pb-1 inline-flex items-center gap-1 hover:text-sky-200"
              aria-label="Copy user ID"
            >
              <span>
                {user.platformId} · {accountRoleLabel(user)}
              </span>
              <Copy className="w-3 h-3" />
            </button>
          </div>

          <div className="mt-3 space-y-1">
            <h2 id="user-profile-modal-title" className="font-display text-lg font-bold text-white">
              {user.displayName}
            </h2>
            <p className="text-xs text-slate-400">
              @{user.username} · {user.country} · {user.lastActiveLabel}
            </p>
          </div>

          {visibleBio(user.bio) && (
            <p className="text-sm text-slate-300 mt-3 leading-relaxed">{visibleBio(user.bio)}</p>
          )}

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
