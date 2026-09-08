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
  AuraDuelRoom,
  AuraDuelParticipant,
  GameState,
  Item,
  PlayerProfile,
  RarityTier,
} from '../types';
import { ITEMS, ITEMS_BY_ID } from '../data/items';
import { RARITIES, getRarityTierRank } from '../data/rarities';
import { findBestItemInInventory, cleanFirestoreData } from './leaderboardService';

// AI Bot opponents for Practice Mode or solo testing
export const AI_BOT_CHALLENGERS: {
  name: string;
  avatarIcon: string;
  title: string;
  minRarityTier: RarityTier;
  maxRarityTier: RarityTier;
}[] = [
  { name: 'Apprentice Novice', avatarIcon: 'dices', title: 'RNG Apprentice', minRarityTier: 'rare', maxRarityTier: 'legendary' },
  { name: 'Astral Duelist', avatarIcon: 'sparkles', title: 'Lucky Roller', minRarityTier: 'legendary', maxRarityTier: 'mythic' },
  { name: 'Void Phantom AI', avatarIcon: 'skull', title: 'Mythic Touched', minRarityTier: 'mythic', maxRarityTier: 'celestial' },
  { name: 'Solaris Archon', avatarIcon: 'flame', title: 'Celestial Chosen', minRarityTier: 'celestial', maxRarityTier: 'divine' },
  { name: 'Singularity Sovereign Bot', avatarIcon: 'atom', title: 'Singularity Sovereign', minRarityTier: 'divine', maxRarityTier: 'singularity' },
  { name: 'Nani Realm Overlord', avatarIcon: 'crown', title: 'Omnipotent Ascendant', minRarityTier: 'nani', maxRarityTier: 'nani' },
];

// Helper to generate readable 6-character room code (e.g. CLASH-924)
export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const num = Math.floor(100 + Math.random() * 900);
  return `AURA-${result}${num}`.substring(0, 8);
}

// Convert participant info
export function buildParticipant(
  profile: PlayerProfile,
  gameState: GameState
): AuraDuelParticipant {
  const best = findBestItemInInventory(gameState);
  let bestAuraItem = null;
  const invKeys = Object.keys(gameState.inventory);
  for (const k of invKeys) {
    const itm = ITEMS_BY_ID[k];
    if (itm && itm.name === best.name) {
      bestAuraItem = itm;
      break;
    }
  }

  return {
    playerId: profile.id,
    name: profile.name || 'Anonymous Duelist',
    avatarIcon: profile.avatarIcon || 'dices',
    title: profile.title || 'RNG Apprentice',
    hasLocked: false,
    bestAuraId: bestAuraItem ? bestAuraItem.id : 'common_1',
    bestAuraName: best.name,
    bestAuraRarity: best.rarity,
    bestAuraRank: best.rank,
    bestAuraChance: best.chance,
  };
}

