import React, { useMemo } from 'react';
import { GameState, Item, RarityTier, RollResult } from '../types';
import { RARITIES, RARITY_ORDER } from '../data/rarities';
import { RARITY_MIN_REBIRTH } from '../data/items';
import { CalculatedLuck, getRollsPerClick, getRollCooldownMs, formatLuckBonus, formatBigNumber, formatMoneyMultiplier } from '../utils/rngEngine';
import { sound } from '../utils/audio';
import { DynamicIcon } from './DynamicIcon';
import { AuraVisualizer } from './AuraVisualizer';
import { motion, AnimatePresence } from 'motion/react';
import {
  Dices,
  Play,
  Pause,
  Zap,
  CheckCircle2,
  Sparkles,
  Layers,
  Flame,
  Coins,
  History,
  Hourglass,
  Clover,
  Crown,
  ShieldAlert,
  ShieldCheck,
  Unlock,
} from 'lucide-react';

interface RollStationProps {
  gameState: GameState;
  luckData: CalculatedLuck;
  lastRollResult: RollResult | null;
  lastBatchResults?: RollResult[];
  equippedItem: Item | null;
  equippedItems?: Item[];
  isRolling: boolean;
  onRoll: (count: number, isFreeToken?: boolean) => void;
  onToggleAutoRoll: () => void;
  onToggleFastRoll: () => void;
  onSetAutoSkip: (threshold: RarityTier | 'none') => void;
  onSetMultiRollCount: (count: number) => void;
  onEquipItem: (itemId: string) => void;
  onUnequipItem?: (itemId: string) => void;
  onSelectBatchItem?: (roll: RollResult) => void;
  onOpenDailyRewards?: () => void;
  onOpenRebirthModal?: () => void;
  recentRolls: RollResult[];
}

