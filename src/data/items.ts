import { Item, RarityTier } from '../types';
import { RARITY_ORDER, RARITIES } from './rarities';
import { EXCLUSIVE_MERGE_ITEMS } from './mergeRecipes';

// Broken glass item representation (50% chance on rolls until Rebirth 30 Anti-Shatter Matrix upgrade)
export const BROKEN_GLASS_ITEM: Item = {
  id: 'broken_glass',
  name: 'Broken Glass',
  rarity: 'common',
  lore: 'Shattered shards of glass. Can be salvaged and sold for 10 rolls!',
  baseValue: 10,
  essenceValue: 0,
  luckBonus: 0,
  moneyMultiplier: 1,
  icon: 'ShieldAlert',
  auraType: 'smoke',
  flavorTitle: 'Shattered Shard',
  isBrokenGlass: true,
};

// Rebirth 5 Signature Item: Lucky Duck of Hyper Dimension (Transmutes Astral into Hyper Dimension!)
export const LUCKY_DUCK_ITEM: Item = {
  id: 'kanda_lucky_duck',
  name: 'Lucky Duck of Hyper Dimension',
  rarity: 'hyper_dimension',
  lore: 'The legendary golden duck traversing the 81st hyper-dimensional plane. Blessed by the cosmic Lucky Duck matrix to transmute Astral drops into Hyper Dimension!',
  baseValue: 2.5e28,
  essenceValue: 5e14,
  luckBonus: 2e28,
  moneyMultiplier: 2e28,
  icon: 'Sparkles',
  auraType: 'cosmic',
  flavorTitle: 'Hyper-Dimensional Lucky Duck Deity',
  minRebirth: 5,
};
export const KANDA_LUCKY_DUCK_ITEM = LUCKY_DUCK_ITEM;

// 101 RARITIES: 85 Base (Rebirth 0) + 15 Rebirth-Unlocked (Rebirth 1 to 15) + 1 Secret (Rebirth 100 + 100% Dex)
export const RARITY_MIN_REBIRTH: Record<RarityTier, number> = {
  // 85 Base Rarities (Unlocked at Rebirth 0)
  common: 0,
  uncommon: 0,
  unusual: 0,
  rare: 0,
  flawless: 0,
  epic: 0,
  exotic: 0,
  legendary: 0,
  relic: 0,
  mythic: 0,
  ancient: 0,
  ethereal: 0,
  celestial: 0,
  radiant: 0,
  astral: 0,
  transcendent: 0,
  divine: 0,
  abyssal: 0,
  infernal: 0,
  prismatic: 0,
  stellar: 0,
  galactic: 0,
  cosmic: 0,
  singularity: 0,
  quantum: 0,
  chronos: 0,
  hyperborean: 0,
  genesis: 0,
  eldritch: 0,
  multiverse: 0,
  infinity: 0,
  apotheosis: 0,
  nihility: 0,
  omnipresent: 0,
  absolute: 0,
  omniverse: 0,
  oblivion: 0,
  eternity: 0,
  void_emperor: 0,
  solaris: 0,
  supernova: 0,
  astral_zenith: 0,
  nebula_prime: 0,
  quasar: 0,
  pulsaron: 0,
  antimatter: 0,
  event_horizon: 0,
  dark_matter: 0,
  dark_energy: 0,
  string_theory: 0,
  dimension_11: 0,
  hypercube: 0,
  tesseract: 0,
  chrono_zenith: 0,
  vortex_monarch: 0,
  temporal_lord: 0,
  spacetime_tear: 0,
  reality_shatter: 0,
  cosmic_phoenix: 0,
  stellar_seraph: 0,
  archangelic: 0,
  pantheon: 0,
  olympian: 0,
  asgardian: 0,
  valhalla: 0,
  nirvana: 0,
  ascension_peak: 0,
  transcendental_zero: 0,
  hyper_genesis: 0,
  primordial_chaos: 0,
  astral_nexus: 0,
  matrix_overlord: 0,
  simulation_core: 0,
  dev_console: 0,
  root_access: 0,
  singularity_apex: 0,
  big_bang: 0,
  cosmic_string: 0,
  hyper_dimension: 0,
  parallel_omega: 0,
  infinite_loop: 0,
  supreme_deity: 0,
  outer_god: 0,
  boundless: 0,
  omnipotent: 0,

  // 15 Rebirth Rarities (Unlocked at Rebirth 1 to 15)
  damala: 1,
  shaster: 2,
  samosa: 3,
  kirpan: 4,
  kanda: 5,
  light: 6,
  godly: 7,
  singh: 8,
  fatih: 9,
  cosmos: 10,
  googol: 11,
  sikh: 12,
  buda: 13,
  random: 14,
  nani: 15,

  // Secret Apex Rarity (Unlocked at Rebirth 100 + 100% Complete Dex)
  nani_singh: 100,
};

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

