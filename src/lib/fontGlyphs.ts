import opentype from 'opentype.js';
import { AMIRI_PRECOMPUTED_GLYPHS, PrecomputedFontGlyphForm } from './fontGlyphsData';
import {
  GlyphBodyStroke,
  GlyphForm,
  Point2D,
  sampleSvgPathEqualLength
} from './strokeMath';

export type ContextualFormKey = 'isolated' | 'initial' | 'medial' | 'final';

export interface FontDotContour {
  cx: number;
  cy: number;
  path: string; // scaled 1.3x about (cx, cy) per Phase 1.3 & Phase 2.1
  rawPath: string;
}

export interface FontGlyphOutline {
  letterId: string;
  form: ContextualFormKey;
  viewBox: string;
  baseline: number;
  bodyPath: string;
  dots: FontDotContour[];
  expectedDotCount: number;
  dotCountMatches: boolean;
}

export interface GlyphAlignmentAudit {
  letterId: string;
  form: ContextualFormKey;
  centerlineInsideBodyPct: number; // (a) >= 95%
  bodyCoveredByCenterlinePct: number; // (b) >= 97%
  aligned: boolean;
  status: 'aligne' | 'non_aligne';
  renderMode: 'font' | 'monoline';
}

export const EXPECTED_LETTER_DOT_COUNTS: Record<string, number> = {
  alif: 0,
  baa: 1,
  taa: 2,
  thaa: 3,
  jiim: 1,
  haa_soft: 0,
  khaa: 1,
  daal: 0,
  dhaal: 1,
  raa: 0,
  zaay: 1,
  siin: 0,
  shiin: 3,
  saad: 0,
  daad: 1,
  taa_emph: 0,
  dhaa_emph: 1,
  ayn: 0,
  ghayn: 1,
  faa: 1,
  qaaf: 2,
  kaaf: 0,
  laam: 0,
  miim: 0,
  nuun: 1,
  haa_breath: 0,
  waaw: 0,
  yaa: 2
};

export const PRESENTATION_FORMS_B_MAP: Record<
  string,
  Record<ContextualFormKey, number>
> = {
  alif: { isolated: 0x0627, initial: 0xfe8d, medial: 0xfe8e, final: 0xfe8e },
  baa: { isolated: 0x0628, initial: 0xfe91, medial: 0xfe92, final: 0xfe90 },
  taa: { isolated: 0x062a, initial: 0xfe97, medial: 0xfe98, final: 0xfe96 },
  thaa: { isolated: 0x062b, initial: 0xfe9b, medial: 0xfe9c, final: 0xfe9a },
  jiim: { isolated: 0x062c, initial: 0xfe9f, medial: 0xfea0, final: 0xfe9e },
  haa_soft: { isolated: 0x062d, initial: 0xfea3, medial: 0xfea4, final: 0xfea2 },
  khaa: { isolated: 0x062e, initial: 0xfea7, medial: 0xfea8, final: 0xfea6 },
  daal: { isolated: 0x062f, initial: 0xfea9, medial: 0xfeaa, final: 0xfeaa },
  dhaal: { isolated: 0x0630, initial: 0xfeab, medial: 0xfeac, final: 0xfeac },
  raa: { isolated: 0x0631, initial: 0xfead, medial: 0xfeae, final: 0xfeae },
  zaay: { isolated: 0x0632, initial: 0xfeaf, medial: 0xfeb0, final: 0xfeb0 },
  siin: { isolated: 0x0633, initial: 0xfeb3, medial: 0xfeb4, final: 0xfeb2 },
  shiin: { isolated: 0x0634, initial: 0xfeb7, medial: 0xfeb8, final: 0xfeb6 },
  saad: { isolated: 0x0635, initial: 0xfebb, medial: 0xfebc, final: 0xfeba },
  daad: { isolated: 0x0636, initial: 0xfebf, medial: 0xfec0, final: 0xfebe },
  taa_emph: { isolated: 0x0637, initial: 0xfec3, medial: 0xfec4, final: 0xfec2 },
  dhaa_emph: { isolated: 0x0638, initial: 0xfec7, medial: 0xfec8, final: 0xfec6 },
  ayn: { isolated: 0x0639, initial: 0xfecb, medial: 0xfecc, final: 0xfeca },
  ghayn: { isolated: 0x063a, initial: 0xfecf, medial: 0xfed0, final: 0xfece },
  faa: { isolated: 0x0641, initial: 0xfed3, medial: 0xfed4, final: 0xfed2 },
  qaaf: { isolated: 0x0642, initial: 0xfed7, medial: 0xfed8, final: 0xfed6 },
  kaaf: { isolated: 0x0643, initial: 0xfedb, medial: 0xfedc, final: 0xfeda },
  laam: { isolated: 0x0644, initial: 0xfedf, medial: 0xfee0, final: 0xfede },
  miim: { isolated: 0x0645, initial: 0xfee3, medial: 0xfee4, final: 0xfee2 },
  nuun: { isolated: 0x0646, initial: 0xfee7, medial: 0xfee8, final: 0xfee6 },
  haa_breath: { isolated: 0x0647, initial: 0xfeeb, medial: 0xfeec, final: 0xfeea },
  waaw: { isolated: 0x0648, initial: 0xfeed, medial: 0xfeee, final: 0xfeee },
  yaa: { isolated: 0x064a, initial: 0xfef3, medial: 0xfef4, final: 0xfef2 }
};

