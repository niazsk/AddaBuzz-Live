import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocFromCache,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  increment,
  Unsubscribe,
  DocumentSnapshot,
  DocumentData,
  DocumentReference,
  Transaction,
} from 'firebase/firestore';
import {
  createUserWithEmailAndPassword,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  User,
} from 'firebase/auth';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from './firebase';
import { classifySyncError, listenWithRetry } from './sync';
import { sendNotificationDoc } from './chatService';
import {
  AccountPromotionRecord,
  AdminAuditRecord,
  AdminWalletSnapshot,
  AgencyCommissionStoryRecord,
  AgencyMemberRecord,
  AnnouncementRecord,
  Conversation,
  CreateLiveRoomPayload,
  DirectMessage,
  GenderOption,
  GiftCatalogItem,
  GuestSeat,
  JoinRequest,
  LanguageCode,
  LiveRoom,
  NotificationPrefs,
  ReportRecord,
  RewardProfile,
  HostRewardProfile,
  RoomCategory,
  RoomComment,
  RoomModerator,
  RoomMode,
  UserProfile,
  UserSettings,
  WalletTransaction,
} from '../types/app';
import {
  CHECK_IN_REWARDS,
  REWARD_TASKS,
  rewardDayKey,
  RewardTaskId,
} from '../rewards/config';
import {
  HOST_NEWBIE_REWARD,
  HOST_NEWBIE_SECONDS,
  HOST_TASKS,
  HOST_VALID_DAYS_GOAL,
  HOST_VALID_DAYS_REWARD,
  HOST_VALID_DAY_SECONDS,
  HostTaskId,
} from '../rewards/hostConfig';
import type { LuckyGiftBox, LuckyRoll } from '../data/luckyGifts';

export const ADMIN_BOOTSTRAP_EMAIL = 'niazskapp@gmail.com';
export const ADMIN_BOOTSTRAP_EMAILS = [
  'niazskapp@gmail.com',
  'fayselsk@gmail.com',
];

export const SUPER_AGENT_BOOTSTRAP_EMAILS = ['ranababu78@gmail.com'];

export function isAdminBootstrapEmail(email?: string | null): boolean {
  if (!email) return false;
  return ADMIN_BOOTSTRAP_EMAILS.includes(email.trim().toLowerCase());
}

export function isSuperAgentBootstrapEmail(email?: string | null): boolean {
  if (!email) return false;
  return SUPER_AGENT_BOOTSTRAP_EMAILS.includes(email.trim().toLowerCase());
}

export const ADMIN_PLATFORM_ID = '111111';
export const SUPER_AGENT_PLATFORM_ID = '112200';
export const USER_PLATFORM_ID_START = 112201;

// The main BD Agent is ONLY platform ID 111112. Every other SUPER_AGENT is a
// regular Super Agent and is displayed as such.
export function isBdAgentProfile(user: UserProfile | null | undefined): boolean {
  return user?.accountType === 'SUPER_AGENT' && user.platformId === '111112';
}

export function accountRoleLabel(user: UserProfile | null | undefined): string {
  if (!user) return 'User';
  if (isBdAgentProfile(user)) return 'BD Agent';
  if (user.accountType === 'SUPER_AGENT') return 'Super Agent';
  if (user.accountType === 'AGENT') return 'Agent';
  return 'User';
}

export type CoinTransferRole = 'ADMIN' | 'BD_AGENT' | 'SUPER_AGENT' | 'AGENT' | 'USER';

export function resolveCoinTransferRole(
  user: UserProfile | null | undefined,
  isAdminUser = false
): CoinTransferRole {
  if (isAdminUser) return 'ADMIN';
  if (isBdAgentProfile(user)) return 'BD_AGENT';
  if (user?.accountType === 'SUPER_AGENT') return 'SUPER_AGENT';
  if (user?.accountType === 'AGENT') return 'AGENT';
  return 'USER';
}

/**
 * Allowed coin transfer hierarchy:
 *   Admin      -> BD Agent / Super Agent / Agent  (recipient Trading Balance)
 *   BD Agent   -> Super Agent / Agent             (recipient Trading Balance)
 *   Super Agent-> Agent / User                    (Agent Trading Balance, User Main Balance)
 *   Agent      -> User                            (User Main Balance)
 */
export function canTransferCoinsTo(
  senderRole: CoinTransferRole,
  recipient: UserProfile
): boolean {
  switch (senderRole) {
    case 'ADMIN':
      return recipient.accountType === 'SUPER_AGENT' || recipient.accountType === 'AGENT';
    case 'BD_AGENT':
      return (
        !isBdAgentProfile(recipient) &&
        (recipient.accountType === 'SUPER_AGENT' || recipient.accountType === 'AGENT')
      );
    case 'SUPER_AGENT':
      return recipient.accountType === 'AGENT' || recipient.accountType === 'USER';
    case 'AGENT':
      return recipient.accountType === 'USER';
    default:
      return false;
  }
}

async function nextUserPlatformId(): Promise<string> {
  const ref = doc(db, 'counters', 'platformIds');
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) {
      tx.set(ref, { next: USER_PLATFORM_ID_START + 1 });
      return String(USER_PLATFORM_ID_START);
    }
    const cur = Math.max(Number(snap.data().next) || USER_PLATFORM_ID_START, USER_PLATFORM_ID_START);
    tx.set(ref, { next: cur + 1 });
    return String(cur);
  });
}

const clampStr = (val: string, max: number) => val.trim().slice(0, max);

export const SUPPORTED_SEAT_COUNTS = [8, 12, 16, 24] as const;

/** Multi-guest capacity is restricted to the supported grid sizes (default 8). */
export const normalizeSeatCount = (value: unknown): number => {
  const n = Number(value);
  return (SUPPORTED_SEAT_COUNTS as readonly number[]).includes(n) ? n : 8;
};

const formatTimestamp = (ts: unknown): string => {
  if (ts instanceof Timestamp) {
    const d = ts.toDate();
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return 'Just now';
};

export async function signInWithGooglePopup(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signInWithEmailPassword(
  email: string,
  password: string
): Promise<User> {
  const result = await signInWithEmailAndPassword(auth, email.trim(), password);
  return result.user;
}

export async function registerWithEmailPassword(
  email: string,
  password: string,
  displayName?: string
): Promise<User> {
  const result = await createUserWithEmailAndPassword(
    auth,
    email.trim(),
    password
  );
  if (displayName && displayName.trim()) {
    await updateProfile(result.user, {
      displayName: displayName.trim().slice(0, 64),
    });
  }
  if (!result.user.emailVerified) {
    await sendEmailVerification(result.user);
  }
  return result.user;
}

export async function resendVerificationEmail(): Promise<void> {
  if (!auth.currentUser) {
    throw new Error('No signed-in user to verify.');
  }
  await sendEmailVerification(auth.currentUser);
}

export async function reloadCurrentAuthUser(): Promise<User | null> {
  if (!auth.currentUser) return null;
  await reload(auth.currentUser);
  await auth.currentUser.getIdToken(true);
  return auth.currentUser;
}

export async function sendPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email.trim());
}

export async function signOutFirebase(): Promise<void> {
  await signOut(auth);
}

function profileFromData(d: { [key: string]: any }): UserProfile {
  return {
    uid: String(d.uid),
    platformId: String(d.platformId),
    username: String(d.username),
    displayName: String(d.displayName),
    bio: String(d.bio ?? ''),
    country: String(d.country ?? 'United States'),
    gender: (d.gender as GenderOption) ?? 'Prefer not to say',
    accountType: d.accountType,
    avatarColor: String(d.avatarColor ?? '#6366F1'),
    coverGradient: String(
      d.coverGradient ??
        'linear-gradient(135deg, #3B0764 0%, #1E3A8A 60%, #09090E 100%)'
    ),
    avatarUrl: d.avatarUrl ? String(d.avatarUrl) : undefined,
    coverUrl: d.coverUrl ? String(d.coverUrl) : undefined,
    followersCount: Number(d.followersCount ?? 0),
    followingCount: Number(d.followingCount ?? 0),
    visitorsCount: Number(d.visitorsCount ?? 0),
    isOnline: Boolean(d.isOnline ?? true),
    showPresence: Boolean(d.showPresence ?? true),
    lastActiveLabel: String(d.lastActiveLabel ?? 'Online'),
    isNewCreator: Boolean(d.isNewCreator ?? false),
    isSuspended: Boolean(d.isSuspended ?? false),
  };
}

// One-shot Listen attach: the Listen channel often still delivers while
// getDoc/runQuery are quota-blocked, so it is the last resort before giving up.
function listenDocOnce(
  ref: ReturnType<typeof doc>,
  timeoutMs: number
): Promise<DocumentSnapshot<DocumentData> | null> {
  return new Promise((resolve) => {
    let settled = false;
    let unsub: Unsubscribe = () => undefined;
    const finish = (snap: DocumentSnapshot<DocumentData> | null) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      unsub();
      resolve(snap);
    };
    const timer = window.setTimeout(() => finish(null), timeoutMs);
    unsub = listenWithRetry(
      ref,
      (snap) => {
        if (!snap.metadata.fromCache) finish(snap);
      },
      () => finish(null)
    );
  });
}

