import React from 'react';
import { Sparkles, Crown, ArrowRight, Layers, Zap, Flame, Unlock } from 'lucide-react';
import { sound } from '../utils/audio';
import { RarityTier } from '../types';
import { RARITY_MIN_REBIRTH } from '../data/items';
import { RARITIES } from '../data/rarities';

interface RebirthCelebrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  newRebirthLevel: number;
}

export const RebirthCelebrationModal: React.FC<RebirthCelebrationModalProps> = ({
  isOpen,
  onClose,
  newRebirthLevel,
}) => {
  if (!isOpen) return null;

  // Newly unlocked rarity tiers at this level
  const unlockedTiers = (Object.entries(RARITY_MIN_REBIRTH) as [RarityTier, number][])
    .filter(([_, minRb]) => minRb === newRebirthLevel)
    .map(([tier]) => RARITIES[tier])
    .filter(Boolean);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-xl animate-fade-in">
      <div
        id="rebirth-celebration-card"
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-amber-500/50 bg-[#0d0a14] p-8 text-center text-white shadow-2xl shadow-purple-950/80 animate-scale-up"
      >
        {/* Glow & particles */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.25)_0%,transparent_70%)]" />

        {/* Icon Badge */}
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-tr from-amber-500 via-pink-600 to-purple-600 shadow-xl shadow-amber-500/30">
          <Crown className="h-10 w-10 text-white animate-bounce" />
        </div>

        <span className="mt-4 inline-block text-[11px] font-mono font-bold uppercase tracking-widest text-amber-400">
          Ascension Complete
        </span>

        <h2 className="mt-1 text-2xl font-black tracking-tight text-white sm:text-3xl">
          REBIRTH {newRebirthLevel} ACHIEVED!
        </h2>

        <p className="mt-2 text-xs text-white/60 leading-relaxed">
          Your mortal ties have been severed and reforged. The cosmos bestows upon you 200 new items and supreme luck harmonics!
        </p>

        {/* Newly Unlocked Rarities Banner */}
        {unlockedTiers.length > 0 && (
          <div className="mt-4 rounded-2xl border border-emerald-500/50 bg-emerald-950/40 p-3 text-left shadow-lg">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold font-mono">
              <Unlock className="h-4 w-4" />
              <span>NEW RARITIES UNLOCKED FOR ROLLING:</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {unlockedTiers.map((tier) => (
                <span
                  key={tier.id}
                  className={`rounded-lg border px-2.5 py-1 text-xs font-mono font-bold uppercase shadow-sm ${tier.badgeBorder} ${tier.badgeBg} ${tier.textColor}`}
                >
                  {tier.name} • {tier.oneInChance}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Perks list */}
        <div className="mt-4 flex flex-col gap-2.5 rounded-2xl border border-amber-500/20 bg-white/5 p-4 text-left text-xs">
          <div className="flex items-center gap-2.5 text-cyan-300">
            <Layers className="h-4 w-4 shrink-0" />
            <span><strong>+200 New Items</strong> added to Roll & Dex pool</span>
          </div>
          <div className="flex items-center gap-2.5 text-purple-300">
            <Sparkles className="h-4 w-4 shrink-0" />
            <span><strong>+1 Rebirth Upgrade</strong> unlocked in Quantum Shop</span>
          </div>
          <div className="flex items-center gap-2.5 text-amber-300">
            <Zap className="h-4 w-4 shrink-0" />
            <span><strong>+{(newRebirthLevel * 50)}% Permanent Luck</strong> multiplier</span>
          </div>
          <div className="flex items-center gap-2.5 text-rose-300">
            <Flame className="h-4 w-4 shrink-0" />
            <span><strong>+{(newRebirthLevel * 150)}% Bonus Rolls</strong> per spin</span>
          </div>
        </div>

        <button
          id="rebirth-celebration-continue-btn"
          onClick={() => {
            sound.playButtonClick();
            onClose();
          }}
          className="mt-6 w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 via-pink-600 to-purple-600 py-3.5 text-sm font-black text-white shadow-lg shadow-purple-600/30 transition hover:scale-[1.02] active:scale-95"
        >
          <span>CLAIM DESTINY & SPIN</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
