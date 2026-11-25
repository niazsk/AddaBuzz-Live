import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  BadgeCheck,
  Camera,
  ChevronRight,
  Coins,
  Copy,
  CreditCard,
  Crown,
  Edit3,
  Gamepad2,
  Gem,
  Gift,
  LayoutDashboard,
  LogIn,
  LogOut,
  MapPin,
  MessageSquare,
  Mic,
  Send,
  Settings,
  Share2,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  Trophy,
  UserPlus,
  Users,
  UserX,
  Wallet,
  X,
} from 'lucide-react';
import { AppSection, UserProfile } from '../../types/app';
import { Avatar } from '../ui/Avatar';
import { ProfileImageKind, compressProfileImage } from '../../lib/profileImages';
import {
  accountRoleLabel,
  fetchCoverImage,
  isBdAgentProfile,
  saveCoverImage,
} from '../../lib/firestoreService';
import { visibleBio } from '../../lib/profileBio';

interface ProfileViewProps {
  currentUser: UserProfile | null;
  allUsers: UserProfile[];
  followingUids: string[];
  followersUids?: string[];
  visitorUids?: string[];
  blockedUids: string[];
  isAdminUser: boolean;
  friendsCount: number;
  coinBalance: number;
  diamondBalance: number;
  tradingCoinBalance?: number;
  onUpdateProfile: (updates: {
    displayName: string;
    bio: string;
    country: string;
    gender: UserProfile['gender'];
    showPresence: boolean;
    avatarUrl?: string;
  }) => Promise<void>;
  onToggleFollow?: (uid: string) => void;
  onStartMessage?: (user: UserProfile) => void;
  onUnblockUser: (uid: string) => void;
  onOpenUserProfile?: (user: UserProfile) => void;
  onOpenSection: (section: AppSection) => void;
  onOpenAuth: () => void;
  onSignOut: () => void;
  onToast?: (
    title: string,
    desc?: string,
    tone?: 'info' | 'success' | 'warning' | 'error'
  ) => void;
}

type TileTone = 'amber' | 'rose' | 'gold' | 'emerald' | 'sky' | 'indigo' | 'violet' | 'fuchsia' | 'cyan';

const TONE_STYLES: Record<TileTone, { chip: string; glow: string }> = {
  amber: { chip: 'from-amber-300 via-orange-500 to-rose-500', glow: 'shadow-amber-500/40' },
  rose: { chip: 'from-rose-300 via-pink-500 to-fuchsia-600', glow: 'shadow-rose-500/40' },
  gold: { chip: 'from-yellow-200 via-amber-400 to-orange-500', glow: 'shadow-amber-400/40' },
  emerald: { chip: 'from-emerald-300 via-teal-500 to-cyan-600', glow: 'shadow-emerald-500/40' },
  sky: { chip: 'from-sky-300 via-blue-500 to-indigo-600', glow: 'shadow-sky-500/40' },
  indigo: { chip: 'from-indigo-300 via-violet-500 to-purple-600', glow: 'shadow-indigo-500/40' },
  violet: { chip: 'from-violet-300 via-purple-500 to-fuchsia-600', glow: 'shadow-violet-500/40' },
  fuchsia: { chip: 'from-fuchsia-300 via-pink-500 to-rose-600', glow: 'shadow-fuchsia-500/40' },
  cyan: { chip: 'from-cyan-300 via-sky-500 to-blue-600', glow: 'shadow-cyan-500/40' },
};

type Tile = {
  id: string;
  label: string;
  icon: React.FC<{ className?: string }>;
  tone: TileTone;
  section: AppSection;
};

const CREATOR_TILES: Tile[] = [
  { id: 'reward', label: 'Reward', icon: Gift, tone: 'amber', section: 'reward' },
  { id: 'host-rewards', label: 'Host Reward', icon: Crown, tone: 'rose', section: 'host-rewards' },
  { id: 'rank', label: 'Rank', icon: Trophy, tone: 'gold', section: 'rank' },
  { id: 'honor', label: 'Honor Level', icon: ShieldCheck, tone: 'violet', section: 'honor' },
  { id: 'games', label: 'Games', icon: Gamepad2, tone: 'emerald', section: 'games' },
  { id: 'invite', label: 'Invite', icon: Send, tone: 'indigo', section: 'invite' },
];

