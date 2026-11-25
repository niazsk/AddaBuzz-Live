import React, { useMemo, useState } from 'react';
import {
  Check,
  Clock,
  Eye,
  Loader2,
  MessageSquare,
  Radio,
  Search,
  ShieldBan,
  Sparkles,
  UserCheck,
  UserMinus,
  UserPlus,
  UsersRound,
  X,
} from 'lucide-react';
import { FriendRequest, LiveRoom, UserProfile } from '../../types/app';
import { Avatar } from '../ui/Avatar';
import { RoomCard } from '../cards/RoomCard';
import { formatRelativeMs, isPresenceOnline } from '../../lib/chatService';

type FriendsTab = 'all' | 'online' | 'following' | 'requests';

interface FriendsViewProps {
  users: UserProfile[];
  rooms: LiveRoom[];
  currentUser: UserProfile | null;
  followingUids: string[];
  followerUids: string[];
  blockedUids: string[];
  friendRequests: FriendRequest[];
  presence: Record<string, number>;
  usersReady: boolean;
  loadError?: string | null;
  canInviteToLive: boolean;
  onOpenAuth: () => void;
  onToggleFollow: (uid: string) => void;
  onToggleBlock: (uid: string) => void;
  onSendFriendRequest: (uid: string) => Promise<void>;
  onAcceptFriendRequest: (request: FriendRequest) => Promise<void>;
  onDeclineFriendRequest: (request: FriendRequest) => Promise<void>;
  onInviteToLive: (uid: string) => void;
  onStartDirectMessage: (user: UserProfile) => void;
  onOpenUserProfile: (user: UserProfile) => void;
  onJoinRoom: (room: LiveRoom) => void;
}

interface ConfirmState {
  title: string;
  body: string;
  confirmLabel: string;
  tone: 'danger' | 'default';
  action: () => void;
}

const ONLINE_DOT =
  'absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-[#0D1017]';

const primaryBtn =
  'inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 px-3 py-2 text-[11px] font-semibold text-white shadow-lg shadow-fuchsia-900/30 transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-45';
const ghostBtn =
  'inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-[11px] font-semibold text-slate-200 transition-colors hover:bg-white/[0.09] disabled:opacity-45';
const dangerBtn =
  'inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-[11px] font-semibold text-rose-200 transition-colors hover:bg-rose-500/20 disabled:opacity-45';

const CreatorBadge: React.FC<{ user: UserProfile }> = ({ user }) => {
  if (user.accountType === 'SUPER_AGENT') {
    return (
      <span className="rounded-full border border-amber-300/30 bg-amber-400/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-200">
        Super Agent
      </span>
    );
  }
  if (user.accountType === 'AGENT') {
    return (
      <span className="rounded-full border border-sky-300/25 bg-sky-400/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-sky-200">
        Agent
      </span>
    );
  }
  if (user.isHost) {
    return (
      <span className="rounded-full border border-fuchsia-300/25 bg-fuchsia-400/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-fuchsia-200">
        Host
      </span>
    );
  }
  if (user.isNewCreator) {
    return (
      <span className="rounded-full border border-white/15 bg-white/[0.05] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-300">
        New
      </span>
    );
  }
  return null;
};

