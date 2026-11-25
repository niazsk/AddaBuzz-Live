import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Bell,
  Calendar,
  ChevronDown,
  ChevronRight,
  FileText,
  HelpCircle,
  Info,
  KeyRound,
  Languages,
  Loader2,
  Lock,
  LogOut,
  Mail,
  ScrollText,
  ShieldCheck,
  Smartphone,
  UserCog,
  UserX,
  X,
} from 'lucide-react';
import {
  LanguageCode,
  NotificationPrefs,
  UserProfile,
  UserSettings,
} from '../../types/app';
import { Avatar } from '../ui/Avatar';
import { auth } from '../../lib/firebase';
import {
  DEFAULT_NOTIFICATION_PREFS,
  LANGUAGE_OPTIONS,
  sendPasswordReset,
  updatePresencePreference,
} from '../../lib/firestoreService';

interface SettingsViewProps {
  currentUser: UserProfile;
  settings: UserSettings | null;
  allUsers: UserProfile[];
  blockedUids: string[];
  onSaveSettings: (next: Pick<UserSettings, 'language' | 'notifications'>) => Promise<void>;
  onUnblockUser: (uid: string) => void;
  onOpenSection: (section: 'edit-profile') => void;
  onSignOut: () => void;
  onBack: () => void;
  onToast: (
    title: string,
    desc?: string,
    tone?: 'info' | 'success' | 'warning' | 'error'
  ) => void;
  isOffline: boolean;
}

type InfoSheet = 'terms' | 'privacy' | 'about' | null;

const NOTIFICATION_ROWS: {
  key: keyof NotificationPrefs;
  label: string;
  desc: string;
}[] = [
  { key: 'friendRequests', label: 'Friend requests', desc: 'When someone asks to connect' },
  { key: 'friendAccepts', label: 'Accepted requests', desc: 'When a request is accepted' },
  { key: 'newFollowers', label: 'New followers', desc: 'When someone follows you' },
  { key: 'messages', label: 'Direct messages', desc: 'New chat messages and gifts' },
  { key: 'liveInvites', label: 'Live invites', desc: 'Invitations to join a live room' },
  { key: 'gifts', label: 'Gift activity', desc: 'Gift and reward updates' },
  { key: 'promotions', label: 'Role updates', desc: 'Promotion and account notices' },
];