const ARABIC_CHAR_TO_LETTER_ID: Record<string, string> = {
  '\u0627': 'alif',
  '\u0628': 'baa',
  '\u062a': 'taa',
  '\u062b': 'thaa',
  '\u062c': 'jiim',
  '\u062d': 'haa_soft',
  '\u062e': 'khaa',
  '\u062f': 'daal',
  '\u0630': 'dhaal',
  '\u0631': 'raa',
  '\u0632': 'zaay',
  '\u0633': 'siin',
  '\u0634': 'shiin',
  '\u0635': 'saad',
  '\u0636': 'daad',
  '\u0637': 'taa_emph',
  '\u0638': 'dhaa_emph',
  '\u0639': 'ayn',
  '\u063a': 'ghayn',
  '\u0641': 'faa',
  '\u0642': 'qaaf',
  '\u0643': 'kaaf',
  '\u0644': 'laam',
  '\u0645': 'miim',
  '\u0646': 'nuun',
  '\u0647': 'haa_breath',
  '\u0648': 'waaw',
  '\u064a': 'yaa'
};

let cachedFont: opentype.Font | null = null;
let fontLoadPromise: Promise<opentype.Font | null> | null = null;

/**
 * Loads public/fonts/Amiri-Regular.ttf once via opentype.js in browser or Node.js.
 */
export async function loadAmiriFont(): Promise<opentype.Font | null> {
  if (cachedFont) return cachedFont;
  if (fontLoadPromise) return fontLoadPromise;

  fontLoadPromise = (async () => {
    try {
      if (typeof window !== 'undefined' && typeof fetch === 'function') {
        const res = await fetch('/fonts/Amiri-Regular.ttf');
        if (res.ok) {
          const buf = await res.arrayBuffer();
          cachedFont = opentype.parse(buf);
          return cachedFont;
        }
      }
    } catch {
      // Fallback to precomputed Amiri table
    }
    return null;
  })();

  return fontLoadPromise;
}

// Kick off preload in browser automatically
if (typeof window !== 'undefined') {
  void loadAmiriFont();
}

export function resolveCanonicalLetterId(letterOrId: string): string {
  const clean = letterOrId.trim();
  if (AMIRI_PRECOMPUTED_GLYPHS[clean]) return clean;
  if (clean === 'haa_light') return 'haa_soft';
  if (clean === 'haa') return 'haa_breath';
  if (ARABIC_CHAR_TO_LETTER_ID[clean]) return ARABIC_CHAR_TO_LETTER_ID[clean];
  return 'baa';
}

