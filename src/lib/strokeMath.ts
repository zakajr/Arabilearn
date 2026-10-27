import { LearnerMode, t } from '../data/copyDeck';

export interface Point2D {
  x: number;
  y: number;
}

export type DotArrangement = 'none' | 'single' | 'row' | 'triangle_up';

/**
 * Phase D.2: Stroke width about 7 percent of the 200-unit viewBox height (14 units = 7.0%).
 */
export const DEFAULT_GLYPH_STROKE_WIDTH = 14;

/**
 * Phase C: A dot is a small diamond (square rotated 45 degrees), size about 0.9 x stroke width.
 */
export function getDotSize(strokeWidth = DEFAULT_GLYPH_STROKE_WIDTH): number {
  return Number((0.9 * strokeWidth).toFixed(2));
}

/**
 * Half-diagonal of the diamond dot.
 * For a diamond whose visual span across the stroke is 0.9 * strokeWidth (13.5 units for width 15),
 * the half-diagonal from center to vertex is (0.9 * strokeWidth) / 2 = 6.75 units,
 * and the unrotated SVG rect side is (0.9 * strokeWidth) / Math.SQRT2 ≈ 9.55 units.
 */
export function getDotHalfDiagonal(strokeWidth = DEFAULT_GLYPH_STROKE_WIDTH): number {
  return Number(((0.9 * strokeWidth) / 2).toFixed(2));
}

export function getDotRectSide(strokeWidth = DEFAULT_GLYPH_STROKE_WIDTH): number {
  return Number(((0.9 * strokeWidth) / Math.SQRT2).toFixed(2));
}

export interface GlyphBodyStroke {
  id: number;
  kind: 'body';
  d: string;
  width: number;
  corridor: number;
  startDot: [number, number];
  direction: 'rtl' | 'ltr' | 'down';
}

export interface GlyphDotStroke {
  id: number;
  kind: 'dot';
  at: [number, number];
  radius: number;
  size?: number;
  arrangement?: DotArrangement;
}

export type GlyphStroke = GlyphBodyStroke | GlyphDotStroke;

export interface GlyphForm {
  letterId: string;
  form: 'isolated' | 'initial' | 'medial' | 'final';
  viewBox: string;
  baseline: number;
  strokes: GlyphStroke[];
  dotRule: {
    count: number;
    position: 'above' | 'below' | 'inside' | 'none';
    arrangement?: DotArrangement;
    size?: number;
  };
  status?: 'draft' | 'validated' | 'brouillon' | 'valide';
}

export type TraceFailReason =
  | 'trop_court'
  | 'sort_du_guide'
  | 'mauvais_sens'
  | 'points_manquants'
  | 'points_de_trop';

export interface TraceValidationResult {
  passed: boolean;
  bodyPassed: boolean;
  dotsPassed: boolean;
  coverage: number; // 0..100
  outside: number;  // 0..100
  reason?: TraceFailReason;
  messageFr: string;
}

export type TracingSubStep =
  | {
      stepIndex: number;
      totalSteps: number;
      kind: 'body';
      bodyStrokeIndex: number;
      totalBodyStrokes: number;
      labelFr: string; // e.g. "Trait 1/2", "Trait 2/2"
      stroke: GlyphBodyStroke;
    }
  | {
      stepIndex: number;
      totalSteps: number;
      kind: 'dots';
      labelFr: string; // "Points"
      dots: GlyphDotStroke[];
      dotStrokes: GlyphDotStroke[];
      expectedCount: number;
      position: 'above' | 'below' | 'inside' | 'none';
    };

/**
 * Builds the data-driven sequence of tracing steps for a GlyphForm (Section B1 & B2):
 * Body stroke(s) first ("Trait 1/N", "Trait 2/N"), then a DOTS step ("Points") if dots > 0.
 * Total steps = bodyStrokes.length + (dots > 0 ? 1 : 0).
 */
export function buildTracingSubSteps(glyph: GlyphForm): TracingSubStep[] {
  const bodyStrokes = glyph.strokes.filter(
    (s): s is GlyphBodyStroke => s.kind === 'body'
  );
  const dotStrokes = glyph.strokes.filter(
    (s): s is GlyphDotStroke => s.kind === 'dot'
  );
  const hasDots = glyph.dotRule.count > 0 && dotStrokes.length > 0;
  const totalSteps = bodyStrokes.length + (hasDots ? 1 : 0);

  const steps: TracingSubStep[] = bodyStrokes.map((stroke, idx) => ({
    stepIndex: idx,
    totalSteps,
    kind: 'body',
    bodyStrokeIndex: idx,
    totalBodyStrokes: bodyStrokes.length,
    labelFr: `Trait ${idx + 1}/${totalSteps}`,
    stroke
  }));

  if (hasDots) {
    steps.push({
      stepIndex: bodyStrokes.length,
      totalSteps,
      kind: 'dots',
      labelFr: 'Points',
      dots: dotStrokes,
      dotStrokes,
      expectedCount: glyph.dotRule.count,
      position: glyph.dotRule.position
    });
  }

  return steps;
}

/**
 * Parses an SVG path string (M, L, Q, C commands) and samples `numSamples`
 * equal-length points along the path. Works in both Browser and Node.js test environments.
 */
