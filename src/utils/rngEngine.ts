import { GameState, Item, RarityTier, RollResult } from '../types';
import { RARITIES, RARITY_ORDER } from '../data/rarities';
import { ITEMS, ITEMS_BY_ID, ITEMS_BY_RARITY, BROKEN_GLASS_ITEM, RARITY_MIN_REBIRTH } from '../data/items';
import { BASE_UPGRADES } from '../data/upgrades';
import { REBIRTH_UPGRADES } from '../data/rebirthUpgrades';
import { checkIsDamalaEventActive } from '../services/eventService';

export interface NaniSinghUnlockProgress {
  dexCompleted: boolean;
  dexPercent: number;
  ownedDexCount: number;
  totalDexCount: number;
  rebirthCompleted: boolean;
  rebirthPercent: number;
  currentRebirth: number;
  maxRebirth: number;
  upgradesCompleted: boolean;
  upgradesPercent: number;
  currentUpgradesLevels: number;
  totalUpgradesMaxLevels: number;
  rebirthUpgradesCompleted: boolean;
  rebirthUpgradesPercent: number;
  currentRebirthUpgradesLevels: number;
  totalRebirthUpgradesMaxLevels: number;
  isFullyUnlocked: boolean;
  overallPercent: number;
}

export interface CalculatedLuck {
  totalLuck: number;
  baseLuck: number;
  equippedLuck: number;
  moneyMultiplier: number;
  itemLuckBonus?: number;
  rebirthLuckBonus: number;
  equippedItemName: string | null;
  equippedItemNames: string[];
  equippedCount: number;
  maxAuraSlots: number;
  potionLuck: number;
  essenceLuck: number;
  critChance: number;
  isCrit: boolean;
}

/**
 * Calculates effective luck and roll money multiplier from base upgrades, all equipped aura items in multi-slots, rebirth bonuses, active potions, and astral essence.
 */
export function calculateEffectiveLuck(state: GameState): CalculatedLuck {
  const baseLuckLevel = state.upgrades['base_luck'] || 0;
  const essenceLuckLevel = state.upgrades['essence_luck'] || 0;
  const critChanceLevel = state.upgrades['crit_luck_chance'] || 0;
  const slotUpgrades = state.upgrades['aura_slots_unlock'] || 0;

  const baseLuck = 1.0 + baseLuckLevel * 0.15;
  const essenceLuck = essenceLuckLevel * 0.5;

  // Rebirth multiplier bonus: +0.5x base luck per Rebirth level
  const rebirthLuckBonus = (state.rebirthLevel || 0) * 0.5;

  // Multi-aura slots: Base 1 + upgrades (each level grants +1 slot)
  const maxAuraSlots = Math.max(state.maxAuraSlots || 1, 1 + slotUpgrades);

  // Determine all equipped auras (supporting both equippedItemIds array and legacy equippedItemId)
  let equippedIds: string[] = [];
  if (Array.isArray(state.equippedItemIds) && state.equippedItemIds.length > 0) {
    equippedIds = state.equippedItemIds.slice(0, maxAuraSlots);
  } else if (state.equippedItemId) {
    equippedIds = [state.equippedItemId];
  }

  // Sum all equipped auras' luck multipliers and roll money multipliers
  let equippedLuck = 0;
  let equippedMoneyMultiplier = 0;
  const equippedItemNames: string[] = [];

  for (const id of equippedIds) {
    const item = ITEMS_BY_ID[id];
    if (item && !item.isBrokenGlass) {
      equippedLuck += item.luckBonus || 0;
      equippedMoneyMultiplier += (item.moneyMultiplier || 1);
      equippedItemNames.push(item.name);
    }
  }

  const moneyMultiplier = Math.max(1, equippedMoneyMultiplier || 1);
  const equippedItemName = equippedItemNames.length > 0 ? equippedItemNames.join(', ') : null;

  const now = Date.now();
  const activePotionsLuck = (state.activePotions || [])
    .filter((p) => p.expiresAt > now)
    .reduce((sum, p) => sum + p.luckMultiplier, 0);

  const critChance = critChanceLevel * 1.5; // percentage e.g. 15%
  const isCrit = Math.random() * 100 < critChance;

  let totalLuck = baseLuck + equippedLuck + essenceLuck + rebirthLuckBonus + activePotionsLuck;
  if (isCrit) {
    totalLuck *= 3.0; // 3x multiplier on critical roll!
  }

  return {
    totalLuck: Math.max(1.0, totalLuck),
    baseLuck,
    equippedLuck,
    moneyMultiplier,
    itemLuckBonus: equippedLuck,
    rebirthLuckBonus,
    equippedItemName,
    equippedItemNames,
    equippedCount: equippedIds.length,
    maxAuraSlots,
    potionLuck: activePotionsLuck,
    essenceLuck,
    critChance,
    isCrit,
  };
}

