import { Item, RarityTier } from '../types';
import { RARITY_ORDER, RARITIES } from './rarities';

// Seedable deterministic pseudo-random helper for consistent item attributes
function pseudoRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

const PREFIXES = [
  'Aetherial', 'Chrono', 'Void', 'Cosmic', 'Solar', 'Lunar', 'Astral', 'Nebula', 'Singularity', 'Quantum',
  'Celestial', 'Abyssal', 'Infernal', 'Glacial', 'Radiant', 'Eldritch', 'Prismatic', 'Mythic', 'Hyper', 'Genesis',
  'Titan', 'Dragon', 'Phantom', 'Eclipse', 'Horizon', 'Infinity', 'Aura', 'Spectral', 'Starlight', 'Omni',
  'Thunder', 'Vortex', 'Galactic', 'Absolute', 'Divine', 'Zenith', 'Null', 'Arcane', 'Mirage', 'Sovereign',
  'Cyber', 'Matrix', 'Supernova', 'Eternal', 'Apex', 'Dimensional', 'Fractal', 'Pulsar', 'Giga', 'Googol',
];

const ROOT_NOUNS = [
  'Blade', 'Crown', 'Orb', 'Shard', 'Amulet', 'Ring', 'Scepter', 'Relic', 'Crystal', 'Essence',
  'Heart', 'Eye', 'Beacon', 'Prism', 'Gauntlet', 'Wings', 'Soul', 'Tome', 'Mirror', 'Compass',
  'Hourglass', 'Chalice', 'Nexus', 'Pillar', 'Core', 'Sigil', 'Lantern', 'Key', 'Crown', 'Diadem',
  'Veil', 'Halo', 'Glyph', 'Emblem', 'Singularity', 'Nova', 'Matrix', 'Loop', 'Monolith', 'Star',
];

const SUFFIX_TITLES = [
  'of the Infinite', 'of Eternity', 'of the Void', 'of the Cosmos', 'of Ascension',
  'of Fate', 'of Fortune', 'of the Eclipse', 'of the Omniverse', 'of the Continuum',
  'of the Apex', 'of Genesis', 'of Oblivion', 'of Divine Will', 'of Absolute Luck',
  'of the Rift', 'of Supernovas', 'of Starlight', 'of Quantum Flow', 'of the Rebirth',
];

const ICONS = [
  'Sparkles', 'Zap', 'Flame', 'Crown', 'Gem', 'Atom', 'Sun', 'Moon', 'Star', 'Compass',
  'Heart', 'Shield', 'Sword', 'Eye', 'Orbit', 'Hourglass', 'Infinity', 'Feather', 'Disc', 'Key',
];

const AURA_TYPES: Array<Item['auraType']> = [
  'orbit', 'flame', 'sparkle', 'vortex', 'rainbow', 'divine', 'smoke', 'quantum', 'cosmic', 'glitch', 'nebula', 'singularity'
];

/**
 * Generates 100 distinct items for each Rebirth level from 1 to 100 (10,000 items total).
 */
export function generateRebirthItems(): Item[] {
  const items: Item[] = [];
  const rarityCount = RARITY_ORDER.length;

  for (let rebirth = 1; rebirth <= 100; rebirth++) {
    // Determine the minimum and maximum rarity distribution for this rebirth tier
    // Higher rebirths have higher baseline rarities available in their 100 items
    const minRarityIndex = Math.min(rarityCount - 5, Math.floor((rebirth - 1) * 0.35));
    const maxRarityIndex = Math.min(rarityCount - 1, minRarityIndex + 10 + Math.floor(rebirth * 0.25));
    const availableTiers = RARITY_ORDER.slice(minRarityIndex, maxRarityIndex + 1);

    for (let i = 1; i <= 100; i++) {
      const seed = rebirth * 1000 + i;
      const prefixIdx = Math.floor(pseudoRandom(seed + 1) * PREFIXES.length);
      const nounIdx = Math.floor(pseudoRandom(seed + 2) * ROOT_NOUNS.length);
      const suffixIdx = Math.floor(pseudoRandom(seed + 3) * SUFFIX_TITLES.length);
      const iconIdx = Math.floor(pseudoRandom(seed + 4) * ICONS.length);
      const auraIdx = Math.floor(pseudoRandom(seed + 5) * AURA_TYPES.length);

      const rarityTierIdx = Math.floor(pseudoRandom(seed + 6) * availableTiers.length);
      const rarity = availableTiers[rarityTierIdx];
      const rConfig = RARITIES[rarity];

      const name = `${PREFIXES[prefixIdx]} ${ROOT_NOUNS[nounIdx]} ${SUFFIX_TITLES[suffixIdx]}`;
      const id = `rb_${rebirth}_item_${i}_${ROOT_NOUNS[nounIdx].toLowerCase()}`;

      // Scaling luck bonus and roll multipliers according to 1-in-N rarity odds and rebirth tier
      const chance = rConfig?.chancePercentage || 50;
      const denominator = chance > 0 ? (100 / chance) : 2;
      const baseOddsStat = denominator <= 2 ? 2 : Math.round(2 * denominator);
      const rebirthMultiplier = 1 + (rebirth - 1) * 0.15;
      const subRatio = 1 + (i - 1) * 0.003;

      const luckBonus = Math.round(baseOddsStat * rebirthMultiplier * subRatio);
      const moneyMultiplier = Math.max(2, Math.round(baseOddsStat * rebirthMultiplier * subRatio));
      const baseValue = Math.round(luckBonus * 1.25);
      const essenceValue = Math.max(1, Math.round(Math.min(1e9, Math.sqrt(luckBonus) * 1.5)));

      items.push({
        id,
        name,
        rarity,
        lore: `Unlocked at Rebirth ${rebirth} (Item #${i}/100) of the ${rConfig?.name || rarity} tier (${rConfig?.oneInChance || '1 in 2'}). Grants +${luckBonus.toLocaleString()} luck and ${moneyMultiplier.toLocaleString()}x roll money earnings.`,
        baseValue,
        essenceValue,
        luckBonus,
        moneyMultiplier,
        icon: ICONS[iconIdx],
        auraType: AURA_TYPES[auraIdx],
        flavorTitle: `Rebirth ${rebirth} Paragon #${i}`,
        minRebirth: rebirth,
      });
    }
  }

  return items;
}

export const REBIRTH_ITEMS: Item[] = generateRebirthItems();