export function sampleSvgPathEqualLength(d: string, numSamples = 64): Point2D[] {
  const tokens = d
    .replace(/,/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const rawPoints: Point2D[] = [];
  let i = 0;
  let current: Point2D = { x: 100, y: 100 };

  const pushLinear = (p0: Point2D, p1: Point2D, steps = 24) => {
    for (let s = 1; s <= steps; s++) {
      const tVal = s / steps;
      rawPoints.push({
        x: p0.x + (p1.x - p0.x) * tVal,
        y: p0.y + (p1.y - p0.y) * tVal
      });
    }
  };

  const pushQuadratic = (p0: Point2D, p1: Point2D, p2: Point2D, steps = 32) => {
    for (let s = 1; s <= steps; s++) {
      const tVal = s / steps;
      const inv = 1 - tVal;
      rawPoints.push({
        x: inv * inv * p0.x + 2 * inv * tVal * p1.x + tVal * tVal * p2.x,
        y: inv * inv * p0.y + 2 * inv * tVal * p1.y + tVal * tVal * p2.y
      });
    }
  };

  const pushCubic = (
    p0: Point2D,
    p1: Point2D,
    p2: Point2D,
    p3: Point2D,
    steps = 40
  ) => {
    for (let s = 1; s <= steps; s++) {
      const tVal = s / steps;
      const inv = 1 - tVal;
      rawPoints.push({
        x:
          inv * inv * inv * p0.x +
          3 * inv * inv * tVal * p1.x +
          3 * inv * tVal * tVal * p2.x +
          tVal * tVal * tVal * p3.x,
        y:
          inv * inv * inv * p0.y +
          3 * inv * inv * tVal * p1.y +
          3 * inv * tVal * tVal * p2.y +
          tVal * tVal * tVal * p3.y
      });
    }
  };

  let cmd = '';
  while (i < tokens.length) {
    const token = tokens[i];
    if (/^[MLQCZmlqcz]$/.test(token)) {
      cmd = token.toUpperCase();
      i++;
    }
    if (cmd === 'M') {
      const x = parseFloat(tokens[i++]);
      const y = parseFloat(tokens[i++]);
      current = { x, y };
      rawPoints.push(current);
      cmd = 'L';
    } else if (cmd === 'L') {
      const x = parseFloat(tokens[i++]);
      const y = parseFloat(tokens[i++]);
      const next = { x, y };
      pushLinear(current, next);
      current = next;
    } else if (cmd === 'Q') {
      const x1 = parseFloat(tokens[i++]);
      const y1 = parseFloat(tokens[i++]);
      const x = parseFloat(tokens[i++]);
      const y = parseFloat(tokens[i++]);
      const next = { x, y };
      pushQuadratic(current, { x: x1, y: y1 }, next);
      current = next;
    } else if (cmd === 'C') {
      const x1 = parseFloat(tokens[i++]);
      const y1 = parseFloat(tokens[i++]);
      const x2 = parseFloat(tokens[i++]);
      const y2 = parseFloat(tokens[i++]);
      const x = parseFloat(tokens[i++]);
      const y = parseFloat(tokens[i++]);
      const next = { x, y };
      pushCubic(current, { x: x1, y: y1 }, { x: x2, y: y2 }, next);
      current = next;
    } else {
      i++;
    }
  }

  if (rawPoints.length === 0) {
    return Array.from({ length: numSamples }, () => ({ x: 100, y: 100 }));
  }
  if (rawPoints.length === 1) {
    return Array.from({ length: numSamples }, () => rawPoints[0]);
  }

  const cumLengths: number[] = [0];
  for (let k = 1; k < rawPoints.length; k++) {
    const dx = rawPoints[k].x - rawPoints[k - 1].x;
    const dy = rawPoints[k].y - rawPoints[k - 1].y;
    cumLengths.push(cumLengths[k - 1] + Math.hypot(dx, dy));
  }
  const totalLength = cumLengths[cumLengths.length - 1];
  if (totalLength < 1e-3) {
    return Array.from({ length: numSamples }, () => rawPoints[0]);
  }

  const sampled: Point2D[] = [];
  for (let s = 0; s < numSamples; s++) {
    const targetDist = (s / (numSamples - 1)) * totalLength;
    let idx = 0;
    while (idx < cumLengths.length - 2 && cumLengths[idx + 1] < targetDist) {
      idx++;
    }
    const segStart = cumLengths[idx];
    const segEnd = cumLengths[idx + 1];
    const ratio = segEnd > segStart ? (targetDist - segStart) / (segEnd - segStart) : 0;
    sampled.push({
      x: rawPoints[idx].x + (rawPoints[idx + 1].x - rawPoints[idx].x) * ratio,
      y: rawPoints[idx].y + (rawPoints[idx + 1].y - rawPoints[idx].y) * ratio
    });
  }

  return sampled;
}

export function computeSvgPathLength(d: string): number {
  const samples = sampleSvgPathEqualLength(d, 96);
  let len = 0;
  for (let i = 1; i < samples.length; i++) {
    len += Math.hypot(samples[i].x - samples[i - 1].x, samples[i].y - samples[i - 1].y);
  }
  return Number(len.toFixed(1));
}

export function getPointAndTangentAtNormalizedProgress(
  d: string,
  tNormalized: number
): { x: number; y: number; angleDeg: number } {
  const samples = sampleSvgPathEqualLength(d, 100);
  const clamped = Math.max(0, Math.min(1, tNormalized));
  const exactIdx = clamped * (samples.length - 1);
  const idx0 = Math.floor(exactIdx);
  const idx1 = Math.min(samples.length - 1, idx0 + 1);
  const frac = exactIdx - idx0;
  const x = samples[idx0].x + (samples[idx1].x - samples[idx0].x) * frac;
  const y = samples[idx0].y + (samples[idx1].y - samples[idx0].y) * frac;

  const prevIdx = Math.max(0, Math.round(exactIdx) - 2);
  const nextIdx = Math.min(samples.length - 1, Math.round(exactIdx) + 2);
  const dx = samples[nextIdx].x - samples[prevIdx].x;
  const dy = samples[nextIdx].y - samples[prevIdx].y;
  const angleDeg = Number(((Math.atan2(dy, dx) * 180) / Math.PI).toFixed(1));

  return { x: Number(x.toFixed(2)), y: Number(y.toFixed(2)), angleDeg };
}

/**
 * Detects whether a stroke has a sharp corner (turn > 42 deg) and returns its normalized progress (0.15..0.85).
 */
export function detectSharpCornerNormalizedProgress(d: string): number | null {
  const samples = sampleSvgPathEqualLength(d, 48);
  let maxTurn = 0;
  let bestIdx = -1;
  for (let i = 6; i < samples.length - 6; i++) {
    const a1 = Math.atan2(samples[i].y - samples[i - 4].y, samples[i].x - samples[i - 4].x);
    const a2 = Math.atan2(samples[i + 4].y - samples[i].y, samples[i + 4].x - samples[i].x);
    let diff = Math.abs(a2 - a1);
    if (diff > Math.PI) diff = 2 * Math.PI - diff;
    const deg = (diff * 180) / Math.PI;
    if (deg > 42 && deg > maxTurn) {
      maxTurn = deg;
      bestIdx = i;
    }
  }
  if (bestIdx === -1) return null;
  return Number((bestIdx / (samples.length - 1)).toFixed(2));
}

export interface TimelineEvaluation {
  progress: number; // 0..1 single source of truth
  totalDurationMs: number;
  activeStrokeIndex: number;
  strokeProgresses: number[]; // 0..1 per body stroke
  pathLengths: number[];
  ant: {
    x: number;
    y: number;
    angleDeg: number;
    isMoving: boolean;
    isCornerPause: boolean;
    isStrokeEndBounce: boolean;
    isFinishedJump: boolean;
    isCarryingDot: boolean;
    carriedDotIndex: number;
  };
  dots: Array<{
    id: number;
    x: number;
    y: number;
    visible: boolean;
    scale: number;
  }>;
}

/**
 * Phase A, C, D:
 * Single source of truth timeline evaluator.
 * Given a glyph and a single normalized `progress` (0..1), computes:
 * - Stroke dashoffset progress (0..1) for each body stroke
 * - Ant position (x, y), tangent rotation (angleDeg), walk cycle state (isMoving),
 *   150ms corner pause, end-of-stroke bounce, dot-carrying from the side, and final jump
 * - Dot visibility and pop scale (1.3 -> 1.0)
 */
export function evaluateGlyphAnimationAtProgress(
  glyph: GlyphForm,
  rawProgress: number
): TimelineEvaluation {
  const progress = Math.max(0, Math.min(1, rawProgress));
  const bodyStrokes = glyph.strokes.filter(
    (s): s is GlyphBodyStroke => s.kind === 'body'
  );
  const dotStrokes = glyph.strokes.filter(
    (s): s is GlyphDotStroke => s.kind === 'dot'
  );

  const pathLengths = bodyStrokes.map((s) => Math.max(20, computeSvgPathLength(s.d)));

  // Build segments on a millisecond timeline
  type Segment =
    | {
        type: 'stroke_draw';
        strokeIdx: number;
        startMs: number;
        endMs: number;
        fromT: number;
        toT: number;
      }
    | {
        type: 'corner_pause';
        strokeIdx: number;
        startMs: number;
        endMs: number;
        atT: number;
      }
    | {
        type: 'stroke_end_pause';
        strokeIdx: number;
        startMs: number;
        endMs: number;
      }
    | {
        type: 'inter_stroke_pause';
        strokeIdx: number;
        startMs: number;
        endMs: number;
      }
    | {
        type: 'dot_carry';
        dotIdx: number;
        startMs: number;
        endMs: number;
        fromX: number;
        fromY: number;
        toX: number;
        toY: number;
      }
    | {
        type: 'dot_pop';
        dotIdx: number;
        startMs: number;
        endMs: number;
        x: number;
        y: number;
      };

  const segments: Segment[] = [];
  let cursorMs = 0;

  bodyStrokes.forEach((stroke, idx) => {
    const len = pathLengths[idx];
    // Phase A: duration proportional to length (about 700 ms per 100 units, min 500 ms)
    const drawMs = Math.max(500, Math.round((len / 100) * 700));
    const cornerT = detectSharpCornerNormalizedProgress(stroke.d);

    if (cornerT !== null && cornerT > 0.15 && cornerT < 0.85) {
      const firstMs = Math.round(drawMs * cornerT);
      const secondMs = Math.max(120, drawMs - firstMs);
      segments.push({
        type: 'stroke_draw',
        strokeIdx: idx,
        startMs: cursorMs,
        endMs: cursorMs + firstMs,
        fromT: 0,
        toT: cornerT
      });
      cursorMs += firstMs;
      // Phase D: short pause (150 ms) at corners
      segments.push({
        type: 'corner_pause',
        strokeIdx: idx,
        startMs: cursorMs,
        endMs: cursorMs + 150,
        atT: cornerT
      });
      cursorMs += 150;
      segments.push({
        type: 'stroke_draw',
        strokeIdx: idx,
        startMs: cursorMs,
        endMs: cursorMs + secondMs,
        fromT: cornerT,
        toT: 1
      });
      cursorMs += secondMs;
    } else {
      segments.push({
        type: 'stroke_draw',
        strokeIdx: idx,
        startMs: cursorMs,
        endMs: cursorMs + drawMs,
        fromT: 0,
        toT: 1
      });
      cursorMs += drawMs;
    }

    // Phase D: short pause (150 ms) at stroke end + small bounce
    segments.push({
      type: 'stroke_end_pause',
      strokeIdx: idx,
      startMs: cursorMs,
      endMs: cursorMs + 150
    });
    cursorMs += 150;

    // Phase A: 250 ms pause between strokes
    if (idx < bodyStrokes.length - 1) {
      segments.push({
        type: 'inter_stroke_pause',
        strokeIdx: idx,
        startMs: cursorMs,
        endMs: cursorMs + 250
      });
      cursorMs += 250;
    }
  });

  // Phase C: After the last stroke, the ant carries each dot (crumb) from the side,
  // walks to its place and drops it with a small pop (scale 1.3 -> 1)
  dotStrokes.forEach((dot, dIdx) => {
    const [tx, ty] = dot.at;
    const fromX = tx >= 100 ? 186 : 14;
    const fromY = Math.max(24, Math.min(176, ty - 12));
    const carryMs = 380;
    const popMs = 180;
    segments.push({
      type: 'dot_carry',
      dotIdx: dIdx,
      startMs: cursorMs,
      endMs: cursorMs + carryMs,
      fromX,
      fromY,
      toX: tx,
      toY: ty
    });
    cursorMs += carryMs;
    segments.push({
      type: 'dot_pop',
      dotIdx: dIdx,
      startMs: cursorMs,
      endMs: cursorMs + popMs,
      x: tx,
      y: ty
    });
    cursorMs += popMs;
  });

  const totalDurationMs = Math.max(500, cursorMs);
  const currentMs = progress * totalDurationMs;

  const strokeProgresses = bodyStrokes.map(() => 0);
  const dotsState = dotStrokes.map((d) => ({
    id: d.id,
    x: d.at[0],
    y: d.at[1],
    visible: false,
    scale: 1
  }));

  if (bodyStrokes.length === 0) {
    return {
      progress,
      totalDurationMs,
      activeStrokeIndex: 0,
      strokeProgresses: [],
      pathLengths: [],
      ant: {
        x: 100,
        y: 100,
        angleDeg: 0,
        isMoving: false,
        isCornerPause: false,
        isStrokeEndBounce: false,
        isFinishedJump: progress >= 1,
        isCarryingDot: false,
        carriedDotIndex: -1
      },
      dots: dotsState
    };
  }

  // Initial state at progress === 0: empty guide, ant parked at start of stroke 0
  if (progress <= 0) {
    const startSample = getPointAndTangentAtNormalizedProgress(bodyStrokes[0].d, 0);
    return {
      progress: 0,
      totalDurationMs,
      activeStrokeIndex: 0,
      strokeProgresses,
      pathLengths,
      ant: {
        x: startSample.x,
        y: startSample.y,
        angleDeg: startSample.angleDeg,
        isMoving: false,
        isCornerPause: false,
        isStrokeEndBounce: false,
        isFinishedJump: false,
        isCarryingDot: false,
        carriedDotIndex: -1
      },
      dots: dotsState
    };
  }

  let activeStrokeIndex = 0;
  const firstSample = getPointAndTangentAtNormalizedProgress(bodyStrokes[0].d, 0);
  let antState = {
    x: firstSample.x,
    y: firstSample.y,
    angleDeg: firstSample.angleDeg,
    isMoving: false,
    isCornerPause: false,
    isStrokeEndBounce: false,
    isFinishedJump: false,
    isCarryingDot: false,
    carriedDotIndex: -1
  };

  for (const seg of segments) {
    if (currentMs >= seg.endMs) {
      if (seg.type === 'stroke_draw') {
        strokeProgresses[seg.strokeIdx] = seg.toT;
        activeStrokeIndex = seg.strokeIdx;
      } else if (seg.type === 'dot_pop') {
        dotsState[seg.dotIdx].visible = true;
        dotsState[seg.dotIdx].scale = 1;
      }
      continue;
    }

    if (currentMs >= seg.startMs && currentMs <= seg.endMs) {
      const segSpan = Math.max(1, seg.endMs - seg.startMs);
      const localRatio = Math.max(0, Math.min(1, (currentMs - seg.startMs) / segSpan));

      if (seg.type === 'stroke_draw') {
        const strokeT = seg.fromT + (seg.toT - seg.fromT) * localRatio;
        strokeProgresses[seg.strokeIdx] = Number(strokeT.toFixed(4));
        activeStrokeIndex = seg.strokeIdx;
        const pt = getPointAndTangentAtNormalizedProgress(
          bodyStrokes[seg.strokeIdx].d,
          strokeT
        );
        antState = {
          x: pt.x,
          y: pt.y,
          angleDeg: pt.angleDeg,
          isMoving: true,
          isCornerPause: false,
          isStrokeEndBounce: false,
          isFinishedJump: false,
          isCarryingDot: false,
          carriedDotIndex: -1
        };
      } else if (seg.type === 'corner_pause') {
        strokeProgresses[seg.strokeIdx] = seg.atT;
        activeStrokeIndex = seg.strokeIdx;
        const pt = getPointAndTangentAtNormalizedProgress(
          bodyStrokes[seg.strokeIdx].d,
          seg.atT
        );
        antState = {
          x: pt.x,
          y: pt.y,
          angleDeg: pt.angleDeg,
          isMoving: false,
          isCornerPause: true,
          isStrokeEndBounce: false,
          isFinishedJump: false,
          isCarryingDot: false,
          carriedDotIndex: -1
        };
      } else if (seg.type === 'stroke_end_pause') {
        strokeProgresses[seg.strokeIdx] = 1;
        activeStrokeIndex = seg.strokeIdx;
        const pt = getPointAndTangentAtNormalizedProgress(
          bodyStrokes[seg.strokeIdx].d,
          1
        );
        antState = {
          x: pt.x,
          y: pt.y,
          angleDeg: pt.angleDeg,
          isMoving: false,
          isCornerPause: false,
          isStrokeEndBounce: true,
          isFinishedJump: false,
          isCarryingDot: false,
          carriedDotIndex: -1
        };
      } else if (seg.type === 'inter_stroke_pause') {
        strokeProgresses[seg.strokeIdx] = 1;
        const nextIdx = Math.min(bodyStrokes.length - 1, seg.strokeIdx + 1);
        activeStrokeIndex = nextIdx;
        const pFrom = getPointAndTangentAtNormalizedProgress(
          bodyStrokes[seg.strokeIdx].d,
          1
        );
        const pTo = getPointAndTangentAtNormalizedProgress(
          bodyStrokes[nextIdx].d,
          0
        );
        const x = pFrom.x + (pTo.x - pFrom.x) * localRatio;
        const y = pFrom.y + (pTo.y - pFrom.y) * localRatio;
        const angleDeg = Number(
          ((Math.atan2(pTo.y - pFrom.y, pTo.x - pFrom.x) * 180) / Math.PI).toFixed(1)
        );
        antState = {
          x: Number(x.toFixed(2)),
          y: Number(y.toFixed(2)),
          angleDeg,
          isMoving: true,
          isCornerPause: false,
          isStrokeEndBounce: false,
          isFinishedJump: false,
          isCarryingDot: false,
          carriedDotIndex: -1
        };
      } else if (seg.type === 'dot_carry') {
        activeStrokeIndex = bodyStrokes.length - 1;
        const x = seg.fromX + (seg.toX - seg.fromX) * localRatio;
        const y = seg.fromY + (seg.toY - seg.fromY) * localRatio;
        const angleDeg = Number(
          ((Math.atan2(seg.toY - seg.fromY, seg.toX - seg.fromX) * 180) / Math.PI).toFixed(1)
        );
        antState = {
          x: Number(x.toFixed(2)),
          y: Number(y.toFixed(2)),
          angleDeg,
          isMoving: true,
          isCornerPause: false,
          isStrokeEndBounce: false,
          isFinishedJump: false,
          isCarryingDot: true,
          carriedDotIndex: seg.dotIdx
        };
      } else if (seg.type === 'dot_pop') {
        activeStrokeIndex = bodyStrokes.length - 1;
        dotsState[seg.dotIdx].visible = true;
        // Pop scale 1.3 -> 1.0
        dotsState[seg.dotIdx].scale = Number((1.3 - 0.3 * localRatio).toFixed(2));
        // Phase D.3: The ant steps aside outside all dots so it never stands on top of any dot
        const maxDotX = Math.max(...dotStrokes.map((d) => d.at[0]), seg.x);
        const minDotX = Math.min(...dotStrokes.map((d) => d.at[0]), seg.x);
        const targetParkX =
          maxDotX <= 145
            ? Math.min(180, maxDotX + 28)
            : Math.max(20, minDotX - 28);
        const parkX = seg.x + (targetParkX - seg.x) * localRatio;
        const parkY = Math.min(178, Math.max(22, seg.y + 8 * localRatio));
        antState = {
          x: Number(parkX.toFixed(2)),
          y: Number(parkY.toFixed(2)),
          angleDeg: 0,
          isMoving: false,
          isCornerPause: false,
          isStrokeEndBounce: true,
          isFinishedJump: false,
          isCarryingDot: false,
          carriedDotIndex: -1
        };
      }
      break;
    }
  }

  if (progress >= 1) {
    for (let i = 0; i < strokeProgresses.length; i++) strokeProgresses[i] = 1;
    for (let i = 0; i < dotsState.length; i++) {
      dotsState[i].visible = true;
      dotsState[i].scale = 1;
    }
    const lastBody = bodyStrokes[bodyStrokes.length - 1];
    const endPt =
      dotStrokes.length > 0
        ? (() => {
            const lastDot = dotStrokes[dotStrokes.length - 1];
            const maxDotX = Math.max(...dotStrokes.map((d) => d.at[0]));
            const minDotX = Math.min(...dotStrokes.map((d) => d.at[0]));
            const px =
              maxDotX <= 145
                ? Math.min(180, maxDotX + 28)
                : Math.max(20, minDotX - 28);
            const py = Math.min(178, Math.max(22, lastDot.at[1] + 8));
            return { x: px, y: py, angleDeg: 0 };
          })()
        : getPointAndTangentAtNormalizedProgress(lastBody.d, 1);

    antState = {
      x: endPt.x,
      y: endPt.y,
      angleDeg: endPt.angleDeg,
      isMoving: false,
      isCornerPause: false,
      isStrokeEndBounce: false,
      isFinishedJump: true,
      isCarryingDot: false,
      carriedDotIndex: -1
    };
    activeStrokeIndex = bodyStrokes.length - 1;
  }

  return {
    progress,
    totalDurationMs,
    activeStrokeIndex,
    strokeProgresses,
    pathLengths,
    ant: antState,
    dots: dotsState
  };
}

export function distanceBetween(a: Point2D, b: Point2D): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export interface DotClearanceAuditItem {
  dotId: number;
  at: [number, number];
  minDistanceToStrokeCenterline: number;
  requiredMinDistance: number;
  clearancePassed: boolean;
  insideViewBoxWithPadding: boolean;
}

export interface GlyphDotClearanceAudit {
  letterId: string;
  strokeWidth: number;
  strokeWidthPercentOfHeight: number;
  strokeWidthIn7To9Percent: boolean;
  dotHalfDiagonal: number;
  requiredClearance: number;
  dots: DotClearanceAuditItem[];
  minInterDotEdgeGap: number | null;
  interDotGapPassed: boolean;
  strokesInsideViewBox: boolean;
  jiimInsideBellyCavity: boolean;
  passed: boolean;
}

/**
 * Phase C & Phase B.3:
 * Automatic check for dot clearance, inter-dot gap (>= one dot diameter), viewBox 12-unit padding,
 * stroke width (7-9% of 200-unit viewBox), and Jiim belly cavity placement.
 */
export function computeGlyphDotClearanceAudit(glyph: GlyphForm): GlyphDotClearanceAudit {
  const bodyStrokes = glyph.strokes.filter(
    (s): s is GlyphBodyStroke => s.kind === 'body'
  );
  const dotStrokes = glyph.strokes.filter(
    (s): s is GlyphDotStroke => s.kind === 'dot'
  );

  const strokeWidth = bodyStrokes[0]?.width ?? DEFAULT_GLYPH_STROKE_WIDTH;
  const strokeWidthPercentOfHeight = Number(((strokeWidth / 200) * 100).toFixed(2));
  const strokeWidthIn7To9Percent =
    strokeWidthPercentOfHeight >= 7 && strokeWidthPercentOfHeight <= 9;

  const dotHalfDiagonal = getDotHalfDiagonal(strokeWidth);
  const dotDiameter = Number((2 * dotHalfDiagonal).toFixed(2));
  const requiredClearance = Number(
    (strokeWidth / 2 + dotHalfDiagonal + 6).toFixed(2)
  );

  const allBodySamples: Point2D[] = [];
  for (const s of bodyStrokes) {
    allBodySamples.push(...sampleSvgPathEqualLength(s.d, 96));
  }

  let strokesInsideViewBox = true;
  for (const pt of allBodySamples) {
    if (pt.x < 12 || pt.x > 188 || pt.y < 12 || pt.y > 188) {
      strokesInsideViewBox = false;
      break;
    }
  }

  const dotItems: DotClearanceAuditItem[] = dotStrokes.map((dot) => {
    const center = { x: dot.at[0], y: dot.at[1] };
    let minD = Infinity;
    for (const sp of allBodySamples) {
      const d = distanceBetween(center, sp);
      if (d < minD) minD = d;
    }
    const minDistanceToStrokeCenterline = Number(minD.toFixed(2));
    const clearancePassed = minDistanceToStrokeCenterline >= requiredClearance;
    const insideViewBoxWithPadding =
      center.x - dotHalfDiagonal >= 12 &&
      center.x + dotHalfDiagonal <= 188 &&
      center.y - dotHalfDiagonal >= 12 &&
      center.y + dotHalfDiagonal <= 188;

    return {
      dotId: dot.id,
      at: dot.at,
      minDistanceToStrokeCenterline,
      requiredMinDistance: requiredClearance,
      clearancePassed,
      insideViewBoxWithPadding
    };
  });

  let minInterDotEdgeGap: number | null = null;
  if (dotStrokes.length >= 2) {
    let minEdgeGap = Infinity;
    for (let i = 0; i < dotStrokes.length; i++) {
      for (let j = i + 1; j < dotStrokes.length; j++) {
        const centerDist = distanceBetween(
          { x: dotStrokes[i].at[0], y: dotStrokes[i].at[1] },
          { x: dotStrokes[j].at[0], y: dotStrokes[j].at[1] }
        );
        const edgeGap = centerDist - 2 * dotHalfDiagonal;
        if (edgeGap < minEdgeGap) minEdgeGap = edgeGap;
      }
    }
    minInterDotEdgeGap = Number(minEdgeGap.toFixed(2));
  }
  // Phase B.3: targets spread so they never touch (minimum gap = one dot diameter)
  const interDotGapPassed =
    minInterDotEdgeGap === null || minInterDotEdgeGap >= dotDiameter;

  // For Jiim: 1 dot INSIDE the lower curve (belly cavity), centered in the cavity,
  // in the lower half of the bowl, clearly separated from the stroke by at least one dot diameter,
  // NOT sitting on the baseline crossing.
  let jiimInsideBellyCavity = true;
  if (glyph.letterId === 'jiim') {
    if (dotStrokes.length !== 1) {
      jiimInsideBellyCavity = false;
    } else {
      const [dx, dy] = dotStrokes[0].at;
      const bowlSamples = allBodySamples.filter((p) => p.y > 95);
      const minX = Math.min(...bowlSamples.map((p) => p.x));
      const maxX = Math.max(...bowlSamples.map((p) => p.x));
      const maxY = Math.max(...bowlSamples.map((p) => p.y));
      jiimInsideBellyCavity =
        dx > minX + 20 &&
        dx < maxX - 15 &&
        dy > 125 && // below baseline (120), in the lower half of the bowl
        dy < maxY - 20 &&
        dotItems[0].clearancePassed;
    }
  }

  const passed =
    strokeWidthIn7To9Percent &&
    strokesInsideViewBox &&
    interDotGapPassed &&
    jiimInsideBellyCavity &&
    dotItems.every((d) => d.clearancePassed && d.insideViewBoxWithPadding);

  return {
    letterId: glyph.letterId,
    strokeWidth,
    strokeWidthPercentOfHeight,
    strokeWidthIn7To9Percent,
    dotHalfDiagonal,
    requiredClearance,
    dots: dotItems,
    minInterDotEdgeGap,
    interDotGapPassed,
    strokesInsideViewBox,
    jiimInsideBellyCavity,
    passed
  };
}

/**
 * Checks whether a single learner point is inside the corridor of a specific body stroke.
 */
export function isPointInsideStrokeCorridor(
  pt: Point2D,
  stroke: GlyphBodyStroke,
  mode: LearnerMode = 'adult'
): boolean {
  const w = mode === 'kids' ? stroke.corridor * 1.25 : stroke.corridor;
  const samples = sampleSvgPathEqualLength(stroke.d, 64);
  for (const sp of samples) {
    if (distanceBetween(pt, sp) <= w) {
      return true;
    }
  }
  return false;
}

export function isPointInsideGlyphCorridor(
  pt: Point2D,
  glyph: GlyphForm,
  mode: LearnerMode = 'adult'
): boolean {
  const bodyStrokes = glyph.strokes.filter(
    (s): s is GlyphBodyStroke => s.kind === 'body'
  );
  return bodyStrokes.some((s) => isPointInsideStrokeCorridor(pt, s, mode));
}

export interface PracticeTraceMetrics {
  coverage: number; // 0..100
  outside: number;  // 0..100
  score: number;    // 0..100 real composite score (never hardcoded 100 for a quick/sloppy trace)
  canSave: boolean; // true only if score >= 60 (Phase E.4)
}

/**
 * Phase E.4: Computes real coverage and outside ratios and the real practice score (0..100).
 * Only allows saving an attempt at 60 percent or more.
 */
export function computeRealPracticeMetrics(
  learnerPoints: Point2D[],
  stroke: GlyphBodyStroke,
  mode: LearnerMode = 'adult'
): PracticeTraceMetrics {
  if (learnerPoints.length < 4) {
    return { coverage: 0, outside: 100, score: 0, canSave: false };
  }
  const w = mode === 'kids' ? stroke.corridor * 1.2 : stroke.corridor;
  const strictW = Math.max(8, stroke.width * 0.65);
  const targetSamples = sampleSvgPathEqualLength(stroke.d, 64);

  let coveredCount = 0;
  let totalMinDist = 0;
  for (const sp of targetSamples) {
    let minD = Infinity;
    for (const lp of learnerPoints) {
      const d = distanceBetween(lp, sp);
      if (d < minD) minD = d;
    }
    if (minD <= w) {
      coveredCount++;
    }
    totalMinDist += Math.min(w * 2, minD);
  }
  const coverage = Math.round((coveredCount / targetSamples.length) * 100);

  let outsideCount = 0;
  for (const lp of learnerPoints) {
    const inside = targetSamples.some((sp) => distanceBetween(lp, sp) <= w);
    if (!inside) outsideCount++;
  }
  const outside = Math.round((outsideCount / learnerPoints.length) * 100);

  const avgDeviation = totalMinDist / targetSamples.length;
  const precisionFactor = Math.max(0, Math.min(1, 1 - avgDeviation / (strictW * 2.5)));
  const rawScore =
    coverage * 0.65 +
    (100 - outside) * 0.2 * (coverage / 100) +
    precisionFactor * 15 * (coverage / 100);
  const score = Math.max(0, Math.min(100, Math.round(rawScore)));

  return {
    coverage,
    outside,
    score,
    canSave: score >= 60
  };
}

/**
 * Validates a single body stroke step ("Trait k/N") using the 64-point algorithm.
 */
export function validateSingleBodyStroke(params: {
  learnerPoints: Point2D[];
  stroke: GlyphBodyStroke;
  mode: LearnerMode;
  enforceDirection?: boolean;
}): TraceValidationResult {
  const { learnerPoints, stroke, mode } = params;
  const enforceDirection = params.enforceDirection ?? (mode === 'adult');
  const w = mode === 'kids' ? stroke.corridor * 1.2 : stroke.corridor;
  const targetSamples = sampleSvgPathEqualLength(stroke.d, 64);

  if (learnerPoints.length < 4) {
    return {
      passed: false,
      bodyPassed: false,
      dotsPassed: false,
      coverage: 0,
      outside: 0,
      reason: 'trop_court',
      messageFr: t('trace.short', mode)
    };
  }

  let coveredCount = 0;
  for (const sp of targetSamples) {
    if (learnerPoints.some((lp) => distanceBetween(lp, sp) <= w)) {
      coveredCount++;
    }
  }
  const coverage = Math.round((coveredCount / targetSamples.length) * 100);

  let outsideCount = 0;
  for (const lp of learnerPoints) {
    const inside = targetSamples.some((sp) => distanceBetween(lp, sp) <= w);
    if (!inside) outsideCount++;
  }
  const outside = Math.round((outsideCount / learnerPoints.length) * 100);

  let directionOk = true;
  if (enforceDirection) {
    const [sx, sy] = stroke.startDot;
    if (distanceBetween(learnerPoints[0], { x: sx, y: sy }) > 2 * w) {
      directionOk = false;
    }
  }

  const minCoverage = mode === 'kids' ? 70 : 80;
  const maxOutside = mode === 'kids' ? 25 : 15;

  if (outside > maxOutside) {
    return {
      passed: false,
      bodyPassed: false,
      dotsPassed: false,
      coverage,
      outside,
      reason: 'sort_du_guide',
      messageFr: t('trace.outside', mode)
    };
  }

  if (!directionOk) {
    return {
      passed: false,
      bodyPassed: false,
      dotsPassed: false,
      coverage,
      outside,
      reason: 'mauvais_sens',
      messageFr: t('trace.direction', mode)
    };
  }

  if (coverage < minCoverage) {
    return {
      passed: false,
      bodyPassed: false,
      dotsPassed: false,
      coverage,
      outside,
      reason: 'trop_court',
      messageFr: t('trace.short', mode)
    };
  }

  return {
    passed: true,
    bodyPassed: true,
    dotsPassed: true,
    coverage,
    outside,
    messageFr: t('trace.ok', mode)
  };
}

/**
 * Validates the DOTS step ("Points" - Section B3 & Phase B.2):
 * Evaluated ONLY when the learner presses Valider:
 * Too few -> "Il manque un point"
 * Too many -> "Un point de trop"
 */
export function validateDotsStep(params: {
  learnerDots: Point2D[];
  targetDots: GlyphDotStroke[];
  corridor?: number;
  corridorWidth?: number;
  mode: LearnerMode;
}): TraceValidationResult {
  const { learnerDots, targetDots, mode } = params;
  const w = params.corridor ?? params.corridorWidth ?? 22;

  if (learnerDots.length < targetDots.length) {
    return {
      passed: false,
      bodyPassed: true,
      dotsPassed: false,
      coverage: 100,
      outside: 0,
      reason: 'points_manquants',
      messageFr: 'Il manque un point'
    };
  }

  if (learnerDots.length > targetDots.length) {
    return {
      passed: false,
      bodyPassed: true,
      dotsPassed: false,
      coverage: 100,
      outside: 0,
      reason: 'points_de_trop',
      messageFr: 'Un point de trop'
    };
  }

  const matchedIds = new Set<number>();
  for (const tap of learnerDots) {
    for (const td of targetDots) {
      if (distanceBetween(tap, { x: td.at[0], y: td.at[1] }) <= Math.max(2 * w, 56)) {
        matchedIds.add(td.id);
      }
    }
  }

  if (matchedIds.size < targetDots.length) {
    return {
      passed: false,
      bodyPassed: true,
      dotsPassed: false,
      coverage: 100,
      outside: 0,
      reason: 'points_manquants',
      messageFr: 'Il manque un point'
    };
  }

  return {
    passed: true,
    bodyPassed: true,
    dotsPassed: true,
    coverage: 100,
    outside: 0,
    messageFr: t('trace.ok', mode)
  };
}

export interface PlacedDotItem {
  x: number;
  y: number;
  snapped: boolean;
  targetId?: number;
}

export interface DotTapLogEntry {
  x: number;
  y: number;
  nearestTargetId: number | null;
  distance: number;
  action: 'snapped' | 'removed' | 'ignored';
  currentDotCount: number;
  hintFr?: string;
}

/**
 * PHASE B.1 & B.2:
 * Pure deterministic handler for a single pointerdown tap during the Dots step:
 * - Tapping an already placed dot (when closer than any empty target and within 24 viewBox units) removes it (undo).
 * - Otherwise, a tap snaps to the nearest EMPTY target within `maxSnapDistPx` (56 px scaled to viewBox, default 36u / 56px) and pops into place.
 * - A tap farther away is ignored (never counted as an extra dot!) with a gentle hint "Touche les pointillés".
 */
export function processDotStepTap(params: {
  tap: Point2D;
  targetDots: GlyphDotStroke[];
  placedDots: PlacedDotItem[];
  canvasWidthPx?: number;
}): {
  nextDots: PlacedDotItem[];
  nextPlacedDots: PlacedDotItem[];
  hintFr?: string;
  log: DotTapLogEntry;
} {
  const {
    tap,
    targetDots = [],
    placedDots = [],
    canvasWidthPx = 320
  } = params;
  // Convert 56 screen px to 200-unit viewBox coordinates (min 35u so 56px on a 320px canvas is ~35u, and allow up to 56u if viewBox=200)
  const snapRadiusViewBox = Math.max(35, (56 / Math.max(200, canvasWidthPx)) * 200);
  const undoRadiusViewBox = Math.max(22, (36 / Math.max(200, canvasWidthPx)) * 200);

  // 1. Find nearest already-placed dot
  let nearestPlacedIdx = -1;
  let nearestPlacedDist = Infinity;
  placedDots.forEach((pd, idx) => {
    const d = distanceBetween(tap, { x: pd.x, y: pd.y });
    if (d < nearestPlacedDist) {
      nearestPlacedDist = d;
      nearestPlacedIdx = idx;
    }
  });

  // 2. Find nearest EMPTY target dot
  const usedTargetIds = new Set(
    placedDots
      .map((d) => d.targetId)
      .filter((id): id is number => typeof id === 'number')
  );
  let nearestEmptyTarget: GlyphDotStroke | null = null;
  let nearestEmptyDist = Infinity;
  for (const td of targetDots) {
    if (usedTargetIds.has(td.id)) continue;
    const d = distanceBetween(tap, { x: td.at[0], y: td.at[1] });
    if (d < nearestEmptyDist) {
      nearestEmptyDist = d;
      nearestEmptyTarget = td;
    }
  }

  // If the learner taps directly on an already-placed dot (and it's closer than any empty target), remove it (undo)!
  if (
    nearestPlacedIdx !== -1 &&
    nearestPlacedDist <= undoRadiusViewBox &&
    nearestPlacedDist < nearestEmptyDist
  ) {
    const removed = placedDots[nearestPlacedIdx];
    const nextDots = placedDots.filter((_, i) => i !== nearestPlacedIdx);
    return {
      nextDots,
      nextPlacedDots: nextDots,
      log: {
        x: Number(tap.x.toFixed(1)),
        y: Number(tap.y.toFixed(1)),
        nearestTargetId: removed.targetId ?? null,
        distance: Number(nearestPlacedDist.toFixed(1)),
        action: 'removed',
        currentDotCount: nextDots.length
      }
    };
  }

  // Otherwise, if there is an EMPTY target within 56 px (`snapRadiusViewBox`), snap to it!
  if (nearestEmptyTarget && nearestEmptyDist <= snapRadiusViewBox) {
    const nextDots: PlacedDotItem[] = [
      ...placedDots,
      {
        x: nearestEmptyTarget.at[0],
        y: nearestEmptyTarget.at[1],
        snapped: true,
        targetId: nearestEmptyTarget.id
      }
    ];
    return {
      nextDots,
      nextPlacedDots: nextDots,
      log: {
        x: Number(tap.x.toFixed(1)),
        y: Number(tap.y.toFixed(1)),
        nearestTargetId: nearestEmptyTarget.id,
        distance: Number(nearestEmptyDist.toFixed(1)),
        action: 'snapped',
        currentDotCount: nextDots.length
      }
    };
  }

  // Otherwise: tap is farther away (or all targets are filled and tap wasn't on a placed dot) -> IGNORE with gentle hint!
  let anyNearestTargetId: number | null = null;
  let anyNearestDist = Infinity;
  for (const td of targetDots) {
    const d = distanceBetween(tap, { x: td.at[0], y: td.at[1] });
    if (d < anyNearestDist) {
      anyNearestDist = d;
      anyNearestTargetId = td.id;
    }
  }

  const hintFr = 'Touche les pointillés';
  return {
    nextDots: placedDots,
    nextPlacedDots: placedDots,
    hintFr,
    log: {
      x: Number(tap.x.toFixed(1)),
      y: Number(tap.y.toFixed(1)),
      nearestTargetId: anyNearestTargetId,
      distance: Number(anyNearestDist.toFixed(1)),
      action: 'ignored',
      currentDotCount: placedDots.length,
      hintFr
    }
  };
}

/**
 * Finds the nearest unmatched target dot within 2 * corridor so a tap snaps to the target with a pop.
 */
export function snapTapToTargetDot(
  tap: Point2D,
  targetDots: GlyphDotStroke[],
  corridor = 22,
  alreadySnappedIds: number[] = []
): { x: number; y: number; snapped: boolean; targetId?: number } {
  const res = processDotStepTap({
    tap,
    targetDots,
    placedDots: alreadySnappedIds.map((id) => {
      const found = targetDots.find((t) => t.id === id);
      return {
        x: found ? found.at[0] : 0,
        y: found ? found.at[1] : 0,
        snapped: true,
        targetId: id
      };
    })
  });
  const last = res.nextDots[res.nextDots.length - 1];
  if (res.log.action === 'snapped' && last) {
    return last;
  }
  return { x: tap.x, y: tap.y, snapped: false };
}

/**
 * Full glyph validation combining body stroke + dots check (Section 7.4 & Section D1b).
 */
export function validateGlyphTrace(params: {
  learnerPoints: Point2D[];
  learnerDots: Point2D[];
  glyph: GlyphForm;
  mode: LearnerMode;
  enforceDirection?: boolean;
}): TraceValidationResult {
  const { learnerPoints, learnerDots, glyph, mode, enforceDirection } = params;
  const bodyStrokes = glyph.strokes.filter(
    (s): s is GlyphBodyStroke => s.kind === 'body'
  );
  const dotStrokes = glyph.strokes.filter(
    (s): s is GlyphDotStroke => s.kind === 'dot'
  );

  if (bodyStrokes.length > 0) {
    const bodyRes = validateSingleBodyStroke({
      learnerPoints,
      stroke: bodyStrokes[0],
      mode,
      enforceDirection
    });
    if (!bodyRes.passed) return bodyRes;

    if (dotStrokes.length > 0) {
      const dotsRes = validateDotsStep({
        learnerDots,
        targetDots: dotStrokes,
        corridor: bodyStrokes[0].corridor,
        mode
      });
      if (!dotsRes.passed) {
        return {
          ...dotsRes,
          coverage: bodyRes.coverage,
          outside: bodyRes.outside
        };
      }
    }

    return bodyRes;
  }

  return {
    passed: true,
    bodyPassed: true,
    dotsPassed: true,
    coverage: 100,
    outside: 0,
    messageFr: t('trace.ok', mode)
  };
}

/**
 * PHASE 2.1 & PHASE B.1 REED-PEN INK:
 * Variable stroke width: Width = clamp(18 - speed * k, 8, 18) px (slower = thicker, faster = thinner),
 * smoothed with a low-pass filter so it never jitters.
 */
export function computeReedPenWidth(
  speedPxPerMs: number,
  prevWidth = DEFAULT_GLYPH_STROKE_WIDTH,
  k = 12
): number {
  const target = Math.max(8, Math.min(18, 18 - speedPxPerMs * k));
  const smoothed = prevWidth * 0.7 + target * 0.3;
  return Number(Math.max(8, Math.min(18, smoothed)).toFixed(2));
}

export interface ReedPenPoint extends Point2D {
  width?: number;
  inside?: boolean;
}

/**
 * Shared Reed-Pen renderer for both animation and user ink (Phase 2.1):
 * Round start, variable width along stroke, slightly tapered end,
 * dark green (#07463D) inside corridor, red (#FF5A4E) outside.
 */
export function renderReedPenStrokeOnCanvas(
  ctx: CanvasRenderingContext2D,
  points: ReedPenPoint[],
  defaultColor = '#07463D'
): void {
  if (points.length === 0) return;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (points.length === 1) {
    const p = points[0];
    const r = (p.width ?? DEFAULT_GLYPH_STROKE_WIDTH) / 2;
    ctx.fillStyle = p.inside === false ? '#FF5A4E' : defaultColor;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const cur = points[i];
    const baseW = cur.width ?? DEFAULT_GLYPH_STROKE_WIDTH;
    // Slightly tapered end on the final 3 segments
    const tailFactor =
      i >= points.length - 3 && points.length > 5
        ? 1 - ((i - (points.length - 4)) / 4) * 0.32
        : 1;
    const w = Math.max(6, Math.min(18, baseW * tailFactor));

    ctx.strokeStyle = cur.inside === false ? '#FF5A4E' : defaultColor;
    ctx.lineWidth = w;
    ctx.beginPath();
    if (i === 1) {
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(cur.x, cur.y);
    } else {
      const prevPrev = points[i - 2];
      const midPrevX = (prevPrev.x + prev.x) / 2;
      const midPrevY = (prevPrev.y + prev.y) / 2;
      const midCurX = (prev.x + cur.x) / 2;
      const midCurY = (prev.y + cur.y) / 2;
      ctx.moveTo(midPrevX, midPrevY);
      ctx.quadraticCurveTo(prev.x, prev.y, midCurX, midCurY);
    }
    ctx.stroke();
  }
  ctx.restore();
}

function perpendicularDistance(
  pt: Point2D,
  lineStart: Point2D,
  lineEnd: Point2D
): number {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  if (dx === 0 && dy === 0) {
    return distanceBetween(pt, lineStart);
  }
  const num = Math.abs(
    dy * pt.x - dx * pt.y + lineEnd.x * lineStart.y - lineEnd.y * lineStart.x
  );
  const den = Math.hypot(dx, dy);
  return num / den;
}

function rdpRecursive(points: Point2D[], epsilon: number): Point2D[] {
  if (points.length <= 2) return points;
  let maxDist = 0;
  let index = 0;
  const start = points[0];
  const end = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const d = perpendicularDistance(points[i], start, end);
    if (d > maxDist) {
      index = i;
      maxDist = d;
    }
  }

  if (maxDist > epsilon) {
    const left = rdpRecursive(points.slice(0, index + 1), epsilon);
    const right = rdpRecursive(points.slice(index), epsilon);
    return [...left.slice(0, left.length - 1), ...right];
  }
  return [start, end];
}