/**
 * Checks if the player has fully completed all non-secret standard Dex entries.
 */
export function isDexCompleted(inventory: Record<string, any>): boolean {
  const baseCatalog = ITEMS.filter(
    (item) => item.rarity !== 'nani_singh' && !item.isBrokenGlass && !item.isMergeExclusive && !item.isMergedVariant
  );
  if (baseCatalog.length === 0) return false;
  return baseCatalog.every((item) => (inventory[item.id]?.count || 0) > 0);
}

/**
 * Calculates live progress across the 4 requirements to unlock Nani Singh:
 * 1. 100% Dex Completion
 * 2. 100% Rebirth (Rebirth 100 / 100)
 * 3. 100% Base Upgrades (All base upgrades at level 10,000)
 * 4. 100% Rebirth Upgrades (All rebirth upgrades at level 10,000)
 */
export function getNaniSinghUnlockProgress(state: GameState): NaniSinghUnlockProgress {
  const inventory = state.inventory || {};
  const baseCatalog = ITEMS.filter(
    (item) => item.rarity !== 'nani_singh' && !item.isBrokenGlass && !item.isMergeExclusive && !item.isMergedVariant
  );
  const totalDexCount = Math.max(1, baseCatalog.length);
  const ownedDexCount = baseCatalog.filter((item) => (inventory[item.id]?.count || 0) > 0).length;
  const dexPercent = Number(((ownedDexCount / totalDexCount) * 100).toFixed(1));
  const dexCompleted = ownedDexCount >= totalDexCount;

  const currentRebirth = state.rebirthLevel || 0;
  const maxRebirth = 100;
  const rebirthPercent = Number((Math.min(100, (currentRebirth / maxRebirth) * 100)).toFixed(1));
  const rebirthCompleted = currentRebirth >= maxRebirth;

  // Base Upgrades
  let currentUpgradesLevels = 0;
  let totalUpgradesMaxLevels = 0;
  for (const upgrade of BASE_UPGRADES) {
    const lvl = state.upgrades[upgrade.id] || 0;
    currentUpgradesLevels += Math.min(upgrade.maxLevel, lvl);
    totalUpgradesMaxLevels += upgrade.maxLevel;
  }
  const upgradesPercent = totalUpgradesMaxLevels > 0
    ? Number(((currentUpgradesLevels / totalUpgradesMaxLevels) * 100).toFixed(1))
    : 0;
  const upgradesCompleted = currentUpgradesLevels >= totalUpgradesMaxLevels;

  // Rebirth Upgrades
  let currentRebirthUpgradesLevels = 0;
  let totalRebirthUpgradesMaxLevels = 0;
  for (const upgrade of REBIRTH_UPGRADES) {
    const lvl = state.upgrades[upgrade.id] || 0;
    currentRebirthUpgradesLevels += Math.min(upgrade.maxLevel, lvl);
    totalRebirthUpgradesMaxLevels += upgrade.maxLevel;
  }
  const rebirthUpgradesPercent = totalRebirthUpgradesMaxLevels > 0
    ? Number(((currentRebirthUpgradesLevels / totalRebirthUpgradesMaxLevels) * 100).toFixed(1))
    : 0;
  const rebirthUpgradesCompleted = currentRebirthUpgradesLevels >= totalRebirthUpgradesMaxLevels;

  const isFullyUnlocked = dexCompleted && rebirthCompleted && upgradesCompleted && rebirthUpgradesCompleted;
  const overallPercent = Number(
    ((dexPercent * 0.25) + (rebirthPercent * 0.25) + (upgradesPercent * 0.25) + (rebirthUpgradesPercent * 0.25)).toFixed(1)
  );

  return {
    dexCompleted,
    dexPercent,
    ownedDexCount,
    totalDexCount,
    rebirthCompleted,
    rebirthPercent,
    currentRebirth,
    maxRebirth,
    upgradesCompleted,
    upgradesPercent,
    currentUpgradesLevels,
    totalUpgradesMaxLevels,
    rebirthUpgradesCompleted,
    rebirthUpgradesPercent,
    currentRebirthUpgradesLevels,
    totalRebirthUpgradesMaxLevels,
    isFullyUnlocked,
    overallPercent,
  };
}

