import React, { useEffect, useRef, useState } from 'react';
import { Item } from '../types';
import { RARITIES, getRarityTierRank } from '../data/rarities';
import { ErrorBoundary } from './ErrorBoundary';

interface AuraVisualizerCanvasProps {
  item?: Item | null;
  size?: number;
  className?: string;
}

// Safe color parser to normalize any hex, rgb, rgba, or CSS color string into a valid rgba(...) color
function parseColorToRgba(colorStr?: string, alpha: number = 1): string {
  const safeAlpha = Math.max(0, Math.min(1, Number.isFinite(alpha) ? alpha : 1));
  if (!colorStr || typeof colorStr !== 'string') {
    return `rgba(168, 85, 247, ${safeAlpha})`;
  }

  const str = colorStr.trim();

  // 1. Hex format: #rgb, #rgba, #rrggbb, #rrggbbaa
  if (str.startsWith('#')) {
    let hex = str.slice(1);
    if (hex.length === 3 || hex.length === 4) {
      hex = hex.split('').map((c) => c + c).join('');
    }
    if (hex.length >= 6) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      if (!Number.isNaN(r) && !Number.isNaN(g) && !Number.isNaN(b)) {
        return `rgba(${r}, ${g}, ${b}, ${safeAlpha})`;
      }
    }
  }

  // 2. RGBA or RGB format: rgb(r, g, b) or rgba(r, g, b, a)
  const rgbMatch = str.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1], 10);
    const g = parseInt(rgbMatch[2], 10);
    const b = parseInt(rgbMatch[3], 10);
    if (!Number.isNaN(r) && !Number.isNaN(g) && !Number.isNaN(b)) {
      return `rgba(${r}, ${g}, ${b}, ${safeAlpha})`;
    }
  }

  // 3. Fallback for valid named colors or CSS variables
  return str;
}