export async function fetchUserProfile(uid: string): Promise<UserProfile | null> {
  const path = `users/${uid}`;
  try {
    const ref = doc(db, 'users', uid);
    // Cache-first: a refresh must boot instantly from the persisted cache even
    // while the server read quota is paused; live listeners correct it later.
    const cached = await getDocFromCache(ref).catch(() => null);
    if (cached && cached.exists()) return profileFromData(cached.data());
    let snap;
    try {
      snap = await getDoc(ref);
    } catch (error) {
      if (classifySyncError(error) === 'fatal') throw error;
      snap = await listenDocOnce(ref, 12000);
      if (!snap) throw error;
    }
    if (!snap.exists()) return null;
    return profileFromData(snap.data());
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function isUsernameAvailable(rawUsername: string): Promise<boolean> {
  const normalized = rawUsername.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
  if (normalized.length < 3 || normalized.length > 32) return false;
  const path = `usernames/${normalized}`;
  try {
    const snap = await getDoc(doc(db, 'usernames', normalized));
    return !snap.exists();
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

const USERNAME_PATTERN = /^[a-z0-9_]{3,32}$/;

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 32);
}

/**
 * Renames the signed-in account's username. The uniqueness index is claimed
 * first, the profile is updated in the same batch, and the old index entry is
 * released. If the new name was taken between the check and the write, the
 * security rules reject the batch and nothing changes.
 */
export async function changeUsername(
  uid: string,
  currentUsername: string,
  rawNext: string
): Promise<string> {
  const next = normalizeUsername(rawNext);
  if (!USERNAME_PATTERN.test(next)) {
    throw new Error('Username must be 3-32 characters: a-z, 0-9 or underscore.');
  }
  const current = currentUsername.trim().toLowerCase();
  if (next === current) return next;

  const nextRef = doc(db, 'usernames', next);
  const path = `usernames/${next}`;
  try {
    const existingSnap = await getDoc(nextRef);
    if (existingSnap.exists()) {
      throw new Error(`Username @${next} is already taken. Please choose another.`);
    }
    const batch = writeBatch(db);
    batch.set(nextRef, { uid, username: next, createdAt: serverTimestamp() });
    batch.update(doc(db, 'users', uid), {
      username: next,
      updatedAt: serverTimestamp(),
    });
    if (current && USERNAME_PATTERN.test(current)) {
      batch.delete(doc(db, 'usernames', current));
    }
    await batch.commit();
    return next;
  } catch (error) {
    if (error instanceof Error && error.message.includes('already taken')) throw error;
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  friendRequests: true,
  friendAccepts: true,
  newFollowers: true,
  messages: true,
  liveInvites: true,
  gifts: true,
  promotions: true,
};

export const LANGUAGE_OPTIONS: { code: LanguageCode; label: string; native: string }[] = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'bn', label: 'Bengali', native: 'বাংলা' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
  { code: 'ur', label: 'Urdu', native: 'اردو' },
  { code: 'ar', label: 'Arabic', native: 'العربية' },
  { code: 'id', label: 'Indonesian', native: 'Bahasa Indonesia' },
  { code: 'tr', label: 'Turkish', native: 'Türkçe' },
  { code: 'es', label: 'Spanish', native: 'Español' },
  { code: 'fr', label: 'French', native: 'Français' },
];

export function defaultUserSettings(uid: string): UserSettings {
  return {
    uid,
    language: 'en',
    notifications: { ...DEFAULT_NOTIFICATION_PREFS },
  };
}

function mapUserSettings(uid: string, data: DocumentData | undefined): UserSettings {
  if (!data) return defaultUserSettings(uid);
  const prefs = (data.notifications ?? {}) as Partial<NotificationPrefs>;
  const language = LANGUAGE_OPTIONS.some((o) => o.code === data.language)
    ? (data.language as LanguageCode)
    : 'en';
  return {
    uid,
    language,
    notifications: {
      ...DEFAULT_NOTIFICATION_PREFS,
      ...Object.fromEntries(
        Object.entries(prefs).map(([key, value]) => [key, value !== false])
      ),
    },
  };
}

export function subscribeUserSettings(
  uid: string,
  onSettings: (settings: UserSettings) => void
): Unsubscribe {
  return listenWithRetry(
    doc(db, 'userSettings', uid),
    (snap) => onSettings(mapUserSettings(uid, snap.exists() ? snap.data() : undefined)),
    () => onSettings(defaultUserSettings(uid))
  );
}

export async function saveUserSettings(
  uid: string,
  settings: Pick<UserSettings, 'language' | 'notifications'>
): Promise<void> {
  const path = `userSettings/${uid}`;
  try {
    await setDoc(doc(db, 'userSettings', uid), {
      uid,
      language: settings.language,
      notifications: { ...settings.notifications },
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updatePresencePreference(
  uid: string,
  showPresence: boolean
): Promise<void> {
  const path = `users/${uid}`;
  try {
    await updateDoc(doc(db, 'users', uid), {
      showPresence,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function completeUserOnboarding(
  firebaseUser: User,
  input: {
    username: string;
    displayName: string;
    country: string;
    gender: GenderOption;
  }
): Promise<UserProfile> {
  const normalized = input.username
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 32);

  if (normalized.length < 3) {
    throw new Error('Username must be at least 3 lowercase letters, numbers, or underscores.');
  }

  const usernameRef = doc(db, 'usernames', normalized);
  const existingUsername = await getDoc(usernameRef);
  if (existingUsername.exists()) {
    throw new Error(`Username @${normalized} is already taken. Please choose another.`);
  }

  const isBootstrappedSuperAgent =
    isSuperAgentBootstrapEmail(firebaseUser.email) && firebaseUser.emailVerified;
  const isAdminBoot =
    isAdminBootstrapEmail(firebaseUser.email) && firebaseUser.emailVerified;

  const platformId = isAdminBoot
    ? '111111'
    : isBootstrappedSuperAgent
    ? '112200'
    : await nextUserPlatformId();
  const displayName = clampStr(
    input.displayName || firebaseUser.displayName || normalized,
    64
  );
  const country = clampStr(input.country || 'United States', 64);

  const batch = writeBatch(db);

  batch.set(usernameRef, {
    uid: firebaseUser.uid,
    username: normalized,
    createdAt: serverTimestamp(),
  });

  batch.set(doc(db, 'users', firebaseUser.uid), {
    uid: firebaseUser.uid,
    platformId,
    username: normalized,
    displayName,
    bio: 'Connect • Stream • Chat • Enjoy',
    country,
    gender: input.gender,
    accountType: isBootstrappedSuperAgent ? 'SUPER_AGENT' : 'USER',
    avatarColor: '#6366F1',
    coverGradient: 'linear-gradient(135deg, #3B0764 0%, #1E3A8A 60%, #09090E 100%)',
    followersCount: 0,
    followingCount: 0,
    visitorsCount: 0,
    isOnline: true,
    showPresence: true,
    lastActiveLabel: 'Online',
    isNewCreator: true,
    isSuspended: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  batch.set(doc(db, 'userPrivate', firebaseUser.uid), {
    uid: firebaseUser.uid,
    email: clampStr(firebaseUser.email || 'unknown@addabuzz.live', 160),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  batch.set(doc(db, 'wallets', firebaseUser.uid), {
    uid: firebaseUser.uid,
    coinBalance: 500,
    diamondBalance: 120,
    tradingCoinBalance: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const welcomeTxId = `tx_welcome_${firebaseUser.uid.slice(0, 16)}`;
  batch.set(
    doc(db, 'wallets', firebaseUser.uid, 'transactions', welcomeTxId),
    {
      transactionId: welcomeTxId,
      uid: firebaseUser.uid,
      currency: 'COIN',
      direction: 'CREDIT',
      amount: 500,
      reason: 'Welcome Community Grant (Coins)',
      counterparty: 'AddaBuzz Platform',
      idempotencyKey: `welcome_grant_coin_${firebaseUser.uid}`,
      createdAt: serverTimestamp(),
    }
  );

  const welcomeDiamondTxId = `tx_welcome_d_${firebaseUser.uid.slice(0, 16)}`;
  batch.set(
    doc(db, 'wallets', firebaseUser.uid, 'transactions', welcomeDiamondTxId),
    {
      transactionId: welcomeDiamondTxId,
      uid: firebaseUser.uid,
      currency: 'DIAMOND',
      direction: 'CREDIT',
      amount: 120,
      reason: 'Welcome Community Grant (Diamonds)',
      counterparty: 'AddaBuzz Platform',
      idempotencyKey: `welcome_grant_diamond_${firebaseUser.uid}`,
      createdAt: serverTimestamp(),
    }
  );

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${firebaseUser.uid}`);
  }

  const created = await fetchUserProfile(firebaseUser.uid);
  if (!created) {
    throw new Error('Failed to load newly created profile.');
  }
  return created;
}

export async function updateOwnProfile(
  uid: string,
  updates: {
    displayName?: string;
    bio?: string;
    country?: string;
    gender?: GenderOption;
    showPresence?: boolean;
    avatarUrl?: string;
    coverUrl?: string;
    superAgentUid?: string;
    hostAgencyUid?: string;
  }
): Promise<void> {
  const path = `users/${uid}`;
  try {
    const payload: Record<string, unknown> = { updatedAt: serverTimestamp() };
    if (updates.displayName !== undefined) payload.displayName = clampStr(updates.displayName, 64);
    if (updates.bio !== undefined) payload.bio = clampStr(updates.bio, 300);
    if (updates.country !== undefined) payload.country = clampStr(updates.country, 64);
    if (updates.gender !== undefined) payload.gender = updates.gender;
    if (updates.showPresence !== undefined) payload.showPresence = updates.showPresence;
    if (updates.avatarUrl !== undefined) payload.avatarUrl = updates.avatarUrl;
    if (updates.coverUrl !== undefined) payload.coverUrl = updates.coverUrl;

    if (updates.superAgentUid !== undefined) {
      const agentUid = updates.superAgentUid.trim();
      if (!agentUid) {
        payload.superAgentUid = '';
        payload.hostAgencyUid = '';
      } else {
        if (agentUid === uid) throw new Error('You cannot add yourself as your agent.');
        const agentProfile = await fetchUserProfile(agentUid);
        const eligible =
          agentProfile &&
          (agentProfile.accountType === 'AGENT' ||
            agentProfile.accountType === 'SUPER_AGENT' ||
            agentProfile.isHost === true);
        if (!agentProfile || !eligible) {
          throw new Error('This user is not an Agent, Super Agent, or Host.');
        }
        payload.superAgentUid = agentUid;
        payload.hostAgencyUid = agentProfile.isHost ? agentUid : '';
      }
    }
    await updateDoc(doc(db, 'users', uid), payload);
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.startsWith('You cannot add yourself') ||
        error.message.startsWith('This user is not'))
    ) {
      throw error;
    }
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function saveCoverImage(uid: string, dataUrl: string): Promise<void> {
  const path = `userCovers/${uid}`;
  try {
    await setDoc(doc(db, 'userCovers', uid), {
      uid,
      dataUrl,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function fetchCoverImage(uid: string): Promise<string | null> {
  try {
    const snap = await getDoc(doc(db, 'userCovers', uid));
    const dataUrl = snap.exists() ? snap.data().dataUrl : null;
    return typeof dataUrl === 'string' && dataUrl ? dataUrl : null;
  } catch {
    return null;
  }
}

export function subscribeFollowerUids(
  uid: string,
  onUids: (uids: string[]) => void
): Unsubscribe {
  return listenWithRetry(
    query(collection(db, 'follows'), where('targetUid', '==', uid), limit(100)),
    (snap) => onUids(snap.docs.map((d) => String(d.data().followerUid))),
    (error) => handleFirestoreError(error, OperationType.LIST, 'follows')
  );
}

export function subscribeVisitorUids(
  ownerUid: string,
  onUids: (uids: string[]) => void
): Unsubscribe {
  return listenWithRetry(
    query(
      collection(db, 'profileVisits', ownerUid, 'visitors'),
      orderBy('visitedAt', 'desc'),
      limit(50)
    ),
    (snap) => onUids(snap.docs.map((d) => String(d.data().visitorUid))),
    () => onUids([])
  );
}

export async function incrementProfileVisitors(uid: string, visitorUid?: string): Promise<void> {
  await updateDoc(doc(db, 'users', uid), {
    visitorsCount: increment(1),
    updatedAt: serverTimestamp(),
  });
  if (visitorUid && visitorUid !== uid) {
    await setDoc(doc(db, 'profileVisits', uid, 'visitors', visitorUid), {
      visitorUid,
      visitedAt: serverTimestamp(),
    });
  }
}

export async function heartbeatLiveRoom(roomId: string): Promise<void> {
  await updateDoc(doc(db, 'liveRooms', roomId), { updatedAt: serverTimestamp() });
}

export function subscribePublicUsers(
  onData: (users: UserProfile[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const q = query(
    collection(db, 'users'),
    where('isSuspended', '==', false),
    limit(60)
  );
  return listenWithRetry(
    q,
    (snapshot) => {
      const list: UserProfile[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          uid: String(d.uid),
          platformId: String(d.platformId),
          username: String(d.username),
          displayName: String(d.displayName),
          bio: String(d.bio ?? ''),
          country: String(d.country ?? 'USA'),
          gender: (d.gender as GenderOption) ?? 'Prefer not to say',
          accountType: d.accountType,
          avatarColor: String(d.avatarColor ?? '#6366F1'),
          coverGradient: String(
            d.coverGradient ?? 'linear-gradient(135deg, #2E1065 0%, #1E3A8A 100%)'
          ),
          avatarUrl: d.avatarUrl ? String(d.avatarUrl) : undefined,
          coverUrl: d.coverUrl ? String(d.coverUrl) : undefined,
          followersCount: Number(d.followersCount ?? 0),
          followingCount: Number(d.followingCount ?? 0),
          visitorsCount: Number(d.visitorsCount ?? 0),
          isOnline: Boolean(d.isOnline ?? false),
          showPresence: Boolean(d.showPresence ?? true),
          lastActiveLabel: String(d.lastActiveLabel ?? 'Active'),
          isNewCreator: Boolean(d.isNewCreator ?? false),
          isSuspended: Boolean(d.isSuspended ?? false),
        };
      });
      onData(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, 'users');
      } catch (e) {
        if (onError && e instanceof Error) onError(e);
      }
    }
  );
}

export function mapLiveRoomDoc(roomId: string, d: DocumentData): LiveRoom {
  const createdAtMs =
    d.createdAt instanceof Timestamp ? d.createdAt.toMillis() : Date.now();
  const durationSeconds = Math.max(0, Math.floor((Date.now() - createdAtMs) / 1000));
  const seatCount = normalizeSeatCount(d.seatCount);
  return {
    roomId: String(d.roomId ?? roomId),
    title: String(d.title ?? 'Live room'),
    description: String(d.description ?? ''),
    category: d.category,
    mode: d.mode,
    hostUid: String(d.hostUid),
    status: d.status === 'ENDED' ? 'ENDED' : 'LIVE',
    thumbnailUrl: d.thumbnailUrl ? String(d.thumbnailUrl) : undefined,
    fallbackGradient: String(
      d.fallbackGradient ?? 'linear-gradient(135deg, #3B0764 0%, #1D4ED8 100%)'
    ),
    viewerCount: Number(d.viewerCount ?? 1),
    startedAtLabel:
      durationSeconds < 60 ? 'Just started' : `${Math.floor(durationSeconds / 60)}m live`,
    durationSeconds,
    lastHeartbeatMs:
      d.updatedAt instanceof Timestamp ? d.updatedAt.toMillis() : createdAtMs,
    isFeatured: Boolean(d.isFeatured ?? false),
    isPrivateFollowersOnly: Boolean(d.isPrivateFollowersOnly ?? false),
    allowGuestRequests: d.allowGuestRequests !== false,
    allowViewerComments: d.allowViewerComments !== false,
    allowGifts: d.allowGifts !== false,
    hostApprovalForGuests: d.hostApprovalForGuests !== false,
    seatCount,
    seats: Array.from({ length: seatCount }, (_, idx) => ({
      seatNumber: idx + 1,
      status: 'AVAILABLE' as const,
    })),
    joinRequests: [],
    comments: [],
  };
}

export function subscribeLiveRooms(
  onData: (rooms: LiveRoom[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const q = query(
    collection(db, 'liveRooms'),
    where('status', '==', 'LIVE'),
    where('isPrivateFollowersOnly', '==', false),
    limit(40)
  );
  return listenWithRetry(
    q,
    (snapshot) => {
      onData(snapshot.docs.map((docSnap) => mapLiveRoomDoc(docSnap.id, docSnap.data())));
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, 'liveRooms');
      } catch (e) {
        if (onError && e instanceof Error) onError(e);
      }
    }
  );
}

// Single-doc subscription so hosts can stay inside their own followers-only
// room (excluded from the public Discover query) and shared room links resolve
// even when the room is not in the first page of the list query.
export function subscribeLiveRoomDoc(
  roomId: string,
  onData: (room: LiveRoom | null) => void
): Unsubscribe {
  return onSnapshot(
    doc(db, 'liveRooms', roomId),
    (snap) => {
      onData(snap.exists() ? mapLiveRoomDoc(snap.id, snap.data()) : null);
    },
    () => onData(null)
  );
}

export function subscribeRoomDetails(
  roomId: string,
  callbacks: {
    onSeats: (seats: GuestSeat[]) => void;
    onJoinRequests: (requests: JoinRequest[]) => void;
    onMessages: (comments: RoomComment[]) => void;
  },
  seatCount = 8
): () => void {
  const capacity = normalizeSeatCount(seatCount);
  const seatsQ = query(
    collection(db, 'liveRooms', roomId, 'seats'),
    where('seatNumber', '>=', 1),
    where('seatNumber', '<=', capacity)
  );
  const unsubSeats = listenWithRetry(
    seatsQ,
    (snap) => {
      const seatMap = new Map<number, GuestSeat>();
      snap.docs.forEach((docSnap) => {
        const d = docSnap.data();
        const num = Number(d.seatNumber);
        seatMap.set(num, {
          seatNumber: num,
          status: d.status,
          occupantUid: d.occupantUid,
          occupantName: d.occupantName,
          occupantUsername: d.occupantUsername,
          occupantAvatarColor: d.occupantAvatarColor,
          isMuted: Boolean(d.isMuted ?? false),
          isSpeaking: Boolean(d.isSpeaking ?? false),
        });
      });
      const ordered = Array.from({ length: capacity }, (_, idx) => {
        const num = idx + 1;
        return seatMap.get(num) ?? { seatNumber: num, status: 'AVAILABLE' as const };
      });
      callbacks.onSeats(ordered);
    },
    (error) => handleFirestoreError(error, OperationType.LIST, `liveRooms/${roomId}/seats`)
  );

  const reqQ = query(
    collection(db, 'liveRooms', roomId, 'joinRequests'),
    where('roomId', '==', roomId),
    limit(30)
  );
  const unsubRequests = auth.currentUser
    ? listenWithRetry(
        reqQ,
        (snap) => {
          const reqs: JoinRequest[] = snap.docs.map((docSnap) => {
            const d = docSnap.data();
            return {
              requestId: String(d.requestId),
              uid: String(d.uid),
              username: String(d.username),
              displayName: String(d.displayName),
              avatarColor: String(d.avatarColor ?? '#6366F1'),
              preferredSeatNumber:
                typeof d.preferredSeatNumber === 'number'
                  ? d.preferredSeatNumber
                  : undefined,
              createdAtLabel: formatTimestamp(d.createdAt),
            };
          });
          callbacks.onJoinRequests(reqs);
        },
        (error) =>
          handleFirestoreError(error, OperationType.LIST, `liveRooms/${roomId}/joinRequests`)
      )
    : () => {};

  const msgQ = query(
    collection(db, 'liveRooms', roomId, 'messages'),
    where('roomId', '==', roomId),
    limit(50)
  );
  const unsubMessages = listenWithRetry(
    msgQ,
    (snap) => {
      const msgs = snap.docs
        .map((docSnap) => {
          const d = docSnap.data();
          const sortMs =
            d.createdAt instanceof Timestamp ? d.createdAt.toMillis() : Date.now();
          return {
            sortMs,
            item: {
              id: String(d.id),
              uid: String(d.uid),
              username: String(d.username),
              displayName: String(d.displayName),
              accountType: d.accountType,
              text: String(d.text),
              timestampLabel: formatTimestamp(d.createdAt),
              isGiftEvent: Boolean(d.isGiftEvent ?? false),
              giftId: d.giftId,
              giftName: d.giftName,
              giftCurrency: d.giftCurrency,
              giftAmount: d.giftAmount,
              giftRecipientUid: d.giftRecipientUid
                ? String(d.giftRecipientUid)
                : undefined,
              giftRecipientName: d.giftRecipientName
                ? String(d.giftRecipientName)
                : undefined,
              giftRecipientDiamonds:
                typeof d.giftRecipientDiamonds === 'number'
                  ? Number(d.giftRecipientDiamonds)
                  : undefined,
            } as RoomComment,
          };
        })
        .sort((a, b) => a.sortMs - b.sortMs)
        .map((x) => x.item);
      callbacks.onMessages(msgs);
    },
    (error) => handleFirestoreError(error, OperationType.LIST, `liveRooms/${roomId}/messages`)
  );

  return () => {
    unsubSeats();
    unsubRequests();
    unsubMessages();
  };
}

export async function createLiveRoomDoc(
  host: UserProfile,
  payload: CreateLiveRoomPayload
): Promise<string> {
  const roomId = `room_${Date.now()}_${host.uid.slice(0, 6)}`;
  const batch = writeBatch(db);
  const seatCount = normalizeSeatCount(payload.seatCount);

  batch.set(doc(db, 'liveRooms', roomId), {
    roomId,
    hostUid: host.uid,
    title: clampStr(payload.title, 120),
    description: clampStr(payload.description, 400),
    category: payload.category,
    mode: payload.mode,
    seatCount,
    status: 'LIVE',
    viewerCount: 1,
    isPrivateFollowersOnly: payload.isPrivateFollowersOnly,
    allowGuestRequests: payload.allowGuestRequests,
    allowViewerComments: payload.allowViewerComments,
    allowGifts: payload.allowGifts,
    hostApprovalForGuests: payload.hostApprovalForGuests,
    isFeatured: false,
    fallbackGradient: 'linear-gradient(135deg, #3B0764 0%, #1E3A8A 100%)',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  for (let i = 1; i <= seatCount; i++) {
    batch.set(doc(db, 'liveRooms', roomId, 'seats', `seat_${i}`), {
      seatNumber: i,
      status: 'AVAILABLE',
      updatedAt: serverTimestamp(),
    });
  }

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `liveRooms/${roomId}`);
  }

  return roomId;
}

export async function endLiveRoomDoc(roomId: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'liveRooms', roomId), {
      status: 'ENDED',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `liveRooms/${roomId}`);
  }
}

export async function postRoomMessageDoc(
  roomId: string,
  sender: UserProfile,
  text: string
): Promise<void> {
  const msgId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const path = `liveRooms/${roomId}/messages/${msgId}`;
  try {
    await setDoc(doc(db, 'liveRooms', roomId, 'messages', msgId), {
      id: msgId,
      roomId,
      uid: sender.uid,
      username: clampStr(sender.username, 32),
      displayName: clampStr(sender.displayName, 64),
      accountType: sender.accountType,
      text: clampStr(text, 400),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteRoomMessageDoc(
  roomId: string,
  messageId: string
): Promise<void> {
  try {
    await deleteDoc(doc(db, 'liveRooms', roomId, 'messages', messageId));
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.DELETE,
      `liveRooms/${roomId}/messages/${messageId}`
    );
  }
}

// Room moderators are granted by the host (or an admin) and can mute/remove
// guests and delete chat messages. The list is public to signed-in readers so
// every client can show the shield badge consistently.
export function subscribeRoomModerators(
  roomId: string,
  onData: (moderators: RoomModerator[]) => void
): Unsubscribe {
  return listenWithRetry(
    collection(db, 'liveRooms', roomId, 'moderators'),
    (snap) => {
      onData(
        snap.docs.map((docSnap) => {
          const d = docSnap.data();
          return {
            uid: String(d.uid ?? docSnap.id),
            username: String(d.username ?? ''),
            displayName: String(d.displayName ?? ''),
            addedBy: String(d.addedBy ?? ''),
          } satisfies RoomModerator;
        })
      );
    },
    (error) =>
      handleFirestoreError(error, OperationType.LIST, `liveRooms/${roomId}/moderators`)
  );
}

export async function addRoomModeratorDoc(
  roomId: string,
  actor: UserProfile,
  target: Pick<UserProfile, 'uid' | 'username' | 'displayName'>
): Promise<void> {
  try {
    await setDoc(doc(db, 'liveRooms', roomId, 'moderators', target.uid), {
      uid: target.uid,
      username: clampStr(target.username, 32),
      displayName: clampStr(target.displayName, 64),
      addedBy: actor.uid,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.CREATE,
      `liveRooms/${roomId}/moderators/${target.uid}`
    );
  }
}

export async function removeRoomModeratorDoc(
  roomId: string,
  uid: string
): Promise<void> {
  try {
    await deleteDoc(doc(db, 'liveRooms', roomId, 'moderators', uid));
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.DELETE,
      `liveRooms/${roomId}/moderators/${uid}`
    );
  }
}

export interface SeatActor {
  uid: string;
  /** True when the acting account is a platform admin (bootstrap email). */
  isAdmin?: boolean;
}

// Room controllers (host, appointed moderator, platform admin) may act on
// seats directly; everyone else must go through the join-request flow.
async function isRoomControllerInTx(
  tx: Transaction,
  roomId: string,
  roomData: DocumentData,
  actor: SeatActor
): Promise<boolean> {
  if (actor.isAdmin) return true;
  if (roomData.hostUid === actor.uid) return true;
  const modSnap = await tx.get(doc(db, 'liveRooms', roomId, 'moderators', actor.uid));
  return modSnap.exists();
}

export async function requestRoomSeatDoc(
  roomId: string,
  user: UserProfile,
  seatNumber: number,
  opts?: { isAdmin?: boolean }
): Promise<'joined' | 'requested'> {
  const reqId = `req_${user.uid.slice(0, 12)}_${seatNumber}`;
  const seatRef = doc(db, 'liveRooms', roomId, 'seats', `seat_${seatNumber}`);
  const reqRef = doc(db, 'liveRooms', roomId, 'joinRequests', reqId);
  const actor: SeatActor = { uid: user.uid, isAdmin: opts?.isAdmin };

  try {
    return await runTransaction(db, async (tx) => {
      const roomSnap = await tx.get(doc(db, 'liveRooms', roomId));
      if (!roomSnap.exists()) throw new Error('This room is no longer available.');
      const roomData = roomSnap.data()!;
      if (roomData.status !== 'LIVE') throw new Error('This live room has ended.');
      const seatSnap = await tx.get(seatRef);
      if (!seatSnap.exists()) throw new Error('Seat not found.');
      const seatData = seatSnap.data()!;

      // The host already has their own stage seat (Seat 1). Guest seats are
      // for viewers only.
      if (String(roomData.hostUid) === user.uid) {
        throw new Error('You are the host — you are already on stage in Seat 1.');
      }

      // One seat per person: block accounts that already sit on stage or
      // already have a pending request for another seat.
      const capacity = normalizeSeatCount(roomData.seatCount);
      const seatSnaps = await Promise.all(
        Array.from({ length: capacity }, (_, idx) =>
          tx.get(doc(db, 'liveRooms', roomId, 'seats', `seat_${idx + 1}`))
        )
      );
      const myOccupiedSeat = seatSnaps.find(
        (s) =>
          s.exists() &&
          s.data().status === 'OCCUPIED' &&
          s.data().occupantUid === user.uid
      );
      if (myOccupiedSeat) {
        throw new Error(
          `You are already on stage in Seat ${Number(myOccupiedSeat.data()!.seatNumber)}.`
        );
      }
      const myReqPrefix = `req_${user.uid.slice(0, 12)}_`;
      for (const pending of seatSnaps) {
        if (!pending.exists() || pending.data().status !== 'REQUESTED') continue;
        const pendingNum = Number(pending.data()!.seatNumber);
        const myPending = await tx.get(
          doc(db, 'liveRooms', roomId, 'joinRequests', `${myReqPrefix}${pendingNum}`)
        );
        if (myPending.exists()) {
          throw new Error(`You already have a pending request for Seat ${pendingNum}.`);
        }
      }

      // Hosts, moderators and admins take seats directly — they never need
      // to request or self-approve. The seat still must be empty and unlocked.
      if (await isRoomControllerInTx(tx, roomId, roomData, actor)) {
        if (seatData.status === 'LOCKED') {
          throw new Error(`Seat ${seatNumber} is locked. Unlock it first.`);
        }
        if (seatData.status !== 'AVAILABLE') {
          throw new Error(`Seat ${seatNumber} is not available right now.`);
        }
        tx.update(seatRef, {
          status: 'OCCUPIED',
          occupantUid: user.uid,
          occupantName: clampStr(user.displayName, 64),
          occupantUsername: clampStr(user.username, 32),
          occupantAvatarColor: clampStr(user.avatarColor, 24),
          isMuted: false,
          isSpeaking: true,
          updatedAt: serverTimestamp(),
        });
        return 'joined' as const;
      }

      if (roomData.allowGuestRequests === false) {
        throw new Error('The host has turned off guest seat requests.');
      }
      if (seatData.status !== 'AVAILABLE') {
        throw new Error(`Seat ${seatNumber} is no longer available.`);
      }

      // Auto-open seats: when the host does not require approval the seat is
      // occupied immediately, no join request round-trip needed.
      if (roomData.hostApprovalForGuests === false) {
        tx.update(seatRef, {
          status: 'OCCUPIED',
          occupantUid: user.uid,
          occupantName: clampStr(user.displayName, 64),
          occupantUsername: clampStr(user.username, 32),
          occupantAvatarColor: clampStr(user.avatarColor, 24),
          isMuted: false,
          isSpeaking: true,
          updatedAt: serverTimestamp(),
        });
        return 'joined' as const;
      }

      tx.update(seatRef, {
        status: 'REQUESTED',
        updatedAt: serverTimestamp(),
      });
      tx.set(reqRef, {
        requestId: reqId,
        roomId,
        uid: user.uid,
        username: clampStr(user.username, 32),
        displayName: clampStr(user.displayName, 64),
        avatarColor: clampStr(user.avatarColor, 24),
        preferredSeatNumber: seatNumber,
        createdAt: serverTimestamp(),
      });
      return 'requested' as const;
    });
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.WRITE,
      `liveRooms/${roomId}/seats/seat_${seatNumber}`
    );
  }
}

export async function approveJoinRequestDoc(
  roomId: string,
  request: JoinRequest,
  actor: SeatActor
): Promise<number> {
  const reqRef = doc(db, 'liveRooms', roomId, 'joinRequests', request.requestId);
  try {
    return await runTransaction(db, async (tx) => {
      if (request.uid === actor.uid) {
        throw new Error(
          'You cannot approve your own seat request. Ask another host, moderator or admin.'
        );
      }
      const roomSnap = await tx.get(doc(db, 'liveRooms', roomId));
      if (!roomSnap.exists()) throw new Error('Room not found.');
      const roomData = roomSnap.data()!;
      if (roomData.status !== 'LIVE') throw new Error('This live room has ended.');
      if (!(await isRoomControllerInTx(tx, roomId, roomData, actor))) {
        throw new Error('Only the host, moderators or an admin can approve seat requests.');
      }
      const reqSnap = await tx.get(reqRef);
      if (!reqSnap.exists()) {
        throw new Error('This seat request is no longer pending.');
      }
      if (String(reqSnap.data().uid) !== request.uid) {
        throw new Error('Seat request details changed. Refresh and try again.');
      }
      const capacity = normalizeSeatCount(roomData.seatCount);
      const seatSnaps = await Promise.all(
        Array.from({ length: capacity }, (_, idx) =>
          tx.get(doc(db, 'liveRooms', roomId, 'seats', `seat_${idx + 1}`))
        )
      );
      const occupiedCount = seatSnaps.filter(
        (s) => s.exists() && s.data().status === 'OCCUPIED'
      ).length;
      if (occupiedCount >= capacity) {
        throw new Error(`Maximum ${capacity} guest seats are already occupied.`);
      }
      const alreadySeated = seatSnaps.find(
        (s) =>
          s.exists() &&
          s.data().status === 'OCCUPIED' &&
          s.data().occupantUid === request.uid
      );
      if (alreadySeated) {
        throw new Error(
          `@${request.username} is already on stage in Seat ${Number(
            alreadySeated.data()!.seatNumber
          )}.`
        );
      }

      const preferred = seatSnaps.find(
        (s) =>
          s.exists() &&
          s.data().seatNumber === request.preferredSeatNumber &&
          (s.data().status === 'AVAILABLE' || s.data().status === 'REQUESTED')
      );
      const fallback = seatSnaps.find(
        (s) => s.exists() && s.data().status === 'AVAILABLE'
      );
      const target = preferred ?? fallback;
      if (!target) {
        throw new Error('No unlocked guest seats available.');
      }
      const seatNum = Number(target.data()!.seatNumber);
      tx.update(target.ref, {
        status: 'OCCUPIED',
        occupantUid: request.uid,
        occupantName: clampStr(request.displayName, 64),
        occupantUsername: clampStr(request.username, 32),
        occupantAvatarColor: clampStr(request.avatarColor, 24),
        isMuted: false,
        isSpeaking: true,
        updatedAt: serverTimestamp(),
      });
      tx.delete(reqRef);
      return seatNum;
    });
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.WRITE,
      `liveRooms/${roomId}/joinRequests/${request.requestId}`
    );
  }
}

export async function rejectJoinRequestDoc(
  roomId: string,
  request: JoinRequest,
  actor: SeatActor
): Promise<void> {
  const reqRef = doc(db, 'liveRooms', roomId, 'joinRequests', request.requestId);
  try {
    await runTransaction(db, async (tx) => {
      // The requester may withdraw their own request; otherwise only room
      // controllers can reject someone else's request.
      if (request.uid !== actor.uid) {
        const roomSnap = await tx.get(doc(db, 'liveRooms', roomId));
        if (!roomSnap.exists()) throw new Error('Room not found.');
        if (!(await isRoomControllerInTx(tx, roomId, roomSnap.data()!, actor))) {
          throw new Error(
            'Only the host, moderators or an admin can reject seat requests.'
          );
        }
      }
      if (request.preferredSeatNumber) {
        const seatRef = doc(
          db,
          'liveRooms',
          roomId,
          'seats',
          `seat_${request.preferredSeatNumber}`
        );
        const seatSnap = await tx.get(seatRef);
        if (seatSnap.exists() && seatSnap.data().status === 'REQUESTED') {
          tx.update(seatRef, {
            status: 'AVAILABLE',
            updatedAt: serverTimestamp(),
          });
        }
      }
      tx.delete(reqRef);
    });
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.DELETE,
      `liveRooms/${roomId}/joinRequests/${request.requestId}`
    );
  }
}

export async function leaveRoomSeatDoc(
  roomId: string,
  seatNumber: number
): Promise<void> {
  const path = `liveRooms/${roomId}/seats/seat_${seatNumber}`;
  try {
    await updateDoc(doc(db, 'liveRooms', roomId, 'seats', `seat_${seatNumber}`), {
      status: 'AVAILABLE',
      occupantUid: '',
      occupantName: '',
      occupantUsername: '',
      occupantAvatarColor: '#6366F1',
      isMuted: false,
      isSpeaking: false,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function adjustRoomViewerCountDoc(
  roomId: string,
  delta: 1 | -1
): Promise<void> {
  if (!auth.currentUser?.emailVerified) return;
  const roomRef = doc(db, 'liveRooms', roomId);
  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(roomRef);
      if (!snap.exists()) return;
      const data = snap.data();
      if (data.status !== 'LIVE') return;
      // viewerCount is seeded with 1 for the host; the host's own join must not add another.
      if (delta === 1 && data.hostUid === auth.currentUser?.uid) return;
      const current = Number(data.viewerCount ?? 1);
      const next = delta === 1 ? current + 1 : Math.max(1, current - 1);
      if (next !== current) {
        tx.update(roomRef, {
          viewerCount: next,
          updatedAt: serverTimestamp(),
        });
      }
    });
  } catch {
    // Non-critical presence metric
  }
}

// Real connected viewers: every viewer keeps one signaling doc in rtc/{uid}
// while they are receiving the stream, so the host can list who is watching.
export function subscribeRoomPresence(
  roomId: string,
  onViewerUids: (uids: string[]) => void
): Unsubscribe {
  return listenWithRetry(
    collection(db, 'liveRooms', roomId, 'rtc'),
    (snap) => {
      const uids = snap.docs
        .map((docSnap) => String(docSnap.data().viewerUid ?? docSnap.id))
        .filter(Boolean);
      onViewerUids(Array.from(new Set(uids)));
    },
    (error) =>
      handleFirestoreError(error, OperationType.LIST, `liveRooms/${roomId}/rtc`)
  );
}

// Live likes: each viewer owns a likes/{uid} counter doc; the UI sums all
// counters in real time. Updates are additive only, capped per write.
export function subscribeRoomLikes(
  roomId: string,
  onTotal: (total: number) => void
): Unsubscribe {
  return listenWithRetry(
    collection(db, 'liveRooms', roomId, 'likes'),
    (snap) => {
      let total = 0;
      snap.forEach((docSnap) => {
        total += Math.max(0, Number(docSnap.data().count ?? 0));
      });
      onTotal(total);
    },
    (error) =>
      handleFirestoreError(error, OperationType.LIST, `liveRooms/${roomId}/likes`)
  );
}

export async function sendRoomLikesDoc(
  roomId: string,
  uid: string,
  delta: number
): Promise<void> {
  if (delta <= 0) return;
  const ref = doc(db, 'liveRooms', roomId, 'likes', uid);
  const path = `liveRooms/${roomId}/likes/${uid}`;
  try {
    const snap = await getDoc(ref);
    if (snap.exists()) {
      await updateDoc(ref, {
        count: increment(delta),
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, {
        uid,
        count: delta,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Host moderation: deleting a viewer's signaling doc closes their peer
// connection and drops them from the presence list.
export async function removeRoomViewerDoc(
  roomId: string,
  viewerUid: string
): Promise<void> {
  try {
    await deleteDoc(doc(db, 'liveRooms', roomId, 'rtc', viewerUid));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `liveRooms/${roomId}/rtc/${viewerUid}`);
  }
}

export async function updateSeatStateDoc(
  roomId: string,
  seatNumber: number,
  updates: Partial<{
    status: GuestSeat['status'];
    isMuted: boolean;
    occupantUid: string;
    occupantName: string;
    occupantUsername: string;
    occupantAvatarColor: string;
    isSpeaking: boolean;
  }>
): Promise<void> {
  const path = `liveRooms/${roomId}/seats/seat_${seatNumber}`;
  try {
    await updateDoc(doc(db, 'liveRooms', roomId, 'seats', `seat_${seatNumber}`), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export function subscribeWalletBalance(
  uid: string,
  onWallet: (coins: number, diamonds: number, tradingCoins: number) => void
): () => void {
  return listenWithRetry(
    doc(db, 'wallets', uid),
    (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        onWallet(
          Number(d.coinBalance ?? 0),
          Number(d.diamondBalance ?? 0),
          Number(d.tradingCoinBalance ?? 0)
        );
      }
    },
    (error) => handleFirestoreError(error, OperationType.GET, `wallets/${uid}`)
  );
}

// Ledger window re-reads on every new transaction, so it is only attached
// while a money view is open and kept small to protect the daily read quota.
export function subscribeWalletTransactions(
  uid: string,
  onTransactions: (txs: WalletTransaction[]) => void
): () => void {
  return listenWithRetry(
    query(collection(db, 'wallets', uid, 'transactions'), orderBy('createdAt', 'desc'), limit(25)),
    (snap) => {
      const list = snap.docs
        .map((docSnap) => {
          const d = docSnap.data();
          const sortMs =
            d.createdAt instanceof Timestamp ? d.createdAt.toMillis() : Date.now();
          return {
            sortMs,
            tx: {
              transactionId: String(d.transactionId),
              currency: d.currency,
              direction: d.direction,
              amount: Number(d.amount),
              reason: String(d.reason),
              counterparty: d.counterparty ? String(d.counterparty) : undefined,
              idempotencyKey: String(d.idempotencyKey),
              timestampLabel: formatTimestamp(d.createdAt),
            } as WalletTransaction,
          };
        })
        .sort((a, b) => b.sortMs - a.sortMs)
        .map((x) => x.tx);
      onTransactions(list);
    },
    (error) =>
      handleFirestoreError(error, OperationType.LIST, `wallets/${uid}/transactions`)
  );
}

export interface GiftRecipient {
  uid: string;
  username: string;
  displayName: string;
}

export type GiftContext = {
  type: 'ROOM' | 'CONVERSATION';
  id: string;
};

type LuckyReceiptExtras = { luckyValue: number; luckyMultiplier: number };

export async function sendVirtualGiftTransaction(
  context: GiftContext,
  sender: UserProfile,
  recipient: GiftRecipient,
  gift: GiftCatalogItem
): Promise<{ recipientDiamonds: number }> {
  return sendGiftTransactionCore(context, sender, recipient, gift);
}

/**
 * Poppo-style Lucky open: the sender pays the box price, and the recipient
 * receives 70% of the randomly revealed value as Diamonds. The revealed
 * value/multiplier ride along on the gift receipt so the security rules can
 * bound them (value <= price x 520, diamonds = 70% of the revealed value).
 */
export async function sendLuckyGiftTransaction(
  context: GiftContext,
  sender: UserProfile,
  recipient: GiftRecipient,
  box: LuckyGiftBox,
  roll: LuckyRoll
): Promise<{ recipientDiamonds: number }> {
  const gift: GiftCatalogItem = {
    giftId: box.giftId,
    name: `${box.name} ×${roll.multiplier}`,
    currency: 'COIN',
    price: box.price,
    accentHex: box.accentHex,
    imageUrl: box.imageUrl,
    effect: box.effect,
  };
  return sendGiftTransactionCore(context, sender, recipient, gift, {
    luckyValue: roll.value,
    // Receipts store the multiplier in tenths so Firestore rules can type it
    // as an int (0.1 -> 1, 520 -> 5200).
    luckyMultiplier: Math.round(roll.multiplier * 10),
  });
}

async function sendGiftTransactionCore(
  context: GiftContext,
  sender: UserProfile,
  recipient: GiftRecipient,
  gift: GiftCatalogItem,
  lucky?: LuckyReceiptExtras
): Promise<{ recipientDiamonds: number }> {
  if (recipient.uid === sender.uid) {
    throw new Error('You cannot send a gift to yourself.');
  }

  const eventId = `gift_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const senderWalletRef = doc(db, 'wallets', sender.uid);
  const recipientWalletRef = doc(db, 'wallets', recipient.uid);
  const senderTxId = `tx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const recipientTxId = `tx_r_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const senderTxRef = doc(db, 'wallets', sender.uid, 'transactions', senderTxId);
  const recipientTxRef = doc(db, 'wallets', recipient.uid, 'transactions', recipientTxId);
  const eventRef = doc(db, 'giftEvents', eventId);
  const msgId = `msg_gift_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const msgRef =
    context.type === 'ROOM'
      ? doc(db, 'liveRooms', context.id, 'messages', msgId)
      : doc(db, 'conversations', context.id, 'messages', msgId);
  const conversationRef =
    context.type === 'CONVERSATION'
      ? doc(db, 'conversations', context.id)
      : null;

  // Recipient keeps 70% of the gift value as Diamonds. A Lucky open pays 70%
  // of the revealed value instead of the box price.
  const recipientDiamonds = lucky
    ? Math.floor((lucky.luckyValue * 7) / 10)
    : Math.floor(gift.price * 0.70);
  const giftMessage = `Sent ${gift.name} to @${recipient.username} (+${recipientDiamonds.toLocaleString()} Diamonds)`;

  try {
    await runTransaction(db, async (tx) => {
      // All reads must happen before the first write in a Firestore transaction.
      const [walletSnap, recipientWalletSnap, recipientUserSnap] = await Promise.all([
        tx.get(senderWalletRef),
        tx.get(recipientWalletRef),
        tx.get(doc(db, 'users', recipient.uid)),
      ]);

      if (!walletSnap.exists()) throw new Error('Wallet not initialized.');
      if (!recipientWalletSnap.exists()) {
        throw new Error('Recipient wallet is not initialized.');
      }

      const w = walletSnap.data();
      const coins = Number(w.coinBalance ?? 0);
      const diamonds = Number(w.diamondBalance ?? 0);

      if (gift.currency === 'COIN' && coins < gift.price) {
        throw new Error(`Insufficient Coins (need ${gift.price}).`);
      }
      if (gift.currency === 'DIAMOND' && diamonds < gift.price) {
        throw new Error(`Insufficient Diamonds (need ${gift.price}).`);
      }

      // Agency commission metadata (resolved before writes).
      let commissionUid: string | undefined;
      let commissionAmount = 0;
      let commissionRate = 0;
      let commissionWalletRef: DocumentReference | null = null;
      let commissionBalance = 0;

      if (recipientUserSnap.exists()) {
        const rData = recipientUserSnap.data();
        const agencyUid = rData.superAgentUid || rData.hostAgencyUid;
        if (
          typeof agencyUid === 'string' &&
          agencyUid &&
          agencyUid !== recipient.uid &&
          agencyUid !== sender.uid
        ) {
          // 5% for agents, 10% for hosts.
          const ratePct = rData.accountType === 'AGENT' ? 5 : 10;
          const amount = Math.max(1, Math.floor((gift.price * ratePct) / 100));
          const agencyWalletRef = doc(db, 'wallets', agencyUid);
          const agencyWalletSnap = await tx.get(agencyWalletRef);
          if (agencyWalletSnap.exists()) {
            commissionUid = agencyUid;
            commissionAmount = amount;
            commissionRate = ratePct;
            commissionWalletRef = agencyWalletRef;
            commissionBalance = Number(agencyWalletSnap.data().diamondBalance ?? 0);
          }
        }
      }

      // 1. Debit the sender.
      tx.update(senderWalletRef, {
        coinBalance: gift.currency === 'COIN' ? coins - gift.price : coins,
        diamondBalance: gift.currency === 'DIAMOND' ? diamonds - gift.price : diamonds,
        updatedAt: serverTimestamp(),
      });

      tx.set(senderTxRef, {
        transactionId: senderTxId,
        uid: sender.uid,
        currency: gift.currency,
        direction: 'DEBIT',
        amount: gift.price,
        reason: clampStr(`Sent ${gift.name} to @${recipient.username}`, 160),
        counterparty: clampStr(`@${recipient.username}`, 64),
        idempotencyKey: eventId,
        createdAt: serverTimestamp(),
      });

      // 2. Credit the recipient with Diamonds.
      const recipientWalletData = recipientWalletSnap.data();
      const curRecipientDiamonds = Number(recipientWalletData.diamondBalance ?? 0);
      tx.update(recipientWalletRef, {
        diamondBalance: curRecipientDiamonds + recipientDiamonds,
        lastGiftEventId: eventId,
        updatedAt: serverTimestamp(),
      });
      tx.set(recipientTxRef, {
        transactionId: recipientTxId,
        uid: recipient.uid,
        currency: 'DIAMOND',
        direction: 'CREDIT',
        amount: recipientDiamonds,
        reason: clampStr(`Received ${gift.name} from @${sender.username}`, 160),
        counterparty: clampStr(`@${sender.username}`, 64),
        idempotencyKey: eventId,
        createdAt: serverTimestamp(),
      });

      // 3. Agency commission (optional).
      if (commissionUid && commissionAmount > 0 && commissionWalletRef) {
        const commissionTxId = `tx_c_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        tx.update(commissionWalletRef, {
          diamondBalance: commissionBalance + commissionAmount,
          lastGiftEventId: eventId,
          updatedAt: serverTimestamp(),
        });
        tx.set(doc(db, 'wallets', commissionUid, 'transactions', commissionTxId), {
          transactionId: commissionTxId,
          uid: commissionUid,
          currency: 'DIAMOND',
          direction: 'CREDIT',
          amount: commissionAmount,
          reason: clampStr(
            `Agency Commission (${commissionRate}%): @${recipient.username} received ${gift.name}`,
            160
          ),
          counterparty: clampStr(`@${recipient.username}`, 64),
          idempotencyKey: eventId,
          createdAt: serverTimestamp(),
        });

        const storyId = `story_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        const d = new Date();
        const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
          d.getDate()
        ).padStart(2, '0')}`;
        tx.set(doc(db, 'agencyCommissions', storyId), {
          id: storyId,
          eventId,
          superAgentUid: commissionUid,
          memberUid: recipient.uid,
          memberUsername: clampStr(recipient.username, 32),
          memberDisplayName: clampStr(recipient.displayName || recipient.username, 64),
          memberType: recipientUserSnap.data()?.accountType === 'AGENT' ? 'AGENT' : 'HOST',
          giftName: gift.name,
          giftPrice: gift.price,
          commissionRate: commissionRate / 100,
          commissionAmount,
          dateKey,
          createdAt: serverTimestamp(),
          timestampMillis: Date.now(),
        });
      }

      // 4. Immutable gift event receipt — the security anchor for wallet credits.
      tx.set(eventRef, {
        eventId,
        contextType: context.type,
        contextId: context.id,
        senderUid: sender.uid,
        senderUsername: clampStr(sender.username, 32),
        recipientUid: recipient.uid,
        recipientUsername: clampStr(recipient.username, 32),
        recipientDisplayName: clampStr(recipient.displayName || recipient.username, 64),
        giftId: clampStr(gift.giftId, 48),
        giftName: clampStr(gift.name, 48),
        giftCurrency: gift.currency,
        giftAmount: gift.price,
        recipientDiamonds,
        ...(commissionUid
          ? { commissionUid, commissionAmount, commissionRate }
          : {}),
        ...(lucky
          ? { luckyValue: lucky.luckyValue, luckyMultiplier: lucky.luckyMultiplier }
          : {}),
        createdAt: serverTimestamp(),
      });

      const giftMessageFields = {
        isGiftEvent: true,
        giftId: gift.giftId,
        giftName: gift.name,
        giftCurrency: gift.currency,
        giftAmount: gift.price,
        giftRecipientUid: recipient.uid,
        giftRecipientName: clampStr(recipient.displayName || recipient.username, 64),
        giftRecipientDiamonds: recipientDiamonds,
      };

      // 5. Gift message in the room chat or the direct-message thread.
      if (context.type === 'ROOM') {
        tx.set(msgRef, {
          id: msgId,
          roomId: context.id,
          uid: sender.uid,
          username: clampStr(sender.username, 32),
          displayName: clampStr(sender.displayName, 64),
          accountType: sender.accountType,
          text: clampStr(giftMessage, 400),
          ...giftMessageFields,
          createdAt: serverTimestamp(),
        });
      } else {
        tx.set(msgRef, {
          id: msgId,
          senderUid: sender.uid,
          memberUids: [sender.uid, recipient.uid].sort(),
          text: clampStr(giftMessage, 1000),
          ...giftMessageFields,
          createdAt: serverTimestamp(),
        });
        if (conversationRef) {
          tx.update(conversationRef, {
            lastMessageText: clampStr(giftMessage, 500),
            updatedAt: serverTimestamp(),
          });
        }
      }
    });
    return { recipientDiamonds };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Insufficient')) {
      throw error;
    }
    if (error instanceof Error && error.message.startsWith('Recipient')) {
      throw error;
    }
    handleFirestoreError(error, OperationType.WRITE, `wallets/${sender.uid}`);
  }
}

function gameTxDocId(idempotencyKey: string): string {
  return idempotencyKey.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 120);
}

// Optimistic-concurrency failures ("the stored version does not match the
// required base version") happen when several clients touch the same wallet
// document at once. These are safe to retry: the idempotency doc below makes
// the retry skip the move when the first attempt actually committed.
const GAME_TX_MAX_ATTEMPTS = 6;
const GAME_TX_RETRY_DELAY_MS = 300;

function isOptimisticWriteError(error: unknown): boolean {
  return (
    error instanceof Error &&
    /does not match the required base version|Please try again|concurrent|stale version/i.test(
      error.message
    )
  );
}


// Exactly-once game wallet ops: the transaction doc id IS the idempotency key,
// so a retry after a network failure sees the existing doc and skips the move.
export async function gameCoinDebit(
  uid: string,
  amount: number,
  reason: string,
  idempotencyKey: string
): Promise<string> {
  const txId = gameTxDocId(idempotencyKey);
  const walletRef = doc(db, 'wallets', uid);
  const txRef = doc(db, 'wallets', uid, 'transactions', txId);
  let lastError: unknown;
  for (let attempt = 1; attempt <= GAME_TX_MAX_ATTEMPTS; attempt += 1) {
    try {
      await runTransaction(db, async (tx) => {
        const [walletSnap, existing] = await Promise.all([tx.get(walletRef), tx.get(txRef)]);
        if (existing.exists()) return;
        if (!walletSnap.exists()) throw new Error('Wallet not initialized.');
        const coins = Number(walletSnap.data().coinBalance ?? 0);
        if (coins < amount) throw new Error(`Insufficient Coins (need ${amount.toLocaleString('en-US')}).`);
        tx.update(walletRef, { coinBalance: coins - amount, updatedAt: serverTimestamp() });
        tx.set(txRef, {
          transactionId: txId,
          uid,
          currency: 'COIN',
          direction: 'DEBIT',
          amount,
          reason: clampStr(reason, 160),
          idempotencyKey,
          createdAt: serverTimestamp(),
        });
      });
      void bumpRewardProgress(uid, 'gamesPlayed', 1);
      return txId;
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Insufficient')) throw error;
      if (error instanceof Error && error.message.startsWith('Wallet not')) throw error;
      lastError = error;
      if (!isOptimisticWriteError(error)) {
        handleFirestoreError(error, OperationType.WRITE, `wallets/${uid}`);
      }
    }
    await new Promise((resolve) => setTimeout(resolve, GAME_TX_RETRY_DELAY_MS * attempt));
  }
  handleFirestoreError(lastError, OperationType.WRITE, `wallets/${uid}`);
}

export async function gameCoinCredit(
  uid: string,
  amount: number,
  reason: string,
  idempotencyKey: string
): Promise<string> {
  const txId = gameTxDocId(idempotencyKey);
  const walletRef = doc(db, 'wallets', uid);
  const txRef = doc(db, 'wallets', uid, 'transactions', txId);
  let lastError: unknown;
  for (let attempt = 1; attempt <= GAME_TX_MAX_ATTEMPTS; attempt += 1) {
    try {
      await runTransaction(db, async (tx) => {
        const [walletSnap, existing] = await Promise.all([tx.get(walletRef), tx.get(txRef)]);
        if (existing.exists()) return;
        if (!walletSnap.exists()) throw new Error('Wallet not initialized.');
        const coins = Number(walletSnap.data().coinBalance ?? 0);
        tx.update(walletRef, { coinBalance: coins + amount, updatedAt: serverTimestamp() });
        tx.set(txRef, {
          transactionId: txId,
          uid,
          currency: 'COIN',
          direction: 'CREDIT',
          amount,
          reason: clampStr(reason, 160),
          idempotencyKey,
          createdAt: serverTimestamp(),
        });
      });
      return txId;
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Wallet not')) throw error;
      lastError = error;
      if (!isOptimisticWriteError(error)) {
        handleFirestoreError(error, OperationType.WRITE, `wallets/${uid}`);
      }
    }
    await new Promise((resolve) => setTimeout(resolve, GAME_TX_RETRY_DELAY_MS * attempt));
  }
  handleFirestoreError(lastError, OperationType.WRITE, `wallets/${uid}`);
}

// ---------------------------------------------------------------------------
// Fruit Manor — one shared board for every player.
// The round, phase clock and result live in a single document and a short
// leader lease decides which client advances them. Bets are public documents
// so every player sees the whole pool; each player settles only their own bets.
// ---------------------------------------------------------------------------

export type SharedBoardPhase =
  | 'SCHEDULED'
  | 'OPEN'
  | 'LOCKED'
  | 'DRAWN'
  | 'SETTLING'
  | 'SETTLED'
  | 'VOIDED';

export interface SharedBoard {
  roundId: string;
  seq: number;
  configVersion: string;
  phase: SharedBoardPhase;
  phaseEndsAt: number;
  resultFruitId: string | null;
  recentResults: { roundId: string; seq: number; fruitId: string }[];
  leaderUid: string;
  leaderLeaseUntil: number;
}

export interface SharedBet {
  betId: string;
  roundId: string;
  uid: string;
  username: string;
  fruitId: string;
  stake: number;
  multiplier: number;
  status: 'ACCEPTED' | 'WON' | 'LOST' | 'REFUNDED';
  payout: number;
  debitRef: string;
  creditRef?: string;
  createdAt: number;
}

export interface SharedBoardPatch {
  roundId?: string;
  seq?: number;
  phase?: SharedBoardPhase;
  phaseEndsAt?: number;
  resultFruitId?: string | null;
  recentResults?: { roundId: string; seq: number; fruitId: string }[];
}

const BOARD_PATH = ['fruitManor', 'board'] as const;
export const FRUIT_MANOR_LEADER_LEASE_MS = 12000;

function toMillis(value: unknown): number {
  return value instanceof Timestamp ? value.toMillis() : 0;
}

function mapBoard(d: Record<string, unknown>): SharedBoard {
  return {
    roundId: String(d.roundId ?? ''),
    seq: Number(d.seq ?? 0),
    configVersion: String(d.configVersion ?? ''),
    phase: (String(d.phase ?? 'SCHEDULED') as SharedBoardPhase) ?? 'SCHEDULED',
    phaseEndsAt: toMillis(d.phaseEndsAt),
    resultFruitId: typeof d.resultFruitId === 'string' ? d.resultFruitId : null,
    recentResults: Array.isArray(d.recentResults)
      ? (d.recentResults as { roundId: string; seq: number; fruitId: string }[]).map((r) => ({
          roundId: String(r.roundId),
          seq: Number(r.seq),
          fruitId: String(r.fruitId),
        }))
      : [],
    leaderUid: String(d.leaderUid ?? ''),
    leaderLeaseUntil: toMillis(d.leaderLeaseUntil),
  };
}

export function subscribeFruitManorBoard(
  onBoard: (board: SharedBoard | null) => void,
  onError?: (message: string) => void
): Unsubscribe {
  return listenWithRetry(
    doc(db, BOARD_PATH[0], BOARD_PATH[1]),
    (snap) => onBoard(snap.exists() ? mapBoard(snap.data() as Record<string, unknown>) : null),
    (error) => {
      onError?.(error instanceof Error ? error.message : String(error));
      handleFirestoreError(error, OperationType.GET, 'fruitManor/board');
    }
  );
}

export function subscribeFruitManorBets(
  roundId: string,
  onBets: (bets: SharedBet[]) => void,
  onError?: (message: string) => void
): Unsubscribe {
  return listenWithRetry(
    query(collection(db, 'fruitManorBets'), where('roundId', '==', roundId)),
    (snap) => {
      const list = snap.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          betId: String(d.betId ?? docSnap.id),
          roundId: String(d.roundId ?? ''),
          uid: String(d.uid ?? ''),
          username: String(d.username ?? ''),
          fruitId: String(d.fruitId ?? ''),
          stake: Number(d.stake ?? 0),
          multiplier: Number(d.multiplier ?? 0),
          status: (String(d.status ?? 'ACCEPTED') as SharedBet['status']) ?? 'ACCEPTED',
          payout: Number(d.payout ?? 0),
          debitRef: String(d.debitRef ?? ''),
          creditRef: d.creditRef ? String(d.creditRef) : undefined,
          createdAt: toMillis(d.createdAt),
        };
      });
      list.sort((a, b) => a.createdAt - b.createdAt);
      onBets(list);
    },
    (error) => {
      onError?.(error instanceof Error ? error.message : String(error));
      handleFirestoreError(error, OperationType.LIST, 'fruitManorBets');
    }
  );
}

/**
 * Become the round leader when the current lease is free or expired.
 * Also seeds the very first board document, so whoever opens the game first
 * starts the shared clock for everybody else.
 */
export async function claimFruitManorLeadership(
  uid: string,
  initial: { roundId: string; seq: number; configVersion: string; phaseEndsAtMs: number }
): Promise<boolean> {
  const boardRef = doc(db, BOARD_PATH[0], BOARD_PATH[1]);
  try {
    return await runTransaction(db, async (tx) => {
      const snap = await tx.get(boardRef);
      const now = Date.now();
      if (!snap.exists()) {
        tx.set(boardRef, {
          roundId: initial.roundId,
          seq: initial.seq,
          configVersion: initial.configVersion,
          phase: 'SCHEDULED',
          phaseEndsAt: Timestamp.fromMillis(initial.phaseEndsAtMs),
          resultFruitId: null,
          recentResults: [],
          leaderUid: uid,
          leaderLeaseUntil: Timestamp.fromMillis(now + FRUIT_MANOR_LEADER_LEASE_MS),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        return true;
      }
      const d = snap.data();
      const leaseUntil = toMillis(d.leaderLeaseUntil);
      if (String(d.leaderUid) !== uid && leaseUntil > now) return false;
      tx.update(boardRef, {
        leaderUid: uid,
        leaderLeaseUntil: Timestamp.fromMillis(now + FRUIT_MANOR_LEADER_LEASE_MS),
        updatedAt: serverTimestamp(),
      });
      return true;
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'fruitManor/board');
  }
}

export async function advanceFruitManorBoard(
  uid: string,
  expectedRoundId: string,
  expectedPhase: SharedBoardPhase,
  patch: SharedBoardPatch
): Promise<boolean> {
  const boardRef = doc(db, BOARD_PATH[0], BOARD_PATH[1]);
  try {
    return await runTransaction(db, async (tx) => {
      const snap = await tx.get(boardRef);
      if (!snap.exists()) return false;
      const d = snap.data();
      if (String(d.leaderUid) !== uid) return false;
      if (String(d.roundId) !== expectedRoundId) return false;
      if (String(d.phase) !== expectedPhase) return false;
      const next: Record<string, unknown> = { updatedAt: serverTimestamp() };
      if (patch.roundId !== undefined) next.roundId = patch.roundId;
      if (patch.seq !== undefined) next.seq = patch.seq;
      if (patch.phase !== undefined) next.phase = patch.phase;
      if (patch.phaseEndsAt !== undefined) next.phaseEndsAt = Timestamp.fromMillis(patch.phaseEndsAt);
      if (patch.resultFruitId !== undefined) next.resultFruitId = patch.resultFruitId;
      if (patch.recentResults !== undefined) next.recentResults = patch.recentResults;
      tx.update(boardRef, next);
      return true;
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'fruitManor/board');
  }
}

export async function createFruitManorBet(bet: {
  betId: string;
  roundId: string;
  uid: string;
  username: string;
  fruitId: string;
  stake: number;
  multiplier: number;
  debitRef: string;
}): Promise<void> {
  try {
    await setDoc(doc(db, 'fruitManorBets', bet.betId), {
      ...bet,
      status: 'ACCEPTED',
      payout: 0,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `fruitManorBets/${bet.betId}`);
  }
}

export async function resolveFruitManorBet(
  betId: string,
  status: 'WON' | 'LOST' | 'REFUNDED',
  payout: number,
  creditRef?: string
): Promise<void> {
  try {
    await updateDoc(doc(db, 'fruitManorBets', betId), {
      status,
      payout,
      ...(creditRef ? { creditRef } : {}),
      settledAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `fruitManorBets/${betId}`);
  }
}

// ---------------------------------------------------------------------------
// Golden Flower — Poppo-style shared seat-betting board. One round document,
// a leader lease advances the phase clock, bets are public seat slips and each
// player settles only their own bets (same trust model as Fruit Manor).
// ---------------------------------------------------------------------------

export type GfBoardPhase = 'OPEN' | 'LOCKED' | 'DRAWN' | 'SETTLED' | 'VOIDED';

export interface GfBoardCard {
  id: string;
  suit: string;
  rank: number;
}

export interface GfBoard {
  roundId: string;
  seq: number;
  configVersion: string;
  phase: GfBoardPhase;
  phaseEndsAt: number;
  seatCards: Record<string, GfBoardCard[]> | null;
  seatCats: Record<string, string> | null;
  winnerSeat: number | null;
  recentResults: { roundId: string; seq: number; seat: number }[];
  leaderUid: string;
  leaderLeaseUntil: number;
}

export interface GfBet {
  betId: string;
  roundId: string;
  uid: string;
  username: string;
  seat: number;
  stake: number;
  status: 'ACCEPTED' | 'WON' | 'LOST' | 'REFUNDED';
  payout: number;
  debitRef: string;
  creditRef?: string;
  createdAt: number;
}

export interface GfBoardPatch {
  roundId?: string;
  seq?: number;
  phase?: GfBoardPhase;
  phaseEndsAt?: number;
  seatCards?: Record<string, GfBoardCard[]> | null;
  seatCats?: Record<string, string> | null;
  winnerSeat?: number | null;
  recentResults?: { roundId: string; seq: number; seat: number }[];
}

export interface GfRemoteConfig {
  enabled: boolean;
  openMs: number;
}

export const GF_DEFAULT_CONFIG: GfRemoteConfig = { enabled: true, openMs: 20000 };

const GF_BOARD_PATH = ['gf_board', 'board'] as const;
export const GF_LEADER_LEASE_MS = 12000;

function mapGfBoard(d: Record<string, unknown>): GfBoard {
  const cards = d.seatCards;
  const cats = d.seatCats;
  return {
    roundId: String(d.roundId ?? ''),
    seq: Number(d.seq ?? 0),
    configVersion: String(d.configVersion ?? ''),
    phase: String(d.phase ?? 'OPEN') as GfBoardPhase,
    phaseEndsAt: toMillis(d.phaseEndsAt),
    seatCards:
      cards && typeof cards === 'object'
        ? (cards as Record<string, GfBoardCard[]>)
        : null,
    seatCats: cats && typeof cats === 'object' ? (cats as Record<string, string>) : null,
    winnerSeat: typeof d.winnerSeat === 'number' ? d.winnerSeat : null,
    recentResults: Array.isArray(d.recentResults)
      ? (d.recentResults as { roundId: string; seq: number; seat: number }[]).map((r) => ({
          roundId: String(r.roundId),
          seq: Number(r.seq),
          seat: Number(r.seat),
        }))
      : [],
    leaderUid: String(d.leaderUid ?? ''),
    leaderLeaseUntil: toMillis(d.leaderLeaseUntil),
  };
}

export function subscribeGfBoard(
  onBoard: (board: GfBoard | null) => void,
  onError?: (message: string) => void
): Unsubscribe {
  return listenWithRetry(
    doc(db, GF_BOARD_PATH[0], GF_BOARD_PATH[1]),
    (snap) => onBoard(snap.exists() ? mapGfBoard(snap.data() as Record<string, unknown>) : null),
    (error) => {
      onError?.(error instanceof Error ? error.message : String(error));
      handleFirestoreError(error, OperationType.GET, 'gf_board/board');
    }
  );
}

export function subscribeGfBets(
  roundId: string,
  onBets: (bets: GfBet[]) => void,
  onError?: (message: string) => void
): Unsubscribe {
  return listenWithRetry(
    query(collection(db, 'gf_bets'), where('roundId', '==', roundId)),
    (snap) => {
      const list = snap.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          betId: String(d.betId ?? docSnap.id),
          roundId: String(d.roundId ?? ''),
          uid: String(d.uid ?? ''),
          username: String(d.username ?? ''),
          seat: Number(d.seat ?? 0),
          stake: Number(d.stake ?? 0),
          status: String(d.status ?? 'ACCEPTED') as GfBet['status'],
          payout: Number(d.payout ?? 0),
          debitRef: String(d.debitRef ?? ''),
          creditRef: d.creditRef ? String(d.creditRef) : undefined,
          createdAt: toMillis(d.createdAt),
        };
      });
      list.sort((a, b) => a.createdAt - b.createdAt);
      onBets(list);
    },
    (error) => {
      onError?.(error instanceof Error ? error.message : String(error));
      handleFirestoreError(error, OperationType.LIST, 'gf_bets');
    }
  );
}

export function subscribeGfConfig(
  onConfig: (config: GfRemoteConfig) => void,
  onError?: (message: string) => void
): Unsubscribe {
  return listenWithRetry(
    doc(db, 'gf_config', 'config'),
    (snap) => {
      if (!snap.exists()) {
        onConfig(GF_DEFAULT_CONFIG);
        return;
      }
      const d = snap.data();
      onConfig({
        enabled: d.enabled !== false,
        openMs: Number(d.openMs ?? GF_DEFAULT_CONFIG.openMs),
      });
    },
    (error) => {
      onError?.(error instanceof Error ? error.message : String(error));
    }
  );
}

export async function claimGfLeadership(
  uid: string,
  initial: { roundId: string; seq: number; configVersion: string; phaseEndsAtMs: number }
): Promise<boolean> {
  const boardRef = doc(db, GF_BOARD_PATH[0], GF_BOARD_PATH[1]);
  try {
    return await runTransaction(db, async (tx) => {
      const snap = await tx.get(boardRef);
      const now = Date.now();
      if (!snap.exists()) {
        tx.set(boardRef, {
          roundId: initial.roundId,
          seq: initial.seq,
          configVersion: initial.configVersion,
          phase: 'OPEN',
          phaseEndsAt: Timestamp.fromMillis(initial.phaseEndsAtMs),
          seatCards: null,
          seatCats: null,
          winnerSeat: null,
          recentResults: [],
          leaderUid: uid,
          leaderLeaseUntil: Timestamp.fromMillis(now + GF_LEADER_LEASE_MS),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        return true;
      }
      const d = snap.data();
      const leaseUntil = toMillis(d.leaderLeaseUntil);
      if (String(d.leaderUid) !== uid && leaseUntil > now) return false;
      tx.update(boardRef, {
        leaderUid: uid,
        leaderLeaseUntil: Timestamp.fromMillis(now + GF_LEADER_LEASE_MS),
        updatedAt: serverTimestamp(),
      });
      return true;
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'gf_board/board');
  }
}

export async function advanceGfBoard(
  uid: string,
  expectedRoundId: string,
  expectedPhase: GfBoardPhase,
  patch: GfBoardPatch
): Promise<boolean> {
  const boardRef = doc(db, GF_BOARD_PATH[0], GF_BOARD_PATH[1]);
  try {
    return await runTransaction(db, async (tx) => {
      const snap = await tx.get(boardRef);
      if (!snap.exists()) return false;
      const d = snap.data();
      if (String(d.leaderUid) !== uid) return false;
      if (String(d.roundId) !== expectedRoundId) return false;
      if (String(d.phase) !== expectedPhase) return false;
      const next: Record<string, unknown> = { updatedAt: serverTimestamp() };
      if (patch.roundId !== undefined) next.roundId = patch.roundId;
      if (patch.seq !== undefined) next.seq = patch.seq;
      if (patch.phase !== undefined) next.phase = patch.phase;
      if (patch.phaseEndsAt !== undefined) next.phaseEndsAt = Timestamp.fromMillis(patch.phaseEndsAt);
      if (patch.seatCards !== undefined) next.seatCards = patch.seatCards;
      if (patch.seatCats !== undefined) next.seatCats = patch.seatCats;
      if (patch.winnerSeat !== undefined) next.winnerSeat = patch.winnerSeat;
      if (patch.recentResults !== undefined) next.recentResults = patch.recentResults;
      tx.update(boardRef, next);
      return true;
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'gf_board/board');
  }
}

export async function createGfBet(bet: {
  betId: string;
  roundId: string;
  uid: string;
  username: string;
  seat: number;
  stake: number;
  debitRef: string;
}): Promise<void> {
  try {
    await setDoc(doc(db, 'gf_bets', bet.betId), {
      ...bet,
      status: 'ACCEPTED',
      payout: 0,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `gf_bets/${bet.betId}`);
  }
}

export async function resolveGfBet(
  betId: string,
  status: 'WON' | 'LOST' | 'REFUNDED',
  payout: number,
  creditRef?: string
): Promise<void> {
  try {
    await updateDoc(doc(db, 'gf_bets', betId), {
      status,
      payout,
      ...(creditRef ? { creditRef } : {}),
      settledAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `gf_bets/${betId}`);
  }
}

export async function saveGfConfig(
  uid: string,
  config: GfRemoteConfig,
  summary: string
): Promise<void> {
  try {
    await setDoc(doc(db, 'gf_config', 'config'), {
      enabled: config.enabled,
      openMs: config.openMs,
      updatedBy: uid,
      updatedAt: serverTimestamp(),
    });
    await setDoc(doc(collection(db, 'gf_admin_audit')), {
      uid,
      summary: clampStr(summary, 240),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'gf_config/config');
  }
}

export async function transferCoins(
  sender: UserProfile,
  recipient: UserProfile,
  amount: number,
  options?: { isAdmin?: boolean }
): Promise<void> {
  const value = Math.floor(amount);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error('Enter a valid coin amount.');
  }
  if (sender.uid === recipient.uid) {
    throw new Error('Cannot transfer to yourself.');
  }

  const senderRole = resolveCoinTransferRole(sender, options?.isAdmin);
  if (senderRole === 'USER') {
    throw new Error('Only Admin, BD Agent or Agent can transfer coins.');
  }
  if (!canTransferCoinsTo(senderRole, recipient)) {
    throw new Error(
      senderRole === 'AGENT'
        ? 'Agents can only transfer coins to Users.'
        : senderRole === 'SUPER_AGENT'
        ? 'Super Agents can only transfer coins to Agents or Users.'
        : senderRole === 'BD_AGENT'
        ? 'The main BD Agent can only transfer coins to Super Agents or Agents.'
        : 'This recipient is not allowed for your role.'
    );
  }

  // Agency roles spend from their Coins Trading Balance; Admin spends from Main Balance.
  const debitFromMain = senderRole === 'ADMIN';
  // Agency recipients always receive into Trading Balance; Users receive into Main Balance.
  const recipientGetsTrading = recipient.accountType !== 'USER';

  const senderRef = doc(db, 'wallets', sender.uid);
  const recipientRef = doc(db, 'wallets', recipient.uid);
  const stamp = Date.now();
  const rand = Math.random().toString(36).slice(2, 6);
  const debitId = `tx_${stamp}_${rand}`;
  const creditId = `tx_${stamp}_${rand}c`;
  const idempotencyKey = `transfer_${sender.uid}_${recipient.uid}_${stamp.toString(36)}`;
  const debitField = debitFromMain ? 'coinBalance' : 'tradingCoinBalance';
  const creditField = recipientGetsTrading ? 'tradingCoinBalance' : 'coinBalance';
  const destination = recipientGetsTrading ? 'Coins Trading Balance' : 'Main Balance';
  const source = debitFromMain ? 'Main Balance' : 'Coins Trading Balance';
  const debitLedger = {
    transactionId: debitId,
    uid: sender.uid,
    currency: 'COIN',
    direction: 'DEBIT',
    amount: value,
    reason: clampStr(`Transfer to @${recipient.username} (${source})`, 160),
    counterparty: clampStr(`@${recipient.username}`, 64),
    idempotencyKey,
    createdAt: serverTimestamp(),
  };
  const creditLedger = {
    transactionId: creditId,
    uid: recipient.uid,
    currency: 'COIN',
    direction: 'CREDIT',
    amount: value,
    reason: clampStr(`Transfer from @${sender.username} (${destination})`, 160),
    counterparty: clampStr(`@${sender.username}`, 64),
    idempotencyKey,
    createdAt: serverTimestamp(),
  };

  // Quota pauses block runTransaction but plain writes still commit. Admin-only
  // fallback: sequential debit -> credit -> ledgers (rules reject a debit that
  // would go negative). Not atomic; a mid-sequence failure names the failed step.
  const adminDirectTransfer = async () => {
    const step = async (label: string, fn: () => Promise<void>) => {
      try {
        await fn();
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        throw new Error(`Transfer failed at ${label}: ${msg}`);
      }
    };
    await step('sender debit', () =>
      updateDoc(senderRef, {
        [debitField]: increment(-value),
        updatedAt: serverTimestamp(),
      })
    );
    await step('recipient credit', () =>
      updateDoc(recipientRef, {
        [creditField]: increment(value),
        updatedAt: serverTimestamp(),
      })
    );
    await step('sender ledger', () =>
      setDoc(doc(db, 'wallets', sender.uid, 'transactions', debitId), debitLedger)
    );
    await step('recipient ledger', () =>
      setDoc(doc(db, 'wallets', recipient.uid, 'transactions', creditId), creditLedger)
    );
  };

  try {
    await runTransaction(db, async (tx) => {
      const [senderSnap, recipientSnap] = await Promise.all([
        tx.get(senderRef),
        tx.get(recipientRef),
      ]);
      if (!senderSnap.exists() || !recipientSnap.exists()) {
        throw new Error('Wallet not initialized.');
      }

      const senderMainCoins = Number(senderSnap.data().coinBalance ?? 0);
      const senderTradingCoins = Number(senderSnap.data().tradingCoinBalance ?? 0);
      const recipientMainCoins = Number(recipientSnap.data().coinBalance ?? 0);
      const recipientTradingCoins = Number(recipientSnap.data().tradingCoinBalance ?? 0);

      if (debitFromMain) {
        if (senderMainCoins < value) {
          throw new Error(`Insufficient Main Balance (need ${value.toLocaleString()}).`);
        }
        tx.update(senderRef, {
          coinBalance: senderMainCoins - value,
          updatedAt: serverTimestamp(),
        });
      } else {
        if (senderTradingCoins < value) {
          throw new Error(
            `Insufficient Coins Trading Balance (need ${value.toLocaleString()}).`
          );
        }
        tx.update(senderRef, {
          tradingCoinBalance: senderTradingCoins - value,
          updatedAt: serverTimestamp(),
        });
      }

      if (recipientGetsTrading) {
        tx.update(recipientRef, {
          tradingCoinBalance: recipientTradingCoins + value,
          updatedAt: serverTimestamp(),
        });
      } else {
        tx.update(recipientRef, {
          coinBalance: recipientMainCoins + value,
          updatedAt: serverTimestamp(),
        });
      }

      tx.set(doc(db, 'wallets', sender.uid, 'transactions', debitId), debitLedger);
      tx.set(doc(db, 'wallets', recipient.uid, 'transactions', creditId), creditLedger);
    });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Insufficient')) {
      throw error;
    }
    if (error instanceof Error && error.message.startsWith('Cannot transfer')) {
      throw error;
    }
    if (error instanceof Error && error.message.startsWith('Enter a valid')) {
      throw error;
    }
    if (error instanceof Error && error.message.startsWith('Wallet not')) {
      throw error;
    }
    if (senderRole === 'ADMIN' && classifySyncError(error) !== 'fatal') {
      await adminDirectTransfer();
      return;
    }
    handleFirestoreError(error, OperationType.WRITE, `wallets/${sender.uid}`);
  }
}

/**
 * Convert Main Coins to Diamonds
 * (30% less silently applied under the hood)
 */
export async function convertCoinsToDiamonds(
  uid: string,
  coinAmount: number
): Promise<{ convertedCoins: number; diamondsReceived: number }> {
  const coins = Math.floor(coinAmount);
  if (coins <= 0) throw new Error('Enter a valid coin amount.');

  // 30% reduction applied silently
  const diamondsReceived = Math.floor(coins * 0.70);
  if (diamondsReceived <= 0) throw new Error('Amount too small to convert.');

  const walletRef = doc(db, 'wallets', uid);
  const stamp = Date.now();
  const rand = Math.random().toString(36).slice(2, 6);
  const txDebitId = `tx_conv_d_${stamp}_${rand}`;
  const txCreditId = `tx_conv_c_${stamp}_${rand}`;

  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(walletRef);
      if (!snap.exists()) throw new Error('Wallet not initialized.');

      const curCoins = Number(snap.data().coinBalance ?? 0);
      const curDiamonds = Number(snap.data().diamondBalance ?? 0);
      if (curCoins < coins) throw new Error(`Insufficient coins (need ${coins.toLocaleString()}).`);

      tx.update(walletRef, {
        coinBalance: curCoins - coins,
        diamondBalance: curDiamonds + diamondsReceived,
        updatedAt: serverTimestamp(),
      });

      tx.set(doc(db, 'wallets', uid, 'transactions', txDebitId), {
        transactionId: txDebitId,
        uid,
        currency: 'COIN',
        direction: 'DEBIT',
        amount: coins,
        reason: 'Converted to Diamonds',
        idempotencyKey: txDebitId,
        createdAt: serverTimestamp(),
      });

      tx.set(doc(db, 'wallets', uid, 'transactions', txCreditId), {
        transactionId: txCreditId,
        uid,
        currency: 'DIAMOND',
        direction: 'CREDIT',
        amount: diamondsReceived,
        reason: 'Converted from Coins',
        idempotencyKey: txCreditId,
        createdAt: serverTimestamp(),
      });
    });

    return { convertedCoins: coins, diamondsReceived };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Insufficient')) throw error;
    if (error instanceof Error && error.message.startsWith('Amount too small')) throw error;
    handleFirestoreError(error, OperationType.WRITE, `wallets/${uid}`);
  }
}

/**
 * Withdraw Diamonds to Agent or Super Agent
 * Target agent receives coins in their Coins Trading Balance
 * (3% less silently applied under the hood)
 */
export async function withdrawDiamondsToAgent(
  sender: UserProfile,
  targetAgent: UserProfile,
  diamondAmount: number
): Promise<{ diamondsDebited: number; recipientTradingCoins: number }> {
  const diamonds = Math.floor(diamondAmount);
  if (diamonds <= 0) throw new Error('Enter a valid diamonds amount.');
  if (diamonds < 100000) throw new Error('Minimum withdrawal is 100,000 Diamonds.');
  if (sender.uid === targetAgent.uid) throw new Error('Cannot withdraw diamonds to yourself.');

  const isAgentOrSuper =
    targetAgent.accountType === 'AGENT' ||
    targetAgent.accountType === 'SUPER_AGENT' ||
    isBdAgentProfile(targetAgent);

  if (!isAgentOrSuper) {
    throw new Error('Diamonds can only be withdrawn to an official Agent or BD Agent.');
  }

  // 3% reduction applied silently to recipient's trading coins
  const recipientTradingCoins = Math.floor(diamonds * 0.97);
  if (recipientTradingCoins <= 0) throw new Error('Amount too small to withdraw.');

  const senderRef = doc(db, 'wallets', sender.uid);
  const agentRef = doc(db, 'wallets', targetAgent.uid);
  const stamp = Date.now();
  const rand = Math.random().toString(36).slice(2, 6);
  const txDebitId = `tx_w_d_${stamp}_${rand}`;
  const txCreditId = `tx_w_c_${stamp}_${rand}`;

  try {
    await runTransaction(db, async (tx) => {
      const [senderSnap, agentSnap] = await Promise.all([
        tx.get(senderRef),
        tx.get(agentRef),
      ]);
      if (!senderSnap.exists() || !agentSnap.exists()) throw new Error('Wallet not initialized.');

      const curDiamonds = Number(senderSnap.data().diamondBalance ?? 0);
      if (curDiamonds < diamonds) {
        throw new Error(`Insufficient diamonds (need ${diamonds.toLocaleString()}).`);
      }

      const agentTradingCoins = Number(agentSnap.data().tradingCoinBalance ?? 0);

      tx.update(senderRef, {
        diamondBalance: curDiamonds - diamonds,
        updatedAt: serverTimestamp(),
      });

      tx.update(agentRef, {
        tradingCoinBalance: agentTradingCoins + recipientTradingCoins,
        updatedAt: serverTimestamp(),
      });

      tx.set(doc(db, 'wallets', sender.uid, 'transactions', txDebitId), {
        transactionId: txDebitId,
        uid: sender.uid,
        currency: 'DIAMOND',
        direction: 'DEBIT',
        amount: diamonds,
        reason: clampStr(`Diamonds Withdraw to @${targetAgent.username}`, 160),
        counterparty: clampStr(`@${targetAgent.username}`, 64),
        idempotencyKey: txDebitId,
        createdAt: serverTimestamp(),
      });

      tx.set(doc(db, 'wallets', targetAgent.uid, 'transactions', txCreditId), {
        transactionId: txCreditId,
        uid: targetAgent.uid,
        currency: 'COIN',
        direction: 'CREDIT',
        amount: recipientTradingCoins,
        reason: clampStr(`Diamonds Withdraw from @${sender.username} (Trading Balance)`, 160),
        counterparty: clampStr(`@${sender.username}`, 64),
        idempotencyKey: txCreditId,
        createdAt: serverTimestamp(),
      });
    });

    return { diamondsDebited: diamonds, recipientTradingCoins };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Insufficient')) throw error;
    if (error instanceof Error && error.message.startsWith('Diamonds can only')) throw error;
    if (error instanceof Error && error.message.startsWith('Minimum withdrawal')) throw error;
    handleFirestoreError(error, OperationType.WRITE, `wallets/${sender.uid}`);
  }
}

/**
 * Self Diamonds Withdraw for Super Agents / Agents:
 * own Diamonds -> own Coins Trading Balance (10% fee).
 */
export async function withdrawDiamondsToSelf(
  sender: UserProfile,
  diamondAmount: number
): Promise<{ diamondsDebited: number; tradingCoinsCredited: number }> {
  const diamonds = Math.floor(diamondAmount);
  if (diamonds <= 0) throw new Error('Enter a valid diamonds amount.');
  if (diamonds < 100000) throw new Error('Minimum withdrawal is 100,000 Diamonds.');

  const isAgency =
    sender.accountType === 'AGENT' ||
    sender.accountType === 'SUPER_AGENT' ||
    isBdAgentProfile(sender);
  if (!isAgency) {
    throw new Error('Only the BD Agent, Super Agents and Agents can withdraw diamonds to their own ID.');
  }

  const tradingCoinsCredited = Math.floor(diamonds * 0.9);
  if (tradingCoinsCredited <= 0) throw new Error('Amount too small to withdraw.');

  const walletRef = doc(db, 'wallets', sender.uid);
  const stamp = Date.now();
  const rand = Math.random().toString(36).slice(2, 6);
  const txDebitId = `tx_wself_d_${stamp}_${rand}`;
  const txCreditId = `tx_wself_c_${stamp}_${rand}`;

  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(walletRef);
      if (!snap.exists()) throw new Error('Wallet not initialized.');

      const curDiamonds = Number(snap.data().diamondBalance ?? 0);
      if (curDiamonds < diamonds) {
        throw new Error(`Insufficient diamonds (need ${diamonds.toLocaleString()}).`);
      }
      const curTrading = Number(snap.data().tradingCoinBalance ?? 0);

      tx.update(walletRef, {
        diamondBalance: curDiamonds - diamonds,
        tradingCoinBalance: curTrading + tradingCoinsCredited,
        updatedAt: serverTimestamp(),
      });

      tx.set(doc(db, 'wallets', sender.uid, 'transactions', txDebitId), {
        transactionId: txDebitId,
        uid: sender.uid,
        currency: 'DIAMOND',
        direction: 'DEBIT',
        amount: diamonds,
        reason: 'Diamonds Withdraw to own Trading Balance',
        idempotencyKey: txDebitId,
        createdAt: serverTimestamp(),
      });

      tx.set(doc(db, 'wallets', sender.uid, 'transactions', txCreditId), {
        transactionId: txCreditId,
        uid: sender.uid,
        currency: 'COIN',
        direction: 'CREDIT',
        amount: tradingCoinsCredited,
        reason: 'Diamonds Withdraw: Trading Balance credit (10% fee)',
        idempotencyKey: txCreditId,
        createdAt: serverTimestamp(),
      });
    });

    return { diamondsDebited: diamonds, tradingCoinsCredited };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Insufficient')) throw error;
    if (error instanceof Error && error.message.startsWith('Only the BD Agent')) throw error;
    if (error instanceof Error && error.message.startsWith('Amount too small')) throw error;
    if (error instanceof Error && error.message.startsWith('Minimum withdrawal')) throw error;
    handleFirestoreError(error, OperationType.WRITE, `wallets/${sender.uid}`);
  }
}

/**
 * Coins Exchange: Convert Coins Trading Balance into Main Balance
 * (1:1 exchange, no fee)
 */
export async function exchangeTradingCoinsToMainBalance(
  uid: string,
  tradingAmount: number
): Promise<{ debitedTrading: number; creditedMain: number }> {
  const value = Math.floor(tradingAmount);
  if (value <= 0) throw new Error('Enter a valid coin amount.');

  const creditedMain = value;
  if (creditedMain <= 0) throw new Error('Amount too small to exchange.');

  const walletRef = doc(db, 'wallets', uid);
  const stamp = Date.now();
  const rand = Math.random().toString(36).slice(2, 6);
  const txDebitId = `tx_ex_d_${stamp}_${rand}`;
  const txCreditId = `tx_ex_c_${stamp}_${rand}`;

  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(walletRef);
      if (!snap.exists()) throw new Error('Wallet not initialized.');

      const curTrading = Number(snap.data().tradingCoinBalance ?? 0);
      const curMain = Number(snap.data().coinBalance ?? 0);

      if (curTrading < value) {
        throw new Error(`Insufficient trading balance (need ${value.toLocaleString()}).`);
      }

      tx.update(walletRef, {
        tradingCoinBalance: curTrading - value,
        coinBalance: curMain + creditedMain,
        updatedAt: serverTimestamp(),
      });

      tx.set(doc(db, 'wallets', uid, 'transactions', txDebitId), {
        transactionId: txDebitId,
        uid,
        currency: 'COIN',
        direction: 'DEBIT',
        amount: value,
        reason: 'Coins Exchange: Debited Trading Balance',
        idempotencyKey: txDebitId,
        createdAt: serverTimestamp(),
      });

      tx.set(doc(db, 'wallets', uid, 'transactions', txCreditId), {
        transactionId: txCreditId,
        uid,
        currency: 'COIN',
        direction: 'CREDIT',
        amount: creditedMain,
        reason: 'Coins Exchange: Credited to Main Balance',
        idempotencyKey: txCreditId,
        createdAt: serverTimestamp(),
      });
    });

    return { debitedTrading: value, creditedMain };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Insufficient')) throw error;
    handleFirestoreError(error, OperationType.WRITE, `wallets/${uid}`);
  }
}

/**
 * Move All Main Coins to Trading Coins Balance for BD Agent
 */
export async function moveMainCoinsToTradingBalance(
  uid: string
): Promise<{ movedAmount: number }> {
  const walletRef = doc(db, 'wallets', uid);
  const stamp = Date.now();
  const rand = Math.random().toString(36).slice(2, 6);
  const txDebitId = `tx_m2t_d_${stamp}_${rand}`;
  const txCreditId = `tx_m2t_c_${stamp}_${rand}`;

  try {
    let movedAmount = 0;
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(walletRef);
      if (!snap.exists()) throw new Error('Wallet not initialized.');

      const curMain = Number(snap.data().coinBalance ?? 0);
      const curTrading = Number(snap.data().tradingCoinBalance ?? 0);

      if (curMain <= 0) {
        throw new Error('No coins in Main Balance to move.');
      }
      movedAmount = curMain;

      tx.update(walletRef, {
        coinBalance: 0,
        tradingCoinBalance: curTrading + curMain,
        updatedAt: serverTimestamp(),
      });

      tx.set(doc(db, 'wallets', uid, 'transactions', txDebitId), {
        transactionId: txDebitId,
        uid,
        currency: 'COIN',
        direction: 'DEBIT',
        amount: curMain,
        reason: 'Transferred all Main Coins to Trading Balance',
        idempotencyKey: txDebitId,
        createdAt: serverTimestamp(),
      });

      tx.set(doc(db, 'wallets', uid, 'transactions', txCreditId), {
        transactionId: txCreditId,
        uid,
        currency: 'COIN',
        direction: 'CREDIT',
        amount: curMain,
        reason: 'Received from Main Balance to Trading Balance',
        idempotencyKey: txCreditId,
        createdAt: serverTimestamp(),
      });
    });

    return { movedAmount };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('No coins')) throw error;
    handleFirestoreError(error, OperationType.WRITE, `wallets/${uid}`);
    return { movedAmount: 0 };
  }
}

/**
 * Ensure BD Agent has specified coins trading balance (e.g. 44,200,400)
 */
export async function setBdAgentTradingBalance(
  uid: string,
  targetBalance: number = 44200400
): Promise<void> {
  const walletRef = doc(db, 'wallets', uid);
  const stamp = Date.now();
  const txId = `tx_bda_${stamp}`;
  try {
    const snap = await getDoc(walletRef);
    if (!snap.exists()) {
      await setDoc(walletRef, {
        uid,
        coinBalance: 0,
        diamondBalance: 0,
        tradingCoinBalance: targetBalance,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return;
    }
    const curTrading = Number(snap.data()?.tradingCoinBalance ?? 0);
    if (curTrading < targetBalance) {
      await updateDoc(walletRef, {
        tradingCoinBalance: targetBalance,
        updatedAt: serverTimestamp(),
      });
      await setDoc(doc(db, 'wallets', uid, 'transactions', txId), {
        transactionId: txId,
        uid,
        currency: 'COIN',
        direction: 'CREDIT',
        amount: targetBalance - curTrading,
        reason: 'BD Agent Coins Trading Balance Allocation',
        idempotencyKey: txId,
        createdAt: serverTimestamp(),
      });
    }
  } catch (err) {
    console.error('Error setting BD Agent trading balance:', err);
  }
}

export function subscribeFollowsAndBlocks(
  uid: string,
  onFollows: (uids: string[]) => void,
  onBlocks: (uids: string[]) => void
): () => void {
  const unsubFollows = listenWithRetry(
    query(collection(db, 'follows'), where('followerUid', '==', uid), limit(100)),
    (snap) => {
      onFollows(snap.docs.map((d) => String(d.data().targetUid)));
    },
    (error) => handleFirestoreError(error, OperationType.LIST, 'follows')
  );

  const unsubBlocks = listenWithRetry(
    query(collection(db, 'blocks'), where('blockerUid', '==', uid), limit(100)),
    (snap) => {
      onBlocks(snap.docs.map((d) => String(d.data().blockedUid)));
    },
    (error) => handleFirestoreError(error, OperationType.LIST, 'blocks')
  );

  return () => {
    unsubFollows();
    unsubBlocks();
  };
}

export async function toggleFollowDoc(
  followerUid: string,
  targetUid: string,
  currentlyFollowing: boolean
): Promise<void> {
  const followId = `${followerUid}_${targetUid}`;
  const followRef = doc(db, 'follows', followId);
  const targetUserRef = doc(db, 'users', targetUid);

  const batch = writeBatch(db);
  if (currentlyFollowing) {
    batch.delete(followRef);
    batch.update(targetUserRef, {
      followersCount: increment(-1),
      updatedAt: serverTimestamp(),
    });
  } else {
    batch.set(followRef, {
      followerUid,
      targetUid,
      createdAt: serverTimestamp(),
    });
    batch.update(targetUserRef, {
      followersCount: increment(1),
      updatedAt: serverTimestamp(),
    });
  }

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `follows/${followId}`);
  }

  if (!currentlyFollowing) {
    // Best-effort follower notification; a missing notification collection
    // must never make the follow itself fail.
    void getDoc(doc(db, 'users', followerUid))
      .then((snapshot) => {
        if (!snapshot.exists()) return;
        const d = snapshot.data();
        return sendNotificationDoc({
          toUid: targetUid,
          actor: {
            uid: followerUid,
            username: String(d.username ?? ''),
            displayName: String(d.displayName ?? 'Creator'),
          },
          type: 'NEW_FOLLOWER',
          title: 'New follower',
          body: `${String(d.displayName ?? 'Someone')} started following you.`,
          notificationId: `follow_${followerUid}_${targetUid}`,
        });
      })
      .catch(() => undefined);
  }
}

export async function toggleBlockDoc(
  blockerUid: string,
  blockedUid: string,
  currentlyBlocked: boolean
): Promise<void> {
  const blockId = `${blockerUid}_${blockedUid}`;
  const blockRef = doc(db, 'blocks', blockId);
  try {
    if (currentlyBlocked) {
      await deleteDoc(blockRef);
    } else {
      await setDoc(blockRef, {
        blockerUid,
        blockedUid,
        createdAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `blocks/${blockId}`);
  }
}

export function subscribeConversationsList(
  uid: string,
  onData: (convs: Conversation[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'conversations'),
    where('memberUids', 'array-contains', uid),
    limit(40)
  );
  return listenWithRetry(
    q,
    (snap) => {
      const list: Conversation[] = snap.docs.map((docSnap) => {
        const d = docSnap.data();
        const members = Array.isArray(d.memberUids)
          ? (d.memberUids as string[])
          : [];
        const partner = members.find((m) => m !== uid) ?? uid;
        const lastSenderUid = d.lastSenderUid ? String(d.lastSenderUid) : partner;
        const unreadCounts =
          d.unreadCounts && typeof d.unreadCounts === 'object'
            ? (d.unreadCounts as Record<string, unknown>)
            : {};
        const readAt =
          d.readAt && typeof d.readAt === 'object'
            ? (d.readAt as Record<string, unknown>)
            : {};
        return {
          conversationId: String(d.conversationId),
          participantUid: partner,
          unreadCount: Math.max(0, Number(unreadCounts[uid] ?? 0)),
          lastSenderUid,
          lastMessageAtMs: d.lastMessageAtMs
            ? Number(d.lastMessageAtMs)
            : d.updatedAt instanceof Timestamp
              ? d.updatedAt.toMillis()
              : undefined,
          readAt: Object.fromEntries(
            Object.entries(readAt).map(([k, v]) => [k, Number(v ?? 0)])
          ),
          messages: d.lastMessageText
            ? [
                {
                  id: 'preview',
                  senderUid: lastSenderUid,
                  text: String(d.lastMessageText),
                  timestampLabel: formatTimestamp(d.updatedAt),
                },
              ]
            : [],
        };
      });
      onData(list);
    },
    (error) => handleFirestoreError(error, OperationType.LIST, 'conversations')
  );
}

export function subscribeConversationMessages(
  conversationId: string,
  uid: string,
  onData: (messages: DirectMessage[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'conversations', conversationId, 'messages'),
    where('memberUids', 'array-contains', uid),
    limit(50)
  );
  return listenWithRetry(
    q,
    (snap) => {
      const msgs = snap.docs
        .map((docSnap) => {
          const d = docSnap.data();
          const sortMs =
            d.createdAt instanceof Timestamp ? d.createdAt.toMillis() : Date.now();
          return {
            sortMs,
            msg: {
              id: String(d.id),
              senderUid: String(d.senderUid),
              text: String(d.text),
              timestampLabel: formatTimestamp(d.createdAt),
              createdAtMs:
                typeof d.createdAtMs === 'number'
                  ? Number(d.createdAtMs)
                  : sortMs,
              kind: d.kind,
              mediaUrl: d.mediaUrl ? String(d.mediaUrl) : undefined,
              mediaName: d.mediaName ? String(d.mediaName) : undefined,
              durationMs:
                typeof d.durationMs === 'number' ? Number(d.durationMs) : undefined,
              replyTo: d.replyToId
                ? {
                    id: String(d.replyToId),
                    senderName: String(d.replySenderName ?? ''),
                    text: String(d.replyText ?? ''),
                  }
                : undefined,
              isGiftEvent: Boolean(d.isGiftEvent ?? false),
              giftId: d.giftId ? String(d.giftId) : undefined,
              giftName: d.giftName ? String(d.giftName) : undefined,
              giftCurrency: d.giftCurrency,
              giftAmount:
                typeof d.giftAmount === 'number' ? Number(d.giftAmount) : undefined,
              giftRecipientUid: d.giftRecipientUid
                ? String(d.giftRecipientUid)
                : undefined,
              giftRecipientName: d.giftRecipientName
                ? String(d.giftRecipientName)
                : undefined,
              giftRecipientDiamonds:
                typeof d.giftRecipientDiamonds === 'number'
                  ? Number(d.giftRecipientDiamonds)
                  : undefined,
            } as DirectMessage,
          };
        })
        .sort((a, b) => a.sortMs - b.sortMs)
        .map((x) => x.msg);
      onData(msgs);
    },
    (error) =>
      handleFirestoreError(
        error,
        OperationType.LIST,
        `conversations/${conversationId}/messages`
      )
  );
}

export async function ensureConversationDoc(
  myUid: string,
  partnerUid: string
): Promise<string> {
  const sorted = [myUid, partnerUid].sort();
  const convId = `conv_${sorted[0].slice(0, 14)}_${sorted[1].slice(0, 14)}`;
  const convRef = doc(db, 'conversations', convId);
  try {
    const snap = await getDoc(convRef);
    if (!snap.exists()) {
      await setDoc(convRef, {
        conversationId: convId,
        memberUids: sorted,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    return convId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `conversations/${convId}`);
  }
}

export function subscribePromotions(
  onData: (records: AccountPromotionRecord[]) => void
): Unsubscribe {
  return listenWithRetry(
    query(collection(db, 'accountPromotions'), limit(40)),
    (snap) => {
      const list = snap.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          promotionId: String(d.promotionId),
          actorUid: String(d.actorUid),
          actorUsername: String(d.actorUsername),
          targetUid: String(d.targetUid),
          targetUsername: String(d.targetUsername),
          beforeType: d.beforeType,
          afterType: d.afterType,
          timestampLabel: formatTimestamp(d.createdAt),
        } as AccountPromotionRecord;
      });
      onData(list);
    },
    (error) => handleFirestoreError(error, OperationType.LIST, 'accountPromotions')
  );
}

export async function promoteUserDoc(
  actor: UserProfile,
  target: UserProfile,
  afterType: 'AGENT' | 'SUPER_AGENT'
): Promise<void> {
  const promoId = `promo_${Date.now()}_${target.uid.slice(0, 8)}`;
  const batch = writeBatch(db);

  batch.update(doc(db, 'users', target.uid), {
    accountType: afterType,
    updatedAt: serverTimestamp(),
  });

  batch.set(doc(db, 'accountPromotions', promoId), {
    promotionId: promoId,
    actorUid: actor.uid,
    actorUsername: clampStr(actor.username, 32),
    targetUid: target.uid,
    targetUsername: clampStr(target.username, 32),
    beforeType: 'USER',
    afterType,
    createdAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `accountPromotions/${promoId}`);
  }
}

export function subscribeReports(
  uid: string,
  canModerate: boolean,
  onData: (reports: ReportRecord[]) => void
): Unsubscribe {
  const q = canModerate
    ? query(collection(db, 'reports'), limit(50))
    : query(collection(db, 'reports'), where('reporterUid', '==', uid), limit(30));
  return listenWithRetry(
    q,
    (snap) => {
      const list: ReportRecord[] = snap.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          reportId: String(d.reportId),
          targetType: d.targetType,
          targetId: String(d.targetId),
          targetLabel: String(d.targetLabel),
          reason: String(d.reason),
          reporterUsername: String(d.reporterUsername),
          status: d.status,
          timestampLabel: formatTimestamp(d.createdAt),
        };
      });
      onData(list);
    },
    (error) => handleFirestoreError(error, OperationType.LIST, 'reports')
  );
}