const THEME_PREFIXES: Record<string, string[]> = {
  common: ['Dull', 'Faded', 'Plain', 'Crude', 'Worn', 'Rusty', 'Chipped', 'Rough', 'Simple', 'Humble', 'Dusty', 'Ordinary', 'Old'],
  uncommon: ['Verdant', 'Glinting', 'Polished', 'Sturdy', 'Spring', 'Amber', 'Honed', 'Vibrant', 'Brisk', 'Shimmering', 'Tempered'],
  unusual: ['Aquamarine', 'Luminous', 'Whistling', 'Echoing', 'Gilded', 'Cobalt', 'Glade', 'Tide', 'Silken', 'Enchanted', 'Frosted'],
  rare: ['Azure', 'Crystalline', 'Thunder', 'Sapphire', 'Skyborne', 'Stormforged', 'Tempest', 'Frozen', 'Nimbus', 'Gale'],
  flawless: ['Pristine', 'Immaculate', 'Lucid', 'Diamond', 'Pure', 'Mirror', 'Refined', 'Peerless', 'Seamless', 'Crystal'],
  epic: ['Twilight', 'Amethyst', 'Shadow', 'Arcane', 'Obsidian', 'Violet', 'Mystic', 'Runic', 'Nightfall', 'Phantom'],
  exotic: ['Blossom', 'Lotus', 'Mirage', 'Orchid', 'Vivid', 'Magenta', 'Prism', 'Coral', 'Siren', 'Ethereal', 'Paradise'],
  legendary: ['Golden', 'Solar', 'Aurelian', 'Gilded', 'Sunburst', 'Sunfire', 'Radiant', 'Majestic', 'Imperial', 'Blazing'],
  relic: ['Ancient', 'Forgotten', 'Titan', 'Ruin', 'Primordial', 'Fossilized', 'Ancestral', 'Mythos', 'Archaic', 'Colossus'],
  mythic: ['Crimson', 'Bloodmoon', 'Phoenix', 'Inferno', 'Scarlet', 'Dragon', 'Nemesis', 'Cataclysm', 'Volcanic', 'Wrath'],
  ancient: ['Ochre', 'Antediluvian', 'Pharaoh', 'Dynasty', 'Sandstorm', 'Hieroglyphic', 'Tomb', 'Pyramid', 'Epoch', 'Eternal'],
  ethereal: ['Spectral', 'Ghostly', 'Mist', 'Wraith', 'Haunted', 'Astral', 'Nebulous', 'Spirit', 'Gossamer', 'Phantom'],
  celestial: ['Starlight', 'Nova', 'Comet', 'Moonfall', 'Cosmos', 'Meteor', 'Constellation', 'Eclipse', 'Zodiac', 'Galaxy'],
  radiant: ['Sunlight', 'Daybreak', 'Luminescent', 'Hyper-Bright', 'Lustrous', 'Illuminated', 'Blinding', 'Solaris', 'Glow'],
  astral: ['Nebula', 'Supernova', 'Interstellar', 'Starfall', 'Milky Way', 'Andromeda', 'Orion', 'Pulsar', 'Cosmic Core'],
  transcendent: ['Hyper-Dimensional', 'Ascended', 'Boundless', 'Exalted', 'Supreme', 'Omni-Form', 'Limitless', 'Beyond'],
  divine: ['Holy', 'Archangelic', 'Heavenly', 'Seraphim', 'Sanctified', 'Consecrated', 'Godly', 'Pious', 'Miraculous'],
  abyssal: ['Deep Trench', 'Leviathan', 'Void Sea', 'Sunken', 'Benthic', 'Kraken', 'Black Tide', 'Oceanic Abyss'],
  infernal: ['Hellfire', 'Brimstone', 'Underworld', 'Abaddon', 'Molten', 'Magma', 'Fiery', 'Demonic', 'Blaze'],
  prismatic: ['Rainbow', 'Spectral Beam', 'Kaleidoscope', 'Refraction', 'Color Flux', 'Prism Matrix', 'Chromatic'],
  stellar: ['Stellar Flare', 'Supercluster', 'Corona', 'Star Forge', 'Sun Core', 'Hyper-Giant', 'White Dwarf'],
  galactic: ['Spiral Galaxy', 'Galactic Core', 'Star Cluster', 'Cosmic Arm', 'Great Attractor', 'Dark Matter'],
  cosmic: ['Cosmic Horizon', 'Space-Time', 'Singularity', 'Event Horizon', 'Cosmic Web', 'Relativity', 'Cosmic Ray'],
  singularity: ['Black Hole', 'Gravitational Well', 'Dark Singularity', 'Spacetime Fold', 'Wormhole', 'Horizon Zero'],
  quantum: ['Entangled', 'Waveform', 'Superposition', 'Planck Length', 'Quantum Flux', 'Zero-Point', 'Probabilistic'],
  chronos: ['Time Loop', 'Temporal Rift', 'Epoch Weaver', 'Chrono Shift', 'Past-Future', 'Continuum', 'Hourglass Prime'],
  hyperborean: ['Absolute Zero', 'Frost Titan', 'Cryo Genesis', 'Glacial Core', 'Boreal Lights', 'Permafrost'],
  genesis: ['Creation Spark', 'First Light', 'Universe Birth', 'Origin Core', 'Primordial Seed', 'Matter Forge'],
  eldritch: ['Cosmic Horror', 'Old One', 'Non-Euclidean', 'R\'lyeh Rune', 'Void Whisper', 'Tentacle Dream'],
  multiverse: ['Parallel World', 'Branching Timeline', 'Alternate Cosmos', 'Dimensional Rift', 'Omni-World'],
  infinity: ['Endless Loop', 'Limitless Void', 'Eternal Zenith', 'Forever Spark', 'Unbounded Core', 'Omega Matrix'],
  apotheosis: ['Godhood Spark', 'Ascended Sovereign', 'Deity Core', 'Supreme Divinity', 'Lord of Cosmos'],
  nihility: ['Total Nothingness', 'Anti-Matter', 'Zero Void', 'Null Dimension', 'Vacuum Decay', 'Erasure Core'],
  omnipresent: ['Everywhere at Once', 'Universal Eye', 'All-Seeing', 'Infinite Sight', 'Consciousness Matrix'],
  absolute: ['Unstoppable Will', 'Absolute Truth', 'Inviolable Law', 'Total Domination', 'Perfection Core'],
  omniverse: ['All Realities', 'Omniverse Nexus', 'Hyper-Continuum', 'Total Creation', 'Ultimate Realm'],
  oblivion: ['Void Oblivion', 'Abyssal Null', 'Infinite Eradication', 'Entropy Prime', 'Dark Zenith'],
  eternity: ['Timeless Horizon', 'Endless Eon', 'Permanent State', 'Everlasting Thread', 'Alpha Zenith'],
  void_emperor: ['Void Sovereign', 'Null Monarch', 'Dark Throne', 'Zero Ruler', 'Shadow Overlord'],
  solaris: ['Solar Crown', 'Hyper Solaris', 'Helios Zenith', 'Photonic Flare', 'Daystar Apex'],
  supernova: ['Supernova Blast', 'Stellar Explosion', 'Cosmic Detonation', 'Nova Core', 'Cataclysmic Flare'],
  astral_zenith: ['Peak Astral', 'Zenith Star', 'Pinnacle Constellation', 'High Orbit', 'Stellar Crown'],
  nebula_prime: ['Nebula Heart', 'Gaseous Singularity', 'Interstellar Cloud', 'Prime Cradle', 'Star Nursery'],
  quasar: ['Quasar Beam', 'Hyper-Luminous', 'Relativistic Jet', 'Black Hole Engine', 'Active Nucleus'],
  pulsaron: ['Pulsar Signal', 'Magnetar Pulse', 'Neutron Beam', 'Frequency Horizon', 'Radiation Wave'],
  antimatter: ['Positron Matrix', 'Anti-Proton', 'Annihilation Spark', 'Opposite Matter', 'Null Reactor'],
  event_horizon: ['Point of No Return', 'Gravitational Bound', 'Photon Sphere', 'Light Trap', 'Horizon Core'],
  dark_matter: ['Invisible Mass', 'Hidden Filament', 'Galactic Halo', 'Non-Baryonic', 'Dark Web'],
  dark_energy: ['Cosmic Expansion', 'Quintessence', 'Vacuum Force', 'Accelerated Void', 'Repulsive Core'],
  string_theory: ['Vibrating String', 'Calabi-Yau', 'Braneworld', 'Supersymmetry', 'Fundamental Loop'],
  dimension_11: ['11D Coordinate', 'M-Theory Realm', 'Higher Plane', 'Hyperspace Vertex', 'Bulk Space'],
  hypercube: ['4D Tesseract', 'Hyper-Solid', 'Orthogonal Cell', 'Dimensional Box', 'Polytope Matrix'],
  tesseract: ['Hyper-Volume', 'Four-Space Cell', 'Infinite Tessellation', 'Hyper-Prism', 'Geometry Apex'],
  chrono_zenith: ['Master Timekeeper', 'Temporal Sovereign', 'Chrono God', 'Epoch Overlord', 'Timeline Zenith'],
  vortex_monarch: ['Dimensional Vortex', 'Swirling Reality', 'Spiral Singularity', 'Maelstrom Sovereign'],
  temporal_lord: ['Time Sovereign', 'Chronos Emperor', 'Continuum King', 'Past-Future Arbiter'],
  spacetime_tear: ['Ripped Continuum', 'Fabric Fracture', 'Gravitational Rift', 'Spacetime Wound'],
  reality_shatter: ['Broken Physics', 'Fractured Law', 'Paradox Matrix', 'Reality Splinter'],
  cosmic_phoenix: ['Reborn from Supernova', 'Cosmic Firebird', 'Eternal Flame Core', 'Ascended Phoenix'],
  stellar_seraph: ['Star Angel', 'Six-Winged Flare', 'Celestial Seraphim', 'Luminous Angelic'],
  archangelic: ['Archangelic Blade', 'High Seraph', 'Sanctified Heaven', 'Archangel Crest'],
  pantheon: ['All-Gods Realm', 'Pantheon Crown', 'Divine Assembly', 'Supreme Council'],
  olympian: ['Mount Olympus', 'Thunderbolt Core', 'Godly Scepter', 'Olympian Throne'],
  asgardian: ['Bifrost Bridge', 'Asgardian Steel', 'Odinic Rune', 'Valhalla Spark'],
  valhalla: ['Hall of the Slain', 'Golden Mead', 'Eternal Battle', 'Warrior Zenith'],
  nirvana: ['Enlightenment Peak', 'Supreme Peace', 'Cessation of Strife', 'Pure Awareness'],
  ascension_peak: ['Ultimate Elevation', 'Transcended Summit', 'Apex Evolution', 'Zenith Form'],
  transcendental_zero: ['Zero Point Matrix', 'Transcended Null', 'Base Origin', 'Absolute Equilibrium'],
  hyper_genesis: ['Super-Creation', 'Omni-Birth', 'Mega-Genesis', 'Cosmic Seed Prime'],
  primordial_chaos: ['First Chaos', 'Before Time', 'Unshaped Form', 'Primordial Void'],
  astral_nexus: ['Star Crossroads', 'Astral Center', 'Constellation Hub', 'Cosmic Gateway'],
  matrix_overlord: ['Code Sovereign', 'Simulation King', 'Matrix Architect', 'Digital God'],
  simulation_core: ['Mainframe Prime', 'Base Reality CPU', 'Quantum Render', 'Kernel Core'],
  dev_console: ['Admin Terminal', 'Command Line God', 'Root Terminal', 'Developer Key'],
  root_access: ['Sudo Permissions', 'Kernel Bypass', 'Ring Zero', 'Absolute Privilege'],
  singularity_apex: ['Ultimate Black Hole', 'Apex Gravitation', 'Infinite Density', 'Singularity King'],
  big_bang: ['Universe Expansion', 'Initial Singularity', 'Cosmic Inflation', 'Birth of Light'],
  cosmic_string: ['Topological Defect', 'Cosmic Filament', 'Relic String', 'Universe Seam'],
  hyper_dimension: ['Omni-Directional', 'Infinite Dimension', 'Trans-Spatial', 'Multi-Axis'],
  parallel_omega: ['Last Parallel World', 'Omega Reality', 'Final Universe', 'Parallel Pinnacle'],
  infinite_loop: ['Never-Ending', 'Eternal Recursion', 'Ouroboros Singularity', 'Loop Matrix'],
  supreme_deity: ['Highest God', 'Almighty Presence', 'Sovereign Being', 'Supreme One'],
  outer_god: ['Beyond Reality', 'Cosmic Entity', 'Nameless Presence', 'Void Deity'],
  boundless: ['No Horizon', 'Infinite Span', 'Unmeasurable', 'Endless Extent'],
  omnipotent: ['All-Powerful', 'Limitless Might', 'Absolute Omnipotence', 'Omni-Force'],

  // 15 Rebirth Rarities
  damala: ['Turban of Glory', 'Dumalla Apex', 'Royal Damala', 'Warrior Damala', 'Blue Crown', 'Nihang Damala'],
  shaster: ['Sacred Weapon', 'Divine Shaster', 'Ancient Blade', 'Forged Steel', 'Battle Shaster', 'Holy Armor'],
  samosa: ['Golden Samosa', 'Crispy Transcendence', 'Royal Spiced', 'Savory Matrix', 'Divine Pastry', 'Golden Crust'],
  kirpan: ['Sacred Kirpan', 'Dignity Blade', 'Honor Steel', 'Divine Kirpan', 'Graceful Curved', 'Protector Edge'],
  kanda: ['Holy Khanda', 'Double-Edged Sovereign', 'Sacred Emblem', 'Circle of Eternity', 'Khanda Zenith', 'Chakar Core'],
  light: ['Pure Illumination', 'Blinding Light', 'Divine Ray', 'Radiant Photons', 'Eternal Light', 'Unfiltered Glow'],
  godly: ['Godly Aura', 'Divine Supremacy', 'Almighty Halo', 'Godly Blessing', 'Heavenly Sovereign', 'Godly Core'],
  singh: ['Lionheart Crown', 'Sovereign Singh', 'Royal Lion', 'Fearless Warrior', 'Singh Pride', 'Supreme Tiger'],
  fatih: ['Victory of Light', 'Fateh Sovereign', 'Triumph Spark', 'Divine Fateh', 'Glorious Conquest', 'Unconquered'],
  cosmos: ['Cosmos Emperor', 'Macrocosm Heart', 'Universal Harmony', 'Galactic Empress', 'Cosmos Nexus', 'Cosmic Web'],
  googol: ['10^100 Power', 'Googol Fortune', 'Googol Horizon', 'Googol Core', 'Googol Reactor', 'Centillionth Step'],
  sikh: ['Truthful Living', 'Saint-Soldier', 'Eternal Devotion', 'Pure Spirit', 'Sacred Path', 'Sikh Sovereign'],
  buda: ['Buddha Zenith', 'Awakened Mind', 'Golden Lotus', 'Infinite Compassion', 'Dharma Wheel', 'Buda Light'],
  random: ['Chaotic Entropy', 'Random Matrix', 'Unpredictable Flux', 'Dice of Destiny', 'Wildcard Sovereign', 'RNG Supreme'],
  nani: ['Nani Transcendence', 'Omae Wa Mou', 'Ultimate Surprised', '9 Googolplex Apex', 'Nani Singularity', 'God of Memes'],

  // Secret Apex Rarity (Rebirth 100 + 100% Dex Completion)
  nani_singh: [
    'Divine-Singh', 'Omni-Nani', 'Eternal-Singh', 'Supreme-Nani', 'Transcendent-Singh',
    'Sovereign-Nani-Singh', 'Zenith-Singh', 'Infinite-Nani', 'Apex-Singh', 'Singularity-Nani-Singh',
    'God-Singh', 'Lord-Nani', 'Immortal-Singh', 'Chrono-Nani', 'Celestial-Singh', 'Aegis-Nani-Singh'
  ],
};

