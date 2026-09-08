import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  GameState,
  Item,
  RarityTier,
  RollResult,
  Achievement,
  DailyRewardTier,
  InventorySlot,
} from './types';
import { ITEMS, ITEMS_BY_ID, ITEMS_BY_RARITY, BROKEN_GLASS_ITEM, registerFusedItem } from './data/items';
import { RARITIES, RARITY_ORDER, isRarityAtLeast } from './data/rarities';
import { UPGRADES, POTIONS_SHOP, ACHIEVEMENTS } from './data/upgrades';
import {
  DAILY_REWARDS_CONFIG,
  getTodayDateString,
  isDailyRewardEligible,
  getNextStreakDay,
} from './data/dailyRewards';
import {
  calculateEffectiveLuck,
  rollSingleItem,
  getRollContext,
  getAutoRollIntervalMs,
  getRollCooldownMs,
  getRollsPerClick,
  getSellValue,
  getAutoEquippedBestItemIds,
  getUpgradeCostForLevel,
  CalculatedLuck,
} from './utils/rngEngine';
import { sound } from './utils/audio';
import {
  loadSavedGameState,
  saveGameState,
  clearSavedGameState,
  INITIAL_GAME_STATE,
} from './utils/storage';

import { Header } from './components/Header';
import { RollStation } from './components/RollStation';
import { InventoryView } from './components/InventoryView';
import { ShopUpgrades } from './components/ShopUpgrades';
import { MergeMachineView } from './components/MergeMachineView';
import { DropCelebrationModal } from './components/DropCelebrationModal';
import { AchievementsModal } from './components/AchievementsModal';
import { DailyRewardsModal } from './components/DailyRewardsModal';
import { BackgroundMusicPlayer } from './components/BackgroundMusicPlayer';
import { StatsModal } from './components/StatsModal';
import { ResetConfirmModal } from './components/ResetConfirmModal';
import { RebirthModal } from './components/RebirthModal';
import { RebirthCelebrationModal } from './components/RebirthCelebrationModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { BackgroundRenderer } from './components/BackgroundRenderer';
import { BackgroundCustomizerModal } from './components/BackgroundCustomizerModal';
import { LeaderboardView } from './components/LeaderboardView';
import { AuraDuelView } from './components/AuraDuelView';
import { AuraTradingView } from './components/AuraTradingView';
import { AuthModal } from './components/AuthModal';
import { EventModal } from './components/EventModal';
import { EventNotificationToast } from './components/EventNotificationToast';
import { MergeRecipe, BackgroundSettings, PlayerProfile, TradeHistoryEntry } from './types';
import { MERGE_RECIPES, EXCLUSIVE_MERGE_ITEMS_BY_ID } from './data/mergeRecipes';
import {
  getOrCreatePlayerProfile,
  syncPlayerToLeaderboard,
  broadcastRareRoll,
} from './services/leaderboardService';
import {
  subscribeToAuth,
  saveProgressToCloud,
  loadProgressFromCloud,
  SyncStatus,
} from './services/authService';
import {
  getDamalaEventStatus,
  EventStatus,
  triggerEventSystemNotification,
} from './services/eventService';
import { User } from 'firebase/auth';

import { Dices, Sparkles, ShoppingBag, Layers, Award, Gift, Flame, Atom, Trophy, Swords, ArrowLeftRight } from 'lucide-react';

