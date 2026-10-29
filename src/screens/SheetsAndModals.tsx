import React from 'react';
import {
  Flame,
  Check,
  Lock,
  Star,
  Volume2,
  Eye,
  PenTool,
  Camera,
  MessageCircle,
  ArrowLeft,
  Shield,
  Share2,
  RotateCcw,
  Lightbulb,
  Mic,
  Square,
  Trash2,
  Send,
  Layers,
} from 'lucide-react';
import { t } from '../data/copyDeck';
import {
  HARAKAT_MINI_LESSON_CARDS,
  LETTER_FAMILIES,
  LetterRecord,
  buildFamilyExamQuestions,
  buildVariedQuizSequence,
  getPositionalFormsForLetter,
  splitArabicWordIntoLetterTiles,
} from '../data/lettersAndFamilies';
import { shareOrDownloadCard } from '../lib/pdfAndImage';
import {
  pointsToSmoothQuadraticSvgPath,
  sampleSvgPathEqualLength,
} from '../lib/strokeMath';
import {
  StepId,
  advanceReviewBox,
  getTodayIsoDate,
  isLetterUnlockedForUser,
  markDailyMissionDone,
  markStepCompleted,
  redeemActivationCode,
  saveLearnerTraceForAlbum,
  savePracticeAttemptToHistory,
} from '../services/dataService';
import { speechService } from '../services/speech';
import {
  BottomSheet,
  HighlightedArabicKeyword,
  IconButton,
  LetterChip,
  Mascot,
  PrimaryButton,
  SecondaryButton,
  StarRating,
} from '../components/BlueprintComponents';
import { LetterLessonLoop } from '../components/LetterLessonLoop';
import {
  MINI_GAMES_CATALOG,
  MiniGamePlayView,
} from '../components/MiniGamesHub';
import { NouqtaAppController } from '../hooks/useNouqtaState';

