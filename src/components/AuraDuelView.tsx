import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  GameState,
  Item,
  PlayerProfile,
  RarityTier,
  AuraDuelRoom,
  AuraDuelParticipant,
} from '../types';
import { ITEMS, ITEMS_BY_ID } from '../data/items';
import { RARITIES, getRarityTierRank } from '../data/rarities';
import { sound } from '../utils/audio';
import { DynamicIcon } from './DynamicIcon';
import { AuraVisualizerCanvas } from './AuraVisualizerCanvas';
import {
  createOnlineDuelRoom,
  joinOnlineDuelRoom,
  lockInChosenAura,
  subscribeToDuelRoom,
  subscribeToOpenDuelRooms,
  sendDuelEmote,
  leaveOrCancelDuelRoom,
  createPracticeAiDuel,
} from '../services/duelService';
import { findBestItemInInventory } from '../services/leaderboardService';
import {
  Swords,
  Shield,
  Trophy,
  Flame,
  Sparkles,
  Lock,
  Unlock,
  CheckCircle2,
  Users,
  Copy,
  Check,
  Search,
  RefreshCw,
  Zap,
  ArrowRight,
  Bot,
  AlertTriangle,
  Radio,
  Crown,
  EyeOff,
  Eye,
  HelpCircle,
  Skull,
  Send,
  X,
  Volume2,
} from 'lucide-react';

interface AuraDuelViewProps {
  gameState: GameState;
  playerProfile: PlayerProfile;
  onAwardWonAura: (item: Item) => void;
  onDeductLostAura: (itemId: string) => void;
  onEquipItem?: (itemId: string) => void;
}

const BATTLE_EMOTES = ['👑', '🔥', '🎲', '😱', '⚡', '💎', '💀', '🛡️', '✨', 'GG!'];

