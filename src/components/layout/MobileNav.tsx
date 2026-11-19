import React from 'react';
import {
  Compass,
  Heart,
  MessageSquare,
  Radio,
  User,
  Bell,
  Wallet,
} from 'lucide-react';
import { AppSection } from '../../types/app';
import { BrandLogo } from '../ui/BrandLogo';
import { PWAInstallButton } from '../ui/PWAInstallButton';

interface MobileNavProps {
  activeSection: AppSection;
  onSelectSection: (section: AppSection) => void;
  onToggleWallet: () => void;
  onOpenGoLive: () => void;
  onOpenNotifications: () => void;
  unreadNotificationsCount: number;
  unreadMessagesCount: number;
  isOfflineSimulated: boolean;
  isSignedIn?: boolean;
  hideWallet?: boolean;
}

export const MobileTopBar: React.FC<MobileNavProps> = ({
  activeSection,
  onSelectSection,
  onToggleWallet,
  onOpenNotifications,
  unreadNotificationsCount,
  isSignedIn = false,
  hideWallet = false,
}) => {
  return (
    <header className="lg:hidden sticky top-0 z-30 h-13 px-4 flex items-center justify-between bg-[#08090E]/90 backdrop-blur-md border-b border-white/[0.07]">
      <BrandLogo />
      <div className="flex items-center gap-1.5">
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
        {!hideWallet && (
          <button
            type="button"
            onClick={onToggleWallet}
            aria-label={activeSection === 'wallet' ? 'Close Wallet' : 'Open Wallet'}
            className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl hover:bg-white/[0.05] ${
              activeSection === 'wallet' ? 'text-sky-400' : 'text-slate-300 hover:text-white'
            }`}
          >
            <Wallet className="w-5 h-5" />
          </button>
        )}
        <button
          type="button"
          onClick={onOpenNotifications}
          aria-label="Open Notifications"
          className="relative min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-300 hover:text-white hover:bg-white/[0.05]"
        >
          <Bell className="w-5 h-5" />
          {unreadNotificationsCount > 0 && (
            <span className="absolute top-2.5 right-2.5 text-[10px] font-mono font-bold text-sky-400">
              {unreadNotificationsCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};

export const MobileBottomBar: React.FC<Omit<MobileNavProps, 'onToggleWallet'>> = ({
  activeSection,
  onSelectSection,
  onOpenGoLive,
  unreadMessagesCount,
  isOfflineSimulated,
}) => {
  return (
    <nav
      aria-label="Mobile navigation"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-30 h-[60px] bg-[#0A0C13]/95 backdrop-blur-md border-t border-white/[0.08] grid grid-cols-5 items-center px-1"
    >
      <button
        type="button"
        onClick={() => onSelectSection('discover')}
        className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${
          activeSection === 'discover' ? 'text-sky-400' : 'text-slate-400'
        }`}
      >
        <Compass className="w-5 h-5" />
        <span>Home</span>
      </button>

      <button
        type="button"
        onClick={() => onSelectSection('following')}
        className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${
          activeSection === 'following' ? 'text-sky-400' : 'text-slate-400'
        }`}
      >
        <Heart className="w-5 h-5" />
        <span>Friends</span>
      </button>

      <button
        type="button"
        onClick={onOpenGoLive}
        disabled={isOfflineSimulated}
        aria-label="Go Live"
        className="min-h-[44px] flex items-center justify-center disabled:opacity-45"
      >
        <span className="w-11 h-9 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 flex items-center justify-center text-white shadow-md shadow-violet-950/60">
          <Radio className="w-5 h-5" />
        </span>
      </button>

      <button
        type="button"
        onClick={() => onSelectSection('messages')}
        className={`relative min-h-[44px] flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${
          activeSection === 'messages' ? 'text-sky-400' : 'text-slate-400'
        }`}
      >
        <MessageSquare className="w-5 h-5" />
        <span>Messages</span>
        {unreadMessagesCount > 0 && (
          <span className="absolute top-1 right-3 text-[10px] font-mono font-bold text-sky-400">
            {unreadMessagesCount}
          </span>
        )}
      </button>

      <button
        type="button"
        onClick={() => onSelectSection('profile')}
        className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${
          activeSection === 'profile' || activeSection === 'admin' || activeSection === 'wallet' ||
          activeSection === 'coins-trading' || activeSection === 'super-agent-list' || activeSection === 'agent-list' || activeSection === 'agent-promote' ||
          activeSection === 'fruit-manor' || activeSection === 'game-history' || activeSection === 'games' ||
          activeSection === 'golden-flower' || activeSection === 'gf-history'
            ? 'text-sky-400'
            : 'text-slate-400'
        }`}
      >
        <User className="w-5 h-5" />
        <span>Profile</span>
      </button>
    </nav>
  );
};
