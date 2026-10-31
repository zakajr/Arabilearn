import React from 'react';
import { Check, Lock, Star, Gamepad2 } from 'lucide-react';
import { t } from '../data/copyDeck';
import { markDailyMissionDone } from '../services/dataService';
import {
  HighlightedArabicKeyword,
  LetterChip,
} from '../components/BlueprintComponents';
import {
  MINI_GAMES_CATALOG,
  MiniGamePlayView,
} from '../components/MiniGamesHub';
import { NouqtaAppController } from '../hooks/useNouqtaState';

export function LettresScreen({ app }: { app: NouqtaAppController }) {
  const {
    activeUser,
    mode,
    letters,
    learnedLetterIds,
    allWords,
    lettresTopSubTab,
    setLettresTopSubTab,
    activeMiniGame,
    setActiveMiniGame,
    setLastPlayedMiniGame,
    setGamePlayCount,
    lettersViewType,
    setLettersViewType,
    getLetterStatus,
    setPickerLetterSheetId,
    setShowAccesSheet,
    setState,
    showToast,
  } = app;

  return (
    <div className="space-y-[20px]">
      {/* Top segmented toggle: Lettres | Jeux */}
      <div
        data-testid="lettres-jeux-toggle"
        className="grid grid-cols-2 gap-1.5 bg-[var(--surface)] p-1.5 rounded-[20px] border border-[var(--line)]"
      >
        <button
          type="button"
          aria-label="Onglet Lettres"
          onClick={() => setLettresTopSubTab('lettres')}
          className={`min-h-[48px] h-[48px] rounded-[14px] font-bold text-[15px] pressable cursor-pointer ${
            lettresTopSubTab === 'lettres'
              ? 'bg-[var(--brand-deep)] text-white'
              : 'text-[var(--ink)]/75'
          }`}
        >
          Lettres (28)
        </button>
        <button
          type="button"
          data-testid="subtab-jeux-btn"
          aria-label="Onglet Jeux"
          onClick={() => setLettresTopSubTab('jeux')}
          className={`min-h-[48px] h-[48px] rounded-[14px] font-bold text-[15px] flex items-center justify-center gap-2 pressable cursor-pointer ${
            lettresTopSubTab === 'jeux'
              ? 'bg-[var(--brand-deep)] text-white'
              : 'text-[var(--ink)]/75'
          }`}
        >
          <Gamepad2 className="w-4 h-4" />
          <span>Jeux (5)</span>
        </button>
      </div>

      {lettresTopSubTab === 'jeux' ? (
        /* 5 Mini-Games Hub (FIX 1b: uses learnedLetterIds) */
        <div data-testid="mini-games-hub" className="space-y-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {MINI_GAMES_CATALOG.map((g) => (
              <button
                key={g.id}
                type="button"
                data-testid={`select-game-${g.id}`}
                aria-label={`Jouer à ${g.titleFr}`}
                onClick={() => {
                  setActiveMiniGame(g.id);
                  setLastPlayedMiniGame(g.id);
                }}
                className={`min-h-[48px] h-[48px] px-3.5 rounded-[14px] font-bold text-[13px] whitespace-nowrap border pressable cursor-pointer flex items-center gap-1.5 ${
                  activeMiniGame === g.id
                    ? 'bg-[var(--accent)] text-[var(--accent-ink)] border-[var(--accent)]'
                    : 'bg-[var(--surface)] text-[var(--ink)] border-[var(--line)]'
                }`}
              >
                <span>{g.emoji}</span>
                <span>{g.titleFr}</span>
              </button>
            ))}
          </div>

          <div className="rounded-[24px] bg-[var(--surface)] border border-[var(--line)] p-4">
            <MiniGamePlayView
              gameId={activeMiniGame}
              unlockedLetterIds={learnedLetterIds}
              words={allWords}
              mode={mode}
              onSwitchGame={(next) => {
                setActiveMiniGame(next);
                setLastPlayedMiniGame(next);
                setGamePlayCount((c) => c + 1);
              }}
              onFinishGame={(starsEarned) => {
                setState((prev) => {
                  const nextState = markDailyMissionDone(
                    prev,
                    activeUser.id,
                    'jeu'
                  );
                  return {
                    ...nextState,
                    miniGameDoneUsers: {
                      ...(nextState.miniGameDoneUsers || {}),
                      [activeUser.id]: true,
                    },
                  };
                });
                showToast(`Jeu terminé : +${starsEarned} étoile(s) !`, 'good');
              }}
            />
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3">
            <h1 className="font-display text-[26px] text-[var(--ink)]">
              Alphabet
            </h1>

            <div className="bg-[var(--surface)] p-1 rounded-[18px] border border-[var(--line)] flex items-center gap-1">
              <button
                type="button"
                aria-label="Affichage en liste"
                onClick={() => setLettersViewType('list')}
                className={`min-h-[48px] h-[48px] min-w-[68px] px-4 rounded-[14px] text-[14px] font-bold pressable cursor-pointer ${
                  lettersViewType === 'list'
                    ? 'bg-[var(--brand-deep)] text-white'
                    : 'text-[var(--ink)]/70'
                }`}
              >
                Liste
              </button>
              <button
                type="button"
                aria-label="Affichage en grille"
                onClick={() => setLettersViewType('grid')}
                className={`min-h-[48px] h-[48px] min-w-[68px] px-4 rounded-[14px] text-[14px] font-bold pressable cursor-pointer ${
                  lettersViewType === 'grid'
                    ? 'bg-[var(--brand-deep)] text-white'
                    : 'text-[var(--ink)]/70'
                }`}
              >
                Grille
              </button>
            </div>
          </div>

          {lettersViewType === 'list' ? (
            <div className="space-y-2.5">
              {letters.map((letter) => {
                const status = getLetterStatus(letter.id);
                const displayLabel = letter.shortName || letter.nameFr;
                return (
                  <button
                    key={letter.id}
                    type="button"
                    aria-label={`Lettre ${displayLabel}`}
                    onClick={() => {
                      if (status === 'locked') {
                        showToast(t('lock.toast', mode), 'info');
                        if (letter.family !== 'F1') {
                          setShowAccesSheet(true);
                        }
                      } else {
                        setPickerLetterSheetId(letter.id);
                      }
                    }}
                    className={`w-full min-h-[76px] px-4 py-2.5 rounded-[18px] bg-[var(--surface)] border border-[var(--line)] flex items-center justify-between gap-3 pressable cursor-pointer ${
                      status === 'locked' ? 'opacity-65' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-7 h-7 rounded-full flex items-center justify-center shrink-0">
                        {status === 'mastered' ? (
                          <Star className="w-5 h-5 text-[var(--accent)] fill-[var(--accent)]" />
                        ) : status === 'done' ? (
                          <Check className="w-5 h-5 text-[var(--good)]" />
                        ) : status === 'locked' ? (
                          <Lock className="w-4 h-4 text-[var(--locked)]" />
                        ) : (
                          <span className="w-3 h-3 rounded-full bg-[var(--accent)]" />
                        )}
                      </span>
                      <div className="min-w-0 text-left">
                        <span
                          className={`font-semibold text-[var(--ink)] block truncate ${
                            displayLabel.length > 12
                              ? 'text-[15px]'
                              : 'text-[17px]'
                          }`}
                        >
                          {displayLabel}
                        </span>
                        <span className="text-[13px] text-[var(--ink)]/75 flex items-center gap-1.5">
                          <span>{letter.picture}</span>
                          <span>{letter.keywordFr}</span>
                          <HighlightedArabicKeyword
                            keyword={letter.keyword}
                            targetChar={letter.arabicChar}
                            className="font-arabic text-[16px] ml-1"
                          />
                        </span>
                      </div>
                    </div>

                    <span
                      lang="ar"
                      dir="rtl"
                      className={`font-arabic text-[42px] leading-none shrink-0 ${
                        status === 'locked'
                          ? 'text-[var(--locked)]'
                          : 'text-[var(--ink)]'
                      }`}
                    >
                      {letter.arabicChar}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-3 justify-items-center">
              {letters.map((letter) => {
                const status = getLetterStatus(letter.id);
                return (
                  <LetterChip
                    key={letter.id}
                    size={72}
                    arabicChar={letter.arabicChar}
                    nameFr={letter.shortName || letter.nameFr}
                    status={status}
                    onClick={() => {
                      if (status === 'locked') {
                        showToast(t('lock.toast', mode), 'info');
                        if (letter.family !== 'F1') {
                          setShowAccesSheet(true);
                        }
                      } else {
                        setPickerLetterSheetId(letter.id);
                      }
                    }}
                  />
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
