import React, { useEffect, useRef } from 'react';
import { FruitCell, FruitId, FRUIT_BY_ID } from '../../games/fruitManor/config';
import { RoundPhase } from '../../games/fruitManor/engine';
import { FruitIcon } from './FruitIcon';

interface FruitWheelProps {
  fruits: FruitCell[];
  roundId: string;
  phase: RoundPhase;
  resultFruitId?: FruitId;
  lastFruitId?: FruitId;
  spinMs: number;
  reducedMotion: boolean;
  burstKey: number;
  burstAccent: string;
  burstBig: boolean;
  onPeg: () => void;
  onSpinEnd: () => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rot: number;
  vr: number;
  life: number;
  maxLife: number;
  color: string;
  kind: 'confetti' | 'coin' | 'spark';
}

const BULBS = 16;

export const FruitWheel: React.FC<FruitWheelProps> = ({
  fruits,
  roundId,
  phase,
  resultFruitId,
  lastFruitId,
  spinMs,
  reducedMotion,
  burstKey,
  burstAccent,
  burstBig,
  onPeg,
  onSpinEnd,
}) => {
  const rotorRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const rotationRef = useRef(0);
  const spinRef = useRef<{ start: number; from: number; to: number; t0: number; dur: number } | null>(null);
  const spunForRef = useRef('');
  const particlesRef = useRef<Particle[]>([]);
  const phaseRef = useRef(phase);
  const motionRef = useRef(reducedMotion);
  const pegRef = useRef({ lastSeg: -1, lastAt: 0 });
  const callbacksRef = useRef({ onPeg, onSpinEnd });
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 });

  phaseRef.current = phase;
  motionRef.current = reducedMotion;
  callbacksRef.current = { onPeg, onSpinEnd };

  const applyRotation = () => {
    if (rotorRef.current) {
      rotorRef.current.style.transform = `rotate(${rotationRef.current}deg)`;
    }
  };

  // Start the reveal spin only after the server-committed result arrives.
  useEffect(() => {
    if (phase !== 'DRAWN' || !resultFruitId) return;
    if (spunForRef.current === roundId) return;
    spunForRef.current = roundId;
    const idx = fruits.findIndex((f) => f.fruitId === resultFruitId);
    if (idx < 0) return;
    const from = rotationRef.current;
    const targetMod = ((-(idx * 45 + 22.5) % 360) + 360) % 360;
    const currentMod = ((from % 360) + 360) % 360;
    const delta = (targetMod - currentMod + 360) % 360;
    const turns = motionRef.current ? 0 : 5;
    const to = from + turns * 360 + delta;
    if (motionRef.current) {
      rotationRef.current = to;
      applyRotation();
      callbacksRef.current.onSpinEnd();
      return;
    }
    spinRef.current = { start: from, from, to, t0: performance.now(), dur: spinMs };
    pegRef.current.lastSeg = Math.floor(from / 45);
  }, [phase, resultFruitId, roundId, fruits, spinMs]);

  // Win particle burst
  useEffect(() => {
    if (burstKey <= 0 || motionRef.current) return;
    const { w, h } = sizeRef.current;
    if (!w || !h) return;
    const cx = w / 2;
    const cy = h / 2;
    const count = burstBig ? 150 : 80;
    const palette = [burstAccent, '#F5B93F', '#FDE68A', '#FFFFFF', '#34D399', '#FF4D6D'];
    const next: Particle[] = [];
    for (let i = 0; i < count; i += 1) {
      const ang = Math.random() * Math.PI * 2;
      const speed = 0.12 + Math.random() * 0.34;
      const kind: Particle['kind'] = i % 5 === 0 ? 'coin' : i % 3 === 0 ? 'spark' : 'confetti';
      next.push({
        x: cx,
        y: cy,
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed - 0.18,
        size: kind === 'coin' ? 5 + Math.random() * 5 : 3 + Math.random() * 5,
        rot: Math.random() * 360,
        vr: (Math.random() - 0.5) * 0.6,
        life: 0,
        maxLife: 1400 + Math.random() * 900,
        color: kind === 'coin' ? '#F5B93F' : palette[Math.floor(Math.random() * palette.length)],
        kind,
      });
    }
    particlesRef.current = [...particlesRef.current.slice(-200), ...next];
  }, [burstKey, burstAccent, burstBig]);

  // Single rAF loop: spin easing, idle drift, particles.
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      sizeRef.current = { w: rect.width, h: rect.height, dpr };
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;

      const spin = spinRef.current;
      if (spin) {
        const t = Math.min(1, (now - spin.t0) / spin.dur);
        const eased = 1 - Math.pow(1 - t, 4);
        rotationRef.current = spin.from + (spin.to - spin.from) * eased;
        applyRotation();
        const seg = Math.floor(rotationRef.current / 45);
        if (seg !== pegRef.current.lastSeg && now - pegRef.current.lastAt > 45) {
          pegRef.current.lastSeg = seg;
          pegRef.current.lastAt = now;
          callbacksRef.current.onPeg();
        }
        if (t >= 1) {
          spinRef.current = null;
          callbacksRef.current.onSpinEnd();
        }
      } else if (!motionRef.current && (phaseRef.current === 'OPEN' || phaseRef.current === 'SCHEDULED')) {
        rotationRef.current += dt * 0.004;
        applyRotation();
      }

      const { w, h, dpr } = sizeRef.current;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const parts = particlesRef.current;
      if (parts.length) {
        for (let i = parts.length - 1; i >= 0; i -= 1) {
          const p = parts[i];
          p.life += dt;
          if (p.life >= p.maxLife) {
            parts.splice(i, 1);
            continue;
          }
          p.vy += 0.00045 * dt;
          p.vx *= 0.995;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.rot += p.vr * dt;
          const alpha = 1 - p.life / p.maxLife;
          ctx.save();
          ctx.globalAlpha = Math.max(0, alpha);
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rot * Math.PI) / 180);
          if (p.kind === 'coin') {
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.ellipse(0, 0, p.size, p.size * Math.abs(Math.cos(p.life / 160)), 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#B45309';
            ctx.lineWidth = 1;
            ctx.stroke();
          } else if (p.kind === 'spark') {
            ctx.globalCompositeOperation = 'lighter';
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(0, 0, p.size * 0.5 * alpha + 0.5, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
          }
          ctx.restore();
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  const winner =
    phase === 'SETTLED' && resultFruitId
      ? FRUIT_BY_ID.get(resultFruitId)
      : (phase === 'OPEN' || phase === 'SCHEDULED' || phase === 'LOCKED') && lastFruitId
        ? FRUIT_BY_ID.get(lastFruitId)
        : undefined;
  const spinning = phase === 'DRAWN' || phase === 'SETTLING';

  return (
    <div ref={wrapRef} className="relative aspect-square w-full select-none [container-type:inline-size]" aria-label="Fruit Manor wheel">
      {/* Outer marquee ring */}
      <div className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,#8a5a12,#f5d78a,#8a5a12,#f5d78a,#8a5a12,#f5d78a,#8a5a12,#f5d78a,#8a5a12)] shadow-[0_10px_40px_rgba(0,0,0,0.55),0_0_60px_rgba(245,185,63,0.14)]" />
      <div className="absolute inset-[3.5%] rounded-full bg-[#0A1F16]" />
      {Array.from({ length: BULBS }).map((_, i) => {
        const ang = (i * 360) / BULBS;
        return (
          <span
            key={i}
            className={`fm-bulb absolute left-1/2 top-1/2 h-[3.2%] w-[3.2%] rounded-full ${spinning || phase === 'OPEN' ? 'fm-bulb-on' : ''}`}
            style={{
              transform: `translate(-50%, -50%) rotate(${ang}deg) translateY(-46.5cqw)`,
              animationDelay: `${(i % 4) * 0.18}s`,
              ['--fm-bulb-color' as string]: i % 2 ? '#F5B93F' : '#FFEDBC',
            }}
          />
        );
      })}

      {/* Rotor */}
      <div ref={rotorRef} className="absolute inset-[7%] overflow-hidden rounded-full will-change-transform">
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `conic-gradient(${fruits
              .map((f, i) => `${i % 2 ? '#0E2E21' : '#14402E'} ${i * 45}deg ${(i + 1) * 45}deg`)
              .join(', ')})`,
          }}
        />
        <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_50%_38%,rgba(255,255,255,0.10),transparent_55%,rgba(0,0,0,0.42))]" />
        {fruits.map((f, i) => (
          <div key={f.fruitId}>
            <div
              className="absolute left-1/2 top-1/2 h-1/2 w-px origin-top bg-[#F5B93F]/25"
              style={{ transform: `rotate(${i * 45}deg)` }}
            />
            <div
              className="absolute inset-0"
              style={{ transform: `rotate(${i * 45 + 22.5}deg)` }}
            >
              <div className="absolute left-1/2 top-[6%] flex w-[26%] -translate-x-1/2 flex-col items-center">
                <FruitIcon fruitId={f.fruitId} className="w-full drop-shadow-[0_3px_6px_rgba(0,0,0,0.5)]" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Hub */}
      <div className="absolute left-1/2 top-1/2 z-10 grid h-[27%] w-[27%] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-gradient-to-br from-[#F7DD9A] via-[#D9A93F] to-[#8A5A12] shadow-[0_4px_18px_rgba(0,0,0,0.6)]">
        <div className="grid h-[82%] w-[82%] place-items-center rounded-full bg-[#0B241A] border border-amber-200/25">
          {winner ? (
            <FruitIcon fruitId={winner.fruitId} className="fm-hub-pop w-[68%]" />
          ) : (
            <div className="flex flex-col items-center leading-none">
              <span className="font-display text-[clamp(10px,2.6cqw,18px)] font-black tracking-widest text-amber-300">FM</span>
              <span className="mt-0.5 text-[clamp(5px,1.1cqw,8px)] font-semibold uppercase tracking-[0.2em] text-emerald-200/70">
                {spinning ? 'Drawing' : 'Manor'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Pointer */}
      <div className="absolute left-1/2 top-[1.5%] z-20 -translate-x-1/2">
        <div className="fm-pointer h-0 w-0 border-l-[clamp(8px,2.2cqw,14px)] border-r-[clamp(8px,2.2cqw,14px)] border-t-[clamp(14px,3.6cqw,22px)] border-l-transparent border-r-transparent border-t-[#F5B93F] drop-shadow-[0_3px_5px_rgba(0,0,0,0.7)]" />
      </div>

      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 z-30 h-full w-full" />
    </div>
  );
};