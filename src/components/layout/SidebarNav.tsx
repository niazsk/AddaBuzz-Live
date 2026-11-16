import React from 'react';
import {
  Compass,
  Heart,
  MessageSquare,
  Wallet,
  User,
  ShieldCheck,
  Radio,
  LogIn,
  LogOut,
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
}

const NAV_ITEMS: { id: AppSection; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'discover', label: 'Home', icon: Compass },
  { id: 'following', label: 'Friends', icon: Heart },
  { id: 'messages', label: 'Messages', icon: MessageSquare },
  { id: 'wallet', label: 'Wallet', icon: Wallet },
  { id: 'profile', label: 'Profile', icon: User },
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
}) => {
  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-[248px] lg:shrink-0 lg:sticky lg:top-0 lg:h-screen border-r border-white/[0.07] bg-[#0A0C13] px-4 py-5 justify-between">
      <div className="space-y-6">
        <div className="px-2 pt-1">
          <BrandLogo />
        </div>

        <button
          type="button"
          onClick={onOpenGoLive}
          disabled={isOffline}
          className="w-full h-11 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 disabled:opacity-45 disabled:cursor-not-allowed text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-violet-950/50 transition-all active:scale-[0.98] whitespace-nowrap shrink-0"
        >
          <Radio className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>Go Live</span>
        </button>

        <nav className="space-y-1" aria-label="Primary navigation">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectSection(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-white/[0.08] text-white'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.04]'
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon
                    className={`w-[18px] h-[18px] shrink-0 ${
                      isActive ? 'text-sky-400' : 'text-slate-400'
                    }`}
                  />
                  <span>{item.label}</span>
                </span>
                {item.id === 'messages' && unreadMessagesCount > 0 && (
                  <span className="text-xs font-mono tabular-nums text-sky-400 font-semibold">
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
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                activeSection === 'signin'
                  ? 'bg-white/[0.08] text-white'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.04]'
              }`}
            >
              <span className="flex items-center gap-3">
                <LogIn
                  className={`w-[18px] h-[18px] shrink-0 ${
                    activeSection === 'signin' ? 'text-sky-400' : 'text-slate-400'
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
          <div className="flex items-center justify-between gap-2.5 px-2 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06]">
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
            className="w-full h-11 rounded-xl bg-white/[0.07] hover:bg-white/[0.12] border border-white/[0.08] text-sm font-medium text-white inline-flex items-center justify-center gap-2 transition-colors"
          >
            <LogIn className="w-4 h-4 text-sky-400" />
            <span>Sign In / Register</span>
          </button>
        )}
      </div>
    </aside>
  );
};