const RollStationComponent: React.FC<RollStationProps> = ({
  gameState,
  luckData,
  lastRollResult,
  lastBatchResults = [],
  equippedItem,
  equippedItems = [],
  isRolling,
  onRoll,
  onToggleAutoRoll,
  onToggleFastRoll,
  onSetMultiRollCount,
  onEquipItem,
  onUnequipItem,
  onSelectBatchItem,
  onOpenRebirthModal,
  recentRolls,
}) => {
  const isBrokenGlass = Boolean(lastRollResult?.isBrokenGlass || (lastRollResult && lastRollResult.item.id === 'broken_glass'));
  const displayItem = lastRollResult ? lastRollResult.item : equippedItem;
  const rarityConfig = displayItem && !isBrokenGlass ? RARITIES[displayItem.rarity] || RARITIES.common : RARITIES.common;
  const isAutoUnlocked = (gameState.upgrades['auto_roll_unlock'] || 0) > 0;
  const multiRollTier = gameState.upgrades['multi_roll_unlock'] || 0;
  const freeTokens = gameState.dailyRewards?.freeRollTokens || 0;
  const rollsMoney = gameState.rolls ?? gameState.coins ?? 0;
  const currentRebirth = gameState.rebirthLevel || 0;
  const hasAntiShatter = currentRebirth >= 30 || ((gameState.upgrades['rebirth_upgrade_30'] || 0) > 0);

  const unlockedSlotsBonus = gameState.upgrades['aura_slots_unlock'] || 0;
  const maxAuraSlots = Math.min(9, Math.max(1, 1 + unlockedSlotsBonus));

  const availableMultiCounts: number[] = [1];
  if (multiRollTier >= 1) availableMultiCounts.push(2);
  if (multiRollTier >= 2) availableMultiCounts.push(5);
  if (multiRollTier >= 3) availableMultiCounts.push(10);
  if (multiRollTier >= 4) availableMultiCounts.push(25);
  if (multiRollTier >= 5) availableMultiCounts.push(100);
  if (multiRollTier >= 6) availableMultiCounts.push(1000);
  if (multiRollTier >= 7) availableMultiCounts.push(10000);
  if (multiRollTier >= 8) availableMultiCounts.push(100000);
  if (multiRollTier >= 9) availableMultiCounts.push(1000000, 10000000, 100000000, 1000000000, Infinity);

  const equippedList = equippedItems.length > 0 ? equippedItems : equippedItem ? [equippedItem] : [];
  const isEquipped = displayItem && !isBrokenGlass && (gameState.equippedItemIds?.includes(displayItem.id) || gameState.equippedItemId === displayItem.id);
  const rollsPerClick = getRollsPerClick(gameState);
  const cooldownMs = getRollCooldownMs(gameState);
  const extraRollsLevel = gameState.upgrades['extra_rolls_per_click'] || 0;
  const slowerCooldownLevel = gameState.upgrades['slower_cooldown'] || 0;
  const effectiveRollsThisClick = gameState.multiRollCount === Infinity ? Infinity : gameState.multiRollCount * rollsPerClick;

  const formattedTotalLuck =
    (luckData?.totalLuck ?? 1) >= 1000
      ? formatLuckBonus(luckData?.totalLuck).replace('+', '')
      : `${(luckData?.totalLuck ?? 1).toFixed(2)}x`;

  // Top items in batch summary (limit to top 6 to prevent DOM lag when multi-roll is 1000x)
  const batchSummary = useMemo(() => {
    if (!lastBatchResults || lastBatchResults.length <= 1) return null;
    const nonBroken = lastBatchResults.filter((r) => !r.isBrokenGlass && r.item.id !== 'broken_glass');
    const brokenCount = lastBatchResults.length - nonBroken.length;

    // Sort by rarity rank descending
    const sorted = [...nonBroken].sort(
      (a, b) => RARITY_ORDER.indexOf(b.item.rarity) - RARITY_ORDER.indexOf(a.item.rarity)
    );

    return {
      totalCount: lastBatchResults.length,
      brokenCount,
      topDrops: sorted.slice(0, 6),
      bestDrop: sorted[0] || null,
    };
  }, [lastBatchResults]);

  const unlockedRarityInfo = useMemo(() => {
    const unlockedTiers = RARITY_ORDER.filter(
      (tier) => (RARITY_MIN_REBIRTH[tier] || 0) <= currentRebirth
    );
    const highestTier = unlockedTiers[unlockedTiers.length - 1] || 'common';
    const highestConfig = RARITIES[highestTier];

    return {
      unlockedCount: unlockedTiers.length,
      totalCount: RARITY_ORDER.length,
      highestTier,
      highestConfig,
    };
  }, [currentRebirth]);

  return (
    <div className="relative flex flex-col items-center justify-between rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.01] p-3.5 sm:p-6 shadow-2xl overflow-hidden backdrop-blur-md">
      {/* Background Matrix */}
      <div className="absolute inset-0 opacity-20 pointer-events-none bg-dot-grid" />
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-25 transition-all duration-700"
        style={{
          background: isBrokenGlass
            ? 'radial-gradient(circle at 50% 35%, rgba(244, 63, 94, 0.25), transparent 75%)'
            : `radial-gradient(circle at 50% 35%, ${rarityConfig.glowColor}, transparent 75%)`,
        }}
      />

      {/* CURRENCY & STATS BAR */}
      <div className="relative z-10 mb-3.5 w-full grid grid-cols-2 sm:grid-cols-5 gap-2">
        {/* Rolls Money Balance Card */}
        <div className="flex items-center gap-2 rounded-xl border border-cyan-500/40 bg-cyan-950/40 p-2 shadow-sm">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-300">
            <Coins className="h-3.5 w-3.5" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[9px] font-mono uppercase tracking-wider text-cyan-300 font-extrabold">
              Rolls Money
            </span>
            <span className="font-mono text-sm sm:text-base font-black text-cyan-100 truncate">
              {formatBigNumber(rollsMoney)}
            </span>
          </div>
        </div>

        {/* Astral Essence Card */}
        <div className="flex items-center gap-2 rounded-xl border border-purple-500/30 bg-purple-950/40 p-2 shadow-sm">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-purple-500/20 text-purple-300">
            <Flame className="h-3.5 w-3.5" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[9px] font-mono uppercase tracking-wider text-purple-300 font-extrabold">
              Essence
            </span>
            <span className="font-mono text-sm sm:text-base font-black text-purple-100 truncate">
              {formatBigNumber(gameState.essence)}
            </span>
          </div>
        </div>

        {/* Luck Multiplier Card */}
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-2 shadow-sm">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-300">
            <Clover className="h-3.5 w-3.5" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[9px] font-mono uppercase tracking-wider text-emerald-300 font-extrabold">
              Active Luck
            </span>
            <span className="font-mono text-sm sm:text-base font-black text-emerald-200 truncate">
              {formattedTotalLuck}
            </span>
          </div>
        </div>

        {/* Rebirth Ascension Card */}
        <button
          id="roll-station-rebirth-btn"
          onClick={() => {
            if (onOpenRebirthModal) {
              sound.playButtonClick();
              onOpenRebirthModal();
            }
          }}
          className="flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-950/40 p-2 shadow-sm text-left transition hover:scale-[1.02] active:scale-95 hover:border-amber-500/70"
          title="Click to Open Rebirth Ascension Modal (Max 100)"
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-300">
            <Crown className="h-3.5 w-3.5" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[9px] font-mono uppercase tracking-wider text-amber-300 font-extrabold">
              Rebirth Tier
            </span>
            <span className="font-mono text-sm sm:text-base font-black text-amber-100 truncate">
              Lv. {currentRebirth}/100
            </span>
          </div>
        </button>

        {/* Total Rolls Performed Card */}
        <div className="hidden sm:flex items-center gap-2 rounded-xl border border-blue-500/30 bg-blue-950/30 p-2 shadow-sm">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-500/20 text-blue-300">
            <Dices className="h-3.5 w-3.5" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[9px] font-mono uppercase tracking-wider text-blue-300 font-extrabold">
              Total Spins
            </span>
            <span className="font-mono text-sm sm:text-base font-black text-blue-200 truncate">
              {formatBigNumber(gameState.totalRolls)}
            </span>
          </div>
        </div>
      </div>

      {/* Top Status Bar: Multi-Roll, Extra Rolls, Cooldown, Free Tokens */}
      <div className="relative z-10 flex w-full flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2.5">
        {/* Multi-Roll Selector */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-mono font-semibold uppercase text-white/50">Multi-Roll:</span>
          <div className="flex flex-wrap gap-1">
            {availableMultiCounts.map((count) => {
              const isSelected = gameState.multiRollCount === count;

              return (
                <button
                  key={count}
                  id={`multi-roll-${count}x-btn`}
                  onClick={() => {
                    sound.playButtonClick();
                    onSetMultiRollCount(count);
                  }}
                  className={`rounded-lg px-2 py-0.5 text-xs font-mono font-bold transition ${
                    isSelected
                      ? 'theme-btn-primary'
                      : 'border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {count === Infinity ? '∞x (Infinite)' : count >= 1000 ? `${formatBigNumber(count)}x` : `${count}x`}
                </button>
              );
            })}
          </div>

          {/* Extra Rolls per Click Badge */}
          {extraRollsLevel > 0 && (
            <span
              className="rounded-md border border-cyan-500/40 bg-cyan-500/20 px-1.5 py-0.5 text-[10px] font-mono font-bold text-cyan-300"
              title={`Extra Rolls Per Click (Level ${extraRollsLevel}): Every roll button triggers ${rollsPerClick} rolls! Total per click: ${effectiveRollsThisClick}`}
            >
              +{extraRollsLevel} Casts ({formatBigNumber(rollsPerClick)}x)
            </span>
          )}
        </div>

        {/* Cooldown Speed & Glassbreaker / Rebirth Perks Status */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {hasAntiShatter ? (
            <span className="flex items-center gap-1 rounded-md border border-emerald-500/40 bg-emerald-950/40 px-2 py-0.5 text-[10px] font-mono text-emerald-300 font-bold">
              <ShieldCheck className="h-3 w-3 text-emerald-400" />
              <span>Anti-Shatter Active (0% Broken Glass)</span>
            </span>
          ) : (
            <span
              className="flex items-center gap-1 rounded-md border border-rose-500/40 bg-rose-950/30 px-2 py-0.5 text-[10px] font-mono text-rose-300"
              title="50% of rolls result in Broken Glass until Rebirth 30 Anti-Shatter upgrade!"
            >
              <ShieldAlert className="h-3 w-3 text-rose-400" />
              <span>50% Broken Glass (RB 30 Stops)</span>
            </span>
          )}

          {(gameState.upgrades['rebirth_upgrade_5'] || 0) > 0 && (
            <span
              className="flex items-center gap-1 rounded-md border border-amber-500/40 bg-amber-950/40 px-2 py-0.5 text-[10px] font-mono text-amber-300 font-bold"
              title="Lucky Duck Active: Radiant rolls convert to Kanda until all Kanda items collected!"
            >
              <Sparkles className="h-3 w-3 text-amber-400" />
              <span>Lucky Duck (Radiant → Kanda)</span>
            </span>
          )}

          {(gameState.upgrades['rebirth_upgrade_15'] || 0) > 0 && (
            <span
              className="flex items-center gap-1 rounded-md border border-purple-500/40 bg-purple-950/40 px-2 py-0.5 text-[10px] font-mono text-purple-300 font-bold"
              title="Too Much Active: Sikh rolls convert to Nani until all Nani items collected!"
            >
              <Sparkles className="h-3 w-3 text-purple-400" />
              <span>Too Much (Sikh → Nani)</span>
            </span>
          )}

          {slowerCooldownLevel > 0 && (
            <span className="flex items-center gap-1 rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-mono text-amber-300">
              <Hourglass className="h-3 w-3 text-amber-400" />
              <span>{(cooldownMs / 1000).toFixed(1)}s Delay</span>
            </span>
          )}

          {freeTokens > 0 && (
            <button
              id="free-tokens-pill-btn"
              onClick={() => {
                sound.playButtonClick();
                onRoll(Math.min(10, freeTokens), true);
              }}
              className="flex items-center gap-1 rounded-lg border border-purple-500/50 bg-purple-500/20 px-2 py-0.5 text-xs font-mono font-bold text-purple-300"
            >
              <Sparkles className="h-3 w-3 text-purple-400" />
              <span>{freeTokens} Free Tokens</span>
            </button>
          )}

          <button
            id="fast-roll-toggle"
            onClick={() => {
              sound.playButtonClick();
              onToggleFastRoll();
            }}
            className={`flex items-center gap-1 rounded-lg border px-2 py-0.5 text-xs font-semibold transition ${
              gameState.fastRoll
                ? 'border-purple-500/60 bg-purple-500/20 text-purple-300'
                : 'border-white/10 bg-white/5 text-white/50 hover:bg-white/10'
            }`}
          >
            <Zap className={`h-3 w-3 ${gameState.fastRoll ? 'text-purple-400 fill-purple-400' : ''}`} />
            <span>Fast: {gameState.fastRoll ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </div>

      {/* Rebirth Rarity Pool Status Banner */}
      <div className="relative z-10 w-full mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-1.5 text-xs text-white/70">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Unlock className="h-3.5 w-3.5 text-amber-400" />
          <span className="font-mono text-[11px] font-bold text-white/90">
            Rarities Unlocked: <span className="text-amber-300">{unlockedRarityInfo.unlockedCount}/{unlockedRarityInfo.totalCount} Tiers</span>
            <span className="ml-1 text-[10px] text-white/50 font-normal">
              ({unlockedRarityInfo.unlockedCount >= 100 ? 'All 100 Unlocked' : `${85} Base + ${Math.max(0, unlockedRarityInfo.unlockedCount - 85)}/15 Rebirth`})
            </span>
          </span>
          <span className="text-white/30 hidden xs:inline">•</span>
          <span className="text-[11px] text-white/60 hidden xs:inline">Highest Tier:</span>
          <span className={`font-mono font-black text-[10px] px-1.5 py-0.2 rounded border ${unlockedRarityInfo.highestConfig?.badgeBorder} ${unlockedRarityInfo.highestConfig?.badgeBg} ${unlockedRarityInfo.highestConfig?.textColor}`}>
            {unlockedRarityInfo.highestConfig?.name} ({unlockedRarityInfo.highestConfig?.oneInChance})
          </span>
        </div>

        {unlockedRarityInfo.unlockedCount < 100 ? (
          <button
            onClick={() => {
              if (onOpenRebirthModal) {
                sound.playButtonClick();
                onOpenRebirthModal();
              }
            }}
            className="text-[11px] font-mono font-bold text-amber-400 hover:text-amber-300 underline shrink-0"
          >
            Ascend to Rebirth {currentRebirth + 1} to unlock next rarity →
          </button>
        ) : (
          <span className="text-[11px] font-mono font-bold text-emerald-400">
            ★ All 100 Tiers Unlocked!
          </span>
        )}
      </div>

      {/* Main Aura Showcase Centerpiece */}
      <div className="relative z-10 my-3 sm:my-5 flex flex-col items-center justify-center text-center">
        {/* Dynamic Canvas Aura Visualization */}
        <div className="relative flex h-52 w-52 items-center justify-center sm:h-64 sm:w-64">
          <AuraVisualizer
            item={displayItem}
            items={equippedList}
            size={250}
            isRolling={isRolling}
            className="absolute inset-0"
          />

          {/* Central Item Display */}
          <AnimatePresence mode="wait">
            <motion.div
              key={displayItem ? `${displayItem.id}-${lastRollResult?.rolledAt || 0}` : 'empty'}
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="relative z-10 flex flex-col items-center justify-center"
            >
              <div
                className={`group relative flex h-20 w-20 items-center justify-center rounded-2xl border-2 p-1 shadow-2xl backdrop-blur-md transition-all sm:h-24 sm:w-24 ${
                  isBrokenGlass
                    ? 'border-rose-600 bg-rose-950/80'
                    : rarityConfig.badgeBorder
                } ${
                  rarityConfig.isRainbow && !isBrokenGlass
                    ? 'animate-pulse bg-gradient-to-tr from-rose-950/60 via-purple-950/60 to-cyan-950/60'
                    : 'bg-[#0c0c0e]/95'
                }`}
                style={{
                  boxShadow: isBrokenGlass ? '0 0 25px rgba(244, 63, 94, 0.4)' : `0 0 30px ${rarityConfig.glowColor}`,
                }}
              >
                {isBrokenGlass ? (
                  <ShieldAlert size={40} className="text-rose-400 animate-bounce" />
                ) : displayItem ? (
                  <DynamicIcon
                    name={displayItem.icon}
                    size={40}
                    className={`transition-transform duration-300 group-hover:scale-110 ${rarityConfig.textColor}`}
                  />
                ) : (
                  <Sparkles size={40} className="text-white/30 animate-pulse" />
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Item Title, Rarity Badge, Lore & Aura Luck Bonus */}
        <div className="mt-1 min-h-[90px] max-w-md">
          {isBrokenGlass ? (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center gap-1"
            >
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-rose-400">
                💔 Shattered Roll • You Got Nothing!
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-rose-300">
                Broken Glass
              </h2>
              <p className="text-xs text-white/60 max-w-xs">
                Shattered shards of empty glass. 50% failure roll! Reach <span className="font-bold text-amber-300">Rebirth 30</span> to unlock the Glassbreaker upgrade!
              </p>
            </motion.div>
          ) : displayItem ? (
            <motion.div
              key={displayItem.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center gap-1.5"
            >
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold uppercase tracking-[0.2em] ${rarityConfig.textColor}`}>
                  {lastRollResult?.isNew ? 'New Discovery' : 'Active Discovery'} • {rarityConfig.name}
                </span>

                {lastRollResult?.isCrit && (
                  <span className="flex items-center gap-0.5 rounded-md border border-amber-500/60 bg-amber-500/20 px-1.5 py-0.2 text-[9px] font-extrabold text-amber-300">
                    <Zap className="h-2.5 w-2.5 fill-amber-400" /> CRIT 3X
                  </span>
                )}
              </div>

              <h2
                className={`text-xl sm:text-3xl font-black tracking-tight filter drop-shadow-md ${
                  rarityConfig.isRainbow
                    ? 'text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-purple-400 to-cyan-400'
                    : rarityConfig.id === 'legendary' || rarityConfig.id === 'radiant' || rarityConfig.id === 'apotheosis'
                    ? 'text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500'
                    : 'text-white'
                }`}
              >
                {displayItem.name}
              </h2>

              <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-mono">
                <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 uppercase tracking-wider text-white/50 text-[10px]">
                  {rarityConfig.oneInChance} CHANCE
                </span>

                <span className="flex items-center gap-1 rounded-md border border-emerald-500/40 bg-emerald-950/40 px-2 py-0.5 font-bold text-emerald-300 text-[10px]">
                  <Clover className="h-3 w-3 text-emerald-400" />
                  <span>Aura Luck: {formatLuckBonus(displayItem.luckBonus)}</span>
                </span>

                {displayItem.moneyMultiplier && displayItem.moneyMultiplier > 1 && (
                  <span className="flex items-center gap-1 rounded-md border border-amber-500/40 bg-amber-950/40 px-2 py-0.5 font-bold text-amber-300 text-[10px]">
                    <Coins className="h-3 w-3 text-amber-400" />
                    <span>Roll Money: {formatMoneyMultiplier(displayItem.moneyMultiplier)}</span>
                  </span>
                )}
              </div>

              <p className="line-clamp-2 text-xs text-white/50 max-w-sm">
                {displayItem.lore}
              </p>

              {/* Equip / Status Button */}
              <div className="mt-1">
                {isEquipped ? (
                  <button
                    id="unequip-displayed-item-btn"
                    onClick={() => {
                      if (onUnequipItem) onUnequipItem(displayItem.id);
                      else onEquipItem(displayItem.id);
                    }}
                    className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-950/40 px-3 py-0.5 text-[11px] font-bold text-emerald-300 font-mono hover:bg-emerald-950/70 transition"
                  >
                    <CheckCircle2 className="h-3 w-3" /> EQUIPPED ({formatLuckBonus(displayItem.luckBonus)}) • Click to Unequip
                  </button>
                ) : (
                  <button
                    id="equip-displayed-item-btn"
                    onClick={() => {
                      sound.playButtonClick();
                      onEquipItem(displayItem.id);
                    }}
                    className="flex items-center gap-1 rounded-full border border-purple-500/40 bg-purple-600/20 px-3 py-0.5 text-[11px] font-bold text-purple-200 hover:bg-purple-600/40 transition shadow-sm"
                  >
                    <span>Equip to Aura Loadout ({equippedList.length}/{maxAuraSlots})</span>
                  </button>
                )}
              </div>
            </motion.div>
          ) : (
            <div className="flex flex-col items-center gap-1">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
                Aura Matrix Ready
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                SUMMON DESTINY
              </h2>
              <p className="text-xs text-white/40">
                Initiate quantum roll to materialize your next mystical aura
              </p>
            </div>
          )}
        </div>

        {/* EQUIPPED AURAS LOADOUT (DYNAMIC SLOTS UNLOCKED PER UPGRADE) */}
        <div className="mt-3.5 w-full max-w-3xl rounded-xl border border-white/10 bg-white/[0.02] p-2.5 sm:p-3 backdrop-blur-md">
          <div className="mb-2 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 font-mono font-bold text-purple-300 text-[11px]">
              <Sparkles className="h-3.5 w-3.5 text-purple-400" />
              <span>EQUIPPED LOADOUT ({equippedList.length}/{maxAuraSlots} Slots Active)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-emerald-400 font-bold">
                Total Luck: {formatLuckBonus(luckData?.equippedLuck ?? luckData?.itemLuckBonus ?? 0)}
              </span>
              {equippedList.length > 0 && onUnequipItem && (
                <button
                  onClick={() => {
                    equippedList.forEach((it) => onUnequipItem(it.id));
                  }}
                  className="text-[9px] font-mono text-rose-400 hover:text-rose-300 underline"
                  title="Unequip all active auras"
                >
                  Unequip All
                </button>
              )}
            </div>
          </div>

          <div className={`grid gap-1.5 max-h-56 overflow-y-auto scrollbar-thin p-0.5 ${
            maxAuraSlots <= 3
              ? 'grid-cols-3'
              : maxAuraSlots <= 6
              ? 'grid-cols-3 sm:grid-cols-6'
              : 'grid-cols-3 sm:grid-cols-6 md:grid-cols-9'
          }`}>
            {Array.from({ length: maxAuraSlots }).map((_, slotIdx) => {
              const item = equippedList[slotIdx] || null;
              const config = item ? RARITIES[item.rarity] || RARITIES.common : null;

              if (!item) {
                return (
                  <div
                    key={`slot-empty-${slotIdx}`}
                    className="flex flex-col items-center justify-center rounded-lg border border-dashed border-white/10 bg-white/[0.02] p-1.5 text-center min-h-[58px]"
                  >
                    <span className="text-[8px] font-mono text-white/40 font-bold">Slot {slotIdx + 1}</span>
                    <span className="text-[7px] text-white/30 uppercase">Empty</span>
                  </div>
                );
              }

              return (
                <div
                  key={`slot-equipped-${item.id}-${slotIdx}`}
                  className={`group relative flex flex-col items-center justify-center rounded-lg border p-1.5 text-center transition-all ${
                    config?.badgeBorder || 'border-purple-500/30'
                  } ${config?.badgeBg || 'bg-purple-950/20'} hover:scale-105 shadow-sm min-h-[58px]`}
                >
                  <DynamicIcon name={item.icon} size={16} className={config?.textColor || 'text-white'} />
                  <span className="mt-0.5 w-full truncate text-[8px] font-bold text-white">
                    {item.name}
                  </span>
                  <span className="text-[7px] font-mono text-emerald-400 font-bold">
                    {formatLuckBonus(item.luckBonus)}
                  </span>
                  <button
                    onClick={() => {
                      if (onUnequipItem) onUnequipItem(item.id);
                      else onEquipItem(item.id);
                    }}
                    className="absolute -top-1 -right-1 hidden group-hover:flex h-3.5 w-3.5 items-center justify-center rounded-full bg-rose-600 text-[8px] text-white font-bold shadow"
                    title="Unequip this aura"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* COMPACT MULTI-ROLL SUMMARY (Fast & Smooth, never floods DOM) */}
      {batchSummary && (
        <div className="relative z-10 my-2.5 w-full rounded-xl border border-white/10 bg-white/[0.02] p-2.5 backdrop-blur-sm">
          <div className="mb-2 flex items-center justify-between text-xs font-mono font-semibold">
            <span className="flex items-center gap-1.5 uppercase tracking-wider text-purple-300 text-[11px]">
              <Layers className="h-3.5 w-3.5 text-purple-400" /> Multi-Roll Burst ({formatBigNumber(batchSummary.totalCount)} Pulls)
            </span>
            {batchSummary.brokenCount > 0 && (
              <span className="text-[10px] text-rose-400 font-bold">
                {formatBigNumber(batchSummary.brokenCount)} Broken Glass
              </span>
            )}
          </div>

          {/* Render top 6 drops cleanly */}
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-6">
            {batchSummary.topDrops.map((res, idx) => {
              const resRarity = RARITIES[res.item.rarity] || RARITIES.common;
              const isSelected = displayItem?.id === res.item.id;

              return (
                <button
                  key={`${res.item.id}-${res.rolledAt}-${idx}`}
                  id={`batch-result-${idx}`}
                  onClick={() => onSelectBatchItem && onSelectBatchItem(res)}
                  className={`flex flex-col items-center justify-center rounded-lg border p-1.5 text-center transition-all ${
                    resRarity.badgeBorder
                  } ${resRarity.badgeBg} ${
                    isSelected ? 'ring-2 ring-purple-400 shadow' : 'hover:scale-105'
                  }`}
                >
                  <DynamicIcon name={res.item.icon} size={16} className={resRarity.textColor} />
                  <span className="mt-0.5 w-full truncate text-[9px] font-bold text-white">
                    {res.item.name}
                  </span>
                  <span className={`text-[8px] font-mono ${resRarity.textColor}`}>
                    {resRarity.name}
                  </span>
                  <span className="text-[7px] font-mono text-emerald-400">
                    {formatLuckBonus(res.item.luckBonus)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Roll Action & Auto-Roll Station */}
      <div className="relative z-10 mt-3 flex w-full flex-col items-center justify-center gap-2.5 sm:flex-row">
        {/* Main Roll Trigger Button */}
        <button
          id="main-roll-button"
          disabled={isRolling || gameState.autoRollActive}
          onClick={() => onRoll(gameState.multiRollCount)}
          className={`group relative flex h-14 w-full items-center justify-center overflow-hidden rounded-xl font-black text-white shadow-xl transition-all active:scale-[0.98] sm:h-16 sm:w-72 ${
            isRolling || gameState.autoRollActive
              ? 'cursor-not-allowed bg-zinc-800 opacity-60'
              : 'theme-btn-primary hover:scale-[1.02]'
          }`}
        >
          <span className="relative z-10 flex items-center gap-2 text-sm sm:text-base tracking-wider font-mono drop-shadow">
            <Dices className={`h-5 w-5 ${isRolling ? 'animate-spin' : 'group-hover:rotate-12 transition-transform'}`} />
            <span>
              {isRolling
                ? 'ROLLING...'
                : effectiveRollsThisClick > 1
                ? `ROLL DESTINY (${formatBigNumber(effectiveRollsThisClick)}X)`
                : 'ROLL FOR DESTINY'}
            </span>
          </span>
          <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-20 transition-opacity" />
        </button>

        {/* Auto Roll Button */}
        {isAutoUnlocked ? (
          <button
            id="auto-roll-btn"
            onClick={() => {
              sound.playButtonClick();
              onToggleAutoRoll();
            }}
            className={`flex items-center justify-center gap-2 rounded-xl border px-5 h-14 sm:h-16 font-bold transition sm:w-auto ${
              gameState.autoRollActive
                ? 'border-emerald-500/60 bg-emerald-950/60 text-emerald-300 ring-2 ring-emerald-500/40 animate-pulse'
                : 'border-white/10 bg-white/5 text-white/70 hover:border-white/20 hover:bg-white/10 hover:text-white'
            }`}
          >
            {gameState.autoRollActive ? (
              <>
                <Pause className="h-4 w-4 fill-emerald-400 text-emerald-400" />
                <span className="font-mono text-xs tracking-wider">AUTO: ON</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4 text-white/50" />
                <span className="font-mono text-xs tracking-wider">AUTO ROLL</span>
              </>
            )}
          </button>
        ) : (
          <div
            className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-3 h-14 sm:h-16 text-xs text-white/40"
          >
            <Play className="h-3.5 w-3.5 opacity-30" />
            <span>Auto-Roll (Locked)</span>
          </div>
        )}
      </div>

      {/* Recent Rolls Strip */}
      {recentRolls.length > 0 && (
        <div className="relative z-10 mt-4 w-full border-t border-white/10 pt-3">
          <div className="mb-1.5 flex items-center justify-between text-[9px] uppercase font-bold tracking-widest text-white/40">
            <span className="flex items-center gap-1">
              <History className="h-3 w-3" /> Recent Pulls:
            </span>
            <span className="font-mono">{recentRolls.length} recorded</span>
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {recentRolls.slice(0, 8).map((roll, idx) => {
              const isBroken = roll.isBrokenGlass || roll.item.id === 'broken_glass';
              const itemRarity = isBroken ? RARITIES.common : RARITIES[roll.item.rarity] || RARITIES.common;
              return (
                <div
                  key={`${roll.item.id}-${roll.rolledAt}-${idx}`}
                  className={`flex flex-shrink-0 items-center gap-1.5 rounded-lg border px-2 py-0.5 text-xs backdrop-blur-sm ${
                    isBroken
                      ? 'border-rose-600/40 bg-rose-950/40 text-rose-300'
                      : `${itemRarity.badgeBorder} ${itemRarity.badgeBg} ${itemRarity.textColor}`
                  }`}
                >
                  <DynamicIcon name={isBroken ? 'ShieldAlert' : roll.item.icon} size={12} />
                  <span className="font-semibold text-[10px]">{isBroken ? 'Broken Glass' : roll.item.name}</span>
                  {!isBroken && (
                    <span className="text-[9px] font-mono text-emerald-400 font-bold">
                      {formatLuckBonus(roll.item.luckBonus)}
                    </span>
                  )}
                  {roll.isCrit && <span className="text-[9px] text-amber-400 font-bold">★</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export const RollStation = React.memo(RollStationComponent);
