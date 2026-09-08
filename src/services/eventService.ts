import { RarityTier } from '../types';
import { sound } from '../utils/audio';

export interface GameEvent {
  id: string;
  name: string;
  shortName: string;
  description: string;
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.
  startHour: number; // 5 (5:00 AM) or 17 (5:00 PM)
  startMinute: number;
  durationMinutes: number; // 30 minutes
  exclusiveRarity: RarityTier;
  luckMultiplier: number;
  accentColor: string;
  badgeGradient: string;
}

export interface EventStatus {
  event: GameEvent;
  isActive: boolean;
  isStartingSoon: boolean; // within 5 minutes
  secondsRemaining: number;
  secondsUntilNext: number;
  nextOccurrenceDate: Date;
  activeWindowLabel: string;
}

export interface EventAlertNotification {
  id: string;
  eventId: string;
  title: string;
  message: string;
  type: 'live' | 'starting_soon' | 'ending_soon' | 'reminder';
  timestamp: number;
  read?: boolean;
}

export const DAMALA_EVENT: GameEvent = {
  id: 'damala_event',
  name: 'Damala Eclipse Convergence',
  shortName: 'Damala Event',
  description: 'Exclusive weekly event where the Damala rarity unlocks for 30 minutes! Every Monday 5:00 to 5:30.',
  dayOfWeek: 1, // Monday
  startHour: 17, // 5:00 PM (also supports 5:00 AM)
  startMinute: 0,
  durationMinutes: 30,
  exclusiveRarity: 'damala',
  luckMultiplier: 10.0,
  accentColor: '#f59e0b',
  badgeGradient: 'from-amber-500 via-orange-500 to-yellow-400',
};

// Storage keys
const EVENT_TEST_MODE_KEY = 'rng_event_damala_test_active';
const NOTIFICATION_PERMISSION_KEY = 'rng_event_notifications_enabled';

// In-memory test override flag (persisted in localStorage)
let isTestModeActive: boolean = (() => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(EVENT_TEST_MODE_KEY) === 'true';
})();

export function setDamalaEventTestMode(active: boolean): void {
  isTestModeActive = active;
  try {
    localStorage.setItem(EVENT_TEST_MODE_KEY, String(active));
  } catch {
    // ignore
  }
}

export function isDamalaEventTestMode(): boolean {
  return isTestModeActive;
}

/**
 * Checks if the Damala Event is currently active in local time or test mode
 * Schedule: Every Monday 5:00 - 5:30 (05:00-05:30 AM and 17:00-17:30 PM)
 */
export function checkIsDamalaEventActive(now: Date = new Date()): boolean {
  if (isTestModeActive) return true;

  const day = now.getDay(); // 1 = Monday
  if (day !== 1) return false;

  const hours = now.getHours();
  const minutes = now.getMinutes();

  // Check 5:00 AM - 5:30 AM (05:00 - 05:29)
  const isMorningWindow = hours === 5 && minutes >= 0 && minutes < 30;
  // Check 5:00 PM - 5:30 PM (17:00 - 17:29)
  const isEveningWindow = hours === 17 && minutes >= 0 && minutes < 30;

  return isMorningWindow || isEveningWindow;
}

/**
 * Computes next occurrence date of the Damala Event
 */
export function getNextDamalaEventDate(now: Date = new Date()): { nextDate: Date; windowLabel: string } {
  // If today is Monday
  const day = now.getDay();
  const hours = now.getHours();
  const minutes = now.getMinutes();

  // Check if upcoming today (Monday)
  if (day === 1) {
    // Morning 5:00 AM
    if (hours < 5 || (hours === 5 && minutes < 0)) {
      const next = new Date(now);
      next.setHours(5, 0, 0, 0);
      return { nextDate: next, windowLabel: 'Monday 5:00 AM' };
    }
    // Evening 5:00 PM
    if (hours < 17 || (hours === 17 && minutes < 0)) {
      const next = new Date(now);
      next.setHours(17, 0, 0, 0);
      return { nextDate: next, windowLabel: 'Monday 5:00 PM' };
    }
  }

  // Next Monday 5:00 AM
  const daysUntilNextMonday = (1 + 7 - day) % 7 || 7;
  const nextMonday = new Date(now);
  nextMonday.setDate(now.getDate() + daysUntilNextMonday);
  nextMonday.setHours(17, 0, 0, 0); // Default primary to Monday 5:00 PM
  return { nextDate: nextMonday, windowLabel: 'Monday 5:00 PM' };
}

/**
 * Computes full Event Status (active, countdown, remaining time)
 */
export function getDamalaEventStatus(now: Date = new Date()): EventStatus {
  const isActive = checkIsDamalaEventActive(now);
  const { nextDate, windowLabel } = getNextDamalaEventDate(now);

  let secondsRemaining = 0;
  let secondsUntilNext = Math.max(0, Math.floor((nextDate.getTime() - now.getTime()) / 1000));
  let isStartingSoon = secondsUntilNext <= 300 && secondsUntilNext > 0; // 5 minutes before

  if (isActive) {
    if (isTestModeActive) {
      // In test mode give 1800 seconds (30 mins)
      secondsRemaining = 1800;
    } else {
      const minutes = now.getMinutes();
      const seconds = now.getSeconds();
      secondsRemaining = Math.max(0, (30 - minutes) * 60 - seconds);
    }
  }

  return {
    event: DAMALA_EVENT,
    isActive,
    isStartingSoon,
    secondsRemaining,
    secondsUntilNext,
    nextOccurrenceDate: nextDate,
    activeWindowLabel: isActive ? 'ACTIVE NOW (30 min window)' : `Next: ${windowLabel}`,
  };
}

/**
 * Request browser Notification permission
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  try {
    const permission = await Notification.requestPermission();
    const granted = permission === 'granted';
    if (granted) {
      localStorage.setItem(NOTIFICATION_PERMISSION_KEY, 'true');
    }
    return granted;
  } catch (err) {
    console.error('Failed to request notification permission:', err);
    return false;
  }
}

export function isNotificationPermissionGranted(): boolean {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  return Notification.permission === 'granted';
}

/**
 * Dispatch system or in-app notification for events
 */
export function triggerEventSystemNotification(title: string, message: string): void {
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body: message,
        icon: '/favicon.ico',
      });
    } catch {
      // Fallback
    }
  }
}

/**
 * Format countdown seconds into human readable format (e.g. "28m 42s" or "3d 4h 12m")
 */
export function formatEventCountdown(totalSeconds: number): string {
  if (totalSeconds <= 0) return '0s';

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}
