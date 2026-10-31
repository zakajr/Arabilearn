import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildTracingSubSteps,
  computeGlyphDotClearanceAudit,
  computeGlyphFinalAntParkingSpot,
  computeReedPenWidth,
  evaluateGlyphAnimationAtProgress,
  sampleSvgPathEqualLength,
  simplifyPointsRDP,
  validateDotsStep,
  validateGlyphTrace,
} from '../lib/strokeMath';
import {
  LETTERS_DATA,
  LETTER_FAMILIES,
  PROGRESSIVE_WORDS,
  READING_LADDER_DATA,
  buildFamilyExamQuestions,
  buildQuestionsForLetter,
  buildVariedQuizSequence,
  filterWordsByUnlockedLetters,
  getPositionalFormsForLetter,
  shuffleWordTilesUntilDifferent,
  splitArabicWordIntoLetterTiles,
  splitKeywordForHighlight,
} from '../data/lettersAndFamilies';
import {
  advanceReviewBox,
  createBrandNewLearnerState,
  getInitialBlueprintState,
  getLearnedLetterIdsForUser,
  getTodayLetterForUser,
  getUnlockedLetterIdsForUser,
  isFamilyUnlockedForUser,
  isLetterUnlockedForUser,
  markDailyMissionDone,
  markStepCompleted,
  redeemActivationCode,
  saveLearnerTraceForAlbum,
  savePracticeAttemptToHistory,
} from './dataService';
import {
  runCheck1_AnimationVoir,
  runCheck2_DotClearanceAll28,
  runCheck2_WordBuilderTileCount,
  runCheck3_TracingStepsDiffer,
  runCheck4_StepperBrandNewUser,
  runCheck5_NoDuplicateStepLabelsAndStrokeWidth,
  runCheck6_AntTangentAndWalkCycle,
  runCheck7_EditorJiimPersistence,
  runCheck8_Games20QuestionsNoRepeatAndOffline,
  runCheck8_All5MiniGamesUnlockedOnly,
  runCheck10_TeacherLoop,
  runCheckB_All28Letters,
  runCheckC_TracingValidation,
  runCheckH_ContrastAudit,
  runCheckI_AlbumRdpAudit,
  runCheckK_ShareCardAudit,
  runCheckL_HapticsAndSoundDisabledAudit,
  runFix1_UnlockAndLearnedLettersAudit,
  runFix2_ChasseAuxPointsDotlessAudit,
  runFixE_AntFinalPositionAll28Letters,
  runPolishCheck2_DotsSimulation,
  runPolishCheck5_ExamsProgressiveRule,
  runPolishCheck6_QuizOptionsPictureArabicFrench,
  runPolishCheck7_PracticeScores3Attempts,
  runImprovementCheck1_FontOutlinesAndDots,
  runImprovementCheck2_AlignmentAll28Letters,
  runImprovementCheck3_DotSizeAndClearance28,
  runImprovementCheck4_VowelQuiz20Questions,
  runImprovementCheck5_DotHuntGuardAndShortDates,
  runImprovementCheck8_PlacementTestAudit,
} from '../components/DevSelfTestPage';
import {
  buildAntStreamRounds,
  buildAssembleMiniGameRounds,
  buildDotHuntRounds,
  buildMemoryDeck,
  buildMysteryLetterRounds,
  getDotHuntPromptForLetter,
} from '../components/MiniGamesHub';
import { t } from '../data/copyDeck';

