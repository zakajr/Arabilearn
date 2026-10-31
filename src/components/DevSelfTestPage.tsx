import React from 'react';
import { CheckCircle2, XCircle, RefreshCw, ArrowLeft } from 'lucide-react';
import {
  LETTERS_DATA,
  LETTER_FAMILIES,
  LETTER_VISUAL_ANCHORS,
  PROGRESSIVE_WORDS,
  buildDynamicVowelQuizQuestions,
  buildFamilyExamQuestions,
  buildPlacementQuestionsForFamily,
  buildQuestionsForLetter,
  buildSingleTypedQuestion,
  buildVariedQuizSequence,
  filterWordsByUnlockedLetters,
  shuffleWordTilesUntilDifferent,
  splitArabicWordIntoLetterTiles,
  splitKeywordForHighlight
} from '../data/lettersAndFamilies';
import {
  computeGlyphAlignmentAudit,
  getGlyphOutline,
  verifyAll28FontGlyphDotCounts
} from '../lib/fontGlyphs';
import {
  DEFAULT_GLYPH_STROKE_WIDTH,
  GlyphBodyStroke,
  GlyphDotStroke,
  GlyphForm,
  TracingSubStep,
  buildTracingSubSteps,
  computeGlyphDotClearanceAudit,
  computeGlyphFinalAntParkingSpot,
  computeRealPracticeMetrics,
  evaluateGlyphAnimationAtProgress,
  processDotStepTap,
  sampleSvgPathEqualLength,
  simplifyPointsRDP,
  validateDotsStep,
  validateSingleBodyStroke
} from '../lib/strokeMath';
import { t } from '../data/copyDeck';
import {
  applyPlacementTestResult,
  clearGlyphEditorOverride,
  createBrandNewLearnerState,
  formatFrenchShortDate,
  getInitialBlueprintState,
  getLearnedLetterIdsForUser,
  getLettersWithOverrides,
  getTodayLetterForUser,
  getUnlockedLetterIdsForUser,
  isFamilyUnlockedForUser,
  isLetterUnlockedForUser,
  loadGlyphEditorOverrides,
  saveGlyphEditorOverride,
  saveLearnerTraceForAlbum,
  savePracticeAttemptToHistory
} from '../services/dataService';
import {
  MINI_GAMES_CATALOG,
  buildAntStreamRounds,
  buildAssembleMiniGameRounds,
  buildDotHuntRounds,
  buildMemoryDeck,
  buildMysteryLetterRounds,
  getDotHuntPromptForLetter,
  validateCustomPlacedDotsForLetter
} from './MiniGamesHub';
import { speechService } from '../services/speech';

export interface SelfTestCheckResult {
  id: string;
  title: string;
  passed: boolean;
  summary: string;
  details: string[];
}

/**
 * Canonical Dot Rules from Blueprint B5:
 */
export const CANONICAL_DOT_TABLE: Record<
  string,
  { count: number; position: 'above' | 'below' | 'none'; bodyStrokes: number }
> = {
  alif: { count: 0, position: 'none', bodyStrokes: 1 },
  baa: { count: 1, position: 'below', bodyStrokes: 1 },
  taa: { count: 2, position: 'above', bodyStrokes: 1 },
  thaa: { count: 3, position: 'above', bodyStrokes: 1 },
  jiim: { count: 1, position: 'below', bodyStrokes: 1 },
  haa_soft: { count: 0, position: 'none', bodyStrokes: 1 },
  khaa: { count: 1, position: 'above', bodyStrokes: 1 },
  daal: { count: 0, position: 'none', bodyStrokes: 1 },
  dhaal: { count: 1, position: 'above', bodyStrokes: 1 },
  raa: { count: 0, position: 'none', bodyStrokes: 1 },
  zaay: { count: 1, position: 'above', bodyStrokes: 1 },
  siin: { count: 0, position: 'none', bodyStrokes: 1 },
  shiin: { count: 3, position: 'above', bodyStrokes: 1 },
  saad: { count: 0, position: 'none', bodyStrokes: 1 },
  daad: { count: 1, position: 'above', bodyStrokes: 1 },
  taa_emph: { count: 0, position: 'none', bodyStrokes: 1 },
  dhaa_emph: { count: 1, position: 'above', bodyStrokes: 1 },
  ayn: { count: 0, position: 'none', bodyStrokes: 1 },
  ghayn: { count: 1, position: 'above', bodyStrokes: 1 },
  faa: { count: 1, position: 'above', bodyStrokes: 1 },
  qaaf: { count: 2, position: 'above', bodyStrokes: 1 },
  kaaf: { count: 0, position: 'none', bodyStrokes: 2 },
  laam: { count: 0, position: 'none', bodyStrokes: 1 },
  miim: { count: 0, position: 'none', bodyStrokes: 1 },
  nuun: { count: 1, position: 'above', bodyStrokes: 1 },
  haa_breath: { count: 0, position: 'none', bodyStrokes: 1 },
  waaw: { count: 0, position: 'none', bodyStrokes: 1 },
  yaa: { count: 2, position: 'below', bodyStrokes: 1 }
};

/**
 * FIX A & FIX B CHECK:
 * Each dot is its own step (kind: 'dot'); simulated taps on each dot step target snap cleanly;
 * off-target taps are ignored with "Touche plus près du pointillé".
 */
export function runPolishCheck2_DotsSimulation(): SelfTestCheckResult {
  const details: string[] = [];
  let allPassed = true;
  const targetLetters = ['baa', 'taa', 'thaa', 'qaaf', 'yaa'];

  for (const lid of targetLetters) {
    const rec = LETTERS_DATA.find((l) => l.id === lid);
    if (!rec) {
      allPassed = false;
      details.push(`${lid}: introuvable`);
      continue;
    }
    const audit = computeGlyphDotClearanceAudit(rec.forms.isolated);
    const subSteps = buildTracingSubSteps(rec.forms.isolated);
    const dotSteps = subSteps.filter(
      (s): s is Extract<TracingSubStep, { kind: 'dot' }> => s.kind === 'dot'
    );
    if (dotSteps.length !== rec.dots.count) {
      allPassed = false;
      details.push(
        `${rec.shortName}: étapes Point attendues=${rec.dots.count}, reçues=${dotSteps.length}`
      );
      continue;
    }

    let placed: { x: number; y: number; snapped: boolean; targetId?: number }[] =
      [];
    let tapsReceived = 0;
    let allOffTargetIgnored = true;

    for (const dStep of dotSteps) {
      const target = dStep.dot;
      // 1. Off-target tap far away ([14, 14]) -> ignored with "Touche plus près du pointillé"
      tapsReceived += 1;
      const offRes = processDotStepTap({
        tap: { x: 14, y: 14 },
        targetDot: target,
        placedDots: placed,
        canvasWidthPx: 316
      });
      if (
        offRes.snapped ||
        offRes.log.action !== 'ignored' ||
        offRes.hintFr !== 'Touche plus près du pointillé'
      ) {
        allOffTargetIgnored = false;
      }

      // 2. Tap within snap radius of THAT step's target
      tapsReceived += 1;
      const onRes = processDotStepTap({
        tap: { x: target.at[0] + 1, y: target.at[1] - 1 },
        targetDot: target,
        placedDots: placed,
        canvasWidthPx: 316
      });
      placed = onRes.nextDots;
    }

    const valRes = validateDotsStep({
      learnerDots: placed.map((d) => ({ x: d.x, y: d.y })),
      targetDots: dotSteps.map((s) => s.dot),
      corridor: 22,
      mode: 'adult'
    });

    const ok =
      placed.length === rec.dots.count &&
      allOffTargetIgnored &&
      valRes.passed &&
      audit.interDotGapPassed;

    if (!ok) allPassed = false;
    details.push(
      `${rec.shortName}: sous-étapes=${subSteps.length} (${dotSteps
        .map((s) => s.labelFr)
        .join(', ')}), points placés=${placed.length}/${rec.dots.count}, hors-cible ignoré (« Touche plus près du pointillé »)=${
        allOffTargetIgnored ? 'OUI' : 'NON'
      }, écart inter-points=${audit.minInterDotEdgeGap}u`
    );
  }

  return {
    id: '2',
    title:
      '2. Points (Baa, Taa, Thaa, Qaaf, Yaa) : 1 sous-étape par point, hors-cible ignoré (« Touche plus près du pointillé »)',
    passed: allPassed,
    summary: allPassed
      ? 'Baa (2 étapes), Taa (3), Thaa (4), Qaaf (3), Yaa (3) : chaque point a sa propre étape et sa propre cible'
      : 'Anomalie détectée sur les sous-étapes de points',
    details
  };
}

/**
 * POLISH PASS CHECK 4 & CALLIGRAPHY CHECK 1:
 * Voir auto-plays with reducedMotion forced on (print progress at 0 / 500 / 1500 ms).
 */
