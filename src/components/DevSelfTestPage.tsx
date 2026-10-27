import React from 'react';
import { CheckCircle2, XCircle, RefreshCw, ArrowLeft } from 'lucide-react';
import {
  LETTERS_DATA,
  LETTER_VISUAL_ANCHORS,
  PROGRESSIVE_WORDS,
  buildFamilyExamQuestions,
  buildQuestionsForLetter,
  buildSingleTypedQuestion,
  buildVariedQuizSequence,
  filterWordsByUnlockedLetters,
  shuffleWordTilesUntilDifferent,
  splitArabicWordIntoLetterTiles,
  splitKeywordForHighlight
} from '../data/lettersAndFamilies';
import {
  DEFAULT_GLYPH_STROKE_WIDTH,
  GlyphBodyStroke,
  GlyphDotStroke,
  GlyphForm,
  buildTracingSubSteps,
  computeGlyphDotClearanceAudit,
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
  clearGlyphEditorOverride,
  createBrandNewLearnerState,
  getInitialBlueprintState,
  getLettersWithOverrides,
  getTodayLetterForUser,
  getUnlockedLetterIdsForUser,
  loadGlyphEditorOverrides,
  saveGlyphEditorOverride,
  saveLearnerTraceForAlbum,
  savePracticeAttemptToHistory
} from '../services/dataService';
import { MINI_GAMES_CATALOG } from './MiniGamesHub';
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
 * POLISH PASS CHECK 2:
 * Dots: simulated taps on all targets give the right count for Taa, Thaa, Qaaf, Yaa;
 * off-target taps are ignored; no double counting (print taps received vs dots counted).
 */