function formatAuthTime(value?: string | null): string {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not available';
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const INFO_CONTENT: Record<Exclude<InfoSheet, null>, { title: string; body: string[] }> = {
  terms: {
    title: 'Terms of Service',
    body: [
      'AddaBuzz Live is a social live streaming and chat platform. By using the app you agree to treat other members with respect and to follow the community rules: no harassment, hate speech, spam, scams, or sharing of illegal content.',
      'Virtual items — Coins, Diamonds, gifts, rewards and deposits — have no cash value outside the app and are non-transferable except through the in-app tools provided. Purchases and transfers are final once confirmed.',
      'Account roles (Agent, Super Agent, BD Agent) are granted by the platform. Misuse of agency tools, commission abuse or attempts to tamper with wallets leads to suspension.',
      'We may update these terms as the service evolves. Continued use after an update means you accept the revised terms.',
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    body: [
      'We store the profile information you provide (display name, username, bio, country, gender, profile photos) so other members can find and interact with you. Your email is kept in a private document only readable by you and platform administrators.',
      'Wallet balances and transaction history are stored per account and are never exposed publicly. Online status is only shared when you enable "Show online status" in Settings.',
      'Photos are compressed on your device before upload. We do not sell your personal data. You can change or remove profile details at any time from Edit Profile.',
      'Security-sensitive actions (password reset, role changes, wallet operations) are performed through authenticated flows and verified server-side.',
    ],
  },
  about: {
    title: 'About AddaBuzz Live',
    body: [
      'AddaBuzz Live is a community platform for live video and audio rooms, creator tools, virtual gifting, agency management and wallet services.',
      'Version 1.0. Live rooms use LiveKit for real-time media. Data is stored in Firebase with strict, owner-scoped security rules.',
      'Support is handled by the platform team through the contact link in Help & Support.',
    ],
  },
};

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentUser,
  settings,
  allUsers,
  blockedUids,
  onSaveSettings,
  onUnblockUser,
  onOpenSection,
  onSignOut,
  onBack,
  onToast,
  isOffline,
}) => {
  const [prefs, setPrefs] = useState<NotificationPrefs>(
    settings?.notifications ?? { ...DEFAULT_NOTIFICATION_PREFS }
  );
  const [language, setLanguage] = useState<LanguageCode>(settings?.language ?? 'en');
  const [showPresence, setShowPresence] = useState(currentUser.showPresence);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<'password' | 'logout' | null>(null);
  const [showBlocked, setShowBlocked] = useState(false);
  const [sheet, setSheet] = useState<InfoSheet>(null);

  useEffect(() => {
    if (settings) {
      setPrefs(settings.notifications);
      setLanguage(settings.language);
    }
  }, [settings]);

  useEffect(() => {
    setShowPresence(currentUser.showPresence);
  }, [currentUser.showPresence]);

  const authUser = auth.currentUser;
  const accountEmail = authUser?.email ?? 'Not available';
  const providerLabel = authUser?.providerData?.some((p) => p.providerId === 'google.com')
    ? 'Google sign-in'
    : 'Email & password';
  const blockedUsers = allUsers.filter((u) => blockedUids.includes(u.uid));

  const toggleNotification = async (key: keyof NotificationPrefs) => {
    if (busy || !settings) return;
    const previous = prefs;
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    setBusy(`notify_${key}`);
    try {
      await onSaveSettings({ language, notifications: next });
    } catch (err) {
      setPrefs(previous);
      onToast(
        'Could not save preference',
        err instanceof Error ? err.message : 'Try again later.',
        'error'
      );
    } finally {
      setBusy(null);
    }
  };

  const handleLanguage = async (next: LanguageCode) => {
    if (busy) return;
    const previous = language;
    setLanguage(next);
    setBusy('language');
    try {
      await onSaveSettings({ language: next, notifications: prefs });
      onToast('Language saved', 'Your preference is stored on your account.', 'success');
    } catch (err) {
      setLanguage(previous);
      onToast(
        'Could not save language',
        err instanceof Error ? err.message : 'Try again later.',
        'error'
      );
    } finally {
      setBusy(null);
    }
  };

  const handlePresence = async () => {
    if (busy) return;
    const previous = showPresence;
    const next = !showPresence;
    setShowPresence(next);
    setBusy('presence');
    try {
      await updatePresencePreference(currentUser.uid, next);
      onToast(next ? 'Online status visible' : 'Online status hidden', undefined, 'success');
    } catch (err) {
      setShowPresence(previous);
      onToast(
        'Could not update privacy',
        err instanceof Error ? err.message : 'Try again later.',
        'error'
      );
    } finally {
      setBusy(null);
    }
  };

  const requestPasswordReset = async () => {
    setConfirm(null);
    if (!authUser?.email) {
      onToast('No email on this account', 'Password reset needs a verified email.', 'error');
      return;
    }
    setBusy('password');
    try {
      await sendPasswordReset(authUser.email);
      onToast(
        'Reset link sent',
        `Check ${authUser.email} for the password reset email.`,
        'success'
      );
    } catch (err) {
      onToast(
        'Could not send reset email',
        err instanceof Error ? err.message : 'Try again later.',
        'error'
      );
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4 pb-12">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to profile"
          className="w-9 h-9 rounded-xl bg-[#111420] border border-white/[0.08] hover:border-white/20 text-slate-300 hover:text-white flex items-center justify-center shrink-0 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="font-display text-xl font-bold text-white">Settings</h1>
          <p className="text-[11px] text-slate-400">Account, privacy and preferences</p>
        </div>
      </div>

      {/* Account */}
      <section className="rounded-3xl bg-[#111420] border border-white/[0.08] divide-y divide-white/[0.06] overflow-hidden">
        <div className="px-4 sm:px-5 pt-4 pb-2 flex items-center gap-2">
          <UserCog className="w-4 h-4 text-violet-400" />
          <h2 className="font-display text-sm font-semibold text-white">Account</h2>
        </div>
        <div className="px-4 sm:px-5 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-200 truncate">{accountEmail}</p>
            <p className="text-[11px] text-slate-500">
              @{currentUser.username} · ID {currentUser.platformId} · {providerLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenSection('edit-profile')}
            className="text-xs font-semibold text-violet-300 hover:text-violet-200 inline-flex items-center gap-1 shrink-0"
          >
            <span>Edit Account</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="px-4 sm:px-5 py-3">
          <button
            type="button"
            onClick={() => setConfirm('password')}
            disabled={isOffline || busy === 'password'}
            className="w-full flex items-center justify-between gap-3 text-left disabled:opacity-50"
          >
            <span className="flex items-center gap-2.5">
              <KeyRound className="w-4 h-4 text-slate-400" />
              <span>
                <span className="block text-xs font-medium text-slate-200">Change Password</span>
                <span className="block text-[11px] text-slate-500">
                  Send a secure reset link to your email
                </span>
              </span>
            </span>
            {busy === 'password' ? (
              <Loader2 className="w-4 h-4 animate-spin text-violet-300" />
            ) : (
              <ChevronRight className="w-4 h-4 text-slate-500" />
            )}
          </button>
          {confirm === 'password' && (
            <div className="mt-3 rounded-xl bg-violet-500/10 border border-violet-500/25 p-3 space-y-2">
              <p className="text-[11px] text-violet-100">
                We will email a password reset link to {accountEmail}. Use it to set a new password.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirm(null)}
                  className="flex-1 h-8 rounded-lg bg-white/[0.08] text-[11px] font-medium text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void requestPasswordReset()}
                  className="flex-1 h-8 rounded-lg bg-violet-600 hover:bg-violet-500 text-[11px] font-semibold text-white"
                >
                  Send Reset Link
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="px-4 sm:px-5 py-3 flex items-center justify-between gap-3">
          <span className="flex items-center gap-2.5">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span>
              <span className="block text-xs font-medium text-slate-200">Member since</span>
              <span className="block text-[11px] text-slate-500">
                {formatAuthTime(authUser?.metadata.creationTime)}
              </span>
            </span>
          </span>
        </div>
      </section>

      {/* Privacy */}
      <section className="rounded-3xl bg-[#111420] border border-white/[0.08] divide-y divide-white/[0.06] overflow-hidden">
        <div className="px-4 sm:px-5 pt-4 pb-2 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <h2 className="font-display text-sm font-semibold text-white">Privacy</h2>
        </div>
        <button
          type="button"
          onClick={() => void handlePresence()}
          disabled={isOffline || busy === 'presence'}
          className="w-full px-4 sm:px-5 py-3 flex items-center justify-between gap-3 text-left disabled:opacity-50"
        >
          <span>
            <span className="block text-xs font-medium text-slate-200">Show online status</span>
            <span className="block text-[11px] text-slate-500">
              Friends can see when you are online
            </span>
          </span>
          <span
            className={`relative w-10 h-6 rounded-full transition-colors shrink-0 ${
              showPresence ? 'bg-emerald-500/80' : 'bg-white/[0.12]'
            }`}
          >
            <span
              className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${
                showPresence ? 'left-[18px]' : 'left-0.5'
              }`}
            />
          </span>
        </button>

        <div className="px-4 sm:px-5 py-3">
          <button
            type="button"
            onClick={() => setShowBlocked((v) => !v)}
            className="w-full flex items-center justify-between gap-3 text-left"
          >
            <span className="flex items-center gap-2.5">
              <UserX className="w-4 h-4 text-slate-400" />
              <span>
                <span className="block text-xs font-medium text-slate-200">Blocked Users</span>
                <span className="block text-[11px] text-slate-500">
                  {blockedUsers.length === 0
                    ? 'No blocked accounts'
                    : `${blockedUsers.length} blocked account${blockedUsers.length === 1 ? '' : 's'}`}
                </span>
              </span>
            </span>
            <ChevronDown
              className={`w-4 h-4 text-slate-500 transition-transform ${
                showBlocked ? 'rotate-180' : ''
              }`}
            />
          </button>
          {showBlocked && (
            <div className="mt-2 space-y-1.5">
              {blockedUsers.length === 0 ? (
                <p className="text-[11px] text-slate-500 px-1 py-2">
                  Accounts you block will appear here with an Unblock action.
                </p>
              ) : (
                blockedUsers.map((user) => (
                  <div
                    key={user.uid}
                    className="flex items-center justify-between gap-2 rounded-xl bg-white/[0.03] px-2.5 py-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar
                        name={user.displayName}
                        color={user.avatarColor}
                        src={user.avatarUrl}
                        size="xs"
                      />
                      <span className="text-xs text-slate-200 truncate">
                        {user.displayName} (@{user.username})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onUnblockUser(user.uid)}
                      className="px-2.5 py-1 rounded-lg bg-white/[0.08] hover:bg-white/[0.15] text-[11px] font-medium text-white shrink-0"
                    >
                      Unblock
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </section>

      {/* Notifications */}
      <section className="rounded-3xl bg-[#111420] border border-white/[0.08] divide-y divide-white/[0.06] overflow-hidden">
        <div className="px-4 sm:px-5 pt-4 pb-2 flex items-center gap-2">
          <Bell className="w-4 h-4 text-amber-400" />
          <h2 className="font-display text-sm font-semibold text-white">Notifications</h2>
        </div>
        {NOTIFICATION_ROWS.map((row) => {
          const enabled = prefs[row.key];
          return (
            <button
              key={row.key}
              type="button"
              onClick={() => void toggleNotification(row.key)}
              disabled={isOffline || !settings || busy === `notify_${row.key}`}
              className="w-full px-4 sm:px-5 py-2.5 flex items-center justify-between gap-3 text-left disabled:opacity-50"
            >
              <span>
                <span className="block text-xs font-medium text-slate-200">{row.label}</span>
                <span className="block text-[11px] text-slate-500">{row.desc}</span>
              </span>
              <span
                className={`relative w-10 h-6 rounded-full transition-colors shrink-0 ${
                  enabled ? 'bg-violet-500/80' : 'bg-white/[0.12]'
                }`}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${
                    enabled ? 'left-[18px]' : 'left-0.5'
                  }`}
                />
              </span>
            </button>
          );
        })}
        <p className="px-4 sm:px-5 py-2.5 text-[10px] text-slate-500">
          Turning a category off hides those items from the notification drawer.
        </p>
      </section>

      {/* Language */}
      <section className="rounded-3xl bg-[#111420] border border-white/[0.08] p-4 sm:p-5 space-y-2">
        <div className="flex items-center gap-2">
          <Languages className="w-4 h-4 text-sky-400" />
          <h2 className="font-display text-sm font-semibold text-white">Language</h2>
        </div>
        <select
          value={language}
          onChange={(e) => void handleLanguage(e.target.value as LanguageCode)}
          disabled={isOffline || busy === 'language'}
          className="w-full h-11 px-3 rounded-xl bg-[#090B12] border border-white/[0.09] text-sm text-white focus:border-violet-500/60 focus:outline-none disabled:opacity-50"
        >
          {LANGUAGE_OPTIONS.map((opt) => (
            <option key={opt.code} value={opt.code}>
              {opt.native} — {opt.label}
            </option>
          ))}
        </select>
        <p className="text-[10px] text-slate-500">
          Your preference is saved to your account. The app interface is currently English only.
        </p>
      </section>

      {/* Security */}
      <section className="rounded-3xl bg-[#111420] border border-white/[0.08] divide-y divide-white/[0.06] overflow-hidden">
        <div className="px-4 sm:px-5 pt-4 pb-2 flex items-center gap-2">
          <Lock className="w-4 h-4 text-rose-300" />
          <h2 className="font-display text-sm font-semibold text-white">Security</h2>
        </div>
        <div className="px-4 sm:px-5 py-3 flex items-center justify-between gap-3">
          <span className="flex items-center gap-2.5">
            <Smartphone className="w-4 h-4 text-slate-400" />
            <span>
              <span className="block text-xs font-medium text-slate-200">Current session</span>
              <span className="block text-[11px] text-slate-500">
                Last sign-in {formatAuthTime(authUser?.metadata.lastSignInTime)}
              </span>
            </span>
          </span>
          <span className="text-[10px] font-semibold text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded-full shrink-0">
            Active
          </span>
        </div>
        <p className="px-4 sm:px-5 py-2.5 text-[10px] text-slate-500">
          Session listing across other devices is not available on the current plan; only this
          device can be signed out from here. Password changes use email verification.
        </p>
      </section>

      {/* Help & Support */}
      <section className="rounded-3xl bg-[#111420] border border-white/[0.08] p-4 sm:p-5 space-y-3">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-cyan-400" />
          <h2 className="font-display text-sm font-semibold text-white">Help & Support</h2>
        </div>
        <details className="rounded-xl bg-white/[0.03] border border-white/[0.06] px-3.5 py-2.5">
          <summary className="text-xs font-medium text-slate-200 cursor-pointer">
            How do I change my profile photo?
          </summary>
          <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
            Open Edit Profile and use the camera buttons on your profile picture or cover. Photos
            are compressed on your device before saving.
          </p>
        </details>
        <details className="rounded-xl bg-white/[0.03] border border-white/[0.06] px-3.5 py-2.5">
          <summary className="text-xs font-medium text-slate-200 cursor-pointer">
            Why is my Diamond balance different from my Coin balance?
          </summary>
          <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
            Coins are for gifting, games and rewards. Diamonds are creator earnings and can be
            withdrawn through Salary or exchanged by agents. Every change is recorded in your
            wallet history.
          </p>
        </details>
        <details className="rounded-xl bg-white/[0.03] border border-white/[0.06] px-3.5 py-2.5">
          <summary className="text-xs font-medium text-slate-200 cursor-pointer">
            How do I report a user or a live room?
          </summary>
          <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
            Open the member&apos;s profile and choose Report, or use the report option inside the
            live room. Reports reach the moderation team.
          </p>
        </details>
        <a
          href="mailto:niazskapp@gmail.com?subject=AddaBuzz%20Live%20Support"
          className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.04] border border-white/[0.07] px-3.5 py-2.5 hover:border-white/[0.16] transition-colors"
        >
          <span className="flex items-center gap-2.5">
            <Mail className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-medium text-slate-200">Email support</span>
          </span>
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </a>
      </section>

      {/* About / legal */}
      <section className="rounded-3xl bg-[#111420] border border-white/[0.08] divide-y divide-white/[0.06] overflow-hidden">
        <button
          type="button"
          onClick={() => setSheet('about')}
          className="w-full px-4 sm:px-5 py-3 flex items-center justify-between gap-3 text-left"
        >
          <span className="flex items-center gap-2.5">
            <Info className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-medium text-slate-200">About AddaBuzz Live</span>
          </span>
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </button>
        <button
          type="button"
          onClick={() => setSheet('terms')}
          className="w-full px-4 sm:px-5 py-3 flex items-center justify-between gap-3 text-left"
        >
          <span className="flex items-center gap-2.5">
            <ScrollText className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-medium text-slate-200">Terms of Service</span>
          </span>
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </button>
        <button
          type="button"
          onClick={() => setSheet('privacy')}
          className="w-full px-4 sm:px-5 py-3 flex items-center justify-between gap-3 text-left"
        >
          <span className="flex items-center gap-2.5">
            <FileText className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-medium text-slate-200">Privacy Policy</span>
          </span>
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </button>
      </section>

      {/* Logout */}
      <section className="space-y-2">
        {confirm === 'logout' ? (
          <div className="rounded-2xl bg-rose-500/10 border border-rose-500/30 p-4 space-y-2">
            <p className="text-xs text-rose-100">
              Sign out of this device? You can sign back in with{' '}
              {authUser?.email ?? 'your account'}.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirm(null)}
                className="flex-1 h-9 rounded-lg bg-white/[0.08] text-xs font-medium text-slate-200"
              >
                Stay Signed In
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirm(null);
                  onSignOut();
                }}
                className="flex-1 h-9 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white"
              >
                Sign Out
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirm('logout')}
            className="w-full h-11 rounded-xl bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 text-rose-200 text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Log Out</span>
          </button>
        )}
      </section>

      {/* Legal / info sheet */}
      {sheet && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="settings-info-title"
          onClick={() => setSheet(null)}
        >
          <div
            className="w-full sm:max-w-lg max-h-[85vh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-[#111420] border border-white/[0.1] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08] shrink-0">
              <h2 id="settings-info-title" className="font-display text-base font-semibold text-white">
                {INFO_CONTENT[sheet].title}
              </h2>
              <button
                type="button"
                onClick={() => setSheet(null)}
                aria-label="Close"
                className="w-8 h-8 rounded-full bg-white/[0.08] hover:bg-white/[0.15] flex items-center justify-center text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-y-auto px-5 py-4 space-y-3">
              {INFO_CONTENT[sheet].body.map((paragraph, index) => (
                <p key={index} className="text-xs text-slate-300 leading-relaxed">
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