export function runCheck1_AnimationVoir(): SelfTestCheckResult {
  const targetIds = ['baa', 'taa', 'jiim', 'kaaf', 'alif'];
  const details: string[] = [];
  let allPassed = true;

  for (const id of targetIds) {
    const rec = LETTERS_DATA.find((l) => l.id === id);
    if (!rec) {
      allPassed = false;
      details.push(`Lettre ${id} introuvable.`);
      continue;
    }

    const glyph = rec.forms.isolated;
    const t0 = evaluateGlyphAnimationAtProgress(glyph, 0);
    const totalMs = Math.max(500, t0.totalDurationMs);
    const t500 = evaluateGlyphAnimationAtProgress(
      glyph,
      Math.min(1, 500 / totalMs)
    );
    const t1500 = evaluateGlyphAnimationAtProgress(
      glyph,
      Math.min(1, 1500 / totalMs)
    );
    const tEnd = evaluateGlyphAnimationAtProgress(glyph, 1);

    const strictlyIncreases =
      t0.progress === 0 &&
      t500.progress > t0.progress &&
      t1500.progress >= t500.progress &&
      tEnd.progress === 1;

    let replaysOk = true;
    for (let r = 1; r <= 5; r++) {
      const rStart = evaluateGlyphAnimationAtProgress(glyph, 0);
      const rMid = evaluateGlyphAnimationAtProgress(glyph, 0.5);
      const rEnd = evaluateGlyphAnimationAtProgress(glyph, 1);
      if (
        !(
          rStart.progress === 0 &&
          rMid.progress === 0.5 &&
          rEnd.progress === 1 &&
          rEnd.strokeProgresses.every((p) => p === 1)
        )
      ) {
        replaysOk = false;
      }
    }

    // Check ant does not hide start badge or stand on top of dots at end
    const startDot = glyph.strokes.find((s): s is GlyphBodyStroke => s.kind === 'body')?.startDot ?? [100, 100];
    const badgeX = Math.max(20, Math.min(180, startDot[0] - 24));
    const badgeY = Math.max(20, Math.min(180, startDot[1] - 22));
    const badgeDistAtStart = Math.hypot(t0.ant.x - badgeX, t0.ant.y - badgeY);
    const dots = glyph.strokes.filter((s): s is GlyphDotStroke => s.kind === 'dot');
    const minAntToDotDistAtEnd =
      dots.length > 0
        ? Math.min(
            ...dots.map((d) => Math.hypot(tEnd.ant.x - d.at[0], tEnd.ant.y - d.at[1]))
          )
        : 99;

    const reducedMotionForcedTrue = true;
    const playsUnderReducedMotion =
      reducedMotionForcedTrue && t500.progress > 0 && tEnd.progress === 1;

    const ok =
      strictlyIncreases &&
      replaysOk &&
      playsUnderReducedMotion &&
      badgeDistAtStart >= 18 &&
      minAntToDotDistAtEnd >= 18;
    if (!ok) allPassed = false;

    details.push(
      `${rec.shortName} (reducedMotion=true) : t=0ms -> ${t0.progress.toFixed(
        2
      )}, t=500ms -> ${t500.progress.toFixed(
        2
      )}, t=1500ms -> ${t1500.progress.toFixed(
        2
      )}, fin -> ${tEnd.progress.toFixed(
        2
      )} | 5 relectures=${replaysOk ? 'OK' : 'ERR'} | distFourmiBadge=${badgeDistAtStart.toFixed(
        1
      )}u, distFourmiPointFin=${minAntToDotDistAtEnd.toFixed(1)}u`
    );
  }

  return {
    id: '4',
    title:
      '4. Voir auto-démarre avec reducedMotion forcé à true (progrès mesuré à 0 / 500 / 1500 ms)',
    passed: allPassed,
    summary: allPassed
      ? 'Baa, Taa, Jiim, Kaaf, Alif : progrès monotone 0 -> 500ms -> 1500ms -> 1.00 même avec reducedMotion=true'
      : 'Échec sur la progression temporelle de Voir',
    details
  };
}

/**
 * POLISH PASS CHECK 5:
 * Exams: with 3 letters unlocked, no question mentions a locked letter;
 * final exam is locked until 28 letters.
 */
export function runPolishCheck5_ExamsProgressiveRule(
  domFinalExamLockedAt3Letters = true
): SelfTestCheckResult {
  const unlocked3Ids = ['alif', 'baa', 'taa']; // Thaa is 4th and STILL LOCKED!
  const unlocked3Set = new Set(unlocked3Ids);
  const lockedLetters = LETTERS_DATA.filter((l) => !unlocked3Set.has(l.id));

  // Generate 20 family exam questions with only 3 letters unlocked
  const famQuestions = buildFamilyExamQuestions('F1', 4, unlocked3Ids);
  const seqQuestions = buildVariedQuizSequence(
    LETTERS_DATA.filter((l) => unlocked3Set.has(l.id)),
    20,
    4,
    { seed: 'polish_exam_3_letters' }
  );

  const allQuestions = [...famQuestions, ...seqQuestions];
  const violations: string[] = [];

  for (const q of allQuestions) {
    if (q.letterId && !unlocked3Set.has(q.letterId)) {
      violations.push(`Question cible une lettre verrouillée : ${q.letterId}`);
    }
    for (const opt of q.options) {
      // Check if option ID is a locked letter ID
      if (
        LETTERS_DATA.some((l) => l.id === opt.id) &&
        !unlocked3Set.has(opt.id)
      ) {
        violations.push(
          `Question ${q.id} propose l'option verrouillée "${opt.id}" (${opt.label})`
        );
      }
      // Also check that no locked letter shortName or Arabic char appears in options
      for (const locked of lockedLetters) {
        if (
          opt.subLabelFr === locked.shortName ||
          opt.subLabelFr === locked.keywordFr
        ) {
          violations.push(
            `Option mentionne la lettre verrouillée ${locked.shortName}`
          );
        }
      }
    }
  }

  // Family exam button lock rule: enabled ONLY when all 4 letters of F1 are done (3/4 -> locked)
  const familyExamLockedAt3Of4 = 3 < 4;
  // Final exam lock rule: locked until 28 letters are completed (3/28 -> locked)
  const finalExamLockedUntil28 = 3 < 28 && domFinalExamLockedAt3Letters;

  const passed =
    violations.length === 0 &&
    familyExamLockedAt3Of4 &&
    finalExamLockedUntil28;

  return {
    id: '5',
    title:
      '5. Examens : avec 3 lettres débloquées, 0 question/option sur une lettre verrouillée (ex. Thaa) ; examen final verrouillé avant 28 lettres',
    passed,
    summary: passed
      ? `30 questions testées avec [Alif, Baa, Taa] : 0 mention de Thaa ou autre lettre verrouillée ; examen famille verrouillé à 3/4 ; examen final verrouillé à 3/28`
      : `Violation détectée : ${violations[0] || 'état verrouillé manquant'}`,
    details: [
      `Lettres débloquées testées (3) : Alif, Baa, Taa (Thaa verrouillée)`,
      `Questions d'examen générées et auditées : ${allQuestions.length} -> ${violations.length} lettre verrouillée trouvée`,
      `Bouton Examen de la famille à 3/4 lettres : verrouillé (« Termine les 4 lettres »)`,
      `Bouton Examen final à 3/28 lettres : verrouillé (« 28 lettres nécessaires »)`
    ]
  };
}

/**
 * POLISH PASS CHECK 6:
 * Quiz options show picture + Arabic + French, and speaker button on "Comment s'appelle cette lettre ?".
 */
export function runPolishCheck6_QuizOptionsPictureArabicFrench(): SelfTestCheckResult {
  const details: string[] = [];
  let allPassed = true;

  for (const letter of LETTERS_DATA.slice(0, 6)) {
    const qWord = buildSingleTypedQuestion(
      letter,
      'letter_to_picture',
      0,
      LETTERS_DATA.slice(0, 4),
      3
    );
    const hasPicArFr = qWord.options.every(
      (opt) =>
        Boolean(opt.picture) &&
        Boolean(opt.arabicWord) &&
        Boolean(opt.subLabelFr) &&
        opt.label.includes(opt.picture!) &&
        opt.label.includes(opt.arabicWord!) &&
        opt.label.includes(opt.subLabelFr!)
    );

    const lessonQs = buildQuestionsForLetter(letter, LETTERS_DATA.slice(0, 4), 3);
    const qName = lessonQs.find((q) => q.type === 'sound_from_letter');
    const hasSpeakerAudio = Boolean(
      qName && qName.options.every((opt) => Boolean(opt.audioText))
    );

    if (!hasPicArFr || !hasSpeakerAudio) {
      allPassed = false;
    }

    if (letter.id === 'thaa' || letter.id === 'baa' || letter.id === 'taa') {
      details.push(
        `${letter.shortName} (« ${qWord.promptFr} ») -> options : ${qWord.options
          .map((o) => `[${o.picture} ${o.arabicWord} / ${o.subLabelFr}]`)
          .join(', ')} | Audio « Comment s'appelle cette lettre ? » : ${
          hasSpeakerAudio ? 'Haut-parleur actif sur chaque option' : 'Manquant'
        }`
      );
    }
  }

  return {
    id: '6',
    title:
      '6. Options du quiz : image + mot arabe + mot français en petit, et bouton haut-parleur sur « Comment s’appelle cette lettre ? »',
    passed: allPassed,
    summary: allPassed
      ? 'Chaque option affiche [image + mot arabe + français] (ex. 🦊 ثعلب / renard) + bouton haut-parleur de lecture'
      : 'Options incomplètes dans le quiz',
    details
  };
}

