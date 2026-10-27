import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Play, Eye, EyeOff, RotateCcw, CheckCircle2, AlertTriangle } from 'lucide-react';
import {
  CalligraphyEvaluationResult,
  evaluateCalligraphyAccuracy
} from '../utils/learningLogic';
import { audioEngine } from '../utils/audioEngine';

interface CalligraphyCanvasProps {
  targetArabic: string;
  subtitleFr?: string;
  compact?: boolean;
  onEvaluationChange?: (evalResult: CalligraphyEvaluationResult) => void;
}

const CANVAS_SIZE = 280;
const GRID_DIM = 28; // 28x28 grid cells (10x10px each) for pixel-mask accuracy evaluation

export const CalligraphyCanvas: React.FC<CalligraphyCanvasProps> = ({
  targetArabic,
  subtitleFr,
  compact = false,
  onEvaluationChange
}) => {
  const drawCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const isDrawingRef = useRef<boolean>(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  // Hit-testing state refs so pointer events stay 60fps without re-rendering on every pixel
  const targetCellsSetRef = useRef<Set<number>>(new Set());
  const coveredCellsSetRef = useRef<Set<number>>(new Set());
  const onTrackSamplesRef = useRef<number>(0);
  const offTrackSamplesRef = useRef<number>(0);
  const firstStartXRef = useRef<number | undefined>(undefined);
  const lastEndXRef = useRef<number | undefined>(undefined);

  const [showGuide, setShowGuide] = useState<boolean>(true);
  const [isAnimatingDemo, setIsAnimatingDemo] = useState<boolean>(false);
  const [evaluation, setEvaluation] = useState<CalligraphyEvaluationResult>(() =>
    evaluateCalligraphyAccuracy({
      coveredTargetCells: 0,
      targetCellsCount: 25,
      onTrackSamples: 0,
      offTrackSamples: 0
    })
  );

  const isVerticalLetter = targetArabic.trim() === 'ا' || targetArabic.trim() === 'أ' || targetArabic.trim() === 'ل';
  const fontSizePx = targetArabic.length > 2 ? 105 : 155;

  // Build the offscreen dilated glyph pixel-mask whenever targetArabic changes
  const buildGlyphMask = useCallback(() => {
    if (!maskCanvasRef.current) {
      maskCanvasRef.current = document.createElement('canvas');
      maskCanvasRef.current.width = CANVAS_SIZE;
      maskCanvasRef.current.height = CANVAS_SIZE;
    }
    const maskCtx = maskCanvasRef.current.getContext('2d');
    if (!maskCtx) return;

    maskCtx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    maskCtx.font = `700 ${fontSizePx}px "Amiri", "Noto Naskh Arabic", serif`;
    maskCtx.textAlign = 'center';
    maskCtx.textBaseline = 'middle';
    maskCtx.lineJoin = 'round';
    maskCtx.lineCap = 'round';
    // Dilated corridor (width 30px) around the true calligraphic glyph
    maskCtx.lineWidth = 30;
    maskCtx.strokeStyle = '#000000';
    maskCtx.fillStyle = '#000000';
    maskCtx.strokeText(targetArabic, CANVAS_SIZE / 2, CANVAS_SIZE * 0.54);
    maskCtx.fillText(targetArabic, CANVAS_SIZE / 2, CANVAS_SIZE * 0.54);

    const imgData = maskCtx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE).data;
    const cellSize = CANVAS_SIZE / GRID_DIM;
    const cells = new Set<number>();

    for (let gy = 0; gy < GRID_DIM; gy++) {
      for (let gx = 0; gx < GRID_DIM; gx++) {
        const px = Math.min(CANVAS_SIZE - 1, Math.floor((gx + 0.5) * cellSize));
        const py = Math.min(CANVAS_SIZE - 1, Math.floor((gy + 0.5) * cellSize));
        const alpha = imgData[(py * CANVAS_SIZE + px) * 4 + 3];
        if (alpha > 32) {
          cells.add(gy * GRID_DIM + gx);
        }
      }
    }

    targetCellsSetRef.current = cells;
  }, [targetArabic, fontSizePx]);

  const recomputeEvaluation = useCallback(() => {
    const result = evaluateCalligraphyAccuracy({
      coveredTargetCells: coveredCellsSetRef.current.size,
      targetCellsCount: Math.max(10, targetCellsSetRef.current.size),
      onTrackSamples: onTrackSamplesRef.current,
      offTrackSamples: offTrackSamplesRef.current,
      startX: firstStartXRef.current,
      endX: lastEndXRef.current,
      isVerticalLetter
    });
    setEvaluation(result);
    onEvaluationChange?.(result);
  }, [isVerticalLetter, onEvaluationChange]);

  const clearCanvas = useCallback(() => {
    if (drawCanvasRef.current) {
      const ctx = drawCanvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      }
    }
    coveredCellsSetRef.current = new Set();
    onTrackSamplesRef.current = 0;
    offTrackSamplesRef.current = 0;
    firstStartXRef.current = undefined;
    lastEndXRef.current = undefined;
    lastPointRef.current = null;
    recomputeEvaluation();
  }, [recomputeEvaluation]);

  useEffect(() => {
    buildGlyphMask();
    clearCanvas();
  }, [targetArabic, buildGlyphMask, clearCanvas]);

  // Check if a canvas point (x, y) is inside the dilated calligraphic stencil mask
  const samplePointAgainstMask = (x: number, y: number): boolean => {
    const cellSize = CANVAS_SIZE / GRID_DIM;
    const gx = Math.max(0, Math.min(GRID_DIM - 1, Math.floor(x / cellSize)));
    const gy = Math.max(0, Math.min(GRID_DIM - 1, Math.floor(y / cellSize)));
    const cellId = gy * GRID_DIM + gx;

    // Check immediate cell and 3x3 neighborhood for reed-pen thickness
    let isHit = false;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = gx + dx;
        const ny = gy + dy;
        if (nx >= 0 && nx < GRID_DIM && ny >= 0 && ny < GRID_DIM) {
          const nId = ny * GRID_DIM + nx;
          if (targetCellsSetRef.current.has(nId)) {
            isHit = true;
            coveredCellsSetRef.current.add(nId);
          }
        }
      }
    }

    if (isHit) {
      onTrackSamplesRef.current += 1;
    } else {
      offTrackSamplesRef.current += 1;
    }
    return isHit;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawCanvasRef.current) return;
    isDrawingRef.current = true;
    const rect = drawCanvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * CANVAS_SIZE;
    const y = ((e.clientY - rect.top) / rect.height) * CANVAS_SIZE;

    if (firstStartXRef.current === undefined) {
      firstStartXRef.current = x;
    }
    lastEndXRef.current = x;
    lastPointRef.current = { x, y };

    const onTrack = samplePointAgainstMask(x, y);
    const ctx = drawCanvasRef.current.getContext('2d');
    if (ctx) {
      ctx.fillStyle = onTrack ? '#131B2E' : '#DC2626';
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    recomputeEvaluation();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !drawCanvasRef.current) return;
    const rect = drawCanvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * CANVAS_SIZE;
    const y = ((e.clientY - rect.top) / rect.height) * CANVAS_SIZE;
    const ctx = drawCanvasRef.current.getContext('2d');

    if (ctx && lastPointRef.current) {
      const dx = x - lastPointRef.current.x;
      const dy = y - lastPointRef.current.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 2) return;

      lastEndXRef.current = x;
      const onTrack = samplePointAgainstMask(x, y);

      // Calligraphic Reed-Pen ("Calame") nib angle modulation
      const angle = Math.atan2(dy, dx);
      const nibAngle = Math.PI / 5;
      const widthFactor = Math.abs(Math.sin(angle - nibAngle));
      ctx.lineWidth = 6 + widthFactor * 12;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      // Ink turns coral-red when drawing off-track outside the stencil!
      ctx.strokeStyle = onTrack ? '#131B2E' : '#DC2626';

      ctx.beginPath();
      ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
      ctx.lineTo(x, y);
      ctx.stroke();

      lastPointRef.current = { x, y };
      recomputeEvaluation();
    }
  };

  const handlePointerUp = () => {
    isDrawingRef.current = false;
    lastPointRef.current = null;
    recomputeEvaluation();
  };

  const handlePlayCalameModel = () => {
    setIsAnimatingDemo(true);
    audioEngine.speakArabic(targetArabic, { rate: 0.82 });

    // Render an authentic calligraphic ink demonstration directly onto the canvas
    if (drawCanvasRef.current) {
      const ctx = drawCanvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
        ctx.font = `700 ${fontSizePx}px "Amiri", "Noto Naskh Arabic", serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#131B2E';
        ctx.fillText(targetArabic, CANVAS_SIZE / 2, CANVAS_SIZE * 0.54);
      }
    }

    // Populate passing metrics for the guided model
    coveredCellsSetRef.current = new Set(targetCellsSetRef.current);
    onTrackSamplesRef.current = 28;
    offTrackSamplesRef.current = 1;
    firstStartXRef.current = 200;
    lastEndXRef.current = 90;
    recomputeEvaluation();

    setTimeout(() => {
      setIsAnimatingDemo(false);
    }, 1100);
  };

  const totalSamples = onTrackSamplesRef.current + offTrackSamplesRef.current;

  return (
    <div className="w-full max-w-sm mx-auto flex flex-col items-center gap-2.5">
      {/* Top Controls Bar — All buttons >= 44px height for mobile ergonomics */}
      <div className="flex flex-wrap items-center justify-between w-full gap-1.5">
        <button
          type="button"
          onClick={handlePlayCalameModel}
          className="min-h-[44px] px-3 py-2 rounded-xl bg-white dark:bg-[#182238] border border-[#E2D9C5] dark:border-[#2A3654] text-xs font-semibold text-[#131B2E] dark:text-amber-300 flex items-center gap-1.5 hover:border-[#C87D20] cursor-pointer whitespace-nowrap shrink-0"
        >
          <Play className="w-3.5 h-3.5 fill-current text-[#C87D20]" />
          <span>Modèle Calame</span>
        </button>

        <span className="hidden sm:inline text-[11px] font-semibold text-[#C87D20] whitespace-nowrap">
          Départ à droite ←
        </span>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowGuide(g => !g)}
            aria-label={showGuide ? 'Masquer le pochoir' : 'Afficher le pochoir'}
            className="min-h-[44px] px-3 py-2 rounded-xl bg-white dark:bg-[#182238] border border-[#E2D9C5] dark:border-[#2A3654] text-xs font-semibold text-[#5A6478] dark:text-[#9AA6B8] flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
          >
            {showGuide ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>Guide</span>
          </button>

          <button
            type="button"
            onClick={clearCanvas}
            aria-label="Effacer le tracé"
            className="min-h-[44px] min-w-[44px] rounded-xl bg-white dark:bg-[#182238] border border-[#E2D9C5] dark:border-[#2A3654] flex items-center justify-center text-[#5A6478] dark:text-[#9AA6B8] hover:text-[#131B2E] cursor-pointer shrink-0"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Interactive Calligraphic Parchment Stage */}
      <div
        className={`relative ${
          compact ? 'w-60 h-60 sm:w-64 sm:h-64' : 'w-64 h-64 sm:w-72 sm:h-72'
        } bg-[#FAF6EE] dark:bg-[#0F172A] rounded-3xl border-2 ${
          totalSamples > 5
            ? evaluation.passed
              ? 'border-emerald-500'
              : evaluation.precisionPct < 52
              ? 'border-rose-500'
              : 'border-[#C87D20]'
            : 'border-[#E2D9C5] dark:border-[#2A3654]'
        } shadow-inner overflow-hidden touch-none select-none`}
      >
        {/* Calligraphic Manuscript Baseline ("Ligne de base Naskh") */}
        <div className="absolute inset-x-0 top-[58%] border-t border-dashed border-[#C87D20]/45 pointer-events-none" />
        <div className="absolute inset-y-0 left-1/2 border-l border-dashed border-[#E2D9C5] dark:border-[#2A3654] pointer-events-none" />

        {/* True Calligraphic Naskh Vector Stencil */}
        {showGuide && (
          <svg
            viewBox={`0 0 ${CANVAS_SIZE} ${CANVAS_SIZE}`}
            className="absolute inset-0 w-full h-full pointer-events-none select-none"
          >
            <text
              x={CANVAS_SIZE / 2}
              y={CANVAS_SIZE * 0.54}
              textAnchor="middle"
              dominantBaseline="central"
              direction="rtl"
              className="font-arabic"
              fontSize={fontSizePx}
              fill={
                isAnimatingDemo
                  ? 'rgba(200, 125, 32, 0.30)'
                  : 'rgba(19, 27, 46, 0.08)'
              }
              stroke="#C87D20"
              strokeWidth="2.4"
              strokeDasharray="6 5"
            >
              {targetArabic}
            </text>
          </svg>
        )}

        <canvas
          ref={drawCanvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          data-testid="letter-tracing-canvas"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className="relative z-10 w-full h-full cursor-crosshair"
        />
      </div>

      {/* Live Precision & Form Accuracy Telemetry Bar */}
      <div className="w-full px-1 flex flex-col gap-1">
        <div className="flex items-center justify-between text-xs font-mono tabular-nums">
          <span className="text-[#5A6478] dark:text-[#9AA6B8]">
            Précision sur le trait :{' '}
            <strong
              className={
                totalSamples === 0
                  ? 'text-[#131B2E] dark:text-white'
                  : evaluation.precisionPct >= 52
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }
            >
              {evaluation.precisionPct}%
            </strong>
          </span>
          <span className="text-[#5A6478] dark:text-[#9AA6B8]">
            Forme couverte :{' '}
            <strong className="text-[#131B2E] dark:text-white">
              {evaluation.coveragePct}%
            </strong>
          </span>
        </div>

        {totalSamples >= 6 && (
          <div
            className={`text-xs font-medium flex items-center gap-1.5 ${
              evaluation.passed
                ? 'text-emerald-700 dark:text-emerald-400'
                : 'text-rose-700 dark:text-rose-400'
            }`}
          >
            {evaluation.passed ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span>{evaluation.feedbackFr}</span>
          </div>
        )}

        {subtitleFr && totalSamples < 6 && (
          <p className="text-xs text-[#5A6478] dark:text-[#9AA6B8] text-center">
            {subtitleFr}
          </p>
        )}
      </div>
    </div>
  );
};
