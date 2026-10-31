import React, { useState } from 'react';
import {
  Flame,
  Lock,
  Star,
  Volume2,
  Sun,
  Moon,
  VolumeX,
  KeyRound,
  MessageCircle,
  LogOut,
  Award,
  Sparkles,
  Share2,
  Smartphone,
  RotateCcw,
  HelpCircle,
  AlertCircle,
  Type,
  Compass,
} from 'lucide-react';
import {
  LETTER_FAMILIES,
  buildFinalExamQuestions,
} from '../data/lettersAndFamilies';
import { downloadCertificateFile } from '../lib/pdfAndImage';
import {
  formatFrenchShortDate,
  getTodayIsoDate,
} from '../services/dataService';
import {
  Mascot,
  PrimaryButton,
  ProgressRing,
  SecondaryButton,
} from '../components/BlueprintComponents';
import { NouqtaAppController } from '../hooks/useNouqtaState';

export function MoiScreen({ app }: { app: NouqtaAppController }) {
  const {
    state,
    setState,
    activeUser,
    mode,
    userSetting,
    updateSetting,
    toggleLearnerMode,
    completedLettersCount,
    userStreak,
    totalStars,
    setShowShareSheet,
    teacherLink,
    userSubmissions,
    letters,
    setVoiceRecStep,
    setShowVoiceRecorderSheet,
    setActiveLesson,
    showTeacherCodeForm,
    setShowTeacherCodeForm,
    teacherCodeDraft,
    setTeacherCodeDraft,
    showToast,
    weeklyCompletedCount,
    weeklyGoalTarget,
    weeklyGoalReached,
    userProgress,
    setFamilySheetId,
    setAlbumSliderPct,
    setAlbumCompareLetterId,
    todayIso,
    badgesList,
    selectedBadgeGoal,
    setSelectedBadgeGoal,
    certNameDraft,
    setCertNameDraft,
    learnedLetterIds,
    setActiveExam,
    setOnboardingScreenIdx,
    setShowOnboardingModal,
    setActivationError,
    setShowAccesSheet,
    parentalUnlocked,
    startParentalHold,
    stopParentalHold,
    parentalHoldProgress,
    setRouteView,
    openPlacementTestFromSettings,
  } = app;

  const [activeSegment, setActiveSegment] = useState<'progres' | 'reglages'>(
    'progres'
  );

  const currentTextScale = userSetting.textScale || 100;
  const textScaleLabel =
    currentTextScale === 130
      ? 'Très grand'
      : currentTextScale === 115
      ? 'Grand'
      : 'Normal';

  return (
    <div className="space-y-[24px]">
      {/* PHASE 4.3: Split Moi tab into two segments at the top: "Progrès" and "Réglages" */}
      <div
        data-testid="moi-top-segments"
        role="tablist"
        aria-label="Sections de l'onglet Moi"
        className="grid grid-cols-2 gap-1.5 bg-[var(--surface)] p-1.5 rounded-[20px] border border-[var(--line)]"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeSegment === 'progres'}
          data-testid="moi-segment-progres"
          onClick={() => setActiveSegment('progres')}
          className={`min-h-[48px] h-[48px] rounded-[14px] font-bold text-[15px] pressable cursor-pointer ${
            activeSegment === 'progres'
              ? 'bg-[var(--brand-deep)] text-white'
              : 'text-[var(--ink)]/75'
          }`}
        >
          Progrès
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeSegment === 'reglages'}
          data-testid="moi-segment-reglages"
          onClick={() => setActiveSegment('reglages')}
          className={`min-h-[48px] h-[48px] rounded-[14px] font-bold text-[15px] pressable cursor-pointer ${
            activeSegment === 'reglages'
              ? 'bg-[var(--brand-deep)] text-white'
              : 'text-[var(--ink)]/75'
          }`}
        >
          Réglages
        </button>
      </div>

      {activeSegment === 'progres' ? (
        <div data-testid="moi-progres-panel" className="space-y-[24px]">
          {/* Top Profile Summary */}
          <div className="rounded-[28px] bg-[var(--surface)] border border-[var(--line)] p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-14 h-14 rounded-full bg-[var(--brand-deep)] text-white font-display text-[24px] flex items-center justify-center shrink-0">
                  {activeUser.displayName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h1 className="font-display text-[24px] text-[var(--ink)] truncate">
                    {activeUser.displayName}
                  </h1>
                  <span className="font-mono-tag text-[var(--brand)]">
                    {completedLettersCount} / 28 LETTRES
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="flex items-center gap-1">
                  <Flame className="w-5 h-5 text-[var(--accent)] fill-[var(--accent)]" />
                  <span className="font-bold text-[15px]">{userStreak}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="w-5 h-5 text-[var(--accent)] fill-[var(--accent)]" />
                  <span className="font-bold text-[15px]">{totalStars}</span>
                </div>
              </div>
            </div>

            <SecondaryButton
              icon={<Share2 className="w-5 h-5" />}
              onClick={() => setShowShareSheet(true)}
            >
              Partager
            </SecondaryButton>
          </div>

          {/* Weekly Goal progress bar on Moi */}
          <div
            data-testid="moi-weekly-goal-card"
            className="rounded-[28px] bg-[var(--surface)] border border-[var(--line)] p-5 space-y-2.5"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono-tag text-[var(--brand)]">
                OBJECTIF DE LA SEMAINE (LUNDI)
              </span>
              <span className="font-mono-tag text-[var(--ink)] font-bold">
                {Math.min(weeklyCompletedCount, weeklyGoalTarget)} /{' '}
                {weeklyGoalTarget} lettres
              </span>
            </div>
            <div className="h-3 w-full rounded-full bg-[var(--paper)] overflow-hidden">
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
            <p className="text-[13px] text-[var(--ink)]/75">
              {weeklyGoalReached
                ? 'Bravo ! Votre objectif de la semaine est validé.'
                : `Plus que ${Math.max(
                    0,
                    weeklyGoalTarget - weeklyCompletedCount
                  )} lettre(s) cette semaine pour débloquer le badge.`}
            </p>
          </div>

          {/* 7-Segment Progress Ring */}
          <div className="rounded-[28px] bg-[var(--surface)] border border-[var(--line)] p-6 text-center space-y-3">
            <ProgressRing
              completedLettersCount={completedLettersCount}
              familyCompletionRatio={LETTER_FAMILIES.map((f) => {
                const done = f.letters.filter((lid) =>
                  userProgress.some(
                    (p) => p.letterId === lid && p.stepsDone.length >= 5
                  )
                ).length;
                return done / f.letters.length;
              })}
              families={LETTER_FAMILIES.map((f) => ({
                id: f.id,
                order: f.order,
                nameFr: f.nameFr,
              }))}
              onSelectFamily={(fid) => setFamilySheetId(fid)}
            />
            <p className="text-[14px] font-semibold text-[var(--ink)]/80 mx-auto">
              Touchez une famille (F1–F7) pour voir ses lettres
            </p>
          </div>

          {/* LETTER ALBUM ("Mon cahier") — PHASE 3.3: Short French dates ("29 oct.") */}
          <div
            data-testid="mon-cahier-section"
            className="rounded-[28px] bg-[var(--surface)] border border-[var(--line)] p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="font-mono-tag text-[var(--brand)] block">
                  ALBUM DE CALLIGRAPHIE
                </span>
                <h2 className="font-display text-[22px] text-[var(--ink)]">
                  Mon cahier
                </h2>
              </div>
              <span className="font-mono-tag text-[var(--ink)]/70">
                {completedLettersCount} / 28
              </span>
            </div>

            <p className="text-[13px] text-[var(--ink)]/75">
              Touchez une lettre maîtrisée pour comparer votre premier tracé et
              votre meilleur tracé (« Avant / Maintenant »).
            </p>

            <div className="grid grid-cols-3 gap-2.5">
              {letters.map((letter) => {
                const prog = userProgress.find((p) => p.letterId === letter.id);
                const isDone = Boolean(
                  prog && (prog.stepsDone.length >= 5 || prog.box === 5)
                );
                const label = letter.shortName || letter.nameFr;
                const formattedDate = formatFrenchShortDate(
                  prog?.masteredAt || prog?.firstDoneAt || todayIso
                );
                return (
                  <button
                    key={letter.id}
                    type="button"
                    data-testid={`album-card-${letter.id}`}
                    aria-label={
                      isDone
                        ? `Cahier ${label}, ${
                            prog?.stars || 1
                          } étoiles, ${formattedDate}, toucher pour comparer Avant et Maintenant`
                        : `Cahier ${label}, verrouillée`
                    }
                    onClick={() => {
                      if (isDone) {
                        setAlbumSliderPct(100);
                        setAlbumCompareLetterId(letter.id);
                      } else {
                        showToast(
                          `Terminez la lettre ${label} pour l'ajouter à votre cahier`,
                          'info'
                        );
                      }
                    }}
                    className={`min-h-[108px] p-2.5 rounded-[18px] border flex flex-col items-center justify-between text-center pressable cursor-pointer ${
                      isDone
                        ? 'bg-[var(--paper)] border-[var(--brand)]/40 text-[var(--ink)]'
                        : 'bg-[var(--paper)] border-[var(--line)] text-[var(--locked)] grayscale opacity-60'
                    }`}
                  >
                    <span
                      lang="ar"
                      dir="rtl"
                      className={`font-arabic text-[36px] leading-none ${
                        isDone
                          ? 'text-[var(--brand-deep)] dark:text-[var(--ink)]'
                          : 'text-[var(--locked)]'
                      }`}
                    >
                      {letter.arabicChar}
                    </span>
                    <span className="text-[13px] font-bold leading-tight line-clamp-1 w-full">
                      {label}
                    </span>
                    {isDone ? (
                      <div className="flex flex-col items-center gap-0.5">
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3].map((idx) => (
                            <Star
                              key={idx}
                              className={`w-3 h-3 ${
                                idx <= (prog?.stars || 1)
                                  ? 'text-[var(--accent)] fill-[var(--accent)]'
                                  : 'text-[var(--line)]'
                              }`}
                            />
                          ))}
                        </div>
                        <span
                          data-testid={`album-date-${letter.id}`}
                          className="font-mono-tag text-[13px] text-[var(--ink)]/75"
                        >
                          {formattedDate}
                        </span>
                      </div>
                    ) : (
                      <Lock className="w-3.5 h-3.5 text-[var(--locked)]" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Badges Grid in Moi (8 badges) */}
          <div
            data-testid="badges-grid-section"
            className="rounded-[28px] bg-[var(--surface)] border border-[var(--line)] p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono-tag text-[var(--brand)]">
                BADGES D&apos;APPRENTISSAGE
              </span>
              <span className="font-mono-tag text-[var(--ink)]/70">
                {badgesList.filter((b) => b.unlocked).length} / 8
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {badgesList.map((badge) => (
                <button
                  key={badge.id}
                  type="button"
                  data-testid={`badge-item-${badge.id}`}
                  aria-label={`Badge ${badge.title} (${
                    badge.unlocked ? 'Débloqué' : 'Verrouillé'
                  })`}
                  onClick={() => {
                    setSelectedBadgeGoal({
                      title: badge.title,
                      goal: badge.goal,
                      unlocked: badge.unlocked,
                    });
                    showToast(
                      badge.unlocked
                        ? `${badge.title} : Débloqué !`
                        : `Objectif : ${badge.goal}`,
                      badge.unlocked ? 'good' : 'info'
                    );
                  }}
                  className={`min-h-[96px] p-3 rounded-[18px] border-2 flex flex-col items-center justify-center gap-2 text-center pressable cursor-pointer transition-all ${
                    badge.unlocked
                      ? 'bg-[var(--paper)] border-[var(--accent)] text-[var(--ink)]'
                      : 'bg-[var(--paper)] border-[var(--line)] text-[var(--locked)] grayscale opacity-70'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      badge.unlocked
                        ? 'bg-[var(--accent)] text-[var(--accent-ink)]'
                        : 'bg-[var(--line)] text-[var(--ink)]/60'
                    }`}
                  >
                    <Award className="w-5 h-5" />
                  </div>
                  <span className="text-[13px] font-bold leading-tight text-[var(--ink)]">
                    {badge.title}
                  </span>
                </button>
              ))}
            </div>

            {selectedBadgeGoal && (
              <div
                data-testid="badge-goal-banner"
                className="p-3.5 rounded-[16px] bg-[var(--paper)] border border-[var(--line)] text-[13px] flex items-center justify-between gap-2"
              >
                <div>
                  <span className="font-bold text-[var(--ink)] block">
                    {selectedBadgeGoal.title}{' '}
                    {selectedBadgeGoal.unlocked ? '· Débloqué ✓' : '· Objectif'}
                  </span>
                  <span className="text-[var(--ink)]/80">
                    {selectedBadgeGoal.goal}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Final Exam & Certificate Section */}
          <div className="rounded-[28px] bg-[var(--surface)] border border-[var(--line)] p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Award className="w-6 h-6 text-[var(--accent)]" />
                <h2 className="font-display text-[20px]">
                  Certificat de réussite
                </h2>
              </div>
            </div>

            {state.passedFinalExam[activeUser.id] ? (
              <div className="space-y-3">
                <label className="block text-[13px] font-semibold">
                  Nom imprimé sur le certificat :
                  <input
                    type="text"
                    value={certNameDraft}
                    onChange={(e) => setCertNameDraft(e.target.value)}
                    className="mt-1 w-full h-[48px] px-3.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] font-semibold"
                  />
                </label>
                <PrimaryButton
                  onClick={() =>
                    downloadCertificateFile({
                      learnerName: certNameDraft || activeUser.displayName,
                      issuedAt: getTodayIsoDate(),
                      serial: `NQ-2026-${activeUser.id.toUpperCase()}`,
                    })
                  }
                >
                  Télécharger le certificat A4
                </PrimaryButton>
              </div>
            ) : completedLettersCount < 28 ? (
              <div className="space-y-3">
                <p className="text-[14px] text-[var(--ink)]/75">
                  Terminez les 28 lettres de l&apos;alphabet pour débloquer
                  l&apos;examen final et votre certificat officiel Nouqta.
                </p>
                <button
                  type="button"
                  data-testid="final-exam-locked-btn"
                  disabled
                  aria-label="Passer l'examen final : 28 lettres nécessaires"
                  className="w-full min-h-[56px] h-[56px] px-4 rounded-[18px] bg-[var(--paper)] border-2 border-[var(--line)] text-[var(--locked)] font-bold text-[15px] flex items-center justify-center gap-2 opacity-75 cursor-not-allowed"
                >
                  <Lock className="w-4 h-4 shrink-0" />
                  <span>
                    28 lettres nécessaires ({completedLettersCount}/28)
                  </span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-[14px] text-[var(--ink)]/75">
                  Réussissez l&apos;examen final (25 questions, seuil 75%) pour
                  débloquer votre certificat officiel Nouqta.
                </p>
                <SecondaryButton
                  onClick={() =>
                    setActiveExam({
                      kind: 'final',
                      questions: buildFinalExamQuestions(
                        mode === 'kids' ? 3 : 4,
                        learnedLetterIds
                      ),
                      currentIndex: 0,
                      selectedOpt: null,
                      answered: false,
                      correctCount: 0,
                      finished: false,
                    })
                  }
                >
                  Passer l&apos;examen final
                </SecondaryButton>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* PHASE 4.3: "Réglages" Segment (teacher, plan, settings, help) */
        <div data-testid="moi-reglages-panel" className="space-y-[24px]">
          {/* Student - Teacher Link ("Mon prof : <name>") + Student Feedback */}
          <div
            data-testid="moi-teacher-card"
            className="rounded-[28px] bg-[var(--surface)] border border-[var(--line)] p-5 space-y-4"
          >
            {teacherLink ? (
              <>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span className="font-mono-tag text-[var(--brand)] block">
                      ESPACE ÉLÈVE – PROFESSEUR
                    </span>
                    <h2 className="font-display text-[21px] text-[var(--ink)]">
                      Mon prof : {teacherLink.teacherName}
                    </h2>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-[var(--good)]/15 text-[var(--good)] font-mono-tag text-[13px] font-bold">
                    CODE {teacherLink.teacherCode}
                  </span>
                </div>

                {userSubmissions.length > 0 && (
                  <div className="space-y-2.5">
                    {userSubmissions.slice(0, 2).map((sub) => {
                      const lObj =
                        letters.find((l) => l.id === sub.letterId) || letters[0];
                      return (
                        <div
                          key={sub.id}
                          data-testid={`student-sub-result-${sub.id}`}
                          className="p-3.5 rounded-[18px] bg-[var(--paper)] border border-[var(--line)] space-y-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-[14px] text-[var(--ink)]">
                              {sub.kind === 'audio'
                                ? `🎙️ Lecture vocale · ${lObj.shortName}`
                                : `📷 Écriture papier · ${lObj.shortName}`}
                            </span>
                            <span
                              className={`px-2.5 py-0.5 rounded-full font-mono-tag text-[13px] font-bold ${
                                sub.status === 'correct'
                                  ? 'bg-[var(--good)]/15 text-[var(--good)]'
                                  : sub.status === 'redo'
                                  ? 'bg-[var(--bad)]/15 text-[var(--bad)]'
                                  : 'bg-[var(--accent)]/20 text-[var(--accent-ink)] dark:text-[var(--accent)]'
                              }`}
                            >
                              {sub.status === 'correct'
                                ? 'Bien ✓'
                                : sub.status === 'redo'
                                ? 'À retravailler'
                                : 'En attente'}
                            </span>
                          </div>

                          {sub.comment && (
                            <p className="text-[13px] text-[var(--ink)]/85">
                              « {sub.comment} »
                            </p>
                          )}

                          <div className="flex items-center justify-between gap-2 pt-1">
                            {mode === 'kids' && (
                              <Mascot
                                pose={
                                  sub.status === 'correct'
                                    ? 'cheer'
                                    : sub.status === 'redo'
                                    ? 'oops'
                                    : 'think'
                                }
                                size={42}
                                mode={mode}
                              />
                            )}
                            <button
                              type="button"
                              data-testid="student-feedback-retry-btn"
                              aria-label={`Réessayer ${lObj.shortName}`}
                              onClick={() => {
                                if (sub.kind === 'audio') {
                                  setVoiceRecStep('explain');
                                  setShowVoiceRecorderSheet(true);
                                } else {
                                  setActiveLesson({
                                    letterId: lObj.id,
                                    initialStep: 'ecrire',
                                  });
                                }
                              }}
                              className="min-h-[48px] h-[48px] px-4 rounded-[14px] bg-[var(--surface)] border border-[var(--brand)] text-[var(--brand)] font-bold text-[13px] flex items-center gap-1.5 pressable cursor-pointer"
                            >
                              <RotateCcw className="w-4 h-4" />
                              <span>Réessayer</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2.5">
                  <a
                    href={`https://wa.me/${(teacherLink.whatsapp || '').replace(
                      /[^0-9]/g,
                      ''
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Contacter ${teacherLink.teacherName} sur WhatsApp`}
                    className="min-h-[48px] h-[48px] px-3 rounded-[16px] bg-[var(--paper)] border-2 border-[var(--brand)] text-[var(--brand)] font-bold text-[13px] flex items-center justify-center gap-1.5 pressable"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>WhatsApp prof</span>
                  </a>
                  <button
                    type="button"
                    aria-label="Changer de code professeur"
                    onClick={() => setShowTeacherCodeForm((v) => !v)}
                    className="min-h-[48px] h-[48px] px-3 rounded-[16px] bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] font-semibold text-[13px] pressable cursor-pointer"
                  >
                    Code prof
                  </button>
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <span className="font-mono-tag text-[var(--brand)] block">
                  PROFESSEUR
                </span>
                <h2 className="font-display text-[20px] text-[var(--ink)]">
                  Pas encore de prof
                </h2>
                <button
                  type="button"
                  onClick={() => setShowTeacherCodeForm(true)}
                  className="min-h-[48px] h-[48px] px-4 rounded-[16px] bg-[var(--brand-deep)] text-white font-bold text-[14px] pressable cursor-pointer"
                >
                  Entrer un Code prof
                </button>
              </div>
            )}

            {showTeacherCodeForm && (
              <div className="pt-2 border-t border-[var(--line)] flex items-center gap-2">
                <input
                  type="text"
                  value={teacherCodeDraft}
                  onChange={(e) => setTeacherCodeDraft(e.target.value)}
                  placeholder="Ex : PROF-KARIM"
                  aria-label="Code professeur"
                  className="flex-1 h-[48px] px-3.5 rounded-[14px] bg-[var(--paper)] border border-[var(--line)] font-mono-tag text-[14px]"
                />
                <button
                  type="button"
                  onClick={() => {
                    const code =
                      teacherCodeDraft.trim().toUpperCase() || 'PROF-KARIM';
                    setState((prev) => ({
                      ...prev,
                      teacherLinks: {
                        ...(prev.teacherLinks || {}),
                        [activeUser.id]: {
                          teacherName: 'Oustadh Karim',
                          teacherCode: code,
                          whatsapp: '+33 6 00 00 00 00',
                        },
                      },
                    }));
                    setShowTeacherCodeForm(false);
                    showToast('Professeur associé !', 'good');
                  }}
                  className="min-h-[48px] h-[48px] px-4 rounded-[14px] bg-[var(--accent)] text-[var(--accent-ink)] font-bold text-[14px] pressable cursor-pointer"
                >
                  Lier
                </button>
              </div>
            )}
          </div>

          {/* Plan / Code d'activation Card */}
          <div
            data-testid="moi-plan-card"
            className="rounded-[28px] bg-[var(--surface)] border border-[var(--line)] p-5 space-y-3"
          >
            <div className="flex items-center justify-between gap-2">
              <div>
                <span className="font-mono-tag text-[var(--brand)] block">
                  FORMULE &amp; ACCÈS
                </span>
                <h2 className="font-display text-[20px] text-[var(--ink)]">
                  {activeUser.entitlement === 'full'
                    ? 'Cours complet actif'
                    : 'Formule découverte (Famille 1)'}
                </h2>
              </div>
              <span className="px-3 py-1 rounded-full bg-[var(--accent)]/20 text-[var(--accent-ink)] dark:text-[var(--accent)] font-mono-tag text-[13px] font-bold">
                {activeUser.entitlement === 'full' ? 'COMPLET' : 'GRATUIT'}
              </span>
            </div>
            <button
              type="button"
              aria-label="Entrer un code d'activation"
              onClick={() => {
                setActivationError(null);
                setShowAccesSheet(true);
              }}
              className="w-full min-h-[52px] h-[52px] px-4 rounded-[16px] bg-[var(--paper)] border border-[var(--line)] flex items-center justify-between pressable cursor-pointer"
            >
              <span className="font-semibold text-[15px] flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-[var(--brand)]" />
                <span>Code d&apos;activation</span>
              </span>
              <span className="font-mono-tag text-[var(--brand)] font-bold">
                {activeUser.entitlement === 'full' ? 'ACTIF' : 'ENTRER UN CODE'}
              </span>
            </button>
          </div>

          {/* Réglages List Rows */}
          <div className="space-y-2.5">
            <span className="font-mono-tag text-[var(--brand)] px-1">
              RÉGLAGES
            </span>

            {/* PHASE 4.1: "Taille du texte" setting (Normal / Grand / Très grand = 100% / 115% / 130%) */}
            <div
              data-testid="reglages-text-scale-row"
              className="rounded-[18px] bg-[var(--surface)] border border-[var(--line)] p-3.5 space-y-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-[15px] flex items-center gap-2 text-[var(--ink)]">
                  <Type className="w-4 h-4 text-[var(--brand)] shrink-0" />
                  <span>Taille du texte</span>
                </span>
                <button
                  type="button"
                  data-testid="reglages-text-scale-btn"
                  aria-label={`Changer la taille du texte (actuellement ${textScaleLabel})`}
                  onClick={() => {
                    const nextScale: 100 | 115 | 130 =
                      currentTextScale === 100
                        ? 115
                        : currentTextScale === 115
                        ? 130
                        : 100;
                    updateSetting({ textScale: nextScale });
                  }}
                  className="min-h-[48px] h-[48px] px-3 rounded-[12px] bg-[var(--paper)] border border-[var(--line)] font-mono-tag text-[13px] font-bold text-[var(--brand)] pressable cursor-pointer"
                >
                  {textScaleLabel} ({currentTextScale} %)
                </button>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {(
                  [
                    { scale: 100 as const, label: 'Normal' },
                    { scale: 115 as const, label: 'Grand' },
                    { scale: 130 as const, label: 'Très grand' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.scale}
                    type="button"
                    data-testid={`text-scale-${opt.scale}`}
                    aria-pressed={currentTextScale === opt.scale}
                    onClick={() => updateSetting({ textScale: opt.scale })}
                    className={`min-h-[48px] h-[48px] px-2 rounded-[12px] font-bold text-[13px] border pressable cursor-pointer ${
                      currentTextScale === opt.scale
                        ? 'bg-[var(--brand-deep)] text-white border-[var(--brand-deep)]'
                        : 'bg-[var(--paper)] text-[var(--ink)] border-[var(--line)]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              aria-label="Changer le mode Élève Enfant ou Adulte"
              onClick={toggleLearnerMode}
              className="w-full min-h-[56px] h-[56px] px-4 rounded-[18px] bg-[var(--surface)] border border-[var(--line)] flex items-center justify-between pressable cursor-pointer"
            >
              <span className="font-semibold text-[15px]">Mode</span>
              <span className="font-mono-tag text-[var(--brand)] font-bold">
                {mode === 'kids' ? 'Enfant (6-12)' : 'Adulte'}
              </span>
            </button>

            <button
              type="button"
              aria-label="Changer l'objectif hebdomadaire (2, 3 ou 5 lettres par semaine)"
              onClick={() => {
                const nextGoal: 2 | 3 | 5 =
                  weeklyGoalTarget === 2 ? 3 : weeklyGoalTarget === 3 ? 5 : 2;
                updateSetting({ weeklyGoal: nextGoal });
                showToast(
                  `Objectif hebdo : ${nextGoal} lettres / semaine`,
                  'info'
                );
              }}
              className="w-full min-h-[56px] h-[56px] px-4 rounded-[18px] bg-[var(--surface)] border border-[var(--line)] flex items-center justify-between pressable cursor-pointer"
            >
              <span className="font-semibold text-[15px]">Objectif hebdo</span>
              <span className="font-mono-tag text-[var(--brand)] font-bold">
                {weeklyGoalTarget} lettres / sem.
              </span>
            </button>

            <button
              type="button"
              aria-label="Changer le thème Clair ou Sombre"
              onClick={() =>
                updateSetting({
                  theme: userSetting.theme === 'dark' ? 'light' : 'dark',
                })
              }
              className="w-full min-h-[56px] h-[56px] px-4 rounded-[18px] bg-[var(--surface)] border border-[var(--line)] flex items-center justify-between pressable cursor-pointer"
            >
              <span className="font-semibold text-[15px]">Thème</span>
              <span className="flex items-center gap-1.5 font-mono-tag text-[var(--brand)] font-bold">
                {userSetting.theme === 'dark' ? (
                  <>
                    <Moon className="w-4 h-4" />
                    <span>Sombre</span>
                  </>
                ) : (
                  <>
                    <Sun className="w-4 h-4" />
                    <span>Clair</span>
                  </>
                )}
              </span>
            </button>

            <button
              type="button"
              aria-label="Activer ou couper les sons et voix"
              onClick={() => updateSetting({ sound: !userSetting.sound })}
              className="w-full min-h-[56px] h-[56px] px-4 rounded-[18px] bg-[var(--surface)] border border-[var(--line)] flex items-center justify-between pressable cursor-pointer"
            >
              <span className="font-semibold text-[15px]">Sons et voix</span>
              <span className="flex items-center gap-1.5 font-mono-tag text-[var(--brand)] font-bold">
                {userSetting.sound ? (
                  <>
                    <Volume2 className="w-4 h-4" />
                    <span>Activés</span>
                  </>
                ) : (
                  <>
                    <VolumeX className="w-4 h-4" />
                    <span>Muet</span>
                  </>
                )}
              </span>
            </button>

            <button
              type="button"
              aria-label="Activer ou désactiver les vibrations haptiques"
              onClick={() =>
                updateSetting({
                  haptics: userSetting.haptics === false ? true : false,
                })
              }
              className="w-full min-h-[56px] h-[56px] px-4 rounded-[18px] bg-[var(--surface)] border border-[var(--line)] flex items-center justify-between pressable cursor-pointer"
            >
              <span className="font-semibold text-[15px]">Vibrations</span>
              <span className="flex items-center gap-1.5 font-mono-tag text-[var(--brand)] font-bold">
                <Smartphone className="w-4 h-4" />
                <span>
                  {userSetting.haptics !== false ? 'Activées' : 'Désactivées'}
                </span>
              </span>
            </button>

            <button
              type="button"
              data-testid="reglages-animations-toggle"
              aria-label="Activer ou désactiver les animations de tracé"
              onClick={() =>
                updateSetting({
                  animations: userSetting.animations === false ? true : false,
                })
              }
              className="w-full min-h-[56px] h-[56px] px-4 rounded-[18px] bg-[var(--surface)] border border-[var(--line)] flex items-center justify-between pressable cursor-pointer"
            >
              <span className="font-semibold text-[15px]">Animations</span>
              <span className="flex items-center gap-1.5 font-mono-tag text-[var(--brand)] font-bold">
                <Sparkles className="w-4 h-4" />
                <span>
                  {userSetting.animations !== false
                    ? 'Activées'
                    : 'Désactivées'}
                </span>
              </span>
            </button>

            {/* PHASE 5.6: "Refaire le test" button in Réglages */}
            <button
              type="button"
              data-testid="reglages-retake-placement-btn"
              aria-label="Refaire le test de positionnement"
              onClick={openPlacementTestFromSettings}
              className="w-full min-h-[56px] h-[56px] px-4 rounded-[18px] bg-[var(--surface)] border border-[var(--line)] flex items-center justify-between pressable cursor-pointer"
            >
              <span className="font-semibold text-[15px] flex items-center gap-2">
                <Compass className="w-4 h-4 text-[var(--brand)] shrink-0" />
                <span>Refaire le test</span>
              </span>
              <span className="font-mono-tag text-[var(--brand)] font-bold">
                POSITIONNEMENT
              </span>
            </button>

            <button
              type="button"
              aria-label="Revoir l'introduction en 3 écrans"
              onClick={() => {
                setOnboardingScreenIdx(0);
                setShowOnboardingModal(true);
              }}
              className="w-full min-h-[56px] h-[56px] px-4 rounded-[18px] bg-[var(--surface)] border border-[var(--line)] flex items-center justify-between pressable cursor-pointer"
            >
              <span className="font-semibold text-[15px] flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-[var(--brand)] shrink-0" />
                <span>Revoir la présentation</span>
              </span>
              <span className="font-mono-tag text-[var(--brand)]">
                3 ÉCRANS
              </span>
            </button>

            {/* PHASE 4.5: "Signaler un problème" link in Réglages */}
            <a
              href="mailto:support@nouqta.app?subject=Probl%C3%A8me%20sur%20Nouqta&body=Bonjour%2C%20je%20souhaite%20signaler%20un%20probl%C3%A8me%20dans%20l%27application%20Nouqta%20%3A%0A"
              data-testid="reglages-report-problem-link"
              aria-label="Signaler un problème par e-mail"
              className="w-full min-h-[56px] h-[56px] px-4 rounded-[18px] bg-[var(--surface)] border border-[var(--line)] flex items-center justify-between pressable"
            >
              <span className="font-semibold text-[15px] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[var(--brand)] shrink-0" />
                <span>Signaler un problème</span>
              </span>
              <span className="font-mono-tag text-[var(--brand)]">CONTACT</span>
            </a>

            <a
              href={state.adminConfig.whatsappUrl}
              target="_blank"
              rel="noreferrer"
              aria-label="Contacter l'aide sur WhatsApp"
              className="w-full min-h-[56px] h-[56px] px-4 rounded-[18px] bg-[var(--surface)] border border-[var(--line)] flex items-center justify-between pressable"
            >
              <span className="font-semibold text-[15px] flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-[var(--brand)] shrink-0" />
                <span>Aide (WhatsApp)</span>
              </span>
              <span className="font-mono-tag text-[var(--brand)]">
                {state.adminConfig.whatsappNumber}
              </span>
            </a>

            {mode === 'kids' && !parentalUnlocked ? (
              <button
                type="button"
                aria-label="Espace Parent, appuyer pendant 3 secondes"
                onPointerDown={startParentalHold}
                onPointerUp={stopParentalHold}
                onPointerLeave={stopParentalHold}
                className="w-full min-h-[56px] h-[56px] px-4 rounded-[18px] bg-[var(--surface)] border border-[var(--line)] flex items-center justify-between pressable cursor-pointer select-none"
              >
                <span className="font-semibold text-[15px]">
                  Espace Parent (Appuie 3 secondes)
                </span>
                <span className="font-mono-tag text-[var(--brand)]">
                  {parentalHoldProgress > 0 ? `${parentalHoldProgress}%` : '3s'}
                </span>
              </button>
            ) : (
              <button
                type="button"
                aria-label="Changer de profil ou accéder à l'espace professeur"
                onClick={() => setRouteView('connexion')}
                className="w-full min-h-[56px] h-[56px] px-4 rounded-[18px] bg-[var(--surface)] border border-[var(--line)] flex items-center justify-between pressable cursor-pointer"
              >
                <span className="font-semibold text-[15px] flex items-center gap-2">
                  <LogOut className="w-4 h-4 text-[var(--brand)] shrink-0" />
                  <span>Connexion / Profils (/prof, /admin)</span>
                </span>
                <span className="font-mono-tag text-[var(--brand)]">
                  CHANGER
                </span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