const AuraDuelViewComponent: React.FC<AuraDuelViewProps> = ({
  gameState,
  playerProfile,
  onAwardWonAura,
  onDeductLostAura,
  onEquipItem,
}) => {
  // Lobby state
  const [activeRoom, setActiveRoom] = useState<AuraDuelRoom | null>(null);
  const [openRooms, setOpenRooms] = useState<AuraDuelRoom[]>([]);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // In-match state
  const [selectedAura, setSelectedAura] = useState<Item | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRarityFilter, setSelectedRarityFilter] = useState<string>('all');
  const [revealCountdown, setRevealCountdown] = useState<number | null>(null);
  const [hasClaimedPrize, setHasClaimedPrize] = useState(false);
  const [hasDeductedPrize, setHasDeductedPrize] = useState(false);
  const [lastEmoteMessage, setLastEmoteMessage] = useState<{ player: string; emote: string } | null>(null);

  // Active items in player inventory
  const ownedItems = useMemo(() => {
    const list: Item[] = [];
    Object.keys(gameState.inventory).forEach((itemId) => {
      const itm = ITEMS_BY_ID[itemId];
      if (itm && gameState.inventory[itemId]?.count > 0) {
        list.push(itm);
      }
    });

    // Sort by highest rarity first
    return list.sort((a, b) => {
      const rankA = getRarityTierRank(a.rarity);
      const rankB = getRarityTierRank(b.rarity);
      return rankB - rankA;
    });
  }, [gameState.inventory]);

  // Equipped item list & primary equipped item
  const equippedIdsKey = (gameState.equippedItemIds || []).join(',') || gameState.equippedItemId || '';
  const primaryEquippedItem: Item | null = useMemo(() => {
    if (gameState.equippedItemId && ITEMS_BY_ID[gameState.equippedItemId]) {
      return ITEMS_BY_ID[gameState.equippedItemId];
    }
    if (gameState.equippedItemIds && gameState.equippedItemIds.length > 0 && ITEMS_BY_ID[gameState.equippedItemIds[0]]) {
      return ITEMS_BY_ID[gameState.equippedItemIds[0]];
    }
    return null;
  }, [gameState.equippedItemId, equippedIdsKey]);

  // Selected aura fallback with safe derivation
  const effectiveSelectedAura: Item | null = selectedAura || primaryEquippedItem || ownedItems[0] || null;

  // Subscribe to open rooms list when in lobby
  useEffect(() => {
    if (!activeRoom) {
      const unsub = subscribeToOpenDuelRooms((rooms) => {
        setOpenRooms(rooms);
      });
      return () => unsub();
    }
  }, [Boolean(activeRoom)]);

  // Subscribe to active room when in match
  useEffect(() => {
    if (!activeRoom || activeRoom.id.startsWith('local_practice_')) return;

    const unsub = subscribeToDuelRoom(activeRoom.id, (updatedRoom) => {
      if (updatedRoom) {
        setActiveRoom(updatedRoom);

        // Handle emote display
        if (updatedRoom.lastEmote && updatedRoom.lastEmotePlayer) {
          setLastEmoteMessage({
            player: updatedRoom.lastEmotePlayer,
            emote: updatedRoom.lastEmote,
          });
        }
      } else {
        // Room was closed or deleted
        setActiveRoom(null);
      }
    });

    return () => unsub();
  }, [activeRoom?.id]);

  // Handle countdown animation when status moves to 'revealing'
  const isRevealing = activeRoom?.status === 'revealing';
  useEffect(() => {
    if (!isRevealing) {
      setRevealCountdown(null);
      return;
    }

    sound.playClash();
    setRevealCountdown(3);

    const t1 = setTimeout(() => {
      setRevealCountdown(2);
      sound.playTick(500);
    }, 1000);

    const t2 = setTimeout(() => {
      setRevealCountdown(1);
      sound.playTick(700);
    }, 2000);

    const t3 = setTimeout(() => {
      setRevealCountdown(0);
      sound.playClash();

      // Update local room status to finished
      setActiveRoom((prev) => (prev ? { ...prev, status: 'finished' } : null));
    }, 3000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [isRevealing]);

  // Handle victory/defeat sounds & state resolution
  useEffect(() => {
    if (!activeRoom || activeRoom.status !== 'finished') return;

    const isWinner = activeRoom.winnerPlayerId === playerProfile.id;
    const isLoser = activeRoom.loserPlayerId === playerProfile.id;

    if (isWinner && !hasClaimedPrize) {
      sound.playVictoryFanfare();
      setHasClaimedPrize(true);
      // Award winner the transferred aura if available
      if (activeRoom.transferredAuraId) {
        const itemToAward: Item = ITEMS_BY_ID[activeRoom.transferredAuraId] || {
          id: activeRoom.transferredAuraId,
          name: activeRoom.transferredAuraName || 'Cosmic Aura',
          rarity: activeRoom.transferredAuraRarity || 'rare',
          lore: 'Won from an epic Aura Clash multiplayer duel!',
          baseValue: 500,
          essenceValue: 100,
          luckBonus: 1.5,
          icon: 'Sparkles',
          auraType: 'cosmic',
          flavorTitle: 'Duel Champion Trophy',
        };
        onAwardWonAura(itemToAward);
      }
    } else if (isLoser && !hasDeductedPrize) {
      sound.playDefeat();
      setHasDeductedPrize(true);
      if (activeRoom.transferredAuraId) {
        onDeductLostAura(activeRoom.transferredAuraId);
      }
    }
  }, [
    activeRoom?.status,
    activeRoom?.winnerPlayerId,
    activeRoom?.loserPlayerId,
    activeRoom?.transferredAuraId,
    playerProfile.id,
    hasClaimedPrize,
    hasDeductedPrize,
    onAwardWonAura,
    onDeductLostAura,
  ]);

  // Create online room handler
  const handleCreateRoom = async () => {
    if (ownedItems.length === 0) {
      setJoinError('You need at least 1 Aura in your inventory to enter a Duel!');
      return;
    }
    sound.playButtonClick();
    setIsCreatingRoom(true);
    setJoinError(null);
    setHasClaimedPrize(false);
    setHasDeductedPrize(false);
    setRevealCountdown(null);

    try {
      const newRoom = await createOnlineDuelRoom(playerProfile, gameState);
      setActiveRoom(newRoom);
    } catch (err: any) {
      setJoinError(err?.message || 'Failed to create room.');
    } finally {
      setIsCreatingRoom(false);
    }
  };

  // Join by code handler
  const handleJoinByCode = async (codeToJoin?: string) => {
    const code = codeToJoin || joinCodeInput;
    if (!code.trim()) {
      setJoinError('Please enter a valid Duel Room Code.');
      return;
    }
    if (ownedItems.length === 0) {
      setJoinError('You need at least 1 Aura in your inventory to enter a Duel!');
      return;
    }

    sound.playButtonClick();
    setIsJoiningRoom(true);
    setJoinError(null);
    setHasClaimedPrize(false);
    setHasDeductedPrize(false);
    setRevealCountdown(null);

    try {
      const res = await joinOnlineDuelRoom(code, playerProfile, gameState);
      if (res.success && res.room) {
        setActiveRoom(res.room);
      } else {
        setJoinError(res.error || 'Could not join room.');
      }
    } catch (err: any) {
      setJoinError(err?.message || 'Failed to join room.');
    } finally {
      setIsJoiningRoom(false);
    }
  };

  // Practice AI Bot match handler
  const handleStartPracticeBot = () => {
    if (ownedItems.length === 0) {
      setJoinError('You need at least 1 Aura in your inventory to enter a Duel!');
      return;
    }
    sound.playButtonClick();
    setJoinError(null);
    setHasClaimedPrize(false);
    setHasDeductedPrize(false);
    setRevealCountdown(null);

    const botRoom = createPracticeAiDuel(playerProfile, gameState);
    setActiveRoom(botRoom);
  };

  // Lock in secret aura handler
  const handleLockIn = async () => {
    if (!activeRoom || !selectedAura) return;
    sound.playUpgrade();

    // Check if in local practice bot mode
    if (activeRoom.id.startsWith('local_practice_')) {
      const itemRank = getRarityTierRank(selectedAura.rarity);
      const hostLocked: AuraDuelParticipant = {
        ...activeRoom.host,
        hasLocked: true,
        selectedAuraId: selectedAura.id,
        selectedAuraName: selectedAura.name,
        selectedAuraRarity: selectedAura.rarity,
        selectedAuraRank: itemRank,
        selectedAuraChance: RARITIES[selectedAura.rarity]?.oneInChance || '1 in 2',
      };

      const guestRank = activeRoom.guest?.selectedAuraRank || 0;
      let winnerId: string | null = null;
      let loserId: string | null = null;
      let prizeId: string | null = null;
      let prizeName: string | null = null;
      let prizeRarity: RarityTier | null = null;
      let isDraw = false;

      if (itemRank > guestRank) {
        winnerId = hostLocked.playerId;
        loserId = activeRoom.guest!.playerId;
        prizeId = activeRoom.guest!.bestAuraId || 'bot_aura_1';
        prizeName = activeRoom.guest!.bestAuraName || 'Cosmic Guardian';
        prizeRarity = activeRoom.guest!.bestAuraRarity || 'rare';
      } else if (guestRank > itemRank) {
        winnerId = activeRoom.guest!.playerId;
        loserId = hostLocked.playerId;
        prizeId = hostLocked.selectedAuraId || null;
        prizeName = hostLocked.selectedAuraName || 'Aura';
        prizeRarity = hostLocked.selectedAuraRarity || 'rare';
      } else {
        isDraw = true;
      }

      setActiveRoom({
        ...activeRoom,
        host: hostLocked,
        status: 'revealing',
        winnerPlayerId: winnerId,
        loserPlayerId: loserId,
        transferredAuraId: prizeId,
        transferredAuraName: prizeName,
        transferredAuraRarity: prizeRarity,
        isDraw,
      });
      return;
    }

    // Online multiplayer lock in
    await lockInChosenAura(activeRoom.id, activeRoom, playerProfile.id, selectedAura);
  };

  // Leave room handler
  const handleLeaveRoom = async () => {
    sound.playButtonClick();
    if (activeRoom && !activeRoom.id.startsWith('local_practice_')) {
      const isHost = activeRoom.host.playerId === playerProfile.id;
      await leaveOrCancelDuelRoom(activeRoom.id, isHost);
    }
    setActiveRoom(null);
    setRevealCountdown(null);
  };

  // Send emote handler
  const handleSendEmote = async (em: string) => {
    sound.playButtonClick();
    if (!activeRoom) return;

    if (activeRoom.id.startsWith('local_practice_')) {
      setLastEmoteMessage({
        player: playerProfile.name,
        emote: em,
      });
      return;
    }

    await sendDuelEmote(activeRoom.id, playerProfile.name, em);
  };

  // Filtered inventory list
  const filteredOwnedItems = useMemo(() => {
    return ownedItems.filter((itm) => {
      const matchesSearch =
        itm.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        itm.rarity.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRarity = selectedRarityFilter === 'all' || itm.rarity === selectedRarityFilter;
      return matchesSearch && matchesRarity;
    });
  }, [ownedItems, searchQuery, selectedRarityFilter]);

  // Copy code helper
  const handleCopyCode = () => {
    if (!activeRoom) return;
    navigator.clipboard?.writeText(activeRoom.roomCode);
    sound.playButtonClick();
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Current participant roles
  const isHost = activeRoom?.host.playerId === playerProfile.id;
  const isGuest = activeRoom?.guest?.playerId === playerProfile.id;
  const myParticipant = isHost ? activeRoom?.host : activeRoom?.guest;
  const opponentParticipant = isHost ? activeRoom?.guest : activeRoom?.host;
  const isMyTurnLocked = Boolean(myParticipant?.hasLocked);
  const isOpponentLocked = Boolean(opponentParticipant?.hasLocked);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-3 sm:p-6 text-slate-100">
      {/* HEADER TITLE BANNER */}
      <div className="relative overflow-hidden rounded-3xl border border-amber-500/30 bg-gradient-to-br from-amber-950/40 via-slate-900/90 to-purple-950/40 p-6 shadow-2xl backdrop-blur-xl">
        <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-400/40 bg-gradient-to-tr from-amber-600/30 to-purple-600/30 shadow-lg shadow-amber-500/20">
              <Swords className="h-8 w-8 text-amber-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                  Aura Clash Arena
                </h1>
                <span className="rounded-full border border-amber-400/40 bg-amber-500/20 px-2.5 py-0.5 text-xs font-bold text-amber-300 uppercase tracking-widest">
                  Live Multiplayer
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300">
                Blind Aura Showdowns — Lock in your secret aura. Rarest aura wins & claims the loser's best aura!
              </p>
            </div>
          </div>

          {activeRoom && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-2xl border border-amber-500/30 bg-black/40 px-4 py-2">
                <Radio className="h-4 w-4 text-emerald-400 animate-pulse" />
                <span className="text-xs text-slate-400">Room Code:</span>
                <span className="font-mono font-black text-amber-300 tracking-wider">
                  {activeRoom.roomCode}
                </span>
                <button
                  onClick={handleCopyCode}
                  className="ml-1 rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white transition"
                  title="Copy room code"
                >
                  {copiedCode ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>

              <button
                onClick={handleLeaveRoom}
                className="flex items-center gap-1.5 rounded-xl border border-red-500/40 bg-red-500/20 px-3.5 py-2 text-xs font-bold text-red-300 hover:bg-red-500/30 transition"
              >
                <X className="h-4 w-4" />
                <span>Leave Arena</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ERROR ALERT */}
      {joinError && (
        <div className="flex items-center gap-3 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm font-medium text-rose-300">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 text-rose-400" />
          <span>{joinError}</span>
          <button
            onClick={() => setJoinError(null)}
            className="ml-auto text-rose-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. LOBBY VIEW (WHEN NO ACTIVE ROOM) */}
      {/* ========================================================================= */}
      {!activeRoom ? (
        <div className="flex flex-col gap-6">
          {/* PLAYER EQUIPPED AURA HERO PROFILE BAR */}
          <div className="relative overflow-hidden rounded-3xl border border-amber-500/40 bg-gradient-to-r from-slate-900/90 via-slate-900/95 to-amber-950/40 p-5 sm:p-6 shadow-2xl backdrop-blur-xl">
            <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-amber-500/10 blur-2xl" />
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
              {/* Profile details */}
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-400/40 bg-amber-500/20 text-amber-300 shadow-lg shadow-amber-500/20">
                  <DynamicIcon name={playerProfile.avatarIcon || 'dices'} className="h-7 w-7" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg sm:text-xl font-black text-white">{playerProfile.name}</span>
                    <span className="rounded-full bg-amber-500/20 border border-amber-400/30 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                      Duelist Rank
                    </span>
                  </div>
                  <div className="text-xs text-amber-300/80 font-medium">{playerProfile.title}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Inventory: <strong className="text-white">{ownedItems.length}</strong> unique auras • Total Rolls:{' '}
                    <strong className="text-white">{gameState.totalRolls.toLocaleString()}</strong>
                  </div>
                </div>
              </div>

              {/* Equipped Aura Showcase Card */}
              <div className="flex items-center gap-4 rounded-2xl border border-slate-700/80 bg-slate-800/60 p-3 sm:px-4 sm:py-3 backdrop-blur-md">
                {primaryEquippedItem ? (
                  <>
                    <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-black/40 overflow-hidden border border-amber-400/30">
                      <AuraVisualizerCanvas item={primaryEquippedItem} size={64} className="scale-125" />
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-amber-500/30 text-amber-300 border border-amber-500/40">
                          👑 Equipped Aura
                        </span>
                        <span
                          className="text-[10px] font-black uppercase px-1.5 py-0.2 rounded"
                          style={{
                            backgroundColor: `${RARITIES[primaryEquippedItem.rarity]?.accentColor || '#a855f7'}30`,
                            color: RARITIES[primaryEquippedItem.rarity]?.accentColor || '#a855f7',
                          }}
                        >
                          {primaryEquippedItem.rarity}
                        </span>
                      </div>
                      <span className="font-extrabold text-sm sm:text-base text-white truncate mt-0.5">
                        {primaryEquippedItem.name}
                      </span>
                      <span className="text-[11px] text-slate-300 font-mono">
                        Tier {getRarityTierRank(primaryEquippedItem.rarity)} • +{primaryEquippedItem.luckBonus || 1}x Luck Bonus
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-700/50 text-slate-400">
                      <Shield className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-300">No Aura Equipped</div>
                      <div className="text-[10px] text-slate-400">Equip an aura in Inventory or choose below</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* LEFT: CREATE / JOIN / BOT ACTIONS (5 COLS) */}
            <div className="lg:col-span-5 flex flex-col gap-6">
            {/* MATCHMAKING ACTIONS CARD */}
            <div className="rounded-3xl border border-amber-500/30 bg-slate-900/80 p-6 shadow-xl backdrop-blur-xl flex flex-col gap-5">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-400" />
                <span>Enter the Clash Arena</span>
              </h2>

              {/* CREATE ROOM BUTTON */}
              <button
                id="create-duel-room-btn"
                onClick={handleCreateRoom}
                disabled={isCreatingRoom}
                className="group relative flex w-full items-center justify-between overflow-hidden rounded-2xl border border-amber-500/50 bg-gradient-to-r from-amber-600 to-amber-500 p-4 font-black text-slate-950 shadow-lg shadow-amber-500/25 transition hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black/20 text-white">
                    <Crown className="h-6 w-6 text-amber-200" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-extrabold text-white">Host Live Duel Room</div>
                    <div className="text-xs text-amber-950 font-semibold">
                      Create room code & invite any player
                    </div>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-white transition-transform group-hover:translate-x-1" />
              </button>

              {/* JOIN BY CODE FORM */}
              <div className="flex flex-col gap-2 pt-2 border-t border-slate-800">
                <label className="text-xs font-bold text-slate-400">Join via Room Code</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. AURA-XY82"
                    value={joinCodeInput}
                    onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && handleJoinByCode()}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-sm font-mono uppercase tracking-wider text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
                  />
                  <button
                    id="join-code-btn"
                    onClick={() => handleJoinByCode()}
                    disabled={isJoiningRoom || !joinCodeInput.trim()}
                    className="flex items-center gap-1.5 rounded-xl border border-purple-500/40 bg-purple-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-purple-500 transition disabled:opacity-40"
                  >
                    {isJoiningRoom ? <RefreshCw className="h-4 w-4 animate-spin" /> : <span>Join</span>}
                  </button>
                </div>
              </div>

              {/* PRACTICE BOT MATCH */}
              <div className="pt-2 border-t border-slate-800">
                <button
                  id="practice-bot-btn"
                  onClick={handleStartPracticeBot}
                  className="flex w-full items-center justify-between rounded-2xl border border-slate-700/60 bg-slate-800/50 p-3.5 text-xs font-bold text-slate-300 hover:border-slate-600 hover:bg-slate-800 hover:text-white transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-300">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-slate-200">Practice Against AI Bot</div>
                      <div className="text-[11px] text-slate-400">Solo testing mode with simulated opponents</div>
                    </div>
                  </div>
                  <span className="rounded-lg bg-cyan-500/10 px-2 py-1 text-[10px] text-cyan-300 border border-cyan-500/20">
                    Practice Mode
                  </span>
                </button>
              </div>
            </div>

            {/* HOW IT WORKS / RULES CARD */}
            <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl backdrop-blur-xl">
              <h3 className="text-sm font-black text-amber-300 flex items-center gap-2 mb-3">
                <HelpCircle className="h-4 w-4" />
                <span>Aura Clash High Stakes Rules</span>
              </h3>
              <ul className="flex flex-col gap-2.5 text-xs text-slate-300">
                <li className="flex items-start gap-2">
                  <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-amber-500/20 font-bold text-amber-400">
                    1
                  </span>
                  <span>
                    <strong>Blind Selection:</strong> Both players pick an aura from their inventory secretly. Neither can see what was chosen until both lock in.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-amber-500/20 font-bold text-amber-400">
                    2
                  </span>
                  <span>
                    <strong>Showdown Reveal:</strong> Both auras flip simultaneously in a 3D reveal sequence. Higher rarity rank wins!
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-amber-500/20 font-bold text-amber-400">
                    3
                  </span>
                  <span>
                    <strong>High Stakes Bounty:</strong> The victor claims the loser's best aura, instantly transferred to the winner's inventory!
                  </span>
                </li>
              </ul>
            </div>
          </div>

          {/* RIGHT: LIVE OPEN ROOMS BROWSER (7 COLS) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl backdrop-blur-xl flex flex-col gap-4 min-h-[460px]">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-amber-400" />
                  <h2 className="text-base sm:text-lg font-black text-white">Live Open Arenas</h2>
                  <span className="rounded-full bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-bold text-emerald-300 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    {openRooms.length} Waiting
                  </span>
                </div>
                <span className="text-xs text-slate-400">Real-time sync</span>
              </div>

              {openRooms.length === 0 ? (
                <div className="my-auto flex flex-col items-center justify-center gap-3 p-8 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-700 bg-slate-800/50 text-slate-400">
                    <Radio className="h-8 w-8 animate-pulse text-amber-400" />
                  </div>
                  <div className="text-sm font-bold text-slate-200">No open duels waiting right now</div>
                  <p className="max-w-xs text-xs text-slate-400">
                    Be the pioneer! Host a new duel room or practice against the AI bots.
                  </p>
                  <button
                    onClick={handleCreateRoom}
                    className="mt-2 rounded-xl border border-amber-500/40 bg-amber-500/20 px-4 py-2 text-xs font-bold text-amber-300 hover:bg-amber-500/30 transition"
                  >
                    Host a Duel Room Now
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-3 overflow-y-auto max-h-[480px] pr-1">
                  {openRooms.map((room) => {
                    const isMyRoom = room.host.playerId === playerProfile.id;
                    return (
                      <div
                        key={room.id}
                        className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-800/80 bg-slate-800/40 p-4 transition hover:border-amber-500/40 hover:bg-slate-800/70"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-amber-400/30 bg-amber-500/10 text-amber-300">
                            <DynamicIcon name={room.host.avatarIcon || 'dices'} className="h-6 w-6" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white">{room.host.name}</span>
                              {isMyRoom && (
                                <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                                  YOU (Host)
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-400">
                              Title: <span className="text-amber-400/80">{room.host.title}</span> • Code:{' '}
                              <span className="font-mono text-slate-300">{room.roomCode}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right hidden sm:block">
                            <div className="text-[11px] text-slate-400">Best Aura Rank</div>
                            <div className="text-xs font-bold text-amber-300">
                              {room.host.bestAuraName} ({room.host.bestAuraRarity})
                            </div>
                          </div>
                          <button
                            onClick={() => (isMyRoom ? setActiveRoom(room) : handleJoinByCode(room.roomCode))}
                            className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition shadow-sm ${
                              isMyRoom
                                ? 'border border-amber-500/40 bg-amber-500/20 text-amber-200 hover:bg-amber-500/30'
                                : 'border border-purple-500/40 bg-purple-600 text-white hover:bg-purple-500'
                            }`}
                          >
                            <Swords className="h-3.5 w-3.5" />
                            <span>{isMyRoom ? 'Enter Room' : 'Challenge!'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      ) : (
        /* ========================================================================= */
        /* 2. ACTIVE DUEL ARENA MATCH VIEW */
        /* ========================================================================= */
        <div className="flex flex-col gap-6">
          {/* ARENA VERSUS STAGE */}
          <div className="relative overflow-hidden rounded-3xl border border-amber-500/40 bg-gradient-to-b from-slate-900/95 via-slate-950 to-purple-950/40 p-4 sm:p-8 shadow-2xl backdrop-blur-2xl">
            {/* ARENA AMBIENT BACKGROUND GLOW */}
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent" />

            {/* TOP STATUS BAR */}
            <div className="relative z-10 flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-xs sm:text-sm font-bold text-slate-300">
                  {activeRoom.status === 'waiting' && 'Waiting for Challenger to join...'}
                  {activeRoom.status === 'selecting' && 'Blind Aura Selection Phase'}
                  {activeRoom.status === 'revealing' && 'SHOWDOWN REVEAL IN PROGRESS!'}
                  {activeRoom.status === 'finished' && 'Duel Completed!'}
                </span>
              </div>

              {/* EMOTE REACTION BROADCAST */}
              {lastEmoteMessage && (
                <div className="flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-500/20 px-3 py-1 text-xs font-bold text-amber-200 animate-bounce">
                  <span>{lastEmoteMessage.player}:</span>
                  <span className="text-base">{lastEmoteMessage.emote}</span>
                </div>
              )}
            </div>

            {/* COUNTDOWN OVERLAY IF REVEALING */}
            {revealCountdown !== null && revealCountdown > 0 && (
              <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm">
                <div className="text-7xl sm:text-9xl font-black text-amber-300 animate-ping">
                  {revealCountdown}
                </div>
                <div className="mt-4 text-xl sm:text-2xl font-extrabold uppercase tracking-widest text-white">
                  Revealing Secret Auras...
                </div>
              </div>
            )}

            {/* 2-PLAYER VERSUS GRID */}
            <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              {/* ============================================================== */}
              {/* PLAYER 1 (YOU / HOST OR GUEST) - 5 COLS */}
              {/* ============================================================== */}
              <div className="md:col-span-5 flex flex-col gap-4 rounded-3xl border border-blue-500/40 bg-gradient-to-b from-blue-950/30 to-slate-900/80 p-5 shadow-xl">
                <div className="flex items-center justify-between border-b border-blue-500/20 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-400/40 bg-blue-500/20 text-blue-300 shadow-md">
                      <DynamicIcon name={myParticipant?.avatarIcon || 'dices'} className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-white">{myParticipant?.name}</span>
                        <span className="rounded bg-blue-500/20 px-2 py-0.5 text-[10px] font-bold text-blue-300">
                          YOU
                        </span>
                      </div>
                      <div className="text-xs text-blue-300/80">{myParticipant?.title}</div>
                      {primaryEquippedItem && (
                        <div className="mt-1 flex items-center gap-1 text-[10px] text-amber-300 font-semibold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                          <span>👑 Equipped: {primaryEquippedItem.name}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    {isMyTurnLocked ? (
                      <span className="flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/20 px-2.5 py-1 text-xs font-bold text-emerald-300">
                        <Lock className="h-3 w-3" /> Locked
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/20 px-2.5 py-1 text-xs font-bold text-amber-300">
                        <Unlock className="h-3 w-3" /> Choosing
                      </span>
                    )}
                  </div>
                </div>

                {/* YOUR SELECTED AURA CARD */}
                {selectedAura ? (
                  <div
                    className="relative overflow-hidden rounded-2xl border p-4 transition-all shadow-lg flex flex-col gap-3"
                    style={{
                      borderColor: RARITIES[selectedAura.rarity]?.accentColor || '#f59e0b',
                      backgroundColor: `${RARITIES[selectedAura.rarity]?.accentColor || '#f59e0b'}15`,
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className="text-xs font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: `${RARITIES[selectedAura.rarity]?.accentColor || '#f59e0b'}30`,
                          color: RARITIES[selectedAura.rarity]?.accentColor || '#f59e0b',
                        }}
                      >
                        {selectedAura.rarity.toUpperCase()}
                      </span>
                      <span className="text-xs font-mono text-slate-300">
                        Odds: {RARITIES[selectedAura.rarity]?.oneInChance || '1 in 2'}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div
                        className="relative flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl shadow-md overflow-hidden"
                        style={{ backgroundColor: `${RARITIES[selectedAura.rarity]?.accentColor || '#f59e0b'}30` }}
                      >
                        <AuraVisualizerCanvas item={selectedAura} size={64} className="scale-110" />
                      </div>
                      <div>
                        <div className="text-base sm:text-lg font-black text-white">
                          {selectedAura.name}
                        </div>
                        <div className="text-xs text-slate-300 flex items-center gap-2">
                          <span>Rarity Rank: <strong className="text-amber-300">Tier {getRarityTierRank(selectedAura.rarity)}</strong></span>
                          {primaryEquippedItem?.id === selectedAura.id && (
                            <span className="text-[9px] bg-amber-500/30 text-amber-300 px-1.5 py-0.5 rounded font-bold border border-amber-500/40">
                              👑 EQUIPPED
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {!isMyTurnLocked && activeRoom.status !== 'finished' && (
                      <button
                        id="lock-in-aura-btn"
                        onClick={handleLockIn}
                        className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 py-2.5 text-xs sm:text-sm font-black text-slate-950 shadow-md hover:from-amber-400 hover:to-amber-500 transition active:scale-95"
                      >
                        <Lock className="h-4 w-4" />
                        <span>Lock In Secret Aura</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex h-36 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-800/30 p-4 text-center">
                    <EyeOff className="h-8 w-8 text-slate-500 mb-1" />
                    <span className="text-xs text-slate-400">Select an Aura from your inventory below</span>
                  </div>
                )}
              </div>

              {/* ============================================================== */}
              {/* CENTER: VS CLASH ICON (2 COLS) */}
              {/* ============================================================== */}
              <div className="md:col-span-2 flex flex-col items-center justify-center gap-2 my-2 md:my-0">
                <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-amber-400/60 bg-gradient-to-tr from-amber-600/40 via-purple-600/40 to-amber-400/40 shadow-xl shadow-amber-500/30">
                  <Swords className="h-8 w-8 text-amber-300" />
                </div>
                <span className="font-black text-xl tracking-wider text-amber-400">VS</span>
              </div>

              {/* ============================================================== */}
              {/* PLAYER 2 (OPPONENT / CHALLENGER) - 5 COLS */}
              {/* ============================================================== */}
              <div className="md:col-span-5 flex flex-col gap-4 rounded-3xl border border-rose-500/40 bg-gradient-to-b from-rose-950/30 to-slate-900/80 p-5 shadow-xl">
                <div className="flex items-center justify-between border-b border-rose-500/20 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-rose-400/40 bg-rose-500/20 text-rose-300 shadow-md">
                      <DynamicIcon name={opponentParticipant?.avatarIcon || 'dices'} className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-white">
                          {opponentParticipant?.name || 'Waiting for Challenger...'}
                        </span>
                      </div>
                      <div className="text-xs text-rose-300/80">
                        {opponentParticipant?.title || 'Awaiting connection'}
                      </div>
                    </div>
                  </div>

                  <div>
                    {opponentParticipant ? (
                      isOpponentLocked ? (
                        <span className="flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/20 px-2.5 py-1 text-xs font-bold text-emerald-300">
                          <Lock className="h-3 w-3" /> Locked
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/20 px-2.5 py-1 text-xs font-bold text-amber-300">
                          <Unlock className="h-3 w-3" /> Choosing...
                        </span>
                      )
                    ) : (
                      <span className="text-xs text-slate-400 font-mono">Code: {activeRoom.roomCode}</span>
                    )}
                  </div>
                </div>

                {/* OPPONENT'S MYSTERY BLIND CARD OR REVEALED AURA */}
                {opponentParticipant ? (
                  activeRoom.status === 'finished' && opponentParticipant.selectedAuraName ? (
                    // REVEALED OPPONENT AURA
                    <div
                      className="relative overflow-hidden rounded-2xl border p-4 transition-all shadow-lg flex flex-col gap-3 animate-in fade-in zoom-in"
                      style={{
                        borderColor: RARITIES[opponentParticipant.selectedAuraRarity || 'common']?.accentColor || '#f59e0b',
                        backgroundColor: `${RARITIES[opponentParticipant.selectedAuraRarity || 'common']?.accentColor || '#f59e0b'}15`,
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className="text-xs font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: `${RARITIES[opponentParticipant.selectedAuraRarity || 'common']?.accentColor || '#f59e0b'}30`,
                            color: RARITIES[opponentParticipant.selectedAuraRarity || 'common']?.accentColor || '#f59e0b',
                          }}
                        >
                          {opponentParticipant.selectedAuraRarity?.toUpperCase()}
                        </span>
                        <span className="text-xs font-mono text-slate-300">
                          Odds: {opponentParticipant.selectedAuraChance || '1 in 2'}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl shadow-md"
                          style={{
                            backgroundColor: `${RARITIES[opponentParticipant.selectedAuraRarity || 'common']?.accentColor || '#f59e0b'}30`,
                          }}
                        >
                          <Sparkles
                            className="h-8 w-8"
                            style={{ color: RARITIES[opponentParticipant.selectedAuraRarity || 'common']?.accentColor || '#f59e0b' }}
                          />
                        </div>
                        <div>
                          <div className="text-base sm:text-lg font-black text-white">
                            {opponentParticipant.selectedAuraName}
                          </div>
                          <div className="text-xs text-slate-300">
                            Rarity Rank: <strong className="text-amber-300">Tier {opponentParticipant.selectedAuraRank || 0}</strong>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // SECRET BLIND MYSTERY CARD BACK
                    <div className="relative flex h-36 flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-purple-500/50 bg-gradient-to-tr from-purple-950/80 via-slate-900 to-indigo-950/80 p-4 text-center shadow-lg">
                      <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-purple-500/20 blur-xl" />
                      <HelpCircle className="h-10 w-10 text-purple-400 mb-2 animate-bounce" />
                      <span className="text-sm font-black text-purple-200">
                        {isOpponentLocked ? 'Opponent Locked In! 🔒' : 'Opponent is Selecting Aura...'}
                      </span>
                      <span className="text-[11px] text-purple-300/70 mt-0.5">
                        Secret blind choice revealed upon showdown
                      </span>
                    </div>
                  )
                ) : (
                  <div className="flex h-36 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-800/30 p-4 text-center">
                    <Radio className="h-8 w-8 text-amber-400/80 animate-pulse mb-2" />
                    <span className="text-xs font-bold text-slate-300">Share Room Code: {activeRoom.roomCode}</span>
                    <button
                      onClick={handleCopyCode}
                      className="mt-2 rounded-lg bg-amber-500/20 px-3 py-1 text-xs font-bold text-amber-300 hover:bg-amber-500/30 transition"
                    >
                      {copiedCode ? 'Copied to Clipboard!' : 'Copy Code & Invite'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* QUICK BATTLE EMOTE BAR */}
            <div className="relative z-10 mt-6 flex flex-wrap items-center justify-center gap-2 border-t border-slate-800/80 pt-4">
              <span className="text-xs font-bold text-slate-400 mr-2">Quick Emote:</span>
              {BATTLE_EMOTES.map((em) => (
                <button
                  key={em}
                  onClick={() => handleSendEmote(em)}
                  className="rounded-xl border border-slate-700/80 bg-slate-800/60 px-3 py-1.5 text-sm hover:border-amber-400/60 hover:bg-slate-700 hover:scale-110 active:scale-95 transition"
                >
                  {em}
                </button>
              ))}
            </div>
          </div>

          {/* ============================================================== */}
          {/* 3. SHOWDOWN FINISHED OUTCOME MODAL / BANNER */}
          {/* ============================================================== */}
          {activeRoom.status === 'finished' && (
            <div className="relative overflow-hidden rounded-3xl border border-amber-400/50 bg-gradient-to-b from-slate-900 via-slate-950 to-black p-6 sm:p-8 shadow-2xl backdrop-blur-2xl animate-in zoom-in-95">
              {activeRoom.isDraw ? (
                <div className="flex flex-col items-center justify-center text-center gap-3">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-800 text-slate-300">
                    <Shield className="h-8 w-8 text-amber-400" />
                  </div>
                  <h2 className="text-2xl font-black text-white">STALEMATE / DRAW!</h2>
                  <p className="max-w-md text-xs sm:text-sm text-slate-300">
                    Both warriors chose Auras of identical power rank! No auras were transferred.
                  </p>
                </div>
              ) : activeRoom.winnerPlayerId === playerProfile.id ? (
                /* VICTORY OUTCOME */
                <div className="flex flex-col items-center justify-center text-center gap-4">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 text-slate-950 shadow-2xl shadow-amber-500/50 animate-bounce">
                    <Crown className="h-10 w-10 text-slate-950" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black text-amber-300">VICTORY! YOUR AURA PREVAILED!</h2>
                    <p className="text-sm text-slate-300">
                      Your chosen aura outranked your opponent's aura in cosmic rarity!
                    </p>
                  </div>

                  {activeRoom.transferredAuraName && (
                    <div className="flex items-center gap-3 rounded-2xl border border-amber-400/60 bg-amber-500/10 px-5 py-3 text-sm font-bold text-amber-200">
                      <Trophy className="h-5 w-5 text-amber-400" />
                      <span>
                        CLAIMED PRIZE: Loser's Best Aura <strong>{activeRoom.transferredAuraName}</strong> (
                        {activeRoom.transferredAuraRarity}) added to your inventory!
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                /* DEFEAT OUTCOME */
                <div className="flex flex-col items-center justify-center text-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40">
                    <Skull className="h-8 w-8 text-rose-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-black text-rose-400">DEFEAT! OPPONENT HAD RARER AURA</h2>
                    <p className="text-xs sm:text-sm text-slate-300">
                      Your opponent's aura had a higher rarity rank in the cosmic order.
                    </p>
                  </div>

                  {activeRoom.transferredAuraName && (
                    <div className="flex items-center gap-3 rounded-2xl border border-rose-500/40 bg-rose-500/10 px-5 py-3 text-xs sm:text-sm text-rose-200">
                      <AlertTriangle className="h-5 w-5 text-rose-400" />
                      <span>
                        Lost Aura: <strong>{activeRoom.transferredAuraName}</strong> was surrendered to the victor.
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* REMATCH / RETURN BUTTONS */}
              <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
                <button
                  onClick={handleLeaveRoom}
                  className="rounded-2xl border border-slate-700 bg-slate-800 px-6 py-3 text-xs sm:text-sm font-bold text-white hover:bg-slate-700 transition"
                >
                  Return to Duel Lobby
                </button>
                <button
                  onClick={handleCreateRoom}
                  className="rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-3 text-xs sm:text-sm font-black text-slate-950 shadow-lg hover:from-amber-400 hover:to-amber-500 transition"
                >
                  Host New Rematch
                </button>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* 4. INVENTORY AURA SELECTOR (WHEN SELECTING) */}
          {/* ============================================================== */}
          {!isMyTurnLocked && activeRoom.status === 'selecting' && (
            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl backdrop-blur-xl flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-400" />
                    <span>Select Secret Aura to Wager & Clash</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Pick your strongest aura from your inventory ({ownedItems.length} available)
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search auras..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="rounded-xl border border-slate-700 bg-slate-800/80 pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* GRID OF INVENTORY AURAS */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 max-h-80 overflow-y-auto pr-1">
                {filteredOwnedItems.map((itm) => {
                  const isSelected = selectedAura?.id === itm.id;
                  const isEquipped =
                    primaryEquippedItem?.id === itm.id ||
                    (gameState.equippedItemIds && gameState.equippedItemIds.includes(itm.id)) ||
                    gameState.equippedItemId === itm.id;
                  const rarityConfig = RARITIES[itm.rarity];
                  const rank = getRarityTierRank(itm.rarity);

                  return (
                    <button
                      key={itm.id}
                      onClick={() => {
                        sound.playButtonClick();
                        setSelectedAura(itm);
                      }}
                      className={`group relative flex flex-col items-start rounded-2xl border p-3 text-left transition-all ${
                        isSelected
                          ? 'border-amber-400 bg-amber-500/20 ring-2 ring-amber-400/50 scale-[1.02]'
                          : isEquipped
                          ? 'border-amber-500/50 bg-amber-950/20 hover:border-amber-400'
                          : 'border-slate-800 bg-slate-800/40 hover:border-slate-700 hover:bg-slate-800/80'
                      }`}
                      style={{
                        borderColor: isSelected ? '#f59e0b' : isEquipped ? '#eab308' : undefined,
                      }}
                    >
                      <div className="flex w-full items-center justify-between mb-1">
                        <span
                          className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded"
                          style={{
                            backgroundColor: `${rarityConfig?.accentColor || '#94a3b8'}25`,
                            color: rarityConfig?.accentColor || '#94a3b8',
                          }}
                        >
                          {itm.rarity}
                        </span>
                        {isEquipped ? (
                          <span className="text-[9px] font-black uppercase text-amber-300 bg-amber-500/30 px-1 rounded">
                            👑 EQUIPPED
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono text-slate-400">T{rank}</span>
                        )}
                      </div>

                      <div className="font-bold text-xs text-white line-clamp-1 group-hover:text-amber-300">
                        {itm.name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {rarityConfig?.oneInChance || '1 in 2'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const AuraDuelView = React.memo(AuraDuelViewComponent);
