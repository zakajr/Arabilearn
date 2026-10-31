import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Volume2,
  RotateCcw,
  Play,
  Eye,
  Camera,
  Download,
  Check,
  Unlink,
  RotateCw,
  Pencil,
  AlignJustify,
  Sun,
  Flame,
  Lock,
  Star,
  Share2,
  BookmarkCheck,
  Ghost,
  MoreHorizontal,
  Info
} from 'lucide-react';
import { LearnerMode, t } from '../data/copyDeck';
import {
  LETTERS_DATA,
  LetterRecord,
  buildQuestionsForLetter,
  splitKeywordForHighlight
} from '../data/lettersAndFamilies';
import {
  DEFAULT_GLYPH_STROKE_WIDTH,
  DotTapLogEntry,
  GlyphBodyStroke,
  GlyphDotStroke,
  Point2D,
  ReedPenPoint,
  TracingSubStep,
  buildTracingSubSteps,
  computeRealPracticeMetrics,
  computeReedPenWidth,
  distanceBetween,
  evaluateGlyphAnimationAtProgress,
  getDotRectSide,
  isPointInsideStrokeCorridor,
  processDotStepTap,
  renderReedPenStrokeOnCanvas,
  sampleSvgPathEqualLength,
  validateDotsStep,
  validateSingleBodyStroke
} from '../lib/strokeMath';
import { getGlyphOutline } from '../lib/fontGlyphs';
import {
  compressAndFormatPhoto,
  downloadLetterWritingSheet
} from '../lib/pdfAndImage';
import { PracticeAttempt, StepId, Submission } from '../services/dataService';
import { speechService } from '../services/speech';
import {
  BottomSheet,
  CalligraphyAntSvgGroup,
  HighlightedArabicKeyword,
  IconButton,
  Mascot,
  MascotPose,
  PrimaryButton,
  SecondaryButton,
  StarRating,
  StatusChip,
  Stepper
} from './BlueprintComponents';

const STEP_ORDER: StepId[] = ['voir', 'ecouter', 'tracer', 'ecrire', 'retenir'];

/**
 * Helper to render an Arabic letter + combining vowel mark (fatha/kasra/damma)
 * with the vowel mark coloured in saffron (#FFB400) and line-height >= 1.9 so marks never clip (Phase D2).
 */
function SaffronHarakatGlyph({
  baseChar,
  markUnicode,
  sizeClass = 'text-[40px]'
}: {
  baseChar: string;
  markUnicode?: string;
  sizeClass?: string;
}) {
  return (
    <span
      lang="ar"
      dir="rtl"
      style={{ lineHeight: 1.95 }}
      className={`font-arabic inline-block select-none py-1 ${sizeClass}`}
    >
      <span className="text-[var(--ink)]">{baseChar}</span>
      {markUnicode && (
        <span
          data-testid="saffron-harakat-mark"
          style={{ color: '#FFB400' }}
          className="text-[#FFB400]"
        >
          {markUnicode}
        </span>
      )}
    </span>
  );
}

/**
 * Small SVG preview of a saved RDP point array for the C1 history strip.
 */