// Create a new real-time duel room in Firestore
export async function createOnlineDuelRoom(
  profile: PlayerProfile,
  gameState: GameState
): Promise<AuraDuelRoom> {
  const hostParticipant = buildParticipant(profile, gameState);
  const roomCode = generateRoomCode();
  const roomId = `duel_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const roomData: AuraDuelRoom = {
    id: roomId,
    roomCode,
    status: 'waiting',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    host: hostParticipant,
    guest: null,
    winnerPlayerId: null,
    loserPlayerId: null,
    transferredAuraId: null,
    transferredAuraName: null,
    transferredAuraRarity: null,
    isDraw: false,
  };

  if (db && isFirebaseConfigured) {
    try {
      const roomRef = doc(db, 'aura_duels', roomId);
      await setDoc(roomRef, cleanFirestoreData(roomData));
    } catch (err) {
      console.warn('Firestore room create note:', err);
    }
  }

  return roomData;
}

// Join an existing duel room by Room Code or Room ID
export async function joinOnlineDuelRoom(
  roomCodeOrId: string,
  profile: PlayerProfile,
  gameState: GameState
): Promise<{ success: boolean; room?: AuraDuelRoom; error?: string }> {
  const cleanInput = roomCodeOrId.trim().toUpperCase();
  const guestParticipant = buildParticipant(profile, gameState);

  if (!db || !isFirebaseConfigured) {
    return { success: false, error: 'Database is in offline mode. You can try Practice AI Mode!' };
  }

  try {
    let targetDocSnap = null;
    let targetDocRef = null;

    // 1. Try directly by ID
    const directRef = doc(db, 'aura_duels', roomCodeOrId.trim());
    const directSnap = await getDoc(directRef);

    if (directSnap.exists()) {
      targetDocSnap = directSnap;
      targetDocRef = directRef;
    } else {
      // 2. Query by roomCode
      const q = query(
        collection(db, 'aura_duels'),
        where('roomCode', '==', cleanInput),
        where('status', '==', 'waiting'),
        limit(1)
      );
      const querySnap = await getDocs(q);
      if (!querySnap.empty) {
        targetDocSnap = querySnap.docs[0];
        targetDocRef = targetDocSnap.ref;
      }
    }

    if (!targetDocSnap || !targetDocRef) {
      return { success: false, error: 'Duel room not found or match is already full/in progress.' };
    }

    const currentRoom = targetDocSnap.data() as AuraDuelRoom;

    if (currentRoom.host.playerId === profile.id) {
      return { success: true, room: currentRoom };
    }

    if (currentRoom.status !== 'waiting') {
      return { success: false, error: 'This duel room is no longer waiting for players.' };
    }

    const updatedRoom: Partial<AuraDuelRoom> = {
      guest: guestParticipant,
      status: 'selecting',
      updatedAt: Date.now(),
    };

    await updateDoc(targetDocRef, cleanFirestoreData(updatedRoom));

    return {
      success: true,
      room: {
        ...currentRoom,
        ...updatedRoom,
      },
    };
  } catch (err: any) {
    console.error('Error joining duel room:', err);
    return { success: false, error: err?.message || 'Failed to join duel room.' };
  }
}

// Lock in chosen Aura
export async function lockInChosenAura(
  roomId: string,
  currentRoom: AuraDuelRoom,
  playerId: string,
  selectedItem: Item
): Promise<void> {
  const isHost = currentRoom.host.playerId === playerId;
  const isGuest = currentRoom.guest?.playerId === playerId;

  if (!isHost && !isGuest) return;

  const itemRank = getRarityTierRank(selectedItem.rarity);
  const itemChance = RARITIES[selectedItem.rarity]?.oneInChance || '1 in 2';

  const updatedHost = { ...currentRoom.host };
  const updatedGuest = currentRoom.guest ? { ...currentRoom.guest } : null;

  if (isHost) {
    updatedHost.hasLocked = true;
    updatedHost.selectedAuraId = selectedItem.id;
    updatedHost.selectedAuraName = selectedItem.name;
    updatedHost.selectedAuraRarity = selectedItem.rarity;
    updatedHost.selectedAuraRank = itemRank;
    updatedHost.selectedAuraChance = itemChance;
  } else if (updatedGuest) {
    updatedGuest.hasLocked = true;
    updatedGuest.selectedAuraId = selectedItem.id;
    updatedGuest.selectedAuraName = selectedItem.name;
    updatedGuest.selectedAuraRarity = selectedItem.rarity;
    updatedGuest.selectedAuraRank = itemRank;
    updatedGuest.selectedAuraChance = itemChance;
  }

  // Check if both have locked in their secret aura!
  const bothLocked = updatedHost.hasLocked && updatedGuest && updatedGuest.hasLocked;
  let newStatus = currentRoom.status;

  let winnerId: string | null = null;
  let loserId: string | null = null;
  let prizeAuraId: string | null = null;
  let prizeAuraName: string | null = null;
  let prizeAuraRarity: RarityTier | null = null;
  let isDraw = false;

  if (bothLocked) {
    newStatus = 'revealing';

    const hostRank = updatedHost.selectedAuraRank || 0;
    const guestRank = updatedGuest?.selectedAuraRank || 0;

    if (hostRank > guestRank) {
      // Host wins! Takes loser's (guest) best aura or chosen aura
      winnerId = updatedHost.playerId;
      loserId = updatedGuest!.playerId;
      prizeAuraId = updatedGuest!.bestAuraId || updatedGuest!.selectedAuraId || null;
      prizeAuraName = updatedGuest!.bestAuraName || updatedGuest!.selectedAuraName || 'Mythic Aura';
      prizeAuraRarity = updatedGuest!.bestAuraRarity || updatedGuest!.selectedAuraRarity || 'rare';
    } else if (guestRank > hostRank) {
      // Guest wins! Takes loser's (host) best aura or chosen aura
      winnerId = updatedGuest!.playerId;
      loserId = updatedHost.playerId;
      prizeAuraId = updatedHost.bestAuraId || updatedHost.selectedAuraId || null;
      prizeAuraName = updatedHost.bestAuraName || updatedHost.selectedAuraName || 'Mythic Aura';
      prizeAuraRarity = updatedHost.bestAuraRarity || updatedHost.selectedAuraRarity || 'rare';
    } else {
      // Tie rank!
      isDraw = true;
      winnerId = null;
      loserId = null;
    }
  }

  const payload: Partial<AuraDuelRoom> = {
    host: updatedHost,
    guest: updatedGuest,
    status: newStatus,
    winnerPlayerId: winnerId,
    loserPlayerId: loserId,
    transferredAuraId: prizeAuraId,
    transferredAuraName: prizeAuraName,
    transferredAuraRarity: prizeAuraRarity,
    isDraw,
    updatedAt: Date.now(),
  };

  if (db && isFirebaseConfigured) {
    try {
      const roomRef = doc(db, 'aura_duels', roomId);
      await updateDoc(roomRef, cleanFirestoreData(payload));
    } catch (err) {
      console.warn('Firestore lock aura update note:', err);
    }
  }
}

// Subscribe to real-time duel room
export function subscribeToDuelRoom(
  roomId: string,
  onUpdate: (room: AuraDuelRoom | null) => void
): Unsubscribe {
  if (!db || !isFirebaseConfigured) {
    return () => {};
  }

  try {
    const roomRef = doc(db, 'aura_duels', roomId);
    return onSnapshot(roomRef, (docSnap) => {
      if (docSnap.exists()) {
        onUpdate(docSnap.data() as AuraDuelRoom);
      } else {
        onUpdate(null);
      }
    });
  } catch (err) {
    console.warn('Duel room snapshot note:', err);
    return () => {};
  }
}

// Subscribe to open waiting rooms
export function subscribeToOpenDuelRooms(
  onUpdate: (rooms: AuraDuelRoom[]) => void
): Unsubscribe {
  if (!db || !isFirebaseConfigured) {
    setTimeout(() => onUpdate([]), 0);
    return () => {};
  }

  try {
    const q = query(
      collection(db, 'aura_duels'),
      where('status', '==', 'waiting'),
      orderBy('createdAt', 'desc'),
      limit(10)
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const list: AuraDuelRoom[] = [];
        snapshot.forEach((snap) => {
          list.push(snap.data() as AuraDuelRoom);
        });
        onUpdate(list);
      },
      (err) => {
        console.warn('Open duel rooms query note:', err);
        setTimeout(() => onUpdate([]), 0);
      }
    );
  } catch (err) {
    console.warn('Open duel query error:', err);
    setTimeout(() => onUpdate([]), 0);
    return () => {};
  }
}

// Send quick battle emote
export async function sendDuelEmote(
  roomId: string,
  playerName: string,
  emote: string
): Promise<void> {
  if (!db || !isFirebaseConfigured) return;

  try {
    const roomRef = doc(db, 'aura_duels', roomId);
    await updateDoc(roomRef, {
      lastEmote: emote,
      lastEmotePlayer: playerName,
      updatedAt: Date.now(),
    });
  } catch (err) {
    console.warn('Send emote note:', err);
  }
}

// Leave or cancel duel room
export async function leaveOrCancelDuelRoom(
  roomId: string,
  isHost: boolean
): Promise<void> {
  if (!db || !isFirebaseConfigured) return;

  try {
    const roomRef = doc(db, 'aura_duels', roomId);
    if (isHost) {
      await deleteDoc(roomRef);
    } else {
      await updateDoc(roomRef, {
        guest: null,
        status: 'waiting',
        updatedAt: Date.now(),
      });
    }
  } catch (err) {
    console.warn('Leave duel room note:', err);
  }
}

// Create an offline practice bot duel room
export function createPracticeAiDuel(
  profile: PlayerProfile,
  gameState: GameState
): AuraDuelRoom {
  const host = buildParticipant(profile, gameState);
  
  // Pick random bot
  const botConfig = AI_BOT_CHALLENGERS[Math.floor(Math.random() * AI_BOT_CHALLENGERS.length)];
  
  // Find an aura item for bot within range
  const botRarity = botConfig.minRarityTier;
  const botRank = getRarityTierRank(botRarity);
  const botChance = RARITIES[botRarity]?.oneInChance || '1 in 1,000';

  const guestBot: AuraDuelParticipant = {
    playerId: `bot_${Date.now()}`,
    name: `${botConfig.name} [AI]`,
    avatarIcon: botConfig.avatarIcon,
    title: botConfig.title,
    hasLocked: true,
    selectedAuraId: 'bot_aura_1',
    selectedAuraName: `${RARITIES[botRarity]?.name || 'Cosmic'} Guardian`,
    selectedAuraRarity: botRarity,
    selectedAuraRank: botRank,
    selectedAuraChance: botChance,
    bestAuraId: 'bot_aura_1',
    bestAuraName: `${RARITIES[botRarity]?.name || 'Cosmic'} Guardian`,
    bestAuraRarity: botRarity,
    bestAuraRank: botRank,
    bestAuraChance: botChance,
  };

  return {
    id: `local_practice_${Date.now()}`,
    roomCode: 'BOT-CLASH',
    status: 'selecting',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    host,
    guest: guestBot,
    winnerPlayerId: null,
    loserPlayerId: null,
    transferredAuraId: null,
    transferredAuraName: null,
    transferredAuraRarity: null,
    isDraw: false,
  };
}
