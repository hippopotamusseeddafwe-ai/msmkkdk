import {
  collection,
  doc,
  setDoc,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  Unsubscribe,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../lib/firebase';
import {
  GameState,
  LeaderboardEntry,
  GlobalRollEvent,
  LeaderboardCategory,
  PlayerProfile,
  RarityTier,
} from '../types';
import { RARITIES, getRarityTierRank } from '../data/rarities';
import { ITEMS, ITEMS_BY_ID } from '../data/items';
import { calculateEffectiveLuck } from '../utils/rngEngine';

// Real players only: No fake or bot seed accounts
const SEED_LEADERBOARD_ENTRIES: LeaderboardEntry[] = [];
const SEED_GLOBAL_ROLLS: GlobalRollEvent[] = [];

// Helper to determine the best item in an inventory
export function findBestItemInInventory(gameState: GameState): {
  name: string;
  rarity: RarityTier;
  chance: string;
  rank: number;
} {
  let highestRank = -1;
  let bestRarity: RarityTier = 'common';
  let bestName = 'None';
  let bestChance = '1 in 2';

  const inventoryKeys = Object.keys(gameState.inventory);
  if (inventoryKeys.length === 0) {
    if (gameState.highestRarityRolled) {
      const rank = getRarityTierRank(gameState.highestRarityRolled);
      const config = RARITIES[gameState.highestRarityRolled];
      return {
        name: config?.name || 'Aura',
        rarity: gameState.highestRarityRolled,
        chance: config?.oneInChance || '1 in 2',
        rank,
      };
    }
    return { name: 'None', rarity: 'common', chance: '1 in 2', rank: 0 };
  }

  inventoryKeys.forEach((itemId) => {
    const item = ITEMS_BY_ID[itemId];
    if (item) {
      const rank = getRarityTierRank(item.rarity);
      if (rank > highestRank) {
        highestRank = rank;
        bestRarity = item.rarity;
        bestName = item.name;
        bestChance = RARITIES[item.rarity]?.oneInChance || '1 in 2';
      }
    }
  });

  return {
    name: bestName,
    rarity: bestRarity,
    chance: bestChance,
    rank: Math.max(0, highestRank),
  };
}

// Generate or retrieve persistent local player profile
export function getOrCreatePlayerProfile(): PlayerProfile {
  const PROFILE_STORAGE_KEY = 'rng_player_profile_v1';
  if (typeof window === 'undefined') {
    return {
      id: 'player-default',
      name: 'RNG Roller',
      avatarIcon: 'dices',
      title: 'RNG Apprentice',
    };
  }

  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // ignore
  }

  const randomNum = Math.floor(1000 + Math.random() * 9000);
  const newProfile: PlayerProfile = {
    id: `player_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    name: `Roller#${randomNum}`,
    avatarIcon: 'dices',
    title: 'RNG Apprentice',
  };

  try {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(newProfile));
  } catch {
    // ignore
  }

  return newProfile;
}

export function savePlayerProfile(profile: PlayerProfile): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('rng_player_profile_v1', JSON.stringify(profile));
  } catch (err) {
    console.error('Failed to save player profile:', err);
  }
}

// Helper to remove any undefined properties before sending to Firestore
export function cleanFirestoreData<T extends Record<string, any>>(obj: T): T {
  const result: any = {};
  Object.keys(obj).forEach((key) => {
    if (obj[key] !== undefined) {
      result[key] = obj[key];
    }
  });
  return result;
}

// Convert game state to leaderboard entry format with all 7 category metrics
export function createLeaderboardEntry(
  profile: PlayerProfile,
  gameState: GameState
): LeaderboardEntry {
  const best = findBestItemInInventory(gameState);
  const equippedItem = gameState.equippedItemId ? ITEMS_BY_ID[gameState.equippedItemId] : null;
  const luckCalc = calculateEffectiveLuck(gameState);

  const rollsMoney = gameState.rolls ?? gameState.coins ?? 0;
  const rollsEarned = gameState.stats?.totalRollsEarned ?? gameState.stats?.totalCoinsEarned ?? rollsMoney;
  const luckBoost = Number(luckCalc.totalLuck.toFixed(1));
  const moneyBoost = Number((luckCalc.moneyMultiplier || 1).toFixed(1));
  const essence = gameState.essence || 0;

  return {
    id: profile.id,
    name: profile.name || 'Anonymous Roller',
    avatarIcon: profile.avatarIcon || 'dices',
    title: profile.title || 'RNG Apprentice',
    totalRolls: gameState.totalRolls || 0,
    rebirthLevel: gameState.rebirthLevel || 0,
    rollsEarned,
    rollsMoney,
    luckBoost,
    moneyBoost,
    essence,
    highestRarity: best.rarity,
    highestRarityRank: best.rank,
    bestItemName: best.name,
    bestItemRarity: best.rarity,
    bestItemChance: best.chance,
    equippedItemName: equippedItem?.name || '',
    equippedItemRarity: equippedItem?.rarity || 'common',
    inventoryCount: Object.keys(gameState.inventory).length,
    achievementsCount: gameState.unlockedAchievements?.length || 0,
    lastActive: Date.now(),
  };
}

// Sorter for the 7 categories
export function sortLeaderboardEntries(
  entries: LeaderboardEntry[],
  category: LeaderboardCategory
): LeaderboardEntry[] {
  return [...entries].sort((a, b) => {
    switch (category) {
      case 'rarity':
        return b.highestRarityRank - a.highestRarityRank;
      case 'money':
        return (b.rollsMoney ?? b.rollsEarned) - (a.rollsMoney ?? a.rollsEarned);
      case 'luck':
        return (b.luckBoost ?? 1) - (a.luckBoost ?? 1);
      case 'money_boost':
        return (b.moneyBoost ?? 1) - (a.moneyBoost ?? 1);
      case 'essence':
        return (b.essence ?? 0) - (a.essence ?? 0);
      case 'rolls':
        return b.totalRolls - a.totalRolls;
      case 'rebirth':
        return b.rebirthLevel - a.rebirthLevel;
      default:
        return b.totalRolls - a.totalRolls;
    }
  });
}