function MiniTracePreviewSvg({
  points,
  size = 38
}: {
  points: Point2D[];
  size?: number;
}) {
  if (!points || points.length < 2) {
    return <div style={{ width: size, height: size }} />;
  }
  const d = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      className="rounded-lg bg-[var(--paper)] border border-[var(--line)] shrink-0"
    >
      <line
        x1="20"
        y1="120"
        x2="180"
        y2="120"
        stroke="var(--line)"
        strokeWidth="4"
      />
      <path
        d={d}
        fill="none"
        stroke="#07463D"
        strokeWidth="14"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LetterLessonLoop({
  letter,
  mode,
  initialStepsDone,
  initialStep,
  initialPracticeMode = false,
  practiceHistory = [],
  existingSubmission,
  coachMarkEnabled = false,
  animationsEnabled = true,
  learnedLetterIds,
  onClose,
  onStepComplete,
  onSaveTraceForAlbum,
  onSavePracticeAttempt,
  onSubmitPaperPhoto,
  onNextLetter,
  onOpenShareSheet,
  onRateLetter,
  initialRating = null
}: {
  letter: LetterRecord;
  mode: LearnerMode;
  initialStepsDone: StepId[];
  initialStep?: StepId;
  initialPracticeMode?: boolean;
  practiceHistory?: PracticeAttempt[];
  existingSubmission?: Submission;
  coachMarkEnabled?: boolean;
  animationsEnabled?: boolean;
  learnedLetterIds?: string[];
  onClose: () => void;
  onStepComplete: (step: StepId, stars?: 0 | 1 | 2 | 3, skipped?: boolean) => void;
  onSaveTraceForAlbum?: (points: Point2D[], coverageScore: number) => void;
  onSavePracticeAttempt?: (points: Point2D[], scorePercent: number) => void;
  onSubmitPaperPhoto: (dataUrl: string) => void;
  onNextLetter: () => void;
  onOpenShareSheet?: () => void;
  onRateLetter?: (letterId: string, rating: 'good' | 'neutral' | 'hard') => void;
  initialRating?: 'good' | 'neutral' | 'hard' | null;
}) {
  const [letterRating, setLetterRating] = useState<'good' | 'neutral' | 'hard' | null>(
    initialRating
  );
  const startIdx = initialPracticeMode
    ? 2
    : initialStep
    ? Math.max(0, STEP_ORDER.indexOf(initialStep))
    : initialStepsDone.length > 0 && initialStepsDone.length < 5
    ? Math.max(
        0,
        STEP_ORDER.findIndex((s) => !initialStepsDone.includes(s))
      )
    : 0;

  const [stepIdx, setStepIdx] = useState<number>(startIdx);
  // Phase B.3: A check may appear ONLY for steps really completed before the current step in this run.
  const [completedSteps, setCompletedSteps] = useState<StepId[]>(() =>
    startIdx === 0
      ? []
      : initialStepsDone.filter((s) => STEP_ORDER.indexOf(s) < startIdx)
  );

  const currentStepId = STEP_ORDER[stepIdx];
  const glyph = letter.forms.isolated;
  const fontOutline = React.useMemo(
    () => getGlyphOutline(letter.id, 'isolated'),
    [letter.id]
  );
  const useFontRenderMode =
    (glyph.renderMode === 'font' || glyph.status === 'aligne') &&
    Boolean(fontOutline.bodyPath);
  const voirMaskId = `voir-font-mask-${letter.id}`;
  const bodyStrokes = React.useMemo(
    () => glyph.strokes.filter((s): s is GlyphBodyStroke => s.kind === 'body'),
    [glyph]
  );
  const dotStrokes = React.useMemo(
    () => glyph.strokes.filter((s): s is GlyphDotStroke => s.kind === 'dot'),
    [glyph]
  );
  const strokeWidth = bodyStrokes[0]?.width ?? DEFAULT_GLYPH_STROKE_WIDTH;
  const dotRectSide = getDotRectSide(strokeWidth);

  // Build data-driven tracing sub-steps: bodyStrokes first, then 'Points' if dots > 0
  const tracingSubSteps: TracingSubStep[] = React.useMemo(
    () => buildTracingSubSteps(glyph),
    [glyph]
  );

  // ============================================================================
  // PHASE A, C, D: SINGLE-PROGRESS (`0..1`) CALLIGRAPHY ANIMATION ENGINE
  // - Single source of truth `progress` (0..1) driving stroke dashoffset, ant position,
  //   ant tangent rotation, 6-leg CSS steps(2) walk cycle, and crumb dot reveal.
  // - Writes directly to DOM refs inside requestAnimationFrame (zero per-frame React state).
  // - Plays even when prefers-reduced-motion is true (stroke-order is lesson CONTENT).
  // ============================================================================
  const [animSpeed, setAnimSpeed] = useState<1 | 0.5>(1);
  const [animStepFilter, setAnimStepFilter] = useState<number | null>(null);
  const [animCycleKey, setAnimCycleKey] = useState<number>(0);
  const [replayCount, setReplayCount] = useState<number>(1);
  const [showReducedMotionTooltip, setShowReducedMotionTooltip] =
    useState<boolean>(false);
  const [debugOverlayOpen, setDebugOverlayOpen] = useState<boolean>(false);
  const [debugSnapshot, setDebugSnapshot] = useState<{
    progress: number;
    playing: boolean;
    activeStroke: number;
    reducedMotion: boolean;
    pathLengths: number[];
    fps: number;
    stalledReason: string | null;
  }>({
    progress: 0,
    playing: false,
    activeStroke: 1,
    reducedMotion: false,
    pathLengths: [],
    fps: 60,
    stalledReason: null
  });

  const titleTapRef = useRef<{ count: number; lastMs: number }>({
    count: 0,
    lastMs: 0
  });
  const stageContainerRef = useRef<HTMLDivElement | null>(null);
  const svgBodyPathRefs = useRef<(SVGPathElement | null)[]>([]);
  const svgMaskPathRefs = useRef<(SVGPathElement | null)[]>([]);
  const svgFontBodyGroupRef = useRef<SVGGElement | null>(null);
  const svgStartBadgeRefs = useRef<(SVGGElement | null)[]>([]);
  const svgDotGroupRefs = useRef<(SVGGElement | null)[]>([]);
  const antGroupRef = useRef<SVGGElement | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const watchdogTimerRef = useRef<number | null>(null);
  const poppedDotsPlayedRef = useRef<Set<number>>(new Set());

  const osReducedMotion =
    typeof window !== 'undefined' &&
    Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

  const handleTitleTripleTap = () => {
    const now = Date.now();
    if (now - titleTapRef.current.lastMs > 900) {
      titleTapRef.current.count = 1;
    } else {
      titleTapRef.current.count += 1;
    }
    titleTapRef.current.lastMs = now;
    if (titleTapRef.current.count >= 3) {
      titleTapRef.current.count = 0;
      setDebugOverlayOpen((v) => !v);
    }
  };

  // Apply timeline evaluation directly to SVG DOM refs (no per-frame React state)
  const applyTimelineToDomRefs = React.useCallback(
    (progressVal: number, stepFilter: number | null) => {
      const evalState = evaluateGlyphAnimationAtProgress(glyph, progressVal);

      if (stageContainerRef.current) {
        stageContainerRef.current.setAttribute(
          'data-timeline-progress',
          evalState.progress.toFixed(3)
        );
      }

      // Phase 1.3: At progress = 1 remove the SVG mask so the full crisp Naskh outline is visible
      if (svgFontBodyGroupRef.current) {
        const allBodiesDone = evalState.strokeProgresses.every((p) => p >= 0.998);
        if (evalState.progress >= 0.998 || (stepFilter === null && allBodiesDone)) {
          svgFontBodyGroupRef.current.removeAttribute('mask');
          svgFontBodyGroupRef.current.setAttribute('data-mask-removed', 'true');
        } else {
          svgFontBodyGroupRef.current.setAttribute('mask', `url(#${voirMaskId})`);
          svgFontBodyGroupRef.current.setAttribute('data-mask-removed', 'false');
        }
      }

      // 1. Update body stroke paths, mask stroke paths & start badges
      bodyStrokes.forEach((_, idx) => {
        const pathEl = svgBodyPathRefs.current[idx];
        const maskPathEl = svgMaskPathRefs.current[idx];
        const badgeEl = svgStartBadgeRefs.current[idx];
        let sProg = evalState.strokeProgresses[idx] ?? 0;

        if (stepFilter !== null) {
          if (idx + 1 < stepFilter) sProg = 1;
          else if (idx + 1 > stepFilter) sProg = 0;
        }

        const offset = Math.max(0, Math.min(1, 1 - sProg));
        if (pathEl) {
          pathEl.style.strokeDashoffset = offset.toFixed(4);
          pathEl.style.opacity = sProg > 0.002 ? '1' : '0';
          pathEl.setAttribute('data-progress', sProg.toFixed(2));
        }
        if (maskPathEl) {
          maskPathEl.style.strokeDashoffset = offset.toFixed(4);
          maskPathEl.style.opacity = sProg > 0.002 ? '1' : '0';
        }

        if (badgeEl) {
          const showBadge =
            stepFilter !== null
              ? idx + 1 <= stepFilter
              : idx <= evalState.activeStrokeIndex || sProg > 0;
          badgeEl.style.opacity = showBadge ? '1' : '0';
        }
      });

      // 2. Update diamond dots (pop scale 1.3 -> 1.0 + soft haptic on drop)
      dotStrokes.forEach((ds, dIdx) => {
        const dotEl = svgDotGroupRefs.current[dIdx];
        const dState = evalState.dots[dIdx];
        if (!dotEl || !dState) return;

        const isDotsStepInFilter =
          stepFilter !== null && stepFilter > bodyStrokes.length;
        const visible =
          stepFilter !== null ? isDotsStepInFilter && dState.visible : dState.visible;

        if (visible && !poppedDotsPlayedRef.current.has(ds.id)) {
          poppedDotsPlayedRef.current.add(ds.id);
          speechService.triggerHaptic('stroke_ok');
        }

        dotEl.style.opacity = visible ? '1' : '0';
        dotEl.setAttribute('data-visible', visible ? 'true' : 'false');
        dotEl.setAttribute(
          'transform',
          `translate(${dState.x}, ${dState.y}) scale(${dState.scale}) rotate(45)`
        );
      });

      // 3. Update CalligraphyAntSvgGroup ref position, tangent rotation, walk cycle, and carried crumb
      const antEl = antGroupRef.current;
      if (antEl) {
        const {
          x,
          y,
          angleDeg,
          isMoving,
          isStrokeEndBounce,
          isFinishedJump,
          isCarryingDot
        } = evalState.ant;

        let extraTransform = '';
        if (isStrokeEndBounce) {
          extraTransform = ' scale(1.08)';
        } else if (isFinishedJump && mode === 'kids' && !osReducedMotion) {
          extraTransform = ' translate(0, -4) scale(1.1)';
        }

        antEl.setAttribute(
          'transform',
          `translate(${x}, ${y}) rotate(${angleDeg})${extraTransform}`
        );
        antEl.setAttribute('data-moving', isMoving ? 'true' : 'false');
        antEl.setAttribute('data-angle-deg', String(angleDeg));
        antEl.setAttribute('data-carrying-dot', isCarryingDot ? 'true' : 'false');

        const crumbEl = antEl.querySelector(
          '.ant-carried-crumb'
        ) as SVGGElement | null;
        if (crumbEl) {
          crumbEl.style.display = isCarryingDot ? 'block' : 'none';
        }
      }

      return evalState;
    },
    [glyph, bodyStrokes, dotStrokes, mode, osReducedMotion, voirMaskId]
  );

  // Run single-progress requestAnimationFrame loop on entering Voir or pressing Rejouer
  // PHASE D.1: The stroke-order animation is lesson content: AUTO-PLAY once on entering
  // the step even when reduced motion is on.
  useEffect(() => {
    if (rafIdRef.current !== null) {
      window.cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    if (watchdogTimerRef.current !== null) {
      window.clearTimeout(watchdogTimerRef.current);
      watchdogTimerRef.current = null;
    }

    if (currentStepId !== 'voir') {
      return;
    }

    poppedDotsPlayedRef.current.clear();

    // Start at progress = 0 (EMPTY light grey guide, ant at start point)
    const initialEval = applyTimelineToDomRefs(0, animStepFilter);
    const totalMs =
      initialEval.totalDurationMs * (animSpeed === 0.5 ? 2 : 1);

    // If user explicitly turned off "Animations" in Réglages, jump to end
    if (!animationsEnabled) {
      const endEval = applyTimelineToDomRefs(1, animStepFilter);
      setDebugSnapshot({
        progress: 1,
        playing: false,
        activeStroke: endEval.activeStrokeIndex + 1,
        reducedMotion: osReducedMotion,
        pathLengths: endEval.pathLengths,
        fps: 0,
        stalledReason: 'Animations désactivées dans Réglages'
      });
      return;
    }

    const startPerf = performance.now();
    let lastFramePerf = startPerf;
    let smoothedFps = 60;
    let latestProgress = 0;

    // 300ms watchdog for the debug overlay
    watchdogTimerRef.current = window.setTimeout(() => {
      if (latestProgress <= 0.001) {
        setDebugSnapshot((prev) => ({
          ...prev,
          playing: false,
          stalledReason:
            'Progrès bloqué à 0 après 300 ms : boucle rAF interrompue ou élément SVG non monté'
        }));
      }
    }, 300);

    const tick = (now: number) => {
      const dtFrame = Math.max(1, now - lastFramePerf);
      lastFramePerf = now;
      smoothedFps = Math.round(smoothedFps * 0.8 + (1000 / dtFrame) * 0.2);

      const elapsed = Math.max(0, now - startPerf);
      const rawProg = Math.min(1, elapsed / totalMs);
      latestProgress = rawProg;

      const curEval = applyTimelineToDomRefs(rawProg, animStepFilter);

      if (debugOverlayOpen || rawProg >= 1 || elapsed < 60) {
        setDebugSnapshot({
          progress: Number(rawProg.toFixed(3)),
          playing: rawProg < 1,
          activeStroke: curEval.activeStrokeIndex + 1,
          reducedMotion: osReducedMotion,
          pathLengths: curEval.pathLengths,
          fps: smoothedFps,
          stalledReason: null
        });
      }

      if (rawProg < 1) {
        rafIdRef.current = window.requestAnimationFrame(tick);
      } else {
        rafIdRef.current = null;
      }
    };

    rafIdRef.current = window.requestAnimationFrame(tick);

    return () => {
      if (rafIdRef.current !== null) {
        window.cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      if (watchdogTimerRef.current !== null) {
        window.clearTimeout(watchdogTimerRef.current);
        watchdogTimerRef.current = null;
      }
    };
  }, [
    currentStepId,
    animCycleKey,
    animSpeed,
    animStepFilter,
    animationsEnabled,
    letter.id,
    applyTimelineToDomRefs,
    debugOverlayOpen,
    osReducedMotion
  ]);

  // Step 2 ('ecouter') tapped chips state
  const [heardChips, setHeardChips] = useState<string[]>([]);

  // ============================================================================
  // STEP 3 ('tracer'): PHASE A & PHASE B REBUILD
  // - Hero square canvas >= 85% of screen width
  // - One small status line under top bar: "Trait 1/2" or "Points"
  // - Under the canvas: ONLY 3 icon buttons with labels: Effacer, Animation, Guide (1/3)
  // - Status messages ("Très bien", "Guide validé", "Touche les pointillés", etc.)
  //   appear as a top toast for 2 seconds, never inside the layout.
  // - "Pratique", "Fantôme", "Garder", "Recommencer", history appear AFTER validation
  //   in a bottom sheet "Ton essai".
  // - "Passer cette étape" is a small text link inside a "..." menu.
  // ============================================================================
  const [subStepIdx, setSubStepIdx] = useState<number>(0);
  const [traceMode, setTraceMode] = useState<1 | 2 | 3>(1); // 1: Guide + flèches, 2: Léger (20%), 3: Sans guide
  const [traceDoneWithStar, setTraceDoneWithStar] = useState<boolean>(false);
  const [traceSkipped, setTraceSkipped] = useState<boolean>(false);
  const [isPracticeMode, setIsPracticeMode] = useState<boolean>(initialPracticeMode);
  const [ghostEnabled, setGhostEnabled] = useState<boolean>(false);
  const [selectedHistoryAttemptId, setSelectedHistoryAttemptId] = useState<
    string | null
  >(null);
  const [showTonEssaiSheet, setShowTonEssaiSheet] = useState<boolean>(false);
  const [showMoreMenu, setShowMoreMenu] = useState<boolean>(false);
  const [lastValidatedStroke, setLastValidatedStroke] = useState<{
    points: Point2D[];
    coverage: number;
    outside: number;
    score: number;
    canSave: boolean;
    saved: boolean;
  } | null>(null);

  // 2-second top toast for status messages (Phase A.7)
  const [tracingToast, setTracingToast] = useState<{
    text: string;
    tone: 'neutral' | 'good' | 'bad';
  } | null>(null);
  const tracingToastTimerRef = useRef<number | null>(null);

  const showTracingStatusToast = React.useCallback(
    (text: string, tone: 'neutral' | 'good' | 'bad' = 'neutral') => {
      if (tracingToastTimerRef.current !== null) {
        window.clearTimeout(tracingToastTimerRef.current);
      }
      setTracingToast({ text, tone });
      tracingToastTimerRef.current = window.setTimeout(() => {
        setTracingToast(null);
        tracingToastTimerRef.current = null;
      }, 2000);
    },
    []
  );

  const currentSubStep =
    tracingSubSteps[Math.min(subStepIdx, tracingSubSteps.length - 1)] ||
    tracingSubSteps[0];

  const [shakeCanvas, setShakeCanvas] = useState<boolean>(false);
  const [flashGreen, setFlashGreen] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef<boolean>(false);
  const learnerPointsRef = useRef<ReedPenPoint[]>([]);
  const lastMoveTimeRef = useRef<number>(0);
  const currentStrokeWidthRef = useRef<number>(14);

  // PHASE B: Dots state + tap logging (pointerdown ONLY, once per tap)
  const [placedDots, setPlacedDots] = useState<
    { x: number; y: number; snapped: boolean; targetId?: number }[]
  >([]);
  const [dotMissCount, setDotMissCount] = useState<number>(0);
  const [revealDotTargetBriefly, setRevealDotTargetBriefly] =
    useState<boolean>(false);
  const revealDotTimerRef = useRef<number | null>(null);
  const [ignoredTouchesLog, setIgnoredTouchesLog] = useState<string[]>([]);
  const dotTapLogsRef = useRef<DotTapLogEntry[]>([]);
  const [dotTapsReceivedCount, setDotTapsReceivedCount] = useState<number>(0);
  const lastDotPointerDownMsRef = useRef<number>(0);
  const autoAdvanceTimerRef = useRef<number | null>(null);

  // Step 4 ('ecrire') photo state
  const fileInputCameraRef = useRef<HTMLInputElement | null>(null);
  const fileInputGalleryRef = useRef<HTMLInputElement | null>(null);
  const [rawPhotoData, setRawPhotoData] = useState<string | null>(null);
  const [photoRotation, setPhotoRotation] = useState<number>(0);
  const [compressedPreview, setCompressedPreview] = useState<string | null>(null);
  const [photoSent, setPhotoSent] = useState<boolean>(Boolean(existingSubmission));

  // Step 5 ('retenir') 3-question quiz state (Phase B7, E3 & FIX 1b: restrict pool to learned letters)
  const questions = React.useMemo(() => {
    const learnedSet = new Set([...(learnedLetterIds || []), letter.id]);
    const learnedPool = LETTERS_DATA.filter((l) => learnedSet.has(l.id));
    const effectivePool =
      learnedPool.length >= 3
        ? learnedPool
        : LETTERS_DATA.slice(0, Math.max(3, learnedPool.length));
    return buildQuestionsForLetter(
      letter,
      effectivePool,
      mode === 'kids' ? 3 : 4
    );
  }, [letter, mode, learnedLetterIds]);
  const [quizIdx, setQuizIdx] = useState<number>(0);
  const [selectedOptIdx, setSelectedOptIdx] = useState<number | null>(null);
  const [quizAnswered, setQuizAnswered] = useState<boolean>(false);
  const [correctCount, setCorrectCount] = useState<number>(0);
  const [showCelebrationSheet, setShowCelebrationSheet] = useState<boolean>(false);
  const [earnedStars, setEarnedStars] = useState<0 | 1 | 2 | 3>(3);

  // Next letter in canonical 1..28 order for the "Demain : ..." teaser
  const nextLetterInCourse =
    LETTERS_DATA.find((l) => l.order === letter.order + 1) || null;

  // Clear only the active ink canvas
  const clearInkCanvasOnly = () => {
    learnerPointsRef.current = [];
    currentStrokeWidthRef.current = 14;
    setSelectedHistoryAttemptId(null);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, 200, 200);
  };

  const resetCurrentSubStep = (
    nextSubIdx = subStepIdx,
    nextMode = traceMode
  ) => {
    if (autoAdvanceTimerRef.current) {
      window.clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
    if (revealDotTimerRef.current) {
      window.clearTimeout(revealDotTimerRef.current);
      revealDotTimerRef.current = null;
    }
    speechService.stopPenSound();
    clearInkCanvasOnly();
    setDotMissCount(0);
    setRevealDotTargetBriefly(false);

    const targetStep = tracingSubSteps[nextSubIdx];
    if (
      nextMode !== traceMode ||
      nextSubIdx === 0 ||
      !targetStep ||
      targetStep.kind === 'body'
    ) {
      setPlacedDots([]);
    } else if (targetStep.kind === 'dot') {
      // Keep dots placed in earlier dot steps of the same mode
      setPlacedDots((prev) => prev.slice(0, targetStep.dotIndex));
    }
    dotTapLogsRef.current = [];
    setDotTapsReceivedCount(0);
    setSubStepIdx(nextSubIdx);
    setTraceMode(nextMode);
  };

  useEffect(() => {
    if (currentStepId !== 'tracer') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = 200 * dpr;
    canvas.height = 200 * dpr;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, 200, 200);
    }
  }, [currentStepId, subStepIdx, traceMode, letter.id]);

  useEffect(() => {
    return () => {
      speechService.stopPenSound();
      if (autoAdvanceTimerRef.current) {
        window.clearTimeout(autoAdvanceTimerRef.current);
      }
      if (revealDotTimerRef.current) {
        window.clearTimeout(revealDotTimerRef.current);
      }
      if (tracingToastTimerRef.current) {
        window.clearTimeout(tracingToastTimerRef.current);
      }
    };
  }, []);

  // Step 4: Re-compress photo when rotation changes
  useEffect(() => {
    if (!rawPhotoData) return;
    let active = true;
    compressAndFormatPhoto(rawPhotoData, photoRotation).then((res) => {
      if (active) setCompressedPreview(res);
    });
    return () => {
      active = false;
    };
  }, [rawPhotoData, photoRotation]);

  const recordStepDone = (
    step: StepId,
    stars?: 0 | 1 | 2 | 3,
    skipped = false
  ) => {
    setCompletedSteps((prev) =>
      prev.includes(step) ? prev : [...prev, step]
    );
    onStepComplete(step, stars, skipped);
  };

  // Pointer coordinates in 200x200 SVG viewBox space
  const getCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>): Point2D => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * 200,
      y: ((e.clientY - rect.top) / rect.height) * 200
    };
  };

  // Advance after a sub-step passes in the current traceMode
  const advanceAfterSubStepSuccess = () => {
    setFlashGreen(true);
    window.setTimeout(() => setFlashGreen(false), 450);
    setDotMissCount(0);
    setRevealDotTargetBriefly(false);

    // Move to next sub-step if any remain in this letter
    if (subStepIdx + 1 < tracingSubSteps.length) {
      speechService.triggerSuccessFeedback('stroke_ok'); // 15ms haptic
      const nextSub = subStepIdx + 1;
      showTracingStatusToast(
        `Très bien · ${tracingSubSteps[nextSub].labelFr}`,
        'good'
      );
      setSubStepIdx(nextSub);
      return;
    }

    // All sub-steps of the letter finished in the current traceMode!
    if (traceMode === 1) {
      speechService.triggerSuccessFeedback('step_ok'); // [10,40,10] haptic
      showTracingStatusToast('Guide validé !', 'good');
      if (isPracticeMode) {
        setShowTonEssaiSheet(true);
      } else {
        autoAdvanceTimerRef.current = window.setTimeout(() => {
          setTraceMode(2);
          setSubStepIdx(0);
          setPlacedDots([]);
        }, 550);
      }
    } else if (traceMode === 2) {
      speechService.triggerSuccessFeedback('step_ok'); // [10,40,10] haptic
      showTracingStatusToast('Guide léger validé !', 'good');
      if (isPracticeMode) {
        setShowTonEssaiSheet(true);
      } else {
        autoAdvanceTimerRef.current = window.setTimeout(() => {
          setTraceMode(3);
          setSubStepIdx(0);
          setPlacedDots([]);
        }, 550);
      }
    } else {
      // Passed Mode 3 (Sans guide) across all sub-steps -> earns Star!
      speechService.triggerSuccessFeedback('step_ok');
      setTraceDoneWithStar(true);
      recordStepDone('tracer', 3, false);
      showTracingStatusToast('Très bien ! Lettre maîtrisée ★', 'good');
      setShowTonEssaiSheet(true);
    }
  };

  /**
   * FIX A & FIX B: PointerDown handler on the tracing canvas.
   * - For tap steps ('dot'): NO e.width > 40 check. Each dot is its own step with its own target.
   *   A tap within the snap radius of THAT target pops the dot in place, triggers haptic, and starts the next step.
   *   A tap farther away is ignored with "Touche plus près du pointillé" (after 2 misses the target shows briefly, even in mode 3).
   * - For drawing steps ('body'): ignore touch only if e.width > 90 && e.height > 90, and log ignored touches in the debug overlay.
   */
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    setShowMoreMenu(false);

    if (currentSubStep.kind === 'dot') {
      e.preventDefault();
      const nowMs = performance.now();
      if (nowMs - lastDotPointerDownMsRef.current < 45) {
        return; // Guard against duplicate pointerdown
      }
      lastDotPointerDownMsRef.current = nowMs;

      const pt = getCanvasPoint(e);
      const rect = e.currentTarget.getBoundingClientRect();
      const canvasWidthPx = rect.width > 0 ? rect.width : 316;
      const targetDot = currentSubStep.dot;

      const tapResult = processDotStepTap({
        tap: pt,
        targetDot,
        placedDots: placedDots || [],
        canvasWidthPx
      });

      dotTapLogsRef.current.push(tapResult.log);
      setDotTapsReceivedCount(dotTapLogsRef.current.length);

      if (tapResult.snapped) {
        setPlacedDots(tapResult.nextDots);
        speechService.triggerHaptic('stroke_ok');
        advanceAfterSubStepSuccess();
      } else {
        const nextMisses = dotMissCount + 1;
        setDotMissCount(nextMisses);
        if (nextMisses >= 2) {
          setRevealDotTargetBriefly(true);
          if (revealDotTimerRef.current) {
            window.clearTimeout(revealDotTimerRef.current);
          }
          revealDotTimerRef.current = window.setTimeout(() => {
            setRevealDotTargetBriefly(false);
            revealDotTimerRef.current = null;
          }, 1400);
        }
        showTracingStatusToast('Touche plus près du pointillé', 'neutral');
      }
      return;
    }

    // BODY STROKE STEP: ignore palm touch only if e.width > 90 && e.height > 90 (Fix A)
    if (e.pointerType === 'touch' && e.width > 90 && e.height > 90) {
      setIgnoredTouchesLog((prev) => [
        ...prev.slice(-9),
        `Ignoré: ${Math.round(e.width)}x${Math.round(e.height)}px`
      ]);
      return;
    }

    e.preventDefault();
    isDrawingRef.current = true;
    lastMoveTimeRef.current = performance.now();
    currentStrokeWidthRef.current = 14;
    setSelectedHistoryAttemptId(null);
    const pt = getCanvasPoint(e);
    const inside = isPointInsideStrokeCorridor(pt, currentSubStep.stroke, mode);
    learnerPointsRef.current = [{ x: pt.x, y: pt.y, width: 14, inside }];
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, 200, 200);
    }
    speechService.startPenSound();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (currentSubStep.kind === 'dot') return;
    if (!isDrawingRef.current) return;
    if (e.pointerType === 'touch' && e.width > 90 && e.height > 90) {
      setIgnoredTouchesLog((prev) => [
        ...prev.slice(-9),
        `Move ignoré: ${Math.round(e.width)}x${Math.round(e.height)}px`
      ]);
      return;
    }
    e.preventDefault();

    const pt = getCanvasPoint(e);
    const pts = learnerPointsRef.current;
    const prev = pts[pts.length - 1] || pt;

    const now = performance.now();
    const dt = Math.max(4, now - (lastMoveTimeRef.current || now - 16));
    lastMoveTimeRef.current = now;
    const dist = distanceBetween(prev, pt);
    const speedPxPerMs = dist / dt;

    const nextW = computeReedPenWidth(
      speedPxPerMs,
      currentStrokeWidthRef.current,
      12
    );
    currentStrokeWidthRef.current = nextW;

    speechService.updatePenSoundSpeed(speedPxPerMs);

    const inside = isPointInsideStrokeCorridor(
      pt,
      currentSubStep.stroke,
      mode
    );
    pts.push({ x: pt.x, y: pt.y, width: nextW, inside });

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, 200, 200);
      renderReedPenStrokeOnCanvas(ctx, pts, '#07463D');
    }
  };

  const handlePointerUp = () => {
    speechService.stopPenSound();
    if (currentSubStep.kind === 'dot') return;
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    if (learnerPointsRef.current.length >= 2) {
      evaluateCurrentSubStep();
    }
  };

  const evaluateCurrentSubStep = () => {
    // FIX B: In a dot step, tapping the target advances immediately; if Valider is pressed before tapping,
    // prompt "Touche plus près du pointillé" (and reveal target after 2 misses).
    if (currentSubStep.kind === 'dot') {
      const targetDot = currentSubStep.dot;
      const alreadyPlaced = (placedDots || []).some(
        (d) =>
          d.targetId === targetDot.id ||
          Math.hypot(d.x - targetDot.at[0], d.y - targetDot.at[1]) <= 12
      );
      if (alreadyPlaced) {
        advanceAfterSubStepSuccess();
      } else {
        const nextMisses = dotMissCount + 1;
        setDotMissCount(nextMisses);
        if (nextMisses >= 2) {
          setRevealDotTargetBriefly(true);
          if (revealDotTimerRef.current) {
            window.clearTimeout(revealDotTimerRef.current);
          }
          revealDotTimerRef.current = window.setTimeout(() => {
            setRevealDotTargetBriefly(false);
            revealDotTimerRef.current = null;
          }, 1400);
        }
        speechService.triggerHaptic('error');
        showTracingStatusToast('Touche plus près du pointillé', 'neutral');
      }
      return;
    }

    // Body stroke validation with real coverage & outside ratios (Phase E.4)
    if (learnerPointsRef.current.length < 2) {
      speechService.triggerHaptic('error');
      setShakeCanvas(true);
      window.setTimeout(() => setShakeCanvas(false), 320);
      showTracingStatusToast(t('trace.short', mode), 'bad');
      return;
    }

    const activePoints = learnerPointsRef.current;
    const res = validateSingleBodyStroke({
      learnerPoints: activePoints,
      stroke: currentSubStep.stroke,
      mode
    });
    const metrics = computeRealPracticeMetrics(
      activePoints,
      currentSubStep.stroke,
      mode
    );

    const ptsCopy = activePoints.map((p) => ({ x: p.x, y: p.y }));
    setLastValidatedStroke({
      points: ptsCopy,
      coverage: metrics.coverage,
      outside: metrics.outside,
      score: metrics.score,
      canSave: metrics.canSave,
      saved: false
    });

    if (res.passed) {
      if (currentSubStep.bodyStrokeIndex === 0 && metrics.canSave) {
        onSaveTraceForAlbum?.(ptsCopy, metrics.score);
      }
      advanceAfterSubStepSuccess();
    } else {
      speechService.triggerHaptic('error'); // 30ms error haptic
      setShakeCanvas(true);
      window.setTimeout(() => setShakeCanvas(false), 320);
      showTracingStatusToast(res.messageFr, 'bad');
    }
  };

  // PHASE E.4: "Garder" button handler — only saves an attempt at 60% or more
  const handleKeepPracticeAttempt = () => {
    if (!lastValidatedStroke) return;
    if (!lastValidatedStroke.canSave || lastValidatedStroke.score < 60) {
      showTracingStatusToast('Score minimum de 60 % requis pour garder', 'bad');
      return;
    }
    onSavePracticeAttempt?.(
      lastValidatedStroke.points,
      lastValidatedStroke.score
    );
    setLastValidatedStroke({
      ...lastValidatedStroke,
      saved: true
    });
    speechService.triggerSuccessFeedback('stroke_ok');
    showTracingStatusToast(
      `Essai gardé (${lastValidatedStroke.score} %)`,
      'good'
    );
  };

  // Secondary text link "Passer cette étape" inside the "..." menu (Phase A.6)
  const handleSkipTraceStep = () => {
    setShowMoreMenu(false);
    setTraceSkipped(true);
    recordStepDone('tracer', 0, true);
    setStepIdx(3);
  };

  const handlePhotoFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setRawPhotoData(String(reader.result));
      setPhotoRotation(0);
    };
    reader.readAsDataURL(file);
  };

  // Bottom primary button label & action per step
  const getPrimaryActionConfig = (): {
    label: string;
    disabled: boolean;
    onClick: () => void;
  } => {
    switch (currentStepId) {
      case 'voir':
        return {
          label: 'Suivant',
          disabled: false,
          onClick: () => {
            speechService.triggerHaptic('step_ok');
            recordStepDone('voir');
            setStepIdx(1);
          }
        };

      case 'ecouter':
        return {
          label: 'Suivant',
          disabled: heardChips.length < 4,
          onClick: () => {
            speechService.triggerHaptic('step_ok');
            recordStepDone('ecouter');
            setStepIdx(2);
          }
        };

      case 'tracer': {
        return {
          label: traceDoneWithStar || traceSkipped ? 'Suivant' : 'Valider',
          disabled: false,
          onClick: () => {
            if (traceDoneWithStar || traceSkipped) {
              setStepIdx(3);
            } else {
              evaluateCurrentSubStep();
            }
          }
        };
      }

      case 'ecrire': {
        if (photoSent) {
          return {
            label: 'Suivant',
            disabled: false,
            onClick: () => {
              speechService.triggerHaptic('step_ok');
              recordStepDone('ecrire');
              setStepIdx(4);
            }
          };
        }
        if (compressedPreview) {
          return {
            label: t('photo.send', mode),
            disabled: false,
            onClick: () => {
              onSubmitPaperPhoto(compressedPreview);
              setPhotoSent(true);
              speechService.triggerSuccessFeedback('step_ok');
              recordStepDone('ecrire');
            }
          };
        }
        return {
          label: 'Prendre une photo',
          disabled: false,
          onClick: () => fileInputCameraRef.current?.click()
        };
      }

      case 'retenir': {
        const currentQ = questions[quizIdx];
        if (!quizAnswered) {
          return {
            label: 'Valider',
            disabled: selectedOptIdx === null,
            onClick: () => {
              if (selectedOptIdx === null) return;
              const isCorrect = selectedOptIdx === currentQ.correctIndex;
              if (isCorrect) {
                speechService.triggerSuccessFeedback('stroke_ok');
                setCorrectCount((c) => c + 1);
              } else {
                speechService.triggerHaptic('error');
              }
              setQuizAnswered(true);
            }
          };
        }
        const isLastQ = quizIdx + 1 >= questions.length;
        return {
          label: isLastQ ? 'Terminer' : 'Continuer',
          disabled: false,
          onClick: () => {
            if (!isLastQ) {
              setQuizIdx((idx) => idx + 1);
              setSelectedOptIdx(null);
              setQuizAnswered(false);
            } else {
              const stars: 0 | 1 | 2 | 3 = traceSkipped
                ? (Math.min(2, correctCount) as 0 | 1 | 2)
                : correctCount >= 3
                ? 3
                : correctCount === 2
                ? 2
                : 1;
              setEarnedStars(stars);
              recordStepDone('retenir', stars);
              speechService.triggerSuccessFeedback('letter_done'); // [15,60,15,60,30]
              setShowCelebrationSheet(true);
            }
          }
        };
      }
    }
  };

  const primaryAction = getPrimaryActionConfig();
  const completedStepIndices = completedSteps.map((s) => STEP_ORDER.indexOf(s));

  // Helper to compute directional arrow coordinates for a body stroke in Mode 1
  const getDirectionArrowForStroke = (bs: GlyphBodyStroke) => {
    const samples = sampleSvgPathEqualLength(bs.d, 16);
    const pStart = samples[2] || { x: bs.startDot[0], y: bs.startDot[1] };
    const pNext = samples[5] || pStart;
    const angleDeg =
      (Math.atan2(pNext.y - pStart.y, pNext.x - pStart.x) * 180) / Math.PI;
    return { x: pNext.x, y: pNext.y, angleDeg };
  };

  // Determine reactive mascot pose in Kids mode (Phase 2.4)
  const activeMascotPose: MascotPose =
    currentStepId === 'tracer'
      ? tracingToast?.tone === 'good'
        ? 'cheer'
        : tracingToast?.tone === 'bad'
        ? 'oops'
        : 'wave'
      : currentStepId === 'retenir'
      ? !quizAnswered
        ? 'think'
        : selectedOptIdx === questions[quizIdx].correctIndex
        ? 'cheer'
        : 'oops'
      : 'wave';

  const keywordParts = React.useMemo(
    () => splitKeywordForHighlight(letter.keyword, letter.id),
    [letter.keyword, letter.id]
  );

  // Previous attempt for Ghost ("Fantôme") overlay in C1
  const ghostAttempt =
    selectedHistoryAttemptId
      ? practiceHistory.find((a) => a.id === selectedHistoryAttemptId)
      : practiceHistory[practiceHistory.length - 1];

  const ghostSvgPath = React.useMemo(() => {
    if (!ghostAttempt || ghostAttempt.points.length < 2) return null;
    return ghostAttempt.points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join(' ');
  }, [ghostAttempt]);

  const coachMarkMessages: Record<StepId, string> = {
    voir: 'Observe la fourmi tracer la lettre',
    ecouter: 'Touche les 4 cartes pour écouter les sons',
    tracer: 'Suis le guide avec ton doigt',
    ecrire: 'Écris sur papier ou passe à la suite',
    retenir: 'Réponds aux 3 questions pour gagner tes étoiles'
  };

  return (
    <div className="fixed inset-0 z-40 bg-[var(--paper)] flex flex-col justify-between h-[100dvh] overflow-hidden">
      {/* PHASE A.7: Status messages ("Très bien", "Guide validé", "Touche les pointillés"...)
          appear as a toast at the top for 2 seconds, never inside the layout. */}
      {tracingToast && (
        <div
          data-testid="tracing-status-toast"
          role="status"
          aria-live="polite"
          className="fixed top-3 left-1/2 -translate-x-1/2 z-50 pointer-events-none px-4 py-2 rounded-full shadow-md font-semibold text-[13px] whitespace-nowrap transition-all"
          style={{
            backgroundColor:
              tracingToast.tone === 'good'
                ? '#0F7B55'
                : tracingToast.tone === 'bad'
                ? '#C83A2E'
                : '#0A1F1B',
            color: '#FFFFFF'
          }}
        >
          {tracingToast.text}
        </div>
      )}

      {/* PHASE A.1 & FIX B: Top Bar: Close button on left, letter name + "..." menu button (in Tracer) on right. */}
      <div className="max-w-[480px] w-full mx-auto px-[16px] pt-2 pb-1 flex flex-col gap-1.5 shrink-0">
        <div className="flex items-center justify-between gap-2 min-w-0">
          <IconButton ariaLabel="Fermer la leçon" onClick={onClose}>
            <X className="w-5 h-5" />
          </IconButton>

          <div className="flex items-center gap-1.5 shrink-0 relative">
            <button
              type="button"
              data-testid="lesson-header-letter-name"
              aria-label={`Lettre ${letter.shortName}`}
              onClick={handleTitleTripleTap}
              className={`min-h-[48px] px-2 flex items-center justify-end font-display ${
                letter.shortName.length > 12 ? 'text-[16px]' : 'text-[20px]'
              } text-[var(--ink)] whitespace-nowrap shrink-0 text-right cursor-pointer`}
            >
              {letter.shortName}
            </button>

            {currentStepId === 'tracer' && (
              <div className="relative">
                <button
                  type="button"
                  data-testid="tracing-more-menu-btn"
                  aria-label="Plus d'options de tracé"
                  aria-expanded={showMoreMenu}
                  onClick={() => setShowMoreMenu((m) => !m)}
                  className="w-[48px] h-[48px] min-w-[48px] min-h-[48px] rounded-full bg-[var(--surface)] border border-[var(--line)] flex items-center justify-center text-[var(--ink)] pressable cursor-pointer"
                >
                  <MoreHorizontal className="w-5 h-5" />
                </button>

                {showMoreMenu && (
                  <div
                    data-testid="tracing-more-menu-popover"
                    className="absolute right-0 top-[52px] z-30 w-[200px] rounded-[16px] bg-[var(--surface)] border border-[var(--line)] shadow-lg p-1.5 flex flex-col gap-1"
                  >
                    <button
                      type="button"
                      data-testid="open-ton-essai-menu-btn"
                      onClick={() => {
                        setShowMoreMenu(false);
                        setShowTonEssaiSheet(true);
                      }}
                      className="w-full min-h-[48px] px-3 rounded-[12px] text-left text-[13px] font-semibold text-[var(--ink)] flex items-center gap-2 pressable cursor-pointer"
                    >
                      <BookmarkCheck className="w-4 h-4 text-[var(--brand)] shrink-0" />
                      <span>Ton essai</span>
                    </button>
                    <button
                      type="button"
                      data-testid="skip-trace-step-btn"
                      onClick={handleSkipTraceStep}
                      className="w-full min-h-[48px] px-3 rounded-[12px] text-left text-[13px] font-semibold text-[var(--ink)]/80 flex items-center gap-2 pressable cursor-pointer"
                    >
                      <span>Passer cette étape</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <Stepper
          currentIndex={stepIdx}
          completedIndices={completedStepIndices}
          onSelectStep={(idx) => setStepIdx(idx)}
        />

        {/* PHASE B2: Guided first lesson coach-mark */}
        {coachMarkEnabled && (
          <div
            data-testid="lesson-step-coachmark"
            className="rounded-[14px] bg-[var(--accent)]/20 border border-[var(--accent)] px-3 py-1.5 flex items-center justify-between gap-2"
          >
            <span className="text-[13px] font-bold text-[var(--ink)]">
              ▲ Guide : {coachMarkMessages[currentStepId]}
            </span>
          </div>
        )}
      </div>

      {/* Center Step Content Area (One idea per screen, fits viewport) */}
      <div
        className={`flex-1 max-w-[480px] w-full mx-auto ${
          currentStepId === 'tracer' ? 'px-[14px]' : 'px-[20px]'
        } py-1 flex flex-col justify-center overflow-y-auto animate-step`}
      >
        {/* =====================================================================
            STEP 1: VOIR (Phases A, B, C, D + Phase 1.3 Real Naskh Font Outline)
           ===================================================================== */}
        {currentStepId === 'voir' && (
          <div className="flex flex-col items-center gap-3">
            {/* Hidden Dev Debug Overlay (Triple-tap letter title to toggle) */}
            {debugOverlayOpen && (
              <div
                data-testid="voir-debug-overlay"
                className="w-full rounded-[14px] bg-[#0A1F1B] text-[#F2FAF7] p-2.5 font-mono text-[13px] space-y-1 border border-[var(--accent)]"
              >
                <div className="flex items-center justify-between">
                  <span>
                    Progrès : {(debugSnapshot.progress * 100).toFixed(0)}% (
                    {debugSnapshot.progress.toFixed(2)})
                  </span>
                  <span>
                    État : {debugSnapshot.playing ? 'En lecture' : 'Terminé'} ·{' '}
                    {debugSnapshot.fps} i/s
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Trait actif : {debugSnapshot.activeStroke}</span>
                  <span>
                    Mouvement réduit : {debugSnapshot.reducedMotion ? 'Oui' : 'Non'}
                  </span>
                </div>
                <div>
                  Longueurs : [{debugSnapshot.pathLengths.join(', ')}]
                </div>
                {debugSnapshot.stalledReason && (
                  <div
                    data-testid="voir-debug-stalled-warning"
                    className="text-[#FF5A4E] font-bold"
                  >
                    ⚠ {debugSnapshot.stalledReason}
                  </div>
                )}
              </div>
            )}

            {/* Authored SVG Stroke-Order Animation Stage */}
            <div
              ref={stageContainerRef}
              data-testid="voir-animation-stage"
              data-replay-count={replayCount}
              data-timeline-progress="0.000"
              className="w-[236px] h-[236px] rounded-[28px] bg-[var(--surface)] border-2 border-[var(--line)] relative flex items-center justify-center hero-shadow overflow-hidden"
            >
              {/* PHASE D.1: Keep the reduced-motion hint ONLY as a small icon tooltip, not a text line */}
              {osReducedMotion && (
                <div className="absolute top-2 left-2 z-20">
                  <button
                    type="button"
                    data-testid="reduced-motion-tooltip-btn"
                    aria-label="Animations réduites : appuie sur Rejouer"
                    title="Animations réduites : appuie sur Rejouer"
                    onClick={() => setShowReducedMotionTooltip((v) => !v)}
                    className="w-[48px] h-[48px] min-w-[48px] min-h-[48px] rounded-full bg-[var(--paper)]/90 border border-[var(--line)] flex items-center justify-center text-[var(--brand)] pressable cursor-pointer"
                  >
                    <Info className="w-4 h-4" />
                  </button>
                  {showReducedMotionTooltip && (
                    <div
                      role="tooltip"
                      className="absolute top-[52px] left-0 z-30 px-3 py-1.5 rounded-[12px] bg-[#0A1F1B] text-white text-[13px] font-semibold whitespace-nowrap shadow-md"
                    >
                      Animations réduites : appuie sur Rejouer
                    </div>
                  )}
                </div>
              )}

              <svg
                viewBox={glyph.viewBox}
                className="w-full h-full overflow-visible"
                aria-label={`Animation du tracé de la lettre ${letter.shortName}`}
              >
                {useFontRenderMode && (
                  <defs>
                    <mask
                      id={voirMaskId}
                      maskUnits="userSpaceOnUse"
                      x="0"
                      y="0"
                      width="200"
                      height="200"
                    >
                      <rect x="0" y="0" width="200" height="200" fill="black" />
                      {bodyStrokes.map((bs, idx) => (
                        <path
                          key={`mask_stroke_${bs.id}`}
                          ref={(el) => {
                            svgMaskPathRefs.current[idx] = el;
                          }}
                          d={bs.d}
                          pathLength={1}
                          fill="none"
                          stroke="white"
                          strokeWidth={48}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeDasharray="1"
                          strokeDashoffset={1}
                          style={{ opacity: 0 }}
                        />
                      ))}
                    </mask>
                  </defs>
                )}

                {/* Writing baseline */}
                <line
                  x1="20"
                  y1={glyph.baseline}
                  x2="180"
                  y2={glyph.baseline}
                  stroke="var(--line)"
                  strokeWidth="1.5"
                  strokeDasharray="5 5"
                />

                {/* Phase 1.3: Empty Light Grey Naskh Body Outline Guide */}
                {useFontRenderMode && (
                  <path
                    data-testid="voir-font-guide-body"
                    d={fontOutline.bodyPath}
                    fill="#C9D6D1"
                  />
                )}

                {/* Phase 1.3: Naskh BODY outline filled with ink colour (#07463D), revealed through SVG <mask> */}
                {useFontRenderMode && (
                  <g
                    ref={svgFontBodyGroupRef}
                    data-testid="voir-font-body-group"
                    data-render-mode="font"
                    mask={`url(#${voirMaskId})`}
                  >
                    <path
                      data-testid="voir-font-body-outline"
                      d={fontOutline.bodyPath}
                      fill="#07463D"
                    />
                  </g>
                )}

                {/* 1. Centre-line guide & animated stroke refs + Start badges */}
                {bodyStrokes.map((bs, idx) => {
                  const badgeX = Math.max(20, Math.min(180, bs.startDot[0] - 24));
                  const badgeY = Math.max(20, Math.min(180, bs.startDot[1] - 22));

                  return (
                    <g key={bs.id}>
                      {/* Smooth light grey guide path (#C9D6D1, width 14) */}
                      <path
                        data-testid={`voir-guide-stroke-${idx}`}
                        d={bs.d}
                        fill="none"
                        stroke="#C9D6D1"
                        strokeWidth={bs.width}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity={useFontRenderMode ? 0 : 1}
                      />

                      {/* Animated dark-green ink trail driven by single progress ref */}
                      <path
                        ref={(el) => {
                          svgBodyPathRefs.current[idx] = el;
                        }}
                        data-testid={`voir-animated-stroke-${idx}`}
                        data-progress="0.00"
                        d={bs.d}
                        pathLength={1}
                        fill="none"
                        stroke={useFontRenderMode ? 'transparent' : '#07463D'}
                        strokeWidth={bs.width}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeDasharray="1"
                        strokeDashoffset={1}
                        style={{ opacity: 0 }}
                      />

                      {/* Start badge "1", "2" OFFSET above-left of startDot */}
                      <g
                        ref={(el) => {
                          svgStartBadgeRefs.current[idx] = el;
                        }}
                        data-testid={`voir-start-number-${idx + 1}`}
                        data-badge-x={badgeX}
                        data-badge-y={badgeY}
                        style={{ opacity: idx === 0 ? 1 : 0 }}
                      >
                        <circle
                          cx={badgeX}
                          cy={badgeY}
                          r="10"
                          fill="var(--accent)"
                        />
                        <text
                          x={badgeX}
                          y={badgeY + 4}
                          textAnchor="middle"
                          fontSize="13"
                          fontWeight="bold"
                          fill="var(--accent-ink)"
                        >
                          {idx + 1}
                        </text>
                      </g>
                    </g>
                  );
                })}

                {/* 2. Real Naskh Font Dot Contours (scaled 1.3x, diagonal >= 22u) or Diamond Dots */}
                {dotStrokes.map((ds, idx) => {
                  const fontDot = useFontRenderMode ? fontOutline.dots[idx] : undefined;
                  return (
                    <g
                      key={ds.id}
                      ref={(el) => {
                        svgDotGroupRefs.current[idx] = el;
                      }}
                      data-testid={`voir-popped-dot-${idx}`}
                      data-visible="false"
                      transform={`translate(${ds.at[0]}, ${ds.at[1]}) scale(1) rotate(45)`}
                      style={{ opacity: 0 }}
                    >
                      {fontDot ? (
                        <g
                          transform={`rotate(-45) translate(${-fontDot.cx}, ${-fontDot.cy})`}
                        >
                          <path
                            data-testid={`voir-font-dot-path-${idx}`}
                            d={fontDot.path}
                            fill="#07463D"
                            stroke="#FFFFFF"
                            strokeWidth="1.5"
                          />
                        </g>
                      ) : (
                        <rect
                          x={-dotRectSide / 2}
                          y={-dotRectSide / 2}
                          width={dotRectSide}
                          height={dotRectSide}
                          rx="1.6"
                          fill="#07463D"
                          stroke="#FFFFFF"
                          strokeWidth="2"
                        />
                      )}
                    </g>
                  );
                })}

                {/* 3. PHASE D: CalligraphyAntSvgGroup (6 legs in two alternating groups switching every 120ms while moving, rotated to tangent, never hides start badge or dots) */}
                <CalligraphyAntSvgGroup
                  ref={antGroupRef}
                  mode={mode}
                  initialX={bodyStrokes[0]?.startDot[0] ?? 100}
                  initialY={bodyStrokes[0]?.startDot[1] ?? 100}
                  initialAngleDeg={0}
                  onTapAnt={() => speechService.playMascotChirp()}
                />
              </svg>
            </div>

            {/* Animation Controls with labels: Rejouer, Vitesse (x1 / x0.5), Pas à pas */}
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <button
                type="button"
                data-testid="voir-replay-btn"
                aria-label="Rejouer l'animation"
                onClick={() => {
                  setAnimStepFilter(null);
                  setReplayCount((c) => c + 1);
                  setAnimCycleKey((k) => k + 1);
                }}
                className="min-w-[96px] min-h-[48px] h-[48px] px-3.5 rounded-full bg-[var(--surface)] border border-[var(--line)] flex items-center justify-center gap-1.5 text-[13px] font-semibold text-[var(--ink)] pressable cursor-pointer"
              >
                <RotateCcw className="w-4 h-4 text-[var(--brand)] shrink-0" />
                <span>Rejouer</span>
              </button>

              <button
                type="button"
                data-testid="voir-speed-btn"
                aria-label={`Vitesse : x${animSpeed}`}
                onClick={() => {
                  setAnimSpeed((s) => (s === 1 ? 0.5 : 1));
                  setAnimCycleKey((k) => k + 1);
                }}
                className="min-w-[104px] min-h-[48px] h-[48px] px-3.5 rounded-full bg-[var(--surface)] border border-[var(--line)] text-[13px] font-semibold text-[var(--ink)] pressable cursor-pointer"
              >
                Vitesse : x{animSpeed}
              </button>

              <button
                type="button"
                data-testid="voir-step-by-step-btn"
                aria-label="Pas à pas"
                onClick={() => {
                  const totalSteps =
                    bodyStrokes.length + (dotStrokes.length > 0 ? 1 : 0);
                  setAnimStepFilter((cur) =>
                    cur === null ? 1 : cur >= totalSteps ? null : cur + 1
                  );
                  setAnimCycleKey((k) => k + 1);
                }}
                className="min-w-[100px] min-h-[48px] h-[48px] px-3.5 rounded-full bg-[var(--surface)] border border-[var(--line)] text-[13px] font-semibold text-[var(--ink)] pressable cursor-pointer"
              >
                {animStepFilter === null
                  ? 'Pas à pas'
                  : animStepFilter <= bodyStrokes.length
                  ? `Trait ${animStepFilter}/${bodyStrokes.length}`
                  : 'Points'}
              </button>
            </div>

            {/* Phase B.4: Keep the description line but max 2 short lines */}
            {mode === 'adult' ? (
              <div className="w-full rounded-[18px] bg-[var(--surface)] border border-[var(--line)] p-3 flex items-center justify-between gap-3">
                <p
                  data-testid="voir-description-line"
                  className="text-[14px] text-[var(--ink)] font-medium line-clamp-2"
                >
                  {letter.tip}
                </p>
                {!letter.connects && (
                  <span
                    title="Ne s'attache pas à gauche"
                    className="px-2.5 py-1 rounded-full bg-[var(--accent)]/20 text-[var(--accent-ink)] text-[13px] font-semibold flex items-center gap-1 shrink-0"
                  >
                    <Unlink className="w-3.5 h-3.5" />
                    <span>Sans liaison</span>
                  </span>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Mascot pose="wave" size={48} mode={mode} />
                <p
                  data-testid="voir-description-line"
                  className="text-[15px] font-semibold text-[var(--ink)] line-clamp-2"
                >
                  {letter.tip}
                </p>
              </div>
            )}
          </div>
        )}

        {/* =====================================================================
            STEP 2: ÉCOUTER (Phase B6 Visual Anchor picture + highlighted keyword
            & Phase D2 Harakat fatha/kasra/damma in saffron with line-height >= 1.9)
           ===================================================================== */}
        {currentStepId === 'ecouter' && (
          <div className="flex flex-col items-center gap-3.5">
            <div className="w-full grid grid-cols-2 gap-3 items-stretch">
              <div className="rounded-[22px] bg-[var(--surface)] border border-[var(--line)] p-3 flex flex-col items-center justify-between">
                <div
                  lang="ar"
                  dir="rtl"
                  style={{ lineHeight: 1.9 }}
                  className="font-arabic text-[64px] text-[var(--ink)] select-none"
                >
                  {letter.arabicChar}
                </div>
                <button
                  type="button"
                  aria-label={`Écouter ${letter.shortName}`}
                  onClick={() => {
                    speechService.speakArabic(letter.speechText);
                    setHeardChips((prev) =>
                      prev.includes('base') ? prev : [...prev, 'base']
                    );
                  }}
                  className="w-[52px] h-[52px] min-w-[52px] min-h-[52px] rounded-full bg-[var(--brand-deep)] text-white flex items-center justify-center pressable cursor-pointer"
                >
                  <Volume2 className="w-6 h-6" />
                </button>
              </div>

              {/* Phase B6 Visual Anchor: picture + highlighted keyword + keywordFr */}
              <button
                type="button"
                data-testid="ecouter-visual-anchor-card"
                aria-label={`Mot repère ${letter.keywordFr} : ${letter.keyword}`}
                onClick={() => speechService.speakArabic(letter.keyword)}
                className="rounded-[22px] bg-[var(--surface)] border border-[var(--line)] p-3 flex flex-col items-center justify-between pressable cursor-pointer text-center"
              >
                <span className="text-[36px] leading-none" aria-hidden="true">
                  {letter.picture}
                </span>
                <HighlightedArabicKeyword
                  before={keywordParts.before}
                  highlight={keywordParts.match}
                  after={keywordParts.after}
                  className="text-[32px]"
                />
                <span className="text-[13px] font-semibold text-[var(--ink)]/80">
                  {letter.keywordFr}
                </span>
              </button>
            </div>

            {/* 4 Interactive Audio Chips: Letter + 3 Harakat */}
            <div className="w-full grid grid-cols-2 gap-2.5">
              {[
                {
                  id: 'base',
                  baseChar: letter.arabicChar,
                  markUnicode: undefined,
                  sub: letter.shortName,
                  markLabel: 'Lettre seule',
                  speech: letter.speechText
                },
                {
                  id: 'a',
                  baseChar: letter.arabicChar,
                  markUnicode: '\u064E', // Fatha
                  sub: letter.vowels.a.sound,
                  markLabel: 'Fatha (son a)',
                  speech: letter.vowels.a.arabic
                },
                {
                  id: 'i',
                  baseChar: letter.arabicChar,
                  markUnicode: '\u0650', // Kasra
                  sub: letter.vowels.i.sound,
                  markLabel: 'Kasra (son i)',
                  speech: letter.vowels.i.arabic
                },
                {
                  id: 'u',
                  baseChar: letter.arabicChar,
                  markUnicode: '\u064F', // Damma
                  sub: letter.vowels.u.sound,
                  markLabel: 'Damma (son ou)',
                  speech: letter.vowels.u.arabic
                }
              ].map((chip) => {
                const heard = heardChips.includes(chip.id);
                return (
                  <button
                    key={chip.id}
                    type="button"
                    aria-label={`Écouter le son ${chip.sub}`}
                    onClick={() => {
                      speechService.speakArabic(chip.speech);
                      setHeardChips((prev) =>
                        prev.includes(chip.id) ? prev : [...prev, chip.id]
                      );
                    }}
                    className={`min-h-[78px] rounded-[18px] px-3.5 py-2 border-2 flex items-center justify-between pressable cursor-pointer transition-all min-w-0 ${
                      heard
                        ? 'bg-[var(--surface)] border-[var(--good)]'
                        : 'bg-[var(--surface)] border-[var(--line)]'
                    }`}
                  >
                    <div className="flex flex-col items-start gap-0.5 min-w-0 text-left">
                      <div className="flex items-center gap-1.5">
                        <Volume2 className="w-4 h-4 text-[var(--brand)] shrink-0" />
                        <span className="text-[15px] font-bold text-[var(--ink)] truncate">
                          {chip.sub}
                        </span>
                      </div>
                      <span className="text-[13px] font-medium text-[var(--ink)]/70 truncate">
                        {chip.markLabel}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <SaffronHarakatGlyph
                        baseChar={chip.baseChar}
                        markUnicode={chip.markUnicode}
                        sizeClass="text-[36px]"
                      />
                      {heard && (
                        <Check className="w-4 h-4 text-[var(--good)] shrink-0" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* =====================================================================
            STEP 3: TRACER — REBUILT FOR FIX A & FIX B + PHASE 1.3 & PHASE 2
           ===================================================================== */}
        {currentStepId === 'tracer' && (
          <div className="flex flex-col items-center justify-center gap-2 w-full">
            {debugOverlayOpen && ignoredTouchesLog.length > 0 && (
              <div
                data-testid="tracing-ignored-touches-debug"
                className="w-[88vw] max-w-[336px] rounded-[10px] bg-[#0A1F1B] text-[#F2FAF7] px-2.5 py-1 font-mono text-[13px]"
              >
                Touches ignorées : {ignoredTouchesLog.join(' · ')}
              </div>
            )}

            {/* 2. FIX B: Clean step indicator (no overlap) */}
            <div
              data-testid="tracing-step-indicator"
              className="w-full flex flex-col items-center justify-center gap-1"
            >
              <div
                data-testid="tracing-step-indicator-row"
                className="flex items-center justify-center"
              >
                {tracingSubSteps.map((stepItem, idx) => {
                  const isDone = traceDoneWithStar || idx < subStepIdx;
                  const isCurrent = !traceDoneWithStar && idx === subStepIdx;
                  return (
                    <React.Fragment key={stepItem.id}>
                      {idx > 0 && (
                        <div
                          data-testid={`tracing-step-connector-${idx}`}
                          className={`w-[8px] h-[2px] shrink-0 ${
                            idx <= subStepIdx || traceDoneWithStar
                              ? 'bg-[var(--good)]'
                              : 'bg-[var(--line)]'
                          }`}
                        />
                      )}
                      <div
                        data-testid={`tracing-step-circle-${idx + 1}`}
                        data-state={
                          isDone ? 'done' : isCurrent ? 'current' : 'next'
                        }
                        className={`w-[28px] h-[28px] rounded-full flex items-center justify-center text-[13px] font-bold shrink-0 select-none ${
                          isDone
                            ? 'bg-[var(--good)] text-white'
                            : isCurrent
                            ? 'bg-[var(--accent)] text-[var(--accent-ink)]'
                            : 'bg-[var(--surface)] border-2 border-[var(--line)] text-[var(--ink)]/70'
                        }`}
                      >
                        {isDone ? (
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                        ) : (
                          <span>{idx + 1}</span>
                        )}
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>

              <div
                data-testid="tracing-substep-label"
                className="text-[13px] font-bold text-[var(--ink)] leading-tight text-center whitespace-nowrap select-none"
              >
                {currentSubStep.labelFr}
              </div>
            </div>

            {/* 3. The canvas: the hero, at least 85 percent of the screen width, square, centered */}
            <div
              data-testid="tracing-hero-container"
              className={`relative w-[88vw] max-w-[336px] aspect-square rounded-[26px] bg-[var(--surface)] border-2 transition-all touch-none select-none overflow-hidden mx-auto ${
                flashGreen
                  ? 'border-[var(--good)] ring-4 ring-[var(--good)]/30'
                  : shakeCanvas
                  ? 'border-[var(--bad)] animate-shake'
                  : 'border-[var(--line)]'
              }`}
            >
              {/* Underlying SVG Layer */}
              <svg
                viewBox={glyph.viewBox}
                className="absolute inset-0 w-full h-full pointer-events-none"
              >
                {/* Baseline always visible */}
                <line
                  x1="20"
                  y1={glyph.baseline}
                  x2="180"
                  y2={glyph.baseline}
                  stroke="var(--line)"
                  strokeWidth="1.5"
                  strokeDasharray="5 5"
                />

                {/* PHASE C1: Ghost ("Fantôme") previous attempt faded behind current one */}
                {ghostEnabled && ghostSvgPath && (
                  <path
                    data-testid="practice-ghost-path"
                    d={ghostSvgPath}
                    fill="none"
                    stroke="#FFB400"
                    strokeWidth={12}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={0.35}
                  />
                )}

                {/* Phase 1.3: Font body outline guide (light grey in body step, solid #07463D in dot step) */}
                {useFontRenderMode && currentSubStep.kind === 'dot' && (
                  <path
                    data-testid="tracer-font-body-completed"
                    d={fontOutline.bodyPath}
                    fill="#07463D"
                  />
                )}
                {useFontRenderMode &&
                  currentSubStep.kind === 'body' &&
                  traceMode !== 3 && (
                    <path
                      data-testid="tracer-font-body-guide"
                      d={fontOutline.bodyPath}
                      fill="#07463D"
                      opacity={traceMode === 2 ? 0.2 : 0.25}
                    />
                  )}

                {/* 1. Completed body strokes stay drawn in dark green (#07463D) */}
                {bodyStrokes.map((bs, idx) => {
                  const isCompletedBodyStroke =
                    currentSubStep.kind === 'dot' || idx < subStepIdx;
                  if (!isCompletedBodyStroke) return null;
                  return (
                    <path
                      key={`done_body_${bs.id}`}
                      data-testid={`completed-body-stroke-${bs.id}`}
                      d={bs.d}
                      fill="none"
                      stroke="#07463D"
                      strokeWidth={bs.width}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity={useFontRenderMode && currentSubStep.kind === 'dot' ? 0 : 1}
                    />
                  );
                })}

                {/* 2. Active Body Stroke Guide (ONLY when currentSubStep.kind === 'body' and traceMode !== 3) */}
                {currentSubStep.kind === 'body' &&
                  traceMode !== 3 &&
                  (() => {
                    const bs = currentSubStep.stroke;
                    const arrow = getDirectionArrowForStroke(bs);
                    return (
                      <g
                        key={`guide_body_${bs.id}`}
                        opacity={traceMode === 2 ? 0.2 : 1}
                      >
                        <path
                          data-testid="smooth-guide-path"
                          d={bs.d}
                          fill="none"
                          stroke="#C9D6D1"
                          strokeWidth={14}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          opacity={useFontRenderMode ? 0.45 : 1}
                        />

                        {traceMode === 1 && (
                          <>
                            <g
                              transform={`translate(${arrow.x}, ${arrow.y}) rotate(${arrow.angleDeg})`}
                            >
                              <path
                                d="M -6 -5 L 4 0 L -6 5"
                                fill="none"
                                stroke="#0B6B5D"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </g>
                            <circle
                              cx={bs.startDot[0]}
                              cy={bs.startDot[1]}
                              r="10"
                              fill="var(--accent)"
                            />
                            <text
                              x={bs.startDot[0]}
                              y={bs.startDot[1] + 4}
                              textAnchor="middle"
                              fontSize="13"
                              fontWeight="bold"
                              fill="var(--accent-ink)"
                            >
                              {subStepIdx + 1}
                            </text>
                          </>
                        )}
                      </g>
                    );
                  })()}

                {/* 3. FIX A & FIX B + PHASE 2.2: Each dot step shows ONLY its own target with >= 48px invisible hit halo */}
                {currentSubStep.kind === 'dot' &&
                  (traceMode === 1 ||
                    traceMode === 2 ||
                    revealDotTargetBriefly) &&
                  (() => {
                    const ds = currentSubStep.dot;
                    const targetOpacity =
                      traceMode === 1 ? 1 : traceMode === 2 ? 0.2 : 0.75;
                    return (
                      <g
                        key={`target_dot_${ds.id}`}
                        data-testid={`dot-target-circle-${ds.id}`}
                        transform={`translate(${ds.at[0]}, ${ds.at[1]})`}
                        opacity={targetOpacity}
                      >
                        {/* Phase 2.2: Invisible >= 48px hit target halo (r=24 in 200u viewBox = 48u diameter >= 76px on screen) */}
                        <circle
                          data-testid={`dot-hit-halo-${ds.id}`}
                          cx={0}
                          cy={0}
                          r={24}
                          fill="transparent"
                        />
                        <g
                          className={
                            traceMode === 1 ? 'animate-pulse' : undefined
                          }
                        >
                          <circle
                            cx={0}
                            cy={0}
                            r={18}
                            fill="rgba(11, 107, 93, 0.08)"
                            stroke="var(--brand)"
                            strokeWidth="1.5"
                            strokeDasharray="3 3"
                          />
                          <g transform="rotate(45)">
                            <rect
                              x={-(dotRectSide + 2) / 2}
                              y={-(dotRectSide + 2) / 2}
                              width={dotRectSide + 2}
                              height={dotRectSide + 2}
                              rx="2"
                              fill="none"
                              stroke="var(--brand)"
                              strokeWidth="2"
                              strokeDasharray="3 3"
                            />
                          </g>
                        </g>
                      </g>
                    );
                  })()}

                {/* 4. Learner's snapped dots stay visible in dark green (#07463D) */}
                {(placedDots || []).map((d, i) => {
                  const fontDot = useFontRenderMode ? fontOutline.dots[i] : undefined;
                  return (
                    <g
                      key={`placed_dot_${d.targetId ?? i}_${d.x}_${d.y}`}
                      data-testid={`placed-dot-${i}`}
                      transform={`translate(${d.x}, ${d.y}) rotate(45)`}
                    >
                      <g
                        className="dot-pop"
                        style={{
                          transformBox: 'fill-box',
                          transformOrigin: 'center'
                        }}
                      >
                        {fontDot ? (
                          <g
                            transform={`rotate(-45) translate(${-fontDot.cx}, ${-fontDot.cy})`}
                          >
                            <path
                              d={fontDot.path}
                              fill="#07463D"
                              stroke="#FFFFFF"
                              strokeWidth="2"
                            />
                          </g>
                        ) : (
                          <rect
                            x={-dotRectSide / 2}
                            y={-dotRectSide / 2}
                            width={dotRectSide}
                            height={dotRectSide}
                            rx="1.6"
                            fill="#07463D"
                            stroke="#FFFFFF"
                            strokeWidth="2"
                          />
                        )}
                      </g>
                    </g>
                  );
                })}
              </svg>

              {/* Interactive Pointer Canvas (pointerdown ONLY for dots, ink STAYS after validation) */}
              <canvas
                ref={canvasRef}
                data-testid="tracing-canvas"
                data-dot-taps-received={dotTapsReceivedCount}
                data-dots-counted={(placedDots || []).length}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                className="relative z-10 w-full h-full cursor-crosshair touch-none"
              />
            </div>

            {/* 4. Under the canvas, ONLY three icon buttons with labels: Effacer, Animation, Guide (1/3) */}
            <div
              data-testid="tracing-under-canvas-controls"
              className="w-[88vw] max-w-[336px] grid grid-cols-3 gap-2"
            >
              <button
                type="button"
                data-testid="tracing-clear-btn"
                aria-label="Effacer le tracé"
                onClick={() => resetCurrentSubStep(subStepIdx, traceMode)}
                className="min-h-[50px] px-2 py-1 rounded-[14px] bg-[var(--surface)] border border-[var(--line)] flex flex-col items-center justify-center gap-0.5 pressable cursor-pointer"
              >
                <RotateCcw className="w-4 h-4 text-[var(--ink)] shrink-0" />
                <span className="text-[13px] font-semibold text-[var(--ink)] leading-none whitespace-nowrap">
                  Effacer
                </span>
              </button>

              <button
                type="button"
                data-testid="tracing-anim-btn"
                aria-label="Voir l'animation"
                onClick={() => setStepIdx(0)}
                className="min-h-[50px] px-2 py-1 rounded-[14px] bg-[var(--surface)] border border-[var(--line)] flex flex-col items-center justify-center gap-0.5 pressable cursor-pointer"
              >
                <Play className="w-4 h-4 text-[var(--ink)] shrink-0" />
                <span className="text-[13px] font-semibold text-[var(--ink)] leading-none whitespace-nowrap">
                  Animation
                </span>
              </button>

              <button
                type="button"
                data-testid="tracing-guide-btn"
                aria-label={`Changer le mode de guide (${traceMode}/3)`}
                onClick={() => {
                  const nextM: 1 | 2 | 3 =
                    traceMode === 1 ? 2 : traceMode === 2 ? 3 : 1;
                  resetCurrentSubStep(subStepIdx, nextM);
                }}
                className="min-h-[50px] px-2 py-1 rounded-[14px] bg-[var(--surface)] border border-[var(--line)] flex flex-col items-center justify-center gap-0.5 pressable cursor-pointer"
              >
                <Eye className="w-4 h-4 text-[var(--brand)] shrink-0" />
                <span className="text-[13px] font-semibold text-[var(--ink)] leading-none whitespace-nowrap">
                  Guide ({traceMode}/3)
                </span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: ÉCRIRE SUR PAPIER */}
        {currentStepId === 'ecrire' && (
          <div className="flex flex-col gap-3.5">
            <input
              ref={fileInputCameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoFileSelected}
              className="hidden"
            />
            <input
              ref={fileInputGalleryRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoFileSelected}
              className="hidden"
            />

            <div className="rounded-[18px] bg-[var(--surface)] border border-[var(--line)] overflow-hidden">
              <div className="aspect-video bg-[#07463D] relative flex flex-col items-center justify-center p-4 text-white">
                <span className="font-mono-tag text-[var(--accent)] absolute top-3 left-3">
                  MODÈLE PAPIER · 16:9
                </span>
                <div className="w-48 h-24 rounded-xl bg-white text-[#0A1F1B] flex flex-col justify-center items-center relative shadow-md border-b-2 border-[#0B6B5D]">
                  <span
                    lang="ar"
                    dir="rtl"
                    className="font-arabic text-[52px] leading-none text-[#07463D]"
                  >
                    {letter.arabicChar}
                  </span>
                  <span className="text-[13px] font-mono text-[#0B6B5D] mt-1">
                    Ligne d&apos;écriture
                  </span>
                </div>
              </div>

              <div className="px-4 py-2.5 flex items-center justify-between bg-[var(--surface)] gap-2">
                <span className="text-[13px] font-medium text-[var(--ink)] min-w-0 line-clamp-2">
                  Feuille d&apos;écriture - {letter.shortName}
                </span>
                <button
                  type="button"
                  aria-label="Télécharger la feuille d'écriture"
                  onClick={() => downloadLetterWritingSheet(letter)}
                  className="min-h-[48px] h-[48px] px-3.5 rounded-xl text-[13px] font-bold text-[var(--brand)] flex items-center gap-1.5 pressable cursor-pointer shrink-0"
                >
                  <Download className="w-4 h-4" />
                  <span>Télécharger</span>
                </button>
              </div>
            </div>

            {compressedPreview || existingSubmission ? (
              <div className="rounded-[18px] bg-[var(--surface)] border border-[var(--line)] p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <StatusChip
                    status={existingSubmission?.status || 'pending'}
                    mode={mode}
                  />
                  {compressedPreview && !photoSent && (
                    <button
                      type="button"
                      aria-label="Pivoter la photo de 90 degrés"
                      onClick={() => setPhotoRotation((r) => (r + 90) % 360)}
                      className="min-h-[48px] h-[48px] px-3.5 rounded-xl border border-[var(--line)] text-[13px] font-semibold flex items-center gap-1.5 pressable cursor-pointer"
                    >
                      <RotateCw className="w-4 h-4" />
                      <span>Pivoter</span>
                    </button>
                  )}
                </div>

                <img
                  src={compressedPreview || existingSubmission?.imageRef}
                  alt="Votre écriture sur papier"
                  className="w-full h-36 object-contain rounded-xl bg-[var(--paper)] border border-[var(--line)]"
                />

                {existingSubmission?.comment && (
                  <div className="p-3 rounded-xl bg-[var(--paper)] text-[14px] text-[var(--ink)]">
                    « {existingSubmission.comment} »
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {[
                  { icon: Pencil, label: 'Écris 5 fois' },
                  { icon: AlignJustify, label: 'Lignes droites' },
                  { icon: Sun, label: 'Bonne lumière' }
                ].map((tipItem) => {
                  const Icon = tipItem.icon;
                  return (
                    <div
                      key={tipItem.label}
                      className="rounded-[18px] bg-[var(--surface)] border border-[var(--line)] p-3 flex flex-col items-center text-center gap-1.5"
                    >
                      <Icon className="w-5 h-5 text-[var(--brand)]" />
                      <span className="text-[13px] font-semibold text-[var(--ink)]">
                        {tipItem.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {!photoSent && (
              <SecondaryButton
                icon={<Camera className="w-5 h-5" />}
                onClick={() => fileInputGalleryRef.current?.click()}
              >
                Choisir une photo
              </SecondaryButton>
            )}
          </div>
        )}

        {/* =====================================================================
            STEP 5: RETENIR (PHASE E.3:
            - "Quel mot correspond à la lettre ... ?" shows each option as
              picture + Arabic word with the French word in small text.
            - "Comment s'appelle cette lettre ?" includes a speaker button on each
              option so the learner can hear the name and pick.)
           ===================================================================== */}
        {currentStepId === 'retenir' && (
          <div className="flex flex-col items-center gap-3.5">
            <div className="flex items-center gap-2">
              {mode === 'kids' && (
                <Mascot pose={activeMascotPose} size={42} mode={mode} />
              )}
              {questions.map((q, idx) => (
                <span
                  key={q.id}
                  className={`w-2.5 h-2.5 rounded-full ${
                    idx === quizIdx
                      ? 'bg-[var(--accent)] scale-125'
                      : idx < quizIdx
                      ? 'bg-[var(--good)]'
                      : 'bg-[var(--line)]'
                  }`}
                />
              ))}
            </div>

            <div className="flex flex-col items-center gap-2 text-center min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <h2 className="font-display text-[20px] text-[var(--ink)] line-clamp-2 min-w-0">
                  {questions[quizIdx].promptFr}
                </h2>
                {questions[quizIdx].audioText && (
                  <IconButton
                    ariaLabel="Écouter la question"
                    onClick={() =>
                      speechService.speakArabic(questions[quizIdx].audioText!)
                    }
                  >
                    <Volume2 className="w-5 h-5 text-[var(--brand)]" />
                  </IconButton>
                )}
              </div>

              {questions[quizIdx].promptPicture && (
                <span className="text-[48px] leading-none" aria-hidden="true">
                  {questions[quizIdx].promptPicture}
                </span>
              )}

              {questions[quizIdx].promptArabic && (
                <span
                  lang="ar"
                  dir="rtl"
                  style={{ lineHeight: 1.9 }}
                  className="font-arabic text-[64px] text-[var(--ink)]"
                >
                  {questions[quizIdx].promptArabic}
                </span>
              )}
            </div>

            <div className="w-full grid grid-cols-1 gap-2.5">
              {questions[quizIdx].options.map((opt, idx) => {
                const isSelected = selectedOptIdx === idx;
                const isCorrect = idx === questions[quizIdx].correctIndex;
                let borderStyle = 'border-[var(--line)] bg-[var(--surface)]';
                if (quizAnswered) {
                  if (isCorrect) {
                    borderStyle = 'border-[var(--good)] bg-[var(--good)]/15';
                  } else if (isSelected) {
                    borderStyle = 'border-[var(--bad)] bg-[var(--bad)]/15';
                  }
                } else if (isSelected) {
                  borderStyle = 'border-[var(--brand)] bg-[var(--brand)]/10';
                }

                return (
                  <div
                    key={opt.id}
                    className={`min-h-[60px] w-full rounded-[18px] border-2 px-3 flex items-center justify-between gap-2 transition-all ${borderStyle}`}
                  >
                    <button
                      type="button"
                      data-testid={`quiz-option-${idx}`}
                      disabled={quizAnswered}
                      onClick={() => {
                        setSelectedOptIdx(idx);
                        if (opt.audioText) {
                          speechService.speakArabic(opt.audioText);
                        }
                      }}
                      className="flex-1 min-h-[54px] flex items-center justify-between gap-3 text-left pressable cursor-pointer"
                    >
                      {opt.picture && opt.arabicWord && opt.subLabelFr ? (
                        <div
                          data-testid={`quiz-option-rich-${idx}`}
                          className="flex items-center justify-between w-full gap-3 px-1"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span
                              className="text-[28px] leading-none shrink-0"
                              aria-hidden="true"
                            >
                              {opt.picture}
                            </span>
                            <div className="flex flex-col items-start min-w-0">
                              <span
                                lang="ar"
                                dir="rtl"
                                style={{ lineHeight: 1.6 }}
                                className="font-arabic text-[26px] text-[var(--ink)]"
                              >
                                {opt.arabicWord}
                              </span>
                              <span className="text-[13px] font-medium text-[var(--ink)]/75">
                                {opt.subLabelFr}
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <span
                          lang={opt.isArabic ? 'ar' : 'fr'}
                          dir={opt.isArabic ? 'rtl' : 'ltr'}
                          style={opt.isArabic ? { lineHeight: 1.9 } : undefined}
                          className={
                            opt.isArabic
                              ? 'font-arabic text-[36px] text-[var(--ink)] mx-auto'
                              : 'text-[16px] font-semibold text-[var(--ink)] px-2'
                          }
                        >
                          {opt.label}
                        </span>
                      )}
                    </button>

                    {/* PHASE E.3: Speaker button as an answer mode (hear the name/word and pick) */}
                    {opt.audioText && (
                      <button
                        type="button"
                        data-testid={`quiz-option-speaker-${idx}`}
                        aria-label={`Écouter l'option ${opt.subLabelFr || opt.label}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          speechService.speakArabic(opt.audioText!);
                          if (!quizAnswered) {
                            setSelectedOptIdx(idx);
                          }
                        }}
                        className="w-[48px] h-[48px] min-w-[48px] min-h-[48px] rounded-full bg-[var(--paper)] border border-[var(--line)] flex items-center justify-center text-[var(--brand)] shrink-0 pressable cursor-pointer"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {quizAnswered && (
              <div
                className={`w-full p-3 rounded-[18px] text-center text-[14px] font-bold ${
                  selectedOptIdx === questions[quizIdx].correctIndex
                    ? 'bg-[var(--good)]/15 text-[var(--good)]'
                    : 'bg-[var(--bad)]/15 text-[var(--bad)]'
                }`}
              >
                {selectedOptIdx === questions[quizIdx].correctIndex
                  ? `${t('quiz.right', mode)} ${questions[quizIdx].explanationFr}`
                  : `${t('quiz.wrong', mode)} ${questions[quizIdx].explanationFr}`}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 5. Sticky Bottom Action Bar: the saffron "Valider" / "Suivant" button */}
      <div className="max-w-[480px] w-full mx-auto px-[20px] pt-2 pb-[calc(16px+env(safe-area-inset-bottom))] bg-[var(--paper)] border-t border-[var(--line)] flex items-center gap-3 shrink-0">
        {currentStepId === 'ecrire' && !photoSent && (
          <button
            type="button"
            aria-label="Passer l'étape d'écriture sur papier"
            onClick={() => {
              recordStepDone('ecrire');
              setStepIdx(4);
            }}
            className="min-h-[56px] h-[56px] min-w-[84px] px-4 rounded-[18px] text-[15px] font-semibold text-[var(--ink)] border border-[var(--line)] bg-[var(--surface)] whitespace-nowrap pressable cursor-pointer"
          >
            Passer
          </button>
        )}

        <PrimaryButton
          disabled={primaryAction.disabled}
          onClick={primaryAction.onClick}
        >
          {primaryAction.label}
        </PrimaryButton>
      </div>

      {/* =====================================================================
          PHASE A.6 & E.4: Bottom Sheet "Ton essai"
          ("Pratique", "Fantôme", "Garder", "Recommencer", real coverage/outside/score,
          and 10-attempt history strip appear here AFTER validation or via "..." menu)
         ===================================================================== */}
      <BottomSheet
        isOpen={showTonEssaiSheet}
        onClose={() => setShowTonEssaiSheet(false)}
        title="Ton essai"
      >
        <div
          data-testid="ton-essai-sheet-content"
          className="flex flex-col gap-3.5"
        >
          {/* Real coverage, outside ratio, and score (Phase E.4) */}
          {lastValidatedStroke ? (
            <div
              data-testid="practice-real-metrics"
              className="rounded-[18px] bg-[var(--paper)] border border-[var(--line)] p-3.5 flex items-center justify-between gap-2"
            >
              <div>
                <div className="font-display text-[20px] text-[var(--ink)]">
                  Score : {lastValidatedStroke.score} %
                </div>
                <div className="font-mono-tag text-[13px] text-[var(--ink)]/75">
                  Couverture : {lastValidatedStroke.coverage} % · Hors guide :{' '}
                  {lastValidatedStroke.outside} %
                </div>
              </div>
              <span
                className={`px-3 py-1 rounded-full font-mono-tag text-[13px] font-bold ${
                  lastValidatedStroke.canSave
                    ? 'bg-[var(--good)]/15 text-[var(--good)]'
                    : 'bg-[var(--bad)]/15 text-[var(--bad)]'
                }`}
              >
                {lastValidatedStroke.canSave ? 'Validé (≥ 60 %)' : '< 60 %'}
              </span>
            </div>
          ) : (
            <p className="text-[13px] text-[var(--ink)]/75">
              Trace la lettre puis valide pour mesurer ta précision et garder ton essai.
            </p>
          )}

          {/* Toggles: Pratique & Fantôme */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              data-testid="toggle-practice-mode-btn"
              aria-label="Activer le mode pratique calligraphie"
              onClick={() => setIsPracticeMode((p) => !p)}
              className={`min-h-[48px] h-[48px] px-3 rounded-[14px] text-[13px] font-bold border flex items-center justify-center gap-1.5 pressable cursor-pointer ${
                isPracticeMode
                  ? 'bg-[var(--brand-deep)] text-white border-[var(--brand-deep)]'
                  : 'bg-[var(--paper)] text-[var(--ink)] border-[var(--line)]'
              }`}
            >
              <Pencil className="w-4 h-4 shrink-0" />
              <span>Pratique</span>
            </button>

            <button
              type="button"
              data-testid="practice-ghost-toggle"
              aria-label="Afficher le tracé fantôme précédent"
              onClick={() => setGhostEnabled((g) => !g)}
              className={`min-h-[48px] h-[48px] px-3 rounded-[14px] text-[13px] font-bold border flex items-center justify-center gap-1.5 pressable cursor-pointer ${
                ghostEnabled
                  ? 'bg-[var(--accent)] text-[var(--accent-ink)] border-[var(--accent)]'
                  : 'bg-[var(--paper)] text-[var(--ink)] border-[var(--line)]'
              }`}
            >
              <Ghost className="w-4 h-4 shrink-0" />
              <span>Fantôme</span>
            </button>
          </div>

          {/* Garder (only enabled at >= 60%) & Recommencer */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              data-testid="practice-keep-btn"
              disabled={!lastValidatedStroke || !lastValidatedStroke.canSave}
              aria-label="Garder cet essai dans l'historique"
              onClick={handleKeepPracticeAttempt}
              className="min-h-[48px] h-[48px] px-3 rounded-[14px] bg-[var(--good)]/15 border border-[var(--good)] text-[var(--good)] text-[13px] font-bold flex items-center justify-center gap-1.5 pressable cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
            >
              <BookmarkCheck className="w-4 h-4 shrink-0" />
              <span>
                {lastValidatedStroke?.saved
                  ? 'Gardé ✓'
                  : lastValidatedStroke && !lastValidatedStroke.canSave
                  ? 'Min. 60 %'
                  : 'Garder'}
              </span>
            </button>

            <button
              type="button"
              data-testid="practice-retry-btn"
              aria-label="Recommencer le tracé"
              onClick={() => {
                setShowTonEssaiSheet(false);
                resetCurrentSubStep(subStepIdx, traceMode);
              }}
              className="min-h-[48px] h-[48px] px-3 rounded-[14px] bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] text-[13px] font-bold flex items-center justify-center gap-1.5 pressable cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 shrink-0" />
              <span>Recommencer</span>
            </button>
          </div>

          {/* 10-attempt history strip */}
          {practiceHistory.length > 0 && (
            <div className="space-y-1.5">
              <span className="font-mono-tag text-[13px] text-[var(--ink)]/70">
                HISTORIQUE (10 DERNIERS ESSAIS)
              </span>
              <div
                data-testid="practice-history-strip"
                className="w-full flex items-center gap-2 overflow-x-auto py-1"
              >
                {practiceHistory.slice(-10).map((att) => {
                  const active = selectedHistoryAttemptId === att.id;
                  return (
                    <button
                      key={att.id}
                      type="button"
                      data-testid={`practice-history-item-${att.id}`}
                      aria-label={`Voir l'essai du ${att.date}, score ${att.score} pourcent`}
                      onClick={() => {
                        setSelectedHistoryAttemptId(att.id);
                        setGhostEnabled(true);
                        const canvas = canvasRef.current;
                        const ctx = canvas?.getContext('2d');
                        if (ctx) {
                          ctx.clearRect(0, 0, 200, 200);
                          renderReedPenStrokeOnCanvas(
                            ctx,
                            att.points.map((p) => ({
                              x: p.x,
                              y: p.y,
                              width: 14,
                              inside: true
                            })),
                            '#07463D'
                          );
                        }
                      }}
                      className={`min-w-[84px] min-h-[48px] px-2 py-1 rounded-[12px] border flex items-center gap-1.5 shrink-0 pressable cursor-pointer ${
                        active
                          ? 'bg-[var(--brand)]/15 border-[var(--brand)]'
                          : 'bg-[var(--paper)] border-[var(--line)]'
                      }`}
                    >
                      <MiniTracePreviewSvg points={att.points} size={32} />
                      <div className="flex flex-col items-start leading-tight">
                        <span className="font-mono-tag text-[13px] font-bold text-[var(--good)]">
                          {att.score}%
                        </span>
                        <span className="text-[13px] text-[var(--ink)]/70">
                          {att.date.slice(5)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </BottomSheet>

      {/* Celebration sheet after a letter */}
      <BottomSheet
        isOpen={showCelebrationSheet}
        onClose={onClose}
        title={`Bravo ! ${letter.shortName} est à toi`}
      >
        <div className="flex flex-col items-center gap-4 text-center py-2">
          <Mascot pose="cheer" size={64} mode={mode} />

          <div
            data-testid="celebration-ant-tracer"
            className="w-[144px] h-[144px] rounded-[24px] bg-[var(--paper)] border border-[var(--line)] flex items-center justify-center relative"
          >
            <svg viewBox={glyph.viewBox} className="w-full h-full">
              {useFontRenderMode ? (
                <>
                  <path d={fontOutline.bodyPath} fill="#07463D" />
                  {fontOutline.dots.map((d, idx) => (
                    <path key={idx} d={d.path} fill="#07463D" />
                  ))}
                </>
              ) : (
                <>
                  {bodyStrokes.map((bs) => (
                    <path
                      key={bs.id}
                      d={bs.d}
                      pathLength={1}
                      fill="none"
                      stroke="#07463D"
                      strokeWidth={bs.width}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ))}
                  {dotStrokes.map((ds) => (
                    <circle
                      key={ds.id}
                      cx={ds.at[0]}
                      cy={ds.at[1]}
                      r={ds.radius}
                      fill="#07463D"
                    />
                  ))}
                </>
              )}
              {bodyStrokes[0] && (
                <g
                  transform={`translate(${bodyStrokes[0].startDot[0]}, ${bodyStrokes[0].startDot[1]})`}
                >
                  <circle cx="-5" cy="1" r="4" fill="#07463D" />
                  <circle cx="0" cy="0.5" r="3" fill="#0B6B5D" />
                  <circle
                    cx="5"
                    cy="-1"
                    r="4.5"
                    fill="#FFB400"
                    stroke="#0A1F1B"
                    strokeWidth="1.2"
                  />
                </g>
              )}
            </svg>
          </div>

          <StarRating stars={earnedStars} />

          <div className="flex items-center justify-center gap-3">
            <div className="px-3.5 py-1.5 rounded-full bg-[var(--accent)]/20 text-[var(--accent-ink)] dark:text-[var(--accent)] font-mono-tag font-bold flex items-center gap-1.5 animate-pulse-once">
              <Star className="w-4 h-4 fill-current" />
              <span>+{earnedStars} étoiles</span>
            </div>
            <div className="px-3.5 py-1.5 rounded-full bg-[var(--good)]/15 text-[var(--good)] font-mono-tag font-bold flex items-center gap-1.5 animate-pulse-once">
              <Flame className="w-4 h-4 fill-current" />
              <span>Série +1</span>
            </div>
          </div>

          {/* Phase 4.5: One-tap rating (3 faces) saved with letterId and date */}
          <div
            data-testid="letter-rating-bar"
            className="w-full rounded-[18px] bg-[var(--paper)] border border-[var(--line)] p-3 flex flex-col items-center gap-2"
          >
            <span className="text-[13px] font-bold text-[var(--ink)]">
              Comment s&apos;est passée cette lettre ?
            </span>
            <div className="grid grid-cols-3 gap-2 w-full">
              {(
                [
                  { id: 'good', face: '😊', label: 'Facile' },
                  { id: 'neutral', face: '😐', label: 'Moyen' },
                  { id: 'hard', face: '😕', label: 'Difficile' }
                ] as const
              ).map((item) => {
                const selected = letterRating === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    data-testid={`letter-rating-btn-${item.id}`}
                    aria-label={`Noter cette lettre : ${item.label}`}
                    onClick={() => {
                      setLetterRating(item.id);
                      onRateLetter?.(letter.id, item.id);
                      speechService.triggerHaptic('stroke_ok');
                    }}
                    className={`min-h-[48px] px-2 py-1.5 rounded-[14px] border-2 flex items-center justify-center gap-1.5 text-[13px] font-bold pressable cursor-pointer ${
                      selected
                        ? 'bg-[var(--brand)]/15 border-[var(--brand)] text-[var(--brand)]'
                        : 'bg-[var(--surface)] border-[var(--line)] text-[var(--ink)]'
                    }`}
                  >
                    <span className="text-[18px] leading-none" aria-hidden="true">
                      {item.face}
                    </span>
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {nextLetterInCourse && (
            <div className="w-full rounded-[18px] bg-[var(--paper)] border border-[var(--line)] px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <Lock className="w-4 h-4 text-[var(--locked)] shrink-0" />
                <span className="text-[14px] font-semibold text-[var(--ink)] truncate">
                  Demain : {nextLetterInCourse.shortName}
                </span>
              </div>
              <span
                lang="ar"
                dir="rtl"
                aria-hidden="true"
                style={{ filter: 'blur(6px)' }}
                className="font-arabic text-[32px] text-[var(--ink)]/70 select-none leading-none shrink-0"
              >
                {nextLetterInCourse.arabicChar}
              </span>
            </div>
          )}

          {onOpenShareSheet && (
            <button
              type="button"
              aria-label="Partager mes progrès"
              onClick={onOpenShareSheet}
              className="w-full min-h-[48px] h-[48px] px-4 rounded-[16px] bg-[var(--paper)] border border-[var(--line)] text-[14px] font-bold text-[var(--brand)] flex items-center justify-center gap-2 pressable cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              <span>Partager</span>
            </button>
          )}

          <div className="w-full space-y-2.5 pt-1">
            <PrimaryButton onClick={onNextLetter}>
              Lettre suivante
            </PrimaryButton>
            <SecondaryButton onClick={onClose}>
              Retour
            </SecondaryButton>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
