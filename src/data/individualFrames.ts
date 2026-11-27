import type { ProfileFrame } from './profileFrames';

// 91 individual artwork frames (13 rows x 7 cols), each a separate PNG in
// public/frames/individual/frame_RR_CC.png. Priced in Coins.
export const INDIVIDUAL_FRAMES: ProfileFrame[] = [];

const NAMES = [
  'Aurora', 'Royal', 'Neon', 'Sunset', 'Galaxy', 'Frost', 'Ember',
  'Mystic', 'Radiant', 'Celestial', 'Velvet', 'Phoenix', 'Opal',
];

for (let row = 1; row <= 13; row += 1) {
  for (let col = 1; col <= 7; col += 1) {
    const rr = String(row).padStart(2, '0');
    const cc = String(col).padStart(2, '0');
    const idx = (row - 1) * 7 + (col - 1);
    const name = `${NAMES[row - 1]} Frame ${col}`;
    // Simple escalating price tier.
    const price = 500 + (idx % 8) * 500 + Math.floor(idx / 8) * 250;
    INDIVIDUAL_FRAMES.push({
      id: `ind_${rr}_${cc}`,
      name,
      price,
      ring: 'transparent',
      image: `/frames/individual/frame_${rr}_${cc}.png`,
      description: `${name} — artwork photo frame`,
    });
  }
}
