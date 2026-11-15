import React, { useState } from 'react';
import {
  Edit3,
  ShieldCheck,
  UserX,
  Wallet,
  Check,
  LogIn,
  LogOut,
} from 'lucide-react';
import { AppSection, GenderOption, UserProfile } from '../../types/app';
import { Avatar } from '../ui/Avatar';

interface ProfileViewProps {
  currentUser: UserProfile | null;
  allUsers: UserProfile[];
  followingUids: string[];
  blockedUids: string[];
  coinBalance: number;
  diamondBalance: number;
  onUpdateProfile: (updates: {
    displayName: string;
    bio: string;
    country: string;
    gender: GenderOption;
    showPresence: boolean;
  }) => Promise<void>;
  onUnblockUser: (uid: string) => void;
  onOpenSection: (section: AppSection) => void;
  onOpenAuth: () => void;
  onSignOut: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  currentUser,
  allUsers,
  followingUids,
  blockedUids,
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

  if (!currentUser) {
    return (
      <div className="space-y-6 pb-8">
        <div className="rounded-2xl bg-[#111420] border border-white/[0.08] p-8 sm:p-10 text-center space-y-4">
          <h1 className="font-display text-2xl font-bold text-white">
            Sign in to your AddaBuzz Live profile
          </h1>
          <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
            Sign in with Email & Password or Google to reserve your unique username, manage your Coins & Diamonds wallet, follow creators, and host live rooms.
          </p>
          <button
            type="button"
            onClick={onOpenAuth}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white text-sm font-semibold inline-flex items-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            <span>Open Sign-In Page</span>
          </button>
        </div>
      </div>
    );
  }

  const blockedUsers = allUsers.filter((u) => blockedUids.includes(u.uid));

  const featureTiles = [
    { id: 'reward', label: 'Reward', icon: '🎁' },
    { id: 'rank', label: 'Rank', icon: '🏆' },
    { id: 'games', label: 'Games', icon: '🎲' },
    { id: 'store', label: 'Store', icon: '🛍️' },
    { id: 'invite', label: 'Invite', icon: '👥' },
    { id: 'honor', label: 'Honor Level', icon: '🛡️' },
    { id: 'fanclub', label: 'Fan Club', icon: '💖' },
    { id: 'medal', label: 'Medal Wall', icon: '🎖️' },
  ];

  const agentTiles = [
    { id: 'agent', label: 'Agent', icon: '👥' },
    { id: 'add-host', label: 'Add Host', icon: '🎤' },
    { id: 'invite-agent', label: 'Invite Agent', icon: '➕' },
    { id: 'coins-trading', label: 'Coins Trading', icon: '🪙' },
    { id: 'agent-rewards', label: 'Agent Rewards', icon: '💰', wide: true },
    { id: 'agent-ranking', label: 'Agent Ranking', icon: '📈', wide: true },
  ];

  const isAgentUser =
    currentUser.accountType === 'AGENT' ||
    currentUser.accountType === 'SUPER_AGENT';

  const renderTile = (tile: { id: string; label: string; icon: string; wide?: boolean }) => (
    <button
      key={tile.id}
      type="button"
      onClick={() => setComingSoon(tile.label)}
      className={`rounded-2xl bg-[#111420] border border-white/[0.08] hover:border-violet-500/40 p-4 flex flex-col items-center gap-2.5 transition-colors ${
        tile.wide ? 'sm:col-span-2' : ''
      }`}
    >
      <span className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600/70 to-fuchsia-600/50 flex items-center justify-center text-2xl">
        {tile.icon}
      </span>
      <span className="text-xs font-medium text-slate-200 text-center leading-tight">
        {tile.label}
      </span>
    </button>
  );

  const startEditing = () => {
    setDisplayName(currentUser.displayName);
    setBio(currentUser.bio);
    setCountry(currentUser.country);
    setGender(currentUser.gender);
    setShowPresence(currentUser.showPresence);
    setEditing((v) => !v);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await onUpdateProfile({
      displayName: displayName.trim() || currentUser.displayName,
      bio: bio.trim(),
      country: country.trim() || currentUser.country,
      gender,
      showPresence,
    });
    setEditing(false);
  };

