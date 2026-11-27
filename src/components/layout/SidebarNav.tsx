import React from 'react';
import {
  House,
  UsersRound,
  MessagesSquare,
  CircleUserRound,
  Radio,
  LogIn,
  LogOut,
  Joystick,
  LayoutDashboard,
} from 'lucide-react';
import { AppSection, UserProfile } from '../../types/app';
import { BrandLogo } from '../ui/BrandLogo';
import { Avatar } from '../ui/Avatar';
import { PWAInstallButton } from '../ui/PWAInstallButton';
import { ThemeToggle } from '../ui/ThemeToggle';

interface SidebarNavProps {
  activeSection: AppSection;
  onSelectSection: (section: AppSection) => void;
  onOpenGoLive: () => void;
  onOpenAuth: () => void;
  onSignOut: () => void;
  currentUser: UserProfile | null;
  unreadMessagesCount: number;
  isOffline: boolean;
  isAdminUser?: boolean;
  hideWallet?: boolean;
}

type NavItem = {
  id: AppSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  idleChip: string;
  activeChip: string;
};

const NAV_ITEMS: NavItem[] = [
  {
    id: 'discover',
    label: 'Home',
    icon: House,
    idleChip: 'bg-sky-500/12 text-sky-300',
    activeChip:
      'bg-gradient-to-br from-sky-300 via-sky-500 to-blue-600 text-white shadow-lg shadow-sky-500/40 ring-1 ring-white/25',
  },
  {
    id: 'following',
    label: 'Friends',
    icon: UsersRound,
    idleChip: 'bg-rose-500/12 text-rose-300',
    activeChip:
      'bg-gradient-to-br from-rose-300 via-pink-500 to-fuchsia-600 text-white shadow-lg shadow-rose-500/40 ring-1 ring-white/25',
  },
  {
    id: 'messages',
    label: 'Messages',
    icon: MessagesSquare,
    idleChip: 'bg-emerald-500/12 text-emerald-300',
    activeChip:
      'bg-gradient-to-br from-emerald-300 via-teal-500 to-cyan-600 text-white shadow-lg shadow-emerald-500/40 ring-1 ring-white/25',
  },
  {
    id: 'games',
    label: 'Games',
    icon: Joystick,
    idleChip: 'bg-violet-500/12 text-violet-300',
    activeChip:
      'bg-gradient-to-br from-violet-300 via-purple-500 to-fuchsia-600 text-white shadow-lg shadow-violet-500/40 ring-1 ring-white/25',
  },
  {
    id: 'profile',
    label: 'Profile',
    icon: CircleUserRound,
    idleChip: 'bg-amber-500/12 text-amber-300',
    activeChip:
      'bg-gradient-to-br from-amber-300 via-orange-500 to-rose-500 text-white shadow-lg shadow-amber-500/40 ring-1 ring-white/25',
  },
  {
    id: 'admin-panel',
    label: 'Admin Panel',
    icon: LayoutDashboard,
    idleChip: 'bg-slate-500/15 text-slate-300',
    activeChip:
      'bg-gradient-to-br from-slate-300 via-slate-400 to-slate-500 text-slate-900 shadow-lg shadow-slate-500/40 ring-1 ring-white/25',
  },
];

