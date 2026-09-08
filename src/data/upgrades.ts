import { Upgrade, Achievement } from '../types';
import { REBIRTH_UPGRADES } from './rebirthUpgrades';

export const BASE_UPGRADES: Upgrade[] = [
  // LUCK CATEGORY
  {
    id: 'base_luck',
    name: 'Clover of Fortune',
    description: 'Increases base luck multiplier, raising drop chances for all high-tier auras.',
    icon: 'Clover',
    category: 'luck',
    costCurrency: 'rolls',
    baseCost: 25,
    costMultiplier: 1.15,
    maxLevel: 10000,
    effectValuePerLevel: 0.15, // +15% luck per level
    unit: 'x Luck',
    prefix: '+',
  },
  {
    id: 'crit_luck_chance',
    name: 'Serendipity Spark',
    description: 'Grants a chance for any roll to become a Critical Roll with 300% amplified Luck.',
    icon: 'Zap',
    category: 'luck',
    costCurrency: 'rolls',
    baseCost: 100,
    costMultiplier: 1.16,
    maxLevel: 10000,
    effectValuePerLevel: 0.05, // scales up to 500%
    unit: '% Crit Chance',
    prefix: '+',
  },
  {
    id: 'essence_luck',
    name: 'Astral Resonance',
    description: 'Channel pure item essence into an overarching permanent aura luck enhancement.',
    icon: 'Sparkles',
    category: 'luck',
    costCurrency: 'essence',
    baseCost: 10,
    costMultiplier: 1.14,
    maxLevel: 10000,
    effectValuePerLevel: 0.5, // +0.5x luck per level
    unit: 'x Astral Luck',
    prefix: '+',
  },

  // SPEED CATEGORY
  {
    id: 'extra_rolls_per_click',
    name: 'Multi-Cast Roll Burst',
    description: 'Each upgrade level makes you roll +1 additional time whenever you click Roll (up to 10,000 rolls per click!).',
    icon: 'Dices',
    category: 'speed',
    costCurrency: 'rolls',
    baseCost: 10,
    costMultiplier: 1.025,
    maxLevel: 10000,
    effectValuePerLevel: 1,
    unit: ' Rolls/Click',
    prefix: '+',
  },
  {
    id: 'slower_cooldown',
    name: 'Temporal Quickcast (Cooldown Reduction)',
    description: 'Accelerates the roll cooldown, taking time off delay per level for rapid hyper-speed rolling.',
    icon: 'Hourglass',
    category: 'speed',
    costCurrency: 'rolls',
    baseCost: 35,
    costMultiplier: 1.05,
    maxLevel: 10000,
    effectValuePerLevel: 0.05,
    unit: 's Cooldown Reduction',
    prefix: '-',
  },
  {
    id: 'aura_slots_unlock',
    name: 'Aura Loadout Conduits (Equip More Auras)',
    description: 'Expands your aura loadout capacity, giving you +1 equipped aura slot per level! Stack more simultaneous auras together to compound their luck and roll multipliers.',
    icon: 'Layers',
    category: 'utility',
    costCurrency: 'rolls',
    baseCost: 100,
    costMultiplier: 1.25,
    maxLevel: 10000,
    effectValuePerLevel: 1,
    unit: ' Aura Slot',
    prefix: '+',
  },
  {
    id: 'auto_roll_unlock',
    name: 'Perpetual Motor',
    description: 'Unlocks the automated rolling system and continuously supercharges auto-spin throughput across all 10,000 levels.',
    icon: 'PlayCircle',
    category: 'speed',
    costCurrency: 'rolls',
    baseCost: 50,
    costMultiplier: 1.08,
    maxLevel: 10000,
    effectValuePerLevel: 1,
    unit: 'x Motor Power',
    prefix: '+',
  },
  {
    id: 'auto_roll_speed',
    name: 'Chrono Accelerator',
    description: 'Enhances auto-spin sync and instant quantum roll execution.',
    icon: 'Timer',
    category: 'speed',
    costCurrency: 'rolls',
    baseCost: 80,
    costMultiplier: 1.09,
    maxLevel: 10000,
    effectValuePerLevel: 0.1,
    unit: 'x Auto Sync',
    prefix: '+',
  },
  {
    id: 'multi_roll_unlock',
    name: 'Quantum Splitter',
    description: 'Allows rolling massive batches of items simultaneously in a single roll cycle (Unlocks 2x, 5x, 10x, 25x, 100x, 1,000x, 10,000x multi-roll modes).',
    icon: 'Layers',
    category: 'speed',
    costCurrency: 'rolls',
    baseCost: 300,
    costMultiplier: 1.12,
    maxLevel: 10000,
    effectValuePerLevel: 1,
    unit: 'Roll Tier',
    prefix: 'Tier ',
  },

  // ECONOMY CATEGORY
  {
    id: 'roll_multiplier',
    name: 'Roll Fortune',
    description: 'Increases Rolls Money obtained from spinning, selling items, and claiming milestone rewards.',
    icon: 'Dices',
    category: 'economy',
    costCurrency: 'rolls',
    baseCost: 40,
    costMultiplier: 1.08,
    maxLevel: 10000,
    effectValuePerLevel: 0.25, // +25% rolls money
    unit: '% Bonus Rolls',
    prefix: '+',
  },
  {
    id: 'roll_essence_extractor',
    name: 'Essence Condenser',
    description: 'Extracts extra mystical essence whenever you spin, sell, or auto-recycle duplicate items.',
    icon: 'Flame',
    category: 'economy',
    costCurrency: 'essence',
    baseCost: 15,
    costMultiplier: 1.10,
    maxLevel: 10000,
    effectValuePerLevel: 1, // +1 bonus essence
    unit: 'Bonus Essence',
    prefix: '+',
  },
];

