import React, { useMemo, useState } from 'react';
import { ScrollText, Search } from 'lucide-react';
import { AdminSharedProps, getThemeClasses } from './adminTypes';

export const AdminAuditTab: React.FC<AdminSharedProps> = ({ theme, auditLogs }) => {
  const t = getThemeClasses(theme);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return auditLogs;
    const q = search.trim().toLowerCase();
    return auditLogs.filter(
      (l) =>
        l.action?.toLowerCase().includes(q) ||
        l.actorUid?.toLowerCase().includes(q) ||
        l.targetId?.toLowerCase().includes(q)
    );
  }, [auditLogs, search]);

  return (
    <div className="space-y-4">
      <div className={`${t.card} p-3.5 flex flex-wrap items-center justify-between gap-2.5`}>
        <h3 className={`text-sm font-bold flex items-center gap-2 ${t.textPrimary}`}>
          <ScrollText className="w-4 h-4 text-violet-400" />
          Immutable Audit Logs ({filtered.length})
        </h3>
        <div className="relative w-64">
          <Search className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 ${t.textMuted}`} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by action or UID..."
            className={`${t.input} pl-8`}
          />
        </div>
      </div>

      <div className={`${t.card} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className={t.tableHead}>
                <th className="py-2.5 px-4 font-semibold">Timestamp</th>
                <th className="py-2.5 px-4 font-semibold">Admin UID</th>
                <th className="py-2.5 px-4 font-semibold">Action</th>
                <th className="py-2.5 px-4 font-semibold">Target</th>
                <th className="py-2.5 px-4 font-semibold">Details</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className={`py-8 text-center ${t.textMuted}`}>
                    No audit records found.
                  </td>
                </tr>
              ) : (
                filtered.map((log) => (
                  <tr key={log.auditId} className={t.tableRow}>
                    <td className={`py-2.5 px-4 ${t.textMuted}`}>
                      {log.timestampLabel || '—'}
                    </td>
                    <td className={`py-2.5 px-4 font-mono text-[10px] ${t.textSecondary}`}>
                      @{log.actorUsername || log.actorUid}
                    </td>
                    <td className={`py-2.5 px-4 font-semibold ${t.textPrimary}`}>{log.action}</td>
                    <td className={`py-2.5 px-4 font-mono text-[10px] ${t.textSecondary}`}>
                      {log.targetId || 'Platform'}
                    </td>
                    <td className={`py-2.5 px-4 ${t.textSecondary}`}>
                      {log.detail || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
