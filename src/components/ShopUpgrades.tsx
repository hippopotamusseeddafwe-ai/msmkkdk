import React, { useEffect, useState } from 'react';
import { GameState, Upgrade, ActivePotion } from '../types';
import { UPGRADES, POTIONS_SHOP } from '../data/upgrades';
import { formatBigNumber, getUpgradeCostForLevel } from '../utils/rngEngine';
import { sound } from '../utils/audio';
import { DynamicIcon } from './DynamicIcon';
import {
  Dices,
  Flame,
  Clover,
  Zap,
  Timer,
  Layers,
  Sparkles,
  ArrowUpCircle,
  FlaskConical,
  Clock,
  Coins,
  Wallet,
  Crown,
  Lock,
} from 'lucide-react';

interface ShopUpgradesProps {
  gameState: GameState;
  onBuyUpgrade: (upgradeId: string, levels?: number) => void;
  onBuyPotion: (potionId: string) => void;
  onOpenRebirthModal?: () => void;
}

const ShopUpgradesComponent: React.FC<ShopUpgradesProps> = ({
  gameState,
  onBuyUpgrade,
  onBuyPotion,
  onOpenRebirthModal,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'luck' | 'speed' | 'economy' | 'rebirth' | 'potions'>('all');
  const [, setTick] = useState(0);

  // Re-render every second to update potion countdowns
  useEffect(() => {
    const timer = setInterval(() => {
      setTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const now = Date.now();
  const activePotions = gameState.activePotions.filter((p) => p.expiresAt > now);
  const currentRolls = gameState.rolls ?? gameState.coins ?? 0;
  const currentRebirth = gameState.rebirthLevel || 0;

  const filteredUpgrades = UPGRADES.filter((u) => {
    if (selectedCategory === 'all') return true;
    if (selectedCategory === 'rebirth') return (u.requiredRebirth || 0) > 0;
    if (selectedCategory === 'luck') return (u.category === 'luck' || u.id === 'aura_slots_unlock') && !u.requiredRebirth;
    if (selectedCategory === 'speed') return (u.category === 'speed' || u.category === 'utility' || u.id === 'aura_slots_unlock') && !u.requiredRebirth;
    if (selectedCategory === 'economy') return u.category === 'economy' && !u.requiredRebirth;
    return true;
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Shop Wallet Banner with Live ROLLS MONEY & Essence & Rebirth */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-cyan-600 text-white font-bold">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Quantum Vault & Forge</h3>
            <p className="text-xs text-white/40">Invest your rolled capital into permanent odds modifiers</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {onOpenRebirthModal && (
            <button
              id="shop-rebirth-header-btn"
              onClick={onOpenRebirthModal}
              className="flex items-center gap-2 rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-500/20 to-purple-500/20 px-3 py-1.5 shadow-sm transition hover:scale-[1.02] active:scale-95"
            >
              <Crown className="h-4 w-4 text-amber-400" />
              <div className="flex flex-col text-left">
                <span className="text-[9px] font-mono uppercase text-amber-300 font-bold">Rebirth Lv.</span>
                <span className="font-mono text-xs font-black text-white">{currentRebirth} / 100</span>
              </div>
            </button>
          )}
          <div className="flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-950/40 px-3 py-1.5 shadow-sm">
            <Coins className="h-4 w-4 text-cyan-300" />
            <div className="flex flex-col">
              <span className="text-[9px] font-mono uppercase text-cyan-300/70 font-bold">Rolls Money</span>
              <span className="font-mono text-xs sm:text-sm font-black text-cyan-200">{formatBigNumber(currentRolls)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-purple-500/30 bg-purple-950/40 px-3 py-1.5 shadow-sm">
            <Flame className="h-4 w-4 text-purple-300" />
            <div className="flex flex-col">
              <span className="text-[9px] font-mono uppercase text-purple-300/70 font-bold">Essence</span>
              <span className="font-mono text-xs sm:text-sm font-black text-purple-200">{formatBigNumber(gameState.essence)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-3">
        <button
          id="shop-tab-all"
          onClick={() => {
            sound.playButtonClick();
            setSelectedCategory('all');
          }}
          className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
            selectedCategory === 'all'
              ? 'theme-tab-active'
              : 'border border-white/10 bg-white/5 text-white/50 hover:text-white/80'
          }`}
        >
          All Upgrades
        </button>
        <button
          id="shop-tab-rebirth"
          onClick={() => {
            sound.playButtonClick();
            setSelectedCategory('rebirth');
          }}
          className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
            selectedCategory === 'rebirth'
              ? 'bg-gradient-to-r from-amber-500 to-pink-600 text-white shadow-md shadow-amber-500/30'
              : 'border border-amber-500/30 bg-amber-500/10 text-amber-300 hover:text-white'
          }`}
        >
          <Crown className="h-3.5 w-3.5 text-amber-400" />
          <span>Rebirth Upgrades (100)</span>
        </button>
        <button
          id="shop-tab-luck"
          onClick={() => {
            sound.playButtonClick();
            setSelectedCategory('luck');
          }}
          className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
            selectedCategory === 'luck'
              ? 'theme-tab-active'
              : 'border border-white/10 bg-white/5 text-white/50 hover:text-white/80'
          }`}
        >
          <Clover className="h-3.5 w-3.5" />
          <span>Luck Catalysts</span>
        </button>
        <button
          id="shop-tab-speed"
          onClick={() => {
            sound.playButtonClick();
            setSelectedCategory('speed');
          }}
          className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
            selectedCategory === 'speed'
              ? 'theme-tab-active'
              : 'border border-white/10 bg-white/5 text-white/50 hover:text-white/80'
          }`}
        >
          <Timer className="h-3.5 w-3.5" />
          <span>Automation & Speed</span>
        </button>
        <button
          id="shop-tab-potions"
          onClick={() => {
            sound.playButtonClick();
            setSelectedCategory('potions');
          }}
          className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
            selectedCategory === 'potions'
              ? 'theme-tab-active'
              : 'border border-white/10 bg-white/5 text-white/50 hover:text-white/80'
          }`}
        >
          <FlaskConical className="h-3.5 w-3.5" />
          <span>Alchemy Potions</span>
        </button>
      </div>

      {/* Active Potions Banner (if any) */}
      {activePotions.length > 0 && (
        <div className="rounded-2xl border border-purple-500/30 bg-purple-950/20 p-5">
          <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-300">
            <Sparkles className="h-4 w-4 text-purple-400 animate-spin" />
            <span>Active Alchemy Elixirs</span>
          </div>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            {activePotions.map((potion, idx) => {
              const secondsLeft = Math.max(0, Math.ceil((potion.expiresAt - now) / 1000));
              return (
                <div
                  key={`${potion.id}-${idx}`}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3 text-xs backdrop-blur-sm"
                >
                  <div>
                    <p className="font-bold text-white">{potion.name}</p>
                    <p className="text-[11px] text-emerald-400 font-mono">+{potion.luckMultiplier}x Luck</p>
                  </div>
                  <div className="flex items-center gap-1 text-white/70 font-mono font-semibold">
                    <Clock className="h-3.5 w-3.5 text-purple-400" />
                    <span>{secondsLeft}s</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Potions Section (if visible) */}
      {(selectedCategory === 'all' || selectedCategory === 'potions') && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-purple-400" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-white/60">
              Alchemy Elixirs (Consumable)
            </h3>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {POTIONS_SHOP.map((potion) => {
              const potionCost = (potion as any).costRolls ?? potion.costCoins;
              const canAffordRolls = currentRolls >= potionCost;
              const canAffordEssence = gameState.essence >= potion.costEssence;
              const canAfford = canAffordRolls && canAffordEssence;

              return (
                <div
                  key={potion.id}
                  className="flex flex-col justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition-colors hover:border-purple-500/50"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-purple-500/30 bg-purple-500/10">
                        <DynamicIcon name={potion.icon} size={20} className="text-purple-400" />
                      </div>
                      <span className="rounded-md bg-purple-500/20 px-2 py-0.5 text-[10px] font-mono font-bold text-purple-300">
                        +{potion.luckMultiplier}x LUCK ({potion.durationSeconds}s)
                      </span>
                    </div>

                    <h4 className="mt-3 text-sm font-bold text-white">{potion.name}</h4>
                    <p className="mt-1 text-xs text-white/40 leading-relaxed">{potion.description}</p>
                  </div>

                  <div className="mt-5 flex flex-col gap-2.5 border-t border-white/10 pt-4">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-white/40 uppercase text-[10px] tracking-wider">Cost:</span>
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1 text-cyan-300 font-bold">
                          <Coins className="h-3.5 w-3.5 text-cyan-400" />
                          {potionCost} Rolls
                        </span>
                        {potion.costEssence > 0 && (
                          <span className="flex items-center gap-1 text-purple-300 font-bold">
                            <Flame className="h-3 w-3 text-purple-400" />
                            {potion.costEssence}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      id={`buy-potion-${potion.id}-btn`}
                      disabled={!canAfford}
                      onClick={() => onBuyPotion(potion.id)}
                      className={`w-full py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all ${
                        canAfford
                          ? 'theme-btn-primary active:scale-95'
                          : 'cursor-not-allowed bg-white/5 border border-white/10 text-white/30'
                      }`}
                    >
                      BREW & DRINK
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Permanent Upgrades Grid */}
      {(selectedCategory !== 'potions') && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <ArrowUpCircle className="h-4 w-4 text-purple-400" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-white/60">
              Quantum Upgrades (Permanent)
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {filteredUpgrades.map((upgrade) => {
              const currentLevel = gameState.upgrades[upgrade.id] || 0;
              const isMax = currentLevel >= upgrade.maxLevel;
              const isRebirthLocked = (upgrade.requiredRebirth || 0) > currentRebirth;
              const cost = getUpgradeCostForLevel(upgrade.baseCost, upgrade.costMultiplier, currentLevel);
              const canAfford =
                upgrade.costCurrency === 'rolls' || (upgrade.costCurrency as string) === 'coins'
                  ? currentRolls >= cost
                  : gameState.essence >= cost;

              const effectVal = upgrade.effectValuePerLevel ?? 0;
              const totalEffect = (currentLevel * effectVal).toFixed(
                effectVal < 1 ? 2 : 0
              );

              return (
                <div
                  key={upgrade.id}
                  className={`flex flex-col justify-between rounded-2xl border p-5 transition-colors ${
                    isRebirthLocked
                      ? 'border-amber-500/20 bg-amber-950/10 opacity-75'
                      : isMax
                      ? 'border-emerald-500/30 bg-emerald-950/10'
                      : upgrade.requiredRebirth
                      ? 'border-amber-500/40 bg-white/[0.04] shadow-md shadow-amber-500/5 hover:border-amber-500/70'
                      : 'border-white/10 bg-white/[0.03] hover:border-purple-500/50'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${
                          isRebirthLocked
                            ? 'border-amber-500/20 bg-amber-500/10 text-amber-400'
                            : upgrade.requiredRebirth
                            ? 'border-amber-500/40 bg-amber-500/20 text-amber-300'
                            : 'border-white/10 bg-white/5 text-purple-400'
                        }`}>
                          {isRebirthLocked ? (
                            <Lock className="h-5 w-5 text-amber-400" />
                          ) : (
                            <DynamicIcon name={upgrade.icon} size={20} className={upgrade.requiredRebirth ? 'text-amber-300' : 'text-purple-400'} />
                          )}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white">{upgrade.name}</h4>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {upgrade.requiredRebirth && (
                              <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${
                                isRebirthLocked
                                  ? 'bg-amber-500/20 text-amber-400'
                                  : 'bg-emerald-500/20 text-emerald-300'
                              }`}>
                                {isRebirthLocked ? `🔒 Rebirth ${upgrade.requiredRebirth} Req` : `✨ Rebirth ${upgrade.requiredRebirth}`}
                              </span>
                            )}
                            <span className="text-[10px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded font-mono">
                              Lvl {currentLevel} / {upgrade.maxLevel}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Current Bonus */}
                      <span className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs font-mono font-bold text-emerald-400">
                        {upgrade.prefix || ''}
                        {totalEffect} {upgrade.unit}
                      </span>
                    </div>

                    <p className="mt-3 text-xs leading-relaxed text-white/40">
                      {upgrade.description}
                    </p>
                  </div>

                  {/* Buy Button & Cost */}
                  <div className="mt-5 flex flex-col gap-2.5 border-t border-white/10 pt-4">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-white/40 uppercase text-[10px] tracking-wider">Cost:</span>
                      {isRebirthLocked ? (
                        <span className="text-amber-400 font-bold uppercase tracking-wider text-[11px] flex items-center gap-1">
                          <Lock className="h-3 w-3" /> Requires Rebirth {upgrade.requiredRebirth}
                        </span>
                      ) : isMax ? (
                        <span className="text-emerald-400 font-bold uppercase tracking-wider text-xs">MAXED OUT</span>
                      ) : upgrade.costCurrency === 'rolls' || (upgrade.costCurrency as string) === 'coins' ? (
                        <span className="flex items-center gap-1 text-cyan-300 font-bold">
                          <Coins className="h-3.5 w-3.5 text-cyan-400" />
                          {formatBigNumber(cost)} Rolls
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-purple-300 font-bold">
                          <Flame className="h-3.5 w-3.5 text-purple-400" />
                          {formatBigNumber(cost)}
                        </span>
                      )}
                    </div>

                    {isRebirthLocked ? (
                      <button
                        id={`locked-upgrade-${upgrade.id}-btn`}
                        onClick={onOpenRebirthModal}
                        className="w-full py-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs font-bold text-amber-300 hover:bg-amber-500/20 transition flex items-center justify-center gap-1.5"
                      >
                        <Crown className="h-3.5 w-3.5 text-amber-400" />
                        <span>ASCEND TO REBIRTH {upgrade.requiredRebirth} TO UNLOCK</span>
                      </button>
                    ) : isMax ? (
                      <button
                        disabled
                        className="w-full py-2.5 bg-white/10 text-white/60 rounded-xl text-xs font-bold cursor-not-allowed"
                      >
                        MAXED OUT
                      </button>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <button
                          id={`buy-upgrade-${upgrade.id}-btn`}
                          disabled={!canAfford}
                          onClick={() => onBuyUpgrade(upgrade.id, 1)}
                          className={`w-full py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all ${
                            canAfford
                              ? upgrade.requiredRebirth
                                ? 'bg-gradient-to-r from-amber-500 to-purple-600 hover:opacity-90 text-white shadow-md shadow-amber-500/20 active:scale-95'
                                : 'theme-btn-primary active:scale-95'
                              : 'cursor-not-allowed bg-white/5 border border-white/10 text-white/30'
                          }`}
                        >
                          UPGRADE +1 — {upgrade.costCurrency === 'rolls' || (upgrade.costCurrency as string) === 'coins' ? `${formatBigNumber(cost)} Rolls` : `${formatBigNumber(cost)} Essence`}
                        </button>

                        {upgrade.maxLevel >= 20 && (
                          <div className="flex gap-2">
                            <button
                              id={`buy-upgrade-${upgrade.id}-10x-btn`}
                              disabled={!canAfford}
                              onClick={() => onBuyUpgrade(upgrade.id, 10)}
                              className="flex-1 py-1.5 rounded-lg border border-white/10 bg-white/5 text-[11px] font-mono font-bold text-white/80 transition hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              +10 Lvl
                            </button>
                            {upgrade.maxLevel >= 100 && (
                              <button
                                id={`buy-upgrade-${upgrade.id}-100x-btn`}
                                disabled={!canAfford}
                                onClick={() => onBuyUpgrade(upgrade.id, 100)}
                                className="flex-1 py-1.5 rounded-lg border border-white/10 bg-white/5 text-[11px] font-mono font-bold text-white/80 transition hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                              >
                                +100 Lvl
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export const ShopUpgrades = React.memo(ShopUpgradesComponent);
