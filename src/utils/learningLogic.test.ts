import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildTracingSubSteps,
  computeGlyphDotClearanceAudit,
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
  getTodayLetterForUser,
  isFamilyUnlockedForUser,
  markDailyMissionDone,
  markStepCompleted,
  redeemActivationCode,
  saveLearnerTraceForAlbum,
  savePracticeAttemptToHistory,
} from '../services/dataService';
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
  runPolishCheck2_DotsSimulation,
  runPolishCheck5_ExamsProgressiveRule,
  runPolishCheck6_QuizOptionsPictureArabicFrench,
  runPolishCheck7_PracticeScores3Attempts,
} from '../components/DevSelfTestPage';
import { t } from '../data/copyDeck';

describe('Nouqta Calligraphy Engine & Polish Pass — Pure Unit Tests', () => {
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
      2000
    );
    assert.equal(goodAttempt.ok, true);
    assert.equal(
      isFamilyUnlockedForUser(goodAttempt.nextState, 'u_learner_1', 'F2'),
      true
    );
  });
});
