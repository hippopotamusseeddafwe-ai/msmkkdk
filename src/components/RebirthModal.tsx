import React from 'react';
import { GameState, RarityTier } from '../types';
import { getRebirthRequirements, formatBigNumber } from '../utils/rngEngine';
import { RARITY_MIN_REBIRTH } from '../data/items';
import { RARITIES } from '../data/rarities';
import { sound } from '../utils/audio';
import {
  Sparkles,
  RefreshCw,
  Zap,
  Layers,
  Crown,
  AlertTriangle,
  ArrowRight,
  Lock,
  Flame,
  CheckCircle2,
  X,
  Shield,
  Unlock,
} from 'lucide-react';

interface RebirthModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameState: GameState;
  onRebirth: () => void;
}

export const RebirthModal: React.FC<RebirthModalProps> = ({
  isOpen,
  onClose,
  gameState,
  onRebirth,
}) => {
  if (!isOpen) return null;

  const currentRebirth = gameState.rebirthLevel || 0;
  const currentRolls = gameState.rolls ?? gameState.coins ?? 0;
  const totalSpins = gameState.totalRolls || 0;
  const reqs = getRebirthRequirements(currentRebirth);

  const canAffordRolls = currentRolls >= reqs.requiredRolls;
  const canAffordSpins = totalSpins >= reqs.requiredSpins;
  const isEligible = canAffordRolls && canAffordSpins && !reqs.isMaxed;

  const rollsProgress = Math.min(100, Math.floor((currentRolls / (reqs.requiredRolls || 1)) * 100));
  const spinsProgress = Math.min(100, Math.floor((totalSpins / (reqs.requiredSpins || 1)) * 100));

  // Find newly unlocked rarities at next level
  const nextUnlockedTiers = (Object.entries(RARITY_MIN_REBIRTH) as [RarityTier, number][])
    .filter(([_, minRb]) => minRb === reqs.nextRebirth)
    .map(([tier]) => RARITIES[tier])
    .filter(Boolean);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4 backdrop-blur-md animate-fade-in">
      <div
        id="rebirth-modal-card"
        className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-purple-500/40 bg-[#0d0d12] p-4 sm:p-5 text-white shadow-2xl shadow-purple-950/50 scrollbar-thin"
      >
        {/* Close Button */}
        <button
          id="close-rebirth-modal-btn"
          onClick={() => {
            sound.playButtonClick();
            onClose();
          }}
          className="absolute top-3.5 right-3.5 rounded-full border border-white/10 bg-white/5 p-1.5 text-white/50 transition hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header - Compact */}
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 via-pink-600 to-amber-500 shadow-md">
            <RefreshCw className="h-5 w-5 text-white" />
          </div>
          <div className="pr-6">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black tracking-tight text-white">
                Ascension Rebirth
              </h2>
              <span className="rounded border border-purple-500/40 bg-purple-900/40 px-1.5 py-0.2 text-[10px] font-mono font-bold text-purple-300">
                Lv. {currentRebirth}/100
              </span>
            </div>
            <p className="text-[11px] text-white/50">
              Reset mortal balance & inventory to unlock higher tier rarities.
            </p>
          </div>
        </div>

        {/* Current vs Next Level Preview */}
        <div className="mt-3.5 grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-2.5 text-center">
          <div className="flex flex-col items-center">
            <span className="text-[9px] font-mono uppercase text-white/40 font-bold">Current</span>
            <span className="text-sm font-black text-white/90">
              Rebirth {currentRebirth}
            </span>
            <span className="text-[10px] font-mono text-purple-400">
              +{(currentRebirth * 50)}% Luck
            </span>
          </div>

          <div className="flex flex-col items-center border-l border-white/10">
            <span className="text-[9px] font-mono uppercase text-amber-400 font-bold">Next</span>
            <span className="text-sm font-black text-amber-300">
              {reqs.isMaxed ? 'MAXED (100)' : `Rebirth ${reqs.nextRebirth}`}
            </span>
            <span className="text-[10px] font-mono text-emerald-400 font-bold">
              +{((currentRebirth + 1) * 50)}% Luck
            </span>
          </div>
        </div>

        {/* Newly Unlocked Rarity Banner */}
        {nextUnlockedTiers.length > 0 && (
          <div className="mt-3 rounded-xl border border-emerald-500/40 bg-emerald-950/30 p-2.5 shadow-md">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold font-mono">
              <Unlock className="h-4 w-4" />
              <span>NEW RARITY UNLOCKED AT REBIRTH {reqs.nextRebirth}:</span>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {nextUnlockedTiers.map((tier) => (
                <span
                  key={tier.id}
                  className={`rounded-lg border px-2 py-0.5 text-xs font-mono font-bold uppercase shadow-sm ${tier.badgeBorder} ${tier.badgeBg} ${tier.textColor}`}
                >
                  {tier.name} ({tier.oneInChance})
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Unlocks Summary Grid */}
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2 rounded-lg bg-white/5 p-2">
            <Layers className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
            <div className="min-w-0">
              <p className="font-bold text-white text-[11px] truncate">+200 Items</p>
              <p className="text-[9px] text-white/40 truncate">New Rarity Pool</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-white/5 p-2">
            <Sparkles className="h-3.5 w-3.5 text-purple-400 shrink-0" />
            <div className="min-w-0">
              <p className="font-bold text-white text-[11px] truncate">+1 Shop Upgrade</p>
              <p className="text-[9px] text-white/40 truncate">Rebirth Shop</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-white/5 p-2">
            <Zap className="h-3.5 w-3.5 text-amber-400 shrink-0" />
            <div className="min-w-0">
              <p className="font-bold text-white text-[11px] truncate">+50% Luck</p>
              <p className="text-[9px] text-white/40 truncate">Permanent Boost</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-white/5 p-2">
            <Shield className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
            <div className="min-w-0">
              <p className="font-bold text-white text-[11px] truncate">RB 15 Fix / RB 30 Anti-Shatter</p>
              <p className="text-[9px] text-white/40 truncate">Auto-Recycle / 0% Broken Glass</p>
            </div>
          </div>
        </div>

        {/* Requirements Checklist */}
        {!reqs.isMaxed && (
          <div className="mt-3 flex flex-col gap-2 rounded-xl border border-white/10 bg-white/[0.02] p-2.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">
              Ascension Requirements
            </span>

            {/* Requirement 1: Rolls Money */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="flex items-center gap-1 font-semibold text-white/80">
                  {canAffordRolls ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <Lock className="h-3.5 w-3.5 text-rose-400" />
                  )}
                  Rolls Balance:
                </span>
                <span className="font-mono font-bold text-white text-[11px]">
                  {formatBigNumber(currentRolls)} / {formatBigNumber(reqs.requiredRolls)} Rolls
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className={`h-full transition-all duration-300 ${
                    canAffordRolls ? 'bg-emerald-500' : 'bg-cyan-500'
                  }`}
                  style={{ width: `${rollsProgress}%` }}
                />
              </div>
            </div>

            {/* Requirement 2: Total Spins */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="flex items-center gap-1 font-semibold text-white/80">
                  {canAffordSpins ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <Lock className="h-3.5 w-3.5 text-rose-400" />
                  )}
                  Total Spins:
                </span>
                <span className="font-mono font-bold text-white text-[11px]">
                  {formatBigNumber(totalSpins)} / {formatBigNumber(reqs.requiredSpins)}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className={`h-full transition-all duration-300 ${
                    canAffordSpins ? 'bg-emerald-500' : 'bg-purple-500'
                  }`}
                  style={{ width: `${spinsProgress}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Reset Warning */}
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-amber-200">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[10px] leading-tight">
            <span className="font-bold text-amber-300">Resets Everything:</span> Rolls, inventory, and base shop upgrades reset back to 0. You retain your Rebirth level and permanent rebirth bonuses!
          </p>
        </div>

        {/* Action Button */}
        <div className="mt-4 flex gap-2">
          <button
            id="cancel-rebirth-btn"
            onClick={() => {
              sound.playButtonClick();
              onClose();
            }}
            className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-bold text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            Cancel
          </button>

          {reqs.isMaxed ? (
            <button
              disabled
              className="flex-2 rounded-xl bg-amber-500/20 border border-amber-500/40 py-2.5 text-xs font-black text-amber-300 cursor-not-allowed"
            >
              MAX REBIRTH (100) REACHED
            </button>
          ) : (
            <button
              id="confirm-rebirth-btn"
              disabled={!isEligible}
              onClick={() => {
                sound.playDrop('celestial', true);
                onRebirth();
              }}
              className={`flex-2 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-black tracking-wide transition-all shadow-md ${
                isEligible
                  ? 'bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 text-white shadow-purple-600/30 hover:scale-[1.02] active:scale-95'
                  : 'cursor-not-allowed bg-white/5 border border-white/10 text-white/30'
              }`}
            >
              <span>ASCEND & REBIRTH ({currentRebirth} → {reqs.nextRebirth})</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
