import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Music,
  Volume2,
  VolumeX,
  Volume1,
  Play,
  Pause,
  Radio,
  ExternalLink,
  Sparkles,
  ChevronUp,
  ChevronDown,
  Headphones,
  Sliders,
} from 'lucide-react';
import { sound } from '../utils/audio';

interface BackgroundMusicPlayerProps {
  soundEnabled?: boolean;
}

const YOUTUBE_VIDEO_ID = '4dUr6L-dKgo';
const MUSIC_VOL_KEY = 'rng_bgm_volume';
const MUSIC_PLAYING_KEY = 'rng_bgm_playing';
const MUSIC_BOOST_KEY = 'rng_bgm_clarity_boost';

// Map slider percentage (0-100) to human-audible output so music is always clearly audible even at low volume settings
const calculateAudibleVolume = (sliderVal: number, boostEnabled: boolean): number => {
  if (sliderVal <= 0) return 0;
  if (!boostEnabled) {
    // Standard perceptual curve with minimum 20% floor so it never becomes inaudible
    return Math.min(100, Math.round(20 + (sliderVal / 100) * 80));
  }
  // Enhanced Clarity Boost: Smooth logarithmic curve with a comfortable 35% audibility floor
  // Even at slider 10%, output is ~52% (clearly audible to human ears)
  const normalized = sliderVal / 100;
  const curved = Math.pow(normalized, 0.55); // Gentle curve giving plenty of audibility at low range
  return Math.min(100, Math.round(35 + curved * 65));
};

