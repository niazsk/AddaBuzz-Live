import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  BadgeCheck,
  Camera,
  Check,
  ChevronRight,
  Coins,
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
  Mic,
  Send,
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
import { AppSection, GenderOption, UserProfile } from '../../types/app';
import { Avatar } from '../ui/Avatar';
import { ProfileImageKind, compressProfileImage } from '../../lib/profileImages';
import { fetchCoverImage, isBdAgentProfile, saveCoverImage } from '../../lib/firestoreService';
import { visibleBio } from '../../lib/profileBio';
import { COUNTRIES } from '../../data/countries';

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
    gender: GenderOption;
    showPresence: boolean;
    avatarUrl?: string;
    coverUrl?: string;
  }) => Promise<void>;
  onUnblockUser: (uid: string) => void;
  onOpenUserProfile?: (user: UserProfile) => void;
  onOpenSection: (section: AppSection) => void;
  onOpenAuth: () => void;
  onSignOut: () => void;
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
  wide?: boolean;
};

const FEATURE_TILES: Tile[] = [
  { id: 'reward', label: 'Reward', icon: Gift, tone: 'amber' },
  { id: 'host-rewards', label: 'Host Reward', icon: Crown, tone: 'rose' },
  { id: 'rank', label: 'Rank', icon: Trophy, tone: 'gold' },
  { id: 'games', label: 'Games', icon: Gamepad2, tone: 'emerald' },
  { id: 'store', label: 'Store', icon: ShoppingBag, tone: 'sky' },
  { id: 'invite', label: 'Invite', icon: Send, tone: 'indigo' },
  { id: 'honor', label: 'Honor Level', icon: ShieldCheck, tone: 'violet' },
  { id: 'deposit', label: 'Deposit', icon: CreditCard, tone: 'cyan' },
  { id: 'salary', label: 'Salary', icon: Gem, tone: 'fuchsia' },
];

const AGENT_TILES: Tile[] = [
  { id: 'agent-list', label: 'Agent List', icon: Users, tone: 'indigo' },
  { id: 'my-host', label: 'My Host', icon: Mic, tone: 'rose' },
  { id: 'invite-agent', label: 'Invite Agent', icon: UserPlus, tone: 'violet' },
  { id: 'coins-trading', label: 'Coins Trading', icon: Coins, tone: 'amber' },
  { id: 'agent-ranking', label: 'Agent Ranking', icon: TrendingUp, tone: 'emerald' },
];

const SUPER_AGENT_TILES: Tile[] = [
  { id: 'my-agent', label: 'My Agent', icon: Users, tone: 'indigo' },
  { id: 'my-host', label: 'My Host', icon: Mic, tone: 'rose' },
  { id: 'invite-agent', label: 'Invite Agent', icon: UserPlus, tone: 'violet' },
  { id: 'coins-trading', label: 'Coins Trading', icon: Coins, tone: 'amber' },
  { id: 'agent-ranking', label: 'Agent Ranking', icon: TrendingUp, tone: 'emerald' },
];

