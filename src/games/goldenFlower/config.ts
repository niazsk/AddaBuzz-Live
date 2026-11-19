export type GfSuit = 'S' | 'H' | 'D' | 'C';

export interface GfCard {
  id: string;
  suit: GfSuit;
  rank: number;
}

export const GF_CONFIG_VERSION = 'gf-v2';
export const GF_FIRST_SEQ = 2001;

// Shared round clock (Poppo-style continuous rounds).
export const GF_OPEN_MS = 20000;
export const GF_LOCK_MS = 3500;
export const GF_DRAW_MS = 7000;
export const GF_SETTLED_MS = 5000;
export const GF_VOID_MS = 20000;

// Chip rail — the only allowed stake values.
export const GF_CHIPS = [10, 100, 1000, 5000, 50000] as const;
export const GF_CHIP_LABEL: Record<number, string> = {
  10: '10',
  100: '100',
  1000: '1K',
  5000: '5K',
  50000: '50K',
};
export const GF_CHIP_STYLE: Record<number, { ring: string; face: string; text: string }> = {
  10: { ring: '#38bdf8', face: '#0c4a6e', text: '#e0f2fe' },
  100: { ring: '#34d399', face: '#064e3b', text: '#d1fae5' },
  1000: { ring: '#f472b6', face: '#831843', text: '#fce7f3' },
  5000: { ring: '#a78bfa', face: '#4c1d95', text: '#ede9fe' },
  50000: { ring: '#fbbf24', face: '#78350f', text: '#fef3c7' },
};

// Winning seat pays x2.98 (fair 3.0 minus the disclosed house edge).
export const GF_PAYOUT_NUM = 298;
export const GF_PAYOUT_DEN = 100;
export const GF_MAX_PAYOUT = 149000; // 50,000 x 2.98
export function payoutFor(stake: number): number {
  return Math.floor((stake * GF_PAYOUT_NUM) / GF_PAYOUT_DEN);
}

export interface GfSeatInfo {
  seat: number;
  letter: string;
  dealer: string;
  image: string;
  color: string;
}

export const GF_SEATS: GfSeatInfo[] = [
  { seat: 0, letter: 'A', dealer: 'Arif', image: '/images/goldenFlower/dealer-arif.jpg', color: '#38bdf8' },
  { seat: 1, letter: 'B', dealer: 'Meera', image: '/images/goldenFlower/dealer-meera.jpg', color: '#f472b6' },
  { seat: 2, letter: 'C', dealer: 'Riya', image: '/images/goldenFlower/dealer-red.jpg', color: '#fbbf24' },
];

export const SUIT_SYMBOL: Record<GfSuit, string> = { S: '♠', H: '♥', D: '♦', C: '♣' };
export const SUIT_NAME: Record<GfSuit, string> = { S: 'Spades', H: 'Hearts', D: 'Diamonds', C: 'Clubs' };
export const RANK_LABEL: Record<number, string> = {
  2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10',
  11: 'J', 12: 'Q', 13: 'K', 14: 'A',
};

export const HAND_RANKINGS = [
  { cat: 1, name: 'Trail / Three of a Kind', def: 'Three cards of the same rank' },
  { cat: 2, name: 'Pure Sequence', def: 'Three consecutive ranks, all same suit' },
  { cat: 3, name: 'Sequence', def: 'Three consecutive ranks, mixed suits' },
  { cat: 4, name: 'Color / Flush', def: 'Same suit, not consecutive' },
  { cat: 5, name: 'Pair', def: 'Two cards of the same rank' },
  { cat: 6, name: 'High Card', def: 'None of the above' },
];

export function createDeck(): GfCard[] {
  const deck: GfCard[] = [];
  (['S', 'H', 'D', 'C'] as GfSuit[]).forEach((suit) => {
    for (let rank = 2; rank <= 14; rank++) {
      deck.push({ id: `${rank}${suit}`, suit, rank });
    }
  });
  return deck;
}

export function cryptoShuffle<T>(items: T[]): T[] {
  const out = [...items];
  const buf = new Uint32Array(out.length);
  crypto.getRandomValues(buf);
  for (let i = out.length - 1; i > 0; i--) {
    const j = buf[i] % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export interface HandEval {
  cat: number;
  name: string;
  tb: number[];
}

export function evaluateHand(cards: GfCard[]): HandEval {
  if (cards.length !== 3) throw new Error('Hand must have exactly 3 cards');
  const vals = cards.map((c) => c.rank).sort((a, b) => a - b);
  const flush = cards.every((c) => c.suit === cards[0].suit);
  const straight = vals[2] - vals[1] === 1 && vals[1] - vals[0] === 1;
  const wheel = vals[0] === 2 && vals[1] === 3 && vals[2] === 14;
  const seqHigh = wheel ? 3 : vals[2];

  const counts = new Map<number, number>();
  vals.forEach((v) => counts.set(v, (counts.get(v) ?? 0) + 1));
  const trip = [...counts.entries()].find(([, n]) => n === 3);
  const pair = [...counts.entries()].find(([, n]) => n === 2);

  if (trip) return { cat: 1, name: HAND_RANKINGS[0].name, tb: [trip[0]] };
  if (straight || wheel) {
    return flush
      ? { cat: 2, name: HAND_RANKINGS[1].name, tb: [seqHigh] }
      : { cat: 3, name: HAND_RANKINGS[2].name, tb: [seqHigh] };
  }
  if (flush) return { cat: 4, name: HAND_RANKINGS[3].name, tb: [vals[2], vals[1], vals[0]] };
  if (pair) {
    const kicker = vals.find((v) => v !== pair[0]) ?? vals[0];
    return { cat: 5, name: HAND_RANKINGS[4].name, tb: [pair[0], kicker] };
  }
  return { cat: 6, name: HAND_RANKINGS[5].name, tb: [vals[2], vals[1], vals[0]] };
}

// Negative means hand `a` ranks better (lower category, then higher tie-break cards).
export function compareHands(a: HandEval, b: HandEval): number {
  if (a.cat !== b.cat) return a.cat - b.cat;
  for (let i = 0; i < Math.max(a.tb.length, b.tb.length); i++) {
    const d = (b.tb[i] ?? 0) - (a.tb[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

export function cardLabel(c: GfCard): string {
  return `${RANK_LABEL[c.rank]}${SUIT_SYMBOL[c.suit]}`;
}

export function formatCoins(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}

export const GF_RULES_FLOW = [
  'One shared round for every player. Pick a chip (10 / 100 / 1K / 5K / 50K) and tap dealer seat A, B or C to bet — the stake is deducted from your Coins immediately.',
  'Betting stays open for the round clock. When it closes, each seat is dealt 3 cards from one shuffled deck.',
  'The seat with the best three-card hand wins. Every bet on the winning seat pays ×2.98; bets on the other two seats lose their stake.',
  'Pot shows the total stake on a seat from all players; Me shows your own stake. You can bet on several seats in the same round.',
  'Undo returns your most recent bet while betting is still open. If a round is voided, every accepted stake is refunded automatically.',
  'Hand order: Trail > Pure Sequence > Sequence > Color > Pair > High Card. A-2-3 is the lowest sequence, Q-K-A the highest. Identical hands tie — the earliest seat (A before B before C) takes the round (disclosed, deterministic).',
  '×2.98 = fair ×3.0 minus a 0.67% house edge. The strip under the table shows recent winning seats.',
  'Coins are virtual platform points — no cash value, no purchases, no withdrawals.',
];