import React, { useState, useMemo, useCallback } from 'react';
import { GameState, Item, RarityTier } from '../types';
import { ITEMS, ITEMS_BY_ID, ITEMS_BY_RARITY } from '../data/items';
import { RARITIES, RARITY_ORDER } from '../data/rarities';
import { getSellValue, formatLuckBonus, formatBigNumber, formatMoneyMultiplier, CalculatedLuck } from '../utils/rngEngine';
import { sound } from '../utils/audio';
import { DynamicIcon } from './DynamicIcon';
import { AuraVisualizerCanvas } from './AuraVisualizerCanvas';
import {
  Search,
  CheckCircle2,
  Dices,
  Flame,
  Star,
  Trash2,
  Layers,
  Sparkles,
  Info,
  Coins,
  Clover,
  Atom,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Eye,
  Zap,
  Play,
  Pause,
  Filter,
} from 'lucide-react';

interface InventoryViewProps {
  gameState: GameState;
  luckData?: CalculatedLuck;
  lastRollResult?: any;
  isRolling?: boolean;
  onRoll?: (count?: number, isFreeToken?: boolean) => void;
  onToggleAutoRoll?: () => void;
  onEquipItem: (itemId: string) => void;
  onSellItem: (itemId: string, count: number) => void;
  onBulkSellRarity: (rarities: RarityTier[]) => void;
  onToggleFavorite: (itemId: string) => void;
  onFuseDuplicates?: (itemId: string, countToConsume?: number) => void;
}

const PAGE_SIZE = 40;

