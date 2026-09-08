import React, { useEffect } from 'react';
import { RollResult, Item } from '../types';
import { RARITIES, isRarityAtLeast } from '../data/rarities';
import { formatMoneyMultiplier } from '../utils/rngEngine';
import { DynamicIcon } from './DynamicIcon';
import { AuraVisualizer } from './AuraVisualizer';
import confetti from 'canvas-confetti';
import { Sparkles, CheckCircle2, Trophy, Zap, Share2, Coins } from 'lucide-react';
import { motion } from 'motion/react';

interface DropCelebrationModalProps {
  rollResult: RollResult | null;
  onClose: () => void;
  onEquipItem: (itemId: string) => void;
}

export const DropCelebrationModal: React.FC<DropCelebrationModalProps> = ({
  rollResult,
  onClose,
  onEquipItem,
}) => {
  useEffect(() => {
    if (!rollResult) return;

    const rarity = rollResult.item.rarity;
    if (isRarityAtLeast(rarity, 'legendary')) {
      const colors =
        rarity === 'legendary'
          ? ['#fbbf24', '#f59e0b', '#d97706', '#ffffff']
          : ['#f43f5e', '#8b5cf6', '#06b6d4', '#eab308', '#ec4899', '#10b981', '#6366f1'];

      confetti({
        particleCount: 120,
        spread: 90,
        origin: { y: 0.6 },
        colors,
        disableForReducedMotion: true,
      });

      const timer = setTimeout(() => {
        confetti({
          particleCount: 80,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors,
        });
        confetti({
          particleCount: 80,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors,
        });
      }, 350);

      return () => clearTimeout(timer);
    }
  }, [rollResult]);

  if (!rollResult) return null;

  const item = rollResult.item;
  const config = RARITIES[item.rarity];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
      {/* Radiant Background Aura Halo */}
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background: `radial-gradient(circle at center, ${config.glowColor} 0%, transparent 70%)`,
        }}
      />

      <motion.div
        initial={{ scale: 0.7, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        className="relative z-10 flex w-full max-w-lg flex-col items-center rounded-3xl border border-white/20 bg-[#0c0c0e] p-8 text-center shadow-2xl backdrop-blur-xl"
        style={{
          boxShadow: `0 0 60px ${config.glowColor}`,
        }}
      >
        {/* Celebration Eyebrow */}
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-purple-400 animate-bounce" />
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-purple-300">
            {config.isRainbow ? 'TRANSCENDENT ASCENSION' : 'RARE MANIFESTATION'}
          </span>
          <Trophy className="h-4 w-4 text-purple-400 animate-bounce" />
        </div>

        {/* Aura Sphere Container */}
        <div className="relative my-5 flex h-48 w-48 items-center justify-center sm:h-56 sm:w-56">
          <AuraVisualizer item={item} size={220} className="absolute inset-0" />
          <div
            className={`flex h-24 w-24 items-center justify-center rounded-2xl border-2 p-2 shadow-2xl backdrop-blur-md ${config.badgeBorder} ${config.badgeBg}`}
            style={{ boxShadow: `0 0 40px ${config.glowColor}` }}
          >
            <DynamicIcon name={item.icon} size={48} className={config.textColor} />
          </div>
        </div>

        {/* Rarity Tag */}
        <span
          className={`rounded-full border px-3.5 py-1 text-xs font-mono font-bold uppercase tracking-wider ${config.badgeBorder} ${config.badgeBg} ${config.textColor}`}
        >
          {config.name} • {config.oneInChance}
        </span>

        {/* Item Name */}
        <h2 className="mt-2.5 text-2xl font-black text-white sm:text-3xl tracking-tight">
          {item.name}
        </h2>

        {/* Lore / Story */}
        <p className="mt-2 max-w-md text-xs leading-relaxed text-white/60 sm:text-sm">
          {item.lore}
        </p>

        {/* Luck & Money Multiplier at roll indicator */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="text-white/40 uppercase text-[10px] tracking-wider font-semibold">Luck Multiplier:</span>
            <span className="font-bold text-emerald-400">{(rollResult?.luckAtRoll ?? 1).toFixed(2)}x</span>
          </div>
          {item.moneyMultiplier && item.moneyMultiplier > 1 && (
            <div className="flex items-center gap-1.5 border-l border-white/10 pl-3">
              <Coins className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-white/40 uppercase text-[10px] tracking-wider font-semibold">Roll Money:</span>
              <span className="font-bold text-amber-300">{formatMoneyMultiplier(item.moneyMultiplier)}</span>
            </div>
          )}
          {rollResult.isCrit && (
            <span className="flex items-center gap-1 font-bold text-amber-300 border-l border-white/10 pl-3">
              <Zap className="h-3 w-3 fill-amber-400" /> CRIT
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="mt-6 flex w-full flex-col gap-2.5 sm:flex-row">
          <button
            id="celebration-equip-btn"
            onClick={() => {
              onEquipItem(item.id);
              onClose();
            }}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 py-3.5 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-purple-600/30 transition hover:scale-105 active:scale-95"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>Equip Aura & Continue</span>
          </button>

          <button
            id="celebration-close-btn"
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-white/5 px-6 py-3.5 text-xs font-semibold text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            Keep Rolling
          </button>
        </div>
      </motion.div>
    </div>
  );
};
