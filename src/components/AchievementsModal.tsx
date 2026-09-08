import React from 'react';
import { GameState, Achievement } from '../types';
import { ACHIEVEMENTS } from '../data/upgrades';
import { DynamicIcon } from './DynamicIcon';
import { Award, CheckCircle2, Dices, Flame, Gift } from 'lucide-react';

interface AchievementsModalProps {
  gameState: GameState;
  onClose: () => void;
  onClaimAchievement: (achievement: Achievement) => void;
}

export const AchievementsModal: React.FC<AchievementsModalProps> = ({
  gameState,
  onClose,
  onClaimAchievement,
}) => {
  const isUnlocked = (ach: Achievement): boolean => {
    if (gameState.unlockedAchievements.includes(ach.id)) return true;

    if (ach.type === 'rolls') {
      return gameState.totalRolls >= (ach.targetValue as number);
    }
    if (ach.type === 'coins') {
      const earned = gameState.stats.totalRollsEarned ?? gameState.stats.totalCoinsEarned ?? 0;
      return earned >= (ach.targetValue as number);
    }
    if (ach.type === 'rarity') {
      const requiredRarity = ach.targetValue as string;
      return (
        Boolean(gameState.stats.rollsByRarity[requiredRarity as any]) &&
        gameState.stats.rollsByRarity[requiredRarity as any] > 0
      );
    }
    return false;
  };

  const isClaimed = (achId: string): boolean => {
    return gameState.unlockedAchievements.includes(achId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
      <div className="relative flex max-h-[85vh] w-full max-w-xl flex-col rounded-2xl border border-white/10 bg-[#0c0c0e] p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-purple-500/30 bg-purple-500/10">
              <Award className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Milestone Directives & Quests</h2>
              <p className="text-xs text-white/50">
                Unlock bounties and claim Rolls currency and Astral Essence
              </p>
            </div>
          </div>

          <button
            id="close-achievements-btn"
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/40 hover:bg-white/10 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Achievements List */}
        <div className="my-4 flex flex-1 flex-col gap-2.5 overflow-y-auto pr-1">
          {ACHIEVEMENTS.map((ach) => {
            const unlocked = isUnlocked(ach);
            const claimed = isClaimed(ach.id);

            return (
              <div
                key={ach.id}
                className={`flex items-center justify-between rounded-2xl border p-4 transition ${
                  claimed
                    ? 'border-white/5 bg-white/[0.02] opacity-60'
                    : unlocked
                    ? 'border-purple-500/40 bg-purple-950/20'
                    : 'border-white/10 bg-white/[0.03]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl border ${
                      claimed
                        ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-400'
                        : unlocked
                        ? 'border-amber-500/40 bg-amber-950/40 text-amber-400 animate-pulse'
                        : 'border-white/10 bg-white/5 text-white/40'
                    }`}
                  >
                    <DynamicIcon name={ach.icon} size={20} />
                  </div>

                  <div>
                    <h3 className="text-xs font-bold text-white sm:text-sm">{ach.name}</h3>
                    <p className="text-[11px] text-white/50 sm:text-xs">{ach.description}</p>
                    {/* Rewards pill */}
                    <div className="mt-1.5 flex items-center gap-2 text-[11px] font-mono font-bold">
                      <span className="flex items-center gap-1 text-cyan-300">
                        <Dices className="h-3 w-3 text-cyan-400" />
                        +{(ach as any).rewardRolls ?? ach.rewardCoins} Rolls
                      </span>
                      <span className="flex items-center gap-1 text-purple-300">
                        <Flame className="h-3 w-3 text-purple-400" />
                        +{ach.rewardEssence}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Claim or Status Button */}
                <div>
                  {claimed ? (
                    <span className="inline-flex items-center gap-1 rounded-xl bg-emerald-500/10 px-3 py-1.5 text-xs font-mono font-bold text-emerald-300 border border-emerald-500/20">
                      <CheckCircle2 className="h-3.5 w-3.5" /> CLAIMED
                    </span>
                  ) : unlocked ? (
                    <button
                      id={`claim-ach-${ach.id}-btn`}
                      onClick={() => onClaimAchievement(ach)}
                      className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-purple-600/30 transition hover:scale-105"
                    >
                      <Gift className="h-3.5 w-3.5" />
                      <span>CLAIM</span>
                    </button>
                  ) : (
                    <span className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-mono font-medium text-white/30">
                      LOCKED
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
