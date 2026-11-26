import React, { useState } from 'react';
import { Shield, ShieldCheck } from 'lucide-react';
import { adminDemoteToUser, adminSetRole, isBdAgentProfile } from '../../lib/firestoreService';
import { AccountType, UserProfile } from '../../types/app';
import { Avatar } from '../ui/Avatar';
import { AdminSharedProps, getThemeClasses } from './adminTypes';

const ROLE_MATRIX = [
  { role: 'Super Admin', scope: 'Full platform, roles, wallet config, agents, live rooms, audit logs, settings' },
  { role: 'BD Agent', scope: 'Explicitly authorized BD management features only (Platform ID 111112)' },
  { role: 'Super Agent', scope: 'Manage assigned agents, transfer points to agents, view permitted transactions (Point Wallet only)' },
  { role: 'Agent', scope: 'Manage assigned users, approve diamond transfer requests, Agent Point Trading (Main Coin + Point Trading)' },
  { role: 'Host', scope: 'Create & host live rooms, manage room moderators & guest seats' },
  { role: 'Normal User', scope: 'Watch live rooms, send gifts, convert coins to diamonds, standard social features' },
];

export const AdminRolesTab: React.FC<AdminSharedProps> = ({
  theme,
  currentUser,
  users,
  onToast,
  onConfirm,
}) => {
  const t = getThemeClasses(theme);
  const [search, setSearch] = useState('');
  const [targetRole, setTargetRole] = useState<AccountType>('AGENT');

  const filtered = users
    .filter((u) => {
      const q = search.trim().toLowerCase();
      if (!q) return u.accountType !== 'USER';
      return (
        u.username?.toLowerCase().includes(q) ||
        u.displayName?.toLowerCase().includes(q) ||
        u.uid?.toLowerCase().includes(q)
      );
    })
    .slice(0, 25);

  const handleAssignRole = (u: UserProfile, role: AccountType) => {
    onConfirm({
      title: `Change Role to ${role}`,
      body: `Update @${u.username} from ${u.accountType} to ${role}? This action is recorded in Audit Logs.`,
      confirmLabel: 'Confirm Role Change',
      run: async () => {
        if (role === 'USER') {
          await adminDemoteToUser(currentUser!, u);
        } else {
          await adminSetRole(currentUser!, u, role);
        }
        onToast('Role updated', `@${u.username} is now ${role}`, 'success');
      },
    });
  };

  return (
    <div className="space-y-5">
      {/* Role & Permission Matrix */}
      <div className={`${t.card} p-4`}>
        <h3 className={`text-sm font-bold mb-3 flex items-center gap-2 ${t.textPrimary}`}>
          <ShieldCheck className="w-4 h-4 text-violet-400" />
          Role-Based Access Control (RBAC) Matrix
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {ROLE_MATRIX.map((item) => (
            <div key={item.role} className={`${t.subCard} p-3`}>
              <p className={`text-xs font-bold ${t.textPrimary}`}>{item.role}</p>
              <p className={`text-[11px] mt-1 ${t.textSecondary}`}>{item.scope}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Role Assignment */}
      <div className={`${t.card} p-4 space-y-3`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className={`text-sm font-bold flex items-center gap-2 ${t.textPrimary}`}>
            <Shield className="w-4 h-4 text-blue-400" />
            Manage Privileged & User Roles
          </h3>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search user to assign role..."
              className={`${t.input} w-56`}
            />
            <select
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value as AccountType)}
              className={`${t.input} w-36`}
            >
              <option value="AGENT">AGENT</option>
              <option value="SUPER_AGENT">SUPER_AGENT</option>
              <option value="USER">USER</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          {filtered.map((u) => (
            <div key={u.uid} className={`${t.subCard} p-3 flex items-center justify-between gap-3`}>
              <div className="flex items-center gap-2.5 min-w-0">
                <Avatar src={u.avatarUrl} name={u.displayName} size="sm" />
                <div className="min-w-0">
                  <p className={`text-xs font-semibold truncate ${t.textPrimary}`}>{u.displayName}</p>
                  <p className={`text-[10px] truncate ${t.textSecondary}`}>
                    @{u.username} • Current: {isBdAgentProfile(u) ? 'BD_AGENT' : u.accountType}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => handleAssignRole(u, targetRole)}
                  className={t.btnPrimary}
                >
                  Set {targetRole}
                </button>
                {u.accountType !== 'USER' && (
                  <button
                    onClick={() => handleAssignRole(u, 'USER')}
                    className={t.btnDanger}
                  >
                    Demote
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
