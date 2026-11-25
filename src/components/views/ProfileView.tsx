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
        <div
          className="relative overflow-hidden rounded-[30px] border border-transparent p-8 text-center sm:p-12"
          style={{
            background:
              'linear-gradient(#0A0D16, #0A0D16) padding-box, linear-gradient(180deg, rgba(255,255,255,0.17), rgba(255,255,255,0.04)) border-box',
          }}
        >
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            <div className="absolute -top-24 left-1/2 h-48 w-72 -translate-x-1/2 rounded-full bg-violet-600/25 blur-3xl" />
            <div className="absolute -bottom-24 right-0 h-44 w-44 rounded-full bg-cyan-500/15 blur-3xl" />
          </div>
          <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 shadow-[0_18px_40px_-18px_rgba(167,139,250,0.9)]">
            <BadgeCheck className="h-8 w-8 text-white" />
          </div>
          <h1 className="relative mt-4 font-display text-2xl font-bold text-white">
            Your AddaBuzz profile
          </h1>
          <p className="relative mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-400">
            Sign in to reserve your username, manage your wallet, follow creators and host live rooms.
          </p>
          <button
            type="button"
            onClick={onOpenAuth}
            className="relative mt-5 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-900/40 hover:from-violet-500 hover:to-fuchsia-500"
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
        className="group flex flex-col items-center gap-2 rounded-2xl border border-white/[0.055] bg-white/[0.018] px-1 py-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/[0.14] hover:bg-white/[0.05] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
      >
        <span
          className={`relative flex h-10 w-10 items-center justify-center rounded-[13px] bg-gradient-to-br ${tone.chip} ring-1 ring-white/25 shadow-lg ${tone.glow} transition-transform duration-200 group-hover:scale-110`}
        >
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-[13px] bg-gradient-to-b from-white/35 via-white/0 to-black/15"
          />
          <Icon className="relative h-[18px] w-[18px] text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]" />
        </span>
        <span className="text-center text-[10.5px] font-medium leading-tight text-slate-300 transition-colors group-hover:text-white">
          {tile.label}
        </span>
      </button>
    );
  };

  const renderSectionHeading = (title: string, accent = 'from-cyan-400 to-violet-500') => (
    <div className="flex items-center gap-2 px-1">
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full bg-gradient-to-r ${accent}`} />
      <h2 className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
        {title}
      </h2>
      <span
        aria-hidden="true"
        className="h-px flex-1 bg-gradient-to-r from-white/[0.08] to-transparent"
      />
    </div>
  );

  return (
    <div className="relative space-y-5 pb-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 left-1/2 h-56 w-80 -translate-x-1/2 rounded-full bg-violet-600/[0.1] blur-3xl"
      />

      {/* Identity card */}
      <div
        className="relative overflow-hidden rounded-[30px] border border-transparent shadow-[0_30px_80px_-42px_rgba(139,92,246,0.65)]"
        style={{
          background:
            'linear-gradient(#0A0D16, #0A0D16) padding-box, linear-gradient(180deg, rgba(255,255,255,0.17), rgba(255,255,255,0.04)) border-box',
        }}
      >
        <div
          className="relative h-36 w-full sm:h-44"
          style={{
            background: coverImage
              ? `center / cover no-repeat url(${coverImage})`
              : currentUser.coverUrl
              ? `center / cover no-repeat url(${currentUser.coverUrl})`
              : currentUser.coverGradient,
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A0D16] via-[#0A0D16]/20 to-black/10" />
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -left-10 -top-16 h-40 w-40 rounded-full bg-fuchsia-500/[0.18] blur-3xl" />
            <div className="absolute -right-12 top-4 h-36 w-36 rounded-full bg-cyan-400/[0.14] blur-3xl" />
            <div
              className="absolute inset-0 opacity-40"
              style={{
                backgroundImage: 'radial-gradient(rgba(255,255,255,0.35) 1px, transparent 1px)',
                backgroundSize: '16px 16px',
                maskImage: 'radial-gradient(ellipse at 70% 10%, black 15%, transparent 70%)',
                WebkitMaskImage: 'radial-gradient(ellipse at 70% 10%, black 15%, transparent 70%)',
              }}
            />
          </div>
          <button
            type="button"
            onClick={() => coverInputRef.current?.click()}
            disabled={photoBusy !== null}
            aria-label="Change cover photo"
            className="absolute left-3 top-3 flex h-8 w-8 items-center justify-center rounded-xl border border-white/[0.12] bg-black/35 text-white backdrop-blur-xl transition-colors hover:bg-black/60 disabled:opacity-50"
          >
            <Camera className="w-3.5 h-3.5" />
          </button>
          <div className="absolute right-3 top-3 flex items-center gap-0.5 rounded-2xl border border-white/[0.12] bg-black/35 p-1 backdrop-blur-xl">
            <button
              type="button"
              onClick={shareProfile}
              aria-label="Share profile"
              className="flex h-8 w-8 items-center justify-center rounded-xl text-white/85 transition-colors hover:bg-white/[0.1] hover:text-white"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onOpenSection('edit-profile')}
              aria-label="Edit profile"
              className="flex h-8 w-8 items-center justify-center rounded-xl text-white/85 transition-colors hover:bg-white/[0.1] hover:text-white"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onOpenSection('settings')}
              aria-label="Open settings"
              className="flex h-8 w-8 items-center justify-center rounded-xl text-white/85 transition-colors hover:bg-white/[0.1] hover:text-white"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
            <span aria-hidden="true" className="mx-1 h-4 w-px bg-white/[0.12]" />
            <button
              type="button"
              onClick={() => setConfirmSignOut(true)}
              aria-label="Sign out"
              className="flex h-8 w-8 items-center justify-center rounded-xl text-white/75 transition-colors hover:bg-rose-500/25 hover:text-rose-100"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="relative px-4 pb-4 sm:px-5">
          <div className="-mt-11">
            <span className="relative inline-flex shrink-0 rounded-full bg-gradient-to-br from-cyan-400 via-violet-500 to-fuchsia-500 p-[2.5px] shadow-[0_22px_48px_-20px_rgba(0,0,0,0.95)]">
              <Avatar
                name={currentUser.displayName}
                color={currentUser.avatarColor}
                src={currentUser.avatarUrl}
                size="xl"
                className="border-[3px] border-[#0A0D16]"
              />
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={photoBusy !== null}
                aria-label="Change profile photo"
                className="absolute -bottom-0.5 -right-0.5 flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#0A0D16] bg-violet-600 text-white transition-colors hover:bg-violet-500 disabled:opacity-50"
              >
                <Camera className="h-3 w-3" />
              </button>
            </span>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5">
            <h1 className="font-display text-[22px] font-bold leading-tight text-white">
              {currentUser.displayName}
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full border border-white/[0.1] bg-white/[0.05] px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.14em] text-slate-200">
              <BadgeCheck className="h-3 w-3 text-fuchsia-300" />
              <span>{roleLabel}</span>
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] text-slate-400">
            <span>@{currentUser.username}</span>
            <span aria-hidden="true" className="text-slate-600">
              ·
            </span>
            <button
              type="button"
              onClick={() => copyText(currentUser.platformId, 'User ID')}
              className="inline-flex items-center gap-1 font-mono text-sky-300 transition-colors hover:text-sky-200"
              aria-label="Copy user ID"
            >
              <span>ID {currentUser.platformId}</span>
              <Copy className="h-2.5 w-2.5" />
            </button>
            <span aria-hidden="true" className="text-slate-600">
              ·
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-2.5 w-2.5 text-slate-500" />
              {currentUser.country}
            </span>
          </div>

          {visibleBio(currentUser.bio) && (
            <p className="mt-2.5 text-[13px] leading-relaxed text-slate-300">
              {visibleBio(currentUser.bio)}
            </p>
          )}

          {isBdAgent ? (
            <button
              type="button"
              onClick={() => onOpenSection('coins-trading')}
              className="mt-4 flex w-full items-center justify-between gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.025] px-3.5 py-3 text-left transition-colors hover:border-white/[0.14] hover:bg-white/[0.045]"
            >
              <span className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-400/[0.12] ring-1 ring-amber-300/20">
                  <Coins className="h-4 w-4 text-amber-300" />
                </span>
                <span>
                  <span className="block text-[9.5px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Coins Trading Balance
                  </span>
                  <span className="mt-0.5 block font-mono text-lg font-black tabular-nums text-amber-300">
                    {tradingCoinBalance.toLocaleString()}
                  </span>
                </span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-500" />
            </button>
          ) : (
            <>
              <div className="mt-4 grid grid-cols-4 divide-x divide-white/[0.06] overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025] text-center">
                <button
                  type="button"
                  onClick={() => setStatsList('followers')}
                  className="group py-2.5 transition-colors hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
                >
                  <p className="font-mono text-[15px] font-bold tabular-nums text-white transition-colors group-hover:text-cyan-200">
                    {(currentUser.followersCount ?? 0).toLocaleString()}
                  </p>
                  <p className="mt-0.5 text-[9px] font-medium uppercase tracking-[0.16em] text-slate-400">
                    Followers
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setStatsList('following')}
                  className="group py-2.5 transition-colors hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
                >
                  <p className="font-mono text-[15px] font-bold tabular-nums text-white transition-colors group-hover:text-cyan-200">
                    {(followingUids?.length ?? 0).toLocaleString()}
                  </p>
                  <p className="mt-0.5 text-[9px] font-medium uppercase tracking-[0.16em] text-slate-400">
                    Following
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setStatsList('friends')}
                  className="group py-2.5 transition-colors hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
                >
                  <p className="font-mono text-[15px] font-bold tabular-nums text-white transition-colors group-hover:text-cyan-200">
                    {(friendsCount ?? 0).toLocaleString()}
                  </p>
                  <p className="mt-0.5 text-[9px] font-medium uppercase tracking-[0.16em] text-slate-400">
                    Friends
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setStatsList('visitors')}
                  className="group py-2.5 transition-colors hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
                >
                  <p className="font-mono text-[15px] font-bold tabular-nums text-white transition-colors group-hover:text-cyan-200">
                    {(currentUser.visitorsCount ?? 0).toLocaleString()}
                  </p>
                  <p className="mt-0.5 text-[9px] font-medium uppercase tracking-[0.16em] text-slate-400">
                    Visitor
                  </p>
                </button>
              </div>

              <button
                type="button"
                onClick={() => onOpenSection('wallet')}
                className="mt-2 w-full overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025] text-left transition-colors hover:border-white/[0.14] hover:bg-white/[0.045]"
              >
                <span className="flex items-center gap-2.5 px-3.5 py-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-400/[0.12] ring-1 ring-amber-300/20">
                    <Coins className="h-4 w-4 text-amber-300" />
                  </span>
                  <span className="min-w-0 flex-1 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Coins
                  </span>
                  <span className="font-mono text-sm font-bold tabular-nums text-amber-200">
                    {coinBalance.toLocaleString()}
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-600" />
                </span>
                <span className="flex items-center gap-2.5 border-t border-white/[0.05] px-3.5 py-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-400/[0.12] ring-1 ring-sky-300/20">
                    <Gem className="h-4 w-4 text-sky-300" />
                  </span>
                  <span className="min-w-0 flex-1 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Diamonds
                  </span>
                  <span className="font-mono text-sm font-bold tabular-nums text-sky-200">
                    {diamondBalance.toLocaleString()}
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-600" />
                </span>
              </button>
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
        <p
          role="status"
          className="flex items-center justify-center gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-500/[0.06] px-4 py-2.5 text-center text-[11px] font-medium text-cyan-100"
        >
          <span
            aria-hidden="true"
            className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-300"
          />
          Uploading {photoBusy === 'avatar' ? 'profile photo' : 'cover photo'}…
        </p>
      )}

      {confirmSignOut &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="signout-title"
            onClick={() => setConfirmSignOut(false)}
          >
            <div
              className="w-full max-w-[300px] overflow-hidden rounded-[24px] border border-white/[0.1] bg-[#0B0E18] p-5 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.95)]"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl border border-rose-400/25 bg-rose-500/[0.1]">
                <LogOut className="h-5 w-5 text-rose-300" />
              </span>
              <h2
                id="signout-title"
                className="mt-3 text-center font-display text-base font-semibold text-white"
              >
                Sign out?
              </h2>
              <p className="mt-1 text-center text-[11.5px] leading-relaxed text-slate-400">
                You can sign back in anytime.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmSignOut(false)}
                  className="h-9 rounded-xl border border-white/[0.1] bg-white/[0.06] text-[11.5px] font-semibold text-slate-200 transition-colors hover:bg-white/[0.12]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmSignOut(false);
                    onSignOut();
                  }}
                  className="h-9 rounded-xl bg-rose-600 text-[11.5px] font-semibold text-white transition-colors hover:bg-rose-500"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Creator & social */}
      {!isBdAgent && (
        <section className="space-y-2.5">
          {renderSectionHeading('Creator & Social')}
          <div className="grid grid-cols-4 gap-2">
            {CREATOR_TILES.filter(
              (t) => t.id !== 'host-rewards' || currentUser.gender === 'Female'
            ).map(renderTile)}
          </div>
        </section>
      )}

      {/* Commerce */}
      {!isBdAgent && (
        <section className="space-y-2.5">
          {renderSectionHeading('Wallet & Store', 'from-amber-300 to-orange-500')}
          <div className="grid grid-cols-4 gap-2">{COMMERCE_TILES.map(renderTile)}</div>
        </section>
      )}

      {/* Agent management */}
      {(isAgentUser || isAdminUser) && (
        <section className="space-y-2.5">
          {renderSectionHeading('Agent Management', 'from-fuchsia-400 to-violet-500')}
          <div className="grid grid-cols-4 gap-2">
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
          className="group flex w-full items-center gap-3 rounded-2xl border border-violet-500/30 bg-gradient-to-r from-violet-600/20 via-[#0B0E18] to-fuchsia-600/10 p-4 transition-colors hover:border-violet-400/60"
        >
          <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-400 via-purple-500 to-fuchsia-600 shadow-lg shadow-violet-500/40 ring-1 ring-white/25">
            <span
              aria-hidden="true"
              className="absolute inset-0 rounded-xl bg-gradient-to-b from-white/30 via-white/0 to-black/15"
            />
            <LayoutDashboard className="relative h-5 w-5 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]" />
          </span>
          <div className="min-w-0 flex-1 text-left">
            <p className="text-sm font-semibold text-white">Admin Panel</p>
            <p className="truncate text-[11px] text-slate-400">
              Users, live rooms, reports, wallets, games & broadcast
            </p>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5" />
        </button>
      )}

      {/* Account */}
      <section className="space-y-2.5">
        {renderSectionHeading('Account', 'from-sky-400 to-indigo-500')}
        <div className="overflow-hidden rounded-[22px] border border-white/[0.07] bg-white/[0.02] divide-y divide-white/[0.05]">
          <button
            type="button"
            onClick={() => onOpenSection('edit-profile')}
            className="group flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left transition-colors hover:bg-white/[0.03]"
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-violet-400/[0.12] ring-1 ring-violet-300/20">
                <Edit3 className="h-4 w-4 text-violet-300" />
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-semibold text-slate-200">Edit Profile</span>
                <span className="block truncate text-[10px] text-slate-400">
                  Name, username, bio, photos and language
                </span>
              </span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-500 transition-transform group-hover:translate-x-0.5" />
          </button>
          <button
            type="button"
            onClick={() => onOpenSection('settings')}
            className="group flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left transition-colors hover:bg-white/[0.03]"
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-sky-400/[0.12] ring-1 ring-sky-300/20">
                <Settings className="h-4 w-4 text-sky-300" />
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-semibold text-slate-200">Settings</span>
                <span className="block truncate text-[10px] text-slate-400">
                  Privacy, notifications, security, help
                </span>
              </span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-500 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </section>

      {/* Blocked accounts */}
      {blockedUsers.length > 0 && (
        <section className="space-y-2.5">
          {renderSectionHeading(`Blocked (${blockedUsers.length})`, 'from-rose-400 to-pink-500')}
          <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02] divide-y divide-white/[0.05]">
            {blockedUsers.map((user) => (
              <div key={user.uid} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                <div className="flex min-w-0 items-center gap-2.5">
                  <Avatar name={user.displayName} color={user.avatarColor} size="xs" />
                  <span className="truncate text-xs text-slate-200">
                    {user.displayName} (@{user.username})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onUnblockUser(user.uid)}
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-white/[0.08] px-2.5 py-1 text-[11px] font-medium text-white hover:bg-white/[0.15]"
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
              className="flex w-full flex-col overflow-hidden rounded-t-[26px] border border-white/[0.1] bg-[#0B0E18] shadow-[0_-20px_60px_-20px_rgba(0,0,0,0.9)] sm:max-h-[80vh] sm:max-w-md sm:rounded-[26px]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex shrink-0 items-center justify-between border-b border-white/[0.07] px-5 py-4">
                <div>
                  <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.22em] text-cyan-300/80">
                    Connections
                  </p>
                  <h2 id="stats-list-title" className="mt-0.5 font-display text-base font-semibold text-white">
                    {statsListTitle}
                  </h2>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    {statsListUsers.length} {statsListUsers.length === 1 ? 'person' : 'people'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setStatsList(null)}
                  aria-label={`Close ${statsListTitle}`}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-300 transition-colors hover:bg-white/[0.10] hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="divide-y divide-white/[0.05] overflow-y-auto">
                {statsListUsers.length === 0 ? (
                  <div className="space-y-2 px-5 py-12 text-center">
                    <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03]">
                      <Users className="h-5 w-5 text-slate-500" aria-hidden="true" />
                    </span>
                    <p className="text-sm font-medium text-slate-200">No {statsListTitle.toLowerCase()} yet</p>
                    <p className="mx-auto max-w-[240px] text-[11px] leading-relaxed text-slate-500">
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
                        className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/[0.03]"
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
