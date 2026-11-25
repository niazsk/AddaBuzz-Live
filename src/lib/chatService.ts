import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  limit,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  increment,
  Unsubscribe,
} from 'firebase/firestore';
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage';
import { db, storage } from './firebase';
import { listenWithRetry } from './sync';
import {
  ChatSendPayload,
  ConversationPrefs,
  DirectMessage,
  FriendRequest,
  NotificationItem,
  PresenceRecord,
  UserProfile,
} from '../types/app';

export const PRESENCE_ONLINE_WINDOW_MS = 2 * 60 * 1000;
const PRESENCE_HEARTBEAT_MS = 60 * 1000;
const TYPING_FRESH_MS = 6000;

const toMillis = (value: unknown): number =>
  value instanceof Timestamp ? value.toMillis() : 0;

const formatClock = (value: unknown): string => {
  if (value instanceof Timestamp) {
    return value.toDate().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  return 'Just now';
};

export function formatRelativeMs(ms: number): string {
  if (!ms) return '';
  const diff = Date.now() - ms;
  if (diff < 60 * 1000) return 'now';
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / 3600000)}h`;
  if (diff < 7 * 24 * 60 * 60 * 1000) return `${Math.floor(diff / 86400000)}d`;
  return new Date(ms).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

/* ------------------------------------------------------------------ */
/* Presence                                                            */
/* ------------------------------------------------------------------ */

export function startPresenceHeartbeat(uid: string): () => void {
  const beat = () => {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      return;
    }
    void setDoc(doc(db, 'presence', uid), {
      uid,
      lastSeenMs: Date.now(),
    }).catch(() => undefined);
  };

  beat();
  const timer = window.setInterval(beat, PRESENCE_HEARTBEAT_MS);
  const onVisible = () => {
    if (document.visibilityState === 'visible') beat();
  };
  const onHide = () => {
    void setDoc(doc(db, 'presence', uid), {
      uid,
      lastSeenMs: Date.now(),
    }).catch(() => undefined);
  };
  document.addEventListener('visibilitychange', onVisible);
  window.addEventListener('pagehide', onHide);

  return () => {
    window.clearInterval(timer);
    document.removeEventListener('visibilitychange', onVisible);
    window.removeEventListener('pagehide', onHide);
  };
}

export function subscribePresence(
  onData: (records: PresenceRecord[]) => void
): Unsubscribe {
  return listenWithRetry(
    query(collection(db, 'presence'), limit(200)),
    (snap) =>
      onData(
        snap.docs.map((d) => ({
          uid: String(d.data().uid),
          lastSeenMs: Number(d.data().lastSeenMs ?? 0),
        }))
      ),
    () => undefined
  );
}

export function isPresenceOnline(record: PresenceRecord | undefined): boolean {
  if (!record) return false;
  return Date.now() - record.lastSeenMs < PRESENCE_ONLINE_WINDOW_MS;
}

/* ------------------------------------------------------------------ */
/* Notifications                                                       */
/* ------------------------------------------------------------------ */

export interface NewNotificationInput {
  toUid: string;
  actor: Pick<UserProfile, 'uid' | 'username' | 'displayName'>;
  type: NotificationItem['type'];
  title: string;
  body: string;
  notificationId: string;
  targetId?: string;
}

export async function sendNotificationDoc(input: NewNotificationInput): Promise<void> {
  await setDoc(doc(db, 'notifications', input.toUid, 'items', input.notificationId), {
    type: input.type,
    title: input.title.slice(0, 120),
    body: input.body.slice(0, 500),
    isRead: false,
    actorUid: input.actor.uid,
    actorUsername: input.actor.username,
    createdAt: serverTimestamp(),
    ...(input.targetId ? { targetId: input.targetId } : {}),
  });
}

export function subscribeUserNotifications(
  uid: string,
  onData: (items: NotificationItem[]) => void
): Unsubscribe {
  return listenWithRetry(
    query(
      collection(db, 'notifications', uid, 'items'),
      limit(40)
    ),
    (snap) => {
      const items = snap.docs
        .map((d) => {
          const data = d.data();
          return {
            sortMs: toMillis(data.createdAt),
            item: {
              id: d.id,
              type: data.type,
              title: String(data.title ?? ''),
              body: String(data.body ?? ''),
              timestampLabel: formatClock(data.createdAt),
              isRead: Boolean(data.isRead ?? false),
            } as NotificationItem,
          };
        })
        .sort((a, b) => b.sortMs - a.sortMs)
        .map((x) => x.item);
      onData(items);
    },
    () => undefined
  );
}

export async function markNotificationReadDoc(
  uid: string,
  notificationId: string
): Promise<void> {
  await updateDoc(doc(db, 'notifications', uid, 'items', notificationId), {
    isRead: true,
  });
}

export async function markNotificationsReadDoc(
  uid: string,
  notificationIds: string[]
): Promise<void> {
  if (notificationIds.length === 0) return;
  const batch = writeBatch(db);
  notificationIds.forEach((id) => {
    batch.update(doc(db, 'notifications', uid, 'items', id), { isRead: true });
  });
  await batch.commit();
}

export async function sendLiveInviteDoc(
  toUid: string,
  room: { roomId: string; title: string },
  from: UserProfile
): Promise<void> {
  await sendNotificationDoc({
    toUid,
    actor: from,
    type: 'LIVE_INVITE',
    title: 'Live invitation',
    body: `${from.displayName} invited you to join "${room.title}".`,
    notificationId: `live_${room.roomId}_${from.uid}`,
    targetId: room.roomId,
  });
}

/* ------------------------------------------------------------------ */
/* Friend requests (friendship = mutual follow)                        */
/* ------------------------------------------------------------------ */

const friendRequestId = (fromUid: string, toUid: string) => `${fromUid}_${toUid}`;

export function subscribeFriendRequests(
  uid: string,
  onData: (requests: FriendRequest[]) => void
): Unsubscribe {
  return listenWithRetry(
    query(
      collection(db, 'friendRequests'),
      where('memberUids', 'array-contains', uid),
      limit(100)
    ),
    (snap) => {
      const list = snap.docs.map((d) => {
        const data = d.data();
        return {
          requestId: d.id,
          fromUid: String(data.fromUid),
          toUid: String(data.toUid),
          fromUsername: String(data.fromUsername ?? ''),
          fromDisplayName: String(data.fromDisplayName ?? ''),
          fromAvatarColor: String(data.fromAvatarColor ?? '#6366F1'),
          fromAvatarUrl: data.fromAvatarUrl ? String(data.fromAvatarUrl) : undefined,
          timestampLabel: formatClock(data.createdAt),
          createdAtMillis: toMillis(data.createdAt),
        } as FriendRequest;
      });
      onData(list);
    },
    () => onData([])
  );
}

export async function sendFriendRequestDoc(
  me: UserProfile,
  targetUid: string
): Promise<'SENT' | 'ACCEPTED'> {
  if (targetUid === me.uid) throw new Error('You cannot add yourself.');
  const memberUids = [me.uid, targetUid].sort();
  const requestId = friendRequestId(me.uid, targetUid);
  const reverseRef = doc(db, 'friendRequests', friendRequestId(targetUid, me.uid));

  const reverse = await getDoc(reverseRef).catch(() => null);
  if (reverse?.exists()) {
    // They already asked us — accept their request instead of stacking a new one.
    const batch = writeBatch(db);
    batch.delete(reverseRef);
    batch.delete(doc(db, 'friendRequests', requestId));
    batch.set(doc(db, 'follows', `${me.uid}_${targetUid}`), {
      followerUid: me.uid,
      targetUid,
      createdAt: serverTimestamp(),
    });
    batch.update(doc(db, 'users', targetUid), {
      followersCount: increment(1),
      updatedAt: serverTimestamp(),
    });
    await batch.commit();
    void sendNotificationDoc({
      toUid: targetUid,
      actor: me,
      type: 'FRIEND_ACCEPT',
      title: 'Friend request accepted',
      body: `${me.displayName} accepted your friend request.`,
      notificationId: `facc_${me.uid}_${targetUid}`,
    }).catch(() => undefined);
    return 'ACCEPTED';
  }

  const batch = writeBatch(db);
  batch.set(doc(db, 'friendRequests', requestId), {
    fromUid: me.uid,
    toUid: targetUid,
    memberUids,
    fromUsername: me.username,
    fromDisplayName: me.displayName,
    fromAvatarColor: me.avatarColor,
    ...(me.avatarUrl ? { fromAvatarUrl: me.avatarUrl } : {}),
    createdAt: serverTimestamp(),
  });
  // Sending a friend request also follows the person, so accepting only has
  // to create the reverse edge and the pair becomes mutual friends.
  batch.set(doc(db, 'follows', `${me.uid}_${targetUid}`), {
    followerUid: me.uid,
    targetUid,
    createdAt: serverTimestamp(),
  });
  batch.update(doc(db, 'users', targetUid), {
    followersCount: increment(1),
    updatedAt: serverTimestamp(),
  });
  await batch.commit();
  void sendNotificationDoc({
    toUid: targetUid,
    actor: me,
    type: 'FRIEND_REQUEST',
    title: 'New friend request',
    body: `${me.displayName} (@${me.username}) sent you a friend request.`,
    notificationId: `fr_${me.uid}_${targetUid}`,
  }).catch(() => undefined);
  return 'SENT';
}

export async function acceptFriendRequestDoc(
  request: FriendRequest,
  me: UserProfile
): Promise<void> {
  const batch = writeBatch(db);
  batch.delete(doc(db, 'friendRequests', request.requestId));
  batch.set(doc(db, 'follows', `${me.uid}_${request.fromUid}`), {
    followerUid: me.uid,
    targetUid: request.fromUid,
    createdAt: serverTimestamp(),
  });
  batch.update(doc(db, 'users', request.fromUid), {
    followersCount: increment(1),
    updatedAt: serverTimestamp(),
  });
  await batch.commit();
  void sendNotificationDoc({
    toUid: request.fromUid,
    actor: me,
    type: 'FRIEND_ACCEPT',
    title: 'Friend request accepted',
    body: `${me.displayName} (@${me.username}) accepted your friend request.`,
    notificationId: `facc_${me.uid}_${request.fromUid}`,
  }).catch(() => undefined);
}

export async function declineFriendRequestDoc(requestId: string): Promise<void> {
  await deleteDoc(doc(db, 'friendRequests', requestId));
}

/* ------------------------------------------------------------------ */
/* Conversation preferences, typing, read state                        */
/* ------------------------------------------------------------------ */

const prefId = (conversationId: string, uid: string) => `${conversationId}_${uid}`;

export function subscribeConversationPrefs(
  uid: string,
  onData: (prefs: ConversationPrefs[]) => void
): Unsubscribe {
  return listenWithRetry(
    query(
      collection(db, 'conversationPrefs'),
      where('uid', '==', uid),
      limit(80)
    ),
    (snap) =>
      onData(
        snap.docs.map((d) => {
          const data = d.data();
          return {
            conversationId: String(data.conversationId),
            uid,
            pinned: Boolean(data.pinned ?? false),
            muted: Boolean(data.muted ?? false),
            archived: Boolean(data.archived ?? false),
            hidden: Boolean(data.hidden ?? false),
            clearedAtMs: Number(data.clearedAtMs ?? 0),
          } as ConversationPrefs;
        })
      ),
    () => onData([])
  );
}

export async function setConversationPrefDoc(
  conversationId: string,
  uid: string,
  patch: Partial<
    Pick<ConversationPrefs, 'pinned' | 'muted' | 'archived' | 'hidden' | 'clearedAtMs'>
  >
): Promise<void> {
  await setDoc(
    doc(db, 'conversationPrefs', prefId(conversationId, uid)),
    {
      conversationId,
      uid,
      updatedAt: serverTimestamp(),
      ...patch,
    },
    { merge: true }
  );
}

export async function markConversationReadDoc(
  conversationId: string,
  uid: string
): Promise<void> {
  await updateDoc(doc(db, 'conversations', conversationId), {
    [`readAt.${uid}`]: Date.now(),
    [`unreadCounts.${uid}`]: 0,
  });
}

export async function setTypingDoc(
  conversationId: string,
  uid: string,
  isTyping: boolean
): Promise<void> {
  const ref = doc(db, 'conversations', conversationId, 'typing', uid);
  try {
    if (isTyping) {
      await setDoc(ref, { uid, atMs: Date.now() });
    } else {
      await deleteDoc(ref);
    }
  } catch {
    // Typing state is best-effort and must never surface an error to the user.
  }
}

export function subscribePartnerTyping(
  conversationId: string,
  meUid: string,
  onTyping: (typingUid: string | null) => void
): Unsubscribe {
  return listenWithRetry(
    query(collection(db, 'conversations', conversationId, 'typing'), limit(2)),
    (snap) => {
      const now = Date.now();
      const partner = snap.docs
        .map((d) => ({
          uid: String(d.data().uid),
          atMs: Number(d.data().atMs ?? 0),
        }))
        .find((t) => t.uid !== meUid && now - t.atMs < TYPING_FRESH_MS);
      onTyping(partner?.uid ?? null);
    },
    () => onTyping(null)
  );
}

export async function deleteDirectMessageDoc(
  conversationId: string,
  messageId: string
): Promise<void> {
  await deleteDoc(doc(db, 'conversations', conversationId, 'messages', messageId));
}

/* ------------------------------------------------------------------ */
/* Media                                                               */
/* ------------------------------------------------------------------ */

const MAX_CHAT_FILE_BYTES = 8 * 1024 * 1024;

export async function uploadChatMedia(
  conversationId: string,
  uid: string,
  file: File
): Promise<{ url: string; name: string; size: number }> {
  if (file.size > MAX_CHAT_FILE_BYTES) {
    throw new Error('Files larger than 8 MB are not supported.');
  }
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);
  const path = `chatMedia/${conversationId}/${uid}/${Date.now()}_${safeName}`;
  const objectRef = storageRef(storage, path);
  await uploadBytes(objectRef, file, {
    contentType: file.type || 'application/octet-stream',
  });
  const url = await getDownloadURL(objectRef);
  return { url, name: file.name.slice(0, 80), size: file.size };
}

/* ------------------------------------------------------------------ */
/* Sending messages (extended, with legacy fallback)                   */
/* ------------------------------------------------------------------ */

export interface SendChatResult {
  message: DirectMessage;
  extended: boolean;
}

export async function sendChatMessageDoc(
  conversationId: string,
  memberUids: string[],
  sender: UserProfile,
  payload: ChatSendPayload
): Promise<SendChatResult> {
  const msgId = `dm_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const partnerUid = memberUids.find((uid) => uid !== sender.uid) ?? '';
  const text = payload.text.slice(0, 1000);
  const baseMessage: Record<string, unknown> = {
    id: msgId,
    senderUid: sender.uid,
    memberUids,
    text,
    createdAt: serverTimestamp(),
  };
  const extendedMessage: Record<string, unknown> = {
    ...baseMessage,
    createdAtMs: Date.now(),
    ...(payload.kind && payload.kind !== 'TEXT' ? { kind: payload.kind } : {}),
    ...(payload.mediaUrl ? { mediaUrl: payload.mediaUrl } : {}),
    ...(payload.mediaName ? { mediaName: payload.mediaName.slice(0, 120) } : {}),
    ...(payload.durationMs ? { durationMs: payload.durationMs } : {}),
    ...(payload.replyTo
      ? {
          replyToId: payload.replyTo.id,
          replySenderName: payload.replyTo.senderName.slice(0, 64),
          replyText: payload.replyTo.text.slice(0, 160),
        }
      : {}),
  };
  const baseConversation: Record<string, unknown> = {
    lastMessageText: text.slice(0, 500),
    updatedAt: serverTimestamp(),
  };
  const extendedConversation: Record<string, unknown> = {
    ...baseConversation,
    lastSenderUid: sender.uid,
    lastMessageAtMs: Date.now(),
  };

  const attempt = async (extended: boolean) => {
    const batch = writeBatch(db);
    batch.set(
      doc(db, 'conversations', conversationId, 'messages', msgId),
      extended ? extendedMessage : baseMessage
    );
    batch.update(
      doc(db, 'conversations', conversationId),
      extended
        ? {
            ...extendedConversation,
            ...(partnerUid ? { [`unreadCounts.${partnerUid}`]: increment(1) } : {}),
          }
        : baseConversation
    );
    await batch.commit();
  };

  let extended = true;
  try {
    await attempt(true);
  } catch {
    // Deployed rules may not know the newer message fields yet; retry with the
    // legacy shape so messaging never breaks while a rules update is pending.
    extended = false;
    await attempt(false);
  }

  if (partnerUid) {
    const preview =
      payload.kind === 'IMAGE'
        ? '📷 Photo'
        : payload.kind === 'VOICE'
          ? '🎤 Voice message'
          : payload.kind === 'FILE'
            ? `📎 ${payload.mediaName ?? 'File'}`
            : text;
    void sendNotificationDoc({
      toUid: partnerUid,
      actor: sender,
      type: 'MESSAGE',
      title: `New message from ${sender.displayName}`,
      body: preview.slice(0, 160),
      notificationId: `dm_${msgId}`,
      targetId: conversationId,
    }).catch(() => undefined);
  }

  return {
    extended,
    message: {
      id: msgId,
      senderUid: sender.uid,
      text,
      timestampLabel: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      createdAtMs: Date.now(),
      kind: payload.kind ?? 'TEXT',
      mediaUrl: payload.mediaUrl,
      mediaName: payload.mediaName,
      durationMs: payload.durationMs,
      replyTo: payload.replyTo,
    },
  };
}