export default function App() {
  const [gameState, setGameState] = useState<GameState>(() => loadSavedGameState());
  const [playerProfile, setPlayerProfile] = useState<PlayerProfile>(() => getOrCreatePlayerProfile());
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('guest');
  const [lastSavedAt, setLastSavedAt] = useState<number>(0);
  const [eventStatus, setEventStatus] = useState<EventStatus>(() => getDamalaEventStatus());
  const [toastDismissed, setToastDismissed] = useState(false);

  const [activeTab, setActiveTab] = useState<'roll' | 'inventory' | 'shop' | 'merge' | 'leaderboard' | 'duel' | 'trade'>('roll');
  const [isRolling, setIsRolling] = useState(false);
  const [lastRollResult, setLastRollResult] = useState<RollResult | null>(null);
  const [lastBatchResults, setLastBatchResults] = useState<RollResult[]>([]);
  const [recentRolls, setRecentRolls] = useState<RollResult[]>([]);

  // Modals state
  const [celebrationRoll, setCelebrationRoll] = useState<RollResult | null>(null);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showAchievementsModal, setShowAchievementsModal] = useState(false);
  const [showDailyRewardsModal, setShowDailyRewardsModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showRebirthModal, setShowRebirthModal] = useState(false);
  const [showRebirthCelebrationModal, setShowRebirthCelebrationModal] = useState(false);
  const [showBackgroundModal, setShowBackgroundModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [celebrationRebirthLevel, setCelebrationRebirthLevel] = useState(1);

  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  // Subscribe to Firebase Auth changes
  useEffect(() => {
    const unsub = subscribeToAuth((user) => {
      setAuthUser(user);
      setSyncStatus(user ? 'synced' : 'guest');
      if (user && user.displayName) {
        setPlayerProfile((prev) => {
          if (prev.name === user.displayName && prev.avatarIcon === (user.photoURL || prev.avatarIcon)) {
            return prev;
          }
          return {
            ...prev,
            name: user.displayName || prev.name,
            avatarIcon: user.photoURL || prev.avatarIcon,
          };
        });
      }
    });
    return () => unsub();
  }, []);

  // Persist state changes with throttled debounce to prevent local storage thrashing & sync cloud
  useEffect(() => {
    const timer = setTimeout(async () => {
      saveGameState(gameState);
      syncPlayerToLeaderboard(playerProfile, gameState);

      if (authUser) {
        setSyncStatus('saving');
        const res = await saveProgressToCloud(authUser.uid, gameState, playerProfile, authUser);
        if (res.success) {
          setSyncStatus('synced');
          setLastSavedAt(Date.now());
        } else {
          setSyncStatus('error');
        }
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [gameState, playerProfile, authUser]);

  // Damala Event live timer ticker & notification alerts
  const lastAlertedStateRef = useRef<'none' | 'soon' | 'live'>('none');
  useEffect(() => {
    const interval = setInterval(() => {
      const current = getDamalaEventStatus();
      setEventStatus(current);

      if (current.isActive && lastAlertedStateRef.current !== 'live') {
        lastAlertedStateRef.current = 'live';
        setToastDismissed(false);
        sound.playDrop('radiant');
        triggerEventSystemNotification(
          '🔥 DAMALA EVENT IS LIVE!',
          'The 30-minute Damala Eclipse Convergence is active! Roll exclusive Damala Auras with +10x Luck!'
        );
      } else if (current.isStartingSoon && lastAlertedStateRef.current !== 'soon' && !current.isActive) {
        lastAlertedStateRef.current = 'soon';
        setToastDismissed(false);
        sound.playAchievement();
        triggerEventSystemNotification(
          '⏰ Damala Event Starting in 5 Minutes!',
          'Get ready! Damala Auras will unlock on Monday at 5:00 for 30 minutes.'
        );
      } else if (!current.isActive && !current.isStartingSoon) {
        lastAlertedStateRef.current = 'none';
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Ensure progress is always saved on window unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      saveGameState(gameStateRef.current);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Sync sound settings with audio engine
  useEffect(() => {
    sound.toggleSound(gameState.soundEnabled);
  }, [gameState.soundEnabled]);

  // Check and prompt daily reward on load if eligible
  useEffect(() => {
    const isEligible = isDailyRewardEligible(gameState.dailyRewards?.lastClaimDate || null);
    if (isEligible) {
      // Delay slightly for smooth initial animation
      const timer = setTimeout(() => {
        setShowDailyRewardsModal(true);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, []);

  // Calculate current effective luck memoized
  const luckData: CalculatedLuck = useMemo(() => {
    return calculateEffectiveLuck(gameState);
  }, [
    gameState.upgrades,
    gameState.rebirthLevel,
    gameState.equippedItemIds,
    gameState.equippedItemId,
    gameState.activePotions,
  ]);

  // Equipped items memoized (up to 9 aura slots)
  const equippedItemIdsList = useMemo(() => {
    return gameState.equippedItemIds || (gameState.equippedItemId ? [gameState.equippedItemId] : []);
  }, [gameState.equippedItemIds, gameState.equippedItemId]);

  const equippedItems: Item[] = useMemo(() => {
    return equippedItemIdsList
      .map((id) => ITEMS_BY_ID[id])
      .filter((it): it is Item => Boolean(it));
  }, [equippedItemIdsList]);

  const equippedItem: Item | null = equippedItems[0] || null;

  // Unclaimed achievements counter memoized
  const unclaimedAchievementsCount = useMemo(() => {
    return ACHIEVEMENTS.filter((ach) => {
      if (gameState.unlockedAchievements.includes(ach.id)) return false;
      if (ach.type === 'rolls') return gameState.totalRolls >= (ach.targetValue as number);
      if (ach.type === 'coins') {
        const earned = gameState.stats.totalRollsEarned ?? gameState.stats.totalCoinsEarned ?? 0;
        return earned >= (ach.targetValue as number);
      }
      if (ach.type === 'rarity') {
        const requiredRarity = ach.targetValue as string;
        return (
          Boolean(gameState.stats.rollsByRarity[requiredRarity as any]) &&
          gameState.stats.rollsByRarity[requiredRarity as any] > 0
        );
      }
      return false;
    }).length;
  }, [
    gameState.unlockedAchievements,
    gameState.totalRolls,
    gameState.stats.totalRollsEarned,
    gameState.stats.totalCoinsEarned,
    gameState.stats.rollsByRarity,
  ]);

  /**
   * Primary Roll Execution Handler
   */
  const performRoll = useCallback(
    (count: number = 1, isFreeToken: boolean = false, bonusLuckMultiplier: number = 1.0) => {
      const state = gameStateRef.current;
      const baseLuck = calculateEffectiveLuck(state);

      const effectiveLuck: CalculatedLuck = {
        ...baseLuck,
        totalLuck: baseLuck.totalLuck * bonusLuckMultiplier,
      };

      if (state.soundEnabled) {
        if (state.fastRoll) {
          sound.playTick(750);
        } else {
          sound.playDiceRoll(false);
        }
      }

      // Pre-compute roll context once for the entire batch for 0-lag execution
      const rollCtx = getRollContext(state);

      const results: RollResult[] = [];
      let totalEarnedRolls = 0;
      let totalEarnedEssence = 0;
      const newInventory = { ...state.inventory };
      const updatedRollsByRarity = { ...state.stats.rollsByRarity };

      let bestRollInBatch: RollResult | null = null;
      const maxResultsToCollect = Math.min(count, 30);

      for (let i = 0; i < count; i++) {
        const rollRes = rollSingleItem(effectiveLuck, state, rollCtx);
        if (i < maxResultsToCollect) {
          results.push(rollRes);
        }

        const item = rollRes.item;
        const isBroken = Boolean(rollRes.isBrokenGlass || item.isBrokenGlass || item.id === 'broken_glass');

        // Track stats for non-broken rolls
        if (!isBroken) {
          updatedRollsByRarity[item.rarity] = (updatedRollsByRarity[item.rarity] || 0) + 1;
        }

        // Track highest in this batch
        if (
          !bestRollInBatch ||
          (!isBroken && (bestRollInBatch.isBrokenGlass || bestRollInBatch.item.id === 'broken_glass')) ||
          (!isBroken && RARITY_ORDER.indexOf(item.rarity) > RARITY_ORDER.indexOf(bestRollInBatch.item.rarity))
        ) {
          bestRollInBatch = rollRes;
        }

        // Broken glass: Always stored in inventory so player keeps all broken glass!
        // Fix Glass upgrade (Rebirth 15) increases its manual salvage value to 100 Rolls without force auto-selling.
        if (isBroken) {
          const existingBroken = newInventory['broken_glass'];
          if (existingBroken) {
            newInventory['broken_glass'] = {
              ...existingBroken,
              count: existingBroken.count + 1,
            };
          } else {
            newInventory['broken_glass'] = {
              itemId: 'broken_glass',
              count: 1,
              firstDiscoveredAt: Date.now(),
            };
          }
          continue;
        }

        // Auto-sell check
        const shouldAutoSell =
          state.autoSkipThreshold !== 'none' &&
          isRarityAtLeast(state.autoSkipThreshold, item.rarity);

        // Rolls money gained per spin (scales with equipped item money multiplier, item rolled multiplier, rebirth level & roll multiplier upgrade)
        const equippedMoneyMult = effectiveLuck.moneyMultiplier || 1;
        const itemMoneyMult = item.moneyMultiplier || 1;
        const rebirthMultiplier = 1 + (state.rebirthLevel || 0) * 1.5;
        const rollBonusUpgrade = 1 + (state.upgrades['roll_multiplier'] || 0) * 0.25;
        const totalMoneyMult = Math.max(1, Math.round(equippedMoneyMult * (1 + (itemMoneyMult - 1) * 0.1) * rebirthMultiplier * rollBonusUpgrade));
        const baseRollsGainedPerSpin = Math.round(5 * totalMoneyMult);
        totalEarnedRolls += baseRollsGainedPerSpin;

        if (shouldAutoSell) {
          const sellVal = getSellValue(item, state);
          const rollsVal = sellVal.rolls ?? sellVal.coins ?? 0;
          totalEarnedRolls += rollsVal;
          totalEarnedEssence += sellVal.essence;
        } else {
          // Add to inventory
          const existing = newInventory[item.id];
          if (existing) {
            newInventory[item.id] = {
              ...existing,
              count: existing.count + 1,
            };
          } else {
            newInventory[item.id] = {
              itemId: item.id,
              count: 1,
              firstDiscoveredAt: Date.now(),
            };
          }
        }
      }

      if (bestRollInBatch) {
        setLastRollResult(bestRollInBatch);
        setLastBatchResults(results);
        // Prepend all rolled items from the batch to recent history (newest first, capped at 20)
        setRecentRolls((prev) => [...results.slice().reverse(), ...prev].slice(0, 20));

        // Sound effect for drop
        sound.playDrop(bestRollInBatch.item.rarity, bestRollInBatch.isNew);

        // Broadcast rare roll to live global leaderboard feed if it's rare
        broadcastRareRoll(playerProfile, bestRollInBatch.item);
      }

      // Check Rebirth 10 upgrade: Auto-Equip Best items in loadout!
      const hasRebirth10AutoEquip = (state.upgrades['rebirth_upgrade_10'] || 0) > 0;
      let finalEquippedIds = state.equippedItemIds || (state.equippedItemId ? [state.equippedItemId] : []);
      let finalEquippedId = state.equippedItemId || null;

      if (hasRebirth10AutoEquip) {
        const maxSlots = 1 + (state.upgrades['aura_slots_unlock'] || 0);
        finalEquippedIds = getAutoEquippedBestItemIds(newInventory, maxSlots);
        finalEquippedId = finalEquippedIds[0] || null;
      }

      // Update State
      setGameState((prev) => {
        const newTotalRolls = prev.totalRolls + count;
        const highestRarity =
          !prev.highestRarityRolled ||
          (bestRollInBatch &&
            RARITY_ORDER.indexOf(bestRollInBatch.item.rarity) >
              RARITY_ORDER.indexOf(prev.highestRarityRolled))
            ? bestRollInBatch?.item.rarity || prev.highestRarityRolled
            : prev.highestRarityRolled;

        const newFreeTokens = isFreeToken
          ? Math.max(0, (prev.dailyRewards?.freeRollTokens || 0) - count)
          : prev.dailyRewards?.freeRollTokens || 0;

        const prevRolls = prev.rolls ?? prev.coins ?? 0;
        const prevRollsEarned = prev.stats.totalRollsEarned ?? prev.stats.totalCoinsEarned ?? 0;

        return {
          ...prev,
          totalRolls: newTotalRolls,
          rolls: prevRolls + totalEarnedRolls,
          coins: prevRolls + totalEarnedRolls,
          essence: prev.essence + totalEarnedEssence,
          inventory: newInventory,
          equippedItemId: finalEquippedId,
          equippedItemIds: finalEquippedIds,
          highestRarityRolled: highestRarity,
          dailyRewards: {
            ...prev.dailyRewards,
            freeRollTokens: newFreeTokens,
          },
          stats: {
            ...prev.stats,
            rollsByRarity: updatedRollsByRarity,
            totalRollsEarned: prevRollsEarned + totalEarnedRolls,
            totalCoinsEarned: prevRollsEarned + totalEarnedRolls,
            totalEssenceEarned: prev.stats.totalEssenceEarned + totalEarnedEssence,
            highestLuckAchieved: Math.max(prev.stats.highestLuckAchieved, effectiveLuck.totalLuck),
          },
        };
      });
    },
    []
  );

  const handleManualRoll = (baseMultiCount: number = 1, isFreeToken: boolean = false) => {
    if (isRolling) return;
    setIsRolling(true);

    const bonusLuck = isFreeToken ? 2.0 : 1.0;
    const animDelay = gameState.fastRoll ? 40 : 200;

    // Rolls per click upgrade: Level 0 = 1 roll, Level 1 = 2 rolls, Level 2 = 3 rolls, ..., up to Level 1000 = 1001 rolls
    const rollsPerClick = isFreeToken ? 1 : getRollsPerClick(gameState);
    const totalCountToRoll = isFreeToken ? baseMultiCount : Math.max(1, baseMultiCount) * rollsPerClick;

    setTimeout(() => {
      performRoll(totalCountToRoll, isFreeToken, bonusLuck);
    }, animDelay);

    // Cooldown modified by Slower Cooldown upgrade
    const cooldownMs = getRollCooldownMs(gameState);
    setTimeout(() => {
      setIsRolling(false);
    }, cooldownMs);
  };

  /**
   * Auto-Roll Loop
   */
  useEffect(() => {
    if (!gameState.autoRollActive) return;

    const intervalMs = Math.max(100, getAutoRollIntervalMs(gameState));
    const interval = setInterval(() => {
      const state = gameStateRef.current;
      if (!state.autoRollActive) return;
      const rollsPerClick = getRollsPerClick(state);
      const totalCount = Math.max(1, state.multiRollCount) * rollsPerClick;
      performRoll(totalCount);
    }, intervalMs);

    return () => clearInterval(interval);
  }, [
    gameState.autoRollActive,
    gameState.upgrades?.['auto_roll_speed'],
    gameState.upgrades?.['slower_cooldown'],
    gameState.fastRoll,
    gameState.multiRollCount,
    performRoll,
  ]);

  /**
   * Toggle Sound
   */
  const handleToggleSound = () => {
    const next = !gameState.soundEnabled;
    setGameState((prev) => ({ ...prev, soundEnabled: next }));
  };

  /**
   * Toggle Auto-Roll
   */
  const handleToggleAutoRoll = () => {
    const isUnlocked = (gameState.upgrades['auto_roll_unlock'] || 0) > 0;
    if (!isUnlocked) return;
    setGameState((prev) => ({ ...prev, autoRollActive: !prev.autoRollActive }));
  };

  /**
   * Equip or Toggle Item Aura (Multi-Aura slots expand with upgrades)
   */
  const handleEquipItem = (itemId: string) => {
    sound.playDrop('epic');
    setGameState((prev) => {
      const unlockedSlotBonus = prev.upgrades['aura_slots_unlock'] || 0;
      const maxSlots = Math.max(1, 1 + unlockedSlotBonus);
      const currentEquipped = prev.equippedItemIds || (prev.equippedItemId ? [prev.equippedItemId] : []);

      let nextEquipped: string[];
      if (currentEquipped.includes(itemId)) {
        // Toggle unequip if already equipped
        nextEquipped = currentEquipped.filter((id) => id !== itemId);
      } else {
        if (currentEquipped.length >= maxSlots) {
          // Replace oldest if full
          nextEquipped = [...currentEquipped.slice(1), itemId];
        } else {
          nextEquipped = [...currentEquipped, itemId];
        }
      }

      return {
        ...prev,
        equippedItemId: nextEquipped[0] || null,
        equippedItemIds: nextEquipped,
      };
    });
  };

  /**
   * Explicitly Unequip an Aura Slot
   */
  const handleUnequipItem = (itemId: string) => {
    sound.playButtonClick();
    setGameState((prev) => {
      const currentEquipped = prev.equippedItemIds || (prev.equippedItemId ? [prev.equippedItemId] : []);
      const nextEquipped = currentEquipped.filter((id) => id !== itemId);
      return {
        ...prev,
        equippedItemId: nextEquipped[0] || null,
        equippedItemIds: nextEquipped,
      };
    });
  };

  /**
   * Claim Daily Login Reward
   */
  const handleClaimDailyReward = (reward: DailyRewardTier, launchImmediateRolls: boolean) => {
    const todayStr = getTodayDateString();
    const lastClaim = gameState.dailyRewards?.lastClaimDate || null;
    const prevStreak = gameState.dailyRewards?.streakDays || 1;
    const newStreak = getNextStreakDay(lastClaim, prevStreak);

    sound.playDailyReward();

    let updatedPotions = [...gameState.activePotions];
    if (reward.potionReward) {
      updatedPotions.push({
        id: `daily_${Date.now()}`,
        name: reward.potionReward.name,
        luckMultiplier: reward.potionReward.luckMultiplier,
        durationSeconds: reward.potionReward.durationSeconds,
        expiresAt: Date.now() + reward.potionReward.durationSeconds * 1000,
        icon: reward.potionReward.icon,
      });
    }

    const rewardRolls = (reward as any).rolls ?? reward.coins ?? 0;

    setGameState((prev) => {
      const prevRolls = prev.rolls ?? prev.coins ?? 0;
      const prevRollsEarned = prev.stats.totalRollsEarned ?? prev.stats.totalCoinsEarned ?? 0;

      return {
        ...prev,
        rolls: prevRolls + rewardRolls,
        coins: prevRolls + rewardRolls,
        essence: prev.essence + reward.essence,
        activePotions: updatedPotions,
        dailyRewards: {
          lastClaimDate: todayStr,
          streakDays: newStreak,
          totalDailyClaims: (prev.dailyRewards?.totalDailyClaims || 0) + 1,
          freeRollTokens: (prev.dailyRewards?.freeRollTokens || 0) + (launchImmediateRolls ? 0 : reward.freeRolls),
        },
        stats: {
          ...prev.stats,
          totalRollsEarned: prevRollsEarned + rewardRolls,
          totalCoinsEarned: prevRollsEarned + rewardRolls,
          totalEssenceEarned: prev.stats.totalEssenceEarned + reward.essence,
        },
      };
    });

    if (launchImmediateRolls) {
      setShowDailyRewardsModal(false);
      setActiveTab('roll');
      setTimeout(() => {
        performRoll(reward.freeRolls, false, reward.bonusLuckOnRolls || 2.0);
      }, 350);
    }
  };

  /**
   * Use Free Roll Tokens
   */
  const handleUseFreeTokens = (count: number) => {
    setActiveTab('roll');
    handleManualRoll(count, true);
  };

  /**
   * Sell Item
   */
  const handleSellItem = (itemId: string, countToSell: number) => {
    const item = ITEMS_BY_ID[itemId];
    if (!item) return;

    const slot = gameState.inventory[itemId];
    if (!slot || slot.count < countToSell) return;

    const sellVal = getSellValue(item, gameState);
    const unitRolls = sellVal.rolls ?? sellVal.coins ?? 0;
    const totalRolls = unitRolls * countToSell;
    const totalEssence = sellVal.essence * countToSell;

    sound.playCoin();

    setGameState((prev) => {
      const currentSlot = prev.inventory[itemId];
      const newInventory = { ...prev.inventory };

      if (currentSlot.count <= countToSell) {
        delete newInventory[itemId];
      } else {
        newInventory[itemId] = {
          ...currentSlot,
          count: currentSlot.count - countToSell,
        };
      }

      // If rebirth 10 auto-equip is active, update equipped items; otherwise clean up sold item
      let finalEquippedIds = prev.equippedItemIds || (prev.equippedItemId ? [prev.equippedItemId] : []);
      let finalEquippedId = prev.equippedItemId || null;

      if ((prev.upgrades['rebirth_upgrade_10'] || 0) > 0) {
        const maxSlots = 1 + (prev.upgrades['aura_slots_unlock'] || 0);
        finalEquippedIds = getAutoEquippedBestItemIds(newInventory, maxSlots);
        finalEquippedId = finalEquippedIds[0] || null;
      } else {
        finalEquippedIds = finalEquippedIds.filter((id) => Boolean(newInventory[id] && newInventory[id].count > 0));
        finalEquippedId = finalEquippedIds[0] || null;
      }

      const prevRolls = prev.rolls ?? prev.coins ?? 0;
      const prevRollsEarned = prev.stats.totalRollsEarned ?? prev.stats.totalCoinsEarned ?? 0;

      return {
        ...prev,
        rolls: prevRolls + totalRolls,
        coins: prevRolls + totalRolls,
        essence: prev.essence + totalEssence,
        inventory: newInventory,
        equippedItemId: finalEquippedId,
        equippedItemIds: finalEquippedIds,
        stats: {
          ...prev.stats,
          totalRollsEarned: prevRollsEarned + totalRolls,
          totalCoinsEarned: prevRollsEarned + totalRolls,
          totalEssenceEarned: prev.stats.totalEssenceEarned + totalEssence,
        },
      };
    });
  };

  /**
   * Bulk Sell Rarities
   */
  const handleBulkSellRarity = (raritiesToSell: RarityTier[]) => {
    let totalRolls = 0;
    let totalEssence = 0;
    let soldAny = false;

    setGameState((prev) => {
      const newInventory = { ...prev.inventory };

      Object.entries(prev.inventory).forEach(([id, rawSlot]) => {
        const slot = rawSlot as import('./types').InventorySlot;
        const item = ITEMS_BY_ID[id];
        if (!item) return;
        // Allow selling broken glass in common or bulk recycle
        const isBroken = item.isBrokenGlass || id === 'broken_glass';
        if (!isBroken && !raritiesToSell.includes(item.rarity)) return;
        if (slot.isFavorite) return; // Keep locked favorites

        const sellVal = getSellValue(item, prev);
        const unitRolls = sellVal.rolls ?? sellVal.coins ?? 0;
        totalRolls += unitRolls * slot.count;
        totalEssence += sellVal.essence * slot.count;
        soldAny = true;

        delete newInventory[id];
      });

      if (!soldAny) return prev;

      sound.playCoin();

      // If rebirth 10 auto-equip is active, update equipped items; otherwise clean up sold item
      let finalEquippedIds = prev.equippedItemIds || (prev.equippedItemId ? [prev.equippedItemId] : []);
      let finalEquippedId = prev.equippedItemId || null;

      if ((prev.upgrades['rebirth_upgrade_10'] || 0) > 0) {
        const maxSlots = 1 + (prev.upgrades['aura_slots_unlock'] || 0);
        finalEquippedIds = getAutoEquippedBestItemIds(newInventory, maxSlots);
        finalEquippedId = finalEquippedIds[0] || null;
      } else {
        finalEquippedIds = finalEquippedIds.filter((id) => Boolean(newInventory[id] && newInventory[id].count > 0));
        finalEquippedId = finalEquippedIds[0] || null;
      }

      const prevRolls = prev.rolls ?? prev.coins ?? 0;
      const prevRollsEarned = prev.stats.totalRollsEarned ?? prev.stats.totalCoinsEarned ?? 0;

      return {
        ...prev,
        rolls: prevRolls + totalRolls,
        coins: prevRolls + totalRolls,
        essence: prev.essence + totalEssence,
        inventory: newInventory,
        equippedItemId: finalEquippedId,
        equippedItemIds: finalEquippedIds,
        stats: {
          ...prev.stats,
          totalRollsEarned: prevRollsEarned + totalRolls,
          totalCoinsEarned: prevRollsEarned + totalRolls,
          totalEssenceEarned: prev.stats.totalEssenceEarned + totalEssence,
        },
      };
    });
  };

  /**
   * Toggle Favorite Item
   */
  const handleToggleFavorite = (itemId: string) => {
    sound.playButtonClick();
    setGameState((prev) => {
      const slot = prev.inventory[itemId];
      if (!slot) return prev;
      return {
        ...prev,
        inventory: {
          ...prev.inventory,
          [itemId]: {
            ...slot,
            isFavorite: !slot.isFavorite,
          },
        },
      };
    });
  };

  /**
   * Buy Shop Upgrade (supports single or multi-level purchasing)
   */
  const handleBuyUpgrade = useCallback((upgradeId: string, levelsToBuy: number = 1) => {
    const upgrade = UPGRADES.find((u) => u.id === upgradeId);
    if (!upgrade) return;

    sound.playUpgrade();

    setGameState((prev) => {
      const currentLevel = prev.upgrades[upgradeId] || 0;
      if (currentLevel >= upgrade.maxLevel) return prev;

      const currentRolls = prev.rolls ?? prev.coins ?? 0;
      const isRollsCost = upgrade.costCurrency === 'rolls' || (upgrade.costCurrency as string) === 'coins';
      const availableBalance = isRollsCost ? currentRolls : prev.essence;

      let totalCost = 0;
      let levelsPurchased = 0;
      const maxPossibleLevels = Math.min(levelsToBuy, upgrade.maxLevel - currentLevel);

      for (let i = 0; i < maxPossibleLevels; i++) {
        const nextCost = getUpgradeCostForLevel(upgrade.baseCost, upgrade.costMultiplier, currentLevel + i);
        if (totalCost + nextCost <= availableBalance) {
          totalCost += nextCost;
          levelsPurchased++;
        } else {
          break;
        }
      }

      if (levelsPurchased === 0) return prev;

      const newUpgrades = {
        ...prev.upgrades,
        [upgradeId]: currentLevel + levelsPurchased,
      };

      // Check Rebirth 10 upgrade: Auto-Equip Best items in loadout!
      let finalEquippedIds = prev.equippedItemIds || (prev.equippedItemId ? [prev.equippedItemId] : []);
      let finalEquippedId = prev.equippedItemId || null;

      if ((newUpgrades['rebirth_upgrade_10'] || 0) > 0) {
        const maxSlots = 1 + (newUpgrades['aura_slots_unlock'] || 0);
        finalEquippedIds = getAutoEquippedBestItemIds(prev.inventory, maxSlots);
        finalEquippedId = finalEquippedIds[0] || null;
      }

      return {
        ...prev,
        rolls: isRollsCost ? currentRolls - totalCost : currentRolls,
        coins: isRollsCost ? currentRolls - totalCost : currentRolls,
        essence: upgrade.costCurrency === 'essence' ? prev.essence - totalCost : prev.essence,
        upgrades: newUpgrades,
        equippedItemId: finalEquippedId,
        equippedItemIds: finalEquippedIds,
      };
    });
  }, []);

  /**
   * Buy Potion
   */
  const handleBuyPotion = useCallback((potionId: string) => {
    const potion = POTIONS_SHOP.find((p) => p.id === potionId);
    if (!potion) return;

    sound.playUpgrade();

    const expiresAt = Date.now() + potion.durationSeconds * 1000;

    setGameState((prev) => {
      const potionCost = (potion as any).costRolls ?? potion.costCoins;
      const currentRolls = prev.rolls ?? prev.coins ?? 0;

      if (currentRolls < potionCost || prev.essence < potion.costEssence) return prev;

      return {
        ...prev,
        rolls: currentRolls - potionCost,
        coins: currentRolls - potionCost,
        essence: prev.essence - potion.costEssence,
        activePotions: [
          ...prev.activePotions,
          {
            id: potion.id,
            name: potion.name,
            luckMultiplier: potion.luckMultiplier,
            durationSeconds: potion.durationSeconds,
            expiresAt,
            icon: potion.icon,
          },
        ],
      };
    });
  }, []);

  /**
   * Claim Milestone Achievement
   */
  const handleClaimAchievement = (ach: Achievement) => {
    if (gameState.unlockedAchievements.includes(ach.id)) return;

    sound.playAchievement();
    const rewardRolls = (ach as any).rewardRolls ?? ach.rewardCoins ?? 0;

    setGameState((prev) => {
      const prevRolls = prev.rolls ?? prev.coins ?? 0;
      const prevRollsEarned = prev.stats.totalRollsEarned ?? prev.stats.totalCoinsEarned ?? 0;

      return {
        ...prev,
        rolls: prevRolls + rewardRolls,
        coins: prevRolls + rewardRolls,
        essence: prev.essence + ach.rewardEssence,
        unlockedAchievements: [...prev.unlockedAchievements, ach.id],
        stats: {
          ...prev.stats,
          totalRollsEarned: prevRollsEarned + rewardRolls,
          totalCoinsEarned: prevRollsEarned + rewardRolls,
          totalEssenceEarned: prev.stats.totalEssenceEarned + ach.rewardEssence,
        },
      };
    });
  };

  /**
   * Rebirth Ascension Handler (Cap 100)
   * Resets mortal progress: inventory, base upgrades, rolls balance
   * Grants: +1 Rebirth Level, +100 new items unlocked, +1 upgrade unlocked, +50% permanent luck boost
   */
  const handleRebirth = useCallback(() => {
    let nextTier = 1;
    setGameState((prev) => {
      const currentRebirth = prev.rebirthLevel || 0;
      if (currentRebirth >= 100) return prev;

      nextTier = currentRebirth + 1;
      const startingRolls = 0;

      return {
        ...prev,
        autoRollActive: false,
        rebirthLevel: nextTier,
        totalRebirths: (prev.totalRebirths || 0) + 1,
        rebirthMultiplier: 1 + nextTier * 0.5,
        rolls: startingRolls,
        coins: startingRolls,
        essence: 0,
        inventory: {},
        equippedItemId: null,
        equippedItemIds: [],
        upgrades: {
          ...INITIAL_GAME_STATE.upgrades,
        },
        activePotions: [],
        highestRarityRolled: null,
        stats: {
          ...prev.stats,
          totalRebirthsEarned: (prev.stats.totalRebirthsEarned || 0) + 1,
        },
      };
    });

    setCelebrationRebirthLevel(nextTier);
    setShowRebirthModal(false);
    setShowRebirthCelebrationModal(true);
  }, []);

  /**
   * Reset Save Progress
   */
  const handleResetProgress = () => {
    clearSavedGameState();
    setGameState(INITIAL_GAME_STATE);
    setLastRollResult(null);
    setRecentRolls([]);
  };

  /**
   * Merge Machine: Fuse Blueprint Recipe
   */
  const handleFuseRecipe = useCallback((recipe: MergeRecipe) => {
    setGameState((prev) => {
      if (prev.essence < recipe.requiredEssence) return prev;
      const currentRolls = prev.rolls ?? prev.coins ?? 0;
      if (recipe.requiredRollsCost && currentRolls < recipe.requiredRollsCost) return prev;

      const newInventory = { ...prev.inventory };

      // Deduct ingredients
      for (const req of recipe.requiredItems) {
        if (req.itemId) {
          const slot = newInventory[req.itemId];
          if (!slot || slot.count < req.count) return prev;
          if (slot.count === req.count) {
            delete newInventory[req.itemId];
          } else {
            newInventory[req.itemId] = { ...slot, count: slot.count - req.count };
          }
        } else if (req.rarity) {
          let needed = req.count;
          for (const [id, slot] of (Object.entries(newInventory) as [string, InventorySlot][])) {
            const it = ITEMS_BY_ID[id];
            if (it && it.rarity === req.rarity && !it.isBrokenGlass && needed > 0) {
              const take = Math.min(slot.count, needed);
              needed -= take;
              if (slot.count === take) {
                delete newInventory[id];
              } else {
                newInventory[id] = { ...slot, count: slot.count - take };
              }
            }
          }
          if (needed > 0) return prev;
        }
      }

      // Add result item
      const resItem = recipe.resultItem;
      const existingSlot = newInventory[resItem.id];
      if (existingSlot) {
        newInventory[resItem.id] = { ...existingSlot, count: existingSlot.count + 1 };
      } else {
        newInventory[resItem.id] = {
          itemId: resItem.id,
          count: 1,
          discoveredAt: Date.now(),
        };
      }

      // Check Rebirth 10 auto-equip
      const maxAuraSlots = Math.min(9, Math.max(1, 1 + (prev.upgrades['aura_slots_unlock'] || 0)));
      const hasBestRollsUpgrade = (prev.rebirthLevel || 0) >= 10 || ((prev.upgrades['rebirth_upgrade_10'] || 0) > 0);
      const newEquippedIds = hasBestRollsUpgrade
        ? getAutoEquippedBestItemIds(newInventory, maxAuraSlots)
        : prev.equippedItemIds;

      const remainingRolls = recipe.requiredRollsCost ? Math.max(0, currentRolls - recipe.requiredRollsCost) : currentRolls;

      return {
        ...prev,
        rolls: remainingRolls,
        coins: remainingRolls,
        essence: prev.essence - recipe.requiredEssence,
        inventory: newInventory,
        equippedItemIds: newEquippedIds,
        equippedItemId: newEquippedIds[0] || null,
        stats: {
          ...prev.stats,
          totalItemsCrafted: (prev.stats.totalItemsCrafted || 0) + 1,
        },
      };
    });
  }, []);

  /**
   * Merge Machine: Fuse 3x Duplicates of Any Aura
   */
  const handleFuseDuplicates = useCallback((itemId: string, countToConsume: number = 3) => {
    const item = ITEMS_BY_ID[itemId];
    if (!item) return;

    setGameState((prev) => {
      const slot = prev.inventory[itemId];
      if (!slot || slot.count < countToConsume) return prev;

      const newInventory = { ...prev.inventory };
      if (slot.count === countToConsume) {
        delete newInventory[itemId];
      } else {
        newInventory[itemId] = { ...slot, count: slot.count - countToConsume };
      }

      // Guarantee fused item is registered without creating duplicates
      const fusedItem = registerFusedItem(item);
      const fusedId = fusedItem.id;
      const existingFused = newInventory[fusedId];
      if (existingFused) {
        newInventory[fusedId] = { ...existingFused, count: existingFused.count + 1 };
      } else {
        newInventory[fusedId] = {
          itemId: fusedId,
          count: 1,
          discoveredAt: Date.now(),
        };
      }

      const maxAuraSlots = Math.min(9, Math.max(1, 1 + (prev.upgrades['aura_slots_unlock'] || 0)));
      const hasBestRollsUpgrade = (prev.rebirthLevel || 0) >= 10 || ((prev.upgrades['rebirth_upgrade_10'] || 0) > 0);
      const newEquippedIds = hasBestRollsUpgrade
        ? getAutoEquippedBestItemIds(newInventory, maxAuraSlots)
        : prev.equippedItemIds;

      return {
        ...prev,
        inventory: newInventory,
        equippedItemIds: newEquippedIds,
        equippedItemId: newEquippedIds[0] || null,
      };
    });
  }, []);

  /**
   * Merge Machine: Quick Fuse All Duplicates
   */
  const handleQuickFuseAllDuplicates = useCallback(() => {
    sound.playUpgrade();
    setGameState((prev) => {
      const newInventory = { ...prev.inventory };
      let fusedAny = false;

      for (const [id, slot] of (Object.entries(prev.inventory) as [string, InventorySlot][])) {
        if (slot.count >= 3 && !id.startsWith('fused_') && id !== 'broken_glass') {
          const item = ITEMS_BY_ID[id];
          if (!item) continue;

          const mergeTimes = Math.floor(slot.count / 3);
          const remainder = slot.count % 3;

          if (remainder === 0) {
            delete newInventory[id];
          } else {
            newInventory[id] = { ...slot, count: remainder };
          }

          const fusedItem = registerFusedItem(item);
          const fusedId = fusedItem.id;
          const existingFused = newInventory[fusedId];
          if (existingFused) {
            newInventory[fusedId] = { ...existingFused, count: existingFused.count + mergeTimes };
          } else {
            newInventory[fusedId] = {
              itemId: fusedId,
              count: mergeTimes,
              discoveredAt: Date.now(),
            };
          }
          fusedAny = true;
        }
      }

      if (!fusedAny) return prev;

      const maxAuraSlots = Math.min(9, Math.max(1, 1 + (prev.upgrades['aura_slots_unlock'] || 0)));
      const hasBestRollsUpgrade = (prev.rebirthLevel || 0) >= 10 || ((prev.upgrades['rebirth_upgrade_10'] || 0) > 0);
      const newEquippedIds = hasBestRollsUpgrade
        ? getAutoEquippedBestItemIds(newInventory, maxAuraSlots)
        : prev.equippedItemIds;

      return {
        ...prev,
        inventory: newInventory,
        equippedItemIds: newEquippedIds,
        equippedItemId: newEquippedIds[0] || null,
      };
    });
  }, []);

  /**
   * Multiplayer Aura Duel Won / Lost Prize Handlers
   */
  const handleAwardWonAura = useCallback((item: Item) => {
    setGameState((prev) => {
      const newInventory = { ...prev.inventory };
      const currentSlot = newInventory[item.id];
      if (currentSlot) {
        newInventory[item.id] = {
          ...currentSlot,
          count: currentSlot.count + 1,
        };
      } else {
        newInventory[item.id] = {
          itemId: item.id,
          count: 1,
          isFavorite: false,
          discoveredAt: Date.now(),
        };
      }

      return {
        ...prev,
        inventory: newInventory,
      };
    });
  }, []);

  const handleDeductLostAura = useCallback((itemId: string) => {
    setGameState((prev) => {
      const newInventory = { ...prev.inventory };
      const currentSlot = newInventory[itemId];
      if (!currentSlot) return prev;

      if (currentSlot.count > 1) {
        newInventory[itemId] = {
          ...currentSlot,
          count: currentSlot.count - 1,
        };
      } else {
        delete newInventory[itemId];
      }

      let newEquipped = prev.equippedItemId;
      if (newEquipped === itemId && !newInventory[itemId]) {
        newEquipped = null;
      }

      return {
        ...prev,
        inventory: newInventory,
        equippedItemId: newEquipped,
      };
    });
  }, []);

  /**
   * Aura & Item Trade System Completion Handler
   */
  const handleTradeComplete = useCallback((
    givenItems: { id: string; count: number }[],
    receivedItems: { id: string; name: string; rarity: RarityTier; count: number }[],
    partnerName: string,
    partnerAvatar: string
  ) => {
    sound.playTradeSuccess();
    setGameState((prev) => {
      const newInventory = { ...prev.inventory };

      // 1. Deduct given items
      for (const given of givenItems) {
        const slot = newInventory[given.id];
        if (slot) {
          if (slot.count <= given.count) {
            delete newInventory[given.id];
          } else {
            newInventory[given.id] = {
              ...slot,
              count: slot.count - given.count,
            };
          }
        }
      }

      // 2. Add received items
      for (const rec of receivedItems) {
        const slot = newInventory[rec.id];
        if (slot) {
          newInventory[rec.id] = {
            ...slot,
            count: slot.count + rec.count,
          };
        } else {
          newInventory[rec.id] = {
            itemId: rec.id,
            count: rec.count,
            isFavorite: false,
            discoveredAt: Date.now(),
          };
        }
      }

      // 3. Create trade history entry
      const historyEntry: TradeHistoryEntry = {
        id: `trade_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        timestamp: Date.now(),
        partnerName,
        partnerAvatar,
        givenItems: givenItems.map((g) => {
          const item = ITEMS_BY_ID[g.id];
          return {
            id: g.id,
            name: item?.name || g.id,
            rarity: item?.rarity || 'common',
            count: g.count,
          };
        }),
        receivedItems: receivedItems.map((r) => ({
          id: r.id,
          name: r.name,
          rarity: r.rarity,
          count: r.count,
        })),
        status: 'completed',
      };

      const prevHistory = prev.tradeHistory || [];
      const updatedHistory = [historyEntry, ...prevHistory].slice(0, 50);

      // Auto-equip best if unlocked
      const maxAuraSlots = Math.min(9, Math.max(1, 1 + (prev.upgrades['aura_slots_unlock'] || 0)));
      const hasBestRollsUpgrade = (prev.rebirthLevel || 0) >= 10 || ((prev.upgrades['rebirth_upgrade_10'] || 0) > 0);
      const newEquippedIds = hasBestRollsUpgrade
        ? getAutoEquippedBestItemIds(newInventory, maxAuraSlots)
        : prev.equippedItemIds.filter((id) => Boolean(newInventory[id]));

      return {
        ...prev,
        inventory: newInventory,
        equippedItemIds: newEquippedIds,
        equippedItemId: newEquippedIds[0] || null,
        tradeHistory: updatedHistory,
        stats: {
          ...prev.stats,
          totalTradesCompleted: (prev.stats.totalTradesCompleted || 0) + 1,
        },
      };
    });
  }, []);

  const handleUpdateProfile = useCallback((updated: PlayerProfile) => {
    setPlayerProfile(updated);
  }, []);

  /**
   * Background Theme Settings Handler
   */
  const handleSaveBackgroundSettings = useCallback((settings: BackgroundSettings) => {
    setGameState((prev) => ({
      ...prev,
      backgroundSettings: settings,
    }));
  }, []);

  const handleOpenAuth = useCallback(() => setShowAuthModal(true), []);
  const handleOpenEvent = useCallback(() => setShowEventModal(true), []);
  const handleOpenStats = useCallback(() => setShowStatsModal(true), []);
  const handleOpenAchievements = useCallback(() => setShowAchievementsModal(true), []);
  const handleOpenDailyRewards = useCallback(() => setShowDailyRewardsModal(true), []);
  const handleOpenRebirthModal = useCallback(() => setShowRebirthModal(true), []);
  const handleOpenReset = useCallback(() => setShowResetModal(true), []);
  const handleOpenBackgroundCustomizer = useCallback(() => setShowBackgroundModal(true), []);

  const handleSelectTab = useCallback((tab: 'roll' | 'inventory' | 'shop' | 'merge' | 'leaderboard' | 'duel' | 'trade') => {
    sound.playButtonClick();
    setActiveTab(tab);
  }, []);

  const handleOpenLeaderboard = useCallback(() => handleSelectTab('leaderboard'), [handleSelectTab]);
  const handleOpenDuel = useCallback(() => handleSelectTab('duel'), [handleSelectTab]);
  const handleOpenTrade = useCallback(() => handleSelectTab('trade'), [handleSelectTab]);

  const handleToggleFastRoll = useCallback(() => {
    setGameState((prev) => ({ ...prev, fastRoll: !prev.fastRoll }));
  }, []);

  const handleSetAutoSkip = useCallback((threshold: RarityTier | 'none') => {
    setGameState((prev) => ({ ...prev, autoSkipThreshold: threshold }));
  }, []);

  const handleSetMultiRollCount = useCallback((count: number) => {
    setGameState((prev) => ({ ...prev, multiRollCount: count }));
  }, []);

  const handleSelectBatchItem = useCallback((roll: RollResult) => {
    setLastRollResult(roll);
  }, []);

  return (
    <div className="relative min-h-screen text-white selection:bg-purple-600 selection:text-white flex flex-col font-sans overflow-x-hidden">
      {/* Dynamic Customizable Background & Atmosphere Layer */}
      <BackgroundRenderer settings={gameState.backgroundSettings} />

      {/* Top Header */}
      <Header
        gameState={gameState}
        luckData={luckData}
        user={authUser}
        syncStatus={syncStatus}
        eventStatus={eventStatus}
        onOpenAuth={handleOpenAuth}
        onOpenEvent={handleOpenEvent}
        onOpenStats={handleOpenStats}
        onOpenAchievements={handleOpenAchievements}
        onOpenDailyRewards={handleOpenDailyRewards}
        onOpenRebirthModal={handleOpenRebirthModal}
        onOpenReset={handleOpenReset}
        onOpenBackgroundCustomizer={handleOpenBackgroundCustomizer}
        onOpenLeaderboard={handleOpenLeaderboard}
        onOpenDuel={handleOpenDuel}
        onOpenTrade={handleOpenTrade}
        onToggleSound={handleToggleSound}
        unclaimedAchievementsCount={unclaimedAchievementsCount}
      />

      {/* Real-time Event Alert Notification Toast */}
      {!toastDismissed && (
        <EventNotificationToast
          eventStatus={eventStatus}
          onOpenEventModal={handleOpenEvent}
          onDismiss={() => setToastDismissed(true)}
        />
      )}

      {/* Main Container */}
      <main className="mx-auto flex-1 w-full max-w-5xl px-3 py-5 sm:px-6">
        {/* Responsive Navigation Tabs (Smooth horizontal swipe on phones & tablets) */}
        <div className="w-full overflow-x-auto no-scrollbar touch-smooth flex items-center justify-start sm:justify-center px-1 py-1 mb-6">
          <div className="inline-flex items-center gap-1 sm:gap-1.5 rounded-2xl border border-white/10 bg-white/5 p-1.5 shadow-xl backdrop-blur-md flex-nowrap shrink-0">
            <button
              id="nav-tab-roll"
              onClick={() => handleSelectTab('roll')}
              className={`flex items-center gap-1.5 sm:gap-2 rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-xs font-bold transition sm:text-sm whitespace-nowrap min-h-[44px] ${
                activeTab === 'roll'
                  ? 'theme-tab-active'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <Dices className="h-4 w-4" />
              <span>Roll Station</span>
            </button>

            <button
              id="nav-tab-inventory"
              onClick={() => handleSelectTab('inventory')}
              className={`flex items-center gap-1.5 sm:gap-2 rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-xs font-bold transition sm:text-sm whitespace-nowrap min-h-[44px] ${
                activeTab === 'inventory'
                  ? 'theme-tab-active'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <Sparkles className="h-4 w-4" />
              <span>Inventory</span>
            </button>

            <button
              id="nav-tab-shop"
              onClick={() => handleSelectTab('shop')}
              className={`flex items-center gap-1.5 sm:gap-2 rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-xs font-bold transition sm:text-sm whitespace-nowrap min-h-[44px] ${
                activeTab === 'shop'
                  ? 'theme-tab-active'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <ShoppingBag className="h-4 w-4" />
              <span>Shop</span>
            </button>

            <button
              id="nav-tab-merge"
              onClick={() => handleSelectTab('merge')}
              className={`flex items-center gap-1.5 sm:gap-2 rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-xs font-bold transition sm:text-sm whitespace-nowrap min-h-[44px] ${
                activeTab === 'merge'
                  ? 'theme-tab-active'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <Flame className="h-4 w-4 text-amber-400" />
              <span>Merge 🔥</span>
            </button>

            <button
              id="nav-tab-leaderboard"
              onClick={() => handleSelectTab('leaderboard')}
              className={`relative flex items-center gap-1.5 sm:gap-2 rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-xs font-bold transition sm:text-sm whitespace-nowrap min-h-[44px] ${
                activeTab === 'leaderboard'
                  ? 'theme-tab-active'
                  : 'text-amber-300/80 hover:text-amber-200 hover:bg-white/5'
              }`}
            >
              <Trophy className="h-4 w-4 text-amber-400" />
              <span>Leaderboard</span>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </button>

            <button
              id="nav-tab-duel"
              onClick={() => handleSelectTab('duel')}
              className={`relative flex items-center gap-1.5 sm:gap-2 rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-xs font-bold transition sm:text-sm whitespace-nowrap min-h-[44px] ${
                activeTab === 'duel'
                  ? 'theme-tab-active'
                  : 'text-purple-300/90 hover:text-purple-100 hover:bg-purple-500/10'
              }`}
            >
              <Swords className="h-4 w-4 text-purple-400" />
              <span>Duel ⚔️</span>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-pink-500"></span>
              </span>
            </button>

            <button
              id="nav-tab-trade"
              onClick={() => handleSelectTab('trade')}
              className={`relative flex items-center gap-1.5 sm:gap-2 rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-xs font-bold transition sm:text-sm whitespace-nowrap min-h-[44px] ${
                activeTab === 'trade'
                  ? 'theme-tab-active'
                  : 'text-indigo-300/90 hover:text-indigo-100 hover:bg-indigo-500/10'
              }`}
            >
              <ArrowLeftRight className="h-4 w-4 text-indigo-400" />
              <span>Trade 🤝</span>
              <span className="relative flex h-2 w-2">
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-400"></span>
              </span>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <ErrorBoundary>
          {activeTab === 'roll' && (
            <RollStation
              gameState={gameState}
              luckData={luckData}
              lastRollResult={lastRollResult}
              lastBatchResults={lastBatchResults}
              equippedItem={equippedItem}
              equippedItems={equippedItems}
              isRolling={isRolling}
              onRoll={handleManualRoll}
              onToggleAutoRoll={handleToggleAutoRoll}
              onToggleFastRoll={handleToggleFastRoll}
              onSetAutoSkip={handleSetAutoSkip}
              onSetMultiRollCount={handleSetMultiRollCount}
              onEquipItem={handleEquipItem}
              onUnequipItem={handleUnequipItem}
              onSelectBatchItem={handleSelectBatchItem}
              onOpenDailyRewards={handleOpenDailyRewards}
              onOpenRebirthModal={handleOpenRebirthModal}
              recentRolls={recentRolls}
            />
          )}

          {activeTab === 'inventory' && (
            <InventoryView
              gameState={gameState}
              luckData={luckData}
              lastRollResult={lastRollResult}
              isRolling={isRolling}
              onRoll={handleManualRoll}
              onToggleAutoRoll={handleToggleAutoRoll}
              onEquipItem={handleEquipItem}
              onSellItem={handleSellItem}
              onBulkSellRarity={handleBulkSellRarity}
              onToggleFavorite={handleToggleFavorite}
              onFuseDuplicates={handleFuseDuplicates}
            />
          )}

          {activeTab === 'shop' && (
            <ShopUpgrades
              gameState={gameState}
              onBuyUpgrade={handleBuyUpgrade}
              onBuyPotion={handleBuyPotion}
              onOpenRebirthModal={handleOpenRebirthModal}
            />
          )}

          {activeTab === 'merge' && (
            <MergeMachineView
              gameState={gameState}
              onFuseRecipe={handleFuseRecipe}
              onFuseDuplicates={handleFuseDuplicates}
              onQuickFuseAllDuplicates={handleQuickFuseAllDuplicates}
              onEquipItem={handleEquipItem}
            />
          )}

          {activeTab === 'leaderboard' && (
            <LeaderboardView
              gameState={gameState}
              playerProfile={playerProfile}
              onUpdateProfile={handleUpdateProfile}
            />
          )}

          {activeTab === 'duel' && (
            <AuraDuelView
              gameState={gameState}
              playerProfile={playerProfile}
              onAwardWonAura={handleAwardWonAura}
              onDeductLostAura={handleDeductLostAura}
              onEquipItem={handleEquipItem}
            />
          )}

          {activeTab === 'trade' && (
            <AuraTradingView
              gameState={gameState}
              playerProfile={playerProfile}
              onTradeComplete={handleTradeComplete}
              onEquipItem={handleEquipItem}
            />
          )}
        </ErrorBoundary>
      </main>

      {/* Footer info */}
      <footer className="border-t border-white/10 py-4 text-center text-xs font-mono text-white/40">
        RNG Realm • All rarities mathematically calculated with dynamic luck weights • Auto-saved to browser
      </footer>

      {/* Celebration Modal for Legendary / Mythic+ Discoveries */}
      <DropCelebrationModal
        rollResult={celebrationRoll}
        onClose={() => setCelebrationRoll(null)}
        onEquipItem={handleEquipItem}
      />

      {/* Rebirth Modal */}
      <RebirthModal
        isOpen={showRebirthModal}
        onClose={() => setShowRebirthModal(false)}
        gameState={gameState}
        onRebirth={handleRebirth}
      />

      {/* Rebirth Celebration Modal */}
      <RebirthCelebrationModal
        isOpen={showRebirthCelebrationModal}
        onClose={() => setShowRebirthCelebrationModal(false)}
        newRebirthLevel={celebrationRebirthLevel}
      />

      {/* Daily Login Rewards Modal */}
      {showDailyRewardsModal && (
        <DailyRewardsModal
          gameState={gameState}
          onClose={() => setShowDailyRewardsModal(false)}
          onClaimReward={handleClaimDailyReward}
          onUseFreeTokens={handleUseFreeTokens}
        />
      )}

      {/* Stats Modal */}
      {showStatsModal && (
        <StatsModal gameState={gameState} onClose={() => setShowStatsModal(false)} />
      )}

      {/* Achievements Modal */}
      {showAchievementsModal && (
        <AchievementsModal
          gameState={gameState}
          onClose={() => setShowAchievementsModal(false)}
          onClaimAchievement={handleClaimAchievement}
        />
      )}

      {/* Reset Confirmation Modal */}
      <ResetConfirmModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        onConfirm={handleResetProgress}
      />

      {/* Background & Atmosphere Customizer Modal */}
      {showBackgroundModal && (
        <BackgroundCustomizerModal
          currentSettings={gameState.backgroundSettings}
          onSave={handleSaveBackgroundSettings}
          onClose={() => setShowBackgroundModal(false)}
        />
      )}

      {/* Auth & Cloud Save Modal */}
      {showAuthModal && (
        <AuthModal
          user={authUser}
          gameState={gameState}
          playerProfile={playerProfile}
          syncStatus={syncStatus}
          lastSavedAt={lastSavedAt}
          onClose={() => setShowAuthModal(false)}
          onRestoreState={(restoredState, restoredProfile) => {
            setGameState(restoredState);
            if (restoredProfile) {
              setPlayerProfile(restoredProfile);
            }
            saveGameState(restoredState);
          }}
          onManualSync={async () => {
            if (!authUser) return;
            setSyncStatus('saving');
            const res = await saveProgressToCloud(authUser.uid, gameState, playerProfile, authUser);
            if (res.success) {
              setSyncStatus('synced');
              setLastSavedAt(Date.now());
            } else {
              throw new Error(res.error || 'Failed to sync');
            }
          }}
        />
      )}

      {/* Damala Event Hub Modal */}
      {showEventModal && (
        <EventModal
          eventStatus={eventStatus}
          onClose={() => setShowEventModal(false)}
          onRefreshStatus={() => setEventStatus(getDamalaEventStatus())}
        />
      )}

      {/* Persistent Background Music Player (Live Lofi Stream) */}
      <BackgroundMusicPlayer soundEnabled={gameState.soundEnabled} />
    </div>
  );
}