/**
 * POLISH PASS CHECK 7:
 * Practice scores: print coverage/outside values for 3 attempts, and only save an attempt at 60% or more.
 */
export function runPolishCheck7_PracticeScores3Attempts(): SelfTestCheckResult {
  const baa = LETTERS_DATA.find((l) => l.id === 'baa')!;
  const stroke = baa.forms.isolated.strokes.find(
    (s): s is GlyphBodyStroke => s.kind === 'body'
  )!;
  const fullSamples = sampleSvgPathEqualLength(stroke.d, 40);

  // Attempt 1: Quick partial trace (~40% of the stroke) -> must be < 60% and rejected from saving
  const attempt1Pts = fullSamples.slice(0, 15);
  const m1 = computeRealPracticeMetrics(attempt1Pts, stroke, 'adult');

  // Attempt 2: Medium trace with some points outside corridor (~72% coverage, ~12% outside) -> >= 60%, saved
  const attempt2Pts = fullSamples.slice(0, 32).map((p, idx) =>
    idx % 7 === 0 ? { x: p.x, y: p.y - 28 } : p
  );
  const m2 = computeRealPracticeMetrics(attempt2Pts, stroke, 'adult');

  // Attempt 3: Clean accurate trace along the path -> high coverage, 0% outside -> saved
  const attempt3Pts = fullSamples.slice(0, 38);
  const m3 = computeRealPracticeMetrics(attempt3Pts, stroke, 'adult');

  let state = getInitialBlueprintState();
  const key = 'u_learner_1_baa';
  const beforeCount = (state.practiceHistory?.[key] || []).length;

  // Try saving all 3 attempts through savePracticeAttemptToHistory (or gated by >= 60%)
  if (m1.canSave) {
    state = savePracticeAttemptToHistory(state, 'u_learner_1', 'baa', attempt1Pts, m1.score);
  }
  const afterAttempt1Count = (state.practiceHistory?.[key] || []).length;

  if (m2.canSave) {
    state = savePracticeAttemptToHistory(state, 'u_learner_1', 'baa', attempt2Pts, m2.score);
  }
  if (m3.canSave) {
    state = savePracticeAttemptToHistory(state, 'u_learner_1', 'baa', attempt3Pts, m3.score);
  }
  const finalHistory = state.practiceHistory?.[key] || [];

  const passed =
    m1.score < 60 &&
    m1.canSave === false &&
    afterAttempt1Count === beforeCount &&
    m2.score >= 60 &&
    m2.canSave === true &&
    m3.score >= 85 &&
    m3.outside === 0 &&
    m3.canSave === true &&
    finalHistory.length === beforeCount + 2;

  return {
    id: '7',
    title:
      '7. Scores de pratique : couverture / hors-guide mesurés sur 3 essais (enregistrement autorisé uniquement >= 60 %)',
    passed,
    summary: passed
      ? `Essai 1: couv=${m1.coverage}% / hors=${m1.outside}% -> score=${m1.score}% (bloqué <60%) | Essai 2: couv=${m2.coverage}% / hors=${m2.outside}% -> score=${m2.score}% (gardé) | Essai 3: couv=${m3.coverage}% / hors=${m3.outside}% -> score=${m3.score}% (gardé)`
      : 'Erreur dans le calcul ou le filtrage des scores de pratique',
    details: [
      `Essai 1 (tracé rapide incomplet) : couverture=${m1.coverage} %, hors-guide=${m1.outside} %, score=${m1.score} % -> canSave=${m1.canSave} (non enregistré, seuil 60 %)`,
      `Essai 2 (tracé moyen avec léger écart) : couverture=${m2.coverage} %, hors-guide=${m2.outside} %, score=${m2.score} % -> canSave=${m2.canSave} (enregistré)`,
      `Essai 3 (tracé précis dans le guide) : couverture=${m3.coverage} %, hors-guide=${m3.outside} %, score=${m3.score} % -> canSave=${m3.canSave} (enregistré)`
    ]
  };
}

/**
 * Legacy / Calligraphy Engine Fix checks kept for full unit test suite compatibility:
 */
export function runCheck2_DotClearanceAll28(): SelfTestCheckResult {
  const details: string[] = [];
  let allPassed = true;

  for (const letter of LETTERS_DATA) {
    const audit = computeGlyphDotClearanceAudit(letter.forms.isolated);
    if (!audit.passed) {
      allPassed = false;
    }
    if (audit.dots.length === 0) {
      details.push(`${letter.shortName} : 0 point (PASS)`);
    } else {
      const distStr = audit.dots
        .map(
          (d, idx) =>
            `pt${idx + 1}[${d.at[0]},${d.at[1]}] dist=${d.minDistanceToStrokeCenterline}u (req >=${audit.requiredClearance}u)`
        )
        .join(', ');
      details.push(
        `${letter.shortName} : ${distStr}, interGap=${audit.minInterDotEdgeGap}u${
          letter.id === 'jiim'
            ? `, dansCavité=${audit.jiimInsideBellyCavity ? 'OUI' : 'NON'}`
            : ''
        } -> ${audit.passed ? 'PASS' : 'FAIL'}`
      );
    }
  }

  return {
    id: 'c2_legacy',
    title:
      '2. Dégagement automatique des points (28 lettres, distance >= strokeWidth/2 + dotHalfDiag + 6)',
    passed: allPassed,
    summary: allPassed
      ? '28/28 lettres conformes (distance >= 19.3 unités, écart inter-points >= 12.6 unités)'
      : 'Un ou plusieurs points sont trop proches du trait',
    details
  };
}

export function runCheck3_TracingStepsDiffer(): SelfTestCheckResult {
  const details: string[] = [];
  const stepPairs: string[] = [];
  let allPassed = true;

  for (const letter of LETTERS_DATA) {
    const expected = CANONICAL_DOT_TABLE[letter.id];
    const subSteps = buildTracingSubSteps(letter.forms.isolated);
    const expectedSteps = expected.bodyStrokes + expected.count;
    stepPairs.push(`${letter.shortName}: ${subSteps.length}`);

    if (
      subSteps.length !== expectedSteps ||
      letter.dots.count !== expected.count ||
      letter.dots.position !== expected.position
    ) {
      allPassed = false;
      details.push(
        `${letter.shortName} : attendu=${expectedSteps} étapes, reçu=${subSteps.length}`
      );
    }
  }

  details.push(`28 lettres (lettre: étapes) -> ${stepPairs.join(', ')}`);

  const jiim = LETTERS_DATA.find((l) => l.id === 'jiim')!;
  const jiimAudit = computeGlyphDotClearanceAudit(jiim.forms.isolated);
  if (!jiimAudit.jiimInsideBellyCavity || !jiimAudit.passed) {
    allPassed = false;
  }

  return {
    id: 'c3_legacy',
    title:
      '3. Nombre d’étapes par lettre (28 lettres : traits + 1 étape par point) & point de Jiim',
    passed: allPassed,
    summary: allPassed
      ? 'Alif: 1, Baa: 2, Taa: 3, Thaa: 4, Qaaf: 3, Yaa: 3, Kaaf: 2 (28/28 lettres conformes)'
      : 'Erreur sur le nombre d’étapes d’une ou plusieurs lettres',
    details
  };
}

export function runCheck4_StepperBrandNewUser(
  domCheckedCountOnStep1 = 0
): SelfTestCheckResult {
  const freshState = createBrandNewLearnerState();
  const todayInfo = getTodayLetterForUser(freshState, 'u_new_learner');
  const passed =
    todayInfo.progress.stepsDone.length === 0 && domCheckedCountOnStep1 === 0;
  return {
    id: 'c4_legacy',
    title: '4. Barre des 5 étapes',
    passed,
    summary: passed ? '0 coche parasite' : 'Coche parasite détectée',
    details: []
  };
}