export async function submitReportDoc(payload: {
  targetType: 'ROOM' | 'USER';
  targetId: string;
  targetLabel: string;
  reason: string;
  reporter: UserProfile;
}): Promise<void> {
  const reportId = `rep_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  try {
    await setDoc(doc(db, 'reports', reportId), {
      reportId,
      targetType: payload.targetType,
      targetId: payload.targetId,
      targetLabel: clampStr(payload.targetLabel, 140),
      reason: clampStr(payload.reason, 240),
      reporterUid: payload.reporter.uid,
      reporterUsername: clampStr(payload.reporter.username, 32),
      status: 'OPEN',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `reports/${reportId}`);
  }
}

export async function resolveReportDoc(reportId: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'reports', reportId), {
      status: 'RESOLVED',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `reports/${reportId}`);
  }
}

// ==========================================
// SUPER AGENT: MY AGENT & MY HOST
// ==========================================

export async function addAgencyMemberDoc(
  superAgent: UserProfile,
  targetUser: UserProfile,
  memberType: 'AGENT' | 'HOST'
): Promise<void> {
  const memberId = `${superAgent.uid}_${targetUser.uid}`;
  const batch = writeBatch(db);

  // Update user document
  const userUpdates: Record<string, any> = {
    superAgentUid: superAgent.uid,
    updatedAt: serverTimestamp(),
  };

  if (memberType === 'AGENT') {
    userUpdates.accountType = 'AGENT';
  } else {
    userUpdates.isHost = true;
    userUpdates.hostAgencyUid = superAgent.uid;
  }
  batch.update(doc(db, 'users', targetUser.uid), userUpdates);

  // Upsert agency member record
  batch.set(doc(db, 'agencyMembers', memberId), {
    id: memberId,
    superAgentUid: superAgent.uid,
    memberUid: targetUser.uid,
    memberPlatformId: targetUser.platformId,
    memberUsername: clampStr(targetUser.username, 32),
    memberDisplayName: clampStr(targetUser.displayName, 64),
    memberType,
    commissionRate: memberType === 'AGENT' ? 0.05 : 0.10,
    createdAt: serverTimestamp(),
    createdAtMillis: Date.now(),
  }, { merge: true });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `agencyMembers/${memberId}`);
  }
}

export function subscribeAgencyMembers(
  superAgentUid: string,
  memberType: 'AGENT' | 'HOST',
  onData: (members: AgencyMemberRecord[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'agencyMembers'),
    where('superAgentUid', '==', superAgentUid),
    where('memberType', '==', memberType),
    limit(100)
  );

  return listenWithRetry(
    q,
    (snap) => {
      const list: AgencyMemberRecord[] = snap.docs.map((dSnap) => {
        const d = dSnap.data();
        return {
          id: dSnap.id,
          superAgentUid: String(d.superAgentUid),
          memberUid: String(d.memberUid),
          memberPlatformId: String(d.memberPlatformId ?? ''),
          memberUsername: String(d.memberUsername ?? ''),
          memberDisplayName: String(d.memberDisplayName ?? ''),
          memberType: d.memberType ?? memberType,
          commissionRate: Number(d.commissionRate ?? (memberType === 'AGENT' ? 0.05 : 0.10)),
          totalGiftsReceived: Number(d.totalGiftsReceived ?? 0),
          totalCommissionEarned: Number(d.totalCommissionEarned ?? 0),
          createdAtLabel: formatTimestamp(d.createdAt),
          createdAtMillis: Number(d.createdAtMillis ?? Date.now()),
        };
      });
      onData(list);
    },
    (error) => handleFirestoreError(error, OperationType.LIST, 'agencyMembers')
  );
}

export function subscribeAgencyCommissionStories(
  superAgentUid: string,
  memberType: 'AGENT' | 'HOST',
  onData: (stories: AgencyCommissionStoryRecord[]) => void
): Unsubscribe {
  // 30 days retention: filter records where timestampMillis >= Date.now() - 30 days
  const thirtyDaysAgoMillis = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const q = query(
    collection(db, 'agencyCommissions'),
    where('superAgentUid', '==', superAgentUid),
    where('memberType', '==', memberType),
    limit(300)
  );

  return listenWithRetry(
    q,
    (snap) => {
      const list: AgencyCommissionStoryRecord[] = [];
      snap.docs.forEach((dSnap) => {
        const d = dSnap.data();
        const tMillis = Number(d.timestampMillis ?? (d.createdAt ? d.createdAt.toMillis?.() : Date.now()));
        // Filter strictly within 30 days
        if (tMillis >= thirtyDaysAgoMillis) {
          list.push({
            id: dSnap.id,
            superAgentUid: String(d.superAgentUid),
            memberUid: String(d.memberUid),
            memberUsername: String(d.memberUsername ?? ''),
            memberDisplayName: String(d.memberDisplayName ?? ''),
            memberType: d.memberType ?? memberType,
            giftName: String(d.giftName ?? 'Gift'),
            giftPrice: Number(d.giftPrice ?? 0),
            commissionRate: Number(d.commissionRate ?? (memberType === 'AGENT' ? 0.05 : 0.10)),
            commissionAmount: Number(d.commissionAmount ?? 0),
            dateKey: String(d.dateKey ?? ''),
            timestampLabel: formatTimestamp(d.createdAt),
            timestampMillis: tMillis,
          });
        }
      });
      list.sort((a, b) => b.timestampMillis - a.timestampMillis);
      onData(list);
    },
    (error) => handleFirestoreError(error, OperationType.LIST, 'agencyCommissions')
  );
}

// ==========================================
// ADMIN PANEL: platform management
// ==========================================

function mapUserDoc(d: DocumentData): UserProfile {
  return {
    uid: String(d.uid),
    platformId: String(d.platformId),
    username: String(d.username),
    displayName: String(d.displayName),
    bio: String(d.bio ?? ''),
    country: String(d.country ?? 'USA'),
    gender: (d.gender as GenderOption) ?? 'Prefer not to say',
    accountType: d.accountType,
    avatarColor: String(d.avatarColor ?? '#6366F1'),
    coverGradient: String(
      d.coverGradient ?? 'linear-gradient(135deg, #2E1065 0%, #1E3A8A 100%)'
    ),
    avatarUrl: d.avatarUrl ? String(d.avatarUrl) : undefined,
    coverUrl: d.coverUrl ? String(d.coverUrl) : undefined,
    followersCount: Number(d.followersCount ?? 0),
    followingCount: Number(d.followingCount ?? 0),
    visitorsCount: Number(d.visitorsCount ?? 0),
    isOnline: Boolean(d.isOnline ?? false),
    showPresence: Boolean(d.showPresence ?? true),
    lastActiveLabel: String(d.lastActiveLabel ?? 'Active'),
    isNewCreator: Boolean(d.isNewCreator ?? false),
    isSuspended: Boolean(d.isSuspended ?? false),
  };
}

export function subscribeAllUsers(
  onData: (users: UserProfile[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  return listenWithRetry(
    query(collection(db, 'users'), limit(200)),
    (snapshot) => onData(snapshot.docs.map((s) => mapUserDoc(s.data()))),
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, 'users');
      } catch (e) {
        if (onError && e instanceof Error) onError(e);
      }
    }
  );
}

export function subscribeAllWallets(
  onData: (wallets: AdminWalletSnapshot[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  return listenWithRetry(
    query(collection(db, 'wallets'), limit(200)),
    (snapshot) =>
      onData(
        snapshot.docs.map((s) => {
          const d = s.data();
          return {
            uid: String(d.uid ?? s.id),
            coinBalance: Number(d.coinBalance ?? 0),
            diamondBalance: Number(d.diamondBalance ?? 0),
            tradingCoinBalance: Number(d.tradingCoinBalance ?? 0),
          };
        })
      ),
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, 'wallets');
      } catch (e) {
        if (onError && e instanceof Error) onError(e);
      }
    }
  );
}

function auditDocId(): string {
  return `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function auditFields(
  actor: UserProfile,
  action: string,
  targetId: string,
  detail: string
) {
  return {
    auditId: '',
    actorUid: actor.uid,
    actorUsername: clampStr(actor.username, 32),
    action: clampStr(action, 48),
    targetId: clampStr(targetId, 128),
    detail: clampStr(detail, 240),
    createdAt: serverTimestamp(),
  };
}

function addAudit(
  batch: ReturnType<typeof writeBatch>,
  actor: UserProfile,
  action: string,
  targetId: string,
  detail: string
): void {
  const auditId = auditDocId();
  batch.set(doc(db, 'adminAudit', auditId), {
    ...auditFields(actor, action, targetId, detail),
    auditId,
  });
}

async function commitInChunks(
  ops: ((batch: ReturnType<typeof writeBatch>) => void)[]
): Promise<void> {
  for (let i = 0; i < ops.length; i += 450) {
    const batch = writeBatch(db);
    ops.slice(i, i + 450).forEach((op) => op(batch));
    await batch.commit();
  }
}

export async function adminSetSuspended(
  actor: UserProfile,
  target: UserProfile,
  suspended: boolean
): Promise<void> {
  const batch = writeBatch(db);
  batch.update(doc(db, 'users', target.uid), {
    isSuspended: suspended,
    updatedAt: serverTimestamp(),
  });
  addAudit(
    batch,
    actor,
    suspended ? 'SUSPEND_USER' : 'UNSUSPEND_USER',
    target.uid,
    `@${target.username} (${target.platformId})`
  );
  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${target.uid}`);
  }
}

export async function adminDemoteToUser(
  actor: UserProfile,
  target: UserProfile
): Promise<void> {
  const batch = writeBatch(db);
  batch.update(doc(db, 'users', target.uid), {
    accountType: 'USER',
    updatedAt: serverTimestamp(),
  });
  addAudit(
    batch,
    actor,
    'DEMOTE_TO_USER',
    target.uid,
    `@${target.username} ${target.accountType} → USER`
  );
  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${target.uid}`);
  }
}

