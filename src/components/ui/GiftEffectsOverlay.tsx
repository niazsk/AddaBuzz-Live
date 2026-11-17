import React, { useEffect, useRef } from 'react';
import { GiftCatalogItem } from '../../types/app';
import { giftTier } from '../../data/gifts';
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

type ParticleKind =
  | 'spark'
  | 'heart'
  | 'note'
  | 'confetti'
  | 'rocket'
  | 'orb'
  | 'ring'
  | 'streak'
  | 'diamond'
  | 'ember'
  | 'aurora'
  | 'petal'
  | 'star';

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
  origin: 'bottom' | 'top' | 'center' | 'side';
  speed: number;
}

const CONFETTI_COLORS = ['#F59E0B', '#38BDF8', '#F472B6', '#A3E635', '#FFFFFF', '#FB7185'];
const GOLD = ['#FFD76A', '#FFB347', '#FFF3C4'];

const fxDuration = (gift: GiftCatalogItem) =>
  giftTier(gift.price) === 'luxury' ? 6200 : giftTier(gift.price) === 'premium' ? 4200 : 2800;

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
      const tier = giftTier(item.gift.price);
      const boost = Math.min(2.2, 1 + (item.combo - 1) * 0.25);
      const em = (
        kind: ParticleKind,
        ms: number,
        every: number,
        origin: Emitter['origin'],
        colors: string[],
        speed: number,
        delay = 0
      ) =>
        emittersRef.current.push({
          until: now + delay + ms,
          next: now + delay,
          every,
          kind,
          colors,
          origin,
          speed,
        });

      switch (item.gift.effect) {
        case 'hearts':
          em('heart', 2200 * boost, 65, 'bottom', [accent, '#FF6FA5', '#FFB3C9'], 95);
          em('star', 1200, 140, 'center', [accent, '#FFFFFF'], 30);
          break;
        case 'fireworks':
          em('rocket', 3000 * boost, 380, 'bottom', [accent, '#FFD76A', '#7DD3FC', '#F472B6'], 340);
          break;
        case 'confetti':
          em('confetti', 2600 * boost, 24, 'top', CONFETTI_COLORS, 130);
          break;
        case 'notes':
          em('note', 2200 * boost, 100, 'bottom', [accent, '#FFFFFF', '#FFD76A'], 85);
          em('orb', 1200, 160, 'bottom', [accent], 40);
          break;
        case 'glow':
          em('orb', 2600 * boost, 55, 'bottom', [accent, '#BFE3FF', '#FFE9A8'], 60);
          em('star', 1600, 120, 'center', ['#FFFFFF', accent], 25);
          break;
        case 'streaks':
          em('streak', 2400 * boost, 60, 'side', [accent, '#FFFFFF', '#7DD3FC'], 520);
          em('spark', 600, 30, 'center', [accent, '#FFFFFF'], 200);
          break;
        case 'diamonds':
          em('diamond', 2600 * boost, 80, 'top', [accent, '#FFFFFF', '#BFE3FF'], 70);
          em('star', 1800, 110, 'center', ['#FFFFFF', accent], 30);
          break;
        case 'embers':
          em('ember', 3000 * boost, 38, 'bottom', [accent, '#FFD76A', '#FF8C42'], 130);
          em('spark', 700, 26, 'center', [accent, '#FFFFFF'], 220);
          break;
        case 'aurora':
          em('aurora', 3200 * boost, 150, 'side', [accent, '#8F77D4', '#5EEAD4'], 70);
          em('star', 2400, 140, 'top', ['#FFFFFF', accent, '#BFE3FF'], 40);
          break;
        case 'petals':
          em('petal', 2800 * boost, 55, 'top', [accent, '#FFB3C9', '#FFFFFF'], 90);
          em('orb', 1400, 140, 'bottom', [accent], 40);
          break;
        case 'stars':
          em('star', 2400 * boost, 60, 'center', [accent, '#FFD76A', '#FFFFFF'], 45);
          em('spark', 1200, 60, 'top', GOLD, 90);
          break;
        default:
          em('spark', 800, 22, 'center', [accent, '#FFFFFF', accent], 240);
          em('ring', 60, 100, 'center', [accent], 0.5);
      }
      if (tier === 'classic') {
        em('spark', 500, 30, 'center', [accent, '#FFFFFF'], 160);
      }
      if (tier === 'premium') {
        em('ring', 60, 100, 'center', [accent], 0.5);
        em('star', 1400, 130, 'center', ['#FFFFFF', accent], 30);
      }
      if (tier === 'luxury') {
        em('ring', 60, 100, 'center', [accent], 1);
        em('ring', 60, 100, 'center', ['#FFFFFF'], 0.72, 300);
        em('ember', 3600, 50, 'bottom', GOLD, 110);
        em('star', 3000, 90, 'top', GOLD, 50);
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
      } else if (e.origin === 'side') {
        const fromLeft = Math.random() < 0.5;
        p.x = fromLeft ? -20 : w + 20;
        p.y = h * (0.2 + Math.random() * 0.55);
        p.vx = (fromLeft ? 1 : -1) * e.speed * (0.7 + Math.random() * 0.6);
        p.vy = (Math.random() - 0.5) * 30;
      } else {
        p.x = w / 2;
        p.y = h * 0.58;
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
          p.y = h * 0.5;
          p.ttl = 1.1;
          p.size = Math.min(w, h) * 0.62 * e.speed;
          p.vx = 0;
          p.vy = 0;
          break;
        case 'streak':
          p.ttl = 0.9 + Math.random() * 0.5;
          p.size = 2.5;
          break;
        case 'diamond':
          p.ttl = 2.6 + Math.random();
          p.size = 7 + Math.random() * 6;
          p.grav = 60;
          p.vr = (Math.random() - 0.5) * 3;
          break;
        case 'ember':
          p.ttl = 2.2 + Math.random() * 1.2;
          p.size = 3 + Math.random() * 4;
          p.grav = -60;
          break;
        case 'aurora':
          p.ttl = 3 + Math.random() * 1.5;
          p.size = 26 + Math.random() * 30;
          break;
        case 'petal':
          p.ttl = 3 + Math.random() * 1.2;
          p.size = 8 + Math.random() * 7;
          p.grav = 90;
          p.vr = (Math.random() - 0.5) * 4;
          break;
        case 'star':
          p.ttl = 1.6 + Math.random();
          p.size = 5 + Math.random() * 6;
          p.grav = 20;
          break;
        default:
          p.ttl = 0.7 + Math.random() * 0.7;
          p.size = 2 + Math.random() * 3.5;
          p.grav = 220;
      }
      particlesRef.current.push(p);
    };

    const explode = (p: Particle) => {
      for (let i = 0; i < 28; i++) {
        const a = (i / 28) * Math.PI * 2 + Math.random() * 0.2;
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

    const drawStar = (s: number) => {
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? s : s * 0.45;
        const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
        const x = Math.cos(a) * r;
        const y = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
    };

    const glowDot = (x: number, y: number, r: number, color: string, core: number) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, hexToRgba(color, core));
      g.addColorStop(0.4, hexToRgba(color, core * 0.45));
      g.addColorStop(1, hexToRgba(color, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
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
        const swayAmp =
          p.kind === 'petal' ? 40 : p.kind === 'heart' || p.kind === 'note' ? 26 : 8;
        p.x += (p.vx + Math.sin(p.life * 3 + p.sway) * swayAmp) * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
        const t = p.life / p.ttl;
        const alpha = t < 0.15 ? t / 0.15 : 1 - (t - 0.15) / 0.85;
        ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
        const additive =
          p.kind === 'spark' ||
          p.kind === 'orb' ||
          p.kind === 'ember' ||
          p.kind === 'streak' ||
          p.kind === 'aurora' ||
          p.kind === 'ring';
        ctx.globalCompositeOperation = additive ? 'lighter' : 'source-over';
        switch (p.kind) {
          case 'spark':
            glowDot(p.x, p.y, p.size * 3 * (1 - t * 0.5), p.color, 0.9);
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
            ctx.scale(1, 0.4 + 0.6 * Math.abs(Math.sin(p.life * 5 + p.sway)));
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
          case 'orb':
            glowDot(p.x, p.y, p.size * (1 + t * 0.6), p.color, 0.85);
            break;
          case 'ring':
            ctx.strokeStyle = p.color;
            ctx.lineWidth = 1 + 4 * (1 - t);
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * (0.1 + t * 0.9), 0, Math.PI * 2);
            ctx.stroke();
            break;
          case 'streak': {
            const tx = p.x - p.vx * 0.14;
            const ty = p.y - p.vy * 0.14;
            const g = ctx.createLinearGradient(p.x, p.y, tx, ty);
            g.addColorStop(0, hexToRgba(p.color, 0.95));
            g.addColorStop(1, hexToRgba(p.color, 0));
            ctx.strokeStyle = g;
            ctx.lineWidth = p.size;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(tx, ty);
            ctx.stroke();
            glowDot(p.x, p.y, 6, p.color, 0.9);
            break;
          }
          case 'diamond':
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rot);
            ctx.fillStyle = hexToRgba(p.color, 0.85);
            ctx.beginPath();
            ctx.moveTo(0, -p.size);
            ctx.lineTo(p.size * 0.62, 0);
            ctx.lineTo(0, p.size);
            ctx.lineTo(-p.size * 0.62, 0);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.85)';
            ctx.beginPath();
            ctx.moveTo(0, -p.size * 0.5);
            ctx.lineTo(p.size * 0.3, 0);
            ctx.lineTo(0, p.size * 0.5);
            ctx.lineTo(-p.size * 0.3, 0);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
            break;
          case 'ember': {
            const flicker = 0.7 + 0.3 * Math.sin(p.life * 20 + p.sway);
            glowDot(p.x, p.y, p.size * 3 * (1 - t * 0.4), p.color, 0.85 * flicker);
            break;
          }
          case 'aurora':
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(Math.sin(p.life * 0.8 + p.sway) * 0.25);
            ctx.scale(3, 1);
            glowDot(0, 0, p.size, p.color, 0.4);
            ctx.restore();
            break;
          case 'petal':
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rot);
            ctx.fillStyle = hexToRgba(p.color, 0.85);
            ctx.beginPath();
            ctx.moveTo(0, -p.size);
            ctx.quadraticCurveTo(p.size * 0.8, -p.size * 0.2, 0, p.size);
            ctx.quadraticCurveTo(-p.size * 0.8, -p.size * 0.2, 0, -p.size);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
            break;
          case 'star':
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rot * 0.3);
            ctx.scale(0.8 + 0.4 * Math.sin(p.life * 6 + p.sway), 0.8 + 0.4 * Math.sin(p.life * 6 + p.sway));
            ctx.shadowBlur = 8;
            ctx.shadowColor = p.color;
            ctx.fillStyle = p.color;
            drawStar(p.size);
            ctx.restore();
            ctx.shadowBlur = 0;
            break;
        }
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';

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
        const tier = giftTier(item.gift.price);
        const luxury = tier === 'luxury';
        const premium = tier === 'premium';
        const accent = item.gift.accentHex;
        const lifeClass = luxury
          ? 'gfx-life-luxury'
          : premium
            ? 'gfx-life-premium'
            : 'gfx-life-classic';
        const initial = item.senderName.trim().charAt(0).toUpperCase() || '?';
        return (
          <React.Fragment key={item.key}>
            {luxury && (
              <>
                <div
                  className="absolute inset-0 gfx-scrim"
                  style={{
                    background: `radial-gradient(circle at 50% 46%, ${hexToRgba(accent, 0.3)} 0%, rgba(4,5,10,0.66) 58%, rgba(4,5,10,0.85) 100%)`,
                  }}
                />
                <div
                  className="absolute inset-x-0 top-0 h-9 gfx-bar"
                  style={{
                    transformOrigin: 'top',
                    background: 'linear-gradient(180deg, rgba(2,3,7,0.95), rgba(2,3,7,0))',
                  }}
                />
                <div
                  className="absolute inset-x-0 bottom-0 h-9 gfx-bar"
                  style={{
                    transformOrigin: 'bottom',
                    background: 'linear-gradient(0deg, rgba(2,3,7,0.95), rgba(2,3,7,0))',
                  }}
                />
              </>
            )}
            <div className={`absolute left-3 ${lifeClass}`} style={{ top: 76 + idx * 62 }}>
              <div
                className="gfx-banner relative overflow-hidden flex items-center gap-2.5 rounded-2xl border border-white/10 bg-[#0b0e17]/85 backdrop-blur-xl pl-2.5 pr-3 py-2"
                style={{ boxShadow: `0 10px 32px ${hexToRgba(accent, 0.35)}` }}
              >
                <span
                  className="absolute inset-y-0 left-0 w-1"
                  style={{ background: `linear-gradient(180deg, ${accent}, ${hexToRgba(accent, 0.2)})` }}
                />
                <span
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-extrabold text-white"
                  style={{
                    background: `linear-gradient(135deg, ${accent}, ${hexToRgba(accent, 0.45)})`,
                    boxShadow: `0 0 12px ${hexToRgba(accent, 0.55)}`,
                  }}
                >
                  {initial}
                </span>
                <span
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border"
                  style={{
                    borderColor: hexToRgba(accent, 0.45),
                    background: `radial-gradient(circle at 50% 40%, ${hexToRgba(accent, 0.3)}, rgba(10,13,22,0.6))`,
                  }}
                >
                  <GiftArtwork src={item.gift.imageUrl} size={30} />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-bold text-white truncate max-w-[26ch]">
                    {item.senderName} <span className="font-medium text-white/50">sent</span>{' '}
                    <span style={{ color: accent }}>{item.gift.name}</span>
                  </span>
                  <span className="mt-0.5 flex items-center gap-1 text-[10px] font-mono tabular-nums text-amber-200/90">
                    <span className="h-2 w-2 rounded-full bg-gradient-to-br from-amber-300 to-orange-500" />
                    {item.gift.price.toLocaleString()}
                    {luxury && (
                      <span className="ml-1 rounded-full border border-amber-300/40 bg-amber-400/15 px-1.5 text-[9px] font-sans font-bold tracking-wider text-amber-200">
                        LUXURY
                      </span>
                    )}
                  </span>
                </span>
                {item.combo > 1 && (
                  <span
                    key={item.combo}
                    className="gfx-combo grid h-8 min-w-8 shrink-0 place-items-center rounded-full px-1.5 font-display text-sm font-black italic text-white"
                    style={{
                      background: 'linear-gradient(135deg, #FBBF24, #F97316 60%, #EC4899)',
                      boxShadow: '0 0 16px rgba(249,115,22,0.6)',
                    }}
                  >
                    ×{item.combo}
                  </span>
                )}
                <span
                  className="gfx-shine absolute inset-0"
                  style={{
                    background:
                      'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.22) 50%, transparent 60%)',
                  }}
                />
              </div>
            </div>
            {luxury ? (
              <div
                className={`absolute inset-x-0 top-[max(140px,26%)] flex flex-col items-center ${lifeClass}`}
                style={{ perspective: '900px' }}
              >
                <div className="relative grid place-items-center">
                  <div
                    className="gfx-rays absolute -inset-20 rounded-full"
                    style={{
                      background: `repeating-conic-gradient(from 0deg, ${hexToRgba(accent, 0.32)} 0deg 14deg, transparent 14deg 40deg)`,
                      maskImage: 'radial-gradient(circle, black 20%, transparent 68%)',
                      WebkitMaskImage: 'radial-gradient(circle, black 20%, transparent 68%)',
                    }}
                  />
                  <div
                    className="gfx-halo absolute inset-2 rounded-full border-2"
                    style={{ borderColor: hexToRgba(accent, 0.7) }}
                  />
                  <div
                    className="gfx-legend"
                    style={{ filter: `drop-shadow(0 0 40px ${hexToRgba(accent, 0.8)})` }}
                  >
                    <GiftArtwork src={item.gift.imageUrl} size={190} />
                  </div>
                </div>
                <div className="gfx-plate mt-4 flex flex-col items-center gap-1">
                  <p
                    className="font-display text-2xl font-black tracking-wide"
                    style={{
                      backgroundImage: `linear-gradient(95deg, #FFFFFF 10%, ${accent} 50%, #FFFFFF 90%)`,
                      WebkitBackgroundClip: 'text',
                      backgroundClip: 'text',
                      color: 'transparent',
                      filter: `drop-shadow(0 2px 10px ${hexToRgba(accent, 0.55)})`,
                    }}
                  >
                    {item.gift.name}
                  </p>
                  <p className="text-[11px] font-medium text-white/65">
                    from {item.senderName}
                    {item.combo > 1 && (
                      <span className="ml-1.5 font-display font-black italic text-amber-300">
                        ×{item.combo}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            ) : (
              <div
                className={`absolute inset-x-0 flex flex-col items-center gap-2 ${lifeClass} ${
                  premium ? 'bottom-40' : 'bottom-32'
                }`}
              >
                <div className="relative grid place-items-center">
                  {premium && (
                    <div
                      className="gfx-halo absolute inset-0 rounded-full border-2"
                      style={{ borderColor: hexToRgba(accent, 0.6) }}
                    />
                  )}
                  <div
                    className={premium ? 'gfx-pop-premium' : 'gfx-pop'}
                    style={{ filter: `drop-shadow(0 0 ${premium ? 26 : 16}px ${hexToRgba(accent, 0.75)})` }}
                  >
                    <GiftArtwork src={item.gift.imageUrl} size={premium ? 112 : 72} />
                  </div>
                </div>
                {premium && (
                  <div
                    className="gfx-plate rounded-full border px-4 py-1 backdrop-blur-md"
                    style={{
                      borderColor: hexToRgba(accent, 0.55),
                      background: `linear-gradient(90deg, ${hexToRgba(accent, 0.3)}, rgba(10,12,19,0.75))`,
                    }}
                  >
                    <p className="font-display text-sm font-bold tracking-wide text-white">
                      {item.gift.name}
                      {item.combo > 1 && (
                        <span className="ml-2 italic text-amber-300">×{item.combo}</span>
                      )}
                    </p>
                  </div>
                )}
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};