  return (
    <div className="space-y-8 pb-8">
      {/* Profile Cover & Identity */}
      <div className="rounded-2xl bg-[#111420] border border-white/[0.08] overflow-hidden">
        <div
          className="h-32 sm:h-40 w-full relative"
          style={{ background: currentUser.coverGradient }}
        />

        <div className="px-5 sm:px-7 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-10 relative z-10">
            <div className="flex items-end gap-4">
              <Avatar
                name={currentUser.displayName}
                color={currentUser.avatarColor}
                size="xl"
                className="ring-4 ring-[#111420]"
              />
              <div className="pb-1">
                <h1 className="font-display text-xl sm:text-2xl font-bold text-white">
                  {currentUser.displayName}
                </h1>
                <p className="text-xs sm:text-sm text-slate-400">
                  @{currentUser.username} ·{' '}
                  <span className="font-mono text-sky-300">{currentUser.platformId}</span> ·{' '}
                  {currentUser.accountType === 'SUPER_AGENT'
                    ? 'Super Agent ID'
                    : currentUser.accountType === 'AGENT'
                    ? 'Agent ID'
                    : 'User ID'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={startEditing}
                className="px-4 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-xs font-medium text-white inline-flex items-center gap-1.5 transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{editing ? 'Cancel Edit' : 'Edit Profile'}</span>
              </button>
              <button
                type="button"
                onClick={onSignOut}
                className="px-4 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 text-xs font-medium text-rose-200 inline-flex items-center gap-1.5 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>

          <p className="text-sm text-slate-300 mt-5 max-w-2xl leading-relaxed">
            {currentUser.bio}
          </p>

          <div className="mt-5 pt-4 border-t border-white/[0.07] flex flex-wrap items-center gap-6 text-xs text-slate-400">
            <span>
              <strong className="font-mono text-sm text-white tabular-nums">
                {currentUser.followersCount.toLocaleString()}
              </strong>{' '}
              Followers
            </span>
            <span>
              <strong className="font-mono text-sm text-white tabular-nums">
                {followingUids.length}
              </strong>{' '}
              Following
            </span>
            <span>Country: {currentUser.country}</span>
            <span>Presence: {currentUser.showPresence ? 'Visible' : 'Hidden'}</span>
          </div>
        </div>
      </div>

      {/* Edit Profile Form */}
      {editing && (
        <form
          onSubmit={handleSave}
          className="rounded-2xl bg-[#111420] border border-violet-500/30 p-6 space-y-4"
        >
          <h2 className="font-display text-base font-semibold text-white">Edit Profile</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-slate-300">Display Name</span>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full h-10 px-3.5 rounded-xl bg-[#090B12] border border-white/[0.09] text-sm text-white focus:border-sky-500/60 focus:outline-none"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-slate-300">Country</span>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full h-10 px-3.5 rounded-xl bg-[#090B12] border border-white/[0.09] text-sm text-white focus:border-sky-500/60 focus:outline-none"
              />
            </label>
          </div>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-slate-300">Bio</span>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full p-3.5 rounded-xl bg-[#090B12] border border-white/[0.09] text-sm text-white focus:border-sky-500/60 focus:outline-none"
            />
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-slate-300">Gender</span>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as GenderOption)}
                className="w-full h-10 px-3.5 rounded-xl bg-[#090B12] border border-white/[0.09] text-sm text-white focus:border-sky-500/60 focus:outline-none"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </label>

            <label className="flex items-center gap-2.5 pt-5 cursor-pointer">
              <input
                type="checkbox"
                checked={showPresence}
                onChange={(e) => setShowPresence(e.target.checked)}
                className="w-4 h-4 accent-violet-600 rounded"
              />
              <span className="text-xs text-slate-300">
                Show online / last-active status to friends
              </span>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="px-4 py-2 rounded-xl bg-white/[0.08] text-xs font-medium text-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-semibold text-white inline-flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save to Firestore</span>
            </button>
          </div>
        </form>
      )}

      {/* Mobile-reachable shortcuts for Wallet & Roles/Safety */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => onOpenSection('wallet')}
          className="rounded-2xl bg-[#111420] border border-white/[0.08] hover:border-white/20 p-5 text-left flex items-center justify-between gap-4 transition-colors"
        >
          <div className="space-y-1">
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-white">
              <Wallet className="w-4 h-4 text-sky-400" />
              <span>Coins & Diamonds Wallet</span>
            </span>
            <p className="text-xs text-slate-400 font-mono tabular-nums">
              {coinBalance.toLocaleString()} Coins · {diamondBalance.toLocaleString()} Diamonds
            </p>
          </div>
          <span className="text-xs text-sky-400 font-medium">View Ledger</span>
        </button>

        <button
          type="button"
          onClick={() => onOpenSection('admin')}
          className="rounded-2xl bg-[#111420] border border-white/[0.08] hover:border-white/20 p-5 text-left flex items-center justify-between gap-4 transition-colors"
        >
          <div className="space-y-1">
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-white">
              <ShieldCheck className="w-4 h-4 text-violet-400" />
              <span>Account Roles & Moderation</span>
            </span>
            <p className="text-xs text-slate-400">
              User / Agent / Super Agent hierarchy & safety queue
            </p>
          </div>
          <span className="text-xs text-sky-400 font-medium">Open</span>
        </button>
      </div>

      {/* Feature shortcuts */}
      <section className="space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {featureTiles.map(renderTile)}
        </div>
        {comingSoon && (
          <p className="rounded-xl bg-violet-500/10 border border-violet-500/30 px-4 py-2.5 text-xs text-violet-200">
            {comingSoon} — coming soon.
          </p>
        )}
      </section>

      {/* Agent Management */}
      {isAgentUser && (
        <section className="space-y-3">
          <h2 className="font-display text-lg font-bold text-white">
            Agent Management
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {agentTiles.map(renderTile)}
          </div>
        </section>
      )}

      {/* Blocked Users */}
      <section className="rounded-2xl bg-[#111420] border border-white/[0.08] p-5 space-y-3">
        <h2 className="font-display text-sm font-semibold text-white">
          Blocked Accounts ({blockedUsers.length})
        </h2>
        {blockedUsers.length === 0 ? (
          <p className="text-xs text-slate-400">
            You have not blocked any accounts.
          </p>
        ) : (
          <div className="space-y-2">
            {blockedUsers.map((user) => (
              <div
                key={user.uid}
                className="flex items-center justify-between gap-3 py-1.5"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Avatar name={user.displayName} color={user.avatarColor} size="xs" />
                  <span className="text-xs text-slate-200 truncate">
                    {user.displayName} (@{user.username})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onUnblockUser(user.uid)}
                  className="px-2.5 py-1 rounded-lg bg-white/[0.08] hover:bg-white/[0.15] text-xs text-white inline-flex items-center gap-1"
                >
                  <UserX className="w-3 h-3" />
                  <span>Unblock</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