export async function adminSetRole(
  actor: UserProfile,
  target: UserProfile,
  newRole: 'USER' | 'AGENT' | 'SUPER_AGENT'
): Promise<void> {
  const batch = writeBatch(db);
  batch.update(doc(db, 'users', target.uid), {
    accountType: newRole,
    updatedAt: serverTimestamp(),
  });
  addAudit(
    batch,
    actor,
    'UPDATE_ROLE',
    target.uid,
    `@${target.username} ${target.accountType} → ${newRole}`
  );
  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${target.uid}`);
  }
}

export async function adminAdjustWallet(
  actor: UserProfile,
  targetUid: string,
  currency: 'COIN' | 'DIAMOND' | 'TRADING',
  direction: 'CREDIT' | 'DEBIT',
  amount: number,
  reason: string
): Promise<void> {
  const value = Math.floor(amount);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error('Enter a valid amount.');
  }
  const field =
    currency === 'COIN'
      ? 'coinBalance'
      : currency === 'TRADING'
      ? 'tradingCoinBalance'
      : 'diamondBalance';
  const txId = `tx_admin_${Date.now()}_${targetUid.slice(0, 8)}`;
  const batch = writeBatch(db);
  batch.update(doc(db, 'wallets', targetUid), {
    [field]: increment(direction === 'CREDIT' ? value : -value),
    updatedAt: serverTimestamp(),
  });
  batch.set(doc(db, 'wallets', targetUid, 'transactions', txId), {
    transactionId: txId,
    uid: targetUid,
    currency,
    direction,
    amount: value,
    reason: clampStr(reason || `Admin ${direction.toLowerCase()}`, 160),
    counterparty: clampStr(`Admin @${actor.username}`, 64),
    idempotencyKey: clampStr(`admin_adjust_${targetUid}_${Date.now()}`, 128),
    createdAt: serverTimestamp(),
  });
  addAudit(
    batch,
    actor,
    direction === 'CREDIT' ? 'GRANT_BALANCE' : 'DEDUCT_BALANCE',
    targetUid,
    `${direction} ${value.toLocaleString()} ${currency} — ${reason}`
  );
  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `wallets/${targetUid}`);
  }
}

export async function adminDeleteUserCascade(
  actor: UserProfile,
  target: UserProfile
): Promise<void> {
  try {
    const [txSnap, followsAsFollower, followsAsTarget, blocksAsBlocker, blocksAsBlocked] =
      await Promise.all([
        getDocs(collection(db, 'wallets', target.uid, 'transactions')),
        getDocs(query(collection(db, 'follows'), where('followerUid', '==', target.uid))),
        getDocs(query(collection(db, 'follows'), where('targetUid', '==', target.uid))),
        getDocs(query(collection(db, 'blocks'), where('blockerUid', '==', target.uid))),
        getDocs(query(collection(db, 'blocks'), where('blockedUid', '==', target.uid))),
      ]);

    const ops: ((batch: ReturnType<typeof writeBatch>) => void)[] = [];
    const deleteRefs = [
      ...txSnap.docs.map((s) => s.ref),
      ...followsAsFollower.docs.map((s) => s.ref),
      ...followsAsTarget.docs.map((s) => s.ref),
      ...blocksAsBlocker.docs.map((s) => s.ref),
      ...blocksAsBlocked.docs.map((s) => s.ref),
      doc(db, 'wallets', target.uid),
      doc(db, 'userPrivate', target.uid),
      doc(db, 'usernames', target.username),
      doc(db, 'users', target.uid),
    ];
    deleteRefs.forEach((ref) => ops.push((batch) => batch.delete(ref)));
    ops.push((batch) =>
      addAudit(batch, actor, 'DELETE_USER', target.uid, `@${target.username} (${target.platformId}) + wallet, follows, blocks`)
    );
    await commitInChunks(ops);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${target.uid}`);
  }
}

