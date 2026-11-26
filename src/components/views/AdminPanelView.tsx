import React, { useEffect, useState } from 'react';
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
  subscribeActiveAnnouncement,
  subscribeAdminAudit,
  subscribeAllUsers,
  subscribeAllWallets,
  subscribeWalletTransactions,
} from '../../lib/firestoreService';
import { AdminLayout } from '../admin/AdminLayout';
import { AdminOverviewTab } from '../admin/AdminOverviewTab';
import { AdminUsersTab } from '../admin/AdminUsersTab';
import { AdminRolesTab } from '../admin/AdminRolesTab';
import { AdminWalletTab } from '../admin/AdminWalletTab';
import { AdminAgentsTab } from '../admin/AdminAgentsTab';
import { AdminLiveRoomsTab } from '../admin/AdminLiveRoomsTab';
import { AdminReportsTab } from '../admin/AdminReportsTab';
import { AdminGamesTab } from '../admin/AdminGamesTab';
import { AdminBroadcastTab } from '../admin/AdminBroadcastTab';
import { AdminAuditTab } from '../admin/AdminAuditTab';
import { AdminSettingsTab } from '../admin/AdminSettingsTab';
import { AdminTab, AdminTheme, ConfirmState, getThemeClasses } from '../admin/adminTypes';

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
  const [theme, setTheme] = useState<AdminTheme>('dark');
  const [globalSearch, setGlobalSearch] = useState('');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [wallets, setWallets] = useState<AdminWalletSnapshot[]>([]);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditRecord[]>([]);
  const [activeAnnouncement, setActiveAnnouncement] = useState<AnnouncementRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  const t = getThemeClasses(theme);

  useEffect(() => {
    setLoading(true);
    const unsubUsers = subscribeAllUsers((list) => {
      setUsers(list);
      setLoading(false);
    });
    const unsubWallets = subscribeAllWallets((list) => setWallets(list));
    const unsubTx = currentUser?.uid
      ? subscribeWalletTransactions(currentUser.uid, (list: WalletTransaction[]) => setTransactions(list))
      : () => {};
    const unsubAudit = subscribeAdminAudit((list) => setAuditLogs(list));
    const unsubAnn = subscribeActiveAnnouncement((ann) => setActiveAnnouncement(ann));

    return () => {
      unsubUsers();
      unsubWallets();
      unsubTx();
      unsubAudit();
      unsubAnn();
    };
  }, []);

  const openReportsCount = reports.filter((r) => r.status !== 'RESOLVED').length;
  const activeRoomsCount = rooms.filter((r) => r.status === 'LIVE').length;
  const pendingTxCount = 0;

  const sharedProps = {
    theme,
    currentUser,
    users,
    wallets,
    transactions,
    rooms,
    reports,
    promotions,
    auditLogs,
    activeAnnouncement,
    isOffline,
    onToast,
    onConfirm: (state: ConfirmState) => setConfirmState(state),
    onOpenUserProfile,
    onWatchRoom,
  };

  const handleConfirmRun = async () => {
    if (!confirmState) return;
    setConfirmBusy(true);
    try {
      await confirmState.run();
      setConfirmState(null);
    } catch (err) {
      onToast(
        'Action failed',
        err instanceof Error ? err.message : 'Operation failed',
        'error'
      );
    } finally {
      setConfirmBusy(false);
    }
  };

  return (
    <>
      <AdminLayout
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        theme={theme}
        onToggleTheme={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
        globalSearch={globalSearch}
        onGlobalSearchChange={(q) => {
          setGlobalSearch(q);
          if (q.trim() && activeTab === 'overview') setActiveTab('users');
        }}
        currentUser={currentUser}
        openReportsCount={openReportsCount}
        activeRoomsCount={activeRoomsCount}
        pendingTxCount={pendingTxCount}
        isOffline={isOffline}
        onClose={onClose}
      >
        {activeTab === 'overview' && <AdminOverviewTab {...sharedProps} loading={loading} />}
        {activeTab === 'users' && <AdminUsersTab {...sharedProps} globalSearch={globalSearch} />}
        {activeTab === 'roles' && <AdminRolesTab {...sharedProps} />}
        {activeTab === 'wallet' && <AdminWalletTab {...sharedProps} />}
        {activeTab === 'agents' && <AdminAgentsTab {...sharedProps} />}
        {activeTab === 'live' && <AdminLiveRoomsTab {...sharedProps} />}
        {activeTab === 'reports' && (
          <AdminReportsTab {...sharedProps} onResolveReport={onResolveReport} />
        )}
        {activeTab === 'games' && <AdminGamesTab {...sharedProps} />}
        {activeTab === 'broadcast' && <AdminBroadcastTab {...sharedProps} />}
        {activeTab === 'audit' && <AdminAuditTab {...sharedProps} />}
        {activeTab === 'settings' && <AdminSettingsTab {...sharedProps} />}
      </AdminLayout>

      {/* Confirmation Dialog */}
      {confirmState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className={`${t.card} w-full max-w-md p-5 space-y-4`}>
            <h3 className={`text-sm font-bold ${t.textPrimary}`}>{confirmState.title}</h3>
            <p className={`text-xs ${t.textSecondary}`}>{confirmState.body}</p>
            <div className="flex justify-end gap-2">
              <button
                disabled={confirmBusy}
                onClick={() => setConfirmState(null)}
                className={t.btnGhost}
              >
                Cancel
              </button>
              <button
                disabled={confirmBusy}
                onClick={handleConfirmRun}
                className={confirmState.danger ? t.btnDanger : t.btnPrimary}
              >
                {confirmBusy ? 'Processing...' : confirmState.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
