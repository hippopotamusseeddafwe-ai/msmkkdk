import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Crown,
  Sparkles,
  Dices,
  Flame,
  Star,
  Zap,
  Atom,
  Skull,
  Shield,
  Sword,
  Eye,
  Gem,
  Radio,
  Users,
  Edit3,
  Search,
  Check,
  X,
  Award,
  Globe,
  TrendingUp,
  Activity,
} from 'lucide-react';
import {
  GameState,
  LeaderboardEntry,
  GlobalRollEvent,
  LeaderboardCategory,
  PlayerProfile,
  RarityTier,
} from '../types';
import { RARITIES, RARITY_ORDER } from '../data/rarities';
import { PLAYER_TITLES, PLAYER_AVATARS, TitleDefinition } from '../data/playerTitles';
import {
  subscribeToRealtimeLeaderboard,
  subscribeToLiveGlobalRolls,
  syncPlayerToLeaderboard,
  savePlayerProfile,
  findBestItemInInventory,
} from '../services/leaderboardService';
import { sound } from '../utils/audio';

interface LeaderboardViewProps {
  gameState: GameState;
  playerProfile: PlayerProfile;
  onUpdateProfile: (newProfile: PlayerProfile) => void;
}

// Icon helper
function renderAvatarIcon(iconName: string, className: string = 'h-5 w-5') {
  switch (iconName) {
    case 'crown':
      return <Crown className={`${className} text-amber-400`} />;
    case 'sparkles':
      return <Sparkles className={`${className} text-sky-400`} />;
    case 'flame':
      return <Flame className={`${className} text-orange-400`} />;
    case 'gem':
      return <Gem className={`${className} text-pink-400`} />;
    case 'zap':
      return <Zap className={`${className} text-yellow-400`} />;
    case 'skull':
      return <Skull className={`${className} text-purple-400`} />;
    case 'shield':
      return <Shield className={`${className} text-emerald-400`} />;
    case 'sword':
      return <Sword className={`${className} text-indigo-400`} />;
    case 'star':
      return <Star className={`${className} text-amber-300`} />;
    case 'eye':
      return <Eye className={`${className} text-fuchsia-400`} />;
    case 'atom':
      return <Atom className={`${className} text-cyan-400`} />;
    case 'dices':
    default:
      return <Dices className={`${className} text-purple-400`} />;
  }
}

// Helper to format big numbers cleanly
function formatNumber(num: number): string {
  if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(2) + 'B';
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(2) + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(1) + 'k';
  return num.toLocaleString();
}