export interface RollContext {
  hasAntiShatter: boolean;
  hasLuckyDuck: boolean;
  hasAllHyperDimensionItems: boolean;
  hasTooMuch: boolean;
  hasAllBudaItems: boolean;
  isNaniSinghUnlocked: boolean;
  isDamalaLive: boolean;
  playerRebirth: number;
}

/**
 * Creates pre-computed roll context once per batch instead of recalculating
 * dex/inventory/upgrades arrays on every single item roll.
 */
export function getRollContext(state: GameState): RollContext {
  const playerRebirth = state.rebirthLevel || 0;
  const hasAntiShatter = playerRebirth >= 30 || ((state.upgrades['rebirth_upgrade_30'] || 0) > 0);
  const hasLuckyDuck = (state.upgrades['rebirth_upgrade_5'] || 0) > 0 || (playerRebirth >= 5 && (state.upgrades['rebirth_upgrade_5'] || 0) > 0);
  const hyperDimensionItems = ITEMS_BY_RARITY['hyper_dimension'] || [];
  const hasAllHyperDimensionItems = hyperDimensionItems.length > 0 && hyperDimensionItems.every(
    (item) => (state.inventory[item.id]?.count || 0) > 0
  );

  const hasTooMuch = (state.upgrades['rebirth_upgrade_15'] || 0) > 0 || (playerRebirth >= 15 && (state.upgrades['rebirth_upgrade_15'] || 0) > 0);
  const budaItems = ITEMS_BY_RARITY['buda'] || [];
  const hasAllBudaItems = budaItems.length > 0 && budaItems.every(
    (item) => (state.inventory[item.id]?.count || 0) > 0
  );

  const naniProgress = getNaniSinghUnlockProgress(state);
  const isNaniSinghUnlocked = naniProgress.isFullyUnlocked;
  const isDamalaLive = checkIsDamalaEventActive();

  return {
    hasAntiShatter,
    hasLuckyDuck,
    hasAllHyperDimensionItems,
    hasTooMuch,
    hasAllBudaItems,
    isNaniSinghUnlocked,
    isDamalaLive,
    playerRebirth,
  };
}

/**
 * Rolls for a single item based on current active luck, broken glass roll check, unlocked rebirth tiers, and secret dex achievements.
 */
