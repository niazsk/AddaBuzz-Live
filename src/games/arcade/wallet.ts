import { gameCoinCredit, gameCoinDebit } from '../../lib/firestoreService';

export const ARCADE_CHIPS = [10, 100, 1000, 5000] as const;

export function fmtCoins(n: number): string {
  return n.toLocaleString('en-US');
}

export function randomUnit(): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] / 4294967296;
}

export function randomInt(maxExclusive: number): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] % maxExclusive;
}

export function newRoundId(prefix: string): string {
  const buf = new Uint32Array(2);
  crypto.getRandomValues(buf);
  return `${prefix}${Date.now().toString(36)}${buf[0].toString(36)}${buf[1].toString(36)}`.toUpperCase();
}

interface PendingCredit {
  key: string;
  amount: number;
  reason: string;
}

const pendingKey = (uid: string) => `arcade_pending_${uid}`;

function readPending(uid: string): PendingCredit[] {
  try {
    const raw = localStorage.getItem(pendingKey(uid));
    return raw ? (JSON.parse(raw) as PendingCredit[]) : [];
  } catch {
    return [];
  }
}

function writePending(uid: string, list: PendingCredit[]) {
  try {
    localStorage.setItem(pendingKey(uid), JSON.stringify(list));
  } catch {
    // Storage blocked — the credit stays in this queue for the session.
  }
}

export async function arcadeDebit(
  uid: string,
  amount: number,
  reason: string,
  key: string
): Promise<void> {
  await gameCoinDebit(uid, amount, reason, key);
}

export function creditArcade(uid: string, amount: number, reason: string, key: string) {
  void gameCoinCredit(uid, amount, reason, key).catch(() => {
    const list = readPending(uid);
    if (!list.some((p) => p.key === key)) {
      list.push({ key, amount, reason });
      writePending(uid, list);
    }
  });
}

export async function flushArcadeCredits(uid: string): Promise<void> {
  const list = readPending(uid);
  if (!list.length) return;
  const remaining: PendingCredit[] = [];
  for (const item of list) {
    try {
      await gameCoinCredit(uid, item.amount, item.reason, item.key);
    } catch {
      remaining.push(item);
    }
  }
  writePending(uid, remaining);
}

export function loadArcadeHistory<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

export function saveArcadeHistory<T>(key: string, list: T[]) {
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch {
    // ignore
  }
}