const NOUNS = [
  'Shard', 'Core', 'Orb', 'Crown', 'Blade', 'Relic', 'Prism', 'Beacon', 'Scepter', 'Amulet',
  'Ring', 'Gem', 'Tome', 'Heart', 'Eye', 'Veil', 'Halo', 'Sigil', 'Lantern', 'Chalice',
  'Pillar', 'Nexus', 'Mirror', 'Hourglass', 'Matrix', 'Singularity', 'Key', 'Wings', 'Gauntlet', 'Compass',
  'Fragment', 'Essence', 'Resonator', 'Emblem', 'Diadem', 'Vortex', 'Monolith', 'Tear', 'Spire', 'Catalyst',
  'Aegis', 'Scythe', 'Grail', 'Talisman', 'Crystal', 'Orbital', 'Quasar', 'Crownlet', 'Staff', 'Trident',
  'Anvil', 'Sanctum', 'Scroll', 'Seal', 'Ward', 'Glyph', 'Totem', 'Pyramid', 'Eclipse', 'Dominion'
];

const SUFFIXES = [
  'of Fate', 'of Eternity', 'of the Void', 'of Starlight', 'of Ascension',
  'of the Cosmos', 'of Fortune', 'of the Rebirth', 'of the Omniverse', 'of the Zenith',
  'of Genesis', 'of the Eclipse', 'of Absolute Luck', 'of Divine Will', 'of Supernovas',
  'of Quantum Flow', 'of the Horizon', 'of Infinite Power', 'of the Apex', 'of Oblivion',
  'of the Primordial', 'of Boundless Light', 'of Nine Dimensions', 'of Celestial Radiance',
  'of Grand Mastery', 'of the Arch-Gods', 'of Pure Chaos', 'of the Void Empress',
  'of Transcendence', 'of Absolute Zero', 'of the Cosmic Forge', 'of True Enlightenment'
];

