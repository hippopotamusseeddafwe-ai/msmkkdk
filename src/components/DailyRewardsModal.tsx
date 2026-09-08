import React, { useState, useEffect } from 'react';
import { GameState, DailyRewardTier } from '../types';
import {
  DAILY_REWARDS_CONFIG,
  getTodayDateString,
  isDailyRewardEligible,
  getNextStreakDay,
} from '../data/dailyRewards';
import { sound } from '../utils/audio';
import { motion, AnimatePresence } from 'motion/react';
import {
  Gift,
  Coins,
  Flame,
  Dices,
  Sparkles,
  CheckCircle2,
  Clock,
  Zap,
  Calendar,
  Award,
  FlaskConical,
  Crown,
  ChevronRight,
} from 'lucide-react';

interface DailyRewardsModalProps {
  gameState: GameState;
  onClose: () => void;
  onClaimReward: (reward: DailyRewardTier, launchImmediateRolls: boolean) => void;
  onUseFreeTokens: (count: number) => void;
}

export const DailyRewardsModal: React.FC<DailyRewardsModalProps> = ({
  gameState,
  onClose,
  onClaimReward,
  onUseFreeTokens,
}) => {
  const lastClaim = gameState.dailyRewards?.lastClaimDate || null;
  const isEligible = isDailyRewardEligible(lastClaim);
  const currentStreak = gameState.dailyRewards?.streakDays || 1;
  const effectiveDay = isEligible
    ? getNextStreakDay(lastClaim, currentStreak)
    : currentStreak;

  const currentTier =
    DAILY_REWARDS_CONFIG.find((t) => t.day === effectiveDay) ||
    DAILY_REWARDS_CONFIG[0];

  // Live countdown to next midnight UTC / local
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number }>({
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const diff = Math.max(0, tomorrow.getTime() - now.getTime());
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ hours, minutes, seconds });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleClaim = (instantRoll: boolean) => {
    if (!isEligible) return;
    sound.playButtonClick();
    onClaimReward(currentTier, instantRoll);
  };

  const freeTokens = gameState.dailyRewards?.freeRollTokens || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0 }}
        className="relative flex max-h-[92vh] w-full max-w-2xl flex-col rounded-3xl border border-white/15 bg-[#0c0c0e] p-6 shadow-2xl overflow-hidden backdrop-blur-xl sm:p-7"
      >
        {/* Background glow header */}
        <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-48 bg-purple-600/20 rounded-full blur-3xl" />

        {/* Modal Top Header */}
        <div className="relative z-10 flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-purple-500/30 bg-purple-500/10 shadow-lg shadow-purple-500/20 text-purple-400">
              <Gift className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Daily Protocol Bonus
                </h2>
                <span className="rounded-md border border-purple-500/30 bg-purple-500/20 px-2 py-0.5 text-[10px] font-mono font-bold text-purple-300">
                  DAY {effectiveDay} / 7
                </span>
              </div>
              <p className="text-xs text-white/50">
                Log in daily to claim free lucky rolls, bonus currency, essence, and astral elixirs
              </p>
            </div>
          </div>

          <button
            id="close-daily-modal-btn"
            onClick={() => {
              sound.playButtonClick();
              onClose();
            }}
            className="rounded-xl border border-white/10 bg-white/5 p-2 text-white/40 hover:bg-white/10 hover:text-white transition"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Reward Track Grid */}
        <div className="relative z-10 my-4 flex-1 overflow-y-auto pr-1">
          {/* Streak Status Banner */}
          <div className="mb-4 flex flex-col justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-mono font-semibold uppercase tracking-wider text-white/40">
                  Current Login Streak
                </p>
                <p className="text-sm font-bold text-white flex items-center gap-1.5">
                  <span className="text-amber-300 font-mono text-base">{currentStreak}</span> Consecutive Days
                  {currentStreak >= 7 && <Crown className="h-4 w-4 text-amber-400" />}
                </p>
              </div>
            </div>

            {/* Countdown / Ready badge */}
            <div className="flex items-center gap-2">
              {isEligible ? (
                <span className="flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/20 px-3.5 py-1.5 text-xs font-mono font-bold text-emerald-300 shadow-sm animate-pulse">
                  <Sparkles className="h-3.5 w-3.5" /> REWARD READY!
                </span>
              ) : (
                <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs font-mono text-white/70">
                  <Clock className="h-3.5 w-3.5 text-purple-400" />
                  <span>
                    Next in {String(timeLeft.hours).padStart(2, '0')}h{' '}
                    {String(timeLeft.minutes).padStart(2, '0')}m{' '}
                    {String(timeLeft.seconds).padStart(2, '0')}s
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 7-Day Matrix */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {DAILY_REWARDS_CONFIG.map((tier) => {
              const isPast = !isEligible ? tier.day <= effectiveDay : tier.day < effectiveDay;
              const isCurrent = isEligible && tier.day === effectiveDay;
              const isGrand = tier.day === 7;

              return (
                <div
                  key={tier.day}
                  className={`relative flex flex-col justify-between rounded-2xl border p-3.5 text-center transition-all ${
                    isCurrent
                      ? 'border-purple-500 bg-gradient-to-b from-purple-950/40 to-blue-950/40 shadow-lg shadow-purple-500/20 ring-1 ring-purple-400/50'
                      : isPast
                      ? 'border-white/5 bg-white/[0.01] opacity-50'
                      : 'border-white/10 bg-white/[0.03]'
                  } ${isGrand ? 'col-span-2 sm:col-span-4 lg:col-span-1' : ''}`}
                >
                  {/* Top Day Badge */}
                  <div className="flex items-center justify-between text-[11px] font-mono font-bold">
                    <span
                      className={
                        isCurrent
                          ? 'text-purple-300'
                          : isPast
                          ? 'text-emerald-400'
                          : 'text-white/40'
                      }
                    >
                      DAY {tier.day}
                    </span>
                    {isPast && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />}
                    {isCurrent && <Sparkles className="h-3.5 w-3.5 text-purple-400 animate-spin" />}
                    {isGrand && !isPast && <Crown className="h-3.5 w-3.5 text-amber-400" />}
                  </div>

                  {/* Rolls visual icon */}
                  <div className="my-2.5 flex flex-col items-center">
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-xl border ${
                        isCurrent
                          ? 'border-purple-400/40 bg-purple-500/20 text-purple-300'
                          : isGrand
                          ? 'border-amber-400/40 bg-amber-500/20 text-amber-300'
                          : 'border-white/10 bg-white/5 text-white/70'
                      }`}
                    >
                      <Dices className="h-5 w-5" />
                    </div>
                    <span className="mt-1.5 font-mono text-sm font-black text-white">
                      +{tier.freeRolls} Rolls
                    </span>
                  </div>

                  {/* Rewards Breakdown */}
                  <div className="flex flex-col gap-1 border-t border-white/5 pt-2 text-[10px] font-mono">
                    <span className="flex items-center justify-center gap-1 font-bold text-cyan-300">
                      <Dices className="h-2.5 w-2.5" /> +{(tier as any).rolls ?? tier.coins} Rolls
                    </span>
                    <span className="flex items-center justify-center gap-1 font-bold text-purple-300">
                      <Flame className="h-2.5 w-2.5" /> +{tier.essence}
                    </span>
                    {tier.potionReward && (
                      <span className="flex items-center justify-center gap-1 text-[9px] font-bold text-emerald-300 truncate">
                        <FlaskConical className="h-2.5 w-2.5 flex-shrink-0" />
                        <span>{tier.potionReward.luckMultiplier}x Elixir</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Free Rolls Token Reserve Panel */}
          {freeTokens > 0 && (
            <div className="mt-4 flex flex-col justify-between gap-3 rounded-2xl border border-purple-500/30 bg-purple-950/20 p-4 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-purple-500/40 bg-purple-500/20 text-purple-300">
                  <Zap className="h-5 w-5 fill-purple-400" />
                </div>
                <div>
                  <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-purple-300">
                    Free Lucky Roll Tokens Available
                  </h4>
                  <p className="text-xs text-white/60">
                    You have <span className="font-bold text-white font-mono">{freeTokens}</span> free tokens ready to spin in the Roll Station.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  id="use-10-free-tokens-btn"
                  onClick={() => {
                    sound.playButtonClick();
                    onUseFreeTokens(Math.min(10, freeTokens));
                    onClose();
                  }}
                  className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 px-4 py-2 text-xs font-mono font-bold text-white shadow-md shadow-purple-600/30 transition hover:scale-105 active:scale-95"
                >
                  <Dices className="h-3.5 w-3.5" />
                  <span>Spin {Math.min(10, freeTokens)} Free Rolls</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Actions */}
        <div className="relative z-10 flex flex-col gap-2.5 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-white/40">
            {isEligible ? (
              <span>Claim today's Day {effectiveDay} rewards now!</span>
            ) : (
              <span>Return tomorrow to extend your streak and unlock Day {effectiveDay >= 7 ? 1 : effectiveDay + 1} rewards.</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isEligible ? (
              <>
                <button
                  id="claim-daily-reward-btn"
                  onClick={() => handleClaim(false)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-white/10 hover:bg-white/15 px-5 py-3 text-xs font-bold text-white transition border border-white/15 active:scale-95 sm:flex-initial"
                >
                  <Gift className="h-4 w-4 text-purple-400" />
                  <span>Claim to Storage</span>
                </button>

                <button
                  id="claim-and-instant-roll-btn"
                  onClick={() => handleClaim(true)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-purple-600/40 transition hover:scale-105 active:scale-95 sm:flex-initial"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>Claim & Roll +{currentTier.freeRolls} Free Now!</span>
                </button>
              </>
            ) : (
              <button
                id="daily-claimed-close-btn"
                onClick={() => {
                  sound.playButtonClick();
                  onClose();
                }}
                className="w-full sm:w-auto rounded-xl bg-white/10 px-6 py-2.5 text-xs font-bold text-white transition hover:bg-white/15"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
