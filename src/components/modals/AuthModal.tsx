import React, { useEffect, useState } from 'react';
import {
  Check,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LogIn,
  Mail,
  RefreshCw,
  UserPlus,
  X,
} from 'lucide-react';
import { GenderOption } from '../../types/app';
import { COUNTRIES } from '../../data/countries';
import {
  isAdminBootstrapEmail,
  isSuperAgentBootstrapEmail,
  isUsernameAvailable,
} from '../../lib/firestoreService';
import { BrandLogo } from '../ui/BrandLogo';

interface AuthModalProps {
  open: boolean;
  needsEmailVerification: boolean;
  needsOnboarding: boolean;
  defaultDisplayName?: string;
  userEmail?: string | null;
  onClose: () => void;
  onGoogleSignIn: () => Promise<void>;
  onEmailSignIn: (email: string, password: string) => Promise<void>;
  onEmailRegister: (
    email: string,
    password: string,
    displayName: string
  ) => Promise<void>;
  onResendVerification: () => Promise<void>;
  onRefreshVerification: () => Promise<void>;
  onSignOut: () => Promise<void>;
  onCompleteOnboarding: (payload: {
    username: string;
    displayName: string;
    country: string;
    gender: GenderOption;
  }) => Promise<void>;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  open,
  needsEmailVerification,
  needsOnboarding,
  defaultDisplayName = '',
  userEmail,
  onClose,
  onGoogleSignIn,
  onEmailSignIn,
  onEmailRegister,
  onResendVerification,
  onRefreshVerification,
  onSignOut,
  onCompleteOnboarding,
}) => {
  const [authTab, setAuthTab] = useState<'signin' | 'register'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [registerName, setRegisterName] = useState('');

  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState(defaultDisplayName);
  const [country, setCountry] = useState('United States');
  const [gender, setGender] = useState<GenderOption>('Prefer not to say');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [usernameStatus, setUsernameStatus] = useState<
    'idle' | 'checking' | 'available' | 'taken'
  >('idle');

  useEffect(() => {
    if (defaultDisplayName && !displayName) {
      setDisplayName(defaultDisplayName);
    }
  }, [defaultDisplayName]);

  useEffect(() => {
    const cleaned = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (!needsOnboarding || cleaned.length < 3) {
      setUsernameStatus('idle');
      return;
    }
    let cancelled = false;
    setUsernameStatus('checking');
    const timer = window.setTimeout(async () => {
      try {
        const available = await isUsernameAvailable(cleaned);
        if (!cancelled) {
          setUsernameStatus(available ? 'available' : 'taken');
        }
      } catch {
        if (!cancelled) setUsernameStatus('idle');
      }
    }, 350);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [username, needsOnboarding]);

  if (!open && !needsOnboarding && !needsEmailVerification) return null;

  const handleGoogleClick = async () => {
    setError(null);
    setInfoMsg(null);
    setBusy(true);
    try {
      await onGoogleSignIn();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to sign in with Google.'
      );
    } finally {
      setBusy(false);
    }
  };

  const formatModalAuthError = (err: unknown): string => {
    const msg = err instanceof Error ? err.message : String(err);
    if (
      msg.includes('auth/invalid-credential') ||
      msg.includes('auth/wrong-password') ||
      msg.includes('auth/user-not-found')
    ) {
      return 'Invalid email or password. If this account has not been created yet, switch to Create Account below.';
    }
    if (msg.includes('auth/email-already-in-use')) {
      return 'An account with this email already exists. Switch to Sign In to access it.';
    }
    if (msg.includes('auth/weak-password')) {
      return 'Password must be at least 6 characters.';
    }
    return msg;
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMsg(null);
    setBusy(true);
    try {
      if (authTab === 'signin') {
        await onEmailSignIn(email, password);
      } else {
        await onEmailRegister(email, password, registerName);
        setInfoMsg(
          'Account created! Verify the email link sent to your inbox, then click Refresh Status.'
        );
      }
    } catch (err) {
      setError(formatModalAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleOnboardingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const cleaned = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (cleaned.length < 3) {
      setError(
        'Username must be at least 3 characters (lowercase letters, numbers, or underscores).'
      );
      return;
    }
    if (usernameStatus === 'taken') {
      setError(`Username @${cleaned} is already taken. Please choose another.`);
      return;
    }
    setBusy(true);
    try {
      await onCompleteOnboarding({
        username: cleaned,
        displayName: displayName.trim() || cleaned,
        country: country.trim() || 'United States',
        gender,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to complete onboarding.'
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="w-full max-w-md rounded-2xl bg-[#111420] border border-white/12 overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between">
          <BrandLogo />
          {!needsOnboarding && !needsEmailVerification && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close sign in dialog"
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="rounded-xl bg-rose-500/15 border border-rose-500/30 px-3.5 py-2.5 text-xs text-rose-300 leading-relaxed space-y-2">
              <p>{error}</p>
              {authTab === 'signin' &&
                error.includes('Invalid email or password') && (
                  <button
                    type="button"
                    onClick={() => {
                      setAuthTab('register');
                      setError(null);
                    }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Create account with {email || 'this email'} →</span>
                  </button>
                )}
            </div>
          )}
          {infoMsg && (
            <p className="rounded-xl bg-emerald-500/15 border border-emerald-500/30 px-3.5 py-2.5 text-xs text-emerald-200 leading-relaxed">
              {infoMsg}
            </p>
          )}

          {needsEmailVerification ? (
            <div className="space-y-4">
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3.5 space-y-1.5">
                <div className="flex items-center gap-2 text-amber-300 text-xs font-semibold">
                  <Mail className="w-4 h-4" />
                  <span>Verify your email address</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Signed in as <strong className="text-white">{userEmail}</strong>.
                  Click the verification link in your inbox, then tap Refresh Status.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    setError(null);
                    try {
                      await onRefreshVerification();
                    } catch (err) {
                      setError(err instanceof Error ? err.message : 'Unable to refresh.');
                    } finally {
                      setBusy(false);
                    }
                  }}
                  className="flex-1 h-10 px-3 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 text-xs font-semibold text-white inline-flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh Status</span>
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    setError(null);
                    try {
                      await onResendVerification();
                      setInfoMsg(`Verification link sent to ${userEmail}.`);
                    } catch (err) {
                      setError(err instanceof Error ? err.message : 'Failed to send.');
                    } finally {
                      setBusy(false);
                    }
                  }}
                  className="h-10 px-3 rounded-xl bg-white/[0.08] text-xs font-medium text-white"
                >
                  Resend
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void onSignOut();
                  }}
                  className="h-10 px-3 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Sign Out
                </button>
              </div>
            </div>
          ) : needsOnboarding ? (
            <form onSubmit={handleOnboardingSubmit} className="space-y-4">
              <div>
                <h2 id="auth-modal-title" className="font-display text-lg font-bold text-white">
                  Complete your AddaBuzz profile
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Signed in as <span className="text-slate-200">{userEmail}</span>.
                  {isAdminBootstrapEmail(userEmail) && (
                    <span className="text-violet-300 font-medium">
                      {' '}
                      App Admin role will be assigned automatically.
                    </span>
                  )}
                  {isSuperAgentBootstrapEmail(userEmail) && (
                    <span className="text-violet-300 font-medium">
                      {' '}
                      BD Agent role will be assigned automatically.
                    </span>
                  )}
                </p>
              </div>

              <label className="block space-y-1">
                <span className="text-xs font-medium text-slate-300">
                  Unique Username (lowercase, numbers, _)
                </span>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="your_username"
                  className="w-full h-10 px-3.5 rounded-xl bg-[#090B12] border border-white/[0.09] text-sm text-white focus:border-sky-500/60 focus:outline-none"
                />
                {usernameStatus === 'checking' && (
                  <span className="text-[11px] text-slate-400">Checking availability...</span>
                )}
                {usernameStatus === 'available' && (
                  <span className="text-[11px] text-emerald-400">Username is available</span>
                )}
                {usernameStatus === 'taken' && (
                  <span className="text-[11px] text-rose-400">Username is already taken</span>
                )}
              </label>

              <label className="block space-y-1">
                <span className="text-xs font-medium text-slate-300">Display Name</span>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your creator name"
                  className="w-full h-10 px-3.5 rounded-xl bg-[#090B12] border border-white/[0.09] text-sm text-white focus:border-sky-500/60 focus:outline-none"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-1">
                  <span className="text-xs font-medium text-slate-300">Country</span>
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-[#090B12] border border-white/[0.09] text-sm text-white focus:border-sky-500/60 focus:outline-none"
                  >
                    {(COUNTRIES.includes(country) ? COUNTRIES : [country, ...COUNTRIES]).map(
                      (c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      )
                    )}
                  </select>
                </label>

                <label className="block space-y-1">
                  <span className="text-xs font-medium text-slate-300">Gender</span>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as GenderOption)}
                    className="w-full h-10 px-3 rounded-xl bg-[#090B12] border border-white/[0.09] text-sm text-white focus:border-sky-500/60 focus:outline-none"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </label>
              </div>

              <button
                type="submit"
                disabled={busy}
                className="w-full h-11 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 disabled:opacity-50 text-sm font-semibold text-white inline-flex items-center justify-center gap-2 transition-all"
              >
                {busy ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                <span>Create Account & Enter</span>
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <div>
                <h2 id="auth-modal-title" className="font-display text-lg font-bold text-white">
                  Sign in to AddaBuzz Live
                </h2>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Sign in with Email & Password or Google to host live rooms, claim seats, chat, and manage roles.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-[#090B12] border border-white/[0.07]">
                <button
                  type="button"
                  onClick={() => {
                    setAuthTab('signin');
                    setError(null);
                  }}
                  className={`h-8 rounded-lg text-xs font-semibold ${
                    authTab === 'signin'
                      ? 'bg-white/[0.1] text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthTab('register');
                    setError(null);
                  }}
                  className={`h-8 rounded-lg text-xs font-semibold ${
                    authTab === 'register'
                      ? 'bg-white/[0.1] text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Create Account
                </button>
              </div>

              <form onSubmit={handleEmailSubmit} className="space-y-3">
                {authTab === 'register' && (
                  <input
                    type="text"
                    value={registerName}
                    onChange={(e) => setRegisterName(e.target.value)}
                    placeholder="Display Name"
                    className="w-full h-10 px-3.5 rounded-xl bg-[#090B12] border border-white/[0.09] text-sm text-white focus:border-sky-500/60 focus:outline-none"
                  />
                )}
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                  className="w-full h-10 px-3.5 rounded-xl bg-[#090B12] border border-white/[0.09] text-sm text-white focus:border-sky-500/60 focus:outline-none"
                />
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password (min 6 chars)"
                    className="w-full h-10 pl-3.5 pr-10 rounded-xl bg-[#090B12] border border-white/[0.09] text-sm text-white focus:border-sky-500/60 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full h-10 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 disabled:opacity-50 text-xs font-semibold text-white inline-flex items-center justify-center gap-2"
                >
                  {busy ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : authTab === 'signin' ? (
                    <KeyRound className="w-4 h-4" />
                  ) : (
                    <UserPlus className="w-4 h-4" />
                  )}
                  <span>
                    {authTab === 'signin' ? 'Sign In with Email' : 'Create Account'}
                  </span>
                </button>
              </form>

              <button
                type="button"
                disabled={busy}
                onClick={handleGoogleClick}
                className="w-full h-10 rounded-xl bg-white text-[#08090E] hover:bg-slate-100 disabled:opacity-50 text-xs font-semibold inline-flex items-center justify-center gap-2 transition-colors"
              >
                <LogIn className="w-4 h-4" />
                <span>Continue with Google</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
