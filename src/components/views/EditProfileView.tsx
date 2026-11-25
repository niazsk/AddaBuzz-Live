import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  BadgeCheck,
  Camera,
  CheckCircle2,
  Loader2,
  MapPin,
  Save,
  XCircle,
} from 'lucide-react';
import { GenderOption, UserProfile, UserSettings } from '../../types/app';
import { Avatar } from '../ui/Avatar';
import { compressProfileImage, ProfileImageKind } from '../../lib/profileImages';
import {
  changeUsername,
  DEFAULT_NOTIFICATION_PREFS,
  fetchCoverImage,
  isUsernameAvailable,
  LANGUAGE_OPTIONS,
  normalizeUsername,
  saveCoverImage,
  updateOwnProfile,
} from '../../lib/firestoreService';
import { COUNTRIES } from '../../data/countries';

interface EditProfileViewProps {
  currentUser: UserProfile;
  settings: UserSettings | null;
  onSaveSettings: (next: Pick<UserSettings, 'language' | 'notifications'>) => Promise<void>;
  onBack: () => void;
  onToast: (
    title: string,
    desc?: string,
    tone?: 'info' | 'success' | 'warning' | 'error'
  ) => void;
  isOffline: boolean;
}

type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

const USERNAME_PATTERN = /^[a-z0-9_]{3,32}$/;