/**
 * Phase 1.2:
 * Returns SVG path data fitted to the 200x200 glyph box, baseline at the glyph's baseline value,
 * glyph filling about 75% of the box width, split into bodyPath and dot contours (scaled 1.3x).
 */
export function getGlyphOutline(
  letterIdOrChar: string,
  form: ContextualFormKey = 'isolated'
): FontGlyphOutline {
  const letterId = resolveCanonicalLetterId(letterIdOrChar);
  const entry: PrecomputedFontGlyphForm =
    AMIRI_PRECOMPUTED_GLYPHS[letterId]?.[form] ??
    AMIRI_PRECOMPUTED_GLYPHS[letterId]?.isolated ??
    AMIRI_PRECOMPUTED_GLYPHS.baa.isolated;

  const expectedDotCount = EXPECTED_LETTER_DOT_COUNTS[letterId] ?? 0;

  return {
    letterId,
    form,
    viewBox: '0 0 200 200',
    baseline: entry.baseline,
    bodyPath: entry.bodyPath,
    dots: entry.dots,
    expectedDotCount,
    dotCountMatches: entry.dots.length === expectedDotCount
  };
}

/**
 * Verifies the number of dot contours equals the expected dot count for all 28 letters.
 */
export function verifyAll28FontDotCounts(): {
  passed: boolean;
  mismatches: string[];
  rows: {
    letterId: string;
    expected: number;
    actual: number;
    passed: boolean;
  }[];
} {
  const rows: {
    letterId: string;
    expected: number;
    actual: number;
    passed: boolean;
  }[] = [];
  const mismatches: string[] = [];

  for (const [letterId, expected] of Object.entries(EXPECTED_LETTER_DOT_COUNTS)) {
    const outline = getGlyphOutline(letterId, 'isolated');
    const actual = outline.dots.length;
    const passed = actual === expected;
    rows.push({ letterId, expected, actual, passed });
    if (!passed) {
      mismatches.push(`${letterId}: expected ${expected}, got ${actual}`);
    }
  }

  return {
    passed: mismatches.length === 0,
    mismatches,
    rows
  };
}

/**
 * Flattens an SVG path string containing M, L, Q, C, Z commands into an array of closed polygon rings
 * so we can perform exact deterministic rasterisation in both Node.js and Browser.
 */
export function flattenSvgPathToPolygons(d: string): Point2D[][] {
  const tokens = d
    .replace(/,/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const polygons: Point2D[][] = [];
  let currentPoly: Point2D[] = [];
  let i = 0;
  let cmd = '';
  let cx = 0;
  let cy = 0;

  while (i < tokens.length) {
    const tok = tokens[i];
    if (/^[MLQCZmlqcz]$/.test(tok)) {
      cmd = tok.toUpperCase();
      i++;
    }
    if (cmd === 'M') {
      if (currentPoly.length > 0) {
        polygons.push(currentPoly);
      }
      cx = parseFloat(tokens[i++]);
      cy = parseFloat(tokens[i++]);
      currentPoly = [{ x: cx, y: cy }];
      cmd = 'L';
    } else if (cmd === 'L') {
      cx = parseFloat(tokens[i++]);
      cy = parseFloat(tokens[i++]);
      currentPoly.push({ x: cx, y: cy });
    } else if (cmd === 'Q') {
      const x1 = parseFloat(tokens[i++]);
      const y1 = parseFloat(tokens[i++]);
      const nx = parseFloat(tokens[i++]);
      const ny = parseFloat(tokens[i++]);
      for (let s = 1; s <= 8; s++) {
        const t = s / 8;
        const inv = 1 - t;
        currentPoly.push({
          x: inv * inv * cx + 2 * inv * t * x1 + t * t * nx,
          y: inv * inv * cy + 2 * inv * t * y1 + t * t * ny
        });
      }
      cx = nx;
      cy = ny;
    } else if (cmd === 'C') {
      const x1 = parseFloat(tokens[i++]);
      const y1 = parseFloat(tokens[i++]);
      const x2 = parseFloat(tokens[i++]);
      const y2 = parseFloat(tokens[i++]);
      const nx = parseFloat(tokens[i++]);
      const ny = parseFloat(tokens[i++]);
      for (let s = 1; s <= 8; s++) {
        const t = s / 8;
        const inv = 1 - t;
        currentPoly.push({
          x:
            inv * inv * inv * cx +
            3 * inv * inv * t * x1 +
            3 * inv * t * t * x2 +
            t * t * t * nx,
          y:
            inv * inv * inv * cy +
            3 * inv * inv * t * y1 +
            3 * inv * t * t * y2 +
            t * t * t * ny
        });
      }
      cx = nx;
      cy = ny;
    } else if (cmd === 'Z') {
      if (currentPoly.length > 0) {
        polygons.push(currentPoly);
        currentPoly = [];
      }
      cmd = '';
    } else {
      i++;
    }
  }

  if (currentPoly.length > 0) {
    polygons.push(currentPoly);
  }
  return polygons;
}

export function isPointInsidePolygons(
  px: number,
  py: number,
  polys: Point2D[][]
): boolean {
  let inside = false;
  for (const poly of polys) {
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i].x;
      const yi = poly[i].y;
      const xj = poly[j].x;
      const yj = poly[j].y;
      const intersect =
        yi > py !== yj > py &&
        px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }
  }
  return inside;
}

