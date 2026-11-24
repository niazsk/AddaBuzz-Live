import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ShieldCheck,
  LayoutDashboard,
  Users,
  Radio,
  ShieldAlert,
  Gamepad2,
  Megaphone,
  ScrollText,
  X,
  Search,
  Eye,
  Wallet,
  Ban,
  CheckCircle2,
  Trash2,
  Coins,
  Gem,
  Layers,
  Power,
  RefreshCw,
  AlertTriangle,
  UserMinus,
  History,
  Send,
} from 'lucide-react';
import {
  AccountPromotionRecord,
  AdminAuditRecord,
  AdminWalletSnapshot,
  AnnouncementRecord,
  LiveRoom,
  ReportRecord,
  UserProfile,
  WalletTransaction,
} from '../../types/app';
import {
  GfRemoteConfig,
  GF_DEFAULT_CONFIG,
  adminAdjustWallet,
  adminDeleteReport,
  adminDeleteRoom,
  adminDeleteUserCascade,
  adminDemoteToUser,
  adminForceEndRoom,
  adminSetRole,
  adminSetSuspended,
  endAnnouncement,
  isBdAgentProfile,
  publishAnnouncement,
  saveGfConfig,
  subscribeActiveAnnouncement,
  subscribeAdminAudit,
  subscribeAllUsers,
  subscribeAllWallets,
  subscribeGfConfig,
  subscribeWalletTransactions,
} from '../../lib/firestoreService';
import { Avatar } from '../ui/Avatar';

type AdminTab =
  | 'overview'
  | 'users'
  | 'live'
  | 'reports'
  | 'games'
  | 'broadcast'
  | 'audit';

interface AdminPanelViewProps {
  currentUser: UserProfile | null;
  rooms: LiveRoom[];
  reports: ReportRecord[];
  promotions: AccountPromotionRecord[];
  onOpenUserProfile: (user: UserProfile) => void;
  onWatchRoom: (roomId: string) => void;
  onResolveReport: (reportId: string) => Promise<void>;
  onToast: (
    title: string,
    desc?: string,
    tone?: 'info' | 'success' | 'warning' | 'error'
  ) => void;
  onClose: () => void;
  isOffline: boolean;
}

interface ConfirmState {
  title: string;
  body: string;
  confirmLabel: string;
  run: () => Promise<void>;
}

const roleLabel = (u: UserProfile): string =>
  isBdAgentProfile(u)
    ? 'BD AGENT'
    : u.accountType === 'SUPER_AGENT'
    ? 'SUPER AGENT'
    : u.accountType;

const RoleBadge: React.FC<{ user: UserProfile }> = ({ user }) => {
  const label = roleLabel(user);
  const cls =
    label === 'BD AGENT'
      ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
      : label === 'SUPER AGENT'
      ? 'bg-violet-500/15 text-violet-300 border-violet-500/30'
      : label === 'AGENT'
      ? 'bg-sky-500/15 text-sky-300 border-sky-500/30'
      : 'bg-white/[0.06] text-slate-300 border-white/10';
  return (
    <span
      className={`inline-flex px-2 py-0.5 rounded-full border text-[10px] font-bold font-mono whitespace-nowrap ${cls}`}
    >
      {label}
    </span>
  );
};

const StatCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: string;
}> = ({ icon, label, value, accent = 'text-white' }) => (
  <div className="rounded-2xl bg-[#111420] border border-white/[0.08] p-4 space-y-2">
    <div className="flex items-center gap-2 text-xs text-slate-400">
      {icon}
      <span>{label}</span>
    </div>
    <p className={`font-mono text-2xl font-bold tabular-nums ${accent}`}>{value}</p>
  </div>
);

const EmptyState: React.FC<{ text: string }> = ({ text }) => (
  <div className="rounded-2xl bg-[#111420] border border-white/[0.08] p-8 text-center text-xs text-slate-500">
    {text}
  </div>
);

