import React from 'react';
import { GameState } from '../types';
import { RARITIES, RARITY_ORDER } from '../data/rarities';
import { ITEMS } from '../data/items';
import { formatPercentageSafe, formatBigNumber } from '../utils/rngEngine';
import { BarChart3, Coins, Flame, Sparkles, Trophy, Clover } from 'lucide-react';

interface StatsModalProps {
  gameState: GameState;
  onClose: () => void;
}

export const StatsModal: React.FC<StatsModalProps> = ({ gameState, onClose }) => {
  const totalRolls = Math.max(1, gameState.totalRolls);
  const discoveredCount = Object.keys(gameState.inventory).length;
  const totalItems = ITEMS.length;
  const totalRollsEarned = gameState.stats.totalRollsEarned ?? gameState.stats.totalCoinsEarned ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
      <div className="relative flex max-h-[85vh] w-full max-w-xl flex-col rounded-2xl border border-white/10 bg-[#0c0c0e] p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-purple-500/30 bg-purple-500/10">
              <BarChart3 className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">RNG Analytics & Probability Matrix</h2>
              <p className="text-xs text-white/50">Comprehensive drop rates and statistical distribution across all 100 rarity tiers</p>
            </div>
          </div>

          <button
            id="close-stats-btn"
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/40 hover:bg-white/10 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Overview Stats Cards */}
        <div className="my-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-left">
            <span className="text-[10px] font-mono uppercase tracking-wider text-white/40">Total Cycles</span>
            <p className="text-base font-mono font-bold text-white">{formatBigNumber(gameState.totalRolls)}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-left">
            <span className="text-[10px] font-mono uppercase tracking-wider text-white/40">Discovered</span>
            <p className="text-base font-mono font-bold text-purple-300">
              {discoveredCount} / {totalItems}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-left">
            <span className="text-[10px] font-mono uppercase tracking-wider text-white/40">Rolls Currency</span>
            <p className="text-base font-mono font-bold text-cyan-300">
              {formatBigNumber(totalRollsEarned)}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-left">
            <span className="text-[10px] font-mono uppercase tracking-wider text-white/40">Total Essence</span>
            <p className="text-base font-mono font-bold text-purple-400">
              {formatBigNumber(gameState.stats.totalEssenceEarned)}
            </p>
          </div>
        </div>

        {/* Tier Distribution Table */}
        <div className="flex-1 overflow-y-auto">
          <h3 className="mb-2.5 text-xs font-mono font-bold uppercase tracking-widest text-white/50">
            Rarity Pull Distribution (All 100 Tiers)
          </h3>
          <div className="flex flex-col gap-2">
            {RARITY_ORDER.map((tier) => {
              const config = RARITIES[tier];
              const rolls = gameState.stats.rollsByRarity[tier] || 0;
              const percentNum = (rolls / totalRolls) * 100;
              const formattedPercent = formatPercentageSafe(percentNum, rolls, totalRolls);

              return (
                <div
                  key={tier}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`inline-block h-3 w-3 rounded-full border ${config.badgeBorder}`}
                      style={{ backgroundColor: config.accentColor }}
                    />
                    <div>
                      <span className={`font-bold ${config.textColor}`}>{config.name}</span>
                      <span className="ml-2 text-[10px] font-mono text-white/40">Base: {config.oneInChance}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="font-mono font-bold text-white">{formatBigNumber(rolls)} pulls</span>
                      <span className="ml-2 text-[11px] font-mono text-purple-300 font-semibold">({formattedPercent})</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