export const EditProfileView: React.FC<EditProfileViewProps> = ({
  currentUser,
  settings,
  onSaveSettings,
  onBack,
  onToast,
  isOffline,
}) => {
  const [displayName, setDisplayName] = useState(currentUser.displayName);
  const [username, setUsername] = useState(currentUser.username);
  const [bio, setBio] = useState(currentUser.bio ?? '');
  const [country, setCountry] = useState(currentUser.country || 'United States');
  const [gender, setGender] = useState<GenderOption>(currentUser.gender ?? 'Prefer not to say');
  const [showPresence, setShowPresence] = useState(currentUser.showPresence ?? true);
  const [language, setLanguage] = useState(settings?.language ?? 'en');

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState<ProfileImageKind | null>(null);
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLanguage(settings?.language ?? 'en');
  }, [settings?.language]);

  useEffect(() => {
    let cancelled = false;
    fetchCoverImage(currentUser.uid).then((dataUrl) => {
      if (!cancelled && dataUrl) setCoverImage(dataUrl);
    });
    return () => {
      cancelled = true;
    };
  }, [currentUser.uid]);

  const usernameChanged = normalizeUsername(username) !== currentUser.username;

  const checkUsername = async (): Promise<boolean> => {
    const normalized = normalizeUsername(username);
    if (!usernameChanged) {
      setUsernameStatus('idle');
      return true;
    }
    if (!USERNAME_PATTERN.test(normalized)) {
      setUsernameStatus('invalid');
      return false;
    }
    setUsernameStatus('checking');
    try {
      const available = await isUsernameAvailable(normalized);
      setUsernameStatus(available ? 'available' : 'taken');
      return available;
    } catch {
      setUsernameStatus('idle');
      onToast(
        'Username check failed',
        'Could not verify availability. Try again in a moment.',
        'error'
      );
      return false;
    }
  };

  const handlePhotoPick =
    (kind: ProfileImageKind) => async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;
      setPhotoBusy(kind);
      try {
        const dataUrl = await compressProfileImage(kind, file);
        if (kind === 'avatar') setAvatarPreview(dataUrl);
        else setCoverPreview(dataUrl);
      } catch (err) {
        onToast(
          'Photo not accepted',
          err instanceof Error ? err.message : 'Could not process this image.',
          'error'
        );
      } finally {
        setPhotoBusy(null);
      }
    };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setError(null);

    const cleanName = displayName.trim();
    if (!cleanName) {
      setError('Display name cannot be empty.');
      return;
    }
    if (bio.trim().length > 300) {
      setError('Bio must be 300 characters or fewer.');
      return;
    }
    if (usernameChanged) {
      const normalized = normalizeUsername(username);
      if (!USERNAME_PATTERN.test(normalized)) {
        setUsernameStatus('invalid');
        setError('Username must be 3-32 characters: a-z, 0-9 or underscore.');
        return;
      }
      const available = await checkUsername();
      if (!available) {
        setError(`@${normalized} is not available. Please choose another username.`);
        return;
      }
    }

    setSaving(true);
    try {
      if (usernameChanged) {
        await changeUsername(currentUser.uid, currentUser.username, username);
      }
      await updateOwnProfile(currentUser.uid, {
        displayName: cleanName,
        bio: bio.trim(),
        country,
        gender,
        showPresence,
        ...(avatarPreview ? { avatarUrl: avatarPreview } : {}),
      });
      if (coverPreview) {
        await saveCoverImage(currentUser.uid, coverPreview);
        setCoverImage(coverPreview);
        setCoverPreview(null);
      }
      if (language !== (settings?.language ?? 'en')) {
        await onSaveSettings({
          language,
          notifications: settings?.notifications ?? { ...DEFAULT_NOTIFICATION_PREFS },
        });
      }
      if (avatarPreview) setAvatarPreview(null);
      onToast('Profile updated', 'Your changes are live.', 'success');
      onBack();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not save your profile.';
      setError(message);
      onToast('Save failed', message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const avatarSrc = avatarPreview ?? currentUser.avatarUrl;
  const coverSrc = coverPreview ?? coverImage ?? currentUser.coverUrl;
  const usernameHint =
    usernameStatus === 'checking'
      ? 'Checking availability…'
      : usernameStatus === 'available'
      ? 'Username is available.'
      : usernameStatus === 'taken'
      ? 'Username is already taken.'
      : usernameStatus === 'invalid'
      ? '3-32 characters: a-z, 0-9 or underscore.'
      : usernameChanged
      ? 'Changing your username releases the old one.'
      : 'Your current username.';

  return (
    <form onSubmit={handleSave} className="space-y-5 pb-28">
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
          <h1 className="font-display text-xl font-bold text-white">Edit Profile</h1>
          <p className="text-[11px] text-slate-400">Photo, identity and preferences</p>
        </div>
      </div>

      {/* Photos */}
      <section className="overflow-hidden rounded-3xl bg-[#111420] border border-white/[0.08]">
        <div
          className="relative h-36 w-full"
          style={{
            background: coverSrc
              ? `center / cover no-repeat url(${coverSrc})`
              : currentUser.coverGradient,
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-[#111420] via-transparent to-transparent" />
          <button
            type="button"
            onClick={() => coverInputRef.current?.click()}
            disabled={photoBusy !== null}
            className="absolute top-3 right-3 h-8 px-3 rounded-full bg-black/45 backdrop-blur-md border border-white/15 hover:bg-black/65 disabled:opacity-50 text-[11px] font-semibold text-white inline-flex items-center gap-1.5 transition-colors"
          >
            {photoBusy === 'cover' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Camera className="w-3.5 h-3.5" />
            )}
            <span>Cover</span>
          </button>
        </div>

        <div className="px-5 pb-5 -mt-9 relative flex items-end justify-between gap-3">
          <div className="relative">
            <Avatar
              name={currentUser.displayName}
              color={currentUser.avatarColor}
              src={avatarSrc}
              size="xl"
              className="ring-4 ring-[#111420]"
            />
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              disabled={photoBusy !== null}
              aria-label="Change profile picture"
              className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 border-2 border-[#111420] flex items-center justify-center text-white transition-colors"
            >
              {photoBusy === 'avatar' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Camera className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
          <p className="text-[10px] text-slate-500 text-right pb-1 max-w-[46%] leading-relaxed">
            Photos are compressed on this device and saved instantly on Save Changes.
          </p>
        </div>
      </section>

      <input
        ref={avatarInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePhotoPick('avatar')}
      />
      <input
        ref={coverInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePhotoPick('cover')}
      />

      {/* Identity */}
      <section className="rounded-3xl bg-[#111420] border border-white/[0.08] p-4 sm:p-5 space-y-4">
        <h2 className="font-display text-sm font-semibold text-white flex items-center gap-2">
          <BadgeCheck className="w-4 h-4 text-violet-400" />
          <span>Identity</span>
        </h2>

        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-slate-300">Display Name</span>
          <input
            type="text"
            value={displayName}
            maxLength={64}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full h-11 px-3.5 rounded-xl bg-[#090B12] border border-white/[0.09] text-sm text-white placeholder:text-slate-500 focus:border-violet-500/60 focus:outline-none"
          />
        </label>

        <div className="space-y-1.5">
          <span className="text-xs font-medium text-slate-300">Username</span>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                @
              </span>
              <input
                type="text"
                value={username}
                maxLength={32}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                onChange={(e) => {
                  setUsername(normalizeUsername(e.target.value));
                  setUsernameStatus('idle');
                }}
                onBlur={() => {
                  if (usernameChanged) void checkUsername();
                }}
                className="w-full h-11 pl-8 pr-3.5 rounded-xl bg-[#090B12] border border-white/[0.09] text-sm text-white focus:border-violet-500/60 focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => void checkUsername()}
              disabled={!usernameChanged || usernameStatus === 'checking' || isOffline}
              className="px-3.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] disabled:opacity-40 text-xs font-semibold text-white shrink-0"
            >
              {usernameStatus === 'checking' ? 'Checking…' : 'Check'}
            </button>
          </div>
          <p
            className={`text-[11px] flex items-center gap-1 ${
              usernameStatus === 'taken' || usernameStatus === 'invalid'
                ? 'text-rose-300'
                : usernameStatus === 'available'
                ? 'text-emerald-300'
                : 'text-slate-500'
            }`}
          >
            {usernameStatus === 'available' && <CheckCircle2 className="w-3 h-3" />}
            {(usernameStatus === 'taken' || usernameStatus === 'invalid') && (
              <XCircle className="w-3 h-3" />
            )}
            <span>{usernameHint}</span>
          </p>
        </div>

        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-slate-300">Bio</span>
          <textarea
            rows={3}
            value={bio}
            maxLength={300}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell people about yourself"
            className="w-full p-3.5 rounded-xl bg-[#090B12] border border-white/[0.09] text-sm text-white placeholder:text-slate-500 focus:border-violet-500/60 focus:outline-none resize-none"
          />
          <span className="block text-right text-[10px] text-slate-500 tabular-nums">
            {bio.length}/300
          </span>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-slate-300 inline-flex items-center gap-1">
              <MapPin className="w-3 h-3" /> Country
            </span>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full h-11 px-3 rounded-xl bg-[#090B12] border border-white/[0.09] text-sm text-white focus:border-violet-500/60 focus:outline-none"
            >
              {(COUNTRIES.includes(country) ? COUNTRIES : [country, ...COUNTRIES]).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-slate-300">Gender</span>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value as GenderOption)}
              className="w-full h-11 px-3 rounded-xl bg-[#090B12] border border-white/[0.09] text-sm text-white focus:border-violet-500/60 focus:outline-none"
            >
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Prefer not to say">Prefer not to say</option>
            </select>
          </label>
        </div>

        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-slate-300">Language</span>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as typeof language)}
            className="w-full h-11 px-3 rounded-xl bg-[#090B12] border border-white/[0.09] text-sm text-white focus:border-violet-500/60 focus:outline-none"
          >
            {LANGUAGE_OPTIONS.map((opt) => (
              <option key={opt.code} value={opt.code}>
                {opt.native} — {opt.label}
              </option>
            ))}
          </select>
          <span className="block text-[10px] text-slate-500">
            Saved to your account. The app interface is currently English only.
          </span>
        </label>

        <label className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.04] border border-white/[0.06] px-3.5 py-3 cursor-pointer">
          <span>
            <span className="block text-xs font-medium text-slate-200">Show online status</span>
            <span className="block text-[10px] text-slate-500">Friends can see when you are online.</span>
          </span>
          <input
            type="checkbox"
            checked={showPresence}
            onChange={(e) => setShowPresence(e.target.checked)}
            className="w-4 h-4 accent-violet-600 rounded shrink-0"
          />
        </label>
      </section>

      {error && (
        <p className="rounded-xl bg-rose-500/10 border border-rose-500/30 px-4 py-2.5 text-xs text-rose-200">
          {error}
        </p>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 h-11 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-sm font-medium text-slate-200"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving || isOffline || photoBusy !== null}
          className="flex-[2] h-11 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-sm font-semibold text-white inline-flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>{saving ? 'Saving…' : 'Save Changes'}</span>
        </button>
      </div>
    </form>
  );
};