const ICONS = [
  'Sparkles', 'Zap', 'Flame', 'Crown', 'Gem', 'Atom', 'Sun', 'Moon', 'Star', 'Compass',
  'Heart', 'Shield', 'Sword', 'Eye', 'Orbit', 'Hourglass', 'Infinity', 'Feather', 'Disc', 'Key',
  'Diamond', 'Clover', 'Layers', 'Trophy', 'Radio', 'Anchor', 'Activity', 'Award', 'Crosshair'
];

const AURA_TYPES: Array<Item['auraType']> = [
  'orbit', 'flame', 'sparkle', 'vortex', 'rainbow', 'divine', 'smoke', 'quantum', 'cosmic', 'glitch', 'nebula', 'singularity'
];

/**
 * Generates 200 unique, balanced items for standard rarities and exactly 10,000 items for the secret nani_singh tier.
 * Every item includes an explicit roll money multiplier (e.g. 1.0x up to 1 Trillion x).
 */
export function generateAllRarityItems(): Item[] {
  const allItems: Item[] = [];

  RARITY_ORDER.forEach((rarity, rIndex) => {
    const minRebirth = RARITY_MIN_REBIRTH[rarity] || 0;
    const prefixes = THEME_PREFIXES[rarity] || THEME_PREFIXES['common'];
    const rConfig = RARITIES[rarity];

    const itemCount = rarity === 'nani_singh' ? 10000 : 200;

    // Direct Rarity-to-Stat Scaling: The rarer the item tier, the higher the luck and roll multiplier!
    let luckBase: number;
    let moneyBase: number;
    let valueBase: number;
    let essenceBase: number;

    if (rarity === 'nani_singh') {
      // 20 SPD (Septendecillion = 10^54 -> 20 * 10^54 = 2e55)
      luckBase = 2e55;
      moneyBase = 2e55;
      valueBase = 2e55;
      essenceBase = 1000000000;
    } else {
      const chance = rConfig?.chancePercentage || 50;
      const denominator = chance > 0 ? (100 / chance) : 2;
      // Exponential rank curve guarantees each consecutive tier along RARITY_ORDER is strictly stronger
      const rankCurve = Math.pow(1.68, rIndex) * 2;
      const baseStatMultiplier = Math.max(rankCurve, Math.round(2 * denominator));

      luckBase = baseStatMultiplier;
      moneyBase = baseStatMultiplier;
      valueBase = Math.max(5, Math.round(baseStatMultiplier * 1.2));
      essenceBase = Math.max(1, Math.round(Math.min(1e9, Math.sqrt(baseStatMultiplier) * 1.5)));
    }

    for (let i = 1; i <= itemCount; i++) {
      const seed = rIndex * 20000 + i;
      const prefix = prefixes[Math.floor(seededRandom(seed + 1) * prefixes.length)];
      const noun = NOUNS[Math.floor(seededRandom(seed + 2) * NOUNS.length)];
      const suffix = SUFFIXES[Math.floor(seededRandom(seed + 3) * SUFFIXES.length)];
      const icon = ICONS[Math.floor(seededRandom(seed + 4) * ICONS.length)];
      const auraType = AURA_TYPES[Math.floor(seededRandom(seed + 5) * AURA_TYPES.length)];

      const name = `${prefix} ${noun} ${suffix}`;
      const id = `${rarity}_item_${i}_${noun.toLowerCase()}`;

      // Progressive stat variance for items within the tier
      const subRatio = 1 + (i - 1) * (rarity === 'nani_singh' ? 0.00001 : 0.002);
      const luckBonus = Math.round(luckBase * subRatio);
      const baseValue = Math.round(valueBase * subRatio);
      const essenceValue = Math.round(essenceBase * subRatio);
      const moneyMultiplier = Math.max(2, Math.round(moneyBase * subRatio));

      allItems.push({
        id,
        name,
        rarity,
        lore: `Rank #${i}/${itemCount} of the ${rConfig?.name || rarity} tier (${rConfig?.oneInChance || '1 in 2'}). Imbued with ${prefix.toLowerCase()} resonance. Grants ${rarity === 'nani_singh' ? '+20 Spd (20 SPD)' : `+${luckBonus >= 1e9 ? luckBonus.toExponential(2) : luckBonus.toLocaleString()}`} luck and ${rarity === 'nani_singh' ? '20 Spd (20 SPD)' : `${moneyMultiplier >= 1e9 ? moneyMultiplier.toExponential(2) : moneyMultiplier.toLocaleString()}`}x roll money earnings.`,
        baseValue,
        essenceValue,
        luckBonus,
        moneyMultiplier,
        icon,
        auraType,
        flavorTitle: `${rConfig?.name || rarity} #${i}`,
        minRebirth,
      });
    }
  });

  return allItems;
}