const BD_AGENT_TILES: Tile[] = [
  { id: 'super-agent-list', label: 'Super Agent List', icon: BadgeCheck, tone: 'sky' },
  { id: 'agent-list', label: 'Agent List', icon: Users, tone: 'indigo' },
  { id: 'my-agent', label: 'My Agent', icon: Users, tone: 'violet' },
  { id: 'my-host', label: 'My Host', icon: Mic, tone: 'rose' },
  { id: 'invite-agent', label: 'Invite Agent', icon: UserPlus, tone: 'cyan' },
  { id: 'agent-promote', label: 'Agent Promote', icon: TrendingUp, tone: 'emerald' },
  { id: 'coins-trading', label: 'Coins Trading', icon: Coins, tone: 'amber' },
  { id: 'agent-ranking', label: 'Agent Ranking', icon: TrendingUp, tone: 'emerald' },
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
  onUnblockUser,
  onOpenUserProfile,
  onOpenSection,
  onOpenAuth,
  onSignOut,
}) => {
  const [statsList, setStatsList] = useState<
    'followers' | 'following' | 'friends' | 'visitors' | null
  >(null);
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(currentUser?.displayName ?? '');
  const [bio, setBio] = useState(visibleBio(currentUser?.bio));
  const [country, setCountry] = useState(currentUser?.country ?? 'United States');
  const [gender, setGender] = useState<GenderOption>(
    currentUser?.gender ?? 'Prefer not to say'
  );
  const [showPresence, setShowPresence] = useState(currentUser?.showPresence ?? true);
  const [comingSoon, setComingSoon] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [photoBusy, setPhotoBusy] = useState<ProfileImageKind | null>(null);
  const [photoMsg, setPhotoMsg] = useState<string | null>(null);
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
  const roleLabel = isBdAgent
    ? 'BD Agent'
    : currentUser.accountType === 'SUPER_AGENT'
    ? 'Super Agent'
    : currentUser.accountType === 'AGENT'
    ? 'Agent'
    : 'User';

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
        .filter((u): u is UserProfile => Boolean(u))
    : [];

  const startEditing = () => {
    setDisplayName(currentUser.displayName);
    setBio(currentUser.bio);
    setCountry(currentUser.country);
    setGender(currentUser.gender);
    setShowPresence(currentUser.showPresence);
    setEditing(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onUpdateProfile({
        displayName: displayName.trim() || currentUser.displayName,
        bio: bio.trim(),
        country: country.trim() || currentUser.country,
        gender,
        showPresence,
      });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoPick =
    (kind: ProfileImageKind) => async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;
      setPhotoBusy(kind);
      setPhotoMsg(null);
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
          setPhotoMsg('Profile photo updated.');
        } else {
          await saveCoverImage(currentUser.uid, dataUrl);
          setCoverImage(dataUrl);
          setPhotoMsg('Wall photo updated.');
        }
      } catch (err) {
        setPhotoMsg(err instanceof Error ? err.message : 'Photo upload failed.');
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
        onClick={() => {
          if (tile.id === 'coins-trading') onOpenSection('coins-trading');
          else if (tile.id === 'games') onOpenSection('games');
          else if (tile.id === 'super-agent-list') onOpenSection('super-agent-list');
          else if (tile.id === 'agent-list') onOpenSection('agent-list');
          else if (tile.id === 'my-agent') onOpenSection('my-agent');
          else if (tile.id === 'my-host') onOpenSection('my-host');
          else if (tile.id === 'agent-rewards') onOpenSection('agent-promote');
          else if (tile.id === 'agent-promote') onOpenSection('agent-promote');
          else if (tile.id === 'rank') onOpenSection('rank');
          else if (tile.id === 'agent-ranking') onOpenSection('agent-ranking');
          else if (tile.id === 'invite') onOpenSection('invite');
          else if (tile.id === 'invite-agent') onOpenSection('invite-agent');
          else if (tile.id === 'store') onOpenSection('store');
          else if (tile.id === 'deposit') onOpenSection('deposit');
          else if (tile.id === 'salary') onOpenSection('salary');
          else if (tile.id === 'reward') onOpenSection('reward');
          else if (tile.id === 'host-rewards') onOpenSection('host-rewards');
          else setComingSoon(tile.label);
        }}
        className={`group relative overflow-hidden rounded-2xl bg-white/[0.035] border border-white/[0.07] hover:bg-white/[0.07] hover:border-white/[0.16] p-3.5 flex flex-col items-center gap-2.5 transition-all duration-200 hover:-translate-y-0.5 ${
          tile.wide ? 'col-span-2' : ''
        }`}
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
            aria-label="Change wall photo"
            className="absolute top-3 left-3 w-9 h-9 rounded-full bg-black/40 backdrop-blur-md border border-white/15 hover:bg-black/60 disabled:opacity-50 flex items-center justify-center text-white transition-colors"
          >
            <Camera className="w-4 h-4" />
          </button>
          <div className="absolute top-3 right-3 flex items-center gap-2">
            <button
              type="button"
              onClick={startEditing}
              aria-label="Edit profile"
              className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-md border border-white/15 hover:bg-black/60 flex items-center justify-center text-white transition-colors"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onSignOut}
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
              <span className="font-mono text-sky-300">{currentUser.platformId}</span>
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
            <div className="mt-5 rounded-2xl bg-gradient-to-r from-violet-600/20 via-[#111420] to-fuchsia-600/10 border border-violet-500/25 p-4 text-center cursor-pointer hover:border-violet-500/50 transition-colors" onClick={() => onOpenSection('coins-trading')}>
              <p className="font-mono text-2xl font-black text-amber-300 tabular-nums">
                {(tradingCoinBalance ?? 0).toLocaleString()}
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

          <div className="mt-2.5 grid grid-cols-2 divide-x divide-white/[0.07] rounded-2xl bg-white/[0.04] border border-white/[0.06] py-3 text-center">
            <button type="button" onClick={() => onOpenSection('coins-convert')} className="hover:opacity-80 transition-opacity">
              <p className="font-mono text-base sm:text-lg font-bold text-amber-300 tabular-nums">
                {(coinBalance ?? 0).toLocaleString()}
              </p>
              <p className="text-[11px] text-slate-400">Coins Balance</p>
            </button>
            <button type="button" onClick={() => onOpenSection('salary')} className="hover:opacity-80 transition-opacity">
              <p className="font-mono text-base sm:text-lg font-bold text-sky-300 tabular-nums">
                {(diamondBalance ?? 0).toLocaleString()}
              </p>
              <p className="text-[11px] text-slate-400">Diamonds Balance</p>
            </button>
          </div>
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
      {(photoBusy || photoMsg) && (
        <p className="rounded-xl bg-violet-500/10 border border-violet-500/30 px-4 py-2 text-xs text-violet-200 text-center">
          {photoBusy ? 'Uploading photo…' : photoMsg}
        </p>
      )}

      {/* Feature grid */}
      {!isBdAgent && (
        <section className="rounded-3xl bg-[#111420] border border-white/[0.08] p-4 sm:p-5 space-y-3">
          <div className="grid grid-cols-4 gap-2.5">
            {FEATURE_TILES.filter(
              (t) => t.id !== 'host-rewards' || currentUser?.gender === 'Female'
            ).map(renderTile)}
          </div>
          {comingSoon && (
            <p className="rounded-xl bg-violet-500/10 border border-violet-500/30 px-4 py-2 text-xs text-violet-200 text-center">
              {comingSoon} — coming soon
            </p>
          )}
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
              : currentUser?.accountType === 'SUPER_AGENT'
              ? SUPER_AGENT_TILES
              : AGENT_TILES)
              .map(renderTile)}
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
                statsListUsers.map((user) => (
                  <button
                    key={user.uid}
                    type="button"
                    onClick={() => {
                      setStatsList(null);
                      onOpenUserProfile?.(user);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.04] transition-colors"
                  >
                    <Avatar name={user.displayName} color={user.avatarColor} src={user.avatarUrl} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-white truncate">{user.displayName}</p>
                      <p className="text-xs text-slate-400 truncate">
                        @{user.username} · {user.country}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                  </button>
                ))
              )}
            </div>
          </div>
          </div>,
          document.body
        )}

      {/* Edit profile overlay */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-6">
          <form
            onSubmit={handleSave}
            className="w-full sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-[#111420] border border-white/[0.1] p-5 sm:p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-semibold text-white">Edit Profile</h2>
              <button
                type="button"
                onClick={() => setEditing(false)}
                aria-label="Close"
                className="w-8 h-8 rounded-full bg-white/[0.08] hover:bg-white/[0.15] flex items-center justify-center text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-slate-300">Display Name</span>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full h-10 px-3.5 rounded-xl bg-[#090B12] border border-white/[0.09] text-sm text-white focus:border-violet-500/60 focus:outline-none"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-slate-300">Bio</span>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full p-3.5 rounded-xl bg-[#090B12] border border-white/[0.09] text-sm text-white focus:border-violet-500/60 focus:outline-none"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-slate-300">Country</span>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl bg-[#090B12] border border-white/[0.09] text-sm text-white focus:border-violet-500/60 focus:outline-none"
                >
                  {(COUNTRIES.includes(country) ? COUNTRIES : [country, ...COUNTRIES]).map(
                    (c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    )
                  )}
                </select>
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-slate-300">Gender</span>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as GenderOption)}
                  className="w-full h-10 px-3.5 rounded-xl bg-[#090B12] border border-white/[0.09] text-sm text-white focus:border-violet-500/60 focus:outline-none"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </label>
            </div>

            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={showPresence}
                onChange={(e) => setShowPresence(e.target.checked)}
                className="w-4 h-4 accent-violet-600 rounded"
              />
              <span className="text-xs text-slate-300">Show online status to friends</span>
            </label>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="px-4 py-2 rounded-xl bg-white/[0.08] text-xs font-medium text-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:bg-white/[0.06] disabled:text-slate-500 text-xs font-semibold text-white inline-flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{saving ? 'Saving…' : 'Save Changes'}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};