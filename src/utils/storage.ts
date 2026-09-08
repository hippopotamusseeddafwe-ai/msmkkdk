import { GameState, RarityTier } from '../types';
import { RARITY_ORDER } from '../data/rarities';
import { ensureItemRegistered } from '../data/items';
import { DEFAULT_BACKGROUND_SETTINGS } from '../data/backgroundThemes';

const STORAGE_KEY = 'rng_game_state_v1';
export const LAST_LOGIN_STORAGE_KEY = 'rng_last_login_date';

const initialRollsByRarity = RARITY_ORDER.reduce((acc, rarity) => {
  acc[rarity] = 0;
  return acc;
}, {} as Record<RarityTier, number>);

export const INITIAL_GAME_STATE: GameState = {
  totalRolls: 0,
  rolls: 100, // Starting Rolls balance (currency)
  coins: 100, // Legacy fallback
  essence: 5,
  rebirthLevel: 0, // Current Rebirth level (0 to 100)
  totalRebirths: 0,
  rebirthMultiplier: 1.0,
  inventory: {},
  equippedItemId: null,
  equippedItemIds: [],
  maxAuraSlots: 9, // Up to 9 aura slots for maximum aura combinations!
  upgrades: {
    extra_rolls_per_click: 0,
    slower_cooldown: 0,
    aura_slots_unlock: 8, // Unlock full 9 slots
    base_luck: 0,
    crit_luck_chance: 0,
    essence_luck: 0,
    auto_roll_unlock: 0,
    auto_roll_speed: 0,
    multi_roll_unlock: 0,
    roll_multiplier: 0,
    coin_multiplier: 0,
    roll_essence_extractor: 0,
  },
  activePotions: [],
  unlockedAchievements: [],
  autoRollActive: false,
  autoSkipThreshold: 'none',
  soundEnabled: true,
  fastRoll: false,
  multiRollCount: 1,
  highestRarityRolled: null,
  dailyRewards: {
    lastClaimDate: null,
    streakDays: 1,
    totalDailyClaims: 0,
    freeRollTokens: 0,
  },
  backgroundSettings: DEFAULT_BACKGROUND_SETTINGS,
  stats: {
    rollsByRarity: initialRollsByRarity,
    totalRollsEarned: 50,
    totalCoinsEarned: 50,
    totalEssenceEarned: 5,
    highestLuckAchieved: 1.0,
  },
};

export function loadSavedGameState(): GameState {
  if (typeof window === 'undefined') {
    return INITIAL_GAME_STATE;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const legacyLastLogin = localStorage.getItem(LAST_LOGIN_STORAGE_KEY);

    if (!raw) {
      if (legacyLastLogin) {
        return {
          ...INITIAL_GAME_STATE,
          dailyRewards: {
            ...INITIAL_GAME_STATE.dailyRewards,
            lastClaimDate: legacyLastLogin,
          },
        };
      }
      return INITIAL_GAME_STATE;
    }

    const parsed = JSON.parse(raw);
    const rollsBalance = parsed.rolls ?? parsed.coins ?? INITIAL_GAME_STATE.rolls;
    const totalRollsEarned =
      parsed.stats?.totalRollsEarned ?? parsed.stats?.totalCoinsEarned ?? rollsBalance;

    const rawInventory = parsed.inventory || {};
    // Ensure all items (including fused variants) exist in lookup tables
    Object.keys(rawInventory).forEach((itemId) => {
      ensureItemRegistered(itemId);
    });

    const equippedItemIds: string[] = Array.isArray(parsed.equippedItemIds)
      ? parsed.equippedItemIds
      : parsed.equippedItemId
      ? [parsed.equippedItemId]
      : [];

    return {
      ...INITIAL_GAME_STATE,
      ...parsed,
      rebirthLevel: Math.min(100, Math.max(0, parsed.rebirthLevel ?? 0)),
      totalRebirths: parsed.totalRebirths ?? parsed.rebirthLevel ?? 0,
      rebirthMultiplier: parsed.rebirthMultiplier || (1 + (parsed.rebirthLevel ?? 0) * 0.5),
      rolls: rollsBalance,
      coins: rollsBalance,
      equippedItemIds,
      maxAuraSlots: parsed.maxAuraSlots || 9,
      inventory: rawInventory,
      upgrades: { ...INITIAL_GAME_STATE.upgrades, ...(parsed.upgrades || {}) },
      dailyRewards: {
        ...INITIAL_GAME_STATE.dailyRewards,
        ...(parsed.dailyRewards || {}),
        lastClaimDate: parsed.dailyRewards?.lastClaimDate || legacyLastLogin || null,
      },
      backgroundSettings: {
        ...DEFAULT_BACKGROUND_SETTINGS,
        ...(parsed.backgroundSettings || {}),
      },
      stats: {
        ...INITIAL_GAME_STATE.stats,
        ...(parsed.stats || {}),
        totalRollsEarned,
        totalCoinsEarned: totalRollsEarned,
        rollsByRarity: {
          ...initialRollsByRarity,
          ...(parsed.stats?.rollsByRarity || {}),
        },
      },
    };
  } catch (err) {
    console.error('Failed to load RNG game state:', err);
    return INITIAL_GAME_STATE;
  }
}

let saveTimeout: ReturnType<typeof setTimeout> | null = null;
let lastPendingState: GameState | null = null;

function flushSave(): void {
  if (typeof window === 'undefined' || !lastPendingState) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lastPendingState));
    if (lastPendingState.dailyRewards?.lastClaimDate) {
      localStorage.setItem(LAST_LOGIN_STORAGE_KEY, lastPendingState.dailyRewards.lastClaimDate);
    }
  } catch (err) {
    console.error('Failed to save RNG game state:', err);
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', flushSave);
  window.addEventListener('pagehide', flushSave);
}

export function saveGameState(state: GameState, immediate: boolean = false): void {
  if (typeof window === 'undefined') return;
  lastPendingState = state;

  if (immediate) {
    if (saveTimeout) {
      clearTimeout(saveTimeout);
      saveTimeout = null;
    }
    flushSave();
    return;
  }

  if (!saveTimeout) {
    saveTimeout = setTimeout(() => {
      saveTimeout = null;
      flushSave();
    }, 400);
  }
}

export function clearSavedGameState(): void {
  if (typeof window === 'undefined') return;
  if (saveTimeout) {
    clearTimeout(saveTimeout);
    saveTimeout = null;
  }
  lastPendingState = null;
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LAST_LOGIN_STORAGE_KEY);
  } catch (err) {
    console.error('Failed to reset RNG game state:', err);
  }
}