/**
 * PHASE 3.6 LETTER ALBUM ("Mon cahier"):
 * Simplifies a trace point array using Ramer-Douglas-Peucker and guarantees
 * the serialized JSON representation is strictly under 2 KB (< 2048 bytes).
 */
export function simplifyPointsRDP(
  points: Point2D[],
  epsilon = 1.8
): Point2D[] {
  if (points.length === 0) return [];
  let eps = epsilon;
  let simplified = rdpRecursive(points, eps).map((p) => ({
    x: Number(p.x.toFixed(1)),
    y: Number(p.y.toFixed(1))
  }));

  while (JSON.stringify(simplified).length >= 1900 && simplified.length > 8) {
    eps *= 1.5;
    simplified = rdpRecursive(simplified, eps).map((p) => ({
      x: Number(p.x.toFixed(1)),
      y: Number(p.y.toFixed(1))
    }));
  }

  return simplified;
}

/**
 * Converts an array of 2D points into a smooth quadratic SVG path string.
 */
export function pointsToSmoothQuadraticSvgPath(points: Point2D[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) {
    return `M ${points[0].x} ${points[0].y} L ${points[0].x + 0.5} ${points[0].y + 0.5}`;
  }
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const midX = Number(((points[i].x + points[i + 1].x) / 2).toFixed(1));
    const midY = Number(((points[i].y + points[i + 1].y) / 2).toFixed(1));
    d += ` Q ${points[i].x} ${points[i].y} ${midX} ${midY}`;
  }
  const last = points[points.length - 1];
  d += ` L ${last.x} ${last.y}`;
  return d;
}

