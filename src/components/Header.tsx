import React from 'react';
import { GameState } from '../types';
import { CalculatedLuck, formatLuckBonus, formatBigNumber } from '../utils/rngEngine';
import { isDailyRewardEligible } from '../data/dailyRewards';
import { sound } from '../utils/audio';
import { EventStatus, formatEventCountdown } from '../services/eventService';
import { SyncStatus } from '../services/authService';
import { User } from 'firebase/auth';
import {
  Dices,
  Sparkles,
  Volume2,
  VolumeX,
  BarChart3,
  Award,
  RotateCcw,
  Clover,
  Flame,
  Zap,
  Gift,
  Coins,
  Wallet,
  Crown,
  RefreshCw,
  Palette,
  Trophy,
  Swords,
  ArrowLeftRight,
  Cloud,
  User as UserIcon,
  Radio,
  Clock,
} from 'lucide-react';

interface HeaderProps {
  gameState: GameState;
  luckData: CalculatedLuck;
  user?: User | null;
  syncStatus?: SyncStatus;
  eventStatus?: EventStatus;
  onOpenAuth?: () => void;
  onOpenEvent?: () => void;
  onOpenStats: () => void;
  onOpenAchievements: () => void;
  onOpenDailyRewards: () => void;
  onOpenRebirthModal: () => void;
  onOpenReset: () => void;
  onOpenBackgroundCustomizer: () => void;
  onOpenLeaderboard?: () => void;
  onOpenDuel?: () => void;
  onOpenTrade?: () => void;
  onToggleSound: () => void;
  unclaimedAchievementsCount: number;
}