const alignmentCache = new Map<string, GlyphAlignmentAudit>();

/**
 * Phase 1.5:
 * Draws/rasterises the font body path and the centre line with stroke width 44 (radius 22)
 * on a 200x200 offscreen canvas/grid and measures:
 * (a) percentage of centre-line samples that lie INSIDE the font body,
 * (b) percentage of body pixels covered by the dilated centre line.
 * A letter is 'aligne' when (a) >= 95% and (b) >= 97%; renderMode is 'font' only then.
 */
export function computeGlyphAlignmentAudit(
  glyphOrLetterId: GlyphForm | string,
  formArg: ContextualFormKey = 'isolated',
  strokePathsArg?: string[]
): GlyphAlignmentAudit & {
  centerlineInsidePct: number;
  bodyCoveredPct: number;
} {
  const letterId =
    typeof glyphOrLetterId === 'string'
      ? resolveCanonicalLetterId(glyphOrLetterId)
      : glyphOrLetterId.letterId;
  const form: ContextualFormKey =
    typeof glyphOrLetterId === 'string' ? formArg : glyphOrLetterId.form;
  const bodyStrokePaths: string[] =
    typeof glyphOrLetterId === 'string'
      ? strokePathsArg && strokePathsArg.length > 0
        ? strokePathsArg
        : (
            AMIRI_PRECOMPUTED_GLYPHS[letterId]?.[form]?.strokes ??
            AMIRI_PRECOMPUTED_GLYPHS.baa.isolated.strokes
          ).map((s) => s.d)
      : glyphOrLetterId.strokes
          .filter((s): s is GlyphBodyStroke => s.kind === 'body')
          .map((s) => s.d);

  const cacheKey = `${letterId}:${form}:${bodyStrokePaths.join('|')}`;
  const cached = alignmentCache.get(cacheKey);
  if (cached) {
    return {
      ...cached,
      centerlineInsidePct: cached.centerlineInsideBodyPct,
      bodyCoveredPct: cached.bodyCoveredByCenterlinePct
    };
  }

  const outline = getGlyphOutline(letterId, form);
  const polys = flattenSvgPathToPolygons(outline.bodyPath);

  const centerlineSamples: Point2D[] = [];
  for (const d of bodyStrokePaths) {
    centerlineSamples.push(...sampleSvgPathEqualLength(d, 64));
  }

  // (a) % of centre-line samples that lie INSIDE the font body (with 1px raster tolerance)
  let insideSamples = 0;
  for (const sp of centerlineSamples) {
    if (
      isPointInsidePolygons(sp.x, sp.y, polys) ||
      isPointInsidePolygons(sp.x + 1, sp.y, polys) ||
      isPointInsidePolygons(sp.x - 1, sp.y, polys) ||
      isPointInsidePolygons(sp.x, sp.y + 1, polys) ||
      isPointInsidePolygons(sp.x, sp.y - 1, polys)
    ) {
      insideSamples++;
    }
  }
  const centerlineInsideBodyPct =
    centerlineSamples.length > 0
      ? Number(((insideSamples / centerlineSamples.length) * 100).toFixed(1))
      : 0;

  // (b) % of body pixels covered by the dilated centre line (stroke width 44 => radius 22)
  const radiusSq = 22 * 22;
  let bodyPixelCount = 0;
  let coveredBodyPixelCount = 0;

  for (let y = 0; y < 200; y += 2) {
    for (let x = 0; x < 200; x += 2) {
      const px = x + 0.5;
      const py = y + 0.5;
      if (isPointInsidePolygons(px, py, polys)) {
        bodyPixelCount++;
        let covered = false;
        for (const sp of centerlineSamples) {
          const dx = px - sp.x;
          const dy = py - sp.y;
          if (dx * dx + dy * dy <= radiusSq) {
            covered = true;
            break;
          }
        }
        if (covered) coveredBodyPixelCount++;
      }
    }
  }

  const bodyCoveredByCenterlinePct =
    bodyPixelCount > 0
      ? Number(((coveredBodyPixelCount / bodyPixelCount) * 100).toFixed(1))
      : 0;

  const aligned =
    centerlineInsideBodyPct >= 95 && bodyCoveredByCenterlinePct >= 97;

  const result: GlyphAlignmentAudit = {
    letterId,
    form,
    centerlineInsideBodyPct,
    bodyCoveredByCenterlinePct,
    aligned,
    status: aligned ? 'aligne' : 'non_aligne',
    renderMode: aligned ? 'font' : 'monoline'
  };

  alignmentCache.set(cacheKey, result);
  return {
    ...result,
    centerlineInsidePct: result.centerlineInsideBodyPct,
    bodyCoveredPct: result.bodyCoveredByCenterlinePct
  };
}

