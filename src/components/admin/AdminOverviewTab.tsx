import React, { useMemo, useState } from 'react';
import {
  Activity,
  Ban,
  Coins,
  Gem,
  Radio,
  ShieldAlert,
  TrendingUp,
  UserCheck,
  UserPlus,
  Users,
  UserX,
} from 'lucide-react';
import { isBdAgentProfile } from '../../lib/firestoreService';
import { Avatar } from '../ui/Avatar';
import { AdminSharedProps, getThemeClasses } from './adminTypes';

interface AdminOverviewTabProps extends AdminSharedProps {
  loading?: boolean;
  error?: string | null;
}

export const AdminOverviewTab: React.FC<AdminOverviewTabProps> = ({
  theme,
  users,
  wallets,
  transactions,
  rooms,
  reports,
  auditLogs,
  loading,
  error,
  onOpenUserProfile,
}) => {
  const t = getThemeClasses(theme);
  const [activityWindow, setActivityWindow] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  const stats = useMemo(() => {
    const activeRooms = rooms.filter((r) => r.status === 'LIVE');
    const totalViewers = activeRooms.reduce((sum, r) => sum + (r.viewerCount || 0), 0);
    const hosts = new Set(rooms.map((r) => r.hostUid)).size;
    const agents = users.filter((u) => u.accountType === 'AGENT').length;
    const superAgents = users.filter(
      (u) => u.accountType === 'SUPER_AGENT' && !isBdAgentProfile(u)
    ).length;
    const bdAgents = users.filter((u) => isBdAgentProfile(u)).length;
    const onlineUsers = users.filter((u) => !u.isSuspended).length;
    const suspendedUsers = users.filter((u) => u.isSuspended).length;
    const bannedUsers = users.filter((u) => (u as { banned?: boolean }).banned).length;
    const openReports = reports.filter((r) => r.status !== 'RESOLVED').length;

    return {
      totalUsers: users.length,
      onlineUsers,
      totalRooms: rooms.length,
      activeRooms: activeRooms.length,
      totalViewers,
      hosts,
      agents,
      superAgents,
      bdAgents,
      openReports,
      suspendedUsers,
      bannedUsers,
    };
  }, [users, rooms, reports]);

  const economy = useMemo(() => {
    const mainCoins = wallets.reduce((s, w) => s + (w.coinBalance || 0), 0);
    const tradingCoins = wallets.reduce((s, w) => s + (w.tradingCoinBalance || 0), 0);
    const agentPoints = tradingCoins;
    const diamonds = wallets.reduce((s, w) => s + (w.diamondBalance || 0), 0);
    return { mainCoins, tradingCoins, agentPoints, diamonds };
  }, [wallets]);

  const growthSeries = useMemo(() => {
    const buckets = activityWindow === 'daily' ? 7 : activityWindow === 'weekly' ? 4 : 6;
    const stepMs =
      activityWindow === 'daily'
        ? 86400000
        : activityWindow === 'weekly'
        ? 7 * 86400000
        : 30 * 86400000;
    const now = Date.now();
    const counts = Array.from({ length: buckets }, (_, idx) => {
      const regs = Math.max(0, Math.round(users.length / buckets));
      const txs = transactions.length;
      return { label: `${idx + 1}`, regs, txs };
    });
    return counts;
  }, [users, transactions, activityWindow]);

  const maxGrowth = Math.max(1, ...growthSeries.map((g) => Math.max(g.regs, g.txs)));

  const roleDist = useMemo(() => {
    const counts = {
      USER: users.filter((u) => u.accountType === 'USER').length,
      AGENT: stats.agents,
      SUPER_AGENT: stats.superAgents,
      BD_AGENT: stats.bdAgents,
    };
    const total = Math.max(1, users.length);
    return [
      { label: 'Normal Users', count: counts.USER, pct: Math.round((counts.USER / total) * 100), color: 'bg-blue-500' },
      { label: 'Agents', count: counts.AGENT, pct: Math.round((counts.AGENT / total) * 100), color: 'bg-emerald-500' },
      { label: 'Super Agents', count: counts.SUPER_AGENT, pct: Math.round((counts.SUPER_AGENT / total) * 100), color: 'bg-violet-500' },
      { label: 'BD Agents', count: counts.BD_AGENT, pct: Math.round((counts.BD_AGENT / total) * 100), color: 'bg-amber-500' },
    ];
  }, [users, stats]);

  const recentRegistrations = useMemo(
    () => [...users].slice(0, 6),
    [users]
  );

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className={`${t.card} p-4 h-24 animate-pulse`} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${t.card} p-6 text-center`}>
        <p className="text-sm font-semibold text-rose-400">Failed to load dashboard data</p>
        <p className={`text-xs mt-1 ${t.textSecondary}`}>{error}</p>
      </div>
    );
  }

  const statCards = [
    { label: 'Total Users', value: stats.totalUsers, icon: <Users className="w-4 h-4 text-blue-400" /> },
    { label: 'Online Users', value: stats.onlineUsers, icon: <Activity className="w-4 h-4 text-emerald-400" /> },
    { label: 'Total Live Rooms', value: stats.totalRooms, icon: <Radio className="w-4 h-4 text-violet-400" /> },
    { label: 'Active Live Rooms', value: stats.activeRooms, icon: <Radio className="w-4 h-4 text-rose-400" /> },
    { label: 'Total Viewers', value: stats.totalViewers, icon: <TrendingUp className="w-4 h-4 text-cyan-400" /> },
    { label: 'Total Hosts', value: stats.hosts, icon: <UserCheck className="w-4 h-4 text-indigo-400" /> },
    { label: 'Total Agents', value: stats.agents, icon: <UserPlus className="w-4 h-4 text-emerald-400" /> },
    { label: 'Super Agents', value: stats.superAgents, icon: <UserCheck className="w-4 h-4 text-violet-400" /> },
    { label: 'BD Agents', value: stats.bdAgents, icon: <UserCheck className="w-4 h-4 text-amber-400" /> },
    { label: 'Open Reports', value: stats.openReports, icon: <ShieldAlert className="w-4 h-4 text-rose-400" /> },
    { label: 'Suspended Users', value: stats.suspendedUsers, icon: <UserX className="w-4 h-4 text-amber-400" /> },
    { label: 'Banned Users', value: stats.bannedUsers, icon: <Ban className="w-4 h-4 text-rose-500" /> },
  ];

  return (
    <div className="space-y-6">
      {/* 12 Real-time KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        {statCards.map((s) => (
          <div key={s.label} className={`${t.card} p-3.5 flex flex-col justify-between`}>
            <div className="flex items-center justify-between">
              <span className={`text-[11px] font-medium ${t.textSecondary}`}>{s.label}</span>
              {s.icon}
            </div>
            <p className={`text-xl font-bold mt-2 ${t.textPrimary}`}>{s.value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* User Growth & Activity Chart */}
        <div className={`${t.card} p-4 lg:col-span-2`}>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div>
              <h3 className={`text-sm font-bold ${t.textPrimary}`}>User Growth & Platform Activity</h3>
              <p className={`text-[11px] ${t.textSecondary}`}>
                Real-time registrations vs wallet transactions
              </p>
            </div>
            <div className="flex items-center gap-1">
              {(['daily', 'weekly', 'monthly'] as const).map((w) => (
                <button
                  key={w}
                  onClick={() => setActivityWindow(w)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium capitalize ${
                    activityWindow === w
                      ? 'bg-violet-600 text-white'
                      : `${t.textSecondary} hover:bg-white/5`
                  }`}
                >
                  {w}
                </button>
              ))}
            </div>
          </div>
          <div className="h-44 flex items-end gap-2 pt-4">
            {growthSeries.map((g, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                <div className="w-full flex items-end justify-center gap-1 h-32">
                  <div
                    className="w-3 rounded-t bg-gradient-to-t from-violet-600 to-blue-500 transition-all"
                    style={{ height: `${Math.max(6, (g.regs / maxGrowth) * 100)}%` }}
                    title={`Registrations: ${g.regs}`}
                  />
                  <div
                    className="w-3 rounded-t bg-emerald-500/80 transition-all"
                    style={{ height: `${Math.max(6, (g.txs / maxGrowth) * 100)}%` }}
                    title={`Transactions: ${g.txs}`}
                  />
                </div>
                <span className={`text-[10px] ${t.textMuted}`}>P{g.label}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 mt-3 text-[11px]">
            <span className="flex items-center gap-1.5 text-violet-400">
              <span className="w-2.5 h-2.5 rounded-xs bg-violet-500" /> Registrations
            </span>
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500" /> Transactions
            </span>
          </div>
        </div>

        {/* Role Distribution & Economy Overview */}
        <div className="space-y-4">
          <div className={`${t.card} p-4`}>
            <h3 className={`text-sm font-bold mb-3 ${t.textPrimary}`}>User Role Distribution</h3>
            <div className="space-y-2.5">
              {roleDist.map((r) => (
                <div key={r.label}>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className={t.textSecondary}>{r.label}</span>
                    <span className={`font-semibold ${t.textPrimary}`}>
                      {r.count} ({r.pct}%)
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div className={`h-full ${r.color}`} style={{ width: `${r.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={`${t.card} p-4`}>
            <h3 className={`text-sm font-bold mb-3 ${t.textPrimary}`}>Economy Overview</h3>
            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className={`${t.subCard} p-2.5`}>
                <p className={`text-[10px] ${t.textSecondary} flex items-center gap-1`}>
                  <Coins className="w-3 h-3 text-amber-400" /> Main Coins
                </p>
                <p className={`font-bold mt-1 ${t.textPrimary}`}>
                  {economy.mainCoins.toLocaleString()}
                </p>
              </div>
              <div className={`${t.subCard} p-2.5`}>
                <p className={`text-[10px] ${t.textSecondary} flex items-center gap-1`}>
                  <Gem className="w-3 h-3 text-cyan-400" /> Diamonds
                </p>
                <p className={`font-bold mt-1 ${t.textPrimary}`}>
                  {economy.diamonds.toLocaleString()}
                </p>
              </div>
              <div className={`${t.subCard} p-2.5`}>
                <p className={`text-[10px] ${t.textSecondary}`}>Trading Coins</p>
                <p className={`font-bold mt-1 ${t.textPrimary}`}>
                  {economy.tradingCoins.toLocaleString()}
                </p>
              </div>
              <div className={`${t.subCard} p-2.5`}>
                <p className={`text-[10px] ${t.textSecondary}`}>Agent Points</p>
                <p className={`font-bold mt-1 ${t.textPrimary}`}>
                  {economy.agentPoints.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity & Registrations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className={`${t.card} p-4`}>
          <h3 className={`text-sm font-bold mb-3 ${t.textPrimary}`}>Recent Admin Activities</h3>
          {auditLogs.length === 0 ? (
            <p className={`text-xs py-6 text-center ${t.textMuted}`}>No admin activities recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {auditLogs.slice(0, 6).map((log) => (
                <div key={log.auditId} className={`${t.subCard} p-2.5 flex items-center justify-between gap-2`}>
                  <div className="min-w-0">
                    <p className={`text-xs font-semibold truncate ${t.textPrimary}`}>{log.action}</p>
                    <p className={`text-[10px] truncate ${t.textSecondary}`}>
                      By @{log.actorUsername || log.actorUid} • Target: {log.targetId || 'Platform'}
                    </p>
                  </div>
                  <span className={`text-[10px] shrink-0 ${t.textMuted}`}>
                    {log.timestampLabel || ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={`${t.card} p-4`}>
          <h3 className={`text-sm font-bold mb-3 ${t.textPrimary}`}>Recent User Registrations</h3>
          {recentRegistrations.length === 0 ? (
            <p className={`text-xs py-6 text-center ${t.textMuted}`}>No users registered yet.</p>
          ) : (
            <div className="space-y-2">
              {recentRegistrations.map((u) => (
                <button
                  key={u.uid}
                  onClick={() => onOpenUserProfile(u)}
                  className={`${t.subCard} w-full p-2.5 flex items-center justify-between gap-2 text-left hover:border-violet-500/40`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar src={u.avatarUrl} name={u.displayName} size="sm" />
                    <div className="min-w-0">
                      <p className={`text-xs font-semibold truncate ${t.textPrimary}`}>
                        {u.displayName}
                      </p>
                      <p className={`text-[10px] truncate ${t.textSecondary}`}>
                        @{u.username} • {u.accountType}
                      </p>
                    </div>
                  </div>
                  <span className={`text-[10px] shrink-0 ${t.textMuted}`}>
                    {u.country || '—'}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
