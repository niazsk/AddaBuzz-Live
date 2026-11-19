import React, { useRef, useState } from 'react';
import {
  BadgeCheck,
  Banknote,
  Camera,
  Check,
  ChevronRight,
  Coins,
  CreditCard,
  Edit3,
  Gamepad2,
  Gift,
  Heart,
  LogIn,
  LogOut,
  MapPin,
  Mic,
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
import { AppSection, GenderOption, UserProfile } from '../../types/app';
import { Avatar } from '../ui/Avatar';
import { ProfileImageKind, uploadProfileImage } from '../../lib/profileImages';
import { isBdAgentProfile } from '../../lib/firestoreService';
import { COUNTRIES } from '../../data/countries';

interface ProfileViewProps {
  currentUser: UserProfile | null;
  allUsers: UserProfile[];
  followingUids: string[];
  blockedUids: string[];
  isAdminUser: boolean;
  friendsCount: number;
  coinBalance: number;
  diamondBalance: number;
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
  onOpenSection: (section: AppSection) => void;
  onOpenAuth: () => void;
  onSignOut: () => void;
}

type Tile = {
  id: string;
  label: string;
  icon: React.FC<{ className?: string }>;
  wide?: boolean;
};

const FEATURE_TILES: Tile[] = [
  { id: 'reward', label: 'Reward', icon: Gift },
  { id: 'rank', label: 'Rank', icon: Trophy },
  { id: 'games', label: 'Games', icon: Gamepad2 },
  { id: 'store', label: 'Store', icon: ShoppingBag },
  { id: 'invite', label: 'Invite', icon: Users },
  { id: 'honor', label: 'Honor Level', icon: ShieldCheck },
  { id: 'deposit', label: 'Deposit', icon: CreditCard },
  { id: 'salary', label: 'Salary', icon: Banknote },
];

const AGENT_TILES: Tile[] = [
  { id: 'agent', label: 'Agent', icon: Users },
  { id: 'add-host', label: 'Add Host', icon: Mic },
  { id: 'invite-agent', label: 'Invite Agent', icon: UserPlus },
  { id: 'coins-trading', label: 'Coins Trading', icon: Coins },
  { id: 'agent-rewards', label: 'Agent Promote', icon: Wallet, wide: true },
  { id: 'agent-ranking', label: 'Agent Ranking', icon: TrendingUp, wide: true },
];

const BD_AGENT_TILES: Tile[] = [
  { id: 'super-agent-list', label: 'Super Agent List', icon: BadgeCheck },
  { id: 'agent-list', label: 'Agent List', icon: Users },
  { id: 'agent-promote', label: 'Agent Promote', icon: TrendingUp },
  { id: 'coins-trading', label: 'Coins Trading', icon: Coins },
  { id: 'agent-rewards', label: 'Agent Promote', icon: Wallet, wide: true },
  { id: 'agent-ranking', label: 'Agent Ranking', icon: TrendingUp, wide: true },
];

export const ProfileView: React.FC<ProfileViewProps> = ({
  currentUser,
  allUsers,
  followingUids,
  blockedUids,
  isAdminUser,
  friendsCount,
  coinBalance,
  diamondBalance,
  onUpdateProfile,
  onUnblockUser,
  onOpenSection,
  onOpenAuth,
  onSignOut,
}) => {
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(currentUser?.displayName ?? '');
  const [bio, setBio] = useState(currentUser?.bio ?? '');
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
        const url = await uploadProfileImage(currentUser.uid, kind, file);
        await onUpdateProfile({
          displayName: currentUser.displayName,
          bio: currentUser.bio,
          country: currentUser.country,
          gender: currentUser.gender,
          showPresence: currentUser.showPresence,
          ...(kind === 'avatar' ? { avatarUrl: url } : { coverUrl: url }),
        });
        setPhotoMsg(kind === 'avatar' ? 'Profile photo updated.' : 'Wall photo updated.');
      } catch (err) {
        setPhotoMsg(err instanceof Error ? err.message : 'Photo upload failed.');
      } finally {
        setPhotoBusy(null);
      }
    };

  const renderTile = (tile: Tile) => {
    const Icon = tile.icon;
    return (
      <button
        key={tile.id}
        type="button"
        onClick={() => {
          if (tile.id === 'coins-trading') onOpenSection('coins-trading');
          else if (tile.id === 'games') onOpenSection('games');
          else if (tile.id === 'super-agent-list') onOpenSection('super-agent-list');
          else if (tile.id === 'agent-list') onOpenSection('agent-list');
          else if (tile.id === 'agent-rewards') onOpenSection('admin');
          else if (tile.id === 'agent-promote') onOpenSection('agent-promote');
          else if (tile.id === 'rank') onOpenSection('rank');
          else if (tile.id === 'agent-ranking') onOpenSection('agent-ranking');
          else if (tile.id === 'invite') onOpenSection('invite');
          else if (tile.id === 'invite-agent') onOpenSection('invite-agent');
          else if (tile.id === 'deposit') onOpenSection('deposit');
          else if (tile.id === 'salary') onOpenSection('salary');
          else setComingSoon(tile.label);
        }}
        className={`group rounded-2xl bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] hover:border-violet-500/40 p-3.5 flex flex-col items-center gap-2 transition-colors ${
          tile.wide ? 'col-span-2' : ''
        }`}
      >
        <span className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-600/80 to-fuchsia-600/60 flex items-center justify-center shadow-md shadow-violet-950/40 group-hover:scale-105 transition-transform">
          <Icon className="w-5 h-5 text-white" />
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
            background: currentUser.coverUrl
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

          {currentUser.bio && (
            <p className="text-sm text-slate-300 mt-3 leading-relaxed">{currentUser.bio}</p>
          )}

          {!isBdAgent && (
            <>
          <div className="mt-5 grid grid-cols-4 divide-x divide-white/[0.07] rounded-2xl bg-white/[0.04] border border-white/[0.06] py-3 text-center">
            <div>
              <p className="font-mono text-lg font-bold text-white tabular-nums">
                {currentUser.followersCount.toLocaleString()}
              </p>
              <p className="text-[11px] text-slate-400">Followers</p>
            </div>
            <div>
              <p className="font-mono text-lg font-bold text-white tabular-nums">
                {followingUids.length.toLocaleString()}
              </p>
              <p className="text-[11px] text-slate-400">Following</p>
            </div>
            <div>
              <p className="font-mono text-lg font-bold text-white tabular-nums">
                {friendsCount.toLocaleString()}
              </p>
              <p className="text-[11px] text-slate-400">Friends</p>
            </div>
            <div>
              <p className="font-mono text-lg font-bold text-white tabular-nums">
                {currentUser.visitorsCount.toLocaleString()}
              </p>
              <p className="text-[11px] text-slate-400">Visitor</p>
            </div>
          </div>

          <div className="mt-2.5 grid grid-cols-2 divide-x divide-white/[0.07] rounded-2xl bg-white/[0.04] border border-white/[0.06] py-3 text-center">
            <div>
              <p className="font-mono text-lg font-bold text-amber-300 tabular-nums">
                {coinBalance.toLocaleString()}
              </p>
              <p className="text-[11px] text-slate-400">Coins</p>
            </div>
            <div>
              <p className="font-mono text-lg font-bold text-sky-300 tabular-nums">
                {diamondBalance.toLocaleString()}
              </p>
              <p className="text-[11px] text-slate-400">Diamonds</p>
            </div>
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
          <div className="grid grid-cols-4 gap-2.5">{FEATURE_TILES.map(renderTile)}</div>
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
            {(isBdAgent ? BD_AGENT_TILES : AGENT_TILES)
              .filter((tile) => isAdminUser || tile.id !== 'agent-rewards')
              .map(renderTile)}
          </div>
        </section>
      )}

      {/* Roles & safety shortcut — admin accounts only */}
      {isAdminUser && (
        <button
          type="button"
          onClick={() => onOpenSection('admin')}
          className="w-full rounded-2xl bg-gradient-to-r from-violet-500/15 to-[#111420] border border-violet-500/25 hover:border-violet-400/50 p-4 flex items-center justify-between gap-3 transition-colors"
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-violet-300" />
            </span>
            <div className="text-left min-w-0">
              <p className="text-sm font-semibold text-white">Roles & Safety</p>
              <p className="text-xs text-slate-400 truncate">Promotions & moderation</p>
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