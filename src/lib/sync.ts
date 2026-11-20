import {
  onSnapshot,
  type DocumentReference,
  type DocumentSnapshot,
  type FirestoreError,
  type Query,
  type QuerySnapshot,
  type Unsubscribe,
} from 'firebase/firestore';

export type SyncPauseReason = 'quota' | 'network';

export interface SyncStatus {
  paused: boolean;
  reason: SyncPauseReason | null;
  retryAt: number;
}

let status: SyncStatus = { paused: false, reason: null, retryAt: 0 };
const watchers = new Set<(s: SyncStatus) => void>();
const pausedListeners = new Map<symbol, { reason: SyncPauseReason; retryAt: number }>();

export function subscribeSyncStatus(fn: (s: SyncStatus) => void): Unsubscribe {
  watchers.add(fn);
  fn(status);
  return () => {
    watchers.delete(fn);
  };
}

export function getSyncStatus(): SyncStatus {
  return status;
}

export function isSyncPaused(): boolean {
  return status.paused;
}

function publish() {
  if (pausedListeners.size === 0) {
    status = { paused: false, reason: null, retryAt: 0 };
  } else {
    let reason: SyncPauseReason = 'network';
    let retryAt = 0;
    pausedListeners.forEach((v) => {
      reason = v.reason;
      retryAt = Math.max(retryAt, v.retryAt);
    });
    status = { paused: true, reason, retryAt };
  }
  watchers.forEach((fn) => fn(status));
}

function pauseListener(id: symbol, reason: SyncPauseReason, retryAt: number) {
  pausedListeners.set(id, { reason, retryAt });
  publish();
}

function resumeListener(id: symbol) {
  if (pausedListeners.delete(id)) publish();
}

export function classifySyncError(error: unknown): SyncPauseReason | 'fatal' {
  const code = (error as FirestoreError | null)?.code ?? '';
  const msg = error instanceof Error ? error.message : String(error);
  if (code === 'resource-exhausted' || /quota limit exceeded/i.test(msg)) return 'quota';
  if (
    code === 'unavailable' ||
    code === 'deadline-exceeded' ||
    /client is offline|network error/i.test(msg)
  ) {
    return 'network';
  }
  return 'fatal';
}

export function listenWithRetry<T>(
  ref: DocumentReference<T>,
  onNext: (snap: DocumentSnapshot<T>) => void,
  onError?: (error: FirestoreError) => void
): Unsubscribe;
export function listenWithRetry<T>(
  query: Query<T>,
  onNext: (snap: QuerySnapshot<T>) => void,
  onError?: (error: FirestoreError) => void
): Unsubscribe;
export function listenWithRetry(
  target: DocumentReference<unknown> | Query<unknown>,
  onNext: (snap: never) => void,
  onError?: (error: FirestoreError) => void
): Unsubscribe {
  let unsub: Unsubscribe | null = null;
  let timer: number | null = null;
  let attempt = 0;
  let closed = false;
  const id = Symbol('sync-listener');

  const start = () => {
    if (closed) return;
    unsub = onSnapshot(
      target as Query<unknown>,
      (snap: QuerySnapshot<unknown>) => {
        attempt = 0;
        if (!snap.metadata.fromCache) resumeListener(id);
        onNext(snap as never);
      },
      (error: FirestoreError) => {
        const kind = classifySyncError(error);
        if (kind === 'fatal') {
          onError?.(error);
          return;
        }
        attempt += 1;
        const delay =
          Math.min(10000 * 2 ** (attempt - 1), 240000) +
          Math.floor(Math.random() * 4000);
        pauseListener(id, kind, Date.now() + delay);
        unsub?.();
        unsub = null;
        timer = window.setTimeout(start, delay);
      }
    );
  };

  start();
  return () => {
    closed = true;
    if (timer !== null) window.clearTimeout(timer);
    unsub?.();
    resumeListener(id);
  };
}