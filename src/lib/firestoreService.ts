import {
  collection,
  deleteDoc,
  doc,
  getDoc,
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
import {
  AccountPromotionRecord,
  AgencyCommissionStoryRecord,
  AgencyMemberRecord,
  Conversation,
  DirectMessage,
  GenderOption,
  GiftCatalogItem,
  GuestSeat,
  JoinRequest,
  LiveRoom,
  ReportRecord,
  RoomCategory,
  RoomComment,
  RoomMode,
  UserProfile,
  WalletTransaction,
} from '../types/app';

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
export const SUPER_AGENT_PLATFORM_ID = '111112';
export const USER_PLATFORM_ID_START = 112201;

// The BD Agent is the single provisioned SUPER_AGENT account; promoted super agents keep the standard role.
export function isBdAgentProfile(user: UserProfile | null | undefined): boolean {
  return (
    user?.accountType === 'SUPER_AGENT' &&
    user.platformId === SUPER_AGENT_PLATFORM_ID
  );
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

export async function fetchUserProfile(uid: string): Promise<UserProfile | null> {
  const path = `users/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return null;
    const d = snap.data();
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
    bio: 'New creator on AddaBuzz Live.',
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
    diamondBalance: 0,
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
    displayName: string;
    bio: string;
    country: string;
    gender: GenderOption;
    showPresence: boolean;
    avatarUrl?: string;
    coverUrl?: string;
  }
): Promise<void> {
  const path = `users/${uid}`;
  try {
    const payload: Record<string, unknown> = {
      displayName: clampStr(updates.displayName, 64),
      bio: clampStr(updates.bio, 300),
      country: clampStr(updates.country, 64),
      gender: updates.gender,
      showPresence: updates.showPresence,
      updatedAt: serverTimestamp(),
    };
    if (updates.avatarUrl !== undefined) payload.avatarUrl = updates.avatarUrl;
    if (updates.coverUrl !== undefined) payload.coverUrl = updates.coverUrl;
    await updateDoc(doc(db, 'users', uid), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export function subscribeFollowerUids(
  uid: string,
  onUids: (uids: string[]) => void
): Unsubscribe {
  return onSnapshot(
    query(collection(db, 'follows'), where('targetUid', '==', uid), limit(100)),
    (snap) => onUids(snap.docs.map((d) => String(d.data().followerUid))),
    (error) => handleFirestoreError(error, OperationType.LIST, 'follows')
  );
}

export async function incrementProfileVisitors(uid: string): Promise<void> {
  await updateDoc(doc(db, 'users', uid), {
    visitorsCount: increment(1),
    updatedAt: serverTimestamp(),
  });
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
  return onSnapshot(
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
  return onSnapshot(
    q,
    (snapshot) => {
      const list: LiveRoom[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        const createdAtMs =
          d.createdAt instanceof Timestamp ? d.createdAt.toMillis() : Date.now();
        const durationSeconds = Math.max(
          0,
          Math.floor((Date.now() - createdAtMs) / 1000)
        );
        return {
          roomId: String(d.roomId),
          title: String(d.title),
          description: String(d.description ?? ''),
          category: d.category,
          mode: d.mode,
          hostUid: String(d.hostUid),
          status: d.status === 'ENDED' ? 'ENDED' : 'LIVE',
          thumbnailUrl: d.thumbnailUrl ? String(d.thumbnailUrl) : undefined,
          fallbackGradient: String(
            d.fallbackGradient ??
              'linear-gradient(135deg, #3B0764 0%, #1D4ED8 100%)'
          ),
          viewerCount: Number(d.viewerCount ?? 1),
          startedAtLabel:
            durationSeconds < 60
              ? 'Just started'
              : `${Math.floor(durationSeconds / 60)}m live`,
          durationSeconds,
          lastHeartbeatMs:
            d.updatedAt instanceof Timestamp ? d.updatedAt.toMillis() : createdAtMs,
          isFeatured: Boolean(d.isFeatured ?? false),
          isPrivateFollowersOnly: Boolean(d.isPrivateFollowersOnly ?? false),
          seats: Array.from({ length: 8 }, (_, idx) => ({
            seatNumber: idx + 1,
            status: 'AVAILABLE' as const,
          })),
          joinRequests: [],
          comments: [],
        };
      });
      onData(list);
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

export function subscribeRoomDetails(
  roomId: string,
  callbacks: {
    onSeats: (seats: GuestSeat[]) => void;
    onJoinRequests: (requests: JoinRequest[]) => void;
    onMessages: (comments: RoomComment[]) => void;
  }
): () => void {
  const seatsQ = query(
    collection(db, 'liveRooms', roomId, 'seats'),
    where('seatNumber', '>=', 1),
    where('seatNumber', '<=', 8)
  );
  const unsubSeats = onSnapshot(
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
      const ordered = Array.from({ length: 8 }, (_, idx) => {
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
    ? onSnapshot(
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
    limit(100)
  );
  const unsubMessages = onSnapshot(
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
  payload: {
    title: string;
    description: string;
    category: Exclude<RoomCategory, 'All'>;
    mode: RoomMode;
    isPrivateFollowersOnly: boolean;
  }
): Promise<string> {
  const roomId = `room_${Date.now()}_${host.uid.slice(0, 6)}`;
  const batch = writeBatch(db);

  batch.set(doc(db, 'liveRooms', roomId), {
    roomId,
    hostUid: host.uid,
    title: clampStr(payload.title, 120),
    description: clampStr(payload.description, 400),
    category: payload.category,
    mode: payload.mode,
    status: 'LIVE',
    viewerCount: 1,
    isPrivateFollowersOnly: payload.isPrivateFollowersOnly,
    isFeatured: false,
    fallbackGradient: 'linear-gradient(135deg, #3B0764 0%, #1E3A8A 100%)',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  for (let i = 1; i <= 8; i++) {
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

export async function requestRoomSeatDoc(
  roomId: string,
  user: UserProfile,
  seatNumber: number
): Promise<void> {
  const reqId = `req_${user.uid.slice(0, 12)}_${seatNumber}`;
  const seatRef = doc(db, 'liveRooms', roomId, 'seats', `seat_${seatNumber}`);
  const reqRef = doc(db, 'liveRooms', roomId, 'joinRequests', reqId);

  try {
    await runTransaction(db, async (tx) => {
      const seatSnap = await tx.get(seatRef);
      if (!seatSnap.exists()) throw new Error('Seat not found.');
      const seatData = seatSnap.data();
      if (seatData.status !== 'AVAILABLE') {
        throw new Error(`Seat ${seatNumber} is no longer available.`);
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
  request: JoinRequest
): Promise<number> {
  const reqRef = doc(db, 'liveRooms', roomId, 'joinRequests', request.requestId);
  try {
    return await runTransaction(db, async (tx) => {
      const seatSnaps = await Promise.all(
        Array.from({ length: 8 }, (_, idx) =>
          tx.get(doc(db, 'liveRooms', roomId, 'seats', `seat_${idx + 1}`))
        )
      );
      const occupiedCount = seatSnaps.filter(
        (s) => s.exists() && s.data().status === 'OCCUPIED'
      ).length;
      if (occupiedCount >= 8) {
        throw new Error('Maximum 8 guest seats are already occupied.');
      }

      const preferred = seatSnaps.find(
        (s) =>
          s.exists() &&
          s.data().seatNumber === request.preferredSeatNumber &&
          (s.data().status === 'AVAILABLE' || s.data().status === 'REQUESTED')
      );
      const fallback = seatSnaps.find(
        (s) =>
          s.exists() &&
          (s.data().status === 'AVAILABLE' || s.data().status === 'REQUESTED')
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
  request: JoinRequest
): Promise<void> {
  const reqRef = doc(db, 'liveRooms', roomId, 'joinRequests', request.requestId);
  try {
    await runTransaction(db, async (tx) => {
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

export function subscribeWalletData(
  uid: string,
  onWallet: (coins: number, diamonds: number, tradingCoins: number) => void,
  onTransactions: (txs: WalletTransaction[]) => void
): () => void {
  const unsubWallet = onSnapshot(
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

  const unsubTxs = onSnapshot(
    query(collection(db, 'wallets', uid, 'transactions'), orderBy('createdAt', 'desc'), limit(60)),
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

  return () => {
    unsubWallet();
    unsubTxs();
  };
}

export async function sendVirtualGiftTransaction(
  roomId: string,
  sender: UserProfile,
  hostUid: string | undefined,
  hostUsername: string,
  gift: GiftCatalogItem
): Promise<void> {
  if (hostUid && sender.uid === hostUid) {
    throw new Error('You cannot send a gift to yourself.');
  }

  const walletRef = doc(db, 'wallets', sender.uid);
  const hostWalletRef = hostUid ? doc(db, 'wallets', hostUid) : null;
  const txId = `tx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const hostTxId = `tx_h_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const txRef = doc(db, 'wallets', sender.uid, 'transactions', txId);
  const msgId = `msg_gift_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const msgRef = doc(db, 'liveRooms', roomId, 'messages', msgId);
  const idempotencyKey = `gift_${gift.giftId}_${Date.now().toString(36)}`;

  // Host receives diamonds (30% less silently)
  const hostDiamondsToAdd = Math.floor(gift.price * 0.70);

  try {
    await runTransaction(db, async (tx) => {
      const [walletSnap, hostWalletSnap] = await Promise.all([
        tx.get(walletRef),
        hostWalletRef ? tx.get(hostWalletRef) : Promise.resolve(null),
      ]);

      if (!walletSnap.exists()) {
        throw new Error('Wallet not initialized.');
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

      tx.update(walletRef, {
        coinBalance: gift.currency === 'COIN' ? coins - gift.price : coins,
        diamondBalance: gift.currency === 'DIAMOND' ? diamonds - gift.price : diamonds,
        updatedAt: serverTimestamp(),
      });

      tx.set(txRef, {
        transactionId: txId,
        uid: sender.uid,
        currency: gift.currency,
        direction: 'DEBIT',
        amount: gift.price,
        reason: clampStr(`Sent ${gift.name} to @${hostUsername}`, 160),
        counterparty: clampStr(`@${hostUsername}`, 64),
        idempotencyKey,
        createdAt: serverTimestamp(),
      });

      // Credit host with diamonds if host wallet exists and sender is not host
      if (hostWalletRef && hostWalletSnap && hostWalletSnap.exists() && sender.uid !== hostUid && hostDiamondsToAdd > 0) {
        const curHostDiamonds = Number(hostWalletSnap.data().diamondBalance ?? 0);
        tx.update(hostWalletRef, {
          diamondBalance: curHostDiamonds + hostDiamondsToAdd,
          updatedAt: serverTimestamp(),
        });
        tx.set(doc(db, 'wallets', hostUid!, 'transactions', hostTxId), {
          transactionId: hostTxId,
          uid: hostUid!,
          currency: 'DIAMOND',
          direction: 'CREDIT',
          amount: hostDiamondsToAdd,
          reason: clampStr(`Received ${gift.name} from @${sender.username}`, 160),
          counterparty: clampStr(`@${sender.username}`, 64),
          idempotencyKey: hostTxId,
          createdAt: serverTimestamp(),
        });

        // Check if host has an agency / super agent (10% commission for host, 5% if agent)
        const hostUserRef = doc(db, 'users', hostUid!);
        const hostUserSnap = await tx.get(hostUserRef);
        if (hostUserSnap.exists()) {
          const hostData = hostUserSnap.data();
          const superAgentUid = hostData.superAgentUid || hostData.hostAgencyUid;
          if (superAgentUid && superAgentUid !== hostUid) {
            const isAgent = hostData.accountType === 'AGENT';
            const commissionRate = isAgent ? 0.05 : 0.10; // 5% for agent, 10% for host
            const commissionAmount = Math.max(1, Math.floor(gift.price * commissionRate));
            
            const saWalletRef = doc(db, 'wallets', superAgentUid);
            const saWalletSnap = await tx.get(saWalletRef);
            if (saWalletSnap.exists()) {
              const saDiamonds = Number(saWalletSnap.data().diamondBalance ?? 0);
              tx.update(saWalletRef, {
                diamondBalance: saDiamonds + commissionAmount,
                updatedAt: serverTimestamp(),
              });
              const saTxId = `tx_sa_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
              tx.set(doc(db, 'wallets', superAgentUid, 'transactions', saTxId), {
                transactionId: saTxId,
                uid: superAgentUid,
                currency: 'DIAMOND',
                direction: 'CREDIT',
                amount: commissionAmount,
                reason: clampStr(`Agency Commission (${commissionRate * 100}%): @${hostUsername} received ${gift.name}`, 160),
                counterparty: clampStr(`@${hostUsername}`, 64),
                idempotencyKey: saTxId,
                createdAt: serverTimestamp(),
              });
            }

            // Save Commission Story record (30 days retention record)
            const storyId = `story_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
            const d = new Date();
            const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            tx.set(doc(db, 'agencyCommissions', storyId), {
              id: storyId,
              superAgentUid,
              memberUid: hostUid!,
              memberUsername: clampStr(hostUsername, 32),
              memberDisplayName: clampStr(hostData.displayName || hostUsername, 64),
              memberType: isAgent ? 'AGENT' : 'HOST',
              giftName: gift.name,
              giftPrice: gift.price,
              commissionRate,
              commissionAmount,
              dateKey,
              createdAt: serverTimestamp(),
              timestampMillis: Date.now(),
            });
          }
        }
      }

      tx.set(msgRef, {
        id: msgId,
        roomId,
        uid: sender.uid,
        username: clampStr(sender.username, 32),
        displayName: clampStr(sender.displayName, 64),
        accountType: sender.accountType,
        text: `Sent ${gift.name} (${gift.price} ${
          gift.currency === 'COIN' ? 'Coins' : 'Diamonds'
        })!`,
        isGiftEvent: true,
        giftId: gift.giftId,
        giftName: gift.name,
        giftCurrency: gift.currency,
        giftAmount: gift.price,
        createdAt: serverTimestamp(),
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Insufficient')) {
      throw error;
    }
    handleFirestoreError(error, OperationType.WRITE, `wallets/${sender.uid}`);
  }
}

function gameTxDocId(idempotencyKey: string): string {
  return idempotencyKey.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 120);
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
    return txId;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Insufficient')) throw error;
    if (error instanceof Error && error.message.startsWith('Wallet not')) throw error;
    handleFirestoreError(error, OperationType.WRITE, `wallets/${uid}`);
  }
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
    handleFirestoreError(error, OperationType.WRITE, `wallets/${uid}`);
  }
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
  return onSnapshot(
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
  return onSnapshot(
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
  return onSnapshot(
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
  return onSnapshot(
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
  return onSnapshot(
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
  amount: number
): Promise<void> {
  const value = Math.floor(amount);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error('Enter a valid coin amount.');
  }
  if (sender.uid === recipient.uid) {
    throw new Error('Cannot transfer to yourself.');
  }
  const senderRef = doc(db, 'wallets', sender.uid);
  const recipientRef = doc(db, 'wallets', recipient.uid);
  const stamp = Date.now();
  const rand = Math.random().toString(36).slice(2, 6);
  const debitId = `tx_${stamp}_${rand}`;
  const creditId = `tx_${stamp}_${rand}c`;
  const idempotencyKey = `transfer_${sender.uid}_${recipient.uid}_${stamp.toString(36)}`;

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

      // Prefer deducting from trading balance if available (e.g. for Agents / Super Agents)
      const useTradingDebit = senderTradingCoins >= value;
      if (!useTradingDebit && senderMainCoins < value) {
        throw new Error(`Insufficient Coins (need ${value.toLocaleString()}).`);
      }

      if (useTradingDebit) {
        tx.update(senderRef, {
          tradingCoinBalance: senderTradingCoins - value,
          updatedAt: serverTimestamp(),
        });
      } else {
        tx.update(senderRef, {
          coinBalance: senderMainCoins - value,
          updatedAt: serverTimestamp(),
        });
      }

      // BD Agent -> Super Agent -> Agent: Coins transfer adds to recipient Trading Balance!
      const isAgencyRecipient =
        recipient.accountType === 'SUPER_AGENT' ||
        recipient.accountType === 'AGENT' ||
        isBdAgentProfile(recipient);

      if (isAgencyRecipient) {
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

      tx.set(doc(db, 'wallets', sender.uid, 'transactions', debitId), {
        transactionId: debitId,
        uid: sender.uid,
        currency: 'COIN',
        direction: 'DEBIT',
        amount: value,
        reason: clampStr(`Transfer to @${recipient.username}`, 160),
        counterparty: clampStr(`@${recipient.username}`, 64),
        idempotencyKey,
        createdAt: serverTimestamp(),
      });
      tx.set(doc(db, 'wallets', recipient.uid, 'transactions', creditId), {
        transactionId: creditId,
        uid: recipient.uid,
        currency: 'COIN',
        direction: 'CREDIT',
        amount: value,
        reason: clampStr(`Transfer from @${sender.username} (${isAgencyRecipient ? 'Trading Balance' : 'Main Balance'})`, 160),
        counterparty: clampStr(`@${sender.username}`, 64),
        idempotencyKey,
        createdAt: serverTimestamp(),
      });
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
  if (sender.uid === targetAgent.uid) throw new Error('Cannot withdraw diamonds to yourself.');

  const isAgentOrSuper =
    targetAgent.accountType === 'AGENT' ||
    targetAgent.accountType === 'SUPER_AGENT' ||
    isBdAgentProfile(targetAgent);

  if (!isAgentOrSuper) {
    throw new Error('Diamonds can only be withdrawn to an official Agent or Super Agent.');
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
    handleFirestoreError(error, OperationType.WRITE, `wallets/${sender.uid}`);
  }
}

/**
 * Coins Exchange: Convert Coins Trading Balance into Main Balance
 * (8% less silently applied under the hood)
 */
export async function exchangeTradingCoinsToMainBalance(
  uid: string,
  tradingAmount: number
): Promise<{ debitedTrading: number; creditedMain: number }> {
  const value = Math.floor(tradingAmount);
  if (value <= 0) throw new Error('Enter a valid coin amount.');

  // 8% reduction applied silently
  const creditedMain = Math.floor(value * 0.92);
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

export function subscribeFollowsAndBlocks(
  uid: string,
  onFollows: (uids: string[]) => void,
  onBlocks: (uids: string[]) => void
): () => void {
  const unsubFollows = onSnapshot(
    query(collection(db, 'follows'), where('followerUid', '==', uid), limit(100)),
    (snap) => {
      onFollows(snap.docs.map((d) => String(d.data().targetUid)));
    },
    (error) => handleFirestoreError(error, OperationType.LIST, 'follows')
  );

  const unsubBlocks = onSnapshot(
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
  return onSnapshot(
    q,
    (snap) => {
      const list: Conversation[] = snap.docs.map((docSnap) => {
        const d = docSnap.data();
        const members = Array.isArray(d.memberUids)
          ? (d.memberUids as string[])
          : [];
        const partner = members.find((m) => m !== uid) ?? uid;
        return {
          conversationId: String(d.conversationId),
          participantUid: partner,
          unreadCount: 0,
          messages: d.lastMessageText
            ? [
                {
                  id: 'preview',
                  senderUid: partner,
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
    limit(100)
  );
  return onSnapshot(
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

export async function sendDirectMessageDoc(
  conversationId: string,
  memberUids: string[],
  senderUid: string,
  text: string
): Promise<void> {
  const msgId = `dm_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const batch = writeBatch(db);
  batch.set(doc(db, 'conversations', conversationId, 'messages', msgId), {
    id: msgId,
    senderUid,
    memberUids,
    text: clampStr(text, 1000),
    createdAt: serverTimestamp(),
  });
  batch.update(doc(db, 'conversations', conversationId), {
    lastMessageText: clampStr(text, 500),
    updatedAt: serverTimestamp(),
  });
  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.WRITE,
      `conversations/${conversationId}/messages/${msgId}`
    );
  }
}

export function subscribePromotions(
  onData: (records: AccountPromotionRecord[]) => void
): Unsubscribe {
  return onSnapshot(
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
  return onSnapshot(
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

  return onSnapshot(
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

  return onSnapshot(
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


