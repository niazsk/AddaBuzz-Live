import React, { useMemo, useState } from 'react';
import { CheckCircle2, ShieldAlert, Trash2 } from 'lucide-react';
import { adminDeleteReport } from '../../lib/firestoreService';
import { AdminSharedProps, getThemeClasses } from './adminTypes';

interface AdminReportsTabProps extends AdminSharedProps {
  onResolveReport: (reportId: string) => Promise<void>;
}

export const AdminReportsTab: React.FC<AdminReportsTabProps> = ({
  theme,
  currentUser,
  reports,
  onResolveReport,
  onToast,
  onConfirm,
}) => {
  const t = getThemeClasses(theme);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'RESOLVED'>('ALL');
  const [notes, setNotes] = useState<Record<string, string>>({});

  const filtered = useMemo(() => {
    return reports.filter((r) => {
      if (statusFilter === 'OPEN') return r.status !== 'RESOLVED';
      if (statusFilter === 'RESOLVED') return r.status === 'RESOLVED';
      return true;
    });
  }, [reports, statusFilter]);

  return (
    <div className="space-y-4">
      <div className={`${t.card} p-3.5 flex items-center justify-between gap-2`}>
        <h3 className={`text-sm font-bold flex items-center gap-2 ${t.textPrimary}`}>
          <ShieldAlert className="w-4 h-4 text-rose-400" />
          Moderation & Reports ({filtered.length})
        </h3>
        <div className="flex items-center gap-1.5">
          {(['ALL', 'OPEN', 'RESOLVED'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={statusFilter === st ? t.btnPrimary : t.btnGhost}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2.5">
        {filtered.length === 0 ? (
          <div className={`${t.card} p-8 text-center ${t.textMuted}`}>
            No reports in this queue.
          </div>
        ) : (
          filtered.map((rep) => (
            <div key={rep.reportId} className={`${t.card} p-4 space-y-2.5`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className={`text-xs font-bold ${t.textPrimary}`}>{rep.reason}</p>
                  <p className={`text-[10px] ${t.textSecondary}`}>
                    Reporter: @{rep.reporterUsername} • Target: {rep.targetLabel} ({rep.targetType})
                  </p>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    rep.status === 'RESOLVED'
                      ? 'bg-emerald-500/15 text-emerald-300'
                      : 'bg-rose-500/15 text-rose-300'
                  }`}
                >
                  {rep.status}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <input
                  type="text"
                  value={notes[rep.reportId] || ''}
                  onChange={(e) => setNotes((prev) => ({ ...prev, [rep.reportId]: e.target.value }))}
                  placeholder="Internal moderation note..."
                  className={`${t.input} flex-1 min-w-[180px]`}
                />
                {rep.status !== 'RESOLVED' && (
                  <button
                    onClick={() =>
                      onConfirm({
                        title: 'Resolve Report',
                        body: `Mark report "${rep.reason}" as resolved?`,
                        confirmLabel: 'Resolve',
                        run: async () => {
                          await onResolveReport(rep.reportId);
                          onToast('Report resolved', rep.reportId, 'success');
                        },
                      })
                    }
                    className={t.btnSuccess}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Resolve
                  </button>
                )}
                <button
                  onClick={() =>
                    onConfirm({
                      title: 'Delete Report',
                      body: 'Permanently remove this report record?',
                      confirmLabel: 'Delete',
                      danger: true,
                      run: async () => {
                        await adminDeleteReport(currentUser!, rep.reportId);
                        onToast('Report deleted', rep.reportId, 'warning');
                      },
                    })
                  }
                  className={t.btnDanger}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