export function SheetsAndModals({ app }: { app: NouqtaAppController }) {
  const {
    state,
    setState,
    activeUser,
    mode,
    userSetting,
    letters,
    todayInfo,
    userProgress,
    streakObj,
    userStreak,
    bestStreak,
    totalStars,
    completedLettersCount,
    masteredLettersCount,
    unlockedLetterIds,
    learnedLetterIds,
    allWords,
    dailyQueue,
    isSelfTestRoute,
    glyphReloadTick,
    showOnboardingModal,
    onboardingScreenIdx,
    setOnboardingScreenIdx,
    finishOnboarding,
    showHelpSheet,
    setShowHelpSheet,
    showStreakSheet,
    setShowStreakSheet,
    familySheetId,
    setFamilySheetId,
    pickerLetterSheetId,
    setPickerLetterSheetId,
    formesLetterId,
    setFormesLetterId,
    selectedFormKey,
    setSelectedFormKey,
    formAnimTick,
    setFormAnimTick,
    showHarakatLessonSheet,
    setShowHarakatLessonSheet,
    harakatCardIdx,
    setHarakatCardIdx,
    showVoiceRecorderSheet,
    setShowVoiceRecorderSheet,
    voiceRecStep,
    setVoiceRecStep,
    voiceParentalConsent,
    setVoiceParentalConsent,
    voiceSecElapsed,
    setVoiceSecElapsed,
    voiceDataUrl,
    setVoiceDataUrl,
    startVoiceReadingRecording,
    stopVoiceReadingRecording,
    showAccesSheet,
    setShowAccesSheet,
    activationInput,
    setActivationInput,
    activationError,
    setActivationError,
    showDailyReviewSheet,
    setShowDailyReviewSheet,
    activeMiniGame,
    setActiveMiniGame,
    setLastPlayedMiniGame,
    setGamePlayCount,
    albumCompareLetterId,
    setAlbumCompareLetterId,
    albumSliderPct,
    setAlbumSliderPct,
    showShareSheet,
    setShowShareSheet,
    shareIncludeFirstName,
    setShareIncludeFirstName,
    sharePreviewCanvasRef,
    activeReadingWord,
    setActiveReadingWord,
    tappedCharIndex,
    setTappedCharIndex,
    activeExam,
    setActiveExam,
    activeLesson,
    setActiveLesson,
    setAntWalkingFamilyId,
    getLetterStatus,
    showToast,
  } = app;

  return (
    <>
      {/* FIRST-RUN ONBOARDING MODAL */}
      {showOnboardingModal && !isSelfTestRoute && (
        <div
          data-testid="onboarding-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Bienvenue sur Nouqta"
          className="fixed inset-0 z-50 bg-[var(--paper)] text-[var(--ink)] flex flex-col justify-between max-w-[480px] mx-auto p-[20px]"
        >
          <div className="flex items-center justify-between">
            <span className="font-mono-tag text-[var(--brand)] font-bold">
              BIENVENUE · {onboardingScreenIdx + 1} / 3
            </span>
            <button
              type="button"
              data-testid="onboarding-skip-btn"
              aria-label="Passer l'introduction"
              onClick={finishOnboarding}
              className="min-h-[48px] h-[48px] px-4 rounded-full bg-[var(--surface)] border border-[var(--line)] font-semibold text-[14px] text-[var(--ink)] pressable cursor-pointer"
            >
              Passer
            </button>
          </div>

          <div className="my-auto space-y-6 text-center">
            <div className="flex justify-center">
              <Mascot
                pose={onboardingScreenIdx === 1 ? 'cheer' : 'wave'}
                size={84}
                mode="kids"
              />
            </div>

            {onboardingScreenIdx === 0 && (
              <div data-testid="onboarding-screen-1" className="space-y-5">
                <h1 className="font-display text-[28px] text-[var(--ink)]">
                  Chaque jour, une lettre
                </h1>
                <p className="text-[15px] text-[var(--ink)]/80 mx-auto">
                  5 petites étapes simples avec Nouqta la fourmi.
                </p>
                <div className="grid grid-cols-5 gap-2 pt-2">
                  {[
                    { icon: Eye, word: 'Voir' },
                    { icon: Volume2, word: 'Écouter' },
                    { icon: PenTool, word: 'Tracer' },
                    { icon: Camera, word: 'Écrire' },
                    { icon: Lightbulb, word: 'Retenir' },
                  ].map((st) => {
                    const Icon = st.icon;
                    return (
                      <div
                        key={st.word}
                        className="p-2.5 rounded-[18px] bg-[var(--surface)] border border-[var(--line)] flex flex-col items-center gap-1.5"
                      >
                        <div className="w-10 h-10 rounded-full bg-[var(--brand-deep)] text-white flex items-center justify-center">
                          <Icon className="w-5 h-5" />
                        </div>
                        <span className="text-[12px] font-bold text-[var(--ink)]">
                          {st.word}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {onboardingScreenIdx === 1 && (
              <div data-testid="onboarding-screen-2" className="space-y-5">
                <h1 className="font-display text-[28px] text-[var(--ink)]">
                  Gagne des étoiles
                </h1>
                <p className="text-[15px] text-[var(--ink)]/80 mx-auto">
                  1 à 3 étoiles à la fin de chaque lettre.
                </p>
                <div className="py-4">
                  <StarRating stars={3} />
                </div>
              </div>
            )}

            {onboardingScreenIdx === 2 && (
              <div data-testid="onboarding-screen-3" className="space-y-5">
                <h1 className="font-display text-[28px] text-[var(--ink)]">
                  Garde ta flamme
                </h1>
                <p className="text-[15px] text-[var(--ink)]/80 mx-auto">
                  Apprends un peu chaque jour pour allumer ta semaine.
                </p>
                <div className="grid grid-cols-7 gap-1.5 max-w-[340px] mx-auto pt-2">
                  {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, idx) => (
                    <div
                      key={`${d}_${idx}`}
                      className="flex flex-col items-center gap-1"
                    >
                      <span className="text-[11px] font-bold text-[var(--ink)]/70">
                        {d}
                      </span>
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          idx < 4
                            ? 'bg-[var(--accent)]/20 text-[var(--accent)]'
                            : 'bg-[var(--surface)] border border-[var(--line)]'
                        }`}
                      >
                        <Flame
                          className={`w-5 h-5 ${
                            idx < 4
                              ? 'text-[var(--accent)] fill-[var(--accent)]'
                              : 'text-[var(--locked)]'
                          }`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2">
              {[0, 1, 2].map((idx) => (
                <span
                  key={idx}
                  className={`h-2.5 rounded-full transition-all ${
                    onboardingScreenIdx === idx
                      ? 'w-7 bg-[var(--brand-deep)]'
                      : 'w-2.5 bg-[var(--line)]'
                  }`}
                />
              ))}
            </div>

            <PrimaryButton
              data-testid="onboarding-next-btn"
              onClick={() => {
                if (onboardingScreenIdx < 2) {
                  setOnboardingScreenIdx((i) => (i + 1) as 0 | 1 | 2);
                } else {
                  finishOnboarding();
                }
              }}
            >
              {onboardingScreenIdx < 2 ? 'Suivant' : 'Commencer la 1re leçon'}
            </PrimaryButton>
          </div>
        </div>
      )}

      {/* "?" HELP BOTTOM SHEET ON HOME */}
      <BottomSheet
        isOpen={showHelpSheet}
        onClose={() => setShowHelpSheet(false)}
        title="Comment ça marche ?"
      >
        <div data-testid="help-bottom-sheet" className="space-y-3">
          <div className="p-3.5 rounded-[18px] bg-[var(--paper)] border border-[var(--line)] flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-full bg-[var(--accent)]/20 flex items-center justify-center shrink-0">
              <Flame className="w-6 h-6 text-[var(--accent)] fill-[var(--accent)]" />
            </div>
            <div>
              <div className="font-bold text-[15px] text-[var(--ink)]">
                La flamme
              </div>
              <div className="text-[13px] text-[var(--ink)]/80">
                Tes jours d&apos;apprentissage d&apos;affilée sans coupure.
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-[18px] bg-[var(--paper)] border border-[var(--line)] flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-full bg-[var(--accent)]/20 flex items-center justify-center shrink-0">
              <Star className="w-6 h-6 text-[var(--accent)] fill-[var(--accent)]" />
            </div>
            <div>
              <div className="font-bold text-[15px] text-[var(--ink)]">
                Les étoiles
              </div>
              <div className="text-[13px] text-[var(--ink)]/80">
                1 à 3 étoiles gagnées au quiz de chaque lettre.
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-[18px] bg-[var(--paper)] border border-[var(--line)] flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-full bg-[var(--good)]/20 flex items-center justify-center shrink-0">
              <Check className="w-6 h-6 text-[var(--good)]" />
            </div>
            <div>
              <div className="font-bold text-[15px] text-[var(--ink)]">
                L&apos;objectif de la semaine
              </div>
              <div className="text-[13px] text-[var(--ink)]/80">
                Le nombre de lettres apprises depuis lundi.
              </div>
            </div>
          </div>

          <PrimaryButton onClick={() => setShowHelpSheet(false)}>
            J&apos;ai compris
          </PrimaryButton>
        </div>
      </BottomSheet>

      {/* BOTTOM SHEET 0: STREAK 7-DAY CALENDAR SHEET */}
      <BottomSheet
        isOpen={showStreakSheet}
        onClose={() => setShowStreakSheet(false)}
        title="Votre série quotidienne"
      >
        <div data-testid="streak-sheet-content" className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-[18px] bg-[var(--paper)] border border-[var(--line)] p-4 flex items-center gap-3">
              <Flame className="w-8 h-8 text-[var(--accent)] fill-[var(--accent)] shrink-0" />
              <div>
                <div className="font-display text-[26px] leading-none text-[var(--ink)]">
                  {userStreak} j
                </div>
                <div className="text-[12px] font-semibold text-[var(--ink)]/75 mt-1">
                  Série actuelle
                </div>
              </div>
            </div>

            <div className="rounded-[18px] bg-[var(--paper)] border border-[var(--line)] p-4 flex items-center gap-3">
              <Star className="w-8 h-8 text-[var(--brand)] fill-[var(--brand)] shrink-0" />
              <div>
                <div className="font-display text-[26px] leading-none text-[var(--ink)]">
                  {bestStreak} j
                </div>
                <div className="text-[12px] font-semibold text-[var(--ink)]/75 mt-1">
                  Meilleure série
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <span className="font-mono-tag text-[var(--brand)] block">
              SEMAINE EN COURS (7 JOURS)
            </span>
            <div className="grid grid-cols-7 gap-1.5 text-center">
              {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(
                (dayLabel, idx) => {
                  const todayIndex = 4;
                  const isToday = idx === todayIndex;
                  const isDone =
                    idx <= todayIndex &&
                    idx > todayIndex - Math.min(userStreak, 5);
                  return (
                    <div
                      key={dayLabel}
                      className="flex flex-col items-center gap-1.5"
                    >
                      <span className="text-[11px] font-semibold text-[var(--ink)]/75">
                        {dayLabel}
                      </span>
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          isDone
                            ? 'bg-[var(--accent)]/20 text-[var(--accent)]'
                            : 'bg-[var(--paper)] border border-[var(--line)] text-[var(--locked)]'
                        } ${
                          isToday ? 'ring-2 ring-[var(--accent)] font-bold' : ''
                        }`}
                      >
                        {isDone ? (
                          <Flame className="w-5 h-5 text-[var(--accent)] fill-[var(--accent)]" />
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-[var(--line)]" />
                        )}
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          </div>

          <div className="rounded-[18px] bg-[var(--paper)] border border-[var(--line)] p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Shield className="w-6 h-6 text-[var(--brand)] shrink-0" />
              <div>
                <div className="font-semibold text-[15px] text-[var(--ink)]">
                  Jour de repos hebdomadaire
                </div>
                <div className="text-[13px] text-[var(--ink)]/75">
                  Protège votre série une fois par semaine en cas d&apos;oubli.
                </div>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full bg-[var(--good)]/15 text-[var(--good)] font-mono-tag text-[11px] font-bold shrink-0">
              {streakObj.repairUsedWeek ? 'UTILISÉ' : 'DISPONIBLE'}
            </span>
          </div>

          <PrimaryButton onClick={() => setShowStreakSheet(false)}>
            Continuer
          </PrimaryButton>
        </div>
      </BottomSheet>

      {/* BOTTOM SHEET 1: FAMILY DETAIL */}
      <BottomSheet
        isOpen={Boolean(familySheetId)}
        onClose={() => setFamilySheetId(null)}
        title={
          LETTER_FAMILIES.find((f) => f.id === familySheetId)?.nameFr || ''
        }
      >
        {familySheetId &&
          (() => {
            const fam = LETTER_FAMILIES.find((f) => f.id === familySheetId)!;
            const famLetters = fam.letters
              .map((lid) => letters.find((l) => l.id === lid))
              .filter((l): l is LetterRecord => Boolean(l));
            const completedInFam = famLetters.filter((l) => {
              const p = userProgress.find((pr) => pr.letterId === l.id);
              return p && p.stepsDone.length >= 5;
            }).length;

            return (
              <div className="space-y-5">
                <div className="flex items-center justify-around py-2 flex-wrap gap-2">
                  {famLetters.map((letter) => {
                    const status = getLetterStatus(letter.id);
                    return (
                      <LetterChip
                        key={letter.id}
                        arabicChar={letter.arabicChar}
                        nameFr={letter.shortName || letter.nameFr}
                        status={status}
                        onClick={() => {
                          if (status === 'locked') {
                            showToast(t('lock.toast', mode), 'info');
                          } else {
                            setFamilySheetId(null);
                            setActiveLesson({ letterId: letter.id });
                          }
                        }}
                      />
                    );
                  })}
                </div>

                <div className="space-y-2">
                  <div className="h-3 w-full rounded-full bg-[var(--paper)] overflow-hidden">
                    <div
                      style={{
                        width: `${Math.round(
                          (completedInFam / famLetters.length) * 100
                        )}%`,
                      }}
                      className="h-full bg-[var(--good)] rounded-full transition-all"
                    />
                  </div>
                  <div className="flex items-center justify-between text-[14px] font-semibold">
                    <span>{fam.teachingFocusFr}</span>
                    <span className="font-mono-tag">
                      {completedInFam} / {famLetters.length} lettres
                    </span>
                  </div>
                </div>

                {completedInFam >= famLetters.length &&
                famLetters.every((l) => unlockedLetterIds.includes(l.id)) ? (
                  <SecondaryButton
                    data-testid="family-exam-start-btn"
                    onClick={() => {
                      setFamilySheetId(null);
                      setActiveExam({
                        kind: 'family',
                        familyId: fam.id,
                        questions: buildFamilyExamQuestions(
                          fam.id,
                          mode === 'kids' ? 3 : 4,
                          learnedLetterIds
                        ),
                        currentIndex: 0,
                        selectedOpt: null,
                        answered: false,
                        correctCount: 0,
                        finished: false,
                      });
                    }}
                  >
                    Examen de la famille (10 questions)
                  </SecondaryButton>
                ) : (
                  <button
                    type="button"
                    data-testid="family-exam-locked-btn"
                    disabled
                    aria-label={`Examen verrouillé : Termine les ${famLetters.length} lettres`}
                    className="w-full min-h-[56px] h-[56px] px-4 rounded-[18px] bg-[var(--paper)] border-2 border-[var(--line)] text-[var(--locked)] font-bold text-[15px] flex items-center justify-center gap-2 opacity-75 cursor-not-allowed"
                  >
                    <Lock className="w-4 h-4 shrink-0" />
                    <span>Termine les {famLetters.length} lettres</span>
                  </button>
                )}
              </div>
            );
          })()}
      </BottomSheet>

      {/* BOTTOM SHEET 2: LETTER PICKER SHEET */}
      <BottomSheet
        isOpen={Boolean(pickerLetterSheetId)}
        onClose={() => setPickerLetterSheetId(null)}
        title={
          letters.find((l) => l.id === pickerLetterSheetId)?.shortName ||
          letters.find((l) => l.id === pickerLetterSheetId)?.nameFr ||
          ''
        }
      >
        {pickerLetterSheetId &&
          (() => {
            const letter = letters.find((l) => l.id === pickerLetterSheetId)!;
            const label = letter.shortName || letter.nameFr;
            const actions: {
              step: StepId;
              label: string;
              icon: React.ComponentType<{ className?: string }>;
            }[] = [
              { step: 'voir', label: t('step.see', mode), icon: Eye },
              {
                step: 'ecouter',
                label: t('step.listen', mode),
                icon: Volume2,
              },
              { step: 'tracer', label: t('step.trace', mode), icon: PenTool },
              { step: 'ecrire', label: t('step.write', mode), icon: Camera },
            ];

            return (
              <div className="space-y-4">
                <div className="flex items-center justify-between px-4 py-3 rounded-[20px] bg-[var(--paper)] border border-[var(--line)]">
                  <div className="flex items-center gap-3">
                    <span className="text-[36px] leading-none">
                      {letter.picture}
                    </span>
                    <div>
                      <HighlightedArabicKeyword
                        keyword={letter.keyword}
                        targetChar={letter.arabicChar}
                        className="font-arabic text-[28px] leading-tight block"
                      />
                      <span className="text-[13px] font-semibold text-[var(--ink)]/75">
                        {letter.keywordFr}
                      </span>
                    </div>
                  </div>
                  <span
                    lang="ar"
                    dir="rtl"
                    className="font-arabic text-[64px] text-[var(--brand-deep)] dark:text-[var(--ink)] leading-none"
                  >
                    {letter.arabicChar}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  {actions.map((act) => {
                    const Icon = act.icon;
                    return (
                      <button
                        key={act.step}
                        type="button"
                        aria-label={`${act.label} ${label}`}
                        onClick={() => {
                          setPickerLetterSheetId(null);
                          setActiveLesson({
                            letterId: letter.id,
                            initialStep: act.step,
                          });
                        }}
                        className="min-h-[64px] h-[64px] rounded-[18px] bg-[var(--paper)] border border-[var(--line)] flex items-center justify-center gap-2 pressable cursor-pointer"
                      >
                        <Icon className="w-5 h-5 text-[var(--brand)]" />
                        <span className="font-semibold text-[15px] text-[var(--ink)]">
                          {act.label}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <button
                    type="button"
                    data-testid="letter-sheet-pratique-btn"
                    aria-label={`Pratique calligraphie ${label}`}
                    onClick={() => {
                      setPickerLetterSheetId(null);
                      setActiveLesson({
                        letterId: letter.id,
                        initialStep: 'tracer',
                        practiceMode: true,
                      });
                    }}
                    className="min-h-[52px] h-[52px] px-3 rounded-[18px] bg-[var(--brand-deep)] text-white font-bold text-[14px] flex items-center justify-center gap-2 pressable cursor-pointer"
                  >
                    <PenTool className="w-4 h-4" />
                    <span>Pratique</span>
                  </button>

                  <button
                    type="button"
                    data-testid="letter-sheet-formes-btn"
                    aria-label={`Voir les formes de ${label}`}
                    onClick={() => {
                      setPickerLetterSheetId(null);
                      setSelectedFormKey('isolated');
                      setFormAnimTick((c) => c + 1);
                      setFormesLetterId(letter.id);
                    }}
                    className="min-h-[52px] h-[52px] px-3 rounded-[18px] bg-[var(--accent)] text-[var(--accent-ink)] font-bold text-[14px] flex items-center justify-center gap-2 pressable cursor-pointer"
                  >
                    <Layers className="w-4 h-4" />
                    <span>Formes</span>
                  </button>
                </div>
              </div>
            );
          })()}
      </BottomSheet>

      {/* LETTER POSITIONAL FORMS SHEET ("Formes") */}
      <BottomSheet
        isOpen={Boolean(formesLetterId)}
        onClose={() => setFormesLetterId(null)}
        title={
          formesLetterId
            ? `Formes · ${
                letters.find((l) => l.id === formesLetterId)?.shortName || ''
              }`
            : 'Formes de la lettre'
        }
      >
        {formesLetterId &&
          (() => {
            const letter = letters.find((l) => l.id === formesLetterId)!;
            const forms = getPositionalFormsForLetter(letter);
            const activeForm =
              forms.find((f) => f.key === selectedFormKey) || forms[0];

            return (
              <div data-testid="letter-formes-sheet" className="space-y-4">
                {!letter.connects && (
                  <div className="px-3.5 py-2 rounded-[14px] bg-[var(--accent)]/15 border border-[var(--accent)]/40 text-[12px] font-semibold text-[var(--ink)]">
                    Cette lettre ne s&apos;attache pas à gauche : elle possède
                    uniquement les formes <strong>Isolée</strong> et{' '}
                    <strong>Fin</strong>.
                  </div>
                )}

                <div
                  className={`grid gap-2 ${
                    forms.length === 2 ? 'grid-cols-2' : 'grid-cols-4'
                  }`}
                >
                  {forms.map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      data-testid={`forme-tab-${f.key}`}
                      aria-label={`Forme ${f.labelFr}`}
                      onClick={() => {
                        setSelectedFormKey(f.key);
                        setFormAnimTick((c) => c + 1);
                      }}
                      className={`min-h-[56px] p-2 rounded-[16px] border-2 flex flex-col items-center justify-center pressable cursor-pointer ${
                        activeForm.key === f.key
                          ? 'border-[var(--brand)] bg-[var(--brand)]/10 text-[var(--ink)]'
                          : 'border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]/75'
                      }`}
                    >
                      <span
                        lang="ar"
                        dir="rtl"
                        className="font-arabic text-[28px] leading-none"
                      >
                        {f.arabicDisplay}
                      </span>
                      <span className="text-[11px] font-bold mt-1">
                        {f.labelFr}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="w-full h-[180px] rounded-[22px] bg-[var(--paper)] border-2 border-[var(--line)] flex flex-col items-center justify-center relative">
                  {activeForm.isDraft && (
                    <span className="absolute top-2.5 left-3 px-2.5 py-0.5 rounded-full bg-[var(--accent)]/20 text-[var(--accent-ink)] dark:text-[var(--accent)] font-mono-tag text-[10px] font-bold">
                      TRACÉ BROUILLON
                    </span>
                  )}
                  <span
                    key={`${activeForm.key}_${formAnimTick}`}
                    lang="ar"
                    dir="rtl"
                    style={{ lineHeight: 1.9 }}
                    className="font-arabic text-[84px] text-[var(--brand-deep)] dark:text-[var(--ink)]"
                  >
                    {activeForm.arabicDisplay}
                  </span>
                </div>

                <div className="p-3.5 rounded-[18px] bg-[var(--paper)] border border-[var(--line)] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-[32px]">{letter.picture}</span>
                    <div>
                      <span className="text-[12px] font-mono-tag text-[var(--brand)] block">
                        MOT-CLÉ AVEC LETTRE SURLIGNÉE
                      </span>
                      <span className="text-[14px] font-bold text-[var(--ink)]">
                        {letter.keywordFr}
                      </span>
                    </div>
                  </div>
                  <HighlightedArabicKeyword
                    keyword={letter.keyword}
                    targetChar={letter.arabicChar}
                    className="font-arabic text-[34px]"
                  />
                </div>

                <PrimaryButton onClick={() => setFormesLetterId(null)}>
                  Continuer
                </PrimaryButton>
              </div>
            );
          })()}
      </BottomSheet>

      {/* HARAKAT LESSON ("Les voyelles courtes") */}
      <BottomSheet
        isOpen={showHarakatLessonSheet}
        onClose={() => setShowHarakatLessonSheet(false)}
        title="Les voyelles courtes"
      >
        {(() => {
          const card =
            HARAKAT_MINI_LESSON_CARDS[
              harakatCardIdx % HARAKAT_MINI_LESSON_CARDS.length
            ];
          return (
            <div data-testid="harakat-lesson-sheet" className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-mono-tag text-[var(--brand)] font-bold">
                  CARTE {harakatCardIdx + 1} / {HARAKAT_MINI_LESSON_CARDS.length}
                </span>
                <span className="font-mono-tag text-[12px] text-[var(--ink)]/75">
                  {card.soundFr}
                </span>
              </div>

              <div className="p-4 rounded-[24px] bg-[var(--paper)] border-2 border-[var(--line)] text-center space-y-3">
                <div className="w-[150px] h-[150px] mx-auto rounded-[20px] bg-[var(--surface)] border border-[var(--line)] flex items-center justify-center relative">
                  <svg viewBox="0 0 200 200" className="w-full h-full">
                    <text
                      x="100"
                      y="124"
                      textAnchor="middle"
                      lang="ar"
                      direction="rtl"
                      className="font-arabic select-none"
                      fontSize="76"
                      fill="var(--ink)"
                    >
                      ب
                    </text>
                    <path
                      d={card.antMarkSvgPath}
                      fill="none"
                      stroke="#D97706"
                      strokeWidth="9"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span className="absolute bottom-1.5 right-2 text-[14px]">
                    🐜
                  </span>
                </div>

                <h3 className="font-display text-[22px] text-[var(--ink)]">
                  {card.nameFr}
                </h3>
                <p className="text-[14px] text-[var(--ink)]/80 mx-auto">
                  {card.ruleFr}
                </p>

                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-mono-tag font-bold text-[var(--brand)] block">
                    LECTURE DES 4 LETTRES DE LA FAMILLE 1 :
                  </span>
                  <div dir="rtl" className="grid grid-cols-4 gap-2">
                    {card.family1Syllables.map((syl) => (
                      <button
                        key={syl.letterId}
                        type="button"
                        aria-label={`Écouter la syllabe ${syl.soundFr}`}
                        onClick={() => speechService.speakArabic(syl.arabic)}
                        style={{ lineHeight: 1.95 }}
                        className="min-h-[64px] py-1.5 px-2 rounded-[16px] bg-[var(--surface)] border border-[var(--brand)]/40 flex flex-col items-center justify-center pressable cursor-pointer"
                      >
                        <span
                          lang="ar"
                          dir="rtl"
                          style={{ lineHeight: 1.95 }}
                          className="font-arabic text-[28px] text-[var(--ink)]"
                        >
                          {syl.arabic}
                        </span>
                        <span className="text-[11px] font-bold text-[var(--brand)]">
                          {syl.soundFr}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <SecondaryButton
                  disabled={harakatCardIdx === 0}
                  onClick={() => setHarakatCardIdx((i) => Math.max(0, i - 1))}
                >
                  Précédent
                </SecondaryButton>
                <PrimaryButton
                  onClick={() => {
                    if (harakatCardIdx + 1 < HARAKAT_MINI_LESSON_CARDS.length) {
                      setHarakatCardIdx((i) => i + 1);
                    } else {
                      setShowHarakatLessonSheet(false);
                      const learnedF1 = letters
                        .slice(0, 4)
                        .filter((l) => learnedLetterIds.includes(l.id));
                      const qList = buildVariedQuizSequence(
                        learnedF1.length > 0 ? learnedF1 : letters.slice(0, 1),
                        5,
                        mode === 'kids' ? 3 : 4
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
                    }
                  }}
                >
                  {harakatCardIdx + 1 < HARAKAT_MINI_LESSON_CARDS.length
                    ? 'Carte suivante'
                    : 'Quiz Lecture voyelle'}
                </PrimaryButton>
              </div>
            </div>
          );
        })()}
      </BottomSheet>

      {/* VOICE READING RECORDER SHEET ("Lis à voix haute", <= 30s) */}
      <BottomSheet
        isOpen={showVoiceRecorderSheet}
        onClose={() => {
          stopVoiceReadingRecording();
          setShowVoiceRecorderSheet(false);
        }}
        title="Lis à voix haute"
      >
        <div data-testid="voice-recorder-sheet" className="space-y-4">
          {voiceRecStep === 'explain' && (
            <div className="space-y-4">
              <div className="p-4 rounded-[20px] bg-[var(--paper)] border border-[var(--line)] space-y-2">
                <span className="font-mono-tag text-[var(--brand)] block">
                  POURQUOI LE MICROPHONE ?
                </span>
                <p className="text-[14px] text-[var(--ink)]/85">
                  Ton enregistrement (maximum 30 secondes) est envoyé uniquement
                  à ton professeur pour vérifier ta prononciation.
                </p>
                <p className="text-[12px] text-[var(--ink)]/70">
                  Conservation privée limitée à 90 jours · Suppression immédiate
                  sur simple demande.
                </p>
              </div>

              {mode === 'kids' && (
                <button
                  type="button"
                  data-testid="voice-parental-consent-toggle"
                  aria-label="Accord d'un parent pour l'enregistrement vocal"
                  onClick={() => setVoiceParentalConsent((v) => !v)}
                  className="w-full min-h-[52px] px-4 py-2 rounded-[16px] bg-[var(--paper)] border border-[var(--line)] flex items-center justify-between text-left pressable cursor-pointer"
                >
                  <span className="text-[13px] font-semibold text-[var(--ink)]">
                    Accord d&apos;un parent (Mode Enfant)
                  </span>
                  <span
                    className={`px-3 py-1 rounded-full font-mono-tag text-[11px] font-bold ${
                      voiceParentalConsent
                        ? 'bg-[var(--good)]/20 text-[var(--good)]'
                        : 'bg-[var(--bad)]/15 text-[var(--bad)]'
                    }`}
                  >
                    {voiceParentalConsent ? 'OUI' : 'NON'}
                  </span>
                </button>
              )}

              <PrimaryButton
                data-testid="voice-start-record-btn"
                disabled={mode === 'kids' && !voiceParentalConsent}
                icon={<Mic className="w-5 h-5" />}
                onClick={startVoiceReadingRecording}
              >
                Enregistrer (max 30 s)
              </PrimaryButton>
            </div>
          )}

          {voiceRecStep === 'recording' && (
            <div className="text-center space-y-4 py-3">
              <div className="w-20 h-20 rounded-full bg-[var(--bad)]/15 text-[var(--bad)] flex items-center justify-center mx-auto animate-pulse">
                <Mic className="w-9 h-9" />
              </div>
              <div className="font-mono-tag text-[22px] font-bold text-[var(--ink)]">
                00:{String(voiceSecElapsed).padStart(2, '0')} / 00:30
              </div>
              <p className="text-[14px] text-[var(--ink)]/80">
                Lis la lettre ou le mot à haute voix…
              </p>
              <PrimaryButton
                data-testid="voice-stop-record-btn"
                icon={<Square className="w-5 h-5" />}
                onClick={stopVoiceReadingRecording}
              >
                Arrêter l&apos;enregistrement
              </PrimaryButton>
            </div>
          )}

          {voiceRecStep === 'preview' && (
            <div className="space-y-4">
              <div className="p-4 rounded-[20px] bg-[var(--paper)] border border-[var(--line)] flex items-center justify-between">
                <div>
                  <span className="font-bold text-[15px] text-[var(--ink)] block">
                    Écouter mon enregistrement
                  </span>
                  <span className="font-mono-tag text-[12px] text-[var(--brand)]">
                    Durée : {Math.max(1, voiceSecElapsed)} s / 30 s
                  </span>
                </div>
                <IconButton
                  ariaLabel="Écouter l'aperçu vocal"
                  onClick={() =>
                    speechService.speakArabic(
                      activeReadingWord
                        ? activeReadingWord.audioText
                        : todayInfo.letter.speechText
                    )
                  }
                >
                  <Volume2 className="w-5 h-5 text-[var(--brand)]" />
                </IconButton>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <SecondaryButton
                  icon={<RotateCcw className="w-4 h-4" />}
                  onClick={() => {
                    setVoiceDataUrl(null);
                    setVoiceSecElapsed(0);
                    setVoiceRecStep('explain');
                  }}
                >
                  Réessayer
                </SecondaryButton>

                <button
                  type="button"
                  aria-label="Supprimer l'enregistrement"
                  onClick={() => {
                    setVoiceDataUrl(null);
                    setVoiceSecElapsed(0);
                    setShowVoiceRecorderSheet(false);
                    showToast('Enregistrement supprimé', 'info');
                  }}
                  className="min-h-[56px] h-[56px] px-4 rounded-[18px] bg-[var(--bad)]/10 border border-[var(--bad)]/40 text-[var(--bad)] font-bold text-[14px] flex items-center justify-center gap-2 pressable cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Supprimer</span>
                </button>
              </div>

              <PrimaryButton
                data-testid="voice-send-to-teacher-btn"
                icon={<Send className="w-5 h-5" />}
                onClick={() => {
                  const expires = new Date();
                  expires.setDate(expires.getDate() + 90);
                  setState((prev) => ({
                    ...prev,
                    submissions: [
                      {
                        id: `sub_voice_${Date.now()}`,
                        userId: activeUser.id,
                        studentFirstName: activeUser.displayName,
                        letterId: todayInfo.letter.id,
                        wordId: activeReadingWord?.id,
                        kind: 'audio',
                        imageRef: '',
                        audioRef:
                          voiceDataUrl ||
                          'data:audio/webm;base64,NOUQTA_VOICE_30S',
                        durationSec: Math.min(30, Math.max(2, voiceSecElapsed)),
                        parentalConsent: voiceParentalConsent,
                        expiresAtIso: expires.toISOString().slice(0, 10),
                        status: 'pending',
                        createdAt: "À l'instant",
                      },
                      ...prev.submissions,
                    ],
                  }));
                  setShowVoiceRecorderSheet(false);
                  showToast('Lecture vocale envoyée au professeur !', 'good');
                }}
              >
                Envoyer au professeur
              </PrimaryButton>
            </div>
          )}
        </div>
      </BottomSheet>

      {/* BOTTOM SHEET 3: ACCÈS (PAYWALL & ACTIVATION CODE) */}
      <BottomSheet
        isOpen={showAccesSheet}
        onClose={() => setShowAccesSheet(false)}
        title="Débloquer tout le cours"
      >
        <div className="space-y-4">
          <p className="text-[15px] font-semibold text-[var(--brand)]">
            {state.adminConfig.priceDisplayFr}
          </p>

          <div className="space-y-2">
            {[
              {
                label: 'PayPal',
                url: state.adminConfig.paypalUrl,
              },
              {
                label: 'WhatsApp',
                url: state.adminConfig.whatsappUrl,
              },
              {
                label: 'Carte bancaire',
                url: state.adminConfig.cardUrl,
              },
            ].map((pm) => (
              <a
                key={pm.label}
                href={pm.url}
                target="_blank"
                rel="noreferrer"
                className="w-full min-h-[52px] h-[52px] px-4 rounded-[18px] bg-[var(--paper)] border border-[var(--line)] flex items-center justify-between font-semibold text-[15px] text-[var(--ink)] pressable"
              >
                <span>{pm.label}</span>
                <span className="font-mono-tag text-[var(--brand)]">OUVRIR</span>
              </a>
            ))}
          </div>

          <div className="pt-2 border-t border-[var(--line)] space-y-2.5">
            <label className="block text-[14px] font-semibold text-[var(--ink)]">
              J&apos;ai un code (ex: ALIF-2026)
              <input
                type="text"
                value={activationInput}
                onChange={(e) => {
                  setActivationInput(e.target.value);
                  setActivationError(null);
                }}
                placeholder="ALIF-2026"
                className="mt-1.5 w-full h-[52px] px-4 rounded-[18px] bg-[var(--paper)] border border-[var(--line)] font-mono-tag text-[15px] text-[var(--ink)]"
              />
            </label>

            {activationError && (
              <p className="text-[14px] font-semibold text-[var(--bad)]">
                {activationError}
              </p>
            )}

            <PrimaryButton
              onClick={() => {
                const res = redeemActivationCode(
                  state,
                  activeUser.id,
                  activationInput
                );
                setState(res.nextState);
                if (res.ok) {
                  speechService.triggerSuccessFeedback();
                  setShowAccesSheet(false);
                  setActivationInput('');
                  showToast('Plan complet activé !', 'good');
                } else {
                  setActivationError(
                    res.errorFr || "Ce code n'est pas valide"
                  );
                }
              }}
            >
              Activer
            </PrimaryButton>
          </div>
        </div>
      </BottomSheet>

      {/* BOTTOM SHEET 4: DEFI DU JOUR 5 MINI-GAMES (FIX 1b: uses learnedLetterIds) */}
      <BottomSheet
        isOpen={showDailyReviewSheet}
        onClose={() => setShowDailyReviewSheet(false)}
        title="Mini-jeu du jour"
      >
        <div data-testid="defi-sheet-content" className="space-y-4">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {MINI_GAMES_CATALOG.map((g) => (
              <button
                key={g.id}
                type="button"
                aria-label={`Mini-jeu ${g.titleFr}`}
                onClick={() => {
                  setActiveMiniGame(g.id);
                  setLastPlayedMiniGame(g.id);
                }}
                className={`min-h-[48px] h-[48px] px-3 rounded-[14px] text-[12px] font-bold whitespace-nowrap border pressable cursor-pointer flex items-center gap-1.5 ${
                  activeMiniGame === g.id
                    ? 'bg-[var(--brand-deep)] text-white border-[var(--brand-deep)]'
                    : 'bg-[var(--paper)] text-[var(--ink)] border-[var(--line)]'
                }`}
              >
                <span>{g.emoji}</span>
                <span>{g.titleFr}</span>
              </button>
            ))}
          </div>

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
              const targetLetterId = (dailyQueue[0] || todayInfo.letter).id;
              setState((prev) => {
                const withMission = markDailyMissionDone(
                  prev,
                  activeUser.id,
                  'jeu'
                );
                const nextProg = withMission.progress.map((p) => {
                  if (
                    p.userId === activeUser.id &&
                    p.letterId === targetLetterId
                  ) {
                    const adv = advanceReviewBox(p.box, true);
                    return {
                      ...p,
                      box: adv.nextBox,
                      nextReviewAt: adv.nextReviewAt,
                      stars: Math.min(
                        3,
                        Math.max(p.stars || 0, starsEarned)
                      ) as 0 | 1 | 2 | 3,
                      masteredAt: adv.newlyMastered
                        ? getTodayIsoDate()
                        : p.masteredAt,
                    };
                  }
                  return p;
                });
                return {
                  ...withMission,
                  progress: nextProg,
                  dailyChallengeDoneDate: {
                    ...withMission.dailyChallengeDoneDate,
                    [activeUser.id]: getTodayIsoDate(),
                  },
                  miniGameDoneUsers: {
                    ...(withMission.miniGameDoneUsers || {}),
                    [activeUser.id]: true,
                  },
                };
              });
              setShowDailyReviewSheet(false);
              showToast(
                `Mission « Jouer 1 jeu » validée (+${starsEarned} ★) !`,
                'good'
              );
            }}
          />
        </div>
      </BottomSheet>

      {/* BOTTOM SHEET 5: LETTER ALBUM "AVANT / MAINTENANT" SLIDER */}
      <BottomSheet
        isOpen={Boolean(albumCompareLetterId)}
        onClose={() => setAlbumCompareLetterId(null)}
        title={
          albumCompareLetterId
            ? `Mon cahier · ${
                letters.find((l) => l.id === albumCompareLetterId)?.shortName ||
                letters.find((l) => l.id === albumCompareLetterId)?.nameFr ||
                ''
              }`
            : 'Mon cahier'
        }
      >
        {albumCompareLetterId &&
          (() => {
            const letter = letters.find((l) => l.id === albumCompareLetterId)!;
            const prog = userProgress.find((p) => p.letterId === letter.id);
            const firstBodyStroke = letter.forms.isolated.strokes.find(
              (s) => s.kind === 'body'
            );
            const fallbackPts = sampleSvgPathEqualLength(
              firstBodyStroke && firstBodyStroke.kind === 'body'
                ? firstBodyStroke.d
                : 'M 100 40 L 100 150',
              24
            );
            const firstPts =
              prog?.firstTrace && prog.firstTrace.length >= 2
                ? prog.firstTrace
                : fallbackPts.map((pt, idx) => ({
                    x: pt.x + Math.sin(idx) * 4,
                    y: pt.y + Math.cos(idx) * 4,
                  }));
            const bestPts =
              prog?.bestTrace && prog.bestTrace.length >= 2
                ? prog.bestTrace
                : fallbackPts;

            const firstPathD = pointsToSmoothQuadraticSvgPath(firstPts);
            const bestPathD = pointsToSmoothQuadraticSvgPath(bestPts);
            const bestOpacity = albumSliderPct / 100;
            const firstOpacity = 1 - bestOpacity * 0.75;

            return (
              <div data-testid="album-compare-sheet" className="space-y-4">
                <div className="flex items-center justify-between text-[13px] font-semibold">
                  <span className="font-mono-tag text-[var(--brand)]">
                    AVANT (1ER TRACÉ)
                  </span>
                  <span className="font-mono-tag text-[var(--good)]">
                    MAINTENANT (MEILLEUR TRACÉ)
                  </span>
                </div>

                <div className="w-full h-[220px] rounded-[24px] bg-[var(--paper)] border-2 border-[var(--line)] flex items-center justify-center relative overflow-hidden">
                  <svg
                    viewBox="0 0 200 200"
                    className="w-[200px] h-[200px]"
                    aria-label="Comparaison Avant et Maintenant du tracé"
                  >
                    {letter.forms.isolated.strokes.map((st) =>
                      st.kind === 'body' ? (
                        <path
                          key={st.id}
                          d={st.d}
                          fill="none"
                          stroke="#C9D6D1"
                          strokeWidth={14}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          opacity={0.45}
                        />
                      ) : (
                        <circle
                          key={st.id}
                          cx={st.at[0]}
                          cy={st.at[1]}
                          r={st.radius}
                          fill="#07463D"
                          opacity={0.85}
                        />
                      )
                    )}

                    {firstPathD && (
                      <path
                        d={firstPathD}
                        fill="none"
                        stroke="#F3A300"
                        strokeWidth={11}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity={firstOpacity}
                      />
                    )}

                    {bestPathD && (
                      <path
                        d={bestPathD}
                        fill="none"
                        stroke="#07463D"
                        strokeWidth={13}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity={bestOpacity}
                      />
                    )}
                  </svg>
                </div>

                <div className="space-y-2">
                  <label className="block text-[13px] font-semibold text-[var(--ink)]">
                    Curseur Avant / Maintenant ({albumSliderPct}%)
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={albumSliderPct}
                      aria-label="Curseur de comparaison Avant et Maintenant"
                      onChange={(e) =>
                        setAlbumSliderPct(Number(e.target.value))
                      }
                      className="mt-2 w-full h-[48px] accent-[var(--brand)] cursor-pointer"
                    />
                  </label>

                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      aria-label="Voir le tracé Avant"
                      onClick={() => setAlbumSliderPct(0)}
                      className={`min-h-[48px] h-[48px] rounded-[14px] font-bold text-[14px] border pressable cursor-pointer ${
                        albumSliderPct < 50
                          ? 'bg-[var(--accent)] text-[var(--accent-ink)] border-[var(--accent)]'
                          : 'bg-[var(--paper)] text-[var(--ink)] border-[var(--line)]'
                      }`}
                    >
                      Avant
                    </button>
                    <button
                      type="button"
                      aria-label="Voir le tracé Maintenant"
                      onClick={() => setAlbumSliderPct(100)}
                      className={`min-h-[48px] h-[48px] rounded-[14px] font-bold text-[14px] border pressable cursor-pointer ${
                        albumSliderPct >= 50
                          ? 'bg-[var(--brand-deep)] text-white border-[var(--brand-deep)]'
                          : 'bg-[var(--paper)] text-[var(--ink)] border-[var(--line)]'
                      }`}
                    >
                      Maintenant
                    </button>
                  </div>
                </div>

                <PrimaryButton onClick={() => setAlbumCompareLetterId(null)}>
                  Continuer
                </PrimaryButton>
              </div>
            );
          })()}
      </BottomSheet>

      {/* BOTTOM SHEET 6: SHAREABLE CARD 1080x1080 PNG */}
      <BottomSheet
        isOpen={showShareSheet}
        onClose={() => setShowShareSheet(false)}
        title="Partager ma progression"
      >
        <div data-testid="share-card-sheet" className="space-y-4">
          <div className="flex justify-center">
            <canvas
              ref={sharePreviewCanvasRef}
              width={1080}
              height={1080}
              className="w-[240px] h-[240px] rounded-[20px] border border-[var(--line)] shadow-sm bg-[#07463D]"
            />
          </div>

          <button
            type="button"
            data-testid="toggle-share-firstname"
            aria-label="Afficher mon prénom sur la carte de partage"
            onClick={() => setShareIncludeFirstName((v) => !v)}
            className="w-full min-h-[52px] h-[52px] px-4 rounded-[18px] bg-[var(--paper)] border border-[var(--line)] flex items-center justify-between pressable cursor-pointer"
          >
            <span className="font-semibold text-[15px] text-[var(--ink)]">
              Afficher mon prénom
            </span>
            <span
              className={`px-3 py-1 rounded-full font-mono-tag text-[12px] font-bold ${
                shareIncludeFirstName
                  ? 'bg-[var(--good)]/20 text-[var(--good)]'
                  : 'bg-[var(--line)] text-[var(--ink)]/70'
              }`}
            >
              {shareIncludeFirstName ? 'OUI' : 'NON'}
            </span>
          </button>

          <div className="space-y-2.5">
            <PrimaryButton
              icon={<Share2 className="w-5 h-5" />}
              onClick={async () => {
                const res = await shareOrDownloadCard({
                  showName: shareIncludeFirstName,
                  learnerName: activeUser.displayName,
                  lettersMastered: Math.max(
                    completedLettersCount,
                    masteredLettersCount
                  ),
                  streak: userStreak,
                  totalStars,
                });
                showToast(
                  res.sharedViaWebShare
                    ? 'Carte partagée !'
                    : 'Carte PNG (1080×1080) téléchargée !',
                  'good'
                );
              }}
            >
              Télécharger / Partager l&apos;image
            </PrimaryButton>

            <a
              href={`https://wa.me/?text=${encodeURIComponent(
                `J'apprends à lire et écrire l'arabe sur Nouqta ! ${Math.max(
                  completedLettersCount,
                  masteredLettersCount
                )}/28 lettres et ${userStreak} jour(s) de série.`
              )}`}
              target="_blank"
              rel="noreferrer"
              aria-label="Partager sur WhatsApp"
              className="w-full min-h-[52px] h-[52px] px-4 rounded-[18px] bg-[var(--paper)] border-2 border-[var(--brand)] text-[var(--brand)] font-bold text-[15px] flex items-center justify-center gap-2 pressable"
            >
              <MessageCircle className="w-5 h-5" />
              <span>Partager sur WhatsApp</span>
            </a>
          </div>
        </div>
      </BottomSheet>

      {/* FULLSCREEN READING EXERCISE (/lecture/:id) */}
      {activeReadingWord && (
        <div className="fixed inset-0 z-40 bg-[var(--paper)] flex flex-col justify-between h-[100dvh] max-w-[480px] mx-auto p-[20px]">
          <div className="flex items-center justify-between">
            <IconButton
              ariaLabel="Fermer la lecture"
              onClick={() => setActiveReadingWord(null)}
            >
              <ArrowLeft className="w-5 h-5" />
            </IconButton>
            <span className="font-display text-[20px]">
              {activeReadingWord.translationFr}
            </span>
            <IconButton
              ariaLabel="Écouter le mot"
              onClick={() =>
                speechService.speakArabic(activeReadingWord.audioText)
              }
            >
              <Volume2 className="w-5 h-5 text-[var(--brand)]" />
            </IconButton>
          </div>

          <div className="my-auto flex flex-col items-center gap-6 text-center">
            {(() => {
              const wordTiles = splitArabicWordIntoLetterTiles(
                activeReadingWord.textAr,
                letters
              );
              return (
                <>
                  <div
                    lang="ar"
                    dir="rtl"
                    className="font-arabic text-[72px] leading-relaxed flex items-center justify-center gap-2 flex-wrap select-none"
                  >
                    {wordTiles.map((tile, idx) => {
                      const isTapped = tappedCharIndex === idx;
                      return (
                        <button
                          key={tile.index}
                          type="button"
                          aria-label={`Écouter la lettre ${tile.shortName}`}
                          onClick={() => {
                            setTappedCharIndex(idx);
                            speechService.speakArabic(tile.speechText);
                          }}
                          className={`min-w-[56px] min-h-[56px] px-3 py-1 rounded-2xl transition-colors pressable cursor-pointer ${
                            isTapped
                              ? 'bg-[var(--accent)]/30 text-[var(--brand-deep)]'
                              : 'text-[var(--ink)] bg-[var(--surface)]'
                          }`}
                        >
                          {tile.arabicChar}
                        </button>
                      );
                    })}
                  </div>

                  <div
                    lang="ar"
                    dir="rtl"
                    style={{ lineHeight: 1.95 }}
                    className="font-arabic text-[56px] text-[var(--brand-deep)] dark:text-[var(--ink)]"
                  >
                    {activeReadingWord.textAr}
                  </div>

                  {tappedCharIndex !== null && wordTiles[tappedCharIndex] && (
                    <div className="px-4 py-2 rounded-full bg-[var(--surface)] border border-[var(--line)] text-[15px] font-semibold">
                      Lettre : {wordTiles[tappedCharIndex].shortName}
                    </div>
                  )}
                </>
              );
            })()}
          </div>

          <div className="space-y-2.5">
            <div className="grid grid-cols-2 gap-2.5">
              <SecondaryButton
                icon={<Volume2 className="w-5 h-5" />}
                onClick={() =>
                  speechService.speakArabic(activeReadingWord.audioText)
                }
              >
                Écouter
              </SecondaryButton>
              <SecondaryButton
                icon={<Mic className="w-5 h-5" />}
                onClick={() => {
                  setVoiceRecStep('explain');
                  setShowVoiceRecorderSheet(true);
                }}
              >
                Lis à voix haute
              </SecondaryButton>
            </div>
            <PrimaryButton
              onClick={() => {
                speechService.triggerSuccessFeedback();
                setState((prev) => {
                  const cur = prev.readWordIds[activeUser.id] || [];
                  return {
                    ...prev,
                    readWordIds: {
                      ...prev.readWordIds,
                      [activeUser.id]: Array.from(
                        new Set([...cur, activeReadingWord.id])
                      ),
                    },
                  };
                });
                setActiveReadingWord(null);
              }}
            >
              J&apos;ai lu
            </PrimaryButton>
          </div>
        </div>
      )}

      {/* FULLSCREEN EXAM / VOWEL QUIZ PLAYER */}
      {activeExam && (
        <div className="fixed inset-0 z-40 bg-[var(--paper)] flex flex-col justify-between h-[100dvh] max-w-[480px] mx-auto p-[20px]">
          <div className="flex items-center justify-between">
            <IconButton
              ariaLabel="Quitter l'examen"
              onClick={() => setActiveExam(null)}
            >
              <ArrowLeft className="w-5 h-5" />
            </IconButton>
            <span className="font-mono-tag text-[var(--brand)]">
              {activeExam.kind === 'vowels' ? 'QUIZ VOYELLES' : 'EXAMEN'} ·{' '}
              {activeExam.currentIndex + 1} / {activeExam.questions.length}
            </span>
            <div className="w-[48px]" />
          </div>

          {activeExam.finished ? (
            <div className="my-auto text-center space-y-5">
              {(() => {
                const pct = Math.round(
                  (activeExam.correctCount / activeExam.questions.length) * 100
                );
                const passed = pct >= 75;
                const stars: 0 | 1 | 2 | 3 =
                  pct >= 90 ? 3 : pct >= 75 ? 2 : pct >= 50 ? 1 : 0;
                return (
                  <>
                    <StarRating stars={stars} />
                    <h2 className="font-display text-[30px]">
                      {passed ? 'Bravo !' : 'Encore un effort'}
                    </h2>
                    <p className="text-[16px] font-semibold mx-auto">
                      Score : {pct}%
                    </p>
                    <div className="space-y-2.5 pt-4">
                      {!passed && (
                        <PrimaryButton
                          onClick={() =>
                            setActiveExam({
                              ...activeExam,
                              currentIndex: 0,
                              selectedOpt: null,
                              answered: false,
                              correctCount: 0,
                              finished: false,
                            })
                          }
                        >
                          Refaire
                        </PrimaryButton>
                      )}
                      <SecondaryButton onClick={() => setActiveExam(null)}>
                        Continuer
                      </SecondaryButton>
                    </div>
                  </>
                );
              })()}
            </div>
          ) : (
            <>
              <div className="my-auto space-y-5">
                <div className="text-center space-y-2">
                  <h2 className="font-display text-[24px]">
                    {activeExam.questions[activeExam.currentIndex].promptFr}
                  </h2>
                  {activeExam.questions[activeExam.currentIndex]
                    .promptArabic && (
                    <div
                      lang="ar"
                      dir="rtl"
                      style={{ lineHeight: 1.95 }}
                      className="font-arabic text-[56px] text-[var(--brand-deep)] dark:text-[var(--ink)]"
                    >
                      {
                        activeExam.questions[activeExam.currentIndex]
                          .promptArabic
                      }
                    </div>
                  )}
                  {activeExam.questions[activeExam.currentIndex]
                    .promptPicture && (
                    <div className="text-[48px] leading-none">
                      {
                        activeExam.questions[activeExam.currentIndex]
                          .promptPicture
                      }
                    </div>
                  )}
                  {activeExam.questions[activeExam.currentIndex].audioText && (
                    <div className="flex justify-center">
                      <IconButton
                        ariaLabel="Écouter"
                        onClick={() =>
                          speechService.speakArabic(
                            activeExam.questions[activeExam.currentIndex]
                              .audioText!
                          )
                        }
                      >
                        <Volume2 className="w-5 h-5 text-[var(--brand)]" />
                      </IconButton>
                    </div>
                  )}
                </div>

                <div className="space-y-2.5">
                  {activeExam.questions[activeExam.currentIndex].options.map(
                    (opt, idx) => (
                      <div
                        key={opt.id}
                        className={`min-h-[64px] w-full rounded-[18px] border-2 px-3 flex items-center justify-between gap-2 ${
                          activeExam.selectedOpt === idx
                            ? 'border-[var(--brand)] bg-[var(--brand)]/10'
                            : 'border-[var(--line)] bg-[var(--surface)]'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setActiveExam({ ...activeExam, selectedOpt: idx });
                            if (opt.audioText) {
                              speechService.speakArabic(opt.audioText);
                            }
                          }}
                          className="flex-1 min-h-[56px] flex items-center justify-between gap-3 text-left pressable cursor-pointer"
                        >
                          {opt.picture && opt.arabicWord && opt.subLabelFr ? (
                            <div className="flex items-center gap-3 px-1">
                              <span
                                className="text-[28px] leading-none shrink-0"
                                aria-hidden="true"
                              >
                                {opt.picture}
                              </span>
                              <div className="flex flex-col items-start">
                                <span
                                  lang="ar"
                                  dir="rtl"
                                  style={{ lineHeight: 1.6 }}
                                  className="font-arabic text-[26px] text-[var(--ink)]"
                                >
                                  {opt.arabicWord}
                                </span>
                                <span className="text-[12px] font-medium text-[var(--ink)]/75">
                                  {opt.subLabelFr}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <span
                              lang={opt.isArabic ? 'ar' : 'fr'}
                              dir={opt.isArabic ? 'rtl' : 'ltr'}
                              className={
                                opt.isArabic
                                  ? 'font-arabic text-[38px] leading-none mx-auto'
                                  : 'font-semibold text-[17px] px-2'
                              }
                            >
                              {opt.label}
                            </span>
                          )}
                        </button>

                        {opt.audioText && (
                          <button
                            type="button"
                            aria-label={`Écouter ${opt.subLabelFr || opt.label}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              speechService.speakArabic(opt.audioText!);
                              setActiveExam({ ...activeExam, selectedOpt: idx });
                            }}
                            className="w-[48px] h-[48px] min-w-[48px] min-h-[48px] rounded-full bg-[var(--paper)] border border-[var(--line)] flex items-center justify-center text-[var(--brand)] shrink-0 pressable cursor-pointer"
                          >
                            <Volume2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )
                  )}
                </div>
              </div>

              <PrimaryButton
                disabled={activeExam.selectedOpt === null}
                onClick={() => {
                  const curQ = activeExam.questions[activeExam.currentIndex];
                  const isRight = activeExam.selectedOpt === curQ.correctIndex;
                  const nextCorrect =
                    activeExam.correctCount + (isRight ? 1 : 0);
                  if (isRight) speechService.triggerSuccessFeedback();

                  if (
                    activeExam.currentIndex + 1 <
                    activeExam.questions.length
                  ) {
                    setActiveExam({
                      ...activeExam,
                      currentIndex: activeExam.currentIndex + 1,
                      selectedOpt: null,
                      correctCount: nextCorrect,
                    });
                  } else {
                    const pct = Math.round(
                      (nextCorrect / activeExam.questions.length) * 100
                    );
                    if (pct >= 75) {
                      if (
                        activeExam.kind === 'family' &&
                        activeExam.familyId
                      ) {
                        const fid = activeExam.familyId;
                        setState((prev) => ({
                          ...prev,
                          passedFamilyExams: {
                            ...prev.passedFamilyExams,
                            [activeUser.id]: Array.from(
                              new Set([
                                ...(prev.passedFamilyExams[activeUser.id] ||
                                  []),
                                fid,
                              ])
                            ),
                          },
                        }));
                      } else if (activeExam.kind === 'final') {
                        setState((prev) => ({
                          ...prev,
                          passedFinalExam: {
                            ...prev.passedFinalExam,
                            [activeUser.id]: true,
                          },
                        }));
                      }
                    }
                    setActiveExam({
                      ...activeExam,
                      correctCount: nextCorrect,
                      finished: true,
                    });
                  }
                }}
              >
                Valider
              </PrimaryButton>
            </>
          )}
        </div>
      )}

      {/* FULLSCREEN 5-STEP LETTER LESSON LOOP (/lettre/:id) */}
      {activeLesson &&
        (() => {
          const letterObj =
            letters.find((l) => l.id === activeLesson.letterId) || letters[0];
          const prog = userProgress.find((p) => p.letterId === letterObj.id);
          const sub = state.submissions.find(
            (s) => s.userId === activeUser.id && s.letterId === letterObj.id
          );
          const practiceAttempts =
            state.practiceHistory?.[`${activeUser.id}_${letterObj.id}`] || [];

          return (
            <LetterLessonLoop
              key={`${letterObj.id}_${activeLesson.initialStep || 'voir'}_${
                activeLesson.practiceMode ? 'p' : 'n'
              }_${glyphReloadTick}`}
              letter={letterObj}
              mode={mode}
              animationsEnabled={userSetting.animations !== false}
              learnedLetterIds={learnedLetterIds}
              initialStepsDone={prog?.stepsDone || []}
              initialStep={activeLesson.initialStep}
              initialPracticeMode={activeLesson.practiceMode}
              existingSubmission={sub}
              practiceHistory={practiceAttempts}
              onClose={() => setActiveLesson(null)}
              onStepComplete={(step, stars) => {
                if (step === 'retenir') {
                  setAntWalkingFamilyId(letterObj.family);
                  window.setTimeout(() => setAntWalkingFamilyId(null), 1600);
                }
                setState((prev) => {
                  let next = markStepCompleted(
                    prev,
                    activeUser.id,
                    letterObj.id,
                    step,
                    stars
                  );
                  if (step === 'ecouter') {
                    next = markDailyMissionDone(next, activeUser.id, 'revoir');
                  } else if (step === 'tracer') {
                    next = markDailyMissionDone(next, activeUser.id, 'tracer');
                  }
                  return next;
                });
              }}
              onSaveTraceForAlbum={(rawPoints) => {
                setState((prev) =>
                  saveLearnerTraceForAlbum(
                    prev,
                    activeUser.id,
                    letterObj.id,
                    rawPoints
                  )
                );
              }}
              onSavePracticeAttempt={(rawPoints, scorePct) => {
                if (scorePct < 60) {
                  showToast(
                    'Score minimum de 60 % requis pour enregistrer',
                    'bad'
                  );
                  return;
                }
                setState((prev) =>
                  savePracticeAttemptToHistory(
                    prev,
                    activeUser.id,
                    letterObj.id,
                    rawPoints,
                    scorePct
                  )
                );
                showToast(`Tracé enregistré (${scorePct}%) !`, 'good');
              }}
              onOpenShareSheet={() => {
                setShowShareSheet(true);
              }}
              onSubmitPaperPhoto={(dataUrl) => {
                setState((prev) => ({
                  ...prev,
                  submissions: [
                    {
                      id: `sub_${Date.now()}`,
                      userId: activeUser.id,
                      studentFirstName: activeUser.displayName,
                      letterId: letterObj.id,
                      kind: 'photo',
                      imageRef: dataUrl,
                      status: 'pending',
                      createdAt: "À l'instant",
                    },
                    ...prev.submissions,
                  ],
                }));
                showToast(t('photo.pending', mode), 'good');
              }}
              onNextLetter={() => {
                const nextIdx = Math.min(
                  letters.length - 1,
                  letterObj.order
                );
                const nextLetter = letters[nextIdx];
                if (
                  nextLetter &&
                  isLetterUnlockedForUser(state, activeUser.id, nextLetter.id)
                ) {
                  setActiveLesson({ letterId: nextLetter.id });
                } else {
                  setActiveLesson(null);
                  if (nextLetter && nextLetter.family !== 'F1') {
                    setShowAccesSheet(true);
                  }
                }
              }}
            />
          );
        })()}
    </>
  );
}
