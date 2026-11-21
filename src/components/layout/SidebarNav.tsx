import React from 'react';
import {
  Compass,
  Heart,
  MessageSquare,
  User,
  ShieldCheck,
  Radio,
  LogIn,
  LogOut,
  Gamepad2,
  LayoutDashboard,
} from 'lucide-react';
import { AppSection, UserProfile } from '../../types/app';
import { BrandLogo } from '../ui/BrandLogo';
import { Avatar } from '../ui/Avatar';
import { PWAInstallButton } from '../ui/PWAInstallButton';

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

const NAV_ITEMS: { id: AppSection; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'discover', label: 'Home', icon: Compass },
  { id: 'following', label: 'Friends', icon: Heart },
  { id: 'messages', label: 'Messages', icon: MessageSquare },
  { id: 'games', label: 'Games', icon: Gamepad2 },
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'admin-panel', label: 'Admin Panel', icon: LayoutDashboard },
  { id: 'admin', label: 'Roles & Safety', icon: ShieldCheck },
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
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/12 border border-rose-500/25 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 live-dot" />
            LIVE
          </span>
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
            (item) => !((item.id === 'admin' || item.id === 'admin-panel') && !isAdminUser)
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
                  <Icon
                    className={`w-[18px] h-[18px] shrink-0 transition-colors ${
                      isActive ? 'text-sky-300' : 'text-slate-400 group-hover:text-slate-200'
                    }`}
                  />
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
                <LogIn
                  className={`w-[18px] h-[18px] shrink-0 ${
                    activeSection === 'signin' ? 'text-sky-300' : 'text-slate-400'
                  }`}
                />
                <span>Sign In</span>
              </span>
            </button>
          )}
        </nav>
      </div>

      <div className="space-y-3 pt-4 border-t border-white/[0.07]">
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
