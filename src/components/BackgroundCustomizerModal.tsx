import React, { useState } from 'react';
import { BackgroundSettings, BackgroundPresetId, BackgroundPattern } from '../types';
import {
  BACKGROUND_PRESETS,
  DEFAULT_BACKGROUND_SETTINGS,
} from '../data/backgroundThemes';
import { sound } from '../utils/audio';
import {
  Palette,
  Sparkles,
  Sliders,
  Check,
  RotateCcw,
  X,
  Eye,
  Grid,
  Sun,
  Moon,
  Zap,
  Activity,
  Layers,
} from 'lucide-react';

interface BackgroundCustomizerModalProps {
  currentSettings?: BackgroundSettings;
  onSave: (settings: BackgroundSettings) => void;
  onClose: () => void;
}

const COLOR_SWATCHES = [
  '#0c0728',
  '#13072b',
  '#02101e',
  '#1c0503',
  '#02140b',
  '#12041d',
  '#0f0724',
  '#18040a',
  '#140f02',
  '#09090b',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#f97316',
  '#10b981',
  '#eab308',
  '#f43f5e',
  '#38bdf8',
];

export const BackgroundCustomizerModal: React.FC<BackgroundCustomizerModalProps> = ({
  currentSettings = DEFAULT_BACKGROUND_SETTINGS,
  onSave,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'presets' | 'custom' | 'fx'>('presets');
  const [settings, setSettings] = useState<BackgroundSettings>({
    ...DEFAULT_BACKGROUND_SETTINGS,
    ...currentSettings,
  });

  const handleSelectPreset = (presetId: BackgroundPresetId) => {
    sound.playButtonClick();
    const preset = BACKGROUND_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      const nextSettings: BackgroundSettings = {
        ...preset.settings,
      };
      setSettings(nextSettings);
      onSave(nextSettings);
    }
  };

  const handleUpdateSetting = <K extends keyof BackgroundSettings>(
    key: K,
    value: BackgroundSettings[K]
  ) => {
    const next = { ...settings, [key]: value, preset: 'custom' as BackgroundPresetId };
    setSettings(next);
    onSave(next);
  };

  const handleResetToDefault = () => {
    sound.playButtonClick();
    setSettings(DEFAULT_BACKGROUND_SETTINGS);
    onSave(DEFAULT_BACKGROUND_SETTINGS);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 backdrop-blur-md bg-black/60 overflow-y-auto">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-white/20 bg-[#0e0e14]/95 shadow-2xl backdrop-blur-2xl text-white my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Glow accents */}
        <div
          className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full blur-3xl opacity-40 transition-colors duration-500"
          style={{ backgroundColor: settings.accentColor }}
        />
        <div
          className="pointer-events-none absolute -left-20 -bottom-20 h-56 w-56 rounded-full blur-3xl opacity-30 transition-colors duration-500"
          style={{ backgroundColor: settings.secondaryColor }}
        />

        {/* Modal Header */}
        <div className="relative z-10 flex items-center justify-between border-b border-white/10 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/20 shadow-md text-white font-bold"
              style={{
                background: `linear-gradient(135deg, ${settings.secondaryColor}, ${settings.accentColor})`,
              }}
            >
              <Palette className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                <span>Background & Atmosphere</span>
                <span className="rounded-full border border-purple-500/40 bg-purple-500/20 px-2 py-0.5 text-[10px] font-mono uppercase text-purple-300">
                  {settings.preset === 'custom' ? 'Custom Palette' : settings.preset}
                </span>
              </h2>
              <p className="text-xs text-white/50">
                Personalize live visual theme, glowing nebulae, patterns & particles
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="bg-reset-default-btn"
              onClick={handleResetToDefault}
              className="hidden xs:flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white/70 hover:bg-white/10 hover:text-white transition"
              title="Reset to Cosmic Default"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset</span>
            </button>
            <button
              id="close-bg-modal-btn"
              onClick={() => {
                sound.playButtonClick();
                onClose();
              }}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/70 hover:bg-white/15 hover:text-white transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Sub Navigation */}
        <div className="relative z-10 flex border-b border-white/10 bg-white/[0.02] px-5 sm:px-6">
          <button
            id="tab-bg-presets"
            onClick={() => {
              sound.playButtonClick();
              setActiveTab('presets');
            }}
            className={`flex items-center gap-1.5 py-3 px-3 text-xs font-bold border-b-2 transition ${
              activeTab === 'presets'
                ? 'border-[var(--theme-accent,#a855f7)] text-white'
                : 'border-transparent text-white/50 hover:text-white'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 text-[var(--theme-accent,#a855f7)]" />
            <span>Theme Presets (10)</span>
          </button>

          <button
            id="tab-bg-custom"
            onClick={() => {
              sound.playButtonClick();
              setActiveTab('custom');
            }}
            className={`flex items-center gap-1.5 py-3 px-3 text-xs font-bold border-b-2 transition ${
              activeTab === 'custom'
                ? 'border-[var(--theme-accent,#a855f7)] text-white'
                : 'border-transparent text-white/50 hover:text-white'
            }`}
          >
            <Palette className="h-3.5 w-3.5 text-[var(--theme-accent,#a855f7)]" />
            <span>Color Tuning</span>
          </button>

          <button
            id="tab-bg-fx"
            onClick={() => {
              sound.playButtonClick();
              setActiveTab('fx');
            }}
            className={`flex items-center gap-1.5 py-3 px-3 text-xs font-bold border-b-2 transition ${
              activeTab === 'fx'
                ? 'border-[var(--theme-accent,#a855f7)] text-white'
                : 'border-transparent text-white/50 hover:text-white'
            }`}
          >
            <Sliders className="h-3.5 w-3.5 text-[var(--theme-accent,#a855f7)]" />
            <span>Atmosphere & FX</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="relative z-10 p-5 sm:p-6 max-h-[60vh] overflow-y-auto space-y-5">
          {/* 1. PRESET GALLERY */}
          {activeTab === 'presets' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 gap-2.5">
                {BACKGROUND_PRESETS.map((preset) => {
                  const isSelected = settings.preset === preset.id;
                  return (
                    <button
                      key={preset.id}
                      id={`preset-card-${preset.id}`}
                      onClick={() => handleSelectPreset(preset.id)}
                      className={`group relative flex flex-col items-start p-3.5 rounded-2xl border text-left transition-all overflow-hidden ${
                        isSelected
                          ? 'border-purple-500/80 bg-purple-950/40 ring-2 ring-purple-500/50 shadow-lg shadow-purple-950/60'
                          : 'border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.06]'
                      }`}
                    >
                      {/* Gradient preview bar */}
                      <div
                        className="h-10 w-full rounded-xl mb-2.5 shadow-inner border border-white/10 flex items-center justify-end px-2"
                        style={{ background: preset.previewGradient }}
                      >
                        {isSelected && (
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-black text-xs font-black shadow-md">
                            <Check className="h-3 w-3 stroke-[3]" />
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between w-full">
                        <span className="font-bold text-sm text-white group-hover:text-purple-200 transition">
                          {preset.name}
                        </span>
                        <span className="text-[9px] uppercase tracking-wider font-mono font-bold text-white/40 border border-white/10 rounded px-1.5 py-0.5 bg-black/40">
                          {preset.category}
                        </span>
                      </div>

                      <p className="text-[11px] text-white/60 mt-1 leading-snug">
                        {preset.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. CUSTOM COLOR TUNER */}
          {activeTab === 'custom' && (
            <div className="space-y-5">
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-white/70">
                  Custom Color Channels
                </h3>

                {/* Primary Base Deep Tone */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white/80">Primary Base (Deep Canvas)</span>
                    <span className="font-mono text-white/50 text-[11px]">{settings.primaryColor}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={settings.primaryColor}
                      onChange={(e) => handleUpdateSetting('primaryColor', e.target.value)}
                      className="h-9 w-14 cursor-pointer rounded-xl border border-white/20 bg-transparent p-0.5"
                    />
                    <div className="flex flex-wrap gap-1">
                      {COLOR_SWATCHES.slice(0, 9).map((swatch) => (
                        <button
                          key={`prim-${swatch}`}
                          onClick={() => handleUpdateSetting('primaryColor', swatch)}
                          className="h-6 w-6 rounded-lg border border-white/20 transition hover:scale-110"
                          style={{ backgroundColor: swatch }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Secondary Mid Tone */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white/80">Secondary Glow (Nebula Cloud)</span>
                    <span className="font-mono text-white/50 text-[11px]">{settings.secondaryColor}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={settings.secondaryColor}
                      onChange={(e) => handleUpdateSetting('secondaryColor', e.target.value)}
                      className="h-9 w-14 cursor-pointer rounded-xl border border-white/20 bg-transparent p-0.5"
                    />
                    <div className="flex flex-wrap gap-1">
                      {COLOR_SWATCHES.slice(4, 13).map((swatch) => (
                        <button
                          key={`sec-${swatch}`}
                          onClick={() => handleUpdateSetting('secondaryColor', swatch)}
                          className="h-6 w-6 rounded-lg border border-white/20 transition hover:scale-110"
                          style={{ backgroundColor: swatch }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Accent Tone */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white/80">Radiant Accent (Stardust & Corona)</span>
                    <span className="font-mono text-white/50 text-[11px]">{settings.accentColor}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={settings.accentColor}
                      onChange={(e) => handleUpdateSetting('accentColor', e.target.value)}
                      className="h-9 w-14 cursor-pointer rounded-xl border border-white/20 bg-transparent p-0.5"
                    />
                    <div className="flex flex-wrap gap-1">
                      {COLOR_SWATCHES.slice(10).map((swatch) => (
                        <button
                          key={`acc-${swatch}`}
                          onClick={() => handleUpdateSetting('accentColor', swatch)}
                          className="h-6 w-6 rounded-lg border border-white/20 transition hover:scale-110"
                          style={{ backgroundColor: swatch }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3. ATMOSPHERE & FX */}
          {activeTab === 'fx' && (
            <div className="space-y-5">
              {/* Darkness Slider */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="flex items-center gap-1.5 text-white">
                    <Moon className="h-3.5 w-3.5 text-purple-400" />
                    <span>Darkness & Readability Dimmer</span>
                  </span>
                  <span className="font-mono text-purple-300">{settings.darkness}%</span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={98}
                  value={settings.darkness}
                  onChange={(e) => handleUpdateSetting('darkness', Number(e.target.value))}
                  className="w-full accent-purple-500 cursor-pointer h-2 bg-white/10 rounded-lg"
                />
                <p className="text-[11px] text-white/50">
                  Higher darkness ensures 100% crisp readability of cards and aura drop texts.
                </p>
              </div>

              {/* Glow Intensity */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="flex items-center gap-1.5 text-white">
                    <Sun className="h-3.5 w-3.5 text-amber-400" />
                    <span>Ambient Glow Intensity</span>
                  </span>
                  <span className="font-mono text-amber-300">{settings.glowIntensity}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={settings.glowIntensity}
                  onChange={(e) => handleUpdateSetting('glowIntensity', Number(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer h-2 bg-white/10 rounded-lg"
                />
              </div>

              {/* Pattern Overlay Selector */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-2.5">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Grid className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Pattern Texture Layer</span>
                </span>
                <div className="grid grid-cols-5 gap-1.5">
                  {(['dots', 'grid', 'stars', 'hex', 'none'] as BackgroundPattern[]).map((pat) => (
                    <button
                      key={pat}
                      onClick={() => handleUpdateSetting('pattern', pat)}
                      className={`rounded-xl border py-2 text-xs font-bold uppercase tracking-wider transition ${
                        settings.pattern === pat
                          ? 'border-cyan-500 bg-cyan-500/20 text-cyan-200'
                          : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10'
                      }`}
                    >
                      {pat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Particle Density */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-2.5">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Floating Particles & Dust</span>
                </span>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['off', 'low', 'medium', 'high'] as const).map((density) => (
                    <button
                      key={density}
                      onClick={() => handleUpdateSetting('particles', density)}
                      className={`rounded-xl border py-2 text-xs font-bold capitalize transition ${
                        settings.particles === density
                          ? 'border-emerald-500 bg-emerald-500/20 text-emerald-200'
                          : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10'
                      }`}
                    >
                      {density}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ambient Motion Toggle */}
              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                <div>
                  <span className="text-xs font-bold text-white block">Ambient Smooth Motion</span>
                  <span className="text-[11px] text-white/50">
                    Gently animate drifting particles and breathing nebula blooms
                  </span>
                </div>
                <button
                  onClick={() => handleUpdateSetting('animated', !settings.animated)}
                  className={`relative h-6 w-11 rounded-full transition ${
                    settings.animated ? 'bg-purple-600' : 'bg-white/20'
                  }`}
                >
                  <span
                    className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${
                      settings.animated ? 'left-6' : 'left-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="relative z-10 flex items-center justify-between border-t border-white/10 bg-white/[0.02] px-5 py-3.5 sm:px-6">
          <span className="text-xs text-white/40">
            Changes apply instantly to live game
          </span>
          <button
            id="save-bg-settings-btn"
            onClick={() => {
              sound.playButtonClick();
              onSave(settings);
              onClose();
            }}
            className="flex items-center gap-1.5 rounded-xl theme-btn-primary px-5 py-2 text-xs font-bold shadow-lg transition hover:scale-105 active:scale-95"
          >
            <Check className="h-4 w-4" />
            <span>Apply & Done</span>
          </button>
        </div>
      </div>
    </div>
  );
};
