import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LogIn,
  LogOut,
  Mail,
  RefreshCw,
  ShieldCheck,
  UserPlus,
} from 'lucide-react';
import { GenderOption, UserProfile } from '../../types/app';
import {
  isAdminBootstrapEmail,
  isUsernameAvailable,
} from '../../lib/firestoreService';
import { BrandLogo } from '../ui/BrandLogo';

interface SignInViewProps {
  currentUser: UserProfile | null;
  userEmail?: string | null;
  needsEmailVerification: boolean;
  needsOnboarding: boolean;
  defaultDisplayName?: string;
  onBackToDiscover: () => void;
  onGoogleSignIn: () => Promise<void>;
  onEmailSignIn: (email: string, password: string) => Promise<void>;
  onEmailRegister: (
    email: string,
    password: string,
    displayName: string
  ) => Promise<void>;
  onSendPasswordReset: (email: string) => Promise<void>;
  onResendVerification: () => Promise<void>;
  onRefreshVerification: () => Promise<void>;
  onCompleteOnboarding: (payload: {
    username: string;
    displayName: string;
    country: string;
    gender: GenderOption;
  }) => Promise<void>;
  onSignOut: () => Promise<void>;
  onOpenAdminPanel: () => void;
}

function formatAuthError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes('auth/operation-not-allowed')) {
    return 'Email/Password sign-in is not yet enabled in Firebase Console. Open Firebase Console → Authentication → Sign-in method → Enable Email/Password for project addabuzz-live-usa.';
  }
  if (
    msg.includes('auth/invalid-credential') ||
    msg.includes('auth/wrong-password') ||
    msg.includes('auth/user-not-found')
  ) {
    return 'Invalid email or password. If this account has not been created yet, switch to Create Account or add the user in Firebase Console → Authentication → Users.';
  }
  if (msg.includes('auth/email-already-in-use')) {
    return 'An account with this email already exists. Switch to Sign In to access it.';
  }
  if (msg.includes('auth/weak-password')) {
    return 'Password should be at least 6 characters.';
  }
  return msg;
}