export const AdminPanelView: React.FC<AdminPanelViewProps> = ({
  currentUser,
  rooms,
  reports,
  promotions,
  onOpenUserProfile,
  onWatchRoom,
  onResolveReport,
  onToast,
  onClose,
  isOffline,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [wallets, setWallets] = useState<AdminWalletSnapshot[]>([]);
  const [audit, setAudit] = useState<AdminAuditRecord[]>([]);
  const [gfConfig, setGfConfig] = useState<GfRemoteConfig>(GF_DEFAULT_CONFIG);
  const [announcement, setAnnouncement] = useState<AnnouncementRecord | null>(null);

  const [userSearch, setUserSearch] = useState('');
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [ledgerUid, setLedgerUid] = useState<string | null>(null);
  const [ledgerTxs, setLedgerTxs] = useState<WalletTransaction[]>([]);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [busy, setBusy] = useState(false);

  const [walletCurrency, setWalletCurrency] = useState<'COIN' | 'DIAMOND' | 'TRADING'>('COIN');
  const [roleDraft, setRoleDraft] = useState<'USER' | 'AGENT' | 'SUPER_AGENT'>('USER');
  const [walletDirection, setWalletDirection] = useState<'CREDIT' | 'DEBIT'>('CREDIT');
  const [walletAmount, setWalletAmount] = useState('');
  const [walletReason, setWalletReason] = useState('');

  const [gfDraft, setGfDraft] = useState<GfRemoteConfig>(GF_DEFAULT_CONFIG);
  const [annTitle, setAnnTitle] = useState('');
  const [annMessage, setAnnMessage] = useState('');

  useEffect(() => {
    const unsubUsers = subscribeAllUsers(setAllUsers, (err) =>
      onToast('Users sync error', err.message, 'error')
    );
    const unsubWallets = subscribeAllWallets(setWallets, (err) =>
      onToast('Wallets sync error', err.message, 'error')
    );
    const unsubAudit = subscribeAdminAudit(setAudit, (err) =>
      onToast('Audit sync error', err.message, 'error')
    );
    const unsubGf = subscribeGfConfig(setGfConfig, (msg) =>
      onToast('Game config sync error', msg, 'error')
    );
    const unsubAnn = subscribeActiveAnnouncement(setAnnouncement);
    return () => {
      unsubUsers();
      unsubWallets();
      unsubAudit();
      unsubGf();
      unsubAnn();
    };
  }, []);

  useEffect(() => {
    setGfDraft(gfConfig);
  }, [gfConfig.enabled, gfConfig.openMs]);

  useEffect(() => {
    if (!ledgerUid) {
      setLedgerTxs([]);
      return;
    }
    return subscribeWalletTransactions(ledgerUid, setLedgerTxs);
  }, [ledgerUid]);

  const walletByUid = useMemo(() => {
    const map = new Map<string, AdminWalletSnapshot>();
    wallets.forEach((w) => map.set(w.uid, w));
    return map;
  }, [wallets]);

  const selectedUser = allUsers.find((u) => u.uid === selectedUid) ?? null;
  const selectedWallet = selectedUid ? walletByUid.get(selectedUid) : undefined;
  const ledgerUser = allUsers.find((u) => u.uid === ledgerUid) ?? null;

  useEffect(() => {
    if (selectedUser) setRoleDraft(selectedUser.accountType);
  }, [selectedUser?.uid, selectedUser?.accountType]);

  const liveRooms = rooms.filter((r) => r.status === 'LIVE');
  const openReports = reports.filter((r) => r.status !== 'RESOLVED');

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    const list = q
      ? allUsers.filter(
          (u) =>
            u.platformId.toLowerCase().includes(q) ||
            u.username.toLowerCase().includes(q) ||
            u.displayName.toLowerCase().includes(q) ||
            u.uid.toLowerCase().includes(q)
        )
      : allUsers;
    return [...list].sort((a, b) =>
      a.platformId.localeCompare(b.platformId, undefined, { numeric: true })
    );
  }, [allUsers, userSearch]);

  const stats = useMemo(() => {
    const totalCoins = wallets.reduce((s, w) => s + w.coinBalance, 0);
    const totalTrading = wallets.reduce((s, w) => s + w.tradingCoinBalance, 0);
    const totalDiamonds = wallets.reduce((s, w) => s + w.diamondBalance, 0);
    return {
      totalUsers: allUsers.length,
      onlineNow: allUsers.filter((u) => u.isOnline && !u.isSuspended).length,
      suspended: allUsers.filter((u) => u.isSuspended).length,
      liveRooms: liveRooms.length,
      viewers: liveRooms.reduce((s, r) => s + r.viewerCount, 0),
      openReports: openReports.length,
      users: allUsers.filter((u) => u.accountType === 'USER').length,
      agents: allUsers.filter((u) => u.accountType === 'AGENT').length,
      superAgents: allUsers.filter(
        (u) => u.accountType === 'SUPER_AGENT' && !isBdAgentProfile(u)
      ).length,
      bdAgents: allUsers.filter((u) => isBdAgentProfile(u)).length,
      totalCoins,
      totalTrading,
      totalDiamonds,
    };
  }, [allUsers, wallets, liveRooms, openReports]);

  // A Firestore write can stay pending indefinitely (offline queue / quota
  // backoff), which used to leave the whole panel disabled on "Applying…".
  // Every action is therefore time-boxed so the UI always recovers.
  const ACTION_TIMEOUT_MS = 20000;

  const runAction = async (
    fn: () => Promise<void>,
    okTitle: string,
    okDesc?: string
  ): Promise<boolean> => {
    if (!currentUser || busy) return false;
    setBusy(true);
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        fn(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () => reject(new Error('__timeout__')),
            ACTION_TIMEOUT_MS
          );
        }),
      ]);
      onToast(okTitle, okDesc, 'success');
      setConfirm(null);
      return true;
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      onToast(
        'Action failed',
        raw === '__timeout__'
          ? 'The server did not confirm in time. The change may still sync — reopen this user/ledger in a moment to check.'
          : raw,
        'error'
      );
      return false;
    } finally {
      if (timer) clearTimeout(timer);
      setBusy(false);
    }
  };

  const handleWalletAdjust = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !selectedUser) return;
    const value = Math.floor(Number(walletAmount));
    if (!Number.isFinite(value) || value <= 0) {
      onToast('Invalid amount', 'Enter a positive whole number.', 'warning');
      return;
    }
    if (walletDirection === 'DEBIT' && selectedWallet) {
      const available =
        walletCurrency === 'COIN'
          ? selectedWallet.coinBalance
          : walletCurrency === 'TRADING'
          ? selectedWallet.tradingCoinBalance
          : selectedWallet.diamondBalance;
      if (value > available) {
        onToast('Insufficient balance', `User only has ${available.toLocaleString()}.`, 'error');
        return;
      }
    }
    const target = selectedUser;
    void runAction(
      () =>
        adminAdjustWallet(
          currentUser,
          target.uid,
          walletCurrency,
          walletDirection,
          value,
          walletReason.trim() || `Admin ${walletDirection.toLowerCase()}`
        ),
      walletDirection === 'CREDIT' ? 'Balance credited' : 'Balance deducted',
      `${value.toLocaleString()} ${walletCurrency} · @${target.username}`
    ).then((ok) => {
      if (ok) {
        setWalletAmount('');
        setWalletReason('');
      }
    });
  };

  const handleChangeRole = () => {
    if (!currentUser || !selectedUser) return;
    if (roleDraft === selectedUser.accountType) {
      onToast('No change', 'Pick a different role first.', 'info');
      return;
    }
    const nextRole = roleDraft;
    const nextLabel =
      nextRole === 'SUPER_AGENT' ? 'Super Agent' : nextRole === 'AGENT' ? 'Agent' : 'User';
    setConfirm({
      title: `Change role to ${nextLabel}?`,
      body: `@${selectedUser.username} (${selectedUser.platformId}) will change from ${roleLabel(
        selectedUser
      )} to ${nextLabel}. Agency rights are granted or removed immediately.`,
      confirmLabel: 'Change role',
      run: async () => {
        await runAction(
          () => adminSetRole(currentUser, selectedUser, nextRole),
          'Role updated',
          `@${selectedUser.username} → ${nextLabel}`
        );
      },
    });
  };

  const handlePublishAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    void runAction(
      () => publishAnnouncement(currentUser, annTitle, annMessage),
      'Announcement published',
      'It is now visible to all users.'
    ).then((ok) => {
      if (ok) {
        setAnnTitle('');
        setAnnMessage('');
      }
    });
  };

  const handleSaveGfConfig = () => {
    if (!currentUser) return;
    const openMs = Math.floor(Number(gfDraft.openMs));
    if (!Number.isFinite(openMs) || openMs < 5000 || openMs > 120000) {
      onToast('Invalid betting window', 'Open time must be 5,000–120,000 ms.', 'warning');
      return;
    }
    void runAction(
      () =>
        saveGfConfig(
          currentUser.uid,
          { enabled: gfDraft.enabled, openMs },
          `Golden Flower ${gfDraft.enabled ? 'enabled' : 'disabled'}, openMs=${openMs}`
        ),
      'Game config saved',
      `Golden Flower ${gfDraft.enabled ? 'ON' : 'OFF'} · ${openMs} ms`
    );
  };

  const tabs: { id: AdminTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'users', label: 'Users', icon: <Users className="w-4 h-4" /> },
    { id: 'live', label: 'Live Rooms', icon: <Radio className="w-4 h-4" />, badge: liveRooms.length },
    { id: 'reports', label: 'Reports', icon: <ShieldAlert className="w-4 h-4" />, badge: openReports.length },
    { id: 'games', label: 'Games', icon: <Gamepad2 className="w-4 h-4" /> },
    { id: 'broadcast', label: 'Broadcast', icon: <Megaphone className="w-4 h-4" /> },
    { id: 'audit', label: 'Audit Log', icon: <ScrollText className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-5 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onClose}
            aria-label="Back"
            className="w-9 h-9 rounded-full bg-white/[0.08] hover:bg-white/[0.15] border border-white/10 text-slate-300 hover:text-white flex items-center justify-center shrink-0 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <h1 className="font-display text-lg sm:text-xl font-bold text-white leading-tight flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-violet-400" />
              <span>Admin Panel</span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Platform management · {currentUser ? `@${currentUser.username}` : 'Admin'}
            </p>
          </div>
        </div>
        {isOffline && (
          <span className="text-[11px] font-medium text-amber-300 bg-amber-500/10 border border-amber-500/25 rounded-full px-3 py-1 shrink-0">
            Offline — actions paused
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'bg-violet-600 text-white'
                : 'bg-[#111420] border border-white/[0.08] text-slate-400 hover:text-white'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {typeof tab.badge === 'number' && tab.badge > 0 && (
              <span
                className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                  activeTab === tab.id ? 'bg-white/20' : 'bg-violet-500/20 text-violet-300'
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ============ OVERVIEW ============ */}
      {activeTab === 'overview' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <StatCard icon={<Users className="w-4 h-4 text-violet-400" />} label="Total Users" value={stats.totalUsers.toLocaleString()} />
            <StatCard icon={<Radio className="w-4 h-4 text-emerald-400" />} label="Online Now" value={stats.onlineNow.toLocaleString()} accent="text-emerald-400" />
            <StatCard icon={<Radio className="w-4 h-4 text-rose-400" />} label="Live Rooms" value={stats.liveRooms.toLocaleString()} accent="text-rose-400" />
            <StatCard icon={<Eye className="w-4 h-4 text-sky-400" />} label="Total Viewers" value={stats.viewers.toLocaleString()} />
            <StatCard icon={<ShieldAlert className="w-4 h-4 text-amber-400" />} label="Open Reports" value={stats.openReports.toLocaleString()} accent={stats.openReports > 0 ? 'text-amber-400' : 'text-white'} />
            <StatCard icon={<Ban className="w-4 h-4 text-rose-400" />} label="Suspended" value={stats.suspended.toLocaleString()} accent={stats.suspended > 0 ? 'text-rose-400' : 'text-white'} />
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <section className="rounded-2xl bg-[#111420] border border-white/[0.08] p-4 space-y-3">
              <h2 className="font-display text-sm font-semibold text-white">Role Breakdown</h2>
              <div className="space-y-2 text-xs">
                {[
                  ['BD Agent', stats.bdAgents, 'text-amber-300'],
                  ['Super Agents', stats.superAgents, 'text-violet-300'],
                  ['Agents', stats.agents, 'text-sky-300'],
                  ['Users', stats.users, 'text-slate-300'],
                ].map(([label, count, cls]) => (
                  <div key={label as string} className="flex items-center justify-between">
                    <span className="text-slate-400">{label}</span>
                    <span className={`font-mono font-bold tabular-nums ${cls}`}>{count}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl bg-[#111420] border border-white/[0.08] p-4 space-y-3">
              <h2 className="font-display text-sm font-semibold text-white">Economy in Circulation</h2>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 inline-flex items-center gap-1.5">
                    <Coins className="w-3.5 h-3.5 text-amber-400" /> Main Coins
                  </span>
                  <span className="font-mono font-bold text-amber-300 tabular-nums">{stats.totalCoins.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 inline-flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-violet-400" /> Trading Coins
                  </span>
                  <span className="font-mono font-bold text-violet-300 tabular-nums">{stats.totalTrading.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 inline-flex items-center gap-1.5">
                    <Gem className="w-3.5 h-3.5 text-sky-400" /> Diamonds
                  </span>
                  <span className="font-mono font-bold text-sky-300 tabular-nums">{stats.totalDiamonds.toLocaleString()}</span>
                </div>
              </div>
            </section>
          </div>

          <section className="space-y-2">
            <h2 className="font-display text-sm font-semibold text-white px-1">Recent Admin Activity</h2>
            {audit.length === 0 ? (
              <EmptyState text="No admin actions recorded yet." />
            ) : (
              <div className="rounded-2xl bg-[#111420] border border-white/[0.08] divide-y divide-white/[0.06]">
                {audit.slice(0, 5).map((a) => (
                  <div key={a.auditId} className="px-4 py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-100">
                        <span className="font-mono text-violet-300">{a.action}</span>
                        <span className="text-slate-400"> · @{a.actorUsername}</span>
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">{a.detail}</p>
                    </div>
                    <span className="text-[11px] font-mono text-slate-500 shrink-0">{a.timestampLabel}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* ============ USERS ============ */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Search by ID, username, name or uid…"
              className="w-full h-11 pl-10 pr-4 rounded-xl bg-[#111420] border border-white/[0.08] focus:border-violet-500/60 focus:outline-none text-sm text-white placeholder:text-slate-500"
            />
          </div>

          <div className="grid lg:grid-cols-2 gap-4 items-start">
            {/* User list */}
            <div className="rounded-2xl bg-[#111420] border border-white/[0.08] divide-y divide-white/[0.06] max-h-[520px] overflow-y-auto">
              {filteredUsers.length === 0 ? (
                <p className="p-6 text-xs text-slate-500 text-center">No accounts match.</p>
              ) : (
                filteredUsers.map((u) => {
                  const w = walletByUid.get(u.uid);
                  return (
                    <button
                      key={u.uid}
                      type="button"
                      onClick={() => setSelectedUid(u.uid === selectedUid ? null : u.uid)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                        u.uid === selectedUid ? 'bg-violet-500/10' : 'hover:bg-white/[0.03]'
                      }`}
                    >
                      <Avatar name={u.displayName} color={u.avatarColor} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-100 truncate">
                          {u.displayName}
                          {u.isSuspended && (
                            <span className="ml-2 text-[10px] font-bold text-rose-400">SUSPENDED</span>
                          )}
                        </p>
                        <p className="text-[11px] text-slate-500 font-mono truncate">
                          {u.platformId} · @{u.username}
                        </p>
                      </div>
                      <div className="text-right shrink-0 space-y-1">
                        <RoleBadge user={u} />
                        <p className="text-[10px] font-mono text-amber-300/80 tabular-nums">
                          {(w?.coinBalance ?? 0).toLocaleString()}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Selected user detail */}
            {selectedUser ? (
              <div className="rounded-2xl bg-[#111420] border border-white/[0.08] p-4 space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar name={selectedUser.displayName} color={selectedUser.avatarColor} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white truncate">{selectedUser.displayName}</p>
                    <p className="text-xs text-slate-400 font-mono">
                      {selectedUser.platformId} · @{selectedUser.username}
                    </p>
                  </div>
                  <RoleBadge user={selectedUser} />
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-[#0B0D14] p-2.5">
                    <p className="text-[10px] text-slate-500 mb-0.5">Coins</p>
                    <p className="font-mono text-sm font-bold text-amber-300 tabular-nums">
                      {(selectedWallet?.coinBalance ?? 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-xl bg-[#0B0D14] p-2.5">
                    <p className="text-[10px] text-slate-500 mb-0.5">Diamonds</p>
                    <p className="font-mono text-sm font-bold text-sky-300 tabular-nums">
                      {(selectedWallet?.diamondBalance ?? 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-xl bg-[#0B0D14] p-2.5">
                    <p className="text-[10px] text-slate-500 mb-0.5">Trading</p>
                    <p className="font-mono text-sm font-bold text-violet-300 tabular-nums">
                      {(selectedWallet?.tradingCoinBalance ?? 0).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Role management */}
                <div className="rounded-xl bg-[#0B0D14] border border-white/[0.06] p-3 space-y-2.5">
                  <p className="text-xs font-semibold text-slate-300 inline-flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-violet-400" /> Account Role
                  </p>
                  {selectedUser.platformId === '111112' ? (
                    <p className="text-[11px] text-slate-500">
                      The main BD Agent role is fixed and cannot be changed or demoted.
                    </p>
                  ) : (
                    <>
                      <select
                        value={roleDraft}
                        onChange={(e) =>
                          setRoleDraft(e.target.value as 'USER' | 'AGENT' | 'SUPER_AGENT')
                        }
                        disabled={busy || isOffline}
                        className="w-full h-9 px-2 rounded-lg bg-[#111420] border border-white/[0.09] text-xs text-white focus:outline-none disabled:opacity-50"
                      >
                        <option value="USER">User</option>
                        <option value="AGENT">Agent</option>
                        <option value="SUPER_AGENT">Super Agent</option>
                      </select>
                      <button
                        type="button"
                        disabled={busy || isOffline || roleDraft === selectedUser.accountType}
                        onClick={handleChangeRole}
                        className="w-full h-9 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-xs font-semibold text-white transition-colors"
                      >
                        Apply Role Change
                      </button>
                    </>
                  )}
                </div>

                {/* Wallet adjustment */}
                <form onSubmit={handleWalletAdjust} className="rounded-xl bg-[#0B0D14] border border-white/[0.06] p-3 space-y-2.5">
                  <p className="text-xs font-semibold text-slate-300 inline-flex items-center gap-1.5">
                    <Wallet className="w-3.5 h-3.5 text-amber-400" /> Adjust Balance
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={walletCurrency}
                      onChange={(e) => setWalletCurrency(e.target.value as 'COIN' | 'DIAMOND' | 'TRADING')}
                      className="h-9 px-2 rounded-lg bg-[#111420] border border-white/[0.09] text-xs text-white focus:outline-none"
                    >
                      <option value="COIN">Coins</option>
                      <option value="DIAMOND">Diamonds</option>
                      <option value="TRADING">Trading Coins</option>
                    </select>
                    <select
                      value={walletDirection}
                      onChange={(e) => setWalletDirection(e.target.value as 'CREDIT' | 'DEBIT')}
                      className="h-9 px-2 rounded-lg bg-[#111420] border border-white/[0.09] text-xs text-white focus:outline-none"
                    >
                      <option value="CREDIT">Credit (+)</option>
                      <option value="DEBIT">Debit (−)</option>
                    </select>
                  </div>
                  <input
                    type="number"
                    min={1}
                    value={walletAmount}
                    onChange={(e) => setWalletAmount(e.target.value)}
                    placeholder="Amount"
                    className="w-full h-9 px-3 rounded-lg bg-[#111420] border border-white/[0.09] text-xs text-white font-mono focus:border-violet-500/60 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={walletReason}
                    onChange={(e) => setWalletReason(e.target.value)}
                    placeholder="Reason (recorded in ledger)"
                    maxLength={160}
                    className="w-full h-9 px-3 rounded-lg bg-[#111420] border border-white/[0.09] text-xs text-white focus:border-violet-500/60 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={busy || isOffline || !walletAmount}
                    className="w-full h-9 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 text-xs font-bold text-[#111420] transition-all"
                  >
                    {busy ? 'Applying…' : `Apply ${walletDirection === 'CREDIT' ? 'Credit' : 'Debit'}`}
                  </button>
                </form>

                {/* Moderation actions */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenUserProfile(selectedUser)}
                    className="h-9 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-xs font-medium text-white inline-flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" /> Profile
                  </button>
                  <button
                    type="button"
                    onClick={() => setLedgerUid(selectedUser.uid)}
                    className="h-9 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-xs font-medium text-white inline-flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <History className="w-3.5 h-3.5" /> Ledger
                  </button>
                  <button
                    type="button"
                    disabled={busy || isOffline || selectedUser.uid === currentUser?.uid}
                    onClick={() =>
                      void runAction(
                        () => adminSetSuspended(currentUser!, selectedUser, !selectedUser.isSuspended),
                        selectedUser.isSuspended ? 'User unsuspended' : 'User suspended',
                        `@${selectedUser.username}`
                      )
                    }
                    className={`h-9 rounded-lg text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40 ${
                      selectedUser.isSuspended
                        ? 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300'
                        : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300'
                    }`}
                  >
                    {selectedUser.isSuspended ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                    {selectedUser.isSuspended ? 'Unsuspend' : 'Suspend'}
                  </button>
                  <button
                    type="button"
                    disabled={busy || isOffline || selectedUser.accountType === 'USER' || selectedUser.uid === currentUser?.uid || selectedUser.platformId === '111112'}
                    onClick={() =>
                      setConfirm({
                        title: 'Demote to USER?',
                        body: `@${selectedUser.username} will lose the ${roleLabel(selectedUser)} role and become a regular USER. Promotions remain with the BD Agent.`,
                        confirmLabel: 'Demote',
                        run: () =>
                          runAction(
                            () => adminDemoteToUser(currentUser!, selectedUser),
                            'Demoted to USER',
                            `@${selectedUser.username}`
                          ),
                      })
                    }
                    className="h-9 rounded-lg bg-violet-500/15 hover:bg-violet-500/25 disabled:opacity-40 text-xs font-medium text-violet-300 inline-flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <UserMinus className="w-3.5 h-3.5" /> Demote
                  </button>
                  <button
                    type="button"
                    disabled={busy || isOffline || selectedUser.uid === currentUser?.uid || selectedUser.platformId === '111112'}
                    onClick={() =>
                      setConfirm({
                        title: 'Delete this account?',
                        body: `Permanently deletes @${selectedUser.username}'s profile, wallet, ledger, follows and blocks. The Firebase login itself remains — signing in again will start fresh onboarding. This cannot be undone.`,
                        confirmLabel: 'Delete account',
                        run: () =>
                          runAction(
                            async () => {
                              await adminDeleteUserCascade(currentUser!, selectedUser);
                              setSelectedUid(null);
                            },
                            'Account deleted',
                            `@${selectedUser.username}`
                          ),
                      })
                    }
                    className="col-span-2 h-9 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 disabled:opacity-40 text-xs font-semibold text-rose-300 inline-flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete Account & Data
                  </button>
                </div>
              </div>
            ) : (
              <EmptyState text="Select an account from the list to manage it." />
            )}
          </div>
        </div>
      )}

      {/* ============ LIVE ROOMS ============ */}
      {activeTab === 'live' && (
        <div className="space-y-3">
          {liveRooms.length === 0 ? (
            <EmptyState text="No live rooms right now." />
          ) : (
            liveRooms.map((room) => {
              const host = allUsers.find((u) => u.uid === room.hostUid);
              return (
                <div key={room.roomId} className="rounded-2xl bg-[#111420] border border-white/[0.08] p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white truncate flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0" />
                      {room.title}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5 truncate">
                      {host ? `@${host.username} (${host.platformId})` : room.hostUid} · {room.category} · {room.mode}
                    </p>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                      {room.viewerCount.toLocaleString()} viewers · {room.startedAtLabel}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => onWatchRoom(room.roomId)}
                      className="px-3 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-xs font-medium text-white inline-flex items-center gap-1.5 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" /> Watch
                    </button>
                    <button
                      type="button"
                      disabled={busy || isOffline}
                      onClick={() =>
                        setConfirm({
                          title: 'Force-end this live room?',
                          body: `"${room.title}" will be ended immediately for the host and all viewers.`,
                          confirmLabel: 'End room',
                          run: () =>
                            runAction(
                              () => adminForceEndRoom(currentUser!, room.roomId),
                              'Room ended',
                              room.title
                            ),
                        })
                      }
                      className="px-3 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 disabled:opacity-40 text-xs font-medium text-amber-300 inline-flex items-center gap-1.5 transition-colors"
                    >
                      <Power className="w-3.5 h-3.5" /> End
                    </button>
                    <button
                      type="button"
                      disabled={busy || isOffline}
                      onClick={() =>
                        setConfirm({
                          title: 'Delete this room?',
                          body: `Deletes "${room.title}" plus its seats, messages and signaling data. Use for abusive content cleanup.`,
                          confirmLabel: 'Delete room',
                          run: () =>
                            runAction(
                              () => adminDeleteRoom(currentUser!, room.roomId),
                              'Room deleted',
                              room.title
                            ),
                        })
                      }
                      className="px-3 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 disabled:opacity-40 text-xs font-medium text-rose-300 inline-flex items-center gap-1.5 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ============ REPORTS ============ */}
      {activeTab === 'reports' && (
        <div className="space-y-3">
          {reports.length === 0 ? (
            <EmptyState text="No safety reports in the queue." />
          ) : (
            reports.map((report) => {
              const targetUser =
                report.targetType === 'USER'
                  ? allUsers.find((u) => u.uid === report.targetId)
                  : undefined;
              const targetRoom =
                report.targetType === 'ROOM'
                  ? liveRooms.find((r) => r.roomId === report.targetId)
                  : undefined;
              return (
                <div key={report.reportId} className="rounded-2xl bg-[#111420] border border-white/[0.08] p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white">
                        {report.targetLabel}{' '}
                        <span className="text-xs text-slate-400 font-mono">({report.targetType})</span>
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Reason: {report.reason} · by @{report.reporterUsername} · {report.timestampLabel}
                      </p>
                    </div>
                    <span
                      className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full shrink-0 ${
                        report.status === 'RESOLVED'
                          ? 'bg-emerald-500/15 text-emerald-300'
                          : 'bg-amber-500/15 text-amber-300'
                      }`}
                    >
                      {report.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {report.status !== 'RESOLVED' && (
                      <button
                        type="button"
                        disabled={busy || isOffline}
                        onClick={() => void runAction(() => onResolveReport(report.reportId), 'Report resolved')}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 disabled:opacity-40 text-xs font-medium text-emerald-300 inline-flex items-center gap-1.5 transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Resolve
                      </button>
                    )}
                    {targetUser && !targetUser.isSuspended && (
                      <button
                        type="button"
                        disabled={busy || isOffline}
                        onClick={() =>
                          setConfirm({
                            title: 'Suspend reported user?',
                            body: `@${targetUser.username} (${targetUser.platformId}) will be suspended and hidden from the app.`,
                            confirmLabel: 'Suspend',
                            run: () =>
                              runAction(
                                () => adminSetSuspended(currentUser!, targetUser, true),
                                'User suspended',
                                `@${targetUser.username}`
                              ),
                          })
                        }
                        className="px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 disabled:opacity-40 text-xs font-medium text-amber-300 inline-flex items-center gap-1.5 transition-colors"
                      >
                        <Ban className="w-3.5 h-3.5" /> Suspend User
                      </button>
                    )}
                    {targetRoom && (
                      <button
                        type="button"
                        disabled={busy || isOffline}
                        onClick={() =>
                          setConfirm({
                            title: 'End reported room?',
                            body: `"${targetRoom.title}" will be ended immediately.`,
                            confirmLabel: 'End room',
                            run: () =>
                              runAction(
                                () => adminForceEndRoom(currentUser!, targetRoom.roomId),
                                'Room ended',
                                targetRoom.title
                              ),
                          })
                        }
                        className="px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 disabled:opacity-40 text-xs font-medium text-amber-300 inline-flex items-center gap-1.5 transition-colors"
                      >
                        <Power className="w-3.5 h-3.5" /> End Room
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={busy || isOffline}
                      onClick={() =>
                        setConfirm({
                          title: 'Delete this report?',
                          body: 'Removes the report from the queue permanently.',
                          confirmLabel: 'Delete report',
                          run: () =>
                            runAction(
                              () => adminDeleteReport(currentUser!, report.reportId),
                              'Report deleted'
                            ),
                        })
                      }
                      className="px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 disabled:opacity-40 text-xs font-medium text-rose-300 inline-flex items-center gap-1.5 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ============ GAMES ============ */}
      {activeTab === 'games' && (
        <div className="space-y-4 max-w-xl">
          <section className="rounded-2xl bg-[#111420] border border-white/[0.08] p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-sm font-semibold text-white flex items-center gap-2">
                <Gamepad2 className="w-4 h-4 text-violet-400" /> Golden Flower
              </h2>
              <button
                type="button"
                disabled={busy || isOffline}
                onClick={() => setGfDraft((d) => ({ ...d, enabled: !d.enabled }))}
                className={`relative w-12 h-6 rounded-full transition-colors disabled:opacity-40 ${
                  gfDraft.enabled ? 'bg-emerald-500' : 'bg-white/[0.15]'
                }`}
                aria-label="Toggle Golden Flower"
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${
                    gfDraft.enabled ? 'left-6' : 'left-0.5'
                  }`}
                />
              </button>
            </div>
            <p className="text-xs text-slate-400">
              {gfDraft.enabled
                ? 'Game is OPEN — users can place bets with real coins.'
                : 'Game is CLOSED — the lobby shows a maintenance notice.'}
            </p>
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-slate-300">Betting window (milliseconds)</span>
              <input
                type="number"
                min={5000}
                max={120000}
                step={1000}
                value={gfDraft.openMs}
                onChange={(e) => setGfDraft((d) => ({ ...d, openMs: Number(e.target.value) }))}
                className="w-full h-10 px-3 rounded-xl bg-[#0B0D14] border border-white/[0.09] text-sm text-white font-mono focus:border-violet-500/60 focus:outline-none"
              />
            </label>
            <button
              type="button"
              disabled={busy || isOffline}
              onClick={handleSaveGfConfig}
              className="w-full h-10 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-sm font-semibold text-white inline-flex items-center justify-center gap-2 transition-colors"
            >
              <RefreshCw className="w-4 h-4" /> {busy ? 'Saving…' : 'Save Game Config'}
            </button>
            <p className="text-[11px] text-slate-500">
              Changes apply to the next round and are recorded in the game admin audit trail.
            </p>
          </section>

          <section className="rounded-2xl bg-[#111420] border border-white/[0.08] p-5 space-y-2">
            <h2 className="font-display text-sm font-semibold text-white">Fruit Manor</h2>
            <p className="text-xs text-slate-400">
              Runs fully client-side with server-enforced wallet limits — no remote config needed.
              Payouts and refunds are bounded by security rules.
            </p>
          </section>
        </div>
      )}

      {/* ============ BROADCAST ============ */}
      {activeTab === 'broadcast' && (
        <div className="space-y-4 max-w-xl">
          {announcement && (
            <section className="rounded-2xl bg-violet-500/10 border border-violet-500/30 p-4 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-bold text-violet-300 uppercase tracking-wider">Live Announcement</p>
                <button
                  type="button"
                  disabled={busy || isOffline}
                  onClick={() =>
                    void runAction(
                      () => endAnnouncement(currentUser!, announcement.announcementId),
                      'Announcement ended'
                    )
                  }
                  className="px-3 py-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.15] disabled:opacity-40 text-xs font-medium text-white transition-colors"
                >
                  End Now
                </button>
              </div>
              <p className="text-sm font-semibold text-white">{announcement.title}</p>
              <p className="text-xs text-slate-300">{announcement.message}</p>
              <p className="text-[11px] text-slate-500 font-mono">
                @{announcement.createdByUsername} · {announcement.timestampLabel}
              </p>
            </section>
          )}

          <form onSubmit={handlePublishAnnouncement} className="rounded-2xl bg-[#111420] border border-white/[0.08] p-5 space-y-3">
            <h2 className="font-display text-sm font-semibold text-white flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-amber-400" /> Publish Announcement
            </h2>
            <p className="text-xs text-slate-400">
              Shows as a banner to every user. Publishing replaces any currently active announcement.
            </p>
            <input
              type="text"
              value={annTitle}
              onChange={(e) => setAnnTitle(e.target.value)}
              placeholder="Title (e.g. Scheduled maintenance)"
              maxLength={80}
              className="w-full h-10 px-3 rounded-xl bg-[#0B0D14] border border-white/[0.09] text-sm text-white focus:border-violet-500/60 focus:outline-none"
            />
            <textarea
              value={annMessage}
              onChange={(e) => setAnnMessage(e.target.value)}
              placeholder="Message shown to all users…"
              maxLength={300}
              rows={3}
              className="w-full px-3 py-2.5 rounded-xl bg-[#0B0D14] border border-white/[0.09] text-sm text-white focus:border-violet-500/60 focus:outline-none resize-none"
            />
            <button
              type="submit"
              disabled={busy || isOffline || !annTitle.trim() || !annMessage.trim()}
              className="w-full h-10 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-50 text-sm font-semibold text-white inline-flex items-center justify-center gap-2 transition-all"
            >
              <Send className="w-4 h-4" /> {busy ? 'Publishing…' : 'Publish to All Users'}
            </button>
          </form>
        </div>
      )}

      {/* ============ AUDIT ============ */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <section className="space-y-2">
            <h2 className="font-display text-sm font-semibold text-white px-1">Admin Action Log</h2>
            {audit.length === 0 ? (
              <EmptyState text="No admin actions recorded yet." />
            ) : (
              <div className="rounded-2xl bg-[#111420] border border-white/[0.08] divide-y divide-white/[0.06]">
                {audit.map((a) => (
                  <div key={a.auditId} className="px-4 py-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-100">
                        <span className="font-mono text-violet-300">{a.action}</span>
                        <span className="text-slate-400"> · @{a.actorUsername}</span>
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5 break-words">{a.detail}</p>
                      <p className="text-[10px] text-slate-600 font-mono mt-0.5">target: {a.targetId}</p>
                    </div>
                    <span className="text-[11px] font-mono text-slate-500 shrink-0">{a.timestampLabel}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-2">
            <h2 className="font-display text-sm font-semibold text-white px-1">Promotion Audit Trail</h2>
            {promotions.length === 0 ? (
              <EmptyState text="No promotions recorded yet." />
            ) : (
              <div className="rounded-2xl bg-[#111420] border border-white/[0.08] divide-y divide-white/[0.06]">
                {promotions.map((p) => (
                  <div key={p.promotionId} className="px-4 py-3 flex items-center justify-between gap-3">
                    <p className="text-xs text-slate-200 min-w-0 truncate">
                      <span className="text-slate-400">@{p.actorUsername}</span> promoted{' '}
                      <span className="font-medium text-white">@{p.targetUsername}</span>{' '}
                      <span className="font-mono text-sky-300">{p.beforeType} → {p.afterType}</span>
                    </p>
                    <span className="text-[11px] font-mono text-slate-500 shrink-0">{p.timestampLabel}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* ============ CONFIRM MODAL ============ */}
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-3xl bg-[#111420] border border-white/[0.1] p-5 space-y-4">
            <div className="flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4.5 h-4.5 text-amber-400" />
              </span>
              <h3 className="font-display text-base font-semibold text-white">{confirm.title}</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">{confirm.body}</p>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setConfirm(null)}
                className="h-10 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-sm font-medium text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void confirm.run()}
                className="h-10 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-sm font-semibold text-white transition-colors"
              >
                {busy ? 'Working…' : confirm.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ LEDGER MODAL ============ */}
      {ledgerUid && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-6">
          <div className="w-full sm:max-w-md max-h-[85vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-[#111420] border border-white/[0.1] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-semibold text-white">
                Wallet Ledger {ledgerUser ? `— @${ledgerUser.username}` : ''}
              </h3>
              <button
                type="button"
                onClick={() => setLedgerUid(null)}
                aria-label="Close ledger"
                className="w-8 h-8 rounded-full bg-white/[0.08] hover:bg-white/[0.15] flex items-center justify-center text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {ledgerTxs.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">No transactions recorded.</p>
            ) : (
              <div className="rounded-2xl bg-[#0B0D14] border border-white/[0.06] divide-y divide-white/[0.06]">
                {ledgerTxs.map((tx) => (
                  <div key={tx.transactionId} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-100 truncate">{tx.reason}</p>
                      <p className="text-[11px] text-slate-500 font-mono">
                        {tx.timestampLabel} · {tx.currency}
                        {tx.counterparty ? ` · ${tx.counterparty}` : ''}
                      </p>
                    </div>
                    <span
                      className={`font-mono text-sm font-semibold tabular-nums shrink-0 ${
                        tx.direction === 'CREDIT' ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {tx.direction === 'CREDIT' ? '+' : '-'}
                      {tx.amount.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};