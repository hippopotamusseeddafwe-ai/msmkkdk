import React, { useState, useMemo } from 'react';
import { GameState, Item, MergeRecipe, RarityTier, InventorySlot } from '../types';
import { ITEMS_BY_ID } from '../data/items';
import { RARITIES, RARITY_ORDER } from '../data/rarities';
import { MERGE_RECIPES } from '../data/mergeRecipes';
import { formatBigNumber, formatLuckBonus, getNaniSinghUnlockProgress } from '../utils/rngEngine';
import { sound } from '../utils/audio';
import { DynamicIcon } from './DynamicIcon';
import {
  Flame,
  Atom,
  Sparkles,
  Zap,
  Layers,
  ArrowRight,
  CheckCircle2,
  Lock,
  Plus,
  Coins,
  Shield,
  Star,
  Info,
  Check,
  X,
  HelpCircle,
  Crown,
} from 'lucide-react';

interface MergeMachineViewProps {
  gameState: GameState;
  onFuseDuplicates: (itemId: string, countToConsume?: number) => void;
  onFuseRecipe: (recipe: MergeRecipe) => void;
  onQuickFuseAllDuplicates: () => void;
  onEquipItem: (itemId: string) => void;
}

type MergeConfirmState =
  | { type: 'recipe'; recipe: MergeRecipe }
  | { type: 'duplicate'; itemId: string; count: number }
  | { type: 'quick_all'; count: number };