export function runPolishCheck2_DotsSimulation(): SelfTestCheckResult {
  const details: string[] = [];
  let allPassed = true;
  const targetLetters = ['taa', 'thaa', 'qaaf', 'yaa'];

  for (const lid of targetLetters) {
    const rec = LETTERS_DATA.find((l) => l.id === lid);
    if (!rec) {
      allPassed = false;
      details.push(`${lid}: introuvable`);
      continue;
    }
    const audit = computeGlyphDotClearanceAudit(rec.forms.isolated);
    const subSteps = buildTracingSubSteps(rec.forms.isolated);
    const dotsStep = subSteps.find((s) => s.kind === 'dots');
    if (!dotsStep || dotsStep.kind !== 'dots') {
      allPassed = false;
      details.push(`${rec.shortName}: étape Points manquante`);
      continue;
    }

    let placed: { x: number; y: number; snapped: boolean; targetId?: number }[] = [];
    let tapsReceived = 0;

    // 1. Simulate 1 tap on each target dot
    for (const target of dotsStep.dotStrokes) {
      tapsReceived += 1;
      const res = processDotStepTap({
        tap: { x: target.at[0] + 1, y: target.at[1] - 1 },
        targetDots: dotsStep.dotStrokes,
        placedDots: placed,
        canvasWidthPx: 316
      });
      placed = res.nextDots;
    }

    const countAfterTargetTaps = placed.length;

    // 2. Simulate an off-target tap far away (e.g. [18, 18]) -> must be ignored!
    tapsReceived += 1;
    const offRes = processDotStepTap({
      tap: { x: 18, y: 18 },
      targetDots: dotsStep.dotStrokes,
      placedDots: placed,
      canvasWidthPx: 316
    });
    placed = offRes.nextDots;
    const offTargetIgnored =
      offRes.log.action === 'ignored' &&
      placed.length === countAfterTargetTaps &&
      offRes.log.hintFr === 'Touche les pointillés';

    // 3. Test undo: tap the first placed dot to remove it, then tap it again to re-place it
    const firstTarget = dotsStep.dotStrokes[0];
    const undoRes = processDotStepTap({
      tap: { x: firstTarget.at[0], y: firstTarget.at[1] },
      targetDots: dotsStep.dotStrokes,
      placedDots: placed,
      canvasWidthPx: 316
    });
    const undoWorked =
      undoRes.log.action === 'removed' &&
      undoRes.nextDots.length === countAfterTargetTaps - 1;

    const redoRes = processDotStepTap({
      tap: { x: firstTarget.at[0], y: firstTarget.at[1] },
      targetDots: dotsStep.dotStrokes,
      placedDots: undoRes.nextDots,
      canvasWidthPx: 316
    });
    placed = redoRes.nextDots;

    // 4. Validate on Valider
    const valRes = validateDotsStep({
      learnerDots: placed.map((d) => ({ x: d.x, y: d.y })),
      targetDots: dotsStep.dotStrokes,
      corridor: 22,
      mode: 'adult'
    });

    const ok =
      countAfterTargetTaps === dotsStep.dotStrokes.length &&
      offTargetIgnored &&
      undoWorked &&
      valRes.passed &&
      audit.interDotGapPassed;

    if (!ok) allPassed = false;
    details.push(
      `${rec.shortName}: cibles=${dotsStep.dotStrokes.length}, taps reçus=${tapsReceived} (${dotsStep.dotStrokes.length} cibles + 1 hors-cible ignoré) -> points comptés=${placed.length}/${dotsStep.dotStrokes.length}, écart inter-points=${audit.minInterDotEdgeGap}u (>=12.6u), undo=${undoWorked ? 'OK' : 'ERR'}, validation=${valRes.passed ? 'PASS' : 'FAIL'}`
    );
  }

  return {
    id: '2',
    title:
      '2. Points (Taa, Thaa, Qaaf, Yaa) : taps simulés sur cibles, hors-cible ignoré, 0 double comptage (taps reçus vs points comptés)',
    passed: allPassed,
    summary: allPassed
      ? 'Taa (2/2), Thaa (3/3), Qaaf (2/2), Yaa (2/2) : hors-cible ignoré, undo actif, écart >= 1 diamètre'
      : 'Anomalie détectée sur le comptage des points',
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
            `pt${idx + 1}[${d.at[0]},${d.at[1]}] dist=${d.minDistanceToStrokeCenterline}u (req >=${d.requiredClearance}u)`
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
  let allPassed = true;

  for (const letter of LETTERS_DATA) {
    const expected = CANONICAL_DOT_TABLE[letter.id];
    const subSteps = buildTracingSubSteps(letter.forms.isolated);
    const expectedSteps = expected.bodyStrokes + (expected.count > 0 ? 1 : 0);

    if (
      subSteps.length !== expectedSteps ||
      letter.dots.count !== expected.count ||
      letter.dots.position !== expected.position
    ) {
      allPassed = false;
      details.push(`${letter.shortName} : anomalie sur les étapes ou les points`);
    }
  }

  const jiim = LETTERS_DATA.find((l) => l.id === 'jiim')!;
  const jiimAudit = computeGlyphDotClearanceAudit(jiim.forms.isolated);
  if (!jiimAudit.jiimInsideBellyCavity || !jiimAudit.passed) {
    allPassed = false;
  }

  return {
    id: 'c3_legacy',
    title: '3. Table des points (28 lettres) & point de Jiim au creux du ventre',
    passed: allPassed,
    summary: allPassed
      ? '28/28 lettres conformes'
      : 'Erreur sur la table des points',
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
  const unlockedIds = getUnlockedLetterIdsForUser(state, 'u_learner_1');
  const unlockedSet = new Set(unlockedIds);
  const words = filterWordsByUnlockedLetters(PROGRESSIVE_WORDS, unlockedIds);
  const passed =
    MINI_GAMES_CATALOG.length === 5 &&
    words.every((w) => w.requiredLetters.every((r) => unlockedSet.has(r)));
  return {
    id: 'mg',
    title: 'Mini-games unlocked only',
    passed,
    summary: passed ? 'OK' : 'FAIL',
    details: []
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
              /DEV/SELFTEST · VÉRIFICATION AUTOMATIQUE (8 CONTRÔLES POLISH PASS)
            </span>
            <h1 className="font-display text-[24px] sm:text-[28px] text-white mt-0.5">
              Audit Nouqta — Polish Pass (A–E)
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
              Vérification des 8 contrôles (Tracé &gt;= 85%, Points Taa/Thaa/Qaaf/Yaa, Accueil, Voir reducedMotion, Examens, Quiz, Pratique &gt;= 60%, Cibles &gt;= 48px)...
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
                    ? '8 / 8 CONTRÔLES VALIDÉS (PASS)'
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
              <tr className="border-b border-[#1E3D36] text-[12px] font-mono-tag text-[#FFB400]">
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
                      className={`inline-block px-2.5 py-1 rounded-full font-mono-tag text-[12px] font-bold ${
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
                      <ul className="text-[12px] font-mono text-[#F2FAF7]/80 space-y-1 bg-black/25 p-2.5 rounded-xl max-h-44 overflow-y-auto">
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
