import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  Unsubscribe,
  getDocs,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../lib/firebase';
import {
  TradeRoom,
  TradeParticipant,
  TradeOfferItem,
  TradeHistoryEntry,
  PlayerProfile,
  RarityTier,
  Item,
} from '../types';
import { ITEMS } from '../data/items';
import { RARITIES, getRarityTierRank } from '../data/rarities';
import { cleanFirestoreData } from './leaderboardService';

// AI Bot Merchants for Solo & Offline Practice Trading
export interface BotTraderConfig {
  id: string;
  name: string;
  avatar: string;
  title: string;
  personality: string;
  minTier: RarityTier;
  maxTier: RarityTier;
  greeting: string;
}

export const AI_BOT_TRADERS: BotTraderConfig[] = [
  {
    id: 'bot_trader_1',
    name: 'Merchant Zephyr',
    avatar: 'sparkles',
    title: 'Wandering Astral Merchant',
    personality: 'Friendly merchant seeking balanced rarity swaps.',
    minTier: 'rare',
    maxTier: 'mythic',
    greeting: 'Greetings traveler! Looking to swap duplicate auras?',
  },
  {
    id: 'bot_trader_2',
    name: 'Oracle Luna',
    avatar: 'crown',
    title: 'Celestial Appraiser',
    personality: 'Values high-luck items and celestial treasures.',
    minTier: 'epic',
    maxTier: 'celestial',
    greeting: 'I trade in cosmic energies. Show me what you have found!',
  },
  {
    id: 'bot_trader_3',
    name: 'Overlord Ignis',
    avatar: 'flame',
    title: 'Flame Vault Collector',
    personality: 'Aggressive collector of divine and singularity rarities.',
    minTier: 'celestial',
    maxTier: 'singularity',
    greeting: 'Only the rarest specimens catch my eye. Make an offer.',
  },
];

// Helper to generate 6-character clean room codes (e.g. TR-8924)
export function generateTradeCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const num = Math.floor(100 + Math.random() * 900);
  return `TR-${result}${num}`.substring(0, 8);
}

// Convert Firestore document to TradeRoom
function parseTradeDoc(data: any): TradeRoom | null {
  if (!data) return null;
  try {
    const hostOffers: TradeOfferItem[] = data.hostOffersJson
      ? JSON.parse(data.hostOffersJson)
      : [];
    const guestOffers: TradeOfferItem[] = data.guestOffersJson
      ? JSON.parse(data.guestOffersJson)
      : [];

    const host: TradeParticipant = {
      playerId: data.hostPlayerId,
      name: data.hostName || 'Anonymous Trader',
      avatar: data.hostAvatar || 'sparkles',
      title: data.hostTitle || 'RNG Apprentice',
      offers: hostOffers,
      isLocked: Boolean(data.hostIsLocked),
      isAccepted: Boolean(data.hostIsAccepted),
    };

    let guest: TradeParticipant | null = null;
    if (data.guestPlayerId) {
      guest = {
        playerId: data.guestPlayerId,
        name: data.guestName || 'Partner Trader',
        avatar: data.guestAvatar || 'dices',
        title: data.guestTitle || 'Lucky Roller',
        offers: guestOffers,
        isLocked: Boolean(data.guestIsLocked),
        isAccepted: Boolean(data.guestIsAccepted),
      };
    }

    return {
      id: data.id,
      roomCode: data.roomCode,
      status: data.status || 'waiting',
      createdAt: data.createdAt || Date.now(),
      updatedAt: data.updatedAt || Date.now(),
      host,
      guest,
      completedSummary: data.completedSummary,
      lastEmote: data.lastEmote,
      lastEmotePlayer: data.lastEmotePlayer,
    };
  } catch (err) {
    console.error('Error parsing trade doc:', err);
    return null;
  }
}

