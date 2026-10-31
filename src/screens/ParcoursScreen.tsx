import React, { useState } from 'react';
import {
  Play,
  Flame,
  Check,
  Lock,
  Star,
  Volume2,
  PenTool,
  Gamepad2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { t } from '../data/copyDeck';
import {
  LETTER_FAMILIES,
  buildDynamicVowelQuizQuestions,
} from '../data/lettersAndFamilies';
import { markDailyMissionDone } from '../services/dataService';
import {
  Mascot,
  PathNode,
  PrimaryButton,
  TodayCard,
} from '../components/BlueprintComponents';
import { NouqtaAppController } from '../hooks/useNouqtaState';

const NODE_OFFSETS = [-36, 36, -36, 36, -36, 36, 0];
const HOME_PLUS_STORAGE_KEY = 'nouqta_home_plus_open_v1';

export function ParcoursScreen({ app }: { app: NouqtaAppController }) {
  const {
    activeUser,
    mode,
    todayInfo,
    todayFamilyMonoTag,
    weeklyGoalReached,
    weeklyCompletedCount,
    weeklyGoalTarget,
    nextLockedOrTomorrowLetter,
    userStreak,
    missionsDoneCount,
    todayMissions,
    dailyQueue,
    letters,
    learnedLetterIds,
    antWalkingFamilyId,
    showCoachMarkOnHome,
    dismissHomeCoachMark,
    getFamilyNodeState,
    openDefiMiniGame,
    setState,
    setActiveLesson,
    setHarakatCardIdx,
    setShowHarakatLessonSheet,
    setActiveExam,
    setActivationError,
    setShowAccesSheet,
    setFamilySheetId,
    showToast,
  } = app;

  const [plusOpen, setPlusOpen] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem(HOME_PLUS_STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });

  const togglePlusOpen = () => {
    setPlusOpen((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(HOME_PLUS_STORAGE_KEY, next ? '1' : '0');
      } catch {
        // Ignore storage error
      }
      return next;
    });
  };

  return (
    <div className="space-y-[28px] pb-[44px]">
      {/* Hero TodayCard */}
      <TodayCard
        tagText={t('home.hero.tag', mode)}
        titleText={
          todayInfo.isFirstRun
            ? 'Bienvenue'
            : todayInfo.letter.shortName || todayInfo.letter.nameFr
        }
        familyTagText={todayFamilyMonoTag}
        arabicChar={todayInfo.letter.arabicChar}
        stepsDone={todayInfo.progress.stepsDone}
        mode={mode}
      />

      {/* "3 missions" card */}
      <div
        data-testid="defi-3-missions-card"
        className="rounded-[24px] bg-[var(--surface)] border border-[var(--line)] p-4 space-y-3 relative z-20"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-[var(--accent)] fill-[var(--accent)] shrink-0" />
            <h2 className="font-display text-[19px] text-[var(--ink)]">
              3 missions
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <span
              data-testid="missions-progress-badge"
              className="font-mono-tag text-[13px] font-bold text-[var(--brand)]"
            >
              {missionsDoneCount}/3
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--accent)]/20 text-[var(--accent-ink)] dark:text-[var(--accent)] font-mono-tag text-[13px] font-bold">
              <Star className="w-3.5 h-3.5 fill-current" />
              <span>+1</span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[
            {
              key: 'revoir' as const,
              label: 'Revoir 1 lettre',
              done: todayMissions.revoir,
              icon: Volume2,
              onTap: () => {
                setState((prev) =>
                  markDailyMissionDone(prev, activeUser.id, 'revoir')
                );
                setActiveLesson({
                  letterId: (dailyQueue[0] || todayInfo.letter).id,
                  initialStep: 'ecouter',
                });
              },
            },
            {
              key: 'jeu' as const,
              label: 'Jouer 1 jeu',
              done: todayMissions.jeu,
              icon: Gamepad2,
              onTap: () => {
                openDefiMiniGame();
              },
            },
            {
              key: 'tracer' as const,
              label: 'Tracer 1 lettre',
              done: todayMissions.tracer,
              icon: PenTool,
              onTap: () => {
                setState((prev) =>
                  markDailyMissionDone(prev, activeUser.id, 'tracer')
                );
                setActiveLesson({
                  letterId: todayInfo.letter.id,
                  initialStep: 'tracer',
                  practiceMode: true,
                });
              },
            },
          ].map((m) => {
            const Icon = m.icon;
            return (
              <button
                key={m.key}
                type="button"
                data-testid={`mission-tile-${m.key}`}
                aria-label={`Mission ${m.label}`}
                onClick={m.onTap}
                className={`min-h-[84px] p-2.5 rounded-[18px] border-2 flex flex-col items-center justify-between text-center pressable cursor-pointer ${
                  m.done
                    ? 'bg-[var(--good)]/10 border-[var(--good)] text-[var(--ink)]'
                    : 'bg-[var(--paper)] border-[var(--line)] text-[var(--ink)]'
                }`}
              >
                <div className="w-full flex items-center justify-between">
                  <Icon className="w-4 h-4 text-[var(--brand)]" />
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                      m.done
                        ? 'bg-[var(--good)] border-[var(--good)] text-white'
                        : 'border-[var(--line)] bg-[var(--surface)]'
                    }`}
                  >
                    {m.done && <Check className="w-3 h-3" />}
                  </span>
                </div>
                <span className="text-[13px] font-bold leading-tight mt-1">
                  {m.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* PHASE 4.2: Collapsible block "Plus" (closed by default, state remembered) containing Weekly Goal, "Demain" teaser, and Vowels card */}
      <div
        data-testid="home-plus-collapsible"
        className="rounded-[24px] bg-[var(--surface)] border border-[var(--line)] overflow-hidden relative z-20"
      >
        <button
          type="button"
          data-testid="home-plus-toggle-btn"
          aria-expanded={plusOpen}
          aria-label="Afficher ou masquer la section Plus (objectif hebdomadaire, lettre de demain et voyelles courtes)"
          onClick={togglePlusOpen}
          className="w-full min-h-[54px] px-4 py-3 flex items-center justify-between gap-3 pressable cursor-pointer text-left"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="font-display text-[18px] text-[var(--ink)]">
              Plus
            </span>
            <span className="text-[13px] text-[var(--ink)]/70 truncate">
              Objectif ({Math.min(weeklyCompletedCount, weeklyGoalTarget)}/{weeklyGoalTarget}) · Demain · Voyelles
            </span>
          </div>
          {plusOpen ? (
            <ChevronUp className="w-5 h-5 text-[var(--brand)] shrink-0" />
          ) : (
            <ChevronDown className="w-5 h-5 text-[var(--brand)] shrink-0" />
          )}
        </button>

        {plusOpen && (
          <div
            data-testid="home-plus-content"
            className="px-4 pb-4 pt-1 space-y-3 border-t border-[var(--line)]"
          >
            {/* Weekly Goal progress bar */}
            <div
              data-testid="home-weekly-goal-bar"
              className="rounded-[18px] bg-[var(--paper)] border border-[var(--line)] px-4 py-3 space-y-2"
            >
              <div className="flex items-center justify-between text-[13px] font-semibold">
                <span className="text-[var(--ink)] flex items-center gap-2">
                  <span>Objectif de la semaine</span>
                  {weeklyGoalReached && (
                    <span className="text-[var(--good)] font-bold">✓ Atteint</span>
                  )}
                </span>
                <span className="font-mono-tag text-[var(--brand)] font-bold">
                  {Math.min(weeklyCompletedCount, weeklyGoalTarget)} /{' '}
                  {weeklyGoalTarget} lettres
                </span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-[var(--surface)] overflow-hidden">
                <div
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round((weeklyCompletedCount / weeklyGoalTarget) * 100)
                    )}%`,
                  }}
                  className="h-full bg-[var(--good)] rounded-full transition-all"
                />
              </div>
            </div>

            {/* "Demain" teaser */}
            {nextLockedOrTomorrowLetter && (
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  data-testid="demain-teaser-row"
                  aria-label={`Demain : ${
                    nextLockedOrTomorrowLetter.shortName ||
                    nextLockedOrTomorrowLetter.nameFr
                  }, verrouillée. Toucher pour plus d'informations`}
                  onClick={() =>
                    showToast("Termine aujourd'hui pour la débloquer", 'info')
                  }
                  className="flex-1 min-w-0 min-h-[52px] h-[52px] px-4 rounded-[18px] bg-[var(--paper)] border border-[var(--line)] flex items-center justify-between pressable cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Lock className="w-4 h-4 text-[var(--locked)] shrink-0" />
                    <span className="text-[14px] font-semibold text-[var(--ink)] truncate">
                      Demain :{' '}
                      {nextLockedOrTomorrowLetter.shortName ||
                        nextLockedOrTomorrowLetter.nameFr}
                    </span>
                  </div>
                  <span
                    lang="ar"
                    dir="rtl"
                    aria-hidden="true"
                    style={{ filter: 'blur(6px)' }}
                    className="font-arabic text-[30px] text-[var(--ink)]/75 leading-none select-none pointer-events-none shrink-0"
                  >
                    {nextLockedOrTomorrowLetter.arabicChar}
                  </span>
                </button>

                {mode === 'kids' && (
                  <Mascot
                    pose={userStreak === 0 ? 'sleep' : 'wave'}
                    size={52}
                    mode={mode}
                  />
                )}
              </div>
            )}

            {/* Dedicated lesson "Les voyelles courtes" */}
            <div
              data-testid="harakat-mini-lesson-card"
              className="rounded-[20px] bg-[var(--paper)] border border-[var(--line)] p-3.5 flex flex-wrap items-center justify-between gap-2.5"
            >
              <div className="min-w-0">
                <span className="font-mono-tag text-[var(--brand)] block">
                  APRÈS FAMILLE 1 · HARAKAT
                </span>
                <h3 className="font-display text-[18px] text-[var(--ink)]">
                  Les voyelles courtes
                </h3>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  data-testid="open-harakat-cards-btn"
                  aria-label="Ouvrir la leçon Les voyelles courtes"
                  onClick={() => {
                    setHarakatCardIdx(0);
                    setShowHarakatLessonSheet(true);
                  }}
                  className="min-h-[48px] h-[48px] px-3.5 rounded-[14px] bg-[var(--surface)] border border-[var(--brand)] text-[var(--brand)] font-bold text-[13px] pressable cursor-pointer"
                >
                  3 cartes
                </button>
                <button
                  type="button"
                  data-testid="open-vowel-quiz-btn"
                  aria-label="Lancer le quiz Lecture voyelle"
                  onClick={() => {
                    const qList = buildDynamicVowelQuizQuestions(
                      learnedLetterIds,
                      6
                    );
                    setActiveExam({
                      kind: 'vowels',
                      questions: qList,
                      currentIndex: 0,
                      selectedOpt: null,
                      answered: false,
                      correctCount: 0,
                      finished: false,
                    });
                  }}
                  className="min-h-[48px] h-[48px] px-3.5 rounded-[14px] bg-[var(--brand-deep)] text-white font-bold text-[13px] pressable cursor-pointer"
                >
                  Lecture voyelle
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Winding Path of 7 Letter-Family Nodes + Locked "Voyelles et signes" ("Bientôt") */}
      <div
        data-testid="parcours-winding-path"
        className="relative py-2 flex flex-col items-center"
      >
        {LETTER_FAMILIES.map((fam, idx) => {
          const nodeState = getFamilyNodeState(fam);
          const firstLetter =
            letters.find((l) => l.id === fam.letters[0]) || letters[0];
          const offset = NODE_OFFSETS[idx % NODE_OFFSETS.length];
          const prevOffset =
            idx > 0 ? NODE_OFFSETS[(idx - 1) % NODE_OFFSETS.length] : 0;

          return (
            <React.Fragment key={fam.id}>
              {idx > 0 && (
                <svg
                  width="180"
                  height="44"
                  viewBox="-90 0 180 44"
                  aria-hidden="true"
                  className="overflow-visible pointer-events-none my-1"
                >
                  <path
                    d={`M ${prevOffset} 0 C ${prevOffset} 22, ${offset} 22, ${offset} 44`}
                    fill="none"
                    stroke="var(--line)"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </svg>
              )}
              <PathNode
                state={nodeState}
                arabicPreview={firstLetter.arabicChar}
                labelFr={fam.nameFr}
                alignOffset={offset}
                showAnt={nodeState === 'current'}
                antWalkingToNext={antWalkingFamilyId === fam.id}
                onClick={() => {
                  if (nodeState === 'locked') {
                    setActivationError(null);
                    setShowAccesSheet(true);
                  } else {
                    setFamilySheetId(fam.id);
                  }
                }}
              />
            </React.Fragment>
          );
        })}

        <svg
          width="180"
          height="44"
          viewBox="-90 0 180 44"
          aria-hidden="true"
          className="overflow-visible pointer-events-none my-1"
        >
          <path
            d="M 0 0 C 0 22, 0 22, 0 44"
            fill="none"
            stroke="var(--line)"
            strokeWidth="3"
            strokeDasharray="4 4"
            strokeLinecap="round"
          />
        </svg>

        <button
          type="button"
          data-testid="path-node-voyelles-et-signes"
          aria-label="Voyelles et signes : sukun, shadda, tanwin et voyelles longues, bientôt disponible"
          onClick={() =>
            showToast(
              'Voyelles et signes (sukun, shadda, tanwin, voyelles longues) : Bientôt disponible',
              'info'
            )
          }
          className="min-h-[72px] px-4 py-3 rounded-[22px] bg-[var(--surface)]/80 border-2 border-dashed border-[var(--line)] flex items-center gap-3 pressable cursor-pointer"
        >
          <div className="w-11 h-11 rounded-full bg-[var(--paper)] border border-[var(--line)] flex items-center justify-center text-[var(--locked)] shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[15px] text-[var(--ink)]">
                Voyelles et signes
              </span>
              <span className="px-2 py-0.5 rounded-full bg-[var(--accent)]/20 text-[var(--accent-ink)] dark:text-[var(--accent)] font-mono-tag text-[13px] font-bold">
                Bientôt
              </span>
            </div>
            <span className="text-[13px] text-[var(--ink)]/70 block">
              Sukun · Shadda · Tanwin · Voyelles longues
            </span>
          </div>
        </button>
      </div>

      {/* Sticky Primary Saffron Button Pinned Above BottomNav with 24px fade + Coach-mark bubble */}
      <div className="fixed bottom-[72px] inset-x-0 z-20 max-w-[480px] mx-auto pointer-events-none">
        <div
          aria-hidden="true"
          className="h-[24px] w-full bg-gradient-to-t from-[var(--paper)] to-transparent"
        />
        <div className="bg-[var(--paper)] px-[20px] pb-[12px] pointer-events-auto">
          {showCoachMarkOnHome && (
            <div
              data-testid="home-coachmark-bubble"
              className="relative mb-2.5 px-3.5 py-1.5 rounded-[14px] bg-[var(--brand-deep)] text-white text-[13px] font-semibold flex items-center justify-between gap-2 shadow-md"
            >
              <span>Touche « Reprendre » pour lancer ta leçon</span>
              <button
                type="button"
                data-testid="home-coachmark-ok-btn"
                aria-label="Fermer le conseil"
                onClick={dismissHomeCoachMark}
                className="min-w-[48px] min-h-[48px] h-[48px] px-2 rounded-[10px] flex items-center justify-center font-bold text-[var(--accent)] shrink-0 pressable cursor-pointer"
              >
                OK
              </button>
              <span
                data-testid="home-coachmark-arrow"
                aria-hidden="true"
                className="absolute left-1/2 -translate-x-1/2 -bottom-[8px] w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-[var(--brand-deep)]"
              />
            </div>
          )}
          <div
            data-testid="home-reprendre-container"
            className="shadow-lg rounded-[18px]"
          >
            <PrimaryButton
              icon={<Play className="w-5 h-5 fill-current" />}
              onClick={() => {
                dismissHomeCoachMark();
                setActiveLesson({
                  letterId: todayInfo.letter.id,
                });
              }}
            >
              {todayInfo.progress.stepsDone.length > 0
                ? t('home.cta.continue', mode)
                : t('home.cta.start', mode)}
            </PrimaryButton>
          </div>
        </div>
      </div>
    </div>
  );
}