export async function adminForceEndRoom(
  actor: UserProfile,
  roomId: string
): Promise<void> {
  const batch = writeBatch(db);
  batch.update(doc(db, 'liveRooms', roomId), {
    status: 'ENDED',
    updatedAt: serverTimestamp(),
  });
  addAudit(batch, actor, 'FORCE_END_ROOM', roomId, 'Admin ended the live room');
  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `liveRooms/${roomId}`);
  }
}

export async function adminDeleteRoom(
  actor: UserProfile,
  roomId: string
): Promise<void> {
  try {
    const subcollections = ['seats', 'joinRequests', 'messages', 'rtc', 'guestRtc'];
    const snaps = await Promise.all(
      subcollections.map((sub) => getDocs(collection(db, 'liveRooms', roomId, sub)))
    );
    const ops: ((batch: ReturnType<typeof writeBatch>) => void)[] = [];
    snaps.forEach((snap) =>
      snap.docs.forEach((s) => ops.push((batch) => batch.delete(s.ref)))
    );
    ops.push((batch) => batch.delete(doc(db, 'liveRooms', roomId)));
    ops.push((batch) => addAudit(batch, actor, 'DELETE_ROOM', roomId, 'Room + seats/messages/signaling deleted'));
    await commitInChunks(ops);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `liveRooms/${roomId}`);
  }
}

