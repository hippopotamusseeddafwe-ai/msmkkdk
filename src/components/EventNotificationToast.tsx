import React from 'react';
import { EventStatus, formatEventCountdown } from '../services/eventService';
import { sound } from '../utils/audio';
import { Flame, Clock, X, ArrowRight, Radio } from 'lucide-react';

interface EventNotificationToastProps {
  eventStatus: EventStatus;
  onOpenEventModal: () => void;
  onDismiss: () => void;
}

export const EventNotificationToast: React.FC<EventNotificationToastProps> = ({
  eventStatus,
  onOpenEventModal,
  onDismiss,
}) => {
  if (!eventStatus.isActive && !eventStatus.isStartingSoon) {
    return null;
  }

  return (
    <div
      id="event-notification-toast"
      className="fixed top-16 right-4 z-40 max-w-sm w-full animate-in slide-in-from-top-4 duration-300 pointer-events-auto"
    >
      <div className={`relative overflow-hidden rounded-2xl border p-3.5 shadow-2xl backdrop-blur-xl ${
        eventStatus.isActive
          ? 'border-amber-400 bg-[#120a04]/95 text-white shadow-amber-950/80 ring-1 ring-amber-400/40'
          : 'border-orange-500/40 bg-[#140b08]/95 text-white shadow-orange-950/80'
      }`}>
        {/* Glow effect */}
        <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-amber-500/20 blur-xl" />

        <div className="flex items-start justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md shadow-amber-500/30 flex-shrink-0">
              <Flame className="h-5 w-5 animate-pulse" />
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black text-amber-200">
                  {eventStatus.isActive ? 'DAMALA EVENT IS LIVE!' : 'Damala Event Starting Soon!'}
                </span>
                {eventStatus.isActive && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/60 bg-amber-500/20 px-1.5 py-0.2 text-[9px] font-black text-amber-300 animate-pulse">
                    <Radio className="h-2.5 w-2.5 text-amber-400" /> LIVE
                  </span>
                )}
              </div>

              <p className="text-[11px] text-white/70 leading-tight mt-0.5">
                {eventStatus.isActive
                  ? 'Damala Auras unlocked for 30 minutes! +10x Event Luck.'
                  : 'Starting in less than 5 minutes! Prepare your rolls.'}
              </p>
            </div>
          </div>

          <button
            id="event-toast-close-btn"
            onClick={(e) => {
              e.stopPropagation();
              onDismiss();
            }}
            className="flex h-6 w-6 items-center justify-center rounded-full text-white/40 hover:text-white hover:bg-white/10 transition"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Footer actions & countdown */}
        <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-2.5">
          <div className="flex items-center gap-1 text-[11px] font-mono text-amber-300 font-bold">
            <Clock className="h-3 w-3" />
            <span>
              {formatEventCountdown(
                eventStatus.isActive ? eventStatus.secondsRemaining : eventStatus.secondsUntilNext
              )}{' '}
              {eventStatus.isActive ? 'left' : ''}
            </span>
          </div>

          <button
            id="event-toast-view-btn"
            onClick={() => {
              sound.playButtonClick();
              onOpenEventModal();
            }}
            className="flex items-center gap-1 rounded-lg bg-amber-500/20 px-2.5 py-1 text-[11px] font-bold text-amber-200 hover:bg-amber-500/30 transition active:scale-95"
          >
            <span>Event Hub</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