const MergeMachineViewComponent: React.FC<MergeMachineViewProps> = ({
  gameState,
  onFuseDuplicates,
  onFuseRecipe,
  onQuickFuseAllDuplicates,
  onEquipItem,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'blueprints' | 'duplicates'>('blueprints');
  const [selectedRecipe, setSelectedRecipe] = useState<MergeRecipe | null>(MERGE_RECIPES[0]);
  const [justFusedItem, setJustFusedItem] = useState<Item | null>(null);
  const [mergeToConfirm, setMergeToConfirm] = useState<MergeConfirmState | null>(null);

  // Group player's duplicates: items with count >= 3
  const duplicateSlots = useMemo(() => {
    return (Object.entries(gameState.inventory) as [string, InventorySlot][])
      .map(([id, slot]) => {
        const item = ITEMS_BY_ID[id];
        return { item, slot };
      })
      .filter(({ item, slot }) => item && slot && slot.count >= 3 && !item.id.startsWith('fused_') && item.id !== 'broken_glass')
      .sort((a, b) => {
        const rankA = RARITY_ORDER.indexOf(a.item.rarity);
        const rankB = RARITY_ORDER.indexOf(b.item.rarity);
        if (rankB !== rankA) return rankB - rankA;
        return b.slot.count - a.slot.count;
      });
  }, [gameState.inventory]);

  // Count total available duplicate units
  const totalDuplicateUnits = useMemo(() => {
    return duplicateSlots.reduce((acc, curr) => acc + Math.floor(curr.slot.count / 3), 0);
  }, [duplicateSlots]);

  // Check if player meets a specific recipe's requirements
  const checkRecipeEligibility = (recipe: MergeRecipe) => {
    if (gameState.essence < recipe.requiredEssence) {
      return { eligible: false, missingEssence: recipe.requiredEssence - gameState.essence };
    }

    if (recipe.requiresNaniSinghRarityUnlocked) {
      const naniProgress = getNaniSinghUnlockProgress(gameState);
      const hasNaniItem = (Object.entries(gameState.inventory) as [string, InventorySlot][]).some(([id, slot]) => {
        const it = ITEMS_BY_ID[id];
        return it && it.rarity === 'nani_singh' && slot.count > 0;
      });
      if (!naniProgress.isFullyUnlocked && !hasNaniItem) {
        return { eligible: false, reason: `Requires 100% Full Nani Singh Rarity Unlocked (${naniProgress.overallPercent}% completed)` };
      }
    }

    if (recipe.requiredRollsCost) {
      const playerRolls = gameState.rolls ?? gameState.coins ?? 0;
      if (playerRolls < recipe.requiredRollsCost) {
        return { eligible: false, reason: `Need 25 Googol Rolls (${formatBigNumber(recipe.requiredRollsCost)})` };
      }
    }

    for (const req of recipe.requiredItems) {
      if (req.itemId) {
        const count = gameState.inventory[req.itemId]?.count || 0;
        if (count < req.count) {
          return { eligible: false, reason: `Missing ${req.count - count}x ${ITEMS_BY_ID[req.itemId]?.name || req.itemId}` };
        }
      } else if (req.rarity) {
        const ownedOfRarity = (Object.entries(gameState.inventory) as [string, InventorySlot][]).reduce((sum, [id, slot]) => {
          const it = ITEMS_BY_ID[id];
          if (it && it.rarity === req.rarity && !it.isBrokenGlass) {
            return sum + slot.count;
          }
          return sum;
        }, 0);

        if (ownedOfRarity < req.count) {
          return { eligible: false, reason: `Need ${req.count}x duplicates of ${RARITIES[req.rarity]?.name || req.rarity}` };
        }
      }
    }

    return { eligible: true };
  };

  const handleExecuteRecipe = (recipe: MergeRecipe) => {
    const check = checkRecipeEligibility(recipe);
    if (!check.eligible) return;

    sound.playUpgrade();
    sound.playDrop(recipe.resultItem.rarity, true);
    setJustFusedItem(recipe.resultItem);
    onFuseRecipe(recipe);
  };

  const handleExecuteDuplicate = (itemId: string) => {
    const item = ITEMS_BY_ID[itemId];
    if (!item) return;

    sound.playUpgrade();
    const boostedLuck = Number((item.luckBonus * 2.5).toFixed(2));
    const fusedItemPreview: Item = {
      ...item,
      id: `fused_${item.id}`,
      name: `Fused ${item.name}`,
      luckBonus: boostedLuck,
      baseValue: item.baseValue * 3,
      essenceValue: item.essenceValue * 3,
      flavorTitle: `Transcended Masterpiece`,
      lore: `Created by merging 3 duplicate copies in the Merge Machine! Grants +250% increased luck bonus.`,
      isMergedVariant: true,
    };
    setJustFusedItem(fusedItemPreview);
    onFuseDuplicates(itemId, 3);
  };

  const handleConfirmMerge = () => {
    if (!mergeToConfirm) return;

    if (mergeToConfirm.type === 'recipe') {
      handleExecuteRecipe(mergeToConfirm.recipe);
    } else if (mergeToConfirm.type === 'duplicate') {
      handleExecuteDuplicate(mergeToConfirm.itemId);
    } else if (mergeToConfirm.type === 'quick_all') {
      sound.playUpgrade();
      onQuickFuseAllDuplicates();
    }

    setMergeToConfirm(null);
  };

  return (
    <div className="flex flex-col gap-5 max-w-5xl mx-auto pb-10">
      {/* Top Banner / Machine Introduction */}
      <div className="relative overflow-hidden rounded-2xl border border-amber-500/40 bg-gradient-to-br from-amber-950/40 via-purple-950/40 to-[#0a0a0f] p-4 sm:p-6 shadow-xl shadow-amber-950/20">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 via-rose-600 to-purple-600 shadow-lg shadow-amber-500/30">
              <Flame className="h-6 w-6 sm:h-7 sm:w-7 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Merge Machine Forge
                </h1>
                <span className="rounded-full border border-amber-500/50 bg-amber-900/40 px-2 py-0.5 text-[10px] font-mono font-bold text-amber-300">
                  EXCLUSIVE BLUEPRINTS & FUSIONS
                </span>
              </div>
              <p className="text-xs sm:text-sm text-white/60 mt-0.5 max-w-xl">
                Craft exclusive god-tier auras that <span className="text-amber-300 font-bold">cannot be rolled anywhere else</span> or merge 3x duplicates for a +250% luck boost!
              </p>
            </div>
          </div>

          {/* Quick Balance & Duplicates Badge */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="rounded-xl border border-purple-500/30 bg-purple-950/30 px-3 py-2 text-center">
              <span className="text-[9px] font-mono uppercase text-purple-300 font-bold">Astral Essence</span>
              <p className="font-mono text-sm sm:text-base font-black text-purple-200">{formatBigNumber(gameState.essence)}</p>
            </div>
            <div className="rounded-xl border border-amber-500/30 bg-amber-950/30 px-3 py-2 text-center">
              <span className="text-[9px] font-mono uppercase text-amber-300 font-bold">Eligible Merges</span>
              <p className="font-mono text-sm sm:text-base font-black text-amber-300">{totalDuplicateUnits} Stacks</p>
            </div>
          </div>
        </div>
      </div>

      {/* Mode Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <button
            id="tab-merge-blueprints"
            onClick={() => {
              sound.playButtonClick();
              setActiveSubTab('blueprints');
            }}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition shadow-sm cursor-pointer ${
              activeSubTab === 'blueprints'
                ? 'bg-gradient-to-r from-amber-500 to-rose-600 text-white shadow-amber-500/30'
                : 'border border-white/10 bg-white/5 text-white/60 hover:text-white'
            }`}
          >
            <Sparkles className="h-4 w-4" />
            <span>Exclusive Merge Blueprints ({MERGE_RECIPES.length})</span>
          </button>

          <button
            id="tab-merge-duplicates"
            onClick={() => {
              sound.playButtonClick();
              setActiveSubTab('duplicates');
            }}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition shadow-sm cursor-pointer ${
              activeSubTab === 'duplicates'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-purple-600/30'
                : 'border border-white/10 bg-white/5 text-white/60 hover:text-white'
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>Duplicate Transmutation ({duplicateSlots.length})</span>
          </button>
        </div>

        {activeSubTab === 'duplicates' && duplicateSlots.length > 0 && (
          <button
            id="quick-merge-all-btn"
            onClick={() => {
              sound.playButtonClick();
              setMergeToConfirm({ type: 'quick_all', count: totalDuplicateUnits });
            }}
            className="flex items-center gap-1.5 rounded-xl border border-amber-500/50 bg-amber-950/40 px-3.5 py-2 text-xs font-bold text-amber-300 transition hover:bg-amber-950/70 shadow-md cursor-pointer"
          >
            <Flame className="h-4 w-4 text-amber-400" />
            <span>Quick Merge All Duplicates ({totalDuplicateUnits})</span>
          </button>
        )}
      </div>

      {/* Sub-Tab 1: Exclusive Merge Blueprints */}
      {activeSubTab === 'blueprints' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left: Recipe List */}
          <div className="lg:col-span-2 flex flex-col gap-3">
            <div className="flex items-center justify-between text-xs text-white/50 px-1">
              <span className="font-bold uppercase tracking-wider">Select Exclusive Merge Blueprint</span>
              <span>Click Blueprint to Inspect or Merge</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {MERGE_RECIPES.map((recipe) => {
                const item = recipe.resultItem;
                const config = RARITIES[item.rarity] || RARITIES.common;
                const isSelected = selectedRecipe?.id === recipe.id;
                const eligibility = checkRecipeEligibility(recipe);

                return (
                  <div
                    key={recipe.id}
                    id={`recipe-card-${recipe.id}`}
                    onClick={() => {
                      sound.playButtonClick();
                      setSelectedRecipe(recipe);
                    }}
                    className={`cursor-pointer rounded-2xl border p-3.5 transition flex flex-col justify-between gap-3 ${
                      isSelected
                        ? 'border-amber-500 bg-amber-950/25 shadow-lg shadow-amber-950/50 scale-[1.01]'
                        : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-2 ${config.badgeBorder} ${config.badgeBg}`}
                        style={{ boxShadow: isSelected ? `0 0 16px ${config.glowColor}` : undefined }}
                      >
                        <DynamicIcon name={item.icon} size={24} className={config.textColor} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`rounded-md border px-1.5 py-0.2 text-[9px] font-mono font-bold uppercase ${config.badgeBorder} ${config.badgeBg} ${config.textColor}`}
                          >
                            {config.name}
                          </span>
                          <span className="rounded-md border border-amber-500/40 bg-amber-950/50 px-1.5 py-0.2 text-[9px] font-mono font-bold text-amber-300">
                            EXCLUSIVE
                          </span>
                        </div>
                        <h4 className="font-black text-white text-xs sm:text-sm mt-1 truncate">{item.name}</h4>
                        <p className="text-[11px] font-mono font-bold text-emerald-400">+{formatLuckBonus(item.luckBonus)} Luck</p>
                      </div>
                    </div>

                    {/* Requirements Preview & Merge Quick Action */}
                    <div className="flex items-center justify-between pt-2.5 border-t border-white/10 text-[10px]">
                      <span className="text-white/40">
                        {recipe.requiredItems.length} Ingredients • {recipe.requiredEssence} Ess
                      </span>

                      {eligibility.eligible ? (
                        <button
                          id={`quick-merge-recipe-${recipe.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            sound.playButtonClick();
                            setSelectedRecipe(recipe);
                            setMergeToConfirm({ type: 'recipe', recipe });
                          }}
                          className="flex items-center gap-1 rounded-lg bg-gradient-to-r from-amber-500 to-rose-600 px-2.5 py-1 font-bold text-white shadow-sm hover:brightness-110 active:scale-95 cursor-pointer"
                        >
                          <Sparkles className="h-3 w-3" />
                          <span>Merge Now</span>
                        </button>
                      ) : (
                        <span className="flex items-center gap-1 font-medium text-white/40">
                          <Lock className="h-3 w-3 text-rose-400" /> Locked
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Active Merge Chamber Preview */}
          <div className="flex flex-col gap-4">
            {selectedRecipe && (
              <div className="rounded-2xl border border-amber-500/40 bg-[#0d0d14] p-4 sm:p-5 shadow-2xl flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Crown className="h-4 w-4 text-amber-400" />
                    <span className="text-[10px] font-mono font-bold uppercase text-amber-400 tracking-wider">
                      EXCLUSIVE FORGE CHAMBER
                    </span>
                  </div>
                  <span className="rounded-md border border-rose-500/30 bg-rose-950/30 px-2 py-0.5 text-[10px] font-bold text-rose-300">
                    CANNOT BE ROLLED
                  </span>
                </div>

                {/* Result Aura Display */}
                {(() => {
                  const item = selectedRecipe.resultItem;
                  const config = RARITIES[item.rarity] || RARITIES.common;
                  const eligibility = checkRecipeEligibility(selectedRecipe);

                  return (
                    <div className="flex flex-col items-center text-center">
                      <div
                        className={`flex h-16 w-16 items-center justify-center rounded-2xl border-2 p-2.5 ${config.badgeBorder} ${config.badgeBg}`}
                        style={{ boxShadow: `0 0 20px ${config.glowColor}` }}
                      >
                        <DynamicIcon name={item.icon} size={32} className={config.textColor} />
                      </div>

                      <h3 className="mt-2.5 text-base font-black text-white">{item.name}</h3>
                      <p className="text-[11px] font-mono font-bold text-emerald-400">
                        ⚡ Equipped Luck Boost: +{formatLuckBonus(item.luckBonus)} Luck
                      </p>
                      <p className="mt-2 text-xs text-white/60 leading-relaxed bg-white/5 p-2.5 rounded-xl border border-white/10 w-full text-left">
                        {item.lore}
                      </p>

                      {/* Required Ingredients Checklist */}
                      <div className="mt-3.5 w-full flex flex-col gap-2 text-left">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                          Required Fusion Materials (3 Ingredients for Supreme Fusions)
                        </span>

                        {selectedRecipe.requiresNaniSinghRarityUnlocked && (() => {
                          const naniProgress = getNaniSinghUnlockProgress(gameState);
                          const hasNaniItem = (Object.entries(gameState.inventory) as [string, InventorySlot][]).some(([id, slot]) => {
                            const it = ITEMS_BY_ID[id];
                            return it && it.rarity === 'nani_singh' && slot.count > 0;
                          });
                          const isUnlocked = naniProgress.isFullyUnlocked || hasNaniItem;

                          return (
                            <div
                              className={`flex items-center justify-between rounded-xl border p-2 text-xs ${
                                isUnlocked
                                  ? 'border-emerald-500/30 bg-emerald-950/20 text-emerald-300'
                                  : 'border-amber-500/30 bg-amber-950/20 text-amber-300'
                              }`}
                            >
                              <span className="font-semibold">Ingredient 1: Full Nani Singh Rarity</span>
                              <span className="font-mono font-bold">
                                {isUnlocked ? '100% UNLOCKED' : `${naniProgress.overallPercent}% PROGRESS`}
                              </span>
                            </div>
                          );
                        })()}

                        {/* Essence requirement (DD Ess) */}
                        <div
                          className={`flex items-center justify-between rounded-xl border p-2 text-xs ${
                            gameState.essence >= selectedRecipe.requiredEssence
                              ? 'border-purple-500/30 bg-purple-950/20 text-purple-300'
                              : 'border-white/10 bg-white/5 text-white/70'
                          }`}
                        >
                          <span className="font-semibold">
                            {selectedRecipe.requiresNaniSinghRarityUnlocked ? 'Ingredient 2: DD Essence (Damala Ess)' : 'Astral Essence'}
                          </span>
                          <span className="font-mono font-bold">
                            {formatBigNumber(gameState.essence)} / {formatBigNumber(selectedRecipe.requiredEssence)}
                          </span>
                        </div>

                        {/* Rolls requirement (e.g. 25 Googol rolls) */}
                        {selectedRecipe.requiredRollsCost && (
                          <div
                            className={`flex items-center justify-between rounded-xl border p-2 text-xs ${
                              (gameState.rolls ?? gameState.coins ?? 0) >= selectedRecipe.requiredRollsCost
                                ? 'border-amber-500/30 bg-amber-950/20 text-amber-300'
                                : 'border-white/10 bg-white/5 text-white/70'
                            }`}
                          >
                            <span className="font-semibold">Ingredient 3: Googol Rolls</span>
                            <span className="font-mono font-bold">
                              {formatBigNumber(gameState.rolls ?? gameState.coins ?? 0)} / {formatBigNumber(selectedRecipe.requiredRollsCost)}
                            </span>
                          </div>
                        )}

                        {selectedRecipe.requiredItems.map((req, idx) => {
                          let label = '';
                          let owned = 0;
                          let required = req.count;

                          if (req.itemId) {
                            label = ITEMS_BY_ID[req.itemId]?.name || req.itemId;
                            owned = gameState.inventory[req.itemId]?.count || 0;
                          } else if (req.rarity) {
                            label = `${RARITIES[req.rarity]?.name || req.rarity} Item`;
                            owned = (Object.entries(gameState.inventory) as [string, InventorySlot][]).reduce((sum, [id, slot]) => {
                              const it = ITEMS_BY_ID[id];
                              if (it && it.rarity === req.rarity && !it.isBrokenGlass) {
                                return sum + slot.count;
                              }
                              return sum;
                            }, 0);
                          }

                          const hasEnough = owned >= required;

                          return (
                            <div
                              key={idx}
                              className={`flex items-center justify-between rounded-xl border p-2 text-xs ${
                                hasEnough
                                  ? 'border-emerald-500/30 bg-emerald-950/20 text-emerald-300'
                                  : 'border-white/10 bg-white/5 text-white/70'
                              }`}
                            >
                              <span className="font-semibold">{label}</span>
                              <span className="font-mono font-bold">
                                {owned} / {required}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Fuse Button with Confirmation trigger */}
                      <button
                        id="execute-fuse-recipe-btn"
                        disabled={!eligibility.eligible}
                        onClick={() => {
                          sound.playButtonClick();
                          setMergeToConfirm({ type: 'recipe', recipe: selectedRecipe });
                        }}
                        className={`mt-4 w-full flex items-center justify-center gap-2 rounded-xl py-3 text-xs font-black tracking-wide transition shadow-lg ${
                          eligibility.eligible
                            ? 'bg-gradient-to-r from-amber-500 via-rose-600 to-purple-600 text-white shadow-amber-500/30 hover:scale-[1.02] active:scale-95 cursor-pointer'
                            : 'cursor-not-allowed border border-white/10 bg-white/5 text-white/30'
                        }`}
                      >
                        <Sparkles className="h-4 w-4" />
                        <span>MERGE EXCLUSIVE BLUEPRINT</span>
                      </button>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sub-Tab 2: Duplicate Transmutation (Fuse any 3x duplicate aura) */}
      {activeSubTab === 'duplicates' && (
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-xs text-white/60 flex items-center gap-2">
            <Info className="h-4 w-4 text-purple-400 shrink-0" />
            <span>
              Every aura with 3+ duplicates in your inventory can be merged to unlock its <strong className="text-purple-300">Transcended Fused form (+250% Luck)</strong>, or you can still recycle them for rolls in the Dex!
            </span>
          </div>

          {duplicateSlots.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center text-white/50">
              <Layers className="h-8 w-8 text-white/20 mx-auto mb-2" />
              <p className="font-bold text-sm">No Duplicate Stacks Found (3+ needed)</p>
              <p className="text-xs text-white/40 mt-1">Roll more items to collect duplicates to merge in the forge!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {duplicateSlots.map(({ item, slot }) => {
                const config = RARITIES[item.rarity] || RARITIES.common;
                const canFuse = slot.count >= 3;
                const boostedLuck = Number((item.luckBonus * 2.5).toFixed(2));

                return (
                  <div
                    key={item.id}
                    id={`dup-merge-card-${item.id}`}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 flex flex-col justify-between gap-3 hover:border-purple-500/30 transition"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${config.badgeBorder} ${config.badgeBg}`}
                      >
                        <DynamicIcon name={item.icon} size={22} className={config.textColor} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`rounded-md border px-1.5 py-0.2 text-[9px] font-mono font-bold uppercase ${config.badgeBorder} ${config.badgeBg} ${config.textColor}`}
                          >
                            {config.name}
                          </span>
                          <span className="text-[10px] font-mono font-bold text-amber-300">
                            x{slot.count} Owned
                          </span>
                        </div>
                        <h4 className="font-bold text-white text-xs sm:text-sm mt-0.5 truncate">{item.name}</h4>
                        <p className="text-[10px] text-white/40 mt-0.5">
                          Normal: +{formatLuckBonus(item.luckBonus)} Luck
                        </p>
                      </div>
                    </div>

                    <div className="rounded-xl border border-purple-500/30 bg-purple-950/20 p-2 text-center text-xs">
                      <span className="text-[10px] font-mono uppercase text-purple-300 font-bold">Merge 3x into Fused Aura</span>
                      <p className="font-mono font-black text-emerald-300 text-xs mt-0.5">
                        +{formatLuckBonus(boostedLuck)} Luck (+250% Power)
                      </p>
                    </div>

                    <button
                      id={`fuse-dup-btn-${item.id}`}
                      disabled={!canFuse}
                      onClick={() => {
                        sound.playButtonClick();
                        setMergeToConfirm({ type: 'duplicate', itemId: item.id, count: 3 });
                      }}
                      className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 py-2 text-xs font-bold text-white transition hover:from-purple-500 hover:to-indigo-500 active:scale-95 shadow-md shadow-purple-600/30 cursor-pointer"
                    >
                      <Atom className="h-3.5 w-3.5" />
                      <span>FUSE 3x DUPLICATES</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* CONFIRMATION MODAL: "Do you want to merge? Yes / No" */}
      {mergeToConfirm && (
        <div
          id="merge-confirmation-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              sound.playButtonClick();
              setMergeToConfirm(null);
            }
          }}
        >
          <div
            id="merge-confirmation-dialog"
            className="relative w-full max-w-md overflow-hidden rounded-3xl border-2 border-amber-500/60 bg-[#0e0e18] p-6 text-center shadow-2xl shadow-amber-950/70 animate-in zoom-in-95 duration-200"
          >
            {/* Background ambient lighting */}
            <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-48 w-48 rounded-full bg-amber-500/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 left-1/2 -translate-x-1/2 h-48 w-48 rounded-full bg-purple-600/20 blur-3xl" />

            <div className="relative z-10 flex flex-col items-center">
              {/* Top Blueprint/Fusion Badge */}
              <span className="rounded-full border border-amber-500/50 bg-amber-950/50 px-3 py-1 text-[11px] font-mono font-bold text-amber-300 uppercase tracking-wider">
                {mergeToConfirm.type === 'recipe' ? 'EXCLUSIVE BLUEPRINT FORGE' : 'MERGE MACHINE CONFIRMATION'}
              </span>

              {/* Icon / Result Aura Preview */}
              {mergeToConfirm.type === 'recipe' ? (
                (() => {
                  const item = mergeToConfirm.recipe.resultItem;
                  const config = RARITIES[item.rarity] || RARITIES.common;
                  return (
                    <div
                      className={`mt-4 flex h-20 w-20 items-center justify-center rounded-3xl border-2 p-3 ${config.badgeBorder} ${config.badgeBg}`}
                      style={{ boxShadow: `0 0 25px ${config.glowColor}` }}
                    >
                      <DynamicIcon name={item.icon} size={40} className={config.textColor} />
                    </div>
                  );
                })()
              ) : (
                <div className="mt-4 flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-amber-500/60 bg-gradient-to-br from-amber-500/30 via-rose-600/30 to-purple-600/30 shadow-xl shadow-amber-500/30">
                  <Flame className="h-8 w-8 text-amber-300 animate-pulse" />
                </div>
              )}

              {/* Title Header */}
              <h2 className="mt-4 text-xl sm:text-2xl font-black text-white tracking-tight">
                {mergeToConfirm.type === 'recipe'
                  ? 'Do you want to merge this exclusive Blueprint?'
                  : 'Do you want to merge?'}
              </h2>

              {/* Blueprint details */}
              {mergeToConfirm.type === 'recipe' && (() => {
                const recipe = mergeToConfirm.recipe;
                const item = recipe.resultItem;
                const config = RARITIES[item.rarity] || RARITIES.common;

                return (
                  <div className="mt-3.5 w-full rounded-2xl border border-amber-500/40 bg-amber-950/20 p-4 text-left">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-amber-400 shrink-0" />
                        <span className="font-black text-white text-sm sm:text-base">
                          {item.name}
                        </span>
                      </div>
                      <span className={`rounded-md border px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase ${config.badgeBorder} ${config.badgeBg} ${config.textColor}`}>
                        {config.name}
                      </span>
                    </div>

                    <p className="text-xs text-white/70 leading-relaxed mb-3">
                      This will consume the required fusion materials and <span className="text-purple-300 font-bold">{recipe.requiredEssence} Astral Essence</span> to create this exclusive God-Tier aura.
                    </p>

                    {/* Ingredients summary */}
                    <div className="flex flex-col gap-1.5 mb-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                        Materials to be consumed:
                      </span>
                      {recipe.requiredItems.map((req, i) => {
                        const name = req.itemId ? ITEMS_BY_ID[req.itemId]?.name || req.itemId : `${RARITIES[req.rarity || 'common']?.name} Duplicates`;
                        return (
                          <div key={i} className="flex items-center justify-between text-xs text-white/80 bg-white/5 px-2.5 py-1.5 rounded-lg border border-white/10">
                            <span className="font-medium">• {name}</span>
                            <span className="font-mono font-bold text-amber-300">{req.count}x</span>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-950/30 px-3 py-2 text-xs">
                      <span className="text-emerald-400 font-semibold">Equipped Luck Bonus:</span>
                      <span className="font-mono font-black text-emerald-300">
                        +{formatLuckBonus(item.luckBonus)} Luck
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Duplicate details */}
              {mergeToConfirm.type === 'duplicate' && (() => {
                const item = ITEMS_BY_ID[mergeToConfirm.itemId];
                const boostedLuck = item ? Number((item.luckBonus * 2.5).toFixed(2)) : 0;
                return (
                  <div className="mt-3 w-full rounded-2xl border border-purple-500/30 bg-purple-950/20 p-4 text-left">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Atom className="h-4 w-4 text-purple-400 shrink-0" />
                      <span className="font-black text-purple-300 text-sm">
                        3x {item?.name || 'Duplicates'}
                      </span>
                    </div>
                    <p className="text-xs text-white/70 leading-relaxed mb-3">
                      3 duplicate copies will be permanently combined into 1 <strong className="text-white">Fused {item?.name}</strong> aura.
                    </p>
                    <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-950/30 px-3 py-2 text-xs">
                      <span className="text-emerald-400 font-semibold">Fused Transcended Luck:</span>
                      <span className="font-mono font-black text-emerald-300">
                        +{formatLuckBonus(boostedLuck)} Luck (+250%)
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Quick All details */}
              {mergeToConfirm.type === 'quick_all' && (
                <div className="mt-3 w-full rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4 text-left">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Layers className="h-4 w-4 text-amber-400 shrink-0" />
                    <span className="font-black text-amber-300 text-sm">
                      Quick Merge All Duplicates ({mergeToConfirm.count} Stacks)
                    </span>
                  </div>
                  <p className="text-xs text-white/70 leading-relaxed">
                    This will automatically fuse all sets of 3x duplicate auras into their high-powered <strong className="text-purple-300">Fused versions (+250% Luck)</strong>.
                  </p>
                </div>
              )}

              {/* Action Buttons: YES and NO */}
              <div className="mt-6 grid w-full grid-cols-2 gap-3">
                <button
                  id="confirm-merge-no-btn"
                  onClick={() => {
                    sound.playButtonClick();
                    setMergeToConfirm(null);
                  }}
                  className="flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/5 py-3 text-sm font-bold text-white/80 transition hover:bg-white/10 hover:text-white active:scale-95 cursor-pointer"
                >
                  <X className="h-4 w-4 text-white/60" />
                  <span>No, Cancel</span>
                </button>

                <button
                  id="confirm-merge-yes-btn"
                  onClick={handleConfirmMerge}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 py-3 text-sm font-black text-white shadow-xl shadow-emerald-500/30 transition hover:from-emerald-400 hover:to-teal-400 hover:scale-[1.02] active:scale-95 cursor-pointer"
                >
                  <Check className="h-4 w-4" />
                  <span>
                    {mergeToConfirm.type === 'recipe' ? 'Yes, Merge Blueprint!' : 'Yes, Merge!'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MERGE SUCCESS CELEBRATION MODAL */}
      {justFusedItem && (
        <div
          id="fused-item-modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
        >
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl border-2 border-emerald-500/60 bg-[#0d0d16] p-6 text-center shadow-2xl shadow-emerald-950/60 animate-in zoom-in-95 duration-200">
            <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 h-44 w-44 rounded-full bg-emerald-500/20 blur-3xl" />

            <div className="relative z-10 flex flex-col items-center">
              <span className="rounded-full border border-emerald-500/40 bg-emerald-950/40 px-3 py-1 text-[11px] font-mono font-bold text-emerald-300 uppercase tracking-wider">
                FUSION COMPLETE!
              </span>

              {/* Item Icon */}
              {(() => {
                const config = RARITIES[justFusedItem.rarity] || RARITIES.common;
                return (
                  <div
                    className={`mt-4 flex h-20 w-20 items-center justify-center rounded-3xl border-2 p-3 ${config.badgeBorder} ${config.badgeBg}`}
                    style={{ boxShadow: `0 0 25px ${config.glowColor}` }}
                  >
                    <DynamicIcon name={justFusedItem.icon} size={42} className={config.textColor} />
                  </div>
                );
              })()}

              <h3 className="mt-3 text-xl font-black text-white">{justFusedItem.name}</h3>
              <p className="text-xs font-mono font-bold text-emerald-400 mt-1">
                ⚡ Transcended Luck: +{formatLuckBonus(justFusedItem.luckBonus)} Luck
              </p>
              <p className="mt-2 text-xs text-white/60 leading-relaxed bg-white/5 p-3 rounded-2xl border border-white/10 w-full text-left">
                {justFusedItem.lore}
              </p>

              <div className="mt-5 flex w-full flex-col gap-2.5">
                <button
                  id="equip-fused-item-btn"
                  onClick={() => {
                    sound.playDrop('epic');
                    onEquipItem(justFusedItem.id);
                    setJustFusedItem(null);
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 py-3 text-xs font-black text-white shadow-lg shadow-emerald-500/30 transition hover:from-emerald-400 hover:to-teal-500 active:scale-95 cursor-pointer"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>EQUIP TO AURA LOADOUT</span>
                </button>

                <button
                  id="close-fused-item-btn"
                  onClick={() => {
                    sound.playButtonClick();
                    setJustFusedItem(null);
                  }}
                  className="flex w-full items-center justify-center rounded-2xl border border-white/10 bg-white/5 py-2.5 text-xs font-bold text-white/70 transition hover:bg-white/10 hover:text-white active:scale-95 cursor-pointer"
                >
                  <span>Continue</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const MergeMachineView = React.memo(MergeMachineViewComponent);