export async function adminDeleteReport(
  actor: UserProfile,
  reportId: string
): Promise<void> {
  const batch = writeBatch(db);
  batch.delete(doc(db, 'reports', reportId));
  addAudit(batch, actor, 'DELETE_REPORT', reportId, 'Report removed from queue');
  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `reports/${reportId}`);
  }
}

export function subscribeAdminAudit(
  onData: (records: AdminAuditRecord[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  return listenWithRetry(
    query(collection(db, 'adminAudit'), orderBy('createdAt', 'desc'), limit(60)),
    (snap) =>
      onData(
        snap.docs.map((s) => {
          const d = s.data();
          return {
            auditId: String(d.auditId ?? s.id),
            actorUid: String(d.actorUid ?? ''),
            actorUsername: String(d.actorUsername ?? ''),
            action: String(d.action ?? ''),
            targetId: String(d.targetId ?? ''),
            detail: String(d.detail ?? ''),
            timestampLabel: formatTimestamp(d.createdAt),
          };
        })
      ),
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, 'adminAudit');
      } catch (e) {
        if (onError && e instanceof Error) onError(e);
      }
    }
  );
}

function mapAnnouncement(id: string, d: DocumentData): AnnouncementRecord {
  return {
    announcementId: String(d.announcementId ?? id),
    title: String(d.title ?? ''),
    message: String(d.message ?? ''),
    status: d.status === 'ENDED' ? 'ENDED' : 'ACTIVE',
    createdByUsername: String(d.createdByUsername ?? ''),
    timestampLabel: formatTimestamp(d.createdAt),
  };
}

