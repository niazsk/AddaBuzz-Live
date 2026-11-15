import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  limit,
  onSnapshot,
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
import { INITIAL_ROOMS, INITIAL_USERS } from '../data/previewData';

export const ADMIN_BOOTSTRAP_EMAIL = 'niazskapp@gmail.com';
export const ADMIN_BOOTSTRAP_EMAILS = [
  'niazskapp@gmail.com',
  'fayselsk@gmail.com',
  'ranababu78@gmail.com',
];

export function isAdminBootstrapEmail(email?: string | null): boolean {
  if (!email) return false;
  return ADMIN_BOOTSTRAP_EMAILS.includes(email.trim().toLowerCase());
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
      followersCount: Number(d.followersCount ?? 0),
      followingCount: Number(d.followingCount ?? 0),
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

  const isBootstrappedAdmin =
    isAdminBootstrapEmail(firebaseUser.email) && firebaseUser.emailVerified;

  const platformNum = 100000 + Math.floor(Math.random() * 899999);
  const platformId = `AB-${platformNum}`;
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
    accountType: isBootstrappedAdmin ? 'SUPER_AGENT' : 'USER',
    avatarColor: '#6366F1',
    coverGradient: 'linear-gradient(135deg, #3B0764 0%, #1E3A8A 60%, #09090E 100%)',
    followersCount: 0,
    followingCount: 0,
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
  }
): Promise<void> {
  const path = `users/${uid}`;
  try {
    await updateDoc(doc(db, 'users', uid), {
      displayName: clampStr(updates.displayName, 64),
      bio: clampStr(updates.bio, 300),
      country: clampStr(updates.country, 64),
      gender: updates.gender,
      showPresence: updates.showPresence,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
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
          followersCount: Number(d.followersCount ?? 0),
          followingCount: Number(d.followingCount ?? 0),
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
  onWallet: (coins: number, diamonds: number) => void,
  onTransactions: (txs: WalletTransaction[]) => void
): () => void {
  const unsubWallet = onSnapshot(
    doc(db, 'wallets', uid),
    (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        onWallet(Number(d.coinBalance ?? 0), Number(d.diamondBalance ?? 0));
      }
    },
    (error) => handleFirestoreError(error, OperationType.GET, `wallets/${uid}`)
  );

  const unsubTxs = onSnapshot(
    query(collection(db, 'wallets', uid, 'transactions'), limit(60)),
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
  hostUsername: string,
  gift: GiftCatalogItem
): Promise<void> {
  const walletRef = doc(db, 'wallets', sender.uid);
  const txId = `tx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const txRef = doc(db, 'wallets', sender.uid, 'transactions', txId);
  const msgId = `msg_gift_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const msgRef = doc(db, 'liveRooms', roomId, 'messages', msgId);
  const idempotencyKey = `gift_${gift.giftId}_${Date.now().toString(36)}`;

  try {
    await runTransaction(db, async (tx) => {
      const walletSnap = await tx.get(walletRef);
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

export async function promoteUserToAgentDoc(
  actor: UserProfile,
  target: UserProfile
): Promise<void> {
  const promoId = `promo_${Date.now()}_${target.uid.slice(0, 8)}`;
  const batch = writeBatch(db);

  batch.update(doc(db, 'users', target.uid), {
    accountType: 'AGENT',
    updatedAt: serverTimestamp(),
  });

  batch.set(doc(db, 'accountPromotions', promoId), {
    promotionId: promoId,
    actorUid: actor.uid,
    actorUsername: clampStr(actor.username, 32),
    targetUid: target.uid,
    targetUsername: clampStr(target.username, 32),
    beforeType: 'USER',
    afterType: 'AGENT',
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

export async function seedStarterCommunityData(): Promise<void> {
  const batch = writeBatch(db);

  for (const user of INITIAL_USERS.slice(0, 6)) {
    batch.set(doc(db, 'users', user.uid), {
      uid: user.uid,
      platformId: user.platformId,
      username: user.username,
      displayName: user.displayName,
      bio: user.bio,
      country: user.country,
      gender: user.gender,
      accountType: user.accountType,
      avatarColor: user.avatarColor,
      coverGradient: user.coverGradient,
      followersCount: user.followersCount,
      followingCount: user.followingCount,
      isOnline: user.isOnline,
      showPresence: user.showPresence,
      lastActiveLabel: user.lastActiveLabel,
      isNewCreator: Boolean(user.isNewCreator),
      isSuspended: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  for (const room of INITIAL_ROOMS.slice(0, 5)) {
    batch.set(doc(db, 'liveRooms', room.roomId), {
      roomId: room.roomId,
      hostUid: room.hostUid,
      title: room.title,
      description: room.description,
      category: room.category,
      mode: room.mode,
      status: 'LIVE',
      viewerCount: room.viewerCount,
      isPrivateFollowersOnly: false,
      isFeatured: Boolean(room.isFeatured),
      ...(room.thumbnailUrl ? { thumbnailUrl: room.thumbnailUrl } : {}),
      fallbackGradient: room.fallbackGradient,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    for (const seat of room.seats) {
      batch.set(
        doc(db, 'liveRooms', room.roomId, 'seats', `seat_${seat.seatNumber}`),
        {
          seatNumber: seat.seatNumber,
          status: seat.status,
          ...(seat.occupantUid ? { occupantUid: seat.occupantUid } : {}),
          ...(seat.occupantName ? { occupantName: seat.occupantName } : {}),
          ...(seat.occupantUsername ? { occupantUsername: seat.occupantUsername } : {}),
          ...(seat.occupantAvatarColor
            ? { occupantAvatarColor: seat.occupantAvatarColor }
            : {}),
          ...(typeof seat.isMuted === 'boolean' ? { isMuted: seat.isMuted } : {}),
          ...(typeof seat.isSpeaking === 'boolean'
            ? { isSpeaking: seat.isSpeaking }
            : {}),
          updatedAt: serverTimestamp(),
        }
      );
    }
  }

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'seedStarterCommunityData');
  }
}
