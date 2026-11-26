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

export type AdminTab =
  | 'overview'
  | 'users'
  | 'roles'
  | 'wallet'
  | 'agents'
  | 'live'
  | 'reports'
  | 'games'
  | 'broadcast'
  | 'audit'
  | 'settings';

export type AdminTheme = 'dark' | 'light';

export interface ConfirmState {
  title: string;
  body: string;
  confirmLabel: string;
  danger?: boolean;
  run: () => Promise<unknown>;
}

export interface AdminNavItem {
  id: AdminTab;
  label: string;
  group: 'Core' | 'Operations' | 'System';
  badge?: number;
}

export interface AdminSharedProps {
  theme: AdminTheme;
  currentUser: UserProfile | null;
  users: UserProfile[];
  wallets: AdminWalletSnapshot[];
  transactions: WalletTransaction[];
  rooms: LiveRoom[];
  reports: ReportRecord[];
  promotions: AccountPromotionRecord[];
  auditLogs: AdminAuditRecord[];
  activeAnnouncement: AnnouncementRecord | null;
  isOffline: boolean;
  onToast: (
    title: string,
    desc?: string,
    tone?: 'info' | 'success' | 'warning' | 'error'
  ) => void;
  onConfirm: (state: ConfirmState) => void;
  onOpenUserProfile: (user: UserProfile) => void;
  onWatchRoom: (roomId: string) => void;
}

export const getThemeClasses = (theme: AdminTheme) => {
  const isDark = theme === 'dark';
  return {
    isDark,
    shell: isDark
      ? 'bg-[#07090E] text-slate-100'
      : 'bg-slate-50 text-slate-900',
    sidebar: isDark
      ? 'bg-[#0B0E16] border-white/[0.06]'
      : 'bg-white border-slate-200',
    topbar: isDark
      ? 'bg-[#0B0E16]/90 border-white/[0.06]'
      : 'bg-white/90 border-slate-200',
    card: isDark
      ? 'rounded-xl border border-white/[0.06] bg-[#0D111A]/90 shadow-sm'
      : 'rounded-xl border border-slate-200 bg-white shadow-sm',
    subCard: isDark
      ? 'rounded-lg border border-white/[0.05] bg-white/[0.02]'
      : 'rounded-lg border border-slate-200 bg-slate-50',
    input: isDark
      ? 'w-full h-9 px-3 rounded-lg bg-[#07090E]/80 border border-white/[0.08] text-xs text-white placeholder:text-slate-500 focus:border-violet-500/60 focus:outline-none focus:ring-1 focus:ring-violet-500/30 transition-all'
      : 'w-full h-9 px-3 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 placeholder:text-slate-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500/30 transition-all',
    textPrimary: isDark ? 'text-white' : 'text-slate-900',
    textSecondary: isDark ? 'text-slate-400' : 'text-slate-500',
    textMuted: isDark ? 'text-slate-500' : 'text-slate-400',
    border: isDark ? 'border-white/[0.06]' : 'border-slate-200',
    tableHead: isDark
      ? 'bg-white/[0.03] text-slate-400 border-b border-white/[0.06]'
      : 'bg-slate-50 text-slate-500 border-b border-slate-200',
    tableRow: isDark
      ? 'border-b border-white/[0.04] hover:bg-white/[0.02]'
      : 'border-b border-slate-100 hover:bg-slate-50',
    btnPrimary:
      'h-9 px-3.5 rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-xs font-semibold text-white shadow-md shadow-violet-900/20 transition-all active:scale-[0.98] inline-flex items-center justify-center gap-1.5 disabled:opacity-50',
    btnGhost: isDark
      ? 'h-9 px-3 rounded-lg border border-white/[0.08] bg-white/[0.03] text-xs font-medium text-slate-300 hover:text-white hover:bg-white/[0.08] transition-all inline-flex items-center justify-center gap-1.5 disabled:opacity-50'
      : 'h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-100 transition-all inline-flex items-center justify-center gap-1.5 disabled:opacity-50',
    btnDanger: isDark
      ? 'h-9 px-3 rounded-lg border border-rose-500/25 bg-rose-500/10 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 transition-all inline-flex items-center justify-center gap-1.5 disabled:opacity-50'
      : 'h-9 px-3 rounded-lg border border-rose-200 bg-rose-50 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-all inline-flex items-center justify-center gap-1.5 disabled:opacity-50',
    btnSuccess: isDark
      ? 'h-9 px-3 rounded-lg border border-emerald-500/25 bg-emerald-500/10 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20 transition-all inline-flex items-center justify-center gap-1.5 disabled:opacity-50'
      : 'h-9 px-3 rounded-lg border border-emerald-200 bg-emerald-50 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-all inline-flex items-center justify-center gap-1.5 disabled:opacity-50',
  };
};
