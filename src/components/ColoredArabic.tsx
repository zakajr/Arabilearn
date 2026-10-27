import React from 'react';

interface ColoredArabicProps {
  text: string;
  className?: string;
  diacriticClassName?: string;
  highlightChar?: string;
}

/**
 * Renders Arabic script as an unbroken text run so HarfBuzz/browser OpenType shaping
 * preserves 100% authentic cursive letter connections (initial, medial, final ligatures)
 * and exact calligraphic diacritic (Harakât) placement above and below letters.
 */
export const ColoredArabic: React.FC<ColoredArabicProps> = ({
  text,
  className = ''
}) => {
  if (!text) return null;
  return (
    <span dir="rtl" lang="ar" className={`font-arabic ${className}`}>
      {text}
    </span>
  );
};

/**
 * Splits an Arabic word into its individual letter + Harakât syllables
 * so non-Arabic speakers can visually see each letter's isolated form,
 * its vowel mark (Fatha, Kasra, Damma, Soukoun, Chadda), and its sound.
 */
export function decomposeArabicIntoSyllables(word: string): {
  baseLetter: string;
  diacritics: string;
  combined: string;
  grapheme: string;
  vowelNameFr: string;
  vowelSoundFr: string;
  colorClass: string;
}[] {
  const clean = word.replace(/[،.؟!]/g, '').trim();
  const units: { baseLetter: string; diacritics: string }[] = [];

  for (const ch of clean) {
    if (/[\u064B-\u065F\u0670]/.test(ch)) {
      if (units.length > 0) {
        units[units.length - 1].diacritics += ch;
      }
    } else if (ch.trim()) {
      units.push({ baseLetter: ch, diacritics: '' });
    }
  }

  return units.map(u => {
    let vowelNameFr = 'Consonne';
    let vowelSoundFr = '';
    let colorClass = 'border-[#E6DEC8] dark:border-[#352847] text-[#1A1325] dark:text-[#F7F3EE]';

    if (u.diacritics.includes('\u0651')) {
      vowelNameFr = 'Chadda (×2)';
      vowelSoundFr = 'consonne doublée';
      colorClass = 'border-purple-400 bg-purple-50/70 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200';
    }
    if (u.diacritics.includes('\u064E') || u.diacritics.includes('\u064B')) {
      vowelNameFr = u.diacritics.includes('\u0651') ? 'Chadda + Fatha' : 'Fatha (en haut)';
      vowelSoundFr = 'son /a/';
      colorClass = 'border-amber-400 bg-amber-50/80 dark:bg-amber-950/40 text-amber-950 dark:text-amber-200';
    } else if (u.diacritics.includes('\u0650') || u.diacritics.includes('\u064D')) {
      vowelNameFr = u.diacritics.includes('\u0651') ? 'Chadda + Kasra' : 'Kasra (en bas)';
      vowelSoundFr = 'son /i/';
      colorClass = 'border-emerald-400 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-200';
    } else if (u.diacritics.includes('\u064F') || u.diacritics.includes('\u064C')) {
      vowelNameFr = u.diacritics.includes('\u0651') ? 'Chadda + Damma' : 'Damma (boucle)';
      vowelSoundFr = 'son /ou/';
      colorClass = 'border-sky-400 bg-sky-50/80 dark:bg-sky-950/40 text-sky-950 dark:text-sky-200';
    } else if (u.diacritics.includes('\u0652')) {
      vowelNameFr = 'Soukoun (muet)';
      vowelSoundFr = 'arrêt sec';
      colorClass = 'border-slate-300 bg-slate-50 dark:bg-slate-900/50 text-slate-700 dark:text-slate-300';
    } else if (u.baseLetter === 'ا' || u.baseLetter === 'ى') {
      vowelNameFr = 'Alif Madd';
      vowelSoundFr = 'long /â/';
    }

    const grapheme = u.baseLetter + u.diacritics;
    return {
      baseLetter: u.baseLetter,
      diacritics: u.diacritics,
      combined: grapheme,
      grapheme,
      vowelNameFr,
      vowelSoundFr,
      colorClass
    };
  });
}

/**
 * Animated 5-bar acoustic waveform indicator for active Arabic audio playback
 */
export const AudioWaveform: React.FC<{ active: boolean; className?: string }> = ({
  active,
  className = ''
}) => {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex items-end gap-0.5 h-3.5 ${className}`}
    >
      {[0, 1, 2, 3, 4].map(bar => (
        <span
          key={bar}
          className={`w-0.5 rounded-full transition-all duration-200 ${
            active
              ? 'bg-[#D97706] dark:bg-[#F5B81C] animate-pulse'
              : 'bg-current opacity-35'
          }`}
          style={{
            height: active
              ? `${[55, 100, 70, 90, 50][bar]}%`
              : `${[35, 60, 45, 55, 35][bar]}%`,
            animationDelay: `${bar * 90}ms`
          }}
        />
      ))}
    </span>
  );
};
