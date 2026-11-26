import React, { useMemo, useState } from 'react';
import {
  Ban,
  CheckCircle2,
  Eye,
  Search,
  ShieldCheck,
  UserCheck,
  UserX,
  X,
} from 'lucide-react';
import {
  adminSetSuspended,
  isBdAgentProfile,
} from '../../lib/firestoreService';
import { UserProfile } from '../../types/app';
import { Avatar } from '../ui/Avatar';
import { AdminSharedProps, getThemeClasses } from './adminTypes';

export const AdminUsersTab: React.FC<AdminSharedProps & { globalSearch?: string }> = ({
  theme,
  currentUser,
  users,
  wallets,
  transactions,
  rooms,
  reports,
  globalSearch = '',
  onToast,
  onConfirm,
  onOpenUserProfile,
}) => {
  const t = getThemeClasses(theme);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED' | 'VERIFIED'>('ALL');
  const [page, setPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const pageSize = 15;

  const effectiveSearch = (search || globalSearch).trim().toLowerCase();

  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (effectiveSearch) {
        const match =
          u.username?.toLowerCase().includes(effectiveSearch) ||
          u.displayName?.toLowerCase().includes(effectiveSearch) ||
          u.uid?.toLowerCase().includes(effectiveSearch) ||
          u.platformId?.toLowerCase().includes(effectiveSearch) ||
          ((u as { email?: string }).email?.toLowerCase().includes(effectiveSearch) ?? false);
        if (!match) return false;
      }
      if (roleFilter !== 'ALL') {
        if (roleFilter === 'BD_AGENT') {
          if (!isBdAgentProfile(u)) return false;
        } else if (u.accountType !== roleFilter) {
          return false;
        }
      }
      if (statusFilter === 'SUSPENDED' && !u.isSuspended) return false;
      if (statusFilter === 'ACTIVE' && u.isSuspended) return false;
      if (statusFilter === 'VERIFIED' && !u.isOnline) return false;
      return true;
    });
  }, [users, effectiveSearch, roleFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const selectedWallet = selectedUser
    ? wallets.find((w) => w.uid === selectedUser.uid)
    : undefined;
  const selectedTxs = selectedUser
    ? transactions.slice(0, 10)
    : [];
  const selectedRooms = selectedUser
    ? rooms.filter((r) => r.hostUid === selectedUser.uid).slice(0, 5)
    : [];
  const selectedReports = selectedUser
    ? reports.filter((r) => r.targetId === selectedUser.uid)
    : [];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className={`${t.card} p-3.5 flex flex-wrap items-center gap-2.5`}>
        <div className="relative flex-1 min-w-[200px]">
          <Search className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 ${t.textMuted}`} />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by username, UID, platform ID, or email..."
            className={`${t.input} pl-8`}
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value);
            setPage(1);
          }}
          className={`${t.input} w-auto min-w-[130px]`}
        >
          <option value="ALL">All Roles</option>
          <option value="USER">Normal User</option>
          <option value="AGENT">Agent</option>
          <option value="SUPER_AGENT">Super Agent</option>
          <option value="BD_AGENT">BD Agent</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as typeof statusFilter);
            setPage(1);
          }}
          className={`${t.input} w-auto min-w-[130px]`}
        >
          <option value="ALL">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="VERIFIED">Verified</option>
        </select>
      </div>

      {/* Users Table */}
      <div className={`${t.card} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className={t.tableHead}>
                <th className="py-3 px-4 font-semibold">User</th>
                <th className="py-3 px-4 font-semibold">Role</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold">Followers</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={5} className={`py-8 text-center ${t.textMuted}`}>
                    No users match your filters.
                  </td>
                </tr>
              ) : (
                paged.map((u) => (
                  <tr key={u.uid} className={t.tableRow}>
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <Avatar src={u.avatarUrl} name={u.displayName} size="sm" />
                        <div>
                          <p className={`font-semibold ${t.textPrimary}`}>{u.displayName}</p>
                          <p className={`text-[10px] ${t.textSecondary}`}>
                            @{u.username} • {u.platformId || u.uid.slice(0, 8)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-500/15 text-violet-300 border border-violet-500/25">
                        {isBdAgentProfile(u) ? 'BD AGENT' : u.accountType}
                      </span>
                    </td>
                    <td className="py-2.5 px-4">
                      {u.isSuspended ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/15 text-rose-300">
                          Suspended
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-300">
                          Active
                        </span>
                      )}
                    </td>
                    <td className={`py-2.5 px-4 ${t.textSecondary}`}>
                      {u.followersCount || 0} / {u.followingCount || 0}
                    </td>
                    <td className="py-2.5 px-4 text-right space-x-1.5">
                      <button
                        onClick={() => setSelectedUser(u)}
                        className={t.btnGhost}
                        title="Inspect user"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect</span>
                      </button>
                      <button
                        onClick={() =>
                          onConfirm({
                            title: u.isSuspended ? 'Unsuspend User' : 'Suspend User',
                            body: `Are you sure you want to ${u.isSuspended ? 'unsuspend' : 'suspend'} @${u.username}?`,
                            confirmLabel: u.isSuspended ? 'Unsuspend' : 'Suspend',
                            danger: !u.isSuspended,
                            run: async () => {
                              await adminSetSuspended(currentUser!, u, !u.isSuspended);
                              onToast(
                                u.isSuspended ? 'User unsuspended' : 'User suspended',
                                `@${u.username}`,
                                'success'
                              );
                            },
                          })
                        }
                        className={u.isSuspended ? t.btnSuccess : t.btnDanger}
                      >
                        {u.isSuspended ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                        <span>{u.isSuspended ? 'Activate' : 'Suspend'}</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className={`px-4 py-3 border-t ${t.border} flex items-center justify-between text-xs`}>
          <span className={t.textSecondary}>
            Showing {paged.length} of {filtered.length} users
          </span>
          <div className="flex items-center gap-1.5">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className={t.btnGhost}
            >
              Prev
            </button>
            <span className={`px-2 ${t.textPrimary}`}>
              {page} / {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className={t.btnGhost}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* User Detail Drawer */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs">
          <div className={`w-full max-w-lg h-full overflow-y-auto p-5 border-l ${t.sidebar} space-y-4`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar src={selectedUser.avatarUrl} name={selectedUser.displayName} size="md" />
                <div>
                  <h3 className={`text-sm font-bold ${t.textPrimary}`}>{selectedUser.displayName}</h3>
                  <p className={`text-xs ${t.textSecondary}`}>
                    @{selectedUser.username} • UID: {selectedUser.uid}
                  </p>
                </div>
              </div>
              <button onClick={() => setSelectedUser(null)} className={t.btnGhost}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              <button onClick={() => onOpenUserProfile(selectedUser)} className={t.btnPrimary}>
                <ShieldCheck className="w-3.5 h-3.5" /> Open Public Profile
              </button>
              <button
                onClick={() =>
                  onConfirm({
                    title: selectedUser.isSuspended ? 'Unsuspend User' : 'Suspend User',
                    body: `Confirm ${selectedUser.isSuspended ? 'unsuspension' : 'suspension'} for @${selectedUser.username}.`,
                    confirmLabel: selectedUser.isSuspended ? 'Unsuspend' : 'Suspend',
                    danger: !selectedUser.isSuspended,
                    run: async () => {
                      await adminSetSuspended(currentUser!, selectedUser, !selectedUser.isSuspended);
                      onToast('Updated user status', `@${selectedUser.username}`, 'success');
                      setSelectedUser(null);
                    },
                  })
                }
                className={selectedUser.isSuspended ? t.btnSuccess : t.btnDanger}
              >
                {selectedUser.isSuspended ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                {selectedUser.isSuspended ? 'Unsuspend' : 'Suspend'}
              </button>
            </div>

            {/* Wallet Balances */}
            <div className={`${t.subCard} p-3.5`}>
              <p className={`text-xs font-bold mb-2 ${t.textPrimary}`}>Wallet Balances</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>Coins: <strong>{selectedWallet?.coinBalance?.toLocaleString() ?? 0}</strong></div>
                <div>Diamonds: <strong>{selectedWallet?.diamondBalance?.toLocaleString() ?? 0}</strong></div>
                <div>Trading Coins: <strong>{selectedWallet?.tradingCoinBalance?.toLocaleString() ?? 0}</strong></div>
              </div>
            </div>

            {/* Live History */}
            <div className={`${t.subCard} p-3.5`}>
              <p className={`text-xs font-bold mb-2 ${t.textPrimary}`}>
                Live History ({selectedRooms.length})
              </p>
              {selectedRooms.length === 0 ? (
                <p className={`text-xs ${t.textMuted}`}>No live rooms hosted.</p>
              ) : (
                <div className="space-y-1.5 text-xs">
                  {selectedRooms.map((r) => (
                    <div key={r.roomId} className="flex justify-between">
                      <span className="truncate">{r.title}</span>
                      <span className={t.textMuted}>{r.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Transactions */}
            <div className={`${t.subCard} p-3.5`}>
              <p className={`text-xs font-bold mb-2 ${t.textPrimary}`}>
                Recent Transactions ({selectedTxs.length})
              </p>
              {selectedTxs.length === 0 ? (
                <p className={`text-xs ${t.textMuted}`}>No transactions found.</p>
              ) : (
                <div className="space-y-1.5 text-xs">
                  {selectedTxs.map((tx) => (
                    <div key={tx.transactionId} className="flex justify-between">
                      <span>{tx.direction}</span>
                      <span className="font-semibold">{tx.amount} {tx.currency}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Reports Against User */}
            <div className={`${t.subCard} p-3.5`}>
              <p className={`text-xs font-bold mb-2 ${t.textPrimary}`}>
                Reports Against User ({selectedReports.length})
              </p>
              {selectedReports.length === 0 ? (
                <p className={`text-xs ${t.textMuted}`}>No reports against this user.</p>
              ) : (
                <div className="space-y-1.5 text-xs">
                  {selectedReports.map((rep) => (
                    <div key={rep.reportId} className="flex justify-between">
                      <span className="truncate">{rep.reason}</span>
                      <span className="text-rose-400">{rep.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