export const FriendsView: React.FC<FriendsViewProps> = ({
  users,
  rooms,
  currentUser,
  followingUids,
  followerUids,
  blockedUids,
  friendRequests,
  presence,
  usersReady,
  loadError,
  canInviteToLive,
  onOpenAuth,
  onToggleFollow,
  onToggleBlock,
  onSendFriendRequest,
  onAcceptFriendRequest,
  onDeclineFriendRequest,
  onInviteToLive,
  onStartDirectMessage,
  onOpenUserProfile,
  onJoinRoom,
}) => {
  const [tab, setTab] = useState<FriendsTab>('all');
  const [search, setSearch] = useState('');
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [listModal, setListModal] = useState<'followers' | 'following' | null>(null);

  const byUid = useMemo(() => new Map(users.map((u) => [u.uid, u])), [users]);

  const friends = useMemo(() => {
    const following = new Set(followingUids);
    return followerUids
      .filter((uid) => following.has(uid) && !blockedUids.includes(uid))
      .map((uid) => byUid.get(uid))
      .filter((u): u is UserProfile => Boolean(u) && u!.uid !== currentUser?.uid)
      .sort((a, b) => {
        const aOnline = isPresenceOnline({ uid: a.uid, lastSeenMs: presence[a.uid] ?? 0 });
        const bOnline = isPresenceOnline({ uid: b.uid, lastSeenMs: presence[b.uid] ?? 0 });
        return Number(bOnline) - Number(aOnline);
      });
  }, [followingUids, followerUids, blockedUids, byUid, currentUser?.uid, presence]);

  const followedUsers = useMemo(
    () =>
      followingUids
        .filter((uid) => !blockedUids.includes(uid))
        .map((uid) => byUid.get(uid))
        .filter((u): u is UserProfile => Boolean(u) && u!.uid !== currentUser?.uid),
    [followingUids, blockedUids, byUid, currentUser?.uid]
  );

  const followers = useMemo(
    () =>
      followerUids
        .filter((uid) => !blockedUids.includes(uid))
        .map((uid) => byUid.get(uid))
        .filter((u): u is UserProfile => Boolean(u) && u!.uid !== currentUser?.uid),
    [followerUids, blockedUids, byUid, currentUser?.uid]
  );

  const onlineFriends = useMemo(
    () =>
      friends.filter(
        (u) =>
          u.showPresence !== false &&
          isPresenceOnline({ uid: u.uid, lastSeenMs: presence[u.uid] ?? 0 })
      ),
    [friends, presence]
  );

  const incomingRequests = useMemo(
    () =>
      currentUser
        ? friendRequests.filter(
            (r) => r.toUid === currentUser.uid && !blockedUids.includes(r.fromUid)
          )
        : [],
    [friendRequests, currentUser, blockedUids]
  );

  const outgoingRequests = useMemo(
    () => (currentUser ? friendRequests.filter((r) => r.fromUid === currentUser.uid) : []),
    [friendRequests, currentUser]
  );

  const pendingUids = useMemo(
    () => new Set(friendRequests.flatMap((r) => [r.fromUid, r.toUid])),
    [friendRequests]
  );

  const recommended = useMemo(() => {
    const friendSet = new Set(friends.map((u) => u.uid));
    return users
      .filter(
        (u) =>
          u.uid !== currentUser?.uid &&
          !friendSet.has(u.uid) &&
          !blockedUids.includes(u.uid) &&
          !followingUids.includes(u.uid)
      )
      .sort(
        (a, b) =>
          Number(Boolean(b.isNewCreator)) - Number(Boolean(a.isNewCreator)) ||
          b.followersCount - a.followersCount
      )
      .slice(0, 8);
  }, [users, friends, followingUids, blockedUids, currentUser?.uid]);

  const liveFriendRooms = useMemo(() => {
    const friendUids = new Set(friends.map((u) => u.uid));
    return rooms.filter((r) => friendUids.has(r.hostUid));
  }, [rooms, friends]);

  const query = search.trim().toLowerCase();
  const matches = (u: UserProfile) =>
    !query ||
    u.displayName.toLowerCase().includes(query) ||
    u.username.toLowerCase().includes(query) ||
    u.platformId.toLowerCase().includes(query);

  const visibleFriends = friends.filter(matches);
  const visibleOnline = onlineFriends.filter(matches);
  const visibleFollowing = followedUsers.filter(matches);
  const visibleRecommended = recommended.filter(matches);
  const visibleLiveRooms = liveFriendRooms.filter((r) => {
    if (!query) return true;
    const host = byUid.get(r.hostUid);
    return (
      r.title.toLowerCase().includes(query) ||
      r.category.toLowerCase().includes(query) ||
      Boolean(host && matches(host))
    );
  });

  const presenceLabel = (user: UserProfile): string => {
    if (user.showPresence === false) return 'Presence hidden';
    const lastSeen = presence[user.uid] ?? 0;
    if (isPresenceOnline({ uid: user.uid, lastSeenMs: lastSeen })) return 'Active now';
    if (!lastSeen) return 'Offline';
    return `Active ${formatRelativeMs(lastSeen)} ago`;
  };

  const isFriend = (uid: string) =>
    followingUids.includes(uid) && followerUids.includes(uid);

  const incomingFrom = (uid: string) => incomingRequests.find((r) => r.fromUid === uid);
  const outgoingTo = (uid: string) => outgoingRequests.find((r) => r.toUid === uid);

  const runBusy = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try {
      await fn();
    } finally {
      setBusy(null);
    }
  };

  const requestAction = (user: UserProfile) => {
    const incoming = incomingFrom(user.uid);
    if (incoming) {
      return (
        <button
          type="button"
          disabled={busy !== null}
          onClick={() =>
            void runBusy(`accept_${user.uid}`, () => onAcceptFriendRequest(incoming))
          }
          className={primaryBtn}
        >
          {busy === `accept_${user.uid}` ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Check className="h-3.5 w-3.5" />
          )}
          <span>Accept request</span>
        </button>
      );
    }
    if (outgoingTo(user.uid)) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300/25 bg-amber-400/10 px-3 py-2 text-[11px] font-semibold text-amber-200">
          <Clock className="h-3.5 w-3.5" />
          Requested
        </span>
      );
    }
    if (isFriend(user.uid)) return null;
    return (
      <button
        type="button"
        disabled={busy !== null}
        onClick={() => void runBusy(`req_${user.uid}`, () => onSendFriendRequest(user.uid))}
        className={primaryBtn}
      >
        {busy === `req_${user.uid}` ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <UserPlus className="h-3.5 w-3.5" />
        )}
        <span>Add friend</span>
      </button>
    );
  };

  const confirmRemoveFriend = (user: UserProfile) =>
    setConfirm({
      title: `Remove ${user.displayName}?`,
      body: `@${user.username} will be removed from your friends. You can send a new friend request later.`,
      confirmLabel: 'Remove friend',
      tone: 'danger',
      action: () => {
        onToggleFollow(user.uid);
        setConfirm(null);
      },
    });

  const confirmBlock = (user: UserProfile) =>
    setConfirm({
      title: `Block @${user.username}?`,
      body: 'They will no longer appear in your friends, search or conversations, and they cannot message you.',
      confirmLabel: 'Block',
      tone: 'danger',
      action: () => {
        onToggleBlock(user.uid);
        setConfirm(null);
      },
    });

  const FriendCard: React.FC<{ user: UserProfile; showRemove?: boolean }> = ({
    user,
    showRemove = true,
  }) => {
    const online =
      user.showPresence !== false &&
      isPresenceOnline({ uid: user.uid, lastSeenMs: presence[user.uid] ?? 0 });
    return (
      <article className="group rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#131726] to-[#0F121C] p-4 transition-colors hover:border-fuchsia-400/25">
        <div className="flex items-start gap-3">
          <button type="button" onClick={() => onOpenUserProfile(user)} className="relative shrink-0">
            <Avatar name={user.displayName} color={user.avatarColor} avatarUrl={user.avatarUrl} size="md" />
            {online && <span className={ONLINE_DOT} />}
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onOpenUserProfile(user)}
                className="truncate font-display text-sm font-semibold text-white hover:text-fuchsia-200"
              >
                {user.displayName}
              </button>
              <CreatorBadge user={user} />
            </div>
            <p className="truncate text-[11px] text-slate-400">@{user.username}</p>
            <p className="mt-0.5 flex items-center gap-1 text-[10px] text-slate-500">
              {online && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />}
              {presenceLabel(user)} · {user.followersCount.toLocaleString()} followers
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <button type="button" onClick={() => onStartDirectMessage(user)} className={primaryBtn}>
            <MessageSquare className="h-3.5 w-3.5" />
            Message
          </button>
          {!isFriend(user.uid) && requestAction(user)}
          <button type="button" onClick={() => onOpenUserProfile(user)} className={ghostBtn}>
            <Eye className="h-3.5 w-3.5" />
            Profile
          </button>
          {canInviteToLive && (
            <button type="button" onClick={() => onInviteToLive(user.uid)} className={ghostBtn}>
              <Radio className="h-3.5 w-3.5 text-rose-300" />
              Invite live
            </button>
          )}
          {showRemove && (
            <button
              type="button"
              onClick={() => confirmRemoveFriend(user)}
              title="Remove friend"
              aria-label={`Remove ${user.displayName} from friends`}
              className="ml-auto grid h-8 w-8 place-items-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-slate-400 transition-colors hover:bg-rose-500/15 hover:text-rose-200"
            >
              <UserMinus className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => confirmBlock(user)}
            title="Block user"
            aria-label={`Block ${user.displayName}`}
            className="grid h-8 w-8 place-items-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-slate-400 transition-colors hover:bg-rose-500/15 hover:text-rose-200"
          >
            <ShieldBan className="h-3.5 w-3.5" />
          </button>
        </div>
      </article>
    );
  };

  const tabButton = (key: FriendsTab, label: string, count?: number) => {
    const active = tab === key;
    return (
      <button
        key={key}
        type="button"
        onClick={() => setTab(key)}
        aria-pressed={active}
        className={`relative shrink-0 rounded-xl px-3.5 py-2 text-[11px] font-semibold transition-all ${
          active
            ? 'bg-gradient-to-r from-violet-600/90 via-fuchsia-600/80 to-pink-600/80 text-white shadow-lg shadow-fuchsia-900/25'
            : 'bg-white/[0.04] text-slate-400 hover:bg-white/[0.08] hover:text-slate-200'
        }`}
      >
        {label}
        {typeof count === 'number' && count > 0 && (
          <span
            className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[9px] tabular-nums ${
              active ? 'bg-white/20 text-white' : 'bg-fuchsia-500/20 text-fuchsia-200'
            }`}
          >
            {count}
          </span>
        )}
      </button>
    );
  };

  const modalUsers =
    listModal === 'followers' ? followers : listModal === 'following' ? followedUsers : [];

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-br from-[#1B1035] via-[#160F2E] to-[#0E1430] p-5 sm:p-6">
        <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-fuchsia-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-10 h-52 w-52 rounded-full bg-sky-500/15 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-violet-400 via-fuchsia-500 to-pink-600 shadow-lg shadow-fuchsia-900/40 ring-1 ring-white/25">
              <UsersRound className="h-6 w-6 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]" />
            </span>
            <div className="min-w-0">
              <h1 className="font-display text-2xl font-bold text-white">Friends</h1>
              <p className="mt-0.5 text-xs text-slate-400">
                Your mutual friends, online presence and live rooms across AddaBuzz.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 text-[10px] font-semibold">
            <span className="rounded-full border border-fuchsia-300/20 bg-fuchsia-500/10 px-2.5 py-1 text-fuchsia-100">
              {friends.length} friends
            </span>
            <span className="rounded-full border border-emerald-300/20 bg-emerald-500/10 px-2.5 py-1 text-emerald-100">
              {onlineFriends.length} online
            </span>
            <button
              type="button"
              onClick={() => setListModal('followers')}
              className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-slate-200 hover:bg-white/[0.1]"
            >
              {followers.length} followers
            </button>
            <button
              type="button"
              onClick={() => setListModal('following')}
              className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-slate-200 hover:bg-white/[0.1]"
            >
              {followedUsers.length} following
            </button>
          </div>
        </div>

        <div className="relative mt-4">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search friends, creators by name, @username or ID"
            aria-label="Search friends"
            className="h-10 w-full rounded-xl border border-white/[0.08] bg-[#090B12]/80 pl-10 pr-9 text-xs text-white placeholder:text-slate-500 focus:border-fuchsia-400/50 focus:outline-none"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full text-slate-400 hover:bg-white/10 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="relative mt-4 flex items-center gap-1.5 overflow-x-auto pb-0.5">
          {tabButton('all', 'All Friends', friends.length)}
          {tabButton('online', 'Online', onlineFriends.length)}
          {tabButton('following', 'Following', followedUsers.length)}
          {tabButton('requests', 'Requests', incomingRequests.length)}
        </div>
      </div>

      {!currentUser ? (
        <div className="rounded-2xl border border-white/[0.08] bg-[#111420] p-10 text-center">
          <p className="font-display text-base font-semibold text-white">
            Sign in to manage your friends
          </p>
          <p className="mx-auto mt-2 max-w-sm text-xs text-slate-400">
            Friend requests, online presence and live invitations are tied to your
            AddaBuzz account.
          </p>
          <button type="button" onClick={onOpenAuth} className={`${primaryBtn} mt-4`}>
            Open sign-in
          </button>
        </div>
      ) : !usersReady ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-white/[0.06] bg-[#111420] p-4">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-full bg-white/[0.07]" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-2/3 rounded bg-white/[0.07]" />
                  <div className="h-2.5 w-1/3 rounded bg-white/[0.05]" />
                </div>
              </div>
              <div className="mt-3 h-8 w-2/3 rounded-lg bg-white/[0.05]" />
            </div>
          ))}
        </div>
      ) : loadError ? (
        <div className="rounded-2xl border border-rose-400/20 bg-rose-950/20 p-6 text-sm text-rose-200">
          {loadError}
        </div>
      ) : (
        <>
          {tab === 'all' && (
            <div className="space-y-6">
              {visibleLiveRooms.length > 0 && (
                <section className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="flex items-center gap-2 font-display text-base font-semibold text-white">
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-70" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500" />
                      </span>
                      Live friends
                    </h2>
                    <span className="text-[10px] font-semibold text-slate-400">
                      {visibleLiveRooms.length} broadcasting
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {visibleLiveRooms.map((room) => {
                      const host = byUid.get(room.hostUid);
                      if (!host) return null;
                      return (
                        <RoomCard
                          key={room.roomId}
                          room={room}
                          host={host}
                          onJoinRoom={onJoinRoom}
                          onOpenHostProfile={onOpenUserProfile}
                        />
                      );
                    })}
                  </div>
                </section>
              )}

              <section className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-display text-base font-semibold text-white">Your friends</h2>
                  <span className="text-[10px] font-semibold text-slate-400">
                    {visibleFriends.length} of {friends.length}
                  </span>
                </div>
                {visibleFriends.length === 0 ? (
                  <div className="rounded-2xl border border-white/[0.08] bg-[#111420] p-8 text-center">
                    <p className="text-sm font-semibold text-white">
                      {query ? 'No friends match your search' : 'No friends yet'}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {query
                        ? 'Try a different name, @username or platform ID.'
                        : 'Send friend requests to creators below. Friends are mutual follows.'}
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {visibleFriends.map((user) => (
                      <FriendCard key={user.uid} user={user} />
                    ))}
                  </div>
                )}
              </section>

              {visibleRecommended.length > 0 && (
                <section className="space-y-3">
                  <h2 className="flex items-center gap-2 font-display text-base font-semibold text-white">
                    <Sparkles className="h-4 w-4 text-fuchsia-300" />
                    Recommended creators
                  </h2>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {visibleRecommended.map((user) => (
                      <FriendCard key={user.uid} user={user} showRemove={false} />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}

          {tab === 'online' && (
            <section className="space-y-3">
              <h2 className="font-display text-base font-semibold text-white">Online friends</h2>
              <p className="text-[11px] text-slate-400">
                Online status comes from live presence heartbeats, not stored profile flags.
              </p>
              {visibleOnline.length === 0 ? (
                <div className="rounded-2xl border border-white/[0.08] bg-[#111420] p-8 text-center">
                  <p className="text-sm font-semibold text-white">
                    {query ? 'No online friends match your search' : 'No friends are online right now'}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {query
                      ? 'Try another search.'
                      : 'Open AddaBuzz on another device to see presence appear here.'}
                  </p>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {visibleOnline.map((user) => (
                    <FriendCard key={user.uid} user={user} />
                  ))}
                </div>
              )}
            </section>
          )}

          {tab === 'following' && (
            <section className="space-y-3">
              <h2 className="font-display text-base font-semibold text-white">Following</h2>
              {visibleFollowing.length === 0 ? (
                <div className="rounded-2xl border border-white/[0.08] bg-[#111420] p-8 text-center">
                  <p className="text-sm font-semibold text-white">You are not following anyone yet</p>
                  <p className="mt-1 text-xs text-slate-400">
                    Follow creators from the All Friends tab to build your feed.
                  </p>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {visibleFollowing.map((user) => (
                    <article
                      key={user.uid}
                      className="rounded-2xl border border-white/[0.08] bg-[#111420] p-4"
                    >
                      <div className="flex items-start gap-3">
                        <button type="button" onClick={() => onOpenUserProfile(user)}>
                          <Avatar
                            name={user.displayName}
                            color={user.avatarColor}
                            avatarUrl={user.avatarUrl}
                            size="md"
                          />
                        </button>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-semibold text-white">
                              {user.displayName}
                            </p>
                            <CreatorBadge user={user} />
                          </div>
                          <p className="truncate text-[11px] text-slate-400">@{user.username}</p>
                          <p className="text-[10px] text-slate-500">
                            {user.followersCount.toLocaleString()} followers
                            {followerUids.includes(user.uid) ? ' · follows you' : ''}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-1.5">
                        {requestAction(user)}
                        <button type="button" onClick={() => onStartDirectMessage(user)} className={ghostBtn}>
                          <MessageSquare className="h-3.5 w-3.5" />
                          Message
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setConfirm({
                              title: `Unfollow ${user.displayName}?`,
                              body: 'Their rooms and updates will stop appearing in your Following feed.',
                              confirmLabel: 'Unfollow',
                              tone: 'danger',
                              action: () => {
                                onToggleFollow(user.uid);
                                setConfirm(null);
                              },
                            })
                          }
                          className={ghostBtn}
                        >
                          <UserMinus className="h-3.5 w-3.5" />
                          Unfollow
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

          {tab === 'requests' && (
            <div className="grid gap-4 lg:grid-cols-2">
              <section className="space-y-3">
                <h2 className="font-display text-base font-semibold text-white">
                  Incoming requests
                </h2>
                {incomingRequests.length === 0 ? (
                  <div className="rounded-2xl border border-white/[0.08] bg-[#111420] p-6 text-xs text-slate-400">
                    No pending friend requests right now.
                  </div>
                ) : (
                  incomingRequests.map((req) => {
                    const sender = byUid.get(req.fromUid);
                    return (
                      <div
                        key={req.requestId}
                        className="rounded-2xl border border-fuchsia-400/20 bg-gradient-to-br from-[#1A1030] to-[#111420] p-4"
                      >
                        <div className="flex items-start gap-3">
                          <Avatar
                            name={req.fromDisplayName || sender?.displayName || 'Creator'}
                            color={req.fromAvatarColor}
                            avatarUrl={req.fromAvatarUrl}
                            size="md"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-white">
                              {req.fromDisplayName}
                            </p>
                            <p className="truncate text-[11px] text-slate-400">
                              @{req.fromUsername} · {req.timestampLabel}
                            </p>
                          </div>
                        </div>
                        <div className="mt-3 flex gap-1.5">
                          <button
                            type="button"
                            disabled={busy !== null}
                            onClick={() =>
                              void runBusy(`acc_${req.requestId}`, () =>
                                onAcceptFriendRequest(req)
                              )
                            }
                            className={primaryBtn}
                          >
                            {busy === `acc_${req.requestId}` ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <UserCheck className="h-3.5 w-3.5" />
                            )}
                            Accept
                          </button>
                          <button
                            type="button"
                            disabled={busy !== null}
                            onClick={() =>
                              void runBusy(`dec_${req.requestId}`, () =>
                                onDeclineFriendRequest(req)
                              )
                            }
                            className={ghostBtn}
                          >
                            <X className="h-3.5 w-3.5" />
                            Decline
                          </button>
                          {sender && (
                            <button
                              type="button"
                              onClick={() => onOpenUserProfile(sender)}
                              className={ghostBtn}
                            >
                              <Eye className="h-3.5 w-3.5" />
                              Profile
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </section>

              <section className="space-y-3">
                <h2 className="font-display text-base font-semibold text-white">
                  Sent requests
                </h2>
                {outgoingRequests.length === 0 ? (
                  <div className="rounded-2xl border border-white/[0.08] bg-[#111420] p-6 text-xs text-slate-400">
                    You have not sent any friend requests.
                  </div>
                ) : (
                  outgoingRequests.map((req) => {
                    const target = byUid.get(req.toUid);
                    const label = target?.displayName ?? 'Creator';
                    return (
                      <div
                        key={req.requestId}
                        className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-[#111420] p-4"
                      >
                        <Avatar
                          name={label}
                          color={target?.avatarColor}
                          avatarUrl={target?.avatarUrl}
                          size="sm"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-white">{label}</p>
                          <p className="text-[10px] text-slate-400">
                            Requested · {req.timestampLabel}
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={busy !== null}
                          onClick={() =>
                            void runBusy(`cancel_${req.requestId}`, () =>
                              onDeclineFriendRequest(req)
                            )
                          }
                          className={dangerBtn}
                        >
                          {busy === `cancel_${req.requestId}` ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <X className="h-3.5 w-3.5" />
                          )}
                          Cancel
                        </button>
                      </div>
                    );
                  })
                )}
              </section>
            </div>
          )}
        </>
      )}

      {/* Followers / following sheet */}
      {listModal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label={listModal === 'followers' ? 'Followers' : 'Following'}
        >
          <div className="w-full max-w-md rounded-t-2xl border border-white/10 bg-[#111420] p-4 sm:rounded-2xl">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-semibold text-white">
                {listModal === 'followers' ? 'Followers' : 'Following'}
              </h2>
              <button
                type="button"
                onClick={() => setListModal(null)}
                aria-label="Close list"
                className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-3 max-h-[60vh] space-y-1 overflow-y-auto">
              {modalUsers.length === 0 ? (
                <p className="py-6 text-center text-xs text-slate-400">
                  {listModal === 'followers'
                    ? 'No followers yet.'
                    : 'You are not following anyone yet.'}
                </p>
              ) : (
                modalUsers.map((user) => (
                  <div key={user.uid} className="flex items-center gap-2.5 rounded-xl p-2 hover:bg-white/[0.04]">
                    <Avatar name={user.displayName} color={user.avatarColor} avatarUrl={user.avatarUrl} size="sm" />
                    <button
                      type="button"
                      onClick={() => {
                        setListModal(null);
                        onOpenUserProfile(user);
                      }}
                      className="min-w-0 flex-1 text-left"
                    >
                      <p className="truncate text-xs font-semibold text-white">{user.displayName}</p>
                      <p className="truncate text-[10px] text-slate-400">@{user.username}</p>
                    </button>
                    <button type="button" onClick={() => onStartDirectMessage(user)} className={ghostBtn}>
                      <MessageSquare className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {confirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={confirm.title}
        >
          <div className="w-full max-w-sm rounded-2xl border border-white/12 bg-[#111420] p-5">
            <h2 className="font-display text-base font-bold text-white">{confirm.title}</h2>
            <p className="mt-2 text-xs leading-relaxed text-slate-300">{confirm.body}</p>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setConfirm(null)} className={ghostBtn}>
                Cancel
              </button>
              <button
                type="button"
                onClick={() => confirm.action()}
                className={confirm.tone === 'danger' ? dangerBtn : primaryBtn}
              >
                {confirm.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
