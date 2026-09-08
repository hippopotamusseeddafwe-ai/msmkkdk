import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  TradeRoom,
  TradeParticipant,
  TradeOfferItem,
  TradeHistoryEntry,
  GameState,
  PlayerProfile,
  RarityTier,
  Item,
} from '../types';
import { ITEMS, ITEMS_BY_ID } from '../data/items';
import { RARITIES, getRarityTierRank } from '../data/rarities';
import { DynamicIcon } from './DynamicIcon';
import { AuraVisualizerCanvas } from './AuraVisualizerCanvas';
import { ErrorBoundary } from './ErrorBoundary';
import { sound } from '../utils/audio';
import { isFirebaseConfigured } from '../lib/firebase';
import {
  createOnlineTradeRoom,
  joinOnlineTradeRoom,
  subscribeToTradeRoom,
  updateTradeOffersInRoom,
  setTradeLockState,
  setTradeAcceptState,
  cancelOnlineTradeRoom,
  sendTradeEmote,
  calculateTradeValue,
  evaluateTradeBalance,
  AI_BOT_TRADERS,
  generateBotOffers,
  BotTraderConfig,
} from '../services/tradeService';
import {
  ArrowLeftRight,
  Lock,
  Unlock,
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
  Sparkles,
  Search,
  Copy,
  Check,
  Bot,
  Globe,
  History,
  ShieldCheck,
  Scale,
  Smile,
  AlertTriangle,
  RotateCcw,
  Package,
} from 'lucide-react';

interface AuraTradingViewProps {
  gameState: GameState;
  playerProfile: PlayerProfile;
  onTradeComplete: (
    givenItems: { id: string; count: number }[],
    receivedItems: { id: string; name: string; rarity: RarityTier; count: number }[],
    partnerName: string,
    partnerAvatar: string
  ) => void;
  onEquipItem?: (itemId: string) => void;
}