const AuraVisualizerCanvasInner: React.FC<AuraVisualizerCanvasProps> = ({
  item,
  size = 180,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hasCanvasError, setHasCanvasError] = useState(false);

  const safeSize = Math.max(40, Math.min(600, Number.isFinite(size) ? size : 180));

  useEffect(() => {
    if (!item) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    let animId: number | null = null;
    let time = 0;
    let isPaused = false;
    let renderFn: (() => void) | null = null;

    const handleVisibilityChange = () => {
      isPaused = document.hidden;
      if (!isPaused && animId === null && renderFn) {
        animId = requestAnimationFrame(renderFn);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    try {
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setHasCanvasError(true);
        return () => {
          document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
      }

      // High-DPI support for ultra crisp rendering
      const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1;
      canvas.width = safeSize * dpr;
      canvas.height = safeSize * dpr;
      ctx.scale(dpr, dpr);

      const rarityKey = item.rarity || 'common';
      const config = RARITIES[rarityKey] || RARITIES.common;
      const rank = getRarityTierRank(rarityKey);

      const primaryColor = parseColorToRgba(config.accentColor || '#a855f7', 1);
      const glowColor = parseColorToRgba(config.glowColor || config.accentColor || '#9333ea', 0.85);
      const ambientColor = parseColorToRgba(config.accentColor || '#a855f7', 0.28);
      const ringColor = parseColorToRgba(config.accentColor || '#a855f7', 0.45);
      const outerRingColor = parseColorToRgba(config.glowColor || '#9333ea', 0.35);

      // Responsive particle count based on size & screen
      const particleCount = safeSize < 80 ? 12 : safeSize < 160 ? 20 : 28;
      const particles = Array.from({ length: particleCount }).map((_, i) => ({
        angle: (i / particleCount) * Math.PI * 2,
        radius: 8 + Math.random() * (safeSize * 0.38),
        speed: (0.012 + Math.random() * 0.022) * (i % 2 === 0 ? 1 : -1),
        size: 1.2 + Math.random() * 2.4,
        pulseSpeed: 0.03 + Math.random() * 0.04,
        opacity: 0.4 + Math.random() * 0.6,
        sparkle: Math.random() > 0.5,
      }));

      // Extra cosmic stardust embers for high tiers
      const emberCount = rank >= 5 ? 8 : 0;
      const embers = Array.from({ length: emberCount }).map(() => ({
        x: (Math.random() - 0.5) * safeSize * 0.7,
        y: (Math.random() - 0.5) * safeSize * 0.7,
        vy: -0.3 - Math.random() * 0.4,
        vx: (Math.random() - 0.5) * 0.3,
        size: 0.8 + Math.random() * 1.5,
        alpha: 0.2 + Math.random() * 0.8,
      }));

      const render = () => {
        if (isPaused) {
          animId = null;
          return;
        }
        try {
          time += 1;
          ctx.clearRect(0, 0, safeSize, safeSize);

          const cx = safeSize / 2;
          const cy = safeSize / 2;

          // 1. Central Ambient Nebula Flare
          const gradRadius = Math.max(1, safeSize * 0.48);
          const ambientGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, gradRadius);
          ambientGrad.addColorStop(0, ambientColor);
          ambientGrad.addColorStop(0.5, parseColorToRgba(config.glowColor, 0.15));
          ambientGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = ambientGrad;
          ctx.beginPath();
          ctx.arc(cx, cy, gradRadius, 0, Math.PI * 2);
          ctx.fill();

          // 2. Cosmic Wave Ripple (Expanding energy pulse)
          const pulsePhase = (time * 0.015) % 1;
          const rippleRadius = pulsePhase * (safeSize * 0.42);
          const rippleAlpha = (1 - pulsePhase) * 0.35;
          ctx.strokeStyle = parseColorToRgba(config.accentColor, rippleAlpha);
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(cx, cy, Math.max(1, rippleRadius), 0, Math.PI * 2);
          ctx.stroke();

          // 3. Orbital Celestial Rings
          const ringPulse = Math.sin(time * 0.04) * 3.5;
          const rx1 = Math.max(2, (safeSize * 0.36) + ringPulse);
          const ry1 = Math.max(2, (safeSize * 0.18) + ringPulse * 0.5);

          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(time * 0.009);
          ctx.strokeStyle = ringColor;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.ellipse(0, 0, rx1, ry1, time * 0.018, 0, Math.PI * 2);
          ctx.stroke();

          const rx2 = Math.max(2, (safeSize * 0.32) - ringPulse);
          const ry2 = Math.max(2, (safeSize * 0.14) - ringPulse * 0.5);
          ctx.rotate(Math.PI / 3);
          ctx.strokeStyle = outerRingColor;
          ctx.beginPath();
          ctx.ellipse(0, 0, rx2, ry2, -time * 0.012, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();

          // 4. Stellar Rays / Diffraction Spikes for higher rarities
          if (rank >= 4 && safeSize >= 60) {
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(time * 0.006);
            const rayLen = safeSize * 0.42;
            const rayGrad = ctx.createLinearGradient(-rayLen, 0, rayLen, 0);
            rayGrad.addColorStop(0, 'rgba(255,255,255,0)');
            rayGrad.addColorStop(0.5, parseColorToRgba(config.accentColor, 0.45));
            rayGrad.addColorStop(1, 'rgba(255,255,255,0)');

            ctx.strokeStyle = rayGrad;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(-rayLen, 0);
            ctx.lineTo(rayLen, 0);
            ctx.moveTo(0, -rayLen);
            ctx.lineTo(0, rayLen);
            ctx.stroke();

            // Diagonal rays for Godly / Singularity / Nani
            if (rank >= 8) {
              const diagLen = rayLen * 0.7;
              ctx.beginPath();
              ctx.moveTo(-diagLen, -diagLen);
              ctx.lineTo(diagLen, diagLen);
              ctx.moveTo(-diagLen, diagLen);
              ctx.lineTo(diagLen, -diagLen);
              ctx.stroke();
            }
            ctx.restore();
          }

          // 5. Floating Cosmic Embers
          embers.forEach((emb) => {
            emb.y += emb.vy;
            emb.x += emb.vx;
            if (emb.y < -safeSize * 0.4) {
              emb.y = safeSize * 0.35;
              emb.x = (Math.random() - 0.5) * safeSize * 0.6;
            }
            const px = cx + emb.x;
            const py = cy + emb.y;
            ctx.fillStyle = parseColorToRgba('#ffffff', emb.alpha);
            ctx.beginPath();
            ctx.arc(px, py, emb.size, 0, Math.PI * 2);
            ctx.fill();
          });

          // 6. Swirling Orbiting Aura Particles
          particles.forEach((p, idx) => {
            p.angle += p.speed;
            const curRadius = Math.max(2, p.radius + Math.sin(time * p.pulseSpeed + idx) * 5);
            const px = cx + Math.cos(p.angle) * curRadius;
            const py = cy + Math.sin(p.angle) * (curRadius * 0.82);

            const pRadius = Math.max(0.6, p.size * (1 + Math.sin(time * 0.08 + idx) * 0.3));
            const pGrad = ctx.createRadialGradient(px, py, 0.1, px, py, pRadius * 1.8);
            pGrad.addColorStop(0, '#ffffff');
            pGrad.addColorStop(0.35, primaryColor);
            pGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

            ctx.fillStyle = pGrad;
            ctx.beginPath();
            ctx.arc(px, py, pRadius * 1.8, 0, Math.PI * 2);
            ctx.fill();
          });

          // 7. Dynamic Central Energy Singularity Core
          const corePulse = Math.sin(time * 0.09) * 3;
          const coreSize = Math.max(4, (safeSize < 80 ? 8 : 13) + corePulse);
          const coreGrad = ctx.createRadialGradient(cx, cy, 0.1, cx, cy, coreSize);
          coreGrad.addColorStop(0, '#ffffff');
          coreGrad.addColorStop(0.4, '#ffffff');
          coreGrad.addColorStop(0.75, glowColor);
          coreGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

          ctx.fillStyle = coreGrad;
          ctx.beginPath();
          ctx.arc(cx, cy, coreSize, 0, Math.PI * 2);
          ctx.fill();

          animId = requestAnimationFrame(render);
        } catch (renderError) {
          console.warn('Canvas frame render error:', renderError);
          setHasCanvasError(true);
        }
      };

      renderFn = render;
      render();
    } catch (setupError) {
      console.warn('Canvas visualizer setup error:', setupError);
      setHasCanvasError(true);
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (animId !== null) {
        cancelAnimationFrame(animId);
      }
    };
  }, [item?.id, item?.rarity, safeSize]);

  if (!item) return null;

  const config = RARITIES[item.rarity] || RARITIES.common;
  const accent = config.accentColor || '#a855f7';

  // Graceful CSS-animated fallback if canvas context is unavailable or errored
  if (hasCanvasError) {
    return (
      <div
        className={`relative flex items-center justify-center pointer-events-none ${className}`}
        style={{ width: `${safeSize}px`, height: `${safeSize}px` }}
      >
        <div
          className="absolute inset-4 rounded-full opacity-40 blur-xl animate-pulse"
          style={{ background: accent }}
        />
        <div
          className="absolute inset-8 rounded-full border border-white/20 opacity-60 animate-spin"
          style={{ borderColor: accent, animationDuration: '6s' }}
        />
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none gpu-accelerated ${className}`}
      style={{ width: `${safeSize}px`, height: `${safeSize}px` }}
    />
  );
};

export const AuraVisualizerCanvas: React.FC<AuraVisualizerCanvasProps> = (props) => {
  const fallbackSize = props.size || 180;
  const accent = (props.item && RARITIES[props.item.rarity]?.accentColor) || '#a855f7';

  return (
    <ErrorBoundary
      fallback={
        <div
          className={`relative flex items-center justify-center pointer-events-none ${props.className || ''}`}
          style={{ width: `${fallbackSize}px`, height: `${fallbackSize}px` }}
        >
          <div
            className="absolute inset-4 rounded-full opacity-40 blur-xl animate-pulse"
            style={{ background: accent }}
          />
        </div>
      }
    >
      <AuraVisualizerCanvasInner {...props} />
    </ErrorBoundary>
  );
};

