let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;

function ensure(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) {
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

export function unlockAudio() {
  ensure();
}

export function setMuted(m: boolean) {
  muted = m;
  if (master && ctx) master.gain.setTargetAtTime(m ? 0 : 0.5, ctx.currentTime, 0.02);
}

export function isMuted(): boolean {
  return muted;
}

function tone(
  freq: number,
  dur: number,
  opts: { type?: OscillatorType; gain?: number; delay?: number; slide?: number } = {}
) {
  const c = ensure();
  if (!c || !master || muted) return;
  const t0 = c.currentTime + (opts.delay ?? 0);
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = opts.type ?? 'sine';
  osc.frequency.setValueAtTime(freq, t0);
  if (opts.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, opts.slide), t0 + dur);
  const peak = opts.gain ?? 0.2;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

function noise(dur: number, opts: { gain?: number; delay?: number; freq?: number } = {}) {
  const c = ensure();
  if (!c || !master || muted) return;
  const t0 = c.currentTime + (opts.delay ?? 0);
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  src.buffer = buf;
  const filter = c.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = opts.freq ?? 2400;
  filter.Q.value = 0.9;
  const g = c.createGain();
  g.gain.value = opts.gain ?? 0.12;
  src.connect(filter).connect(g).connect(master);
  src.start(t0);
}

export const fmAudio = {
  chip() {
    tone(1900, 0.06, { type: 'triangle', gain: 0.16 });
    noise(0.04, { gain: 0.08, freq: 5200 });
  },
  place() {
    tone(520, 0.09, { type: 'triangle', gain: 0.2 });
    tone(780, 0.1, { type: 'sine', gain: 0.14, delay: 0.05 });
  },
  remove() {
    tone(430, 0.08, { type: 'triangle', gain: 0.14, slide: 260 });
  },
  confirm() {
    tone(523, 0.1, { type: 'triangle', gain: 0.2 });
    tone(659, 0.1, { type: 'triangle', gain: 0.2, delay: 0.08 });
    tone(784, 0.16, { type: 'triangle', gain: 0.22, delay: 0.16 });
    noise(0.12, { gain: 0.06, freq: 6000, delay: 0.16 });
  },
  reject() {
    tone(180, 0.18, { type: 'sawtooth', gain: 0.12, slide: 120 });
  },
  cancel() {
    tone(600, 0.09, { type: 'sine', gain: 0.16 });
    tone(400, 0.12, { type: 'sine', gain: 0.16, delay: 0.08 });
  },
  lock() {
    tone(140, 0.22, { type: 'sine', gain: 0.3, slide: 70 });
    noise(0.1, { gain: 0.1, freq: 900 });
  },
  urgent() {
    tone(1250, 0.05, { type: 'square', gain: 0.07 });
  },
  spinStart() {
    noise(0.5, { gain: 0.1, freq: 1600 });
    tone(220, 0.5, { type: 'sine', gain: 0.1, slide: 440 });
  },
  peg() {
    tone(2600, 0.03, { type: 'square', gain: 0.05 });
  },
  win() {
    const notes = [523, 659, 784, 1047, 1319];
    notes.forEach((f, i) => tone(f, 0.22, { type: 'triangle', gain: 0.22, delay: i * 0.09 }));
    notes.forEach((f, i) => tone(f * 2, 0.18, { type: 'sine', gain: 0.08, delay: 0.4 + i * 0.07 }));
    noise(0.5, { gain: 0.05, freq: 7000, delay: 0.35 });
  },
  bigWin() {
    const notes = [523, 659, 784, 1047, 784, 1047, 1319, 1568];
    notes.forEach((f, i) => tone(f, 0.24, { type: 'triangle', gain: 0.24, delay: i * 0.1 }));
    noise(0.7, { gain: 0.06, freq: 8000, delay: 0.5 });
  },
  lose() {
    tone(330, 0.16, { type: 'sine', gain: 0.14 });
    tone(262, 0.24, { type: 'sine', gain: 0.14, delay: 0.14 });
  },
  refund() {
    tone(440, 0.1, { type: 'sine', gain: 0.16 });
    tone(587, 0.12, { type: 'sine', gain: 0.16, delay: 0.09 });
  },
  roundStart() {
    tone(392, 0.1, { type: 'sine', gain: 0.12 });
    tone(523, 0.14, { type: 'sine', gain: 0.12, delay: 0.09 });
  },
};