export function rollSingleItem(
  luckData: CalculatedLuck,
  state: GameState,
  precalculatedContext?: RollContext
): RollResult {
  const luck = luckData.totalLuck;
  const ctx = precalculatedContext || getRollContext(state);
  const playerRebirth = ctx.playerRebirth;

  // 50% chance of Broken Glass (You got nothing!) unless Rebirth 30 upgrade is unlocked
  if (!ctx.hasAntiShatter && Math.random() < 0.50) {
    return {
      item: BROKEN_GLASS_ITEM,
      isNew: false,
      rolledAt: Date.now(),
      luckAtRoll: luck,
      isCrit: false,
      isBrokenGlass: true,
    };
  }

  let chosenRarity: RarityTier = 'common';

  // Iterate backwards from the rarest tier down to uncommon
  const evaluationTiers = RARITY_ORDER.slice(1).reverse();

  for (const rarity of evaluationTiers) {
    if (rarity === 'nani_singh') {
      if (!ctx.isNaniSinghUnlocked) continue;
    } else if (rarity === 'damala') {
      // Damala Rarity: ONLY available during the weekly Damala Event (Every Monday 5:00 to 5:30)
      if (!ctx.isDamalaLive) continue;
    } else {
      const minRb = RARITY_MIN_REBIRTH[rarity] || 0;
      if (playerRebirth < minRb) continue;
    }

    const config = RARITIES[rarity];
    if (!config) continue;

    // Boosted odds with luck (Damala receives +10x Event Luck Surge when live!)
    const effectiveTierLuck = rarity === 'damala' ? luck * 10 : luck;
    const boostedChance = (config.chancePercentage * effectiveTierLuck) / 100;

    const rollSample = Math.random();
    if (rollSample < boostedChance) {
      chosenRarity = rarity;
      break;
    }
  }

  // Lucky Duck Transmutation: Astral roll is magically converted into Hyper Dimension unless player already owns all Hyper Dimension items!
  const isTransmutedToHyperDimension = chosenRarity === 'astral' && ctx.hasLuckyDuck && !ctx.hasAllHyperDimensionItems;
  if (isTransmutedToHyperDimension) {
    chosenRarity = 'hyper_dimension';
  }

  // Too Much Transmutation: Infinite Loop roll is magically converted into Buda unless player already owns all Buda items!
  const isTransmutedToBuda = chosenRarity === 'infinite_loop' && ctx.hasTooMuch && !ctx.hasAllBudaItems;
  if (isTransmutedToBuda) {
    chosenRarity = 'buda';
  }

  const rawPool = ITEMS_BY_RARITY[chosenRarity] || ITEMS_BY_RARITY['common'] || [];

  // Filter pool by unlocked rebirth tier (items require minRebirth <= playerRebirth, or transmuted)
  const availableItems = rawPool.filter(
    (item) => item.minRebirth === undefined || item.minRebirth <= playerRebirth || (chosenRarity === 'hyper_dimension' && ctx.hasLuckyDuck) || (chosenRarity === 'buda' && ctx.hasTooMuch)
  );

  let finalPool = availableItems.length > 0 ? availableItems : rawPool;

  // If transmuted to Hyper Dimension via Lucky Duck and missing some Hyper Dimension items, prioritize rolling unowned Hyper Dimension items
  if (isTransmutedToHyperDimension) {
    const unownedHD = finalPool.filter((item) => !state.inventory[item.id] || state.inventory[item.id].count <= 0);
    if (unownedHD.length > 0) {
      finalPool = unownedHD;
    }
  }

  // If transmuted to Buda via Too Much and missing some Buda items, prioritize rolling unowned Buda items
  if (isTransmutedToBuda) {
    const unownedBuda = finalPool.filter((item) => !state.inventory[item.id] || state.inventory[item.id].count <= 0);
    if (unownedBuda.length > 0) {
      finalPool = unownedBuda;
    }
  }

  const chosenItem = finalPool[Math.floor(Math.random() * finalPool.length)] || finalPool[0] || BROKEN_GLASS_ITEM;
  const isNew = !state.inventory[chosenItem.id];

  return {
    item: chosenItem,
    isNew,
    rolledAt: Date.now(),
    luckAtRoll: luck,
    isCrit: luckData.isCrit,
    isBrokenGlass: false,
  };
}

/**
 * Calculates requirements for the next Rebirth level (up to 100 max).
 */
export function getRebirthRequirements(currentRebirth: number) {
  const nextRebirth = currentRebirth + 1;
  const isMaxed = currentRebirth >= 100;

  if (isMaxed) {
    return {
      nextRebirth: 100,
      requiredRolls: 0,
      requiredSpins: 0,
      isMaxed: true,
    };
  }

  // Smooth progressive scaling for rebirth costs
  const requiredRolls = Math.floor(500 * Math.pow(1.15, nextRebirth - 1));
  const requiredSpins = 25 * nextRebirth;

  return {
    nextRebirth,
    requiredRolls,
    requiredSpins,
    isMaxed: false,
  };
}

/**
 * Calculates current roll cooldown in milliseconds.
 * Clamped to prevent freezing the browser thread while preserving rapid progression.
 */
export function getRollCooldownMs(state: GameState): number {
  const speedLevel = state.upgrades['slower_cooldown'] || 0;
  const baseMs = Math.max(160, 1200 - Math.min(1000, speedLevel * 250));
  return state.fastRoll ? Math.max(90, Math.round(baseMs / 2)) : baseMs;
}

/**
 * Calculates current auto-roll interval in milliseconds based on cooldown.
 */
export function getAutoRollIntervalMs(state: GameState): number {
  return getRollCooldownMs(state);
}

/**
 * Calculates rolls executed per click based on the Extra Rolls Per Click upgrade.
 */
export function getRollsPerClick(state: GameState): number {
  const extraLevel = state.upgrades['extra_rolls_per_click'] || 0;
  return 1 + extraLevel;
}

/**
 * Calculates upgrade cost for a specific level with smooth scaling up to level 10,000 without numeric overflow.
 */
