import React, { useEffect, useRef } from 'react';
import { BackgroundSettings } from '../types';

interface BackgroundRendererProps {
  settings?: BackgroundSettings;
}

interface Particle {
  x: number;
  y: number;
  radius: number;
  vx: number;
  vy: number;
  alpha: number;
  alphaSpeed: number;
  color: string;
}

const BackgroundRendererComponent: React.FC<BackgroundRendererProps> = ({ settings }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const primary = settings?.primaryColor || '#0f082e';
  const secondary = settings?.secondaryColor || '#2c1266';
  const accent = settings?.accentColor || '#a855f7';
  const darknessPct = (settings?.darkness ?? 25) / 100;
  const pattern = settings?.pattern || 'dots';
  const particlesMode = settings?.particles || 'high';
  const glowIntensity = (settings?.glowIntensity ?? 85) / 100;
  const isAnimated = settings?.animated ?? true;

  // Sync CSS root variables whenever theme colors change
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--theme-primary', primary);
    root.style.setProperty('--theme-secondary', secondary);
    root.style.setProperty('--theme-accent', accent);
    root.style.setProperty('--theme-accent-glow', `${accent}80`);
    root.style.setProperty('--theme-accent-subtle', `${accent}25`);
    root.style.setProperty('--theme-accent-border', `${accent}66`);
    root.style.setProperty(
      '--theme-button-bg',
      `linear-gradient(135deg, ${secondary} 0%, ${accent} 100%)`
    );
  }, [primary, secondary, accent]);

  // Particle Canvas rendering
  useEffect(() => {
    if (particlesMode === 'off') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    const isMobileScreen = window.innerWidth < 640;
    const isTabletScreen = window.innerWidth < 1024;
    const particleMultiplier = isMobileScreen ? 0.4 : isTabletScreen ? 0.7 : 1.0;

    const baseCount =
      particlesMode === 'high' ? 45 : particlesMode === 'medium' ? 24 : 12;
    const particleCount = Math.max(8, Math.round(baseCount * particleMultiplier));

    const colors = [accent, secondary, '#ffffff', accent, '#ffffff'];

    const particles: Particle[] = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 2.0 + 0.8,
      vx: (Math.random() - 0.5) * (isAnimated ? 0.35 : 0),
      vy: (Math.random() - 0.5) * (isAnimated ? 0.35 : 0) - (isAnimated ? 0.15 : 0),
      alpha: Math.random() * 0.7 + 0.3,
      alphaSpeed: (Math.random() * 0.02 + 0.008) * (Math.random() > 0.5 ? 1 : -1),
      color: colors[Math.floor(Math.random() * colors.length)],
    }));

    let isPaused = false;
    const handleVisibility = () => {
      isPaused = document.hidden;
      if (!isPaused && isAnimated && animId === null) {
        lastTime = performance.now();
        animId = requestAnimationFrame(render);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    let lastTime = performance.now();

    const render = (time: number) => {
      if (isPaused) {
        animId = null as any;
        return;
      }
      const dt = Math.min(64, time - lastTime);
      lastTime = time;

      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        if (isAnimated) {
          p.x += p.vx * (dt / 16);
          p.y += p.vy * (dt / 16);
          p.alpha += p.alphaSpeed * (dt / 16);

          if (p.alpha > 0.9) {
            p.alpha = 0.9;
            p.alphaSpeed = -Math.abs(p.alphaSpeed);
          } else if (p.alpha < 0.2) {
            p.alpha = 0.2;
            p.alphaSpeed = Math.abs(p.alphaSpeed);
          }

          if (p.x < -10) p.x = width + 10;
          if (p.x > width + 10) p.x = -10;
          if (p.y < -10) p.y = height + 10;
          if (p.y > height + 10) p.y = -10;
        }

        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha * glowIntensity;
        ctx.shadowBlur = p.radius * 6;
        ctx.shadowColor = p.color;
        ctx.fill();
        ctx.restore();
      });

      if (isAnimated) {
        animId = requestAnimationFrame(render);
      }
    };

    if (isAnimated) {
      animId = requestAnimationFrame(render);
    } else {
      render(performance.now());
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibility);
      if (animId) cancelAnimationFrame(animId);
    };
  }, [particlesMode, accent, secondary, glowIntensity, isAnimated]);

  return (
    <div className="fixed inset-0 pointer-events-none -z-50 overflow-hidden select-none">
      {/* 1. Base Multi-Layer Gradient Canvas */}
      <div
        className="absolute inset-0 transition-all duration-700 ease-out"
        style={{
          background: `radial-gradient(circle at 50% 15%, ${secondary}e6 0%, ${primary} 55%, #050508 100%)`,
        }}
      />

      {/* 2. Vibrant Ambient Radiant Light Blooms */}
      <div
        className={`absolute -top-24 left-1/4 w-[600px] h-[600px] rounded-full blur-[100px] transition-all duration-1000 ${
          isAnimated ? 'animate-pulse' : ''
        }`}
        style={{
          backgroundColor: secondary,
          opacity: 0.55 * glowIntensity,
          animationDuration: '7s',
        }}
      />
      <div
        className={`absolute top-1/4 -right-24 w-[650px] h-[650px] rounded-full blur-[120px] transition-all duration-1000 ${
          isAnimated ? 'animate-pulse' : ''
        }`}
        style={{
          backgroundColor: accent,
          opacity: 0.45 * glowIntensity,
          animationDuration: '9s',
          animationDelay: '1.5s',
        }}
      />
      <div
        className={`absolute -bottom-24 left-1/3 w-[700px] h-[700px] rounded-full blur-[130px] transition-all duration-1000 ${
          isAnimated ? 'animate-pulse' : ''
        }`}
        style={{
          backgroundColor: primary,
          opacity: 0.5 * glowIntensity,
          animationDuration: '11s',
          animationDelay: '3s',
        }}
      />

      {/* 3. Textured Pattern Overlay */}
      {pattern === 'dots' && (
        <div
          className="absolute inset-0 opacity-[0.22]"
          style={{
            backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.45) 1.5px, transparent 1.5px)`,
            backgroundSize: '28px 28px',
          }}
        />
      )}

      {pattern === 'grid' && (
        <div
          className="absolute inset-0 opacity-[0.16]"
          style={{
            backgroundImage: `linear-gradient(to right, rgba(255, 255, 255, 0.3) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.3) 1px, transparent 1px)`,
            backgroundSize: '36px 36px',
          }}
        />
      )}

      {pattern === 'stars' && (
        <div
          className="absolute inset-0 opacity-[0.32]"
          style={{
            backgroundImage: `radial-gradient(1.5px 1.5px at 30px 40px, #fff, rgba(0,0,0,0)), radial-gradient(2px 2px at 90px 140px, ${accent}, rgba(0,0,0,0)), radial-gradient(1px 1px at 170px 85px, #fff, rgba(0,0,0,0)), radial-gradient(2.5px 2.5px at 240px 210px, ${secondary}, rgba(0,0,0,0))`,
            backgroundSize: '260px 260px',
          }}
        />
      )}

      {pattern === 'hex' && (
        <div
          className="absolute inset-0 opacity-[0.14]"
          style={{
            backgroundImage: `radial-gradient(circle at 50% 50%, rgba(255,255,255,0.5) 2px, transparent 2px)`,
            backgroundSize: '28px 28px',
          }}
        />
      )}

      {/* 4. Canvas Floating Particles */}
      {particlesMode !== 'off' && (
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      )}

      {/* 5. Smooth Contrast Dimmer Layer */}
      <div
        className="absolute inset-0 transition-opacity duration-300 pointer-events-none"
        style={{
          backgroundColor: '#000000',
          opacity: darknessPct * 0.45,
        }}
      />
    </div>
  );
};

export const BackgroundRenderer = React.memo(BackgroundRendererComponent);
