import React from 'react';
import {
  ArrowUpRight,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  X,
} from 'lucide-react';
import {
  AccountPromotionRecord,
  ReportRecord,
  UserProfile,
} from '../../types/app';
import { Avatar } from '../ui/Avatar';

interface AdminRolesViewProps {
  currentUser: UserProfile | null;
  isAdminUser: boolean;
  users: UserProfile[];
  promotions: AccountPromotionRecord[];
  reports: ReportRecord[];
  onPromoteUserToAgent: (target: UserProfile) => void;
  onResolveReport: (reportId: string) => void;
  onOpenAuth: () => void;
  onClose: () => void;
  isOffline: boolean;
}

export const AdminRolesView: React.FC<AdminRolesViewProps> = ({
  currentUser,
  isAdminUser,
  users,
  promotions,
  reports,
  onPromoteUserToAgent,
  onResolveReport,
  onOpenAuth,
  onClose,
  isOffline,
}) => {
  const isSuperAgent = currentUser?.accountType === 'SUPER_AGENT';
  const eligibleUsers = users.filter((u) => u.accountType === 'USER');

  return (
    <div className="space-y-8 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">
            Account IDs, Promotions & Safety
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Firestore-enforced RBAC: User ID, Agent ID, and Super Agent-only User-to-Agent promotion.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close Roles & Safety"
          className="self-start sm:self-auto w-9 h-9 rounded-full bg-white/[0.08] hover:bg-white/[0.15] border border-white/10 flex items-center justify-center text-white transition-colors shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Role Hierarchy Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-[#111420] border border-white/[0.08] p-5 space-y-1.5">
          <p className="text-xs font-mono text-slate-400">ACCOUNT TYPE: USER</p>
          <h2 className="font-display text-base font-semibold text-white">User ID</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Default registered account. Can watch, host rooms, chat, follow, and send gifts. Cannot promote users.
          </p>
        </div>

        <div className="rounded-2xl bg-[#111420] border border-white/[0.08] p-5 space-y-1.5">
          <p className="text-xs font-mono text-sky-400">ACCOUNT TYPE: AGENT</p>
          <h2 className="font-display text-base font-semibold text-white">Agent ID</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Granted only when an authorized Super Agent promotes an eligible User. Cannot promote other users.
          </p>
        </div>

        <div className="rounded-2xl bg-[#111420] border border-violet-500/30 p-5 space-y-1.5">
          <p className="text-xs font-mono text-violet-400">ACCOUNT TYPE: SUPER_AGENT</p>
          <h2 className="font-display text-base font-semibold text-white">Super Agent ID</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Assigned only by platform admin. Authorized by Firestore Security Rules to promote eligible User accounts to Agent with immutable audit logs.
          </p>
        </div>
      </div>

      {!currentUser ? (
        <div className="rounded-2xl bg-[#111420] border border-white/[0.08] p-8 text-center space-y-3">
          <p className="font-display text-base font-semibold text-white">
            Sign in to view account role controls and safety reports
          </p>
          <button
            type="button"
            onClick={onOpenAuth}
            className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-semibold text-white"
          >
            Open Sign-In Page
          </button>
        </div>
      ) : (
        <>
          {/* Super Agent Promotion Workflow */}
          <section className="rounded-2xl bg-[#111420] border border-white/[0.08] p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-violet-400" />
                <h2 className="font-display text-base font-semibold text-white">
                  Promote Eligible User to Agent
                </h2>
              </div>
              <span className="text-xs text-slate-400">
                Your Account Type:{' '}
                <strong className="font-mono text-white">
                  {currentUser.accountType}
                </strong>
              </span>
            </div>

            {!isSuperAgent && (
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/25 px-4 py-3 text-xs text-amber-200">
                Firestore Security Rules enforce that only a verified{' '}
                <strong className="font-mono">SUPER_AGENT</strong> can promote a{' '}
                <strong className="font-mono">USER</strong> to <strong className="font-mono">AGENT</strong>.
                Admin accounts handle safety moderation only.
              </div>
            )}

            {eligibleUsers.length === 0 ? (
              <p className="text-xs text-slate-400">
                No eligible USER accounts found in Firestore yet.
              </p>
            ) : (
              <div className="divide-y divide-white/[0.06]">
                {eligibleUsers.map((user) => (
                  <div
                    key={user.uid}
                    className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar name={user.displayName} color={user.avatarColor} size="sm" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {user.displayName}{' '}
                          <span className="text-xs text-slate-400 font-normal">
                            @{user.username}
                          </span>
                        </p>
                        <p className="text-xs text-slate-400 font-mono">
                          {user.platformId} · Current: {user.accountType}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={!isSuperAgent || isOffline}
                      onClick={() => onPromoteUserToAgent(user)}
                      className="px-3.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:bg-white/[0.06] disabled:text-slate-500 disabled:cursor-not-allowed text-xs font-medium text-white inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      <span>Promote to Agent</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Immutable Promotion Audit Trail */}
          <section className="space-y-3">
            <h2 className="font-display text-lg font-semibold text-white">
              Account Promotion Audit Trail
            </h2>
            <div className="rounded-2xl bg-[#111420] border border-white/[0.08] overflow-hidden">
              {promotions.length === 0 ? (
                <p className="p-6 text-xs text-slate-400">
                  No promotions recorded in Firestore yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/[0.08] text-[11px] font-medium text-slate-400">
                        <th className="py-3 px-4">Timestamp</th>
                        <th className="py-3 px-4">Super Agent Actor</th>
                        <th className="py-3 px-4">Target Account</th>
                        <th className="py-3 px-4">Transition</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.06] text-xs">
                      {promotions.map((record) => (
                        <tr key={record.promotionId}>
                          <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">
                            {record.timestampLabel}
                          </td>
                          <td className="py-3 px-4 text-slate-200">
                            @{record.actorUsername}
                          </td>
                          <td className="py-3 px-4 text-white font-medium">
                            @{record.targetUsername}
                          </td>
                          <td className="py-3 px-4 font-mono text-sky-300 whitespace-nowrap">
                            {record.beforeType} → {record.afterType}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>

          {/* Moderation & Report Queue */}
          <section className="space-y-3">
            <h2 className="font-display text-lg font-semibold text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
              <span>Safety & Report Queue</span>
            </h2>

            <div className="rounded-2xl bg-[#111420] border border-white/[0.08] divide-y divide-white/[0.06]">
              {reports.length === 0 ? (
                <p className="p-6 text-xs text-slate-400">
                  No open safety reports in Firestore.
                </p>
              ) : (
                reports.map((report) => (
                  <div
                    key={report.reportId}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-white">
                        {report.targetLabel}{' '}
                        <span className="text-xs text-slate-400 font-mono">
                          ({report.targetType})
                        </span>
                      </p>
                      <p className="text-xs text-slate-400">
                        Reason: {report.reason} · Reported by @{report.reporterUsername} ·{' '}
                        {report.timestampLabel}
                      </p>
                    </div>

                    {report.status === 'RESOLVED' ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 shrink-0">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Resolved</span>
                      </span>
                    ) : isSuperAgent || isAdminUser ? (
                      <button
                        type="button"
                        onClick={() => onResolveReport(report.reportId)}
                        className="px-3.5 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-xs font-medium text-white shrink-0"
                      >
                        Mark Resolved
                      </button>
                    ) : (
                      <span className="text-xs font-mono text-amber-300">
                        {report.status}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
};