let syncTimeout: ReturnType<typeof setTimeout> | null = null;
let lastSyncedRolls = -1;

// Sync player data to Firestore (debounced)
export function syncPlayerToLeaderboard(
  profile: PlayerProfile,
  gameState: GameState,
  force: boolean = false
): void {
  if (!db || !isFirebaseConfigured) return;

  if (!force && Math.abs(gameState.totalRolls - lastSyncedRolls) < 2) {
    return;
  }

  if (syncTimeout) {
    clearTimeout(syncTimeout);
  }

  const doSync = async () => {
    try {
      const entry = createLeaderboardEntry(profile, gameState);
      const sanitized = cleanFirestoreData(entry);
      const playerDocRef = doc(db, 'leaderboard', profile.id);
      await setDoc(playerDocRef, sanitized, { merge: true });
      lastSyncedRolls = gameState.totalRolls;
    } catch (err) {
      console.warn('Leaderboard sync note:', err);
    }
  };

  if (force) {
    doSync();
  } else {
    syncTimeout = setTimeout(doSync, 2500);
  }
}

// Publish real-time global roll event when finding rare items
export async function broadcastRareRoll(
  profile: PlayerProfile,
  item: { id: string; name: string; rarity: RarityTier; oneInChance?: string }
): Promise<void> {
  const rank = getRarityTierRank(item.rarity);
  if (rank < 4) return;

  if (!db || !isFirebaseConfigured) return;

  try {
    const rollEvent: Omit<GlobalRollEvent, 'id'> = {
      playerId: profile.id,
      playerName: profile.name,
      playerAvatar: profile.avatarIcon,
      itemId: item.id,
      itemName: item.name,
      itemRarity: item.rarity,
      itemChance: item.oneInChance || RARITIES[item.rarity]?.oneInChance || 'Rare Drop',
      timestamp: Date.now(),
    };

    const rollsCol = collection(db, 'recent_global_rolls');
    await addDoc(rollsCol, rollEvent);
  } catch (err) {
    console.warn('Global roll broadcast note:', err);
  }
}

// Real-Time Subscription to Leaderboard across all 7 categories (Real Players Only)
export function subscribeToRealtimeLeaderboard(
  category: LeaderboardCategory,
  currentProfile: PlayerProfile,
  currentGameState: GameState,
  onUpdate: (entries: LeaderboardEntry[], isLive: boolean) => void
): Unsubscribe {
  let field = 'totalRolls';
  if (category === 'rarity') field = 'highestRarityRank';
  if (category === 'money') field = 'rollsMoney';
  if (category === 'luck') field = 'luckBoost';
  if (category === 'money_boost') field = 'moneyBoost';
  if (category === 'essence') field = 'essence';
  if (category === 'rolls') field = 'totalRolls';
  if (category === 'rebirth') field = 'rebirthLevel';

  if (!db || !isFirebaseConfigured) {
    const myEntry = createLeaderboardEntry(currentProfile, currentGameState);
    // Safe async update to avoid React maximum update depth error
    setTimeout(() => onUpdate([myEntry], false), 0);
    return () => {};
  }

  try {
    const q = query(
      collection(db, 'leaderboard'),
      orderBy(field, 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const cloudEntries: LeaderboardEntry[] = [];
        let foundMe = false;

        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as LeaderboardEntry;
          if (data && data.id && !data.id.startsWith('seed-')) {
            if (data.id === currentProfile.id) {
              foundMe = true;
            }
            cloudEntries.push(data);
          }
        });

        // Always ensure the current real player is present in the ranks
        if (!foundMe) {
          const myEntry = createLeaderboardEntry(currentProfile, currentGameState);
          cloudEntries.push(myEntry);
        }

        const sorted = sortLeaderboardEntries(cloudEntries, category);
        onUpdate(sorted, true);
      },
      (error) => {
        console.warn('Leaderboard realtime snapshot fallback:', error);
        const myEntry = createLeaderboardEntry(currentProfile, currentGameState);
        setTimeout(() => onUpdate([myEntry], false), 0);
      }
    );

    return unsubscribe;
  } catch (err) {
    console.warn('Realtime subscription error:', err);
    const myEntry = createLeaderboardEntry(currentProfile, currentGameState);
    setTimeout(() => onUpdate([myEntry], false), 0);
    return () => {};
  }
}

// Real-Time Subscription to Live Global Rolls Feed (Real Players Only)
export function subscribeToLiveGlobalRolls(
  onUpdate: (rolls: GlobalRollEvent[]) => void
): Unsubscribe {
  if (!db || !isFirebaseConfigured) {
    setTimeout(() => onUpdate([]), 0);
    return () => {};
  }

  try {
    const q = query(
      collection(db, 'recent_global_rolls'),
      orderBy('timestamp', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const liveRolls: GlobalRollEvent[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as Omit<GlobalRollEvent, 'id'>;
          if (data && data.playerId && !data.playerId.startsWith('seed-')) {
            liveRolls.push({
              id: docSnap.id,
              ...data,
            });
          }
        });

        onUpdate(liveRolls);
      },
      (error) => {
        console.warn('Global rolls feed subscription note:', error);
        setTimeout(() => onUpdate([]), 0);
      }
    );

    return unsubscribe;
  } catch (err) {
    console.warn('Global rolls error:', err);
    setTimeout(() => onUpdate([]), 0);
    return () => {};
  }
}