function timeAgo(ms: number): string {
  const seconds = Math.floor((Date.now() - ms) / 1000);
  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function getCategoryLabelAndValue(entry: LeaderboardEntry, cat: LeaderboardCategory): { label: string; value: string } {
  switch (cat) {
    case 'rarity':
      return { label: 'Aura Chance', value: entry.bestItemChance || '1 in 2' };
    case 'money':
      return { label: 'Roll Money', value: formatNumber(entry.rollsMoney ?? entry.rollsEarned) };
    case 'luck':
      return { label: 'Luck Multiplier', value: `+${(entry.luckBoost ?? 1).toFixed(1)}x` };
    case 'money_boost':
      return { label: 'Money Boost', value: `+${(entry.moneyBoost ?? 1).toFixed(1)}x` };
    case 'essence':
      return { label: 'Essence Crystals', value: `${(entry.essence ?? 0).toLocaleString()} ✦` };
    case 'rebirth':
      return { label: 'Ascension Level', value: `Rebirth ${entry.rebirthLevel}` };
    case 'rolls':
    default:
      return { label: 'Total Rolls', value: formatNumber(entry.totalRolls) };
  }
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({
  gameState,
  playerProfile,
  onUpdateProfile,
}) => {
  const [category, setCategory] = useState<LeaderboardCategory>('rolls');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [globalRolls, setGlobalRolls] = useState<GlobalRollEvent[]>([]);
  const [isLive, setIsLive] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);

  // Edit profile state
  const [tempName, setTempName] = useState<string>(playerProfile.name);
  const [tempAvatar, setTempAvatar] = useState<string>(playerProfile.avatarIcon);
  const [tempTitle, setTempTitle] = useState<string>(playerProfile.title);

  const gameStateRef = React.useRef(gameState);
  const playerProfileRef = React.useRef(playerProfile);

  useEffect(() => {
    gameStateRef.current = gameState;
    playerProfileRef.current = playerProfile;
  }, [gameState, playerProfile]);

  // Sync to database on category switch / mount
  useEffect(() => {
    syncPlayerToLeaderboard(playerProfileRef.current, gameStateRef.current, true);
  }, [category, playerProfile.id]);

  // Subscribe to real-time leaderboard (only on category or profile id change, not every roll)
  useEffect(() => {
    const unsubLeaderboard = subscribeToRealtimeLeaderboard(
      category,
      playerProfileRef.current,
      gameStateRef.current,
      (newEntries, liveStatus) => {
        setEntries(newEntries);
        setIsLive(liveStatus);
      }
    );

    return () => unsubLeaderboard();
  }, [category, playerProfile.id]);

  // Subscribe to live global rolls
  useEffect(() => {
    const unsubRolls = subscribeToLiveGlobalRolls((newRolls) => {
      setGlobalRolls(newRolls);
    });

    return () => unsubRolls();
  }, []);

  // Filter entries based on search query
  const filteredEntries = entries.filter((e) =>
    e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.bestItemName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Find current user's rank
  const myRankIndex = entries.findIndex((e) => e.id === playerProfile.id);
  const myRank = myRankIndex >= 0 ? myRankIndex + 1 : entries.length + 1;
  const myBest = findBestItemInInventory(gameState);

  // Check title unlock eligibility
  const isTitleUnlocked = (t: TitleDefinition): boolean => {
    if (t.category === 'starter') return true;
    if (t.minRolls && gameState.totalRolls >= t.minRolls) return true;
    if (t.minRebirth && gameState.rebirthLevel >= t.minRebirth) return true;
    if (t.minRarityRank && myBest.rank >= t.minRarityRank) return true;
    if (t.id === 'rng_champion' && myRank <= 3) return true;
    if (t.id === 'dimension_hopper' && gameState.rebirthLevel >= 2) return true;
    return false;
  };

  const handleSaveProfile = () => {
    sound.playButtonClick();
    const cleanName = tempName.trim().substring(0, 20) || 'Roller';
    const updated: PlayerProfile = {
      ...playerProfile,
      name: cleanName,
      avatarIcon: tempAvatar,
      title: tempTitle,
    };
    savePlayerProfile(updated);
    onUpdateProfile(updated);
    syncPlayerToLeaderboard(updated, gameState, true);
    setIsProfileModalOpen(false);
  };

  const topThree = filteredEntries.slice(0, 3);
  const remainingEntries = filteredEntries.slice(3);

  return (
    <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 py-4 space-y-5 animate-in fade-in duration-300">
      {/* 1. Header Banner & Profile Strip */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl p-4 sm:p-6 shadow-2xl">
        {/* Glow ambient background */}
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[var(--theme-accent,#a855f7)]/20 blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-blue-600/15 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 shadow-md shadow-amber-500/20">
                <Trophy className="h-5 w-5" />
              </div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-2">
                <span>REAL PLAYERS LEADERBOARD</span>
              </h1>
              <div className="flex items-center gap-1.5 rounded-full bg-emerald-950/70 border border-emerald-500/40 px-2.5 py-0.5 text-[11px] font-bold text-emerald-400 shadow-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>{isLive ? 'REAL PLAYERS LIVE' : 'SYNCHRONIZED'}</span>
              </div>
              <div className="rounded-full bg-purple-950/70 border border-purple-500/40 px-2.5 py-0.5 text-[10px] font-bold text-purple-300">
                100% REAL PLAYERS • NO BOTS
              </div>
            </div>
            <p className="text-xs sm:text-sm text-white/60">
              Live synchronized global rankings strictly for real verified players. Ascend the tiers and claim your throne.
            </p>
          </div>

          {/* Current Player Card & Customize Button */}
          <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-2.5 sm:px-4 sm:py-2.5 w-full md:w-auto justify-between shadow-inner">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 border border-white/15">
                {renderAvatarIcon(playerProfile.avatarIcon, 'h-5 w-5')}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sm text-white">{playerProfile.name}</span>
                  <span className="rounded bg-purple-500/20 border border-purple-500/30 px-1.5 py-0.2 text-[10px] font-bold text-purple-300">
                    YOU
                  </span>
                </div>
                <div className="text-[11px] font-medium text-white/50">{playerProfile.title}</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="text-right hidden sm:block">
                <div className="text-[10px] text-white/40 uppercase font-mono tracking-wider">Your Rank</div>
                <div className="text-sm font-black text-amber-400">#{myRank}</div>
              </div>
              <button
                onClick={() => {
                  sound.playButtonClick();
                  setTempName(playerProfile.name);
                  setTempAvatar(playerProfile.avatarIcon);
                  setTempTitle(playerProfile.title);
                  setIsProfileModalOpen(true);
                }}
                className="flex items-center gap-1.5 rounded-lg theme-btn-outline px-3 py-1.5 text-xs font-bold transition hover:scale-105 active:scale-95"
              >
                <Edit3 className="h-3.5 w-3.5" />
                <span>Edit Profile</span>
              </button>
            </div>
          </div>
        </div>

        {/* 2. Live Global Roll Ticker Feed */}
        <div className="mt-4 pt-3.5 border-t border-white/10">
          <div className="flex items-center gap-2 text-xs text-white/50 mb-2">
            <Radio className="h-3.5 w-3.5 text-rose-400 animate-pulse" />
            <span className="font-bold tracking-wide uppercase text-[10px] text-rose-300">
              Live Global Roll Drops (Real Players Only)
            </span>
          </div>

          <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-none">
            {globalRolls.length === 0 ? (
              <div className="flex items-center gap-2 rounded-lg bg-white/5 border border-white/10 px-3 py-1.5 text-xs text-white/50">
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                <span>Roll rare auras (Mythic+) to broadcast your real drops live across all realms!</span>
              </div>
            ) : (
              globalRolls.slice(0, 8).map((roll) => {
                const rarityConfig = RARITIES[roll.itemRarity];
                return (
                  <div
                    key={roll.id}
                    className="flex-shrink-0 flex items-center gap-2 rounded-lg bg-white/5 border border-white/10 px-3 py-1.5 text-xs backdrop-blur-md hover:bg-white/10 transition"
                  >
                    <div className="flex h-5 w-5 items-center justify-center rounded bg-black/40">
                      {renderAvatarIcon(roll.playerAvatar, 'h-3.5 w-3.5')}
                    </div>
                    <span className="font-semibold text-white/90">{roll.playerName}</span>
                    <span className="text-white/40">rolled</span>
                    <span
                      className={`font-bold ${rarityConfig?.textColor || 'text-purple-300'}`}
                    >
                      {roll.itemName}
                    </span>
                    <span className="text-[10px] font-mono rounded bg-white/10 px-1 text-white/60">
                      {roll.itemChance}
                    </span>
                    <span className="text-[10px] text-white/40">
                      {timeAgo(roll.timestamp)}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* 3. Category Selectors & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Category Tabs (All 7 Requested Categories) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none bg-black/30 p-1.5 rounded-xl border border-white/10">
          <button
            onClick={() => {
              sound.playButtonClick();
              setCategory('rarity');
            }}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition whitespace-nowrap ${
              category === 'rarity'
                ? 'theme-tab-active'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            <span>Highest Rarity</span>
          </button>

          <button
            onClick={() => {
              sound.playButtonClick();
              setCategory('money');
            }}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition whitespace-nowrap ${
              category === 'money'
                ? 'theme-tab-active'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
            <span>Roll Money</span>
          </button>

          <button
            onClick={() => {
              sound.playButtonClick();
              setCategory('luck');
            }}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition whitespace-nowrap ${
              category === 'luck'
                ? 'theme-tab-active'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <Zap className="h-3.5 w-3.5 text-yellow-400" />
            <span>Luck Boost</span>
          </button>

          <button
            onClick={() => {
              sound.playButtonClick();
              setCategory('money_boost');
            }}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition whitespace-nowrap ${
              category === 'money_boost'
                ? 'theme-tab-active'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <Crown className="h-3.5 w-3.5 text-amber-400" />
            <span>Money Boost</span>
          </button>

          <button
            onClick={() => {
              sound.playButtonClick();
              setCategory('essence');
            }}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition whitespace-nowrap ${
              category === 'essence'
                ? 'theme-tab-active'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <Gem className="h-3.5 w-3.5 text-purple-400" />
            <span>Essence</span>
          </button>

          <button
            onClick={() => {
              sound.playButtonClick();
              setCategory('rolls');
            }}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition whitespace-nowrap ${
              category === 'rolls'
                ? 'theme-tab-active'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <Dices className="h-3.5 w-3.5 text-cyan-400" />
            <span>Total Rolls</span>
          </button>

          <button
            onClick={() => {
              sound.playButtonClick();
              setCategory('rebirth');
            }}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition whitespace-nowrap ${
              category === 'rebirth'
                ? 'theme-tab-active'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <Flame className="h-3.5 w-3.5 text-orange-400" />
            <span>Rebirths</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search players or auras..."
            className="w-full rounded-xl bg-black/40 border border-white/10 pl-9 pr-3 py-1.5 text-xs text-white placeholder-white/40 focus:border-purple-500 focus:outline-none backdrop-blur-md"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* 4. Top Podium (Real Players) */}
      {!searchQuery && topThree.length > 0 && (
        <div className={`grid gap-3.5 pt-2 ${
          topThree.length === 1
            ? 'grid-cols-1 max-w-md mx-auto w-full'
            : topThree.length === 2
            ? 'grid-cols-1 md:grid-cols-2 max-w-3xl mx-auto w-full'
            : 'grid-cols-1 md:grid-cols-3'
        }`}>
          {/* Rank #2 (Silver) - Show if 2 or 3+ players */}
          {topThree.length >= 2 && topThree[1] && (
            <div className={`relative rounded-2xl border border-slate-400/30 bg-gradient-to-b from-slate-800/60 to-black/60 p-4 sm:p-5 backdrop-blur-xl flex flex-col justify-between shadow-xl ${
              topThree.length === 3 ? 'order-2 md:order-1' : 'order-2'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5 rounded-full bg-slate-300/20 border border-slate-300/40 px-2.5 py-0.5 text-xs font-black text-slate-200">
                  <span>#2 SILVER</span>
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-400/20 text-slate-200">
                  <Award className="h-4 w-4" />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 border border-white/20">
                    {renderAvatarIcon(topThree[1].avatarIcon, 'h-6 w-6')}
                  </div>
                  <div>
                    <div className="font-black text-base text-white flex items-center gap-1.5">
                      <span>{topThree[1].name}</span>
                      {topThree[1].id === playerProfile.id && (
                        <span className="rounded bg-purple-500/30 text-[10px] px-1 text-purple-300 font-bold">YOU</span>
                      )}
                    </div>
                    <div className="text-xs text-slate-300 font-medium">{topThree[1].title}</div>
                  </div>
                </div>

                <div className="mt-3 rounded-xl bg-black/40 border border-white/5 p-2.5 space-y-1 text-xs">
                  <div className="flex justify-between text-white/60">
                    <span>Best Aura:</span>
                    <span className={`font-bold ${RARITIES[topThree[1].bestItemRarity]?.textColor || 'text-white'}`}>
                      {topThree[1].bestItemName}
                    </span>
                  </div>
                  <div className="flex justify-between text-white/60 font-mono">
                    <span>{getCategoryLabelAndValue(topThree[1], category).label}:</span>
                    <span className="font-bold text-white">
                      {getCategoryLabelAndValue(topThree[1], category).value}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Rank #1 (Gold Champion) */}
          {topThree[0] && (
            <div className={`relative rounded-2xl border-2 border-amber-500/60 bg-gradient-to-b from-amber-950/50 via-amber-900/20 to-black/80 p-5 sm:p-6 backdrop-blur-xl flex flex-col justify-between shadow-2xl shadow-amber-500/20 ${
              topThree.length === 3 ? 'order-1 md:order-2 md:-translate-y-2' : 'order-1'
            }`}>
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 px-3 py-0.5 text-xs font-black text-black shadow-lg">
                <Crown className="h-3.5 w-3.5" />
                <span>#1 GRAND CHAMPION</span>
              </div>

              <div className="mt-2 space-y-3">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/20 border-2 border-amber-400/40 shadow-inner">
                    {renderAvatarIcon(topThree[0].avatarIcon, 'h-8 w-8')}
                  </div>
                  <div>
                    <div className="font-black text-lg text-white flex items-center gap-1.5">
                      <span>{topThree[0].name}</span>
                      {topThree[0].id === playerProfile.id && (
                        <span className="rounded bg-amber-400 text-black text-[10px] px-1 font-black">YOU</span>
                      )}
                    </div>
                    <div className="text-xs text-amber-300 font-semibold">{topThree[0].title}</div>
                  </div>
                </div>

                <div className="rounded-xl bg-black/60 border border-amber-500/20 p-3 space-y-1.5 text-xs">
                  <div className="flex justify-between text-white/70">
                    <span>Crown Aura:</span>
                    <span className={`font-bold ${RARITIES[topThree[0].bestItemRarity]?.textColor || 'text-amber-300'}`}>
                      {topThree[0].bestItemName}
                    </span>
                  </div>
                  <div className="flex justify-between text-amber-200/80 font-mono">
                    <span>{getCategoryLabelAndValue(topThree[0], category).label}:</span>
                    <span className="font-black text-amber-400 text-sm">
                      {getCategoryLabelAndValue(topThree[0], category).value}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Rank #3 (Bronze) - Show if 3+ players */}
          {topThree.length >= 3 && topThree[2] && (
            <div className="order-3 relative rounded-2xl border border-amber-700/40 bg-gradient-to-b from-amber-950/40 to-black/60 p-4 sm:p-5 backdrop-blur-xl flex flex-col justify-between shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5 rounded-full bg-amber-700/30 border border-amber-600/40 px-2.5 py-0.5 text-xs font-black text-amber-300">
                  <span>#3 BRONZE</span>
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-700/20 text-amber-400">
                  <Shield className="h-4 w-4" />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 border border-white/20">
                    {renderAvatarIcon(topThree[2].avatarIcon, 'h-6 w-6')}
                  </div>
                  <div>
                    <div className="font-black text-base text-white flex items-center gap-1.5">
                      <span>{topThree[2].name}</span>
                      {topThree[2].id === playerProfile.id && (
                        <span className="rounded bg-purple-500/30 text-[10px] px-1 text-purple-300 font-bold">YOU</span>
                      )}
                    </div>
                    <div className="text-xs text-amber-200/70 font-medium">{topThree[2].title}</div>
                  </div>
                </div>

                <div className="mt-3 rounded-xl bg-black/40 border border-white/5 p-2.5 space-y-1 text-xs">
                  <div className="flex justify-between text-white/60">
                    <span>Best Aura:</span>
                    <span className={`font-bold ${RARITIES[topThree[2].bestItemRarity]?.textColor || 'text-white'}`}>
                      {topThree[2].bestItemName}
                    </span>
                  </div>
                  <div className="flex justify-between text-white/60 font-mono">
                    <span>{getCategoryLabelAndValue(topThree[2], category).label}:</span>
                    <span className="font-bold text-white">
                      {getCategoryLabelAndValue(topThree[2], category).value}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. Complete Rankings Table */}
      <div className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-[var(--theme-accent,#a855f7)]" />
            <span className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
              {category === 'rarity'
                ? 'Highest Rarity Aura Standings'
                : category === 'money'
                ? 'Highest Roll Money Standings'
                : category === 'luck'
                ? 'Highest Luck Boost Standings'
                : category === 'money_boost'
                ? 'Highest Money Boost Standings'
                : category === 'essence'
                ? 'Highest Essence Crystals Standings'
                : category === 'rebirth'
                ? 'Ascended Rebirth Sovereigns'
                : 'Total Rolls Leaderboard'}
            </span>
          </div>
          <span className="text-xs text-emerald-400/90 font-medium">
            Showing {filteredEntries.length} verified real {filteredEntries.length === 1 ? 'player' : 'players'}
          </span>
        </div>

        <div className="divide-y divide-white/5 overflow-x-auto">
          {filteredEntries.length === 0 ? (
            <div className="py-12 text-center text-white/40 space-y-2">
              <Search className="h-8 w-8 mx-auto opacity-30" />
              <p className="text-sm">No players matching &quot;{searchQuery}&quot;</p>
            </div>
          ) : (
            filteredEntries.map((entry, index) => {
              const rank = index + 1;
              const isMe = entry.id === playerProfile.id;
              const rarityConfig = RARITIES[entry.bestItemRarity];
              const metric = getCategoryLabelAndValue(entry, category);

              return (
                <div
                  key={entry.id}
                  className={`flex items-center justify-between px-4 sm:px-6 py-3 transition-colors ${
                    isMe
                      ? 'bg-purple-950/30 border-l-4 border-l-purple-500'
                      : 'hover:bg-white/5'
                  }`}
                >
                  {/* Left: Rank + Avatar + Name + Title */}
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    <div className="w-8 flex-shrink-0 text-center font-mono font-black text-sm">
                      {rank === 1 ? (
                        <span className="text-amber-400 flex items-center justify-center">
                          <Crown className="h-4 w-4" />
                        </span>
                      ) : rank === 2 ? (
                        <span className="text-slate-300">#2</span>
                      ) : rank === 3 ? (
                        <span className="text-amber-600">#3</span>
                      ) : (
                        <span className="text-white/40">#{rank}</span>
                      )}
                    </div>

                    <div className="flex h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white/5 border border-white/10">
                      {renderAvatarIcon(entry.avatarIcon, 'h-4 w-4 sm:h-5 sm:w-5')}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-xs sm:text-sm text-white truncate max-w-[140px] sm:max-w-[200px]">
                          {entry.name}
                        </span>
                        {isMe && (
                          <span className="rounded bg-purple-500/30 border border-purple-500/40 text-purple-200 text-[10px] px-1.5 font-bold">
                            YOU
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-white/50 truncate max-w-[160px] sm:max-w-[240px]">
                        {entry.title}
                      </div>
                    </div>
                  </div>

                  {/* Right: Best Aura + Score Metric */}
                  <div className="flex items-center gap-3 sm:gap-6 flex-shrink-0 text-right">
                    {/* Discovered Best Aura */}
                    <div className="hidden sm:block text-right">
                      <div className="text-[10px] text-white/40 uppercase font-mono">Best Discovered</div>
                      <div className={`text-xs font-bold ${rarityConfig?.textColor || 'text-white'}`}>
                        {entry.bestItemName}
                      </div>
                    </div>

                    {/* Primary Category Metric */}
                    <div className="min-w-[90px] text-right">
                      <div className="text-[10px] text-white/40 uppercase font-mono">
                        {metric.label}
                      </div>
                      <div className="text-xs sm:text-sm font-black text-white font-mono">
                        {metric.value}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 6. Profile & Identity Customizer Modal */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-2xl border border-white/15 bg-zinc-950 p-5 sm:p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Edit3 className="h-5 w-5 text-[var(--theme-accent,#a855f7)]" />
                <h3 className="font-black text-base sm:text-lg text-white">Customize Player Profile</h3>
              </div>
              <button
                onClick={() => setIsProfileModalOpen(false)}
                className="rounded-lg p-1 text-white/50 hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Player Name */}
              <div>
                <label className="block text-xs font-bold text-white/70 mb-1">
                  Player Name (Max 20 chars)
                </label>
                <input
                  type="text"
                  maxLength={20}
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  placeholder="Enter your username..."
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-3.5 py-2 text-sm text-white font-bold placeholder-white/30 focus:border-purple-500 focus:outline-none"
                />
              </div>

              {/* Avatar Icon */}
              <div>
                <label className="block text-xs font-bold text-white/70 mb-2">
                  Select Avatar Icon
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {PLAYER_AVATARS.map((av) => {
                    const isSelected = tempAvatar === av.id;
                    return (
                      <button
                        key={av.id}
                        type="button"
                        onClick={() => setTempAvatar(av.id)}
                        className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all ${
                          isSelected
                            ? 'border-purple-500 bg-purple-500/20 shadow-md shadow-purple-500/30'
                            : 'border-white/10 bg-white/5 hover:bg-white/10 text-white/60'
                        }`}
                      >
                        <div className="mb-1">{renderAvatarIcon(av.id, 'h-5 w-5')}</div>
                        <span className="text-[10px] font-bold text-white/80 truncate w-full text-center">
                          {av.name.split(' ')[0]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Player Title Selection */}
              <div>
                <label className="block text-xs font-bold text-white/70 mb-2">
                  Earned Realm Titles
                </label>
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                  {PLAYER_TITLES.map((t) => {
                    const unlocked = isTitleUnlocked(t);
                    const isSelected = tempTitle === t.name;

                    return (
                      <button
                        key={t.id}
                        type="button"
                        disabled={!unlocked}
                        onClick={() => setTempTitle(t.name)}
                        className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition ${
                          isSelected
                            ? 'border-purple-500 bg-purple-500/20 text-white'
                            : unlocked
                            ? 'border-white/10 bg-white/5 hover:bg-white/10 text-white/80'
                            : 'border-white/5 bg-black/40 opacity-40 cursor-not-allowed text-white/30'
                        }`}
                      >
                        <div>
                          <div className={`text-xs font-bold ${unlocked ? t.color : 'text-white/40'}`}>
                            {t.name}
                          </div>
                          <div className="text-[10px] text-white/40">{t.description}</div>
                        </div>

                        {isSelected ? (
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-500 text-white">
                            <Check className="h-3 w-3" />
                          </div>
                        ) : !unlocked ? (
                          <span className="text-[10px] uppercase font-mono text-white/30">Locked</span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <button
                onClick={() => setIsProfileModalOpen(false)}
                className="rounded-xl px-4 py-2 text-xs font-bold text-white/60 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProfile}
                className="flex items-center gap-1.5 rounded-xl theme-btn-primary px-5 py-2 text-xs font-bold shadow-lg transition hover:scale-105 active:scale-95"
              >
                <Check className="h-4 w-4" />
                <span>Save Profile</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
