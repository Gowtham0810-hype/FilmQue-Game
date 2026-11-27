import { useEffect, useRef } from 'react';

interface CelebrationBurstProps {
  active: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  color: string;
  rotation: number;
  vr: number;
  alpha: number;
}

const LIGHT_COLORS = ['#141414', '#fbbf24', '#34d399', '#525252', '#d4d4d4'];
const DARK_COLORS = ['#e2e0e3', '#fbbf24', '#34d399', '#38bdf8', '#f472b6', '#ffffff'];

export function CelebrationBurst({ active }: CelebrationBurstProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!active) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const isDark = document.documentElement.classList.contains('dark');
    const colors = isDark ? DARK_COLORS : LIGHT_COLORS;

    const dpr = window.devicePixelRatio || 1;
    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const originX = width / 2;
    const originY = height * 0.42;

    const particles: Particle[] = Array.from({ length: 75 }, () => {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 11;
      return {
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 4.5,
        w: 5 + Math.random() * 6,
        h: 4 + Math.random() * 8,
        color: colors[Math.floor(Math.random() * colors.length)] ?? '#ffffff',
        rotation: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.22,
        alpha: 1,
      };
    });

    let rafId = 0;
    const tick = () => {
      ctx.clearRect(0, 0, width, height);
      let alive = 0;

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.28; // gravity
        p.vx *= 0.985;
        p.rotation += p.vr;
        p.alpha -= 0.012;

        if (p.alpha > 0.02 && p.y < height + 40) {
          alive++;
          ctx.save();
          ctx.globalAlpha = Math.max(0, p.alpha);
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
          ctx.restore();
        }
      }

      if (alive > 0) {
        rafId = requestAnimationFrame(tick);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [active]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 z-50 pointer-events-none w-full h-full"
    />
  );
}
