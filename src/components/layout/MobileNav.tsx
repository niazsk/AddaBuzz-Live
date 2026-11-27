import React from 'react';
import {
  House,
  UsersRound,
  MessagesSquare,
  CircleUserRound,
  Radio,
  Bell,
} from 'lucide-react';
import { AppSection } from '../../types/app';
import { BrandLogo } from '../ui/BrandLogo';
import { PWAInstallButton } from '../ui/PWAInstallButton';
import { ThemeToggle } from '../ui/ThemeToggle';

interface MobileNavProps {
  activeSection: AppSection;
  onSelectSection: (section: AppSection) => void;
  onOpenGoLive: () => void;
  onOpenNotifications: () => void;
  unreadNotificationsCount: number;
  unreadMessagesCount: number;
  isOfflineSimulated: boolean;
  isSignedIn?: boolean;
  onToggleWallet?: () => void;
  hideWallet?: boolean;
}

export const MobileTopBar: React.FC<MobileNavProps> = ({
  activeSection,
  onSelectSection,
  onOpenNotifications,
  unreadNotificationsCount,
  isSignedIn = false,
}) => {
  return (
    <header className="lg:hidden sticky top-0 z-30 min-h-13 px-3 sm:px-4 pt-[env(safe-area-inset-top)] flex items-center justify-between bg-[#08090E]/95 border-b border-white/[0.07] shadow-[0_16px_40px_-32px_rgba(56,189,248,0.7)]">
      <BrandLogo />
      <div className="flex items-center gap-1.5">
        <ThemeToggle compact />
        <PWAInstallButton compact />
        {!isSignedIn && (
          <button
            type="button"
            onClick={() => onSelectSection('signin')}
            className="px-2.5 py-1.5 rounded-xl bg-violet-600/20 border border-violet-500/35 text-xs font-medium text-violet-200 hover:bg-violet-600/30"
          >
            Sign In
          </button>
        )}
        <button
          type="button"
          onClick={onOpenNotifications}
          aria-label="Open Notifications"
          className="relative min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-300 hover:text-white hover:bg-white/[0.05] transition-colors"
        >
          <Bell className="w-5 h-5" />
          {unreadNotificationsCount > 0 && (
            <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-gradient-to-r from-rose-500 to-fuchsia-500 text-[9px] leading-4 font-bold text-white text-center shadow-[0_4px_10px_-2px_rgba(244,63,94,0.8)]">
              {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};

const PROFILE_GROUP: AppSection[] = [
  'profile',
  'wallet',
  'coins-trading',
  'super-agent-list',
  'agent-list',
  'agent-promote',
  'rank',
  'agent-ranking',
  'invite',
  'invite-agent',
  'deposit',
  'salary',
  'fruit-manor',
  'game-history',
  'games',
  'golden-flower',
  'gf-history',
  'coin-flip',
  'bingo-bazaar',
  'plinko',
  'crash',
  'mines',
  'hi-lo',
  'roulette',
];

interface TabProps {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  onClick: () => void;
  badge?: number;
  gradient: string;
}

const Tab: React.FC<TabProps> = ({ label, icon: Icon, active, onClick, badge, gradient }) => (
  <button
    type="button"
    onClick={onClick}
    className={`relative min-h-[44px] flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors ${
      active ? 'text-white' : 'text-slate-400'
    }`}
  >
    <span
      className={`relative flex h-8 w-12 items-center justify-center rounded-xl transition-all duration-200 ${
        active
          ? `bg-gradient-to-br ${gradient} ring-1 ring-white/25 shadow-[0_10px_22px_-10px_rgba(0,0,0,0.9)]`
          : ''
      }`}
    >
      <Icon className={`w-[19px] h-[19px] ${active ? 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]' : ''}`} />
      {typeof badge === 'number' && badge > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[15px] h-[15px] px-0.5 rounded-full bg-gradient-to-r from-rose-500 to-fuchsia-500 text-[9px] leading-[15px] font-bold text-white text-center shadow-[0_3px_8px_-2px_rgba(244,63,94,0.9)]">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </span>
    <span>{label}</span>
  </button>
);

export const MobileBottomBar: React.FC<MobileNavProps> = ({
  activeSection,
  onSelectSection,
  onOpenGoLive,
  unreadMessagesCount,
  isOfflineSimulated,
}) => {
  const isProfileGroup = PROFILE_GROUP.includes(activeSection);
  return (
    <nav
      aria-label="Mobile navigation"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-30 h-[calc(62px+env(safe-area-inset-bottom))] bg-[#0A0C13]/95 border-t border-white/[0.08] grid grid-cols-5 items-center px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-16px_40px_-30px_rgba(0,0,0,0.95)]"
    >
      <Tab
        label="Home"
        icon={House}
        active={activeSection === 'discover'}
        onClick={() => onSelectSection('discover')}
        gradient="from-sky-300 via-sky-500 to-blue-600"
      />
      <Tab
        label="Friends"
        icon={UsersRound}
        active={activeSection === 'following'}
        onClick={() => onSelectSection('following')}
        gradient="from-rose-300 via-pink-500 to-fuchsia-600"
      />
      <button
        type="button"
        onClick={onOpenGoLive}
        disabled={isOfflineSimulated}
        aria-label="Go Live"
        className="min-h-[44px] flex items-center justify-center disabled:opacity-45"
      >
        <span className="w-12 h-9 rounded-2xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-sky-500 flex items-center justify-center text-white shadow-[0_12px_28px_-10px_rgba(139,92,246,0.95)] ring-1 ring-white/25 transition-transform active:scale-95">
          <Radio className="w-5 h-5" />
        </span>
      </button>
      <Tab
        label="Messages"
        icon={MessagesSquare}
        active={activeSection === 'messages'}
        onClick={() => onSelectSection('messages')}
        badge={unreadMessagesCount}
        gradient="from-emerald-300 via-teal-500 to-cyan-600"
      />
      <Tab
        label="Profile"
        icon={CircleUserRound}
        active={isProfileGroup}
        onClick={() => onSelectSection('profile')}
        gradient="from-amber-300 via-orange-500 to-rose-500"
      />
    </nav>
  );
};