/**
 * Robust cost calculation that supports scaling up to 10,000 upgrade levels smoothly without Infinity/NaN.
 */
export function calculateUpgradeCost(upgrade: Upgrade, currentLevel: number): number {
  if (currentLevel >= upgrade.maxLevel) return 0;
  const base = upgrade.baseCost;
  const mult = upgrade.costMultiplier;

  if (currentLevel < 60) {
    const raw = base * Math.pow(mult, currentLevel);
    return Math.max(1, Math.round(raw));
  }

  // Smooth polynomial transition above level 60 to allow scaling up to level 10,000 without hitting Infinity
  const costAt60 = base * Math.pow(mult, 60);
  const extraLevels = currentLevel - 60;
  const growth = 1 + extraLevels * 0.8 + Math.pow(extraLevels / 25, 2.1);
  const cost = costAt60 * growth;
  return Math.max(1, Math.round(Math.min(1e14, cost)));
}

/**
 * Calculates how many levels can be bought in bulk and the total cost.
 */
export function calculateMaxAffordableLevels(
  upgrade: Upgrade,
  currentLevel: number,
  balance: number,
  maxDesiredLevels: number = 10000
): { count: number; totalCost: number } {
  let count = 0;
  let totalCost = 0;
  const maxPossible = Math.min(maxDesiredLevels, upgrade.maxLevel - currentLevel);

  for (let i = 0; i < maxPossible; i++) {
    const costForNext = calculateUpgradeCost(upgrade, currentLevel + i);
    if (totalCost + costForNext <= balance) {
      totalCost += costForNext;
      count++;
    } else {
      break;
    }
  }

  return { count, totalCost };
}

export const UPGRADES: Upgrade[] = [...BASE_UPGRADES, ...REBIRTH_UPGRADES];

