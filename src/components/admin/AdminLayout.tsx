import React, { useState } from 'react';
import {
  ArrowLeft,
  Bell,
  ChevronRight,
  Gamepad2,
  LayoutDashboard,
  Megaphone,
  Menu,
  Moon,
  Radio,
  ScrollText,
  Search,
  Settings,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sun,
  UserCheck,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { UserProfile } from '../../types/app';
import { Avatar } from '../ui/Avatar';
import { AdminNavItem, AdminTab, AdminTheme, getThemeClasses } from './adminTypes';

interface AdminLayoutProps {
  activeTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
  theme: AdminTheme;
  onToggleTheme: () => void;
  globalSearch: string;
  onGlobalSearchChange: (q: string) => void;
  currentUser: UserProfile | null;
  openReportsCount: number;
  activeRoomsCount: number;
  pendingTxCount: number;
  isOffline: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

const TAB_ICONS: Record<AdminTab, React.ReactNode> = {
  overview: <LayoutDashboard className="w-4 h-4" />,
  users: <Users className="w-4 h-4" />,
  roles: <Shield className="w-4 h-4" />,
  wallet: <Wallet className="w-4 h-4" />,
  agents: <UserCheck className="w-4 h-4" />,
  live: <Radio className="w-4 h-4" />,
  reports: <ShieldAlert className="w-4 h-4" />,
  games: <Gamepad2 className="w-4 h-4" />,
  broadcast: <Megaphone className="w-4 h-4" />,
  audit: <ScrollText className="w-4 h-4" />,
  settings: <Settings className="w-4 h-4" />,
};

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  activeTab,
  onSelectTab,
  theme,
  onToggleTheme,
  globalSearch,
  onGlobalSearchChange,
  currentUser,
  openReportsCount,
  activeRoomsCount,
  pendingTxCount,
  isOffline,
  onClose,
  children,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const t = getThemeClasses(theme);

  const navItems: AdminNavItem[] = [
    { id: 'overview', label: 'Dashboard Overview', group: 'Core' },
    { id: 'users', label: 'User Management', group: 'Core' },
    { id: 'roles', label: 'Roles & Permissions', group: 'Core' },
    { id: 'wallet', label: 'Wallet & Economy', group: 'Operations', badge: pendingTxCount },
    { id: 'agents', label: 'Agent Management', group: 'Operations' },
    { id: 'live', label: 'Live Rooms', group: 'Operations', badge: activeRoomsCount },
    { id: 'reports', label: 'Reports & Moderation', group: 'Operations', badge: openReportsCount },
    { id: 'games', label: 'Games & Rewards', group: 'Operations' },
    { id: 'broadcast', label: 'Broadcast & Alerts', group: 'System' },
    { id: 'audit', label: 'Audit Logs', group: 'System' },
    { id: 'settings', label: 'Security & Settings', group: 'System' },
  ];

  const activeItem = navItems.find((i) => i.id === activeTab) ?? navItems[0];
  const groups: Array<'Core' | 'Operations' | 'System'> = ['Core', 'Operations', 'System'];

  const renderNavContent = (isMobile = false) => (
    <div className="flex flex-col h-full">
      <div className={`px-4 py-4 border-b ${t.border} flex items-center justify-between`}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center text-white shadow-md shadow-violet-900/30">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <p className={`text-xs font-bold tracking-tight ${t.textPrimary}`}>AddaBuzz Admin</p>
            <p className="text-[10px] text-violet-400 font-medium">Super Admin Console</p>
          </div>
        </div>
        {isMobile && (
          <button
            onClick={() => setMobileMenuOpen(false)}
            className={`p-1.5 rounded-lg ${t.textSecondary} hover:bg-white/5`}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-5">
        {groups.map((group) => (
          <div key={group}>
            <p className={`px-2.5 mb-1.5 text-[10px] font-semibold uppercase tracking-wider ${t.textMuted}`}>
              {group}
            </p>
            <div className="space-y-0.5">
              {navItems
                .filter((item) => item.group === group)
                .map((item) => {
                  const active = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onSelectTab(item.id);
                        if (isMobile) setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-all ${
                        active
                          ? 'bg-gradient-to-r from-violet-600/20 to-blue-600/15 text-violet-400 border border-violet-500/25'
                          : `${t.textSecondary} hover:bg-white/[0.04] hover:text-white border border-transparent`
                      }`}
                    >
                      <span className="flex items-center gap-2.5 truncate">
                        {TAB_ICONS[item.id]}
                        <span className="truncate">{item.label}</span>
                      </span>
                      {typeof item.badge === 'number' && item.badge > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-violet-600/25 text-violet-300">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
            </div>
          </div>
        ))}
      </div>

      <div className={`p-3 border-t ${t.border}`}>
        <button onClick={onClose} className={`${t.btnGhost} w-full justify-start`}>
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to AddaBuzz</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen flex ${t.shell}`}>
      {/* Desktop Sidebar */}
      <aside className={`hidden lg:flex lg:flex-col w-64 shrink-0 border-r ${t.sidebar} sticky top-0 h-screen`}>
        {renderNavContent(false)}
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className={`relative w-72 max-w-[85vw] h-full border-r ${t.sidebar} z-10`}>
            {renderNavContent(true)}
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navigation Bar */}
        <header className={`sticky top-0 z-30 h-14 px-4 lg:px-6 border-b backdrop-blur-md flex items-center justify-between gap-3 ${t.topbar}`}>
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className={`lg:hidden p-2 rounded-lg border ${t.border} ${t.textSecondary}`}
              aria-label="Open admin menu"
            >
              <Menu className="w-4 h-4" />
            </button>
            <nav className="hidden sm:flex items-center gap-1.5 text-xs">
              <span className={t.textMuted}>Admin</span>
              <ChevronRight className={`w-3.5 h-3.5 ${t.textMuted}`} />
              <span className={`font-semibold ${t.textPrimary}`}>{activeItem.label}</span>
            </nav>
            {isOffline && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/25">
                Offline
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {/* Global Search */}
            <div className="relative hidden md:block w-64">
              <Search className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 ${t.textMuted}`} />
              <input
                type="text"
                value={globalSearch}
                onChange={(e) => onGlobalSearchChange(e.target.value)}
                placeholder="Global search (UID, user, room)..."
                className={`${t.input} pl-8 h-8`}
              />
            </div>

            {/* Theme Toggle */}
            <button
              onClick={onToggleTheme}
              className={`p-2 rounded-lg border ${t.border} ${t.textSecondary} hover:text-violet-400 transition-colors`}
              title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Notification Center */}
            <div className="relative">
              <button
                onClick={() => {
                  setNotifOpen((v) => !v);
                  setProfileOpen(false);
                }}
                className={`p-2 rounded-lg border ${t.border} ${t.textSecondary} hover:text-violet-400 relative`}
              >
                <Bell className="w-4 h-4" />
                {openReportsCount + pendingTxCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-[9px] font-bold text-white flex items-center justify-center">
                    {Math.min(99, openReportsCount + pendingTxCount)}
                  </span>
                )}
              </button>
              {notifOpen && (
                <div className={`absolute right-0 mt-2 w-72 p-3 z-40 ${t.card}`}>
                  <p className={`text-xs font-bold mb-2 ${t.textPrimary}`}>Admin Alerts</p>
                  <div className="space-y-1.5 text-xs">
                    <button
                      onClick={() => {
                        onSelectTab('reports');
                        setNotifOpen(false);
                      }}
                      className={`w-full text-left p-2 rounded-lg ${t.subCard} flex items-center justify-between`}
                    >
                      <span>Open Reports</span>
                      <span className="font-bold text-rose-400">{openReportsCount}</span>
                    </button>
                    <button
                      onClick={() => {
                        onSelectTab('wallet');
                        setNotifOpen(false);
                      }}
                      className={`w-full text-left p-2 rounded-lg ${t.subCard} flex items-center justify-between`}
                    >
                      <span>Pending Transactions</span>
                      <span className="font-bold text-amber-400">{pendingTxCount}</span>
                    </button>
                    <button
                      onClick={() => {
                        onSelectTab('live');
                        setNotifOpen(false);
                      }}
                      className={`w-full text-left p-2 rounded-lg ${t.subCard} flex items-center justify-between`}
                    >
                      <span>Active Live Rooms</span>
                      <span className="font-bold text-emerald-400">{activeRoomsCount}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Admin Profile Menu */}
            <div className="relative">
              <button
                onClick={() => {
                  setProfileOpen((v) => !v);
                  setNotifOpen(false);
                }}
                className={`flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-lg border ${t.border}`}
              >
                <Avatar
                  src={currentUser?.avatarUrl}
                  name={currentUser?.displayName || 'Admin'}
                  size="sm"
                />
                <div className="hidden sm:block text-left">
                  <p className={`text-[11px] font-semibold leading-tight ${t.textPrimary}`}>
                    {currentUser?.displayName || 'Super Admin'}
                  </p>
                  <p className="text-[9px] text-violet-400 font-medium">SUPER ADMIN</p>
                </div>
              </button>
              {profileOpen && (
                <div className={`absolute right-0 mt-2 w-52 p-2 z-40 ${t.card}`}>
                  <div className={`px-2.5 py-2 border-b ${t.border} mb-1`}>
                    <p className={`text-xs font-semibold truncate ${t.textPrimary}`}>
                      {currentUser?.displayName}
                    </p>
                    <p className={`text-[10px] truncate ${t.textMuted}`}>
                      @{currentUser?.username}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      onSelectTab('settings');
                      setProfileOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs ${t.textSecondary} hover:bg-white/5`}
                  >
                    Security & Settings
                  </button>
                  <button
                    onClick={onClose}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-rose-400 hover:bg-rose-500/10"
                  >
                    Exit Admin Console
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Body */}
        <main className="flex-1 p-4 lg:p-6 max-w-[1600px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
