export type RarityTier =
  // 85 Base Rarities (Unlocked at Rebirth 0)
  | 'common'
  | 'uncommon'
  | 'unusual'
  | 'rare'
  | 'flawless'
  | 'epic'
  | 'exotic'
  | 'legendary'
  | 'relic'
  | 'mythic'
  | 'ancient'
  | 'ethereal'
  | 'celestial'
  | 'radiant'
  | 'astral'
  | 'transcendent'
  | 'divine'
  | 'abyssal'
  | 'infernal'
  | 'prismatic'
  | 'stellar'
  | 'galactic'
  | 'cosmic'
  | 'singularity'
  | 'quantum'
  | 'chronos'
  | 'hyperborean'
  | 'genesis'
  | 'eldritch'
  | 'multiverse'
  | 'infinity'
  | 'apotheosis'
  | 'nihility'
  | 'omnipresent'
  | 'absolute'
  | 'omniverse'
  | 'oblivion'
  | 'eternity'
  | 'void_emperor'
  | 'solaris'
  | 'supernova'
  | 'astral_zenith'
  | 'nebula_prime'
  | 'quasar'
  | 'pulsaron'
  | 'antimatter'
  | 'event_horizon'
  | 'dark_matter'
  | 'dark_energy'
  | 'string_theory'
  | 'dimension_11'
  | 'hypercube'
  | 'tesseract'
  | 'chrono_zenith'
  | 'vortex_monarch'
  | 'temporal_lord'
  | 'spacetime_tear'
  | 'reality_shatter'
  | 'cosmic_phoenix'
  | 'stellar_seraph'
  | 'archangelic'
  | 'pantheon'
  | 'olympian'
  | 'asgardian'
  | 'valhalla'
  | 'nirvana'
  | 'ascension_peak'
  | 'transcendental_zero'
  | 'hyper_genesis'
  | 'primordial_chaos'
  | 'astral_nexus'
  | 'matrix_overlord'
  | 'simulation_core'
  | 'dev_console'
  | 'root_access'
  | 'singularity_apex'
  | 'big_bang'
  | 'cosmic_string'
  | 'hyper_dimension'
  | 'parallel_omega'
  | 'infinite_loop'
  | 'supreme_deity'
  | 'outer_god'
  | 'boundless'
  | 'omnipotent'
  // 15 Rebirth Rarities (Unlocked at Rebirth 1 through 15)
  | 'damala'
  | 'shaster'
  | 'samosa'
  | 'kirpan'
  | 'kanda'
  | 'light'
  | 'godly'
  | 'singh'
  | 'fatih'
  | 'cosmos'
  | 'googol'
  | 'sikh'
  | 'buda'
  | 'random'
  | 'nani'
  // Secret Rebirth 100 + 100% Dex Completion Tier (10,000 Items)
  | 'nani_singh';

export interface RarityConfig {
  id: RarityTier;
  name: string;
  baseWeight: number;
  chancePercentage: number;
  oneInChance: string;
  textColor: string;
  badgeBg: string;
  badgeBorder: string;
  bgGradient: string;
  glowColor: string;
  accentColor: string;
  isRainbow?: boolean;
}

export interface Item {
  id: string;
  name: string;
  rarity: RarityTier;
  lore: string;
  baseValue: number; // Rolls currency sell value
  essenceValue: number; // Essence recycle value
  luckBonus: number; // Luck multiplier added when equipped
  moneyMultiplier?: number; // Roll money/coins earnings multiplier (e.g. 2x, 50x, 10,000x)
  icon: string; // Lucide icon name
  auraType: 'orbit' | 'flame' | 'sparkle' | 'vortex' | 'rainbow' | 'divine' | 'smoke' | 'quantum' | 'cosmic' | 'glitch' | 'nebula' | 'singularity';
  flavorTitle: string;
  minRebirth?: number; // Minimum Rebirth level required to discover/roll (0 = base)
  isBrokenGlass?: boolean; // 50% empty roll (You got nothing!)
  isMergeExclusive?: boolean; // Can ONLY be obtained by merging in the Merge Machine!
  isMergedVariant?: boolean; // Result of merging duplicates
}