const HeaderComponent: React.FC<HeaderProps> = ({
  gameState,
  luckData,
  user,
  syncStatus = 'guest',
  eventStatus,
  onOpenAuth,
  onOpenEvent,
  onOpenStats,
  onOpenAchievements,
  onOpenDailyRewards,
  onOpenRebirthModal,
  onOpenReset,
  onOpenBackgroundCustomizer,
  onOpenLeaderboard,
  onOpenDuel,
  onOpenTrade,
  onToggleSound,
  unclaimedAchievementsCount,
}) => {
  const activePotionsCount = gameState.activePotions.filter(
    (p) => p.expiresAt > Date.now()
  ).length;

  const isDailyEligible = isDailyRewardEligible(gameState.dailyRewards?.lastClaimDate || null);
  const freeTokens = gameState.dailyRewards?.freeRollTokens || 0;
  const rollsMoney = gameState.rolls ?? gameState.coins ?? 0;
  const rebirthLevel = gameState.rebirthLevel || 0;

  const formattedLuck =
    (luckData?.totalLuck ?? 1) >= 1000
      ? formatLuckBonus(luckData?.totalLuck).replace('+', '')
      : `${(luckData?.totalLuck ?? 1).toFixed(2)}x`;

  return (
    <header className="sticky top-0 z-30 w-full border-b border-white/10 bg-[#0c0c0e]/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-3 py-2.5 sm:px-6 md:px-8">
        {/* Logo / Game Brand */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/25 text-white font-black text-lg sm:text-xl flex-shrink-0">
            <span>Ω</span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <h1 className="font-black text-base sm:text-lg leading-tight tracking-tight text-white">
                RNG OMNI
              </h1>
              <span className="inline-flex items-center rounded-md border border-cyan-500/40 bg-cyan-500/10 px-1.5 py-0.2 text-[9px] font-extrabold text-cyan-300">
                100 RARITIES
              </span>
            </div>
            <span className="text-[9px] uppercase tracking-[0.18em] text-white/40 font-semibold">
              Zenith Protocol
            </span>
          </div>
        </div>

        {/* Currency & Telemetry Display */}
        <div className="flex items-center gap-2 sm:gap-4 md:gap-6">
          {/* ROLLS MONEY (Primary Currency Highlight) */}
          <div className="flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-gradient-to-r from-cyan-950/50 to-blue-950/40 px-2.5 py-1.5 shadow-md shadow-cyan-950/50">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-300">
              <Coins className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] uppercase tracking-wider text-cyan-300/70 font-black flex items-center gap-1">
                Rolls Money
              </span>
              <span className="font-mono text-xs sm:text-sm md:text-base font-black text-cyan-200 leading-none">
                {formatBigNumber(rollsMoney)}
              </span>
            </div>
          </div>

          {/* Astral Essence */}
          <div className="hidden xs:flex items-center gap-2 rounded-xl border border-purple-500/25 bg-purple-950/30 px-2.5 py-1.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/20 text-purple-300">
              <Flame className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] uppercase tracking-wider text-purple-300/70 font-black">
                Essence
              </span>
              <span className="font-mono text-xs sm:text-sm font-black text-purple-200 leading-none">
                {formatBigNumber(gameState.essence)}
              </span>
            </div>
          </div>

          {/* Luck Multiplier with Breakdown Tooltip */}
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-[9px] uppercase tracking-wider text-white/40 font-medium flex items-center gap-1">
              <Clover className="h-2.5 w-2.5 text-emerald-400" /> Luck
            </span>
            <span
              className={`font-mono text-xs sm:text-sm md:text-base font-bold transition-colors ${
                activePotionsCount > 0 || luckData.equippedLuck > 0
                  ? 'text-emerald-400 font-black'
                  : 'text-purple-400'
              }`}
              title={`Base: ${(luckData?.baseLuck ?? 1).toFixed(2)}x | Equipped Aura: +${formatLuckBonus(luckData?.equippedLuck ?? 0).replace('+', '')} | Potions: +${(luckData?.potionLuck ?? 0).toFixed(2)}x | Astral: +${(luckData?.essenceLuck ?? 0).toFixed(2)}x`}
            >
              {formattedLuck}
            </span>
          </div>

          {/* Total Rolls */}
          <div className="hidden lg:flex flex-col items-end">
            <span className="text-[9px] uppercase tracking-wider text-white/40 font-medium">
              Total Rolls
            </span>
            <span className="font-mono text-sm font-bold text-blue-400">
              {formatBigNumber(gameState.totalRolls)}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          {/* Rebirth Ascension Button */}
          <button
            id="header-rebirth-btn"
            onClick={() => {
              sound.playButtonClick();
              onOpenRebirthModal();
            }}
            className="flex h-8 sm:h-9 items-center gap-1.5 rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-500/20 via-pink-500/20 to-purple-500/20 px-2.5 sm:px-3 text-xs font-mono font-bold text-amber-300 shadow-sm transition hover:scale-105 active:scale-95 hover:border-amber-500/70"
            title="Ascension Rebirth System (Max 100)"
          >
            <Crown className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-400" />
            <span className="font-black">Rebirth</span>
            <span className="rounded bg-amber-500/30 px-1 py-0.2 text-[9px] text-amber-200">
              Lv.{rebirthLevel}
            </span>
          </button>

          {/* Daily Rewards Button */}
          <button
            id="daily-rewards-btn"
            onClick={() => {
              sound.playButtonClick();
              onOpenDailyRewards();
            }}
            className={`relative flex h-8 sm:h-9 items-center gap-1.5 rounded-xl border px-2.5 sm:px-3 text-xs font-mono font-bold transition ${
              isDailyEligible
                ? 'border-purple-500/60 bg-purple-500/20 text-purple-300 shadow-md shadow-purple-500/20 animate-pulse'
                : 'border-white/10 bg-white/[0.03] text-white/70 hover:border-white/25 hover:bg-white/10 hover:text-white'
            }`}
            title="Daily Login Bonus & Free Rolls"
          >
            <Gift className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${isDailyEligible ? 'text-purple-300' : 'text-white/60'}`} />
            <span className="hidden sm:inline">Daily</span>
            {isDailyEligible ? (
              <span className="flex h-2 w-2 rounded-full bg-emerald-400" />
            ) : freeTokens > 0 ? (
              <span className="rounded bg-purple-500/40 px-1 py-0.2 text-[9px] text-purple-200">
                +{freeTokens}
              </span>
            ) : null}
          </button>

          {/* Leaderboard Button */}
          {onOpenLeaderboard && (
            <button
              id="leaderboard-header-btn"
              onClick={() => {
                sound.playButtonClick();
                onOpenLeaderboard();
              }}
              className="relative flex h-8 sm:h-9 items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-2.5 sm:px-3 text-xs font-bold text-amber-300 transition hover:border-amber-500/60 hover:bg-amber-500/20 hover:text-amber-200 hover:scale-105 active:scale-95 shadow-sm"
              title="Real-Time Multiverse Leaderboard"
            >
              <Trophy className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-400" />
              <span className="hidden sm:inline">Ranks</span>
              <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </button>
          )}

          {/* Aura Duel Arena Button */}
          {onOpenDuel && (
            <button
              id="duel-header-btn"
              onClick={() => {
                sound.playButtonClick();
                onOpenDuel();
              }}
              className="relative flex h-8 sm:h-9 items-center gap-1.5 rounded-xl border border-purple-500/40 bg-gradient-to-r from-purple-600/30 to-pink-600/30 px-2.5 sm:px-3 text-xs font-bold text-purple-200 transition hover:border-purple-500/80 hover:bg-purple-600/40 hover:text-white hover:scale-105 active:scale-95 shadow-sm"
              title="Aura Clash Multiplayer Arena"
            >
              <Swords className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-purple-300" />
              <span className="hidden sm:inline">Duel</span>
              <span className="flex h-1.5 w-1.5 rounded-full bg-pink-400 animate-ping" />
            </button>
          )}

          {/* Aura Trading Hub Button */}
          {onOpenTrade && (
            <button
              id="trade-header-btn"
              onClick={() => {
                sound.playButtonClick();
                onOpenTrade();
              }}
              className="relative flex h-8 sm:h-9 items-center gap-1.5 rounded-xl border border-indigo-500/40 bg-gradient-to-r from-indigo-600/30 to-purple-600/30 px-2.5 sm:px-3 text-xs font-bold text-indigo-200 transition hover:border-indigo-500/80 hover:bg-indigo-600/40 hover:text-white hover:scale-105 active:scale-95 shadow-sm"
              title="Aura & Item Trading Hub"
            >
              <ArrowLeftRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-indigo-300" />
              <span className="hidden sm:inline">Trade</span>
              <span className="flex h-1.5 w-1.5 rounded-full bg-indigo-400" />
            </button>
          )}

          {/* DAMALA EVENT BUTTON */}
          {onOpenEvent && eventStatus && (
            <button
              id="event-header-btn"
              onClick={() => {
                sound.playButtonClick();
                onOpenEvent();
              }}
              className={`relative flex h-8 sm:h-9 items-center gap-1.5 rounded-xl border px-2.5 sm:px-3 text-xs font-black transition hover:scale-105 active:scale-95 shadow-sm ${
                eventStatus.isActive
                  ? 'border-amber-400 bg-gradient-to-r from-amber-500/30 via-orange-500/30 to-yellow-500/30 text-amber-200 shadow-md shadow-amber-500/30 ring-1 ring-amber-400/50 animate-pulse'
                  : 'border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'
              }`}
              title="Weekly Damala Eclipse Event (Mondays 5:00-5:30)"
            >
              <Flame className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${eventStatus.isActive ? 'text-amber-300 animate-bounce' : 'text-amber-400'}`} />
              <span className="hidden md:inline">
                {eventStatus.isActive ? 'Damala Live!' : 'Damala Event'}
              </span>
              {eventStatus.isActive ? (
                <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-ping" />
              ) : (
                <span className="hidden lg:inline text-[10px] text-amber-300/70 font-mono">
                  {formatEventCountdown(eventStatus.secondsUntilNext)}
                </span>
              )}
            </button>
          )}

          {/* AUTH & CLOUD SAVE BUTTON */}
          {onOpenAuth && (
            <button
              id="auth-header-btn"
              onClick={() => {
                sound.playButtonClick();
                onOpenAuth();
              }}
              className={`relative flex h-8 sm:h-9 items-center gap-1.5 rounded-xl border px-2.5 sm:px-3 text-xs font-bold transition hover:scale-105 active:scale-95 shadow-sm ${
                user
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:border-emerald-500/70 hover:bg-emerald-500/20'
                  : 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300 hover:border-cyan-500/70 hover:bg-cyan-500/20'
              }`}
              title={user ? `Signed in as ${user.displayName || 'Player'} (Cloud Synced)` : 'Sign in to save progress to cloud'}
            >
              {user ? (
                <>
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt="User"
                      className="h-4 w-4 rounded-full border border-emerald-400 object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <UserIcon className="h-3.5 w-3.5 text-emerald-400" />
                  )}
                  <span className="hidden sm:inline font-bold">
                    {user.displayName?.split(' ')[0] || 'Account'}
                  </span>
                  <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                </>
              ) : (
                <>
                  <Cloud className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-cyan-300" />
                  <span className="hidden sm:inline">Cloud Save</span>
                </>
              )}
            </button>
          )}

          {/* Stats Button */}
          <button
            id="stats-btn"
            onClick={() => {
              sound.playButtonClick();
              onOpenStats();
            }}
            className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-white/70 transition hover:border-white/25 hover:bg-white/10 hover:text-white"
            title="Statistical Odds & Matrix"
          >
            <BarChart3 className="h-4 w-4" />
          </button>

          {/* Achievements Button */}
          <button
            id="achievements-btn"
            onClick={() => {
              sound.playButtonClick();
              onOpenAchievements();
            }}
            className="relative flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-white/70 transition hover:border-white/25 hover:bg-white/10 hover:text-white"
            title="Bounties & Milestones"
          >
            <Award className="h-4 w-4" />
            {unclaimedAchievementsCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-purple-500 text-[9px] font-bold text-white shadow-md shadow-purple-500/50">
                {unclaimedAchievementsCount}
              </span>
            )}
          </button>

          {/* Background Theme Customizer Button */}
          <button
            id="theme-customizer-btn"
            onClick={() => {
              sound.playButtonClick();
              onOpenBackgroundCustomizer();
            }}
            className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl theme-btn-outline transition hover:scale-105 active:scale-95 shadow-sm"
            title="Customize Background Theme & Atmosphere"
          >
            <Palette className="h-4 w-4" />
          </button>

          {/* Sound Effects (SFX) Mute Toggle */}
          <button
            id="sound-toggle-btn"
            onClick={() => {
              sound.playButtonClick();
              onToggleSound();
            }}
            className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-white/70 transition hover:border-white/25 hover:bg-white/10 hover:text-white"
            title={gameState.soundEnabled ? 'Mute Sound Effects (SFX)' : 'Unmute Sound Effects (SFX)'}
          >
            {gameState.soundEnabled ? (
              <Volume2 className="h-4 w-4 text-[var(--theme-accent,#c084fc)]" />
            ) : (
              <VolumeX className="h-4 w-4 text-white/30" />
            )}
          </button>

          {/* Hard Reset Button */}
          <button
            id="hard-reset-btn"
            onClick={() => {
              sound.playButtonClick();
              onOpenReset();
            }}
            className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-white/30 transition hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-400"
            title="Reset Game Data"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

export const Header = React.memo(HeaderComponent);