export const ITEMS: Item[] = [BROKEN_GLASS_ITEM, KANDA_LUCKY_DUCK_ITEM, ...EXCLUSIVE_MERGE_ITEMS, ...generateAllRarityItems()];

export const ITEMS_BY_ID: Record<string, Item> = ITEMS.reduce((acc, item) => {
  acc[item.id] = item;
  return acc;
}, { [BROKEN_GLASS_ITEM.id]: BROKEN_GLASS_ITEM } as Record<string, Item>);

export const ITEMS_BY_RARITY: Record<RarityTier, Item[]> = ITEMS.reduce((acc, item) => {
  if (!acc[item.rarity]) {
    acc[item.rarity] = [];
  }
  // Exclude merge-exclusive items from normal roll pool so they can ONLY be obtained by merging!
  if (!item.isMergeExclusive) {
    acc[item.rarity].push(item);
  }
  return acc;
}, {} as Record<RarityTier, Item[]>);

/**
 * Register a fused item in ITEMS_BY_ID and ITEMS (guaranteeing no duplicate IDs in ITEMS).
 */
export function registerFusedItem(baseItem: Item): Item {
  const fusedId = `fused_${baseItem.id}`;
  if (ITEMS_BY_ID[fusedId]) {
    return ITEMS_BY_ID[fusedId];
  }
  const boostedLuck = Number((baseItem.luckBonus * 2.5).toFixed(2));
  const boostedMoneyMult = Math.max(1, Math.round((baseItem.moneyMultiplier || 1) * 3));
  const fusedItem: Item = {
    ...baseItem,
    id: fusedId,
    name: `Fused ${baseItem.name}`,
    luckBonus: boostedLuck,
    moneyMultiplier: boostedMoneyMult,
    baseValue: baseItem.baseValue * 3,
    essenceValue: baseItem.essenceValue * 3,
    flavorTitle: `Transcended Masterpiece`,
    lore: `Created by merging 3 duplicate copies in the Merge Machine! Grants +250% luck and 3x roll money multiplier (${boostedMoneyMult.toLocaleString()}x).`,
    isMergedVariant: true,
  };
  ITEMS_BY_ID[fusedId] = fusedItem;
  if (!ITEMS.some((it) => it.id === fusedId)) {
    ITEMS.push(fusedItem);
  }
  return fusedItem;
}

/**
 * Ensures any item (including fused variants) is registered in ITEMS_BY_ID.
 */
export function ensureItemRegistered(itemId: string): Item | null {
  if (ITEMS_BY_ID[itemId]) return ITEMS_BY_ID[itemId];
  if (itemId.startsWith('fused_')) {
    const baseId = itemId.replace('fused_', '');
    const baseItem = ITEMS_BY_ID[baseId];
    if (baseItem) {
      return registerFusedItem(baseItem);
    }
  }
  return null;
}
