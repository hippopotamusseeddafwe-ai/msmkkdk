import { RarityTier } from '../types';

class SoundEngine {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;
  private lastSoundTimes: Record<string, number> = {};
  private masterGain: GainNode | null = null;
  private isUnlocked: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      const unlock = () => {
        if (!this.isUnlocked) {
          this.initCtx();
          this.isUnlocked = true;
        }
        window.removeEventListener('pointerdown', unlock);
        window.removeEventListener('keydown', unlock);
      };
      window.addEventListener('pointerdown', unlock, { passive: true });
      window.addEventListener('keydown', unlock, { passive: true });
    }
  }

  private initCtx(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        try {
          this.ctx = new AudioCtx();
          this.masterGain = this.ctx.createGain();
          this.masterGain.gain.setValueAtTime(0.25, this.ctx.currentTime);
          this.masterGain.connect(this.ctx.destination);
        } catch {
          this.ctx = null;
        }
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  private shouldThrottle(key: string, cooldownMs: number): boolean {
    const now = performance.now();
    const last = this.lastSoundTimes[key] || 0;
    if (now - last < cooldownMs) return true;
    this.lastSoundTimes[key] = now;
    return false;
  }

  public toggleSound(force?: boolean): boolean {
    this.enabled = force !== undefined ? force : !this.enabled;
    return this.enabled;
  }

  /**
   * Subtle tactile button click sound for interactive elements - fire-and-forget non-blocking
   */
  public playButtonClick() {
    if (!this.enabled) return;
    if (this.shouldThrottle('btn', 40)) return;

    // Run asynchronously so UI click dispatch is instant
    setTimeout(() => {
      try {
        const ctx = this.initCtx();
        if (!ctx || !this.masterGain) return;

        const t = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(650, t);
        osc.frequency.exponentialRampToValueAtTime(320, t + 0.02);

        gain.gain.setValueAtTime(0.03, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.02);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(t);
        osc.stop(t + 0.02);
      } catch {
        // Ignore audio errors
      }
    }, 0);
  }

  /**
   * Sound of rolling dice / rolling wheel tumbling
   */
  public playDiceRoll(fast: boolean = false) {
    if (!this.enabled) return;
    if (this.shouldThrottle('dice', 100)) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const t = this.ctx.currentTime;
      const count = fast ? 2 : 4;
      const stepDuration = fast ? 0.035 : 0.055;

      // Realistic dice tumbling rattle using randomized frequency bursts
      for (let i = 0; i < count; i++) {
        const hitTime = t + i * stepDuration + (Math.random() * 0.01 - 0.005);
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        const basePitch = 500 + Math.random() * 300 + i * 40;
        osc.type = i % 2 === 0 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(basePitch, hitTime);
        osc.frequency.exponentialRampToValueAtTime(basePitch * 1.8, hitTime + 0.03);

        const vol = 0.06 + (i / count) * 0.04;
        gain.gain.setValueAtTime(vol, hitTime);
        gain.gain.exponentialRampToValueAtTime(0.001, hitTime + 0.03);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(hitTime);
        osc.stop(hitTime + 0.035);
      }
    } catch {
      // Audio context might be restricted before interaction
    }
  }

  /**
   * Single rapid tick sound for ultra-fast rolls
   */
  public playTick(pitch: number = 440) {
    if (!this.enabled) return;
    if (this.shouldThrottle('tick', 70)) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(pitch, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(pitch * 1.4, this.ctx.currentTime + 0.04);

      gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.04);
    } catch {
      // Ignore
    }
  }

  /**
   * Obtaining items of different rarities (common, uncommon, rare, epic, legendary, mythic, celestial, transcendent)
   */
  public playDrop(rarity: RarityTier, isNew: boolean = false) {
    if (!this.enabled) return;
    // Throttle common/uncommon drops during fast auto-rolling
    if ((rarity === 'common' || rarity === 'uncommon') && this.shouldThrottle('drop_common', 100)) {
      return;
    }
    if (this.shouldThrottle(`drop_${rarity}`, 60)) {
      return;
    }
    try {
      this.initCtx();
      if (!this.ctx) return;

      const t = this.ctx.currentTime;

      if (rarity === 'common') {
        // Soft wooden / bubble pop
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(240, t);
        osc.frequency.exponentialRampToValueAtTime(180, t + 0.1);
        gain.gain.setValueAtTime(0.09, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.1);
      } else if (rarity === 'uncommon') {
        // Bright two-tone crystal chime
        const notes = [440, 587.33]; // A4 -> D5
        notes.forEach((freq, i) => {
          if (!this.ctx) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, t + i * 0.06);
          gain.gain.setValueAtTime(0.12, t + i * 0.06);
          gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.06 + 0.22);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(t + i * 0.06);
          osc.stop(t + i * 0.06 + 0.22);
        });
      } else if (rarity === 'rare') {
        // Ascending 3-chord crystal arpeggio
        const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
        notes.forEach((freq, i) => {
          if (!this.ctx) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, t + i * 0.05);
          gain.gain.setValueAtTime(0.14, t + i * 0.05);
          gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.05 + 0.38);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(t + i * 0.05);
          osc.stop(t + i * 0.05 + 0.38);
        });
      } else if (rarity === 'epic') {
        // Deep purple synth power chord
        const notes = [329.63, 493.88, 659.25, 987.77]; // E4, B4, E5, B5
        notes.forEach((freq, i) => {
          if (!this.ctx) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, t + i * 0.04);
          gain.gain.setValueAtTime(0.16, t + i * 0.04);
          gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.04 + 0.55);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(t + i * 0.04);
          osc.stop(t + i * 0.04 + 0.55);
        });
      } else if (rarity === 'legendary') {
        // Grand golden brass fanfare
        const notes = [440, 554.37, 659.25, 880, 1108.73, 1318.51];
        notes.forEach((freq, i) => {
          if (!this.ctx) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, t + i * 0.06);
          gain.gain.setValueAtTime(0.13, t + i * 0.06);
          gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.06 + 0.75);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(t + i * 0.06);
          osc.stop(t + i * 0.06 + 0.75);
        });
      } else {
        // Mythic, Celestial, Transcendent - Sub-bass explosion + Celestial Shimmer
        const subOsc = this.ctx.createOscillator();
        const subGain = this.ctx.createGain();
        subOsc.type = 'sine';
        subOsc.frequency.setValueAtTime(160, t);
        subOsc.frequency.exponentialRampToValueAtTime(40, t + 0.85);
        subGain.gain.setValueAtTime(0.3, t);
        subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
        subOsc.connect(subGain);
        subGain.connect(this.ctx.destination);
        subOsc.start(t);
        subOsc.stop(t + 0.9);

        // Rainbow arpeggiated fireworks
        const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98, 2093.0];
        notes.forEach((freq, i) => {
          if (!this.ctx) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, t + i * 0.05);
          gain.gain.setValueAtTime(0.18, t + i * 0.05);
          gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.05 + 1.2);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(t + i * 0.05);
          osc.stop(t + i * 0.05 + 1.2);
        });
      }

      if (isNew) {
        // High sparkle chime for first-time discoveries
        setTimeout(() => {
          if (!this.ctx || !this.enabled) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(1318.51, this.ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(1760.0, this.ctx.currentTime + 0.25);
          gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start();
          osc.stop(this.ctx.currentTime + 0.3);
        }, 180);
      }
    } catch {
      // Ignore
    }
  }

  /**
   * Sound effect for claiming Daily Login Rewards
   */
  public playDailyReward() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const t = this.ctx.currentTime;
      // Majestic 5-chord fanfare with resonant coin chimes
      const fanfare = [392.0, 523.25, 659.25, 783.99, 1046.5, 1318.51];
      fanfare.forEach((freq, i) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t + i * 0.07);
        gain.gain.setValueAtTime(0.18, t + i * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.07 + 0.5);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t + i * 0.07);
        osc.stop(t + i * 0.07 + 0.5);
      });

      // Coin sparkle follow-up
      setTimeout(() => {
        this.playCoin();
      }, 450);
    } catch {
      // Ignore
    }
  }

  public playCoin() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      [987.77, 1318.51].forEach((freq, i) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t + i * 0.07);
        gain.gain.setValueAtTime(0.1, t + i * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.07 + 0.16);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t + i * 0.07);
        osc.stop(t + i * 0.07 + 0.16);
      });
    } catch {
      // Ignore
    }
  }

  public playUpgrade() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      [330, 440, 554.37, 659.25].forEach((freq, i) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t + i * 0.06);
        gain.gain.setValueAtTime(0.15, t + i * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.06 + 0.3);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t + i * 0.06);
        osc.stop(t + i * 0.06 + 0.3);
      });
    } catch {
      // Ignore
    }
  }

  public playAchievement() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t + i * 0.08);
        gain.gain.setValueAtTime(0.18, t + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.4);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t + i * 0.08);
        osc.stop(t + i * 0.08 + 0.4);
      });
    } catch {
      // Ignore
    }
  }

  public playClash() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;

      // Heavy resonant energy clash boom
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, t);
      osc.frequency.exponentialRampToValueAtTime(80, t + 0.5);

      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.5);
    } catch {
      // Ignore
    }
  }

  public playVictoryFanfare() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98];
      notes.forEach((freq, i) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t + i * 0.08);
        gain.gain.setValueAtTime(0.2, t + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.6);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t + i * 0.08);
        osc.stop(t + i * 0.08 + 0.6);
      });
    } catch {
      // Ignore
    }
  }

  public playDefeat() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const notes = [440, 392, 349.23, 293.66];
      notes.forEach((freq, i) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t + i * 0.12);
        gain.gain.setValueAtTime(0.12, t + i * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.12 + 0.35);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t + i * 0.12);
        osc.stop(t + i * 0.12 + 0.35);
      });
    } catch {
      // Ignore
    }
  }

  public playTradeLock() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, t);
      osc.frequency.exponentialRampToValueAtTime(880, t + 0.08);
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.08);
    } catch {
      // Ignore
    }
  }

  public playTradeSuccess() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const notes = [440, 554.37, 659.25, 880, 1108.73];
      notes.forEach((freq, i) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t + i * 0.07);
        gain.gain.setValueAtTime(0.18, t + i * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.07 + 0.5);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t + i * 0.07);
        osc.stop(t + i * 0.07 + 0.5);
      });
    } catch {
      // Ignore
    }
  }
}

export const sound = new SoundEngine();