export const BackgroundMusicPlayer: React.FC<BackgroundMusicPlayerProps> = () => {
  const [isPlaying, setIsPlaying] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const saved = localStorage.getItem(MUSIC_PLAYING_KEY);
    return saved !== null ? saved === 'true' : true;
  });

  const [volume, setVolume] = useState<number>(() => {
    if (typeof window === 'undefined') return 60;
    const saved = localStorage.getItem(MUSIC_VOL_KEY);
    return saved !== null ? Number(saved) : 60;
  });

  const [clarityBoost, setClarityBoost] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const saved = localStorage.getItem(MUSIC_BOOST_KEY);
    return saved !== null ? saved === 'true' : true;
  });

  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // Send message to YouTube iframe API
  const sendIframeCommand = useCallback((command: string, args: any[] = []) => {
    if (!iframeRef.current || !iframeRef.current.contentWindow) return;
    try {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({
          event: 'command',
          func: command,
          args: args,
        }),
        '*'
      );
    } catch {
      // Ignore cross-origin error
    }
  }, []);

  // Update volume & playback in YouTube iframe - purely independent of sound effects!
  const syncPlayerState = useCallback(() => {
    if (!isPlaying) {
      sendIframeCommand('pauseVideo');
      return;
    }

    sendIframeCommand('playVideo');
    if (isMuted || volume === 0) {
      sendIframeCommand('setVolume', [0]);
      sendIframeCommand('mute');
    } else {
      const effectiveVolume = calculateAudibleVolume(volume, clarityBoost);
      sendIframeCommand('unMute');
      sendIframeCommand('setVolume', [effectiveVolume]);
    }
  }, [isPlaying, isMuted, volume, clarityBoost, sendIframeCommand]);

  // Sync state whenever volume, isPlaying, isMuted, or clarityBoost change
  useEffect(() => {
    syncPlayerState();
    try {
      localStorage.setItem(MUSIC_PLAYING_KEY, String(isPlaying));
      localStorage.setItem(MUSIC_VOL_KEY, String(volume));
      localStorage.setItem(MUSIC_BOOST_KEY, String(clarityBoost));
    } catch {
      // ignore
    }
  }, [isPlaying, volume, isMuted, clarityBoost, syncPlayerState]);

  // Listen for initial user interaction once to unblock autoplay in browsers
  useEffect(() => {
    const handleFirstInteraction = () => {
      syncPlayerState();
    };

    window.addEventListener('click', handleFirstInteraction, { once: true });
    window.addEventListener('keydown', handleFirstInteraction, { once: true });
    window.addEventListener('touchstart', handleFirstInteraction, { once: true });
    return () => {
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
    };
  }, [syncPlayerState]);

  const togglePlay = () => {
    sound.playButtonClick();
    setIsPlaying((prev) => !prev);
  };

  const toggleMute = () => {
    sound.playButtonClick();
    setIsMuted((prev) => !prev);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setVolume(val);
    if (val > 0 && isMuted) {
      setIsMuted(false);
    }
  };

  const setPresetVolume = (presetVal: number) => {
    sound.playButtonClick();
    setVolume(presetVal);
    if (isMuted) setIsMuted(false);
  };

  return (
    <div className="fixed bottom-4 left-4 z-40 flex flex-col items-start gap-2">
      {/* Hidden YouTube Audio IFrame */}
      <div className="pointer-events-none fixed -top-[9999px] -left-[9999px] h-1 w-1 opacity-0 overflow-hidden">
        <iframe
          ref={iframeRef}
          id="youtube-bgm-iframe"
          title="Background Music Stream"
          width="200"
          height="200"
          src={`https://www.youtube-nocookie.com/embed/${YOUTUBE_VIDEO_ID}?enablejsapi=1&autoplay=1&loop=1&playlist=${YOUTUBE_VIDEO_ID}&playsinline=1&controls=0`}
          allow="autoplay; encrypted-media"
          onLoad={() => {
            setTimeout(() => {
              syncPlayerState();
            }, 800);
          }}
        />
      </div>

      {/* Expanded Control Box */}
      {isExpanded && (
        <div
          id="music-expanded-panel"
          className="w-72 sm:w-84 rounded-3xl border border-purple-500/40 bg-[#0c0c16]/95 p-4 shadow-2xl shadow-purple-950/70 backdrop-blur-xl animate-in slide-in-from-bottom-2 duration-200 text-white"
        >
          {/* Header row */}
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 shadow-md shadow-purple-600/30">
                <Headphones className={`h-4 w-4 text-white ${isPlaying ? 'animate-pulse' : ''}`} />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-white">Background Music</span>
                  <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                </div>
                <p className="text-[10px] text-purple-300/80 font-mono">24/7 Lofi Stream • Audibility Boosted</p>
              </div>
            </div>

            <button
              onClick={() => setIsExpanded(false)}
              className="rounded-xl p-1.5 text-white/50 hover:bg-white/10 hover:text-white transition cursor-pointer"
              title="Minimize Music Widget"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>

          {/* Controls row */}
          <div className="mt-3.5 flex flex-col gap-3">
            {/* Play/Pause & Equalizer */}
            <div className="flex items-center justify-between">
              <button
                id="music-play-pause-btn"
                onClick={togglePlay}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-black transition shadow-md cursor-pointer ${
                  isPlaying
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-emerald-500/25 hover:brightness-110'
                    : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
                }`}
              >
                {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 fill-current" />}
                <span>{isPlaying ? 'Playing Music' : 'Music Paused'}</span>
              </button>

              {/* Animated Equalizer Bars */}
              {isPlaying && (
                <div className="flex items-end gap-1 h-5 px-2 bg-purple-950/30 py-1 rounded-lg border border-purple-500/20">
                  <span className="w-1 bg-purple-400 rounded-full animate-[pulse_0.6s_ease-in-out_infinite] h-3.5" />
                  <span className="w-1 bg-indigo-400 rounded-full animate-[pulse_0.4s_ease-in-out_infinite_0.1s] h-4.5" />
                  <span className="w-1 bg-pink-400 rounded-full animate-[pulse_0.7s_ease-in-out_infinite_0.2s] h-2.5" />
                  <span className="w-1 bg-cyan-400 rounded-full animate-[pulse_0.5s_ease-in-out_infinite_0.3s] h-4" />
                </div>
              )}
            </div>

            {/* Volume slider with Always-Audible indication */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={toggleMute}
                    className="text-purple-300 hover:text-white transition cursor-pointer"
                    title={isMuted ? 'Unmute' : 'Mute'}
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="h-4 w-4 text-rose-400" />
                    ) : volume < 50 ? (
                      <Volume1 className="h-4 w-4 text-purple-400" />
                    ) : (
                      <Volume2 className="h-4 w-4 text-purple-400" />
                    )}
                  </button>
                  <span className="font-bold text-white/90">Music Volume</span>
                </div>
                <span className="font-mono text-[11px] font-black text-purple-300">
                  {isMuted ? 'Muted (0%)' : `${volume}%`}
                </span>
              </div>

              <input
                id="music-volume-slider"
                type="range"
                min="0"
                max="100"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-full accent-purple-400 h-2 bg-white/20 rounded-lg cursor-pointer"
              />

              {/* Quick Volume Preset Buttons */}
              <div className="grid grid-cols-4 gap-1 pt-1">
                {[
                  { label: 'Low', val: 25 },
                  { label: 'Medium', val: 50 },
                  { label: 'Loud', val: 75 },
                  { label: 'Max', val: 100 },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => setPresetVolume(preset.val)}
                    className={`rounded-lg py-1 text-[10px] font-bold transition cursor-pointer ${
                      volume === preset.val && !isMuted
                        ? 'bg-purple-600 text-white font-black shadow-sm'
                        : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Always Hearable Audio Enhancement Toggle */}
            <div className="flex items-center justify-between rounded-xl border border-purple-500/30 bg-purple-950/20 px-3 py-2 text-xs">
              <div className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                <span className="text-[11px] font-semibold text-purple-200">
                  Enhanced Audio Clarity (Audible at any vol)
                </span>
              </div>
              <input
                type="checkbox"
                checked={clarityBoost}
                onChange={(e) => {
                  sound.playButtonClick();
                  setClarityBoost(e.target.checked);
                }}
                className="accent-purple-500 h-4 w-4 rounded cursor-pointer"
              />
            </div>

            {/* Source Link */}
            <div className="flex items-center justify-between text-[10px] text-white/40 pt-0.5">
              <span>Source: YouTube Live Stream</span>
              <a
                href={`https://www.youtube.com/watch?v=${YOUTUBE_VIDEO_ID}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-purple-400 hover:text-purple-300 underline"
              >
                <span>Watch Stream</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Compact Mini Music Dock (Always Visible Pill) */}
      <div className="flex items-center gap-1.5 rounded-full border border-purple-500/40 bg-[#0c0c16]/90 p-1.5 pr-3 shadow-lg shadow-purple-950/40 backdrop-blur-md">
        <button
          id="mini-music-toggle-btn"
          onClick={togglePlay}
          className={`flex h-7 w-7 items-center justify-center rounded-full transition cursor-pointer ${
            isPlaying
              ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-md shadow-purple-500/30'
              : 'bg-white/10 text-white/50 hover:text-white'
          }`}
          title={isPlaying ? 'Pause Background Music' : 'Play Background Music'}
        >
          {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 fill-current ml-0.5" />}
        </button>

        <button
          onClick={() => setIsExpanded((prev) => !prev)}
          className="flex items-center gap-2 text-left cursor-pointer group"
          title="Click to adjust music volume, presets, and audio clarity"
        >
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-white leading-tight flex items-center gap-1">
              <Radio className={`h-3 w-3 ${isPlaying ? 'text-emerald-400 animate-pulse' : 'text-white/40'}`} />
              <span className="group-hover:text-purple-300 transition">Music Live</span>
            </span>
            <span className="text-[9px] font-mono text-purple-300/70 leading-none">
              {isMuted ? 'Muted' : `${volume}% (Audible)`}
            </span>
          </div>

          {isPlaying ? (
            <div className="flex items-end gap-0.5 h-3">
              <span className="w-0.5 bg-purple-400 rounded-full animate-[pulse_0.6s_ease-in-out_infinite] h-2" />
              <span className="w-0.5 bg-pink-400 rounded-full animate-[pulse_0.4s_ease-in-out_infinite_0.1s] h-3" />
              <span className="w-0.5 bg-cyan-400 rounded-full animate-[pulse_0.5s_ease-in-out_infinite_0.2s] h-2" />
            </div>
          ) : (
            <ChevronUp className="h-3 w-3 text-white/40 group-hover:text-white" />
          )}
        </button>
      </div>
    </div>
  );
};