const COMMERCE_TILES: Tile[] = [
  { id: 'wallet', label: 'Wallet', icon: Wallet, tone: 'amber', section: 'wallet' },
  { id: 'store', label: 'Store', icon: ShoppingBag, tone: 'sky', section: 'store' },
  { id: 'deposit', label: 'Deposit', icon: CreditCard, tone: 'cyan', section: 'deposit' },
  { id: 'salary', label: 'Salary', icon: Gem, tone: 'fuchsia', section: 'salary' },
];

const AGENT_TILES: Tile[] = [
  { id: 'agent-list', label: 'Agent List', icon: Users, tone: 'indigo', section: 'agent-list' },
  { id: 'my-host', label: 'My Host', icon: Mic, tone: 'rose', section: 'my-host' },
  { id: 'invite-agent', label: 'Invite Agent', icon: UserPlus, tone: 'violet', section: 'invite-agent' },
  { id: 'coins-trading', label: 'Coins Trading', icon: Coins, tone: 'amber', section: 'coins-trading' },
  { id: 'agent-ranking', label: 'Agent Ranking', icon: TrendingUp, tone: 'emerald', section: 'agent-ranking' },
];

const SUPER_AGENT_TILES: Tile[] = [
  { id: 'my-agent', label: 'My Agent', icon: Users, tone: 'indigo', section: 'my-agent' },
  { id: 'my-host', label: 'My Host', icon: Mic, tone: 'rose', section: 'my-host' },
  { id: 'invite-agent', label: 'Invite Agent', icon: UserPlus, tone: 'violet', section: 'invite-agent' },
  { id: 'coins-trading', label: 'Coins Trading', icon: Coins, tone: 'amber', section: 'coins-trading' },
  { id: 'agent-ranking', label: 'Agent Ranking', icon: TrendingUp, tone: 'emerald', section: 'agent-ranking' },
];

const BD_AGENT_TILES: Tile[] = [
  { id: 'super-agent-list', label: 'Super Agent List', icon: BadgeCheck, tone: 'sky', section: 'super-agent-list' },
  { id: 'agent-list', label: 'Agent List', icon: Users, tone: 'indigo', section: 'agent-list' },
  { id: 'my-agent', label: 'My Agent', icon: Users, tone: 'violet', section: 'my-agent' },
  { id: 'my-host', label: 'My Host', icon: Mic, tone: 'rose', section: 'my-host' },
  { id: 'invite-agent', label: 'Invite Agent', icon: UserPlus, tone: 'cyan', section: 'invite-agent' },
  { id: 'agent-promote', label: 'Agent Promote', icon: TrendingUp, tone: 'emerald', section: 'agent-promote' },
  { id: 'coins-trading', label: 'Coins Trading', icon: Coins, tone: 'amber', section: 'coins-trading' },
  { id: 'agent-ranking', label: 'Agent Ranking', icon: TrendingUp, tone: 'emerald', section: 'agent-ranking' },
];

