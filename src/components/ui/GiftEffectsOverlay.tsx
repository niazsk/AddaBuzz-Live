import React, { useEffect, useRef } from 'react';
import { GiftCatalogItem } from '../../types/app';
import { GiftArtwork } from './GiftArtwork';

export interface GiftFx {
  key: string;
  gift: GiftCatalogItem;
  senderName: string;
  combo: number;
}

interface GiftEffectsOverlayProps {
  fx: GiftFx[];
  onExpire: (key: string) => void;
}

type ParticleKind = 'spark' | 'heart' | 'note' | 'confetti' | 'rocket' | 'orb' | 'ring';

interface Particle {
  kind: ParticleKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  ttl: number;
  size: number;
  color: string;
  rot: number;
  vr: number;
  grav: number;
  sway: number;
}

interface Emitter {
  until: number;
  next: number;
  every: number;
  kind: ParticleKind;
  colors: string[];
  origin: 'bottom' | 'top' | 'center';
  speed: number;
}

const CONFETTI_COLORS = ['#F59E0B', '#38BDF8', '#F472B6', '#A3E635', '#FFFFFF', '#FB7185'];
const GOLD = ['#FFD76A', '#FFB347', '#FFF3C4'];

const fxDuration = (gift: GiftCatalogItem) =>
  gift.price >= 1000 ? 5200 : gift.price >= 100 ? 3600 : 2400;

