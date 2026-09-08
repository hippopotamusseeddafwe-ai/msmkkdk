import React, { useEffect, useRef, useMemo } from 'react';
import { Item } from '../types';
import { RARITIES } from '../data/rarities';

interface AuraVisualizerProps {
  item?: Item | null;
  items?: (Item | null)[];
  size?: number;
  className?: string;
  isRolling?: boolean;
}

const AuraVisualizerComponent: React.FC<AuraVisualizerProps> = ({
  item,
  items,
  size = 280,
  className = '',
  isRolling = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Normalize equipped items list with memoization to prevent canvas destruction loop
  const activeItems = useMemo(() => {
    return (items && items.length > 0
      ? items.filter((i): i is Item => Boolean(i))
      : item
      ? [item]
      : []
    ).slice(0, 9);
  }, [items, item]);

  const itemsKey = useMemo(() => {
    return activeItems.map((i) => `${i.id}_${i.rarity}`).join('|');
  }, [activeItems]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let tick = 0;

    const primaryItem = activeItems[0] || null;
    const primaryRarity = primaryItem?.rarity || 'common';
    const primaryConfig = RARITIES[primaryRarity] || RARITIES.common;
    const isRainbow = activeItems.some(
      (it) => RARITIES[it.rarity]?.isRainbow || it.auraType === 'rainbow'
    );

    // Optimized particle count for 60fps smoothness
    const baseParticleCount = isRainbow ? 36 : Math.min(50, 14 + activeItems.length * 5);

    const particles = Array.from({ length: baseParticleCount }).map((_, idx) => {
      const assignedItem = activeItems.length > 0 ? activeItems[idx % activeItems.length] : null;
      const assignedConfig = assignedItem ? RARITIES[assignedItem.rarity] || RARITIES.common : RARITIES.common;
      return {
        angle: Math.random() * Math.PI * 2,
        radius: 30 + Math.random() * (size * 0.38),
        speed: (0.01 + Math.random() * 0.02) * (isRolling ? 3.0 : 1),
        size: 2 + Math.random() * 3.5,
        hue: Math.random() * 360,
        opacity: 0.25 + Math.random() * 0.65,
        verticalOffset: (Math.random() - 0.5) * 15,
        color: assignedConfig.accentColor || '#a1a1aa',
      };
    });

    const auraTypesToRender = activeItems.length > 0
      ? activeItems.map((i) => ({ type: i.auraType, color: RARITIES[i.rarity]?.accentColor || '#38bdf8' }))
      : [{ type: 'smoke' as const, color: '#a1a1aa' }];

    const render = () => {
      ctx.clearRect(0, 0, size, size);
      const centerX = size / 2;
      const centerY = size / 2;
      tick++;

      // Background central radial glow
      const radialGradient = ctx.createRadialGradient(
        centerX,
        centerY,
        10,
        centerX,
        centerY,
        size * 0.45
      );

      if (isRainbow) {
        const rainbowHue = (tick * 1.5) % 360;
        radialGradient.addColorStop(0, `hsla(${rainbowHue}, 90%, 65%, 0.4)`);
        radialGradient.addColorStop(0.5, `hsla(${(rainbowHue + 60) % 360}, 80%, 50%, 0.15)`);
        radialGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      } else {
        const accentColor = primaryConfig.accentColor || '#a1a1aa';
        radialGradient.addColorStop(0, `${accentColor}55`);
        radialGradient.addColorStop(0.6, `${accentColor}18`);
        radialGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      }

      ctx.fillStyle = radialGradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, size * 0.45, 0, Math.PI * 2);
      ctx.fill();

      // Render specialized aura visual features
      auraTypesToRender.forEach((aura, idx) => {
        const angleOffset = (idx * Math.PI * 2) / Math.max(1, auraTypesToRender.length);

        if (aura.type === 'flame') {
          for (let f = 0; f < 6; f++) {
            const fAngle = (tick * 0.05 + f * (Math.PI / 3) + angleOffset) % (Math.PI * 2);
            const fDist = 45 + Math.sin(tick * 0.1 + f) * 15;
            const fx = centerX + Math.cos(fAngle) * fDist;
            const fy = centerY + Math.sin(fAngle) * fDist - (tick * 2 + f * 10) % 30;
            ctx.beginPath();
            ctx.arc(fx, fy, 4, 0, Math.PI * 2);
            ctx.fillStyle = `${aura.color}88`;
            ctx.fill();
          }
        } else if (aura.type === 'orbit' || aura.type === 'cosmic' || aura.type === 'quantum') {
          ctx.beginPath();
          ctx.ellipse(centerX, centerY, size * 0.38, size * 0.18, (tick * 0.02 + angleOffset), 0, Math.PI * 2);
          ctx.strokeStyle = `${aura.color}44`;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        } else if (aura.type === 'singularity') {
          ctx.beginPath();
          ctx.arc(centerX, centerY, 20 + Math.sin(tick * 0.08) * 5, 0, Math.PI * 2);
          ctx.strokeStyle = `${aura.color}88`;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      });

      // Draw dynamic floating particles
      particles.forEach((p) => {
        p.angle += p.speed * (isRolling ? 2 : 1);
        const x = centerX + Math.cos(p.angle) * p.radius;
        const y = centerY + Math.sin(p.angle) * (p.radius * 0.75) + Math.sin(tick * 0.05 + p.angle) * 8;

        ctx.beginPath();
        ctx.arc(x, y, p.size, 0, Math.PI * 2);
        if (isRainbow) {
          ctx.fillStyle = `hsla(${(p.hue + tick * 2) % 360}, 85%, 65%, ${p.opacity})`;
        } else {
          ctx.fillStyle = `${p.color}${Math.floor(p.opacity * 255).toString(16).padStart(2, '0')}`;
        }
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [itemsKey, size, isRolling]);

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        className="pointer-events-none absolute inset-0 z-0"
      />
    </div>
  );
};

export const AuraVisualizer = React.memo(AuraVisualizerComponent);