export const ProfileView: React.FC<ProfileViewProps> = ({
  currentUser,
  allUsers,
  followingUids,
  followersUids = [],
  visitorUids = [],
  blockedUids,
  isAdminUser,
  friendsCount,
  coinBalance,
  diamondBalance,
  tradingCoinBalance = 0,
  onUpdateProfile,
  onToggleFollow,
  onStartMessage,
  onUnblockUser,
  onOpenUserProfile,
  onOpenSection,
  onOpenAuth,
  onSignOut,
  onToast,
}) => {
  const [statsList, setStatsList] = useState<
    'followers' | 'following' | 'friends' | 'visitors' | null
  >(null);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [photoBusy, setPhotoBusy] = useState<ProfileImageKind | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [coverImage, setCoverImage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!currentUser?.uid) return;
    fetchCoverImage(currentUser.uid).then((dataUrl) => {
      if (!cancelled && dataUrl) setCoverImage(dataUrl);
    });
    return () => {
      cancelled = true;
    };
  }, [currentUser?.uid]);

  if (!currentUser) {
    return (
      <div className="pb-8">
        <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-br from-violet-600/25 via-[#111420] to-fuchsia-600/15 p-8 sm:p-12 text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center">
            <BadgeCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="font-display text-2xl font-bold text-white">
            Your AddaBuzz profile
          </h1>
          <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
            Sign in to reserve your username, manage your wallet, follow creators and host live rooms.
          </p>
          <button
            type="button"
            onClick={onOpenAuth}
            className="px-6 py-2.5 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white text-sm font-semibold inline-flex items-center gap-2 shadow-lg shadow-violet-900/40"
          >
            <LogIn className="w-4 h-4" />
            <span>Sign In</span>
          </button>
        </div>
      </div>
    );
  }

  const blockedUsers = allUsers.filter((u) => blockedUids.includes(u.uid));
  const isAgentUser =
    currentUser.accountType === 'AGENT' ||
    currentUser.accountType === 'SUPER_AGENT';
  const isBdAgent = isBdAgentProfile(currentUser);
  const roleLabel = accountRoleLabel(currentUser);

  const friendUids = followingUids.filter((uid) => followersUids.includes(uid));
  const statsListUids: Record<NonNullable<typeof statsList>, string[]> = {
    followers: followersUids,
    following: followingUids,
    friends: friendUids,
    visitors: visitorUids,
  };
  const statsListTitle =
    statsList === 'followers'
      ? 'Followers'
      : statsList === 'following'
      ? 'Following'
      : statsList === 'friends'
      ? 'Friends'
      : 'Visitors';
  const statsListUsers = statsList
    ? statsListUids[statsList]
        .map((uid) => allUsers.find((u) => u.uid === uid))
        .filter((u): u is UserProfile => u !== undefined && u.uid !== currentUser.uid)
    : [];

  const copyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      onToast?.('Copied', `${label} copied to clipboard.`, 'success');
    } catch {
      onToast?.(label, text, 'info');
    }
  };

  const shareProfile = async () => {
    const url = `${window.location.origin}${window.location.pathname}?u=${encodeURIComponent(
      currentUser.platformId
    )}`;
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: `${currentUser.displayName} on AddaBuzz Live`,
          text: `Find @${currentUser.username} (ID ${currentUser.platformId}) on AddaBuzz Live`,
          url,
        });
        return;
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
      }
    }
    await copyText(url, 'Profile link');
  };

  const handlePhotoPick =
    (kind: ProfileImageKind) => async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;
      setPhotoBusy(kind);
      try {
        const dataUrl = await compressProfileImage(kind, file);
        if (kind === 'avatar') {
          await onUpdateProfile({
            displayName: currentUser.displayName,
            bio: currentUser.bio,
            country: currentUser.country,
            gender: currentUser.gender,
            showPresence: currentUser.showPresence,
            avatarUrl: dataUrl,
          });
          onToast?.('Profile photo updated', undefined, 'success');
        } else {
          await saveCoverImage(currentUser.uid, dataUrl);
          setCoverImage(dataUrl);
          onToast?.('Cover photo updated', undefined, 'success');
        }
      } catch (err) {
        onToast?.(
          'Photo upload failed',
          err instanceof Error ? err.message : 'Could not process this image.',
          'error'
        );
      } finally {
        setPhotoBusy(null);
      }
    };

  const renderTile = (tile: Tile) => {
    const Icon = tile.icon;
    const tone = TONE_STYLES[tile.tone];
    return (
      <button
        key={tile.id}
        type="button"
        onClick={() => onOpenSection(tile.section)}
        className="group relative overflow-hidden rounded-2xl bg-white/[0.035] border border-white/[0.07] hover:bg-white/[0.07] hover:border-white/[0.16] p-3.5 flex flex-col items-center gap-2.5 transition-all duration-200 hover:-translate-y-0.5"
      >
        <span
          className={`relative w-11 h-11 rounded-[14px] bg-gradient-to-br ${tone.chip} flex items-center justify-center ring-1 ring-white/25 shadow-lg ${tone.glow} transition-transform duration-200 group-hover:scale-110`}
        >
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-[14px] bg-gradient-to-b from-white/35 via-white/0 to-black/15"
          />
          <Icon className="relative w-5 h-5 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]" />
        </span>
        <span className="text-[11px] font-medium text-slate-300 group-hover:text-white text-center leading-tight">
          {tile.label}
        </span>
      </button>
    );
  };

  return (
    <div className="space-y-5 pb-8">
      {/* Identity card */}
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[#111420]">
        <div
          className="h-36 sm:h-44 w-full relative"
          style={{
            background: coverImage
              ? `center / cover no-repeat url(${coverImage})`
              : currentUser.coverUrl
              ? `center / cover no-repeat url(${currentUser.coverUrl})`
              : currentUser.coverGradient,
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-[#111420] via-transparent to-transparent" />
          <button
            type="button"
            onClick={() => coverInputRef.current?.click()}
            disabled={photoBusy !== null}
            aria-label="Change cover photo"
            className="absolute top-3 left-3 w-9 h-9 rounded-full bg-black/40 backdrop-blur-md border border-white/15 hover:bg-black/60 disabled:opacity-50 flex items-center justify-center text-white transition-colors"
          >
            <Camera className="w-4 h-4" />
          </button>
          <div className="absolute top-3 right-3 flex items-center gap-1.5">
            <button
              type="button"
              onClick={shareProfile}
              aria-label="Share profile"
              className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-md border border-white/15 hover:bg-black/60 flex items-center justify-center text-white transition-colors"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onOpenSection('edit-profile')}
              aria-label="Edit profile"
              className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-md border border-white/15 hover:bg-black/60 flex items-center justify-center text-white transition-colors"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onOpenSection('settings')}
              aria-label="Open settings"
              className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-md border border-white/15 hover:bg-black/60 flex items-center justify-center text-white transition-colors"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setConfirmSignOut(true)}
              aria-label="Sign out"
              className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-md border border-white/15 hover:bg-rose-600/60 flex items-center justify-center text-white transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="px-5 sm:px-7 pb-6 -mt-12 relative">
          <div className="flex items-end justify-between gap-3">
            <div className="relative">
              <Avatar
                name={currentUser.displayName}
                color={currentUser.avatarColor}
                src={currentUser.avatarUrl}
                size="xl"
                className="ring-4 ring-[#111420]"
              />
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={photoBusy !== null}
                aria-label="Change profile photo"
                className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 border-2 border-[#111420] flex items-center justify-center text-white transition-colors"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>
            <span className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-violet-600/20 border border-violet-500/30 px-3 py-1 text-[11px] font-semibold text-violet-200">
              <BadgeCheck className="w-3.5 h-3.5" />
              <span>{roleLabel}</span>
            </span>
          </div>

          <div className="mt-3 space-y-1">
            <h1 className="font-display text-2xl font-bold text-white leading-tight">
              {currentUser.displayName}
            </h1>
            <p className="text-xs text-slate-400 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span>@{currentUser.username}</span>
              <button
                type="button"
                onClick={() => copyText(currentUser.platformId, 'User ID')}
                className="inline-flex items-center gap-1 font-mono text-sky-300 hover:text-sky-200 transition-colors"
                aria-label="Copy user ID"
              >
                <span>ID {currentUser.platformId}</span>
                <Copy className="w-3 h-3" />
              </button>
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {currentUser.country}
              </span>
            </p>
          </div>

          <p className="mt-2 inline-flex items-center gap-2 rounded-full border border-white/[0.09] bg-white/[0.04] px-3 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
            <Sparkles className="h-3 w-3 text-fuchsia-300" aria-hidden="true" />
            <span className="bg-[linear-gradient(92deg,#7DD3FC_0%,#C4B5FD_50%,#F0ABFC_100%)] bg-clip-text text-[10px] font-extrabold uppercase tracking-[0.22em] text-transparent">
              Connect · Stream · Chat · Enjoy
            </span>
          </p>

          {visibleBio(currentUser.bio) && (
            <p className="text-sm text-slate-300 mt-3 leading-relaxed">{visibleBio(currentUser.bio)}</p>
          )}

          {isBdAgent ? (
            <div
              className="mt-5 rounded-2xl bg-gradient-to-r from-violet-600/20 via-[#111420] to-fuchsia-600/10 border border-violet-500/25 p-4 text-center cursor-pointer hover:border-violet-500/50 transition-colors"
              onClick={() => onOpenSection('coins-trading')}
            >
              <p className="font-mono text-2xl font-black text-amber-300 tabular-nums">
                {tradingCoinBalance.toLocaleString()}
              </p>
              <p className="text-xs font-semibold text-violet-300 mt-0.5">Coins Trading Balance</p>
            </div>
          ) : (
            <>
              <div className="mt-5 grid grid-cols-4 divide-x divide-white/[0.07] rounded-2xl bg-white/[0.04] border border-white/[0.06] py-3 text-center">
                <button
                  type="button"
                  onClick={() => setStatsList('followers')}
                  className="group px-1 rounded-lg transition-colors hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
                >
                  <p className="font-mono text-lg font-bold text-white tabular-nums group-hover:text-sky-300 transition-colors">
                    {(currentUser.followersCount ?? 0).toLocaleString()}
                  </p>
                  <p className="text-[11px] text-slate-400">Followers</p>
                </button>
                <button
                  type="button"
                  onClick={() => setStatsList('following')}
                  className="group px-1 rounded-lg transition-colors hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
                >
                  <p className="font-mono text-lg font-bold text-white tabular-nums group-hover:text-sky-300 transition-colors">
                    {(followingUids?.length ?? 0).toLocaleString()}
                  </p>
                  <p className="text-[11px] text-slate-400">Following</p>
                </button>
                <button
                  type="button"
                  onClick={() => setStatsList('friends')}
                  className="group px-1 rounded-lg transition-colors hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
                >
                  <p className="font-mono text-lg font-bold text-white tabular-nums group-hover:text-sky-300 transition-colors">
                    {(friendsCount ?? 0).toLocaleString()}
                  </p>
                  <p className="text-[11px] text-slate-400">Friends</p>
                </button>
                <button
                  type="button"
                  onClick={() => setStatsList('visitors')}
                  className="group px-1 rounded-lg transition-colors hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
                >
                  <p className="font-mono text-lg font-bold text-white tabular-nums group-hover:text-sky-300 transition-colors">
                    {(currentUser.visitorsCount ?? 0).toLocaleString()}
                  </p>
                  <p className="text-[11px] text-slate-400">Visitor</p>
                </button>
              </div>

              <button
                type="button"
                onClick={() => onOpenSection('wallet')}
                className="mt-2.5 w-full grid grid-cols-2 divide-x divide-white/[0.07] rounded-2xl bg-white/[0.04] border border-white/[0.06] py-3 text-center hover:border-white/[0.14] transition-colors"
              >
                <span>
                  <span className="block font-mono text-base sm:text-lg font-bold text-amber-300 tabular-nums">
                    {coinBalance.toLocaleString()}
                  </span>
                  <span className="block text-[11px] text-slate-400">Coins Balance</span>
                </span>
                <span>
                  <span className="block font-mono text-base sm:text-lg font-bold text-sky-300 tabular-nums">
                    {diamondBalance.toLocaleString()}
                  </span>
                  <span className="block text-[11px] text-slate-400">Diamonds Balance</span>
                </span>
              </button>
              <p className="mt-1 text-center text-[10px] text-slate-500 inline-flex w-full items-center justify-center gap-1">
                <Wallet className="w-3 h-3" />
                Tap the balances to open Wallet Center
              </p>
            </>
          )}
        </div>
      </div>

      <input
        ref={avatarInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePhotoPick('avatar')}
      />
      <input
        ref={coverInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePhotoPick('cover')}
      />
      {photoBusy && (
        <p className="rounded-xl bg-violet-500/10 border border-violet-500/30 px-4 py-2 text-xs text-violet-200 text-center">
          Uploading {photoBusy === 'avatar' ? 'profile photo' : 'cover photo'}…
        </p>
      )}

      {confirmSignOut && (
        <div className="rounded-2xl bg-rose-500/10 border border-rose-500/30 p-3.5 flex flex-col sm:flex-row sm:items-center gap-2">
          <p className="text-xs text-rose-100 flex-1">
            Sign out of this account? You can sign back in anytime.
          </p>
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setConfirmSignOut(false)}
              className="px-3 h-8 rounded-lg bg-white/[0.08] text-xs font-medium text-slate-200"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirmSignOut(false);
                onSignOut();
              }}
              className="px-3 h-8 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}

      {/* Creator & social */}
      {!isBdAgent && (
        <section className="rounded-3xl bg-[#111420] border border-white/[0.08] p-4 sm:p-5 space-y-3">
          <h2 className="font-display text-sm font-semibold text-white px-1">
            Creator &amp; Social
          </h2>
          <div className="grid grid-cols-4 gap-2.5">
            {CREATOR_TILES.filter(
              (t) => t.id !== 'host-rewards' || currentUser.gender === 'Female'
            ).map(renderTile)}
          </div>
        </section>
      )}

      {/* Commerce */}
      {!isBdAgent && (
        <section className="rounded-3xl bg-[#111420] border border-white/[0.08] p-4 sm:p-5 space-y-3">
          <h2 className="font-display text-sm font-semibold text-white px-1">Wallet &amp; Store</h2>
          <div className="grid grid-cols-4 gap-2.5">{COMMERCE_TILES.map(renderTile)}</div>
        </section>
      )}

      {/* Agent management */}
      {(isAgentUser || isAdminUser) && (
        <section className="rounded-3xl bg-[#111420] border border-white/[0.08] p-4 sm:p-5 space-y-3">
          <h2 className="font-display text-sm font-semibold text-white px-1">
            Agent Management
          </h2>
          <div className="grid grid-cols-4 gap-2.5">
            {(isBdAgent
              ? BD_AGENT_TILES
              : currentUser.accountType === 'SUPER_AGENT'
              ? SUPER_AGENT_TILES
              : AGENT_TILES
            ).map(renderTile)}
          </div>
        </section>
      )}

      {/* Admin panel shortcut — admin accounts only */}
      {isAdminUser && (
        <button
          type="button"
          onClick={() => onOpenSection('admin-panel')}
          className="w-full rounded-2xl bg-gradient-to-r from-violet-600/25 to-[#111420] border border-violet-500/35 hover:border-violet-400/60 p-4 flex items-center justify-between gap-3 transition-colors"
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-violet-400 via-purple-500 to-fuchsia-600 ring-1 ring-white/25 shadow-lg shadow-violet-500/40 flex items-center justify-center shrink-0">
              <span
                aria-hidden="true"
                className="absolute inset-0 rounded-xl bg-gradient-to-b from-white/30 via-white/0 to-black/15"
              />
              <LayoutDashboard className="relative w-5 h-5 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]" />
            </span>
            <div className="text-left min-w-0">
              <p className="text-sm font-semibold text-white">Admin Panel</p>
              <p className="text-xs text-slate-400 truncate">
                Users, live rooms, reports, wallets, games & broadcast
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
        </button>
      )}

      {/* Account */}
      <section className="rounded-3xl bg-[#111420] border border-white/[0.08] divide-y divide-white/[0.06] overflow-hidden">
        <h2 className="font-display text-sm font-semibold text-white px-4 sm:px-5 pt-4 pb-2">
          Account
        </h2>
        <button
          type="button"
          onClick={() => onOpenSection('edit-profile')}
          className="w-full px-4 sm:px-5 py-3 flex items-center justify-between gap-3 text-left hover:bg-white/[0.03] transition-colors"
        >
          <span className="flex items-center gap-2.5">
            <Edit3 className="w-4 h-4 text-violet-300" />
            <span>
              <span className="block text-xs font-medium text-slate-200">Edit Profile</span>
              <span className="block text-[11px] text-slate-500">
                Name, username, bio, photos and language
              </span>
            </span>
          </span>
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </button>
        <button
          type="button"
          onClick={() => onOpenSection('settings')}
          className="w-full px-4 sm:px-5 py-3 flex items-center justify-between gap-3 text-left hover:bg-white/[0.03] transition-colors"
        >
          <span className="flex items-center gap-2.5">
            <Settings className="w-4 h-4 text-sky-300" />
            <span>
              <span className="block text-xs font-medium text-slate-200">Settings</span>
              <span className="block text-[11px] text-slate-500">
                Privacy, notifications, security, help
              </span>
            </span>
          </span>
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </button>
      </section>

      {/* Blocked accounts */}
      {blockedUsers.length > 0 && (
        <section className="rounded-3xl bg-[#111420] border border-white/[0.08] p-4 sm:p-5 space-y-3">
          <h2 className="font-display text-sm font-semibold text-white px-1">
            Blocked ({blockedUsers.length})
          </h2>
          <div className="space-y-2">
            {blockedUsers.map((user) => (
              <div key={user.uid} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Avatar name={user.displayName} color={user.avatarColor} size="xs" />
                  <span className="text-xs text-slate-200 truncate">
                    {user.displayName} (@{user.username})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onUnblockUser(user.uid)}
                  className="px-2.5 py-1 rounded-lg bg-white/[0.08] hover:bg-white/[0.15] text-xs text-white inline-flex items-center gap-1 shrink-0"
                >
                  <UserX className="w-3 h-3" />
                  <span>Unblock</span>
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Followers / Following / Friends / Visitors list overlay */}
      {statsList &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="stats-list-title"
            onClick={() => setStatsList(null)}
          >
            <div
              className="w-full sm:max-w-md max-h-[80vh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-[#111420] border border-white/[0.1] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08] shrink-0">
                <div>
                  <h2 id="stats-list-title" className="font-display text-base font-semibold text-white">
                    {statsListTitle}
                  </h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {statsListUsers.length} {statsListUsers.length === 1 ? 'person' : 'people'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setStatsList(null)}
                  aria-label={`Close ${statsListTitle}`}
                  className="w-8 h-8 rounded-full bg-white/[0.08] hover:bg-white/[0.15] flex items-center justify-center text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="overflow-y-auto divide-y divide-white/[0.06]">
                {statsListUsers.length === 0 ? (
                  <div className="px-5 py-10 text-center space-y-1.5">
                    <Users className="w-6 h-6 text-slate-500 mx-auto" aria-hidden="true" />
                    <p className="text-sm font-medium text-slate-200">No {statsListTitle.toLowerCase()} yet</p>
                    <p className="text-xs text-slate-500">
                      {statsList === 'visitors'
                        ? 'Visitors appear here as people open your profile.'
                        : 'People will show up here as your community grows.'}
                    </p>
                  </div>
                ) : (
                  statsListUsers.map((user) => {
                    const isFollowing = followingUids.includes(user.uid);
                    return (
                      <div
                        key={user.uid}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.04] transition-colors"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setStatsList(null);
                            onOpenUserProfile?.(user);
                          }}
                          className="flex items-center gap-3 min-w-0 flex-1 text-left"
                        >
                          <Avatar
                            name={user.displayName}
                            color={user.avatarColor}
                            src={user.avatarUrl}
                            size="sm"
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-white truncate">
                              {user.displayName}
                            </p>
                            <p className="text-xs text-slate-400 truncate">
                              @{user.username} · {user.country}
                            </p>
                          </div>
                        </button>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {onToggleFollow && (
                            <button
                              type="button"
                              onClick={() => onToggleFollow(user.uid)}
                              className={`h-7 px-2.5 rounded-lg text-[10px] font-semibold transition-colors ${
                                isFollowing
                                  ? 'bg-white/[0.08] text-slate-200 hover:bg-white/[0.14]'
                                  : 'bg-violet-600 text-white hover:bg-violet-500'
                              }`}
                            >
                              {isFollowing ? 'Following' : 'Follow'}
                            </button>
                          )}
                          {onStartMessage && (
                            <button
                              type="button"
                              onClick={() => {
                                setStatsList(null);
                                onStartMessage(user);
                              }}
                              aria-label={`Message ${user.displayName}`}
                              className="w-7 h-7 rounded-lg bg-white/[0.08] hover:bg-white/[0.15] text-white flex items-center justify-center"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setStatsList(null);
                              onOpenUserProfile?.(user);
                            }}
                            aria-label={`View ${user.displayName}`}
                            className="w-7 h-7 rounded-lg bg-white/[0.08] hover:bg-white/[0.15] text-white flex items-center justify-center"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