export function subscribeActiveAnnouncement(
  onData: (announcement: AnnouncementRecord | null) => void
): Unsubscribe {
  return listenWithRetry(
    query(collection(db, 'announcements'), where('status', '==', 'ACTIVE'), limit(1)),
    (snap) =>
      onData(snap.empty ? null : mapAnnouncement(snap.docs[0].id, snap.docs[0].data())),
    () => onData(null)
  );
}

export async function publishAnnouncement(
  actor: UserProfile,
  title: string,
  message: string
): Promise<void> {
  const cleanTitle = title.trim();
  const cleanMessage = message.trim();
  if (!cleanTitle || !cleanMessage) {
    throw new Error('Title and message are required.');
  }
  try {
    const active = await getDocs(
      query(collection(db, 'announcements'), where('status', '==', 'ACTIVE'))
    );
    const announcementId = `ann_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const batch = writeBatch(db);
    active.docs.forEach((s) =>
      batch.update(s.ref, { status: 'ENDED', updatedAt: serverTimestamp() })
    );
    batch.set(doc(db, 'announcements', announcementId), {
      announcementId,
      title: clampStr(cleanTitle, 80),
      message: clampStr(cleanMessage, 300),
      status: 'ACTIVE',
      createdByUid: actor.uid,
      createdByUsername: clampStr(actor.username, 32),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    addAudit(batch, actor, 'PUBLISH_ANNOUNCEMENT', announcementId, cleanTitle);
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'announcements');
  }
}

export async function endAnnouncement(
  actor: UserProfile,
  announcementId: string
): Promise<void> {
  const batch = writeBatch(db);
  batch.update(doc(db, 'announcements', announcementId), {
    status: 'ENDED',
    updatedAt: serverTimestamp(),
  });
  addAudit(batch, actor, 'END_ANNOUNCEMENT', announcementId, 'Announcement ended');
  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `announcements/${announcementId}`);
  }
}

// ---------------------------------------------------------------------------
// REWARD CENTER: daily check-in + daily tasks (Poppo-style), real coin credits
// ---------------------------------------------------------------------------

function defaultRewardProfile(uid: string): RewardProfile {
  return {
    uid,
    day: rewardDayKey(),
    checkInDate: '',
    streak: 0,
    watchSeconds: 0,
    giftsSent: 0,
    followsMade: 0,
    gamesPlayed: 0,
    claimed: [],
  };
}

function mapRewardProfile(d: DocumentSnapshot): RewardProfile {
  const data = d.data() ?? {};
  return {
    uid: d.id,
    day: String(data.day ?? ''),
    checkInDate: String(data.checkInDate ?? ''),
    streak: Number(data.streak ?? 0),
    watchSeconds: Number(data.watchSeconds ?? 0),
    giftsSent: Number(data.giftsSent ?? 0),
    followsMade: Number(data.followsMade ?? 0),
    gamesPlayed: Number(data.gamesPlayed ?? 0),
    claimed: Array.isArray(data.claimed) ? data.claimed.map(String) : [],
  };
}

export async function ensureRewardProfile(uid: string): Promise<void> {
  const ref = doc(db, 'rewardProfiles', uid);
  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (snap.exists()) return;
      tx.set(ref, { ...defaultRewardProfile(uid), updatedAt: serverTimestamp() });
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `rewardProfiles/${uid}`);
  }
}

export function subscribeRewardProfile(
  uid: string,
  onData: (profile: RewardProfile | null) => void
): Unsubscribe {
  return listenWithRetry(
    doc(db, 'rewardProfiles', uid),
    (snap) => onData(snap.exists() ? mapRewardProfile(snap) : null),
    () => onData(null)
  );
}

// Best-effort progress tracking; never surfaces errors to the user.
export async function bumpRewardProgress(
  uid: string,
  field: 'watchSeconds' | 'giftsSent' | 'followsMade' | 'gamesPlayed',
  amount: number
): Promise<void> {
  if (amount <= 0) return;
  const ref = doc(db, 'rewardProfiles', uid);
  const today = rewardDayKey();
  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      const base = snap.exists() ? snap.data() : defaultRewardProfile(uid);
      const sameDay = base.day === today;
      const current = sameDay ? Number(base[field] ?? 0) : 0;
      const patch: DocumentData = {
        uid,
        day: today,
        checkInDate: String(base.checkInDate ?? ''),
        streak: Number(base.streak ?? 0),
        watchSeconds: sameDay ? Number(base.watchSeconds ?? 0) : 0,
        giftsSent: sameDay ? Number(base.giftsSent ?? 0) : 0,
        followsMade: sameDay ? Number(base.followsMade ?? 0) : 0,
        gamesPlayed: sameDay ? Number(base.gamesPlayed ?? 0) : 0,
        claimed: sameDay && Array.isArray(base.claimed) ? base.claimed : [],
        [field]: current + amount,
        updatedAt: serverTimestamp(),
      };
      tx.set(ref, patch);
    });
  } catch {
    // Progress tracking is best-effort; ignore failures silently.
  }
}

export async function claimReward(
  uid: string,
  kind: 'checkin' | RewardTaskId
): Promise<{ amount: number; streak: number }> {
  const today = rewardDayKey();
  const key = `reward_${kind}_${today}`;
  await ensureRewardProfile(uid);

  const rpRef = doc(db, 'rewardProfiles', uid);
  const walletRef = doc(db, 'wallets', uid);
  const earningsRef = doc(db, 'dailyRewardEarnings', `${uid}_${today}`);
  let awarded = 0;
  let streakOut = 0;

  try {
    await runTransaction(db, async (tx) => {
      const [rpSnap, wSnap, earnSnap] = await Promise.all([
        tx.get(rpRef),
        tx.get(walletRef),
        tx.get(earningsRef),
      ]);
      if (!rpSnap.exists()) throw new Error('Reward profile not ready.');
      if (!wSnap.exists()) throw new Error('Wallet not initialized.');

      const rp = rpSnap.data();
      const sameDay = rp.day === today;
      const claimed: string[] =
        sameDay && Array.isArray(rp.claimed) ? rp.claimed.map(String) : [];
      if (claimed.includes(key)) throw new Error('Already claimed today.');

      const patch: DocumentData = {
        day: today,
        claimed: [...claimed, key],
        updatedAt: serverTimestamp(),
      };
      if (!sameDay) {
        patch.watchSeconds = 0;
        patch.giftsSent = 0;
        patch.followsMade = 0;
        patch.gamesPlayed = 0;
      }

      let amount = 0;
      let reason = '';
      if (kind === 'checkin') {
        const yesterday = rewardDayKey(new Date(Date.now() - 86400000));
        const prevStreak = Number(rp.streak ?? 0);
        const streak =
          rp.checkInDate === yesterday ? (prevStreak >= 7 ? 1 : prevStreak + 1) : 1;
        amount = CHECK_IN_REWARDS[streak - 1];
        reason = `Daily Check-In Reward (Day ${streak})`;
        patch.checkInDate = today;
        patch.streak = streak;
        streakOut = streak;
      } else {
        const task = REWARD_TASKS.find((t) => t.id === kind);
        if (!task) throw new Error('Unknown reward task.');
        const progress = sameDay ? Number(rp[task.field] ?? 0) : 0;
        if (progress < task.goal) throw new Error('Task not completed yet.');
        amount = task.reward;
        reason = `Daily Task Reward: ${task.title}`;
        streakOut = Number(rp.streak ?? 0);
      }

      const coins = Number(wSnap.data().coinBalance ?? 0);
      tx.update(walletRef, {
        coinBalance: coins + amount,
        updatedAt: serverTimestamp(),
      });
      tx.update(rpRef, patch);

      // Per-day reward total feeds the 15-day agency reward sharing ledger.
      const earnData = earnSnap.exists() ? earnSnap.data() : {};
      tx.set(earningsRef, {
        uid,
        day: today,
        coinReward: Number(earnData.coinReward ?? 0) + amount,
        diamondReward: Number(earnData.diamondReward ?? 0),
        updatedAt: serverTimestamp(),
      });

      const txId = `tx_rw_${kind}_${uid.slice(0, 8)}_${today}`;
      tx.set(doc(db, 'wallets', uid, 'transactions', txId), {
        transactionId: txId,
        uid,
        currency: 'COIN',
        direction: 'CREDIT',
        amount,
        reason,
        counterparty: 'AddaBuzz Platform',
        idempotencyKey: key,
        createdAt: serverTimestamp(),
      });

      awarded = amount;
    });

    return { amount: awarded, streak: streakOut };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Already claimed')) throw error;
    if (error instanceof Error && error.message.startsWith('Task not completed')) throw error;
    if (error instanceof Error && error.message.startsWith('Reward profile')) throw error;
    if (error instanceof Error && error.message.startsWith('Wallet not')) throw error;
    handleFirestoreError(error, OperationType.WRITE, `rewardProfiles/${uid}`);
    return { amount: 0, streak: 0 };
  }
}

// ---------------------------------------------------------------------------
// HOST REWARDS: Poppo-style female host rewards, paid in Diamonds
// ---------------------------------------------------------------------------

function defaultHostRewardProfile(uid: string): HostRewardProfile {
  return {
    uid,
    day: rewardDayKey(),
    liveSeconds: 0,
    giftsReceived: 0,
    newFollowers: 0,
    firstLiveDone: false,
    validDays: 0,
    claimed: [],
  };
}

function mapHostRewardProfile(d: DocumentSnapshot): HostRewardProfile {
  const data = d.data() ?? {};
  return {
    uid: d.id,
    day: String(data.day ?? ''),
    liveSeconds: Number(data.liveSeconds ?? 0),
    giftsReceived: Number(data.giftsReceived ?? 0),
    newFollowers: Number(data.newFollowers ?? 0),
    firstLiveDone: Boolean(data.firstLiveDone ?? false),
    validDays: Number(data.validDays ?? 0),
    claimed: Array.isArray(data.claimed) ? data.claimed.map(String) : [],
  };
}

export async function ensureHostRewardProfile(uid: string): Promise<void> {
  const ref = doc(db, 'hostRewardProfiles', uid);
  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (snap.exists()) return;
      tx.set(ref, { ...defaultHostRewardProfile(uid), updatedAt: serverTimestamp() });
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `hostRewardProfiles/${uid}`);
  }
}

export function subscribeHostRewardProfile(
  uid: string,
  onData: (profile: HostRewardProfile | null) => void
): Unsubscribe {
  return listenWithRetry(
    doc(db, 'hostRewardProfiles', uid),
    (snap) => onData(snap.exists() ? mapHostRewardProfile(snap) : null),
    () => onData(null)
  );
}

// Best-effort progress tracking; never surfaces errors to the user.
export async function bumpHostRewardProgress(
  uid: string,
  field: 'liveSeconds' | 'giftsReceived' | 'newFollowers',
  amount: number
): Promise<void> {
  if (amount <= 0) return;
  const ref = doc(db, 'hostRewardProfiles', uid);
  const today = rewardDayKey();
  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      const base = snap.exists() ? snap.data() : defaultHostRewardProfile(uid);
      const sameDay = base.day === today;
      const carriedValidDays =
        Number(base.validDays ?? 0) +
        (!sameDay && Number(base.liveSeconds ?? 0) >= HOST_VALID_DAY_SECONDS ? 1 : 0);
      const current = sameDay ? Number(base[field] ?? 0) : 0;
      tx.set(ref, {
        uid,
        day: today,
        liveSeconds: sameDay ? Number(base.liveSeconds ?? 0) : 0,
        giftsReceived: sameDay ? Number(base.giftsReceived ?? 0) : 0,
        newFollowers: sameDay ? Number(base.newFollowers ?? 0) : 0,
        firstLiveDone: Boolean(base.firstLiveDone ?? false),
        validDays: carriedValidDays,
        claimed: sameDay && Array.isArray(base.claimed) ? base.claimed : [],
        [field]: current + amount,
        updatedAt: serverTimestamp(),
      });
    });
  } catch {
    // Progress tracking is best-effort; ignore failures silently.
  }
}

export async function claimHostReward(
  uid: string,
  kind: 'newbie' | 'valid' | HostTaskId
): Promise<{ amount: number }> {
  const today = rewardDayKey();
  const key = kind === 'newbie' ? 'host_newbie' : `host_${kind}_${today}`;
  await ensureHostRewardProfile(uid);

  const hpRef = doc(db, 'hostRewardProfiles', uid);
  const walletRef = doc(db, 'wallets', uid);
  const earningsRef = doc(db, 'dailyRewardEarnings', `${uid}_${today}`);
  let awarded = 0;

  try {
    await runTransaction(db, async (tx) => {
      const [hpSnap, wSnap, earnSnap] = await Promise.all([
        tx.get(hpRef),
        tx.get(walletRef),
        tx.get(earningsRef),
      ]);
      if (!hpSnap.exists()) throw new Error('Host reward profile not ready.');
      if (!wSnap.exists()) throw new Error('Wallet not initialized.');

      const hp = hpSnap.data();
      const sameDay = hp.day === today;
      const claimed: string[] =
        sameDay && Array.isArray(hp.claimed) ? hp.claimed.map(String) : [];
      if (claimed.includes(key)) throw new Error('Already claimed today.');

      const liveSeconds = sameDay ? Number(hp.liveSeconds ?? 0) : 0;
      const validDaysBase =
        Number(hp.validDays ?? 0) +
        (!sameDay && Number(hp.liveSeconds ?? 0) >= HOST_VALID_DAY_SECONDS ? 1 : 0);

      const patch: DocumentData = {
        day: today,
        claimed: [...claimed, key],
        updatedAt: serverTimestamp(),
      };
      if (!sameDay) {
        patch.liveSeconds = 0;
        patch.giftsReceived = 0;
        patch.newFollowers = 0;
        patch.validDays = validDaysBase;
      }

      let amount = 0;
      let reason = '';
      if (kind === 'newbie') {
        if (Boolean(hp.firstLiveDone)) throw new Error('New host bonus already claimed.');
        if (liveSeconds < HOST_NEWBIE_SECONDS) {
          throw new Error('Go live for at least 1 minute to unlock this bonus.');
        }
        amount = HOST_NEWBIE_REWARD;
        reason = 'New Host Bonus';
        patch.firstLiveDone = true;
      } else if (kind === 'valid') {
        if (validDaysBase < HOST_VALID_DAYS_GOAL) {
          throw new Error('Need 5 valid days (60+ min live each) to claim.');
        }
        amount = HOST_VALID_DAYS_REWARD;
        reason = 'Valid Day Bonus (5 valid days)';
        patch.validDays = validDaysBase - HOST_VALID_DAYS_GOAL;
      } else {
        const task = HOST_TASKS.find((t) => t.id === kind);
        if (!task) throw new Error('Unknown host task.');
        const progress = sameDay ? Number(hp[task.field] ?? 0) : 0;
        if (progress < task.goal) throw new Error('Task not completed yet.');
        amount = task.reward;
        reason = `Host Task Reward: ${task.title}`;
      }

      const diamonds = Number(wSnap.data().diamondBalance ?? 0);
      tx.update(walletRef, {
        diamondBalance: diamonds + amount,
        updatedAt: serverTimestamp(),
      });
      tx.update(hpRef, patch);

      // Per-day reward total feeds the 15-day agency reward sharing ledger.
      const earnData = earnSnap.exists() ? earnSnap.data() : {};
      tx.set(earningsRef, {
        uid,
        day: today,
        coinReward: Number(earnData.coinReward ?? 0),
        diamondReward: Number(earnData.diamondReward ?? 0) + amount,
        updatedAt: serverTimestamp(),
      });

      const txId = `tx_hr_${kind}_${uid.slice(0, 8)}_${today}`;
      tx.set(doc(db, 'wallets', uid, 'transactions', txId), {
        transactionId: txId,
        uid,
        currency: 'DIAMOND',
        direction: 'CREDIT',
        amount,
        reason,
        counterparty: 'AddaBuzz Platform',
        idempotencyKey: key,
        createdAt: serverTimestamp(),
      });

      awarded = amount;
    });

    return { amount: awarded };
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.startsWith('Already claimed') ||
        error.message.startsWith('Task not completed') ||
        error.message.startsWith('New host bonus') ||
        error.message.startsWith('Go live for') ||
        error.message.startsWith('Need 5 valid') ||
        error.message.startsWith('Host reward profile') ||
        error.message.startsWith('Wallet not'))
    ) {
      throw error;
    }
    handleFirestoreError(error, OperationType.WRITE, `hostRewardProfiles/${uid}`);
    return { amount: 0 };
  }
}

// ---------------------------------------------------------------------------
// 15-DAY DEPOSIT VAULT — server-tracked principal + 10% Diamond reward
// Deposit for 15 days; at maturity 10% of the amount is credited to the
// Diamond balance automatically. The reward window stays open for 15 days.
// ---------------------------------------------------------------------------

export const DEPOSIT_TERM_DAYS = 15;
export const DEPOSIT_REWARD_WINDOW_DAYS = 15;
export const DEPOSIT_BONUS_PERCENT = 10;
export const DEPOSIT_MIN_AMOUNT = 1000;
export const DEPOSIT_MAX_AMOUNT = 1000000;

const DAY_MS = 24 * 60 * 60 * 1000;

export interface DepositRecord {
  recordId: string;
  uid: string;
  amount: number;
  bonusPercent: number;
  rewardAmount: number;
  createdAt: number;
  maturesAt: number;
  rewardWindowEndsAt: number;
  rewardCredited: boolean;
  principalWithdrawn: boolean;
}

function tsToMs(value: unknown): number {
  if (value instanceof Timestamp) return value.toMillis();
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function mapDepositRecord(d: DocumentSnapshot): DepositRecord {
  const data = d.data() ?? {};
  return {
    recordId: d.id,
    uid: String(data.uid ?? ''),
    amount: Number(data.amount ?? 0),
    bonusPercent: Number(data.bonusPercent ?? DEPOSIT_BONUS_PERCENT),
    rewardAmount: Number(data.rewardAmount ?? 0),
    createdAt: tsToMs(data.createdAt),
    maturesAt: tsToMs(data.maturesAt),
    rewardWindowEndsAt: tsToMs(data.rewardWindowEndsAt),
    rewardCredited: Boolean(data.rewardCredited ?? false),
    principalWithdrawn: Boolean(data.principalWithdrawn ?? false),
  };
}

export function subscribeDepositRecords(
  uid: string,
  onData: (records: DepositRecord[]) => void
): Unsubscribe {
  return listenWithRetry(
    query(
      collection(db, 'depositVaults', uid, 'records'),
      orderBy('createdAt', 'desc'),
      limit(50)
    ),
    (snap) => onData(snap.docs.map(mapDepositRecord)),
    () => onData([])
  );
}

export async function createDepositRecord(
  uid: string,
  amount: number,
  idempotencyKey: string
): Promise<string> {
  const recordId = gameTxDocId(idempotencyKey);
  const recordRef = doc(db, 'depositVaults', uid, 'records', recordId);
  const walletRef = doc(db, 'wallets', uid);
  const txRef = doc(db, 'wallets', uid, 'transactions', recordId);
  const now = Date.now();
  const maturesMs = now + DEPOSIT_TERM_DAYS * DAY_MS;
  const rewardAmount = Math.floor((amount * DEPOSIT_BONUS_PERCENT) / 100);

  try {
    const [walletSnap, recordSnap, ledgerSnap] = await Promise.all([
      getDoc(walletRef),
      getDoc(recordRef),
      getDoc(txRef),
    ]);
    if (recordSnap.exists() || ledgerSnap.exists()) return recordId;
    if (!walletSnap.exists()) throw new Error('Wallet not initialized.');
    const coins = Number(walletSnap.data().coinBalance ?? 0);
    if (coins < amount) {
      throw new Error(`Insufficient Coins (need ${amount.toLocaleString('en-US')}).`);
    }
    const batch = writeBatch(db);
    batch.update(walletRef, {
      coinBalance: increment(-amount),
      updatedAt: serverTimestamp(),
    });
    batch.set(recordRef, {
      uid,
      amount,
      bonusPercent: DEPOSIT_BONUS_PERCENT,
      rewardAmount,
      createdAt: serverTimestamp(),
      maturesAt: Timestamp.fromMillis(maturesMs),
      rewardWindowEndsAt: Timestamp.fromMillis(
        maturesMs + DEPOSIT_REWARD_WINDOW_DAYS * DAY_MS
      ),
      rewardCredited: false,
      principalWithdrawn: false,
      updatedAt: serverTimestamp(),
    });
    batch.set(txRef, {
      transactionId: recordId,
      uid,
      currency: 'COIN',
      direction: 'DEBIT',
      amount,
      reason: `${DEPOSIT_TERM_DAYS}-Day Deposit (${DEPOSIT_TERM_DAYS} days)`,
      idempotencyKey,
      createdAt: serverTimestamp(),
    });
    await batch.commit();
    return recordId;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Insufficient')) throw error;
    if (error instanceof Error && error.message.startsWith('Wallet not')) throw error;
    handleFirestoreError(error, OperationType.WRITE, `depositVaults/${uid}`);
  }
}

// Credits the 10% Diamond reward for a matured deposit. Idempotent: the
// rewardCredited flag and the ledger doc make replays a no-op.
export async function claimDepositReward(
  uid: string,
  recordId: string
): Promise<number> {
  const recordRef = doc(db, 'depositVaults', uid, 'records', recordId);
  const walletRef = doc(db, 'wallets', uid);
  const ledgerKey = `depr_${recordId}`;
  const ledgerRef = doc(db, 'wallets', uid, 'transactions', gameTxDocId(ledgerKey));
  let credited = 0;
  let lastError: unknown;

  for (let attempt = 1; attempt <= GAME_TX_MAX_ATTEMPTS; attempt += 1) {
    try {
      await runTransaction(db, async (tx) => {
        const [recordSnap, walletSnap, ledgerSnap] = await Promise.all([
          tx.get(recordRef),
          tx.get(walletRef),
          tx.get(ledgerRef),
        ]);
        if (ledgerSnap.exists()) return;
        if (!recordSnap.exists()) throw new Error('Deposit record not found.');
        if (!walletSnap.exists()) throw new Error('Wallet not initialized.');

        const record = recordSnap.data();
        if (Boolean(record.rewardCredited)) return;
        const now = Date.now();
        if (now < tsToMs(record.maturesAt)) throw new Error('Deposit has not matured yet.');
        if (now > tsToMs(record.rewardWindowEndsAt)) {
          throw new Error('Deposit reward window has expired.');
        }
        const rewardAmount = Number(record.rewardAmount ?? 0);
        if (rewardAmount <= 0) return;

        const diamonds = Number(walletSnap.data().diamondBalance ?? 0);
        tx.update(walletRef, {
          diamondBalance: diamonds + rewardAmount,
          lastDepositEventId: recordId,
          updatedAt: serverTimestamp(),
        });
        tx.update(recordRef, { rewardCredited: true, updatedAt: serverTimestamp() });
        tx.set(ledgerRef, {
          transactionId: gameTxDocId(ledgerKey),
          uid,
          currency: 'DIAMOND',
          direction: 'CREDIT',
          amount: rewardAmount,
          reason: `${DEPOSIT_TERM_DAYS}-Day Deposit Reward (10%)`,
          idempotencyKey: ledgerKey,
          createdAt: serverTimestamp(),
        });
        credited = rewardAmount;
      });
      return credited;
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.startsWith('Deposit record') ||
          error.message.startsWith('Wallet not') ||
          error.message.startsWith('Deposit has not') ||
          error.message.startsWith('Deposit reward window'))
      ) {
        throw error;
      }
      lastError = error;
      if (!isOptimisticWriteError(error)) {
        handleFirestoreError(error, OperationType.WRITE, `depositVaults/${uid}`);
      }
    }
    await new Promise((resolve) => setTimeout(resolve, GAME_TX_RETRY_DELAY_MS * attempt));
  }
  handleFirestoreError(lastError, OperationType.WRITE, `depositVaults/${uid}`);
}

// Returns the principal to the Coin balance. Withdrawing before maturity
// forfeits the Diamond reward.
export async function withdrawDepositPrincipal(
  uid: string,
  recordId: string
): Promise<{ amount: number; forfeitedReward: boolean }> {
  const recordRef = doc(db, 'depositVaults', uid, 'records', recordId);
  const walletRef = doc(db, 'wallets', uid);
  const ledgerKey = `depw_${recordId}`;
  const ledgerRef = doc(db, 'wallets', uid, 'transactions', gameTxDocId(ledgerKey));
  let payout = 0;
  let forfeited = false;
  let lastError: unknown;

  for (let attempt = 1; attempt <= GAME_TX_MAX_ATTEMPTS; attempt += 1) {
    try {
      await runTransaction(db, async (tx) => {
        const [recordSnap, walletSnap, ledgerSnap] = await Promise.all([
          tx.get(recordRef),
          tx.get(walletRef),
          tx.get(ledgerRef),
        ]);
        if (ledgerSnap.exists()) return;
        if (!recordSnap.exists()) throw new Error('Deposit record not found.');
        if (!walletSnap.exists()) throw new Error('Wallet not initialized.');

        const record = recordSnap.data();
        if (Boolean(record.principalWithdrawn)) throw new Error('Principal already withdrawn.');

        const amount = Number(record.amount ?? 0);
        const matured = Date.now() >= tsToMs(record.maturesAt);
        const coins = Number(walletSnap.data().coinBalance ?? 0);

        tx.update(walletRef, {
          coinBalance: coins + amount,
          lastDepositEventId: recordId,
          updatedAt: serverTimestamp(),
        });
        if (matured) {
          tx.update(recordRef, { principalWithdrawn: true, updatedAt: serverTimestamp() });
        } else {
          tx.update(recordRef, {
            principalWithdrawn: true,
            rewardCredited: true,
            updatedAt: serverTimestamp(),
          });
        }
        tx.set(ledgerRef, {
          transactionId: gameTxDocId(ledgerKey),
          uid,
          currency: 'COIN',
          direction: 'CREDIT',
          amount,
          reason: matured ? 'Deposit Principal (Matured)' : 'Deposit Principal (Early)',
          idempotencyKey: ledgerKey,
          createdAt: serverTimestamp(),
        });
        payout = amount;
        forfeited = !matured;
      });
      return { amount: payout, forfeitedReward: forfeited };
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.startsWith('Deposit record') ||
          error.message.startsWith('Wallet not') ||
          error.message.startsWith('Principal already'))
      ) {
        throw error;
      }
      lastError = error;
      if (!isOptimisticWriteError(error)) {
        handleFirestoreError(error, OperationType.WRITE, `depositVaults/${uid}`);
      }
    }
    await new Promise((resolve) => setTimeout(resolve, GAME_TX_RETRY_DELAY_MS * attempt));
  }
  handleFirestoreError(lastError, OperationType.WRITE, `depositVaults/${uid}`);
}

// ---------------------------------------------------------------------------
// AGENCY DAILY REWARD SHARING — 15-day deposit qualified 10% shares
// A Super Agent (700,000 coin deposit) earns 10% of the daily rewards of the
// Agents and Hosts under it; an Agent (500,000 coin deposit) earns 10% of the
// daily rewards of its Hosts. Only days fully inside the 15-day validity
// window of a qualifying deposit are shared. Each share is a deterministic
// document (one per owner/day/source) so re-runs never double-pay.
// ---------------------------------------------------------------------------

export const AGENCY_SHARE_PERCENT = 10;
export const AGENCY_SHARE_VALIDITY_DAYS = 15;
export const AGENCY_SHARE_SUPER_AGENT_DEPOSIT = 700000;
export const AGENCY_SHARE_AGENT_DEPOSIT = 500000;
export const REWARD_SHARE_PREFIX = 'rs_';

const AGENCY_SHARE_DAY_MS = 24 * 60 * 60 * 1000;

export type AgencyShareRole = 'SUPER_AGENT' | 'AGENT';
export type AgencyShareSourceRole = 'AGENT' | 'HOST';

export interface DailyRewardEarningRecord {
  uid: string;
  day: string;
  coinReward: number;
  diamondReward: number;
}

export interface AgencyRewardSharePayout {
  shareId: string;
  recipientUid: string;
  recipientRole: AgencyShareRole;
  sourceUid: string;
  sourceRole: AgencyShareSourceRole;
  sourceUsername: string;
  sourceDisplayName: string;
  day: string;
  baseCoin: number;
  baseDiamond: number;
  shareCoin: number;
  shareDiamond: number;
  depositRecordId: string;
  windowStartMs: number;
  windowEndMs: number;
  timestampLabel: string;
  createdAtMs: number;
}

export interface AgencyRewardShareStatus {
  role: AgencyShareRole | null;
  threshold: number;
  qualifies: boolean;
  depositRecordId: string;
  windowStartMs: number;
  windowEndMs: number;
  daysRemaining: number;
}

export interface AgencyRewardShareSettlement {
  settled: boolean;
  reason: string;
  payoutCount: number;
  paidCoins: number;
  paidDiamonds: number;
  memberCount: number;
  windowStartMs: number;
  windowEndMs: number;
}

interface AgencyShareMember {
  uid: string;
  role: AgencyShareSourceRole;
  username: string;
  displayName: string;
}

function agencyShareRole(user: UserProfile | null | undefined): AgencyShareRole | null {
  if (!user) return null;
  if (user.accountType === 'SUPER_AGENT') return 'SUPER_AGENT';
  if (user.accountType === 'AGENT') return 'AGENT';
  return null;
}

function agencyShareThreshold(role: AgencyShareRole): number {
  return role === 'SUPER_AGENT'
    ? AGENCY_SHARE_SUPER_AGENT_DEPOSIT
    : AGENCY_SHARE_AGENT_DEPOSIT;
}

function agencyShareWindowEnd(record: DepositRecord): number {
  return record.createdAt + AGENCY_SHARE_VALIDITY_DAYS * AGENCY_SHARE_DAY_MS;
}

function localDayStartMs(day: string): number {
  const [year, month, datePart] = day.split('-').map((part) => parseInt(part, 10));
  if (!year || !month || !datePart) return 0;
  return new Date(year, month - 1, datePart).getTime();
}

function completedShareDays(): string[] {
  const days: string[] = [];
  for (let offset = 1; offset <= AGENCY_SHARE_VALIDITY_DAYS; offset += 1) {
    days.push(rewardDayKey(new Date(Date.now() - offset * AGENCY_SHARE_DAY_MS)));
  }
  return days;
}

async function fetchAgencyShareDeposits(
  uid: string,
  threshold: number
): Promise<DepositRecord[]> {
  const snap = await getDocs(
    query(
      collection(db, 'depositVaults', uid, 'records'),
      orderBy('createdAt', 'desc'),
      limit(50)
    )
  );
  return snap.docs
    .map(mapDepositRecord)
    .filter((record) => record.amount >= threshold && !record.principalWithdrawn);
}

function addAgencyShareMember(
  members: Map<string, AgencyShareMember>,
  ownerUid: string,
  data: DocumentData
) {
  const uid = String(data.uid ?? '');
  if (!uid || uid === ownerUid || members.has(uid)) return;
  const isHost = Boolean(data.isHost ?? false);
  const accountType = String(data.accountType ?? 'USER');
  const role: AgencyShareSourceRole | null = isHost
    ? 'HOST'
    : accountType === 'AGENT'
      ? 'AGENT'
      : null;
  if (!role) return;
  members.set(uid, {
    uid,
    role,
    username: String(data.username ?? ''),
    displayName: String(data.displayName ?? data.username ?? ''),
  });
}

async function resolveAgencyShareMembers(
  owner: UserProfile,
  role: AgencyShareRole
): Promise<AgencyShareMember[]> {
  const members = new Map<string, AgencyShareMember>();
  const usersRef = collection(db, 'users');

  const loadByField = async (field: 'superAgentUid' | 'hostAgencyUid', uid: string) => {
    const snap = await getDocs(
      query(
        usersRef,
        where(field, '==', uid),
        where('isSuspended', '==', false),
        limit(200)
      )
    );
    snap.docs.forEach((memberSnap) =>
      addAgencyShareMember(members, owner.uid, memberSnap.data())
    );
  };

  await loadByField('superAgentUid', owner.uid);
  await loadByField('hostAgencyUid', owner.uid);

  if (role === 'SUPER_AGENT') {
    // Hosts under the Super Agent's own Agents share with the Super Agent too.
    const agentUids = Array.from(members.values())
      .filter((member) => member.role === 'AGENT')
      .map((member) => member.uid);
    for (const agentUid of agentUids) {
      await loadByField('hostAgencyUid', agentUid);
    }
  } else {
    // An Agent only shares their Hosts, never other Agents.
    for (const [uid, member] of members) {
      if (member.role !== 'HOST') members.delete(uid);
    }
  }

  return Array.from(members.values()).filter(
    (member) => member.role === 'HOST' || role === 'SUPER_AGENT'
  );
}

export async function fetchAgencyRewardShareStatus(
  owner: UserProfile | null
): Promise<AgencyRewardShareStatus> {
  const role = agencyShareRole(owner);
  const empty: AgencyRewardShareStatus = {
    role,
    threshold: role ? agencyShareThreshold(role) : 0,
    qualifies: false,
    depositRecordId: '',
    windowStartMs: 0,
    windowEndMs: 0,
    daysRemaining: 0,
  };
  if (!owner || !role) return empty;

  try {
    const threshold = agencyShareThreshold(role);
    const deposits = await fetchAgencyShareDeposits(owner.uid, threshold);
    const now = Date.now();
    const active =
      deposits.find(
        (record) => now >= record.createdAt && now < agencyShareWindowEnd(record)
      ) ?? null;
    if (!active) return empty;
    return {
      role,
      threshold,
      qualifies: true,
      depositRecordId: active.recordId,
      windowStartMs: active.createdAt,
      windowEndMs: agencyShareWindowEnd(active),
      daysRemaining: Math.max(
        0,
        Math.ceil((agencyShareWindowEnd(active) - now) / AGENCY_SHARE_DAY_MS)
      ),
    };
  } catch {
    return empty;
  }
}

export async function settleAgencyDailyRewardShares(
  owner: UserProfile | null
): Promise<AgencyRewardShareSettlement> {
  const role = agencyShareRole(owner);
  const empty: AgencyRewardShareSettlement = {
    settled: false,
    reason: 'not-agency',
    payoutCount: 0,
    paidCoins: 0,
    paidDiamonds: 0,
    memberCount: 0,
    windowStartMs: 0,
    windowEndMs: 0,
  };
  if (!owner || !role) return empty;

  let deposits: DepositRecord[];
  try {
    deposits = await fetchAgencyShareDeposits(owner.uid, agencyShareThreshold(role));
  } catch {
    return { ...empty, reason: 'deposit-read-failed' };
  }
  if (!deposits.length) return { ...empty, reason: 'no-qualifying-deposit' };

  let members: AgencyShareMember[];
  try {
    members = await resolveAgencyShareMembers(owner, role);
  } catch {
    return { ...empty, reason: 'member-read-failed' };
  }
  if (!members.length) return { ...empty, reason: 'no-members' };

  let paidCoins = 0;
  let paidDiamonds = 0;
  let payoutCount = 0;
  let windowStartMs = 0;
  let windowEndMs = 0;
  const walletRef = doc(db, 'wallets', owner.uid);

  for (const day of completedShareDays()) {
    const dayStartMs = localDayStartMs(day);
    if (!dayStartMs) continue;
    const dayEndMs = dayStartMs + AGENCY_SHARE_DAY_MS;
    const deposit = deposits.find((record) => {
      const recordEnd = agencyShareWindowEnd(record);
      return dayStartMs >= record.createdAt && dayEndMs <= recordEnd;
    });
    if (!deposit) continue;
    windowStartMs = deposit.createdAt;
    windowEndMs = agencyShareWindowEnd(deposit);

    for (const member of members) {
      const shareId = `${REWARD_SHARE_PREFIX}${owner.uid}_${member.uid}_${day}`;
      const shareRef = doc(db, 'rewardShares', shareId);
      const earningsRef = doc(db, 'dailyRewardEarnings', `${member.uid}_${day}`);
      const coinLedgerRef = doc(db, 'wallets', owner.uid, 'transactions', `${shareId}_c`);
      const diamondLedgerRef = doc(db, 'wallets', owner.uid, 'transactions', `${shareId}_d`);

      let baseCoin = 0;
      let baseDiamond = 0;
      try {
        const [earnSnap, shareSnap] = await Promise.all([
          getDoc(earningsRef),
          getDoc(shareRef),
        ]);
        if (shareSnap.exists() || !earnSnap.exists()) continue;
        baseCoin = Number(earnSnap.data().coinReward ?? 0);
        baseDiamond = Number(earnSnap.data().diamondReward ?? 0);
      } catch {
        continue;
      }
      if (baseCoin + baseDiamond <= 0) continue;

      const shareCoin = Math.floor((baseCoin * AGENCY_SHARE_PERCENT) / 100);
      const shareDiamond = Math.floor((baseDiamond * AGENCY_SHARE_PERCENT) / 100);
      if (shareCoin + shareDiamond <= 0) continue;

      try {
        let wrote = false;
        await runTransaction(db, async (tx) => {
          const [freshShare, walletSnap] = await Promise.all([
            tx.get(shareRef),
            tx.get(walletRef),
          ]);
          if (freshShare.exists()) return;
          if (!walletSnap.exists()) throw new Error('Wallet not initialized.');

          const coins = Number(walletSnap.data().coinBalance ?? 0);
          const diamonds = Number(walletSnap.data().diamondBalance ?? 0);

          tx.set(shareRef, {
            shareId,
            recipientUid: owner.uid,
            recipientRole: role,
            sourceUid: member.uid,
            sourceRole: member.role,
            sourceUsername: clampStr(member.username || member.uid.slice(0, 8), 32),
            sourceDisplayName: clampStr(member.displayName || member.username || 'Member', 64),
            day,
            baseCoin,
            baseDiamond,
            shareCoin,
            shareDiamond,
            depositRecordId: deposit.recordId,
            windowStartMillis: deposit.createdAt,
            windowEndMillis: windowEndMs,
            createdAt: serverTimestamp(),
          });
          tx.update(walletRef, {
            coinBalance: coins + shareCoin,
            diamondBalance: diamonds + shareDiamond,
            lastRewardShareId: shareId,
            updatedAt: serverTimestamp(),
          });
          if (shareCoin > 0) {
            tx.set(coinLedgerRef, {
              transactionId: `${shareId}_c`,
              uid: owner.uid,
              currency: 'COIN',
              direction: 'CREDIT',
              amount: shareCoin,
              reason: clampStr(
                `Agency reward share (10%): ${member.role} @${member.username} ${day}`,
                160
              ),
              counterparty: clampStr(`@${member.username}`, 64),
              idempotencyKey: shareId,
              createdAt: serverTimestamp(),
            });
          }
          if (shareDiamond > 0) {
            tx.set(diamondLedgerRef, {
              transactionId: `${shareId}_d`,
              uid: owner.uid,
              currency: 'DIAMOND',
              direction: 'CREDIT',
              amount: shareDiamond,
              reason: clampStr(
                `Agency reward share (10%): ${member.role} @${member.username} ${day}`,
                160
              ),
              counterparty: clampStr(`@${member.username}`, 64),
              idempotencyKey: shareId,
              createdAt: serverTimestamp(),
            });
          }
          wrote = true;
        });
        if (wrote) {
          paidCoins += shareCoin;
          paidDiamonds += shareDiamond;
          payoutCount += 1;
        }
      } catch (error) {
        if (error instanceof Error && error.message.startsWith('Wallet not')) {
          return {
            settled: payoutCount > 0,
            reason: 'wallet-missing',
            payoutCount,
            paidCoins,
            paidDiamonds,
            memberCount: members.length,
            windowStartMs,
            windowEndMs,
          };
        }
        // Any other failure only skips this share; the remaining shares retry
        // on the next settlement run.
      }
    }
  }

  return {
    settled: payoutCount > 0,
    reason: payoutCount > 0 ? 'settled' : 'nothing-to-settle',
    payoutCount,
    paidCoins,
    paidDiamonds,
    memberCount: members.length,
    windowStartMs,
    windowEndMs,
  };
}

export function subscribeAgencyRewardSharePayouts(
  uid: string,
  onData: (payouts: AgencyRewardSharePayout[]) => void
): Unsubscribe {
  return listenWithRetry(
    query(
      collection(db, 'rewardShares'),
      where('recipientUid', '==', uid),
      limit(200)
    ),
    (snap) => {
      const list: AgencyRewardSharePayout[] = snap.docs.map((shareSnap) => {
        const d = shareSnap.data();
        return {
          shareId: shareSnap.id,
          recipientUid: String(d.recipientUid ?? ''),
          recipientRole: (d.recipientRole as AgencyShareRole) ?? 'AGENT',
          sourceUid: String(d.sourceUid ?? ''),
          sourceRole: (d.sourceRole as AgencyShareSourceRole) ?? 'HOST',
          sourceUsername: String(d.sourceUsername ?? ''),
          sourceDisplayName: String(d.sourceDisplayName ?? ''),
          day: String(d.day ?? ''),
          baseCoin: Number(d.baseCoin ?? 0),
          baseDiamond: Number(d.baseDiamond ?? 0),
          shareCoin: Number(d.shareCoin ?? 0),
          shareDiamond: Number(d.shareDiamond ?? 0),
          depositRecordId: String(d.depositRecordId ?? ''),
          windowStartMs: Number(d.windowStartMillis ?? 0),
          windowEndMs: Number(d.windowEndMillis ?? 0),
          timestampLabel: formatTimestamp(d.createdAt),
          createdAtMs: tsToMs(d.createdAt),
        };
      });
      list.sort((a, b) => b.createdAtMs - a.createdAtMs);
      onData(list.slice(0, 60));
    },
    () => onData([])
  );
}


