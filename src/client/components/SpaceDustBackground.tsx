import { useEffect, useRef } from 'react';

interface SpaceDustBackgroundProps {
  darkMode?: boolean;
}

interface Particle {
  x: number;
  y: number;
  size: number;
  speed: number;
  angle: number;
  baseAlpha: number;
  swayPhase: number;
  swaySpeed: number;
  swayAmp: number;
  pulsePhase: number;
  pulseSpeed: number;
  canPulse: boolean;
}

export function SpaceDustBackground({ darkMode }: SpaceDustBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Active in dark mode alone
  const isDark =
    typeof darkMode === 'boolean'
      ? darkMode
      : typeof document !== 'undefined' &&
        document.documentElement.classList.contains('dark');

  useEffect(() => {
    if (!isDark) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId = 0;
    let width = window.innerWidth;
    let height = window.innerHeight;

    // Detect reduce motion preference
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let prefersReducedMotion = motionQuery.matches;

    const handleMotionChange = (e: MediaQueryListEvent) => {
      prefersReducedMotion = e.matches;
    };
    motionQuery.addEventListener('change', handleMotionChange);

    // Dynamic particle count: 60 to 120 particles based on viewport
    const calculateCount = (w: number, h: number) => {
      const area = w * h;
      return Math.min(120, Math.max(60, Math.round(area / 15000)));
    };

    // Initialize particles
    const createParticle = (w: number, h: number): Particle => {
      // Skew distribution toward smaller distant specks (depth effect)
      const r = Math.random();
      const size = 1.4 + r * r * 2.5; // 1.0px to 3.0px
      const normSize = (size - 1.0) / 2.0; // 0 (smallest) to 1 (largest)

      // Larger particles move slightly faster; smaller ones are slower
      const speed = 0.08 + normSize * 0.22;

      // Larger particles are slightly brighter; smaller ones dimmer
      const baseAlpha = 0.25 + normSize * 0.55;

      return {
        x: Math.random() * w,
        y: Math.random() * h,
        size,
        speed,
        angle: Math.random() * Math.PI * 2,
        baseAlpha,
        swayPhase: Math.random() * Math.PI * 2,
        swaySpeed: 0.003 + Math.random() * 0.007,
        swayAmp: 0.06 + Math.random() * 0.08,
        pulsePhase: Math.random() * Math.PI * 2,
        pulseSpeed: 0.004 + Math.random() * 0.008,
        canPulse: Math.random() > 0.35, // ~65% gently fade in & out
      };
    };

    const particleCount = calculateCount(width, height);
    let particles: Particle[] = Array.from({ length: particleCount }, () =>
      createParticle(width, height)
    );

    // Resize handling with devicePixelRatio for crisp rendering on high-DPI
    const handleResize = () => {
      if (!canvas) return;
      width = window.innerWidth;
      height = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);

      // Re-evaluate count on significant resize
      const targetCount = calculateCount(width, height);
      if (particles.length < targetCount) {
        const extra = Array.from({ length: targetCount - particles.length }, () =>
          createParticle(width, height)
        );
        particles.push(...extra);
      } else if (particles.length > targetCount) {
        particles = particles.slice(0, targetCount);
      }

      // Keep particles inside new bounds
      particles.forEach((p) => {
        p.x = Math.min(p.x, width);
        p.y = Math.min(p.y, height);
      });
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    // Animation loop
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const speedMultiplier = prefersReducedMotion ? 0 : 0.5; // Slow down motion if user prefers reduced motion

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        if (!p) continue;

        // Organic motion with gentle sway
        if (speedMultiplier > 0) {
          p.swayPhase += p.swaySpeed;
          p.pulsePhase += p.pulseSpeed;

          const swayX = Math.sin(p.swayPhase) * p.swayAmp;
          const swayY = Math.cos(p.swayPhase * 0.85) * p.swayAmp;

          p.x += Math.cos(p.angle) * p.speed + swayX;
          p.y += Math.sin(p.angle) * p.speed + swayY;

          // Seamless edge wrapping
          const margin = p.size * 2 + 10;
          if (p.x < -margin) p.x = width + margin;
          else if (p.x > width + margin) p.x = -margin;
          if (p.y < -margin) p.y = height + margin;
          else if (p.y > height + margin) p.y = -margin;
        }

        // Calculate opacity (with gentle breathing for pulsing particles)
        let alpha = p.baseAlpha;
        if (p.canPulse) {
          alpha = p.baseAlpha * (0.65 + 0.35 * Math.sin(p.pulsePhase));
        }

        // Render particle with soft subtle glow
        // Render particle with soft subtle glow (dark mode)
        ctx.save();
        ctx.shadowBlur = p.size * 9;
        ctx.shadowColor = `rgba(139, 92, 246, ${Math.min(1, alpha * 2.5)})`;
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      motionQuery.removeEventListener('change', handleMotionChange);
    };
  }, [isDark]);

  if (!isDark) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-0"
    />
  );
}