export interface MergeRequirement {
  itemId?: string; // Specific item requirement
  rarity?: RarityTier; // Or any item of this rarity
  count: number;
}

export interface MergeRecipe {
  id: string;
  resultItem: Item;
  requiredItems: MergeRequirement[];
  requiredEssence: number;
  requiredRollsCost?: number;
  requiresNaniSinghRarityUnlocked?: boolean;
  description: string;
  category: 'exclusive' | 'transmutation' | 'cosmic';
}

export interface InventorySlot {
  itemId: string;
  count: number;
  firstDiscoveredAt?: number;
  discoveredAt?: number;
  isFavorite?: boolean;
}

export interface Upgrade {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'luck' | 'speed' | 'utility' | 'economy';
  costCurrency: 'rolls' | 'essence';
  baseCost: number;
  costMultiplier: number;
  maxLevel: number;
  effectValuePerLevel: number;
  unit: string;
  prefix?: string;
  requiredRebirth?: number; // Unlocked at specific Rebirth level (1 to 100)
}

export interface ActivePotion {
  id: string;
  name: string;
  luckMultiplier: number;
  durationSeconds: number;
  expiresAt: number; // Timestamp
  icon: string;
}

export interface RollResult {
  item: Item;
  isNew: boolean;
  rolledAt: number;
  luckAtRoll: number;
  isCrit?: boolean;
  isBrokenGlass?: boolean;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  rewardRolls: number;
  rewardCoins?: number;
  rewardEssence: number;
  type: 'rolls' | 'rarity' | 'coins' | 'inventory_count' | 'upgrades';
  targetValue: number | string;
}

export interface DailyRewardTier {
  day: number;
  freeRolls: number;
  rolls: number;
  coins?: number;
  essence: number;
  potionReward?: {
    name: string;
    luckMultiplier: number;
    durationSeconds: number;
    icon: string;
  };
  bonusLuckOnRolls?: number;
  title: string;
}

export interface DailyRewardState {
  lastClaimDate: string | null; // e.g. "YYYY-MM-DD"
  streakDays: number; // 1 to 7 cycle
  totalDailyClaims: number;
  freeRollTokens: number;
}

export type BackgroundPresetId =
  | 'cosmic'
  | 'cyberpunk'
  | 'abyss'
  | 'solar'
  | 'matrix'
  | 'amethyst'
  | 'astral'
  | 'bloodmoon'
  | 'zenith'
  | 'carbon'
  | 'custom';

export type BackgroundPattern = 'dots' | 'grid' | 'stars' | 'hex' | 'none';

export interface BackgroundSettings {
  preset: BackgroundPresetId;
  primaryColor: string; // Base gradient deep color
  secondaryColor: string; // Mid gradient hue
  accentColor: string; // Radiant glow & particle color
  darkness: number; // 50 to 98 (%)
  pattern: BackgroundPattern;
  particles: 'off' | 'low' | 'medium' | 'high';
  glowIntensity: number; // 0 to 100
  animated: boolean;
}

export interface PlayerProfile {
  id: string;
  name: string;
  avatarIcon: string;
  title: string;
}

export type LeaderboardCategory =
  | 'rarity'
  | 'money'
  | 'luck'
  | 'money_boost'
  | 'essence'
  | 'rolls'
  | 'rebirth';

export type DuelDifficulty = 'easy' | 'medium' | 'hard';

export interface LeaderboardEntry {
  id: string; // Player ID
  name: string;
  avatarIcon: string;
  title: string;
  totalRolls: number;
  rebirthLevel: number;
  rollsEarned: number;
  rollsMoney?: number;
  luckBoost?: number;
  moneyBoost?: number;
  essence?: number;
  highestRarity: RarityTier | 'none';
  highestRarityRank: number; // 0 to 185
  bestItemName: string;
  bestItemRarity: RarityTier;
  bestItemChance: string;
  equippedItemName?: string;
  equippedItemRarity?: RarityTier;
  inventoryCount: number;
  achievementsCount: number;
  lastActive: number;
}

export interface GlobalRollEvent {
  id: string;
  playerId: string;
  playerName: string;
  playerAvatar: string;
  itemId: string;
  itemName: string;
  itemRarity: RarityTier;
  itemChance: string;
  timestamp: number;
}