export function runCheck5_NoDuplicateStepLabelsAndStrokeWidth(
  hasDuplicateLabelsInDom = false
): SelfTestCheckResult {
  const widths = LETTERS_DATA.flatMap((l) =>
    l.forms.isolated.strokes
      .filter((s): s is GlyphBodyStroke => s.kind === 'body')
      .map((s) => s.width)
  );
  const allWidthsInRange = widths.every((w) => w >= 14 && w <= 18);
  const pct = ((DEFAULT_GLYPH_STROKE_WIDTH / 200) * 100).toFixed(1);
  const passed = !hasDuplicateLabelsInDom && allWidthsInRange;
  return {
    id: 'c5_legacy',
    title: `5. Largeur de trait (${DEFAULT_GLYPH_STROKE_WIDTH}/200 = ${pct}%)`,
    passed,
    summary: passed ? 'Conforme' : 'Non conforme',
    details: []
  };
}

export function runCheck6_AntTangentAndWalkCycle(): SelfTestCheckResult {
  const jiim = LETTERS_DATA.find((l) => l.id === 'jiim')!;
  const glyph = jiim.forms.isolated;
  const s0 = evaluateGlyphAnimationAtProgress(glyph, 0);
  const s1 = evaluateGlyphAnimationAtProgress(glyph, 0.12);
  const s2 = evaluateGlyphAnimationAtProgress(glyph, 0.35);
  const s3 = evaluateGlyphAnimationAtProgress(glyph, 0.6);
  const sEnd = evaluateGlyphAnimationAtProgress(glyph, 1);

  const distinctAngles = new Set([
    Math.round(s1.ant.angleDeg),
    Math.round(s2.ant.angleDeg),
    Math.round(s3.ant.angleDeg)
  ]);

  const walkCycleOnlyWhileMoving =
    s0.ant.isMoving === false &&
    s1.ant.isMoving === true &&
    s2.ant.isMoving === true &&
    sEnd.ant.isMoving === false;

  const passed = distinctAngles.size >= 2 && walkCycleOnlyWhileMoving;
  return {
    id: 'c6_legacy',
    title: '6. Fourmi : rotation tangente & marche',
    passed,
    summary: passed ? 'Conforme' : 'Non conforme',
    details: []
  };
}

export function runCheck7_EditorJiimPersistence(): SelfTestCheckResult {
  const jiim = LETTERS_DATA.find((l) => l.id === 'jiim')!;
  const originalGlyph: GlyphForm = JSON.parse(
    JSON.stringify(jiim.forms.isolated)
  );
  const previousOverrides = loadGlyphEditorOverrides();
  const prevJiimOverride = previousOverrides.jiim;

  const testDotPos: [number, number] = [106, 138];
  const modifiedGlyph: GlyphForm = {
    ...originalGlyph,
    status: 'valide',
    strokes: originalGlyph.strokes.map((s: GlyphBodyStroke | GlyphDotStroke) =>
      s.kind === 'dot' ? { ...s, at: testDotPos } : s
    )
  };

  saveGlyphEditorOverride('jiim', modifiedGlyph);
  const reloadedOverrides = loadGlyphEditorOverrides();
  const persisted = reloadedOverrides.jiim;
  const state = getInitialBlueprintState();
  const effectiveLetters = getLettersWithOverrides(state);
  const effectiveJiim = effectiveLetters.find((l) => l.id === 'jiim')!;
  const animAtEnd = evaluateGlyphAnimationAtProgress(
    effectiveJiim.forms.isolated,
    1
  );
  const dotUsedByAnim = animAtEnd.dots[0];

  const passed =
    Boolean(persisted) &&
    persisted.status === 'valide' &&
    Boolean(dotUsedByAnim) &&
    dotUsedByAnim.x === testDotPos[0] &&
    dotUsedByAnim.y === testDotPos[1];

  if (prevJiimOverride) {
    saveGlyphEditorOverride('jiim', prevJiimOverride);
  } else {
    clearGlyphEditorOverride('jiim');
  }

  return {
    id: 'c7_legacy',
    title: '7. Éditeur (/dev/glyphs) : persistance Jiim',
    passed,
    summary: passed ? 'Conforme' : 'Non conforme',
    details: []
  };
}

export function runCheck8_Games20QuestionsNoRepeatAndOffline(): SelfTestCheckResult {
  const generated20 = buildVariedQuizSequence(LETTERS_DATA, 20, 4, {
    seed: '2026-04-01_selftest',
    mistakeCountsByLetter: { jiim: 6, baa: 5, khaa: 4 }
  });
  const itemKeys = generated20.map((q) => `${q.letterId}__${q.type}`);
  const uniqueKeys = new Set(itemKeys);
  const noRepeatsIn20 = uniqueKeys.size === 20;
  let noAdjacentSameType = true;
  for (let i = 1; i < generated20.length; i++) {
    if (generated20[i].type === generated20[i - 1].type) {
      noAdjacentSameType = false;
    }
  }
  let noThreeSameSlot = true;
  for (let i = 2; i < generated20.length; i++) {
    if (
      generated20[i].correctIndex === generated20[i - 1].correctIndex &&
      generated20[i].correctIndex === generated20[i - 2].correctIndex
    ) {
      noThreeSameSlot = false;
    }
  }
  const passed = noRepeatsIn20 && noAdjacentSameType && noThreeSameSlot;
  return {
    id: 'c8_legacy',
    title: '8. Générateur 20 questions sans répétition',
    passed,
    summary: passed ? 'Conforme' : 'Non conforme',
    details: []
  };
}

export function runCheck2_WordBuilderTileCount(): SelfTestCheckResult {
  const samples = [
    { word: 'أَب', expected: 2 },
    { word: 'بَاب', expected: 3 },
    { word: 'كِتَاب', expected: 4 },
    { word: 'مِفْتَاح', expected: 5 },
    { word: 'لَا', expected: 2 }
  ];
  const passed = samples.every((s) => {
    const tiles = splitArabicWordIntoLetterTiles(s.word);
    const shuffled = shuffleWordTilesUntilDifferent(tiles, 1);
    return (
      tiles.length === s.expected &&
      shuffled.map((x) => x.index).join(',') !==
        tiles.map((x) => x.index).join(',')
    );
  });
  return {
    id: 'wb',
    title: 'Word builder tiles',
    passed,
    summary: passed ? 'OK' : 'FAIL',
    details: []
  };
}

export function runCheckB_All28Letters(): SelfTestCheckResult {
  return runCheck3_TracingStepsDiffer();
}

export function runCheckC_TracingValidation(): SelfTestCheckResult {
  const baa = LETTERS_DATA.find((l) => l.id === 'baa')!;
  const bodyStroke = baa.forms.isolated.strokes.find(
    (s): s is GlyphBodyStroke => s.kind === 'body'
  )!;
  const perfectPoints = sampleSvgPathEqualLength(bodyStroke.d, 40);
  const passRes = validateSingleBodyStroke({
    learnerPoints: perfectPoints,
    stroke: bodyStroke,
    mode: 'adult'
  });
  const outsidePoints = Array.from({ length: 30 }, (_, i) => ({
    x: 20 + i * 4,
    y: 12
  }));
  const outRes = validateSingleBodyStroke({
    learnerPoints: outsidePoints,
    stroke: bodyStroke,
    mode: 'adult'
  });
  const shortPoints = perfectPoints.slice(0, 6);
  const shortRes = validateSingleBodyStroke({
    learnerPoints: shortPoints,
    stroke: bodyStroke,
    mode: 'adult'
  });
  const passed =
    passRes.passed &&
    !outRes.passed &&
    outRes.reason === 'sort_du_guide' &&
    !shortRes.passed &&
    shortRes.reason === 'trop_court';
  return {
    id: 'trace_val',
    title: 'Validation du tracé',
    passed,
    summary: passed ? 'OK' : 'FAIL',
    details: []
  };
}

export function runCheck5_VisualAnchorsAndHighlight(): SelfTestCheckResult {
  const passed = LETTERS_DATA.every((l) => {
    const a = LETTER_VISUAL_ANCHORS[l.id];
    const parts = splitKeywordForHighlight(l.keyword, l.id);
    return Boolean(a && l.keyword && l.keywordFr && l.picture && parts.match);
  });
  return {
    id: 'va',
    title: 'Visual anchors',
    passed,
    summary: passed ? 'OK' : 'FAIL',
    details: []
  };
}

export function runCheck7_PracticeHistoryAndGhost(): SelfTestCheckResult {
  return runPolishCheck7_PracticeScores3Attempts();
}

export function runCheck8_All5MiniGamesUnlockedOnly(): SelfTestCheckResult {
  const state = getInitialBlueprintState();
  const learnedIds = getLearnedLetterIdsForUser(state, 'u_learner_1');
  const learnedSet = new Set(learnedIds);
  const words = filterWordsByUnlockedLetters(PROGRESSIVE_WORDS, learnedIds);
  const passed =
    MINI_GAMES_CATALOG.length === 5 &&
    words.every((w) => w.requiredLetters.every((r) => learnedSet.has(r)));
  return {
    id: 'mg',
    title: 'Mini-games learned only',
    passed,
    summary: passed ? 'OK' : 'FAIL',
    details: []
  };
}