const InventoryViewComponent: React.FC<InventoryViewProps> = ({
  gameState,
  luckData,
  lastRollResult,
  isRolling,
  onRoll,
  onToggleAutoRoll,
  onEquipItem,
  onSellItem,
  onBulkSellRarity,
  onToggleFavorite,
  onFuseDuplicates,
}) => {
  const [selectedRarity, setSelectedRarity] = useState<RarityTier | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyDiscovered, setOnlyDiscovered] = useState(false);
  const [sortBy, setSortBy] = useState<'rarity_desc' | 'rarity_asc' | 'count_desc' | 'value_desc' | 'luck_desc' | 'money_desc'>('rarity_desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedItemForModal, setSelectedItemForModal] = useState<Item | null>(null);
  const [showMergeConfirmItem, setShowMergeConfirmItem] = useState<Item | null>(null);

  const rollsMoney = gameState.rolls ?? gameState.coins ?? 0;
  const isAutoRollOn = Boolean(gameState.autoRollActive);
  const autoRollUnlocked = (gameState.upgrades['auto_roll_unlock'] || 0) > 0;

  // 1. Fast catalog stats & discovered counts map (O(N) computed once per inventory change)
  const inventoryKeys = useMemo(() => {
    return Object.keys(gameState.inventory).filter(
      (id) => (gameState.inventory[id]?.count || 0) > 0 && id !== 'broken_glass'
    );
  }, [gameState.inventory]);

  const inventoryKeysHash = inventoryKeys.join(',');

  const { discoveredCount, totalItemCount, discoveryPercentage, discoveredPerTier } = useMemo(() => {
    const discoveredSet = new Set(inventoryKeys);

    const tierCounts: Record<string, number> = {};
    inventoryKeys.forEach((id) => {
      const item = ITEMS_BY_ID[id];
      if (item) {
        tierCounts[item.rarity] = (tierCounts[item.rarity] || 0) + 1;
      }
    });

    const total = ITEMS.length;
    const count = discoveredSet.size;
    const pct = Math.min(100, Math.round((count / total) * 100));

    return {
      discoveredCount: count,
      totalItemCount: total,
      discoveryPercentage: pct,
      discoveredPerTier: tierCounts,
    };
  }, [inventoryKeysHash]);

  // 2. High-performance filtering & pagination (Instant O(1) tier slicing)
  const filteredItems = useMemo(() => {
    let sourceList: Item[];

    if (onlyDiscovered) {
      // Discovered only mode: only check the player's active inventory (super fast ~10-200 items)
      sourceList = inventoryKeys
        .map((id) => ITEMS_BY_ID[id])
        .filter((item): item is Item => Boolean(item));
    } else if (selectedRarity === 'all') {
      sourceList = ITEMS;
    } else {
      sourceList = ITEMS_BY_RARITY[selectedRarity] || [];
    }

    const q = searchQuery.trim().toLowerCase();

    const filtered = sourceList.filter((item) => {
      if (selectedRarity !== 'all' && item.rarity !== selectedRarity) {
        return false;
      }
      if (q) {
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesLore = item.lore.toLowerCase().includes(q);
        if (!matchesName && !matchesLore) return false;
      }
      return true;
    });

    // If viewing all 30k items with default sort and no search, avoid massive CPU sort per roll
    if (selectedRarity === 'all' && !onlyDiscovered && !q && sortBy === 'rarity_desc') {
      return filtered;
    }

    // Sort items
    return filtered.sort((a, b) => {
      const countA = gameState.inventory[a.id]?.count || 0;
      const countB = gameState.inventory[b.id]?.count || 0;

      // Discovered items come before undiscovered items in standard view
      if (!onlyDiscovered) {
        if (countA > 0 && countB === 0) return -1;
        if (countB > 0 && countA === 0) return 1;
      }

      if (sortBy === 'luck_desc') {
        return b.luckBonus - a.luckBonus;
      }
      if (sortBy === 'money_desc') {
        return (b.moneyMultiplier || 1) - (a.moneyMultiplier || 1);
      }
      if (sortBy === 'count_desc') {
        return countB - countA;
      }
      if (sortBy === 'value_desc') {
        return b.baseValue - a.baseValue;
      }
      if (sortBy === 'rarity_asc') {
        return RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity);
      }
      // default: rarity_desc
      return RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity);
    });
  }, [selectedRarity, searchQuery, onlyDiscovered, sortBy, inventoryKeysHash]);

  // Total pages calculation
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);

  // Paginated slice
  const paginatedItems = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredItems.slice(start, start + PAGE_SIZE);
  }, [filteredItems, safePage]);

  // Handle page change
  const handlePageChange = useCallback((newPage: number) => {
    sound.playButtonClick();
    setCurrentPage(Math.max(1, Math.min(newPage, totalPages)));
  }, [totalPages]);

  const selectedSlot = selectedItemForModal ? gameState.inventory[selectedItemForModal.id] : null;
  const selectedSell = selectedItemForModal ? getSellValue(selectedItemForModal, gameState) : { rolls: 0, coins: 0, essence: 0 };

  return (
    <div className="flex flex-col gap-5">
      {/* 1. LIVE MINI AUTO-ROLL HUD: Never stops rolls while browsing Dex! */}
      <div className="relative overflow-hidden rounded-2xl border border-purple-500/40 bg-gradient-to-r from-[#120f24] via-[#0d0d18] to-[#120f24] p-3.5 sm:p-4 shadow-xl backdrop-blur-xl">
        <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-purple-600/20 blur-3xl" />
        <div className="pointer-events-none absolute -left-12 -bottom-12 h-36 w-36 rounded-full bg-cyan-600/20 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {/* Left: Live Roll Telemetry & Auto-Roll Status */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-4">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                {isAutoRollOn ? (
                  <>
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
                  </>
                ) : (
                  <span className="inline-flex h-3 w-3 rounded-full bg-white/30" />
                )}
              </span>
              <span className="text-xs font-black tracking-wide text-white uppercase">
                {isAutoRollOn ? (
                  <span className="text-emerald-400 flex items-center gap-1 font-mono">
                    <Zap className="h-3.5 w-3.5 fill-emerald-400" />
                    Auto-Rolling Live (Background Active)
                  </span>
                ) : (
                  <span className="text-white/60 font-mono">Roll Stream Standby</span>
                )}
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="rounded-lg border border-cyan-500/30 bg-cyan-950/40 px-2 py-0.5 font-bold text-cyan-300">
                Spins: {formatBigNumber(gameState.totalRolls)}
              </span>
              <span className="rounded-lg border border-purple-500/30 bg-purple-950/40 px-2 py-0.5 font-bold text-purple-300">
                Balance: {formatBigNumber(rollsMoney)} Rolls
              </span>
            </div>
          </div>

          {/* Right: Quick Manual Roll & Auto-Roll Toggle Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {lastRollResult && lastRollResult.item && !lastRollResult.isBrokenGlass && (
              <div
                className="hidden lg:flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1 text-xs cursor-pointer hover:bg-white/10 transition"
                onClick={() => setSelectedItemForModal(lastRollResult.item)}
                title="Click to inspect latest drop"
              >
                <span className="text-[10px] text-white/50 uppercase font-mono">Latest:</span>
                <DynamicIcon name={lastRollResult.item.icon} size={14} className="text-amber-300" />
                <span className="font-bold text-white max-w-[120px] truncate">{lastRollResult.item.name}</span>
              </div>
            )}

            {onRoll && (
              <div className="flex items-center gap-1.5">
                <button
                  id="dex-quick-roll-1x"
                  onClick={() => {
                    sound.playButtonClick();
                    onRoll(1);
                  }}
                  disabled={isRolling}
                  className="flex items-center gap-1 rounded-xl border border-purple-500/40 bg-purple-500/20 px-3 py-1.5 text-xs font-black text-purple-200 transition hover:bg-purple-500/40 active:scale-95 disabled:opacity-50"
                >
                  <Dices className="h-3.5 w-3.5" />
                  <span>Roll 1x</span>
                </button>

                <button
                  id="dex-quick-roll-10x"
                  onClick={() => {
                    sound.playButtonClick();
                    onRoll(10);
                  }}
                  disabled={isRolling}
                  className="flex items-center gap-1 rounded-xl border border-cyan-500/40 bg-cyan-500/20 px-3 py-1.5 text-xs font-black text-cyan-200 transition hover:bg-cyan-500/40 active:scale-95 disabled:opacity-50"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Roll 10x</span>
                </button>
              </div>
            )}

            {autoRollUnlocked && onToggleAutoRoll && (
              <button
                id="dex-toggle-auto-roll"
                onClick={() => {
                  sound.playButtonClick();
                  onToggleAutoRoll();
                }}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-black transition active:scale-95 ${
                  isAutoRollOn
                    ? 'border border-emerald-500/50 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                    : 'border border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
                }`}
              >
                {isAutoRollOn ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                <span>Auto: {isAutoRollOn ? 'ON' : 'OFF'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Catalog & Discovery Header Stats */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5 backdrop-blur-md lg:flex-row lg:items-center">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span>Aura Collection & Master Dex</span>
                <span className="rounded-md border border-purple-500/30 bg-purple-500/20 px-2 py-0.5 text-[10px] font-mono font-bold text-purple-300">
                  {discoveredCount} / {totalItemCount} Discovered
                </span>
              </h2>
            </div>
            <div className="mt-2.5 flex items-center gap-3">
              <div className="h-2 w-48 sm:w-56 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 via-purple-500 to-amber-500 transition-all duration-500"
                  style={{ width: `${discoveryPercentage}%` }}
                />
              </div>
              <span className="text-[10px] font-mono font-semibold uppercase tracking-widest text-white/50">
                {discoveryPercentage}% COMPLETE
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls: Quick Sell Broken Glass and Bulk Sell */}
        <div className="flex flex-wrap items-center gap-2">
          {Boolean(gameState.inventory['broken_glass']?.count) && (
            <button
              id="sell-broken-glass-btn"
              onClick={() => onSellItem('broken_glass', gameState.inventory['broken_glass']!.count)}
              className="flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-950/40 px-3 py-2 text-xs font-bold text-amber-300 transition hover:bg-amber-950/70 shadow-sm"
            >
              <Coins className="h-3.5 w-3.5 text-amber-400" />
              <span>
                Sell Broken Glass ({gameState.inventory['broken_glass']!.count}) • +
                {formatBigNumber(
                  gameState.inventory['broken_glass']!.count *
                    ((gameState.upgrades['rebirth_upgrade_15'] || 0) > 0 ? 100 : 10)
                )}{' '}
                Rolls
              </span>
            </button>
          )}

          <button
            id="bulk-sell-common-btn"
            onClick={() => onBulkSellRarity(['common', 'uncommon', 'unusual'])}
            className="flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-950/30 px-3 py-2 text-xs font-semibold text-rose-300 transition hover:bg-rose-950/50"
            title="Recycle all duplicate Common, Uncommon, & Unusual items for Rolls Money & Essence"
          >
            <Trash2 className="h-3.5 w-3.5 text-rose-400" />
            <span>Recycle Duplicates</span>
          </button>
        </div>
      </div>

      {/* 3. Search, Sort, Filter, and Discovered-Only Bar */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <input
            id="dex-search-input"
            type="text"
            placeholder="Search across all 30,000 auras by name, rank, or lore..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full rounded-xl border border-white/10 bg-white/5 py-2 pl-10 pr-4 text-xs text-white placeholder-white/40 transition focus:border-purple-500/60 focus:bg-white/10 focus:outline-none"
          />
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Discovered-Only Toggle */}
          <button
            id="dex-toggle-discovered-only"
            onClick={() => {
              sound.playButtonClick();
              setOnlyDiscovered((prev) => !prev);
              setCurrentPage(1);
            }}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition ${
              onlyDiscovered
                ? 'border-emerald-500/60 bg-emerald-950/40 text-emerald-300'
                : 'border-white/10 bg-white/5 text-white/60 hover:text-white'
            }`}
          >
            <Eye className="h-3.5 w-3.5" />
            <span>Discovered Only ({discoveredCount})</span>
          </button>

          {/* Sort Select */}
          <select
            id="dex-sort-select"
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value as any);
              setCurrentPage(1);
            }}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white transition focus:border-purple-500/60 focus:bg-[#121216] focus:outline-none cursor-pointer"
          >
            <option value="rarity_desc" className="bg-[#121216]">Rarest Tier First</option>
            <option value="rarity_asc" className="bg-[#121216]">Common Tier First</option>
            <option value="luck_desc" className="bg-[#121216]">Highest Luck Boost</option>
            <option value="money_desc" className="bg-[#121216]">Highest Money Multiplier</option>
            <option value="count_desc" className="bg-[#121216]">Most Copies Owned</option>
            <option value="value_desc" className="bg-[#121216]">Highest Rolls Value</option>
          </select>
        </div>
      </div>

      {/* 4. Rarity Tier Filter Scroll Bar (All 100 Tiers, instant O(1) filter) */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-thin">
        <button
          id="dex-tab-all"
          onClick={() => {
            sound.playButtonClick();
            setSelectedRarity('all');
            setCurrentPage(1);
          }}
          className={`flex-shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
            selectedRarity === 'all'
              ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-md shadow-purple-600/30'
              : 'border border-white/10 bg-white/5 text-white/50 hover:text-white/80'
          }`}
        >
          All ({onlyDiscovered ? discoveredCount : totalItemCount})
        </button>

        {RARITY_ORDER.map((tier) => {
          const config = RARITIES[tier];
          const isSelected = selectedRarity === tier;
          const tierTotal = ITEMS_BY_RARITY[tier]?.length || 200;
          const discoveredInTier = discoveredPerTier[tier] || 0;

          return (
            <button
              key={tier}
              id={`dex-tab-${tier}`}
              onClick={() => {
                sound.playButtonClick();
                setSelectedRarity(tier);
                setCurrentPage(1);
              }}
              className={`flex flex-shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                isSelected
                  ? `${config.badgeBg} ${config.textColor} border ${config.badgeBorder} shadow-sm ring-1 ring-white/20`
                  : 'border border-white/5 bg-white/[0.02] text-white/40 hover:text-white/70'
              }`}
            >
              <span
                className="h-2 w-2 rounded-full shadow-sm"
                style={{ backgroundColor: config.accentColor }}
              />
              <span>{config.name}</span>
              <span className="text-[10px] font-mono opacity-70">
                ({discoveredInTier}/{tierTotal})
              </span>
            </button>
          );
        })}
      </div>

      {/* 5. Pagination Bar (Top) */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-3.5 py-2 text-xs">
          <div className="text-white/60 font-mono text-[11px]">
            Showing items <strong className="text-white">{(safePage - 1) * PAGE_SIZE + 1}</strong> -{' '}
            <strong className="text-white">{Math.min(safePage * PAGE_SIZE, filteredItems.length)}</strong> of{' '}
            <strong className="text-purple-300">{filteredItems.length}</strong>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handlePageChange(1)}
              disabled={safePage === 1}
              className="rounded-lg border border-white/10 bg-white/5 p-1 text-white/70 hover:bg-white/10 disabled:opacity-30"
              title="First Page"
            >
              <ChevronsLeft className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => handlePageChange(safePage - 1)}
              disabled={safePage === 1}
              className="rounded-lg border border-white/10 bg-white/5 p-1 text-white/70 hover:bg-white/10 disabled:opacity-30"
              title="Previous Page"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>

            <span className="font-mono font-bold text-white px-2">
              Page {safePage} / {totalPages}
            </span>

            <button
              onClick={() => handlePageChange(safePage + 1)}
              disabled={safePage === totalPages}
              className="rounded-lg border border-white/10 bg-white/5 p-1 text-white/70 hover:bg-white/10 disabled:opacity-30"
              title="Next Page"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => handlePageChange(totalPages)}
              disabled={safePage === totalPages}
              className="rounded-lg border border-white/10 bg-white/5 p-1 text-white/70 hover:bg-white/10 disabled:opacity-30"
              title="Last Page"
            >
              <ChevronsRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 6. High-Tech Holographic Aura Item Grid (Graphics Polish) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {paginatedItems.map((item) => {
          const slot = gameState.inventory[item.id];
          const count = slot?.count || 0;
          const isDiscovered = count > 0;
          const isEquipped = gameState.equippedItemIds?.includes(item.id) || gameState.equippedItemId === item.id;
          const config = RARITIES[item.rarity] || RARITIES.common;
          const isFavorite = slot?.isFavorite;

          return (
            <button
              key={item.id}
              id={`inventory-item-${item.id}`}
              onClick={() => {
                sound.playButtonClick();
                setSelectedItemForModal(item);
              }}
              className={`group relative flex flex-col items-center justify-between rounded-2xl border p-3.5 sm:p-4 text-center transition-all duration-300 overflow-hidden cursor-pointer ${
                isDiscovered
                  ? `${config.badgeBorder} ${config.bgGradient} hover:-translate-y-1.5 hover:shadow-xl hover:border-purple-400/80`
                  : 'border-white/5 bg-white/[0.02] opacity-40 hover:opacity-70'
              }`}
              style={{
                boxShadow: isDiscovered
                  ? isEquipped
                    ? `0 0 24px ${config.glowColor}, inset 0 0 12px ${config.accentColor}33`
                    : `0 0 12px ${config.glowColor}22`
                  : undefined,
              }}
            >
              {/* Dynamic Aura Ambient Radial Lighting */}
              {isDiscovered && (
                <div
                  className="pointer-events-none absolute -inset-1 opacity-25 blur-lg transition-opacity group-hover:opacity-60"
                  style={{ background: `radial-gradient(circle, ${config.accentColor} 0%, transparent 70%)` }}
                />
              )}

              {/* Shimmer Light Sweep on Hover */}
              <div className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 group-hover:translate-x-full" />

              {/* Badges: Favorite & Equipped/Luck Indicator */}
              <div className="relative z-10 flex w-full items-center justify-between">
                {isFavorite ? (
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                ) : (
                  <span className="text-[9px] font-mono text-white/30 font-semibold">
                    {item.isMergeExclusive ? '★ FORGE' : ''}
                  </span>
                )}

                {isEquipped ? (
                  <span className="flex items-center gap-0.5 rounded-md bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-mono font-black uppercase text-emerald-300 border border-emerald-500/50 shadow-sm animate-pulse">
                    ⚡ ACTIVE
                  </span>
                ) : (
                  <span className="text-[9px] font-mono text-emerald-400 font-bold">
                    {formatLuckBonus(item.luckBonus)}
                  </span>
                )}
              </div>

              {/* Glowing Visual Icon Container */}
              <div className="relative z-10 my-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-black/40 p-2 ring-1 ring-white/10 shadow-inner group-hover:scale-110 transition-transform duration-300">
                {isDiscovered && (
                  <div
                    className="absolute inset-0 rounded-2xl opacity-40 blur-sm"
                    style={{ background: config.accentColor }}
                  />
                )}
                {isDiscovered ? (
                  <DynamicIcon
                    name={item.icon}
                    size={28}
                    className={`relative z-10 transition-transform ${config.textColor}`}
                  />
                ) : (
                  <span className="text-xl font-bold text-white/20">?</span>
                )}
              </div>

              {/* Name & Rarity Label */}
              <div className="relative z-10 w-full">
                <h3 className="truncate text-xs font-bold text-white group-hover:text-amber-200 transition-colors">
                  {isDiscovered ? item.name : 'Undiscovered'}
                </h3>
                <span className={`text-[10px] font-mono font-black uppercase tracking-wider ${config.textColor}`}>
                  {config.name}
                </span>
              </div>

              {/* Quantity, Money Multiplier & Rarity Odds Footer */}
              <div className="relative z-10 mt-2 flex w-full items-center justify-between border-t border-white/10 pt-1.5 text-[10px] font-mono">
                <div className="flex items-center gap-1.5">
                  <span className="text-emerald-400 font-bold">
                    {formatLuckBonus(item.luckBonus)}
                  </span>
                  {item.moneyMultiplier && item.moneyMultiplier > 1 && (
                    <span className="text-amber-300 font-semibold bg-amber-500/10 px-1 rounded">
                      {formatMoneyMultiplier(item.moneyMultiplier)}
                    </span>
                  )}
                </div>
                <span className={`font-bold ${isDiscovered ? 'text-white' : 'text-white/30'}`}>
                  {isDiscovered ? `x${count}` : config.oneInChance}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {filteredItems.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 py-12 text-center">
          <Info className="h-8 w-8 text-white/30" />
          <p className="mt-2 text-sm text-white/40">No items match your filter criteria.</p>
          {onlyDiscovered && (
            <button
              onClick={() => setOnlyDiscovered(false)}
              className="mt-3 text-xs text-purple-400 underline font-bold"
            >
              Show all items in Dex
            </button>
          )}
        </div>
      )}

      {/* 7. Pagination Bar (Bottom) */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 py-3">
          <button
            onClick={() => handlePageChange(safePage - 1)}
            disabled={safePage === 1}
            className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-white/10 disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Prev Page</span>
          </button>

          <span className="font-mono text-xs text-white/70 font-bold px-3">
            Page {safePage} of {totalPages}
          </span>

          <button
            onClick={() => handlePageChange(safePage + 1)}
            disabled={safePage === totalPages}
            className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-white/10 disabled:opacity-30"
          >
            <span>Next Page</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* 8. Item Details & Aura Inspect Modal with Live Canvas Visualization */}
      {selectedItemForModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-4 backdrop-blur-md animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              sound.playButtonClick();
              setSelectedItemForModal(null);
            }
          }}
        >
          <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl border border-purple-500/40 bg-[#0c0c12] p-5 sm:p-6 shadow-2xl text-white scrollbar-thin">
            {/* Close Button */}
            <button
              id="close-item-modal-btn"
              onClick={() => {
                sound.playButtonClick();
                setSelectedItemForModal(null);
              }}
              className="absolute right-4 top-4 rounded-full border border-white/10 bg-white/5 p-1.5 text-white/40 hover:bg-white/10 hover:text-white transition"
            >
              <X className="h-4 w-4" />
            </button>

            {(() => {
              const item = selectedItemForModal;
              const config = RARITIES[item.rarity] || RARITIES.common;
              const slot = gameState.inventory[item.id];
              const count = slot?.count || 0;
              const isEquipped = gameState.equippedItemIds?.includes(item.id) || gameState.equippedItemId === item.id;
              const isFavorite = slot?.isFavorite;
              const maxSlots = Math.max(1, 1 + (gameState.upgrades['aura_slots_unlock'] || 0));
              const activeCount = gameState.equippedItemIds?.length || (gameState.equippedItemId ? 1 : 0);

              return (
                <div className="flex flex-col items-center text-center">
                  {/* Interactive Live Aura Canvas Preview ("make grafix") */}
                  <div className="relative flex items-center justify-center">
                    <AuraVisualizerCanvas item={item} size={150} />
                    <div
                      className={`absolute flex h-16 w-16 items-center justify-center rounded-2xl border-2 p-2 shadow-2xl ${config.badgeBorder} ${config.badgeBg}`}
                      style={{ boxShadow: `0 0 30px ${config.glowColor}` }}
                    >
                      <DynamicIcon name={item.icon} size={32} className={config.textColor} />
                    </div>
                  </div>

                  <span
                    className={`mt-2 rounded-full border px-3 py-0.5 text-xs font-mono font-black uppercase ${config.badgeBorder} ${config.badgeBg} ${config.textColor}`}
                  >
                    {config.name} • {config.oneInChance}
                  </span>

                  <h3 className="mt-1.5 text-xl font-black text-white">{item.name}</h3>
                  <p className="text-xs italic text-white/50">"{item.flavorTitle}"</p>

                  {/* Aura Luck Boost Banner or Scrap Banner */}
                  {item.isBrokenGlass ? (
                    <div className="mt-3 w-full rounded-2xl border border-rose-500/40 bg-rose-950/30 p-3 text-center shadow-md">
                      <div className="flex items-center justify-center gap-1.5 text-rose-400 font-extrabold text-sm font-mono">
                        <Coins className="h-4 w-4" />
                        <span>
                          Salvage Value: +{(gameState.upgrades['rebirth_upgrade_15'] || 0) > 0 ? 100 : 10} Rolls Money
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-rose-300/70">
                        {(gameState.upgrades['rebirth_upgrade_15'] || 0) > 0
                          ? '⚡ Rebirth 15 Fix Glass active: Automatically recycles for 100 rolls!'
                          : 'Broken Glass can be sold for 10 rolls each!'}
                      </p>
                    </div>
                  ) : (
                    <div className="mt-3 w-full rounded-2xl border border-emerald-500/40 bg-emerald-950/30 p-3 text-center shadow-md">
                      <div className="flex items-center justify-center gap-1.5 text-emerald-400 font-extrabold text-sm font-mono">
                        <Clover className="h-4 w-4" />
                        <span>Equipped Aura Luck: {formatLuckBonus(item.luckBonus)} Luck</span>
                      </div>
                      <p className="mt-1 text-[11px] text-emerald-300/70">
                        {isEquipped
                          ? `⚡ ACTIVE in Loadout (${activeCount}/${maxSlots} Slots). Click below to unequip.`
                          : `Equip into your loadout (${activeCount}/${maxSlots} Slots) to stack this luck boost!`}
                      </p>
                    </div>
                  )}

                  <p className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-xs leading-relaxed text-white/70">
                    {item.lore}
                  </p>

                  {/* Quantity & Value Stats */}
                  <div className="mt-3.5 grid w-full grid-cols-3 gap-2 text-xs">
                    <div className="rounded-xl border border-white/10 bg-white/5 p-2.5 text-left">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-white/40">Owned:</span>
                      <p className="font-mono font-bold text-white text-sm">x{count}</p>
                    </div>
                    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-2.5 text-left">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400/70">Roll Mult:</span>
                      <p className="font-mono font-bold text-amber-300 text-sm">{formatMoneyMultiplier(item.moneyMultiplier || 1)}</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 p-2.5 text-left">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-white/40">Recycle:</span>
                      <p className="flex flex-col font-mono font-bold text-cyan-300 text-[11px] mt-0.5">
                        <span>+{selectedSell.rolls} Rolls</span>
                        <span className="text-purple-300">+{selectedSell.essence} ess</span>
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 flex w-full flex-col gap-2">
                    {count > 0 ? (
                      <>
                        {!item.isBrokenGlass && (
                          <div className="flex gap-2">
                            <button
                              id="modal-equip-btn"
                              onClick={() => {
                                onEquipItem(item.id);
                                setSelectedItemForModal(null);
                              }}
                              className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-black transition ${
                                isEquipped
                                  ? 'border border-emerald-500/40 bg-emerald-950/40 text-emerald-300 font-mono hover:bg-emerald-950/70'
                                  : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-500 hover:to-blue-500 shadow-md shadow-purple-600/30'
                              }`}
                            >
                              <CheckCircle2 className="h-4 w-4" />
                              <span>
                                {isEquipped
                                  ? 'EQUIPPED • CLICK TO UNEQUIP'
                                  : `EQUIP AURA (${formatLuckBonus(item.luckBonus)} LUCK)`}
                              </span>
                            </button>

                            <button
                              id="modal-favorite-btn"
                              onClick={() => onToggleFavorite(item.id)}
                              className={`flex items-center justify-center rounded-xl border px-3.5 py-2.5 transition ${
                                isFavorite
                                  ? 'border-amber-500/60 bg-amber-950/40 text-amber-300'
                                  : 'border-white/10 bg-white/5 text-white/40 hover:text-white'
                              }`}
                              title={isFavorite ? 'Remove Favorite' : 'Lock / Favorite'}
                            >
                              <Star className={`h-4 w-4 ${isFavorite ? 'fill-amber-400' : ''}`} />
                            </button>
                          </div>
                        )}

                        {/* Merge Duplicate Action if count >= 3 */}
                        {count >= 3 && !item.isBrokenGlass && !item.id.startsWith('fused_') && onFuseDuplicates && (
                          <button
                            id="modal-fuse-duplicate-btn"
                            onClick={() => {
                              sound.playButtonClick();
                              setShowMergeConfirmItem(item);
                            }}
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 via-rose-600 to-purple-600 py-2.5 text-xs font-black text-white shadow-lg shadow-amber-500/20 transition hover:scale-[1.02] active:scale-95 cursor-pointer"
                          >
                            <Atom className="h-4 w-4" />
                            <span>MERGE 3x IN FORGE (+250% LUCK)</span>
                          </button>
                        )}

                        {/* Sell Actions */}
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <button
                            id="modal-sell-one-btn"
                            onClick={() => {
                              onSellItem(item.id, 1);
                              if (count <= 1) setSelectedItemForModal(null);
                            }}
                            className="rounded-xl border border-white/10 bg-white/5 py-2 font-bold text-white/70 transition hover:bg-white/10 hover:text-white cursor-pointer"
                          >
                            Sell 1
                          </button>

                          <button
                            id="modal-sell-duplicates-btn"
                            disabled={count <= 1}
                            onClick={() => {
                              onSellItem(item.id, count - 1);
                            }}
                            className="rounded-xl border border-white/10 bg-white/5 py-2 font-bold text-white/70 transition hover:bg-white/10 hover:text-white disabled:opacity-30 cursor-pointer"
                          >
                            Sell Extras ({Math.max(0, count - 1)})
                          </button>

                          <button
                            id="modal-sell-all-btn"
                            onClick={() => {
                              onSellItem(item.id, count);
                              setSelectedItemForModal(null);
                            }}
                            className="rounded-xl border border-rose-500/30 bg-rose-950/30 py-2 font-bold text-rose-300 transition hover:bg-rose-950/60 cursor-pointer"
                          >
                            Sell All ({count})
                          </button>
                        </div>
                      </>
                    ) : (
                      <p className="text-xs text-white/40">
                        Roll the wheel of fortune to discover this aura and unlock its {formatLuckBonus(item.luckBonus)} Luck boost!
                      </p>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* 9. Merge Confirmation Dialog */}
      {showMergeConfirmItem && (
        <div
          id="inventory-merge-confirm-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              sound.playButtonClick();
              setShowMergeConfirmItem(null);
            }
          }}
        >
          <div
            id="inventory-merge-confirm-dialog"
            className="relative w-full max-w-md overflow-hidden rounded-3xl border-2 border-amber-500/50 bg-[#0e0e18] p-6 text-center shadow-2xl shadow-amber-950/60 animate-in zoom-in-95 duration-200"
          >
            <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-48 w-48 rounded-full bg-amber-500/20 blur-3xl" />

            <div className="relative z-10 flex flex-col items-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-amber-500/60 bg-gradient-to-br from-amber-500/30 via-rose-600/30 to-purple-600/30 shadow-xl shadow-amber-500/30">
                <Flame className="h-8 w-8 text-amber-300 animate-pulse" />
              </div>

              <h2 className="mt-4 text-xl sm:text-2xl font-black text-white tracking-tight">
                Do you want to merge?
              </h2>

              <div className="mt-3 w-full rounded-2xl border border-purple-500/30 bg-purple-950/20 p-4 text-left">
                <div className="flex items-center gap-2 mb-1.5">
                  <Atom className="h-4 w-4 text-purple-400 shrink-0" />
                  <span className="font-black text-purple-300 text-sm">
                    3x {showMergeConfirmItem.name} Copies
                  </span>
                </div>
                <p className="text-xs text-white/70 leading-relaxed mb-3">
                  3 duplicate copies will be consumed to forge a permanent <strong className="text-white">Fused {showMergeConfirmItem.name}</strong> aura with a <strong className="text-emerald-400">+250% Luck Boost</strong>.
                </p>
                <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-950/30 px-3 py-2 text-xs">
                  <span className="text-emerald-400 font-semibold">New Fused Luck:</span>
                  <span className="font-mono font-black text-emerald-300">
                    +{formatLuckBonus(Number((showMergeConfirmItem.luckBonus * 2.5).toFixed(2)))} Luck
                  </span>
                </div>
              </div>

              <div className="mt-6 grid w-full grid-cols-2 gap-3">
                <button
                  id="inv-confirm-merge-no-btn"
                  onClick={() => {
                    sound.playButtonClick();
                    setShowMergeConfirmItem(null);
                  }}
                  className="flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/5 py-3 text-sm font-bold text-white/80 transition hover:bg-white/10 hover:text-white active:scale-95 cursor-pointer"
                >
                  <X className="h-4 w-4 text-white/60" />
                  <span>No, Cancel</span>
                </button>

                <button
                  id="inv-confirm-merge-yes-btn"
                  onClick={() => {
                    sound.playUpgrade();
                    if (onFuseDuplicates) {
                      onFuseDuplicates(showMergeConfirmItem.id, 3);
                    }
                    setShowMergeConfirmItem(null);
                    setSelectedItemForModal(null);
                  }}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 py-3 text-sm font-black text-white shadow-xl shadow-emerald-500/30 transition hover:from-emerald-400 hover:to-teal-400 hover:scale-[1.02] active:scale-95 cursor-pointer"
                >
                  <Check className="h-4 w-4" />
                  <span>Yes, Merge!</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const InventoryView = React.memo(InventoryViewComponent);
