import React, { useState, useEffect } from 'react';
import {
  EventStatus,
  DAMALA_EVENT,
  setDamalaEventTestMode,
  isDamalaEventTestMode,
  formatEventCountdown,
  requestNotificationPermission,
  isNotificationPermissionGranted,
} from '../services/eventService';
import { ITEMS_BY_RARITY } from '../data/items';
import { RARITIES } from '../data/rarities';
import { sound } from '../utils/audio';
import {
  Flame,
  Calendar,
  Clock,
  Bell,
  BellRing,
  Sparkles,
  Zap,
  ShieldAlert,
  CheckCircle2,
  X,
  Clover,
  Lock,
  Unlock,
  Radio,
  Sliders,
  Award,
} from 'lucide-react';

interface EventModalProps {
  eventStatus: EventStatus;
  onClose: () => void;
  onRefreshStatus: () => void;
}

export const EventModal: React.FC<EventModalProps> = ({
  eventStatus,
  onClose,
  onRefreshStatus,
}) => {
  const [isTestMode, setIsTestMode] = useState(isDamalaEventTestMode());
  const [hasNotificationPermission, setHasNotificationPermission] = useState(isNotificationPermissionGranted());
  const [permissionSuccess, setPermissionSuccess] = useState<string | null>(null);

  const damalaConfig = RARITIES.damala;
  const damalaItems = ITEMS_BY_RARITY.damala || [];

  const handleToggleTestMode = () => {
    sound.playButtonClick();
    const next = !isTestMode;
    setIsTestMode(next);
    setDamalaEventTestMode(next);
    onRefreshStatus();
    if (next) {
      sound.playTradeSuccess();
    }
  };

  const handleEnableNotifications = async () => {
    sound.playButtonClick();
    const granted = await requestNotificationPermission();
    setHasNotificationPermission(granted);
    if (granted) {
      sound.playAchievement();
      setPermissionSuccess('Browser notifications enabled! You will be alerted when the Damala Event begins.');
    } else {
      setPermissionSuccess('Notification permission was not granted. In-game notifications will still display!');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 backdrop-blur-md bg-black/70 overflow-y-auto">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-amber-500/40 bg-[#0e0c14]/95 shadow-2xl shadow-amber-950/50 backdrop-blur-2xl text-white my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Glow backdrop */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-amber-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-orange-500/20 blur-3xl" />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/10 p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/30">
              <Flame className="h-7 w-7 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-amber-200">
                  Damala Event Hub
                </h2>
                {eventStatus.isActive ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-400 bg-amber-500/20 px-2 py-0.5 text-[10px] font-black text-amber-300 animate-pulse">
                    <Radio className="h-3 w-3 text-amber-400" /> LIVE NOW
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-bold text-white/60">
                    <Clock className="h-3 w-3" /> SCHEDULED
                  </span>
                )}
              </div>
              <p className="text-xs text-white/50">
                Exclusive weekly limited-time event • Roll for Damala Auras
              </p>
            </div>
          </div>

          <button
            id="event-modal-close-btn"
            onClick={() => {
              sound.playButtonClick();
              onClose();
            }}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition active:scale-95"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 flex flex-col gap-5">
          {/* Main Status & Countdown Banner */}
          <div className={`relative overflow-hidden rounded-2xl border p-5 flex flex-col sm:flex-row items-center justify-between gap-4 ${
            eventStatus.isActive
              ? 'border-amber-400/50 bg-gradient-to-r from-amber-950/60 via-orange-950/40 to-yellow-950/40 shadow-xl shadow-amber-950/60'
              : 'border-white/10 bg-white/[0.02]'
          }`}>
            <div className="flex flex-col gap-1 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <Calendar className="h-4 w-4 text-amber-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                  Event Schedule
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-white">
                Every Monday • 5:00 to 5:30 (30 Minutes)
              </h3>
              <p className="text-xs text-white/60">
                Damala drops are <span className="text-amber-300 font-bold">100% exclusive</span> to this 30-minute window!
              </p>
            </div>

            {/* Countdown timer pill */}
            <div className="flex flex-col items-center sm:items-end rounded-2xl border border-amber-500/30 bg-black/40 px-5 py-3 shadow-inner">
              <span className="text-[10px] font-bold uppercase tracking-widest text-amber-300/80">
                {eventStatus.isActive ? 'Time Remaining' : 'Starts In'}
              </span>
              <span className="font-mono text-xl sm:text-2xl font-black text-amber-200">
                {formatEventCountdown(
                  eventStatus.isActive ? eventStatus.secondsRemaining : eventStatus.secondsUntilNext
                )}
              </span>
            </div>
          </div>

          {/* Event Perks & Exclusive Rules */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5 rounded-2xl border border-amber-500/20 bg-amber-950/20 p-3.5">
              <div className="flex items-center gap-2 text-amber-300">
                <Unlock className="h-4 w-4 text-amber-400" />
                <span className="text-xs font-bold">Exclusive Drops</span>
              </div>
              <p className="text-[11px] text-white/60">
                Damala rarity is unlocked during the 30-minute window. Outside event hours, Damala cannot be obtained.
              </p>
            </div>

            <div className="flex flex-col gap-1.5 rounded-2xl border border-orange-500/20 bg-orange-950/20 p-3.5">
              <div className="flex items-center gap-2 text-orange-300">
                <Clover className="h-4 w-4 text-orange-400" />
                <span className="text-xs font-bold">+10x Damala Luck</span>
              </div>
              <p className="text-[11px] text-white/60">
                Enjoy a massive 10x luck multiplier exclusively applied to all Damala tier item rolls while event is active!
              </p>
            </div>

            <div className="flex flex-col gap-1.5 rounded-2xl border border-yellow-500/20 bg-yellow-950/20 p-3.5">
              <div className="flex items-center gap-2 text-yellow-300">
                <Zap className="h-4 w-4 text-yellow-400" />
                <span className="text-xs font-bold">5x Essence Surge</span>
              </div>
              <p className="text-[11px] text-white/60">
                Astral essence rewards per roll are quintupled throughout the entire 30-minute duration.
              </p>
            </div>
          </div>

          {/* Showcase of Damala Auras */}
          <div className="flex flex-col gap-2.5 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" /> Featured Damala Auras ({damalaItems.length})
              </span>
              <span className="text-[10px] text-white/40 font-mono">1 in 500,000 Base Odds</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
              {damalaItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-950/30 p-2.5"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20 text-amber-300 font-bold text-xs">
                      ⚡
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-amber-200">{item.name}</span>
                      <span className="text-[10px] text-amber-300/60 font-mono">{damalaConfig?.oneInChance || '1 in 500,000'}</span>
                    </div>
                  </div>
                  <span className="font-mono text-xs font-bold text-amber-300">
                    +{item.luckBonus} Luck
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Notification Permission & Test Mode Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-white/10 pt-4">
            {/* Desktop Notification Request */}
            <button
              id="event-enable-notifications-btn"
              onClick={handleEnableNotifications}
              className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-bold transition active:scale-95 ${
                hasNotificationPermission
                  ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300'
                  : 'border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white'
              }`}
            >
              {hasNotificationPermission ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span>Event Alerts Enabled</span>
                </>
              ) : (
                <>
                  <BellRing className="h-4 w-4 text-amber-400" />
                  <span>Enable Event Reminders</span>
                </>
              )}
            </button>

            {/* Test Mode Simulator Toggle */}
            <button
              id="event-toggle-test-mode-btn"
              onClick={handleToggleTestMode}
              className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-bold transition active:scale-95 ${
                isTestMode
                  ? 'border-amber-400 bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md shadow-amber-500/30'
                  : 'border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'
              }`}
            >
              <Sliders className="h-4 w-4" />
              <span>{isTestMode ? '⚡ Test Mode Active (Damala Unlocked)' : 'Preview / Test Damala Event'}</span>
            </button>
          </div>

          {permissionSuccess && (
            <p className="text-[11px] text-emerald-300 text-center">{permissionSuccess}</p>
          )}
        </div>
      </div>
    </div>
  );
};