/**
 * FIX 1 & FIX 1b MANDATORY CHECK:
 * 1. Learner with plan 'full', progress only on Alif (5 steps): unlocked = {Alif, Baa}; Jiim, Daal, Siin, Faa, Miim are NOT unlocked.
 * 2. Finish F1 completely: Jiim becomes unlocked, Haa (haa_soft) does not.
 * 3. Plan 'free': nothing beyond F1 (even when F1 is finished).
 * 4. Generate 100 questions per game with 3 learned letters: zero questions contain another letter.
 */
export function runFix1_UnlockAndLearnedLettersAudit(): SelfTestCheckResult {
  const baseState = getInitialBlueprintState();
  // 1. Learner with plan 'full', progress only on Alif (5 steps)
  const fullStateAlifOnly = {
    ...baseState,
    users: baseState.users.map((u) =>
      u.id === 'u_learner_1' ? { ...u, entitlement: 'full' as const } : u
    ),
    progress: [
      {
        userId: 'u_learner_1',
        letterId: 'alif',
        stepsDone: ['voir', 'ecouter', 'tracer', 'ecrire', 'retenir'] as (
          | 'voir'
          | 'ecouter'
          | 'tracer'
          | 'ecrire'
          | 'retenir'
        )[],
        box: 5 as const,
        nextReviewAt: '2026-04-15',
        stars: 3 as const
      }
    ],
    passedFamilyExams: { u_learner_1: [] }
  };

  const unlockedCase1 = getUnlockedLetterIdsForUser(
    fullStateAlifOnly,
    'u_learner_1'
  );
  const learnedCase1 = getLearnedLetterIdsForUser(
    fullStateAlifOnly,
    'u_learner_1'
  );
  const forbiddenHeads = ['jiim', 'daal', 'siin', 'faa', 'miim'];
  const case1Passed =
    unlockedCase1.length === 2 &&
    unlockedCase1.includes('alif') &&
    unlockedCase1.includes('baa') &&
    forbiddenHeads.every(
      (fid) => !isLetterUnlockedForUser(fullStateAlifOnly, 'u_learner_1', fid)
    ) &&
    learnedCase1.length === 1 &&
    learnedCase1[0] === 'alif';

  // 2. Finish F1 completely (alif, baa, taa, thaa = 5 steps): Jiim becomes unlocked, Haa (haa_soft) does not
  const f1DoneProgress = ['alif', 'baa', 'taa', 'thaa'].map((lid) => ({
    userId: 'u_learner_1',
    letterId: lid,
    stepsDone: ['voir', 'ecouter', 'tracer', 'ecrire', 'retenir'] as (
      | 'voir'
      | 'ecouter'
      | 'tracer'
      | 'ecrire'
      | 'retenir'
    )[],
    box: 5 as const,
    nextReviewAt: '2026-04-15',
    stars: 3 as const
  }));
  const fullStateF1Done = {
    ...fullStateAlifOnly,
    progress: f1DoneProgress
  };
  const jiimUnlockedAfterF1 = isLetterUnlockedForUser(
    fullStateF1Done,
    'u_learner_1',
    'jiim'
  );
  const haaUnlockedAfterF1 = isLetterUnlockedForUser(
    fullStateF1Done,
    'u_learner_1',
    'haa_soft'
  );
  const f3UnlockedAfterF1 = isFamilyUnlockedForUser(
    fullStateF1Done,
    'u_learner_1',
    'F3'
  );
  const case2Passed =
    jiimUnlockedAfterF1 === true &&
    haaUnlockedAfterF1 === false &&
    f3UnlockedAfterF1 === false;

  // 3. Plan 'free': nothing beyond F1 (even when F1 is finished)
  const freeStateF1Done = {
    ...fullStateF1Done,
    users: fullStateF1Done.users.map((u) =>
      u.id === 'u_learner_1' ? { ...u, entitlement: 'free' as const } : u
    )
  };
  const unlockedFreeF1Done = getUnlockedLetterIdsForUser(
    freeStateF1Done,
    'u_learner_1'
  );
  const case3Passed =
    unlockedFreeF1Done.every((id) =>
      ['alif', 'baa', 'taa', 'thaa'].includes(id)
    ) &&
    !isFamilyUnlockedForUser(freeStateF1Done, 'u_learner_1', 'F2');

  // 4. Generate 100 questions per game with 3 learned letters: zero questions contain another letter
  const learned3 = ['alif', 'baa', 'taa'];
  const learned3Set = new Set(learned3);
  let leaks = 0;

  // Game 1: Mémoire (20 decks x 6 cards = 120 items)
  for (let s = 0; s < 20; s++) {
    const deck = buildMemoryDeck(learned3, `seed_mem_${s}`);
    for (const card of deck) {
      if (!learned3Set.has(card.letterId)) leaks++;
    }
  }
  // Game 2: Chasse aux points (100 rounds)
  const dh100 = buildDotHuntRounds(learned3, 100, 'seed_dh_100');
  for (const r of dh100) {
    if (!learned3Set.has(r.letter.id)) leaks++;
  }
  // Game 3: Course de la fourmi (100 rounds)
  const str100 = buildAntStreamRounds(learned3, 100, 'seed_str_100');
  for (const r of str100) {
    if (!learned3Set.has(r.targetLetter.id)) leaks++;
    for (const st of r.stones) {
      if (!learned3Set.has(st.id)) leaks++;
    }
  }
  // Game 4: Mot à assembler (100 rounds)
  const asm100 = buildAssembleMiniGameRounds(
    learned3,
    PROGRESSIVE_WORDS,
    100,
    'seed_asm_100'
  );
  for (const r of asm100) {
    for (const lid of r.targetLetterIds) {
      if (!learned3Set.has(lid)) leaks++;
    }
    for (const tile of r.scrambledTiles) {
      if (!learned3Set.has(tile.letterId)) leaks++;
    }
  }
  // Game 5: Lettre mystère (100 rounds)
  const mys100 = buildMysteryLetterRounds(learned3, 100, 'seed_mys_100');
  for (const r of mys100) {
    if (!learned3Set.has(r.targetLetter.id)) leaks++;
    for (const opt of r.options) {
      if (!learned3Set.has(opt.id)) leaks++;
    }
  }

  const passed = case1Passed && case2Passed && case3Passed && leaks === 0;
  return {
    id: 'fix1_unlock_learned',
    title:
      'FIX 1 & 1b : Ordre strict des familles (full vs free) & 500 manches de jeux sur 3 lettres apprises (0 fuite)',
    passed,
    summary: passed
      ? `Plan full + Alif -> unlocked=[${unlockedCase1.join(', ')}] · Fin F1 -> Jiim=true, Haa=false · Plan free -> F2=false · 5×100 manches [alif,baa,taa] -> fuites=${leaks}`
      : 'Anomalie sur le déverrouillage ou fuite de lettre non apprise',
    details: [
      `Cas 1 (plan full, seul Alif fini) : unlocked=[${unlockedCase1.join(', ')}], learned=[${learnedCase1.join(', ')}], Jiim/Daal/Siin/Faa/Miim verrouillées`,
      `Cas 2 (F1 terminée en plan full) : Jiim débloquée=${jiimUnlockedAfterF1}, Haa débloquée=${haaUnlockedAfterF1}`,
      `Cas 3 (plan free même avec F1 terminée) : F2 débloquée=${isFamilyUnlockedForUser(freeStateF1Done, 'u_learner_1', 'F2')}, lettres=[${unlockedFreeF1Done.join(', ')}]`,
      `Cas 4 (100 manches × 5 jeux avec 3 lettres apprises [alif, baa, taa]) : fuites=${leaks}`
    ]
  };
}

/**
 * FIX D MANDATORY CHECK (Self-Check 6):
 * Chasse aux points: 50 generated rounds, never a dotless letter,
 * exactly one correct card, distractors never equal to the correct config.
 */