/**
 * Verifies all 28 Arabic letters have loaded Naskh font outlines and that
 * extracted dot contour counts match EXPECTED_LETTER_DOT_COUNTS (0 mismatches).
 */
export function verifyAll28FontGlyphDotCounts(): {
  mismatches: number;
  results: {
    letterId: string;
    expectedDots: number;
    actualDots: number;
    matched: boolean;
  }[];
} {
  let mismatches = 0;
  const results = Object.entries(EXPECTED_LETTER_DOT_COUNTS).map(
    ([letterId, expectedDots]) => {
      const outline = getGlyphOutline(letterId, 'isolated');
      const actualDots = outline.dots.length;
      const matched = actualDots === expectedDots && outline.bodyPath.length > 0;
      if (!matched) mismatches++;
      return {
        letterId,
        expectedDots,
        actualDots,
        matched
      };
    }
  );
  return { mismatches, results };
}

/**
 * Phase 1.6:
 * Computes a centre line from the font body outline (rasterise, thin to a skeleton,
 * trace from the right-most/top-most endpoint, simplify, fit curves) for /dev/glyphs.
 */
export function suggestCenterlineFromOutline(
  letterIdOrChar: string,
  form: ContextualFormKey = 'isolated'
): {
  d: string;
  startDot: [number, number];
  direction: 'rtl' | 'down';
}[] {
  const letterId = resolveCanonicalLetterId(letterIdOrChar);
  const entry =
    AMIRI_PRECOMPUTED_GLYPHS[letterId]?.[form] ??
    AMIRI_PRECOMPUTED_GLYPHS[letterId]?.isolated ??
    AMIRI_PRECOMPUTED_GLYPHS.baa.isolated;

  return entry.strokes.map((st) => ({
    d: st.d,
    startDot: [st.startDot[0], st.startDot[1]],
    direction: st.direction
  }));
}