const AuraTradingViewComponent: React.FC<AuraTradingViewProps> = ({
  gameState,
  playerProfile,
  onTradeComplete,
}) => {
  // Navigation & subview
  const [activeSubTab, setActiveSubTab] = useState<'arena' | 'history'>('arena');

  // Trade room state
  const [currentRoom, setCurrentRoom] = useState<TradeRoom | null>(null);
  const [isHost, setIsHost] = useState(true);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Practice Bot Mode
  const [isBotMode, setIsBotMode] = useState(false);
  const [selectedBot, setSelectedBot] = useState<BotTraderConfig>(AI_BOT_TRADERS[0]);
  const [botParticipant, setBotParticipant] = useState<TradeParticipant | null>(null);

  // Local active offers (synced with Firestore or Bot)
  const [myOffers, setMyOffers] = useState<TradeOfferItem[]>([]);
  const [theirOffers, setTheirOffers] = useState<TradeOfferItem[]>([]);

  // Selection modal for adding auras
  const [showItemPicker, setShowItemPicker] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerRarityFilter, setPickerRarityFilter] = useState<string>('all');

  // Trade celebration modal
  const [completedTradeData, setCompletedTradeData] = useState<{
    partnerName: string;
    given: TradeOfferItem[];
    received: TradeOfferItem[];
  } | null>(null);

  // Quick Emotes popup
  const [showEmotePicker, setShowEmotePicker] = useState(false);
  const [floatingEmote, setFloatingEmote] = useState<{ text: string; sender: string } | null>(null);

  // Sound / effect trigger refs to avoid duplicate executions
  const processedTradeId = useRef<string | null>(null);

  // ----------------------------------------------------
  // Sync Real-Time Trade Room Subscription
  // ----------------------------------------------------
  useEffect(() => {
    if (!currentRoom || isBotMode) return;

    const unsubscribe = subscribeToTradeRoom(currentRoom.id, (updatedRoom) => {
      if (!updatedRoom) {
        setErrorMessage('The trade session was cancelled or closed.');
        setCurrentRoom(null);
        return;
      }

      setCurrentRoom(updatedRoom);

      const amHost = updatedRoom.host.playerId === playerProfile.id;
      setIsHost(amHost);

      const me = amHost ? updatedRoom.host : updatedRoom.guest;
      const them = amHost ? updatedRoom.guest : updatedRoom.host;

      if (me) {
        setMyOffers(me.offers || []);
      }
      if (them) {
        setTheirOffers(them.offers || []);
      } else {
        setTheirOffers([]);
      }

      // Emote notification
      if (updatedRoom.lastEmote && updatedRoom.lastEmotePlayer) {
        setFloatingEmote({
          text: updatedRoom.lastEmote,
          sender: updatedRoom.lastEmotePlayer,
        });
        setTimeout(() => setFloatingEmote(null), 3500);
      }

      // Completed trade execution
      if (
        updatedRoom.status === 'completed' &&
        processedTradeId.current !== updatedRoom.id
      ) {
        processedTradeId.current = updatedRoom.id;
        sound.playTradeSuccess();

        const given = (me?.offers || []).map((o) => ({ id: o.itemId, count: o.count || 1 }));
        const received = (them?.offers || []).map((o) => ({
          id: o.itemId,
          name: o.name,
          rarity: o.rarity,
          count: o.count || 1,
        }));

        onTradeComplete(
          given,
          received,
          them?.name || 'Trading Partner',
          them?.avatar || 'sparkles'
        );

        setCompletedTradeData({
          partnerName: them?.name || 'Partner',
          given: me?.offers || [],
          received: them?.offers || [],
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [currentRoom?.id, isBotMode, playerProfile.id, onTradeComplete]);

  // ----------------------------------------------------
  // Bot Mode Logic (Offline / Solo practice)
  // ----------------------------------------------------
  const botId = selectedBot.id;
  useEffect(() => {
    if (!isBotMode) return;

    // Initialize bot participant
    const bot: TradeParticipant = {
      playerId: selectedBot.id,
      name: selectedBot.name,
      avatar: selectedBot.avatar,
      title: selectedBot.title,
      offers: generateBotOffers(selectedBot, myOffers),
      isLocked: false,
      isAccepted: false,
    };
    setBotParticipant(bot);
    setTheirOffers(bot.offers);
  }, [isBotMode, botId]);

  // Update Bot responses when player modifies offers or locks
  const handleBotResponseAfterPlayerAction = (playerLocked: boolean) => {
    if (!isBotMode || !botParticipant) return;

    if (playerLocked) {
      // Bot evaluates fairness and locks in within 1 second
      setTimeout(() => {
        setBotParticipant((prev) => (prev ? { ...prev, isLocked: true } : null));
        sound.playTradeLock();
        setFloatingEmote({ text: '👍 Deal looks great!', sender: selectedBot.name });
        setTimeout(() => setFloatingEmote(null), 3000);
      }, 700);
    } else {
      setBotParticipant((prev) =>
        prev ? { ...prev, isLocked: false, isAccepted: false } : null
      );
    }
  };

  // ----------------------------------------------------
  // Handlers: Room Creation / Joining
  // ----------------------------------------------------
  const handleCreateRoom = async () => {
    try {
      setIsCreating(true);
      setErrorMessage(null);
      sound.playButtonClick();

      const newRoom = await createOnlineTradeRoom(playerProfile);
      setCurrentRoom(newRoom);
      setIsHost(true);
      setIsBotMode(false);
      setMyOffers([]);
      setTheirOffers([]);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create trade room.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinRoom = async (codeToJoin?: string) => {
    const code = (codeToJoin || joinCodeInput).trim().toUpperCase();
    if (!code) {
      setErrorMessage('Please enter a valid 6-character trade room code.');
      return;
    }

    try {
      setIsJoining(true);
      setErrorMessage(null);
      sound.playButtonClick();

      const joined = await joinOnlineTradeRoom(code, playerProfile);
      if (!joined) {
        setErrorMessage('Trade room not found. Check the code and try again.');
        return;
      }

      setCurrentRoom(joined);
      setIsHost(joined.host.playerId === playerProfile.id);
      setIsBotMode(false);
      setJoinCodeInput('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to join trade room.');
    } finally {
      setIsJoining(false);
    }
  };

  const handleStartBotPractice = (bot: BotTraderConfig) => {
    sound.playButtonClick();
    setSelectedBot(bot);
    setIsBotMode(true);
    setCurrentRoom({
      id: `bot_room_${Date.now()}`,
      roomCode: 'BOT-TRAIN',
      status: 'trading',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      host: {
        playerId: playerProfile.id,
        name: playerProfile.name,
        avatar: playerProfile.avatarIcon,
        title: playerProfile.title,
        offers: [],
        isLocked: false,
        isAccepted: false,
      },
      guest: {
        playerId: bot.id,
        name: bot.name,
        avatar: bot.avatar,
        title: bot.title,
        offers: generateBotOffers(bot, []),
        isLocked: false,
        isAccepted: false,
      },
    });
    setMyOffers([]);
    setTheirOffers(generateBotOffers(bot, []));
  };

  const handleLeaveRoom = () => {
    sound.playButtonClick();
    if (currentRoom && !isBotMode) {
      cancelOnlineTradeRoom(currentRoom.id);
    }
    setCurrentRoom(null);
    setIsBotMode(false);
    setMyOffers([]);
    setTheirOffers([]);
    setErrorMessage(null);
  };

  // ----------------------------------------------------
  // Offer Modifications
  // ----------------------------------------------------
  const handleAddOfferItem = (item: Item) => {
    if (myOffers.length >= 6) {
      setErrorMessage('Trade offer full (max 6 items per trade).');
      return;
    }

    // Check inventory availability
    const invSlot = gameState.inventory[item.id];
    const alreadyOfferedCount = myOffers
      .filter((o) => o.itemId === item.id)
      .reduce((sum, o) => sum + o.count, 0);

    if (!invSlot || invSlot.count <= alreadyOfferedCount) {
      setErrorMessage(`You do not have more copies of ${item.name} to trade.`);
      return;
    }

    sound.playButtonClick();

    const existingIdx = myOffers.findIndex((o) => o.itemId === item.id);
    let updatedOffers: TradeOfferItem[] = [];

    if (existingIdx >= 0) {
      updatedOffers = myOffers.map((o, idx) =>
        idx === existingIdx ? { ...o, count: o.count + 1 } : o
      );
    } else {
      const newOffer: TradeOfferItem = {
        itemId: item.id,
        name: item.name,
        rarity: item.rarity,
        chance: RARITIES[item.rarity]?.oneInChance || '1 in 100',
        count: 1,
        luckBonus: item.luckBonus,
        addedAt: Date.now(),
      };
      updatedOffers = [...myOffers, newOffer];
    }

    setMyOffers(updatedOffers);
    setShowItemPicker(false);

    if (currentRoom && !isBotMode) {
      updateTradeOffersInRoom(currentRoom.id, isHost, updatedOffers);
    } else if (isBotMode) {
      handleBotResponseAfterPlayerAction(false);
    }
  };

  const handleRemoveOfferItem = (itemId: string) => {
    sound.playButtonClick();
    const existing = myOffers.find((o) => o.itemId === itemId);
    if (!existing) return;

    let updatedOffers: TradeOfferItem[] = [];
    if (existing.count > 1) {
      updatedOffers = myOffers.map((o) =>
        o.itemId === itemId ? { ...o, count: o.count - 1 } : o
      );
    } else {
      updatedOffers = myOffers.filter((o) => o.itemId !== itemId);
    }

    setMyOffers(updatedOffers);

    if (currentRoom && !isBotMode) {
      updateTradeOffersInRoom(currentRoom.id, isHost, updatedOffers);
    } else if (isBotMode) {
      handleBotResponseAfterPlayerAction(false);
    }
  };

  // ----------------------------------------------------
  // Confirmation Steps: Step 1 (Lock) & Step 2 (Accept)
  // ----------------------------------------------------
  const myParticipant = useMemo(() => {
    if (!currentRoom) return null;
    if (isBotMode) {
      return {
        isLocked: currentRoom.host.isLocked,
        isAccepted: currentRoom.host.isAccepted,
      };
    }
    return isHost ? currentRoom.host : currentRoom.guest;
  }, [currentRoom, isHost, isBotMode]);

  const theirParticipant = useMemo(() => {
    if (!currentRoom) return null;
    if (isBotMode) {
      return botParticipant;
    }
    return isHost ? currentRoom.guest : currentRoom.host;
  }, [currentRoom, isHost, isBotMode, botParticipant]);

  const handleToggleLock = () => {
    if (!currentRoom || !myParticipant) return;
    const nextLocked = !myParticipant.isLocked;
    sound.playTradeLock();

    if (isBotMode) {
      setCurrentRoom((prev) =>
        prev
          ? {
              ...prev,
              host: {
                ...prev.host,
                isLocked: nextLocked,
                isAccepted: nextLocked ? prev.host.isAccepted : false,
              },
            }
          : null
      );
      handleBotResponseAfterPlayerAction(nextLocked);
    } else {
      setTradeLockState(currentRoom.id, isHost, nextLocked);
    }
  };

  const handleToggleAccept = () => {
    if (!currentRoom || !myParticipant || !theirParticipant) return;
    if (!myParticipant.isLocked || !theirParticipant.isLocked) {
      setErrorMessage('Both players must lock in their offers before accepting.');
      return;
    }

    const nextAccepted = !myParticipant.isAccepted;
    sound.playButtonClick();

    if (isBotMode) {
      setCurrentRoom((prev) =>
        prev
          ? {
              ...prev,
              host: { ...prev.host, isAccepted: nextAccepted },
            }
          : null
      );

      // Bot automatically accepts after 600ms
      if (nextAccepted) {
        setTimeout(() => {
          setBotParticipant((prev) => (prev ? { ...prev, isAccepted: true } : null));
          sound.playTradeSuccess();

          const given = myOffers.map((o) => ({ id: o.itemId, count: o.count || 1 }));
          const received = theirOffers.map((o) => ({
            id: o.itemId,
            name: o.name,
            rarity: o.rarity,
            count: o.count || 1,
          }));

          onTradeComplete(given, received, selectedBot.name, selectedBot.avatar);
          setCompletedTradeData({
            partnerName: selectedBot.name,
            given: myOffers,
            received: theirOffers,
          });
        }, 800);
      }
    } else {
      setTradeAcceptState(currentRoom.id, isHost, nextAccepted);
    }
  };

  const handleSendEmote = (emote: string) => {
    sound.playButtonClick();
    setShowEmotePicker(false);
    if (currentRoom && !isBotMode) {
      sendTradeEmote(currentRoom.id, playerProfile.name, emote);
    } else {
      setFloatingEmote({ text: emote, sender: 'You' });
      setTimeout(() => setFloatingEmote(null), 3000);
    }
  };

  // Equipped items resolution
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

  // ----------------------------------------------------
  // Valuation & Balance Meter
  // ----------------------------------------------------
  const myValue = useMemo(() => calculateTradeValue(myOffers), [myOffers]);
  const theirValue = useMemo(() => calculateTradeValue(theirOffers), [theirOffers]);
  const tradeBalance = useMemo(
    () => evaluateTradeBalance(myOffers, theirOffers),
    [myOffers, theirOffers]
  );

  // Available inventory items for picker
  const availableInventoryItems = useMemo(() => {
    const invItems: { item: Item; availableCount: number; isEquipped: boolean }[] = [];
    const invKeys = Object.keys(gameState.inventory);

    invKeys.forEach((k) => {
      const itm = ITEMS_BY_ID[k];
      const slot = gameState.inventory[k];
      if (itm && slot && slot.count > 0) {
        const alreadyOffered = myOffers
          .filter((o) => o.itemId === itm.id)
          .reduce((sum, o) => sum + o.count, 0);
        const rem = slot.count - alreadyOffered;
        if (rem > 0) {
          const isEquipped =
            primaryEquippedItem?.id === itm.id ||
            (gameState.equippedItemIds && gameState.equippedItemIds.includes(itm.id)) ||
            gameState.equippedItemId === itm.id;
          invItems.push({ item: itm, availableCount: rem, isEquipped });
        }
      }
    });

    // Sort: highest rarity first, then equipped items on top
    invItems.sort((a, b) => {
      if (a.isEquipped && !b.isEquipped) return -1;
      if (!a.isEquipped && b.isEquipped) return 1;
      return getRarityTierRank(b.item.rarity) - getRarityTierRank(a.item.rarity);
    });

    return invItems.filter(({ item }) => {
      const matchesSearch =
        pickerSearch.trim() === '' ||
        item.name.toLowerCase().includes(pickerSearch.toLowerCase()) ||
        item.rarity.toLowerCase().includes(pickerSearch.toLowerCase());
      const matchesRarity =
        pickerRarityFilter === 'all' || item.rarity === pickerRarityFilter;
      return matchesSearch && matchesRarity;
    });
  }, [gameState.inventory, myOffers, pickerSearch, pickerRarityFilter, primaryEquippedItem, equippedIdsKey]);

  return (
    <ErrorBoundary>
      <div className="w-full max-w-7xl mx-auto space-y-4 sm:space-y-6 pb-12">
        {/* Floating Emote Notification */}
        {floatingEmote && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-bounce pointer-events-none">
            <div className="flex items-center gap-2 rounded-2xl bg-neutral-900/95 border border-purple-500/50 px-4 py-2 text-white shadow-2xl backdrop-blur-md">
              <span className="text-xl">{floatingEmote.text}</span>
              <span className="text-xs font-bold text-purple-300">
                {floatingEmote.sender}
              </span>
            </div>
          </div>
        )}

        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl bg-neutral-900/80 border border-purple-500/30 p-4 sm:p-5 backdrop-blur-md shadow-xl">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-600/20 border border-purple-500/40 text-purple-400">
              <ArrowLeftRight className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                Aura Trading Hub 🤝
              </h2>
              <p className="text-xs sm:text-sm text-neutral-400">
                Trade duplicate auras securely with players worldwide or practice with merchants.
              </p>
            </div>
          </div>

          {/* Sub Navigation */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              id="trade-tab-arena"
              onClick={() => {
                sound.playButtonClick();
                setActiveSubTab('arena');
              }}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold min-h-[44px] transition ${
                activeSubTab === 'arena'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                  : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
              }`}
            >
              <ArrowLeftRight className="h-4 w-4" />
              <span>Trading Arena</span>
            </button>

            <button
              id="trade-tab-history"
              onClick={() => {
                sound.playButtonClick();
                setActiveSubTab('history');
              }}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold min-h-[44px] transition ${
                activeSubTab === 'history'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                  : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
              }`}
            >
              <History className="h-4 w-4" />
              <span>Trade Logs</span>
              {gameState.tradeHistory && gameState.tradeHistory.length > 0 && (
                <span className="ml-1 rounded-full bg-purple-500/40 px-1.5 py-0.2 text-[10px] text-purple-200">
                  {gameState.tradeHistory.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Error Banner */}
        {errorMessage && (
          <div className="flex items-center justify-between gap-2 rounded-xl bg-red-950/80 border border-red-500/40 p-3.5 text-sm text-red-200 animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-red-400 hover:text-white p-1"
            >
              ✕
            </button>
          </div>
        )}

        {/* MAIN VIEW: ARENA */}
        {activeSubTab === 'arena' && (
          <>
            {!currentRoom ? (
              /* LOBBY / ROOM JOIN & CREATE VIEW */
              <div className="space-y-4 sm:space-y-6">
                {/* PLAYER EQUIPPED AURA HERO SHOWCASE BANNER */}
                <div className="relative overflow-hidden rounded-3xl border border-purple-500/40 bg-gradient-to-r from-neutral-900/90 via-purple-950/40 to-neutral-900/95 p-5 sm:p-6 shadow-2xl backdrop-blur-xl">
                  <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-purple-500/10 blur-2xl" />
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
                    {/* Profile details */}
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-purple-400/40 bg-purple-500/20 text-purple-300 shadow-lg shadow-purple-500/20">
                        <DynamicIcon name={playerProfile.avatarIcon || 'dices'} className="h-7 w-7" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg sm:text-xl font-black text-white">{playerProfile.name}</span>
                          <span className="rounded-full bg-purple-500/20 border border-purple-400/30 px-2 py-0.5 text-[10px] font-bold text-purple-300">
                            Trader Profile
                          </span>
                        </div>
                        <div className="text-xs text-purple-300/80 font-medium">{playerProfile.title}</div>
                        <div className="text-[11px] text-neutral-400 mt-0.5">
                          Tradable Auras: <strong className="text-white">{availableInventoryItems.length}</strong> available • Completed Trades:{' '}
                          <strong className="text-white">{gameState.stats.totalTradesCompleted || 0}</strong>
                        </div>
                      </div>
                    </div>

                    {/* Equipped Aura Showcase Card */}
                    <div className="flex items-center gap-4 rounded-2xl border border-neutral-700/80 bg-neutral-800/70 p-3 sm:px-4 sm:py-3 backdrop-blur-md">
                      {primaryEquippedItem ? (
                        <>
                          <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-black/50 overflow-hidden border border-purple-400/30">
                            <AuraVisualizerCanvas item={primaryEquippedItem} size={64} className="scale-125" />
                          </div>
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-purple-500/30 text-purple-300 border border-purple-500/40">
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
                            <span className="text-[11px] text-neutral-300 font-mono">
                              Tier {getRarityTierRank(primaryEquippedItem.rarity)} • +{primaryEquippedItem.luckBonus || 1}x Luck Bonus
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-700/50 text-neutral-400">
                            <Package className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-neutral-300">No Aura Equipped</div>
                            <div className="text-[10px] text-neutral-400">Select an aura in Inventory to equip</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                {/* 1. Host or Join Online Trade */}
                <div className="flex flex-col justify-between rounded-2xl bg-neutral-900/80 border border-purple-500/20 p-5 sm:p-6 backdrop-blur-md shadow-xl">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400">
                        <Globe className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white">Online Multiplayer Trade</h3>
                        <p className="text-xs text-neutral-400">
                          Create a secure room or enter a friend's room code.
                        </p>
                      </div>
                    </div>

                    {/* Create Room Button */}
                    <button
                      id="create-trade-room-btn"
                      onClick={handleCreateRoom}
                      disabled={isCreating}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-3.5 text-sm sm:text-base font-extrabold text-white shadow-lg shadow-purple-600/25 transition hover:brightness-110 active:scale-98 min-h-[48px]"
                    >
                      <Plus className="h-5 w-5" />
                      <span>{isCreating ? 'Creating Room...' : 'Create Trade Room'}</span>
                    </button>

                    <div className="relative flex items-center justify-center py-2">
                      <div className="w-full border-t border-neutral-800" />
                      <span className="absolute bg-neutral-900 px-3 text-xs font-semibold text-neutral-500 uppercase">
                        or enter room code
                      </span>
                    </div>

                    {/* Join Code Input */}
                    <div className="flex gap-2">
                      <input
                        id="trade-room-code-input"
                        type="text"
                        placeholder="e.g. TR-A842"
                        value={joinCodeInput}
                        onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                        onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
                        maxLength={12}
                        className="flex-1 rounded-xl bg-neutral-800/80 border border-neutral-700 px-4 py-2.5 text-sm sm:text-base font-mono text-white placeholder-neutral-500 focus:border-purple-500 focus:outline-none min-h-[44px]"
                      />
                      <button
                        id="join-trade-room-btn"
                        onClick={() => handleJoinRoom()}
                        disabled={isJoining || !joinCodeInput.trim()}
                        className="flex items-center justify-center gap-1.5 rounded-xl bg-neutral-800 border border-purple-500/40 px-5 py-2.5 text-sm font-bold text-purple-300 transition hover:bg-purple-600 hover:text-white disabled:opacity-50 min-h-[44px]"
                      >
                        <ArrowLeftRight className="h-4 w-4" />
                        <span>{isJoining ? 'Joining...' : 'Join'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="mt-6 flex items-center gap-2 rounded-xl bg-purple-950/30 border border-purple-500/20 p-3 text-xs text-purple-300">
                    <ShieldCheck className="h-4 w-4 text-purple-400 flex-shrink-0" />
                    <span>2-Step Confirmation protects your items from stealth swaps.</span>
                  </div>
                </div>

                {/* 2. Practice Trade Bot Merchants */}
                <div className="flex flex-col justify-between rounded-2xl bg-neutral-900/80 border border-neutral-800 p-5 sm:p-6 backdrop-blur-md shadow-xl">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                        <Bot className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white">Merchant Practice Mode</h3>
                        <p className="text-xs text-neutral-400">
                          Trade anytime offline or practice with AI appraiser merchants.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      {AI_BOT_TRADERS.map((bot) => (
                        <div
                          key={bot.id}
                          className="flex items-center justify-between rounded-xl bg-neutral-800/60 border border-neutral-700/60 p-3 transition hover:border-purple-500/50"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-purple-600/20 text-purple-300">
                              <DynamicIcon name={bot.avatar} className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-sm font-bold text-white truncate">{bot.name}</h4>
                              <p className="text-[11px] text-neutral-400 truncate">{bot.personality}</p>
                            </div>
                          </div>

                          <button
                            onClick={() => handleStartBotPractice(bot)}
                            className="flex-shrink-0 rounded-xl bg-purple-600/20 border border-purple-500/40 px-3.5 py-2 text-xs font-bold text-purple-200 transition hover:bg-purple-600 hover:text-white min-h-[40px]"
                          >
                            Trade
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <p className="mt-4 text-[11px] text-neutral-500 text-center">
                    Practice trades grant real inventory item swaps and unlock new Dex entries!
                  </p>
                </div>
              </div>
            </div>
            ) : (
              /* ACTIVE TRADING TABLE / ARENA */
              <div className="space-y-4 sm:space-y-6">
                {/* Room Status Topbar */}
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-neutral-900/90 border border-purple-500/30 p-3 sm:p-4 backdrop-blur-md shadow-xl">
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={handleLeaveRoom}
                      className="flex items-center gap-1.5 rounded-xl bg-neutral-800 px-3 py-2 text-xs font-bold text-neutral-300 hover:bg-red-950 hover:text-red-300 transition min-h-[40px]"
                    >
                      <XCircle className="h-4 w-4" />
                      <span>Leave Room</span>
                    </button>

                    {/* Room Code Badge */}
                    <div className="flex items-center gap-2 rounded-xl bg-purple-950/60 border border-purple-500/40 px-3 py-1.5">
                      <span className="text-xs text-purple-300">Room:</span>
                      <span className="font-mono text-sm font-bold text-white tracking-wide">
                        {currentRoom.roomCode}
                      </span>
                      {!isBotMode && (
                        <button
                          onClick={() => {
                            navigator.clipboard?.writeText(currentRoom.roomCode);
                            setCopiedCode(true);
                            sound.playButtonClick();
                            setTimeout(() => setCopiedCode(false), 2000);
                          }}
                          className="text-purple-300 hover:text-white p-1"
                          title="Copy Room Code"
                        >
                          {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                      )}
                    </div>

                    {isBotMode && (
                      <span className="rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-0.5 text-xs font-bold text-emerald-300 flex items-center gap-1">
                        <Bot className="h-3 w-3" /> Practice Bot
                      </span>
                    )}
                  </div>

                  {/* Quick Emote Trigger */}
                  <div className="relative">
                    <button
                      onClick={() => setShowEmotePicker((prev) => !prev)}
                      className="flex items-center gap-1.5 rounded-xl bg-neutral-800 border border-neutral-700 px-3 py-2 text-xs font-bold text-neutral-200 hover:bg-neutral-700 transition min-h-[40px]"
                    >
                      <Smile className="h-4 w-4 text-yellow-400" />
                      <span>Emotes</span>
                    </button>

                    {showEmotePicker && (
                      <div className="absolute right-0 top-12 z-40 flex flex-wrap gap-1.5 rounded-2xl bg-neutral-900 border border-purple-500/40 p-2 shadow-2xl w-48 backdrop-blur-md">
                        {['👍 Deal!', '⚖️ Fair trade', '⚡ Add more', '✨ Rare!', '🔥 Awesome', '❤️ Thanks!'].map((em) => (
                          <button
                            key={em}
                            onClick={() => handleSendEmote(em)}
                            className="w-full text-left rounded-lg px-2.5 py-1.5 text-xs text-neutral-200 hover:bg-purple-600 hover:text-white transition font-medium"
                          >
                            {em}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* ⚖️ Fair Trade Balance Scale Indicator */}
                <div className="rounded-2xl bg-neutral-900/80 border border-neutral-800 p-3 sm:p-4 backdrop-blur-md shadow-lg">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Scale className="h-5 w-5 text-purple-400" />
                      <span className="text-xs sm:text-sm font-bold text-neutral-300">
                        Trade Valuation Meter:
                      </span>
                      <span
                        className="text-xs sm:text-sm font-extrabold px-2.5 py-0.5 rounded-full"
                        style={{
                          backgroundColor: `${tradeBalance.color}20`,
                          color: tradeBalance.color,
                        }}
                      >
                        {tradeBalance.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-neutral-400">
                      <span>Your Offer Power: <b className="text-purple-300">{myValue.totalRankScore}</b></span>
                      <span>Partner Offer Power: <b className="text-indigo-300">{theirValue.totalRankScore}</b></span>
                    </div>
                  </div>
                </div>

                {/* DUAL TRADE OFFER TERMINALS (Responsive: Stack on Mobile, 2-Col on Tablet/Desktop) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  {/* LEFT: YOUR OFFER */}
                  <div
                    className={`flex flex-col justify-between rounded-2xl border p-4 sm:p-5 backdrop-blur-md shadow-xl transition-all ${
                      myParticipant?.isLocked
                        ? 'bg-neutral-900/90 border-emerald-500/50 shadow-emerald-500/10'
                        : 'bg-neutral-900/80 border-purple-500/30'
                    }`}
                  >
                    <div>
                      {/* Player Profile Bar */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600/20 text-purple-300">
                            <DynamicIcon name={playerProfile.avatarIcon} className="h-5 w-5" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                              {playerProfile.name} (You)
                            </h4>
                            <span className="text-[11px] text-neutral-400">{playerProfile.title}</span>
                            {primaryEquippedItem && (
                              <div className="mt-1 flex items-center gap-1 text-[10px] text-purple-300 font-semibold bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                                <span>👑 Equipped: {primaryEquippedItem.name}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Status Chip */}
                        <div className="flex items-center gap-1.5">
                          {myParticipant?.isAccepted ? (
                            <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-500/50 px-2.5 py-1 text-xs font-bold text-emerald-300">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Accepted
                            </span>
                          ) : myParticipant?.isLocked ? (
                            <span className="flex items-center gap-1 rounded-full bg-blue-500/20 border border-blue-500/50 px-2.5 py-1 text-xs font-bold text-blue-300">
                              <Lock className="h-3.5 w-3.5" /> Locked
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 rounded-full bg-neutral-800 border border-neutral-700 px-2.5 py-1 text-xs font-bold text-neutral-400">
                              <Unlock className="h-3.5 w-3.5" /> Editing...
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 6-Slot Offer Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 min-h-[220px]">
                        {Array.from({ length: 6 }).map((_, slotIdx) => {
                          const offerItem = myOffers[slotIdx];
                          if (offerItem) {
                            const config = RARITIES[offerItem.rarity] || RARITIES.common;
                            return (
                              <div
                                key={`${offerItem.itemId}_${slotIdx}`}
                                className="group relative flex flex-col justify-between rounded-xl border p-2.5 transition shadow-md"
                                style={{
                                  borderColor: config.accentColor || '#a855f7',
                                  backgroundColor: `${config.accentColor || '#a855f7'}12`,
                                }}
                              >
                                <div className="flex items-center justify-between">
                                  <span
                                    className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded"
                                    style={{
                                      backgroundColor: `${config.accentColor || '#a855f7'}30`,
                                      color: config.accentColor || '#a855f7',
                                    }}
                                  >
                                    {offerItem.rarity}
                                  </span>
                                  {offerItem.count > 1 && (
                                    <span className="text-xs font-black text-white bg-black/60 px-1.5 rounded">
                                      x{offerItem.count}
                                    </span>
                                  )}
                                </div>

                                <div className="my-1 flex items-center justify-center">
                                  <AuraVisualizerCanvas
                                    item={ITEMS_BY_ID[offerItem.itemId] || {
                                      id: offerItem.itemId,
                                      name: offerItem.name,
                                      rarity: offerItem.rarity,
                                      lore: '',
                                      baseValue: 10,
                                      essenceValue: 5,
                                      luckBonus: offerItem.luckBonus || 1,
                                      icon: 'Sparkles',
                                      auraType: 'sparkle',
                                      flavorTitle: '',
                                    }}
                                    size={52}
                                  />
                                </div>

                                <div className="text-center">
                                  <div className="text-xs font-bold text-white truncate">
                                    {offerItem.name}
                                  </div>
                                  <div className="text-[10px] text-neutral-400">
                                    {offerItem.chance.startsWith('1 in') ? offerItem.chance : `1 in ${offerItem.chance}`}
                                  </div>
                                </div>

                                {!myParticipant?.isLocked && (
                                  <button
                                    onClick={() => handleRemoveOfferItem(offerItem.itemId)}
                                    className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-white shadow-md hover:bg-red-500 transition"
                                    title="Remove from trade"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                            );
                          }

                          return (
                            <button
                              key={`empty_slot_${slotIdx}`}
                              disabled={myParticipant?.isLocked}
                              onClick={() => {
                                sound.playButtonClick();
                                setShowItemPicker(true);
                              }}
                              className={`flex flex-col items-center justify-center rounded-xl border border-dashed p-3 transition min-h-[100px] ${
                                myParticipant?.isLocked
                                  ? 'border-neutral-800 bg-neutral-900/40 opacity-40 cursor-not-allowed'
                                  : 'border-neutral-700 bg-neutral-900/40 hover:border-purple-500 hover:bg-purple-950/20 active:scale-95'
                              }`}
                            >
                              <Plus className="h-5 w-5 text-neutral-500 mb-1" />
                              <span className="text-[11px] font-semibold text-neutral-400">
                                Add Aura
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Add Aura Action Button */}
                    <div className="mt-4 pt-3 border-t border-neutral-800">
                      <button
                        onClick={() => {
                          sound.playButtonClick();
                          setShowItemPicker(true);
                        }}
                        disabled={myParticipant?.isLocked || myOffers.length >= 6}
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-neutral-800 border border-purple-500/40 px-4 py-2.5 text-xs sm:text-sm font-bold text-purple-200 transition hover:bg-purple-600 hover:text-white disabled:opacity-40 min-h-[44px]"
                      >
                        <Package className="h-4 w-4" />
                        <span>Select From Inventory ({myOffers.length}/6)</span>
                      </button>
                    </div>
                  </div>

                  {/* RIGHT: PARTNER'S OFFER */}
                  <div
                    className={`flex flex-col justify-between rounded-2xl border p-4 sm:p-5 backdrop-blur-md shadow-xl transition-all ${
                      theirParticipant?.isLocked
                        ? 'bg-neutral-900/90 border-emerald-500/50 shadow-emerald-500/10'
                        : 'bg-neutral-900/80 border-indigo-500/30'
                    }`}
                  >
                    <div>
                      {/* Partner Profile Bar */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-300">
                            <DynamicIcon
                              name={theirParticipant?.avatar || 'dices'}
                              className="h-5 w-5"
                            />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                              {theirParticipant ? theirParticipant.name : 'Waiting for Trader...'}
                            </h4>
                            <span className="text-[11px] text-neutral-400">
                              {theirParticipant ? theirParticipant.title : 'Invite a friend with code'}
                            </span>
                          </div>
                        </div>

                        {/* Partner Status */}
                        <div className="flex items-center gap-1.5">
                          {theirParticipant?.isAccepted ? (
                            <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-500/50 px-2.5 py-1 text-xs font-bold text-emerald-300">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Accepted
                            </span>
                          ) : theirParticipant?.isLocked ? (
                            <span className="flex items-center gap-1 rounded-full bg-blue-500/20 border border-blue-500/50 px-2.5 py-1 text-xs font-bold text-blue-300">
                              <Lock className="h-3.5 w-3.5" /> Locked
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 rounded-full bg-neutral-800 border border-neutral-700 px-2.5 py-1 text-xs font-bold text-neutral-400">
                              <Unlock className="h-3.5 w-3.5" /> Deciding...
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Partner 6-Slot Offer Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 min-h-[220px]">
                        {Array.from({ length: 6 }).map((_, slotIdx) => {
                          const offerItem = theirOffers[slotIdx];
                          if (offerItem) {
                            const config = RARITIES[offerItem.rarity] || RARITIES.common;
                            return (
                              <div
                                key={`partner_${offerItem.itemId}_${slotIdx}`}
                                className="flex flex-col justify-between rounded-xl border p-2.5 transition shadow-md"
                                style={{
                                  borderColor: config.accentColor || '#6366f1',
                                  backgroundColor: `${config.accentColor || '#6366f1'}12`,
                                }}
                              >
                                <div className="flex items-center justify-between">
                                  <span
                                    className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded"
                                    style={{
                                      backgroundColor: `${config.accentColor || '#6366f1'}30`,
                                      color: config.accentColor || '#6366f1',
                                    }}
                                  >
                                    {offerItem.rarity}
                                  </span>
                                  {offerItem.count > 1 && (
                                    <span className="text-xs font-black text-white bg-black/60 px-1.5 rounded">
                                      x{offerItem.count}
                                    </span>
                                  )}
                                </div>

                                <div className="my-1 flex items-center justify-center">
                                  <AuraVisualizerCanvas
                                    item={ITEMS_BY_ID[offerItem.itemId] || {
                                      id: offerItem.itemId,
                                      name: offerItem.name,
                                      rarity: offerItem.rarity,
                                      lore: '',
                                      baseValue: 10,
                                      essenceValue: 5,
                                      luckBonus: offerItem.luckBonus || 1,
                                      icon: 'Sparkles',
                                      auraType: 'sparkle',
                                      flavorTitle: '',
                                    }}
                                    size={52}
                                  />
                                </div>

                                <div className="text-center">
                                  <div className="text-xs font-bold text-white truncate">
                                    {offerItem.name}
                                  </div>
                                  <div className="text-[10px] text-neutral-400">
                                    {offerItem.chance.startsWith('1 in') ? offerItem.chance : `1 in ${offerItem.chance}`}
                                  </div>
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div
                              key={`partner_empty_${slotIdx}`}
                              className="flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-800 bg-neutral-900/30 p-3 min-h-[100px] text-neutral-600"
                            >
                              <Package className="h-5 w-5 mb-1 opacity-30" />
                              <span className="text-[10px]">Empty Slot</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-neutral-800 text-center">
                      <span className="text-xs text-neutral-400">
                        {theirOffers.length === 0
                          ? 'Waiting for partner to add auras...'
                          : `${theirOffers.length} aura(s) offered by partner`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 🔒 2-STEP CONFIRMATION CONTROLS (Big touch targets for Phone & Tablet) */}
                <div className="rounded-2xl bg-neutral-900/90 border border-purple-500/30 p-4 sm:p-5 backdrop-blur-md shadow-2xl">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    {/* STEP 1: Lock in Offer */}
                    <button
                      id="trade-step1-lock-btn"
                      onClick={handleToggleLock}
                      className={`flex items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm sm:text-base font-extrabold transition shadow-lg min-h-[50px] ${
                        myParticipant?.isLocked
                          ? 'bg-neutral-800 border border-neutral-700 text-neutral-300 hover:bg-neutral-700'
                          : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-blue-600/30 hover:brightness-110 active:scale-98'
                      }`}
                    >
                      {myParticipant?.isLocked ? (
                        <>
                          <Unlock className="h-5 w-5 text-neutral-400" />
                          <span>Unlock Offer (Allow Edits)</span>
                        </>
                      ) : (
                        <>
                          <Lock className="h-5 w-5" />
                          <span>Step 1: Lock In Offer</span>
                        </>
                      )}
                    </button>

                    {/* STEP 2: Final Accept Trade */}
                    <button
                      id="trade-step2-accept-btn"
                      onClick={handleToggleAccept}
                      disabled={!myParticipant?.isLocked || !theirParticipant?.isLocked}
                      className={`flex items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm sm:text-base font-extrabold transition shadow-lg min-h-[50px] ${
                        myParticipant?.isAccepted
                          ? 'bg-emerald-700 text-white border border-emerald-500/50'
                          : myParticipant?.isLocked && theirParticipant?.isLocked
                          ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-emerald-600/30 hover:brightness-110 active:scale-98 animate-pulse'
                          : 'bg-neutral-800 border border-neutral-700 text-neutral-500 cursor-not-allowed opacity-60'
                      }`}
                    >
                      <CheckCircle2 className="h-5 w-5" />
                      <span>
                        {myParticipant?.isAccepted
                          ? 'Trade Accepted! Waiting on Partner...'
                          : 'Step 2: Confirm & Accept Trade'}
                      </span>
                    </button>
                  </div>

                  {(!myParticipant?.isLocked || !theirParticipant?.isLocked) && (
                    <p className="mt-2 text-center text-xs text-neutral-400">
                      ℹ️ Both traders must click <b>Lock In Offer</b> before the final Accept button becomes active.
                    </p>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* SUB VIEW: HISTORY LOGS */}
        {activeSubTab === 'history' && (
          <div className="rounded-2xl bg-neutral-900/80 border border-neutral-800 p-5 sm:p-6 backdrop-blur-md shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <History className="h-5 w-5 text-purple-400" />
                Completed Trade History
              </h3>
              <span className="text-xs text-neutral-400">
                Total Trades: {gameState.stats.totalTradesCompleted || 0}
              </span>
            </div>

            {(!gameState.tradeHistory || gameState.tradeHistory.length === 0) ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Package className="h-12 w-12 text-neutral-600 mb-2" />
                <p className="text-sm font-semibold text-neutral-300">No past trades found.</p>
                <p className="text-xs text-neutral-500 mt-1">
                  Completed trades with other players or merchants will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {gameState.tradeHistory.map((trade) => (
                  <div
                    key={trade.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl bg-neutral-800/60 border border-neutral-700/60 p-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">
                          Traded with {trade.partnerName}
                        </span>
                        <span className="text-[11px] text-neutral-400">
                          {new Date(trade.timestamp).toLocaleDateString()}
                        </span>
                      </div>

                      {/* Items swapped */}
                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        <div className="flex items-center gap-1 text-red-300">
                          <span>Gave:</span>
                          {trade.givenItems.map((g, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded bg-red-950/60 border border-red-500/30"
                            >
                              {g.count > 1 ? `${g.count}x ` : ''}{g.name}
                            </span>
                          ))}
                        </div>

                        <div className="flex items-center gap-1 text-emerald-300">
                          <span>Received:</span>
                          {trade.receivedItems.map((r, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30"
                            >
                              {r.count > 1 ? `${r.count}x ` : ''}{r.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ==================================================== */}
        {/* INVENTORY ITEM PICKER MODAL */}
        {/* ==================================================== */}
        {showItemPicker && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="relative flex flex-col w-full max-w-2xl max-h-[85vh] rounded-2xl bg-neutral-900 border border-purple-500/40 shadow-2xl overflow-hidden">
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-neutral-800 p-4">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-purple-400" />
                  <h3 className="text-base sm:text-lg font-bold text-white">
                    Select Aura to Offer
                  </h3>
                </div>
                <button
                  onClick={() => setShowItemPicker(false)}
                  className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-800 hover:text-white"
                >
                  ✕
                </button>
              </div>

              {/* Search and Filters */}
              <div className="flex flex-col sm:flex-row gap-2 border-b border-neutral-800 p-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-500" />
                  <input
                    type="text"
                    placeholder="Search aura by name or rarity..."
                    value={pickerSearch}
                    onChange={(e) => setPickerSearch(e.target.value)}
                    className="w-full rounded-xl bg-neutral-800 border border-neutral-700 pl-9 pr-3 py-2 text-xs sm:text-sm text-white placeholder-neutral-500 focus:border-purple-500 focus:outline-none min-h-[40px]"
                  />
                </div>

                <select
                  value={pickerRarityFilter}
                  onChange={(e) => setPickerRarityFilter(e.target.value)}
                  className="rounded-xl bg-neutral-800 border border-neutral-700 px-3 py-2 text-xs sm:text-sm text-white focus:border-purple-500 focus:outline-none min-h-[40px]"
                >
                  <option value="all">All Rarities</option>
                  {Object.keys(RARITIES).map((r) => (
                    <option key={r} value={r}>
                      {r.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              {/* Inventory Items Grid */}
              <div className="flex-1 overflow-y-auto p-4 overscroll-contain">
                {availableInventoryItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center text-neutral-400">
                    <Sparkles className="h-10 w-10 text-neutral-600 mb-2" />
                    <p className="text-sm">No tradable auras found matching filters.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {availableInventoryItems.map(({ item, availableCount, isEquipped }) => {
                      const config = RARITIES[item.rarity] || RARITIES.common;
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleAddOfferItem(item)}
                          className="flex flex-col justify-between rounded-xl border p-3 text-left transition hover:scale-102 active:scale-98 shadow-sm min-h-[140px]"
                          style={{
                            borderColor: isEquipped ? '#eab308' : config.accentColor || '#a855f7',
                            backgroundColor: isEquipped ? '#ca8a0418' : `${config.accentColor || '#a855f7'}15`,
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1">
                              <span
                                className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded"
                                style={{
                                  backgroundColor: `${config.accentColor || '#a855f7'}30`,
                                  color: config.accentColor || '#a855f7',
                                }}
                              >
                                {item.rarity}
                              </span>
                              {isEquipped && (
                                <span className="text-[9px] font-black uppercase text-amber-300 bg-amber-500/30 px-1.5 py-0.5 rounded border border-amber-400/40">
                                  👑 EQUIPPED
                                </span>
                              )}
                            </div>
                            <span className="text-xs font-bold text-white bg-black/60 px-1.5 rounded">
                              x{availableCount}
                            </span>
                          </div>

                          <div className="my-2 flex items-center gap-2">
                            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-black/40 overflow-hidden border border-white/10">
                              <AuraVisualizerCanvas item={item} size={40} className="scale-125" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="text-xs sm:text-sm font-bold text-white truncate">
                                {item.name}
                              </h4>
                              <p className="text-[10px] text-neutral-400 truncate">
                                {RARITIES[item.rarity]?.oneInChance?.startsWith('1 in') ? RARITIES[item.rarity]?.oneInChance : `1 in ${RARITIES[item.rarity]?.oneInChance || '100'}`}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[11px] font-bold text-purple-300 pt-1 border-t border-white/5">
                            <span>+ Add to Offer</span>
                            <Plus className="h-3.5 w-3.5" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* TRADE CELEBRATION MODAL */}
        {/* ==================================================== */}
        {completedTradeData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in zoom-in-95">
            <div className="flex flex-col items-center text-center max-w-md w-full rounded-2xl bg-neutral-900 border border-emerald-500/50 p-6 shadow-2xl space-y-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-bounce">
                <CheckCircle2 className="h-10 w-10" />
              </div>

              <div>
                <h3 className="text-xl sm:text-2xl font-black text-white">
                  Trade Completed! 🤝
                </h3>
                <p className="text-xs sm:text-sm text-neutral-300 mt-1">
                  Successfully swapped auras with <b>{completedTradeData.partnerName}</b>
                </p>
              </div>

              {/* Items Summary */}
              <div className="w-full space-y-2 rounded-xl bg-neutral-800/80 border border-neutral-700 p-3 text-left text-xs">
                <div className="text-emerald-300 font-bold">✨ You Received:</div>
                <div className="flex flex-wrap gap-1.5">
                  {completedTradeData.received.map((r, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 rounded bg-emerald-950 border border-emerald-500/30 text-white font-medium"
                    >
                      {r.count > 1 ? `${r.count}x ` : ''}{r.name} ({r.rarity})
                    </span>
                  ))}
                </div>
              </div>

              <button
                id="trade-modal-continue-btn"
                onClick={() => {
                  sound.playButtonClick();
                  setCompletedTradeData(null);
                  handleLeaveRoom();
                }}
                className="w-full rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-emerald-600/30 hover:brightness-110 min-h-[44px]"
              >
                Awesome! Continue
              </button>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};

export const AuraTradingView = React.memo(AuraTradingViewComponent);