export const SidebarNav: React.FC<SidebarNavProps> = ({
  activeSection,
  onSelectSection,
  onOpenGoLive,
  onOpenAuth,
  onSignOut,
  currentUser,
  unreadMessagesCount,
  isOffline,
  hideWallet = false,
  isAdminUser = false,
}) => {
  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-[248px] lg:shrink-0 lg:sticky lg:top-0 lg:h-screen border-r border-white/[0.07] bg-gradient-to-b from-[#0B0E17] via-[#090B12] to-[#070810] px-4 py-5 justify-between">
      <div className="space-y-6">
        <div className="px-2 pt-1 flex items-center justify-between">
          <BrandLogo />
        </div>

        <button
          type="button"
          onClick={onOpenGoLive}
          disabled={isOffline}
          className="shimmer relative overflow-hidden w-full h-11 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-sky-500 hover:from-violet-500 hover:via-indigo-500 hover:to-sky-400 disabled:opacity-45 disabled:cursor-not-allowed text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-[0_14px_30px_-16px_rgba(99,102,241,0.9)] ring-1 ring-white/15 transition-all active:scale-[0.98] whitespace-nowrap shrink-0"
        >
          <Radio className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>Go Live</span>
        </button>

        <nav className="space-y-1" aria-label="Primary navigation">
          <p className="section-label px-3 pb-1.5">Menu</p>
          {NAV_ITEMS.filter(
            (item) => !(item.id === 'admin-panel' && !isAdminUser)
          ).map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectSection(item.id)}
                className={`group relative w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-gradient-to-r from-sky-500/15 via-violet-500/10 to-transparent text-white shadow-[inset_0_0_0_1px_rgba(56,189,248,0.18)]'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.045]'
                }`}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-full bg-gradient-to-b from-sky-400 to-violet-400" />
                )}
                <span className="flex items-center gap-3">
                  <span
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-[10px] transition-all duration-200 ${
                      isActive
                        ? item.activeChip
                        : `${item.idleChip} group-hover:scale-105 group-hover:brightness-125`
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </span>
                  <span>{item.label}</span>
                </span>
                {item.id === 'messages' && unreadMessagesCount > 0 && (
                  <span className="text-xs font-mono tabular-nums text-sky-300 font-semibold bg-sky-500/10 border border-sky-400/20 rounded-full px-1.5 py-0.5">
                    {unreadMessagesCount}
                  </span>
                )}
              </button>
            );
          })}
          {!currentUser && (
            <button
              type="button"
              onClick={() => onSelectSection('signin')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap shrink-0 ${
                activeSection === 'signin'
                  ? 'bg-gradient-to-r from-sky-500/15 via-violet-500/10 to-transparent text-white shadow-[inset_0_0_0_1px_rgba(56,189,248,0.18)]'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.045]'
              }`}
            >
              <span className="flex items-center gap-3">
                <span
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-[10px] ${
                    activeSection === 'signin'
                      ? 'bg-gradient-to-br from-sky-300 via-sky-500 to-blue-600 text-white shadow-lg shadow-sky-500/40 ring-1 ring-white/25'
                      : 'bg-white/[0.06] text-slate-300'
                  }`}
                >
                  <LogIn className="w-4 h-4" />
                </span>
                <span>Sign In</span>
              </span>
            </button>
          )}
        </nav>
      </div>

      <div className="space-y-3 pt-4 border-t border-white/[0.07]">
        <ThemeToggle />
        <PWAInstallButton />
        {currentUser ? (
          <div className="flex items-center justify-between gap-2.5 px-2 py-2 rounded-xl bg-gradient-to-r from-white/[0.05] to-white/[0.02] border border-white/[0.07] hover:border-white/15 transition-colors">
            <button
              type="button"
              onClick={() => onSelectSection('profile')}
              className="flex items-center gap-2.5 min-w-0 text-left flex-1"
            >
              <Avatar
                name={currentUser.displayName}
                color={currentUser.avatarColor}
                size="sm"
              />
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {currentUser.displayName}
                </p>
                <p className="text-xs text-slate-400 truncate font-mono">
                  {currentUser.platformId} · {currentUser.accountType}
                </p>
              </div>
            </button>
            <button
              type="button"
              onClick={onSignOut}
              title="Sign out"
              aria-label="Sign out"
              className="p-2 rounded-lg text-slate-400 hover:text-rose-300 hover:bg-white/[0.06] transition-colors shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onOpenAuth}
            className="w-full h-11 rounded-xl bg-gradient-to-r from-violet-600/25 to-sky-500/20 hover:from-violet-600/35 hover:to-sky-500/30 border border-white/10 text-sm font-medium text-white inline-flex items-center justify-center gap-2 transition-all shadow-[0_12px_28px_-20px_rgba(56,189,248,0.9)]"
          >
            <LogIn className="w-4 h-4 text-sky-400" />
            <span>Sign In / Register</span>
          </button>
        )}
      </div>
    </aside>
  );
};