export function getUpgradeCostForLevel(baseCost: number, costMultiplier: number, currentLevel: number): number {
  if (currentLevel <= 0) return baseCost;
  if (currentLevel < 35) {
    return Math.round(baseCost * Math.pow(costMultiplier, currentLevel));
  }
  // Smooth polynomial scaling after level 35
  const baseAt35 = baseCost * Math.pow(costMultiplier, 35);
  const extra = currentLevel - 35;
  return Math.round(baseAt35 * (1 + extra * 0.35 + Math.pow(extra, 1.5) * 0.02));
}

/**
 * Calculates sell reward in Rolls currency with Roll Fortune upgrade bonus.
 * Broken glass sells for 10 rolls (or 100 rolls if Rebirth 15 Fix Glass upgrade is active).
 */
export function getSellValue(item: Item, state: GameState): { rolls: number; essence: number; coins: number } {
  if (item.isBrokenGlass || item.id === 'broken_glass') {
    const hasFixGlass = (state.upgrades['rebirth_upgrade_15'] || 0) > 0;
    const brokenGlassValue = hasFixGlass ? 100 : 10;
    return { rolls: brokenGlassValue, essence: 0, coins: brokenGlassValue };
  }

  const rollBonusLevel = state.upgrades['roll_multiplier'] || state.upgrades['coin_multiplier'] || 0;
  const essenceBonusLevel = state.upgrades['roll_essence_extractor'] || 0;

  const rollMultiplier = 1.0 + rollBonusLevel * 0.2;
  const rolls = Math.round(item.baseValue * rollMultiplier);
  const essence = item.essenceValue + essenceBonusLevel;

  return { rolls, essence, coins: rolls };
}

/**
 * Automatically determines the top highest-luck aura items from player inventory for Rebirth 10 Best Rolls upgrade.
 */
export function getAutoEquippedBestItemIds(inventory: Record<string, any>, maxSlots: number): string[] {
  const candidateItems: Item[] = [];

  for (const [id, rawSlot] of Object.entries(inventory)) {
    if (!rawSlot || rawSlot.count <= 0 || id === 'broken_glass') continue;
    const it = ITEMS_BY_ID[id];
    if (it && !it.isBrokenGlass) {
      candidateItems.push(it);
    }
  }

  // Sort by luckBonus descending, then rarity order descending, then baseValue descending
  candidateItems.sort((a, b) => {
    if (b.luckBonus !== a.luckBonus) return b.luckBonus - a.luckBonus;
    const diffRarity = RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity);
    if (diffRarity !== 0) return diffRarity;
    return b.baseValue - a.baseValue;
  });

  return candidateItems.slice(0, maxSlots).map((i) => i.id);
}

export const SUFFIX_LIST = [
  { value: 1e100, symbol: 'Googol' },
  { value: 1e99, symbol: 'Ttd' },
  { value: 1e96, symbol: 'Dtd' },
  { value: 1e93, symbol: 'Utd' },
  { value: 1e90, symbol: 'Tg' },
  { value: 1e87, symbol: 'Nvd' },
  { value: 1e84, symbol: 'Ocd' },
  { value: 1e81, symbol: 'Spd' },
  { value: 1e78, symbol: 'Sxd' },
  { value: 1e75, symbol: 'Qid' },
  { value: 1e72, symbol: 'Qad' },
  { value: 1e69, symbol: 'Td' },
  { value: 1e66, symbol: 'Dd' },
  { value: 1e63, symbol: 'Ud' },
  { value: 1e60, symbol: 'Nd' },
  { value: 1e57, symbol: 'Od' },
  { value: 1e54, symbol: 'Spd' },
  { value: 1e51, symbol: 'Sxd' },
  { value: 1e48, symbol: 'Qid' },
  { value: 1e45, symbol: 'Qad' },
  { value: 1e42, symbol: 'Td' },
  { value: 1e39, symbol: 'Dd' },
  { value: 1e36, symbol: 'Ud' },
  { value: 1e33, symbol: 'Dc' },
  { value: 1e30, symbol: 'No' },
  { value: 1e27, symbol: 'Oc' },
  { value: 1e24, symbol: 'Sp' },
  { value: 1e21, symbol: 'Sx' },
  { value: 1e18, symbol: 'Qi' },
  { value: 1e15, symbol: 'Qa' },
  { value: 1e12, symbol: 'T' },
  { value: 1e9, symbol: 'B' },
  { value: 1e6, symbol: 'M' },
  { value: 1e3, symbol: 'K' },
];