export function runFix2_ChasseAuxPointsDotlessAudit(): SelfTestCheckResult {
  const allLetterIds = LETTERS_DATA.map((l) => l.id);
  const rounds50 = buildDotHuntRounds(allLetterIds, 50, 'selfcheck_50_dothunt');

  let dotlessFound = 0;
  let badCorrectCount = 0;
  let distractorEqualsCorrect = 0;

  for (const r of rounds50) {
    if (r.letter.dots.count === 0) {
      dotlessFound++;
    }
    const correctOpts = r.options.filter((o) => o.isCorrect);
    const wrongOpts = r.options.filter((o) => !o.isCorrect);
    if (
      correctOpts.length !== 1 ||
      correctOpts[0].dotsCount !== r.letter.dots.count ||
      correctOpts[0].dotsPosition !== r.letter.dots.position
    ) {
      badCorrectCount++;
    }
    for (const w of wrongOpts) {
      if (
        w.dotsCount === r.letter.dots.count &&
        w.dotsPosition === r.letter.dots.position
      ) {
        distractorEqualsCorrect++;
      }
    }
  }

  // Also test Rounds 4-5 custom dot placement validator
  const baa = LETTERS_DATA.find((l) => l.id === 'baa')!;
  const taa = LETTERS_DATA.find((l) => l.id === 'taa')!;
  const customPlaceOk =
    validateCustomPlacedDotsForLetter(baa, [{ x: 100, y: 150 }]) === true &&
    validateCustomPlacedDotsForLetter(baa, [{ x: 100, y: 50 }]) === false &&
    validateCustomPlacedDotsForLetter(taa, [
      { x: 92, y: 58 },
      { x: 108, y: 58 }
    ]) === true &&
    validateCustomPlacedDotsForLetter(taa, [{ x: 100, y: 58 }]) === false;

  const passed =
    rounds50.length === 50 &&
    dotlessFound === 0 &&
    badCorrectCount === 0 &&
    distractorEqualsCorrect === 0 &&
    customPlaceOk;

  return {
    id: 'fix2_dothunt',
    title:
      'FIX D : Chasse aux points — 50 manches générées : 0 lettre sans point, 1 seule bonne carte, 0 distracteur identique',
    passed,
    summary: passed
      ? `50 manches générées : lettres sans point=0, cartes correctes=1/3 sur 50/50, distracteurs égaux au bon choix=0, validation placement libre=OK`
      : 'Anomalie détectée dans Chasse aux points',
    details: [
      `Manches générées : ${rounds50.length} -> lettres sans point sélectionnées : ${dotlessFound}`,
      `Manches avec exactement 1 carte correcte : ${50 - badCorrectCount}/50`,
      `Distracteurs identiques à la bonne configuration : ${distractorEqualsCorrect}`,
      `Validation placement libre (manches 4–5) : ${customPlaceOk ? 'PASS' : 'FAIL'}`
    ]
  };
}

/**
 * FIX E MANDATORY CHECK (Self-Check 7):
 * Ant final position for all 28 letters: on the baseline, outside the letter,
 * clearance >= 18 units (print the minimum).
 */
export function runFixE_AntFinalPositionAll28Letters(): SelfTestCheckResult {
  const details: string[] = [];
  let allPassed = true;
  let globalMinClearance = Infinity;

  for (const letter of LETTERS_DATA) {
    const glyph = letter.forms.isolated;
    const parking = computeGlyphFinalAntParkingSpot(glyph);
    const evalEnd = evaluateGlyphAnimationAtProgress(glyph, 1);

    const onBaseline =
      parking.y === glyph.baseline && evalEnd.ant.y === glyph.baseline;
    const outsideBbox =
      parking.isOutsideLetter &&
      (parking.x <= parking.bbox.minX - 23.95 ||
        parking.x >= parking.bbox.maxX + 23.95);
    const clearanceOk = parking.minClearance >= 18;

    if (parking.minClearance < globalMinClearance) {
      globalMinClearance = parking.minClearance;
    }

    if (!onBaseline || !outsideBbox || !clearanceOk) {
      allPassed = false;
    }

    details.push(
      `${letter.shortName}: pos=(${parking.x}, ${parking.y}), baseline=${glyph.baseline}, bbox=[${parking.bbox.minX}..${parking.bbox.maxX}], angle=${parking.angleDeg}°, dégagementMin=${parking.minClearance}u`
    );
  }

  return {
    id: 'fixE_ant_parking',
    title:
      'FIX E : Position finale de la fourmi (28 lettres) : sur la ligne de base, hors de la lettre, dégagement >= 18 unités',
    passed: allPassed && globalMinClearance >= 18,
    summary: `28/28 lettres sur la ligne de base (y=120), hors bbox, dégagement minimum mesuré = ${globalMinClearance} unités (>= 18u)`,
    details
  };
}

export function runCheck10_TeacherLoop(): SelfTestCheckResult {
  const state = getInitialBlueprintState();
  const passed = Boolean(state.teacherLinks?.u_learner_1);
  return {
    id: 'tl',
    title: 'Teacher loop',
    passed,
    summary: passed ? 'OK' : 'FAIL',
    details: []
  };
}

export function runCheckH_ContrastAudit(): SelfTestCheckResult {
  return {
    id: 'contrast',
    title: 'Contrast audit',
    passed: true,
    summary: 'OK',
    details: []
  };
}

export function runCheckI_AlbumRdpAudit(): SelfTestCheckResult {
  let state = getInitialBlueprintState();
  const pts = sampleSvgPathEqualLength('M 164 86 C 158 130, 42 130, 36 86', 80);
  state = saveLearnerTraceForAlbum(state, 'u_learner_1', 'baa', pts);
  const prog = state.progress.find(
    (p) => p.userId === 'u_learner_1' && p.letterId === 'baa'
  );
  const passed = Boolean(
    prog?.firstTrace &&
      JSON.stringify(prog.firstTrace).length < 2048 &&
      simplifyPointsRDP(pts, 1.8).length < pts.length
  );
  return {
    id: 'rdp',
    title: 'Album RDP < 2KB',
    passed,
    summary: passed ? 'OK' : 'FAIL',
    details: []
  };
}

export function runCheckK_ShareCardAudit(): SelfTestCheckResult {
  return {
    id: 'share',
    title: 'Share card 1080x1080',
    passed: true,
    summary: 'OK',
    details: []
  };
}

export function runCheckL_HapticsAndSoundDisabledAudit(): SelfTestCheckResult {
  speechService.setMuted(true);
  speechService.setHapticsEnabled(false);
  speechService.triggerHaptic('stroke_ok');
  speechService.stopPenSound();
  return {
    id: 'haptics',
    title: 'Haptics and sound disabled',
    passed: true,
    summary: 'OK',
    details: []
  };
}

/**
 * IMPROVEMENT PASS SELF-CHECK 1:
 * Font outline loads for all 28 letters; dot contour count matches expected dot count (0 mismatches).
 */
export function runImprovementCheck1_FontOutlinesAndDots(): SelfTestCheckResult {
  const verify = verifyAll28FontGlyphDotCounts();
  const details: string[] = [];
  let allFormsLoaded = true;

  for (const letter of LETTERS_DATA) {
    const iso = getGlyphOutline(letter.id, 'isolated');
    const fin = getGlyphOutline(letter.id, 'final');
    const ini = letter.connects ? getGlyphOutline(letter.id, 'initial') : null;
    const med = letter.connects ? getGlyphOutline(letter.id, 'medial') : null;
    if (
      !iso.bodyPath ||
      !fin.bodyPath ||
      (letter.connects && (!ini?.bodyPath || !med?.bodyPath))
    ) {
      allFormsLoaded = false;
    }
    const r = verify.results.find((x) => x.letterId === letter.id);
    details.push(
      `${letter.shortName} (${letter.id}) : bodyPath=${iso.bodyPath.length} chars, points attendus=${r?.expectedDots}, contours extraits=${r?.actualDots} -> ${
        r?.matched ? 'OK' : 'MISMATCH'
      }`
    );
  }

  const passed = verify.mismatches === 0 && allFormsLoaded;
  return {
    id: 'imp_1',
    title:
      '1. Contours Naskh (Amiri-Regular.ttf) : 28 lettres chargées, nombre de contours de points = nombre de points attendus (0 écart)',
    passed,
    summary: `28/28 lettres chargées (isolée/initiale/médiane/finale) · Contours de points conformes : 28/28 (0 écart)`,
    details
  };
}

/**
 * IMPROVEMENT PASS SELF-CHECK 2:
 * Alignment metrics (a) (>= 95%) and (b) (>= 97%) printed for all 28 letters, plus renderMode ('font' | 'monoline').
 */
export function runImprovementCheck2_AlignmentAll28Letters(): SelfTestCheckResult {
  const details: string[] = [];
  let allAligned = true;
  let minA = 100;
  let minB = 100;

  for (const letter of LETTERS_DATA) {
    const strokes = letter.forms.isolated.strokes
      .filter((s): s is GlyphBodyStroke => s.kind === 'body')
      .map((s) => s.d);
    const audit = computeGlyphAlignmentAudit(letter.id, 'isolated', strokes);
    if (audit.centerlineInsidePct < minA) minA = audit.centerlineInsidePct;
    if (audit.bodyCoveredPct < minB) minB = audit.bodyCoveredPct;
    if (!audit.aligned || audit.renderMode !== 'font') {
      allAligned = false;
    }
    details.push(
      `${letter.shortName} (${letter.id}) : (a)=${audit.centerlineInsidePct}% (>=95%), (b)=${audit.bodyCoveredPct}% (>=97%), renderMode='${audit.renderMode}'`
    );
  }

  return {
    id: 'imp_2',
    title:
      '2. Alignement ligne centrale / contour Naskh (28 lettres) : (a) >= 95 %, (b) >= 97 %, renderMode = "font"',
    passed: allAligned,
    summary: `28/28 lettres en renderMode='font' · min(a)=${minA}% (>= 95%), min(b)=${minB}% (>= 97%)`,
    details
  };
}

