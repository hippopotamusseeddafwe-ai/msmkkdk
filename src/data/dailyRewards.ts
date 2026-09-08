import { DailyRewardTier } from '../types';

export const DAILY_REWARDS_CONFIG: DailyRewardTier[] = [
  {
    day: 1,
    title: "Initiate's Blessing",
    freeRolls: 10,
    rolls: 300,
    essence: 10,
    bonusLuckOnRolls: 1.5,
  },
  {
    day: 2,
    title: 'Fortune Surge',
    freeRolls: 15,
    rolls: 600,
    essence: 25,
    bonusLuckOnRolls: 2.0,
  },
  {
    day: 3,
    title: 'Alchemist Draught',
    freeRolls: 20,
    rolls: 1000,
    essence: 50,
    bonusLuckOnRolls: 2.5,
    potionReward: {
      name: 'Daily Astral Elixir',
      luckMultiplier: 2.0,
      durationSeconds: 60,
      icon: 'FlaskConical',
    },
  },
  {
    day: 4,
    title: 'Ethereal Harvest',
    freeRolls: 25,
    rolls: 2000,
    essence: 100,
    bonusLuckOnRolls: 3.0,
  },
  {
    day: 5,
    title: 'Prismatic Infusion',
    freeRolls: 30,
    rolls: 3500,
    essence: 175,
    bonusLuckOnRolls: 3.5,
    potionReward: {
      name: 'Greater Daily Elixir',
      luckMultiplier: 3.5,
      durationSeconds: 90,
      icon: 'Sparkles',
    },
  },
  {
    day: 6,
    title: 'Quantum Resonance',
    freeRolls: 40,
    rolls: 6000,
    essence: 300,
    bonusLuckOnRolls: 4.0,
  },
  {
    day: 7,
    title: 'Transcendent Crown',
    freeRolls: 50,
    rolls: 12000,
    essence: 600,
    bonusLuckOnRolls: 5.0,
    potionReward: {
      name: 'Grand Celestial Elixir',
      luckMultiplier: 5.0,
      durationSeconds: 120,
      icon: 'Crown',
    },
  },
];

/**
 * Returns formatted local date string YYYY-MM-DD
 */
export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Checks if the player is eligible to claim today's daily reward
 */
export function isDailyRewardEligible(lastClaimDate: string | null): boolean {
  if (!lastClaimDate) return true;
  return lastClaimDate !== getTodayDateString();
}

/**
 * Computes next streak day based on last claim date
 */
export function getNextStreakDay(lastClaimDate: string | null, currentStreak: number): number {
  if (!lastClaimDate) return 1;
  const today = new Date(getTodayDateString());
  const last = new Date(lastClaimDate);
  const diffTime = today.getTime() - last.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) {
    // Already claimed today
    return currentStreak > 0 ? currentStreak : 1;
  } else if (diffDays === 1) {
    // Claimed yesterday -> increment streak (cycles 1..7)
    const next = currentStreak >= 7 ? 1 : currentStreak + 1;
    return next;
  } else {
    // Missed a day or more -> resets streak to 1
    return 1;
  }
}
