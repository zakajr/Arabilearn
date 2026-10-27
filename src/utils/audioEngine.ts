// Web Speech API + Web Audio API phonetic & chime synthesizer
// Ensures immediate auditory & visual feedback across all browsers including headless environments

class ArabicAudioEngine {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /**
   * Speaks Arabic script using Web Speech API (ar-SA) and plays a warm resonant oud/vocal tone
   * so the user always gets tactile acoustic feedback even if OS voices are missing.
   */
  public speakArabic(
    arabicText: string,
    options?: {
      rate?: number;
      onStart?: () => void;
      onEnd?: () => void;
    }
  ): void {
    const rate = options?.rate ?? 0.85;
    options?.onStart?.();

    // Play a subtle warm acoustic note proportional to the vowel/text
    this.playPhoneticResonance(arabicText);

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(arabicText);
        utterance.lang = 'ar-SA';
        utterance.rate = rate;
        utterance.pitch = 1.0;

        const voices = window.speechSynthesis.getVoices();
        const arabicVoice = voices.find((v) => v.lang.toLowerCase().startsWith('ar'));
        if (arabicVoice) {
          utterance.voice = arabicVoice;
        }

        let finished = false;
        const finish = () => {
          if (!finished) {
            finished = true;
            options?.onEnd?.();
          }
        };

        utterance.onend = finish;
        utterance.onerror = finish;
        window.speechSynthesis.speak(utterance);

        // Safety fallback timer in case headless browser doesn't fire onend
        const estimatedMs = Math.max(650, Math.min(3500, arabicText.length * 140));
        setTimeout(finish, estimatedMs);
        return;
      } catch {
        // Fallback below
      }
    }

    setTimeout(() => {
      options?.onEnd?.();
    }, 700);
  }

  /**
   * Plays a distinct, warm harmonic tone based on whether the Arabic text has Fatha (open A),
   * Kasra (bright I), or Damma (rounded U)
   */
  private playPhoneticResonance(text: string): void {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      // Choose frequency based on Arabic vowel mark (Fatha, Kasra, Damma)
      let baseFreq = 293.66; // D4
      if (text.includes('ِ')) {
        baseFreq = 349.23; // F4 (brighter for Kasra)
      } else if (text.includes('ُ')) {
        baseFreq = 261.63; // C4 (deeper for Damma)
      } else if (text.includes('َ')) {
        baseFreq = 329.63; // E4 (open for Fatha)
      }

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.04, now + 0.18);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.12, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.34);
    } catch {
      // Ignore audio errors when autoplay is blocked
    }
  }

  /**
   * Plays feedback chime for quiz validation (success or retry)
   */
  public playFeedbackChime(isSuccess: boolean): void {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      if (isSuccess) {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.09); // E5
        osc.frequency.setValueAtTime(783.99, now + 0.18); // G5
      } else {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(246.94, now); // B3
        osc.frequency.setValueAtTime(220.0, now + 0.12); // A3
      }

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.14, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.36);
    } catch {
      // Ignore
    }
  }
}

export const audioEngine = new ArabicAudioEngine();