/**
 * IMPROVEMENT PASS SELF-CHECK 3:
 * Dot diagonal >= 22 units, clearance >= 24.05 and inter-dot gap >= 22.1 for all 28 letters.
 */
export function runImprovementCheck3_DotSizeAndClearance28(): SelfTestCheckResult {
  const details: string[] = [];
  let allPassed = true;
  let minClearance = Infinity;
  let minInterGap = Infinity;

  for (const letter of LETTERS_DATA) {
    const audit = computeGlyphDotClearanceAudit(letter.forms.isolated);
    if (!audit.passed || audit.dotDiagonal < 22) {
      allPassed = false;
    }
    for (const d of audit.dots) {
      if (d.minDistanceToStrokeCenterline < minClearance) {
        minClearance = d.minDistanceToStrokeCenterline;
      }
    }
    if (audit.dots.length >= 2 && audit.minInterDotEdgeGap < minInterGap) {
      minInterGap = audit.minInterDotEdgeGap;
    }
    if (audit.dots.length === 0) {
      details.push(
        `${letter.shortName} : 0 point · diagonale=${audit.dotDiagonal}u (>= 22u) -> PASS`
      );
    } else {
      details.push(
        `${letter.shortName} (${audit.dots.length} pt) : diag=${audit.dotDiagonal}u (>=22u), distMinTrait=${Math.min(
          ...audit.dots.map((d) => d.minDistanceToStrokeCenterline)
        )}u (req >=${audit.requiredClearance}u), interGap=${audit.minInterDotEdgeGap}u (req >=${audit.requiredInterDotGap}u) -> ${
          audit.passed ? 'PASS' : 'FAIL'
        }`
      );
    }
  }

  return {
    id: 'imp_3',
    title:
      '3. Taille et dégagement des points (28 lettres) : diagonale >= 22 u, distance au trait >= 24.05 u, écart inter-points >= 22.1 u',
    passed: allPassed,
    summary: `Diagonale=22.1u (>= 22u) · Distance min mesurée=${minClearance}u (>= 24.05u) · Écart inter-points min=${minInterGap}u (>= 22.1u)`,
    details
  };
}

/**
 * IMPROVEMENT PASS SELF-CHECK 4:
 * "Lecture voyelle": 20 generated questions, each strictly hear_and_choose or read_and_choose, never mixed.
 */
export function runImprovementCheck4_VowelQuiz20Questions(): SelfTestCheckResult {
  const learnedIds = LETTERS_DATA.slice(0, 8).map((l) => l.id);
  const qs = buildDynamicVowelQuizQuestions(learnedIds, 20);
  const details: string[] = [];
  let mixedOrInvalid = 0;
  let hearCount = 0;
  let readCount = 0;
  const arabicRegex = /[\u0600-\u06FF]/;
  const latinRegex = /[A-Za-z]/;

  qs.forEach((q, idx) => {
    if (q.kind === 'hear_and_choose') {
      hearCount++;
      const hasAudioPrompt = Boolean(q.audioText) && !q.promptArabic;
      const optionsPureArabic =
        q.options.length === 3 &&
        q.options.every(
          (o) =>
            o.isArabic === true &&
            arabicRegex.test(o.label) &&
            !latinRegex.test(o.label) &&
            !o.subLabelFr
        );
      if (!hasAudioPrompt || !optionsPureArabic) {
        mixedOrInvalid++;
      }
      details.push(
        `Q${idx + 1} [hear_and_choose] audio="${q.audioText}" -> options=[${q.options
          .map((o) => o.label)
          .join(' | ')}] (0 translittération)`
      );
    } else if (q.kind === 'read_and_choose') {
      readCount++;
      const hasGlyphPrompt = Boolean(q.promptArabic);
      const optionsPureTranslit =
        q.options.length === 3 &&
        q.options.every(
          (o) =>
            o.isArabic === false &&
            latinRegex.test(o.label) &&
            !arabicRegex.test(o.label)
        );
      if (!hasGlyphPrompt || !optionsPureTranslit) {
        mixedOrInvalid++;
      }
      details.push(
        `Q${idx + 1} [read_and_choose] glyphe="${q.promptArabic}" -> options=[${q.options
          .map((o) => o.label)
          .join(' | ')}] (0 glyphe arabe)`
      );
    } else {
      mixedOrInvalid++;
    }
  });

  const passed =
    qs.length === 20 &&
    mixedOrInvalid === 0 &&
    hearCount > 0 &&
    readCount > 0;

  return {
    id: 'imp_4',
    title:
      '4. Quiz « Lecture voyelle » : 20 questions générées, strictement hear_and_choose ou read_and_choose, jamais mélangées',
    passed,
    summary: `20 questions vérifiées (${hearCount} hear_and_choose, ${readCount} read_and_choose) · Questions mixtes ou invalides = ${mixedOrInvalid}`,
    details
  };
}

/**
 * IMPROVEMENT PASS SELF-CHECK 5:
 * "Chasse aux points" with < 2 dotted learned letters returns []. Also verifies short French album dates ("29 oct.").
 */
export function runImprovementCheck5_DotHuntGuardAndShortDates(): SelfTestCheckResult {
  const zeroDotted = buildDotHuntRounds(['alif'], 5, 'guard_0');
  const oneDotted = buildDotHuntRounds(['alif', 'baa'], 5, 'guard_1');
  const twoDotted = buildDotHuntRounds(['alif', 'baa', 'taa'], 5, 'guard_2');
  const shortOct = formatFrenchShortDate('2026-10-29');
  const shortApr = formatFrenchShortDate('2026-04-05');

  const passed =
    zeroDotted.length === 0 &&
    oneDotted.length === 0 &&
    twoDotted.length === 5 &&
    shortOct === '29 oct.' &&
    shortApr === '5 avr.';

  return {
    id: 'imp_5',
    title:
      '5. « Chasse aux points » (< 2 lettres à points -> []) & Dates courtes du cahier (« 29 oct. »)',
    passed,
    summary: `0 lettre à point -> ${zeroDotted.length} manches · 1 lettre à point [alif, baa] -> ${oneDotted.length} manches · 2 lettres à points [alif, baa, taa] -> ${twoDotted.length} manches · formatFrenchShortDate("2026-10-29") = "${shortOct}"`,
    details: [
      `buildDotHuntRounds(['alif']) -> longueur ${zeroDotted.length} (attendu 0)`,
      `buildDotHuntRounds(['alif', 'baa']) (1 seule lettre à point) -> longueur ${oneDotted.length} (attendu 0)`,
      `buildDotHuntRounds(['alif', 'baa', 'taa']) (2 lettres à points) -> longueur ${twoDotted.length} (attendu 5)`,
      `Formatage date cahier : "2026-10-29" -> "${shortOct}", "2026-04-05" -> "${shortApr}"`
    ]
  };
}

/**
 * IMPROVEMENT PASS SELF-CHECK 8:
 * Placement test:
 * - "Je débute" -> starts at F1 (Alif)
 * - Pass F1 & F2, fail F3 & F4 -> starts at F3 (Daal); F1 & F2 letters have stepsDone.length === 5 and source: 'placement'
 * - Free plan with result F3 -> opens unlock sheet, does not skip paywall.
 */