export const SignInView: React.FC<SignInViewProps> = ({
  currentUser,
  userEmail,
  needsEmailVerification,
  needsOnboarding,
  defaultDisplayName = '',
  onBackToDiscover,
  onGoogleSignIn,
  onEmailSignIn,
  onEmailRegister,
  onSendPasswordReset,
  onResendVerification,
  onRefreshVerification,
  onCompleteOnboarding,
  onSignOut,
  onOpenAdminPanel,
}) => {
  const [authTab, setAuthTab] = useState<'signin' | 'register'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [registerName, setRegisterName] = useState('');

  // Onboarding fields
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState(defaultDisplayName);
  const [country, setCountry] = useState('United States');
  const [gender, setGender] = useState<GenderOption>('Prefer not to say');
  const [usernameStatus, setUsernameStatus] = useState<
    'idle' | 'checking' | 'available' | 'taken'
  >('idle');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  useEffect(() => {
    if (defaultDisplayName && !displayName) {
      setDisplayName(defaultDisplayName);
    }
  }, [defaultDisplayName]);

  useEffect(() => {
    if (!needsEmailVerification) return;
    const handleFocus = () => {
      void onRefreshVerification().catch(() => {});
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [needsEmailVerification]);

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

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMsg(null);
    if (!email.trim() || !password) {
      setError('Please enter both your email address and password.');
      return;
    }
    setBusy(true);
    try {
      if (authTab === 'signin') {
        await onEmailSignIn(email, password);
      } else {
        await onEmailRegister(email, password, registerName);
        setInfoMsg(
          'Account created! A verification email was sent to your inbox. Click the link in that email, then click Refresh Status.'
        );
      }
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleResetPassword = async () => {
    setError(null);
    setInfoMsg(null);
    if (!email.trim()) {
      setError('Enter your email address above first to receive a password reset link.');
      return;
    }
    setBusy(true);
    try {
      await onSendPasswordReset(email);
      setInfoMsg(`Password reset email sent to ${email.trim()}.`);
    } catch (err) {
      setError(formatAuthError(err));
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
      setError(formatAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-4 pb-12 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBackToDiscover}
          className="inline-flex items-center gap-2 text-xs font-medium text-slate-300 hover:text-white bg-white/[0.05] hover:bg-white/[0.1] px-3.5 py-2 rounded-xl transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Discover</span>
        </button>

        <span className="text-xs font-mono text-slate-400">
          Firebase Project: <strong className="text-sky-300">addabuzz-live-usa</strong>
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Auth Card */}
        <section className="lg:col-span-7 rounded-2xl bg-[#111420] border border-white/[0.09] overflow-hidden shadow-2xl">
          <div className="px-6 py-5 border-b border-white/[0.08] flex items-center justify-between">
            <BrandLogo />
            <span className="text-[11px] font-mono text-violet-300 bg-violet-500/15 border border-violet-500/30 px-2.5 py-1 rounded-lg">
              Secure Access
            </span>
          </div>

          <div className="p-6 space-y-5">
            {error && (
              <div className="rounded-xl bg-rose-500/15 border border-rose-500/30 px-4 py-3 text-xs text-rose-200 leading-relaxed space-y-2">
                <p>{error}</p>
                {authTab === 'signin' &&
                  error.includes('Invalid email or password') && (
                    <button
                      type="button"
                      onClick={() => {
                        setAuthTab('register');
                        setError(null);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold transition-colors"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Create account with {email || 'this email'} →</span>
                    </button>
                  )}
              </div>
            )}
            {infoMsg && (
              <div className="rounded-xl bg-emerald-500/15 border border-emerald-500/30 px-4 py-3 text-xs text-emerald-200 leading-relaxed">
                {infoMsg}
              </div>
            )}

            {currentUser ? (
              <div className="space-y-4">
                <div className="rounded-xl bg-white/[0.04] border border-white/[0.08] p-4 space-y-1.5">
                  <p className="text-xs font-mono text-emerald-400">SIGNED IN</p>
                  <h2 className="font-display text-lg font-bold text-white">
                    {currentUser.displayName} (@{currentUser.username})
                  </h2>
                  <p className="text-xs text-slate-400">
                    {userEmail} · Role:{' '}
                    <span className="font-mono text-sky-300">
                      {currentUser.accountType}
                    </span>{' '}
                    · ID: <span className="font-mono">{currentUser.platformId}</span>
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={onBackToDiscover}
                    className="h-10 px-4 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-xs font-semibold text-white"
                  >
                    Enter Live Feed
                  </button>
                  {(currentUser.accountType === 'SUPER_AGENT' ||
                    isAdminBootstrapEmail(userEmail)) && (
                    <button
                      type="button"
                      onClick={onOpenAdminPanel}
                      className="h-10 px-4 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-xs font-medium text-white inline-flex items-center gap-1.5"
                    >
                      <ShieldCheck className="w-4 h-4 text-violet-400" />
                      <span>Open Admin & Roles</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      void onSignOut();
                    }}
                    className="h-10 px-4 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-xs font-medium text-rose-200 inline-flex items-center gap-1.5"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            ) : needsEmailVerification ? (
              <div className="space-y-4">
                <div className="rounded-xl bg-amber-500/12 border border-amber-500/30 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-amber-300 font-semibold text-sm">
                    <Mail className="w-4 h-4" />
                    <span>Verify your email address to continue</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Signed in as <strong className="text-white">{userEmail}</strong>.
                    Firestore Security Rules require a verified email before creating your{' '}
                    <span className="font-mono text-sky-300">
                      {isAdminBootstrapEmail(userEmail) ? 'SUPER_AGENT (Admin)' : 'USER'}
                    </span>{' '}
                    profile.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={async () => {
                      setError(null);
                      setInfoMsg(null);
                      setBusy(true);
                      try {
                        await onRefreshVerification();
                      } catch (err) {
                        setError(formatAuthError(err));
                      } finally {
                        setBusy(false);
                      }
                    }}
                    className="h-10 px-4 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 disabled:opacity-50 text-xs font-semibold text-white inline-flex items-center gap-2"
                  >
                    {busy ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    <span>I Verified — Refresh Status</span>
                  </button>

                  <button
                    type="button"
                    disabled={busy}
                    onClick={async () => {
                      setError(null);
                      setInfoMsg(null);
                      setBusy(true);
                      try {
                        await onResendVerification();
                        setInfoMsg(`Verification email re-sent to ${userEmail}.`);
                      } catch (err) {
                        setError(formatAuthError(err));
                      } finally {
                        setBusy(false);
                      }
                    }}
                    className="h-10 px-4 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-xs font-medium text-white"
                  >
                    Resend Email
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      void onSignOut();
                    }}
                    className="h-10 px-3.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            ) : needsOnboarding ? (
              <form onSubmit={handleOnboardingSubmit} className="space-y-4">
                <div>
                  <h1 className="font-display text-lg font-bold text-white">
                    Complete your AddaBuzz profile
                  </h1>
                  <p className="text-xs text-slate-400 mt-1">
                    Verified as <span className="text-slate-200">{userEmail}</span>.
                    {isAdminBootstrapEmail(userEmail) && (
                      <span className="text-violet-300 font-medium">
                        {' '}
                        This account will be provisioned as App Admin (SUPER_AGENT).
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
                    placeholder="e.g., faysel_admin"
                    className="w-full h-10 px-3.5 rounded-xl bg-[#090B12] border border-white/[0.09] text-sm text-white focus:border-sky-500/60 focus:outline-none"
                  />
                  {usernameStatus === 'checking' && (
                    <span className="text-[11px] text-slate-400">
                      Checking availability...
                    </span>
                  )}
                  {usernameStatus === 'available' && (
                    <span className="text-[11px] text-emerald-400">
                      Username is available
                    </span>
                  )}
                  {usernameStatus === 'taken' && (
                    <span className="text-[11px] text-rose-400">
                      Username is already taken
                    </span>
                  )}
                </label>

                <label className="block space-y-1">
                  <span className="text-xs font-medium text-slate-300">
                    Display Name
                  </span>
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your display name"
                    className="w-full h-10 px-3.5 rounded-xl bg-[#090B12] border border-white/[0.09] text-sm text-white focus:border-sky-500/60 focus:outline-none"
                  />
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <label className="block space-y-1">
                    <span className="text-xs font-medium text-slate-300">
                      Country
                    </span>
                    <input
                      type="text"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl bg-[#090B12] border border-white/[0.09] text-sm text-white focus:border-sky-500/60 focus:outline-none"
                    />
                  </label>

                  <label className="block space-y-1">
                    <span className="text-xs font-medium text-slate-300">
                      Gender
                    </span>
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
              <>
                <div className="space-y-1">
                  <h1 className="font-display text-xl font-bold text-white">
                    {authTab === 'signin'
                      ? 'Sign in to AddaBuzz Live'
                      : 'Create your AddaBuzz account'}
                  </h1>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Sign in with Email & Password or Google to stream, claim
                    guest seats, manage Coins & Diamonds, or open Admin controls.
                  </p>
                </div>

                {/* Mode Tabs */}
                <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[#090B12] border border-white/[0.07]">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthTab('signin');
                      setError(null);
                      setInfoMsg(null);
                    }}
                    className={`h-9 rounded-lg text-xs font-semibold transition-colors ${
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
                      setInfoMsg(null);
                    }}
                    className={`h-9 rounded-lg text-xs font-semibold transition-colors ${
                      authTab === 'register'
                        ? 'bg-white/[0.1] text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Create Account
                  </button>
                </div>

                <form onSubmit={handleEmailSubmit} className="space-y-3.5">
                  {authTab === 'register' && (
                    <label className="block space-y-1">
                      <span className="text-xs font-medium text-slate-300">
                        Display Name
                      </span>
                      <input
                        type="text"
                        value={registerName}
                        onChange={(e) => setRegisterName(e.target.value)}
                        placeholder="e.g., Faysel SK"
                        className="w-full h-10 px-3.5 rounded-xl bg-[#090B12] border border-white/[0.09] text-sm text-white focus:border-sky-500/60 focus:outline-none"
                      />
                    </label>
                  )}

                  <label className="block space-y-1">
                    <span className="text-xs font-medium text-slate-300">
                      Email Address
                    </span>
                    <input
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full h-10 px-3.5 rounded-xl bg-[#090B12] border border-white/[0.09] text-sm text-white focus:border-sky-500/60 focus:outline-none"
                    />
                  </label>

                  <label className="block space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-300">
                        Password
                      </span>
                      {authTab === 'signin' && (
                        <button
                          type="button"
                          onClick={handleResetPassword}
                          className="text-[11px] text-sky-400 hover:text-sky-300"
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        autoComplete={
                          authTab === 'signin'
                            ? 'current-password'
                            : 'new-password'
                        }
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter password (min 6 characters)"
                        className="w-full h-10 pl-3.5 pr-10 rounded-xl bg-[#090B12] border border-white/[0.09] text-sm text-white focus:border-sky-500/60 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((s) => !s)}
                        aria-label={
                          showPassword ? 'Hide password' : 'Show password'
                        }
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white"
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </label>

                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full h-11 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 disabled:opacity-50 text-sm font-semibold text-white inline-flex items-center justify-center gap-2 transition-all"
                  >
                    {busy ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : authTab === 'signin' ? (
                      <KeyRound className="w-4 h-4" />
                    ) : (
                      <UserPlus className="w-4 h-4" />
                    )}
                    <span>
                      {authTab === 'signin'
                        ? 'Sign In with Email'
                        : 'Create Email Account'}
                    </span>
                  </button>
                </form>

                <div className="relative py-1">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/[0.08]" />
                  </div>
                  <div className="relative flex justify-center text-[11px] uppercase">
                    <span className="bg-[#111420] px-2.5 text-slate-500">
                      or continue with
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    setError(null);
                    setBusy(true);
                    try {
                      await onGoogleSignIn();
                    } catch (err) {
                      setError(formatAuthError(err));
                    } finally {
                      setBusy(false);
                    }
                  }}
                  className="w-full h-11 rounded-xl bg-white text-[#08090E] hover:bg-slate-100 disabled:opacity-50 text-sm font-semibold inline-flex items-center justify-center gap-2.5 transition-colors"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Continue with Google</span>
                </button>
              </>
            )}
          </div>
        </section>

        {/* Right Info & Admin Setup Guide */}
        <aside className="lg:col-span-5 space-y-4">
          <div className="rounded-2xl bg-[#111420] border border-white/[0.08] p-5 space-y-3">
            <div className="flex items-center gap-2 text-violet-300">
              <ShieldCheck className="w-5 h-5" />
              <h2 className="font-display text-base font-semibold text-white">
                App Admin & RBAC Setup
              </h2>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Verified accounts for{' '}
              <span className="font-mono text-sky-300">fayselsk@gmail.com</span>{' '}
              and{' '}
              <span className="font-mono text-sky-300">niazskapp@gmail.com</span>{' '}
              are configured in Firestore Security Rules as authorized App Admins
              and automatically receive{' '}
              <span className="font-mono text-violet-300">SUPER_AGENT</span>{' '}
              privileges upon verified onboarding.
            </p>
            <ol className="space-y-1.5 text-xs text-slate-400 list-decimal list-inside leading-relaxed">
              <li>
                In Firebase Console (
                <span className="font-mono text-slate-200">
                  addabuzz-live-usa
                </span>
                ), open <strong className="text-slate-200">Authentication → Sign-in method</strong> and enable{' '}
                <strong className="text-slate-200">Email/Password</strong>.
              </li>
              <li>
                Use <strong className="text-slate-200">Create Account</strong> (or add the user in Firebase Console → Users), verify the email link, and complete profile onboarding.
              </li>
              <li>
                Sign in anytime on this page to manage User → Agent promotions, safety reports, and community seeding.
              </li>
            </ol>
          </div>

          <div className="rounded-2xl bg-[#111420] border border-white/[0.08] p-5 space-y-2">
            <h3 className="font-display text-sm font-semibold text-white">
              Online-First Security
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Authentication, profile uniqueness, virtual Coins & Diamonds
              balances, and 8-seat multi-guest approvals are verified server-side
              by Firebase Auth and Firestore Security Rules.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
};