// Convert TradeRoom to Firestore document representation
function toTradeDocData(room: TradeRoom): any {
  return cleanFirestoreData({
    id: room.id,
    roomCode: room.roomCode,
    status: room.status,
    createdAt: room.createdAt,
    updatedAt: Date.now(),
    hostPlayerId: room.host.playerId,
    hostName: room.host.name,
    hostAvatar: room.host.avatar,
    hostTitle: room.host.title,
    hostOffersJson: JSON.stringify(room.host.offers || []),
    hostIsLocked: Boolean(room.host.isLocked),
    hostIsAccepted: Boolean(room.host.isAccepted),
    guestPlayerId: room.guest?.playerId || null,
    guestName: room.guest?.name || null,
    guestAvatar: room.guest?.avatar || null,
    guestTitle: room.guest?.title || null,
    guestOffersJson: JSON.stringify(room.guest?.offers || []),
    guestIsLocked: Boolean(room.guest?.isLocked),
    guestIsAccepted: Boolean(room.guest?.isAccepted),
    completedSummary: room.completedSummary || null,
    lastEmote: room.lastEmote || null,
    lastEmotePlayer: room.lastEmotePlayer || null,
  });
}

// Create a new online trade room
export async function createOnlineTradeRoom(
  profile: PlayerProfile
): Promise<TradeRoom> {
  const roomCode = generateTradeCode();
  const roomId = `trade_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const host: TradeParticipant = {
    playerId: profile.id,
    name: profile.name || 'Anonymous Trader',
    avatar: profile.avatarIcon || 'sparkles',
    title: profile.title || 'RNG Apprentice',
    offers: [],
    isLocked: false,
    isAccepted: false,
  };

  const tradeRoom: TradeRoom = {
    id: roomId,
    roomCode,
    status: 'waiting',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    host,
    guest: null,
  };

  if (isFirebaseConfigured && db) {
    try {
      const docRef = doc(db, 'trades', roomId);
      await setDoc(docRef, toTradeDocData(tradeRoom));
    } catch (err) {
      console.warn('Firebase error creating trade room:', err);
    }
  }

  return tradeRoom;
}

// Join an existing trade room via room code or ID
export async function joinOnlineTradeRoom(
  roomCodeOrId: string,
  profile: PlayerProfile
): Promise<TradeRoom | null> {
  if (!isFirebaseConfigured || !db) return null;

  try {
    const cleanQuery = roomCodeOrId.trim().toUpperCase();
    let targetDoc: any = null;

    // Try direct ID lookup
    const directDocRef = doc(db, 'trades', roomCodeOrId.trim());
    const directSnap = await getDoc(directDocRef);
    if (directSnap.exists()) {
      targetDoc = directSnap.data();
    } else {
      // Query by roomCode
      const q = query(
        collection(db, 'trades'),
        where('roomCode', '==', cleanQuery),
        limit(1)
      );
      const querySnap = await getDocs(q);
      if (!querySnap.empty) {
        targetDoc = querySnap.docs[0].data();
      }
    }

    if (!targetDoc) return null;

    const room = parseTradeDoc(targetDoc);
    if (!room) return null;

    // Check if player is already host
    if (room.host.playerId === profile.id) {
      return room;
    }

    // Check if room is full with another player
    if (room.guest && room.guest.playerId !== profile.id && room.status !== 'waiting') {
      throw new Error('This trade room is already full.');
    }

    // Add guest participant
    const guest: TradeParticipant = {
      playerId: profile.id,
      name: profile.name || 'Trader Guest',
      avatar: profile.avatarIcon || 'dices',
      title: profile.title || 'Lucky Roller',
      offers: room.guest?.playerId === profile.id ? room.guest.offers : [],
      isLocked: false,
      isAccepted: false,
    };

    room.guest = guest;
    room.status = 'trading';
    room.updatedAt = Date.now();

    const docRef = doc(db, 'trades', room.id);
    await updateDoc(docRef, toTradeDocData(room));

    return room;
  } catch (err) {
    console.error('Error joining trade room:', err);
    throw err;
  }
}

// Real-time listener for trade updates
export function subscribeToTradeRoom(
  roomId: string,
  onUpdate: (room: TradeRoom | null) => void
): Unsubscribe {
  if (!isFirebaseConfigured || !db) {
    return () => {};
  }

  const docRef = doc(db, 'trades', roomId);
  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const parsed = parseTradeDoc(snapshot.data());
        onUpdate(parsed);
      } else {
        onUpdate(null);
      }
    },
    (err) => {
      console.warn('Trade snapshot error:', err);
    }
  );
}

// Update offered items in a trade slot (resets lock & acceptance for safety)
export async function updateTradeOffersInRoom(
  roomId: string,
  isHost: boolean,
  offers: TradeOfferItem[]
): Promise<void> {
  if (!isFirebaseConfigured || !db) return;

  try {
    const docRef = doc(db, 'trades', roomId);
    const updatePayload: any = {
      updatedAt: Date.now(),
      // Safety auto-unlock: If anyone modifies their offer, unlock and un-accept both players!
      hostIsLocked: false,
      hostIsAccepted: false,
      guestIsLocked: false,
      guestIsAccepted: false,
    };

    if (isHost) {
      updatePayload.hostOffersJson = JSON.stringify(offers);
    } else {
      updatePayload.guestOffersJson = JSON.stringify(offers);
    }

    await updateDoc(docRef, updatePayload);
  } catch (err) {
    console.warn('Error updating trade offers:', err);
  }
}

// Lock in trade offer (Step 1 of Confirmation)
export async function setTradeLockState(
  roomId: string,
  isHost: boolean,
  isLocked: boolean
): Promise<void> {
  if (!isFirebaseConfigured || !db) return;

  try {
    const docRef = doc(db, 'trades', roomId);
    const updatePayload: any = {
      updatedAt: Date.now(),
      // Reset accept state if locking is toggled off
      ...(isLocked ? {} : { hostIsAccepted: false, guestIsAccepted: false }),
    };

    if (isHost) {
      updatePayload.hostIsLocked = isLocked;
      if (!isLocked) updatePayload.hostIsAccepted = false;
    } else {
      updatePayload.guestIsLocked = isLocked;
      if (!isLocked) updatePayload.guestIsAccepted = false;
    }

    await updateDoc(docRef, updatePayload);
  } catch (err) {
    console.warn('Error setting trade lock state:', err);
  }
}

// Confirm and Accept Trade (Step 2 of Confirmation)
export async function setTradeAcceptState(
  roomId: string,
  isHost: boolean,
  isAccepted: boolean
): Promise<void> {
  if (!isFirebaseConfigured || !db) return;

  try {
    const docRef = doc(db, 'trades', roomId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return;

    const data = snap.data();
    const updatePayload: any = {
      updatedAt: Date.now(),
    };

    const newHostAccepted = isHost ? isAccepted : Boolean(data.hostIsAccepted);
    const newGuestAccepted = !isHost ? isAccepted : Boolean(data.guestIsAccepted);

    if (isHost) {
      updatePayload.hostIsAccepted = isAccepted;
    } else {
      updatePayload.guestIsAccepted = isAccepted;
    }

    // If both players have accepted and both are locked in, mark trade completed!
    if (
      newHostAccepted &&
      newGuestAccepted &&
      Boolean(data.hostIsLocked) &&
      Boolean(data.guestIsLocked)
    ) {
      updatePayload.status = 'completed';
      updatePayload.completedSummary = `Trade executed successfully between ${data.hostName} and ${data.guestName}`;
    }

    await updateDoc(docRef, updatePayload);
  } catch (err) {
    console.warn('Error setting trade accept state:', err);
  }
}

// Cancel / Leave trade room
export async function cancelOnlineTradeRoom(roomId: string): Promise<void> {
  if (!isFirebaseConfigured || !db) return;

  try {
    const docRef = doc(db, 'trades', roomId);
    await updateDoc(docRef, {
      status: 'cancelled',
      updatedAt: Date.now(),
    });
  } catch (err) {
    console.warn('Error cancelling trade room:', err);
  }
}

// Send quick reaction emote or message
export async function sendTradeEmote(
  roomId: string,
  playerName: string,
  emote: string
): Promise<void> {
  if (!isFirebaseConfigured || !db) return;

  try {
    const docRef = doc(db, 'trades', roomId);
    await updateDoc(docRef, {
      lastEmote: emote,
      lastEmotePlayer: playerName,
      updatedAt: Date.now(),
    });
  } catch (err) {
    console.warn('Error sending trade emote:', err);
  }
}

// Calculate trade valuation and fair trade rating
export function calculateTradeValue(offers: TradeOfferItem[]): {
  totalRankScore: number;
  bestRarity: RarityTier;
  itemCount: number;
} {
  if (!offers || offers.length === 0) {
    return { totalRankScore: 0, bestRarity: 'common', itemCount: 0 };
  }

  let totalRankScore = 0;
  let highestRank = -1;
  let bestRarity: RarityTier = 'common';
  let itemCount = 0;

  offers.forEach((item) => {
    const rank = getRarityTierRank(item.rarity);
    // Exponential weighting so ultra rares carry realistic value
    const itemScore = Math.pow(rank + 1, 2) * (item.count || 1);
    totalRankScore += itemScore;
    itemCount += item.count || 1;

    if (rank > highestRank) {
      highestRank = rank;
      bestRarity = item.rarity;
    }
  });

  return { totalRankScore, bestRarity, itemCount };
}

// Evaluate trade balance between two offers
export function evaluateTradeBalance(
  myOffers: TradeOfferItem[],
  theirOffers: TradeOfferItem[]
): {
  balanceScore: number; // Ratio -100 (heavily in my favor) to +100 (heavily giving away)
  label: string;
  color: string;
} {
  const myVal = calculateTradeValue(myOffers).totalRankScore;
  const theirVal = calculateTradeValue(theirOffers).totalRankScore;

  if (myVal === 0 && theirVal === 0) {
    return { balanceScore: 0, label: 'Empty Offers', color: '#94a3b8' };
  }

  if (myVal === 0) {
    return { balanceScore: -100, label: 'Free Gift for You! 🎁', color: '#10b981' };
  }

  if (theirVal === 0) {
    return { balanceScore: 100, label: 'Generous Gift from You 🎁', color: '#f59e0b' };
  }

  const ratio = myVal / theirVal;

  if (ratio >= 0.7 && ratio <= 1.4) {
    return { balanceScore: 0, label: 'Fair & Balanced Trade ⚖️', color: '#10b981' };
  } else if (ratio < 0.7) {
    return { balanceScore: -50, label: 'Huge Win for You! 🚀', color: '#3b82f6' };
  } else {
    return { balanceScore: 50, label: 'Overpaying for Item ⚠️', color: '#f59e0b' };
  }
}

// Generate random dynamic offers for the AI Practice Bot
export function generateBotOffers(bot: BotTraderConfig, playerOffers: TradeOfferItem[]): TradeOfferItem[] {
  const minRank = getRarityTierRank(bot.minTier);
  const maxRank = getRarityTierRank(bot.maxTier);

  // Find candidate items within bot tier range
  const candidates = ITEMS.filter((itm) => {
    const r = getRarityTierRank(itm.rarity);
    return r >= minRank && r <= maxRank;
  });

  if (candidates.length === 0) return [];

  // Pick 1 to 3 items
  const offerCount = Math.min(3, Math.max(1, Math.floor(Math.random() * 3) + 1));
  const pickedOffers: TradeOfferItem[] = [];

  for (let i = 0; i < offerCount; i++) {
    const randomItem = candidates[Math.floor(Math.random() * candidates.length)];
    if (!pickedOffers.some((o) => o.itemId === randomItem.id)) {
      pickedOffers.push({
        itemId: randomItem.id,
        name: randomItem.name,
        rarity: randomItem.rarity,
        chance: RARITIES[randomItem.rarity]?.oneInChance || '1 in 100',
        count: 1,
        luckBonus: randomItem.luckBonus,
        addedAt: Date.now() + i * 100,
      });
    }
  }

  return pickedOffers;
}