/**
 * PHASE E: Editable SVG Path Commands for /dev/glyphs Stroke Editor
 */
export type EditablePathSegment =
  | { cmd: 'M'; x: number; y: number }
  | { cmd: 'L'; x: number; y: number }
  | { cmd: 'Q'; x1: number; y1: number; x: number; y: number }
  | { cmd: 'C'; x1: number; y1: number; x2: number; y2: number; x: number; y: number };

export function parseSvgPathToEditableSegments(d: string): EditablePathSegment[] {
  const tokens = d
    .replace(/,/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const segs: EditablePathSegment[] = [];
  let i = 0;
  let cmd = '';
  while (i < tokens.length) {
    const tok = tokens[i];
    if (/^[MLQCmlqc]$/.test(tok)) {
      cmd = tok.toUpperCase();
      i++;
    }
    if (cmd === 'M') {
      const x = Number(parseFloat(tokens[i++]).toFixed(1));
      const y = Number(parseFloat(tokens[i++]).toFixed(1));
      segs.push({ cmd: 'M', x, y });
      cmd = 'L';
    } else if (cmd === 'L') {
      const x = Number(parseFloat(tokens[i++]).toFixed(1));
      const y = Number(parseFloat(tokens[i++]).toFixed(1));
      segs.push({ cmd: 'L', x, y });
    } else if (cmd === 'Q') {
      const x1 = Number(parseFloat(tokens[i++]).toFixed(1));
      const y1 = Number(parseFloat(tokens[i++]).toFixed(1));
      const x = Number(parseFloat(tokens[i++]).toFixed(1));
      const y = Number(parseFloat(tokens[i++]).toFixed(1));
      segs.push({ cmd: 'Q', x1, y1, x, y });
    } else if (cmd === 'C') {
      const x1 = Number(parseFloat(tokens[i++]).toFixed(1));
      const y1 = Number(parseFloat(tokens[i++]).toFixed(1));
      const x2 = Number(parseFloat(tokens[i++]).toFixed(1));
      const y2 = Number(parseFloat(tokens[i++]).toFixed(1));
      const x = Number(parseFloat(tokens[i++]).toFixed(1));
      const y = Number(parseFloat(tokens[i++]).toFixed(1));
      segs.push({ cmd: 'C', x1, y1, x2, y2, x, y });
    } else {
      i++;
    }
  }
  return segs;
}

export function serializeEditableSegmentsToSvgPath(segs: EditablePathSegment[]): string {
  return segs
    .map((s) => {
      if (s.cmd === 'M') return `M ${Math.round(s.x)} ${Math.round(s.y)}`;
      if (s.cmd === 'L') return `L ${Math.round(s.x)} ${Math.round(s.y)}`;
      if (s.cmd === 'Q')
        return `Q ${Math.round(s.x1)} ${Math.round(s.y1)}, ${Math.round(s.x)} ${Math.round(s.y)}`;
      return `C ${Math.round(s.x1)} ${Math.round(s.y1)}, ${Math.round(s.x2)} ${Math.round(s.y2)}, ${Math.round(s.x)} ${Math.round(s.y)}`;
    })
    .join(' ');
}

export function reverseSvgPathDirection(d: string): {
  d: string;
  startDot: [number, number];
} {
  const segs = parseSvgPathToEditableSegments(d);
  if (segs.length <= 1) {
    const pt: [number, number] = segs[0] ? [segs[0].x, segs[0].y] : [100, 100];
    return { d, startDot: pt };
  }
  const reversed: EditablePathSegment[] = [
    { cmd: 'M', x: segs[segs.length - 1].x, y: segs[segs.length - 1].y }
  ];
  for (let i = segs.length - 1; i >= 1; i--) {
    const cur = segs[i];
    const prev = segs[i - 1];
    if (cur.cmd === 'L') {
      reversed.push({ cmd: 'L', x: prev.x, y: prev.y });
    } else if (cur.cmd === 'Q') {
      reversed.push({ cmd: 'Q', x1: cur.x1, y1: cur.y1, x: prev.x, y: prev.y });
    } else if (cur.cmd === 'C') {
      reversed.push({
        cmd: 'C',
        x1: cur.x2,
        y1: cur.y2,
        x2: cur.x1,
        y2: cur.y1,
        x: prev.x,
        y: prev.y
      });
    }
  }
  return {
    d: serializeEditableSegmentsToSvgPath(reversed),
    startDot: [reversed[0].x, reversed[0].y]
  };
}