export const POTIONS_SHOP = [
  {
    id: 'potion_minor_luck',
    name: 'Elixir of Minor Luck',
    description: 'Grants +1.0x Luck multiplier for 60 seconds.',
    luckMultiplier: 1.0,
    durationSeconds: 60,
    costRolls: 75,
    costCoins: 75,
    costEssence: 0,
    icon: 'FlaskConical',
  },
  {
    id: 'potion_super_luck',
    name: 'Celestial Draught',
    description: 'Grants +3.0x Luck multiplier for 45 seconds.',
    luckMultiplier: 3.0,
    durationSeconds: 45,
    costRolls: 350,
    costCoins: 350,
    costEssence: 15,
    icon: 'Sparkles',
  },
  {
    id: 'potion_hyper_luck',
    name: 'Singularity Ambience',
    description: 'Grants +8.0x Luck multiplier for 30 seconds!',
    luckMultiplier: 8.0,
    durationSeconds: 30,
    costRolls: 1200,
    costCoins: 1200,
    costEssence: 60,
    icon: 'Flame',
  },
];

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_roll',
    name: 'The First Spark',
    description: 'Perform your very first roll.',
    icon: 'Dices',
    rewardRolls: 20,
    rewardEssence: 2,
    type: 'rolls',
    targetValue: 1,
  },
  {
    id: 'rolls_50',
    name: 'Apprentice Gambler',
    description: 'Complete 50 total rolls.',
    icon: 'RefreshCw',
    rewardRolls: 100,
    rewardEssence: 10,
    type: 'rolls',
    targetValue: 50,
  },
  {
    id: 'rolls_500',
    name: 'Veteran Destiny Seeker',
    description: 'Complete 500 total rolls.',
    icon: 'Zap',
    rewardRolls: 1000,
    rewardEssence: 50,
    type: 'rolls',
    targetValue: 500,
  },
  {
    id: 'rolls_2500',
    name: 'Master of Probabilities',
    description: 'Reach 2,500 total rolls.',
    icon: 'Flame',
    rewardRolls: 5000,
    rewardEssence: 200,
    type: 'rolls',
    targetValue: 2500,
  },
  {
    id: 'rarity_epic',
    name: 'Purple Luminescence',
    description: 'Roll an Epic or higher rarity item.',
    icon: 'Crown',
    rewardRolls: 250,
    rewardEssence: 25,
    type: 'rarity',
    targetValue: 'epic',
  },
  {
    id: 'rarity_legendary',
    name: 'Golden Destiny',
    description: 'Roll a Legendary (1 in 52.6) or higher item.',
    icon: 'Sun',
    rewardRolls: 1500,
    rewardEssence: 100,
    type: 'rarity',
    targetValue: 'legendary',
  },
  {
    id: 'rarity_mythic',
    name: 'Reality Shatterer',
    description: 'Roll a Mythic (1 in 1,000) item!',
    icon: 'Atom',
    rewardRolls: 8000,
    rewardEssence: 500,
    type: 'rarity',
    targetValue: 'mythic',
  },
  {
    id: 'rarity_celestial',
    name: 'Touch of the Demiurge',
    description: 'Roll a Celestial (1 in 10,000) or higher item!',
    icon: 'Eye',
    rewardRolls: 30000,
    rewardEssence: 2000,
    type: 'rarity',
    targetValue: 'celestial',
  },
  {
    id: 'rarity_transcendent',
    name: 'Ascended Transcendent',
    description: 'Roll a Transcendent (1 in 100,000) aura!',
    icon: 'Sparkles',
    rewardRolls: 100000,
    rewardEssence: 10000,
    type: 'rarity',
    targetValue: 'transcendent',
  },
  {
    id: 'rarity_infernal',
    name: 'Infernal Hellfire',
    description: 'Roll an Infernal (1 in 1,000,000) aura!',
    icon: 'Flame',
    rewardRolls: 500000,
    rewardEssence: 50000,
    type: 'rarity',
    targetValue: 'infernal',
  },
  {
    id: 'rarity_singularity',
    name: 'Gravitational Singularity',
    description: 'Roll a Singularity (1 in 50,000,000) aura!',
    icon: 'Disc',
    rewardRolls: 5000000,
    rewardEssence: 500000,
    type: 'rarity',
    targetValue: 'singularity',
  },
  {
    id: 'rarity_genesis',
    name: 'Genesis Origin',
    description: 'Roll a Genesis (1 in 1 Billion) aura!',
    icon: 'Sparkle',
    rewardRolls: 50000000,
    rewardEssence: 5000000,
    type: 'rarity',
    targetValue: 'genesis',
  },
  {
    id: 'rarity_absolute',
    name: 'The RNG Zenith',
    description: 'Roll the Absolute (1 in 1 Trillion) aura!',
    icon: 'Crown',
    rewardRolls: 1000000000,
    rewardEssence: 100000000,
    type: 'rarity',
    targetValue: 'absolute',
  },
  {
    id: 'rarity_omniverse',
    name: 'Omniverse Ruler',
    description: 'Roll the Omniverse (1 in 100 Trillion) aura!',
    icon: 'Orbit',
    rewardRolls: 10000000000,
    rewardEssence: 500000000,
    type: 'rarity',
    targetValue: 'omniverse',
  },
  {
    id: 'rarity_googol',
    name: 'Googol Transcendent',
    description: 'Roll a 1 in 1 Googol (10¹⁰⁰) aura!',
    icon: 'Disc',
    rewardRolls: 1e15,
    rewardEssence: 1e12,
    type: 'rarity',
    targetValue: 'googol',
  },
  {
    id: 'rarity_googol_999',
    name: '999 Googol God',
    description: 'Roll a 1 in 999 Googol (9.99×10¹⁰²) aura!',
    icon: 'Zap',
    rewardRolls: 1e20,
    rewardEssence: 1e16,
    type: 'rarity',
    targetValue: 'googol_999',
  },
  {
    id: 'rarity_googolplex_9',
    name: '9 Googolplex Master of 9 Infinities',
    description: 'Roll the 9 Googolplex Apex aura (1 in 9 Googolplex)!',
    icon: 'Sparkles',
    rewardRolls: 1e30,
    rewardEssence: 1e25,
    type: 'rarity',
    targetValue: 'googolplex_9',
  },
  {
    id: 'coins_1000',
    name: 'Roll Tycoon Initiate',
    description: 'Accumulate 1,000 Rolls as currency.',
    icon: 'Dices',
    rewardRolls: 200,
    rewardEssence: 15,
    type: 'coins',
    targetValue: 1000,
  },
  {
    id: 'coins_25000',
    name: 'Rolls of the Cosmos',
    description: 'Accumulate 25,000 Rolls as currency.',
    icon: 'Sparkles',
    rewardRolls: 5000,
    rewardEssence: 250,
    type: 'coins',
    targetValue: 25000,
  },
  {
    id: 'coins_1000000',
    name: 'Multi-Millionaire Gambler',
    description: 'Accumulate 1,000,000 Rolls as currency.',
    icon: 'Coins',
    rewardRolls: 250000,
    rewardEssence: 25000,
    type: 'coins',
    targetValue: 1000000,
  },
  {
    id: 'rebirth_1',
    name: 'First Ascension',
    description: 'Perform your very first Rebirth to unlock 100 new items & upgrade.',
    icon: 'Sparkles',
    rewardRolls: 500,
    rewardEssence: 25,
    type: 'rolls',
    targetValue: 1,
  },
  {
    id: 'rebirth_10',
    name: 'Deca-Ascendant',
    description: 'Achieve Rebirth Level 10.',
    icon: 'Flame',
    rewardRolls: 5000,
    rewardEssence: 250,
    type: 'rolls',
    targetValue: 10,
  },
  {
    id: 'rebirth_50',
    name: 'Half-Centurion Paragon',
    description: 'Achieve Rebirth Level 50 (5,000+ items unlocked!).',
    icon: 'Crown',
    rewardRolls: 100000,
    rewardEssence: 5000,
    type: 'rolls',
    targetValue: 50,
  },
  {
    id: 'rebirth_100',
    name: 'Rebirth 100 Godhead Sovereign',
    description: 'Max out all 100 Rebirths! All 10,000+ items and 100 rebirth upgrades unlocked.',
    icon: 'Crown',
    rewardRolls: 10000000,
    rewardEssence: 500000,
    type: 'rolls',
    targetValue: 100,
  },
];
