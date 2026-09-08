export interface TitleDefinition {
  id: string;
  name: string;
  category: 'starter' | 'rolls' | 'rebirth' | 'rarity' | 'special';
  description: string;
  minRolls?: number;
  minRebirth?: number;
  minRarityRank?: number;
  color: string;
}

export interface AvatarIconDefinition {
  id: string;
  name: string;
  icon: string; // Lucide icon identifier
  color: string;
  description: string;
}

export const PLAYER_TITLES: TitleDefinition[] = [
  { id: 'apprentice', name: 'RNG Apprentice', category: 'starter', description: 'Just starting the infinite rolling journey.', color: 'text-zinc-400' },
  { id: 'lucky_roller', name: 'Lucky Roller', category: 'rolls', description: 'Rolled over 500 times.', minRolls: 500, color: 'text-emerald-400' },
  { id: 'destiny_seeker', name: 'Destiny Seeker', category: 'rolls', description: 'Rolled over 2,500 times.', minRolls: 2500, color: 'text-sky-400' },
  { id: 'cosmic_gambler', name: 'Cosmic Gambler', category: 'rolls', description: 'Rolled over 10,000 times.', minRolls: 10000, color: 'text-purple-400' },
  { id: 'auramancer', name: 'Grand Auramancer', category: 'rolls', description: 'Rolled over 50,000 times.', minRolls: 50000, color: 'text-fuchsia-400' },
  { id: 'infinite_roller', name: 'Infinite Roller', category: 'rolls', description: 'Rolled over 250,000 times.', minRolls: 250000, color: 'text-amber-400' },
  
  { id: 'mythic_touch', name: 'Mythic Touched', category: 'rarity', description: 'Found a Mythic or higher aura.', minRarityRank: 9, color: 'text-rose-400' },
  { id: 'celestial_chosen', name: 'Celestial Chosen', category: 'rarity', description: 'Found a Celestial or higher aura.', minRarityRank: 12, color: 'text-cyan-400' },
  { id: 'divine_vessel', name: 'Divine Vessel', category: 'rarity', description: 'Found a Divine or higher aura.', minRarityRank: 16, color: 'text-yellow-300' },
  { id: 'singularity_lord', name: 'Singularity Sovereign', category: 'rarity', description: 'Found a Singularity or higher aura.', minRarityRank: 23, color: 'text-indigo-400' },
  { id: 'omnipotent_god', name: 'Omnipotent Ascendant', category: 'rarity', description: 'Discovered an Omnipotent class aura.', minRarityRank: 84, color: 'text-amber-300' },

  { id: 'reborn_soul', name: 'Reborn Soul', category: 'rebirth', description: 'Reached Rebirth 1.', minRebirth: 1, color: 'text-teal-400' },
  { id: 'samsara_walker', name: 'Samsara Walker', category: 'rebirth', description: 'Reached Rebirth 5.', minRebirth: 5, color: 'text-orange-400' },
  { id: 'transcendent_deity', name: 'Transcendent Deity', category: 'rebirth', description: 'Reached Rebirth 10.', minRebirth: 10, color: 'text-violet-400' },
  { id: 'nani_monarch', name: 'Nani Realm Sovereign', category: 'rebirth', description: 'Reached Rebirth 15 (Max Rebirth).', minRebirth: 15, color: 'text-rose-500' },

  { id: 'rng_champion', name: 'RNG Champion', category: 'special', description: 'A true legend among realm rollers.', color: 'text-amber-400' },
  { id: 'dimension_hopper', name: 'Dimension Hopper', category: 'special', description: 'Master of spacetime folds.', color: 'text-cyan-300' },
];

export const PLAYER_AVATARS: AvatarIconDefinition[] = [
  { id: 'dices', name: 'Lucky Dice', icon: 'Dices', color: '#a855f7', description: 'The timeless symbol of probability.' },
  { id: 'sparkles', name: 'Star Dust', icon: 'Sparkles', color: '#38bdf8', description: 'Radiating pure celestial essence.' },
  { id: 'crown', name: 'Imperial Crown', icon: 'Crown', color: '#eab308', description: 'Worn only by realm sovereigns.' },
  { id: 'flame', name: 'Infernal Blaze', icon: 'Flame', color: '#f97316', description: 'Burning with relentless luck.' },
  { id: 'gem', name: 'Mythic Crystal', icon: 'Gem', color: '#ec4899', description: 'A pristine prismatic gemstone.' },
  { id: 'zap', name: 'Volt Surge', icon: 'Zap', color: '#eab308', description: 'Striking with lightning fortune.' },
  { id: 'skull', name: 'Void Phantom', icon: 'Skull', color: '#a855f7', description: 'Emerging from the abyssal rift.' },
  { id: 'shield', name: 'Guardian Aegis', icon: 'Shield', color: '#10b981', description: 'Protector of the sacred auras.' },
  { id: 'sword', name: 'Astral Blade', icon: 'Sword', color: '#6366f1', description: 'Carving paths through destiny.' },
  { id: 'star', name: 'Cosmic Star', icon: 'Star', color: '#fbbf24', description: 'A beacon across the multiverse.' },
  { id: 'eye', name: 'Omnipresent Eye', icon: 'Eye', color: '#c084fc', description: 'Seeing all probability timelines.' },
  { id: 'atom', name: 'Quantum Core', icon: 'Atom', color: '#06b6d4', description: 'Harnessing subatomic luck states.' },
];
