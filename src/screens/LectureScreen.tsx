import React from 'react';
import { BookOpen, Check, Mic } from 'lucide-react';
import {
  LETTER_FAMILIES,
  READING_LADDER_DATA,
} from '../data/lettersAndFamilies';
import { speechService } from '../services/speech';
import { PrimaryButton } from '../components/BlueprintComponents';
import { NouqtaAppController } from '../hooks/useNouqtaState';

export function LectureScreen({ app }: { app: NouqtaAppController }) {
  const {
    state,
    activeUser,
    userSetting,
    updateSetting,
    todayInfo,
    unlockedWords,
    masteredLettersCount,
    setVoiceRecStep,
    setVoiceSecElapsed,
    setVoiceDataUrl,
    setShowVoiceRecorderSheet,
    setTappedCharIndex,
    setActiveReadingWord,
  } = app;

  return (
    <div className="space-y-[24px]">
      <div className="flex items-center justify-between gap-2">
        <h1 className="font-display text-[28px] text-[var(--ink)]">Lecture</h1>

        <div className="flex items-center gap-2">
          <button
            type="button"
            data-testid="voice-reading-open-btn"
            aria-label="Lis à voix haute et envoie au professeur"
            onClick={() => {
              setVoiceRecStep('explain');
              setVoiceSecElapsed(0);
              setVoiceDataUrl(null);
              setShowVoiceRecorderSheet(true);
            }}
            className="min-h-[48px] h-[48px] px-4 rounded-full bg-[var(--accent)] text-[var(--accent-ink)] font-bold text-[14px] flex items-center gap-2 pressable cursor-pointer"
          >
            <Mic className="w-4 h-4" />
            <span>Lis à voix haute</span>
          </button>

          <button
            type="button"
            aria-label="Activer ou désactiver la translittération phonétique"
            onClick={() =>
              updateSetting({
                transliteration: !userSetting.transliteration,
              })
            }
            className={`min-h-[48px] h-[48px] min-w-[54px] px-4 rounded-full font-bold text-[15px] border pressable cursor-pointer ${
              userSetting.transliteration
                ? 'bg-[var(--brand-deep)] text-white border-[var(--brand-deep)]'
                : 'bg-[var(--surface)] text-[var(--ink)] border-[var(--line)]'
            }`}
          >
            Aa
          </button>
        </div>
      </div>

      {unlockedWords.length === 0 ? (
        <div className="rounded-[28px] bg-[var(--surface)] border border-[var(--line)] p-6 text-center space-y-4">
          <div
            lang="ar"
            dir="rtl"
            style={{ lineHeight: 1.95 }}
            className="font-arabic text-[64px] text-[var(--brand-deep)]"
          >
            {todayInfo.letter.vowels.a.arabic} ·{' '}
            {todayInfo.letter.vowels.i.arabic} ·{' '}
            {todayInfo.letter.vowels.u.arabic}
          </div>
          <p className="text-[15px] text-[var(--ink)]/80 mx-auto">
            Terminez une deuxième lettre pour débloquer vos premiers mots
            complets.
          </p>
          <PrimaryButton
            onClick={() =>
              speechService.speakArabic(
                `${todayInfo.letter.vowels.a.arabic} ${todayInfo.letter.vowels.i.arabic} ${todayInfo.letter.vowels.u.arabic}`
              )
            }
          >
            Écouter les syllabes
          </PrimaryButton>
        </div>
      ) : (
        <div className="space-y-5">
          {LETTER_FAMILIES.map((fam) => {
            const famWords = unlockedWords.filter((w) => w.familyId === fam.id);
            if (famWords.length === 0) return null;
            return (
              <div key={fam.id} className="space-y-2.5">
                <span className="font-mono-tag text-[var(--brand)]">
                  {fam.nameFr}
                </span>
                {famWords.map((word) => {
                  const isRead = (
                    state.readWordIds[activeUser.id] || []
                  ).includes(word.id);
                  return (
                    <button
                      key={word.id}
                      type="button"
                      aria-label={`Lire le mot ${word.translationFr}`}
                      onClick={() => {
                        setTappedCharIndex(null);
                        setActiveReadingWord(word);
                      }}
                      className="w-full min-h-[72px] h-[72px] px-5 rounded-[18px] bg-[var(--surface)] border border-[var(--line)] flex items-center justify-between pressable cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <BookOpen className="w-5 h-5 text-[var(--brand)]" />
                        <div className="text-left">
                          <span className="font-semibold text-[16px] text-[var(--ink)] block">
                            {word.translationFr}
                          </span>
                          {userSetting.transliteration && (
                            <span className="text-[12px] text-[var(--ink)]/70">
                              {word.translit}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span
                          lang="ar"
                          dir="rtl"
                          style={{ lineHeight: 1.95 }}
                          className="font-arabic text-[34px] text-[var(--ink)]"
                        >
                          {word.textAr}
                        </span>
                        {isRead && (
                          <Check className="w-5 h-5 text-[var(--good)]" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {masteredLettersCount >= 28 && (
        <div
          data-testid="reading-ladder-histoires-entry"
          className="rounded-[28px] bg-[var(--surface)] border border-[var(--line)] p-5 space-y-2"
        >
          <span className="font-mono-tag text-[var(--brand)]">
            HISTOIRES ({READING_LADDER_DATA.length} TEXTES)
          </span>
          <h2 className="font-display text-[22px] text-[var(--ink)]">
            Histoires
          </h2>
          <p className="text-[14px] text-[var(--ink)]/75">
            Dialogues courts, micro-histoires et proverbes arabes.
          </p>
        </div>
      )}
    </div>
  );
}
