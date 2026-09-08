import { Upgrade } from '../types';

export const REBIRTH_UPGRADE_NAMES: string[] = [
  'Prismatic Rebirth Spark',
  'Quantum Coin Multiplier',
  'Temporal Quick-Burst',
  'Astral Essence Conduit',
  'Lucky Duck (Astral -> Hyper Dimension)', // Rebirth 5
  'Supernova Luck Matrix',
  'Solar Flare Roll Boost',
  'Lunar Phase Accelerator',
  'Singularity Luck Reactor',
  'Best Rolls (Auto-Equip Best Auras)', // Rebirth 10
  // 11-20
  'Aetherial Fortune Pulse',
  'Chrono-Warp Harvest',
  'Void-Forged Luck Core',
  'Starlight Alchemy',
  'Too Much (Infinite Loop -> Buda)', // Rebirth 15
  'Hyperborean Frost Luck',
  'Genesis Catalyst',
  'Eldritch Eye of Fortune',
  'Multiverse Flux Generator',
  'Infinity Loop Extractor',
  // 21-30
  'Apotheosis Ascension Core',
  'Nihility Transmutation',
  'Omnipresent Magnetism',
  'Absolute Probability Field',
  'Omniverse Singularity',
  'Centillion Power Grid',
  'Googol Luck Overcharge',
  'Googolplex Harmonic Matrix',
  'Divine Spark Amplifier',
  'Anti-Shatter Matrix (Glassbreaker)', // Rebirth 30
  // 31-40
  'Celestial Fortune Engine',
  'Radiant Aura Synchronizer',
  'Chrono-Stream Hyperdrive',
  'Ethereal Roll Synthesizer',
  'Cosmic Nebula Capacitor',
  'Quantum Duplication Relay',
  'Titan Forge of Wealth',
  'Phantom Luck Resonance',
  'Eclipse Horizon Lens',
  'Spectral Pulse Infuser',
  // 41-50
  'Stellar Ignition Node',
  'Vortex Dice Magnet',
  'Absolute Zenith Prism',
  'Null-Space Energy Core',
  'Arcane Miracle Forge',
  'Mirage Probability Shifter',
  'Sovereign Rebirth Crown',
  'Cybernetic Dice Engine',
  'Matrix Quantum Weaver',
  'Supernova Apex Core',
  // 51-60
  'Eternal Fortune Dynamo',
  'Apex Celestial Conduit',
  'Dimensional Rift Harness',
  'Fractal Luck Resonator',
  'Pulsar Beam Extractor',
  'Giga-Cosmic Amplifier',
  'Infinite Dice Wellspring',
  'Archangelic Luck Beacon',
  'Draconic Wealth Hoard',
  'Abyssal Deep Resonance',
  // 61-70
  'Infernal Flame Forge',
  'Prismatic Rainbow Core',
  'Starlight Horizon Battery',
  'Chronos Time Loop Dynamo',
  'Singularity Event Lens',
  'Quantum Wave Stabilizer',
  'Hyperborean Aurora Veil',
  'Genesis Spark Reactor',
  'Eldritch Void Siphon',
  'Multiverse Dice Bridge',
  // 71-80
  'Infinity Gate Key',
  'Apotheosis Divine Aegis',
  'Nihility Anti-Matter Cell',
  'Omnipresent Eye of Destiny',
  'Absolute Chaos Weaver',
  'Omniverse Horizon Node',
  'Centillion Probability Engine',
  'Googol Luck Overlord',
  '999 Googol Matrix Heart',
  'Googolplex Apex Singularity',
  // 81-90
  'Supreme Rebirth Titan Core',
  'Omnipotent Starforge',
  'Godly Dice Sovereign',
  'Ethereal Luck Supercomputer',
  'Primordial Genesis Pulse',
  'Cosmic Emperor Matrix',
  'Stellar Paragon Nexus',
  'Singularity Infinity Drive',
  'Quantum Godhead Relay',
  'Aetherial Ascension Sphere',
  // 91-100
  'Solar Zenith Crown',
  'Lunar Eclipse Aegis',
  'Galactic Sovereign Dynamo',
  'Omniverse Master Matrix',
  'Absolute Destiny Singularity',
  'Supreme Infinity Paragon',
  'Arch-God Probability Scepter',
  '999 Googol Eternal Engine',
  'Nine Infinity Divine Nexus',
  'Apex Omniverse Sovereign Zenith',
];

const UPGRADE_ICONS = [
  'Sparkles', 'Zap', 'Flame', 'Crown', 'Gem', 'Atom', 'Sun', 'Moon', 'Star', 'Compass',
  'Heart', 'Shield', 'Sword', 'Eye', 'Orbit', 'Hourglass', 'Infinity', 'Feather', 'Disc', 'Key',
];

