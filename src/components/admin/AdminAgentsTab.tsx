import React, { useMemo, useState } from 'react';
import { Award, Ban, CheckCircle2, Search, UserCheck, Wallet } from 'lucide-react';
import { adminSetRole, adminSetSuspended, isBdAgentProfile } from '../../lib/firestoreService';
import { Avatar } from '../ui/Avatar';
import { AdminSharedProps, getThemeClasses } from './adminTypes';

export const AdminAgentsTab: React.FC<AdminSharedProps> = ({
  theme,
  currentUser,
  users,
  wallets,
  transactions,
  onToast,
  onConfirm,
  onOpenUserProfile,
}) => {
  const t = getThemeClasses(theme);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'AGENT' | 'SUPER_AGENT' | 'BD_AGENT'>('ALL');

  const agents = useMemo(() => {
    return users
      .filter((u) => {
        const isAgency = u.accountType === 'AGENT' || u.accountType === 'SUPER_AGENT';
        if (!isAgency) return false;
        if (filter === 'AGENT' && u.accountType !== 'AGENT') return false;
        if (filter === 'SUPER_AGENT' && (u.accountType !== 'SUPER_AGENT' || isBdAgentProfile(u))) return false;
        if (filter === 'BD_AGENT' && !isBdAgentProfile(u)) return false;
        if (search.trim()) {
          const q = search.trim().toLowerCase();
          return (
            u.username?.toLowerCase().includes(q) ||
            u.displayName?.toLowerCase().includes(q) ||
            u.uid?.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .map((u) => {
        const w = wallets.find((x) => x.uid === u.uid);
        const txCount = transactions.filter((tx) => tx.counterparty === u.username).length;
        return { user: u, wallet: w, txCount };
      })
      .sort((a, b) => (b.wallet?.tradingCoinBalance || 0) - (a.wallet?.tradingCoinBalance || 0));
  }, [users, wallets, transactions, filter, search]);

  return (
    <div className="space-y-4">
      <div className={`${t.card} p-3.5 flex flex-wrap items-center justify-between gap-2.5`}>
        <div className="relative flex-1 min-w-[200px]">
          <Search className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 ${t.textMuted}`} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search agents or super agents..."
            className={`${t.input} pl-8`}
          />
        </div>
        <div className="flex items-center gap-1.5">
          {(['ALL', 'AGENT', 'SUPER_AGENT', 'BD_AGENT'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={filter === f ? t.btnPrimary : t.btnGhost}
            >
              {f.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {agents.length === 0 ? (
          <div className={`${t.card} p-8 text-center col-span-full ${t.textMuted}`}>
            No agents found matching your criteria.
          </div>
        ) : (
          agents.map(({ user: u, wallet: w, txCount }, idx) => (
            <div key={u.uid} className={`${t.card} p-4 space-y-3`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Avatar src={u.avatarUrl} name={u.displayName} size="sm" />
                  <div className="min-w-0">
                    <p className={`text-xs font-bold truncate ${t.textPrimary}`}>{u.displayName}</p>
                    <p className={`text-[10px] truncate ${t.textSecondary}`}>
                      @{u.username} • #{idx + 1} Rank
                    </p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-500/15 text-violet-300">
                  {isBdAgentProfile(u) ? 'BD AGENT' : u.accountType}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-[11px]">
                <div className={`${t.subCard} p-2`}>
                  <p className={t.textMuted}>Main Coins</p>
                  <p className={`font-bold ${t.textPrimary}`}>{(w?.coinBalance ?? 0).toLocaleString()}</p>
                </div>
                <div className={`${t.subCard} p-2`}>
                  <p className={t.textMuted}>Point Trading</p>
                  <p className={`font-bold text-emerald-400`}>{(w?.tradingCoinBalance ?? 0).toLocaleString()}</p>
                </div>
                <div className={`${t.subCard} p-2`}>
                  <p className={t.textMuted}>Tx Count</p>
                  <p className={`font-bold ${t.textPrimary}`}>{txCount}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button onClick={() => onOpenUserProfile(u)} className={`${t.btnGhost} flex-1`}>
                  <UserCheck className="w-3.5 h-3.5" /> Profile
                </button>
                <button
                  onClick={() =>
                    onConfirm({
                      title: u.isSuspended ? 'Activate Agent' : 'Suspend Agent',
                      body: `Confirm ${u.isSuspended ? 'activation' : 'suspension'} for @${u.username}?`,
                      confirmLabel: u.isSuspended ? 'Activate' : 'Suspend',
                      danger: !u.isSuspended,
                      run: async () => {
                        await adminSetSuspended(currentUser!, u, !u.isSuspended);
                        onToast('Agent status updated', `@${u.username}`, 'success');
                      },
                    })
                  }
                  className={u.isSuspended ? t.btnSuccess : t.btnDanger}
                >
                  {u.isSuspended ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                  {u.isSuspended ? 'Activate' : 'Suspend'}
                </button>
                {u.accountType === 'AGENT' && (
                  <button
                    onClick={() =>
                      onConfirm({
                        title: 'Promote to Super Agent',
                        body: `Promote @${u.username} to SUPER_AGENT?`,
                        confirmLabel: 'Promote',
                        run: async () => {
                          await adminSetRole(currentUser!, u, 'SUPER_AGENT');
                          onToast('Promoted to Super Agent', `@${u.username}`, 'success');
                        },
                      })
                    }
                    className={t.btnGhost}
                    title="Promote to Super Agent"
                  >
                    <Award className="w-3.5 h-3.5 text-amber-400" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