/**
 * Formats large astronomical numbers cleanly using standard suffixes like K, M, B, T, Qa, Qi, Sx, Sp, Oc, No, Dc, Ttd, Googol, Googolplex.
 * Never outputs raw long strings of zeros like 10000000000000000000000!
 */
export function formatBigNumber(value?: number | null): string {
  if (value === undefined || value === null || isNaN(value) || value === 0) return '0';
  if (value === Infinity || (!isFinite(value) && value > 0)) return '∞ (Infinite)';
  if (value >= 1e110) return '9 Googolplex';
  if (value >= 1e100) {
    const googols = value / 1e100;
    if (googols >= 999) return `${googols.toFixed(1).replace(/\.0$/, '')} Googol (Max)`;
    return `${googols.toFixed(2).replace(/\.00$/, '').replace(/(\.[0-9])0$/, '$1')} Googol`;
  }

  for (const s of SUFFIX_LIST) {
    if (value >= s.value) {
      const formatted = (value / s.value).toFixed(2).replace(/\.00$/, '').replace(/(\.[0-9])0$/, '$1');
      return `${formatted}${s.symbol}`;
    }
  }

  if (value >= 1000) return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
  return value.toLocaleString();
}

/**
 * Formats luck numbers cleanly using standard short suffixes without truncation.
 */
export function formatLuckBonus(luck?: number | null): string {
  if (luck === undefined || luck === null || isNaN(luck) || luck === 0) return '+0x';
  if (luck === Infinity || (!isFinite(luck) && luck > 0)) return '+∞x (Infinite Luck)';
  if (luck >= 1e110) return '+9 Googolplex Luck';
  if (luck >= 1e100) {
    const g = luck / 1e100;
    return `+${g.toFixed(1).replace(/\.0$/, '')} Googol x`;
  }

  for (const s of SUFFIX_LIST) {
    if (luck >= s.value) {
      const formatted = (luck / s.value).toFixed(2).replace(/\.00$/, '').replace(/(\.[0-9])0$/, '$1');
      return `+${formatted} ${s.symbol} Luck`;
    }
  }

  if (luck >= 1000) return `+${luck.toLocaleString(undefined, { maximumFractionDigits: 0 })}x`;
  if (luck < 1) return `+${luck.toFixed(2)}x`;
  return `+${luck.toFixed(1).replace(/\.0$/, '')}x`;
}

/**
 * Formats a percentage or probability safely without zero-truncation.
 */
export function formatPercentageSafe(percent?: number | null, rollsCount: number = 1, totalRolls: number = 1): string {
  if (percent === undefined || percent === null || isNaN(percent) || rollsCount === 0 || percent === 0) {
    return '0%';
  }
  if (percent === Infinity || (!isFinite(percent) && percent > 0)) {
    return '100% (Guaranteed)';
  }
  if (percent >= 1) {
    return `${percent.toFixed(2).replace(/\.00$/, '')}%`;
  }
  if (percent >= 0.01) {
    return `${percent.toFixed(2)}%`;
  }
  if (percent >= 0.0001) {
    return `${percent.toFixed(4)}%`;
  }
  if (totalRolls > 0 && rollsCount > 0) {
    const oneIn = Math.round(totalRolls / rollsCount);
    return `1 in ${formatBigNumber(oneIn)}`;
  }
  return `${percent.toPrecision(2)}%`;
}

/**
 * Formats a money multiplier cleanly with short units (e.g., 2.0x, 200x, 50K x, 2.5M x, 1T x, 20 Spd x).
 */
export function formatMoneyMultiplier(mult?: number | null): string {
  if (mult === undefined || mult === null || isNaN(mult) || mult <= 1) return '1.0x';
  if (mult === Infinity || (!isFinite(mult) && mult > 0)) return '∞x (Infinite Multiplier)';
  if (mult >= 1000) {
    for (const s of SUFFIX_LIST) {
      if (mult >= s.value) {
        const formatted = (mult / s.value).toFixed(2).replace(/\.00$/, '').replace(/(\.[0-9])0$/, '$1');
        return `${formatted} ${s.symbol}x`;
      }
    }
    return `${formatBigNumber(mult)}x`;
  }
  return `${mult.toFixed(1).replace(/\.0$/, '')}x`;
}
