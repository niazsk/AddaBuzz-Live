import { INDIVIDUAL_FRAMES } from './individualFrames';

export interface ProfileFrame {
  id: string;
  name: string;
  price: number; // Coins; 0 = free default
  ring: string; // CSS border/box-shadow accent for the overlay
  image?: string; // optional PNG frame artwork (public URL) layered on top
  description: string;
}

// Stylish profile frames purchasable with Coins in the Store.
export const PROFILE_FRAMES: ProfileFrame[] = [
  { id: 'none', name: 'No Frame', price: 0, ring: 'transparent', description: 'Default, no frame' },
  {
    id: 'gold',
    name: 'Royal Gold',
    price: 500,
    ring: 'linear-gradient(135deg,#FDE68A,#F59E0B,#B45309)',
    description: 'Warm metallic gold ring',
  },
  {
    id: 'violet',
    name: 'Neon Violet',
    price: 800,
    ring: 'linear-gradient(135deg,#C4B5FD,#8B5CF6,#6D28D9)',
    description: 'Glowing violet ring',
  },
  {
    id: 'fuchsia',
    name: 'Sunset Fuchsia',
    price: 1000,
    ring: 'linear-gradient(135deg,#F0ABFC,#E879F9,#C026D3)',
    description: 'Pink–purple sunset ring',
  },
  {
    id: 'cyan',
    name: 'Aurora Cyan',
    price: 1200,
    ring: 'linear-gradient(135deg,#A5F3FC,#22D3EE,#0891B2)',
    description: 'Cool aurora cyan ring',
  },
  {
    id: 'rose',
    name: 'Rose Bloom',
    price: 1500,
    ring: 'linear-gradient(135deg,#FDA4AF,#F43F5E,#BE123C)',
    description: 'Rose petal ring',
  },
  {
    id: 'diamond',
    name: 'Diamond Sparkle',
    price: 3000,
    ring: 'linear-gradient(135deg,#FFFFFF,#BAE6FD,#E0E7FF)',
    description: 'Ice-white diamond ring',
  },
  {
    id: 'holo',
    name: 'Holographic',
    price: 5000,
    ring: 'conic-gradient(from 0deg,#F472B6,#C084FC,#60A5FA,#34D399,#FACC15,#F472B6)',
    description: 'Rainbow holographic ring',
  },

  ...INDIVIDUAL_FRAMES,
];

export const PROFILE_FRAME_BY_ID = new Map(PROFILE_FRAMES.map((f) => [f.id, f]));

export const FRAME_CHANGE_EVENT = 'addabuzz:profile-frame-changed';

const ownedKey = (uid: string) => `addabuzz.frames.owned.${uid}`;
const equippedKey = (uid: string) => `addabuzz.frames.equipped.${uid}`;

function readList(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function getOwnedFrames(uid: string): string[] {
  return Array.from(new Set(['none', ...readList(ownedKey(uid))]));
}

export function isFrameOwned(uid: string, frameId: string): boolean {
  return frameId === 'none' || getOwnedFrames(uid).includes(frameId);
}

export function addOwnedFrame(uid: string, frameId: string): void {
  const owned = getOwnedFrames(uid);
  if (!owned.includes(frameId)) {
    owned.push(frameId);
    try {
      localStorage.setItem(ownedKey(uid), JSON.stringify(owned));
    } catch {
      /* ignore quota */
    }
  }
}

export function getEquippedFrame(uid: string): string {
  try {
    return localStorage.getItem(equippedKey(uid)) || 'none';
  } catch {
    return 'none';
  }
}

export function setEquippedFrame(uid: string, frameId: string): void {
  try {
    localStorage.setItem(equippedKey(uid), frameId);
  } catch {
    /* ignore */
  }
  try {
    window.dispatchEvent(new CustomEvent(FRAME_CHANGE_EVENT, { detail: { uid, frameId } }));
  } catch {
    /* ignore */
  }
}
