import React, { useState } from 'react';
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
  const [promoteId, setPromoteId] = useState('');
  const [promoteMsg, setPromoteMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const handlePromoteById = () => {
    const id = promoteId.trim();
    if (!id) {
      setPromoteMsg({ ok: false, text: 'Enter a user ID first.' });
      return;
    }
    const target = users.find((u) => u.platformId === id);
    if (!target) {
      setPromoteMsg({ ok: false, text: `No account found with ID ${id}.` });
      return;
    }
    if (target.accountType !== 'USER') {
      setPromoteMsg({
        ok: false,
        text: `ID ${id} is already ${target.accountType}. Only USER accounts can be promoted.`,
      });
      return;
    }
    onPromoteUserToAgent(target);
    setPromoteMsg({ ok: true, text: `ID ${id} (${target.displayName}) is now an Agent.` });
    setPromoteId('');
  };

  return (
    <div className="space-y-8 pb-8">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close Roles & Safety"
          className="w-9 h-9 rounded-full bg-white/[0.08] hover:bg-white/[0.15] border border-white/10 flex items-center justify-center text-white transition-colors shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
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
                <strong className="font-mono">BD_AGENT</strong> can promote a{' '}
                <strong className="font-mono">USER</strong> to <strong className="font-mono">AGENT</strong>.
                Admin accounts handle safety moderation only.
              </div>
            )}

            <div className="space-y-3">
              <input
                type="text"
                inputMode="numeric"
                value={promoteId}
                onChange={(e) => {
                  setPromoteId(e.target.value);
                  setPromoteMsg(null);
                }}
                placeholder="Enter User ID (e.g. 112201)"
                aria-label="User ID to promote"
                className="w-full h-11 px-4 rounded-xl bg-[#0B0D14] border border-white/[0.08] focus:border-violet-500/60 focus:outline-none text-sm text-white placeholder:text-slate-500 font-mono transition-colors"
              />
              <button
                type="button"
                disabled={!isSuperAgent || isOffline}
                onClick={handlePromoteById}
                className="w-full px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:bg-white/[0.06] disabled:text-slate-500 disabled:cursor-not-allowed text-sm font-medium text-white inline-flex items-center justify-center gap-1.5 transition-colors"
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>Promote to Agent</span>
              </button>
              {promoteMsg && (
                <p
                  className={`text-xs ${
                    promoteMsg.ok ? 'text-emerald-300' : 'text-rose-300'
                  }`}
                >
                  {promoteMsg.text}
                </p>
              )}
            </div>
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
                        <th className="py-3 px-4">BD Agent Actor</th>
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