export type DuelStatus = 'waiting' | 'selecting' | 'ready' | 'revealing' | 'finished' | 'cancelled';

export interface AuraDuelParticipant {
  playerId: string;
  name: string;
  avatarIcon: string;
  title: string;
  hasLocked: boolean;
  selectedAuraId?: string;
  selectedAuraName?: string;
  selectedAuraRarity?: RarityTier;
  selectedAuraRank?: number;
  selectedAuraChance?: string;
  bestAuraId?: string;
  bestAuraName?: string;
  bestAuraRarity?: RarityTier;
  bestAuraRank?: number;
  bestAuraChance?: string;
}

export interface AuraDuelRoom {
  id: string;
  roomCode: string;
  status: DuelStatus;
  createdAt: number;
  updatedAt: number;
  host: AuraDuelParticipant;
  guest?: AuraDuelParticipant | null;
  winnerPlayerId?: string | null;
  loserPlayerId?: string | null;
  transferredAuraId?: string | null;
  transferredAuraName?: string | null;
  transferredAuraRarity?: RarityTier | null;
  isDraw?: boolean;
  lastEmote?: string;
  lastEmotePlayer?: string;
}

export interface TradeOfferItem {
  itemId: string;
  name: string;
  rarity: RarityTier;
  chance: string;
  count: number;
  luckBonus?: number;
  addedAt: number;
}

export interface TradeParticipant {
  playerId: string;
  name: string;
  avatar: string;
  title: string;
  offers: TradeOfferItem[];
  isLocked: boolean;
  isAccepted: boolean;
}

export type TradeStatus = 'waiting' | 'trading' | 'completed' | 'cancelled';

export interface TradeRoom {
  id: string;
  roomCode: string;
  status: TradeStatus;
  createdAt: number;
  updatedAt: number;
  host: TradeParticipant;
  guest?: TradeParticipant | null;
  completedSummary?: string;
  lastEmote?: string;
  lastEmotePlayer?: string;
}

export interface TradeHistoryEntry {
  id: string;
  timestamp: number;
  partnerName: string;
  partnerAvatar?: string;
  givenItems: { id: string; name: string; rarity: RarityTier; count: number }[];
  receivedItems: { id: string; name: string; rarity: RarityTier; count: number }[];
  status?: 'completed' | 'cancelled';
}

export type PerformanceMode = 'high' | 'balanced' | 'battery_saver';

export interface GameState {
  playerProfile?: PlayerProfile;
  totalRolls: number;
  rolls: number; // Money currency (Rolls)
  coins?: number; // Legacy compatibility
  essence: number;
  rebirthLevel: number; // Current Rebirth level (0 to 100 max)
  totalRebirths: number; // Total number of times rebirthed
  rebirthMultiplier: number; // Permanent luck & rolls multiplier
  inventory: Record<string, InventorySlot>;
  equippedItemId: string | null; // Primary / Legacy equipped aura
  equippedItemIds: string[]; // Multi-aura loadout (up to 9 simultaneous auras!)
  maxAuraSlots: number; // Up to 9 aura slots
  upgrades: Record<string, number>; // upgradeId -> level
  activePotions: ActivePotion[];
  unlockedAchievements: string[];
  autoRollActive: boolean;
  autoSkipThreshold: RarityTier | 'none';
  soundEnabled: boolean;
  fastRoll: boolean;
  performanceMode?: PerformanceMode;
  tradeHistory?: TradeHistoryEntry[];
  multiRollCount: number; // 1, 2, 5, 10, 25, 100, 1000... up to astronomical multi-roll!
  highestRarityRolled: RarityTier | null;
  dailyRewards: DailyRewardState;
  backgroundSettings?: BackgroundSettings;
  stats: {
    rollsByRarity: Record<RarityTier, number>;
    totalRollsEarned: number;
    totalCoinsEarned?: number; // Legacy compatibility
    totalEssenceEarned: number;
    highestLuckAchieved: number;
    totalRebirthsEarned?: number;
    totalItemsCrafted?: number;
    totalTradesCompleted?: number;
  };
}