function hexToRgba(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

export const GiftEffectsOverlay: React.FC<GiftEffectsOverlayProps> = ({ fx, onExpire }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const emittersRef = useRef<Emitter[]>([]);
  const seenRef = useRef<Set<string>>(new Set());
  const timersRef = useRef<Map<string, number>>(new Map());
  const rafRef = useRef<number | null>(null);
  const fxCountRef = useRef(0);
  const ensureLoopRef = useRef<(() => void) | null>(null);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;
  fxCountRef.current = fx.length;

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const now = performance.now();
    let added = false;
    for (const item of fx) {
      if (seenRef.current.has(item.key)) continue;
      seenRef.current.add(item.key);
      added = true;
      const timer = window.setTimeout(() => {
        timersRef.current.delete(item.key);
        onExpireRef.current(item.key);
      }, fxDuration(item.gift));
      timersRef.current.set(item.key, timer);
      if (reduced) continue;

      const accent = item.gift.accentHex;
      const cinematic = item.gift.price >= 1000;
      const boost = Math.min(2.2, 1 + (item.combo - 1) * 0.25);
      const em = (
        kind: ParticleKind,
        ms: number,
        every: number,
        origin: Emitter['origin'],
        colors: string[],
        speed: number
      ) => emittersRef.current.push({ until: now + ms, next: now, every, kind, colors, origin, speed });

      switch (item.gift.effect) {
        case 'hearts':
          em('heart', 2000 * boost, 70, 'bottom', [accent, '#FF6FA5', '#FFB3C9'], 90);
          break;
        case 'fireworks':
          em('rocket', 2800 * boost, 420, 'bottom', [accent, '#FFD76A', '#7DD3FC', '#F472B6'], 320);
          break;
        case 'confetti':
          em('confetti', 2400 * boost, 26, 'top', CONFETTI_COLORS, 120);
          break;
        case 'notes':
          em('note', 2000 * boost, 110, 'bottom', [accent, '#FFFFFF', '#FFD76A'], 80);
          break;
        case 'glow':
          em('orb', 2400 * boost, 60, 'bottom', [accent, '#BFE3FF', '#FFE9A8'], 55);
          break;
        default:
          em('spark', 700, 24, 'center', [accent, '#FFFFFF', accent], 220);
      }
      if (cinematic) {
        em('spark', 2600, 30, 'top', GOLD, 150);
        em('ring', 60, 100, 'center', [accent], 1);
      }
    }
    for (const key of [...seenRef.current]) {
      if (!timersRef.current.has(key)) seenRef.current.delete(key);
    }
    if (added) ensureLoopRef.current?.();
  }, [fx]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.max(1, Math.floor(wrap.clientWidth * dpr));
      canvas.height = Math.max(1, Math.floor(wrap.clientHeight * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    const spawn = (e: Emitter, w: number, h: number) => {
      const color = e.colors[Math.floor(Math.random() * e.colors.length)];
      const p: Particle = {
        kind: e.kind,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        life: 0,
        ttl: 1,
        size: 8,
        color,
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 6,
        grav: 0,
        sway: Math.random() * Math.PI * 2,
      };
      if (e.origin === 'bottom') {
        p.x = w * (0.12 + Math.random() * 0.76);
        p.y = h + 14;
        p.vy = -e.speed * (0.7 + Math.random() * 0.6);
        p.vx = (Math.random() - 0.5) * 40;
      } else if (e.origin === 'top') {
        p.x = Math.random() * w;
        p.y = -14;
        p.vy = e.speed * (0.6 + Math.random() * 0.8);
        p.vx = (Math.random() - 0.5) * 60;
      } else {
        p.x = w / 2;
        p.y = h * 0.62;
        const a = Math.random() * Math.PI * 2;
        const s = e.speed * (0.35 + Math.random() * 0.85);
        p.vx = Math.cos(a) * s;
        p.vy = Math.sin(a) * s;
      }
      switch (e.kind) {
        case 'heart':
          p.ttl = 2.4 + Math.random();
          p.size = 10 + Math.random() * 14;
          p.grav = -18;
          break;
        case 'note':
          p.ttl = 2.2 + Math.random();
          p.size = 16 + Math.random() * 14;
          p.grav = -12;
          break;
        case 'confetti':
          p.ttl = 3.2 + Math.random() * 1.4;
          p.size = 6 + Math.random() * 7;
          p.grav = 150;
          p.vr = (Math.random() - 0.5) * 12;
          break;
        case 'rocket':
          p.x = w * (0.2 + Math.random() * 0.6);
          p.y = h * 0.9;
          p.vy = -e.speed * (0.85 + Math.random() * 0.4);
          p.vx = (Math.random() - 0.5) * 70;
          p.ttl = 0.7 + Math.random() * 0.5;
          p.size = 3;
          p.grav = 120;
          break;
        case 'orb':
          p.ttl = 2.8 + Math.random() * 1.2;
          p.size = 5 + Math.random() * 12;
          p.grav = -8;
          break;
        case 'ring':
          p.x = w / 2;
          p.y = h * 0.55;
          p.ttl = 1.1;
          p.size = Math.min(w, h) * 0.62;
          p.vx = 0;
          p.vy = 0;
          break;
        default:
          p.ttl = 0.7 + Math.random() * 0.7;
          p.size = 2 + Math.random() * 3.5;
          p.grav = 220;
      }
      particlesRef.current.push(p);
    };

    const explode = (p: Particle) => {
      for (let i = 0; i < 26; i++) {
        const a = (i / 26) * Math.PI * 2 + Math.random() * 0.2;
        const s = 90 + Math.random() * 150;
        particlesRef.current.push({
          kind: 'spark',
          x: p.x,
          y: p.y,
          vx: Math.cos(a) * s,
          vy: Math.sin(a) * s,
          life: 0,
          ttl: 0.9 + Math.random() * 0.6,
          size: 2 + Math.random() * 2.5,
          color: Math.random() < 0.25 ? '#FFFFFF' : p.color,
          rot: 0,
          vr: 0,
          grav: 130,
          sway: 0,
        });
      }
    };

    const drawHeart = (s: number) => {
      ctx.beginPath();
      ctx.moveTo(0, s * 0.32);
      ctx.bezierCurveTo(-s * 0.5, -s * 0.12, -s * 0.32, -s * 0.5, 0, -s * 0.2);
      ctx.bezierCurveTo(s * 0.32, -s * 0.5, s * 0.5, -s * 0.12, 0, s * 0.32);
      ctx.closePath();
      ctx.fill();
    };

    let lastTs = performance.now();
    const frame = (ts: number) => {
      const dt = Math.min(0.05, (ts - lastTs) / 1000 || 0.016);
      lastTs = ts;
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      ctx.clearRect(0, 0, w, h);

      const ems = emittersRef.current;
      for (let i = ems.length - 1; i >= 0; i--) {
        const e = ems[i];
        if (ts > e.until) {
          ems.splice(i, 1);
          continue;
        }
        while (ts >= e.next) {
          spawn(e, w, h);
          e.next += e.every;
        }
      }
      const ps = particlesRef.current;
      if (ps.length > 700) ps.splice(0, ps.length - 700);
      for (let i = ps.length - 1; i >= 0; i--) {
        const p = ps[i];
        p.life += dt;
        if (p.life >= p.ttl) {
          if (p.kind === 'rocket') explode(p);
          ps.splice(i, 1);
          continue;
        }
        p.vy += p.grav * dt;
        const swayAmp = p.kind === 'heart' || p.kind === 'note' ? 26 : 8;
        p.x += (p.vx + Math.sin(p.life * 3 + p.sway) * swayAmp) * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
        const t = p.life / p.ttl;
        const alpha = t < 0.15 ? t / 0.15 : 1 - (t - 0.15) / 0.85;
        ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
        switch (p.kind) {
          case 'spark':
            ctx.shadowBlur = 10;
            ctx.shadowColor = p.color;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * (1 - t * 0.5), 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            break;
          case 'heart':
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(Math.sin(p.life * 2 + p.sway) * 0.25);
            ctx.shadowBlur = 12;
            ctx.shadowColor = p.color;
            ctx.fillStyle = p.color;
            drawHeart(p.size);
            ctx.restore();
            ctx.shadowBlur = 0;
            break;
          case 'note':
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(Math.sin(p.life * 2.4 + p.sway) * 0.3);
            ctx.shadowBlur = 10;
            ctx.shadowColor = p.color;
            ctx.fillStyle = p.color;
            ctx.font = `${p.size}px serif`;
            ctx.textAlign = 'center';
            ctx.fillText(p.sway > Math.PI ? '♫' : '♪', 0, 0);
            ctx.restore();
            ctx.shadowBlur = 0;
            break;
          case 'confetti':
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rot);
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
            ctx.restore();
            break;
          case 'rocket':
            ctx.strokeStyle = p.color;
            ctx.lineWidth = 2;
            ctx.shadowBlur = 8;
            ctx.shadowColor = p.color;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p.x - p.vx * 0.07, p.y - p.vy * 0.07);
            ctx.stroke();
            ctx.shadowBlur = 0;
            break;
          case 'orb': {
            const r = p.size * (1 + t * 0.6);
            const safe = p.color.startsWith('#') ? p.color : '#FFFFFF';
            const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
            g.addColorStop(0, hexToRgba(safe, 0.85));
            g.addColorStop(1, hexToRgba(safe, 0));
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
            ctx.fill();
            break;
          }
          case 'ring':
            ctx.strokeStyle = p.color;
            ctx.lineWidth = 3 * (1 - t);
            ctx.shadowBlur = 16;
            ctx.shadowColor = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * (0.1 + t * 0.9), 0, Math.PI * 2);
            ctx.stroke();
            ctx.shadowBlur = 0;
            break;
        }
      }
      ctx.globalAlpha = 1;

      if (ps.length === 0 && ems.length === 0 && fxCountRef.current === 0) {
        rafRef.current = null;
        return;
      }
      rafRef.current = requestAnimationFrame(frame);
    };

    ensureLoopRef.current = () => {
      if (reduced || rafRef.current !== null) return;
      lastTs = performance.now();
      rafRef.current = requestAnimationFrame(frame);
    };
    if (fxCountRef.current > 0) ensureLoopRef.current();

    return () => {
      ro.disconnect();
      ensureLoopRef.current = null;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, []);

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      timers.clear();
      particlesRef.current = [];
      emittersRef.current = [];
    };
  }, []);

  return (
    <div
      ref={wrapRef}
      className="absolute inset-0 z-20 overflow-hidden pointer-events-none"
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      {fx.map((item, idx) => {
        const cinematic = item.gift.price >= 1000;
        const mid = item.gift.price >= 100 && !cinematic;
        const accent = item.gift.accentHex;
        return (
          <React.Fragment key={item.key}>
            {cinematic && (
              <div
                className="absolute inset-0 gfx-scrim"
                style={{
                  background: `radial-gradient(circle at 50% 55%, ${hexToRgba(accent, 0.28)} 0%, rgba(4,5,10,0.62) 62%, rgba(4,5,10,0.78) 100%)`,
                }}
              />
            )}
            <div
              className="absolute left-3 gfx-banner flex items-center gap-2.5 rounded-2xl border backdrop-blur-md px-3.5 py-2"
              style={{
                top: 76 + idx * 58,
                background: `linear-gradient(100deg, ${hexToRgba(accent, 0.95)} 0%, ${hexToRgba(accent, 0.72)} 46%, rgba(18,21,33,0.88) 100%)`,
                borderColor: hexToRgba(accent, 0.65),
                boxShadow: `0 8px 28px ${hexToRgba(accent, 0.35)}`,
              }}
            >
              <GiftArtwork src={item.gift.imageUrl} size={34} />
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate max-w-[24ch]">
                  {item.senderName} <span className="opacity-80 font-medium">sent</span>{' '}
                  {item.gift.name}
                </p>
                <p className="text-[10px] font-mono tabular-nums text-white/85">
                  {item.gift.price.toLocaleString()} coins
                </p>
              </div>
              {item.combo > 1 && (
                <span
                  key={item.combo}
                  className="gfx-combo shrink-0 font-display text-lg font-extrabold italic text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.55)]"
                >
                  ×{item.combo}
                </span>
              )}
            </div>
            <div
              className={`absolute inset-x-0 flex flex-col items-center gap-2 ${
                cinematic ? 'top-[24%] gfx-cine' : mid ? 'bottom-40 gfx-pop' : 'bottom-36 gfx-pop'
              }`}
            >
              <div
                className={cinematic ? '' : 'gfx-bob'}
                style={{
                  filter: `drop-shadow(0 0 ${cinematic ? 34 : 18}px ${hexToRgba(accent, 0.75)})`,
                }}
              >
                <GiftArtwork src={item.gift.imageUrl} size={cinematic ? 176 : mid ? 96 : 64} />
              </div>
              {cinematic && (
                <div
                  className="gfx-plate rounded-full border px-5 py-1.5 backdrop-blur-md"
                  style={{
                    borderColor: hexToRgba(accent, 0.6),
                    background: `linear-gradient(90deg, ${hexToRgba(accent, 0.32)}, rgba(10,12,19,0.72))`,
                  }}
                >
                  <p className="font-display text-sm font-bold text-white tracking-wide">
                    {item.gift.name}
                    {item.combo > 1 && (
                      <span className="ml-2 italic text-amber-300">×{item.combo}</span>
                    )}
                  </p>
                </div>
              )}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};