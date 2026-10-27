export type HapticPatternKind =
  | 'stroke_ok'
  | 'step_ok'
  | 'letter_done'
  | 'error';

const HAPTIC_PATTERNS: Record<HapticPatternKind, number | number[]> = {
  stroke_ok: 15,
  step_ok: [10, 40, 10],
  letter_done: [15, 60, 15, 60, 30],
  error: 30
};

class SpeechService {
  private muted = false;
  private hapticsEnabled = true;
  private preferredArabicVoiceName: string | null = null;

  // WebAudio synthesized reed-pen sound state (Phase 2.2)
  private penAudioCtx: AudioContext | null = null;
  private penNoiseNode: AudioBufferSourceNode | null = null;
  private penGainNode: GainNode | null = null;

  public setMuted(muted: boolean) {
    this.muted = muted;
    if (muted) {
      this.stopPenSound();
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setHapticsEnabled(enabled: boolean) {
    this.hapticsEnabled = enabled;
  }

  public isHapticsEnabled(): boolean {
    return this.hapticsEnabled;
  }

  public setPreferredVoice(name: string | null) {
    this.preferredArabicVoiceName = name;
  }

  public getAvailableArabicVoices(): SpeechSynthesisVoice[] {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return [];
    }
    return window.speechSynthesis
      .getVoices()
      .filter((v) => v.lang.toLowerCase().startsWith('ar'));
  }

  public hasArabicVoiceInstalled(): boolean {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return true;
    }
    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) return true;
    return voices.some((v) => v.lang.toLowerCase().startsWith('ar'));
  }

  public speakArabic(text: string, rate = 0.85) {
    if (this.muted || typeof window === 'undefined') return;
    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = 'ar-SA';
        utter.rate = rate;
        const arVoices = this.getAvailableArabicVoices();
        if (this.preferredArabicVoiceName) {
          const match = arVoices.find(
            (v) => v.name === this.preferredArabicVoiceName
          );
          if (match) utter.voice = match;
        } else if (arVoices.length > 0) {
          utter.voice = arVoices[0];
        }
        window.speechSynthesis.speak(utter);
      }
    } catch {
      // Ignore synthesis errors in headless environments
    }
  }

  public speakFrench(text: string, rate = 0.95) {
    if (this.muted || typeof window === 'undefined') return;
    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = 'fr-FR';
        utter.rate = rate;
        window.speechSynthesis.speak(utter);
      }
    } catch {
      // Ignore
    }
  }

  /**
   * PHASE 2.3 HAPTICS:
   * navigator.vibrate with feature detection and Settings toggle.
   * Patterns: stroke ok 15ms; step ok [10,40,10]; letter done [15,60,15,60,30]; error 30ms.
   * Never vibrates on pointer move. Does nothing cleanly when disabled or unsupported.
   */
  public triggerHaptic(kind: HapticPatternKind): boolean {
    if (!this.hapticsEnabled) return false;
    if (
      typeof navigator === 'undefined' ||
      typeof navigator.vibrate !== 'function'
    ) {
      return false;
    }
    try {
      const pattern = HAPTIC_PATTERNS[kind];
      return navigator.vibrate(pattern);
    } catch {
      return false;
    }
  }

  /**
   * PHASE 2.2 PEN SOUND:
   * Synthesized with WebAudio (no audio files): band-pass filtered noise
   * whose gain follows draw speed, silent when still.
   * Starts only after a user tap, respects the Sound setting.
   */
  public startPenSound(): boolean {
    if (this.muted || typeof window === 'undefined') return false;
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return false;

      this.stopPenSound();
      const ctx = new AudioCtx();
      this.penAudioCtx = ctx;

      const bufferSize = ctx.sampleRate * 2;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;
      noise.loop = true;

      const bandpass = ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.setValueAtTime(1150, ctx.currentTime);
      bandpass.Q.setValueAtTime(2.4, ctx.currentTime);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, ctx.currentTime); // Silent when still

      noise.connect(bandpass);
      bandpass.connect(gain);
      gain.connect(ctx.destination);

      noise.start();
      this.penNoiseNode = noise;
      this.penGainNode = gain;
      return true;
    } catch {
      return false;
    }
  }

  public updatePenSoundSpeed(speedPxPerMs: number): void {
    if (this.muted || !this.penGainNode || !this.penAudioCtx) return;
    try {
      const targetGain =
        speedPxPerMs <= 0.01
          ? 0
          : Math.min(0.06, Math.max(0.008, speedPxPerMs * 0.045));
      this.penGainNode.gain.setTargetAtTime(
        targetGain,
        this.penAudioCtx.currentTime,
        0.025
      );
    } catch {
      // Ignore
    }
  }

  public stopPenSound(): void {
    try {
      if (this.penNoiseNode) {
        this.penNoiseNode.stop();
        this.penNoiseNode.disconnect();
        this.penNoiseNode = null;
      }
      if (this.penGainNode) {
        this.penGainNode.disconnect();
        this.penGainNode = null;
      }
      if (this.penAudioCtx && this.penAudioCtx.state !== 'closed') {
        void this.penAudioCtx.close();
      }
      this.penAudioCtx = null;
    } catch {
      this.penNoiseNode = null;
      this.penGainNode = null;
      this.penAudioCtx = null;
    }
  }

  /**
   * PHASE 2.4 Mascot tap sound: tiny cheerful chirp when tapping Nouqta the ant.
   */
  public playMascotChirp(): boolean {
    this.triggerHaptic('stroke_ok');
    if (this.muted || typeof window === 'undefined') return false;
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return false;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(660, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(990, ctx.currentTime + 0.09);
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.11);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
      return true;
    } catch {
      return false;
    }
  }

  public triggerSuccessFeedback(hapticKind: HapticPatternKind = 'stroke_ok') {
    this.triggerHaptic(hapticKind);
    if (this.muted || typeof window === 'undefined') return;
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.14); // A5
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.23);
    } catch {
      // Ignore
    }
  }
}

export const speechService = new SpeechService();