/**
 * Generates 100 unique upgrades, 1 unlocked per Rebirth level (1 to 100).
 */
export function generateRebirthUpgrades(): Upgrade[] {
  const upgrades: Upgrade[] = [];

  for (let rebirth = 1; rebirth <= 100; rebirth++) {
    const name = REBIRTH_UPGRADE_NAMES[rebirth - 1] || `Rebirth ${rebirth} Cosmic Conduit`;
    const icon = UPGRADE_ICONS[(rebirth - 1) % UPGRADE_ICONS.length];

    // Determine category and effect
    const mod = rebirth % 4;
    let category: Upgrade['category'] = 'luck';
    let description = '';
    let unit = 'x Luck';
    let prefix: string | undefined = '+';
    let effectValuePerLevel = 1.0;
    let baseCost = 250 * Math.pow(1.15, rebirth - 1);
    let costCurrency: 'rolls' | 'essence' = rebirth % 5 === 0 ? 'essence' : 'rolls';
    let costMultiplier = 1.12;
    let maxLevel = 10000;

    if (rebirth === 5) {
      category = 'utility';
      effectValuePerLevel = 1;
      unit = ' Astral -> Hyper Dimension';
      prefix = '';
      description = 'Lucky Duck: Transmutes Astral tier drops into guaranteed Hyper Dimension drops until you collect all Hyper Dimension items! (Higher levels boost Hyper Dimension drop resonance up to level 10,000).';
      maxLevel = 10000;
      baseCost = 1000;
      costCurrency = 'rolls';
    } else if (rebirth === 10) {
      category = 'utility';
      effectValuePerLevel = 1;
      unit = ' Auto Best Equip';
      prefix = '';
      description = 'Best Rolls Matrix: Automatically detects and equips your highest luck auras in all slots at all times! (Higher levels amplify resonance bonus).';
      maxLevel = 10000;
      baseCost = 1500;
      costCurrency = 'rolls';
    } else if (rebirth === 15) {
      category = 'utility';
      effectValuePerLevel = 1;
      unit = ' Infinite Loop -> Buda';
      prefix = '';
      description = 'Too Much: Transmutes Infinite Loop tier drops into guaranteed Buda drops until you collect all Buda items! (Higher levels boost Buda drop resonance up to level 10,000).';
      maxLevel = 10000;
      baseCost = 2500;
      costCurrency = 'rolls';
    } else if (rebirth === 30) {
      category = 'utility';
      effectValuePerLevel = 1;
      unit = ' Anti-Shatter Active';
      prefix = '';
      description = 'Permanently eliminates the Broken Glass failure curse, guaranteeing genuine auras on every roll! (Higher levels give extra aura essence).';
      maxLevel = 10000;
      baseCost = 5000;
      costCurrency = 'rolls';
    } else if (mod === 0) {
      category = 'luck';
      effectValuePerLevel = Number((0.5 * rebirth).toFixed(1));
      unit = 'x Luck';
      description = `Imbues your aura with Rebirth ${rebirth} luck energy (+${effectValuePerLevel}x Luck per level).`;
    } else if (mod === 1) {
      category = 'economy';
      effectValuePerLevel = Number((1.5 * rebirth).toFixed(1));
      unit = '% Bonus Rolls';
      description = `Dramatically multiplies Rolls currency earned from every spin by +${effectValuePerLevel}% per level.`;
    } else if (mod === 2) {
      category = 'speed';
      effectValuePerLevel = 1;
      unit = ' Rolls/Click';
      description = `Rebirth burst power granting +${effectValuePerLevel} additional rolls per spin click.`;
    } else {
      category = 'utility';
      effectValuePerLevel = Number((0.8 * rebirth).toFixed(1));
      unit = 'x Essence';
      description = `Amplifies astral essence harvested from recycled auras (+${effectValuePerLevel}x per level).`;
    }

    if (costCurrency === 'essence') {
      baseCost = Math.max(10, Math.floor(rebirth * 5));
    } else {
      baseCost = Math.max(100, Math.floor(baseCost));
    }

    upgrades.push({
      id: `rebirth_upgrade_${rebirth}`,
      name: `[RB ${rebirth}] ${name}`,
      description,
      icon,
      category,
      costCurrency,
      baseCost,
      costMultiplier,
      maxLevel,
      effectValuePerLevel,
      unit,
      prefix,
      requiredRebirth: rebirth,
    });
  }

  return upgrades;
}

export const REBIRTH_UPGRADES: Upgrade[] = generateRebirthUpgrades();