describe('Nouqta Code Fixes (1–6), Calligraphy Engine & Polish Pass — Unit Tests', () => {
  it('FIX 1: Plan decides ACCESS, progress decides ORDER (full vs free, family N unlocks only when N-1 is finished or exam passed)', () => {
    const baseState = getInitialBlueprintState();

    // 1. Learner with plan 'full', progress only on Alif (5 steps):
    //    unlocked = {Alif, Baa}; Jiim, Daal, Siin, Faa, Miim are NOT unlocked.
    const fullAlifOnly = {
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
          stars: 3 as const,
        },
      ],
      passedFamilyExams: { u_learner_1: [] },
    };

    const unlocked1 = getUnlockedLetterIdsForUser(fullAlifOnly, 'u_learner_1');
    assert.deepEqual(unlocked1, ['alif', 'baa']);
    for (const famHead of ['jiim', 'daal', 'siin', 'faa', 'miim']) {
      assert.equal(
        isLetterUnlockedForUser(fullAlifOnly, 'u_learner_1', famHead),
        false,
        `${famHead} must NOT be unlocked when only Alif is finished`
      );
    }
    assert.equal(isFamilyUnlockedForUser(fullAlifOnly, 'u_learner_1', 'F1'), true);
    assert.equal(isFamilyUnlockedForUser(fullAlifOnly, 'u_learner_1', 'F2'), false);
    assert.equal(isFamilyUnlockedForUser(fullAlifOnly, 'u_learner_1', 'F3'), false);

    // 2. Finish F1 completely: Jiim becomes unlocked, Haa (haa_soft) does not.
    const f1AllDone = {
      ...fullAlifOnly,
      progress: ['alif', 'baa', 'taa', 'thaa'].map((lid) => ({
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
        stars: 3 as const,
      })),
    };
    assert.equal(isFamilyUnlockedForUser(f1AllDone, 'u_learner_1', 'F2'), true);
    assert.equal(isFamilyUnlockedForUser(f1AllDone, 'u_learner_1', 'F3'), false);
    assert.equal(isLetterUnlockedForUser(f1AllDone, 'u_learner_1', 'jiim'), true);
    assert.equal(
      isLetterUnlockedForUser(f1AllDone, 'u_learner_1', 'haa_soft'),
      false
    );

    // 3. Plan 'free': nothing beyond F1 (even when F1 is finished).
    const freeF1Done = {
      ...f1AllDone,
      users: f1AllDone.users.map((u) =>
        u.id === 'u_learner_1' ? { ...u, entitlement: 'free' as const } : u
      ),
    };
    assert.equal(isFamilyUnlockedForUser(freeF1Done, 'u_learner_1', 'F2'), false);
    assert.equal(isLetterUnlockedForUser(freeF1Done, 'u_learner_1', 'jiim'), false);
    assert.deepEqual(getUnlockedLetterIdsForUser(freeF1Done, 'u_learner_1'), [
      'alif',
      'baa',
      'taa',
      'thaa',
    ]);
  });

  it('FIX 1b: getLearnedLetterIdsForUser & 100 questions per game with 3 learned letters have 0 leaks', () => {
    const fix1Audit = runFix1_UnlockAndLearnedLettersAudit();
    assert.equal(fix1Audit.passed, true, fix1Audit.details.join(' | '));

    const learned3 = ['alif', 'baa', 'taa'];
    const learned3Set = new Set(learned3);
    let leaks = 0;

    // 100 questions/rounds per game across all 5 mini-games + quizzes + exams + lecture word filter
    for (let s = 0; s < 100; s++) {
      const deck = buildMemoryDeck(learned3, `mem_100_${s}`);
      for (const c of deck) {
        if (!learned3Set.has(c.letterId)) leaks++;
      }
    }
    for (const r of buildDotHuntRounds(learned3, 100, 'dh_100')) {
      if (!learned3Set.has(r.letter.id)) leaks++;
    }
    for (const r of buildAntStreamRounds(learned3, 100, 'str_100')) {
      if (!learned3Set.has(r.targetLetter.id)) leaks++;
      for (const st of r.stones) {
        if (!learned3Set.has(st.id)) leaks++;
      }
    }
    for (const r of buildAssembleMiniGameRounds(
      learned3,
      PROGRESSIVE_WORDS,
      100,
      'asm_100'
    )) {
      for (const lid of r.targetLetterIds) {
        if (!learned3Set.has(lid)) leaks++;
      }
      for (const tile of r.scrambledTiles) {
        if (!learned3Set.has(tile.letterId)) leaks++;
      }
    }
    for (const r of buildMysteryLetterRounds(learned3, 100, 'mys_100')) {
      if (!learned3Set.has(r.targetLetter.id)) leaks++;
      for (const opt of r.options) {
        if (!learned3Set.has(opt.id)) leaks++;
      }
    }

    const learnedPool = LETTERS_DATA.filter((l) => learned3Set.has(l.id));
    for (const l of learnedPool) {
      const qs = buildQuestionsForLetter(l, learnedPool, 3);
      for (const q of qs) {
        if (q.letterId && !learned3Set.has(q.letterId)) leaks++;
      }
    }
    const examQs = buildFamilyExamQuestions('F1', 3, learned3);
    for (const q of examQs) {
      if (q.letterId && !learned3Set.has(q.letterId)) leaks++;
    }
    const words = filterWordsByUnlockedLetters(PROGRESSIVE_WORDS, learned3);
    for (const w of words) {
      if (!w.requiredLetters.every((r) => learned3Set.has(r))) leaks++;
    }

    assert.equal(leaks, 0, `Expected 0 leaks, got ${leaks}`);
  });

  it('FIX D: Chasse aux points uses ONLY learned letters with dots (never a dotless letter across 50 generated rounds), 1 correct card in rounds 1-3, and Place les points in rounds 4-5', () => {
    const fix2Audit = runFix2_ChasseAuxPointsDotlessAudit();
    assert.equal(fix2Audit.passed, true, fix2Audit.details.join(' | '));

    const dotted = LETTERS_DATA.filter((l) => l.dots.count > 0);
    assert.equal(dotted.length, 15);
    for (const l of dotted) {
      const infoChoose = getDotHuntPromptForLetter(l, 0);
      assert.equal(infoChoose.promptFr, `Où sont les points de « ${l.shortName} » ?`);
      assert.equal(infoChoose.showDragToken, false);
      const infoPlace = getDotHuntPromptForLetter(l, 3);
      assert.equal(infoPlace.promptFr, `Place les points de « ${l.shortName} »`);
    }

    // 50 generated rounds across 10 seeds
    const allLetterIds = LETTERS_DATA.map((l) => l.id);
    for (let s = 0; s < 10; s++) {
      const rounds = buildDotHuntRounds(allLetterIds, 5, String(500 + s * 17));
      assert.equal(rounds.length, 5);
      rounds.forEach((r, idx) => {
        assert.ok(r.letter.dots.count > 0, `Round ${idx} must have dots > 0`);
        if (idx < 3) {
          assert.equal(r.roundKind, 'choose_card');
          assert.equal(r.options.length, 3);
          const correctCards = r.options.filter((o) => o.isCorrect);
          assert.equal(correctCards.length, 1);
          for (const d of r.options.filter((o) => !o.isCorrect)) {
            const sameAsCorrect =
              d.dotsCount === r.letter.dots.count &&
              (d.dotsCount === 0 || d.dotsPosition === r.letter.dots.position);
            assert.equal(sameAsCorrect, false, 'Distractor must never equal correct config');
          }
        } else {
          assert.equal(r.roundKind, 'place_dots');
        }
      });
    }
  });

  it('FIX B & FIX E: Each dot is its own step (Alif=1, Baa=2, Taa=3, Thaa=4, Qaaf=3, Yaa=3, Kaaf=2) and Ant final position has clearance >= 18u on baseline for all 28 letters', () => {
    const expectedSteps: Record<string, number> = {
      alif: 1,
      baa: 2,
      taa: 3,
      thaa: 4,
      qaaf: 3,
      yaa: 3,
      kaaf: 2,
    };
    for (const [id, count] of Object.entries(expectedSteps)) {
      const l = LETTERS_DATA.find((x) => x.id === id)!;
      const steps = buildTracingSubSteps(l.forms.isolated);
      assert.equal(steps.length, count, `${l.shortName} should have ${count} steps`);
    }

    const fixEAudit = runFixE_AntFinalPositionAll28Letters();
    assert.equal(fixEAudit.passed, true, fixEAudit.details.join(' | '));
    for (const l of LETTERS_DATA) {
      const spot = computeGlyphFinalAntParkingSpot(l.forms.isolated);
      assert.equal(spot.y, l.forms.isolated.baseline);
      assert.equal(spot.isOutsideLetter, true);
      assert.ok(spot.minClearance >= 18, `${l.shortName} clearance ${spot.minClearance} < 18`);
    }
  });

  it('Improvement Pass Phase 1–5: All 28 letters have status "aligne" & renderMode "font", and Checks 1..8 pass', () => {
    for (const letter of LETTERS_DATA) {
      assert.equal(
        letter.forms.isolated.status,
        'aligne',
        `${letter.shortName} (${letter.id}) must have status: 'aligne'`
      );
      assert.equal(
        letter.forms.isolated.renderMode,
        'font',
        `${letter.shortName} (${letter.id}) must have renderMode: 'font'`
      );
    }

    const imp1 = runImprovementCheck1_FontOutlinesAndDots();
    assert.equal(imp1.passed, true, imp1.details.join(' | '));

    const imp2 = runImprovementCheck2_AlignmentAll28Letters();
    assert.equal(imp2.passed, true, imp2.details.join(' | '));

    const imp3 = runImprovementCheck3_DotSizeAndClearance28();
    assert.equal(imp3.passed, true, imp3.details.join(' | '));

    const imp4 = runImprovementCheck4_VowelQuiz20Questions();
    assert.equal(imp4.passed, true, imp4.details.join(' | '));

    const imp5 = runImprovementCheck5_DotHuntGuardAndShortDates();
    assert.equal(imp5.passed, true, imp5.details.join(' | '));

    const imp8 = runImprovementCheck8_PlacementTestAudit();
    assert.equal(imp8.passed, true, imp8.details.join(' | '));
  });

  it('Check 1 (Phase A/D.1): Animation progress at 0 / 500 / 1500 ms / end for Baa, Taa, Jiim, Kaaf, Alif (5 replays + reducedMotion)', () => {
    const c1 = runCheck1_AnimationVoir();
    assert.equal(c1.passed, true, c1.details.join(' | '));
  });

  it('Polish Pass Check 2 (Phase B): Dots simulation for Taa, Thaa, Qaaf, Yaa (taps received vs dots counted, off-target ignored, undo)', () => {
    const p2 = runPolishCheck2_DotsSimulation();
    assert.equal(p2.passed, true, p2.details.join(' | '));
  });

  it('Polish Pass Check 5 (Phase E.1/E.2): Exams with 3 letters unlocked never mention a locked letter; final exam locked until 28 letters', () => {
    const p5 = runPolishCheck5_ExamsProgressiveRule();
    assert.equal(p5.passed, true, p5.details.join(' | '));
  });

  it('Polish Pass Check 6 (Phase E.3): Quiz options show picture + Arabic + French, and speaker mode for Q2', () => {
    const p6 = runPolishCheck6_QuizOptionsPictureArabicFrench();
    assert.equal(p6.passed, true, p6.details.join(' | '));
  });

  it('Polish Pass Check 7 (Phase E.4): Practice scores print real coverage/outside values for 3 attempts and only save at >= 60%', () => {
    const p7 = runPolishCheck7_PracticeScores3Attempts();
    assert.equal(p7.passed, true, p7.details.join(' | '));
  });

  it('Check 2 (Phase C): Dot clearance for all 28 letters (>= strokeWidth/2 + dotHalfDiag + 6 = 20.25u)', () => {
    const c2 = runCheck2_DotClearanceAll28();
    assert.equal(c2.passed, true, c2.details.join(' | '));

    for (const letter of LETTERS_DATA) {
      const audit = computeGlyphDotClearanceAudit(letter.forms.isolated);
      assert.equal(audit.passed, true, `${letter.shortName} clearance failed`);
    }
  });

  it('Check 3 (Phase C): Dot count/position matches table; Jiim dot is inside the cavity', () => {
    const c3 = runCheck3_TracingStepsDiffer();
    assert.equal(c3.passed, true, c3.details.join(' | '));
    const checkB = runCheckB_All28Letters();
    assert.equal(checkB.passed, true, checkB.details.join(' | '));
    assert.equal(LETTERS_DATA.length, 28);
    assert.equal(LETTER_FAMILIES.length, 7);

    const jiim = LETTERS_DATA.find((l) => l.id === 'jiim')!;
    const jiimAudit = computeGlyphDotClearanceAudit(jiim.forms.isolated);
    assert.equal(jiimAudit.jiimInsideBellyCavity, true);
    assert.ok(
      jiimAudit.dots[0].minDistanceToStrokeCenterline >=
        jiimAudit.requiredClearance
    );
  });

  it('Check 4 (Phase B.3): Step bar shows checks only for completed steps (brand new user test)', () => {
    const c4 = runCheck4_StepperBrandNewUser(0);
    assert.equal(c4.passed, true, c4.details.join(' | '));

    const fresh = createBrandNewLearnerState();
    const todayInfo = getTodayLetterForUser(fresh, 'u_new_learner');
    assert.deepEqual(todayInfo.progress.stepsDone, []);
  });

  it('Check 5 (Phase B.1 & B.2): No duplicate step labels; stroke width within 7–9% of glyph height (15/200 = 7.5%)', () => {
    const c5 = runCheck5_NoDuplicateStepLabelsAndStrokeWidth(false);
    assert.equal(c5.passed, true, c5.details.join(' | '));
  });

  it('Check 6 (Phase D): Ant rotates with the tangent (logged at 3 points) and walk cycle runs only while moving', () => {
    const c6 = runCheck6_AntTangentAndWalkCycle();
    assert.equal(c6.passed, true, c6.details.join(' | '));

    const jiimSpec = LETTERS_DATA.find((l) => l.id === 'jiim')!.forms.isolated;
    const p0 = evaluateGlyphAnimationAtProgress(jiimSpec, 0);
    const pMid = evaluateGlyphAnimationAtProgress(jiimSpec, 0.28);
    const pEnd = evaluateGlyphAnimationAtProgress(jiimSpec, 1);
    assert.equal(p0.ant.isMoving, false);
    assert.equal(pMid.ant.isMoving, true);
    assert.equal(pEnd.ant.isMoving, false);
  });

  it('Check 7 (Phase E): Editor changes a Jiim dot, saves, reloads, persists, and animation uses it', () => {
    const c7 = runCheck7_EditorJiimPersistence();
    assert.equal(c7.passed, true, c7.details.join(' | '));
  });

  it('Check 8 (Phase F): 20 consecutive generated questions have no repeats and varied types/positions; works offline', () => {
    const c8 = runCheck8_Games20QuestionsNoRepeatAndOffline();
    assert.equal(c8.passed, true, c8.details.join(' | '));

    const q20 = buildVariedQuizSequence(LETTERS_DATA, 20, 4, {
      seed: '2026-04-01_test',
      mistakeCountsByLetter: { baa: 5, jiim: 4 },
    });
    assert.equal(q20.length, 20);
    const sigs = new Set(q20.map((q) => `${q.type}_${q.letterId}`));
    assert.equal(sigs.size, 20);
  });

  it('Legacy & Regression Checks: Word builder tiles, visual anchors, practice history, teacher loop, tracing validation', () => {
    assert.equal(runCheck2_WordBuilderTileCount().passed, true);
    assert.equal(splitArabicWordIntoLetterTiles('أَب').length, 2);
    assert.equal(splitArabicWordIntoLetterTiles('بَاب').length, 3);
    assert.equal(splitArabicWordIntoLetterTiles('كِتَاب').length, 4);
    assert.equal(splitArabicWordIntoLetterTiles('مِفْتَاح').length, 5);
    assert.equal(splitArabicWordIntoLetterTiles('لَا').length, 2);

    const threeTiles = splitArabicWordIntoLetterTiles('بَاب');
    const shuffled = shuffleWordTilesUntilDifferent(threeTiles, 1);
    assert.notEqual(
      shuffled.map((x) => `${x.index}_${x.letterId}`).join(','),
      threeTiles.map((x) => `${x.index}_${x.letterId}`).join(',')
    );

    const alifForms = getPositionalFormsForLetter(
      LETTERS_DATA.find((l) => l.id === 'alif')!
    );
    assert.equal(alifForms.length, 2);
    const baaForms = getPositionalFormsForLetter(
      LETTERS_DATA.find((l) => l.id === 'baa')!
    );
    assert.equal(baaForms.length, 4);
    const hl = splitKeywordForHighlight('تفاح', 'ت');
    assert.equal(hl.match.includes('ت'), true);

    assert.equal(runCheck8_All5MiniGamesUnlockedOnly().passed, true);
    assert.equal(runCheck10_TeacherLoop().passed, true);
    assert.equal(runCheckC_TracingValidation().passed, true);

    const baa = LETTERS_DATA.find((l) => l.id === 'baa')!;
    const glyph = baa.forms.isolated;
    const outRes = validateGlyphTrace({
      learnerPoints: Array.from({ length: 30 }, (_, i) => ({
        x: 20 + i * 4,
        y: 10,
      })),
      learnerDots: [{ x: 100, y: 148 }],
      glyph,
      mode: 'adult',
    });
    assert.equal(outRes.passed, false);
    assert.equal(outRes.reason, 'sort_du_guide');
    assert.equal(outRes.messageFr, t('trace.outside', 'adult'));

    const missingDotRes = validateDotsStep({
      learnerDots: [],
      targetDots: [{ id: 2, kind: 'dot', at: [100, 148], radius: 7 }],
      corridor: 22,
      mode: 'adult',
    });
    assert.equal(missingDotRes.passed, false);
    assert.equal(missingDotRes.messageFr, 'Il manque un point');

    assert.ok(computeReedPenWidth(0.05, 16) > computeReedPenWidth(2.5, 10));
    assert.equal(runCheckH_ContrastAudit().passed, true);
    assert.equal(runCheckI_AlbumRdpAudit().passed, true);
    assert.equal(runCheckK_ShareCardAudit().passed, true);
    assert.equal(runCheckL_HapticsAndSoundDisabledAudit().passed, true);
    assert.ok(READING_LADDER_DATA.length >= 2);
    assert.ok(
      filterWordsByUnlockedLetters(PROGRESSIVE_WORDS, ['alif', 'baa']).length >=
        2
    );

    const firstBody = glyph.strokes.find((s) => s.kind === 'body');
    const sampled64 = sampleSvgPathEqualLength(
      firstBody && firstBody.kind === 'body'
        ? firstBody.d
        : 'M 100 40 L 100 150',
      64
    );
    let state = getInitialBlueprintState();
    state = saveLearnerTraceForAlbum(state, 'u_learner_1', 'baa', sampled64);
    assert.ok(simplifyPointsRDP(sampled64, 1.8).length <= sampled64.length);

    const b1 = advanceReviewBox(0, true, '2026-04-01');
    assert.equal(b1.nextBox, 1);
    state = markStepCompleted(state, 'u_learner_1', 'baa', 'tracer');
    state = markDailyMissionDone(state, 'u_learner_1', 'revoir');
    state = savePracticeAttemptToHistory(
      state,
      'u_learner_1',
      'baa',
      sampled64,
      90
    );
    const goodAttempt = redeemActivationCode(
      state,
      'u_learner_1',
      'ALIF-2026',
      1000
    );
    assert.equal(goodAttempt.ok, true);
    assert.equal(
      isFamilyUnlockedForUser(goodAttempt.nextState, 'u_learner_1', 'F2'),
      false // F1 is not finished yet!
    );
  });
});