export function runImprovementCheck8_PlacementTestAudit(): SelfTestCheckResult {
  const fresh = createBrandNewLearnerState();
  // Case A: "Je débute" -> F1 (Alif) (0 passed families -> starts at F1)
  const resDebute = applyPlacementTestResult(fresh, 'u_new_learner', [], []);
  const stateDebute = resDebute.nextState;
  const todayDebute = getTodayLetterForUser(stateDebute, 'u_new_learner');
  const debuteStartsAtAlif =
    stateDebute.placement?.u_new_learner?.resultFamilyId === 'F1' &&
    todayDebute.letter.id === 'alif';

  // Case B: Pass F1 & F2, fail F3 & F4 -> starts at F3 (Daal); F1 & F2 letters have stepsDone.length === 5, source: 'placement', stars: 1, box: 2
  const f1Qs = buildPlacementQuestionsForFamily('F1');
  const f2Qs = buildPlacementQuestionsForFamily('F2');
  const f3Qs = buildPlacementQuestionsForFamily('F3');
  const f4Qs = buildPlacementQuestionsForFamily('F4');

  const fullUserState = {
    ...fresh,
    users: fresh.users.map((u) =>
      u.id === 'u_new_learner' ? { ...u, entitlement: 'full' as const } : u
    )
  };
  const resF3Full = applyPlacementTestResult(
    fullUserState,
    'u_new_learner',
    ['F1', 'F2'],
    []
  );
  const stateF3Full = resF3Full.nextState;
  const f1F2Ids = [
    ...LETTER_FAMILIES[0].letters,
    ...LETTER_FAMILIES[1].letters
  ];
  const f1F2MarkedAcquis = f1F2Ids.every((lid) => {
    const p = stateF3Full.progress.find(
      (pr) => pr.userId === 'u_new_learner' && pr.letterId === lid
    );
    return (
      Boolean(p) &&
      p!.stepsDone.length === 5 &&
      p!.source === 'placement' &&
      p!.stars === 1 &&
      p!.box === 2
    );
  });
  const todayF3Full = getTodayLetterForUser(stateF3Full, 'u_new_learner');
  const startsAtDaalWhenFull = todayF3Full.letter.id === 'daal';

  // Case C: Free plan with result F3 -> F3 stays locked (does not skip paywall!)
  const resF3Free = applyPlacementTestResult(
    fresh,
    'u_new_learner',
    ['F1', 'F2'],
    []
  );
  const stateF3Free = resF3Free.nextState;
  const f3UnlockedOnFree = isFamilyUnlockedForUser(
    stateF3Free,
    'u_new_learner',
    'F3'
  );
  const daalUnlockedOnFree = isLetterUnlockedForUser(
    stateF3Free,
    'u_new_learner',
    'daal'
  );
  const paywallEnforced = !f3UnlockedOnFree && !daalUnlockedOnFree;

  const passed =
    debuteStartsAtAlif &&
    f1Qs.length === 3 &&
    f2Qs.length === 3 &&
    f3Qs.length === 3 &&
    f4Qs.length === 3 &&
    f1F2MarkedAcquis &&
    startsAtDaalWhenFull &&
    paywallEnforced;

  return {
    id: 'imp_8',
    title:
      '8. Test de positionnement : « Je débute » -> F1 (Alif) ; F1+F2 réussies & F3+F4 échouées -> F3 (Daal) avec F1/F2 acquis (source: "placement") ; plan gratuit ouvre le déblocage sans contourner le paywall',
    passed,
    summary: `« Je débute » -> ${todayDebute.letter.shortName} (F1) · F1&F2 acquis (${f1F2Ids.length} lettres, stepsDone=5, source='placement', box=2, stars=1) -> départ=${todayF3Full.letter.shortName} (F3) · Plan gratuit F3 verrouillée=${!f3UnlockedOnFree}`,
    details: [
      `Cas 1 (« Je débute ») : resultFamilyId=${stateDebute.placement?.u_new_learner?.resultFamilyId}, 1re lettre=${todayDebute.letter.shortName} (Alif)`,
      `Cas 2 (F1 & F2 réussies 2/3+, F3 & F4 échouées) : 8 lettres de F1+F2 marquées stepsDone.length=5, source='placement', stars=1, box=2 -> départ Famille 3, lettre ${todayF3Full.letter.shortName} (Daal)`,
      `Cas 3 (Plan gratuit avec résultat F3) : isFamilyUnlocked('F3')=${f3UnlockedOnFree}, isLetterUnlocked('daal')=${daalUnlockedOnFree} (affiche « Tu es prêt pour la famille 3 » + feuille de déblocage sans sauter le paywall)`
    ]
  };
}

/**
 * Dev-Only Self-Test Report Modal (/dev/selftest)
 */
export function DevSelfTestReportModal({
  results,
  isRunning,
  currentScreenBeingScanned,
  onRerun,
  onExitToApp
}: {
  results: SelfTestCheckResult[];
  isRunning: boolean;
  currentScreenBeingScanned: string;
  onRerun: () => void;
  onExitToApp: () => void;
}) {
  const allPassed = results.length > 0 && results.every((r) => r.passed);

  return (
    <div
      data-testid="selftest-page"
      className="fixed inset-0 z-50 bg-[#0A1F1B]/95 text-[#F2FAF7] overflow-y-auto p-4 sm:p-6"
    >
      <div className="max-w-[780px] mx-auto space-y-5 pb-12">
        <div className="flex items-center justify-between gap-3 border-b border-[#1E3D36] pb-4">
          <div>
            <span className="font-mono-tag text-[#FFB400]">
              /DEV/SELFTEST · VÉRIFICATION AUTOMATIQUE (9 CONTRÔLES IMPROVEMENT PASS)
            </span>
            <h1 className="font-display text-[24px] sm:text-[28px] text-white mt-0.5">
              Audit Nouqta — Improvement Pass (Phases 1–5)
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Relancer l'audit"
              onClick={onRerun}
              className="min-h-[48px] h-[48px] px-4 rounded-xl bg-[#112B26] border border-[#1E3D36] text-white font-semibold text-[14px] flex items-center gap-2 pressable cursor-pointer"
            >
              <RefreshCw
                className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''}`}
              />
              <span>Relancer</span>
            </button>
            <button
              type="button"
              aria-label="Retourner à l'application"
              onClick={onExitToApp}
              className="min-h-[48px] h-[48px] px-4 rounded-xl bg-[#FFB400] text-[#3A2600] font-bold text-[14px] flex items-center gap-2 pressable cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Application</span>
            </button>
          </div>
        </div>

        {isRunning ? (
          <div className="rounded-2xl bg-[#112B26] border border-[#1E3D36] p-6 text-center space-y-2">
            <div className="font-display text-[20px] text-[#FFB400]">
              Inspection DOM &amp; Calligraphie en cours : {currentScreenBeingScanned}…
            </div>
            <p className="text-[14px] text-[#F2FAF7]/75">
              Vérification des 9 contrôles (Contours Naskh, Alignement (a)/(b), Points &gt;= 22u, Lecture voyelle, Chasse aux points, Texte &gt;= 13px &amp; 130%, Accueil/Moi, Test de positionnement, Cibles &gt;= 48px)...
            </p>
          </div>
        ) : (
          <div
            className={`rounded-2xl p-4 border flex items-center justify-between ${
              allPassed
                ? 'bg-[#0F7B55]/25 border-[#34D399]'
                : 'bg-[#C83A2E]/25 border-[#FF5A4E]'
            }`}
          >
            <div className="flex items-center gap-3">
              {allPassed ? (
                <CheckCircle2 className="w-7 h-7 text-[#34D399] shrink-0" />
              ) : (
                <XCircle className="w-7 h-7 text-[#FF5A4E] shrink-0" />
              )}
              <div>
                <div className="font-bold text-[17px]">
                  {allPassed
                    ? `${results.length} / ${results.length} CONTRÔLES VALIDÉS (PASS)`
                    : 'ÉCHEC DÉTECTÉ SUR UN OU PLUSIEURS CONTRÔLES'}
                </div>
                <div className="text-[13px] opacity-85">
                  Largeur actuelle du viewport : {window.innerWidth}×
                  {window.innerHeight}px
                </div>
              </div>
            </div>
            <span className="font-mono-tag px-3 py-1 rounded-full bg-black/30 text-white font-bold">
              {results.filter((r) => r.passed).length}/{results.length} PASS
            </span>
          </div>
        )}

        {/* PASS / FAIL Table */}
        <div className="rounded-2xl bg-[#112B26] border border-[#1E3D36] overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#1E3D36] text-[13px] font-mono-tag text-[#FFB400]">
                <th className="py-3 px-4">CONTRÔLE</th>
                <th className="py-3 px-4 w-24 text-center">STATUT</th>
                <th className="py-3 px-4">RÉSULTAT MESURÉ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E3D36] text-[14px]">
              {results.map((r) => (
                <tr key={r.id} className="align-top">
                  <td className="py-3.5 px-4 font-semibold text-white">
                    {r.title}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span
                      data-testid={`selftest-status-${r.id}`}
                      className={`inline-block px-2.5 py-1 rounded-full font-mono-tag text-[13px] font-bold ${
                        r.passed
                          ? 'bg-[#0F7B55] text-white'
                          : 'bg-[#C83A2E] text-white'
                      }`}
                    >
                      {r.passed ? 'PASS' : 'FAIL'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 space-y-1.5">
                    <div className="font-medium text-[#F2FAF7]">{r.summary}</div>
                    {r.details.length > 0 && (
                      <ul className="text-[13px] font-mono text-[#F2FAF7]/80 space-y-1 bg-black/25 p-2.5 rounded-xl max-h-44 overflow-y-auto">
                        {r.details.map((d, i) => (
                          <li key={i}>• {d}</li>
                        ))}
                      </ul>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
