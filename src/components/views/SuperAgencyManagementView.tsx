import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Users,
  Mic,
  Gift,
  Coins,
  Calendar,
  History,
  TrendingUp,
  UserPlus,
  Search,
  Sparkles,
  Award,
  ChevronRight,
  Clock,
} from 'lucide-react';
import { UserProfile, AgencyMemberRecord, AgencyCommissionStoryRecord } from '../../types/app';
import { Avatar } from '../ui/Avatar';
import {
  addAgencyMemberDoc,
  subscribeAgencyMembers,
  subscribeAgencyCommissionStories,
  fetchAgencyRewardShareStatus,
  settleAgencyDailyRewardShares,
  subscribeAgencyRewardSharePayouts,
  type AgencyRewardSharePayout,
  type AgencyRewardShareStatus,
  type AgencyShareRole,
} from '../../lib/firestoreService';

interface SuperAgencyManagementViewProps {
  type: 'AGENT' | 'HOST';
  currentUser: UserProfile | null;
  users: UserProfile[];
  onOpenUserProfile: (user: UserProfile) => void;
  onBack: () => void;
  isOffline: boolean;
  onShowToast: (title: string, body?: string, kind?: 'info' | 'success' | 'error') => void;
}

export const SuperAgencyManagementView: React.FC<SuperAgencyManagementViewProps> = ({
  type,
  currentUser,
  users,
  onOpenUserProfile,
  onBack,
  isOffline,
  onShowToast,
}) => {
  const isAgentMode = type === 'AGENT';
  const commissionPercent = isAgentMode ? 5 : 10;
  const title = isAgentMode ? 'My Agent' : 'My Host';
  const icon = isAgentMode ? Users : Mic;
  const HeaderIcon = icon;

  const [activeTab, setActiveTab] = useState<'MEMBERS' | 'STORY'>('MEMBERS');
  const [members, setMembers] = useState<AgencyMemberRecord[]>([]);
  const [stories, setStories] = useState<AgencyCommissionStoryRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Add Member State
  const [targetPlatformId, setTargetPlatformId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 15-day deposit qualified reward sharing
  const shareRole: AgencyShareRole | null =
    currentUser?.accountType === 'SUPER_AGENT'
      ? 'SUPER_AGENT'
      : currentUser?.accountType === 'AGENT'
        ? 'AGENT'
        : null;
  const [shareStatus, setShareStatus] = useState<AgencyRewardShareStatus | null>(null);
  const [sharePayouts, setSharePayouts] = useState<AgencyRewardSharePayout[]>([]);
  const [isSettling, setIsSettling] = useState(false);
  const [lastSettlement, setLastSettlement] = useState<{
    coins: number;
    diamonds: number;
  } | null>(null);

  useEffect(() => {
    if (!currentUser?.uid || !shareRole) {
      setShareStatus(null);
      setSharePayouts([]);
      return;
    }
    let cancelled = false;
    fetchAgencyRewardShareStatus(currentUser)
      .then((status) => {
        if (!cancelled) setShareStatus(status);
      })
      .catch(() => {});
    const unsubPayouts = subscribeAgencyRewardSharePayouts(currentUser.uid, (list) => {
      if (!cancelled) setSharePayouts(list);
    });
    return () => {
      cancelled = true;
      unsubPayouts();
    };
  }, [currentUser?.uid, currentUser?.accountType, shareRole]);

  const handleSettleShares = async () => {
    if (!currentUser || isSettling || isOffline) return;
    setIsSettling(true);
    try {
      const result = await settleAgencyDailyRewardShares(currentUser);
      if (result.payoutCount > 0) {
        setLastSettlement({ coins: result.paidCoins, diamonds: result.paidDiamonds });
        onShowToast(
          'Reward Shares Settled',
          `${result.payoutCount} payout(s): +${result.paidCoins.toLocaleString()} coins, +${result.paidDiamonds.toLocaleString()} diamonds.`,
          'success'
        );
      } else {
        onShowToast(
          'Nothing to Settle',
          'No completed day had member daily rewards inside an active 15-day deposit window.',
          'info'
        );
      }
      const status = await fetchAgencyRewardShareStatus(currentUser);
      setShareStatus(status);
    } catch (err) {
      onShowToast(
        'Settlement Failed',
        err instanceof Error ? err.message : 'Could not settle reward shares.',
        'error'
      );
    } finally {
      setIsSettling(false);
    }
  };

  const windowDate = (ms: number) =>
    ms
      ? new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      : '—';

  // Subscribe to real-time members and stories
  useEffect(() => {
    if (!currentUser?.uid) return;
    const unsubMembers = subscribeAgencyMembers(currentUser.uid, type, (data) => {
      setMembers(data);
    });
    const unsubStories = subscribeAgencyCommissionStories(currentUser.uid, type, (data) => {
      setStories(data);
    });

    return () => {
      unsubMembers();
      unsubStories();
    };
  }, [currentUser?.uid, type]);

  // Total calculated earnings from story
  const totalCommissionDiamonds = stories.reduce((sum, s) => sum + s.commissionAmount, 0);

  // Filter members by query
  const filteredMembers = members.filter((m) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      m.memberDisplayName.toLowerCase().includes(q) ||
      m.memberUsername.toLowerCase().includes(q) ||
      m.memberPlatformId.includes(q)
    );
  });

  // Handle Add Agent or Host
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = targetPlatformId.trim();
    if (!id || !currentUser) return;

    const target = users.find((u) => u.platformId === id);
    if (!target) {
      onShowToast('User not found', `No user found with ID ${id}`, 'error');
      return;
    }

    if (target.uid === currentUser.uid) {
      onShowToast('Invalid Action', 'You cannot add yourself.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await addAgencyMemberDoc(currentUser, target, type);
      onShowToast(
        `Added to ${title}!`,
        `@${target.username} is now registered under your agency.`,
        'success'
      );
      setTargetPlatformId('');
    } catch (err: any) {
      onShowToast('Action failed', err?.message || 'Could not add member.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to profile"
            className="w-9 h-9 rounded-xl bg-[#111420] border border-white/[0.08] hover:border-white/20 text-slate-300 hover:text-white flex items-center justify-center shrink-0 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="font-display text-xl font-bold text-white flex items-center gap-2">
              <HeaderIcon className={`w-5 h-5 ${isAgentMode ? 'text-violet-400' : 'text-sky-400'}`} />
              <span>{title}</span>
            </h1>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-white/[0.05] p-1 rounded-xl border border-white/[0.08]">
          <button
            type="button"
            onClick={() => setActiveTab('MEMBERS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'MEMBERS'
                ? 'bg-violet-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {isAgentMode ? 'Agents' : 'Hosts'} ({members.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('STORY')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'STORY'
                ? 'bg-violet-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Story</span>
          </button>
        </div>
      </div>

      {/* Overview Card */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-gradient-to-br from-violet-900/30 to-[#121522] border border-violet-500/20">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Commission Rate
          </span>
          <p className="text-2xl font-black text-violet-400 mt-1">{commissionPercent}%</p>
          <p className="text-[11px] text-slate-400 mt-0.5">From all received gifts</p>
        </div>
        <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-900/30 to-[#121522] border border-amber-500/20">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            30 Days Story Profit
          </span>
          <p className="text-2xl font-black text-amber-400 mt-1">
            {totalCommissionDiamonds.toLocaleString()} 💎
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Automatically credited</p>
        </div>
        <div className="col-span-2 sm:col-span-1 p-4 rounded-2xl bg-[#121522] border border-white/[0.08]">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Active {isAgentMode ? 'Agents' : 'Hosts'}
          </span>
          <p className="text-2xl font-black text-white mt-1">{members.length}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Under your Super Agency</p>
        </div>
      </div>

      {/* 15-Day Deposit Reward Sharing */}
      {shareRole && shareStatus && (
        <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-900/25 to-[#121522] border border-emerald-500/20 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <h2 className="text-xs font-semibold text-white">Daily Reward Sharing (10%)</h2>
            </div>
            <button
              type="button"
              onClick={handleSettleShares}
              disabled={isSettling || isOffline || !shareStatus.qualifies}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-[11px] font-semibold text-white transition-colors"
            >
              {isSettling ? 'Settling…' : 'Settle Now'}
            </button>
          </div>

          {shareStatus.qualifies ? (
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px] text-slate-300">
              <span>
                Status: <span className="font-semibold text-emerald-400">Active</span>
              </span>
              <span>
                Validity: <span className="font-semibold text-white">{shareStatus.daysRemaining} day(s) left</span>
              </span>
              <span>
                Window: {windowDate(shareStatus.windowStartMs)} → {windowDate(shareStatus.windowEndMs)}
              </span>
              <span>
                Threshold: {shareStatus.threshold.toLocaleString()} coins
              </span>
            </div>
          ) : (
            <p className="text-[11px] text-slate-400">
              Deposit {shareStatus.threshold.toLocaleString()} coins for 15 days to earn 10% of
              your {shareRole === 'SUPER_AGENT' ? "Agents' and Hosts'" : "Hosts'"} daily rewards.
              Sharing stops when the 15-day validity window expires.
            </p>
          )}

          {lastSettlement && (
            <p className="text-[11px] text-emerald-300">
              Last settle: +{lastSettlement.coins.toLocaleString()} coins, +
              {lastSettlement.diamonds.toLocaleString()} diamonds
            </p>
          )}

          {sharePayouts.length > 0 && (
            <div className="space-y-1.5 pt-1 border-t border-white/[0.06]">
              <p className="text-[10px] uppercase tracking-wider text-slate-500">Recent Shares</p>
              {sharePayouts.slice(0, 5).map((p) => (
                <div
                  key={p.shareId}
                  className="flex items-center justify-between gap-2 text-[11px]"
                >
                  <span className="text-slate-300 truncate">
                    @{p.sourceUsername} · {p.sourceRole} · {p.day} · 10% of{' '}
                    {(p.baseCoin + p.baseDiamond).toLocaleString()}
                  </span>
                  <span className="font-mono font-semibold text-emerald-400 shrink-0">
                    {p.shareCoin > 0 ? `+${p.shareCoin.toLocaleString()} 💰` : ''}
                    {p.shareCoin > 0 && p.shareDiamond > 0 ? ' ' : ''}
                    {p.shareDiamond > 0 ? `+${p.shareDiamond.toLocaleString()} 💎` : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'MEMBERS' ? (
        <>
          {/* Add Member Box */}
          <form
            onSubmit={handleAddMember}
            className="p-4 rounded-2xl bg-[#111420] border border-white/[0.08] space-y-3"
          >
            <div className="flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-violet-400" />
              <h2 className="text-xs font-semibold text-white">
                Add New {isAgentMode ? 'Agent' : 'Host'}
              </h2>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={targetPlatformId}
                onChange={(e) => setTargetPlatformId(e.target.value)}
                placeholder={`Enter user Platform ID (e.g. 112201)`}
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500"
              />
              <button
                type="submit"
                disabled={isSubmitting || !targetPlatformId.trim() || isOffline}
                className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-xs font-semibold text-white transition-colors flex items-center gap-1.5 shrink-0"
              >
                {isSubmitting ? 'Adding...' : `Add ${isAgentMode ? 'Agent' : 'Host'}`}
              </button>
            </div>
          </form>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search in ${title.toLowerCase()}...`}
              className="w-full h-10 pl-10 pr-4 rounded-xl bg-[#111420] border border-white/[0.08] text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
            />
          </div>

          {/* Members List */}
          <div className="space-y-2">
            {filteredMembers.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-[#111420] border border-white/[0.06] space-y-2">
                <HeaderIcon className="w-8 h-8 text-slate-500 mx-auto" />
                <p className="text-xs text-slate-400">
                  {members.length === 0
                    ? `No ${isAgentMode ? 'agents' : 'hosts'} registered yet under your agency.`
                    : 'No matching results found.'}
                </p>
              </div>
            ) : (
              filteredMembers.map((m) => {
                const userObj = users.find((u) => u.uid === m.memberUid);
                return (
                  <div
                    key={m.id}
                    className="p-3.5 rounded-2xl bg-[#111420] border border-white/[0.06] hover:border-violet-500/30 flex items-center justify-between gap-3 transition-colors"
                  >
                    <div
                      className="flex items-center gap-3 min-w-0 cursor-pointer"
                      onClick={() => userObj && onOpenUserProfile(userObj)}
                    >
                      <Avatar
                        name={m.memberDisplayName || m.memberUsername}
                        avatarUrl={userObj?.avatarUrl}
                        color={userObj?.avatarColor}
                        size="md"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-white truncate">
                            {m.memberDisplayName}
                          </p>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300">
                            ID: {m.memberPlatformId}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 truncate">@{m.memberUsername}</p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full">
                        <Gift className="w-3 h-3" />
                        <span>{commissionPercent}% Comm.</span>
                      </span>
                      <p className="text-[10px] text-slate-500 mt-1">Joined: {m.createdAtLabel}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      ) : (
        /* 30-Day Story / History */
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-semibold text-white">30 Days Story Record</h2>
            </div>
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Last 30 Days Only
            </span>
          </div>

          {stories.length === 0 ? (
            <div className="p-10 text-center rounded-2xl bg-[#111420] border border-white/[0.06] space-y-2">
              <History className="w-8 h-8 text-slate-500 mx-auto" />
              <p className="text-xs text-slate-400">
                No gift commission story recorded in the last 30 days.
              </p>
              <p className="text-[11px] text-slate-500">
                When your {isAgentMode ? 'agents' : 'hosts'} receive gifts in live streams, your {commissionPercent}% commission will be recorded here automatically!
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {stories.map((story) => (
                <div
                  key={story.id}
                  className="p-3.5 rounded-2xl bg-[#111420] border border-white/[0.06] flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center shrink-0 text-amber-400">
                      <Gift className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white truncate">
                        {story.memberDisplayName} <span className="text-slate-400 font-normal">received</span> {story.giftName}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Gift Price: {story.giftPrice.toLocaleString()} • Comm: {commissionPercent}%
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold text-amber-400">
                      +{story.commissionAmount.toLocaleString()} 💎
                    </span>
                    <p className="text-[10px] text-slate-500 mt-0.5">{story.timestampLabel}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
